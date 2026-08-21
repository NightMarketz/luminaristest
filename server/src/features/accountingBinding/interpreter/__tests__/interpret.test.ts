import { ValidationError } from '../../../../lib/errors';
import { MAX_CENTS } from '../../../accounting/models/money';
import { revenueRecognitionArchetype } from '../../archetypes/RevenueRecognitionArchetype';
import { settlementArchetype } from '../../archetypes/SettlementArchetype';
import { reversalArchetype } from '../../archetypes/ReversalArchetype';
import { performanceLiabilityArchetype } from '../../archetypes/PerformanceLiabilityArchetype';
import { cogsArchetype } from '../../archetypes/CogsArchetype';
import { subledgerCreateReceivableArchetype } from '../../archetypes/SubledgerCreateReceivableArchetype';
import type { EventBinding } from '../../dtos/AccountingBindingDto';
import type { LancamentoArchetype } from '../../models/types';
import { SALON_BINDING_V1 } from '../../fixtures/salonBinding';
import type { AccountingEventLike } from '../interpret';
import { interpret, isSubledgerCommand } from '../interpret';

/**
 * `interpret()` (BE-INCR-BINDING-PRESS, Corpo D, item 11 do BRIEF) — exercitado contra os
 * arquétipos REAIS do Corpo A (`archetypes/*.ts`) e o binding REAL do salão (`fixtures/salonBinding.ts`,
 * Corpo C), não fixtures inventadas por este corpo. Isto é uma prévia de integração (não substitui a
 * Fase 1 do golden, que é da Fase B): compara `interpret()` byte-a-byte, campo a campo, contra os
 * mesmos números que `goldenPhase0.test.ts` já congelou como saída dos mappers-à-mão — se
 * `interpret()` divergir do que os mappers produzem hoje, um destes testes cai ANTES do swap.
 */

function eventBindingFor(eventKey: string): EventBinding {
  const found = SALON_BINDING_V1.eventBindings.find((eb) => eb.eventKey === eventKey);
  if (!found) throw new Error(`fixture do salão sem eventBinding para '${eventKey}'`);
  return found;
}

const baseEvent = {
  sourceId: 'sale-1',
  unitId: 'unit-1',
  currency: 'BRL',
  occurredAt: '2026-06-25T00:00:00.000Z',
  label: 'Venda sale-1',
};

// -----------------------------------------------------------------------------------------------
// reconhecimento-receita — mesma matemática de SalonSaleFinalizedMapper (goldenPhase0.test.ts)
// -----------------------------------------------------------------------------------------------
describe('interpret — revenue_recognition (arquétipo + binding REAIS)', () => {
  const binding = eventBindingFor('salon.sale.finalized');

  it('sem breakdown: débito 1.1.2 / crédito único 3.1 — bate o golden Fase 0', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.finalized', amount: 200 };
    const result = interpret({ archetype: revenueRecognitionArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '1.1.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '3.1', debitCents: 0, creditCents: 20000 },
    ]);
  });

  it('split misto 100/100 sobre total 200 — bate o golden Fase 0', () => {
    const event: AccountingEventLike = {
      ...baseEvent,
      sourceType: 'salon.sale.finalized',
      amount: 200,
      revenueByNature: { serviceReais: 100, productReais: 100 },
    };
    const result = interpret({ archetype: revenueRecognitionArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '1.1.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '3.1', debitCents: 0, creditCents: 10000 },
      { accountCode: '3.3', debitCents: 0, creditCents: 10000 },
    ]);
  });

  it('resíduo de arredondamento 1:2 sobre 10001¢ — bate o golden Fase 0', () => {
    const event: AccountingEventLike = {
      ...baseEvent,
      sourceType: 'salon.sale.finalized',
      amount: 100.01,
      revenueByNature: { serviceReais: 1, productReais: 2 },
    };
    const result = interpret({ archetype: revenueRecognitionArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '1.1.2', debitCents: 10001, creditCents: 0 },
      { accountCode: '3.1', debitCents: 0, creditCents: 3334 },
      { accountCode: '3.3', debitCents: 0, creditCents: 6667 },
    ]);
  });

  it('só-serviço: nenhuma linha 3.3 zerada é emitida', () => {
    const event: AccountingEventLike = {
      ...baseEvent,
      sourceType: 'salon.sale.finalized',
      amount: 150,
      revenueByNature: { serviceReais: 150, productReais: 0 },
    };
    const result = interpret({ archetype: revenueRecognitionArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines.some((l) => l.accountCode === '3.3')).toBe(false);
  });

  it('sourceType/sourceId/unitId/date/description — passthrough byte-idêntico (emenda 5)', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.finalized', sourceId: 'sale-Z', amount: 200 };
    const result = interpret({ archetype: revenueRecognitionArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.sourceType).toBe('salon.sale.finalized');
    expect(result.sourceId).toBe('sale-Z');
    expect(result.unitId).toBe('unit-1');
    expect(result.date).toBe('2026-06-25T00:00:00.000Z');
  });

  it('rejeita amount inválido (NaN)', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.finalized', amount: NaN };
    expect(() => interpret({ archetype: revenueRecognitionArchetype, binding, event })).toThrow(ValidationError);
  });

  it('sem fieldSlot para o slot opcional de dimensão: NÃO trava (emenda 2)', () => {
    // A fixture real do salão não mapeia `dimension` para nenhum eventKey — exatamente o caso que a
    // emenda 2 exige não travar.
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.finalized', amount: 200 };
    expect(() => interpret({ archetype: revenueRecognitionArchetype, binding, event })).not.toThrow();
  });
});

