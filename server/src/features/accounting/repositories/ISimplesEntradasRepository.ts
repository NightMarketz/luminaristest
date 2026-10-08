import type { Prisma, SalaoParceriaContrato, SimplesHistoricoMensal, SimplesSegregacaoManual } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, itens 10–11) — campos gravados no histórico pré-adoção. */
export interface HistoricoData {
  receitaBrutaCents: bigint;
  folhaCents: bigint | null;
  sourceDocumentId: string | null;
}

/** Item 13 — campos do contrato de parceria (o DTO já validou). */
export interface ParceriaData {
  profissionalContactId: string;
  cotaSalaoBp: number;
  naturezaCota: string;
  homologadoEm: string;
  sindicato: string;
  vigenteDesde: string;
  vigenteAte: string | null;
}

/**
 * Contrato do repositório das entradas do Simples (histórico, segregação manual, contratos de parceria). Único lugar
 * com `prisma.simplesHistoricoMensal/simplesSegregacaoManual/salaoParceriaContrato`. Chave = escopo (PJ + unidade).
 * Zero regra de negócio.
 */
export interface ISimplesEntradasRepository {
  upsertHistorico(scope: AccountingScope, competencia: string, data: HistoricoData, tx?: Prisma.TransactionClient): Promise<SimplesHistoricoMensal>;
  findHistorico(scope: AccountingScope, competencias: readonly string[], tx?: Prisma.TransactionClient): Promise<SimplesHistoricoMensal[]>;
  upsertSegregacao(scope: AccountingScope, competencia: string, parcelas: Prisma.InputJsonValue, tx?: Prisma.TransactionClient): Promise<SimplesSegregacaoManual>;
  findSegregacao(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<SimplesSegregacaoManual | null>;
  /** O `SourceDocument` existe no mesmo escopo? (o extrato anexado ao histórico). */
  sourceDocumentExists(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<boolean>;

  createParceria(scope: AccountingScope, data: ParceriaData, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato>;
  updateParceria(scope: AccountingScope, id: string, data: Partial<ParceriaData>, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato>;
  softDeleteParceria(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<void>;
  /** Não removido, no escopo. */
  findParceria(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato | null>;
  listParcerias(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato[]>;
  /** Contratos não removidos do profissional na unidade (o serviço filtra vigência e homologação). */
  findParceriasDoProfissional(scope: AccountingScope, profissionalContactId: string, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato[]>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
