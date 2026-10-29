import type { NfceCsc, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Contrato do repositório de `nfce_cscs` (X10a PR-8). Tenancy via AccountingScope; leitura só da linha viva; soft-delete
 * com o ciphertext zerado.
 */
export interface INfceCscRepository {
  findLive(scope: AccountingScope, ambiente: string, tx?: Prisma.TransactionClient): Promise<NfceCsc | null>;
  listLive(scope: AccountingScope): Promise<NfceCsc[]>;
  createShell(scope: AccountingScope, data: { ambiente: string; cscId: string }, tx: Prisma.TransactionClient): Promise<NfceCsc>;
  writeCipher(id: string, sealed: { cscCiphertext: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<NfceCsc>;
  softDelete(id: string, tx: Prisma.TransactionClient): Promise<NfceCsc>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
