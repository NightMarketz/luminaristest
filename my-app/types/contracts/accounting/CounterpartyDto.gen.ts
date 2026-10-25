// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateCounterpartyInput {
unitId: string
type: ("SUPPLIER" | "CUSTOMER")
name: string
taxId?: string
ref?: string
regimeTributario?: ("SIMPLES" | "MEI" | "PRESUMIDO" | "REAL" | "ARBITRADO" | "PF" | "COOPERATIVA" | "EXTERIOR")
declaracaoOptanteDocumentId?: string
}
export interface SetCounterpartyRegimeInput {
unitId: string
regimeTributario: (("SIMPLES" | "MEI" | "PRESUMIDO" | "REAL" | "ARBITRADO" | "PF" | "COOPERATIVA" | "EXTERIOR") | null)
declaracaoOptanteDocumentId?: (string | null)
}
export interface ArchiveCounterpartyInput {
unitId: string
}
export interface ListCounterpartiesQueryInput {
unitId: string
type?: ("SUPPLIER" | "CUSTOMER")
includeArchived?: (boolean | ("true" | "false"))
}
export interface CounterpartyScopeQueryInput {
unitId: string
}
