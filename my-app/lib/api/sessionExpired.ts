/**
 * 401 numa chamada autenticada do apiClient = sessão expirada (não há rota de refresh no servidor). O client avisa por
 * este evento de `window` e o AuthProvider encerra a sessão na hora, como já faz no 401 do `/auth/me` — sem esperar a
 * próxima navegação (ACHADOS-2026-10-19 §3.5 item 4). Fora do módulo do client para o AuthContext poder importar.
 */
export const SESSION_EXPIRED_EVENT = 'luminaris:session-expired';

export function emitSessionExpired(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
