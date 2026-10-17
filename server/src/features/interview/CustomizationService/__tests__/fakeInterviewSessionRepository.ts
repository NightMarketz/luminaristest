import { randomUUID } from 'crypto';
import type { IInterviewSessionRepository } from '../../repositories/IInterviewSessionRepository';
import type {
  CreateInterviewSessionInput,
  IInterviewSessionRecord,
  SaveInterviewSessionStateInput,
} from '../../models/InterviewSession.model';

type Row = IInterviewSessionRecord & { expiresAt: Date; deletedAt: Date | null };

/**
 * Repositório falso de `InterviewSession` para os testes unitários — mesmo `where` do real (dono, soft-delete,
 * TTL, versão) e estado copiado por JSON, como a coluna `Json` faz. O real é exercido no teste de integração.
 */
export class FakeInterviewSessionRepository implements IInterviewSessionRepository {
  readonly rows = new Map<string, Row>();

  async create(input: CreateInterviewSessionInput): Promise<IInterviewSessionRecord> {
    const row: Row = {
      id: randomUUID(),
      userId: input.userId,
      presetKey: input.presetKey,
      version: 0,
      state: structuredClone(input.state),
      expiresAt: input.expiresAt,
      deletedAt: null,
    };
    this.rows.set(row.id, row);
    return this.toRecord(row);
  }

  async findActive(id: string, userId: string, now: Date): Promise<IInterviewSessionRecord | null> {
    const row = this.rows.get(id);
    if (!row || row.userId !== userId || row.deletedAt || row.expiresAt.getTime() <= now.getTime()) return null;
    return this.toRecord(row);
  }

  async saveState(input: SaveInterviewSessionStateInput): Promise<boolean> {
    const row = this.rows.get(input.id);
    if (!row || row.userId !== input.userId || row.deletedAt || row.expiresAt.getTime() <= input.now.getTime()) return false;
    if (row.version !== input.expectedVersion) return false;
    row.state = structuredClone(input.state);
    row.expiresAt = input.expiresAt;
    row.version += 1;
    return true;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.userId === userId && !row.deletedAt) row.deletedAt = new Date();
  }

  private toRecord(row: Row): IInterviewSessionRecord {
    return { id: row.id, userId: row.userId, presetKey: row.presetKey, version: row.version, state: structuredClone(row.state) };
  }
}
