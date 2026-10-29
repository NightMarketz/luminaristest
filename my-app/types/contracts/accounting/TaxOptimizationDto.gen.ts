// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface DecideSuggestionInput {
unitId: string
ownerUserId?: string
reason?: string
}
export interface ServiceCostEvidenceCreateInput {
unitId: string
serviceRef: string
custoCents?: unknown
catalogoMinimoCents?: unknown
sourceDocumentId?: (string | null)
vigenteDesde: string
vigenteAte?: (string | null)
}
export interface SuggestionListQueryInput {
unitId: string
ownerUserId?: string
status?: ("PROPOSED" | "ACCEPTED" | "REJECTED" | "EXPIRED")
}
export interface TaxOptimizationIdParamInput {
id: string
}
export interface TaxOptimizationScopeQueryInput {
unitId: string
}
export interface UpdateTaxOptimizationPolicyInput {
unitId: string
criterioAlocacao: ("PROPORCIONAL_CATALOGO" | "CARGA_TRIBUTARIA")
pisoServico: ("CUSTO_INFORMADO" | "CATALOGO_MINIMO" | "SEM_DESCONTO_ALEM_DO_PROPORCIONAL")
vigenteDesde: string
}
export interface TaxOptimizationReportLinhaInput {
tipo: ("SUGESTAO_ACEITA" | "MEDIDA" | "CONSUMIDA")
codigo: string
suggestionId: (string | null)
disponivel: boolean
economiaCents: (string | null)
legalBasis: {
norma: string
artigo: string
}[]
detalhe: string
noDependente: (string | null)
}
export interface TaxOptimizationReportQueryInput {
unitId: string
competencia: string
}
export interface TaxOptimizationReportInput {
competencia: string
unitId: string
linhas: {
tipo: ("SUGESTAO_ACEITA" | "MEDIDA" | "CONSUMIDA")
codigo: string
suggestionId: (string | null)
disponivel: boolean
economiaCents: (string | null)
legalBasis: {
norma: string
artigo: string
}[]
detalhe: string
noDependente: (string | null)
}[]
totais: {
aceitasCents: string
medidaCents: string
totalCents: string
}
contagem: {
PROPOSED: number
REJECTED: number
EXPIRED: number
}
parametrosSha256: string
}
