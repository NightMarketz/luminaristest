import { z } from 'zod';
import {
  ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH,
  ACCOUNTING_CONTACT_NAME_MAX_LENGTH,
  crcNumberUf,
  isValidCrcCertificate,
  normalizeCrcCertificate,
  normalizeCrcNumber,
  normalizePhone,
  PHONE_RE,
  UF_CODES,
} from '../models/AccountingContact.model';
import { isValidDateOnly } from '../models/dates';
import { isValidCpf, stripCpfMask } from '../../../lib/cpf';

/**
 * AccountingContactDto — cadastro do contador destinatário (BE-INCR-CONTADOR-DELIVERY, itens 1-3).
 * Schemas de CORPO são `.strict()` (campo com typo é 400, não descarte silencioso); os de QUERY
 * não são, seguindo o levantamento do `queryPrimitives`.
 *
 * **Máscara em TODOS os campos de identidade** (decisão do dono 2026-09-10, cédula §6, F13 —
 * "pode fazer máscara em todos os campos"): `cpf` com dígitos verificadores, `crcNumber` no
 * formato do CFC normalizado para `UF-NNNNNN/O-D` **e cruzado com `crcUf`**, `phone` só dígitos,
 * `crcUf` enum da Tabela de UF, `crcCertificate` `UF/AAAA/NÚMERO`, `crcCertificateValidUntil`
 * date-only real. Fontes: Manual do Leiaute 9 da ECD (J930 03/06/08/09/10/11) e Manual de
 * Registro do Sistema CFC/CRCs (formato do número do CRC).
 *
 * `name`/`email`/`cpf`/`phone` são PII de terceiro — entram na LINHA, nunca no payload de auditoria (D5).
 */

const cpfSchema = z
  .string()
  .transform((v) => stripCpfMask(v.trim()))
  .refine(isValidCpf, 'cpf deve ter 11 dígitos com dígitos verificadores válidos (J930 IDENT_CPF_CNPJ)');

const phoneSchema = z
  .string()
  .transform((v) => normalizePhone(v.trim()))
  .refine((v) => PHONE_RE.test(v), 'phone deve ter 10 ou 11 dígitos com DDD (J930 FONE)');

const crcNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH)
  .transform((v, ctx) => {
    const normalized = normalizeCrcNumber(v);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'crcNumber deve seguir o formato do CFC UF-NNNNNN/O-D (ex.: SP-123456/O-1)',
      });
      return z.NEVER;
    }
    return normalized;
  });

const crcCertificateSchema = z
  .string()
  .transform((v) => normalizeCrcCertificate(v))
  .refine(
    (v) => isValidCrcCertificate(v),
    'crcCertificate deve seguir UF/AAAA/NÚMERO (J930 NUM_SEQ_CRC), com UF da Tabela de UF e ano válido',
  );

const crcValidUntilSchema = z
  .string()
  .refine(isValidDateOnly, 'crcCertificateValidUntil deve ser uma data real YYYY-MM-DD');

/** A UF embutida no número do CRC tem de ser a mesma de `crcUf` — divergência é digitação errada. */
function refineCrcUfMatches(
  val: { crcNumber?: string; crcUf?: string },
  ctx: z.RefinementCtx,
): void {
  if (!val.crcNumber || !val.crcUf) return;
  const embedded = crcNumberUf(val.crcNumber);
  if (embedded && embedded !== val.crcUf) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['crcUf'],
      message: `crcUf (${val.crcUf}) diverge da UF do número do CRC (${embedded})`,
    });
  }
}

