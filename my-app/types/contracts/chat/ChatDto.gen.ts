// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ChatRequestInput {
query?: string
documentIds?: string[]
history?: {
role: ("user" | "assistant" | "system")
content: string
}[]
chatInstanceId?: string
confirmedProposalId?: string
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
userId: string
textContent: string
fileName: string
chunkId: string
index: number
}
}[]
}
