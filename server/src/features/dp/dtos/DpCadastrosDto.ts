/**
 * DTOs dos cadastros de estrutura do DP — BE-INCR-DP-F0-F1 item 35 (PR-3): `/api/dp/lotacoes`, `/cargos`, `/jornadas`,
 * `/sindicatos`, `/convencoes` e `/convencoes/:id/parametros`. `.strict()`; o `unitId` resolve o escopo pelo
 * `AccountingScopeResolver` (como `/api/dp/modules`). Os updates são `.partial()` de schemas SEM `.default()` (memória
 * zod4-partial-aplica-default-reseta-campo): campo ausente no PATCH nunca é reescrito.
 */
import { z } from 'zod';
import { isValidCnpj } from '../../../lib/cnpj';
import { MAX_CENTS } from '../../accounting/models/money';
import { CCT_CHAVES, TP_JORNADA_CODIGOS } from '../models/cadastros';
import { DateOnlySchema } from '../models/vigencia';

const unitId = z.string().min(1);
const naoVazio = (o: Record<string, unknown>) => Object.keys(o).some((k) => k !== 'unitId' && o[k] !== undefined);
const vigenciaOk = (v: { vigenteDesde?: string; vigenteAte?: string | null }) =>
  !v.vigenteDesde || !v.vigenteAte || v.vigenteAte >= v.vigenteDesde;

/** `limit` com teto (item 35). */
export const DpListQuerySchema = z.object({ unitId, limit: z.coerce.number().int().min(1).max(200).default(50) }).strict();
export type DpListQuery = z.infer<typeof DpListQuerySchema>;

export const DpParametroIdParamSchema = z.object({ id: z.string().cuid(), parametroId: z.string().cuid() }).strict();

// ── Item 28 — lotação ────────────────────────────────────────────────────────────────────────────────────────────────
const lotacao = {
  codigo: z.string().trim().min(1).max(30), // codLotacao "C 1 1-30" [D09]
  descricao: z.string().trim().min(1).max(200),
};
export const CreateLotacaoSchema = z.object({ unitId, ...lotacao }).strict();
export const UpdateLotacaoSchema = z.object({ unitId, ...lotacao }).partial({ codigo: true, descricao: true }).strict().refine(naoVazio, 'nada a alterar');
export type CreateLotacaoInput = z.infer<typeof CreateLotacaoSchema>;
export type UpdateLotacaoInput = z.infer<typeof UpdateLotacaoSchema>;

// ── Item 29 — cargo ──────────────────────────────────────────────────────────────────────────────────────────────────
const cargo = {
  nome: z.string().trim().min(1).max(120),
  cbo: z.string().regex(/^\d{6}$/, 'CBO = 6 dígitos'), // CBOCargo "C 1 6" [D09]
};
export const CreateCargoSchema = z.object({ unitId, ...cargo }).strict();
export const UpdateCargoSchema = z.object({ unitId, ...cargo }).partial({ nome: true, cbo: true }).strict().refine(naoVazio, 'nada a alterar');
export type CreateCargoInput = z.infer<typeof CreateCargoSchema>;
export type UpdateCargoInput = z.infer<typeof UpdateCargoSchema>;

// ── Item 30 — jornada ────────────────────────────────────────────────────────────────────────────────────────────────
const jornada = {
  nome: z.string().trim().min(1).max(120),
  minutosSemanais: z.number().int().positive().max(7 * 24 * 60),
  tipoJornada: z.enum(TP_JORNADA_CODIGOS), // tpJornada do S-2200 [D09]
  descricao: z.string().trim().min(1).max(999).nullable(), // dscJorn "C 1 1-999" [D09]
};
export const CreateJornadaSchema = z.object({ unitId, ...jornada, descricao: jornada.descricao.optional() }).strict();
export const UpdateJornadaSchema = z
  .object({ unitId, ...jornada })
  .partial({ nome: true, minutosSemanais: true, tipoJornada: true, descricao: true })
  .strict()
  .refine(naoVazio, 'nada a alterar');
export type CreateJornadaInput = z.infer<typeof CreateJornadaSchema>;
export type UpdateJornadaInput = z.infer<typeof UpdateJornadaSchema>;

// ── Item 31 — sindicato ──────────────────────────────────────────────────────────────────────────────────────────────
const sindicato = {
  cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido (14 posições com DV)'),
  nome: z.string().trim().min(1).max(200),
};
export const CreateSindicatoSchema = z.object({ unitId, ...sindicato }).strict();
export const UpdateSindicatoSchema = z.object({ unitId, ...sindicato }).partial({ cnpj: true, nome: true }).strict().refine(naoVazio, 'nada a alterar');
export type CreateSindicatoInput = z.infer<typeof CreateSindicatoSchema>;
export type UpdateSindicatoInput = z.infer<typeof UpdateSindicatoSchema>;

// ── Item 32 — convenção coletiva ─────────────────────────────────────────────────────────────────────────────────────
const convencao = {
  identificacao: z.string().trim().min(1).max(200),
  vigenteDesde: DateOnlySchema,
  vigenteAte: DateOnlySchema.nullable(),
  fonte: z.string().trim().min(3).max(500),
};
export const CreateConvencaoSchema = z
  .object({ unitId, sindicatoId: z.string().cuid(), ...convencao, vigenteAte: convencao.vigenteAte.optional() })
  .strict()
  .refine(vigenciaOk, 'vigenteAte < vigenteDesde');
export const UpdateConvencaoSchema = z
  .object({ unitId, ...convencao })
  .partial({ identificacao: true, vigenteDesde: true, vigenteAte: true, fonte: true })
  .strict()
  .refine(naoVazio, 'nada a alterar')
  .refine(vigenciaOk, 'vigenteAte < vigenteDesde');
export type CreateConvencaoInput = z.infer<typeof CreateConvencaoSchema>;
export type UpdateConvencaoInput = z.infer<typeof UpdateConvencaoSchema>;

// ── Item 33 — parâmetro da convenção ─────────────────────────────────────────────────────────────────────────────────
const parametro = {
  valorInt: z.coerce.bigint().positive().max(BigInt(MAX_CENTS)), // PISO_SALARIAL_CENTS: centavos (teto do 400)
  clausula: z.string().trim().min(1).max(4000),
  vigenteDesde: DateOnlySchema,
  vigenteAte: DateOnlySchema.nullable(),
};
export const CreateConvencaoParametroSchema = z
  .object({
    unitId,
    chave: z.enum(CCT_CHAVES),
    discriminador: z.string().cuid(), // PISO_SALARIAL_CENTS: cargoId (item 33)
    ...parametro,
    vigenteAte: parametro.vigenteAte.optional(),
  })
  .strict()
  .refine(vigenciaOk, 'vigenteAte < vigenteDesde');
export const UpdateConvencaoParametroSchema = z
  .object({ unitId, ...parametro })
  .partial({ valorInt: true, clausula: true, vigenteDesde: true, vigenteAte: true })
  .strict()
  .refine(naoVazio, 'nada a alterar')
  .refine(vigenciaOk, 'vigenteAte < vigenteDesde');
export type CreateConvencaoParametroInput = z.infer<typeof CreateConvencaoParametroSchema>;
export type UpdateConvencaoParametroInput = z.infer<typeof UpdateConvencaoParametroSchema>;
