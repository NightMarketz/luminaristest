// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface InviteAccountantInput {
unitId: string
accountingContactId: string
accountantEmail: string
}
export interface ListAccountantAssignmentsQueryInput {
unitId: string
}
export interface AcceptAccountantAssignmentInput {
declaresWrittenContract: true
}
export interface EndAccountantAssignmentInput {
reason: string
}
