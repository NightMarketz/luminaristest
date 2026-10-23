// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface JcpPreviewInputInput {
unitId: string
anoCalendario: number
periodo: ("T01" | "T02" | "T03" | "T04" | "A00")
dataCredito: string
forma: ("DESPESA" | "PL")
totalCents: number
debitoPlAccountId?: string
/**
 * @minItems 1
 */
rateio?: [{
partnerId: string
brutoCents: number
}, ...({
partnerId: string
brutoCents: number
})[]]
}
export interface JcpPreviewViewInput {
faixas: {
de: string
ate: string
baseCents: number
taxaDiaria: string
jurosCents: number
}[]
jurosMaxTjlpCents: number
limite50LucroCents: number
limite50ReservasCents: number
limiteDedutivelCents: number
excessoIndedutivelCents: number
alocacoes: {
partnerId: string
participacaoBp: number
brutoCents: number
irrfCents: number
liquidoCents: number
}[]
lalurPrevisto: {
livro: ("lalur" | "lacs")
codigo: string
valorCents: number
}[]
avisos: string[]
}
