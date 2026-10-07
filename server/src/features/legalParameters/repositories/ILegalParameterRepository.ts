import type { LegalParameter, Prisma } from 'generated/prisma';

export interface CreateLegalParameterData {
  tabela: string;
  chave: string;
  discriminador: string | null;
  valorInt: number | null;
  valorTexto: string | null;
  valorJson: string | null;
  fonte: string;
  fonteUrl: string | null;
  fonteSha256: string | null;
  vigenteDesde: string;
  vigenteAte: string | null;
  supersedesId: string | null;
  motivo: string;
  proposedById: string;
}

/**
 * Contrato do repositório de `legal_parameters` (BE-INCR-LEGAL-PARAMS PR-1). Único lugar com `prisma.legalParameter.*`.
 * Sem `delete` e sem update de conteúdo: só as transições de status (emenda §9 L-6).
 */
export interface ILegalParameterRepository {
  create(data: CreateLegalParameterData, tx?: Prisma.TransactionClient): Promise<LegalParameter>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<LegalParameter | null>;
  findMany(filter: { tabela?: string; status?: string }, tx?: Prisma.TransactionClient): Promise<LegalParameter[]>;
  /** Linhas PUBLISHED das tabelas (todas as chaves) — a fonte da fotografia. */
  findPublished(tabelas: readonly string[], tx?: Prisma.TransactionClient): Promise<LegalParameter[]>;
  /** `DRAFT → PUBLISHED` condicional ao status (CAS): `false` se a linha já não era DRAFT. */
  markPublished(id: string, actorId: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean>;
  /** `PUBLISHED → REVOKED` condicional ao status (CAS). */
  markRevoked(id: string, actorId: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
