import type {
  DasOficial,
  SalaoParceriaContrato,
  SalaoParceriaContratoInput,
  SimplesDasRegistroInput,
  SimplesDefisDigitadoInput,
  SimplesDefisUpsertInput,
} from '../../../lib/services/simples.service';
import { parseBrl } from './parseBrl';
import { formatPctHundredths, parsePctHundredths } from './fiscalProfileForm';

/**
 * Formulários de escrita do Simples (FE-INCR-SIMPLES PR-B, itens 9–10). Os limites espelham o DTO do BE
 * (`SimplesDto.ts:59-66,159-167`); a tela só valida forma — a regra fiscal é do BE.
 */

/** Date-only de calendário: o regex sozinho aceita 2026-02-30 (que rola para março). */
export function ehDataValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Item 9 — SUGESTÃO de vencimento: dia 20 do mês seguinte ao período de apuração (LC 123 art. 21 III; Res. CGSN 140
 * art. 40). Só sugestão: a prorrogação por calamidade (art. 40-A) e o ajuste de dia não útil não estão aqui.
 */
export function sugestaoVencimento(competencia: string): string {
  const [a, m] = competencia.split('-').map(Number);
  const prox = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
  return `${prox}-20`;
}

export interface DasForm {
  numeroDocumento: string;
  valor: string;
  vencimento: string;
}
export type DasFormError = 'numeroObrigatorio' | 'valorInvalido' | 'vencimentoInvalido';

const VALOR_BR = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;

export function toDasRegistro(unitId: string, f: DasForm): { ok: true; body: SimplesDasRegistroInput } | { ok: false; error: DasFormError } {
  const numero = f.numeroDocumento.trim();
  if (!numero || numero.length > 40) return { ok: false, error: 'numeroObrigatorio' };
  // `parseBrl('abc')` devolve 0 em silêncio — o formato é checado antes.
  const valor = f.valor.trim();
  if (!VALOR_BR.test(valor)) return { ok: false, error: 'valorInvalido' };
  const valorCents = parseBrl(valor);
  if (valorCents <= 0) return { ok: false, error: 'valorInvalido' };
  if (!ehDataValida(f.vencimento)) return { ok: false, error: 'vencimentoInvalido' };
  return { ok: true, body: { unitId, numeroDocumento: numero, valorCents, vencimento: f.vencimento } };
}

/**
 * P4-7 (a) — re-registro na mesma competência: mesmo número e valor = o BE só completa a provisão pendente (rota
 * idempotente); outro = substitui o DAS anterior e estorna a provisão dele (X14 itens 19/21).
 */
export function avisoReRegistro(vigente: DasOficial | null, body: Pick<SimplesDasRegistroInput, 'numeroDocumento' | 'valorCents'>): 'completa' | 'substitui' | null {
  if (!vigente) return null;
  return vigente.numeroDocumento === body.numeroDocumento && vigente.valorCents === body.valorCents ? 'completa' : 'substitui';
}

export interface ParceriaForm {
  profissionalContactId: string;
  /** percentual "40,00" */
  cota: string;
  naturezaCota: '' | SalaoParceriaContratoInput['naturezaCota'];
  homologadoEm: string;
  sindicato: string;
  vigenteDesde: string;
  vigenteAte: string;
}
export type ParceriaFormError = 'profissional' | 'cota' | 'natureza' | 'homologadoEm' | 'sindicato' | 'vigenteDesde' | 'vigenteAte';

export const parceriaVazia = (): ParceriaForm => ({
  profissionalContactId: '', cota: '', naturezaCota: '', homologadoEm: '', sindicato: '', vigenteDesde: '', vigenteAte: '',
});

export function toParceriaForm(v: SalaoParceriaContrato): ParceriaForm {
  return {
    profissionalContactId: v.profissionalContactId,
    cota: formatPctHundredths(v.cotaSalaoBp),
    naturezaCota: v.naturezaCota,
    homologadoEm: v.homologadoEm,
    sindicato: v.sindicato,
    vigenteDesde: v.vigenteDesde,
    vigenteAte: v.vigenteAte ?? '',
  };
}

