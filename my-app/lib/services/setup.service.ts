import { apiClient } from '../api/api-client';
import type { OnboardingFiscalInput } from '@/types/contracts/accounting/CompanyFiscalProfileDto.gen';
import type { OnboardingAccountingResultInput } from '@/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen';
import type {
  CustomCreationInput,
  QuickCreationInput,
  UnifiedCreationInput,
  UnitInputInput,
} from '@/types/contracts/dynamicTables/CreateDashboard.dto.gen';

// Types for the dashboard onboarding/setup endpoints (`/dashboard/*`). The request body is the generated
// contract (`@/types/contracts/dynamicTables/CreateDashboard.dto.gen`); the response types below stay local
// (not imported from the backend) per the architecture contract §3.

export interface Preset {
  category: string;
  key: string;
  name: string;
  description: string;
}

export interface PresetSchemaField {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
}

export interface PresetTableSchema {
  fields: PresetSchemaField[];
}

export interface PresetDetails {
  tables: Record<string, { name?: string; schema: PresetTableSchema | null }>;
}

/** BE-INCR-ONBOARDING-FIRST-UNIT (I1, F-I1-2 b): a primeira unidade é obrigatória no create. */
export type DashboardUnitInput = UnitInputInput;

export type QuickDashboardPayload = QuickCreationInput;

export type CustomDashboardPayload = CustomCreationInput;

// ponytail: `fiscal` é consumida por `dashboardController` (`UnifiedCreationSchema.extend({ fiscal })`) FORA do DTO gerado —
// extensão explícita (plano §10 linha 4 / D9), nunca `as`. Quem manda é a Entrevista (`useAiInterview`).
export type CreateDashboardPayload = UnifiedCreationInput & { fiscal?: OnboardingFiscalInput };

/**
 * I4 PR-4 (item 21): o que os wizards leem do `data` do 201 de POST /dashboard/create. `accounting` é o contrato gerado de
 * `OnboardingAccountingResultSchema` (PR-2, #693); o resto do `data` não é lido no front e fica fora do tipo.
 */
export interface CreateDashboardResult {
  unitId?: string;
  accounting?: OnboardingAccountingResultInput;
}

/**
 * An `Error` that keeps what `apiClient` rejected with: the HTTP `status` (absent when no response arrived)
 * and the parsed error `body`, so the Interview can classify a failed create (`classifyCreationError`).
 */
export class SetupApiError extends Error {
  constructor(message: string, readonly status?: number, readonly body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SetupApiError';
  }
}

/** Normalize an unknown API error into an Error with a friendly message. */
function toError(err: unknown, fallback: string): SetupApiError {
  const rec = (err && typeof err === 'object' ? (err as Record<string, unknown>) : null);
  const message =
    (rec?.['error'] as string) ||
    (rec?.['message'] as string) ||
    (err instanceof Error ? err.message : '') ||
    fallback;
  if (typeof rec?.['status'] === 'number') {
    const { status, ...body } = rec;
    return new SetupApiError(message, status as number, body);
  }
  return new SetupApiError(message);
}

/**
 * Wraps the dashboard setup/onboarding endpoints. Consumed by the interview
 * setup wizard (QuickSetup / TotalControlSetup) — these never touch apiClient directly.
 */
export const SetupService = {
  /** GET /dashboard/presets — list the available dashboard presets. */
  async getPresets(): Promise<Preset[]> {
    const body = (await apiClient.get('/dashboard/presets')) as { data?: Preset[] };
    return body.data ?? [];
  },

  /** GET /dashboard/presets/:key — full table/schema details for one preset. */
  async getPresetDetails(key: string): Promise<PresetDetails> {
    try {
      const body = (await apiClient.get(`/dashboard/presets/${key}`)) as { data: PresetDetails };
      return body.data;
    } catch (err) {
      throw toError(err, 'Não foi possível carregar os detalhes do preset.');
    }
  },

  /**
   * POST /dashboard/create — provision the user's dashboard from a preset (quick or custom).
   * `silent` skips the apiClient error toast (the Interview renders `creationError` itself).
   */
  async createDashboard(payload: CreateDashboardPayload, options?: { silent?: boolean }): Promise<CreateDashboardResult> {
    try {
      const body = (await apiClient.post('/dashboard/create', payload, { silent: options?.silent })) as { data?: CreateDashboardResult };
      return body.data ?? {};
    } catch (err) {
      throw toError(err, 'Falha ao criar o dashboard.');
    }
  },
};

export default SetupService;
