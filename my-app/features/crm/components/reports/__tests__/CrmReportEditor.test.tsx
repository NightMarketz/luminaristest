import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('./i18nPt')).nextI18nextPt());

import { CrmReportEditor } from '../CrmReportEditor';
import { emptyDraft, reportFields, type ReportDraft } from '../../../lib/reportBuilder';
import type { ISchemaField } from '../../../../dashboard/components/shared/dynamic-tables.client';

/**
 * Editor do builder — FE-INCR-CRM-REPORT-BUILDER PR-A, itens 5–8, 11, 12 (o que é oferecido e o que cada ação monta).
 */
const FIELDS: ISchemaField[] = reportFields(
  [
    { name: 'title', label: 'Título', type: 'string' },
    { name: 'amount', label: 'Valor', type: 'number', numberFormat: 'currency' },
    { name: 'currency', label: 'Moeda', type: 'select', options: ['BRL', 'USD', 'EUR'] },
    { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent'] },
    { name: 'estimatedCloseDate', label: 'Fechamento', type: 'date' },
    { name: 'title2', label: 'Código', type: 'string' },
  ],
  { id: 'ID', createdAt: 'Criado em', updatedAt: 'Atualizado em' },
);

let latest: ReportDraft;
function Harness({ initial }: { initial?: Partial<ReportDraft> }) {
  const [draft, setDraft] = useState<ReportDraft>({ ...emptyDraft(), source: 'leadProposals', ...initial });
  latest = draft;
  return (
    <CrmReportEditor
      draft={draft}
      fields={FIELDS}
      sources={['leads', 'leadProposals']}
      onChange={(d) => {
        latest = d;
        setDraft(d);
      }}
      onSourceChange={vi.fn()}
    />
  );
}

const optionTexts = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent);

describe('CrmReportEditor', () => {
  afterEach(() => cleanup());

  it('item 5: sum não lista campo texto; o dinheiro vem marcado', () => {
    render(<Harness />);
    const row = screen.getByTestId('measure-0');
    fireEvent.change(within(row).getByLabelText('Cálculo'), { target: { value: 'sum' } });
    const opts = optionTexts(within(row).getByLabelText('Campo'));
    expect(opts).toContain('Valor (dinheiro)');
    expect(opts).not.toContain('Título');
  });

  it('item 5: teto de 4 medidas — o 5º bloco não é oferecido', () => {
    render(<Harness />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('Adicionar medida'));
    expect(screen.getAllByTestId(/^measure-/)).toHaveLength(4);
    expect(screen.queryByText('Adicionar medida')).toBeNull();
  });

  it('item 6: período só oferece campos de data', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Adicionar agrupamento'));
    fireEvent.change(within(screen.getByTestId('dimension-0')).getByLabelText('Agrupar'), { target: { value: 'period' } });
    expect(optionTexts(screen.getByLabelText('Campo de data'))).toEqual(['Fechamento', 'Criado em', 'Atualizado em']);
  });

  it('item 7: `in` num select monta array com os valores marcados', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Adicionar filtro'));
    const row = screen.getByTestId('filter-0');
    fireEvent.change(within(row).getByLabelText('Campo do filtro'), { target: { value: 'status' } });
    fireEvent.change(within(row).getByLabelText('Operador'), { target: { value: 'in' } });
    fireEvent.click(within(row).getByLabelText('Draft'));
    fireEvent.click(within(row).getByLabelText('Sent'));
    expect(latest.filters).toEqual([{ field: 'status', op: 'in', value: ['Draft', 'Sent'] }]);
  });

  it('item 8: soma de dinheiro pede a escolha; "Separar por moeda" põe a dimensão do par, "Só uma moeda" o filtro eq', () => {
    render(<Harness initial={{ measures: [{ type: 'sum', field: 'amount', alias: '' }] }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('O valor de "Valor" pode estar em moedas diferentes');
    fireEvent.click(screen.getByText('Separar por moeda'));
    expect(latest.dimensions).toEqual([{ type: 'field', field: 'currency' }]);
    expect(screen.queryByRole('alert')).toBeNull();

    cleanup();
    render(<Harness initial={{ measures: [{ type: 'sum', field: 'amount', alias: '' }] }} />);
    fireEvent.change(screen.getByLabelText('Só uma moeda'), { target: { value: 'USD' } });
    expect(latest.filters).toEqual([{ field: 'currency', op: 'eq', value: 'USD' }]);
  });

  it('item 11: conversão desabilitada sem medida de dinheiro; habilitada com ela', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Mostrar também convertido para R$ (PTAX)')).toBeDisabled();
    cleanup();
    render(
      <Harness initial={{ measures: [{ type: 'sum', field: 'amount', alias: '' }], dimensions: [{ type: 'field', field: 'currency' }] }} />,
    );
    const box = screen.getByLabelText('Mostrar também convertido para R$ (PTAX)');
    expect(box).toBeEnabled();
    fireEvent.click(box);
    expect(latest.convertTo).toBe(true);
  });

  it('item 12: tipo Tabela só oferece o gráfico Tabela; KPI esconde os agrupamentos', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'table' } });
    expect(latest.chartType).toBe('table');
    expect(optionTexts(screen.getByLabelText('Gráfico'))).toEqual(['Tabela']);
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'kpi' } });
    expect(optionTexts(screen.getByLabelText('Gráfico'))).toEqual(['Barras', 'Linha', 'Área', 'Pizza', 'Rosca']);
    expect(latest.kind).toBe('kpi');
    expect(screen.queryByText('Adicionar agrupamento')).toBeNull();
  });

  it('review — achado 1: trocar a medida de dinheiro por contagem desmarca a conversão no rascunho', () => {
    render(
      <Harness
        initial={{ measures: [{ type: 'sum', field: 'amount', alias: '' }], filters: [{ field: 'currency', op: 'eq', value: 'USD' }], convertTo: true }}
      />,
    );
    fireEvent.change(within(screen.getByTestId('measure-0')).getByLabelText('Cálculo'), { target: { value: 'count' } });
    expect(latest.convertTo).toBe(false);
  });

  it('review — achado 3: remover um filtro `in` de texto não deixa o valor dele na linha de baixo', () => {
    render(
      <Harness
        initial={{
          filters: [
            { field: 'title2', op: 'in', value: ['a', 'b'] },
            { field: 'title2', op: 'in', value: ['c'] },
          ],
        }}
      />,
    );
    fireEvent.click(within(screen.getByTestId('filter-0')).getByText('Remover'));
    const input = within(screen.getByTestId('filter-0')).getByLabelText('Valor') as HTMLInputElement;
    expect(input.value).toBe('c');
    fireEvent.blur(input);
    expect(latest.filters).toEqual([{ field: 'title2', op: 'in', value: ['c'] }]);
  });

  it('review — KPI com a separação por moeda tem saída pela tela', () => {
    render(<Harness initial={{ kind: 'kpi', dimensions: [{ type: 'field', field: 'currency' }] }} />);
    fireEvent.click(screen.getByText('Tirar a separação'));
    expect(latest.dimensions).toEqual([]);
  });
});
