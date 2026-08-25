import type { AccountingBinding } from 'generated/prisma';
import { NoActiveAccountingBindingsError } from '../../../../lib/errors';
import { archetypeCatalog } from '../../archetypes/catalog';
import { SALE_BINDING_V1 } from '../../fixtures/saleBinding';
import type { IAccountingBindingRepository } from '../../repositories/IAccountingBindingRepository';
import { AccountingBindingFeederService } from '../AccountingBindingFeederService';

/**
 * BE-INCR-BINDING-FEEDER (FATIA A) — o núcleo do alimentador é exercitado aqui **sem tocar o
 * banco**: `IAccountingBindingRepository` é uma FAKE em memória (mesmo padrão de
 * `AccountingSyncService.test.ts`, `postingService` stub) — a leitura real (`AccountingBindingRepository`,
 * Prisma) é integração, fora do escopo desta suíte. `SALE_BINDING_V1` (já validado pela própria
 * fixture, `AccountingBindingV1Schema.parse`) é reusado como payload — mesmo corpus do golden test,
 * nenhum dado de arquétipo/binding é reinventado aqui.
 */

function activeRow(overrides: Partial<AccountingBinding> = {}): AccountingBinding {
  return {
    id: 'binding-1',
    userId: 'user-1',
    unitId: 'unit-1',
    sectorKey: 'beautySalon',
    bindingVersion: 1,
    compiledAt: new Date('2026-08-21T00:00:00.000Z'),
    compiledFromHash: 'hash-1',
    payload: JSON.stringify(SALE_BINDING_V1),
    status: 'Active',
    createdById: 'user-1',
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  } as AccountingBinding;
}

function fakeRepo(rows: AccountingBinding[]): IAccountingBindingRepository {
  return { findAllActive: jest.fn().mockResolvedValue(rows) } as unknown as IAccountingBindingRepository;
}

const SALE_EVENT_KEYS = SALE_BINDING_V1.eventBindings.map((b) => b.eventKey).sort();

describe('AccountingBindingFeederService', () => {
  it('builds one registration per eventBinding of the Active row, tagged with the row unitId — no DB, no boot', async () => {
    const repo = fakeRepo([activeRow({ unitId: 'unit-a' })]);
    const svc = new AccountingBindingFeederService(repo, archetypeCatalog);

    const registrations = await svc.buildActiveMapperRegistrations();

    expect(registrations).toHaveLength(SALE_BINDING_V1.eventBindings.length);
    expect(registrations.every((r) => r.unitId === 'unit-a')).toBe(true);
    expect(registrations.map((r) => r.mapper.sourceType).sort()).toEqual(SALE_EVENT_KEYS);
  });

  it('two Active rows of DIFFERENT units produce registrations for BOTH units — no overwrite (comportamento 3)', async () => {
    const repo = fakeRepo([
      activeRow({ id: 'binding-a', unitId: 'unit-a' }),
      activeRow({ id: 'binding-b', unitId: 'unit-b' }),
    ]);
    const svc = new AccountingBindingFeederService(repo, archetypeCatalog);

    const registrations = await svc.buildActiveMapperRegistrations();

    expect(registrations).toHaveLength(SALE_BINDING_V1.eventBindings.length * 2);
    expect(registrations.filter((r) => r.unitId === 'unit-a')).toHaveLength(SALE_BINDING_V1.eventBindings.length);
    expect(registrations.filter((r) => r.unitId === 'unit-b')).toHaveLength(SALE_BINDING_V1.eventBindings.length);
  });

  it('zero Active rows throws NoActiveAccountingBindingsError — never an empty/silent array (F-FEEDER-4)', async () => {
    const repo = fakeRepo([]);
    const svc = new AccountingBindingFeederService(repo, archetypeCatalog);

    const err = await svc.buildActiveMapperRegistrations().catch((e) => e);
    expect(err).toBeInstanceOf(NoActiveAccountingBindingsError);
    expect(err.errorCode).toBe('NO_ACTIVE_ACCOUNTING_BINDINGS');
  });

  it('an eventBinding whose archetypeKey is absent from the catalog fails loud (fiação quebrada), never silently skipped', async () => {
    const brokenPayload = {
      ...SALE_BINDING_V1,
      eventBindings: [{ ...SALE_BINDING_V1.eventBindings[0], archetypeKey: 'revenue_recognition' }],
    };
    const repo = fakeRepo([activeRow({ payload: JSON.stringify(brokenPayload) })]);
    // A catalog that resolves nothing — simulates the "archetypeKey ausente do catálogo" fault.
    const emptyCatalog = { get: () => undefined, all: () => [] };
    const svc = new AccountingBindingFeederService(repo, emptyCatalog);

    await expect(svc.buildActiveMapperRegistrations()).rejects.toThrow(/ausente do catálogo/);
  });
});
