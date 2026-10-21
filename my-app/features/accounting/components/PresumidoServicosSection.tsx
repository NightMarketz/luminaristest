import { useCallback, useEffect, useRef, useState } from 'react';
import { companyFiscalProfileService, type CompanyFiscalProfileView } from '../../../lib/services/companyFiscalProfile.service';
import { resolveError } from '../lib/resolveError';
import {
  regimeComPresumidoServicos,
  setPrestadoraExclusiva,
  toPresumidoServicosForm,
  toUpsertComPresumidoServicos,
  type PresumidoServicosError,
  type PresumidoServicosForm,
} from '../lib/companyFiscalProfileForm';
import { useAccountingT } from '../lib/useAccountingT';

export interface PresumidoServicosSectionProps {
  unitId: string;
}

const ERRO_LABEL: Record<PresumidoServicosError, string> = {
  ecdIncompleta: 'O perfil do ano tem ECD com campo vazio que o PUT exige — corrija a ECD antes.',
  ecfIncompleta: 'O perfil do ano tem ECF com campo vazio que o PUT exige — corrija a ECF antes.',
  regimeNaoSuportado: 'A prestação exclusiva de serviços só vale no Lucro Presumido ou Real.',
  confirmacaoAusente:
    'Para usar 16% como prestadora exclusiva de serviços no Presumido, confirme que a empresa não exerce profissão regulamentada (Lei 9.250/1995 art. 40 parágrafo único).',
};

/**
 * Prestadora exclusiva de serviços no Presumido/Real do ano (FE-INCR-PERFIL-FISCAL-PRESUMIDO; F-PP-1 b, F-PP-2 b,
 * F-PP-3 a). Mesmo padrão do `MeiEnquadramentoSection`: perfil fiscal da EMPRESA por ano; o PUT devolve o perfil
 * inteiro lido com só os 2 campos trocados. Texto de ajuda = item 11 do BE-INCR-TAX-PRESUMIDO-16.
 */
export function PresumidoServicosSection({ unitId }: PresumidoServicosSectionProps) {
  const { t, tRef } = useAccountingT();
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [anoTexto, setAnoTexto] = useState(() => String(new Date().getFullYear()));
  const [view, setView] = useState<CompanyFiscalProfileView | null>(null);
  const [form, setForm] = useState<PresumidoServicosForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const perfil = await companyFiscalProfileService.get(ano, unitId);
      if (req !== reqRef.current) return;
      setView(perfil);
      setForm(perfil && regimeComPresumidoServicos(perfil.regime) ? toPresumidoServicosForm(perfil) : null);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setLoadError(resolveError(e, tRef.current('fiscalProfile.presumido.error.load', 'Não foi possível carregar o perfil fiscal do ano.')));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [unitId, ano, tRef]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!view || !form) return;
    const built = toUpsertComPresumidoServicos(unitId, view, form);
    if (!built.ok) {
      setSaveError(tRef.current(`fiscalProfile.presumido.error.${built.error}`, ERRO_LABEL[built.error]));
      return;
    }
    setSaving(true);
    setSaveError(null);
    const req = reqRef.current;
    try {
      const saved = await companyFiscalProfileService.put(ano, built.body);
      if (req !== reqRef.current) return;
      setView(saved);
      setForm(toPresumidoServicosForm(saved));
    } catch (e: unknown) {
      if (req === reqRef.current) setSaveError(resolveError(e, tRef.current('fiscalProfile.presumido.error.save', 'Não foi possível salvar o perfil fiscal.')));
    } finally {
      setSaving(false);
    }
  }

  const travada = view?.formaApuracaoTravadaEm ?? null;

  return (
    <section data-testid="presumido-servicos" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5" aria-label={t('fiscalProfile.presumido.title', 'Prestadora exclusiva de serviços (Presumido/Real)')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">{t('fiscalProfile.presumido.title', 'Prestadora exclusiva de serviços (Presumido/Real)')}</h2>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          {t('taxAssessment.ano', 'Ano-calendário')}
          <input
            type="number"
            aria-label={t('fiscalProfile.presumido.ano', 'Ano do perfil fiscal (Presumido/Real)')}
            value={anoTexto}
            min={2000}
            max={2100}
            onChange={(e) => {
              const v = e.target.value;
              setAnoTexto(v);
              const n = Number(v);
              if (/^\d{4}$/.test(v) && n >= 2000 && n <= 2100) setAno(n);
            }}
            className="w-24 rounded-xl border border-neutral-700 bg-neutral-800 px-2 py-1 text-neutral-100"
          />
        </label>
      </div>

      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('fiscalProfile.loading', 'Carregando…')}</div>}
      {loadError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{loadError}</div>}

      {!loading && !loadError && view === null && (
        <p role="status" className="text-sm text-amber-300">
          {t('simples.semPerfilAno', 'Perfil fiscal de {{ano}} não cadastrado: cadastre o perfil fiscal do ano para apurar os tributos.', { ano: String(ano) })}
        </p>
      )}
      {!loading && !loadError && view !== null && !regimeComPresumidoServicos(view.regime) && (
        <p role="status" className="text-sm text-neutral-400">
          {t('fiscalProfile.presumido.naoSuportado', 'O perfil de {{ano}} é {{regime}}: a prestação exclusiva de serviços só vale no Lucro Presumido ou Real.', { ano: String(ano), regime: view.regime })}
        </p>
      )}

      {!loading && !loadError && view && form && (
        <div className="space-y-4">
          {travada && (
            <p role="status" className="text-xs text-amber-300">
              {t('fiscalProfile.presumido.travada', 'Forma de apuração travada desde {{data}}: estes campos não podem mais mudar no ano.', { data: travada.slice(0, 10) })}
            </p>
          )}
          <fieldset className="space-y-3 rounded-2xl border border-neutral-800 p-4" disabled={travada !== null}>
            <label className="flex items-start gap-2 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={form.prestadoraExclusivaServicos}
                onChange={(e) => setForm((f) => (f ? setPrestadoraExclusiva(f, e.target.checked) : f))}
              />
              <span>
                {t('fiscalProfile.presumido.prestadora', 'Prestadora exclusiva de serviços')}
                <span className="block text-xs text-neutral-500">
                  {t('fiscalProfile.presumido.prestadoraAjuda', 'Receita bruta anual até R$ 120 mil, só de serviços: presunção de 16% no IRPJ (IN RFB 1.700/2017 art. 215 § 10).')}
                </span>
              </span>
            </label>
            {form.prestadoraExclusivaServicos && (
              <label className="flex items-start gap-2 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  checked={form.declaraNaoProfissaoRegulamentada}
                  onChange={(e) => setForm((f) => (f ? { ...f, declaraNaoProfissaoRegulamentada: e.target.checked } : f))}
                />
                <span>
                  {t('fiscalProfile.presumido.declara', 'Declaro que a empresa não exerce profissão legalmente regulamentada')}
                  <span className="block text-xs text-neutral-500">
                    {t(
                      'fiscalProfile.presumido.declaraAjuda',
                      'A empresa não é sociedade de profissão legalmente regulamentada nem presta serviço hospitalar ou de transporte (Lei 9.250/1995 art. 40 parágrafo único). O sistema não verifica a profissão: a declaração é responsabilidade da empresa e do contador.',
                    )}
                  </span>
                </span>
              </label>
            )}
          </fieldset>

          {saveError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{saveError}</div>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || travada !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('fiscalProfile.presumido.salvar', 'Salvar prestação de serviços')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
