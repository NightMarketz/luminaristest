// React default import: tsconfig uses jsx:"preserve", so vitest/esbuild transforms JSX with the
// classic runtime and needs React in scope (same pattern as SpedGenerationPanel/ImportExportPanel).
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiDownload, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import {
  spedService,
  type EcfDeclarant,
  type EcfSigner,
  type EcfRealFiscal,
} from '../../../lib/services/sped.service';
import {
  Field,
  inputClass,
  UF_CODES,
  EcfSignersEditor,
  emptyEcfSigner,
  validateEcfSigners,
} from './SpedGenerationPanel';
import { resolveError } from '../lib/resolveError';

/**
 * SPED ECF generation panel — Lucro REAL (FE-INCR-COMPLIANCE-2, ADR-INCR-SPED-ECF-FASE3).
 *
 * Separate file (Fork F-COMP2-1 → (b)): the Presumido form (`SpedGenerationPanel.tsx`,
 * already tested + independently reviewed) stays untouched by the churn Forks 2/3/4 of
 * the ADR will bring (blocks L/M/N transcription) — that churn lands only here from now
 * on. `declarant`/`signers` reuse `EcfDeclarant`/`EcfSigner`/`EcfSignersEditor`/
 * `validateEcfSigners`/`emptyEcfSigner`/`Field`/`inputClass`/`UF_CODES` exported by
 * `SpedGenerationPanel.tsx` — the server's `SpedEcfRealDto.ts` imports the identical
 * `DeclarantSchema`/`SignerSchema` (+ `refineEcfSigners`) from `SpedEcfDto.ts`, so this is
 * the SAME domain object as the Presumido form, not a parallel shape to keep in sync by hand.
 *
 * Esqueleto (ADR-INCR-SPED-ECF-FASE3, honesty gate — BRIEF item 7): blocks L, M and N ship
 * empty; `HASH_ECF_ANTERIOR` is always blank; Forks 2/3/4 of the ADR are still pending
 * ratification and the Manual do Leiaute 12 transcription for the Real regime. The banner
 * below is PERMANENT and non-dismissible (Fork F-COMP2-4 → (a)) — never a one-time
 * confirmation, so it cannot be "acknowledged away" without reading it again next time.
 *
 * Unlike the Presumido ECF, there is no revenue-exhaustiveness gate here (server comment,
 * `spedController.ts`) — this panel does not fabricate one (BRIEF item 12).
 */
/** id of this panel's section — the "Gerar ECF Real ↓" link in `LalurPanel` scrolls to it (FE-INCR-LALUR item 12). */
export const SPED_ECF_REAL_ANCHOR = 'sped-ecf-real';

