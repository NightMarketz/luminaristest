import prisma from '../../../lib/prisma';
import type { Prisma, PscProvider } from 'generated/prisma';
import type { IPscProviderRepository, PscProviderData } from './IPscProviderRepository';

/** Repositório Prisma de `psc_providers`. Zero regra de negócio. */
export class PscProviderRepository implements IPscProviderRepository {
  public async listLive(): Promise<PscProvider[]> {
    return prisma.pscProvider.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
  }

  public async findLive(id: string, tx?: Prisma.TransactionClient): Promise<PscProvider | null> {
    return (tx ?? prisma).pscProvider.findFirst({ where: { id, deletedAt: null } });
  }

  public async create(data: PscProviderData, tx: Prisma.TransactionClient): Promise<PscProvider> {
    return tx.pscProvider.create({ data });
  }

  public async update(id: string, data: Partial<PscProviderData>, tx: Prisma.TransactionClient): Promise<PscProvider> {
    return tx.pscProvider.update({ where: { id }, data });
  }

  public async writeSecret(
    id: string,
    secret: { clientSecretCipher: Uint8Array; keyVersion: number },
    tx: Prisma.TransactionClient,
  ): Promise<PscProvider> {
    return tx.pscProvider.update({
      where: { id },
      data: { clientSecretCipher: Buffer.from(secret.clientSecretCipher), keyVersion: secret.keyVersion },
    });
  }

  public async softDelete(id: string, tx: Prisma.TransactionClient): Promise<PscProvider> {
    return tx.pscProvider.update({ where: { id }, data: { deletedAt: new Date(), clientSecretCipher: null, habilitadoEm: null } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
