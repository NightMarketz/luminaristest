import { useCallback, useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { fiscalProfileService, type FiscalProfileView } from '../../../lib/services/fiscalProfile.service';
import { accountingService, type Account } from '../../../lib/services/accounting.service';
import { resolveError } from '../lib/resolveError';
import { useAccountingT } from '../lib/useAccountingT';
import { toFiscalProfileForm, toUpsertFiscalProfile, type FiscalProfileForm, type FiscalProfileFormError } from '../lib/fiscalProfileForm';
import { Field, inputClass } from './SpedGenerationPanel';
import { FieldBlock as Block } from './CatalogCombobox';
import { FixedAssetAccountSelect } from './FixedAssetAccountSelect';

/** Nomes de campo que `emissao.faltantes` do BE traz hoje (`FiscalProfileService.ts:99-111`) → rótulo pt (fallback do i18n); o resto (frase pronta do BE) sai como veio. */
const FALTANTE_LABEL: Record<string, string> = {
  codMun: 'Município do emitente (código IBGE)',
  pTotTribSNCent: 'Tributos aproximados — Simples Nacional (%)',
  pTotTribFedCent: 'Tributos aproximados — federal (%)',
  pTotTribEstCent: 'Tributos aproximados — estadual (%)',
  pTotTribMunCent: 'Tributos aproximados — municipal (%)',
  ibsCbsCst: 'IBS/CBS — CST',
  ibsCbsClassTrib: 'IBS/CBS — cClassTrib',
};

const FORM_ERROR_LABEL: Record<FiscalProfileFormError, string> = {
  regimeRequired: 'Escolha o regime tributário.',
  pisCofinsRegimeRequired: 'Escolha o regime de PIS/COFINS.',
  dpsSerieInvalid: 'A série da DPS deve ser um número inteiro.',
  pctInvalid: 'Percentual inválido — use o formato 2,00 (até 2 casas).',
};

const REG_ESP_TRIB = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const fieldset = 'space-y-3 rounded-2xl border border-neutral-800 p-4';
const legend = 'px-1 text-xs font-semibold uppercase tracking-widest text-neutral-400';
const checkLabel = 'inline-flex items-center gap-2 text-xs text-neutral-300';

/** Garante que a conta já gravada apareça no select mesmo se saiu do plano — senão o select mostraria "vazio" e o estado seguiria com o id. */
function withStale(accounts: Account[], value: string): Account[] {
  if (!value || accounts.some((a) => a.id === value)) return accounts;
  return [...accounts, { id: value, code: '—', name: value, nature: 'Asset', acceptsEntries: true }];
}

export interface FiscalProfilePanelProps {
  unitId: string;
}

/**
 * Perfil fiscal da UNIDADE (FE-INCR-DFE PR-0, itens 3, 5 e 6) — `GET/PUT /api/accounting/fiscal-profile`. O PUT é
 * substituição total: o formulário nasce do GET e o mapper (`toUpsertFiscalProfile`) manda todo campo. Sem perfil
 * (GET `null`) o formulário abre em branco e o aviso diz que nenhuma venda emite.
 */
export function FiscalProfilePanel({ unitId }: FiscalProfilePanelProps) {
  const { t, tRef } = useAccountingT();
  const [view, setView] = useState<FiscalProfileView | null>(null);
  const [form, setForm] = useState<FiscalProfileForm>(() => toFiscalProfileForm(null));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profile, accs] = await Promise.all([
        fiscalProfileService.getUnitProfile(unitId),
        accountingService.getAccounts(unitId).then((r) => r.accounts).catch((): Account[] => []),
      ]);
      setView(profile);
      setForm(toFiscalProfileForm(profile));
      setAccounts(accs.filter((a) => a.nature === 'Asset' && a.acceptsEntries));
    } catch (e: unknown) {
      setLoadError(resolveError(e, tRef.current('fiscalProfile.error.load', 'Não foi possível carregar o perfil fiscal.')));
    } finally {
      setLoading(false);
    }
  }, [unitId, tRef]);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof FiscalProfileForm>(key: K, value: FiscalProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Troca de regime: o espelho do `superRefine` — SIMPLES trava ICMS/PIS-COFINS; sair de SIMPLES obriga a escolher o regime de PIS/COFINS. */
  function setRegime(next: FiscalProfileForm['regimeTributario']) {
    setForm((f) => ({
      ...f,
      regimeTributario: next,
      icmsContribuinte: next === 'SIMPLES' ? false : f.icmsContribuinte,
      pisCofinsRegime: next === 'SIMPLES' ? 'SIMPLES' : f.pisCofinsRegime === 'SIMPLES' ? '' : f.pisCofinsRegime,
    }));
  }

  async function save() {
    const built = toUpsertFiscalProfile(unitId, form);
    if (!built.ok) {
      setSaveError(tRef.current(`fiscalProfile.error.${built.error}`, FORM_ERROR_LABEL[built.error]));
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await fiscalProfileService.putUnitProfile(built.body);
      setView(saved);
      setForm(toFiscalProfileForm(saved));
    } catch (e: unknown) {
      setSaveError(resolveError(e, tRef.current('fiscalProfile.error.save', 'Não foi possível salvar o perfil fiscal.')));
    } finally {
      setSaving(false);
    }
  }

  // ponytail: os `as` dos <select> abaixo são folha string → união (cada <option> já é um membro da união), nunca objeto.
  const regime = form.regimeTributario;
  const simples = regime === 'SIMPLES';
  const faltanteLabel = (name: string) => (name in FALTANTE_LABEL ? t(`fiscalProfile.faltante.${name}`, FALTANTE_LABEL[name]) : name);
  const ibsCbsInformar = form.ibsCbsInformar ?? (regime !== '' && !simples);
  const accountSelect = (key: 'icmsRecuperavelAccountId' | 'pisCofinsRecuperavelAccountId', label: string) => (
    <Block label={label}>
      <FixedAssetAccountSelect
        accounts={withStale(accounts, form[key])}
        value={form[key]}
        onChange={(id) => set(key, id)}
        ariaLabel={label}
        placeholder={t('fiscalProfile.noAccount', '— nenhuma —')}
      />
    </Block>
  );

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5" aria-label={t('fiscalProfile.unit.title', 'Perfil fiscal da unidade')}>
      <h2 className="text-lg font-semibold text-neutral-200">{t('fiscalProfile.unit.title', 'Perfil fiscal da unidade')}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        {t('fiscalProfile.unit.subtitle', 'Serve à NF-e de compra (custo) e à NFS-e de venda. Salvar substitui o perfil inteiro.')}
      </p>

      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('fiscalProfile.loading', 'Carregando…')}</div>}
      {loadError && <div role="alert" className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{loadError}</div>}

      {!loading && !loadError && (
        <>
          {/* ── Estado de emissão (item 6) ─────────────────────────────────── */}
          {view === null ? (
            <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              <FiAlertTriangle size={16} /> {t('fiscalProfile.missing', 'Sem perfil fiscal: nenhuma venda emite NFS-e até você salvar este formulário.')}
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {view.emissao.completo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-medium text-emerald-400">
                  <FiCheckCircle size={14} /> {t('fiscalProfile.emissao.completo', 'Pronto para emitir NFS-e')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600/15 px-3 py-1 text-xs font-medium text-amber-400">
                  <FiAlertTriangle size={14} /> {t('fiscalProfile.emissao.incompleto', 'Perfil incompleto para emitir NFS-e')}
                </span>
              )}
              {view.emissao.faltantes.length > 0 && (
                <ul aria-label={t('fiscalProfile.emissao.faltantes', 'O que falta')} className="list-inside list-disc text-xs text-amber-300">
                  {view.emissao.faltantes.map((f) => <li key={f}>{faltanteLabel(f)}</li>)}
                </ul>
              )}
              {view.emissao.pendingExternalValidation.length > 0 && (
                <p role="status" className="text-xs text-amber-300">
                  {t('fiscalProfile.emissao.pending', 'Valores do contador ainda não confirmados (D1f) — salvar este formulário os confirma:')}{' '}
                  <span className="font-mono">{view.emissao.pendingExternalValidation.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* ── Regime ─────────────────────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.regime', 'Regime')}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('fiscalProfile.field.regimeTributario', 'Regime tributário')}>
                  <select value={regime} onChange={(e) => setRegime(e.target.value as FiscalProfileForm['regimeTributario'])} className={`w-full ${inputClass}`}>
                    <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                    <option value="SIMPLES">{t('fiscalProfile.regime.SIMPLES', 'Simples Nacional')}</option>
                    <option value="PRESUMIDO">{t('fiscalProfile.regime.PRESUMIDO', 'Lucro Presumido')}</option>
                    <option value="REAL">{t('fiscalProfile.regime.REAL', 'Lucro Real')}</option>
                  </select>
                </Field>
                <Field label={t('fiscalProfile.field.pisCofinsRegime', 'Regime de PIS/COFINS')}>
                  <select
                    value={form.pisCofinsRegime}
                    onChange={(e) => set('pisCofinsRegime', e.target.value as FiscalProfileForm['pisCofinsRegime'])}
                    disabled={simples || regime === ''}
                    className={`w-full ${inputClass}`}
                  >
                    {simples ? (
                      <option value="SIMPLES">{t('fiscalProfile.pisCofins.SIMPLES', 'Simples')}</option>
                    ) : (
                      <>
                        <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                        <option value="CUMULATIVO">{t('fiscalProfile.pisCofins.CUMULATIVO', 'Cumulativo')}</option>
                        <option value="NAO_CUMULATIVO">{t('fiscalProfile.pisCofins.NAO_CUMULATIVO', 'Não cumulativo')}</option>
                      </>
                    )}
                  </select>
                </Field>
              </div>
              <label className={checkLabel}>
                <input type="checkbox" checked={form.icmsContribuinte} disabled={simples} onChange={(e) => set('icmsContribuinte', e.target.checked)} />
                {t('fiscalProfile.field.icmsContribuinte', 'Contribuinte de ICMS')}
              </label>
              {simples && (
                <p className="text-xs text-neutral-500">
                  {t('fiscalProfile.simplesNote', 'Simples Nacional: ICMS fora e PIS/COFINS pelo Simples — regra atual do sistema; revisão no X10a.')}
                </p>
              )}
            </fieldset>

            {/* ── Emitente da NFS-e ──────────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.emitente', 'Emitente da NFS-e')}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('fiscalProfile.field.codMun', 'Município do emitente (código IBGE, 7 dígitos)')}>
                  <input value={form.codMun} onChange={(e) => set('codMun', e.target.value)} inputMode="numeric" maxLength={7} className={`w-full ${inputClass}`} />
                </Field>
                <Field label={t('fiscalProfile.field.inscricaoMunicipal', 'Inscrição municipal')}>
                  <input value={form.inscricaoMunicipal} onChange={(e) => set('inscricaoMunicipal', e.target.value)} maxLength={15} className={`w-full ${inputClass}`} />
                </Field>
                <Field label={t('fiscalProfile.field.cnae', 'CNAE')}>
                  <input value={form.cnae} onChange={(e) => set('cnae', e.target.value)} maxLength={10} className={`w-full ${inputClass}`} />
                </Field>
                <Field label={t('fiscalProfile.field.regEspTrib', 'Regime especial de tributação (0–9)')}>
                  <select value={form.regEspTrib} onChange={(e) => set('regEspTrib', e.target.value)} className={`w-full ${inputClass}`}>
                    {REG_ESP_TRIB.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                {simples && (
                  <Field label={t('fiscalProfile.field.regApTribSN', 'Regime de apuração pelo Simples')}>
                    <select value={form.regApTribSN} onChange={(e) => set('regApTribSN', e.target.value)} className={`w-full ${inputClass}`}>
                      <option value="">{t('fiscalProfile.select', '— selecione —')}</option>
                      <option value="1">{t('fiscalProfile.regApTribSN.1', '1 — tudo pelo Simples')}</option>
                      <option value="2">{t('fiscalProfile.regApTribSN.2', '2 — federais pelo Simples e ISS pela NFS-e')}</option>
                      <option value="3">{t('fiscalProfile.regApTribSN.3', '3 — tudo pela NFS-e')}</option>
                    </select>
                  </Field>
                )}
                <Field label={t('fiscalProfile.field.dpsSerie', 'Série da DPS')}>
                  <input value={form.dpsSerie} onChange={(e) => set('dpsSerie', e.target.value)} inputMode="numeric" className={`w-full ${inputClass}`} />
                </Field>
              </div>
              <p className="text-xs text-neutral-500">{t('fiscalProfile.dpsSerieNote', 'No modo manual o portal numera a DPS (Guia do Emissor Web, G3) — a série só vale para outro parceiro.')}</p>
            </fieldset>

            {/* ── ISS ────────────────────────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.iss', 'ISS')}</legend>
              <Field label={t('fiscalProfile.field.issAliquota', 'Alíquota do ISS (%)')}>
                <input value={form.issAliquota} onChange={(e) => set('issAliquota', e.target.value)} inputMode="decimal" placeholder="2,00" className={`w-full sm:w-40 ${inputClass}`} />
              </Field>
              <label className={checkLabel}>
                <input type="checkbox" checked={form.issRetidoTomadorPj} onChange={(e) => set('issRetidoTomadorPj', e.target.checked)} />
                {t('fiscalProfile.field.issRetidoTomadorPj', 'ISS retido pelo tomador pessoa jurídica')}
              </label>
              {form.issRetidoTomadorPj && (
                <p role="status" className="text-xs text-amber-300">
                  {t('fiscalProfile.issRetidoWarn', 'Atenção: a emissão recusa hoje — falta o endereço do tomador (F-DFE-14).')}
                </p>
              )}
            </fieldset>

            {/* ── Tributos aproximados ───────────────────────────────────── */}
            {regime !== '' && (
              <fieldset className={fieldset}>
                <legend className={legend}>{t('fiscalProfile.group.totTrib', 'Tributos aproximados (%)')}</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {simples ? (
                    <Field label={t('fiscalProfile.field.pTotTribSN', 'Simples Nacional')}>
                      <input value={form.pTotTribSN} onChange={(e) => set('pTotTribSN', e.target.value)} inputMode="decimal" className={`w-full ${inputClass}`} />
                    </Field>
                  ) : (
                    <>
                      <Field label={t('fiscalProfile.field.pTotTribFed', 'Federal')}>
                        <input value={form.pTotTribFed} onChange={(e) => set('pTotTribFed', e.target.value)} inputMode="decimal" className={`w-full ${inputClass}`} />
                      </Field>
                      <Field label={t('fiscalProfile.field.pTotTribEst', 'Estadual')}>
                        <input value={form.pTotTribEst} onChange={(e) => set('pTotTribEst', e.target.value)} inputMode="decimal" className={`w-full ${inputClass}`} />
                      </Field>
                      <Field label={t('fiscalProfile.field.pTotTribMun', 'Municipal')}>
                        <input value={form.pTotTribMun} onChange={(e) => set('pTotTribMun', e.target.value)} inputMode="decimal" className={`w-full ${inputClass}`} />
                      </Field>
                    </>
                  )}
                </div>
              </fieldset>
            )}

            {/* ── IBS/CBS ────────────────────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.ibsCbs', 'IBS/CBS')}</legend>
              <label className={checkLabel}>
                <input type="checkbox" checked={ibsCbsInformar} onChange={(e) => set('ibsCbsInformar', e.target.checked)} />
                {t('fiscalProfile.field.ibsCbsInformar', 'Informar IBS/CBS na NFS-e')}
              </label>
              {ibsCbsInformar && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('fiscalProfile.field.ibsCbsCst', 'CST (3 dígitos)')}>
                    <input value={form.ibsCbsCst} onChange={(e) => set('ibsCbsCst', e.target.value)} maxLength={3} inputMode="numeric" className={`w-full ${inputClass}`} />
                  </Field>
                  <Field label={t('fiscalProfile.field.ibsCbsClassTrib', 'cClassTrib (6 dígitos, começa pelo CST)')}>
                    <input value={form.ibsCbsClassTrib} onChange={(e) => set('ibsCbsClassTrib', e.target.value)} maxLength={6} inputMode="numeric" className={`w-full ${inputClass}`} />
                  </Field>
                </div>
              )}
            </fieldset>

            {/* ── Emissão ────────────────────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.emissao', 'Emissão')}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label={t('fiscalProfile.field.emissaoForaDoMes', 'Competência fora do mês')}>
                  <select value={form.emissaoForaDoMes} onChange={(e) => set('emissaoForaDoMes', e.target.value as FiscalProfileForm['emissaoForaDoMes'])} className={`w-full ${inputClass}`}>
                    <option value="AVISAR">{t('fiscalProfile.foraDoMes.AVISAR', 'Avisar')}</option>
                    <option value="BLOQUEAR">{t('fiscalProfile.foraDoMes.BLOQUEAR', 'Bloquear')}</option>
                  </select>
                </Field>
                <Field label={t('fiscalProfile.field.pacoteFatoGerador', 'Fato gerador do pacote')}>
                  <select value={form.pacoteFatoGerador} onChange={(e) => set('pacoteFatoGerador', e.target.value as FiscalProfileForm['pacoteFatoGerador'])} className={`w-full ${inputClass}`}>
                    <option value="CONSUMO">{t('fiscalProfile.fatoGerador.CONSUMO', 'Consumo')}</option>
                    <option value="VENDA">{t('fiscalProfile.fatoGerador.VENDA', 'Venda')}</option>
                  </select>
                </Field>
                <Field label={t('fiscalProfile.field.partnerAccountRef', 'Conta no parceiro emissor')}>
                  <input value={form.partnerAccountRef} onChange={(e) => set('partnerAccountRef', e.target.value)} maxLength={120} className={`w-full ${inputClass}`} />
                </Field>
              </div>
            </fieldset>

            {/* ── Custo de compra (X6) ───────────────────────────────────── */}
            <fieldset className={fieldset}>
              <legend className={legend}>{t('fiscalProfile.group.cost', 'Custo de compra (NF-e)')}</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className={checkLabel}>
                  <input type="checkbox" checked={form.pisCofinsCreditExcludesIcms} onChange={(e) => set('pisCofinsCreditExcludesIcms', e.target.checked)} />
                  {t('fiscalProfile.field.creditExcludesIcms', 'Crédito de PIS/COFINS exclui o ICMS da base')}
                </label>
                <label className={checkLabel}>
                  <input type="checkbox" checked={false} disabled readOnly />
                  {t('fiscalProfile.field.creditIncludesIpi', 'Crédito de PIS/COFINS inclui o IPI (regra fixa: não)')}
                </label>
                <label className={checkLabel}>
                  <input type="checkbox" checked={form.pisCofinsCreditFromSimplesSupplier} onChange={(e) => set('pisCofinsCreditFromSimplesSupplier', e.target.checked)} />
                  {t('fiscalProfile.field.creditFromSimplesSupplier', 'Crédito sobre compra de fornecedor do Simples')}
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {accountSelect('icmsRecuperavelAccountId', t('fiscalProfile.field.icmsRecuperavelAccountId', 'Conta de ICMS a recuperar'))}
                {accountSelect('pisCofinsRecuperavelAccountId', t('fiscalProfile.field.pisCofinsRecuperavelAccountId', 'Conta de PIS/COFINS a recuperar'))}
              </div>
            </fieldset>
          </div>

          {saveError && <div role="alert" className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{saveError}</div>}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('fiscalProfile.save', 'Salvar perfil')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
