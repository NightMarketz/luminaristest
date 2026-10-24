import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  collectionChargesService,
  docTypeFor,
  toCents,
  toCreateChargeInput,
  PIX_EXPIRY_PRESETS,
  type ChargeForm,
  type ChargeKind,
  type CollectionChargeView,
} from '../../../lib/services/collectionCharges.service';
import type { PayerInput } from '@/types/contracts/accounting/CollectionChargeDto.gen';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { ChargeInstrumentView, ChargeStatusBadge } from './CollectionChargeParts';
import { inputClass } from './SpedGenerationPanel';

export interface ChargeTarget {
  id: string;
  customerName: string;
  description: string;
  /** Saldo em aberto (centavos) — só leitura; o servidor relê na hora da emissão. */
  openCents: number;
}

interface ChargeReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  receivable: ChargeTarget | null;
  /** Sugestão do pagador (P2-11), lida pelo painel antes de abrir. `{}` = formulário vazio. */
  suggestion: Partial<PayerInput>;
  /** Item 15: `PAYMENT_ACCOUNT_NOT_ACTIVE` / credencial ⇒ atalho para a aba Cobrança. */
  onNavigateToCobranca?: () => void;
  /** Item 15: `CHARGE_LIVE_EXISTS` ⇒ atalho para as cobranças do título (item 16). */
  onShowCharges?: (receivableId: string) => void;
}

const PIX_PRESET_LABEL: Record<string, string> = {
  '30m': '30 minutos',
  '1h': '1 hora',
  '24h': '24 horas (padrão)',
  '3d': '3 dias',
  '7d': '7 dias',
  '30d': '30 dias',
};

/** Formulário inicial a partir da sugestão do pagador (item 13). */
export function formFromSuggestion(s: Partial<PayerInput>): ChargeForm {
  const number = s.identification?.number ?? '';
  return {
    kind: 'PIX',
    boletoDays: '',
    pixPreset: '24h',
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
    email: s.email ?? '',
    docType: s.identification?.type ?? docTypeFor(number) ?? 'CPF',
    docNumber: number,
    streetName: s.address?.streetName ?? '',
    streetNumber: s.address?.streetNumber ?? '',
    zipCode: s.address?.zipCode ?? '',
    neighborhood: s.address?.neighborhood ?? '',
    city: s.address?.city ?? '',
    state: s.address?.state ?? '',
  };
}

type ErrorHint = 'liveExists' | 'cobrancaTab' | null;

/**
 * Modal "Cobrar título" (FE-INCR-PAYMENT-PROVIDER PR-2, itens 12–15; F-PP-10 a). Valor = saldo aberto, só leitura:
 * não há campo de valor, juros, multa nem desconto (P2-12; o MP não os suporta, ADR MP11). O corpo sai de
 * `toCreateChargeInput`. Depois do 201 a mesma tela mostra o status e o instrumento.
 */
