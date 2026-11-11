/**
 * Leitor único de duração em ms do ambiente para os jobs (BRD F-71.1). Ausente ou vazio → `fallback`; presente e
 * não inteiro `>= min` → lança. Decisão do dono (10/11): config inválida falha no boot — quem chama no `start()`
 * do scheduler derruba a subida, em vez de cair no default em silêncio.
 */
export function readMsEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new Error(`Invalid ${name}='${raw}' — must be an integer >= ${min} (ms).`);
  return n;
}
