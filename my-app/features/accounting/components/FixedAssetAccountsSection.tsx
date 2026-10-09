import { useEffect, useState } from 'react';
import { accountingService, type Account, type FixedAssetAccountsPatch } from '../../../lib/services/accounting.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { FieldBlock as Block } from './CatalogCombobox';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';
import { policyVersionsService } from '../../../lib/services/policyVersions.service';
import { toScopeSettingsProposal } from '../lib/policyPayload';
import { useGovernedSave } from '../governance/useGovernedSave';
import { ActiveAccountantNotice, GovernedOfferButton, PendingProposalBanner } from '../governance/GovernedSaveBars';

export interface FixedAssetAccountsSectionProps {
  unitId: string;
  /** Contas folha (`acceptsEntries`). */
  accounts: Account[];
}

interface FormState {
  depreciationExpenseAccountId: string;
  disposalGainAccountId: string;
  disposalLossAccountId: string;
}

/**
 * PUT parcial: SÓ os 3 campos do imobilizado (nunca tarifa bancária nem `depreciationParteBAccountId`). Vazio vira
 * `null` (limpa a configuração).
 */
export function toAccountsPatch(unitId: string, f: FormState): FixedAssetAccountsPatch {
  return {
    unitId,
    depreciationExpenseAccountId: f.depreciationExpenseAccountId || null,
    disposalGainAccountId: f.disposalGainAccountId || null,
    disposalLossAccountId: f.disposalLossAccountId || null,
  };
}

/**
 * Seção "Contas" (FE-INCR-FIXED-ASSETS item 22, F-FAFE-3 → a): as 3 contas que a depreciação mensal e a baixa
 * exigem (`AccountingScopeSettings`). Sem ela, "Rodar depreciação" e "Baixar" são inalcançáveis pela tela.
 * Valor = **id** da conta. O BE valida a natureza (despesa de depreciação = `Expense`); a mensagem aparece aqui.
 */
export function FixedAssetAccountsSection({ unitId, accounts }: FixedAssetAccountsSectionProps) {
  const { t, tRef } = useAccountingT();
  const [form, setForm] = useState<FormState>({ depreciationExpenseAccountId: '', disposalGainAccountId: '', disposalLossAccountId: '' });
  const [loading, setLoading] = useState(true);
  // Só salva depois de ler a configuração: com o GET falho o form fica vazio e um Salvar limparia as contas já configuradas (`null`).
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Relê a configuração depois de propor: o formulário mostra o vigente (F-FE-POL-4 a).
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
        setForm({
          depreciationExpenseAccountId: s.depreciationExpenseAccountId ?? '',
          disposalGainAccountId: s.disposalGainAccountId ?? '',
          disposalLossAccountId: s.disposalLossAccountId ?? '',
        });
      })
      .catch((err: unknown) => { if (!cancelled) setLoadError(resolveError(err, tRef.current('fixedAssets.accounts.error.load', 'Erro ao carregar as contas.'))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [unitId, tRef, reloadTick]);

  // Política versionada (FE-INCR-ACCOUNTING-POLICY-VERSION item 6): com contador ativo o mesmo patch vira proposta
  // `SCOPE_SETTINGS` (parcial — só as 3 chaves do imobilizado); a tela nunca diz "salvas" sem aplicar.
  const governed = useGovernedSave<FixedAssetAccountsPatch>({
    unitId,
    target: 'SCOPE_SETTINGS',
    put: async (patch) => { await accountingService.updateSettings(patch); },
    propose: async (patch) => {
      const v = await policyVersionsService.propose(toScopeSettingsProposal(patch));
      setReloadTick((n) => n + 1);
      return v;
    },
    saveErrorFallback: t('fixedAssets.accounts.error.save', 'Não foi possível salvar as contas.'),
  });
  const { reset: resetGoverned } = governed;

  const set = <K extends keyof FormState>(key: K, value: string) => {
    resetGoverned();
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function save() {
    await governed.submit(toAccountsPatch(unitId, form));
  }

  const busy = governed.busy;
  const error = loadError ?? governed.error;

  const placeholder = t('fixedAssets.selectAccount', 'Selecione a conta…');

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-neutral-500">
        {t('fixedAssets.accounts.help', 'A depreciação mensal exige a conta de despesa; a baixa exige as contas de ganho e de perda.')}
      </p>
      <Block label={t('fixedAssets.accounts.depreciationExpense', 'Despesa de depreciação')}>
        <FixedAssetAccountSelect accounts={accounts} value={form.depreciationExpenseAccountId} onChange={(id) => set('depreciationExpenseAccountId', id)} disabled={loading}
          ariaLabel={t('fixedAssets.accounts.depreciationExpense', 'Despesa de depreciação')} placeholder={placeholder} />
      </Block>
      <Block label={t('fixedAssets.accounts.disposalGain', 'Ganho na baixa')}>
        <FixedAssetAccountSelect accounts={accounts} value={form.disposalGainAccountId} onChange={(id) => set('disposalGainAccountId', id)} disabled={loading}
          ariaLabel={t('fixedAssets.accounts.disposalGain', 'Ganho na baixa')} placeholder={placeholder} />
      </Block>
      <Block label={t('fixedAssets.accounts.disposalLoss', 'Perda na baixa')}>
        <FixedAssetAccountSelect accounts={accounts} value={form.disposalLossAccountId} onChange={(id) => set('disposalLossAccountId', id)} disabled={loading}
          ariaLabel={t('fixedAssets.accounts.disposalLoss', 'Perda na baixa')} placeholder={placeholder} />
      </Block>
      {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      {governed.savedDirect && <div role="status" className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">{t('fixedAssets.accounts.saved', 'Contas salvas.')}</div>}
      {governed.proposed && (
        <div role="status" className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          {t('policy.owner.proposedAccounts', 'Contas enviadas ao contador (proposta v{{n}}). As contas acima continuam as vigentes até a aprovação.', { n: String(governed.proposed.version) })}
        </div>
      )}
      {!loadError && <GovernedOfferButton offer={governed.offer} busy={governed.busy} onAccept={() => void governed.acceptOffer()} />}
      {governed.pending && <PendingProposalBanner pending={governed.pending} unitId={unitId} partial />}
      {governed.active && <ActiveAccountantNotice active={governed.active} />}
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || loading || !loaded}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy
          ? t('fixedAssets.saving', 'Salvando…')
          : governed.active
            ? t('policy.owner.sendToAccountant', 'Enviar ao contador para aprovação')
            : t('fixedAssets.save', 'Salvar')}
      </button>
    </div>
  );
}
