import { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiArchive, FiEdit2, FiLock, FiPlusCircle, FiUnlock } from 'react-icons/fi';
import {
  LALUR_QUARTERS,
  lalurService,
  type LalurParteBAccount,
  type LalurParteBBalancesDiagnostic,
  type LalurParteBMovement,
  type LalurQuarter,
} from '../../../lib/services/lalur.service';
import { Modal } from '../../../components/ui/Modal';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatCents } from '../lib/formatCents';
import { formatDateNumericBR } from '@/features/dashboard/shared/utils/formatters';
import { inputClass } from './SpedGenerationPanel';
import { LalurMovementModal } from './LalurMovementModal';

type Period = LalurParteBBalancesDiagnostic['periods'][number];
type ClosingAction = { kind: 'close' | 'reopen'; quarter: LalurQuarter };

const isForbidden = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 403;
/** Diagnóstico vem em string (BigInt seguro no JSON), centavos com sinal. */
const cents = (s: string | undefined) => (s === undefined ? '—' : formatCents(Number(s)));
const BALANCE_FIELDS = ['sdIni', 'vlA', 'vlB', 'sdFim'] as const;

/**
 * Ordem limpa do fechamento (`LalurParteBPeriodSchema`): fechar Tn exige Tn-1 fechado (ou Tn = T01);
 * reabrir Tn exige nenhum Tk>n fechado. A tela só antecipa — o servidor é a autoridade e o 400 aparece
 * íntegro se o estado local estiver velho.
 */
export function closingRules(periods: Pick<Period, 'quarter' | 'closed'>[]) {
  const closed = (q: LalurQuarter) => periods.some((p) => p.quarter === q && p.closed);
  return {
    closed,
    canClose: (q: LalurQuarter) => {
      const i = LALUR_QUARTERS.indexOf(q);
      return !closed(q) && (i === 0 || closed(LALUR_QUARTERS[i - 1]));
    },
    canReopen: (q: LalurQuarter) => closed(q) && LALUR_QUARTERS.slice(LALUR_QUARTERS.indexOf(q) + 1).every((k) => !closed(k)),
  };
}

export interface LalurParteBMovementsSectionProps {
  unitId: string;
  /** Exercício inicial (o do painel); a seção tem o próprio filtro de exercício. */
  initialYear: number;
  /** Contas da Parte B do painel (vivas e arquivadas). */
  parteBAccounts: LalurParteBAccount[];
  readOnly: boolean;
  onForbidden: () => void;
  /** Aviso X4-14 → filtrar o ajuste na Parte A. */
  onShowEntry: (entryId: string, year: number) => void;
}

/**
 * Movimentos da Parte B (M410), fechamento trimestral e diagnóstico de saldos — FE-INCR-LALUR-PR2
 * (PLANO-ONDA1 §4.1 itens 2 e 6–10; F-FE-L2-2 → a: o diagnóstico fica sempre visível, sem clique extra).
 * O diagnóstico recarrega depois de criar, editar, arquivar, fechar e reabrir (item 9). Os avisos
 * `M312_MISSING_FOR_PARTIAL_ADJUSTMENT` são AVISO, nunca erro (X4-14: a igualdade exata só o PVA fecha).
 */
