import { apiClient } from '../api/api-client';

/**
 * dashboardLayout.service.ts
 *
 * Per-user dashboard tabs (`/api/dashboard-layout`). Moved from
 * `components/widgets/dashboard-grid/dashboard-layout.api.ts` (lint R2b, `DEBT: fetch`).
 *
 * Callers branch on `err instanceof Error ? err.message : …`, so every `apiClient` rejection
 * (a plain `{ ...body, status }` object) is rethrown as an `Error` with the same message the
 * old module produced. `apiClient` also toasts the server message on any non-2xx.
 */

export interface DashboardGridItem {
  i: string;
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
  widgetConfig?: any;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  type: string;
  config: {
    positions?: DashboardGridItem[];
    columns?: number;
    widgets?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LayoutConfigPayload {
  positions: DashboardGridItem[];
  columns: number;
  widgets: string[];
}

interface Envelope<T> {
  success?: boolean;
  data: T;
}

const BASE = '/dashboard-layout';

function toError(err: unknown, fallback: string): Error {
  const e = (err ?? {}) as { message?: unknown; error?: unknown; status?: unknown };
  if (typeof e.message === 'string' && e.message) return new Error(e.message);
  if (typeof e.status === 'number') return new Error(`${fallback} (status ${e.status})`);
  // No status = no response: apiClient rethrows the native error (handled by `message` above), or
  // `{ error }` when the error body carried neither `error` nor `message` (status is lost there).
  return new Error(typeof e.error === 'string' && e.error ? e.error : fallback);
}

async function call<T>(req: () => Promise<Envelope<T>>, fallback = 'Dashboard layout request failed'): Promise<T> {
  try {
    const body = await req();
    return body.data;
  } catch (err) {
    throw toError(err, fallback);
  }
}

export const DashboardLayoutService = {
  /** Lists all of the current user's layouts (tabs). */
  list(): Promise<DashboardLayout[]> {
    return call(() => apiClient.get<Envelope<DashboardLayout[]>>(BASE));
  },

  /** Creates a new layout (tab); it becomes the active one. */
  create(name: string, config: LayoutConfigPayload): Promise<DashboardLayout> {
    return call(() => apiClient.post<Envelope<DashboardLayout>>(BASE, { name, type: 'GRID', config }));
  },

  /** Persists the grid configuration of a specific layout. */
  saveConfig(id: string, config: LayoutConfigPayload): Promise<DashboardLayout> {
    return call(() => apiClient.patch<Envelope<DashboardLayout>>(`${BASE}/${id}`, { config }));
  },

  /** Renames a layout (tab). */
  rename(id: string, name: string): Promise<DashboardLayout> {
    return call(() => apiClient.patch<Envelope<DashboardLayout>>(`${BASE}/${id}`, { name }));
  },

  /** Switches the active layout (tab). */
  activate(id: string): Promise<DashboardLayout> {
    return call(() => apiClient.post<Envelope<DashboardLayout>>(`${BASE}/${id}/activate`, {}));
  },

  /** Deletes a layout (tab). */
  async remove(id: string): Promise<void> {
    await call(() => apiClient.delete<Envelope<unknown>>(`${BASE}/${id}`), 'Failed to delete layout');
  },
};
