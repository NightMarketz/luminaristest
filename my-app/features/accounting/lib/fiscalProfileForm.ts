import type {
  FiscalProfileView,
  ServiceFiscalProfileView,
  UpsertFiscalProfileInput,
  UpsertServiceFiscalProfileInput,
} from '../../../lib/services/fiscalProfile.service';

/**
 * Formulários do perfil fiscal (FE-INCR-DFE PR-0, itens 3–5 e 7). Tudo aqui é função pura: o painel só liga estado a
 * isto. Regras que valem a pena saber:
 *  - O `PUT /fiscal-profile` é **substituição total com defaults do Zod** (BRIEF F9): campo omitido volta ao default.
 *    Por isso o formulário é hidratado do GET e o mapper manda **todo** campo — inclusive os que a tela não edita
 *    (`carried`) — e não há spread de rascunho (regra do mapper, `my-app/CLAUDE.md` §7).
 *  - Percentual em inteiro, sem float: `"2,00"` → `200` (issAliquotaBp / pTotTrib*Cent são centésimos de ponto percentual).
 */

type Regime = UpsertFiscalProfileInput['regimeTributario'];
type PisCofinsRegime = UpsertFiscalProfileInput['pisCofinsRegime'];
type ForaDoMes = NonNullable<UpsertFiscalProfileInput['emissaoForaDoMes']>;
type FatoGerador = NonNullable<UpsertFiscalProfileInput['pacoteFatoGerador']>;

// ─────────────────────────────────────────────────────────────── percentual ↔ centésimos

/**
 * `"2,00"`/`"2.5"`/`"15"` → centésimos; vazio → `null`; formato inválido → `undefined`. Só inteiro, nunca `Number("2.55")*100`.
 * Não reusa `percentToBp` (`fixedAssets.service.ts:124`): o BRIEF item 4 manda inteiro sem float, e aquele arredonda
 * `"2,555"` em silêncio e aceita `1e3`/`0x10` (aqui: 3ª casa e notação científica são `undefined`, não dado gravado).
 */