export function ChargeReceivableModal({ isOpen, onClose, unitId, receivable, suggestion, onNavigateToCobranca, onShowCharges }: ChargeReceivableModalProps) {
  const { t } = useAccountingT();
  const [form, setForm] = useState<ChargeForm>(() => formFromSuggestion(suggestion));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<ErrorHint>(null);
  const [result, setResult] = useState<CollectionChargeView | null>(null);
  const [requeued, setRequeued] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromSuggestion(suggestion));
    setError(null);
    setHint(null);
    setResult(null);
    setRequeued(false);
  }, [isOpen, suggestion]);

  function set<K extends keyof ChargeForm>(key: K, value: ChargeForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDocNumber(value: string) {
    const detected = docTypeFor(value);
    setForm((f) => ({ ...f, docNumber: value, docType: detected ?? f.docType }));
  }

  function close() {
    if (busy) return;
    onClose();
  }

  function errorText(code: string | undefined, message: string): { text: string; hint: ErrorHint } {
    switch (code) {
      case 'CHARGE_LIVE_EXISTS':
        return { text: t('collectionCharge.error.liveExists', 'O título já tem cobrança em andamento.'), hint: 'liveExists' };
      case 'PAYMENT_ACCOUNT_NOT_ACTIVE':
        return { text: t('collectionCharge.error.noActiveAccount', 'Não há conta Mercado Pago ativa nesta unidade. Cadastre ou ative a conta na aba Cobrança.'), hint: 'cobrancaTab' };
      case 'CHARGE_NOTHING_TO_CHARGE':
        return { text: t('collectionCharge.error.nothingToCharge', 'O título não tem saldo em aberto para cobrar.'), hint: null };
      case 'CHARGE_RECEIVABLE_NOT_CHARGEABLE':
        return { text: t('collectionCharge.error.notChargeable', 'O título não está numa situação que permita cobrança.'), hint: null };
      case 'provider_credential_invalid':
        return { text: t('collectionCharge.error.credentialInvalid', 'O MP recusou a credencial; grave de novo na aba Cobrança.'), hint: 'cobrancaTab' };
      case 'payment_credential_key_missing':
        return {
          text: t('collectionCharge.error.keyMissing', 'A chave de cifra da instância não está provisionada (pré-condição do deploy, M2). Nenhuma cobrança foi emitida.'),
          hint: null,
        };
      default:
        return { text: message, hint: null };
    }
  }

  async function submit() {
    if (!receivable) return;
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      setResult(await collectionChargesService.create(receivable.id, toCreateChargeInput(form, unitId)));
    } catch (e) {
      const { message, code } = resolveErrorWithCode(e, t('collectionCharge.error.create', 'Não foi possível emitir a cobrança.'));
      if (code === 'provider_unavailable') {
        // P2-3: a linha ficou CREATING e o job reenvia com a mesma chave.
        setRequeued(true);
      } else {
        const mapped = errorText(code, message);
        setError(mapped.text);
        setHint(mapped.hint);
      }
    } finally {
      setBusy(false);
    }
  }

  const done = !!result || requeued;
  const now = new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={t('collectionCharge.modal.title', 'Cobrar título')}
      themeColor="bg-emerald-600"
      maxWidth="max-w-2xl"
      footer={
        done ? (
          <button type="button" onClick={close} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700">
            {t('collectionCharge.modal.close', 'Fechar')}
          </button>
        ) : (
          <>
            <button type="button" onClick={close} disabled={busy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
              {t('collectionCharge.modal.cancel', 'Voltar')}
            </button>
            <button type="button" onClick={() => void submit()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('collectionCharge.modal.sending', 'Emitindo…') : t('collectionCharge.modal.confirm', 'Emitir cobrança')}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
        {receivable && (
          <div>
            <p>
              <span className="font-semibold text-neutral-100">{receivable.customerName}</span>
              {' — '}
              {receivable.description}
            </p>
            <p className="mt-1">
              {t('collectionCharge.modal.amount', 'Valor')}:{' '}
              <span data-testid="charge-amount" className="tabular-nums font-semibold text-neutral-100">{formatCents(receivable.openCents)}</span>
            </p>
            <p className="text-xs text-neutral-500">
              {t('collectionCharge.modal.amountNote', 'O valor é o saldo em aberto, relido pelo servidor na hora da emissão.')}
            </p>
          </div>
        )}

        {requeued && (
          <p role="status" className="rounded-xl border border-blue-900/50 bg-blue-950/30 px-3 py-2 text-blue-300">
            {t('collectionCharge.result.requeued', 'A cobrança foi registrada e será reenviada automaticamente.')}
          </p>
        )}

        {result && (
          <div data-testid="charge-result" className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ChargeStatusBadge charge={result} receivableOpen now={now} />
              <span className="text-xs text-neutral-500">
                {t('collectionCharge.result.summary', '{{amount}} · vence em {{date}}', {
                  amount: formatCents(toCents(result.amountCents)),
                  date: formatDate(result.expiresAt),
                })}
              </span>
            </div>
            {result.status === 'CREATING' && (
              <p className="text-blue-300">{t('collectionCharge.result.requeued', 'A cobrança foi registrada e será reenviada automaticamente.')}</p>
            )}
            {result.status === 'FAILED' && result.failReason && <p className="whitespace-pre-wrap text-red-300">{result.failReason}</p>}
            <ChargeInstrumentView charge={result} />
          </div>
        )}

        {!done && (
          <>
            <fieldset className="flex gap-4">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">{t('collectionCharge.modal.kind', 'Tipo')}</legend>
              {(['PIX', 'BOLETO'] as const).map((k: ChargeKind) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name="charge-kind" value={k} checked={form.kind === k} onChange={() => set('kind', k)} />
                  {k === 'PIX' ? t('collectionCharge.kind.PIX', 'Pix') : t('collectionCharge.kind.BOLETO', 'Boleto')}
                </label>
              ))}
            </fieldset>

            {form.kind === 'BOLETO' ? (
              <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                {t('collectionCharge.modal.boletoDays', 'Vencimento em dias (1 a 30)')}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.boletoDays}
                  onChange={(e) => set('boletoDays', e.target.value)}
                  placeholder={t('collectionCharge.modal.boletoDaysPlaceholder', 'Vazio = 3 dias úteis')}
                  className={inputClass}
                />
                <span className="text-neutral-500">
                  {t('collectionCharge.modal.boletoDaysHint', 'O Mercado Pago recomenda no mínimo 3 dias, por causa da compensação.')}
                </span>
              </label>
            ) : (
              <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                {t('collectionCharge.modal.pixValidity', 'Validade')}
                <select aria-label={t('collectionCharge.modal.pixValidity', 'Validade')} value={form.pixPreset} onChange={(e) => set('pixPreset', e.target.value)} className={inputClass}>
                  {PIX_EXPIRY_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t('collectionCharge.pixPreset.' + p.id, PIX_PRESET_LABEL[p.id])}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">{t('collectionCharge.modal.payer', 'Pagador')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.payer.firstName', 'Nome')}
                  <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.payer.lastName', 'Sobrenome')}
                  <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400 sm:col-span-2">
                  {t('collectionCharge.payer.email', 'E-mail')}
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.payer.docType', 'Tipo do documento')}
                  <select aria-label={t('collectionCharge.payer.docType', 'Tipo do documento')} value={form.docType} onChange={(e) => set('docType', e.target.value === 'CNPJ' ? 'CNPJ' : 'CPF')} className={inputClass}>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.payer.docNumber', 'Documento')}
                  <input value={form.docNumber} onChange={(e) => setDocNumber(e.target.value)} className={inputClass} />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {t('collectionCharge.modal.address', 'Endereço')}
                <span className="ml-1 normal-case text-neutral-600">
                  {form.kind === 'BOLETO'
                    ? t('collectionCharge.modal.addressRequired', '(obrigatório no boleto)')
                    : t('collectionCharge.modal.addressNotSent', '(não é enviado no Pix)')}
                </span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.streetName', 'Rua')}
                  <input value={form.streetName} onChange={(e) => set('streetName', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.streetNumber', 'Número')}
                  <input value={form.streetNumber} onChange={(e) => set('streetNumber', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.zipCode', 'CEP (8 dígitos)')}
                  <input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.neighborhood', 'Bairro')}
                  <input value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.city', 'Cidade')}
                  <input value={form.city} onChange={(e) => set('city', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  {t('collectionCharge.address.state', 'UF')}
                  <input value={form.state} maxLength={2} onChange={(e) => set('state', e.target.value)} disabled={form.kind !== 'BOLETO'} className={inputClass} />
                </label>
              </div>
            </div>
          </>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
            {error}
            {hint === 'liveExists' && receivable && onShowCharges && (
              <>
                {' '}
                <button type="button" onClick={() => onShowCharges(receivable.id)} className="underline hover:text-red-200">
                  {t('collectionCharge.error.showCharges', 'Ver cobranças do título')}
                </button>
              </>
            )}
            {hint === 'cobrancaTab' && onNavigateToCobranca && (
              <>
                {' '}
                <button type="button" onClick={onNavigateToCobranca} className="underline hover:text-red-200">
                  {t('collectionCharge.error.openCobranca', 'Abrir a aba Cobrança')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
