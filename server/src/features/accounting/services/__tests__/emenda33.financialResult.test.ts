/**
 * Emenda 3.3 (BE-INCR-ENCARGOS-DESCONTOS), PR-1 — E1, E2, E3 e E26 (F-ENC-1 a, F-ENC-9 a; tarifa em 4.6, dono 13/10).
 *  - E1/E26: o plano canônico traz os grupos 3.5/4.3/4.4 e as 9 folhas com natureza e `acceptsEntries` esperados;
 *  - E2: resolução classe → conta é pura, por lado; a conta re-lida só serve viva, folha e com a natureza esperada;
 *  - E3: 3.5 e 4.3 vão para `financialResult` (antes da regra só por natureza); 4.4 e 4.6 ficam em `expenses`;
 *    netResult = −Σ saldos de resultado; diagnóstico sem conta sem mapa; BP fecha.
 */
import type { IAccountRepository } from '../../repositories/IAccountRepository';
import type { IPostingRepository } from '../../repositories/IPostingRepository';
import type { IJournalEntryRepository } from '../../repositories/IJournalEntryRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import { AccountingReportService } from '../AccountingReportService';
import { findMappingRule, STATEMENT_MAPPING_VERSION } from '../StatementMappingFixture';
import { BANK_FEE_CODE, CANONICAL_ACCOUNTS } from '../../fixtures/ChartOfAccountsFixture';
import {
  BANK_CHARGE_KINDS_BY_SIDE,
  isFinancialAccountUsable,
  resolveFinancialAccountCode,
} from '../../models/BankSettlement.model';

function makeAccount(o: { id: string; code: string; nature: string }) {
  return {
    id: o.id, code: o.code, name: o.code, nature: o.nature, userId: 'u1', unitId: 'unit1', acceptsEntries: true,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  };
}

type MockGroupByResult = { accountId: string; debitCents: number; creditCents: number };

function buildService(accounts: ReturnType<typeof makeAccount>[], raw: MockGroupByResult[]) {
  const accountRepo = { findManyByUnit: jest.fn(async () => accounts), findByCode: jest.fn(async () => null) } as unknown as IAccountRepository;
  const postingRepo = {
    // só o ano corrente tem movimento: a janela do ano anterior volta vazia
    groupByAccount: jest.fn(async (_s: unknown, _st: unknown, opts?: { to?: Date }) => (opts?.to && opts.to.getUTCFullYear() < 2026 ? [] : raw)),
  } as unknown as IPostingRepository;
  const journalEntryRepo = {} as unknown as IJournalEntryRepository;
  const policy = { canRead: jest.fn(() => true), canPost: jest.fn(() => true) } as unknown as IAccountingPolicy;
  return new AccountingReportService(accountRepo, postingRepo, journalEntryRepo, policy);
}

const SCOPE = {
  ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit1',
  ledgerCode: 'DEFAULT' as const, baseCurrencyCode: 'BRL' as const, timeZone: 'America/Sao_Paulo' as const,
};
const AS_OF = new Date('2026-06-30T23:59:59.999Z');

describe('E1/E26 — plano canônico da emenda 3.3', () => {
  const byCode = new Map(CANONICAL_ACCOUNTS.map((a) => [a.code, a]));

  it('grupos 3.5, 4.3 e 4.4 não aceitam lançamento', () => {
    expect(['3.5', '4.3', '4.4'].map((c) => `${c}:${byCode.get(c)?.nature}:${byCode.get(c)?.acceptsEntries}`)).toEqual([
      '3.5:Revenue:false', '4.3:Expense:false', '4.4:Expense:false',
    ]);
  });

  it('as 9 folhas (8 de encargo/desconto + tarifa 4.6) têm a natureza esperada e aceitam lançamento', () => {
    const folhas = ['3.5.1', '3.5.2', '3.5.3', '4.3.1', '4.3.2', '4.3.3', '4.4.1', '4.4.2', '4.6'];
    expect(folhas.map((c) => `${c}:${byCode.get(c)?.nature}:${byCode.get(c)?.acceptsEntries}`)).toEqual([
      '3.5.1:Revenue:true', '3.5.2:Revenue:true', '3.5.3:Revenue:true',
      '4.3.1:Expense:true', '4.3.2:Expense:true', '4.3.3:Expense:true',
      '4.4.1:Expense:true', '4.4.2:Expense:true', '4.6:Expense:true',
    ]);
    expect(BANK_FEE_CODE).toBe('4.6');
  });

  it('não colide com o kit fiscal: nenhuma conta canônica em 4.5 / 4.5.x', () => {
    expect(CANONICAL_ACCOUNTS.filter((a) => a.code === '4.5' || a.code.startsWith('4.5.'))).toEqual([]);
  });
});

