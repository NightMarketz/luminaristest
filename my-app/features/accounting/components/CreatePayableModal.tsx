import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../components/ui/Modal';
import {
  accountsPayableService,
  type CreatePayablePayload,
} from '../../../lib/services/accountsPayable.service';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import type { Account } from '../../../lib/services/accounting.service';
import type { Counterparty } from '../../../lib/services/counterparties.service';
import { parseBrl } from '../lib/parseBrl';
import { formatCents } from '../lib/formatCents';
import { resolveErrorWithCode } from '../lib/resolveError';
import { scopeToday } from '../lib/formatDate';

export interface CreatePayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Analytic expense accounts (nature=Expense, acceptsEntries) — option value is the account **id**. */
  expenseAccounts: Account[];
  /** Active SUPPLIER counterparties of this unit — option value is the counterparty **id** (optional link). */
  counterparties?: Counterparty[];
  onSuccess: () => void;
  /** Navigate to the Períodos tab (shown when the period is closed). */
  onNavigateToPeriods?: () => void;
  /** Navigate to the Contrapartes tab (shown when none is registered). */
  onNavigateToCounterparties?: () => void;
}

/**
 * FE-INCR-PURCHASE-VALUATION (LAC-D): o payable tem DOIS braços (XOR do servidor) —
 * despesa (D conta de despesa) ou COMPRA DE ESTOQUE (D 1.1.6 + valoração via receiveStock).
 * O modo estoque troca a conta de despesa por (produto do catálogo DT + quantidade).
 */
type PayableMode = 'expense' | 'inventory';

interface ProductOption {
  id: string;
  name: string;
}

