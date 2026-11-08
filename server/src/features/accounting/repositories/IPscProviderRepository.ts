import type { Prisma, PscProvider } from 'generated/prisma';

export interface PscProviderData {
  nome: string;
  baseUrl: string;
  clientId: string;
  cotaAnual: number | null;
  lifetimeMaxSegundos: number | null;
  algoritmos: string; // JSON
  habilitadoEm: Date | null;
}

/**
 * Contrato do repositório de `psc_providers` (X10a PR-7, E-2). Único lugar com `prisma.pscProvider.*`. Cadastro da
 * plataforma (sem tenancy). Leituras só de linha viva; sem `delete` físico.
 */
export interface IPscProviderRepository {
  listLive(): Promise<PscProvider[]>;
  findLive(id: string, tx?: Prisma.TransactionClient): Promise<PscProvider | null>;
  create(data: PscProviderData, tx: Prisma.TransactionClient): Promise<PscProvider>;
  update(id: string, data: Partial<PscProviderData>, tx: Prisma.TransactionClient): Promise<PscProvider>;
  writeSecret(id: string, secret: { clientSecretCipher: Uint8Array; keyVersion: number }, tx: Prisma.TransactionClient): Promise<PscProvider>;
  softDelete(id: string, tx: Prisma.TransactionClient): Promise<PscProvider>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
