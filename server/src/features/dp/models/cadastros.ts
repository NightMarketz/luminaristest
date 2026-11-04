/**
 * Domínios e leitor puro dos cadastros de estrutura do DP — BE-INCR-DP-F0-F1 itens 30, 33 e 34 (PR-3).
 */
import { vigenteEm, type Vigencia } from './vigencia';

/**
 * Domínio `tpJornada` do S-2200 (`2200_vinculo_infoContrato_horContratual_tpJornada`), leiaute S-1.3 [D09
 * `pesquisas-legais/brief-pes4-f0-f1/docs/D09_index-html.html`, linha 16119], transcrito no PR como o BRIEF manda (§6).
 * O leiaute não tem o código 1 nem o 8.
 */
export const TP_JORNADA = {
  '2': 'Jornada 12 x 36 (12 horas de trabalho seguidas de 36 horas ininterruptas de descanso)',
  '3': 'Jornada com horário diário fixo e folga variável',
  '4': 'Jornada com horário diário fixo e folga fixa (no domingo)',
  '5': 'Jornada com horário diário fixo e folga fixa (exceto no domingo)',
  '6': 'Jornada com horário diário fixo e folga fixa (em outro dia da semana), com folga adicional periódica no domingo',
  '7': 'Turno ininterrupto de revezamento',
  '9': 'Demais tipos de jornada',
} as const;
export const TP_JORNADA_CODIGOS = Object.keys(TP_JORNADA) as [keyof typeof TP_JORNADA, ...(keyof typeof TP_JORNADA)[]];
export type TipoJornada = keyof typeof TP_JORNADA;

/**
 * Chaves de parâmetro de convenção coletiva (item 33). No F1 só o piso, instituto constitucional ("piso salarial
 * proporcional à extensão e à complexidade do trabalho", CF art. 7º V [D12]), com `discriminador` = `cargoId`. As outras
 * cláusulas esperam a primeira CCT real (L-PES-7); o enum cresce por PR, com teste (F-PES-9).
 */
export const CCT_CHAVES = ['PISO_SALARIAL_CENTS'] as const;
export type CctChave = (typeof CCT_CHAVES)[number];

export interface ParametroCct extends Vigencia {
  chave: string;
  discriminador: string | null;
  valorInt: bigint;
  deletedAt?: Date | null;
}

/**
 * Item 34 — parâmetro da convenção vigente na data, no molde de `linhaLegalVigente` (F4): só linhas vivas, mesma chave
 * e mesmo discriminador, `vigenteDesde <= data <= vigenteAte`; entre várias (não deveria haver, o gate da tx recusa
 * sobreposição) vence a de início mais recente. Sem linha ⇒ `undefined`.
 */
export function parametroCctVigente<T extends ParametroCct>(
  params: readonly T[],
  chave: CctChave,
  discriminador: string | null,
  data: string,
): T | undefined {
  let melhor: T | undefined;
  for (const p of params) {
    if (p.deletedAt) continue;
    if (p.chave !== chave || p.discriminador !== discriminador) continue;
    if (!vigenteEm(p, data)) continue;
    if (!melhor || p.vigenteDesde > melhor.vigenteDesde) melhor = p;
  }
  return melhor;
}

/** Item 33 — `dentro` cabe inteira em `fora` (fim nulo = sem fim). */
export function vigenciaContida(dentro: Vigencia, fora: Vigencia): boolean {
  if (dentro.vigenteDesde < fora.vigenteDesde) return false;
  if (fora.vigenteAte === null) return true;
  return dentro.vigenteAte !== null && dentro.vigenteAte <= fora.vigenteAte;
}
