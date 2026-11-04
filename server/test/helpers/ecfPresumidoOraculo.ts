/**
 * Emenda C8 (X7-C §C3 item 5) — oráculo da ECF Presumido para o teste-guarda da memória × ECF: as fórmulas das linhas
 * `CNA`/`CA` de P200/P300/P400/P500 da tabela dinâmica (leiaute 12, 28/05/2026 — dossiê `pc1-memoria-calculo` [D02]),
 * transcritas uma a uma, com o texto ao lado, aplicadas às linhas `E` (receita bruta: P200 4/6/8, P400 2/4). É o que o PVA
 * calcula; não usa nada de `taxAssessmentCalc.ts`.
 *
 * Escopo: o 1º trimestre do ano (`PERIODO_PRIMEIRO() = PERIODO_ATUAL()`, ≠ `PERIODO_ULTIMO()`), 3 meses, alíquota CSLL '1'
 * (9%), sem as outras linhas `E` (= 0). `lc224Irpj` = o período toca 2026 (linhas 25xxx do P200 desde 01/01/2026); a
 * CSLL não tem LC 224 no T01 (P400 20xxx desde 01/04/2026). Centavos; arredondamento ao centavo, meio para cima.
 */
const arred = (num: bigint, den: bigint): bigint => (num * 2n + den) / (den * 2n);
const pct = (cents: bigint, porMil: bigint): bigint => arred(cents * porMil, 1000n); // × 0,08 = × 80/1000

export function oraculoEcfPresumidoT01(e: ReadonlyMap<string, bigint>, lc224Irpj: boolean): Map<string, bigint> {
  const E = (k: string) => e.get(k) ?? 0n;
  const o = new Map<string, bigint>();
  // Linhas `E` de receita bruta: ocorrência 0:N — a que o arquivo não traz vale 0 (a memória pode marcar o passo com 0).
  for (const k of ['P200:4', 'P200:6', 'P200:8', 'P400:2', 'P400:4']) o.set(k, E(k));
  // P200(10) = P200(2)*0,016 + P200(4)*0,08 + P200(6)*0,16 + P200(8)*0,32 + P200(9)*0,384 (se > 0)
  o.set('P200:10', pct(E('P200:4'), 80n) + pct(E('P200:6'), 160n) + pct(E('P200:8'), 320n));
  let acrescimos = 0n;
  if (lc224Irpj) {
    // 25110 = SOMA(P200(2:9)); 25140 (1º período) = 1.250.000,00 se SOMA(P200(2:9)) > 0;
    // 25150 = 25110 − 25140 se 25110 > 1.250.000 e > 25140; 25200 (≠ último) = 25110 − 25140 se >
    const total = E('P200:4') + E('P200:6') + E('P200:8');
    const lim = total > 0n ? 125_000_000n : 0n;
    const exc = total > lim ? total - lim : 0n;
    o.set('P200:25140', lim);
    o.set('P200:25200', exc);
    // 25220 / 25240 = (P200(4|8) / P200("25.110")) × P200("25.200") × 0,08|0,32 × 0,1
    const ad = (rec: bigint, porMil: bigint) => (total > 0n ? arred(rec * exc * porMil, total * 10_000n) : 0n);
    o.set('P200:25220', ad(E('P200:4'), 80n));
    o.set('P200:25240', ad(E('P200:8'), 320n));
    acrescimos = o.get('P200:25220')! + o.get('P200:25240')!;
  }
  // P200(26): até 31/12/2025 = SOMA(P200(10:21)) − SOMA(P200(22:"25.99")); desde 2026 + SOMA(P200("25.210":"25.250"))
  const base = o.get('P200:10')! + acrescimos;
  o.set('P200:26', base);
  // P300(1) = P200(26); (3) = P300(1) × 0,15; (4) = (P300(1) − 20.000 × MESES_PERIODO()) × 0,10 se >;
  // (5) = linha E que o arquivo não traz ⇒ 0; (15) = SOMA(P300(3:5)) − SOMA(P300(7:14))
  o.set('P300:1', base);
  o.set('P300:3', pct(base, 150n));
  o.set('P300:4', base > 6_000_000n ? pct(base - 6_000_000n, 100n) : 0n);
  o.set('P300:5', E('P300:5'));
  o.set('P300:15', o.get('P300:3')! + o.get('P300:4')! + o.get('P300:5')!);
  // P400(6) = P400(2)*0,12 + P400(4)*0,32 + P400(5)*0,384; (21) = SOMA(P400(6:17)) − SOMA(P400(18:20)) [+ 20210:20230 desde 01/04/2026]
  o.set('P400:6', pct(E('P400:2'), 120n) + pct(E('P400:4'), 320n));
  o.set('P400:21', o.get('P400:6')!);
  // P500(1) = P400(21); (2) = P500(1) × 0,09 (0020.IND_ALIQ_CSLL = "1"); (4) = SOMA(P500(2:3)); (13) = P500(4) − SOMA(P500(6:12))
  o.set('P500:1', o.get('P400:21')!);
  o.set('P500:2', pct(o.get('P500:1')!, 90n));
  o.set('P500:4', o.get('P500:2')!);
  o.set('P500:13', o.get('P500:4')!);
  return o;
}

/**
 * Confronto: SOMA das linhas da memória marcadas com cada (registro, linha) × ECF (linha `E` do arquivo, ou o oráculo).
 * `marcadas` = [chave `REG:LINHA`, valor]; `resumo` = idem, uma a uma. Devolve as divergências (vazio = bate).
 */
export function confrontarMemoriaComEcf(
  marcadas: readonly (readonly [string, bigint])[],
  resumo: readonly (readonly [string, string, bigint])[],
  e: ReadonlyMap<string, bigint>,
  oraculo: ReadonlyMap<string, bigint>,
): { soma: Map<string, bigint>; divergencias: string[] } {
  const soma = new Map<string, bigint>();
  for (const [k, v] of marcadas) soma.set(k, (soma.get(k) ?? 0n) + v);
  const esperado = (k: string): bigint | undefined => e.get(k) ?? oraculo.get(k);
  const divergencias: string[] = [];
  for (const [k, v] of soma) {
    const x = esperado(k);
    if (x === undefined) divergencias.push(`${k}: marcada na memória, sem oráculo neste teste`);
    else if (x !== v) divergencias.push(`${k}: memória ${v} ≠ ECF ${x}`);
  }
  for (const [codigo, k, v] of resumo) if (esperado(k) !== v) divergencias.push(`RESUMO ${codigo} ${k}: ${v} ≠ ECF ${esperado(k)}`);
  for (const k of e.keys()) if (!soma.has(k)) divergencias.push(`${k}: linha E do arquivo sem passo na memória`);
  return { soma, divergencias };
}
