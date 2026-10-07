import { z } from 'zod';
import { isLc116Codigo, listaLc116DoCache } from '../models/lc116ListaNacional';
import { issAliquotaMaxBpDoCache } from '../models/issLimite';

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

// BE-INCR-ACCOUNTING-POLICY-VERSION: forma base SEM o refine — no Zod 4, `.omit()` sobre um objeto refinado devolve
// o objeto SEM o `superRefine` (medido 04/10). A proposta (`FiscalProfilePolicyPayloadSchema`) e o PUT reaplicam o
// mesmo `refineFiscalProfile`; a forma do PUT não muda.
const FiscalProfileFields = z
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
    // ITEM-DESTINATION item 20 (F-ID-5 a): conta de despesa (Expense, folha) do insumo do serviço — código do contador.
    insumoExpenseAccountId: z.string().min(1).nullable().optional(),
    // BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF item 3, F-TA-6 a): contas da provisão de IRPJ/CSLL — código do contador (P-5).
    irpjDespesaAccountId: z.string().min(1).nullable().optional(),
    csllDespesaAccountId: z.string().min(1).nullable().optional(),
    irpjRecolherAccountId: z.string().min(1).nullable().optional(),
    csllRecolherAccountId: z.string().min(1).nullable().optional(),
    // BE-INCR-PIS-COFINS (nó X8, BRIEF item 2, F-PCB-1 b): contas da provisão de PIS/Cofins — código do contador (P-1).
    pisDespesaAccountId: z.string().min(1).nullable().optional(),
    cofinsDespesaAccountId: z.string().min(1).nullable().optional(),
    pisRecolherAccountId: z.string().min(1).nullable().optional(),
    cofinsRecolherAccountId: z.string().min(1).nullable().optional(),
    // X8 PR-3 (L-5, dono 06/10): redutora de despesa (Expense) — contrapartida dos outros créditos do não cumulativo.
    pisCofinsCreditoOutrosAccountId: z.string().min(1).nullable().optional(),
    // X8 PR-3 (retenções, dono 06/10): PIS/Cofins retido a compensar (Asset) e a contrapartida transitória do
    // reconhecimento — retenções a conciliar com clientes (Asset, redutora de clientes).
    pisCofinsRetidoCompensarAccountId: z.string().min(1).nullable().optional(),
    pisCofinsRetencaoConciliarAccountId: z.string().min(1).nullable().optional(),
    // X7 Fase B (BRIEF B item 16, F-TB-3 a): saldo negativo a compensar do ajuste anual (Asset) — código do contador (P-B8).
    irpjSaldoNegativoAccountId: z.string().min(1).nullable().optional(),
    csllSaldoNegativoAccountId: z.string().min(1).nullable().optional(),
    partnerAccountRef: z.string().min(1).max(120).nullable().optional(),
    // BE-INCR-DFE — emitente (ADR-DFE D5)
    codMun: ibge7.nullable().optional(),
    inscricaoMunicipal: z.string().min(1).max(15).nullable().optional(),
    cnae: z.string().min(1).max(10).nullable().optional(),
    dpsSerie: z.number().int().min(1).max(49999).default(1),
    regEspTrib: z.number().int().min(0).max(9).default(0),
    regApTribSN: z.number().int().min(1).max(3).nullable().optional(),
    // BE-INCR-DFE — D1f configurável (5a–5f), defaults = recomendação do ADR
    // BE-INCR-LEGAL-PARAMS PR-2 (item 22; L-8): o máximo vem da tabela ISS_LIMITE (cache síncrono). D-4 (mínimo de 2%)
    // é pendência de contador — não corrigida.
    issAliquotaBp: z
      .number()
      .int()
      .min(0)
      .refine((v) => v <= issAliquotaMaxBpDoCache(), { message: 'issAliquotaBp acima do máximo da tabela ISS_LIMITE (pAliq [312]; RN E0595)' })
      .nullable()
      .optional(),
    issRetidoTomadorPj: z.boolean().default(false),
    pacoteFatoGerador: z.enum(PACOTE_FATO_GERADOR).default('CONSUMO'),
    // BE-INCR-PACOTE-VALIDADE 13a (F-PV-9b a): o código do PACOTE para a NFS-e (pacote VENDA e saldo vencido em
    // CONSUMO) — validado como o ServiceFiscalProfile: cTribNac [195] 6 dígitos na lista nacional, cNBS [198] 9.
    // Do contador (PE-4): sem ele a nota do pacote não sai (pendência nomeada).
    pacoteCTribNac: z
      .string()
      .regex(/^\d{6}$/)
      .refine((c) => isLc116Codigo(c, listaLc116DoCache()), 'pacoteCTribNac fora da lista nacional de serviços (Anexo I MUN.INCID_INFO.SERV.)')
      .nullable()
      .optional(),
    pacoteCNBS: z.string().regex(/^\d{9}$/).nullable().optional(),
    ibsCbsInformar: z.boolean().optional(), // default depende do regime (SIMPLES => false) — resolvido no serviço
    ibsCbsCst: z.string().regex(/^\d{3}$/).nullable().optional(),
    ibsCbsClassTrib: z.string().regex(/^\d{6}$/).nullable().optional(),
    pTotTribFedCent: pct2Cent.nullable().optional(),
    pTotTribEstCent: pct2Cent.nullable().optional(),
    pTotTribMunCent: pct2Cent.nullable().optional(),
    pTotTribSNCent: pct2Cent.nullable().optional(),
    emissaoForaDoMes: z.enum(EMISSAO_FORA_DO_MES).default('AVISAR'),
  })
  .strict();

