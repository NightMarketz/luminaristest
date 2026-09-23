import { DataExchangeExportService, type IReportReader, type IReconciliationReader } from '../DataExchangeExportService';
import type { IDataExchangeRepository } from '../../repositories/IDataExchangeRepository';
import type { IJournalEntryRepository } from '../../repositories/IJournalEntryRepository';
import type { CreateJobInput, UpdateJobInput } from '../../models/DataExchange.model';
import type { AuditService } from '../AuditService';
import { AccountingPolicy } from '../../policies/AccountingPolicy';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { parseTable } from '../../../../lib/spreadsheet';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { logger } from '../../../../lib/logger';
import type { AccountingDataExchangeJob } from 'generated/prisma';

jest.mock('../../../../lib/attachmentStorage', () => ({
  saveFile: jest.fn(async () => ({ storageKey: 'u/unit/job/rand_export.csv', sanitizedName: 'export.csv' })),
  resolveReadPath: jest.fn((key: string) => `/abs/${key}`),
  deleteFile: jest.fn(async () => undefined),
}));
import * as storage from '../../../../lib/attachmentStorage';
const sendAlertWebhook = jest.fn();
jest.mock('../../../../lib/alertWebhook', () => ({
  __esModule: true,
  sendAlertWebhook: (...a: unknown[]) => sendAlertWebhook(...a),
}));

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');

function makeJob(over: Partial<AccountingDataExchangeJob> = {}): AccountingDataExchangeJob {
  return {
    id: 'job-1', userId: 'owner-1', unitId: 'unit-1', direction: 'EXPORT',
    kind: 'EXPORT_TRIAL_BALANCE', status: 'EXPORTED', originalName: null, mimeType: null,
    sizeBytes: null, sha256: null, storageKey: null, totalRows: 0, validRows: 0,
    invalidRows: 0, committedRows: 0, requestedById: 'owner-1', committedById: null,
    createdAt: new Date('2026-07-01T00:00:00Z'), updatedAt: new Date('2026-07-01T00:00:00Z'),
    committedAt: null, periodStart: null, periodEnd: null,
    // BE-INCR-FIXED-ASSETS PR-4: colunas aditivas — default = comportamento pré-existente.
    supersedesJobId: null, ecfRectificationRequired: false,
    ecfRectificationWaivedAt: null, ecfRectificationWaiverReason: null,
    verificationTermStorageKey: null,
    ...over,
  };
}

function makeRepo() {
  const store = new Map<string, AccountingDataExchangeJob>();
  const createJob = jest.fn(async (data: CreateJobInput) => {
    const job = makeJob({ ...data, id: 'job-1' } as Partial<AccountingDataExchangeJob>);
    store.set(job.id, job);
    return job;
  });
  const findJobById = jest.fn(async (_s: unknown, id: string) => store.get(id) ?? null);
  const updateJob = jest.fn(async (_s: unknown, id: string, data: UpdateJobInput) => {
    const job = { ...(store.get(id) as AccountingDataExchangeJob), ...data };
    store.set(id, job);
    return job;
  });
  const runTransaction = jest.fn((fn: (tx: never) => Promise<unknown>) => fn({} as never));
  const findJobBySupersedesJobId = jest.fn(async (_s: unknown, supersedesJobId: string) =>
    [...store.values()].find((j) => j.supersedesJobId === supersedesJobId) ?? null);
  const listJobs = jest.fn(async (_s: unknown, filter: { page: number; limit: number }) => {
    const items = [...store.values()];
    return { items, total: items.length, page: filter.page, limit: filter.limit };
  });
  const repo = {
    createJob, findJobById, updateJob, runTransaction, findJobBySupersedesJobId, listJobs,
  } as unknown as IDataExchangeRepository;
  return { repo, createJob, findJobById, updateJob, findJobBySupersedesJobId, listJobs, store };
}