/** Item 10 — cota em % → bp (1..9999); homologação e sindicato obrigatórios (Lei 12.592 art. 1º-A § 8º); vigência ordenada. */
export function toParceriaInput(unitId: string, f: ParceriaForm): { ok: true; body: SalaoParceriaContratoInput } | { ok: false; error: ParceriaFormError } {
  if (!f.profissionalContactId) return { ok: false, error: 'profissional' };
  const bp = parsePctHundredths(f.cota);
  if (bp === null || bp === undefined || bp < 1 || bp > 9999) return { ok: false, error: 'cota' };
  if (f.naturezaCota === '') return { ok: false, error: 'natureza' };
  if (!ehDataValida(f.homologadoEm)) return { ok: false, error: 'homologadoEm' };
  const sindicato = f.sindicato.trim();
  if (!sindicato || sindicato.length > 200) return { ok: false, error: 'sindicato' };
  if (!ehDataValida(f.vigenteDesde)) return { ok: false, error: 'vigenteDesde' };
  if (f.vigenteAte !== '' && (!ehDataValida(f.vigenteAte) || f.vigenteAte < f.vigenteDesde)) return { ok: false, error: 'vigenteAte' };
  return {
    ok: true,
    body: {
      unitId,
      profissionalContactId: f.profissionalContactId,
      cotaSalaoBp: bp,
      naturezaCota: f.naturezaCota,
      homologadoEm: f.homologadoEm,
      sindicato,
      vigenteDesde: f.vigenteDesde,
      vigenteAte: f.vigenteAte === '' ? null : f.vigenteAte,
    },
  };
}

// ─────────────────────────────────────────────────────────────── PR-C: histórico pré-adoção e segregação manual

/** AAAA-MM com mês 01–12 (`CompetenciaParamSchema`). */
export const ehCompetencia = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/**
 * Item 11 — atalho do `RBT12_INCOMPLETO`: as competências faltantes citadas no `detalhe` do BE
 * ("sem receita declarada em 2025-03, 2025-04" — SimplesApuracaoService.ts:423).
 */
export function competenciasCitadas(detalhe: string): string[] {
  return (detalhe.match(/\d{4}-\d{2}/g) ?? []).filter((c, i, xs) => ehCompetencia(c) && xs.indexOf(c) === i);
}

/** Centavos → texto editável "1.234,56" (o caminho inverso do `parseBrl`). */
export function centsParaTexto(cents: number): string {
  const s = String(Math.abs(Math.trunc(cents))).padStart(3, '0');
  return `${cents < 0 ? '-' : ''}${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${s.slice(-2)}`;
}

export interface HistoricoForm {
  receitaBruta: string;
  /** opcional — entra no fator R (X14 item 11) */
  folha: string;
}
export type HistoricoFormError = 'receitaInvalida' | 'folhaInvalida';

export function toHistoricoForm(v: { receitaBrutaCents: number; folhaCents: number | null } | null): HistoricoForm {
  return { receitaBruta: v ? centsParaTexto(v.receitaBrutaCents) : '', folha: v && v.folhaCents !== null ? centsParaTexto(v.folhaCents) : '' };
}

/** Sem `sourceDocumentId`: não há rota que crie o `SourceDocument` (D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS). */
export function toHistoricoUpsert(
  unitId: string,
  f: HistoricoForm,
): { ok: true; body: { unitId: string; receitaBrutaCents: number; folhaCents: number | null } } | { ok: false; error: HistoricoFormError } {
  const receita = f.receitaBruta.trim();
  if (!VALOR_BR.test(receita)) return { ok: false, error: 'receitaInvalida' };
  const folha = f.folha.trim();
  if (folha !== '' && !VALOR_BR.test(folha)) return { ok: false, error: 'folhaInvalida' };
  return { ok: true, body: { unitId, receitaBrutaCents: parseBrl(receita), folhaCents: folha === '' ? null : parseBrl(folha) } };
}

export type NaturezaSegregacao = 'SERVICO' | 'REVENDA' | 'LOCACAO_MOVEL';
export type MotivoSegregacao = 'MONOFASICO' | 'ICMS_ST' | 'ISS_RETIDO' | 'MONOFASICO_E_ICMS_ST';
export interface SegregacaoLinha {
  natureza: '' | NaturezaSegregacao;
  receita: string;
  motivo: '' | MotivoSegregacao;
}
/** `SimplesSegregacaoUpsertSchema` — até 50 parcelas. */
export const MAX_PARCELAS = 50;
export const linhaVazia = (): SegregacaoLinha => ({ natureza: '', receita: '', motivo: '' });

