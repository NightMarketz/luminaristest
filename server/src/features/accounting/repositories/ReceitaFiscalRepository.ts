import prisma from '../../../lib/prisma';
import type { ReceitaFiscalLinha } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { IReceitaFiscalRepository, ReceitaFiscalLinhaData } from './IReceitaFiscalRepository';

/** Repositório Prisma do subrazão fiscal de receita (X14 PR-2). Zero regra de negócio (ver o contrato). */
export class ReceitaFiscalRepository implements IReceitaFiscalRepository {
  public async createLinhasDaVenda(scope: AccountingScope, linhas: readonly ReceitaFiscalLinhaData[]): Promise<number> {
    const w = accountingScopeWhere(scope);
    if (linhas.length === 0) return 0;
    return prisma.$transaction(async (tx) => {
      // Idempotência por VENDA, espelho do razão (o `sale.finalized` é único por venda e não muda se a venda for
      // regravada): venda com qualquer linha não é regravada, nem parcialmente.
      if ((await tx.receitaFiscalLinha.count({ where: { ...w, saleId: linhas[0].saleId } })) > 0) return 0;
      for (const l of linhas) await tx.receitaFiscalLinha.create({ data: { ...w, ...l } });
      return linhas.length;
    });
  }

  public async countLinhasDaVenda(scope: AccountingScope, saleId: string): Promise<number> {
    return prisma.receitaFiscalLinha.count({ where: { ...accountingScopeWhere(scope), saleId } });
  }

  public async findByCompetencia(scope: AccountingScope, competencia: string): Promise<ReceitaFiscalLinha[]> {
    return prisma.receitaFiscalLinha.findMany({
      where: { ...accountingScopeWhere(scope), competencia },
      orderBy: [{ dia: 'asc' }, { saleId: 'asc' }, { itemRef: 'asc' }],
    });
  }

  public async competenciasComLinhas(scope: AccountingScope, competencias: readonly string[]): Promise<string[]> {
    const rows = await prisma.receitaFiscalLinha.findMany({
      where: { ...accountingScopeWhere(scope), competencia: { in: [...competencias] } },
      select: { competencia: true },
      distinct: ['competencia'],
    });
    return rows.map((r) => r.competencia);
  }
}
