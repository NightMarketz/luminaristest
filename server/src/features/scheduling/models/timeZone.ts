/**
 * BE-INCR-ESCALA-BASE item 11 (F-ESC-13) — fuso da unidade.
 *
 * `units.timeZone` é IANA e validado por `Intl.supportedValuesOf('timeZone')`. Sem valor, quem resolve a hora local
 * cai no `fallback` que o chamador passa; o plugin (que não recebe injeção nem importa `paises/`) passa o fuso do
 * processo, que é o que a agenda usava antes desta escala.
 */
let supported: Set<string> | null = null;

export function isSupportedTimeZone(tz: string): boolean {
  if (!supported) supported = new Set(Intl.supportedValuesOf('timeZone'));
  return supported.has(tz);
}

/**
 * Fuso do processo Node (o comportamento da agenda antes da escala). O `TZ` do ambiente, quando é IANA válido, vem antes
 * do `Intl`: no Node os dois coincidem (o `TZ` define o fuso do processo), e lendo o `TZ` o fuso segue o `process.env`
 * que o jest isola por arquivo (item 30: regressão em `TZ=UTC` e `TZ=America/Sao_Paulo` no mesmo processo).
 */
export function processTimeZone(): string {
  const tz = process.env.TZ;
  // `UTC` não está em `Intl.supportedValuesOf` (que lista só as zonas canônicas), mas é fuso válido do processo.
  return tz && (tz === 'UTC' || isSupportedTimeZone(tz)) ? tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** O fuso da unidade quando válido; senão o `fallback`. */
export function resolveTimeZone(unitTimeZone: unknown, fallback: string = processTimeZone()): string {
  return typeof unitTimeZone === 'string' && isSupportedTimeZone(unitTimeZone) ? unitTimeZone : fallback;
}
