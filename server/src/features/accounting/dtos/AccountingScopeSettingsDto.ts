import { z } from 'zod';

/**
 * Configuração por escopo (decisão do dono 2026-09-15 — tabela `AccountingScopeSettings`, F7 Fase C).
 * As 2 contas de encargo bancário (BRIEF F7 item 8) + as 4 contas do imobilizado
 * (BE-INCR-FIXED-ASSETS, nó C8, item 5 + item 24 — as colunas já existem desde a migração do PR-1,
 * F-FA14 → b). Os CÓDIGOS das contas são pendência externa do contador (BRIEF §5) — este DTO só
 * aceita ids de `Account` (ou `LalurParteBAccount`, para a Parte B) do escopo; o serviço valida
 * existência, `acceptsEntries` e natureza. `null` limpa a configuração.
 */
export const GetAccountingScopeSettingsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const UpdateAccountingScopeSettingsSchema = z
  .object({
    unitId: z.string().min(1),
    bankChargeExpenseAccountId: z.string().min(1).nullable().optional(),
    bankChargeIncomeAccountId: z.string().min(1).nullable().optional(),
    // BE-INCR-FIXED-ASSETS (nó C8, item 5): despesa de depreciação / ganho / perda na baixa.
    depreciationExpenseAccountId: z.string().min(1).nullable().optional(),
    disposalGainAccountId: z.string().min(1).nullable().optional(),
    disposalLossAccountId: z.string().min(1).nullable().optional(),
    // BE-INCR-FIXED-ASSETS (nó C8, item 24, PR-3): conta da Parte B — FK LalurParteBAccount, não Account.
    depreciationParteBAccountId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type UpdateAccountingScopeSettingsInput = z.infer<typeof UpdateAccountingScopeSettingsSchema>;
