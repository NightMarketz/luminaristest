import prisma from '../../../lib/prisma';
import type { FiscalCertificate, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IFiscalCertificateRepository, UpsertFiscalCertificateData } from './IFiscalCertificateRepository';

/** unitId da linha apagada: libera o @@unique([userId, unitId]) para o próximo certificado (padrão deletedServiceRef). */
export function deletedUnitId(id: string, unitId: string): string {
  return `${unitId}#deleted#${id}`;
}

/** Repositório Prisma de `fiscal_certificates`. Zero regra de negócio. */
export class FiscalCertificateRepository implements IFiscalCertificateRepository {
  public async findLive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<FiscalCertificate | null> {
    return (tx ?? prisma).fiscalCertificate.findFirst({ where: { ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async createShell(
    scope: AccountingScope,
    data: UpsertFiscalCertificateData,
    tx: Prisma.TransactionClient,
  ): Promise<FiscalCertificate> {
    return tx.fiscalCertificate.create({ data: { ...accountingScopeWhere(scope), ...data } });
  }

  public async writeSecret(
    id: string,
    data: UpsertFiscalCertificateData & { keyCiphertext: Uint8Array; certCiphertext: Uint8Array },
    tx: Prisma.TransactionClient,
  ): Promise<FiscalCertificate> {
    return tx.fiscalCertificate.update({
      where: { id },
      data: { ...data, keyCiphertext: Buffer.from(data.keyCiphertext), certCiphertext: Buffer.from(data.certCiphertext), setAt: new Date() },
    });
  }

  public async softDelete(id: string, unitId: string, tx: Prisma.TransactionClient): Promise<FiscalCertificate> {
    return tx.fiscalCertificate.update({
      where: { id },
      data: { deletedAt: new Date(), unitId: deletedUnitId(id, unitId), keyCiphertext: null, certCiphertext: null },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
