import type { Prisma, ProfitDistributionEvent, SourceDocument } from 'generated/prisma';

/** Dados do evento no commit 1 (BRIEF item 10). `userId`/`createdById` vêm do escopo. */
export interface ProfitDistributionData {
  unitId: string;
  partnerId: string;
  taxId: string;
  evento: string;
  dataEvento: string;
  competencia: string;
  debitoAccountId: string;
  contraAccountId: string;
  brutoCents: bigint;
  irrfCents: bigint;
  liquidoCents: bigint;
  origemLucro: string;
  anoResultado: number | null;
  aprovadoEm: string | null;
  atoSourceDocumentId: string | null;
  memoria: Prisma.InputJsonValue;
  parametrosIds: Prisma.InputJsonValue;
  parametrosSha256: string;
  avisoSaldoLucro: string | null;
  status: string;
}

/** Totais do razão por conta da PJ inteira (todas as unidades) — insumo do aviso de saldo de lucro (item 18). */
export interface TotalPorConta {
  code: string;
  nature: string;
  debitCents: bigint;
  creditCents: bigint;
}

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 — único lugar com `prisma.profitDistributionEvent.*`. Tenancy pelo dono (a PJ): id de
 * outro dono devolve `null` (→ 404). Zero regra de negócio: as leituras recebem os filtros prontos do serviço.
 */
export interface IProfitDistributionRepository {
  create(ownerUserId: string, actorUserId: string, data: ProfitDistributionData, tx: Prisma.TransactionClient): Promise<ProfitDistributionEvent>;
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent | null>;
  /** Eventos do mês do `taxId` em todas as unidades da PJ, nos status pedidos. Ordem: `dataEvento`, depois `createdAt`. */
  listDoMes(ownerUserId: string, taxId: string, competencia: string, status: readonly string[], tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent[]>;
  /** Eventos da competência na PJ inteira (todos os sócios), nos status pedidos. */
  listDaCompetencia(ownerUserId: string, competencia: string, status: readonly string[]): Promise<ProfitDistributionEvent[]>;
  /** Eventos com `dataEvento` em [de, ate] na PJ inteira, nos status pedidos. */
  listNoIntervalo(ownerUserId: string, de: string, ate: string, status: readonly string[], tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent[]>;
  /** Commit 2 (CAS): `PENDING_POST` sem lançamento → `POSTED` com `entryId`. false = outra chamada já vinculou. */
  markPosted(ownerUserId: string, id: string, entryId: string): Promise<boolean>;
  /** Item 20 (CAS dentro da tx): `POSTED` → `CANCELLED`. false = o status mudou no meio. */
  markCancelled(ownerUserId: string, id: string, data: { cancelledById: string; cancelReason: string | null }, tx: Prisma.TransactionClient): Promise<boolean>;
  /** O ato anexado da transição (item 14): documento de origem vivo do escopo (dono + unidade). */
  findSourceDocument(ownerUserId: string, unitId: string, id: string): Promise<SourceDocument | null>;
  /**
   * Item 18 — Σ débito/crédito por conta, todas as unidades, lançamentos em `status` com data em [de, ate], fora da
   * `excluirFonte` e dos estornos dela.
   */
  totaisPorConta(
    ownerUserId: string,
    filtro: { de?: Date; ate: Date; status: readonly string[]; excluirFonte: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TotalPorConta[]>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
