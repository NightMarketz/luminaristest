import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  accountingService,
  type AgingReport,
  type AgingKind,
  type AgingBucketId,
  type AgingCounterpartyGroup,
  type AgingTieOut,
  type TieOutSkippedReason,
} from '../../../lib/services/accounting.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveError } from '../lib/resolveError';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Ordem fixa de exibição — espelha `AGING_BUCKETS` do backend (AgingReportService.ts). Nunca reordenar. */
const AGING_BUCKETS: AgingBucketId[] = ['a_vencer', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'];

/** Sufixo da chave i18n `aging.buckets.<suffix>` para cada bucket (d90_plus é o único que não é 1:1 com o id). */
const BUCKET_KEY_SUFFIX: Record<AgingBucketId, string> = {
  a_vencer: 'aVencer',
  d1_30: 'd1_30',
  d31_60: 'd31_60',
  d61_90: 'd61_90',
  d90_plus: 'd90Plus',
};

const BUCKET_FALLBACK: Record<AgingBucketId, string> = {
  a_vencer: 'A vencer',
  d1_30: '1-30 dias',
  d31_60: '31-60 dias',
  d61_90: '61-90 dias',
  d90_plus: '+90 dias',
};

const TIE_OUT_SKIPPED_FALLBACK: Record<TieOutSkippedReason, string> = {
  as_of_not_today: 'Tie-out disponível apenas para a posição de hoje.',
  control_account_missing: 'Conta de controle não encontrada no plano de contas.',
  control_account_not_balance_sheet_nature: 'Conta de controle com natureza fora do Balanço Patrimonial.',
};

interface Props {
  unitId: string;
  /** F-AGING-5(b): navegação cruzada contraparte → subledger filtrado. */
  onNavigateToPayable?: (counterpartyId: string) => void;
  onNavigateToReceivable?: (counterpartyId: string) => void;
}

/**
 * AgingPanel — posição de aging (AP/AR) por contraparte × faixa de vencimento
 * (INCR-AGING FE, BRIEF-FE-AGING). Clona a estrutura de controles de
 * `BalanceSheetPanel.tsx` (data + botão) e o padrão de tabela agrupada com
 * drill de `DimensionReports.tsx` (toggle de kind + BalanceBucketRows).
 */
export function AgingPanel({ unitId, onNavigateToPayable, onNavigateToReceivable }: Props) {
  const { t } = useTranslation('accounting');
  const [kind, setKind] = useState<AgingKind>('payable');
  const [asOf, setAsOf] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AgingReport | null>(null);

  async function generate() {
    if (!unitId || !asOf) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await accountingService.getAging({ unitId, kind, asOf }));
    } catch (err: unknown) {
      setError(resolveError(err, t('aging.error.load', 'Erro ao carregar o relatório de aging.')));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function onNavigate(counterpartyId: string) {
    if (kind === 'payable') onNavigateToPayable?.(counterpartyId);
    else onNavigateToReceivable?.(counterpartyId);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-neutral-200">{t('aging.title', 'Aging (Pagar/Receber)')}</h2>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-xl border border-neutral-800 bg-neutral-900/60 p-0.5">
          <button
            type="button"
            onClick={() => setKind('payable')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === 'payable' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('aging.controls.kind.payable', 'Pagar')}
          </button>
          <button
            type="button"
            onClick={() => setKind('receivable')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === 'receivable' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('aging.controls.kind.receivable', 'Receber')}
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            {t('aging.controls.asOf', 'Posição em')}
          </span>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || !asOf}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? t('aging.controls.generating', 'Gerando…') : t('aging.controls.generate', 'Gerar')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {!report && !loading && !error && (
        <div className="py-12 text-center text-neutral-500">
          {t('aging.empty', 'Selecione o tipo e a data e clique em "Gerar" para visualizar a posição de aging.')}
        </div>
      )}

      {report && (
        <div className="space-y-5">
          <AgingReportTable report={report} onNavigate={onNavigateToPayable || onNavigateToReceivable ? onNavigate : undefined} />
          <TieOutBlock tieOut={report.tieOut} skippedReason={report.tieOutSkippedReason} />
        </div>
      )}
    </div>
  );
}