export function toSegregacaoLinhas(v: { parcelas: Array<{ natureza: NaturezaSegregacao; receitaCents: number; motivo: MotivoSegregacao }> } | null): SegregacaoLinha[] {
  return v ? v.parcelas.map((p): SegregacaoLinha => ({ natureza: p.natureza, receita: centsParaTexto(p.receitaCents), motivo: p.motivo })) : [];
}

/** Item 12 — receita da parcela > 0; natureza e motivo obrigatórios; lista vazia = limpa a segregação do mês. */
export function toSegregacaoUpsert(
  unitId: string,
  linhas: readonly SegregacaoLinha[],
):
  | { ok: true; body: { unitId: string; parcelas: Array<{ natureza: NaturezaSegregacao; receitaCents: number; motivo: MotivoSegregacao }> } }
  | { ok: false; error: 'demais' | 'natureza' | 'receita' | 'motivo'; linha: number } {
  if (linhas.length > MAX_PARCELAS) return { ok: false, error: 'demais', linha: MAX_PARCELAS + 1 };
  const parcelas: Array<{ natureza: NaturezaSegregacao; receitaCents: number; motivo: MotivoSegregacao }> = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (l.natureza === '') return { ok: false, error: 'natureza', linha: i + 1 };
    const r = l.receita.trim();
    const cents = VALOR_BR.test(r) ? parseBrl(r) : 0;
    if (cents <= 0) return { ok: false, error: 'receita', linha: i + 1 };
    if (l.motivo === '') return { ok: false, error: 'motivo', linha: i + 1 };
    parcelas.push({ natureza: l.natureza, receitaCents: cents, motivo: l.motivo });
  }
  return { ok: true, body: { unitId, parcelas } };
}

// ─────────────────────────────────────────────────────────────── PR-D: DEFIS (item 14)

export type TipoBeneficiario = SimplesDefisDigitadoInput['doacoesEleitorais'][number]['tipoBeneficiario'];
export type FormaDoacao = SimplesDefisDigitadoInput['doacoesEleitorais'][number]['formaDoacao'];
/** Manual 9.4.3.1 item 9 (telas 9.2–9.3), na ordem do portal — espelha `DEFIS_TIPOS_BENEFICIARIO`/`DEFIS_FORMAS_DOACAO`. */
export const TIPOS_BENEFICIARIO: readonly TipoBeneficiario[] = ['CANDIDATO', 'COMITE_FINANCEIRO', 'PARTIDO_POLITICO'];
export const FORMAS_DOACAO: readonly FormaDoacao[] = ['CHEQUE', 'OUTROS_TITULOS_CREDITO', 'TRANSFERENCIA_ELETRONICA', 'DEPOSITO_ESPECIE', 'DINHEIRO', 'BENS', 'SERVICOS'];
/** `SimplesDefisDigitadoSchema` — até 100 linhas por lista. */
export const MAX_LINHAS_DEFIS = 100;

export interface DefisSocioLinha {
  contactId: string;
  rendimentosIsentos: string;
  rendimentosTributaveis: string;
  /** percentual "60,00" */
  participacao: string;
  irrf: string;
}
export interface DefisExportacaoLinha {
  cnpj: string;
  valor: string;
}
export interface DefisDoacaoLinha {
  cnpj: string;
  tipoBeneficiario: '' | TipoBeneficiario;
  formaDoacao: '' | FormaDoacao;
  valor: string;
}
export interface DefisForm {
  empregadosInicio: string;
  empregadosFim: string;
  ganhosCapital: string;
  ganhosRendaVariavel: string;
  exportacaoDireta: string;
  /** percentual "0,00" (manual item 8) */
  cotasTesouraria: string;
  exportacaoComercial: DefisExportacaoLinha[];
  socios: DefisSocioLinha[];
  doacoesEleitorais: DefisDoacaoLinha[];
}
export type DefisCampo = 'empregadosInicio' | 'empregadosFim' | 'ganhosCapital' | 'ganhosRendaVariavel' | 'exportacaoDireta' | 'cotasTesouraria';
export type DefisLinhaCampo =
  | 'socioContato' | 'socioValor' | 'socioParticipacao'
  | 'exportacaoCnpj' | 'exportacaoValor'
  | 'doacaoCnpj' | 'doacaoTipo' | 'doacaoForma' | 'doacaoValor'
  | 'demais';
