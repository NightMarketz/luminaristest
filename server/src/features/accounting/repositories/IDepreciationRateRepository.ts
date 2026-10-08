import type { DepreciationRate, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Dado para criar uma linha CUSTOM (o Anexo III é tabela de plataforma desde BE-INCR-LEGAL-PARAMS PR-3). */
export interface CreateDepreciationRateData {
  userId: string;
  unitId: string;
  ncm: string | null;
  sourceRow: number | null;
  description: string;
  lifeYears: number;
  annualRateBp: number;
  source: string;
  sourceUrl: string | null;
  sourceSha256: string | null;
  justification: string | null;
  createdById: string | null;
}

/**
 * Repositório da tabela de taxas de depreciação (`depreciation_rates`). Único lugar com
 * `prisma.depreciationRate.*` (BE-INCR-FIXED-ASSETS, nó C8, item 2).
 *
 * Tenancy = AccountingScope (userId + unitId). Linhas ANEXO_* são imutáveis (parecer D4) — este
 * contrato não tem `update` de propósito; a única mutação é `hide` (soft, `hiddenAt`). `CUSTOM` é
 * escrito por `create` como qualquer outra linha — a imutabilidade é regra do SERVIÇO, não do
 * repositório (F-FA10 → a: a chave de negócio das linhas do Anexo é `[source, sourceRow]`).
 */
export interface IDepreciationRateRepository {
  create(data: CreateDepreciationRateData, tx?: Prisma.TransactionClient): Promise<DepreciationRate>;

  /** Point lookup escopado — `null` quando o id não é deste escopo (cross-tenant → null, D11). */
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<DepreciationRate | null>;

  /** Catálogo do escopo. `includeHidden=false` filtra `hiddenAt: null` (default da listagem). */
  findManyByUnit(
    scope: AccountingScope,
    includeHidden: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<DepreciationRate[]>;

  /** Soft-hide (`hiddenAt`) — nunca apaga; uma linha ANEXO_* usada por um FixedAsset snapshot
   *  continua legível. Escopo no `where` (extended-where), cross-tenant nunca escreve. */
  hide(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<DepreciationRate>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
