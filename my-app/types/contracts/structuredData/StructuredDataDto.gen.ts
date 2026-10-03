// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface HeaderInput {
name: string
type: ("TEXT" | "NUMBER" | "CURRENCY" | "PERCENTAGE" | "DATE")
}
export interface CreateStructuredDataInput {
documentId: string
headers: {
name: string
type: ("TEXT" | "NUMBER" | "CURRENCY" | "PERCENTAGE" | "DATE")
}[]
data: ((string | number | null)[][] | {
name: string
headers: {
key: string
title: string
type: string
}[]
data: (string | number | null)[][]
}[] | {
[k: string]: unknown
})
}
export interface UpdateStructuredDataInput {
data: ((string | number | null)[][] | {
name: string
headers: {
key: string
title: string
type: string
}[]
data: (string | number | null)[][]
}[] | {
[k: string]: unknown
})
}
