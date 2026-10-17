import type {
  CreateInterviewSessionInput,
  IInterviewSessionRecord,
  SaveInterviewSessionStateInput,
} from '../models/InterviewSession.model';

/**
 * Acesso a `InterviewSession` (BRIEF W4 item 2). Todo read filtra dono, soft-delete e TTL num só `where`;
 * nunca hard-delete (o expurgo é do `PurgeDeletedRecords`).
 */
export interface IInterviewSessionRepository {
  create(input: CreateInterviewSessionInput): Promise<IInterviewSessionRecord>;
  /** `null` se inexistente, de outro `userId`, apagada ou com `expiresAt <= now`. */
  findActive(id: string, userId: string, now: Date): Promise<IInterviewSessionRecord | null>;
  /**
   * Update condicional (F-W4-4 a): grava `state`/`expiresAt` e incrementa `version` só se a linha ativa ainda estiver
   * em `expectedVersion`. `false` = nada gravado (outra versão, ou a sessão deixou de estar ativa).
   */
  saveState(input: SaveInterviewSessionStateInput): Promise<boolean>;
  /** Consumidor: W1 (depois do `/dashboard/create`). */
  softDelete(id: string, userId: string): Promise<void>;
}
