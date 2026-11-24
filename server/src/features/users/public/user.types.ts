/**
 * API pública de `users` — o que outra feature importa para tipar o ator e comparar o papel
 * (ADR-MODULE-BOUNDARIES §10 e §12; dono, questionário, 24/11/2026: "Tudo em user.types.ts").
 * Arquivo `*.types.ts`: é o que service, policy e model de outra feature podem importar. Traz o tipo `IUser` e o
 * enum `Role`; a definição mora em `models/User.model`, aqui só se reexporta, por nome.
 */
export type { IUser } from '../models/User.model';
export { Role } from '../models/User.model';
