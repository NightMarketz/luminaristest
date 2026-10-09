// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface TaxAssessmentPeriodosQueryInput {
unitId: string
anoCalendario: number
}
export interface EstadoTributoInput {
estado: ("SEM_APURACAO" | "CONFIRMED" | "SO_SUPERSEDED" | "FORA_DA_ATIVIDADE" | "REVOGADO")
id?: string
aPagarCents?: string
}
export interface PeriodoEsperadoInput {
periodo: string
tributos: {
[k: string]: {
estado: ("SEM_APURACAO" | "CONFIRMED" | "SO_SUPERSEDED" | "FORA_DA_ATIVIDADE" | "REVOGADO")
id?: string
aPagarCents?: string
}
}
motivo?: string
}
export interface FamiliaPeriodosInput {
familia: ("X7" | "X8" | "SIMPLES")
apuravel: boolean
motivo?: ("PERFIL_AUSENTE" | "REGIME_DAS" | "REGIME_MEI" | "REGIME_NAO_SIMPLES" | "REGIME_SEM_APURACAO")
forma?: ("TRIMESTRAL" | "ANUAL")
modalidade?: ("CUMULATIVO" | "NAO_CUMULATIVO")
periodos: {
periodo: string
tributos: {
[k: string]: {
estado: ("SEM_APURACAO" | "CONFIRMED" | "SO_SUPERSEDED" | "FORA_DA_ATIVIDADE" | "REVOGADO")
id?: string
aPagarCents?: string
}
}
motivo?: string
}[]
}
export interface TaxAssessmentPeriodosViewInput {
anoCalendario: number
regime: (string | null)
familias: {
familia: ("X7" | "X8" | "SIMPLES")
apuravel: boolean
motivo?: ("PERFIL_AUSENTE" | "REGIME_DAS" | "REGIME_MEI" | "REGIME_NAO_SIMPLES" | "REGIME_SEM_APURACAO")
forma?: ("TRIMESTRAL" | "ANUAL")
modalidade?: ("CUMULATIVO" | "NAO_CUMULATIVO")
periodos: {
periodo: string
tributos: {
[k: string]: {
estado: ("SEM_APURACAO" | "CONFIRMED" | "SO_SUPERSEDED" | "FORA_DA_ATIVIDADE" | "REVOGADO")
id?: string
aPagarCents?: string
}
}
motivo?: string
}[]
}[]
}
