/**
 * PayableService — contas a pagar (AP). FIRST-CLASS PRISMA.
 *
 * atomicUntil: postEntry
 *   commit 1 — razão: postEntry(sourceType='ap.payable', sourceId=payableId) no reconhecimento; postEntry(sourceType='ap.payment', sourceId=paymentId) na baixa; gate de período dentro da tx
 *              teste: PayableService.test.ts › "books D expenseAccount / C 2.1.2 keyed sourceType=ap.payable, sourceId=payableId"
 *              teste: PayableService.test.ts › "books D 2.1.2 / C method-account keyed sourceType=ap.payment, sourceId=paymentId (NOT payableId)"
 *   commit 2 — subrazão: CAS OPEN → PAYING (claimForPayment) ANTES do post; finalize PAYING → PAID/PARTIALLY_PAID + settlementEntryId, runTransaction próprio
 *              teste: PayableService.test.ts › "TOCTOU: two parallel payments → exactly one succeeds (claimForPayment CAS)"
 *              teste: PayableService.test.ts › "does NOT revert the claim after a successful post (never revert over a booked ledger)"
 *   reconcile — reconcilePayables(): read-first, reposta só o que falta e finaliza PAYING preso
 *              teste: PayableService.test.ts › "re-posts a missing settlement AND finalizes a PAYING payable"
 *              teste: PayableService.test.ts › "does NOT re-post when the recognition already exists (idempotent)"
 *   fora da tx — entrada de estoque (receiveStock; falha não compensa, o reconcile re-dirige) e rascunho de imobilizado (modo 4)
 *              teste: PayableService.test.ts › "does NOT compensate the recognition when the INBOUND fails (reconcile re-drives)"
 *   estorno — cancelPayment: reverseEntry (commit 1, idempotente) e DEPOIS a tx do subrazão (commit 2). Crash entre os dois = razão estornado +
 *              pagamento ACTIVE/título PAID: reconcilePayables() re-dirige a direção REVERSA (lê o lançamento Reversed, estorna a CSRF da parcela se
 *              houver e conclui a tx do subrazão; nunca finaliza como pago o pagamento cujo lançamento já está estornado)
 *              teste: SubledgerReversalAtomicity.integration.test.ts › "razão estornado + pagamento ACTIVE → reconcilePayables conclui o estorno (CANCELLED, título reaberto, 1 auditoria, sem 2º estorno)"
 *              teste: SubledgerReversalAtomicity.integration.test.ts › "o estorno já está no razão e o período FECHOU → repetir cancelPayment conclui"
 *   CANCELLING (BE-INCR-CANCELAMENTO-CANCELLING PR-0, 69c7) — cancelPayable NÃO tem mais um commit 1 sem marca: o CAS de intenção
 *              OPEN|PARTIALLY_PAID|PAID → CANCELLING (subrazão, tx própria, + audit payable.cancel_requested) é gravado ANTES de qualquer
 *              efeito; depois estoque (replay-seguro), reverseEntry da retenção e do reconhecimento (commit 1, razão, idempotente) e por fim
 *              CANCELLING → CANCELLED numa tx (commit 2). Falha depois da intenção NÃO compensa: o título fica CANCELLING, o AppError original
 *              sobe e o reconcile (passo 1b) ou uma nova chamada retomam, repetindo só o idempotente.
 *              teste: PayableService.cancelling.integration.test.ts › "crash depois do estoque: o título fica CANCELLING e o 2º cancelPayable conclui sem 2º decremento, sem 2º estorno e com 1 payable.cancelled"
 *              teste: PayableService.cancelling.integration.test.ts › "reconcile passo 1b: razão já estornado + período fechado ⇒ conclui (replay antes do gate)"
 *              teste: PayableService.cancelling.integration.test.ts › "reconcile 2x: a 2ª passada não repete nada"
 *   RETENCOES-FONTE PR-2 (F-RET-10 a) — a retenção feita é baixa SEM caixa (kind WITHHOLDING) gravada na tx1 do título (ou na
 *              tx da baixa, para a CSRF) com a TaxWithholding e o título de imposto; o razão vem depois, em postEntry próprio
 *              (sourceType='ap.withholding', sourceId=paymentId): D 2.1.2 / C conta a recolher. Falha do post ⇒ o reconcile refaz.
 *              teste: retencoesFontePr2.integration.test.ts › "item 15: R$ 1.000 a PJ Presumido ⇒ IRRF R$ 15,00, paidCents 1500, razão balanceado"
 *              teste: retencoesFontePr2.integration.test.ts › "item 21: reconcile refaz o lançamento WITHHOLDING que faltou, idempotente"
 */
import { AppError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { Prisma } from 'generated/prisma';
import type { Account, Payable, PayablePayment, TaxWithholding } from 'generated/prisma';
import { ESTOQUES_CODE, FORNECEDORES_A_PAGAR_CODE } from '../fixtures/ChartOfAccountsFixture';
import { aggregateInventoryItems, INVENTORY_INBOUND_SOURCE_TYPE } from '../models/Inventory.model';
import { centsFromDb } from '../models/money';
import { scopeToday } from '../models/dates';
import {
  AP_PAYABLE_SOURCE_TYPE,
  AP_PAYMENT_SOURCE_TYPE,
  AP_WITHHOLDING_SOURCE_TYPE,
  PAYABLE_ORIGIN_WITHHOLDING_TAX,
  WITHHOLDING_KIND,
  deletedDocumentNumber,
  hasSingleInventorySku,
  isInventoryPurchase,
  PAYABLE_CANCEL_PENDING_SOURCE_TYPE,
  PAYABLE_SETTLEABLE_STATUSES,
  PAYABLE_TRANSITIONS,
  payableStatusForBalance,
  PAYMENT_CANCEL_PENDING_SOURCE_TYPE,
  PAYMENT_REVERSAL_INVARIANT_CODE,
  TITULO_EM_CANCELAMENTO_CODE,
  TITULO_MUDOU_DURANTE_O_CANCELAMENTO_CODE,
  resolvePaymentMethodAccount,
  type PayableStatus,
} from '../models/Payable.model';
import { assertTransition } from '../../../lib/lifecycle';
import type {
  ApropriarCreditoInput,
  CancelPayableInput,
  CancelPaymentInput,
  CreatePayableInput,
  ListPayablesQueryInput,
  RegisterPaymentInput,
} from '../dtos/PayableDto';
import { isIbsCbsCreditLine } from '../dtos/PayableDto';
import type { IPayableRepository, PayableWithPayments } from '../repositories/IPayableRepository';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IFixedAssetClassRepository } from '../repositories/IFixedAssetClassRepository';
import type { ITaxaDepreciacaoCatalogo } from './ITaxaDepreciacaoCatalogo';
import { resolveRateForNcm, taxaEscolhidaDe } from '../models/FixedAsset.model';
import type { ICounterpartyRepository } from '../repositories/ICounterpartyRepository';
import type { ISourceProvenanceRepository } from '../repositories/ISourceProvenanceRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { PostEntryInput } from '../dtos/PostingDto';
import { syncSkipErrorCode } from '../sync/AccountingSyncPort';
import type { ReconcilePendingReasonCodeValue } from '../dtos/ReconcilePendingDto';
import type { PendingAlertMode, ReconcilePendingRecorder } from './reconcilePendingRecorder';
import type { AuditService } from './AuditService';
import type { PostingService } from './PostingService';
import type { IInventoryService } from './IInventoryService';
import type { IProductRefLookup } from './ProductRefLookup';
import type { IPhysicalStockSync } from './PhysicalStockSync';
import {
  isExpensedFixedAssetItem,
  type IFixedAssetDraftCreator,
  type IFixedAssetDraftRedriver,
  type ResolvedExpensedFixedAssetItem,
  type ResolvedFixedAssetItem,
  type StoredFixedAssetItem,
} from './IFixedAssetDraftCreator';
import { FIXED_ASSET_EXPENSE_LIMIT_CENTS, expenseAllowed, unitCostCentsOf } from '../models/fixedAssetLimits';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { resolveOrCreateCounterpartyId } from './counterpartyResolution';
import type { BaixaRetencao, WithholdingService } from './WithholdingService';
import type { TributoRetencao as TaxWithholdingTributo } from '../models/retencaoParams';
import type { ITaxWithholdingRepository } from '../repositories/ITaxWithholdingRepository';

/**
 * PayableService — Contas a Pagar (INCR-AP / ADR-INCR-AP). FIRST-CLASS PRISMA.
 *
 * Books the DUAL fato gerador directly through PostingService.postEntry (F0 rota (a), golden ref
 * ExerciseClosingService — AP is a module INTERNAL to the accounting world, not a DynamicTable
 * origin, so there is NO AccountingSyncPort/mapper/bridge):
 *   - recognition (competência): D expenseAccount (4.x) / C 2.1.2 — sourceType='ap.payable', sourceId=payableId
 *   - settlement (data efetiva):  D 2.1.2 / C conta-por-método — sourceType='ap.payment', sourceId=paymentId
 *
 * Key invariants:
 * - postEntry opens its OWN root tx (SQLite has no nesting), so the AP-row write and the ledger
 *   write are DIFFERENT transactions. The double-payment race is closed BEFORE the post by an
 *   atomic OPEN→PAYING status CAS (claimForPayment, D4); a crash between the two txs converges via
 *   reconcilePayables (the re-drive safety net — mandatory, ADR §6.2, since with rota (a) this
 *   reconcile is our own code, not the generic AccountingSync registry).
 * - settlement idempotency keys on paymentId, NEVER payableId (D3) — re-paying after a reversal
 *   mints a new key instead of returning the reverted entry (T7).
 * - cancel = estorno (reverseEntry) in an open period + row lifecycle flip (ACC-018/T5), never a
 *   destructive edit; rename-on-delete frees the business key (D3).
 */
/** Linha de `Payable.recoverableTaxLines` (JSON). X8 item 5: a PIS_COFINS carrega base e parcelas quando a nota as tem. */
type RecoverableLineRow = {
  accountId: string;
  accountCode: string;
  amountCents: number;
  kind: string;
  baseCents?: number;
  pisCents?: number;
  cofinsCents?: number;
};

/**
 * IBS-CBS-2027 PR-3 (itens 14 e 16): linha de crédito de IBS/CBS — mesma coluna JSON, discriminada por `tributo` (união; o
 * formato X6 acima não muda). `apropriadoEm` = dia escrito em que o crédito virou `APROPRIADO` (a apuração do mês o soma).
 */
export type IbsCbsCreditRow = {
  tributo: 'IBS' | 'CBS';
  accountId: string | null;
  accountCode: string | null;
  amountCents: number;
  status: 'PENDENTE' | 'APROPRIADO';
  sourceDocumentId: string | null;
  apropriadoEm?: string;
  usoConsumoCents?: number;
};

type StoredRecoverableLine = RecoverableLineRow | IbsCbsCreditRow;
const isIbsCbsRow = (l: StoredRecoverableLine): l is IbsCbsCreditRow => 'tributo' in l;

export const PAYABLE_IBS_CBS_CREDIT_APPROPRIATED = 'payable.ibs_cbs_credit.appropriated';

/** Read shape of a title with its balance (BRIEF §2): `remainingCents` is DERIVED, never persisted twice. */
export type PayableWithBalance = PayableWithPayments & { remainingCents: bigint };

function withBalance(payable: PayableWithPayments): PayableWithBalance {
  return { ...payable, remainingCents: payable.amountCents - payable.paidCents };
}

/**
 * SM F-01.2 — o recálculo de status (escrita não condicional) passa pela tabela `PAYABLE_TRANSITIONS`: par ilegal ⇒ 400.
 * X → X (estorno de uma de duas baixas num PARTIALLY_PAID) segue gravado como hoje: a tabela não o lista (lifecycle.ts).
 */
function assertPayableRecalc(from: string, to: PayableStatus): void {
  if (from !== to) assertTransition(PAYABLE_TRANSITIONS, from as PayableStatus, to, 'Conta a pagar');
}

/** Lançamento já estornado no razão (commit 1 de um cancelamento feito). `findBySource` devolve também os `Reversed`. */
function isReversedEntry(entry: { status: string; reversedById: string | null }): boolean {
  return entry.status === 'Reversed' || entry.reversedById != null;
}

/** Motivo gravado quando é o reconcile (não um DTO) quem conclui o estorno que o razão já tem. */
const RECONCILE_REVERSAL_REASON = 'Reconciliação: estorno já lançado no razão, subrazão concluído';

/**
 * Códigos que o reconcile do AP conta como BLOCKED (determinísticos, sem o que retentar) além da lista das pontes
 * (`syncSkipErrorCode`): o invariante do subrazão violado com o razão já estornado, e o imposto da CSRF já recolhido.
 */
const RECONCILE_BLOCKED_CODES: readonly string[] = [PAYMENT_REVERSAL_INVARIANT_CODE, 'IMPOSTO_JA_RECOLHIDO'];
function reconcileBlockedCode(error: unknown): string | null {
  const bridge = syncSkipErrorCode(error);
  if (bridge) return bridge;
  return error instanceof AppError && RECONCILE_BLOCKED_CODES.includes(error.errorCode) ? error.errorCode : null;
}

export class PayableService implements IFixedAssetDraftRedriver {
  // BE-INCR-FIXED-ASSETS PR-5 (setter injection — quebra o ciclo de construção
  // PayableService → FixedAssetService → DepreciationService → [redriver] → PayableService; ver
  // IFixedAssetDraftCreator.ts). `undefined` até o factory wirar: createPayable degrada para
  // best-effort logado (reconcile relê depois), redriveFixedAssetDrafts devolve 0.
  private fixedAssetDraftCreator?: IFixedAssetDraftCreator;

  setFixedAssetDraftCreator(creator: IFixedAssetDraftCreator): void {
    this.fixedAssetDraftCreator = creator;
  }

  // BE-INCR-RETENCOES-FONTE PR-2 (setter injection, mesmo motivo do draft creator: o WithholdingService nasce depois na
  // factory). `undefined` = sem retenção (o título segue como antes; sobrescrita informada ⇒ 400, nunca ignorada).
  private withholding?: { service: WithholdingService; repo: ITaxWithholdingRepository };

  setWithholding(service: WithholdingService, repo: ITaxWithholdingRepository): void {
    this.withholding = { service, repo };
  }

  constructor(
    private readonly payableRepo: IPayableRepository,
    private readonly accountRepo: IAccountRepository,
    private readonly posting: PostingService,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly counterpartyRepo: ICounterpartyRepository,
    // OPTIONAL (INCR-INVENTORY D3(b) / Body 3): the AP→estoque bridge injects the inventory subledger.
    // Kept optional so the Fase B factory wiring is a separate step — the factory compiles with this
    // arg absent. Inventory-purchase paths assert its presence and fail loud when it is missing.
    private readonly inventoryService?: IInventoryService,
    // OPTIONAL (LAC-E F-E2): existence gate for `inventoryProductRef` against the tenant's DT
    // `products` catalog. Optional for the same wiring reason as inventoryService; inventory-purchase
    // paths fail loud when absent — a silent skip would recreate the orphan-cost-layer class.
    private readonly productRefLookup?: IProductRefLookup,
    // OPTIONAL (BE-INCR-PURCHASE-PHYSICAL-SYNC / F-D2=(b)): espelha a compra no estoque FÍSICO
    // (DT stockMovements→productUnits). Best-effort como o receiveStock — a passada de reconcile
    // re-dirige o que faltar; wiring ausente degrada com warn (o físico é derivado, não verdade).
    private readonly physicalStockSync?: IPhysicalStockSync,
    // OPTIONAL (BE-INCR-FIXED-ASSETS PR-5 / F-FA12 → a): modo 4 (fixedAssetItems) resolve
    // `class.costAccountId` por item para debitar 1.2.x — NUNCA estoque. Optional pela mesma razão de
    // wiring do inventoryService; um payable com fixedAssetItems e este repo ausente falha loud.
    private readonly fixedAssetClassRepo?: IFixedAssetClassRepository,
    // OPTIONAL (review #366, achado 1): catálogo de taxas VIVAS para `resolveRateForNcm` — a
    // validação por NCM roda ANTES do tx1 (ver `resolveFixedAssetLines`), nunca só no rascunho.
    private readonly depreciationRateCatalog?: ITaxaDepreciacaoCatalogo, // PR-3: Anexo de plataforma + CUSTOM
    // OPTIONAL (BE-INCR-FIXED-ASSETS PR-5, item 22/28): lê o `SourceDocument.rawJson` da
    // recognition para o re-drive de rascunho relê-la (`redriveFixedAssetDrafts`) — nunca uma 2ª
    // cópia do breakdown na linha do Payable (decisão do dono 23/09).
    private readonly sourceProvenanceRepo?: ISourceProvenanceRepository,
    // OPTIONAL (BE-INCR-CANCELAMENTO-CANCELLING PR-0, item 0.9): grava o BLOCKED/pendência do cancelamento na bandeja do reconcile e alerta
    // na 1ª captura. Ausente = comportamento anterior (só log) — o factory o liga; testes de unidade que não o exercitam não precisam dele.
    private readonly pendingRecorder?: ReconcilePendingRecorder,
  ) {}

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async listPayables(
    scope: AccountingScope,
    params: ListPayablesQueryInput,
  ): Promise<{ payables: PayableWithBalance[]; total: number }> {
    if (!this.policy.canReadPayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar contas a pagar.');
    }
    const skip = (params.page - 1) * params.limit;
    // BE-INCR-SUBLEDGER-FILTERS §2: todo filtro declarado no DTO é repassado ao repo. Param aceito
    // no DTO e não repassado aqui devolveria uma lista "filtrada" que não filtrou.
    const { payables, total } = await this.payableRepo.findManyByUnit(scope, {
      status: params.status,
      counterpartyId: params.counterpartyId,
      dueFrom: params.dueFrom,
      dueTo: params.dueTo,
      q: params.q,
      overdue: params.overdue,
      skip,
      limit: params.limit,
    });
    return { payables: payables.map(withBalance), total };
  }

