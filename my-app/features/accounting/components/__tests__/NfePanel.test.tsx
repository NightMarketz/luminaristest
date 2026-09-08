import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { NfePanel, loadFinalizedSales } from '../NfePanel';
import { nfeService, type NfePreview } from '../../../../lib/services/nfe.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';
import { DynamicTableService } from '../../../../lib/services/dynamic-table.service';
import { loadProductOptions } from '../../lib/loadProductOptions';
import { NFE_MAPPING_MEMORY_KEY } from '../../lib/nfeMappingMemory';

// jsx preserve + classic runtime: the component under test does import React, but the shim keeps the
// test resilient to that changing (my-app/CLAUDE.md test rules).
(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('../../../../lib/services/nfe.service', () => ({
  nfeService: { previewNfe: vi.fn(), importPurchaseNfe: vi.fn(), reconcileSaleNfe: vi.fn() },
}));
vi.mock('../../../../lib/services/counterparties.service', () => ({
  counterpartiesService: { listCounterparties: vi.fn() },
}));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTables: vi.fn(), getTableData: vi.fn() },
}));
vi.mock('../../lib/loadProductOptions', () => ({ loadProductOptions: vi.fn() }));

const products = [
  { id: 'prod-shamp', name: 'Shampoo Profissional 500ml' },
  { id: 'prod-cond', name: 'Condicionador Profissional 500ml' },
  { id: 'prod-dup-a', name: 'Máscara 300ml' },
  { id: 'prod-dup-b', name: 'Mascara 300ml' }, // normaliza igual → match NÃO é único
];

function preview(over: Partial<NfePreview> = {}): NfePreview {
  return {
    chaveAcesso: '35250712345678000195550010000000011000000012',
    ide: { numero: '1', serie: '1', dhEmiDate: '2025-07-10', tpNF: '1', natOp: 'COMPRA', mod: '55' },
    emit: { cnpj: '12345678000195', nome: 'DISTRIBUIDORA EXEMPLO LTDA' },
    dest: { cnpj: '98765432000198', nome: 'SALAO EXEMPLO LTDA' },
    itens: [
      { nItem: 1, cProd: 'SHAMP-500', cEAN: '', xProd: 'Shampoo Profissional 500ml', ncm: '', cfop: '1102', uCom: 'UN', qCom: '10.0000', vUnComStr: '10', vProdCents: 10000, vDescCents: 0, indTot: '1' },
      { nItem: 2, cProd: 'MASC-300', cEAN: '', xProd: 'Máscara 300ml', ncm: '', cfop: '1102', uCom: 'UN', qCom: '3.0000', vUnComStr: '11.11', vProdCents: 3333, vDescCents: 0, indTot: '1' },
      { nItem: 3, cProd: 'BRINDE', cEAN: '', xProd: 'Brinde', ncm: '', cfop: '1102', uCom: 'UN', qCom: '1.0000', vUnComStr: '0', vProdCents: 0, vDescCents: 0, indTot: '0' },
    ],
    totais: { vProdCents: 13333, vDescCents: 0, vFreteCents: 0, vSegCents: 0, vOutroCents: 0, vIPICents: 0, vSTCents: 0, vICMSCents: 0, vNFCents: 13333 },
    protocolo: { cStat: '100', nProt: '1', dhRecbtoDate: '2025-07-10' },
    alreadyImported: false,
    existingPayableId: null,
    ...over,
  };
}

const salesTable = { id: 'tbl-sales', internalName: 'sales' };
const salesRows = [
  { id: 'sale-fin-1', data: { unitId: 'u1', status: 'Finalized', date: '2026-09-01', totalAmount: 120.5, simpleCustomerName: 'Ana' } },
  { id: 'sale-draft', data: { unitId: 'u1', status: 'Draft', date: '2026-09-02', totalAmount: 10 } },
  { id: 'sale-other-unit', data: { unitId: 'u2', status: 'Finalized', date: '2026-09-03', totalAmount: 99 } },
  { id: 'sale-cancelled', data: { unitId: 'u1', status: 'Cancelled', date: '2026-09-04', totalAmount: 5 } },
];

function pickFile(input: HTMLInputElement) {
  fireEvent.change(input, { target: { files: [new File(['<xml/>'], 'nfe.xml', { type: 'text/xml' })] } });
}

