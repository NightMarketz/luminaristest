// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ImportBankStatementInput {
unitId: string
format: "mp_release"
glAccountId: string
statementRef?: string
periodStart: string
periodEnd: string
openingBalanceCents: number
closingBalanceCents: number
}
export interface AutoMatchStatementInput {
unitId: string
statementId: string
}
export interface ManualMatchInput {
unitId: string
statementLineId: string
/**
 * @minItems 1
 * @maxItems 50
 */
postingIds: [string, ...(string)[]]
}
export interface UnmatchInput {
unitId: string
matchId: string
reason?: string
}
export interface SetLineIgnoredInput {
unitId: string
statementLineId: string
ignored: boolean
}
export interface ListStatementsQueryInput {
unitId: string
page?: number
limit?: number
}
export interface ListLinesQueryInput {
unitId: string
status?: ("UNMATCHED" | "MATCHED" | "IGNORED")
}
export interface ReconciliationScopeQueryInput {
unitId: string
}
export interface PendingReportQueryInput {
unitId: string
glAccountId: string
from?: string
to?: string
}
