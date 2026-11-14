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

/**
 * AL-7 / AL-12 (contrato §4.2) — o heartbeat do assinador, que vai na query do long-poll. Cada poll grava `lastSeenAt`,
 * a versão e `tokenPresente` do dispositivo.
 */
export const DfeSignerHeartbeatSchema = z
  .object({
    versaoAssinador: VERSAO,
    tokenPresente: z.boolean(),
    certThumbprintSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type DfeSignerHeartbeat = z.infer<typeof DfeSignerHeartbeatSchema>;

/**
 * Query de `GET /api/dfe-assinador/v1/tarefas`: o heartbeat chega em string (`tokenPresente=true|false` — nunca
 * `z.coerce.boolean()`, que leria "false" como true) e `espera` em segundos, 0..25 (padrão 25).
 */
export const DfeSignerTarefasQuerySchema = z
  .object({
    espera: z.coerce.number().int().min(0).max(25).default(25),
    versaoAssinador: VERSAO,
    tokenPresente: z.enum(['true', 'false']).transform((v) => v === 'true'),
    certThumbprintSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type DfeSignerTarefasQuery = z.infer<typeof DfeSignerTarefasQuerySchema>;

/** AL-10 (F-AL-5 b) — o conteúdo que o assinador reconfere antes de assinar. */
export const DfeSignerConteudoSchema = z
  .object({
    alvo: z.enum(['infNFe', 'infEvento', 'infInut', 'qrCodeV3Offline']),
    /** O elemento assinado já canonicalizado (c14n 2001, transforms enveloped + c14n): sha1 dele = `DigestValue`. */
    elementoXml: z.string().max(2_000_000).optional(),
    /** O `SignedInfo` canonicalizado (c14n 2001), base64: sha1 dele = `digestB64`. */
    signedInfoC14nB64: z.string().optional(),
    /** Os parâmetros 1–7 do QR Code v3 off-line (ASCII), base64: sha1 deles = `digestB64`. */
    baseQrB64: z.string().optional(),
    /**
     * 44 dígitos. L-AL-5 (dono, 07/11): opcional SÓ no `infInut`, que não tem chave — o diário do assinador grava o Id
     * de 41 dígitos do próprio elemento no lugar.
     */
    chave: z.string().regex(/^\d{44}$/).optional(),
    tpAmb: z.enum(['1', '2']),
  })
  .strict()
  .refine((c) => c.alvo === 'infInut' || c.chave !== undefined, { message: 'chave obrigatória fora do infInut (L-AL-5)', path: ['chave'] });
export type DfeSignerConteudo = z.infer<typeof DfeSignerConteudoSchema>;

export const DfeSignerTarefaAssinarSchema = z
  .object({
    id: z.string(),
    tipo: z.literal('ASSINAR'),
    algoritmo: z.literal('rsa-sha1'),
    digestB64: z.string(),
    conteudo: DfeSignerConteudoSchema,
    expiraEm: z.string().datetime(),
  })
  .strict();
export type DfeSignerTarefaAssinar = z.infer<typeof DfeSignerTarefaAssinarSchema>;

export const DfeSignerTarefaTransmitirSchema = z
  .object({
    id: z.string(),
    tipo: z.literal('TRANSMITIR'),
    url: z.string().url().startsWith('https://'),
    servico: z.enum(['NFeAutorizacao4', 'NFeConsultaProtocolo4', 'NFeInutilizacao4', 'NFeRecepcaoEvento4', 'NFeStatusServico4']),
    /** SOAP 1.2 já montado pelo servidor, base64. */
    envelopeB64: z.string(),
    timeoutMs: z.number().int().min(1_000).max(60_000),
    expiraEm: z.string().datetime(),
  })
  .strict();
export type DfeSignerTarefaTransmitir = z.infer<typeof DfeSignerTarefaTransmitirSchema>;

export const DfeSignerTarefaSchema = z.discriminatedUnion('tipo', [DfeSignerTarefaAssinarSchema, DfeSignerTarefaTransmitirSchema]);
export type DfeSignerTarefa = z.infer<typeof DfeSignerTarefaSchema>;

/** Resposta do long-poll com tarefa (sem tarefa: 204 sem corpo). */
export const DfeSignerTarefasRespostaSchema = z.object({ tarefas: z.array(DfeSignerTarefaSchema) }).strict();
export type DfeSignerTarefasResposta = z.infer<typeof DfeSignerTarefasRespostaSchema>;

/** Códigos de recusa do assinador (contrato §4.2): os 4 primeiros são do ASSINAR, os 5 últimos do TRANSMITIR. */
export const DFE_SIGNER_CODIGOS_ERRO = ['TOKEN_AUSENTE', 'PIN_CANCELADO', 'CERT_VENCIDO', 'CONTEUDO_RECUSADO', 'TLS', 'TIMEOUT', 'REDE', 'HTTP', 'HOST_FORA_DA_LISTA'] as const;
export type DfeSignerCodigoErro = (typeof DFE_SIGNER_CODIGOS_ERRO)[number];

/**
 * POST /api/dfe-assinador/v1/tarefas/:id/resultado (AL-6). L-AL-1 (D-2026-11-07-X10A-EMENDA-4-LACUNAS): o ASSINAR traz
 * também a parte pública do certificado que assinou (`certificadoDerB64`) — o servidor confere o sha256 contra o
 * `certThumbprint` do pareamento e usa o certificado só em memória, no `KeyInfo` da própria nota.
 */
export const DfeSignerResultadoBodySchema = z.union([
  z
    .object({
      ok: z.literal(true),
      tipo: z.literal('ASSINAR'),
      signatureValueB64: z.string().min(1).max(4_096),
      certificadoDerB64: z.string().min(100).max(20_000),
    })
    .strict(),
  z
    .object({
      ok: z.literal(true),
      tipo: z.literal('TRANSMITIR'),
      httpStatus: z.number().int().min(100).max(599),
      corpoB64: z.string().max(10_000_000),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: z.enum(DFE_SIGNER_CODIGOS_ERRO),
      /** Sem XML, sem PIN, sem caminho local. */
      message: z.string().max(500),
    })
    .strict(),
]);
export type DfeSignerResultadoBody = z.infer<typeof DfeSignerResultadoBodySchema>;

/** Os schemas do protocolo servidor ⇄ assinador que vão para o `dfeSigner.schema.json` (AL-17). */
export const DFE_SIGNER_PROTOCOL_SCHEMAS = {
  PareamentoBody: DfeSignerPareamentoBodySchema,
  PareamentoResposta: DfeSignerPareamentoRespostaSchema,
  Heartbeat: DfeSignerHeartbeatSchema,
  TarefasResposta: DfeSignerTarefasRespostaSchema,
  ResultadoBody: DfeSignerResultadoBodySchema,
} as const;
