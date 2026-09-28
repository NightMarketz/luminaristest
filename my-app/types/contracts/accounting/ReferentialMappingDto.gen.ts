// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface SetReferentialMappingInput {
unitId: string
accountId: string
referentialCode: string
label: string
mappingVersion: string
}
export interface UnsetReferentialMappingInput {
unitId: string
accountId: string
mappingVersion: string
}
export interface ReferentialVersionQueryInput {
unitId: string
version: string
}
export interface BatchSetReferentialMappingInput {
unitId: string
mappingVersion: string
/**
 * @minItems 1
 * @maxItems 1000
 */
items: [{
accountId: string
referentialCode: string
label: string
}, ...({
accountId: string
referentialCode: string
label: string
})[]]
}
export interface CopyReferentialMappingInput {
unitId: string
fromVersion: string
toVersion: string
}
