/**
 * Lacuna L-20261121-153352-038d — teste-guarda (sessao-instrumentacao).
 * Cédula: docs/plano/decisoes/D-2026-11-21-DRE-INSUMO-PELO-PAPEL.md (dono, 21/11/2026, "Sim, pelo papel").
 *
 * A DRE (e, por ela, o J150 — `SpedGenerationService.buildJ150` projeta `incomeStatement().costOfGoodsSold` em DRE_CMV)
 * tem de classificar como custo dos serviços a conta apontada em `insumoExpenseAccountId` do perfil fiscal, PELO PAPEL,
 * não pelo prefixo do código (Lei 6.404/76 art. 187, II e III: custo acima do lucro bruto, despesa operacional abaixo).
 * Hoje `dre.cogs_services` só casa `codePrefix` 4.7 (e `dre.cogs` 4.2): perfil gravado com insumo em 4.1.9 (antes do #1302)
 * sai em despesa operacional, abaixo do lucro bruto.
 *
 * O oráculo é a estrutura do art. 187, não o código da conta: o resultado líquido não pode mudar, só a seção.
 *
 * Rodada 1 do revisor (A1) + decisão do dono 21/11 (lacuna f974, "O da versão vigente na data"): o papel é o do
 * `insumoExpenseAccountId` da versão de política FISCAL_PROFILE APPLIED vigente em `asOf` (AccountingPolicyVersion), não o
 * do perfil atual — período já fechado/entregue em ECD não muda quando o contador troca o insumo depois.
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

const SCOPE = {
  ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit1', ledgerCode: 'DEFAULT' as const,
  baseCurrencyCode: 'BRL' as const, timeZone: 'America/Sao_Paulo' as const,
};
const AS_OF = new Date('2026-10-31T23:59:59.999Z');

// Receita 10000 no caixa; insumo 3000 em 4.1.9 (despesa fora de 4.2/4.7) e 1000 de despesa comum em 4.1.1.
const ACCOUNTS = [
  makeAccount('1.1', 'Asset'), makeAccount('3.1', 'Revenue'), makeAccount('4.1.1', 'Expense'),
  makeAccount('4.1.9', 'Expense'), makeAccount('4.7.1', 'Expense'),
];
const ROWS: Row[] = [
  { accountId: '1.1', debitCents: 10000, creditCents: 4000 },
  { accountId: '3.1', debitCents: 0, creditCents: 10000 },
  { accountId: '4.1.1', debitCents: 1000, creditCents: 0 },
  { accountId: '4.1.9', debitCents: 3000, creditCents: 0 },
];

type Versao = { version: number; decidedAt: Date | null; insumoExpenseAccountId: string | null };

/**
 * `insumoExpenseAccountId` do perfil fiscal ATUAL do escopo (null/ausente = sem perfil ou sem insumo) e, opcional, o
 * histórico de versões FISCAL_PROFILE APPLIED (6º argumento: `IAccountingPolicyVersionRepository.list`, só o `list` é usado).
 */
function buildService(insumoExpenseAccountId: string | null | undefined, rows: Row[] = ROWS, versoes: Versao[] = []) {
  const accountRepo = { findManyByUnit: jest.fn(async () => ACCOUNTS) } as unknown as IAccountRepository;
  const postingRepo = {
    groupByAccount: jest.fn(async (_s: unknown, _st: unknown, options?: { to?: Date }) =>
      options?.to && options.to.getUTCFullYear() < 2026 ? [] : rows),
  } as unknown as IPostingRepository;
  const journalEntryRepo = {} as unknown as IJournalEntryRepository;
  const policy = { canRead: jest.fn(() => true) } as unknown as IAccountingPolicy;
  const fiscalProfileRepo = {
    findByScope: jest.fn(async () => (insumoExpenseAccountId === undefined ? null : { insumoExpenseAccountId })),
  };
  const policyVersionRepo = {
    list: jest.fn(async (_s: unknown, filter: { target?: string; status?: string }) =>
      filter.target === 'FISCAL_PROFILE' && filter.status === 'APPLIED'
        ? versoes.map((v) => ({ id: `v${v.version}`, target: 'FISCAL_PROFILE', status: 'APPLIED', version: v.version, decidedAt: v.decidedAt, payload: { insumoExpenseAccountId: v.insumoExpenseAccountId } }))
        : []),
  };
  // 5º argumento = perfil fiscal atual; 6º = versões de política (o swc/jest não faz type-check).
  const Ctor = AccountingReportService as unknown as new (...a: unknown[]) => AccountingReportService;
  return Object.assign(new Ctor(accountRepo, postingRepo, journalEntryRepo, policy, fiscalProfileRepo, policyVersionRepo), { policyVersionRepo });
}

const codes = (s: { accounts: { code: string }[] }) => s.accounts.map((a) => a.code);

