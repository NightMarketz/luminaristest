import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { exigirLinhaVigente, parametrosUsados, type LinhaLegal, type ParametrosUsados } from '../../legalParameters/models/legalParameter';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IInterestOnEquityRepository, MovimentoDiario } from '../repositories/IInterestOnEquityRepository';
import type { IPartnerRepository } from '../repositories/IPartnerRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { JcpBaseContas, JcpBaseGrupo } from '../dtos/CompanyFiscalProfileDto';
import type { JcpPreview, JcpPreviewInput } from '../dtos/InterestOnEquityDto';
import { formaEfetiva } from './CompanyFiscalProfileService';
import { janelaDoPeriodo } from '../models/janelaApuracao';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { CLOSING_SOURCE_TYPE } from '../models/closing';
import { linhasDoLivro, vigenteNoAno } from '../models/Lalur.model';
import { PARTICIPACAO_TOTAL_BP, somaParticipacaoBp, vigenteEm } from '../models/partner';
import {
  chaveTjlp,
  diaAnterior,
  faixasJcp,
  irrfJcp,
  lalurPrevisto,
  limiteDedutivel,
  rateioPorParticipacao,
  taxaDiariaTexto,
  type Faixa,
  type FormaJcp,
  type LinhaLalurPrevista,
} from '../models/interestOnEquity';

/** O cálculo inteiro, em `bigint` — a prévia (PR-3) o mostra; a confirmação (PR-4) o regrava dentro da tx. */
export interface CalculoJcp {
  unitId: string;
  anoCalendario: number;
  periodo: string;
  dataCredito: string;
  forma: FormaJcp;
  totalCents: bigint;
  faixas: Faixa[];
  jurosMaxTjlpCents: bigint;
  limite50LucroCents: bigint;
  limite50ReservasCents: bigint;
  limiteDedutivelCents: bigint;
  excessoIndedutivelCents: bigint;
  alocacoes: Array<{ partnerId: string; participacaoBp: number; brutoCents: bigint; irrfCents: bigint; liquidoCents: bigint }>;
  lalurPrevisto: LinhaLalurPrevista[];
  avisos: string[];
  aliquotaBp: number;
  parametros: ParametrosUsados;
}

/** Item 29 — as linhas do catálogo L12 do ano (M300A/M350A), achadas pela descrição oficial, nunca pelo código literal. */
const DESCRICAO_EXCLUSAO_JCP = '(-) Juros sobre o capital próprio';
const DESCRICAO_ADICAO_EXCESSO_JCP = 'Excesso de juros sobre o capital próprio pagos ou creditados';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26) — cálculo e prévia do JCP (Lei 9.249 art. 9º [D02]; IN 1.700
 * art. 75 [D11]). Só no lucro real (F-IRD-12), um cálculo por período de apuração (F-IRD-17), base pro rata die pelo
 * saldo diário das contas do mapa do PL (F-IRD-15/16) e TJLP mensal ÷ dias do mês (F-IRD-18). Lacunas decididas pelo
 * dono em 23/10 ([[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]]): L-IRD-2 (saldo do limite no início do período) e L-IRD-3
 * (`dataCredito` dentro do período, TJLP até ela). O razão lido é o da unidade (`unitId`), como o mapa do PL (item 8).
 * Nada grava: a prévia não chama `postEntry`.
 */
export class InterestOnEquityService {
  constructor(
    private readonly repo: IInterestOnEquityRepository,
    private readonly partnerRepo: Pick<IPartnerRepository, 'list'>,
    private readonly accountRepo: Pick<IAccountRepository, 'findById'>,
    private readonly companyRepo: Pick<ICompanyFiscalProfileRepository, 'findByYear'>,
    private readonly fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly policy: IAccountingPolicy,
  ) {}

  /** Item 26 — a prévia: base por faixa, limites, rateio por sócio com IRRF de 17,5%, excesso e Parte A prevista. */
  async preview(scope: AccountingScope, input: JcpPreviewInput): Promise<JcpPreview> {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para calcular o JCP.');
    return toPreview(await this.calcular({ ...scope, unitId: input.unitId }, input));
  }

