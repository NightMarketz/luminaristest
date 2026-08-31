import { z } from 'zod';
import { MAX_CENTS } from '../models/money';
import { isValidDateOnly } from '../models/dates';
import { RECEIPT_METHODS } from '../models/Receivable.model';
import { queryBoolean } from './queryPrimitives';

/**
 * ReceivableDto — Contas a Receber (INCR-AR) request schemas. MIRROR of PayableDto. Money is INTEGER
 * CENTS guarded by `MAX_CENTS` (ACC-014); dates are date-only validated by `isValidDateOnly`
 * (regex + round-trip — class-fix `date-only-regex-nao-valida-calendario`). Every schema is
 * `.strict()` so a typo'd field fails loud instead of being silently dropped.
 */

const cents = z
  .number()
  .int()
  .positive()
  .max(MAX_CENTS, { message: `amountCents excede o limite suportado (máx ${MAX_CENTS}).` });

const dateOnly = (field: string) =>
  z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

/** @openapi
 * components:
 *   schemas:
 *     CreateReceivableInput:
 *       type: object
 *       required: [unitId, customerName, description, issueDate, dueDate, amountCents, revenueAccountId]
 *       properties:
 *         unitId:           { type: string }
 *         customerName:     { type: string, description: "Snapshot do nome do cliente (F1)" }
 *         customerRef:      { type: string, description: "Ref escopada a uma linha de cliente em DynamicTable (F1 rota c) — não é FK" }
 *         counterpartyId:   { type: string, description: "FK a uma Counterparty(CUSTOMER) desta unidade (INCR-COUNTERPARTY / A1); re-escopada no service (SEC-A1-1). OPCIONAL no corpo, NOT NULL na linha (SEC-A1-5): omitir faz o service achar-ou-cunhar a contraparte pelo customerName" }
 *         documentNumber:   { type: string, description: "Nº da fatura/duplicata; parte da chave de negócio" }
 *         description:      { type: string }
 *         issueDate:        { type: string, description: "Data-only YYYY-MM-DD — competência do reconhecimento" }
 *         dueDate:          { type: string, description: "Data-only YYYY-MM-DD — vencimento" }
 *         amountCents:      { type: integer, minimum: 1, maximum: 2147483647, description: "Valor em centavos inteiros. Teto de POLÍTICA (não de persistência — a coluna é BigInt desde BE-INCR-MONEY-BIGINT): acima disso a API responde 400. Guarda contra erro de digitação/ordem de grandeza, não limite técnico." }
 *         revenueAccountId: { type: string, description: "Id de uma conta-folha nature=Revenue (contrapartida do reconhecimento)" }
 *         attachmentId:     { type: string, description: "Id de um DocumentAttachment já enviado, anexado ao lançamento de reconhecimento (F4)" }
 */
export const CreateReceivableSchema = z
  .object({
    unitId: z.string().min(1),
    customerName: z.string().min(1),
    customerRef: z.string().min(1).optional(),
    counterpartyId: z.string().min(1).optional(),
    documentNumber: z.string().min(1).optional(),
    description: z.string().min(1),
    issueDate: dateOnly('issueDate'),
    dueDate: dateOnly('dueDate'),
    amountCents: cents,
    revenueAccountId: z.string().min(1),
    attachmentId: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     RegisterReceiptInput:
 *       type: object
 *       required: [unitId, method, receivedAt, amountCents]
 *       properties:
 *         unitId:      { type: string }
 *         method:      { type: string, enum: [Cash, Pix, TED, Boleto] }
 *         receivedAt:  { type: string, description: "Data-only YYYY-MM-DD — data EFETIVA do crédito bancário (D9), não a data do clique" }
 *         amountCents: { type: integer, minimum: 1, maximum: 2147483647, description: "MVP: deve igualar o saldo do receivable (recebimento integral único). Teto de POLÍTICA (não de persistência — BigInt desde BE-INCR-MONEY-BIGINT): acima disso a API responde 400." }
 */
export const RegisterReceiptSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(RECEIPT_METHODS),
    receivedAt: dateOnly('receivedAt'),
    amountCents: cents,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelReceivableInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno do reconhecimento (gate de período na data do estorno, T5)" }
 *         reason:       { type: string }
 */
export const CancelReceivableSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelReceiptInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno do recebimento" }
 *         reason:       { type: string }
 */
export const CancelReceiptSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ListReceivablesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *         status: { type: string, enum: [OPEN, RECEIVING, RECEIVED, CANCELLED] }
 *         counterpartyId: { type: string, description: "Filtra pela FK de contraparte (INCR-COUNTERPARTY)" }
 *         dueFrom: { type: string, description: "Data-only YYYY-MM-DD — início da faixa de vencimento (inclusivo)" }
 *         dueTo:   { type: string, description: "Data-only YYYY-MM-DD — fim da faixa de vencimento (inclusivo)" }
 *         q:      { type: string, description: "Substring em description OU documentNumber" }
 *         overdue: { type: boolean, description: "Vencidos: dueDate < hoje E status em aberto. Vencer hoje NÃO conta" }
 *         page:   { type: integer, minimum: 1 }
 *         limit:  { type: integer, minimum: 1, maximum: 200 }
 */
export const ListReceivablesQuerySchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(['OPEN', 'RECEIVING', 'RECEIVED', 'CANCELLED']).optional(),
  // BE-INCR-SUBLEDGER-FILTERS §2 — espelho literal do AP (F6). F3: só a FK; o customerName
  // snapshot NÃO é casado aqui.
  counterpartyId: z.string().min(1).optional(),
  // F4: faixa INCLUSIVA nos dois extremos; `isValidDateOnly` faz round-trip, não regex.
  dueFrom: z.string().refine(isValidDateOnly, 'dueFrom deve ser uma data real no formato YYYY-MM-DD').optional(),
  dueTo: z.string().refine(isValidDateOnly, 'dueTo deve ser uma data real no formato YYYY-MM-DD').optional(),
  // F2: casa `description` OU `documentNumber`. LIMITE MEDIDO do LIKE do SQLite: dobra caixa em
  // ASCII, NÃO em acentuado; `%` e `_` valem como curinga, não literal (espelho do AP).
  q: z.string().min(1).optional(),
  // F1: espelho do AP. `queryBoolean()`, nunca `z.coerce.boolean()` — `?overdue=false` ligaria o
  // filtro, porque `Boolean('false') === true`. Ausente ⇒ `false`.
  overdue: queryBoolean(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Query DTO for GET /receivables/:id and the reconcile pass — unitId required. */
export const ReceivableScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type CreateReceivableInput = z.infer<typeof CreateReceivableSchema>;
export type RegisterReceiptInput = z.infer<typeof RegisterReceiptSchema>;
export type CancelReceivableInput = z.infer<typeof CancelReceivableSchema>;
export type CancelReceiptInput = z.infer<typeof CancelReceiptSchema>;
export type ListReceivablesQueryInput = z.infer<typeof ListReceivablesQuerySchema>;
export type ReceivableScopeQueryInput = z.infer<typeof ReceivableScopeQuerySchema>;

/** Type guard for CreateReceivableInput. */
export function isCreateReceivableInput(obj: unknown): obj is CreateReceivableInput {
  return CreateReceivableSchema.safeParse(obj).success;
}
