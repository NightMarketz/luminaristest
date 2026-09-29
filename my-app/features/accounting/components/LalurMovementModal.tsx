import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { Modal } from '../../../components/ui/Modal';
import {
  LALUR_INDICADORES,
  LALUR_QUARTERS,
  isPrejuizoIndicador,
  lalurService,
  type CreateLalurParteBMovementInput,
  type LalurIndicador,
  type LalurIndLanAnt,
  type LalurParteBAccount,
  type LalurParteBMovement,
  type LalurQuarter,
  type UpdateLalurParteBMovementInput,
} from '../../../lib/services/lalur.service';
import { resolveError } from '../lib/resolveError';
import { parseBrl } from '../lib/parseBrl';
import { Field, inputClass } from './SpedGenerationPanel';

type Processo = NonNullable<CreateLalurParteBMovementInput['processos']>[number];

export interface LalurMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Exercício da seção — o M030 sob o qual a linha sai. Não muda na edição. */
  year: number;
  /** Contas da Parte B (vivas e arquivadas); o select só oferece as vivas. */
  parteBAccounts: LalurParteBAccount[];
  /** Edição: ano, trimestre e conta travados ("arquive e recrie"). Nunca abre para origem='system'. */
  editing?: LalurParteBMovement | null;
  onSuccess: () => void;
  onForbidden?: () => void;
}

/** HIST_LAN_LALB: 1–500 caracteres, sem '|' (separador de campo do SPED — `spedText` no `LalurDto.ts`). */
export const historicoIssue = (h: string): 'empty' | 'long' | 'pipe' | null =>
  h.trim() === '' ? 'empty' : h.length > 500 ? 'long' : h.includes('|') ? 'pipe' : null;

/** M415 (Manual p.270): IND_PROC 1 judicial · 2 administrativo (`LALUR_IND_PROC`); NUM_PROC 1–20, sem '|'; (IND_PROC, NUM_PROC) não repete no mesmo payload (`processosSet`). */
const processosValid = (ps: Processo[]) =>
  ps.every((p) => p.numProc.trim() !== '' && p.numProc.trim().length <= 20 && !p.numProc.includes('|')) &&
  new Set(ps.map((p) => `${p.indProc}:${p.numProc.trim()}`)).size === ps.length;

/**
 * LalurMovementModal (FE-INCR-LALUR-PR2, PLANO-ONDA1 §4.1 itens 3–5) — cria/edita um movimento M410 da
 * Parte B. Corpo = tipo GERADO (`CreateLalurParteBMovementInput`/`UpdateLalurParteBMovementInput`).
 * - PF/BC não renderizam contrapartida (REGRA_NAO_PREENCHER_CTP, Manual p.269 — `refineLalurMovement`).
 * - CR/DB: contrapartida opcional (o DTO a deixa opcional), só contas vivas do MESMO tributo da conta e
 *   nunca a própria (REGRA_MESMO_TRIBUTO, p.269 — o servidor revalida em `validateContrapartida`).
 * - Processos M415 inline só na criação (F-FE-L2-1 → a). Na edição o campo NÃO é enviado ("ausente =
 *   mantém"): a listagem não devolve os processos, então a tela não tem como mostrá-los — lacuna de spec
 *   registrada no PR (substituir às cegas apagaria processos que o usuário não vê).
 */
