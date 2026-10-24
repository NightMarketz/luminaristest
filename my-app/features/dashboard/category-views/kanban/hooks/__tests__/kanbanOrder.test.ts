import { describe, it, expect } from 'vitest';
import { computeDropOrder, sortByManualOrder, ORDER_STEP } from '../kanbanOrder';

const t = (id: string, order?: unknown, createdAt = '') => ({ id, order, createdAt });

describe('sortByManualOrder (item 1)', () => {
  it('ordena por order e desempata por createdAt e id', () => {
    const out = sortByManualOrder([t('c', 2000), t('b', 0, '2026-02'), t('a', undefined, '2026-01'), t('d', 1000)]);
    expect(out.map(x => x.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});

describe('computeDropOrder (F-KR-1..3)', () => {
  const col = [t('a', 1000), t('b', 2000), t('c', 3000)];

  it('meio: 1 gravação só do card movido', () => {
    expect(computeDropOrder(col, 'x', 1)).toEqual([{ id: 'x', order: 1500 }]);
  });
  it('topo e fim', () => {
    expect(computeDropOrder(col, 'x', 0)).toEqual([{ id: 'x', order: 0 }]);
    expect(computeDropOrder(col, 'x', 3)).toEqual([{ id: 'x', order: 4000 }]);
  });
  it('coluna vazia', () => {
    expect(computeDropOrder([], 'x', 0)).toEqual([{ id: 'x', order: ORDER_STEP }]);
  });
  it('vão esgotado → rebalanceia a coluna', () => {
    expect(computeDropOrder([t('a', 1), t('b', 2)], 'x', 1)).toEqual([
      { id: 'a', order: 1000 }, { id: 'x', order: 2000 }, { id: 'b', order: 3000 },
    ]);
  });
  it('empate (linhas antigas com 0) → backfill na ordem visível, pulando quem já está certo', () => {
    expect(computeDropOrder([t('a', 0), t('b', 0), t('c', 3000)], 'x', 0)).toEqual([
      { id: 'x', order: 1000 }, { id: 'a', order: 2000 }, { id: 'b', order: 3000 }, { id: 'c', order: 4000 },
    ]);
    expect(computeDropOrder([t('a', 0), t('b', 0)], 'x', 2)).toEqual([
      { id: 'a', order: 1000 }, { id: 'b', order: 2000 }, { id: 'x', order: 3000 },
    ]);
  });
});
