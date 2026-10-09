import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';

/**
 * BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI, bloco 1 (nó SIMPLES-PISO-ANEXO-XI; BRIEF §3 item 1, §4; F-PI-1 a): benefício
 * municipal de ISS para a ME/EPP do Simples (Res. CGSN 140 art. 31 I-II). `.strict()`.
 *  - `cTribNacPrefixos`: item+subitem (4 dígitos) ou código completo (6) da lista nacional; `[]` = todos os serviços —
 *    o benefício pode ser diferenciado por ramo de atividade (art. 32 II).
 *  - `reducaoBpPorFaixa`: redução sobre o percentual efetivo do ISS (art. 32 § 1º), 6 faixas ou 1 para todas
 *    (§§ 2º-3º); obrigatória na REDUCAO_PERCENTUAL.
 *  - `legislacao`: a legislação concessiva, que a prestadora informa no documento fiscal (art. 27 § 1º).
 * Um schema para POST e PUT (substituição integral — sem `.partial()`, memória zod4-partial-aplica-default).
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const ISS_BENEFICIO_TIPO = ['ISENCAO', 'REDUCAO_PERCENTUAL', 'VALOR_FIXO'] as const;
export type IssBeneficioTipo = (typeof ISS_BENEFICIO_TIPO)[number];

export const IssBeneficioMunicipalCreateDto = z
  .object({
    unitId: z.string().min(1),
    codMun: z.string().regex(/^\d{7}$/, 'codMun = código IBGE de 7 dígitos'),
    cTribNacPrefixos: z
      .array(z.string().regex(/^\d{4}(\d{2})?$/, 'prefixo = item+subitem (4 dígitos) ou cTribNac (6 dígitos)'))
      .max(50)
      .default([]),
    tipo: z.enum(ISS_BENEFICIO_TIPO),
    reducaoBpPorFaixa: z.array(z.number().int().min(0).max(10000)).min(1).max(6).nullable(),
    legislacao: z.string().trim().min(3).max(300),
    vigenteDesde: dateOnly('vigenteDesde'),
    vigenteAte: dateOnly('vigenteAte').nullable().default(null),
  })
  .strict()
  .refine((v) => v.tipo !== 'REDUCAO_PERCENTUAL' || v.reducaoBpPorFaixa !== null, {
    message: 'REDUCAO_PERCENTUAL exige reducaoBpPorFaixa (Res. CGSN 140 art. 32 § 3º)',
    path: ['reducaoBpPorFaixa'],
  })
  .refine((v) => v.reducaoBpPorFaixa === null || [1, 6].includes(v.reducaoBpPorFaixa.length), {
    message: 'reducaoBpPorFaixa = 1 valor (todas as faixas) ou 6 (uma por faixa) — Res. CGSN 140 art. 32 §§ 2º-3º',
    path: ['reducaoBpPorFaixa'],
  })
  .refine((v) => v.vigenteAte === null || v.vigenteAte >= v.vigenteDesde, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type IssBeneficioMunicipalInput = z.infer<typeof IssBeneficioMunicipalCreateDto>;

export const IssBeneficioMunicipalScopeQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export const IssBeneficioMunicipalIdParamSchema = z.object({ id: z.string().min(1) }).strict();
