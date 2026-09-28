// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface PostEntryLineInput {
accountCode: string
debitCents: number
creditCents: number
dimensions?: string[]
}
export interface PostEntryInput {
unitId: string
date: string
description: string
sourceType?: string
sourceId?: string
sourceDocument?: {
externalRef?: string
documentDate?: string
description?: string
attachmentId?: string
rawJson?: string
}
/**
 * @minItems 2
 */
lines: [{
accountCode: string
debitCents: number
creditCents: number
dimensions?: string[]
}, {
accountCode: string
debitCents: number
creditCents: number
dimensions?: string[]
}, ...({
accountCode: string
debitCents: number
creditCents: number
dimensions?: string[]
})[]]
}
export interface ReverseEntryInput {
unitId: string
lancamentoId: string
reversalPostingDate: string
reason?: string
}
export interface ReportQueryInput {
unitId: string
from?: string
to?: string
}
export interface LedgerQueryInput {
unitId: string
from?: string
to?: string
accountCode: string
}
export interface ListAccountsQueryInput {
unitId: string
}
export interface ListEntriesQueryInput {
unitId: string
page?: number
limit?: number
}
export interface CreateAccountInput {
code: string
name: string
nature: ("Asset" | "Liability" | "Equity" | "Revenue" | "Expense")
acceptsEntries?: boolean
unitId: string
}
export interface DeleteAccountQueryInput {
unitId: string
}
export interface SetAccountRequiresDimensionInput {
unitId: string
requiresDimension: boolean
}
export type PeriodStatusEnumInput = ("FUTURE" | "OPEN" | "SOFT_CLOSED" | "HARD_CLOSED")
export interface SeedYearInput {
unitId: string
year: number
}
export interface ClosePeriodInput {
unitId: string
reason?: string
}
export interface ReopenPeriodInput {
unitId: string
periodId: string
reason?: string
}
export interface BalanceSheetQueryInput {
unitId: string
asOf?: string
}
export interface IncomeStatementQueryInput {
unitId: string
asOf?: string
}
