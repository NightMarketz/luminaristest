import { CounterpartyService } from '../CounterpartyService';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import {
  COUNTERPARTY_ARCHIVED,
  COUNTERPARTY_CREATED,
  normalizeCounterpartyName,
} from '../../models/Counterparty.model';
import { Prisma } from 'generated/prisma';
import type { Counterparty } from 'generated/prisma';

const scope = resolveAccountingScope({ userId: 'owner-1' }, 'unit-1');

const P2002 = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' } as never);

function cpRow(over: Partial<Counterparty> = {}): Counterparty {
  return {
    id: 'cp-1', userId: 'owner-1', unitId: 'unit-1', type: 'SUPPLIER', name: 'ACME',
    nameNormalized: normalizeCounterpartyName('ACME'), ref: null, taxId: null,
    createdById: 'owner-1', createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...over,
  } as Counterparty;
}

interface Opts {
  canManage?: boolean;
  canRead?: boolean;
  found?: Counterparty | null;
  createThrows?: unknown;
}

function build(opts: Opts = {}) {
  const counterpartyRepo = {
    create: jest.fn(async (data: Record<string, unknown>) => {
      if (opts.createThrows) throw opts.createThrows;
      return cpRow({ id: 'cp-new', ...data } as Partial<Counterparty>);
    }),
    findById: jest.fn(async () => (opts.found === undefined ? cpRow() : opts.found)),
    findManyByUnit: jest.fn(async () => [cpRow()]),
    update: jest.fn(async (_s, id: string, data: Record<string, unknown>) => cpRow({ id, ...data } as Partial<Counterparty>)),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const auditService = { append: jest.fn(async () => undefined) };
  const policy = {
    canManageCounterparty: () => opts.canManage ?? true,
    canReadCounterparty: () => opts.canRead ?? true,
  };
  const service = new CounterpartyService(counterpartyRepo as never, auditService as never, policy as never);
  return { service, counterpartyRepo, auditService };
}

describe('CounterpartyService.createCounterparty', () => {
  it('creates the counterparty and audits counterparty.created in the same tx', async () => {
    const { service, counterpartyRepo, auditService } = build();
    const out = await service.createCounterparty(scope, { unitId: 'unit-1', type: 'SUPPLIER', name: 'ACME' });
    expect(out.id).toBe('cp-new');
    // scope-owned fields come from the scope, never the body (tenancy T2).
    const data = counterpartyRepo.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(data.userId).toBe('owner-1');
    expect(data.unitId).toBe('unit-1');
    expect(data.type).toBe('SUPPLIER');
    // BRIEF-W2-A comp. 6: nameNormalized is derived from dto.name at the write choke-point.
    expect(data.nameNormalized).toBe('acme');
    expect(auditService.append).toHaveBeenCalledWith(
      {}, scope, expect.objectContaining({ eventType: COUNTERPARTY_CREATED }),
    );
  });

  it('derives nameNormalized via trim + case-fold + whitespace collapse even from an UN-trimmed name (BRIEF-W2-A comp. 2, F1(b))', async () => {
    // The DTO trims `name` at the HTTP edge (comp. 5); this call bypasses Zod (unit test of the
    // service, not the boundary), so it doubles as proof that normalizeCounterpartyName ALSO collapses
    // internal whitespace on its own — the service does not rely on the DTO having done that part.
    const { service, counterpartyRepo } = build();
    await service.createCounterparty(scope, { unitId: 'unit-1', type: 'SUPPLIER', name: '  Padaria   X  ' });
    const data = counterpartyRepo.create.mock.calls[0]![0] as Record<string, unknown>;
    expect(data.name).toBe('  Padaria   X  '); // display name stored AS RECEIVED — the service does not touch it
    expect(data.nameNormalized).toBe('padaria x');
  });

  it('passes taxId through to the repo as-received (normalization is a DTO-boundary concern, comp. 5), and null when omitted', async () => {
    const { service, counterpartyRepo } = build();
    // Already-normalized (digits-only) input, as the DTO's .transform would hand the service.
    await service.createCounterparty(scope, { unitId: 'unit-1', type: 'SUPPLIER', name: 'ACME', taxId: '12345678000190' });
    expect((counterpartyRepo.create.mock.calls[0]![0] as Record<string, unknown>).taxId).toBe('12345678000190');

    const { service: service2, counterpartyRepo: repo2 } = build();
    await service2.createCounterparty(scope, { unitId: 'unit-1', type: 'SUPPLIER', name: 'Beta' });
    expect((repo2.create.mock.calls[0]![0] as Record<string, unknown>).taxId).toBeNull();
  });

  it('maps a P2002 (duplicate scope+type+name) to a ValidationError (SEC-A1-2)', async () => {
    const { service } = build({ createThrows: P2002 });
    await expect(service.createCounterparty(scope, { unitId: 'unit-1', type: 'CUSTOMER', name: 'ACME' }))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('forbids without canManageCounterparty', async () => {
    const { service } = build({ canManage: false });
    await expect(service.createCounterparty(scope, { unitId: 'unit-1', type: 'SUPPLIER', name: 'X' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('CounterpartyService.getCounterparty — scope isolation', () => {
  it('throws NotFound when the id is not in scope (findById → null, cross-tenant)', async () => {
    const { service } = build({ found: null });
    await expect(service.getCounterparty(scope, 'cp-other')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('reads a counterparty of this scope', async () => {
    const { service, counterpartyRepo } = build();
    const out = await service.getCounterparty(scope, 'cp-1');
    expect(out.id).toBe('cp-1');
    expect(counterpartyRepo.findById).toHaveBeenCalledWith(scope, 'cp-1');
  });

  it('forbids reads without canReadCounterparty', async () => {
    const { service } = build({ canRead: false });
    await expect(service.getCounterparty(scope, 'cp-1')).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('CounterpartyService.archiveCounterparty — soft-delete + rename-on-key (SEC-A1-4)', () => {
  it('soft-deletes AND renames the key so archive+recreate never trips P2002', async () => {
    const { service, counterpartyRepo, auditService } = build({
      found: cpRow({ id: 'cp-1', name: 'ACME', nameNormalized: normalizeCounterpartyName('ACME') }),
    });
    await service.archiveCounterparty(scope, 'cp-1', { unitId: 'unit-1' });
    const data = counterpartyRepo.update.mock.calls[0]![2] as Record<string, unknown>;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.name).toBe('deleted:cp-1:ACME'); // key freed → re-create of "ACME" is legal
    // BRIEF-W2-A comp. 4: nameNormalized — the column the `@@unique` ACTUALLY constrains now — must be
    // mangled TOO, or the rename-on-delete frees `name` but leaves nameNormalized occupied.
    expect(data.nameNormalized).toBe('deleted:cp-1:acme');
    expect(auditService.append).toHaveBeenCalledWith(
      {}, scope, expect.objectContaining({ eventType: COUNTERPARTY_ARCHIVED }),
    );
  });

  it('is idempotent on an already-archived counterparty (no second write)', async () => {
    const { service, counterpartyRepo } = build({ found: cpRow({ deletedAt: new Date() }) });
    await service.archiveCounterparty(scope, 'cp-1', { unitId: 'unit-1' });
    expect(counterpartyRepo.update).not.toHaveBeenCalled();
  });

  it('throws NotFound archiving an id outside scope', async () => {
    const { service } = build({ found: null });
    await expect(service.archiveCounterparty(scope, 'cp-x', { unitId: 'unit-1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });
});
