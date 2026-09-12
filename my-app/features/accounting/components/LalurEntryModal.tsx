import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../components/ui/Modal';
import {
  LALUR_IND_RELACAO,
  LALUR_LIVROS,
  LALUR_QUARTERS,
  LIVRO_TRIBUTO,
  isParteALivro,
  lalurService,
  type CreateLalurEntryInput,
  type LalurCatalogLinha,
  type LalurEntry,
  type LalurIndRelacao,
  type LalurLivro,
  type LalurParteBAccount,
  type LalurQuarter,
  type UpdateLalurEntryInput,
} from '../../../lib/services/lalur.service';
import type { Account } from '../../../lib/services/accounting.service';
import { resolveError } from '../lib/resolveError';
import { parseBrl } from '../lib/parseBrl';
import { Field, inputClass } from './SpedGenerationPanel';
import { CatalogCombobox, FieldBlock } from './CatalogCombobox';

export interface LalurEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Pré-preenchidos do filtro do painel (item 7). `quarter` vazio = o operador escolhe. */
  year: number;
  quarter: LalurQuarter | '';
  /** Contas da Parte B VIVAS do escopo — o modal filtra pelo tributo do livro (lalur→I, lacs→C). */
  parteBAccounts: LalurParteBAccount[];
  /** Plano de contas (`getAccounts`) — o valor enviado é o **id**, nunca o código. */
  accounts: Account[];
  /** When set, edits this line: year/quarter/livro/codigo read-only ("arquive e recrie"). */
  editing?: LalurEntry | null;
  onSuccess: () => void;
  /** A 403 on save (`canManageLalur`) — the panel hides its write buttons (item 11). */
  onForbidden?: () => void;
}

/** Labels of the five livros (M300 / M350 / linhas E do Bloco N). */
export const LIVRO_LABEL: Record<LalurLivro, string> = {
  lalur: 'e-Lalur (M300 · IRPJ)',
  lacs: 'e-Lacs (M350 · CSLL)',
  n500: 'N500',
  n630: 'N630',
  n670: 'N670',
};

/**
 * LalurEntryModal (FE-INCR-LALUR itens 7–9) — cria/edita um ajuste da Parte A (M300/M350) ou uma
 * linha E do Bloco N. O código vem do catálogo do livro no exercício (Fork F-FE-3 → a; só linhas E
 * vigentes — o mesmo predicado do servidor). `indRelacao` é CONDICIONAL (REGRA_RELACAO_INEXISTENTE
 * p.247 + D-M3): 1 ⇒ Parte B (tributo do livro), 2 ⇒ conta contábil (id), 3 ⇒ ambas, 4 ⇒ nenhuma e
 * histórico obrigatório; livro N não renderiza nenhum dos quatro campos (o `.strict()` do servidor
 * rejeita a chave presente). TIPO_LANCAMENTO = P trava `indRelacao` em 1 (REGRA_IND_RELACAO p.247).
 * O corpo enviado nunca carrega chave indevida; na edição `null` explícito limpa Parte B/conta/histórico.
 */
