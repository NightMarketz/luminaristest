import prisma from '../../../lib/prisma';
import type { Prisma, PscAuthorization, PscCredential } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IPscCredentialRepository, PscAuthorizationData, PscCredentialData } from './IPscCredentialRepository';

/** unitId da linha apagada: libera o @@unique([userId, unitId]) (padrão do FiscalCertificate). */
export function deletedPscUnitId(id: string, unitId: string): string {
  return `${unitId}#deleted#${id}`;
}

/** Repositório Prisma de `psc_credentials` + `psc_authorizations`. Zero regra de negócio. */
export class PscCredentialRepository implements IPscCredentialRepository {
  public async findLive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<PscCredential | null> {
    return (tx ?? prisma).pscCredential.findFirst({ where: { ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async createShell(scope: AccountingScope, data: PscCredentialData, tx: Prisma.TransactionClient): Promise<PscCredential> {
    return tx.pscCredential.create({ data: { ...accountingScopeWhere(scope), ...data } });
  }

  public async writeToken(
    id: string,
    token: { accessTokenCiphertext: Uint8Array; keyVersion: number },
    tx: Prisma.TransactionClient,
  ): Promise<PscCredential> {
    return tx.pscCredential.update({
      where: { id },
      data: { accessTokenCiphertext: Buffer.from(token.accessTokenCiphertext), keyVersion: token.keyVersion },
    });
  }

  public async softDelete(id: string, unitId: string, tx: Prisma.TransactionClient): Promise<PscCredential> {
    return tx.pscCredential.update({
      where: { id },
      data: { deletedAt: new Date(), unitId: deletedPscUnitId(id, unitId), accessTokenCiphertext: null },
    });
  }

  public async setConsumo(
    id: string,
    consumo: { consumoNoAno: number; consumoAno: number },
    tx: Prisma.TransactionClient,
  ): Promise<PscCredential> {
    return tx.pscCredential.update({ where: { id }, data: consumo });
  }

  public async createAuthorization(
    scope: AccountingScope,
    data: PscAuthorizationData,
    tx: Prisma.TransactionClient,
  ): Promise<PscAuthorization> {
    return tx.pscAuthorization.create({ data: { ...accountingScopeWhere(scope), ...data } });
  }

  public async writeVerifier(id: string, codeVerifierCiphertext: Uint8Array, tx: Prisma.TransactionClient): Promise<PscAuthorization> {
    return tx.pscAuthorization.update({ where: { id }, data: { codeVerifierCiphertext: Buffer.from(codeVerifierCiphertext) } });
  }

  public async findAuthorization(id: string): Promise<PscAuthorization | null> {
    return prisma.pscAuthorization.findUnique({ where: { id } });
  }

  public async consumeAuthorization(id: string, at: Date): Promise<boolean> {
    const r = await prisma.pscAuthorization.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at, codeVerifierCiphertext: null },
    });
    return r.count === 1;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
