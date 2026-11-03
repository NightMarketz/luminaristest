/**
 * FIX-DRE-DEDUCAO-SINAL (nó do vault, aberto 31/10 no preflight do H2) — teste-guarda.
 *
 * Receita líquida = receita bruta − deduções (Lei 6.404 art. 187 I). Dedução da receita (3.2 devoluções, 3.6 PIS/COFINS)
 * tem saldo DEVEDOR e tem de REDUZIR o resultado. O sintoma real (dev.db, seed-presumido, 31/10/2026): BP fora por
 * 32000 = 2 × o saldo de 16000 da 3.2 — o resultado somava a dedução em vez de subtraí-la.
 *
 * As asserções são só sobre o resultado (DRE, `netResultLine`/`balanced` do BP, LAIR) — não fixam o sinal exibido da
 * linha de dedução. O oráculo é a partida dobrada: com o razão fechado, A = P + PL + Resultado.
 */
import type { IAccountRepository } from '../../repositories/IAccountRepository';
import type { IPostingRepository } from '../../repositories/IPostingRepository';
import type { IJournalEntryRepository } from '../../repositories/IJournalEntryRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import { AccountingReportService } from '../AccountingReportService';

type Row = { accountId: string; debitCents: number; creditCents: number };

function makeAccount(code: string, nature: string) {
  return {
    id: code, code, name: code, nature, userId: 'u1', unitId: 'unit1', acceptsEntries: true,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };
}

/** Movimento só em 2026: janelas que terminam antes de 2026 (resultado do exercício anterior) não veem nada. */
function buildService(accounts: ReturnType<typeof makeAccount>[], rows: Row[]) {
  const accountRepo = { findManyByUnit: jest.fn(async () => accounts) } as unknown as IAccountRepository;
  const postingRepo = {
    groupByAccount: jest.fn(async (_s: unknown, _st: unknown, options?: { from?: Date; to?: Date }) =>
      options?.to && options.to.getUTCFullYear() < 2026 ? [] : rows),
  } as unknown as IPostingRepository;
  const journalEntryRepo = {} as unknown as IJournalEntryRepository;
  const policy = { canRead: jest.fn(() => true) } as unknown as IAccountingPolicy;
  return new AccountingReportService(accountRepo, postingRepo, journalEntryRepo, policy);
}

const SCOPE = {
  ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit1', ledgerCode: 'DEFAULT' as const,
  baseCurrencyCode: 'BRL' as const, timeZone: 'America/Sao_Paulo' as const,
};
const AS_OF = new Date('2026-10-31T23:59:59.999Z');

// Venda de 100000 recebida no caixa; devolução de 16000 paga do caixa.
const DEVOLUCAO = {
  accounts: [makeAccount('1.1', 'Asset'), makeAccount('3.1', 'Revenue'), makeAccount('3.2', 'Revenue')],
  rows: [
    { accountId: '1.1', debitCents: 100000, creditCents: 16000 },
    { accountId: '3.1', debitCents: 0, creditCents: 100000 },
    { accountId: '3.2', debitCents: 16000, creditCents: 0 },
  ],
};

// Venda de 100000 recebida no caixa; PIS 650 + COFINS 3000 sobre a receita, a recolher.
const PIS_COFINS = {
  accounts: [
    makeAccount('1.1', 'Asset'), makeAccount('2.1', 'Liability'), makeAccount('3.1', 'Revenue'),
    makeAccount('3.6.1', 'Revenue'), makeAccount('3.6.2', 'Revenue'),
  ],
  rows: [
    { accountId: '1.1', debitCents: 100000, creditCents: 0 },
    { accountId: '2.1', debitCents: 0, creditCents: 3650 },
    { accountId: '3.1', debitCents: 0, creditCents: 100000 },
    { accountId: '3.6.1', debitCents: 650, creditCents: 0 },
    { accountId: '3.6.2', debitCents: 3000, creditCents: 0 },
  ],
};

describe('FIX-DRE-DEDUCAO-SINAL — a dedução da receita reduz o resultado', () => {
  it('DRE: 3.1 crédito 100000 + 3.2 débito 16000 → resultado líquido 84000', async () => {
    const svc = buildService(DEVOLUCAO.accounts, DEVOLUCAO.rows);
    const dre = await svc.incomeStatement(SCOPE, AS_OF);
    expect(dre.netResult.amountCents).toBe('84000');
  });

  it('DRE: 3.1 crédito 100000 + 3.6.1/3.6.2 débito 650/3000 (PIS/COFINS) → resultado líquido 96350', async () => {
    const svc = buildService(PIS_COFINS.accounts, PIS_COFINS.rows);
    const dre = await svc.incomeStatement(SCOPE, AS_OF);
    expect(dre.netResult.amountCents).toBe('96350');
  });

  it('BP: razão fechado com devolução e PIS/COFINS → netResultLine = resultado e balanced true', async () => {
    const devolucao = await buildService(DEVOLUCAO.accounts, DEVOLUCAO.rows).balanceSheet(SCOPE, AS_OF);
    const pisCofins = await buildService(PIS_COFINS.accounts, PIS_COFINS.rows).balanceSheet(SCOPE, AS_OF);
    expect([devolucao.netResultLine.amountCents, devolucao.balanced]).toEqual(['84000', true]);
    expect([pisCofins.netResultLine.amountCents, pisCofins.balanced]).toEqual(['96350', true]);
  });

  it('LAIR do Real trimestral (resultadoAntesIrpjCsll) com dedução → 84000', async () => {
    const svc = buildService(DEVOLUCAO.accounts, DEVOLUCAO.rows);
    const lair = await svc.resultadoAntesIrpjCsll(SCOPE, new Date('2026-10-01T00:00:00.000Z'), AS_OF, []);
    expect(lair).toBe(84000);
  });
});
