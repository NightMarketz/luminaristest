/**
 * Teammate (BE-INCR-TEAMMATES PR-2, itens 10–13). O tipo da linha vem de `generated/prisma`; este arquivo é dono do
 * domínio sem `deletedAt`, dos códigos de erro e da trilha de auditoria do módulo.
 */
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';

/** Item 11: `toolOverrides` tentou afrouxar (ou mirar ferramenta que o teammate não usa). */
export const ALCADA_INVALIDA = 'ALCADA_INVALIDA';
/** Item 12: `allowedTools` com nome fora do `TOOL_CLASS`, ferramenta `PROIBIDA` ou MCP que não é do tenant. */
export const FERRAMENTA_INVALIDA = 'FERRAMENTA_INVALIDA';

/** Item 12: formato `mcp:<serverId>:<tool>` (§2.1, comentário de `Teammate.allowedTools`). */
export const MCP_TOOL_RE = /^mcp:([^:]+):(.+)$/;

/** Item 13: eventos da trilha encadeada (`auditCanonical.ts`, allowlist no mesmo PR). */
export const LLM_CREDENTIAL_CREATED = 'llm_credential.created';
export const LLM_CREDENTIAL_DELETED = 'llm_credential.deleted';
export const TEAMMATE_ALCADA_CHANGED = 'teammate.alcada_changed';

/**
 * Item 13 — corrente da trilha do módulo, no padrão do `PLATFORM_AUDIT_SCOPE` do `LegalParameterService` (insumo
 * ausente §5 conferido): mesma tabela e mesmo hash encadeado, num `unitId` fixo do módulo. Aqui o dono é o tenant
 * (`ownerUserId` = `userId`), porque teammate e credencial são do tenant, não da plataforma.
 */
export function teammatesAuditScope(userId: string): AccountingScope {
  return {
    ownerUserId: userId,
    actorUserId: userId,
    unitId: 'teammates',
    ledgerCode: 'DEFAULT',
    baseCurrencyCode: 'BRL',
    timeZone: 'America/Sao_Paulo',
  };
}

export interface ITeammate {
  id: string;
  userId: string;
  name: string;
  role: string;
  playbook: string;
  allowedTools: string[];
  toolOverrides: Record<string, 'PROPOSTA'> | null;
  provider: LlmProviderId;
  model: string;
  fallbackProvider: LlmProviderId | null;
  fallbackModel: string | null;
  dailyTurnLimit: number;
  status: 'ACTIVE' | 'PAUSED';
  createdAt: Date;
  updatedAt: Date;
}

export type TeammateWrite = Omit<ITeammate, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>;
