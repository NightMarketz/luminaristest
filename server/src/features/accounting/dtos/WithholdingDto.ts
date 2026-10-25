import { z } from 'zod';
import { TRIBUTOS_RETENCAO } from '../models/retencaoParams';

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (BRIEF item 23, §5.4; F-RET-18 a) — leitura das retenções FEITAS: o contrato que a EFD-REINF
 * lê (por pagamento: R-4020, R-4010, R-2010) e o resumo por código (DARF/GPS/ISS). Só leitura; só `MADE` `ACTIVE` (as
 * sofridas são do PR-3). BigInt sai como string (padrão do repo). `taxId` aparece SÓ na rota de linhas (PII).
 */
const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competencia = YYYY-MM');

export const ListWithholdingsQuerySchema = z
  .object({ unitId: z.string().min(1), direction: z.literal('MADE'), competencia })
  .strict();
export const WithholdingSummaryQuerySchema = z.object({ unitId: z.string().min(1), competencia }).strict();

export const WithholdingLineViewSchema = z
  .object({
    id: z.string(),
    tributo: z.enum(TRIBUTOS_RETENCAO),
    event: z.enum(['RECOGNITION', 'SETTLEMENT']),
    dataFatoGerador: z.string(), // dtFG (IR = crédito; CSRF = pagamento — MOU item 6 f)
    competencia: z.string(),
    beneficiario: z
      .object({ counterpartyId: z.string(), nome: z.string(), taxId: z.string().nullable(), kind: z.enum(['CPF', 'CNPJ']).nullable(), regime: z.string().nullable() })
      .strict(),
    natRend: z.string().nullable(),
    codigoReceita: z.string().nullable(), // null = RETENCAO_CODIGO ainda DRAFT
    brutoCents: z.string(),
    baseCents: z.string(),
    amountCents: z.string(),
    dispensa: z.string().nullable(),
    titulo: z.object({ payableId: z.string(), documentNumber: z.string().nullable(), documentoSerie: z.string().nullable(), issueDate: z.string() }).strict(),
    inss: z.object({ tpServico: z.string().nullable(), cprb: z.boolean().nullable() }).strict().nullable(), // R-2010
    pf: z
      .object({
        dependentes: z.number(),
        deducaoDependentesCents: z.string(),
        previdenciaCents: z.string(),
        pensaoCents: z.string(),
        descontoSimplificadoCents: z.string(),
        reducaoArt3ACents: z.string(),
      })
      .strict()
      .nullable(), // R-4010 ideDep/detDed
    taxPayableId: z.string().nullable(),
  })
  .strict();
export type WithholdingLineView = z.infer<typeof WithholdingLineViewSchema>;

/** Emenda 22/10 item 2 — a porta da Reinf (sem HTTP): a linha + as baixas que agrupam por pagamento. */
export const WithholdingLineForReinfSchema = WithholdingLineViewSchema.extend({
  settlementId: z.string().nullable(), // baixa WITHHOLDING da linha (null na dispensa)
  originSettlementId: z.string().nullable(), // PAYMENT que gerou a CSRF
}).strict();
export type WithholdingLineForReinf = z.infer<typeof WithholdingLineForReinfSchema>;

export const WithholdingSummarySchema = z
  .object({
    competencia: z.string(),
    feitas: z.array(
      z
        .object({
          codigoReceita: z.string().nullable(),
          tributos: z.array(z.string()),
          totalCents: z.string(),
          vencimento: z.string().nullable(),
          status: z.enum(['OPEN', 'PARTIALLY_PAID', 'PAID', 'DEFERRED']),
          competenciasSomadas: z.array(z.string()), // Lei 9.430 art. 68 § 1º
          taxPayableId: z.string().nullable(),
          linhas: z.number().int(),
        })
        .strict(),
    ),
    sofridas: z.array(z.object({ tributo: z.string(), totalCents: z.string(), linhas: z.number().int() }).strict()), // PR-3
    avisos: z.array(z.string()),
  })
  .strict();
export type WithholdingSummary = z.infer<typeof WithholdingSummarySchema>;

export type ListWithholdingsQuery = z.infer<typeof ListWithholdingsQuerySchema>;
export type WithholdingSummaryQuery = z.infer<typeof WithholdingSummaryQuerySchema>;
