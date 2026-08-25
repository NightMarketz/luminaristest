import type { PostEntryInput } from '../../accounting/dtos/PostingDto';
import { MAX_CENTS } from '../../accounting/models/money';
import type { AccountingEvent } from '../../accounting/sync/AccountingSyncPort';
import type { IAccountingEventMapper } from '../../accounting/sync/mappers/IAccountingEventMapper';
import { SalonPackageSoldMapper } from '../../accounting/sync/mappers/SalonPackageSoldMapper';
import { SalonSaleCogsMapper } from '../../accounting/sync/mappers/SalonSaleCogsMapper';
import { SalonSaleFinalizedMapper } from '../../accounting/sync/mappers/SalonSaleFinalizedMapper';
import { SalonSaleReturnedMapper } from '../../accounting/sync/mappers/SalonSaleReturnedMapper';
import { SalonSaleSettledMapper } from '../../accounting/sync/mappers/SalonSaleSettledMapper';
import { archetypeCatalog } from '../archetypes/catalog';
import { SALON_BINDING_V1 } from '../fixtures/salonBinding';
import { InterpretedEventMapper } from '../interpreter/InterpretedEventMapper';

/**
 * Golden test, FASE 1 (BE-INCR-BINDING-PRESS, Fase B, item 12 do BRIEF — a metade que faltava
 * depois do `goldenPhase0.test.ts`, Corpo D). Fonte: `docs/accounting/P1-DOSSIER-golden-test.md`
 * §c ("Fase 1 — depois que P1 aterrissar"), com a mesma comparação viva em runtime (não fixture
 * congelada) porque F-P1-3(a) manteve os dois lados coexistindo no código até o swap deste corpo.
 *
 * Para CADA um dos casos do corpus (os mesmos 17 literais de `goldenPhase0.test.ts` — mesmos
 * eventos, mesmos valores; o dossiê fala em prosa "15 casos", o arquivo irmão real tem 17 — ver
 * nota na asserção de contagem abaixo), gera o `PostEntryInput` de DUAS formas:
 *   1. mapper-à-mão de produção (`server/src/features/accounting/sync/mappers/*`) — a REFERÊNCIA;
 *   2. `InterpretedEventMapper` sobre o binding do salão compilado (`fixtures/salonBinding.ts`,
 *      Corpo C) + o catálogo de arquétipos em código (`archetypes/catalog.ts`, Corpo A).
 *
 * As duas saídas são serializadas pelo MESMO canonicalizador (ordem de chave fixa, `undefined`
 * sempre omitido, `.toBe` sobre STRING — nunca `.toEqual` sobre objeto) e comparadas byte a byte.
 * Se divergir: por instrução da tarefa, o mapper-à-mão É a referência — conserta-se o lado
 * `accountingBinding` (arquétipo/binding/intérprete), nunca o mapper.
 *
 * Regra dura do BRIEF: SÓ com este arquivo verde é que o item 14 (swap de `lib/factory.ts:402-408`)
 * pode acontecer.
 */

const ENTRY_KEY_ORDER = [
  'unitId',
  'date',
  'description',
  'sourceType',
  'sourceId',
  'sourceDocument',
  'auditDescription',
  'lines',
] as const;
const LINE_KEY_ORDER = ['accountCode', 'debitCents', 'creditCents', 'dimensions'] as const;
const SOURCE_DOC_KEY_ORDER = ['externalRef', 'documentDate', 'description', 'attachmentId', 'rawJson'] as const;

type Ordered = Record<string, unknown>;

