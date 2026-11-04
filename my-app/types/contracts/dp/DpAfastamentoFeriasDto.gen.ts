// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateAfastamentoInput {
unitId: string
motivo: string
inicio: string
fim?: string
observacao?: string
}
export interface CreateFeriasImplantacaoInput {
unitId: string
aquisitivoInicio: string
diasGozados: number
fonte: string
}
export interface DpAfastamentoIdParamInput {
id: string
afastamentoId: string
}
export interface DpFeriasImplantacaoIdParamInput {
id: string
implantacaoId: string
}
export interface DpFeriasQueryInput {
unitId: string
dataRef: string
}
export interface UpdateAfastamentoInput {
unitId: string
motivo?: string
inicio?: string
fim?: (string | null)
observacao?: (string | null)
}
export interface UpdateFeriasImplantacaoInput {
unitId: string
diasGozados?: number
fonte?: string
}
