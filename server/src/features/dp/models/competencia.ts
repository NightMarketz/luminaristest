/**
 * Competência do DP (`YYYY-MM`) — BE-INCR-DP-F0-F1 item 2 (PR-0).
 *
 * O mês de referência da folha e da ativação dos submódulos (o eSocial informa validade em `iniValid`, "no formato
 * AAAA-MM", D-4 do BRIEF). Funções puras; `ultimoDia` segue o calendário real (fevereiro bissexto).
 * Regex igual ao dos DTOs que já validam competência (`ProfitDistributionDto.ts`, `SimplesDto.ts`).
 */
import { z } from 'zod';
import { ValidationError } from '../../../lib/errors';
import { isValidDateOnly } from '../../accounting/models/dates';

export const CompetenciaSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competência = YYYY-MM')
  .brand<'Competencia'>();
export type Competencia = z.infer<typeof CompetenciaSchema>;

function partes(c: Competencia): [number, number] {
  return [parseInt(c.slice(0, 4), 10), parseInt(c.slice(5, 7), 10)];
}

function deAnoMes(ano: number, mes: number): Competencia {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}` as Competencia;
}

/** Primeiro dia (`YYYY-MM-01`). */
export function primeiroDia(c: Competencia): string {
  return `${c}-01`;
}

/** Último dia do mês no calendário real (`2028-02` → `2028-02-29`; `2027-02` → `2027-02-28`). */
export function ultimoDia(c: Competencia): string {
  const [ano, mes] = partes(c);
  const dia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${c}-${String(dia).padStart(2, '0')}`;
}

/** Competência de uma data `YYYY-MM-DD`; data fora do calendário real ⇒ `ValidationError`. */
export function competenciaDe(dataDateOnly: string): Competencia {
  if (!isValidDateOnly(dataDateOnly)) {
    throw new ValidationError(`Data inválida para competência: ${dataDateOnly} (esperado YYYY-MM-DD real).`);
  }
  return dataDateOnly.slice(0, 7) as Competencia;
}

export function proxima(c: Competencia): Competencia {
  const [ano, mes] = partes(c);
  return mes === 12 ? deAnoMes(ano + 1, 1) : deAnoMes(ano, mes + 1);
}

export function anterior(c: Competencia): Competencia {
  const [ano, mes] = partes(c);
  return mes === 1 ? deAnoMes(ano - 1, 12) : deAnoMes(ano, mes - 1);
}

/** −1, 0 ou 1 (`YYYY-MM` de 4 dígitos ordena como texto). */
export function comparar(a: Competencia, b: Competencia): -1 | 0 | 1 {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
