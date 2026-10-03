import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  CreateSavedTableViewInput,
  UpdateSavedTableViewInput,
} from '@/types/contracts/savedViews/SavedTableViewDto.gen';

/**
 * savedView.service.ts
 *
 * Frontend service wrapping the backend-shared Saved Views endpoints:
 *   GET    /api/saved-views?tableId=
 *   POST   /api/saved-views
 *   PATCH  /api/saved-views/:id
 *   DELETE /api/saved-views/:id
 *
 * Used (opt-in) by the canonical table stack to persist per-user, cross-device
 * filter/sort presets. Request bodies are typed by the generated contract
 * (`@/types/contracts/savedViews`); response types are local; zero `any`.
 */

/** The serializable state captured by a saved view (mirrors GenericTabbedView state). */
export type SavedViewConfig = CreateSavedTableViewInput['config'];

export interface SavedView {
  id: string;
  tableId: string;
  name: string;
  config: SavedViewConfig;
  createdAt: string;
  updatedAt: string;
}

// Contrato gerado (savedViews/SavedTableViewDto) — nunca espelho à mão.
export type CreateSavedViewInput = CreateSavedTableViewInput;

export type UpdateSavedViewInput = UpdateSavedTableViewInput;

interface ListResponse {
  success: boolean;
  data: SavedView[];
}

interface SingleResponse {
  success: boolean;
  data: SavedView;
}

export const SavedViewService = {
  async listViews(tableId: string): Promise<{ success: boolean; data: SavedView[] }> {
    const res = await apiClient.get<ListResponse>(
      `/saved-views?tableId=${encodeURIComponent(tableId)}`,
    );
    return { success: Boolean(res?.success), data: Array.isArray(res?.data) ? res.data : [] };
  },

  async createView(
    input: CreateSavedViewInput,
    options?: { successMessage?: string | null },
  ): Promise<SingleResponse> {
    const result = await apiClient.post<SingleResponse>('/saved-views', input);
    const msg =
      options?.successMessage !== undefined ? options.successMessage : 'Visão salva com sucesso.';
    if (msg) notify(msg, 'success', 'Sucesso');
    return result;
  },

  async updateView(
    id: string,
    patch: UpdateSavedViewInput,
    options?: { successMessage?: string | null },
  ): Promise<SingleResponse> {
    const result = await apiClient.patch<SingleResponse>(`/saved-views/${id}`, patch);
    const msg =
      options?.successMessage !== undefined
        ? options.successMessage
        : 'Visão atualizada com sucesso.';
    if (msg) notify(msg, 'success', 'Sucesso');
    return result;
  },

  async deleteView(
    id: string,
    options?: { successMessage?: string | null },
  ): Promise<{ success: boolean }> {
    const result = await apiClient.delete<{ success: boolean }>(`/saved-views/${id}`);
    const msg =
      options?.successMessage !== undefined ? options.successMessage : 'Visão excluída com sucesso.';
    if (msg) notify(msg, 'success', 'Sucesso');
    return result;
  },
};

export default SavedViewService;
