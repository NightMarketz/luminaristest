import type { CompanyFiscalProfile, SimplesApuracao, TaxAssessment } from 'generated/prisma';
import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { ISimplesApuracaoRepository } from '../repositories/ISimplesApuracaoRepository';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { formaEfetiva } from './CompanyFiscalProfileService';
import { PERIODOS_TRIMESTRAIS, trimestresEmAtividade } from '../models/taxAssessmentCalc';
import { mesesEmAtividade } from '../models/taxAssessmentCalcAnual';
import { LALUR_MESES } from '../models/Lalur.model';
import { modalidadeDoRegime, parametrosDoMes, PERIODOS_PIS_COFINS } from '../models/pisCofinsCalc';
import { tabelaPisCofinsDe } from '../models/pisCofinsParams';
import {
  TaxAssessmentPeriodosViewSchema,
  type EstadoPeriodo,
  type FamiliaPeriodos,
  type PeriodoEsperado,
  type TaxAssessmentPeriodosQuery,
  type TaxAssessmentPeriodosView,
} from '../dtos/TaxAssessmentPeriodosDto';

/** Linha viva de uma apuração, reduzida ao que o estado do período precisa (X7/X8 e Simples). */
interface Viva {
  id: string;
  status: string;
  aPagarCents: bigint;
}

type EstadoTributo = PeriodoEsperado['tributos'][string];

/**
 * Item 7 + F-P4 (a): `CONFIRMED` (com `id` + `aPagarCents`) se houver viva confirmada; `SO_SUPERSEDED` se só houver
 * substituídas; senão o estado de calendário (`REVOGADO` › `FORA_DA_ATIVIDADE` › `SEM_APURACAO`).
 */
function estado(linhas: readonly Viva[], calendario: EstadoPeriodo): EstadoTributo {
  const confirmada = linhas.find((l) => l.status === 'CONFIRMED');
  if (confirmada) return { estado: 'CONFIRMED', id: confirmada.id, aPagarCents: confirmada.aPagarCents.toString() };
  if (linhas.length > 0) return { estado: 'SO_SUPERSEDED' };
  return { estado: calendario };
}

function porPeriodoTributo(rows: readonly TaxAssessment[]): Map<string, Viva[]> {
  const m = new Map<string, Viva[]>();
  for (const r of rows) {
    const k = `${r.periodo}|${r.tributo}`;
    m.set(k, [...(m.get(k) ?? []), { id: r.id, status: r.status, aPagarCents: r.aPagarCents }]);
  }
  return m;
}

const naoApuravel = (familia: FamiliaPeriodos['familia'], motivo: NonNullable<FamiliaPeriodos['motivo']>): FamiliaPeriodos => ({
  familia, apuravel: false, motivo, periodos: [],
});

/**
 * BE-INCR-TAX-ASSESSMENT-PERIODOS (nó TAX-ASSESSMENT-PERIODOS; BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md`
 * itens 1–10; F-P1..F-P4 ratificados 08/10) — leitura pura dos períodos esperados do ano por família (X7 IRPJ/CSLL,
 * X8 PIS/Cofins, Simples). **Nenhuma regra nova (item 9):** forma, atividade, modalidade e revogação vêm das funções
 * puras que a prévia já usa. Uma consulta por família (item 7): a lista do ano do `TaxAssessment` serve X7 e X8; o
 * Simples lê as apurações do ano de uma vez.
 */
export class TaxAssessmentPeriodosService {
  constructor(
    private readonly repo: Pick<ITaxAssessmentRepository, 'findMany'>,
    private readonly companyProfileRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly simplesRepo: Pick<ISimplesApuracaoRepository, 'findDoAno'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly policy: IAccountingPolicy,
  ) {}

