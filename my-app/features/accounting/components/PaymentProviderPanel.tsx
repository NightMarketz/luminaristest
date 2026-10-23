import { useCallback, useEffect, useState } from 'react';
import { FiPlusCircle, FiKey, FiAlertTriangle, FiTrash2, FiEdit2, FiPower, FiUnlock, FiExternalLink } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import {
  paymentAccountsService,
  patchTargets,
  webhookUrlFor,
  type PaymentAccountStatus,
  type PaymentAccountView,
} from '../../../lib/services/paymentAccounts.service';
import type { CreatePaymentAccountInput, SetCredentialInput } from '@/types/contracts/accounting/PaymentAccountDto.gen';
import { formatDate } from '../lib/formatDate';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';
import { CopyButton } from './CopyButton';
import { inputClass } from './SpedGenerationPanel';

// ── status badge (item 4) ────────────────────────────────────────────────────

const STATUS_LABEL: Record<PaymentAccountStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  CREDENTIAL_INVALID: 'Credencial recusada',
  DISABLED: 'Desativada',
};

const STATUS_CLASS: Record<PaymentAccountStatus, string> = {
  DRAFT: 'bg-neutral-700/60 text-neutral-300',
  ACTIVE: 'bg-emerald-900/40 text-emerald-300',
  CREDENTIAL_INVALID: 'bg-red-900/40 text-red-300',
  DISABLED: 'bg-neutral-800 text-neutral-500',
};

