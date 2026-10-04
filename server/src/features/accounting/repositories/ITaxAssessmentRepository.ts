import type { Prisma, TaxAssessment } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Linha a gravar na confirmação (BRIEF item 14) — o serviço já calculou e passou os gates. */
export interface CreateTaxAssessmentData {
  unitId: string;
  anoCalendario: number;
  tributo: string;
  regime: string;
  forma: string;
  periodo: string;
  modo: string;
  codigoReceita: string;
  baseCents: bigint;
  devidoCents: bigint;
  deducoesCents: bigint;
  aPagarCents: bigint;
  saldoNegativoCents: bigint;
  memoria: Prisma.InputJsonValue;
  tabelaVersao: string;
  supersedesId: string | null;
  confirmedAt: Date;
}

export interface TaxAssessmentFilter {
  anoCalendario: number;
  periodo?: string;
  status?: string;
  tributo?: string;
}

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF item 12) — único lugar com `prisma.taxAssessment.*`. Chave = a PJ
 * (`scope.ownerUserId`, R8); o `unitId` gravado é proveniência e NÃO entra no where das leituras. Soft-delete: leituras
 * só veem `deletedAt: null`. Tx-aware para os gates da confirmação rodarem dentro da tx (item 14).
 */
export interface ITaxAssessmentRepository {
  create(scope: AccountingScope, data: CreateTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<TaxAssessment>;
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<TaxAssessment | null>;
  findMany(scope: AccountingScope, filter: TaxAssessmentFilter, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]>;
  /** CAS CONFIRMED → SUPERSEDED; `false` se a linha já não estava CONFIRMED (corrida). */
  markSuperseded(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<boolean>;
  /**
   * F-X7-7 (a): unidades da PJ, ≠ `scope.unitId`, com lançamento de razão (status de razão) na janela. Leitura de
   * `journal_entries` por dono — o repo de lançamentos é escopado por unidade e não tem essa consulta.
   */
  findOtherUnitsWithMovement(scope: AccountingScope, from: Date, to: Date, ledgerStatuses: readonly string[]): Promise<string[]>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
