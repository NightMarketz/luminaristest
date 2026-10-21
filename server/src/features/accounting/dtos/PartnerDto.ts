import { z } from 'zod';
import { isValidCpf } from '../../../lib/cpf';
import { isValidCnpj } from '../../../lib/cnpj';
import { isValidDateOnly } from '../models/dates';

/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF itens 1–4, §4 `CreatePartnerSchema`; F-IRD-2, F-IRD-14) — sócio beneficiário da
 * distribuição de lucros e do JCP, PJ-wide. `taxId` = CPF (11) ou CNPJ (14) só dígitos, com DV validado; `tipoPessoa` é
 * derivado do tamanho no serviço. `residenteBrasil: false` é aceito no cadastro (F-IRD-7): quem recusa são os fluxos de
 * dividendos e de JCP. `nome`/`taxId` são PII — só na linha, nunca em auditoria (item 33). `.strict()`.
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const PartnerScopeSchema = z.object({ unitId: z.string().min(1) }).strict();
export const PartnerIdParamSchema = z.object({ id: z.string().min(1) }).strict();
/** Item 3 — `?data=` (date-only) escolhe o dia da vigência; sem ele, hoje no fuso do escopo. */
export const ListPartnersQuerySchema = z.object({ unitId: z.string().min(1), data: dateOnly('data').optional() }).strict();

export const CreatePartnerSchema = z
  .object({
    unitId: z.string().min(1),
    nome: z.string().trim().min(1).max(200),
    taxId: z.string().regex(/^(\d{11}|\d{14})$/, 'taxId = CPF (11) ou CNPJ (14) só dígitos'),
    residenteBrasil: z.boolean(),
    participacaoBp: z.number().int().min(0).max(10000),
    entradaEm: dateOnly('entradaEm'),
    saidaEm: dateOnly('saidaEm').nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const ok = v.taxId.length === 11 ? isValidCpf(v.taxId) : isValidCnpj(v.taxId);
    if (!ok) ctx.addIssue({ code: 'custom', path: ['taxId'], message: `${v.taxId.length === 11 ? 'CPF' : 'CNPJ'} com dígito verificador inválido` });
  })
  .superRefine((v, ctx) => {
    if (v.saidaEm && v.saidaEm < v.entradaEm) ctx.addIssue({ code: 'custom', path: ['saidaEm'], message: 'saidaEm não pode ser anterior a entradaEm' });
  });

export const UpdatePartnerSchema = CreatePartnerSchema;

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;
export type ListPartnersQuery = z.infer<typeof ListPartnersQuerySchema>;
