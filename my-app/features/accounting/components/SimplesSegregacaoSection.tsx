import { useEffect, useRef, useState } from 'react';
import { simplesService, type SimplesSegregacao } from '../../../lib/services/simples.service';
import { resolveError } from '../lib/resolveError';
import { MAX_PARCELAS, linhaVazia, toSegregacaoLinhas, toSegregacaoUpsert, type SegregacaoLinha } from '../lib/simplesForms';
import { useAccountingT } from '../lib/useAccountingT';
import { inputClass } from './SpedGenerationPanel';

const ERRO_LABEL = {
  demais: 'No máximo 50 parcelas por mês.',
  natureza: 'Escolha a natureza da parcela {{n}}.',
  receita: 'Receita da parcela {{n}} inválida — maior que zero, no formato 1.234,56.',
  motivo: 'Escolha o motivo da parcela {{n}}.',
} as const;

export interface SimplesSegregacaoSectionProps {
  unitId: string;
  competencia: string;
  /** Gravou: a apuração da competência muda — quem abriu recalcula. */
  onSalvo: () => void;
}

/**
 * Item 12 — segregação manual da receita do mês (`PUT /simples/segregacao/{competencia}`; X14 item 12; item 7 do §3.1
 * do FE-INCR-TAX-ASSESSMENT), pré-preenchida pelo GET do BE (P4-3 b). Até 50 parcelas; o envio substitui o conjunto
 * inteiro do mês. Os tributos excluídos vêm da RESPOSTA (`excluir`, derivados do motivo no BE) — a tela não os deduz.
 * Seção do detalhe da competência (lacuna 1 de D-2026-10-15-FE-SIMPLES-PR-C-LACUNAS).
 */
