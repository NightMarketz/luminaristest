import type { CompanyFiscalProfile, Prisma, TaxAssessment } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { AuditService } from './AuditService';
import type { AccountingReportService } from './AccountingReportService';
import type { TaxAssessmentConfirmInput, TaxAssessmentListQuery, TaxAssessmentPreviewInput } from '../dtos/TaxAssessmentDto';
import { formaEfetiva } from './CompanyFiscalProfileService';
import { receitaBrutaPorAtividade } from './receitaBrutaPorAtividade';
import { quarterWindows } from './SpedEcfGenerationService';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import {
  MemoriaCalculoSchema,
  PERIODOS_TRIMESTRAIS,
  apurarPresumidoTrimestral,
  apurarRealTrimestral,
  trimestresEmAtividade,
  type MemoriaAnterior,
  type MemoriaLinha,
  type PeriodoTrimestral,
  type ResultadoApuracao,
  type TributoApuracao,
} from '../models/taxAssessmentCalc';

export const TAX_ASSESSMENT_CONFIRMED = 'tax.assessment.confirmed';
export const TAX_ASSESSMENT_SUPERSEDED = 'tax.assessment.superseded';

const TRIBUTOS: readonly TributoApuracao[] = ['IRPJ', 'CSLL'];

export interface TaxAssessmentView {
  id: string;
  tributo: TributoApuracao;
  periodo: string;
  modo: string;
  codigoReceita: string;
  baseCents: string;
  devidoCents: string;
  deducoesCents: string;
  aPagarCents: string;
  saldoNegativoCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED';
  supersedesId: string | null;
  provisaoPendente: boolean;
  tabelaVersao: string;
  memoria: MemoriaLinha[];
  confirmedAt: string;
}

export type TaxAssessmentPreviewLinha = Omit<TaxAssessmentView, 'id' | 'status' | 'supersedesId' | 'provisaoPendente' | 'confirmedAt'>;

export interface TaxAssessmentPreviewView {
  irpj: TaxAssessmentPreviewLinha;
  csll: TaxAssessmentPreviewLinha;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
}

/** Confirmação: as 2 linhas gravadas + os períodos posteriores que a cascata marcou SUPERSEDED (a reconfirmar). */
export interface TaxAssessmentConfirmView {
  irpj: TaxAssessmentView;
  csll: TaxAssessmentView;
  reconfirmar: string[];
}

interface Calculo {
  perfil: CompanyFiscalProfile;
  forma: string;
  irpj: ResultadoApuracao;
  csll: ResultadoApuracao;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
  /** Ids das memórias CONFIRMED anteriores que o cálculo leu (F-TA-3 a) — re-checados dentro da tx. */
  anterioresIds: string[];
}

const idx = (p: string): number => PERIODOS_TRIMESTRAIS.indexOf(p as PeriodoTrimestral);

/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7; BRIEF itens 12–14, 17, 19) — prévia, confirmação (commit 1) e leitura
 * da apuração trimestral de IRPJ/CSLL. A aritmética é das funções puras do PR-1 (`taxAssessmentCalc`); aqui só se lê
 * perfil, razão, e-Lalur e memórias confirmadas, e se grava.
 *
 * A provisão (commits 2/3, item 15), o reconcile (item 16) e o encerramento (item 18) são do PR-3: a linha
 * confirmada nasce com `provisaoEntryId = null`, logo `provisaoPendente = true` até lá.
 *
 * Confirmação (item 14): recalcula FORA da tx e abre UMA `runTransaction` com todos os gates autoritativos dentro
 * (memória `authoritative-gate-inside-tx`): perfil igual ao lido no cálculo, memórias anteriores iguais, CAS do a
 * pagar, ordem dos trimestres (F-TA-3 a), um só CONFIRMED por (PJ, ano, tributo, período), regime igual ao das
 * confirmações do ano, trava da forma (F-X7-5 a) e a cascata da substituição.
 *
 * Cascata (decisão do dono, 04/10, lacuna do F-TA-3 "força reconfirmar os seguintes"): substituir Tq marca
 * SUPERSEDED também as linhas CONFIRMED dos trimestres posteriores, sem substituta, e devolve a lista em
 * `reconfirmar`; a ordem do F-TA-3 obriga reconfirmá-los em sequência. Com 409 puro não haveria saída.
 */
