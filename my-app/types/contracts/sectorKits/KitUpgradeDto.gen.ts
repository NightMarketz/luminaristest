// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface KitDiffInput {
additive: {
kind: ("account" | "roleDefault" | "referential")
itemKey: string
value: unknown
}[]
forward: {
kind: ("new_binding" | "changed_binding" | "changed_account")
itemKey: string
eventKey?: string
before: unknown
after: unknown
}[]
conflict: {
reason: ("override" | "account_deleted_by_user" | "account_changed_in_use" | "field_set_by_user" | "referential_year_frozen" | "referential_mapped_differently")
itemKey: string
kitValue: unknown
tenantValue: unknown
}[]
notices: {
itemKey: string
message: string
}[]
}
export interface KitUpgradeReportInput {
additive: {
kind: ("account" | "roleDefault" | "referential")
itemKey: string
value: unknown
}[]
forward: {
kind: ("new_binding" | "changed_binding" | "changed_account")
itemKey: string
eventKey?: string
before: unknown
after: unknown
}[]
conflict: {
reason: ("override" | "account_deleted_by_user" | "account_changed_in_use" | "field_set_by_user" | "referential_year_frozen" | "referential_mapped_differently")
itemKey: string
kitValue: unknown
tenantValue: unknown
}[]
notices: {
itemKey: string
message: string
}[]
results: {
itemKey: string
outcome: ("applied" | "pending" | "skipped" | "failed")
error?: string
}[]
bindingVersionBefore?: number
bindingVersionAfter?: number
}
export interface UpgradeUnitInputInput {
mode: ("DRY_RUN" | "APPLY")
deployId: string
actor: string
}
export interface KitUpgradeRunSummaryInput {
id: string
mode: ("DRY_RUN" | "APPLY")
status: ("PLANNED" | "APPLIED" | "PARTIAL" | "FAILED")
fromVersion: number
toVersion: number
deployId: string
startedAt: string
finishedAt: (string | null)
counts: {
additive: number
forward: number
conflicts: number
}
}
export interface KitInstallationViewInput {
kitKey: string
kitVersion: number
latestVersion: number
status: ("INSTALLING" | "INSTALLED" | "FAILED")
lastRun: ({
id: string
mode: ("DRY_RUN" | "APPLY")
status: ("PLANNED" | "APPLIED" | "PARTIAL" | "FAILED")
fromVersion: number
toVersion: number
deployId: string
startedAt: string
finishedAt: (string | null)
counts: {
additive: number
forward: number
conflicts: number
}
} | null)
openPendingCount: number
changelog: {
kitVersion: number
entries: string[]
}[]
steps: {
lastCompletedStep: number
warnings: ("KIT_REFERENTIAL_SKIPPED_NO_REGIME" | "KIT_REFERENTIAL_SKIPPED_NO_CATALOG")[]
}
}
export interface KitUpgradePendingViewInput {
id: string
kitKey: string
toVersion: number
runId: string
itemKey: string
reason: ("override" | "account_deleted_by_user" | "account_changed_in_use" | "field_set_by_user" | "referential_year_frozen" | "referential_mapped_differently")
kitValue: unknown
tenantValue: unknown
status: ("OPEN" | "ACCEPTED" | "REJECTED")
decidedById: (string | null)
decidedAt: (string | null)
motivo: (string | null)
createdAt: string
}
export interface ListKitPendingQueryInput {
unitId: string
status?: ("OPEN" | "ACCEPTED" | "REJECTED")
}
export interface DecideKitPendingRequestInput {
unitId: string
motivo: string
}
