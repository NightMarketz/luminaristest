// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ListWithholdingsQueryInput {
unitId: string
direction: "MADE"
competencia: string
}
export interface WithholdingSummaryQueryInput {
unitId: string
competencia: string
}
export interface WithholdingLineViewInput {
id: string
tributo: ("IRRF" | "CSLL" | "COFINS" | "PIS" | "INSS" | "ISS")
event: ("RECOGNITION" | "SETTLEMENT")
dataFatoGerador: string
competencia: string
beneficiario: {
counterpartyId: string
nome: string
taxId: (string | null)
kind: (("CPF" | "CNPJ") | null)
regime: (string | null)
}
natRend: (string | null)
codigoReceita: (string | null)
brutoCents: string
baseCents: string
amountCents: string
dispensa: (string | null)
titulo: {
payableId: string
documentNumber: (string | null)
documentoSerie: (string | null)
issueDate: string
}
inss: ({
tpServico: (string | null)
cprb: (boolean | null)
} | null)
pf: ({
dependentes: number
deducaoDependentesCents: string
previdenciaCents: string
pensaoCents: string
descontoSimplificadoCents: string
reducaoArt3ACents: string
} | null)
taxPayableId: (string | null)
}
export interface WithholdingLineForReinfInput {
id: string
tributo: ("IRRF" | "CSLL" | "COFINS" | "PIS" | "INSS" | "ISS")
event: ("RECOGNITION" | "SETTLEMENT")
dataFatoGerador: string
competencia: string
beneficiario: {
counterpartyId: string
nome: string
taxId: (string | null)
kind: (("CPF" | "CNPJ") | null)
regime: (string | null)
}
natRend: (string | null)
codigoReceita: (string | null)
brutoCents: string
baseCents: string
amountCents: string
dispensa: (string | null)
titulo: {
payableId: string
documentNumber: (string | null)
documentoSerie: (string | null)
issueDate: string
}
inss: ({
tpServico: (string | null)
cprb: (boolean | null)
} | null)
pf: ({
dependentes: number
deducaoDependentesCents: string
previdenciaCents: string
pensaoCents: string
descontoSimplificadoCents: string
reducaoArt3ACents: string
} | null)
taxPayableId: (string | null)
settlementId: (string | null)
originSettlementId: (string | null)
unitId: string
}
export interface WithholdingSummaryInput {
competencia: string
feitas: {
codigoReceita: (string | null)
tributos: string[]
totalCents: string
vencimento: (string | null)
status: ("OPEN" | "PARTIALLY_PAID" | "PAID" | "DEFERRED")
competenciasSomadas: string[]
taxPayableId: (string | null)
linhas: number
}[]
sofridas: {
tributo: string
totalCents: string
linhas: number
}[]
avisos: string[]
}
