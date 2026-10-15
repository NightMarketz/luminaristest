import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { companyFiscalProfileService, type CompanyFiscalProfileView } from '../../../lib/services/companyFiscalProfile.service';
import { legalParametersService, type LegalParameter } from '../../../lib/services/legalParameters.service';
import { resolveError } from '../lib/resolveError';
import { toMeiEnquadramentoForm, toUpsertComEnquadramentoMei, type MeiEnquadramentoError, type MeiEnquadramentoForm } from '../lib/companyFiscalProfileForm';
import { useAccountingT } from '../lib/useAccountingT';
import { Field, inputClass } from './SpedGenerationPanel';

export interface MeiEnquadramentoSectionProps {
  unitId: string;
  /** Ano aberto ao chegar pelo atalho da aba Apuração (item 8); sem ele, o ano corrente. */
  anoInicial?: number;
}

/** `valorJson` da linha MEI_ANEXO_XI (server/src/features/legalParameters/models/formatoLinha.ts:78-80). */
interface OcupacaoJson {
  ocupacao: string;
  cnae: string;
}
function ocupacaoDe(l: LegalParameter): OcupacaoJson | null {
  const v = l.valorJson;
  if (!v || typeof v !== 'object') return null;
  const o = v as { ocupacao?: unknown; cnae?: unknown };
  return typeof o.ocupacao === 'string' && typeof o.cnae === 'string' ? { ocupacao: o.ocupacao, cnae: o.cnae } : null;
}

const ERRO_LABEL: Record<MeiEnquadramentoError, string> = {
  ecdIncompleta: 'O perfil do ano tem ECD com campo vazio que o PUT exige — corrija a ECD antes.',
  ecfIncompleta: 'O perfil do ano tem ECF com campo vazio que o PUT exige — corrija a ECF antes.',
  naoMei: 'O enquadramento do Anexo XI é só do MEI.',
};

const fieldset = 'space-y-3 rounded-2xl border border-neutral-800 p-4';

/**
 * Enquadramento do MEI no Anexo XI do ano (FE-INCR-SIMPLES PR-A item 8; F-FS-5 a). Os campos vivem no perfil fiscal
 * da EMPRESA por ano (`/company-fiscal-profile/:ano`), não no da unidade — lacuna 1 de D-2026-10-15-FE-SIMPLES-PR-A-
 * LACUNAS: seção própria na aba Perfil fiscal; o PUT devolve o perfil inteiro lido com só estes 4 campos trocados.
 * Ocupações = chaves da tabela MEI_ANEXO_XI vigentes no ano (a existência/vigência é checada no BE).
 */
