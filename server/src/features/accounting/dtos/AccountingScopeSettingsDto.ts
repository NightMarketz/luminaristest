import { z } from 'zod';

/**
 * Configuração por escopo (decisão do dono 2026-09-15 — tabela `AccountingScopeSettings`, F7 Fase C).
 * Hoje só as 2 contas de encargo bancário (BRIEF F7 item 8): os CÓDIGOS das contas são pendência
 * externa do contador (BRIEF §5) — este DTO só aceita ids de `Account` do escopo; o serviço valida
 * existência, `acceptsEntries` e natureza (Expense para o encargo pago, Revenue para o recebido).
 * `null` limpa a configuração (o `confirm` com encargo volta a responder 400 nomeado).
 */
export const GetAccountingScopeSettingsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const UpdateAccountingScopeSettingsSchema = z
  .object({
    unitId: z.string().min(1),
    bankChargeExpenseAccountId: z.string().min(1).nullable().optional(),
    bankChargeIncomeAccountId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type UpdateAccountingScopeSettingsInput = z.infer<typeof UpdateAccountingScopeSettingsSchema>;
