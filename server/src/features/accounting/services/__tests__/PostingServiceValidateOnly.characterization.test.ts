/**
 * PostingService — modo VALIDATE-ONLY (BE-INCR-BINDING-PRESS, F-P1-6b1, emenda §8 do
 * ADR-P1-binding-press.md). Arquivo NOVO do Corpo B do BRIEF (item 7): a ÚNICA refatoração
 * interna permitida no núcleo imutável (`PostingService`) é o modo `validateEntry` — dry-run que
 * roda todas as validações de `postEntry` sem persistir. A refatoração em si extraiu 3 métodos
 * privados (`assertCentsAndBalance`, `resolveEntryLines`, `assertDimensionGateForLines`) do corpo
 * de `postEntry`, reusados por `validateEntry` — ver `PostingService.ts` para o detalhe.
 *
 * Este arquivo cobre DUAS obrigações do BRIEF, item 7:
 *
 *  (A) PAR DE CARACTERIZAÇÃO ANTES/DEPOIS (emenda §8) — dois testes que fixam, byte a byte, o que
 *      o CAMINHO DE ESCRITA de `postEntry` faz para (a) um lançamento que seria aceito e (b) um
 *      lançamento que a REFATORAÇÃO poderia ter quebrado por tocar justamente nas 3 funções
 *      extraídas (o caminho de rejeição por dimensão faltante, que migrou de um `if` inline para
 *      `assertDimensionGateForLines`). Os 76 testes pré-existentes de
 *      `PostingService.test.ts` (não tocados por este corpo) continuam 100% verdes após a
 *      refatoração — a mesma prova, em escala maior; os dois testes abaixo são a caracterização
 *      MÍNIMA e AUTOCONTIDA que este corpo deve produzir por exigência do BRIEF.
 *  (B) validateEntry NÃO PERSISTE — nem `JournalEntry`, nem `Posting`, nem `AuditEvent`, nem
 *      `entryNumber` consumido, nem transação aberta — contando invocações dos mocks de escrita
 *      antes/depois (`toHaveBeenCalledTimes(0)` em cada um), como o BRIEF pede explicitamente
 *      ("conte linhas antes/depois").
 *
 * Convenção de mock idêntica a `PostingService.test.ts` (mesmo arquivo alvo, mesmos colaboradores).
 */
import { Prisma } from 'generated/prisma';
import { PostingService } from '../PostingService';
import {
  AccountingPeriodNotOpenError,
  ForbiddenError,
  MaxCentsExceededError,
  ValidationError,
} from '../../../../lib/errors';
import { MAX_CENTS } from '../../models/money';
import type { AccountingScope } from '../../scope/AccountingScope';

const txHandle = { __tx: true };
const $transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(txHandle));
jest.mock('../../../../lib/prisma', () => ({
  __esModule: true,
  default: { $transaction: (fn: (tx: unknown) => unknown) => $transaction(fn) },
}));