export function MeiEnquadramentoSection({ unitId, anoInicial }: MeiEnquadramentoSectionProps) {
  const { t, tRef } = useAccountingT();
  const [ano, setAno] = useState(() => anoInicial ?? new Date().getFullYear());
  const [anoTexto, setAnoTexto] = useState(() => String(anoInicial ?? new Date().getFullYear()));
  const [view, setView] = useState<CompanyFiscalProfileView | null>(null);
  const [form, setForm] = useState<MeiEnquadramentoForm | null>(null);
  const [linhas, setLinhas] = useState<LegalParameter[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const reqRef = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  // Chegou pelo atalho: rola até a seção depois que ela (e o painel acima) carregou — antes disso a posição muda.
  const rolar = useRef(anoInicial !== undefined);

  useEffect(() => {
    if (anoInicial === undefined) return;
    setAno(anoInicial);
    setAnoTexto(String(anoInicial));
    rolar.current = true;
  }, [anoInicial]);

  useEffect(() => {
    if (loading || !rolar.current) return;
    rolar.current = false;
    const id = window.setTimeout(() => sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 300);
    return () => window.clearTimeout(id);
  }, [loading]);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const [perfil, anexo] = await Promise.all([
        companyFiscalProfileService.get(ano, unitId),
        legalParametersService.list({ tabela: 'MEI_ANEXO_XI', status: 'PUBLISHED' }),
      ]);
      if (req !== reqRef.current) return;
      setView(perfil);
      setForm(perfil && perfil.regime === 'MEI' ? toMeiEnquadramentoForm(perfil) : null);
      setLinhas(anexo);
    } catch (e: unknown) {
      if (req !== reqRef.current) return;
      setLoadError(resolveError(e, tRef.current('simples.mei.error.load', 'Não foi possível carregar o perfil fiscal do ano.')));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, [unitId, ano, tRef]);
  useEffect(() => { void load(); }, [load]);

  /** Linhas vigentes em algum dia do ano (vigência é dado da linha, não regra da tela). */
  const vigentes = useMemo(() => {
    const ini = `${ano}-01-01`;
    const fim = `${ano}-12-31`;
    return linhas
      .filter((l) => l.vigenteDesde <= fim && (l.vigenteAte === null || l.vigenteAte >= ini))
      .sort((a, b) => a.chave.localeCompare(b.chave));
  }, [linhas, ano]);
  const visiveis = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return vigentes;
    return vigentes.filter((l) => {
      const o = ocupacaoDe(l);
      return l.chave.toLowerCase().includes(f) || (o !== null && (o.ocupacao.toLowerCase().includes(f) || o.cnae.includes(f)));
    });
  }, [vigentes, filtro]);

  const set = <K extends keyof MeiEnquadramentoForm>(k: K, v: MeiEnquadramentoForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const toggle = (chave: string) =>
    setForm((f) => (f ? { ...f, ocupacoes: f.ocupacoes.includes(chave) ? f.ocupacoes.filter((c) => c !== chave) : [...f.ocupacoes, chave] } : f));

  async function save() {
    if (!view || !form) return;
    const built = toUpsertComEnquadramentoMei(unitId, view, form);
    if (!built.ok) {
      setSaveError(tRef.current(`simples.mei.error.${built.error}`, ERRO_LABEL[built.error]));
      return;
    }
    setSaving(true);
    setSaveError(null);
    const req = reqRef.current;
    try {
      const saved = await companyFiscalProfileService.put(ano, built.body);
      if (req !== reqRef.current) return;
      setView(saved);
      setForm(toMeiEnquadramentoForm(saved));
    } catch (e: unknown) {
      if (req === reqRef.current) setSaveError(resolveError(e, tRef.current('simples.mei.error.save', 'Não foi possível salvar o enquadramento.')));
    } finally {
      setSaving(false);
    }
  }

  const triSelect = (key: 'contribuinteIcms' | 'contribuinteIss' | 'transportadorCargas', label: string) => (
    <Field label={label}>
      <select
        aria-label={label}
        value={form ? form[key] : ''}
        // ponytail: folha string → união (cada <option> é membro da união)
        onChange={(e) => set(key, e.target.value as MeiEnquadramentoForm['contribuinteIcms'])}
        className={`w-full ${inputClass}`}
      >
        <option value="">{t('simples.mei.naoDeclarado', '— não declarado —')}</option>
        <option value="true">{t('simples.sim', 'Sim')}</option>
        <option value="false">{t('simples.nao', 'Não')}</option>
      </select>
    </Field>
  );

  return (
    <section ref={sectionRef} id="mei-enquadramento" data-testid="mei-enquadramento" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5" aria-label={t('simples.mei.title', 'Enquadramento do MEI (Anexo XI)')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">{t('simples.mei.title', 'Enquadramento do MEI (Anexo XI)')}</h2>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          {t('taxAssessment.ano', 'Ano-calendário')}
          <input
            type="number"
            aria-label={t('simples.mei.ano', 'Ano do perfil fiscal')}
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
      <p className="mb-4 text-xs text-neutral-500">
        {t('simples.mei.subtitle', 'Perfil fiscal da empresa no ano: o SIMEI só calcula com o enquadramento ICMS/ISS declarado (Res. CGSN 140 art. 101 § 1º). Salvar regrava o perfil do ano com estes campos trocados.')}
      </p>

      {loading && <div className="py-6 text-center text-sm text-neutral-500">{t('fiscalProfile.loading', 'Carregando…')}</div>}
      {loadError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">{loadError}</div>}

      {!loading && !loadError && view === null && (
        <p role="status" className="text-sm text-amber-300">
          {t('simples.semPerfilAno', 'Perfil fiscal de {{ano}} não cadastrado: cadastre o perfil fiscal do ano para apurar os tributos.', { ano: String(ano) })}
        </p>
      )}
      {!loading && !loadError && view !== null && view.regime !== 'MEI' && (
        <p role="status" className="text-sm text-neutral-400">
          {t('simples.mei.naoMeiAno', 'O perfil de {{ano}} é {{regime}}: o enquadramento do Anexo XI é só do MEI.', { ano: String(ano), regime: view.regime })}
        </p>
      )}

      {!loading && !loadError && form && (
        <div className="space-y-4">
          <fieldset className={fieldset}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {triSelect('contribuinteIcms', t('simples.mei.contribuinteIcms', 'Contribuinte de ICMS'))}
              {triSelect('contribuinteIss', t('simples.mei.contribuinteIss', 'Contribuinte de ISS'))}
              {triSelect('transportadorCargas', t('simples.mei.transportador', 'Transportador autônomo de cargas'))}
            </div>
          </fieldset>

          <fieldset className={fieldset}>
            <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {t('simples.mei.ocupacoes', 'Ocupações (Anexo XI)')} · {form.ocupacoes.length}
            </legend>
            {form.ocupacoes.length > 0 && (
              <div className="flex flex-wrap gap-1" data-testid="ocupacoes-escolhidas">
                {form.ocupacoes.map((c) => (
                  <button key={c} type="button" onClick={() => toggle(c)} className="rounded-lg bg-emerald-600/15 px-2 py-0.5 font-mono text-xs text-emerald-300 hover:bg-emerald-600/25">
                    {c} ×
                  </button>
                ))}
              </div>
            )}
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={t('simples.mei.filtro', 'Filtrar por ocupação, CNAE ou chave')}
              aria-label={t('simples.mei.filtro', 'Filtrar por ocupação, CNAE ou chave')}
              className={`w-full ${inputClass}`}
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-neutral-300">
              {visiveis.map((l) => {
                const o = ocupacaoDe(l);
                return (
                  <li key={l.id}>
                    <label className="inline-flex items-start gap-2">
                      <input type="checkbox" checked={form.ocupacoes.includes(l.chave)} onChange={() => toggle(l.chave)} />
                      <span>
                        <span className="font-mono">{l.chave}</span> · <span>{o?.ocupacao ?? '—'}</span> <span className="font-mono text-neutral-500">{o?.cnae}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
              {visiveis.length === 0 && <li className="text-neutral-500">{t('simples.mei.semOcupacoes', 'Nenhuma ocupação vigente no ano com esse filtro.')}</li>}
            </ul>
          </fieldset>

          {saveError && <div role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{saveError}</div>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? t('fiscalProfile.saving', 'Salvando…') : t('simples.mei.salvar', 'Salvar enquadramento')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
