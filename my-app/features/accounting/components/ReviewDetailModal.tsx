import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  REVIEW_REGISTERS,
  RESOLUTION_TARGETS,
  accountingReviewService,
  type AccountingReviewFinding,
  type FindingSeverity,
  type ResolutionTarget,
  type ReviewDetail,
  type ReviewRegister,
} from '../../../lib/services/accountingReview.service';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import type {
  AddFindingInput,
  AdjustmentEntryInput,
  RejectReviewInput,
  ReplaceReviewJobsInput,
  ResolveFindingInput,
  SignOffReviewInput,
} from '@/types/contracts/accounting/AccountingReviewDto.gen';
import { useAccountingT } from '../lib/useAccountingT';
import type { GovernanceScope } from '../governance/GovernanceScope';
import { resolveGovernanceError } from '../governance/governanceError';
import { activeAssignmentVars } from '../governance/ActiveAssignmentBanner';
import type { ActiveAssignment } from '../governance/useActiveAssignment';
import { dataExchangeService } from '../../../lib/services/dataExchange.service';
import { Field, inputClass } from './SpedGenerationPanel';
import { JournalEntryModal, type JournalEntrySubmitValue } from './JournalEntryModal';
import { JobPicker, formatTimestamp, shortId } from './ReviewPanel';

/** Aba dona do alvo do ponteiro DATA_EDIT/acerto (item 7) — o link "abrir o dado no painel dono". */
export type ReviewOwnerTab = 'plano-de-contas' | 'contrapartes' | 'compliance' | 'lancamentos';
export const TARGET_TAB: Record<ResolutionTarget, ReviewOwnerTab> = {
  account: 'plano-de-contas',
  counterparty: 'contrapartes',
  referential_mapping: 'compliance',
  generation_input: 'compliance',
  journal_entry: 'lancamentos',
};

/** Nome legível de cada registro revisável (BRIEF item 14) — fechado sobre `REVIEW_REGISTERS`. */
export const REGISTER_LABEL: Record<ReviewRegister, string> = {
  '0000': 'abertura',
  I050: 'plano de contas',
  I051: 'referencial',
  I200: 'lançamento',
  I250: 'partida',
  J150: 'DRE',
  J930: 'signatários',
  M300: 'Parte A (IRPJ)',
  M350: 'Parte A (CSLL)',
  M410: 'Parte B',
  N630: 'IRPJ',
};

/** Placeholder do localizador por registro (item 6). */
const LOCATOR_HINT: Partial<Record<ReviewRegister, string>> = { I050: 'código da conta', I200: 'nº do lançamento', M300: 'linha' };

type Action =
  | { kind: 'addFinding' }
  | { kind: 'dataEdit'; finding: AccountingReviewFinding }
  | { kind: 'noAction'; finding: AccountingReviewFinding }
  | { kind: 'adjustment'; finding: AccountingReviewFinding }
  | { kind: 'replaceJobs' }
  | { kind: 'signOff' }
  | { kind: 'reject' };

const isConflict = (err: unknown, code: string) => (err as { code?: string } | null)?.code === code;

export interface ReviewDetailModalProps {
  reviewId: string;
  unitId: string;
  onClose: () => void;
  /** Recarrega a lista do painel depois de cada comando. */
  onChanged: () => void;
  onNavigateTab: (tab: ReviewOwnerTab) => void;
  /**
   * Modo cliente (BRIEF item 10): `ownerUserId` em `get`/`signOff`/`reject`/download; some tudo o que escreve no
   * razão ou cai fora dos 9 handlers (achado, resolver, acerto, trocar jobs, `getAccounts`, `listJobs`).
   */
  governance?: GovernanceScope;
  /** Atribuição ACTIVE do escopo (modo próprio) — só alimenta `{{name}}`/`{{crc}}` do `ACCOUNTANT_REQUIRED`. */
  active?: ActiveAssignment | null;
  onAssignmentLost?: () => void;
}

