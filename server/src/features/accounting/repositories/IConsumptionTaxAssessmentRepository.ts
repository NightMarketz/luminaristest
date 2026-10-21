import type { ConsumptionTaxAssessment, Prisma } from 'generated/prisma';

/** Dados para gravar uma linha confirmada (um tributo × mês). */
export interface CreateConsumptionTaxAssessmentData {
  userId: string;
  unitId: string;
  anoCalendario: number;
  mes: number;
  tributo: string;
  regime: string;
  debitosCents: bigint;
  creditosCents: bigint;
  saldoCents: bigint;
  memoria: Prisma.InputJsonValue;
  parametrosIds: Prisma.InputJsonValue;
  parametrosSha256: string;
  entradaInformada?: Prisma.InputJsonValue;
  avisoParametroLegal?: string | null;
  status: string;
  supersedesId: string | null;
  confirmedById: string;
  confirmedAt: Date;
}

/**
 * Contrato do repositório de `consumption_tax_assessments` (IBS-CBS-2027 PR-2, BRIEF item 8). Único lugar com
 * `prisma.consumptionTaxAssessment.*`. Chave = a PJ (`ownerUserId`, R8); `unitId` é proveniência. Só linha viva
 * (`deletedAt: null`). Wrapper fino (molde `ITaxAssessmentRepository`): CAS, um-só-CONFIRMED e ordem moram no service;
 * o seam de tx é `runTransaction` (memória "serviço não instancia tx-repo").
 */
export interface IConsumptionTaxAssessmentRepository {
  create(data: CreateConsumptionTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment>;
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment | null>;
  /** Todas as linhas vivas do ano (CONFIRMED e SUPERSEDED), ordenadas por mês, tributo, confirmação. */
  findByYear(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** Linhas vivas `CONFIRMED` do tributo no ano. */
  findConfirmed(ownerUserId: string, anoCalendario: number, tributo: string, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** Linhas vivas `SUPERSEDED` do (PJ, ano, mês, tributo) — o estorno da reclassificação as acha. */
  findSuperseded(ownerUserId: string, anoCalendario: number, mes: number, tributo: string): Promise<ConsumptionTaxAssessment[]>;
  /** `CONFIRMED` → `SUPERSEDED` com CAS no status; devolve quantas mudaram. */
  markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number>;
  /** Item 12, commit 2: CAS `where provisaoEntryId is null`; `false` se outra chamada já vinculou. */
  setProvisaoEntryId(ownerUserId: string, id: string, entryId: string): Promise<boolean>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
