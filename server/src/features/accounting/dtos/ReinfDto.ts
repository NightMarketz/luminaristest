import { z } from 'zod';

/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF itens 10, 11, 13, 14; §5.3) — `.strict()`. `unitId` só resolve escopo/policy e a cadeia de
 * auditoria (precedente do X9, lacuna 1 do PR-2, dono 07/10); o lote é da PJ inteira (F-REINF-11 a). `competencia` ≤ mês
 * corrente (`perApur`, leiaute 2.1.2b: "Não pode ser maior que o ano/mês corrente") é conferida no serviço, que tem o relógio.
 */
const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competencia = YYYY-MM');

export const ReinfBatchRequestSchema = z.object({ unitId: z.string().min(1), competencia }).strict();
export type ReinfBatchRequest = z.infer<typeof ReinfBatchRequestSchema>;

export const ReinfBatchListQuerySchema = z.object({ unitId: z.string().min(1), competencia }).strict();
export type ReinfBatchListQuery = z.infer<typeof ReinfBatchListQuerySchema>;

export const ReinfBatchGetQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export type ReinfBatchGetQuery = z.infer<typeof ReinfBatchGetQuerySchema>;

/** Um evento do lote no registro: sem CPF/CNPJ (PRE-ADR D8; `beneficiarioRef` = ids internos). */
export const ReinfBatchEventoSchema = z
  .object({
    tipo: z.string(),
    idEvento: z.string(),
    sha256: z.string(),
    origemIds: z.array(z.string()),
    beneficiarioRef: z.string().optional(),
    conteudoSha256: z.string().optional(), // só R-1000 (lacuna D, dono 26/10)
    prazo: z.string().optional(), // PR-3 (item 21): só nos periódicos; trimestral no R-4010 só de isenção 12 (lacuna B, dono 28/10)
  })
  .strict();
export type ReinfBatchEvento = z.infer<typeof ReinfBatchEventoSchema>;

export const ReinfBatchViewSchema = z
  .object({
    id: z.string(),
    competencia: z.string(),
    tpAmb: z.number().int(),
    sha256: z.string(),
    status: z.enum(['GERADO', 'TRANSMITIDO', 'ACEITO', 'REJEITADO']),
    eventos: z.array(ReinfBatchEventoSchema),
    defasado: z.boolean(),
    prazo: z.string(),
    geradoPorId: z.string(),
    createdAt: z.string(),
  })
  .strict();
export type ReinfBatchView = z.infer<typeof ReinfBatchViewSchema>;

/**
 * Item 14 — uma linha do relatório de conferência (beneficiário mascarado; centavos como string). PR-2 (lacuna D, dono
 * 27/10): também R-4010 e R-2010; `natRend` nulo no R-2010.
 */
export const ReinfRelatorioLinhaSchema = z
  .object({
    evento: z.enum(['R-4020', 'R-4010', 'R-2010']),
    beneficiario: z.string(),
    natRend: z.string().nullable(),
    dtFG: z.string(),
    tributo: z.string(),
    brutoCents: z.string(),
    baseCents: z.string(),
    retidoCents: z.string(),
    codigoReceita: z.string().nullable(),
    vencimentoDarf: z.string().nullable(),
    prazoReinf: z.string(), // PR-3 (item 21): prazo do evento da linha
  })
  .strict();

/**
 * PR-3 (item 23) — avisos com código, para o i18n pt/en traduzir (`reinf.avisos.<codigo>`, molde `kit.warnings`); `detalhe` é o
 * texto pt do servidor. `PERFIL_SEM_NATUREZA` e `CONTATO_SEM_CPF` do BRIEF seguem como 400 do PR-1 (lacuna C, dono 28/10).
 */
export const REINF_AVISO_CODIGOS = [
  'PF_SERVICO_FORA_DA_REINF',
  'DIVIDENDO_PJ_FORA_DA_REINF',
  'NATUREZA_NAO_CONFERIDA',
  'DEFASADO_RETIFICAR',
  'REABRIR_ANTES',
] as const;
export const ReinfAvisoSchema = z.object({ codigo: z.enum(REINF_AVISO_CODIGOS), quantidade: z.number().int().positive(), detalhe: z.string() }).strict();
export type ReinfAviso = z.infer<typeof ReinfAvisoSchema>;

/** Item 13 — evento de lote anterior cuja origem foi estornada: retificar (e reabrir antes, se o lote foi transmitido — L4). */
export const ReinfMarcacaoSchema = z
  .object({ batchId: z.string(), idEvento: z.string(), tipo: z.string(), acao: z.enum(['RETIFICAR', 'REABRIR_ANTES']) })
  .strict();

export const ReinfRelatorioSchema = z
  .object({
    competencia: z.string(),
    prazo: z.string(),
    linhas: z.array(ReinfRelatorioLinhaSchema),
    totaisPorCodigo: z.array(z.object({ codigoReceita: z.string().nullable(), totalCents: z.string() }).strict()),
    marcacoes: z.array(ReinfMarcacaoSchema),
    avisos: z.array(ReinfAvisoSchema),
    csv: z.string(),
  })
  .strict();
export type ReinfRelatorio = z.infer<typeof ReinfRelatorioSchema>;

/**
 * Resposta do POST (201). PR-3 (item 22; lacuna A, dono 28/10): o XML e o CSV do relatório também viram 2 jobs de export
 * (`EXPORT_REINF`, `EXPORT_REINF_RELATORIO`), extras do pacote do contador; o `sha256` do job do XML = o do lote.
 */
export const ReinfBatchCreatedSchema = z
  .object({
    batchId: z.string(),
    sha256: z.string(),
    xml: z.string(),
    relatorio: ReinfRelatorioSchema,
    exportJobIds: z.object({ xml: z.string(), relatorio: z.string() }).strict(),
  })
  .strict();
export type ReinfBatchCreated = z.infer<typeof ReinfBatchCreatedSchema>;
