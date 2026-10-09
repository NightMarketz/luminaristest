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
  /** X14 PR-3: VENDA | CANCELAMENTO | DEVOLUCAO. */
  tipo: TipoLinhaReceita;
  /** X14 PR-4 (F-PR4-9): documento do cliente da venda. */
  tomadorTipo: TomadorTipo;
}

export type TomadorTipo = 'CNPJ' | 'CPF' | 'NAO_IDENTIFICADO';

export type TipoLinhaReceita = 'VENDA' | 'CANCELAMENTO' | 'DEVOLUCAO';

/**
 * Contrato do repositório de `receita_fiscal_linhas` (X14 PR-2, itens 15–16). Único lugar com
 * `prisma.receitaFiscalLinha`. Sem update/delete: o subrazão é o espelho do razão; a idempotência é a @@unique
 * (PJ, unidade, venda, item).
 */
export interface IReceitaFiscalRepository {
  /**
   * Grava as linhas de UM evento da venda (todas do mesmo `tipo`) numa tx; evento que já tem linha não é regravado
   * (espelho do razão: um lançamento por venda × evento). Devolve quantas criou.
   */
  createLinhasDaVenda(scope: AccountingScope, linhas: readonly ReceitaFiscalLinhaData[]): Promise<number>;
  countLinhasDaVenda(scope: AccountingScope, saleId: string, tipo: TipoLinhaReceita): Promise<number>;
  findLinhasDaVenda(scope: AccountingScope, saleId: string, tipo: TipoLinhaReceita): Promise<ReceitaFiscalLinha[]>;
  findByCompetencia(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<ReceitaFiscalLinha[]>;
  /** X14 PR-3 — Σ receita e Σ cota do profissional por competência (todas as linhas, com as negativas). */
  somaPorCompetencia(scope: AccountingScope, competencias: readonly string[], tx?: Prisma.TransactionClient): Promise<Map<string, { receitaCents: bigint; cotaCents: bigint }>>;
  /** Das competências pedidas, as que têm ao menos uma linha. */
  competenciasComLinhas(scope: AccountingScope, competencias: readonly string[]): Promise<string[]>;
}
