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
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment | null>;
  /** Item 12: as linhas `SUPERSEDED` vivas do (PJ, ano, mês, tributo) — a provisão delas é estornada antes da nova. */
  findSuperseded(ownerUserId: string, anoCalendario: number, mes: number, tributo: string): Promise<ConsumptionTaxAssessment[]>;
  /** Item 12, commit 2: CAS `where provisaoEntryId is null`; `false` se outra chamada já vinculou. */
  setProvisaoEntryId(ownerUserId: string, id: string, entryId: string): Promise<boolean>;
  findMany(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** Linhas vivas `CONFIRMED` do tributo a partir de (ano, mês) inclusive — o mês e os posteriores (cascata, item 9). */
  findConfirmedFrom(ownerUserId: string, tributo: string, anoCalendario: number, mes: number, tx?: Prisma.TransactionClient): Promise<ConsumptionTaxAssessment[]>;
  /** `CONFIRMED` → `SUPERSEDED` com CAS no status; devolve quantas linhas mudaram. */
  markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number>;
  /** PR-5 item 24 (job de recálculo, plataforma): linhas vivas `CONFIRMED` do tributo de todas as PJs. */
  findConfirmedByTributo(tributo: string): Promise<ConsumptionTaxAssessment[]>;
  /** PR-5 item 24: grava o aviso de parâmetro legal na linha (dono 23/10: só aviso, sem reconfirmar). */
  setAvisoParametroLegal(ownerUserId: string, id: string, aviso: string): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
