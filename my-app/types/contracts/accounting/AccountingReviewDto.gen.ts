// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface OpenReviewInput {
unitId: string
year: number
ecdJobId?: string
ecfJobId?: string
}
export interface AddFindingInput {
unitId: string
register: ("0000" | "I050" | "I051" | "I200" | "I250" | "J150" | "J930" | "M300" | "M350" | "M410" | "N630")
locator: string
description: string
severity: ("BLOCKER" | "NOTE")
}
export type ResolveFindingInput = ({
unitId: string
resolution: "DATA_EDIT"
targetType: ("account" | "referential_mapping" | "counterparty" | "generation_input" | "journal_entry")
targetId: string
} | {
unitId: string
resolution: "NO_ACTION"
resolutionNote: string
})
export interface AdjustmentEntryInput {
unitId: string
postingDate: string
description: string
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
reverseOriginal?: boolean
}
export interface SignOffReviewInput {
unitId: string
reviewerName: string
reviewerCrc: string
statement: string
}
export interface RejectReviewInput {
unitId: string
reason: string
}
export interface ReplaceReviewJobsInput {
unitId: string
ecdJobId?: string
ecfJobId?: string
}
export interface ListReviewsQueryInput {
unitId: string
year?: number
status?: ("OPEN" | "SIGNED_OFF" | "REJECTED")
}
export interface ReviewScopeQueryInput {
unitId: string
}
