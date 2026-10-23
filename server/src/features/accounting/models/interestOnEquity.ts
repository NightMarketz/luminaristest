import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from './dates';
import { aplicarAliquota } from './profitDistribution';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26) — regras puras do JCP. IN 1.700 art. 75 [D11]: juros limitados à
 * variação pro rata die da TJLP sobre as contas do PL (caput I–V), do início do período de apuração até a data do crédito
 * (L14, SC Cosit 45/2018), por juros simples (L15, SC Cosit 70/2025) com a taxa diária = TJLP mensal ÷ dias do mês
 * (F-IRD-18). Limite dedutível (§ 2º): o maior entre 50% do lucro antes dos juros e 50% de lucros acumulados + reservas de
 * lucros. Valores em centavos `bigint`.
 */
export const PERIODOS_JCP = ['T01', 'T02', 'T03', 'T04', 'A00'] as const;
export type PeriodoJcp = (typeof PERIODOS_JCP)[number];
export const FORMAS_JCP = ['DESPESA', 'PL'] as const;
export type FormaJcp = (typeof FORMAS_JCP)[number];

/** A TJLP da tabela de plataforma é a taxa mensal em décimos de milésimo de ponto percentual: 0,7742% = 7742 (item 5). */
export const TJLP_ESCALA = 1_000_000n;
/** MMC de 28, 29, 30 e 31: denominador comum dos dias do mês, para somar as faixas sem arredondar no meio. */
const MMC_DIAS_MES = 377_580n;

export interface Faixa {
  de: string;
  ate: string;
  baseCents: bigint;
  /** Taxa mensal da TJLP do trimestre (escala 1e6) e os dias corridos do mês da faixa. */
  taxaMensal: number;
  diasDoMes: number;
  jurosCents: bigint;
}

export function diasDoMes(dia: string): number {
  const [a, m] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Chave da linha da TJLP do dia (`YYYY-T0n`, item 5). */
export function chaveTjlp(dia: string): string {
  const [a, m] = dia.split('-').map(Number);
  return `${a}-T0${Math.ceil(m / 3)}`;
}

export function diaAnterior(dia: string): string {
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(dia) - 1);
}

/** Juros simples de `n` dias à taxa mensal ÷ dias do mês, arredondado ao centavo (meio para cima; sinal preservado). */
function jurosDaFaixa(base: bigint, taxaMensal: number, n: number, dm: number): bigint {
  const num = base * BigInt(taxaMensal) * BigInt(n);
  const den = TJLP_ESCALA * BigInt(dm);
  return num >= 0n ? (2n * num + den) / (2n * den) : -((-2n * num + den) / (2n * den));
}

/**
 * Item 24 — para cada dia de `de` até `ate` (inclusive): base = saldo no fim do dia anterior × taxa do dia. Os dias
 * consecutivos com a mesma base e o mesmo mês viram uma faixa. O total soma as frações exatas e arredonda uma vez.
 */
export function faixasJcp(
  de: string,
  ate: string,
  baseNoFimDoDia: (dia: string) => bigint,
  taxaMensalDoDia: (dia: string) => number,
): { faixas: Faixa[]; jurosMaxTjlpCents: bigint } {
  const faixas: Faixa[] = [];
  let numTotal = 0n;
  for (let n = dayNumberFromDateOnly(de); n <= dayNumberFromDateOnly(ate); n++) {
    const dia = dateOnlyFromDayNumber(n);
    const base = baseNoFimDoDia(dateOnlyFromDayNumber(n - 1));
    const taxa = taxaMensalDoDia(dia);
    const dm = diasDoMes(dia);
    numTotal += base * BigInt(taxa) * (MMC_DIAS_MES / BigInt(dm));
    const ult = faixas[faixas.length - 1];
    if (ult && ult.baseCents === base && ult.taxaMensal === taxa && ult.ate.slice(0, 7) === dia.slice(0, 7)) ult.ate = dia;
    else faixas.push({ de: dia, ate: dia, baseCents: base, taxaMensal: taxa, diasDoMes: dm, jurosCents: 0n });
  }
  for (const f of faixas) {
    const nDias = dayNumberFromDateOnly(f.ate) - dayNumberFromDateOnly(f.de) + 1;
    f.jurosCents = jurosDaFaixa(f.baseCents, f.taxaMensal, nDias, f.diasDoMes);
  }
  const den = TJLP_ESCALA * MMC_DIAS_MES;
  const total = numTotal >= 0n ? (2n * numTotal + den) / (2n * den) : 0n;
  return { faixas, jurosMaxTjlpCents: total };
}

