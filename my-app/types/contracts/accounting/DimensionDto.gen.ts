// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDimensionDefinitionInput {
unitId: string
code: string
name: string
}
export interface CreateDimensionValueInput {
unitId: string
definitionId: string
code: string
name: string
parentId?: string
}
export interface ArchiveDimensionInput {
unitId: string
}
export interface ListDimensionsQueryInput {
unitId: string
includeArchived?: (boolean | ("true" | "false"))
}
export interface DimensionReportQueryInput {
unitId: string
definitionId: string
from?: string
to?: string
}
