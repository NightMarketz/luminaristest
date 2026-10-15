import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useConfirmModal } from '../../../components/ui/feedback/useConfirmModal';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { simplesService, type SalaoParceriaContrato } from '../../../lib/services/simples.service';
import RelationSelector from '@/features/dashboard/components/forms/RelationSelector';
import { fetchRelatedTableData, formatRelatedDisplayValue } from '@/features/dashboard/components/shared/relation-utils.client';
import { formatDate } from '../lib/formatDate';
import { formatPctHundredths } from '../lib/fiscalProfileForm';
import { resolveError } from '../lib/resolveError';
import { parceriaVazia, toParceriaForm, toParceriaInput, type ParceriaForm, type ParceriaFormError } from '../lib/simplesForms';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

const ERRO_LABEL: Record<ParceriaFormError, string> = {
  profissional: 'Escolha o profissional-parceiro.',
  cota: 'Cota do salão inválida — entre 0,01% e 99,99% (até 2 casas).',
  natureza: 'Escolha a natureza da cota.',
  homologadoEm: 'Informe a data de homologação do contrato (obrigatória — Lei 12.592 art. 1º-A § 8º).',
  sindicato: 'Informe o sindicato que homologou (até 200 caracteres).',
  vigenteDesde: 'Informe o início da vigência (data do calendário).',
  vigenteAte: 'Fim da vigência inválido ou antes do início.',
};

interface TableMetaLike {
  id?: unknown;
  internalName?: unknown;
}

/**
 * Item 10 — parcerias salão-parceiro (`/simples/parcerias`; X14 item 13; Lei 12.592 art. 1º-A), sub-painel da aba
 * Apuração em ano SIMPLES (P4-4 a). Profissional = a linha da tabela `employees` que o item de venda referencia em
 * `responsibleEmployeeId` (schema.prisma `SalaoParceriaContrato`, B-3 → a) — escolhida pelo `RelationSelector`
 * canônico. Remover = soft-delete no BE, com confirmação. 403 esconde as ações de gerir.
 */
