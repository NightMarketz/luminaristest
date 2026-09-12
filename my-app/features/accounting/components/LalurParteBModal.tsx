import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../components/ui/Modal';
import {
  lalurService,
  type CreateLalurParteBAccountInput,
  type LalurCatalogParteB,
  type LalurIndSaldo,
  type LalurParteBAccount,
  type LalurTributo,
  type UpdateLalurParteBAccountInput,
} from '../../../lib/services/lalur.service';
import { resolveError } from '../lib/resolveError';
import { parseBrl } from '../lib/parseBrl';
import { scopeToday } from '../lib/formatDate';
import { Field, inputClass } from './SpedGenerationPanel';
import { CatalogCombobox, FieldBlock as Block } from './CatalogCombobox';

export interface LalurParteBModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Exercício selecionado no painel — REGRA_DT_AP_ZERO (p.237). */
  year: number;
  /** When set, the modal edits this account (codCtaB/codTributo locked — "arquive e recrie"). */
  editing?: LalurParteBAccount | null;
  onSuccess: () => void;
  /** A 403 on save (`canManageLalur`) — the panel hides its write buttons (item 11). */
  onForbidden?: () => void;
}

/** 14 digits → `##.###.###/####-##` (display only; the wire carries the digits). */
export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** REGRA_DT_AP_ZERO (Manual p.237; `SpedEcfRealGenerationService`): conta criada DENTRO do exercício tem VL_SALDO_INI = 0. */
export const isCreatedInYear = (dtCriacao: string, year: number) =>
  dtCriacao >= `${year}-01-01` && dtCriacao <= `${year}-12-31`;

/**
 * LalurParteBModal (FE-INCR-LALUR item 5) — cria/edita uma conta da Parte B (M010). O corpo enviado é
 * EXATAMENTE `CreateLalurParteBAccountSchema` / `UpdateLalurParteBAccountSchema` (`.strict()` no
 * servidor). `codPbRfb` vem do catálogo PARTEB_PADRAO filtrado pelo tributo (Fork F-FE-3 → a);
 * `saldoIniCents` passa por `parseBrl` (1.234,56 ⇒ 123456 — footgun 100× registrado); `dtCriacao`
 * é `<input type="date">` com default `scopeToday()` (nunca UTC); `|` em `codCtaB` é bloqueado aqui
 * (separador de campo do SPED — item 17 do 3C). Erros do servidor passam por `resolveError` na íntegra.
 */
