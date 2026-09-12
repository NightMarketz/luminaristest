/**
 * LalurService — Parte B do e-Lalur/e-Lacs (BRIEF 3C; ADR-INCR-SPED-ECF-FASE3 EMENDA 2026-09-12, 3ª).
 * Repositório EM MEMÓRIA (o Prisma real é exercitado no teste de integração do controller); aqui se prova
 * a LÓGICA: ordem limpa do fechamento (item 10), M500 materializado (item 7), PF/BC derivado (Fork
 * F-3C-2 a — C4 e ambiguidade), âncora implícita + guarda de continuidade (C3), compensação acima do
 * saldo (item 13), refs re-lidas DENTRO da tx (item 16 — interleaving archive×create), regras do M410
 * (REGRA_MESMO_TRIBUTO, system sem PATCH de valor) e o diagnóstico materializado × recomputado (item 11).
 */
import { LalurService } from '../LalurService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { NotFoundError, ValidationError } from '../../../../lib/errors';
import { LALUR_PARTE_B_CLOSED, LALUR_PARTE_B_REOPENED } from '../../models/Lalur.model';
import type { LalurEntry, LalurParteBAccount, LalurParteBMovement } from 'generated/prisma';
import type {
  CreateLalurEntryData,
  CreateLalurParteBBalanceData,
  CreateLalurParteBMovementData,
  ILalurRepository,
  LalurClosingWithBalances,
  LalurEntryWithRelations,
  LalurMovementWithRelations,
} from '../../repositories/ILalurRepository';

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');
const TX = { __tx: true } as never;
let seq = 0;
const nid = (p: string) => `${p}-${++seq}`;

function acc(over: Partial<LalurParteBAccount>): LalurParteBAccount {
  return {
    id: nid('pb'), userId: 'owner-1', unitId: 'unit-1', codCtaB: 'X', descricao: 'x', dtCriacao: new Date('2024-12-31T00:00:00.000Z'),
    codPbRfb: '1000', dtLimite: null, codTributo: 'I', saldoIniCents: 0n, indSaldoIni: 'D', cnpjSitEsp: null,
    createdById: 'owner-1', createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...over,
  } as LalurParteBAccount;
}

/** Repo em memória — só o que o serviço usa; `tx` é passado adiante e ASSERIDO onde o item 16 exige. */
class FakeRepo {
  accounts: LalurParteBAccount[] = [];
  entries: LalurEntryWithRelations[] = [];
  movements: LalurMovementWithRelations[] = [];
  closings: LalurClosingWithBalances[] = [];
  /** item 16: id da conta que "alguém arquiva" entre a leitura pré-tx e a tx. */
  archiveInsideTx: string | null = null;
  calls: Array<{ m: string; tx: boolean }> = [];

  private live<T extends { deletedAt: Date | null }>(xs: T[]) { return xs.filter((x) => !x.deletedAt); }
  private rec(m: string, tx?: unknown) { this.calls.push({ m, tx: tx === TX }); }

  /** Rollback de verdade: lançar dentro da tx desfaz os writes (é o que o Prisma faz; o item 13 depende disso). */
  runTransaction = async <T>(fn: (tx: never) => Promise<T>) => {
    const snap = { accounts: this.accounts.map((x) => ({ ...x })), entries: this.entries.map((x) => ({ ...x })), movements: this.movements.map((x) => ({ ...x })), closings: this.closings.map((x) => ({ ...x })) };
    try {
      return await fn(TX);
    } catch (e) {
      Object.assign(this, snap);
      throw e;
    }
  };

  // Parte B accounts
  findParteBById = async (_s: unknown, id: string, tx?: unknown) => {
    this.rec('findParteBById', tx);
    const a = this.accounts.find((x) => x.id === id) ?? null;
    if (a && tx === TX && this.archiveInsideTx === id) return { ...a, deletedAt: new Date() };
    return a;
  };
  findManyParteB = async (_s: unknown, f: { includeArchived: boolean }) => (f.includeArchived ? this.accounts : this.live(this.accounts));
  updateParteB = async (_s: unknown, id: string, data: Record<string, unknown>) => { const a = this.accounts.find((x) => x.id === id)!; Object.assign(a, data); return a; };

