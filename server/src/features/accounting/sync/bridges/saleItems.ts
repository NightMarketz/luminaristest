/**
 * Shared sale-item classifier for the sale accounting bridges (Incremento G P4/P5).
 *
 * The all-Package routing decision MUST be proven from the actual `saleItems`, not
 * inferred from the sale header. Both the anti-revenue gate (in the finalized bridge)
 * and the package-origin bridge use this single source of truth. P5 also needs the
 * distinct packageIds to credit the right balance (MVP: exactly one per package sale).
 *
 * Reads via the DynamicTable REPOSITORY only (one indexed lookup + one row query) — it
 * never touches DynamicTableService/RuleContext/RulePlugin (§2.1 boundary holds; the
 * dependency points accounting → repository, never the reverse).
 */

import { getFactory } from '../../../../lib/factory';
import logger from '../../../../lib/logger';
import { classifyTaxId } from '../../../../lib/cnpj';
import { classifySaleItem as classifyItem, toNum } from '../../../../lib/saleLine';

export type SaleItemsKind = 'Product' | 'Service' | 'Package' | 'Mixed' | 'Empty';

/**
 * Raw per-nature line subtotals in reais (Σ quantity×unitPrice), for the revenue split
 * (ADR-INCR-REVENUE-SPLIT). Bucketed by the SAME classification the `kind` uses (relation-id
 * first), so an item's amount lands in whichever bucket the classifier already picked. Package
 * lines contribute to neither (their revenue is prepaid/deferred — out of scope). Kept RAW
 * (reais, float); the mapper is the single money boundary that converts to cents and splits.
 */
export interface RevenueByNature {
  serviceReais: number;
  productReais: number;
}

/** One product line of a sale, for the CMV baixa (INCR-INVENTORY, Body 2). `productRef` is the
 *  saleItem's `productId` (the same reference the inventory subledger keys on); `qty` its quantity. */
export interface ProductLine {
  productRef: string;
  qty: number;
}

export interface SalePackageInfo {
  kind: SaleItemsKind;
  /** Distinct packageIds across the sale's Package items (MVP expects length ≤ 1). */
  packageIds: string[];
  /** Per-nature line subtotals for the revenue split. */
  revenueByNature: RevenueByNature;
  /**
   * Product lines ONLY (Service/Package excluded), for the cost-of-goods baixa (Body 2). A line is
   * emitted solely when it has a `productId` (an inventory reference to key the subledger on); a
   * Product-typed line without a productId cannot be valued and is skipped.
   */
  productLines: ProductLine[];
}

/**
 * EFICIENCIA-FISCAL PR-1 item 9 + F-EF-15 a (BRIEF BE-INCR-EFICIENCIA-FISCAL; D-2026-10-22-EFICIENCIA-FISCAL-FORKS): valor da
 * linha para o rateio da receita. Venda com desconto INCONDICIONAL destacado por item ⇒ peso LÍQUIDO (quantidade × preço −
 * discountCents/100) — a mesma fonte para o razão (`revenueByNature` → `splitRevenueCredit`), a subrazão
 * (`ratearReceita`) e a DPS; CONDITIONAL ou venda legada ⇒ peso bruto (I-4; LC 87 art. 13 § 1º II "a"; LC 214 art. 12 § 3º).
 * Com o critério proporcional o resultado é o de antes, salvo arredondamento (o desconto já seguia o peso bruto).
 * Nunca negativo (review do #913): sem a coluna `quantity` (preset só-serviços) o bruto é 0 e o desconto não pode
 * virar peso negativo no `splitRevenueCredit`.
 */
function lineValueReais(d: Record<string, unknown>, incondicional: boolean): number {
  const bruto = toNum(d.quantity) * toNum(d.unitPrice);
  return incondicional ? Math.max(0, bruto - toNum(d.discountCents) / 100) : bruto;
}

/**
 * A venda tem desconto INCONDICIONAL destacado por item? Só lê o cabeçalho quando algum item traz `discountCents` — a venda
 * legada (sem desconto por item) nunca paga a leitura extra e segue no peso bruto.
 */
async function isUnconditionalSale(userId: string, saleId: string, rows: ReadonlyArray<{ data: unknown }>): Promise<boolean> {
  if (!rows.some((r) => toNum((r.data as Record<string, unknown> | null)?.discountCents) !== 0)) return false;
  const repo = getFactory().getDynamicTableRepository();
  const salesTable = await repo.findTableByInternalName(userId, 'sales');
  const row = salesTable ? await repo.findDataById(saleId) : null;
  if (!row || row.dynamicTableId !== salesTable!.id) return false;
  return (row.data as Record<string, unknown> | null)?.discountKind === 'UNCONDITIONAL';
}

