import type { PostEntryInput } from '../../accounting/dtos/PostingDto';
import { MAX_CENTS } from '../../accounting/models/money';
import { SalonPackageSoldMapper } from '../../accounting/sync/mappers/SalonPackageSoldMapper';
import { SalonSaleCogsMapper } from '../../accounting/sync/mappers/SalonSaleCogsMapper';
import { SalonSaleFinalizedMapper } from '../../accounting/sync/mappers/SalonSaleFinalizedMapper';
import { SalonSaleReturnedMapper } from '../../accounting/sync/mappers/SalonSaleReturnedMapper';
import { SalonSaleSettledMapper } from '../../accounting/sync/mappers/SalonSaleSettledMapper';
import type { AccountingEvent } from '../../accounting/sync/AccountingSyncPort';

/**
 * Golden test, FASE 0 (BE-INCR-BINDING-PRESS, Corpo D, item 12 do BRIEF — só a Fase 0; a Fase 1
 * — intérprete+binding-do-salão vs. mapper-à-mão — é da Fase B, gated no swap do item 14, fora
 * deste corpo). Fonte: `docs/accounting/P1-DOSSIER-golden-test.md` §b/§c.
 *
 * Congela, byte a byte, a saída canônica que os 5 mappers ATUAIS produzem para o corpus real das
 * suítes de `server/src/features/accounting/sync/mappers/__tests__/*.test.ts` — o alvo que a prensa
 * (intérprete + binding compilado do salão) terá que bater depois, ANTES do swap de `lib/factory.ts`.
 * Este teste NÃO chama `interpret()` nem `InterpretedEventMapper` — é regressão pura dos mappers de
 * hoje (dossiê §c, "Fase 0 — hoje, sem dependência do P1").
 *
 * Comparador: `.toBe` sobre a STRING serializada canônica (`canonicalizePostEntryInput`), nunca
 * `.toEqual` sobre o objeto — `toEqual` trata `chave: undefined` como equivalente a chave ausente
 * (dossiê §b item 1), o que mascararia exatamente a classe de divergência que este gate existe para
 * pegar (ex.: um binding que emita `dimensions: []` onde o mapper-à-mão simplesmente omite a chave).
 * Ordem de chaves é uma CONSTANTE deste módulo de teste, nunca `Object.keys()` (frágil a refactor de
 * construção do objeto em qualquer um dos dois lados).
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

/** Serializador canônico (dossiê §b) — ordem de chaves FIXA, `undefined` sempre omitido, sem
 *  indentação (a forma "byte" é a mais estreita). */
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
// Corpus — extraído 1:1 dos event() builders das suítes existentes (mesmos valores literais).
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

const finalizedMapper = new SalonSaleFinalizedMapper();
const settledMapper = new SalonSaleSettledMapper();
const returnedMapper = new SalonSaleReturnedMapper();
const packageSoldMapper = new SalonPackageSoldMapper();
const cogsMapper = new SalonSaleCogsMapper();

const CASES: ReadonlyArray<{ name: string; build: () => PostEntryInput }> = [
  // --- reconhecimento-receita (SalonSaleFinalizedMapper) ---
  { name: 'finalized: sem breakdown', build: () => finalizedMapper.map(finalizedEvent({ amount: 200 })) },
  {
    name: 'finalized: split misto 100/100',
    build: () =>
      finalizedMapper.map(finalizedEvent({ amount: 200, revenueByNature: { serviceReais: 100, productReais: 100 } })),
  },
  {
    name: 'finalized: rateio de desconto de header (180 sobre itens 100+100)',
    build: () =>
      finalizedMapper.map(finalizedEvent({ amount: 180, revenueByNature: { serviceReais: 100, productReais: 100 } })),
  },
  {
    name: 'finalized: resíduo de arredondamento 1:2 sobre 10001¢',
    build: () =>
      finalizedMapper.map(finalizedEvent({ amount: 100.01, revenueByNature: { serviceReais: 1, productReais: 2 } })),
  },
  {
    name: 'finalized: só-serviço (sem linha 3.3 zerada)',
    build: () =>
      finalizedMapper.map(finalizedEvent({ amount: 150, revenueByNature: { serviceReais: 150, productReais: 0 } })),
  },
  {
    name: 'finalized: só-produto (sem linha 3.1 zerada)',
    build: () =>
      finalizedMapper.map(finalizedEvent({ amount: 150, revenueByNature: { serviceReais: 0, productReais: 150 } })),
  },
  {
    name: 'finalized: idempotência preservada sob split',
    build: () =>
      finalizedMapper.map(
        finalizedEvent({ sourceId: 'sale-Z', revenueByNature: { serviceReais: 10, productReais: 90 } }),
      ),
  },
  { name: 'finalized: arredondamento round-half-up no limite (0,005)', build: () => finalizedMapper.map(finalizedEvent({ amount: 0.005 })) },

  // --- liquidacao (SalonSaleSettledMapper) — matriz D1-QMAP ---
  { name: 'settled: Cash', build: () => settledMapper.map(settledEvent({ paymentMethod: 'Cash', amount: 200 })) },
  { name: 'settled: Pix', build: () => settledMapper.map(settledEvent({ paymentMethod: 'Pix', amount: 200 })) },
  { name: 'settled: Debit Card', build: () => settledMapper.map(settledEvent({ paymentMethod: 'Debit Card', amount: 200 })) },
  { name: 'settled: Credit Card', build: () => settledMapper.map(settledEvent({ paymentMethod: 'Credit Card', amount: 200 })) },
  { name: 'settled: Package Balance', build: () => settledMapper.map(settledEvent({ paymentMethod: 'Package Balance', amount: 200 })) },

  // --- estorno-origem (SalonSaleReturnedMapper) ---
  { name: 'returned: base', build: () => returnedMapper.map(returnedEvent({ amount: 200 })) },

  // --- passivo-performance (SalonPackageSoldMapper) ---
  { name: 'packageSold: base', build: () => packageSoldMapper.map(packageSoldEvent({ amount: 200 })) },

  // --- cmv (SalonSaleCogsMapper) ---
  { name: 'cogs: base', build: () => cogsMapper.map(cogsEvent({ costCents: 20000 })) },
  { name: 'cogs: fronteira MAX_CENTS', build: () => cogsMapper.map(cogsEvent({ costCents: MAX_CENTS })) },
];

