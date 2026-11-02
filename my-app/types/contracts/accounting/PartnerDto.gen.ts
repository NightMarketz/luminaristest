// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreatePartnerInput {
unitId: string
nome: string
taxId: string
residenteBrasil: boolean
participacaoBp: number
entradaEm: string
saidaEm?: (string | null)
outrasParticipacoes?: ({
cnpj: string
participacaoBp: number
empresaNoSimples: boolean
administrador: boolean
receitaBrutaAnualCents?: (number | null)
}[] | null)
}
export interface ListPartnersQueryInput {
unitId: string
data?: string
}
export interface PartnerIdParamInput {
id: string
}
export interface PartnerScopeInput {
unitId: string
}
export interface UpdatePartnerInput {
unitId: string
nome: string
taxId: string
residenteBrasil: boolean
participacaoBp: number
entradaEm: string
saidaEm?: (string | null)
outrasParticipacoes?: ({
cnpj: string
participacaoBp: number
empresaNoSimples: boolean
administrador: boolean
receitaBrutaAnualCents?: (number | null)
}[] | null)
}
export interface OutraParticipacaoInput {
cnpj: string
participacaoBp: number
empresaNoSimples: boolean
administrador: boolean
receitaBrutaAnualCents?: (number | null)
}
