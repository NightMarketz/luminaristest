import { useCallback, useEffect, useState } from 'react';
import { FiXCircle, FiEye } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import {
  chargeBanner,
  collectionChargesService,
  toCents,
  type CollectionChargeView,
} from '../../../lib/services/collectionCharges.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { ChargeBannerNote, ChargeInstrumentView, ChargeStatusBadge, useChargeStatusLabel } from './CollectionChargeParts';

interface ReceivableChargesDrawerProps {
  unitId: string;
  receivableId: string;
  /** O título ainda tem saldo em aberto (não RECEIVED nem CANCELLED) — decide o "aguardando confirmação" (P2-15). */
  receivableOpen: boolean;
  /** Colunas da tabela-mãe (o drawer ocupa uma linha inteira do AR). */
  colSpan: number;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
}

/**
 * Cobranças do título (FE-INCR-PAYMENT-PROVIDER item 16; F-FE-COB-3 a: carrega ao abrir; F-FE-COB-8: tabela HTML no
 * molde do painel-mãe). Cancelar só em `PENDING` com `providerRef`; o resultado pode NÃO ser `CANCELLED` (o 409 do MP
 * faz o BE aplicar o estado real). Nada aqui mexe no razão: o AR não é recarregado como mudança de razão (P2-8).
 */
