import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RetornoManualForm } from '../RetornoManualForm';
import { ReleituraView } from '../ReleituraView';
import { doc } from './fixtures';

/**
 * RetornoManualForm + ReleituraView (FE-INCR-DFE item 21): sem XML o envio fica desabilitado; o DANFSe é opcional e
 * vai junto quando escolhido; erro aparece íntegro; IGUAL em verde; DIVERGENTE em tabela; PII sem valor.
 */
const xmlFile = () => new File(['<NFSe/>'], 'nota.xml', { type: 'text/xml' });
const pdfFile = () => new File(['%PDF'], 'danfse.pdf', { type: 'application/pdf' });

describe('RetornoManualForm', () => {
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('sem XML o botão de enviar fica desabilitado', () => {
    render(<RetornoManualForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Registrar retorno/ })).toBeDisabled();
  });

  it('envia o XML e o DANFSe escolhidos', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, doc: doc({ status: 'AUTHORIZED' }) });
    render(<RetornoManualForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('retorno-xml-file'), { target: { files: [xmlFile()] } });
    fireEvent.change(screen.getByTestId('retorno-pdf-file'), { target: { files: [pdfFile()] } });
    expect(screen.getByRole('button', { name: /nota\.xml/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Registrar retorno/ }));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /Registrar retorno/ })).toBeDisabled());
    const [xml, pdf] = onSubmit.mock.calls[0] as [File, File];
    expect(xml.name).toBe('nota.xml');
    expect(pdf.name).toBe('danfse.pdf');
    // sucesso limpa a escolha
    expect(await screen.findByRole('button', { name: /Selecionar XML da NFS-e/ })).toBeInTheDocument();
  });

  it('erro do comando aparece íntegro', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: 'NFSE_INVALIDA: XML sem assinatura.' });
    render(<RetornoManualForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('retorno-xml-file'), { target: { files: [xmlFile()] } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar retorno/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('NFSE_INVALIDA: XML sem assinatura.');
    expect(onSubmit.mock.calls[0][1]).toBeUndefined();
  });
});

describe('ReleituraView', () => {
  afterEach(() => cleanup());

  it('IGUAL: faixa verde, sem tabela', () => {
    render(<ReleituraView releitura={{ status: 'IGUAL', divergencias: [] }} />);
    expect(screen.getByTestId('releitura-igual')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('DIVERGENTE: uma linha por campo; ausente não-PII mostra "ausente", PII mostra "dado pessoal"', () => {
    render(
      <ReleituraView
        releitura={{
          status: 'DIVERGENTE',
          divergencias: [
            { campo: 'cNBS', grupo: 'conteudo', tipo: 'ausente', enviado: '123456789' },
            { campo: 'toma.doc', grupo: 'conteudo', tipo: 'diferente' },
          ],
        }}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Item da NBS');
    expect(rows[1]).toHaveTextContent('123456789');
    expect(rows[1]).toHaveTextContent('— (ausente)');
    expect(rows[2]).toHaveTextContent('CPF/CNPJ do tomador');
    expect(rows[2]).toHaveTextContent('— (dado pessoal, não exibido)');
  });
});
