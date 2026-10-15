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
