import type {
  DirigenteEcfInput,
  RepresentanteLegalInput,
  SocioEcfInput,
  Y600ValoresInput,
  Y600VigenciaViewInput,
} from '@/types/contracts/accounting/SpedEcfDto.gen';
import { parseBrl } from './parseBrl';
import { percentToBp } from '../../../lib/services/fixedAssets.service';

/**
 * FE-INCR-ECF-Y600 PR-1 (BRIEF itens 5 e 14) — o rascunho do Y600 na tela e a conversão para o payload da ECF.
 *
 * A tela NÃO decide regra fiscal: espelha o que o DTO e o `montarY600` do servidor já recusam (BRIEF §1, R1–R8), para o
 * erro aparecer antes do POST. O servidor continua a autoridade. Fonte de cada regra: Manual de Orientação do Leiaute 12
 * da ECF (maio/2026), pp. 570–574 — o [D01] de `pesquisas-legais/ecf-y600/relatorio.md`.
 * O complemento não persiste (F-FE-Y600-6 → a, D4): vive só no estado da tela, como o declarante e os signatários.
 */

export type Y600Vigencia = Y600VigenciaViewInput;

/** Os 5 valores do Y600 (campos 13–17, p. 573) como o usuário digita, em R$. */
export interface ValoresDraft {
  remTrab: string;
  lucDiv: string;
  jurCap: string;
  demRend: string;
  irRet: string;
}
/** Representante legal (campos 11–12, p. 573); '' nos dois = ausente. */
export interface RepresentanteDraft {
  cpf: string;
  qualif: string;
}
export interface SocioDraft {
  qualif: string;
  pais: string;
  percVot: string;
  rep: RepresentanteDraft;
  valores: ValoresDraft;
}
export interface DirigenteDraft {
  nome: string;
  cpf: string;
  qualif: string;
  dtAltSoc: string;
  dtFimSoc: string;
  rep: RepresentanteDraft;
  valores: ValoresDraft;
}
export interface Y600Draft {
  /** Complemento por `partnerId` da vigência (id da linha `Partner`). */
  socios: Record<string, SocioDraft>;
  dirigentes: DirigenteDraft[];
}

/** R2 (F-Y600-3): os valores começam VAZIOS — nunca '0'; zero tem de ser digitado. */
export const emptyValores = (): ValoresDraft => ({ remTrab: '', lucDiv: '', jurCap: '', demRend: '', irRet: '' });
export const emptyRepresentante = (): RepresentanteDraft => ({ cpf: '', qualif: '' });
export const emptySocio = (): SocioDraft => ({ qualif: '', pais: '', percVot: '', rep: emptyRepresentante(), valores: emptyValores() });
export const emptyDirigente = (): DirigenteDraft => ({
  nome: '', cpf: '', qualif: '', dtAltSoc: '', dtFimSoc: '', rep: emptyRepresentante(), valores: emptyValores(),
});
export const emptyY600Draft = (): Y600Draft => ({ socios: {}, dirigentes: [] });

export const VALOR_KEYS = ['remTrab', 'lucDiv', 'jurCap', 'demRend', 'irRet'] as const;

/**
 * R3 — REGRA_Y600_QUALIF (Erro, p. 574), cópia de `QUALIF_POR_CASO` em `server/.../y600FromPartners.ts` (F-FE-Y600-4 → a).
 * Se a tabela mudar no Manual, as duas mudam. O 18 da descrição (p. 572) nunca aparece (F-Y600-9).
 */
const QUALIF_POR_CASO = {
  BR_PF: ['01', '02', '09', '10', '11', '12', '13', '14', '15', '16', '17'],
  BR_PJ: ['03', '04'],
  EX_PF: ['05', '06', '14'],
  EX_PJ: ['07', '08'],
} as const;

/** R6 — QUALIF do dirigente (DirigenteEcfSchema): 10..17. */
export const QUALIF_DIRIGENTE = ['10', '11', '12', '13', '14', '15', '16', '17'] as const;

export function qualifOptions(tipo: 'PF' | 'PJ', residente: boolean): readonly string[] {
  return QUALIF_POR_CASO[`${residente ? 'BR' : 'EX'}_${tipo}`];
}

/** R5 — QUALIF_REP_LEG (p. 573): representado PF {01..06}; PJ só {01,06} (`QUALIF_REP_LEG_PJ` do servidor). */
export function qualifRepLegOptions(tipo: 'PF' | 'PJ'): readonly string[] {
  return tipo === 'PJ' ? ['01', '06'] : ['01', '02', '03', '04', '05', '06'];
}

