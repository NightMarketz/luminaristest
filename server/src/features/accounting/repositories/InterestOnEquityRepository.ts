import prisma from '../../../lib/prisma';
import type { IInterestOnEquityRepository, MovimentoDiario, TotalDaConta } from './IInterestOnEquityRepository';

/** Prisma-backed leituras do JCP (IRRF-DISTRIBUICAO PR-3). Zero regra de negócio (ver o contrato). */
export class InterestOnEquityRepository implements IInterestOnEquityRepository {
  public async movimentosDasContas(ownerUserId: string, accountIds: readonly string[], ate: Date, status: readonly string[]): Promise<MovimentoDiario[]> {
    if (accountIds.length === 0) return [];
    const pernas = await prisma.posting.findMany({
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
  ): Promise<TotalDaConta[]> {
    const grupos = await prisma.posting.groupBy({
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
    const contas = await prisma.account.findMany({ where: { id: { in: grupos.map((g) => g.accountId) } }, select: { id: true, code: true, nature: true } });
    const porId = new Map(contas.map((c) => [c.id, c]));
    return grupos.map((g) => ({
      accountId: g.accountId,
      code: porId.get(g.accountId)?.code ?? '',
      nature: porId.get(g.accountId)?.nature ?? '',
      debitCents: g._sum.debitCents ?? 0n,
      creditCents: g._sum.creditCents ?? 0n,
    }));
  }
}
