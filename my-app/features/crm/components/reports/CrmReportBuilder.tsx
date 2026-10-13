import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../../components/ui/Modal';
import { useAuth } from '../../../../lib/context/AuthContext';
import { CrmReportsService, type CrmReportRow } from '../../../../lib/services/crmReports.service';
import type { ISchemaField } from '../../../dashboard/components/shared/dynamic-tables.client';
import { useReportSources } from '../../hooks/useReportSources';
import {
  blockReason,
  browserTimeZone,
  buildPatch,
  combinedFields,
  currencyIndexes,
  emptyDraft,
  fieldLabel,
  fromReport,
  itemsLost,
  prunedForFields,
  removeJoin,
  reportError,
  reportFields,
  sourceChangeLosesItems,
  toCreateInput,
  toSpec,
  withJoinSource,
  type JoinDraft,
  type ReportDraft,
  type ReportErrorView,
  type ReportSource,
  type RightFieldsOf,
} from '../../lib/reportBuilder';
import { CrmReportEditor, measureText } from './CrmReportEditor';
import { CrmReportList } from './CrmReportList';
import { CrmReportResult, type ReportRunSnapshot } from './CrmReportResult';

/**
 * Tela do builder de relatórios do CRM (FE-INCR-CRM-REPORT-BUILDER PR-A, itens 2–9, 11–18). Lista ⇄ editor; a
 * visualização é por botão (F-FRB2=(a)) com o `timeZone` do navegador (F-RB11); erros nomeados do BE viram texto
 * traduzido (item 16). O BE é a verdade de toda regra — o editor só evita o 400. PR-B (item 10): o schema de cada
 * tabela da direita é carregado aqui; trocar/remover join que tira itens pede confirmação (como a troca de fonte).
 */
type Mode = 'list' | 'editor';
type RightRaw = Partial<Record<ReportSource, ISchemaField[] | null>>;
type CrmRunOutput = ReportRunSnapshot['output'];

const btn = 'rounded-xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40';
const primaryBtn = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const secondaryBtn = `${btn} border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800`;
const dangerBtn = `${btn} border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40`;

