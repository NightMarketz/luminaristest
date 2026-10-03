import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  bpToPercent,
  fixedAssetsService,
  percentToBp,
  type CreateFixedAssetInput,
  type DepreciationRate,
  type FixedAsset,
  type FixedAssetClass,
  type UpdateFixedAssetInput,
} from '../../../lib/services/fixedAssets.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { parseBrl } from '../lib/parseBrl';
import { scopeToday } from '../lib/formatDate';
import { Field, inputClass } from './SpedGenerationPanel';
import { CatalogCombobox, FieldBlock as Block, type CatalogOption } from './CatalogCombobox';

export interface FixedAssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  classes: FixedAssetClass[];
  /** When set, edits this asset (só `PENDING_ACTIVATION` — o painel já esconde o botão nos demais status). */
  editing?: FixedAsset | null;
  onSuccess: () => void;
}

export type RateMode = 'catalog' | 'explicit';

export interface AssetFormState {
  classId: string;
  code: string;
  description: string;
  ncmPrefix: string;
  quantity: string;
  cost: string;
  residual: string;
  acquiredAt: string;
  rateMode: RateMode;
  rateId: string;
  /** Taxa explícita digitada em % a.a. ("33,3") — convertida ×100 para basis points no envio. */
  explicitPercent: string;
  /** Taxa contábil divergente (bloco recolhido). */
  bookDiverges: boolean;
  bookPercent: string;
  bookJustification: string;
}

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function emptyAssetForm(): AssetFormState {
  return {
    classId: '', code: '', description: '', ncmPrefix: '', quantity: '1', cost: '', residual: '',
    acquiredAt: scopeToday(), rateMode: 'catalog', rateId: '', explicitPercent: '',
    bookDiverges: false, bookPercent: '', bookJustification: '',
  };
}

export function assetToForm(a: FixedAsset): AssetFormState {
  return {
    classId: a.classId, code: a.code, description: a.description, ncmPrefix: a.ncmPrefix ?? '',
    quantity: String(a.quantity), cost: centsToInput(a.costCents), residual: a.residualValueCents ? centsToInput(a.residualValueCents) : '',
    acquiredAt: a.acquiredAt.slice(0, 10),
    rateMode: a.rateId ? 'catalog' : 'explicit', rateId: a.rateId ?? '', explicitPercent: bpToPercent(a.annualRateBp),
    bookDiverges: a.bookAnnualRateBp !== null, bookPercent: a.bookAnnualRateBp !== null ? bpToPercent(a.bookAnnualRateBp) : '',
    bookJustification: a.bookRateJustification ?? '',
  };
}

const validBp = (bp: number) => Number.isInteger(bp) && bp >= 1 && bp <= 10000;

/**
 * Validação local — espelha só o que é FORMA do DTO (`CreateFixedAssetSchema`): XOR de taxa, residual < custo,
 * justificativa quando há taxa contábil. Regra de negócio fica no BE (aparece por `resolveError`).
 * Devolve o sufixo da chave i18n `fixedAssets.asset.error.*`, ou `null` quando válido.
 */
export function validateAssetForm(f: AssetFormState): string | null {
  if (!f.classId) return 'classRequired';
  if (!f.code.trim()) return 'codeRequired';
  if (!f.description.trim()) return 'descriptionRequired';
  const qty = Number(f.quantity);
  if (!Number.isInteger(qty) || qty < 1) return 'quantityInvalid';
  const cost = parseBrl(f.cost);
  if (cost <= 0) return 'costRequired';
  if (parseBrl(f.residual) >= cost) return 'residualTooHigh';
  if (!f.acquiredAt) return 'acquiredRequired';
  if (f.rateMode === 'catalog' && !f.rateId) return 'rateRequired';
  if (f.rateMode === 'explicit' && !validBp(percentToBp(f.explicitPercent))) return 'rateInvalid';
  if (f.bookDiverges) {
    if (!validBp(percentToBp(f.bookPercent))) return 'bookRateInvalid';
    if (!f.bookJustification.trim()) return 'bookJustificationRequired';
  }
  return null;
}

/** XOR do DTO: com taxa do catálogo vai só `rateId`; com taxa explícita, só `annualRateBp`. */
export function toCreatePayload(unitId: string, f: AssetFormState): CreateFixedAssetInput {
  return {
    unitId,
    classId: f.classId,
    code: f.code.trim(),
    description: f.description.trim(),
    ncmPrefix: f.ncmPrefix.trim() || undefined,
    quantity: Number(f.quantity),
    costCents: parseBrl(f.cost),
    residualValueCents: parseBrl(f.residual),
    acquiredAt: f.acquiredAt,
    rateId: f.rateMode === 'catalog' ? f.rateId : undefined,
    annualRateBp: f.rateMode === 'explicit' ? percentToBp(f.explicitPercent) : undefined,
    bookAnnualRateBp: f.bookDiverges ? percentToBp(f.bookPercent) : undefined,
    bookRateJustification: f.bookDiverges ? f.bookJustification.trim() : undefined,
  };
}

