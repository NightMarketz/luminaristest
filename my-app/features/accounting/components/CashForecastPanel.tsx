import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  accountingService,
  type CashForecastReport,
  type CashForecastLine,
  type CashForecastDocumentLine,
} from '../../../lib/services/accounting.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveError } from '../lib/resolveError';

interface Props {
  unitId: string;
}

/**
 * CashForecastPanel — fluxo de caixa PROJETADO (read-only), horizonte fixo de 90 dias a partir de
 * `asOf` (FE-INCR-CASH-FORECAST, `docs/accounting/FE-INCR-CASH-FORECAST-brief.md`). Clona a
 * estrutura de controles/estado de `AgingPanel.tsx` (data-base + botão "Gerar"; sem toggle de
 * `kind` — o forecast sempre mistura AP e AR, F-CF5→a) e o padrão de tabela + drill sempre
 * expandido (F-CF9→a, mesma convenção visual de `AgingPanel`'s `GroupRows`).
 *
 * NÃO É O `DFCPanel` (histórico, `year_to_date`) — aba própria (F-CF7→a), namespace i18n
 * `cashForecast.*` distinto de `cashFlow.*` (achado 10 do BRIEF).
 */
export function CashForecastPanel({ unitId }: Props) {
  const { t } = useTranslation('accounting');
  // Campo não tocado ⇒ `asOf` omitido e o backend decide "hoje" via `scopeToday` (fuso do
  // escopo) — mesmo padrão do AgingPanel (nunca derivar "hoje" no FE via UTC).
  const [asOf, setAsOf] = useState('');
  const [asOfTouched, setAsOfTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CashForecastReport | null>(null);

  async function generate() {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await accountingService.getCashForecast({
        unitId,
        asOf: asOfTouched && asOf ? asOf : undefined,
      });
      setReport(next);
      if (!asOfTouched) setAsOf(next.asOf); // exibe o dia que o backend usou
    } catch (err: unknown) {
      setError(resolveError(err, t('cashForecast.error.load', 'Erro ao carregar o fluxo de caixa projetado.')));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-neutral-200">{t('cashForecast.title', 'Fluxo de Caixa Projetado')}</h2>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            {t('cashForecast.controls.asOf', 'Data-base')}
          </span>
          <input
            type="date"
            value={asOf}
            onChange={(e) => {
              setAsOf(e.target.value);
              setAsOfTouched(true);
            }}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || (asOfTouched && !asOf)}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? t('cashForecast.controls.generating', 'Gerando…') : t('cashForecast.controls.generate', 'Gerar')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {!report && !loading && !error && (
        <div className="py-12 text-center text-neutral-500">
          {t('cashForecast.empty', 'Selecione a data-base e clique em "Gerar" para visualizar a projeção de caixa.')}
        </div>
      )}

      {report && <CashForecastReportView report={report} />}
    </div>
  );
}

