/**
 * Marca de "o usuário já foi avisado" num erro (F1-N3). O apiClient marca o erro que rejeita: `true` quando
 * mostrou o toast, `false` com `silent`. Quem captura o erro decide com `wasNotified` se ainda precisa avisar,
 * sem repetir o toast. A propriedade é não enumerável: `{ ...err }` continua sendo só o corpo + `status`.
 */
export function markNotified<T extends object>(err: T, notified: boolean): T {
  Object.defineProperty(err, 'notified', { value: notified, enumerable: false, configurable: true });
  return err;
}

export function wasNotified(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { notified?: unknown }).notified === true;
}
