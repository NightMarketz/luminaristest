import { describe, it, expect } from 'vitest';
import { buildInventoryPurchaseHref, parseInventoryPurchaseSeed } from '../inventoryPurchaseLink';

describe('inventoryPurchaseLink — deep link Estoque → Contas a Pagar', () => {
  it('ida e volta preserva produto e quantidade', () => {
    const href = buildInventoryPurchaseHref({ productRef: 'prod 1', qty: 3 });
    expect(href.startsWith('/accounting?')).toBe(true);
    expect(parseInventoryPurchaseSeed(href.slice(href.indexOf('?')))).toEqual({ productRef: 'prod 1', qty: 3 });
  });

  it('quantidade zero, fracionária ou ausente fica de fora (o modal exige inteiro > 0)', () => {
    expect(buildInventoryPurchaseHref({ productRef: 'p', qty: 0 })).toBe('/accounting?newInventoryPayable=p');
    expect(parseInventoryPurchaseSeed('?newInventoryPayable=p&qty=2.5')).toEqual({ productRef: 'p' });
    expect(parseInventoryPurchaseSeed('?newInventoryPayable=p')).toEqual({ productRef: 'p' });
  });

  it('sem produto não há seed', () => {
    expect(parseInventoryPurchaseSeed('')).toBeNull();
    expect(parseInventoryPurchaseSeed('?newInventoryPayable=%20')).toBeNull();
  });
});
