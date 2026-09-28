// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface EmitFiscalDocumentInput {
unitId: string
saleId: string
kind: ("NFSE" | "NFE")
}
export interface PreviewFiscalDocumentInput {
unitId: string
saleId: string
kind: ("NFSE" | "NFE")
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
export interface CancelFiscalDocumentInput {
unitId: string
cMotivo: (1 | 2 | 9)
xMotivo: string
}
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
