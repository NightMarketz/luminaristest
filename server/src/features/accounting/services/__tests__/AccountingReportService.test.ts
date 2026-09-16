/**
 * AccountingReportService — read-only ledger reporting, FIRST-CLASS PRISMA.
 *
 * What is mocked: the three REPOSITORIES and the POLICY (the injected collaborators).
 * No prisma client is needed here — the report service never opens a transaction; it
 * only reads through the (mocked) repositories. DynamicTableService is not involved.
 *
 * These tests pin the Contract §2.1 invariants:
 *  - trialBalance aggregates 'Posted', 'Reconciled' AND 'Reversed' parent statuses
 *    (emenda INCR4-A; a reversed entry + its reversal net to ZERO);
 *  - the `balanced` flag is EXACT integer equality Σdebit === Σcredit (no epsilon);
 *  - all amounts stay INTEGER CENTS (rows + grand totals);
 *  - accountLedger NotFound + Forbidden guards.
 */
import { AccountingReportService } from '../AccountingReportService';
import { ForbiddenError, NotFoundError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import { REPORT_WARN_THRESHOLDS_MS } from '../../../../lib/reportThresholds';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

function buildService(over: {
  accountRepo?: any;
  postingRepo?: any;
  journalEntryRepo?: any;
  policy?: any;
} = {}) {
  const accountRepo = {
    findByCode: jest.fn(async () => null),
    create: jest.fn(),
    findManyByUnit: jest.fn(async () => []),
    softDelete: jest.fn(),
    ...over.accountRepo,
  };
  const postingRepo = {
    create: jest.fn(),
    findByEntryId: jest.fn(async () => []),
    findByAccount: jest.fn(async () => []),
    groupByAccount: jest.fn(async () => []),
    ...over.postingRepo,
  };
  const journalEntryRepo = {
    create: jest.fn(),
    findById: jest.fn(async () => null),
    findBySource: jest.fn(async () => null),
    // C6b PR-1: default no-op so generalLedger() call sites that don't need fixtures (e.g. the
    // Forbidden guard test) don't have to pass one just to satisfy the mock shape.
    findManyForExport: jest.fn(async () => []),
    setStatus: jest.fn(),
    setReversedBy: jest.fn(),
    ...over.journalEntryRepo,
  };
  const policy = {
    canManage: jest.fn(() => true),
    canPost: jest.fn(() => true),
    canRead: jest.fn(() => true),
    ...over.policy,
  };
  const svc = new AccountingReportService(
    accountRepo as any,
    postingRepo as any,
    journalEntryRepo as any,
    policy as any,
  );
  return { svc, accountRepo, postingRepo, journalEntryRepo, policy };
}

describe('AccountingReportService.trialBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates over Posted, Reconciled AND Reversed statuses (excludes only Draft — emenda INCR4-A)', async () => {
    const groupByAccount = jest.fn(async () => []);
    const { svc } = buildService({ postingRepo: { groupByAccount } });
    await svc.trialBalance(scope);
    expect(groupByAccount).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], undefined);
  });

  it('builds rows in INTEGER CENTS, joined to the chart, sorted by code asc', async () => {
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          { accountId: 'acc-3.1', debitCents: 0, creditCents: 10000 },
          { accountId: 'acc-1.1.1', debitCents: 10000, creditCents: 0 },
        ]),
      },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' },
          { id: 'acc-3.1', code: '3.1', name: 'Receita de Vendas', nature: 'Revenue' },
        ]),
      },
    });
    const report = await svc.trialBalance(scope);

    expect(report.rows.map((r) => r.code)).toEqual(['1.1.1', '3.1']); // sorted asc
    const bank = report.rows.find((r) => r.code === '1.1.1')!;
    expect(bank).toMatchObject({
      accountId: 'acc-1.1.1',
      name: 'Banco',
      nature: 'Asset',
      debitCents: 10000,
      creditCents: 0,
      balanceCents: 10000, // debit - credit
    });
    const rev = report.rows.find((r) => r.code === '3.1')!;
    expect(rev.balanceCents).toBe(-10000); // 0 - 10000
    // every amount is an integer (cents), never a float
    for (const r of report.rows) {
      expect(Number.isInteger(r.debitCents)).toBe(true);
      expect(Number.isInteger(r.creditCents)).toBe(true);
      expect(Number.isInteger(r.balanceCents)).toBe(true);
    }
  });

  it('balanced=true with exact integer equality; grand totals are integer cents', async () => {
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          { accountId: 'acc-1.1.1', debitCents: 10000, creditCents: 0 },
          { accountId: 'acc-3.1', debitCents: 0, creditCents: 10000 },
        ]),
      },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' },
          { id: 'acc-3.1', code: '3.1', name: 'Receita', nature: 'Revenue' },
        ]),
      },
    });
    const report = await svc.trialBalance(scope);
    expect(report.totals).toEqual({ debitCents: 10000, creditCents: 10000, balanceCents: 0 });
    expect(report.balanced).toBe(true);
    expect(Number.isInteger(report.totals.debitCents)).toBe(true);
    expect(Number.isInteger(report.totals.creditCents)).toBe(true);
  });

  it('a reversed entry + its reversal net to ZERO across Posted+Reversed totals (balanced)', async () => {
    // Original (Reversed) bank-debit + its reversal (Posted) bank-credit cancel per account.
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          // bank: 10000 debit (original, now Reversed) + 10000 credit (reversal, Posted)
          { accountId: 'acc-1.1.1', debitCents: 10000, creditCents: 10000 },
          // revenue: 10000 credit (original) + 10000 debit (reversal)
          { accountId: 'acc-3.1', debitCents: 10000, creditCents: 10000 },
        ]),
      },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' },
          { id: 'acc-3.1', code: '3.1', name: 'Receita', nature: 'Revenue' },
        ]),
      },
    });
    const report = await svc.trialBalance(scope);
    // each account nets to zero, and the grand total is balanced
    expect(report.rows.every((r) => r.balanceCents === 0)).toBe(true);
    expect(report.totals).toEqual({ debitCents: 20000, creditCents: 20000, balanceCents: 0 });
    expect(report.balanced).toBe(true);
  });

  it('balanced=false when Σdebit !== Σcredit (exact, no epsilon)', async () => {
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          { accountId: 'acc-1.1.1', debitCents: 10001, creditCents: 0 },
          { accountId: 'acc-3.1', debitCents: 0, creditCents: 10000 },
        ]),
      },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' },
          { id: 'acc-3.1', code: '3.1', name: 'Receita', nature: 'Revenue' },
        ]),
      },
    });
    const report = await svc.trialBalance(scope);
    expect(report.balanced).toBe(false);
    expect(report.totals.balanceCents).toBe(1);
  });

  it('marks an orphan total (account removed from chart) with code "?" / "(conta removida)"', async () => {
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          { accountId: 'acc-gone', debitCents: 5000, creditCents: 0 },
        ]),
      },
      accountRepo: { findManyByUnit: jest.fn(async () => []) }, // chart has no such account
    });
    const report = await svc.trialBalance(scope);
    expect(report.rows[0]).toMatchObject({ code: '?', name: '(conta removida)', nature: '?' });
  });

  it('throws ForbiddenError when policy.canRead is false', async () => {
    const { svc, postingRepo } = buildService({ policy: { canRead: jest.fn(() => false) } });
    await expect(svc.trialBalance(scope)).rejects.toBeInstanceOf(ForbiddenError);
    expect(postingRepo.groupByAccount).not.toHaveBeenCalled();
  });

  // Incremento D / D2-Q5a: account 3.2 (Devoluções de Vendas) is Revenue-nature but carries a
  // DEBIT balance from returns, so net revenue (Σ crédito − débito over Revenue accounts) is
  // REDUCED by it. If 3.2 ever raised net revenue, the contra-revenue treatment would be a bug.
  it('a 3.2 (Devoluções) debit balance REDUCES net revenue (crédito − débito over Revenue accounts)', async () => {
    const { svc } = buildService({
      postingRepo: {
        groupByAccount: jest.fn(async () => [
          // Sale revenue recognized: 3.1 credit 10000.
          { accountId: 'acc-3.1', debitCents: 0, creditCents: 10000 },
          // A return: 3.2 debit 3000 (contra-revenue).
          { accountId: 'acc-3.2', debitCents: 3000, creditCents: 0 },
        ]),
      },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-3.1', code: '3.1', name: 'Receita de Vendas', nature: 'Revenue' },
          { id: 'acc-3.2', code: '3.2', name: 'Devoluções de Vendas', nature: 'Revenue' },
        ]),
      },
    });
    const report = await svc.trialBalance(scope);

    const netRevenueCents = report.rows
      .filter((r) => r.nature === 'Revenue')
      .reduce((acc, r) => acc + (r.creditCents - r.debitCents), 0);

    // Gross 10000 minus the 3000 return = 7000 net — strictly less than the gross.
    expect(netRevenueCents).toBe(7000);
    const grossRevenueCents = report.rows
      .filter((r) => r.code === '3.1')
      .reduce((acc, r) => acc + (r.creditCents - r.debitCents), 0);
    expect(netRevenueCents).toBeLessThan(grossRevenueCents);

    const devolucoes = report.rows.find((r) => r.code === '3.2')!;
    expect(devolucoes.balanceCents).toBe(3000); // debit − credit > 0 (debit balance)
  });

  // C6b PR-1 (F-C6b-6 a): `asOf` era aceito no DTO de EXPORT_TRIAL_BALANCE e IGNORADO em
  // silêncio (param-aceito-e-ignorado-e-bug) — trialBalance(scope, asOf) delega em balancesAsOf,
  // a MESMA janela [undefined, asOf] que já é usada por AgingReportService/CashForecastReportService.
  it('asOf informado delega em balancesAsOf — mesma janela (from=undefined, to=asOf) do groupByAccount', async () => {
    const asOf = new Date('2026-06-30T00:00:00.000Z');
    const groupByAccount = jest.fn(async () => [
      { accountId: 'acc-1.1.1', debitCents: 4000, creditCents: 0 },
    ]);
    const { svc } = buildService({
      postingRepo: { groupByAccount },
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' },
        ]),
      },
    });

    const withAsOf = await svc.trialBalance(scope, asOf);
    expect(groupByAccount).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], {
      from: undefined, to: asOf, excludeSourceTypes: undefined,
    });
    expect(withAsOf.rows[0].balanceCents).toBe(4000);

    // CONTROLE: sem asOf, a chamada NÃO carrega o filtro de data (comportamento antigo preservado).
    groupByAccount.mockClear();
    await svc.trialBalance(scope);
    expect(groupByAccount).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], undefined);
  });

  describe('duration metric (BRIEF-W2-D, layer 3)', () => {
    it('logs Metric: report_trialBalance at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { svc } = buildService({ postingRepo: { groupByAccount: jest.fn(async () => []) } });
      await svc.trialBalance(scope);

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: report_trialBalance');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs at warn when the read takes longer than REPORT_WARN_THRESHOLDS_MS.trialBalance (fake timers)', async () => {
      jest.useFakeTimers();
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { svc } = buildService({
        postingRepo: {
          groupByAccount: jest.fn(() =>
            new Promise((resolve) => setTimeout(() => resolve([]), REPORT_WARN_THRESHOLDS_MS.trialBalance + 500)),
          ),
        },
      });

      const pending = svc.trialBalance(scope);
      await jest.advanceTimersByTimeAsync(REPORT_WARN_THRESHOLDS_MS.trialBalance + 500);
      await pending;

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: report_trialBalance');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('success'); // still a success — only the log level moved to warn
      expect(infoSpy.mock.calls.find((c) => c[0] === 'Metric: report_trialBalance')).toBeUndefined();

      warnSpy.mockRestore();
      infoSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});

describe('AccountingReportService.accountLedger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws NotFoundError when the account code is not found in the unit', async () => {
    const { svc } = buildService({
      accountRepo: { findByCode: jest.fn(async () => null) },
    });
    await expect(svc.accountLedger(scope, '9.9.9')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when policy.canRead is false', async () => {
    const { svc, accountRepo } = buildService({ policy: { canRead: jest.fn(() => false) } });
    await expect(svc.accountLedger(scope, '1.1.1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(accountRepo.findByCode).not.toHaveBeenCalled();
  });

  it('hydrates Posted+Reversed legs only, sorted by entry date, with a running balance in cents', async () => {
    const account = { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' };
    const findById = jest.fn(async (_scope: AccountingScope, id: string) => {
      if (id === 'e-draft') return { status: 'Draft', date: new Date('2026-01-03'), description: 'd' };
      if (id === 'e1') return { status: 'Posted', date: new Date('2026-01-01'), description: 'a' };
      if (id === 'e2') return { status: 'Reversed', date: new Date('2026-01-02'), description: 'b' };
      return null;
    });
    const { svc } = buildService({
      accountRepo: { findByCode: jest.fn(async () => account) },
      postingRepo: {
        findByAccount: jest.fn(async () => [
          // intentionally out of date order; Draft leg must be dropped
          { id: 'p2', entryId: 'e2', debitCents: 0, creditCents: 3000 },
          { id: 'pd', entryId: 'e-draft', debitCents: 9999, creditCents: 0 },
          { id: 'p1', entryId: 'e1', debitCents: 10000, creditCents: 0 },
        ]),
      },
      journalEntryRepo: { findById },
    });
    const report = await svc.accountLedger(scope, '1.1.1');

    // Draft dropped; two rows remain, sorted by entry date asc
    expect(report.rows.map((r) => r.postingId)).toEqual(['p1', 'p2']);
    expect(report.rows[0].runningBalanceCents).toBe(10000); // +10000
    expect(report.rows[1].runningBalanceCents).toBe(7000); // 10000 - 3000
    expect(report.closingBalanceCents).toBe(7000);
    expect(report.account).toMatchObject({ accountId: 'acc-1.1.1', code: '1.1.1' });
    for (const r of report.rows) {
      expect(Number.isInteger(r.runningBalanceCents)).toBe(true);
    }
  });

  describe('duration metric (BRIEF-W2-D, layer 3)', () => {
    it('logs Metric: report_accountLedger at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const account = { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' };
      const { svc } = buildService({ accountRepo: { findByCode: jest.fn(async () => account) } });
      await svc.accountLedger(scope, '1.1.1');

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: report_accountLedger');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs Metric: report_accountLedger at warn (failure) when the account is not found', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const { svc } = buildService({ accountRepo: { findByCode: jest.fn(async () => null) } });

      await expect(svc.accountLedger(scope, '9.9.9')).rejects.toBeInstanceOf(NotFoundError);

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: report_accountLedger');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('failure');
      warnSpy.mockRestore();
    });

    it('does NOT log the metric on ForbiddenError (timer starts after the policy gate)', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { svc } = buildService({ policy: { canRead: jest.fn(() => false) } });

      await expect(svc.accountLedger(scope, '1.1.1')).rejects.toBeInstanceOf(ForbiddenError);

      expect(warnSpy.mock.calls.find((c) => c[0] === 'Metric: report_accountLedger')).toBeUndefined();
      expect(infoSpy.mock.calls.find((c) => c[0] === 'Metric: report_accountLedger')).toBeUndefined();
      warnSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });
});

// C6b PR-1 (Passo 6/7, F-C6b-7 a): accountLedger ganha `window?` opcional — filtra as legs à
// janela e prefixa uma linha OPENING_BALANCE com o saldo anterior. Sem window, comportamento
// idêntico ao describe acima (não retestado aqui).
describe('AccountingReportService.accountLedger — window opcional (C6b PR-1)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('com window: prefixa OPENING_BALANCE (saldo antes de from), filtra legs fora da janela e acumula o running balance a partir da abertura', async () => {
    const account = { id: 'acc-1.1.1', code: '1.1.1', name: 'Banco', nature: 'Asset' };
    const window = { from: new Date('2026-01-10T00:00:00.000Z'), to: new Date('2026-01-20T23:59:59.999Z') };
    const findById = jest.fn(async (_scope: AccountingScope, id: string) => {
      if (id === 'e0') return { status: 'Posted', date: new Date('2026-01-05T00:00:00.000Z'), description: 'antes da janela' };
      if (id === 'e1') return { status: 'Posted', date: new Date('2026-01-12T00:00:00.000Z'), description: 'dentro 1' };
      if (id === 'e2') return { status: 'Posted', date: new Date('2026-01-18T00:00:00.000Z'), description: 'dentro 2' };
      return null;
    });
    const { svc, postingRepo } = buildService({
      accountRepo: { findByCode: jest.fn(async () => account) },
      postingRepo: {
        groupByAccount: jest.fn(async () => [{ accountId: 'acc-1.1.1', debitCents: 5000, creditCents: 0 }]),
        findByAccount: jest.fn(async () => [
          { id: 'p0', entryId: 'e0', debitCents: 1000, creditCents: 0 }, // antes da janela — vira abertura
          { id: 'p2', entryId: 'e2', debitCents: 0, creditCents: 500 },  // fora de ordem de propósito
          { id: 'p1', entryId: 'e1', debitCents: 2000, creditCents: 0 },
        ]),
      },
      journalEntryRepo: { findById },
    });

    const report = await svc.accountLedger(scope, '1.1.1', window);

    // abertura pedida com `to` = 1ms antes de `window.from` (fim do dia anterior)
    expect(postingRepo.groupByAccount).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], {
      to: new Date(window.from.getTime() - 1),
    });

    expect(report.rows[0]).toMatchObject({ postingId: 'OPENING_BALANCE', status: 'OPENING_BALANCE', runningBalanceCents: 5000 });
    // p0 (antes da janela) NUNCA aparece — só contribui para a abertura.
    expect(report.rows.map((r) => r.postingId)).toEqual(['OPENING_BALANCE', 'p1', 'p2']);
    expect(report.rows[1].runningBalanceCents).toBe(7000); // 5000 + 2000
    expect(report.rows[2].runningBalanceCents).toBe(6500); // 7000 - 500
    expect(report.closingBalanceCents).toBe(6500);
  });
});

