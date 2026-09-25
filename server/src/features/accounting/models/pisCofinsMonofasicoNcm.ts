/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — F-X6-7 → (a) (ratificado 2026-09-15): tabela de NCM sob regime
 * MONOFÁSICO / alíquota zero de PIS/COFINS, transcrita das LEIS no corpus (`docs/accounting/fontes-oficiais/`,
 * MANIFEST 2026-09-15), com artigo citado por entrada. Serve à regra do item 11 (EMENDA 2026-09-15): item
 * cujo NCM casa aqui NÃO gera crédito de PIS/COFINS na aquisição (Lei 10.833/2003 art. 3º §2º II —
 * `Lei-10833-2003-COFINS.html`), mesmo que a nota do fornecedor traga CST tributado.
 *
 * Forma: cada entrada é um PREFIXO de dígitos do NCM (posição `30.04` → `3004`; item `3002.10.1` →
 * `3002101`; código `3401.11.90` → `34011190`), casado por `startsWith` sobre o NCM de 8 dígitos da nota
 * (`prod/NCM`). `exceto` lista códigos EXATOS excluídos pela própria lei. "Ex 01/03/05" (exceções da TIPI
 * dentro de um código) NÃO são avaliáveis pelo NCM — conservador: o código inteiro conta como monofásico
 * (sem crédito), nunca o contrário.
 *
 * Bebidas frias: Lei 13.097/2015 art. 14 (transcrição `TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`,
 * chaves `L13097-art14-I..IV`) — sem crédito pela leitura do VAREJISTA (arts. 28+29); o crédito pelo valor da
 * nota do não-varejista (art. 30) NÃO é modelado (conservador = sem crédito).
 * Combustíveis: a Lei 9.718/1998 art. 4º nomeia PRODUTOS, não NCM. A correspondência produto → NCM vem da
 * **Tabela 4.3.10 da EFD-Contribuições v1.25** (corpus `tabela-4310-efd`; transcrição §B.1, chaves `T4310-NNN`),
 * só com as linhas de "Término de Escrituração" VAZIO — as encerradas (2710.11.59, 3824.90.29, 2207.10.00 pós
 * 30/04/2025) ficam de fora de propósito. `2208.90.00 Ex 01` (álcool dentro de código de bebida) NÃO entra: aqui
 * o conservador é o inverso do usual — marcar a posição inteira classificaria bebida comum como sem crédito.
 *
 * Guarda: `__tests__/pisCofinsMonofasicoNcm.test.ts` assere que toda `fonte` cita lei+artigo do MANIFEST
 * e que nenhum prefixo é vazio/não-numérico.
 */

export interface MonofasicoNcmRule {
  /** Prefixo de dígitos do NCM (sem pontos). */
  prefixo: string;
  /** Códigos exatos (8 dígitos) que a lei EXCLUI da posição. */
  exceto?: readonly string[];
  fonte: string;
}

const L10147 = 'Lei 10.147/2000 art. 1º (Lei-10147-2000-monofasico-farmacia.html)';
const L10485_1 = 'Lei 10.485/2002 art. 1º + art. 3º II (Lei-10485-2002-monofasico-autopecas.html)';
const L10485_A1 = 'Lei 10.485/2002 art. 3º I, Anexo I (Lei-10485-2002-monofasico-autopecas.html)';
const L10485_A2 = 'Lei 10.485/2002 art. 3º I, Anexo II (Lei-10485-2002-monofasico-autopecas.html)';
const L13097 = (inciso: string) => `Lei 13.097/2015 art. 14 ${inciso} (Lei-13097-2015-bebidas-frias.html)`;
const T4310 = (codigo: string, produto: string) =>
  `Tabela 4.3.10 EFD-Contribuições v1.25 código ${codigo} — ${produto} (TABELA-4310-EFD-CONTRIBUICOES-v1.25.txt)`;

const p = (prefixo: string, fonte: string, exceto?: readonly string[]): MonofasicoNcmRule =>
  exceto ? { prefixo, exceto, fonte } : { prefixo, fonte };

