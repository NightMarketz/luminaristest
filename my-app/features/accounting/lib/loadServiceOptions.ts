import { DynamicTableService } from '../../../lib/services/dynamic-table.service';

export interface ServiceOption {
  /** DynamicTable row id — o `serviceRef` do perfil fiscal do serviço. */
  id: string;
  name: string;
}

/**
 * Catálogo `services` do tenant (DynamicTable) para o painel de perfis fiscais de serviço (FE-INCR-DFE PR-0, item 7).
 * Mesma técnica de `loadProductOptions`: `serviceRef` = id da linha, rótulo = `data.name` (cai no id).
 * // ponytail: limit=500, paginar quando um tenant passar disso (BRIEF A7 — mesmo teto do NfePanel).
 */
export async function loadServiceOptions(): Promise<ServiceOption[]> {
  const tables = await DynamicTableService.getTables();
  const services = (tables.data ?? []).find((tbl) => (tbl as { internalName?: string }).internalName === 'services');
  if (!services) return [];
  const rows = await DynamicTableService.getTableData(services.id, 'limit=500');
  return ((rows.data ?? []) as Array<{ id?: string; data?: Record<string, unknown> }>)
    .map((r) => ({
      id: String(r.id ?? ''),
      name: typeof r.data?.name === 'string' && r.data.name ? r.data.name : String(r.id ?? ''),
    }))
    .filter((s) => s.id !== '');
}
