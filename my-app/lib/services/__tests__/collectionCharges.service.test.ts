import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import {
  chargeBanner,
  collectionChargesService,
  docTypeFor,
  toCents,
  toCreateChargeInput,
  type ChargeForm,
} from '../collectionCharges.service';

/** Wire + funções puras da cobrança (FE-INCR-PAYMENT-PROVIDER itens 2, 12 e 17). */

vi.mock('../../api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

describe('collectionChargesService — wire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] });
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { id: 'c1' } });
  });

  it('create: POST /receivables/:id/charges com o corpo, silencioso', async () => {
    const body = { unitId: 'u1', kind: 'PIX' as const, payer: { firstName: 'A', lastName: 'B', email: 'a@b.c', identification: { type: 'CPF' as const, number: '12345678901' } } };
    const out = await collectionChargesService.create('r1', body);
    expect(apiClient.post).toHaveBeenCalledWith('/receivables/r1/charges', body, { silent: true });
    expect(out).toEqual({ id: 'c1' });
  });

  it('listByReceivable: GET /receivables/:id/charges?unitId', async () => {
    await collectionChargesService.listByReceivable('r1', 'u1');
    expect(apiClient.get).toHaveBeenCalledWith('/receivables/r1/charges?unitId=u1');
  });

  it('get: GET /collection-charges/:id?unitId', async () => {
    await collectionChargesService.get('c1', 'u1');
    expect(apiClient.get).toHaveBeenCalledWith('/collection-charges/c1?unitId=u1');
  });

  it('cancel: POST /collection-charges/:id/cancel com { unitId }', async () => {
    await collectionChargesService.cancel('c1', { unitId: 'u1' });
    expect(apiClient.post).toHaveBeenCalledWith('/collection-charges/c1/cancel', { unitId: 'u1' }, { silent: true });
  });

  it('payerSuggestion: GET …/charges/payer-suggestion?unitId, silencioso (403 é do painel)', async () => {
    await collectionChargesService.payerSuggestion('r1', 'u1');
    expect(apiClient.get).toHaveBeenCalledWith('/receivables/r1/charges/payer-suggestion?unitId=u1', { silent: true });
  });
});

describe('toCents (item 2)', () => {
  it('converte a string BigInt, inclusive valor grande dentro do inteiro seguro', () => {
    expect(toCents('150000')).toBe(150000);
    expect(toCents('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('docTypeFor (item 12)', () => {
  it('11 dígitos ⇒ CPF, 14 ⇒ CNPJ, máscara ignorada, outro tamanho ⇒ null', () => {
    expect(docTypeFor('123.456.789-01')).toBe('CPF');
    expect(docTypeFor('12.345.678/0001-90')).toBe('CNPJ');
    expect(docTypeFor('123')).toBeNull();
  });
});

const baseForm: ChargeForm = {
  kind: 'BOLETO', boletoDays: '5', pixPreset: '24h',
  firstName: ' Ana ', lastName: 'Lima', email: 'ana@ex.com', docType: 'CPF', docNumber: '123.456.789-01',
  streetName: 'Rua A', streetNumber: '10', zipCode: '01234-567', neighborhood: 'Centro', city: 'São Paulo', state: 'sp',
};

describe('toCreateChargeInput (item 12)', () => {
  it('boleto: endereço + expiresInDays, sem expiresInMinutes e sem campo extra', () => {
    expect(toCreateChargeInput(baseForm, 'u1')).toEqual({
      unitId: 'u1',
      kind: 'BOLETO',
      expiresInDays: 5,
      payer: {
        firstName: 'Ana', lastName: 'Lima', email: 'ana@ex.com',
        identification: { type: 'CPF', number: '12345678901' },
        address: { streetName: 'Rua A', streetNumber: '10', zipCode: '01234567', neighborhood: 'Centro', city: 'São Paulo', state: 'SP' },
      },
    });
  });

  it('boleto com prazo vazio ⇒ omite expiresInDays (3 dias úteis do BE)', () => {
    expect(toCreateChargeInput({ ...baseForm, boletoDays: '' }, 'u1')).not.toHaveProperty('expiresInDays');
  });

  it('Pix: sem endereço e só expiresInMinutes do preset', () => {
    const out = toCreateChargeInput({ ...baseForm, kind: 'PIX', pixPreset: '3d' }, 'u1');
    expect(out).toEqual({
      unitId: 'u1',
      kind: 'PIX',
      expiresInMinutes: 4320,
      payer: { firstName: 'Ana', lastName: 'Lima', email: 'ana@ex.com', identification: { type: 'CPF', number: '12345678901' } },
    });
    expect(out).not.toHaveProperty('expiresInDays');
  });

  it('Pix no preset 24 h (padrão) ⇒ omite expiresInMinutes', () => {
    expect(toCreateChargeInput({ ...baseForm, kind: 'PIX', pixPreset: '24h' }, 'u1')).not.toHaveProperty('expiresInMinutes');
  });
});

describe('chargeBanner (item 17)', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const future = '2026-10-30T00:00:00Z';
  const past = '2026-10-20T00:00:00Z';

  it('PAID com título aberto ⇒ aguardando confirmação; com título fechado ⇒ nada', () => {
    expect(chargeBanner({ status: 'PAID', expiresAt: future }, true, now)).toBe('paid_awaiting_settlement');
    expect(chargeBanner({ status: 'PAID', expiresAt: future }, false, now)).toBeNull();
  });
  it('PARTIALLY_REFUNDED, CHARGED_BACK e REFUNDED ⇒ sem efeito no razão', () => {
    for (const s of ['PARTIALLY_REFUNDED', 'CHARGED_BACK', 'REFUNDED']) {
      expect(chargeBanner({ status: s, expiresAt: future }, true, now)).toBe('no_ledger_effect');
    }
  });
  it('EXPIRED, CANCELLED e FAILED ⇒ terminal', () => {
    for (const s of ['EXPIRED', 'CANCELLED', 'FAILED']) {
      expect(chargeBanner({ status: s, expiresAt: future }, true, now)).toBe('terminal');
    }
  });
  it('PENDING vencida ⇒ overdue_pending; PENDING no prazo, CREATING e status desconhecido ⇒ nada', () => {
    expect(chargeBanner({ status: 'PENDING', expiresAt: past }, true, now)).toBe('overdue_pending');
    expect(chargeBanner({ status: 'PENDING', expiresAt: future }, true, now)).toBeNull();
    expect(chargeBanner({ status: 'CREATING', expiresAt: past }, true, now)).toBeNull();
    expect(chargeBanner({ status: 'SOMETHING_NEW', expiresAt: past }, true, now)).toBeNull();
  });
});