/** Carrega o catálogo `products` (DynamicTable) do tenant para o dropdown do braço de inventário. */
async function loadProductOptions(): Promise<ProductOption[]> {
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


export function CreatePayableModal({
  isOpen,
  onClose,
  unitId,
  expenseAccounts,
  counterparties = [],
  onSuccess,
  onNavigateToPeriods,
  onNavigateToCounterparties,
}: CreatePayableModalProps) {
  const { t } = useTranslation('accounting');
  const [supplierName, setSupplierName] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState<string>(scopeToday);
  const [dueDate, setDueDate] = useState<string>(scopeToday);
  const [amountBrl, setAmountBrl] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [mode, setMode] = useState<PayableMode>('expense');
  const [inventoryProductRef, setInventoryProductRef] = useState('');
  const [inventoryQtyStr, setInventoryQtyStr] = useState('');
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState(false);

  // Catálogo de produtos: carregado sob demanda na 1ª entrada no modo estoque.
  useEffect(() => {
    if (!isOpen || mode !== 'inventory' || products !== null) return;
    let alive = true;
    loadProductOptions()
      .then((opts) => { if (alive) setProducts(opts); })
      .catch(() => { if (alive) setProducts([]); });
    return () => { alive = false; };
  }, [isOpen, mode, products]);

  const analyticExpense = expenseAccounts.filter(
    (a) => a.nature === 'Expense' && a.acceptsEntries,
  );

  const amountCents = parseBrl(amountBrl);
  // Number() (não parseInt): "2.5" deve INVALIDAR, nunca truncar para 2 em silêncio.
  const inventoryQty = Number(inventoryQtyStr);
  const inventoryArmValid =
    inventoryProductRef !== '' && Number.isInteger(inventoryQty) && inventoryQty > 0;

  // XOR na UI (espelho do superRefine do servidor): o modo decide o braço; par meio-preenchido
  // é inalcançável porque o braço inativo é limpo no toggle e omitido do payload.
  const isValid =
    supplierName.trim() !== '' &&
    description.trim() !== '' &&
    !!issueDate &&
    !!dueDate &&
    amountCents > 0 &&
    (mode === 'expense' ? expenseAccountId !== '' : inventoryArmValid);

  const isDirty =
    supplierName !== '' ||
    counterpartyId !== '' ||
    documentNumber !== '' ||
    description !== '' ||
    amountBrl !== '' ||
    expenseAccountId !== '' ||
    inventoryProductRef !== '' ||
    inventoryQtyStr !== '';

  /** Selecting a counterparty prefills the supplier name snapshot when it is still blank. */
  function handleCounterpartyChange(id: string) {
    setCounterpartyId(id);
    const cp = counterparties.find((c) => c.id === id);
    if (cp && supplierName.trim() === '') setSupplierName(cp.name);
  }

  function reset() {
    setSupplierName('');
    setCounterpartyId('');
    setDocumentNumber('');
    setDescription('');
    setIssueDate(scopeToday());
    setDueDate(scopeToday());
    setAmountBrl('');
    setExpenseAccountId('');
    setMode('expense');
    setInventoryProductRef('');
    setInventoryQtyStr('');
    setError(null);
    setPeriodError(false);
  }

  /** Trocar de braço limpa o lado inativo — o XOR do servidor nunca vê par meio-preenchido. */
  function switchMode(next: PayableMode) {
    setMode(next);
    if (next === 'expense') {
      setInventoryProductRef('');
      setInventoryQtyStr('');
    } else {
      setExpenseAccountId('');
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    setPeriodError(false);
    if (!isValid) {
      setError(
        mode === 'inventory'
          ? t('contasAPagar.createModal.error.invalidInventory', 'Preencha fornecedor, descrição, datas, valor total, produto e quantidade.')
          : t('contasAPagar.createModal.error.invalid', 'Preencha fornecedor, descrição, datas, valor e conta de despesa.'),
      );
      return;
    }

    const payload: CreatePayablePayload = {
      unitId,
      supplierName: supplierName.trim(),
      description: description.trim(),
      issueDate,
      dueDate,
      amountCents,
      // XOR do servidor: exatamente UM braço entra no payload.
      ...(mode === 'expense'
        ? { expenseAccountId }
        : { inventoryProductRef, inventoryQty }),
      ...(counterpartyId ? { counterpartyId } : {}),
      ...(documentNumber.trim() ? { documentNumber: documentNumber.trim() } : {}),
    };

    setIsSubmitting(true);
    try {
      await accountsPayableService.createPayable(payload);
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const { message, code } = resolveErrorWithCode(err, t('contasAPagar.createModal.error.failed', 'Erro ao registrar a conta a pagar.'));
      if (code === 'ACCOUNTING_PERIOD_NOT_OPEN') setPeriodError(true);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('contasAPagar.createModal.title', 'Nova Conta a Pagar')}
      maxWidth="max-w-2xl"
      isDirty={isDirty}
      themeColor="bg-emerald-600"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-50"
          >
            {t('contasAPagar.createModal.cancel', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!isValid || isSubmitting}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? t('contasAPagar.createModal.saving', 'Registrando…')
              : t('contasAPagar.createModal.submit', 'Registrar')}
          </button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Counterparty (optional link) */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.counterparty', 'Contraparte')}
              <span className="ml-1 normal-case text-neutral-600">{t('contasAPagar.createModal.optional', '(opcional)')}</span>
            </label>
            <select
              value={counterpartyId}
              onChange={(e) => handleCounterpartyChange(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">{t('contasAPagar.createModal.field.noCounterparty', '— sem contraparte —')}</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {counterparties.length === 0 && (
              <p className="text-xs text-neutral-500">
                {t('contasAPagar.createModal.noCounterparties', 'Nenhum fornecedor cadastrado.')}
                {onNavigateToCounterparties && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => { reset(); onClose(); onNavigateToCounterparties(); }}
                      className="underline hover:text-neutral-300"
                    >
                      {t('contasAPagar.createModal.manageCounterparties', 'Cadastrar contrapartes')}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Supplier */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.supplier', 'Fornecedor')}
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={t('contasAPagar.createModal.field.supplierPlaceholder', 'Nome do fornecedor…')}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.description', 'Descrição')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('contasAPagar.createModal.field.descriptionPlaceholder', 'Ex.: aluguel, energia, insumos…')}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Document number */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.document', 'Nº do documento')}
              <span className="ml-1 normal-case text-neutral-600">{t('contasAPagar.createModal.optional', '(opcional)')}</span>
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder={t('contasAPagar.createModal.field.documentPlaceholder', 'NF, boleto…')}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.amount', 'Valor (R$)')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amountBrl}
              onChange={(e) => setAmountBrl(e.target.value)}
              placeholder="0,00"
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-right text-sm tabular-nums text-neutral-100 placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
            {amountCents > 0 && (
              <p className="text-right text-xs tabular-nums text-neutral-500">= {formatCents(amountCents)}</p>
            )}
          </div>

          {/* Issue date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.issueDate', 'Emissão')}
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.dueDate', 'Vencimento')}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Braço do payable (LAC-D): despesa × compra de estoque (XOR do servidor) */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('contasAPagar.createModal.field.kind', 'Tipo de lançamento')}
            </label>
            <div className="flex gap-2" role="radiogroup" aria-label={t('contasAPagar.createModal.field.kind', 'Tipo de lançamento')}>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'expense'}
                onClick={() => switchMode('expense')}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'expense' ? 'bg-emerald-600 text-white' : 'border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
              >
                {t('contasAPagar.createModal.mode.expense', 'Despesa')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'inventory'}
                onClick={() => switchMode('inventory')}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'inventory' ? 'bg-emerald-600 text-white' : 'border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
              >
                {t('contasAPagar.createModal.mode.inventory', 'Compra de estoque')}
              </button>
            </div>
            {mode === 'inventory' && (
              <p className="text-xs text-neutral-500">
                {t('contasAPagar.createModal.mode.inventoryHint', 'Debita 1.1.6 Estoques e valora o produto pelo custo médio — o valor acima é o TOTAL da compra.')}
              </p>
            )}
          </div>

          {mode === 'expense' ? (
            /* Expense account */
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {t('contasAPagar.createModal.field.expenseAccount', 'Conta de despesa (contrapartida)')}
              </label>
              <select
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">{t('contasAPagar.createModal.field.selectAccount', '— selecione a conta de despesa —')}</option>
                {analyticExpense.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              {analyticExpense.length === 0 && (
                <p className="text-xs text-amber-400">
                  {t('contasAPagar.createModal.noExpenseAccounts', 'Nenhuma conta de despesa analítica encontrada. Cadastre uma no Plano de Contas.')}
                </p>
              )}
            </div>
          ) : (
            /* Inventory arm: produto do catálogo + quantidade */
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  {t('contasAPagar.createModal.field.product', 'Produto')}
                </label>
                <select
                  value={inventoryProductRef}
                  onChange={(e) => setInventoryProductRef(e.target.value)}
                  className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">
                    {products === null
                      ? t('contasAPagar.createModal.field.loadingProducts', 'Carregando produtos…')
                      : t('contasAPagar.createModal.field.selectProduct', '— selecione o produto —')}
                  </option>
                  {(products ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {products !== null && products.length === 0 && (
                  <p className="text-xs text-amber-400">
                    {t('contasAPagar.createModal.noProducts', 'Nenhum produto no catálogo. Cadastre produtos no módulo de estoque.')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  {t('contasAPagar.createModal.field.qty', 'Quantidade')}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inventoryQtyStr}
                  onChange={(e) => setInventoryQtyStr(e.target.value)}
                  placeholder="0"
                  className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-right text-sm tabular-nums text-neutral-100 placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
            {periodError && onNavigateToPeriods && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => { reset(); onClose(); onNavigateToPeriods(); }}
                  className="underline hover:text-red-200"
                >
                  {t('contasAPagar.viewPeriods', 'Ver Períodos')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