  // Entries
  createEntry = async (data: CreateLalurEntryData, tx?: unknown) => {
    this.rec('createEntry', tx);
    const e = { id: nid('e'), ...data, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, parteB: this.accounts.find((a) => a.id === data.parteBId) ?? null, account: data.accountId ? { id: data.accountId, code: '3.1.1', nature: 'Revenue', deletedAt: null } : null, processos: [], journalLinks: [] } as unknown as LalurEntryWithRelations;
    this.entries.push(e);
    return e as unknown as LalurEntry;
  };
  findEntryById = async (_s: unknown, id: string) => (this.entries.find((e) => e.id === id) as unknown as LalurEntry) ?? null;
  findEntriesForYear = async (_s: unknown, year: number) => this.live(this.entries).filter((e) => e.year === year);
  updateEntry = async (_s: unknown, id: string, data: Record<string, unknown>) => { const e = this.entries.find((x) => x.id === id)!; Object.assign(e, data); return e as unknown as LalurEntry; };
  countLiveEntriesByParteB = async (_s: unknown, id: string, tx?: unknown) => { this.rec('countLiveEntriesByParteB', tx); return this.live(this.entries).filter((e) => e.parteBId === id).length; };
  countLiveEntriesByAccount = async () => 0;
  replaceEntryProcesses = async () => undefined;
  replaceMovementProcesses = async () => undefined;
  replaceEntryJournalLinks = async () => undefined;
  findJournalEntriesForLinks = async () => [];

  // Movements
  createMovement = async (data: CreateLalurParteBMovementData) => {
    const m = { id: nid('mv'), ...data, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, parteB: this.accounts.find((a) => a.id === data.parteBId)!, contrapartida: this.accounts.find((a) => a.id === data.contrapartidaId) ?? null, processos: [] } as unknown as LalurMovementWithRelations;
    this.movements.push(m);
    return m as unknown as LalurParteBMovement;
  };
  findMovementById = async (_s: unknown, id: string) => (this.movements.find((m) => m.id === id) as unknown as LalurParteBMovement) ?? null;
  findManyMovements = async (_s: unknown, f: { year?: number; quarter?: string; includeArchived: boolean }) =>
    (f.includeArchived ? this.movements : this.live(this.movements)).filter((m) => (f.year === undefined || m.year === f.year) && (!f.quarter || m.quarter === f.quarter)) as unknown as LalurParteBMovement[];
  findMovementsForYear = async (_s: unknown, year: number) => this.live(this.movements).filter((m) => m.year === year);
  updateMovement = async (_s: unknown, id: string, data: Record<string, unknown>) => {
    const m = this.movements.find((x) => x.id === id)!;
    const { contrapartida, ...rest } = data as { contrapartida?: { connect?: { id: string }; disconnect?: true } };
    Object.assign(m, rest);
    if (contrapartida) m.contrapartidaId = contrapartida.connect?.id ?? null; // espelha o connect/disconnect do Prisma
    return m as unknown as LalurParteBMovement;
  };
  countLiveMovementsByParteB = async (_s: unknown, id: string, tx?: unknown) => { this.rec('countLiveMovementsByParteB', tx); return this.live(this.movements).filter((m) => m.parteBId === id || m.contrapartidaId === id).length; };

