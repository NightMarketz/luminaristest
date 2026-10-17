import type { FiscalCertificate, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface UpsertFiscalCertificateData {
  keyVersion: number;
  cnpjCertificado: string;
  notBefore: string;
  notAfter: string;
  fingerprintSha256: string;
  setById: string | null;
}

/**
 * Contrato do repositório de `fiscal_certificates` (BE-INCR-DFE-ADN-EMISSOR PR-1). Único lugar com
 * `prisma.fiscalCertificate.*`. Tenancy via AccountingScope; leituras só de linha viva. Sem `delete`:
 * soft-delete é `softDelete` (rename do unitId + ciphertext zerado). Cifra e regras moram no service.
 */
export interface IFiscalCertificateRepository {
  findLive(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<FiscalCertificate | null>;
  /** Cria a linha (sem ciphertext) e devolve o id, que é o AAD da cifra. */
  createShell(scope: AccountingScope, data: UpsertFiscalCertificateData, tx: Prisma.TransactionClient): Promise<FiscalCertificate>;
  /** Grava ciphertext + projeções numa linha viva existente. */
  writeSecret(
    id: string,
    data: UpsertFiscalCertificateData & { keyCiphertext: Uint8Array; certCiphertext: Uint8Array },
    tx: Prisma.TransactionClient,
  ): Promise<FiscalCertificate>;
  softDelete(id: string, unitId: string, tx: Prisma.TransactionClient): Promise<FiscalCertificate>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
