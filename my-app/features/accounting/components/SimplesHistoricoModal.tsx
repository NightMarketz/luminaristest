import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { simplesService, type SimplesHistorico } from '../../../lib/services/simples.service';
import { formatCents } from '../lib/formatCents';
import { resolveError } from '../lib/resolveError';
import { ehCompetencia, toHistoricoForm, toHistoricoUpsert, type HistoricoForm, type HistoricoFormError } from '../lib/simplesForms';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

const ERRO_LABEL: Record<HistoricoFormError, string> = {
  receitaInvalida: 'Receita bruta inválida — use o formato 1.234,56.',
  folhaInvalida: 'Folha inválida — use o formato 1.234,56 ou deixe em branco.',
};

export interface SimplesHistoricoModalProps {
  unitId: string;
  /** `null` = fechado. A competência inicial vem do atalho do `RBT12_INCOMPLETO` ou do botão da grade. */
  competencia: string | null;
  onClose: () => void;
  /** Gravou: o RBT12 de outras competências muda — quem abriu recarrega. */
  onSalvo: () => void;
}

/**
 * Item 11 — histórico mensal pré-adoção (`PUT /simples/historico/{competencia}`; X14 itens 10–11), pré-preenchido
 * pelo GET do BE (P4-3 b; 404 = mês vazio, F-GE-1 — o toast do 404 fica, decisão do dono em
 * D-2026-10-15-FE-SIMPLES-PR-C-LACUNAS). Modal próprio com competência livre: o histórico costuma ser de meses do ano
 * anterior, fora da grade. Sem o documento de origem (D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS).
 */
export function SimplesHistoricoModal({ unitId, competencia, onClose, onSalvo }: SimplesHistoricoModalProps) {
  const { t, tRef } = useAccountingT();
  const [comp, setComp] = useState('');
  const [atual, setAtual] = useState<SimplesHistorico | null>(null);
  const [form, setForm] = useState<HistoricoForm>(() => toHistoricoForm(null));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [podeGerir, setPodeGerir] = useState(true);
  const [salvo, setSalvo] = useState(false);
  const req = useRef(0);

  useEffect(() => {
    if (competencia) setComp(competencia);
  }, [competencia]);

  useEffect(() => {
    if (!competencia || !ehCompetencia(comp)) return;
    const r = ++req.current;
    setLoading(true);
    setErro(null);
    setSalvo(false);
    simplesService.obterHistorico(comp, { unitId }).then(
      (v) => {
        if (r !== req.current) return;
        setAtual(v);
        setForm(toHistoricoForm(v));
        setLoading(false);
      },
      (e: unknown) => {
        if (r !== req.current) return;
        setErro(resolveError(e, tRef.current('simples.historico.error.load', 'Erro ao carregar o histórico.')));
        setLoading(false);
      },
    );
  }, [comp, competencia, unitId, tRef]);

  async function salvar() {
    const b = toHistoricoUpsert(unitId, form);
    if (!b.ok) {
      setErro(tRef.current(`simples.historico.erro.${b.error}`, ERRO_LABEL[b.error]));
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const v = await simplesService.salvarHistorico(comp, b.body);
      setAtual(v);
      setForm(toHistoricoForm(v));
      setSalvo(true);
      onSalvo();
    } catch (e: unknown) {
      if (e && typeof e === 'object' && (e as { status?: unknown }).status === 403) setPodeGerir(false);
      setErro(resolveError(e, tRef.current('simples.historico.error.save', 'Não foi possível salvar o histórico.')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={!!competencia} onClose={onClose} title={t('simples.historico.title', 'Histórico pré-adoção')} themeColor="bg-emerald-600" maxWidth="max-w-xl">
      <div className="space-y-3 text-sm" data-testid="historico-modal">
        <p className="text-xs text-neutral-500">
          {t('simples.historico.subtitle', 'Receita bruta (e folha, para o fator R) dos meses antes de usar o sistema. O mês com receita no subrazão usa o subrazão; o histórico vale para os meses sem ela.')}
        </p>
        <Field label={t('simples.col.competencia', 'Competência')}>
          <input
            type="month"
            aria-label={t('simples.col.competencia', 'Competência')}
            value={comp}
            onChange={(e) => setComp(e.target.value)}
            className={`w-full sm:w-48 ${inputClass}`}
          />
        </Field>
        {loading ? (
          <p className="text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
        ) : (
          <>
            <p className="text-xs text-neutral-400" data-testid="historico-situacao">
              {atual
                ? t('simples.historico.declarado', 'Declarado: receita {{receita}}', { receita: formatCents(atual.receitaBrutaCents) })
                : t('simples.historico.vazio', 'Sem histórico declarado neste mês.')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('simples.historico.receitaBruta', 'Receita bruta do mês')}>
                <input aria-label={t('simples.historico.receitaBruta', 'Receita bruta do mês')} value={form.receitaBruta} inputMode="decimal" placeholder="0,00" onChange={(e) => setForm((f) => ({ ...f, receitaBruta: e.target.value }))} className={`w-full ${inputClass}`} />
              </Field>
              <Field label={t('simples.historico.folha', 'Folha de salários (opcional)')}>
                <input aria-label={t('simples.historico.folha', 'Folha de salários (opcional)')} value={form.folha} inputMode="decimal" onChange={(e) => setForm((f) => ({ ...f, folha: e.target.value }))} className={`w-full ${inputClass}`} />
              </Field>
            </div>
          </>
        )}
        {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{erro}</div>}
        {salvo && <p role="status" className="text-xs text-emerald-400">{t('simples.historico.salvo', 'Histórico salvo — a grade foi recalculada.')}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">
            {t('simples.fechar', 'Fechar')}
          </button>
          {podeGerir && (
            <button type="button" disabled={saving || loading || !ehCompetencia(comp)} onClick={() => void salvar()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.historico.salvar', 'Salvar histórico')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
