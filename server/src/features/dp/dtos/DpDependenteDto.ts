/**
 * DTOs do dependente do trabalhador — BE-INCR-DP-F2 itens 13, 15 e 20 (PR-1), §3.4. `.strict()`; o `unitId` resolve o
 * escopo pelo `AccountingScopeResolver` (como `/api/dp/trabalhadores`). O update é `.partial()` de schema SEM `.default()`
 * (memória zod4-partial-aplica-default-reseta-campo): campo ausente no PATCH nunca é reescrito.
 */
import { z } from 'zod';
import { isValidCpf } from '../../../lib/cpf';
import { DateOnlySchema } from '../models/vigencia';

const unitId = z.string().min(1);
const naoVazio = (o: Record<string, unknown>) => Object.keys(o).some((k) => k !== 'unitId' && o[k] !== undefined);
const fimDepoisDoInicio = (v: { vigenteDesde?: string; vigenteAte?: string | null }) => !v.vigenteDesde || !v.vigenteAte || v.vigenteAte >= v.vigenteDesde;

export const DpDependenteIdParamSchema = z.object({ id: z.string().cuid(), dependenteId: z.string().cuid() }).strict();

const dependente = {
  nome: z.string().trim().min(1).max(120),
  cpf: z.string().regex(/^\d{11}$/, 'CPF = 11 dígitos').refine(isValidCpf, 'CPF inválido (DV)').nullable(),
  nascimento: DateOnlySchema,
  // Código da Tabela 07 do eSocial; a vigência em `vigenteDesde` é checada no serviço (ESOCIAL_TIPO_DEPENDENTE).
  tipo: z.string().regex(/^\d{2}$/, 'tipo = código de 2 dígitos da Tabela 07 do eSocial'),
  deduzIrrf: z.boolean(),
  salarioFamilia: z.boolean(),
  invalido: z.boolean(),
  vigenteDesde: DateOnlySchema,
  vigenteAte: DateOnlySchema.nullable(),
};

export const CreateDependenteSchema = z
  .object({
    unitId,
    ...dependente,
    cpf: dependente.cpf.unwrap().optional(),
    invalido: dependente.invalido.default(false),
    vigenteAte: DateOnlySchema.optional(),
  })
  .strict()
  .refine(fimDepoisDoInicio, 'vigenteAte < vigenteDesde');
export type CreateDependenteInput = z.infer<typeof CreateDependenteSchema>;

/** `cpf: null` apaga o CPF; `vigenteAte: null` reabre a vigência. */
export const UpdateDependenteSchema = z
  .object({ unitId, ...dependente })
  .partial({ nome: true, cpf: true, nascimento: true, tipo: true, deduzIrrf: true, salarioFamilia: true, invalido: true, vigenteDesde: true, vigenteAte: true })
  .strict()
  .refine(naoVazio, 'nada a alterar')
  .refine(fimDepoisDoInicio, 'vigenteAte < vigenteDesde');
export type UpdateDependenteInput = z.infer<typeof UpdateDependenteSchema>;