export function LalurMovementModal({ isOpen, onClose, unitId, year, parteBAccounts, editing, onSuccess, onForbidden }: LalurMovementModalProps) {
  const { t } = useTranslation('accounting');
  const isEdit = !!editing;

  const [parteBId, setParteBId] = useState('');
  const [quarter, setQuarter] = useState<LalurQuarter | ''>('');
  const [indicador, setIndicador] = useState<LalurIndicador | ''>('');
  const [valor, setValor] = useState('');
  const [contrapartidaId, setContrapartidaId] = useState('');
  const [historico, setHistorico] = useState('');
  const [indLanAnt, setIndLanAnt] = useState<LalurIndLanAnt | ''>('');
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setParteBId(editing?.parteBId ?? '');
    setQuarter(editing?.quarter ?? '');
    setIndicador(editing?.indicador ?? '');
    setValor(editing ? (editing.valorCents / 100).toFixed(2).replace('.', ',') : '');
    setContrapartidaId(editing?.contrapartidaId ?? '');
    setHistorico(editing?.historico ?? '');
    setIndLanAnt(editing?.indLanAnt ?? '');
    setProcessos([]);
  }, [isOpen, editing]);

  const conta = parteBAccounts.find((a) => a.id === parteBId);
  const liveAccounts = parteBAccounts.filter((a) => a.deletedAt === null);
  const contrapartidas = conta ? liveAccounts.filter((a) => a.codTributo === conta.codTributo && a.id !== conta.id) : [];
  const showCtp = indicador !== '' && !isPrejuizoIndicador(indicador);
  const histIssue = historicoIssue(historico);
  const isValid =
    parteBId !== '' && quarter !== '' && indicador !== '' && indLanAnt !== '' && valor.trim() !== '' &&
    histIssue === null && processosValid(processos);

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!isValid) {
      setError(t('lalur.movements.modal.error.invalid', 'Preencha conta, trimestre, indicador, valor, histórico e o indicador de lançamento anterior.'));
      return;
    }
    const valorCents = parseBrl(valor);
    const ctp = showCtp && contrapartidaId ? contrapartidaId : undefined;
    setIsSubmitting(true);
    try {
      if (editing) {
        const body: UpdateLalurParteBMovementInput = {
          unitId,
          valorCents,
          indicador,
          contrapartidaId: ctp ?? null,
          historico: historico.trim(),
          indLanAnt,
        };
        await lalurService.updateMovement(editing.id, body);
      } else {
        const body: CreateLalurParteBMovementInput = {
          unitId,
          parteBId,
          year,
          quarter,
          valorCents,
          indicador,
          historico: historico.trim(),
          indLanAnt,
        };
        if (ctp) body.contrapartidaId = ctp;
        if (processos.length) body.processos = processos.map(toProcesso);
        await lalurService.createMovement(body);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if ((err as { status?: number } | null)?.status === 403) onForbidden?.();
      setError(resolveError(err, t('lalur.movements.modal.error.failed', 'Erro ao salvar o movimento da Parte B.')));
    } finally {
      setIsSubmitting(false);
    }
  }

  const lockedBox = (text: string) => (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-300">{text}</div>
  );
  const immutable = <span className="text-neutral-600">{t('lalur.modal.immutable', 'Não muda — arquive e recrie.')}</span>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? t('lalur.movements.modal.titleEdit', 'Editar movimento da Parte B') : t('lalur.movements.modal.title', 'Novo movimento da Parte B (M410)')}
      maxWidth="max-w-2xl"
      isDirty={!isEdit && (parteBId !== '' || historico !== '' || valor !== '')}
      themeColor="bg-emerald-600"
      footer={
        <>
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-50">
            {t('lalur.modal.cancel', 'Cancelar')}
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={!isValid || isSubmitting} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? t('lalur.modal.saving', 'Salvando…') : t('lalur.modal.submit', 'Salvar')}
          </button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('lalur.movements.field.conta', 'Conta da Parte B (COD_CTA_B)')}>
            {isEdit ? (
              lockedBox(conta ? `${conta.codCtaB} (${conta.codTributo})` : parteBId)
            ) : (
              <select value={parteBId} onChange={(e) => { setParteBId(e.target.value); setContrapartidaId(''); }} className={inputClass}>
                <option value="">{t('lalur.movements.field.contaPlaceholder', 'Selecione a conta…')}</option>
                {liveAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.codCtaB} — {a.descricao} ({a.codTributo})</option>
                ))}
              </select>
            )}
            {isEdit && immutable}
          </Field>

          <Field label={t('lalur.movements.field.quarter', 'Exercício / trimestre')}>
            {isEdit ? (
              lockedBox(`${editing?.quarter}/${editing?.year}`)
            ) : (
              <select value={quarter} onChange={(e) => setQuarter(e.target.value as LalurQuarter | '')} className={inputClass}>
                <option value="">{t('lalur.movements.field.quarterPlaceholder', 'Trimestre de {{year}}…', { year })}</option>
                {LALUR_QUARTERS.map((q) => <option key={q} value={q}>{q}/{year}</option>)}
              </select>
            )}
            {isEdit && immutable}
          </Field>

          <Field label={t('lalur.movements.field.indicador', 'Indicador (IND_VAL_LAN_LALB_PB)')}>
            <select value={indicador} onChange={(e) => setIndicador(e.target.value as LalurIndicador | '')} className={inputClass}>
              <option value="">{t('lalur.movements.field.indicadorPlaceholder', 'Selecione…')}</option>
              {LALUR_INDICADORES.map((i) => <option key={i} value={i}>{t(`lalur.movements.indicador.${i}`, i)}</option>)}
            </select>
          </Field>

          <Field label={t('lalur.movements.field.valor', 'Valor (VAL_LAN_LALB_PB)')}>
            <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={inputClass} />
          </Field>

          {showCtp && (
            <div className="sm:col-span-2">
              <Field label={t('lalur.movements.field.contrapartida', 'Contrapartida (COD_CTA_B_CTP) — opcional, mesmo tributo')}>
                <select aria-label={t('lalur.movements.field.contrapartida', 'Contrapartida (COD_CTA_B_CTP) — opcional, mesmo tributo')} value={contrapartidaId} onChange={(e) => setContrapartidaId(e.target.value)} disabled={!conta} className={inputClass}>
                  <option value="">{t('lalur.movements.field.noContrapartida', '— sem contrapartida —')}</option>
                  {contrapartidas.map((a) => <option key={a.id} value={a.id}>{a.codCtaB} — {a.descricao}</option>)}
                </select>
              </Field>
            </div>
          )}

          <Field label={t('lalur.movements.field.indLanAnt', 'Lançamento anterior (IND_LAN_ANT)')}>
            <select value={indLanAnt} onChange={(e) => setIndLanAnt(e.target.value as LalurIndLanAnt | '')} className={inputClass}>
              <option value="">{t('lalur.movements.field.indicadorPlaceholder', 'Selecione…')}</option>
              <option value="N">{t('lalur.movements.indLanAnt.N', 'N — não')}</option>
              <option value="S">{t('lalur.movements.indLanAnt.S', 'S — realização de valor com tributação diferida')}</option>
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('lalur.movements.field.historico', 'Histórico (HIST_LAN_LALB, até 500)')}>
              <textarea value={historico} onChange={(e) => setHistorico(e.target.value)} rows={3} aria-invalid={histIssue === 'pipe' || histIssue === 'long' || undefined} className={inputClass} />
              {histIssue === 'pipe' && (
                <span role="alert" className="text-red-300">{t('lalur.movements.field.historicoPipe', 'O histórico não pode conter "|" — é o separador de campo do arquivo SPED.')}</span>
              )}
              {histIssue === 'long' && (
                <span role="alert" className="text-red-300">{t('lalur.movements.field.historicoLong', 'O histórico tem no máximo 500 caracteres.')}</span>
              )}
            </Field>
          </div>
        </div>

        {!isEdit && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">{t('lalur.movements.processos.title', 'Processos (M415) — opcional')}</span>
              <button type="button" onClick={() => setProcessos((p) => [...p, { indProc: '1', numProc: '' }])} disabled={processos.length >= 50} className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40">
                <FiPlus size={12} /> {t('lalur.movements.processos.add', 'Adicionar processo')}
              </button>
            </div>
            {processos.map((p, i) => (
              <div key={i} className="mb-2 grid grid-cols-[10rem_1fr_auto] gap-2">
                <select aria-label={t('lalur.movements.processos.indProc', 'Tipo do processo')} value={p.indProc} onChange={(e) => setProcessos((ps) => ps.map((x, j) => (j === i ? { indProc: e.target.value as Processo['indProc'], numProc: x.numProc } : x)))} className={inputClass}>
                  <option value="1">{t('lalur.movements.processos.indProc1', '1 — judicial')}</option>
                  <option value="2">{t('lalur.movements.processos.indProc2', '2 — administrativo')}</option>
                </select>
                <input aria-label={t('lalur.movements.processos.numProc', 'Número do processo')} value={p.numProc} maxLength={20} onChange={(e) => setProcessos((ps) => ps.map((x, j) => (j === i ? { indProc: x.indProc, numProc: e.target.value } : x)))} className={inputClass} />
                <button type="button" aria-label={t('lalur.movements.processos.remove', 'Remover processo')} onClick={() => setProcessos((ps) => ps.filter((_, j) => j !== i))} className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-neutral-400 hover:bg-neutral-700">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
        )}
      </div>
    </Modal>
  );
}

/** Linha do editor → item de `processos` (retorno declarado: chave fora do DTO é erro de tsc). */
function toProcesso(p: Processo): Processo {
  return { indProc: p.indProc, numProc: p.numProc.trim() };
}