export const PIS_COFINS_MONOFASICO_NCM: readonly MonofasicoNcmRule[] = [
  // ── Lei 10.147/2000 art. 1º — farmacêuticos, perfumaria, higiene ────────────────────────────
  p('3001', L10147),
  p('3003', L10147, ['30039056']),
  p('3004', L10147, ['30049046']),
  p('3002101', L10147), p('3002102', L10147), p('3002103', L10147),
  p('3002201', L10147), p('3002202', L10147),
  p('3006301', L10147), p('3006302', L10147),
  p('30029020', L10147), p('30029092', L10147), p('30029099', L10147),
  p('30051010', L10147), p('30066000', L10147),
  p('3303', L10147), p('3304', L10147), p('3305', L10147), p('3307', L10147), // "3303.00 a 33.07, exceto na posição 33.06" (red. Lei 12.839/2013)
  p('34011190', L10147), p('34012010', L10147), p('96032100', L10147),

  // ── Lei 10.485/2002 art. 1º — veículos e máquinas (monofásico na revenda: art. 3º II) ────────
  // Redação vigente (Lei 12.973/2014): "73.09, 7310.29, 7612.90.12, 8424.81, 84.29, 8430.69.90, 84.32, 84.33, 84.34,
  // 84.35, 84.36, 84.37, 87.01, 87.02, 87.03, 87.04, 87.05, 87.06 e 8716.20.00" — NÃO a lista de 2004 (8432.40.00…).
  p('7309', L10485_1), p('731029', L10485_1), p('76129012', L10485_1), p('842481', L10485_1), p('8429', L10485_1),
  p('84306990', L10485_1), p('8432', L10485_1), p('8433', L10485_1), p('8434', L10485_1), p('8435', L10485_1),
  p('8436', L10485_1), p('8437', L10485_1),
  p('8701', L10485_1), p('8702', L10485_1), p('8703', L10485_1), p('8704', L10485_1), p('8705', L10485_1), p('8706', L10485_1),
  p('87162000', L10485_1),

  // ── Lei 10.485/2002 Anexo I — autopeças (alíquota zero na revenda, art. 3º I) ────────────────
  p('40161010', L10485_A1), p('40169990', L10485_A1), p('6813', L10485_A1), p('70071100', L10485_A1),
  p('70072100', L10485_A1), p('70091000', L10485_A1), p('73201000', L10485_A1), p('83012000', L10485_A1),
  p('83023000', L10485_A1), p('84073390', L10485_A1), p('84073490', L10485_A1), p('840820', L10485_A1),
  p('840991', L10485_A1), p('840999', L10485_A1), p('841330', L10485_A1), p('84139100', L10485_A1),
  p('84148021', L10485_A1), p('84148022', L10485_A1), p('841520', L10485_A1), p('84212300', L10485_A1),
  p('84213100', L10485_A1), p('84314100', L10485_A1), p('84314200', L10485_A1), p('84339090', L10485_A1),
  p('84818099', L10485_A1), p('848310', L10485_A1), p('84832000', L10485_A1), p('848330', L10485_A1),
  p('848340', L10485_A1), p('848350', L10485_A1), p('850520', L10485_A1), p('85071000', L10485_A1),
  p('8511', L10485_A1), p('851220', L10485_A1), p('85123000', L10485_A1), p('851240', L10485_A1),
  p('85129000', L10485_A1), p('85272', L10485_A1), p('85365090', L10485_A1), p('853910', L10485_A1),
  p('85443000', L10485_A1), p('870600', L10485_A1), p('8707', L10485_A1), p('8708', L10485_A1),
  p('90292010', L10485_A1), p('90299010', L10485_A1), p('90303921', L10485_A1), p('90318040', L10485_A1),
  p('9032892', L10485_A1), p('91040000', L10485_A1), p('94012000', L10485_A1),

  // ── Lei 10.485/2002 Anexo II — peças "próprias para" veículos/máquinas (condição de uso NÃO é
  //    avaliável pelo NCM: conservador = a posição inteira conta como monofásica) ────────────────
  p('4009', L10485_A2), p('8431', L10485_A2), p('84089090', L10485_A2), p('84122110', L10485_A2),
  p('84122190', L10485_A2), p('84123110', L10485_A2), p('84136019', L10485_A2), p('84148019', L10485_A2),
  p('84149039', L10485_A2), p('84329000', L10485_A2), p('84811000', L10485_A2), p('84812090', L10485_A2),
  p('84818092', L10485_A2), p('8483601', L10485_A2), p('85011019', L10485_A2),

  // ── Lei 13.097/2015 art. 14 — bebidas frias. "Ex" da TIPI não é avaliável pelo NCM: conservador = o
  //    código inteiro conta (2106.90.10 só vale no Ex 02; 22.01/22.02 excluem Ex de 2201.10.00/2202.90.00) ─
  p('21069010', L13097('I')), p('2201', L13097('II')), p('2202', L13097('III')), p('2203', L13097('IV')),

  // ── Tabela 4.3.10 da EFD-Contribuições v1.25 (30.03.2026), grupo COMBUSTÍVEIS — só linhas VIGENTES
  //    (término vazio). Os códigos 105–108 e 150–153 (correntes, nafta) trazem NCM `-` na fonte e por isso
  //    não têm entrada: sem NCM, a classificação cai no caminho do CST. ────────────────────────────────────
  p('27101259', T4310('101', 'gasolinas, exceto de aviação')),
  p('27101921', T4310('102', 'óleo diesel')),
  p('27111910', T4310('103', 'GLP')),
  p('27101911', T4310('104', 'querosene de aviação')),
  p('38260000', T4310('109', 'biodiesel')),
  p('220710', T4310('112/117', 'álcool, inclusive para fins carburantes')),
  p('2207201', T4310('112/117', 'álcool, inclusive para fins carburantes')),
];

