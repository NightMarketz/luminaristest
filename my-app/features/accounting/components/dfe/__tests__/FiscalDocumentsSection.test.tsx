import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { FiscalDocumentsSection } from '../FiscalDocumentsSection';
import { dfeService, type FiscalDocumentView, type Releitura } from '../../../../../lib/services/dfe.service';
import { accountingService } from '../../../../../lib/services/accounting.service';
import { doc, ficha } from './fixtures';

/**
 * FiscalDocumentsSection (FE-INCR-DFE itens 16, 17, 21, 22, 24, 25): ações certas para cada um dos 6 status; parceiro
 * não manual sem ação; regra de erro (relê o documento e desenha o que voltou — caso F6); releitura vinda do upload e,
 * depois de recarregar, do GET; 422 com status inalterado; reenvio abre a ficha da tentativa 2; downloads só com id.
 */
vi.mock('../../../../../lib/services/dfe.service', () => ({
  dfeService: {
    getStatus: vi.fn(),
    listBySale: vi.fn(),
    get: vi.fn(),
    ficha: vi.fn(),
    reenviar: vi.fn(),
    rejeicaoManual: vi.fn(),
    retornoManual: vi.fn(),
    cancelamentoManual: vi.fn(),
  },
}));
vi.mock('../../../../../lib/services/accounting.service', () => ({
  accountingService: { downloadDocumentAttachment: vi.fn() },
}));

const divergente: Releitura = {
  status: 'DIVERGENTE',
  divergencias: [{ campo: 'vServ', grupo: 'conteudo', tipo: 'diferente', enviado: '123456', autorizado: '123400' }],
};

const card = (id = 'd1') => screen.getByTestId(`fiscal-doc-${id}`);

function renderSection(docs: FiscalDocumentView[], emitted: FiscalDocumentView[] | null = null) {
  vi.mocked(dfeService.listBySale).mockResolvedValue(docs);
  return render(<FiscalDocumentsSection unitId="u1" saleId="s1" emitted={emitted} />);
}

function pickXml(container: HTMLElement) {
  const input = within(container).getByTestId('retorno-xml-file') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['<NFSe/>'], 'nota.xml', { type: 'text/xml' })] } });
  fireEvent.click(within(container).getByRole('button', { name: /Registrar retorno/ }));
}

