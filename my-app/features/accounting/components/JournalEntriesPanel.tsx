import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiChevronDown, FiChevronRight, FiFileText, FiRotateCcw, FiShield, FiLink } from 'react-icons/fi';
import {
  accountingService,
  type JournalEntryWithFullPostings,
  type VerifyAuditChainResult,
  type VerifyFailureReason,
  type JournalEntrySourceLink,
} from '../../../lib/services/accounting.service';
import { Modal } from '../../../components/ui/Modal';
import { formatCents } from '../lib/formatCents';
import { formatDate, scopeToday } from '../lib/formatDate';
import { useAccountingT } from '../lib/useAccountingT';
import { resolveError } from '../lib/resolveError';

// ── sub-components ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  entry: JournalEntryWithFullPostings;
}

function StatusBadge({ entry }: StatusBadgeProps) {
  const { t } = useTranslation('accounting');

  if (entry.reversedById) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-700/60 px-2 py-0.5 text-xs font-medium text-neutral-300">
        {t('journalEntries.status.Reversed', 'Estornado')}
      </span>
    );
  }
  if (entry.status === 'Reversed') {
    // Catch Reversed status without reversedById set (defensive)
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-700/60 px-2 py-0.5 text-xs font-medium text-neutral-300">
        {t('journalEntries.status.Reversed', 'Estornado')}
      </span>
    );
  }
  // Detect whether this entry is itself a reversal: sourceType === 'Reversal'
  if (entry.sourceType === 'Reversal') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-300">
        {t('journalEntries.reversalBadge', 'Estorno')}
      </span>
    );
  }

  const STATUS_LABEL: Record<string, string> = {
    Draft: 'Rascunho',
    Posted: 'Postado',
    Reconciled: 'Conciliado',
    Reversed: 'Estornado',
  };

  const STATUS_CLASS: Record<string, string> = {
    Draft: 'bg-neutral-700/50 text-neutral-400',
    Posted: 'bg-emerald-900/40 text-emerald-300',
    Reconciled: 'bg-blue-900/40 text-blue-300',
    Reversed: 'bg-neutral-700/60 text-neutral-300',
  };

  const statusLabel = STATUS_LABEL[entry.status]
    ? t('journalEntries.status.' + entry.status, STATUS_LABEL[entry.status])
    : entry.status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[entry.status] ?? 'bg-neutral-700/50 text-neutral-400'}`}
    >
      {statusLabel}
    </span>
  );
}

/** Closed-enum fallback copy for `VerifyFailureReason` — mirrors the pt strings in
 *  `accounting.json` so a missing i18n bundle still reads sensibly. Never the raw enum string
 *  (checklist behavior 7 — "nunca a string crua do enum"). */
const VERIFY_REASON_FALLBACK: Record<VerifyFailureReason, string> = {
  MISSING_GENESIS: 'Evento inicial (gênese) ausente ou fora de posição.',
  SEQ_GAP: 'Lacuna detectada na sequência de eventos.',
  PREV_HASH_MISMATCH: 'O hash do evento anterior não confere — elo da cadeia rompido.',
  HASH_MISMATCH: 'O hash recalculado do evento não confere com o hash registrado.',
  HEAD_MISMATCH: 'O ponteiro de cabeça da cadeia não confere com o último evento.',
};

/** Truncate a long id for display-only purposes (F-FEAP-6a: informative text, no download). */
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

// ── PostingsDrawer ────────────────────────────────────────────────────────────

interface PostingsDrawerProps {
  entry: JournalEntryWithFullPostings;
}

function PostingsDrawer({ entry }: PostingsDrawerProps) {
  const { t } = useTranslation('accounting');
  return (
    <tr>
      <td colSpan={8} className="bg-neutral-950/60 px-6 pb-3 pt-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-1 pr-4 font-medium">{t('journalEntries.postings.account', 'Conta')}</th>
              <th className="py-1 pr-4 text-right font-medium">{t('journalEntries.postings.debit', 'Débito')}</th>
              <th className="py-1 text-right font-medium">{t('journalEntries.postings.credit', 'Crédito')}</th>
            </tr>
          </thead>
          <tbody>
            {entry.postings.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800/50">
                <td className="py-1 pr-4 text-neutral-300">
                  <span className="font-mono text-neutral-500">{p.account.code}</span>
                  {' — '}
                  {p.account.name}
                </td>
                <td className="py-1 pr-4 text-right tabular-nums text-neutral-300">
                  {p.debitCents ? formatCents(p.debitCents) : '—'}
                </td>
                <td className="py-1 text-right tabular-nums text-neutral-300">
                  {p.creditCents ? formatCents(p.creditCents) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ── JournalEntryRow ───────────────────────────────────────────────────────────

interface JournalEntryRowProps {
  entry: JournalEntryWithFullPostings;
  onReverseClick: (id: string) => void;
  onReceiptClick: (id: string) => void;
  onProvenanceClick: (id: string) => void;
  /** id of the entry whose receipt is currently downloading, or null. */
  receiptBusyId: string | null;
  /** id of the entry whose source documents are currently loading, or null. */
  provenanceBusyId: string | null;
}

function JournalEntryRow({
  entry,
  onReverseClick,
  onReceiptClick,
  onProvenanceClick,
  receiptBusyId,
  provenanceBusyId,
}: JournalEntryRowProps) {
  const { t } = useTranslation('accounting');
  const [expanded, setExpanded] = useState(false);

  const totalDebitCents = entry.postings.reduce((s, p) => s + p.debitCents, 0);
  const totalCreditCents = entry.postings.reduce((s, p) => s + p.creditCents, 0);
  const canReverse = !entry.reversedById && entry.status !== 'Reversed';
  const isDownloadingReceipt = receiptBusyId === entry.id;
  const isLoadingProvenance = provenanceBusyId === entry.id;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-neutral-800/60 transition-colors hover:bg-neutral-800/30 last:border-0"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* expand icon */}
        <td className="w-8 px-3 py-2.5 text-neutral-500">
          {expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
          {entry.fiscalYear && entry.entryNumber != null
            ? `${entry.fiscalYear}/${String(entry.entryNumber).padStart(4, '0')}`
            : '—'}
        </td>
        <td className="px-4 py-2.5 tabular-nums text-neutral-300">{formatDate(entry.date)}</td>
        <td className="max-w-xs px-4 py-2.5 text-neutral-100">
          <span className="line-clamp-1">{entry.description}</span>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
          {totalDebitCents ? formatCents(totalDebitCents) : '—'}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
          {totalCreditCents ? formatCents(totalCreditCents) : '—'}
        </td>
        <td className="px-4 py-2.5">
          <StatusBadge entry={entry} />
        </td>
        <td
          className="px-4 py-2.5"
          onClick={(e) => e.stopPropagation()} // don't toggle expand when clicking action
        >
          <div className="flex items-center gap-2">
            <button
              disabled={isDownloadingReceipt}
              onClick={() => onReceiptClick(entry.id)}
              title={t('journalEntries.receiptAction.title', 'Baixar recibo em PDF deste lançamento')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-blue-700 hover:bg-blue-900/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-700 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-300"
            >
              {isDownloadingReceipt ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-500/40 border-t-neutral-300" />
              ) : (
                <FiFileText size={12} />
              )}
              {isDownloadingReceipt
                ? t('journalEntries.receiptAction.downloading', 'Baixando…')
                : t('journalEntries.receiptAction.label', 'Recibo (PDF)')}
            </button>
            <button
              disabled={!canReverse}
              onClick={() => onReverseClick(entry.id)}
              title={canReverse
                ? t('journalEntries.reverseAction.enabledTitle', 'Estornar este lançamento')
                : t('journalEntries.reverseAction.disabledTitle', 'Lançamento já estornado')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-red-700 hover:bg-red-900/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-700 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-300"
            >
              <FiRotateCcw size={12} />
              {t('journalEntries.reverseAction.label', 'Estornar')}
            </button>
            <button
              disabled={isLoadingProvenance}
              onClick={() => onProvenanceClick(entry.id)}
              title={t('journalEntries.sourceDocuments.title', 'Documentos de origem')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-blue-700 hover:bg-blue-900/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-700 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-300"
            >
              {isLoadingProvenance ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-500/40 border-t-neutral-300" />
              ) : (
                <FiLink size={12} />
              )}
              {t('journalEntries.sourceDocuments.button', 'Proveniência')}
            </button>
          </div>
        </td>
      </tr>
      {expanded && <PostingsDrawer entry={entry} />}
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface JournalEntriesPanelProps {
  unitId: string;
  onReversalComplete?: () => void;
  /** Navigate to the Períodos tab (used in PERIOD_NOT_OPEN error message). */
  onNavigateToPeriods?: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * JournalEntriesPanel — paginated list of double-entry journal entries for a
 * given business unit. Each row is expandable to show its individual postings.
 * Supports reversal (estorno) with a confirmation modal.
 */
export function JournalEntriesPanel({ unitId, onReversalComplete, onNavigateToPeriods }: JournalEntriesPanelProps) {
  // `t` para renderizar, `tRef.current` dentro do fetch — ver `../lib/useAccountingT`.
  const { t, tRef } = useAccountingT();
  const [entries, setEntries] = useState<JournalEntryWithFullPostings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState(false);
  const [confirmReverseId, setConfirmReverseId] = useState<string | null>(null);
  const [reversalDate, setReversalDate] = useState(scopeToday);
  const [isReversing, setIsReversing] = useState(false);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  // ── audit chain verification (FE-INCR-AUDIT-PROVENANCE, F-FEAP-1a) ─────────
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyAuditChainResult | null>(null);
  // ── source-document provenance, per row (F-FEAP-2a) ────────────────────────
  const [provenanceBusyId, setProvenanceBusyId] = useState<string | null>(null);
  const [provenanceDocs, setProvenanceDocs] = useState<JournalEntrySourceLink[] | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await accountingService.listEntries({ unitId });
      setEntries(result.entries);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tRef.current('journalEntries.error.load', 'Erro ao carregar lançamentos.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [unitId, tRef]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  // ── reverse ────────────────────────────────────────────────────────────────
  const confirmEntry = confirmReverseId
    ? entries.find((e) => e.id === confirmReverseId)
    : null;

  const handleConfirmReverse = async () => {
    if (!confirmReverseId || !confirmEntry) return;
    setIsReversing(true);
    setError(null);
    setPeriodError(false);
    try {
      await accountingService.reverseEntry({ unitId, lancamentoId: confirmReverseId, reversalPostingDate: reversalDate });
      setConfirmReverseId(null);
      await fetchEntries();
      onReversalComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('journalEntries.error.reverse', 'Erro ao estornar lançamento.');
      // Detect ACCOUNTING_PERIOD_NOT_OPEN to show inline guidance
      if (msg.includes('ACCOUNTING_PERIOD_NOT_OPEN') || msg.includes('período') && msg.includes('fechado')) {
        setPeriodError(true);
      }
      setError(msg);
    } finally {
      setIsReversing(false);
    }
  };

  // ── receipt (H2 passo 4) ──────────────────────────────────────────────────────
  const handleDownloadReceipt = async (entryId: string) => {
    setReceiptBusyId(entryId);
    setError(null);
    try {
      await accountingService.downloadReceipt(entryId, unitId);
    } catch (err: unknown) {
      // `downloadReceipt` throws the same plain-object shape as apiClient (reconParseError) —
      // `resolveError` is the canonical extractor (features/accounting/lib/resolveError.ts);
      // `err instanceof Error` (used elsewhere in this older file) would never match it.
      setError(resolveError(err, t('journalEntries.error.receipt', 'Erro ao baixar recibo.')));
    } finally {
      setReceiptBusyId(null);
    }
  };

  // ── verify audit chain (F-FEAP-1a) ────────────────────────────────────────
  // On-demand only — `verifyAuditChain` scans the WHOLE scope trail (O(n)),
  // never called automatically on mount/tab-switch (checklist behavior 4).
  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    setError(null);
    try {
      const result = await accountingService.verifyAuditChain(unitId);
      setVerifyResult(result);
    } catch (err: unknown) {
      // Error banner only — the result modal never opens on failure (behavior 8).
      setError(resolveError(err, t('journalEntries.error.verifyChain', 'Erro ao verificar a cadeia de auditoria.')));
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // ── source-document provenance, per row (F-FEAP-2a) ───────────────────────
  const handleShowProvenance = async (entryId: string) => {
    setProvenanceBusyId(entryId);
    setError(null);
    try {
      const docs = await accountingService.listSourceDocuments(unitId, entryId);
      setProvenanceDocs(docs);
    } catch (err: unknown) {
      // Error banner only — the modal never opens on failure (behavior 14, same as B.8).
      setError(resolveError(err, t('journalEntries.error.sourceDocuments', 'Erro ao carregar documentos de origem.')));
    } finally {
      setProvenanceBusyId(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Verify audit chain — header, above the entries table (F-FEAP-1a) */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={isVerifyingChain}
          onClick={() => void handleVerifyChain()}
          title={t('journalEntries.verifyChain.title', 'Verificação da cadeia de auditoria')}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-blue-700 hover:bg-blue-900/30 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isVerifyingChain ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-500/40 border-t-neutral-300" />
          ) : (
            <FiShield size={14} />
          )}
          {isVerifyingChain
            ? t('journalEntries.verifyChain.loading', 'Verificando…')
            : t('journalEntries.verifyChain.button', 'Verificar cadeia de auditoria')}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-neutral-400">{t('journalEntries.loading', 'Carregando lançamentos…')}</div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && !error && (
        <div className="py-16 text-center text-neutral-500">
          {t('journalEntries.empty', 'Nenhum lançamento postado nesta unidade ainda.')}
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="w-8 px-3 py-3" aria-label={t('journalEntries.col.expand', 'Expandir')} />
                <th className="px-4 py-3 font-medium">{t('journalEntries.col.number', 'Nº')}</th>
                <th className="px-4 py-3 font-medium">{t('journalEntries.col.date', 'Data')}</th>
                <th className="px-4 py-3 font-medium">{t('journalEntries.col.description', 'Descrição')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('journalEntries.col.debits', 'Débitos')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('journalEntries.col.credits', 'Créditos')}</th>
                <th className="px-4 py-3 font-medium">{t('journalEntries.col.status', 'Status')}</th>
                <th className="px-4 py-3 font-medium">{t('journalEntries.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <JournalEntryRow
                  key={entry.id}
                  entry={entry}
                  onReverseClick={(id) => setConfirmReverseId(id)}
                  onReceiptClick={(id) => void handleDownloadReceipt(id)}
                  onProvenanceClick={(id) => void handleShowProvenance(id)}
                  receiptBusyId={receiptBusyId}
                  provenanceBusyId={provenanceBusyId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        isOpen={!!confirmReverseId}
        onClose={() => {
          if (!isReversing) { setConfirmReverseId(null); setPeriodError(false); setError(null); }
        }}
        title={t('journalEntries.confirmModal.title', 'Confirmar estorno')}
        themeColor="bg-red-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={() => { setConfirmReverseId(null); setPeriodError(false); setError(null); }}
              disabled={isReversing}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {t('journalEntries.confirmModal.cancel', 'Cancelar')}
            </button>
            <button
              onClick={() => void handleConfirmReverse()}
              disabled={isReversing}
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {isReversing ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t('journalEntries.confirmModal.reversing', 'Estornando…')}
                </>
              ) : (
                <>
                  <FiRotateCcw size={14} />
                  {t('journalEntries.confirmModal.confirm', 'Confirmar estorno')}
                </>
              )}
            </button>
          </>
        }
      >
        <div className="px-6 py-5 text-sm text-neutral-300 space-y-4">
          {confirmEntry && (
            <p>
              {t('journalEntries.confirmModal.reverseEntryOf', 'Estornar lançamento de')}{' '}
              <span className="font-semibold text-neutral-100">
                {formatDate(confirmEntry.date)}
              </span>{' '}
              —{' '}
              <span className="font-semibold text-neutral-100">
                {confirmEntry.description}
              </span>
              ?
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('journalEntries.confirmModal.reversalDateLabel', 'Data do estorno')}
            </label>
            <input
              type="date"
              value={reversalDate}
              onChange={(e) => setReversalDate(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-red-500 focus:outline-none"
            />
          </div>
          <p className="text-neutral-400">
            {t('journalEntries.confirmModal.warning', 'Um novo lançamento oposto será criado automaticamente na data acima. Esta ação não pode ser desfeita.')}
          </p>
          {periodError && onNavigateToPeriods && (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
              {t('journalEntries.confirmModal.periodClosed', 'O período para a data selecionada está fechado.')}{' '}
              <button
                type="button"
                onClick={() => { setConfirmReverseId(null); setPeriodError(false); setError(null); onNavigateToPeriods(); }}
                className="underline hover:text-amber-200"
              >
                {t('journalEntries.confirmModal.viewPeriods', 'Ver Períodos')}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Verify-chain result modal (F-FEAP-1a) — opens only on success (behavior 8). */}
      <Modal
        isOpen={!!verifyResult}
        onClose={() => setVerifyResult(null)}
        title={t('journalEntries.verifyChain.title', 'Verificação da cadeia de auditoria')}
        themeColor={verifyResult && !verifyResult.ok ? 'bg-red-600' : 'bg-emerald-600'}
        maxWidth="max-w-lg"
      >
        {verifyResult && (
          <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
            {verifyResult.ok && verifyResult.checkedEvents === 0 && (
              <p className="text-neutral-400">
                {t('journalEntries.verifyChain.empty', 'Nenhum evento de auditoria neste escopo ainda.')}
              </p>
            )}
            {verifyResult.ok && verifyResult.checkedEvents > 0 && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-medium text-emerald-400">
                  {t('journalEntries.verifyChain.ok', 'Cadeia íntegra')}
                </span>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <dt className="text-neutral-400">
                    {t('journalEntries.verifyChain.checkedEvents', 'Eventos verificados')}
                  </dt>
                  <dd className="text-neutral-100">{verifyResult.checkedEvents}</dd>
                  {(verifyResult.firstSeq !== null || verifyResult.lastSeq !== null) && (
                    <>
                      <dt className="text-neutral-400">
                        {t('journalEntries.verifyChain.range', 'Sequência verificada')}
                      </dt>
                      <dd className="text-neutral-100">
                        {verifyResult.firstSeq ?? '—'} – {verifyResult.lastSeq ?? '—'}
                      </dd>
                    </>
                  )}
                  {verifyResult.headHash !== null && (
                    <>
                      <dt className="text-neutral-400">
                        {t('journalEntries.verifyChain.headHash', 'Hash da cabeça')}
                      </dt>
                      <dd>
                        <code className="select-all font-mono text-xs text-neutral-300">
                          {verifyResult.headHash}
                        </code>
                      </dd>
                    </>
                  )}
                </dl>
              </>
            )}
            {!verifyResult.ok && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1 text-xs font-medium text-red-400">
                  {t('journalEntries.verifyChain.compromised', 'Cadeia comprometida')}
                </span>
                <p className="text-neutral-400">
                  {t(
                    'journalEntries.verifyChain.compromisedDescription',
                    'Evidência de adulteração detectada nesta trilha de auditoria. Este diagnóstico não corrige a cadeia — a origem precisa ser investigada manualmente.',
                  )}
                </p>
                {verifyResult.failure && (
                  <div className="space-y-1">
                    <p className="text-neutral-300">
                      {t('journalEntries.verifyChain.failureSeq', 'Sequência com falha')}:{' '}
                      <span className="font-mono">{verifyResult.failure.seq}</span>
                    </p>
                    <p className="text-neutral-300">
                      {t(
                        `journalEntries.verifyChain.reason.${verifyResult.failure.reason}`,
                        VERIFY_REASON_FALLBACK[verifyResult.failure.reason],
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Source-document provenance modal, per row (F-FEAP-2a) — opens only on success (behavior 14). */}
      <Modal
        isOpen={!!provenanceDocs}
        onClose={() => setProvenanceDocs(null)}
        title={t('journalEntries.sourceDocuments.title', 'Documentos de origem')}
        themeColor="bg-blue-600"
        maxWidth="max-w-lg"
      >
        {provenanceDocs && (
          <div className="space-y-3 px-6 py-5 text-sm text-neutral-300">
            {provenanceDocs.length === 0 && (
              <p className="text-neutral-400">
                {t(
                  'journalEntries.sourceDocuments.empty',
                  'Nenhum documento de origem registrado para este lançamento.',
                )}
              </p>
            )}
            {provenanceDocs.map((link) => (
              <div
                key={link.id}
                className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    {t('journalEntries.sourceDocuments.sourceType', 'Tipo de origem')}
                  </span>
                  <span className="font-mono text-xs text-neutral-300">
                    {link.sourceDocument.sourceType}
                  </span>
                </div>
                {link.sourceDocument.externalRef && (
                  <p className="text-neutral-300">
                    {t('journalEntries.sourceDocuments.externalRef', 'Referência')}:{' '}
                    {link.sourceDocument.externalRef}
                  </p>
                )}
                {link.sourceDocument.documentDate != null && (
                  <p className="text-neutral-300">
                    {t('journalEntries.sourceDocuments.documentDate', 'Data do documento')}:{' '}
                    {formatDate(link.sourceDocument.documentDate)}
                  </p>
                )}
                {link.sourceDocument.description && (
                  <p className="text-neutral-300">
                    {t('journalEntries.sourceDocuments.description', 'Descrição')}:{' '}
                    {link.sourceDocument.description}
                  </p>
                )}
                <p className="text-xs text-neutral-500">
                  {t('journalEntries.sourceDocuments.recordedAt', 'Registrado em')}:{' '}
                  {formatDate(link.sourceDocument.createdAt)}
                </p>
                {link.sourceDocument.attachmentId && (
                  <p className="text-xs text-neutral-500">
                    {t('journalEntries.sourceDocuments.attachment', 'Anexo')}:{' '}
                    <code className="select-all font-mono">
                      {truncateId(link.sourceDocument.attachmentId)}
                    </code>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