export type PisCofinsItemClass = 'MONOFASICO' | 'TRIBUTADO' | 'UNKNOWN';

/** Normaliza `prod/NCM` (I05) para 8 dígitos; NCM vazio/inválido → null (→ UNKNOWN). */
export function normalizeNcm(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

/** A regra que casa o NCM (prefixo, respeitando `exceto`), ou null. */
export function findMonofasicoRule(ncm8: string): MonofasicoNcmRule | null {
  for (const rule of PIS_COFINS_MONOFASICO_NCM) {
    if (ncm8.startsWith(rule.prefixo) && !(rule.exceto ?? []).includes(ncm8)) return rule;
  }
  return null;
}

/** CST de PIS/COFINS de SAÍDA do fornecedor que já declaram "sem crédito" na aquisição (item 11, regra dura; §4 f9 [NC]). */
export const CST_SEM_CREDITO = ['04', '05', '06', '07', '08', '09'] as const;
/**
 * CST tributado na saída do fornecedor que habilita o crédito com NCM fora da tabela. O 02 ("alíquota
 * diferenciada", saída típica do monofásico) credita pela alíquota básica COM alerta — posição do contador
 * (TRIAGEM-RESPOSTA-CONTADOR-2026-09-23 item 8).
 */
export const CST_TRIBUTADO = ['01', '02'] as const;

/**
 * Classificação do item para o crédito (item 11 + triagem do contador P5): o NCM decide — NCM na tabela →
 * MONOFASICO qualquer que seja o CST; CST 04 (monofásico) com NCM fora da tabela → TRIBUTADO + `alerta` de CST
 * divergente (F-PC-2 a: só no `warnings` da importação). CST 05..09 da nota seguem mandando (sem crédito); sem
 * CST ou CST fora dos alfabetos → UNKNOWN (default conservador = sem crédito + warning).
 */
export function classifyPisCofinsItem(input: { ncm: string | null | undefined; cstPis: string | null; cstCofins: string | null }): {
  classe: PisCofinsItemClass;
  motivo: string;
  alerta?: string;
} {
  const cst = input.cstPis ?? input.cstCofins;
  const ncm8 = normalizeNcm(input.ncm);
  const rule = ncm8 ? findMonofasicoRule(ncm8) : null;
  if (rule) return { classe: 'MONOFASICO', motivo: `NCM ${ncm8} — ${rule.fonte}` };
  if (cst === '04' && ncm8) {
    return { classe: 'TRIBUTADO', motivo: `NCM ${ncm8} fora da tabela monofásica`, alerta: `CST 04 (monofásico) diverge do NCM ${ncm8}, fora da tabela monofásica — o NCM decide: crédito calculado` };
  }
  if (cst && (CST_SEM_CREDITO as readonly string[]).includes(cst)) return { classe: 'MONOFASICO', motivo: `CST ${cst} na nota` };
  if (cst && (CST_TRIBUTADO as readonly string[]).includes(cst) && ncm8) {
    const motivo = `CST ${cst}, NCM ${ncm8} fora da tabela monofásica`;
    return cst === '02'
      ? { classe: 'TRIBUTADO', motivo, alerta: `CST 02 (alíquota diferenciada) com NCM ${ncm8} fora da tabela monofásica — crédito pela alíquota básica; confira o produto` }
      : { classe: 'TRIBUTADO', motivo };
  }
  return {
    classe: 'UNKNOWN',
    motivo: !cst ? 'item sem grupo PIS/COFINS (CST ausente)' : !ncm8 ? 'NCM ausente ou inválido' : `CST ${cst} fora de {01,02} e de {04..09}`,
  };
}
