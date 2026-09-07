import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup } from '@testing-library/react';
import { JournalEntryModal, type AccountOption } from '../JournalEntryModal';
import type { DimensionCatalogEntry } from '../../../../lib/services/dimensions.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { postEntry: vi.fn() },
}));

const accounts: AccountOption[] = [
  { id: 'a1', code: '1.1.1', name: 'Caixa', acceptsEntries: true },
  { id: 'a2', code: '3.1', name: 'Receita', acceptsEntries: true },
];

function value(over: Partial<DimensionCatalogEntry['values'][number]>) {
  return {
    id: 'x', userId: 'o1', unitId: 'u1', definitionId: 'd1', code: 'C', name: 'N', parentId: null,
    status: 'ACTIVE' as const, createdById: null, createdAt: '', updatedAt: '', deletedAt: null, ...over,
  };
}

const catalog: DimensionCatalogEntry[] = [
  {
    definition: {
      id: 'd1', userId: 'o1', unitId: 'u1', code: 'COST_CENTER', name: 'Centro de Custo',
      status: 'ACTIVE', createdById: null, createdAt: '', updatedAt: '', deletedAt: null,
    },
    values: [
      value({ id: 'parent', code: 'MKT', name: 'Marketing' }),
      value({ id: 'leaf', code: 'SEO', name: 'Busca', parentId: 'parent' }),
    ],
  },
];

describe('JournalEntryModal dimension tagging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('offers only LEAF values (excludes the rollup parent) in the per-line picker', () => {
    render(
      <JournalEntryModal
        isOpen
        onClose={() => {}}
        unitId="u1"
        accounts={accounts}
        dimensionCatalog={catalog}
        onSuccess={() => {}}
      />,
    );
    // The leaf value option is offered (once per default line = 2 lines).
    expect(screen.getAllByRole('option', { name: 'SEO — Busca' }).length).toBe(2);
    // The rollup parent (has an active child) is NOT taggable.
    expect(screen.queryByRole('option', { name: 'MKT — Marketing' })).toBeNull();
  });

  it('renders no dimension picker when the catalog is empty', () => {
    render(
      <JournalEntryModal isOpen onClose={() => {}} unitId="u1" accounts={accounts} onSuccess={() => {}} />,
    );
    expect(screen.queryByText('Dimensões')).toBeNull();
  });
});

// ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
// `today()` (JournalEntryModal.tsx:105-107) deriva o default da DATA DO LANÇAMENTO via
// `toISOString()` (UTC): entre 21h-00h BRT o dia UTC já virou e o lançamento manual
// default nasce datado do "amanhã" do escopo — este é um WRITE-PATH: postEntry aceita a
// data em silêncio (nenhuma checagem de hoje fora do aging) e o razão grava o dia errado;
// na última noite do mês o default cai no PERÍODO SEGUINTE. Comportamento correto
// (fork-agnóstico): o default afirma o HOJE do escopo — ou vazio, se a correção delegar.
// Instante FIXADO com fake timers na janela que morde (determinístico em qualquer fuso).
describe('JournalEntryModal — default de data (classe date-only UTC shift)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('guarda: default da data do lançamento na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      render(
        <JournalEntryModal isOpen onClose={() => {}} unitId="u1" accounts={accounts} onSuccess={() => {}} />,
      );
      // O Modal renderiza via createPortal(..., document.body) — `container` do RTL cobre só a
      // árvore montada no baseElement e acha ZERO inputs aqui. Consultar `container` fazia este
      // guarda estourar TypeError ANTES de asserir: ele parecia vermelho "pelo motivo certo" e na
      // verdade nunca testou a data. Consulte o document; a sanidade abaixo mantém isso visível.
      const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
      expect(inputs.length).toBeGreaterThanOrEqual(1); // sanidade: a data do lançamento existe
      const input = inputs[0];
      expect(
        ['', '2026-08-31'],
        'default da data do lançamento às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: o lançamento manual default grava o razão no dia errado (e no fim do mês, no período seguinte)',
      ).toContain(input.value);
    } finally {
      vi.useRealTimers();
    }
  });
});