export function parsePctHundredths(s: string): number | null | undefined {
  const raw = s.trim();
  if (raw === '') return null;
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(raw);
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Caminho inverso: `1550` → `"15,50"`; `null` → `""`. */
export function formatPctHundredths(n: number | null): string {
  if (n == null) return '';
  return `${Math.floor(n / 100)},${String(n % 100).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────── perfil da unidade

export interface FiscalProfileForm {
  /** `''` = ainda não escolhido (perfil novo). */
  regimeTributario: Regime | '';
  icmsContribuinte: boolean;
  pisCofinsRegime: PisCofinsRegime | '';
  pisCofinsCreditExcludesIcms: boolean;
  pisCofinsCreditFromSimplesSupplier: boolean;
  icmsRecuperavelAccountId: string;
  pisCofinsRecuperavelAccountId: string;
  codMun: string;
  inscricaoMunicipal: string;
  cnae: string;
  regEspTrib: string;
  regApTribSN: string;
  dpsSerie: string;
  /** em %, vírgula: `"2,00"`. */
  issAliquota: string;
  issRetidoTomadorPj: boolean;
  pTotTribSN: string;
  pTotTribFed: string;
  pTotTribEst: string;
  pTotTribMun: string;
  /** `null` = nunca escolhido: o BE decide o default por regime (SIMPLES ⇒ false). */
  ibsCbsInformar: boolean | null;
  ibsCbsCst: string;
  ibsCbsClassTrib: string;
  emissaoForaDoMes: ForaDoMes;
  pacoteFatoGerador: FatoGerador;
  partnerAccountRef: string;
  /** Campos do DTO que o BRIEF não põe na tela (lacuna L2): vão e voltam intactos, senão o PUT total os zeraria. */
  carried: {
    insumoExpenseAccountId: string | null;
    irpjDespesaAccountId: string | null;
    csllDespesaAccountId: string | null;
    irpjRecolherAccountId: string | null;
    csllRecolherAccountId: string | null;
    pacoteCTribNac: string | null;
    pacoteCNBS: string | null;
  };
}

const text = (v: string | null): string => v ?? '';

/** Formulário em branco (GET `null`) ou hidratado da view devolvida pelo GET/PUT. */
export function toFiscalProfileForm(v: FiscalProfileView | null): FiscalProfileForm {
  if (!v) {
    return {
      regimeTributario: '', icmsContribuinte: false, pisCofinsRegime: '',
      pisCofinsCreditExcludesIcms: true, pisCofinsCreditFromSimplesSupplier: false, // defaults do DTO
      icmsRecuperavelAccountId: '', pisCofinsRecuperavelAccountId: '',
      codMun: '', inscricaoMunicipal: '', cnae: '', regEspTrib: '0', regApTribSN: '', dpsSerie: '1',
      issAliquota: '', issRetidoTomadorPj: false,
      pTotTribSN: '', pTotTribFed: '', pTotTribEst: '', pTotTribMun: '',
      ibsCbsInformar: null, ibsCbsCst: '', ibsCbsClassTrib: '',
      emissaoForaDoMes: 'AVISAR', pacoteFatoGerador: 'CONSUMO', partnerAccountRef: '',
      carried: {
        insumoExpenseAccountId: null, irpjDespesaAccountId: null, csllDespesaAccountId: null,
        irpjRecolherAccountId: null, csllRecolherAccountId: null, pacoteCTribNac: null, pacoteCNBS: null,
      },
    };
  }
  return {
    regimeTributario: v.regimeTributario,
    icmsContribuinte: v.icmsContribuinte,
    pisCofinsRegime: v.pisCofinsRegime,
    pisCofinsCreditExcludesIcms: v.pisCofinsCreditExcludesIcms,
    pisCofinsCreditFromSimplesSupplier: v.pisCofinsCreditFromSimplesSupplier,
    icmsRecuperavelAccountId: text(v.icmsRecuperavelAccountId),
    pisCofinsRecuperavelAccountId: text(v.pisCofinsRecuperavelAccountId),
    codMun: text(v.codMun),
    inscricaoMunicipal: text(v.inscricaoMunicipal),
    cnae: text(v.cnae),
    regEspTrib: String(v.regEspTrib),
    regApTribSN: v.regApTribSN == null ? '' : String(v.regApTribSN),
    dpsSerie: String(v.dpsSerie),
    issAliquota: formatPctHundredths(v.issAliquotaBp),
    issRetidoTomadorPj: v.issRetidoTomadorPj,
    pTotTribSN: formatPctHundredths(v.pTotTribSNCent),
    pTotTribFed: formatPctHundredths(v.pTotTribFedCent),
    pTotTribEst: formatPctHundredths(v.pTotTribEstCent),
    pTotTribMun: formatPctHundredths(v.pTotTribMunCent),
    ibsCbsInformar: v.ibsCbsInformar,
    ibsCbsCst: text(v.ibsCbsCst),
    ibsCbsClassTrib: text(v.ibsCbsClassTrib),
    emissaoForaDoMes: v.emissaoForaDoMes,
    pacoteFatoGerador: v.pacoteFatoGerador,
    partnerAccountRef: text(v.partnerAccountRef),
    carried: {
      insumoExpenseAccountId: v.insumoExpenseAccountId,
      irpjDespesaAccountId: v.irpjDespesaAccountId,
      csllDespesaAccountId: v.csllDespesaAccountId,
      irpjRecolherAccountId: v.irpjRecolherAccountId,
      csllRecolherAccountId: v.csllRecolherAccountId,
      pacoteCTribNac: v.pacoteCTribNac,
      pacoteCNBS: v.pacoteCNBS,
    },
  };
}

/** Texto digitado → `null` quando vazio (limpa o campo no PUT total). */
const nullable = (s: string): string | null => (s.trim() === '' ? null : s.trim());

/** Sufixos de `fiscalProfile.error.*`. */
export type FiscalProfileFormError = 'regimeRequired' | 'pisCofinsRegimeRequired' | 'dpsSerieInvalid' | 'pctInvalid';

export type FiscalProfileBuild = { ok: true; body: UpsertFiscalProfileInput } | { ok: false; error: FiscalProfileFormError };

/**
 * Formulário → corpo COMPLETO do PUT. `error` é o sufixo de `fiscalProfile.error.*`. Só barra o que impede montar o
 * corpo (regime não escolhido, número/percentual ilegível); o resto é do Zod do BE e volta como 400 humanizado.
 * Espelho do `superRefine` (BRIEF F10/§3): SIMPLES ⇒ `icmsContribuinte=false` e `pisCofinsRegime=SIMPLES`;
 * `regApTribSN`/`pTotTribSNCent` só SIMPLES; `pTotTrib{Fed,Est,Mun}Cent` só regime normal; IPI fora da base do crédito.
 */
export function toUpsertFiscalProfile(unitId: string, f: FiscalProfileForm): FiscalProfileBuild {
  if (f.regimeTributario === '') return { ok: false, error: 'regimeRequired' };
  const simples = f.regimeTributario === 'SIMPLES';
  if (!simples && f.pisCofinsRegime === '') return { ok: false, error: 'pisCofinsRegimeRequired' };
  const pisCofinsRegime: PisCofinsRegime = simples || f.pisCofinsRegime === '' ? 'SIMPLES' : f.pisCofinsRegime;

  if (!/^\d{1,5}$/.test(f.dpsSerie.trim())) return { ok: false, error: 'dpsSerieInvalid' };
  const iss = parsePctHundredths(f.issAliquota);
  const sn = parsePctHundredths(f.pTotTribSN);
  const fed = parsePctHundredths(f.pTotTribFed);
  const est = parsePctHundredths(f.pTotTribEst);
  const mun = parsePctHundredths(f.pTotTribMun);
  if (iss === undefined || sn === undefined || fed === undefined || est === undefined || mun === undefined) {
    return { ok: false, error: 'pctInvalid' };
  }

  const body: UpsertFiscalProfileInput = {
    unitId,
    regimeTributario: f.regimeTributario,
    icmsContribuinte: simples ? false : f.icmsContribuinte,
    pisCofinsRegime,
    pisCofinsCreditExcludesIcms: f.pisCofinsCreditExcludesIcms,
    pisCofinsCreditIncludesIpi: false,
    pisCofinsCreditFromSimplesSupplier: f.pisCofinsCreditFromSimplesSupplier,
    icmsRecuperavelAccountId: nullable(f.icmsRecuperavelAccountId),
    pisCofinsRecuperavelAccountId: nullable(f.pisCofinsRecuperavelAccountId),
    insumoExpenseAccountId: f.carried.insumoExpenseAccountId,
    irpjDespesaAccountId: f.carried.irpjDespesaAccountId,
    csllDespesaAccountId: f.carried.csllDespesaAccountId,
    irpjRecolherAccountId: f.carried.irpjRecolherAccountId,
    csllRecolherAccountId: f.carried.csllRecolherAccountId,
    partnerAccountRef: nullable(f.partnerAccountRef),
    codMun: nullable(f.codMun),
    inscricaoMunicipal: nullable(f.inscricaoMunicipal),
    cnae: nullable(f.cnae),
    dpsSerie: Number(f.dpsSerie),
    regEspTrib: Number(f.regEspTrib),
    regApTribSN: simples && f.regApTribSN !== '' ? Number(f.regApTribSN) : null,
    issAliquotaBp: iss,
    issRetidoTomadorPj: f.issRetidoTomadorPj,
    pacoteFatoGerador: f.pacoteFatoGerador,
    pacoteCTribNac: f.carried.pacoteCTribNac,
    pacoteCNBS: f.carried.pacoteCNBS,
    ibsCbsInformar: f.ibsCbsInformar ?? undefined,
    ibsCbsCst: nullable(f.ibsCbsCst),
    ibsCbsClassTrib: nullable(f.ibsCbsClassTrib),
    pTotTribFedCent: simples ? null : fed,
    pTotTribEstCent: simples ? null : est,
    pTotTribMunCent: simples ? null : mun,
    pTotTribSNCent: simples ? sn : null,
    emissaoForaDoMes: f.emissaoForaDoMes,
  };
  return { ok: true, body };
}

// ─────────────────────────────────────────────────────────────── perfil do serviço

export interface ServiceProfileForm {
  cTribNac: string;
  cTribMun: string;
  cNBS: string;
  /** vazio ⇒ omitido ⇒ default do salão no BE. */
  cIndOp: string;
  cLocPrestacao: string;
  xDescServ: string;
}

export const emptyServiceProfileForm = (): ServiceProfileForm => ({
  cTribNac: '', cTribMun: '', cNBS: '', cIndOp: '', cLocPrestacao: '', xDescServ: '',
});

export const toServiceProfileForm = (v: ServiceFiscalProfileView): ServiceProfileForm => ({
  cTribNac: v.cTribNac,
  cTribMun: text(v.cTribMun),
  cNBS: text(v.cNBS),
  cIndOp: v.cIndOp,
  cLocPrestacao: text(v.cLocPrestacao),
  xDescServ: text(v.xDescServ),
});

/** `"01.07.01"` colado do portal → `"010701"` (G5: o portal exibe com pontos; o BE quer 6 dígitos). */
export const normalizeCTribNac = (s: string): string => s.replace(/\D/g, '');

export function toUpsertServiceFiscalProfile(unitId: string, f: ServiceProfileForm): UpsertServiceFiscalProfileInput {
  return {
    unitId,
    cTribNac: normalizeCTribNac(f.cTribNac),
    cTribMun: nullable(f.cTribMun),
    cNBS: nullable(f.cNBS),
    cIndOp: nullable(f.cIndOp) ?? undefined,
    cLocPrestacao: nullable(f.cLocPrestacao),
    xDescServ: nullable(f.xDescServ),
  };
}