  async calcular(s: AccountingScope, input: JcpPreviewInput): Promise<CalculoJcp> {
    // Item 22 (F-IRD-12) e item 23 (F-IRD-17): só no Real; o período segue a forma do perfil, como no X7.
    const perfil = await this.companyRepo.findByYear(s, input.anoCalendario);
    if (!perfil || perfil.regime !== 'REAL') {
      throw new ValidationError(
        'JCP só no lucro real (F-IRD-12): fora dele não há dedução, e o IRRF de 17,5% é definitivo ao sócio PF.',
        null,
        'JCP_SO_NO_LUCRO_REAL',
      );
    }
    const forma = formaEfetiva(perfil.regime, perfil.formaApuracaoIrpjCsll);
    if ((forma === 'ANUAL') !== (input.periodo === 'A00')) {
      throw new ValidationError(`Período ${input.periodo} não serve ao Real ${forma ?? 'sem forma'}: trimestral usa T01..T04; anual usa A00.`, null, 'PERIODO_INCOMPATIVEL_COM_A_FORMA');
    }
    const janela = janelaDoPeriodo(input.anoCalendario, input.periodo);
    if (input.dataCredito < janela.de || input.dataCredito > janela.ate) {
      throw new ValidationError(`dataCredito ${input.dataCredito} fora do período ${input.periodo} (${janela.de} a ${janela.ate}) — L-IRD-3.`, null, 'DATA_CREDITO_FORA_DO_PERIODO');
    }

    // Item 22 (F-IRD-14, F-IRD-7): participações vigentes somam 100% e nenhum sócio no exterior.
    const socios = (await this.partnerRepo.list(s)).filter((p) => vigenteEm(p, input.dataCredito));
    if (socios.some((p) => !p.residenteBrasil)) {
      throw new ValidationError('Há sócio não residente no Brasil: o JCP a residente no exterior está fora do escopo (F-IRD-7).', null, 'SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO');
    }
    const soma = somaParticipacaoBp(socios);
    if (soma !== PARTICIPACAO_TOTAL_BP) {
      throw new ValidationError(`As participações vigentes em ${input.dataCredito} somam ${soma} bp; o JCP exige ${PARTICIPACAO_TOTAL_BP} (item 22).`, null, 'SOMA_PARTICIPACOES_INVALIDA');
    }

    const mapa = perfil.jcpBaseContas as JcpBaseContas | null;
    if (!mapa) throw new ValidationError('Mapa das contas do PL (jcpBaseContas) não configurado no perfil da empresa (item 8).', null, 'JCP_MAPA_PL_NAO_CONFIGURADO');
    if (input.forma === 'PL') {
      const conta = await this.accountRepo.findById(s, input.debitoPlAccountId as string);
      if (!conta || conta.deletedAt) throw new NotFoundError(`Conta '${input.debitoPlAccountId}' não encontrada nesta unidade.`);
      if (conta.nature !== 'Equity') throw new ValidationError(`A conta debitada no JCP em PL tem de ser Equity; '${conta.code}' é ${conta.nature}.`);
    }

    // Item 22 (L-IRD-3): TJLP vigente do início do período até a dataCredito; sem linha → PARAMETRO_LEGAL_AUSENTE.
    const linhas: LinhaLegal[] = await this.legalParams.fotografia(['TJLP', 'IRRF_DISTRIBUICAO']);
    const taxaDoDia = (dia: string) => exigirLinhaVigente(linhas, 'TJLP', chaveTjlp(dia), dia).valorInt as number;
    const aliquotaBp = exigirLinhaVigente(linhas, 'IRRF_DISTRIBUICAO', 'ALIQUOTA_JCP_BP', input.dataCredito).valorInt as number;

    // Item 24 — base pro rata die pelo saldo do fim do dia anterior.
    const grupos = Object.entries(mapa) as Array<[JcpBaseGrupo, string[]]>;
    const grupoDe = new Map<string, JcpBaseGrupo>();
    for (const [g, ids] of grupos) for (const id of ids) grupoDe.set(id, g);
    const movs = await this.repo.movimentosDasContas(s.ownerUserId, [...grupoDe.keys()], new Date(input.dataCredito), LEDGER_STATUSES);
    const saldoAte = saldosPorGrupo(movs, grupoDe);
    const fimAnoAnterior = `${input.anoCalendario - 1}-12-31`;
    const lucrosAnoAnterior = saldoAte(fimAnoAnterior, ['LUCROS_ACUMULADOS']);
    const baseNoFimDoDia = (dia: string): bigint => {
      // § 1º VI (L12): lucros acumulados só até o saldo apurado no exercício anterior.
      const la = saldoAte(dia, ['LUCROS_ACUMULADOS']);
      return saldoAte(dia, ['CAPITAL_INTEGRALIZADO', 'RESERVAS_CAPITAL', 'RESERVAS_LUCROS', 'ACOES_TESOURARIA']) + (la < lucrosAnoAnterior ? la : lucrosAnoAnterior);
    };
    const { faixas, jurosMaxTjlpCents } = faixasJcp(janela.de, input.dataCredito, baseNoFimDoDia, taxaDoDia);

    // Item 25 — limites: lucro do período antes do JCP, após a CSLL e antes do IRPJ (§§ 2º I e 3º), e lucros + reservas
    // no início do período (L-IRD-2).
    const fp = await this.fiscalProfileRepo.findByScope(s);
    const fora = new Set([fp?.jcpDespesaAccountId, fp?.irpjDespesaAccountId].filter((id): id is string => !!id));
    const doPeriodo = await this.repo.totaisDaUnidade(s.ownerUserId, s.unitId, {
      de: new Date(janela.de),
      ate: new Date(janela.ate),
      status: LEDGER_STATUSES,
      excluirFontes: [CLOSING_SOURCE_TYPE],
    });
    const lucro = doPeriodo
      .filter((t) => (t.nature === 'Revenue' || t.nature === 'Expense') && !fora.has(t.accountId))
      .reduce((acc, t) => acc + t.creditCents - t.debitCents, 0n);
    const lucrosReservas = saldoAte(diaAnterior(janela.de), ['LUCROS_ACUMULADOS', 'RESERVAS_LUCROS']);
    const limites = limiteDedutivel(jurosMaxTjlpCents, lucro, lucrosReservas);

    const total = BigInt(input.totalCents);
    const alocacoes = this.alocar(input, socios, total).map((a) => {
      const irrf = irrfJcp(a.brutoCents, aliquotaBp);
      return { ...a, irrfCents: irrf, liquidoCents: a.brutoCents - irrf };
    });

    // Item 8 — conta de PL com saldo e fora do mapa aparece como aviso.
    const avisos: string[] = [];
    const naData = await this.repo.totaisDaUnidade(s.ownerUserId, s.unitId, { ate: new Date(diaAnterior(input.dataCredito)), status: LEDGER_STATUSES, excluirFontes: [] });
    const foraDoMapa = naData.filter((t) => t.nature === 'Equity' && t.creditCents !== t.debitCents && !grupoDe.has(t.accountId)).map((t) => t.code).sort();
    if (foraDoMapa.length > 0) {
      avisos.push(`Contas de PL com saldo fora do mapa da base do JCP (jcpBaseContas): ${foraDoMapa.join(', ')}. Confira se alguma entra no art. 75 I–V.`);
    }

    return {
      unitId: s.unitId,
      anoCalendario: input.anoCalendario,
      periodo: input.periodo,
      dataCredito: input.dataCredito,
      forma: input.forma,
      totalCents: total,
      faixas,
      jurosMaxTjlpCents,
      ...limites,
      excessoIndedutivelCents: total > limites.limiteDedutivelCents ? total - limites.limiteDedutivelCents : 0n,
      alocacoes,
      lalurPrevisto: lalurPrevisto(input.forma, total, limites.limiteDedutivelCents, (livro) => codigosJcp(livro, input.anoCalendario)),
      avisos,
      aliquotaBp,
      parametros: parametrosUsados(
        linhas.filter((l) => l.tabela === 'TJLP' || l.chave === 'ALIQUOTA_JCP_BP'),
        janela.de,
        input.dataCredito,
      ),
    };
  }

