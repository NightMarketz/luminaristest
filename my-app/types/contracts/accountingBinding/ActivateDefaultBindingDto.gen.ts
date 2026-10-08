// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ActivateDefaultBindingRequestInput {
unitId: string
sectorKey?: string
installChartIfEmpty?: boolean
openCurrentPeriodIfMissing?: boolean
}
export interface ActivationBlockingIssueInput {
code: string
message: string
slot?: string
accountCode?: string
period?: string
step?: number
}
export interface ActivateDefaultBindingResultInput {
status: ("Active" | "already-active" | "Draft")
bindingVersion?: number
blocking?: {
code: string
message: string
slot?: string
accountCode?: string
period?: string
step?: number
}[]
kit?: {
kitKey: string
kitVersion: number
status: ("INSTALLING" | "INSTALLED" | "FAILED")
}
}
