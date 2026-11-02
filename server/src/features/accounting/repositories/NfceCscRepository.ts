import prisma from '../../../lib/prisma';
import type { NfceCsc, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { INfceCscRepository } from './INfceCscRepository';

/** Repositório Prisma de `nfce_cscs` (X10a PR-8). Zero regra de negócio. */
export class NfceCscRepository implements INfceCscRepository {
  public async findLive(scope: AccountingScope, ambiente: string, tx?: Prisma.TransactionClient): Promise<NfceCsc | null> {
    return (tx ?? prisma).nfceCsc.findFirst({ where: { ...accountingScopeWhere(scope), ambiente, deletedAt: null }, orderBy: [{ createdAt: 'desc' }] });
  }

  public async listLive(scope: AccountingScope): Promise<NfceCsc[]> {
    return prisma.nfceCsc.findMany({ where: { ...accountingScopeWhere(scope), deletedAt: null }, orderBy: [{ ambiente: 'asc' }] });
  }

  public async createShell(scope: AccountingScope, data: { ambiente: string; cscId: string; qrV3Recusado?: boolean }, tx: Prisma.TransactionClient): Promise<NfceCsc> {
    return tx.nfceCsc.create({ data: { ...accountingScopeWhere(scope), ...data } });
  }

  public async writeCipher(id: string, sealed: { cscCiphertext: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<NfceCsc> {
    return tx.nfceCsc.update({ where: { id }, data: { cscCiphertext: Buffer.from(sealed.cscCiphertext), keyVersion: sealed.keyVersion } });
  }

  public async markQrV3Recusado(id: string, tx: Prisma.TransactionClient): Promise<NfceCsc> {
    return tx.nfceCsc.update({ where: { id }, data: { qrV3Recusado: true } });
  }

  public async softDelete(id: string, tx: Prisma.TransactionClient): Promise<NfceCsc> {
    return tx.nfceCsc.update({ where: { id }, data: { deletedAt: new Date(), cscCiphertext: null } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
