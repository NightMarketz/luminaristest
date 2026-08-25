import { Prisma } from 'generated/prisma';
import { AccountingSyncService } from '../AccountingSyncService';
import { SalonSaleFinalizedMapper } from '../mappers/SalonSaleFinalizedMapper';
import { SalonSaleSettledMapper } from '../mappers/SalonSaleSettledMapper';
import { AccountingEventMapperCollisionError, MaxCentsExceededError, ValidationError } from '../../../../lib/errors';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { AccountingEvent } from '../AccountingSyncPort';
import type { IAccountingEventMapper } from '../mappers/IAccountingEventMapper';
import type { PostEntryInput } from '../../dtos/PostingDto';

/** Fake mapper — its `map()` output carries a `marker` so a test can prove WHICH registration a
 *  given event resolved to (BE-INCR-BINDING-FEEDER, F-FEEDER-3 composite key: two Active bindings
 *  of different units sharing a `sourceType` must never last-write-wins to a single mapper). */
function markedMapper(sourceType: AccountingEvent['sourceType'], marker: string): IAccountingEventMapper {
  return {
    sourceType,
    map: () => ({ marker }) as unknown as PostEntryInput,
  };
}

/** Typed postEntry stub so mock.calls is a [scope, input] tuple (not []). */
const okEntry = (_s: AccountingScope, _i: PostEntryInput) => Promise.resolve({ id: 'entry-1' });

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

// Generic fixture event: the salon finalized sale ('crm.opportunity.won' was retired —
// CRM Won deals route through CrmReceivableBridge, ADR-CRM-AR-SEAM).
const finalizedEvent: AccountingEvent = {
  sourceType: 'salon.sale.finalized',
  sourceId: 'sale-1',
  unitId: 'unit-1',
  amount: 1000,
  currency: 'BRL',
  occurredAt: '2026-06-25T00:00:00.000Z',
  label: 'Venda sale-1',
};

function p2024(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('timed out fetching connection', {
    code: 'P2024',
    clientVersion: 'test',
  });
}

function buildService(postEntry: jest.Mock) {
  const postingService = { postEntry } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
  // retryDelayMs:0 keeps the retry tests instant.
  const svc = new AccountingSyncService(postingService, [new SalonSaleFinalizedMapper()], {
    maxAttempts: 3,
    retryDelayMs: 0,
  });
  return { svc, postEntry };
}

