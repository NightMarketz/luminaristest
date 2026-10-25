import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { NATUREZAS_SERVICO } from '../models/retencaoParams';

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 6, §5.3 `WithholdingProfileCreateSchema`) — perfil de retenção por contraparte ×
 * natureza do serviço. `.strict()`. As regras que dependem só do corpo (flag ⇒ campo obrigatório) rodam no `superRefine`; as
 * que leem o banco (contraparte PF, `natRend` na Tabela 01, sobreposição de vigência) rodam no serviço, dentro da tx.
 * O update é o corpo inteiro (sem `.partial()` — memória Zod 4: o default reseta o campo); `counterpartyId` não muda.
 */
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const WithholdingProfileScopeSchema = z.object({ unitId: z.string().min(1) }).strict();
export const WithholdingProfileIdParamSchema = z.object({ id: z.string().min(1) }).strict();
export const ListWithholdingProfilesQuerySchema = z.object({ unitId: z.string().min(1), counterpartyId: z.string().min(1).optional() }).strict();

const corpo = z.object({
  unitId: z.string().min(1),
  naturezaServico: z.enum(NATUREZAS_SERVICO),
  natRend: z.string().regex(/^\d{5}$/, 'natRend = 5 dígitos (Tabela 01 da EFD-Reinf)').nullable().optional(),
  irrf: z.boolean(),
  csrf: z.boolean(),
  inss: z.boolean(),
  issRetido: z.boolean(),
  inssTpServico: z.string().regex(/^\d{9}$/, 'inssTpServico = 9 dígitos (Tabela 06 da EFD-Reinf)').nullable().optional(),
  inssCprb: z.boolean().nullable().optional(),
  issCodMun: z.string().regex(/^\d{7}$/, 'issCodMun = código IBGE de 7 dígitos').nullable().optional(),
  issAliquotaBp: z.number().int().min(0).max(10_000).nullable().optional(),
  issVencimentoDia: z.number().int().min(1).max(31).nullable().optional(),
  fonte: z.string().trim().min(3),
  vigenteDesde: dateOnly('vigenteDesde'),
  vigenteAte: dateOnly('vigenteAte').nullable().optional(),
});

type Corpo = z.infer<typeof corpo>;
const regras = (v: Corpo, ctx: z.RefinementCtx) => {
  if (v.issRetido && (v.issCodMun == null || v.issAliquotaBp == null)) {
    ctx.addIssue({ code: 'custom', path: ['issCodMun'], message: 'issRetido exige issCodMun e issAliquotaBp' });
  }
  if (v.inss && v.inssTpServico == null) ctx.addIssue({ code: 'custom', path: ['inssTpServico'], message: 'inss exige inssTpServico' });
  if ((v.irrf || v.csrf) && v.natRend == null) ctx.addIssue({ code: 'custom', path: ['natRend'], message: 'irrf ou csrf exige natRend' });
  if (v.vigenteAte && v.vigenteAte < v.vigenteDesde) ctx.addIssue({ code: 'custom', path: ['vigenteAte'], message: 'vigenteAte não pode ser anterior a vigenteDesde' });
};

export const CreateWithholdingProfileSchema = corpo.extend({ counterpartyId: z.string().min(1) }).strict().superRefine(regras);
export const UpdateWithholdingProfileSchema = corpo.strict().superRefine(regras);

export type CreateWithholdingProfileInput = z.infer<typeof CreateWithholdingProfileSchema>;
export type UpdateWithholdingProfileInput = z.infer<typeof UpdateWithholdingProfileSchema>;
export type ListWithholdingProfilesQuery = z.infer<typeof ListWithholdingProfilesQuerySchema>;
