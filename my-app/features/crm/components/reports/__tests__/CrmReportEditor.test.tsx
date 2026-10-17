import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';

vi.mock('next-i18next', async () => (await import('./i18nPt')).nextI18nextPt());

import { CrmReportEditor } from '../CrmReportEditor';
import {
  combinedFields,
  emptyDraft,
  removeJoin,
  reportFields,
  withJoinSource,
  type ReportDraft,
  type ReportSource,
} from '../../../lib/reportBuilder';
import type { ISchemaField } from '../../../../dashboard/components/shared/dynamic-tables.client';

/**
 * Editor do builder — FE-INCR-CRM-REPORT-BUILDER PR-A, itens 5–8, 11, 12 (o que é oferecido e o que cada ação monta);
 * PR-B, item 10 (joins).
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
  { amount: 'currency' }, // `moneyCurrencyPairs.leadProposals` do BE
);

const LEADS: ISchemaField[] = reportFields(
  [
    { name: 'name', label: 'Nome', type: 'string' },
    { name: 'status', label: 'Status', type: 'select', options: ['Novo', 'Ganho'] },
    { name: 'ownerId', label: 'Dono', type: 'relation', relation: { targetTable: 'users' } },
  ],
  { id: 'ID', createdAt: 'Criado em', updatedAt: 'Atualizado em' },
  { latestProposalAmount: 'latestProposalCurrency' }, // `moneyCurrencyPairs.leads` do BE
);
const rightFieldsOf = (s: ReportSource) => (s === 'leads' ? LEADS : null);

let latest: ReportDraft;
/** Faz o papel do pai: campos = fonte + joins; trocar a tabela do join / remover aplicam direto (sem o Modal). */
function Harness({ initial }: { initial?: Partial<ReportDraft> }) {
  const [draft, setDraft] = useState<ReportDraft>({ ...emptyDraft(), source: 'leadProposals', ...initial });
  latest = draft;
  const apply = (d: ReportDraft) => {
    latest = d;
    setDraft(d);
  };
  return (
    <CrmReportEditor
      draft={draft}
      fields={combinedFields(FIELDS, draft.joins, rightFieldsOf)}
      sources={['leads', 'leadProposals']}
      rightFieldsOf={rightFieldsOf}
      onChange={apply}
      onSourceChange={vi.fn()}
      onJoinSourceChange={(i, src) => apply(withJoinSource(draft, i, src, FIELDS, rightFieldsOf))}
      onJoinRemove={(i) => apply(removeJoin(draft, i, FIELDS, rightFieldsOf))}
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

  it('2ª passada R2: `in` em campo numérico ignora valor que não é número', () => {
    render(<Harness initial={{ filters: [{ field: 'amount', op: 'in', value: [] }] }} />);
    const input = within(screen.getByTestId('filter-0')).getByLabelText('Valor');
    fireEvent.change(input, { target: { value: '1, abc' } });
    fireEvent.blur(input);
    expect(latest.filters).toEqual([{ field: 'amount', op: 'in', value: [1] }]);
  });

  it('3ª passada: par de moeda oculto em uso aparece no select da linha (o valor mostrado é o do rascunho)', () => {
    const hidden = FIELDS.map((f) => (f.name === 'currency' ? { ...f, hidden: true } : f));
    function HiddenHarness() {
      const [draft, setDraft] = useState<ReportDraft>({ ...emptyDraft(), source: 'leadProposals', measures: [{ type: 'sum', field: 'amount', alias: '' }] });
      latest = draft;
      return (
        <CrmReportEditor
          draft={draft}
          fields={hidden}
          sources={['leadProposals']}
          rightFieldsOf={() => null}
          onChange={setDraft}
          onSourceChange={vi.fn()}
          onJoinSourceChange={vi.fn()}
          onJoinRemove={vi.fn()}
        />
      );
    }
    render(<HiddenHarness />);
    fireEvent.click(screen.getByText('Separar por moeda'));
    expect(latest.dimensions).toEqual([{ type: 'field', field: 'currency' }]);
    expect(within(screen.getByTestId('dimension-0')).getByLabelText('Campo do agrupamento')).toHaveValue('currency');
    fireEvent.click(screen.getByText('Adicionar agrupamento'));
    expect(optionTexts(within(screen.getByTestId('dimension-1')).getByLabelText('Campo do agrupamento'))).not.toContain('Moeda');
  });

  describe('item 10 — joins (seção avançado)', () => {
    const openAndAdd = () => {
      fireEvent.click(screen.getByText('Avançado: cruzar com outra tabela'));
      fireEvent.click(screen.getByText('Adicionar cruzamento'));
      const row = screen.getByTestId('join-0');
      fireEvent.change(within(row).getByLabelText('Tabela'), { target: { value: 'leads' } });
      fireEvent.change(within(row).getByLabelText('Campo da fonte'), { target: { value: 'title2' } });
      fireEvent.change(within(row).getByLabelText('Campo da outra tabela'), { target: { value: 'id' } });
      return row;
    };

    it('fechada por padrão; abre, aceita até 2 cruzamentos e o 3º não é oferecido', () => {
      render(<Harness />);
      expect(screen.queryByText('Adicionar cruzamento')).toBeNull();
      fireEvent.click(screen.getByText('Avançado: cruzar com outra tabela'));
      fireEvent.click(screen.getByText('Adicionar cruzamento'));
      fireEvent.click(screen.getByText('Adicionar cruzamento'));
      expect(screen.getAllByTestId(/^join-/)).toHaveLength(2);
      expect(screen.queryByText('Adicionar cruzamento')).toBeNull();
      expect(screen.getByText(/primeira linha da outra tabela/)).toBeInTheDocument();
    });

    it('escolher a tabela pré-preenche o apelido; os campos do join entram como apelido.campo nos itens 5–7', () => {
      render(<Harness />);
      const row = openAndAdd();
      expect(within(row).getByLabelText('Apelido')).toHaveValue('leads');
      expect(latest.joins).toEqual([{ rightSource: 'leads', leftField: 'title2', rightField: 'id', alias: 'leads' }]);
      // medida (count) e filtro listam o campo do join
      expect(optionTexts(within(screen.getByTestId('measure-0')).getByLabelText('Campo'))).toContain('leads.Status');
      fireEvent.click(screen.getByText('Adicionar filtro'));
      expect(optionTexts(screen.getByLabelText('Campo do filtro'))).toContain('leads.Dono');
      // agrupar: status do lead sim; relação do join (id cru no BE) e leads.id não
      fireEvent.click(screen.getByText('Adicionar agrupamento'));
      const dimOpts = optionTexts(within(screen.getByTestId('dimension-0')).getByLabelText('Campo do agrupamento'));
      expect(dimOpts).toContain('leads.Status');
      expect(dimOpts).not.toContain('leads.Dono');
      expect(dimOpts).not.toContain('leads.ID');
      // período enxerga a data sintética do join
      fireEvent.change(within(screen.getByTestId('dimension-0')).getByLabelText('Agrupar'), { target: { value: 'period' } });
      expect(optionTexts(screen.getByLabelText('Campo de data'))).toContain('leads.Criado em');
    });

    it('apelido inválido mostra o motivo e não entra no rascunho; válido, ao sair do campo, reescreve as referências', () => {
      render(<Harness />);
      const row = openAndAdd();
      fireEvent.change(within(screen.getByTestId('measure-0')).getByLabelText('Campo'), { target: { value: 'leads.status' } });
      const alias = within(row).getByLabelText('Apelido');
      fireEvent.change(alias, { target: { value: 'amount' } });
      fireEvent.blur(alias);
      expect(within(row).getByRole('alert')).toHaveTextContent('A fonte já tem um campo com esse nome.');
      expect(latest.joins[0].alias).toBe('leads');
      expect(latest.joins[0].pendingAlias).toBe('amount'); // fica pendente e bloqueia (review do PR-B, achado 3)
      fireEvent.change(alias, { target: { value: 'lead' } });
      fireEvent.blur(alias);
      expect(latest.joins[0].alias).toBe('lead');
      expect(latest.measures[0].field).toBe('lead.status');
      expect(within(row).queryByRole('alert')).toBeNull();
    });

    it('remover o cruzamento tira as referências a ele', () => {
      render(<Harness />);
      openAndAdd();
      fireEvent.change(within(screen.getByTestId('measure-0')).getByLabelText('Campo'), { target: { value: 'leads.status' } });
      fireEvent.click(within(screen.getByTestId('join-0')).getByText('Remover'));
      expect(latest.joins).toEqual([]);
      expect(latest.measures).toEqual([{ type: 'count', field: '', alias: '' }]);
    });
  });
});
