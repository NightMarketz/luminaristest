import { z } from 'zod';
import { ACCOUNTING_BINDING_STATUSES } from '../../accountingBinding/models/accountingBindingStatus';

/**
 * Contratos do ajuste papel→conta (BE-INCR-KIT-SETOR, PR-3; BRIEF §3.4; emenda §11 E-11.4 para a view).
 */

/** `:role` da rota — o papel inteiro, com sub-chave (`caixa-por-metodo:Pix`). Pertencer ao kit é checado no serviço. */
export const RoleOverrideRoleParamSchema = z.string().min(1).max(120);

/** `PUT /accounting-kit/role-overrides/:role` (item 22). `motivo` obrigatório, 10–500 chars (item 18). */
export const SetRoleOverrideRequestSchema = z
  .object({
    unitId: z.string().min(1),
    accountId: z.string().min(1),
    motivo: z.string().trim().min(10).max(500),
  })
  .strict();
export type SetRoleOverrideRequest = z.infer<typeof SetRoleOverrideRequestSchema>;

/** `GET` e `DELETE` (item 22): só a unidade. */
export const RoleOverrideScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

/** Emenda E-11.4: a linha + o código da conta escolhida + o código que o kit traz para o papel. */
export const RoleAccountOverrideViewSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    accountId: z.string(),
    accountCode: z.string(),
    /** Código do kit instalado para o papel; `null` se a unidade não tem kit ou o kit não usa o papel. */
    kitAccountCode: z.string().nullable(),
    motivo: z.string(),
    setById: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type RoleAccountOverrideView = z.infer<typeof RoleAccountOverrideViewSchema>;

/** A versão que a recompilação produziu (item 21). */
export const RoleOverrideBindingRefSchema = z
  .object({ status: z.enum(ACCOUNTING_BINDING_STATUSES), bindingVersion: z.number().int().min(1) })
  .strict();

export const SetRoleOverrideResultSchema = z
  .object({ override: RoleAccountOverrideViewSchema, binding: RoleOverrideBindingRefSchema })
  .strict();
export type SetRoleOverrideResult = z.infer<typeof SetRoleOverrideResultSchema>;

export const RemoveRoleOverrideResultSchema = z.object({ binding: RoleOverrideBindingRefSchema }).strict();
export type RemoveRoleOverrideResult = z.infer<typeof RemoveRoleOverrideResultSchema>;
