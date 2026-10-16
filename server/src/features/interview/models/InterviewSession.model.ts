import { AppError } from '../../../lib/errors';
import type { ICustomizationState } from './InterviewTypes';

/**
 * BE-INCR-INTERVIEW-SESSION (nó W4) — sessão de customização persistida (`InterviewSession`, F-W4-1 a).
 * `version` é o contador do update condicional (F-W4-4 a): o turno grava com a versão que leu.
 */
export interface IInterviewSessionRecord {
  id: string;
  userId: string;
  presetKey: string;
  version: number;
  state: ICustomizationState;
}

export interface CreateInterviewSessionInput {
  userId: string;
  presetKey: string;
  state: ICustomizationState;
  expiresAt: Date;
}

export interface SaveInterviewSessionStateInput {
  id: string;
  userId: string;
  /** Versão lida pelo turno; a gravação só acontece se a linha ainda estiver nela. */
  expectedVersion: number;
  state: ICustomizationState;
  expiresAt: Date;
  now: Date;
}

/**
 * Item 5 (F-W4-2 b): sessão inexistente, expirada, apagada **ou de outro usuário** — a mesma resposta nos quatro casos,
 * para não revelar que o id existe. 404.
 */
export class InterviewSessionNotFoundError extends AppError {
  constructor() {
    super('Sessão de customização não encontrada ou expirada.', 404, 'INTERVIEW_SESSION_NOT_FOUND');
    Object.setPrototypeOf(this, InterviewSessionNotFoundError.prototype);
  }
}

/** Item 12 (F-W4-4 a): outro turno gravou a sessão depois que este a leu (duas abas). 409. */
export class InterviewSessionConflictError extends AppError {
  constructor() {
    super('A customização foi alterada em outra aba. Envie a mensagem de novo.', 409, 'INTERVIEW_SESSION_CONFLICT');
    Object.setPrototypeOf(this, InterviewSessionConflictError.prototype);
  }
}

/** Os `catch` amplos dos serviços da entrevista relançam estes dois — o code próprio não pode virar 200. */
export function isInterviewSessionError(error: unknown): error is InterviewSessionNotFoundError | InterviewSessionConflictError {
  return error instanceof InterviewSessionNotFoundError || error instanceof InterviewSessionConflictError;
}