  // Closings
  findClosing = async (_s: unknown, year: number, quarter: string) => this.closings.find((c) => c.year === year && c.quarter === quarter) ?? null;
  findClosingsForYear = async (_s: unknown, year: number) => this.closings.filter((c) => c.year === year).sort((a, b) => a.quarter.localeCompare(b.quarter));
  existsClosingBefore = async (_s: unknown, year: number) => this.closings.some((c) => c.year < year);
  createClosing = async (data: { year: number; quarter: string; balancesSha256: string }, balances: CreateLalurParteBBalanceData[]) => {
    const c = { id: nid('cl'), userId: 'owner-1', unitId: 'unit-1', closedAt: new Date(), closedById: 'owner-1', ...data, balances: balances.map((b) => ({ id: nid('bal'), closingId: 'x', ...b, parteB: this.accounts.find((a) => a.id === b.parteBId)! })) } as unknown as LalurClosingWithBalances;
    this.closings.push(c);
    return c;
  };
  deleteClosing = async (id: string) => { this.closings = this.closings.filter((c) => c.id !== id); };
}

function build(over: { netResult?: Record<string, string> } = {}) {
  const repo = new FakeRepo();
  const accountRepo = { findById: jest.fn(async (_s: unknown, id: string) => ({ id, code: '3.1.1', nature: 'Revenue' })) };
  const events: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
  const audit = { append: jest.fn(async (_tx: unknown, _s: unknown, ev: { eventType: string; payload: Record<string, unknown> }) => { events.push(ev); }) };
  const policy = { canManageLalur: () => true, canReadLalur: () => true };
  // DRE YTD closing-exclusive por data-fim: default resultado 0 em todo trimestre
  const reports = { incomeStatement: jest.fn(async (_s: unknown, asOf: Date) => ({ netResult: { amountCents: over.netResult?.[asOf.toISOString().slice(0, 10)] ?? '0' } })) };
  const svc = new LalurService(repo as unknown as ILalurRepository, accountRepo as never, audit as never, policy as never, reports as never);
  return { svc, repo, events, reports, accountRepo };
}

const bal = (c: LalurClosingWithBalances, id: string) => c.balances.find((b) => b.parteBId === id)!;

describe('closeParteB — ordem limpa + M500 materializado (itens 7/10)', () => {
  it('fecha T01 com adição (A→D), exclusão (E→C), compensação (P→C) e transferência (espelho); audit com sha256, sem valores', async () => {
    const { svc, repo, events } = build();
    const pf = acc({ codCtaB: 'PF', codPbRfb: '1000', saldoIniCents: 500_000n, indSaldoIni: 'D' });
    const prov = acc({ codCtaB: 'PROV', codPbRfb: '1010' });
    const dep = acc({ codCtaB: 'DEP', codPbRfb: '1020' });
    repo.accounts.push(pf, prov, dep);
    await svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 120_000, indRelacao: '1', parteBId: prov.id });
    await svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '166', valorCents: 30_000, indRelacao: '1', parteBId: dep.id });
    await svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '173', valorCents: 200_000, indRelacao: '1', parteBId: pf.id });
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: prov.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 10_000, contrapartidaId: dep.id, historico: 'transf', indLanAnt: 'N' });

    const c = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(c.balances).toHaveLength(3);
    expect(bal(c, pf.id)).toMatchObject({ sdIniCents: 500_000n, indSdIni: 'D', vlParteACents: 200_000n, indVlParteA: 'C', vlParteBCents: 0n, indVlParteB: 'C', sdFimCents: 300_000n, indSdFim: 'D' });
    expect(bal(c, prov.id)).toMatchObject({ vlParteACents: 120_000n, indVlParteA: 'D', vlParteBCents: 10_000n, indVlParteB: 'D', sdFimCents: 130_000n, indSdFim: 'D' });
    expect(bal(c, dep.id)).toMatchObject({ vlParteACents: 30_000n, indVlParteA: 'C', vlParteBCents: 10_000n, indVlParteB: 'C', sdFimCents: 40_000n, indSdFim: 'C' });
    const ev = events.find((e) => e.eventType === LALUR_PARTE_B_CLOSED)!;
    expect(ev.payload).toMatchObject({ year: '2025', quarter: 'T01', accounts: '3', reclosed: 'false' });
    expect(String(ev.payload.balancesSha256)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(ev.payload)).not.toContain('300000'); // nunca os valores
  });

  it('T02 antes de T01 é 400; T02 lê sdIni do T01 MATERIALIZADO; reabrir T01 com T02 fechado é 400; refechar T01 com T02 fechado é 400', async () => {
    const { svc, repo, events } = build();
    const pf = acc({ codCtaB: 'PF', saldoIniCents: 1_000n });
    repo.accounts.push(pf);
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T02' })).rejects.toThrow(/Feche T01\/2025 antes de T02/);
    await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T02', indicador: 'DB', valorCents: 5, historico: 'x', indLanAnt: 'N' });
    const t2 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T02' });
    expect(bal(t2, pf.id)).toMatchObject({ sdIniCents: 1_000n, sdFimCents: 1_005n });
    await expect(svc.reopenParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/T02\/2025 está fechado/);
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/T02\/2025 já está fechado/);
    await svc.reopenParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T02' });
    expect(repo.closings.map((c) => c.quarter)).toEqual(['T01']);
    expect(events.some((e) => e.eventType === LALUR_PARTE_B_REOPENED && e.payload.quarter === 'T02')).toBe(true);
    await expect(svc.reopenParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T03' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refechar recalcula e SUBSTITUI (uma linha-pai por período — C1); tenant com zero contas fecha mesmo assim', async () => {
    const { svc, repo } = build();
    const c0 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(c0.balances).toHaveLength(0); // C1: "fechado" existe sem saldo nenhum
    const pf = acc({ codCtaB: 'PF', saldoIniCents: 7n });
    repo.accounts.push(pf);
    const c1 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(repo.closings).toHaveLength(1);
    expect(c1.id).not.toBe(c0.id);
    expect(bal(c1, pf.id).sdFimCents).toBe(7n);
  });
});

