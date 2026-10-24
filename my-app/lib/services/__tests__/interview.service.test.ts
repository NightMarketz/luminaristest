import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewApiError, InterviewService } from '../interview.service';
import { notify } from '../../notifications/notify';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';

/** interview.service — R2b: URL, corpo e signal dos fetch da Entrevista; erro com status + corpo para o hook ramificar. */
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

describe('InterviewService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('chatInterview: POST /dashboard/ai/ChatInterview com corpo, Bearer e signal; devolve o corpo cru', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { response: 'Olá', nextStage: 'X' }));
    const controller = new AbortController();
    await expect(InterviewService.chatInterview({ messages: [], stage: 'GREETING' }, controller.signal))
      .resolves.toEqual({ response: 'Olá', nextStage: 'X' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/dashboard\/ai\/ChatInterview$/);
    expect(init.method).toBe('POST');
    expect(init.signal).toBe(controller.signal);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(String(init.body))).toEqual({ messages: [], stage: 'GREETING' });
  });

  it('erro HTTP: InterviewApiError com status e o corpo (code) sem o status', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(404, { success: false, error: 'sumiu', code: 'INTERVIEW_SESSION_NOT_FOUND' }));
    const err = await InterviewService.chatInterview({ stage: 'X' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InterviewApiError);
    expect(err).toMatchObject({ status: 404, body: { success: false, error: 'sumiu', code: 'INTERVIEW_SESSION_NOT_FOUND' } });
    // silent: a Entrevista trata 404/409 de sessão na conversa, sem toast do apiClient.
    expect(notify).not.toHaveBeenCalled();
  });

  it('customizeFields (W6 item 13): POST /dashboard/ai/CustomizeFields com o corpo do DTO gerado, sem histórico', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { sessionId: 's1' }));
    const message = { kind: 'message', sessionId: 's1', tableKey: 't', message: 'oi' } satisfies CustomizeFieldsDtoInput;
    await expect(InterviewService.customizeFields(message)).resolves.toEqual({ sessionId: 's1' });
    expect(lastCall().url).toMatch(/\/dashboard\/ai\/CustomizeFields$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual(message);

    const decision = {
      kind: 'decision', sessionId: 's1', tableKey: 't', proposalId: 'p1', decision: 'apply', acknowledgeSensitive: true,
    } satisfies CustomizeFieldsDtoInput;
    await InterviewService.customizeFields(decision);
    expect(JSON.parse(String(lastCall().init.body))).toEqual(decision);
  });

  it('customizeFields (W6 item 13): o tipo gerado morde o corpo antigo', () => {
    // @ts-expect-error — `conversationHistory` não existe no DTO `.strict()` (F-W6-3: o histórico mora no servidor).
    const legado: CustomizeFieldsDtoInput = { kind: 'message', sessionId: 's', tableKey: 't', message: 'm', conversationHistory: [] };
    // @ts-expect-error — `userMessage` era o nome antigo; o DTO pede `kind` + `message`.
    const semKind: CustomizeFieldsDtoInput = { sessionId: 's', tableKey: 't', userMessage: 'm' };
    expect([legado, semKind]).toHaveLength(2);
  });

  it('falha de rede: sem status, mensagem nativa', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(InterviewService.customizeFields({ kind: 'message', sessionId: 's', tableKey: 't', message: 'm' }))
      .rejects.toMatchObject({ message: 'Failed to fetch', status: undefined });
  });
});
