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
}[]
defasado: boolean
prazo: string
geradoPorId: string
createdAt: string
}
export interface ReinfRelatorioLinhaInput {
evento: "R-4020"
beneficiario: string
natRend: string
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
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
evento: "R-4020"
beneficiario: string
natRend: string
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
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
avisos: string[]
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
evento: "R-4020"
beneficiario: string
natRend: string
dtFG: string
tributo: string
brutoCents: string
baseCents: string
retidoCents: string
codigoReceita: (string | null)
vencimentoDarf: (string | null)
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
avisos: string[]
csv: string
}
}
