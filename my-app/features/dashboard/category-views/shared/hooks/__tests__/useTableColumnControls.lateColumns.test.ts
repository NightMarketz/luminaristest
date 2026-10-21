import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableColumnControls, type ColumnDefinition } from '../useTableColumnControls';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 15 (FIX-FE-DASHBOARD).
 *
 * O hook congela `visibleCols`/`orderedColumns` no primeiro render (`useState(() => …initialColumns)`). Coluna que
 * chega num render seguinte — a de relação, que depende do schema/lookups — nasce fora do conjunto visível e o
 * auto-save grava esse estado no localStorage. Esperado: coluna nova com `defaultVisible` aparece visível, e o que
 * é persistido a inclui.
 */
const base: ColumnDefinition[] = [{ id: 'name', label: 'Name', defaultVisible: true, defaultWidth: 120 }];
const rel: ColumnDefinition = { id: 'customerId', label: 'Customer', defaultVisible: true, defaultWidth: 160, type: 'relation' };

describe('useTableColumnControls — coluna que chega depois do mount', () => {
  beforeEach(() => window.localStorage.clear());

  it('coluna de relação com defaultVisible fica visível e é persistida', async () => {
    const { result, rerender } = renderHook(({ cols }) => useTableColumnControls(cols, 'cols:t1'), {
      initialProps: { cols: base },
    });
    rerender({ cols: [...base, rel] });
    await act(async () => { await new Promise((r) => setTimeout(r, 350)); });

    expect(result.current.isVisible('name')).toBe(true);
    expect(result.current.isVisible('customerId')).toBe(true);
    const saved = JSON.parse(window.localStorage.getItem('cols:t1') ?? '{}') as { visibleCols?: string[] };
    expect(saved.visibleCols).toContain('customerId');
  });
});
