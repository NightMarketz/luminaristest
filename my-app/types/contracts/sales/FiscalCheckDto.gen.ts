// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface FiscalCheckBodyInput {

}
export interface FiscalCheckParamsInput {
id: string
}
export interface FiscalCheckResponseInput {
saleId: string
ok: boolean
criterio: ("PROPORCIONAL_CATALOGO" | "CARGA_TRIBUTARIA")
violations: {
code: ("ITEM_ABAIXO_DO_PISO" | "COMBO_ABAIXO_DO_CUSTO" | "ITEM_ACIMA_DO_CATALOGO" | "PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO" | "DESCONTO_FORA_DO_DOCUMENTO" | "DESCONTO_CONDICIONAL_COMO_INCONDICIONAL" | "RATEIO_NAO_FECHA" | "KIT_SEM_PRINCIPAL" | "SEM_CUSTO" | "ORDEM_DE_CARGA_INDETERMINADA" | "CRITERIO_CARGA_EXIGE_CONTADOR")
itemRef: (string | null)
severity: ("BLOCK" | "WARN")
legalBasis: string
detail: string
}[]
alocacao: {
itemRef: string
discountCents: unknown
pisoCents: unknown
cargaBp: (number | null)
}[]
economiaPotencialCents: unknown
suggestionId: (string | null)
}
export interface FiscalCheckViolationInput {
code: ("ITEM_ABAIXO_DO_PISO" | "COMBO_ABAIXO_DO_CUSTO" | "ITEM_ACIMA_DO_CATALOGO" | "PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO" | "DESCONTO_FORA_DO_DOCUMENTO" | "DESCONTO_CONDICIONAL_COMO_INCONDICIONAL" | "RATEIO_NAO_FECHA" | "KIT_SEM_PRINCIPAL" | "SEM_CUSTO" | "ORDEM_DE_CARGA_INDETERMINADA" | "CRITERIO_CARGA_EXIGE_CONTADOR")
itemRef: (string | null)
severity: ("BLOCK" | "WARN")
legalBasis: string
detail: string
}
