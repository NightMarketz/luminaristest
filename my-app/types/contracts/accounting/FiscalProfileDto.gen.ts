// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface FiscalProfileScopeQueryInput {
unitId: string
}
export interface UpsertFiscalProfileInput {
unitId: string
regimeTributario: ("SIMPLES" | "PRESUMIDO" | "REAL")
icmsContribuinte: boolean
pisCofinsRegime: ("SIMPLES" | "CUMULATIVO" | "NAO_CUMULATIVO")
pisCofinsCreditExcludesIcms?: boolean
pisCofinsCreditIncludesIpi?: boolean
pisCofinsCreditFromSimplesSupplier?: boolean
icmsRecuperavelAccountId?: (string | null)
pisCofinsRecuperavelAccountId?: (string | null)
insumoExpenseAccountId?: (string | null)
irpjDespesaAccountId?: (string | null)
csllDespesaAccountId?: (string | null)
irpjRecolherAccountId?: (string | null)
csllRecolherAccountId?: (string | null)
pisDespesaAccountId?: (string | null)
cofinsDespesaAccountId?: (string | null)
pisRecolherAccountId?: (string | null)
cofinsRecolherAccountId?: (string | null)
partnerAccountRef?: (string | null)
codMun?: (string | null)
inscricaoMunicipal?: (string | null)
cnae?: (string | null)
dpsSerie?: number
regEspTrib?: number
regApTribSN?: (number | null)
issAliquotaBp?: (number | null)
issRetidoTomadorPj?: boolean
pacoteFatoGerador?: ("CONSUMO" | "VENDA")
pacoteCTribNac?: (string | null)
pacoteCNBS?: (string | null)
ibsCbsInformar?: boolean
ibsCbsCst?: (string | null)
ibsCbsClassTrib?: (string | null)
pTotTribFedCent?: (number | null)
pTotTribEstCent?: (number | null)
pTotTribMunCent?: (number | null)
pTotTribSNCent?: (number | null)
emissaoForaDoMes?: ("AVISAR" | "BLOQUEAR")
}
export interface FiscalProfilePolicyPayloadInput {
regimeTributario: ("SIMPLES" | "PRESUMIDO" | "REAL")
icmsContribuinte: boolean
pisCofinsRegime: ("SIMPLES" | "CUMULATIVO" | "NAO_CUMULATIVO")
pisCofinsCreditExcludesIcms?: boolean
pisCofinsCreditIncludesIpi?: boolean
pisCofinsCreditFromSimplesSupplier?: boolean
icmsRecuperavelAccountId?: (string | null)
pisCofinsRecuperavelAccountId?: (string | null)
insumoExpenseAccountId?: (string | null)
irpjDespesaAccountId?: (string | null)
csllDespesaAccountId?: (string | null)
irpjRecolherAccountId?: (string | null)
csllRecolherAccountId?: (string | null)
pisDespesaAccountId?: (string | null)
cofinsDespesaAccountId?: (string | null)
pisRecolherAccountId?: (string | null)
cofinsRecolherAccountId?: (string | null)
partnerAccountRef?: (string | null)
codMun?: (string | null)
inscricaoMunicipal?: (string | null)
cnae?: (string | null)
dpsSerie?: number
regEspTrib?: number
regApTribSN?: (number | null)
issAliquotaBp?: (number | null)
issRetidoTomadorPj?: boolean
pacoteFatoGerador?: ("CONSUMO" | "VENDA")
pacoteCTribNac?: (string | null)
pacoteCNBS?: (string | null)
ibsCbsInformar?: boolean
ibsCbsCst?: (string | null)
ibsCbsClassTrib?: (string | null)
pTotTribFedCent?: (number | null)
pTotTribEstCent?: (number | null)
pTotTribMunCent?: (number | null)
pTotTribSNCent?: (number | null)
emissaoForaDoMes?: ("AVISAR" | "BLOQUEAR")
}