/** Load + classify a sale's items by querying the tenant's `saleItems` table for that saleId. */
export async function loadSalePackageInfo(userId: string, saleId: string): Promise<SalePackageInfo> {
  const repo = getFactory().getDynamicTableRepository();
  const itemsTable = await repo.findTableByInternalName(userId, 'saleItems');
  if (!itemsTable) return { kind: 'Empty', packageIds: [], revenueByNature: { serviceReais: 0, productReais: 0 }, productLines: [] };

  const rows = await repo.findRowsByFieldValue(itemsTable.id, 'saleId', saleId);
  if (rows.length === 0) return { kind: 'Empty', packageIds: [], revenueByNature: { serviceReais: 0, productReais: 0 }, productLines: [] };

  const kinds = new Set<string>();
  const packageIds = new Set<string>();
  const productLines: ProductLine[] = [];
  let serviceReais = 0;
  let productReais = 0;
  const incondicional = await isUnconditionalSale(userId, saleId, rows);
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const lineReais = lineValueReais(d, incondicional);
    const k = classifyItem(d);
    if (k === 'Product') {
      kinds.add('Product');
      productReais += lineReais;
      // COGS baixa needs a product reference: only a line with a productId can be valued in the
      // subledger. A Product-typed line without one contributes to revenue but not to CMV.
      if (d.productId) productLines.push({ productRef: String(d.productId), qty: toNum(d.quantity) });
    } else if (k === 'Service') {
      kinds.add('Service');
      serviceReais += lineReais;
    } else if (k === 'Package') {
      kinds.add('Package');
      if (d.packageId) packageIds.add(String(d.packageId));
    } else {
      kinds.add('Unknown');
    }
  }

  let kind: SaleItemsKind = 'Mixed';
  if (kinds.size === 1) {
    const only = [...kinds][0];
    if (only === 'Product' || only === 'Service' || only === 'Package') kind = only;
  }
  return { kind, packageIds: [...packageIds], revenueByNature: { serviceReais, productReais }, productLines };
}

/** True only when every item is a Package item (the prepaid-origin routing condition). */
export async function isAllPackageSale(userId: string, saleId: string): Promise<boolean> {
  return (await loadSalePackageInfo(userId, saleId)).kind === 'Package';
}

/**
 * BE-INCR-PACOTE-VALIDADE (BRIEF item 3) — the ONE source of a package's `validityDays`, read from the
 * tenant's `packages` catalog row through the DynamicTable REPOSITORY (never the service — §2.1). Used by
 * both credit call sites (the package-sold bridge and the reconcile origin pass).
 * Missing catalog/row, or a value that is not an integer ≥ 0 → null + warn: a validity is NEVER invented.
 * An absent/null field is a package without validity → null, silently.
 */
export async function loadPackageValidityDays(userId: string, packageId: string): Promise<number | null> {
  const repo = getFactory().getDynamicTableRepository();
  const catalog = await repo.findTableByInternalName(userId, 'packages');
  const row = catalog && (await repo.existsByIdInTable(packageId, catalog.id)) ? await repo.findDataById(packageId) : null;
  if (!row) {
    logger.warn('Package catalog row not found — no validity applied', { packageId });
    return null;
  }
  const value = (row.data as Record<string, unknown> | null)?.validityDays;
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    logger.warn('Package validityDays is not an integer ≥ 0 — no validity applied', { packageId, value });
    return null;
  }
  return value;
}

/** One Service-typed line of a sale, for the DPS assembly (BE-INCR-DFE, BRIEF item 15). */
export interface SaleServiceLine {
  serviceRef: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** EFICIENCIA-FISCAL PR-1 (F-EF-16 a): desconto destacado do item, centavos inteiros (0 sem desconto). */
  discountCents: number;
}

/**
 * Load ONLY the Service-typed lines of a sale (BE-INCR-DFE, BRIEF item 15) — same repository lookup
 * as `loadSalePackageInfo`, without touching the classifier. Lines without a `serviceId` are skipped
 * (an unresolvable service reference cannot build a DPS `cServ` group).
 */
export async function loadSaleServiceLines(userId: string, saleId: string): Promise<SaleServiceLine[]> {
  const repo = getFactory().getDynamicTableRepository();
  const itemsTable = await repo.findTableByInternalName(userId, 'saleItems');
  if (!itemsTable) return [];

  const rows = await repo.findRowsByFieldValue(itemsTable.id, 'saleId', saleId);
  const lines: SaleServiceLine[] = [];
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const isService = Boolean(d.serviceId) || String(d.type ?? '') === 'Service';
    if (!isService || !d.serviceId) continue;
    lines.push({
      serviceRef: String(d.serviceId),
      description: String(d.description ?? ''),
      quantity: toNum(d.quantity),
      unitPrice: toNum(d.unitPrice),
      discountCents: Math.round(toNum(d.discountCents)),
    });
  }
  return lines;
}

