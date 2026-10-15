import { useCallback, useEffect, useRef, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import {
  RECONCILE_PENDING_REASON_CODES,
  reconcilePendingService,
  type ReconcilePendingReasonCode,
} from '../../../lib/services/reconcilePending.service';
import type { ReconcilePendingItemViewDtoInput } from '@/types/contracts/accounting/ReconcilePendingDto.gen';
import { notify } from '../../../lib/notifications/notify';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

const isForbidden = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 403;
const when = (iso: string) => new Date(iso).toLocaleString('pt-BR');

/** Rótulo do motivo; um código que esta tela ainda não conhece (deploy fora de sincronia) aparece cru, sem derrubar a aba. */
function reasonLabel(t: (key: string, fallback: string) => string, code: string): string {
  const known = (REASON_LABELS as Record<string, { key: string; fallback: string } | undefined>)[code];
  return known ? t(known.key, known.fallback) : code;
}

/**
 * Rótulo por motivo (item 18–19). Fechado sobre o enum do contrato gerado: um código novo sem rótulo quebra o tsc.
 * `NO_MAPPER_FOR_UNIT` nomeia as duas causas do F-I5-3 (a) sem afirmar qual.
 */
export const REASON_LABELS: Record<ReconcilePendingReasonCode, { key: string; fallback: string }> = {
  FAILED: { key: 'pendencias.reason.FAILED', fallback: 'Falha não classificada' },
  ACCOUNTING_PERIOD_NOT_OPEN: {
    key: 'pendencias.reason.ACCOUNTING_PERIOD_NOT_OPEN',
    fallback: 'Período contábil não está aberto — abra o período; depois, Re-varrer',
  },
  MAX_CENTS_EXCEEDED: { key: 'pendencias.reason.MAX_CENTS_EXCEEDED', fallback: 'Valor acima do teto — corrija o valor na origem' },
  OPENING_ENTRY_MISSING: { key: 'pendencias.reason.OPENING_ENTRY_MISSING', fallback: 'Aguardando o lançamento de abertura da venda' },
  MISSING_PAID_WITH_PACKAGE_ID: {
    key: 'pendencias.reason.MISSING_PAID_WITH_PACKAGE_ID',
    fallback: 'Consumo de pacote sem o pacote de origem registrado',
  },
  NO_MAPPER_FOR_UNIT: {
    key: 'pendencias.reason.NO_MAPPER_FOR_UNIT',
    fallback:
      'Sem regra contábil para este evento nesta unidade — ative a contabilidade da unidade ou recompile o binding; depois, Re-varrer',
  },
  PACKAGE_CONSUMPTION_PENDING: { key: 'pendencias.reason.PACKAGE_CONSUMPTION_PENDING', fallback: 'Aguardando o débito do consumo do pacote' },
  PACKAGE_ORIGIN_REVERSED: { key: 'pendencias.reason.PACKAGE_ORIGIN_REVERSED', fallback: 'A venda de origem do pacote foi estornada' },
  PACKAGE_EXPIRY_NFSE_PENDING: {
    key: 'pendencias.reason.PACKAGE_EXPIRY_NFSE_PENDING',
    fallback: 'Falta dado para a NFS-e do pacote vencido',
  },
  UNKNOWN_EVENT_KEY: {
    key: 'pendencias.reason.UNKNOWN_EVENT_KEY',
    fallback: 'Evento que nenhum kit de setor declara — erro de quem emite o evento; acione o suporte',
  },
};

export interface ReconcilePendingPanelProps {
  unitId: string;
}

/**
 * Aba "Pendências" (BE-INCR-ONBOARDING-ACTIVATION item 18, F-I5-2 b + F-I5-4 a) — a linha visível de
 * `reconcile_pending_items` da unidade: filtro por motivo e "mostrar resolvidas", paginação por cursor e "Re-varrer"
 * (o único caminho de tela para uma `NO_MAPPER_FOR_UNIT` resolvida pela ativação da LAC-B sair da lista).
 *
 * Paginação: o BE é keyset (`nextCursor`), e o `StandardPagination` é por número de página (precisa de `total` e
 * salto para a página N, que o keyset não tem) — divergência de SHAPE pelo critério de reuso; aqui é "Carregar mais".
 */
export function ReconcilePendingPanel({ unitId }: ReconcilePendingPanelProps) {
  const { t, tRef } = useAccountingT();
  const [reasonCode, setReasonCode] = useState<ReconcilePendingReasonCode | ''>('');
  const [includeResolved, setIncludeResolved] = useState(false);
  const [items, setItems] = useState<ReconcilePendingItemViewDtoInput[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  // Só a requisição mais recente escreve na lista: resposta de filtro/página anterior é descartada (review do #686, B).
  const lastRequest = useRef(0);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const requestId = ++lastRequest.current;
      const q = {
        unitId,
        ...(reasonCode ? { reasonCode } : {}),
        ...(includeResolved ? { includeResolved: true } : {}),
        ...(cursor ? { cursor } : {}),
      };
      try {
        const page = await reconcilePendingService.list(q);
        if (requestId !== lastRequest.current) return;
        setItems((prev) => (cursor ? [...prev, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
        setError(null);
        setLoaded(true);
      } catch (err: unknown) {
        if (requestId !== lastRequest.current) return;
        if (isForbidden(err)) setForbidden(true);
        setError(resolveErrorWithCode(err, tRef.current('pendencias.error.load', 'Erro ao carregar as pendências.')).message);
      }
    },
    [unitId, reasonCode, includeResolved, tRef],
  );

  useEffect(() => {
    if (unitId) void fetchPage();
  }, [unitId, fetchPage]);

  async function rescan() {
    setBusy(true);
    setError(null);
    try {
      const r = await reconcilePendingService.rescan({ unitId });
      notify(
        `${r.attempted} ${t('pendencias.summary.attempted', 'tentada(s)')} · ${r.resolved} ${t('pendencias.summary.resolved', 'resolvida(s)')} · ` +
          `${r.stillPending} ${t('pendencias.summary.stillPending', 'ainda pendente(s)')}`,
        'success',
        t('pendencias.title', 'Pendências'),
      );
      await fetchPage();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('pendencias.error.rescan', 'Não foi possível re-varrer as pendências.')).message);
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2 align-top text-xs';
  const errorBox = error && (
    <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
  );

  if (forbidden) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="reconcile-pending-panel">
        {errorBox}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="reconcile-pending-panel">
      <h3 className="mb-1 text-sm font-semibold text-neutral-200">{t('pendencias.title', 'Pendências')}</h3>
      <p className="mb-4 text-xs text-neutral-500">
        {t(
          'pendencias.subtitle',
          'Eventos que a contabilidade automática não conseguiu lançar nesta unidade. Resolva a causa e use Re-varrer.',
        )}
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Field label={t('pendencias.filter.reason', 'Motivo')}>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as ReconcilePendingReasonCode | '')} // ponytail: o <select> só tem as opções do enum
            className={inputClass}
          >
            <option value="">{t('pendencias.filter.all', 'Todos')}</option>
            {RECONCILE_PENDING_REASON_CODES.map((code) => (
              <option key={code} value={code}>{t(REASON_LABELS[code].key, REASON_LABELS[code].fallback)}</option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-xs text-neutral-400">
          <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
          {t('pendencias.filter.includeResolved', 'Mostrar resolvidas')}
        </label>
        <button
          type="button"
          onClick={() => void rescan()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <FiRefreshCw size={14} /> {t('pendencias.rescan', 'Re-varrer')}
        </button>
      </div>

      {errorBox}

      {loaded && !error && items.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">{t('pendencias.empty', 'Nenhuma pendência nesta unidade.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('pendencias.col.source', 'Origem')}</th>
                <th className={th}>{t('pendencias.col.id', 'Id')}</th>
                <th className={th}>{t('pendencias.col.reason', 'Motivo')}</th>
                <th className={th}>{t('pendencias.col.detail', 'Detalhe')}</th>
                <th className={th}>{t('pendencias.col.firstSeen', 'Primeira vez')}</th>
                <th className={th}>{t('pendencias.col.lastSeen', 'Última vez')}</th>
                <th className={`${th} text-right`}>{t('pendencias.col.attempts', 'Tentativas')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} data-testid={`pending-${it.id}`} className="border-b border-neutral-800/60 last:border-0">
                  <td className={`${td} font-mono`}>{it.sourceType}</td>
                  <td className={`${td} font-mono`}>{it.sourceId}</td>
                  <td className={td}>
                    {reasonLabel(t, it.reasonCode)}
                    {it.resolvedAt && (
                      <div className="mt-1 text-emerald-300">
                        {t('pendencias.resolvedAt', 'Resolvida em {{when}}', { when: when(it.resolvedAt) })}
                      </div>
                    )}
                  </td>
                  <td className={`${td} text-neutral-400`}>{it.reasonDetail}</td>
                  <td className={td}>{when(it.firstSeenAt)}</td>
                  <td className={td}>{when(it.lastSeenAt)}</td>
                  <td className={`${td} text-right font-mono`}>{it.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchPage(nextCursor)}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700"
          >
            {t('pendencias.loadMore', 'Carregar mais')}
          </button>
        </div>
      )}
    </section>
  );
}
