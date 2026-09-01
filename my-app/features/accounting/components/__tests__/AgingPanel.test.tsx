import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// AgingPanel doesn't `import React` (jsx:"preserve" + esbuild's classic runtime expects it in
// scope) — same shim as BalanceSheetPanel.test.tsx.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AgingPanel } from '../AgingPanel';
import { accountingService, type AgingReport } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAging: vi.fn() },
}));

const reportWithTieOut: AgingReport = {
  unitId: 'u1',
  kind: 'payable',
  asOf: '2026-08-31',
  buckets: { a_vencer: '10000', d1_30: '5000', d31_60: '0', d61_90: '0', d90_plus: '0' },
  totalCents: '15000',
  groups: [
    {
      counterpartyId: 'cp1',
      counterpartyName: 'Fornecedor Alfa',
      buckets: { a_vencer: '10000', d1_30: '0', d31_60: '0', d61_90: '0', d90_plus: '0' },
      totalCents: '10000',
      documents: [
        {
          id: 'doc1',
          documentNumber: 'NF-1',
          dueDate: '2026-09-15',
          daysOverdue: -15,
          bucket: 'a_vencer',
          amountCents: '10000',
        },
      ],
    },
    {
      counterpartyId: null,
      counterpartyName: '(Sem contraparte)',
      buckets: { a_vencer: '0', d1_30: '5000', d31_60: '0', d61_90: '0', d90_plus: '0' },
      totalCents: '5000',
      documents: [
        {
          id: 'doc2',
          documentNumber: null,
          dueDate: '2026-08-10',
          daysOverdue: 21,
          bucket: 'd1_30',
          amountCents: '5000',
        },
      ],
    },
  ],
  tieOut: {
    controlAccountCode: '2.1.2',
    subledgerTotalCents: '15000',
    controlAccountBalanceCents: '15000',
    differenceCents: '0',
    tiesOut: true,
  },
  tieOutSkippedReason: null,
};

const reportSkippedTieOut: AgingReport = {
  ...reportWithTieOut,
  asOf: '2026-08-20',
  tieOut: null,
  tieOutSkippedReason: 'as_of_not_today',
};

describe('AgingPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty prompt before a report is generated', () => {
    render(<AgingPanel unitId="u1" />);
    expect(screen.getByRole('button', { name: /Gerar/ })).toBeInTheDocument();
    expect(screen.getByText(/visualizar a posição de aging/)).toBeInTheDocument();
  });

  it('renders groups (including "(Sem contraparte)") and an OK tie-out after generating', async () => {
    vi.mocked(accountingService.getAging).mockResolvedValue(reportWithTieOut);

    const { container } = render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Fornecedor Alfa')).toBeInTheDocument());
    expect(screen.getByText('(Sem contraparte)')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    // String-cents money must be parseInt'd before formatting — never "NaN".
    expect(container.textContent).toContain('100,00');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders the skipped-reason text when tieOut is null', async () => {
    vi.mocked(accountingService.getAging).mockResolvedValue(reportSkippedTieOut);

    render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() =>
      expect(screen.getByText(/Tie-out disponível apenas para a posição de hoje/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // Lacuna: `today()` (AgingPanel.tsx:16-18) deriva o default de `asOf` via
  // `toISOString()` (UTC) e `generate()` SEMPRE o envia. Entre 21:00 e 00:00 BRT o dia
  // UTC já virou, então a posição default pedida é o "amanhã" do escopo — o backend
  // (AgingReportService, fonte única `scopeToday`) responde `tieOut: null` +
  // `as_of_not_today`, suprimindo o tie-out exatamente na posição default.
  // Comportamento correto (fork-agnóstico): na posição default o request deve pedir o
  // HOJE do escopo — `asOf` omitido (backend decide) ou igual ao hoje do escopo.
  // Determinismo (armadilha teste-de-hoje-quebra-em-janela-utc): o instante é FIXADO
  // com fake timers dentro da janela que morde — 2026-09-01T02:30Z = 23:30 BRT de
  // 2026-08-31 — em vez de depender do relógio real; o resultado independe da hora e
  // do fuso da máquina que roda a suíte.
  it('guarda: default de asOf na janela 21h-00h BRT pede o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      // getAging nunca resolve: só interessa o request; nada de state update pós-teste.
      vi.mocked(accountingService.getAging).mockImplementation(() => new Promise(() => {}));

      render(<AgingPanel unitId="u1" />);
      // `today()` roda no initializer do useState — o clock pode voltar ao real daqui em diante.
      vi.useRealTimers();

      fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

      expect(accountingService.getAging).toHaveBeenCalledTimes(1);
      const { asOf } = vi.mocked(accountingService.getAging).mock.calls[0][0];
      expect(
        [undefined, '2026-08-31'],
        'posição default às 23:30 BRT de 2026-08-31 deve pedir o hoje do escopo (ou omitir asOf) — receber 2026-09-01 é o "amanhã" UTC que suprime o tie-out (as_of_not_today)',
      ).toContain(asOf);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the resolved error message on a policy (403) failure', async () => {
    vi.mocked(accountingService.getAging).mockRejectedValue({ error: 'Forbidden', status: 403 });

    render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });
});