// -----------------------------------------------------------------------------------------------
// liquidacao (settlement) — matriz D1-QMAP + guard Package Balance
// -----------------------------------------------------------------------------------------------
describe('interpret — settlement (arquétipo + binding REAIS)', () => {
  const binding = eventBindingFor('salon.sale.settled');

  it.each([
    ['Cash', '1.1.3'],
    ['Pix', '1.1.1'],
    ['Debit Card', '1.1.4'],
    ['Credit Card', '1.1.4'],
    ['Package Balance', '2.1.1'],
  ])('%s → débito %s, crédito sempre 1.1.2 — bate o golden Fase 0', (method, debitCode) => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.settled', amount: 200, paymentMethod: method };
    const result = interpret({ archetype: settlementArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: debitCode, debitCents: 20000, creditCents: 0 },
      { accountCode: '1.1.2', debitCents: 0, creditCents: 20000 },
    ]);
  });

  it('Package Balance: o binding real não declara passivo-adiantamento — guard não trava (gap registrado)', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.settled', amount: 200, paymentMethod: 'Package Balance' };
    expect(() => interpret({ archetype: settlementArchetype, binding, event })).not.toThrow();
  });

  it('Package Balance guard: falha alto quando um binding declara passivo-adiantamento inconsistente', () => {
    const brokenBinding: EventBinding = {
      ...binding,
      roleSlots: [...binding.roleSlots, { role: 'passivo-adiantamento', accountCode: '9.9.9' }],
    };
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.settled', amount: 200, paymentMethod: 'Package Balance' };
    expect(() => interpret({ archetype: settlementArchetype, binding: brokenBinding, event })).toThrow(
      /blocked_missing_prepaid_liability_account/,
    );
  });

  it('rejeita paymentMethod desconhecido sem default silencioso', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.settled', amount: 200, paymentMethod: 'Boleto' };
    expect(() => interpret({ archetype: settlementArchetype, binding, event })).toThrow(ValidationError);
  });
});

// -----------------------------------------------------------------------------------------------
// estorno-origem (reversal) — bate o golden Fase 0
// -----------------------------------------------------------------------------------------------
describe('interpret — reversal (arquétipo + binding REAIS)', () => {
  it('débito 3.2 / crédito 1.1.2 — bate o golden Fase 0', () => {
    const binding = eventBindingFor('salon.sale.returned');
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.returned', amount: 200 };
    const result = interpret({ archetype: reversalArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '3.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '1.1.2', debitCents: 0, creditCents: 20000 },
    ]);
  });
});

// -----------------------------------------------------------------------------------------------
// passivo-performance — bate o golden Fase 0
// -----------------------------------------------------------------------------------------------
describe('interpret — performance_liability (arquétipo + binding REAIS)', () => {
  it('débito 1.1.2 / crédito 2.1.1 — bate o golden Fase 0', () => {
    const binding = eventBindingFor('salon.package.sold');
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.package.sold', amount: 200 };
    const result = interpret({ archetype: performanceLiabilityArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '1.1.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '2.1.1', debitCents: 0, creditCents: 20000 },
    ]);
  });
});

// -----------------------------------------------------------------------------------------------
// cmv (moneyCentsExact) — bate o golden Fase 0
// -----------------------------------------------------------------------------------------------
describe('interpret — cogs (arquétipo + binding REAIS)', () => {
  const binding = eventBindingFor('salon.sale.cogs');

  it('lê costCents diretamente, sem Math.round — bate o golden Fase 0', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.cogs', amount: 0, costCents: 20000 };
    const result = interpret({ archetype: cogsArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '4.2', debitCents: 20000, creditCents: 0 },
      { accountCode: '1.1.6', debitCents: 0, creditCents: 20000 },
    ]);
  });

  it('fronteira MAX_CENTS: aceita exatamente o teto — bate o golden Fase 0', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.cogs', amount: 0, costCents: MAX_CENTS };
    const result = interpret({ archetype: cogsArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines[0].debitCents).toBe(MAX_CENTS);
  });

  it('rejeita costCents float não-inteiro', () => {
    const event: AccountingEventLike = { ...baseEvent, sourceType: 'salon.sale.cogs', amount: 0, costCents: 123.45 };
    expect(() => interpret({ archetype: cogsArchetype, binding, event })).toThrow(ValidationError);
  });
});

