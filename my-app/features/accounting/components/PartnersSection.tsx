// React default import: tsconfig uses jsx:"preserve", so vitest/esbuild transforms JSX with the classic runtime.
import React, { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiPlusCircle, FiTrash2 } from 'react-icons/fi';
import {
  partnersService,
  type CreatePartnerInput,
  type Partner,
  type PartnerList,
} from '../../../lib/services/partners.service';
import { percentToBp } from '../../../lib/services/fixedAssets.service';
import { Modal } from '../../../components/ui/Modal';
import { resolveErrorWithCode } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatBp } from '../lib/simplesGrid';
import { formatDate } from '../lib/formatDate';
import { Field, inputClass } from './spedFormParts';

/** id da seção — o aviso "sem sócio no ano" do Y600 na ECF leva a ela (FE-INCR-ECF-Y600 item 7). */
export const PARTNERS_ANCHOR = 'cadastro-socios';

export interface PartnerFormState {
  nome: string;
  taxId: string;
  residenteBrasil: boolean;
  participacao: string; // % digitado
  entradaEm: string;
  saidaEm: string;
}

export const emptyPartnerForm = (): PartnerFormState => ({
  nome: '', taxId: '', residenteBrasil: true, participacao: '', entradaEm: '', saidaEm: '',
});

export const partnerToForm = (p: Partner): PartnerFormState => ({
  nome: p.nome,
  taxId: p.taxId,
  residenteBrasil: p.residenteBrasil,
  participacao: String(p.participacaoBp / 100).replace('.', ','),
  entradaEm: p.entradaEm,
  saidaEm: p.saidaEm ?? '',
});

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/**
 * Forma do `CreatePartnerSchema`; sufixo de `partners.error.*`. O dígito verificador do CPF/CNPJ fica com o servidor
 * (FE-INCR-ECF-Y600 item 17: o FE não reimplementa o DV — o 400 do BE aparece na tela).
 */
export function validatePartnerForm(f: PartnerFormState): string | null {
  if (!f.nome.trim()) return 'nomeObrigatorio';
  if (!/^(\d{11}|\d{14})$/.test(onlyDigits(f.taxId))) return 'taxIdFormato';
  const bp = percentToBp(f.participacao);
  if (!Number.isInteger(bp) || bp < 0 || bp > 10000) return 'participacaoInvalida';
  if (!f.entradaEm) return 'entradaObrigatoria';
  return null;
}

/**
 * Rascunho → body do POST/PUT (contrato gerado). No PUT o BE regrava `outrasParticipacoes` com o que vier (`?? null`):
 * a edição devolve o valor que o sócio já tem, senão apagaria o dado do IRRF/Simples que esta tela não mostra.
 */
export function toPartnerPayload(unitId: string, f: PartnerFormState, atual: Partner | null): CreatePartnerInput {
  const out: CreatePartnerInput = {
    unitId,
    nome: f.nome.trim(),
    taxId: onlyDigits(f.taxId),
    residenteBrasil: f.residenteBrasil,
    participacaoBp: percentToBp(f.participacao),
    entradaEm: f.entradaEm,
    saidaEm: f.saidaEm || null,
  };
  if (atual?.outrasParticipacoes) out.outrasParticipacoes = atual.outrasParticipacoes;
  return out;
}

/**
 * Seção "Sócios" da aba Perfil fiscal (FE-INCR-ECF-Y600 PR-2, itens 16–17; F-FE-Y600-2 → a, F-FE-Y600-5 → a). Lista,
 * cria, edita e remove pelo `/accounting/partners`. Sem filtro, a lista traz TODAS as vigências vivas (`todas=true`;
 * dono, chat, 03/11); com data, só as vigentes nela. A soma ≠ 100% vem do BE como aviso e não bloqueia.
 * `outrasParticipacoes` (IRRF/Simples) fica fora desta tela (BRIEF §7).
 */