/**
 * PUT só com o que mudou (+ `unitId`/`assetId`). `null` limpa NCM e a taxa contábil.
 * Trocar a taxa do catálogo manda TAMBÉM o `annualRateBp` dela: o `updateAsset` do BE grava só o que recebe e NÃO recalcula
 * a taxa a partir do `rateId` (a depreciação lê `annualRateBp`) — sem isso o bem ficaria ligado à taxa nova e depreciaria
 * pela antiga, em silêncio (achado do review independente; o `UpdateFixedAssetSchema` não tem XOR).
 */
export function toUpdatePayload(unitId: string, original: FixedAsset, f: AssetFormState, rates: DepreciationRate[]): UpdateFixedAssetInput {
  const ncm = f.ncmPrefix.trim();
  const cost = parseBrl(f.cost);
  const residual = parseBrl(f.residual);
  const quantity = Number(f.quantity);
  const bp = f.rateMode === 'explicit' ? percentToBp(f.explicitPercent) : NaN;
  const bookBp = f.bookDiverges ? percentToBp(f.bookPercent) : null;
  const bookJust = f.bookDiverges ? f.bookJustification.trim() : null;
  const rateIdChanged = f.rateMode === 'catalog' && f.rateId !== original.rateId;
  const pickedRateBp = rateIdChanged ? rates.find((r) => r.id === f.rateId)?.annualRateBp : undefined;
  const bpChanged = f.rateMode === 'explicit' && (bp !== original.annualRateBp || original.rateId !== null);
  return {
    unitId,
    assetId: original.id,
    classId: f.classId !== original.classId ? f.classId : undefined,
    code: f.code.trim() !== original.code ? f.code.trim() : undefined,
    description: f.description.trim() !== original.description ? f.description.trim() : undefined,
    ncmPrefix: ncm !== (original.ncmPrefix ?? '') ? (ncm || null) : undefined,
    quantity: quantity !== original.quantity ? quantity : undefined,
    costCents: cost !== original.costCents ? cost : undefined,
    residualValueCents: residual !== original.residualValueCents ? residual : undefined,
    acquiredAt: f.acquiredAt !== original.acquiredAt.slice(0, 10) ? f.acquiredAt : undefined,
    rateId: rateIdChanged ? f.rateId : undefined,
    annualRateBp: bpChanged ? bp : pickedRateBp,
    bookAnnualRateBp: bookBp !== original.bookAnnualRateBp ? bookBp : undefined,
    bookRateJustification: bookJust !== original.bookRateJustification ? bookJust : undefined,
  };
}

/**
 * FixedAssetFormModal (FE-INCR-FIXED-ASSETS itens 8–10) — cria/edita um bem. O corpo é EXATAMENTE
 * `CreateFixedAssetSchema` / `UpdateFixedAssetSchema` (`.strict()` no servidor; tipos gerados). Dinheiro por
 * `parseBrl` (1.234,56 ⇒ 123456 — footgun 100× registrado); `acquiredAt` é `<input type="date">` com default
 * `scopeToday()` (nunca UTC); taxa = rádio "do catálogo" (`rateId`) | "explícita" (`annualRateBp`, em % × 100).
 */