describe('PF/BC derivado no fechamento (Fork F-3C-2 a; D-P3.3; C4)', () => {
  // T01 termina 31/03: DRE YTD = −1.000,00 ⇒ resultado T01 = −100.000 centavos; T02 YTD = −1.000 + 250 ⇒ T02 = +25.000
  const netResult = { '2025-03-31': '-100000', '2025-06-30': '-75000' };

  it('base < 0 ⇒ movimento system PF na única conta 1000 (valor = |base|); base ≥ 0 no trimestre seguinte ⇒ nenhum PF', async () => {
    const { svc, repo } = build({ netResult });
    const pf = acc({ codCtaB: 'PF', codPbRfb: '1000', codTributo: 'I' });
    const bc = acc({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C' });
    repo.accounts.push(pf, bc);
    // adição de 20.000 no lalur (A) reduz o prejuízo: base I = −100.000 + 20.000 = −80.000; lacs: −100.000
    await svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 20_000, indRelacao: '4', histLancamento: 'nd' });
    const c = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    const sys = repo.movements.filter((m) => m.origem === 'system' && !m.deletedAt);
    expect(sys.map((m) => [m.indicador, m.valorCents, m.parteBId])).toEqual(expect.arrayContaining([['PF', 80_000n, pf.id], ['BC', 100_000n, bc.id]]));
    expect(bal(c, pf.id)).toMatchObject({ vlParteBCents: 80_000n, indVlParteB: 'D', sdFimCents: 80_000n, indSdFim: 'D' });
    // T02: resultado +25.000 ⇒ base ≥ 0 ⇒ nenhum PF/BC system vivo em T02
    const c2 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T02' });
    expect(repo.movements.filter((m) => m.origem === 'system' && m.quarter === 'T02' && !m.deletedAt)).toHaveLength(0);
    expect(bal(c2, pf.id)).toMatchObject({ sdIniCents: 80_000n, sdFimCents: 80_000n });
  });

  it('refechar com base que virou ≥ 0 ARQUIVA o PF system; refechar com base menor ATUALIZA o valor (idempotente)', async () => {
    const t = build({ netResult: { '2025-03-31': '-50000' } });
    t.repo.accounts.push(acc({ codCtaB: 'PF', codPbRfb: '1000' }), acc({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C' }));
    await t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    const first = t.repo.movements.find((m) => m.indicador === 'PF')!;
    expect(first.valorCents).toBe(50_000n);
    t.reports.incomeStatement.mockImplementation(async () => ({ netResult: { amountCents: '-20000' } }));
    await t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(t.repo.movements.filter((m) => m.indicador === 'PF' && !m.deletedAt)).toHaveLength(1);
    expect(first.valorCents).toBe(20_000n); // mesmo movimento, valor novo
    t.reports.incomeStatement.mockImplementation(async () => ({ netResult: { amountCents: '999' } }));
    await t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(first.deletedAt).not.toBeNull();
  });

  it('C4: base < 0 sem conta de prejuízo do tributo ⇒ 400 nomeando COD_PB_RFB 1000/1003; >1 conta ⇒ 400 (ambíguo)', async () => {
    const t = build({ netResult: { '2025-03-31': '-1' } });
    t.repo.accounts.push(acc({ codCtaB: 'PF', codPbRfb: '1000' })); // só IRPJ — falta a de CSLL
    await expect(t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/COD_PB_RFB 1003 \(C\)/);
    expect(t.repo.closings).toHaveLength(0);
    t.repo.accounts.push(acc({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C' }), acc({ codCtaB: 'PF-RURAL', codPbRfb: '1002' }));
    await expect(t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/Mais de uma conta de prejuízo viva para o tributo I/);
  });

  it('movimento system não aceita PATCH de valorCents/indicador (400) — só archive', async () => {
    const t = build({ netResult: { '2025-03-31': '-100' } });
    t.repo.accounts.push(acc({ codCtaB: 'PF', codPbRfb: '1000' }), acc({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C' }));
    await t.svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    const sys = t.repo.movements.find((m) => m.origem === 'system')!;
    await expect(t.svc.updateMovement(scope, sys.id, { unitId: 'unit-1', valorCents: 1 })).rejects.toThrow(/derivado pelo fechamento/);
    await expect(t.svc.updateMovement(scope, sys.id, { unitId: 'unit-1', historico: 'nota' })).resolves.toMatchObject({ historico: 'nota' });
    await expect(t.svc.archiveMovement(scope, sys.id, { unitId: 'unit-1' })).resolves.toMatchObject({ deletedAt: expect.any(Date) });
  });
});

describe('C3 — âncora implícita + guarda de continuidade', () => {
  it('sem exercício anterior fechado: sdIni(T01) = coluna; com (N−1,T04) fechado: sdIni(T01) = sdFim materializado, coluna ignorada', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF', saldoIniCents: 999n, indSaldoIni: 'D', dtCriacao: new Date('2023-12-31T00:00:00.000Z') });
    repo.accounts.push(pf);
    const c24 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2024, quarter: 'T01' });
    expect(bal(c24, pf.id).sdIniCents).toBe(999n);
    for (const q of ['T02', 'T03', 'T04'] as const) await svc.closeParteB(scope, { unitId: 'unit-1', year: 2024, quarter: q });
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2024, quarter: 'T04', indicador: 'DB', valorCents: 1, historico: 'x', indLanAnt: 'N' });
    await svc.closeParteB(scope, { unitId: 'unit-1', year: 2024, quarter: 'T04' }); // refecha T04 com o movimento: sdFim = 1000
    const opening = await svc.openingBalances(scope, 2025, [pf]);
    expect(opening.get(pf.id)).toBe(1_000n); // não 999 (coluna)
    const c25 = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(bal(c25, pf.id).sdIniCents).toBe(1_000n);
  });

  it('fechou 2024 até T03 (não T04) e tenta 2025/T01 ⇒ 400 "feche 2024"; fechou 2023/T04 e pula 2024 ⇒ idem', async () => {
    const { svc, repo } = build();
    repo.accounts.push(acc({ codCtaB: 'PF', dtCriacao: new Date('2023-12-31T00:00:00.000Z') }));
    for (const q of ['T01', 'T02', 'T03'] as const) await svc.closeParteB(scope, { unitId: 'unit-1', year: 2024, quarter: q });
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/Feche os quatro trimestres de 2024/);
    await svc.closeParteB(scope, { unitId: 'unit-1', year: 2024, quarter: 'T04' });
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2026, quarter: 'T01' })).rejects.toThrow(/Feche os quatro trimestres de 2025/);
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).resolves.toBeDefined();
  });

  it('REGRA_DT_AP_ZERO na âncora: conta criada no exercício com saldo ≠ 0 é 400', async () => {
    const { svc, repo } = build();
    repo.accounts.push(acc({ codCtaB: 'NOVA', dtCriacao: new Date('2025-06-30T00:00:00.000Z'), saldoIniCents: 5n }));
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/REGRA_DT_AP_ZERO/);
  });
});

