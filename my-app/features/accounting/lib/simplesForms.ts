import type { DasOficial, SalaoParceriaContrato, SalaoParceriaContratoInput, SimplesDasRegistroInput } from '../../../lib/services/simples.service';
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
