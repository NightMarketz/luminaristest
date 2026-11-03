// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ReinfBatchRequestInput {
unitId: string
competencia: string
}
export interface ReinfBatchListQueryInput {
unitId: string
competencia: string
}
export interface ReinfBatchGetQueryInput {
unitId: string
}
export interface ReinfBatchEventoInput {
tipo: string
idEvento: string
sha256: string
origemIds: string[]
beneficiarioRef?: string
conteudoSha256?: string
prazo?: string
}
export interface ReinfBatchViewInput {
id: string
competencia: string
tpAmb: number
sha256: string
status: ("GERADO" | "TRANSMITIDO" | "ACEITO" | "REJEITADO")
eventos: {
tipo: string
idEvento: string
sha256: string
origemIds: string[]
beneficiarioRef?: string
conteudoSha256?: string
prazo?: string
}[]
defasado: boolean
prazo: string
geradoPorId: string
createdAt: string
}
export interface ReinfRelatorioLinhaInput {
evento: ("R-4020" | "R-4010" | "R-2010")
beneficiario: string
natRend: (string | null)
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
prazoReinf: string
}
export interface ReinfMarcacaoInput {
batchId: string
idEvento: string
tipo: string
acao: ("RETIFICAR" | "REABRIR_ANTES")
}
export interface ReinfRelatorioInput {
competencia: string
prazo: string
linhas: {
evento: ("R-4020" | "R-4010" | "R-2010")
beneficiario: string
natRend: (string | null)
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
prazoReinf: string
}[]
totaisPorCodigo: {
codigoReceita: (string | null)
totalCents: string
}[]
marcacoes: {
batchId: string
idEvento: string
tipo: string
acao: ("RETIFICAR" | "REABRIR_ANTES")
}[]
avisos: {
codigo: ("PF_SERVICO_FORA_DA_REINF" | "DIVIDENDO_PJ_FORA_DA_REINF" | "NATUREZA_NAO_CONFERIDA" | "DEFASADO_RETIFICAR" | "REABRIR_ANTES")
quantidade: number
detalhe: string
}[]
csv: string
}
export interface ReinfBatchCreatedInput {
batchId: string
sha256: string
xml: string
relatorio: {
competencia: string
prazo: string
linhas: {
evento: ("R-4020" | "R-4010" | "R-2010")
beneficiario: string
natRend: (string | null)
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
prazoReinf: string
}[]
totaisPorCodigo: {
codigoReceita: (string | null)
totalCents: string
}[]
marcacoes: {
batchId: string
idEvento: string
tipo: string
acao: ("RETIFICAR" | "REABRIR_ANTES")
}[]
avisos: {
codigo: ("PF_SERVICO_FORA_DA_REINF" | "DIVIDENDO_PJ_FORA_DA_REINF" | "NATUREZA_NAO_CONFERIDA" | "DEFASADO_RETIFICAR" | "REABRIR_ANTES")
quantidade: number
detalhe: string
}[]
csv: string
}
exportJobIds: {
xml: string
relatorio: string
}
}
export interface ReinfAvisoInput {
codigo: ("PF_SERVICO_FORA_DA_REINF" | "DIVIDENDO_PJ_FORA_DA_REINF" | "NATUREZA_NAO_CONFERIDA" | "DEFASADO_RETIFICAR" | "REABRIR_ANTES")
quantidade: number
detalhe: string
}
