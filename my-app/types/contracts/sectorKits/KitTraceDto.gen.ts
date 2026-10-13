// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface KitTraceQueryInput {
unitId: string
sourceType: string
sourceId: string
}
export interface KitTraceViewInput {
eventKey: string
archetypeKey: (string | null)
bindingVersion: (number | null)
journalEntryId: string
}
