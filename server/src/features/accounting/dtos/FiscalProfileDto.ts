import { z } from 'zod';

/**
 * BE-INCR-NFE-COST-REGIME (nó X6) — DTOs do perfil fiscal (BRIEF §2 + EMENDA 2026-09-15). `.strict()`.
 *
 * Regra de consistência (§4 f4, LC 123/2006 art. 23 — `LC-123-2006-Simples.html` no corpus): o Simples
 * Nacional não apura ICMS/PIS/COFINS pelo regime normal → `SIMPLES` não combina com `icmsContribuinte`
 * nem com `pisCofinsRegime ≠ SIMPLES`; e o regime normal não usa `pisCofinsRegime = SIMPLES`.
 *
 * BE-INCR-DFE (nó X10b, BRIEF item 6) — campos do emitente + itens 5a–5f do contador como CONFIG
 * (D-X10b-2). Cada regra abaixo cita a linha do leiaute (Anexo I v1.01, aba LEIAUTE DPS_NFS-e) ou a RN:
 *  - `dpsSerie` 1–49999 (serie [106], faixa "aplicativo próprio"; RN E0010)
 *  - `issAliquotaBp` ≤ 500 (pAliq [312]; RN E0595 "não é permitido alíquota superior a 5%")
 *  - `ibsCbsClassTrib.slice(0,3) === ibsCbsCst` (RN E0959)
 *  - `regApTribSN`/`pTotTribSNCent` só SIMPLES (regApTribSN [141] só para opSimpNac=3; RN E0713 proíbe
 *    pTotTribSN para não-optante); `pTotTrib{Fed,Est,Mun}Cent` só regime normal (RN E0712 espelhada)
 *  - `regApTribSN` ∈ {1,2,3} ([141]: 1 tudo pelo SN · 2 federais pelo SN e ISS pela NFS-e · 3 tudo pela NFS-e)
 *  - `regEspTrib` ∈ 0..9 ([142]) · `codMun`/`cLocPrestacao` IBGE 7 dígitos ([112]/[192])
 */
export const REGIMES_TRIBUTARIOS = ['SIMPLES', 'PRESUMIDO', 'REAL'] as const;
export const PIS_COFINS_REGIMES = ['SIMPLES', 'CUMULATIVO', 'NAO_CUMULATIVO'] as const;
export const PACOTE_FATO_GERADOR = ['CONSUMO', 'VENDA'] as const;
export const EMISSAO_FORA_DO_MES = ['AVISAR', 'BLOQUEAR'] as const;

const ibge7 = z.string().regex(/^\d{7}$/, 'código IBGE de 7 dígitos');
const pct2Cent = z.number().int().min(0).max(9999); // 1-2V2 => 0.00..99.99 em centésimos de %

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
    // BE-INCR-DFE — emitente (ADR-DFE D5)
    codMun: ibge7.nullable().optional(),
    inscricaoMunicipal: z.string().min(1).max(15).nullable().optional(),
    cnae: z.string().min(1).max(10).nullable().optional(),
    dpsSerie: z.number().int().min(1).max(49999).default(1),
    regEspTrib: z.number().int().min(0).max(9).default(0),
    regApTribSN: z.number().int().min(1).max(3).nullable().optional(),
    // BE-INCR-DFE — D1f configurável (5a–5f), defaults = recomendação do ADR
    issAliquotaBp: z.number().int().min(0).max(500).nullable().optional(),
    issRetidoTomadorPj: z.boolean().default(false),
    pacoteFatoGerador: z.enum(PACOTE_FATO_GERADOR).default('CONSUMO'),
    ibsCbsInformar: z.boolean().optional(), // default depende do regime (SIMPLES => false) — resolvido no serviço
    ibsCbsCst: z.string().regex(/^\d{3}$/).nullable().optional(),
    ibsCbsClassTrib: z.string().regex(/^\d{6}$/).nullable().optional(),
    pTotTribFedCent: pct2Cent.nullable().optional(),
    pTotTribEstCent: pct2Cent.nullable().optional(),
    pTotTribMunCent: pct2Cent.nullable().optional(),
    pTotTribSNCent: pct2Cent.nullable().optional(),
    emissaoForaDoMes: z.enum(EMISSAO_FORA_DO_MES).default('AVISAR'),
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
    const simples = v.regimeTributario === 'SIMPLES';
    if (!simples && (v.regApTribSN != null || v.pTotTribSNCent != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [v.regApTribSN != null ? 'regApTribSN' : 'pTotTribSNCent'],
        message: 'regApTribSN e pTotTribSNCent só cabem em regimeTributario=SIMPLES (leiaute DPS [141]/[335]; RN E0713).',
      });
    }
    if (simples && (v.pTotTribFedCent != null || v.pTotTribEstCent != null || v.pTotTribMunCent != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pTotTribFedCent'],
        message: 'pTotTrib{Fed,Est,Mun}Cent não cabem em regimeTributario=SIMPLES (RN E0712: ME/EPP usa pTotTribSN).',
      });
    }
    if (v.ibsCbsCst != null && v.ibsCbsClassTrib != null && !v.ibsCbsClassTrib.startsWith(v.ibsCbsCst)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ibsCbsClassTrib'],
        message: 'Os 3 primeiros dígitos de cClassTrib devem ser iguais ao CST (RN E0959).',
      });
    }
  });
export type UpsertFiscalProfileInput = z.infer<typeof UpsertFiscalProfileSchema>;
