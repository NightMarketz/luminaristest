/**
 * TaxAssessmentService — apuração trimestral de IRPJ/CSLL (nó X7, Fase A). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: reverseEntry da provisão viva de cada linha SUPERSEDED do mesmo (PJ, ano, tributo, período) —
 *              substituídas e posteriores da cascata, com ou sem `supersedesId` apontando para elas;
 *              tx própria, idempotente) e depois postEntry(sourceType='tax.assessment.provision', sourceId=<id da
 *              apuração>) no último dia do período — trimestre, mês A0m ou 31/12 no A00 (BRIEF item 15, "commit 2"; Fase B
 *              item 16) —; gate de período dentro de cada tx; a provisão é achada pela FONTE, não pelo vínculo. Valor =
 *              `valorProvisao` (devido + diferença postergada; no A00 a diferença do ajuste, com sinal: < 0 ⇒ D saldo
 *              negativo a compensar / C despesa)
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (commit 1 — razão): período fechado ⇒ a confirmação fica, provisão pendente, nenhum lançamento"
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (substituição): estorna a provisão da substituída e a dos posteriores da cascata, e posta a da nova"
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (substituição × vínculo perdido): a substituída postada sem provisaoEntryId é estornada — 1 provisão viva por tributo"
 *              teste: taxAssessmentAnual.integration.test.ts › "26 (m): A00 abaixo do provisionado ⇒ D saldo negativo a compensar / C despesa em 31/12, e o LAIR do item 6 não muda"
 *              X8 PR-3 (BRIEF X8 item 17): linhas PIS/COFINS `M01..M12` — fim do mês; D despesa / C a recolher = débito e,
 *              no não cumulativo, + D a recuperar / C redutora = outros créditos do mês e + D a recolher / C a recuperar =
 *              crédito consumido (`consumoPisCofins`); nos 2 regimes, + D retido a compensar / C a conciliar = retenções e
 *              + D a recolher / C retido = parte abatida; chamado pelo `PisCofinsAssessmentService` via `provisionarAposConfirmacao`
 *              teste: pisCofinsProvision.integration.test.ts › "retenções (dono 06/10): D retido a compensar / C a conciliar com clientes + baixa contra o a recolher — 10 pernas no Real; excedente fica no ativo no Presumido; a recolher = DARF"
 *              teste: pisCofinsProvision.integration.test.ts › "item 17 (não cumulativo): + D a recolher / C PIS/COFINS a recuperar = crédito da NF-e aproveitado; saldo credor anterior consumido também é baixado"
 *              teste: pisCofinsProvision.integration.test.ts › "item 17 / L-5: outros créditos entram no a recuperar; o mês seguinte consome o saldo que os inclui — a recuperar nunca credor, a recolher = DARF"
 *              teste: pisCofinsProvision.integration.test.ts › "item 17 (substituição): estorna a provisão da substituída e posta a da nova — 1 provisão viva por tributo; período fechado ⇒ confirmação fica, pendente"
 *   commit 2 — subrazão: CAS provisaoEntryId `where null` (BRIEF item 15, "commit 3"), sem tx de razão
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *              teste: pisCofinsProvision.integration.test.ts › "item 17 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *   reconcile — POST /tax-assessments/:id/provisao completa o que faltar; nada já feito é refeito (sem gate de período)
 *              teste: taxAssessmentProvision.integration.test.ts › "item 16 + ADR §13 item 11: reconcile completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId"
 *              teste: pisCofinsProvision.integration.test.ts › "itens 18 + 19 (D4 + D6 do PR-2): mês confirmado com débito > 0 e provisão pendente bloqueia o encerramento; o reconcile (2×, idempotente) provisiona e o encerramento passa"
 *   fora da tx — a confirmação (BRIEF item 14, "commit 1") commita ANTES, em runTransaction próprio; falha da provisão não a desfaz
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (commit 1 — razão): período fechado ⇒ a confirmação fica, provisão pendente, nenhum lançamento"
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (cascata × estorno falho): reconfirmar o posterior estorna a provisão órfã antes de postar — nunca 2 vivas"
 */
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { tabelaApuracaoDe, type TabelaApuracao } from '../models/taxAssessmentParams';
import { parametrosUsados, type ParametrosUsados } from '../../legalParameters/models/legalParameter';
import { janelaDoPeriodo } from '../models/janelaApuracao';
import type { CompanyFiscalProfile, FiscalProfile, Prisma, TaxAssessment } from 'generated/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { ITaxAssessmentRepository } from '../repositories/ITaxAssessmentRepository';
import type { ICompanyFiscalProfileRepository } from '../repositories/ICompanyFiscalProfileRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { ILalurRepository } from '../repositories/ILalurRepository';
import type { IAccountingPeriodRepository } from '../repositories/IAccountingPeriodRepository';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
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
  fimDoTrimestre,
  maxZero,
  trimestresEmAtividade,
  valorLinha,
  type MemoriaAnterior,
  type MemoriaLinha,
  type PeriodoTrimestral,
  type TributoApuracao,
} from '../models/taxAssessmentCalc';
import {
  PROVISAO_AJUSTE_ANUAL,
  apurarAjusteAnual,
  apurarBalancete,
  apurarEstimativaReceitaBruta,
  fimDoMes,
  mesesEmAtividade,
  type MesConfirmado,
  type ModoMensal,
  type ReceitaMes,
  type ResultadoApuracaoAnual,
} from '../models/taxAssessmentCalcAnual';
import { isLalurMes, mesBounds, periodoBounds, type LalurMes } from '../models/Lalur.model';
import type { TributoPisCofins } from '../models/pisCofinsParams';
import { MODO_PIS_COFINS, isPeriodoPisCofins } from '../models/pisCofinsCalc';

export const TAX_ASSESSMENT_CONFIRMED = 'tax.assessment.confirmed';
/** `sourceType` da provisão (item 15): chave de idempotência = id da apuração. */
export const TAX_ASSESSMENT_PROVISION_SOURCE_TYPE = 'tax.assessment.provision';

type LinhaProvisao = Pick<TaxAssessment, 'periodo' | 'devidoCents' | 'diferencaPostergadaCents' | 'memoria'>;

/**
 * Item 15 da Fase A + item 16 da Fase B (F-TB-3 a) — o que a linha provisiona, com sinal: trimestre e mês A0m = devido +
 * diferença postergada (só no IRPJ do mês do excesso); `A00` = devido anual − o que os meses provisionaram, lido da
 * memória confirmada (`PROVISAO_AJUSTE_ANUAL`): > 0 ⇒ D despesa / C a recolher; < 0 ⇒ D saldo negativo / C despesa.
 */
