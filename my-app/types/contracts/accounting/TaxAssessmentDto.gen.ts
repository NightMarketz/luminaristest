// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface EstimativaPagaInput {
periodo: ("A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12")
tributo: ("IRPJ" | "CSLL")
valorCents: string
}
export interface TaxAssessmentDeducaoInput {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}
export interface TaxAssessmentPreviewInput {
unitId: string
anoCalendario: number
periodo: ("T01" | "T02" | "T03" | "T04" | "A00" | "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12")
/**
 * @maxItems 50
 */
deducoes?: {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}[]
modoMensal?: ("RECEITA_BRUTA" | "BALANCETE")
/**
 * @maxItems 24
 */
estimativasPagas?: {
periodo: ("A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12")
tributo: ("IRPJ" | "CSLL")
valorCents: string
}[]
}
export interface TaxAssessmentConfirmInput {
unitId: string
anoCalendario: number
periodo: ("T01" | "T02" | "T03" | "T04" | "A00" | "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12")
/**
 * @maxItems 50
 */
deducoes?: {
tributo: ("IRPJ" | "CSLL")
tipo: ("IRRF" | "CSLL_RETIDA" | "OUTRA")
valorCents: string
documento?: string
}[]
modoMensal?: ("RECEITA_BRUTA" | "BALANCETE")
/**
 * @maxItems 24
 */
estimativasPagas?: {
periodo: ("A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12")
tributo: ("IRPJ" | "CSLL")
valorCents: string
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
periodo?: ("T01" | "T02" | "T03" | "T04" | "A00" | "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10" | "A11" | "A12" | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M07" | "M08" | "M09" | "M10" | "M11" | "M12")
tributo?: ("IRPJ" | "CSLL" | "PIS" | "COFINS")
status?: ("CONFIRMED" | "SUPERSEDED")
}
export interface TaxAssessmentScopeQueryInput {
unitId: string
}
