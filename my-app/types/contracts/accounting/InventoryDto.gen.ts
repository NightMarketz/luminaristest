// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ReceiveStockInput {
unitId: string
productRef: string
description?: string
qty: number
totalValueCents: number
occurredAt: string
sourceId?: string
}
export interface ListInventoryQueryInput {
unitId: string
status?: ("ACTIVE" | "ARCHIVED")
page?: number
limit?: number
}
export interface InventoryScopeQueryInput {
unitId: string
}
