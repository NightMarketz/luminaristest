import type { Prisma, PscAuthorization, PscCredential } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface PscCredentialData {
  pscProviderId: string;
  titularCnpj: string;
  certificadoPem: string;
  certNotAfter: string;
  tokenExpiraEm: Date;
  escopo: string; // JSON
  consumoAno: number;
}

export interface PscAuthorizationData {
  actorUserId: string;
  pscProviderId: string;
  escopo: string; // JSON
  keyVersion: number;
  expiresAt: Date;
}

/**
 * Contrato do repositório de `psc_credentials` e `psc_authorizations` (X10a PR-7, E-3/E-4). Tenancy via
 * AccountingScope; credencial: leitura só da linha viva, soft-delete com rename do unitId + ciphertext zerado.
 */
export interface IPscCredentialRepository {
  findLive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<PscCredential | null>;
  createShell(scope: AccountingScope, data: PscCredentialData, tx: Prisma.TransactionClient): Promise<PscCredential>;
  writeToken(id: string, token: { accessTokenCiphertext: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<PscCredential>;
  softDelete(id: string, unitId: string, tx: Prisma.TransactionClient): Promise<PscCredential>;
  setConsumo(id: string, consumo: { consumoNoAno: number; consumoAno: number }, tx: Prisma.TransactionClient): Promise<PscCredential>;

  createAuthorization(scope: AccountingScope, data: PscAuthorizationData, tx: Prisma.TransactionClient): Promise<PscAuthorization>;
  writeVerifier(id: string, codeVerifierCiphertext: Uint8Array, tx: Prisma.TransactionClient): Promise<PscAuthorization>;
  findAuthorization(id: string): Promise<PscAuthorization | null>;
  /** Marca como usada só se ainda não usada (zera o verifier); false se outro callback chegou antes. */
  consumeAuthorization(id: string, at: Date): Promise<boolean>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