export function valorProvisao(row: LinhaProvisao): bigint {
  if (row.periodo === 'A00') return valorLinha(MemoriaCalculoSchema.parse(row.memoria), PROVISAO_AJUSTE_ANUAL, row.periodo);
  return row.devidoCents + row.diferencaPostergadaCents;
}

type LinhaLancamento = { accountCode: string; debitCents: number; creditCents: number };

type LinhaPisCofins = Pick<TaxAssessment, 'modo' | 'periodo' | 'devidoCents' | 'memoria'>;

/** O que a provisão de PIS/COFINS do mês reconhece e baixa no "a recuperar" (BRIEF X8 item 17 + L-1..L-5). */
export interface ConsumoPisCofins {
  /** L-5: outros créditos do mês (art. 3º III–IX, informados) — entram no "a recuperar" (D a recuperar / C redutora). */
  outrosDoMes: bigint;
  /** L-1 (a): crédito da NF-e do mês consumido (a NF-e consome primeiro). */
  nfe: bigint;
  /** L-4 (a): outros créditos do mês consumidos, depois da NF-e. */
  outros: bigint;
  /** L-2: saldo credor anterior consumido, por último. */
  saldoAnterior: bigint;
  /** Retenções (dono 06/10): as sofridas no mês (`RETENCAO_n`) — entram no "retido a compensar" (nos 2 regimes). */
  retencoesDoMes: bigint;
  /** Retenções abatidas do que sobrou do débito depois dos créditos; o excedente fica no "retido a compensar". */
  retencoes: bigint;
}

const minB = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const CREDITO_NFE_CODIGOS = ['CREDITO_NFE', 'CREDITO_NFE_DERIVADO'];

/**
 * BRIEF X8 item 17 com as decisões do dono de 06/10 ([[D-2026-10-06-X8-PR3-LACUNAS]]), só no não cumulativo (no
 * cumulativo tudo é 0 — sem crédito, EMENDA §7 leitura 5):
 *  - L-5 (reabre em parte o F-PCB-3 a; prática citando ADI SRF 3/2007): os outros créditos do mês entram no "a
 *    recuperar" — D PIS/COFINS a recuperar / C redutora de despesa (`pisCofinsCreditoOutrosAccountId`), nunca receita;
 *  - consumo contra o débito na ordem da memória (L-1 a, L-4 a): NF-e do mês → outros do mês → saldo anterior (L-2);
 *    parcial ⇒ só o usado; mês sem débito ⇒ nada consumido.
 */
export function consumoPisCofins(row: LinhaPisCofins): ConsumoPisCofins {
  const zero: ConsumoPisCofins = { outrosDoMes: 0n, nfe: 0n, outros: 0n, saldoAnterior: 0n, retencoesDoMes: 0n, retencoes: 0n };
  const ehPisCofins = row.modo === MODO_PIS_COFINS.NAO_CUMULATIVO || row.modo === MODO_PIS_COFINS.CUMULATIVO;
  if (!ehPisCofins) return zero;
  const memoria = MemoriaCalculoSchema.parse(row.memoria);
  const soma = (pred: (codigo: string) => boolean) => memoria.filter((m) => pred(m.codigo)).reduce((s, m) => s + BigInt(m.valorCents), 0n);
  const retencoesDoMes = soma((c) => /^RETENCAO_\d+$/.test(c));
  let restante = row.devidoCents;
  let c = zero;
  if (row.modo === MODO_PIS_COFINS.NAO_CUMULATIVO) {
    const nfeMes = soma((c) => CREDITO_NFE_CODIGOS.includes(c));
    const outrosDoMes = soma((c) => c.startsWith('CREDITO_') && !CREDITO_NFE_CODIGOS.includes(c));
    const saldo = soma((c) => c === 'SALDO_CREDOR_ANTERIOR');
    const nfe = minB(nfeMes, restante);
    restante -= nfe;
    const outros = minB(outrosDoMes, restante);
    restante -= outros;
    const saldoAnterior = minB(saldo, restante);
    restante -= saldoAnterior;
    c = { ...c, outrosDoMes, nfe, outros, saldoAnterior };
  }
  // A ordem da função pura (`apurarPisCofinsMensal`): a pagar = max(0, débito − créditos − retenções).
  return { ...c, retencoesDoMes, retencoes: minB(retencoesDoMes, restante) };
}

/** L-1 (a): crédito da NF-e do mês consumido. */
export const creditoNfeAproveitado = (row: LinhaPisCofins): bigint => consumoPisCofins(row).nfe;
/** L-2: saldo credor anterior consumido no mês. */
export const saldoAnteriorAproveitado = (row: LinhaPisCofins): bigint => consumoPisCofins(row).saldoAnterior;

/**
 * Decisão do dono 04/10 (lacuna L-C do PR-3 da Fase A), generalizada na Fase B: pendente ⇔ CONFIRMED ∧ valor da provisão
 * ≠ 0 ∧ sem lançamento. Valor 0 (suspensão do balancete, ajuste igual aos meses) não tem o que provisionar (o `postEntry`
 * recusa lançamento zerado) e não bloqueia o encerramento. X8 PR-3 (L-5): um mês de PIS/COFINS sem débito mas com outros
 * créditos tem o que lançar (o reconhecimento no "a recuperar") — senão o saldo credor que eles geram seria baixado
 * depois sem nunca ter entrado no ativo.
 */
export function provisaoPendente(row: LinhaProvisao & Pick<TaxAssessment, 'status' | 'provisaoEntryId' | 'modo'>): boolean {
  if (row.status !== 'CONFIRMED' || row.provisaoEntryId !== null) return false;
  if (valorProvisao(row) !== 0n) return true;
  const c = consumoPisCofins(row);
  return c.outrosDoMes > 0n || c.retencoesDoMes > 0n; // dono 06/10: retenção sem débito também é reconhecida
}

/**
 * Ordem dos períodos no ano (F-TA-3 a; Fase B item 13): `T01..T04` ou `A01..A12` e, por último, o `A00` — o ajuste
 * depende de todos os meses, e substituir um mês derruba também o `A00` (cascata).
 */
const ordem = (p: string): number => (p === 'A00' ? 13 : isLalurMes(p) ? Number(p.slice(1)) : PERIODOS_TRIMESTRAIS.indexOf(p as PeriodoTrimestral));

/**
 * Data da provisão e do estorno (itens 15/16): fim do trimestre, do mês `A0m`, ou 31/12 no `A00`. X8 PR-3 (BRIEF X8 item
 * 17): `M01..M12` de PIS/Cofins ⇒ último dia do mês.
 */
