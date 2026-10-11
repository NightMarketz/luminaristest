import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import { taxAssessmentsService, type TaxAssessment, type TributoApuracao } from '../../../lib/services/taxAssessments.service';
import { TRIBUTOS_GRADE, formatCentsStr, montarGrade, type CelulaTributo } from '../lib/taxAssessmentGrid';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';

interface Props {
  unitId: string;
}

/**
 * Aba "Apuração" (FE-INCR-TAX-ASSESSMENT PR-1 — BRIEF §1 itens 1–4 e 7; F-1 a, F-3 a, F-5 a). Leitura da grade do
 * ano (X7 + X8), detalhe com memória/snapshot/histórico, `avisoParametroLegal` nas vivas e nas substituídas e o
 * reconcile da provisão pendente. Prévia/confirmação (PR-2/PR-3), Simples (PR-4) e MIT (PR-5) ficam fora.
 * `<table>` + `Modal` (o `GenericTable` é do DynamicTable — mesmo precedente do `LegalParametersPanel`).
 */
export function TaxAssessmentPanel({ unitId }: Props) {
  const { t, tRef } = useAccountingT();
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [linhas, setLinhas] = useState<TaxAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [celula, setCelula] = useState<{ periodo: string; tributo: TributoApuracao } | null>(null);
  const [detalhe, setDetalhe] = useState<TaxAssessment | null>(null);
  const [detalheError, setDetalheError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLinhas(await taxAssessmentsService.list({ unitId, anoCalendario: ano }));
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('taxAssessment.error.load', 'Erro ao carregar as apurações.')));
    } finally {
      setLoading(false);
    }
  }, [unitId, ano, tRef]);

  useEffect(() => { void carregar(); }, [carregar]);

  const grade = useMemo(() => montarGrade(linhas), [linhas]);
  const aberta: CelulaTributo | undefined = celula ? grade.find((g) => g.periodo === celula.periodo)?.tributos[celula.tributo] : undefined;

  const abrirVersao = useCallback(async (id: string) => {
    setDetalheError(null);
    try {
      setDetalhe(await taxAssessmentsService.get(id, { unitId }));
    } catch (err: unknown) {
      setDetalhe(null);
      setDetalheError(resolveError(err, tRef.current('taxAssessment.error.detail', 'Erro ao carregar o detalhe.')));
    }
  }, [unitId, tRef]);

  function abrirCelula(periodo: string, tributo: TributoApuracao, c: CelulaTributo) {
    setCelula({ periodo, tributo });
    setDetalhe(null);
    void abrirVersao(c.atual.id);
  }

  async function reconciliar(id: string) {
    setBusy(true);
    setDetalheError(null);
    try {
      const v = await taxAssessmentsService.reconcileProvisao(id, { unitId });
      setDetalhe(v);
      await carregar();
    } catch (err: unknown) {
      setDetalheError(resolveError(err, tRef.current('taxAssessment.error.reconcile', 'Não foi possível reconciliar a provisão.')));
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
  const statusTexto = (s: TaxAssessment['status']) =>
    s === 'CONFIRMED' ? t('taxAssessment.status.CONFIRMED', 'Confirmada') : t('taxAssessment.status.SUPERSEDED', 'Substituída');
  const seloAviso = (
    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300">
      <FiAlertTriangle size={11} />
      {t('taxAssessment.badge.aviso', 'Parâmetro legal')}
    </span>
  );
  const seloPendente = (
    <span className="rounded-lg bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300">
      {t('taxAssessment.badge.pendente', 'Provisão pendente')}
    </span>
  );

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-100">{t('taxAssessment.title', 'Apuração de tributos')}</h2>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          {t('taxAssessment.ano', 'Ano-calendário')}
          <input
            type="number"
            aria-label={t('taxAssessment.ano', 'Ano-calendário')}
            value={ano}
            min={2000}
            max={2100}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2000 && n <= 2100) setAno(n); }}
            className="w-24 rounded-xl border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </label>
      </div>

      {error && <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-500">{t('taxAssessment.loading', 'Carregando…')}</div>
      ) : grade.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500">{t('taxAssessment.empty', 'Nenhuma apuração gravada neste ano.')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className={th}>{t('taxAssessment.col.periodo', 'Período')}</th>
                {TRIBUTOS_GRADE.map((tr) => <th key={tr} className={th}>{tr}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {grade.map((g) => (
                <tr key={g.periodo} data-testid={`linha-${g.periodo}`}>
                  <td className={`${td} font-mono text-neutral-200`}>{g.periodo}</td>
                  {TRIBUTOS_GRADE.map((tr) => {
                    const c = g.tributos[tr];
                    return (
                      <td key={tr} className={td} data-testid={`celula-${g.periodo}-${tr}`}>
                        {c ? (
                          <button type="button" onClick={() => abrirCelula(g.periodo, tr, c)} className="flex flex-col items-start gap-1 text-left hover:opacity-80">
                            <span className="font-mono text-neutral-100">{formatCentsStr(c.atual.aPagarCents)}</span>
                            <span className="text-xs text-neutral-400">{statusTexto(c.atual.status)}</span>
                            {c.pendente && seloPendente}
                            {c.aviso && seloAviso}
                          </button>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!celula}
        onClose={() => { setCelula(null); setDetalhe(null); setDetalheError(null); }}
        title={celula ? `${celula.tributo} · ${celula.periodo} · ${ano}` : ''}
        themeColor="bg-emerald-600"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5 text-sm">
          {detalheError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">{detalheError}</div>}

          {detalhe && (
            <>
              {detalhe.avisoParametroLegal && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-200">
                  <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
                  <span>{detalhe.avisoParametroLegal}</span>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-300">
                <dt className="text-neutral-500">{t('taxAssessment.detail.status', 'Situação')}</dt><dd>{statusTexto(detalhe.status)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.modo', 'Modo')}</dt><dd className="font-mono">{detalhe.modo}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.codigoReceita', 'Código de receita')}</dt><dd className="font-mono">{detalhe.codigoReceita}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.base', 'Base')}</dt><dd className="font-mono">{formatCentsStr(detalhe.baseCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.devido', 'Devido')}</dt><dd className="font-mono">{formatCentsStr(detalhe.devidoCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.deducoes', 'Deduções')}</dt><dd className="font-mono">{formatCentsStr(detalhe.deducoesCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.aPagar', 'A pagar')}</dt><dd className="font-mono">{formatCentsStr(detalhe.aPagarCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.saldoNegativo', 'Saldo negativo')}</dt><dd className="font-mono">{formatCentsStr(detalhe.saldoNegativoCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.diferencaPostergada', 'Diferença postergada')}</dt><dd className="font-mono">{formatCentsStr(detalhe.diferencaPostergadaCents)}</dd>
                <dt className="text-neutral-500">{t('taxAssessment.detail.confirmedAt', 'Confirmada em')}</dt><dd className="font-mono">{detalhe.confirmedAt}</dd>
              </dl>

              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('taxAssessment.detail.snapshot', 'Snapshot dos parâmetros')}</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-300">
                  <dt className="text-neutral-500">tabelaVersao</dt><dd className="font-mono">{detalhe.tabelaVersao}</dd>
                  <dt className="text-neutral-500">parametrosSha256</dt>
                  <dd className="break-all font-mono">{detalhe.parametrosSha256 ?? t('taxAssessment.detail.semSnapshot', '— (anterior ao snapshot)')}</dd>
                </dl>
              </section>

              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('taxAssessment.detail.memoria', 'Memória de cálculo')}</h3>
                <table className="w-full text-left text-xs">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="py-1 pr-2 font-medium">{t('taxAssessment.memoria.codigo', 'Código')}</th>
                      <th className="py-1 pr-2 font-medium">{t('taxAssessment.memoria.descricao', 'Descrição')}</th>
                      <th className="py-1 pr-2 font-medium">{t('taxAssessment.memoria.valor', 'Valor')}</th>
                      <th className="py-1 font-medium">{t('taxAssessment.memoria.fonte', 'Fonte')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {detalhe.memoria.map((m, i) => (
                      <tr key={`${m.codigo}-${i}`}>
                        <td className="py-1 pr-2 font-mono">{m.codigo}</td>
                        <td className="py-1 pr-2">{m.descricao}</td>
                        <td className="py-1 pr-2 font-mono">{formatCentsStr(m.valorCents)}</td>
                        <td className="py-1 text-neutral-400">{m.fonte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {aberta && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('taxAssessment.detail.historico', 'Histórico de versões')}</h3>
              <ul className="space-y-2">
                {aberta.versoes.map((v) => (
                  <li key={v.id} data-testid={`versao-${v.id}`} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button type="button" onClick={() => void abrirVersao(v.id)} className="text-left text-neutral-200 hover:underline">
                        <span className="font-mono">{v.confirmedAt.slice(0, 10)}</span> · {statusTexto(v.status)} · <span className="font-mono">{formatCentsStr(v.aPagarCents)}</span>
                        {v.supersedesId && <span className="text-neutral-500"> · {t('taxAssessment.detail.substitui', 'substitui')} {v.supersedesId}</span>}
                      </button>
                      <div className="flex items-center gap-2">
                        {v.avisoParametroLegal && seloAviso}
                        {v.provisaoPendente && (
                          <button type="button" disabled={busy} onClick={() => void reconciliar(v.id)} className={smallBtn}>
                            {t('taxAssessment.reconcile', 'Reconciliar provisão')}
                          </button>
                        )}
                      </div>
                    </div>
                    {v.avisoParametroLegal && <p className="mt-1 text-xs text-amber-200">{v.avisoParametroLegal}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>
    </div>
  );
}