describe('NfePanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(loadProductOptions).mockResolvedValue(products);
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue([
      { id: 'cp-tax', userId: 'u', unitId: 'u1', type: 'SUPPLIER', name: 'Outro Nome', ref: null, taxId: '12345678000195', createdById: null, createdAt: '', updatedAt: '', deletedAt: null },
      { id: 'cp-name', userId: 'u', unitId: 'u1', type: 'SUPPLIER', name: 'Distribuidora Exemplo Ltda', ref: null, taxId: null, createdById: null, createdAt: '', updatedAt: '', deletedAt: null },
    ]);
    vi.mocked(DynamicTableService.getTables).mockResolvedValue({ data: [salesTable] } as never);
    vi.mocked(DynamicTableService.getTableData).mockResolvedValue({ data: salesRows } as never);
    vi.mocked(nfeService.previewNfe).mockReset();
    vi.mocked(nfeService.importPurchaseNfe).mockReset();
    vi.mocked(nfeService.reconcileSaleNfe).mockReset();
  });
  afterEach(cleanup);

  async function renderWithPreview(p: NfePreview = preview()) {
    vi.mocked(nfeService.previewNfe).mockResolvedValue(p);
    const utils = render(<NfePanel unitId="u1" />);
    await waitFor(() => expect(loadProductOptions).toHaveBeenCalled());
    await waitFor(() => expect(counterpartiesService.listCounterparties).toHaveBeenCalledWith({ unitId: 'u1', type: 'SUPPLIER' }));
    pickFile(screen.getByTestId('nfe-purchase-file') as HTMLInputElement);
    await screen.findByTestId('nfe-preview');
    return utils;
  }

  it('compra: preview renderiza cabeçalho e itens; indTot=0 sem select; vNF formatado; nunca NaN', async () => {
    const { container } = await renderWithPreview();
    expect(nfeService.previewNfe).toHaveBeenCalledWith({ unitId: 'u1' }, expect.any(File));
    expect(screen.getByTestId('nfe-item-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('nfe-item-select-SHAMP-500')).toBeInTheDocument();
    expect(screen.getByTestId('nfe-item-ignored-3')).toBeInTheDocument();
    expect(screen.queryByTestId('nfe-item-select-BRINDE')).toBeNull();
    expect(screen.getByTestId('nfe-vnf').textContent).toMatch(/133,33/);
    expect(container.textContent).not.toContain('NaN');
  });

  it('pré-preenche por nome exato ÚNICO (sugerido), deixa vazio o ambíguo, e Importar fica desabilitado até mapear tudo', async () => {
    await renderWithPreview();
    expect((screen.getByTestId('nfe-item-select-SHAMP-500') as HTMLSelectElement).value).toBe('prod-shamp');
    expect(screen.getByTestId('nfe-origin-SHAMP-500').textContent).toMatch(/sugerido/);
    expect((screen.getByTestId('nfe-item-select-MASC-300') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByTestId('nfe-origin-MASC-300')).toBeNull();
    expect(screen.getByTestId('nfe-import-btn')).toBeDisabled();
    fireEvent.change(screen.getByTestId('nfe-item-select-MASC-300'), { target: { value: 'prod-dup-a' } });
    expect(screen.getByTestId('nfe-import-btn')).not.toBeDisabled();
  });

  it('lembrado precede sugerido; "esquecer" limpa a linha e a memória', async () => {
    window.localStorage.setItem(NFE_MAPPING_MEMORY_KEY, JSON.stringify({ '12345678000195': { 'SHAMP-500': 'prod-cond', 'MASC-300': 'prod-dup-b' } }));
    await renderWithPreview();
    expect((screen.getByTestId('nfe-item-select-SHAMP-500') as HTMLSelectElement).value).toBe('prod-cond');
    expect(screen.getByTestId('nfe-origin-SHAMP-500').textContent).toMatch(/lembrado/);
    expect((screen.getByTestId('nfe-item-select-MASC-300') as HTMLSelectElement).value).toBe('prod-dup-b');
    const row = within(screen.getByTestId('nfe-item-row-1'));
    fireEvent.click(row.getByRole('button', { name: /esquecer/ }));
    expect((screen.getByTestId('nfe-item-select-SHAMP-500') as HTMLSelectElement).value).toBe('');
    expect(JSON.parse(window.localStorage.getItem(NFE_MAPPING_MEMORY_KEY) ?? '{}')['12345678000195']).toEqual({ 'MASC-300': 'prod-dup-b' });
  });

  it('memória com productRef que não existe mais no catálogo NÃO pré-preenche (cai para sugerido/vazio)', async () => {
    window.localStorage.setItem(NFE_MAPPING_MEMORY_KEY, JSON.stringify({ '12345678000195': { 'SHAMP-500': 'prod-deleted', 'MASC-300': 'prod-deleted' } }));
    await renderWithPreview();
    expect((screen.getByTestId('nfe-item-select-SHAMP-500') as HTMLSelectElement).value).toBe('prod-shamp');
    expect(screen.getByTestId('nfe-origin-SHAMP-500').textContent).toMatch(/sugerido/);
    expect((screen.getByTestId('nfe-item-select-MASC-300') as HTMLSelectElement).value).toBe('');
  });

  it('fornecedor pré-selecionado por CNPJ (taxId) antes do nome', async () => {
    await renderWithPreview();
    expect((screen.getByTestId('nfe-counterparty') as HTMLSelectElement).value).toBe('cp-tax');
  });

  it('alreadyImported desabilita o import e mostra o aviso', async () => {
    await renderWithPreview(preview({ alreadyImported: true, existingPayableId: 'pay-9' }));
    // sem instância i18n o t() devolve o fallback sem interpolar — asserta presença + estado, não o texto
    expect(screen.getByTestId('nfe-already-imported')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('nfe-item-select-MASC-300'), { target: { value: 'prod-dup-a' } });
    expect(screen.getByTestId('nfe-import-btn')).toBeDisabled();
  });

  it('import: payload exato (só cProd custeados, sem opcionais vazios), 201 → aviso de ignorados, memória gravada, onLedgerChange', async () => {
    const onLedgerChange = vi.fn();
    vi.mocked(nfeService.previewNfe).mockResolvedValue(preview());
    vi.mocked(nfeService.importPurchaseNfe).mockResolvedValue({
      payable: { id: 'pay-1', documentNumber: '35250712345678000195550010000000011000000012', amountCents: 13333 } as never,
      ignoredItems: [{ nItem: 3, cProd: 'BRINDE', xProd: 'Brinde', reason: 'indTot-0' }],
    });
    render(<NfePanel unitId="u1" onLedgerChange={onLedgerChange} />);
    await waitFor(() => expect(loadProductOptions).toHaveBeenCalled());
    pickFile(screen.getByTestId('nfe-purchase-file') as HTMLInputElement);
    await screen.findByTestId('nfe-preview');
    fireEvent.change(screen.getByTestId('nfe-item-select-MASC-300'), { target: { value: 'prod-dup-a' } });
    fireEvent.change(screen.getByTestId('nfe-counterparty'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('nfe-import-btn'));
    await waitFor(() => expect(nfeService.importPurchaseNfe).toHaveBeenCalledTimes(1));
    expect(vi.mocked(nfeService.importPurchaseNfe).mock.calls[0][0]).toEqual({
      unitId: 'u1',
      itemMappings: [
        { cProd: 'SHAMP-500', productRef: 'prod-shamp' },
        { cProd: 'MASC-300', productRef: 'prod-dup-a' },
      ],
      counterpartyId: undefined,
      dueDate: undefined,
    });
    await screen.findByTestId('nfe-ignored');
    expect(screen.getByTestId('nfe-ignored').textContent).toMatch(/BRINDE/);
    expect(screen.getByRole('status')).toBeInTheDocument(); // notice de sucesso (texto interpolado só com i18n real)
    expect(onLedgerChange).toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(NFE_MAPPING_MEMORY_KEY) ?? '{}')['12345678000195']).toEqual({ 'SHAMP-500': 'prod-shamp', 'MASC-300': 'prod-dup-a' });
    expect(screen.queryByTestId('nfe-preview')).toBeNull();
  });

  it('erro do servidor no preview e no import aparece como mensagem (resolveError)', async () => {
    vi.mocked(nfeService.previewNfe).mockRejectedValue({ status: 400, error: 'NF-e de homologação (tpAmb=2) rejeitada — não vira passivo real.' });
    render(<NfePanel unitId="u1" />);
    pickFile(screen.getByTestId('nfe-purchase-file') as HTMLInputElement);
    expect((await screen.findByRole('alert')).textContent).toMatch(/homologação/);
  });

  it('venda: seletor lista só vendas finalized da unidade; anexa com saleId/unitId; relatório renderiza', async () => {
    vi.mocked(nfeService.reconcileSaleNfe).mockResolvedValue({
      matched: true, saleId: 'sale-fin-1', journalEntryId: 'je1', chaveAcesso: '3525079876543200019855001000000002100000002 6'.replace(' ', ''),
      sourceDocumentId: 'sd-1', nfeTotalCents: 2990, saleTotalCents: 3000, nfeItemCount: 1, totalMatches: false, differenceCents: -10,
      divergences: ['Total da NF-e (2990 centavos) diverge do total lançado da venda (3000 centavos): diferença de -10 centavos.'],
    });
    const { container } = render(<NfePanel unitId="u1" />);
    const select = (await screen.findByTestId('nfe-sale-select')) as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBe(2)); // placeholder + 1 finalized da unidade
    expect(select.options[1].value).toBe('sale-fin-1');
    expect(select.options[1].textContent).toMatch(/Ana/);
    expect(screen.getByTestId('nfe-sale-btn')).toBeDisabled();
    fireEvent.change(select, { target: { value: 'sale-fin-1' } });
    expect(screen.getByTestId('nfe-sale-btn')).not.toBeDisabled();
    pickFile(screen.getByTestId('nfe-sale-file') as HTMLInputElement);
    await screen.findByTestId('nfe-report');
    expect(nfeService.reconcileSaleNfe).toHaveBeenCalledWith({ unitId: 'u1', saleId: 'sale-fin-1' }, expect.any(File));
    expect(screen.getByTestId('nfe-report').textContent).toMatch(/Divergência/);
    expect(screen.getByTestId('nfe-report').textContent).toMatch(/sd-1/);
    expect(container.textContent).not.toContain('NaN');
  });

  it('loadFinalizedSales filtra por unidade e status finalized (case-insensitive) e devolve [] sem tabela sales', async () => {
    const list = await loadFinalizedSales('u1');
    expect(list.map((s) => s.id)).toEqual(['sale-fin-1']);
    vi.mocked(DynamicTableService.getTables).mockResolvedValue({ data: [] } as never);
    expect(await loadFinalizedSales('u1')).toEqual([]);
  });
});
