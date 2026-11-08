import type { Prisma } from 'generated/prisma';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';
import type { ILlmCredential, ILlmCredentialSealed } from '../models/LlmCredential.model';

/** Acesso a `llm_credentials`. Toda leitura filtra `deletedAt: null` e o `userId` do dono. */
export interface ILlmCredentialRepository {
  /** Cria a linha com segredo vazio (o AAD da cifra é o id, que só existe depois do insert). */
  createShell(
    data: { userId: string; provider: LlmProviderId; last4: string; monthlyTokenBudget: number | null },
    tx: Prisma.TransactionClient,
  ): Promise<ILlmCredential>;
  /** Grava o blob cifrado na linha recém-criada. */
  writeSecret(id: string, sealed: { secret: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<void>;
  listLive(userId: string): Promise<ILlmCredential[]>;
  findLiveById(userId: string, id: string): Promise<ILlmCredential | null>;
  /** A credencial viva do tenant para o provedor, com o blob (item 8). */
  findLiveSealed(userId: string, provider: LlmProviderId): Promise<ILlmCredentialSealed | null>;
  /** Soft-delete que reescreve `provider` para `deleted:<id>` e libera o `@@unique([userId, provider])`. */
  softDelete(userId: string, id: string, tx: Prisma.TransactionClient): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
