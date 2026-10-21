import type { CompanyFiscalProfileView, UpsertCompanyFiscalProfileInput } from '../../../lib/services/companyFiscalProfile.service';
import { nonEmpty } from '../../../lib/utils/nonEmpty';

/**
 * Enquadramento do MEI no Anexo XI (FE-INCR-SIMPLES PR-A item 8; F-FS-5 a) — os 4 campos que o SIMEI lê do perfil
 * fiscal do ano (`CompanyFiscalProfileDto.ts:117-125`). O PUT do perfil é substituição total, então o corpo é o perfil
 * lido (GET) com só estes 4 campos trocados (decisão D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS, lacuna 1).
 */
export interface MeiEnquadramentoForm {
  /** '' = não declarado (null no BE). */
  contribuinteIcms: '' | 'true' | 'false';
  contribuinteIss: '' | 'true' | 'false';
  transportadorCargas: '' | 'true' | 'false';
  ocupacoes: string[];
}

export type MeiEnquadramentoError = 'ecdIncompleta' | 'ecfIncompleta' | 'naoMei';

const triEstado = (b: boolean | null): MeiEnquadramentoForm['contribuinteIcms'] => (b === null ? '' : b ? 'true' : 'false');
const deTriEstado = (s: MeiEnquadramentoForm['contribuinteIcms']): boolean | null => (s === '' ? null : s === 'true');

export function toMeiEnquadramentoForm(v: CompanyFiscalProfileView): MeiEnquadramentoForm {
  return {
    contribuinteIcms: triEstado(v.meiContribuinteIcms),
    contribuinteIss: triEstado(v.meiContribuinteIss),
    transportadorCargas: triEstado(v.meiTransportadorCargas),
    ocupacoes: v.meiOcupacoes ?? [],
  };
}

function toEcd(e: CompanyFiscalProfileView['ecd']): UpsertCompanyFiscalProfileInput['ecd'] | undefined {
  if (e === null) return null;
  if (e.numOrd === null || e.natLivr === null) return undefined;
  return e.nire === null ? { indNire: e.indNire, numOrd: e.numOrd, natLivr: e.natLivr } : { indNire: e.indNire, nire: e.nire, numOrd: e.numOrd, natLivr: e.natLivr };
}

function toEcf(e: CompanyFiscalProfileView['ecf']): UpsertCompanyFiscalProfileInput['ecf'] | undefined {
  if (e === null) return null;
  if (e.indAliqCsll === null || e.indRecReceita === null) return undefined;
  return { indAliqCsll: e.indAliqCsll, indRecReceita: e.indRecReceita };
}

/**
 * O perfil lido, remontado como corpo do PUT. Recusa (sem enviar) o que o GET não deixa remontar sem perda:
 * ECD/ECF gravados com campo nulo que o PUT exige.
 */
function corpoDoPerfil(
  unitId: string,
  v: CompanyFiscalProfileView,
): { ok: true; body: UpsertCompanyFiscalProfileInput } | { ok: false; error: 'ecdIncompleta' | 'ecfIncompleta' } {
  const ecd = toEcd(v.ecd);
  if (ecd === undefined) return { ok: false, error: 'ecdIncompleta' };
  const ecf = toEcf(v.ecf);
  if (ecf === undefined) return { ok: false, error: 'ecfIncompleta' };
  const body: UpsertCompanyFiscalProfileInput = {
    unitId,
    regime: v.regime,
    grandePorte: v.grandePorte,
    inativa: v.inativa,
    condicoes: {
      aporteInvestidorAnjo: v.condicoes.aporteInvestidorAnjo,
      livroCaixaSemEscrituracao: v.condicoes.livroCaixaSemEscrituracao,
      distribuicaoAcimaBase: v.condicoes.distribuicaoAcimaBase,
    },
    declarante: v.declarante,
    ecd,
    ecf,
    contadorContactId: v.contadorContactId,
    representanteLegalSignerId: v.representanteLegalSignerId,
    formaApuracaoIrpjCsll: v.formaApuracaoIrpjCsll,
    lucroRealObrigatorio: v.lucroRealObrigatorio,
    inicioAtividadeEm: v.inicioAtividadeEm,
    encerramentoAtividadeEm: v.encerramentoAtividadeEm,
    lc224AcrescimoSuspenso: v.lc224AcrescimoSuspenso,
    lc224LiminarReferencia: v.lc224LiminarReferencia,
    prestadoraExclusivaServicos: v.prestadoraExclusivaServicos,
    declaraNaoProfissaoRegulamentada: v.declaraNaoProfissaoRegulamentada,
    ibsCbsOpcaoS1: v.ibsCbsOpcaoS1,
    ibsCbsOpcaoS2: v.ibsCbsOpcaoS2,
    meiContribuinteIcms: v.meiContribuinteIcms,
    meiContribuinteIss: v.meiContribuinteIss,
    meiTransportadorCargas: v.meiTransportadorCargas,
    meiOcupacoes: nonEmpty(v.meiOcupacoes ?? []),
    simplesRegimeApuracao: v.simplesRegimeApuracao,
  };
  return { ok: true, body };
}

