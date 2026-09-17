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

  // Review #338 F2 (ALTO): um lançamento com 2 pernas na MESMA conta (ex.: 2 débitos separados
  // na conta bancária) tinha rank IDÊNTICO (mesmo seed|accountCode|entryId) e entrava 2× —
  // `perAccount` contava PERNAS, não LANÇAMENTOS, ao contrário do BRIEF item 10. Dedup + soma
  // de débito/crédito ANTES do rank fecha a classe.
  it('lançamento com 2 pernas na MESMA conta → 1 única linha, com débito/crédito somados (não 2x)', () => {
    const legs = [
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 300, creditCents: 0 }),
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 200, creditCents: 0 }),
    ];
    const sampled = sampleEntries(legs, { perAccount: 5, seed: 'seed-dup' });
    expect(sampled).toHaveLength(1); // NÃO 2 — antes do fix, ['e1','e1']
    expect(sampled[0]).toMatchObject({ accountCode: '1.1.01', entryId: 'e1', debitCents: 500, creditCents: 0 });
  });

  it('2 pernas na mesma conta não somam com pernas de OUTRO lançamento (chave é accountCode+entryId)', () => {
    const legs = [
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 100, creditCents: 0 }),
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 50, creditCents: 0 }),
      leg({ accountCode: '1.1.01', entryId: 'e2', debitCents: 900, creditCents: 0 }),
    ];
    const sampled = sampleEntries(legs, { perAccount: 5, seed: 'seed-dup2' });
    expect(sampled).toHaveLength(2);
    const e1 = sampled.find((l) => l.entryId === 'e1')!;
    const e2 = sampled.find((l) => l.entryId === 'e2')!;
    expect(e1.debitCents).toBe(150);
    expect(e2.debitCents).toBe(900); // não contaminado pela soma de e1
  });

  it('2 pernas na mesma conta contam como 1 lançamento para o corte de perAccount', () => {
    // 2 lançamentos "reais" na conta (e1 com 2 pernas, e2 com 1 perna) + perAccount=1: o corte
    // deve escolher 1 LANÇAMENTO (podendo ser e1, que carrega suas 2 pernas já somadas), nunca
    // "1 perna" que deixaria e1 pela metade.
    const legs = [
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 100, creditCents: 0 }),
      leg({ accountCode: '1.1.01', entryId: 'e1', debitCents: 50, creditCents: 0 }),
      leg({ accountCode: '1.1.01', entryId: 'e2', debitCents: 900, creditCents: 0 }),
    ];
    const sampled = sampleEntries(legs, { perAccount: 1, seed: 'seed-cut' });
    expect(sampled).toHaveLength(1);
    if (sampled[0].entryId === 'e1') expect(sampled[0].debitCents).toBe(150); // nunca 100 OU 50 isolado
  });
});
