import { createHash } from 'node:crypto';
import type { LalurQuarter } from '../models/Lalur.model';
import { LALUR_QUARTERS, isPrejuizoIndicador } from '../models/Lalur.model';

/**
 * Aritmética PURA do controle de saldos da Parte B (M500, Manual do Leiaute 12 p.271) — BRIEF 3C item 7,
 * ADR-INCR-SPED-ECF-FASE3 EMENDA 2026-09-12 (3ª) D-P3.1/D-P3.2. Sem I/O, sem Prisma: o `LalurService`
 * carrega contas/ajustes/movimentos e chama daqui; o teste tabela-dirigido prova o fechamento em 4 trimestres.
 *
 * Convenção de sinal INTERNA (só aqui e no serviço — o model guarda magnitude + indicador):
 *   D = +   ("prejuízos ou valores que serão excluídos do lucro real", p.237 campo 9)
 *   C = −   ("valores que serão adicionados")
 *  - Parte A (M305/M355, REGRA_PEA p.250): adição `A` e lucro `L` DEBITAM (+); exclusão `E` e compensação
 *    `P` CREDITAM (−).
 *  - Parte B (M410 p.268): `DB`, `PF`, `BC` debitam (+) a conta; `CR` credita (−); movimento com
 *    contrapartida aplica o OPOSTO na contrapartida (transferência — campo 6) ⇒ Σ_contas(vlB de
 *    movimentos com contrapartida) = 0 por período.
 *  - `sdFim = sdIni + vlA + vlB`; `sdIni(Tn) = sdFim(Tn−1)` (p.271 "transportado para o saldo inicial do
 *    período seguinte"); `sdIni(T01)` vem de fora (C3: (N−1,T04) materializado ou saldo de abertura).
 */

export type Sinal = 'D' | 'C';

/** Magnitude + indicador → inteiro com sinal. */
export function signed(cents: bigint, ind: string): bigint {
  return ind === 'C' ? -cents : cents;
}

/** Inteiro com sinal → magnitude + indicador. Zero sai como 'C' (INFERIDO — D-P3.1; o PVA confirma). */
export function toMagnitude(v: bigint): { cents: bigint; ind: Sinal } {
  return v > 0n ? { cents: v, ind: 'D' } : { cents: -v, ind: 'C' };
}

/** REGRA_PEA (p.250): A/L → +1 (debita a Parte B); E/P → −1 (credita). */
export function parteASign(tipoLanc: 'A' | 'E' | 'P' | 'L'): 1n | -1n {
  return tipoLanc === 'A' || tipoLanc === 'L' ? 1n : -1n;
}

/** M410 (p.268): DB/PF/BC → +1; CR → −1. */
export function parteBSign(indicador: string): 1n | -1n {
  return indicador === 'CR' ? -1n : 1n;
}

export interface ParteAMove {
  parteBId: string;
  tipoLanc: 'A' | 'E' | 'P' | 'L';
  valorCents: bigint;
}

export interface ParteBMove {
  parteBId: string;
  contrapartidaId: string | null;
  indicador: string;
  valorCents: bigint;
}

/** Saldo de UMA conta em UM período, com sinal. */
export interface QuarterBalance {
  parteBId: string;
  sdIni: bigint;
  vlA: bigint;
  vlB: bigint;
  sdFim: bigint;
}

/**
 * Um período: para cada conta em `accountIds`, `sdIni` (do mapa — ausente ⇒ 0), Σ Parte A, Σ Parte B (com o
 * espelho na contrapartida) e `sdFim`. Movimento cuja conta não está em `accountIds` é ignorado (conta
 * arquivada depois — o diagnóstico acusa pela divergência).
 */
export function computeQuarter(
  accountIds: readonly string[],
  sdIniByAccount: ReadonlyMap<string, bigint>,
  movesA: readonly ParteAMove[],
  movesB: readonly ParteBMove[],
): Map<string, QuarterBalance> {
  const out = new Map<string, QuarterBalance>();
  for (const id of accountIds) out.set(id, { parteBId: id, sdIni: sdIniByAccount.get(id) ?? 0n, vlA: 0n, vlB: 0n, sdFim: 0n });
  for (const m of movesA) {
    const b = out.get(m.parteBId);
    if (b) b.vlA += parteASign(m.tipoLanc) * m.valorCents;
  }
  for (const m of movesB) {
    const sign = parteBSign(m.indicador);
    const b = out.get(m.parteBId);
    if (b) b.vlB += sign * m.valorCents;
    if (m.contrapartidaId && !isPrejuizoIndicador(m.indicador)) {
      const c = out.get(m.contrapartidaId);
      if (c) c.vlB -= sign * m.valorCents;
    }
  }
  for (const b of out.values()) b.sdFim = b.sdIni + b.vlA + b.vlB;
  return out;
}

export interface QuarterInput {
  quarter: LalurQuarter;
  movesA: readonly ParteAMove[];
  movesB: readonly ParteBMove[];
}

/**
 * Encadeia os trimestres de um exercício a partir do saldo de abertura (`openingByAccount`):
 * `sdIni(T01) = opening`, `sdIni(Tn) = sdFim(Tn−1)`. Devolve um mapa por trimestre; só os trimestres
 * presentes em `quarters` (ordenados por T01..T04 aqui, independente da ordem de entrada).
 */
export function chainYear(
  accountIds: readonly string[],
  openingByAccount: ReadonlyMap<string, bigint>,
  quarters: readonly QuarterInput[],
): Map<LalurQuarter, Map<string, QuarterBalance>> {
  const byQ = new Map(quarters.map((q) => [q.quarter, q]));
  const out = new Map<LalurQuarter, Map<string, QuarterBalance>>();
  let sdIni: ReadonlyMap<string, bigint> = openingByAccount;
  for (const quarter of LALUR_QUARTERS) {
    const q = byQ.get(quarter);
    if (!q) break; // exercício parcialmente fechado: para no primeiro trimestre ausente
    const balances = computeQuarter(accountIds, sdIni, q.movesA, q.movesB);
    out.set(quarter, balances);
    sdIni = new Map([...balances.values()].map((b) => [b.parteBId, b.sdFim]));
  }
  return out;
}

/**
 * sha256 do conjunto de saldos de um período (auditoria do fechamento — BRIEF item 10: nunca os valores no
 * payload, só o hash). Ordenado por `codCtaB`/`codTributo` para ser independente da ordem de leitura.
 */
export function balancesSha256(rows: ReadonlyArray<{ codCtaB: string; codTributo: string; b: QuarterBalance }>): string {
  const sorted = [...rows].sort((x, y) => x.codTributo.localeCompare(y.codTributo) || x.codCtaB.localeCompare(y.codCtaB));
  const h = createHash('sha256');
  for (const r of sorted) h.update(`${r.codTributo}|${r.codCtaB}|${r.b.sdIni}|${r.b.vlA}|${r.b.vlB}|${r.b.sdFim}\n`);
  return h.digest('hex');
}
