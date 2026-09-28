// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AttachSourceDocumentInput {
unitId: string
externalRef?: string
documentDate?: string
description?: string
attachmentId?: string
rawJson?: string
sourceType?: string
}
export interface ListSourceDocumentsQueryInput {
unitId: string
}
