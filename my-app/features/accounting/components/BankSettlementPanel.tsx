import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { StandardPagination } from '../../dashboard/shared/components/StandardPagination';
import { accountingService, type BankStatement } from '../../../lib/services/accounting.service';
import {
  BANK_SETTLEMENT_METHODS,
  BANK_SETTLEMENT_STATUSES,
  bankSettlementService,
  type BankSettlementItemView,
  type BankSettlementMethod,
  type BankSettlementStatus,
  type ScanSummary,
} from '../../../lib/services/bankSettlement.service';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { Field, inputClass } from './SpedGenerationPanel';

const LIMIT = 20;
const isForbidden = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 403;
const short = (id: string | null) => (id ? `${id.slice(0, 8)}…` : '—');

/** Cor por status (item 6) — mapa fechado sobre `BANK_SETTLEMENT_STATUSES`. */
export const STATUS_TONE: Record<BankSettlementStatus, string> = {
  PENDING: 'bg-neutral-700/60 text-neutral-200',
  CONFIRMING: 'bg-amber-600/15 text-amber-300',
  CONFIRMED: 'bg-emerald-600/15 text-emerald-300',
  REJECTED: 'bg-neutral-800 text-neutral-400',
  FAILED: 'bg-red-600/15 text-red-300',
  STALE: 'bg-neutral-800 text-neutral-500 line-through',
};

/** Ações por status (itens 8–11; F-FE-BS-5 → a: `retry` sempre visível em CONFIRMING — o 400 do BE explica). */
export function actionsFor(status: BankSettlementStatus): Array<'confirm' | 'reject' | 'retry'> {
  if (status === 'PENDING') return ['confirm', 'reject'];
  if (status === 'FAILED' || status === 'CONFIRMING') return ['retry'];
  return [];
}

type Action = { type: 'confirm' | 'reject' | 'retry'; item: BankSettlementItemView };

export interface BankSettlementPanelProps {
  unitId: string;
  /** Conta bancária do seletor compartilhado da Conciliação. */
  glAccountId: string;
  /** O confirm posta lançamentos → refetch do balancete (padrão D5/W1). */
  onLedgerChange?: () => void;
}

/**
 * "Baixas por retorno" (FE-INCR-BANK-SETTLEMENT, BRIEF §1) — 3ª sub-aba da Conciliação (F-FE-BS-1 → a). Para o
 * extrato escolhido: varre (`/scan`, idempotente), lista os itens de baixa paginados (default PENDING, F-FE-BS-3
 * → a) e, um por vez (F-FE-BS-2 → a), confirma com `method`, rejeita com motivo ou reprocessa. O encargo sem
 * conta configurada é o 400 nomeado do BE, mostrado íntegro com o path de configuração (F-FE-BS-4 → a). É a tabela
 * IRMÃ da "Fila pendente" (C7), não a mesma (R9). Um 403 na lista mostra o aviso e nada mais.
 */
