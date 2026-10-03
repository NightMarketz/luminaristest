import { useEffect, useState } from 'react';
import { FiEdit2, FiPlusCircle, FiTrash2 } from 'react-icons/fi';
import {
  fixedAssetsService,
  type CreateFixedAssetClassInput,
  type FixedAssetClass,
  type UpdateFixedAssetClassInput,
} from '../../../lib/services/fixedAssets.service';
import type { Account } from '../../../lib/services/accounting.service';
import { Modal } from '../../../components/ui/Modal';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';
import { FieldBlock as Block } from './CatalogCombobox';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';

export interface ClassFormState {
  code: string;
  name: string;
  depreciable: boolean;
  costAccountId: string;
  accumulatedAccountId: string;
}

export const emptyClassForm = (): ClassFormState => ({ code: '', name: '', depreciable: true, costAccountId: '', accumulatedAccountId: '' });

export const classToForm = (c: FixedAssetClass): ClassFormState => ({
  code: c.code, name: c.name, depreciable: c.depreciable, costAccountId: c.costAccountId, accumulatedAccountId: c.accumulatedDepreciationAccountId ?? '',
});

/** Mesma forma do `superRefine` do DTO: conta acumulada obrigatória quando depreciável. Sufixo de `fixedAssets.class.error.*`. */
export function validateClassForm(f: ClassFormState): string | null {
  if (!f.code.trim()) return 'codeRequired';
  if (!f.name.trim()) return 'nameRequired';
  if (!f.costAccountId) return 'costAccountRequired';
  if (f.depreciable && !f.accumulatedAccountId) return 'accumulatedRequired';
  return null;
}

/** Classe não depreciável não envia a conta acumulada. */
export function toCreateClassPayload(unitId: string, f: ClassFormState): CreateFixedAssetClassInput {
  return {
    unitId,
    code: f.code.trim(),
    name: f.name.trim(),
    depreciable: f.depreciable,
    costAccountId: f.costAccountId,
    accumulatedDepreciationAccountId: f.depreciable ? f.accumulatedAccountId : undefined,
  };
}

/** PATCH só com o que mudou; ao virar não depreciável, `null` limpa a conta acumulada que existia. */
export function toUpdateClassPayload(unitId: string, original: FixedAssetClass, f: ClassFormState): UpdateFixedAssetClassInput {
  const acc = f.depreciable ? f.accumulatedAccountId : null;
  return {
    unitId,
    classId: original.id,
    code: f.code.trim() !== original.code ? f.code.trim() : undefined,
    name: f.name.trim() !== original.name ? f.name.trim() : undefined,
    depreciable: f.depreciable !== original.depreciable ? f.depreciable : undefined,
    costAccountId: f.costAccountId !== original.costAccountId ? f.costAccountId : undefined,
    accumulatedDepreciationAccountId: acc !== original.accumulatedDepreciationAccountId ? acc : undefined,
  };
}

export interface FixedAssetClassesSectionProps {
  unitId: string;
  classes: FixedAssetClass[];
  /** Contas folha (`acceptsEntries`). */
  accounts: Account[];
  /** Recarrega o cache de classes do painel. */
  onChanged: () => void;
}

/**
 * Seção "Classes" (FE-INCR-FIXED-ASSETS itens 20–21): lista + `Modal` criar/editar (PATCH) + remover. Selects de conta
 * valem por **id**. Remover classe com bem vivo → o 400 do BE aparece na confirmação (`FixedAssetClassService`).
 */
