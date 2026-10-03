import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiPlusCircle, FiTrash2 } from 'react-icons/fi';
import {
  FIXED_ASSET_STATUSES,
  fixedAssetsService,
  type FixedAsset,
  type FixedAssetClass,
  type FixedAssetStatus,
  type ReconcileFixedAssetsResult,
  type RunDepreciationResult,
} from '../../../lib/services/fixedAssets.service';
import type { Account } from '../../../lib/services/accounting.service';
import { Modal } from '../../../components/ui/Modal';
import { StandardPagination } from '../../dashboard/shared/components/StandardPagination';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatCents } from '../lib/formatCents';
import { formatDate, scopeToday } from '../lib/formatDate';
import { inputClass } from './SpedGenerationPanel';
import { FixedAssetFormModal } from './FixedAssetFormModal';
import { ActivateAssetModal, DisposeAssetModal } from './FixedAssetCommandModals';

const ASSETS_PER_PAGE = 25;

/** Mês anterior ao de `today` (AAAA-MM-DD, fuso do escopo) como AAAA-MM — default do "Rodar depreciação". */
export function previousYearMonth(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

const STATUS_BADGE: Record<FixedAssetStatus, string> = {
  PENDING_ACTIVATION: 'bg-amber-600/15 text-amber-300',
  ACTIVE: 'bg-emerald-600/15 text-emerald-300',
  FULLY_DEPRECIATED: 'bg-sky-600/15 text-sky-300',
  DISPOSED: 'bg-neutral-700/60 text-neutral-300',
};

/** Item 10 — `FixedAssetService.updateAsset` só aceita `PENDING_ACTIVATION`. */
export const canEditAsset = (a: FixedAsset) => a.status === 'PENDING_ACTIVATION';
/** Item 11 — `deleteAsset`: `PENDING_ACTIVATION`, ou `ACTIVE` sem quota postada. O BE é a autoridade. */
export const canDeleteAsset = (a: FixedAsset) =>
  a.status === 'PENDING_ACTIVATION' || (a.status === 'ACTIVE' && a.accumulatedDepreciationCents === 0);

export interface FixedAssetsSectionProps {
  unitId: string;
  classes: FixedAssetClass[];
  /** Contas folha (`acceptsEntries`) — contrapartida da baixa. */
  accounts: Account[];
  /** O razão mudou (depreciação, reconciliação, ativação, baixa) — como o `EntryApprovalsPanel`. */
  onLedgerChange?: () => void;
  onNavigateToPeriods?: () => void;
  onNavigateToContas: () => void;
}

/**
 * Seção "Bens" (FE-INCR-FIXED-ASSETS itens 6–19): lista em `<table>` + `Modal` (Fork F-FE-2 → a / F-FAFE-7 → a — o
 * `GenericTable` é do DynamicTable, não de linha Prisma), filtros `status`/`classId` no servidor e paginação no
 * cliente (o BE devolve o array inteiro). Depreciação = UM mês por chamada (F-FAFE-5 → a). Regra de negócio
 * fica no BE; a mensagem dele aparece por `resolveError`.
 */
export function FixedAssetsSection({ unitId, classes, accounts, onLedgerChange, onNavigateToPeriods, onNavigateToContas }: FixedAssetsSectionProps) {
  const { t, tRef } = useAccountingT();

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [statusFilter, setStatusFilter] = useState<FixedAssetStatus | ''>('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [formModal, setFormModal] = useState<{ open: boolean; editing: FixedAsset | null }>({ open: false, editing: null });
  const [toActivate, setToActivate] = useState<FixedAsset | null>(null);
  const [toDispose, setToDispose] = useState<FixedAsset | null>(null);
  const [toDelete, setToDelete] = useState<FixedAsset | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [runMonth, setRunMonth] = useState(() => previousYearMonth(scopeToday()));
  const [runBusy, setRunBusy] = useState(false);
  const [runResult, setRunResult] = useState<RunDepreciationResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconcileFixedAssetsResult | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      setAssets(await fixedAssetsService.listAssets({ unitId, status: statusFilter || undefined, classId: classFilter || undefined }));
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('fixedAssets.error.load', 'Erro ao carregar os bens.')));
    } finally {
      setLoading(false);
    }
  }, [unitId, statusFilter, classFilter, tRef]);

  useEffect(() => { void fetchAssets(); }, [fetchAssets]);
  useEffect(() => { setPage(1); }, [statusFilter, classFilter]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const totalPages = Math.max(1, Math.ceil(assets.length / ASSETS_PER_PAGE));
  const currentPage = Math.min(page, totalPages); // remover o último da última página não deixa a tabela vazia
  const pageRows = assets.slice((currentPage - 1) * ASSETS_PER_PAGE, currentPage * ASSETS_PER_PAGE);

  /** Ativar/baixar/depreciar/reconciliar mexem no razão: recarrega a lista e avisa a tela de cima. */
  function afterLedgerChange() {
    void fetchAssets();
    onLedgerChange?.();
  }

  /** 409 de CAS: nunca reenvia sozinho — recarrega e pede a conferência do operador (item 14). */
  function onConflict() {
    setToActivate(null);
    setToDispose(null);
    setNotice(t('fixedAssets.conflict', 'O bem mudou — lista recarregada. Confira e tente de novo.'));
    void fetchAssets();
  }

  async function runDepreciation() {
    setRunBusy(true);
    setRunError(null);
    setRunResult(null);
    try {
      setRunResult(await fixedAssetsService.runDepreciation({ unitId, yearMonth: runMonth }));
      afterLedgerChange();
    } catch (err: unknown) {
      setRunError(resolveError(err, tRef.current('fixedAssets.run.error', 'Não foi possível rodar a depreciação.')));
    } finally {
      setRunBusy(false);
    }
  }

  async function reconcile() {
    setReconcileBusy(true);
    setRunError(null);
    setReconcileResult(null);
    try {
      setReconcileResult(await fixedAssetsService.reconcile(unitId));
      afterLedgerChange();
    } catch (err: unknown) {
      setRunError(resolveError(err, tRef.current('fixedAssets.reconcile.error', 'Não foi possível reconciliar.')));
    } finally {
      setReconcileBusy(false);
    }
  }

  async function runDelete() {
    if (!toDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await fixedAssetsService.deleteAsset(toDelete.id, unitId);
      setToDelete(null);
      void fetchAssets();
    } catch (err: unknown) {
      setDeleteError(resolveError(err, tRef.current('fixedAssets.delete.error', 'Não foi possível remover o bem.')));
    } finally {
      setDeleteBusy(false);
    }
  }

  const selectClass = `${inputClass} py-1.5 text-xs`;
  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
  // O 400 de "conta de depreciação não configurada" aponta para a seção Contas (item 17).
  const needsAccountsLink = !!runError && runError.includes('depreciationExpenseAccountId');

  return (
    <div>
      {/* ── Depreciação mensal e reconciliação (itens 16–19) ───────────────── */}
      <div className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            {t('fixedAssets.run.month', 'Mês de competência')}
            <input type="month" value={runMonth} onChange={(e) => setRunMonth(e.target.value)} className={`${inputClass} py-1.5`} />
          </label>
          <button
            type="button"
            onClick={() => void runDepreciation()}
            disabled={runBusy || !runMonth}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {runBusy ? t('fixedAssets.run.running', 'Rodando…') : t('fixedAssets.run.button', 'Rodar depreciação')}
          </button>
          <button type="button" onClick={() => void reconcile()} disabled={reconcileBusy} className={smallBtn}>
            {reconcileBusy ? t('fixedAssets.reconcile.running', 'Reconciliando…') : t('fixedAssets.reconcile.button', 'Reconciliar')}
          </button>
        </div>

        {runError && (
          <div role="alert" className="mt-3 space-y-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            <p>{runError}</p>
            {needsAccountsLink && (
              <button type="button" onClick={onNavigateToContas} className="underline">
                {t('fixedAssets.run.goToAccounts', 'Configurar as contas do imobilizado')}
              </button>
            )}
          </div>
        )}

        {runResult && (
          // data-* espelham os números: o harness de teste não tem instância i18next, então `{{vars}}` ficam crus.
          <div className="mt-3 space-y-2 text-xs text-neutral-300" data-testid="fa-run-result" data-posted={runResult.posted} data-skipped={runResult.skipped} data-failed={runResult.failed.length}>
            <p>
              {t('fixedAssets.run.result', 'Depreciação de {{month}}: {{posted}} lançada(s), {{skipped}} ignorada(s), {{failed}} com falha.', {
                month: runResult.yearMonth, posted: runResult.posted, skipped: runResult.skipped, failed: runResult.failed.length,
              })}
            </p>
            {runResult.failed.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-left text-neutral-400">
                      <th className={th}>{t('fixedAssets.col.asset', 'Bem')}</th>
                      <th className={th}>{t('fixedAssets.run.failure', 'Falha')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.failed.map((f) => (
                      <tr key={f.assetId} className="border-b border-neutral-800/60 last:border-0">
                        <td className={`${td} font-mono`}>{assets.find((a) => a.id === f.assetId)?.code ?? f.assetId}</td>
                        <td className={td}>
                          {f.message}
                          {f.code === 'PERIOD_NOT_OPEN' && onNavigateToPeriods && (
                            <button type="button" onClick={onNavigateToPeriods} className="ml-2 underline">
                              {t('fixedAssets.run.goToPeriods', 'Abrir períodos')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {reconcileResult && (
          <p className="mt-3 text-xs text-neutral-300" data-testid="fa-reconcile-result" data-checked={reconcileResult.checked} data-repaired={reconcileResult.repaired} data-drafts={reconcileResult.draftsCreated}>
            {t('fixedAssets.reconcile.result', 'Reconciliação: {{checked}} verificado(s), {{repaired}} reparado(s), {{drafts}} rascunho(s) recriado(s) de NF-e.', {
              checked: reconcileResult.checked, repaired: reconcileResult.repaired, drafts: reconcileResult.draftsCreated,
            })}
          </p>
        )}
      </div>

      {/* ── Lista (itens 6–7) ──────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={t('fixedAssets.filter.status', 'Status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FixedAssetStatus | '')} className={selectClass}>
            <option value="">{t('fixedAssets.filter.allStatus', 'Todos os status')}</option>
            {FIXED_ASSET_STATUSES.map((s) => <option key={s} value={s}>{t(`fixedAssets.status.${s}`, s)}</option>)}
          </select>
          <select aria-label={t('fixedAssets.filter.class', 'Classe')} value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectClass}>
            <option value="">{t('fixedAssets.filter.allClasses', 'Todas as classes')}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ open: true, editing: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <FiPlusCircle size={14} />
          {t('fixedAssets.asset.new', 'Novo bem')}
        </button>
      </div>

      {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {notice && (
        <div role="status" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs underline">{t('fixedAssets.dismiss', 'Fechar')}</button>
        </div>
      )}

      {loading && <div className="py-8 text-center text-sm text-neutral-400">{t('fixedAssets.loading', 'Carregando…')}</div>}
      {!loading && assets.length === 0 && !error && (
        <div className="py-8 text-center text-sm text-neutral-500">{t('fixedAssets.asset.empty', 'Nenhum bem cadastrado.')}</div>
      )}
      {!loading && assets.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('fixedAssets.col.code', 'Código')}</th>
                <th className={th}>{t('fixedAssets.col.description', 'Descrição')}</th>
                <th className={th}>{t('fixedAssets.col.class', 'Classe')}</th>
                <th className={`${th} text-right`}>{t('fixedAssets.col.cost', 'Custo')}</th>
                <th className={`${th} text-right`}>{t('fixedAssets.col.accumulated', 'Deprec. acumulada')}</th>
                <th className={`${th} text-right`}>{t('fixedAssets.col.net', 'Valor líquido')}</th>
                <th className={th}>{t('fixedAssets.col.status', 'Status')}</th>
                <th className={th}>{t('fixedAssets.col.acquired', 'Aquisição')}</th>
                <th className={th}>{t('fixedAssets.col.activated', 'Ativação')}</th>
                <th className={th}>{t('fixedAssets.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => {
                const klass = classById.get(a.classId);
                const fromNfe = a.payableId !== null || a.sourceDocumentId !== null;
                return (
                  <tr key={a.id} className="border-b border-neutral-800/60 last:border-0">
                    <td className={`${td} font-mono text-xs text-neutral-100`}>{a.code}</td>
                    <td className={`${td} text-neutral-200`}>
                      {a.description}
                      {fromNfe && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-neutral-700/60 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
                          {t('fixedAssets.fromNfe', 'da NF-e')}
                        </span>
                      )}
                    </td>
                    <td className={`${td} text-xs text-neutral-400`}>{klass ? klass.name : <span className="text-neutral-600">—</span>}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{formatCents(a.costCents)}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{formatCents(a.accumulatedDepreciationCents)}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{formatCents(a.costCents - a.openingAccumulatedCents - a.accumulatedDepreciationCents)}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[a.status]}`}>{t(`fixedAssets.status.${a.status}`, a.status)}</span>
                    </td>
                    <td className={td}>{formatDate(a.acquiredAt)}</td>
                    <td className={td}>{a.activatedAt ? formatDate(a.activatedAt) : <span className="text-neutral-600">—</span>}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        {a.status === 'PENDING_ACTIVATION' && (
                          <button type="button" onClick={() => setToActivate(a)} className={`${smallBtn} border-emerald-800 text-emerald-300`}>{t('fixedAssets.action.activate', 'Ativar')}</button>
                        )}
                        {a.status === 'ACTIVE' && (
                          <button type="button" onClick={() => setToDispose(a)} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}>{t('fixedAssets.action.dispose', 'Baixar')}</button>
                        )}
                        {canEditAsset(a) && (
                          <button type="button" onClick={() => setFormModal({ open: true, editing: a })} className={smallBtn}>
                            <FiEdit2 size={11} /> {t('fixedAssets.action.edit', 'Editar')}
                          </button>
                        )}
                        {canDeleteAsset(a) && (
                          <button type="button" onClick={() => { setDeleteError(null); setToDelete(a); }} className={`${smallBtn} hover:border-red-700 hover:text-red-300`}>
                            <FiTrash2 size={11} /> {t('fixedAssets.action.delete', 'Remover')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <StandardPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={assets.length}
            itemsPerPage={ASSETS_PER_PAGE}
            onPageChange={setPage}
            scrollToTop={false}
          />
        </div>
      )}

      <FixedAssetFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null })}
        unitId={unitId}
        classes={classes}
        editing={formModal.editing}
        onSuccess={() => void fetchAssets()}
      />
      <ActivateAssetModal
        asset={toActivate}
        unitId={unitId}
        onClose={() => setToActivate(null)}
        onDone={() => { setToActivate(null); afterLedgerChange(); }}
        onConflict={onConflict}
      />
      <DisposeAssetModal
        asset={toDispose}
        unitId={unitId}
        accounts={accounts}
        onClose={() => setToDispose(null)}
        onDone={() => { setToDispose(null); afterLedgerChange(); }}
        onConflict={onConflict}
      />

      {/* Remoção — confirmação; o BE é a autoridade (item 11) */}
      <Modal
        isOpen={!!toDelete}
        onClose={() => { if (!deleteBusy) setToDelete(null); }}
        title={t('fixedAssets.delete.title', 'Remover bem')}
        themeColor="bg-red-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!deleteBusy) setToDelete(null); }} disabled={deleteBusy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
              {t('fixedAssets.cancel', 'Cancelar')}
            </button>
            <button onClick={() => void runDelete()} disabled={deleteBusy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
              {deleteBusy ? t('fixedAssets.delete.removing', 'Removendo…') : t('fixedAssets.delete.confirm', 'Confirmar remoção')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toDelete && <p><span className="font-mono font-semibold text-neutral-100">{toDelete.code}</span> — {toDelete.description}</p>}
          <p className="text-neutral-400">{t('fixedAssets.delete.note', 'O bem sai da lista; o histórico não é apagado.')}</p>
          {deleteError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{deleteError}</div>}
        </div>
      </Modal>
    </div>
  );
}