export type DefisFormError = { campo: DefisCampo; linha?: undefined } | { campo: DefisLinhaCampo; linha: number };

export const socioVazio = (): DefisSocioLinha => ({ contactId: '', rendimentosIsentos: '', rendimentosTributaveis: '', participacao: '', irrf: '' });
export const exportacaoVazia = (): DefisExportacaoLinha => ({ cnpj: '', valor: '' });
export const doacaoVazia = (): DefisDoacaoLinha => ({ cnpj: '', tipoBeneficiario: '', formaDoacao: '', valor: '' });

export function toDefisForm(d: SimplesDefisDigitadoInput | null): DefisForm {
  if (!d) {
    return {
      empregadosInicio: '', empregadosFim: '', ganhosCapital: '', ganhosRendaVariavel: '', exportacaoDireta: '', cotasTesouraria: '',
      exportacaoComercial: [], socios: [], doacoesEleitorais: [],
    };
  }
  return {
    empregadosInicio: String(d.empregadosInicio),
    empregadosFim: String(d.empregadosFim),
    ganhosCapital: centsParaTexto(d.ganhosCapitalCents),
    ganhosRendaVariavel: centsParaTexto(d.ganhosRendaVariavelCents),
    exportacaoDireta: centsParaTexto(d.exportacaoDiretaCents),
    cotasTesouraria: formatPctHundredths(d.cotasTesourariaBp),
    exportacaoComercial: d.exportacaoComercial.map((e): DefisExportacaoLinha => ({ cnpj: e.cnpj, valor: centsParaTexto(e.valorCents) })),
    socios: d.socios.map((s): DefisSocioLinha => ({
      contactId: s.contactId,
      rendimentosIsentos: centsParaTexto(s.rendimentosIsentosCents),
      rendimentosTributaveis: centsParaTexto(s.rendimentosTributaveisCents),
      participacao: formatPctHundredths(s.participacaoBp),
      irrf: centsParaTexto(s.irrfCents),
    })),
    doacoesEleitorais: d.doacoesEleitorais.map((x): DefisDoacaoLinha => ({
      cnpj: x.cnpj, tipoBeneficiario: x.tipoBeneficiario, formaDoacao: x.formaDoacao, valor: centsParaTexto(x.valorCents),
    })),
  };
}

/** CNPJ sem máscara, maiúsculo (alfanumérico — `server/src/lib/cnpj.ts`); o dígito verificador é conferido pelo BE. */
export function normalizarCnpj(s: string): string {
  return s.replace(/[.\-/\s]/g, '').toUpperCase();
}
const CNPJ_FORMA = /^[A-Z0-9]{12}\d{2}$/;

/** Dinheiro ≥ 0; vazio = 0 (o portal parte de zero). `null` = formato inválido. */
function centsOuZero(s: string): number | null {
  const v = s.trim();
  if (v === '') return 0;
  return VALOR_BR.test(v) ? parseBrl(v) : null;
}
function inteiroNaoNegativo(s: string): number | null {
  const v = s.trim();
  return /^\d{1,7}$/.test(v) && Number(v) <= 1_000_000 ? Number(v) : null;
}
/** Percentual → bp (0..10000); vazio vale `vazioVale`. `null` = inválido. */
function pctBp(s: string, vazioVale: number | null): number | null {
  const bp = parsePctHundredths(s);
  if (bp === null) return vazioVale;
  if (bp === undefined || bp > 10000) return null;
  return bp;
}

/**
 * Soma exibida (sócios + tesouraria, em bp) — só informação: a regra "= 100% quando há sócio" é do BE
 * (`SimplesDefisUpsertSchema`; manual 9.4.3.1 itens 7.3 e 8; F-FS-8 c). `null` se algum percentual não se lê.
 */
export function somaParticipacoesBp(f: Pick<DefisForm, 'socios' | 'cotasTesouraria'>): number | null {
  let soma = pctBp(f.cotasTesouraria, 0);
  if (soma === null) return null;
  for (const s of f.socios) {
    const bp = pctBp(s.participacao, null);
    if (bp === null) return null;
    soma += bp;
  }
  return soma;
}

