// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateLancamentoInput {
unitId: string
competencia: string
rubrica: string
quantidadeMin?: number
valorCents?: unknown
observacao?: string
}
export interface CreateOutraRemuneracaoInput {
unitId: string
competencia: string
remuneracaoCents: unknown
contribuicaoCents: unknown
ordem: ("ANTES" | "DEPOIS")
categoriaOutraFonte: ("EMPREGADO" | "CONTRIBUINTE_INDIVIDUAL")
cnpjOutroEmpregador: string
documento: string
}
export interface DpLancamentoIdParamInput {
id: string
lancamentoId: string
}
export interface DpLancamentoQueryInput {
unitId: string
competencia?: string
}
export interface DpOutraRemuneracaoIdParamInput {
id: string
outraRemuneracaoId: string
}
export interface UpdateLancamentoInput {
unitId: string
competencia?: string
rubrica?: string
quantidadeMin?: (number | null)
valorCents?: unknown
observacao?: (string | null)
}
export interface UpdateOutraRemuneracaoInput {
unitId: string
competencia?: string
remuneracaoCents?: unknown
contribuicaoCents?: unknown
ordem?: ("ANTES" | "DEPOIS")
categoriaOutraFonte?: ("EMPREGADO" | "CONTRIBUINTE_INDIVIDUAL")
cnpjOutroEmpregador?: string
documento?: string
}
