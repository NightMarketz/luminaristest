import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from './dates';
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 12, 13, 15, 16 e 21) — regras puras do IRRF na distribuição de lucros.
 * Lei 9.250 art. 6º-A (incl. Lei 15.270/2025) [D05]: acima de R$ 50 mil no mês, por PJ e por PF residente, retém 10%
 * **sobre o total** (L1); sem dedução (L2); mais de um evento no mês recalcula pelo total (L3). Lucro da transição (§ 3º,
 * F-IRD-6 b): sai da base e conta no limite. Valores em centavos `bigint`.
 */
export const PROFIT_DISTRIBUTION_EVENTOS = ['CREDITO', 'PAGAMENTO', 'EMPREGO', 'ENTREGA'] as const;
export type ProfitDistributionEvento = (typeof PROFIT_DISTRIBUTION_EVENTOS)[number];
export const ORIGENS_LUCRO = ['CORRENTE', 'TRANSICAO'] as const;
export type OrigemLucro = (typeof ORIGENS_LUCRO)[number];
export const PROFIT_DISTRIBUTION_STATUS = ['PENDING_POST', 'POSTED', 'CANCELLED'] as const;
export type ProfitDistributionStatus = (typeof PROFIT_DISTRIBUTION_STATUS)[number];
/** Item 12 — os eventos que contam na soma do mês. */
export const STATUS_QUE_SOMAM: readonly ProfitDistributionStatus[] = ['PENDING_POST', 'POSTED'];

/** Item 21 (L8) — DARF do IRRF sobre lucros e dividendos (P&R RFB itens 11 e 23 [D08]). */
export const CODIGO_RECEITA_DIVIDENDOS = '1841';
/** Item 14 (L4) — o resultado do lucro da transição é de 2025 ou antes (art. 6º-A § 3º I). */
export const ANO_RESULTADO_TRANSICAO_MAX = 2025;

export interface EventoDoMes {
  id: string;
  brutoCents: bigint;
  irrfCents: bigint;
  origemLucro: string;
}

export interface ParametrosIrrf {
  aliquotaBp: number;
  limiteMensalCents: bigint;
}

export interface CalculoMes {
  somaMesCents: bigint;
  baseMesCents: bigint;
  devidoMesCents: bigint;
  jaRetidoCents: bigint;
  irrfEventoCents: bigint;
}

/** 10% (ou a alíquota vigente) em centavos, arredondado ao centavo (meio para cima). */
export function aplicarAliquota(baseCents: bigint, aliquotaBp: number): bigint {
  return (baseCents * BigInt(aliquotaBp) + 5000n) / 10000n;
}

/**
 * Item 12 (L1–L3, F-IRD-6) — o IRRF do evento novo, dados os outros eventos do mês do mesmo `taxId` em todas as unidades
 * da PJ. Item 13 (L5): beneficiário PJ residente não retém nem soma com ninguém.
 */
export function calcularMes(
  outros: readonly EventoDoMes[],
  novo: { brutoCents: bigint; origemLucro: string },
  p: ParametrosIrrf,
  tipoPessoa: string,
): CalculoMes {
  if (tipoPessoa === 'PJ') {
    return { somaMesCents: novo.brutoCents, baseMesCents: 0n, devidoMesCents: 0n, jaRetidoCents: 0n, irrfEventoCents: 0n };
  }
  const todos = [...outros, novo];
  const somaMesCents = todos.reduce((s, e) => s + e.brutoCents, 0n);
  const baseMesCents = todos.filter((e) => e.origemLucro !== 'TRANSICAO').reduce((s, e) => s + e.brutoCents, 0n);
  const jaRetidoCents = outros.reduce((s, e) => s + e.irrfCents, 0n);
  if (somaMesCents <= p.limiteMensalCents) return { somaMesCents, baseMesCents, devidoMesCents: 0n, jaRetidoCents, irrfEventoCents: 0n };
  const devidoMesCents = aplicarAliquota(baseMesCents, p.aliquotaBp);
  return { somaMesCents, baseMesCents, devidoMesCents, jaRetidoCents, irrfEventoCents: devidoMesCents - jaRetidoCents };
}

