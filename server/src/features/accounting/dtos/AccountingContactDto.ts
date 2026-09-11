import { z } from 'zod';
import {
  ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH,
  ACCOUNTING_CONTACT_NAME_MAX_LENGTH,
  isValidCrcCertificate,
  normalizeCrcCertificate,
  normalizeCrcNumber,
  UF_CODES,
} from '../models/AccountingContact.model';
import { isValidDateOnly } from '../models/dates';

/**
 * AccountingContactDto — cadastro do contador destinatário (BE-INCR-CONTADOR-DELIVERY, itens 1-3).
 * Schemas de CORPO são `.strict()` (campo com typo é 400, não descarte silencioso); os de QUERY
 * não são, seguindo o levantamento do `queryPrimitives`.
 *
 * **Máscara onde o manual manda, e só aí** (decisão do dono 2026-09-10, resposta 3 — "nada
 * aproximado, tudo com máscara"; fonte: Manual do Leiaute 9 da ECD, J930 campos 06/09/10/11):
 * `crcUf` é enum da Tabela de UF, `crcCertificate` segue UF/AAAA/NÚMERO, `crcCertificateValidUntil`
 * é date-only real. `crcNumber` fica sem máscara **porque o manual não declara nenhuma** — impor
 * uma inventada rejeitaria inscrição legítima em silêncio, que é o erro oposto ao que o pedido
 * quer evitar.
 *
 * `name`/`email` são PII de terceiro — entram na LINHA, nunca no payload de auditoria (D5).
 */

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

/** @openapi
 * components:
 *   schemas:
 *     RegisterAccountingContactInput:
 *       type: object
 *       required: [unitId, name, email, crcNumber, crcUf]
 *       properties:
 *         unitId:    { type: string }
 *         name:      { type: string, description: "Nome do contador/responsável técnico (PII — nunca vai para a trilha de auditoria)" }
 *         email:     { type: string, format: email, description: "Canal de contato; o ENVIO é do dono (F-CD1-a, zero credencial no servidor)" }
 *         crcNumber: { type: string, description: "J930 campo 06 IND_CRC — inscrição no CRC. Normalizado (caixa alta); sem máscara porque o manual não declara formato" }
 *         crcUf:     { type: string, description: "J930 campo 09 UF_CRC — sigla da UF que expediu o CRC (Tabela de UF)" }
 *         crcCertificate: { type: string, description: "J930 campo 10 NUM_SEQ_CRC — Certidão de Regularidade Profissional no formato UF/AAAA/NÚMERO" }
 *         crcCertificateValidUntil: { type: string, description: "J930 campo 11 DT_CRC — data-only YYYY-MM-DD de validade da certidão" }
 */
export const RegisterContactSchema = z
  .object({
    unitId: z.string().min(1),
    name: z.string().trim().min(1).max(ACCOUNTING_CONTACT_NAME_MAX_LENGTH),
    email: z.string().trim().email(),
    crcNumber: z
      .string()
      .trim()
      .min(1)
      .max(ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH)
      .transform((v) => normalizeCrcNumber(v)),
    crcUf: z.enum(UF_CODES),
    crcCertificate: crcCertificateSchema.optional(),
    crcCertificateValidUntil: crcValidUntilSchema.optional(),
  })
  .strict();

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
 *         crcNumber: { type: string }
 *         crcUf:     { type: string, description: "Sigla da UF (Tabela de UF)" }
 *         crcCertificate: { type: string, description: "UF/AAAA/NÚMERO" }
 *         crcCertificateValidUntil: { type: string, description: "Data-only YYYY-MM-DD" }
 */
export const UpdateContactSchema = z
  .object({
    unitId: z.string().min(1),
    contactId: z.string().min(1),
    name: z.string().trim().min(1).max(ACCOUNTING_CONTACT_NAME_MAX_LENGTH).optional(),
    email: z.string().trim().email().optional(),
    crcNumber: z
      .string()
      .trim()
      .min(1)
      .max(ACCOUNTING_CONTACT_CRC_NUMBER_MAX_LENGTH)
      .transform((v) => normalizeCrcNumber(v))
      .optional(),
    crcUf: z.enum(UF_CODES).optional(),
    // Review F10: `null` LIMPA a certidão/validade (certidão vencida não é só sobrescrita);
    // ausente = não mexe. Os dois campos são opcionais no manual (J930 10/11).
    crcCertificate: crcCertificateSchema.nullable().optional(),
    crcCertificateValidUntil: crcValidUntilSchema.nullable().optional(),
  })
  .strict();

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
