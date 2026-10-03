// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ListChatInstancesQueryInput {
page?: number
limit?: number
type?: ("DOCUMENT" | "GENERIC")
}
export interface GetOrCreateChatInstanceInput {
widgetInstanceId: string
type: ("DOCUMENT" | "GENERIC")
}
export interface ChatInstanceInput {
id: string
title: (string | null)
type?: ("DOCUMENT" | "GENERIC")
widgetInstanceId: string
userId: string
createdAt: unknown
updatedAt: unknown
}
export interface CreateChatInstanceInput {
title: (string | null)
type?: ("DOCUMENT" | "GENERIC")
widgetInstanceId: string
}
export interface UpdateChatInstanceInput {
title?: (string | null)
type?: ("DOCUMENT" | "GENERIC")
widgetInstanceId?: string
}
export interface ChatInstanceSummaryInput {
id: string
title: (string | null)
type?: ("DOCUMENT" | "GENERIC")
widgetInstanceId: string
createdAt: unknown
updatedAt: unknown
}
