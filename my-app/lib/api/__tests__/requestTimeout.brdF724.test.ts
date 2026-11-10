import { apiClient } from '../api-client';
import { notify } from '../../notifications/notify';
import { LocationService } from '../../services/location.service';

/**
 * BRD F-72.4 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-72). Sem timeout no cliente de API nem no ViaCEP: um
 * servidor que não responde deixava a tela "carregando" sem fim. Decisão do dono (10/11): 60 s na API, 10 s no
 * ViaCEP, com mensagem. Comportamento esperado: o `fetch` sai com `AbortSignal.timeout(<limite>)` e o estouro
 * vira erro com texto para o usuário.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'cookie-tok' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const timeoutError = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

describe('BRD F-72.4 — limite de tempo com mensagem', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(notify).mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('BRD F-72.4 apiClient: fetch sai com AbortSignal.timeout(60000)', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, text: async () => '{}' } as unknown as Response);
    await apiClient.get('/x');
    expect(spy).toHaveBeenCalledWith(60_000);
    const init = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('BRD F-72.4 apiClient: estouro ⇒ rejeita com mensagem de tempo e toast', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(timeoutError());
    await expect(apiClient.get('/x')).rejects.toMatchObject({ message: expect.stringMatching(/demorou/i) });
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/demorou/i), 'error', 'Erro');
  });

  it('BRD F-72.4 ViaCEP: fetch sai com AbortSignal.timeout(10000) e o estouro vira mensagem', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    vi.mocked(globalThis.fetch).mockRejectedValue(timeoutError());
    await expect(LocationService.fetchCepData('01001-000')).rejects.toThrow(/demorou/i);
    expect(spy).toHaveBeenCalledWith(10_000);
  });
});
