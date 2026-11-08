// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CorrigirVersaoInput {
unitId: string
lotacaoId?: string
cargoId?: (string | null)
jornadaId?: (string | null)
sindicatoId?: (string | null)
salarioCents?: unknown
unidadeSalario?: ("1" | "2" | "3" | "4" | "5" | "6" | "7")
}
export interface CreateTrabalhadorInput {
unitId: string
cpf: string
nome: string
nascimento: string
pcd?: boolean
employeeRef?: string
partnerId?: string
}
export interface CreateVersaoInput {
unitId: string
vigenteDesde: string
lotacaoId: string
cargoId?: string
jornadaId?: string
sindicatoId?: string
salarioCents: unknown
unidadeSalario: ("1" | "2" | "3" | "4" | "5" | "6" | "7")
}
export interface CreateVinculoInput {
unitId: string
trabalhadorId: string
matricula: string
categoria: string
dataInicio: string
dataTermino?: string
versao: {
lotacaoId: string
cargoId?: string
jornadaId?: string
sindicatoId?: string
salarioCents: unknown
unidadeSalario: ("1" | "2" | "3" | "4" | "5" | "6" | "7")
}
}
export interface DpVersaoIdParamInput {
id: string
versaoId: string
}
export interface UpdateTrabalhadorInput {
unitId: string
cpf?: string
nome?: string
nascimento?: string
pcd?: boolean
employeeRef?: (string | null)
partnerId?: (string | null)
}
export interface VersaoVinculoInput {
lotacaoId: string
cargoId?: string
jornadaId?: string
sindicatoId?: string
salarioCents: unknown
unidadeSalario: ("1" | "2" | "3" | "4" | "5" | "6" | "7")
}
