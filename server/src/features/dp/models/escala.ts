/**
 * Escala da jornada como dado — BE-INCR-DP-F2 itens 68 e 69 (PR-0R).
 *
 * A escala (dias de trabalho da semana, minutos por dia) é campo da `DpJornada`: a empresa que passa de 6×1 para 5×2
 * cadastra jornada nova, sem código. `minutosSemanais` é derivado e conferido (`minutosPorDia × nº de dias`). Escala
 * irregular (12×36) é do `DP-PONTO` (F6): o DTO a recusa com `DP_ESCALA_IRREGULAR`.
 *
 * Datas date-only (`YYYY-MM-DD`), contadas no número de dia UTC (memória date-only-rendering-utc-shift).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../accounting/models/dates';
import { DIAS_SEMANA } from '../../legalParameters/models/formatoLinha';
import type { LinhaLegal } from '../../legalParameters/models/legalParameter';
import { isHoliday, weekdayOf } from '../../packages/models/validity';
import { primeiroDia, ultimoDia, type Competencia } from './competencia';
import { dpValidationError } from './erros';

export { DIAS_SEMANA };

/** `tpJornada` 2 do S-2200 (12 × 36): não se descreve por dias fixos da semana — fica para o `DP-PONTO` (F6). */
export const TP_JORNADA_IRREGULAR = ['2'] as const;

/**
 * Item 68 — a escala bate com a jornada: `minutosSemanais`, quando informado, = `minutosPorDia × nº de dias`; 12 × 36
 * recusado. Devolve os minutos semanais derivados. 400 `DP_ESCALA_IRREGULAR`.
 */
export function assertEscalaRegular(e: EscalaJornada, tipoJornada: string, minutosSemanais: number | undefined): number {
  if ((TP_JORNADA_IRREGULAR as readonly string[]).includes(tipoJornada)) {
    throw dpValidationError('DP_ESCALA_IRREGULAR', 'Jornada 12 × 36 não se descreve por dias fixos da semana; fica para o módulo de ponto.', { campo: 'tipoJornada' });
  }
  const derivado = minutosSemanaisDaEscala(e);
  if (minutosSemanais !== undefined && minutosSemanais !== derivado) {
    throw dpValidationError(
      'DP_ESCALA_IRREGULAR',
      `minutosSemanais (${minutosSemanais}) não bate com a escala: ${e.minutosPorDia} minutos × ${e.diasTrabalho.length} dias = ${derivado}.`,
      { campo: 'minutosSemanais' },
    );
  }
  return derivado;
}

export interface AvisoJornada {
  codigo: 'JORNADA_ACIMA_DO_LIMITE' | 'REPOUSO_ABAIXO_DO_MINIMO';
  mensagem: string;
}

/**
 * Item 71 — a jornada contra a lei vigente na data (hoje, no cadastro): aviso, não 400, porque a jornada pode ter sido
 * contratada antes da virada; o bloqueio é do cálculo (item 44).
 */
export function avisosDaJornada(
  e: EscalaJornada,
  limite: { valor: number; fonte: string },
  repousoMin: { valor: number; fonte: string },
  data: string,
): AvisoJornada[] {
  const out: AvisoJornada[] = [];
  const semanais = minutosSemanaisDaEscala(e);
  if (semanais > limite.valor) {
    out.push({ codigo: 'JORNADA_ACIMA_DO_LIMITE', mensagem: `A escala soma ${semanais} minutos por semana, acima do limite de ${limite.valor} vigente em ${data} (${limite.fonte}).` });
  }
  if (repousoSemanal(e) < repousoMin.valor) {
    out.push({
      codigo: 'REPOUSO_ABAIXO_DO_MINIMO',
      mensagem: `A escala tem ${repousoSemanal(e)} dia(s) de repouso por semana, abaixo do mínimo de ${repousoMin.valor} vigente em ${data} (${repousoMin.fonte}).`,
    });
  }
  return out;
}
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface EscalaJornada {
  diasTrabalho: DiaSemana[];
  minutosPorDia: number;
}

