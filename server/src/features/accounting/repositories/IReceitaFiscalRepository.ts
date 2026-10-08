import type { Prisma, ReceitaFiscalLinha } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, item 15) — uma linha do subrazão fiscal de receita. */
export interface ReceitaFiscalLinhaData {
  competencia: string;
  dia: string;
  saleId: string;
  itemRef: string;
  natureza: 'SERVICO' | 'REVENDA';
  cTribNac: string | null;
  productRef: string | null;
  receitaCents: bigint;
  excluir: string[];
  parceriaContratoId: string | null;
  cotaProfissionalCents: bigint;
}

/**
 * Contrato do repositório de `receita_fiscal_linhas` (X14 PR-2, itens 15–16). Único lugar com
 * `prisma.receitaFiscalLinha`. Sem update/delete: o subrazão é o espelho do razão; a idempotência é a @@unique
 * (PJ, unidade, venda, item).
 */
export interface IReceitaFiscalRepository {
  /** Grava as linhas da venda numa tx; as que já existem ficam (replay do reconcile). Devolve quantas criou. */
  createLinhasDaVenda(scope: AccountingScope, linhas: readonly ReceitaFiscalLinhaData[]): Promise<number>;
  countLinhasDaVenda(scope: AccountingScope, saleId: string): Promise<number>;
  findByCompetencia(scope: AccountingScope, competencia: string): Promise<ReceitaFiscalLinha[]>;
  /** Das competências pedidas, as que têm ao menos uma linha. */
  competenciasComLinhas(scope: AccountingScope, competencias: readonly string[]): Promise<string[]>;
}