function makeReports(): IReportReader {
  return {
    trialBalance: jest.fn(async () => ({
      unitId: 'unit-1',
      rows: [{ accountId: 'a1', code: '1.1.01', name: 'Banco', nature: 'Asset', debitCents: 100000, creditCents: 0, balanceCents: 100000 }],
      totals: { debitCents: 100000, creditCents: 0, balanceCents: 100000 },
      balanced: true,
    })),
    accountLedger: jest.fn(async () => ({
      unitId: 'unit-1',
      account: { accountId: 'a1', code: '1.1.01', name: 'Banco', nature: 'Asset' },
      rows: [],
      closingBalanceCents: 0,
    })),
    generalLedger: jest.fn(async () => []),
    balanceSheet: jest.fn(async () => ({
      unitId: 'unit-1', periodSemantics: 'as_of', asOf: '2026-12-31', mappingVersion: 'v1',
      assets: { accounts: [], totalCents: '0' }, liabilities: { accounts: [], totalCents: '0' },
      equity: { accounts: [], totalCents: '0' },
      netResultLine: { amountCents: '0', isComputed: true, computation: 'income_statement_net_result', fromDate: '2026-01-01', toDate: '2026-12-31' },
      balanced: true, reportStatus: 'OK',
      diagnostics: { mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [], hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [] },
    })),
    incomeStatement: jest.fn(async () => ({
      unitId: 'unit-1', periodSemantics: 'year_to_date', fromDate: '2026-01-01', toDate: '2026-12-31', mappingVersion: 'v1',
      grossRevenue: { accounts: [], totalCents: '0' }, revenueDeductions: { accounts: [], totalCents: '0' },
      costOfGoodsSold: { accounts: [], totalCents: '0' }, expenses: { accounts: [], totalCents: '0' },
      netResult: { amountCents: '0', isComputed: true, computation: 'income_statement_net_result' },
      reportStatus: 'OK',
      diagnostics: { mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [], hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [] },
    })),
  } as unknown as IReportReader;
}

/** C6b PR-2 Passo 8 — default no-op reader so kinds that don't need it (BP/DRE/balancete/razão/
 *  template) don't have to pass fixtures just to satisfy the constructor shape. */
function makeReconciliationReader(): IReconciliationReader {
  return {
    findScopeBankAccountIds: jest.fn(async () => []),
    findUnmatchedLinesByAccount: jest.fn(async () => []),
    findUnmatchedBankPostings: jest.fn(async () => []),
    findMatchedLinesByWindow: jest.fn(async () => []),
  } as unknown as IReconciliationReader;
}

/** C6b PR-2 Passo 9 — default no-op so kinds that don't need it don't have to pass a fixture. */
function makeJournalEntryRepo(): IJournalEntryRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(async () => null),
    findBySource: jest.fn(async () => null),
    findManyByUnit: jest.fn(async () => ({ entries: [], total: 0 })),
    findManyForExport: jest.fn(async () => []),
    setStatus: jest.fn(),
    setReversedBy: jest.fn(),
    setSourceId: jest.fn(),
  } as unknown as IJournalEntryRepository;
}

/** Review #338 F1 — IAccountReader: resolves a bank account's code via the ACTIVE chart of
 *  accounts (`findManyByUnit`), never via trialBalance (which only covers accounts WITH
 *  movement). Default empty so kinds that don't need it (everything but
 *  EXPORT_BANK_RECONCILIATION) don't have to pass a fixture. */
function makeAccountRepo() {
  return { findManyByUnit: jest.fn(async () => [] as Array<{ id: string; code: string }>) };
}

type AppendArgs = [unknown, unknown, { eventType: string; payload: Record<string, unknown> }];

