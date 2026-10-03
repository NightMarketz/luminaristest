// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface UnitInputInput {
name: string
cnpj?: string
type?: ("Own" | "Franchise" | "Department")
}
export interface QuickCreationInput {
mode?: "quick"
suiteKey: string
unit: {
name: string
cnpj?: string
type?: ("Own" | "Franchise" | "Department")
}
modules?: (("CRM-0" | "CRM-1" | "CRM-2A" | "CRM-2B" | "CRM-3") | "CRM-2")[]
selectOverrides?: {
[k: string]: {
/**
 * @minItems 1
 */
[k: string]: [string, ...(string)[]]
}
}
}
export interface CustomCreationInput {
mode: "custom"
presetKey: string
removedTables?: string[]
addedFields?: {
[k: string]: unknown[]
}
unit: {
name: string
cnpj?: string
type?: ("Own" | "Franchise" | "Department")
}
modules?: (("CRM-0" | "CRM-1" | "CRM-2A" | "CRM-2B" | "CRM-3") | "CRM-2")[]
selectOverrides?: {
[k: string]: {
/**
 * @minItems 1
 */
[k: string]: [string, ...(string)[]]
}
}
}
export type UnifiedCreationInput = ({
mode?: "quick"
suiteKey: string
unit: {
name: string
cnpj?: string
type?: ("Own" | "Franchise" | "Department")
}
modules?: (("CRM-0" | "CRM-1" | "CRM-2A" | "CRM-2B" | "CRM-3") | "CRM-2")[]
selectOverrides?: {
[k: string]: {
/**
 * @minItems 1
 */
[k: string]: [string, ...(string)[]]
}
}
} | {
mode: "custom"
presetKey: string
removedTables?: string[]
addedFields?: {
[k: string]: unknown[]
}
unit: {
name: string
cnpj?: string
type?: ("Own" | "Franchise" | "Department")
}
modules?: (("CRM-0" | "CRM-1" | "CRM-2A" | "CRM-2B" | "CRM-3") | "CRM-2")[]
selectOverrides?: {
[k: string]: {
/**
 * @minItems 1
 */
[k: string]: [string, ...(string)[]]
}
}
})
