/** Papel atribuível pelo formulário de usuários (contrato do BE: USER | ADMIN). */
export type Role = 'USER' | 'ADMIN';

/**
 * Papel da SESSÃO (o que `/me` pode devolver): inclui PLATFORM_ADMIN (BE-INCR-LEGAL-PARAMS F-LP-2 b), que publica
 * coeficientes de lei para todos os clientes e só se concede por CLI (L-2) — por isso fica fora de `Role`.
 */
export type SessionRole = Role | 'PLATFORM_ADMIN';

export const Roles = {
  USER: 'USER' as Role,
  ADMIN: 'ADMIN' as Role,
} as const;
