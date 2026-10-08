import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiClock, FiPlusCircle } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../lib/context/AuthContext';
import { legalParametersService, type LegalParameter, type LegalParameterStatus } from '../../../lib/services/legalParameters.service';
import { StandardPagination } from '../../dashboard/shared/components/StandardPagination';
import {
  LEGAL_PARAMETER_TABELAS,
  cadeiaDe,
  paraProposta,
  propostaDeNovaVersao,
  propostaVazia,
  situacaoDe,
  validarProposta,
  valorResumo,
  type PropostaForm,
  type Situacao,
  type TipoValor,
} from '../lib/legalParameters';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

const POR_PAGINA = 50;
const isHttpUrl = (u: string) => /^https?:\/\//i.test(u);

const SITUACAO_CLASSE: Record<Situacao, string> = {
  EM_VIGOR: 'bg-emerald-500/10 text-emerald-300',
  RASCUNHO: 'bg-amber-500/10 text-amber-300',
  SUBSTITUIDA: 'bg-neutral-700/40 text-neutral-400',
  REVOGADA: 'bg-red-500/10 text-red-300',
};

const SITUACAO_ROTULO: Record<Situacao, string> = { EM_VIGOR: 'Em vigor', RASCUNHO: 'Rascunho', SUBSTITUIDA: 'Substituída', REVOGADA: 'Revogada' };

/**
 * Aba "Parâmetros legais" (FE-INCR-LEGAL-PARAMS; BRIEF itens 1–8). Coeficientes de lei da PLATAFORMA — não dependem
 * da unidade. Lista em `<table>` + `Modal` + `StandardPagination` (o `GenericTable` é do DynamicTable, mesmo precedente
 * de F-FAFE-7), paginação no cliente (a rota devolve tudo). Histórico = cadeia de versões (F-FE-LP-3 a). Propor,
 * publicar e revogar só para PLATFORM_ADMIN (F-FE-LP-2 a); o formato por tabela é do BE e o erro dele aparece no modal
 * (F-FE-LP-4 a).
 */