describe('DataExchangeExportService (BE-INCR-6)', () => {
  const auditAppend = jest.fn<Promise<void>, AppendArgs>(async () => undefined);
  const audit = { append: auditAppend } as unknown as AuditService;

  beforeEach(() => jest.clearAllMocks());

  it('exports a trial balance to CSV, persists it, and audits export_generated', async () => {
    const { repo } = makeRepo();
    const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

    const res = await svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' });

    expect(res.kind).toBe('EXPORT_TRIAL_BALANCE');
    expect(res.mimeType).toBe('text/csv');
    expect(res.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(storage.saveFile).toHaveBeenCalledTimes(1);

    const buf = (storage.saveFile as jest.Mock).mock.calls[0][4] as Buffer;
    const table = await parseTable(buf, 'csv');
    expect(table.headers).toEqual(['code', 'name', 'nature', 'debitCents', 'creditCents', 'balanceCents']);
    expect(table.rows[0]).toEqual(['1.1.01', 'Banco', 'Asset', '100000', '0', '100000']);

    expect(auditAppend).toHaveBeenCalledTimes(1);
    const input = auditAppend.mock.calls[0][2];
    expect(input.eventType).toBe('data_exchange.export_generated');
    expect(input.payload).toMatchObject({ direction: 'EXPORT', kind: 'EXPORT_TRIAL_BALANCE', totalRows: '1' });
  });

  it('exports a blank template (headers only, no report call)', async () => {
    const { repo } = makeRepo();
    const reports = makeReports();
    const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

    await svc.export(scope, { kind: 'EXPORT_TEMPLATE', format: 'xlsx', unitId: 'unit-1', templateKind: 'IMPORT_JOURNAL_ENTRIES' });

    expect(reports.trialBalance).not.toHaveBeenCalled();
    const buf = (storage.saveFile as jest.Mock).mock.calls[0][4] as Buffer;
    const table = await parseTable(buf, 'xlsx');
    expect(table.headers).toContain('entryKey');
    expect(table.headers).toContain('externalReference');
    expect(table.rows).toHaveLength(0);
  });

  it('resolves an artifact path for download and NotFound on a missing job', async () => {
    const { repo } = makeRepo();
    const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

    await svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' });
    const dl = await svc.getArtifactForDownload(scope, 'job-1');
    expect(dl.absPath).toContain('u/unit/job');
    expect(dl.mimeType).toBe('text/csv');

    await expect(svc.getArtifactForDownload(scope, 'nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects export when the policy denies (no actor)', async () => {
    const { repo, createJob } = makeRepo();
    const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
    const noActor = { ...scope, actorUserId: '' };

    await expect(
      svc.export(noActor, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createJob).not.toHaveBeenCalled();
  });

  // GUARD (A1, triagem 2026-08-20 ratificada) — terceiro sítio da classe; este NÃO estava no
  // relatório da auditoria (ela nomeou só ECD e ECF). Ver a nota em SpedGenerationService.test.ts.
  it('does not leave the job claiming EXPORTED when saveFile fails, and records FAILED (A1)', async () => {
    const { repo, createJob, updateJob } = makeRepo();
    const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(
      svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' }),
    ).rejects.toThrow('disk full');

    expect(createJob).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'EXPORTED' }));
    const statuses = updateJob.mock.calls.map((c) => (c[2] as { status?: string } | undefined)?.status);
    expect(statuses).toContain('FAILED');
  });

  it('fires the alert webhook (source=data_exchange_export) alongside the FAILED status, before the throw (F-W2C-1)', async () => {
    const { repo } = makeRepo();
    const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
    (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(
      svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' }),
    ).rejects.toThrow('disk full');

    expect(sendAlertWebhook).toHaveBeenCalledTimes(1);
    expect(sendAlertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'data_exchange_export',
        event: 'generation_failed',
        jobId: 'job-1',
        kind: 'EXPORT_TRIAL_BALANCE',
        unitId: 'unit-1',
        errorName: 'Error',
        errorMessage: 'disk full',
      }),
    );
  });

  describe('duration metric (BRIEF-W2-D, layer 1 — extends Metrics.startTimer, no warnThresholdMs for this layer)', () => {
    it('logs Metric: data_exchange_export at info with a numeric duration on success', async () => {
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
      const { repo } = makeRepo();
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' });

      const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: data_exchange_export');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(typeof ctx.duration).toBe('number');
      expect(ctx.status).toBe('success');
      infoSpy.mockRestore();
    });

    it('logs Metric: data_exchange_export at warn on the FAILED (saveFile) path', async () => {
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const { repo } = makeRepo();
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
      (storage.saveFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      await expect(
        svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' }),
      ).rejects.toThrow('disk full');

      const call = warnSpy.mock.calls.find((c) => c[0] === 'Metric: data_exchange_export');
      expect(call).toBeDefined();
      const ctx = call![1] as Record<string, unknown>;
      expect(ctx.status).toBe('failure');
      expect(typeof ctx.duration).toBe('number');
      warnSpy.mockRestore();
    });
  });

  // C6b PR-1 (Passo 6/7, F-C6b-3/6/7 a): os exports de relatório passam a GRAVAR o período que
  // cobrem no job — antes desta mudança, `periodStart/periodEnd` ficavam sempre null para os 4
  // kinds de relatório (só a geração SPED os preenchia). "Regra de período por kind" do plano.
  describe('C6b PR-1 — período gravado no job (F-C6b-3/6/7 a)', () => {
    it('DRE com asOf=2026-12-31 → job com periodStart=2026-01-01 / periodEnd=2026-12-31', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, { kind: 'EXPORT_INCOME_STATEMENT', format: 'csv', unitId: 'unit-1', asOf: '2026-12-31' });

      expect(reports.incomeStatement).toHaveBeenCalledWith(scope, new Date('2026-12-31'));
      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    });

    it('balancete SEM asOf → período null/null no job (comportamento acumulado preservado)', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1' });

      expect(reports.trialBalance).toHaveBeenCalledWith(scope, undefined);
      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toBeNull();
      expect(call.periodEnd).toBeNull();
    });

    it('balancete COM asOf → devolve as linhas de balancesAsOf(asOf) (F-C6b-6 a — falhava antes: asOf era aceito e ignorado) e grava período [Jan-1, asOf]', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, { kind: 'EXPORT_TRIAL_BALANCE', format: 'csv', unitId: 'unit-1', asOf: '2026-06-30' });

      // A prova de que o service passa o `asOf` adiante (não o descarta) é esta chamada: antes
      // da mudança, `trialBalance` era chamado sem argumento nenhum além do scope.
      expect(reports.trialBalance).toHaveBeenCalledWith(scope, new Date('2026-06-30'));
      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    });

    it('razão com accountCode + janela → chama accountLedger com a window e grava o período', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, {
        kind: 'EXPORT_GENERAL_LEDGER', format: 'csv', unitId: 'unit-1',
        accountCode: '1.1.01', periodStart: '2026-01-01', periodEnd: '2026-01-31',
      });

      expect(reports.accountLedger).toHaveBeenCalledWith(scope, '1.1.01', {
        from: new Date('2026-01-01T00:00:00.000Z'), to: new Date('2026-01-31T23:59:59.999Z'),
      });
      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    });

    it('razão SEM accountCode (razão geral) → chama generalLedger com a window e grava o período', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await svc.export(scope, {
        kind: 'EXPORT_GENERAL_LEDGER', format: 'csv', unitId: 'unit-1',
        periodStart: '2026-01-01', periodEnd: '2026-01-31',
      });

      expect(reports.accountLedger).not.toHaveBeenCalled();
      expect(reports.generalLedger).toHaveBeenCalledWith(scope, {
        from: new Date('2026-01-01T00:00:00.000Z'), to: new Date('2026-01-31T23:59:59.999Z'),
      });
      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    });

    // Adversarial (OPS-001): a razão geral sem accountCode E sem janela passa no DTO (Passo 5 T:
    // "razão sem accountCode → válido" é regra de FORMA), mas `generalLedger` exige `window` não-
    // opcional (`findManyForExport` não tem modo "sem bound") — a CONSTRUÇÃO do artefato tem de
    // recusar em vez de tentar um scan sem fim. Nenhum job deve ser criado (a checagem é ANTES
    // do createJob).
    it('razão geral sem periodStart/periodEnd → ValidationError, e NENHUM job é criado', async () => {
      const { repo, createJob } = makeRepo();
      const reports = makeReports();
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      await expect(
        svc.export(scope, { kind: 'EXPORT_GENERAL_LEDGER', format: 'csv', unitId: 'unit-1' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(reports.generalLedger).not.toHaveBeenCalled();
      expect(createJob).not.toHaveBeenCalled();
    });
  });

  // C6b PR-2 Passo 8 (F-C6b-5 a): EXPORT_BANK_RECONCILIATION — 3 seções (MATCHED/UNMATCHED_LINE/
  // UNMATCHED_POSTING), fixture do plano: 1 conta bancária, 1 linha casada + 1 sem match + 1
  // posting sem linha → 3 linhas.
  describe('C6b PR-2 Passo 8 — EXPORT_BANK_RECONCILIATION', () => {
    it('monta as 3 seções e grava a janela do DTO no job', async () => {
      const { repo, createJob } = makeRepo();
      const reconciliation = makeReconciliationReader();
      (reconciliation.findScopeBankAccountIds as jest.Mock).mockResolvedValue(['a1']);
      (reconciliation.findMatchedLinesByWindow as jest.Mock).mockResolvedValue([
        {
          bankAccountCode: '1.1.01', statementId: 'st-1', lineDate: new Date('2026-06-15T00:00:00.000Z'),
          amountCents: 15000, memo: 'linha casada', entryId: 'je-1', entryNumber: 10, matchType: 'AUTO',
        },
      ]);
      (reconciliation.findUnmatchedLinesByAccount as jest.Mock).mockResolvedValue([
        {
          id: 'l2', statementId: 'st-1', date: new Date('2026-06-17T00:00:00.000Z'),
          amountCents: 9900n, description: 'linha pendente',
        },
      ]);
      (reconciliation.findUnmatchedBankPostings as jest.Mock).mockResolvedValue([
        {
          id: 'p2', debitCents: 5000n, creditCents: 0n,
          entry: { id: 'je-2', date: new Date('2026-06-18T00:00:00.000Z'), description: 'posting pendente', status: 'Posted', entryNumber: 11 },
        },
      ]);

      const reports = makeReports(); // trialBalance mock só tem 'a1' — NÃO é a fonte do código aqui (review #338 F1).
      const accountRepo = makeAccountRepo();
      // Conta bancária SEM nenhum posting histórico (não aparece em trialBalance) — só no plano
      // de contas ATIVO. Prova que o código vem de accountRepo.findManyByUnit, não de trialBalance.
      accountRepo.findManyByUnit.mockResolvedValue([{ id: 'a1', code: '1.1.01' }]);
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, reconciliation, makeJournalEntryRepo(), accountRepo);

      await svc.export(scope, {
        kind: 'EXPORT_BANK_RECONCILIATION', format: 'csv', unitId: 'unit-1',
        periodStart: '2026-06-01', periodEnd: '2026-06-30',
      });

      expect(reconciliation.findMatchedLinesByWindow).toHaveBeenCalledWith(scope, ['a1'], {
        from: new Date('2026-06-01T00:00:00.000Z'), to: new Date('2026-06-30T23:59:59.999Z'),
      });
      expect(reconciliation.findUnmatchedLinesByAccount).toHaveBeenCalledWith(scope, 'a1', {
        from: new Date('2026-06-01T00:00:00.000Z'), to: new Date('2026-06-30T23:59:59.999Z'),
      });

      const buf = (storage.saveFile as jest.Mock).mock.calls[0][4] as Buffer;
      const table = await parseTable(buf, 'csv');
      expect(table.headers).toEqual([
        'section', 'bankAccountCode', 'statementId', 'lineDate', 'amountCents', 'memo', 'entryId', 'entryNumber', 'matchType',
      ]);
      expect(table.rows).toHaveLength(3);
      expect(table.rows.map((r) => r[0]).sort()).toEqual(['MATCHED', 'UNMATCHED_LINE', 'UNMATCHED_POSTING']);

      const matchedRow = table.rows.find((r) => r[0] === 'MATCHED')!;
      expect(matchedRow).toEqual(['MATCHED', '1.1.01', 'st-1', '2026-06-15', '15000', 'linha casada', 'je-1', '10', 'AUTO']);

      // UNMATCHED_LINE também usa o código resolvido por accountRepo (review #338 F1 — a conta
      // aqui NÃO está no mock de trialBalance, e ainda assim o código sai correto, nunca '?').
      const unmatchedLineRow = table.rows.find((r) => r[0] === 'UNMATCHED_LINE')!;
      expect(unmatchedLineRow).toEqual(['UNMATCHED_LINE', '1.1.01', 'st-1', '2026-06-17', '9900', 'linha pendente', '', '', '']);

      const unmatchedPostingRow = table.rows.find((r) => r[0] === 'UNMATCHED_POSTING')!;
      // signed = debitCents - creditCents = 5000 - 0 (inflow -> debit on an asset bank account).
      expect(unmatchedPostingRow).toEqual(['UNMATCHED_POSTING', '1.1.01', '', '2026-06-18', '5000', 'posting pendente', 'je-2', '11', '']);

      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-06-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-06-30T00:00:00.000Z'));
    });

    // Review #338 F1 (ALTO): sem posting nenhum a conta some de trialBalance — o '?' que
    // caía aqui era ALCANÇÁVEL, não defensivo. Prova o mesmo caminho pelo ângulo "conta banco
    // com extrato mas zero lançamentos" citado no achado do reviewer.
    it('conta bancária com extrato e ZERO postings → código correto no CSV, nunca "?"', async () => {
      const { repo } = makeRepo();
      const reconciliation = makeReconciliationReader();
      (reconciliation.findScopeBankAccountIds as jest.Mock).mockResolvedValue(['acc-nova']);
      (reconciliation.findUnmatchedLinesByAccount as jest.Mock).mockResolvedValue([
        { id: 'l1', statementId: 'st-nova', date: new Date('2026-06-10T00:00:00.000Z'), amountCents: 3000n, description: 'linha da conta nova' },
      ]);

      // trialBalance NÃO tem a conta (zero movimento histórico) — só accountRepo a conhece.
      const reports = makeReports();
      const accountRepo = makeAccountRepo();
      accountRepo.findManyByUnit.mockResolvedValue([{ id: 'acc-nova', code: '1.1.09' }]);
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, reconciliation, makeJournalEntryRepo(), accountRepo);

      await svc.export(scope, {
        kind: 'EXPORT_BANK_RECONCILIATION', format: 'csv', unitId: 'unit-1',
        periodStart: '2026-06-01', periodEnd: '2026-06-30',
      });

      const buf = (storage.saveFile as jest.Mock).mock.calls[0][4] as Buffer;
      const table = await parseTable(buf, 'csv');
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toEqual(['UNMATCHED_LINE', '1.1.09', 'st-nova', '2026-06-10', '3000', 'linha da conta nova', '', '', '']);
    });

    // Review #338 F1: conta bancária que sumiu do plano ATIVO (soft-deleted) enquanto o extrato
    // ainda a referencia — erro de DADO nomeado, nunca uma sentinela '?' num CSV ao contador.
    it('conta bancária não encontrada no plano de contas ativo → ValidationError nomeada', async () => {
      const { repo } = makeRepo();
      const reconciliation = makeReconciliationReader();
      (reconciliation.findScopeBankAccountIds as jest.Mock).mockResolvedValue(['acc-sumida']);

      const accountRepo = makeAccountRepo(); // findManyByUnit → [] (a conta não está mais ativa)
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, reconciliation, makeJournalEntryRepo(), accountRepo);

      await expect(
        svc.export(scope, {
          kind: 'EXPORT_BANK_RECONCILIATION', format: 'csv', unitId: 'unit-1',
          periodStart: '2026-06-01', periodEnd: '2026-06-30',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // C6b PR-2 Passo 9 (F-C6b-8 a): EXPORT_ENTRY_SAMPLE — semente determinística, 1ª linha de
  // metadado, default de perAccount aplicado no service (não no DTO — ver comentário no schema).
  describe('C6b PR-2 Passo 9 — EXPORT_ENTRY_SAMPLE', () => {
    function makeEntries() {
      return [
        {
          id: 'e1', entryNumber: 1, date: new Date('2026-01-05T00:00:00.000Z'), description: 'venda 1',
          sourceType: 'sale.recorded', sourceId: 'sale-1',
          postings: [
            { account: { code: '1.1.01' }, debitCents: 1000n, creditCents: 0n },
            { account: { code: '3.1' }, debitCents: 0n, creditCents: 1000n },
          ],
        },
      ];
    }

    it('grava a janela do DTO no job, usa perAccount default 5 e escreve a linha de metadado + cabeçalho real na 2ª linha', async () => {
      const { repo, createJob } = makeRepo();
      const journalEntryRepo = makeJournalEntryRepo();
      (journalEntryRepo.findManyForExport as jest.Mock).mockResolvedValue(makeEntries());
      const reports = makeReports(); // trialBalance mock só tem a conta '1.1.01' (Asset) — ver abaixo.
      const svc = new DataExchangeExportService(reports, new AccountingPolicy(), repo, audit, makeReconciliationReader(), journalEntryRepo, makeAccountRepo());

      await svc.export(scope, {
        kind: 'EXPORT_ENTRY_SAMPLE', format: 'csv', unitId: 'unit-1',
        periodStart: '2026-01-01', periodEnd: '2026-01-31', seed: 'seed-x',
      });

      expect(journalEntryRepo.findManyForExport).toHaveBeenCalledWith(scope, ['Posted', 'Reconciled', 'Reversed'], {
        from: new Date('2026-01-01T00:00:00.000Z'), to: new Date('2026-01-31T23:59:59.999Z'),
      });

      // parseTable() assume 1 única linha de cabeçalho e trunca as demais linhas à LARGURA dela
      // (matrix[0].length) — inadequado aqui, onde a 1ª linha física é o metadado (1 célula) e o
      // cabeçalho REAL é a 2ª. Lê o buffer bruto para provar o layout físico do arquivo.
      const buf = (storage.saveFile as jest.Mock).mock.calls[0][4] as Buffer;
      const text = buf.toString('utf8').replace(/^﻿/, '');
      const lines = text.split('\r\n');
      expect(lines[0]).toBe('# seed=seed-x; algorithm=sha256-rank-v1; perAccount=5');
      expect(lines[1]).toBe('accountCode,accountNature,entryId,entryNumber,date,description,sourceType,sourceId,debitCents,creditCents');
      expect(lines[2]).toBe('1.1.01,Asset,e1,1,2026-01-05,venda 1,sale.recorded,sale-1,1000,0');
      // conta 3.1 (Revenue) não está no mock de trialBalance (o fixture só declara '1.1.01') —
      // fallback '?' só dispara aqui por LACUNA DO MOCK, não por um caminho de produção real:
      // toda conta que aparece na amostra tem ≥1 posting NA JANELA (é assim que ela chega a
      // `legs`), e `trialBalance(scope)` sem `asOf` agrega postings de TODO o histórico — logo
      // a mesma conta SEMPRE aparece lá também (revisão #338 confirmou: inalcançável em
      // produção, ao contrário do '?' de `bankAccountCode` do Passo 8, que ERA alcançável e foi
      // corrigido — ver describe de EXPORT_BANK_RECONCILIATION acima).
      expect(lines[3]).toBe('3.1,?,e1,1,2026-01-05,venda 1,sale.recorded,sale-1,0,1000');

      const call = createJob.mock.calls[0][0] as { periodStart: Date | null; periodEnd: Date | null };
      expect(call.periodStart).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(call.periodEnd).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    });

    it('mesma seed → mesma amostra; seed diferente → amostra pode divergir (determinismo ponta-a-ponta via export)', async () => {
      const entries = () => [
        {
          id: 'e1', entryNumber: 1, date: new Date('2026-01-05T00:00:00.000Z'), description: 'venda 1',
          sourceType: 'sale.recorded', sourceId: 'sale-1',
          postings: [{ account: { code: '1.1.01' }, debitCents: 1000n, creditCents: 0n }],
        },
        {
          id: 'e2', entryNumber: 2, date: new Date('2026-01-06T00:00:00.000Z'), description: 'venda 2',
          sourceType: 'sale.recorded', sourceId: 'sale-2',
          postings: [{ account: { code: '1.1.01' }, debitCents: 2000n, creditCents: 0n }],
        },
      ];

      async function run(seed: string) {
        const { repo } = makeRepo();
        const journalEntryRepo = makeJournalEntryRepo();
        (journalEntryRepo.findManyForExport as jest.Mock).mockResolvedValue(entries());
        const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), journalEntryRepo, makeAccountRepo());
        await svc.export(scope, {
          kind: 'EXPORT_ENTRY_SAMPLE', format: 'csv', unitId: 'unit-1',
          periodStart: '2026-01-01', periodEnd: '2026-01-31', seed, perAccount: 1,
        });
        const buf = (storage.saveFile as jest.Mock).mock.calls[(storage.saveFile as jest.Mock).mock.calls.length - 1][4] as Buffer;
        return buf.toString('utf8').replace(/^﻿/, '').split('\r\n')[2]; // única linha de dado (perAccount=1)
      }

      const first = await run('seed-a');
      const second = await run('seed-a');
      expect(first).toBe(second); // mesma seed, 2 chamadas → mesma amostra

      // 'seed-c' foi ESCOLHIDA (não chutada) por dar rank oposto a 'seed-a' para este par fixo
      // e1/e2 — sha256('seed-a|1.1.01|e1') > sha256('seed-a|1.1.01|e2') (e2 vence), enquanto
      // sha256('seed-c|1.1.01|e1') < sha256('seed-c|1.1.01|e2') (e1 vence). Medido com
      // node:crypto antes de escrever o teste, não assumido — outra seed poderia empatar.
      const third = await run('seed-c');
      expect(third).not.toBe(first);
    });
  });

  // BE-INCR-FIXED-ASSETS PR-4 (item 22/23) — waiveEcfRectification + listJobs.
  describe('waiveEcfRectification (item 22)', () => {
    it('dispensa idempotente: 2ª chamada não reemite o audit event', async () => {
      const { repo, store } = makeRepo();
      store.set('job-ecd', makeJob({ id: 'job-ecd', kind: 'EXPORT_SPED_ECD', ecfRectificationRequired: true }));
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      const first = await svc.waiveEcfRectification(scope, 'job-ecd', 'Justificativa com pelo menos 20 caracteres.');
      expect(first.id).toBe('job-ecd');
      const appendCallsAfterFirst = (audit.append as jest.Mock).mock.calls.length;
      expect(appendCallsAfterFirst).toBeGreaterThan(0);

      await svc.waiveEcfRectification(scope, 'job-ecd', 'Outra justificativa igualmente longa o bastante.');
      expect((audit.append as jest.Mock).mock.calls.length).toBe(appendCallsAfterFirst); // sem novo evento
    });

    it('job sem ecfRectificationRequired é 400 — nada a dispensar', async () => {
      const { repo, store } = makeRepo();
      store.set('job-ecd', makeJob({ id: 'job-ecd', kind: 'EXPORT_SPED_ECD', ecfRectificationRequired: false }));
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
      await expect(svc.waiveEcfRectification(scope, 'job-ecd', 'Justificativa com pelo menos 20 caracteres.')).rejects.toBeInstanceOf(ValidationError);
    });

    it('job de outro escopo é 404', async () => {
      const { repo } = makeRepo();
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());
      await expect(svc.waiveEcfRectification(scope, 'job-inexistente', 'Justificativa com pelo menos 20 caracteres.')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('listJobs (item 23, F-FA15 a)', () => {
    it('devolve supersededByJobId derivado (nunca coluna própria)', async () => {
      const { repo, store } = makeRepo();
      store.set('job-old', makeJob({ id: 'job-old', kind: 'EXPORT_SPED_ECD' }));
      store.set('job-new', makeJob({ id: 'job-new', kind: 'EXPORT_SPED_ECD', supersedesJobId: 'job-old' }));
      const svc = new DataExchangeExportService(makeReports(), new AccountingPolicy(), repo, audit, makeReconciliationReader(), makeJournalEntryRepo(), makeAccountRepo());

      const { items } = await svc.listJobs(scope, { page: 1, limit: 20 });
      const old = items.find((i) => i.id === 'job-old')!;
      const nw = items.find((i) => i.id === 'job-new')!;
      expect(old.supersededByJobId).toBe('job-new');
      expect(nw.supersedesJobId).toBe('job-old');
      expect(nw.supersededByJobId).toBeNull();
    });
  });
});
