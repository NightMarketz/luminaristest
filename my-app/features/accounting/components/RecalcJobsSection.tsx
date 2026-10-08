import { useCallback, useEffect, useRef, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { legalParametersService, type RecalcJob, type RecalcJobsPage } from '../../../lib/services/legalParameters.service';
import { StandardPagination } from '../../dashboard/shared/components/StandardPagination';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { inputClass } from './SpedGenerationPanel';

const POR_PAGINA = 20;

/** Review: o instante vem em UTC — mostra no fuso do escopo (America/Sao_Paulo), não a hora crua. */
const FMT_INSTANTE = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
export const instanteLocal = (iso: string): string => FMT_INSTANTE.format(new Date(iso));

const STATUS_CLASSE: Record<RecalcJob['status'], string> = {
  PENDING: 'bg-amber-500/10 text-amber-300',
  DONE: 'bg-emerald-500/10 text-emerald-300',
};
const STATUS_ROTULO: Record<RecalcJob['status'], string> = { PENDING: 'Pendente', DONE: 'Concluído' };
const EVENTO_ROTULO: Record<RecalcJob['evento'], string> = { PUBLISHED: 'Publicação', REVOKED: 'Revogação' };

/**
 * Seção "Recálculos" da aba Parâmetros legais (RECALC-STATUS, item 6): a fila `legal_parameter_recalc_jobs` que
 * publicar/revogar alimenta (BE-INCR-LEGAL-PARAMS PR-4), paginada no servidor, com a linha legal que disparou cada job,
 * o resultado (refeitas · avisos · sem mudança) e o último erro. Só leitura — qualquer autenticado (dono 08/10).
 */
export function RecalcJobsSection() {
  const { t, tRef } = useAccountingT();
  const [dados, setDados] = useState<RecalcJobsPage | null>(null);
  const [status, setStatus] = useState<RecalcJob['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Review: troca rápida de filtro/página — só a resposta do pedido mais recente entra na tela.
  const ultimoPedido = useRef(0);

  const carregar = useCallback(async () => {
    const pedido = ++ultimoPedido.current;
    setLoading(true);
    setError(null);
    try {
      const r = await legalParametersService.listRecalcJobs({ ...(status ? { status } : {}), page, pageSize: POR_PAGINA });
      if (pedido === ultimoPedido.current) setDados(r);
    } catch (err: unknown) {
      if (pedido === ultimoPedido.current) setError(resolveError(err, tRef.current('legalParams.recalc.error.load', 'Erro ao carregar os recálculos.')));
    } finally {
      if (pedido === ultimoPedido.current) setLoading(false);
    }
  }, [status, page, tRef]);

  useEffect(() => { void carregar(); }, [carregar]);

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const itens = dados?.items ?? [];

  return (
    <section className="mt-8" aria-label={t('legalParams.recalc.title', 'Recálculos')}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-neutral-100">{t('legalParams.recalc.title', 'Recálculos')}</h3>
        <div className="flex items-center gap-2">
          <select
            aria-label={t('legalParams.filter.status', 'Status')}
            value={status}
            onChange={(e) => { setStatus(e.target.value as RecalcJob['status'] | ''); setPage(1); }}
            className={`${inputClass} w-full sm:w-44`}
          >
            <option value="">{t('legalParams.recalc.filter.todos', 'Todos')}</option>
            <option value="PENDING">{t('legalParams.recalc.status.PENDING', STATUS_ROTULO.PENDING)}</option>
            <option value="DONE">{t('legalParams.recalc.status.DONE', STATUS_ROTULO.DONE)}</option>
          </select>
          <button
            type="button"
            onClick={() => void carregar()}
            className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            <FiRefreshCw size={12} />
            {t('legalParams.recalc.refresh', 'Atualizar')}
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        {t('legalParams.recalc.subtitle', 'Cada publicação ou revogação enfileira o recálculo das apurações confirmadas que a vigência alcança.')}
      </p>

      {error && <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className={th}>{t('legalParams.recalc.col.quando', 'Enfileirado')}</th>
              <th className={th}>{t('legalParams.recalc.col.evento', 'Evento')}</th>
              <th className={th}>{t('legalParams.recalc.col.linha', 'Linha')}</th>
              <th className={th}>{t('legalParams.recalc.col.status', 'Status')}</th>
              <th className={th}>{t('legalParams.recalc.col.resumo', 'Resultado')}</th>
              <th className={th}>{t('legalParams.recalc.col.tentativas', 'Tentativas')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 text-neutral-300" data-testid="recalc-jobs">
            {!loading && itens.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-500">{t('legalParams.recalc.empty', 'Nenhum recálculo.')}</td></tr>
            )}
            {itens.map((j) => (
              <tr key={j.id}>
                <td className={`${td} whitespace-nowrap text-xs`}>{instanteLocal(j.createdAt)}</td>
                <td className={`${td} text-xs`}>{t(`legalParams.recalc.evento.${j.evento}`, EVENTO_ROTULO[j.evento])}</td>
                <td className={`${td} text-xs`}>
                  {j.linha
                    ? `${j.linha.tabela} · ${j.linha.chave}${j.linha.discriminador ? ` · ${j.linha.discriminador}` : ''} (${j.linha.vigenteDesde} → ${j.linha.vigenteAte ?? '…'})`
                    : <span className="text-neutral-500">{t('legalParams.recalc.linhaRemovida', 'linha não encontrada')}</span>}
                </td>
                <td className={td}><span className={`rounded-lg px-2 py-0.5 text-xs ${STATUS_CLASSE[j.status]}`}>{t(`legalParams.recalc.status.${j.status}`, STATUS_ROTULO[j.status])}</span></td>
                <td className={`${td} text-xs`}>
                  {j.resumo
                    ? t('legalParams.recalc.resumo', '{{reconfirmadas}} refeitas · {{avisos}} avisos · {{inalteradas}} sem mudança', j.resumo)
                    : '—'}
                  {j.ultimoErro && <div className="mt-0.5 text-red-300" title={j.ultimoErro}>{t('legalParams.recalc.erro', 'Último erro')}: {j.ultimoErro}</div>}
                </td>
                <td className={`${td} text-xs`}>{j.tentativas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dados && dados.total > POR_PAGINA && (
        <div className="mt-3">
          <StandardPagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(dados.total / POR_PAGINA))}
            totalItems={dados.total}
            itemsPerPage={POR_PAGINA}
            onPageChange={setPage}
            scrollToTop={false}
          />
        </div>
      )}
    </section>
  );
}
