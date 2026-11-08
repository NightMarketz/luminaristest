import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../features/accounting/models/dates';
import { isNationalHoliday, weekdayOf, type Feriados } from '../features/packages/models/validity';

/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF item 21 na regra mensal; pacote de lacunas, dono 26/10, ponto 1) — prazo de entrega da
 * EFD-Reinf, puro. Mora em `lib/` pelo mesmo motivo do `vencimentoRetencao.ts`: o calendário é de `packages/` e o núcleo
 * contábil não o importa (core-boundary).
 *
 * IN RFB 2.043/2021 art. 6º (Sijut, visão vigente; dossiê pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs): até
 * o dia 15 do mês seguinte, **postergado** ao primeiro dia útil seguinte (§ 2º) — o oposto do DARF do IRRF, que recua ao dia
 * útil anterior (`ultimoDiaUtilAteDia20`); duas funções, não um parâmetro (item 21). Feriado nacional (`FERIADO_NACIONAL`).
 * O prazo trimestral dos dividendos isentos (§ 3º) é `prazoReinfIsentos` (PR-3).
 */
export function prazoReinfMensal(competencia: string, feriados: Feriados): string {
  const [ano, mes] = anoMes(competencia);
  return dia15Postergado(ano, mes + 1, feriados);
}

/**
 * BE-INCR-EFD-REINF PR-3 (BRIEF item 21) — IN RFB 2.043 art. 6º § 3º (incl. IN 2.163/2023; Sijut, visão vigente, lido em 28/10):
 * "lucros e dividendos, quando isentos de retenção" — "até o dia 15 (quinze) do segundo mês subsequente ao trimestre
 * correspondente, observado o disposto no § 2º" (postergado ao dia útil seguinte). Só o R-4010 de dividendo `TRANSICAO`
 * (isenção 12) usa este prazo; o ≤ R$ 50 mil sem retenção fica no mensal até a P-REINF-6 (dono, 28/10, lacuna B).
 */
export function prazoReinfIsentos(competencia: string, feriados: Feriados): string {
  const [ano, mes] = anoMes(competencia);
  const fimTrimestre = Math.ceil(mes / 3) * 3;
  return dia15Postergado(ano, fimTrimestre + 2, feriados);
}

function anoMes(competencia: string): [number, number] {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia);
  if (!m) throw new Error(`competência inválida: '${competencia}' (esperado YYYY-MM)`);
  const ano = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  if (mes < 1 || mes > 12) throw new Error(`competência inválida: '${competencia}' (esperado YYYY-MM)`);
  return [ano, mes];
}

/** Dia 15 do mês `mes` (pode passar de 12: vira o ano seguinte), avançado ao 1º dia útil (§ 2º). */
function dia15Postergado(ano: number, mes: number, feriados: Feriados): string {
  const a = ano + Math.floor((mes - 1) / 12);
  const ms = ((mes - 1) % 12) + 1;
  let dia = dayNumberFromDateOnly(`${a}-${String(ms).padStart(2, '0')}-15`);
  while (weekdayOf(dia) === 0 || weekdayOf(dia) === 6 || isNationalHoliday(dateOnlyFromDayNumber(dia), feriados)) dia += 1;
  return dateOnlyFromDayNumber(dia);
}
