import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { LalurMovementModal, historicoIssue } from '../LalurMovementModal';
import { lalurService, type LalurParteBAccount, type LalurParteBMovement } from '../../../../lib/services/lalur.service';

/**
 * LalurMovementModal (FE-INCR-LALUR-PR2, PLANO-ONDA1 §4.1 itens 3–5): PF/BC não renderizam contrapartida
 * (REGRA_NAO_PREENCHER_CTP, p.269) e a chave não vai no body; CR/DB oferecem só contas vivas do MESMO
 * tributo, nunca a própria (REGRA_MESMO_TRIBUTO); histórico 1–500 sem '|'; processos M415 na criação;
 * edição trava conta/trimestre e NÃO envia `processos` (lacuna: a listagem não os devolve).
 */
vi.mock('../../../../lib/services/lalur.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/lalur.service')>();
  return { ...actual, lalurService: { createMovement: vi.fn(), updateMovement: vi.fn() } };
});

const acc = (o: Partial<LalurParteBAccount>): LalurParteBAccount => ({
  id: 'b1', userId: 'o', unitId: 'u1', codCtaB: 'PF-2024', descricao: 'Prejuízo', dtCriacao: '2024-12-31T00:00:00.000Z',
  codPbRfb: '1000', dtLimite: null, codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D', cnpjSitEsp: null,
  createdById: null, createdAt: '', updatedAt: '', deletedAt: null, ...o,
});
const accounts = [
  acc({}),
  acc({ id: 'b2', codCtaB: 'OUTRA-I' }),
  acc({ id: 'b3', codCtaB: 'CSLL-C', codTributo: 'C' }),
  acc({ id: 'b4', codCtaB: 'ARQ-I', deletedAt: '2025-01-01T00:00:00.000Z' }),
];

function renderModal(editing: LalurParteBMovement | null = null) {
  const onSuccess = vi.fn();
  render(<LalurMovementModal isOpen onClose={vi.fn()} unitId="u1" year={2025} parteBAccounts={accounts} editing={editing} onSuccess={onSuccess} />);
  return { onSuccess };
}
const select = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillCreate(indicador: string) {
  select('Conta da Parte B (COD_CTA_B)', 'b1');
  select('Exercício / trimestre', 'T02');
  select('Indicador (IND_VAL_LAN_LALB_PB)', indicador);
  fireEvent.change(screen.getByLabelText('Valor (VAL_LAN_LALB_PB)'), { target: { value: '1.234,56' } });
  fireEvent.change(screen.getByLabelText('Histórico (HIST_LAN_LALB, até 500)'), { target: { value: ' ajuste ' } });
  select('Lançamento anterior (IND_LAN_ANT)', 'N');
}
const ctpLabel = 'Contrapartida (COD_CTA_B_CTP) — opcional, mesmo tributo';

describe('LalurMovementModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(lalurService.createMovement).mockResolvedValue({} as LalurParteBMovement);
    vi.mocked(lalurService.updateMovement).mockResolvedValue({} as LalurParteBMovement);
  });

  it.each([
    ['CR', true, true],
    ['DB', true, false],
    ['PF', false, false],
    ['BC', false, false],
  ])('indicador %s: contrapartida renderizada=%s; contrapartidaId no body=%s', async (indicador, rendered, withCtp) => {
    renderModal();
    fillCreate(indicador);
    expect(!!screen.queryByLabelText(ctpLabel)).toBe(rendered);
    if (withCtp) select(ctpLabel, 'b2');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createMovement).toHaveBeenCalledTimes(1));
    const body = vi.mocked(lalurService.createMovement).mock.calls[0][0];
    expect('contrapartidaId' in body).toBe(withCtp);
    expect(body).toMatchObject({ unitId: 'u1', parteBId: 'b1', year: 2025, quarter: 'T02', indicador, valorCents: 123456, historico: 'ajuste', indLanAnt: 'N' });
    expect('processos' in body).toBe(false);
  });

  it('contrapartida: só contas vivas do mesmo tributo, nunca a própria conta', () => {
    renderModal();
    fillCreate('CR');
    const options = Array.from((screen.getByLabelText(ctpLabel) as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(['', 'b2']); // sem b1 (própria), b3 (tributo C), b4 (arquivada)
  });

  it('histórico com "|" é bloqueado antes do envio', () => {
    renderModal();
    fillCreate('CR');
    fireEvent.change(screen.getByLabelText('Histórico (HIST_LAN_LALB, até 500)'), { target: { value: 'a|b' } });
    expect(screen.getByRole('alert').textContent).toMatch(/separador de campo/);
    expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(historicoIssue('x'.repeat(501))).toBe('long');
    expect(historicoIssue('  ')).toBe('empty');
  });

  it('processos M415 na criação: aparados e enviados', async () => {
    renderModal();
    fillCreate('PF');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar processo/ }));
    select('Tipo do processo', '2');
    fireEvent.change(screen.getByLabelText('Número do processo'), { target: { value: ' 0001234 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createMovement).toHaveBeenCalled());
    expect(vi.mocked(lalurService.createMovement).mock.calls[0][0].processos).toEqual([{ indProc: '2', numProc: '0001234' }]);
  });

  it('edição: conta e trimestre travados; PF manda contrapartidaId null; processos NÃO vão no body', async () => {
    const editing: LalurParteBMovement = {
      id: 'm1', unitId: 'u1', parteBId: 'b1', year: 2025, quarter: 'T01', codTributo: 'I', valorCents: 1000,
      indicador: 'CR', contrapartidaId: 'b2', historico: 'h', indLanAnt: 'N', origem: 'user',
      createdAt: '', updatedAt: '', deletedAt: null,
    };
    renderModal(editing);
    expect(screen.queryByRole('combobox', { name: /Conta da Parte B/ })).toBeNull();
    expect(screen.getAllByText('Não muda — arquive e recrie.')).toHaveLength(2);
    select('Indicador (IND_VAL_LAN_LALB_PB)', 'PF');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.updateMovement).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(lalurService.updateMovement).mock.calls[0];
    expect(id).toBe('m1');
    expect(body).toEqual({ unitId: 'u1', valorCents: 1000, indicador: 'PF', contrapartidaId: null, historico: 'h', indLanAnt: 'N' });
  });
});
