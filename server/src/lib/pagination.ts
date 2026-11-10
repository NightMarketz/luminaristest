import { ValidationError } from './errors';

/**
 * Lê um parâmetro de paginação da query string (BRD F-04.2).
 *
 * Ausente (ou string vazia) → `fallback`. Presente e não inteiro positivo → `ValidationError` (400), em vez
 * de virar `NaN` ou o default em silêncio. Valor válido acima de `max` é limitado ao teto (política).
 */
export function parsePageParam(name: string, raw: unknown, fallback: number, max?: number): number {
  if (raw === undefined || raw === '') return fallback;
  const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ValidationError(`Parâmetro de paginação inválido: ${name} deve ser inteiro positivo`, {
      [name]: ['deve ser inteiro positivo'],
    });
  }
  return max !== undefined ? Math.min(value, max) : value;
}
