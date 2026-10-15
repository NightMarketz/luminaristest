import { FiAlertTriangle, FiTruck } from 'react-icons/fi';
import { ehMei, type AlertaSimples, type ApuracaoMei, type ApuracaoSimples, type Apuracao, type DasOficial, type LinhaTabelaLegal, type TributoSimples } from '../../../lib/services/simples.service';
import { formatCents } from '../lib/formatCents';
import { formatDate } from '../lib/formatDate';
import { decimalBR, ehBloqueante, formatBp, formatMilesimos, ordenarAlertas } from '../lib/simplesGrid';
import { useAccountingT } from '../lib/useAccountingT';

/** Rótulo pt (fallback do i18n) de cada código de alerta — `CODIGOS_ALERTA_SIMPLES` (SimplesDto.ts:87-104). */
export const ALERTA_LABEL: Record<AlertaSimples['codigo'], string> = {
  ATIVIDADE_SEM_ANEXO: 'Atividade sem anexo',
  RBT12_INCOMPLETO: 'RBT12 incompleto',
  LIMITE_ME_EXCEDIDO: 'Limite da ME excedido',
  LIMITE_EPP_EXCEDIDO: 'Limite da EPP excedido',
  SUBLIMITE_ICMS_ISS: 'Sublimite do ICMS/ISS',
  SEGREGACAO_MANUAL: 'Segregação manual',
  TIEOUT_DIVERGENTE: 'Subrazão × razão divergentes',
  HISTORICO_IGNORADO: 'Histórico pré-adoção ignorado',
  LIMITE_MEI_EXCEDIDO: 'Limite do MEI excedido',
  NFSE_DIVERGE_RECEITA: 'NFS-e diverge da receita',
  BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO: 'Benefício municipal não aplicado (desvantajoso)',
  ISS_VALOR_FIXO_MUNICIPAL: 'ISS por valor fixo municipal',
  MEI_ENQUADRAMENTO_DIVERGE: 'Enquadramento do MEI diverge das ocupações',
  MEI_TAC_COM_OCUPACAO_A: 'Transportador de cargas com ocupação da tabela A',
  MEI_OCUPACAO_EXCLUIDA: 'Ocupação fora do MEI',
};

const MOTIVO: Record<NonNullable<AlertaSimples['motivoInformativo']>, { key: string; label: string }> = {
  'DOCUMENTO_MUNICIPAL_TRANSIÇÃO': { key: 'DOCUMENTO_MUNICIPAL_TRANSICAO', label: 'Documento municipal (transição)' },
  REGIME_CAIXA: { key: 'REGIME_CAIXA', label: 'Regime de caixa' },
};

const h3 = 'mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500';
const dl = 'grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-300';
const dt = 'text-neutral-500';

