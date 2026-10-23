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

export const JcpPreviewInputSchema = z
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
  .strict()
  .superRefine((v, ctx) => {
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
  });

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
});

export type JcpPreviewInput = z.infer<typeof JcpPreviewInputSchema>;
export type JcpPreview = z.infer<typeof JcpPreviewView>;
