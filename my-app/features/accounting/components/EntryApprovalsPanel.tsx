import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiChevronDown, FiChevronRight, FiPlusCircle, FiEdit2, FiSend, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import {
  entryApprovalsService,
  type ApprovalEntry,
} from '../../../lib/services/entryApprovals.service';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import { dimensionsService, type DimensionCatalogEntry } from '../../../lib/services/dimensions.service';
import { Modal } from '../../../components/ui/Modal';
import { JournalEntryModal, type AccountOption, type JournalEntryDraftValue } from './JournalEntryModal';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';

// ── helpers ──────────────────────────────────────────────────────────────────

function totalDebit(entry: ApprovalEntry): number {
  return entry.postings.reduce((s, p) => s + p.debitCents, 0);
}

/**
 * The editable snapshot of a draft, rebuilt from its persisted legs — **tags included**.
 * `updateDraft` rewrites every leg and `posting_dimensions` cascades on delete, so whatever
 * is NOT carried here is destroyed on save.
 */
function toDraftValue(entry: ApprovalEntry): JournalEntryDraftValue {
  return {
    date: entry.date.slice(0, 10),
    description: entry.description,
    lines: entry.postings.map((p) => ({
      accountCode: p.account.code,
      debitCents: p.debitCents,
      creditCents: p.creditCents,
      ...(p.dimensions?.length ? { dimensions: p.dimensions } : {}),
    })),
  };
}

// ── legs drawer ──────────────────────────────────────────────────────────────

