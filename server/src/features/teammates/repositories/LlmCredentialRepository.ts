import prisma from '../../../lib/prisma';
import type { LlmCredential, Prisma } from 'generated/prisma';
import { NotFoundError } from '../../../lib/errors';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';
import type { ILlmCredential, ILlmCredentialSealed } from '../models/LlmCredential.model';
import type { ILlmCredentialRepository } from './ILlmCredentialRepository';

/** Repositório Prisma de `llm_credentials` (BE-INCR-TEAMMATES PR-1, item 7). Zero regra de negócio. */
export class LlmCredentialRepository implements ILlmCredentialRepository {
  public async createShell(
    data: { userId: string; provider: LlmProviderId; last4: string; monthlyTokenBudget: number | null },
    tx: Prisma.TransactionClient,
  ): Promise<ILlmCredential> {
    const row = await tx.llmCredential.create({ data: { ...data, secret: Buffer.alloc(0), keyVersion: 0 } });
    return toDomain(row);
  }

  public async writeSecret(id: string, sealed: { secret: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<void> {
    await tx.llmCredential.update({ where: { id }, data: { secret: Buffer.from(sealed.secret), keyVersion: sealed.keyVersion } });
  }

  public async listLive(userId: string): Promise<ILlmCredential[]> {
    const rows = await prisma.llmCredential.findMany({ where: { userId, deletedAt: null }, orderBy: [{ provider: 'asc' }] });
    return rows.map(toDomain);
  }

  public async findLiveById(userId: string, id: string): Promise<ILlmCredential | null> {
    const row = await prisma.llmCredential.findFirst({ where: { id, userId, deletedAt: null } });
    return row ? toDomain(row) : null;
  }

  public async findLiveSealed(userId: string, provider: LlmProviderId): Promise<ILlmCredentialSealed | null> {
    const row = await prisma.llmCredential.findFirst({ where: { userId, provider, deletedAt: null } });
    return row ? { ...toDomain(row), secret: row.secret, keyVersion: row.keyVersion } : null;
  }

  public async softDelete(userId: string, id: string, tx: Prisma.TransactionClient): Promise<void> {
    // Padrão rename-on-delete (ADR-INCR7 §3; ReconciliationRepository.softDeleteStatement): `deleted:<id>` libera o
    // @@unique([userId, provider]) para recadastrar o mesmo provedor. O blob é apagado junto (como o NfceCscRepository).
    const { count } = await tx.llmCredential.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), provider: `deleted:${id}`, secret: Buffer.alloc(0) },
    });
    if (count === 0) throw new NotFoundError('Credencial não encontrada.');
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

function toDomain(row: LlmCredential): ILlmCredential {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as LlmProviderId,
    last4: row.last4,
    monthlyTokenBudget: row.monthlyTokenBudget,
    createdAt: row.createdAt,
  };
}
