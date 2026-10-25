// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CustomCreationDraftInput {
mode: "custom"
presetKey: string
removedTables: string[]
addedFields: {
[k: string]: unknown[]
}
addedTables: {
key: string
name: string
/**
 * @minItems 1
 */
fields: [unknown, ...(unknown)[]]
}[]
}
