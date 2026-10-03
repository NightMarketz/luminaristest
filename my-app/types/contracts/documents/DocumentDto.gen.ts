// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDocumentInput {
fileName: string
fileType: ("PDF" | "DOCX" | "XLSX")
fileSize: number
documentPurpose?: ("DATA_ANALYSIS" | "KNOWLEDGE_BASE")
}
export interface UpdateDocumentInput {
contextJson?: {
processing: {
totalChunks: number
processedChunks: number
failedChunks: number
duration: number
startTime: string
endTime: string
}
statistics: {
wordCount: number
charCount: number
avgWordLength: number
}
errors?: {
code: string
message: string
timestamp: string
}[]
}
status: ("PENDING" | "PROCESSING" | "COMPLETED" | "ERROR" | "FAILED")
summary: (string | null)
processingDate: unknown
processingError: (string | null)
}
export interface ListDocumentsQueryInput {
page?: number
limit?: number
}
export interface SearchDocumentsInput {
query: string
limit?: number
}