function AccountStatusBadge({ status }: { status: PaymentAccountStatus }) {
  const { t } = useAccountingT();
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? 'bg-neutral-700/50 text-neutral-400'}`}>
      {t('paymentProvider.status.' + status, STATUS_LABEL[status] ?? status)}
    </span>
  );
}

const btnBase =
  'inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50';
const secondaryBtn =
  'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';

// Validação local espelha o DTO (SetCredentialSchema: ≥ 20 / ≥ 16; CreatePaymentAccountSchema: label 1–80).
const MIN_ACCESS_TOKEN = 20;
const MIN_WEBHOOK_SECRET = 16;
const MAX_LABEL = 80;

/** Corpo da criação (item 5): provedor e config fixos — o FE nunca manda `OAUTH`. */
export function toCreatePaymentAccountInput(unitId: string, label: string, glAccountId: string): CreatePaymentAccountInput {
  return {
    unitId,
    provider: 'MERCADO_PAGO',
    label: label.trim(),
    glAccountId,
    config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' },
  };
}

// ── modal state ──────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create' }
  | { type: 'credential'; account: PaymentAccountView }
  | { type: 'rename'; account: PaymentAccountView }
  | { type: 'delete'; account: PaymentAccountView }
  | null;

interface PaymentProviderPanelProps {
  unitId: string;
  /** Atalho "Ver extratos e baixas" (item 24): abre a Conciliação com a folha da conta selecionada. */
  onOpenReconciliation?: (glAccountId: string) => void;
}

/**
 * Aba "Cobrança" (FE-INCR-PAYMENT-PROVIDER PR-1, F-FE-COB-1 a): conta Mercado Pago da unidade — cadastro, credencial,
 * status, webhook, alerta do relatório de liberações (R2 a) e o atalho para a Conciliação. Cards (F-FE-COB-8: com
 * F-PP-9 a há no máximo uma conta ativa). A policy é do BE: um 403 num comando esconde as ações de gerir.
 */
export function PaymentProviderPanel({ unitId, onOpenReconciliation }: PaymentProviderPanelProps) {
  const { t, tRef } = useAccountingT();
  const [accounts, setAccounts] = useState<PaymentAccountView[]>([]);
  const [leaves, setLeaves] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(true);
  const [cardError, setCardError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formGlAccountId, setFormGlAccountId] = useState('');
  // Credencial: sempre vazia ao abrir (o BE nunca a devolve); zerada depois do sucesso E do erro (item 6).
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      setAccounts(await paymentAccountsService.list(unitId));
    } catch (e) {
      setAccounts([]);
      setError(resolveErrorWithCode(e, tRef.current('paymentProvider.error.load', 'Erro ao carregar as contas do provedor.')).message);
    } finally {
      setLoading(false);
    }
  }, [unitId, tRef]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    let active = true;
    accountingService
      .getAccounts(unitId)
      .then((r) => {
        if (active) setLeaves(r.accounts.filter((a) => a.acceptsEntries && !a.deletedAt));
      })
      .catch(() => {
        if (active) setLeaves([]);
      });
    return () => {
      active = false;
    };
  }, [unitId]);

  const accountLabel = (id: string) => {
    const acc = leaves.find((a) => a.id === id);
    return acc ? `${acc.code} — ${acc.name}` : id;
  };

  function handleForbidden(e: unknown): boolean {
    if ((e as { status?: number })?.status === 403) {
      setCanManage(false);
      return true;
    }
    return false;
  }

  function openModal(next: ModalState) {
    setModalError(null);
    setAccessToken('');
    setWebhookSecret('');
    if (next?.type === 'create') {
      setFormLabel('');
      setFormGlAccountId('');
    } else if (next?.type === 'rename') {
      setFormLabel(next.account.label);
    }
    setModal(next);
  }

  function closeModal() {
    if (modalBusy) return;
    setAccessToken('');
    setWebhookSecret('');
    setModal(null);
    setModalError(null);
  }

  function credentialErrorText(code: string | undefined, message: string): string {
    if (code === 'payment_credential_key_missing') {
      return t(
        'paymentProvider.credential.keyMissing',
        'A chave de cifra da instância não está provisionada (pré-condição do deploy, M2). Nada foi gravado.',
      );
    }
    if (code === 'payment_account_already_active') {
      return t('paymentProvider.credential.alreadyActive', 'Já existe uma conta ativa nesta unidade; desative-a antes.');
    }
    return message;
  }

  async function submitModal() {
    if (!modal) return;
    setModalError(null);
    if (modal.type === 'create') {
      const label = formLabel.trim();
      if (label.length < 1 || label.length > MAX_LABEL) {
        setModalError(t('paymentProvider.create.labelInvalid', 'Informe um rótulo de 1 a 80 caracteres.'));
        return;
      }
      if (!formGlAccountId) {
        setModalError(t('paymentProvider.create.glAccountRequired', 'Selecione a conta contábil.'));
        return;
      }
    }
    if (modal.type === 'credential') {
      if (accessToken.length < MIN_ACCESS_TOKEN || webhookSecret.length < MIN_WEBHOOK_SECRET) {
        setModalError(
          t('paymentProvider.credential.tooShort', 'O access token tem no mínimo 20 caracteres e o segredo do webhook, 16.'),
        );
        return;
      }
    }
    if (modal.type === 'rename' && (formLabel.trim().length < 1 || formLabel.trim().length > MAX_LABEL)) {
      setModalError(t('paymentProvider.create.labelInvalid', 'Informe um rótulo de 1 a 80 caracteres.'));
      return;
    }
    setModalBusy(true);
    try {
      if (modal.type === 'create') {
        await paymentAccountsService.create(toCreatePaymentAccountInput(unitId, formLabel, formGlAccountId));
      } else if (modal.type === 'credential') {
        const body: SetCredentialInput = { unitId, accessToken, webhookSecret };
        await paymentAccountsService.setCredential(modal.account.id, body);
      } else if (modal.type === 'rename') {
        await paymentAccountsService.update(modal.account.id, { unitId, label: formLabel.trim() });
      } else {
        await paymentAccountsService.remove(modal.account.id, unitId);
      }
      setAccessToken('');
      setWebhookSecret('');
      setModal(null);
      await fetchAccounts();
    } catch (e) {
      setAccessToken('');
      setWebhookSecret('');
      if (handleForbidden(e)) {
        setModalError(t('paymentProvider.error.forbidden', 'Você não tem permissão para gerir a conta do provedor.'));
      } else {
        const { message, code } = resolveErrorWithCode(e, t('paymentProvider.error.action', 'Não foi possível concluir a operação.'));
        setModalError(modal.type === 'credential' ? credentialErrorText(code, message) : message);
      }
    } finally {
      setModalBusy(false);
    }
  }

  async function runCardAction(account: PaymentAccountView, fn: () => Promise<unknown>) {
    setBusyId(account.id);
    setCardError(null);
    try {
      await fn();
      await fetchAccounts();
    } catch (e) {
      handleForbidden(e);
      setCardError({
        id: account.id,
        message: resolveErrorWithCode(e, t('paymentProvider.error.action', 'Não foi possível concluir a operação.')).message,
      });
    } finally {
      setBusyId(null);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  let modalTitle = '';
  let confirmLabel = '';
  if (modal?.type === 'create') {
    modalTitle = t('paymentProvider.create.title', 'Cadastrar conta Mercado Pago');
    confirmLabel = t('paymentProvider.create.confirm', 'Cadastrar');
  } else if (modal?.type === 'credential') {
    modalTitle = t('paymentProvider.credential.title', 'Gravar credencial');
    confirmLabel = t('paymentProvider.credential.confirm', 'Gravar');
  } else if (modal?.type === 'rename') {
    modalTitle = t('paymentProvider.rename.title', 'Renomear conta');
    confirmLabel = t('paymentProvider.rename.confirm', 'Salvar');
  } else if (modal?.type === 'delete') {
    modalTitle = t('paymentProvider.delete.title', 'Excluir conta?');
    confirmLabel = t('paymentProvider.delete.confirm', 'Sim, excluir');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">{t('paymentProvider.heading', 'Cobrança — conta do provedor')}</h2>
        {canManage && accounts.length > 0 && (
          <button type="button" onClick={() => openModal({ type: 'create' })} className={primaryBtn}>
            <FiPlusCircle size={16} />
            {t('paymentProvider.newAccount', 'Nova conta')}
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && <div className="py-16 text-center text-neutral-400">{t('paymentProvider.loading', 'Carregando contas…')}</div>}

      {!loading && !error && accounts.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 py-12 text-center">
          <p className="mb-4 text-sm text-neutral-500">
            {t('paymentProvider.empty', 'Nenhuma conta de provedor de pagamento nesta unidade.')}
          </p>
          {canManage && (
            <button type="button" onClick={() => openModal({ type: 'create' })} className={primaryBtn}>
              <FiPlusCircle size={16} />
              {t('paymentProvider.createCta', 'Cadastrar conta Mercado Pago')}
            </button>
          )}
        </div>
      )}

      {!loading &&
        accounts.map((account) => {
          const webhook = webhookUrlFor(account.id);
          const busy = busyId === account.id;
          return (
            <section key={account.id} data-testid={`payment-account-${account.id}`} className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-neutral-100">{account.label}</h3>
                    <AccountStatusBadge status={account.status} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {t('paymentProvider.provider.MERCADO_PAGO', 'Mercado Pago')}
                    {' · '}
                    <span className="font-mono">{accountLabel(account.glAccountId)}</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {account.credentialSetAt
                      ? t('paymentProvider.credentialSet', 'Credencial gravada em {{date}} · •••• {{last4}}', {
                          date: formatDate(account.credentialSetAt),
                          last4: account.accessTokenLast4 ?? '',
                        })
                      : t('paymentProvider.credentialNotSet', 'Sem credencial gravada')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenReconciliation && (
                    <button type="button" onClick={() => onOpenReconciliation(account.glAccountId)} className={btnBase}>
                      <FiExternalLink size={12} />
                      {t('paymentProvider.openReconciliation', 'Ver extratos e baixas')}
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button type="button" onClick={() => openModal({ type: 'credential', account })} className={btnBase}>
                        <FiKey size={12} />
                        {t('paymentProvider.action.credential', 'Gravar credencial')}
                      </button>
                      {patchTargets(account.status).map((target) => (
                        <button
                          key={target}
                          type="button"
                          disabled={busy}
                          onClick={() => void runCardAction(account, () => paymentAccountsService.update(account.id, { unitId, status: target }))}
                          className={btnBase}
                        >
                          <FiPower size={12} />
                          {target === 'ACTIVE'
                            ? t('paymentProvider.action.activate', 'Ativar')
                            : t('paymentProvider.action.deactivate', 'Desativar')}
                        </button>
                      ))}
                      <button type="button" onClick={() => openModal({ type: 'rename', account })} className={btnBase}>
                        <FiEdit2 size={12} />
                        {t('paymentProvider.action.rename', 'Renomear')}
                      </button>
                      <button type="button" onClick={() => openModal({ type: 'delete', account })} className={`${btnBase} hover:border-red-700 hover:text-red-300`}>
                        <FiTrash2 size={12} />
                        {t('paymentProvider.action.delete', 'Excluir')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Item 7: CREDENTIAL_INVALID — a credencial é a única saída do estado (P2-4). */}
              {account.status === 'CREDENTIAL_INVALID' && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  <span>
                    {t('paymentProvider.credentialInvalid', 'O Mercado Pago recusou a credencial. Grave a credencial de novo para voltar a cobrar.')}
                  </span>
                  {canManage && (
                    <button type="button" onClick={() => openModal({ type: 'credential', account })} className={btnBase}>
                      <FiKey size={12} />
                      {t('paymentProvider.action.credential', 'Gravar credencial')}
                    </button>
                  )}
                </div>
              )}

              {/* Item 10: relatório de liberações bloqueado (R2 a) — o status da conta não muda. */}
              {account.releaseReportBlockedReason && (
                <div role="alert" className="space-y-2 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
                  <div className="flex items-start gap-2">
                    <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
                    <div>
                      <p className="font-medium">{t('paymentProvider.releaseBlocked.title', 'Relatório de liberações bloqueado')}</p>
                      <p className="mt-1 whitespace-pre-wrap text-amber-200">{account.releaseReportBlockedReason}</p>
                      <p className="mt-1 text-amber-300/80">
                        {t(
                          'paymentProvider.releaseBlocked.hint',
                          'Resolva a sobreposição — por exemplo, exclua o extrato manual que cobre a faixa — e destrave.',
                        )}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runCardAction(account, () => paymentAccountsService.unblockReleaseReport(account.id, { unitId }))}
                      className={btnBase}
                    >
                      <FiUnlock size={12} />
                      {t('paymentProvider.releaseBlocked.unblock', 'Destravar')}
                    </button>
                  )}
                </div>
              )}

              {/* Item 9: webhook (F-FE-COB-5 a) — configurado só no painel do MP (M8). */}
              <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 text-xs">
                <p className="font-medium text-neutral-300">{t('paymentProvider.webhook.title', 'URL do webhook')}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="break-all font-mono text-neutral-400" data-testid="webhook-url">{webhook.url}</code>
                  <CopyButton value={webhook.url} label={t('paymentProvider.webhook.copy', 'Copiar URL do webhook')} />
                </div>
                <p className="text-neutral-500">
                  {t(
                    'paymentProvider.webhook.hint',
                    'Cole esta URL no painel do Mercado Pago (Notificações/Webhooks). O webhook só se configura lá, em URL HTTPS de produção.',
                  )}
                </p>
                {webhook.warning && (
                  <p className="text-amber-400">
                    {t(
                      'paymentProvider.webhook.notProduction',
                      'Atenção: a base da API não é HTTPS público (ou aponta para localhost). O Mercado Pago não alcança esta URL.',
                    )}
                  </p>
                )}
              </div>

              {cardError?.id === account.id && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{cardError.message}</div>
              )}
            </section>
          );
        })}

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modalTitle}
        themeColor={modal?.type === 'delete' ? 'bg-red-600' : 'bg-emerald-600'}
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={modalBusy} className={secondaryBtn}>
              {t('paymentProvider.modal.cancel', 'Voltar')}
            </button>
            <button
              type="button"
              onClick={() => void submitModal()}
              disabled={modalBusy}
              className={modal?.type === 'delete'
                ? 'inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50'
                : primaryBtn}
            >
              {modalBusy ? t('paymentProvider.modal.saving', 'Enviando…') : confirmLabel}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {(modal?.type === 'create' || modal?.type === 'rename') && (
            <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
              {t('paymentProvider.create.label', 'Rótulo')}
              <input
                type="text"
                value={formLabel}
                maxLength={MAX_LABEL}
                onChange={(e) => setFormLabel(e.target.value)}
                className={inputClass}
              />
            </label>
          )}
          {modal?.type === 'create' && (
            <>
              <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                {t('paymentProvider.create.glAccount', 'Conta contábil do saldo no Mercado Pago')}
                <FixedAssetAccountSelect
                  accounts={leaves}
                  value={formGlAccountId}
                  onChange={setFormGlAccountId}
                  ariaLabel={t('paymentProvider.create.glAccount', 'Conta contábil do saldo no Mercado Pago')}
                  placeholder={t('paymentProvider.create.glAccountPlaceholder', 'Selecione a conta folha')}
                />
              </label>
              <p className="text-xs text-neutral-500">
                {t('paymentProvider.create.glAccountHelp', 'O código e o nome desta conta são pendência do contador (saldo "a liberar" × "disponível").')}
              </p>
              <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                {t('paymentProvider.create.immutable', 'A conta contábil não pode ser trocada depois; para trocar, crie outra conta.')}
              </p>
            </>
          )}
          {modal?.type === 'credential' && (
            <>
              <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                {t('paymentProvider.credential.accessToken', 'Access token')}
                <input
                  type="password"
                  autoComplete="off"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-neutral-400">
                {t('paymentProvider.credential.webhookSecret', 'Segredo do webhook')}
                <input
                  type="password"
                  autoComplete="off"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className={inputClass}
                />
              </label>
              <p className="text-xs text-neutral-500">
                {t('paymentProvider.credential.note', 'A credencial é cifrada no servidor e nunca é mostrada de novo; a tela guarda só os 4 últimos dígitos.')}
              </p>
            </>
          )}
          {modal?.type === 'delete' && (
            <p>{t('paymentProvider.delete.message', 'Excluir a conta "{{label}}"?', { label: modal.account.label })}</p>
          )}
          {modalError && (
            <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{modalError}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
