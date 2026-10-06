import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { dfeService } from '@/lib/services/dfe.service';
import SaleDetailPanel from '../SaleDetailPanel';
import type { SaleRecord } from '../../../types/sales.types';

/**
 * TESTE-GUARDA da LAC-A (o 1º de category-views/finance): as ações Pagar/Cancelar/Devolver do
 * painel NÃO passam mais pelo PUT genérico (onUpdateSale) — sinalizam a intenção via
 * onRequestPay/Cancel/Return, que a SalesView roteia às rotas dedicadas /api/sales/*.
 * No código antigo, o clique em Pagar chamava onUpdateSale(id, {paymentStatus:'Paid'}) — que
 * bate no immutableAfter da venda Finalized e nunca posta o settlement. Este teste falha lá.
 */

// FE-INCR-DFE PR-2: o painel monta a emissão de NFS-e — sem isto a seção bate na rede do jsdom.
vi.mock('@/lib/services/dfe.service', () => ({
  dfeService: {
    getStatus: vi.fn(async () => ({ enabled: true, partner: 'manual', ambiente: 'homologacao' })),
    listBySale: vi.fn(async () => []),
    preview: vi.fn(),
    emit: vi.fn(),
  },
}));
vi.mock('@/lib/context/CurrencyContext', () => ({
  useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));
vi.mock('@/features/dashboard/shared/hooks/useRenderTypedValue', () => ({
  useRenderTypedValue: () => (v: unknown) => String(v),
}));

function sale(over: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 'sale-1',
    date: '2026-09-01',
    status: 'Finalized',
    paymentStatus: 'Pending',
    unitId: 'unit-1',
    customerId: 'cust-1',
    subtotal: 100,
    totalAmount: 100,
    ...over,
  } as SaleRecord;
}

function renderPanel(saleRecord: SaleRecord) {
  const onUpdateSale = vi.fn(async () => {});
  const onRequestPay = vi.fn();
  const onRequestCancel = vi.fn();
  const onRequestReturn = vi.fn();
  render(
    <SaleDetailPanel
      sale={saleRecord}
      table={null}
      items={[]}
      computedSubtotal={0}
      isUpdating={null}
      productNameMap={{}}
      serviceNameMap={{}}
      customerNameMap={{}}
      unitNameMap={{}}
      onUpdateSale={onUpdateSale}
      onRequestPay={onRequestPay}
      onRequestCancel={onRequestCancel}
      onRequestReturn={onRequestReturn}
    />,
  );
  return { onUpdateSale, onRequestPay, onRequestCancel, onRequestReturn };
}

beforeEach(() => cleanup());

describe('SaleDetailPanel — ações da venda vão às rotas dedicadas (LAC-A)', () => {
  it('Pagar em venda Finalized sinaliza onRequestPay e NUNCA chama o PUT genérico', () => {
    const { onUpdateSale, onRequestPay } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }));
    expect(onRequestPay).toHaveBeenCalledTimes(1);
    expect(onRequestPay.mock.calls[0][0]).toMatchObject({ id: 'sale-1' });
    // A guarda central: o caminho antigo (patch {paymentStatus:'Paid'} via PUT) morreu.
    expect(onUpdateSale).not.toHaveBeenCalled();
  });

  it('Cancelar sinaliza onRequestCancel (roteamento Draft×Finalized é da SalesView)', () => {
    const { onUpdateSale, onRequestCancel } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
    expect(onUpdateSale).not.toHaveBeenCalled();
  });

  it('Devolver existe para venda Finalized e sinaliza onRequestReturn', () => {
    const { onRequestReturn } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(onRequestReturn).toHaveBeenCalledTimes(1);
  });

  it('gates de render: Draft NÃO mostra Pagar nem Devolver (o settlement do backend recusa Draft)', () => {
    renderPanel(sale({ status: 'Draft' }));
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver' })).toBeNull();
    // Finalizar e Cancelar continuam disponíveis para Draft.
    expect(screen.getByRole('button', { name: 'Finalizar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('gates de render: venda Returned não mostra nenhuma ação de transição', () => {
    renderPanel(sale({ status: 'Returned', paymentStatus: 'Paid' }));
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });
});

describe('SaleDetailPanel — emissão de NFS-e (FE-INCR-DFE item 15–16)', () => {
  it('venda Finalized com o emissor habilitado: botão "Emitir NFS-e" e a seção "Documentos fiscais" da venda', async () => {
    renderPanel(sale());
    expect(await screen.findByRole('button', { name: 'Emitir NFS-e' })).toBeTruthy();
    expect(await screen.findByText('Nenhum documento fiscal emitido para esta venda.')).toBeTruthy();
    expect(dfeService.listBySale).toHaveBeenCalledWith('unit-1', 'sale-1');
  });

  it('venda não finalizada (Draft): sem botão e sem a seção', async () => {
    renderPanel(sale({ status: 'Draft' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: 'Emitir NFS-e' })).toBeNull();
    expect(screen.queryByTestId('fiscal-documents-section')).toBeNull();
  });
});

// GAP-MAP L-PR2-R1 (review independente do #547, 06/10): o EmitNfseButton não tem `key` por venda — a prévia
// pedida na venda A sobrevive à troca para a B, e "Confirmar" chama emit({ saleId: B }) com os totais de A.
// Teste-guarda: VERMELHO até a sessão de correção. Autorização: dono em chat 06/10.
describe('SaleDetailPanel — emissão de NFS-e ao trocar de venda (GAP-MAP L-PR2-R1)', () => {
  it('a prévia pedida na venda A não abre a confirmação de emissão depois que o painel passa para a venda B', async () => {
    let resolvePreview: (v: unknown) => void = () => {};
    vi.mocked(dfeService.preview).mockImplementation(() => new Promise((r) => { resolvePreview = r; }) as never);
    const props = (s: SaleRecord) => ({
      sale: s, table: null, items: [], computedSubtotal: 0, isUpdating: null,
      productNameMap: {}, serviceNameMap: {}, customerNameMap: {}, unitNameMap: {},
      onUpdateSale: vi.fn(async () => {}), onRequestPay: vi.fn(), onRequestCancel: vi.fn(), onRequestReturn: vi.fn(),
    });
    const { rerender } = render(<SaleDetailPanel {...props(sale({ id: 'sale-A' }))} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir NFS-e' }));
    expect(dfeService.preview).toHaveBeenCalledWith({ unitId: 'unit-1', saleId: 'sale-A', kind: 'NFSE' });

    // O operador seleciona outra venda com a prévia de A ainda em voo; depois ela chega.
    rerender(<SaleDetailPanel {...props(sale({ id: 'sale-B', totalAmount: 999 }))} />);
    await act(async () => {
      resolvePreview({
        ok: true, faltantes: [], competenciaAlerta: false, payloads: [{}],
        tieOut: { vServCents: '10000', ledgerCents: '10000', matches: true },
      });
    });

    // Com a prévia de A na tela da B, "Confirmar" emitiria a NFS-e da venda B com os totais de A.
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
  });
});
