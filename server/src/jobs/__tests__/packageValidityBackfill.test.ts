/**
 * BE-INCR-PACOTE-VALIDADE §5.2 item 2a — backfill no boot (F-PV-3 b, 3b a, 3c b, 3e a). Os 6 casos que o §5.2
 * lista, contra um "banco" em memória atrás das deps puras (o cabeamento real é 1 linha por dep).
 */
import { runPackageValidityBackfill, type PackageValidityBackfillDeps } from '../packageValidityBackfill.job';

interface Bal {
  id: string;
  packageId: string;
  balanceCents: number;
  expiresAt: Date | null;
  newestCreditAt: Date;
}

function world(initial: Bal[], catalog: Record<string, number | null>) {
  const state = { balances: initial.map((b) => ({ ...b })), mark: null as Date | null, markWrites: 0, catalog };
  let now = new Date('2026-10-10T12:00:00Z');
  const deps: PackageValidityBackfillDeps = {
    getMark: async () => state.mark,
    setMark: async (at) => {
      state.mark = at;
      state.markWrites++;
    },
    now: () => now,
    listCandidates: async () =>
      state.balances
        .filter((b) => b.expiresAt === null && b.balanceCents > 0)
        .map((b) => ({ ownerUserId: 'o1', unitId: 'u1', balanceId: b.id, customerId: 'c1', packageId: b.packageId })),
    newestCreditAt: async (_s, _c, packageId) => state.balances.find((b) => b.packageId === packageId)!.newestCreditAt,
    loadValidityDays: async (_o, packageId) => state.catalog[packageId] ?? null,
    today: () => '2026-10-10',
    setExpiresAtIfNull: async (_s, balanceId, expiresAt) => {
      const b = state.balances.find((x) => x.id === balanceId)!;
      if (b.expiresAt) return false;
      b.expiresAt = expiresAt;
      return true;
    },
  };
  return { state, deps, setNow: (d: Date) => (now = d) };
}

const before = new Date('2026-09-01T00:00:00Z');

describe('runPackageValidityBackfill (item 2a)', () => {
  it('saldo legado com N = 30 → expiresAt = hoje + 30 (contado do backfill, 3b a); sem validade → null', async () => {
    const w = world(
      [
        { id: 'b30', packageId: 'p30', balanceCents: 5000, expiresAt: null, newestCreditAt: before },
        { id: 'bnull', packageId: 'pnull', balanceCents: 5000, expiresAt: null, newestCreditAt: before },
      ],
      { p30: 30, pnull: null },
    );
    const r = await runPackageValidityBackfill(w.deps);
    expect(w.state.balances.find((b) => b.id === 'b30')!.expiresAt).toEqual(new Date('2026-11-09T00:00:00.000Z'));
    expect(w.state.balances.find((b) => b.id === 'bnull')!.expiresAt).toBeNull();
    expect(r).toMatchObject({ updated: 1, skipped: 1, failed: 0 });
  });

  it('marca gravada só na 1ª execução; o 2º boot não muda nada (0 linhas)', async () => {
    const w = world([{ id: 'b30', packageId: 'p30', balanceCents: 5000, expiresAt: null, newestCreditAt: before }], { p30: 30 });
    const first = await runPackageValidityBackfill(w.deps);
    w.setNow(new Date('2026-10-20T12:00:00Z'));
    const second = await runPackageValidityBackfill(w.deps);
    expect(w.state.markWrites).toBe(1);
    expect(second.mark).toEqual(first.mark);
    expect(second.updated).toBe(0);
  });

  it('saldo com crédito DEPOIS da marca e expiresAt null (pacote sem prazo que passa a ter) → continua null', async () => {
    const w = world([], { p: null });
    await runPackageValidityBackfill(w.deps); // 1º boot grava a marca (deploy) em 2026-10-10T12:00Z
    w.state.balances.push({ id: 'bnew', packageId: 'p', balanceCents: 5000, expiresAt: null, newestCreditAt: new Date('2026-10-11T00:00:00Z') });
    w.state.catalog.p = 30;
    const r = await runPackageValidityBackfill(w.deps);
    expect(w.state.balances[0].expiresAt).toBeNull();
    expect(r.updated).toBe(0);
  });

  it('saldo ANTERIOR à marca, de pacote que passa a ter prazo → recebe o prazo no boot seguinte', async () => {
    const w = world([{ id: 'bold', packageId: 'p', balanceCents: 5000, expiresAt: null, newestCreditAt: before }], { p: null });
    await runPackageValidityBackfill(w.deps);
    expect(w.state.balances[0].expiresAt).toBeNull();
    w.state.catalog.p = 15;
    const r = await runPackageValidityBackfill(w.deps);
    expect(w.state.balances[0].expiresAt).toEqual(new Date('2026-10-25T00:00:00.000Z'));
    expect(r.updated).toBe(1);
  });

  it('falha num saldo não para o lote', async () => {
    const w = world(
      [
        { id: 'b1', packageId: 'p1', balanceCents: 5000, expiresAt: null, newestCreditAt: before },
        { id: 'b2', packageId: 'p2', balanceCents: 5000, expiresAt: null, newestCreditAt: before },
      ],
      { p1: 30, p2: 30 },
    );
    const orig = w.deps.loadValidityDays;
    w.deps.loadValidityDays = async (o, p) => (p === 'p1' ? Promise.reject(new Error('boom')) : orig(o, p));
    const r = await runPackageValidityBackfill(w.deps);
    expect(r).toMatchObject({ failed: 1, updated: 1 });
  });
});
