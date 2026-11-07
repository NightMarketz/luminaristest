// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateDependenteInput {
unitId: string
nome: string
cpf?: string
nascimento: string
tipo: string
deduzIrrf: boolean
salarioFamilia: boolean
invalido?: boolean
vigenteDesde: string
vigenteAte?: string
}
export interface DpDependenteIdParamInput {
id: string
dependenteId: string
}
export interface UpdateDependenteInput {
unitId: string
nome?: string
cpf?: (string | null)
nascimento?: string
tipo?: string
deduzIrrf?: boolean
salarioFamilia?: boolean
invalido?: boolean
vigenteDesde?: string
vigenteAte?: (string | null)
}
