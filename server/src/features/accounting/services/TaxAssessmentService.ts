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
 *   commit 2 — subrazão: CAS provisaoEntryId `where null` (BRIEF item 15, "commit 3"), sem tx de razão
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (commit 2 — CAS): crash entre o postEntry e o CAS ⇒ pendente; reconcile reaproveita o lançamento (sem 2º)"
 *   reconcile — POST /tax-assessments/:id/provisao completa o que faltar; nada já feito é refeito (sem gate de período)
 *              teste: taxAssessmentProvision.integration.test.ts › "item 16 + ADR §13 item 11: reconcile completa e é idempotente — 2ª chamada sem lançamento novo, mesmo provisaoEntryId"
 *   fora da tx — a confirmação (BRIEF item 14, "commit 1") commita ANTES, em runTransaction próprio; falha da provisão não a desfaz
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (commit 1 — razão): período fechado ⇒ a confirmação fica, provisão pendente, nenhum lançamento"
 *              teste: taxAssessmentProvision.integration.test.ts › "item 15 (cascata × estorno falho): reconfirmar o posterior estorna a provisão órfã antes de postar — nunca 2 vivas"
 */
import type { CompanyFiscalProfile, Prisma, TaxAssessment } from 'generated/prisma';
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

/**
 * Decisão do dono 04/10 (lacuna L-C do PR-3 da Fase A), generalizada na Fase B: pendente ⇔ CONFIRMED ∧ valor da provisão
 * ≠ 0 ∧ sem lançamento. Valor 0 (suspensão do balancete, ajuste igual aos meses) não tem o que provisionar (o `postEntry`
 * recusa lançamento zerado) e não bloqueia o encerramento.
 */
export function provisaoPendente(row: LinhaProvisao & Pick<TaxAssessment, 'status' | 'provisaoEntryId'>): boolean {
  return row.status === 'CONFIRMED' && row.provisaoEntryId === null && valorProvisao(row) !== 0n;
}

/**
 * Ordem dos períodos no ano (F-TA-3 a; Fase B item 13): `T01..T04` ou `A01..A12` e, por último, o `A00` — o ajuste
 * depende de todos os meses, e substituir um mês derruba também o `A00` (cascata).
 */
const ordem = (p: string): number => (p === 'A00' ? 13 : isLalurMes(p) ? Number(p.slice(1)) : PERIODOS_TRIMESTRAIS.indexOf(p as PeriodoTrimestral));

/** Data da provisão e do estorno (itens 15/16): fim do trimestre, do mês `A0m`, ou 31/12 no `A00`. */
export function fimDoPeriodo(ano: number, periodo: string): string {
  if (periodo === 'A00') return `${ano}-12-31`;
  if (isLalurMes(periodo)) return fimDoMes(ano, Number(periodo.slice(1)));
  return fimDoTrimestre(ano, periodo as PeriodoTrimestral);
}

