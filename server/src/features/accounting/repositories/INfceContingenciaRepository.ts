import type { NfceContingencia, NfceContingenciaOrfa, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export type OrigemContingencia = 'AUTO' | 'MANUAL';
export const ORFA_STATUSES = ['PENDING', 'CANCELLED_SUBST', 'VOID_REQUESTED', 'FAILED'] as const;
export type OrfaStatus = (typeof ORFA_STATUSES)[number];

export interface CreateOrfaData {
  documentId: string;
  ambiente: string;
  serie: number;
  numero: bigint;
  chave: string;
}

export interface OrfaPatch {
  status?: OrfaStatus;
  voidId?: string | null;
  tentativas?: number;
  ultimoErro?: string | null;
}

/**
 * Contrato do repositório da contingência off-line da NFC-e (X10a PR-9): o estado por (unidade, ambiente) e a nota normal
 * órfã. Tenancy via AccountingScope; as listagens do job (`listOrfasPendentes`) são Prisma-diretas, como o
 * `listPending` do documento fiscal. Zero regra de negócio.
 */
export interface INfceContingenciaRepository {
  findEstado(scope: AccountingScope, ambiente: string, tx?: Prisma.TransactionClient): Promise<NfceContingencia | null>;
  /** Liga (ou re-liga) a contingência da unidade no ambiente — uma linha por (unidade, ambiente). */
  ligar(
    scope: AccountingScope,
    ambiente: string,
    data: { origem: OrigemContingencia; dhCont: Date; xJust: string },
    tx?: Prisma.TransactionClient,
  ): Promise<NfceContingencia>;
  /**
   * Desliga se ainda ativa — e, com `soOrigem`, só se a entrada vigente for dessa origem (a saída automática não derruba a
   * manual, decisão 8). Devolve `true` quando esta chamada desligou (a guarda roda no UPDATE: vale dentro da corrida).
   */
  desligar(scope: AccountingScope, ambiente: string, soOrigem?: OrigemContingencia, tx?: Prisma.TransactionClient): Promise<boolean>;
  createOrfa(scope: AccountingScope, data: CreateOrfaData, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa>;
  /**
   * Todas as unidades: as órfãs `PENDING` criadas antes de `olderThan`, em rodízio pela última vez em que o job as tocou
   * (`updatedAt`) — a que espera para sempre não toma o teto das outras. O job reconstrói o escopo de cada uma.
   */
  listOrfasPendentes(olderThan: Date, limit: number, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa[]>;
  listOrfasDosDocumentos(scope: AccountingScope, documentIds: readonly string[], tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa[]>;
  updateOrfa(id: string, patch: OrfaPatch, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
