// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDynamicTableDtoInput {
name: string
category: ("commercial" | "products" | "services" | "inventory" | "finance" | "people" | "leads" | "planning" | "kanban" | "operations" | "marketing" | "business" | "administrative" | "other")
internalName?: string
schema: {
defaultDisplayField?: string
/**
 * @minItems 1
 */
fields: [{
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime" | "relation" | "select" | "textarea" | "json")
required: boolean
unique?: boolean
defaultValue?: unknown
validation?: {
minLength?: number
maxLength?: number
minValue?: number
maxValue?: number
}
relation?: {
targetTable: string
allowMultiple?: boolean
}
options?: string[]
format?: ("email" | "phone" | "cpf" | "cnpj" | "url" | "custom")
numberFormat?: ("currency" | "percentage" | "integer" | "decimal")
description?: string
regex?: string
hidden?: boolean
readOnly?: boolean
searchable?: boolean
requiredIf?: {
field: string
op: ("eq" | "neq" | "in")
value: (string | number | boolean | (string | number | boolean)[])
}
}, ...({
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime" | "relation" | "select" | "textarea" | "json")
required: boolean
unique?: boolean
defaultValue?: unknown
validation?: {
minLength?: number
maxLength?: number
minValue?: number
maxValue?: number
}
relation?: {
targetTable: string
allowMultiple?: boolean
}
options?: string[]
format?: ("email" | "phone" | "cpf" | "cnpj" | "url" | "custom")
numberFormat?: ("currency" | "percentage" | "integer" | "decimal")
description?: string
regex?: string
hidden?: boolean
readOnly?: boolean
searchable?: boolean
requiredIf?: {
field: string
op: ("eq" | "neq" | "in")
value: (string | number | boolean | (string | number | boolean)[])
}
})[]]
deleteConstraints?: {
type: ("RESTRICT" | "CASCADE" | "RESTRICT_IF_AGGREGATE" | "IGNORE")
targetTable: string
aggregate?: {
field: string
operator: ("gt" | "lt" | "eq" | "neq")
value: number
}
cascadeCondition?: ("ALWAYS" | "IF_AGGREGATE_MATCH")
errorMessage?: string
}[]
compositeUnique?: {
/**
 * @minItems 1
 */
fields: [string, ...(string)[]]
errorMessage?: string
}[]
immutableAfter?: {
condition: {
field: string
op: ("eq" | "in")
value: (string | string[])
}
scope: ("all" | string[])
errorMessage?: string
}[]
compare?: {
left: string
op: ("gt" | "gte" | "lt" | "lte" | "eq" | "neq")
right: string
errorMessage?: string
}[]
lifecycle?: {
field: string
transitions: {
[k: string]: string[]
}
errorMessage?: string
}[]
noOverlap?: {
startField: string
endField: string
scopeFields?: string[]
errorMessage?: string
}[]
ui?: {
presentation?: ("standalone" | "embedded" | "system")
}
}
}
export interface UpdateDynamicTableDtoInput {
name?: string
}
export interface UpdateDynamicTableSchemaDtoInput {
schema: {
defaultDisplayField?: string
/**
 * @minItems 1
 */
fields: [{
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime" | "relation" | "select" | "textarea" | "json")
required: boolean
unique?: boolean
defaultValue?: unknown
validation?: {
minLength?: number
maxLength?: number
minValue?: number
maxValue?: number
}
relation?: {
targetTable: string
allowMultiple?: boolean
}
options?: string[]
format?: ("email" | "phone" | "cpf" | "cnpj" | "url" | "custom")
numberFormat?: ("currency" | "percentage" | "integer" | "decimal")
description?: string
regex?: string
hidden?: boolean
readOnly?: boolean
searchable?: boolean
requiredIf?: {
field: string
op: ("eq" | "neq" | "in")
value: (string | number | boolean | (string | number | boolean)[])
}
}, ...({
name: string
label: string
type: ("string" | "number" | "boolean" | "date" | "datetime" | "relation" | "select" | "textarea" | "json")
required: boolean
unique?: boolean
defaultValue?: unknown
validation?: {
minLength?: number
maxLength?: number
minValue?: number
maxValue?: number
}
relation?: {
targetTable: string
allowMultiple?: boolean
}
options?: string[]
format?: ("email" | "phone" | "cpf" | "cnpj" | "url" | "custom")
numberFormat?: ("currency" | "percentage" | "integer" | "decimal")
description?: string
regex?: string
hidden?: boolean
readOnly?: boolean
searchable?: boolean
requiredIf?: {
field: string
op: ("eq" | "neq" | "in")
value: (string | number | boolean | (string | number | boolean)[])
}
})[]]
deleteConstraints?: {
type: ("RESTRICT" | "CASCADE" | "RESTRICT_IF_AGGREGATE" | "IGNORE")
targetTable: string
aggregate?: {
field: string
operator: ("gt" | "lt" | "eq" | "neq")
value: number
}
cascadeCondition?: ("ALWAYS" | "IF_AGGREGATE_MATCH")
errorMessage?: string
}[]
compositeUnique?: {
/**
 * @minItems 1
 */
fields: [string, ...(string)[]]
errorMessage?: string
}[]
immutableAfter?: {
condition: {
field: string
op: ("eq" | "in")
value: (string | string[])
}
scope: ("all" | string[])
errorMessage?: string
}[]
compare?: {
left: string
op: ("gt" | "gte" | "lt" | "lte" | "eq" | "neq")
right: string
errorMessage?: string
}[]
lifecycle?: {
field: string
transitions: {
[k: string]: string[]
}
errorMessage?: string
}[]
noOverlap?: {
startField: string
endField: string
scopeFields?: string[]
errorMessage?: string
}[]
ui?: {
presentation?: ("standalone" | "embedded" | "system")
}
}
}
export interface CreateDynamicTableDataDtoInput {
data: {
[k: string]: unknown
}
}
export interface UpdateDynamicTableDataDtoInput {
data: {
[k: string]: unknown
}
}
