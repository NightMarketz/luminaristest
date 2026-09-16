/**
 * AccountingReviewService — revisão profissional editável (BE-INCR-REVIEW-LAYER, nó C11).
 * Unit: repos, PostingService e auditoria são dublês.
 *
 * O que este arquivo prova e nenhum snapshot alcança: (2) uma revisão por par — 2ª abertura é 409
 * com o id existente; (3) achado só em OPEN; (4) ponteiro DATA_EDIT exige alvo no escopo;
 * (5) acerto idempotente — a SEGUNDA chamada devolve o mesmo entryId e NÃO reposta nem estorna de
 * novo; (8/9) staleness bloqueia o sign-off; (12) a `description` do achado nunca entra na trilha;
 * (14) o gate da entrega distingue REQUIRED × REJECTED × assinada.
 */
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { AccountingReviewService } from '@/features/accounting/services/AccountingReviewService';
import type { IAccountingReviewRepository } from '@/features/accounting/repositories/IAccountingReviewRepository';
import type { IDataExchangeRepository } from '@/features/accounting/repositories/IDataExchangeRepository';
import type { IAccountRepository } from '@/features/accounting/repositories/IAccountRepository';
import type { IReferentialMappingRepository } from '@/features/accounting/repositories/IReferentialMappingRepository';
import type { ICounterpartyRepository } from '@/features/accounting/repositories/ICounterpartyRepository';
import type { IJournalEntryRepository } from '@/features/accounting/repositories/IJournalEntryRepository';
import type { IAuditRepository } from '@/features/accounting/repositories/IAuditRepository';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AuditService } from '@/features/accounting/services/AuditService';
import type { PostingService } from '@/features/accounting/services/PostingService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import { REVIEW_ADJUSTMENT_SOURCE_TYPE, staleFindings } from '@/features/accounting/models/AccountingReview.model';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');
const T0 = new Date('2026-09-10T10:00:00.000Z');
const T1 = new Date('2026-09-11T10:00:00.000Z');
const T2 = new Date('2026-09-12T10:00:00.000Z');

const job = (id: string, kind: string, createdAt = T0, over: Record<string, unknown> = {}) => ({
  id, userId: 'dono-a', unitId: 'unit-1', direction: 'EXPORT', kind, status: 'EXPORTED',
  originalName: null, mimeType: null, sizeBytes: null, sha256: 'f'.repeat(64), storageKey: `k/${id}`,
  totalRows: 0, validRows: 0, invalidRows: 0, committedRows: 0, requestedById: 'dono-a', committedById: null,
  createdAt, updatedAt: createdAt, committedAt: null,
  periodStart: new Date('2026-01-01T00:00:00.000Z'), periodEnd: new Date('2026-12-31T00:00:00.000Z'),
  ...over,
});

const reviewRow = (over: Record<string, unknown> = {}) => ({
  id: 'r-1', userId: 'dono-a', unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd', ecfJobId: 'job-ecf',
  status: 'OPEN', reviewerUserId: 'dono-a', reviewerName: null, reviewerCrc: null, statement: null,
  closeReason: null, openedAt: T0, updatedAt: T0, closedAt: null, ...over,
});

const findingRow = (over: Record<string, unknown> = {}) => ({
  id: 'f-1', reviewId: 'r-1', userId: 'dono-a', unitId: 'unit-1', register: 'J150', locator: '1.1.1',
  description: 'Cliente João da Silva sem contrapartida', severity: 'BLOCKER', resolution: null,
  resolutionTargetType: null, resolutionTargetId: null, resolutionNote: null, resolvedById: null,
  resolvedAt: null, createdById: 'dono-a', createdAt: T1, ...over,
});

interface Opts {
  can?: boolean;
  review?: ReturnType<typeof reviewRow> | null;
  findings?: ReturnType<typeof findingRow>[];
  finding?: ReturnType<typeof findingRow> | null;
  existingByJobs?: ReturnType<typeof reviewRow> | null;
  jobs?: Record<string, ReturnType<typeof job> | null>;
  accountFound?: boolean;
  existingEntry?: { id: string } | null;
  validateRejects?: boolean;
}