export function FixedAssetClassesSection({ unitId, classes, accounts, onChanged }: FixedAssetClassesSectionProps) {
  const { t, tRef } = useAccountingT();
  const [modal, setModal] = useState<{ open: boolean; editing: FixedAssetClass | null }>({ open: false, editing: null });
  const [form, setForm] = useState<ClassFormState>(emptyClassForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<FixedAssetClass | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const accountLabel = (id: string | null) => {
    const a = id ? accountById.get(id) : undefined;
    return a ? `${a.code} — ${a.name}` : null;
  };
  const set = <K extends keyof ClassFormState>(key: K, value: ClassFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!modal.open) return;
    setForm(modal.editing ? classToForm(modal.editing) : emptyClassForm());
    setFormError(null);
    setBusy(false);
  }, [modal]);

  async function save() {
    const invalid = validateClassForm(form);
    if (invalid) {
      setFormError(tRef.current(`fixedAssets.class.error.${invalid}`, invalid));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (modal.editing) await fixedAssetsService.updateClass(modal.editing.id, toUpdateClassPayload(unitId, modal.editing, form));
      else await fixedAssetsService.createClass(toCreateClassPayload(unitId, form));
      setModal({ open: false, editing: null });
      onChanged();
    } catch (err: unknown) {
      setFormError(resolveError(err, tRef.current('fixedAssets.class.error.save', 'Não foi possível salvar a classe.')));
    } finally {
      setBusy(false);
    }
  }

  async function runDelete() {
    if (!toDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await fixedAssetsService.deleteClass(toDelete.id, unitId);
      setToDelete(null);
      onChanged();
    } catch (err: unknown) {
      setDeleteError(resolveError(err, tRef.current('fixedAssets.class.error.delete', 'Não foi possível remover a classe.')));
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
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setModal({ open: true, editing: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <FiPlusCircle size={14} />
          {t('fixedAssets.class.new', 'Nova classe')}
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500">{t('fixedAssets.class.empty', 'Nenhuma classe cadastrada.')}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('fixedAssets.col.code', 'Código')}</th>
                <th className={th}>{t('fixedAssets.class.col.name', 'Nome')}</th>
                <th className={th}>{t('fixedAssets.class.col.depreciable', 'Depreciável')}</th>
                <th className={th}>{t('fixedAssets.class.col.costAccount', 'Conta do bem')}</th>
                <th className={th}>{t('fixedAssets.class.col.accumulatedAccount', 'Conta de deprec. acumulada')}</th>
                <th className={th}>{t('fixedAssets.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className={`${td} font-mono text-xs text-neutral-100`}>{c.code}</td>
                  <td className={`${td} text-neutral-200`}>{c.name}</td>
                  <td className={td}>{c.depreciable ? t('fixedAssets.yes', 'Sim') : t('fixedAssets.no', 'Não')}</td>
                  <td className={`${td} text-xs text-neutral-400`}>{accountLabel(c.costAccountId) ?? <span className="text-neutral-600">—</span>}</td>
                  <td className={`${td} text-xs text-neutral-400`}>{accountLabel(c.accumulatedDepreciationAccountId) ?? <span className="text-neutral-600">—</span>}</td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setModal({ open: true, editing: c })} className={smallBtn}>
                        <FiEdit2 size={11} /> {t('fixedAssets.action.edit', 'Editar')}
                      </button>
                      <button type="button" onClick={() => { setDeleteError(null); setToDelete(c); }} className={`${smallBtn} hover:border-red-700 hover:text-red-300`}>
                        <FiTrash2 size={11} /> {t('fixedAssets.action.delete', 'Remover')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modal.open}
        onClose={() => { if (!busy) setModal({ open: false, editing: null }); }}
        title={modal.editing ? t('fixedAssets.class.modal.titleEdit', 'Editar classe') : t('fixedAssets.class.modal.titleNew', 'Nova classe')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => setModal({ open: false, editing: null })} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
            <button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('fixedAssets.saving', 'Salvando…') : t('fixedAssets.save', 'Salvar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('fixedAssets.col.code', 'Código')}>
              <input value={form.code} onChange={(e) => set('code', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('fixedAssets.class.col.name', 'Nome')}>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" checked={form.depreciable} onChange={(e) => set('depreciable', e.target.checked)} />
            {t('fixedAssets.class.col.depreciable', 'Depreciável')}
          </label>
          <Block label={t('fixedAssets.class.col.costAccount', 'Conta do bem')}>
            <FixedAssetAccountSelect
              accounts={accounts}
              value={form.costAccountId}
              onChange={(id) => set('costAccountId', id)}
              ariaLabel={t('fixedAssets.class.col.costAccount', 'Conta do bem')}
              placeholder={t('fixedAssets.selectAccount', 'Selecione a conta…')}
            />
          </Block>
          {form.depreciable && (
            <Block label={t('fixedAssets.class.col.accumulatedAccount', 'Conta de deprec. acumulada')}>
              <FixedAssetAccountSelect
                accounts={accounts}
                value={form.accumulatedAccountId}
                onChange={(id) => set('accumulatedAccountId', id)}
                ariaLabel={t('fixedAssets.class.col.accumulatedAccount', 'Conta de deprec. acumulada')}
                placeholder={t('fixedAssets.selectAccount', 'Selecione a conta…')}
              />
            </Block>
          )}
          {formError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{formError}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={!!toDelete}
        onClose={() => { if (!busy) setToDelete(null); }}
        title={t('fixedAssets.class.delete.title', 'Remover classe')}
        themeColor="bg-red-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setToDelete(null); }} disabled={busy} className={cancelBtn}>{t('fixedAssets.cancel', 'Cancelar')}</button>
            <button onClick={() => void runDelete()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
              {busy ? t('fixedAssets.delete.removing', 'Removendo…') : t('fixedAssets.delete.confirm', 'Confirmar remoção')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toDelete && <p><span className="font-mono font-semibold text-neutral-100">{toDelete.code}</span> — {toDelete.name}</p>}
          {deleteError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{deleteError}</div>}
        </div>
      </Modal>
    </div>
  );
}
