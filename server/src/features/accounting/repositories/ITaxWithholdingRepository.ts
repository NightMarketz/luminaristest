import type { Prisma, TaxWithholding } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { WithholdingLineForReinf } from '../dtos/WithholdingDto';
import type { TaxWithholdingComOrigem } from '../models/withholdingView';

export interface CreateTaxWithholdingData {
  direction: 'MADE' | 'SUFFERED';
  tributo: string;
  event: 'RECOGNITION' | 'SETTLEMENT';
  titleType: 'PAYABLE' | 'RECEIVABLE';
  titleId: string;
  settlementId: string | null;
  originSettlementId: string | null;
  counterpartyId: string;
  naturezaServico: string | null;
  natRend: string | null;
  dataFatoGerador: string;
  competencia: string;
  brutoCents: bigint;
  baseCents: bigint;
  aliquotaBp: number | null;
  amountCents: bigint;
  dispensa: string | null;
  overrideMotivo: string | null;
  codigoReceita: string | null;
  taxPayableId: string | null;
  documentoNumero: string | null;
  documentoSerie: string | null;
  pfDetalhe: string | null;
  parametrosIds: string;
  parametrosSha256: string;
}

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (Emenda 22/10 item 2; §5.4) — a porta de leitura que a EFD-REINF consome sem HTTP: as linhas
 * MADE ACTIVE da competência, no contrato `WithholdingLineForReinfSchema`.
 */
export interface ITaxWithholdingReadPort {
  findMadeForReinf(scope: AccountingScope, competencia: string): Promise<WithholdingLineForReinf[]>;
  /**
   * BE-INCR-EFD-REINF PR-1 (lacuna A, dono 26/10: "Método na porta") — as mesmas linhas, de TODAS as unidades da PJ: a Reinf
   * é por CNPJ raiz, centralizada (F-REINF-11 a). Mesmo mapeador; tenancy só por `ownerUserId`.
   */
  findMadeForReinfDaPj(ownerUserId: string, competencia: string): Promise<WithholdingLineForReinf[]>;
}

/**
 * Item 13 — único lugar com `prisma.taxWithholding.*`. Tenancy em dois níveis. A linha é imutável salvo `status`
 * (ACTIVE → REVERSED), `entryId` e o re-apontamento do título no acúmulo do DARF < R$ 10 (item 20).
 */
export interface ITaxWithholdingRepository extends ITaxWithholdingReadPort {
  create(scope: AccountingScope, data: CreateTaxWithholdingData, tx: Prisma.TransactionClient): Promise<TaxWithholding>;
  findActiveByTitle(scope: AccountingScope, titleType: 'PAYABLE' | 'RECEIVABLE', titleId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding[]>;
  findBySettlement(scope: AccountingScope, settlementId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding | null>;
  findActiveByOriginSettlement(scope: AccountingScope, originSettlementId: string, tx?: Prisma.TransactionClient): Promise<TaxWithholding[]>;
  /** Item 11 (F-RET-17 a): Σ bruto e Σ IRRF retido do mês, MADE ACTIVE, ao mesmo beneficiário (PF). */
  somaIrrfDoMes(scope: AccountingScope, counterpartyId: string, competencia: string, tx?: Prisma.TransactionClient): Promise<{ rendimentoCents: bigint; retidoCents: bigint }>;
  /** CAS ACTIVE → REVERSED; devolve quantas viraram. */
  markReversed(scope: AccountingScope, ids: readonly string[], tx: Prisma.TransactionClient): Promise<number>;
  setEntryId(scope: AccountingScope, id: string, entryId: string, tx?: Prisma.TransactionClient): Promise<void>;
  /** Item 20: as linhas do título absorvido passam a apontar para o título que o somou (`competencia` = só as dela — desfazer). */
  repointTaxPayable(scope: AccountingScope, fromPayableId: string, toPayableId: string, tx: Prisma.TransactionClient, competencia?: string): Promise<number>;
  /** Item 20 (review A2): Σ retido MADE ACTIVE da competência num código de receita — decide se ela passa do mínimo do DARF. */
  somaDaCompetencia(scope: AccountingScope, codigoReceita: string, competencia: string, tx: Prisma.TransactionClient, taxPayableId?: string): Promise<bigint>;
  /** As linhas MADE ACTIVE da competência com a contraparte, o título e o perfil vigente (para o mapeador). */
  findMadeWithOrigin(scope: AccountingScope, competencia: string): Promise<TaxWithholdingComOrigem[]>;
  /** As linhas MADE ACTIVE que apontam para os títulos (resumo por código). */
  findMadeByTaxPayables(scope: AccountingScope, taxPayableIds: readonly string[]): Promise<TaxWithholding[]>;
  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
