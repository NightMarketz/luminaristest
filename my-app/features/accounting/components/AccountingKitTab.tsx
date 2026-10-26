import React, { useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiChevronRight, FiLoader, FiPackage } from 'react-icons/fi';
import { ConfirmModal } from '../../../components/ui/feedback/ConfirmModal';
import { notify } from '../../../lib/notifications/notify';
import { accountingBindingService } from '../../../lib/services/accountingBinding.service';
import {
  accountingKitService,
  type KitInstallationView,
  type KitUpgradePendingView,
} from '../../../lib/services/accountingKit.service';
import { useUnitKit } from '../hooks/useUnitKit';
import { ACTIVATION_SECTOR_LABELS, type ActivationSector } from '../lib/activationSectors';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { ActivationBlockingList, type ActivationBlockingIssue } from './ActivationBlockingList';

export interface AccountingKitTabProps {
  unitId: string;
  /** Recarrega a ativação (e o kit) de quem monta depois de uma retomada (item 8). */
  onActivationChanged: () => void;
}

type Warning = KitInstallationView['steps']['warnings'][number];
type Reason = KitUpgradePendingView['reason'];

/** Item 9 (F-KA-4 b): o texto de cada aviso do referencial. Só texto, sem link (a tela do regime é outro nó). */
const WARNING_LABELS: Record<Warning, { key: string; fallback: string }> = {
  KIT_REFERENTIAL_SKIPPED_NO_REGIME: {
    key: 'kit.warnings.KIT_REFERENTIAL_SKIPPED_NO_REGIME',
    fallback: 'O referencial não foi instalado porque a empresa não tem regime definido.',
  },
  KIT_REFERENTIAL_SKIPPED_NO_CATALOG: {
    key: 'kit.warnings.KIT_REFERENTIAL_SKIPPED_NO_CATALOG',
    fallback: 'Não há referencial publicado para o ano.',
  },
};

/** Item 7: rótulo de cada motivo de conflito do `CONFLICT_REASONS` do server; código desconhecido mostra o código cru. */
const REASON_LABELS: Record<Reason, { key: string; fallback: string }> = {
  override: { key: 'kit.reasons.override', fallback: 'A conta do papel foi ajustada nesta unidade' },
  account_deleted_by_user: { key: 'kit.reasons.account_deleted_by_user', fallback: 'A conta foi apagada nesta unidade' },
  account_changed_in_use: { key: 'kit.reasons.account_changed_in_use', fallback: 'A conta mudou no kit e já tem lançamentos' },
  field_set_by_user: { key: 'kit.reasons.field_set_by_user', fallback: 'O campo já foi preenchido nesta unidade' },
  referential_year_frozen: { key: 'kit.reasons.referential_year_frozen', fallback: 'O referencial do ano já foi usado numa ECD' },
  referential_mapped_differently: {
    key: 'kit.reasons.referential_mapped_differently',
    fallback: 'A conta já tem outro código referencial nesta unidade',
  },
};

const isActivationSector = (key: string): key is ActivationSector => key in ACTIVATION_SECTOR_LABELS;

/**
 * Aba "Kit de setor" da AccountingView (FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief §10, F-KA-1 c): setor e versão
 * instalada, versão mais nova com o changelog (F-KA-5 a), avisos do referencial (F-KA-4 b), pendências da atualização
 * só leitura (F-KA-2, PR-1) e a instalação que parou no meio com "Retomar instalação" só em `FAILED` (F-KA-3 a+ii).
 * Quem a monta é a AccountingView, só com kit na unidade e nunca no modo cliente (F-KA-6 a).
 *
 * Bespoke × `components/ui/feedback/Alert`: mesma justificativa da faixa de ativação — o `Alert` recebe só uma
 * `message` string, sem slot para a lista de bloqueantes e o botão.
 */
