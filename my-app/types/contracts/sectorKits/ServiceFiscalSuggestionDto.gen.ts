// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface SuggestionInput {
key: string
cTribNac: string
cNBS?: string
label: string
origem: ("dicionario" | "ia")
termo?: string
}
export interface ServiceFiscalSuggestionsQueryInput {
unitId: string
ia?: ("0" | "1")
}
export interface ServiceFiscalSuggestionPreviewInput {
unitId: string
nome: string
}
export interface PendingServiceSuggestionInput {
serviceRef: string
nome: string
sugestoes: {
key: string
cTribNac: string
cNBS?: string
label: string
origem: ("dicionario" | "ia")
termo?: string
}[]
}