describe('E2 — resolveFinancialAccountCode / isFinancialAccountUsable', () => {
  it('AP: encargos em 4.3.x/4.4.x (Expense), desconto obtido em 3.5.3 (Revenue)', () => {
    expect(resolveFinancialAccountCode('PAYABLE', 'JUROS_MORA')).toEqual({ code: '4.3.1', nature: 'Expense' });
    expect(resolveFinancialAccountCode('PAYABLE', 'MULTA_MORA')).toEqual({ code: '4.3.2', nature: 'Expense' });
    expect(resolveFinancialAccountCode('PAYABLE', 'MULTA_OFICIO')).toEqual({ code: '4.4.1', nature: 'Expense' });
    expect(resolveFinancialAccountCode('PAYABLE', 'MULTA_NAO_TRIBUTARIA')).toEqual({ code: '4.4.2', nature: 'Expense' });
    expect(resolveFinancialAccountCode('PAYABLE', 'DISCOUNT')).toEqual({ code: '3.5.3', nature: 'Revenue' });
  });

  it('AR: encargos recebidos em 3.5.x (Revenue), desconto concedido em 4.3.3; multa punitiva não existe no AR', () => {
    expect(resolveFinancialAccountCode('RECEIVABLE', 'JUROS_MORA')).toEqual({ code: '3.5.1', nature: 'Revenue' });
    expect(resolveFinancialAccountCode('RECEIVABLE', 'MULTA_MORA')).toEqual({ code: '3.5.2', nature: 'Revenue' });
    expect(resolveFinancialAccountCode('RECEIVABLE', 'DISCOUNT')).toEqual({ code: '4.3.3', nature: 'Expense' });
    expect(resolveFinancialAccountCode('RECEIVABLE', 'MULTA_OFICIO')).toBeNull();
    expect(resolveFinancialAccountCode('RECEIVABLE', 'MULTA_NAO_TRIBUTARIA')).toBeNull();
    expect(BANK_CHARGE_KINDS_BY_SIDE.RECEIVABLE).toEqual(['JUROS_MORA', 'MULTA_MORA']);
  });

  it('toda conta resolvida existe no canônico como folha da mesma natureza', () => {
    const folhas = new Set(CANONICAL_ACCOUNTS.filter((a) => a.acceptsEntries).map((a) => `${a.code}:${a.nature}`));
    for (const side of ['PAYABLE', 'RECEIVABLE'] as const)
      for (const kind of ['JUROS_MORA', 'MULTA_MORA', 'MULTA_OFICIO', 'MULTA_NAO_TRIBUTARIA', 'DISCOUNT'] as const) {
        const r = resolveFinancialAccountCode(side, kind);
        if (r) expect(folhas.has(`${r.code}:${r.nature}`)).toBe(true);
      }
  });

  it('conta re-lida: ausente, arquivada, grupo ou natureza trocada (S6 — tenant com 4.3.1 Revenue) não serve', () => {
    const esperada = { code: '4.3.1', nature: 'Expense' as const };
    const ok = { nature: 'Expense', acceptsEntries: true, deletedAt: null };
    expect(isFinancialAccountUsable(ok, esperada)).toBe(true);
    expect(isFinancialAccountUsable(null, esperada)).toBe(false);
    expect(isFinancialAccountUsable({ ...ok, deletedAt: new Date() }, esperada)).toBe(false);
    expect(isFinancialAccountUsable({ ...ok, acceptsEntries: false }, esperada)).toBe(false);
    expect(isFinancialAccountUsable({ ...ok, nature: 'Revenue' }, esperada)).toBe(false);
  });
});

