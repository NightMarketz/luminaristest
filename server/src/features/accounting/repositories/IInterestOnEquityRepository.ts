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

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 — leituras do razão que o cálculo do JCP precisa. Zero regra de negócio: os filtros
 * chegam prontos do serviço. Tenancy pelo dono (`userId`).
 */
export interface IInterestOnEquityRepository {
  /** Item 24 — movimento por dia das contas do mapa do PL, lançamentos em `status` com data ≤ `ate`. */
  movimentosDasContas(ownerUserId: string, accountIds: readonly string[], ate: Date, status: readonly string[]): Promise<MovimentoDiario[]>;
  /** Itens 8 e 25 — totais por conta da unidade em [de, ate], fora das fontes `excluirFontes`. */
  totaisDaUnidade(
    ownerUserId: string,
    unitId: string,
    filtro: { de?: Date; ate: Date; status: readonly string[]; excluirFontes: readonly string[] },
  ): Promise<TotalDaConta[]>;
}
