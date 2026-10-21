import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatApiError, ChatService } from '../chat.service';
import { DocumentService } from '../document.service';
import { notify } from '../../notifications/notify';

/** chat.service + DocumentService.listForSelection — R2b: mesmas URLs/corpos dos fetch dos hooks; erros normalizados. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}
function reply(status: number, body: unknown) {
  vi.mocked(globalThis.fetch).mockResolvedValue(res(status, body));
}

describe('ChatService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('listInstances: GET /chat-instances (com ?type= quando dado), Bearer do cookie; devolve o data', async () => {
    reply(200, { success: true, data: [{ id: 'c1' }] });
    await expect(ChatService.listInstances()).resolves.toEqual([{ id: 'c1' }]);
    expect(lastCall().url).toMatch(/\/chat-instances$/);
    expect((lastCall().init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    await ChatService.listInstances('GENERIC');
    expect(lastCall().url).toMatch(/\/chat-instances\?type=GENERIC$/);
  });

  it('listInstances: erro ignora a message do servidor (só status)', async () => {
    reply(500, { message: 'detalhe' });
    await expect(ChatService.listInstances()).rejects.toMatchObject({
      message: 'Falha ao buscar lista de chats (status 500)', status: 500, serverMessage: 'detalhe',
    });
  });

  it('getOrCreateInstance: POST com o corpo; erro usa a message do servidor, senão o fallback', async () => {
    reply(200, { success: true, data: { id: 'i1', title: 'T' } });
    await expect(ChatService.getOrCreateInstance({ widgetInstanceId: 'w1', type: 'DOCUMENT' })).resolves.toEqual({ id: 'i1', title: 'T' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/chat-instances\/get-or-create$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ widgetInstanceId: 'w1', type: 'DOCUMENT' });

    reply(400, { message: 'inválido' });
    await expect(ChatService.getOrCreateInstance({ widgetInstanceId: 'w1', type: 'DOCUMENT' })).rejects.toThrow('inválido');
    reply(500, { error: 'x' });
    await expect(ChatService.getOrCreateInstance({ widgetInstanceId: 'w1', type: 'DOCUMENT' })).rejects.toThrow('Failed to get/create chat instance (status 500)');
  });

  it('updateInstance / deleteInstance: PUT e DELETE em /chat-instances/:id', async () => {
    reply(200, { success: true });
    await ChatService.updateInstance('i1', { title: null });
    expect(lastCall().init.method).toBe('PUT');
    expect(lastCall().url).toMatch(/\/chat-instances\/i1$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ title: null });
    await ChatService.deleteInstance('i1');
    expect(lastCall().init.method).toBe('DELETE');
    expect(lastCall().url).toMatch(/\/chat-instances\/i1$/);

    reply(404, { error: 'nf' });
    await expect(ChatService.deleteInstance('i1')).rejects.toThrow('Failed to delete chat instance (status 404)');
    await expect(ChatService.updateInstance('i1', { title: 'a' })).rejects.toThrow('Failed to rename chat instance (status 404)');
  });

  it('listMessages: GET /chat-messages?instanceId=; sem data devolve []', async () => {
    reply(200, { success: true, data: [{ id: 'm1' }] });
    await expect(ChatService.listMessages('i1')).resolves.toEqual([{ id: 'm1' }]);
    expect(lastCall().url).toMatch(/\/chat-messages\?instanceId=i1$/);
    reply(200, { success: true });
    await expect(ChatService.listMessages('i1')).resolves.toEqual([]);
  });

  it('sendMessage: POST /chat; desembrulha data, senão devolve o corpo cru', async () => {
    const input = { query: 'oi', chatInstanceId: 'i1', documentIds: ['d1'] };
    reply(200, { success: true, data: { answer: 'A' } });
    await expect(ChatService.sendMessage(input)).resolves.toEqual({ answer: 'A' });
    expect(lastCall().url).toMatch(/\/chat$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual(input);
    reply(200, { response: 'R' });
    await expect(ChatService.sendMessage(input)).resolves.toEqual({ response: 'R' });
    reply(502, {});
    await expect(ChatService.sendMessage(input)).rejects.toMatchObject({ message: 'Falha ao enviar mensagem (status 502)', status: 502 });
    // silent: o erro aparece no chat, sem toast do apiClient.
    expect(notify).not.toHaveBeenCalled();
  });

  it('falha de rede: ChatApiError sem status, com a mensagem nativa', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await ChatService.listInstances().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ message: 'Failed to fetch', status: undefined });
  });
});

describe('DocumentService.listForSelection', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('GET /documents?mode=list com cache no-store; devolve o corpo cru', async () => {
    reply(200, { success: true, data: [{ id: 'd1', fileName: 'a.pdf' }] });
    await expect(DocumentService.listForSelection()).resolves.toEqual({ success: true, data: [{ id: 'd1', fileName: 'a.pdf' }] });
    expect(lastCall().url).toMatch(/\/documents\?mode=list$/);
    expect(lastCall().init.cache).toBe('no-store');
  });

  // Guarda FIX-CHAT-AGENTE §3.3 #4 (ACHADOS-2026-10-19): a rota GET /documents ignora `mode` e devolve a página
  // paginada (não um array) → o seletor sempre mostra "formato inválido". A lista do seletor é GET /documents/list.
  it('o seletor busca GET /documents/list (a rota que devolve a lista do usuário)', async () => {
    reply(200, { success: true, data: [{ id: 'd1', fileName: 'a.pdf' }] });
    await DocumentService.listForSelection();
    expect(lastCall().url).toMatch(/\/documents\/list$/);
  });

  it('não-2xx → Error("Falha ao buscar documentos."); rede → mensagem nativa', async () => {
    reply(500, { message: 'x' });
    await expect(DocumentService.listForSelection()).rejects.toEqual(new Error('Falha ao buscar documentos.'));
    expect(notify).not.toHaveBeenCalled();
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(DocumentService.listForSelection()).rejects.toEqual(new Error('Failed to fetch'));
  });
});