describe('E3/E26 — DRE: seção financialResult (statement-mapping v5)', () => {
  it('versão do mapeamento é a próxima livre (v5)', () => {
    expect(STATEMENT_MAPPING_VERSION).toBe('statement-mapping.v5');
  });

  it('first-match: 3.5.x e 4.3.x → financialResult; 4.4.x e 4.6 → expenses', () => {
    expect(findMappingRule('Revenue', '3.5.1', 'DRE')?.section).toBe('financialResult');
    expect(findMappingRule('Expense', '4.3.3', 'DRE')?.section).toBe('financialResult');
    expect(findMappingRule('Expense', '4.4.1', 'DRE')?.section).toBe('expenses');
    expect(findMappingRule('Expense', '4.6', 'DRE')?.section).toBe('expenses');
  });

  it('com 3.5, 4.3, 4.4 e 4.6 movimentados: netResult = −Σ saldos de resultado, sem conta sem mapa, BP fecha', async () => {
    const accounts = [
      makeAccount({ id: 'bank', code: '1.1.1', nature: 'Asset' }),
      makeAccount({ id: 'rev', code: '3.1', nature: 'Revenue' }),
      makeAccount({ id: 'jr', code: '3.5.1', nature: 'Revenue' }),
      makeAccount({ id: 'mr', code: '3.5.2', nature: 'Revenue' }),
      makeAccount({ id: 'jp', code: '4.3.1', nature: 'Expense' }),
      makeAccount({ id: 'dc', code: '4.3.3', nature: 'Expense' }),
      makeAccount({ id: 'mo', code: '4.4.1', nature: 'Expense' }),
      makeAccount({ id: 'fee', code: '4.6', nature: 'Expense' }),
    ];
    const raw: MockGroupByResult[] = [
      { accountId: 'rev', debitCents: 0, creditCents: 10000 },
      { accountId: 'jr', debitCents: 0, creditCents: 50 },
      { accountId: 'mr', debitCents: 0, creditCents: 20 },
      { accountId: 'jp', debitCents: 300, creditCents: 0 },
      { accountId: 'dc', debitCents: 40, creditCents: 0 },
      { accountId: 'mo', debitCents: 700, creditCents: 0 },
      { accountId: 'fee', debitCents: 30, creditCents: 0 },
      // o banco fecha as partidas: 10000 + 50 + 20 − 300 − 40 − 700 − 30 = 9000
      { accountId: 'bank', debitCents: 9000, creditCents: 0 },
    ];
    const svc = buildService(accounts, raw);
    const dre = await svc.incomeStatement(SCOPE, AS_OF);

    expect(dre.financialResult.accounts.map((a) => `${a.code}:${a.amountCents}`)).toEqual([
      '3.5.1:50', '3.5.2:20', '4.3.1:-300', '4.3.3:-40',
    ]);
    expect(dre.financialResult.totalCents).toBe('-270');
    expect(dre.expenses.accounts.map((a) => a.code)).toEqual(['4.4.1', '4.6']);
    expect(dre.expenses.totalCents).toBe('-730');
    // −Σ(débito − crédito) das contas de resultado = −(−10000 − 50 − 20 + 300 + 40 + 700 + 30) = 9000
    expect(dre.netResult.amountCents).toBe('9000');
    expect(dre.diagnostics.unmappedAccounts).toEqual([]);
    expect(dre.reportStatus).not.toBe('INVALID');

    const bp = await svc.balanceSheet(SCOPE, AS_OF);
    expect(bp.balanced).toBe(true);
  });

  it('tarifa sozinha (4.6) → expenses; financialResult vazio (L9: fora do resultado financeiro)', async () => {
    const svc = buildService(
      [makeAccount({ id: 'fee', code: '4.6', nature: 'Expense' }), makeAccount({ id: 'bank', code: '1.1.1', nature: 'Asset' })],
      [
        { accountId: 'fee', debitCents: 300, creditCents: 0 },
        { accountId: 'bank', debitCents: 0, creditCents: 300 },
      ],
    );
    const dre = await svc.incomeStatement(SCOPE, AS_OF);
    expect(dre.financialResult.accounts).toEqual([]);
    expect(dre.financialResult.totalCents).toBe('0');
    expect(dre.expenses.accounts.map((a) => a.code)).toEqual(['4.6']);
  });
});