jest.mock('../../../../lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const scope: AccountingScope = {
  ownerUserId: 'u1',
  actorUserId: 'u1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};
const unitId = scope.unitId;

function buildService(over: {
  accountRepo?: any;
  journalEntryRepo?: any;
  postingRepo?: any;
  policy?: any;
  periodRepo?: any;
  auditService?: any;
  sourceProvenanceRepo?: any;
  dimensionRepo?: any;
} = {}) {
  const accountRepo = {
    findByCode: jest.fn(async (_scope: AccountingScope, code: string) => ({
      id: `acc-${code}`,
      userId: 'u1',
      unitId,
      code,
      name: code,
      nature: 'Asset',
      acceptsEntries: true,
      requiresDimension: false,
    })),
    create: jest.fn(async (data: any) => ({ id: `acc-${data.code}`, ...data })),
    findById: jest.fn(async (_scope: AccountingScope, id: string) => ({ id, userId: 'u1', unitId, code: '9.9', name: 'test', nature: 'Asset', acceptsEntries: true })),
    findManyByUnit: jest.fn(async () => []),
    softDelete: jest.fn(),
    restoreByCode: jest.fn(async () => null),
    ...over.accountRepo,
  };

  const journalEntryRepo = {
    create: jest.fn(async (data: any) => ({ id: 'entry-1', ...data })),
    findById: jest.fn(async () => null),
    findBySource: jest.fn(async () => null),
    setStatus: jest.fn(async () => ({ id: 'entry-1', status: 'Reversed' })),
    setReversedBy: jest.fn(async () => ({ id: 'entry-1' })),
    setSourceId: jest.fn(async () => {}),
    ...over.journalEntryRepo,
  };

  const postingRepo = {
    create: jest.fn(async (data: any) => ({ id: 'p-x', ...data })),
    findByEntryId: jest.fn(async () => []),
    findByAccount: jest.fn(async () => []),
    groupByAccount: jest.fn(async () => []),
    nextEntryNumber: jest.fn(async () => 1),
    runTransaction: jest.fn(async (fn: (tx: unknown) => unknown) => $transaction(fn)),
    ...over.postingRepo,
  };

  const policy = {
    canManage: jest.fn(() => true),
    canPost: jest.fn(() => true),
    canRead: jest.fn(() => true),
    canClosePeriod: jest.fn(() => true),
    ...over.policy,
  };

  const periodRepo = {
    findByYearMonth: jest.fn(async () => ({ status: 'OPEN' })),
    findById: jest.fn(async () => null),
    seedYear: jest.fn(async () => []),
    setStatus: jest.fn(async () => ({})),
    list: jest.fn(async () => []),
    ...over.periodRepo,
  };

  const auditService = { append: jest.fn(async () => {}), ...over.auditService };

  const sourceProvenanceRepo = {
    createSourceDocument: jest.fn(async (data: any) => ({ id: 'srcdoc-1', ...data })),
    linkEntry: jest.fn(async (data: any) => ({ id: 'jes-1', ...data })),
    findSourcesByEntry: jest.fn(async () => []),
    ...over.sourceProvenanceRepo,
  };

  const dimensionRepo = {
    findValueById: jest.fn(async () => null),
    countActiveChildren: jest.fn(async () => 0),
    createPostingDimension: jest.fn(async (data: any) => ({ id: 'pd-1', ...data })),
    findPostingDimensions: jest.fn(async () => []),
    ...over.dimensionRepo,
  };

  const svc = new PostingService(
    accountRepo as any,
    journalEntryRepo as any,
    postingRepo as any,
    policy as any,
    periodRepo as any,
    auditService as any,
    sourceProvenanceRepo as any,
    dimensionRepo as any,
  );
  return { svc, accountRepo, journalEntryRepo, postingRepo, policy, periodRepo, auditService, sourceProvenanceRepo, dimensionRepo };
}

const balancedInput = {
  unitId,
  date: '2026-06-23',
  description: 'Venda à vista',
  sourceType: 'manual',
  lines: [
    { accountCode: '1.1.1', debitCents: 10000, creditCents: 0 },
    { accountCode: '3.1', debitCents: 0, creditCents: 10000 },
  ],
};

describe('PostingService — caracterização do caminho de escrita (par ANTES/DEPOIS, F-P1-6b1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    $transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txHandle));
  });

  // (A.1) Caminho de SUCESSO — exercita assertCentsAndBalance + resolveEntryLines +
  // assertDimensionGateForLines no seu uso ORIGINAL (dentro de postEntry), fixando forma exata
  // da escrita. Se a extração tivesse mudado ordem, argumentos ou valores, esta asserção quebraria.
  it('ANTES/DEPOIS (a): lançamento balanceado grava 1 JournalEntry + 2 Postings + 1 AuditEvent, tudo no MESMO $transaction, com sumDebitCents correto no payload', async () => {
    const { svc, journalEntryRepo, postingRepo, auditService } = buildService();
    const entry = await svc.postEntry(scope, balancedInput);

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(journalEntryRepo.create).toHaveBeenCalledTimes(1);
    expect(journalEntryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', unitId, status: 'Posted', description: 'Venda à vista' }),
      txHandle,
    );
    expect(postingRepo.create).toHaveBeenCalledTimes(2);
    expect(auditService.append).toHaveBeenCalledTimes(1);
    const auditCall = (auditService.append.mock.calls as any[])[0];
    expect(auditCall[2]).toMatchObject({
      eventType: 'entry.posted',
      payload: expect.objectContaining({ sumDebitCents: '10000', lineCount: '2' }),
    });
    expect(entry.id).toBe('entry-1');
  });

  // (A.2) Caminho de REJEIÇÃO pelo gate de dimensão — este é o `if` que migrou de inline (dentro
  // do corpo de `postEntry`) para `assertDimensionGateForLines` (método privado compartilhado com
  // `validateEntry`). Se a extração tivesse alterado a exceção lançada ou deixado de rodar DENTRO
  // da tx (rollback), este teste pegaria a regressão.
  it('ANTES/DEPOIS (b): conta com requiresDimension=true e perna sem tag rejeita DENTRO da tx (rollback), mesma ValidationError de antes da extração', async () => {
    const { svc, journalEntryRepo, postingRepo, auditService } = buildService({
      accountRepo: {
        findByCode: jest.fn(async (_s: AccountingScope, code: string) => ({
          id: `acc-${code}`,
          code,
          acceptsEntries: true,
          requiresDimension: code === '3.1',
        })),
      },
    });
    await expect(svc.postEntry(scope, balancedInput)).rejects.toThrow(/exige dimensão/);
    // rejeitado DENTRO da tx (assertDimensionGateForLines roda depois de $transaction abrir) —
    // então $transaction FOI chamado, mas nada persistiu (rollback do fn que lançou).
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(journalEntryRepo.create).not.toHaveBeenCalled();
    expect(postingRepo.create).not.toHaveBeenCalled();
    expect(auditService.append).not.toHaveBeenCalled();
  });
});