function pickOrdered(obj: Record<string, unknown>, order: readonly string[]): Ordered {
  const out: Ordered = {};
  for (const key of order) {
    const value = obj[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Serializador canônico (dossiê §b) — idêntico ao de `goldenPhase0.test.ts` por construção (a
 *  mesma constante de ordem de chaves, o mesmo tratamento de `undefined`) — duplicado aqui de
 *  propósito (não importado do outro arquivo de teste): o comparador em si é parte do que este
 *  gate prova, então cada fase o materializa independentemente em vez de compartilhar um módulo
 *  que, se quebrado, quebraria os dois lados silenciosamente do mesmo jeito. */
function canonicalizePostEntryInput(input: PostEntryInput): string {
  const ordered = pickOrdered(input as unknown as Record<string, unknown>, ENTRY_KEY_ORDER);
  const sourceDocument = ordered.sourceDocument;
  if (sourceDocument && typeof sourceDocument === 'object') {
    ordered.sourceDocument = pickOrdered(sourceDocument as Record<string, unknown>, SOURCE_DOC_KEY_ORDER);
  }
  if (Array.isArray(ordered.lines)) {
    ordered.lines = (ordered.lines as Record<string, unknown>[]).map((l) => pickOrdered(l, LINE_KEY_ORDER));
  }
  return JSON.stringify(ordered);
}

// -------------------------------------------------------------------------------------------
// Corpus — MESMOS builders/literais de `goldenPhase0.test.ts` (mesma origem: os event() builders
// das suítes de mapper existentes). Duplicados aqui pela mesma razão do canonicalizador acima.
// -------------------------------------------------------------------------------------------

function finalizedEvent(over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType: 'sale.finalized',
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 1500.5,
    currency: 'BRL',
    occurredAt: '2026-06-25T00:00:00.000Z',
    label: 'Venda sale-1',
    ...over,
  };
}

function settledEvent(over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType: 'sale.settled',
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 250,
    currency: 'BRL',
    occurredAt: '2026-06-25T00:00:00.000Z',
    paymentMethod: 'Cash',
    label: 'Liquidação sale-1',
    ...over,
  };
}

function returnedEvent(over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType: 'sale.returned',
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 1500.5,
    currency: 'BRL',
    occurredAt: '2026-06-25T00:00:00.000Z',
    label: 'Devolução sale-1',
    ...over,
  };
}

function packageSoldEvent(over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType: 'sale.package.sold',
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 500,
    currency: 'BRL',
    occurredAt: '2026-06-26T00:00:00.000Z',
    label: 'Pacote pré-pago — Venda sale-1',
    ...over,
  };
}

function cogsEvent(over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType: 'sale.cogs',
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 0,
    costCents: 12345,
    currency: 'BRL',
    occurredAt: '2026-06-25T00:00:00.000Z',
    label: 'CMV Venda sale-1',
    ...over,
  };
}

// -------------------------------------------------------------------------------------------
// Lado A — mappers-à-mão de produção (a REFERÊNCIA).
// -------------------------------------------------------------------------------------------

const handMappers = {
  finalized: new SalonSaleFinalizedMapper(),
  settled: new SalonSaleSettledMapper(),
  returned: new SalonSaleReturnedMapper(),
  packageSold: new SalonPackageSoldMapper(),
  cogs: new SalonSaleCogsMapper(),
};

// -------------------------------------------------------------------------------------------
// Lado B — InterpretedEventMapper sobre o binding do salão + catálogo de arquétipos. A resolução
// `eventKey → EventBinding` / `archetypeKey → Archetype` é a mesma fiação que a Fase B (item 14 do
// BRIEF) vai instanciar em `lib/factory.ts` — replicada aqui, minimalmente, só para o golden (o
// factory real é tocado separadamente, gated no verde deste arquivo).
// -------------------------------------------------------------------------------------------

function buildInterpreterFor(eventKey: string): IAccountingEventMapper {
  const binding = SALON_BINDING_V1.eventBindings.find((b) => b.eventKey === eventKey);
  if (!binding) {
    throw new Error(`Binding do salão não tem eventBinding para '${eventKey}' — fixture incompleta.`);
  }
  const archetype = archetypeCatalog.get(binding.archetypeKey);
  if (!archetype) {
    throw new Error(`Catálogo de arquétipos não conhece a chave '${binding.archetypeKey}'.`);
  }
  return new InterpretedEventMapper(archetype, binding);
}

const interpreters = {
  finalized: buildInterpreterFor('sale.finalized'),
  settled: buildInterpreterFor('sale.settled'),
  returned: buildInterpreterFor('sale.returned'),
  packageSold: buildInterpreterFor('sale.package.sold'),
  cogs: buildInterpreterFor('sale.cogs'),
};

// -------------------------------------------------------------------------------------------
// Corpus — os MESMOS 17 casos de `goldenPhase0.test.ts` (mesma cobertura do dossiê §c: 8 do
// `finalized`, incluindo os 7 de split, 1 base em cada um dos outros 3 mappers de linha única, e
// 5 do `settled` — matriz D1-QMAP por `paymentMethod`).
// -------------------------------------------------------------------------------------------

