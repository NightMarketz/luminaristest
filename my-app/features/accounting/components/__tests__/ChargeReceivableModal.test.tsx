import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { ChargeReceivableModal, formFromSuggestion } from '../ChargeReceivableModal';
import { collectionChargesService, type CollectionChargeView } from '../../../../lib/services/collectionCharges.service';

vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/collectionCharges.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/collectionCharges.service')>();
  return { ...actual, collectionChargesService: { create: vi.fn() } };
});

const target = { id: 'r1', customerName: 'Cliente X', description: 'Serviço', openCents: 150000 };
const fullSuggestion = {
  firstName: 'Ana', lastName: 'Lima', email: 'ana@ex.com',
  identification: { type: 'CPF' as const, number: '12345678901' },
  address: { streetName: 'Rua A', streetNumber: '10', zipCode: '01234567', neighborhood: 'Centro', city: 'SP', state: 'SP' },
};

const charge = (over: Partial<CollectionChargeView>): CollectionChargeView => ({
  id: 'c1', unitId: 'u1', receivableId: 'r1', paymentAccountId: 'pa1', kind: 'PIX', amountCents: '150000',
  expiresAt: '2026-10-24T00:00:00Z', status: 'PENDING', providerRef: 'o1', providerPaymentRef: null,
  providerStatus: 'action_required', providerStatusDetail: 'waiting_transfer', paidAt: null, failReason: null,
  instrument: null, createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z', ...over,
});

// The fixtures carry fixed dates (createdAt 23/10, expiresAt 24/10/2026). Pin "now" between them: on the real clock
// the PENDING charge turned "Vencida — aguardando o provedor" at 2026-10-24T00:00Z and the boleto case went red.
// Only Date is faked, so waitFor keeps its real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

function renderModal(props: Partial<React.ComponentProps<typeof ChargeReceivableModal>> = {}) {
  return render(
    <ChargeReceivableModal isOpen onClose={vi.fn()} unitId="u1" receivable={target} suggestion={fullSuggestion} {...props} />,
  );
}

describe('formFromSuggestion (item 13)', () => {
  it('a sugestão completa preenche o pagador', () => {
    const f = formFromSuggestion(fullSuggestion);
    expect(f).toMatchObject({ firstName: 'Ana', lastName: 'Lima', email: 'ana@ex.com', docType: 'CPF', docNumber: '12345678901', city: 'SP' });
  });
  it('{identification:{number}} preenche só o documento (tipo pelo tamanho)', () => {
    const f = formFromSuggestion({ identification: { number: '12345678000190' } } as never);
    expect(f).toMatchObject({ firstName: '', lastName: '', email: '', docNumber: '12345678000190', docType: 'CNPJ', streetName: '' });
  });
});