describe('item 13 — compensação acima do saldo da conta da Parte B', () => {
  it('P maior que o saldo acumulado ⇒ 400 no create (write desfeito) e no close; saldo C em conta sem compensação é legítimo', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF', saldoIniCents: 100n });
    const dep = acc({ codCtaB: 'DEP', codPbRfb: '1020' });
    repo.accounts.push(pf, dep);
    await expect(
      svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '173', valorCents: 101, indRelacao: '1', parteBId: pf.id }),
    ).rejects.toThrow(/Compensação excede o saldo/);
    await expect(
      svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '173', valorCents: 100, indRelacao: '1', parteBId: pf.id }),
    ).resolves.toBeDefined();
    // transferência PROV→DEP deixa DEP com saldo C (−40) — não é compensação, não bloqueia (e não toca a base do PF)
    const prov = acc({ codCtaB: 'PROV', codPbRfb: '1010' });
    repo.accounts.push(prov);
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: prov.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 40, contrapartidaId: dep.id, historico: 'transf', indLanAnt: 'N' });
    const c = await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect(bal(c, dep.id)).toMatchObject({ sdFimCents: 40n, indSdFim: 'C' });
    expect(bal(c, pf.id)).toMatchObject({ sdFimCents: 0n });
    // defesa em profundidade no close: um CR de 1 na conta compensada depois do ajuste deixa sdFim = −1 ⇒ 400
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'CR', valorCents: 1, historico: 'x', indLanAnt: 'N' });
    await expect(svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' })).rejects.toThrow(/Compensação excede o saldo/);
  });
});

