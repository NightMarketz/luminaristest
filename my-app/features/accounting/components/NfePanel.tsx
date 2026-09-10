import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiUploadCloud, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { counterpartiesService, type Counterparty } from '../../../lib/services/counterparties.service';
import {
  nfeService,
  type NfeIgnoredItem,
  type NfePreview,
  type NfeSaleReconciliationReport,
} from '../../../lib/services/nfe.service';
import { loadProductOptions, type ProductOption } from '../lib/loadProductOptions';
import { forgetNfeMapping, recallNfeMappings, rememberNfeMappings } from '../lib/nfeMappingMemory';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveError } from '../lib/resolveError';

/**
 * NfePanel — aba "NF-e" do painel contábil (FE-INCR-NFE, rodada 2b; F-FENFE-2 → a).
 *
 * Duas seções empilhadas:
 *  - Compra: preview pelo servidor (`POST /api/nfe/preview`, F-FENFE-1 → b) → tabela de itens com o
 *    mapeamento cProd → productRef que o operador confirma (ADR-INCR-NFE D6) → `POST /api/nfe/purchase`.
 *    Pré-preenchimento: lembrado (memória local, F-FENFE-4 → c) > sugerido (nome exato único) > vazio.
 *    Nunca auto-submete; `alreadyImported` desabilita o import.
 *  - Venda: seletor de vendas FINALIZADAS da unidade (nunca `saleId` em texto livre — F-NFE8) →
 *    `POST /api/nfe/sale` → relatório de divergência inline. Nada é lançado.
 *
 * A tela NÃO calcula custo/rateio (D3 é do servidor): o único valor exibido é o vNF da nota.
 */

interface NfePanelProps {
  unitId: string;
  /** Refetch do balancete após o import (o import cria 1 Payable + entradas de estoque). */
  onLedgerChange?: () => void;
  /** Navegar para a aba Contrapartes (link "gerenciar fornecedores"). */
  onNavigateTab?: (tab: 'contrapartes') => void;
}

type MappingOrigin = 'lembrado' | 'sugerido' | '';

export interface SaleOption {
  id: string;
  label: string;
}

const inputClass =
  'rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50';
const secondaryBtn =
  'inline-flex items-center gap-2 rounded-xl border border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50';

/** Só para comparar com `Counterparty.taxId` (já normalizado no backend); espelho 1:1 de `lib/cnpj.ts`. */
function stripCnpjMask(raw: string): string {
  return raw.replace(/[./\-\s]/g, '').toUpperCase();
}

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function emitterDoc(preview: NfePreview): string {
  return preview.emit.cnpj ?? preview.emit.cpf ?? '';
}

function moneyFromFloat(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
}

function dateOnly(value: unknown): string {
  const s = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? formatDate(s.slice(0, 10)) : s || '—';
}

/** Vendas FINALIZADAS da unidade, lidas da DynamicTable `sales` (mesma técnica de loadProductOptions). */
export async function loadFinalizedSales(unitId: string): Promise<SaleOption[]> {
  const tables = await DynamicTableService.getTables();
  const sales = (tables.data ?? []).find((tbl) => (tbl as { internalName?: string }).internalName === 'sales');
  if (!sales) return [];
  const rows = await DynamicTableService.getTableData(sales.id, 'limit=500');
  return ((rows.data ?? []) as Array<{ id?: string; data?: Record<string, unknown> }>)
    .filter((r) => String(r.data?.unitId ?? '') === unitId)
    .filter((r) => String(r.data?.status ?? '').toLowerCase() === 'finalized')
    .map((r) => {
      const d = r.data ?? {};
      const customer = String(d.simpleCustomerName ?? d.customerName ?? d.customerId ?? '');
      const id = String(r.id ?? '');
      return {
        id,
        label: `${id.slice(0, 8)} · ${dateOnly(d.date)} · ${moneyFromFloat(d.totalAmount ?? d.subtotal)}${customer ? ` · ${customer}` : ''}`,
      };
    })
    .filter((o) => o.id !== '');
}

