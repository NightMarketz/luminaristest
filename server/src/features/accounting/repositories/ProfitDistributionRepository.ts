import prisma from '../../../lib/prisma';
import type { Prisma, ProfitDistributionEvent, SourceDocument } from 'generated/prisma';
import type { IProfitDistributionRepository, ProfitDistributionData, TotalPorConta } from './IProfitDistributionRepository';

/** Prisma-backed `profit_distribution_events` (IRRF-DISTRIBUICAO PR-2). Zero regra de negócio (ver o contrato). */
export class ProfitDistributionRepository implements IProfitDistributionRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async create(ownerUserId: string, actorUserId: string, data: ProfitDistributionData, tx: Prisma.TransactionClient): Promise<ProfitDistributionEvent> {
    return tx.profitDistributionEvent.create({ data: { userId: ownerUserId, createdById: actorUserId, ...data } });
  }

  public async findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent | null> {
    return this.db(tx).profitDistributionEvent.findFirst({ where: { id, userId: ownerUserId, deletedAt: null } });
  }

  public async existsDoSocio(ownerUserId: string, partnerId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    return (await this.db(tx).profitDistributionEvent.findFirst({ where: { userId: ownerUserId, partnerId, deletedAt: null }, select: { id: true } })) !== null;
  }

  public async listDoMes(ownerUserId: string, taxId: string, competencia: string, status: readonly string[], tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent[]> {
    return this.db(tx).profitDistributionEvent.findMany({
      where: { userId: ownerUserId, taxId, competencia, status: { in: [...status] }, deletedAt: null },
      orderBy: [{ dataEvento: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async listDaCompetencia(ownerUserId: string, competencia: string, status: readonly string[]): Promise<ProfitDistributionEvent[]> {
    return prisma.profitDistributionEvent.findMany({
      where: { userId: ownerUserId, competencia, status: { in: [...status] }, deletedAt: null },
      orderBy: [{ dataEvento: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async listNoIntervalo(ownerUserId: string, de: string, ate: string, status: readonly string[], tx?: Prisma.TransactionClient): Promise<ProfitDistributionEvent[]> {
    return this.db(tx).profitDistributionEvent.findMany({
      where: { userId: ownerUserId, dataEvento: { gte: de, lte: ate }, status: { in: [...status] }, deletedAt: null },
    });
  }

  public async markPosted(ownerUserId: string, id: string, entryId: string): Promise<boolean> {
    const r = await prisma.profitDistributionEvent.updateMany({
      where: { id, userId: ownerUserId, status: 'PENDING_POST', entryId: null, deletedAt: null },
      data: { status: 'POSTED', entryId },
    });
    return r.count === 1;
  }

  public async markCancelled(
    ownerUserId: string,
    id: string,
    data: { cancelledById: string; cancelReason: string | null },
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const r = await tx.profitDistributionEvent.updateMany({
      where: { id, userId: ownerUserId, status: 'POSTED', deletedAt: null },
      data: { status: 'CANCELLED', cancelledAt: new Date(), ...data },
    });
    return r.count === 1;
  }

  public async findSourceDocument(ownerUserId: string, unitId: string, id: string): Promise<SourceDocument | null> {
    return prisma.sourceDocument.findFirst({ where: { id, userId: ownerUserId, unitId, deletedAt: null } });
  }

  public async totaisPorConta(
    ownerUserId: string,
    filtro: { de?: Date; ate: Date; status: readonly string[]; excluirFonte: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TotalPorConta[]> {
    const db = this.db(tx);
    const daFonte = (await db.journalEntry.findMany({ where: { userId: ownerUserId, sourceType: filtro.excluirFonte }, select: { id: true } })).map((e) => e.id);
    const grupos = await db.posting.groupBy({
      by: ['accountId'],
      where: {
        userId: ownerUserId,
        entry: {
          status: { in: [...filtro.status] },
          date: { ...(filtro.de ? { gte: filtro.de } : {}), lte: filtro.ate },
          NOT: [{ sourceType: filtro.excluirFonte }, { sourceType: 'reversal', sourceId: { in: daFonte } }],
        },
      },
      _sum: { debitCents: true, creditCents: true },
    });
    if (grupos.length === 0) return [];
    const contas = await db.account.findMany({ where: { id: { in: grupos.map((g) => g.accountId) } }, select: { id: true, code: true, nature: true } });
    const porId = new Map(contas.map((c) => [c.id, c]));
    return grupos.map((g) => ({
      code: porId.get(g.accountId)?.code ?? '',
      nature: porId.get(g.accountId)?.nature ?? '',
      debitCents: g._sum.debitCents ?? 0n,
      creditCents: g._sum.creditCents ?? 0n,
    }));
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
