// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ChartDataQueryInput {
key: string
[k: string]: unknown
}
export interface ChartDetailsQueryInput {
dataPointName?: string
page?: number
limit?: number
search?: string
sortBy?: string
sortOrder?: ("asc" | "desc")
}
export interface DrillDownQueryInput {
tableId: string
recordIds?: string
fields?: string
page?: number
limit?: number
}