function CashForecastReportView({ report }: { report: CashForecastReport }) {
  const { t } = useTranslation('accounting');
  const totalNet = parseInt(report.totalNetCents, 10);

  return (
    <div className="space-y-5">
      {/* Sumário — saldo inicial + totais do horizonte */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label={t('cashForecast.summary.openingBalance', 'Saldo inicial')} cents={parseInt(report.openingBalanceCents, 10)} />
        <SummaryTile label={t('cashForecast.summary.totalInflow', 'Total a receber')} cents={parseInt(report.totalInflowCents, 10)} tone="positive" />
        <SummaryTile label={t('cashForecast.summary.totalOutflow', 'Total a pagar')} cents={parseInt(report.totalOutflowCents, 10)} tone="negative" />
        <SummaryTile label={t('cashForecast.summary.totalNet', 'Líquido do horizonte')} cents={totalNet} tone={totalNet < 0 ? 'negative' : 'positive'} />
      </div>

      <CashForecastTable lines={report.lines} />
    </div>
  );
}

function SummaryTile({
  label,
  cents,
  tone,
}: {
  label: string;
  cents: number;
  tone?: 'positive' | 'negative';
}) {
  const colorClass =
    tone === 'negative' && cents < 0
      ? 'text-red-400'
      : tone === 'positive'
        ? 'text-emerald-400'
        : 'text-neutral-100';
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${colorClass}`}>{formatCents(cents)}</p>
    </div>
  );
}

// ── report table (uma linha por dia + drill por documento sempre expandido, F-CF9→a) ───────────
function CashForecastTable({ lines }: { lines: CashForecastLine[] }) {
  const { t } = useTranslation('accounting');
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/50">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-3 font-medium">{t('cashForecast.table.date', 'Dia')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('cashForecast.table.inflow', 'Entradas')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('cashForecast.table.outflow', 'Saídas')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('cashForecast.table.net', 'Líquido')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('cashForecast.table.balance', 'Saldo projetado')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <CashForecastLineRows key={line.periodStart} line={line} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashForecastLineRows({ line }: { line: CashForecastLine }) {
  const { t } = useTranslation('accounting');
  const net = parseInt(line.netCents, 10);
  const balance = parseInt(line.projectedBalanceCents, 10);
  const hasMovement = line.documents.length > 0;

  return (
    <>
      <tr className="border-b border-neutral-800/50">
        <td className="px-4 py-2 text-neutral-200">{formatDate(line.periodStart)}</td>
        <td className="px-4 py-2 text-right tabular-nums text-neutral-300">{formatCents(parseInt(line.inflowCents, 10))}</td>
        <td className="px-4 py-2 text-right tabular-nums text-neutral-300">{formatCents(parseInt(line.outflowCents, 10))}</td>
        <td className={`px-4 py-2 text-right tabular-nums font-medium ${net < 0 ? 'text-red-400' : 'text-neutral-200'}`}>
          {formatCents(net)}
        </td>
        {/* Saldo projetado negativo é destacado — é exatamente a pergunta ("vou ficar sem
            caixa?") que o produto responde (F-CF2→a). */}
        <td
          className={`px-4 py-2 text-right tabular-nums font-semibold ${
            balance < 0 ? 'text-red-400' : 'text-neutral-100'
          }`}
        >
          {formatCents(balance)}
          {balance < 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-300">
              {t('cashForecast.table.negativeBadge', 'Negativo')}
            </span>
          )}
        </td>
      </tr>
      {!hasMovement && (
        <tr className="border-b border-neutral-800/30 last:border-0">
          <td className="px-4 py-1.5 text-xs italic text-neutral-600" colSpan={5}>
            <span className="inline-block pl-6">{t('cashForecast.table.noMovement', 'Sem vencimentos neste dia.')}</span>
          </td>
        </tr>
      )}
      {/* Drill por documento (F-CF9→a: sempre expandido). */}
      {line.documents.map((doc) => (
        <CashForecastDocumentRow key={doc.id} doc={doc} />
      ))}
    </>
  );
}

function CashForecastDocumentRow({ doc }: { doc: CashForecastDocumentLine }) {
  const { t } = useTranslation('accounting');
  const isReceivable = doc.kind === 'receivable';
  return (
    <tr className="border-b border-neutral-800/30 last:border-0">
      <td className="px-4 py-1.5 text-xs text-neutral-500" colSpan={4}>
        <span className="inline-block pl-6">
          {isReceivable
            ? t('cashForecast.document.receivable', 'A receber')
            : t('cashForecast.document.payable', 'A pagar')}
          {' · '}
          {t('cashForecast.document.number', 'Documento')}: <span className="font-mono">{doc.documentNumber ?? '—'}</span>
          {' · '}
          {t('cashForecast.document.dueDate', 'Vencimento')}: {formatDate(doc.dueDate)}
        </span>
      </td>
      <td className={`px-4 py-1.5 text-right text-xs tabular-nums ${isReceivable ? 'text-emerald-500/80' : 'text-red-400/80'}`}>
        {formatCents(parseInt(doc.amountCents, 10))}
      </td>
    </tr>
  );
}
