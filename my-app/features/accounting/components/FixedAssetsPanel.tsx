import { useCallback, useEffect, useState } from 'react';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import { fixedAssetsService, type FixedAssetClass } from '../../../lib/services/fixedAssets.service';
import { useAccountingT } from '../lib/useAccountingT';
import { FixedAssetsSection } from './FixedAssetsSection';
import { FixedAssetClassesSection } from './FixedAssetClassesSection';
import { DepreciationRatesSection } from './DepreciationRatesSection';
import { FixedAssetAccountsSection } from './FixedAssetAccountsSection';

export type FixedAssetsSectionId = 'bens' | 'classes' | 'taxas' | 'contas';

const SECTIONS: Array<{ id: FixedAssetsSectionId; key: string; label: string }> = [
  { id: 'bens', key: 'fixedAssets.section.assets', label: 'Bens' },
  { id: 'classes', key: 'fixedAssets.section.classes', label: 'Classes' },
  { id: 'taxas', key: 'fixedAssets.section.rates', label: 'Taxas' },
  { id: 'contas', key: 'fixedAssets.section.accounts', label: 'Contas' },
];

export interface FixedAssetsPanelProps {
  unitId: string;
  /** O razão mudou (depreciação, reconciliação, ativação, baixa) — recarrega o balancete. */
  onLedgerChange?: () => void;
  onNavigateToPeriods?: () => void;
}

/**
 * FixedAssetsPanel (FE-INCR-FIXED-ASSETS PR-1, F-FAFE-4 → a) — aba "Imobilizado" do C8 com 4 seções: Bens,
 * Classes, Taxas e Contas. Dono do cache de classes e do plano de contas (contas folha, por id) que as seções
 * dividem. Shape = `<table>` + `Modal` como os demais painéis CRUD da contabilidade (F-FE-2 → a / F-FAFE-7 → a).
 */
export function FixedAssetsPanel({ unitId, onLedgerChange, onNavigateToPeriods }: FixedAssetsPanelProps) {
  const { t, tRef } = useAccountingT();
  const [section, setSection] = useState<FixedAssetsSectionId>('bens');
  const [classes, setClasses] = useState<FixedAssetClass[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);

  const reloadClasses = useCallback(() => {
    if (!unitId) return;
    fixedAssetsService
      .listClasses(unitId)
      .then((rows) => { setClasses(rows); setClassesError(null); })
      .catch(() => { setClasses([]); setClassesError(tRef.current('fixedAssets.error.classes', 'Não foi possível carregar as classes.')); });
  }, [unitId, tRef]);

  useEffect(() => { reloadClasses(); }, [reloadClasses]);

  // Plano de contas: só folhas (`acceptsEntries`); o valor dos selects é o **id**.
  useEffect(() => {
    if (!unitId) return;
    accountingService
      .getAccounts(unitId)
      .then((r) => setAccounts(r.accounts.filter((a) => a.acceptsEntries)))
      .catch(() => setAccounts([]));
  }, [unitId]);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="mb-4">
        <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('fixedAssets.title', 'Imobilizado')}</h2>
        <p className="text-sm text-neutral-500">
          {t('fixedAssets.subtitle', 'Bens, classes, taxas de depreciação e as contas que a depreciação mensal e a baixa usam.')}
        </p>
      </div>

      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-neutral-800" role="tablist" aria-label={t('fixedAssets.title', 'Imobilizado')}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${section === s.id ? 'border-b-2 border-emerald-400 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            {t(s.key, s.label)}
          </button>
        ))}
      </div>

      {classesError && <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{classesError}</div>}

      {section === 'bens' && (
        <FixedAssetsSection
          unitId={unitId}
          classes={classes}
          accounts={accounts}
          onLedgerChange={onLedgerChange}
          onNavigateToPeriods={onNavigateToPeriods}
          onNavigateToContas={() => setSection('contas')}
        />
      )}
      {section === 'classes' && <FixedAssetClassesSection unitId={unitId} classes={classes} accounts={accounts} onChanged={reloadClasses} />}
      {section === 'taxas' && <DepreciationRatesSection unitId={unitId} />}
      {section === 'contas' && <FixedAssetAccountsSection unitId={unitId} accounts={accounts} />}
    </section>
  );
}
