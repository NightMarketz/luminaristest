// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ScanBankSettlementsInput {
unitId: string
statementId: string
}
export interface ConfirmBankSettlementInput {
unitId: string
method: ("Cash" | "Pix" | "TED" | "Boleto" | "ProviderBalance")
}
export interface RejectBankSettlementInput {
unitId: string
reason: string
}
export interface RetryBankSettlementInput {
unitId: string
method: ("Cash" | "Pix" | "TED" | "Boleto" | "ProviderBalance")
}
export interface ListBankSettlementsQueryInput {
unitId: string
statementId?: string
status?: ("PENDING" | "CONFIRMING" | "CONFIRMED" | "REJECTED" | "FAILED" | "STALE")
page?: number
limit?: number
}
