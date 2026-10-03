import { z } from 'zod';
import type { AssignmentStatus } from '../models/ledgerStatus';

/**
 * AccountantAssignmentDto — contador responsável por escopo (BE-INCR-ACCOUNTANT-GOVERNANCE, nó GOV-CONTADOR,
 * BRIEF §4.1). Corpo `.strict()`. `accountantEmail` é PII de terceiro: entra só na busca do usuário, nunca na
 * linha nem no payload de auditoria (D5).
 */

/** @openapi
 * components:
 *   schemas:
 *     InviteAccountantInput:
 *       type: object
 *       required: [unitId, accountingContactId, accountantEmail]
 *       properties:
 *         unitId:              { type: string }
 *         accountingContactId: { type: string, description: "Contato do contador no escopo — fonte do CRC (snapshot)" }
 *         accountantEmail:     { type: string, format: email, description: "E-mail de um usuário já cadastrado (F-GOV-8 a)" }
 */
export const InviteAccountantSchema = z
  .object({
    unitId: z.string().min(1),
    accountingContactId: z.string().min(1),
    accountantEmail: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

export const ListAccountantAssignmentsQuerySchema = z.object({ unitId: z.string().min(1) }).strict();

/** @openapi
 * components:
 *   schemas:
 *     AcceptAccountantAssignmentInput:
 *       type: object
 *       required: [declaresWrittenContract]
 *       properties:
 *         declaresWrittenContract: { type: boolean, enum: [true], description: "Declaração de contrato escrito (F-GOV-8 a reforçada; Res. CFC 1.590 arts. 1º/5º)" }
 */
// F-GOV-8 (a) reforçada + F-GOV-11 (a) — sem responsibleFrom.
export const AcceptAccountantAssignmentSchema = z
  .object({
    declaresWrittenContract: z.literal(true), // F-GOV-8: Res. CFC 1.590 arts. 1º/5º
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     EndAccountantAssignmentInput:
 *       type: object
 *       required: [reason]
 *       properties:
 *         reason: { type: string, minLength: 1, maxLength: 500 }
 */
export const EndAccountantAssignmentSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict();

export type InviteAccountantInput = z.infer<typeof InviteAccountantSchema>;
export type EndAccountantAssignmentInput = z.infer<typeof EndAccountantAssignmentSchema>;

/** Resposta (datas ISO; instantes, não date-only — §4.3). */
export interface AccountantAssignmentView {
  id: string;
  unitId: string;
  status: AssignmentStatus;
  accountingContactId: string;
  accountantUserId: string;
  crcNumber: string; // snapshot normalizado (parseCrcNumber)
  crcUf: string;
  activeFrom: string | null;
  activeUntil: string | null;
  endReason: string | null;
  createdAt: string;
}

export interface MyAccountantAssignmentView extends AccountantAssignmentView {
  ownerEmail: string;
}
