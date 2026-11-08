import type { Prisma } from 'generated/prisma';
import type { ITeammate, TeammateWrite } from '../models/Teammate.model';

/** Acesso a `teammates`. Toda leitura filtra `deletedAt: null` e o `userId` do dono (outro tenant ⇒ `null` ⇒ 404). */
export interface ITeammateRepository {
  create(userId: string, data: TeammateWrite, tx: Prisma.TransactionClient): Promise<ITeammate>;
  listLive(userId: string): Promise<ITeammate[]>;
  findLiveById(userId: string, id: string, tx?: Prisma.TransactionClient): Promise<ITeammate | null>;
  update(userId: string, id: string, data: Partial<TeammateWrite>, tx: Prisma.TransactionClient): Promise<ITeammate>;
  softDelete(userId: string, id: string): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
