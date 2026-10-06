import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { CancelamentoManualModal } from '../CancelamentoManualModal';
import { RejeicaoManualModal } from '../RejeicaoManualModal';
import { doc } from './fixtures';

/**
 * CancelamentoManualModal (item 23) e RejeicaoManualModal (item 22): sem arquivo (ou com justificativa curta) o
 * cancelamento fica desabilitado; o motivo sai como número do DTO (o service o manda como texto — dfe.service.test);
 * 422 aparece íntegro; a instrução "Cancelar, não Substituir" está lá. Rejeição: submit vazio bloqueado, `errors` não
 * vazio, linhas extras.
 */
const xmlFile = () => new File(['<evento/>'], 'evento.xml', { type: 'text/xml' });
const MOTIVO_OK = 'Serviço não foi prestado ao cliente';

describe('CancelamentoManualModal', () => {
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('sem arquivo o botão fica desabilitado, mesmo com motivo válido; com arquivo e justificativa curta também', () => {
    render(<CancelamentoManualModal onClose={vi.fn()} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Registrar cancelamento' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: MOTIVO_OK } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('cancelamento-xml-file'), { target: { files: [xmlFile()] } });
    expect(submit).toBeEnabled();
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'curto' } });
    expect(submit).toBeDisabled();
    expect(screen.getByTestId('xmotivo-counter')).toHaveTextContent('5/255');
    expect(within(dialog).getByText(/não "Substituir"/)).toBeInTheDocument();
  });

  it('envia motivo, justificativa e o XML do evento', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, doc: doc({ status: 'CANCELLED' }) });
    const onClose = vi.fn();
    render(<CancelamentoManualModal onClose={onClose} onSubmit={onSubmit} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: MOTIVO_OK } });
    fireEvent.change(screen.getByTestId('cancelamento-xml-file'), { target: { files: [xmlFile()] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar cancelamento' }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    const [fields, xml] = onSubmit.mock.calls[0] as [{ cMotivo: number; xMotivo: string }, File];
    expect(fields).toEqual({ cMotivo: 2, xMotivo: MOTIVO_OK });
    expect(xml.name).toBe('evento.xml');
  });

  it('422 DFE_EVENTO_DIVERGENTE: mensagem íntegra e o modal continua aberto', async () => {
    const msg = 'O evento do XML não é desta nota (chave diverge).';
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: msg });
    const onClose = vi.fn();
    render(<CancelamentoManualModal onClose={onClose} onSubmit={onSubmit} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: MOTIVO_OK } });
    fireEvent.change(screen.getByTestId('cancelamento-xml-file'), { target: { files: [xmlFile()] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar cancelamento' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(msg);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('RejeicaoManualModal', () => {
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('submit vazio bloqueado; linha incompleta também', () => {
    render(<RejeicaoManualModal onClose={vi.fn()} onSubmit={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Registrar rejeição' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Código 1'), { target: { value: 'E0001' } });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Mensagem 1'), { target: { value: 'CNPJ inválido' } });
    expect(submit).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: /Adicionar erro/ }));
    expect(submit).toBeDisabled();
  });

  it('envia as linhas aparadas, na ordem', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, doc: doc({ status: 'REJECTED' }) });
    render(<RejeicaoManualModal onClose={vi.fn()} onSubmit={onSubmit} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Código 1'), { target: { value: ' E0001 ' } });
    fireEvent.change(within(dialog).getByLabelText('Mensagem 1'), { target: { value: 'CNPJ inválido' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Adicionar erro/ }));
    fireEvent.change(within(dialog).getByLabelText('Código 2'), { target: { value: 'E0312' } });
    fireEvent.change(within(dialog).getByLabelText('Mensagem 2'), { target: { value: 'Alíquota inválida' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar rejeição' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual([
      { code: 'E0001', message: 'CNPJ inválido' },
      { code: 'E0312', message: 'Alíquota inválida' },
    ]);
  });
});