function build(opts: Opts = {}) {
  const review = opts.review === undefined ? reviewRow() : opts.review;
  const findings = opts.findings ?? [];
  const auditAppend = jest.fn(async (_tx: unknown, _scope: unknown, _input: { eventType: string; payload: Record<string, unknown> }) => undefined);
  const create = jest.fn(async (d: Record<string, unknown>) => reviewRow({ ...d, id: 'r-new' }));
  const findById = jest.fn(async () => (review ? { ...review, findings } : null));
  const findByJobs = jest.fn(async (..._a: unknown[]) => opts.existingByJobs ?? null);
  const update = jest.fn(async (_s: unknown, _id: string, d: Record<string, unknown>) => reviewRow({ ...review, ...d }));
  const createFinding = jest.fn(async (d: Record<string, unknown>) => findingRow({ ...d, id: 'f-new' }));
  const findFindingById = jest.fn(async () => (opts.finding === undefined ? findingRow() : opts.finding));
  const updateFinding = jest.fn(async (_s: unknown, id: string, d: Record<string, unknown>) =>
    findingRow({ ...(opts.finding ?? findingRow()), id, ...d }),
  );
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));
  const reviewRepo = {
    create, findById, findByJobs, update, createFinding, findFindingById, updateFinding, runTransaction,
    list: jest.fn(async () => []),
  } as unknown as IAccountingReviewRepository;

  const jobs: Record<string, ReturnType<typeof job> | null> = {
    'job-ecd': job('job-ecd', 'EXPORT_SPED_ECD'),
    'job-ecf': job('job-ecf', 'EXPORT_SPED_ECF'),
    ...(opts.jobs ?? {}),
  };
  const findJobById = jest.fn(async (_s: unknown, id: string) => jobs[id] ?? null);
  const dataExchangeRepo = { findJobById } as unknown as IDataExchangeRepository;
  const accountRepo = { findById: jest.fn(async () => (opts.accountFound === false ? null : { id: 'acc-1' })) } as unknown as IAccountRepository;
  const mappingRepo = { findById: jest.fn(async () => null) } as unknown as IReferentialMappingRepository;
  const counterpartyRepo = { findById: jest.fn(async () => null) } as unknown as ICounterpartyRepository;
  const findBySource = jest.fn(async () => opts.existingEntry ?? null);
  const journalEntryRepo = { findById: jest.fn(async () => null), findBySource } as unknown as IJournalEntryRepository;
  const listByTarget = jest.fn(async () => [{ id: 'ev-1', createdAt: T2 }, { id: 'ev-0', createdAt: T0 }]);
  const auditRepo = { listByTarget } as unknown as IAuditRepository;
  const postEntry = jest.fn(async (_s: unknown, _input: { description: string }) => ({ id: 'entry-1', postings: [] }));
  const reverseEntry = jest.fn(async (_s: unknown, _input: unknown) => ({ reversal: { id: 'rev-1' }, original: { id: 'orig-1' } }));
  const validateEntry = jest.fn(async (_s: unknown, _input: unknown) => {
    if (opts.validateRejects) throw new ValidationError('Σdébito ≠ Σcrédito');
  });
  const postingService = { postEntry, reverseEntry, validateEntry } as unknown as PostingService;

  const policy = {
    canReviewAccounting: () => opts.can ?? true,
    canSignOffReview: () => opts.can ?? true,
    canRead: () => true,
  } as unknown as IAccountingPolicy;
  const audit = { append: auditAppend } as unknown as AuditService;

  const service = new AccountingReviewService(
    reviewRepo, dataExchangeRepo, accountRepo, mappingRepo, counterpartyRepo, journalEntryRepo,
    auditRepo, postingService, audit, policy,
  );
  return { service, create, findByJobs, update, createFinding, updateFinding, auditAppend, postEntry, reverseEntry, validateEntry, findBySource, listByTarget };
}

const lines = [
  { accountCode: '1.1.1', debitCents: 100, creditCents: 0 },
  { accountCode: '3.1', debitCents: 0, creditCents: 100 },
];