export function ReceivableChargesDrawer({ unitId, receivableId, receivableOpen, colSpan }: ReceivableChargesDrawerProps) {
  const { t, tRef } = useAccountingT();
  const statusLabel = useChargeStatusLabel();
  const [charges, setCharges] = useState<CollectionChargeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<CollectionChargeView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CollectionChargeView | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCharges(await collectionChargesService.listByReceivable(receivableId, unitId));
    } catch (e) {
      setCharges([]);
      setError(resolveErrorWithCode(e, tRef.current('collectionCharge.error.load', 'Erro ao carregar as cobranças do título.')).message);
    } finally {
      setLoading(false);
    }
  }, [receivableId, unitId, tRef]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(charge: CollectionChargeView) {
    setError(null);
    try {
      setDetail(await collectionChargesService.get(charge.id, unitId));
    } catch (e) {
      setError(resolveErrorWithCode(e, t('collectionCharge.error.detail', 'Erro ao carregar a cobrança.')).message);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const after = await collectionChargesService.cancel(cancelTarget.id, { unitId });
      setCancelTarget(null);
      setNotice(
        after.status === 'CANCELLED'
          ? t('collectionCharge.cancel.done', 'Cobrança cancelada.')
          : t('collectionCharge.cancel.providerState', 'O provedor informou que a cobrança já estava {{status}}.', { status: statusLabel(after.status) }),
      );
      await load();
    } catch (e) {
      const { message, code } = resolveErrorWithCode(e, t('collectionCharge.error.cancel', 'Não foi possível cancelar a cobrança.'));
      if (code === 'CHARGE_NOT_PENDING') {
        setCancelTarget(null);
        setNotice(t('collectionCharge.cancel.notPending', 'A cobrança não está mais pendente; a lista foi atualizada.'));
        await load();
      } else {
        setCancelError(message);
      }
    } finally {
      setCancelling(false);
    }
  }

  const now = new Date();

  return (
    <tr>
      <td colSpan={colSpan} className="bg-neutral-950/60 px-6 pb-3 pt-2" data-testid={`charges-drawer-${receivableId}`}>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
          {t('collectionCharge.drawer.title', 'Cobranças do título')}
        </p>
        {notice && <p role="status" className="mb-2 rounded-xl border border-blue-900/50 bg-blue-950/30 px-3 py-2 text-xs text-blue-300">{notice}</p>}
        {error && <p className="mb-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>}
        {loading ? (
          <p className="py-3 text-center text-xs text-neutral-500">{t('collectionCharge.drawer.loading', 'Carregando cobranças…')}</p>
        ) : charges.length === 0 ? (
          <p className="py-3 text-center text-xs text-neutral-500">{t('collectionCharge.drawer.empty', 'Nenhuma cobrança emitida para este título.')}</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.kind', 'Tipo')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('collectionCharge.col.amount', 'Valor')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.expiresAt', 'Vencimento')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.status', 'Status')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.provider', 'Provedor')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.updatedAt', 'Atualizada em')}</th>
                <th className="py-1 text-right font-medium">{t('collectionCharge.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => {
                const banner = chargeBanner(c, receivableOpen, now);
                const canCancel = c.status === 'PENDING' && !!c.providerRef;
                return (
                  <tr key={c.id} className="border-t border-neutral-800/50 align-top">
                    <td className="py-1.5 pr-4 text-neutral-300">{c.kind === 'PIX' ? t('collectionCharge.kind.PIX', 'Pix') : t('collectionCharge.kind.BOLETO', 'Boleto')}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-neutral-300">{formatCents(toCents(c.amountCents))}</td>
                    <td className="py-1.5 pr-4 tabular-nums text-neutral-300">{formatDate(c.expiresAt)}</td>
                    <td className="py-1.5 pr-4">
                      <ChargeStatusBadge charge={c} receivableOpen={receivableOpen} now={now} />
                      <div className="mt-1 max-w-xs">
                        <ChargeBannerNote banner={banner} />
                      </div>
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-neutral-500">
                      {[c.providerStatus, c.providerStatusDetail].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="py-1.5 pr-4 tabular-nums text-neutral-500">{formatDateTime(c.updatedAt)}</td>
                    <td className="py-1.5">
                      <div className="flex flex-col items-end gap-1">
                        <button type="button" onClick={() => void openDetail(c)} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700">
                          <FiEye size={12} />
                          {t('collectionCharge.action.detail', 'Detalhe')}
                        </button>
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => { setCancelError(null); setCancelTarget(c); }}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium ${
                              banner === 'overdue_pending'
                                ? 'border-amber-600 bg-amber-900/40 text-amber-200 hover:bg-amber-900/60'
                                : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-red-700 hover:text-red-300'
                            }`}
                          >
                            <FiXCircle size={12} />
                            {t('collectionCharge.action.cancel', 'Cancelar cobrança')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Detalhe (F-FE-COB-4 a): último estado do provedor; pagador só para quem gere o título (F9). */}
        <Modal
          isOpen={!!detail}
          onClose={() => setDetail(null)}
          title={t('collectionCharge.detail.title', 'Cobrança')}
          themeColor="bg-emerald-600"
          maxWidth="max-w-2xl"
        >
          {detail && (
            <div className="space-y-3 px-6 py-5 text-sm text-neutral-300">
              <div className="flex flex-wrap items-center gap-2">
                <ChargeStatusBadge charge={detail} receivableOpen={receivableOpen} now={now} />
                <span className="tabular-nums">{formatCents(toCents(detail.amountCents))}</span>
                <span className="text-xs text-neutral-500">{t('collectionCharge.detail.expiresAt', 'vence em {{date}}', { date: formatDate(detail.expiresAt) })}</span>
              </div>
              <ChargeBannerNote banner={chargeBanner(detail, receivableOpen, now)} />
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                <dt className="text-neutral-500">{t('collectionCharge.detail.providerStatus', 'Estado no provedor')}</dt>
                <dd className="font-mono">{[detail.providerStatus, detail.providerStatusDetail].filter(Boolean).join(' / ') || '—'}</dd>
                <dt className="text-neutral-500">{t('collectionCharge.detail.updatedAt', 'Atualizada em')}</dt>
                <dd>{formatDateTime(detail.updatedAt)}</dd>
                {detail.paidAt && (
                  <>
                    <dt className="text-neutral-500">{t('collectionCharge.detail.paidAt', 'Visto pago em')}</dt>
                    <dd>{formatDateTime(detail.paidAt)}</dd>
                  </>
                )}
                {detail.failReason && (
                  <>
                    <dt className="text-neutral-500">{t('collectionCharge.detail.failReason', 'Motivo da falha')}</dt>
                    <dd className="whitespace-pre-wrap text-red-300">{detail.failReason}</dd>
                  </>
                )}
              </dl>
              <p className="text-xs text-neutral-500">
                {t('collectionCharge.detail.refreshNote', 'Atualizado por notificação ou re-consulta a cada 15 min.')}
              </p>
              <ChargeInstrumentView charge={detail} />
              {detail.payer && (
                <div data-testid="charge-payer" className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 text-xs">
                  <p className="mb-1 font-medium text-neutral-300">{t('collectionCharge.modal.payer', 'Pagador')}</p>
                  <p>{detail.payer.firstName} {detail.payer.lastName} · {detail.payer.email}</p>
                  <p className="font-mono text-neutral-400">{detail.payer.identification.type} {detail.payer.identification.number}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={!!cancelTarget}
          onClose={() => { if (!cancelling) setCancelTarget(null); }}
          title={t('collectionCharge.cancel.title', 'Cancelar cobrança?')}
          themeColor="bg-red-600"
          maxWidth="max-w-lg"
          footer={
            <>
              <button type="button" onClick={() => setCancelTarget(null)} disabled={cancelling} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-50">
                {t('collectionCharge.modal.cancel', 'Voltar')}
              </button>
              <button type="button" onClick={() => void confirmCancel()} disabled={cancelling} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {cancelling ? t('collectionCharge.cancel.cancelling', 'Cancelando…') : t('collectionCharge.cancel.confirm', 'Sim, cancelar')}
              </button>
            </>
          }
        >
          <div className="space-y-3 px-6 py-5 text-sm text-neutral-300">
            <p>{t('collectionCharge.cancel.message', 'O pedido de cancelamento vai ao Mercado Pago. Se a cobrança já tiver sido paga ou expirada, vale o estado que o provedor informar.')}</p>
            {cancelError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{cancelError}</div>}
          </div>
        </Modal>
      </td>
    </tr>
  );
}
