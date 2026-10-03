// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface UpdateUserInput {
name?: string
username?: string
email?: string
password?: string
role?: ("USER" | "ADMIN")
locale?: ("en" | "pt")
currency?: ("BRL" | "USD" | "EUR")
}
export interface CreateUserInput {
name?: string
username: string
email: string
password: string
role?: ("USER" | "ADMIN")
}
export interface ListUsersQueryInput {
page?: number
limit?: number
}
export interface UpdatePreferencesInput {
locale?: ("en" | "pt")
currency?: ("BRL" | "USD" | "EUR")
}
export interface LoginInput {
identifier?: string
username?: string
email?: string
password: string
}
