import prisma from '../../../lib/prisma';
import type { ReceitaFiscalRecebimento } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { IReceitaFiscalRecebimentoRepository, ReceitaFiscalRecebimentoData } from './IReceitaFiscalRecebimentoRepository';

/** Repositório Prisma dos recebimentos de venda do regime de caixa (X14-CAIXA PR-1). Zero regra de negócio. */
export class ReceitaFiscalRecebimentoRepository implements IReceitaFiscalRecebimentoRepository {
  public async createIfAbsent(scope: AccountingScope, data: ReceitaFiscalRecebimentoData): Promise<boolean> {
    const w = accountingScopeWhere(scope);
    const key = { userId_unitId_saleId_origem: { ...w, saleId: data.saleId, origem: data.origem } };
    const antes = await prisma.receitaFiscalRecebimento.findUnique({ where: key, select: { id: true } });
    if (antes) return false;
    // upsert com update vazio: duas gravações concorrentes caem na @@unique sem P2002 e sem mudar a 1ª linha.
    await prisma.receitaFiscalRecebimento.upsert({ where: key, create: { ...w, ...data }, update: {} });
    return true;
  }

  public async findBySale(scope: AccountingScope, saleId: string): Promise<ReceitaFiscalRecebimento[]> {
    return prisma.receitaFiscalRecebimento.findMany({ where: { ...accountingScopeWhere(scope), saleId }, orderBy: { origem: 'asc' } });
  }

  public async markReverted(scope: AccountingScope, saleId: string, diaEstorno: string): Promise<number> {
    const r = await prisma.receitaFiscalRecebimento.updateMany({
      where: { ...accountingScopeWhere(scope), saleId, status: 'ACTIVE' },
      data: { status: 'REVERTED', diaEstorno },
    });
    return r.count;
  }
}