export function PartnersSection({ unitId }: { unitId: string }) {
  const { t, tRef } = useAccountingT();
  const [filtroData, setFiltroData] = useState('');
  const [lista, setLista] = useState<PartnerList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState<Partner | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PartnerFormState>(emptyPartnerForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState<Partner | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const set = <K extends keyof PartnerFormState>(key: K, value: PartnerFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const serverError = (err: unknown, fallbackKey: string, fallback: string) =>
    resolveErrorWithCode(err, tRef.current(fallbackKey, fallback)).message;

  const fetchList = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      setLista(await partnersService.list(unitId, filtroData ? { data: filtroData } : { todas: true }));
    } catch (err: unknown) {
      setError(resolveErrorWithCode(err, tRef.current('partners.error.load', 'Erro ao carregar os sócios.')).message);
    } finally {
      setLoading(false);
    }
  }, [unitId, filtroData, tRef]);

  useEffect(() => { void fetchList(); }, [fetchList]);

  function openNew() {
    setEditando(null);
    setForm(emptyPartnerForm());
    setFormError(null);
    setModalOpen(true);
  }
  function openEdit(p: Partner) {
    setEditando(p);
    setForm(partnerToForm(p));
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    const invalid = validatePartnerForm(form);
    if (invalid) {
      setFormError(tRef.current(`partners.error.${invalid}`, MSG_PT[invalid] ?? invalid));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const body = toPartnerPayload(unitId, form, editando);
      if (editando) await partnersService.update(editando.id, body);
      else await partnersService.create(body);
      setModalOpen(false);
      void fetchList();
    } catch (err: unknown) {
      setFormError(serverError(err, 'partners.error.save', 'Não foi possível salvar o sócio.'));
    } finally {
      setBusy(false);
    }
  }

  async function runRemove() {
    if (!toRemove) return;
    setBusy(true);
    setRemoveError(null);
    try {
      await partnersService.remove(toRemove.id, unitId);
      setToRemove(null);
      void fetchList();
    } catch (err: unknown) {
      setRemoveError(serverError(err, 'partners.error.remove', 'Não foi possível remover o sócio.'));
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700';
  const cancelBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
  const socios = lista?.socios ?? [];

  return (
    <section id={PARTNERS_ANCHOR} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('partners.title', 'Sócios')}</h2>
      <p className="mb-4 text-sm text-neutral-500">
        {t('partners.description', 'Cadastro dos sócios da empresa e das vigências de cada um — usado pela ECF (Y600) e pela distribuição de lucros e JCP.')}
      </p>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <Field label={t('partners.filtroData', 'Vigentes em (vazio = todas as vigências)')}>
          <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className={inputClass} />
        </Field>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <FiPlusCircle size={14} />
          {t('partners.new', 'Novo sócio')}
        </button>
      </div>

      {lista?.aviso && (
        <div role="status" className="mb-3 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">{lista.aviso}</div>
      )}
      {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      {loading && <div className="py-8 text-center text-sm text-neutral-400">{t('partners.loading', 'Carregando…')}</div>}
      {!loading && !error && lista && socios.length === 0 && (
        <div className="py-8 text-center text-sm text-neutral-500">{t('partners.empty', 'Nenhum sócio cadastrado.')}</div>
      )}
      {!loading && socios.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className={th}>{t('partners.col.nome', 'Nome')}</th>
                <th className={th}>{t('partners.col.taxId', 'CPF/CNPJ')}</th>
                <th className={th}>{t('partners.col.tipo', 'Tipo')}</th>
                <th className={th}>{t('partners.col.residencia', 'Residência')}</th>
                <th className={`${th} text-right`}>{t('partners.col.participacao', 'Participação')}</th>
                <th className={th}>{t('partners.col.entrada', 'Entrada')}</th>
                <th className={th}>{t('partners.col.saida', 'Saída')}</th>
                <th className={th}>{t('partners.col.acoes', 'Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {socios.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className={`${td} text-neutral-200`}>{p.nome}</td>
                  <td className={`${td} font-mono text-xs text-neutral-300`}>{p.taxId}</td>
                  <td className={td}>{p.tipoPessoa}</td>
                  <td className={td}>{p.residenteBrasil ? t('partners.residente', 'Brasil') : t('partners.naoResidente', 'Exterior')}</td>
                  <td className={`${td} text-right font-mono text-xs`}>{formatBp(p.participacaoBp)}</td>
                  <td className={td}>{formatDate(p.entradaEm)}</td>
                  <td className={td}>{p.saidaEm ? formatDate(p.saidaEm) : <span className="text-neutral-600">—</span>}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <button type="button" onClick={() => openEdit(p)} className={smallBtn} aria-label={`${t('partners.edit', 'Editar')} ${p.nome}`}>
                      <FiEdit2 size={11} /> {t('partners.edit', 'Editar')}
                    </button>{' '}
                    <button
                      type="button"
                      onClick={() => { setRemoveError(null); setToRemove(p); }}
                      className={`${smallBtn} hover:border-red-700 hover:text-red-300`}
                      aria-label={`${t('partners.remove', 'Remover')} ${p.nome}`}
                    >
                      <FiTrash2 size={11} /> {t('partners.remove', 'Remover')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { if (!busy) setModalOpen(false); }}
        title={editando ? t('partners.modal.editTitle', 'Editar sócio') : t('partners.modal.newTitle', 'Novo sócio')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} disabled={busy} className={cancelBtn}>{t('partners.cancel', 'Cancelar')}</button>
            <button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('partners.saving', 'Salvando…') : t('partners.save', 'Salvar')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5">
          <Field label={t('partners.field.nome', 'Nome')}>
            <input value={form.nome} onChange={(e) => set('nome', e.target.value)} className={`w-full ${inputClass}`} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('partners.field.taxId', 'CPF ou CNPJ (só dígitos)')}>
              <input inputMode="numeric" value={form.taxId} onChange={(e) => set('taxId', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('partners.field.residencia', 'Residência')}>
              <select value={form.residenteBrasil ? 'BR' : 'EX'} onChange={(e) => set('residenteBrasil', e.target.value === 'BR')} className={`w-full ${inputClass}`}>
                <option value="BR">{t('partners.residente', 'Brasil')}</option>
                <option value="EX">{t('partners.naoResidente', 'Exterior')}</option>
              </select>
            </Field>
            <Field label={t('partners.field.participacao', 'Participação no capital (%)')}>
              <input inputMode="decimal" value={form.participacao} onChange={(e) => set('participacao', e.target.value)} placeholder="50" className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('partners.field.entrada', 'Entrada')}>
              <input type="date" value={form.entradaEm} onChange={(e) => set('entradaEm', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('partners.field.saida', 'Saída (opcional)')}>
              <input type="date" value={form.saidaEm} onChange={(e) => set('saidaEm', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          {formError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{formError}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={!!toRemove}
        onClose={() => { if (!busy) setToRemove(null); }}
        title={t('partners.removeModal.title', 'Remover sócio')}
        themeColor="bg-red-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setToRemove(null); }} disabled={busy} className={cancelBtn}>{t('partners.cancel', 'Cancelar')}</button>
            <button onClick={() => void runRemove()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
              {busy ? t('partners.removing', 'Removendo…') : t('partners.removeModal.confirm', 'Confirmar remoção')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toRemove && <p className="font-semibold text-neutral-100">{toRemove.nome}</p>}
          <p className="text-neutral-400">
            {t('partners.removeModal.note', 'Remover é para cadastro errado. Se o sócio saiu da sociedade, edite e informe a data de saída.')}
          </p>
          {removeError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{removeError}</div>}
        </div>
      </Modal>
    </section>
  );
}

/** Fallback pt das validações da tela (a chave `partners.error.*` do i18n manda). */
const MSG_PT: Record<string, string> = {
  nomeObrigatorio: 'Informe o nome do sócio.',
  taxIdFormato: 'CPF (11 dígitos) ou CNPJ (14 dígitos), só números.',
  participacaoInvalida: 'Participação inválida: um percentual entre 0 e 100.',
  entradaObrigatoria: 'Informe a data de entrada.',
};
