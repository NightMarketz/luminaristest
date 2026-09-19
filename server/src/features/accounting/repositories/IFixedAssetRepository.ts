import type { FixedAsset, Prisma } from 'generated/prisma';
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
   * esperado, não só a `version` (dupla trava). Sem chamador nesta PR (nasce só para o `runMonth`
   * do PR-3); testado isoladamente aqui, como `quotaCumulativa` no PR-1.
   */
  addAccumulated(
    scope: AccountingScope,
    id: string,
    deltaCents: bigint,
    expected: { accumulatedDepreciationCents: bigint; version: number },
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
