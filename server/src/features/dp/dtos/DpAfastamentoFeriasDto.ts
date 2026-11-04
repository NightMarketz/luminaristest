/**
 * DTOs do afastamento e das férias do vínculo — BE-INCR-DP-F0-F1 itens 56–60 (PR-6). `.strict()`; o `unitId` resolve o
 * escopo pelo `AccountingScopeResolver` (como `/api/dp/vinculos`). Os updates são `.partial()` de schemas SEM `.default()`
 * (memória zod4-partial-aplica-default-reseta-campo): campo ausente no PATCH nunca é reescrito.
 */
import { z } from 'zod';
import { DateOnlySchema } from '../models/vigencia';

const unitId = z.string().min(1);
const naoVazio = (o: Record<string, unknown>) => Object.keys(o).some((k) => k !== 'unitId' && o[k] !== undefined);

export const DpAfastamentoIdParamSchema = z.object({ id: z.string().cuid(), afastamentoId: z.string().cuid() }).strict();
export const DpFeriasImplantacaoIdParamSchema = z.object({ id: z.string().cuid(), implantacaoId: z.string().cuid() }).strict();

// ── Item 56 — afastamento ────────────────────────────────────────────────────────────────────────────────────────────
const afastamento = {
  // Código da Tabela 18 do eSocial; a vigência no `inicio` é checada no serviço (ESOCIAL_MOTIVO_AFASTAMENTO).
  motivo: z.string().regex(/^\d{2}$/, 'motivo = código de 2 dígitos da Tabela 18 do eSocial'),
  inicio: DateOnlySchema,
  fim: DateOnlySchema.nullable(),
  observacao: z.string().trim().min(1).max(500).nullable(),
};
const fimDepoisDoInicio = (v: { inicio?: string; fim?: string | null }) => !v.inicio || !v.fim || v.fim >= v.inicio;

export const CreateAfastamentoSchema = z
  .object({ unitId, ...afastamento, fim: DateOnlySchema.optional(), observacao: afastamento.observacao.unwrap().optional() })
  .strict()
  .refine(fimDepoisDoInicio, 'fim < inicio');
export type CreateAfastamentoInput = z.infer<typeof CreateAfastamentoSchema>;

/** `fim: null` reabre o afastamento; `observacao: null` apaga a observação. */
export const UpdateAfastamentoSchema = z
  .object({ unitId, ...afastamento })
  .partial({ motivo: true, inicio: true, fim: true, observacao: true })
  .strict()
  .refine(naoVazio, 'nada a alterar')
  .refine(fimDepoisDoInicio, 'fim < inicio');
export type UpdateAfastamentoInput = z.infer<typeof UpdateAfastamentoSchema>;

// ── Item 58 — implantação de férias ──────────────────────────────────────────────────────────────────────────────────
const implantacao = {
  aquisitivoInicio: DateOnlySchema, // casa com um período de `periodosDeFerias` (checado no serviço)
  diasGozados: z.number().int().min(0).max(30),
  fonte: z.string().trim().min(1).max(200),
};
export const CreateFeriasImplantacaoSchema = z.object({ unitId, ...implantacao }).strict();
export type CreateFeriasImplantacaoInput = z.infer<typeof CreateFeriasImplantacaoSchema>;

/** O `aquisitivoInicio` não muda: implantação de outro período = apagar e implantar de novo. */
export const UpdateFeriasImplantacaoSchema = z
  .object({ unitId, diasGozados: implantacao.diasGozados, fonte: implantacao.fonte })
  .partial({ diasGozados: true, fonte: true })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type UpdateFeriasImplantacaoInput = z.infer<typeof UpdateFeriasImplantacaoSchema>;

// ── Item 59 — períodos de férias ─────────────────────────────────────────────────────────────────────────────────────
/** `dataRef` = até quando listar os períodos (inclui o aquisitivo em curso). */
export const DpFeriasQuerySchema = z.object({ unitId, dataRef: DateOnlySchema }).strict();
export type DpFeriasQuery = z.infer<typeof DpFeriasQuerySchema>;
