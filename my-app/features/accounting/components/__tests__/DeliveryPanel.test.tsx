import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { DeliveryPanel, EXPORT_KIND_LABEL } from '../DeliveryPanel';
import { accountingContactsService } from '../../../../lib/services/accountingContacts.service';
import { DELIVERABLE_EXPORT_KINDS, accountingDeliveryService, type DeliveryManifestPreview } from '../../../../lib/services/accountingDelivery.service';
import { dataExchangeService } from '../../../../lib/services/dataExchange.service';

/**
 * FE-INCR-DELIVERY PR-D2 (BRIEF §1): mapa de ExportKind cobre SPED + entregáveis; cadastro manda o body do
 * RegisterContactSchema; o manifesto lista os arquivos na ordem; sem o checkbox o despacho nem é chamado e,
 * com ele, leva `confirmed: true` e o mesmo conjunto do build; 409 REVIEW_REQUIRED oferece o link da revisão;
 * no histórico só FAILED tem "Reprocessar".
 */
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn(), registerContact: vi.fn(), updateContact: vi.fn(), archiveContact: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingDelivery.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/accountingDelivery.service')>();
  return {
    ...actual,
    accountingDeliveryService: { getProfile: vi.fn(), setProfile: vi.fn(), build: vi.fn(), confirm: vi.fn(), list: vi.fn(), get: vi.fn(), retry: vi.fn() },
  };
});
vi.mock('../../../../lib/services/dataExchange.service', () => ({ dataExchangeService: { listJobs: vi.fn(), downloadArtifact: vi.fn() } }));

const contact = { id: 'c1', unitId: 'u1', name: 'Ana', email: 'a@x.com', cpf: '52998224725', phone: null, crcNumber: 'SP-123456/O-1', crcUf: 'SP', deletedAt: null };
const job = (id: string, kind: string) => ({ id, direction: 'EXPORT', kind, status: 'EXPORTED', fileName: null, mimeType: null, sizeBytes: null, sha256: 's', totalRows: 0, validRows: 0, invalidRows: 0, committedRows: 0, createdAt: '2025-06-01T10:00:00.000Z', supersedesJobId: null, supersededByJobId: null });
const manifest: DeliveryManifestPreview = {
  scope: { unitId: 'u1', ledgerCode: 'L1' },
  period: { start: '2025-01-01', end: '2025-12-31' },
  core: { ecd: { kind: 'EXPORT_SPED_ECD', jobId: 'ecd00001', sha256: 'aaaaaaaaaaaaaaaa' }, ecf: { kind: 'EXPORT_SPED_ECF', jobId: 'ecf00001', sha256: 'bbbbbbbbbbbbbbbb' } },
  files: [
    { kind: 'EXPORT_SPED_ECD', jobId: 'ecd00001', sha256: 'aaaaaaaaaaaaaaaa' },
    { kind: 'EXPORT_SPED_ECF', jobId: 'ecf00001', sha256: 'bbbbbbbbbbbbbbbb' },
    { kind: 'EXPORT_TRIAL_BALANCE', jobId: 'tb000001', sha256: 'cccccccccccccccc' },
    { kind: 'EXPORT_BALANCE_SHEET', jobId: 'bs000001', sha256: 'dddddddddddddddd' },
  ],
  generatedAt: '2026-01-10T10:00:00.000Z',
};

async function renderAndPickCore() {
  render(<DeliveryPanel unitId="u1" onNavigateTab={vi.fn()} />);
  const build = within(await screen.findByTestId('delivery-build'));
  const ecd = build.getByLabelText('Arquivo da ECD (EXPORTED)') as HTMLSelectElement;
  const ecf = build.getByLabelText('Arquivo da ECF (EXPORTED)') as HTMLSelectElement;
  await waitFor(() => expect(ecd.options.length).toBe(2));
  await waitFor(() => expect(ecf.options.length).toBe(2));
  fireEvent.change(ecd, { target: { value: 'ecd00001' } });
  fireEvent.change(ecf, { target: { value: 'ecf00001' } });
  fireEvent.change(build.getByLabelText('Contador destinatário'), { target: { value: 'c1' } });
  return build;
}

