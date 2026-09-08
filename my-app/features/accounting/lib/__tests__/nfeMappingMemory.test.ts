import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NFE_MAPPING_MEMORY_KEY,
  forgetNfeMapping,
  recallNfeMappings,
  rememberNfeMappings,
} from '../nfeMappingMemory';

/** FE-INCR-NFE V9 (F-FENFE-4 → c): per-browser memory of (emitter, cProd) → productRef; never throws. */
describe('nfeMappingMemory', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('round-trip: remember → recall → forget (per emitter, merged)', () => {
    rememberNfeMappings('12345678000195', [{ cProd: 'A', productRef: 'prod-a' }]);
    rememberNfeMappings('12345678000195', [{ cProd: 'B', productRef: 'prod-b' }]);
    rememberNfeMappings('98765432000198', [{ cProd: 'A', productRef: 'prod-other' }]);
    expect(recallNfeMappings('12345678000195')).toEqual({ A: 'prod-a', B: 'prod-b' });
    expect(recallNfeMappings('98765432000198')).toEqual({ A: 'prod-other' });
    forgetNfeMapping('12345678000195', 'A');
    expect(recallNfeMappings('12345678000195')).toEqual({ B: 'prod-b' });
    expect(recallNfeMappings('')).toEqual({});
    expect(recallNfeMappings('unknown')).toEqual({});
  });

  it('corrupt JSON in storage reads as empty and is overwritten on the next remember', () => {
    window.localStorage.setItem(NFE_MAPPING_MEMORY_KEY, '{not json');
    expect(recallNfeMappings('x')).toEqual({});
    rememberNfeMappings('x', [{ cProd: 'A', productRef: 'p' }]);
    expect(recallNfeMappings('x')).toEqual({ A: 'p' });
  });

  it('a throwing localStorage never propagates (private window / blocked storage)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => rememberNfeMappings('x', [{ cProd: 'A', productRef: 'p' }])).not.toThrow();
    expect(recallNfeMappings('x')).toEqual({});
    expect(() => forgetNfeMapping('x', 'A')).not.toThrow();
  });
});
