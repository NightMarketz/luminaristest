import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { simplesService, type SimplesDefisView } from '../../../lib/services/simples.service';
import RelationSelector from '@/features/dashboard/components/forms/RelationSelector';
import { fetchRelatedTableData, formatRelatedDisplayValue } from '@/features/dashboard/components/shared/relation-utils.client';
import { detectarTabelaSocios, ordenarTabelasSocios, tabelasDaLista, type TabelaSocios } from '../lib/defisSocios';
import { formatPctHundredths } from '../lib/fiscalProfileForm';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveError } from '../lib/resolveError';
import {
  FORMAS_DOACAO,
  MAX_LINHAS_DEFIS,
  TIPOS_BENEFICIARIO,
  doacaoVazia,
  exportacaoVazia,
  socioVazio,
  somaParticipacoesBp,
  toDefisForm,
  toDefisUpsert,
  type DefisCampo,
  type DefisDoacaoLinha,
  type DefisExportacaoLinha,
  type DefisForm,
  type DefisLinhaCampo,
  type DefisSocioLinha,
} from '../lib/simplesForms';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

const ERRO_CAMPO: Record<DefisCampo, string> = {
  empregadosInicio: 'Empregados no início do ano: número inteiro de 0 a 1.000.000.',
  empregadosFim: 'Empregados no fim do ano: número inteiro de 0 a 1.000.000.',
  ganhosCapital: 'Ganhos de capital inválidos — formato 1.234,56.',
  ganhosRendaVariavel: 'Ganhos de renda variável inválidos — formato 1.234,56.',
  exportacaoDireta: 'Exportação direta inválida — formato 1.234,56.',
  cotasTesouraria: 'Cotas em tesouraria: percentual de 0,00 a 100,00.',
};
const ERRO_LINHA: Record<DefisLinhaCampo, string> = {
  socioContato: 'Escolha o sócio da linha {{n}}.',
  socioValor: 'Valores do sócio da linha {{n}} inválidos — formato 1.234,56.',
  socioParticipacao: 'Participação do sócio da linha {{n}}: percentual de 0,00 a 100,00.',
  exportacaoCnpj: 'CNPJ da comercial exportadora da linha {{n}}: 14 posições.',
  exportacaoValor: 'Valor da exportação da linha {{n}}: maior que zero, formato 1.234,56.',
  doacaoCnpj: 'CNPJ do beneficiário da doação da linha {{n}}: 14 posições.',
  doacaoTipo: 'Escolha o tipo de beneficiário da doação da linha {{n}}.',
  doacaoForma: 'Escolha a forma da doação da linha {{n}}.',
  doacaoValor: 'Valor da doação da linha {{n}}: maior que zero, formato 1.234,56.',
  demais: 'No máximo 100 linhas por lista.',
};
const TIPO_LABEL: Record<(typeof TIPOS_BENEFICIARIO)[number], string> = {
  CANDIDATO: 'Candidato',
  COMITE_FINANCEIRO: 'Comitê financeiro',
  PARTIDO_POLITICO: 'Partido político',
};
const FORMA_LABEL: Record<(typeof FORMAS_DOACAO)[number], string> = {
  CHEQUE: 'Cheque',
  OUTROS_TITULOS_CREDITO: 'Outros títulos de crédito',
  TRANSFERENCIA_ELETRONICA: 'Transferência eletrônica',
  DEPOSITO_ESPECIE: 'Depósito em espécie',
  DINHEIRO: 'Dinheiro',
  BENS: 'Bens',
  SERVICOS: 'Serviços',
};

const statusDe = (e: unknown): unknown => (e && typeof e === 'object' ? (e as { status?: unknown }).status : undefined);

async function linhasDaTabela(tableId: string): Promise<Array<{ id: string; rotulo: string }>> {
  const rows = await fetchRelatedTableData(tableId);
  return rows.map((r) => ({ id: String(r.id), rotulo: formatRelatedDisplayValue(r) }));
}

