// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface TaxAssessmentDeducaoInput {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}
export interface TaxAssessmentPreviewInput {
unitId: string
anoCalendario: number
periodo: ("T01" | "T02" | "T03" | "T04")
/**
 * @maxItems 50
 */
deducoes?: {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}[]
}
export interface TaxAssessmentConfirmInput {
unitId: string
anoCalendario: number
periodo: ("T01" | "T02" | "T03" | "T04")
/**
 * @maxItems 50
 */
deducoes?: {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}[]
expectedAPagarCents: {
IRPJ: string
CSLL: string
}
/**
 * @maxItems 2
 */
supersedesIds?: string[]
}
export interface TaxAssessmentListQueryInput {
unitId: string
anoCalendario: number
periodo?: ("T01" | "T02" | "T03" | "T04")
status?: ("CONFIRMED" | "SUPERSEDED")
}
export interface TaxAssessmentScopeQueryInput {
unitId: string
}
