// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface IbsCbsCreditLineInput {
tributo: ("IBS" | "CBS")
accountId: (string | null)
amountCents: number
status: "PENDENTE"
sourceDocumentId: null
usoConsumoCents?: number
}
export interface WithholdingOverrideInput {
tributo: ("IRRF" | "CSLL" | "COFINS" | "PIS" | "INSS" | "ISS")
amountCents: number
motivo: string
}
export interface PfDeducoesInput {
dependentes: number
previdenciaCents?: number
pensaoCents?: number
}
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
treatment?: ("CAPITALIZE" | "EXPENSE")
classId?: string
expenseAccountId?: string
setDeclared?: boolean
usefulLifeUpToOneYear?: boolean
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
 * @maxItems 4
 */
recoverableTaxLines?: ({
accountId: string
amountCents: number
kind: ("ICMS" | "PIS_COFINS")
baseCents?: number
pisCents?: number
cofinsCents?: number
} | {
tributo: ("IBS" | "CBS")
accountId: (string | null)
amountCents: number
status: "PENDENTE"
sourceDocumentId: null
usoConsumoCents?: number
})[]
attachmentId?: string
/**
 * @maxItems 6
 */
withholdings?: {
tributo: ("IRRF" | "CSLL" | "COFINS" | "PIS" | "INSS" | "ISS")
amountCents: number
motivo: string
}[]
pfDeducoes?: {
dependentes: number
previdenciaCents?: number
pensaoCents?: number
}
documentoSerie?: string
}
export interface RegisterPaymentInput {
unitId: string
method: ("Cash" | "Pix" | "TED" | "Boleto")
paidAt: string
amountCents: number
}
export interface ApropriarCreditoInput {
unitId: string
payableId: string
tributo: ("IBS" | "CBS")
sourceDocumentId: string
expectedStatus: "PENDENTE"
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
status?: ("OPEN" | "PARTIALLY_PAID" | "PAYING" | "PAID" | "CANCELLED" | "DEFERRED")
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
