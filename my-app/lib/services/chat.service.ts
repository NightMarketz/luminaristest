import { apiClient } from '../api/api-client';
import type { ChatRequestInput } from '@/types/contracts/chat/ChatDto.gen';
import type {
  GetOrCreateChatInstanceInput,
  ListChatInstancesQueryInput,
  UpdateChatInstanceInput,
} from '@/types/contracts/chatInstances/ChatInstanceDto.gen';

/**
 * chat.service.ts
 *
 * Chat endpoints (`/chat-instances`, `/chat-messages`, `POST /chat`). Moved out of the two parallel
 * hook sets — `components/widgets/chat/hooks/*` and `components/widgets/shared/hooks/*` — for lint R2b
 * (`DEBT: fetch`). The hook sets are NOT unified here (owner's reuse decision); each keeps its own
 * view types, so the response readers are generic like `apiClient.get<T>` (the old code read
 * `json.data` as `any`). Request bodies are typed by the generated contracts.
 *
 * Every rejection becomes a `ChatApiError` (an `Error`, so `err instanceof Error ? err.message` in the
 * hooks keeps working) carrying the HTTP `status` (absent on network failure) and the server `message`.
 * `apiClient` also toasts the server message on any non-2xx.
 */

export class ChatApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; `undefined` when the request never got a response. */
    readonly status?: number,
    /** `message` field of the server's error body, when it sent one. */
    readonly serverMessage?: string,
  ) {
    super(message);
    this.name = 'ChatApiError';
  }
}

interface Envelope<T> {
  success?: boolean;
  data: T;
}

interface ErrorOptions {
  /** Message when the server answered non-2xx; receives the status. */
  fallback: (status: number) => string;
  /** Use the server's `message` (when present) instead of `fallback`. */
  preferServerMessage: boolean;
}

function toChatError(err: unknown, opts: ErrorOptions): ChatApiError {
  const e = (err ?? {}) as { message?: unknown; error?: unknown; status?: unknown };
  const serverMessage = typeof e.message === 'string' && e.message ? e.message : undefined;
  if (typeof e.status === 'number') {
    return new ChatApiError(
      opts.preferServerMessage && serverMessage ? serverMessage : opts.fallback(e.status),
      e.status,
      serverMessage,
    );
  }
  // No status = no response: apiClient rethrows the native error (e.g. TypeError 'Failed to fetch'),
  // or `{ error }` when the error body carried neither `error` nor `message` (status is lost there).
  const native = serverMessage ?? (typeof e.error === 'string' && e.error ? e.error : undefined);
  return new ChatApiError(native ?? 'Network request failed');
}

async function call<T>(req: () => Promise<T>, opts: ErrorOptions): Promise<T> {
  try {
    return await req();
  } catch (err) {
    throw toChatError(err, opts);
  }
}

export const ChatService = {
  /** GET /chat-instances[?type=] — the caller's chat list. */
  async listInstances<T>(type?: ListChatInstancesQueryInput['type']): Promise<T[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const body = await call(() => apiClient.get<Envelope<T[]>>(`/chat-instances${query}`), {
      fallback: (s) => `Falha ao buscar lista de chats (status ${s})`,
      preferServerMessage: false,
    });
    return body.data;
  },

  /** POST /chat-instances/get-or-create — idempotent per widgetInstanceId. */
  async getOrCreateInstance<T>(input: GetOrCreateChatInstanceInput): Promise<T> {
    const body = await call(() => apiClient.post<Envelope<T>>('/chat-instances/get-or-create', input), {
      fallback: (s) => `Failed to get/create chat instance (status ${s})`,
      preferServerMessage: true,
    });
    return body.data;
  },

  /** PUT /chat-instances/:id */
  async updateInstance(id: string, input: UpdateChatInstanceInput): Promise<void> {
    await call(() => apiClient.put(`/chat-instances/${encodeURIComponent(id)}`, input), {
      fallback: (s) => `Failed to rename chat instance (status ${s})`,
      preferServerMessage: true,
    });
  },

  /** DELETE /chat-instances/:id */
  async deleteInstance(id: string): Promise<void> {
    await call(() => apiClient.delete(`/chat-instances/${encodeURIComponent(id)}`), {
      fallback: (s) => `Failed to delete chat instance (status ${s})`,
      preferServerMessage: true,
    });
  },

  /** GET /chat-messages?instanceId= — the instance's history (`[]` when the server sends no data). */
  async listMessages<T>(instanceId: string): Promise<T[]> {
    const body = await call(
      () => apiClient.get<Partial<Envelope<T[]>>>(`/chat-messages?instanceId=${encodeURIComponent(instanceId)}`),
      { fallback: (s) => `Falha ao carregar mensagens (status ${s})`, preferServerMessage: true },
    );
    return body.data || [];
  },

  /**
   * POST /chat — the server persists the user message and the reply. Returns the reply payload
   * (`data`, or the raw body when the envelope is missing — same fallback the hooks had).
   */
  async sendMessage<T>(input: ChatRequestInput): Promise<T> {
    const body = await call(() => apiClient.post<Envelope<T> | T>('/chat', input), {
      fallback: (s) => `Falha ao enviar mensagem (status ${s})`,
      preferServerMessage: true,
    });
    const envelope = body as Partial<Envelope<T>> | null;
    return (envelope?.data ?? body) as T;
  },
};