// -----------------------------------------------------------------------------------------------
// Dispatch por kind — classe 2 (createSubledgerRecord), arquétipo REAL
// -----------------------------------------------------------------------------------------------
describe('interpret — dispatch por kind (subledgerCreateReceivableArchetype REAL)', () => {
  // A fixture do salão (Corpo C) não cobre a classe 2 (fora do escopo v1 do binding do salão — ver
  // fixtures/salonBinding.ts, header) — este binding é construído aqui só para exercitar o dispatch.
  const binding: EventBinding = {
    eventKey: 'crm.opportunity.won',
    archetypeKey: 'subledger_command',
    fieldSlots: [
      { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
      { slotName: 'label', sourceField: 'event.label', transform: 'identity' },
    ],
    roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.5' }],
  };

  it('produz um SubledgerCommand, NUNCA um PostEntryInput', () => {
    const event = {
      ...baseEvent,
      sourceType: 'crm.opportunity.won',
      amount: 300,
    } as unknown as AccountingEventLike;
    const result = interpret({ archetype: subledgerCreateReceivableArchetype, binding, event });
    expect(isSubledgerCommand(result)).toBe(true);
    if (!isSubledgerCommand(result)) throw new Error('esperava SubledgerCommand');
    expect(result.targetSubledger).toBe('receivable');
    // O arquétipo real não declara um slot 'documentNumber' — o intérprete cai no fallback
    // (event.sourceId) documentado em interpret.ts.
    expect(result.idempotencyKey).toBe('sale-1');
    expect(result.fields.amount).toBe(30000);
  });
});

// -----------------------------------------------------------------------------------------------
// Correção do review independente (achado 1): omissão de linha `optional` num grupo de tamanho 1
// NUNCA pode olhar o VALOR do evento (invariante 5 — "pular uma perna olhando um campo do evento" é
// o padrão PROIBIDO, P1-DOSSIER-interprete.md §a). Nenhum arquétipo REAL do Corpo A hoje cai neste
// caminho (o único `optional: true` real, `RevenueRecognitionArchetype.ts:63`, está sempre num grupo
// de tamanho 2, roteado para `buildRevenueSplitLines`) — este arquétipo é construído aqui só para
// exercitar o branch genérico de `buildSideLines`, que é infraestrutura consumida por arquétipos
// futuros do BRIEF.
// -----------------------------------------------------------------------------------------------
describe('interpret — linha optional em grupo de tamanho 1 (omissão nunca por valor do evento)', () => {
  const soleOptionalLineArchetype: LancamentoArchetype = {
    kind: 'postEntry',
    name: 'teste-linha-optional-solitaria',
    sourceType: 'test.sole.optional',
    slots: [
      { name: 'amount', type: 'moneyReais', guards: [] },
      { name: 'extra', type: 'string', guards: [] },
    ],
    lines: [
      { role: 'controle-recebível', side: 'debit', amountSlot: 'amount' },
      { role: 'receita-revenda', side: 'credit', amountSlot: 'extra', optional: true },
    ],
    invariants: [],
  };

  const roleSlots: EventBinding['roleSlots'] = [
    { role: 'controle-recebível', accountCode: '1.1.2' },
    { role: 'receita-revenda', accountCode: '3.3' },
  ];

  it('binding NÃO mapeia fieldSlot pro slot da linha optional: a linha é omitida (decisão do binding, não do evento)', () => {
    const binding: EventBinding = {
      eventKey: 'test.sole.optional',
      archetypeKey: 'revenue_recognition',
      fieldSlots: [{ slotName: 'amount', sourceField: 'event.amount', transform: 'identity' }],
      roleSlots,
    };
    const event = { ...baseEvent, sourceType: 'test.sole.optional', amount: 200 } as unknown as AccountingEventLike;
    const result = interpret({ archetype: soleOptionalLineArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([{ accountCode: '1.1.2', debitCents: 200, creditCents: 0 }]);
  });

  it('binding MAPEIA o fieldSlot e o evento resolve a 0: a linha É emitida (antes desaparecia em silêncio — bug do achado 1)', () => {
    const binding: EventBinding = {
      eventKey: 'test.sole.optional',
      archetypeKey: 'revenue_recognition',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'identity' },
        { slotName: 'extra', sourceField: 'event.extraField', transform: 'identity' },
      ],
      roleSlots,
    };
    // `extra` é declarado `type: 'string'` no arquétipo, mas o valor bruto do evento é o número 0 —
    // exatamente o caso adversarial do achado 1 (slot não-monetário resolvendo a 0 não pode apagar
    // a perna).
    const event = { ...baseEvent, sourceType: 'test.sole.optional', amount: 200, extraField: 0 } as unknown as AccountingEventLike;
    const result = interpret({ archetype: soleOptionalLineArchetype, binding, event });
    if (isSubledgerCommand(result)) throw new Error('esperava PostEntryInput');
    expect(result.lines).toEqual([
      { accountCode: '1.1.2', debitCents: 200, creditCents: 0 },
      { accountCode: '3.3', debitCents: 0, creditCents: 0 },
    ]);
  });
});
