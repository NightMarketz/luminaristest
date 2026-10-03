import { AccountingReportService } from '../AccountingReportService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import type { Account } from 'generated/prisma';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF item 7; 23 b) — resultado antes de IRPJ/CSLL na janela.
 *  - exclui o lançamento de encerramento: o T04 de um exercício encerrado dá o MESMO número que antes do encerramento;
 *  - exclui as contas de despesa da provisão (guarda de circularidade).
 * Fixture mistura naturezas (Revenue credit-normal e Expense debit-normal, ambas encerradas) — memória
 * `bp-dre-diagnostics-test-must-mix-natures`. Mesma técnica do `AccountingReportService.closing.test`.
 */
const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');
const acc = (code: string, nature: string): Account =>
  ({ id: code, userId: 'owner-1', unitId: 'unit-1', code, name: code, nature, acceptsEntries: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }) as Account;
const ACCOUNTS = [acc('1.1', 'Asset'), acc('2.3.1', 'Equity'), acc('3.1', 'Revenue'), acc('4.1', 'Expense'), acc('4.9.1', 'Expense')];

type Bal = Record<string, number>; // debit − credit
const toTotals = (bal: Bal) =>
  Object.entries(bal).map(([accountId, b]) => ({ accountId, debitCents: b > 0 ? b : 0, creditCents: b < 0 ? -b : 0 }));

// Receita 10.000; despesa operacional 4.000; despesa de IRPJ provisionada (4.9.1) 900.
const OPERATIONAL: Bal = { '1.1': 6000, '3.1': -10000, '4.1': 4000, '4.9.1': 900, '2.3.1': 0 };
// Encerrado em 31/12: resultado zerado contra lucros acumulados.
const POSTED_CLOSED: Bal = { '1.1': 6000, '3.1': 0, '4.1': 0, '4.9.1': 0, '2.3.1': -5100 };

function build(closed: boolean) {
  const groupByAccount = jest.fn(async (_s: unknown, _st: string[], opts?: { excludeSourceTypes?: string[] }) =>
    toTotals(closed && !opts?.excludeSourceTypes?.includes('closing') ? POSTED_CLOSED : OPERATIONAL),
  );
  return new AccountingReportService(
    { findManyByUnit: jest.fn(async () => ACCOUNTS) } as never,
    { groupByAccount } as never,
    {} as never,
    { canRead: () => true } as never,
  );
}

const from = new Date('2026-10-01T00:00:00Z');
const to = new Date('2026-12-31T23:59:59.999Z');

describe('AccountingReportService.resultadoAntesIrpjCsll (X7 item 7)', () => {
  it('23(b): T04 de exercício encerrado = mesmo resultado que antes do encerramento', async () => {
    const antes = await build(false).resultadoAntesIrpjCsll(scope, from, to, []);
    const depois = await build(true).resultadoAntesIrpjCsll(scope, from, to, []);
    expect(antes).toBe(10000 - 4000 - 900);
    expect(depois).toBe(antes);
  });

  it('guarda de circularidade: a despesa da provisão não entra na base', async () => {
    expect(await build(true).resultadoAntesIrpjCsll(scope, from, to, ['4.9.1'])).toBe(6000);
  });

  it('policy: sem canRead ⇒ Forbidden', async () => {
    const s = new AccountingReportService({} as never, {} as never, {} as never, { canRead: () => false } as never);
    await expect(s.resultadoAntesIrpjCsll(scope, from, to, [])).rejects.toThrow(/permissão/);
  });
});
