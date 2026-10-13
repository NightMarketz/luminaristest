import type { ReportSpec } from '../dtos/CrmReportDto';

/**
 * Definição salva de relatório/dashboard do CRM (BE-INCR-CRM-REPORT-BUILDER PR-2, item 1; F-RB1=(a): Prisma
 * first-class, padrão `SavedTableView`). Metadado de plataforma sobre tabelas do motor — não é dado de negócio.
 */
export interface ICrmReportDefinition {
  id: string;
  userId: string; // dono; imutável no update (F-RB4: o ADMIN edita sem transferir posse)
  name: string;
  description: string | null;
  kind: 'chart' | 'table' | 'kpi';
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'table';
  spec: ReportSpec;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCrmReportDefinitionData {
  userId: string;
  name: string;
  description?: string;
  kind: ICrmReportDefinition['kind'];
  chartType: ICrmReportDefinition['chartType'];
  spec: ReportSpec;
}

/** Patch persistível: sem `userId` (posse imutável). */
export type UpdateCrmReportDefinitionData = Partial<Omit<CreateCrmReportDefinitionData, 'userId'>>;
