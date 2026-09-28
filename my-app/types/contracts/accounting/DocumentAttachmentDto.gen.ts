// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface UploadDocumentAttachmentInput {
unitId: string
targetType?: "JOURNAL_ENTRY"
targetId: string
}
export interface ListDocumentAttachmentsQueryInput {
unitId: string
targetType?: "JOURNAL_ENTRY"
}
export interface DocumentAttachmentScopeQueryInput {
unitId: string
}
