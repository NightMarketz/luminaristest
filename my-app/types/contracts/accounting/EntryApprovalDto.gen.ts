// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDraftEntryInput {
unitId: string
date: string
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
}
export interface UpdateDraftEntryInput {
unitId: string
expectedVersion: number
date: string
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
}
export interface SubmitEntryInput {
unitId: string
expectedVersion: number
}
export interface ApproveEntryInput {
unitId: string
expectedVersion: number
}
export interface RejectEntryInput {
unitId: string
expectedVersion: number
reason?: string
}
export interface ListPendingApprovalQueryInput {
unitId: string
page?: number
limit?: number
}
