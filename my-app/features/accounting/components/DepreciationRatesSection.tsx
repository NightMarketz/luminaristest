import { useCallback, useEffect, useState } from 'react';
import { FiEyeOff, FiPlusCircle } from 'react-icons/fi';
import {
  bpToPercent,
  fixedAssetsService,
  percentToBp,
  type DepreciationRate,
  type UpsertDepreciationRateInput,
} from '../../../lib/services/fixedAssets.service';
import { Modal } from '../../../components/ui/Modal';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

export interface RateFormState {
  ncm: string;
  description: string;
  lifeYears: string;
  percent: string;
  justification: string;
}

export const emptyRateForm = (): RateFormState => ({ ncm: '', description: '', lifeYears: '', percent: '', justification: '' });

/** Forma do `UpsertDepreciationRateSchema`: descrição, vida útil, taxa e justificativa obrigatórias. Sufixo de `fixedAssets.rate.error.*`. */
export function validateRateForm(f: RateFormState): string | null {
  if (!f.description.trim()) return 'descriptionRequired';
  const years = Number(f.lifeYears);
  if (!Number.isInteger(years) || years < 1) return 'lifeYearsInvalid';
  const bp = percentToBp(f.percent);
  if (!Number.isInteger(bp) || bp < 1 || bp > 10000) return 'rateInvalid';
  if (!f.justification.trim()) return 'justificationRequired';
  return null;
}

/** Taxa em % digitada → basis points (×100). A taxa nasce `CUSTOM` no servidor. */
export function toRatePayload(unitId: string, f: RateFormState): UpsertDepreciationRateInput {
  return {
    unitId,
    ncm: f.ncm.trim() || undefined,
    description: f.description.trim(),
    lifeYears: Number(f.lifeYears),
    annualRateBp: percentToBp(f.percent),
    justification: f.justification.trim(),
  };
}

const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

export interface DepreciationRatesSectionProps {
  unitId: string;
}

/**
 * Seção "Taxas" (FE-INCR-FIXED-ASSETS itens 23–26): catálogo do Anexo III (IN RFB 1.700/2017) + taxas `CUSTOM`.
 * O 1º `GET` do escopo semeia o Anexo III no BE (lazy) — aqui é só um carregamento normal, sem botão "semear".
 * Sem edição (o BE não tem rota). "Ocultar" nunca apaga: o bem que já usa a taxa mantém o snapshot.
 */