export function SimplesParceriasPanel({ unitId }: { unitId: string }) {
  const { t, tRef } = useAccountingT();
  const [linhas, setLinhas] = useState<SalaoParceriaContrato[]>([]);
  const [employeesTable, setEmployeesTable] = useState<string | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [podeGerir, setPodeGerir] = useState(true);
  const [editando, setEditando] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState<ParceriaForm>(parceriaVazia);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, confirmNode } = useConfirmModal();
  const req = useRef(0);

  const carregar = useCallback(async () => {
    const r = ++req.current;
    setLoading(true);
    setErro(null);
    try {
      const [lista, tabelas] = await Promise.all([
        simplesService.listParcerias({ unitId }),
        DynamicTableService.getTables().catch(() => null),
      ]);
      if (r !== req.current) return;
      setLinhas(lista);
      const metas: TableMetaLike[] = Array.isArray(tabelas?.data) ? (tabelas.data as TableMetaLike[]) : [];
      const emp = metas.find((m) => m.internalName === 'employees');
      const id = emp?.id ? String(emp.id) : null;
      setEmployeesTable(id);
      if (id) {
        const rows = await fetchRelatedTableData(id).catch(() => []);
        if (r === req.current) setNomes(Object.fromEntries(rows.map((row) => [String(row.id), formatRelatedDisplayValue(row)])));
      }
    } catch (e: unknown) {
      if (r === req.current) setErro(resolveError(e, tRef.current('simples.parceria.error.load', 'Erro ao carregar as parcerias.')));
    } finally {
      if (r === req.current) setLoading(false);
    }
  }, [unitId, tRef]);
  useEffect(() => { void carregar(); }, [carregar]);

  const set = <K extends keyof ParceriaForm>(k: K, v: ParceriaForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const abrirNova = () => { setForm(parceriaVazia()); setFormErro(null); setEditando({ id: null }); };
  const abrirEdicao = (p: SalaoParceriaContrato) => { setForm(toParceriaForm(p)); setFormErro(null); setEditando({ id: p.id }); };

  const tratar403 = (e: unknown, fallback: string): string => {
    if (e && typeof e === 'object' && (e as { status?: unknown }).status === 403) setPodeGerir(false);
    return resolveError(e, fallback);
  };

  async function salvar() {
    if (!editando) return;
    const b = toParceriaInput(unitId, form);
    if (!b.ok) {
      setFormErro(tRef.current(`simples.parceria.erro.${b.error}`, ERRO_LABEL[b.error]));
      return;
    }
    setSaving(true);
    setFormErro(null);
    try {
      if (editando.id) await simplesService.atualizarParceria(editando.id, b.body);
      else await simplesService.criarParceria(b.body);
      setEditando(null);
      await carregar();
    } catch (e: unknown) {
      // 409 = outro contrato do profissional vigente no período — o texto do BE diz qual.
      setFormErro(tratar403(e, tRef.current('simples.parceria.error.save', 'Não foi possível salvar a parceria.')));
    } finally {
      setSaving(false);
    }
  }

  function remover(p: SalaoParceriaContrato) {
    void confirm({
      title: t('simples.parceria.removerTitulo', 'Remover parceria'),
      message: t('simples.parceria.removerMsg', 'O contrato sai da apuração a partir de agora (fica no histórico do sistema).'),
      confirmLabel: t('simples.parceria.remover', 'Remover'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await simplesService.removerParceria(p.id, { unitId });
          await carregar();
        } catch (e: unknown) {
          setErro(tratar403(e, tRef.current('simples.parceria.error.remove', 'Não foi possível remover a parceria.')));
        }
      },
    });
  }

  const natureza = useMemo(
    () => ({
      ALUGUEL_BEM_MOVEL: t('simples.parceria.natureza.ALUGUEL_BEM_MOVEL', 'Aluguel de bens móveis'),
      GESTAO: t('simples.parceria.natureza.GESTAO', 'Gestão'),
    }),
    [t],
  );
  const th = 'px-3 py-2 font-medium';
  const td = 'px-3 py-2';
  const smallBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-50';

  return (
    <section data-testid="simples-parcerias" className="mt-6 rounded-2xl border border-neutral-800 p-4" aria-label={t('simples.parceria.title', 'Parcerias salão-parceiro')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">{t('simples.parceria.title', 'Parcerias salão-parceiro')}</h3>
          <p className="text-xs text-neutral-500">{t('simples.parceria.subtitle', 'Lei 12.592 art. 1º-A: a cota do profissional-parceiro sai da receita do salão; sem homologação o contrato não produz efeito.')}</p>
        </div>
        {podeGerir && (
          <button type="button" onClick={abrirNova} disabled={!employeesTable} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
            {t('simples.parceria.nova', 'Nova parceria')}
          </button>
        )}
      </div>
      {!loading && !employeesTable && <p className="mb-2 text-xs text-amber-300">{t('simples.parceria.semEmployees', 'Tabela de funcionários não encontrada: cadastre os profissionais antes de criar a parceria.')}</p>}
      {erro && <div role="alert" className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</div>}

      {loading ? (
        <p className="py-4 text-center text-sm text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
      ) : linhas.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">{t('simples.parceria.vazio', 'Nenhuma parceria cadastrada nesta unidade.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className={th}>{t('simples.parceria.profissional', 'Profissional')}</th>
                <th className={th}>{t('simples.parceria.cota', 'Cota do salão')}</th>
                <th className={th}>{t('simples.parceria.naturezaCota', 'Natureza da cota')}</th>
                <th className={th}>{t('simples.parceria.homologacao', 'Homologação')}</th>
                <th className={th}>{t('simples.parceria.vigencia', 'Vigência')}</th>
                {podeGerir && <th className={th} />}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {linhas.map((p) => (
                <tr key={p.id} data-testid={`parceria-${p.id}`}>
                  <td className={td}>{nomes[p.profissionalContactId] ?? p.profissionalContactId}</td>
                  <td className={`${td} font-mono`}>{formatPctHundredths(p.cotaSalaoBp)}%</td>
                  <td className={td}>{natureza[p.naturezaCota]}</td>
                  <td className={td}><span className="font-mono">{formatDate(p.homologadoEm)}</span> · {p.sindicato}</td>
                  <td className={`${td} font-mono`}>{formatDate(p.vigenteDesde)} → {p.vigenteAte ? formatDate(p.vigenteAte) : t('simples.parceria.semFim', 'sem fim')}</td>
                  {podeGerir && (
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <button type="button" className={smallBtn} onClick={() => abrirEdicao(p)}>{t('simples.parceria.editar', 'Editar')}</button>{' '}
                      <button type="button" className={smallBtn} onClick={() => remover(p)}>{t('simples.parceria.remover', 'Remover')}</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!editando}
        onClose={() => setEditando(null)}
        title={editando?.id ? t('simples.parceria.editarTitulo', 'Editar parceria') : t('simples.parceria.nova', 'Nova parceria')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 text-sm">
          <Field label={t('simples.parceria.profissional', 'Profissional')}>
            {employeesTable && (
              <RelationSelector
                name="profissionalContactId"
                value={form.profissionalContactId}
                onChange={(_: string, v: string | string[] | null) => set('profissionalContactId', String(v || ''))}
                targetTable={employeesTable}
                className={`w-full ${inputClass}`}
              />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('simples.parceria.cotaPct', 'Cota do salão (%)')}>
              <input aria-label={t('simples.parceria.cotaPct', 'Cota do salão (%)')} value={form.cota} inputMode="decimal" placeholder="40,00" onChange={(e) => set('cota', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.parceria.naturezaCota', 'Natureza da cota')}>
              <select
                aria-label={t('simples.parceria.naturezaCota', 'Natureza da cota')}
                value={form.naturezaCota}
                // ponytail: folha string → união (cada <option> é membro da união)
                onChange={(e) => set('naturezaCota', e.target.value as ParceriaForm['naturezaCota'])}
                className={`w-full ${inputClass}`}
              >
                <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                <option value="ALUGUEL_BEM_MOVEL">{natureza.ALUGUEL_BEM_MOVEL}</option>
                <option value="GESTAO">{natureza.GESTAO}</option>
              </select>
            </Field>
            <Field label={t('simples.parceria.homologadoEm', 'Homologado em')}>
              <input type="date" aria-label={t('simples.parceria.homologadoEm', 'Homologado em')} value={form.homologadoEm} onChange={(e) => set('homologadoEm', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.parceria.sindicato', 'Sindicato')}>
              <input aria-label={t('simples.parceria.sindicato', 'Sindicato')} value={form.sindicato} maxLength={200} onChange={(e) => set('sindicato', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.parceria.vigenteDesde', 'Vigente desde')}>
              <input type="date" aria-label={t('simples.parceria.vigenteDesde', 'Vigente desde')} value={form.vigenteDesde} onChange={(e) => set('vigenteDesde', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.parceria.vigenteAte', 'Vigente até (vazio = sem fim)')}>
              <input type="date" aria-label={t('simples.parceria.vigenteAte', 'Vigente até (vazio = sem fim)')} value={form.vigenteAte} onChange={(e) => set('vigenteAte', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          {formErro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{formErro}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(null)} className="rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">
              {t('simples.cancelar', 'Cancelar')}
            </button>
            <button type="button" disabled={saving} onClick={() => void salvar()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.parceria.salvar', 'Salvar parceria')}
            </button>
          </div>
        </div>
      </Modal>
      {confirmNode}
    </section>
  );
}
