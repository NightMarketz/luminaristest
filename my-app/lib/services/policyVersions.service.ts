import { apiClient } from '../api/api-client';
import { notify } from '../notifications/notify';
import type {
  ApprovePolicyVersionInput,
  ListPolicyVersionsQueryInput,
  PolicyVersionScopeQueryInput,
  ProposePolicyVersionInput,
  RejectPolicyVersionInput,
} from '@/types/contracts/accounting/AccountingPolicyVersionDto.gen';

/**
 * Política contábil versionada (`/api/accounting/policy-versions`, BE do #517 — nó GOV-CONTADOR,
 * FE-INCR-ACCOUNTING-POLICY-VERSION item 1). Corpos e queries pelo contrato gerado; as views de resposta são à mão
 * (o snapshot gera só os schemas de entrada). `ownerUserId` ausente → a chave não vai (mesma regra do #515).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

const CTX = 'Política contábil';

export type PolicyTarget = ProposePolicyVersionInput['target'];
export type PolicyVersionStatus = NonNullable<ListPolicyVersionsQueryInput['status']>;

// espelha server/src/features/accounting/dtos/AccountingPolicyVersionDto.ts:83-102 (resposta à mão — só entrada é gerada)
export interface PolicyVersionView {
  id: string;
  unitId: string;
  target: PolicyTarget;
  version: number;
  status: PolicyVersionStatus;
  payload: Record<string, unknown>;
  appliedSnapshot: Record<string, unknown> | null;
  proposedById: string | null;
  decidedById: string | null;
  assignmentId: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface PolicyVersionDetailView extends PolicyVersionView {
  current: Record<string, unknown> | null;
  accountLabels: Record<string, string>;
}

export type {
  ApprovePolicyVersionInput,
  ListPolicyVersionsQueryInput,
  PolicyVersionScopeQueryInput,
  ProposePolicyVersionInput,
  RejectPolicyVersionInput,
};

const enc = encodeURIComponent;
const BASE = '/accounting/policy-versions';

/** Query sem chave para valor ausente (`ownerUserId`/filtros opcionais nunca viram `?x=undefined`). */
function toQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, v);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const policyVersionsService = {
  async propose(body: ProposePolicyVersionInput): Promise<PolicyVersionView> {
    const res = await apiClient.post<Envelope<PolicyVersionView>>(BASE, body);
    notify('Proposta enviada ao contador.', 'success', CTX);
    return res.data;
  },

  async list(query: ListPolicyVersionsQueryInput): Promise<PolicyVersionView[]> {
    const qs = toQuery({ unitId: query.unitId, target: query.target, status: query.status, ownerUserId: query.ownerUserId });
    return (await apiClient.get<Envelope<PolicyVersionView[]>>(`${BASE}${qs}`)).data;
  },

  async get(id: string, query: PolicyVersionScopeQueryInput): Promise<PolicyVersionDetailView> {
    const qs = toQuery({ unitId: query.unitId, ownerUserId: query.ownerUserId });
    return (await apiClient.get<Envelope<PolicyVersionDetailView>>(`${BASE}/${enc(id)}${qs}`)).data;
  },

  async approve(id: string, body: ApprovePolicyVersionInput): Promise<PolicyVersionView> {
    const res = await apiClient.post<Envelope<PolicyVersionView>>(`${BASE}/${enc(id)}/approve`, body);
    notify('Proposta aprovada e aplicada.', 'success', CTX);
    return res.data;
  },

  async reject(id: string, body: RejectPolicyVersionInput): Promise<PolicyVersionView> {
    const res = await apiClient.post<Envelope<PolicyVersionView>>(`${BASE}/${enc(id)}/reject`, body);
    notify('Proposta rejeitada.', 'success', CTX);
    return res.data;
  },
};
