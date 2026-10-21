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
} | {
kind: "manual"
sessionId: string
tableKey: string
/**
 * @minItems 1
 * @maxItems 50
 */
changes: [({
action: "add"
field: {
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime")
format?: ("email" | "phone")
required: boolean
}
} | {
action: "setHidden"
name: string
hidden: boolean
}), ...(({
action: "add"
field: {
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime")
format?: ("email" | "phone")
required: boolean
}
} | {
action: "setHidden"
name: string
hidden: boolean
}))[]]
acknowledgeSensitive?: true
})