/** Item 15 (F-TB-4 b): mês fechado = `SOFT_CLOSED` ou `HARD_CLOSED`; não semeado conta como aberto (`monthsCovered`). */
const FECHADO = new Set(['SOFT_CLOSED', 'HARD_CLOSED']);
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
  /** Fase B item 17 (F-TB-5 b): só no IRPJ do mês do excesso do 16%. */
  diferencaPostergadaCents: string;
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
  irpj: ResultadoApuracaoAnual;
  csll: ResultadoApuracaoAnual;
  provisaoContasConfiguradas: boolean;
  avisos: string[];
  /** Ids das memórias CONFIRMED anteriores que o cálculo leu (F-TA-3 a) — re-checados dentro da tx. */
  anterioresIds: string[];
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

    const r = await this.repo.runTransaction(async (tx) => {
      const perfilTx = await this.companyProfileRepo.findByYear(scope, ano, tx);
      if (!perfilTx || perfilTx.updatedAt.getTime() !== c.perfil.updatedAt.getTime()) {
        throw new ConflictError(`o perfil fiscal da empresa de ${ano} mudou durante a confirmação — refaça a prévia.`, 'TAX_ASSESSMENT_STALE');
      }
      const confirmados = await this.repo.findConfirmedByYear(owner, ano, tx);
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

    // Item 15 — commits 2/3 do BRIEF, best-effort DEPOIS do commit 1: falha ⇒ a confirmação fica, motivo no log.
    // Primeiro estorna as provisões de TUDO que caiu (substituídas + posteriores da cascata), depois provisiona as novas.
    for (const s of r.cair) await this.bestEffort(s.id, () => this.estornarProvisaoViva(scope, s));
    const irpj = await this.bestEffort(r.gravadas.IRPJ.id, () => this.provisionar(scope, r.gravadas.IRPJ));
    const csll = await this.bestEffort(r.gravadas.CSLL.id, () => this.provisionar(scope, r.gravadas.CSLL));
    return { irpj: toView(irpj ?? r.gravadas.IRPJ), csll: toView(csll ?? r.gravadas.CSLL), reconfirmar: r.reconfirmar };
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
      entry = await this.postingService.postEntry(s, {
        unitId: s.unitId,
        date: fimDoPeriodo(row.anoCalendario, row.periodo),
        description: `Provisão de ${row.tributo}${row.periodo === 'A00' ? ' (ajuste anual)' : ''} — ${row.periodo}/${row.anoCalendario} (apuração ${row.id})`,
        sourceType: TAX_ASSESSMENT_PROVISION_SOURCE_TYPE,
        sourceId: row.id,
        lines: [
          { accountCode: debito, debitCents: valor, creditCents: 0 },
          { accountCode: credito, debitCents: 0, creditCents: valor },
        ],
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

    const confirmados = await this.repo.findConfirmedByYear(scope.ownerUserId, ano);
    const anterioresRows = confirmados.filter((r) => ordem(r.periodo) < ordem(periodo));
    const anteriores = (t: TributoApuracao): MemoriaAnterior[] =>
      anterioresRows.filter((r) => r.tributo === t).map((r) => ({ periodo: r.periodo as PeriodoTrimestral, memoria: MemoriaCalculoSchema.parse(r.memoria) }));
    const deducoes = input.deducoes;
    const anterioresIds = anterioresRows.map((r) => r.id);

    if (anual) {
      const r = await this.calcularAnual(scope, input, perfil, w, despesaIds, anterioresRows, avisos);
      return { perfil, forma, ...r, provisaoContasConfiguradas, avisos, anterioresIds };
    }

    let irpj: ResultadoApuracaoAnual;
    let csll: ResultadoApuracaoAnual;
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
      irpj = { ...apurarPresumidoTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'IRPJ', anteriores: anteriores('IRPJ') }), diferencaPostergadaCents: 0n };
      csll = { ...apurarPresumidoTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'CSLL', anteriores: anteriores('CSLL') }), diferencaPostergadaCents: 0n };
    } else {
      const contasDespesa = despesaIds.length === 2;
      if (!contasDespesa) avisos.push('guarda de circularidade sem contas configuradas: o resultado inclui eventual despesa de IRPJ/CSLL já lançada (BRIEF X7 item 7).');
      const resultado = BigInt(await this.reportService.resultadoAntesIrpjCsll(scope, w.from, w.to, despesaIds));
      const parteBFechada = !!(await this.lalurRepo.findClosing(scope, ano, periodo));
      const linhas = async (livro: string) =>
        (await this.lalurRepo.findManyEntries(scope, { year: ano, quarter: periodo, livro, includeArchived: false })).map((l) => ({ codigo: l.codigo, valorCents: l.valorCents }));
      const base = { ano, periodo, resultadoAntesCents: resultado, contasProvisaoConfiguradas: contasDespesa, parteBFechada, perfil, deducoes };
      irpj = { ...apurarRealTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'IRPJ', linhasParteA: await linhas('lalur') }), diferencaPostergadaCents: 0n };
      csll = { ...apurarRealTrimestral({ ...base, periodo: periodo as PeriodoTrimestral, tributo: 'CSLL', linhasParteA: await linhas('lacs') }), diferencaPostergadaCents: 0n };
    }
    return { perfil, forma, irpj, csll, provisaoContasConfiguradas, avisos, anterioresIds };
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
      const base = { ano, resultadoAntesCents: r.resultadoAntesCents, contasProvisaoConfiguradas: r.contasProvisaoConfiguradas, parteBFechada, perfil, deducoes, estimativasPagas: input.estimativasPagas };
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
      const base = { ano, periodo: mes, receitaServicoCents: rec.servicoCents, receitaRevendaCents: rec.revendaCents, receitasMesesAnteriores: anteriores, perfil, deducoes };
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
    const base = { ano, periodo: mes, resultadoAntesCents: r.resultadoAntesCents, contasProvisaoConfiguradas: r.contasProvisaoConfiguradas, perfil, deducoes };
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
    diferencaPostergadaCents: row.diferencaPostergadaCents.toString(),
    status: row.status as 'CONFIRMED' | 'SUPERSEDED',
    supersedesId: row.supersedesId,
    provisaoPendente: provisaoPendente(row),
    tabelaVersao: row.tabelaVersao,
    memoria: MemoriaCalculoSchema.parse(row.memoria),
    confirmedAt: row.confirmedAt.toISOString(),
  };
}
