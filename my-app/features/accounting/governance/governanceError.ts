import { resolveErrorWithCode } from '../lib/resolveError';
import { GOVERNANCE_ERROR_FALLBACK, GOVERNANCE_ERROR_KEYS } from './GovernanceScope';

type TFn = (key: string, fallback: string, vars?: Record<string, string>) => string;

/**
 * Tradução do `code` nomeado do servidor (BRIEF §1) para a mensagem da tela; `code` fora do mapa cai na mensagem
 * crua do servidor (`resolveErrorWithCode`), nunca num texto inventado. `vars` alimenta `{{name}}`/`{{crc}}`.
 */
export function resolveGovernanceError(
  err: unknown,
  t: TFn,
  fallback: string,
  vars: Record<string, string> = {},
): { message: string; code?: string } {
  const { message, code } = resolveErrorWithCode(err, fallback);
  if (code && GOVERNANCE_ERROR_KEYS[code]) {
    return { message: t(GOVERNANCE_ERROR_KEYS[code], GOVERNANCE_ERROR_FALLBACK[code], vars), code };
  }
  return { message, code };
}