/**
 * Item 16 (F-IRD-5R) — o menor bruto que, cruzando o limite como o evento recusado cruza, cobre o IRRF do mês pela regra
 * do item 12 (IRRF do evento ≤ bruto). Abaixo do teto (item 15) não há retenção: essa saída é a outra sugestão da prévia.
 * A PJ nunca assume o imposto.
 */
export function brutoMinimo(outros: readonly EventoDoMes[], origemLucro: string, p: ParametrosIrrf, tipoPessoa: string): bigint {
  const cobre = (b: bigint) => calcularMes(outros, { brutoCents: b, origemLucro }, p, tipoPessoa).irrfEventoCents <= b;
  const piso = tetoSemRetencao(outros, p) + 1n;
  // Estimativa fechada (b ≥ (a·B0 − R) / (1 − a)) e ajuste fino pelo arredondamento.
  const base0 = outros.filter((e) => e.origemLucro !== 'TRANSICAO').reduce((s, e) => s + e.brutoCents, 0n);
  const retido = outros.reduce((s, e) => s + e.irrfCents, 0n);
  const a = BigInt(p.aliquotaBp);
  const num = origemLucro === 'TRANSICAO' ? aplicarAliquota(base0, p.aliquotaBp) - retido : base0 * a - retido * 10000n;
  const den = origemLucro === 'TRANSICAO' ? 1n : 10000n - a;
  let b = num / den - 2n;
  if (b < piso) b = piso;
  while (!cobre(b)) b += 1n;
  while (b > piso && cobre(b - 1n)) b -= 1n;
  return b;
}

/** Item 15 (F-IRD-5R) — quanto ainda cabe no mês sem retenção: limite − soma atual (mínimo 0). */
export function tetoSemRetencao(outros: readonly EventoDoMes[], p: ParametrosIrrf): bigint {
  const s = outros.reduce((acc, e) => acc + e.brutoCents, 0n);
  return s >= p.limiteMensalCents ? 0n : p.limiteMensalCents - s;
}

export type SugestaoDistribuicao = 'NENHUMA' | 'MOVER_EXCEDENTE_MES_SEGUINTE' | 'AUMENTAR_BRUTO';

/** Item 15/16 — sugestão da prévia: cobrir o IRRF vem antes; depois, mover o excedente quando o evento cruza o limite. */
export function sugestao(outros: readonly EventoDoMes[], calc: CalculoMes, brutoCents: bigint, p: ParametrosIrrf, tipoPessoa: string): SugestaoDistribuicao {
  if (calc.irrfEventoCents > brutoCents) return 'AUMENTAR_BRUTO';
  if (tipoPessoa === 'PJ') return 'NENHUMA';
  const antes = outros.reduce((s, e) => s + e.brutoCents, 0n);
  return antes <= p.limiteMensalCents && calc.somaMesCents > p.limiteMensalCents ? 'MOVER_EXCEDENTE_MES_SEGUINTE' : 'NENHUMA';
}

/** Dia útil = seg–sex fora da tabela `FERIADO_NACIONAL` (chave MM-DD) vigente na data. */
export function ehDiaUtil(data: string, feriados: readonly LinhaLegal[]): boolean {
  const dow = new Date(dayNumberFromDateOnly(data) * 86_400_000).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !linhasVigentesDaTabela(feriados, 'FERIADO_NACIONAL', data).some((l) => l.chave === data.slice(5));
}

/**
 * Item 21 (L8) — vencimento do DARF 1841: último dia útil do 2º decêndio do mês seguinte à competência (P&R RFB itens 6
 * e 11 [D08]; Lei 11.196 art. 70 I [D10]). O dia 20 que não é útil recua para o dia útil anterior.
 */
export function vencimentoIrrfDividendos(competencia: string, feriados: readonly LinhaLegal[]): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const [a2, m2] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  let n = dayNumberFromDateOnly(`${a2}-${String(m2).padStart(2, '0')}-20`);
  while (!ehDiaUtil(dateOnlyFromDayNumber(n), feriados)) n -= 1;
  return dateOnlyFromDayNumber(n);
}
