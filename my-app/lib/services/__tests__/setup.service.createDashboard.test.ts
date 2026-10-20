import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupApiError, SetupService } from '../setup.service';
import { notify } from '../../notifications/notify';

/** SetupService.createDashboard — R2b: a Entrevista usa `silent` e lê status + corpo do SetupApiError (W7 itens 4/7). */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function res(status: number, text: string): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => text } as unknown as Response;
}
const payload = { suiteKey: 'beautySalon', unit: { name: 'Salão' } };

describe('SetupService.createDashboard', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(notify).mockClear();
  });

  it('devolve o data do 201', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(201, JSON.stringify({ success: true, data: { unitId: 'u1' } })));
    await expect(SetupService.createDashboard(payload)).resolves.toEqual({ unitId: 'u1' });
  });

  it('erro: SetupApiError com status e o corpo (errorCode); silent não toasta, o padrão toasta (wizards)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(500, JSON.stringify({ error: 'falhou', errorCode: 'ONBOARDING_ROLLBACK_FAILED' })));
    const err = await SetupService.createDashboard(payload, { silent: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SetupApiError);
    expect(err).toMatchObject({ message: 'falhou', status: 500, body: { error: 'falhou', errorCode: 'ONBOARDING_ROLLBACK_FAILED' } });
    expect(notify).not.toHaveBeenCalled();
    await SetupService.createDashboard(payload).catch(() => undefined);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('500 sem corpo: status 500 e corpo vazio (o hook cai no fallback traduzido)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(500, ''));
    await expect(SetupService.createDashboard(payload, { silent: true })).rejects.toMatchObject({ status: 500, body: {} });
  });

  it('falha de rede: sem status, mensagem nativa', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(SetupService.createDashboard(payload, { silent: true })).rejects.toMatchObject({ message: 'Failed to fetch', status: undefined });
  });
});
