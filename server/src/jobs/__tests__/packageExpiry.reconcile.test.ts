/**
 * BE-INCR-PACOTE-VALIDADE — passes puros de vencimento (itens 9, 11, 14, 14a, 15 e §5.2 item 9.5).
 * Colaboradores injetados (o cabeamento real é exercitado pelo tie-out de integração, item 17).
 */
import {
  reconcilePackageExpiry,
  reconcileSalePackageExpiryPosting,
  type PackageExpiryCandidate,
  type PackageExpiryReconcileDeps,
  type PackageExpiryPostingReconcileDeps,
} from '../accountingSyncReconcile.job';
import type { AccountingEvent } from '../../features/accounting/sync/AccountingSyncPort';
import { AccountingPeriodNotOpenError, PackageExpiryNfsePendingError } from '../../lib/errors';

const candidate: PackageExpiryCandidate = {
  ownerUserId: 'owner-1',
  unitId: 'unit-1',
  balanceId: 'bal-1',
  customerId: 'cust-1',
  packageId: 'pkg-1',
  expiresOn: '2026-03-31',
};
const KEY = 'expiry:bal-1:2026-03-31';

function deps(over: Partial<PackageExpiryReconcileDeps> = {}): PackageExpiryReconcileDeps {
  return {
    listCandidates: jest.fn(async () => [candidate]),
    today: jest.fn(() => '2026-04-02'),
    findPendingConsumption: jest.fn(async () => null),
    findReversedOrigin: jest.fn(async () => null),
    hasMapper: jest.fn(() => true),
    isPeriodOpen: jest.fn(async () => true),
    expireDue: jest.fn(async () => ({ movementKey: KEY, amountCents: 7000, expiresOn: '2026-03-31' })),
    nextMovementKey: jest.fn(async () => KEY),
    sync: jest.fn(async () => ({ entryId: 'je-1' })),
    emitExpiryNfse: jest.fn(async () => 'not_applicable' as const),
    reportPending: jest.fn(async () => undefined),
    reportResolved: jest.fn(async () => undefined),
    ...over,
  };
}

const pendingCode = (d: { reportPending?: unknown }) =>
  ((d.reportPending as jest.Mock).mock.calls[0]?.[0] as { reasonCode?: string; sourceType?: string; sourceId?: string } | undefined);

