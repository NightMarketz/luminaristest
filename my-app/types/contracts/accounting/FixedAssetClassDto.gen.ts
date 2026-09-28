// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateFixedAssetClassInput {
unitId: string
code: string
name: string
depreciable: boolean
costAccountId: string
accumulatedDepreciationAccountId?: string
}
export interface UpdateFixedAssetClassInput {
unitId: string
classId: string
code?: string
name?: string
depreciable?: boolean
costAccountId?: string
accumulatedDepreciationAccountId?: (string | null)
}
export interface FixedAssetClassScopeQueryInput {
unitId: string
}
export interface DeleteFixedAssetClassInput {
unitId: string
classId: string
}