describe('item 16 — refs re-lidas DENTRO da tx (interleaving archive × create)', () => {
  it('conta da Parte B arquivada entre a leitura pré-tx e a tx ⇒ NotFound e NENHUM write; a leitura decisiva carrega o tx', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF' });
    repo.accounts.push(pf);
    repo.archiveInsideTx = pf.id; // "outro request" arquiva antes do nosso write
    await expect(
      svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1, indRelacao: '1', parteBId: pf.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.calls.some((c) => c.m === 'createEntry')).toBe(false);
    expect(repo.calls.filter((c) => c.m === 'findParteBById').every((c) => c.tx)).toBe(true);
  });
  it('archiveParteB conta ajustes E movimentos vivos dentro da tx (tx propagado)', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF' });
    const other = acc({ codCtaB: 'OUT', codPbRfb: '1010' });
    repo.accounts.push(pf, other);
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: other.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 1, contrapartidaId: pf.id, historico: 'x', indLanAnt: 'N' });
    await expect(svc.archiveParteB(scope, pf.id, { unitId: 'unit-1' })).rejects.toThrow(/movimentos da Parte B/);
    expect(repo.calls.filter((c) => c.m === 'countLiveEntriesByParteB' || c.m === 'countLiveMovementsByParteB').every((c) => c.tx)).toBe(true);
  });
});

