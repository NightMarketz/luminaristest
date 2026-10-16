import type { ReceitaFiscalRecebimento } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export type OrigemRecebimento = 'SALE_SETTLED' | 'PACKAGE_BALANCE';
export type StatusRecebimento = 'ACTIVE' | 'REVERTED';

/** BE-INCR-SIMPLES-CAIXA PR-1 (nó X14-CAIXA, item 1) — um recebimento de venda, base do DAS no regime de caixa. */
export interface ReceitaFiscalRecebimentoData {
  saleId: string;
  dia: string;
  competenciaCaixa: string;
  valorCents: bigint;
  meio: string;
  origem: OrigemRecebimento;
}

/**
 * Contrato do repositório de `receita_fiscal_recebimentos`. Único lugar com `prisma.receitaFiscalRecebimento`. A
 * idempotência é a @@unique (PJ, unidade, venda, origem): gravar de novo não cria nem altera a linha.
 */
export interface IReceitaFiscalRecebimentoRepository {
  /** Cria se não existe; devolve true quando criou. */
  createIfAbsent(scope: AccountingScope, data: ReceitaFiscalRecebimentoData): Promise<boolean>;
  findBySale(scope: AccountingScope, saleId: string): Promise<ReceitaFiscalRecebimento[]>;
  /** ACTIVE → REVERTED com o dia do estorno; devolve quantas linhas mudou (0 se já estava estornada ou não existe). */
  markReverted(scope: AccountingScope, saleId: string, diaEstorno: string): Promise<number>;
}
