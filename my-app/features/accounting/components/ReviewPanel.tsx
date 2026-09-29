import { useCallback, useEffect, useState } from 'react';
import { FiPlusCircle } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import {
  accountingReviewService,
  type AccountingReview,
  type ReviewStatus,
} from '../../../lib/services/accountingReview.service';
import { dataExchangeService, type DataExchangeJobListItem } from '../../../lib/services/dataExchange.service';
import type { OpenReviewInput } from '@/types/contracts/accounting/AccountingReviewDto.gen';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { scopeToday } from '../lib/formatDate';
import { Field, inputClass } from './SpedGenerationPanel';
import { ReviewDetailModal, type ReviewOwnerTab } from './ReviewDetailModal';

const isForbidden = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 403;
/** Timestamp → data e hora locais (nunca `slice` de ISO — classe date-only-utc-shift). */
export const formatTimestamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');
export const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

const ECD_KINDS = ['EXPORT_SPED_ECD'];
/** `ECF_JOB_KINDS` do `AccountingReviewService`: a revisão aceita a ECF do Presumido e a do Real. */
const ECF_KINDS = ['EXPORT_SPED_ECF', 'EXPORT_SPED_ECF_REAL'];

/**
 * Jobs `EXPORTED` de ECD ou ECF do exercício, da lista de jobs do #368 (F-FE-RV-1 superado: a rota já existe).
 * Exportado para o "Trocar jobs" do detalhe (item 10) usar o mesmo seletor.
 */
export function JobPicker({
  unitId,
  year,
  layout,
  value,
  onChange,
  label,
}: {
  unitId: string;
  year: number;
  layout: 'ECD' | 'ECF';
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const { t } = useAccountingT();
  const [jobs, setJobs] = useState<DataExchangeJobListItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    const kinds = layout === 'ECD' ? ECD_KINDS : ECF_KINDS;
    Promise.all(kinds.map((kind) => dataExchangeService.listJobs(unitId, { direction: 'EXPORT', kind, status: 'EXPORTED', year, limit: 100 })))
      .then((pages) => { if (!cancelled) setJobs(pages.flatMap((p) => p.items)); })
      .catch(() => { if (!cancelled) setJobs([]); });
    return () => { cancelled = true; };
  }, [unitId, year, layout]);
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{t('review.job.none', '— nenhum —')}</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {shortId(j.id)} · {j.kind.replace('EXPORT_SPED_', '')} · {formatTimestamp(j.createdAt)}{j.supersededByJobId ? ` · ${t('review.job.superseded', 'substituído')}` : ''}
          </option>
        ))}
      </select>
    </Field>
  );
}

export interface ReviewPanelProps {
  unitId: string;
  /** "Abrir o dado no painel dono" dos achados DATA_EDIT/acerto (precedente `NfePanel.onNavigateTab`). */
  onNavigateTab: (tab: ReviewOwnerTab) => void;
}

/**
 * Revisão profissional (FE-INCR-REVIEW, BRIEF §1; F-FE-RV-2 → a: seção da Compliance depois do SPED, com o
 * detalhe num `Modal` largo). Fluxo: achado → ponteiro/acerto → regeração → sign-off (o arquivo nunca é
 * editado). Um 403 na lista mostra o aviso e nada mais (item 13).
 */
