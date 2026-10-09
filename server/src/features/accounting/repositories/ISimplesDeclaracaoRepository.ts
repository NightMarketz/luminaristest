import type { Prisma, SimplesDeclaracaoAnual } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export const TIPOS_DECLARACAO_SIMPLES = ['DEFIS', 'DASN_SIMEI'] as const;
export type TipoDeclaracaoSimples = (typeof TIPOS_DECLARACAO_SIMPLES)[number];

/**
 * Contrato do repositório de `simples_declaracoes_anuais` (X14 PR-4, itens 27–28). Único lugar com
 * `prisma.simplesDeclaracaoAnual`. Chave = escopo (PJ + unidade) × ano × tipo. Zero regra de negócio.
 */
export interface ISimplesDeclaracaoRepository {
  find(scope: AccountingScope, ano: number, tipo: TipoDeclaracaoSimples): Promise<SimplesDeclaracaoAnual | null>;
  upsert(scope: AccountingScope, ano: number, tipo: TipoDeclaracaoSimples, dados: Prisma.InputJsonValue): Promise<SimplesDeclaracaoAnual>;
}
