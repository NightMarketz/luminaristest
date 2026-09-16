import { z } from 'zod';

/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — DTOs do perfil fiscal (BRIEF §2 + EMENDA 2026-09-15). `.strict()`.
 *
 * Regra de consistência (§4 f4, LC 123/2006 art. 23 — `LC-123-2006-Simples.html` no corpus): o Simples
 * Nacional não apura ICMS/PIS/COFINS pelo regime normal → `SIMPLES` não combina com `icmsContribuinte`
 * nem com `pisCofinsRegime ≠ SIMPLES`; e o regime normal não usa `pisCofinsRegime = SIMPLES`.
 */
export const REGIMES_TRIBUTARIOS = ['SIMPLES', 'PRESUMIDO', 'REAL'] as const;
export const PIS_COFINS_REGIMES = ['SIMPLES', 'CUMULATIVO', 'NAO_CUMULATIVO'] as const;

export const FiscalProfileScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const UpsertFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1),
    regimeTributario: z.enum(REGIMES_TRIBUTARIOS),
    icmsContribuinte: z.boolean(),
    pisCofinsRegime: z.enum(PIS_COFINS_REGIMES),
    pisCofinsCreditExcludesIcms: z.boolean().default(true),
    pisCofinsCreditIncludesIpi: z.boolean().default(false),
    pisCofinsCreditFromSimplesSupplier: z.boolean().default(false),
    icmsRecuperavelAccountId: z.string().min(1).nullable().optional(),
    pisCofinsRecuperavelAccountId: z.string().min(1).nullable().optional(),
    partnerAccountRef: z.string().min(1).max(120).nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.regimeTributario === 'SIMPLES' && (v.icmsContribuinte || v.pisCofinsRegime !== 'SIMPLES')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['regimeTributario'],
        message: 'Simples Nacional não apura ICMS/PIS/COFINS pelo regime normal (LC 123/2006 art. 23): icmsContribuinte=false e pisCofinsRegime=SIMPLES.',
      });
    }
    if (v.regimeTributario !== 'SIMPLES' && v.pisCofinsRegime === 'SIMPLES') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pisCofinsRegime'],
        message: 'pisCofinsRegime=SIMPLES só cabe em regimeTributario=SIMPLES.',
      });
    }
  });
export type UpsertFiscalProfileInput = z.infer<typeof UpsertFiscalProfileSchema>;
