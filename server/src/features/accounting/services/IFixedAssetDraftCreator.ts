import type { Payable } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * One CFOP 1551/2551 item of a multi-item NF-e purchase, resolved (class + account + TAXA) at
 * `PayableService.resolveFixedAssetLines` time — BEFORE the tx1 of the `Payable` (review #366,
 * achado 1: a taxa por NCM tem de ser validada ANTES de qualquer efeito, nunca só na hora do
 * rascunho, senão um NCM sem match some silenciosamente num `logger.warn` best-effort depois do
 * `postEntry`/`201` já ter saído). `rateId`/`annualRateBp` chegam JÁ RESOLVIDOS aqui —
 * `createDraftFromPayable` NUNCA re-deriva a taxa, só usa o snapshot.
 *
 * `sourceItemRef` (review #366, achado 3): a chave do `@@unique([payableId, sourceItemRef])` do
 * rascunho — o `nItem` da NF-e (posição da linha, SEMPRE único dentro de uma nota), NUNCA `cProd`
 * (uma nota pode repetir o mesmo `cProd` em 2 linhas de imobilizado distintas; chavear por `cProd`
 * faria a 2ª linha ler o rascunho da 1ª como "já existe" e perder o custo).
 */
export interface ResolvedFixedAssetItem {
  classId: string;
  accountCode: string;
  cProd: string; // display/mensagens — NÃO é mais a chave do sourceItemRef (ver acima).
  sourceItemRef: string;
  costCents: number;
  ncm?: string;
  qty: number;
  rateId: string;
  annualRateBp: number;
}

/**
 * IFixedAssetDraftCreator — the seam `PayableService` depends on to create the `FixedAsset`
 * `PENDING_ACTIVATION` draft(s) of a modo-4 NF-e purchase (BE-INCR-FIXED-ASSETS PR-5, item 22/28).
 * Kept as an INTERFACE (not a direct `FixedAssetService` import) because `FixedAssetService`
 * depends on `DepreciationService`, which — via `IFixedAssetDraftRedriver` — depends back on
 * `PayableService` for the reconcile gancho; a direct `PayableService → FixedAssetService` ctor
 * edge would close that cycle. The factory wires the concrete `FixedAssetService` via
 * `PayableService.setFixedAssetDraftCreator` AFTER both are constructed (setter injection —
 * `fanin-do-concreto-le-1-sob-injecao-por-interface`, same discipline as `IInventoryService`).
 */
export interface IFixedAssetDraftCreator {
  /**
   * Read-first por item (`payableId`, `sourceItemRef=cProd`, o `@@unique`): um item que já tem
   * rascunho é pulado (idempotente); os demais nascem `PENDING_ACTIVATION`. Nunca lança por um
   * item já existente — lança só por dado inválido (classe/NCM sem taxa).
   */
  createDraftFromPayable(
    scope: AccountingScope,
    payable: Payable,
    items: ResolvedFixedAssetItem[],
    sourceDocumentId?: string | null,
  ): Promise<{ created: number }>;
}

/**
 * IFixedAssetDraftRedriver — the seam `DepreciationService.reconcile` depends on for the
 * `draftsCreated` gancho (execution-plan Passo 13/28). Setter-injected for the SAME cycle reason as
 * `IFixedAssetDraftCreator` (`DepreciationService → PayableService` would need `PayableService`
 * already built, but `PayableService → FixedAssetService → DepreciationService` is built FIRST).
 * The concrete implementer is `PayableService.redriveFixedAssetDrafts` (it already owns the
 * `findAllActive` loop + `PostingService.findEntryBySource` + `ISourceProvenanceRepository` this
 * needs — no new module reads the AP subledger from scratch).
 */
export interface IFixedAssetDraftRedriver {
  /** Re-drive de TODOS os payables ativos do escopo com itens de imobilizado sem rascunho — relê o
   *  `SourceDocument.rawJson` da recognition (nunca uma 2ª cópia na linha do Payable). Retorna o nº
   *  de rascunhos criados NESTA chamada (0 se nada pendente ou se o dep não está wired). */
  redriveMissingDrafts(scope: AccountingScope): Promise<number>;
}