/**
 * Detalhe da revisão (FE-INCR-REVIEW itens 5–12) num `Modal` largo (F-FE-RV-2 → a). Todo comando recarrega o
 * detalhe e a lista. `REVIEW_STALE` no sign-off: mensagem íntegra + "Trocar jobs" (F-FE-RV-3 → a — só o BE
 * decide, nenhum cálculo local de "resolvido depois da geração"). O acerto reusa o `JournalEntryModal`
 * (F-FE-RV-4 → a) com `reverseOriginal` no slot `extraFields`, só para I200 (o BE recusa fora disso).
 */
export function ReviewDetailModal({ reviewId, unitId, onClose, onChanged, onNavigateTab, governance, active = null, onAssignmentLost }: ReviewDetailModalProps) {
  const { t, tRef } = useAccountingT();
  const ownerUserId = governance?.ownerUserId;
  const delegated = !!governance;
  // Ref: o pai pode recriar o callback a cada render; o `load` não pode re-disparar por isso.
  const assignmentLostRef = useRef(onAssignmentLost);
  assignmentLostRef.current = onAssignmentLost;
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    try {
      setDetail(await accountingReviewService.get(reviewId, unitId, ownerUserId));
      setError(null);
    } catch (err: unknown) {
      const { message, code } = resolveGovernanceError(err, tRef.current, tRef.current('review.error.load', 'Erro ao carregar as revisões.'));
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') assignmentLostRef.current?.();
      setError(message);
    }
  }, [reviewId, unitId, ownerUserId, tRef]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // Modo cliente: `getAccounts` não é um dos 9 handlers (resolveria o escopo do contador) e só os modais de
    // resolver/acerto o usam, escondidos aqui.
    if (delegated) return;
    accountingService.getAccounts(unitId).then((r) => setAccounts(r.accounts)).catch(() => setAccounts([]));
  }, [unitId, delegated]);

  /** Baixar o par em revisão — a leitura que o F-GOV-7 (a+) deu ao contador ("assina o que consegue ler"); nos dois modos. */
  const download = async (jobId: string, fileName: string) => {
    try {
      await dataExchangeService.downloadArtifact(jobId, unitId, fileName, ownerUserId);
    } catch (err: unknown) {
      const { message, code } = resolveGovernanceError(err, tRef.current, tRef.current('review.error.download', 'Não foi possível baixar o arquivo.'));
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') assignmentLostRef.current?.();
      setError(message);
    }
  };

  const done = () => { setAction(null); void load(); onChanged(); };
  const review = detail?.review;
  const isOpen = review?.status === 'OPEN';
  const openBlockers = detail?.findings.filter((f) => f.finding.severity === 'BLOCKER' && !f.finding.resolution).length ?? 0;
  const th = 'px-3 py-2 font-medium';
  const td = 'px-3 py-2 align-top';
  const smallBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-300 hover:bg-neutral-700';

  return (
    <Modal isOpen onClose={onClose} title={t('review.detail.title', 'Revisão {{year}}', { year: review?.year ?? '' })} maxWidth="max-w-5xl" themeColor="bg-emerald-600">
      <div className="space-y-4 px-6 py-5 text-sm text-neutral-300" data-testid="review-detail">
        {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
        {review && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono">ECD {shortId(review.ecdJobId)} · ECF {shortId(review.ecfJobId)}</span>
              <span>{t(`review.status.${review.status}`, review.status)}</span>
              <span data-testid="review-blockers" data-count={openBlockers}>{t('review.detail.blockers', '{{n}} BLOCKER abertos', { n: openBlockers })}</span>
            </div>
            {(review.ecdJobId || review.ecfJobId) && (
              <div className="flex flex-wrap gap-2" data-testid="review-downloads">
                {review.ecdJobId && (
                  <button type="button" onClick={() => void download(review.ecdJobId as string, `sped-ecd-${review.year}.txt`)} className={smallBtn}>{t('review.action.downloadEcd', 'Baixar ECD')}</button>
                )}
                {review.ecfJobId && (
                  <button type="button" onClick={() => void download(review.ecfJobId as string, `sped-ecf-${review.year}.txt`)} className={smallBtn}>{t('review.action.downloadEcf', 'Baixar ECF')}</button>
                )}
              </div>
            )}
            {isOpen && (
              <div className="flex flex-wrap gap-2">
                {!delegated && <button type="button" onClick={() => setAction({ kind: 'addFinding' })} className={smallBtn}>{t('review.action.addFinding', 'Adicionar achado')}</button>}
                {!delegated && <button type="button" onClick={() => setAction({ kind: 'replaceJobs' })} className={smallBtn}>{t('review.action.replaceJobs', 'Trocar jobs')}</button>}
                <button type="button" onClick={() => setAction({ kind: 'signOff' })} disabled={openBlockers > 0} className={`${smallBtn} disabled:cursor-not-allowed disabled:opacity-40`}>{t('review.action.signOff', 'Assinar')}</button>
                <button type="button" onClick={() => setAction({ kind: 'reject' })} className={`${smallBtn} hover:border-red-800 hover:text-red-300`}>{t('review.action.reject', 'Rejeitar')}</button>
              </div>
            )}
            {review.status === 'REJECTED' && (
              <p className="text-xs text-red-300">{t('review.detail.rejectedNote', 'Revisão rejeitada: o pacote deste par não pode ser entregue (REVIEW_REJECTED).')}</p>
            )}

            {detail.findings.length === 0 ? (
              <div className="py-4 text-center text-neutral-500">{t('review.detail.noFindings', 'Nenhum achado registrado.')}</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-left text-neutral-400">
                      <th className={th}>{t('review.finding.register', 'Registro')}</th>
                      <th className={th}>{t('review.finding.locator', 'Localizador')}</th>
                      <th className={th}>{t('review.finding.description', 'Descrição')}</th>
                      <th className={th}>{t('review.finding.severity', 'Severidade')}</th>
                      <th className={th}>{t('review.finding.state', 'Estado')}</th>
                      <th className={th}>{t('review.col.actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.findings.map(({ finding: f, targetAuditEvents }) => {
                      const target = f.resolutionTargetType as ResolutionTarget | null;
                      return (
                        <tr key={f.id} data-testid={`finding-${f.id}`} className="border-b border-neutral-800/60 last:border-0">
                          <td className={td}><span className="font-mono">{f.register}</span> <span className="text-neutral-500">{t(`review.register.${f.register}`, REGISTER_LABEL[f.register])}</span></td>
                          <td className={`${td} font-mono`}>{f.locator}</td>
                          <td className={`${td} max-w-[18rem]`} title={f.description}><span className="line-clamp-2">{f.description}</span></td>
                          <td className={td}><span className={f.severity === 'BLOCKER' ? 'font-semibold text-red-300' : 'text-neutral-400'}>{f.severity}</span></td>
                          <td className={td}>
                            {!f.resolution ? (
                              <span className="text-amber-300">{t('review.finding.open', 'aberto')}</span>
                            ) : (
                              <div className="space-y-0.5">
                                <div>{t(`review.resolution.${f.resolution}`, f.resolution)} · {formatTimestamp(f.resolvedAt)}</div>
                                {f.resolutionNote && <div className="text-neutral-400">{f.resolutionNote}</div>}
                                {!delegated && target && TARGET_TAB[target] && (
                                  <button type="button" onClick={() => onNavigateTab(TARGET_TAB[target])} className="underline">
                                    {t('review.finding.openOwner', 'Abrir {{type}} {{id}} no painel dono', { type: target, id: shortId(f.resolutionTargetId) })}
                                  </button>
                                )}
                                {targetAuditEvents.map((ev) => (
                                  <div key={ev.id} className="text-neutral-500">{ev.eventType} · {formatTimestamp(ev.createdAt)}</div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className={td}>
                            {!delegated && isOpen && !f.resolution && (
                              <div className="flex flex-wrap gap-1">
                                <button type="button" onClick={() => setAction({ kind: 'dataEdit', finding: f })} className={smallBtn}>{t('review.action.dataEdit', 'Apontar dado editado')}</button>
                                <button type="button" onClick={() => setAction({ kind: 'adjustment', finding: f })} className={smallBtn}>{t('review.action.adjustment', 'Lançar acerto')}</button>
                                <button type="button" onClick={() => setAction({ kind: 'noAction', finding: f })} className={smallBtn}>{t('review.action.noAction', 'Sem ação')}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {review && action?.kind === 'addFinding' && <AddFindingModal reviewId={review.id} unitId={unitId} onClose={() => setAction(null)} onDone={done} />}
      {review && (action?.kind === 'dataEdit' || action?.kind === 'noAction') && (
        <ResolveModal reviewId={review.id} unitId={unitId} finding={action.finding} mode={action.kind} accounts={accounts} onClose={() => setAction(null)} onDone={done} />
      )}
      {review && action?.kind === 'adjustment' && (
        <AdjustmentModal reviewId={review.id} unitId={unitId} finding={action.finding} accounts={accounts} onClose={() => setAction(null)} onDone={done} />
      )}
      {review && action?.kind === 'replaceJobs' && <ReplaceJobsModal reviewId={review.id} unitId={unitId} year={review.year} onClose={() => setAction(null)} onDone={done} />}
      {review && action?.kind === 'signOff' && (
        <SignOffModal reviewId={review.id} unitId={unitId} openBlockers={openBlockers} onClose={() => setAction(null)} onDone={done} onReplaceJobs={() => setAction({ kind: 'replaceJobs' })} governance={governance} active={active} onAssignmentLost={onAssignmentLost} />
      )}
      {review && action?.kind === 'reject' && <RejectModal reviewId={review.id} unitId={unitId} onClose={() => setAction(null)} onDone={done} governance={governance} active={active} onAssignmentLost={onAssignmentLost} />}
    </Modal>
  );
}

// ── Sub-modais ────────────────────────────────────────────────────────────────

function CommandModal({
  title,
  danger,
  busy,
  canSubmit,
  onSubmit,
  onClose,
  error,
  extraError,
  children,
}: {
  title: string;
  danger?: boolean;
  busy: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onClose: () => void;
  error: string | null;
  extraError?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useAccountingT();
  return (
    <Modal
      isOpen
      onClose={() => { if (!busy) onClose(); }}
      title={title}
      maxWidth="max-w-lg"
      themeColor={danger ? 'bg-red-600' : 'bg-emerald-600'}
      footer={
        <button type="button" onClick={onSubmit} disabled={busy || !canSubmit} className={`rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
          {busy ? t('review.saving', 'Salvando…') : t('review.confirm', 'Confirmar')}
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm">
        {children}
        {error && (
          <div role="alert" className="space-y-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            <p>{error}</p>
            {extraError}
          </div>
        )}
      </div>
    </Modal>
  );
}

function useCommand(onDone: () => void, ctx?: { vars?: Record<string, string>; onAssignmentLost?: () => void }) {
  const { t, tRef } = useAccountingT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<unknown>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (err: unknown) {
      setLastError(err);
      const { message, code } = resolveGovernanceError(err, tRef.current, t('review.error.generic', 'Não foi possível concluir a operação.'), ctx?.vars);
      if (code === 'ACCOUNTANT_NOT_ASSIGNED') ctx?.onAssignmentLost?.();
      setError(message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, lastError, run };
}

/** Item 6: adicionar achado — body exato do `AddFindingSchema`. */
function AddFindingModal({ reviewId, unitId, onClose, onDone }: { reviewId: string; unitId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useAccountingT();
  const [register, setRegister] = useState<ReviewRegister>('I050');
  const [locator, setLocator] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>('NOTE');
  const cmd = useCommand(onDone);
  const valid = locator.trim().length >= 1 && locator.trim().length <= 200 && description.trim().length >= 1 && description.trim().length <= 1000;
  const submit = () => {
    const body: AddFindingInput = { unitId, register, locator: locator.trim(), description: description.trim(), severity };
    void cmd.run(() => accountingReviewService.addFinding(reviewId, body));
  };
  return (
    <CommandModal title={t('review.action.addFinding', 'Adicionar achado')} busy={cmd.busy} canSubmit={valid} onSubmit={submit} onClose={onClose} error={cmd.error}>
      <Field label={t('review.finding.register', 'Registro')}>
        <select value={register} onChange={(e) => setRegister(e.target.value as ReviewRegister)} className={inputClass}>
          {REVIEW_REGISTERS.map((r) => <option key={r} value={r}>{r} — {t(`review.register.${r}`, REGISTER_LABEL[r])}</option>)}
        </select>
      </Field>
      <Field label={t('review.finding.locator', 'Localizador')}>
        <input value={locator} maxLength={200} onChange={(e) => setLocator(e.target.value)} placeholder={LOCATOR_HINT[register] ?? ''} className={inputClass} />
      </Field>
      <Field label={t('review.finding.description', 'Descrição')}>
        <textarea value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        <span className="text-neutral-500">{t('review.finding.freeTextHint', 'Texto livre — nunca entra na trilha de auditoria.')}</span>
      </Field>
      <Field label={t('review.finding.severity', 'Severidade')}>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as FindingSeverity)} className={inputClass}>
          <option value="NOTE">NOTE</option>
          <option value="BLOCKER">BLOCKER</option>
        </select>
      </Field>
    </CommandModal>
  );
}

/** Itens 7–8: resolver por ponteiro (DATA_EDIT) ou sem ação (NO_ACTION) — um dos dois shapes da union, nunca os dois. */
function ResolveModal({
  reviewId,
  unitId,
  finding,
  mode,
  accounts,
  onClose,
  onDone,
}: {
  reviewId: string;
  unitId: string;
  finding: AccountingReviewFinding;
  mode: 'dataEdit' | 'noAction';
  accounts: Account[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAccountingT();
  const [targetType, setTargetType] = useState<ResolutionTarget>('account');
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');
  const cmd = useCommand(onDone);
  const valid = mode === 'dataEdit' ? targetId.trim() !== '' : note.trim().length >= 1 && note.trim().length <= 500;
  const submit = () => {
    const body: ResolveFindingInput =
      mode === 'dataEdit'
        ? { unitId, resolution: 'DATA_EDIT', targetType, targetId: targetId.trim() }
        : { unitId, resolution: 'NO_ACTION', resolutionNote: note.trim() };
    void cmd.run(() => accountingReviewService.resolveFinding(reviewId, finding.id, body));
  };
  return (
    <CommandModal
      title={mode === 'dataEdit' ? t('review.action.dataEdit', 'Apontar dado editado') : t('review.action.noAction', 'Sem ação')}
      busy={cmd.busy}
      canSubmit={valid}
      onSubmit={submit}
      onClose={onClose}
      error={cmd.error}
    >
      <p className="text-xs text-neutral-400"><span className="font-mono">{finding.register} · {finding.locator}</span> — {finding.description}</p>
      {mode === 'dataEdit' ? (
        <>
          <p className="text-xs text-neutral-500">{t('review.dataEdit.hint', 'O dado é editado no painel dono; aqui só se registra o ponteiro para ele.')}</p>
          <Field label={t('review.dataEdit.targetType', 'Tipo do dado')}>
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value as ResolutionTarget); setTargetId(''); }} className={inputClass}>
              {RESOLUTION_TARGETS.map((tt) => <option key={tt} value={tt}>{t(`review.target.${tt}`, tt)}</option>)}
            </select>
          </Field>
          <Field label={t('review.dataEdit.targetId', 'Qual (id)')}>
            {targetType === 'account' ? (
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
                <option value="">{t('review.dataEdit.pickAccount', 'Selecione a conta…')}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            ) : (
              <input value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass} />
            )}
          </Field>
        </>
      ) : (
        <Field label={t('review.noAction.note', 'Justificativa (obrigatória)')}>
          <textarea value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          <span className="text-neutral-500">{t('review.noAction.hint', 'Achado descartado sem justificativa é recusado.')}</span>
        </Field>
      )}
    </CommandModal>
  );
}

/** Item 9: lançamento de acerto pelo editor canônico; `reverseOriginal` só para I200. */
function AdjustmentModal({
  reviewId,
  unitId,
  finding,
  accounts,
  onClose,
  onDone,
}: {
  reviewId: string;
  unitId: string;
  finding: AccountingReviewFinding;
  accounts: Account[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useAccountingT();
  const [reverseOriginal, setReverseOriginal] = useState(false);
  const isI200 = finding.register === 'I200';
  const submit = async (value: JournalEntrySubmitValue) => {
    const body: AdjustmentEntryInput = { unitId, postingDate: value.date, description: value.description, lines: value.lines };
    if (isI200) body.reverseOriginal = reverseOriginal;
    return accountingReviewService.postAdjustment(reviewId, finding.id, body);
  };
  return (
    <JournalEntryModal
      isOpen
      onClose={onClose}
      unitId={unitId}
      accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name, acceptsEntries: a.acceptsEntries }))}
      onSuccess={onDone}
      submit={submit}
      title={t('review.adjustment.title', 'Lançamento de acerto — {{register}} {{locator}}', { register: finding.register, locator: finding.locator })}
      submitLabel={t('review.adjustment.submit', 'Lançar acerto')}
      extraFields={
        <div className="space-y-1 text-xs text-neutral-400">
          <p>{t('review.adjustment.periodHint', 'A data do acerto precisa de período OPEN — extemporâneo é permitido.')}</p>
          {isI200 && (
            <label className="inline-flex items-center gap-2 text-neutral-300">
              <input type="checkbox" checked={reverseOriginal} onChange={(e) => setReverseOriginal(e.target.checked)} />
              {t('review.adjustment.reverseOriginal', 'Estornar também o lançamento original (I200)')}
            </label>
          )}
        </div>
      }
    />
  );
}

/** Item 10: trocar jobs após regeração — body só com o job trocado. */
function ReplaceJobsModal({ reviewId, unitId, year, onClose, onDone }: { reviewId: string; unitId: string; year: number; onClose: () => void; onDone: () => void }) {
  const { t } = useAccountingT();
  const [ecdJobId, setEcdJobId] = useState('');
  const [ecfJobId, setEcfJobId] = useState('');
  const cmd = useCommand(onDone);
  const submit = () => {
    const body: ReplaceReviewJobsInput = { unitId };
    if (ecdJobId) body.ecdJobId = ecdJobId;
    if (ecfJobId) body.ecfJobId = ecfJobId;
    void cmd.run(() => accountingReviewService.replaceJobs(reviewId, body));
  };
  return (
    <CommandModal title={t('review.action.replaceJobs', 'Trocar jobs')} busy={cmd.busy} canSubmit={!!ecdJobId || !!ecfJobId} onSubmit={submit} onClose={onClose} error={cmd.error}>
      <p className="text-xs text-neutral-400">{t('review.replaceJobs.hint', 'O par antigo fica registrado no evento review.jobs_replaced.')}</p>
      <JobPicker unitId={unitId} year={year} layout="ECD" value={ecdJobId} onChange={setEcdJobId} label={t('review.job.ecd', 'Arquivo da ECD (EXPORTED)')} />
      <JobPicker unitId={unitId} year={year} layout="ECF" value={ecfJobId} onChange={setEcfJobId} label={t('review.job.ecf', 'Arquivo da ECF (EXPORTED)')} />
    </CommandModal>
  );
}

/** Item 11: assinar — desabilitado com BLOCKER aberto; 409 REVIEW_STALE abre o caminho do PATCH /jobs. */
function SignOffModal({
  reviewId,
  unitId,
  openBlockers,
  onClose,
  onDone,
  onReplaceJobs,
  governance,
  active,
  onAssignmentLost,
}: {
  reviewId: string;
  unitId: string;
  openBlockers: number;
  onClose: () => void;
  onDone: () => void;
  onReplaceJobs: () => void;
  governance?: GovernanceScope;
  active?: ActiveAssignment | null;
  onAssignmentLost?: () => void;
}) {
  const { t } = useAccountingT();
  const [reviewerName, setReviewerName] = useState('');
  // F-FE-GOV-3 (a): no modo cliente o CRC é o snapshot da atribuição, só-leitura — o único valor que o servidor aceita (F-GOV-9 a).
  const [reviewerCrc, setReviewerCrc] = useState(governance?.crcNumber ?? '');
  const [statement, setStatement] = useState('');
  const cmd = useCommand(onDone, { vars: activeAssignmentVars(active ?? null, governance), onAssignmentLost });
  const valid = openBlockers === 0 && reviewerName.trim().length >= 3 && reviewerName.trim().length <= 120 && reviewerCrc.trim() !== '' && statement.trim().length >= 1 && statement.trim().length <= 500;
  const submit = () => {
    const body: SignOffReviewInput = { unitId, reviewerName: reviewerName.trim(), reviewerCrc: reviewerCrc.trim(), statement: statement.trim() };
    if (governance) body.ownerUserId = governance.ownerUserId;
    void cmd.run(() => accountingReviewService.signOff(reviewId, body));
  };
  return (
    <CommandModal
      title={t('review.action.signOff', 'Assinar')}
      busy={cmd.busy}
      canSubmit={valid}
      onSubmit={submit}
      onClose={onClose}
      error={cmd.error}
      extraError={!governance && isConflict(cmd.lastError, 'REVIEW_STALE') && (
        <button type="button" onClick={onReplaceJobs} className="underline">{t('review.action.replaceJobs', 'Trocar jobs')}</button>
      )}
    >
      <p className="text-xs text-neutral-400" data-testid="signoff-blockers">{t('review.detail.blockers', '{{n}} BLOCKER abertos', { n: openBlockers })}</p>
      <Field label={t('review.signOff.name', 'Nome do revisor')}>
        <input value={reviewerName} maxLength={120} onChange={(e) => setReviewerName(e.target.value)} className={inputClass} />
      </Field>
      <Field label={t('review.signOff.crc', 'CRC')}>
        <input value={reviewerCrc} readOnly={!!governance} onChange={(e) => setReviewerCrc(e.target.value)} placeholder="SP-123456/O-1" className={inputClass} />
        <span className="text-neutral-500">{t('review.signOff.crcHint', 'Máscara CFC UF-NNNNNN/O-D.')}</span>
      </Field>
      <Field label={t('review.signOff.statement', 'Declaração')}>
        <textarea value={statement} maxLength={500} rows={3} onChange={(e) => setStatement(e.target.value)} className={inputClass} />
      </Field>
    </CommandModal>
  );
}

/** Item 12: rejeitar — terminal. */
function RejectModal({
  reviewId,
  unitId,
  onClose,
  onDone,
  governance,
  active,
  onAssignmentLost,
}: {
  reviewId: string;
  unitId: string;
  onClose: () => void;
  onDone: () => void;
  governance?: GovernanceScope;
  active?: ActiveAssignment | null;
  onAssignmentLost?: () => void;
}) {
  const { t } = useAccountingT();
  const [reason, setReason] = useState('');
  const cmd = useCommand(onDone, { vars: activeAssignmentVars(active ?? null, governance), onAssignmentLost });
  const submit = () => {
    const body: RejectReviewInput = { unitId, reason: reason.trim() };
    if (governance) body.ownerUserId = governance.ownerUserId;
    void cmd.run(() => accountingReviewService.reject(reviewId, body));
  };
  return (
    <CommandModal
      title={t('review.action.reject', 'Rejeitar')}
      danger
      busy={cmd.busy}
      canSubmit={reason.trim().length >= 1 && reason.trim().length <= 500}
      onSubmit={submit}
      onClose={onClose}
      error={cmd.error}
    >
      <p className="text-xs text-red-300">{t('review.reject.hint', 'Rejeição é terminal: o pacote deste par não poderá ser entregue (REVIEW_REJECTED).')}</p>
      <Field label={t('review.reject.reason', 'Motivo')}>
        <textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </Field>
    </CommandModal>
  );
}