export interface SimplesDefisModalProps {
  unitId: string;
  ano: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Item 14 — DEFIS do ano SIMPLES (`/simples/defis/{ano}`; X14 item 28 + BE-INCR-SIMPLES-DEFIS-MANUAL, #713). Prazo,
 * meses apurados, lucro contábil (com o limite do art. 145 § 1º e se é preciso informar) e estoques vêm do razão, só
 * leitura. Formulário completo (F-6 a) sobre `SimplesDefisUpsertSchema`: empregados, ganhos de capital e de renda
 * variável, exportação direta e via comercial exportadora, sócios + cotas em tesouraria (a soma = 100% é do BE —
 * F-FS-8 c; a tela só a mostra) e doações eleitorais. Anos ≥ 2027 ou sem mês apurado: o BE responde 400 e a tela
 * mostra o texto dele no lugar do formulário. Sócio = linha de uma tabela à escolha
 * (D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS), pelo `RelationSelector` canônico.
 */
export function SimplesDefisModal({ unitId, ano, isOpen, onClose }: SimplesDefisModalProps) {
  const { t, tRef } = useAccountingT();
  const [view, setView] = useState<SimplesDefisView | null>(null);
  const [form, setForm] = useState<DefisForm>(() => toDefisForm(null));
  const [tabelas, setTabelas] = useState<TabelaSocios[]>([]);
  const [tabelaSocios, setTabelaSocios] = useState('');
  const [loading, setLoading] = useState(false);
  const [indisponivel, setIndisponivel] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [podeGerir, setPodeGerir] = useState(true);
  const req = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const r = ++req.current;
    setLoading(true);
    setIndisponivel(null);
    setErro(null);
    setSalvo(false);
    setView(null);
    void (async () => {
      let v: SimplesDefisView;
      try {
        v = await simplesService.obterDefis(ano, { unitId });
      } catch (e: unknown) {
        // 400 = ano ≥ 2027, regime ≠ SIMPLES ou nenhum mês apurado: o texto do BE substitui o formulário.
        if (r === req.current) {
          setIndisponivel(resolveError(e, tRef.current('simples.defis.error.load', 'Erro ao carregar a DEFIS.')));
          setLoading(false);
        }
        return;
      }
      if (r !== req.current) return;
      setView(v);
      setForm(toDefisForm(v.digitado));
      setLoading(false);
      const lista = tabelasDaLista((await DynamicTableService.getTables().catch(() => null))?.data);
      if (r !== req.current) return;
      setTabelas(ordenarTabelasSocios(lista));
      const ids = v.digitado?.socios.map((s) => s.contactId) ?? [];
      const achada = await detectarTabelaSocios(ids, lista, linhasDaTabela);
      if (r !== req.current) return;
      setTabelaSocios(achada ? achada.tabela.id : ordenarTabelasSocios(lista)[0]?.id ?? '');
    })();
  }, [isOpen, ano, unitId, tRef]);