describe('ChargeReceivableModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('item 12: valor só leitura; sem campo de valor, juros, multa nem desconto', () => {
    const { container } = renderModal();
    expect(screen.getByTestId('charge-amount')).toHaveTextContent('1.500,00');
    expect(screen.getByText(/saldo em aberto, relido pelo servidor/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/juros|multa|desconto/i);
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
  });

  it('item 12: o documento troca o tipo pelo tamanho (14 ⇒ CNPJ), e continua editável', () => {
    renderModal({ suggestion: {} });
    fireEvent.change(screen.getByLabelText('Documento'), { target: { value: '12.345.678/0001-90' } });
    expect(screen.getByRole('combobox', { name: 'Tipo do documento' })).toHaveValue('CNPJ');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo do documento' }), { target: { value: 'CPF' } });
    expect(screen.getByRole('combobox', { name: 'Tipo do documento' })).toHaveValue('CPF');
  });

  it('item 12 (wire): boleto manda endereço e expiresInDays; Pix manda só expiresInMinutes do preset', async () => {
    vi.mocked(collectionChargesService.create).mockResolvedValue(charge({ kind: 'BOLETO' }));
    renderModal();
    fireEvent.click(screen.getByLabelText('Boleto'));
    fireEvent.change(screen.getByLabelText(/Vencimento em dias/), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(collectionChargesService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(collectionChargesService.create).mock.calls[0]).toStrictEqual(['r1', {
      unitId: 'u1', kind: 'BOLETO', expiresInDays: 7,
      payer: { ...fullSuggestion },
    }]);

    cleanup();
    vi.mocked(collectionChargesService.create).mockClear();
    renderModal();
    fireEvent.change(screen.getByRole('combobox', { name: 'Validade' }), { target: { value: '30m' } });
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(collectionChargesService.create).toHaveBeenCalledTimes(1));
    const { address: _ignored, ...payerNoAddress } = fullSuggestion;
    expect(vi.mocked(collectionChargesService.create).mock.calls[0]).toStrictEqual(['r1', {
      unitId: 'u1', kind: 'PIX', expiresInMinutes: 30, payer: payerNoAddress,
    }]);
  });

  it('item 14: boleto mostra linha digitável com copiar e link seguro', async () => {
    vi.mocked(collectionChargesService.create).mockResolvedValue(charge({
      kind: 'BOLETO', instrument: { digitableLine: '23793.38128 60000', ticketUrl: 'https://mp.example/ticket' },
    }));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(screen.getByText('23793.38128 60000')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Copiar linha digitável' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Abrir boleto/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('item 14: Pix mostra o QR em data URI e o copia-e-cola', async () => {
    vi.mocked(collectionChargesService.create).mockResolvedValue(charge({
      instrument: { qrCode: '00020126pix', qrCodeBase64: 'iVBORw0KGgo=', ticketUrl: 'https://mp.example/pix' },
    }));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    const img = await screen.findByAltText('QR Code do Pix');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
    expect(screen.getByText('00020126pix')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar código Pix' })).toBeInTheDocument();
  });

  it('item 14: 502 provider_unavailable ⇒ "registrada e será reenviada automaticamente"', async () => {
    vi.mocked(collectionChargesService.create).mockRejectedValue(
      Object.assign(new Error('x'), { status: 502, code: 'provider_unavailable', message: 'provider_unavailable' }),
    );
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(screen.getByText('A cobrança foi registrada e será reenviada automaticamente.')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Emitir cobrança' })).toBeNull();
  });

  it('item 14: FAILED mostra o failReason verbatim', async () => {
    vi.mocked(collectionChargesService.create).mockResolvedValue(charge({ status: 'FAILED', failReason: 'payer.email inválido (MP 400)', providerRef: null }));
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(screen.getByText('payer.email inválido (MP 400)')).toBeInTheDocument());
    expect(screen.getByText('Falhou')).toBeInTheDocument();
  });

  const errorCases: Array<[string, number, RegExp]> = [
    ['CHARGE_LIVE_EXISTS', 409, /já tem cobrança em andamento/],
    ['PAYMENT_ACCOUNT_NOT_ACTIVE', 409, /Não há conta Mercado Pago ativa/],
    ['CHARGE_NOTHING_TO_CHARGE', 409, /não tem saldo em aberto/],
    ['CHARGE_RECEIVABLE_NOT_CHARGEABLE', 409, /não está numa situação que permita cobrança/],
    ['provider_credential_invalid', 502, /o MP recusou a credencial; grave de novo na aba Cobrança/i],
    ['payment_credential_key_missing', 503, /chave de cifra da instância não está provisionada/],
  ];
  for (const [code, status, text] of errorCases) {
    it(`item 15: ${code} ⇒ texto próprio`, async () => {
      vi.mocked(collectionChargesService.create).mockRejectedValue(Object.assign(new Error('x'), { status, code, message: `${code}: detalhe` }));
      renderModal({ onShowCharges: vi.fn(), onNavigateToCobranca: vi.fn() });
      fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(text));
    });
  }

  it('item 15: CHARGE_LIVE_EXISTS tem atalho para as cobranças do título; PAYMENT_ACCOUNT_NOT_ACTIVE para a aba Cobrança', async () => {
    const onShowCharges = vi.fn();
    const onNavigateToCobranca = vi.fn();
    vi.mocked(collectionChargesService.create).mockRejectedValueOnce(Object.assign(new Error('x'), { status: 409, code: 'CHARGE_LIVE_EXISTS', message: 'x' }));
    renderModal({ onShowCharges, onNavigateToCobranca });
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver cobranças do título' }));
    expect(onShowCharges).toHaveBeenCalledWith('r1');

    vi.mocked(collectionChargesService.create).mockRejectedValueOnce(Object.assign(new Error('x'), { status: 409, code: 'PAYMENT_ACCOUNT_NOT_ACTIVE', message: 'x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir a aba Cobrança' }));
    expect(onNavigateToCobranca).toHaveBeenCalled();
  });

  it('item 15: Zod 400 vira texto pelo humanizeZodFlatten do resolveError', async () => {
    vi.mocked(collectionChargesService.create).mockRejectedValue(
      // Corpo cru do 400 (sem `message`): o resolveError humaniza o flatten.
      { status: 400, error: { formErrors: [], fieldErrors: { payer: ['email inválido'] } } },
    );
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/email inválido/));
  });
});