function PostingsDrawer({ entry }: { entry: ApprovalEntry }) {
  const { t } = useTranslation('accounting');
  return (
    <tr>
      <td colSpan={6} className="bg-neutral-950/60 px-6 pb-3 pt-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-1 pr-4 font-medium">{t('approvals.postings.account', 'Conta')}</th>
              <th className="py-1 pr-4 text-right font-medium">{t('approvals.postings.debit', 'Débito')}</th>
              <th className="py-1 text-right font-medium">{t('approvals.postings.credit', 'Crédito')}</th>
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

// ── row ──────────────────────────────────────────────────────────────────────

const BTN =
  'inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium transition-colors';

interface EntryRowProps {
  entry: ApprovalEntry;
  actions: React.ReactNode;
}

function EntryRow({ entry, actions }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-b border-neutral-800/60 transition-colors last:border-0 hover:bg-neutral-800/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="w-8 px-3 py-2.5 text-neutral-500">
          {expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </td>
        <td className="px-4 py-2.5 tabular-nums text-neutral-300">{formatDate(entry.date)}</td>
        <td className="max-w-xs px-4 py-2.5 text-neutral-100">
          <span className="line-clamp-1">{entry.description}</span>
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-100">{formatCents(totalDebit(entry))}</td>
        <td className="px-4 py-2.5 text-xs text-neutral-500">
          {entry.postings.length}
        </td>
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">{actions}</div>
        </td>
      </tr>
      {expanded && <PostingsDrawer entry={entry} />}
    </>
  );
}

// ── section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  heading: string;
  note: string;
  emptyLabel: string;
  entries: ApprovalEntry[];
  renderActions: (entry: ApprovalEntry) => React.ReactNode;
}

function EntrySection({ heading, note, emptyLabel, entries, renderActions }: SectionProps) {
  const { t } = useTranslation('accounting');
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">{heading}</h3>
        <p className="text-xs text-neutral-500">{note}</p>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 py-10 text-center text-sm text-neutral-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="w-8 px-3 py-3" aria-label={t('approvals.col.expand', 'Expandir')} />
                <th className="px-4 py-3 font-medium">{t('approvals.col.date', 'Data')}</th>
                <th className="px-4 py-3 font-medium">{t('approvals.col.description', 'Descrição')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('approvals.col.amount', 'Valor')}</th>
                <th className="px-4 py-3 font-medium">{t('approvals.col.legs', 'Partidas')}</th>
                <th className="px-4 py-3 font-medium">{t('approvals.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} actions={renderActions(e)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── action modal state ───────────────────────────────────────────────────────

type ActionState =
  | { type: 'submit'; entry: ApprovalEntry }
  | { type: 'approve'; entry: ApprovalEntry }
  | { type: 'reject'; entry: ApprovalEntry }
  | null;

// ── props ────────────────────────────────────────────────────────────────────

interface EntryApprovalsPanelProps {
  unitId: string;
  /** Refetch the trial balance after an approve (approve == post, so the ledger moves). */
  onLedgerChange?: () => void;
  /** Navigate to the Períodos tab (period-closed guidance on approve). */
  onNavigateToPeriods?: () => void;
}

// ── main ─────────────────────────────────────────────────────────────────────

/**
 * EntryApprovalsPanel — the maker-checker approval tower UI (ADR-INCR-APPROVAL, backend PR #108).
 *
 *   Draft ──enviar──▶ PendingApproval ──aprovar──▶ Posted    (rejeitar volta para Draft)
 *
 * Three ADR facts this screen is built around:
 * - **One button per COMMAND** (ACC-016) — there is no status dropdown here by design.
 * - **No entry number before approve** (ACC-015): `fiscalYear`/`entryNumber` are null in both
 *   sections, so neither table has a "Nº" column — the number is shown by Lançamentos after posting.
 * - **CAS on `version`** (ACC-023): every command echoes the version the row was read at; a 409
 *   `CONFLICT` becomes the "someone changed this entry" message and forces a refetch, never a
 *   generic failure.
 *
 * Dynamic SoD (approver ≠ maker) is decided by the SERVER (policy.enforcesSegregationOfDuties,
 * off in single-user). This screen deliberately does not pre-block self-approval on the client.
 */
export function EntryApprovalsPanel({ unitId, onLedgerChange, onNavigateToPeriods }: EntryApprovalsPanelProps) {
  // `t` para renderizar, `tRef.current` dentro do fetch — ver `../lib/useAccountingT`.
  const { t, tRef } = useAccountingT();
  const [drafts, setDrafts] = useState<ApprovalEntry[]>([]);
  const [pending, setPending] = useState<ApprovalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // entry editor (create / edit draft)
  const [editing, setEditing] = useState<{ entry: ApprovalEntry | null } | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [dimensionCatalog, setDimensionCatalog] = useState<DimensionCatalogEntry[]>([]);

  // command confirmation modal
  const [action, setAction] = useState<ActionState>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPeriodError, setActionPeriodError] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      // The pending queue has its own endpoint; drafts do NOT — `/entry-approvals/pending` is
      // PendingApproval-only, so the drafts come from the general entry list filtered client-side.
      // ponytail: one page of 200 (backend max). Ceiling — a unit with >200 entries can push an
      // old draft off this page; upgrade path is a `status` filter on GET /accounting/entries.
      const [all, queue] = await Promise.all([
        accountingService.listEntries({ unitId, limit: 200 }),
        entryApprovalsService.listPending({ unitId, limit: 200 }),
      ]);
      setDrafts(all.entries.filter((e) => e.status === 'Draft'));
      setPending(queue.entries);
    } catch (err: unknown) {
      setError(
        resolveErrorWithCode(err, tRef.current('approvals.error.load', 'Erro ao carregar a fila de aprovação.')).message,
      );
    } finally {
      setLoading(false);
    }
  }, [unitId, tRef]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ── editor ─────────────────────────────────────────────────────────────────
  function openEditor(entry: ApprovalEntry | null) {
    if (!unitId) return;
    accountingService
      .getAccounts(unitId)
      .then((r) => setAccounts(r.accounts.filter((a: Account) => a.acceptsEntries)))
      .catch(() => setAccounts([]))
      .finally(() => setEditing({ entry }));
    dimensionsService
      .listCatalog({ unitId })
      .then(setDimensionCatalog)
      .catch(() => setDimensionCatalog([]));
  }

  // ── command modal ──────────────────────────────────────────────────────────
  function openAction(next: ActionState) {
    setReason('');
    setActionError(null);
    setActionPeriodError(false);
    setAction(next);
  }

  function closeAction() {
    if (busy) return;
    setAction(null);
    setActionError(null);
    setActionPeriodError(false);
  }

  async function runAction() {
    if (!action) return;
    const { entry } = action;
    setBusy(true);
    setActionError(null);
    setActionPeriodError(false);
    try {
      if (action.type === 'submit') {
        await entryApprovalsService.submitDraft(entry.id, { unitId, expectedVersion: entry.version });
      } else if (action.type === 'approve') {
        await entryApprovalsService.approve(entry.id, { unitId, expectedVersion: entry.version });
      } else {
        await entryApprovalsService.reject(entry.id, {
          unitId,
          expectedVersion: entry.version,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
      setAction(null);
      await fetchAll();
      // approve == post (F5): only that command moves the ledger.
      if (action.type === 'approve') onLedgerChange?.();
    } catch (err: unknown) {
      const { message, code } = resolveErrorWithCode(
        err,
        t('approvals.error.action', 'Não foi possível concluir a operação.'),
      );
      if (code === 'CONFLICT') {
        // Stale expectedVersion (ACC-023): the row we read is no longer the row on the server.
        // Say so specifically and refetch, so the retry carries the fresh version.
        setActionError(
          t(
            'approvals.error.conflict',
            'Alguém alterou este lançamento enquanto esta tela estava aberta. A lista foi recarregada — confira e tente de novo.',
          ),
        );
        await fetchAll();
      } else {
        if (code === 'ACCOUNTING_PERIOD_NOT_OPEN') setActionPeriodError(true);
        setActionError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── command modal copy ─────────────────────────────────────────────────────
  const isReject = action?.type === 'reject';
  const modalTheme = isReject ? 'bg-red-600' : 'bg-emerald-600';
  const confirmBtnClass = isReject ? 'bg-red-700 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500';

  let modalTitle = '';
  let confirmLabel = '';
  let busyLabel = '';
  let modalNote = '';
  if (action?.type === 'submit') {
    modalTitle = t('approvals.actionModal.submitTitle', 'Enviar para aprovação');
    confirmLabel = t('approvals.actionModal.submitConfirm', 'Enviar');
    busyLabel = t('approvals.actionModal.submitting', 'Enviando…');
    modalNote = t(
      'approvals.actionModal.submitNote',
      'O conteúdo econômico (partidas, data e histórico) fica congelado a partir daqui. Para alterá-lo, o lançamento precisa ser rejeitado de volta para rascunho.',
    );
  } else if (action?.type === 'approve') {
    modalTitle = t('approvals.actionModal.approveTitle', 'Aprovar e postar');
    confirmLabel = t('approvals.actionModal.approveConfirm', 'Aprovar e postar');
    busyLabel = t('approvals.actionModal.approving', 'Aprovando…');
    modalNote = t(
      'approvals.actionModal.approveNote',
      'Aprovar POSTA o lançamento no razão e atribui o número sequencial do exercício. Depois disso, só o estorno corrige.',
    );
  } else if (action?.type === 'reject') {
    modalTitle = t('approvals.actionModal.rejectTitle', 'Rejeitar lançamento');
    confirmLabel = t('approvals.actionModal.rejectConfirm', 'Confirmar rejeição');
    busyLabel = t('approvals.actionModal.rejecting', 'Rejeitando…');
    modalNote = t(
      'approvals.actionModal.rejectNote',
      'O lançamento volta para rascunho e pode ser editado e reenviado. Nenhum número é consumido.',
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">{t('approvals.heading', 'Aprovações')}</h2>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700"
        >
          <FiPlusCircle size={16} />
          {t('approvals.newDraft', 'Novo Rascunho')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading && (
        <div className="py-16 text-center text-neutral-400">{t('approvals.loading', 'Carregando a fila…')}</div>
      )}

      {!loading && (
        <>
          <EntrySection
            heading={t('approvals.drafts.heading', 'Rascunhos')}
            note={t(
              'approvals.drafts.note',
              'Ainda não afetam o razão nem os demonstrativos. Sem número de lançamento — ele nasce na aprovação.',
            )}
            emptyLabel={t('approvals.drafts.empty', 'Nenhum rascunho nesta unidade.')}
            entries={drafts}
            renderActions={(entry) => (
              <>
                <button
                  onClick={() => openEditor(entry)}
                  title={t('approvals.action.editTitle', 'Editar o rascunho')}
                  className={`${BTN} text-neutral-300 hover:border-emerald-600 hover:bg-emerald-900/30 hover:text-emerald-300`}
                >
                  <FiEdit2 size={12} />
                  {t('approvals.action.edit', 'Editar')}
                </button>
                <button
                  onClick={() => openAction({ type: 'submit', entry })}
                  title={t('approvals.action.submitTitle', 'Enviar para aprovação')}
                  className={`${BTN} text-emerald-300 hover:border-emerald-600 hover:bg-emerald-900/30`}
                >
                  <FiSend size={12} />
                  {t('approvals.action.submit', 'Enviar')}
                </button>
              </>
            )}
          />

          <EntrySection
            heading={t('approvals.pending.heading', 'Aguardando aprovação')}
            note={t(
              'approvals.pending.note',
              'Conteúdo congelado na submissão. Aprovar posta no razão; rejeitar devolve para rascunho.',
            )}
            emptyLabel={t('approvals.pending.empty', 'Nenhum lançamento aguardando aprovação.')}
            entries={pending}
            renderActions={(entry) => (
              <>
                <button
                  onClick={() => openAction({ type: 'approve', entry })}
                  title={t('approvals.action.approveTitle', 'Aprovar e postar no razão')}
                  className={`${BTN} text-emerald-300 hover:border-emerald-600 hover:bg-emerald-900/30`}
                >
                  <FiCheckCircle size={12} />
                  {t('approvals.action.approve', 'Aprovar')}
                </button>
                <button
                  onClick={() => openAction({ type: 'reject', entry })}
                  title={t('approvals.action.rejectTitle', 'Rejeitar de volta para rascunho')}
                  className={`${BTN} text-neutral-300 hover:border-red-700 hover:bg-red-900/30 hover:text-red-300`}
                >
                  <FiXCircle size={12} />
                  {t('approvals.action.reject', 'Rejeitar')}
                </button>
              </>
            )}
          />
        </>
      )}

      {/* Entry editor — the canonical JournalEntryModal with the draft command injected.
          `key` remounts it per draft so the pre-fill is read fresh (no effect wiring). */}
      {editing && (
        <JournalEntryModal
          key={editing.entry ? `${editing.entry.id}:${editing.entry.version}` : 'new'}
          isOpen
          onClose={() => setEditing(null)}
          unitId={unitId}
          accounts={accounts}
          dimensionCatalog={dimensionCatalog}
          initial={editing.entry ? toDraftValue(editing.entry) : undefined}
          title={
            editing.entry
              ? t('approvals.editor.editTitle', 'Editar Rascunho')
              : t('approvals.editor.createTitle', 'Novo Rascunho')
          }
          submitLabel={
            editing.entry
              ? t('approvals.editor.save', 'Salvar rascunho')
              : t('approvals.editor.create', 'Criar rascunho')
          }
          busyLabel={t('approvals.editor.saving', 'Salvando…')}
          submit={async (value) => {
            const entry = editing.entry;
            if (entry) {
              return entryApprovalsService.updateDraft(entry.id, {
                ...value,
                expectedVersion: entry.version,
              });
            }
            return entryApprovalsService.createDraft(value);
          }}
          onSuccess={() => {
            setEditing(null);
            void fetchAll();
          }}
        />
      )}

      {/* Command confirmation (submit / approve / reject) */}
      <Modal
        isOpen={!!action}
        onClose={closeAction}
        title={modalTitle}
        themeColor={modalTheme}
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              onClick={closeAction}
              disabled={busy}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {t('approvals.actionModal.cancel', 'Voltar')}
            </button>
            <button
              onClick={() => void runAction()}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmBtnClass}`}
            >
              {busy ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {busyLabel}
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {action && (
            <p>
              <span className="tabular-nums text-neutral-400">{formatDate(action.entry.date)}</span>
              {' — '}
              <span className="font-semibold text-neutral-100">{action.entry.description}</span>
              {' · '}
              <span className="tabular-nums text-neutral-100">{formatCents(totalDebit(action.entry))}</span>
            </p>
          )}

          {isReject && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {t('approvals.actionModal.reasonLabel', 'Motivo')}
                <span className="ml-1 normal-case text-neutral-600">{t('approvals.actionModal.optional', '(opcional)')}</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-red-500 focus:outline-none"
              />
            </div>
          )}

          {modalNote && <p className="text-neutral-400">{modalNote}</p>}

          {actionError && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              {actionError}
              {actionPeriodError && onNavigateToPeriods && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAction(null);
                      onNavigateToPeriods();
                    }}
                    className="underline hover:text-red-200"
                  >
                    {t('approvals.viewPeriods', 'Ver Períodos')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
