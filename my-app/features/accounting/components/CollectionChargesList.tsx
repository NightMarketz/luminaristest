import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { StandardPagination } from '../../dashboard/shared/components/StandardPagination';
import {
  COLLECTION_CHARGE_STATUSES,
  chargeBanner,
  collectionChargesService,
  toCents,
  type ChargeKind,
  type CollectionChargeListItem,
  type CollectionChargeStatus,
  type CollectionChargeView,
} from '../../../lib/services/collectionCharges.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { ChargeBannerNote, ChargeInstrumentView, ChargeStatusBadge, useChargeStatusLabel } from './CollectionChargeParts';
import { inputClass } from './SpedGenerationPanel';

const PER_PAGE = 20;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
}

interface CollectionChargesListProps {
  unitId: string;
  /** Link do título (16b): abre o AR filtrado pelo nº, com o drawer de cobranças do título aberto. */
  onOpenReceivable?: (receivableId: string, documentNumber: string | null) => void;
}

/**
 * Lista global de cobranças da unidade (FE-INCR-PAYMENT-PROVIDER-EMENDA-1 item 16b; COB-2 b). Tabela HTML +
 * `StandardPagination` (dono, 2026-10-29, D-2026-10-29-F5-16B-E-P-RET-4 item 1: o `GenericTable` é do DynamicTable);
 * paginação e filtros no servidor (`GET /collection-charges`). Sem pagador (F9). A lista não sabe se o título ainda tem
 * saldo, então o selo não afirma "aguardando confirmação" (`receivableOpen=false`); o "Vencida" do COB-7 aparece igual.
 * Clique na linha abre o detalhe (`GET /collection-charges/:id`).
 */
export function CollectionChargesList({ unitId, onOpenReceivable }: CollectionChargesListProps) {
  const { t, tRef } = useAccountingT();
  const statusLabel = useChargeStatusLabel();
  const [items, setItems] = useState<CollectionChargeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CollectionChargeStatus | ''>('');
  const [kind, setKind] = useState<ChargeKind | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CollectionChargeView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await collectionChargesService.listByUnit({
        unitId,
        status: status || undefined,
        kind: kind || undefined,
        page,
        limit: PER_PAGE,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError(resolveErrorWithCode(e, tRef.current('collectionCharge.list.error', 'Erro ao carregar as cobranças da unidade.')).message);
    } finally {
      setLoading(false);
    }
  }, [unitId, status, kind, page, tRef]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setError(null);
    try {
      setDetail(await collectionChargesService.get(id, unitId));
    } catch (e) {
      setError(resolveErrorWithCode(e, t('collectionCharge.error.detail', 'Erro ao carregar a cobrança.')).message);
    }
  }

  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5" data-testid="collection-charges-list">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-100">{t('collectionCharge.list.title', 'Cobranças da unidade')}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            {t('collectionCharge.list.filterStatus', 'Status')}
            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value as CollectionChargeStatus | ''); }}
              className={inputClass}
            >
              <option value="">{t('collectionCharge.list.all', 'Todos')}</option>
              {COLLECTION_CHARGE_STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            {t('collectionCharge.list.filterKind', 'Tipo')}
            <select
              value={kind}
              onChange={(e) => { setPage(1); setKind(e.target.value as ChargeKind | ''); }}
              className={inputClass}
            >
              <option value="">{t('collectionCharge.list.all', 'Todos')}</option>
              <option value="PIX">{t('collectionCharge.kind.PIX', 'Pix')}</option>
              <option value="BOLETO">{t('collectionCharge.kind.BOLETO', 'Boleto')}</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</p>}

      {loading ? (
        <p className="py-6 text-center text-xs text-neutral-500">{t('collectionCharge.list.loading', 'Carregando cobranças…')}</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-neutral-500">{t('collectionCharge.list.empty', 'Nenhuma cobrança nesta unidade com estes filtros.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.kind', 'Tipo')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.list.col.receivable', 'Título')}</th>
                <th className="py-1 pr-4 text-right font-medium">{t('collectionCharge.col.amount', 'Valor')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.expiresAt', 'Vencimento')}</th>
                <th className="py-1 pr-4 font-medium">{t('collectionCharge.col.status', 'Status')}</th>
                <th className="py-1 font-medium">{t('collectionCharge.col.updatedAt', 'Atualizada em')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`collection-charge-row-${c.id}`}
                  onClick={() => void openDetail(c.id)}
                  className="cursor-pointer border-t border-neutral-800/50 align-top hover:bg-neutral-800/40"
                >
                  <td className="py-1.5 pr-4 text-neutral-300">{c.kind === 'PIX' ? t('collectionCharge.kind.PIX', 'Pix') : t('collectionCharge.kind.BOLETO', 'Boleto')}</td>
                  <td className="py-1.5 pr-4">
                    {onOpenReceivable ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenReceivable(c.receivableId, c.receivableDocumentNumber); }}
                        title={t('collectionCharge.list.openReceivable', 'Abrir o título no Contas a Receber')}
                        className="font-mono text-emerald-400 underline hover:text-emerald-300"
                      >
                        {c.receivableDocumentNumber ?? t('collectionCharge.list.noNumber', 'sem nº')}
                      </button>
                    ) : (
                      <span className="font-mono text-neutral-300">{c.receivableDocumentNumber ?? t('collectionCharge.list.noNumber', 'sem nº')}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-neutral-300">{formatCents(toCents(c.amountCents))}</td>
                  <td className="py-1.5 pr-4 tabular-nums text-neutral-300">{formatDate(c.expiresAt)}</td>
                  <td className="py-1.5 pr-4"><ChargeStatusBadge charge={c} receivableOpen={false} now={now} /></td>
                  <td className="py-1.5 tabular-nums text-neutral-500">{formatDateTime(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <StandardPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={PER_PAGE}
            onPageChange={setPage}
            scrollToTop={false}
          />
        </div>
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
          <div className="space-y-3 px-6 py-5 text-sm text-neutral-300" data-testid="collection-charge-detail">
            <div className="flex flex-wrap items-center gap-2">
              <ChargeStatusBadge charge={detail} receivableOpen={false} now={now} />
              <span className="tabular-nums">{formatCents(toCents(detail.amountCents))}</span>
              <span className="text-xs text-neutral-500">{t('collectionCharge.detail.expiresAt', 'vence em {{date}}', { date: formatDate(detail.expiresAt) })}</span>
            </div>
            <ChargeBannerNote banner={chargeBanner(detail, false, now)} />
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
    </section>
  );
}
