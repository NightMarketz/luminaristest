import { z } from 'zod';
import { isLc116Codigo, listaLc116DoCache } from '../models/lc116ListaNacional';
import { isIndOp, IND_OP_DEFAULT_SALAO } from '../models/indOp';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 8) — perfil fiscal DO SERVIÇO (F-DFE-6 a). `.strict()`.
 * Cada regra cita o leiaute da DPS (Anexo I v1.01) ou o anexo transcrito:
 *  - `cTribNac` 6 dígitos [195] e ∈ lista nacional (models/lc116ListaNacional.ts, aba MUN.INCID_INFO.SERV.)
 *  - `cTribMun` 3 dígitos [196] · `cNBS` 9 dígitos [198] (Anexo B) · `cIndOp` ∈ Anexo C [339]
 *  - `cLocPrestacao` IBGE 7 [192]; null => FiscalProfile.codMun · `xDescServ` ≤ 1000 [197]
 *  - `cClassTrib` 6 dígitos (IBS-CBS-2027 PR-1, F-IBS-10 a); null => FiscalProfile.ibsCbsClassTrib na emissão
 * EFICIENCIA-FISCAL PR-5 (BRIEF item 25; ADR §7 `ServiceFiscalProfileServicosSchema`; F-EF-10/11 a):
 *  - `finalidade` TERAPEUTICA | ESTETICA | BELEZA; null = não informada ⇒ tratada como ESTETICA (I-17);
 *  - `elegivelHospitalar` só com `finalidade = TERAPEUTICA` e `fundamentoHospitalar` (item da Atribuição 4 da RDC Anvisa 50,
 *    texto informado — P-EF-7). ESTETICA/BELEZA elegível ⇒ 400 nomeado (ADR §6 item 26).
 */
export const ServiceFiscalProfileScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

export const ServiceFiscalProfileParamsSchema = z.object({ serviceRef: z.string().min(1).max(120) }).strict();

export const FINALIDADES_SERVICO = ['TERAPEUTICA', 'ESTETICA', 'BELEZA'] as const;
export type FinalidadeServico = (typeof FINALIDADES_SERVICO)[number];
export const HOSPITALAR_SO_TERAPEUTICA = 'HOSPITALAR_SO_TERAPEUTICA_COM_FUNDAMENTO';

export const UpsertServiceFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1),
    cTribNac: z.string().regex(/^\d{6}$/).refine((c) => isLc116Codigo(c, listaLc116DoCache()), 'cTribNac fora da lista nacional de serviços (Anexo I MUN.INCID_INFO.SERV.)'),
    cTribMun: z.string().regex(/^\d{3}$/).nullable().optional(),
    cNBS: z.string().regex(/^\d{9}$/).nullable().optional(),
    cIndOp: z.string().regex(/^\d{6}$/).refine(isIndOp, 'cIndOp fora da tabela de indicadores de operação (Anexo C)').default(IND_OP_DEFAULT_SALAO),
    cLocPrestacao: z.string().regex(/^\d{7}$/).nullable().optional(),
    xDescServ: z.string().min(1).max(1000).nullable().optional(),
    cClassTrib: z.string().regex(/^\d{6}$/).nullable().optional(),
    // Opcionais sem default (memória zod4-partial-aplica-default): campo omitido mantém o gravado; o serviço confere a
    // combinação final dentro da tx.
    finalidade: z.enum(FINALIDADES_SERVICO).nullable().optional(),
    elegivelHospitalar: z.boolean().optional(),
    fundamentoHospitalar: z.string().trim().min(3).max(280).nullable().optional(),
  })
  .strict()
  .refine((v) => v.elegivelHospitalar !== true || (v.finalidade === 'TERAPEUTICA' && !!v.fundamentoHospitalar), {
    message: `${HOSPITALAR_SO_TERAPEUTICA}: a equiparação hospitalar (Lei 9.249/1995 art. 15 § 1º III "a") só cabe a serviço de finalidade TERAPEUTICA com o fundamento informado (item da Atribuição 4 da RDC Anvisa 50).`,
    path: ['elegivelHospitalar'],
  });
/** Combinação final (gravado + corpo) — o serviço aplica dentro da tx; o `refine` do corpo é a mesma regra. */
export function hospitalarValido(v: { finalidade: string | null; elegivelHospitalar: boolean; fundamentoHospitalar: string | null }): boolean {
  return !v.elegivelHospitalar || (v.finalidade === 'TERAPEUTICA' && !!v.fundamentoHospitalar);
}

export type UpsertServiceFiscalProfileInput = z.infer<typeof UpsertServiceFiscalProfileSchema>;