  async getPayable(scope: AccountingScope, id: string): Promise<PayableWithBalance> {
    if (!this.policy.canReadPayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler contas a pagar.');
    }
    const payable = await this.payableRepo.findByIdWithPayments(scope, id);
    if (!payable) throw new NotFoundError(`Conta a pagar '${id}' não foi encontrada.`);
    return withBalance(payable);
  }

  // ---------------------------------------------------------------------------
  // Create (recognition)
  // ---------------------------------------------------------------------------

  /**
   * Create a payable and book its recognition entry (D expenseAccount / C 2.1.2). The row and
   * the recognition posting live in DIFFERENT txs; on a synchronous posting failure (e.g. the
   * competência period is closed) the row is COMPENSATED (soft-delete + rename) and the error is
   * surfaced, so a failed creation never leaves a dangling payable. A crash between the two txs is
   * converged by reconcilePayables.
   */
  async createPayable(scope: AccountingScope, dto: CreatePayableInput): Promise<Payable & { withholdingAvisos: string[] }> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para criar contas a pagar.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    // INCR-INVENTORY D3(b): an inventory PURCHASE (inventoryProductRef + inventoryQty, DTO XOR gate)
    // debits 1.1.6 Estoques instead of an expense leaf and drives a StockMovement INBOUND.
    const inventoryPurchase = isInventoryPurchase(dto);

    // RETENCOES-FONTE PR-2 (itens 10–16): retenção só no título de DESPESA (serviço). Sobrescrita/deduções de PF numa
    // compra de mercadoria ou sem o serviço de retenção ligado ⇒ 400, nunca ignorada (param-aceito-e-ignorado-e-bug).
    const comRetencao = !inventoryPurchase && !!this.withholding;
    if (!comRetencao && (dto.withholdings?.length || dto.pfDeducoes)) {
      throw new ValidationError('withholdings/pfDeducoes só se aplicam a título de despesa de serviço com retenção na fonte.', null, 'RETENCAO_FORA_DO_TITULO_DE_SERVICO');
    }
    const legais = comRetencao ? await this.withholding!.service.fotografia() : null;

    // Expense-account gate (D4): only for ordinary expense payables — must be an existing, active, LEAF
    // Expense account of this scope. Inventory purchases carry expenseAccountId=null.
    const expenseAccount = inventoryPurchase
      ? null
      : await this.resolveExpenseAccount(scope, dto.expenseAccountId!);

    // X6 F-X6-8 (a): contas a recuperar validadas ANTES da tx (existência, folha, Asset) — códigos resolvidos aqui,
    // persistidos na linha (JSON) para o re-drive reconstruir o mesmo entry.
    const recoverableLines = await this.resolveRecoverableLines(scope, dto);

    // BE-INCR-FIXED-ASSETS PR-5 (F-FA12 → a): modo 4 resolve class.costAccountId por item ANTES da
    // tx (mesmo padrão de recoverableLines) — persistido na linha para o re-drive reconstruir o
    // MESMO entry e para o rascunho (item 22, fora desta PR — ver F-FA-DRAFT-RATE no retorno) ler
    // qty/ncm/cProd por item.
    // C8 emenda 3.2 (E3–E5): o item EXPENSE sai à parte — debita a própria folha de despesa e não vira rascunho.
    const hasFixedAssetItems = (dto.fixedAssetItems?.length ?? 0) > 0;
    const { capitalized: fixedAssetLines, expensed: expensedLines } = hasFixedAssetItems
      ? await this.resolveFixedAssetLines(scope, dto)
      : { capitalized: [], expensed: [] };

    // ITEM-DESTINATION item 11 (F-ID-3 a): a conta de cada item de insumo é re-conferida aqui como folha
    // Expense do escopo (defesa em profundidade — mesmo gate do `expenseAccountId`), ANTES do tx1.
    const insumoLines = await this.resolveInsumoLines(scope, dto);

    // A note has STOCK lines only when it carries a single-SKU pair or a non-empty inventoryItems[]
    // (F-FA12 → a: a nota pode ser 100% CFOP 1551/2551, com inventoryItems=[]/ausente — o wiring de
    // estoque não deve ser exigido de um payable sem nenhum item de estoque).
    const hasInventoryLines = hasSingleInventorySku(dto) || (dto.inventoryItems?.length ?? 0) > 0;

    // Inventory purchases MUST have the subledger wired (the dep is optional until Fase B factory
    // wiring). Fail LOUD before minting a row we could never value, never silently skip the INBOUND.
    if (hasInventoryLines && !this.inventoryService) {
      throw new ValidationError(
        'Compra de estoque requer o serviço de estoque configurado (wiring de inventário pendente).',
      );
    }

    // LAC-E F-E2 (ratificado): o productRef precisa existir no catálogo `products` do tenant ANTES
    // de qualquer escrita — typo em string livre criaria camada de custo órfã invisível ao CMV.
    // Mesmo padrão fail-loud do inventoryService para wiring ausente.
    if (hasInventoryLines) {
      if (!this.productRefLookup) {
        throw new ValidationError(
          'Compra de estoque requer o catálogo de produtos configurado (wiring de lookup pendente).',
        );
      }
      // PR #267 C1 / fork (a): no modo multi-item o par single-SKU é undefined por desenho — o gate roda
      // sobre CADA productRef agregado dos itens, nunca sobre o campo vazio.
      const refsToCheck = hasSingleInventorySku(dto)
        ? [dto.inventoryProductRef!]
        : aggregateInventoryItems(dto.inventoryItems ?? []).map((item) => item.productRef);
      for (const ref of refsToCheck) {
        const exists = await this.productRefLookup.productExists(scope, ref);
        if (!exists) {
          throw new ValidationError(
            `Produto '${ref}' não existe no catálogo desta conta — confira o identificador antes de lançar a compra.`,
          );
        }
      }
    }

    // tx1 — resolve/mint the counterparty, create the row (OPEN) and append payable.created
    // atomically (ACC-019/ACC-012). The counterparty resolution moved INSIDE this tx with SEC-A1-5:
    // it can now WRITE (mint a catalog identity), and a mint that survived a rolled-back payable
    // would leave an orphan supplier in the catalog. Mints payableId.
    let payable: Payable;
    let baixas: BaixaRetencao[] = [];
    let withholdingAvisos: string[] = [];
    try {
      payable = await this.payableRepo.runTransaction(async (tx) => {
        const counterpartyId = await this.resolveOrCreateCounterpartyId(scope, dto, tx);
        // RETENCOES-FONTE PR-2 (item 15; F-RET-10 a): plano do RECONHECIMENTO na tx1 (a contraparte pode ter nascido agora).
        // O título nasce com `paidCents` = Σ retido (as baixas sem caixa abaixo, na mesma tx) — reconhecimento segue bruto.
        const plano = legais
          ? await this.withholding!.service.planejar(
              scope,
              { event: 'RECOGNITION', counterpartyId, brutoCents: BigInt(dto.amountCents), dataFatoGerador: dto.issueDate, legais, overrides: dto.withholdings, pfDeducoes: dto.pfDeducoes },
              tx,
            )
          : null;
        const retido = (plano?.linhas ?? []).reduce((s, l) => s + Number(l.amountCents), 0);
        const created = await this.payableRepo.create(
          {
            userId,
            unitId,
            supplierName: dto.supplierName,
            supplierRef: dto.supplierRef ?? null,
            counterpartyId,
            documentNumber: dto.documentNumber ?? null,
            description: dto.description,
            issueDate: new Date(dto.issueDate),
            dueDate: new Date(dto.dueDate),
            amountCents: dto.amountCents,
            expenseAccountId: expenseAccount?.id ?? null,
            inventoryProductRef: dto.inventoryProductRef ?? null,
            inventoryQty: dto.inventoryQty ?? null,
            inventoryMultiItem: dto.inventoryMultiItem ?? false,
            recoverableTaxLines: recoverableLines.length > 0 ? JSON.stringify(recoverableLines) : null,
            status: payableStatusForBalance(retido, dto.amountCents),
            paidCents: retido,
            createdById: scope.actorUserId,
          },
          tx,
        );
        if (plano) {
          baixas = await this.withholding!.service.gravar(
            scope,
            plano,
            created,
            { originSettlementId: null, documentoNumero: dto.documentNumber ?? null, documentoSerie: dto.documentoSerie ?? null },
            tx,
          );
          withholdingAvisos = plano.avisos;
        }
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: 'payable.created',
          targetType: 'payable',
          targetId: created.id,
          payload: {
            payableId: created.id,
            supplierRef: dto.supplierRef,
            amountCents: String(dto.amountCents),
            // X6 F-X6-8 (a): o que foi RECONHECIDO como crédito a recuperar (derivado das linhas, nunca do perfil).
            recoverableIcmsCents: String(recoverableLines.filter((l) => !isIbsCbsRow(l) && l.kind === 'ICMS').reduce((acc, l) => acc + l.amountCents, 0)),
            recoverablePisCofinsCents: String(recoverableLines.filter((l) => !isIbsCbsRow(l) && l.kind === 'PIS_COFINS').reduce((acc, l) => acc + l.amountCents, 0)),
            // IBS-CBS-2027 PR-3 (item 14): crédito de IBS + CBS reconhecido a recuperar (PENDENTE).
            recoverableIbsCbsCents: String(recoverableLines.filter(isIbsCbsRow).reduce((acc, l) => acc + l.amountCents, 0)),
            // ITEM-DESTINATION item 13: o que foi para DESPESA de insumo (precedente do X6 item 13).
            insumoCents: String(insumoLines.reduce((acc, l) => acc + l.costCents, 0)),
            // C8 emenda 3.2 (E8): imobilizado deduzido como despesa (IN RFB 1.700 art. 120) — unitário e a declaração de vida
            // útil ≤ 1 ano. Só quando há item EXPENSE: evento sem a chave mantém o hash (canonicalize pula ausente).
            ...(expensedLines.length > 0
              ? {
                  expensedFixedAssetItems: JSON.stringify(
                    expensedLines.map((l) => ({
                      sourceItemRef: l.sourceItemRef,
                      cProd: l.cProd,
                      costCents: l.costCents,
                      unitCostCents: l.unitCostCents,
                      ...(l.usefulLifeUpToOneYear ? { usefulLifeUpToOneYear: true } : {}),
                    })),
                  ),
                }
              : {}),
            dueDate: dto.dueDate,
            // Debit leg of the recognition: an expense leaf, or 1.1.6 Estoques for an inventory purchase.
            expenseAccountCode: expenseAccount?.code ?? ESTOQUES_CODE,
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ValidationError(
          'Já existe uma conta a pagar em aberto para este fornecedor e documento.',
        );
      }
      throw error;
    }

    // Recognition posting (SEPARATE tx). Compensate the row on synchronous failure.
    let recognitionEntryId: string | undefined;
    try {
      const entry = await this.posting.postEntry(
        scope,
        this.buildRecognitionInput(scope, payable, expenseAccount, dto, fixedAssetLines, insumoLines, expensedLines),
      );
      recognitionEntryId = entry.id;
    } catch (error) {
      await this.compensateFailedRecognition(scope, payable);
      throw error;
    }

    // RETENCOES-FONTE PR-2 (item 15): as baixas sem caixa vão ao razão DEPOIS do reconhecimento (D 2.1.2 / C a recolher).
    // O reconhecimento já está commitado: falha aqui NÃO compensa — o reconcilePayables refaz (item 21).
    for (const b of baixas) await this.postWithholdingBestEffort(scope, payable, b);

    // Inventory INBOUND (D3(b) + BE-INCR-NFE F-NFE7→a) — AFTER the recognition is booked (D 1.1.6 / C
    // 2.1.2), value the SKU(s). receiveStock is READ-FIRST idempotent on (item, sourceId=payableId), so
    // this same purchase can never double-value with a seed of the same lot (Gate 4). It runs in its OWN
    // tx; the recognition is already committed, so a failure here must NOT compensate the (valid)
    // recognition — leave the payable OPEN and let reconcilePayables re-drive the missing INBOUND (Gap
    // 2/Gate 8), converging like the AP settlement crash window. Best-effort: log and return.
    //
    // Two shapes debit 1.1.6 (isInventoryPurchase):
    //   - SINGLE-SKU (INCR-INVENTORY): the row's inventoryProductRef/inventoryQty → ONE receiveStock at
    //     the note total. Reconcile can re-drive this from the row.
    //   - MULTI-ITEM (NF-e): the per-SKU breakdown lives in `dto.inventoryItems` (NOT on the row) → N
    //     receiveStock, each keyed on sourceId=payableId with its rateio share. Σ shares === amountCents
    //     (the DTO tie-out gate proved it), so Σ subledger value ties out to the 1.1.6 recognition debit
    //     — PROVIDED duplicate productRefs are folded first (receiveInventoryItems does it) and each
    //     item's failure is isolated, else a repeated SKU or one bad line loses cents in silence.
    if (inventoryPurchase) {
      if (hasSingleInventorySku(dto)) {
        try {
          await this.inventoryService!.receiveStock(scope, {
            productRef: dto.inventoryProductRef!,
            qty: dto.inventoryQty!,
            totalValueCents: dto.amountCents,
            occurredAt: new Date(dto.issueDate),
            sourceType: INVENTORY_INBOUND_SOURCE_TYPE,
            sourceId: payable.id,
            description: dto.description,
          });
        } catch (error) {
          logger.warn('AP createPayable: inventory INBOUND failed — reconcile will re-drive', {
            payableId: payable.id,
            error,
          });
        }
      } else if (dto.inventoryItems && dto.inventoryItems.length > 0) {
        // MULTI-ITEM: per-item isolation lives inside receiveInventoryItems — one failing SKU must not
        // keep the remaining SKUs out of the subledger (a loop-wide catch used to swallow the rest).
        await this.receiveInventoryItems(scope, {
          payableId: payable.id,
          occurredAt: new Date(dto.issueDate),
          description: dto.description,
          items: dto.inventoryItems,
        });
      }
      // F-D2=(b): espelho FÍSICO da compra (movimento In → productUnits.stock). Mesmo estágio
      // best-effort do receiveStock: idempotente por detailKey, re-dirigido pelo reconcile.
      // PR #267 C2 / fork (a): multi-item → um espelho por SKU agregado (mesma agregação do subrazão).
      if (hasSingleInventorySku(dto)) {
        await this.drivePhysicalInbound(scope, payable.id, dto.inventoryProductRef!, dto.inventoryQty!, dto.amountCents, new Date(dto.issueDate), dto.unitId);
      } else {
        for (const item of aggregateInventoryItems(dto.inventoryItems ?? [])) {
          await this.drivePhysicalInbound(scope, payable.id, item.productRef, item.qty, item.valueCents, new Date(dto.issueDate), dto.unitId);
        }
      }
    }

    // BE-INCR-FIXED-ASSETS PR-5 (item 22, F-FA12 → a) — AFTER the recognition is booked, mint the
    // FixedAsset PENDING_ACTIVATION draft(s). Same staging as the inventory INBOUND above: the
    // recognition is already committed, so a failure here must NOT compensate it — best-effort, log
    // and let `redriveFixedAssetDrafts` (reconcile gancho) complete it later by re-reading the
    // recognition's `SourceDocument.rawJson` (never a 2nd copy of the breakdown on the Payable row).
    if (fixedAssetLines.length > 0) {
      const sourceDocumentId = await this.findRecognitionSourceDocumentId(scope, recognitionEntryId);
      try {
        await this.fixedAssetDraftCreator?.createDraftFromPayable(scope, payable, fixedAssetLines, sourceDocumentId);
      } catch (error) {
        logger.warn('AP createPayable: fixed-asset draft creation failed — reconcile will re-drive', {
          payableId: payable.id,
          error,
        });
      }
    }
    return Object.assign(payable, { withholdingAvisos });
  }

  /**
   * RETENCOES-FONTE PR-2 (item 21) — as retenções do RECONHECIMENTO que o cancelamento do título leva junto: só quando as baixas ativas
   * do título são todas sem caixa da retenção (pagamento ativo ⇒ o cancelamento segue recusando). CANCELLING PR-0 (F-CX-1 a): em vez de
   * estornar ANTES da marca, o cancelamento grava o `CANCELLING` e o estorno das retenções (razão + subrazão) vira parte do `driveCancelling`.
   */
  private async linhasRetencaoDoReconhecimento(scope: AccountingScope, payable: { id: string; payments: readonly { status: string; kind: string }[] }): Promise<TaxWithholding[]> {
    if (!this.withholding) return [];
    const ativos = payable.payments.filter((p) => p.status === 'ACTIVE');
    if (ativos.some((p) => p.kind !== WITHHOLDING_KIND)) return [];
    return (await this.withholding.repo.findActiveByTitle(scope, 'PAYABLE', payable.id)).filter((l) => l.event === 'RECOGNITION');
  }

  /** Item 21 — estorna no razão (T5, período da data do estorno) o lançamento `ap.withholding` de cada linha; idempotente. */
  private async reverterLancamentosDeRetencao(scope: AccountingScope, linhas: readonly TaxWithholding[], dto: { reversalDate: string; reason?: string }): Promise<void> {
    for (const l of linhas) {
      if (!l.settlementId) continue;
      const entry = await this.posting.findEntryBySource(scope, AP_WITHHOLDING_SOURCE_TYPE, l.settlementId);
      if (entry) await this.posting.reverseEntry(scope, { automaticWriter: true, unitId: scope.unitId, lancamentoId: entry.id, reversalPostingDate: dto.reversalDate, reason: dto.reason || `Cancelamento da retenção na fonte da liquidação ${l.settlementId}` });
    }
  }

  /**
   * RETENCOES-FONTE PR-2 (item 15; F-RET-10 a): lança a baixa sem caixa da retenção — D 2.1.2 / C conta a recolher, sob
   * `sourceId = paymentId` (idempotente). Best-effort: o título e a retenção já estão commitados; o reconcile refaz.
   */
  private async postWithholdingBestEffort(scope: AccountingScope, payable: Payable, b: BaixaRetencao): Promise<void> {
    try {
      const entry = await this.posting.postEntry(scope, this.buildWithholdingInput(scope, payable, b.paymentId, b.amountCents, b.accountCode, b.date, b.tributo));
      await this.payableRepo.updatePayment(scope, b.paymentId, { entryId: entry.id });
      await this.withholding!.repo.setEntryId(scope, b.withholdingId, entry.id);
    } catch (error) {
      logger.warn('AP: lançamento da retenção falhou — o reconcile refaz', { payableId: payable.id, paymentId: b.paymentId, error });
    }
  }

  private buildWithholdingInput(scope: AccountingScope, payable: Payable, paymentId: string, cents: number, accountCode: string, date: string, tributo: string): PostEntryInput {
    return {
      unitId: scope.unitId,
      date,
      description: `Retenção de ${tributo} — ${payable.supplierName}${payable.documentNumber ? ` (NF ${payable.documentNumber})` : ''}`,
      auditDescription: `Retenção de ${tributo} — NF ${payable.documentNumber ?? 's/nº'}`,
      sourceType: AP_WITHHOLDING_SOURCE_TYPE,
      automaticWriter: true,
      sourceId: paymentId,
      lines: [
        { accountCode: FORNECEDORES_A_PAGAR_CODE, debitCents: cents, creditCents: 0 },
        { accountCode, debitCents: 0, creditCents: cents },
      ],
    };
  }

  /** Resolve o `sourceDocumentId` da recognition (drill-down do rascunho, item 22) — best-effort,
   *  `undefined` se o dep não está wired ou a entry não tem origem formal (nunca bloqueia o create). */
  private async findRecognitionSourceDocumentId(
    scope: AccountingScope,
    entryId: string | undefined,
  ): Promise<string | undefined> {
    if (!entryId || !this.sourceProvenanceRepo) return undefined;
    try {
      const sources = await this.sourceProvenanceRepo.findSourcesByEntry(scope, entryId);
      return sources[0]?.sourceDocumentId;
    } catch {
      return undefined;
    }
  }

  /** Best-effort do movimento físico da compra (nunca desfaz razão/subrazão já commitados). */
  private async drivePhysicalInbound(
    scope: AccountingScope,
    payableId: string,
    productRef: string,
    qty: number,
    totalValueCents: number,
    occurredAt: Date,
    unitId: string,
  ): Promise<void> {
    if (!this.physicalStockSync) {
      logger.warn('AP: physical stock sync não configurado — estoque físico não espelhado', { payableId });
      return;
    }
    try {
      await this.physicalStockSync.recordPurchaseInbound(scope, {
        productRef,
        unitId,
        qty,
        payableId,
        occurredAt,
        totalValueCents,
      });
    } catch (error) {
      logger.warn('AP: movimento físico da compra falhou — reconcile re-dirige', { payableId, error });
    }
  }

  // ---------------------------------------------------------------------------
  // Multi-item inventory receipt (NF-e) — aggregation + per-item isolation + re-drive
  // ---------------------------------------------------------------------------

  /**
   * Drive the per-SKU StockMovement INBOUNDs of a MULTI-ITEM inventory purchase (BE-INCR-NFE F-NFE7→a).
   *
   * TWO invariants this method owns, both money-load-bearing:
   *
   * 1. AGGREGATION BY `productRef` (mirrors `InventoryService.aggregateLines`, which folds a sale's
   *    lines before the baixa). `receiveStock` is READ-FIRST idempotent on
   *    `(inventoryItemId, kind, sourceType, sourceId)` and the whole note shares ONE `sourceId`
   *    (=payableId) — so two note lines resolving to the SAME `productRef` would make the second call
   *    look like a REPLAY and return without incrementing: the razão would debit 1.1.6 with the full
   *    note while the subledger received less, SILENTLY. A NF-e may legitimately repeat a `cProd`
   *    across `<det>` lines, so the shares are folded per SKU (qty and cents summed) BEFORE driving —
   *    Σ INBOUND then equals Σ shares equals the 1.1.6 debit.
   * 2. PER-ITEM ERROR ISOLATION: a failure on one SKU is logged and the remaining SKUs still enter.
   *
   * RE-RUNNABLE: every call is idempotent per SKU on `sourceId=payableId`, so calling this again with
   * the SAME breakdown completes whatever a partial run left missing and re-values nothing. Returns the
   * outcome so the caller can report/log what is still absent.
   */
  async receiveInventoryItems(
    scope: AccountingScope,
    params: {
      payableId: string;
      occurredAt: Date;
      description: string;
      items: NonNullable<CreatePayableInput['inventoryItems']>;
    },
  ): Promise<{ received: number; failed: Array<{ productRef: string; error: unknown }> }> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para receber estoque de compras.');
    }
    if (!this.inventoryService) {
      throw new ValidationError(
        'Compra de estoque requer o serviço de estoque configurado (wiring de inventário pendente).',
      );
    }
    // CANCELLING PR-0 (0.8): recebimento de estoque novo sobre título em cancelamento re-receberia o que o cancelamento desfaz.
    if ((await this.payableRepo.findById(scope, params.payableId))?.status === 'CANCELLING') {
      throw new ConflictError('A conta a pagar está em cancelamento — não recebe estoque.', TITULO_EM_CANCELAMENTO_CODE);
    }

