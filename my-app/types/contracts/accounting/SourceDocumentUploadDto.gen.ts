// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateSourceDocumentUploadInput {
unitId: string
sourceType: ("tax.simples.das" | "tax.simples.historico")
externalRef?: string
documentDate?: string
description?: string
}
export type DocumentoRefInput = ({
sourceDocumentId: string
attachmentId: (string | null)
fileName: (string | null)
} | null)
export interface SourceDocumentUploadViewInput {
id: string
sourceType: string
externalRef: (string | null)
documentDate: (string | null)
description: (string | null)
createdAt: string
attachment: {
id: string
fileName: string
mimeType: string
fileSize: number
sha256: string
}
}
