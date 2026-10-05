// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreatePayableInput {
unitId: string
supplierName: string
supplierRef?: string
counterpartyId?: string
documentNumber?: string
description: string
issueDate: string
dueDate: string
amountCents: number
expenseAccountId?: string
inventoryProductRef?: string
inventoryQty?: number
inventoryMultiItem?: boolean
inventoryItems?: {
productRef: string
qty: number
valueCents: number
description?: string
}[]
fixedAssetItems?: {
classId: string
cProd: string
costCents: number
ncm?: string
qty?: number
nItem?: number
}[]
insumoItems?: {
accountId: string
productRef: string
cProd: string
nItem: number
costCents: number
description?: string
}[]
/**
 * @maxItems 2
 */
recoverableTaxLines?: {
accountId: string
amountCents: number
kind: ("ICMS" | "PIS_COFINS")
baseCents?: number
pisCents?: number
cofinsCents?: number
}[]
attachmentId?: string
}
export interface RegisterPaymentInput {
unitId: string
method: ("Cash" | "Pix" | "TED" | "Boleto")
paidAt: string
amountCents: number
}
export interface CancelPayableInput {
unitId: string
reversalDate: string
reason?: string
}
export interface CancelPaymentInput {
unitId: string
reversalDate: string
reason?: string
}
export interface ListPayablesQueryInput {
unitId: string
status?: ("OPEN" | "PARTIALLY_PAID" | "PAYING" | "PAID" | "CANCELLED")
counterpartyId?: string
dueFrom?: string
dueTo?: string
q?: string
overdue?: (boolean | ("true" | "false"))
page?: number
limit?: number
}
export interface PayableScopeQueryInput {
unitId: string
}
