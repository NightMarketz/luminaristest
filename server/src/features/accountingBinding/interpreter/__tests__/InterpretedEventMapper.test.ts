import { cogsArchetype } from '../../archetypes/CogsArchetype';
import { subledgerCreateReceivableArchetype } from '../../archetypes/SubledgerCreateReceivableArchetype';
import type { EventBinding } from '../../dtos/AccountingBindingDto';
import { SALON_BINDING_V1 } from '../../fixtures/salonBinding';
import type { AccountingEventLike } from '../interpret';
import { InterpretedEventMapper } from '../InterpretedEventMapper';

/**
 * `InterpretedEventMapper` (BE-INCR-BINDING-PRESS, Corpo D, item 11 do BRIEF) — adaptador fino
 * `IAccountingEventMapper`, exercitado contra o arquétipo REAL (`CogsArchetype`, Corpo A) e o
 * binding REAL do salão (`fixtures/salonBinding.ts`, Corpo C). Verifica o que o dossiê §b promete:
 * `sourceType` vem do `binding.eventKey`, `map()` delega a `interpret()`, e a fiação errada
 * (arquétipo classe 2) falha na CONSTRUÇÃO, não no runtime de um evento.
 */
const cogsBinding = SALON_BINDING_V1.eventBindings.find((eb) => eb.eventKey === 'salon.sale.cogs')!;

describe('InterpretedEventMapper', () => {
  it('sourceType vem de binding.eventKey — a mesma chave de registro do AccountingSyncService', () => {
    const mapper = new InterpretedEventMapper(cogsArchetype, cogsBinding);
    expect(mapper.sourceType).toBe('salon.sale.cogs');
  });

  it('map() delega a interpret() e devolve um PostEntryInput byte-idêntico ao SalonSaleCogsMapper', () => {
    const mapper = new InterpretedEventMapper(cogsArchetype, cogsBinding);
    const event: AccountingEventLike = {
      sourceType: 'salon.sale.cogs',
      sourceId: 'sale-1',
      unitId: 'unit-1',
      amount: 0,
      costCents: 20000,
      currency: 'BRL',
      occurredAt: '2026-06-25T00:00:00.000Z',
      label: 'CMV Venda sale-1',
    };
    const input = mapper.map(event);
    expect(input.lines).toEqual([
      { accountCode: '4.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '1.1.6', debitCents: 0, creditCents: 20000 },
    ]);
    expect(input.sourceType).toBe('salon.sale.cogs');
    expect(input.sourceId).toBe('sale-1');
  });

  it('recusa um arquétipo classe 2 NA CONSTRUÇÃO (erro de fiação, não de evento)', () => {
    const fakeSubledgerBinding: EventBinding = {
      eventKey: 'crm.opportunity.won',
      archetypeKey: 'subledger_command',
      fieldSlots: [{ slotName: 'label', sourceField: 'event.label', transform: 'identity' }],
      roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.5' }],
    };
    expect(() => new InterpretedEventMapper(subledgerCreateReceivableArchetype, fakeSubledgerBinding)).toThrow(
      /InterpretedEventMapper só serve arquétipos 'postEntry'/,
    );
  });
});
