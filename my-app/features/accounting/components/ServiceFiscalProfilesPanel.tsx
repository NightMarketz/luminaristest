import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { fiscalProfileService, type ServiceFiscalProfileView } from '../../../lib/services/fiscalProfile.service';
import { Modal } from '../../../components/ui/Modal';
import { useConfirmModal } from '../../../components/ui/feedback/useConfirmModal';
import { loadServiceOptions, type ServiceOption } from '../lib/loadServiceOptions';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import {
  emptyServiceProfileForm,
  toServiceProfileForm,
  toUpsertServiceFiscalProfile,
  type ServiceProfileForm,
} from '../lib/fiscalProfileForm';
import { Field, inputClass } from './SpedGenerationPanel';

export interface ServiceFiscalProfilesPanelProps {
  unitId: string;
}

const th = 'px-3 py-2.5 font-medium';
const td = 'px-3 py-2';
const smallBtn =
  'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700';

/**
 * Perfil fiscal DOS SERVIÇOS (FE-INCR-DFE PR-0, item 7) — `…/service-fiscal-profiles`. Lista os serviços do tenant
 * (DynamicTable `services`, `serviceRef` = id da linha) cruzados com os perfis já gravados. O BE não lê o preset
 * `services`: a existência da linha é daqui (`ServiceFiscalProfileService.ts:26-30`). Sem perfil de serviço a venda
 * não emite — por isso o badge "sem perfil".
 */