/** O perfil inteiro de volta, com o enquadramento novo. */
export function toUpsertComEnquadramentoMei(
  unitId: string,
  v: CompanyFiscalProfileView,
  f: MeiEnquadramentoForm,
): { ok: true; body: UpsertCompanyFiscalProfileInput } | { ok: false; error: MeiEnquadramentoError } {
  if (v.regime !== 'MEI') return { ok: false, error: 'naoMei' };
  const base = corpoDoPerfil(unitId, v);
  if (!base.ok) return base;
  return {
    ok: true,
    body: {
      ...base.body,
      meiContribuinteIcms: deTriEstado(f.contribuinteIcms),
      meiContribuinteIss: deTriEstado(f.contribuinteIss),
      meiTransportadorCargas: deTriEstado(f.transportadorCargas),
      meiOcupacoes: nonEmpty(f.ocupacoes),
    },
  };
}

/**
 * Prestador exclusivo de serviços no Presumido/Real (FE-INCR-PERFIL-FISCAL-PRESUMIDO; F-PP-1 b) — os 2 booleans do
 * perfil fiscal do ano (`CompanyFiscalProfileDto.ts:111-112`). Mesmo padrão do MEI: o PUT é o perfil lido com só
 * estes 2 campos trocados.
 */
export interface PresumidoServicosForm {
  prestadoraExclusivaServicos: boolean;
  declaraNaoProfissaoRegulamentada: boolean;
}

export type PresumidoServicosError = 'ecdIncompleta' | 'ecfIncompleta' | 'regimeNaoSuportado' | 'confirmacaoAusente';

export const regimeComPresumidoServicos = (r: CompanyFiscalProfileView['regime']): boolean => r === 'PRESUMIDO' || r === 'REAL';

export function toPresumidoServicosForm(v: CompanyFiscalProfileView): PresumidoServicosForm {
  return { prestadoraExclusivaServicos: v.prestadoraExclusivaServicos, declaraNaoProfissaoRegulamentada: v.declaraNaoProfissaoRegulamentada };
}

/** F-PP-3 (a): desligar a flag zera a confirmação junto. */
export function setPrestadoraExclusiva(f: PresumidoServicosForm, on: boolean): PresumidoServicosForm {
  return on ? { ...f, prestadoraExclusivaServicos: true } : { prestadoraExclusivaServicos: false, declaraNaoProfissaoRegulamentada: false };
}

/**
 * O perfil inteiro de volta, com os 2 campos novos. Espelha o refine do DTO (`CompanyFiscalProfileDto.ts:190-196`):
 * PRESUMIDO + flag sem a confirmação da Lei 9.250/1995 art. 40 p.ú. não envia. No REAL o BE não exige (F-PP-1 b).
 */
export function toUpsertComPresumidoServicos(
  unitId: string,
  v: CompanyFiscalProfileView,
  f: PresumidoServicosForm,
): { ok: true; body: UpsertCompanyFiscalProfileInput } | { ok: false; error: PresumidoServicosError } {
  if (!regimeComPresumidoServicos(v.regime)) return { ok: false, error: 'regimeNaoSuportado' };
  if (v.regime === 'PRESUMIDO' && f.prestadoraExclusivaServicos && !f.declaraNaoProfissaoRegulamentada) {
    return { ok: false, error: 'confirmacaoAusente' };
  }
  const base = corpoDoPerfil(unitId, v);
  if (!base.ok) return base;
  return {
    ok: true,
    body: {
      ...base.body,
      prestadoraExclusivaServicos: f.prestadoraExclusivaServicos,
      declaraNaoProfissaoRegulamentada: f.prestadoraExclusivaServicos && f.declaraNaoProfissaoRegulamentada,
    },
  };
}