export function SimplesSegregacaoSection({ unitId, competencia, onSalvo }: SimplesSegregacaoSectionProps) {
  const { t, tRef } = useAccountingT();
  const [atual, setAtual] = useState<SimplesSegregacao | null>(null);
  const [linhas, setLinhas] = useState<SegregacaoLinha[]>([]);
  const [aberta, setAberta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [podeGerir, setPodeGerir] = useState(true);
  const req = useRef(0);

  useEffect(() => {
    if (!aberta) return;
    const r = ++req.current;
    setLoading(true);
    setErro(null);
    simplesService.obterSegregacao(competencia, { unitId }).then(
      (v) => {
        if (r !== req.current) return;
        setAtual(v);
        setLinhas(toSegregacaoLinhas(v));
        setLoading(false);
      },
      (e: unknown) => {
        if (r !== req.current) return;
        setErro(resolveError(e, tRef.current('simples.segregacao.error.load', 'Erro ao carregar a segregação.')));
        setLoading(false);
      },
    );
  }, [aberta, competencia, unitId, tRef]);

  const setLinha = (i: number, patch: Partial<SegregacaoLinha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function salvar() {
    const b = toSegregacaoUpsert(unitId, linhas);
    if (!b.ok) {
      setErro(tRef.current(`simples.segregacao.erro.${b.error}`, ERRO_LABEL[b.error], { n: String(b.linha) }));
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const v = await simplesService.salvarSegregacao(competencia, b.body);
      setAtual(v);
      setLinhas(toSegregacaoLinhas(v));
      onSalvo();
    } catch (e: unknown) {
      if (e && typeof e === 'object' && (e as { status?: unknown }).status === 403) setPodeGerir(false);
      setErro(resolveError(e, tRef.current('simples.segregacao.error.save', 'Não foi possível salvar a segregação.')));
    } finally {
      setSaving(false);
    }
  }

  const sel = `${inputClass} w-full`;
  return (
    <section data-testid="segregacao" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('simples.segregacao.title', 'Segregação manual da receita')}</h3>
        {!aberta && (
          <button type="button" onClick={() => setAberta(true)} className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700">
            {t('simples.segregacao.abrir', 'Ver / editar segregação')}
          </button>
        )}
      </div>
      {aberta && (
        <>
          <p className="text-xs text-neutral-500">
            {t('simples.segregacao.issOutroMunicipio', 'ISS devido a outro município não é motivo de segregação: continua no DAS (LC 123 art. 18 § 4º-A V). Salvar substitui todas as parcelas do mês.')}
          </p>
          {loading ? (
            <p className="text-sm text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
          ) : (
            <>
              {linhas.length === 0 && <p className="text-sm text-neutral-500">{t('simples.segregacao.vazia', 'Sem segregação manual neste mês.')}</p>}
              <ul className="space-y-2">
                {linhas.map((l, i) => {
                  const salva = atual?.parcelas[i];
                  const igual = salva && salva.natureza === l.natureza && salva.motivo === l.motivo;
                  return (
                    <li key={i} data-testid={`parcela-${i + 1}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                      <select
                        aria-label={t('simples.segregacao.naturezaN', 'Natureza da parcela {{n}}', { n: String(i + 1) })}
                        value={l.natureza}
                        // ponytail: folha string → união (cada <option> é membro da união)
                        onChange={(e) => setLinha(i, { natureza: e.target.value as SegregacaoLinha['natureza'] })}
                        className={sel}
                      >
                        <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                        <option value="SERVICO">{t('simples.natureza.SERVICO', 'Serviço')}</option>
                        <option value="REVENDA">{t('simples.natureza.REVENDA', 'Revenda')}</option>
                        <option value="LOCACAO_MOVEL">{t('simples.natureza.LOCACAO_MOVEL', 'Locação de bens móveis')}</option>
                      </select>
                      <input
                        aria-label={t('simples.segregacao.receitaN', 'Receita da parcela {{n}}', { n: String(i + 1) })}
                        value={l.receita}
                        inputMode="decimal"
                        placeholder="0,00"
                        onChange={(e) => setLinha(i, { receita: e.target.value })}
                        className={sel}
                      />
                      <select
                        aria-label={t('simples.segregacao.motivoN', 'Motivo da parcela {{n}}', { n: String(i + 1) })}
                        value={l.motivo}
                        // ponytail: folha string → união
                        onChange={(e) => setLinha(i, { motivo: e.target.value as SegregacaoLinha['motivo'] })}
                        className={sel}
                      >
                        <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                        <option value="MONOFASICO">{t('simples.motivoSeg.MONOFASICO', 'Monofásico (PIS/COFINS)')}</option>
                        <option value="ICMS_ST">{t('simples.motivoSeg.ICMS_ST', 'ICMS por substituição tributária')}</option>
                        <option value="ISS_RETIDO">{t('simples.motivoSeg.ISS_RETIDO', 'ISS retido')}</option>
                        <option value="MONOFASICO_E_ICMS_ST">{t('simples.motivoSeg.MONOFASICO_E_ICMS_ST', 'Monofásico e ICMS-ST')}</option>
                      </select>
                      <div className="flex items-center gap-2">
                        {igual && salva.excluir.length > 0 && (
                          <span data-testid={`excluir-${i + 1}`} className="rounded-lg bg-sky-500/10 px-1.5 py-0.5 text-[11px] text-sky-300">
                            {t('simples.segregacao.excluir', 'fora do DAS')}: {salva.excluir.join(', ')}
                          </span>
                        )}
                        {podeGerir && (
                          <button type="button" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))} className="text-xs text-neutral-400 hover:text-red-300">
                            {t('simples.segregacao.removerLinha', 'Remover')}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</div>}
              {podeGerir && (
                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    type="button"
                    disabled={linhas.length >= MAX_PARCELAS}
                    onClick={() => setLinhas((ls) => [...ls, linhaVazia()])}
                    className="rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {t('simples.segregacao.adicionar', 'Adicionar parcela')}
                  </button>
                  <button type="button" disabled={saving} onClick={() => void salvar()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                    {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.segregacao.salvar', 'Salvar segregação')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
