import type { z } from 'zod';
import type { LinhaParaFormato } from './formatRegistry';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 (item 3) — os predicados genéricos com que as regras de formato se escrevem, movidos do
 * `formatoLinha.ts` sem mudança. Não conhecem nenhuma tabela: a borda de cada domínio os usa nas suas registrações.
 */

/** `null` quando `cond`; senão a mensagem. */
export const so = (cond: boolean, msg: string): string | null => (cond ? null : msg);
/** A linha não traz discriminador. */
export const semDisc = (l: LinhaParaFormato): boolean => l.discriminador === undefined || l.discriminador === null;
/** `null` quando o JSON passa no schema; senão a mensagem. */
export const jsonOk = (schema: z.ZodType, v: unknown, msg: string): string | null => (schema.safeParse(v).success ? null : msg);
/** `valorInt` em basis points (0..10000). */
export const bp = (l: LinhaParaFormato): boolean => (l.valorInt ?? -1) >= 0 && (l.valorInt ?? 0) <= 10_000;