// C6b PR-1 (Passo 7, F-C6b-7 a): razão geral — sem accountCode, todas as contas com movimento
// na janela. Teste obrigatório do plano: 1 lançamento ANTES da janela + 2 DENTRO, 2 contas,
// conta sem movimento na janela some do resultado.
describe('AccountingReportService.generalLedger (C6b PR-1, F-C6b-7 a)', () => {
  beforeEach(() => jest.clearAllMocks());

  const window = { from: new Date('2026-01-10T00:00:00.000Z'), to: new Date('2026-01-20T23:59:59.999Z') };

  it('abertura por conta + running balance = abertura + Σ janela; conta sem movimento na janela NÃO aparece', async () => {
    const { svc, journalEntryRepo, postingRepo } = buildService({
      accountRepo: {
        findManyByUnit: jest.fn(async () => [
          { id: 'acc-a', code: '1.1.1', name: 'Banco' },
          { id: 'acc-b', code: '2.1.1', name: 'Fornecedores' },
        ]),
      },
      postingRepo: {
        // saldo ANTES de window.from: conta A tem 5000 (do lançamento pré-janela); conta B tem
        // 3000 — mas B não terá NENHUMA leg dentro da janela, então nunca aparece no resultado.
        groupByAccount: jest.fn(async () => [
          { accountId: 'acc-a', debitCents: 5000, creditCents: 0 },
          { accountId: 'acc-b', debitCents: 0, creditCents: 3000 },
        ]),
      },
      journalEntryRepo: {
        // findManyForExport já é window-filtrado pelo repo: só entram os 2 lançamentos DENTRO
        // da janela da conta A. O lançamento "antes da janela" (e0) NUNCA chega aqui — é
        // exatamente por isso que ele só pode afetar o resultado via a abertura (groupByAccount).
        findManyForExport: jest.fn(async () => [
          {
            id: 'e1', entryNumber: 10, date: new Date('2026-01-12T00:00:00.000Z'),
            description: 'venda 1', status: 'Posted',
            postings: [{ id: 'p1', accountId: 'acc-a', debitCents: 2000, creditCents: 0 }],
          },
          {
            id: 'e2', entryNumber: 11, date: new Date('2026-01-18T00:00:00.000Z'),
            description: 'venda 2', status: 'Posted',
            postings: [{ id: 'p2', accountId: 'acc-a', debitCents: 0, creditCents: 500 }],
          },
        ]),
      },
    });

    const rows = await svc.generalLedger(scope, window);

    expect(postingRepo.groupByAccount).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], {
      to: new Date(window.from.getTime() - 1),
    });
    expect(journalEntryRepo.findManyForExport).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], window);

    // conta B (sem legs na janela) não aparece — nem sua abertura vira linha órfã.
    expect(rows.every((r) => r.accountCode !== '2.1.1')).toBe(true);

    const aRows = rows.filter((r) => r.accountCode === '1.1.1');
    expect(aRows).toHaveLength(3); // OPENING_BALANCE + 2 legs
    expect(aRows[0]).toMatchObject({ status: 'OPENING_BALANCE', runningBalanceCents: 5000 });
    expect(aRows[1]).toMatchObject({ entryId: 'e1', debitCents: 2000, creditCents: 0, runningBalanceCents: 7000 });
    expect(aRows[2]).toMatchObject({ entryId: 'e2', debitCents: 0, creditCents: 500, runningBalanceCents: 6500 });
    // abertura + Σ janela (2000 - 500) = saldo final
    expect(aRows[aRows.length - 1].runningBalanceCents).toBe(5000 + (2000 - 500));
  });

  it('throws ForbiddenError when policy.canRead is false', async () => {
    const { svc, journalEntryRepo } = buildService({ policy: { canRead: jest.fn(() => false) } });
    await expect(svc.generalLedger(scope, window)).rejects.toBeInstanceOf(ForbiddenError);
    expect(journalEntryRepo.findManyForExport).not.toHaveBeenCalled();
  });
});
