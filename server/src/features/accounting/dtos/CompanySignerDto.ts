import { z } from 'zod';
import { isValidCpf, stripCpfMask } from '../../../lib/cpf';
import { normalizePhone, PHONE_RE } from '../models/AccountingContact.model';
import { SPED_ECD_QUALIF_ASSINANTE_CODES, SPED_ECF_QUALIF_ASSINANTE_CODES } from '../models/spedQualifAssinante';

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 8; PRE-ADR F-OBP-9 → a) — signatário da empresa que NÃO é
 * o contador. Duas qualificações porque J930 (ECD) e 0930 (ECF) são tabelas diferentes (F-C12-2 a). `900`
 * (Contador/Contabilista) é recusado nas duas: o contador mora em `AccountingContact`. `.strict()`.
 * `nome`/`cpf`/`email`/`fone` são PII — só na linha, nunca em auditoria (BRIEF item 10).
 */
const cpfSchema = z
  .string()
  .transform((v) => stripCpfMask(v.trim()))
  .refine(isValidCpf, 'cpf deve ter 11 dígitos com dígitos verificadores válidos (J930/0930 IDENT_CPF_CNPJ)');

const foneSchema = z
  .string()
  .transform((v) => normalizePhone(v.trim()))
  .refine((v) => PHONE_RE.test(v), 'fone deve ter 10 ou 11 dígitos com DDD (0930 FONE)');

const NAO_CONTADOR = (v: string) => v !== '900';
const MSG_900 = "'900' (Contador) não é cadastrado aqui — use o contato do contador (AccountingContact).";

export const CompanySignerScopeSchema = z.object({ unitId: z.string().min(1) }).strict();
export const CompanySignerIdParamSchema = z.object({ id: z.string().min(1) }).strict();

export const CreateCompanySignerSchema = z
  .object({
    unitId: z.string().min(1),
    nome: z.string().trim().min(1).max(150),
    cpf: cpfSchema,
    qualifEcd: z.enum(SPED_ECD_QUALIF_ASSINANTE_CODES).refine(NAO_CONTADOR, MSG_900),
    qualifEcf: z.enum(SPED_ECF_QUALIF_ASSINANTE_CODES).refine(NAO_CONTADOR, MSG_900),
    email: z.string().trim().email('E-mail inválido.'),
    fone: foneSchema,
  })
  .strict();

export const UpdateCompanySignerSchema = CreateCompanySignerSchema;

export type CreateCompanySignerInput = z.infer<typeof CreateCompanySignerSchema>;
