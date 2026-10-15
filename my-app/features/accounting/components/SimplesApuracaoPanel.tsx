import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import { simplesService, type Apuracao } from '../../../lib/services/simples.service';
import type { CompanyFiscalProfileView } from '../../../lib/services/companyFiscalProfile.service';
import { formatCents } from '../lib/formatCents';
import { resolveError } from '../lib/resolveError';
import { CONCORRENCIA_ANO, celulaCarregando, celulaDaApuracao, celulaDoErro, competenciasDoAno, emLotes, type CelulaSimples } from '../lib/simplesGrid';
import { useAccountingT } from '../lib/useAccountingT';
import { SimplesApuracaoDetalhe } from './SimplesApuracaoDetalhe';

export interface SimplesApuracaoPanelProps {
  unitId: string;
  ano: number;
  /** O perfil do ano já carregado pela aba — o regime decide a coluna (item 1) e o MEI sem enquadramento ganha atalho (item 8). */
  perfil: CompanyFiscalProfileView & { regime: 'SIMPLES' | 'MEI' };
  /** Item 8: leva à seção do enquadramento MEI na aba Perfil fiscal. */
  onIrParaEnquadramentoMei?: (ano: number) => void;
}

/**
 * Grade do ano do Simples Nacional (FE-INCR-SIMPLES PR-A, itens 1–7). 12 competências × uma coluna (DAS ou DAS-MEI,
 * P4-1 a); cada linha é um `GET /simples/apuracoes/{AAAA-MM}` com 3 em voo (F-FS-3 a); o detalhe abre em `Modal`
 * com o botão Calcular (nada gravado). `<table>` + `Modal`: o `GenericTable` é do DynamicTable (precedente do
 * `TaxAssessmentPanel`/`LegalParametersPanel`).
 */
