import { DynamicTableService } from '../../../lib/services/dynamic-table.service';

export interface ProductOption {
  /** DynamicTable row id — the `productRef` the accounting side expects (inventory arm / NF-e mapping). */
  id: string;
  name: string;
}

/**
 * Loads the tenant's `products` catalogue (DynamicTable) for a product dropdown. Extracted BY MOVE from
 * `CreatePayableModal.tsx` (FE-INCR-NFE, F-FENFE-3 → a) so the NF-e item mapping reuses the same
 * object: `productRef` = row id, label = `data.name` (falls back to the id).
 */
export async function loadProductOptions(): Promise<ProductOption[]> {
  const tables = await DynamicTableService.getTables();
  const products = (tables.data ?? []).find(
    (tbl) => (tbl as { internalName?: string }).internalName === 'products',
  );
  if (!products) return [];
  const rows = await DynamicTableService.getTableData(products.id, 'limit=500');
  return ((rows.data ?? []) as Array<{ id?: string; data?: Record<string, unknown> }>)
    .map((r) => ({
      id: String(r.id ?? ''),
      name: typeof r.data?.name === 'string' && r.data.name ? r.data.name : String(r.id ?? ''),
    }))
    .filter((p) => p.id !== '');
}
