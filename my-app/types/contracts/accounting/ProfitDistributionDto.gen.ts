// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CancelProfitDistributionInput {
unitId: string
motivo?: string
}
export interface IrrfMensalQueryInput {
unitId: string
competencia: string
}
export interface IrrfMensalViewInput {
competencia: string
codigoReceita: "1841"
totalCents: number
vencimento: string
eventos: string[]
}
export interface MemoriaDistribuicaoInput {
competencia: string
tipoPessoa: ("PF" | "PJ")
eventos: {
id: string
brutoCents: number
irrfCents: number
origemLucro: ("CORRENTE" | "TRANSICAO")
}[]
somaMesCents: number
limiteMensalCents: number
aliquotaBp: number
baseMesCents: number
devidoMesCents: number
jaRetidoCents: number
irrfEventoCents: number
transicaoAprovacaoAte: ({
linhaId: string
valor: string
} | null)
}
export interface ProfitDistributionIdParamInput {
id: string
}
export interface ProfitDistributionInputInput {
unitId: string
partnerId: string
evento: ("CREDITO" | "PAGAMENTO" | "EMPREGO" | "ENTREGA")
dataEvento: string
brutoCents: number
debitoAccountId: string
contraAccountId?: string
origemLucro: ("CORRENTE" | "TRANSICAO")
anoResultado?: number
aprovadoEm?: string
atoSourceDocumentId?: string
}
export interface ProfitDistributionPreviewViewInput {
competencia: string
somaMesCents: number
baseMesCents: number
devidoMesCents: number
jaRetidoCents: number
irrfEventoCents: number
liquidoCents: number
tetoSemRetencaoCents: number
brutoMinimoCents: (number | null)
sugestao: ("NENHUMA" | "MOVER_EXCEDENTE_MES_SEGUINTE" | "AUMENTAR_BRUTO")
avisoSaldoLucro: (string | null)
}
export interface ProfitDistributionScopeInput {
unitId: string
}