type FiscalProfileFieldsOutput = Omit<z.output<typeof FiscalProfileFields>, 'unitId'>;

function refineFiscalProfile(v: FiscalProfileFieldsOutput, ctx: z.RefinementCtx): void {
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
  // BE-INCR-PIS-COFINS (nó X8, BRIEF item 1, F-X8-3 a): o Presumido é cumulativo (IN RFB 2.121/2022 art. 122).
  // REAL + CUMULATIVO segue aceito aqui (receitas do art. 126); a apuração do X8 recusa na prévia (item 9).
  if (v.regimeTributario === 'PRESUMIDO' && v.pisCofinsRegime === 'NAO_CUMULATIVO') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pisCofinsRegime'],
      message: 'Lucro Presumido apura PIS/COFINS no regime cumulativo (IN RFB 2.121/2022 art. 122): pisCofinsRegime=NAO_CUMULATIVO não cabe em regimeTributario=PRESUMIDO.',
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
  if (v.pisCofinsCreditIncludesIpi) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pisCofinsCreditIncludesIpi'],
      message: 'IPI não integra a base do crédito de PIS/COFINS (STJ Tema 1.373) — regra fixa, só aceita false.',
    });
  }
  if (v.ibsCbsCst != null && v.ibsCbsClassTrib != null && !v.ibsCbsClassTrib.startsWith(v.ibsCbsCst)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ibsCbsClassTrib'],
      message: 'Os 3 primeiros dígitos de cClassTrib devem ser iguais ao CST (RN E0959).',
    });
  }
}

export const UpsertFiscalProfileSchema = FiscalProfileFields.superRefine(refineFiscalProfile);
export type UpsertFiscalProfileInput = z.infer<typeof UpsertFiscalProfileSchema>;

/** Payload da proposta de política (BRIEF item 7.2): o schema do PUT sem `unitId`, com o MESMO refine. */
export const FiscalProfilePolicyPayloadSchema = FiscalProfileFields.omit({ unitId: true }).strict().superRefine(refineFiscalProfile);
export type FiscalProfilePolicyPayload = z.infer<typeof FiscalProfilePolicyPayloadSchema>;
