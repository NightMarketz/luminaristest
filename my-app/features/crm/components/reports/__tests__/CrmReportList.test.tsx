import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('./i18nPt')).nextI18nextPt());

import { CrmReportList } from '../CrmReportList';
import type { CrmReportRow } from '../../../../../lib/services/crmReports.service';

/** Lista de relatórios — FE-INCR-CRM-REPORT-BUILDER PR-A, item 2. */
const row = (id: string, userId: string, name: string): CrmReportRow => ({
  id,
  userId,
  name,
  description: null,
  kind: 'chart',
  chartType: 'pie',
  spec: { source: 'leads', measures: [{ type: 'count' }] },
  createdAt: '2026-10-13T10:00:00.000Z',
  updatedAt: '2026-10-13T10:00:00.000Z',
});

describe('CrmReportList', () => {
  afterEach(() => cleanup());

  it('lista nome, tipo e gráfico; a marca "de outro usuário" só no relatório alheio', () => {
    render(
      <CrmReportList
        reports={[row('r1', 'eu', 'Meu funil'), row('r2', 'outro', 'Funil do Zé')]}
        currentUserId="eu"
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onNew={vi.fn()}
      />,
    );
    expect(screen.getByText('Meu funil')).toBeInTheDocument();
    expect(screen.getAllByText('Gráfico')).toHaveLength(3); // cabeçalho + 2 linhas
    expect(screen.getAllByText('Pizza')).toHaveLength(2);
    expect(screen.getAllByText('de outro usuário')).toHaveLength(1);
    expect(screen.getByText('Funil do Zé').parentElement).toHaveTextContent('de outro usuário');
  });

  it('Abrir e Apagar chamam o pai com o relatório da linha', () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    const r = row('r1', 'eu', 'Meu funil');
    render(<CrmReportList reports={[r]} currentUserId="eu" onOpen={onOpen} onDelete={onDelete} onNew={vi.fn()} />);
    fireEvent.click(screen.getByText('Abrir'));
    expect(onOpen).toHaveBeenCalledWith('r1');
    fireEvent.click(screen.getByText('Apagar'));
    expect(onDelete).toHaveBeenCalledWith(r);
  });

  it('vazio: estado vazio com "Novo relatório"', () => {
    const onNew = vi.fn();
    render(<CrmReportList reports={[]} currentUserId="eu" onOpen={vi.fn()} onDelete={vi.fn()} onNew={onNew} />);
    expect(screen.getByText('Nenhum relatório salvo ainda.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Novo relatório'));
    expect(onNew).toHaveBeenCalled();
  });
});
