import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api-client';
import { notify } from '../../notifications/notify';

/**
 * BRD F-72.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-72): o erro HTTP gera toast com mensagem em
 * português; a falha de rede (`fetch` rejeita com `TypeError`) não gerava toast e chegava às telas com a
 * mensagem crua do navegador ("Failed to fetch"). O esperado: o mesmo tratamento — toast (salvo
 * `silent`) e rejeição com `Error` cuja mensagem é a do toast. Sem `status`, como hoje: os serviços
 * (`chat`, `interview`, `document`) leem "sem status" como "sem resposta".
 */
vi.mock('cookies-next', () => ({ getCookie: () => undefined }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

describe('BRD F-72.1 — falha de rede tratada como o erro HTTP', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.mocked(notify).mockClear();
  });

  it('BRD F-72.1: falha de rede gera toast e rejeita com a mensagem do toast, sem "Failed to fetch"', async () => {
    const err = (await apiClient.get('/x').catch((e: unknown) => e)) as Error & { status?: unknown };
    expect(notify).toHaveBeenCalledTimes(1);
    const [toastMsg, kind] = vi.mocked(notify).mock.calls[0];
    expect(kind).toBe('error');
    expect(toastMsg).not.toBe('Failed to fetch');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(toastMsg);
    expect(err.status).toBeUndefined();
  });

  it('BRD F-72.1: silent cala o toast da falha de rede', async () => {
    const err = (await apiClient.get('/x', { silent: true }).catch((e: unknown) => e)) as Error;
    expect(notify).not.toHaveBeenCalled();
    expect(err.message).not.toBe('Failed to fetch');
  });
});
