import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';
import { FORMAS_JCP, PERIODOS_JCP } from '../models/interestOnEquity';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26, §4 `JcpPreviewInputSchema`/`JcpPreviewView`; F-IRD-1, F-IRD-11,
 * F-IRD-12, F-IRD-14..18) — prévia do JCP. `.strict()`; `unitId` = unidade do lançamento e do razão lido.
 * `debitoPlAccountId` só na forma `PL` (a conta de PL debitada no lugar da despesa); em `DESPESA` é recusado. O rateio é
 * opcional (padrão: pela participação vigente na `dataCredito`).
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);
const centsPositive = z.number().int().min(1).max(MAX_CENTS);

const JcpBase = z
  .object({
    unitId: z.string().min(1),
    anoCalendario: z.number().int().min(2026),
    periodo: z.enum(PERIODOS_JCP),
    dataCredito: dateOnly('dataCredito'),
    forma: z.enum(FORMAS_JCP),
    totalCents: centsPositive,
    debitoPlAccountId: z.string().min(1).optional(),
    rateio: z
      .array(z.object({ partnerId: z.string().min(1), brutoCents: z.number().int().min(0).max(MAX_CENTS) }).strict())
      .min(1)
      .optional(),
  })
  .strict();

function refineJcp(v: z.infer<typeof JcpBase>, ctx: z.RefinementCtx): void {
  if (v.forma === 'PL' && v.debitoPlAccountId === undefined) {
    ctx.addIssue({ code: 'custom', path: ['debitoPlAccountId'], message: 'PL exige a conta de PL debitada (lucros acumulados ou reserva)' });
  }
  if (v.forma === 'DESPESA' && v.debitoPlAccountId !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['debitoPlAccountId'], message: 'DESPESA debita a conta de despesa de JCP do perfil; não informe debitoPlAccountId' });
  }
  if (v.dataCredito.slice(0, 4) !== String(v.anoCalendario)) {
    ctx.addIssue({ code: 'custom', path: ['dataCredito'], message: 'dataCredito tem de estar no anoCalendario' });
  }
  if (v.rateio && new Set(v.rateio.map((r) => r.partnerId)).size !== v.rateio.length) {
    ctx.addIssue({ code: 'custom', path: ['rateio'], message: 'sócio repetido no rateio' });
  }
}

export const JcpPreviewInputSchema = JcpBase.superRefine(refineJcp);

/**
 * PR-4 item 27 (L-IRD-5, dono 23/10: "Hash da prévia") — a confirmação leva o corpo da prévia + o `previaSha256` que ela
 * devolveu; o serviço recalcula dentro da tx e recusa com 409 se o hash mudou.
 */
export const JcpConfirmInputSchema = JcpBase.extend({ previaSha256: z.string().regex(/^[0-9a-f]{64}$/, 'previaSha256 = sha256 hex da prévia') })
  .strict()
  .superRefine(refineJcp);

export const JcpScopeSchema = z.object({ unitId: z.string().min(1) }).strict();
export const JcpIdParamSchema = z.object({ id: z.string().min(1) }).strict();
/** Item 31 — resumo do DARF 5706 da competência. */
export const JcpIrrfQuerySchema = z.object({ unitId: z.string().min(1), competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competencia = YYYY-MM') }).strict();

const cents = z.number().int();

/** Item 26 — §4 `JcpPreviewView`. */
export const JcpPreviewView = z.object({
  faixas: z.array(z.object({ de: z.string(), ate: z.string(), baseCents: cents, taxaDiaria: z.string(), jurosCents: cents })),
  jurosMaxTjlpCents: cents,
  limite50LucroCents: cents,
  limite50ReservasCents: cents,
  limiteDedutivelCents: cents,
  excessoIndedutivelCents: cents,
  alocacoes: z.array(z.object({ partnerId: z.string(), participacaoBp: z.number().int(), brutoCents: cents, irrfCents: cents, liquidoCents: cents })),
  lalurPrevisto: z.array(z.object({ livro: z.enum(['lalur', 'lacs']), codigo: z.string(), valorCents: cents })),
  avisos: z.array(z.string()),
  /** PR-4 (L-IRD-5): hash do cálculo inteiro — a confirmação o devolve. */
  previaSha256: z.string(),
});

/** Item 31 — §4 não define: um DARF por decêndio do crédito (Lei 11.196 art. 70 I b 1). */
export const JcpIrrfView = z.object({
  competencia: z.string(),
  codigoReceita: z.literal('5706'),
  totalCents: cents,
  darfs: z.array(z.object({ decendio: z.number().int(), vencimento: z.string(), totalCents: cents, calculos: z.array(z.string()) })),
});

export type JcpPreviewInput = z.infer<typeof JcpPreviewInputSchema>;
export type JcpConfirmInput = z.infer<typeof JcpConfirmInputSchema>;
export type JcpIrrfQuery = z.infer<typeof JcpIrrfQuerySchema>;
export type JcpIrrf = z.infer<typeof JcpIrrfView>;
export type JcpPreview = z.infer<typeof JcpPreviewView>;