export function ReviewPanel({ unitId, onNavigateTab }: ReviewPanelProps) {
  const { t, tRef } = useAccountingT();
  const currentYear = Number(scopeToday().slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [reviews, setReviews] = useState<AccountingReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!unitId) return;
    try {
      setReviews(await accountingReviewService.list(unitId, { year, status: status || undefined }));
      setError(null);
    } catch (err: unknown) {
      if (isForbidden(err)) setForbidden(true);
      setError(resolveError(err, tRef.current('review.error.load', 'Erro ao carregar as revisões.')));
    }
  }, [unitId, year, status, tRef]);

  useEffect(() => { void fetchReviews(); }, [fetchReviews]);

  const yearOptions = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => currentYear - i);
  const selectClass = `${inputClass} py-1.5 text-xs`;
  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const badge = (s: ReviewStatus) => {
    const tone = s === 'OPEN' ? 'bg-amber-600/15 text-amber-300' : s === 'SIGNED_OFF' ? 'bg-emerald-600/15 text-emerald-300' : 'bg-red-600/15 text-red-300';
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{t(`review.status.${s}`, s)}</span>;
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="review-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('review.title', 'Revisão profissional')}</h2>
          <p className="text-sm text-neutral-500">{t('review.subtitle', 'Achado → ponteiro/acerto → regeração → sign-off (o arquivo nunca é editado).')}</p>
        </div>
        {!forbidden && (
          <button type="button" onClick={() => setOpenModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
            <FiPlusCircle size={14} /> {t('review.open', 'Abrir revisão')}
          </button>
        )}
      </div>

      {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      {!forbidden && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <select aria-label={t('review.filter.year', 'Exercício')} value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select aria-label={t('review.filter.status', 'Status')} value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus | '')} className={selectClass}>
              <option value="">{t('review.filter.allStatus', 'Todos os status')}</option>
              {(['OPEN', 'SIGNED_OFF', 'REJECTED'] as const).map((s) => <option key={s} value={s}>{t(`review.status.${s}`, s)}</option>)}
            </select>
          </div>

          {reviews.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">{t('review.empty', 'Nenhuma revisão neste recorte.')}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-neutral-400">
                    <th className={th}>{t('review.col.year', 'Exercício')}</th>
                    <th className={th}>{t('review.col.jobs', 'Arquivos (ECD · ECF)')}</th>
                    <th className={th}>{t('review.col.status', 'Status')}</th>
                    <th className={th}>{t('review.col.openedAt', 'Aberta em')}</th>
                    <th className={th}>{t('review.col.closure', 'Assinada por / motivo')}</th>
                    <th className={th}>{t('review.col.actions', 'Ações')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-800/60 last:border-0">
                      <td className={td}>{r.year}</td>
                      <td className={`${td} font-mono text-xs`}>{shortId(r.ecdJobId)} · {shortId(r.ecfJobId)}</td>
                      <td className={td}>{badge(r.status)}</td>
                      <td className={`${td} text-xs`}>{formatTimestamp(r.openedAt)}</td>
                      <td className={`${td} text-xs text-neutral-400`}>
                        {r.status === 'SIGNED_OFF' ? `${r.reviewerName ?? ''} · ${r.reviewerCrc ?? ''}` : r.status === 'REJECTED' ? r.closeReason : '—'}
                      </td>
                      <td className={td}>
                        <button type="button" onClick={() => setDetailId(r.id)} className="rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700">
                          {t('review.action.view', 'Abrir')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <OpenReviewModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        unitId={unitId}
        initialYear={year}
        onDone={() => { setOpenModal(false); void fetchReviews(); }}
        onConflict={() => void fetchReviews()}
      />
      {detailId && (
        <ReviewDetailModal
          reviewId={detailId}
          unitId={unitId}
          onClose={() => setDetailId(null)}
          onChanged={() => void fetchReviews()}
          onNavigateTab={(tab) => { setDetailId(null); onNavigateTab(tab); }}
        />
      )}
    </section>
  );
}

/** Item 4: abrir revisão escolhendo jobs EXPORTED (pelo menos um). 409 REVIEW_ALREADY_OPEN: mensagem + recarga da lista. */
function OpenReviewModal({
  isOpen,
  onClose,
  unitId,
  initialYear,
  onDone,
  onConflict,
}: {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  initialYear: number;
  onDone: () => void;
  onConflict: () => void;
}) {
  const { t } = useAccountingT();
  const [year, setYear] = useState(initialYear);
  const [ecdJobId, setEcdJobId] = useState('');
  const [ecfJobId, setEcfJobId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setYear(initialYear);
    setEcdJobId('');
    setEcfJobId('');
    setError(null);
  }, [isOpen, initialYear]);

  async function submit() {
    setBusy(true);
    setError(null);
    const body: OpenReviewInput = { unitId, year };
    if (ecdJobId) body.ecdJobId = ecdJobId;
    if (ecfJobId) body.ecfJobId = ecfJobId;
    try {
      await accountingReviewService.open(body);
      onDone();
    } catch (err: unknown) {
      setError(resolveError(err, t('review.error.generic', 'Não foi possível concluir a operação.')));
      if ((err as { status?: number } | null)?.status === 409) onConflict();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!busy) onClose(); }}
      title={t('review.openModal.title', 'Abrir revisão')}
      maxWidth="max-w-lg"
      themeColor="bg-emerald-600"
      footer={
        <button type="button" onClick={() => void submit()} disabled={busy || (!ecdJobId && !ecfJobId)} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
          {t('review.openModal.submit', 'Abrir')}
        </button>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <Field label={t('review.filter.year', 'Exercício')}>
          <input type="number" value={year} onChange={(e) => { setYear(Number(e.target.value)); setEcdJobId(''); setEcfJobId(''); }} className={inputClass} />
        </Field>
        <JobPicker unitId={unitId} year={year} layout="ECD" value={ecdJobId} onChange={setEcdJobId} label={t('review.job.ecd', 'Arquivo da ECD (EXPORTED)')} />
        <JobPicker unitId={unitId} year={year} layout="ECF" value={ecfJobId} onChange={setEcfJobId} label={t('review.job.ecf', 'Arquivo da ECF (EXPORTED)')} />
        <p className="text-xs text-neutral-500">{t('review.openModal.hint', 'Escolha pelo menos um arquivo gerado na seção acima.')}</p>
        {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
    </Modal>
  );
}
