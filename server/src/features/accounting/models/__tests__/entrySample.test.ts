/**
 * sampleEntries — amostragem determinística de lançamentos por conta (C6b PR-2 Passo 9,
 * F-C6b-8 a). PURA: sem banco, sem relógio. Os 3 casos exigidos pelo plano (Passo 9 T):
 *  1. mesma seed → mesma amostra em 2 chamadas;
 *  2. seed diferente → amostra pode divergir (fixture de 20 lançamentos/conta);
 *  3. conta com 3 lançamentos e perAccount=5 → 3, sem repetição.
 */
import { sampleEntries, type SampleableLeg } from '../entrySample';

function leg(over: Partial<SampleableLeg> & { accountCode: string; entryId: string }): SampleableLeg {
  return {
    entryNumber: 1,
    date: new Date('2026-01-01T00:00:00.000Z'),
    description: 'd',
    sourceType: 'manual',
    sourceId: null,
    debitCents: 100,
    creditCents: 0,
    ...over,
  };
}

describe('sampleEntries (C6b PR-2 Passo 9, F-C6b-8 a)', () => {
  it('é pura: mesma entrada + mesma seed → mesma amostra em 2 chamadas', () => {
    const legs = Array.from({ length: 20 }, (_, i) => leg({ accountCode: '1.1.01', entryId: `e${i}` }));
    const first = sampleEntries(legs, { perAccount: 5, seed: 'seed-fixo' });
    const second = sampleEntries(legs, { perAccount: 5, seed: 'seed-fixo' });
    expect(second.map((l) => l.entryId)).toEqual(first.map((l) => l.entryId));
  });

  it('seed diferente → amostra diverge (fixture de 20 lançamentos/conta)', () => {
    const legs = Array.from({ length: 20 }, (_, i) => leg({ accountCode: '1.1.01', entryId: `e${i}` }));
    const a = sampleEntries(legs, { perAccount: 5, seed: 'seed-a' }).map((l) => l.entryId).sort();
    const b = sampleEntries(legs, { perAccount: 5, seed: 'seed-b' }).map((l) => l.entryId).sort();
    expect(a).not.toEqual(b);
  });

  it('conta com 3 lançamentos e perAccount=5 → devolve os 3, sem repetição', () => {
    const legs = [
      leg({ accountCode: '1.1.01', entryId: 'e1' }),
      leg({ accountCode: '1.1.01', entryId: 'e2' }),
      leg({ accountCode: '1.1.01', entryId: 'e3' }),
    ];
    const sampled = sampleEntries(legs, { perAccount: 5, seed: 'seed-x' });
    expect(sampled).toHaveLength(3);
    expect(new Set(sampled.map((l) => l.entryId)).size).toBe(3); // sem repetição
  });

  it('n por conta: cada conta é cortada em perAccount, independente das outras', () => {
    const legs = [
      ...Array.from({ length: 10 }, (_, i) => leg({ accountCode: '1.1.01', entryId: `a${i}` })),
      ...Array.from({ length: 2 }, (_, i) => leg({ accountCode: '3.1', entryId: `r${i}` })),
    ];
    const sampled = sampleEntries(legs, { perAccount: 3, seed: 'seed-y' });
    expect(sampled.filter((l) => l.accountCode === '1.1.01')).toHaveLength(3);
    expect(sampled.filter((l) => l.accountCode === '3.1')).toHaveLength(2); // só tinha 2, sem inventar
  });

  it('conta sem nenhuma perna não aparece no resultado (nada a amostrar)', () => {
    const legs = [leg({ accountCode: '1.1.01', entryId: 'e1' })];
    const sampled = sampleEntries(legs, { perAccount: 5, seed: 'seed-z' });
    expect(sampled.every((l) => l.accountCode === '1.1.01')).toBe(true);
  });

  it('lista vazia → amostra vazia', () => {
    expect(sampleEntries([], { perAccount: 5, seed: 'seed-w' })).toEqual([]);
  });
});
