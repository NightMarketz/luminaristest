// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface EmitFiscalDocumentInput {
unitId: string
saleId: string
kind: ("NFSE" | "NFE" | "NFCE")
}
export interface PreviewFiscalDocumentInput {
unitId: string
saleId: string
kind: ("NFSE" | "NFE" | "NFCE")
}
export interface FiscalDocumentListQueryInput {
unitId: string
saleId?: string
status?: ("SENT" | "PROCESSING" | "AUTHORIZED" | "AUTHORIZED_DIVERGENT" | "REJECTED" | "CANCELLED")
pendencias?: (boolean | ("true" | "false"))
}
export interface FiscalDocumentScopeQueryInput {
unitId: string
}
export interface FiscalDocumentParamsInput {
id: string
}
export type CancelFiscalDocumentInput = ({
unitId: string
cMotivo: (1 | 2 | 9)
xMotivo: string
} | {
unitId: string
xJust: string
})
export interface WebhookParamsInput {
partner: string
}
export interface FiscalDocumentActionBodyInput {
unitId: string
}
export interface RetornoManualBodyInput {
unitId: string
}
export interface RejeicaoManualInput {
unitId: string
/**
 * @minItems 1
 * @maxItems 20
 */
errors: [{
code: string
message: string
}, ...({
code: string
message: string
})[]]
}
export interface CancelamentoManualInput {
unitId: string
cMotivo: (1 | 2 | 9)
xMotivo: string
}
export interface SubstituirFiscalDocumentInput {
unitId: string
cMotivo: ("99" | "01" | "02" | "03" | "04" | "05")
xMotivo?: string
}
export interface JanelaEventosInput {
cancelarAte: (string | null)
substituirAte: (string | null)
substituirTeto: (string | null)
fonte: ("perfil" | "desconhecida" | "nacional")
}
export interface FiscalNumberVoidViewInput {
id: string
kind: ("NFE" | "NFCE")
ambiente: ("producao" | "homologacao")
serie: number
nIni: string
nFin: string
ano: number
status: ("REQUESTED" | "HOMOLOGATED" | "REJECTED")
partner: string
nProt: (string | null)
errors: {
code: string
message: string
}[]
}
export interface LacunaDeNumeracaoInput {
ambiente: string
serie: number
numero: string
documentId: (string | null)
status: (("SENT" | "PROCESSING" | "AUTHORIZED" | "AUTHORIZED_DIVERGENT" | "REJECTED" | "CANCELLED") | null)
avisos: string[]
presuncao?: string
}
export interface PendingVoidsQueryInput {
unitId: string
kind: ("NFE" | "NFCE")
}
export interface VoidNumberRangeInput {
unitId: string
kind: ("NFE" | "NFCE")
serie: number
nIni: number
nFin: number
xJust: string
}
export interface CancelNfeInput {
unitId: string
xJust: string
}
export interface CancelNfseInput {
unitId: string
cMotivo: (1 | 2 | 9)
xMotivo: string
}