  /** Item 26 — rateio pela participação, ou o do corpo: só sócios vigentes, e a soma bate com o total. */
  private alocar(
    input: JcpPreviewInput,
    socios: ReadonlyArray<{ id: string; participacaoBp: number }>,
    total: bigint,
  ): Array<{ partnerId: string; participacaoBp: number; brutoCents: bigint }> {
    const bp = new Map(socios.map((p) => [p.id, p.participacaoBp]));
    if (!input.rateio) {
      return rateioPorParticipacao(total, socios.map((p) => ({ partnerId: p.id, participacaoBp: p.participacaoBp }))).map((r) => ({
        ...r,
        participacaoBp: bp.get(r.partnerId) as number,
      }));
    }
    const fora = input.rateio.filter((r) => !bp.has(r.partnerId)).map((r) => r.partnerId);
    if (fora.length > 0) throw new ValidationError(`Rateio com quem não é sócio vigente em ${input.dataCredito}: ${fora.join(', ')}.`, null, 'RATEIO_INVALIDO');
    const soma = input.rateio.reduce((acc, r) => acc + BigInt(r.brutoCents), 0n);
    if (soma !== total) throw new ValidationError(`O rateio soma ${soma} centavos; o total é ${total}.`, null, 'RATEIO_INVALIDO');
    return input.rateio.map((r) => ({ partnerId: r.partnerId, participacaoBp: bp.get(r.partnerId) as number, brutoCents: BigInt(r.brutoCents) }));
  }
}