/** Taxa diária legível: mensal (%) ÷ dias do mês, ex.: "0,7742% / 31". */
export function taxaDiariaTexto(f: Pick<Faixa, 'taxaMensal' | 'diasDoMes'>): string {
  return `${(f.taxaMensal / 10000).toFixed(4).replace('.', ',')}% / ${f.diasDoMes}`;
}

/** Item 25 (L10; §§ 2º–3º) — limite dedutível = min(juros pela TJLP, max(50% do lucro, 50% de lucros + reservas)). */
export function limiteDedutivel(jurosMaxTjlpCents: bigint, lucroCents: bigint, lucrosReservasCents: bigint) {
  const metade = (v: bigint) => (v > 0n ? v / 2n : 0n);
  const limite50LucroCents = metade(lucroCents);
  const limite50ReservasCents = metade(lucrosReservasCents);
  const maior = limite50LucroCents > limite50ReservasCents ? limite50LucroCents : limite50ReservasCents;
  const juros = jurosMaxTjlpCents > 0n ? jurosMaxTjlpCents : 0n;
  return { limite50LucroCents, limite50ReservasCents, limiteDedutivelCents: juros < maior ? juros : maior };
}

/** Item 26 — rateio do total pela participação; o resíduo de centavo vai ao último sócio. */
export function rateioPorParticipacao(totalCents: bigint, socios: ReadonlyArray<{ partnerId: string; participacaoBp: number }>): Array<{ partnerId: string; brutoCents: bigint }> {
  let resto = totalCents;
  return socios.map((s, i) => {
    const v = i === socios.length - 1 ? resto : (totalCents * BigInt(s.participacaoBp)) / 10000n;
    resto -= v;
    return { partnerId: s.partnerId, brutoCents: v };
  });
}

/** Item 26 (L9) — IRRF de 17,5% por sócio, PF e PJ, arredondado ao centavo. */
export function irrfJcp(brutoCents: bigint, aliquotaBp: number): bigint {
  return aplicarAliquota(brutoCents, aliquotaBp);
}

export interface LinhaLalurPrevista {
  livro: 'lalur' | 'lacs';
  codigo: string;
  valorCents: bigint;
}

/**
 * Item 29 (F-IRD-11; IN 1.700 art. 75 § 6º) — Parte A do e-Lalur e do e-Lacs. `PL`: exclusão do menor entre total e limite,
 * sem adição. `DESPESA`: adição do excesso, se houver. Os códigos chegam do catálogo L12 do ano (nunca literais aqui).
 */
export function lalurPrevisto(
  forma: FormaJcp,
  totalCents: bigint,
  limiteCents: bigint,
  codigosDo: (livro: 'lalur' | 'lacs') => { exclusao: string; adicaoExcesso: string },
): LinhaLalurPrevista[] {
  const out: LinhaLalurPrevista[] = [];
  for (const livro of ['lalur', 'lacs'] as const) {
    const codigos = codigosDo(livro);
    if (forma === 'PL') out.push({ livro, codigo: codigos.exclusao, valorCents: totalCents < limiteCents ? totalCents : limiteCents });
    else if (totalCents > limiteCents) out.push({ livro, codigo: codigos.adicaoExcesso, valorCents: totalCents - limiteCents });
  }
  return out;
}