export function DepreciationRatesSection({ unitId }: DepreciationRatesSectionProps) {
  const { t, tRef } = useAccountingT();
  const [rates, setRates] = useState<DepreciationRate[]>([]);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RateFormState>(emptyRateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toHide, setToHide] = useState<DepreciationRate | null>(null);
  const [hideError, setHideError] = useState<string | null>(null);

  const set = <K extends keyof RateFormState>(key: K, value: RateFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const fetchRates = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      setRates(await fixedAssetsService.listRates(unitId, includeHidden));
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('fixedAssets.rate.error.load', 'Erro ao carregar as taxas.')));
    } finally {
      setLoading(false);
    }
  }, [unitId, includeHidden, tRef]);

  useEffect(() => { void fetchRates(); }, [fetchRates]);

  function openNew() {
    setForm(emptyRateForm());
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    const invalid = validateRateForm(form);
    if (invalid) {
      setFormError(tRef.current(`fixedAssets.rate.error.${invalid}`, invalid));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await fixedAssetsService.createRate(toRatePayload(unitId, form));
      setModalOpen(false);
      void fetchRates();
    } catch (err: unknown) {
      setFormError(resolveError(err, tRef.current('fixedAssets.rate.error.save', 'Não foi possível salvar a taxa.')));
    } finally {
      setBusy(false);
    }
  }

  async function runHide() {
    if (!toHide) return;
    setBusy(true);
    setHideError(null);
    try {
      await fixedAssetsService.hideRate(toHide.id, unitId);
      setToHide(null);
      void fetchRates();
    } catch (err: unknown) {
      setHideError(resolveError(err, tRef.current('fixedAssets.rate.error.hide', 'Não foi possível ocultar a taxa.')));
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700';
  const cancelBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-800" />
          {t('fixedAssets.rate.showHidden', 'Mostrar ocultas')}
        </label>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <FiPlusCircle size={14} />
          {t('fixedAssets.rate.new', 'Nova taxa')}
        </button>
      </div>

      {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {loading && <div className="py-8 text-center text-sm text-neutral-400">{t('fixedAssets.loading', 'Carregando…')}</div>}
      {!loading && rates.length === 0 && !error && (
        <div className="py-8 text-center text-sm text-neutral-500">{t('fixedAssets.rate.empty', 'Nenhuma taxa cadastrada.')}</div>
      )}
      {!loading && rates.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('fixedAssets.rate.col.ncm', 'NCM')}</th>
                <th className={th}>{t('fixedAssets.col.description', 'Descrição')}</th>
                <th className={`${th} text-right`}>{t('fixedAssets.rate.col.life', 'Vida útil (anos)')}</th>
                <th className={`${th} text-right`}>{t('fixedAssets.rate.col.rate', 'Taxa (% a.a.)')}</th>
                <th className={th}>{t('fixedAssets.rate.col.source', 'Origem')}</th>
                <th className={th}>{t('fixedAssets.rate.col.justification', 'Justificativa')}</th>
                <th className={th}>{t('fixedAssets.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => {
                const hidden = r.hiddenAt !== null;
                return (
                  <tr key={r.id} className={`border-b border-neutral-800/60 last:border-0 ${hidden ? 'opacity-50' : ''}`}>
                    <td className={`${td} font-mono text-xs text-neutral-100`}>{r.ncm ?? <span className="text-neutral-600">—</span>}</td>
                    <td className={`${td} text-neutral-200`}>
                      {r.description}
                      {hidden && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-neutral-700/60 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
                          {t('fixedAssets.rate.hiddenBadge', 'oculta')}
                        </span>
                      )}
                    </td>
                    <td className={`${td} text-right`}>{r.lifeYears}</td>
                    <td className={`${td} text-right font-mono text-xs`}>{bpToPercent(r.annualRateBp)}%</td>
                    <td className={td}>
                      <span className="inline-flex items-center rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">{r.source}</span>
                      {r.sourceUrl && isHttpUrl(r.sourceUrl) && (
                        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-emerald-400 underline">
                          {t('fixedAssets.rate.source', 'fonte')}
                        </a>
                      )}
                    </td>
                    <td className={`${td} max-w-[16rem] truncate text-xs text-neutral-400`} title={r.justification ?? undefined}>{r.justification ?? ''}</td>
                    <td className={td}>
                      {!hidden && (
                        <button type="button" onClick={() => { setHideError(null); setToHide(r); }} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}>
                          <FiEyeOff size={11} /> {t('fixedAssets.rate.hide', 'Ocultar')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { if (!busy) setModalOpen(false); }}
        title={t('fixedAssets.rate.modal.title', 'Nova taxa de depreciação')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
            <button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('fixedAssets.saving', 'Salvando…') : t('fixedAssets.save', 'Salvar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('fixedAssets.rate.field.ncm', 'NCM (opcional)')}>
              <input value={form.ncm} onChange={(e) => set('ncm', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('fixedAssets.rate.field.life', 'Vida útil (anos)')}>
              <input type="number" min={1} step={1} value={form.lifeYears} onChange={(e) => set('lifeYears', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          <Field label={t('fixedAssets.col.description', 'Descrição')}>
            <input value={form.description} onChange={(e) => set('description', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.rate.field.percent', 'Taxa (% a.a.)')}>
            <input inputMode="decimal" value={form.percent} onChange={(e) => set('percent', e.target.value)} placeholder="10" className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.rate.field.justification', 'Justificativa (obrigatória)')}>
            <input value={form.justification} onChange={(e) => set('justification', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          {formError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{formError}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={!!toHide}
        onClose={() => { if (!busy) setToHide(null); }}
        title={t('fixedAssets.rate.hideModal.title', 'Ocultar taxa')}
        themeColor="bg-amber-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setToHide(null); }} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
            <button onClick={() => void runHide()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
              {busy ? t('fixedAssets.rate.hiding', 'Ocultando…') : t('fixedAssets.rate.hideModal.confirm', 'Confirmar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toHide && <p><span className="font-mono font-semibold text-neutral-100">{toHide.ncm ?? '—'}</span> — {toHide.description}</p>}
          <p className="text-neutral-400">
            {t('fixedAssets.rate.hideModal.note', 'Deixa de aparecer na escolha; bens que já usam a taxa continuam com o snapshot.')}
          </p>
          {hideError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{hideError}</div>}
        </div>
      </Modal>
    </div>
  );
}
