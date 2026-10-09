// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ExportRequestInput {
kind: ("EXPORT_TRIAL_BALANCE" | "EXPORT_GENERAL_LEDGER" | "EXPORT_BALANCE_SHEET" | "EXPORT_INCOME_STATEMENT" | "EXPORT_TEMPLATE" | "EXPORT_BANK_RECONCILIATION" | "EXPORT_ENTRY_SAMPLE" | "EXPORT_ISS_BY_COMPETENCE")
format: ("csv" | "xlsx")
unitId: string
asOf?: string
accountCode?: string
periodStart?: string
periodEnd?: string
templateKind?: ("IMPORT_CHART_OF_ACCOUNTS" | "IMPORT_OPENING_BALANCES" | "IMPORT_JOURNAL_ENTRIES")
perAccount?: number
seed?: string
}
export interface JobScopeQueryInput {
unitId: string
}
export interface JobGovernanceQueryInput {
unitId: string
ownerUserId?: string
}
export interface JobRowsQueryInput {
unitId: string
status?: ("VALID" | "INVALID" | "COMMITTED" | "SKIPPED")
}
export interface ImportUploadInput {
kind: ("IMPORT_CHART_OF_ACCOUNTS" | "IMPORT_OPENING_BALANCES" | "IMPORT_JOURNAL_ENTRIES")
unitId: string
}
export interface CommitImportInput {
unitId: string
}
export type TemplateKindInput = ("IMPORT_CHART_OF_ACCOUNTS" | "IMPORT_OPENING_BALANCES" | "IMPORT_JOURNAL_ENTRIES")
export interface ListDataExchangeJobsQueryInput {
unitId: string
direction?: ("IMPORT" | "EXPORT")
kind?: string
status?: string
year?: number
page?: number
limit?: number
}
export interface WaiveEcfRectificationInput {
unitId: string
justification: string
}