export function ServiceFiscalProfilesPanel({ unitId }: ServiceFiscalProfilesPanelProps) {
  const { t, tRef } = useAccountingT();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ServiceFiscalProfileView>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceOption | null>(null);
  const [form, setForm] = useState<ServiceProfileForm>(emptyServiceProfileForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, confirmNode } = useConfirmModal();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [svcs, list] = await Promise.all([loadServiceOptions(), fiscalProfileService.listServiceProfiles(unitId)]);
      setServices(svcs);
      setProfiles(Object.fromEntries(list.map((p) => [p.serviceRef, p])));
    } catch (e: unknown) {
      setLoadError(resolveError(e, tRef.current('fiscalProfile.service.error.load', 'Não foi possível carregar os serviços.')));
    } finally {
      setLoading(false);
    }
  }, [unitId, tRef]);
  useEffect(() => { void load(); }, [load]);

  function openEditor(service: ServiceOption) {
    const existing = profiles[service.id];
    setForm(existing ? toServiceProfileForm(existing) : emptyServiceProfileForm());
    setFormError(null);
    setEditing(service);
  }

  const set = <K extends keyof ServiceProfileForm>(key: K, value: ServiceProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved = await fiscalProfileService.putServiceProfile(editing.id, toUpsertServiceFiscalProfile(unitId, form));
      setProfiles((p) => ({ ...p, [saved.serviceRef]: saved }));
      setEditing(null);
    } catch (e: unknown) {
      setFormError(resolveError(e, tRef.current('fiscalProfile.service.error.save', 'Não foi possível salvar o perfil do serviço.')));
    } finally {
      setSaving(false);
    }
  }

  function askDelete(service: ServiceOption) {
    setActionError(null);
    void confirm({
      title: t('fiscalProfile.service.delete.title', 'Remover perfil fiscal do serviço'),
      message: `${service.name} — ${t('fiscalProfile.service.delete.message', 'sem o perfil, as vendas deste serviço deixam de emitir NFS-e. Remover?')}`,
      confirmLabel: t('fiscalProfile.service.delete.confirm', 'Remover'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fiscalProfileService.deleteServiceProfile(service.id, unitId);
          setProfiles((p) => {
            const { [service.id]: _removed, ...rest } = p;
            return rest;
          });
        } catch (e: unknown) {
          setActionError(resolveError(e, tRef.current('fiscalProfile.service.error.delete', 'Não foi possível remover o perfil do serviço.')));
        }
      },
    });
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5" aria-label={t('fiscalProfile.service.title', 'Perfis fiscais dos serviços')}>
      <h2 className="text-lg font-semibold text-neutral-200">{t('fiscalProfile.service.title', 'Perfis fiscais dos serviços')}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        {t('fiscalProfile.service.subtitle', 'Código de tributação nacional, NBS e local da prestação de cada serviço. Sem perfil, a venda do serviço não emite NFS-e.')}
      </p>

      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('fiscalProfile.loading', 'Carregando…')}</div>}
      {loadError && <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{loadError}</div>}
      {actionError && <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{actionError}</div>}

      {!loading && !loadError && services.length === 0 && (
        <div className="py-6 text-center text-sm text-neutral-500">{t('fiscalProfile.service.empty', 'Nenhum serviço cadastrado.')}</div>
      )}

      {!loading && !loadError && services.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('fiscalProfile.service.col.name', 'Serviço')}</th>
                <th className={th}>{t('fiscalProfile.service.col.cTribNac', 'Código de tributação')}</th>
                <th className={th}>{t('fiscalProfile.service.col.cNBS', 'NBS')}</th>
                <th className={th}>{t('fiscalProfile.service.col.cIndOp', 'Indicador da operação')}</th>
                <th className={th}>{t('fiscalProfile.service.col.actions', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const p = profiles[s.id];
                return (
                  <tr key={s.id} className="border-b border-neutral-800/60 last:border-0">
                    <td className={`${td} text-neutral-200`}>{s.name}</td>
                    {p ? (
                      <>
                        <td className={`${td} text-neutral-200`}>
                          <span className="font-mono text-xs">{p.cTribNac}</span>
                          <span className="block text-xs text-neutral-500">{p.cTribNacDescricao}</span>
                        </td>
                        <td className={`${td} font-mono text-xs text-neutral-400`}>{p.cNBS ?? '—'}</td>
                        <td className={`${td} font-mono text-xs text-neutral-400`}>{p.cIndOp}</td>
                      </>
                    ) : (
                      <td className={td} colSpan={3}>
                        <span className="inline-flex rounded-full bg-amber-600/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                          {t('fiscalProfile.service.noProfile', 'sem perfil')}
                        </span>
                      </td>
                    )}
                    <td className={td}>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => openEditor(s)} className={smallBtn} aria-label={`${p ? t('fiscalProfile.service.edit', 'Editar') : t('fiscalProfile.service.configure', 'Configurar')} ${s.name}`}>
                          <FiEdit2 size={11} /> {p ? t('fiscalProfile.service.edit', 'Editar') : t('fiscalProfile.service.configure', 'Configurar')}
                        </button>
                        {p && (
                          <button type="button" onClick={() => askDelete(s)} className={`${smallBtn} hover:border-red-700 hover:text-red-300`} aria-label={`${t('fiscalProfile.service.remove', 'Excluir')} ${s.name}`}>
                            <FiTrash2 size={11} /> {t('fiscalProfile.service.remove', 'Excluir')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => { if (!saving) setEditing(null); }}
        title={`${t('fiscalProfile.service.modal.title', 'Perfil fiscal do serviço')}${editing ? ` — ${editing.name}` : ''}`}
        themeColor="bg-emerald-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {t('fiscalProfile.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('fiscalProfile.save', 'Salvar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5">
          <Field label={t('fiscalProfile.service.field.cTribNac', 'Código de tributação nacional (aceita 01.07.01)')}>
            <input value={form.cTribNac} onChange={(e) => set('cTribNac', e.target.value)} placeholder="01.07.01" className={`w-full ${inputClass}`} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('fiscalProfile.service.field.cTribMun', 'Código complementar do município (3 dígitos)')}>
              <input value={form.cTribMun} onChange={(e) => set('cTribMun', e.target.value)} maxLength={3} inputMode="numeric" className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('fiscalProfile.service.field.cNBS', 'NBS (9 dígitos)')}>
              <input value={form.cNBS} onChange={(e) => set('cNBS', e.target.value)} maxLength={9} inputMode="numeric" className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('fiscalProfile.service.field.cIndOp', 'Indicador da operação (vazio = padrão do salão)')}>
              <input value={form.cIndOp} onChange={(e) => set('cIndOp', e.target.value)} maxLength={6} inputMode="numeric" className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('fiscalProfile.service.field.cLocPrestacao', 'Município da prestação (IBGE, 7 dígitos)')}>
              <input value={form.cLocPrestacao} onChange={(e) => set('cLocPrestacao', e.target.value)} maxLength={7} inputMode="numeric" className={`w-full ${inputClass}`} />
            </Field>
          </div>
          <Field label={t('fiscalProfile.service.field.xDescServ', 'Descrição do serviço na nota')}>
            <textarea value={form.xDescServ} onChange={(e) => set('xDescServ', e.target.value)} maxLength={1000} rows={3} className={`w-full ${inputClass}`} />
          </Field>
          {formError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{formError}</div>}
        </div>
      </Modal>
      {confirmNode}
    </section>
  );
}