describe('M410 — regras do serviço', () => {
  it('codTributo é DERIVADO da conta; contrapartida de outro tributo é 400 (REGRA_MESMO_TRIBUTO); contrapartida inexistente é 404', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF', codTributo: 'I' });
    const bc = acc({ codCtaB: 'BC', codPbRfb: '1003', codTributo: 'C' });
    const pf2 = acc({ codCtaB: 'PF2', codPbRfb: '1001', codTributo: 'I' });
    repo.accounts.push(pf, bc, pf2);
    const ok = await svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 1, contrapartidaId: pf2.id, historico: 'x', indLanAnt: 'N' });
    expect(ok).toMatchObject({ codTributo: 'I', origem: 'user' });
    await expect(
      svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 1, contrapartidaId: bc.id, historico: 'x', indLanAnt: 'N' }),
    ).rejects.toThrow(/REGRA_MESMO_TRIBUTO/);
    await expect(
      svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 1, contrapartidaId: 'nope', historico: 'x', indLanAnt: 'N' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    // update: mudar para PF mantendo contrapartida ⇒ 400 (merge revalidado)
    await expect(svc.updateMovement(scope, ok.id, { unitId: 'unit-1', indicador: 'PF' })).rejects.toThrow(/REGRA_NAO_PREENCHER_CTP/);
    await expect(svc.updateMovement(scope, ok.id, { unitId: 'unit-1', indicador: 'PF', contrapartidaId: null })).resolves.toMatchObject({ indicador: 'PF', contrapartidaId: null });
  });
});

describe('diagnóstico materializado × recomputado (item 11)', () => {
  it('sem edição depois do fechamento: zero divergências; movimento novo no período fechado ⇒ divergência em vlB/sdFim; refechar zera', async () => {
    const { svc, repo } = build();
    const pf = acc({ codCtaB: 'PF', saldoIniCents: 10n });
    repo.accounts.push(pf);
    await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    let d = await svc.parteBBalances(scope, { unitId: 'unit-1', year: 2025 });
    expect(d.divergences).toEqual([]);
    expect(d.periods.map((p) => [p.quarter, p.closed])).toEqual([['T01', true], ['T02', false], ['T03', false], ['T04', false]]);
    expect(d.periods[0].accounts[0]).toMatchObject({ codCtaB: 'PF', materialized: { sdIni: '10', sdFim: '10' }, recomputed: { sdFim: '10' }, divergent: false });
    await svc.createMovement(scope, { unitId: 'unit-1', parteBId: pf.id, year: 2025, quarter: 'T01', indicador: 'DB', valorCents: 5, historico: 'tarde', indLanAnt: 'N' });
    d = await svc.parteBBalances(scope, { unitId: 'unit-1', year: 2025 });
    expect(d.divergences.map((x) => [x.quarter, x.field, x.materialized, x.recomputed])).toEqual([['T01', 'vlB', '0', '5'], ['T01', 'sdFim', '10', '15']]);
    expect(d.periods[0].accounts[0].divergent).toBe(true);
    await svc.closeParteB(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01' });
    expect((await svc.parteBBalances(scope, { unitId: 'unit-1', year: 2025 })).divergences).toEqual([]);
  });
  it('item 18: ajuste com conta contábil de natureza fora de 01..04 é 400 no create', async () => {
    const { svc, accountRepo } = build();
    accountRepo.findById.mockResolvedValueOnce({ id: 'a9', code: '9.9', nature: 'Memo' });
    await expect(
      svc.createEntry(scope, { unitId: 'unit-1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1, indRelacao: '2', accountId: 'a9' }),
    ).rejects.toThrow(/COD_NAT 09/);
    expect(ValidationError).toBeDefined();
  });
});
