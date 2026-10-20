import { apiClient } from '../api/api-client';

interface DocumentResponse { id?: string; name?: string; [key: string]: unknown }
interface UploadResponse { id?: string; url?: string; [key: string]: unknown }
interface TokenCostResponse { tokens?: number; cost?: number; [key: string]: unknown }
interface QdrantStatusResponse { status?: string; [key: string]: unknown }
interface QdrantPointsResponse { points?: unknown[]; [key: string]: unknown }
interface DeleteResponse { success?: boolean; [key: string]: unknown }

export const DocumentService = {
  async getDocuments(): Promise<unknown> {
    return apiClient.get('/documents');
  },

  /**
   * GET /documents?mode=list (no cache) — the chat document picker's list. Returns the raw body so the
   * caller validates `data`. Rejects with an `Error`: `Falha ao buscar documentos.` on a non-2xx
   * response, the native message on a network failure. `silent`: the picker shows its own error.
   */
  async listForSelection(): Promise<{ data?: unknown }> {
    try {
      return await apiClient.get<{ data?: unknown }>('/documents?mode=list', { cache: 'no-store', silent: true });
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
    // Note: FormData requires a different content-type or letting browser set it
    // The apiClient defaults to application/json. We might need a generic or custom method
    // for multipart/form-data. For now, assuming the interceptor handles it if we pass headers
    // or we might need to adjust the apiClient for file uploads.
    // We will bypass apiClient exclusively for FormData uploads if it forces JSON,
    // or pass custom headers. Let's pass an empty content-type so browser sets boundary.
    const token = typeof window !== 'undefined' ? document.cookie.split('auth_token=')[1]?.split(';')[0] : '';
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw await response.json();
    return response.json();
  },

  async getTokenCost(formData: FormData): Promise<TokenCostResponse> {
    const token = typeof window !== 'undefined' ? document.cookie.split('auth_token=')[1]?.split(';')[0] : '';
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/token-cost`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw await response.json();
    return response.json();
  },

  async getQdrantStatus(): Promise<QdrantStatusResponse> {
    return apiClient.get('/documents/qdrant-status');
  },

  async getQdrantPoints(docId: string): Promise<QdrantPointsResponse> {
    return apiClient.get(`/documents/${docId}/qdrant`);
  },

  async deleteDocument(docId: string): Promise<DeleteResponse> {
    return apiClient.delete(`/documents/${docId}`);
  }
};