describe('AccountingReviewService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------- item 1/2 — abrir
  describe('openReview', () => {
    it('policy=false é ForbiddenError antes de tocar job', async () => {
      const { service, findByJobs } = build({ can: false });
      await expect(service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd' })).rejects.toThrow(ForbiddenError);
      expect(findByJobs).not.toHaveBeenCalled();
    });

    it('job de outro tenant é NotFoundError (404), não Forbidden', async () => {
      const { service } = build({ jobs: { 'job-ecd': null } });
      await expect(service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd' })).rejects.toThrow(NotFoundError);
    });

    it('job de outro exercício é 400 (year do DTO × periodStart do job)', async () => {
      const { service } = build();
      await expect(service.openReview(scope, { unitId: 'unit-1', year: 2025, ecdJobId: 'job-ecd' })).rejects.toThrow(ValidationError);
    });

    it('job não EXPORTED ou sem período é 400 (mesma régua do C6)', async () => {
      const a = build({ jobs: { 'job-ecd': job('job-ecd', 'EXPORT_SPED_ECD', T0, { status: 'PROCESSING' }) } });
      await expect(a.service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd' })).rejects.toThrow(/EXPORTED/);
      const b = build({ jobs: { 'job-ecd': job('job-ecd', 'EXPORT_SPED_ECD', T0, { periodStart: null }) } });
      await expect(b.service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd' })).rejects.toThrow(/período/);
    });

    it('2ª abertura para o mesmo par é 409 REVIEW_ALREADY_OPEN com o id existente, sem create', async () => {
      const { service, create } = build({ existingByJobs: reviewRow({ id: 'r-existing' }) });
      await expect(service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd', ecfJobId: 'job-ecf' }))
        .rejects.toMatchObject({ errorCode: 'REVIEW_ALREADY_OPEN', message: expect.stringContaining('r-existing') });
      expect(create).not.toHaveBeenCalled();
    });

    it('cria OPEN com o par e emite review.opened na MESMA tx (id-only)', async () => {
      const { service, create, auditAppend } = build();
      const r = await service.openReview(scope, { unitId: 'unit-1', year: 2026, ecdJobId: 'job-ecd', ecfJobId: 'job-ecf' });
      expect(r.status).toBe('OPEN');
      expect(create.mock.calls[0][0]).toMatchObject({ ecdJobId: 'job-ecd', ecfJobId: 'job-ecf', status: 'OPEN', reviewerUserId: 'dono-a' });
      expect(auditAppend).toHaveBeenCalledTimes(1);
      expect(auditAppend.mock.calls[0][0]).toEqual({ tx: true });
      expect(auditAppend.mock.calls[0][2]).toMatchObject({ eventType: 'review.opened' });
    });
  });

  // ---------------------------------------------------------------- item 3/12 — achado
  describe('addFinding', () => {
    const dto = { unitId: 'unit-1', register: 'J150' as const, locator: '1.1.1', description: 'Cliente João sem contrapartida', severity: 'BLOCKER' as const };

    it('revisão SIGNED_OFF é 409 REVIEW_NOT_OPEN', async () => {
      const { service, createFinding } = build({ review: reviewRow({ status: 'SIGNED_OFF' }) });
      await expect(service.addFinding(scope, 'r-1', dto)).rejects.toMatchObject({ errorCode: 'REVIEW_NOT_OPEN' });
      expect(createFinding).not.toHaveBeenCalled();
    });

    it('grava o achado e o evento NÃO carrega description/locator (item 12)', async () => {
      const { service, auditAppend } = build();
      await service.addFinding(scope, 'r-1', dto);
      const payload = auditAppend.mock.calls[0][2].payload;
      expect(payload).toEqual({ reviewId: 'r-1', findingId: 'f-new', register: 'J150', severity: 'BLOCKER' });
      expect(JSON.stringify(payload)).not.toContain('João');
    });
  });

  // ---------------------------------------------------------------- item 4/7 — resolver
  describe('resolveFinding', () => {
    it('DATA_EDIT com alvo inexistente no escopo (conta de outro tenant) é 400', async () => {
      const { service, updateFinding } = build({ accountFound: false });
      await expect(service.resolveFinding(scope, 'r-1', 'f-1', { unitId: 'unit-1', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'acc-alheia' }))
        .rejects.toThrow(ValidationError);
      expect(updateFinding).not.toHaveBeenCalled();
    });

    it('DATA_EDIT grava o PONTEIRO e emite finding_resolved com targetType/targetId', async () => {
      const { service, updateFinding, auditAppend } = build();
      const f = await service.resolveFinding(scope, 'r-1', 'f-1', { unitId: 'unit-1', resolution: 'DATA_EDIT', targetType: 'account', targetId: 'acc-1' });
      expect(f.resolution).toBe('DATA_EDIT');
      expect(updateFinding.mock.calls[0][2]).toMatchObject({ resolutionTargetType: 'account', resolutionTargetId: 'acc-1', resolvedById: 'dono-a' });
      expect(auditAppend.mock.calls[0][2]).toMatchObject({ eventType: 'review.finding_resolved', payload: expect.objectContaining({ targetType: 'account', targetId: 'acc-1' }) });
    });

    it('achado já resolvido é 409 FINDING_ALREADY_RESOLVED', async () => {
      const { service } = build({ finding: findingRow({ resolution: 'NO_ACTION' }) });
      await expect(service.resolveFinding(scope, 'r-1', 'f-1', { unitId: 'unit-1', resolution: 'NO_ACTION', resolutionNote: 'x' }))
        .rejects.toMatchObject({ errorCode: 'FINDING_ALREADY_RESOLVED' });
    });
  });

  // ---------------------------------------------------------------- item 5/6 — acerto
  describe('postAdjustment (2 commits, idempotente por findingId)', () => {
    const dto = { unitId: 'unit-1', postingDate: '2026-03-15', description: 'acerto', lines };

    it('1ª chamada: postEntry com sourceType=review_adjustment/sourceId=findingId, depois o achado aponta journal_entry', async () => {
      const { service, postEntry, updateFinding } = build();
      const r = await service.postAdjustment(scope, 'r-1', 'f-1', dto);
      expect(r.entryId).toBe('entry-1');
      expect(postEntry.mock.calls[0][1]).toMatchObject({ sourceType: REVIEW_ADJUSTMENT_SOURCE_TYPE, sourceId: 'f-1', date: '2026-03-15' });
      expect(postEntry.mock.calls[0][1].description).toContain('revisão r-1, achado');
      expect(updateFinding.mock.calls[0][2]).toMatchObject({ resolution: 'ADJUSTMENT_ENTRY', resolutionTargetType: 'journal_entry', resolutionTargetId: 'entry-1' });
    });

    it('2ª chamada (achado já resolvido) devolve o MESMO entryId sem postar nem estornar de novo', async () => {
      const { service, postEntry, reverseEntry, updateFinding } = build({
        finding: findingRow({ resolution: 'ADJUSTMENT_ENTRY', resolutionTargetType: 'journal_entry', resolutionTargetId: 'entry-1' }),
      });
      const r = await service.postAdjustment(scope, 'r-1', 'f-1', { ...dto, reverseOriginal: true });
      expect(r.entryId).toBe('entry-1');
      expect(postEntry).not.toHaveBeenCalled();
      expect(reverseEntry).not.toHaveBeenCalled();
      expect(updateFinding).not.toHaveBeenCalled();
    });

    it('reconcile: commit 1 passou e o 2 não — a repetição NÃO reposta nem estorna, só aponta o lançamento existente', async () => {
      const { service, postEntry, reverseEntry, updateFinding } = build({
        finding: findingRow({ register: 'I200', locator: 'orig-1' }),
        existingEntry: { id: 'entry-1' },
      });
      const r = await service.postAdjustment(scope, 'r-1', 'f-1', { ...dto, reverseOriginal: true });
      expect(r.entryId).toBe('entry-1');
      expect(postEntry).not.toHaveBeenCalled();
      expect(reverseEntry).not.toHaveBeenCalled();
      expect(updateFinding.mock.calls[0][2]).toMatchObject({ resolutionTargetId: 'entry-1' });
    });

    it('reverseOriginal em achado que não é I200 é 400; em I200 estorna o locator antes de postar', async () => {
      const a = build();
      await expect(a.service.postAdjustment(scope, 'r-1', 'f-1', { ...dto, reverseOriginal: true })).rejects.toThrow(ValidationError);
      expect(a.reverseEntry).not.toHaveBeenCalled();

      const b = build({ finding: findingRow({ register: 'I200', locator: 'orig-1' }) });
      await b.service.postAdjustment(scope, 'r-1', 'f-1', { ...dto, reverseOriginal: true });
      expect(b.reverseEntry.mock.calls[0][1]).toMatchObject({ lancamentoId: 'orig-1', reversalPostingDate: '2026-03-15' });
      expect(b.postEntry).toHaveBeenCalledTimes(1);
    });

    it('B1 (#334): corpo inválido é rejeitado ANTES do estorno — validateEntry roda primeiro, reverseEntry não é chamado', async () => {
      const { service, reverseEntry, postEntry, validateEntry } = build({ finding: findingRow({ register: 'I200', locator: 'orig-1' }), validateRejects: true });
      await expect(service.postAdjustment(scope, 'r-1', 'f-1', { ...dto, reverseOriginal: true })).rejects.toThrow(ValidationError);
      expect(validateEntry).toHaveBeenCalledTimes(1);
      expect(reverseEntry).not.toHaveBeenCalled();
      expect(postEntry).not.toHaveBeenCalled();
    });

    it('revisão fechada é 409 antes de qualquer lançamento', async () => {
      const { service, postEntry } = build({ review: reviewRow({ status: 'REJECTED' }) });
      await expect(service.postAdjustment(scope, 'r-1', 'f-1', dto)).rejects.toMatchObject({ errorCode: 'REVIEW_NOT_OPEN' });
      expect(postEntry).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- item 8/9 — sign-off
  describe('signOff', () => {
    const dto = { unitId: 'unit-1', reviewerName: 'Maria Contadora', reviewerCrc: 'SP-123456/O-1', statement: 'Atesto.' };

    it('BLOCKER sem resolução → 409 REVIEW_STALE nomeando o achado (caso adversarial do BRIEF §7)', async () => {
      const { service, update } = build({ findings: [findingRow({ id: 'f-blk' })] });
      await expect(service.signOff(scope, 'r-1', dto)).rejects.toMatchObject({ errorCode: 'REVIEW_STALE', message: expect.stringContaining('f-blk') });
      expect(update).not.toHaveBeenCalled();
    });

    it('achado resolvido DEPOIS da geração do job → 409 REVIEW_STALE (regere e troque o par)', async () => {
      const { service } = build({
        findings: [findingRow({ id: 'f-late', severity: 'NOTE', resolution: 'NO_ACTION', resolvedAt: T2 })], // job gerado em T0
      });
      await expect(service.signOff(scope, 'r-1', dto)).rejects.toMatchObject({ errorCode: 'REVIEW_STALE', message: expect.stringContaining('f-late') });
    });

    it('NOTE aberto não bloqueia; achado resolvido ANTES do job regerado passa → SIGNED_OFF com nome/CRC e evento', async () => {
      const { service, update, auditAppend } = build({
        jobs: { 'job-ecd': job('job-ecd', 'EXPORT_SPED_ECD', T2), 'job-ecf': job('job-ecf', 'EXPORT_SPED_ECF', T2) },
        findings: [
          findingRow({ id: 'f-note', severity: 'NOTE' }),
          findingRow({ id: 'f-ok', resolution: 'DATA_EDIT', resolvedAt: T1 }),
        ],
      });
      const r = await service.signOff(scope, 'r-1', dto);
      expect(r.status).toBe('SIGNED_OFF');
      expect(update.mock.calls[0][2]).toMatchObject({ status: 'SIGNED_OFF', reviewerName: 'Maria Contadora', reviewerCrc: 'SP-123456/O-1' });
      expect(auditAppend.mock.calls[0][2]).toMatchObject({ eventType: 'review.signed_off', payload: { reviewId: 'r-1', reviewerName: 'Maria Contadora', reviewerCrc: 'SP-123456/O-1' } });
    });

    it('já SIGNED_OFF → 409 REVIEW_NOT_OPEN (sem re-assinar)', async () => {
      const { service } = build({ review: reviewRow({ status: 'SIGNED_OFF' }) });
      await expect(service.signOff(scope, 'r-1', dto)).rejects.toMatchObject({ errorCode: 'REVIEW_NOT_OPEN' });
    });
  });

  // ---------------------------------------------------------------- item 10 — rejeição
  it('reject fecha como REJECTED com closeReason e emite review.rejected', async () => {
    const { service, update, auditAppend } = build();
    const r = await service.reject(scope, 'r-1', { unitId: 'unit-1', reason: 'saldo não bate' });
    expect(r.status).toBe('REJECTED');
    expect(update.mock.calls[0][2]).toMatchObject({ status: 'REJECTED', closeReason: 'saldo não bate' });
    expect(auditAppend.mock.calls[0][2]).toMatchObject({ eventType: 'review.rejected' });
  });

  // ---------------------------------------------------------------- item 8 / F-C11-6 — troca de jobs
  it('replaceJobs troca o par e o evento carrega from/to (o par antigo fica só na trilha)', async () => {
    const { service, update, auditAppend } = build({ jobs: { 'job-ecd-2': job('job-ecd-2', 'EXPORT_SPED_ECD', T2) } });
    await service.replaceJobs(scope, 'r-1', { unitId: 'unit-1', ecdJobId: 'job-ecd-2' });
    expect(update.mock.calls[0][2]).toEqual({ ecdJobId: 'job-ecd-2', ecfJobId: 'job-ecf' });
    expect(auditAppend.mock.calls[0][2]).toMatchObject({
      eventType: 'review.jobs_replaced',
      payload: { fromEcdJobId: 'job-ecd', toEcdJobId: 'job-ecd-2', fromEcfJobId: 'job-ecf', toEcfJobId: 'job-ecf' },
    });
  });

  // ---------------------------------------------------------------- item 13 — trilha do alvo
  it('getReview junta, por achado resolvido, os eventos do alvo posteriores ao achado (mapa targetType → auditType)', async () => {
    const { service, listByTarget } = build({
      findings: [findingRow({ resolution: 'DATA_EDIT', resolutionTargetType: 'referential_mapping', resolutionTargetId: 'map-1', resolvedAt: T2 })],
    });
    const d = await service.getReview(scope, 'r-1');
    expect(listByTarget).toHaveBeenCalledWith(scope, 'ReferentialMapping', 'map-1');
    // ev-0 (T0) é anterior ao achado (T1) e cai; ev-1 (T2) fica
    expect(d.findings[0].targetAuditEvents.map((e) => e.id)).toEqual(['ev-1']);
  });

  // ---------------------------------------------------------------- item 14 — gate da entrega
  describe('assertPairSignedOff (consumido pela entrega, F-C11-3 a)', () => {
    it('sem revisão → REVIEW_REQUIRED; OPEN → REVIEW_REQUIRED; REJECTED → REVIEW_REJECTED; SIGNED_OFF passa', async () => {
      await expect(build({ existingByJobs: null }).service.assertPairSignedOff(scope, 'job-ecd', 'job-ecf')).rejects.toMatchObject({ errorCode: 'REVIEW_REQUIRED' });
      await expect(build({ existingByJobs: reviewRow() }).service.assertPairSignedOff(scope, 'job-ecd', 'job-ecf')).rejects.toMatchObject({ errorCode: 'REVIEW_REQUIRED' });
      await expect(build({ existingByJobs: reviewRow({ status: 'REJECTED' }) }).service.assertPairSignedOff(scope, 'job-ecd', 'job-ecf')).rejects.toMatchObject({ errorCode: 'REVIEW_REJECTED' });
      await expect(build({ existingByJobs: reviewRow({ status: 'SIGNED_OFF' }) }).service.assertPairSignedOff(scope, 'job-ecd', 'job-ecf')).resolves.toBeUndefined();
    });

    it('propaga o handle da tx ao repo (gate autoritativo dentro do confirmDelivery)', async () => {
      const { service, findByJobs } = build({ existingByJobs: reviewRow({ status: 'SIGNED_OFF' }) });
      await service.assertPairSignedOff(scope, 'job-ecd', 'job-ecf', { tx: true } as never);
      expect(findByJobs.mock.calls[0][3]).toEqual({ tx: true });
    });
  });
});

describe('staleFindings (função pura, item 8)', () => {
  it('resolvido no MESMO instante da geração conta como stale (job.createdAt > resolvedAt é estrito)', () => {
    const r = staleFindings([{ id: 'j', createdAt: T1 }], [findingRow({ severity: 'NOTE', resolution: 'NO_ACTION', resolvedAt: T1 })]);
    expect(r.resolvedAfterGeneration).toEqual(['f-1']);
  });

  it('sem achados → nada bloqueia', () => {
    expect(staleFindings([{ id: 'j', createdAt: T1 }], [])).toEqual({ unresolvedBlockers: [], resolvedAfterGeneration: [] });
  });
});
