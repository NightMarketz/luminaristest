import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { LalurParteBModal, formatCnpj, isCreatedInYear } from '../LalurParteBModal';
import { lalurService, type LalurParteBAccount } from '../../../../lib/services/lalur.service';

/**
 * LalurParteBModal (item 5): the body sent is EXACTLY `CreateLalurParteBAccountSchema`; `|` in codCtaB
 * is blocked in the FE; `parseBrl` (1.234,56 ⇒ 123456); REGRA_DT_AP_ZERO zeroes and disables the opening
 * balance when dtCriacao falls in the selected exercício; cnpjSitEsp = 14 digits (mask stripped); the
 * PARTEB_PADRAO catalog is loaded per tributo; edit mode locks the M010 key and PATCHes with explicit null.
 */
vi.mock('../../../../lib/services/lalur.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/lalur.service')>();
  return {
    ...actual,
    lalurService: {
      getParteBPadrao: vi.fn(),
      createParteB: vi.fn(),
      updateParteB: vi.fn(),
    },
  };
});

const padrao = [
  { codigo: '1000', descricao: 'Prejuízo Fiscal Operacional - Atividade Geral', tributo: 'I' as const },
  { codigo: '1003', descricao: 'BC negativa CSLL', tributo: 'C' as const },
];

async function fillRequired(codPbRfb = '1000') {
  fireEvent.change(screen.getByPlaceholderText('PF-2024'), { target: { value: 'PF-2024' } });
  fireEvent.change(screen.getByLabelText('Descrição (DESC_CTA_LAL)'), { target: { value: 'Prejuízo fiscal 2024' } });
  const combo = screen.getByRole('combobox', { name: 'Código padrão RFB (COD_PB_RFB)' });
  await waitFor(() => expect(lalurService.getParteBPadrao).toHaveBeenCalled());
  fireEvent.change(combo, { target: { value: codPbRfb } });
  fireEvent.blur(combo);
}