export function LalurParteBMovementsSection({ unitId, initialYear, parteBAccounts, readOnly, onForbidden, onShowEntry }: LalurParteBMovementsSectionProps) {
  const { t, tRef } = useAccountingT();
  const [year, setYear] = useState(initialYear);
  const [quarterFilter, setQuarterFilter] = useState<LalurQuarter | ''>('');
  const [contaFilter, setContaFilter] = useState('');
  const [movements, setMovements] = useState<LalurParteBMovement[]>([]);
  const [diag, setDiag] = useState<LalurParteBBalancesDiagnostic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: LalurParteBMovement | null }>({ open: false, editing: null });
  const [toArchive, setToArchive] = useState<LalurParteBMovement | null>(null);
  const [closing, setClosing] = useState<ClosingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onError = useCallback((err: unknown, fallback: string) => {
    if (isForbidden(err)) onForbidden();
    setError(resolveError(err, fallback));
  }, [onForbidden]);

  const fetchMovements = useCallback(async () => {
    if (!unitId) return;
    try {
      setMovements(await lalurService.listMovements({ unitId, year, quarter: quarterFilter || undefined, parteBId: contaFilter || undefined }));
    } catch (err: unknown) {
      onError(err, tRef.current('lalur.movements.error.load', 'Erro ao carregar os movimentos da Parte B.'));
    }
  }, [unitId, year, quarterFilter, contaFilter, tRef, onError]);

  const fetchDiag = useCallback(async () => {
    if (!unitId) return;
    try {
      setDiag(await lalurService.getParteBBalances(unitId, year));
    } catch (err: unknown) {
      onError(err, tRef.current('lalur.diagnostic.error.load', 'Erro ao carregar o diagnóstico de saldos.'));
    }
  }, [unitId, year, tRef, onError]);

  useEffect(() => { void fetchMovements(); }, [fetchMovements]);
  useEffect(() => { void fetchDiag(); }, [fetchDiag]);

  const reloadAll = () => { void fetchMovements(); void fetchDiag(); };

  async function runArchive() {
    if (!toArchive) return;
    setBusy(true);
    setActionError(null);
    try {
      await lalurService.archiveMovement(toArchive.id, unitId);
      setToArchive(null);
      reloadAll();
    } catch (err: unknown) {
      if (isForbidden(err)) onForbidden();
      setActionError(resolveError(err, t('lalur.error.archive', 'Não foi possível arquivar.')));
    } finally {
      setBusy(false);
    }
  }

  async function runClosing() {
    if (!closing) return;
    setBusy(true);
    setActionError(null);
    try {
      if (closing.kind === 'close') await lalurService.closeParteB(unitId, year, closing.quarter);
      else await lalurService.reopenParteB(unitId, year, closing.quarter);
      setClosing(null);
      reloadAll();
    } catch (err: unknown) {
      if (isForbidden(err)) onForbidden();
      setActionError(resolveError(err, t('lalur.closing.error', 'Não foi possível concluir a operação no trimestre.')));
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map(parteBAccounts.map((a) => [a.id, a]));
  const periods = diag?.periods ?? [];
  const rules = closingRules(periods);
  const yearOptions = Array.from({ length: initialYear - 2015 + 1 }, (_, i) => initialYear - i);
  const selectClass = `${inputClass} py-1.5 text-xs`;
  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mb-8" data-testid="lalur-parte-b-movements">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-300">{t('lalur.movements.heading', 'Movimentos da Parte B (M410)')}</h3>
        {!readOnly && (
          <button type="button" onClick={() => setModal({ open: true, editing: null })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
            <FiPlusCircle size={14} />
            {t('lalur.movements.new', 'Novo movimento')}
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select aria-label={t('lalur.movements.filter.year', 'Exercício dos movimentos')} value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label={t('lalur.movements.filter.quarter', 'Trimestre dos movimentos')} value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value as LalurQuarter | '')} className={selectClass}>
          <option value="">{t('lalur.entry.filter.allQuarters', 'Todos os trimestres')}</option>
          {LALUR_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        <select aria-label={t('lalur.movements.filter.conta', 'Conta da Parte B')} value={contaFilter} onChange={(e) => setContaFilter(e.target.value)} className={selectClass}>
          <option value="">{t('lalur.movements.filter.allContas', 'Todas as contas')}</option>
          {parteBAccounts.map((a) => <option key={a.id} value={a.id}>{a.codCtaB} ({a.codTributo})</option>)}
        </select>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* ── Movimentos ───────────────────────────────────────────────────────── */}
      {movements.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">{t('lalur.movements.empty', 'Nenhum movimento da Parte B neste recorte.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('lalur.entry.col.quarter', 'Trim.')}</th>
                <th className={th}>{t('lalur.movements.col.conta', 'Conta')}</th>
                <th className={th}>{t('lalur.movements.col.indicador', 'Ind.')}</th>
                <th className={`${th} text-right`}>{t('lalur.entry.col.valor', 'Valor')}</th>
                <th className={th}>{t('lalur.movements.col.contrapartida', 'Contrapartida')}</th>
                <th className={th}>{t('lalur.entry.col.hist', 'Histórico')}</th>
                <th className={th}>{t('lalur.movements.col.indLanAnt', 'Lanç. ant.')}</th>
                <th className={th}>{t('lalur.movements.col.origem', 'Origem')}</th>
                <th className={th}>{t('lalur.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const archived = m.deletedAt !== null;
                const conta = byId.get(m.parteBId);
                const ctp = m.contrapartidaId ? byId.get(m.contrapartidaId) : undefined;
                return (
                  <tr key={m.id} className={`border-b border-neutral-800/60 last:border-0 ${archived ? 'opacity-50' : ''}`}>
                    <td className={td}>{m.quarter}</td>
                    <td className={`${td} font-mono text-xs text-neutral-100`}>{conta?.codCtaB ?? m.parteBId}</td>
                    <td className={td} title={t(`lalur.movements.indicador.${m.indicador}`, m.indicador)}>{m.indicador}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{formatCents(m.valorCents)}</td>
                    <td className={`${td} font-mono text-xs text-neutral-400`}>{ctp?.codCtaB ?? (m.contrapartidaId ? m.contrapartidaId : <span className="text-neutral-600">—</span>)}</td>
                    <td className={`${td} max-w-[16rem] truncate text-xs text-neutral-400`} title={m.historico}>{m.historico}</td>
                    <td className={td}>{m.indLanAnt}</td>
                    <td className={`${td} text-xs`}>{t(`lalur.movements.origem.${m.origem}`, m.origem)}</td>
                    <td className={td}>
                      {!archived && !readOnly && (
                        <div className="flex gap-1.5">
                          {m.origem === 'user' && (
                            <button type="button" onClick={() => setModal({ open: true, editing: m })} className={smallBtn}>
                              <FiEdit2 size={11} /> {t('lalur.action.edit', 'Editar')}
                            </button>
                          )}
                          <button type="button" onClick={() => { setActionError(null); setToArchive(m); }} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}>
                            <FiArchive size={11} /> {t('lalur.action.archive', 'Arquivar')}
                          </button>
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

      {/* ── Fechamento do trimestre ──────────────────────────────────────────── */}
      <div className="mt-6" data-testid="lalur-closing">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('lalur.closing.heading', 'Fechamento do trimestre — {{year}}', { year })}</h4>
        <div className="flex flex-wrap gap-2">
          {LALUR_QUARTERS.map((q) => {
            const p = periods.find((x) => x.quarter === q);
            const isClosed = rules.closed(q);
            return (
              <div key={q} data-testid={`lalur-closing-${q}`} data-closed={isClosed} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${isClosed ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-neutral-800 bg-neutral-900 text-neutral-300'}`}>
                <span className="font-semibold">{q}</span>
                <span>{isClosed ? t('lalur.closing.closed', 'fechado') : t('lalur.closing.open', 'aberto')}</span>
                {isClosed && p?.closedAt && <span className="text-neutral-400">{formatDateNumericBR(p.closedAt) /* timestamp: UTC→local, nunca slice (classe date-only-utc-shift) */}</span>}
                {!readOnly && !isClosed && (
                  <button type="button" disabled={!rules.canClose(q)} onClick={() => { setActionError(null); setClosing({ kind: 'close', quarter: q }); }} className={smallBtn}>
                    <FiLock size={11} /> {t('lalur.closing.close', 'Fechar {{q}}', { q })}
                  </button>
                )}
                {!readOnly && isClosed && (
                  <button type="button" disabled={!rules.canReopen(q)} onClick={() => { setActionError(null); setClosing({ kind: 'reopen', quarter: q }); }} className={smallBtn}>
                    <FiUnlock size={11} /> {t('lalur.closing.reopen', 'Reabrir {{q}}', { q })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Avisos (X4-14) ───────────────────────────────────────────────────── */}
      {diag && diag.warnings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200" data-testid="lalur-warnings">
          <div className="mb-2 flex items-center gap-2 font-semibold"><FiAlertTriangle size={14} /> {t('lalur.diagnostic.warnings', 'Avisos — a igualdade exata só o PVA fecha')}</div>
          <ul className="space-y-1.5 text-xs">
            {diag.warnings.map((w) => (
              <li key={`${w.entryId}:${w.quarter}`}>
                <span className="font-mono">{w.quarter} · {w.codigo}</span> — {w.message}{' '}
                <button type="button" onClick={() => onShowEntry(w.entryId, year)} className="underline">
                  {t('lalur.diagnostic.showEntry', 'Ver o ajuste na Parte A')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Diagnóstico de saldos ────────────────────────────────────────────── */}
      <div className="mt-6" data-testid="lalur-diagnostic">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('lalur.diagnostic.heading', 'Diagnóstico de saldos — materializado × recomputado')}</h4>
        {diag && diag.divergences.length > 0 && (
          <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            <p className="mb-1 font-semibold">{t('lalur.diagnostic.divergences', 'Divergências entre o saldo materializado e o recomputado')}</p>
            <ul className="space-y-0.5">
              {diag.divergences.map((d) => (
                <li key={`${d.quarter}:${d.codCtaB}:${d.codTributo}:${d.field}`} className="font-mono">
                  {d.quarter} · {d.codCtaB} ({d.codTributo}) · {d.field}: {cents(d.materialized)} ≠ {cents(d.recomputed)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {periods.every((p) => p.accounts.length === 0) ? (
          <div className="py-4 text-center text-sm text-neutral-500">{t('lalur.diagnostic.empty', 'Sem saldos da Parte B neste exercício.')}</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-400">
                  <th className={th}>{t('lalur.entry.col.quarter', 'Trim.')}</th>
                  <th className={th}>{t('lalur.movements.col.conta', 'Conta')}</th>
                  {BALANCE_FIELDS.map((f) => <th key={f} className={`${th} text-right`}>{t(`lalur.diagnostic.field.${f}`, f)}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.flatMap((p) =>
                  p.accounts.map((a) => (
                    <tr key={`${p.quarter}:${a.parteBId}`} data-divergent={a.divergent} className={`border-b border-neutral-800/60 last:border-0 ${a.divergent ? 'bg-red-950/30 text-red-300' : ''}`}>
                      <td className={td}>{p.quarter}</td>
                      <td className={`${td} font-mono text-xs`}>{a.codCtaB} ({a.codTributo})</td>
                      {BALANCE_FIELDS.map((f) => (
                        <td key={f} className={`${td} text-right font-mono text-xs`}>
                          <div>{cents(a.recomputed[f])}</div>
                          {a.materialized && (
                            <div className="text-neutral-500" title={t('lalur.diagnostic.materialized', 'materializado')}>{cents(a.materialized[f])}</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-neutral-500">{t('lalur.diagnostic.legend', 'Linha de cima: recomputado a partir dos lançamentos. Linha de baixo (trimestres fechados): materializado no fechamento.')}</p>
          </div>
        )}
      </div>

      <LalurMovementModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        unitId={unitId}
        year={year}
        parteBAccounts={parteBAccounts}
        editing={modal.editing}
        onSuccess={reloadAll}
        onForbidden={onForbidden}
      />

      <Modal
        isOpen={!!toArchive}
        onClose={() => { if (!busy) setToArchive(null); }}
        title={t('lalur.movements.archiveTitle', 'Arquivar movimento da Parte B')}
        themeColor="bg-amber-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setToArchive(null); }} disabled={busy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
              {t('lalur.archiveModal.cancel', 'Voltar')}
            </button>
            <button onClick={() => void runArchive()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
              {busy ? t('lalur.archiveModal.archiving', 'Arquivando…') : t('lalur.archiveModal.confirm', 'Confirmar arquivamento')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toArchive && (
            <p><span className="font-mono font-semibold text-neutral-100">{byId.get(toArchive.parteBId)?.codCtaB ?? toArchive.parteBId}</span> — {toArchive.indicador} · {toArchive.quarter}/{toArchive.year} · {formatCents(toArchive.valorCents)}</p>
          )}
          <p className="text-neutral-400">{t('lalur.archiveModal.note', 'O registro sai da ECF e o código fica livre para novo cadastro. Nada é apagado.')}</p>
          {actionError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{actionError}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={!!closing}
        onClose={() => { if (!busy) setClosing(null); }}
        title={closing?.kind === 'reopen' ? t('lalur.closing.reopenTitle', 'Reabrir {{q}}/{{year}}', { q: closing?.quarter, year }) : t('lalur.closing.closeTitle', 'Fechar {{q}}/{{year}}', { q: closing?.quarter, year })}
        themeColor="bg-amber-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setClosing(null); }} disabled={busy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
              {t('lalur.archiveModal.cancel', 'Voltar')}
            </button>
            <button onClick={() => void runClosing()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
              {busy ? t('lalur.closing.running', 'Processando…') : t('lalur.closing.confirm', 'Confirmar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          <p>
            {closing?.kind === 'reopen'
              ? t('lalur.closing.reopenEffect', 'Reabrir apaga a materialização do M500 deste trimestre (e o PF/BC derivado). Só é permitido se nenhum trimestre posterior estiver fechado.')
              : t('lalur.closing.closeEffect', 'Fechar materializa o M500 do trimestre e deriva o PF/BC. Exige o trimestre anterior fechado.')}
          </p>
          {actionError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{actionError}</div>}
        </div>
      </Modal>
    </div>
  );
}
