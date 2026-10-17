import { useEffect, useRef, useState } from 'react';
import { simplesService, type AliquotasSimples } from '../../../lib/services/simples.service';
import { formatCents } from '../lib/formatCents';
import { resolveError } from '../lib/resolveError';
import { decimalBR } from '../lib/simplesGrid';
import { useAccountingT } from '../lib/useAccountingT';
import { AlertasSimples } from './SimplesApuracaoDetalhe';

const REGRA_LABEL: Record<AliquotasSimples['regra'], string> = {
  INICIO_ATIVIDADE: 'Mês de início de atividade (2%)',
  FAIXA_MES_ANTERIOR: 'Faixa do mês anterior',
  FAIXA_MES_PRESTACAO: 'Faixa do mês da prestação',
};
const NATUREZA_LABEL: Record<string, string> = { SERVICO: 'Serviço', REVENDA: 'Revenda', LOCACAO_MOVEL: 'Locação de bens móveis', PARCERIA_GESTAO: 'Parceria (gestão)' };

const pct = (s: string | null) => (s === null ? '—' : `${decimalBR(s)}%`);

/**
 * Item 15 — alíquotas SUGERIDAS para o documento fiscal da competência (`GET /simples/aliquotas/{competencia}`; X14
 * item 29), seção do detalhe em ano SIMPLES (D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS), carregada ao abrir o mês. Por
 * atividade: alíquota efetiva, retenção de ISS, benefício municipal, pTotTribSN e crédito do adquirente. `regra` e os
 * `avisos[]` do BE ficam sempre visíveis, com o selo "Sugestão" — quem informa e responde pela alíquota é o prestador
 * (LC 123 art. 21 § 4º VI). Em ano MEI a seção não é montada (o BE daria 400).
 */
export function SimplesAliquotasSection({ unitId, competencia }: { unitId: string; competencia: string }) {
  const { t, tRef } = useAccountingT();
  const [dados, setDados] = useState<AliquotasSimples | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const req = useRef(0);

  useEffect(() => {
    const r = ++req.current;
    setLoading(true);
    setErro(null);
    setDados(null);
    simplesService.obterAliquotas(competencia, { unitId }).then(
      (d) => { if (r === req.current) { setDados(d); setLoading(false); } },
      (e: unknown) => {
        if (r !== req.current) return;
        setErro(resolveError(e, tRef.current('simples.aliquotas.error.load', 'Erro ao carregar as alíquotas sugeridas.')));
        setLoading(false);
      },
    );
  }, [competencia, unitId, tRef]);

  const td = 'py-1 pr-2';
  return (
    <section data-testid="aliquotas" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('simples.aliquotas.title', 'Alíquotas sugeridas do mês')}</h3>
        <span data-testid="selo-sugestao" className="rounded-lg bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300">
          {t('simples.aliquotas.sugestao', 'Sugestão')}
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</p>
      ) : erro ? (
        <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{erro}</div>
      ) : dados ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-300">
            <dt className="text-neutral-500">{t('simples.aliquotas.regra', 'Regra')}</dt>
            <dd data-testid="aliquotas-regra">{t(`simples.aliquotas.regraTipo.${dados.regra}`, REGRA_LABEL[dados.regra])}</dd>
            <dt className="text-neutral-500">{t('simples.aliquotas.mesReferencia', 'Mês de referência da faixa')}</dt>
            <dd className="font-mono">{dados.mesReferencia}</dd>
            {dados.rbt12Cents !== null && (
              <>
                <dt className="text-neutral-500">{t('simples.detail.rbt12', 'RBT12')}</dt>
                <dd className="font-mono">{formatCents(dados.rbt12Cents)}</dd>
              </>
            )}
            {dados.janelaRbt12 && (
              <>
                <dt className="text-neutral-500">{t('simples.detail.janela', 'Janela do RBT12')}</dt>
                <dd className="font-mono">{dados.janelaRbt12.de} → {dados.janelaRbt12.ate} <span className="text-neutral-500">({dados.janelaRbt12.regra})</span></dd>
              </>
            )}
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500">
                <tr>
                  <th className={td}>{t('simples.col.anexo', 'Anexo')}</th>
                  <th className={td}>{t('simples.col.natureza', 'Natureza')}</th>
                  <th className={td}>cTribNac</th>
                  <th className={td}>{t('simples.col.faixa', 'Faixa')}</th>
                  <th className={td}>{t('simples.col.fatorR', 'Fator R')}</th>
                  <th className={td}>{t('simples.col.aliquotaEfetiva', 'Alíq. efetiva')}</th>
                  <th className={td}>{t('simples.aliquotas.issRetencao', 'ISS a reter')}</th>
                  <th className={td}>pTotTribSN</th>
                  <th className={td}>{t('simples.aliquotas.credito', 'Crédito do adquirente')}</th>
                  <th className={td}>{t('simples.aliquotas.beneficio', 'Benefício municipal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {dados.atividades.map((a, i) => (
                  <tr key={`${a.anexo ?? ''}-${a.natureza}-${a.cTribNac ?? ''}-${i}`} data-testid={`aliquota-${i + 1}`}>
                    <td className={`${td} font-mono`}>{a.anexo ?? '—'}</td>
                    <td className={td}>{t(`simples.natureza.${a.natureza}`, NATUREZA_LABEL[a.natureza] ?? a.natureza)}</td>
                    <td className={`${td} font-mono`}>{a.cTribNac ?? '—'}</td>
                    <td className={`${td} font-mono`}>{a.faixa ?? '—'}</td>
                    <td className={`${td} font-mono`}>{a.fatorR === null ? '—' : decimalBR(a.fatorR)}</td>
                    <td className={`${td} font-mono`}>{pct(a.aliquotaEfetiva)}</td>
                    <td className={`${td} font-mono`}>{pct(a.issRetencao)}</td>
                    <td className={`${td} font-mono`}>{pct(a.pTotTribSNSugerido)}</td>
                    <td className={`${td} font-mono`}>
                      {a.creditoAdquirente
                        ? `ICMS ${pct(a.creditoAdquirente.ICMS)} · IBS ${pct(a.creditoAdquirente.IBS)} · CBS ${pct(a.creditoAdquirente.CBS)}`
                        : '—'}
                    </td>
                    <td className={td}>
                      {a.beneficioMunicipal ? (
                        <span>
                          {a.beneficioMunicipal.legislacao} <span className="text-neutral-500">({a.beneficioMunicipal.tipo})</span>
                          {a.beneficioMunicipal.pisoAplicado && <span className="ml-1 text-amber-300">{t('simples.aliquotas.pisoAplicado', 'piso de 2% aplicado')}</span>}
                          {a.beneficioMunicipal.excecaoPiso && <span className="ml-1 text-sky-300">{t('simples.aliquotas.excecaoPiso', 'exceção ao piso')}</span>}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul data-testid="aliquotas-avisos" className="list-disc space-y-1 pl-5 text-xs text-neutral-400">
            {dados.avisos.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <AlertasSimples alertas={dados.alertas} />
        </>
      ) : null}
    </section>
  );
}
