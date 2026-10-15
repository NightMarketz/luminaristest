import { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import type { AlertaSimples, Apuracao, DasOficial, SimplesDasRegistroInput } from '../../../lib/services/simples.service';
import { formatCents } from '../lib/formatCents';
import { ehBloqueante } from '../lib/simplesGrid';
import { avisoReRegistro, sugestaoVencimento, toDasRegistro, type DasForm, type DasFormError } from '../lib/simplesForms';
import { useAccountingT } from '../lib/useAccountingT';
import { AlertasSimples } from './SimplesApuracaoDetalhe';
import { Field, inputClass } from './SpedGenerationPanel';

const ERRO_LABEL: Record<DasFormError, string> = {
  numeroObrigatorio: 'Informe o número do documento (até 40 caracteres).',
  valorInvalido: 'Valor inválido — use o formato 1.234,56 (maior que zero).',
  vencimentoInvalido: 'Vencimento inválido — escolha uma data do calendário.',
};

export interface RegistroErro {
  mensagem: string;
  alertas?: AlertaSimples[];
}

export interface SimplesDasRegistroProps {
  unitId: string;
  competencia: string;
  /** F-4 (a): o resultado do Calcular desta sessão; sem ele o registro não abre. */
  previa: Apuracao | null;
  vigente: DasOficial | null;
  busy: boolean;
  erro: RegistroErro | null;
  onRegistrar: (body: SimplesDasRegistroInput) => void;
}

/**
 * Item 9 — registrar o DAS oficial (`PUT …/das`; ME/EPP e MEI pela mesma rota). Prévia obrigatória (F-4 a): só com um
 * Calcular desta sessão sem alerta bloqueante; calculado × oficial lado a lado antes de enviar; vencimento date-only com
 * validação de calendário e sugestão do dia 20 do mês seguinte; aviso de re-registro (P4-7 a). Sem o PDF do DAS:
 * não há rota que crie o `SourceDocument` (lacuna 1 de D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS).
 */
export function SimplesDasRegistro({ unitId, competencia, previa, vigente, busy, erro, onRegistrar }: SimplesDasRegistroProps) {
  const { t } = useAccountingT();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<DasForm>(() => ({ numeroDocumento: '', valor: '', vencimento: sugestaoVencimento(competencia) }));
  const [formErro, setFormErro] = useState<DasFormError | null>(null);
  const set = <K extends keyof DasForm>(k: K, v: DasForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const bloqueada = !!previa && previa.alertas.some(ehBloqueante);
  const built = toDasRegistro(unitId, form);
  const aviso = built.ok ? avisoReRegistro(vigente, built.body) : null;
  const btn =
    'inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50';

  function enviar() {
    const b = toDasRegistro(unitId, form);
    if (!b.ok) {
      setFormErro(b.error);
      return;
    }
    setFormErro(null);
    onRegistrar(b.body);
  }

  return (
    <section data-testid="das-registro" className="space-y-3 rounded-2xl border border-neutral-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('simples.das.title', 'Registrar DAS oficial')}</h3>
        {!aberto && (
          <button type="button" className={btn} disabled={!previa || bloqueada} onClick={() => setAberto(true)}>
            {vigente ? t('simples.das.reRegistrar', 'Registrar outro DAS') : t('simples.das.abrir', 'Registrar DAS oficial')}
          </button>
        )}
      </div>
      {!previa && <p className="text-xs text-neutral-500">{t('simples.das.precisaPrevia', 'Calcule antes de registrar: o registro exige a prévia desta sessão.')}</p>}
      {bloqueada && <p className="text-xs text-red-300">{t('simples.das.bloqueada', 'A prévia tem alerta que bloqueia o registro do DAS — resolva antes.')}</p>}

      {erro && (
        <div role="alert" className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <p>{erro.mensagem}</p>
          {erro.alertas && erro.alertas.length > 0 && <AlertasSimples alertas={erro.alertas} />}
        </div>
      )}

      {aberto && previa && !bloqueada && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t('simples.detail.numeroDocumento', 'Número do documento')}>
              <input aria-label={t('simples.detail.numeroDocumento', 'Número do documento')} value={form.numeroDocumento} maxLength={40} onChange={(e) => set('numeroDocumento', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.detail.valorOficial', 'Valor oficial')}>
              <input aria-label={t('simples.detail.valorOficial', 'Valor oficial')} value={form.valor} inputMode="decimal" placeholder="1.234,56" onChange={(e) => set('valor', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
            <Field label={t('simples.detail.vencimento', 'Vencimento')}>
              <input type="date" aria-label={t('simples.detail.vencimento', 'Vencimento')} value={form.vencimento} onChange={(e) => set('vencimento', e.target.value)} className={`w-full ${inputClass}`} />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">
            {t('simples.das.sugestaoVencimento', 'Vencimento sugerido: dia 20 do mês seguinte (LC 123 art. 21 III; Res. CGSN 140 art. 40). É só sugestão — confira no DAS (prorrogação e dia não útil não estão no cálculo).')}
          </p>

          <dl data-testid="das-lado-a-lado" className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">{t('simples.das.calculado', 'Calculado (prévia)')}</dt>
              <dd className="font-mono text-neutral-100">{formatCents(previa.totalCalculadoCents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t('simples.col.oficial', 'Oficial')}</dt>
              <dd className="font-mono text-neutral-100">{built.ok ? formatCents(built.body.valorCents) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">{t('simples.col.divergencia', 'Divergência')}</dt>
              <dd className={`font-mono ${built.ok && built.body.valorCents !== previa.totalCalculadoCents ? 'font-semibold text-amber-300' : 'text-neutral-300'}`}>
                {built.ok ? formatCents(built.body.valorCents - previa.totalCalculadoCents) : '—'}
              </dd>
            </div>
          </dl>

          {aviso && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" size={13} />
              {aviso === 'completa'
                ? t('simples.das.avisoCompleta', 'Mesmo número e valor do DAS já registrado: o envio só completa a provisão pendente.')
                : t('simples.das.avisoSubstitui', 'Já há DAS registrado nesta competência: o novo substitui o anterior e estorna a provisão dele.')}
            </p>
          )}
          {formErro && <p role="alert" className="text-xs text-red-300">{t(`simples.das.erro.${formErro}`, ERRO_LABEL[formErro])}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAberto(false)} className="rounded-xl border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">
              {t('simples.cancelar', 'Cancelar')}
            </button>
            <button type="button" className={btn} disabled={busy} onClick={enviar}>
              {busy ? t('fiscalProfile.saving', 'Salvando…') : t('simples.das.enviar', 'Confirmar registro')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