/** @openapi
 * components:
 *   schemas:
 *     RegisterAccountingContactInput:
 *       type: object
 *       required: [unitId, name, email, cpf, crcNumber, crcUf]
 *       properties:
 *         unitId:    { type: string }
 *         name:      { type: string, description: "Nome do contador/responsável técnico (PII — nunca vai para a trilha de auditoria)" }
 *         email:     { type: string, format: email, description: "Canal de contato; o ENVIO é do dono (F-CD1-a, zero credencial no servidor)" }
 *         cpf:       { type: string, description: "J930 campo 03 IDENT_CPF_CNPJ — 11 dígitos com DV; máscara aceita e removida" }
 *         phone:     { type: string, description: "J930 campo 08 FONE — 10 ou 11 dígitos com DDD; máscara aceita e removida" }
 *         crcNumber: { type: string, description: "J930 campo 06 IND_CRC no formato do CFC UF-NNNNNN/O-D (grafias usuais aceitas e normalizadas); a UF tem de bater com crcUf" }
 *         crcUf:     { type: string, description: "J930 campo 09 UF_CRC — sigla da UF que expediu o CRC (Tabela de UF)" }
 *         crcCertificate: { type: string, description: "J930 campo 10 NUM_SEQ_CRC — Certidão de Regularidade Profissional no formato UF/AAAA/NÚMERO" }
 *         crcCertificateValidUntil: { type: string, description: "J930 campo 11 DT_CRC — data-only YYYY-MM-DD de validade da certidão" }
 */
export const RegisterContactSchema = z
  .object({
    unitId: z.string().min(1),
    name: z.string().trim().min(1).max(ACCOUNTING_CONTACT_NAME_MAX_LENGTH),
    email: z.string().trim().email(),
    cpf: cpfSchema,
    phone: phoneSchema.optional(),
    crcNumber: crcNumberSchema,
    crcUf: z.enum(UF_CODES),
    crcCertificate: crcCertificateSchema.optional(),
    crcCertificateValidUntil: crcValidUntilSchema.optional(),
  })
  .strict()
  .superRefine(refineCrcUfMatches);

/** @openapi
 * components:
 *   schemas:
 *     UpdateAccountingContactInput:
 *       type: object
 *       required: [unitId, contactId]
 *       properties:
 *         unitId:    { type: string }
 *         contactId: { type: string, description: "DEVE ser igual ao :id do path — divergência é 400, nunca um dos dois ignorado" }
 *         name:      { type: string }
 *         email:     { type: string, format: email }
 *         cpf:       { type: string, description: "11 dígitos com DV" }
 *         phone:     { type: string, nullable: true, description: "10-11 dígitos — null LIMPA" }
 *         crcNumber: { type: string, description: "UF-NNNNNN/O-D (CFC)" }
 *         crcUf:     { type: string, description: "Sigla da UF (Tabela de UF)" }
 *         crcCertificate: { type: string, nullable: true, description: "UF/AAAA/NÚMERO — null LIMPA a certidão" }
 *         crcCertificateValidUntil: { type: string, nullable: true, description: "Data-only YYYY-MM-DD — null LIMPA a validade" }
 */
export const UpdateContactSchema = z
  .object({
    unitId: z.string().min(1),
    contactId: z.string().min(1),
    name: z.string().trim().min(1).max(ACCOUNTING_CONTACT_NAME_MAX_LENGTH).optional(),
    email: z.string().trim().email().optional(),
    cpf: cpfSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    crcNumber: crcNumberSchema.optional(),
    crcUf: z.enum(UF_CODES).optional(),
    // Review F10: `null` LIMPA a certidão/validade (certidão vencida não é só sobrescrita);
    // ausente = não mexe. Os dois campos são opcionais no manual (J930 10/11).
    crcCertificate: crcCertificateSchema.nullable().optional(),
    crcCertificateValidUntil: crcValidUntilSchema.nullable().optional(),
  })
  .strict()
  // O cruzamento UF×número roda quando os DOIS vêm no mesmo patch. Um patch que troca só um deles
  // e deixa a linha inconsistente é validado no SERVICE contra a linha existente (updateContact).
  .superRefine(refineCrcUfMatches);

/** @openapi
 * components:
 *   schemas:
 *     AccountingContactScopeQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const AccountingContactScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type RegisterContactInput = z.infer<typeof RegisterContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type AccountingContactScopeQueryInput = z.infer<typeof AccountingContactScopeQuerySchema>;