export function AccountingKitTab({ unitId, onActivationChanged }: AccountingKitTabProps) {
  const { t } = useAccountingT();
  const unitKit = useUnitKit(unitId, { enabled: true });

  if (unitKit.state === 'loading') {
    return <p className="py-10 text-center text-sm text-neutral-500">{t('kit.loading', 'Carregando o kit de setor…')}</p>;
  }
  if (unitKit.state === 'error') {
    return (
      <p role="alert" className="rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {t('kit.loadError', 'Não foi possível carregar o kit de setor da unidade.')}
      </p>
    );
  }
  if (unitKit.state === 'none') {
    return <p className="py-10 text-center text-sm text-neutral-500">{t('kit.none', 'Esta unidade não tem kit de setor instalado.')}</p>;
  }
  const { kit, reload } = unitKit;
  return <KitDetails unitId={unitId} kit={kit} reloadKit={reload} onActivationChanged={onActivationChanged} />;
}

function KitDetails({
  unitId,
  kit,
  reloadKit,
  onActivationChanged,
}: {
  unitId: string;
  kit: KitInstallationView;
  reloadKit: () => void;
  onActivationChanged: () => void;
}) {
  const { t } = useAccountingT();
  const [changelogOpen, setChangelogOpen] = useState(false);

  const sectorLabel = isActivationSector(kit.kitKey)
    ? t(ACTIVATION_SECTOR_LABELS[kit.kitKey].key, ACTIVATION_SECTOR_LABELS[kit.kitKey].fallback)
    : kit.kitKey;
  const hasNewer = kit.latestVersion > kit.kitVersion;

  return (
    <div data-testid="accounting-kit-tab" className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-4 text-sm text-neutral-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-2xl bg-emerald-600/15 p-2 text-emerald-400">
            <FiPackage size={18} />
          </span>
          <div>
            <p className="font-semibold text-neutral-100" data-testid="accounting-kit-sector">{sectorLabel}</p>
            <p className="text-neutral-400" data-testid="accounting-kit-version">
              {hasNewer
                ? t('kit.versionNewer', 'Versão {{installed}} instalada · versão {{latest}} disponível', {
                    installed: String(kit.kitVersion),
                    latest: String(kit.latestVersion),
                  })
                : t('kit.version', 'Versão {{installed}}', { installed: String(kit.kitVersion) })}
            </p>
          </div>
        </div>

        {kit.lastRun?.status === 'FAILED' && (
          <p className="mt-3 inline-flex items-center gap-2 text-amber-300" data-testid="accounting-kit-last-run-failed">
            <FiAlertTriangle size={14} />
            {t('kit.lastRunFailed', 'A última atualização do kit falhou.')}
          </p>
        )}

        {hasNewer && kit.changelog.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={changelogOpen}
              onClick={() => setChangelogOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {changelogOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              {t('kit.changelog', 'O que muda nas versões novas')}
            </button>
            {changelogOpen && (
              <ul data-testid="accounting-kit-changelog" className="mt-2 space-y-2 text-xs text-neutral-300">
                {kit.changelog.map((c) => (
                  <li key={c.kitVersion}>
                    <p className="font-semibold text-neutral-400">{t('kit.changelogVersion', 'Versão {{version}}', { version: String(c.kitVersion) })}</p>
                    <ul className="ml-4 list-disc">
                      {c.entries.map((entry, i) => (
                        <li key={i}>{entry}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <KitInstallStatus unitId={unitId} kit={kit} reloadKit={reloadKit} onActivationChanged={onActivationChanged} />

      {kit.steps.warnings.length > 0 && (
        <ul data-testid="accounting-kit-warnings" className="space-y-1 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {kit.steps.warnings.map((w) => (
            <li key={w} className="inline-flex items-center gap-2">
              <FiAlertTriangle size={14} />
              {WARNING_LABELS[w] ? t(WARNING_LABELS[w].key, WARNING_LABELS[w].fallback) : w}
            </li>
          ))}
        </ul>
      )}

      {kit.openPendingCount > 0 && <KitPendingList unitId={unitId} count={kit.openPendingCount} />}
    </div>
  );
}

/** Item 8 (F-KA-3 a+ii): `FAILED` ⇒ aviso com o passo + "Retomar instalação"; `INSTALLING` ⇒ "em andamento", sem botão. */
function KitInstallStatus({
  unitId,
  kit,
  reloadKit,
  onActivationChanged,
}: {
  unitId: string;
  kit: KitInstallationView;
  reloadKit: () => void;
  onActivationChanged: () => void;
}) {
  const { t } = useAccountingT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState<ActivationBlockingIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (kit.status === 'INSTALLING') {
    return (
      <p data-testid="accounting-kit-installing" className="inline-flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300">
        <FiLoader size={14} />
        {t('kit.installing', 'Instalação do kit em andamento.')}
      </p>
    );
  }
  if (kit.status !== 'FAILED') return null;

  async function resume() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await accountingBindingService.activateDefault({
        unitId,
        sectorKey: kit.kitKey,
        installChartIfEmpty: true,
        openCurrentPeriodIfMissing: true,
      });
      setConfirmOpen(false);
      if (result.status === 'Draft') {
        setBlocking(result.blocking ?? []);
      } else {
        setBlocking([]);
        notify(t('kit.resume.success', 'Instalação do kit concluída.'), 'success');
      }
      reloadKit();
      onActivationChanged();
    } catch (e: unknown) {
      setConfirmOpen(false);
      setBlocking([]);
      setError(resolveError(e, t('kit.resume.error', 'Não foi possível retomar a instalação do kit.')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="accounting-kit-failed" className="space-y-3 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-medium">
          <FiAlertTriangle size={16} />
          {t('kit.failed', 'A instalação do kit parou no meio, no passo {{step}} de 7.', { step: String(kit.steps.lastCompletedStep + 1) })}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {t('kit.resume.button', 'Retomar instalação')}
        </button>
      </div>

      <ActivationBlockingList blocking={blocking} />

      {error && (
        <p role="alert" className="rounded-2xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-red-300">
          {error}
        </p>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { if (!busy) setConfirmOpen(false); }}
        onConfirm={() => void resume()}
        isLoading={busy}
        variant="info"
        title={t('kit.resume.confirm.title', 'Retomar a instalação do kit?')}
        message={t(
          'kit.resume.confirm.message',
          'A instalação continua do passo {{step}}; os passos já concluídos não são refeitos.',
          { step: String(kit.steps.lastCompletedStep + 1) },
        )}
        confirmLabel={t('kit.resume.confirm.confirmLabel', 'Retomar')}
        cancelLabel={t('kit.resume.confirm.cancelLabel', 'Cancelar')}
      />
    </div>
  );
}

/** Item 7 (F-KA-2, PR-1): contador + lista SOMENTE LEITURA das pendências abertas, carregada uma vez ao abrir a aba. */
function KitPendingList({ unitId, count }: { unitId: string; count: number }) {
  const { t } = useAccountingT();
  const [rows, setRows] = useState<KitUpgradePendingView[] | null>(null);
  const [error, setError] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    const req = ++reqRef.current;
    accountingKitService
      .listPending(unitId, 'OPEN')
      .then((r) => { if (req === reqRef.current) setRows(r); })
      .catch(() => { if (req === reqRef.current) setError(true); });
  }, [unitId]);

  const reasonLabel = (reason: string) => {
    const known = REASON_LABELS[reason as Reason]; // ponytail: folha string → união; código fora da lista cai no cru
    return known ? t(known.key, known.fallback) : reason;
  };

  return (
    <section data-testid="accounting-kit-pending" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-4 text-sm text-neutral-200">
      <p className="font-semibold text-neutral-100">
        {t('kit.pending.count', 'Pendências da atualização do kit: {{total}}', { total: String(count) })}
      </p>
      {error && <p role="alert" className="mt-2 text-red-300">{t('kit.pending.error', 'Não foi possível carregar as pendências.')}</p>}
      {rows && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-neutral-800">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-mono text-xs text-neutral-300">{p.itemKey}</span>
              <span className="text-neutral-400">{reasonLabel(p.reason)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