// ── report table (totais gerais + grupos + drill por documento) ────────────────
function AgingReportTable({
  report,
  onNavigate,
}: {
  report: AgingReport;
  onNavigate?: (counterpartyId: string) => void;
}) {
  const { t } = useTranslation('accounting');
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/50">
      <table className="w-full min-w-[840px] text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-3 font-medium">{t('subledgerFilters.counterpartyLabel', 'Contraparte')}</th>
            {AGING_BUCKETS.map((b) => (
              <th key={b} className="px-4 py-3 text-right font-medium">
                {t(`aging.buckets.${BUCKET_KEY_SUFFIX[b]}`, BUCKET_FALLBACK[b])}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">{t('aging.group.total', 'Total')}</th>
          </tr>
        </thead>
        <tbody>
          {report.groups.map((group) => (
            <GroupRows key={group.counterpartyId ?? '__none__'} group={group} onNavigate={onNavigate} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-700 bg-neutral-900/80">
            <td className="px-4 py-2.5 text-xs font-semibold text-neutral-400">{t('aging.total', 'Total')}</td>
            {AGING_BUCKETS.map((b) => (
              <td key={b} className="px-4 py-2.5 text-right tabular-nums text-sm text-neutral-200">
                {formatCents(parseInt(report.buckets[b], 10))}
              </td>
            ))}
            <td className="px-4 py-2.5 text-right tabular-nums text-sm font-bold text-neutral-100">
              {formatCents(parseInt(report.totalCents, 10))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  onNavigate,
}: {
  group: AgingCounterpartyGroup;
  onNavigate?: (counterpartyId: string) => void;
}) {
  const { t } = useTranslation('accounting');
  const isNone = group.counterpartyId === null;
  const displayName = isNone ? t('aging.group.none', '(Sem contraparte)') : group.counterpartyName;
  const clickable = !isNone && !!onNavigate;

  return (
    <>
      <tr className="border-b border-neutral-800/50">
        <td className="px-4 py-2 text-neutral-200">
          {clickable ? (
            <button
              type="button"
              onClick={() => onNavigate!(group.counterpartyId as string)}
              className="text-left font-medium text-emerald-400 underline-offset-2 hover:underline"
            >
              {displayName}
            </button>
          ) : (
            <span className={isNone ? 'italic text-neutral-500' : 'font-medium'}>{displayName}</span>
          )}
        </td>
        {AGING_BUCKETS.map((b) => (
          <td key={b} className="px-4 py-2 text-right tabular-nums text-neutral-300">
            {formatCents(parseInt(group.buckets[b], 10))}
          </td>
        ))}
        <td className="px-4 py-2 text-right tabular-nums font-semibold text-neutral-100">
          {formatCents(parseInt(group.totalCents, 10))}
        </td>
      </tr>
      {/* Drill por documento (F-AGING-3→a: sempre expandido). */}
      {group.documents.map((doc) => (
        <tr key={doc.id} className="border-b border-neutral-800/30 last:border-0">
          <td className="px-4 py-1.5 text-xs text-neutral-500" colSpan={AGING_BUCKETS.length + 1}>
            <span className="inline-block pl-6">
              {t('aging.document.number', 'Documento')}: <span className="font-mono">{doc.documentNumber ?? '—'}</span>
              {' · '}
              {t('aging.document.dueDate', 'Vencimento')}: {formatDate(doc.dueDate)}
              {' · '}
              {t('aging.document.daysOverdue', 'Dias em atraso')}: {doc.daysOverdue}
              {' · '}
              {t(`aging.buckets.${BUCKET_KEY_SUFFIX[doc.bucket]}`, BUCKET_FALLBACK[doc.bucket])}
            </span>
          </td>
          <td className="px-4 py-1.5 text-right text-xs tabular-nums text-neutral-500">
            {formatCents(parseInt(doc.amountCents, 10))}
          </td>
        </tr>
      ))}
    </>
  );
}

// ── tie-out subledger ↔ razão ────────────────────────────────────────────────
function TieOutBlock({
  tieOut,
  skippedReason,
}: {
  tieOut: AgingTieOut | null;
  skippedReason: TieOutSkippedReason | null;
}) {
  const { t } = useTranslation('accounting');

  if (!tieOut) {
    return (
      <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        <p className="font-semibold mb-1">{t('aging.tieOut.title', 'Tie-out subrazão × razão')}</p>
        <p>
          {skippedReason
            ? t(`aging.tieOut.skipped.${skippedReason}`, TIE_OUT_SKIPPED_FALLBACK[skippedReason])
            : null}
        </p>
      </div>
    );
  }

  const diff = parseInt(tieOut.differenceCents, 10);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          {t('aging.tieOut.title', 'Tie-out subrazão × razão')}
        </span>
        {tieOut.tiesOut ? (
          <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            {t('aging.tieOut.tiesOut', 'OK')}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-300">
            {t('aging.tieOut.mismatch', 'Discrepância')}
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-neutral-800/50">
            <td className="px-4 py-2 text-neutral-300">{t('aging.tieOut.subledgerTotal', 'Total do subrazão')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-neutral-200">
              {formatCents(parseInt(tieOut.subledgerTotalCents, 10))}
            </td>
          </tr>
          <tr className="border-b border-neutral-800/50">
            <td className="px-4 py-2 text-neutral-300">{t('aging.tieOut.controlBalance', 'Saldo da conta de controle')}</td>
            <td className="px-4 py-2 text-right tabular-nums text-neutral-200">
              {formatCents(parseInt(tieOut.controlAccountBalanceCents, 10))}
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-neutral-300">{t('aging.tieOut.difference', 'Diferença')}</td>
            <td className={`px-4 py-2 text-right tabular-nums font-semibold ${diff === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCents(diff)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
