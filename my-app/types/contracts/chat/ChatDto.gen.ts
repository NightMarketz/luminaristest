// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ChatRequestInput {
query?: string
documentIds?: string[]
/**
 * @maxItems 50
 */
history?: {
role: ("user" | "assistant")
content: string
}[]
chatInstanceId?: string
confirmedProposalId?: string
ragMode?: ("DESCRITIVO" | "RAPIDO")
}
export interface ChatResponseInput {
answer: string
type?: ("TEXT" | "ACTION_PROPOSAL")
proposal?: {
id: string
action: ("CREATE" | "UPDATE" | "DELETE")
tableName: string
tableLabel: string
data: unknown
}
sourceDocuments?: {
id: string
score: number
payload: {
documentId: string
textContent: string
fileName: string
chunkId: string
index: number
}
technical?: {
chunkId: string
documentId: string
fileName: string
chunkIndex: number
score: number
embeddingStamp: string
}
}[]
citations?: {
marker: number
chunkId: string
}[]
answerModel?: string
}
export interface RagCitationInput {
marker: number
chunkId: string
}
export interface RagDetailInput {
mode: ("DESCRITIVO" | "RAPIDO")
citations: {
marker: number
chunkId: string
}[]
sources: {
chunkId: string
documentId: string
fileName: string
chunkIndex: number
score: number
embeddingStamp: string
}[]
answerModel?: string
}
export type RagModeInput = ("DESCRITIVO" | "RAPIDO")
export interface RagTechnicalInput {
chunkId: string
documentId: string
fileName: string
chunkIndex: number
score: number
embeddingStamp: string
}