export class TaxAssessmentService {
  constructor(
    private readonly repo: ITaxAssessmentRepository,
    private readonly companyProfileRepo: ICompanyFiscalProfileRepository,
    private readonly fiscalProfileRepo: IFiscalProfileRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly lalurRepo: ILalurRepository,
    private readonly reportService: AccountingReportService,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /** Item 13 — calcula IRPJ e CSLL juntos (BRIEF item 13, art. 31 § 7º) e não persiste. */
  async preview(scope: AccountingScope, input: TaxAssessmentPreviewInput): Promise<TaxAssessmentPreviewView> {
    this.assertRead(scope);
    const c = await this.calcular(scope, input);
    return { irpj: toPreviewLinha(c.irpj, input.periodo), csll: toPreviewLinha(c.csll, input.periodo), provisaoContasConfiguradas: c.provisaoContasConfiguradas, avisos: c.avisos };
  }

  /** Item 14 — confirmação, commit 1. */
  async confirm(scope: AccountingScope, input: TaxAssessmentConfirmInput): Promise<TaxAssessmentConfirmView> {
    this.assertManage(scope);
    const c = await this.calcular(scope, input);
    const { anoCalendario: ano, periodo } = input;
    const owner = scope.ownerUserId;

    return this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }
      const confirmados = await this.repo.findConfirmedByYear(owner, ano, tx);
      const anteriores = confirmados.filter((r) => idx(r.periodo) < idx(periodo));
      if (!mesmoConjunto(anteriores.map((r) => r.id), c.anterioresIds)) {
        throw new ConflictError(`as apurações confirmadas anteriores a ${periodo}/${ano} mudaram — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }

      // CAS do a pagar (item 14).
      for (const t of TRIBUTOS) {
        const r = t === 'IRPJ' ? c.irpj : c.csll;
        if (input.expectedAPagarCents[t] !== r.aPagarCents.toString()) {
          throw new ConflictError(
            `${t}: a pagar recalculado (${r.aPagarCents} centavos) difere do esperado (${input.expectedAPagarCents[t]}) — refaça a prévia.`,
            'TAX_ASSESSMENT_CAS',
          );
        }
      }

      // Ordem dos trimestres (F-TA-3 a): Tq exige T(q−1) CONFIRMED nos 2 tributos, salvo T01 ou T(q−1) fora da atividade.
      const q = idx(periodo);
      if (q > 0) {
        const anterior = PERIODOS_TRIMESTRAIS[q - 1];
        const emAtividade = trimestresEmAtividade(ano, perfilTx.inicioAtividadeEm, perfilTx.encerramentoAtividadeEm);
        const faltam = emAtividade.includes(anterior) ? TRIBUTOS.filter((t) => !anteriores.some((r) => r.periodo === anterior && r.tributo === t)) : [];
        if (faltam.length > 0) {
          throw new ConflictError(`confirme ${anterior}/${ano} (${faltam.join(', ')}) antes de ${periodo} (BRIEF X7 F-TA-3 a).`, 'TAX_ASSESSMENT_ORDER');
        }
      }

      // Um só CONFIRMED por (PJ, ano, tributo, período) (item 14).
      const vivos = confirmados.filter((r) => r.periodo === periodo);
      const supersedes = input.supersedesIds ?? [];
      const estranhos = supersedes.filter((id) => !vivos.some((r) => r.id === id));
      if (estranhos.length > 0) {
        throw new ConflictError(`supersedesIds [${estranhos.join(', ')}] não é a apuração CONFIRMED viva de ${periodo}/${ano}.`, 'TAX_ASSESSMENT_SUPERSEDES');
      }
      const naoNomeados = vivos.filter((r) => !supersedes.includes(r.id));
      if (naoNomeados.length > 0) {
        throw new ConflictError(
          `${periodo}/${ano} já tem apuração confirmada (${naoNomeados.map((r) => `${r.tributo} ${r.id}`).join(', ')}) — para substituir, informe supersedesIds.`,
          'TAX_ASSESSMENT_ALREADY_CONFIRMED',
        );
      }

      // Cascata: os trimestres posteriores CONFIRMED caem junto (decisão do dono, 04/10).
      const posteriores = supersedes.length > 0 ? confirmados.filter((r) => idx(r.periodo) > q) : [];

      // Regime igual ao das confirmações do ano que continuam vivas (item 14).
      const outroRegime = confirmados.filter((r) => !supersedes.includes(r.id) && !posteriores.includes(r) && r.regime !== perfilTx.regime);
      if (outroRegime.length > 0) {
        throw new ConflictError(
          `o regime do perfil (${perfilTx.regime}) difere do das apurações confirmadas de ${ano} (${outroRegime.map((r) => `${r.periodo} ${r.regime}`).join(', ')}).`,
          'TAX_ASSESSMENT_REGIME',
        );
      }

      // Trava da forma na mesma tx (F-X7-5 a): 0 linhas = já travada, segue.
      await this.companyProfileRepo.travarFormaApuracao(scope, ano, new Date(), tx);

      const cair = [...vivos, ...posteriores];
      const mudou = await this.repo.markSuperseded(owner, cair.map((r) => r.id), tx);
      if (mudou !== cair.length) {
        throw new ConflictError(`apuração substituída em paralelo em ${ano} — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }

      const confirmedAt = new Date();
      const gravadas = {} as Record<TributoApuracao, TaxAssessment>;
      for (const t of TRIBUTOS) {
        const r = t === 'IRPJ' ? c.irpj : c.csll;
        const substituida = vivos.find((v) => v.tributo === t) ?? null;
        const row = await this.repo.create(
          {
            userId: owner,
            unitId: scope.unitId,
            anoCalendario: ano,
            tributo: t,
            regime: perfilTx.regime,
            forma: c.forma,
            periodo,
            modo: r.modo,
            codigoReceita: r.codigoReceita,
            baseCents: r.baseCents,
            devidoCents: r.devidoCents,
            deducoesCents: r.deducoesCents,
            aPagarCents: r.aPagarCents,
            saldoNegativoCents: r.saldoNegativoCents,
            memoria: MemoriaCalculoSchema.parse(r.memoria) as Prisma.InputJsonValue,
            tabelaVersao: r.tabelaVersao,
            status: 'CONFIRMED',
            supersedesId: substituida?.id ?? null,
            confirmedById: scope.actorUserId,
            confirmedAt,
          },
          tx,
        );
        gravadas[t] = row;
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: TAX_ASSESSMENT_CONFIRMED,
          targetType: 'tax_assessment',
          targetId: row.id,
          payload: {
            assessmentId: row.id,
            tributo: t,
            periodo,
            anoCalendario: String(ano),
            aPagarCents: row.aPagarCents.toString(),
            devidoCents: row.devidoCents.toString(),
            tabelaVersao: row.tabelaVersao,
          },
        });
      }
      for (const s of cair) {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: TAX_ASSESSMENT_SUPERSEDED,
          targetType: 'tax_assessment',
          targetId: s.id,
          payload: {
            assessmentId: s.id,
            supersededById: gravadas[s.tributo as TributoApuracao].id,
            tributo: s.tributo,
            periodo: s.periodo,
            anoCalendario: String(ano),
          },
        });
      }
      return {
        irpj: toView(gravadas.IRPJ),
        csll: toView(gravadas.CSLL),
        reconfirmar: [...new Set(posteriores.map((r) => r.periodo))].sort(),
      };
    });
  }

  /** Item 17 — lista da PJ no ano (o `unitId` do escopo só resolve policy). */
  async list(scope: AccountingScope, query: TaxAssessmentListQuery): Promise<TaxAssessmentView[]> {
    this.assertRead(scope);
    const rows = await this.repo.findMany(scope.ownerUserId, { anoCalendario: query.anoCalendario, periodo: query.periodo, status: query.status });
    return rows.map(toView);
  }

  /** Item 17 — detalhe com memória; id de outra PJ ⇒ 404. */
  async get(scope: AccountingScope, id: string): Promise<TaxAssessmentView> {
    this.assertRead(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Apuração '${id}' não encontrada.`);
    return toView(row);
  }

  /** Lê perfil, razão, e-Lalur e memórias confirmadas e chama as funções puras do PR-1. Recusas do item 13. */
  private async calcular(scope: AccountingScope, input: TaxAssessmentPreviewInput): Promise<Calculo> {
    const { anoCalendario: ano, periodo } = input;
    const perfil = await this.companyProfileRepo.findByYear(scope, ano);
    if (!perfil) throw new ValidationError(`perfil fiscal da empresa de ${ano} ausente — cadastre-o antes de apurar IRPJ/CSLL.`);
    if (perfil.regime === 'SIMPLES' || perfil.regime === 'MEI') {
      throw new ValidationError(`regime ${perfil.regime}: IRPJ/CSLL entram no DAS — DAS é da onda 3 (ADR-INCR-TAX-ASSESSMENT D12).`);
    }
    if (perfil.regime !== 'PRESUMIDO' && perfil.regime !== 'REAL') throw new ValidationError(`regime '${perfil.regime}' sem apuração trimestral.`);
    const forma = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll);
    if (forma !== 'TRIMESTRAL') throw new ValidationError('forma anual é da Fase B (ADR-INCR-TAX-ASSESSMENT, BRIEF B item B1).');

    const w = quarterWindows(ano)[idx(periodo)];
    const outras = (await this.postingRepo.unitIdsWithMovement(scope.ownerUserId, LEDGER_STATUSES, w.from, w.to)).filter((u) => u !== scope.unitId);
    if (outras.length > 0) {
      throw new ValidationError(`outra unidade da PJ com movimento em ${periodo}/${ano}: a apuração consolidada é da Fase C (ADR F-X7-7 a).`, {
        unidadesComMovimento: outras,
      });
    }

    const fp = await this.fiscalProfileRepo.findByScope(scope);
    const provisaoContasConfiguradas = !!(fp?.irpjDespesaAccountId && fp.csllDespesaAccountId && fp.irpjRecolherAccountId && fp.csllRecolherAccountId);
    const despesaIds = [fp?.irpjDespesaAccountId, fp?.csllDespesaAccountId].filter((x): x is string => !!x);
    const avisos: string[] = [];
    if (!provisaoContasConfiguradas) {
      avisos.push('contas da provisão de IRPJ/CSLL não configuradas no perfil fiscal da unidade — a provisão ficará pendente (BRIEF X7 F-TA-7 a).');
    }

    const confirmados = await this.repo.findConfirmedByYear(scope.ownerUserId, ano);
    const anterioresRows = confirmados.filter((r) => idx(r.periodo) < idx(periodo));
    const anteriores = (t: TributoApuracao): MemoriaAnterior[] =>
      anterioresRows.filter((r) => r.tributo === t).map((r) => ({ periodo: r.periodo as PeriodoTrimestral, memoria: MemoriaCalculoSchema.parse(r.memoria) }));
    const deducoes = input.deducoes;

    let irpj: ResultadoApuracao;
    let csll: ResultadoApuracao;
    if (perfil.regime === 'PRESUMIDO') {
      const rec = await receitaBrutaPorAtividade({ accountRepo: this.accountRepo, postingRepo: this.postingRepo }, scope, w.from, w.to);
      const base = {
        ano,
        periodo,
        receitaServicoCents: BigInt(rec.servicoCents),
        receitaRevendaCents: BigInt(rec.revendaCents),
        perfil,
        deducoes,
      };
      irpj = apurarPresumidoTrimestral({ ...base, tributo: 'IRPJ', anteriores: anteriores('IRPJ') });
      csll = apurarPresumidoTrimestral({ ...base, tributo: 'CSLL', anteriores: anteriores('CSLL') });
    } else {
      const contasDespesa = despesaIds.length === 2;
      if (!contasDespesa) avisos.push('guarda de circularidade sem contas configuradas: o resultado inclui eventual despesa de IRPJ/CSLL já lançada (BRIEF X7 item 7).');
      const resultado = BigInt(await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesaIds));
      const parteBFechada = !!(await this.lalurRepo.findClosing(scope, ano, periodo));
      const linhas = async (livro: string) =>
        (await this.lalurRepo.findManyEntries(scope, { year: ano, quarter: periodo, livro, includeArchived: false })).map((l) => ({ codigo: l.codigo, valorCents: l.valorCents }));
      const base = { ano, periodo, resultadoAntesCents: resultado, contasProvisaoConfiguradas: contasDespesa, parteBFechada, perfil, deducoes };
      irpj = apurarRealTrimestral({ ...base, tributo: 'IRPJ', linhasParteA: await linhas('lalur') });
      csll = apurarRealTrimestral({ ...base, tributo: 'CSLL', linhasParteA: await linhas('lacs') });
    }
    return { perfil, forma, irpj, csll, provisaoContasConfiguradas, avisos, anterioresIds: anterioresRows.map((r) => r.id) };
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração de IRPJ/CSLL.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de IRPJ/CSLL.');
  }
}

function mesmoConjunto(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function toPreviewLinha(r: ResultadoApuracao, periodo: string): TaxAssessmentPreviewLinha {
  return {
    tributo: r.tributo,
    periodo,
    modo: r.modo,
    codigoReceita: r.codigoReceita,
    baseCents: r.baseCents.toString(),
    devidoCents: r.devidoCents.toString(),
    deducoesCents: r.deducoesCents.toString(),
    aPagarCents: r.aPagarCents.toString(),
    saldoNegativoCents: r.saldoNegativoCents.toString(),
    tabelaVersao: r.tabelaVersao,
    memoria: r.memoria,
  };
}

function toView(row: TaxAssessment): TaxAssessmentView {
  return {
    id: row.id,
    tributo: row.tributo as TributoApuracao,
    periodo: row.periodo,
    modo: row.modo,
    codigoReceita: row.codigoReceita,
    baseCents: row.baseCents.toString(),
    devidoCents: row.devidoCents.toString(),
    deducoesCents: row.deducoesCents.toString(),
    aPagarCents: row.aPagarCents.toString(),
    saldoNegativoCents: row.saldoNegativoCents.toString(),
    status: row.status as 'CONFIRMED' | 'SUPERSEDED',
    supersedesId: row.supersedesId,
    provisaoPendente: row.status === 'CONFIRMED' && row.provisaoEntryId === null,
    tabelaVersao: row.tabelaVersao,
    memoria: MemoriaCalculoSchema.parse(row.memoria),
    confirmedAt: row.confirmedAt.toISOString(),
  };
}
