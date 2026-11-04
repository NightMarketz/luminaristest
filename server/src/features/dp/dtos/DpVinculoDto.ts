/**
 * DTOs do trabalhador, do vínculo e das versões do vínculo — BE-INCR-DP-F0-F1 itens 37–46 (PR-4), esboço do §3.4.
 * `.strict()`; o `unitId` resolve o escopo pelo `AccountingScopeResolver` (como `/api/dp/modules`). Os updates são
 * `.partial()` de schemas SEM `.default()` (memória zod4-partial-aplica-default-reseta-campo): campo ausente no PATCH
 * nunca é reescrito.
 */
import { z } from 'zod';
import { isValidCpf } from '../../../lib/cpf';
import { MAX_CENTS } from '../../accounting/models/money';
import { UND_SAL_FIXO_CODIGOS } from '../models/vinculo';
import { DateOnlySchema } from '../models/vigencia';

const unitId = z.string().min(1);
const naoVazio = (o: Record<string, unknown>) => Object.keys(o).some((k) => k !== 'unitId' && o[k] !== undefined);

export const DpVersaoIdParamSchema = z.object({ id: z.string().cuid(), versaoId: z.string().cuid() }).strict();

// ── Item 37 — trabalhador ────────────────────────────────────────────────────────────────────────────────────────────
const trabalhador = {
  cpf: z.string().regex(/^\d{11}$/, 'CPF = 11 dígitos').refine(isValidCpf, 'CPF inválido (DV)'),
  nome: z.string().trim().min(1).max(120),
  nascimento: DateOnlySchema,
  pcd: z.boolean(),
  employeeRef: z.string().min(1).nullable(),
  partnerId: z.string().cuid().nullable(),
};
export const CreateTrabalhadorSchema = z
  .object({
    unitId,
    ...trabalhador,
    pcd: trabalhador.pcd.default(false),
    employeeRef: z.string().min(1).optional(),
    partnerId: z.string().cuid().optional(),
  })
  .strict();
export const UpdateTrabalhadorSchema = z
  .object({ unitId, ...trabalhador })
  .partial({ cpf: true, nome: true, nascimento: true, pcd: true, employeeRef: true, partnerId: true })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type CreateTrabalhadorInput = z.infer<typeof CreateTrabalhadorSchema>;
export type UpdateTrabalhadorInput = z.infer<typeof UpdateTrabalhadorSchema>;

// ── Item 43 — versão do vínculo ──────────────────────────────────────────────────────────────────────────────────────
const versao = {
  lotacaoId: z.string().cuid(),
  cargoId: z.string().cuid().optional(),
  jornadaId: z.string().cuid().optional(),
  sindicatoId: z.string().cuid().optional(),
  salarioCents: z.coerce.bigint().positive().max(BigInt(MAX_CENTS)), // teto do 400 (memória max-cents-e-politica)
  unidadeSalario: z.enum(UND_SAL_FIXO_CODIGOS), // undSalFixo do S-2200 [D09]
};
export const VersaoVinculoSchema = z.object(versao).strict();

// ── Item 39 — vínculo + 1ª versão ────────────────────────────────────────────────────────────────────────────────────
export const CreateVinculoSchema = z
  .object({
    unitId,
    trabalhadorId: z.string().cuid(),
    matricula: z.string().trim().min(1).max(30), // `matricula` "C 1 1-30" no S-2200 [D09]
    // Código da Tabela 01; o núcleo (CATEGORIAS_NUCLEO) é checado no serviço para o 400 levar o reason (item 40).
    categoria: z.string().regex(/^\d{3}$/, 'categoria = código de 3 dígitos da Tabela 01 do eSocial'),
    dataInicio: DateOnlySchema,
    dataTermino: DateOnlySchema.optional(),
    versao: VersaoVinculoSchema,
  })
  .strict()
  .refine((v) => !v.dataTermino || v.dataTermino >= v.dataInicio, 'dataTermino < dataInicio');
export type CreateVinculoInput = z.infer<typeof CreateVinculoSchema>;

/** Item 43 — versão nova: começa em `vigenteDesde` e fecha a anterior na véspera. */
export const CreateVersaoSchema = z.object({ unitId, vigenteDesde: DateOnlySchema, ...versao }).strict();
export type CreateVersaoInput = z.infer<typeof CreateVersaoSchema>;

/**
 * Item 45 — correção no lugar (sem default: `.partial()` do schema da versão). `cargoId`, `jornadaId` e `sindicatoId`
 * aceitam `null` para tirar a referência (a natureza continua checada no serviço).
 */
export const CorrigirVersaoSchema = z
  .object({
    unitId,
    ...versao,
    cargoId: z.string().cuid().nullable(),
    jornadaId: z.string().cuid().nullable(),
    sindicatoId: z.string().cuid().nullable(),
  })
  .partial({ lotacaoId: true, cargoId: true, jornadaId: true, sindicatoId: true, salarioCents: true, unidadeSalario: true })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type CorrigirVersaoInput = z.infer<typeof CorrigirVersaoSchema>;