describe('DeliveryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingContactsService.listContacts).mockResolvedValue([contact]);
    vi.mocked(accountingDeliveryService.getProfile).mockResolvedValue({ kinds: [] });
    vi.mocked(accountingDeliveryService.list).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    vi.mocked(dataExchangeService.listJobs).mockImplementation(async (_u, f) => {
      if (f?.kind === 'EXPORT_SPED_ECD') return { items: [job('ecd00001', 'EXPORT_SPED_ECD')], total: 1, page: 1, limit: 100 };
      if (f?.kind === 'EXPORT_SPED_ECF') return { items: [job('ecf00001', 'EXPORT_SPED_ECF')], total: 1, page: 1, limit: 100 };
      if (f?.kind) return { items: [], total: 0, page: 1, limit: 100 };
      return { items: [job('tb000001', 'EXPORT_TRIAL_BALANCE'), job('ecd00001', 'EXPORT_SPED_ECD')], total: 2, page: 1, limit: 100 };
    });
  });

  it('o mapa de ExportKind cobre os 3 SPED do núcleo e todos os entregáveis', () => {
    for (const k of ['EXPORT_SPED_ECD', 'EXPORT_SPED_ECF', 'EXPORT_SPED_ECF_REAL', ...DELIVERABLE_EXPORT_KINDS]) expect(EXPORT_KIND_LABEL[k], k).toBeTruthy();
    expect(EXPORT_KIND_LABEL[manifest.core.ecd.kind]).toBe('ECD');
    expect(EXPORT_KIND_LABEL[manifest.core.ecf.kind]).toBeTruthy();
  });

  it('cadastrar contador manda o body do RegisterContactSchema (opcionais vazios omitidos)', async () => {
    vi.mocked(accountingContactsService.registerContact).mockResolvedValue(contact);
    render(<DeliveryPanel unitId="u1" onNavigateTab={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Novo contador/ }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Ana ' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@x.com' } });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } });
    fireEvent.change(screen.getByLabelText('CRC'), { target: { value: 'SP-123456/O-1' } });
    fireEvent.change(screen.getByLabelText('UF do CRC'), { target: { value: 'SP' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(accountingContactsService.registerContact).toHaveBeenCalledWith({ unitId: 'u1', name: 'Ana', email: 'a@x.com', cpf: '52998224725', crcNumber: 'SP-123456/O-1', crcUf: 'SP' }));
  });

  it('manifesto lista 2 core + 2 extras na ordem; sem checkbox o despacho não é chamado; com ele vai confirmed: true e o mesmo conjunto', async () => {
    vi.mocked(accountingDeliveryService.build).mockResolvedValue(manifest);
    vi.mocked(accountingDeliveryService.confirm).mockResolvedValue({
      deliveryId: 'd1', status: 'SENT', statusMeaning: 'o operador confirmou que despachou', contact: { name: 'Ana', crcNumber: 'SP-123456/O-1', crcUf: 'SP' },
      signer: { identNom: 'Ana', codAssin: '900' }, manifest: { ...manifest, contactId: 'c1' },
    });
    const build = await renderAndPickCore();
    fireEvent.click(build.getByRole('button', { name: 'Validar pacote' }));
    const rows = await within(await screen.findByTestId('delivery-manifest')).findAllByTestId('manifest-file');
    expect(rows.map((r) => r.querySelector('td')?.textContent)).toEqual(['ECD', 'ECF (Presumido)', 'Balancete', 'Balanço patrimonial']);

    const submit = screen.getByRole('button', { name: 'Registrar despacho' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(accountingDeliveryService.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/Confirmo que despachei/));
    fireEvent.click(submit);
    await waitFor(() => expect(accountingDeliveryService.confirm).toHaveBeenCalledWith({ unitId: 'u1', ecdJobId: 'ecd00001', ecfJobId: 'ecf00001', contactId: 'c1', confirmed: true, extraJobIds: [] }));
    expect(await screen.findByTestId('delivery-receipt')).toBeTruthy();
    expect(screen.getByText(/o operador confirmou que despachou/)).toBeTruthy();
  });

  it('409 REVIEW_REQUIRED no build: mensagem íntegra + link para a revisão', async () => {
    vi.mocked(accountingDeliveryService.build).mockRejectedValue({ success: false, error: 'O par não tem revisão assinada.', code: 'REVIEW_REQUIRED', status: 409 });
    const build = await renderAndPickCore();
    fireEvent.click(build.getByRole('button', { name: 'Validar pacote' }));
    expect(await screen.findByText('O par não tem revisão assinada.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Revisão profissional ↑' })).toBeTruthy();
  });

  it('histórico: FAILED tem "Reprocessar" (body com deliveryId), SENT não', async () => {
    const base = { unitId: 'u1', contactId: 'c1', ecdJobId: 'e', ecfJobId: 'f', periodStart: '2025-01-01T00:00:00.000Z', periodEnd: '2025-12-31T00:00:00.000Z', manifestSha256Ecd: 'aaaaaaaaaaaaaaaa', manifestSha256Ecf: 'bbbbbbbbbbbbbbbb', requestedById: 'o', createdAt: '', updatedAt: '', items: [] };
    vi.mocked(accountingDeliveryService.list).mockResolvedValue({
      items: [
        { ...base, id: 'd-sent', status: 'SENT', attemptCount: 1, sentAt: '2026-01-10T10:00:00.000Z', failedAt: null, failureReason: null },
        { ...base, id: 'd-fail', status: 'FAILED', attemptCount: 1, sentAt: null, failedAt: '2026-01-11T10:00:00.000Z', failureReason: 'timeout' },
      ],
      total: 2, page: 1, limit: 50,
    });
    vi.mocked(accountingDeliveryService.retry).mockResolvedValue({ ...base, id: 'd-fail', status: 'QUEUED', attemptCount: 2, sentAt: null, failedAt: null, failureReason: null });
    render(<DeliveryPanel unitId="u1" onNavigateTab={vi.fn()} />);
    const failed = within(await screen.findByTestId('delivery-d-fail'));
    expect(within(screen.getByTestId('delivery-d-sent')).queryByRole('button', { name: /Reprocessar/ })).toBeNull();
    fireEvent.click(failed.getByRole('button', { name: /Reprocessar/ }));
    await waitFor(() => expect(accountingDeliveryService.retry).toHaveBeenCalledWith('d-fail', 'u1'));
  });
});
