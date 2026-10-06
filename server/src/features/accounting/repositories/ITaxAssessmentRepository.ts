import type { Prisma, TaxAssessment } from 'generated/prisma';

/** Dados para gravar uma linha confirmada (um tributo × período). */
export interface CreateTaxAssessmentData {
  userId: string;
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
  /** X7 Fase B (F-TB-5 b): só no IRPJ do mês do excesso do 16%; 0 nos demais. */
  diferencaPostergadaCents: bigint;
  memoria: Prisma.InputJsonValue;
  tabelaVersao: string;
  status: string;
  supersedesId: string | null;
  confirmedById: string;
  confirmedAt: Date;
}

export interface TaxAssessmentFilter {
  anoCalendario: number;
  periodo?: string;
  /** X8 PR-2 (BRIEF X8 item 16): IRPJ | CSLL | PIS | COFINS. */
  tributo?: string;
  status?: string;
}

/**
 * Contrato do repositório de `tax_assessments` (BE-INCR-TAX-ASSESSMENT Fase A PR-2, item 12). Único lugar com
 * `prisma.taxAssessment.*`. A chave é a PJ (`ownerUserId`, R8) — o `unitId` da linha é proveniência, não filtro.
 * Leituras só de linha viva (`deletedAt: null`). Wrapper fino: gates (CAS, um-só-CONFIRMED, ordem) moram no service.
 */
export interface ITaxAssessmentRepository {
  create(data: CreateTaxAssessmentData, tx?: Prisma.TransactionClient): Promise<TaxAssessment>;
  findById(ownerUserId: string, id: string, tx?: Prisma.TransactionClient): Promise<TaxAssessment | null>;
  findMany(ownerUserId: string, filter: TaxAssessmentFilter, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]>;
  /** Linhas vivas `CONFIRMED` do ano (os 2 tributos, todos os períodos). */
  findConfirmedByYear(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<TaxAssessment[]>;
  /** `CONFIRMED` → `SUPERSEDED` com CAS no status; devolve quantas linhas mudaram. */
  markSuperseded(ownerUserId: string, ids: string[], tx: Prisma.TransactionClient): Promise<number>;
  /** PR-3, "commit 3" do BRIEF (item 15): CAS `where provisaoEntryId is null`; `false` se outra chamada já vinculou. */
  setProvisaoEntryId(ownerUserId: string, id: string, entryId: string): Promise<boolean>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
