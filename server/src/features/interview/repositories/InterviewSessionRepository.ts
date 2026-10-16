import prisma from '../../../lib/prisma';
import { Prisma } from 'generated/prisma';
import type { ICustomizationState } from '../models/InterviewTypes';
import type {
  CreateInterviewSessionInput,
  IInterviewSessionRecord,
  SaveInterviewSessionStateInput,
} from '../models/InterviewSession.model';
import type { IInterviewSessionRepository } from './IInterviewSessionRepository';

type InterviewSessionRow = {
  id: string;
  userId: string;
  presetKey: string;
  version: number;
  state: Prisma.JsonValue;
};

/**
 * Repository de `InterviewSession`. Único lugar com prisma.* para esta entidade.
 */
export class InterviewSessionRepository implements IInterviewSessionRepository {
  private static readonly selection = {
    id: true,
    userId: true,
    presetKey: true,
    version: true,
    state: true,
  } as const;

  public async create(input: CreateInterviewSessionInput): Promise<IInterviewSessionRecord> {
    const row = await prisma.interviewSession.create({
      data: {
        user: { connect: { id: input.userId } },
        presetKey: input.presetKey,
        state: input.state as unknown as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
      },
      select: InterviewSessionRepository.selection,
    });
    return this.mapToDomain(row);
  }

  public async findActive(id: string, userId: string, now: Date): Promise<IInterviewSessionRecord | null> {
    const row = await prisma.interviewSession.findFirst({
      where: { id, userId, deletedAt: null, expiresAt: { gt: now } },
      select: InterviewSessionRepository.selection,
    });
    return row ? this.mapToDomain(row) : null;
  }

  public async saveState(input: SaveInterviewSessionStateInput): Promise<boolean> {
    const { count } = await prisma.interviewSession.updateMany({
      where: {
        id: input.id,
        userId: input.userId,
        version: input.expectedVersion,
        deletedAt: null,
        expiresAt: { gt: input.now },
      },
      data: {
        state: input.state as unknown as Prisma.InputJsonValue,
        expiresAt: input.expiresAt,
        version: { increment: 1 },
      },
    });
    return count === 1;
  }

  public async softDelete(id: string, userId: string): Promise<void> {
    await prisma.interviewSession.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private mapToDomain(row: InterviewSessionRow): IInterviewSessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      presetKey: row.presetKey,
      version: row.version,
      state: row.state as unknown as ICustomizationState,
    };
  }
}