export function LalurParteBModal({ isOpen, onClose, unitId, year, editing, onSuccess, onForbidden }: LalurParteBModalProps) {
  const { t } = useTranslation('accounting');
  const isEdit = !!editing;

  const [codCtaB, setCodCtaB] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codTributo, setCodTributo] = useState<LalurTributo>('I');
  const [codPbRfb, setCodPbRfb] = useState('');
  const [dtCriacao, setDtCriacao] = useState(scopeToday());
  const [dtLimite, setDtLimite] = useState('');
  const [saldoIni, setSaldoIni] = useState('');
  const [indSaldoIni, setIndSaldoIni] = useState<LalurIndSaldo>('D');
  const [cnpjSitEsp, setCnpjSitEsp] = useState('');
  const [padrao, setPadrao] = useState<LalurCatalogParteB[]>([]);
  const [padraoLoading, setPadraoLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load/reset the form when opened (edit → prefill; create → defaults).
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setCodCtaB(editing.codCtaB);
      setDescricao(editing.descricao);
      setCodTributo(editing.codTributo);
      setCodPbRfb(editing.codPbRfb);
      setDtCriacao(editing.dtCriacao.slice(0, 10));
      setDtLimite(editing.dtLimite ? editing.dtLimite.slice(0, 10) : '');
      setSaldoIni((editing.saldoIniCents / 100).toFixed(2).replace('.', ','));
      setIndSaldoIni(editing.indSaldoIni);
      setCnpjSitEsp(editing.cnpjSitEsp ?? '');
    } else {
      setCodCtaB('');
      setDescricao('');
      setCodTributo('I');
      setCodPbRfb('');
      setDtCriacao(scopeToday());
      setDtLimite('');
      setSaldoIni('');
      setIndSaldoIni('D');
      setCnpjSitEsp('');
    }
  }, [isOpen, editing]);

  // PARTEB_PADRAO filtered by the tributo — the server refuses a code of the other tributo
  // (REGRA_M010_COD_PB_RFB_TRIBUTO). No year: the write path applies no vigência to COD_PB_RFB.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setPadraoLoading(true);
    lalurService
      .getParteBPadrao(unitId, codTributo)
      .then((rows) => {
        if (cancelled) return;
        setPadrao(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(resolveError(err, t('lalur.error.catalog', 'Erro ao carregar o catálogo do Leiaute 12.')));
      })
      .finally(() => {
        if (!cancelled) setPadraoLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` identity is unstable without an i18n instance (see useAccountingT)
  }, [isOpen, unitId, codTributo]);

  const zeroByRule = isCreatedInYear(dtCriacao, year);
  const pipeInCode = codCtaB.includes('|');
  const cnpjDigits = cnpjSitEsp.replace(/\D/g, '');
  const isValid =
    codCtaB.trim() !== '' && !pipeInCode && descricao.trim() !== '' && codPbRfb !== '' && dtCriacao !== '' &&
    (cnpjDigits === '' || cnpjDigits.length === 14);
  const isDirty = codCtaB !== '' || descricao !== '' || codPbRfb !== '';

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    if (!isValid) {
      setError(t('lalur.parteB.modal.error.invalid', 'Preencha código, descrição, código RFB e data de criação.'));
      return;
    }
    const saldoIniCents = zeroByRule ? 0 : parseBrl(saldoIni);
    setIsSubmitting(true);
    try {
      if (editing) {
        const body: UpdateLalurParteBAccountInput = {
          unitId,
          descricao: descricao.trim(),
          dtCriacao,
          codPbRfb,
          dtLimite: dtLimite || null,
          saldoIniCents,
          indSaldoIni,
          cnpjSitEsp: cnpjDigits || null,
        };
        await lalurService.updateParteB(editing.id, body);
      } else {
        const body: CreateLalurParteBAccountInput = {
          unitId,
          codCtaB: codCtaB.trim(),
          descricao: descricao.trim(),
          dtCriacao,
          codPbRfb,
          ...(dtLimite ? { dtLimite } : {}),
          codTributo,
          saldoIniCents,
          indSaldoIni,
          ...(cnpjDigits ? { cnpjSitEsp: cnpjDigits } : {}),
        };
        await lalurService.createParteB(body);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if ((err as { status?: number } | null)?.status === 403) onForbidden?.();
      setError(resolveError(err, t('lalur.parteB.modal.error.failed', 'Erro ao salvar a conta da Parte B.')));
    } finally {
      setIsSubmitting(false);
    }
  }

  const lockedBox = (text: string) => (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-300">{text}</div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? t('lalur.parteB.modal.titleEdit', 'Editar conta da Parte B') : t('lalur.parteB.modal.title', 'Nova conta da Parte B (M010)')}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Block label={t('lalur.parteB.field.codCtaB', 'Código da conta (COD_CTA_B)')}>
            {isEdit ? (
              lockedBox(codCtaB)
            ) : (
              <input
                type="text"
                value={codCtaB}
                onChange={(e) => setCodCtaB(e.target.value)}
                placeholder="PF-2024"
                aria-invalid={pipeInCode || undefined}
                className={`${inputClass} ${pipeInCode ? 'border-red-700' : ''}`}
              />
            )}
            {pipeInCode && (
              <span role="alert" className="text-red-300">
                {t('lalur.parteB.field.codCtaBPipe', 'O código não pode conter "|" — é o separador de campo do arquivo SPED.')}
              </span>
            )}
            {isEdit && <span className="text-neutral-600">{t('lalur.modal.immutable', 'Não muda — arquive e recrie.')}</span>}
          </Block>

          <Block label={t('lalur.parteB.field.codTributo', 'Tributo')}>
            {isEdit ? (
              lockedBox(codTributo === 'I' ? t('lalur.tributo.I', 'I — IRPJ (e-Lalur)') : t('lalur.tributo.C', 'C — CSLL (e-Lacs)'))
            ) : (
              <div className="flex gap-4 py-2 text-sm text-neutral-200">
                {(['I', 'C'] as const).map((tr) => (
                  <label key={tr} className="inline-flex items-center gap-1.5">
                    <input type="radio" name="lalur-tributo" value={tr} checked={codTributo === tr} onChange={() => { setCodTributo(tr); setCodPbRfb(''); }} />
                    {tr === 'I' ? t('lalur.tributo.I', 'I — IRPJ (e-Lalur)') : t('lalur.tributo.C', 'C — CSLL (e-Lacs)')}
                  </label>
                ))}
              </div>
            )}
          </Block>

          <div className="sm:col-span-2">
            <Field label={t('lalur.parteB.field.descricao', 'Descrição (DESC_CTA_LAL)')}>
              <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Block label={t('lalur.parteB.field.codPbRfb', 'Código padrão RFB (COD_PB_RFB)')}>
              <CatalogCombobox
                options={padrao.map((r) => ({ codigo: r.codigo, descricao: r.descricao, tag: r.tributo }))}
                value={codPbRfb}
                onChange={setCodPbRfb}
                loading={padraoLoading}
                inputClassName={inputClass}
                ariaLabel={t('lalur.parteB.field.codPbRfb', 'Código padrão RFB (COD_PB_RFB)')}
                placeholder={t('lalur.parteB.field.codPbRfbPlaceholder', 'Busque por código ou descrição (≥ 2 caracteres)…')}
              />
            </Block>
          </div>

          <Field label={t('lalur.parteB.field.dtCriacao', 'Data de criação (DT_AP_LAL)')}>
            <input type="date" value={dtCriacao} onChange={(e) => setDtCriacao(e.target.value)} className={inputClass} />
            <span className="text-neutral-600">{t('lalur.parteB.field.dtCriacaoHint', 'Data FINAL do período de apuração em que a conta nasceu.')}</span>
          </Field>

          <Field label={t('lalur.parteB.field.dtLimite', 'Data-limite (DT_LIM_LAL) — opcional')}>
            <input type="date" value={dtLimite} onChange={(e) => setDtLimite(e.target.value)} className={inputClass} />
          </Field>

          <Field label={t('lalur.parteB.field.saldoIni', 'Saldo inicial (VL_SALDO_INI)')}>
            <input
              type="text"
              inputMode="decimal"
              value={zeroByRule ? '0,00' : saldoIni}
              disabled={zeroByRule}
              onChange={(e) => setSaldoIni(e.target.value)}
              placeholder="0,00"
              className={inputClass}
            />
            {zeroByRule && (
              <span className="text-amber-300">
                {t('lalur.parteB.field.saldoIniZero', 'Conta criada dentro de {{year}}: saldo inicial fixado em 0 (Manual p.237, REGRA_DT_AP_ZERO).', { year })}
              </span>
            )}
          </Field>

          <Field label={t('lalur.parteB.field.indSaldoIni', 'Natureza do saldo inicial')}>
            <select value={indSaldoIni} onChange={(e) => setIndSaldoIni(e.target.value as LalurIndSaldo)} disabled={zeroByRule} className={inputClass}>
              <option value="D">{t('lalur.indSaldo.D', 'D — devedor (prejuízo / reduz o lucro real)')}</option>
              <option value="C">{t('lalur.indSaldo.C', 'C — credor')}</option>
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('lalur.parteB.field.cnpjSitEsp', 'CNPJ situação especial — opcional')}>
              <input
                type="text"
                inputMode="numeric"
                value={formatCnpj(cnpjSitEsp)}
                onChange={(e) => setCnpjSitEsp(e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="00.000.000/0000-00"
                aria-invalid={(cnpjDigits !== '' && cnpjDigits.length !== 14) || undefined}
                className={inputClass}
              />
              {cnpjDigits !== '' && cnpjDigits.length !== 14 && (
                <span role="alert" className="text-red-300">{t('lalur.parteB.field.cnpjInvalid', 'CNPJ tem 14 dígitos.')}</span>
              )}
            </Field>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>
        )}
      </div>
    </Modal>
  );
}