describe('reconcilePackageExpiry (item 14)', () => {
  it('carência: em expiresOn + 1 o saldo nem entra na contagem', async () => {
    const d = deps({ today: jest.fn(() => '2026-04-01') });
    const s = await reconcilePackageExpiry(d);
    expect(s.total).toBe(0);
    expect(d.expireDue).not.toHaveBeenCalled();
  });

  it('vence em expiresOn + 2: guardas → expireDue → lançamento (D 2.1.1 / C 3.4 em expiresOn+1) → NFS-e → resolvido', async () => {
    const d = deps();
    const s = await reconcilePackageExpiry(d);
    expect(d.expireDue).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 'owner-1', unitId: 'unit-1' }), 'bal-1', '2026-04-02');
    const event = (d.sync as jest.Mock).mock.calls[0][1] as AccountingEvent;
    expect(event).toMatchObject({
      sourceType: 'sale.package.expired',
      sourceId: KEY,
      unitId: 'unit-1',
      releasedCents: 7000,
      amount: 0,
      occurredAt: '2026-04-01', // F-PV-5 a
    });
    expect(d.emitExpiryNfse).toHaveBeenCalledWith(expect.anything(), KEY);
    expect((d.sync as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((d.emitExpiryNfse as jest.Mock).mock.invocationCallOrder[0]);
    expect(s).toMatchObject({ total: 1, synced: 1, failed: 0, blocked: 0 });
    expect(d.reportResolved).toHaveBeenCalledWith({ ownerUserId: 'owner-1', unitId: 'unit-1', sourceType: 'sale.package.expired', sourceId: KEY });
  });

  it.each([
    ['9.1 consumo pendente', { findPendingConsumption: jest.fn(async () => 'sale-consumo') }, 'PACKAGE_CONSUMPTION_PENDING'],
    ['9.2 origem estornada', { findReversedOrigin: jest.fn(async () => 'sale-origem') }, 'PACKAGE_ORIGIN_REVERSED'],
    ['9.3 sem mapper', { hasMapper: jest.fn(() => false) }, 'NO_MAPPER_FOR_UNIT'],
    ['9.4 período fechado', { isPeriodOpen: jest.fn(async () => false) }, 'ACCOUNTING_PERIOD_NOT_OPEN'],
  ] as const)('guarda %s → BLOCKED com código próprio, ANTES do efeito irreversível', async (_l, over, code) => {
    const d = deps(over as Partial<PackageExpiryReconcileDeps>);
    const s = await reconcilePackageExpiry(d);
    expect(d.expireDue).not.toHaveBeenCalled();
    expect(d.sync).not.toHaveBeenCalled();
    expect(s).toMatchObject({ blocked: 1, failed: 0, synced: 0 });
    expect(pendingCode(d)).toMatchObject({ reasonCode: code, sourceType: 'sale.package.expired', sourceId: KEY });
  });

  it('as guardas rodam na ordem do BRIEF: consumo pendente vence a origem estornada', async () => {
    const d = deps({ findPendingConsumption: jest.fn(async () => 's1'), findReversedOrigin: jest.fn(async () => 's2') });
    await reconcilePackageExpiry(d);
    expect(pendingCode(d)?.reasonCode).toBe('PACKAGE_CONSUMPTION_PENDING');
    expect(d.findReversedOrigin).not.toHaveBeenCalled();
  });

  it('9.4 confere o período da COMPETÊNCIA (expiresOn + 1), não o de hoje', async () => {
    const d = deps({ listCandidates: jest.fn(async () => [{ ...candidate, expiresOn: '2026-12-31' }]), today: jest.fn(() => '2027-01-05') });
    await reconcilePackageExpiry(d);
    expect(d.isPeriodOpen).toHaveBeenCalledWith(expect.anything(), '2027-01-01');
  });

  it('residual TOCTOU: o período fecha entre a guarda e o commit → movimento fica, item BLOCKED, sem NFS-e', async () => {
    const d = deps({ sync: jest.fn(async () => { throw new AccountingPeriodNotOpenError(2026, 4); }) });
    const s = await reconcilePackageExpiry(d);
    expect(d.expireDue).toHaveBeenCalled();
    expect(d.emitExpiryNfse).not.toHaveBeenCalled();
    expect(s.blocked).toBe(1);
    expect(pendingCode(d)?.reasonCode).toBe('ACCOUNTING_PERIOD_NOT_OPEN');
  });

  it('9.5: faltante da NFS-e → PACKAGE_EXPIRY_NFSE_PENDING; o vencimento e o lançamento FICAM', async () => {
    const d = deps({ emitExpiryNfse: jest.fn(async () => { throw new PackageExpiryNfsePendingError(KEY, ["cliente 'cust-1': taxId ausente"]); }) });
    const s = await reconcilePackageExpiry(d);
    expect(d.expireDue).toHaveBeenCalled();
    expect(d.sync).toHaveBeenCalled();
    expect(s.blocked).toBe(1);
    expect(pendingCode(d)?.reasonCode).toBe('PACKAGE_EXPIRY_NFSE_PENDING');
    expect(d.reportResolved).not.toHaveBeenCalled();
  });

  it('erro não classificado → FAILED (nunca skip por classe base) e o lote continua', async () => {
    const other = { ...candidate, balanceId: 'bal-2' };
    const d = deps({
      listCandidates: jest.fn(async () => [candidate, other]),
      expireDue: jest
        .fn()
        .mockRejectedValueOnce(new Error('disk'))
        .mockResolvedValueOnce({ movementKey: 'expiry:bal-2:2026-03-31', amountCents: 100, expiresOn: '2026-03-31' }),
    });
    const s = await reconcilePackageExpiry(d);
    expect(s).toMatchObject({ failed: 1, synced: 1 });
    expect(pendingCode(d)?.reasonCode).toBe('FAILED');
  });

  it('review #483 achado 3: 2º vencimento na mesma data — guarda pendura sob a chave :2, e o lançamento usa a chave que a tx gravou', async () => {
    const KEY2 = `${KEY}:2`;
    const blocked = deps({ nextMovementKey: jest.fn(async () => KEY2), hasMapper: jest.fn(() => false) });
    await reconcilePackageExpiry(blocked);
    expect(pendingCode(blocked)?.sourceId).toBe(KEY2); // não reusa a linha do 1º vencimento (já resolvido)

    const ok = deps({
      nextMovementKey: jest.fn(async () => KEY2),
      expireDue: jest.fn(async () => ({ movementKey: KEY2, amountCents: 500, expiresOn: '2026-03-31' })),
    });
    await reconcilePackageExpiry(ok);
    expect(((ok.sync as jest.Mock).mock.calls[0][1] as AccountingEvent).sourceId).toBe(KEY2);
    expect(ok.reportResolved).toHaveBeenCalledWith(expect.objectContaining({ sourceId: KEY2 }));
  });

  it('expireDue null (já vencido por outra rodada) → idempotent hit, sem lançamento', async () => {
    const d = deps({ expireDue: jest.fn(async () => null) });
    const s = await reconcilePackageExpiry(d);
    expect(s.idempotentHits).toBe(1);
    expect(d.sync).not.toHaveBeenCalled();
  });
});

