// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AdvanceOpportunityInput {
opportunityId: string
stageId: string
amount?: number
currency?: ("BRL" | "USD" | "EUR")
winProbability?: number
}
export interface ConvertLeadToOpportunityInput {
leadId: string
name: string
pipelineId: string
stageId?: string
amount?: number
currency?: ("BRL" | "USD" | "EUR")
accountId?: string
}
