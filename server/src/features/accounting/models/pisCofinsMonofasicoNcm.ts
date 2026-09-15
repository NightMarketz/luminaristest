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
 * FORA (default conservador do item 11 = sem crédito + warning, não desta tabela): combustíveis da Lei
 * 9.718/1998 art. 4º (a lei nomeia PRODUTOS, não NCM — a correspondência TIPI não está no corpus);
 * bebidas frias (Lei 10.833 art. 58-A foi REVOGADO pela Lei 13.097/2015 — regime atual fora do corpus).
 * Ambas entram quando a fonte entrar; até lá o item cai em `UNKNOWN`.
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
  p('3303', L10147), p('3304', L10147), p('3305', L10147), p('3306', L10147), p('3307', L10147), // "3303.00 a 33.07"
  p('34011190', L10147), p('34012010', L10147), p('96032100', L10147),

  // ── Lei 10.485/2002 art. 1º — veículos e máquinas (monofásico na revenda: art. 3º II) ────────
  p('8429', L10485_1), p('84324000', L10485_1), p('84328000', L10485_1), p('843320', L10485_1),
  p('84333000', L10485_1), p('84334000', L10485_1), p('84335', L10485_1),
  p('8701', L10485_1), p('8702', L10485_1), p('8703', L10485_1), p('8704', L10485_1), p('8705', L10485_1), p('8706', L10485_1),

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
/** CST tributados na saída do fornecedor — só estes habilitam o crédito (com NCM fora da tabela). */
export const CST_TRIBUTADO = ['01', '02'] as const;

/**
 * Classificação do item para o crédito (item 11): a NOTA manda quando diz "sem crédito"; a TABELA manda
 * quando a nota diz "tributado" mas o NCM é monofásico; sem CST ou CST fora dos dois alfabetos → UNKNOWN
 * (default conservador = sem crédito + warning).
 */
export function classifyPisCofinsItem(input: { ncm: string | null | undefined; cstPis: string | null; cstCofins: string | null }): {
  classe: PisCofinsItemClass;
  motivo: string;
} {
  const cst = input.cstPis ?? input.cstCofins;
  if (cst && (CST_SEM_CREDITO as readonly string[]).includes(cst)) return { classe: 'MONOFASICO', motivo: `CST ${cst} na nota` };
  const ncm8 = normalizeNcm(input.ncm);
  if (ncm8) {
    const rule = findMonofasicoRule(ncm8);
    if (rule) return { classe: 'MONOFASICO', motivo: `NCM ${ncm8} — ${rule.fonte}` };
  }
  if (cst && (CST_TRIBUTADO as readonly string[]).includes(cst) && ncm8) return { classe: 'TRIBUTADO', motivo: `CST ${cst}, NCM ${ncm8} fora da tabela monofásica` };
  return { classe: 'UNKNOWN', motivo: !cst ? 'item sem grupo PIS/COFINS (CST ausente)' : !ncm8 ? 'NCM ausente ou inválido' : `CST ${cst} fora de {01,02} e de {04..09}` };
}
