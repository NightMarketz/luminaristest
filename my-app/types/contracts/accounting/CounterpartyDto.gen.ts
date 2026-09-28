// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateCounterpartyInput {
unitId: string
type: ("SUPPLIER" | "CUSTOMER")
name: string
taxId?: string
ref?: string
}
export interface ArchiveCounterpartyInput {
unitId: string
}
export interface ListCounterpartiesQueryInput {
unitId: string
type?: ("SUPPLIER" | "CUSTOMER")
includeArchived?: (boolean | ("true" | "false"))
}
export interface CounterpartyScopeQueryInput {
unitId: string
}
