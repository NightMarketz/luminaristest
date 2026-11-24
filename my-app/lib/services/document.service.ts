import { apiClient } from '../api/api-client';
import { multipartAuthHeaders, multipartBaseUrl, multipartParseError } from './multipart';

interface DocumentResponse { id?: string; name?: string; [key: string]: unknown }
interface UploadResponse { id?: string; url?: string; [key: string]: unknown }
interface TokenCostResponse { tokens?: number; cost?: number; [key: string]: unknown }
interface DeleteResponse { success?: boolean; [key: string]: unknown }

export const DocumentService = {
  async getDocuments(): Promise<unknown> {
    return apiClient.get('/documents');
  },

  /**
   * GET /documents/list (no cache) — the chat document picker's list. Returns the raw body so the
   * caller validates `data`. Rejects with an `Error`: `Falha ao buscar documentos.` on a non-2xx
   * response, the native message on a network failure. `silent`: the picker shows its own error.
   */
  async listForSelection(): Promise<{ data?: unknown }> {
    try {
      return await apiClient.get<{ data?: unknown }>('/documents/list', { cache: 'no-store', silent: true });
    } catch (err) {
      const e = (err ?? {}) as { message?: unknown; error?: unknown; status?: unknown };
      if (typeof e.status === 'number') throw new Error('Falha ao buscar documentos.');
      // No response: apiClient rethrows the native error (TypeError 'Failed to fetch').
      throw new Error(typeof e.message === 'string' ? e.message : typeof e.error === 'string' ? e.error : '');
    }
  },

  async getDocumentById(docId: string): Promise<DocumentResponse> {
    return apiClient.get(`/documents/${docId}`);
  },

  async uploadDocument(formData: FormData): Promise<UploadResponse> {
    // BRD F-72.6: o mesmo caminho dos outros uploads (`multipart.ts`): URL base com default, cookie lido pelo nome
    // exato e o erro no formato do apiClient. O browser põe o boundary — sem Content-Type aqui.
    const response = await fetch(`${multipartBaseUrl()}/documents/upload`, {
      method: 'POST',
      headers: multipartAuthHeaders(),
      body: formData,
    });
    if (!response.ok) throw await multipartParseError(response);
    return response.json();
  },

  async getTokenCost(formData: FormData): Promise<TokenCostResponse> {
    const response = await fetch(`${multipartBaseUrl()}/documents/token-cost`, {
      method: 'POST',
      headers: multipartAuthHeaders(),
      body: formData,
    });
    if (!response.ok) throw await multipartParseError(response);
    // The server answers { success, data: { tokens, charCount } }.
    const body = await response.json() as { data?: TokenCostResponse } & TokenCostResponse;
    return body.data ?? body;
  },

  async deleteDocument(docId: string): Promise<DeleteResponse> {
    return apiClient.delete(`/documents/${docId}`);
  }
};
