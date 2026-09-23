import type { FixedAsset, Prisma } from 'generated/prisma';
import type { FixedAssetStatus } from '../models/FixedAsset.model';
import type { AccountingScope } from '../scope/AccountingScope';

export interface CreateFixedAssetData {
  userId: string;
  unitId: string;
  classId: string;
  code: string;
  description: string;
  ncmPrefix: string | null;
  quantity: number;
  costCents: bigint;
  residualValueCents: bigint;
  rateId: string | null;
  annualRateBp: number;
  bookAnnualRateBp: number | null;
  bookRateJustification: string | null;
  acquiredAt: Date;
  createdById: string | null;
  // BE-INCR-FIXED-ASSETS PR-5 (item 22/28) — presentes só no rascunho nascido de NF-e (modo 4).
  payableId?: string | null;
  sourceDocumentId?: string | null;
  sourceItemRef?: string | null;
}

export interface UpdateFixedAssetData {
  classId?: string;
  code?: string;
  description?: string;
  ncmPrefix?: string | null;
  quantity?: number;
  costCents?: bigint;
  residualValueCents?: bigint;
  rateId?: string | null;
  annualRateBp?: number;
  bookAnnualRateBp?: number | null;
  bookRateJustification?: string | null;
  acquiredAt?: Date;
}

/**
 * Repositório de `FixedAsset` (BE-INCR-FIXED-ASSETS, nó C8, item 4/8/9/18). Único lugar com
 * `prisma.fixedAsset.*`. As mutações de comando (`activate`/`dispose`/`addAccumulated`) são CAS por
 * `version` (`updateMany` — 0 linhas ⇒ `null`, tradução para `ConflictError` é do SERVIÇO, mesma
 * disciplina de repositório fino do resto do módulo). `BigInt` ponta a ponta, nunca `Number()` cego
 * (item 14).
 */
export interface IFixedAssetRepository {
  create(data: CreateFixedAssetData, tx?: Prisma.TransactionClient): Promise<FixedAsset>;

  /** Point lookup escopado — `null` quando o id não é deste escopo (cross-tenant → null, D11). */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FixedAsset | null>;

  /** Pré-checagem de unicidade de `code` antes do create/update (mensagem amigável antes do P2002). */
  findByCode(scope: AccountingScope, code: string, tx?: Prisma.TransactionClient): Promise<FixedAsset | null>;

  findManyByUnit(
    scope: AccountingScope,
    filter: { status?: string; classId?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset[]>;

  /** Read-first do rascunho (item 22/28): `null` quando este item da NF-e ainda não tem
   *  `FixedAsset` — chave `(payableId, sourceItemRef)` (o `@@unique`). Usado por
   *  `createDraftFromPayable` ANTES de criar, e pelo re-drive do reconcile para não duplicar. */
  findByPayableAndSourceItemRef(
    scope: AccountingScope,
    payableId: string,
    sourceItemRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null>;

  /**
   * Ativos `ACTIVE` de classe `depreciable=true` com `activatedAt <= asOfDate` (BE-INCR-FIXED-ASSETS,
   * nó C8, item 12 — a lista que o `runMonth` processa). O filtro de status por si só já exclui
   * `FULLY_DEPRECIATED`/`DISPOSED`/`PENDING_ACTIVATION` — não há checagem extra de "vida útil
   * esgotada" a fazer aqui (o 121º mês de um ativo 10%/a.a. não aparece porque o `addAccumulated`
   * já o moveu para `FULLY_DEPRECIATED` no mês 120).
   */
  findActiveDepreciable(
    scope: AccountingScope,
    asOfDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset[]>;

  /** Conta ativos vivos (não soft-deleted) de uma classe, em qualquer status — usado pelo bloqueio
   *  de soft-delete da classe (item 7, "delete com ativo vivo → 400"). */
  countByClass(scope: AccountingScope, classId: string, tx?: Prisma.TransactionClient): Promise<number>;

  /** Só permitido em `PENDING_ACTIVATION` (regra do serviço, não do repo). */
  update(
    scope: AccountingScope,
    id: string,
    data: UpdateFixedAssetData,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset>;

  softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FixedAsset>;

  /** CAS `PENDING_ACTIVATION → ACTIVE` (item 9). `null` = a linha não tinha mais `expectedVersion`
   *  (outra escrita venceu a corrida) — o serviço traduz para `ConflictError`. */
  activate(
    scope: AccountingScope,
    id: string,
    data: { activatedAt: Date; openingAccumulatedCents: bigint },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null>;

  /** CAS `→ DISPOSED` (item 18, tx2 do comando de baixa). */
  dispose(
    scope: AccountingScope,
    id: string,
    data: { disposedAt: Date; disposalEntryId: string },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null>;

  /**
   * CAS de `accumulatedDepreciationCents` (item 14, ACC-TIEOUT) — `where` inclui o valor ATUAL
   * esperado, não só a `version` (dupla trava). `nextStatus` — quando informado — é gravado na
   * MESMA `updateMany` (o ativo vira `FULLY_DEPRECIATED` no instante em que `acumulado == base`,
   * item 12); `undefined` não toca o `status`.
   */
  addAccumulated(
    scope: AccountingScope,
    id: string,
    deltaCents: bigint,
    expected: { accumulatedDepreciationCents: bigint; version: number },
    nextStatus: FixedAssetStatus | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null>;

  /**
   * Repara `accumulatedDepreciationCents` a partir da soma do razão (item 14, `reconcile` —
   * espelho de `InventoryService.reconcileInventory`'s `updateItem`): SET direto, sem CAS de
   * `version` — não é um comando (ACC-016), é a rede de segurança do tie-out, best-effort por
   * item, nunca a autoridade de quanto foi postado (essa é a soma dos créditos do razão).
   */
  reconcileAccumulated(
    scope: AccountingScope,
    id: string,
    accumulatedDepreciationCents: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