export function BankSettlementPanel({ unitId, glAccountId, onLedgerChange }: BankSettlementPanelProps) {
  const { t, tRef } = useAccountingT();
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [statementId, setStatementId] = useState('');
  const [status, setStatus] = useState<BankSettlementStatus | ''>('PENDING');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BankSettlementItemView[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<(ScanSummary & { at: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);

  // Item 3: extratos da conta do seletor compartilhado (o BE não filtra por conta; a tela filtra), mais recente primeiro.
  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    accountingService
      .listBankStatements(unitId, 1, 100)
      .then((r) => {
        if (cancelled) return;
        const mine = r.statements.filter((s) => !glAccountId || s.glAccountId === glAccountId);
        setStatements(mine);
        setStatementId((cur) => (mine.some((s) => s.id === cur) ? cur : mine[0]?.id ?? ''));
      })
      .catch(() => { if (!cancelled) setStatements([]); });
    return () => { cancelled = true; };
  }, [unitId, glAccountId]);

  const load = useCallback(async () => {
    if (!unitId || !statementId) { setItems([]); setTotal(0); return; }
    try {
      const r = await bankSettlementService.list(unitId, { statementId, status: status || undefined, page, limit: LIMIT });
      setItems(r.items);
      setTotal(r.total);
      setError(null);
    } catch (err: unknown) {
      if (isForbidden(err)) setForbidden(true);
      setError(resolveErrorWithCode(err, tRef.current('bankSettlement.error.load', 'Erro ao carregar as baixas.')).message);
    }
  }, [unitId, statementId, status, page, tRef]);

  useEffect(() => { void load(); }, [load]);

  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const s = await bankSettlementService.scan(unitId, statementId);
      setSummary({ ...s, at: new Date().toLocaleString('pt-BR') });
      await load();
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, t('bankSettlement.error.generic', 'Não foi possível concluir a operação.')).message);
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2 align-top';
  const smallBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700';

  if (forbidden) {
    return (
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="bank-settlement-panel">
        <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="bank-settlement-panel">
      <h3 className="mb-1 text-sm font-semibold text-neutral-200">{t('bankSettlement.title', 'Baixas por retorno bancário')}</h3>
      <p className="mb-4 text-xs text-neutral-500">{t('bankSettlement.subtitle', 'Linha do extrato → título a pagar/receber. Diferente da Fila pendente: aqui cada baixa é confirmada por você.')}</p>

      {statements.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-500">{t('bankSettlement.noStatement', 'Importe um extrato na sub-aba Extratos.')}</div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label={t('bankSettlement.statement', 'Extrato')}>
              <select value={statementId} onChange={(e) => { setStatementId(e.target.value); setPage(1); setSummary(null); }} className={inputClass}>
                {statements.map((s) => (
                  <option key={s.id} value={s.id}>{s.statementRef ?? short(s.id)} · {formatDate(s.periodStart)}–{formatDate(s.periodEnd)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('bankSettlement.filter.status', 'Status')}>
              <select value={status} onChange={(e) => { setStatus(e.target.value as BankSettlementStatus | ''); setPage(1); }} className={inputClass}>
                <option value="">{t('bankSettlement.filter.all', 'Todos')}</option>
                {BANK_SETTLEMENT_STATUSES.map((s) => <option key={s} value={s}>{t(`bankSettlement.status.${s}`, s)}</option>)}
              </select>
            </Field>
            <button type="button" onClick={() => void scan()} disabled={busy || !statementId} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
              {t('bankSettlement.scan', 'Varrer extrato')}
            </button>
          </div>

          {summary && (
            <div className="mb-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-300" data-testid="bank-settlement-summary">
              <span className="text-neutral-500">{summary.at} — </span>
              {t('bankSettlement.summary.created', 'novos')}: <strong>{summary.created}</strong> · {t('bankSettlement.summary.skipped', 'já existentes')}: <strong>{summary.skippedExisting}</strong> ·{' '}
              {t('bankSettlement.summary.ambiguous', 'ambíguos')}: <strong>{summary.ambiguous}</strong> · {t('bankSettlement.summary.none', 'sem título')}: <strong>{summary.none}</strong> ·{' '}
              {t('bankSettlement.summary.stale', 'desatualizados')}: <strong>{summary.stale}</strong>
              <p className="mt-1 text-neutral-500">{t('bankSettlement.summary.ambiguousHint', 'Ambíguo = mais de um título cabe na janela; concilie à mão na Fila pendente.')}</p>
            </div>
          )}

          {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">{t('bankSettlement.empty', 'Nenhuma baixa neste recorte — varra o extrato.')}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-neutral-400">
                    <th className={th}>{t('bankSettlement.col.date', 'Data')}</th>
                    <th className={th}>{t('bankSettlement.col.line', 'Linha do extrato')}</th>
                    <th className={`${th} text-right`}>{t('bankSettlement.col.amount', 'Valor')}</th>
                    <th className={th}>{t('bankSettlement.col.title', 'Título')}</th>
                    <th className={`${th} text-right`}>{t('bankSettlement.col.proposed', 'Proposto')}</th>
                    <th className={`${th} text-right`}>{t('bankSettlement.col.charge', 'Encargo')}</th>
                    <th className={th}>{t('bankSettlement.col.status', 'Status')}</th>
                    <th className={th}>{t('bankSettlement.col.actions', 'Ações')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} data-testid={`settlement-${it.id}`} className="border-b border-neutral-800/60 last:border-0">
                      <td className={`${td} text-xs`}>{formatDate(it.line.date)}</td>
                      <td className={`${td} text-xs`}>{it.line.description}{it.line.externalRef ? <span className="ml-1 font-mono text-neutral-500">{it.line.externalRef}</span> : null}</td>
                      <td className={`${td} text-right font-mono text-xs`}>
                        {formatCents(it.line.amountCents)}{' '}
                        <span className="text-neutral-500">{it.titleType === 'PAYABLE' ? t('bankSettlement.payment', 'pagamento') : t('bankSettlement.receipt', 'recebimento')}</span>
                      </td>
                      <td className={`${td} text-xs`}>
                        {it.title ? (
                          <>{it.title.counterpartyName} · {t('bankSettlement.due', 'vence')} {formatDate(it.title.dueDate)} · {t('bankSettlement.open', 'aberto')} {formatCents(it.title.openCents)}</>
                        ) : (
                          <span className="text-neutral-500">{t('bankSettlement.titleUnavailable', 'título indisponível')}</span>
                        )}
                      </td>
                      <td className={`${td} text-right font-mono text-xs`}>{formatCents(it.proposedCents)}</td>
                      <td className={`${td} text-right font-mono text-xs`}>
                        {it.chargeCents > 0 ? (
                          <span className="rounded-full bg-amber-600/15 px-2 py-0.5 text-amber-300" title={t('bankSettlement.chargeHint', '|linha| − saldo, limite de 20%')}>{formatCents(it.chargeCents)}</span>
                        ) : '—'}
                      </td>
                      <td className={`${td} text-xs`}>
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_TONE[it.status]}`} title={it.status === 'STALE' ? t('bankSettlement.staleHint', 'Título cancelado ou já baixado depois da varredura — varra de novo para reavaliar a linha.') : undefined}>
                          {t(`bankSettlement.status.${it.status}`, it.status)}
                        </span>
                        {it.status === 'FAILED' && <div className="mt-1 text-red-300">{it.failedStep} — {it.reason}</div>}
                        {it.status === 'REJECTED' && it.reason && <div className="mt-1 text-neutral-400">{it.reason}</div>}
                        {it.status === 'CONFIRMED' && (
                          <div className="mt-1 text-neutral-400">
                            {it.confirmedAt ? new Date(it.confirmedAt).toLocaleString('pt-BR') : ''} · <span title={it.settlementId ?? ''}>{t('bankSettlement.entry', 'lançamento')} {short(it.settlementId)}</span>
                            {it.chargeEntryId && <> · <span title={it.chargeEntryId}>{t('bankSettlement.chargeEntry', 'encargo')} {short(it.chargeEntryId)}</span></>}
                          </div>
                        )}
                      </td>
                      <td className={td}>
                        <div className="flex gap-1.5">
                          {actionsFor(it.status).map((a) => (
                            <button key={a} type="button" onClick={() => setAction({ type: a, item: it })} className={smallBtn}>
                              {t(`bankSettlement.action.${a}`, a === 'confirm' ? 'Confirmar' : a === 'reject' ? 'Rejeitar' : 'Reprocessar')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > LIMIT && (
            <StandardPagination currentPage={page} totalPages={Math.ceil(total / LIMIT)} totalItems={total} itemsPerPage={LIMIT} onPageChange={setPage} />
          )}
        </>
      )}

      {action && (
        <ActionModal
          unitId={unitId}
          action={action}
          onClose={() => setAction(null)}
          onDone={(ledgerChanged) => { setAction(null); void load(); if (ledgerChanged) onLedgerChange?.(); }}
          onStale={() => void load()}
        />
      )}
    </section>
  );
}

/** Itens 8–10: confirmar/reprocessar (com `method`) e rejeitar (com motivo), um item por vez. */
function ActionModal({
  unitId,
  action,
  onClose,
  onDone,
  onStale,
}: {
  unitId: string;
  action: Action;
  onClose: () => void;
  onDone: (ledgerChanged: boolean) => void;
  onStale: () => void;
}) {
  const { t } = useAccountingT();
  const [method, setMethod] = useState<BankSettlementMethod>('Pix');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { item, type } = action;
  const isReject = type === 'reject';
  const valid = isReject ? reason.trim().length >= 1 && reason.trim().length <= 500 : true;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (type === 'confirm') await bankSettlementService.confirm(item.id, { unitId, method });
      else if (type === 'retry') await bankSettlementService.retry(item.id, { unitId, method });
      else await bankSettlementService.reject(item.id, { unitId, reason: reason.trim() });
      onDone(!isReject);
    } catch (err: unknown) {
      const { message } = resolveErrorWithCode(err, t('bankSettlement.error.generic', 'Não foi possível concluir a operação.'));
      setError(message);
      if (/não está PENDING/i.test(message)) onStale(); // CAS perdido: outra sessão mexeu no item
    } finally {
      setBusy(false);
    }
  }

  const title = type === 'confirm' ? t('bankSettlement.action.confirm', 'Confirmar') : type === 'retry' ? t('bankSettlement.action.retry', 'Reprocessar') : t('bankSettlement.action.reject', 'Rejeitar');
  return (
    <Modal
      isOpen
      onClose={() => { if (!busy) onClose(); }}
      title={title}
      maxWidth="max-w-lg"
      themeColor={isReject ? 'bg-red-600' : 'bg-emerald-600'}
      footer={
        <button type="button" onClick={() => void submit()} disabled={busy || !valid} className={`rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${isReject ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
          {title}
        </button>
      }
    >
      <div className="space-y-3 px-6 py-5 text-sm text-neutral-300">
        <p className="text-xs">
          {formatDate(item.line.date)} · {item.line.description} · {formatCents(item.line.amountCents)} → {item.title?.counterpartyName ?? '—'} ·{' '}
          {t('bankSettlement.col.proposed', 'Proposto')} {formatCents(item.proposedCents)}{item.chargeCents > 0 ? ` · ${t('bankSettlement.col.charge', 'Encargo')} ${formatCents(item.chargeCents)}` : ''}
        </p>
        {isReject ? (
          <Field label={t('bankSettlement.reason', 'Motivo (obrigatório)')}>
            <textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} className={inputClass} />
            <span className="text-neutral-500">{reason.length}/500</span>
          </Field>
        ) : (
          <Field label={t('bankSettlement.method', 'Meio de pagamento')}>
            <select value={method} onChange={(e) => setMethod(e.target.value as BankSettlementMethod)} className={inputClass}>
              {BANK_SETTLEMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-neutral-500">{t('bankSettlement.methodHint', 'O método tem de resolver para a conta deste extrato.')}</span>
          </Field>
        )}
        {error && (
          <div role="alert" className="space-y-1 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            <p>{error}</p>
            {error.startsWith('charge_account_not_configured') && (
              <p>{t('bankSettlement.chargeAccountHint', 'Configure a conta de encargo em PUT /api/accounting/settings (ainda sem tela; os códigos são pendência do contador).')}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
