// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateInsumoStockCountInput {
unitId: string
countDate: string
countedValueCents: number
}
export interface InsumoStockCountViewInput {
countDate: string
bookValueCents: number
countedValueCents: number
adjustmentCents: number
entryId: (string | null)
}
