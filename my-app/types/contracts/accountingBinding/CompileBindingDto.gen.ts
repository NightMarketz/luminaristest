// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ChartAccountSnapshotInput {
code: string
nature: string
acceptsEntries: boolean
}
export interface CompileBindingRequestInput {
unitId: string
sectorKey: string
operationalSchema: {
[k: string]: unknown
}
/**
 * @minItems 1
 */
chart: [{
code: string
nature: string
acceptsEntries: boolean
}, ...({
code: string
nature: string
acceptsEntries: boolean
})[]]
/**
 * @minItems 1
 */
eventBindings: [{
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command")
/**
 * @minItems 1
 */
fieldSlots: [{
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
}, ...({
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
})[]]
/**
 * @minItems 1
 */
roleSlots: [{
role: string
accountCode: string
}, ...({
role: string
accountCode: string
})[]]
descriptionTemplate?: string
}, ...({
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command")
/**
 * @minItems 1
 */
fieldSlots: [{
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
}, ...({
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
})[]]
/**
 * @minItems 1
 */
roleSlots: [{
role: string
accountCode: string
}, ...({
role: string
accountCode: string
})[]]
descriptionTemplate?: string
})[]]
}
export interface ValidateBindingRequestInput {
unitId: string
sectorKey: string
operationalSchema: {
[k: string]: unknown
}
/**
 * @minItems 1
 */
chart: [{
code: string
nature: string
acceptsEntries: boolean
}, ...({
code: string
nature: string
acceptsEntries: boolean
})[]]
/**
 * @minItems 1
 */
eventBindings: [{
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command")
/**
 * @minItems 1
 */
fieldSlots: [{
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
}, ...({
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
})[]]
/**
 * @minItems 1
 */
roleSlots: [{
role: string
accountCode: string
}, ...({
role: string
accountCode: string
})[]]
descriptionTemplate?: string
}, ...({
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command")
/**
 * @minItems 1
 */
fieldSlots: [{
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
}, ...({
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
})[]]
/**
 * @minItems 1
 */
roleSlots: [{
role: string
accountCode: string
}, ...({
role: string
accountCode: string
})[]]
descriptionTemplate?: string
})[]]
}
export interface ListBindingsQueryInput {
unitId: string
sectorKey?: string
status?: ("Draft" | "Active" | "Superseded")
}