export function fimDoPeriodo(ano: number, periodo: string): string {
  if (periodo === 'A00') return `${ano}-12-31`;
  if (isLalurMes(periodo) || isPeriodoPisCofins(periodo)) return fimDoMes(ano, Number(periodo.slice(1)));
  return fimDoTrimestre(ano, periodo as PeriodoTrimestral);
}

/** Item 15 (F-TB-4 b): mês fechado = `SOFT_CLOSED` ou `HARD_CLOSED`; não semeado conta como aberto (`monthsCovered`). */
const FECHADO = new Set(['SOFT_CLOSED', 'HARD_CLOSED']);
export const TAX_ASSESSMENT_SUPERSEDED = 'tax.assessment.superseded';

const TRIBUTOS: readonly TributoApuracao[] = ['IRPJ', 'CSLL'];
/**
 * X8 PR-2 (BRIEF X8 item 12, F-X8-2 a): a tabela `tax_assessments` guarda também PIS/COFINS (`M01..M12`). Os gates e
 * cálculos de IRPJ/CSLL leem só as próprias linhas — uma linha de PIS confirmada em paralelo não pode virar
 * "anterior mudou" (409 espúrio) nem entrar na checagem de regime.
 */
const doIrpjCsll = (r: TaxAssessment): boolean => (TRIBUTOS as readonly string[]).includes(r.tributo);

export interface TaxAssessmentView {
  id: string;
  /** X8 PR-2: a leitura serve também PIS/COFINS (BRIEF X8 item 16). */
  tributo: TributoApuracao | TributoPisCofins;
  periodo: string;
  modo: string;
  codigoReceita: string;
  baseCents: string;
  devidoCents: string;
  deducoesCents: string;
  aPagarCents: string;
  saldoNegativoCents: string;
  /** Fase B item 17 (F-TB-5 b): só no IRPJ do mês do excesso do 16%. */
  diferencaPostergadaCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED';
  supersedesId: string | null;
  provisaoPendente: boolean;
  tabelaVersao: string;
  /** BE-INCR-LEGAL-PARAMS PR-4 (item 7): sha256 das linhas de lei do período; null nas anteriores ao PR-4. */
  parametrosSha256: string | null;
  /** PR-4 (item 10): aviso da mudança de parâmetro legal ("reconfirme" / "valor mudou depois do pagamento"). */
  avisoParametroLegal: string | null;
  memoria: MemoriaLinha[];
  confirmedAt: string;
}

export type TaxAssessmentPreviewLinha = Omit<TaxAssessmentView, 'id' | 'status' | 'supersedesId' | 'provisaoPendente' | 'confirmedAt' | 'parametrosSha256' | 'avisoParametroLegal'>;

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
  irpj: ResultadoApuracaoAnual;
  csll: ResultadoApuracaoAnual;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
  /** Ids das memórias CONFIRMED anteriores que o cálculo leu (F-TA-3 a) — re-checados dentro da tx. */
  anterioresIds: string[];
  /** BE-INCR-LEGAL-PARAMS PR-4 (item 7): as linhas de lei do período que o cálculo recebeu. */
  parametros: ParametrosUsados;
}

/**
 * PR-4 (item 10; dono 07/10 "Gravar a entrada") — o que o usuário informou na confirmação do X7, sem o que é do pedido
 * (unidade, CAS, substituídas). O job de recálculo reconfirma com isto.
 */
export type EntradaInformadaX7 = Pick<TaxAssessmentConfirmInput, 'deducoes' | 'modoMensal' | 'estimativasPagas'>;
const entradaX7 = (i: TaxAssessmentPreviewInput): EntradaInformadaX7 => ({
  deducoes: i.deducoes,
  ...(i.modoMensal !== undefined ? { modoMensal: i.modoMensal } : {}),
  ...(i.estimativasPagas !== undefined ? { estimativasPagas: i.estimativasPagas } : {}),
});

/** PR-4 — o resultado de um recálculo, para o job comparar com a linha confirmada. */
export interface RecalculoView {
  linhas: Record<string, Pick<TaxAssessment, 'baseCents' | 'devidoCents' | 'aPagarCents' | 'saldoNegativoCents' | 'diferencaPostergadaCents'>>;
  parametros: ParametrosUsados;
}