describe('LalurParteBModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(lalurService.getParteBPadrao).mockResolvedValue(padrao);
    vi.mocked(lalurService.createParteB).mockResolvedValue({} as LalurParteBAccount);
    vi.mocked(lalurService.updateParteB).mockResolvedValue({} as LalurParteBAccount);
  });

  it('create: body is exactly the M010 DTO — parseBrl 1.234,56 ⇒ 123456, cnpj mask stripped, optional keys omitted when empty', async () => {
    const onSuccess = vi.fn();
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={onSuccess} />);
    expect(lalurService.getParteBPadrao).toHaveBeenCalledWith('u1', 'I'); // no year — the write path applies no vigência

    await fillRequired();
    fireEvent.change(screen.getByLabelText(/^Data de criação/), { target: { value: '2024-12-31' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1.234,56' } });
    fireEvent.change(screen.getByPlaceholderText('00.000.000/0000-00'), { target: { value: '12.345.678/0001-90' } });
    expect(screen.getByPlaceholderText('00.000.000/0000-00')).toHaveValue('12.345.678/0001-90');

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(lalurService.createParteB).toHaveBeenCalledWith({
      unitId: 'u1',
      codCtaB: 'PF-2024',
      descricao: 'Prejuízo fiscal 2024',
      dtCriacao: '2024-12-31',
      codPbRfb: '1000',
      codTributo: 'I',
      saldoIniCents: 123456,
      indSaldoIni: 'D',
      cnpjSitEsp: '12345678000190',
    });
  });

  it('REGRA_DT_AP_ZERO: dtCriacao inside the exercício ⇒ saldo inicial 0 and disabled, sent as 0', async () => {
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={() => {}} />);
    await fillRequired();
    fireEvent.change(screen.getByLabelText(/^Data de criação/), { target: { value: '2025-06-30' } });
    const saldo = screen.getByPlaceholderText('0,00');
    expect(saldo).toBeDisabled();
    expect(saldo).toHaveValue('0,00');
    expect(screen.getByText(/REGRA_DT_AP_ZERO/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createParteB).toHaveBeenCalled());
    expect(vi.mocked(lalurService.createParteB).mock.calls[0][0].saldoIniCents).toBe(0);
  });

  it('"|" in codCtaB blocks the submit with an inline message (SPED field separator)', async () => {
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={() => {}} />);
    await fillRequired();
    fireEvent.change(screen.getByPlaceholderText('PF-2024'), { target: { value: 'PF|2024' } });
    expect(screen.getByRole('alert')).toHaveTextContent('não pode conter "|"');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(lalurService.createParteB).not.toHaveBeenCalled();
  });

  it('switching the tributo reloads PARTEB_PADRAO for that tributo and clears the chosen code', async () => {
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={() => {}} />);
    await fillRequired();
    fireEvent.click(screen.getByLabelText('C — CSLL (e-Lacs)'));
    await waitFor(() => expect(lalurService.getParteBPadrao).toHaveBeenLastCalledWith('u1', 'C'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(); // codPbRfb cleared
  });

  it('server 400 is shown in full through resolveError', async () => {
    vi.mocked(lalurService.createParteB).mockRejectedValue({ success: false, error: "COD_PB_RFB '1003' não existe na tabela padrão da Parte B para o tributo I (Manual p.237, REGRA_M010_COD_PB_RFB_TRIBUTO).", status: 400 });
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={() => {}} />);
    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('REGRA_M010_COD_PB_RFB_TRIBUTO'));
  });

  it('403 on save calls onForbidden (item 11 — the panel hides its write buttons)', async () => {
    vi.mocked(lalurService.createParteB).mockRejectedValue({ success: false, error: 'Você não tem permissão para gerir o e-Lalur.', status: 403 });
    const onForbidden = vi.fn();
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} onSuccess={() => {}} onForbidden={onForbidden} />);
    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert')).toHaveTextContent('não tem permissão');
  });

  it('edit: codCtaB/codTributo locked ("arquive e recrie"); PATCH carries explicit null for cleared optionals', async () => {
    const editing: LalurParteBAccount = {
      id: 'b1', userId: 'o1', unitId: 'u1', codCtaB: 'PF-2024', descricao: 'Prejuízo fiscal 2024',
      dtCriacao: '2024-12-31T00:00:00.000Z', codPbRfb: '1000', dtLimite: '2030-12-31T00:00:00.000Z',
      codTributo: 'I', saldoIniCents: 500000, indSaldoIni: 'D', cnpjSitEsp: null,
      createdById: null, createdAt: '', updatedAt: '', deletedAt: null,
    };
    render(<LalurParteBModal isOpen onClose={() => {}} unitId="u1" year={2025} editing={editing} onSuccess={() => {}} />);
    expect(screen.queryByPlaceholderText('PF-2024')).toBeNull();
    expect(screen.getAllByText('Não muda — arquive e recrie.').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^Data de criação/)).toHaveValue('2024-12-31'); // no UTC shift
    expect(screen.getByPlaceholderText('0,00')).toHaveValue('5000,00');

    fireEvent.change(screen.getByLabelText('Data-limite (DT_LIM_LAL) — opcional'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.updateParteB).toHaveBeenCalled());
    expect(lalurService.updateParteB).toHaveBeenCalledWith('b1', {
      unitId: 'u1',
      descricao: 'Prejuízo fiscal 2024',
      dtCriacao: '2024-12-31',
      codPbRfb: '1000',
      dtLimite: null,
      saldoIniCents: 500000,
      indSaldoIni: 'D',
      cnpjSitEsp: null,
    });
  });

  it('helpers: formatCnpj masks progressively; isCreatedInYear is inclusive on both ends', () => {
    expect(formatCnpj('12345678000190')).toBe('12.345.678/0001-90');
    expect(formatCnpj('123')).toBe('12.3');
    expect(isCreatedInYear('2025-01-01', 2025)).toBe(true);
    expect(isCreatedInYear('2025-12-31', 2025)).toBe(true);
    expect(isCreatedInYear('2024-12-31', 2025)).toBe(false);
  });
});
