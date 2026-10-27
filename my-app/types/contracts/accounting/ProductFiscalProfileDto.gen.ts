// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ProductFiscalProfileParamsInput {
productRef: string
}
export interface ProductFiscalProfileScopeQueryInput {
unitId: string
}
export interface UpsertProductFiscalProfileInput {
unitId: string
ncm: string
cest?: (string | null)
origem: number
cfopPadrao: string
csosn?: (("102" | "103" | "300" | "400" | "500") | null)
cstIcms?: ("00" | null)
uCom: string
cEan: string
cstPis: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99" | "01" | "02" | "04" | "05" | "06" | "07" | "08" | "09")
cstCofins: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99" | "01" | "02" | "04" | "05" | "06" | "07" | "08" | "09")
ibsCbsCst?: (string | null)
ibsCbsClassTrib?: (string | null)
xProd?: (string | null)
}