export function CrmReportBuilder() {
  const { t } = useTranslation('crm');
  const { user } = useAuth();
  const { sources, fieldsOf } = useReportSources();
  const labels = useMemo(
    () => ({
      id: t('report_builder.fields.id', 'ID'),
      createdAt: t('report_builder.fields.created_at', 'Criado em'),
      updatedAt: t('report_builder.fields.updated_at', 'Atualizado em'),
    }),
    [t],
  );

  const [mode, setMode] = useState<Mode>('list');
  const [reports, setReports] = useState<CrmReportRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [notice, setNotice] = useState<ReportErrorView | null>(null);

  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [saved, setSaved] = useState<CrmReportRow | null>(null);
  const [schemaFields, setSchemaFields] = useState<ISchemaField[] | null>(null);
  const [result, setResult] = useState<ReportRunSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ReportErrorView | null>(null);

  const [rightRaw, setRightRaw] = useState<RightRaw>({});
  const [busyJoins, setBusyJoins] = useState<JoinDraft[]>([]);
  // fila de confirmações: duas trocas que chegam juntas não se sobrescrevem (6ª passada do review do PR-B)
  const [pendingQueue, setPendingQueue] = useState<{ kind: 'source' | 'join'; apply: () => void }[]>([]);
  const pending = pendingQueue[0] ?? null;
  const setPending = (p: { kind: 'source' | 'join'; apply: () => void }) => setPendingQueue((q) => [...q, p]);
  const closePending = () => setPendingQueue((q) => q.slice(1));
  const [toDelete, setToDelete] = useState<CrmReportRow | null>(null);
  const [saveAsName, setSaveAsName] = useState<string | null>(null);

  const rightFieldsFrom = useCallback(
    (map: RightRaw): RightFieldsOf =>
      (s) => {
        const raw = map[s];
        return raw ? reportFields(raw, labels) : null;
      },
    [labels],
  );
  const rightFieldsOf = useMemo(() => rightFieldsFrom(rightRaw), [rightFieldsFrom, rightRaw]);
  const sourceFields = useMemo(() => (schemaFields ? reportFields(schemaFields, labels) : null), [schemaFields, labels]);
  const fields = useMemo(
    () => (sourceFields ? combinedFields(sourceFields, draft.joins, rightFieldsOf) : null),
    [sourceFields, draft.joins, rightFieldsOf],
  );
  // o schema da tabela do join chega depois de um await: a mudança se aplica ao rascunho ATUAL, não ao do clique
  // (review do PR-B, achado 1)
  const latest = useRef({ draft, rightRaw, sourceFields });
  latest.current = { draft, rightRaw, sourceFields };
  const reason = fields ? blockReason(draft, fields) : 'NO_SOURCE';
  const patch = saved ? buildPatch(saved, draft) : null;
  const canSave = !saving && reason === null && draft.name.trim() !== '' && (saved ? patch !== null : true);
  const otherUser = Boolean(saved && user?.id && saved.userId !== user.id);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await CrmReportsService.list();
      setReports(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setNotice(reportError(e));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const snapshotOf = useCallback(
    (output: CrmRunOutput, d: ReportDraft, flds: ISchemaField[]): ReportRunSnapshot => ({
      output,
      kind: d.kind,
      chartType: d.chartType,
      dimensions: d.dimensions,
      moneyIndexes: currencyIndexes(d, flds, output.meta.currency),
      measureLabels: d.measures.map((m) => measureText(m, flds, t)),
      groupLabel:
        d.dimensions
          .map((dim) => {
            const name = dim.type === 'field' ? dim.field : dim.dateField;
            const f = flds.find((x) => x.name === name);
            return f ? fieldLabel(f) : name;
          })
          .join(' | ') || t('report_builder.result.total', 'Total'),
    }),
    [t],
  );

  /** 404 do relatório (apagado/alheio) → mensagem e volta à lista (item 18). */
  const backToListWith = useCallback(
    (v: ReportErrorView) => {
      setNotice(v);
      setMode('list');
      setSaved(null);
      setResult(null);
      void loadList();
    },
    [loadList],
  );

  const startNew = () => {
    setDraft(emptyDraft());
    setSaved(null);
    setSchemaFields(null);
    setRightRaw({});
    setResult(null);
    setError(null);
    setNotice(null);
    setMode('editor');
  };

  const openReport = async (id: string) => {
    setNotice(null);
    setError(null);
    try {
      const res = await CrmReportsService.get(id);
      const row = res.data;
      const raw = await fieldsOf(row.spec.source);
      const d = fromReport(row);
      const rr: RightRaw = {};
      for (const j of d.joins) if (j.rightSource && !(j.rightSource in rr)) rr[j.rightSource] = await fieldsOf(j.rightSource);
      setSaved(row);
      setDraft(d);
      setSchemaFields(raw);
      setRightRaw(rr);
      setResult(null);
      setMode('editor');
      // schema indisponível (ou fonte desinstalada — aí o run diz o porquê, 409 CRM_MODULE_NOT_INSTALLED)
      if (!raw || Object.values(rr).some((x) => !x)) setError({ key: 'report_builder.errors.SCHEMA_UNAVAILABLE', params: {}, code: null });
      setRunning(true);
      try {
        const run = await CrmReportsService.run(row.id, { timeZone: browserTimeZone() });
        setResult(snapshotOf(run.data, d, combinedFields(reportFields(raw ?? [], labels), d.joins, rightFieldsFrom(rr))));
      } catch (e) {
        const v = reportError(e);
        if (v.code === 'REPORT_NOT_FOUND') backToListWith(v);
        else setError(v);
      } finally {
        setRunning(false);
      }
    } catch (e) {
      const v = reportError(e);
      if (v.code === 'REPORT_NOT_FOUND') backToListWith(v);
      else setNotice(v);
    }
  };

  const applySource = (source: ReportSource, raw: ISchemaField[] | null) => {
    setSchemaFields(raw);
    setDraft((d) => prunedForFields({ ...d, source }, reportFields(raw ?? [], labels), rightFieldsOf));
    setResult(null);
    if (!raw) setError({ key: 'report_builder.errors.SCHEMA_UNAVAILABLE', params: {}, code: null });
    else setError(null);
  };

  const changeSource = async (source: ReportSource) => {
    if (source === draft.source && schemaFields) return;
    const raw = await fieldsOf(source);
    if (draft.source && sourceChangeLosesItems(draft, reportFields(raw ?? [], labels), rightFieldsOf)) {
      setPending({ kind: 'source', apply: () => applySource(source, raw) });
      return;
    }
    applySource(source, raw);
  };

  /** Item 10: aplica a mudança de join; se ela tira medida/agrupamento/filtro, confirma antes (PR-B/D lacunas). */
  type JoinChange = (now: typeof latest.current) => { next: ReportDraft; nextRaw: RightRaw } | null;
  // a mudança é recalculada sobre o rascunho ATUAL também na confirmação do Modal — outra troca aplicada enquanto ele
  // estava aberto não é desfeita (5ª passada do review do PR-B)
  const applyJoinChange = (build: JoinChange) => {
    const first = build(latest.current);
    if (!first) return;
    const commit = (r: { next: ReportDraft; nextRaw: RightRaw }) => {
      setRightRaw(r.nextRaw);
      setDraft(r.next);
    };
    if (!itemsLost(latest.current.draft, first.next)) return commit(first);
    setPending({
      kind: 'join',
      apply: () => {
        const r = build(latest.current);
        if (r) commit(r);
      },
    });
  };

  const changeJoinSource = async (clicked: number, source: ReportSource) => {
    // o join é seguido pela identidade, não pelo índice: removido ou mexido na espera, a troca não cai em outro join
    // (2ª passada do review do PR-B)
    const target = latest.current.draft.joins[clicked];
    let raw = latest.current.rightRaw[source];
    if (!raw) {
      if (target) setBusyJoins((b) => [...b, target]);
      try {
        raw = await fieldsOf(source);
      } finally {
        if (target) setBusyJoins((b) => b.filter((x) => x !== target));
      }
    }
    if (!raw) {
      setError({ key: 'report_builder.errors.SCHEMA_UNAVAILABLE', params: {}, code: null });
      return;
    }
    const loaded = raw;
    applyJoinChange((now) => {
      const index = target ? now.draft.joins.indexOf(target) : -1;
      if (!now.sourceFields || index < 0) return null;
      const nextRaw = { ...now.rightRaw, [source]: loaded };
      return { next: withJoinSource(now.draft, index, source, now.sourceFields, rightFieldsFrom(nextRaw)), nextRaw };
    });
  };

  const removeJoinAt = (clicked: number) => {
    const target = draft.joins[clicked];
    applyJoinChange((now) => {
      const index = target ? now.draft.joins.indexOf(target) : -1;
      if (!now.sourceFields || index < 0) return null;
      return { next: removeJoin(now.draft, index, now.sourceFields, rightFieldsFrom(now.rightRaw)), nextRaw: now.rightRaw };
    });
  };

  const preview = async () => {
    const spec = toSpec(draft);
    if (!spec || !fields) return;
    setRunning(true);
    setError(null);
    try {
      const res = await CrmReportsService.preview({ spec, timeZone: browserTimeZone() });
      setResult(snapshotOf(res.data, draft, fields));
    } catch (e) {
      setError(reportError(e));
    } finally {
      setRunning(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (saved) {
        if (!patch) return;
        const res = await CrmReportsService.update(saved.id, patch);
        setSaved(res.data);
      } else {
        const body = toCreateInput(draft);
        if (!body) return;
        const res = await CrmReportsService.create(body);
        setSaved(res.data);
      }
      void loadList();
    } catch (e) {
      const v = reportError(e);
      if (v.code === 'REPORT_NOT_FOUND') backToListWith(v);
      else setError(v);
    } finally {
      setSaving(false);
    }
  };

  const saveAs = async (name: string) => {
    const body = toCreateInput(draft, name);
    if (!body) return;
    setSaving(true);
    setError(null);
    try {
      const res = await CrmReportsService.create(body);
      setSaved(res.data);
      setDraft((d) => ({ ...d, name: body.name }));
      setSaveAsName(null);
      void loadList();
    } catch (e) {
      setError(reportError(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    try {
      await CrmReportsService.remove(target.id);
      setToDelete(null);
      if (saved?.id === target.id) {
        setSaved(null);
        setResult(null);
        setMode('list');
      }
      void loadList();
    } catch (e) {
      setToDelete(null);
      const v = reportError(e);
      if (v.code === 'REPORT_NOT_FOUND') backToListWith(v);
      else setError(v);
    }
  };

  const errorBox = (v: ReportErrorView | null) =>
    v ? (
      <div
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {t(v.key, { defaultValue: t('report_builder.errors.GENERIC', 'Não foi possível concluir. Tente de novo.'), ...v.params })}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      {mode === 'list' ? (
        <>
          <div className="flex items-center justify-end">
            <button type="button" className={primaryBtn} onClick={startNew}>
              {t('report_builder.list.new', 'Novo relatório')}
            </button>
          </div>
          {errorBox(notice)}
          {listLoading ? (
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('common.loading', 'Carregando…')}</p>
          ) : (
            <CrmReportList
              reports={reports}
              currentUserId={user?.id ?? null}
              onOpen={(id) => void openReport(id)}
              onDelete={setToDelete}
              onNew={startNew}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setMode('list');
                setError(null);
                void loadList();
              }}
            >
              {t('report_builder.editor.back', 'Voltar à lista')}
            </button>
            <div className="flex-1" />
            <button type="button" className={secondaryBtn} disabled={reason !== null || running} onClick={() => void preview()}>
              {running ? t('report_builder.editor.running', 'Calculando…') : t('report_builder.editor.preview', 'Visualizar')}
            </button>
            <button type="button" className={primaryBtn} disabled={!canSave} onClick={() => void save()}>
              {t('report_builder.editor.save', 'Salvar')}
            </button>
            {saved ? (
              <>
                <button
                  type="button"
                  className={secondaryBtn}
                  disabled={reason !== null || saving}
                  onClick={() => setSaveAsName(draft.name)}
                >
                  {t('report_builder.editor.save_as', 'Salvar como')}
                </button>
                <button type="button" className={dangerBtn} onClick={() => setToDelete(saved)}>
                  {t('report_builder.list.delete', 'Apagar')}
                </button>
              </>
            ) : null}
          </div>
          {otherUser ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {t('report_builder.editor.other_user', 'Este relatório é de outro usuário. As mudanças valem para ele.')}
            </p>
          ) : null}
          {reason !== null ? (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400" data-testid="block-reason">
              {t(`report_builder.block.${reason}`, reason)}
            </p>
          ) : null}
          {errorBox(error)}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CrmReportEditor
              draft={draft}
              fields={fields}
              sources={sources}
              rightFieldsOf={rightFieldsOf}
              onChange={setDraft}
              onSourceChange={(s) => void changeSource(s)}
              onJoinSourceChange={(i, s) => void changeJoinSource(i, s)}
              onJoinRemove={removeJoinAt}
              busyJoins={busyJoins}
            />
            <div className="flex flex-col gap-4">
              {result ? (
                <CrmReportResult snapshot={result} />
              ) : (
                <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm font-semibold text-gray-400 dark:border-neutral-700 dark:text-gray-500">
                  {t('report_builder.result.hint', 'Monte o relatório e clique em Visualizar.')}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={pending !== null}
        onClose={closePending}
        title={
          pending?.kind === 'join'
            ? t('report_builder.confirm.join_title', 'Mudar o cruzamento?')
            : t('report_builder.confirm.source_title', 'Trocar a fonte?')
        }
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={closePending}>
              {t('report_builder.confirm.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              className={primaryBtn}
              onClick={() => {
                pending?.apply();
                closePending();
              }}
            >
              {pending?.kind === 'join'
                ? t('report_builder.confirm.join_ok', 'Mudar e limpar')
                : t('report_builder.confirm.source_ok', 'Trocar e limpar')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {pending?.kind === 'join'
            ? t(
                'report_builder.confirm.join_body',
                'Medidas, agrupamentos e filtros que usam campos deste cruzamento e deixam de existir serão removidos.',
              )
            : t('report_builder.confirm.source_body', 'Medidas, agrupamentos e filtros com campos que não existem na nova fonte serão removidos.')}
        </p>
      </Modal>

      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={t('report_builder.confirm.delete_title', 'Apagar relatório?')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setToDelete(null)}>
              {t('report_builder.confirm.cancel', 'Cancelar')}
            </button>
            <button type="button" className={dangerBtn} onClick={() => void confirmDelete()}>
              {t('report_builder.confirm.delete_ok', 'Apagar')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t('report_builder.confirm.delete_body', {
            defaultValue: 'O relatório "{{name}}" será apagado.',
            name: toDelete?.name ?? '',
          })}
        </p>
      </Modal>

      <Modal
        isOpen={saveAsName !== null}
        onClose={() => setSaveAsName(null)}
        title={t('report_builder.editor.save_as', 'Salvar como')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setSaveAsName(null)}>
              {t('report_builder.confirm.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              className={primaryBtn}
              disabled={!saveAsName?.trim() || saving}
              onClick={() => saveAsName && void saveAs(saveAsName)}
            >
              {t('report_builder.editor.save', 'Salvar')}
            </button>
          </div>
        }
      >
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
          {t('report_builder.editor.name', 'Nome')}
          <input
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            value={saveAsName ?? ''}
            maxLength={80}
            onChange={(e) => setSaveAsName(e.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
