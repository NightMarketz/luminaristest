import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../features/accounting/models/dates';
import { isHoliday, weekdayOf, type Feriados } from '../features/packages/models/validity';

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 4, C8) — vencimento do título de imposto da retenção, puro. Mora em `lib/` e não
 * em `accounting/models/` (caminho do BRIEF) porque o núcleo contábil não importa `packages/` (core-boundary, KIT-SETOR item
 * 42); mesmo arranjo do `ibsCbsApuracao.ts`.
 *
 * O dia 20 do mês seguinte à competência, recuado ao dia útil anterior se cair em sábado, domingo ou feriado (nacional,
 * estadual ou municipal — tabelas `FERIADO_NACIONAL`/`FERIADO_LOCAL`, a mesma regra de `isHoliday`). As três leis dão o mesmo
 * resultado (dossiê pesquisas-legais/brief-2026-10-22-retencoes-fonte §1):
 * - IRRF: "último dia útil do 2º decêndio do mês subsequente" (Lei 11.196/2005 art. 70 I "e") — competência do fato gerador;
 * - CSRF: idem (Lei 10.833/2003 art. 35) — competência do pagamento;
 * - INSS 11%: "até o dia 20 do mês subsequente ao da emissão … ou até o dia útil imediatamente anterior" (Lei 8.212 art. 31)
 *   — competência da emissão da NF.
 * O IRRF-DISTRIBUICAO reusa esta função (C8). `competencia` = `YYYY-MM`.
 */
export function ultimoDiaUtilAteDia20(competencia: string, feriados: Feriados, codMun: string | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia);
  if (!m) throw new Error(`competência inválida: '${competencia}' (esperado YYYY-MM)`);
  const ano = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) throw new Error(`competência inválida: '${competencia}' (esperado YYYY-MM)`);
  const [a, ms] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  let dia = dayNumberFromDateOnly(`${a}-${String(ms).padStart(2, '0')}-20`);
  while (weekdayOf(dia) === 0 || weekdayOf(dia) === 6 || isHoliday(dateOnlyFromDayNumber(dia), feriados, codMun)) dia -= 1;
  return dateOnlyFromDayNumber(dia);
}
