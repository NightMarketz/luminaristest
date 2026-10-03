import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  fixedAssetsService,
  type ActivateFixedAssetInput,
  type DisposeFixedAssetInput,
  type FixedAsset,
} from '../../../lib/services/fixedAssets.service';
import type { Account } from '../../../lib/services/accounting.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { parseBrl } from '../lib/parseBrl';
import { scopeToday } from '../lib/formatDate';
import { Field, inputClass } from './SpedGenerationPanel';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';

const isConflict = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 409;

interface CommandModalProps {
  /** `null` = fechado. */
  asset: FixedAsset | null;
  unitId: string;
  onClose: () => void;
  /** Comando aceito — o painel recarrega a lista e avisa o razão. */
  onDone: () => void;
  /** 409 de CAS (`version` divergente): o painel mostra "o bem mudou — recarregado" e recarrega. Nunca reenvia sozinho. */
  onConflict: () => void;
}

const cancelBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
const confirmBtn = 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50';

/**
 * ActivateAssetModal (item 12) — `POST /fixed-assets/:id/activate`. `openingAccumulatedCents` é opcional, com a
 * ajuda "obrigatório se a ativação for anterior ao 1º período aberto": o FE não conhece o período mais antigo,
 * o 400 do BE explica. Envia o `version` lido (CAS).
 */
export function ActivateAssetModal({ asset, unitId, onClose, onDone, onConflict }: CommandModalProps) {
  const { t, tRef } = useAccountingT();
  const [activatedAt, setActivatedAt] = useState(scopeToday());
  const [opening, setOpening] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setActivatedAt(scopeToday());
    setOpening('');
    setError(null);
    setBusy(false);
  }, [asset]);

  async function submit() {
    if (!asset) return;
    if (!activatedAt) {
      setError(tRef.current('fixedAssets.activate.error.dateRequired', 'Informe a data de ativação.'));
      return;
    }
    const payload: ActivateFixedAssetInput = {
      unitId,
      assetId: asset.id,
      activatedAt,
      openingAccumulatedCents: opening.trim() ? parseBrl(opening) : undefined,
      version: asset.version,
    };
    setBusy(true);
    setError(null);
    try {
      await fixedAssetsService.activateAsset(asset.id, payload);
      onDone();
    } catch (err: unknown) {
      if (isConflict(err)) onConflict();
      else setError(resolveError(err, tRef.current('fixedAssets.activate.error.generic', 'Não foi possível ativar o bem.')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={!!asset}
      onClose={() => { if (!busy) onClose(); }}
      title={t('fixedAssets.activate.title', 'Ativar bem')}
      themeColor="bg-emerald-600"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
          <button onClick={() => void submit()} disabled={busy} className={confirmBtn}>
            {busy ? t('fixedAssets.activate.activating', 'Ativando…') : t('fixedAssets.activate.confirm', 'Ativar')}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
        {asset && <p><span className="font-mono font-semibold text-neutral-100">{asset.code}</span> — {asset.description}</p>}
        <Field label={t('fixedAssets.activate.field.date', 'Data de ativação')}>
          <input type="date" value={activatedAt} onChange={(e) => setActivatedAt(e.target.value)} className={`w-full ${inputClass}`} />
        </Field>
        <Field label={t('fixedAssets.activate.field.opening', 'Depreciação acumulada de abertura (R$, opcional)')}>
          <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0,00" className={`w-full ${inputClass}`} />
        </Field>
        <p className="text-xs text-neutral-500">
          {t('fixedAssets.activate.help', 'Obrigatória se a ativação for anterior ao 1º período aberto — o servidor avisa se faltar.')}
        </p>
        {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
    </Modal>
  );
}

interface DisposeModalProps extends CommandModalProps {
  /** Contas folha (`acceptsEntries`) para a contrapartida; sem filtro de natureza (o BE não filtra). */
  accounts: Account[];
}

/**
 * DisposeAssetModal (item 13) — `POST /fixed-assets/:id/dispose`. `proceedsCents` 0 = imprestável; com valor > 0
 * a contrapartida é obrigatória (`counterpartAccountId` ⇔ `proceedsCents > 0`, F-FA13) e o envio é bloqueado
 * localmente sem ela. Envia o `version` lido (CAS).
 */
export function DisposeAssetModal({ asset, unitId, accounts, onClose, onDone, onConflict }: DisposeModalProps) {
  const { t, tRef } = useAccountingT();
  const [disposedAt, setDisposedAt] = useState(scopeToday());
  const [proceeds, setProceeds] = useState('');
  const [counterpart, setCounterpart] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setDisposedAt(scopeToday());
    setProceeds('');
    setCounterpart('');
    setError(null);
    setBusy(false);
  }, [asset]);

  const proceedsCents = parseBrl(proceeds);

  async function submit() {
    if (!asset) return;
    if (!disposedAt) {
      setError(tRef.current('fixedAssets.dispose.error.dateRequired', 'Informe a data da baixa.'));
      return;
    }
    if (proceedsCents > 0 && !counterpart) {
      setError(tRef.current('fixedAssets.dispose.error.counterpartRequired', 'Informe a conta de contrapartida do valor recebido.'));
      return;
    }
    const payload: DisposeFixedAssetInput = {
      unitId,
      assetId: asset.id,
      disposedAt,
      proceedsCents,
      counterpartAccountId: proceedsCents > 0 ? counterpart : undefined,
      version: asset.version,
    };
    setBusy(true);
    setError(null);
    try {
      await fixedAssetsService.disposeAsset(asset.id, payload);
      onDone();
    } catch (err: unknown) {
      if (isConflict(err)) onConflict();
      else setError(resolveError(err, tRef.current('fixedAssets.dispose.error.generic', 'Não foi possível baixar o bem.')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={!!asset}
      onClose={() => { if (!busy) onClose(); }}
      title={t('fixedAssets.dispose.title', 'Baixar bem')}
      themeColor="bg-amber-600"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
          <button onClick={() => void submit()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
            {busy ? t('fixedAssets.dispose.disposing', 'Baixando…') : t('fixedAssets.dispose.confirm', 'Confirmar baixa')}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
        {asset && <p><span className="font-mono font-semibold text-neutral-100">{asset.code}</span> — {asset.description}</p>}
        <Field label={t('fixedAssets.dispose.field.date', 'Data da baixa')}>
          <input type="date" value={disposedAt} onChange={(e) => setDisposedAt(e.target.value)} className={`w-full ${inputClass}`} />
        </Field>
        <Field label={t('fixedAssets.dispose.field.proceeds', 'Valor recebido (R$) — 0 se imprestável')}>
          <input inputMode="decimal" value={proceeds} onChange={(e) => setProceeds(e.target.value)} placeholder="0,00" className={`w-full ${inputClass}`} />
        </Field>
        {proceedsCents > 0 && (
          <div className="flex flex-col gap-1 text-xs text-neutral-400">
            <span>{t('fixedAssets.dispose.field.counterpart', 'Conta de contrapartida (onde o valor entrou)')}</span>
            <FixedAssetAccountSelect
              accounts={accounts}
              value={counterpart}
              onChange={setCounterpart}
              ariaLabel={t('fixedAssets.dispose.field.counterpart', 'Conta de contrapartida (onde o valor entrou)')}
              placeholder={t('fixedAssets.selectAccount', 'Selecione a conta…')}
            />
          </div>
        )}
        {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
    </Modal>
  );
}
