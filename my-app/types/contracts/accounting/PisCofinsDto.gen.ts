// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface PisCofinsPreviewInput {
unitId: string
anoCalendario: number
periodo: ("M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M07" | "M08" | "M09" | "M10" | "M11" | "M12")
/**
 * @maxItems 50
 */
ajustesBase?: {
tipo: ("ALIQUOTA_ZERO_REVENDA" | "COTA_PARTE_PARCEIRO")
valorCents: string
documento?: string
}[]
/**
 * @maxItems 50
 */
outrosCreditos?: {
inciso: ("III_ENERGIA" | "IV_ALUGUEL_PJ" | "V_ARRENDAMENTO" | "VI_VII_DEPRECIACAO" | "IX_FRETE_VENDA")
baseCents: string
documento?: string
}[]
/**
 * @maxItems 50
 */
retencoes?: {
tributo: ("PIS" | "COFINS")
valorCents: string
documento?: string
}[]
saldoCredorAnterior?: {
PIS: string
COFINS: string
}
}
export interface PisCofinsConfirmInput {
unitId: string
anoCalendario: number
periodo: ("M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M07" | "M08" | "M09" | "M10" | "M11" | "M12")
/**
 * @maxItems 50
 */
ajustesBase?: {
tipo: ("ALIQUOTA_ZERO_REVENDA" | "COTA_PARTE_PARCEIRO")
valorCents: string
documento?: string
}[]
/**
 * @maxItems 50
 */
outrosCreditos?: {
inciso: ("III_ENERGIA" | "IV_ALUGUEL_PJ" | "V_ARRENDAMENTO" | "VI_VII_DEPRECIACAO" | "IX_FRETE_VENDA")
baseCents: string
documento?: string
}[]
/**
 * @maxItems 50
 */
retencoes?: {
tributo: ("PIS" | "COFINS")
valorCents: string
documento?: string
}[]
saldoCredorAnterior?: {
PIS: string
COFINS: string
}
expectedAPagarCents: {
PIS: string
COFINS: string
}
/**
 * @maxItems 2
 */
supersedesIds?: string[]
}
