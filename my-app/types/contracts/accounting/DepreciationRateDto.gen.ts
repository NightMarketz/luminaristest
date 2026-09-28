// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ListDepreciationRatesQueryInput {
unitId: string
includeHidden?: (boolean | ("true" | "false"))
}
export interface UpsertDepreciationRateInput {
unitId: string
ncm?: string
description: string
lifeYears: number
annualRateBp: number
justification: string
}
export interface HideDepreciationRateInput {
unitId: string
}
