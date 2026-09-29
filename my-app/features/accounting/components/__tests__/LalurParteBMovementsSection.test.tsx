import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { LalurParteBMovementsSection, closingRules } from '../LalurParteBMovementsSection';
import {
  lalurService,
  type LalurParteBAccount,
  type LalurParteBBalancesDiagnostic,
  type LalurParteBMovement,
} from '../../../../lib/services/lalur.service';

/**
 * LalurParteBMovementsSection (FE-INCR-LALUR-PR2, PLANO-ONDA1 §4.1 itens 2 e 6–10): ordem limpa do
 * fechamento (`LalurParteBPeriodSchema`), movimento origem='system' só arquiva, divergência em vermelho,
 * aviso X4-14 com link para a Parte A, 403 esconde escrita, diagnóstico recarrega depois de cada ação.
 */
vi.mock('../../../../lib/services/lalur.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/lalur.service')>();
  return {
    ...actual,
    lalurService: {
      listMovements: vi.fn(), getParteBBalances: vi.fn(), archiveMovement: vi.fn(),
      closeParteB: vi.fn(), reopenParteB: vi.fn(), createMovement: vi.fn(), updateMovement: vi.fn(),
    },
  };
});

const acc: LalurParteBAccount = {
  id: 'b1', userId: 'o', unitId: 'u1', codCtaB: 'PF-2024', descricao: 'Prejuízo', dtCriacao: '2024-12-31T00:00:00.000Z',
  codPbRfb: '1000', dtLimite: null, codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D', cnpjSitEsp: null,
  createdById: null, createdAt: '', updatedAt: '', deletedAt: null,
};
const mov = (o: Partial<LalurParteBMovement>): LalurParteBMovement => ({
  id: 'm1', unitId: 'u1', parteBId: 'b1', year: 2025, quarter: 'T01', codTributo: 'I', valorCents: 1000, indicador: 'CR',
  contrapartidaId: null, historico: 'h', indLanAnt: 'N', origem: 'user', createdAt: '', updatedAt: '', deletedAt: null, ...o,
});
const view = (v: string) => ({ sdIni: v, vlA: v, vlB: v, sdFim: v });
const diag = (o: Partial<LalurParteBBalancesDiagnostic> = {}): LalurParteBBalancesDiagnostic => ({
  year: 2025,
  periods: [
    { quarter: 'T01', closed: true, closedAt: '2025-04-10T12:00:00.000Z', accounts: [{ parteBId: 'b1', codCtaB: 'PF-2024', codTributo: 'I', materialized: view('100'), recomputed: view('100'), divergent: false }] },
    { quarter: 'T02', closed: false, accounts: [{ parteBId: 'b1', codCtaB: 'PF-2024', codTributo: 'I', recomputed: view('250'), divergent: true }] },
    { quarter: 'T03', closed: false, accounts: [] },
    { quarter: 'T04', closed: false, accounts: [] },
  ],
  divergences: [{ quarter: 'T02', codCtaB: 'PF-2024', codTributo: 'I', field: 'sdFim', materialized: '200', recomputed: '250' }],
  warnings: [],
  ...o,
});

function renderSection(props: Partial<React.ComponentProps<typeof LalurParteBMovementsSection>> = {}) {
  const onShowEntry = vi.fn();
  const onForbidden = vi.fn();
  render(<LalurParteBMovementsSection unitId="u1" initialYear={2025} parteBAccounts={[acc]} readOnly={false} onForbidden={onForbidden} onShowEntry={onShowEntry} {...props} />);
  return { onShowEntry, onForbidden };
}

describe('closingRules — ordem limpa do fechamento', () => {
  it('fechar Tn exige Tn-1 fechado (ou T01); reabrir Tn exige nenhum Tk>n fechado', () => {
    const r = closingRules([{ quarter: 'T01', closed: true }, { quarter: 'T02', closed: true }, { quarter: 'T03', closed: false }, { quarter: 'T04', closed: false }]);
    expect(r.canClose('T03')).toBe(true);
    expect(r.canClose('T04')).toBe(false);
    expect(r.canReopen('T02')).toBe(true);
    expect(r.canReopen('T01')).toBe(false);
    expect(closingRules([]).canClose('T01')).toBe(true);
  });
});

