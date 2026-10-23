import { FiExternalLink } from 'react-icons/fi';
import {
  chargeBanner,
  type ChargeBanner,
  type CollectionChargeStatus,
  type CollectionChargeView,
} from '../../../lib/services/collectionCharges.service';
import { useAccountingT } from '../lib/useAccountingT';
import { CopyButton } from './CopyButton';

/**
 * Peças comuns da cobrança (FE-INCR-PAYMENT-PROVIDER itens 14 e 17): selo por status, aviso por grupo e o
 * instrumento (boleto / Pix). Mapa FECHADO espelhando `COLLECTION_CHARGE_STATUSES`; status desconhecido ⇒ rótulo
 * cru, nunca "pago".
 */

const STATUS_LABEL: Record<CollectionChargeStatus, string> = {
  CREATING: 'Enviando ao provedor',
  PENDING: 'Pendente',
  PAID: 'Pago no provedor',
  PARTIALLY_REFUNDED: 'Estornada em parte',
  CHARGED_BACK: 'Contestada',
  REFUNDED: 'Estornada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
  FAILED: 'Falhou',
};

const STATUS_CLASS: Record<CollectionChargeStatus, string> = {
  CREATING: 'bg-blue-900/40 text-blue-300',
  PENDING: 'bg-amber-900/40 text-amber-300',
  PAID: 'bg-emerald-900/40 text-emerald-300',
  PARTIALLY_REFUNDED: 'bg-orange-900/40 text-orange-300',
  CHARGED_BACK: 'bg-red-900/40 text-red-300',
  REFUNDED: 'bg-neutral-700/60 text-neutral-300',
  EXPIRED: 'bg-neutral-700/60 text-neutral-300',
  CANCELLED: 'bg-neutral-700/60 text-neutral-300',
  FAILED: 'bg-red-900/40 text-red-300',
};

function isKnown(status: string): status is CollectionChargeStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_LABEL, status);
}

/** Rótulo do status (desconhecido ⇒ valor cru). */
export function useChargeStatusLabel() {
  const { t } = useAccountingT();
  return (status: string) => (isKnown(status) ? t('collectionCharge.status.' + status, STATUS_LABEL[status]) : status);
}

/**
 * Selo do status. `PAID` com título aberto vira "Pago no provedor, aguardando confirmação" (P2-15); `PENDING` vencida
 * ganha o selo derivado "Vencida — aguardando o provedor" (F-FE-COB-7 a). O status do BE continua o mesmo.
 */
export function ChargeStatusBadge({ charge, receivableOpen, now }: { charge: Pick<CollectionChargeView, 'status' | 'expiresAt'>; receivableOpen: boolean; now: Date }) {
  const { t } = useAccountingT();
  const label = useChargeStatusLabel();
  const banner = chargeBanner(charge, receivableOpen, now);
  const cls = isKnown(charge.status) ? STATUS_CLASS[charge.status] : 'bg-neutral-700/50 text-neutral-400';
  let text = label(charge.status);
  if (banner === 'paid_awaiting_settlement') text = t('collectionCharge.badge.paidAwaiting', 'Pago no provedor, aguardando confirmação');
  if (banner === 'overdue_pending') text = t('collectionCharge.badge.overdue', 'Vencida — aguardando o provedor');
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

/** Aviso por grupo de status (item 17). */
export function ChargeBannerNote({ banner }: { banner: ChargeBanner | null }) {
  const { t } = useAccountingT();
  if (!banner) return null;
  const text: Record<ChargeBanner, string> = {
    paid_awaiting_settlement: t(
      'collectionCharge.banner.paidAwaiting',
      'A baixa entra pela Conciliação → Baixas por retorno, depois que o relatório de liberações do MP for importado.',
    ),
    no_ledger_effect: t(
      'collectionCharge.banner.noLedgerEffect',
      'Sem efeito no razão; o tratamento contábil de estorno e contestação está pendente do contador (P4) — concilie à mão.',
    ),
    terminal: t(
      'collectionCharge.banner.terminal',
      'Se o pagador pagar mesmo assim, o valor aparece no relatório e a baixa é proposta na Conciliação com aviso.',
    ),
    overdue_pending: t(
      'collectionCharge.banner.overdue',
      'Cancele para não deixar a cobrança aberta.',
    ),
  };
  const tone = banner === 'paid_awaiting_settlement' ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300' : 'border-amber-900/50 bg-amber-950/30 text-amber-300';
  return <p data-testid={`charge-banner-${banner}`} className={`rounded-xl border px-3 py-2 text-xs ${tone}`}>{text[banner]}</p>;
}

/** Instrumento da cobrança (item 14): boleto = linha digitável + link; Pix = QR + copia-e-cola + link. */
export function ChargeInstrumentView({ charge }: { charge: Pick<CollectionChargeView, 'kind' | 'instrument'> }) {
  const { t } = useAccountingT();
  const inst = charge.instrument;
  if (!inst) return null;
  const ticketLink = inst.ticketUrl ? (
    <a
      href={inst.ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 underline hover:text-emerald-300"
    >
      <FiExternalLink size={12} />
      {charge.kind === 'BOLETO'
        ? t('collectionCharge.instrument.openBoleto', 'Abrir boleto')
        : t('collectionCharge.instrument.openPix', 'Abrir página do Pix')}
    </a>
  ) : null;

  if (charge.kind === 'BOLETO') {
    return (
      <div className="space-y-2">
        {inst.digitableLine && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">{t('collectionCharge.instrument.digitableLine', 'Linha digitável')}</span>
            <code className="break-all font-mono text-xs text-neutral-200">{inst.digitableLine}</code>
            <CopyButton value={inst.digitableLine} label={t('collectionCharge.instrument.copyDigitableLine', 'Copiar linha digitável')} />
          </div>
        )}
        {ticketLink}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {inst.qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${inst.qrCodeBase64}`}
          alt={t('collectionCharge.instrument.qrAlt', 'QR Code do Pix')}
          className="h-40 w-40 rounded-xl bg-white p-2"
        />
      )}
      {inst.qrCode && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">{t('collectionCharge.instrument.pixCode', 'Pix copia-e-cola')}</span>
          <code className="max-w-full break-all font-mono text-xs text-neutral-200">{inst.qrCode}</code>
          <CopyButton value={inst.qrCode} label={t('collectionCharge.instrument.copyPix', 'Copiar código Pix')} />
        </div>
      )}
      {ticketLink}
    </div>
  );
}