describe('AccountingSyncService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates to PostingService.postEntry with the correct sourceType/sourceId and returns the entry id', async () => {
    const postEntry = jest.fn(okEntry);
    const { svc } = buildService(postEntry);

    const result = await svc.sync(scope, finalizedEvent);

    expect(result).toEqual({ entryId: 'entry-1' });
    expect(postEntry).toHaveBeenCalledTimes(1);
    const [passedScope, input] = postEntry.mock.calls[0]!;
    expect(passedScope).toBe(scope); // scope passed through UNCHANGED (no unit substitution)
    expect(input).toMatchObject({
      sourceType: 'salon.sale.finalized',
      sourceId: 'sale-1',
      unitId: 'unit-1',
    });
  });

  it('duplicidade: two executions of the same event do not create duplication (same source keys, idempotency owned by postEntry)', async () => {
    // postEntry is the idempotency authority: a 2nd call for the same source returns the same entry.
    const postEntry = jest.fn(okEntry);
    const { svc } = buildService(postEntry);

    const a = await svc.sync(scope, finalizedEvent);
    const b = await svc.sync(scope, finalizedEvent);

    expect(a).toEqual(b);
    // service adds NO dedup state of its own — both calls go to postEntry with identical source keys.
    expect(postEntry).toHaveBeenCalledTimes(2);
    expect(postEntry.mock.calls[0]![1].sourceId).toBe(postEntry.mock.calls[1]![1].sourceId);
  });

  it('concorrência/P2002: postEntry race-closes to the existing entry; sync returns it without error', async () => {
    // PostingService catches P2002 internally and returns the existing entry — from the
    // service's view postEntry just resolves with an entry; assert no error surfaces.
    const postEntry = jest.fn(async () => ({ id: 'entry-existing' }));
    const { svc } = buildService(postEntry);

    await expect(svc.sync(scope, finalizedEvent)).resolves.toEqual({ entryId: 'entry-existing' });
  });

  it('ValidationError is NOT retried (deterministic fault)', async () => {
    const postEntry = jest.fn(async () => {
      throw new ValidationError('Lançamento desbalanceado');
    });
    const { svc } = buildService(postEntry);

    await expect(svc.sync(scope, finalizedEvent)).rejects.toBeInstanceOf(ValidationError);
    expect(postEntry).toHaveBeenCalledTimes(1); // no retry
  });

  it('MaxCentsExceededError is NOT retried (deterministic poison — Council 1.5) and surfaces its own code', async () => {
    const postEntry = jest.fn(async () => {
      throw new MaxCentsExceededError('1.1.2', 2_147_483_648, 2_147_483_647);
    });
    const { svc } = buildService(postEntry);

    const err = await svc.sync(scope, finalizedEvent).catch((e) => e);
    expect(err).toBeInstanceOf(MaxCentsExceededError);
    expect(err.errorCode).toBe('MAX_CENTS_EXCEEDED');
    expect(postEntry).toHaveBeenCalledTimes(1); // no retry — bridges/reconcile skip on this code
  });

  it('transient DB error respects the retry limit then reports without partial write', async () => {
    const postEntry = jest.fn(async () => {
      throw p2024();
    });
    const { svc } = buildService(postEntry);

    await expect(svc.sync(scope, finalizedEvent)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(postEntry).toHaveBeenCalledTimes(3); // maxAttempts — each attempt is atomic, no partial state
  });

  it('retries a transient error then succeeds', async () => {
    const postEntry = jest
      .fn()
      .mockRejectedValueOnce(p2024())
      .mockResolvedValueOnce({ id: 'entry-2' });
    const { svc } = buildService(postEntry as jest.Mock);

    await expect(svc.sync(scope, finalizedEvent)).resolves.toEqual({ entryId: 'entry-2' });
    expect(postEntry).toHaveBeenCalledTimes(2);
  });

  it('evento inválido: sourceType without a registered mapper (e.g. the retired crm.opportunity.won) is rejected WITHOUT calling postEntry', async () => {
    const postEntry = jest.fn();
    const { svc } = buildService(postEntry);
    const unknownEvent = { ...finalizedEvent, sourceType: 'crm.opportunity.won' } as unknown as AccountingEvent;

    await expect(svc.sync(scope, unknownEvent)).rejects.toBeInstanceOf(ValidationError);
    expect(postEntry).not.toHaveBeenCalled();
  });

  it('settlement with a missing prepaid account (2.1.1) surfaces a ValidationError and books NOTHING', async () => {
    // PostingService.resolveLeafAccount throws ValidationError for an absent/synthetic leaf — it is
    // the chart authority (§2.1), not the mapper. Here postEntry simulates 2.1.1 being absent: the
    // Package Balance settlement must surface ValidationError, not retry, and never post a partial.
    const postEntry = jest.fn((_s: AccountingScope, _i: PostEntryInput) => {
      throw new ValidationError("Conta '2.1.1' não existe no plano de contas.");
    });
    const postingService = { postEntry } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
    const svc = new AccountingSyncService(postingService, [new SalonSaleSettledMapper()], {
      maxAttempts: 3,
      retryDelayMs: 0,
    });
    const settledEvent: AccountingEvent = {
      sourceType: 'salon.sale.settled',
      sourceId: 'sale-pkg',
      unitId: 'unit-1',
      amount: 200,
      currency: 'BRL',
      occurredAt: '2026-06-25T00:00:00.000Z',
      paymentMethod: 'Package Balance',
      label: 'Liquidação sale-pkg',
    };

    await expect(svc.sync(scope, settledEvent)).rejects.toBeInstanceOf(ValidationError);
    expect(postEntry).toHaveBeenCalledTimes(1); // deterministic fault — no retry, no partial write
    // The mapper still chose the prepaid liability (never cash) before the chart rejected it.
    expect(postEntry.mock.calls[0]![1].lines.some((l) => l.accountCode === '2.1.1')).toBe(true);
    expect(postEntry.mock.calls[0]![1].lines.some((l) => l.accountCode === '1.1.3')).toBe(false);
  });

  it('unitId is never substituted or crossed — the posting input carries the event unit', async () => {
    const postEntry = jest.fn((_s: AccountingScope, _i: PostEntryInput) => Promise.resolve({ id: 'entry-3' }));
    const { svc } = buildService(postEntry);
    const otherUnitScope: AccountingScope = { ...scope, unitId: 'unit-9' };

    await svc.sync(otherUnitScope, { ...finalizedEvent, unitId: 'unit-9' });

    const [passedScope, input] = postEntry.mock.calls[0]!;
    expect(passedScope.unitId).toBe('unit-9');
    expect(input.unitId).toBe('unit-9');
  });

  // BE-INCR-BINDING-FEEDER (FATIA A) — F-FEEDER-3, chave composta unitId:sourceType.
  describe('composite-key mapper registration (F-FEEDER-3)', () => {
    it('two registrations of the SAME unitId + sourceType collide — fails loud at construction, never last-write-wins', () => {
      const postingService = { postEntry: jest.fn() } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
      const mapperA = markedMapper('salon.sale.finalized', 'A');
      const mapperB = markedMapper('salon.sale.finalized', 'B');

      expect(
        () =>
          new AccountingSyncService(postingService, [
            { unitId: 'unit-1', mapper: mapperA },
            { unitId: 'unit-1', mapper: mapperB },
          ]),
      ).toThrow(AccountingEventMapperCollisionError);
      expect(
        () =>
          new AccountingSyncService(postingService, [
            { unitId: 'unit-1', mapper: mapperA },
            { unitId: 'unit-1', mapper: mapperB },
          ]),
      ).toThrow(expect.objectContaining({ errorCode: 'ACCOUNTING_EVENT_MAPPER_COLLISION' }));
    });

    it('two registrations of DIFFERENT unitIds with the SAME sourceType coexist — each event routes to its OWN unit mapper, no overwrite', async () => {
      const postEntry = jest.fn(okEntry);
      const postingService = { postEntry } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
      const mapperA = markedMapper('salon.sale.finalized', 'unit-a-marker');
      const mapperB = markedMapper('salon.sale.finalized', 'unit-b-marker');
      const svc = new AccountingSyncService(
        postingService,
        [
          { unitId: 'unit-a', mapper: mapperA },
          { unitId: 'unit-b', mapper: mapperB },
        ],
        { maxAttempts: 3, retryDelayMs: 0 },
      );

      await svc.sync({ ...scope, unitId: 'unit-a' }, { ...finalizedEvent, unitId: 'unit-a' });
      await svc.sync({ ...scope, unitId: 'unit-b' }, { ...finalizedEvent, unitId: 'unit-b' });

      expect(postEntry).toHaveBeenCalledTimes(2);
      expect(postEntry.mock.calls[0]![1]).toMatchObject({ marker: 'unit-a-marker' });
      expect(postEntry.mock.calls[1]![1]).toMatchObject({ marker: 'unit-b-marker' });
    });

    it('a global (unscoped) registration still matches an event of ANY unitId — backward-compatible with every pre-feeder call site', async () => {
      // Exactly today's shape: lib/factory.ts's buildSalonAccountingMappers() and every existing
      // test pass plain IAccountingEventMapper[] with no unitId — zero diff for those call sites.
      const { svc, postEntry } = buildService(jest.fn(okEntry));

      await svc.sync({ ...scope, unitId: 'unit-9' }, { ...finalizedEvent, unitId: 'unit-9' });

      expect(postEntry).toHaveBeenCalledTimes(1);
    });

    // BE-INCR-BINDING-FEEDER (Fatia B) — decisão sobre o fallback global de sync(): mantido no
    // código (ver comentário em AccountingSyncService.ts, sync()), mas provado INALCANÇÁVEL na
    // forma que AccountingBindingFeederService.buildActiveMapperRegistrations() produz em
    // produção — SÓ entradas escopadas, nunca uma mistura escopada+plain. Este teste é o artefato
    // checável dessa afirmação: uma instância construída SÓ com registros escopados nunca deixa
    // uma unidade sem binding próprio "pegar emprestado" o mapper de outra unidade.
    it('an instance built ONLY from scoped entries never falls back to a DIFFERENT unit\'s mapper — an unregistered unit fails cleanly', async () => {
      const postEntry = jest.fn(okEntry);
      const postingService = { postEntry } as unknown as ConstructorParameters<typeof AccountingSyncService>[0];
      const mapperA = markedMapper('salon.sale.finalized', 'unit-a-marker');
      // Only unit-a is registered — no plain/global entry anywhere in this array.
      const svc = new AccountingSyncService(postingService, [{ unitId: 'unit-a', mapper: mapperA }], {
        maxAttempts: 3,
        retryDelayMs: 0,
      });

      // unit-b has NO registration of its own — must fail loud, never silently reuse unit-a's mapper.
      await expect(
        svc.sync({ ...scope, unitId: 'unit-b' }, { ...finalizedEvent, unitId: 'unit-b' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(postEntry).not.toHaveBeenCalled();
    });
  });
});