export function LegalParametersPanel() {
  const { t, tRef } = useAccountingT();
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';

  const [linhas, setLinhas] = useState<LegalParameter[]>([]);
  const [tabela, setTabela] = useState('');
  const [status, setStatus] = useState<LegalParameterStatus | ''>('');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historico, setHistorico] = useState<LegalParameter | null>(null);
  const [proposta, setProposta] = useState<PropostaForm | null>(null);
  const [propostaError, setPropostaError] = useState<string | null>(null);
  const [acao, setAcao] = useState<{ tipo: 'publish' | 'revoke'; linha: LegalParameter } | null>(null);
  const [acaoError, setAcaoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A lista vem inteira (todas as tabelas/status): a situação "substituída" e o histórico precisam das vizinhas.
  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLinhas(await legalParametersService.list());
    } catch (err: unknown) {
      setError(resolveError(err, tRef.current('legalParams.error.load', 'Erro ao carregar os parâmetros legais.')));
    } finally {
      setLoading(false);
    }
  }, [tRef]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setPage(1); }, [tabela, status, busca]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter((l) => (!tabela || l.tabela === tabela) && (!status || l.status === status) && (!q || l.chave.toLowerCase().includes(q)));
  }, [linhas, tabela, status, busca]);
  const pagina = filtradas.slice((page - 1) * POR_PAGINA, page * POR_PAGINA);

  const setCampo = <K extends keyof PropostaForm>(k: K, v: PropostaForm[K]) => setProposta((f) => (f ? { ...f, [k]: v } : f));

  function abrirProposta(base: PropostaForm) {
    setProposta(base);
    setPropostaError(null);
  }

  async function enviarProposta() {
    if (!proposta) return;
    const invalido = validarProposta(proposta);
    if (invalido) {
      setPropostaError(tRef.current(`legalParams.error.${invalido}`, invalido));
      return;
    }
    setBusy(true);
    setPropostaError(null);
    try {
      await legalParametersService.propose(paraProposta(proposta));
      setProposta(null);
      void carregar();
    } catch (err: unknown) {
      setPropostaError(resolveError(err, tRef.current('legalParams.error.propose', 'Não foi possível propor a linha.')));
    } finally {
      setBusy(false);
    }
  }

  async function executarAcao() {
    if (!acao) return;
    setBusy(true);
    setAcaoError(null);
    try {
      if (acao.tipo === 'publish') await legalParametersService.publish(acao.linha.id);
      else await legalParametersService.revoke(acao.linha.id);
      setAcao(null);
      void carregar();
    } catch (err: unknown) {
      setAcaoError(resolveError(err, tRef.current(`legalParams.error.${acao.tipo}`, 'Não foi possível concluir a ação.')));
    } finally {
      setBusy(false);
    }
  }

  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700';
  const cancelBtn = 'rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50';
  const situacaoTexto = (s: Situacao) => t(`legalParams.situacao.${s}`, SITUACAO_ROTULO[s]);
  const vigencia = (l: LegalParameter) => `${l.vigenteDesde} → ${l.vigenteAte ?? t('legalParams.semFim', 'sem fim')}`;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-100">{t('legalParams.title', 'Parâmetros legais')}</h2>
        {isPlatformAdmin && (
          <button
            type="button"
            onClick={() => abrirProposta(propostaVazia())}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <FiPlusCircle size={14} />
            {t('legalParams.new', 'Propor linha')}
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        {t('legalParams.subtitle', 'Coeficientes e tabelas de lei usados pelos cálculos, iguais para todos os clientes. Mudança só pelo administrador da plataforma; cada linha cita a fonte.')}
      </p>

      <div className="mb-3 flex flex-wrap gap-3">
        <select aria-label={t('legalParams.filter.tabela', 'Tabela')} value={tabela} onChange={(e) => setTabela(e.target.value)} className={`${inputClass} w-full sm:w-64`}>
          <option value="">{t('legalParams.filter.todasTabelas', 'Todas as tabelas')}</option>
          {LEGAL_PARAMETER_TABELAS.map((tb) => <option key={tb} value={tb}>{tb}</option>)}
        </select>
        <select aria-label={t('legalParams.filter.status', 'Status')} value={status} onChange={(e) => setStatus(e.target.value as LegalParameterStatus | '')} className={`${inputClass} w-full sm:w-64`}>
          <option value="">{t('legalParams.filter.todosStatus', 'Todos os status')}</option>
          <option value="DRAFT">{situacaoTexto('RASCUNHO')}</option>
          <option value="PUBLISHED">{t('legalParams.status.PUBLISHED', 'Publicada')}</option>
          <option value="REVOKED">{situacaoTexto('REVOGADA')}</option>
        </select>
        <input
          aria-label={t('legalParams.filter.busca', 'Buscar chave')}
          placeholder={t('legalParams.filter.busca', 'Buscar chave')}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={`${inputClass} w-full sm:w-64`}
        />
      </div>

      {error && <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('legalParams.loading', 'Carregando…')}</div>}

      {!loading && !error && (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className={th}>{t('legalParams.col.tabela', 'Tabela')}</th>
                  <th className={th}>{t('legalParams.col.chave', 'Chave')}</th>
                  <th className={th}>{t('legalParams.col.valor', 'Valor')}</th>
                  <th className={th}>{t('legalParams.col.vigencia', 'Vigência')}</th>
                  <th className={th}>{t('legalParams.col.situacao', 'Situação')}</th>
                  <th className={th}>{t('legalParams.col.fonte', 'Fonte')}</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {pagina.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">{t('legalParams.empty', 'Nenhuma linha.')}</td></tr>
                )}
                {pagina.map((l) => {
                  const s = situacaoDe(l, linhas);
                  return (
                    <tr key={l.id}>
                      <td className={`${td} text-xs text-neutral-400`}>{l.tabela}</td>
                      <td className={td}>
                        {l.chave}
                        {l.discriminador && <span className="ml-1 text-xs text-neutral-500">· {l.discriminador}</span>}
                      </td>
                      <td className={`${td} font-mono text-xs`}>{valorResumo(l)}</td>
                      <td className={`${td} whitespace-nowrap text-xs`}>{vigencia(l)}</td>
                      <td className={td}><span className={`rounded-lg px-2 py-0.5 text-xs ${SITUACAO_CLASSE[s]}`}>{situacaoTexto(s)}</span></td>
                      <td className={`${td} max-w-xs truncate text-xs`} title={l.fonte}>
                        {l.fonteUrl && isHttpUrl(l.fonteUrl) ? <a href={l.fonteUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{l.fonte}</a> : l.fonte}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <div className="inline-flex gap-1.5">
                          <button type="button" className={smallBtn} onClick={() => setHistorico(l)}>
                            <FiClock size={12} />
                            {t('legalParams.history', 'Histórico')}
                          </button>
                          {isPlatformAdmin && l.status === 'DRAFT' && (
                            <button type="button" className={smallBtn} onClick={() => { setAcaoError(null); setAcao({ tipo: 'publish', linha: l }); }}>
                              {t('legalParams.publish', 'Publicar')}
                            </button>
                          )}
                          {isPlatformAdmin && l.status === 'PUBLISHED' && s === 'EM_VIGOR' && (
                            <button type="button" className={smallBtn} onClick={() => abrirProposta(propostaDeNovaVersao(l))}>
                              {t('legalParams.newVersion', 'Nova versão')}
                            </button>
                          )}
                          {isPlatformAdmin && l.status === 'PUBLISHED' && (
                            <button type="button" className={smallBtn} onClick={() => { setAcaoError(null); setAcao({ tipo: 'revoke', linha: l }); }}>
                              {t('legalParams.revoke', 'Revogar')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtradas.length > POR_PAGINA && (
            <div className="mt-3">
              <StandardPagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))}
                totalItems={filtradas.length}
                itemsPerPage={POR_PAGINA}
                onPageChange={setPage}
                scrollToTop={false}
              />
            </div>
          )}
        </>
      )}

      {/* Histórico — cadeia de versões (item 5) */}
      <Modal isOpen={!!historico} onClose={() => setHistorico(null)} title={t('legalParams.historyModal.title', 'Histórico da linha')} themeColor="bg-emerald-600" maxWidth="max-w-3xl">
        {historico && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              {historico.tabela} · {historico.chave}{historico.discriminador ? ` · ${historico.discriminador}` : ''}
            </p>
            <ol className="space-y-2" data-testid="legal-params-history">
              {cadeiaDe(historico, linhas).map((v) => {
                const s = situacaoDe(v, linhas);
                return (
                  <li key={v.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono">{valorResumo(v, 200)}</span>
                      <span className={`rounded-lg px-2 py-0.5 ${SITUACAO_CLASSE[s]}`}>{situacaoTexto(s)}</span>
                    </div>
                    <div className="mt-1 text-neutral-500">{vigencia(v)} · {v.fonte}</div>
                    <div className="mt-1 text-neutral-500">{t('legalParams.historyModal.motivo', 'Motivo')}: {v.motivo}</div>
                    <div className="mt-1 text-neutral-500">
                      {v.publishedAt && `${t('legalParams.historyModal.publicada', 'Publicada')} ${v.publishedAt.slice(0, 10)} (${v.publishedById ?? '—'})`}
                      {v.revokedAt && ` · ${t('legalParams.historyModal.revogada', 'Revogada')} ${v.revokedAt.slice(0, 10)} (${v.revokedById ?? '—'})`}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </Modal>

      {/* Proposta (item 7) */}
      <Modal
        isOpen={!!proposta}
        onClose={() => { if (!busy) setProposta(null); }}
        title={proposta?.supersedesId ? t('legalParams.proposeModal.titleVersion', 'Nova versão da linha') : t('legalParams.proposeModal.title', 'Propor linha')}
        themeColor="bg-emerald-600"
        maxWidth="max-w-xl"
        footer={
          <>
            <button onClick={() => setProposta(null)} disabled={busy} className={cancelBtn}>{t('legalParams.cancel', 'Cancelar')}</button>
            <button onClick={() => void enviarProposta()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('legalParams.saving', 'Enviando…') : t('legalParams.proposeModal.submit', 'Propor (rascunho)')}
            </button>
          </>
        }
      >
        {proposta && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('legalParams.form.tabela', 'Tabela')}>
              <select value={proposta.tabela} disabled={!!proposta.supersedesId} onChange={(e) => setCampo('tabela', e.target.value as PropostaForm['tabela'])} className={inputClass}>
                {LEGAL_PARAMETER_TABELAS.map((tb) => <option key={tb} value={tb}>{tb}</option>)}
              </select>
            </Field>
            <Field label={t('legalParams.form.chave', 'Chave')}>
              <input value={proposta.chave} disabled={!!proposta.supersedesId} onChange={(e) => setCampo('chave', e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('legalParams.form.discriminador', 'Discriminador (opcional)')}>
              <input value={proposta.discriminador} disabled={!!proposta.supersedesId} onChange={(e) => setCampo('discriminador', e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('legalParams.form.tipoValor', 'Tipo do valor')}>
              <select value={proposta.tipoValor} onChange={(e) => setCampo('tipoValor', e.target.value as TipoValor)} className={inputClass}>
                <option value="int">{t('legalParams.form.tipo.int', 'Inteiro (bp ou centavos)')}</option>
                <option value="texto">{t('legalParams.form.tipo.texto', 'Texto')}</option>
                <option value="json">{t('legalParams.form.tipo.json', 'JSON')}</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('legalParams.form.valor', 'Valor')}>
                {proposta.tipoValor === 'json'
                  ? <textarea rows={5} value={proposta.valor} onChange={(e) => setCampo('valor', e.target.value)} className={`${inputClass} font-mono`} />
                  : <input value={proposta.valor} onChange={(e) => setCampo('valor', e.target.value)} className={inputClass} />}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t('legalParams.form.fonte', 'Fonte (norma e artigo)')}>
                <input value={proposta.fonte} onChange={(e) => setCampo('fonte', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label={t('legalParams.form.fonteUrl', 'URL da fonte (opcional)')}>
              <input value={proposta.fonteUrl} onChange={(e) => setCampo('fonteUrl', e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('legalParams.form.fonteSha256', 'sha256 da fonte (opcional)')}>
              <input value={proposta.fonteSha256} onChange={(e) => setCampo('fonteSha256', e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('legalParams.form.vigenteDesde', 'Vigente desde')}>
              <input type="date" value={proposta.vigenteDesde} onChange={(e) => setCampo('vigenteDesde', e.target.value)} className={inputClass} />
            </Field>
            <Field label={t('legalParams.form.vigenteAte', 'Vigente até (opcional)')}>
              <input type="date" value={proposta.vigenteAte} onChange={(e) => setCampo('vigenteAte', e.target.value)} className={inputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('legalParams.form.motivo', 'Motivo')}>
                <input value={proposta.motivo} onChange={(e) => setCampo('motivo', e.target.value)} className={inputClass} />
              </Field>
            </div>
            {propostaError && <div role="alert" className="sm:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{propostaError}</div>}
          </div>
        )}
      </Modal>

      {/* Publicar / revogar (item 8) */}
      <Modal
        isOpen={!!acao}
        onClose={() => { if (!busy) setAcao(null); }}
        title={acao?.tipo === 'publish' ? t('legalParams.publishModal.title', 'Publicar linha') : t('legalParams.revokeModal.title', 'Revogar linha')}
        themeColor={acao?.tipo === 'publish' ? 'bg-emerald-600' : 'bg-amber-600'}
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setAcao(null); }} disabled={busy} className={cancelBtn}>{t('legalParams.cancel', 'Cancelar')}</button>
            <button onClick={() => void executarAcao()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
              {busy ? t('legalParams.saving', 'Enviando…') : t('legalParams.confirm', 'Confirmar')}
            </button>
          </>
        }
      >
        {acao && (
          <div className="space-y-2 text-sm text-neutral-300">
            <p>{acao.linha.tabela} · {acao.linha.chave}{acao.linha.discriminador ? ` · ${acao.linha.discriminador}` : ''} = <span className="font-mono">{valorResumo(acao.linha)}</span> ({vigencia(acao.linha)})</p>
            <p className="text-xs text-neutral-500">
              {acao.tipo === 'publish'
                ? t('legalParams.publishModal.body', 'A linha passa a valer para todos os clientes. Apurações confirmadas no período da vigência são recalculadas automaticamente.')
                : t('legalParams.revokeModal.body', 'A linha deixa de valer (só o status muda). Apurações confirmadas no período da vigência são recalculadas automaticamente.')}
            </p>
            {acaoError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{acaoError}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
