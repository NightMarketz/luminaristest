import prisma from '../../../lib/prisma';
import { Prisma, type InterestOnEquityCalculation } from 'generated/prisma';
import {
  JCP_VIVO,
  type IInterestOnEquityRepository,
  type InterestOnEquityData,
  type InterestOnEquityWithAlocacoes,
  type MovimentoDiario,
  type TotalDaConta,
} from './IInterestOnEquityRepository';

/** Prisma-backed JCP (IRRF-DISTRIBUICAO PR-3/PR-4). Zero regra de negócio (ver o contrato). */
export class InterestOnEquityRepository implements IInterestOnEquityRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async movimentosDasContas(
    ownerUserId: string,
    accountIds: readonly string[],
    ate: Date,
    status: readonly string[],
    tx?: Prisma.TransactionClient,
  ): Promise<MovimentoDiario[]> {
    if (accountIds.length === 0) return [];
    const pernas = await this.db(tx).posting.findMany({
      where: { userId: ownerUserId, accountId: { in: [...accountIds] }, entry: { status: { in: [...status] }, date: { lte: ate } } },
      select: { accountId: true, debitCents: true, creditCents: true, entry: { select: { date: true } } },
    });
    const porChave = new Map<string, MovimentoDiario>();
    for (const p of pernas) {
      const dia = p.entry.date.toISOString().slice(0, 10);
      const k = `${p.accountId}|${dia}`;
      const m = porChave.get(k) ?? { accountId: p.accountId, dia, debitCents: 0n, creditCents: 0n };
      m.debitCents += p.debitCents;
      m.creditCents += p.creditCents;
      porChave.set(k, m);
    }
    return [...porChave.values()];
  }

  public async totaisDaUnidade(
    ownerUserId: string,
    unitId: string,
    filtro: { de?: Date; ate: Date; status: readonly string[]; excluirFontes: readonly string[] },
    tx?: Prisma.TransactionClient,
  ): Promise<TotalDaConta[]> {
    const db = this.db(tx);
    const grupos = await db.posting.groupBy({
      by: ['accountId'],
      where: {
        userId: ownerUserId,
        unitId,
        entry: {
          status: { in: [...filtro.status] },
          date: { ...(filtro.de ? { gte: filtro.de } : {}), lte: filtro.ate },
          sourceType: { notIn: [...filtro.excluirFontes] },
        },
      },
      _sum: { debitCents: true, creditCents: true },
    });
    if (grupos.length === 0) return [];
    const contas = await db.account.findMany({ where: { id: { in: grupos.map((g) => g.accountId) } }, select: { id: true, code: true, nature: true } });
    const porId = new Map(contas.map((c) => [c.id, c]));
    return grupos.map((g) => ({
      accountId: g.accountId,
      code: porId.get(g.accountId)?.code ?? '',
      nature: porId.get(g.accountId)?.nature ?? '',
      debitCents: g._sum.debitCents ?? 0n,
      creditCents: g._sum.creditCents ?? 0n,
    }));
  }

  public async create(ownerUserId: string, actorUserId: string, data: InterestOnEquityData, tx: Prisma.TransactionClient): Promise<InterestOnEquityWithAlocacoes> {
    const { alocacoes, ...calc } = data;
    return tx.interestOnEquityCalculation.create({
      data: { userId: ownerUserId, createdById: actorUserId, status: 'PENDING_POST', vivoKey: JCP_VIVO, ...calc, alocacoes: { create: alocacoes } },
      include: { alocacoes: true },
    });
  }

  public async findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<InterestOnEquityWithAlocacoes | null> {
    return this.db(tx).interestOnEquityCalculation.findFirst({ where: { id, userId: ownerUserId, deletedAt: null }, include: { alocacoes: true } });
  }

  public async existsAlocacaoDoSocio(ownerUserId: string, partnerId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const row = await this.db(tx).interestOnEquityAllocation.findFirst({
      where: { partnerId, calculation: { userId: ownerUserId, deletedAt: null } },
      select: { id: true },
    });
    return row !== null;
  }

  public async findVivo(ownerUserId: string, anoCalendario: number, periodo: string, tx?: Prisma.TransactionClient): Promise<InterestOnEquityCalculation | null> {
    return this.db(tx).interestOnEquityCalculation.findFirst({ where: { userId: ownerUserId, anoCalendario, periodo, vivoKey: JCP_VIVO, deletedAt: null } });
  }

  public async listDaCompetencia(ownerUserId: string, competencia: string, status: readonly string[]): Promise<InterestOnEquityCalculation[]> {
    return prisma.interestOnEquityCalculation.findMany({
      where: { userId: ownerUserId, dataCredito: { startsWith: `${competencia}-` }, status: { in: [...status] }, deletedAt: null },
      orderBy: [{ dataCredito: 'asc' }, { createdAt: 'asc' }],
    });
  }

  public async markPosted(ownerUserId: string, id: string, entryId: string): Promise<boolean> {
    const r = await prisma.interestOnEquityCalculation.updateMany({
      where: { id, userId: ownerUserId, status: 'PENDING_POST', entryId: null, deletedAt: null },
      data: { status: 'POSTED', entryId },
    });
    return r.count === 1;
  }

  public async setLalurEntryIds(ownerUserId: string, id: string, ids: string[], tx: Prisma.TransactionClient): Promise<boolean> {
    const r = await tx.interestOnEquityCalculation.updateMany({
      where: { id, userId: ownerUserId, status: 'POSTED', lalurEntryIds: { equals: Prisma.DbNull }, deletedAt: null },
      data: { lalurEntryIds: ids },
    });
    return r.count === 1;
  }

  public async markCancelled(ownerUserId: string, id: string, cancelledById: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const r = await tx.interestOnEquityCalculation.updateMany({
      where: { id, userId: ownerUserId, status: 'POSTED', deletedAt: null },
      data: { status: 'CANCELLED', vivoKey: id, cancelledAt: new Date(), cancelledById },
    });
    return r.count === 1;
  }

  public async debitosNaContaDesde(
    ownerUserId: string,
    accountId: string,
    desde: Date,
    entryId: string,
    status: readonly string[],
    tx?: Prisma.TransactionClient,
  ): Promise<bigint> {
    const r = await this.db(tx).posting.aggregate({
      where: {
        userId: ownerUserId,
        accountId,
        debitCents: { gt: 0 },
        entry: {
          status: { in: [...status] },
          date: { gte: desde },
          NOT: [{ id: entryId }, { sourceType: 'reversal', sourceId: entryId }],
        },
      },
      _sum: { debitCents: true },
    });
    return r._sum.debitCents ?? 0n;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
