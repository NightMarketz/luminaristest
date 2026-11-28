// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ProposeLegalParameterInput {
tabela: string
chave: string
discriminador?: string
valorInt?: number
valorTexto?: string
valorJson?: unknown
fonte: string
fonteUrl?: string
fonteSha256?: string
vigenteDesde: string
vigenteAte?: string
supersedesId?: string
motivo: string
}
export interface ListLegalParametersQueryInput {
tabela?: string
status?: ("DRAFT" | "PUBLISHED" | "REVOKED")
}
export interface ListRecalcJobsQueryInput {
status?: ("PENDING" | "DONE")
legalParameterId?: string
page?: number
pageSize?: number
}
export interface VigenteLegalParameterQueryInput {
tabela: string
chave: string
data: string
discriminador?: string
}
