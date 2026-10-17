import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { simplesService, type SimplesDasnSimeiView } from '../../../lib/services/simples.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';

export interface SimplesDasnSimeiModalProps {
  unitId: string;
  ano: number;
  isOpen: boolean;
  onClose: () => void;
}

const statusDe = (e: unknown): unknown => (e && typeof e === 'object' ? (e as { status?: unknown }).status : undefined);

/**
 * Item 13 — DASN-SIMEI do ano MEI (`/simples/dasn-simei/{ano}`; X14 item 27; Res. CGSN 140 art. 109). Prazo, receita
 * total e a parte sujeita ao ICMS vêm do BE (do subrazão); meses sem subrazão viram aviso. O único campo digitado é a
 * contratação de empregado (art. 109 III). Aberto pelo cabeçalho do ano (F-FS-6 a). 403 esconde o salvar.
 */
export function SimplesDasnSimeiModal({ unitId, ano, isOpen, onClose }: SimplesDasnSimeiModalProps) {
  const { t, tRef } = useAccountingT();
  const [view, setView] = useState<SimplesDasnSimeiView | null>(null);
  const [contratou, setContratou] = useState<'' | 'sim' | 'nao'>('');
  const [loading, setLoading] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [podeGerir, setPodeGerir] = useState(true);
  const req = useRef(0);

  const aplicar = (v: SimplesDasnSimeiView) => {
    setView(v);
    setContratou(v.digitado ? (v.digitado.contratouEmpregado ? 'sim' : 'nao') : '');
  };

  useEffect(() => {
    if (!isOpen) return;
    const r = ++req.current;
    setLoading(true);
    setErroCarga(null);
    setErro(null);
    setSalvo(false);
    setView(null);
    simplesService.obterDasnSimei(ano, { unitId }).then(
      (v) => { if (r === req.current) { aplicar(v); setLoading(false); } },
      (e: unknown) => {
        if (r !== req.current) return;
        setErroCarga(resolveError(e, tRef.current('simples.dasn.error.load', 'Erro ao carregar a DASN-SIMEI.')));
        setLoading(false);
      },
    );
  }, [isOpen, ano, unitId, tRef]);

  async function salvar() {
    if (contratou === '') {
      setErro(t('simples.dasn.erro.contratou', 'Responda se o MEI contratou empregado no ano.'));
      return;
    }
    setSaving(true);
    setErro(null);
    setSalvo(false);
    const r = req.current;
    try {
      const v = await simplesService.salvarDasnSimei(ano, { unitId, contratouEmpregado: contratou === 'sim' });
      if (r !== req.current) return;
      aplicar(v);
      setSalvo(true);
    } catch (e: unknown) {
      if (r !== req.current) return;
      if (statusDe(e) === 403) setPodeGerir(false);
      setErro(resolveError(e, tRef.current('simples.dasn.error.save', 'Não foi possível salvar a DASN-SIMEI.')));
    } finally {
      setSaving(false);
    }
  }

  const linha = (rotulo: string, valor: string, testId?: string) => (
    <div className="flex justify-between gap-3 border-b border-neutral-800 py-1.5">
      <span className="text-neutral-400">{rotulo}</span>
      <span data-testid={testId} className="font-mono text-neutral-100">{valor}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('simples.dasn.title', 'DASN-SIMEI')} · ${ano}`} themeColor="bg-emerald-600" maxWidth="max-w-2xl">
      <div data-testid="dasn-modal" className="space-y-4 text-sm">
        {loading ? (
          <p className="text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
        ) : erroCarga ? (
          <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">{erroCarga}</div>
        ) : view ? (
          <>
            <section className="rounded-2xl border border-neutral-800 p-4">
              {linha(t('simples.dasn.prazo', 'Prazo de entrega'), formatDate(view.prazo), 'dasn-prazo')}
              {linha(t('simples.dasn.receitaTotal', 'Receita bruta total do ano'), formatCents(view.receitaBrutaTotalCents), 'dasn-receita')}
              {linha(t('simples.dasn.receitaIcms', 'Receita sujeita ao ICMS'), formatCents(view.receitaIcmsCents), 'dasn-icms')}
            </section>
            {view.mesesSemSubrazao.length > 0 && (
              <div role="status" data-testid="dasn-meses-sem-subrazao" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
                {t('simples.dasn.mesesSemSubrazao', 'Meses sem lançamento no subrazão (a receita deles não entra no total):')}{' '}
                <span className="font-mono">{view.mesesSemSubrazao.join(', ')}</span>
              </div>
            )}
            <fieldset disabled={!podeGerir} className="space-y-2 rounded-2xl border border-neutral-800 p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('simples.dasn.contratouEmpregado', 'Contratou empregado no ano?')}
              </legend>
              <div className="flex gap-4 text-neutral-200">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="dasn-contratou" checked={contratou === 'sim'} onChange={() => setContratou('sim')} />
                  {t('simples.sim', 'Sim')}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="dasn-contratou" checked={contratou === 'nao'} onChange={() => setContratou('nao')} />
                  {t('simples.nao', 'Não')}
                </label>
              </div>
            </fieldset>
            {erro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{erro}</div>}
            {salvo && <p role="status" className="text-xs text-emerald-300">{t('simples.dasn.salvo', 'DASN-SIMEI salva.')}</p>}
            {podeGerir && (
              <div className="flex justify-end">
                <button type="button" disabled={saving} onClick={() => void salvar()} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                  {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.dasn.salvar', 'Salvar DASN-SIMEI')}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
