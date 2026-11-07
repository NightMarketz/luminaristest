// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDocumentInput {
fileName: string
fileType: ("PDF" | "DOCX" | "XLSX")
fileSize: number
documentPurpose?: ("DATA_ANALYSIS" | "KNOWLEDGE_BASE")
}
export interface GeneratedContextInput {
version: 1
documentType: (string | null)
/**
 * @maxItems 50
 */
entities: {
type: ("PESSOA" | "EMPRESA" | "DATA" | "VALOR" | "IDENTIFICADOR" | "OUTRO")
value: string
}[]
userEditedFields?: ("summary" | "documentType" | "entities")[]
}
export interface ListDocumentsQueryInput {
page?: number
limit?: number
}
export interface SearchDocumentsInput {
query: string
/**
 * @maxItems 50
 */
documentIds?: string[]
limit?: number
}
export interface SearchDocumentsToolArgsInput {
query: string
limit?: number
}
export interface UpdateDocumentContextInput {
fileName?: string
documentPurpose?: ("DATA_ANALYSIS" | "KNOWLEDGE_BASE")
summary?: (string | null)
documentType?: (string | null)
/**
 * @maxItems 50
 */
entities?: {
type: ("PESSOA" | "EMPRESA" | "DATA" | "VALOR" | "IDENTIFICADOR" | "OUTRO")
value: string
}[]
}
