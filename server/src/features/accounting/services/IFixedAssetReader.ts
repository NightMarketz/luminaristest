import type { Prisma } from 'generated/prisma';
import type { LalurPeriodo } from '../models/Lalur.model';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Um ativo do Bloco F num período da Parte B (C8 emenda 3.2, E15; BRIEF §3.4). Valores em centavos; a diferença do
 * período é `fiscalQuotaCents − bookQuotaCents` (E16, fórmula do item 23 do BRIEF-mãe).
 */
export interface FixedAssetParteBRow {
  assetId: string;
  code: string;
  /** Quota fiscal teórica do período: cumulativa sobre `costCents` sem residual (IN 1.700 art. 123), taxa do Anexo ou `nFiscal` (E11). */
  fiscalQuotaCents: bigint;
  /** Soma das quotas contábeis POSTADAS no período (razão, `fixed_asset.depreciation`). */
  bookQuotaCents: bigint;
  /**
   * (fiscal − contábil) acumulado do bem até o fim do período anterior — o lado do saldo do bem na Parte B:
   * `> 0` = saldo credor a adicionar (2210), `< 0` = saldo devedor a excluir (1071). Contábil = `openingAccumulatedCents`
   * + quotas postadas antes do período.
   */
  priorDiffCents: bigint;
  /** Baixado dentro do período — o saldo restante se realiza (91.01 / 161, tabela do E16). */
  disposedInPeriod: boolean;
  /** Lançamentos de quota do período e a conta que cada um debita (M310/M312 da adição, E17). */
  quotaEntries: Array<{ id: string; debitAccountIds: string[] }>;
}

/**
 * Leitura do imobilizado que o fechamento da Parte B consome (C8 emenda 3.2, E15; execution-plan A6). Interface de
 * leitura, não o serviço inteiro: o `LalurService` só enxerga isto.
 */
export interface IFixedAssetReader {
  /** Só os ativos do E15 (override contábil, residual > 0 ou benfeitoria com `nBook < nFiscal`); o resto tem diferença 0 (E20). */
  listForParteB(scope: AccountingScope, year: number, periodo: LalurPeriodo, tx?: Prisma.TransactionClient): Promise<FixedAssetParteBRow[]>;
}
