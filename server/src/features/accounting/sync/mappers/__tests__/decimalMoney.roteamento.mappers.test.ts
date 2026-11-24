import { SaleFinalizedMapper } from '../SaleFinalizedMapper';
import { SalePackageSoldMapper } from '../SalePackageSoldMapper';
import { SaleReturnedMapper } from '../SaleReturnedMapper';
import { SaleSettledMapper } from '../SaleSettledMapper';
import type { AccountingEvent } from '../../AccountingSyncPort';

/**
 * CENTAVOS-EXATOS PR-2 (BRIEF §3 itens 6 e 8) — PROVA DE ROTEAMENTO dos 4 mappers de venda (A3, a referência dos
 * `goldenPhase0/1`): o núcleo `lib/decimalMoney` é trocado aqui pelo corpo exato e cada mapper tem de segui-lo
 * (1,005 → 101; o legado daria 100). Se um mapper voltasse a `Math.round(amount*100)` por conta própria, reprovaria.
 * Que NENHUM valor muda com o modo vigente continua provado pelos pins `1,005 → 100` dos testes de cada mapper.
 */
jest.mock('../../../../../lib/decimalMoney', () => {
  const real = jest.requireActual<typeof import('../../../../../lib/decimalMoney')>('../../../../../lib/decimalMoney');
  return { ...real, roundReaisToCents: (n: number) => Number(real.reaisToCentsHalfUp(n)) };
});

function event(sourceType: string, over: Partial<AccountingEvent> = {}): AccountingEvent {
  return {
    sourceType,
    sourceId: 'sale-1',
    unitId: 'unit-1',
    amount: 1.005,
    currency: 'BRL',
    occurredAt: '2026-06-25T00:00:00.000Z',
    label: 'Venda sale-1',
    ...over,
  };
}

describe('CENTAVOS-EXATOS PR-2 — os 4 mappers seguem o núcleo', () => {
  it.each([
    ['SaleFinalized', () => new SaleFinalizedMapper().map(event('sale.finalized'))],
    ['SalePackageSold', () => new SalePackageSoldMapper().map(event('sale.package.sold'))],
    ['SaleReturned', () => new SaleReturnedMapper().map(event('sale.returned'))],
    ['SaleSettled', () => new SaleSettledMapper().map(event('sale.settled', { paymentMethod: 'Cash' }))],
  ])('%s: 1,005 reais → 101 centavos com o núcleo exato, balanceado', (_nome, mapear) => {
    const input = mapear();
    const debito = input.lines.reduce((s, l) => s + l.debitCents, 0);
    const credito = input.lines.reduce((s, l) => s + l.creditCents, 0);
    expect(debito).toBe(101);
    expect(credito).toBe(101);
  });
});
