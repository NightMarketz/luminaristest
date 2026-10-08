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
  /** BE-INCR-LEGAL-PARAMS PR-4 (item 7): snapshot das linhas de lei do período (ids ordenados + sha256). */
  parametrosIds?: string[];
  parametrosSha256?: string;
  /** PR-4 (item 10): o payload que o usuário informou — o job reconfirma com ele. */
  entradaInformada?: Prisma.InputJsonValue;
  /** PR-4 (item 10): aviso visível da mudança de parâmetro legal. */
  avisoParametroLegal?: string | null;
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
  /** PR-4 (item 10): linhas vivas `CONFIRMED` dos tributos, de TODAS as PJs — o universo que o job de recálculo varre. */
  findConfirmedByTributos(tributos: readonly string[]): Promise<TaxAssessment[]>;
  /** PR-4 (item 10): a última linha `SUPERSEDED` do (PJ, ano, tributo, período) — a cascata reconfirma a partir dela. */
  findLatestSuperseded(ownerUserId: string, anoCalendario: number, tributo: string, periodo: string): Promise<TaxAssessment | null>;
  /** PR-4 (item 10): grava o aviso visível na linha (único campo que muda numa linha já gravada além da provisão). */
  setAvisoParametroLegal(ownerUserId: string, id: string, aviso: string): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
