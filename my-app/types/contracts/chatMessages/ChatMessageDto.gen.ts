// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ListChatMessagesQueryInput {
instanceId: string
page?: number
pageSize?: number
}
export interface ChatMessageInput {
id: string
content: string
role: ("user" | "assistant" | "system")
chatInstanceId: string
createdAt: unknown
updatedAt: unknown
}
export interface CreateChatMessageInput {
content: string
chatInstanceId: string
documentIds?: string[]
}
export interface UpdateChatMessageInput {
content?: string
chatInstanceId?: string
documentIds?: string[]
}
export interface ChatMessageSummaryInput {
id: string
content: string
role: ("user" | "assistant" | "system")
createdAt: unknown
}
