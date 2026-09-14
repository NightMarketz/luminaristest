import { useCallback, useEffect, useState } from 'react';
import { FiArchive, FiArrowDown, FiEdit2, FiPlusCircle } from 'react-icons/fi';
import {
  LALUR_LIVROS,
  LALUR_QUARTERS,
  isParteALivro,
  lalurService,
  type LalurCatalogLinha,
  type LalurEntry,
  type LalurLivro,
  type LalurParteBAccount,
  type LalurQuarter,
  type LalurTributo,
} from '../../../lib/services/lalur.service';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import { Modal } from '../../../components/ui/Modal';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { formatCents } from '../lib/formatCents';
import { formatDate, scopeToday } from '../lib/formatDate';
import { inputClass } from './SpedGenerationPanel';
import { SPED_ECF_REAL_ANCHOR } from './SpedEcfRealPanel';
import { LalurEntryModal, LIVRO_LABEL } from './LalurEntryModal';
import { LalurParteBModal } from './LalurParteBModal';

interface LalurPanelProps {
  unitId: string;
}

type ToArchive = { kind: 'entry'; row: LalurEntry } | { kind: 'parteB'; row: LalurParteBAccount };

const isForbidden = (err: unknown) => !!err && typeof err === 'object' && (err as { status?: number }).status === 403;

/**
 * LalurPanel (FE-INCR-LALUR, PR 1 — cadastro) — seção "e-Lalur / e-Lacs" da aba Compliance, entre
 * `CompliancePanel` e `SpedGenerationPanel`. Lista + criar + editar + arquivar de contas da Parte B
 * (M010) e de ajustes da Parte A (M300/M350 + linhas E do Bloco N), sobre `/api/lalur/*` (PR #313).
 * Shape = `<table>` + `Modal` como os demais painéis CRUD da contabilidade (Fork F-FE-2 → a; o
 * `GenericTable` é o canônico do DynamicTable, não de linha Prisma). Nunca posta no razão — o
 * `SpedEcfRealPanel` (abaixo) é quem lê este cadastro e gera a ECF.
 *
 * Server-side: exercício + arquivados (o que muda o conjunto). Client-side: trimestre, livro, tributo e
 * o filtro por conta da Parte B (item 10) — assim os contadores da cabeça ("N ajustes · M contas da
 * Parte B no exercício") são do exercício inteiro, não do recorte. "No exercício" para a Parte B =
 * conta viva com dtCriacao ≤ 31/12 (o mesmo predicado do gerador, REGRA_MENOR_IGUAL_DT_FIN).
 * Um 403 em qualquer chamada esconde os botões de escrita (item 11); a leitura segue.
 */