/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7; BRIEF itens 12–14, 17, 19) — prévia, confirmação (commit 1) e leitura
 * da apuração trimestral de IRPJ/CSLL. A aritmética é das funções puras do PR-1 (`taxAssessmentCalc`); aqui só se lê
 * perfil, razão, e-Lalur e memórias confirmadas, e se grava.
 *
 * PR-3 (itens 15, 16): depois do commit 1, a provisão no razão em best-effort (ver o cabeçalho `atomicUntil`) e o
 * reconcile. O encerramento × provisão pendente (item 18) mora no `ExerciseClosingService`.
 *
 * Confirmação (item 14): recalcula FORA da tx e abre UMA `runTransaction` com todos os gates autoritativos dentro
 * (memória `authoritative-gate-inside-tx`): perfil igual ao lido no cálculo, memórias anteriores iguais, CAS do a
 * pagar, ordem dos trimestres (F-TA-3 a), um só CONFIRMED por (PJ, ano, tributo, período), regime igual ao das
 * confirmações do ano, trava da forma (F-X7-5 a) e a cascata da substituição.
 *
 * Cascata (decisão do dono, 04/10, lacuna do F-TA-3 "força reconfirmar os seguintes"): substituir Tq marca
 * SUPERSEDED também as linhas CONFIRMED dos trimestres posteriores, sem substituta, e devolve a lista em
 * `reconfirmar`; a ordem do F-TA-3 obriga reconfirmá-los em sequência. Com 409 puro não haveria saída.
 *
 * Fase B PR-3 (BRIEF B itens 5, 6, 11, 13–17): os mesmos endpoints aceitam `A00..A12` na forma `ANUAL` — estimativa
 * por receita bruta ou balancete de suspensão/redução no mês (`modoMensal`), ajuste anual no `A00`. A cascata vale
 * para os meses (decisão do dono 05/10, [[D-2026-10-05-X7-FASE-B-PR3-LACUNAS]] 2, contra o 409 da letra do item 13):
 * substituir `A0k` derruba `A0(k+1)..A12` e o `A00`. O balancete exige os meses anteriores em atividade fechados,
 * dentro da tx (item 15, F-TB-4 b).
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
    private readonly postingService: PostingService,
    /** Fase B item 15 (F-TB-4 b): status dos meses anteriores ao balancete, lido dentro da tx da confirmação. */
    private readonly periodRepo: Pick<IAccountingPeriodRepository, 'findByYearMonth'>,
    /** BE-INCR-LEGAL-PARAMS PR-1 (F-LP-4 a): a fotografia dos coeficientes de lei que as funções puras recebem. */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
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
    return this.confirmar(scope, input, null);
  }

  /**
   * BE-INCR-LEGAL-PARAMS PR-4 (item 10; dono 07/10 "Ator PLATFORM") — o recálculo do job, SEM a policy de usuário: o
   * autor é a plataforma (`scope.actorUserId = 'PLATFORM'`). Só o `TaxAssessmentRecalcService` chama.
   */
  async recalcularPeloSistema(scope: AccountingScope, input: TaxAssessmentPreviewInput): Promise<RecalculoView> {
    const c = await this.calcular(scope, input);
    return { linhas: { IRPJ: c.irpj, CSLL: c.csll }, parametros: c.parametros };
  }

  /** PR-4 (item 10) — a confirmação do job: mesma cascata, mesmos gates na tx, autor PLATFORM, aviso opcional na linha. */
  async confirmarPeloSistema(scope: AccountingScope, input: TaxAssessmentConfirmInput, aviso: string | null): Promise<TaxAssessmentConfirmView> {
    return this.confirmar(scope, input, aviso);
  }

  private async confirmar(scope: AccountingScope, input: TaxAssessmentConfirmInput, aviso: string | null): Promise<TaxAssessmentConfirmView> {
    const c = await this.calcular(scope, input);
    const { anoCalendario: ano, periodo } = input;
    const owner = scope.ownerUserId;

    const r = await this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }
      const confirmados = (await this.repo.findConfirmedByYear(owner, ano, tx)).filter(doIrpjCsll);
      const anteriores = confirmados.filter((r) => ordem(r.periodo) < ordem(periodo));
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

      // Ordem (F-TA-3 a; Fase B item 13): Tq exige T(q−1) e A0m exige A0(m−1) CONFIRMED nos 2 tributos, salvo o 1º
      // período ou o anterior fora da atividade. O A00 exige todos os meses — a função pura do ajuste recusa (item 10).
      const q = ordem(periodo);
      const anterior = periodoAnterior(periodo);
      if (anterior) {
        const emAtividade = isLalurMes(periodo)
          ? mesesEmAtividade(ano, perfilTx.inicioAtividadeEm, perfilTx.encerramentoAtividadeEm).map(nomeMes)
          : trimestresEmAtividade(ano, perfilTx.inicioAtividadeEm, perfilTx.encerramentoAtividadeEm);
        const faltam = (emAtividade as string[]).includes(anterior) ? TRIBUTOS.filter((t) => !anteriores.some((r) => r.periodo === anterior && r.tributo === t)) : [];
        if (faltam.length > 0) {
          throw new ConflictError(`confirme ${anterior}/${ano} (${faltam.join(', ')}) antes de ${periodo} (BRIEF X7 F-TA-3 a).`, 'TAX_ASSESSMENT_ORDER');
        }
      }

      // Item 15 (F-TB-4 b), gate autoritativo DENTRO da tx: o balancete de A0m exige os meses 01..m−1 em atividade da
      // unidade lida fechados (o Diário escriturado — IN 1.700 art. 52 § 4º). O mês m pode estar aberto (provisão).
      if (input.modoMensal === 'BALANCETE') {
        const abertos = await this.mesesAbertosAntes(scope, ano, periodo as LalurMes, perfilTx, tx);
        if (abertos.length > 0) {
          throw new ValidationError(
            `balancete de ${periodo}/${ano}: feche antes os meses ${abertos.join(', ')} da unidade (SOFT_CLOSED ou HARD_CLOSED) — o balancete só vale com o Diário escriturado (IN RFB 1.700/2017 art. 52 § 4º; X7 BRIEF B item 15).`,
          );
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
      const posteriores = supersedes.length > 0 ? confirmados.filter((r) => ordem(r.periodo) > q) : [];

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
            diferencaPostergadaCents: r.diferencaPostergadaCents,
            memoria: MemoriaCalculoSchema.parse(r.memoria) as Prisma.InputJsonValue,
            tabelaVersao: r.tabelaVersao,
            parametrosIds: c.parametros.ids,
            parametrosSha256: c.parametros.sha256,
            entradaInformada: entradaX7(input) as Prisma.InputJsonValue,
            avisoParametroLegal: aviso,
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
            parametrosSha256: c.parametros.sha256, // LEGAL-PARAMS PR-4 (item 7): o snapshot entra na trilha
            modo: row.modo, // Fase B item 25 (allowlist): o modo do mês e a diferença postergada entram na trilha
            diferencaPostergadaCents: row.diferencaPostergadaCents.toString(),
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
      return { gravadas, cair, reconfirmar: [...new Set(posteriores.map((r) => r.periodo))].sort() };
    });

    const [irpj, csll] = await this.provisionarAposConfirmacao(scope, r.cair, [r.gravadas.IRPJ, r.gravadas.CSLL]);
    return { irpj: toView(irpj), csll: toView(csll), reconfirmar: r.reconfirmar };
  }

  /**
   * Item 15 — commits 2/3 do BRIEF, best-effort DEPOIS do commit 1: falha ⇒ a confirmação fica, motivo no log. Primeiro
   * estorna as provisões de TUDO que caiu (substituídas + posteriores da cascata), depois provisiona as novas. Devolve as
   * novas relidas (ou a linha do commit 1, se a provisão falhou). Pública para o `PisCofinsAssessmentService` (BRIEF X8
   * item 17: "bridge no molde do X7 item 15") — o mesmo mecanismo, sem uma 2ª cópia do 2-commits.
   */
  async provisionarAposConfirmacao(scope: AccountingScope, cair: TaxAssessment[], novas: TaxAssessment[]): Promise<TaxAssessment[]> {
    this.assertManage(scope);
    for (const s of cair) await this.bestEffort(s.id, () => this.estornarProvisaoViva(scope, s));
    const out: TaxAssessment[] = [];
    for (const n of novas) out.push((await this.bestEffort(n.id, () => this.provisionar(scope, n))) ?? n);
    return out;
  }

  /** Item 15: "falha em qualquer passo ⇒ a confirmação fica". O erro inteiro (stack) vai ao log; nunca relança. */
  private async bestEffort<T>(assessmentId: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      logger.warn('Tax assessment: provisão pendente (a confirmação fica; reconcile em POST /tax-assessments/:id/provisao)', {
        assessmentId,
        motivo: error instanceof Error ? error.message : String(error),
        error,
      });
      return null;
    }
  }

  /**
   * Item 16 — POST /accounting/tax-assessments/:id/provisao (reconcile): completa o que faltar. Idempotente: estorno e
   * `postEntry` são idempotentes, nada já feito é refeito e o CAS só vincula se estiver nulo. Aqui os erros (período
   * fechado, conta não configurada) sobem ao chamador — não há commit 1 a proteger. Linha SUPERSEDED: a única coisa que
   * pode faltar é o estorno da própria provisão.
   */
  async reconcileProvisao(scope: AccountingScope, id: string): Promise<TaxAssessmentView> {
    this.assertManage(scope);
    const row = await this.repo.findById(scope.ownerUserId, id);
    if (!row) throw new NotFoundError(`Apuração '${id}' não encontrada.`);
    // X8 PR-3 (BRIEF X8 item 18): a mesma rota serve as linhas de PIS/COFINS — `contasDaProvisao` escolhe as contas pelo
    // tributo (a guarda de 400 do PR-2 do X8 saiu).
    if (row.status !== 'CONFIRMED') {
      await this.estornarProvisaoViva(scope, row);
      return toView(row);
    }
    return toView(await this.provisionar(scope, row));
  }

  /**
   * Item 15 (F-X7-4 a). A provisão cai no razão da UNIDADE LIDA (`row.unitId`, F-X7-7 a). (1) estorna a provisão viva de
   * TODA linha SUPERSEDED do mesmo (PJ, ano, tributo, período) — antes de postar a nova, para nunca haver duas vivas. Não
   * basta a cadeia `supersedesId`: o posterior que caiu na cascata do #504 é reconfirmado com `supersedesId = null`, e a
   * provisão dele, se o estorno falhou na confirmação que o derrubou, ficaria órfã (review independente do PR-3 v2,
   * achado 1). Falha aqui ⇒ a nova não é postada (L-C); (2) se pendente (L-C), reaproveita
   * o lançamento já postado pela fonte (crash entre post e CAS) ou posta D despesa / C a recolher pelo `devidoCents` no
   * último dia do trimestre; (3) CAS do `provisaoEntryId`.
   */
  private async provisionar(scope: AccountingScope, row: TaxAssessment): Promise<TaxAssessment> {
    const owner = scope.ownerUserId;
    const caidas = await this.repo.findMany(owner, { anoCalendario: row.anoCalendario, periodo: row.periodo, status: 'SUPERSEDED' });
    for (const sub of caidas.filter((r) => r.tributo === row.tributo)) await this.estornarProvisaoViva(scope, sub);
    if (!provisaoPendente(row)) return row;

    const s: AccountingScope = { ...scope, unitId: row.unitId };
    let entry = await this.postingService.findEntryBySource(s, TAX_ASSESSMENT_PROVISION_SOURCE_TYPE, row.id);
    if (entry && (entry.reversedById || entry.status !== 'Posted')) {
      // A fonte é a chave de idempotência do `postEntry`: um lançamento estornado fora do fluxo não pode ser re-postado
      // nem vinculado (re-verificação do review do PR-3, ADV5). Corrigir = substituir a apuração.
      throw new ValidationError(`A provisão da apuração '${row.id}' (${entry.id}) foi estornada fora do fluxo — substitua a apuração para provisionar de novo.`);
    }
    if (!entry) {
      const fp = await this.fiscalProfileRepo.findByScope(s);
      const lines = doIrpjCsll(row) ? await this.linhasIrpjCsll(s, row, fp) : await this.linhasPisCofins(s, row, fp);
      entry = await this.postingService.postEntry(s, {
        unitId: s.unitId,
        date: fimDoPeriodo(row.anoCalendario, row.periodo),
        description: `Provisão de ${row.tributo}${row.periodo === 'A00' ? ' (ajuste anual)' : ''} — ${row.periodo}/${row.anoCalendario} (apuração ${row.id})`,
        sourceType: TAX_ASSESSMENT_PROVISION_SOURCE_TYPE,
        sourceId: row.id,
        lines,
      });
    }
    await this.repo.setProvisaoEntryId(owner, row.id, entry.id); // false ⇒ outra chamada já vinculou; a releitura mostra
    return (await this.repo.findById(owner, row.id)) ?? row;
  }

  /** Estorna a provisão da linha (achada pela fonte), se existir e ainda estiver viva. Já estornada ⇒ nada, sem gate de período. */
  private async estornarProvisaoViva(scope: AccountingScope, row: TaxAssessment): Promise<void> {
    const s: AccountingScope = { ...scope, unitId: row.unitId };
    const entry = await this.postingService.findEntryBySource(s, TAX_ASSESSMENT_PROVISION_SOURCE_TYPE, row.id);
    if (!entry || entry.reversedById || entry.status !== 'Posted') return;
    await this.postingService.reverseEntry(s, {
      unitId: s.unitId,
      lancamentoId: entry.id,
      reversalPostingDate: fimDoPeriodo(row.anoCalendario, row.periodo),
      reason: `apuração ${row.id} substituída`,
    });
  }

  /** Item 15 (Fase A) + item 16 (Fase B): D despesa / C a recolher pelo valor da provisão; com sinal negativo, D saldo negativo / C despesa. */
  private async linhasIrpjCsll(s: AccountingScope, row: TaxAssessment, fp: FiscalProfile | null): Promise<LinhaLancamento[]> {
    const ids =
      row.tributo === 'IRPJ'
        ? { despesa: fp?.irpjDespesaAccountId, recolher: fp?.irpjRecolherAccountId, saldoNegativo: fp?.irpjSaldoNegativoAccountId }
        : { despesa: fp?.csllDespesaAccountId, recolher: fp?.csllRecolherAccountId, saldoNegativo: fp?.csllSaldoNegativoAccountId };
    const valorSinal = valorProvisao(row);
    const despesa = await this.contaDaProvisao(s, ids.despesa, `despesa de ${row.tributo}`);
    // Fase B item 16 (F-TB-3 a): ajuste anual abaixo do que os meses provisionaram ⇒ D saldo negativo a compensar
    // (Asset, P-B8) / C despesa. A guarda de circularidade do item 6 exclui a conta de despesa: o LAIR não muda.
    const outra =
      valorSinal > 0n
        ? await this.contaDaProvisao(s, ids.recolher, `${row.tributo} a recolher`)
        : await this.contaDaProvisao(s, ids.saldoNegativo, `saldo negativo de ${row.tributo} a compensar`);
    const valor = Number(valorSinal > 0n ? valorSinal : -valorSinal);
    const [debito, credito] = valorSinal > 0n ? [despesa, outra] : [outra, despesa];
    return [
      { accountCode: debito, debitCents: valor, creditCents: 0 },
      { accountCode: credito, debitCents: 0, creditCents: valor },
    ];
  }

  /**
   * BRIEF X8 item 17 (F-X8-4 a, F-PCB-1 b, F-PCB-3 a) — provisão de PIS/COFINS do mês:
   *  - D despesa (`pis|cofinsDespesaAccountId`, Expense) / C a recolher (`pis|cofinsRecolherAccountId`) = débito bruto;
   *  - não cumulativo (`consumoPisCofins`, decisões do dono 06/10): + D a recuperar / C redutora de despesa
   *    (`pisCofinsCreditoOutrosAccountId`) = outros créditos do mês (L-5) e + D a recolher / C a recuperar = crédito
   *    consumido (NF-e + outros + saldo anterior; L-1/L-2/L-4); o crédito não consumido (saldo credor) fica no ativo;
   *  - retenções (nos 2 regimes; dono 06/10, reabre o resto do F-PCB-3 a): + D retido a compensar / C retenções a
   *    conciliar com clientes = retenções do mês e + D a recolher / C retido a compensar = parte abatida.
   * Um lançamento por tributo/mês, até 10 pernas (teto da L-3 ajustado de 6 para 10); linha zerada não entra.
   */
  private async linhasPisCofins(s: AccountingScope, row: TaxAssessment, fp: FiscalProfile | null): Promise<LinhaLancamento[]> {
    const pis = row.tributo === 'PIS';
    const c = consumoPisCofins(row);
    const debito = Number(row.devidoCents);
    const baixa = Number(c.nfe + c.outros + c.saldoAnterior);
    const lines: LinhaLancamento[] = [];
    const recolher = async () => this.contaDaProvisao(s, pis ? fp?.pisRecolherAccountId : fp?.cofinsRecolherAccountId, `${row.tributo} a recolher`);
    const recuperavel = async () => this.contaDaProvisao(s, fp?.pisCofinsRecuperavelAccountId, 'PIS/COFINS a recuperar');
    if (debito > 0) {
      const despesa = await this.contaDaProvisao(s, pis ? fp?.pisDespesaAccountId : fp?.cofinsDespesaAccountId, `despesa de ${row.tributo}`);
      lines.push({ accountCode: despesa, debitCents: debito, creditCents: 0 }, { accountCode: await recolher(), debitCents: 0, creditCents: debito });
    }
    // L-5: reconhecimento dos outros créditos do mês no ativo — C redutora de despesa (Expense), nunca receita.
    if (c.outrosDoMes > 0n) {
      const redutora = await this.contaDaProvisao(s, fp?.pisCofinsCreditoOutrosAccountId, 'créditos de PIS/COFINS sobre despesas (redutora)');
      const v = Number(c.outrosDoMes);
      lines.push({ accountCode: await recuperavel(), debitCents: v, creditCents: 0 }, { accountCode: redutora, debitCents: 0, creditCents: v });
    }
    // L-1/L-2/L-4: baixa do "a recuperar" pelo crédito consumido (NF-e + outros + saldo anterior) — um par só.
    if (baixa > 0) {
      lines.push({ accountCode: await recolher(), debitCents: baixa, creditCents: 0 }, { accountCode: await recuperavel(), debitCents: 0, creditCents: baixa });
    }
    // Retenções (dono 06/10; reabre o resto do F-PCB-3 a): reconhecimento D retido a compensar / C retenções a conciliar
    // com clientes (transitória — o fato gerador, o recebimento líquido, está fora do sistema) e baixa D a recolher / C
    // retido a compensar pela parte abatida. O excedente fica no ativo (compensação fora do sistema, F-TA-9 a).
    const retido = async () => this.contaDaProvisao(s, fp?.pisCofinsRetidoCompensarAccountId, 'PIS/COFINS retido a compensar');
    if (c.retencoesDoMes > 0n) {
      const conciliar = await this.contaDaProvisao(s, fp?.pisCofinsRetencaoConciliarAccountId, 'retenções de PIS/COFINS a conciliar com clientes');
      const v = Number(c.retencoesDoMes);
      lines.push({ accountCode: await retido(), debitCents: v, creditCents: 0 }, { accountCode: conciliar, debitCents: 0, creditCents: v });
    }
    if (c.retencoes > 0n) {
      const v = Number(c.retencoes);
      lines.push({ accountCode: await recolher(), debitCents: v, creditCents: 0 }, { accountCode: await retido(), debitCents: 0, creditCents: v });
    }
    return lines;
  }

  /** F-TA-7 (a): conta ausente ⇒ erro com o motivo (a confirmação fica pendente; o reconcile devolve 400). */
  private async contaDaProvisao(scope: AccountingScope, id: string | null | undefined, rotulo: string): Promise<string> {
    if (!id) throw new ValidationError(`Conta de ${rotulo} não configurada no perfil fiscal da unidade (F-TA-7).`);
    const account = await this.accountRepo.findById(scope, id);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de ${rotulo} '${id}' não existe neste escopo.`);
    return account.code;
  }

  /** Item 17 — lista da PJ no ano (o `unitId` do escopo só resolve policy). */
  async list(scope: AccountingScope, query: TaxAssessmentListQuery): Promise<TaxAssessmentView[]> {
    this.assertRead(scope);
    const rows = await this.repo.findMany(scope.ownerUserId, { anoCalendario: query.anoCalendario, periodo: query.periodo, tributo: query.tributo, status: query.status });
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
    // Fase B item 11: Txx exige a forma TRIMESTRAL e Axx a ANUAL, contra o perfil efetivo do ano.
    const anual = periodo === 'A00' || isLalurMes(periodo);
    if (forma !== (anual ? 'ANUAL' : 'TRIMESTRAL')) {
      throw new ValidationError(`${periodo}/${ano}: o período ${anual ? 'anual' : 'trimestral'} exige a forma ${anual ? 'ANUAL' : 'TRIMESTRAL'} no perfil fiscal da empresa do ano (forma efetiva: ${forma ?? 'nenhuma'}) — X7 BRIEF B item 11.`);
    }

    // A janela que o cálculo LÊ: trimestre; mês (receita bruta); período em curso (balancete); ano (A00).
    const w = !anual
      ? quarterWindows(ano)[ordem(periodo)]
      : input.modoMensal === 'RECEITA_BRUTA'
        ? mesBounds(ano, Number(periodo.slice(1)))
        : periodoBounds(ano, periodo as 'A00' | LalurMes, perfil.inicioAtividadeEm);
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

    const linhasLegais = await this.legalParams.fotografia(['TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA']);
    const tabela = tabelaApuracaoDe(linhasLegais);
    const janela = janelaDoPeriodo(ano, periodo);
    const parametros = parametrosUsados(linhasLegais, janela.de, janela.ate);
    const confirmados = (await this.repo.findConfirmedByYear(scope.ownerUserId, ano)).filter(doIrpjCsll);
    const anterioresRows = confirmados.filter((r) => ordem(r.periodo) < ordem(periodo));
    const anteriores = (t: TributoApuracao): MemoriaAnterior[] =>
      anterioresRows.filter((r) => r.tributo === t).map((r) => ({ periodo: r.periodo as PeriodoTrimestral, memoria: MemoriaCalculoSchema.parse(r.memoria) }));
    const deducoes = input.deducoes;
    const anterioresIds = anterioresRows.map((r) => r.id);

    if (anual) {
      const r = await this.calcularAnual(scope, input, perfil, w, despesaIds, anterioresRows, avisos, tabela);
      return { perfil, forma, ...r, provisaoContasConfiguradas, avisos, anterioresIds, parametros };
    }

    let irpj: ResultadoApuracaoAnual;
    let csll: ResultadoApuracaoAnual;
    if (perfil.regime === 'PRESUMIDO') {
      const rec = await receitaBrutaPorAtividade({ accountRepo: this.accountRepo, postingRepo: this.postingRepo }, scope, w.from, w.to);
      const base = {
        tabela,
        ano,
        periodo,
        receitaServicoCents: BigInt(rec.servicoCents),
        receitaRevendaCents: BigInt(rec.revendaCents),
        perfil,
        deducoes,
      };
      // BE-INCR-TAX-PRESUMIDO-16 (F-P16-2): a diferença postergada do 16% vem da função pura, na coluna que o X9 lê.
      irpj = apurarPresumidoTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'IRPJ', anteriores: anteriores('IRPJ') });
      csll = apurarPresumidoTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'CSLL', anteriores: anteriores('CSLL') });
    } else {
      const contasDespesa = despesaIds.length === 2;
      if (!contasDespesa) avisos.push('guarda de circularidade sem contas configuradas: o resultado inclui eventual despesa de IRPJ/CSLL já lançada (BRIEF X7 item 7).');
      const resultado = BigInt(await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesaIds));
      const parteBFechada = !!(await this.lalurRepo.findClosing(scope, ano, periodo));
      const linhas = async (livro: string) =>
        (await this.lalurRepo.findManyEntries(scope, { year: ano, quarter: periodo, livro, includeArchived: false })).map((l) => ({ codigo: l.codigo, valorCents: l.valorCents }));
      const base = { tabela, ano, periodo, resultadoAntesCents: resultado, contasProvisaoConfiguradas: contasDespesa, parteBFechada, perfil, deducoes };
      irpj = { ...apurarRealTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'IRPJ', linhasParteA: await linhas('lalur') }), diferencaPostergadaCents: 0n };
      csll = { ...apurarRealTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'CSLL', linhasParteA: await linhas('lacs') }), diferencaPostergadaCents: 0n };
    }
    return { perfil, forma, irpj, csll, provisaoContasConfiguradas, avisos, anterioresIds, parametros };
  }

  /**
   * Fase B (itens 5–10): lê razão, e-Lalur e os meses confirmados e chama as funções puras do PR-1. IRPJ e CSLL saem do
   * MESMO ramo — o modo do mês é um só (art. 31 § 7º; art. 47 § 1º; invariante 9 do ADR).
   */
  private async calcularAnual(
    scope: AccountingScope,
    input: TaxAssessmentPreviewInput,
    perfil: CompanyFiscalProfile,
    w: { from: Date; to: Date },
    despesaIds: string[],
    anterioresRows: TaxAssessment[],
    avisos: string[],
    tabela: TabelaApuracao,
  ): Promise<{ irpj: ResultadoApuracaoAnual; csll: ResultadoApuracaoAnual }> {
    const { anoCalendario: ano, periodo, deducoes } = input;
    const meses = (t: TributoApuracao): MesConfirmado[] => anterioresRows.filter((r) => r.tributo === t && isLalurMes(r.periodo)).map(toMesConfirmado);
    const contasDespesa = despesaIds.length === 2;
    const realDoPeriodo = async () => {
      if (!contasDespesa) avisos.push('guarda de circularidade sem contas configuradas: o resultado inclui eventual despesa de IRPJ/CSLL já lançada (BRIEF X7 item 7).');
      const resultado = BigInt(await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesaIds));
      const linhas = async (livro: string) =>
        (await this.lalurRepo.findManyEntries(scope, { year: ano, quarter: periodo, livro, includeArchived: false })).map((l) => ({ codigo: l.codigo, valorCents: l.valorCents }));
      return { resultadoAntesCents: resultado, contasProvisaoConfiguradas: contasDespesa, linhasIrpj: await linhas('lalur'), linhasCsll: await linhas('lacs') };
    };

    if (periodo === 'A00') {
      const r = await realDoPeriodo();
      const parteBFechada = !!(await this.lalurRepo.findClosing(scope, ano, 'A00'));
      const base = { tabela, ano, resultadoAntesCents: r.resultadoAntesCents, contasProvisaoConfiguradas: r.contasProvisaoConfiguradas, parteBFechada, perfil, deducoes, estimativasPagas: input.estimativasPagas };
      const irpj = apurarAjusteAnual({ ...base, tributo: 'IRPJ', linhasParteA: r.linhasIrpj, meses: meses('IRPJ') });
      const csll = apurarAjusteAnual({ ...base, tributo: 'CSLL', linhasParteA: r.linhasCsll, meses: meses('CSLL') });
      const fp = await this.fiscalProfileRepo.findByScope(scope);
      for (const [t, res, conta] of [['IRPJ', irpj, fp?.irpjSaldoNegativoAccountId], ['CSLL', csll, fp?.csllSaldoNegativoAccountId]] as const) {
        if (!conta && valorLinha(res.memoria, PROVISAO_AJUSTE_ANUAL, periodo) < 0n) {
          avisos.push(`${t}: ajuste abaixo do provisionado nos meses e conta de saldo negativo a compensar não configurada — a provisão ficará pendente (BRIEF X7 B item 16).`);
        }
      }
      return { irpj, csll };
    }

    const mes = periodo as LalurMes;
    const m = Number(mes.slice(1));
    // Item 9 (e decisão 1 do PR-3): só o IRPJ do prestador exclusivo lê a receita dos meses anteriores do ano.
    const receitaDoMes = async (k: number): Promise<ReceitaMes> => {
      const b = mesBounds(ano, k);
      const rec = await receitaBrutaPorAtividade({ accountRepo: this.accountRepo, postingRepo: this.postingRepo }, scope, b.from, b.to);
      return { periodo: nomeMes(k), servicoCents: BigInt(rec.servicoCents), revendaCents: BigInt(rec.revendaCents) };
    };
    const receitasAnteriores = async (): Promise<ReceitaMes[]> => {
      if (!perfil.prestadoraExclusivaServicos) return [];
      const ks = mesesEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm).filter((k) => k < m);
      return Promise.all(ks.map(receitaDoMes));
    };

    if (input.modoMensal === 'RECEITA_BRUTA') {
      const rec = await receitaDoMes(m);
      const anteriores = await receitasAnteriores();
      const base = { tabela, ano, periodo: mes, receitaServicoCents: rec.servicoCents, receitaRevendaCents: rec.revendaCents, receitasMesesAnteriores: anteriores, perfil, deducoes };
      return {
        irpj: apurarEstimativaReceitaBruta({ ...base, tributo: 'IRPJ', confirmados: meses('IRPJ') }),
        csll: apurarEstimativaReceitaBruta({ ...base, tributo: 'CSLL', confirmados: meses('CSLL') }),
      };
    }

    // BALANCETE — o gate dos meses fechados é da confirmação (item 15); a prévia só avisa.
    const abertos = await this.mesesAbertosAntes(scope, ano, mes, perfil);
    if (abertos.length > 0) avisos.push(`balancete de ${mes}/${ano}: meses ainda abertos (${abertos.join(', ')}) — a confirmação exige-os fechados (BRIEF X7 B item 15).`);
    const r = await realDoPeriodo();
    const receita = perfil.prestadoraExclusivaServicos ? { receitaMes: await receitaDoMes(m), receitasMesesAnteriores: await receitasAnteriores() } : {};
    const base = { tabela, ano, periodo: mes, resultadoAntesCents: r.resultadoAntesCents, contasProvisaoConfiguradas: r.contasProvisaoConfiguradas, perfil, deducoes };
    return {
      irpj: apurarBalancete({ ...base, tributo: 'IRPJ', linhasParteA: r.linhasIrpj, anteriores: meses('IRPJ'), ...receita }),
      csll: apurarBalancete({ ...base, tributo: 'CSLL', linhasParteA: r.linhasCsll, anteriores: meses('CSLL') }),
    };
  }

  /** Item 15: meses 01..m−1 em atividade da unidade lida que não estão `SOFT_CLOSED`/`HARD_CLOSED` (não semeado = aberto). */
  private async mesesAbertosAntes(
    scope: AccountingScope,
    ano: number,
    periodo: LalurMes,
    perfil: Pick<CompanyFiscalProfile, 'inicioAtividadeEm' | 'encerramentoAtividadeEm'>,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const m = Number(periodo.slice(1));
    const ks = mesesEmAtividade(ano, perfil.inicioAtividadeEm, perfil.encerramentoAtividadeEm).filter((k) => k < m);
    const abertos: string[] = [];
    for (const k of ks) {
      const p = await this.periodRepo.findByYearMonth(scope, ano, k, tx);
      if (!p || !FECHADO.has(p.status)) abertos.push(nomeMes(k));
    }
    return abertos;
  }

  private assertRead(scope: AccountingScope): void {
    if (!this.policy.canReadTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para ler a apuração de IRPJ/CSLL.');
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageTaxAssessment(scope)) throw new ForbiddenError('Você não tem permissão para confirmar a apuração de IRPJ/CSLL.');
  }
}

const nomeMes = (k: number): LalurMes => `A${String(k).padStart(2, '0')}` as LalurMes;

/** O período que precisa estar confirmado antes (F-TA-3 a; item 13): T(q−1), A0(m−1); nenhum no 1º e no A00. */
function periodoAnterior(periodo: string): string | null {
  if (periodo === 'A00') return null;
  if (isLalurMes(periodo)) return periodo === 'A01' ? null : nomeMes(Number(periodo.slice(1)) - 1);
  const q = PERIODOS_TRIMESTRAIS.indexOf(periodo as PeriodoTrimestral);
  return q > 0 ? PERIODOS_TRIMESTRAIS[q - 1] : null;
}

function toMesConfirmado(r: TaxAssessment): MesConfirmado {
  return {
    id: r.id,
    periodo: r.periodo as LalurMes,
    tributo: r.tributo as TributoApuracao,
    modo: r.modo as ModoMensal,
    devidoCents: r.devidoCents,
    deducoesCents: r.deducoesCents,
    aPagarCents: r.aPagarCents,
    diferencaPostergadaCents: r.diferencaPostergadaCents,
    memoria: MemoriaCalculoSchema.parse(r.memoria),
  };
}

function mesmoConjunto(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function toPreviewLinha(r: ResultadoApuracaoAnual, periodo: string): TaxAssessmentPreviewLinha {
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
    diferencaPostergadaCents: r.diferencaPostergadaCents.toString(),
    tabelaVersao: r.tabelaVersao,
    memoria: r.memoria,
  };
}

/** Exportada para o `PisCofinsAssessmentService` (X8 PR-2): a mesma vista serve as linhas de PIS/COFINS. */
export function toView(row: TaxAssessment): TaxAssessmentView {
  return {
    id: row.id,
    tributo: row.tributo as TaxAssessmentView['tributo'],
    periodo: row.periodo,
    modo: row.modo,
    codigoReceita: row.codigoReceita,
    baseCents: row.baseCents.toString(),
    devidoCents: row.devidoCents.toString(),
    deducoesCents: row.deducoesCents.toString(),
    aPagarCents: row.aPagarCents.toString(),
    saldoNegativoCents: row.saldoNegativoCents.toString(),
    diferencaPostergadaCents: row.diferencaPostergadaCents.toString(),
    status: row.status as 'CONFIRMED' | 'SUPERSEDED',
    supersedesId: row.supersedesId,
    provisaoPendente: provisaoPendente(row),
    tabelaVersao: row.tabelaVersao,
    parametrosSha256: row.parametrosSha256,
    avisoParametroLegal: row.avisoParametroLegal,
    memoria: MemoriaCalculoSchema.parse(row.memoria),
    confirmedAt: row.confirmedAt.toISOString(),
  };
}