    const failed: Array<{ productRef: string; error: unknown }> = [];
    let received = 0;
    for (const item of aggregateInventoryItems(params.items)) {
      try {
        await this.inventoryService.receiveStock(scope, {
          productRef: item.productRef,
          qty: item.qty,
          totalValueCents: item.valueCents,
          occurredAt: params.occurredAt,
          sourceType: INVENTORY_INBOUND_SOURCE_TYPE,
          sourceId: params.payableId,
          description: item.description ?? params.description,
        });
        received += 1;
      } catch (error) {
        // Isolated: this SKU is missing from the subledger, the others still enter. A later re-drive
        // with the same breakdown completes it (receiveStock is idempotent per SKU on payableId).
        failed.push({ productRef: item.productRef, error });
        logger.warn('AP inventory INBOUND failed for one SKU — other itens unaffected, re-drive pending', {
          payableId: params.payableId,
          productRef: item.productRef,
          error,
        });
      }
    }
    return { received, failed };
  }

  // ---------------------------------------------------------------------------
  // Register payment (settlement)
  // ---------------------------------------------------------------------------

  /**
   * Register ONE payment (settlement) of a payable — full or PARTIAL (BE-INCR-PARTIAL-SETTLEMENT,
   * F-PS1 c / F-PS2 a): book the settlement (D 2.1.2 / C conta-por-método), add it to the balance cache
   * and move the payable to PAID (balance closed) or PARTIALLY_PAID. The race is closed by the SUM-CAS
   * (`OPEN|PARTIALLY_PAID → PAYING` with `paidCents += amount`, only when the balance carries it)
   * before any ledger write. Concurrent calls serialize on PAYING (F-PS8 → a: one settlement in flight
   * at a time); across the sequence exactly the payments the balance carries are accepted.
   * Also the service behind the sister route `POST /:id/settlements` (F-PS10 → b).
   */
  async registerPayment(
    scope: AccountingScope,
    payableId: string,
    dto: RegisterPaymentInput,
  ): Promise<PayablePayment> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para pagar contas.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);

    const payable = await this.payableRepo.findByIdWithPayments(scope, payableId);
    if (!payable) throw new NotFoundError(`Conta a pagar '${payableId}' não foi encontrada.`);
    // CANCELLING PR-0 (0.8, F-CX-3 a): título em cancelamento é vivo para a leitura e morto para a escrita nova.
    if (payable.status === 'CANCELLING') {
      throw new ConflictError('A conta a pagar está em cancelamento — não aceita baixa.', TITULO_EM_CANCELAMENTO_CODE);
    }
    // Guard pré-CAS (ADR F-PS2, site 2): OPEN and PARTIALLY_PAID may take another payment.
    if (!(PAYABLE_SETTLEABLE_STATUSES as readonly string[]).includes(payable.status)) {
      throw new ValidationError(
        `Conta a pagar não está aberta para pagamento (status atual: ${payable.status}).`,
      );
    }

    // Balance guard (BRIEF item 8): any part of the remaining balance, never more. `paidCents` is the
    // atomic cache of Σ payments ACTIVE (F-PS1 c). This read only shapes the message — the
    // AUTHORITATIVE check is the sum-CAS below (ACC-011). `amountCents` is immutable after create,
    // so the value read here is safe to enter the CAS as a literal (ADR §3).
    const amountCents = centsFromDb(payable.amountCents);
    const paidBefore = centsFromDb(payable.paidCents);
    const remaining = amountCents - paidBefore;
    if (dto.amountCents > remaining) {
      throw new ValidationError(
        `Valor do pagamento (${dto.amountCents} centavos) excede o saldo em aberto (${remaining} centavos).`,
      );
    }

    // Resolve the credit account for the method (closed map — unknown REJECTS, D2) BEFORE the CAS.
    const creditCode = resolvePaymentMethodAccount(dto.method);
    // RETENCOES-FONTE PR-2 (item 19; F-RET-11 a): a baixa do título de imposto debita a conta a recolher, não 2.1.2.
    const debitCode = await this.settlementDebitCode(scope, payable);

    // RETENCOES-FONTE PR-2 (item 17; F-RET-4 a): CSRF na baixa — o DTO traz o PAGO em caixa; o bruto `g` da parcela sai da
    // derivação (maior `g` que fecha, dono 24/10; o saldo restante tem preferência). O claim soma `g` ao paidCents.
    const comCsrf = !!this.withholding && payable.origin !== PAYABLE_ORIGIN_WITHHOLDING_TAX;
    const legais = comCsrf ? await this.withholding!.service.fotografia() : null;
    // Review A1 (dono, 25/10): a base da CSRF (`baseCsrfCents`) é o bruto da NF proporcional à parcela; o que entra no saldo
    // (`brutoCents`, o claim) é esse bruto menos a parte já retida no reconhecimento — pago + CSRF.
    const parcela = legais
      ? await this.withholding!.service.brutoDaBaixa(scope, {
          payableId,
          tituloCents: BigInt(amountCents),
          counterpartyId: payable.counterpartyId,
          pagoCents: BigInt(dto.amountCents),
          restanteCents: BigInt(remaining),
          data: dto.paidAt,
          legais,
        })
      : null;
    const brutoCents = parcela ? Number(parcela.claimCents) : dto.amountCents;
    const baseCsrfCents = parcela ? parcela.brutoCents : BigInt(dto.amountCents);
    if (brutoCents > remaining) {
      throw new ValidationError(`Parcela (${brutoCents} centavos, com a CSRF) excede o saldo em aberto (${remaining} centavos).`);
    }

    // ATOMIC SUM-CAS (D4 + ADR §3) — OPEN|PARTIALLY_PAID → PAYING, paidCents += amount, ONLY when the
    // balance carries it. count 0 = lost the race / not settleable / would overshoot the balance.
    const claimed = await this.payableRepo.claimForPayment(scope, payableId, amountCents, brutoCents);
    if (claimed === 0) {
      throw new ValidationError(
        'A conta já está em pagamento, não está mais aberta ou o saldo não comporta este pagamento.',
      );
    }

    let posted = false;
    let payment: PayablePayment | undefined;
    let baixas: BaixaRetencao[] = [];
    try {
      // Mint the payment row (ACTIVE) — its id is the settlement idempotency key (D3). RETENCOES-FONTE PR-2: na mesma tx, as
      // baixas WITHHOLDING da CSRF desta parcela, as TaxWithholding (origin = este PAYMENT) e o título de imposto (item 17).
      const paymentData = { userId, unitId, payableId, amountCents: dto.amountCents, method: dto.method, paidAt: new Date(dto.paidAt), paidByUserId: scope.actorUserId, status: 'ACTIVE' };
      payment = !legais ? await this.payableRepo.createPayment(paymentData) : await this.payableRepo.runTransaction(async (tx) => {
        const p = await this.payableRepo.createPayment(paymentData, tx);
        {
          const plano = await this.withholding!.service.planejar(
            scope,
            { event: 'SETTLEMENT', counterpartyId: payable.counterpartyId, brutoCents: baseCsrfCents, dataFatoGerador: dto.paidAt, legais },
            tx,
          );
          const retido = plano.linhas.reduce((s, l) => s + Number(l.amountCents), 0);
          if (dto.amountCents + retido !== brutoCents) {
            throw new ValidationError(`Parcela incoerente: pago ${dto.amountCents} + CSRF ${retido} ≠ parcela ${brutoCents} centavos.`);
          }
          baixas = await this.withholding!.service.gravar(scope, plano, payable, { originSettlementId: p.id, documentoNumero: payable.documentNumber, documentoSerie: null }, tx);
        }
        return p;
      });

      const entry = await this.posting.postEntry(
        scope,
        this.buildSettlementInput(scope, payable, payment, creditCode, dto, debitCode),
      );
      posted = true;
      for (const b of baixas) await this.postWithholdingBestEffort(scope, payable, b);

      // Finalize (tx) — link the entry, resolve PAYING → PAID|PARTIALLY_PAID via the atomic CAS, emit
      // the domain audit ONLY when THIS call performed the transition. The ledger is already committed;
      // if this tx crashes, reconcilePayables finalizes it. The CAS closes the race with a concurrent
      // reconcile that could finalize between the post above and this tx (else both would emit).
      // The balance after this receipt is READ from the row inside the tx (review #307 F3): the
      // pre-CAS `paidBefore` can be stale — another settlement may have completed in between, and a
      // cancel of an already-finalized receipt may decrement while we are PAYING.
      await this.payableRepo.runTransaction(async (tx) => {
        await this.payableRepo.updatePayment(scope, payment!.id, { entryId: entry.id }, tx);
        const flipped = await this.payableRepo.finalizeIfPaying(scope, payableId, amountCents, tx);
        if (flipped === 1) {
          const row = await this.payableRepo.findById(scope, payableId, tx);
          const paidCentsAfter = row ? centsFromDb(row.paidCents) : paidBefore + brutoCents;
          await this.auditService.append(tx, scope, {
            actorUserId: scope.actorUserId,
            eventType: 'payable.settlement_registered',
            targetType: 'payable',
            targetId: payableId,
            payload: {
              payableId,
              paymentId: payment!.id,
              amountCents: String(dto.amountCents),
              method: dto.method,
              entryId: entry.id,
              paidCentsAfter: String(paidCentsAfter),
              remainingCents: String(amountCents - paidCentsAfter),
            },
          });
        }
      });
      return { ...payment, entryId: entry.id, status: 'ACTIVE' };
    } catch (error) {
      // Only safe to revert BEFORE the ledger commit. After a successful post, the money is
      // booked — leave it PAYING for reconcile to finalize (never revert over a real posting).
      if (!posted) {
        await this.revertClaim(scope, payableId, payment, brutoCents);
      }
      throw error;
    }
  }

  /** RETENCOES-FONTE PR-2 (item 19): débito da baixa — conta a recolher do título de imposto, ou 2.1.2. */
  private async settlementDebitCode(scope: AccountingScope, payable: Payable): Promise<string> {
    if (payable.origin !== PAYABLE_ORIGIN_WITHHOLDING_TAX) return FORNECEDORES_A_PAGAR_CODE;
    const conta = payable.liabilityAccountId ? await this.accountRepo.findById(scope, payable.liabilityAccountId) : null;
    if (!conta) throw new ValidationError('Título de imposto sem a conta a recolher (liabilityAccountId).');
    return conta.code;
  }

  // ---------------------------------------------------------------------------
  // Cancel payable (reverse recognition — F6)
  // ---------------------------------------------------------------------------

  /**
   * Cancel an OPEN payable: reverse its recognition (estorno on the reversalDate — its own period
   * gate, T5) and flip the row to CANCELLED (terminal) with rename-on-delete freeing the business
   * key. Re-runnable: reverseEntry is idempotent, so a crash mid-cancel completes on retry.
   */
  /**
   * IBS-CBS-2027 PR-3 (item 16; F-IBS-4 a, F-IBS-12 a; LC 214 art. 47 [D03]): o crédito de IBS/CBS da nota passa de
   * `PENDENTE` a `APROPRIADO` com o comprovante da extinção do débito da entrada — `SourceDocument` ativo do escopo,
   * obrigatório. Gates DENTRO da tx (memória `authoritative-gate-inside-tx`): nota viva e não cancelada, comprovante,
   * linha do tributo com crédito > 0 no `expectedStatus`, e CAS do JSON lido (outra chamada mudou ⇒ 409). Sem lançamento:
   * o crédito está em IBS/CBS a recuperar desde a entrada; a apuração do mês de `apropriadoEm` o soma e o compensa.
   */
  async apropriarCreditoIbsCbs(scope: AccountingScope, input: ApropriarCreditoInput): Promise<IbsCbsCreditRow> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para apropriar créditos de contas a pagar.');
    }
    if (!this.sourceProvenanceRepo) {
      throw new ValidationError('Apropriação de crédito requer o repositório de documentos de origem configurado (wiring pendente).');
    }
    const sourceRepo = this.sourceProvenanceRepo;
    return this.payableRepo.runTransaction(async (tx) => {
      const payable = await this.payableRepo.findById(scope, input.payableId, tx);
      if (!payable || payable.deletedAt) throw new NotFoundError(`Conta a pagar '${input.payableId}' não foi encontrada.`);
      if (payable.status === 'CANCELLED') throw new ValidationError('Conta a pagar cancelada — o crédito não pode ser apropriado.');
      // CANCELLING PR-0 (0.8): o crédito de um título que está sendo cancelado não se apropria (o cancelamento o leva junto).
      if (payable.status === 'CANCELLING') throw new ConflictError('A conta a pagar está em cancelamento — o crédito não pode ser apropriado.', TITULO_EM_CANCELAMENTO_CODE);
      const [comprovante] = await sourceRepo.findActiveSourceDocumentsByIds(scope, [input.sourceDocumentId], tx);
      if (!comprovante) {
        throw new ValidationError(`Comprovante '${input.sourceDocumentId}' não existe neste escopo — a apropriação exige o documento da extinção (F-IBS-4 a).`);
      }
      const raw = (payable as Payable & { recoverableTaxLines?: string | null }).recoverableTaxLines ?? null;
      const lines = raw ? (JSON.parse(raw) as StoredRecoverableLine[]) : [];
      const idx = lines.findIndex((l) => isIbsCbsRow(l) && l.tributo === input.tributo && l.amountCents > 0);
      if (idx < 0) throw new ValidationError(`A nota não tem crédito de ${input.tributo} a apropriar.`, null, 'IBS_CBS_CREDITO_AUSENTE');
      const line = lines[idx] as IbsCbsCreditRow;
      if (line.status !== input.expectedStatus) {
        throw new ConflictError(`crédito de ${input.tributo} da nota está ${line.status}, diferente de expectedStatus (${input.expectedStatus}).`, 'IBS_CBS_CREDITO_CAS');
      }
      const apropriada: IbsCbsCreditRow = { ...line, status: 'APROPRIADO', sourceDocumentId: comprovante.id, apropriadoEm: scopeToday(scope) };
      const next = lines.map((l, i) => (i === idx ? apropriada : l));
      if ((await this.payableRepo.casRecoverableTaxLines(scope, payable.id, raw!, JSON.stringify(next), tx)) !== 1) {
        throw new ConflictError(`crédito de ${input.tributo} da nota mudou em paralelo — releia a nota.`, 'IBS_CBS_CREDITO_CAS');
      }
      // Sem PII: ids, tributo, valor e dia.
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: PAYABLE_IBS_CBS_CREDIT_APPROPRIATED,
        targetType: 'payable',
        targetId: payable.id,
        payload: { payableId: payable.id, tributo: input.tributo, amountCents: String(line.amountCents), sourceDocumentId: comprovante.id, apropriadoEm: apropriada.apropriadoEm! },
      });
      return apropriada;
    });
  }

  /**
   * Cancela o título (estorno do reconhecimento + `CANCELLED`) em DOIS commits com a INTENÇÃO gravada antes (BE-INCR-CANCELAMENTO-CANCELLING
   * PR-0, lacuna 69c7; cédula D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA "Estado CANCELLING persistido"):
   *   1. pré-cheques de LEITURA (período aberto na data do estorno, estoque suficiente, imposto retido não recolhido): nada mutou até aqui;
   *   2. tx: re-lê o título, CAS `OPEN|PARTIALLY_PAID|PAID → CANCELLING` (data/motivo/ator gravados) + `payable.cancel_requested`;
   *   3. efeitos, na ordem: estoque (replay-seguro por `reversalEventId`), físico, retenções e reconhecimento no razão (idempotentes);
   *   4. `completePayableCancellation`: `CANCELLING → CANCELLED` + retenções no subrazão numa tx.
   * Falha em 3/4 NÃO compensa (AC-2.3-1): o título fica `CANCELLING`, o erro original sobe e a pendência é registrada; repetir a chamada, o
   * `/reconcile` ou o job de re-drive retomam (a intenção persistida prevalece sobre o corpo novo — item 0.5).
   */
  async cancelPayable(scope: AccountingScope, payableId: string, dto: CancelPayableInput): Promise<Payable> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar contas a pagar.');
    }
    const payable = await this.payableRepo.findByIdWithPayments(scope, payableId);
    if (!payable) throw new NotFoundError(`Conta a pagar '${payableId}' não foi encontrada.`);
    if (payable.status === 'CANCELLED') return payable; // idempotent
    // RETENCOES-FONTE PR-2 (item 19): o título de imposto é gerido pelas retenções — some quando elas são estornadas.
    if (payable.origin === PAYABLE_ORIGIN_WITHHOLDING_TAX) {
      throw new ValidationError('TITULO_IMPOSTO_GERIDO_PELAS_RETENCOES: o título de imposto encolhe com o estorno das retenções; cancele o título de origem.', null, 'TITULO_IMPOSTO_GERIDO_PELAS_RETENCOES');
    }
    // Item 0.5 — retomada: o título já tem a intenção gravada; a data/motivo/ator PERSISTIDOS prevalecem sobre o `dto` desta chamada.
    if (payable.status === 'CANCELLING') return (await this.driveCancellingRecording(scope, payable)).payable;

    // RETENCOES-FONTE PR-2 (item 21) + F-CX-1 (a): título só com as baixas sem caixa da retenção do reconhecimento ⇒ as retenções saem junto
    // (título de imposto já baixado ⇒ 409, ANTES de qualquer marca ou estorno), e o título pode estar PARTIALLY_PAID|PAID por causa delas.
    const linhas = await this.linhasRetencaoDoReconhecimento(scope, payable);
    const comRetencao = linhas.length > 0;
    if (comRetencao) await this.withholding!.service.assertEstornavel(scope, linhas);
    if (payable.status !== 'OPEN' && !(comRetencao && (payable.status === 'PARTIALLY_PAID' || payable.status === 'PAID'))) {
      throw new ValidationError(
        payable.status === 'PAID'
          ? 'Desfaça o pagamento (cancelar pagamento) antes de cancelar a conta.'
          : payable.status === 'PARTIALLY_PAID'
            ? 'Desfaça as baixas ativas (cancelar pagamentos) antes de cancelar a conta.'
            : `Conta a pagar não pode ser cancelada no status atual (${payable.status}).`,
      );
    }
    // Defense-in-depth: an OPEN payable should have no active payment, but never cancel over one.
    if (!comRetencao && (await this.payableRepo.findActivePayment(scope, payableId))) {
      throw new ValidationError('Desfaça o pagamento ativo antes de cancelar a conta.');
    }
    await this.assertCancelPrechecks(scope, payable, linhas, dto.reversalDate);

    // Gate autoritativo DENTRO da tx (server/CLAUDE.md gate 5): re-lê o título e as baixas ativas e só então grava a intenção por CAS.
    await this.payableRepo.runTransaction(async (tx) => {
      const fresh = await this.payableRepo.findById(scope, payableId, tx);
      if (!fresh) throw new NotFoundError(`Conta a pagar '${payableId}' não foi encontrada.`);
      const ativas = await this.payableRepo.findActivePayments(scope, payableId, tx);
      if (ativas.length > 0 && !(comRetencao && ativas.every((p) => p.kind === WITHHOLDING_KIND))) {
        throw new ValidationError('Desfaça o pagamento ativo antes de cancelar a conta.');
      }
      const won = await this.payableRepo.casStartCancelling(
        scope,
        payableId,
        {
          fromStatuses: comRetencao ? ['OPEN', 'PARTIALLY_PAID', 'PAID'] : ['OPEN'],
          cancelledById: scope.actorUserId,
          cancelReason: dto.reason ?? null,
          cancelReversalDate: dto.reversalDate,
        },
        tx,
      );
      if (won !== 1) {
        throw new ConflictError(
          'A conta a pagar mudou durante o cancelamento (baixa em trânsito ou outro cancelamento): releia e tente de novo.',
          TITULO_MUDOU_DURANTE_O_CANCELAMENTO_CODE,
        );
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'payable.cancel_requested',
        targetType: 'payable',
        targetId: payableId,
        // Sem texto livre (PII): o motivo só entra como "informado ou não".
        payload: { payableId, reversalDate: dto.reversalDate, reasonPresent: Boolean(dto.reason) },
      });
    });
    // Valores e tipo do título são imutáveis depois do create: a linha lida antes + a intenção que o CAS acabou de gravar.
    const started: Payable = {
      ...payable,
      status: 'CANCELLING',
      cancelledById: scope.actorUserId,
      cancelReason: dto.reason ?? null,
      cancelReversalDate: dto.reversalDate,
    };
    return (await this.driveCancellingRecording(scope, started)).payable;
  }

  /**
   * Pré-cheques de LEITURA do cancelamento (item 0.4 i, F-CX-2 a) — só recusam o que já é visível; os gates autoritativos continuam
   * dentro do `reverseStockForReceipt` e do `reverseEntry`. Não são atômicos com os efeitos (resíduo nomeado no BRIEF F-CX-2).
   */
  private async assertCancelPrechecks(scope: AccountingScope, payable: Payable, linhas: readonly TaxWithholding[], reversalDate: string): Promise<void> {
    if (isInventoryPurchase(payable)) {
      if (!this.inventoryService) {
        throw new ValidationError('Cancelamento de compra de estoque requer o serviço de estoque configurado.');
      }
      const podeDesfazer = await this.inventoryService.canReverseStockForReceipt?.(scope, {
        sourceType: INVENTORY_INBOUND_SOURCE_TYPE,
        sourceId: payable.id,
        reversalEventId: `${payable.id}:cancel`,
      });
      if (podeDesfazer === false) {
        throw new ValidationError('Não é possível estornar a compra: a mercadoria recebida já foi baixada (estoque insuficiente).');
      }
    }
    // Período só importa se ainda há estorno a ESCREVER no razão (o `reverseEntry` já estornado é idempotente e anterior ao gate).
    const reconhecimento = await this.posting.findEntryBySource(scope, AP_PAYABLE_SOURCE_TYPE, payable.id);
    let falta = reconhecimento != null && !isReversedEntry(reconhecimento);
    for (const l of linhas) {
      if (falta || !l.settlementId) continue;
      const e = await this.posting.findEntryBySource(scope, AP_WITHHOLDING_SOURCE_TYPE, l.settlementId);
      if (e && !isReversedEntry(e)) falta = true;
    }
    if (falta) await this.posting.assertPeriodOpenFor(scope, reversalDate);
  }

  /** `driveCancelling` com o registro da pendência (item 0.9) quando falha: o título fica `CANCELLING`, o erro original sobe intacto. */
  private async driveCancellingRecording(scope: AccountingScope, payable: Payable): Promise<{ payable: Payable; completed: boolean }> {
    try {
      return await this.driveCancelling(scope, payable);
    } catch (error) {
      await this.recordCancellingFailure(scope, payable.id, error);
      throw error;
    }
  }

  /**
   * Os efeitos do cancelamento a partir da intenção PERSISTIDA (data, motivo e ator vêm da linha, nunca do corpo da chamada). Cada passo é
   * idempotente, então a mesma rotina serve ao `cancelPayable`, à retomada pelo usuário e ao reconcile (passo 1b): estoque (`reverseStockForReceipt`
   * devolve o REVERSAL existente sem decrementar de novo; o físico devolve `already-reversed`), retenções e reconhecimento no razão
   * (`reverseEntry` é idempotente e anterior ao gate de período) e, por fim, `completePayableCancellation`.
   */
  private async driveCancelling(scope: AccountingScope, payable: Payable): Promise<{ payable: Payable; completed: boolean }> {
    const payableId = payable.id;
    const reversalDate = payable.cancelReversalDate ?? scopeToday(scope); // legado defensivo: linha CANCELLING sem a data (não deveria existir)
    const reason = payable.cancelReason ?? undefined;
    const linhas = await this.linhasRetencaoDoReconhecimento(scope, { id: payableId, payments: await this.payableRepo.findActivePayments(scope, payableId) });
    // Imposto retido já recolhido ⇒ 409 antes de qualquer estorno (poison: só o operador resolve, estornando o DARF).
    if (linhas.length > 0) await this.withholding!.service.assertEstornavel(scope, linhas);

    // INCR-INVENTORY D3(b): an inventory purchase received stock at create — un-receive it at the ORIGINAL receipt cost BEFORE reversing the
    // ledger, so an insufficient-stock rejection (the goods were already sold) stops here instead of leaving a half-done ledger reversal.
    // Idempotent by a reversalEventId distinct from the receipt key (payableId), so a retried cancel replays without a second decrement.
    if (isInventoryPurchase(payable)) {
      if (!this.inventoryService) {
        throw new ValidationError('Cancelamento de compra de estoque requer o serviço de estoque configurado.');
      }
      await this.inventoryService.reverseStockForReceipt(scope, {
        sourceType: INVENTORY_INBOUND_SOURCE_TYPE,
        sourceId: payableId,
        reversalEventId: `${payableId}:cancel`,
        reversalDate: new Date(reversalDate),
      });
      // F-PS1: contra-movimento físico Out (best-effort; 'not-found' = físico nunca criado, ok).
      if (this.physicalStockSync) {
        try {
          await this.physicalStockSync.reversePurchaseInbound(scope, { payableId, reversalDate: new Date(reversalDate) });
        } catch (error) {
          logger.warn('AP cancel: contra-movimento físico falhou — divergência visível no tie-out físico', { payableId, error });
        }
      }
    }

    // RETENCOES-FONTE PR-2 (item 21): estorno, no razão, das retenções do reconhecimento (idempotente).
    await this.reverterLancamentosDeRetencao(scope, linhas, { reversalDate, reason });

    // Reverse the recognition if it exists (a dangling create may have none).
    const recognition = await this.posting.findEntryBySource(scope, AP_PAYABLE_SOURCE_TYPE, payableId);
    let reversalEntryId: string | null = null;
    if (recognition) {
      const { reversal } = await this.posting.reverseEntry(scope, {
        unitId: scope.unitId,
        lancamentoId: recognition.id,
        reversalPostingDate: reversalDate,
        reason: reason || `Cancelamento da conta a pagar ${payableId}`,
        automaticWriter: true,
      });
      reversalEntryId = reversal.id;
    }
    return this.completePayableCancellation(scope, payable, linhas, reversalEntryId, reason);
  }

  /**
   * COMMIT 2 do cancelamento do título (subrazão): `CANCELLING → CANCELLED` + retenções do reconhecimento + auditoria numa tx, e a pendência
   * da bandeja resolvida na MESMA tx (concluir por qualquer caminho fecha o item sem depender do `rescan`). Compartilhado por `cancelPayable`
   * e pelo reconcile. Idempotente: título que já saiu de `CANCELLING` ⇒ `completed: false`, sem 2º audit.
   */
  private async completePayableCancellation(
    scope: AccountingScope,
    payable: Payable,
    linhas: readonly TaxWithholding[],
    reversalEntryId: string | null,
    reason: string | undefined,
  ): Promise<{ payable: Payable; completed: boolean }> {
    const payableId = payable.id;
    return this.payableRepo.runTransaction(async (tx) => {
      const row = await this.payableRepo.findById(scope, payableId, tx);
      if (!row) {
        // Soft-deleted: outro caminho já concluiu (CANCELLED + deletedAt). Só garante a pendência fechada.
        await this.pendingRecorder?.resolve(scope, PAYABLE_CANCEL_PENDING_SOURCE_TYPE, payableId, tx);
        return { payable: { ...payable, status: 'CANCELLED' }, completed: false };
      }
      if (row.status !== 'CANCELLING') {
        throw new ConflictError('A conta a pagar não está mais em cancelamento.', TITULO_MUDOU_DURANTE_O_CANCELAMENTO_CODE);
      }
      // F-CX-1 (a): as retenções do reconhecimento saem na MESMA tx do CANCELLED (título de imposto baixado ⇒ 409 e a tx desfaz tudo).
      if (linhas.length > 0) {
        const liberado = await this.withholding!.service.reverterNaTx(scope, linhas, tx);
        if (liberado > 0 && (await this.payableRepo.releaseSettlement(scope, payableId, liberado, tx)) === 0) {
          throw new ValidationError('Não foi possível estornar as retenções: o saldo liquidado não comporta o estorno (invariante violado).');
        }
      }
      const deletedAt = new Date();
      const documentNumber = deletedDocumentNumber(payableId, row.documentNumber);
      if ((await this.payableRepo.casCompleteCancelling(scope, payableId, { deletedAt, documentNumber }, tx)) !== 1) {
        throw new ConflictError('A conta a pagar não está mais em cancelamento.', TITULO_MUDOU_DURANTE_O_CANCELAMENTO_CODE);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'payable.cancelled',
        targetType: 'payable',
        targetId: payableId,
        payload: { payableId, reversalEntryId, reason },
      });
      await this.pendingRecorder?.resolve(scope, PAYABLE_CANCEL_PENDING_SOURCE_TYPE, payableId, tx);
      return { payable: { ...row, status: 'CANCELLED', deletedAt, documentNumber }, completed: true };
    });
  }

  /**
   * Re-drive de UM título `CANCELLING` (o que o job de re-drive e o `retryOneReconcilePendingItem` chamam; sem rota nova). Nunca lança por falha do
   * efeito: devolve `blocked` (código determinístico ou período fechado — ver `reconcileBlockedCode`) ou `still_pending`, e registra a pendência.
   */
  async redriveCancelling(scope: AccountingScope, payableId: string): Promise<{ outcome: 'completed' | 'still_pending' | 'blocked'; code?: string }> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a pagar.');
    }
    const row = await this.payableRepo.findById(scope, payableId);
    if (!row || row.status !== 'CANCELLING') return { outcome: 'completed' };
    return this.driveCancellingSafely(scope, row);
  }

  private async driveCancellingSafely(scope: AccountingScope, payable: Payable): Promise<{ outcome: 'completed' | 'still_pending' | 'blocked'; code?: string }> {
    try {
      await this.driveCancelling(scope, payable);
      return { outcome: 'completed' };
    } catch (error) {
      await this.recordCancellingFailure(scope, payable.id, error);
      const code = reconcileBlockedCode(error);
      return code ? { outcome: 'blocked', code } : { outcome: 'still_pending' };
    }
  }

  /** Item 0.9 — a falha do cancelamento depois da intenção vira pendência: poison (imposto recolhido) alerta; o resto é transitório, sem alerta. */
  private async recordCancellingFailure(scope: AccountingScope, payableId: string, error: unknown): Promise<void> {
    const code = error instanceof AppError ? error.errorCode : null;
    let reasonCode: ReconcilePendingReasonCodeValue = 'CANCEL_REDRIVE_FAILED';
    let alert: PendingAlertMode = 'none';
    if (code === 'IMPOSTO_JA_RECOLHIDO') {
      reasonCode = 'IMPOSTO_JA_RECOLHIDO';
      alert = 'permanent';
    } else if (code === 'ACCOUNTING_PERIOD_NOT_OPEN') {
      reasonCode = 'ACCOUNTING_PERIOD_NOT_OPEN';
    }
    await this.pendingRecorder?.record(scope, {
      sourceType: PAYABLE_CANCEL_PENDING_SOURCE_TYPE,
      sourceId: payableId,
      reasonCode,
      reasonDetail: error instanceof Error ? error.message : String(error),
      alert,
    });
  }

  // ---------------------------------------------------------------------------
  // Cancel payment (reverse settlement, reopen)
  // ---------------------------------------------------------------------------

  /**
   * Cancel ONE active payment among N (F-PS3 → a, any position): reverse its settlement, give its
   * cents back to the balance cache atomically and recompute the status (0 → OPEN, partial →
   * PARTIALLY_PAID). The settlement + its reversal net to zero on 2.1.2, leaving that part of the
   * liability standing again. Also the service behind `POST /:id/settlements/:settlementId/cancel`.
   */
  async cancelPayment(
    scope: AccountingScope,
    payableId: string,
    paymentId: string,
    dto: CancelPaymentInput,
  ): Promise<PayablePayment> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para cancelar pagamentos.');
    }
    const payment = await this.payableRepo.findPaymentById(scope, paymentId);
    if (!payment || payment.payableId !== payableId) {
      throw new NotFoundError(`Pagamento '${paymentId}' não foi encontrado.`);
    }
    if (payment.status === 'CANCELLED') return payment; // idempotent
    // RETENCOES-FONTE PR-2 (item 21): a baixa sem caixa da retenção não se estorna sozinha — sai com o pagamento que a gerou
    // (CSRF) ou com o cancelamento do título (retenção do reconhecimento).
    if (payment.kind === WITHHOLDING_KIND) {
      throw new ValidationError('RETENCAO_ESTORNO_PELA_ORIGEM: estorne o pagamento que gerou a retenção ou cancele o título.', null, 'RETENCAO_ESTORNO_PELA_ORIGEM');
    }
    // A CSRF desta parcela (TaxWithholding com originSettlementId = este PAYMENT) sai junto; imposto já recolhido ⇒ 409,
    // checado ANTES de qualquer estorno no razão (memória efeito-irreversivel-antes-do-gate).
    const csrf = this.withholding ? await this.withholding.repo.findActiveByOriginSettlement(scope, paymentId) : [];
    if (csrf.length > 0) await this.withholding!.service.assertEstornavel(scope, csrf);
    const csrfCents = csrf.filter((l) => l.settlementId).reduce((s, l) => s + Number(l.amountCents), 0);

    // Review #307 F1 — check what the release gate will check BEFORE the ledger reversal, so a
    // rejected command has mutated nothing. The in-tx `releaseSettlement` below stays authoritative;
    // this read only prevents the "400 after the estorno was posted" window for a breach that is
    // already visible. A settlement in flight (PAYING) is NOT a reason to refuse: the decrement is
    // atomic and the status is left to that settlement's finalize (F-PS3 → a, any order).
    const cents = centsFromDb(payment.amountCents) + csrfCents;
    const current = await this.payableRepo.findById(scope, payableId);
    if (!current) throw new NotFoundError(`Conta a pagar '${payableId}' não foi encontrada.`);
    if (centsFromDb(current.paidCents) < cents) {
      throw new ValidationError(
        'Não foi possível estornar o pagamento: o saldo liquidado não comporta o estorno (invariante paidCents ≥ recibo violado).',
      );
    }

    const settlement = await this.posting.findEntryBySource(scope, AP_PAYMENT_SOURCE_TYPE, paymentId);
    let reversalEntryId: string | null = null;
    if (settlement) {
      const { reversal } = await this.posting.reverseEntry(scope, {
        unitId: scope.unitId,
        lancamentoId: settlement.id,
        reversalPostingDate: dto.reversalDate,
        reason: dto.reason || `Cancelamento do pagamento ${paymentId} da conta a pagar ${payableId}`,
        automaticWriter: true,
      });
      reversalEntryId = reversal.id;
    }
    // RETENCOES-FONTE PR-2 (item 21): estorno, no razão, das baixas sem caixa da CSRF desta parcela (idempotente).
    await this.reverterLancamentosDeRetencao(scope, csrf, dto);

    // The reversal above runs in PostingService's own tx (commit 1, reverseEntry takes no `tx`); the balance/status change lives in
    // ONE tx (commit 2, shared with the reconcile re-drive), so decrement + recompute never split. A crash in between is converged
    // by re-running cancelPayment (reverseEntry is idempotent) or by reconcilePayables (reverse direction).
    return (await this.completePaymentCancellation(scope, payment, csrf, reversalEntryId, dto.reason)).payment;
  }

  /**
   * COMMIT 2 do estorno do pagamento (subrazão): flip ACTIVE→CANCELLED + CSRF da parcela + devolução do saldo + status +
   * auditoria numa tx. Compartilhado por `cancelPayment` e pelo re-drive do reconcile (lançamento já `Reversed`, pagamento
   * ainda ACTIVE). Invariante violado com o razão JÁ estornado ⇒ erro com `PAYMENT_REVERSAL_INVARIANT_CODE`: a tx desfaz tudo
   * e o reconcile conta como BLOCKED, em vez de retentar para sempre.
   */
  private async completePaymentCancellation(
    scope: AccountingScope,
    payment: PayablePayment,
    csrf: readonly TaxWithholding[],
    reversalEntryId: string | null,
    reason: string | undefined,
  ): Promise<{ payment: PayablePayment; completed: boolean }> {
    const paymentId = payment.id;
    const payableId = payment.payableId;
    return this.payableRepo.runTransaction(async (tx) => {
      // Authoritative idempotency gate INSIDE the tx (review #307 F8): the out-of-tx "already
      // CANCELLED" read is a fast path only. Two concurrent cancels of the same payment both
      // pass it; only the one that flips ACTIVE → CANCELLED here gives the cents back.
      const flipped = await this.payableRepo.cancelPaymentIfActive(scope, paymentId, tx);
      if (flipped === 0) {
        const already = await this.payableRepo.findPaymentById(scope, paymentId, tx);
        if (!already) throw new NotFoundError(`Pagamento '${paymentId}' não foi encontrado.`);
        await this.pendingRecorder?.resolve(scope, PAYMENT_CANCEL_PENDING_SOURCE_TYPE, paymentId, tx);
        return { payment: already, completed: false }; // idempotent — no release, no second audit
      }
      const cancelled = { ...payment, status: 'CANCELLED' };
      // RETENCOES-FONTE PR-2 (item 21): a CSRF da parcela sai na mesma tx (título de imposto encolhe; baixado ⇒ 409).
      const liberadoCsrf = csrf.length > 0 ? await this.withholding!.service.reverterNaTx(scope, csrf, tx) : 0;
      // F-PS3 → a: atomic decrement — the only refusal is the invariant (`paidCents >= cents`); the
      // pre-check in cancelPayment already screened it, so a 0 here is a race that broke the invariant.
      const released = await this.payableRepo.releaseSettlement(scope, payableId, centsFromDb(payment.amountCents) + liberadoCsrf, tx);
      if (released === 0) {
        throw new ValidationError(
          'Não foi possível estornar o pagamento: o saldo liquidado não comporta o estorno (invariante violado).',
          null,
          PAYMENT_REVERSAL_INVARIANT_CODE,
        );
      }
      const row = await this.payableRepo.findById(scope, payableId, tx);
      if (!row) throw new NotFoundError(`Conta a pagar '${payableId}' não foi encontrada.`);
      // While another settlement is in flight the status belongs to ITS finalize (it reads the
      // balance already decremented here); otherwise recompute it from the re-read row.
      if (row.status !== 'PAYING') {
        // Guarda defensiva (BRIEF item 9): a reversal can never leave the title fully paid again.
        const status = payableStatusForBalance(centsFromDb(row.paidCents), centsFromDb(row.amountCents));
        if (status === 'PAID') {
          throw new ValidationError(
            'Estorno inconsistente: o saldo continuaria integralmente pago após o estorno.',
            null,
            PAYMENT_REVERSAL_INVARIANT_CODE,
          );
        }
        assertPayableRecalc(row.status, status);
        await this.payableRepo.updatePayable(scope, payableId, { status }, tx);
      } else if (centsFromDb(row.paidCents) === 0) {
        // PAYING é de um pagamento em trânsito, e o claim soma os centavos DELE em paidCents na mesma CAS: saldo 0 ⇒ não há
        // pagamento em trânsito (era este, preso por um crash). Sem isto o título ficaria PAYING para sempre.
        await this.payableRepo.updatePayable(scope, payableId, { status: 'OPEN' }, tx);
      }
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: 'payable.settlement_cancelled',
        targetType: 'payable',
        targetId: payableId,
        payload: { payableId, paymentId, reversalEntryId, reason },
      });
      // CANCELLING PR-0 (0.6): concluir por qualquer caminho fecha a pendência `payment.cancel` na mesma tx (hoje só o `rescan` a resolvia).
      await this.pendingRecorder?.resolve(scope, PAYMENT_CANCEL_PENDING_SOURCE_TYPE, paymentId, tx);
      return { payment: cancelled, completed: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Reconcile (re-drive safety net — D4 / ADR §6.2)
  // ---------------------------------------------------------------------------

  /**
   * Re-drive missing recognitions/settlements for the scope. postEntry is idempotent on sourceId,
   * so re-posting is safe; the finalize (entryId + PAID) is applied when a settlement exists but
   * its payable/payment never got finalized (crash between the post and the finalize tx).
   * Returns what it repaired. Best-effort per item: one failing payable does not abort the pass.
   */
  async reconcilePayables(
    scope: AccountingScope,
    // CANCELLING PR-0 (0.7): `CANCELLING` mais novo que o `grace` pode ainda estar na mão de quem pediu o cancelamento; padrão 0 (a rota manual age
    // na hora — os passos são idempotentes). O job de re-drive (PR-2) passa o `SUBLEDGER_REDRIVE_GRACE_MS`.
    options: { cancellingGraceMs?: number } = {},
  ): Promise<{ recognitionsPosted: number; settlementsPosted: number; finalized: number; reversalsCompleted: number; blocked: number; failed: number }> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a pagar.');
    }
    let recognitionsPosted = 0;
    let settlementsPosted = 0;
    let finalized = 0;
    let reversalsCompleted = 0;
    let blocked = 0;
    let failed = 0;

    // 1. Every live, non-cancelled payable must carry its recognition entry.
    const payables = await this.payableRepo.findAllActive(scope);
    for (const payable of payables) {
      // CANCELLING PR-0 (0.7): o passo 1 re-receberia o estoque de uma compra que o cancelamento já desfez (`receiveStock` abaixo) — o 1b é o dono.
      if (payable.status === 'CANCELLED' || payable.status === 'CANCELLING') continue;
      // RETENCOES-FONTE PR-2 (F-RET-11 a): título de imposto não tem reconhecimento próprio.
      if (payable.origin === PAYABLE_ORIGIN_WITHHOLDING_TAX) continue;
      const recognition = await this.posting.findEntryBySource(scope, AP_PAYABLE_SOURCE_TYPE, payable.id);

      // INCR-INVENTORY D3(b) twin (Gap 2/Gate 8): an inventory PURCHASE carries expenseAccountId=null
      // and debits 1.1.6 Estoques. It must NOT be resolved by expenseAccountId (=null → the pre-inventory
      // path skipped it, orphaning the row). Re-post the missing recognition (D 1.1.6 / C 2.1.2) AND
      // re-drive the possibly-missing INBOUND (idempotent by read-first on payableId), so the tie-out
      // Σ==saldo(1.1.6) closes after a crash between the two txs.
      if (isInventoryPurchase(payable)) {
        try {
          if (!recognition) {
            await this.posting.postEntry(scope, this.buildRecognitionInputFromRow(scope, payable, null));
            recognitionsPosted += 1;
          }
          // SINGLE-SKU only, and this is a LIMIT OF THE DATA, not a policy: the row carries the one
          // product+qty to re-receive, while a MULTI-ITEM NF-e purchase keeps its per-SKU breakdown
          // OUTSIDE the row (and nowhere else persisted). Reconcile therefore CANNOT reconstruct the N
          // receiveStock from the Payable alone — it re-drives the RECOGNITION (above, the money
          // invariant / tie-out anchor) but not the subledger detail. The re-drive of a partially
          // received multi-item note is `receiveInventoryItems` (public, idempotent per SKU on
          // sourceId=payableId), which the holder of the breakdown (the NF-e import) can call again with
          // the SAME items. Closing this fully inside reconcile would require PERSISTING the breakdown
          // (a migration — out of scope here); until then the residual is named, not hidden.
          if (this.inventoryService && hasSingleInventorySku(payable)) {
            await this.inventoryService.receiveStock(scope, {
              productRef: payable.inventoryProductRef!,
              qty: payable.inventoryQty!,
              totalValueCents: centsFromDb(payable.amountCents),
              occurredAt: payable.issueDate,
              sourceType: INVENTORY_INBOUND_SOURCE_TYPE,
              sourceId: payable.id,
              description: payable.description,
            });
          } else if (this.inventoryService && !hasSingleInventorySku(payable)) {
            // DECISÃO DO DONO 2026-08-22 (BE-INCR-NFE-integration-plan.md §2.4): the multi-item skip
            // above COUNTS AS BLOCKED. It is a deterministic, by-design limit (the breakdown is not on
            // the row), not an error — `failed` would be a permanent false alarm, and a silent skip is
            // the param-aceito-e-ignorado class: the payable exists, nobody re-receives, nobody is told.
            // Implemented as path (i) — increment directly in the skipping branch, no invented throw.
            blocked += 1;
            logger.warn('AP reconcile: multi-item inventory purchase re-drive blocked — per-SKU breakdown lives outside the row (re-drive via receiveInventoryItems)', {
              payableId: payable.id, code: 'MULTI_ITEM_NOT_SINGLE_SKU',
            });
          }
          // F-D2=(b): re-dirige também o espelho FÍSICO (idempotente por detailKey no port).
          // PR #267 C2: só quando a linha carrega o SKU — no multi-item o breakdown não está na row
          // (mesmo limite de dado do skip acima, decisão do dono 2026-08-22), então não há o que re-dirigir.
          if (hasSingleInventorySku(payable)) {
            await this.drivePhysicalInbound(
              scope,
              payable.id,
              payable.inventoryProductRef!,
              payable.inventoryQty!,
              centsFromDb(payable.amountCents),
              payable.issueDate,
              payable.unitId,
            );
          }
        } catch (error) {
          // TRIAGEM-AUDIT-2026-08-15 A4 — a skip-listed deterministic code (period-closed /
          // MAX_CENTS poison, same discipline as the sync bridges) is BLOCKED, never a bug; anything
          // else is a genuinely unexpected FAILURE. Both used to collapse into the same silent warn,
          // making {0,0,0} indistinguishable from "every item this pass hit a real error".
          const skipCode = reconcileBlockedCode(error);
          if (skipCode) {
            blocked += 1;
            logger.warn('AP reconcile: inventory purchase re-drive blocked — deterministic non-retriable code', {
              payableId: payable.id, code: skipCode,
            });
          } else {
            failed += 1;
            logger.warn('AP reconcile: inventory purchase re-drive failed', { payableId: payable.id, error });
          }
        }
        continue;
      }

      if (recognition) continue;
      // An ordinary expense payable with no expense account cannot be recognized (defensive skip).
      if (!payable.expenseAccountId) continue;
      try {
        const expenseAccount = await this.accountRepo.findById(scope, payable.expenseAccountId);
        if (!expenseAccount) {
          logger.warn('AP reconcile: expense account missing, skipping recognition re-drive', {
            payableId: payable.id,
          });
          continue;
        }
        await this.posting.postEntry(scope, this.buildRecognitionInputFromRow(scope, payable, expenseAccount));
        recognitionsPosted += 1;
      } catch (error) {
        const skipCode = reconcileBlockedCode(error);
        if (skipCode) {
          blocked += 1;
          logger.warn('AP reconcile: recognition re-drive blocked — deterministic non-retriable code', {
            payableId: payable.id, code: skipCode,
          });
        } else {
          failed += 1;
          logger.warn('AP reconcile: recognition re-drive failed', { payableId: payable.id, error });
        }
      }
    }

    // 1b. CANCELLING PR-0 (0.7, 69c7): título com a intenção de cancelar gravada e o cancelamento não concluído — repete só o idempotente
    // (estoque, físico, retenções e reconhecimento no razão) e conclui `CANCELLING → CANCELLED`. Erro determinístico/período ⇒ BLOCKED (e pendência, 0.9).
    const graceMs = options.cancellingGraceMs ?? 0;
    for (const payable of payables) {
      if (payable.status !== 'CANCELLING') continue;
      if (graceMs > 0 && Date.now() - payable.updatedAt.getTime() < graceMs) continue;
      const result = await this.driveCancellingSafely(scope, payable);
      if (result.outcome === 'completed') {
        reversalsCompleted += 1;
      } else if (result.outcome === 'blocked') {
        blocked += 1;
        logger.warn('AP reconcile: cancelamento em CANCELLING bloqueado — código determinístico/período', { payableId: payable.id, code: result.code });
      } else {
        failed += 1;
        logger.warn('AP reconcile: cancelamento em CANCELLING falhou — próxima passada tenta de novo', { payableId: payable.id });
      }
    }

    // 2. Every active payment must carry its settlement entry AND its payable must be finalized.
    const payments = await this.payableRepo.findAllActivePayments(scope);
    for (const payment of payments) {
      try {
        // RETENCOES-FONTE PR-2 (item 21): baixa sem caixa da retenção sem lançamento ⇒ posta (idempotente por paymentId).
        // A conta a recolher vem do perfil fiscal atual. Não finaliza nada: o PAYING é do PAYMENT que a acompanha.
        if (payment.kind === WITHHOLDING_KIND) {
          if (this.withholding && !(await this.posting.findEntryBySource(scope, AP_WITHHOLDING_SOURCE_TYPE, payment.id))) {
            const tw = await this.withholding.repo.findBySettlement(scope, payment.id);
            const payable = await this.payableRepo.findById(scope, payment.payableId);
            if (!tw || !payable) continue;
            // Review A6: a conta é a do título de imposto (a que a baixa do DARF vai debitar); sem título, a do perfil atual.
            const titulo = tw.taxPayableId ? await this.payableRepo.findById(scope, tw.taxPayableId) : null;
            const doTitulo = titulo?.liabilityAccountId ? await this.accountRepo.findById(scope, titulo.liabilityAccountId) : null;
            const conta = doTitulo ?? (await this.withholding.service.contaParaBaixa(scope, tw.tributo as TaxWithholdingTributo));
            const entry = await this.posting.postEntry(
              scope,
              this.buildWithholdingInput(scope, payable, payment.id, centsFromDb(payment.amountCents), conta.code, this.toDateOnly(payment.paidAt), tw.tributo),
            );
            await this.payableRepo.updatePayment(scope, payment.id, { entryId: entry.id });
            await this.withholding.repo.setEntryId(scope, tw.id, entry.id);
            settlementsPosted += 1;
          }
          continue;
        }
        let settlement = await this.posting.findEntryBySource(scope, AP_PAYMENT_SOURCE_TYPE, payment.id);
        // DIREÇÃO REVERSA (Onda 2.1): o razão já estornou o pagamento (commit 1 de um cancelPayment) e ele segue ACTIVE ⇒ conclui o
        // estorno no subrazão. NUNCA cai no finalize abaixo: finalizar como pago um lançamento Reversed reabriria a divergência.
        if (settlement && isReversedEntry(settlement)) {
          if (await this.completeReversedPayment(scope, payment, settlement)) reversalsCompleted += 1;
          continue;
        }
        if (!settlement) {
          const payable = await this.payableRepo.findByIdWithPayments(scope, payment.payableId);
          if (!payable) continue;
          const creditCode = resolvePaymentMethodAccount(payment.method);
          settlement = await this.posting.postEntry(
            scope,
            this.buildSettlementInputFromRow(scope, payable, payment, creditCode, await this.settlementDebitCode(scope, payable)),
          );
          settlementsPosted += 1;
        }
        // Finalize atomically — link the entry, mark PAID, and re-emit the AP-domain audit event
        // that the crashed normal-path finalize tx never wrote. The ledger 'entry.posted' audit
        // already exists (postEntry's own tx), so the hash-chain is intact; this restores the
        // 'payable.settlement_registered' domain trail so a reconcile-finalized payment is
        // indistinguishable from a normally-paid one. The audit is tied to the PAYING→PAID|PARTIALLY_PAID
        // transition, which happens exactly once per payment (normal path OR here) — so repeated
        // reconcile passes never double-emit (once finalized, the row is no longer PAYING).
        const payable = await this.payableRepo.findById(scope, payment.payableId);
        const settlementEntryId = settlement.id;
        const needsEntryLink = payment.entryId !== settlementEntryId;
        const maybeFinalize = payable?.status === 'PAYING'; // preliminary read — the CAS below is authoritative
        if (needsEntryLink || maybeFinalize) {
          await this.payableRepo.runTransaction(async (tx) => {
            if (needsEntryLink) {
              await this.payableRepo.updatePayment(scope, payment.id, { entryId: settlementEntryId }, tx);
            }
            // Atomic PAYING→PAID|PARTIALLY_PAID by balance: emit + count ONLY when THIS pass performed
            // the transition. Closes the double-emit under two overlapping reconcile passes (or a
            // reconcile-vs-normal race). Under PAYING `payable.paidCents` already holds this payment.
            const flipped = payable
              ? await this.payableRepo.finalizeIfPaying(scope, payment.payableId, centsFromDb(payable.amountCents), tx)
              : 0;
            if (flipped === 1) {
              const paidCentsAfter = centsFromDb(payable!.paidCents);
              await this.auditService.append(tx, scope, {
                actorUserId: scope.actorUserId,
                eventType: 'payable.settlement_registered',
                targetType: 'payable',
                targetId: payment.payableId,
                payload: {
                  payableId: payment.payableId,
                  paymentId: payment.id,
                  amountCents: String(payment.amountCents),
                  method: payment.method,
                  entryId: settlementEntryId,
                  paidCentsAfter: String(paidCentsAfter),
                  remainingCents: String(centsFromDb(payable!.amountCents) - paidCentsAfter),
                },
              });
              finalized += 1;
            }
          });
        }
      } catch (error) {
        const skipCode = reconcileBlockedCode(error);
        if (skipCode) {
          blocked += 1;
          logger.warn('AP reconcile: settlement re-drive blocked — deterministic non-retriable code', {
            paymentId: payment.id, code: skipCode,
          });
          // CANCELLING PR-0 (0.9, 9d3e): o BLOCKED determinístico da direção reversa fica gravado na bandeja e alerta na 1ª captura.
          await this.recordPaymentCancelBlocked(scope, payment.id, skipCode, error);
        } else {
          failed += 1;
          logger.warn('AP reconcile: settlement re-drive failed', { paymentId: payment.id, error });
        }
      }
    }

    logger.info('AP reconcile pass complete', { recognitionsPosted, settlementsPosted, finalized, reversalsCompleted, blocked, failed });
    return { recognitionsPosted, settlementsPosted, finalized, reversalsCompleted, blocked, failed };
  }

  /**
   * DIREÇÃO REVERSA do pagamento (Onda 2.1): o lançamento `ap.payment` já está `Reversed` e o pagamento segue ACTIVE ⇒ conclui o estorno no
   * subrazão (CSRF da parcela + saldo + status + auditoria numa tx). `true` = esta chamada concluiu. Lança o BLOCKED determinístico
   * (`PAYMENT_REVERSAL_INVARIANT_CODE`, `IMPOSTO_JA_RECOLHIDO`) — quem chama decide contar/registrar.
   */
  private async completeReversedPayment(scope: AccountingScope, payment: PayablePayment, settlement: { id: string; reversedById: string | null }): Promise<boolean> {
    const csrf = this.withholding ? await this.withholding.repo.findActiveByOriginSettlement(scope, payment.id) : [];
    // Mesmo pré-cheque do cancelPayment (review #307 F1) ANTES de qualquer estorno do razão da CSRF: invariante já quebrado ⇒ BLOCKED sem escrever.
    const csrfCents = csrf.filter((l) => l.settlementId).reduce((sum, l) => sum + Number(l.amountCents), 0);
    const current = await this.payableRepo.findById(scope, payment.payableId);
    if (!current || centsFromDb(current.paidCents) < centsFromDb(payment.amountCents) + csrfCents) {
      throw new ValidationError(
        'Não foi possível estornar o pagamento: o saldo liquidado não comporta o estorno (invariante violado).',
        null,
        PAYMENT_REVERSAL_INVARIANT_CODE,
      );
    }
    if (csrf.length > 0) {
      // Mesma ordem do cancelPayment: imposto já recolhido ⇒ 409 (BLOCKED) antes de mexer; depois o estorno idempotente do razão da CSRF,
      // na data do estorno que o razão já tem (período fechado ⇒ ACCOUNTING_PERIOD_NOT_OPEN ⇒ BLOCKED).
      await this.withholding!.service.assertEstornavel(scope, csrf);
      const reversal = await this.posting.findEntryBySource(scope, 'reversal', settlement.id);
      const reversalDate = reversal ? reversal.date.toISOString().slice(0, 10) : scopeToday(scope);
      await this.reverterLancamentosDeRetencao(scope, csrf, { reversalDate, reason: RECONCILE_REVERSAL_REASON });
    }
    return (await this.completePaymentCancellation(scope, payment, csrf, settlement.reversedById, RECONCILE_REVERSAL_REASON)).completed;
  }

  /**
   * Re-drive de UM pagamento ativo cujo lançamento já foi estornado (o que o `retryOneReconcilePendingItem` chama para `payment.cancel`).
   * `completed` = concluído agora OU nada a concluir (pagamento já cancelado / lançamento não estornado: a pendência é obsoleta).
   * O BLOCKED determinístico sobe como erro (o `rescan` o trata como "continua pendente").
   */
  async redrivePaymentCancellation(scope: AccountingScope, paymentId: string): Promise<{ outcome: 'completed' | 'still_pending' }> {
    if (!this.policy.canManagePayable(scope)) {
      throw new ForbiddenError('Você não tem permissão para reconciliar contas a pagar.');
    }
    const payment = await this.payableRepo.findPaymentById(scope, paymentId);
    if (!payment || payment.status !== 'ACTIVE') return { outcome: 'completed' };
    const settlement = await this.posting.findEntryBySource(scope, AP_PAYMENT_SOURCE_TYPE, paymentId);
    if (!settlement || !isReversedEntry(settlement)) return { outcome: 'completed' };
    await this.completeReversedPayment(scope, payment, settlement);
    return { outcome: 'completed' };
  }

  /** Item 0.9 — só os BLOCKED determinísticos da direção reversa viram pendência `payment.cancel` (poison ⇒ alerta na 1ª captura). */
  private async recordPaymentCancelBlocked(scope: AccountingScope, paymentId: string, code: string, error: unknown): Promise<void> {
    if (code !== PAYMENT_REVERSAL_INVARIANT_CODE && code !== 'IMPOSTO_JA_RECOLHIDO') return;
    await this.pendingRecorder?.record(scope, {
      sourceType: PAYMENT_CANCEL_PENDING_SOURCE_TYPE,
      sourceId: paymentId,
      reasonCode: code,
      reasonDetail: error instanceof Error ? error.message : String(error),
      alert: 'permanent',
    });
  }

  /**
   * `IFixedAssetDraftRedriver` (execution-plan Passo 13/28) — o gancho que
   * `DepreciationService.reconcile` chama para `draftsCreated`. Para cada payable ATIVO
   * (`inventoryMultiItem=true`, o único modo que carrega itens de imobilizado): acha a recognition
   * (`this.posting.findEntryBySource`); se ela existe, relê o `SourceDocument.rawJson` vinculado
   * (`sourceProvenanceRepo.findSourcesByEntry`) — **nunca** uma 2ª cópia do breakdown na linha do
   * Payable (decisão do dono 23/09); se o JSON tem `fixedAssetItems`, chama
   * `createDraftFromPayable` (read-first por `sourceItemRef` — item já rascunhado é PULADO, então
   * chamar de novo para TODOS os payables em toda passada é seguro e idempotente, nunca duplica).
   * Sem `fixedAssetDraftCreator`/`sourceProvenanceRepo` wired, devolve 0 (degrada, não lança —
   * mesma disciplina do resto do reconcile best-effort).
   */
  async redriveMissingDrafts(scope: AccountingScope): Promise<number> {
    if (!this.fixedAssetDraftCreator || !this.sourceProvenanceRepo) return 0;
    if (!this.policy.canManagePayable(scope)) return 0;
    let created = 0;
    const payables = await this.payableRepo.findAllActive(scope);
    for (const payable of payables) {
      if (payable.status === 'CANCELLED' || payable.status === 'CANCELLING' || !payable.inventoryMultiItem) continue;
      try {
        const entry = await this.posting.findEntryBySource(scope, AP_PAYABLE_SOURCE_TYPE, payable.id);
        if (!entry) continue; // sem recognition ainda — nada a reler (residual named acima).
        const sources = await this.sourceProvenanceRepo.findSourcesByEntry(scope, entry.id);
        const doc = sources[0]?.sourceDocument;
        if (!doc?.rawJson) continue;
        const parsed = JSON.parse(doc.rawJson) as { fixedAssetItems?: StoredFixedAssetItem[] };
        // C8 emenda 3.2 (E5): o item EXPENSE foi para a despesa — re-rascunhá-lo ativaria o que o usuário expensou.
        const capitalized = (parsed.fixedAssetItems ?? []).filter((i): i is ResolvedFixedAssetItem => !isExpensedFixedAssetItem(i));
        if (capitalized.length === 0) continue;
        const result = await this.fixedAssetDraftCreator.createDraftFromPayable(
          scope,
          payable,
          await this.taxaPosLegalParams(scope, capitalized),
          doc.id,
        );
        created += result.created;
      } catch (error) {
        logger.warn('AP redriveMissingDrafts: payable falhou — próxima passada tenta de novo', {
          payableId: payable.id,
          error,
        });
      }
    }
    return created;
  }

  /**
   * BE-INCR-LEGAL-PARAMS PR-3 (review independente, achado 1): `rawJson` gravado ANTES do PR-3 não tem
   * `legalParameterId`, e o `rateId` dele aponta para uma linha ANEXO_* por escopo que a migração apagou (só sobram
   * as referenciadas por bem — este item ainda não tinha bem). Sem isto o rascunho falharia no FK em toda passada.
   * Item assim é reconduzido pelo MESMO casamento por NCM do create (`resolveRateForNcm`) no catálogo atual; um
   * `rateId` CUSTOM que ainda existe fica como está. Item já no formato do PR-3 passa intacto.
   */
  private async taxaPosLegalParams(scope: AccountingScope, items: ResolvedFixedAssetItem[]): Promise<ResolvedFixedAssetItem[]> {
    const legado = (i: ResolvedFixedAssetItem) => i.legalParameterId === undefined && !!i.rateId;
    if (!items.some(legado) || !this.depreciationRateCatalog) return items;
    const rates = await this.depreciationRateCatalog.catalogo(scope, true);
    return items.map((item) => {
      if (!legado(item)) return item;
      if (rates.some((r) => r.origem === 'ESCOPO' && r.id === item.rateId)) return { ...item, legalParameterId: null };
      const { rateId: escolhida } = resolveRateForNcm(rates, item.ncm, item.cProd);
      return { ...item, ...taxaEscolhidaDe(rates.find((r) => r.id === escolhida)!), annualRateBp: item.annualRateBp };
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the SUPPLIER identity this payable links to — NEVER null (SEC-A1-5 / F-NN1(a)). A
   * body-supplied counterpartyId is re-scoped (SEC-A1-1: a cross-tenant id resolves to null via the
   * scoped findById and is rejected here) and must be a SUPPLIER; with no id, `supplierName` finds or
   * mints the catalog identity. Shared with AR — see `counterpartyResolution.ts` for the invariants.
   */
  private async resolveOrCreateCounterpartyId(
    scope: AccountingScope,
    dto: CreatePayableInput,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    return resolveOrCreateCounterpartyId(
      { counterpartyRepo: this.counterpartyRepo, auditService: this.auditService, policy: this.policy },
      scope,
      'SUPPLIER',
      dto.counterpartyId,
      dto.supplierName,
      'A contraparte de uma conta a pagar deve ser um fornecedor (SUPPLIER).',
      tx,
    );
  }

  private async resolveExpenseAccount(scope: AccountingScope, accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(scope, accountId);
    if (!account) {
      throw new ValidationError('Conta de despesa informada não existe nesta unidade.');
    }
    if (account.nature !== 'Expense') {
      throw new ValidationError('A contrapartida deve ser uma conta de despesa (nature=Expense).');
    }
    if (account.acceptsEntries === false) {
      throw new ValidationError('A conta de despesa deve ser analítica (aceita lançamentos).');
    }
    return account;
  }

  /**
   * Debit account code of the recognition: an inventory purchase debits `1.1.6 Estoques` (D3(b)); an
   * ordinary expense payable debits its resolved Expense leaf. `expenseAccount` is null exactly when
   * the payable is an inventory purchase (createPayable/reconcile pass it accordingly).
   */
  private recognitionDebitCode(payable: Payable, expenseAccount: Account | null): string {
    if (isInventoryPurchase(payable)) return ESTOQUES_CODE;
    if (!expenseAccount) {
      // Defensive: a non-inventory payable without an expense account cannot be recognized.
      throw new ValidationError('Conta de despesa ausente para o reconhecimento da conta a pagar.');
    }
    return expenseAccount.code;
  }

  private buildRecognitionInput(
    scope: AccountingScope,
    payable: Payable,
    expenseAccount: Account | null,
    dto: CreatePayableInput,
    fixedAssetLines: ResolvedFixedAssetItem[],
    insumoLines: { accountCode: string; costCents: number }[] = [],
    expensedLines: ResolvedExpensedFixedAssetItem[] = [],
  ): PostEntryInput {
    const storedItems: StoredFixedAssetItem[] = [...fixedAssetLines, ...expensedLines];
    return {
      unitId: scope.unitId,
      date: dto.issueDate,
      description: this.recognitionDescription(payable),
      auditDescription: this.recognitionAuditDescription(payable),
      sourceType: AP_PAYABLE_SOURCE_TYPE,
      automaticWriter: true,
      sourceId: payable.id,
      sourceDocument: {
        externalRef: dto.documentNumber,
        documentDate: dto.issueDate,
        attachmentId: dto.attachmentId,
        // BE-INCR-FIXED-ASSETS PR-5 (decisão do dono 23/09): o breakdown do modo 4 vai AQUI (campo
        // já existente do SourceDocument, reuso — NENHUMA coluna nova no Payable). O re-drive do
        // rascunho (`redriveFixedAssetDrafts`) relê este `rawJson` pelo `sourceDocumentId` da entry.
        // C8 emenda 3.2 (E5): os itens EXPENSE vão junto, com `treatment` — trilha da escolha (PN CST 100/78 item 13).
        rawJson: storedItems.length > 0 ? JSON.stringify({ fixedAssetItems: storedItems }) : undefined,
      },
      lines: this.recognitionLines(
        payable,
        expenseAccount,
        dto.amountCents,
        this.parseRecoverableLines(payable),
        // C8 emenda 3.2 (E5): o item EXPENSE debita a folha de despesa pelo MESMO agrupamento por `accountCode`.
        this.groupFixedAssetDebits(storedItems),
        this.groupFixedAssetDebits(insumoLines),
      ),
    };
  }

  /**
   * X6 F-X6-8 (a) + BE-INCR-FIXED-ASSETS PR-5 (F-FA12 → a): `D estoque/despesa (amountCents − Σ
   * recuperáveis − Σ imobilizado) + D conta(s) a recuperar + D conta(s) do imobilizado (class.costAccountId,
   * agrupada por conta) / C fornecedores (amountCents)`. Uma nota mista gera 2 débitos (1.1.6 + 1.2.x);
   * uma nota 100% CFOP 1551/2551 tem o débito principal ZERADO — a linha é OMITIDA (postEntry rejeita
   * linha de valor zero) e só as linhas de imobilizado carregam o débito. Sem linhas extra é o par de
   * sempre. Os códigos vêm resolvidos no create (`resolveRecoverableLines`/`resolveFixedAssetLines`) e
   * persistidos na linha para o re-drive.
   * ITEM-DESTINATION (F-ID-3 a): `insumo` = D conta(s) de despesa do insumo do serviço (agrupada por conta),
   * subtraída do débito principal como o imobilizado; nota 100% insumo omite a linha de 1.1.6.
   */
  private recognitionLines(
    payable: Payable,
    expenseAccount: Account | null,
    amountCents: number,
    recoverable: { accountCode: string; amountCents: number }[],
    fixedAsset: { accountCode: string; amountCents: number }[] = [],
    insumo: { accountCode: string; amountCents: number }[] = [],
  ): PostEntryInput['lines'] {
    const recoverableSum = recoverable.reduce((a, l) => a + l.amountCents, 0);
    const fixedAssetSum = fixedAsset.reduce((a, l) => a + l.amountCents, 0);
    const insumoSum = insumo.reduce((a, l) => a + l.amountCents, 0);
    const mainDebitCents = amountCents - recoverableSum - fixedAssetSum - insumoSum;
    const lines: PostEntryInput['lines'] = [];
    if (mainDebitCents > 0) {
      lines.push({ accountCode: this.recognitionDebitCode(payable, expenseAccount), debitCents: mainDebitCents, creditCents: 0 });
    }
    lines.push(...recoverable.map((l) => ({ accountCode: l.accountCode, debitCents: l.amountCents, creditCents: 0 })));
    lines.push(...fixedAsset.map((l) => ({ accountCode: l.accountCode, debitCents: l.amountCents, creditCents: 0 })));
    lines.push(...insumo.map((l) => ({ accountCode: l.accountCode, debitCents: l.amountCents, creditCents: 0 })));
    lines.push({ accountCode: FORNECEDORES_A_PAGAR_CODE, debitCents: 0, creditCents: amountCents });
    return lines;
  }

  private parseRecoverableLines(payable: Payable): { accountCode: string; amountCents: number }[] {
    const raw = (payable as Payable & { recoverableTaxLines?: string | null }).recoverableTaxLines;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRecoverableLine[];
    // IBS-CBS-2027 PR-3: a linha de IBS/CBS só de memória (crédito 0, só uso/consumo) não vira débito.
    return parsed.filter((l) => l.amountCents > 0 && l.accountCode !== null).map((l) => ({ accountCode: l.accountCode!, amountCents: l.amountCents }));
  }

  /** Groups the item-level breakdown by `accountCode` (Σ per class' costAccountId) into the recognition
   *  debit lines (item 21: "debita class.costAccountId por item" — several items of the same class
   *  fold into ONE line, several classes ⇒ several lines). */
  private groupFixedAssetDebits(
    items: { accountCode: string; costCents: number }[],
  ): { accountCode: string; amountCents: number }[] {
    const byAccount = new Map<string, number>();
    for (const it of items) {
      byAccount.set(it.accountCode, (byAccount.get(it.accountCode) ?? 0) + it.costCents);
    }
    return [...byAccount.entries()].map(([accountCode, amountCents]) => ({ accountCode, amountCents }));
  }

  /** ITEM-DESTINATION item 11: cada `insumoItems[].accountId` é folha Expense do escopo (reusa o gate do
   *  `expenseAccountId`); devolve o código por item para o débito agrupado. Uma leitura por conta distinta.
   *  INSUMO-INVENTARIO-PERIODICO item 3: com `stock: true` a conta é o estoque de insumo, folha de ATIVO. */
  private async resolveInsumoLines(
    scope: AccountingScope,
    dto: CreatePayableInput,
  ): Promise<{ accountCode: string; costCents: number }[]> {
    const codeById = new Map<string, string>();
    const out: { accountCode: string; costCents: number }[] = [];
    for (const item of dto.insumoItems ?? []) {
      if (!codeById.has(item.accountId)) {
        const account = item.stock
          ? await this.resolveInsumoStockLeaf(scope, item.accountId)
          : await this.resolveExpenseAccount(scope, item.accountId);
        codeById.set(item.accountId, account.code);
      }
      out.push({ accountCode: codeById.get(item.accountId)!, costCents: item.costCents });
    }
    return out;
  }

  /** INSUMO-INVENTARIO-PERIODICO item 3: estoque de insumo = folha de ATIVO do escopo, nunca a `Estoques` da revenda
   *  (o tie-out LAC-E soma só o subrazão de InventoryItem nela). */
  private async resolveInsumoStockLeaf(scope: AccountingScope, accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(scope, accountId);
    if (!account || account.deletedAt) throw new ValidationError(`Conta de estoque de insumo '${accountId}' não existe neste escopo.`);
    if (!account.acceptsEntries || account.nature !== 'Asset') {
      throw new ValidationError(`Conta de estoque de insumo '${account.code}' precisa ser folha de ATIVO (natureza ${account.nature}).`);
    }
    if (account.code === ESTOQUES_CODE) {
      throw new ValidationError(`Conta de estoque de insumo '${account.code}' é o estoque de revenda — use uma conta de ativo própria.`);
    }
    return account;
  }

  /** X6: valida as contas a recuperar (existem no escopo, folha, natureza Asset) e devolve o que se persiste. */
  private async resolveRecoverableLines(
    scope: AccountingScope,
    dto: CreatePayableInput,
  ): Promise<StoredRecoverableLine[]> {
    const out: StoredRecoverableLine[] = [];
    for (const line of dto.recoverableTaxLines ?? []) {
      if (isIbsCbsCreditLine(line)) {
        // IBS-CBS-2027 PR-3 (item 14): mesma regra da conta X6 (folha de ATIVO do escopo); nasce PENDENTE.
        const accountCode = line.accountId === null ? null : (await this.resolveAssetLeaf(scope, line.accountId)).code;
        out.push({ tributo: line.tributo, accountId: line.accountId, accountCode, amountCents: line.amountCents, status: 'PENDENTE', sourceDocumentId: null, ...(line.usoConsumoCents ? { usoConsumoCents: line.usoConsumoCents } : {}) });
        continue;
      }
      const account = await this.resolveAssetLeaf(scope, line.accountId);
      const { baseCents, pisCents, cofinsCents } = line; // X8 item 5: persistidos quando presentes (JSON, sem migração)
      out.push({ accountId: account.id, accountCode: account.code, amountCents: line.amountCents, kind: line.kind, ...(pisCents !== undefined ? { baseCents, pisCents, cofinsCents } : {}) });
    }
    return out;
  }

  /** X6: conta a recuperar existe no escopo, é folha e de natureza Asset (IBS/CBS a recuperar segue a mesma regra). */
  private async resolveAssetLeaf(scope: AccountingScope, accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(scope, accountId);
    if (!account || account.deletedAt) throw new ValidationError(`Conta a recuperar '${accountId}' não existe neste escopo.`);
    if (!account.acceptsEntries || account.nature !== 'Asset') {
      throw new ValidationError(`Conta a recuperar '${account.code}' precisa ser folha de ATIVO (natureza ${account.nature}).`);
    }
    return account;
  }

  /**
   * BE-INCR-FIXED-ASSETS PR-5 (item 21, F-FA12 → a): resolve `class.costAccountId` de cada item de
   * `fixedAssetItems` — existência da classe (cross-tenant 404-like via `findById` escopado) e da
   * conta (folha, ativo). Wiring ausente falha loud (mesma disciplina de `inventoryService`).
   */
  /**
   * BE-INCR-FIXED-ASSETS PR-5 (item 21, F-FA12 → a; review independente #366, achado 1): resolve
   * `class.costAccountId` E a TAXA de depreciação (`resolveRateForNcm`, casamento por NCM/Anexo
   * III) de cada item de `fixedAssetItems` — **ANTES do tx1** (esta função roda antes de
   * `payableRepo.runTransaction` em `createPayable`). Um NCM sem correspondência única rejeita
   * loud AQUI: nenhum `Payable`, nenhuma `JournalEntry`, nenhum `201` — o achado do review era
   * exatamente o inverso (a validação só rodava dentro de `createDraftFromPayable`, DEPOIS do
   * `postEntry`, e a falha lá era só `logger.warn` best-effort — a nota subia com débito no
   * imobilizado e NUNCA ganhava o `FixedAsset`, e o reconcile falharia para sempre pelo mesmo
   * motivo). `sourceItemRef` (chave do rascunho) é o `nItem` da NF-e — nunca `cProd` (2 linhas de
   * imobilizado podem repetir o `cProd`; um índice de fallback cobre a criação manual sem `nItem`).
   */
  /**
   * C8 emenda 3.2 (E3–E4b): item `treatment: 'EXPENSE'` (IN RFB 1.700 art. 120) pula classe e taxa (E3 ii — um NCM sem
   * taxa não derruba uma compra que nem vai ao ativo); a conta é folha de despesa do escopo (mesmo gate do
   * `expenseAccountId`) e o unitário `ceil(costCents/qty)` acima de R$ 1.200 sem `usefulLifeUpToOneYear` → 400 ANTES do tx1.
   */
  private async resolveFixedAssetLines(
    scope: AccountingScope,
    dto: CreatePayableInput,
  ): Promise<{ capitalized: ResolvedFixedAssetItem[]; expensed: ResolvedExpensedFixedAssetItem[] }> {
    const items = dto.fixedAssetItems ?? [];
    const expensed: ResolvedExpensedFixedAssetItem[] = [];
    for (const [index, item] of items.entries()) {
      if (item.treatment !== 'EXPENSE') continue;
      const qty = item.qty ?? 1;
      const unitCostCents = unitCostCentsOf(item.costCents, qty);
      if (!expenseAllowed(unitCostCents, item.usefulLifeUpToOneYear)) {
        throw new ValidationError(
          `Item '${item.cProd}': valor unitário ${unitCostCents} centavos acima do limite de ${FIXED_ASSET_EXPENSE_LIMIT_CENTS} para deduzir como despesa (IN RFB 1.700/2017 art. 120) — ative o bem ou declare vida útil de até 1 ano.`,
          null,
          'FIXED_ASSET_EXPENSE_OVER_LIMIT',
        );
      }
      const account = await this.resolveExpenseAccount(scope, item.expenseAccountId!);
      expensed.push({
        treatment: 'EXPENSE',
        accountCode: account.code,
        cProd: item.cProd,
        sourceItemRef: String(item.nItem ?? index + 1),
        costCents: item.costCents,
        ncm: item.ncm,
        qty,
        unitCostCents: unitCostCents.toString(),
        ...(item.usefulLifeUpToOneYear ? { usefulLifeUpToOneYear: true as const } : {}),
      });
    }
    if (!items.some((item) => item.treatment !== 'EXPENSE')) return { capitalized: [], expensed };
    if (!this.fixedAssetClassRepo) {
      throw new ValidationError(
        'Compra com itens de imobilizado requer o catálogo de classes de bem configurado (wiring pendente).',
      );
    }
    if (!this.depreciationRateCatalog) {
      throw new ValidationError(
        'Compra com itens de imobilizado requer o catálogo de taxas de depreciação configurado (wiring pendente).',
      );
    }
    // O catálogo de taxas VIVAS é lido UMA vez para todos os itens (evita N queries idênticas).
    // BE-INCR-LEGAL-PARAMS PR-3: Anexo III de plataforma (vigente hoje) + CUSTOM vivas do escopo.
    const rates = await this.depreciationRateCatalog.catalogo(scope, false);
    const out: ResolvedFixedAssetItem[] = [];
    for (const [index, item] of items.entries()) {
      if (item.treatment === 'EXPENSE') continue;
      const klass = await this.fixedAssetClassRepo.findById(scope, item.classId!);
      if (!klass || klass.deletedAt) {
        throw new ValidationError(`Classe de bem '${item.classId}' não existe nesta unidade.`);
      }
      const account = await this.accountRepo.findById(scope, klass.costAccountId);
      if (!account || account.deletedAt) {
        throw new ValidationError(`Conta do bem da classe '${[klass.code, klass.name].filter(Boolean).join(' — ') || klass.id}' não existe neste escopo.`);
      }
      if (!account.acceptsEntries) {
        throw new ValidationError(`Conta do bem '${account.code}' (classe '${klass.code}') não aceita lançamentos (não é folha).`);
      }
      const { rateId: escolhida } = resolveRateForNcm(rates, item.ncm, item.cProd);
      const { rateId, legalParameterId, annualRateBp } = taxaEscolhidaDe(rates.find((r) => r.id === escolhida)!);
      out.push({
        classId: klass.id,
        accountCode: account.code,
        cProd: item.cProd,
        // Review #366 (re-review): fallback 1-based (index+1), alinhado ao nItem do XML (que
        // também é 1-based) — nunca colide com um nItem explícito de OUTRO item. O DTO já garante
        // (superRefine) que dentro do MESMO array é "nItem em TODOS, único" OU "em NENHUM" — nunca
        // uma mistura que faria um explícito e um fallback colidirem.
        sourceItemRef: String(item.nItem ?? index + 1),
        costCents: item.costCents,
        ncm: item.ncm,
        qty: item.qty ?? 1,
        rateId,
        legalParameterId,
        annualRateBp,
        ...(item.setDeclared ? { setDeclared: true as const } : {}),
      });
    }
    return { capitalized: out, expensed };
  }

  /**
   * Recognition input rebuilt from a persisted row (reconcile re-drive). `expenseAccount` is null for
   * an inventory purchase (debit routes to 1.1.6).
   *
   * **Residual NAMED (decisão do dono 23/09 — remoção de `Payable.fixedAssetItems`):** o breakdown
   * de imobilizado NÃO está persistido em NENHUM campo escalar da linha (ao contrário de
   * `expenseAccountId`/`inventoryProductRef`) — só no `SourceDocument.rawJson` da recognition JÁ
   * postada. Esta função reconstrói a entry quando ela está AUSENTE (a janela de crash entre o tx1
   * do `Payable` e o `postEntry`), e nessa janela o `SourceDocument` também não existe ainda — não
   * há de onde ler o split por classe. `fixedAsset=[]` aqui é o mesmo tratamento já dado ao breakdown
   * MULTI-ITEM de estoque (`dto.inventoryItems`, também nunca persistido — ver comentário de
   * `reconcilePayables`, "Closing this fully inside reconcile would require PERSISTING the
   * breakdown... the residual is named, not hidden"): se ESTA janela específica de crash coincidir
   * com um payable modo 4, o re-drive posta a recognition com o débito principal cobrindo o
   * `amountCents` inteiro na conta de estoque/despesa em vez de dividir por classe — bug estreito,
   * de janela rara, registrado aqui e no retorno da sessão, não escondido.
   * ITEM-DESTINATION (F-ID-3 a): o MESMO residual vale para `insumoItems` — o breakdown de insumo também não
   * está na linha (BRIEF item 2: nenhum ALTER em `payables`), então um re-drive NESTA janela debita o insumo
   * em 1.1.6 em vez da despesa. Registrado no retorno da sessão.
   */
  private buildRecognitionInputFromRow(
    scope: AccountingScope,
    payable: Payable,
    expenseAccount: Account | null,
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: this.toDateOnly(payable.issueDate),
      description: this.recognitionDescription(payable),
      auditDescription: this.recognitionAuditDescription(payable),
      sourceType: AP_PAYABLE_SOURCE_TYPE,
      automaticWriter: true,
      sourceId: payable.id,
      sourceDocument: {
        externalRef: payable.documentNumber ?? undefined,
        documentDate: this.toDateOnly(payable.issueDate),
      },
      lines: this.recognitionLines(
        payable,
        expenseAccount,
        centsFromDb(payable.amountCents),
        this.parseRecoverableLines(payable),
        [],
      ),
    };
  }

  private buildSettlementInput(
    scope: AccountingScope,
    payable: Payable,
    payment: PayablePayment,
    creditCode: string,
    dto: RegisterPaymentInput,
    debitCode: string = FORNECEDORES_A_PAGAR_CODE, // RETENCOES-FONTE PR-2: conta a recolher no título de imposto
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: dto.paidAt,
      description: this.settlementDescription(payable),
      auditDescription: this.settlementAuditDescription(payable),
      sourceType: AP_PAYMENT_SOURCE_TYPE,
      automaticWriter: true,
      sourceId: payment.id,
      lines: [
        { accountCode: debitCode, debitCents: dto.amountCents, creditCents: 0 },
        { accountCode: creditCode, debitCents: 0, creditCents: dto.amountCents },
      ],
    };
  }

  /** Settlement input rebuilt from persisted rows (reconcile re-drive). */
  private buildSettlementInputFromRow(
    scope: AccountingScope,
    payable: Payable,
    payment: PayablePayment,
    creditCode: string,
    debitCode: string = FORNECEDORES_A_PAGAR_CODE, // RETENCOES-FONTE PR-2: conta a recolher no título de imposto
  ): PostEntryInput {
    return {
      unitId: scope.unitId,
      date: this.toDateOnly(payment.paidAt),
      description: this.settlementDescription(payable),
      auditDescription: this.settlementAuditDescription(payable),
      sourceType: AP_PAYMENT_SOURCE_TYPE,
      automaticWriter: true,
      sourceId: payment.id,
      lines: [
        { accountCode: debitCode, debitCents: centsFromDb(payment.amountCents), creditCents: 0 },
        { accountCode: creditCode, debitCents: 0, creditCents: centsFromDb(payment.amountCents) },
      ],
    };
  }

  private recognitionDescription(payable: Payable): string {
    const doc = payable.documentNumber ? ` (NF ${payable.documentNumber})` : '';
    return `Contas a pagar — ${payable.supplierName}${doc}`;
  }

  private settlementDescription(payable: Payable): string {
    const doc = payable.documentNumber ? ` (NF ${payable.documentNumber})` : '';
    return `Pagamento a fornecedor — ${payable.supplierName}${doc}`;
  }

  // TRIAGEM-AUDIT-2026-08-15 A2, fork (b) — PII-sanitized counterparts of the two descriptions
  // above, fed to PostingService as `auditDescription` (never `description`). The row/ECD-facing
  // description keeps `supplierName` for legibility; the immutable audit chain gets only the
  // document reference (the counterparty identity is already carried, id-only, on the
  // `payable.created`/`payable.payment_registered` domain events — never re-added here).
  private recognitionAuditDescription(payable: Payable): string {
    return `Contas a pagar — NF ${payable.documentNumber ?? 's/nº'}`;
  }

  private settlementAuditDescription(payable: Payable): string {
    return `Pagamento a fornecedor — NF ${payable.documentNumber ?? 's/nº'}`;
  }

  /** DateTime → date-only YYYY-MM-DD (UTC, matching how postEntry parses date-only strings). */
  private toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Undo a claimed-but-unposted payment attempt (safe only before the ledger commit): give the
   * claimed cents back and recompute the status from the row RE-READ inside the same tx after the
   * decrement (review #307 F2) — never from the pre-CAS read, which may be stale.
   */
  private async revertClaim(
    scope: AccountingScope,
    payableId: string,
    payment: PayablePayment | undefined,
    claimedCents: number,
  ): Promise<void> {
    try {
      await this.payableRepo.runTransaction(async (tx) => {
        if (payment) {
          await this.payableRepo.updatePayment(scope, payment.id, { status: 'CANCELLED' }, tx);
          // RETENCOES-FONTE PR-2: a CSRF desta parcela (gravada com o PAYMENT) sai junto — nada dela foi ao razão.
          if (this.withholding) {
            const linhas = await this.withholding.repo.findActiveByOriginSettlement(scope, payment.id, tx);
            await this.withholding.service.reverterNaTx(scope, linhas, tx);
          }
        }
        // INV F-11.2: devolução e status por CAS sobre PAYING — o título que saiu de PAYING não é tocado.
        if ((await this.payableRepo.releaseClaim(scope, payableId, claimedCents, tx)) === 0) {
          throw new ValidationError('Não foi possível desfazer a baixa: o título não está mais em pagamento ou o saldo não comporta a devolução.');
        }
        const row = await this.payableRepo.findById(scope, payableId, tx);
        if (!row) return;
        const status = payableStatusForBalance(centsFromDb(row.paidCents), centsFromDb(row.amountCents));
        assertPayableRecalc(row.status, status);
        if ((await this.payableRepo.resolveRevertedClaim(scope, payableId, status, tx)) === 0) {
          throw new ValidationError('Não foi possível desfazer a baixa: o título não está mais em pagamento.');
        }
      });
    } catch (error) {
      logger.error('AP registerPayment revert failed — reconcile will reconcile state', {
        payableId,
        error,
      });
    }
  }

  /** Compensate a payable whose recognition posting failed synchronously (soft-delete + rename). */
  private async compensateFailedRecognition(scope: AccountingScope, payable: Payable): Promise<void> {
    try {
      await this.payableRepo.runTransaction(async (tx) => {
        // RETENCOES-FONTE PR-2: as retenções da tx1 (subrazão e título de imposto) saem junto — nada foi ao razão ainda.
        if (this.withholding) {
          const linhas = await this.withholding.repo.findActiveByTitle(scope, 'PAYABLE', payable.id, tx);
          await this.withholding.service.reverterNaTx(scope, linhas, tx);
        }
        await this.payableRepo.updatePayable(
          scope,
          payable.id,
          { status: 'CANCELLED', deletedAt: new Date(), documentNumber: deletedDocumentNumber(payable.id, payable.documentNumber) },
          tx,
        );
      });
    } catch (error) {
      logger.error('AP createPayable compensation failed — reconcile will not re-post a cancelled row', {
        payableId: payable.id,
        error,
      });
    }
  }
}
