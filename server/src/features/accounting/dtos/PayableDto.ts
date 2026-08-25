import { z } from 'zod';
import { MAX_CENTS } from '../models/money';
import { isValidDateOnly } from '../models/dates';
import { PAYMENT_METHODS } from '../models/Payable.model';
import { queryBoolean } from './queryPrimitives';

/**
 * PayableDto — Contas a Pagar (INCR-AP) request schemas. Money is INTEGER CENTS guarded by
 * `MAX_CENTS` (the Int32 persistence ceiling shared with the ledger, ACC-014); dates are
 * date-only validated by `isValidDateOnly` (regex + round-trip — `new Date('2026-02-30')`
 * silently rolls to 03-02, class-fix `date-only-regex-nao-valida-calendario`). Every schema is
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
 *     CreatePayableInput:
 *       type: object
 *       required: [unitId, supplierName, description, issueDate, dueDate, amountCents]
 *       properties:
 *         unitId:              { type: string }
 *         supplierName:        { type: string, description: "Snapshot do nome do fornecedor (F1)" }
 *         supplierRef:         { type: string, description: "Ref escopada a uma linha de fornecedor em DynamicTable (F1 rota c) — não é FK" }
 *         counterpartyId:      { type: string, description: "FK a uma Counterparty(SUPPLIER) desta unidade (INCR-COUNTERPARTY / A1); re-escopada no service (SEC-A1-1). OPCIONAL no corpo, NOT NULL na linha (SEC-A1-5): omitir faz o service achar-ou-cunhar a contraparte pelo supplierName" }
 *         documentNumber:      { type: string, description: "Nº da NF/documento; parte da chave de negócio" }
 *         description:         { type: string }
 *         issueDate:           { type: string, description: "Data-only YYYY-MM-DD — competência do reconhecimento" }
 *         dueDate:             { type: string, description: "Data-only YYYY-MM-DD — vencimento" }
 *         amountCents:         { type: integer, minimum: 1 }
 *         expenseAccountId:    { type: string, description: "Id de uma conta-folha nature=Expense (contrapartida do reconhecimento). XOR com inventoryProductRef+inventoryQty (INCR-INVENTORY D3(b))." }
 *         inventoryProductRef: { type: string, description: "Compra de estoque (INCR-INVENTORY D3(b)): ref DynamicTable do produto; débito vai a 1.1.6 Estoques + emite StockMovement INBOUND. Exige inventoryQty; XOR com expenseAccountId." }
 *         inventoryQty:        { type: integer, minimum: 1, description: "Unidades recebidas nesta compra de estoque; pareado com inventoryProductRef. amountCents é o valor TOTAL (evita arredondamento por-unidade)." }
 *         attachmentId:        { type: string, description: "Id de um DocumentAttachment já enviado, anexado ao lançamento de reconhecimento (F4)" }
 */
/** One received SKU of a multi-item NF-e purchase (BE-INCR-NFE A2). `valueCents` is the item's SHARE
 *  of the note's acquisition cost after the header rateio (D3); Σ over items === amountCents (the DTO
 *  re-checks this tie-out below, ACC-014/T4). Guarded by MAX_CENTS like every money field. */
const inventoryItem = z
  .object({
    productRef: z.string().min(1),
    qty: z.number().int().positive(),
    valueCents: cents,
    description: z.string().min(1).optional(),
  })
  .strict();