  const set = <K extends keyof DefisForm>(k: K, v: DefisForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setSocio = (i: number, p: Partial<DefisSocioLinha>) => setForm((f) => ({ ...f, socios: f.socios.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const setExp = (i: number, p: Partial<DefisExportacaoLinha>) =>
    setForm((f) => ({ ...f, exportacaoComercial: f.exportacaoComercial.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const setDoacao = (i: number, p: Partial<DefisDoacaoLinha>) =>
    setForm((f) => ({ ...f, doacoesEleitorais: f.doacoesEleitorais.map((s, j) => (j === i ? { ...s, ...p } : s)) }));

  function trocarTabela(id: string) {
    setTabelaSocios(id);
    // O id gravado é de uma linha da tabela anterior: ao trocar, o sócio é escolhido de novo.
    setForm((f) => ({ ...f, socios: f.socios.map((s): DefisSocioLinha => ({ ...s, contactId: '' })) }));
  }

  async function salvar() {
    const b = toDefisUpsert(unitId, form);
    if (!b.ok) {
      const e = b.error;
      setErro(
        e.linha === undefined
          ? tRef.current(`simples.defis.erro.${e.campo}`, ERRO_CAMPO[e.campo])
          : tRef.current(`simples.defis.erro.${e.campo}`, ERRO_LINHA[e.campo], { n: String(e.linha) }),
      );
      return;
    }
    setSaving(true);
    setErro(null);
    setSalvo(false);
    const r = req.current;
    try {
      const v = await simplesService.salvarDefis(ano, b.body);
      if (r !== req.current) return;
      setView(v);
      setForm(toDefisForm(v.digitado));
      setSalvo(true);
    } catch (e: unknown) {
      if (r !== req.current) return;
      if (statusDe(e) === 403) setPodeGerir(false);
      // 400 da soma (sócios + tesouraria ≠ 100%) ou do DV do CNPJ: o texto é do BE.
      setErro(resolveError(e, tRef.current('simples.defis.error.save', 'Não foi possível salvar a DEFIS.')));
    } finally {
      setSaving(false);
    }
  }

  const soma = somaParticipacoesBp(form);
  const linha = (rotulo: string, valor: string, testId?: string) => (
    <div className="flex justify-between gap-3 border-b border-neutral-800 py-1.5">
      <span className="text-neutral-400">{rotulo}</span>
      <span data-testid={testId} className="font-mono text-neutral-100">{valor}</span>
    </div>
  );
  const h3 = 'text-xs font-semibold uppercase tracking-wide text-neutral-500';
  const inp = `${inputClass} w-full`;
  const btnAdd = 'rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50';
  const btnRem = 'text-xs text-neutral-400 hover:text-red-300';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('simples.defis.title', 'DEFIS')} · ${ano}`} themeColor="bg-emerald-600" maxWidth="max-w-4xl">
      <div data-testid="defis-modal" className="space-y-4 text-sm">
        {loading ? (
          <p className="text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
        ) : indisponivel ? (
          <div role="alert" data-testid="defis-indisponivel" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
            {indisponivel}
          </div>
        ) : view ? (
          <>
            <section className="rounded-2xl border border-neutral-800 p-4">
              <h3 className={`${h3} mb-2`}>{t('simples.defis.doRazao', 'Do razão (só leitura)')}</h3>
              {linha(t('simples.defis.prazo', 'Prazo de entrega'), formatDate(view.prazo), 'defis-prazo')}
              {linha(t('simples.defis.mesesApurados', 'Meses apurados'), view.mesesApurados.join(', '), 'defis-meses')}
              {linha(t('simples.defis.lucro', 'Lucro contábil'), formatCents(view.lucroContabil.valorCents), 'defis-lucro')}
              {linha(
                t('simples.defis.limiteIsencao', 'Limite de isenção (art. 145 § 1º)'),
                view.lucroContabil.limiteIsencaoCents === null ? '—' : formatCents(view.lucroContabil.limiteIsencaoCents),
                'defis-limite',
              )}
              {linha(
                t('simples.defis.informarLucro', 'Informar o lucro na DEFIS'),
                view.lucroContabil.informar ? t('simples.sim', 'Sim') : t('simples.nao', 'Não'),
                'defis-informar',
              )}
              {linha(t('simples.defis.estoqueInicial', 'Estoque inicial'), formatCents(view.estoqueInicialCents), 'defis-estoque-inicial')}
              {linha(t('simples.defis.estoqueFinal', 'Estoque final'), formatCents(view.estoqueFinalCents), 'defis-estoque-final')}
              {view.lucroContabil.avisos.length > 0 && (
                <ul data-testid="defis-avisos-lucro" className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">
                  {view.lucroContabil.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
            </section>

            <fieldset disabled={!podeGerir} className="space-y-4">
              <section className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-800 p-4 sm:grid-cols-2">
                <Field label={t('simples.defis.empregadosInicio', 'Empregados no início do ano')}>
                  <input inputMode="numeric" value={form.empregadosInicio} onChange={(e) => set('empregadosInicio', e.target.value)} className={inp} />
                </Field>
                <Field label={t('simples.defis.empregadosFim', 'Empregados no fim do ano')}>
                  <input inputMode="numeric" value={form.empregadosFim} onChange={(e) => set('empregadosFim', e.target.value)} className={inp} />
                </Field>
                <Field label={t('simples.defis.ganhosCapital', 'Ganhos de capital')}>
                  <input inputMode="decimal" placeholder="0,00" value={form.ganhosCapital} onChange={(e) => set('ganhosCapital', e.target.value)} className={inp} />
                </Field>
                <Field label={t('simples.defis.ganhosRendaVariavel', 'Ganhos líquidos em renda variável')}>
                  <input inputMode="decimal" placeholder="0,00" value={form.ganhosRendaVariavel} onChange={(e) => set('ganhosRendaVariavel', e.target.value)} className={inp} />
                </Field>
                <Field label={t('simples.defis.exportacaoDireta', 'Receita de exportação direta')}>
                  <input inputMode="decimal" placeholder="0,00" value={form.exportacaoDireta} onChange={(e) => set('exportacaoDireta', e.target.value)} className={inp} />
                </Field>
              </section>

              <section data-testid="defis-socios" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={h3}>{t('simples.defis.socios', 'Sócios e cotas em tesouraria')}</h3>
                  <span data-testid="defis-soma" className={`font-mono text-xs ${soma === 10000 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {t('simples.defis.soma', 'Soma (sócios + tesouraria)')}: {soma === null ? '—' : `${formatPctHundredths(soma)}%`}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {t('simples.defis.somaAviso', 'Com sócio informado, a soma das participações mais as cotas em tesouraria deve dar 100% (manual da DEFIS, 9.4.3.1 itens 7.3 e 8) — quem confere é o servidor ao salvar.')}
                </p>
                <Field label={t('simples.defis.tabelaSocios', 'Tabela de onde vêm os sócios')}>
                  <select aria-label={t('simples.defis.tabelaSocios', 'Tabela de onde vêm os sócios')} value={tabelaSocios} onChange={(e) => trocarTabela(e.target.value)} className={inp}>
                    <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                    {tabelas.map((tb) => <option key={tb.id} value={tb.id}>{tb.nome}</option>)}
                  </select>
                </Field>
                {form.socios.length === 0 && <p className="text-neutral-500">{t('simples.defis.semSocios', 'Nenhum sócio informado.')}</p>}
                <ul className="space-y-3">
                  {form.socios.map((s, i) => (
                    <li key={i} data-testid={`socio-${i + 1}`} className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-800 p-3 sm:grid-cols-3">
                      <Field label={t('simples.defis.socioN', 'Sócio {{n}}', { n: String(i + 1) })}>
                        {tabelaSocios ? (
                          <RelationSelector
                            name={`socio-${i + 1}`}
                            value={s.contactId}
                            onChange={(_: string, v: string | string[] | null) => setSocio(i, { contactId: String(v || '') })}
                            targetTable={tabelaSocios}
                            className={inp}
                          />
                        ) : (
                          <span className="text-xs text-neutral-500">{t('simples.defis.escolhaTabela', 'Escolha a tabela dos sócios.')}</span>
                        )}
                      </Field>
                      <Field label={t('simples.defis.participacao', 'Participação (%)')}>
                        <input inputMode="decimal" placeholder="0,00" value={s.participacao} onChange={(e) => setSocio(i, { participacao: e.target.value })} className={inp} />
                      </Field>
                      <Field label={t('simples.defis.irrf', 'IRRF')}>
                        <input inputMode="decimal" placeholder="0,00" value={s.irrf} onChange={(e) => setSocio(i, { irrf: e.target.value })} className={inp} />
                      </Field>
                      <Field label={t('simples.defis.rendimentosIsentos', 'Rendimentos isentos')}>
                        <input inputMode="decimal" placeholder="0,00" value={s.rendimentosIsentos} onChange={(e) => setSocio(i, { rendimentosIsentos: e.target.value })} className={inp} />
                      </Field>
                      <Field label={t('simples.defis.rendimentosTributaveis', 'Rendimentos tributáveis')}>
                        <input inputMode="decimal" placeholder="0,00" value={s.rendimentosTributaveis} onChange={(e) => setSocio(i, { rendimentosTributaveis: e.target.value })} className={inp} />
                      </Field>
                      {podeGerir && (
                        <div className="flex items-end">
                          <button type="button" onClick={() => set('socios', form.socios.filter((_, j) => j !== i))} className={btnRem}>
                            {t('simples.segregacao.removerLinha', 'Remover')}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('simples.defis.cotasTesouraria', 'Cotas em tesouraria (%)')}>
                    <input inputMode="decimal" placeholder="0,00" value={form.cotasTesouraria} onChange={(e) => set('cotasTesouraria', e.target.value)} className={inp} />
                  </Field>
                </div>
                {podeGerir && (
                  <button type="button" disabled={form.socios.length >= MAX_LINHAS_DEFIS} onClick={() => set('socios', [...form.socios, socioVazio()])} className={btnAdd}>
                    {t('simples.defis.adicionarSocio', 'Adicionar sócio')}
                  </button>
                )}
              </section>

              <section data-testid="defis-exportacao" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
                <h3 className={h3}>{t('simples.defis.exportacaoComercial', 'Exportação via comercial exportadora')}</h3>
                {form.exportacaoComercial.map((x, i) => (
                  <div key={i} data-testid={`exportacao-${i + 1}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
                    <input aria-label={t('simples.defis.cnpjExportadoraN', 'CNPJ da comercial exportadora {{n}}', { n: String(i + 1) })} value={x.cnpj} onChange={(e) => setExp(i, { cnpj: e.target.value })} className={inp} />
                    <input aria-label={t('simples.defis.valorExportacaoN', 'Valor exportado {{n}}', { n: String(i + 1) })} inputMode="decimal" placeholder="0,00" value={x.valor} onChange={(e) => setExp(i, { valor: e.target.value })} className={inp} />
                    {podeGerir && (
                      <button type="button" onClick={() => set('exportacaoComercial', form.exportacaoComercial.filter((_, j) => j !== i))} className={btnRem}>
                        {t('simples.segregacao.removerLinha', 'Remover')}
                      </button>
                    )}
                  </div>
                ))}
                {podeGerir && (
                  <button type="button" disabled={form.exportacaoComercial.length >= MAX_LINHAS_DEFIS} onClick={() => set('exportacaoComercial', [...form.exportacaoComercial, exportacaoVazia()])} className={btnAdd}>
                    {t('simples.defis.adicionarExportadora', 'Adicionar comercial exportadora')}
                  </button>
                )}
              </section>

              <section data-testid="defis-doacoes" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
                <h3 className={h3}>{t('simples.defis.doacoes', 'Doações a campanha eleitoral')}</h3>
                {form.doacoesEleitorais.map((x, i) => (
                  <div key={i} data-testid={`doacao-${i + 1}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                    <input aria-label={t('simples.defis.cnpjBeneficiarioN', 'CNPJ do beneficiário {{n}}', { n: String(i + 1) })} value={x.cnpj} onChange={(e) => setDoacao(i, { cnpj: e.target.value })} className={inp} />
                    <select
                      aria-label={t('simples.defis.tipoBeneficiarioN', 'Tipo de beneficiário {{n}}', { n: String(i + 1) })}
                      value={x.tipoBeneficiario}
                      // ponytail: folha string → união (cada <option> é membro da união)
                      onChange={(e) => setDoacao(i, { tipoBeneficiario: e.target.value as DefisDoacaoLinha['tipoBeneficiario'] })}
                      className={inp}
                    >
                      <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                      {TIPOS_BENEFICIARIO.map((k) => <option key={k} value={k}>{t(`simples.defis.tipo.${k}`, TIPO_LABEL[k])}</option>)}
                    </select>
                    <select
                      aria-label={t('simples.defis.formaDoacaoN', 'Forma da doação {{n}}', { n: String(i + 1) })}
                      value={x.formaDoacao}
                      // ponytail: folha string → união
                      onChange={(e) => setDoacao(i, { formaDoacao: e.target.value as DefisDoacaoLinha['formaDoacao'] })}
                      className={inp}
                    >
                      <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                      {FORMAS_DOACAO.map((k) => <option key={k} value={k}>{t(`simples.defis.forma.${k}`, FORMA_LABEL[k])}</option>)}
                    </select>
                    <input aria-label={t('simples.defis.valorDoacaoN', 'Valor da doação {{n}}', { n: String(i + 1) })} inputMode="decimal" placeholder="0,00" value={x.valor} onChange={(e) => setDoacao(i, { valor: e.target.value })} className={inp} />
                    {podeGerir && (
                      <button type="button" onClick={() => set('doacoesEleitorais', form.doacoesEleitorais.filter((_, j) => j !== i))} className={btnRem}>
                        {t('simples.segregacao.removerLinha', 'Remover')}
                      </button>
                    )}
                  </div>
                ))}
                {podeGerir && (
                  <button type="button" disabled={form.doacoesEleitorais.length >= MAX_LINHAS_DEFIS} onClick={() => set('doacoesEleitorais', [...form.doacoesEleitorais, doacaoVazia()])} className={btnAdd}>
                    {t('simples.defis.adicionarDoacao', 'Adicionar doação')}
                  </button>
                )}
              </section>
            </fieldset>

            {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{erro}</div>}
            {salvo && <p role="status" className="text-xs text-emerald-300">{t('simples.defis.salvo', 'DEFIS salva.')}</p>}
            {podeGerir && (
              <div className="flex justify-end">
                <button type="button" disabled={saving} onClick={() => void salvar()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                  {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.defis.salvar', 'Salvar DEFIS')}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