const CASES: ReadonlyArray<{ name: string; event: AccountingEvent; hand: IAccountingEventMapper; interpreter: IAccountingEventMapper }> = [
  // --- reconhecimento-receita ---
  { name: 'finalized: sem breakdown', event: finalizedEvent({ amount: 200 }), hand: handMappers.finalized, interpreter: interpreters.finalized },
  {
    name: 'finalized: split misto 100/100',
    event: finalizedEvent({ amount: 200, revenueByNature: { serviceReais: 100, productReais: 100 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: rateio de desconto de header (180 sobre itens 100+100)',
    event: finalizedEvent({ amount: 180, revenueByNature: { serviceReais: 100, productReais: 100 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: resíduo de arredondamento 1:2 sobre 10001¢',
    event: finalizedEvent({ amount: 100.01, revenueByNature: { serviceReais: 1, productReais: 2 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: só-serviço (sem linha 3.3 zerada)',
    event: finalizedEvent({ amount: 150, revenueByNature: { serviceReais: 150, productReais: 0 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: só-produto (sem linha 3.1 zerada)',
    event: finalizedEvent({ amount: 150, revenueByNature: { serviceReais: 0, productReais: 150 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: idempotência preservada sob split',
    event: finalizedEvent({ sourceId: 'sale-Z', revenueByNature: { serviceReais: 10, productReais: 90 } }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },
  {
    name: 'finalized: arredondamento round-half-up no limite (0,005)',
    event: finalizedEvent({ amount: 0.005 }),
    hand: handMappers.finalized,
    interpreter: interpreters.finalized,
  },

  // --- liquidacao — matriz D1-QMAP ---
  { name: 'settled: Cash', event: settledEvent({ paymentMethod: 'Cash', amount: 200 }), hand: handMappers.settled, interpreter: interpreters.settled },
  { name: 'settled: Pix', event: settledEvent({ paymentMethod: 'Pix', amount: 200 }), hand: handMappers.settled, interpreter: interpreters.settled },
  {
    name: 'settled: Debit Card',
    event: settledEvent({ paymentMethod: 'Debit Card', amount: 200 }),
    hand: handMappers.settled,
    interpreter: interpreters.settled,
  },
  {
    name: 'settled: Credit Card',
    event: settledEvent({ paymentMethod: 'Credit Card', amount: 200 }),
    hand: handMappers.settled,
    interpreter: interpreters.settled,
  },
  {
    name: 'settled: Package Balance',
    event: settledEvent({ paymentMethod: 'Package Balance', amount: 200 }),
    hand: handMappers.settled,
    interpreter: interpreters.settled,
  },

  // --- estorno-origem (devolução) ---
  { name: 'returned: base', event: returnedEvent({ amount: 200 }), hand: handMappers.returned, interpreter: interpreters.returned },

  // --- passivo-performance ---
  { name: 'packageSold: base', event: packageSoldEvent({ amount: 200 }), hand: handMappers.packageSold, interpreter: interpreters.packageSold },

  // --- cmv ---
  { name: 'cogs: base', event: cogsEvent({ costCents: 20000 }), hand: handMappers.cogs, interpreter: interpreters.cogs },
  { name: 'cogs: fronteira MAX_CENTS', event: cogsEvent({ costCents: MAX_CENTS }), hand: handMappers.cogs, interpreter: interpreters.cogs },
];

describe('golden Fase 1 — mapper-à-mão vs. InterpretedEventMapper+binding-do-salão (pós-P1, pré-swap)', () => {
  it.each(CASES.map((c) => [c.name, c] as const))(
    '%s — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)',
    (_name, testCase) => {
      const fromHandMapper = canonicalizePostEntryInput(testCase.hand.map(testCase.event));
      const fromInterpreter = canonicalizePostEntryInput(testCase.interpreter.map(testCase.event));
      expect(fromInterpreter).toBe(fromHandMapper);
    },
  );

  it('cobre exatamente os mesmos 17 casos de goldenPhase0.test.ts (nenhum a mais/a menos sem revisão)', () => {
    // O dossiê (P1-DOSSIER-golden-test.md §c) fala em "15 casos" em prosa, mas o corpus real
    // materializado em `goldenPhase0.test.ts` (mesma origem, mesmos builders) tem 17 — 8 casos de
    // split em `finalized` (a prosa contava 7), + 5 `settled` + 1 `returned` + 1 `packageSold` + 2
    // `cogs`. Este teste ancora no número REAL do arquivo irmão, não na contagem em prosa do dossiê.
    expect(CASES).toHaveLength(17);
  });
});