export function LalurEntryModal({
  isOpen,
  onClose,
  unitId,
  year: yearProp,
  quarter: quarterProp,
  parteBAccounts,
  accounts,
  editing,
  onSuccess,
  onForbidden,
}: LalurEntryModalProps) {
  const { t } = useTranslation('accounting');
  const isEdit = !!editing;

  // Exercício: pré-preenchido do filtro do painel (item 7) e travado — o painel é quem escolhe o ano.
  const [year, setYear] = useState(yearProp);
  const [quarter, setQuarter] = useState<LalurQuarter | ''>(quarterProp);
  const [livro, setLivro] = useState<LalurLivro>('lalur');
  const [codigo, setCodigo] = useState('');
  const [valor, setValor] = useState('');
  const [indRelacao, setIndRelacao] = useState<LalurIndRelacao | ''>('');
  const [parteBId, setParteBId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [hist, setHist] = useState('');
  const [catalog, setCatalog] = useState<LalurCatalogLinha[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load/reset when opened.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setYear(editing.year);
      setQuarter(editing.quarter);
      setLivro(editing.livro);
      setCodigo(editing.codigo);
      setValor((editing.valorCents / 100).toFixed(2).replace('.', ','));
      setIndRelacao(editing.indRelacao ?? '');
      setParteBId(editing.parteBId ?? '');
      setAccountId(editing.accountId ?? '');
      setHist(editing.histLancamento ?? '');
    } else {
      setYear(yearProp);
      setQuarter(quarterProp);
      setLivro('lalur');
      setCodigo('');
      setValor('');
      setIndRelacao('');
      setParteBId('');
      setAccountId('');
      setHist('');
    }
  }, [isOpen, editing, yearProp, quarterProp]);

  // Catalog of the livro for the exercício — linhas E vigentes (item 7).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setCatalogLoading(true);
    lalurService
      .getCatalog(unitId, livro, year)
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(resolveError(err, t('lalur.error.catalog', 'Erro ao carregar o catálogo do Leiaute 12.')));
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` identity is unstable without an i18n instance (see useAccountingT)
  }, [isOpen, unitId, livro, year]);

  const parteA = isParteALivro(livro);
  const linha = catalog.find((r) => r.codigo === codigo);
  // REGRA_IND_RELACAO (p.247): compensação de prejuízo (P) relaciona-se só com a Parte B.
  const lockedToParteB = parteA && linha?.tipoLanc === 'P';
  const effectiveInd: LalurIndRelacao | '' = lockedToParteB ? '1' : indRelacao;
  const needsB = parteA && (effectiveInd === '1' || effectiveInd === '3');
  const needsCta = parteA && (effectiveInd === '2' || effectiveInd === '3');
  const histRequired = parteA && effectiveInd === '4';

  const tributo = parteA ? LIVRO_TRIBUTO[livro] : undefined;
  const parteBOptions = parteBAccounts.filter((a) => a.deletedAt === null && a.codTributo === tributo);
  const accountOptions = accounts.filter((a) => !a.deletedAt);

  const isValid =
    quarter !== '' && codigo !== '' && valor.trim() !== '' &&
    (!parteA || (effectiveInd !== '' && (!needsB || parteBId !== '') && (!needsCta || accountId !== '') && (!histRequired || hist.trim() !== '')));
  const isDirty = codigo !== '' || valor !== '' || hist !== '';

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!isValid) {
      setError(t('lalur.entry.modal.error.invalid', 'Preencha trimestre, código, valor e os campos exigidos pelo relacionamento.'));
      return;
    }
    const valorCents = parseBrl(valor);
    setIsSubmitting(true);
    try {
      if (editing) {
        const body: UpdateLalurEntryInput = {
          unitId,
          valorCents,
          ...(parteA
            ? {
                indRelacao: effectiveInd as LalurIndRelacao,
                parteBId: needsB ? parteBId : null,
                accountId: needsCta ? accountId : null,
                histLancamento: hist.trim() || null,
              }
            : {}),
        };
        await lalurService.updateEntry(editing.id, body);
      } else {
        const body: CreateLalurEntryInput = {
          unitId,
          year,
          quarter: quarter as LalurQuarter,
          livro,
          codigo,
          valorCents,
          ...(parteA
            ? {
                indRelacao: effectiveInd as LalurIndRelacao,
                ...(needsB ? { parteBId } : {}),
                ...(needsCta ? { accountId } : {}),
                ...(hist.trim() ? { histLancamento: hist.trim() } : {}),
              }
            : {}),
        };
        await lalurService.createEntry(body);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if ((err as { status?: number } | null)?.status === 403) onForbidden?.();
      setError(resolveError(err, t('lalur.entry.modal.error.failed', 'Erro ao salvar o ajuste.')));
    } finally {
      setIsSubmitting(false);
    }
  }

  const lockedBox = (text: string) => (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-300">{text}</div>
  );

  const IND_LABEL: Record<LalurIndRelacao, string> = {
    '1': t('lalur.indRelacao.1', '1 — conta da Parte B'),
    '2': t('lalur.indRelacao.2', '2 — conta contábil'),
    '3': t('lalur.indRelacao.3', '3 — Parte B e conta contábil'),
    '4': t('lalur.indRelacao.4', '4 — sem relacionamento (histórico obrigatório)'),
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? t('lalur.entry.modal.titleEdit', 'Editar ajuste') : t('lalur.entry.modal.title', 'Novo ajuste (Parte A / Bloco N)')}
      maxWidth="max-w-2xl"
      isDirty={!isEdit && isDirty}
      themeColor="bg-emerald-600"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-50"
          >
            {t('lalur.modal.cancel', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!isValid || isSubmitting}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t('lalur.modal.saving', 'Salvando…') : t('lalur.modal.submit', 'Salvar')}
          </button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        {isEdit && (
          <p className="text-xs text-neutral-500">
            {t('lalur.entry.modal.immutableNote', 'Exercício, trimestre, livro e código não mudam — arquive e recrie.')}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldBlock label={t('lalur.field.year', 'Exercício')}>{lockedBox(String(year))}</FieldBlock>
          <FieldBlock label={t('lalur.field.quarter', 'Trimestre')}>
            {isEdit ? lockedBox(quarter) : (
              <select aria-label={t('lalur.field.quarter', 'Trimestre')} value={quarter} onChange={(e) => setQuarter(e.target.value as LalurQuarter | '')} className={inputClass}>
                <option value="">{t('lalur.field.quarterPick', 'Selecione…')}</option>
                {LALUR_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            )}
          </FieldBlock>
          <FieldBlock label={t('lalur.field.livro', 'Livro')}>
            {isEdit ? lockedBox(LIVRO_LABEL[livro]) : (
              <select
                aria-label={t('lalur.field.livro', 'Livro')}
                value={livro}
                onChange={(e) => { setLivro(e.target.value as LalurLivro); setCodigo(''); setIndRelacao(''); setParteBId(''); setAccountId(''); setHist(''); }}
                className={inputClass}
              >
                {LALUR_LIVROS.map((l) => <option key={l} value={l}>{LIVRO_LABEL[l]}</option>)}
              </select>
            )}
          </FieldBlock>

          <div className="sm:col-span-3">
            <FieldBlock label={t('lalur.field.codigo', 'Código da linha (Tabela Dinâmica)')}>
              {isEdit ? (
                lockedBox(linha ? `${codigo} · ${linha.descricao}${linha.tipoLanc ? ` · ${linha.tipoLanc}` : ''}` : codigo)
              ) : (
                <CatalogCombobox
                  options={catalog.map((r) => ({ codigo: r.codigo, descricao: r.descricao, tag: r.tipoLanc }))}
                  value={codigo}
                  onChange={(c) => { setCodigo(c); if (c !== codigo) { setParteBId(''); setAccountId(''); } }}
                  loading={catalogLoading}
                  inputClassName={inputClass}
                  ariaLabel={t('lalur.field.codigo', 'Código da linha (Tabela Dinâmica)')}
                  placeholder={t('lalur.field.codigoPlaceholder', 'Busque por código ou descrição (≥ 2 caracteres)…')}
                />
              )}
            </FieldBlock>
          </div>

          <Field label={t('lalur.field.valor', 'Valor (sempre ≥ 0)')}>
            <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={inputClass} />
          </Field>

          {parteA && (
            <>
              <div className="sm:col-span-2">
                <Field label={t('lalur.field.indRelacao', 'Relacionamento (IND_RELACAO)')}>
                  <select
                    value={effectiveInd}
                    disabled={lockedToParteB}
                    onChange={(e) => setIndRelacao(e.target.value as LalurIndRelacao | '')}
                    className={inputClass}
                  >
                    <option value="">{t('lalur.field.indRelacaoPick', 'Selecione…')}</option>
                    {LALUR_IND_RELACAO.map((i) => <option key={i} value={i}>{IND_LABEL[i]}</option>)}
                  </select>
                </Field>
                {lockedToParteB && (
                  <p className="mt-1 text-xs text-amber-300">
                    {t('lalur.field.indRelacaoLocked', 'Compensação de prejuízo (TIPO P): relaciona-se só com a Parte B (Manual p.247, REGRA_IND_RELACAO).')}
                  </p>
                )}
              </div>

              {needsB && (
                <div className="sm:col-span-3">
                  <Field label={t('lalur.field.parteB', 'Conta da Parte B ({{tributo}})', { tributo })}>
                    <select value={parteBId} onChange={(e) => setParteBId(e.target.value)} className={inputClass}>
                      <option value="">{t('lalur.field.parteBPick', 'Selecione…')}</option>
                      {parteBOptions.map((a) => <option key={a.id} value={a.id}>{a.codCtaB} — {a.descricao}</option>)}
                    </select>
                  </Field>
                  {parteBOptions.length === 0 && (
                    <p className="mt-1 text-xs text-neutral-500">{t('lalur.field.parteBEmpty', 'Nenhuma conta viva da Parte B para este tributo — cadastre uma acima.')}</p>
                  )}
                </div>
              )}

              {needsCta && (
                <div className="sm:col-span-3">
                  <Field label={t('lalur.field.account', 'Conta contábil (M310/M360)')}>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                      <option value="">{t('lalur.field.accountPick', 'Selecione…')}</option>
                      {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              <div className="sm:col-span-3">
                <Field label={`${t('lalur.field.hist', 'Histórico (HIST_LAN_LAL)')}${histRequired ? ' *' : ''}`}>
                  <textarea value={hist} onChange={(e) => setHist(e.target.value)} maxLength={500} rows={2} className={inputClass} aria-required={histRequired || undefined} />
                </Field>
              </div>
            </>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
        )}
      </div>
    </Modal>
  );
}
