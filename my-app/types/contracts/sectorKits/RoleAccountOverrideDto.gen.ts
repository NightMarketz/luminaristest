// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type RoleOverrideRoleParamInput = string
export interface SetRoleOverrideRequestInput {
unitId: string
accountId: string
motivo: string
}
export interface RoleOverrideScopeQueryInput {
unitId: string
}
export interface RoleAccountOverrideViewInput {
id: string
role: string
accountId: string
accountCode: string
kitAccountCode: (string | null)
motivo: string
setById: string
createdAt: string
updatedAt: string
}
export interface RoleOverrideBindingRefInput {
status: ("Draft" | "Active" | "Superseded")
bindingVersion: number
}
export interface SetRoleOverrideResultInput {
override: {
id: string
role: string
accountId: string
accountCode: string
kitAccountCode: (string | null)
motivo: string
setById: string
createdAt: string
updatedAt: string
}
binding: {
status: ("Draft" | "Active" | "Superseded")
bindingVersion: number
}
}
export interface RemoveRoleOverrideResultInput {
binding: {
status: ("Draft" | "Active" | "Superseded")
bindingVersion: number
}
}