/** Saldo credor (crédito − débito) acumulado até o fim de `dia`, somado nos grupos pedidos. */
function saldosPorGrupo(movs: readonly MovimentoDiario[], grupoDe: ReadonlyMap<string, JcpBaseGrupo>) {
  const ordenados = [...movs].sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
  return (dia: string, grupos: readonly JcpBaseGrupo[]): bigint => {
    let s = 0n;
    for (const m of ordenados) {
      if (m.dia > dia) break;
      if (grupos.includes(grupoDe.get(m.accountId) as JcpBaseGrupo)) s += m.creditCents - m.debitCents;
    }
    return s;
  };
}

/** Item 29 — os códigos da exclusão e da adição do JCP no catálogo L12 vigente no ano. */
export function codigosJcp(livro: 'lalur' | 'lacs', ano: number): { exclusao: string; adicaoExcesso: string } {
  const achar = (descricao: string, tipoLanc: string) => {
    const linha = linhasDoLivro(livro).find((l) => l.descricao === descricao && l.tipoLanc === tipoLanc && vigenteNoAno(l, ano));
    if (!linha) throw new ValidationError(`Catálogo L12 sem a linha "${descricao}" (${livro}) vigente em ${ano}.`);
    return linha.codigo;
  };
  return { exclusao: achar(DESCRICAO_EXCLUSAO_JCP, 'E'), adicaoExcesso: achar(DESCRICAO_ADICAO_EXCESSO_JCP, 'A') };
}

function toPreview(c: CalculoJcp): JcpPreview {
  return {
    faixas: c.faixas.map((f) => ({ de: f.de, ate: f.ate, baseCents: Number(f.baseCents), taxaDiaria: taxaDiariaTexto(f), jurosCents: Number(f.jurosCents) })),
    jurosMaxTjlpCents: Number(c.jurosMaxTjlpCents),
    limite50LucroCents: Number(c.limite50LucroCents),
    limite50ReservasCents: Number(c.limite50ReservasCents),
    limiteDedutivelCents: Number(c.limiteDedutivelCents),
    excessoIndedutivelCents: Number(c.excessoIndedutivelCents),
    alocacoes: c.alocacoes.map((a) => ({
      partnerId: a.partnerId,
      participacaoBp: a.participacaoBp,
      brutoCents: Number(a.brutoCents),
      irrfCents: Number(a.irrfCents),
      liquidoCents: Number(a.liquidoCents),
    })),
    lalurPrevisto: c.lalurPrevisto.map((l) => ({ livro: l.livro, codigo: l.codigo, valorCents: Number(l.valorCents) })),
    avisos: c.avisos,
  };
}