export function FixedAssetFormModal({ isOpen, onClose, unitId, classes, editing, onSuccess }: FixedAssetFormModalProps) {
  const { t, tRef } = useAccountingT();
  const isEdit = !!editing;

  const [form, setForm] = useState<AssetFormState>(emptyAssetForm);
  const [rates, setRates] = useState<DepreciationRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    setForm(editing ? assetToForm(editing) : emptyAssetForm());
    setError(null);
    setBusy(false);
  }, [isOpen, editing]);

  // Catálogo de taxas visíveis (o 1º GET semeia o Anexo III no BE — carregamento normal).
  useEffect(() => {
    if (!isOpen || !unitId) return;
    let cancelled = false;
    setRatesLoading(true);
    fixedAssetsService
      .listRates(unitId)
      .then((rows) => { if (!cancelled) setRates(rows); })
      .catch(() => { if (!cancelled) setRates([]); })
      .finally(() => { if (!cancelled) setRatesLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, unitId]);

  const rateOptions = useMemo(
    () =>
      rates
        .filter((r) => r.hiddenAt === null)
        .map((r): CatalogOption => ({ codigo: r.id, descricao: `${r.ncm ?? '—'} — ${r.description}`, tag: `${bpToPercent(r.annualRateBp)}% a.a.` })),
    [rates],
  );

  async function handleSave() {
    const invalid = validateAssetForm(form);
    if (invalid) {
      setError(tRef.current(`fixedAssets.asset.error.${invalid}`, invalid));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await fixedAssetsService.updateAsset(editing.id, toUpdatePayload(unitId, editing, form, rates));
      else await fixedAssetsService.createAsset(toCreatePayload(unitId, form));
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('fixedAssets.asset.error.save', 'Não foi possível salvar o bem.')));
    } finally {
      setBusy(false);
    }
  }

  const radio = 'inline-flex items-center gap-2 text-xs text-neutral-300';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!busy) onClose(); }}
      title={isEdit ? t('fixedAssets.asset.modal.titleEdit', 'Editar bem') : t('fixedAssets.asset.modal.titleNew', 'Novo bem')}
      themeColor="bg-emerald-600"
      maxWidth="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
            {t('fixedAssets.cancel', 'Cancelar')}
          </button>
          <button onClick={() => void handleSave()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
            {busy ? t('fixedAssets.saving', 'Salvando…') : t('fixedAssets.save', 'Salvar')}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('fixedAssets.asset.field.class', 'Classe')}>
            <select aria-label={t('fixedAssets.asset.field.class', 'Classe')} value={form.classId} onChange={(e) => set('classId', e.target.value)} className={`w-full ${inputClass}`}>
              <option value="">{t('fixedAssets.asset.field.classPlaceholder', 'Selecione a classe…')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </Field>
          <Field label={t('fixedAssets.asset.field.code', 'Código')}>
            <input value={form.code} onChange={(e) => set('code', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('fixedAssets.asset.field.description', 'Descrição')}>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          <Field label={t('fixedAssets.asset.field.ncm', 'NCM (opcional)')}>
            <input value={form.ncmPrefix} onChange={(e) => set('ncmPrefix', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.asset.field.quantity', 'Quantidade')}>
            <input type="number" min={1} step={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.asset.field.cost', 'Custo de aquisição (R$)')}>
            <input inputMode="decimal" value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="0,00" className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.asset.field.residual', 'Valor residual (R$)')}>
            <input inputMode="decimal" value={form.residual} onChange={(e) => set('residual', e.target.value)} placeholder="0,00" className={`w-full ${inputClass}`} />
          </Field>
          <Field label={t('fixedAssets.asset.field.acquiredAt', 'Data de aquisição')}>
            <input type="date" value={form.acquiredAt} onChange={(e) => set('acquiredAt', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
        </div>

        <Block label={t('fixedAssets.asset.field.rate', 'Taxa de depreciação')}>
          <div className="flex flex-wrap gap-4" role="radiogroup" aria-label={t('fixedAssets.asset.field.rate', 'Taxa de depreciação')}>
            <label className={radio}>
              <input type="radio" name="fa-rate-mode" checked={form.rateMode === 'catalog'} onChange={() => set('rateMode', 'catalog')} />
              {t('fixedAssets.asset.rate.catalog', 'Do catálogo')}
            </label>
            <label className={radio}>
              <input type="radio" name="fa-rate-mode" checked={form.rateMode === 'explicit'} onChange={() => set('rateMode', 'explicit')} />
              {t('fixedAssets.asset.rate.explicit', 'Explícita')}
            </label>
          </div>
          {form.rateMode === 'catalog' ? (
            <CatalogCombobox
              options={rateOptions}
              value={form.rateId}
              onChange={(id) => set('rateId', id)}
              loading={ratesLoading}
              placeholder={t('fixedAssets.asset.rate.search', 'Buscar por NCM ou descrição…')}
              inputClassName={inputClass}
              ariaLabel={t('fixedAssets.asset.rate.catalogAria', 'Taxa do catálogo')}
            />
          ) : (
            <input
              aria-label={t('fixedAssets.asset.rate.explicitAria', 'Taxa explícita (% a.a.)')}
              inputMode="decimal"
              value={form.explicitPercent}
              onChange={(e) => set('explicitPercent', e.target.value)}
              placeholder={t('fixedAssets.asset.rate.explicitPlaceholder', 'Ex.: 10 (% ao ano)')}
              className={`w-full ${inputClass}`}
            />
          )}
        </Block>

        {/* Bloco recolhido: só aparece quando o operador marca a divergência. */}
        <div className="rounded-xl border border-neutral-800 px-3 py-2">
          <label className={radio}>
            <input type="checkbox" checked={form.bookDiverges} onChange={(e) => set('bookDiverges', e.target.checked)} />
            {t('fixedAssets.asset.book.summary', 'Taxa contábil divergente da fiscal')}
          </label>
          {form.bookDiverges && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('fixedAssets.asset.book.rate', 'Taxa contábil (% a.a.)')}>
                <input inputMode="decimal" value={form.bookPercent} onChange={(e) => set('bookPercent', e.target.value)} className={`w-full ${inputClass}`} />
              </Field>
              <Field label={t('fixedAssets.asset.book.justification', 'Justificativa (obrigatória)')}>
                <input value={form.bookJustification} onChange={(e) => set('bookJustification', e.target.value)} className={`w-full ${inputClass}`} />
              </Field>
            </div>
          )}
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
    </Modal>
  );
}