describe('PostingService.validateEntry — modo validate-only (F-P1-6b1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    $transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(txHandle));
  });

  // (B) "não grava NADA" — conta as invocações de TODOS os mocks de escrita antes/depois: todas
  // permanecem em ZERO para um input que um postEntry real aceitaria sem erro.
  it('input válido: resolve sem throw e NÃO grava nada — zero chamadas em toda superfície de escrita', async () => {
    const { svc, journalEntryRepo, postingRepo, auditService, accountRepo, dimensionRepo } = buildService();

    await expect(svc.validateEntry(scope, balancedInput)).resolves.toBeUndefined();

    expect($transaction).not.toHaveBeenCalled();
    expect(postingRepo.runTransaction).not.toHaveBeenCalled();
    expect(postingRepo.nextEntryNumber).not.toHaveBeenCalled();
    expect(journalEntryRepo.create).not.toHaveBeenCalled();
    expect(postingRepo.create).not.toHaveBeenCalled();
    expect(auditService.append).not.toHaveBeenCalled();
    expect(dimensionRepo.createPostingDimension).not.toHaveBeenCalled();
    // divergência deliberada: validateEntry NÃO chama ensureChartOfAccounts (ver comentário no
    // PostingService.ts) — nenhuma conta é criada, mesmo hipoteticamente.
    expect(accountRepo.create).not.toHaveBeenCalled();
  });

  it('idempotência: validateEntry NUNCA lê findBySource — não é uma pergunta de "já existe?"', async () => {
    const { svc, journalEntryRepo } = buildService();
    await svc.validateEntry(scope, { ...balancedInput, sourceId: 'inv-1' });
    expect(journalEntryRepo.findBySource).not.toHaveBeenCalled();
  });

  it('divergência deliberada: NÃO semeia conta canônica ausente — reporta ACCOUNT_NOT_FOUND onde postEntry real semearia', async () => {
    const { svc, accountRepo } = buildService({
      accountRepo: { findByCode: jest.fn(async () => null) }, // nenhuma conta existe ainda
    });
    await expect(svc.validateEntry(scope, balancedInput)).rejects.toBeInstanceOf(ValidationError);
    expect(accountRepo.create).not.toHaveBeenCalled(); // nunca tenta semear
  });

  it('reusa a MESMA policy gate de postEntry: ForbiddenError quando canPost=false, sem nenhuma leitura', async () => {
    const { svc, accountRepo, periodRepo } = buildService({ policy: { canPost: jest.fn(() => false) } });
    await expect(svc.validateEntry(scope, balancedInput)).rejects.toBeInstanceOf(ForbiddenError);
    expect(periodRepo.findByYearMonth).not.toHaveBeenCalled();
    expect(accountRepo.findByCode).not.toHaveBeenCalled();
  });

  it('reusa o MESMO preflight de período: AccountingPeriodNotOpenError quando o período não está OPEN', async () => {
    const { svc } = buildService({ periodRepo: { findByYearMonth: jest.fn(async () => ({ status: 'SOFT_CLOSED' })) } });
    await expect(svc.validateEntry(scope, balancedInput)).rejects.toBeInstanceOf(AccountingPeriodNotOpenError);
  });

  it('reusa o MESMO guard de centavos: ValidationError em centavos não-inteiros', async () => {
    const { svc } = buildService();
    const bad = { ...balancedInput, lines: [{ accountCode: '1.1.1', debitCents: 100.5, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 100.5 }] };
    await expect(svc.validateEntry(scope, bad)).rejects.toBeInstanceOf(ValidationError);
  });

  it('reusa o MESMO teto MAX_CENTS: MaxCentsExceededError acima do teto', async () => {
    const { svc } = buildService();
    const over = MAX_CENTS + 1;
    const bad = { ...balancedInput, lines: [{ accountCode: '1.1.1', debitCents: over, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: over }] };
    await expect(svc.validateEntry(scope, bad)).rejects.toBeInstanceOf(MaxCentsExceededError);
  });

  it('reusa o MESMO invariante de balanceamento: ValidationError quando Σdébito !== Σcrédito', async () => {
    const { svc } = buildService();
    const unbalanced = { ...balancedInput, lines: [{ accountCode: '1.1.1', debitCents: 10000, creditCents: 0 }, { accountCode: '3.1', debitCents: 0, creditCents: 9999 }] };
    await expect(svc.validateEntry(scope, unbalanced)).rejects.toBeInstanceOf(ValidationError);
  });

  it('reusa a MESMA resolução de conta-folha: rejeita conta sintética (acceptsEntries=false)', async () => {
    const { svc } = buildService({
      accountRepo: { findByCode: jest.fn(async (_s: AccountingScope, code: string) => ({ id: `acc-${code}`, code, acceptsEntries: code !== '3.1', requiresDimension: false })) },
    });
    await expect(svc.validateEntry(scope, balancedInput)).rejects.toBeInstanceOf(ValidationError);
  });

  it('reusa o MESMO gate de dimensão obrigatória (SEC-B1-1): rejeita perna sem tag numa conta requiresDimension', async () => {
    const { svc } = buildService({
      accountRepo: { findByCode: jest.fn(async (_s: AccountingScope, code: string) => ({ id: `acc-${code}`, code, acceptsEntries: true, requiresDimension: code === '3.1' })) },
    });
    await expect(svc.validateEntry(scope, balancedInput)).rejects.toThrow(/exige dimensão/);
  });

  it('input válido cujo par teria sido aceito por postEntry: validateEntry resolve E postEntry aceita — mesmo veredito', async () => {
    const built = buildService();
    await expect(built.svc.validateEntry(scope, balancedInput)).resolves.toBeUndefined();
    // reconstrói um serviço IRMÃO (mesmos mocks default) para não poluir contagens acima —
    // confirma que o MESMO input que validateEntry aceitou também é aceito por postEntry.
    const posted = buildService();
    await expect(posted.svc.postEntry(scope, balancedInput)).resolves.toBeDefined();
  });
});
