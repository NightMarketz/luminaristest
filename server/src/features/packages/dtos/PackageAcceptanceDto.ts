import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates';
import { PACKAGE_VALIDITY_NOTICE_VERSION } from '../models/validityNotice';

/**
 * PackageAcceptanceDto — aceite da validade do pacote (FE-INCR-PACOTE-VALIDADE, BRIEF §4.2). Input novo: nasce `.strict()`.
 * O servidor NÃO confia no FE para nada além da versão e do hash do texto mostrado (itens 3–5).
 */

/** @openapi
 * components:
 *   schemas:
 *     ValidityNoticeQuery:
 *       type: object
 *       required: [unitId, packageId, saleDate]
 *       properties:
 *         unitId:    { type: string }
 *         packageId: { type: string }
 *         saleDate:  { type: string, format: date, description: "YYYY-MM-DD real (data da venda)" }
 *     CreatePackageAcceptance:
 *       type: object
 *       required: [unitId, saleId, textVersion, textSha256]
 *       properties:
 *         unitId:      { type: string }
 *         saleId:      { type: string }
 *         textVersion: { type: string, enum: [v1] }
 *         textSha256:  { type: string, description: "sha256 hex do texto que o operador viu (vem do notice)" }
 *     GetPackageAcceptanceQuery:
 *       type: object
 *       required: [unitId, saleId]
 *       properties:
 *         unitId: { type: string }
 *         saleId: { type: string }
 */
export const ValidityNoticeQuerySchema = z
  .object({
    unitId: z.string().min(1),
    packageId: z.string().min(1),
    // Calendário real (memória date-only-regex-nao-valida-calendario): `2026-02-30` não passa.
    saleDate: z.string().refine(isValidDateOnly, 'saleDate deve ser uma data real YYYY-MM-DD'),
  })
  .strict();

export const CreatePackageAcceptanceSchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
    textVersion: z.literal(PACKAGE_VALIDITY_NOTICE_VERSION),
    textSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export const GetPackageAcceptanceQuerySchema = z
  .object({
    unitId: z.string().min(1),
    saleId: z.string().min(1),
  })
  .strict();

/** Rota do PDF: o `saleId` vem do path, `unitId` da query. */
export const PackageSaleReceiptQuerySchema = z
  .object({
    unitId: z.string().min(1),
  })
  .strict();

export type ValidityNoticeQueryInput = z.infer<typeof ValidityNoticeQuerySchema>;
export type CreatePackageAcceptanceInput = z.infer<typeof CreatePackageAcceptanceSchema>;

/** GET /package-acceptances/notice — tudo `null` quando o pacote não tem validade (item 3). */
export interface ValidityNoticeResponse {
  validityDays: number | null;
  saleDate: string; // 'YYYY-MM-DD'
  expiresOn: string | null; // 'YYYY-MM-DD'
  textVersion: string;
  text: string | null;
  textSha256: string | null;
}

export interface PackageAcceptanceResponse {
  id: string;
  saleId: string;
  customerId: string;
  packageId: string;
  saleDate: string; // date-only
  validityDays: number;
  expiresOn: string; // date-only
  textVersion: string;
  textShown: string;
  textSha256: string;
  acceptedByUserId: string;
  acceptedAt: string; // ISO
}
