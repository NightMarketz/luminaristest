import React, { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { ConfirmModal } from '../../../components/ui/feedback/ConfirmModal';
import { notify } from '../../../lib/notifications/notify';
import {
  accountingBindingService,
  type ActivateDefaultBindingResultInput,
} from '../../../lib/services/accountingBinding.service';
import { useUnitAccountingActivation } from '../hooks/useUnitAccountingActivation';
import {
  ACTIVATION_SECTORS,
  ACTIVATION_SECTOR_LABELS,
  DEFAULT_ACTIVATION_SECTOR,
  type ActivationSector,
} from '../lib/activationSectors';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';

type BlockingIssue = NonNullable<ActivateDefaultBindingResultInput['blocking']>[number];

export interface AccountingActivationBannerProps {
  unitId: string;
  onNavigateToPeriods: () => void;
  /** Só passa quando a aba Pendências existe em `TABS` (item 8): sem ela o link não renderiza. */
  onNavigateToPendencias?: () => void;
}

/** Rótulo i18n dos códigos de pré-condição conhecidos (item 6); os demais mostram a `message` do BE. */
const KNOWN_BLOCKING: Record<string, { key: string; fallback: string }> = {
  CHART_OF_ACCOUNTS_EMPTY: { key: 'activation.blocking.CHART_OF_ACCOUNTS_EMPTY', fallback: 'O plano de contas da unidade está vazio.' },
  ACCOUNTING_PERIOD_NOT_OPEN: {
    key: 'activation.blocking.ACCOUNTING_PERIOD_NOT_OPEN',
    fallback: 'O período {{period}} está fechado — reabra-o antes de ativar.',
  },
  EVENT_COVERAGE_MISSING: {
    key: 'activation.blocking.EVENT_COVERAGE_MISSING',
    fallback: 'Há evento da operação sem regra contábil.',
  },
};

/**
 * Faixa de ativação da contabilidade da unidade (LAC-B, FE-INCR-BINDING-ACTIVATION-screen-brief itens 3–9; EMENDA-1).
 * Renderiza só com a unidade sem binding `Active` (F-BA-1 a) e convive sempre com o onboarding do I4 (F-BA-4 a). A
 * confirmação lista os 2 efeitos e manda as duas flags `true` (F-BA-6 a); a recarga dos mappers é do BE (EMENDA-1), a
 * tela só mostra o resultado. Quem a monta é a AccountingView, e nunca no modo cliente (item 4).
 *
 * Bespoke × `components/ui/feedback/Alert`: o `Alert` canônico recebe só uma `message` string (sem slot para seletor,
 * botão e lista de bloqueantes) e usa a paleta clara; a faixa segue o banner local da view (`PendingInvitesBanner`).
 */
export function AccountingActivationBanner({ unitId, onNavigateToPeriods, onNavigateToPendencias }: AccountingActivationBannerProps) {
  const { t } = useAccountingT();
  const activation = useUnitAccountingActivation(unitId);
  const [sector, setSector] = useState<ActivationSector>(DEFAULT_ACTIVATION_SECTOR);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState<BlockingIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState(false);

  const sectorLabel = (s: ActivationSector) => t(ACTIVATION_SECTOR_LABELS[s].key, ACTIVATION_SECTOR_LABELS[s].fallback);

  async function activate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await accountingBindingService.activateDefault({
        unitId,
        sectorKey: sector,
        installChartIfEmpty: true,
        openCurrentPeriodIfMissing: true,
      });
      setConfirmOpen(false);
      if (result.status === 'Draft') {
        setBlocking(result.blocking ?? []);
        return;
      }
      setBlocking([]);
      setJustActivated(true);
      notify(t('activation.success', 'Contabilidade automática ativada: as vendas desta unidade passam a gerar lançamento.'), 'success');
      activation.reload();
    } catch (e: unknown) {
      setConfirmOpen(false);
      setBlocking([]); // a lista de um Draft anterior não é o estado desta tentativa
      setError(resolveError(e, t('activation.error', 'Não foi possível ativar a contabilidade.')));
    } finally {
      setBusy(false);
    }
  }

  if (activation.state === 'active') {
    if (!justActivated || !onNavigateToPendencias) return null;
    return (
      <div role="status" data-testid="accounting-activation-success" className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
        <span className="inline-flex items-center gap-2">
          <FiCheckCircle size={16} />
          {t('activation.successShort', 'Contabilidade automática ativa.')}
        </span>
        <button
          type="button"
          onClick={onNavigateToPendencias}
          className="rounded-xl border border-emerald-800/60 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/30"
        >
          {t('activation.pendenciasLink', 'Ver pendências da unidade')}
        </button>
      </div>
    );
  }
  if (activation.state !== 'inactive') return null;

  const blockingLabel = (issue: BlockingIssue) => {
    const known = KNOWN_BLOCKING[issue.code];
    return known ? t(known.key, known.fallback, { period: issue.period ?? '' }) : issue.message;
  };

  return (
    <div role="region" aria-label={t('activation.regionLabel', 'Ativação da contabilidade')} data-testid="accounting-activation-banner" className="mb-6 space-y-3 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-medium">
          <FiAlertTriangle size={16} />
          {t('activation.inactive', 'A contabilidade automática desta unidade não está ativa — as vendas não geram lançamento.')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-amber-300/80">{t('activation.sectorLabel', 'Setor')}</span>
            <select
              aria-label={t('activation.sectorLabel', 'Setor')}
              value={sector}
              onChange={(e) => setSector(e.target.value as ActivationSector)} // ponytail: as só na folha string → união (options = ACTIVATION_SECTORS)
              disabled={busy}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
            >
              {ACTIVATION_SECTORS.map((s) => (
                <option key={s} value={s}>{sectorLabel(s)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {t('activation.button', 'Ativar contabilidade')}
          </button>
        </div>
      </div>

      {blocking.length > 0 && (
        <div data-testid="accounting-activation-blocking" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-neutral-200">
          <p className="mb-1 text-xs font-semibold text-neutral-400">{t('activation.blockingTitle', 'A ativação não foi concluída:')}</p>
          <ul className="space-y-1">
            {blocking.map((issue, i) => (
              <li key={`${issue.code}-${i}`} className="flex flex-wrap items-center gap-2">
                <span>{blockingLabel(issue)}</span>
                {issue.code === 'ACCOUNTING_PERIOD_NOT_OPEN' && (
                  <button type="button" onClick={onNavigateToPeriods} className="text-xs font-semibold text-emerald-400 underline hover:text-emerald-300">
                    {t('activation.goToPeriods', 'Ir para Períodos')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-red-300">
          {error}
        </p>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { if (!busy) setConfirmOpen(false); }}
        onConfirm={() => void activate()}
        isLoading={busy}
        variant="info"
        title={t('activation.confirm.title', 'Ativar a contabilidade desta unidade?')}
        message={t(
          'activation.confirm.message',
          'Setor: {{sector}}. Ao confirmar, (1) o plano de contas padrão é instalado se o da unidade estiver vazio e (2) o período do mês corrente é aberto se ainda não existir.',
          { sector: sectorLabel(sector) },
        )}
        confirmLabel={t('activation.confirm.confirmLabel', 'Ativar')}
        cancelLabel={t('activation.confirm.cancelLabel', 'Cancelar')}
      />
    </div>
  );
}