export function LalurPanel({ unitId }: LalurPanelProps) {
  const { t, tRef } = useAccountingT();
  const currentYear = Number(scopeToday().slice(0, 4)); // fuso do escopo, nunca UTC

  // Filters — Parte A
  const [year, setYear] = useState(currentYear);
  const [quarterFilter, setQuarterFilter] = useState<LalurQuarter | ''>('');
  const [livroFilter, setLivroFilter] = useState<LalurLivro | ''>('');
  const [includeArchivedA, setIncludeArchivedA] = useState(false);
  const [parteBFilter, setParteBFilter] = useState<LalurParteBAccount | null>(null);
  // Filters — Parte B
  const [tributoFilter, setTributoFilter] = useState<LalurTributo | ''>('');
  const [includeArchivedB, setIncludeArchivedB] = useState(false);

  const [entries, setEntries] = useState<LalurEntry[]>([]);
  const [parteB, setParteB] = useState<LalurParteBAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, Map<string, LalurCatalogLinha>>>({});
  const [padrao, setPadrao] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const [entryModal, setEntryModal] = useState<{ open: boolean; editing: LalurEntry | null }>({ open: false, editing: null });
  const [parteBModal, setParteBModal] = useState<{ open: boolean; editing: LalurParteBAccount | null }>({ open: false, editing: null });
  const [toArchive, setToArchive] = useState<ToArchive | null>(null);
  const [busy, setBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const onError = useCallback((err: unknown, fallback: string) => {
    if (isForbidden(err)) setReadOnly(true);
    setError(resolveError(err, fallback));
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await lalurService.listEntries({ unitId, year, includeArchived: includeArchivedA }));
    } catch (err: unknown) {
      onError(err, tRef.current('lalur.error.loadEntries', 'Erro ao carregar os ajustes.'));
    } finally {
      setLoading(false);
    }
  }, [unitId, year, includeArchivedA, tRef, onError]);

  const fetchParteB = useCallback(async () => {
    if (!unitId) return;
    try {
      setParteB(await lalurService.listParteB({ unitId, includeArchived: includeArchivedB }));
    } catch (err: unknown) {
      onError(err, tRef.current('lalur.error.loadParteB', 'Erro ao carregar as contas da Parte B.'));
    }
  }, [unitId, includeArchivedB, tRef, onError]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);
  useEffect(() => { void fetchParteB(); }, [fetchParteB]);

  // Plano de contas (select de `accountId` — por id) e PARTEB_PADRAO (descrição do COD_PB_RFB na tabela).
  useEffect(() => {
    if (!unitId) return;
    accountingService.getAccounts(unitId).then((r) => setAccounts(r.accounts)).catch(() => setAccounts([]));
  }, [unitId]);
  useEffect(() => {
    if (!unitId) return;
    lalurService
      .getParteBPadrao(unitId)
      .then((rows) => setPadrao(new Map(rows.map((r) => [r.codigo, r.descricao]))))
      .catch(() => setPadrao(new Map()));
  }, [unitId]);

  // Catálogo por livro presente na lista (descrição + TIPO na tabela) — uma chamada por livro × exercício.
  useEffect(() => {
    const livros = Array.from(new Set(entries.map((e) => e.livro))).filter((l) => !catalogs[`${l}:${year}`]);
    if (livros.length === 0) return;
    let cancelled = false;
    Promise.all(livros.map((l) => lalurService.getCatalog(unitId, l, year).then((rows) => [l, rows] as const)))
      .then((loaded) => {
        if (cancelled) return;
        setCatalogs((prev) => {
          const next = { ...prev };
          for (const [l, rows] of loaded) next[`${l}:${year}`] = new Map(rows.map((r) => [r.codigo, r]));
          return next;
        });
      })
      .catch(() => { /* a descrição fica "—"; o erro de rede já foi notificado pelo apiClient */ });
    return () => { cancelled = true; };
  }, [entries, unitId, year, catalogs]);

  const linhaOf = (e: LalurEntry) => catalogs[`${e.livro}:${year}`]?.get(e.codigo);

  const liveEntries = entries.filter((e) => e.deletedAt === null);
  const parteBInYear = parteB.filter((a) => a.deletedAt === null && a.dtCriacao.slice(0, 10) <= `${year}-12-31`);
  const visibleEntries = entries.filter(
    (e) => (!quarterFilter || e.quarter === quarterFilter) && (!livroFilter || e.livro === livroFilter) && (!parteBFilter || e.parteBId === parteBFilter.id),
  );
  const visibleParteB = parteB.filter((a) => !tributoFilter || a.codTributo === tributoFilter);
  const parteBById = new Map(parteB.map((a) => [a.id, a]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  async function runArchive() {
    if (!toArchive) return;
    setBusy(true);
    setArchiveError(null);
    try {
      if (toArchive.kind === 'entry') {
        await lalurService.archiveEntry(toArchive.row.id, unitId);
        setToArchive(null);
        await fetchEntries();
      } else {
        await lalurService.archiveParteB(toArchive.row.id, unitId);
        setToArchive(null);
        await fetchParteB();
      }
    } catch (err: unknown) {
      if (isForbidden(err)) setReadOnly(true);
      setArchiveError(resolveError(err, t('lalur.error.archive', 'Não foi possível arquivar.')));
    } finally {
      setBusy(false);
    }
  }

  function showRelated(account: LalurParteBAccount) {
    setParteBFilter(account);
    setToArchive(null);
    document.getElementById('lalur-parte-a')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  const yearOptions = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => currentYear - i);
  const selectClass = `${inputClass} py-1.5 text-xs`;
  const th = 'px-3 py-2.5 font-medium';
  const td = 'px-3 py-2';
  const smallBtn =
    'inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700';
  const archivedBadge = (
    <span className="ml-2 inline-flex items-center rounded-full bg-neutral-700/60 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
      {t('lalur.status.archived', 'arquivada')}
    </span>
  );

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-neutral-200">{t('lalur.title', 'e-Lalur / e-Lacs')}</h2>
          <p className="text-sm text-neutral-500">
            {t('lalur.subtitle', 'Parte A (M300/M350) · Parte B (M010) — cadastro dos ajustes do lucro real que a ECF (Blocos M/N) lê.')}
          </p>
          {/* data-* mirror the numbers: the test harness has no i18next instance, so `{{vars}}` stay raw there. */}
          <p className="mt-1 text-xs text-neutral-400" data-testid="lalur-counters" data-entries={liveEntries.length} data-accounts={parteBInYear.length}>
            {t('lalur.counters', '{{entries}} ajustes · {{accounts}} contas da Parte B no exercício {{year}}', {
              entries: liveEntries.length,
              accounts: parteBInYear.length,
              year,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById(SPED_ECF_REAL_ANCHOR)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
          className={smallBtn}
        >
          {t('lalur.generateLink', 'Gerar ECF Real')} <FiArrowDown size={12} />
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* ── Parte B — contas (M010) ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-300">{t('lalur.parteB.heading', 'Parte B — contas (M010)')}</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setParteBModal({ open: true, editing: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <FiPlusCircle size={14} />
              {t('lalur.parteB.new', 'Nova conta da Parte B')}
            </button>
          )}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select aria-label={t('lalur.parteB.filter.tributo', 'Tributo')} value={tributoFilter} onChange={(e) => setTributoFilter(e.target.value as LalurTributo | '')} className={selectClass}>
            <option value="">{t('lalur.parteB.filter.allTributos', 'Todos os tributos')}</option>
            <option value="I">{t('lalur.tributo.I', 'I — IRPJ (e-Lalur)')}</option>
            <option value="C">{t('lalur.tributo.C', 'C — CSLL (e-Lacs)')}</option>
          </select>
          <label className="ml-2 inline-flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={includeArchivedB} onChange={(e) => setIncludeArchivedB(e.target.checked)} className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-800" />
            {t('lalur.filter.includeArchived', 'Mostrar arquivados')}
          </label>
        </div>

        {visibleParteB.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">{t('lalur.parteB.empty', 'Nenhuma conta da Parte B cadastrada.')}</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-400">
                  <th className={th}>{t('lalur.parteB.col.codCtaB', 'Código')}</th>
                  <th className={th}>{t('lalur.parteB.col.descricao', 'Descrição')}</th>
                  <th className={th}>{t('lalur.parteB.col.tributo', 'Tributo')}</th>
                  <th className={th}>{t('lalur.parteB.col.codPbRfb', 'Padrão RFB')}</th>
                  <th className={th}>{t('lalur.parteB.col.dtCriacao', 'Criação')}</th>
                  <th className={th}>{t('lalur.parteB.col.dtLimite', 'Limite')}</th>
                  <th className={`${th} text-right`}>{t('lalur.parteB.col.saldoIni', 'Saldo inicial')}</th>
                  <th className={th}>{t('lalur.col.actions', 'Ações')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleParteB.map((a) => {
                  const archived = a.deletedAt !== null;
                  return (
                    <tr key={a.id} className={`border-b border-neutral-800/60 last:border-0 ${archived ? 'opacity-50' : ''}`}>
                      <td className={`${td} font-mono text-xs text-neutral-100`}>{a.codCtaB}{archived && archivedBadge}</td>
                      <td className={`${td} text-neutral-200`}>{a.descricao}</td>
                      <td className={td}>{a.codTributo}</td>
                      <td className={`${td} text-neutral-400`}>
                        <span className="font-mono text-xs">{a.codPbRfb}</span>
                        {padrao.get(a.codPbRfb) && <span className="ml-1.5 text-xs">{padrao.get(a.codPbRfb)}</span>}
                      </td>
                      <td className={td}>{formatDate(a.dtCriacao)}</td>
                      <td className={td}>{a.dtLimite ? formatDate(a.dtLimite) : <span className="text-neutral-600">—</span>}</td>
                      <td className={`${td} text-right font-mono text-xs`}>{formatCents(a.saldoIniCents)} {a.indSaldoIni}</td>
                      <td className={td}>
                        {!archived && !readOnly && (
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setParteBModal({ open: true, editing: a })} className={smallBtn}>
                              <FiEdit2 size={11} /> {t('lalur.action.edit', 'Editar')}
                            </button>
                            <button type="button" onClick={() => { setArchiveError(null); setToArchive({ kind: 'parteB', row: a }); }} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}>
                              <FiArchive size={11} /> {t('lalur.action.archive', 'Arquivar')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Parte A — ajustes (M300/M350 + linhas E do Bloco N) ─────────────── */}
      <div id="lalur-parte-a">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-300">{t('lalur.entry.heading', 'Parte A — ajustes (M300/M350) e linhas E do Bloco N')}</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setEntryModal({ open: true, editing: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <FiPlusCircle size={14} />
              {t('lalur.entry.new', 'Novo ajuste')}
            </button>
          )}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select aria-label={t('lalur.field.year', 'Exercício')} value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select aria-label={t('lalur.field.quarter', 'Trimestre')} value={quarterFilter} onChange={(e) => setQuarterFilter(e.target.value as LalurQuarter | '')} className={selectClass}>
            <option value="">{t('lalur.entry.filter.allQuarters', 'Todos os trimestres')}</option>
            {LALUR_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <select aria-label={t('lalur.field.livro', 'Livro')} value={livroFilter} onChange={(e) => setLivroFilter(e.target.value as LalurLivro | '')} className={selectClass}>
            <option value="">{t('lalur.entry.filter.allLivros', 'Todos os livros')}</option>
            {LALUR_LIVROS.map((l) => <option key={l} value={l}>{LIVRO_LABEL[l]}</option>)}
          </select>
          <label className="ml-2 inline-flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={includeArchivedA} onChange={(e) => setIncludeArchivedA(e.target.checked)} className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-800" />
            {t('lalur.filter.includeArchived', 'Mostrar arquivados')}
          </label>
          {parteBFilter && (
            <button type="button" onClick={() => setParteBFilter(null)} className={`${smallBtn} border-emerald-800 text-emerald-300`}>
              {t('lalur.entry.filter.parteB', 'Parte B: {{code}} ×', { code: parteBFilter.codCtaB })}
            </button>
          )}
        </div>

        {loading && <div className="py-8 text-center text-sm text-neutral-400">{t('lalur.loading', 'Carregando…')}</div>}
        {!loading && visibleEntries.length === 0 && (
          <div className="py-8 text-center text-sm text-neutral-500">{t('lalur.entry.empty', 'Nenhum ajuste registrado neste exercício.')}</div>
        )}
        {!loading && visibleEntries.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-400">
                  <th className={th}>{t('lalur.entry.col.quarter', 'Trim.')}</th>
                  <th className={th}>{t('lalur.entry.col.livro', 'Livro')}</th>
                  <th className={th}>{t('lalur.entry.col.codigo', 'Código · descrição')}</th>
                  <th className={th}>{t('lalur.entry.col.tipo', 'Tipo')}</th>
                  <th className={th}>{t('lalur.entry.col.indRelacao', 'Rel.')}</th>
                  <th className={th}>{t('lalur.entry.col.related', 'Parte B / conta')}</th>
                  <th className={`${th} text-right`}>{t('lalur.entry.col.valor', 'Valor')}</th>
                  <th className={th}>{t('lalur.entry.col.hist', 'Histórico')}</th>
                  <th className={th}>{t('lalur.col.actions', 'Ações')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((e) => {
                  const archived = e.deletedAt !== null;
                  const linha = linhaOf(e);
                  const b = e.parteBId ? parteBById.get(e.parteBId) : undefined;
                  const acc = e.accountId ? accountById.get(e.accountId) : undefined;
                  return (
                    <tr key={e.id} className={`border-b border-neutral-800/60 last:border-0 ${archived ? 'opacity-50' : ''}`}>
                      <td className={td}>{e.quarter}</td>
                      <td className={`${td} text-xs`}>{LIVRO_LABEL[e.livro]}</td>
                      <td className={td}>
                        <span className="font-mono text-xs text-neutral-100">{e.codigo}</span>
                        {linha && <span className="ml-1.5 text-xs text-neutral-300">{linha.descricao}</span>}
                        {archived && archivedBadge}
                      </td>
                      <td className={td}>{isParteALivro(e.livro) && linha?.tipoLanc ? linha.tipoLanc : <span className="text-neutral-600">—</span>}</td>
                      <td className={td} title={e.indRelacao ? t(`lalur.indRelacao.${e.indRelacao}`) : undefined}>{e.indRelacao ?? <span className="text-neutral-600">—</span>}</td>
                      <td className={`${td} text-xs text-neutral-400`}>
                        {b && <span className="font-mono">{b.codCtaB}</span>}
                        {b && acc && ' · '}
                        {acc && <span>{acc.code} — {acc.name}</span>}
                        {!b && !acc && <span className="text-neutral-600">—</span>}
                      </td>
                      <td className={`${td} text-right font-mono text-xs`}>{formatCents(e.valorCents)}</td>
                      <td className={`${td} max-w-[16rem] truncate text-xs text-neutral-400`} title={e.histLancamento ?? undefined}>{e.histLancamento ?? ''}</td>
                      <td className={td}>
                        {!archived && !readOnly && (
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setEntryModal({ open: true, editing: e })} className={smallBtn}>
                              <FiEdit2 size={11} /> {t('lalur.action.edit', 'Editar')}
                            </button>
                            <button type="button" onClick={() => { setArchiveError(null); setToArchive({ kind: 'entry', row: e }); }} className={`${smallBtn} hover:border-amber-700 hover:text-amber-300`}>
                              <FiArchive size={11} /> {t('lalur.action.archive', 'Arquivar')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LalurParteBModal
        isOpen={parteBModal.open}
        onClose={() => setParteBModal({ open: false, editing: null })}
        unitId={unitId}
        year={year}
        editing={parteBModal.editing}
        onSuccess={() => void fetchParteB()}
        onForbidden={() => setReadOnly(true)}
      />
      <LalurEntryModal
        isOpen={entryModal.open}
        onClose={() => setEntryModal({ open: false, editing: null })}
        unitId={unitId}
        year={year}
        quarter={quarterFilter}
        parteBAccounts={parteB}
        accounts={accounts}
        editing={entryModal.editing}
        onSuccess={() => void fetchEntries()}
        onForbidden={() => setReadOnly(true)}
      />

      {/* Archive confirmation (both aggregates) */}
      <Modal
        isOpen={!!toArchive}
        onClose={() => { if (!busy) setToArchive(null); }}
        title={toArchive?.kind === 'parteB' ? t('lalur.archiveModal.titleParteB', 'Arquivar conta da Parte B') : t('lalur.archiveModal.titleEntry', 'Arquivar ajuste')}
        themeColor="bg-amber-600"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => { if (!busy) setToArchive(null); }} disabled={busy} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50">
              {t('lalur.archiveModal.cancel', 'Voltar')}
            </button>
            <button onClick={() => void runArchive()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50">
              {busy ? t('lalur.archiveModal.archiving', 'Arquivando…') : t('lalur.archiveModal.confirm', 'Confirmar arquivamento')}
            </button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-5 text-sm text-neutral-300">
          {toArchive?.kind === 'parteB' && (
            <p><span className="font-mono font-semibold text-neutral-100">{toArchive.row.codCtaB}</span> — {toArchive.row.descricao} ({toArchive.row.codTributo})</p>
          )}
          {toArchive?.kind === 'entry' && (
            <p><span className="font-mono font-semibold text-neutral-100">{toArchive.row.codigo}</span> — {LIVRO_LABEL[toArchive.row.livro]} · {toArchive.row.quarter}/{toArchive.row.year} · {formatCents(toArchive.row.valorCents)}</p>
          )}
          <p className="text-neutral-400">{t('lalur.archiveModal.note', 'O registro sai da ECF e o código fica livre para novo cadastro. Nada é apagado.')}</p>
          {archiveError && (
            <div role="alert" className="space-y-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
              <p>{archiveError}</p>
              {toArchive?.kind === 'parteB' && (
                <button type="button" onClick={() => showRelated(toArchive.row)} className="underline">
                  {t('lalur.archiveModal.showRelated', 'Ver os ajustes relacionados a esta conta')}
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