describe('FiscalDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dfeService.getStatus).mockResolvedValue({ enabled: true, partner: 'manual', ambiente: 'homologacao' });
    vi.mocked(dfeService.ficha).mockResolvedValue(ficha());
  });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('mostra as ações certas para cada um dos 6 status (parceiro manual)', async () => {
    renderSection([
      doc({ id: 'sent', status: 'SENT' }),
      doc({ id: 'proc', status: 'PROCESSING' }),
      doc({ id: 'rej', status: 'REJECTED', errors: [{ code: 'E0001', message: 'CNPJ inválido' }] }),
      doc({ id: 'auth', status: 'AUTHORIZED', ambiente: 'producao', nNFSe: '77', xmlAttachmentId: 'ax', pdfAttachmentId: 'ap' }),
      doc({ id: 'div', status: 'AUTHORIZED_DIVERGENT', pendencias: ['releitura_divergente'] }),
      doc({ id: 'can', status: 'CANCELLED' }),
    ]);
    await screen.findByTestId('fiscal-doc-sent');
    for (const id of ['sent', 'proc']) {
      const c = card(id);
      expect(within(c).getByRole('button', { name: /Ficha/ })).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: /Registrar retorno/ })).toBeInTheDocument();
      expect(within(c).getByRole('button', { name: /Registrar rejeição/ })).toBeInTheDocument();
      expect(within(c).queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument();
    }
    expect(within(card('sent')).getByTestId('fiscal-doc-status')).toHaveTextContent('Aguardando retorno do portal');
    const rej = card('rej');
    expect(within(rej).getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
    expect(within(rej).getByText('E0001')).toBeInTheDocument();
    expect(within(rej).queryByRole('button', { name: /Ficha/ })).not.toBeInTheDocument();
    const auth = card('auth');
    expect(within(auth).getByRole('button', { name: /Baixar XML/ })).toBeInTheDocument();
    expect(within(auth).getByRole('button', { name: /Baixar DANFSe/ })).toBeInTheDocument();
    expect(within(auth).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    const div = card('div');
    expect(within(div).getByTestId('fiscal-doc-status')).toHaveTextContent('Autorizada com divergência');
    expect(within(div).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(div).getByText(/só sai cancelando/)).toBeInTheDocument();
    const can = card('can');
    expect(within(can).queryAllByRole('button')).toHaveLength(0);
    expect(within(can).getByText(/emita de novo pelo botão/)).toBeInTheDocument();
    expect(dfeService.listBySale).toHaveBeenCalledWith('u1', 's1');
  });

  it("parceiro não manual (partner 'null'): só o status, sem ação manual", async () => {
    renderSection([doc({ id: 'auto', partner: 'null', status: 'SENT' })]);
    const c = await screen.findByTestId('fiscal-doc-auto');
    expect(within(c).queryAllByRole('button')).toHaveLength(0);
    expect(within(c).getByText('Emissão automática pelo parceiro.')).toBeInTheDocument();
  });

  it('downloads só com id: xmlAttachmentId null ⇒ sem botão; com id baixa nfse-<nNFSe>.xml', async () => {
    renderSection([
      doc({ id: 'semId', status: 'AUTHORIZED' }),
      doc({ id: 'comId', status: 'AUTHORIZED', ambiente: 'producao', nNFSe: '77', xmlAttachmentId: 'ax' }),
    ]);
    await screen.findByTestId('fiscal-doc-semId');
    expect(within(card('semId')).queryByRole('button', { name: /Baixar/ })).not.toBeInTheDocument();
    fireEvent.click(within(card('comId')).getByRole('button', { name: /Baixar XML/ }));
    expect(accountingService.downloadDocumentAttachment).toHaveBeenCalledWith('ax', 'u1', 'nfse-77.xml');
    expect(within(card('comId')).queryByRole('button', { name: /Baixar DANFSe/ })).not.toBeInTheDocument();
  });

  it('retorno 200 DIVERGENTE → tabela com 1 linha; recarregar → a mesma tabela vinda do GET (view.releitura)', async () => {
    vi.mocked(dfeService.retornoManual).mockResolvedValue(doc({ status: 'AUTHORIZED_DIVERGENT', releitura: divergente, pendencias: ['releitura_divergente'] }));
    const first = renderSection([doc()]);
    await screen.findByTestId('fiscal-doc-d1');
    pickXml(card());
    const table = await screen.findByTestId('releitura-divergente');
    expect(within(table).getAllByRole('row')).toHaveLength(2); // cabeçalho + 1 divergência
    expect(within(table).getByText('Valor do serviço')).toBeInTheDocument();
    expect(dfeService.retornoManual).toHaveBeenCalledWith('d1', 'u1', expect.any(File), undefined);
    first.unmount();

    // recarregar: o GET da lista já traz a releitura persistida (PR-1)
    renderSection([doc({ status: 'AUTHORIZED_DIVERGENT', releitura: divergente, pendencias: ['releitura_divergente'] })]);
    const again = await screen.findByTestId('releitura-divergente');
    expect(within(again).getAllByRole('row')).toHaveLength(2);
    expect(within(again).getByText('123456')).toBeInTheDocument();
    expect(within(again).getByText('123400')).toBeInTheDocument();
  });

  it('releitura com toma.doc divergente: o valor ausente aparece como dado pessoal, nunca o documento', async () => {
    renderSection([doc({ status: 'AUTHORIZED_DIVERGENT', releitura: { status: 'DIVERGENTE', divergencias: [{ campo: 'toma.doc', grupo: 'conteudo', tipo: 'diferente' }] } })]);
    const table = await screen.findByTestId('releitura-divergente');
    expect(within(table).getAllByText('— (dado pessoal, não exibido)')).toHaveLength(2);
  });

  it('retorno 422 DFE_IDENTIDADE_DIVERGENTE → mensagem íntegra e o documento continua SENT', async () => {
    const msg = 'O XML não é desta nota: prest.CNPJ diverge do enviado.';
    vi.mocked(dfeService.retornoManual).mockRejectedValue({ status: 422, code: 'DFE_IDENTIDADE_DIVERGENTE', error: msg });
    vi.mocked(dfeService.get).mockResolvedValue(doc({ status: 'SENT' }));
    renderSection([doc()]);
    await screen.findByTestId('fiscal-doc-d1');
    pickXml(card());
    expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(dfeService.get).toHaveBeenCalledWith('d1', 'u1');
    expect(within(card()).getByTestId('fiscal-doc-status')).toHaveTextContent('Aguardando retorno do portal');
  });

  it('caso F6: upload → 500 → o GET devolve AUTHORIZED em produção sem XML ⇒ aviso e status autorizado, não "erro"', async () => {
    vi.mocked(dfeService.retornoManual).mockRejectedValue({ status: 500, error: 'Internal server error', message: 'falha ao gravar anexo' });
    vi.mocked(dfeService.get).mockResolvedValue(doc({ status: 'AUTHORIZED', ambiente: 'producao', xmlAttachmentId: null, nNFSe: '88' }));
    renderSection([doc({ ambiente: 'producao' })]);
    await screen.findByTestId('fiscal-doc-d1');
    pickXml(card());
    expect(await screen.findByTestId('fiscal-doc-xml-nao-guardado')).toBeInTheDocument();
    expect(within(card()).getByTestId('fiscal-doc-status')).toHaveTextContent('Autorizada');
    expect(screen.queryByText('falha ao gravar anexo')).not.toBeInTheDocument();
  });

  it('cancelamento → 500, mas o GET devolve CANCELLED: o comando pegou — o modal fecha e não mostra erro', async () => {
    vi.mocked(dfeService.cancelamentoManual).mockRejectedValue({ status: 500, error: 'Internal server error', message: 'timeout depois do commit' });
    vi.mocked(dfeService.get).mockResolvedValue(doc({ status: 'CANCELLED' }));
    renderSection([doc({ status: 'AUTHORIZED' })]);
    await screen.findByTestId('fiscal-doc-d1');
    fireEvent.click(within(card()).getByRole('button', { name: 'Cancelar' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Serviço não foi prestado ao cliente' } });
    fireEvent.change(screen.getByTestId('cancelamento-xml-file'), { target: { files: [new File(['<e/>'], 'evento.xml', { type: 'text/xml' })] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar cancelamento' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(card()).getByTestId('fiscal-doc-status')).toHaveTextContent('Cancelada');
    expect(screen.queryByText('timeout depois do commit')).not.toBeInTheDocument();
  });

  it('409 DFE_STATUS_INVALIDO no reenvio: relê o documento e mostra a mensagem se nada mudou', async () => {
    vi.mocked(dfeService.reenviar).mockRejectedValue({ status: 409, code: 'DFE_STATUS_INVALIDO', error: 'Documento não está REJECTED.' });
    vi.mocked(dfeService.get).mockResolvedValue(doc({ status: 'REJECTED' }));
    renderSection([doc({ status: 'REJECTED' })]);
    await screen.findByTestId('fiscal-doc-d1');
    fireEvent.click(within(card()).getByRole('button', { name: /Reenviar/ }));
    expect(await screen.findByText('Documento não está REJECTED.')).toBeInTheDocument();
    expect(dfeService.get).toHaveBeenCalledWith('d1', 'u1');
  });

  it('403 da policy aparece íntegro', async () => {
    vi.mocked(dfeService.reenviar).mockRejectedValue({ status: 403, error: 'Você não tem permissão para emitir documento fiscal.' });
    vi.mocked(dfeService.get).mockResolvedValue(doc({ status: 'REJECTED' }));
    renderSection([doc({ status: 'REJECTED' })]);
    await screen.findByTestId('fiscal-doc-d1');
    fireEvent.click(within(card()).getByRole('button', { name: /Reenviar/ }));
    expect(await screen.findByText('Você não tem permissão para emitir documento fiscal.')).toBeInTheDocument();
  });

  it('reenviar → abre a ficha da tentativa nova (currentAttemptNo 2)', async () => {
    vi.mocked(dfeService.reenviar).mockResolvedValue(doc({ status: 'SENT', currentAttemptNo: 2 }));
    vi.mocked(dfeService.ficha).mockResolvedValue(ficha({ currentAttemptNo: 2 }));
    renderSection([doc({ status: 'REJECTED' })]);
    await screen.findByTestId('fiscal-doc-d1');
    fireEvent.click(within(card()).getByRole('button', { name: /Reenviar/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/tentativa 2/)).toBeInTheDocument();
    expect(dfeService.reenviar).toHaveBeenCalledWith('d1', { unitId: 'u1' });
    await within(dialog).findByTestId('ficha-section-pessoas');
  });

  it('rejeição: o modal envia errors não vazio e o cartão vira REJECTED', async () => {
    vi.mocked(dfeService.rejeicaoManual).mockResolvedValue(doc({ status: 'REJECTED', errors: [{ code: 'E0312', message: 'Alíquota inválida' }] }));
    renderSection([doc()]);
    await screen.findByTestId('fiscal-doc-d1');
    fireEvent.click(within(card()).getByRole('button', { name: /Registrar rejeição/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código 1'), { target: { value: 'E0312' } });
    fireEvent.change(within(dialog).getByLabelText('Mensagem 1'), { target: { value: 'Alíquota inválida' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar rejeição' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(dfeService.rejeicaoManual).toHaveBeenCalledWith('d1', { unitId: 'u1', errors: [{ code: 'E0312', message: 'Alíquota inválida' }] });
    expect(within(card()).getByTestId('fiscal-doc-status')).toHaveTextContent('Rejeitada');
  });

  it('documentos recém-emitidos entram na lista e abrem a ficha do 1º', async () => {
    renderSection([], [doc({ id: 'n1' }), doc({ id: 'n2', cTribNac: '060102' })]);
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByTestId('ficha-section-pessoas');
    expect(dfeService.ficha).toHaveBeenCalledWith('n1', 'u1');
    expect(screen.getByTestId('fiscal-doc-n1')).toBeInTheDocument();
    expect(screen.getByTestId('fiscal-doc-n2')).toBeInTheDocument();
  });
});
