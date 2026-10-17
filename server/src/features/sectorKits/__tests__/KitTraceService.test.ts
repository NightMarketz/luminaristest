import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { SALE_BINDING_V1 } from '../../accountingBinding/fixtures/saleBinding';
import { KitTraceService } from '../services/KitTraceService';
import { SectorKitPolicy } from '../policies/SectorKitPolicy';
import { declaredEventKeys, KIT_REGISTRY } from '../registry';
import type { JournalEntryTracePort, TracedJournalEntry } from '../services/kitTracePorts';

/** BE-INCR-KIT-SETOR PR-6 — rastro (item 50) e registro de eventos de negócio (item 47). */
const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };
const entries = (e: TracedJournalEntry | null): JournalEntryTracePort => ({ findBySource: jest.fn(async () => e) });
const bindingRow = { id: 'b-3', bindingVersion: 3, payload: JSON.stringify(SALE_BINDING_V1) };

describe('KitTraceService (item 50)', () => {
  it('lançamento com binding gravado ⇒ evento, arquétipo da linha do binding, versão gravada', async () => {
    const findById = jest.fn(async () => bindingRow as never);
    const svc = new KitTraceService(new SectorKitPolicy(), entries({ id: 'je-1', sourceType: 'sale.settled', bindingId: 'b-3', bindingVersion: 3 }), { findById });
    await expect(svc.trace(scope, 'sale.settled', 's-1')).resolves.toEqual({
      eventKey: 'sale.settled',
      archetypeKey: 'settlement',
      bindingVersion: 3,
      journalEntryId: 'je-1',
    });
    expect(findById).toHaveBeenCalledWith(scope, 'b-3');
  });

  it('lançamento sem binding ⇒ arquétipo e versão null, sem ler binding', async () => {
    const findById = jest.fn();
    const svc = new KitTraceService(new SectorKitPolicy(), entries({ id: 'je-2', sourceType: 'manual', bindingId: null, bindingVersion: null }), { findById });
    await expect(svc.trace(scope, 'manual', 'm')).resolves.toEqual({ eventKey: 'manual', archetypeKey: null, bindingVersion: null, journalEntryId: 'je-2' });
    expect(findById).not.toHaveBeenCalled();
  });

  it('nenhum lançamento ⇒ NotFoundError; sem ator ⇒ ForbiddenError antes de ler', async () => {
    const port = entries(null);
    const svc = new KitTraceService(new SectorKitPolicy(), port, { findById: jest.fn() });
    await expect(svc.trace(scope, 'sale.finalized', 'x')).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.trace({ ...scope, actorUserId: '' }, 'sale.finalized', 'x')).rejects.toBeInstanceOf(ForbiddenError);
    expect(port.findBySource).toHaveBeenCalledTimes(1);
  });
});

describe('declaredEventKeys (item 47)', () => {
  it('é a união das chaves do operationalSchema de todos os kits publicados', () => {
    const keys = declaredEventKeys();
    for (const versions of Object.values(KIT_REGISTRY)) {
      for (const kit of versions) for (const k of Object.keys(kit.operationalSchema)) expect(keys.has(k)).toBe(true);
    }
    expect(keys.has('sale.finalized')).toBe(true);
    expect(keys.has('crm.opportunity.won')).toBe(false);
  });
});
