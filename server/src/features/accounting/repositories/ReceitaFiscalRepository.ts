import prisma from '../../../lib/prisma';
import type { Prisma, ReceitaFiscalLinha } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { IReceitaFiscalRepository, ReceitaFiscalLinhaData, TipoLinhaReceita } from './IReceitaFiscalRepository';

/** Repositório Prisma do subrazão fiscal de receita (X14 PR-2). Zero regra de negócio (ver o contrato). */
export class ReceitaFiscalRepository implements IReceitaFiscalRepository {
  public async createLinhasDaVenda(scope: AccountingScope, linhas: readonly ReceitaFiscalLinhaData[]): Promise<number> {
    const w = accountingScopeWhere(scope);
    if (linhas.length === 0) return 0;
    return prisma.$transaction(async (tx) => {
      // Idempotência por VENDA, espelho do razão (o `sale.finalized` é único por venda e não muda se a venda for
      // regravada): venda com qualquer linha não é regravada, nem parcialmente.
      if ((await tx.receitaFiscalLinha.count({ where: { ...w, saleId: linhas[0].saleId, tipo: linhas[0].tipo } })) > 0) return 0;
      for (const l of linhas) await tx.receitaFiscalLinha.create({ data: { ...w, ...l } });
      return linhas.length;
    });
  }

  public async countLinhasDaVenda(scope: AccountingScope, saleId: string, tipo: TipoLinhaReceita): Promise<number> {
    return prisma.receitaFiscalLinha.count({ where: { ...accountingScopeWhere(scope), saleId, tipo } });
  }

  public async findLinhasDaVenda(scope: AccountingScope, saleId: string, tipo: TipoLinhaReceita): Promise<ReceitaFiscalLinha[]> {
    return prisma.receitaFiscalLinha.findMany({ where: { ...accountingScopeWhere(scope), saleId, tipo }, orderBy: { itemRef: 'asc' } });
  }

  public async findByCompetencia(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<ReceitaFiscalLinha[]> {
    return (tx ?? prisma).receitaFiscalLinha.findMany({
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

  public async somaPorCompetencia(scope: AccountingScope, competencias: readonly string[], tx?: Prisma.TransactionClient): Promise<Map<string, { receitaCents: bigint; cotaCents: bigint }>> {
    const g = await (tx ?? prisma).receitaFiscalLinha.groupBy({
      by: ['competencia'],
      where: { ...accountingScopeWhere(scope), competencia: { in: [...competencias] } },
      _sum: { receitaCents: true, cotaProfissionalCents: true },
    });
    return new Map(g.map((r) => [r.competencia, { receitaCents: r._sum.receitaCents ?? 0n, cotaCents: r._sum.cotaProfissionalCents ?? 0n }]));
  }
}