export function SimplesApuracaoPanel({ unitId, ano, perfil, onIrParaEnquadramentoMei }: SimplesApuracaoPanelProps) {
  const { t, tRef } = useAccountingT();
  const mei = perfil.regime === 'MEI';
  const [celulas, setCelulas] = useState<CelulaSimples[]>(() => competenciasDoAno(ano).map(celulaCarregando));
  const [aberta, setAberta] = useState<string | null>(null);
  const [calcErro, setCalcErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Só a última carga do ano aplica as respostas (troca de ano/unidade com GETs em voo).
  const anoReq = useRef(0);

  const aplicar = useCallback((c: CelulaSimples) => {
    setCelulas((cs) => cs.map((x) => (x.competencia === c.competencia ? c : x)));
  }, []);

  useEffect(() => {
    const req = ++anoReq.current;
    const comps = competenciasDoAno(ano);
    setCelulas(comps.map(celulaCarregando));
    void emLotes(comps, CONCORRENCIA_ANO, async (comp) => {
      let c: CelulaSimples;
      try {
        c = celulaDaApuracao(await simplesService.obterApuracao(comp, { unitId }));
      } catch (err: unknown) {
        c = celulaDoErro(comp, err, tRef.current('simples.error.load', 'Erro ao carregar a apuração.'));
      }
      if (req === anoReq.current) aplicar(c);
    });
  }, [unitId, ano, tRef, aplicar]);

  const celula = aberta ? celulas.find((c) => c.competencia === aberta) : undefined;

  async function calcular(comp: string) {
    setBusy(true);
    setCalcErro(null);
    const req = anoReq.current;
    try {
      const a: Apuracao = await simplesService.calcularApuracao(comp, { unitId });
      if (req === anoReq.current) aplicar(celulaDaApuracao(a));
    } catch (err: unknown) {
      if (req === anoReq.current) setCalcErro(resolveError(err, tRef.current('simples.error.calcular', 'Não foi possível calcular.')));
    } finally {
      setBusy(false);
    }
  }

  const meiSemEnquadramento = mei && (perfil.meiContribuinteIcms === null || perfil.meiContribuinteIss === null);
  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const btn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:opacity-50';
  const selo = (cls: string, texto: string) => <span className={`rounded-lg px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{texto}</span>;

  const situacao = (c: CelulaSimples): string => {
    switch (c.estado) {
      case 'carregando': return t('simples.estado.carregando', 'Carregando…');
      case 'semPerfil': return t('simples.estado.semPerfil', 'Sem dado de perfil');
      case 'naoRegulamentada': return t('simples.estado.naoRegulamentada', 'Regra não regulamentada');
      case 'registrado': return t('simples.estado.registrado', 'DAS registrado');
      case 'calculado': return t('simples.estado.calculado', 'Calculado (sem DAS)');
      default: return t('simples.estado.erro', 'Erro');
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className={th}>{t('simples.col.competencia', 'Competência')}</th>
              <th className={th}>{mei ? t('simples.col.dasMei', 'DAS-MEI') : t('simples.col.das', 'DAS')}</th>
              <th className={th}>{t('simples.col.oficial', 'Oficial')}</th>
              <th className={th}>{t('simples.col.divergencia', 'Divergência')}</th>
              <th className={th}>{t('simples.col.situacao', 'Situação')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {celulas.map((c) => (
              <tr
                key={c.competencia}
                data-testid={`simples-${c.competencia}`}
                data-estado={c.estado}
                onClick={() => { if (c.estado !== 'carregando') { setAberta(c.competencia); setCalcErro(null); } }}
                className={c.estado === 'carregando' ? '' : 'cursor-pointer hover:bg-neutral-800/40'}
              >
                <td className={`${td} font-mono text-neutral-200`}>{c.competencia}</td>
                <td className={`${td} font-mono text-neutral-100`}>{c.apuracao ? formatCents(c.apuracao.totalCalculadoCents) : '—'}</td>
                <td className={`${td} font-mono text-neutral-300`}>{c.apuracao?.dasOficial ? formatCents(c.apuracao.dasOficial.valorCents) : '—'}</td>
                <td className={`${td} font-mono ${c.divergente ? 'font-semibold text-amber-300' : 'text-neutral-400'}`}>
                  {c.apuracao?.divergenciaCents == null ? '—' : formatCents(c.apuracao.divergenciaCents)}
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`text-xs ${c.estado === 'erro' ? 'text-red-300' : 'text-neutral-400'}`}>{situacao(c)}</span>
                    {c.bloqueante && selo('bg-red-500/15 text-red-300', t('simples.badge.bloqueante', 'Bloqueia o registro do DAS'))}
                    {c.pendente && selo('bg-sky-500/10 text-sky-300', t('simples.badge.pendente', 'Provisão pendente'))}
                    {c.warning && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300">
                        <FiAlertTriangle size={11} /> {t('simples.badge.warning', 'Alerta')}
                      </span>
                    )}
                    {c.divergente && selo('bg-amber-500/10 text-amber-300', t('simples.badge.divergente', 'Divergente'))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!celula}
        onClose={() => setAberta(null)}
        title={celula ? `${mei ? t('simples.col.dasMei', 'DAS-MEI') : t('simples.col.das', 'DAS')} · ${celula.competencia}` : ''}
        themeColor="bg-emerald-600"
        maxWidth="max-w-4xl"
      >
        {celula && (
          <div className="space-y-4 text-sm">
            {celula.mensagem && (
              <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
                {celula.mensagem}
              </div>
            )}
            {celula.estado === 'semPerfil' && meiSemEnquadramento && onIrParaEnquadramentoMei && (
              <button type="button" className={btn} onClick={() => { setAberta(null); onIrParaEnquadramentoMei(ano); }}>
                {t('simples.mei.irParaEnquadramento', 'Declarar o enquadramento do MEI no perfil fiscal')}
              </button>
            )}
            {calcErro && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{calcErro}</div>}
            <div className="flex justify-end">
              <button type="button" className={btn} disabled={busy} onClick={() => void calcular(celula.competencia)}>
                {busy ? t('simples.calculando', 'Calculando…') : t('simples.calcular', 'Calcular')}
              </button>
            </div>
            {celula.apuracao && <SimplesApuracaoDetalhe apuracao={celula.apuracao} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
