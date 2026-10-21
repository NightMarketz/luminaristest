import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, cleanup } from '@testing-library/react';
import { StandardPagination } from '../StandardPagination';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 24 (FIX-FE-DASHBOARD).
 *
 * Na troca de página, o efeito faz `document.querySelector('.overflow-auto')` — o PRIMEIRO `.overflow-auto` do
 * documento (sidebar, menu…), não o contêiner da tabela. Esperado: rola o contêiner rolável que envolve a paginação,
 * e não um `.overflow-auto` alheio que vem antes no DOM.
 */
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key) }),
}));

afterEach(() => cleanup());

describe('StandardPagination — rolagem na troca de página', () => {
  it('rola o contêiner da própria tabela, não o primeiro .overflow-auto do documento', () => {
    const scrolled: string[] = [];
    Element.prototype.scrollTo = function (this: Element) { scrolled.push(this.id || this.tagName); } as Element['scrollTo'];
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

    const props = { totalPages: 3, totalItems: 75, itemsPerPage: 25, onPageChange: () => {} };
    const tree = (page: number) => (
      <div>
        <nav id="sidebar" className="overflow-auto" />
        <section id="table-scroll" className="overflow-auto">
          <StandardPagination {...props} currentPage={page} />
        </section>
      </div>
    );
    const { rerender } = render(tree(1));
    scrolled.length = 0;
    rerender(tree(2));

    expect(scrolled.length).toBeGreaterThan(0);
    expect(scrolled).not.toContain('sidebar');
  });
});
