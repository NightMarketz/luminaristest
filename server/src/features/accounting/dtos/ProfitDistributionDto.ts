import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';
import { ANO_RESULTADO_TRANSICAO_MAX, ORIGENS_LUCRO, PROFIT_DISTRIBUTION_EVENTOS } from '../models/profitDistribution';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 10–21, §4 `ProfitDistributionInputSchema`; F-IRD-4, F-IRD-5R, F-IRD-6,
 * F-IRD-9) — evento de distribuição de lucros com IRRF. `.strict()`; `unitId` = unidade do lançamento. Campo que não se
 * aplica ao caso é recusado (400), nunca aceito e ignorado: `contraAccountId` só fora de CREDITO (a conta do CREDITO vem
 * do perfil fiscal, item 11); os campos da transição só com `origemLucro = TRANSICAO` (item 14). O prazo da aprovação
 * (`aprovadoEm` ≤ a linha vigente de `TRANSICAO_APROVACAO_ATE`) é do serviço: depende do parâmetro legal.
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);
const centsPositive = z.number().int().min(1).max(MAX_CENTS);
const Competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competencia = YYYY-MM');

export const ProfitDistributionScopeSchema = z.object({ unitId: z.string().min(1) }).strict();
export const ProfitDistributionIdParamSchema = z.object({ id: z.string().min(1) }).strict();

export const ProfitDistributionInputSchema = z
  .object({
    unitId: z.string().min(1),
    partnerId: z.string().min(1),
    evento: z.enum(PROFIT_DISTRIBUTION_EVENTOS),
    dataEvento: dateOnly('dataEvento'),
    brutoCents: centsPositive,
    debitoAccountId: z.string().min(1),
    contraAccountId: z.string().min(1).optional(),
    origemLucro: z.enum(ORIGENS_LUCRO),
    anoResultado: z.number().int().optional(),
    aprovadoEm: dateOnly('aprovadoEm').optional(),
    atoSourceDocumentId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // Item 11 (F-IRD-9): CREDITO credita o passivo do sócio configurado no perfil; os outros escolhem a contrapartida.
    if (v.evento === 'CREDITO' && v.contraAccountId !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['contraAccountId'], message: 'CREDITO usa a conta de dividendos a pagar do perfil fiscal; não informe contraAccountId' });
    }
    if (v.evento !== 'CREDITO' && v.contraAccountId === undefined) {
      ctx.addIssue({ code: 'custom', path: ['contraAccountId'], message: `${v.evento} exige contraAccountId` });
    }
  })
  .superRefine((v, ctx) => {
    // Item 14 (L4, F-IRD-6): a transição exige o ano do resultado (≤ 2025), a data da aprovação e o ato anexado.
    if (v.origemLucro === 'TRANSICAO') {
      if (v.anoResultado === undefined || v.anoResultado > ANO_RESULTADO_TRANSICAO_MAX) {
        ctx.addIssue({ code: 'custom', path: ['anoResultado'], message: `TRANSICAO exige anoResultado ≤ ${ANO_RESULTADO_TRANSICAO_MAX}` });
      }
      if (v.aprovadoEm === undefined) ctx.addIssue({ code: 'custom', path: ['aprovadoEm'], message: 'TRANSICAO exige aprovadoEm' });
      if (v.atoSourceDocumentId === undefined) ctx.addIssue({ code: 'custom', path: ['atoSourceDocumentId'], message: 'TRANSICAO exige o ato de aprovação anexado' });
    } else {
      for (const k of ['anoResultado', 'aprovadoEm', 'atoSourceDocumentId'] as const) {
        if (v[k] !== undefined) ctx.addIssue({ code: 'custom', path: [k], message: `${k} só se aplica a origemLucro TRANSICAO` });
      }
    }
  });

/** Item 20 (F-IRD-8) — cancelamento do último evento do mês do sócio. */
export const CancelProfitDistributionSchema = z
  .object({ unitId: z.string().min(1), motivo: z.string().trim().min(1).max(500).optional() })
  .strict();

/** Item 21 (L8) — resumo do DARF do mês. */
export const IrrfMensalQuerySchema = z.object({ unitId: z.string().min(1), competencia: Competencia }).strict();

const cents = z.number().int();

/** Item 12 — a memória gravada no evento: os eventos do mês, a soma, a base, o devido, o já retido e o deste evento. */
export const MemoriaDistribuicaoSchema = z
  .object({
    competencia: Competencia,
    tipoPessoa: z.enum(['PF', 'PJ']),
    eventos: z.array(z.object({ id: z.string(), brutoCents: cents, irrfCents: cents, origemLucro: z.enum(ORIGENS_LUCRO) }).strict()),
    somaMesCents: cents,
    limiteMensalCents: cents,
    aliquotaBp: z.number().int(),
    baseMesCents: cents,
    devidoMesCents: cents,
    jaRetidoCents: cents,
    irrfEventoCents: cents,
    transicaoAprovacaoAte: z.object({ linhaId: z.string(), valor: z.string() }).strict().nullable(),
  })
  .strict();

/** Item 15 — §4 `ProfitDistributionPreviewView`. */
export const ProfitDistributionPreviewView = z.object({
  competencia: Competencia,
  somaMesCents: cents,
  baseMesCents: cents,
  devidoMesCents: cents,
  jaRetidoCents: cents,
  irrfEventoCents: cents,
  liquidoCents: cents,
  tetoSemRetencaoCents: cents,
  brutoMinimoCents: cents.nullable(),
  sugestao: z.enum(['NENHUMA', 'MOVER_EXCEDENTE_MES_SEGUINTE', 'AUMENTAR_BRUTO']),
  avisoSaldoLucro: z.string().nullable(),
});

/** Item 21 — §4 `IrrfMensalView`. */
export const IrrfMensalView = z.object({
  competencia: Competencia,
  codigoReceita: z.literal('1841'),
  totalCents: cents,
  vencimento: z.string(),
  eventos: z.array(z.string()),
});

export type ProfitDistributionInput = z.infer<typeof ProfitDistributionInputSchema>;
export type CancelProfitDistributionInput = z.infer<typeof CancelProfitDistributionSchema>;
export type IrrfMensalQuery = z.infer<typeof IrrfMensalQuerySchema>;
export type MemoriaDistribuicao = z.infer<typeof MemoriaDistribuicaoSchema>;
export type ProfitDistributionPreview = z.infer<typeof ProfitDistributionPreviewView>;
export type IrrfMensal = z.infer<typeof IrrfMensalView>;
