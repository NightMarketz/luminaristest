// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type ProposePolicyVersionInput = ({
unitId: string
target: "FISCAL_PROFILE"
payload: {
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
} | {
unitId: string
target: "SCOPE_SETTINGS"
payload: {
bankChargeExpenseAccountId?: (string | null)
bankChargeIncomeAccountId?: (string | null)
depreciationExpenseAccountId?: (string | null)
disposalGainAccountId?: (string | null)
disposalLossAccountId?: (string | null)
depreciationParteBAccountId?: (string | null)
}
})
export interface ListPolicyVersionsQueryInput {
unitId: string
target?: ("FISCAL_PROFILE" | "SCOPE_SETTINGS")
status?: ("PROPOSED" | "APPLIED" | "REJECTED" | "SUPERSEDED")
ownerUserId?: string
}
export interface PolicyVersionScopeQueryInput {
unitId: string
ownerUserId?: string
}
export interface ApprovePolicyVersionInput {
unitId: string
ownerUserId?: string
}
export interface RejectPolicyVersionInput {
unitId: string
ownerUserId?: string
reason: string
}