export function SpedEcfRealPanel({ unitId }: { unitId: string }) {
  const { t } = useTranslation('accounting');
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(String(currentYear - 1));
  const [declarant, setDeclarant] = useState<EcfDeclarant>({
    cnpj: '', nome: '', codNat: '', cnaeFiscal: '', endereco: '', bairro: '',
    uf: 'SP', codMun: '', cep: '', email: '',
  });
  // Fork F-COMP2-2 → (b): editable, pre-filled with the server default ('1' = Lucro Real).
  const [formaTrib, setFormaTrib] = useState('1');
  // No default on the server (Manual do Real not transcribed) — starts blank, 4 chars required.
  const [formaTribPer, setFormaTribPer] = useState('');
  const [csll, setCsll] = useState<'1' | '4'>('1');
  const [signers, setSigners] = useState<EcfSigner[]>([emptyEcfSigner()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genericError = () => t('sped.error.generic', 'Ocorreu um erro. Verifique os campos e tente novamente.');
  const signerError = (code: string) =>
    t(`sped.error.${code}`, t('sped.error.signersInvalid', 'Signatários inválidos.'));

  function setD<K extends keyof EcfDeclarant>(k: K, v: EcfDeclarant[K]) {
    setDeclarant((p) => ({ ...p, [k]: v }));
  }

  async function handleGenerate() {
    setError(null);
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2015 || y > 2100) {
      setError(t('sped.error.yearEcf', 'Informe um ano válido (≥ 2015).'));
      return;
    }
    if (formaTribPer.trim().length !== 4) {
      setError(
        t('sped.ecfReal.error.formaTribPer', 'Forma trib. do período (0010) deve ter exatamente 4 posições.'),
      );
      return;
    }
    const signerIssue = validateEcfSigners(signers);
    if (signerIssue) {
      setError(signerError(signerIssue));
      return;
    }
    const fiscal: EcfRealFiscal = {
      formaTrib: formaTrib.trim() || undefined,
      formaTribPer: formaTribPer.trim(),
      indAliqCsll: csll,
      indRecReceita: '2',
    };
    setBusy(true);
    try {
      await spedService.generateAndDownloadEcfReal({
        unitId,
        year: y,
        declarant,
        fiscal,
        signers,
      });
    } catch (err) {
      setError(resolveError(err, genericError()));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id={SPED_ECF_REAL_ANCHOR} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-neutral-200">
        {t('sped.ecfReal.title', 'Gerar SPED ECF (Lucro Real)')}
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        {t(
          'sped.ecfReal.description',
          'Escrituração Contábil Fiscal — Lucro Real. O PVA recupera os blocos da ECD ativa.',
        )}
      </p>

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
        <FiAlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>
          {t(
            'sped.ecfReal.skeletonBanner',
            'Esqueleto — blocos L, M e N saem vazios; HASH_ECF_ANTERIOR sempre vazio; Forks 2, 3 e 4 do ADR ainda pendentes de ratificação e do Manual do Leiaute 12.',
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label={t('sped.field.year', 'Ano')}>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('sped.field.cnpj', 'CNPJ')}>
          <input type="text" value={declarant.cnpj} onChange={(e) => setD('cnpj', e.target.value)} placeholder="14 dígitos" className={inputClass} />
        </Field>
        <Field label={t('sped.field.nome', 'Nome empresarial')}>
          <input type="text" value={declarant.nome} onChange={(e) => setD('nome', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('sped.field.codNat', 'Nat. jurídica')}>
          <input type="text" value={declarant.codNat} onChange={(e) => setD('codNat', e.target.value)} placeholder="2062" className={inputClass} />
        </Field>
        <Field label={t('sped.field.cnae', 'CNAE-Fiscal')}>
          <input type="text" value={declarant.cnaeFiscal} onChange={(e) => setD('cnaeFiscal', e.target.value)} placeholder="7 dígitos" className={inputClass} />
        </Field>
        <Field label={t('sped.field.endereco', 'Endereço')}>
          <input type="text" value={declarant.endereco} onChange={(e) => setD('endereco', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('sped.field.bairro', 'Bairro')}>
          <input type="text" value={declarant.bairro} onChange={(e) => setD('bairro', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('sped.field.uf', 'UF')}>
          <select value={declarant.uf} onChange={(e) => setD('uf', e.target.value)} className={inputClass}>
            {UF_CODES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </Field>
        <Field label={t('sped.field.codMun', 'Cód. município (IBGE)')}>
          <input type="text" value={declarant.codMun} onChange={(e) => setD('codMun', e.target.value)} placeholder="7 dígitos" className={inputClass} />
        </Field>
        <Field label={t('sped.field.cep', 'CEP')}>
          <input type="text" value={declarant.cep} onChange={(e) => setD('cep', e.target.value)} placeholder="8 dígitos" className={inputClass} />
        </Field>
        <Field label={t('sped.field.email', 'E-mail')}>
          <input type="email" value={declarant.email} onChange={(e) => setD('email', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('sped.field.csll', 'Alíquota CSLL')}>
          <select value={csll} onChange={(e) => setCsll(e.target.value as '1' | '4')} className={inputClass}>
            <option value="1">9%</option>
            <option value="4">15%</option>
          </select>
        </Field>
        <Field label={t('sped.field.formaTrib', 'Forma de tributação (0010)')}>
          <input
            type="text"
            maxLength={1}
            value={formaTrib}
            onChange={(e) => setFormaTrib(e.target.value)}
            placeholder="1"
            className={inputClass}
          />
        </Field>
        <Field label={t('sped.field.formaTribPer', 'Forma trib. do período (0010, 4 posições)')}>
          <input
            type="text"
            maxLength={4}
            value={formaTribPer}
            onChange={(e) => setFormaTribPer(e.target.value)}
            placeholder="PPPP"
            className={inputClass}
          />
        </Field>
      </div>

      <EcfSignersEditor t={t} signers={signers} setSigners={setSigners} />

      {error && (
        <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? <FiRefreshCw className="animate-spin" size={16} /> : <FiDownload size={16} />}
        {busy ? t('sped.generating', 'Gerando…') : t('sped.ecfReal.submit', 'Gerar e baixar ECF (Real)')}
      </button>
    </section>
  );
}
