import { useEffect, useState } from 'react';
import { accountingService, type Account, type ProviderFeeAccountPatch } from '../../../lib/services/accounting.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { FieldBlock as Block } from './CatalogCombobox';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';
import { policyVersionsService } from '../../../lib/services/policyVersions.service';
import { toProviderFeeProposal } from '../lib/policyPayload';
import { useGovernedSave } from '../governance/useGovernedSave';
import { ActiveAccountantNotice, GovernedOfferButton, PendingProposalBanner } from '../governance/GovernedSaveBars';

export interface ProviderFeeAccountSectionProps {
  unitId: string;
  /** Contas folha (`acceptsEntries`). */
  accounts: Account[];
}

/** PUT parcial: SÓ `providerFeeExpenseAccountId` (F-FEE-E1 → a; os `bankCharge*` saem do contrato pela EMENDA 3.3). Vazio vira `null`. */
export function toProviderFeePatch(unitId: string, accountId: string): ProviderFeeAccountPatch {
  return { unitId, providerFeeExpenseAccountId: accountId || null };
}

/**
 * "Conta da tarifa do provedor" (FE-INCR-BANK-SETTLEMENT-FEE item 7, F-FEE-E1 → a; lugar do F-TAR-9.1 b): seção
 * compacta no topo de "Baixas por retorno", visível em extrato de conta de provedor. Molde `FixedAssetAccountsSection`
 * (lê antes de salvar; com contador ativo vira proposta `SCOPE_SETTINGS` parcial). Override da conta canônica 4.5 do
 * E29; até o E29 entrar, é obrigatória para confirmar baixa com valor retido (400 `fee_account_not_configured`).
 */
export function ProviderFeeAccountSection({ unitId, accounts }: ProviderFeeAccountSectionProps) {
  const { t, tRef } = useAccountingT();
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  // Só salva depois de ler: com o GET falho um Salvar limparia a conta já configurada (`null`).
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    setLoading(true);
    accountingService
      .getSettings(unitId)
      .then((s) => {
        if (cancelled) return;
        setLoaded(true);
        setAccountId(s.providerFeeExpenseAccountId ?? '');
      })
      .catch((err: unknown) => { if (!cancelled) setLoadError(resolveError(err, tRef.current('bankSettlement.feeAccount.error.load', 'Erro ao carregar a conta da tarifa.'))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [unitId, tRef, reloadTick]);

  const governed = useGovernedSave<ProviderFeeAccountPatch>({
    unitId,
    target: 'SCOPE_SETTINGS',
    put: async (patch) => { await accountingService.updateProviderFeeAccount(patch); },
    propose: async (patch) => {
      const v = await policyVersionsService.propose(toProviderFeeProposal(patch));
      setReloadTick((n) => n + 1);
      return v;
    },
    saveErrorFallback: t('bankSettlement.feeAccount.error.save', 'Não foi possível salvar a conta da tarifa.'),
  });

  const error = loadError ?? governed.error;
  const label = t('bankSettlement.feeAccount.label', 'Conta da tarifa do provedor');

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4" data-testid="provider-fee-account-section">
      <p className="text-xs text-neutral-500">
        {t('bankSettlement.feeAccount.help', 'Despesa onde entra o valor retido pelo provedor. Hoje é obrigatória para confirmar baixa com valor retido; quando a conta padrão 4.5 entrar, vazio passará a usar a 4.5. O código da conta é pendência do contador.')}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <Block label={label}>
            <FixedAssetAccountSelect accounts={accounts} value={accountId} onChange={(id) => { governed.reset(); setAccountId(id); }} disabled={loading}
              ariaLabel={label} placeholder={t('fixedAssets.selectAccount', 'Selecione a conta…')} />
          </Block>
        </div>
        <button
          type="button"
          onClick={() => void governed.submit(toProviderFeePatch(unitId, accountId))}
          disabled={governed.busy || loading || !loaded}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {governed.busy
            ? t('fixedAssets.saving', 'Salvando…')
            : governed.active
              ? t('policy.owner.sendToAccountant', 'Enviar ao contador para aprovação')
              : t('fixedAssets.save', 'Salvar')}
        </button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      {governed.savedDirect && <div role="status" className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">{t('bankSettlement.feeAccount.saved', 'Conta da tarifa salva.')}</div>}
      {governed.proposed && (
        <div role="status" className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          {t('policy.owner.proposedAccounts', 'Contas enviadas ao contador (proposta v{{n}}). As contas acima continuam as vigentes até a aprovação.', { n: String(governed.proposed.version) })}
        </div>
      )}
      {!loadError && <GovernedOfferButton offer={governed.offer} busy={governed.busy} onAccept={() => void governed.acceptOffer()} />}
      {governed.pending && <PendingProposalBanner pending={governed.pending} unitId={unitId} partial />}
      {governed.active && <ActiveAccountantNotice active={governed.active} />}
    </div>
  );
}