// ─────────────────────────────────────────────────────────────────────────── Compra

function NfePurchaseSection({ unitId, onLedgerChange, onNavigateTab }: NfePanelProps) {
  const { t } = useTranslation('accounting');
  const fileRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [preview, setPreview] = useState<NfePreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [origins, setOrigins] = useState<Record<string, MappingOrigin>>({});
  const [counterpartyId, setCounterpartyId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<NfeIgnoredItem[]>([]);

  // The preview handler awaits this alongside previewNfe: seeding from the render's `products`/`counterparties`
  // captured a stale closure — a preview resolving before the lists loaded silently lost "sugerido" and the
  // pre-selected supplier (CI flake in the import test, importPurchaseNfe 0 calls).
  const listsRef = useRef<Promise<[ProductOption[], Counterparty[]]>>(Promise.resolve([[], []]));
  useEffect(() => {
    let alive = true;
    const prods = loadProductOptions().catch((): ProductOption[] => []);
    const cps = counterpartiesService.listCounterparties({ unitId, type: 'SUPPLIER' }).catch((): Counterparty[] => []);
    listsRef.current = Promise.all([prods, cps]);
    prods.then((opts) => alive && setProducts(opts));
    cps.then((list) => alive && setCounterparties(list));
    return () => {
      alive = false;
    };
  }, [unitId]);

  const costedItems = useMemo(() => (preview?.itens ?? []).filter((it) => it.indTot === '1'), [preview]);
  const costedCProds = useMemo(() => Array.from(new Set(costedItems.map((it) => it.cProd))), [costedItems]);
  const allMapped = costedCProds.length > 0 && costedCProds.every((c) => (mappings[c] ?? '') !== '');
  const canImport = !!preview && !preview.alreadyImported && allMapped && !submitting;

  /** lembrado > sugerido > vazio (F-FENFE-4 → c). */
  function seedMappings(p: NfePreview, catalog: ProductOption[]) {
    const remembered = recallNfeMappings(emitterDoc(p));
    const byName = new Map<string, string[]>();
    for (const prod of catalog) {
      const key = normalizeName(prod.name);
      byName.set(key, [...(byName.get(key) ?? []), prod.id]);
    }
    const next: Record<string, string> = {};
    const nextOrigins: Record<string, MappingOrigin> = {};
    for (const it of p.itens) {
      if (it.indTot !== '1' || next[it.cProd] !== undefined) continue;
      const rem = remembered[it.cProd];
      if (rem && catalog.some((pr) => pr.id === rem)) {
        next[it.cProd] = rem;
        nextOrigins[it.cProd] = 'lembrado';
        continue;
      }
      const candidates = byName.get(normalizeName(it.xProd)) ?? [];
      if (candidates.length === 1) {
        next[it.cProd] = candidates[0];
        nextOrigins[it.cProd] = 'sugerido';
      } else {
        next[it.cProd] = '';
        nextOrigins[it.cProd] = '';
      }
    }
    setMappings(next);
    setOrigins(nextOrigins);
  }

  function preselectCounterparty(p: NfePreview, suppliers: Counterparty[]) {
    const doc = p.emit.cnpj ? stripCnpjMask(p.emit.cnpj) : '';
    const byTax = doc ? suppliers.find((c) => c.taxId && stripCnpjMask(c.taxId) === doc) : undefined;
    if (byTax) return setCounterpartyId(byTax.id);
    const name = p.emit.nome ? normalizeName(p.emit.nome) : '';
    const byName = name ? suppliers.find((c) => normalizeName(c.name) === name) : undefined;
    setCounterpartyId(byName?.id ?? '');
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!picked) return;
    setError(null);
    setNotice(null);
    setIgnored([]);
    setPreview(null);
    setLoading(true);
    try {
      const [p, [catalog, suppliers]] = await Promise.all([nfeService.previewNfe({ unitId }, picked), listsRef.current]);
      setFile(picked);
      setPreview(p);
      seedMappings(p, catalog);
      preselectCounterparty(p, suppliers);
    } catch (err) {
      setError(resolveError(err, t('nfe.purchase.previewError', 'Não foi possível ler a NF-e.')));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview || !file || !canImport) return;
    setError(null);
    setSubmitting(true);
    try {
      const itemMappings = costedCProds.map((cProd) => ({ cProd, productRef: mappings[cProd] }));
      const result = await nfeService.importPurchaseNfe(
        { unitId, itemMappings, counterpartyId: counterpartyId || undefined, dueDate: dueDate || undefined },
        file,
      );
      rememberNfeMappings(emitterDoc(preview), itemMappings);
      setNotice(
        t('nfe.purchase.success', 'NF-e importada: conta a pagar {{doc}} de {{amount}}.', {
          doc: result.payable.documentNumber ?? result.payable.id,
          amount: formatCents(result.payable.amountCents),
        }),
      );
      setIgnored(result.ignoredItems);
      setPreview(null);
      setFile(null);
      setMappings({});
      setOrigins({});
      setDueDate('');
      onLedgerChange?.();
    } catch (err) {
      setError(resolveError(err, t('nfe.purchase.importError', 'Dados inválidos — revise os campos.')));
    } finally {
      setSubmitting(false);
    }
  }

  function setMapping(cProd: string, productRef: string) {
    setMappings((m) => ({ ...m, [cProd]: productRef }));
    setOrigins((o) => ({ ...o, [cProd]: '' }));
  }

  function forget(cProd: string) {
    if (preview) forgetNfeMapping(emitterDoc(preview), cProd);
    setMapping(cProd, '');
  }

  const emitDocLabel = preview ? preview.emit.cnpj ?? preview.emit.cpf ?? '—' : '';

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4" data-testid="nfe-purchase-section">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-100">{t('nfe.purchase.heading', 'NF-e de compra')}</h3>
          <p className="text-xs text-neutral-400">
            {t('nfe.purchase.help', 'Selecione o XML da nota; confirme o produto de cada item e importe. Gera uma conta a pagar e as entradas de estoque.')}
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" onChange={handleFileSelected} className="hidden" data-testid="nfe-purchase-file" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading || submitting} className={primaryBtn}>
          <FiUploadCloud size={16} />
          {loading ? t('nfe.purchase.reading', 'Lendo…') : t('nfe.purchase.selectFile', 'Selecionar XML')}
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200" role="status">{notice}</div>}
      {ignored.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-200" data-testid="nfe-ignored">
          <div className="flex items-center gap-2 font-medium"><FiAlertTriangle size={14} /> {t('nfe.purchase.ignoredHeading', 'Itens não importados')}</div>
          <ul className="mt-1 list-disc pl-5">
            {ignored.map((it) => (
              <li key={it.nItem}>
                {it.nItem} — {it.cProd} — {it.xProd}: {t(`nfe.ignored.${it.reason}`, 'não compõe o total da nota (indTot = 0)')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <div className="space-y-4" data-testid="nfe-preview">
          {preview.alreadyImported && (
            <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-200" role="alert" data-testid="nfe-already-imported">
              {t('nfe.purchase.alreadyImported', 'Esta nota já foi importada (título {{id}}). O import está desabilitado.', { id: preview.existingPayableId ?? '' })}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
            <dt className="text-neutral-400">{t('nfe.preview.emitter', 'Emitente')}</dt>
            <dd className="text-neutral-100 md:col-span-3">{preview.emit.nome ?? '—'} <span className="font-mono text-neutral-400">{emitDocLabel}</span></dd>
            <dt className="text-neutral-400">{t('nfe.preview.number', 'Número / série')}</dt>
            <dd className="text-neutral-100">{preview.ide.numero} / {preview.ide.serie}</dd>
            <dt className="text-neutral-400">{t('nfe.preview.issued', 'Emissão')}</dt>
            <dd className="text-neutral-100">{formatDate(preview.ide.dhEmiDate)}</dd>
            <dt className="text-neutral-400">{t('nfe.preview.total', 'Valor da nota (vNF)')}</dt>
            <dd className="text-neutral-100" data-testid="nfe-vnf">{formatCents(preview.totais.vNFCents)}</dd>
            <dt className="text-neutral-400">{t('nfe.preview.key', 'Chave de acesso')}</dt>
            <dd className="font-mono text-xs text-neutral-300 md:col-span-3">{preview.chaveAcesso}</dd>
          </dl>

          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t('nfe.items.cProd', 'Código')}</th>
                  <th className="px-3 py-2">{t('nfe.items.xProd', 'Descrição')}</th>
                  <th className="px-3 py-2">{t('nfe.items.qty', 'Qtd')}</th>
                  <th className="px-3 py-2">{t('nfe.items.vProd', 'Valor')}</th>
                  <th className="px-3 py-2">{t('nfe.items.product', 'Produto no catálogo')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.itens.map((it) => {
                  const costed = it.indTot === '1';
                  const origin = origins[it.cProd] ?? '';
                  return (
                    <tr key={it.nItem} className="border-t border-neutral-800" data-testid={`nfe-item-row-${it.nItem}`}>
                      <td className="px-3 py-2 text-neutral-400">{it.nItem}</td>
                      <td className="px-3 py-2 font-mono text-neutral-200">{it.cProd}</td>
                      <td className="px-3 py-2 text-neutral-100">{it.xProd}</td>
                      <td className="px-3 py-2 text-neutral-300">{it.qCom} {it.uCom}</td>
                      <td className="px-3 py-2 text-neutral-300">{formatCents(it.vProdCents)}</td>
                      <td className="px-3 py-2">
                        {costed ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={mappings[it.cProd] ?? ''}
                              onChange={(e) => setMapping(it.cProd, e.target.value)}
                              className={inputClass}
                              disabled={preview.alreadyImported}
                              data-testid={`nfe-item-select-${it.cProd}`}
                            >
                              <option value="">{t('nfe.items.choose', 'Escolher produto…')}</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            {origin === 'lembrado' && (
                              <>
                                <span className="rounded-md bg-emerald-900/40 px-2 py-0.5 text-[11px] text-emerald-300" data-testid={`nfe-origin-${it.cProd}`}>{t('nfe.items.remembered', 'lembrado')}</span>
                                <button type="button" className={secondaryBtn} onClick={() => forget(it.cProd)}>{t('nfe.items.forget', 'esquecer')}</button>
                              </>
                            )}
                            {origin === 'sugerido' && (
                              <span className="rounded-md bg-sky-900/40 px-2 py-0.5 text-[11px] text-sky-300" data-testid={`nfe-origin-${it.cProd}`}>{t('nfe.items.suggested', 'sugerido')}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500" data-testid={`nfe-item-ignored-${it.nItem}`}>{t('nfe.items.notInTotal', 'não compõe o total — será ignorado')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-neutral-300">
              {t('nfe.purchase.supplier', 'Fornecedor (contraparte)')}
              <select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} className={`${inputClass} mt-1 w-full`} disabled={preview.alreadyImported} data-testid="nfe-counterparty">
                <option value="">{t('nfe.purchase.supplierAuto', 'Resolver pelo nome do emitente')}</option>
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {onNavigateTab && (
                <button type="button" className="mt-1 text-xs text-emerald-400 hover:underline" onClick={() => onNavigateTab('contrapartes')}>
                  {t('nfe.purchase.manageSuppliers', 'gerenciar fornecedores')}
                </button>
              )}
            </label>
            <label className="text-sm text-neutral-300">
              {t('nfe.purchase.dueDate', 'Vencimento (opcional)')}
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} mt-1 w-full`} disabled={preview.alreadyImported} data-testid="nfe-due-date" />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={handleImport} disabled={!canImport} className={primaryBtn} data-testid="nfe-import-btn">
                <FiCheckCircle size={16} />
                {submitting ? t('nfe.purchase.importing', 'Enviando…') : t('nfe.purchase.import', 'Importar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────── Venda

function NfeSaleSection({ unitId }: NfePanelProps) {
  const { t } = useTranslation('accounting');
  const fileRef = useRef<HTMLInputElement>(null);
  const [sales, setSales] = useState<SaleOption[] | null>(null);
  const [saleId, setSaleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<NfeSaleReconciliationReport | null>(null);

  useEffect(() => {
    let alive = true;
    setSales(null);
    loadFinalizedSales(unitId)
      .then((list) => alive && setSales(list))
      .catch(() => alive && setSales([]));
    return () => {
      alive = false;
    };
  }, [unitId]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked || !saleId) return;
    setError(null);
    setReport(null);
    setSubmitting(true);
    try {
      setReport(await nfeService.reconcileSaleNfe({ unitId, saleId }, picked));
    } catch (err) {
      setError(resolveError(err, t('nfe.sale.error', 'Não foi possível anexar a NF-e à venda.')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4" data-testid="nfe-sale-section">
      <div>
        <h3 className="text-base font-semibold text-neutral-100">{t('nfe.sale.heading', 'NF-e de venda')}</h3>
        <p className="text-xs text-neutral-400">
          {t('nfe.sale.help', 'Escolha a venda finalizada e anexe o XML. A nota vira documento de origem do lançamento; nada é relançado.')}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-neutral-300">
          {t('nfe.sale.pick', 'Venda finalizada')}
          <select value={saleId} onChange={(e) => setSaleId(e.target.value)} className={`${inputClass} mt-1 min-w-[20rem]`} disabled={sales === null || submitting} data-testid="nfe-sale-select">
            <option value="">{sales === null ? t('nfe.sale.loading', 'Carregando vendas…') : t('nfe.sale.choose', 'Escolher venda…')}</option>
            {(sales ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" onChange={handleFileSelected} className="hidden" data-testid="nfe-sale-file" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!saleId || submitting} className={primaryBtn} data-testid="nfe-sale-btn">
          <FiUploadCloud size={16} />
          {submitting ? t('nfe.sale.sending', 'Enviando…') : t('nfe.sale.attach', 'Anexar XML')}
        </button>
      </div>
      {sales !== null && sales.length === 0 && (
        <p className="text-xs text-neutral-500">{t('nfe.sale.empty', 'Nenhuma venda finalizada nesta unidade.')}</p>
      )}

      {error && <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">{error}</div>}

      {report && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-sm" data-testid="nfe-report">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${report.totalMatches ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}>
              {report.totalMatches ? t('nfe.report.ok', 'Totais conferem') : t('nfe.report.divergent', 'Divergência')}
            </span>
            <span className="font-mono text-xs text-neutral-400">{report.chaveAcesso}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            <dt className="text-neutral-400">{t('nfe.report.nfeTotal', 'Total da NF-e')}</dt>
            <dd className="text-neutral-100">{formatCents(report.nfeTotalCents)}</dd>
            <dt className="text-neutral-400">{t('nfe.report.saleTotal', 'Total lançado')}</dt>
            <dd className="text-neutral-100">{formatCents(report.saleTotalCents)}</dd>
            <dt className="text-neutral-400">{t('nfe.report.difference', 'Diferença')}</dt>
            <dd className="text-neutral-100">{formatCents(report.differenceCents)}</dd>
            <dt className="text-neutral-400">{t('nfe.report.items', 'Itens na nota')}</dt>
            <dd className="text-neutral-100">{report.nfeItemCount}</dd>
            <dt className="text-neutral-400">{t('nfe.report.sourceDocument', 'Documento de origem')}</dt>
            <dd className="md:col-span-3"><code className="select-all font-mono text-xs text-neutral-300">{report.sourceDocumentId}</code></dd>
          </dl>
          {report.divergences.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-amber-200">
              {report.divergences.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function NfePanel(props: NfePanelProps) {
  const { t } = useTranslation('accounting');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-neutral-200">{t('nfe.heading', 'NF-e')}</h2>
      <NfePurchaseSection {...props} />
      <NfeSaleSection {...props} />
    </div>
  );
}