/** Item 6 — alertas com severidade: WARNING antes de INFO; código traduzido + detalhe do BE verbatim. */
export function AlertasSimples({ alertas }: { alertas: readonly AlertaSimples[] }) {
  const { t } = useAccountingT();
  if (alertas.length === 0) return null;
  return (
    <section>
      <h3 className={h3}>{t('simples.alertas.title', 'Alertas')}</h3>
      <ul className="space-y-2" aria-label={t('simples.alertas.title', 'Alertas')}>
        {ordenarAlertas(alertas).map((a, i) => {
          const warning = a.severity === 'WARNING';
          return (
            <li
              key={`${a.codigo}-${i}`}
              data-testid={`alerta-${a.codigo}`}
              className={`rounded-xl border px-3 py-2 ${warning ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-neutral-700 bg-neutral-800/60 text-neutral-300'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {warning && <FiAlertTriangle size={13} className="shrink-0" />}
                <span className="font-medium">{t(`simples.alerta.${a.codigo}`, ALERTA_LABEL[a.codigo])}</span>
                <span className="rounded-lg bg-neutral-900/60 px-1.5 py-0.5 text-[11px] text-neutral-400">
                  {warning ? t('simples.severity.WARNING', 'Atenção') : t('simples.severity.INFO', 'Informativo')}
                </span>
                {ehBloqueante(a) && (
                  <span className="rounded-lg bg-red-500/15 px-1.5 py-0.5 text-[11px] font-medium text-red-300">
                    {t('simples.badge.bloqueante', 'Bloqueia o registro do DAS')}
                  </span>
                )}
                {a.motivoInformativo && (
                  <span className="rounded-lg bg-sky-500/10 px-1.5 py-0.5 text-[11px] text-sky-300">
                    {t(`simples.motivo.${MOTIVO[a.motivoInformativo].key}`, MOTIVO[a.motivoInformativo].label)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs">{a.detalhe}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TabelaLegal({ tabela }: { tabela: readonly LinhaTabelaLegal[] }) {
  const { t } = useAccountingT();
  return (
    <section>
      <h3 className={h3}>{t('simples.detail.tabela', 'Tabela de lei usada')}</h3>
      <ul className="space-y-1 text-xs text-neutral-400">
        {tabela.map((l) => (
          <li key={l.legalParameterId}>
            {l.fonte} · <span className="font-mono">{t('simples.detail.vigenteDesde', 'vigente desde')} {formatDate(l.vigenteDesde)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DasOficialBloco({ das, divergenciaCents }: { das: DasOficial | null; divergenciaCents: number | null }) {
  const { t } = useAccountingT();
  return (
    <section>
      <h3 className={h3}>{t('simples.detail.dasOficial', 'DAS oficial')}</h3>
      {das ? (
        <dl className={dl}>
          <dt className={dt}>{t('simples.detail.numeroDocumento', 'Número do documento')}</dt><dd className="font-mono">{das.numeroDocumento}</dd>
          <dt className={dt}>{t('simples.detail.valorOficial', 'Valor oficial')}</dt><dd className="font-mono">{formatCents(das.valorCents)}</dd>
          <dt className={dt}>{t('simples.detail.vencimento', 'Vencimento')}</dt><dd className="font-mono">{formatDate(das.vencimento)}</dd>
          <dt className={dt}>{t('simples.detail.divergencia', 'Divergência (oficial − calculado)')}</dt>
          <dd data-testid="divergencia" className={`font-mono ${divergenciaCents ? 'font-semibold text-amber-300' : ''}`}>
            {divergenciaCents === null ? '—' : formatCents(divergenciaCents)}
          </dd>
          {das.provisaoPendente && (
            <>
              <dt className={dt}>{t('simples.detail.provisao', 'Provisão')}</dt>
              <dd className="text-sky-300">{t('simples.badge.pendente', 'Provisão pendente')}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-neutral-500">{t('simples.detail.semDas', 'Nenhum DAS oficial registrado nesta competência.')}</p>
      )}
    </section>
  );
}

const tributosTexto = (tr: Partial<Record<TributoSimples, number>>) =>
  Object.entries(tr).map(([k, v]) => `${k} ${formatCents(v ?? 0)}`).join(' · ');

/** Item 4 — detalhe ME/EPP (conteúdo do item 3 do §3.1 do FE-INCR-TAX-ASSESSMENT). */
function DetalheSimples({ a }: { a: ApuracaoSimples }) {
  const { t } = useAccountingT();
  const td = 'py-1 pr-2';
  return (
    <>
      <dl className={dl}>
        <dt className={dt}>{t('simples.detail.rbt12', 'RBT12')}</dt><dd className="font-mono">{formatCents(a.rbt12Cents)}</dd>
        <dt className={dt}>{t('simples.detail.janela', 'Janela do RBT12')}</dt>
        <dd className="font-mono">{a.janelaRbt12.de} → {a.janelaRbt12.ate} <span className="text-neutral-500">({a.janelaRbt12.regra})</span></dd>
        <dt className={dt}>{t('simples.detail.total', 'Total calculado')}</dt><dd data-testid="total-calculado" className="font-mono text-neutral-100">{formatCents(a.totalCalculadoCents)}</dd>
      </dl>

      <section>
        <h3 className={h3}>{t('simples.detail.atividades', 'Atividades')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500">
              <tr>
                <th className={td}>{t('simples.col.anexo', 'Anexo')}</th>
                <th className={td}>{t('simples.col.natureza', 'Natureza')}</th>
                <th className={td}>cTribNac</th>
                <th className={td}>{t('simples.col.receita', 'Receita')}</th>
                <th className={td}>{t('simples.col.faixa', 'Faixa')}</th>
                <th className={td}>{t('simples.col.aliquotaNominal', 'Alíq. nominal')}</th>
                <th className={td}>{t('simples.col.parcelaDeduzir', 'Parcela a deduzir')}</th>
                <th className={td}>{t('simples.col.aliquotaEfetiva', 'Alíq. efetiva')}</th>
                <th className={td}>{t('simples.col.fatorR', 'Fator R')}</th>
                <th className={td}>{t('simples.col.tributos', 'Tributos')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {a.atividades.map((at, i) => (
                <tr key={`${at.anexo}-${at.natureza}-${at.cTribNac ?? ''}-${i}`}>
                  <td className={`${td} font-mono`}>{at.anexo}</td>
                  <td className={td}>{at.natureza}</td>
                  <td className={`${td} font-mono`}>{at.cTribNac ?? '—'}</td>
                  <td className={`${td} font-mono`}>{formatCents(at.receitaCents)}</td>
                  <td className={`${td} font-mono`}>{at.faixa}</td>
                  <td className={`${td} font-mono`}>{decimalBR(at.aliquotaNominal)}%</td>
                  <td className={`${td} font-mono`}>{formatCents(at.parcelaDeduzirCents)}</td>
                  <td className={`${td} font-mono`}>{decimalBR(at.aliquotaEfetiva)}%</td>
                  <td className={`${td} font-mono`}>{at.fatorR === null ? '—' : decimalBR(at.fatorR)}</td>
                  <td className={`${td} font-mono`}>{tributosTexto(at.tributos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className={h3}>{t('simples.detail.espelho', 'Espelho do PGDAS-D')}</h3>
        <ul className="space-y-2 text-xs text-neutral-300">
          {a.espelho.map((e, i) => (
            <li key={`${e.item}-${i}`} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
              <div className="font-medium text-neutral-200">{e.atividade}</div>
              <div className="text-neutral-400">{e.detalhe}</div>
              <div className="font-mono">{t('simples.col.anexo', 'Anexo')} {e.anexo} · {formatCents(e.receitaCents)}</div>
              {e.parcelas.map((p, j) => (
                <div key={j} className="mt-1 font-mono text-neutral-400">
                  {formatCents(p.receitaCents)}
                  {Object.entries(p.qualificacoes).map(([trib, q]) => ` · ${trib}: ${q}`).join('')}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={h3}>{t('simples.detail.tieOut', 'Conferência subrazão × razão')}</h3>
        <dl className={dl}>
          <dt className={dt}>{t('simples.detail.subrazao', 'Subrazão')}</dt><dd className="font-mono">{formatCents(a.tieOut.subrazaoCents)}</dd>
          <dt className={dt}>{t('simples.detail.razao', 'Razão')}</dt><dd className="font-mono">{formatCents(a.tieOut.razaoCents)}</dd>
          <dt className={dt}>{t('simples.detail.tieOutOk', 'Confere')}</dt>
          <dd className={a.tieOut.ok ? 'text-emerald-400' : 'font-semibold text-red-300'}>{a.tieOut.ok ? t('simples.sim', 'Sim') : t('simples.nao', 'Não')}</dd>
        </dl>
      </section>

      <DasOficialBloco das={a.dasOficial} divergenciaCents={a.divergenciaCents} />
      <TabelaLegal tabela={a.tabela} />
    </>
  );
}

/** Item 5 — detalhe MEI (SIMEI). CBS/IBS em milésimos sem arredondar (F-FS-4 a). */
function DetalheMei({ a }: { a: ApuracaoMei }) {
  const { t } = useAccountingT();
  const sim = (b: boolean) => (b ? t('simples.sim', 'Sim') : t('simples.nao', 'Não'));
  const pct = a.limiteAnoCents > 0 ? Math.min(100, (a.receitaAcumuladaAnoCents / a.limiteAnoCents) * 100) : 0;
  const acima = a.receitaAcumuladaAnoCents > a.limiteAnoCents;
  const milesimos = Object.entries(a.tributosMilesimos);
  return (
    <>
      {a.transportadorCargas && (
        <span data-testid="selo-transportador" className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300">
          <FiTruck size={12} /> {t('simples.mei.transportador', 'Transportador autônomo de cargas')}
        </span>
      )}
      <dl className={dl}>
        <dt className={dt}>{t('simples.mei.salarioMinimo', 'Salário mínimo usado')}</dt><dd className="font-mono">{formatCents(a.salarioMinimoCents)}</dd>
        <dt className={dt}>{t('simples.mei.cppAliquota', 'Alíquota da CPP')}</dt><dd data-testid="cpp-aliquota" className="font-mono">{formatBp(a.cppAliquotaBp)}</dd>
        {(['CPP', 'ICMS', 'ISS'] as const).map((k) =>
          a.tributos[k] === undefined ? null : (
            <div key={k} className="contents">
              <dt className={dt}>{k}</dt><dd className="font-mono">{formatCents(a.tributos[k] ?? 0)}</dd>
            </div>
          ),
        )}
        {milesimos.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className={dt}>{k}</dt><dd data-testid={`milesimos-${k}`} className="font-mono">{formatMilesimos(v ?? 0)}</dd>
          </div>
        ))}
        <dt className={dt}>{t('simples.detail.total', 'Total calculado')}</dt><dd data-testid="total-calculado" className="font-mono text-neutral-100">{formatCents(a.totalCalculadoCents)}</dd>
        <dt className={dt}>{t('simples.mei.contribuinteIcms', 'Contribuinte de ICMS')}</dt><dd>{sim(a.enquadramento.contribuinteIcms)}</dd>
        <dt className={dt}>{t('simples.mei.contribuinteIss', 'Contribuinte de ISS')}</dt><dd>{sim(a.enquadramento.contribuinteIss)}</dd>
        <dt className={dt}>{t('simples.mei.receitaPa', 'Receita do mês')}</dt><dd className="font-mono">{formatCents(a.receitaPaCents)}</dd>
      </dl>

      <section>
        <h3 className={h3}>{t('simples.mei.limite', 'Receita acumulada no ano × limite')}</h3>
        <div className="font-mono text-xs text-neutral-300">
          <span data-testid="acumulado">{formatCents(a.receitaAcumuladaAnoCents)}</span> / {formatCents(a.limiteAnoCents)}
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <div className={`h-full ${acima ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </section>

      <DasOficialBloco das={a.dasOficial} divergenciaCents={a.divergenciaCents} />
      <TabelaLegal tabela={a.tabela} />
    </>
  );
}

/** Itens 3–6 — o detalhe escolhe a forma pelo `regime` da resposta. */
export function SimplesApuracaoDetalhe({ apuracao }: { apuracao: Apuracao }) {
  return (
    <div className="space-y-5 text-sm">
      <AlertasSimples alertas={apuracao.alertas} />
      {ehMei(apuracao) ? <DetalheMei a={apuracao} /> : <DetalheSimples a={apuracao} />}
    </div>
  );
}