export const CreatePayableSchema = z
  .object({
    unitId: z.string().min(1),
    supplierName: z.string().min(1),
    supplierRef: z.string().min(1).optional(),
    counterpartyId: z.string().min(1).optional(),
    documentNumber: z.string().min(1).optional(),
    description: z.string().min(1),
    issueDate: dateOnly('issueDate'),
    dueDate: dateOnly('dueDate'),
    amountCents: cents,
    expenseAccountId: z.string().min(1).optional(),
    inventoryProductRef: z.string().min(1).optional(),
    inventoryQty: z.number().int().positive().optional(),
    // BE-INCR-NFE F0-1b (F-NFE7→a): multi-item NF-e purchase. `inventoryMultiItem` is the discriminator
    // that routes the recognition debit to 1.1.6 Estoques WITHOUT a single-SKU pair; `inventoryItems`
    // carries the per-SKU breakdown the create path drives as N StockMovement INBOUND (sourceId=payableId).
    inventoryMultiItem: z.boolean().optional(),
    inventoryItems: z.array(inventoryItem).optional(),
    attachmentId: z.string().min(1).optional(),
  })
  .strict()
  // 3-mode gate (INCR-INVENTORY D3(b) + BE-INCR-NFE F0-1b / param-aceito-e-ignorado-e-bug): a Payable is
  // EXACTLY ONE of — (1) an ordinary EXPENSE (expenseAccountId, debit a 4.x leaf); (2) a SINGLE-SKU
  // inventory purchase (inventoryProductRef AND inventoryQty, debit 1.1.6); (3) a MULTI-ITEM NF-e
  // purchase (inventoryMultiItem=true + inventoryItems[], debit 1.1.6, SKUs live outside the row).
  // Mixing modes is ambiguous; a mode with no debit account is rejected loud. A half-supplied single-SKU
  // pair is rejected too, so inventoryQty can never be silently dropped.
  .superRefine((val, ctx) => {
    const hasExpense = val.expenseAccountId != null;
    const hasProductRef = val.inventoryProductRef != null;
    const hasQty = val.inventoryQty != null;
    const hasInventory = hasProductRef && hasQty;
    const isMultiItem = val.inventoryMultiItem === true;
    const hasItems = val.inventoryItems != null && val.inventoryItems.length > 0;

    // Mode 3 — multi-item NF-e purchase: the flag is set; items required; NO expense / single-SKU fields.
    if (isMultiItem) {
      if (hasExpense || hasProductRef || hasQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Compra multi-item (NF-e) não aceita expenseAccountId nem inventoryProductRef/inventoryQty.',
          path: ['inventoryMultiItem'],
        });
        return;
      }
      if (!hasItems) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Compra multi-item (inventoryMultiItem) exige inventoryItems (ao menos 1).',
          path: ['inventoryItems'],
        });
        return;
      }
      // Tie-out (ACC-014/T4): the per-SKU shares must sum EXACTLY to the note total on the row.
      const itemsSum = val.inventoryItems!.reduce((acc, it) => acc + it.valueCents, 0);
      if (itemsSum !== val.amountCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Σ dos itens (${itemsSum}) deve igualar amountCents (${val.amountCents}).`,
          path: ['inventoryItems'],
        });
      }
      return;
    }

    // inventoryItems only makes sense in multi-item mode.
    if (hasItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'inventoryItems só é válido com inventoryMultiItem=true.',
        path: ['inventoryItems'],
      });
      return;
    }

    if (hasExpense && (hasProductRef || hasQty)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Informe OU expenseAccountId (despesa) OU inventoryProductRef + inventoryQty (compra de estoque), nunca ambos.',
        path: ['expenseAccountId'],
      });
      return;
    }
    if (!hasExpense && !hasInventory) {
      if (hasProductRef !== hasQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Compra de estoque exige inventoryProductRef E inventoryQty juntos.',
          path: [hasProductRef ? 'inventoryQty' : 'inventoryProductRef'],
        });
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Informe expenseAccountId (despesa) ou inventoryProductRef + inventoryQty (compra de estoque).',
          path: ['expenseAccountId'],
        });
      }
    }
  });

/** @openapi
 * components:
 *   schemas:
 *     RegisterPaymentInput:
 *       type: object
 *       required: [unitId, method, paidAt, amountCents]
 *       properties:
 *         unitId:      { type: string }
 *         method:      { type: string, enum: [Cash, Pix, TED, Boleto] }
 *         paidAt:      { type: string, description: "Data-only YYYY-MM-DD — data EFETIVA do débito bancário (D9), não a data do clique" }
 *         amountCents: { type: integer, minimum: 1, description: "MVP: deve igualar o saldo do payable (pagamento integral único)" }
 */
export const RegisterPaymentSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(PAYMENT_METHODS),
    paidAt: dateOnly('paidAt'),
    amountCents: cents,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelPayableInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno do reconhecimento (gate de período na data do estorno, T5)" }
 *         reason:       { type: string }
 */
export const CancelPayableSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelPaymentInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno da liquidação" }
 *         reason:       { type: string }
 */
export const CancelPaymentSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ListPayablesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *         status: { type: string, enum: [OPEN, PAYING, PAID, CANCELLED] }
 *         counterpartyId: { type: string, description: "Filtra pela FK de contraparte (INCR-COUNTERPARTY)" }
 *         dueFrom: { type: string, description: "Data-only YYYY-MM-DD — início da faixa de vencimento (inclusivo)" }
 *         dueTo:   { type: string, description: "Data-only YYYY-MM-DD — fim da faixa de vencimento (inclusivo)" }
 *         q:      { type: string, description: "Substring em description OU documentNumber" }
 *         overdue: { type: boolean, description: "Vencidos: dueDate < hoje E status em aberto. Vencer hoje NÃO conta" }
 *         page:   { type: integer, minimum: 1 }
 *         limit:  { type: integer, minimum: 1, maximum: 200 }
 */
export const ListPayablesQuerySchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(['OPEN', 'PAYING', 'PAID', 'CANCELLED']).optional(),
  // BE-INCR-SUBLEDGER-FILTERS §2. F3: só a FK — o supplierName snapshot NÃO é casado aqui.
  counterpartyId: z.string().min(1).optional(),
  // F4: faixa INCLUSIVA nos dois extremos. `isValidDateOnly` e round-trip, não regex: '2026-02-30'
  // rolaria para 03-02 em silêncio e distorceria a faixa.
  dueFrom: z.string().refine(isValidDateOnly, 'dueFrom deve ser uma data real no formato YYYY-MM-DD').optional(),
  dueTo: z.string().refine(isValidDateOnly, 'dueTo deve ser uma data real no formato YYYY-MM-DD').optional(),
  // F2: casa `description` OU `documentNumber`. LIMITE MEDIDO do LIKE do SQLite (o Prisma não
  // oferece `mode:'insensitive'` neste provider): dobra caixa em ASCII ('ALUGUEL' casa 'Aluguel'),
  // mas NÃO em acentuado ('MARÇO' não casa 'março'). `%` e `_` valem como curinga, não literal.
  q: z.string().min(1).optional(),
  // F1: vencido = `dueDate < hoje` E status em aberto. `queryBoolean()`, NUNCA
  // `z.coerce.boolean()`: em query-string todo valor chega string e `Boolean('false') === true`,
  // então `?overdue=false` ligaria o filtro. Ausente ⇒ `false` (não `undefined`).
  overdue: queryBoolean(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Query DTO for GET /payables/:id and the reconcile pass — unitId required. */
export const PayableScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type CreatePayableInput = z.infer<typeof CreatePayableSchema>;
export type RegisterPaymentInput = z.infer<typeof RegisterPaymentSchema>;
export type CancelPayableInput = z.infer<typeof CancelPayableSchema>;
export type CancelPaymentInput = z.infer<typeof CancelPaymentSchema>;
export type ListPayablesQueryInput = z.infer<typeof ListPayablesQuerySchema>;
export type PayableScopeQueryInput = z.infer<typeof PayableScopeQuerySchema>;

/** Type guard for CreatePayableInput. */
export function isCreatePayableInput(obj: unknown): obj is CreatePayableInput {
  return CreatePayableSchema.safeParse(obj).success;
}
