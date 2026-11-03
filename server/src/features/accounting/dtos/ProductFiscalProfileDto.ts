import { z } from 'zod';

/**
 * BE-INCR-NFCE (nó X10a, item 10; F-NFCE-3 b) — perfil fiscal DO PRODUTO para a NF-e 55 / NFC-e 65. `.strict()`.
 * Valores admitidos = transcrição do PR-0 (`docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26.md`),
 * nunca de memória:
 *  - `ncm` 8 dígitos (I05) · `cest` 7 dígitos (I05c) · `origem` 0–8 (N11) · `cfopPadrao` 4 dígitos (I08)
 *  - `csosn` (CRT 1): só os dos grupos transcritos — ICMSSN102 (102, 103, 300, 400) e ICMSSN500 (500)
 *  - `cstIcms` (CRT 3): só o do grupo transcrito — ICMS00 (00)
 *  - `uCom` 1–6 (I09) · `cEan` GTIN-8/12/13/14 ou "SEM GTIN" (I03) · `xProd` 1–120 (I04)
 *  - `cstPis`/`cstCofins`: os CST dos grupos Q02/S02 (01, 02), Q04/S04 (04–09) e Q05/S05 (49–99) — o 03 (por
 *    quantidade, Q03/S03) exige alíquota por unidade, que a montagem não carrega
 *  - `ibsCbsCst` 3 dígitos (UB13) · `ibsCbsClassTrib` 6 dígitos (UB14), NT 2025.002 v1.52
 * Quem casa CSOSN/CST com o CRT da unidade e o CFOP com a NFC-e é a emissão (item 11), não o cadastro.
 */
export const PRODUCT_CSOSN = ['102', '103', '300', '400', '500'] as const;
export const PRODUCT_CST_ICMS = ['00'] as const;
export const PRODUCT_CST_PIS_COFINS = [
  '01', '02', '04', '05', '06', '07', '08', '09', '49', '50', '51', '52', '53', '54', '55', '56',
  '60', '61', '62', '63', '64', '65', '66', '67', '70', '71', '72', '73', '74', '75', '98', '99',
] as const;

export const ProductFiscalProfileScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const ProductFiscalProfileParamsSchema = z.object({ productRef: z.string().min(1).max(120) }).strict();

export const UpsertProductFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1),
    ncm: z.string().regex(/^\d{8}$/, 'ncm: 8 dígitos (I05)'),
    cest: z.string().regex(/^\d{7}$/, 'cest: 7 dígitos (I05c)').nullable().optional(),
    origem: z.number().int().min(0).max(8),
    cfopPadrao: z.string().regex(/^\d{4}$/, 'cfopPadrao: 4 dígitos (I08)'),
    csosn: z.enum(PRODUCT_CSOSN).nullable().optional(),
    cstIcms: z.enum(PRODUCT_CST_ICMS).nullable().optional(),
    uCom: z.string().min(1).max(6),
    cEan: z.string().regex(/^(\d{8}|\d{12}|\d{13}|\d{14}|SEM GTIN)$/, 'cEan: GTIN-8/12/13/14 ou "SEM GTIN" (I03)'),
    cstPis: z.enum(PRODUCT_CST_PIS_COFINS),
    cstCofins: z.enum(PRODUCT_CST_PIS_COFINS),
    ibsCbsCst: z.string().regex(/^\d{3}$/).nullable().optional(),
    ibsCbsClassTrib: z.string().regex(/^\d{6}$/).nullable().optional(),
    xProd: z.string().min(1).max(120).nullable().optional(),
  })
  .strict();
export type UpsertProductFiscalProfileInput = z.infer<typeof UpsertProductFiscalProfileSchema>;