describe('golden Fase 0 — corpus canônico dos mappers-à-mão (pré-P1)', () => {
  it.each(CASES.map((c) => [c.name, c] as const))('%s — output canônico congelado', (_name, testCase) => {
    const output = canonicalizePostEntryInput(testCase.build());
    const expected = GOLDEN_FIXTURES[testCase.name];
    expect(expected).toBeDefined(); // nunca compara contra undefined silenciosamente
    expect(output).toBe(expected);
  });

  it('CASES e GOLDEN_FIXTURES têm exatamente os mesmos nomes de caso (nenhum a mais/a menos sem revisão)', () => {
    expect(CASES.map((c) => c.name).sort()).toEqual(Object.keys(GOLDEN_FIXTURES).sort());
  });
});

/**
 * Fixtures comitadas — geradas UMA VEZ a partir da saída real dos mappers atuais (verificado por
 * execução desta suíte nesta sessão) e congeladas aqui como string literal. Qualquer edição futura
 * (acidental ou não) de um dos 5 mappers que mude a saída para QUALQUER destes casos faz este teste
 * falhar — é o "andaime" que a Fase 1 (Fase B, fora deste corpo) vai comparar contra o intérprete.
 */
const GOLDEN_FIXTURES: Readonly<Record<string, string>> = {
  'finalized: sem breakdown':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":20000,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":20000}]}',
  'finalized: split misto 100/100':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":20000,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":10000},{"accountCode":"3.3","debitCents":0,"creditCents":10000}]}',
  'finalized: rateio de desconto de header (180 sobre itens 100+100)':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":18000,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":9000},{"accountCode":"3.3","debitCents":0,"creditCents":9000}]}',
  'finalized: resíduo de arredondamento 1:2 sobre 10001¢':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":10001,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":3334},{"accountCode":"3.3","debitCents":0,"creditCents":6667}]}',
  'finalized: só-serviço (sem linha 3.3 zerada)':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":15000,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":15000}]}',
  'finalized: só-produto (sem linha 3.1 zerada)':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":15000,"creditCents":0},{"accountCode":"3.3","debitCents":0,"creditCents":15000}]}',
  'finalized: idempotência preservada sob split':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-Z","sourceType":"sale.finalized","sourceId":"sale-Z","lines":[{"accountCode":"1.1.2","debitCents":150050,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":15005},{"accountCode":"3.3","debitCents":0,"creditCents":135045}]}',
  'finalized: arredondamento round-half-up no limite (0,005)':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Receita salão — Venda sale-1","sourceType":"sale.finalized","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":1,"creditCents":0},{"accountCode":"3.1","debitCents":0,"creditCents":1}]}',
  'settled: Cash':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Liquidação salão — Venda sale-1","sourceType":"sale.settled","sourceId":"sale-1","lines":[{"accountCode":"1.1.3","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'settled: Pix':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Liquidação salão — Venda sale-1","sourceType":"sale.settled","sourceId":"sale-1","lines":[{"accountCode":"1.1.1","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'settled: Debit Card':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Liquidação salão — Venda sale-1","sourceType":"sale.settled","sourceId":"sale-1","lines":[{"accountCode":"1.1.4","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'settled: Credit Card':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Liquidação salão — Venda sale-1","sourceType":"sale.settled","sourceId":"sale-1","lines":[{"accountCode":"1.1.4","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'settled: Package Balance':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Liquidação salão — Venda sale-1","sourceType":"sale.settled","sourceId":"sale-1","lines":[{"accountCode":"2.1.1","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'returned: base':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"Devolução salão — Venda sale-1","sourceType":"sale.returned","sourceId":"sale-1","lines":[{"accountCode":"3.2","debitCents":20000,"creditCents":0},{"accountCode":"1.1.2","debitCents":0,"creditCents":20000}]}',
  'packageSold: base':
    '{"unitId":"unit-1","date":"2026-06-26T00:00:00.000Z","description":"Origem de pacote pré-pago — Venda sale-1","sourceType":"sale.package.sold","sourceId":"sale-1","lines":[{"accountCode":"1.1.2","debitCents":20000,"creditCents":0},{"accountCode":"2.1.1","debitCents":0,"creditCents":20000}]}',
  'cogs: base':
    '{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"CMV salão — Venda sale-1","sourceType":"sale.cogs","sourceId":"sale-1","lines":[{"accountCode":"4.2","debitCents":20000,"creditCents":0},{"accountCode":"1.1.6","debitCents":0,"creditCents":20000}]}',
  'cogs: fronteira MAX_CENTS':
    `{"unitId":"unit-1","date":"2026-06-25T00:00:00.000Z","description":"CMV salão — Venda sale-1","sourceType":"sale.cogs","sourceId":"sale-1","lines":[{"accountCode":"4.2","debitCents":${MAX_CENTS},"creditCents":0},{"accountCode":"1.1.6","debitCents":0,"creditCents":${MAX_CENTS}}]}`,
};
