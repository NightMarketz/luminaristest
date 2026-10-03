// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AdvanceStageInput {
leadId: string
stageId: string
meetingAt?: string
amount?: number
currency?: ("BRL" | "USD" | "EUR")
winProbability?: number
}
export interface CreateProposalInput {
leadId: string
amount: number
currency?: ("BRL" | "USD" | "EUR")
winProbability?: number
estimatedCloseDate?: string
}
export interface RecordNoShowInput {
leadId: string
option: ("reschedule" | "revert")
rescheduleAt?: string
previousStageId?: string
}
export interface ConvertLeadInput {
leadId: string
account: {
name: string
segment?: string
size?: string
website?: string
taxId?: string
city?: string
state?: string
}
contact?: {
name?: string
email?: string
phone?: string
jobTitle?: string
role?: string
}
}