describe('L-038d — DRE classifica o insumo pelo papel (insumoExpenseAccountId), não pelo prefixo', () => {
  it('insumo em 4.1.9 com lançamento: aparece em custo (acima do lucro bruto), não em despesa operacional', async () => {
    const dre = await buildService('4.1.9').incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.1.9']);
    expect(dre.costOfGoodsSold.totalCents).toBe('-3000');
    expect(codes(dre.expenses)).toEqual(['4.1.1']);
    expect(dre.expenses.totalCents).toBe('-1000');
  });

  it('o resultado líquido não muda: o papel só move a conta de seção (10000 − 3000 − 1000 = 6000)', async () => {
    const svc = buildService('4.1.9');
    const dre = await svc.incomeStatement(SCOPE, AS_OF);
    expect(dre.netResult.amountCents).toBe('6000');
    const bp = await svc.balanceSheet(SCOPE, AS_OF);
    expect([bp.netResultLine.amountCents, bp.balanced]).toEqual(['6000', true]);
  });

  it('o papel é só da conta apontada: outra despesa 4.1.x continua em despesa operacional', async () => {
    const dre = await buildService('4.1.9').incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).not.toContain('4.1.1');
    expect(codes(dre.expenses)).toContain('4.1.1');
  });

  it('sem insumo no perfil (ou sem perfil): nada muda — 4.1.9 segue em despesa operacional', async () => {
    for (const insumo of [null, undefined]) {
      const dre = await buildService(insumo).incomeStatement(SCOPE, AS_OF);
      expect(codes(dre.costOfGoodsSold)).toEqual([]);
      expect(codes(dre.expenses).sort()).toEqual(['4.1.1', '4.1.9']);
    }
  });

  it('insumo já sob 4.7: igual a hoje, uma vez só em custo (sem contar em dobro)', async () => {
    const rows = [...ROWS, { accountId: '4.7.1', debitCents: 500, creditCents: 0 }];
    const dre = await buildService('4.7.1', rows).incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.7.1']);
    expect(dre.costOfGoodsSold.totalCents).toBe('-500');
    expect(dre.netResult.amountCents).toBe('5500');
  });
});

describe('L-038d (f974) — o papel é o da versão FISCAL_PROFILE vigente em asOf, não o do perfil atual', () => {
  // v1 (10/01/2026): insumo = 4.1.9 · v2 (15/11/2026): insumo = 4.7.1. O perfil ATUAL aponta 4.7.1.
  const V1 = { version: 1, decidedAt: new Date('2026-01-10T12:00:00.000Z'), insumoExpenseAccountId: '4.1.9' };
  const V2 = { version: 2, decidedAt: new Date('2026-11-15T12:00:00.000Z'), insumoExpenseAccountId: '4.7.1' };
  const rows = [...ROWS, { accountId: '4.7.1', debitCents: 500, creditCents: 0 }];

  it('período anterior à troca (31/10/2026): continua pelo insumo antigo (4.1.9 em custo, 4.7.1 em despesa)', async () => {
    const dre = await buildService('4.7.1', rows, [V1, V2]).incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.1.9']);
    expect(codes(dre.expenses).sort()).toEqual(['4.1.1']);
    expect(codes(dre.costOfGoodsSold)).not.toContain('4.7.1');
  });

  it('período posterior à troca (30/11/2026): vale o insumo novo (4.7.1 em custo; 4.1.9 vira despesa)', async () => {
    const dre = await buildService('4.7.1', rows, [V1, V2]).incomeStatement(SCOPE, new Date('2026-11-30T23:59:59.999Z'));
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.7.1']);
    expect(codes(dre.expenses).sort()).toEqual(['4.1.1', '4.1.9']);
  });

  it('asOf antes da primeira versão: vale a primeira (a política mais antiga que existe), não o perfil atual', async () => {
    const dre = await buildService('4.7.1', rows, [V1, V2]).incomeStatement(SCOPE, new Date('2025-12-31T23:59:59.999Z'));
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.1.9']);
  });

  it('versão decidida no próprio dia de asOf conta (cutoff = fim do dia de asOf)', async () => {
    const dre = await buildService('4.7.1', rows, [V1, V2]).incomeStatement(SCOPE, new Date('2026-11-15T00:00:00.000Z'));
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.7.1']);
  });

  it('só versões APPLIED do alvo FISCAL_PROFILE são lidas', async () => {
    const svc = buildService('4.7.1', rows, [V1, V2]);
    await svc.incomeStatement(SCOPE, AS_OF);
    expect(svc.policyVersionRepo.list).toHaveBeenCalledWith(SCOPE, { target: 'FISCAL_PROFILE', status: 'APPLIED' });
  });

  it('sem nenhuma versão (perfil legado anterior ao versionamento): vale o perfil atual', async () => {
    const dre = await buildService('4.1.9', ROWS, []).incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).toEqual(['4.1.9']);
  });

  it('versão sem insumo (null) vigente em asOf: nada vai a custo pelo papel', async () => {
    const dre = await buildService('4.1.9', ROWS, [{ ...V1, insumoExpenseAccountId: null }]).incomeStatement(SCOPE, AS_OF);
    expect(codes(dre.costOfGoodsSold)).toEqual([]);
  });
});
