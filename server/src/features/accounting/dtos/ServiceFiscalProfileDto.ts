import { z } from 'zod';
import { isLc116Codigo } from '../models/lc116ListaNacional';
import { isIndOp, IND_OP_DEFAULT_SALAO } from '../models/indOp';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 8) — perfil fiscal DO SERVIÇO (F-DFE-6 a). `.strict()`.
 * Cada regra cita o leiaute da DPS (Anexo I v1.01) ou o anexo transcrito:
 *  - `cTribNac` 6 dígitos [195] e ∈ lista nacional (models/lc116ListaNacional.ts, aba MUN.INCID_INFO.SERV.)
 *  - `cTribMun` 3 dígitos [196] · `cNBS` 9 dígitos [198] (Anexo B) · `cIndOp` ∈ Anexo C [339]
 *  - `cLocPrestacao` IBGE 7 [192]; null => FiscalProfile.codMun · `xDescServ` ≤ 1000 [197]
 */
export const ServiceFiscalProfileScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const ServiceFiscalProfileParamsSchema = z.object({ serviceRef: z.string().min(1).max(120) }).strict();

export const UpsertServiceFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1),
    cTribNac: z.string().regex(/^\d{6}$/).refine(isLc116Codigo, 'cTribNac fora da lista nacional de serviços (Anexo I MUN.INCID_INFO.SERV.)'),
    cTribMun: z.string().regex(/^\d{3}$/).nullable().optional(),
    cNBS: z.string().regex(/^\d{9}$/).nullable().optional(),
    cIndOp: z.string().regex(/^\d{6}$/).refine(isIndOp, 'cIndOp fora da tabela de indicadores de operação (Anexo C)').default(IND_OP_DEFAULT_SALAO),
    cLocPrestacao: z.string().regex(/^\d{7}$/).nullable().optional(),
    xDescServ: z.string().min(1).max(1000).nullable().optional(),
  })
  .strict();
export type UpsertServiceFiscalProfileInput = z.infer<typeof UpsertServiceFiscalProfileSchema>;