/** Os dias (`YYYY-MM-DD`) da competência, do primeiro ao último. */
export function diasDaCompetencia(c: Competencia): string[] {
  const de = dayNumberFromDateOnly(primeiroDia(c));
  const ate = dayNumberFromDateOnly(ultimoDia(c));
  return Array.from({ length: ate - de + 1 }, (_, k) => dateOnlyFromDayNumber(de + k));
}

/** `getUTCDay` (domingo = 0) → o dia da semana da escala. */
const POR_GETDAY: readonly DiaSemana[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export function diaDaSemana(data: string): DiaSemana {
  return POR_GETDAY[weekdayOf(dayNumberFromDateOnly(data))];
}

/** Forma canônica da máscara (ordem SEG..DOM, sem repetição), como a coluna `diasTrabalho` guarda. */
export function serializarDias(dias: readonly DiaSemana[]): string {
  return DIAS_SEMANA.filter((d) => dias.includes(d)).join(',');
}

/** Coluna `diasTrabalho` → lista; valor fora do domínio ⇒ erro de programação (o DTO e a migração só gravam o domínio). */
export function lerDias(coluna: string): DiaSemana[] {
  const dias = coluna.split(',').filter((d) => d !== '');
  for (const d of dias) if (!(DIAS_SEMANA as readonly string[]).includes(d)) throw new Error(`diasTrabalho fora do domínio: ${coluna}`);
  return serializarDias(dias as DiaSemana[]).split(',').filter((d) => d !== '') as DiaSemana[];
}

/** Escala da jornada gravada; `null` quando a jornada migrada ficou sem `minutosPorDia` (item 68: não inventa). */
export function escalaDaJornada(j: { diasTrabalho: string; minutosPorDia: number | null }): EscalaJornada | null {
  if (j.minutosPorDia === null || j.minutosPorDia <= 0) return null;
  const diasTrabalho = lerDias(j.diasTrabalho);
  return diasTrabalho.length === 0 ? null : { diasTrabalho, minutosPorDia: j.minutosPorDia };
}

/** Item 68 — minutos semanais derivados da escala. */
export function minutosSemanaisDaEscala(e: EscalaJornada): number {
  return e.minutosPorDia * e.diasTrabalho.length;
}

/** Dias de repouso por semana na escala (os dias da semana que não são de trabalho). */
export function repousoSemanal(e: EscalaJornada): number {
  return DIAS_SEMANA.length - e.diasTrabalho.length;
}

/**
 * Feriados da unidade no mês (`FERIADO_NACIONAL`, domingos de eleição e `FERIADO_LOCAL` do município), pela regra que
 * já tem dono (`packages/models/validity.isHoliday`; `_REUSE-CRITERION`: mesmo objeto, o feriado).
 */
export function feriadosDoMes(competencia: Competencia, feriados: readonly LinhaLegal[], codMun: string | null): string[] {
  return diasDaCompetencia(competencia).filter((d) => isHoliday(d, feriados, codMun));
}

export interface DiasDoMes {
  trabalho: number;
  repouso: number;
  porDia: Array<{ data: string; tipo: 'TRABALHO' | 'REPOUSO' }>;
}

/**
 * Item 69 — dia de trabalho = dia da semana marcado na escala que não é feriado; repouso = o resto (F-DPF-2 a).
 * `trabalho + repouso` = dias do mês.
 */
export function diasDoMes(competencia: Competencia, escala: EscalaJornada, feriados: readonly string[]): DiasDoMes {
  const fer = new Set(feriados);
  const porDia = diasDaCompetencia(competencia).map((data) => ({
    data,
    tipo: escala.diasTrabalho.includes(diaDaSemana(data)) && !fer.has(data) ? ('TRABALHO' as const) : ('REPOUSO' as const),
  }));
  const trabalho = porDia.filter((d) => d.tipo === 'TRABALHO').length;
  return { trabalho, repouso: porDia.length - trabalho, porDia };
}