/** Mesmo algoritmo de `server/src/lib/cpf.ts` (módulo 11 da RFB; repetidos recusados). Recebe só dígitos. */
function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(value[i]) * (len + 1 - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return dv(9) === Number(value[9]) && dv(10) === Number(value[10]);
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/** Dinheiro como o `parseBrl` aceita: dígitos com `.`/`,`, sem sinal; nada além disso (o `parseBrl` devolve 0 para lixo). */
const MONEY_RE = /^\d[\d.,]*$/;
const MAX_CENTS = 2_147_483_647; // `y600Cents` do servidor (models/money.ts)

function valoresError(v: ValoresDraft): string | null {
  for (const k of VALOR_KEYS) {
    const raw = v[k].trim();
    if (raw === '') return 'y600.valorObrigatorio';
    if (!MONEY_RE.test(raw) || /[.,]$/.test(raw) || parseBrl(raw) > MAX_CENTS) return 'y600.valorInvalido';
  }
  return null;
}

function repError(r: RepresentanteDraft, tipo: 'PF' | 'PJ'): string | null {
  const cpf = r.cpf.trim();
  const qualif = r.qualif.trim();
  if (!cpf && !qualif) return null;
  if (!cpf || !qualif) return 'y600.representanteIncompleto';
  if (!isValidCpf(onlyDigits(cpf))) return 'y600.cpfInvalido';
  if (!qualifRepLegOptions(tipo).includes(qualif)) return 'y600.qualifIncoerente';
  return null;
}

/**
 * Primeiro erro do rascunho como chave i18n sob `sped.*` (ex.: `y600.valorObrigatorio`), ou `null`. Cobre R1–R8.
 * R1 sai pela construção: a validação e o payload percorrem a lista de vigências da rota (a mesma seleção do gerador),
 * nunca as chaves do rascunho. Nome e data de início do dirigente ficam com o 400 do servidor (sem código próprio).
 */
export function validateY600Draft(vigencias: readonly Y600Vigencia[], draft: Y600Draft, year: number): string | null {
  // R7 — ao menos uma ocorrência (p. 56; `ECF_Y600_SEM_SOCIOS`).
  if (vigencias.length === 0 && draft.dirigentes.length === 0) return 'y600.semOcorrencia';

  for (const v of vigencias) {
    const s = draft.socios[v.partnerId] ?? emptySocio();
    // R3
    if (!s.qualif.trim()) return 'y600.qualifObrigatoria';
    if (!qualifOptions(v.tipoPessoa, v.residenteBrasil).includes(s.qualif.trim())) return 'y600.qualifIncoerente';
    // R4 — `pais` só do não residente, 3 dígitos e ≠ 105 (pp. 571, 574).
    if (!v.residenteBrasil) {
      const pais = s.pais.trim();
      if (!pais) return 'y600.paisObrigatorio';
      if (!/^\d{3}$/.test(pais) || pais === '105') return 'y600.paisInvalido';
    }
    // R8 — voto opcional; vazio = participação do cadastro.
    if (s.percVot.trim()) {
      const bp = percentToBp(s.percVot);
      if (!Number.isInteger(bp) || bp < 0 || bp > 10000) return 'y600.percVotInvalido';
    }
    const rep = repError(s.rep, v.tipoPessoa); // R5
    if (rep) return rep;
    const val = valoresError(s.valores); // R2
    if (val) return val;
  }

  for (const d of draft.dirigentes) {
    // R6 — CPF com DV; qualif 10..17; dtFimSoc ≥ dtAltSoc e dentro do ano (REGRA_DATA_FIM_SOC, p. 574).
    if (!isValidCpf(onlyDigits(d.cpf))) return 'y600.cpfInvalido';
    if (!d.qualif.trim()) return 'y600.qualifObrigatoria';
    if (!(QUALIF_DIRIGENTE as readonly string[]).includes(d.qualif.trim())) return 'y600.qualifIncoerente';
    const fim = d.dtFimSoc.trim();
    if (fim) {
      if (d.dtAltSoc.trim() && fim < d.dtAltSoc.trim()) return 'y600.dtFimAntesDoInicio';
      if (fim < `${year}-01-01` || fim > `${year}-12-31`) return 'y600.dtFimForaDoAno';
    }
    const rep = repError(d.rep, 'PF');
    if (rep) return rep;
    const val = valoresError(d.valores);
    if (val) return val;
  }
  return null;
}

function toValores(v: ValoresDraft): Y600ValoresInput {
  return {
    remTrabCents: parseBrl(v.remTrab),
    lucDivCents: parseBrl(v.lucDiv),
    jurCapCents: parseBrl(v.jurCap),
    demRendCents: parseBrl(v.demRend),
    irRetCents: parseBrl(v.irRet),
  };
}

/** Representante só com os dois campos (o `validateY600Draft` já barrou o incompleto). */
function toRepresentante(r: RepresentanteDraft): RepresentanteLegalInput | undefined {
  const cpf = onlyDigits(r.cpf);
  const qualif = r.qualif.trim();
  if (!cpf || !qualif) return undefined;
  // ponytail: folha string → união; o <select> só oferece qualifRepLegOptions e o servidor valida o enum.
  return { cpf, qualif: qualif as RepresentanteLegalInput['qualif'] };
}

function toSocio(v: Y600Vigencia, s: SocioDraft): SocioEcfInput {
  // ponytail: folha string → união; o <select> só oferece qualifOptions do caso e o servidor valida o enum.
  const out: SocioEcfInput = { partnerId: v.partnerId, qualif: s.qualif.trim() as SocioEcfInput['qualif'], valores: toValores(s.valores) };
  if (!v.residenteBrasil) out.pais = s.pais.trim();
  if (s.percVot.trim()) out.percCapVotBp = percentToBp(s.percVot);
  const rep = toRepresentante(s.rep);
  if (rep) out.representanteLegal = rep;
  return out;
}

function toDirigente(d: DirigenteDraft): DirigenteEcfInput {
  const out: DirigenteEcfInput = {
    nome: d.nome.trim(),
    cpf: onlyDigits(d.cpf),
    // ponytail: folha string → união; o <select> só oferece QUALIF_DIRIGENTE e o servidor valida o enum.
    qualif: d.qualif.trim() as DirigenteEcfInput['qualif'],
    dtAltSoc: d.dtAltSoc.trim(),
    valores: toValores(d.valores),
  };
  if (d.dtFimSoc.trim()) out.dtFimSoc = d.dtFimSoc.trim();
  const rep = toRepresentante(d.rep);
  if (rep) out.representanteLegal = rep;
  return out;
}

/**
 * Rascunho → `socios`/`dirigentes` do payload (contrato gerado; regra do mapper do my-app/CLAUDE.md). Um complemento por
 * vigência da lista — nunca por chave órfã do rascunho (R1: o servidor recusa partnerId fora do ano).
 */
export function toY600Payload(
  vigencias: readonly Y600Vigencia[],
  draft: Y600Draft,
): { socios: SocioEcfInput[]; dirigentes: DirigenteEcfInput[] } {
  return {
    socios: vigencias.map((v): SocioEcfInput => toSocio(v, draft.socios[v.partnerId] ?? emptySocio())),
    dirigentes: draft.dirigentes.map((d): DirigenteEcfInput => toDirigente(d)),
  };
}

/** Item 8 — troca de ano: fica o complemento dos `partnerId` que seguem na lista nova; os dirigentes ficam. */
export function retainForVigencias(draft: Y600Draft, vigencias: readonly Y600Vigencia[]): Y600Draft {
  const socios: Record<string, SocioDraft> = {};
  for (const v of vigencias) {
    const s = draft.socios[v.partnerId];
    if (s) socios[v.partnerId] = s;
  }
  return { socios, dirigentes: draft.dirigentes };
}

/** Item 11 — os códigos `ECF_Y600_*` do `montarY600`/DTO, cada um com mensagem i18n própria em `sped.error.<código>`. */
export const Y600_SERVER_CODES: readonly string[] = [
  'ECF_Y600_COMPLEMENTO_FALTANDO',
  'ECF_Y600_PARTNER_FORA_DO_ANO',
  'ECF_Y600_PAIS_INCOERENTE',
  'ECF_Y600_QUALIF_INCOERENTE',
  'ECF_Y600_SEM_SOCIOS',
  'ECF_Y600_LIMITE',
];
/** O cadastro mudou entre a carga e o POST: a tela relê as vigências. */
export const Y600_RELOAD_CODES: readonly string[] = ['ECF_Y600_COMPLEMENTO_FALTANDO', 'ECF_Y600_PARTNER_FORA_DO_ANO'];
