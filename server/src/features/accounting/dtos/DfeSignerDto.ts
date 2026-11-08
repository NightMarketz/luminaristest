import { z } from 'zod';

/**
 * DTOs do assinador local (X10a EMENDA-4 §4.2, AL-3, AL-4, AL-12; ADR-ASSINADOR-LOCAL). Protocolo `v1`, `.strict()`.
 * O JSON Schema que o assinador consome é gerado daqui por `z.toJSONSchema()` (`dfeSigner.schema.json`, AL-17).
 *
 * Nenhuma view carrega o hash do token, o certificado inteiro nem o subject (CPF do responsável, AL-12/AL-16).
 */
const VERSAO = z.string().regex(/^\d+\.\d+\.\d+$/);
const CNPJ14 = z.string().regex(/^[0-9A-Z]{12}[0-9]{2}$/);
const YMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const AMBIENTE = z.enum(['producao', 'homologacao']);

/** AL-3 — o assinador troca o código por um token de dispositivo e manda só a parte pública do certificado. */
export const DfeSignerPareamentoBodySchema = z
  .object({
    codigo: z.string().min(10).max(32),
    nomeDispositivo: z.string().min(1).max(80),
    versaoAssinador: VERSAO,
    certificadoDerB64: z.string().min(100).max(20_000),
  })
  .strict();
export type DfeSignerPareamentoBody = z.infer<typeof DfeSignerPareamentoBodySchema>;

/**
 * Resposta do pareamento. `token` é mostrado uma vez, e só quando nasce um dispositivo: no 2º vínculo de um dispositivo
 * já pareado (L-AL-2, chamada com o Bearer dele) não há token novo, então o campo vem ausente.
 */
export const DfeSignerPareamentoRespostaSchema = z
  .object({
    dispositivoId: z.string(),
    token: z.string().length(43).optional(),
    unidades: z.array(z.object({ unitId: z.string(), cnpj: CNPJ14 }).strict()),
    ambiente: AMBIENTE,
    protocolo: z.literal('v1'),
  })
  .strict();
export type DfeSignerPareamentoResposta = z.infer<typeof DfeSignerPareamentoRespostaSchema>;

/** POST /api/accounting/dfe-assinador/:unitId/codigos — o código aparece uma vez (o banco só tem o hash). */
export const DfeSignerCodigoViewSchema = z.object({ codigo: z.string(), expiraEm: z.string().datetime() }).strict();
export type DfeSignerCodigoView = z.infer<typeof DfeSignerCodigoViewSchema>;

/**
 * GET /api/accounting/dfe-assinador/:unitId (AL-12; F-FEAS-5 a). `online`, `diasParaVencer` e `versaoMinima` são
 * calculados no servidor (uma fonte para o pré-voo e para a tela). `null` quando a unidade não tem assinador.
 */
export const DfeSignerViewSchema = z
  .object({
    dispositivoId: z.string(),
    nome: z.string(),
    versaoAssinador: z.string(),
    versaoMinima: VERSAO,
    lastSeenAt: z.string().datetime().nullable(),
    online: z.boolean(),
    tokenPresente: z.boolean(),
    certCnpjRaiz: z.string().regex(/^[0-9A-Z]{8}$/),
    certNotAfter: YMD,
    diasParaVencer: z.number().int(),
    certThumbprint: z.string().regex(/^[0-9a-f]{64}$/),
    ambiente: AMBIENTE,
    pareadoEm: z.string().datetime(),
    outrasUnidades: z.array(z.object({ unitId: z.string(), nome: z.string() }).strict()),
  })
  .strict();
export type DfeSignerView = z.infer<typeof DfeSignerViewSchema>;

/** Os schemas do protocolo servidor ⇄ assinador que vão para o `dfeSigner.schema.json` (AL-17). */
export const DFE_SIGNER_PROTOCOL_SCHEMAS = {
  PareamentoBody: DfeSignerPareamentoBodySchema,
  PareamentoResposta: DfeSignerPareamentoRespostaSchema,
} as const;
