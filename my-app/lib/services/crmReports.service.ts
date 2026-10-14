import { apiClient } from '../api/api-client';
import type {
  CreateCrmReportInput,
  RunCrmReportInput,
  RunCrmReportOutputInput,
  RunSavedCrmReportInput,
  UpdateCrmReportInput,
} from '@/types/contracts/crm/CrmReportDto.gen';

/**
 * Builder de relatórios do CRM (`/api/crm/reports`, BE do nó CRM-RB — PRs #647/#651/#648). FE-INCR-CRM-REPORT-BUILDER
 * PR-A, BRIEF §3. Corpos e saída do run pelo contrato gerado; a linha da lista é à mão (o snapshot não gera a saída do
 * CRUD — espelha `server/src/features/crm/models/CrmReportDefinition.model.ts`, com datas serializadas).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface CrmReportRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  kind: CreateCrmReportInput['kind'];
  chartType: CreateCrmReportInput['chartType'];
  spec: CreateCrmReportInput['spec'];
  createdAt: string;
  updatedAt: string;
}

export type CrmReportSpec = CreateCrmReportInput['spec'];
export type CrmReportRunOutput = RunCrmReportOutputInput;
export type { CreateCrmReportInput, RunCrmReportInput, RunSavedCrmReportInput, UpdateCrmReportInput };

const BASE = '/crm/reports';
const enc = encodeURIComponent;

export const CrmReportsService = {
  list: () => apiClient.get<Envelope<CrmReportRow[]>>(BASE),
  get: (id: string) => apiClient.get<Envelope<CrmReportRow>>(`${BASE}/${enc(id)}`),
  create: (body: CreateCrmReportInput) => apiClient.post<Envelope<CrmReportRow>>(BASE, body),
  update: (id: string, body: UpdateCrmReportInput) => apiClient.put<Envelope<CrmReportRow>>(`${BASE}/${enc(id)}`, body),
  remove: (id: string) => apiClient.delete<Envelope<{ id: string }>>(`${BASE}/${enc(id)}`),
  preview: (body: RunCrmReportInput) => apiClient.post<Envelope<CrmReportRunOutput>>(`${BASE}/run`, body),
  run: (id: string, body: RunSavedCrmReportInput) =>
    apiClient.post<Envelope<CrmReportRunOutput>>(`${BASE}/${enc(id)}/run`, body),
};
