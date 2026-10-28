import type { InterestOnEquityAllocation, InterestOnEquityCalculation, Prisma } from 'generated/prisma';

/** Movimento do dia numa conta (Σ das pernas dos lançamentos daquele dia). */
export interface MovimentoDiario {
  accountId: string;
  dia: string; // YYYY-MM-DD
  debitCents: bigint;
  creditCents: bigint;
}

/** Totais por conta da unidade num intervalo, com o código e a natureza. */
export interface TotalDaConta {
  accountId: string;
  code: string;
  nature: string;
  debitCents: bigint;
  creditCents: bigint;
}

/** PR-4 (item 27) — o cálculo confirmado no commit 1, com as alocações. `userId`/`createdById` vêm do escopo. */
export interface InterestOnEquityData {
  unitId: string;
  anoCalendario: number;
  periodo: string;
  dataCredito: string;
  forma: string;
  debitoAccountId: string;
  memoria: Prisma.InputJsonValue;
  jurosMaxTjlpCents: bigint;
  limite50LucroCents: bigint;
  limite50ReservasCents: bigint;
  limiteDedutivelCents: bigint;
  totalCents: bigint;
  irrfCents: bigint;
  liquidoCents: bigint;
  excessoCents: bigint;
  parametrosIds: Prisma.InputJsonValue;
  parametrosSha256: string;
  previaSha256: string;
  alocacoes: Array<{ partnerId: string; participacaoBp: number; brutoCents: bigint; irrfCents: bigint; liquidoCents: bigint }>;
}

export type InterestOnEquityWithAlocacoes = InterestOnEquityCalculation & { alocacoes: InterestOnEquityAllocation[] };

/** Valor vivo de `vivoKey` (item 27: um cálculo vivo por PJ, ano e período). */
export const JCP_VIVO = 'VIVO';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3/PR-4 — único lugar com `prisma.interestOnEquity*`, mais as leituras do razão que o
 * cálculo do JCP precisa. Zero regra de negócio: os filtros chegam prontos do serviço. Tenancy pelo dono (`userId`).
 */
export interface IInterestOnEquityRepository {
  /** Item 24 — movimento por dia das contas do mapa do PL, lançamentos em `status` com data ≤ `ate`. */
  movimentosDasContas(ownerUserId: string, accountIds: readonly string[], ate: Date, status: readonly string[], tx?: Prisma.TransactionClient): Promise<MovimentoDiario[]>;
  /** Itens 8 e 25 — totais por conta da unidade em [de, ate], fora das fontes `excluirFontes`. */
  totaisDaUnidade(
    ownerUserId: string,
    unitId: string,
    filtro: { de?: Date; ate: Date; status: readonly string[]; excluirFontes: readonly string[] },
    tx?: Prisma.TransactionClient,
  ): Promise<TotalDaConta[]>;

  create(ownerUserId: string, actorUserId: string, data: InterestOnEquityData, tx: Prisma.TransactionClient): Promise<InterestOnEquityWithAlocacoes>;
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<InterestOnEquityWithAlocacoes | null>;
  /** Item 27 — o cálculo vivo (não cancelado) da PJ no ano e período. */
  findVivo(ownerUserId: string, anoCalendario: number, periodo: string, tx?: Prisma.TransactionClient): Promise<InterestOnEquityCalculation | null>;
  /** D-2026-10-28 item 1 — o sócio tem alocação num cálculo vivo (qualquer status; cálculo com `deletedAt` não conta)? */
  existsAlocacaoDoSocio(ownerUserId: string, partnerId: string, tx?: Prisma.TransactionClient): Promise<boolean>;
  /** Item 31 — cálculos com `dataCredito` na competência (YYYY-MM), nos status pedidos. */
  listDaCompetencia(ownerUserId: string, competencia: string, status: readonly string[]): Promise<InterestOnEquityCalculation[]>;
  /** Commit 2 (CAS): `PENDING_POST` sem lançamento → `POSTED` com `entryId`. false = outra chamada já vinculou. */
  markPosted(ownerUserId: string, id: string, entryId: string): Promise<boolean>;
  /** Commit 3 (CAS dentro da tx): `lalurEntryIds` null → as linhas gravadas. false = já gravadas. */
  setLalurEntryIds(ownerUserId: string, id: string, ids: string[], tx: Prisma.TransactionClient): Promise<boolean>;
  /** Item 30 (CAS dentro da tx): `POSTED` → `CANCELLED`, liberando o @@unique (`vivoKey` = id). */
  markCancelled(ownerUserId: string, id: string, cancelledById: string, tx: Prisma.TransactionClient): Promise<boolean>;
  /**
   * Item 30 (L-IRD-4) — Σ dos débitos na conta com data ≥ `desde`, de lançamentos em `status` que não são `entryId` nem o
   * estorno dele (todas as unidades do dono).
   */
  debitosNaContaDesde(ownerUserId: string, accountId: string, desde: Date, entryId: string, status: readonly string[], tx?: Prisma.TransactionClient): Promise<bigint>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
