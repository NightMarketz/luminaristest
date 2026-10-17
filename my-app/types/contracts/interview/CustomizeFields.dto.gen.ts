// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type CustomizeFieldsDtoInput = ({
kind: "message"
sessionId: string
tableKey: string
message: string
} | {
kind: "decision"
sessionId: string
tableKey: string
proposalId: string
decision: ("apply" | "discard")
acknowledgeSensitive?: true
})