/** Item 14 — só forma (números, %, CNPJ, escolhas); soma = 100% e DV do CNPJ ficam com o BE. */
export function toDefisUpsert(unitId: string, f: DefisForm): { ok: true; body: SimplesDefisUpsertInput } | { ok: false; error: DefisFormError } {
  const empregadosInicio = inteiroNaoNegativo(f.empregadosInicio);
  if (empregadosInicio === null) return { ok: false, error: { campo: 'empregadosInicio' } };
  const empregadosFim = inteiroNaoNegativo(f.empregadosFim);
  if (empregadosFim === null) return { ok: false, error: { campo: 'empregadosFim' } };
  const ganhosCapitalCents = centsOuZero(f.ganhosCapital);
  if (ganhosCapitalCents === null) return { ok: false, error: { campo: 'ganhosCapital' } };
  const ganhosRendaVariavelCents = centsOuZero(f.ganhosRendaVariavel);
  if (ganhosRendaVariavelCents === null) return { ok: false, error: { campo: 'ganhosRendaVariavel' } };
  const exportacaoDiretaCents = centsOuZero(f.exportacaoDireta);
  if (exportacaoDiretaCents === null) return { ok: false, error: { campo: 'exportacaoDireta' } };
  const cotasTesourariaBp = pctBp(f.cotasTesouraria, 0);
  if (cotasTesourariaBp === null) return { ok: false, error: { campo: 'cotasTesouraria' } };
  for (const lista of [f.socios, f.exportacaoComercial, f.doacoesEleitorais]) {
    if (lista.length > MAX_LINHAS_DEFIS) return { ok: false, error: { campo: 'demais', linha: MAX_LINHAS_DEFIS + 1 } };
  }

  const socios: SimplesDefisUpsertInput['socios'] = [];
  for (let i = 0; i < f.socios.length; i++) {
    const s = f.socios[i];
    if (!s.contactId) return { ok: false, error: { campo: 'socioContato', linha: i + 1 } };
    const isentos = centsOuZero(s.rendimentosIsentos);
    const tributaveis = centsOuZero(s.rendimentosTributaveis);
    const irrf = centsOuZero(s.irrf);
    if (isentos === null || tributaveis === null || irrf === null) return { ok: false, error: { campo: 'socioValor', linha: i + 1 } };
    const participacaoBp = pctBp(s.participacao, null);
    if (participacaoBp === null) return { ok: false, error: { campo: 'socioParticipacao', linha: i + 1 } };
    socios.push({ contactId: s.contactId, rendimentosIsentosCents: isentos, rendimentosTributaveisCents: tributaveis, participacaoBp, irrfCents: irrf });
  }

  const exportacaoComercial: SimplesDefisUpsertInput['exportacaoComercial'] = [];
  for (let i = 0; i < f.exportacaoComercial.length; i++) {
    const e = f.exportacaoComercial[i];
    const cnpj = normalizarCnpj(e.cnpj);
    if (!CNPJ_FORMA.test(cnpj)) return { ok: false, error: { campo: 'exportacaoCnpj', linha: i + 1 } };
    const valorCents = centsOuZero(e.valor);
    if (valorCents === null || valorCents <= 0) return { ok: false, error: { campo: 'exportacaoValor', linha: i + 1 } };
    exportacaoComercial.push({ cnpj, valorCents });
  }

  const doacoesEleitorais: SimplesDefisUpsertInput['doacoesEleitorais'] = [];
  for (let i = 0; i < f.doacoesEleitorais.length; i++) {
    const d = f.doacoesEleitorais[i];
    const cnpj = normalizarCnpj(d.cnpj);
    if (!CNPJ_FORMA.test(cnpj)) return { ok: false, error: { campo: 'doacaoCnpj', linha: i + 1 } };
    if (d.tipoBeneficiario === '') return { ok: false, error: { campo: 'doacaoTipo', linha: i + 1 } };
    if (d.formaDoacao === '') return { ok: false, error: { campo: 'doacaoForma', linha: i + 1 } };
    const valorCents = centsOuZero(d.valor);
    if (valorCents === null || valorCents <= 0) return { ok: false, error: { campo: 'doacaoValor', linha: i + 1 } };
    doacoesEleitorais.push({ cnpj, tipoBeneficiario: d.tipoBeneficiario, formaDoacao: d.formaDoacao, valorCents });
  }

  return {
    ok: true,
    body: {
      unitId,
      empregadosInicio,
      empregadosFim,
      ganhosCapitalCents,
      ganhosRendaVariavelCents,
      exportacaoDiretaCents,
      exportacaoComercial,
      cotasTesourariaBp,
      socios,
      doacoesEleitorais,
    },
  };
}
