// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateReceivableInput {
unitId: string
customerName: string
customerRef?: string
counterpartyId?: string
documentNumber?: string
description: string
issueDate: string
dueDate: string
amountCents: number
revenueAccountId: string
attachmentId?: string
}
export interface RegisterReceiptInput {
unitId: string
method: ("Cash" | "Pix" | "TED" | "Boleto")
receivedAt: string
amountCents: number
}
export interface CancelReceivableInput {
unitId: string
reversalDate: string
reason?: string
}
export interface CancelReceiptInput {
unitId: string
reversalDate: string
reason?: string
}
export interface ListReceivablesQueryInput {
unitId: string
status?: ("OPEN" | "PARTIALLY_RECEIVED" | "RECEIVING" | "RECEIVED" | "CANCELLED")
counterpartyId?: string
dueFrom?: string
dueTo?: string
q?: string
overdue?: (boolean | ("true" | "false"))
page?: number
limit?: number
}
export interface ReceivableScopeQueryInput {
unitId: string
}
