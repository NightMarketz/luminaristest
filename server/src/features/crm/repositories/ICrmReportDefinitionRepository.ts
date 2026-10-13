import type { Prisma } from 'generated/prisma';
import type {
  CreateCrmReportDefinitionData,
  ICrmReportDefinition,
  UpdateCrmReportDefinitionData,
} from '../models/CrmReportDefinition.model';

/**
 * Contrato do repositório de `crm_report_definitions` (BE-INCR-CRM-REPORT-BUILDER PR-2, item 2). Único lugar com
 * `prisma.crmReportDefinition.*`. Toda leitura exclui soft-deletados. `tx` opcional em todos os métodos.
 */
export interface ICrmReportDefinitionRepository {
  findManyByUser(userId: string, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition[]>;
  /** Todos os relatórios vivos (lista do ADMIN, F-RB4=(c)). */
  findManyAll(tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition[]>;
  findById(id: string, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition | null>;
  create(data: CreateCrmReportDefinitionData, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition>;
  update(id: string, patch: UpdateCrmReportDefinitionData, tx?: Prisma.TransactionClient): Promise<ICrmReportDefinition>;
  softDelete(id: string, tx?: Prisma.TransactionClient): Promise<void>;
}
