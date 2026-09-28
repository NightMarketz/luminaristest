// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ImportNfePurchaseInput {
unitId: string
counterpartyId?: string
dueDate?: string
/**
 * @minItems 1
 */
itemMappings: [{
cProd: string
productRef?: string
classId?: string
}, ...({
cProd: string
productRef?: string
classId?: string
})[]]
}
export interface ImportNfeSaleInput {
unitId: string
saleId: string
}
export interface PreviewNfeInput {
unitId: string
}
export interface NfeCostPreviewInput {
custoBrutoCents: number
custoEstoqueCents: number
creditoIcmsCents: number
creditoPisCofinsCents: number
baseCreditoPisCofinsCents: number
regimeAplicado: ("NAO_CONTRIBUINTE" | "CONTRIBUINTE_ICMS")
pisCofinsAplicado: ("SEM_CREDITO" | "NAO_CUMULATIVO")
warnings: string[]
}
export interface NfePreviewInput {
chaveAcesso: string
ide: {
numero: string
serie: string
dhEmiDate: string
tpNF: string
natOp: string
mod: string
}
emit: {
cnpj?: string
cpf?: string
nome?: string
ie?: string
crt?: string
}
dest: {
cnpj?: string
cpf?: string
nome?: string
ie?: string
crt?: string
}
/**
 * @minItems 1
 */
itens: [{
nItem: number
cProd: string
cEAN: string
xProd: string
ncm: string
cfop: string
uCom: string
qCom: string
vUnComStr: string
vProdCents: number
vDescCents: number
indTot: ("0" | "1")
vFreteCents: number
vSegCents: number
vOutroCents: number
vICMSCents: number
vICMSSTCents: number
vIPICents: number
cstPis: (string | null)
cstCofins: (string | null)
}, ...({
nItem: number
cProd: string
cEAN: string
xProd: string
ncm: string
cfop: string
uCom: string
qCom: string
vUnComStr: string
vProdCents: number
vDescCents: number
indTot: ("0" | "1")
vFreteCents: number
vSegCents: number
vOutroCents: number
vICMSCents: number
vICMSSTCents: number
vIPICents: number
cstPis: (string | null)
cstCofins: (string | null)
})[]]
totais: {
vProdCents: number
vDescCents: number
vFreteCents: number
vSegCents: number
vOutroCents: number
vIPICents: number
vSTCents: number
vICMSCents: number
vNFCents: number
}
protocolo: {
cStat: string
nProt: string
dhRecbtoDate: string
}
alreadyImported: boolean
existingPayableId: (string | null)
custo: {
custoBrutoCents: number
custoEstoqueCents: number
creditoIcmsCents: number
creditoPisCofinsCents: number
baseCreditoPisCofinsCents: number
regimeAplicado: ("NAO_CONTRIBUINTE" | "CONTRIBUINTE_ICMS")
pisCofinsAplicado: ("SEM_CREDITO" | "NAO_CUMULATIVO")
warnings: string[]
}
}