  async listar(scope: AccountingScope, query: TaxAssessmentPeriodosQuery): Promise<TaxAssessmentPeriodosView> {
    // Item 2: mesma régua da lista do ano (X7 item 17).
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler as apurações de tributos.');
    const ano = query.anoCalendario;
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) {
      // Item 4 (A-brief item 13): perfil ausente ⇒ nenhuma família apurável.
      return TaxAssessmentPeriodosViewSchema.parse({
        anoCalendario: ano, regime: null,
        familias: [naoApuravel('X7', 'PERFIL_AUSENTE'), naoApuravel('X8', 'PERFIL_AUSENTE'), naoApuravel('SIMPLES', 'PERFIL_AUSENTE')],
      });
    }
    const lucro = perfil.regime === 'PRESUMIDO' || perfil.regime === 'REAL';
    const rows = lucro ? await this.repo.findMany(scope.ownerUserId, { anoCalendario: ano }) : [];
    const vivas = porPeriodoTributo(rows);
    return TaxAssessmentPeriodosViewSchema.parse({
      anoCalendario: ano,
      regime: perfil.regime,
      familias: [this.familiaX7(perfil, ano, vivas), await this.familiaX8(perfil, ano, vivas), await this.familiaSimples(scope, perfil, ano)],
    });
  }

  /** Item 4: IRPJ/CSLL — forma efetiva do perfil; atividade por `trimestresEmAtividade`/`mesesEmAtividade` (F-P3 a). */
  private familiaX7(perfil: CompanyFiscalProfile, ano: number, vivas: Map<string, Viva[]>): FamiliaPeriodos {
    if (perfil.regime === 'SIMPLES' || perfil.regime === 'MEI') return naoApuravel('X7', 'REGIME_DAS'); // ADR D12
    if (perfil.regime !== 'PRESUMIDO' && perfil.regime !== 'REAL') return naoApuravel('X7', 'REGIME_SEM_APURACAO');
    const forma = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll) === 'ANUAL' ? 'ANUAL' : 'TRIMESTRAL';
    const linha = (periodo: string, ativo: boolean): PeriodoEsperado => ({
      periodo,
      tributos: Object.fromEntries((['IRPJ', 'CSLL'] as const).map((t) => [t, estado(vivas.get(`${periodo}|${t}`) ?? [], ativo ? 'SEM_APURACAO' : 'FORA_DA_ATIVIDADE')])),
    });
    if (forma === 'TRIMESTRAL') {
      const ativos = new Set<string>(trimestresEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm));
      return { familia: 'X7', apuravel: true, forma, periodos: PERIODOS_TRIMESTRAIS.map((p) => linha(p, ativos.has(p))) };
    }
    const meses = mesesEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm);
    return {
      familia: 'X7', apuravel: true, forma,
      // B-brief item 11: A01..A12 + A00; F-P3 (a): o A00 está em atividade se houver ≥ 1 mês.
      periodos: [...LALUR_MESES.map((p) => linha(p, meses.includes(Number(p.slice(1))))), linha('A00', meses.length > 0)],
    };
  }

  /** Item 5: PIS/Cofins — modalidade pelo regime; mês sem linha vigente ⇒ `REVOGADO` com o motivo da função pura (D9). */
  private async familiaX8(perfil: CompanyFiscalProfile, ano: number, vivas: Map<string, Viva[]>): Promise<FamiliaPeriodos> {
    if (perfil.regime === 'SIMPLES' || perfil.regime === 'MEI') return naoApuravel('X8', 'REGIME_DAS'); // ADR-INCR-PIS-COFINS D2
    if (perfil.regime !== 'PRESUMIDO' && perfil.regime !== 'REAL') return naoApuravel('X8', 'REGIME_SEM_APURACAO');
    const modalidade = modalidadeDoRegime(perfil.regime);
    const tabela = tabelaPisCofinsDe(await this.legalParams.fotografia(['PIS_COFINS', 'CODIGO_RECEITA']));
    const meses = mesesEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm);
    const periodos = PERIODOS_PIS_COFINS.map((p): PeriodoEsperado => {
      let revogado: string | undefined;
      try {
        parametrosDoMes(tabela, ano, p, modalidade);
      } catch (e) {
        // A única recusa da função é a de linha vigente ausente (revogação a partir de 2027-01, D9); o texto cita a fonte.
        if (!(e instanceof ValidationError)) throw e;
        revogado = e.message;
      }
      const calendario: EstadoPeriodo = revogado ? 'REVOGADO' : meses.includes(Number(p.slice(1))) ? 'SEM_APURACAO' : 'FORA_DA_ATIVIDADE';
      return {
        periodo: p,
        tributos: Object.fromEntries((['PIS', 'COFINS'] as const).map((t) => [t, estado(vivas.get(`${p}|${t}`) ?? [], calendario)])),
        ...(revogado ? { motivo: revogado } : {}),
      };
    });
    return { familia: 'X8', apuravel: true, modalidade, periodos };
  }

  /**
   * Item 6 (F-P2 a): competências do ano para SIMPLES e MEI — o MEI é apurado pelo X14 (SIMEI, BE-INCR-SIMPLES-NACIONAL
   * item 25, mesma `SimplesApuracao` com `regime = 'MEI'`), então não cai em `REGIME_MEI` (BRIEF item 6 / §4). Atividade
   * pelo `inicioAtividadeEm` do perfil, como o X14 lê (competência anterior ao mês de início ⇒ fora). F-P4 (a) no DAS:
   * `aPagarCents` = valor do DAS oficial registrado (o que a provisão do X14 lança).
   */
  private async familiaSimples(scope: AccountingScope, perfil: CompanyFiscalProfile, ano: number): Promise<FamiliaPeriodos> {
    if (perfil.regime !== 'SIMPLES' && perfil.regime !== 'MEI') return naoApuravel('SIMPLES', 'REGIME_NAO_SIMPLES');
    const rows: SimplesApuracao[] = await this.simplesRepo.findDoAno(scope, ano);
    const inicio = perfil.inicioAtividadeEm ? perfil.inicioAtividadeEm.slice(0, 7) : null;
    const periodos = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`).map((c): PeriodoEsperado => {
      const linhas: Viva[] = rows.filter((r) => r.competencia === c).map((r) => ({ id: r.id, status: r.status, aPagarCents: r.valorOficialCents }));
      return { periodo: c, tributos: { DAS: estado(linhas, inicio && c < inicio ? 'FORA_DA_ATIVIDADE' : 'SEM_APURACAO') } };
    });
    return { familia: 'SIMPLES', apuravel: true, periodos };
  }
}
