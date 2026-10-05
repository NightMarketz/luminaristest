import { z } from 'zod';
import { FiscalProfilePolicyPayloadSchema } from './FiscalProfileDto';
import { ScopeSettingsPolicyPayloadSchema } from './AccountingScopeSettingsDto';
import { POLICY_TARGETS, type PolicyTarget } from '../models/AccountingPolicyVersion.model';
import { POLICY_VERSION_STATUSES, type PolicyVersionStatus } from '../models/ledgerStatus';

/**
 * Política versionada com aprovação do contador (BE-INCR-ACCOUNTING-POLICY-VERSION, nó GOV-CONTADOR, BRIEF §4.1).
 * `.strict()`. F-POL-2 (b): dois alvos. O `payload` é o schema do `PUT` do alvo SEM `unitId` (o `unitId` nunca entra
 * na linha da versão — condição do REKEY); o parse aplica os defaults, e é o resultado do parse que se grava, para o
 * contador aprovar exatamente o que vai valer.
 */
/** @openapi
 * components:
 *   schemas:
 *     ProposePolicyVersionInput:
 *       type: object
 *       required: [unitId, target, payload]
 *       properties:
 *         unitId:  { type: string }
 *         target:  { type: string, enum: [FISCAL_PROFILE, SCOPE_SETTINGS] }
 *         payload: { type: object, description: "Corpo do PUT do alvo SEM unitId (FISCAL_PROFILE = PUT /fiscal-profile completo; SCOPE_SETTINGS = patch do PUT /settings)" }
 *     ApprovePolicyVersionInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId:      { type: string }
 *         ownerUserId: { type: string, description: "Dono do escopo — par (contador, dono) do resolver delegado" }
 *     RejectPolicyVersionInput:
 *       type: object
 *       required: [unitId, reason]
 *       properties:
 *         unitId:      { type: string }
 *         ownerUserId: { type: string }
 *         reason:      { type: string, minLength: 1, maxLength: 500 }
 */
export const ProposePolicyVersionSchema = z.discriminatedUnion('target', [
  z
    .object({
      unitId: z.string().min(1),
      target: z.literal('FISCAL_PROFILE'),
      payload: FiscalProfilePolicyPayloadSchema, // substituição completa, defaults aplicados
    })
    .strict(),
  z
    .object({
      unitId: z.string().min(1),
      target: z.literal('SCOPE_SETTINGS'),
      payload: ScopeSettingsPolicyPayloadSchema, // patch parcial, como o PUT de hoje
    })
    .strict(),
]);
export type ProposePolicyVersionInput = z.infer<typeof ProposePolicyVersionSchema>;

export const ListPolicyVersionsQuerySchema = z
  .object({
    unitId: z.string().min(1),
    target: z.enum(POLICY_TARGETS).optional(),
    status: z.enum(POLICY_VERSION_STATUSES).optional(),
    ownerUserId: z.string().min(1).optional(), // par contador×dono (resolver do #482)
  })
  .strict();
export type ListPolicyVersionsQuery = z.infer<typeof ListPolicyVersionsQuerySchema>;

export const PolicyVersionScopeQuerySchema = z
  .object({
    unitId: z.string().min(1),
    ownerUserId: z.string().min(1).optional(),
  })
  .strict();

export const ApprovePolicyVersionSchema = PolicyVersionScopeQuerySchema; // corpo

export const RejectPolicyVersionSchema = z
  .object({
    unitId: z.string().min(1),
    ownerUserId: z.string().min(1).optional(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

/** Resposta (instantes ISO). */
export interface PolicyVersionView {
  id: string;
  unitId: string;
  target: PolicyTarget;
  version: number;
  status: PolicyVersionStatus;
  payload: Record<string, unknown>; // o parse do schema do alvo, sem unitId
  appliedSnapshot: Record<string, unknown> | null;
  proposedById: string | null; // null quando a versão nasceu de PUT direto (sem contador)
  decidedById: string | null;
  assignmentId: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface PolicyVersionDetailView extends PolicyVersionView {
  current: Record<string, unknown> | null; // estado vivo do alvo agora
  accountLabels: Record<string, string>; // accountId → "1.1.5 — ICMS a recuperar" (payload ∪ current)
}