/** BE-INCR-NFCE (nó X10a, item 13) — one Product line of a sale, for the NF-e/NFC-e assembly. */
export interface SaleProductLine {
  itemRef: string;
  productRef: string;
  quantity: number;
  /** Σ quantity×unitPrice in reais — the weight of the 3.3 rateio (item 14), same classifier as `revenueByNature`. */
  lineReais: number;
}

/**
 * BE-INCR-NFCE (nó X10a, item 13) — the Product lines of a sale, classified by the SAME `classifyItem` as the 3.3 credit
 * (`revenueByNature`), so the per-line rateio sums to the ledger. Ordered by item id (deterministic). Lines without a
 * `productId` are skipped (no product profile to read).
 */
export async function loadSaleProductLines(userId: string, saleId: string): Promise<SaleProductLine[]> {
  const repo = getFactory().getDynamicTableRepository();
  const itemsTable = await repo.findTableByInternalName(userId, 'saleItems');
  if (!itemsTable) return [];
  const rows = await repo.findRowsByFieldValue(itemsTable.id, 'saleId', saleId);
  const out: SaleProductLine[] = [];
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    if (classifyItem(d) !== 'Product' || !d.productId) continue;
    out.push({ itemRef: r.id, productRef: String(d.productId), quantity: toNum(d.quantity), lineReais: toNum(d.quantity) * toNum(d.unitPrice) });
  }
  return out.sort((a, b) => (a.itemRef < b.itemRef ? -1 : a.itemRef > b.itemRef ? 1 : 0));
}

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, item 15) — one revenue line of a sale for the fiscal revenue subledger,
 * bucketed by the SAME classifier as `revenueByNature` (so the per-line rateio sums to the 3.1/3.3 credits).
 * Package/Unknown lines are not revenue here (prepaid / unclassifiable) and are omitted.
 */
export interface SaleRevenueLine {
  itemRef: string;
  nature: 'Service' | 'Product';
  serviceRef: string | null;
  productRef: string | null;
  /** `responsibleEmployeeId` of the line — the professional the partnership contract is keyed on (B-3 → a). */
  employeeRef: string | null;
  lineReais: number;
}

/**
 * X14 PR-4 (F-PR4-9) — tipo do documento do cliente da venda (`customerId` → linha da tabela `customers` DESTE dono →
 * `taxId`), pelo mesmo critério do tomador da DPS (`classifyTaxId`). Sem cliente, de outra tabela ou documento inválido ⇒
 * NAO_IDENTIFICADO.
 */
export async function loadSaleTomadorTipo(userId: string, saleId: string): Promise<'CNPJ' | 'CPF' | 'NAO_IDENTIFICADO'> {
  const repo = getFactory().getDynamicTableRepository();
  const [salesTable, customersTable] = await Promise.all([repo.findTableByInternalName(userId, 'sales'), repo.findTableByInternalName(userId, 'customers')]);
  const sale = salesTable ? await repo.findDataById(saleId) : null;
  const customerId = sale && sale.dynamicTableId === salesTable!.id ? (sale.data as Record<string, unknown>)?.customerId : undefined;
  if (typeof customerId !== 'string' || !customerId || !customersTable) return 'NAO_IDENTIFICADO';
  const customer = await repo.findDataById(customerId);
  if (!customer || customer.dynamicTableId !== customersTable.id) return 'NAO_IDENTIFICADO';
  const doc = classifyTaxId(String((customer.data as Record<string, unknown>)?.taxId ?? ''));
  return doc?.cnpj ? 'CNPJ' : doc?.cpf ? 'CPF' : 'NAO_IDENTIFICADO';
}

export async function loadSaleRevenueLines(userId: string, saleId: string): Promise<SaleRevenueLine[]> {
  const repo = getFactory().getDynamicTableRepository();
  const itemsTable = await repo.findTableByInternalName(userId, 'saleItems');
  if (!itemsTable) return [];
  const rows = await repo.findRowsByFieldValue(itemsTable.id, 'saleId', saleId);
  const incondicional = await isUnconditionalSale(userId, saleId, rows);
  const out: SaleRevenueLine[] = [];
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const k = classifyItem(d);
    if (k !== 'Service' && k !== 'Product') continue;
    out.push({
      itemRef: r.id,
      nature: k,
      serviceRef: d.serviceId ? String(d.serviceId) : null,
      productRef: d.productId ? String(d.productId) : null,
      employeeRef: d.responsibleEmployeeId ? String(d.responsibleEmployeeId) : null,
      lineReais: lineValueReais(d, incondicional),
    });
  }
  return out.sort((a, b) => (a.itemRef < b.itemRef ? -1 : a.itemRef > b.itemRef ? 1 : 0));
}
