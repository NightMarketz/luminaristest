import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/api-client';
import { paymentAccountsService, patchTargets, webhookUrlFor } from '../paymentAccounts.service';

/** Wire do serviço da conta do provedor (FE-INCR-PAYMENT-PROVIDER item 1): URL, verbo e corpo exato. */

vi.mock('../../api/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

describe('paymentAccountsService — wire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const m of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      vi.mocked(apiClient[m]).mockResolvedValue({ success: true, data: { id: 'pa1' } });
    }
  });

  it('list: GET /payment-accounts?unitId e desembrulha o envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [{ id: 'pa1' }] });
    const out = await paymentAccountsService.list('u 1', { silent: true });
    expect(apiClient.get).toHaveBeenCalledWith('/payment-accounts?unitId=u%201', { silent: true });
    expect(out).toEqual([{ id: 'pa1' }]);
  });

  it('get: GET /payment-accounts/:id?unitId', async () => {
    await paymentAccountsService.get('pa1', 'u1');
    expect(apiClient.get).toHaveBeenCalledWith('/payment-accounts/pa1?unitId=u1');
  });

  it('create: POST /payment-accounts com o corpo exato', async () => {
    const body = {
      unitId: 'u1', provider: 'MERCADO_PAGO' as const, label: 'MP', glAccountId: 'g1',
      config: { provider: 'MERCADO_PAGO' as const, credentialSource: 'OWN' as const },
    };
    await paymentAccountsService.create(body);
    expect(apiClient.post).toHaveBeenCalledWith('/payment-accounts', body);
  });

  it('update: PATCH /payment-accounts/:id', async () => {
    await paymentAccountsService.update('pa1', { unitId: 'u1', status: 'DISABLED' });
    expect(apiClient.patch).toHaveBeenCalledWith('/payment-accounts/pa1', { unitId: 'u1', status: 'DISABLED' });
  });

  it('setCredential: PUT /payment-accounts/:id/credential, silencioso (o modal mostra o erro)', async () => {
    const body = { unitId: 'u1', accessToken: 'a'.repeat(20), webhookSecret: 'b'.repeat(16) };
    await paymentAccountsService.setCredential('pa1', body);
    expect(apiClient.put).toHaveBeenCalledWith('/payment-accounts/pa1/credential', body, { silent: true });
  });

  it('unblockReleaseReport: POST …/release-report/unblock com { unitId }', async () => {
    await paymentAccountsService.unblockReleaseReport('pa1', { unitId: 'u1' });
    expect(apiClient.post).toHaveBeenCalledWith('/payment-accounts/pa1/release-report/unblock', { unitId: 'u1' });
  });

  it('remove: DELETE /payment-accounts/:id?unitId', async () => {
    await paymentAccountsService.remove('pa1', 'u1');
    expect(apiClient.delete).toHaveBeenCalledWith('/payment-accounts/pa1?unitId=u1');
  });
});

describe('patchTargets (item 8)', () => {
  it('só ACTIVE ↔ DISABLED; DRAFT e CREDENTIAL_INVALID não oferecem PATCH de status', () => {
    expect(patchTargets('ACTIVE')).toEqual(['DISABLED']);
    expect(patchTargets('DISABLED')).toEqual(['ACTIVE']);
    expect(patchTargets('DRAFT')).toEqual([]);
    expect(patchTargets('CREDENTIAL_INVALID')).toEqual([]);
  });
});

describe('webhookUrlFor (item 9, F-FE-COB-5 a)', () => {
  it('monta a URL a partir da base da API; base HTTPS pública ⇒ sem aviso', () => {
    expect(webhookUrlFor('pa1', 'https://api.exemplo.com.br/api/')).toEqual({
      url: 'https://api.exemplo.com.br/api/payment-collection/webhook/MERCADO_PAGO/pa1',
      warning: false,
    });
  });
  it('http ou localhost ⇒ aviso', () => {
    expect(webhookUrlFor('pa1', 'http://api.exemplo.com.br/api').warning).toBe(true);
    expect(webhookUrlFor('pa1', 'https://localhost:3001/api').warning).toBe(true);
    expect(webhookUrlFor('pa1', 'http://localhost:3001/api').url).toBe('http://localhost:3001/api/payment-collection/webhook/MERCADO_PAGO/pa1');
  });
});
