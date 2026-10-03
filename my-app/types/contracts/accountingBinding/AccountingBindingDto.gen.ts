// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type ArchetypeKeyInput = ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command" | "performance_liability_release")
export type FieldSlotTransformInput = ("cents_from_reais" | "identity")
export interface FieldSlotInput {
slotName: string
sourceField: string
transform?: ("cents_from_reais" | "identity")
}
export interface RoleSlotInput {
role: string
accountCode: string
}
export interface EventBindingInput {
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command" | "performance_liability_release")
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
}
export interface AccountingBindingV1Input {
sectorKey: string
bindingVersion: number
compiledAt: string
compiledFromHash: string
/**
 * @minItems 1
 */
eventBindings: [{
eventKey: string
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command" | "performance_liability_release")
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
archetypeKey: ("revenue_recognition" | "settlement" | "reversal" | "performance_liability" | "cogs" | "subledger_command" | "performance_liability_release")
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
