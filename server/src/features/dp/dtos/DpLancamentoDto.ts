/**
 * DTOs do lançamento informado e da remuneração em outra empresa — BE-INCR-DP-F2 itens 16, 17, 20 e 77 (PR-1), §3.4.
 * `.strict()`; o `unitId` resolve o escopo pelo `AccountingScopeResolver` (como `/api/dp/vinculos`). Os updates são
 * `.partial()` de schemas SEM `.default()`. A recusa do schema sai como 400 `DP_LANCAMENTO_INVALIDO` com o campo
 * (controller), como a do serviço (item 17).
 */
import { z } from 'zod';
import { isValidCnpj } from '../../../lib/cnpj';
import { MAX_CENTS } from '../../accounting/models/money';
import { CompetenciaSchema } from '../models/competencia';
import { OUTRA_REMUNERACAO_CATEGORIAS, OUTRA_REMUNERACAO_ORDENS } from '../models/folha/outrasRemuneracoes';

const unitId = z.string().min(1);
const naoVazio = (o: Record<string, unknown>) => Object.keys(o).some((k) => k !== 'unitId' && o[k] !== undefined);
const cents = z.coerce.bigint().max(BigInt(MAX_CENTS)); // teto do 400 (memória max-cents-e-politica)

export const DpLancamentoIdParamSchema = z.object({ id: z.string().cuid(), lancamentoId: z.string().cuid() }).strict();
export const DpOutraRemuneracaoIdParamSchema = z.object({ id: z.string().cuid(), outraRemuneracaoId: z.string().cuid() }).strict();

// ── Itens 16–17 — lançamento ─────────────────────────────────────────────────────────────────────────────────────────
/** `?competencia=` filtra a lista (item 20). */
export const DpLancamentoQuerySchema = z.object({ unitId, competencia: CompetenciaSchema.optional() }).strict();
export type DpLancamentoQuery = z.infer<typeof DpLancamentoQuerySchema>;

const lancamento = {
  competencia: CompetenciaSchema,
  // Código do catálogo; ser INFORMADO, aplicar à categoria e a unidade (minutos × centavos) são checados no serviço.
  rubrica: z.string().regex(/^[A-Z][A-Z0-9_]{0,29}$/),
  quantidadeMin: z.number().int().positive().max(44_640).nullable(), // até 31 dias × 24 h
  valorCents: cents.positive().nullable(),
  observacao: z.string().trim().min(1).max(500).nullable(),
};

/** `origem` não entra: pela HTTP o lançamento é sempre `MANUAL` (o `MODULO` vem da porta do ponto, item 18). */
export const CreateLancamentoSchema = z
  .object({
    unitId,
    ...lancamento,
    quantidadeMin: lancamento.quantidadeMin.unwrap().optional(),
    valorCents: cents.positive().optional(),
    observacao: lancamento.observacao.unwrap().optional(),
  })
  .strict();
export type CreateLancamentoInput = z.infer<typeof CreateLancamentoSchema>;

/** `null` apaga a quantidade (para trocar de unidade junto com a rubrica) ou a observação. */
export const UpdateLancamentoSchema = z
  .object({ unitId, ...lancamento })
  .partial({ competencia: true, rubrica: true, quantidadeMin: true, valorCents: true, observacao: true })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type UpdateLancamentoInput = z.infer<typeof UpdateLancamentoSchema>;

// ── Item 77 — remuneração em outra empresa ───────────────────────────────────────────────────────────────────────────
const outra = {
  competencia: CompetenciaSchema,
  remuneracaoCents: cents.positive(),
  contribuicaoCents: cents.nonnegative(), // só conferência (item 77)
  ordem: z.enum(OUTRA_REMUNERACAO_ORDENS), // IN RFB 2.110 art. 36 § 1º I
  categoriaOutraFonte: z.enum(OUTRA_REMUNERACAO_CATEGORIAS),
  cnpjOutroEmpregador: z.string().refine(isValidCnpj, 'CNPJ inválido (14 posições com DV)'),
  // Item 78: sem documento, recusa (IN 2.110 art. 49 § 3º manda arquivar a declaração ou o holerite).
  documento: z.string().trim().min(1).max(500),
};
export const CreateOutraRemuneracaoSchema = z.object({ unitId, ...outra }).strict();
export type CreateOutraRemuneracaoInput = z.infer<typeof CreateOutraRemuneracaoSchema>;

export const UpdateOutraRemuneracaoSchema = z
  .object({ unitId, ...outra })
  .partial({
    competencia: true,
    remuneracaoCents: true,
    contribuicaoCents: true,
    ordem: true,
    categoriaOutraFonte: true,
    cnpjOutroEmpregador: true,
    documento: true,
  })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type UpdateOutraRemuneracaoInput = z.infer<typeof UpdateOutraRemuneracaoSchema>;
