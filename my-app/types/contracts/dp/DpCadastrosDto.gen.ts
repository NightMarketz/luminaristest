// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateCargoInput {
unitId: string
nome: string
cbo: string
}
export interface CreateConvencaoParametroInput {
unitId: string
chave: "PISO_SALARIAL_CENTS"
discriminador: string
valorInt: unknown
clausula: string
vigenteDesde: string
vigenteAte?: (string | null)
}
export interface CreateConvencaoInput {
unitId: string
sindicatoId: string
identificacao: string
vigenteDesde: string
vigenteAte?: (string | null)
fonte: string
}
export interface CreateJornadaInput {
unitId: string
nome: string
minutosSemanais: number
tipoJornada: ("2" | "3" | "4" | "5" | "6" | "7" | "9")
descricao?: (string | null)
}
export interface CreateLotacaoInput {
unitId: string
codigo: string
descricao: string
}
export interface CreateSindicatoInput {
unitId: string
cnpj: string
nome: string
}
export interface DpListQueryInput {
unitId: string
limit?: number
}
export interface DpParametroIdParamInput {
id: string
parametroId: string
}
export interface UpdateCargoInput {
unitId: string
nome?: string
cbo?: string
}
export interface UpdateConvencaoParametroInput {
unitId: string
valorInt?: unknown
clausula?: string
vigenteDesde?: string
vigenteAte?: (string | null)
}
export interface UpdateConvencaoInput {
unitId: string
identificacao?: string
vigenteDesde?: string
vigenteAte?: (string | null)
fonte?: string
}
export interface UpdateJornadaInput {
unitId: string
nome?: string
minutosSemanais?: number
tipoJornada?: ("2" | "3" | "4" | "5" | "6" | "7" | "9")
descricao?: (string | null)
}
export interface UpdateLotacaoInput {
unitId: string
codigo?: string
descricao?: string
}
export interface UpdateSindicatoInput {
unitId: string
cnpj?: string
nome?: string
}