describe('reconcileSalePackageExpiryPosting (item 11 + §5.2 item 9.5)', () => {
  const pdeps = (over: Partial<PackageExpiryPostingReconcileDeps> = {}): PackageExpiryPostingReconcileDeps => ({
    listExpiryMovements: jest.fn(async () => [{ ownerUserId: 'owner-1', unitId: 'unit-1', movementKey: KEY, amountCents: 7000 }]),
    hasExistingEntry: jest.fn(async () => false),
    sync: jest.fn(async () => ({ entryId: 'je-1' })),
    emitExpiryNfse: jest.fn(async () => 'emitted' as const),
    reportPending: jest.fn(async () => undefined),
    reportResolved: jest.fn(async () => undefined),
    ...over,
  });

  it('movimento sem lançamento → posta (sourceId = chave) e emite; resolve a pendência', async () => {
    const d = pdeps();
    const s = await reconcileSalePackageExpiryPosting(d);
    expect(d.hasExistingEntry).toHaveBeenCalledWith(expect.anything(), 'sale.package.expired', KEY);
    expect(((d.sync as jest.Mock).mock.calls[0][1] as AccountingEvent)).toMatchObject({ sourceId: KEY, releasedCents: 7000, occurredAt: '2026-04-01' });
    expect(s.synced).toBe(1);
    expect(d.reportResolved).toHaveBeenCalled();
  });

  it('lançamento existente + nota já existente (ou fora de CONSUMO) → no-op silencioso', async () => {
    for (const outcome of ['exists', 'not_applicable'] as const) {
      const d = pdeps({ hasExistingEntry: jest.fn(async () => true), emitExpiryNfse: jest.fn(async () => outcome) });
      const s = await reconcileSalePackageExpiryPosting(d);
      expect(d.sync).not.toHaveBeenCalled();
      expect(s).toMatchObject({ synced: 0, idempotentHits: 1 });
    }
  });

  it('lançamento existente, nota faltando → só emite (re-drive da NFS-e)', async () => {
    const d = pdeps({ hasExistingEntry: jest.fn(async () => true) });
    const s = await reconcileSalePackageExpiryPosting(d);
    expect(d.sync).not.toHaveBeenCalled();
    expect(d.emitExpiryNfse).toHaveBeenCalledWith(expect.anything(), KEY);
    expect(s.synced).toBe(1);
  });

  it('o período reabre: o lançamento que falhou é re-dirigido; falha de novo → pendência com o código', async () => {
    const d = pdeps({ sync: jest.fn(async () => { throw new AccountingPeriodNotOpenError(2026, 4); }) });
    const s = await reconcileSalePackageExpiryPosting(d);
    expect(s.blocked).toBe(1);
    expect(pendingCode(d)).toMatchObject({ reasonCode: 'ACCOUNTING_PERIOD_NOT_OPEN', sourceId: KEY });
    expect(d.emitExpiryNfse).not.toHaveBeenCalled(); // a nota nunca sai antes do lançamento âncora
  });
});
