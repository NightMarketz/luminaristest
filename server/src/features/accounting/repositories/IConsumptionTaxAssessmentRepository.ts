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
  parametrosIds: string[];
  parametrosSha256: string;
  entradaInformada?: Prisma.InputJsonValue;
  avisoParametroLegal?: string | null;
  status: string;
  supersedesId: string | null;
  confirmedById: string;
  confirmedAt: Date;
}

/**
 * Contrato do repositório de `consumption_tax_assessments` (IBS-CBS-2027 PR-2, item 8). Único lugar com
 * `prisma.consumptionTaxAssessment.*`. A chave é a PJ (`ownerUserId`); o `unitId` da linha é proveniência. Leituras só de
 * linha viva. Wrapper fino: CAS, cascata e um-só-CONFIRMED moram no service. A tx é seam do repositório
 * (`runTransaction`; memória "serviço não instancia tx-repo").
 */
export interface IConsumptionTaxAssessmentRepository {
  create(data: CreateConsumptionTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment>;
  findMany(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** Linhas vivas `CONFIRMED` do tributo a partir de (ano, mês) inclusive — o mês e os posteriores (cascata, item 9). */
  findConfirmedFrom(ownerUserId: string, tributo: string, anoCalendario: number, mes: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** `CONFIRMED` → `SUPERSEDED` com CAS no status; devolve quantas linhas mudaram. */
  markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
