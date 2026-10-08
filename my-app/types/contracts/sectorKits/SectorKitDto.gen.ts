// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CanonicalAccountInput {
code: string
name: string
nature: ("Asset" | "Liability" | "Equity" | "Revenue" | "Expense")
acceptsEntries: boolean
}
export interface SectorKitV1Input {
kitKey: string
kitVersion: number
label: string
/**
 * @minItems 1
 */
changelog: [string, ...(string)[]]
chartExtension: {
code: string
name: string
nature: ("Asset" | "Liability" | "Equity" | "Revenue" | "Expense")
acceptsEntries: boolean
}[]
binding: {
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
operationalSchema: {
[k: string]: unknown
}
roleDefaults?: {
scopeSettings?: {
bankChargeExpenseAccountCode?: string
bankChargeIncomeAccountCode?: string
depreciationExpenseAccountCode?: string
disposalGainAccountCode?: string
disposalLossAccountCode?: string
}
fiscalProfile?: {
icmsRecuperavelAccountCode?: string
pisCofinsRecuperavelAccountCode?: string
insumoExpenseAccountCode?: string
irpjDespesaAccountCode?: string
csllDespesaAccountCode?: string
irpjRecolherAccountCode?: string
csllRecolherAccountCode?: string
pisDespesaAccountCode?: string
cofinsDespesaAccountCode?: string
pisRecolherAccountCode?: string
cofinsRecolherAccountCode?: string
}
}
serviceFiscalDefaults?: {
serviceRef: string
cTribNac: string
cNBS?: string
cIndOp?: string
}[]
referential?: {
regime: ("MEI" | "SIMPLES" | "PRESUMIDO" | "REAL")
mappingVersion: string
entries: {
accountCode: string
referentialCode: string
label: string
}[]
}[]
}