describe('LalurParteBMovementsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(lalurService.listMovements).mockResolvedValue([mov({}), mov({ id: 'm2', indicador: 'PF', origem: 'system' })]);
    vi.mocked(lalurService.getParteBBalances).mockResolvedValue(diag());
    vi.mocked(lalurService.archiveMovement).mockResolvedValue(mov({}));
    vi.mocked(lalurService.closeParteB).mockResolvedValue(undefined);
  });

  it('lista os movimentos; origem system não tem Editar, só Arquivar', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(2));
    expect(lalurService.listMovements).toHaveBeenCalledWith({ unitId: 'u1', year: 2025, quarter: undefined, parteBId: undefined });
    expect(screen.getAllByRole('button', { name: /Editar/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Arquivar/ })).toHaveLength(2);
  });

  it('faixa de fechamento: T01 fechado (só reabrir), T02 fechável, T03 não; divergência em vermelho', async () => {
    renderSection();
    await waitFor(() => expect(screen.getByTestId('lalur-closing-T01').dataset.closed).toBe('true'));
    expect((within(screen.getByTestId('lalur-closing-T01')).getByRole('button', { name: /Reabrir/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(screen.getByTestId('lalur-closing-T02')).getByRole('button', { name: /Fechar/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(screen.getByTestId('lalur-closing-T03')).getByRole('button', { name: /Fechar/ }) as HTMLButtonElement).disabled).toBe(true);
    const divergent = screen.getByTestId('lalur-diagnostic').querySelectorAll('tr[data-divergent="true"]');
    expect(divergent).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toMatch(/T02 · PF-2024 \(I\) · sdFim/);
  });

  it('fechar T02 pede confirmação, chama o BE e recarrega o diagnóstico', async () => {
    renderSection();
    await waitFor(() => expect(lalurService.getParteBBalances).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByTestId('lalur-closing-T02')).getByRole('button', { name: /Fechar/ }));
    expect(screen.getByText(/materializa o M500/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(lalurService.closeParteB).toHaveBeenCalledWith('u1', 2025, 'T02'));
    await waitFor(() => expect(lalurService.getParteBBalances).toHaveBeenCalledTimes(2));
  });

  it('arquivar recarrega movimentos e diagnóstico', async () => {
    renderSection();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Arquivar/ }).length).toBe(2));
    fireEvent.click(screen.getAllByRole('button', { name: /Arquivar/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar arquivamento' }));
    await waitFor(() => expect(lalurService.archiveMovement).toHaveBeenCalledWith('m1', 'u1'));
    await waitFor(() => expect(lalurService.getParteBBalances).toHaveBeenCalledTimes(2));
    expect(lalurService.listMovements).toHaveBeenCalledTimes(2);
  });

  it('aviso X4-14 é aviso (não alerta de erro) e o link foca o ajuste na Parte A', async () => {
    vi.mocked(lalurService.getParteBBalances).mockResolvedValue(diag({
      divergences: [],
      warnings: [{ code: 'M312_MISSING_FOR_PARTIAL_ADJUSTMENT', quarter: 'T01', livro: 'lalur', codigo: '7', entryId: 'e9', accountCode: '4.1', valorCents: '500', aggregates: { sumDebitCents: '0', sumCreditCents: '0', saldoPeriodoCents: '0', saldoFinalCents: '0' }, message: 'M312 ausente' }],
    }));
    const { onShowEntry } = renderSection();
    await waitFor(() => expect(screen.getByTestId('lalur-warnings')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver o ajuste na Parte A' }));
    expect(onShowEntry).toHaveBeenCalledWith('e9', 2025);
  });

  it('readOnly (403): sem criar, editar, arquivar, fechar nem reabrir; a leitura segue', async () => {
    renderSection({ readOnly: true });
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(2));
    expect(screen.queryByRole('button', { name: /Novo movimento|Editar|Arquivar|Fechar|Reabrir/ })).toBeNull();
  });

  it('403 na leitura chama onForbidden', async () => {
    vi.mocked(lalurService.listMovements).mockRejectedValue({ success: false, error: 'sem permissão', status: 403 });
    const { onForbidden } = renderSection();
    await waitFor(() => expect(onForbidden).toHaveBeenCalled());
  });
});
