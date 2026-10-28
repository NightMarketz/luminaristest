// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface NfePayloadInput {
infNFe: {
Id: string
versao: "4.00"
ide: {
cUF: string
natOp: string
mod: (55 | 65)
serie: number
dhEmi: string
dhSaiEnt?: string
tpNF: (0 | 1)
idDest: (1 | 2 | 3)
cMunFG: string
tpImp: number
tpEmis: number
tpAmb: (1 | 2)
finNFe: number
indFinal: (0 | 1)
indPres: (0 | 1 | 2 | 3 | 4 | 5 | 9)
indIntermed?: 0
procEmi: 0
verProc: string
cNF: string
nNF: number
cDV: number
}
emit: {
CNPJ: string
xNome: string
xFant?: string
enderEmit: {
xLgr: string
nro: string
xCpl?: string
xBairro: string
cMun: string
xMun: string
UF: string
CEP: string
cPais?: "1058"
xPais?: string
fone?: string
}
IE: string
CRT: (1 | 2 | 3)
}
dest?: {
CNPJ?: string
CPF?: string
xNome?: string
enderDest?: {
xLgr: string
nro: string
xCpl?: string
xBairro: string
cMun: string
xMun: string
UF: string
CEP: string
cPais?: "1058"
xPais?: string
fone?: string
}
indIEDest: (1 | 2 | 9)
IE?: string
email?: string
}
/**
 * @minItems 1
 * @maxItems 990
 */
det: [{
nItem: number
prod: {
cProd: string
cEAN: string
xProd: string
NCM: string
CEST?: string
CFOP: string
uCom: string
qCom: string
vUnCom: string
vProd: string
cEANTrib: string
uTrib: string
qTrib: string
vUnTrib: string
vDesc?: string
indTot: (0 | 1)
}
imposto: {
ICMS: {
ICMSSN102?: {
orig: number
CSOSN: ("102" | "103" | "300" | "400")
}
ICMSSN500?: {
orig: number
CSOSN: "500"
}
ICMS00?: {
orig: number
CST: "00"
modBC: number
vBC: string
pICMS: string
vICMS: string
}
}
PIS?: {
PISAliq?: {
CST: ("01" | "02")
vBC: string
pPIS: string
vPIS: string
}
PISNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
PISOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pPIS: string
vPIS: string
}
}
COFINS?: {
COFINSAliq?: {
CST: ("01" | "02")
vBC: string
pCOFINS: string
vCOFINS: string
}
COFINSNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
COFINSOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pCOFINS: string
vCOFINS: string
}
}
IS?: {
CSTIS: string
cClassTribIS: string
vBCIS?: string
pIS?: string
adRemIS?: string
uTrib?: string
qTrib?: string
vIS?: string
}
IBSCBS?: {
CST: string
cClassTrib: string
indDoacao?: 1
gIBSCBS?: {
vBC: string
gIBSUF: {
pIBSUF: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSUF: string
}
gIBSMun: {
pIBSMun: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSMun: string
}
vIBS: string
gCBS: {
pCBS: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
gALCZFMCBS?: {
tpALCZFMCBS: (1 | 2)
nProcSuframa?: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
vCBS: string
}
gTribRegular?: {
CSTReg: string
cClassTribReg: string
pAliqEfetRegIBSUF: string
vTribRegIBSUF: string
pAliqEfetRegIBSMun: string
vTribRegIBSMun: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
gTribCompraGov?: {
pAliqIBSUF: string
vTribIBSUF: string
pAliqIBSMun: string
vTribIBSMun: string
pAliqCBS: string
vTribCBS: string
}
}
gIBSCBSMono?: {
gIBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemIBS: string
vIBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemIBSReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gIBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoUF: string
vIBSMonoUF: string
pAliqMonoMun: string
vIBSMonoMun: string
vIBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gCBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemCBS: string
vCBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemCBSReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
gCBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoCBS: string
vCBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
vTotIBSMonoItem: string
vTotCBSMonoItem: string
}
gTransfCred?: {
vIBS: string
vCBS: string
}
gAjusteCompet?: {
competApur: string
vIBS: string
vCBS: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
gCredPresOper?: {
vBCCredPres: string
cCredPres: string
gIBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
gCBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
}
gCredPresIBSZFM?: {
competApur: string
tpCredPresIBSZFM: number
vCredPresIBSZFM: string
}
}
}
}, ...({
nItem: number
prod: {
cProd: string
cEAN: string
xProd: string
NCM: string
CEST?: string
CFOP: string
uCom: string
qCom: string
vUnCom: string
vProd: string
cEANTrib: string
uTrib: string
qTrib: string
vUnTrib: string
vDesc?: string
indTot: (0 | 1)
}
imposto: {
ICMS: {
ICMSSN102?: {
orig: number
CSOSN: ("102" | "103" | "300" | "400")
}
ICMSSN500?: {
orig: number
CSOSN: "500"
}
ICMS00?: {
orig: number
CST: "00"
modBC: number
vBC: string
pICMS: string
vICMS: string
}
}
PIS?: {
PISAliq?: {
CST: ("01" | "02")
vBC: string
pPIS: string
vPIS: string
}
PISNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
PISOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pPIS: string
vPIS: string
}
}
COFINS?: {
COFINSAliq?: {
CST: ("01" | "02")
vBC: string
pCOFINS: string
vCOFINS: string
}
COFINSNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
COFINSOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pCOFINS: string
vCOFINS: string
}
}
IS?: {
CSTIS: string
cClassTribIS: string
vBCIS?: string
pIS?: string
adRemIS?: string
uTrib?: string
qTrib?: string
vIS?: string
}
IBSCBS?: {
CST: string
cClassTrib: string
indDoacao?: 1
gIBSCBS?: {
vBC: string
gIBSUF: {
pIBSUF: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSUF: string
}
gIBSMun: {
pIBSMun: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSMun: string
}
vIBS: string
gCBS: {
pCBS: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
gALCZFMCBS?: {
tpALCZFMCBS: (1 | 2)
nProcSuframa?: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
vCBS: string
}
gTribRegular?: {
CSTReg: string
cClassTribReg: string
pAliqEfetRegIBSUF: string
vTribRegIBSUF: string
pAliqEfetRegIBSMun: string
vTribRegIBSMun: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
gTribCompraGov?: {
pAliqIBSUF: string
vTribIBSUF: string
pAliqIBSMun: string
vTribIBSMun: string
pAliqCBS: string
vTribCBS: string
}
}
gIBSCBSMono?: {
gIBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemIBS: string
vIBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemIBSReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gIBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoUF: string
vIBSMonoUF: string
pAliqMonoMun: string
vIBSMonoMun: string
vIBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gCBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemCBS: string
vCBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemCBSReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
gCBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoCBS: string
vCBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
vTotIBSMonoItem: string
vTotCBSMonoItem: string
}
gTransfCred?: {
vIBS: string
vCBS: string
}
gAjusteCompet?: {
competApur: string
vIBS: string
vCBS: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
gCredPresOper?: {
vBCCredPres: string
cCredPres: string
gIBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
gCBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
}
gCredPresIBSZFM?: {
competApur: string
tpCredPresIBSZFM: number
vCredPresIBSZFM: string
}
}
}
})[]]
total: {
ICMSTot: {
vBC: string
vICMS: string
vICMSDeson: string
vFCPUFDest?: string
vBCST: string
vST: string
vFCPST: string
vProd: string
vFrete: string
vSeg: string
vDesc: string
vII: string
vIPI: string
vIPIDevol: string
vPIS: string
vCOFINS: string
vOutro: string
vNF: string
}
ISTot?: {
vIS: string
}
IBSCBSTot?: {
vBCIBSCBS: string
gIBS?: {
gIBSUF: {
vDif: string
vDevTrib: string
vIBSUF: string
}
gIBSMun: {
vDif: string
vDevTrib: string
vIBSMun: string
}
vIBS: string
vCredPres: string
vCredPresCondSus: string
}
gCBS?: {
vDif: string
vDevTrib: string
vCBS: string
vCredPres: string
vCredPresCondSus: string
}
gMono?: {
vIBSMono: string
vCBSMono: string
vIBSMonoReten: string
vCBSMonoReten: string
vIBSMonoRet: string
vCBSMonoRet: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
}
vNFTot?: string
}
transp: {
modFrete: number
}
pag: {
/**
 * @minItems 1
 * @maxItems 100
 */
detPag: [{
indPag?: (0 | 1)
tPag: string
vPag: string
}, ...({
indPag?: (0 | 1)
tPag: string
vPag: string
})[]]
vTroco?: string
}
}
}
export interface NfePayloadSemNumeracaoInput {
infNFe: {
versao: "4.00"
ide: {
cUF: string
natOp: string
mod: (55 | 65)
serie: number
dhEmi: string
dhSaiEnt?: string
tpNF: (0 | 1)
idDest: (1 | 2 | 3)
cMunFG: string
tpImp: number
tpEmis: number
tpAmb: (1 | 2)
finNFe: number
indFinal: (0 | 1)
indPres: (0 | 1 | 2 | 3 | 4 | 5 | 9)
indIntermed?: 0
procEmi: 0
verProc: string
}
emit: {
CNPJ: string
xNome: string
xFant?: string
enderEmit: {
xLgr: string
nro: string
xCpl?: string
xBairro: string
cMun: string
xMun: string
UF: string
CEP: string
cPais?: "1058"
xPais?: string
fone?: string
}
IE: string
CRT: (1 | 2 | 3)
}
dest?: {
CNPJ?: string
CPF?: string
xNome?: string
enderDest?: {
xLgr: string
nro: string
xCpl?: string
xBairro: string
cMun: string
xMun: string
UF: string
CEP: string
cPais?: "1058"
xPais?: string
fone?: string
}
indIEDest: (1 | 2 | 9)
IE?: string
email?: string
}
/**
 * @minItems 1
 * @maxItems 990
 */
det: [{
nItem: number
prod: {
cProd: string
cEAN: string
xProd: string
NCM: string
CEST?: string
CFOP: string
uCom: string
qCom: string
vUnCom: string
vProd: string
cEANTrib: string
uTrib: string
qTrib: string
vUnTrib: string
vDesc?: string
indTot: (0 | 1)
}
imposto: {
ICMS: {
ICMSSN102?: {
orig: number
CSOSN: ("102" | "103" | "300" | "400")
}
ICMSSN500?: {
orig: number
CSOSN: "500"
}
ICMS00?: {
orig: number
CST: "00"
modBC: number
vBC: string
pICMS: string
vICMS: string
}
}
PIS?: {
PISAliq?: {
CST: ("01" | "02")
vBC: string
pPIS: string
vPIS: string
}
PISNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
PISOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pPIS: string
vPIS: string
}
}
COFINS?: {
COFINSAliq?: {
CST: ("01" | "02")
vBC: string
pCOFINS: string
vCOFINS: string
}
COFINSNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
COFINSOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pCOFINS: string
vCOFINS: string
}
}
IS?: {
CSTIS: string
cClassTribIS: string
vBCIS?: string
pIS?: string
adRemIS?: string
uTrib?: string
qTrib?: string
vIS?: string
}
IBSCBS?: {
CST: string
cClassTrib: string
indDoacao?: 1
gIBSCBS?: {
vBC: string
gIBSUF: {
pIBSUF: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSUF: string
}
gIBSMun: {
pIBSMun: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSMun: string
}
vIBS: string
gCBS: {
pCBS: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
gALCZFMCBS?: {
tpALCZFMCBS: (1 | 2)
nProcSuframa?: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
vCBS: string
}
gTribRegular?: {
CSTReg: string
cClassTribReg: string
pAliqEfetRegIBSUF: string
vTribRegIBSUF: string
pAliqEfetRegIBSMun: string
vTribRegIBSMun: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
gTribCompraGov?: {
pAliqIBSUF: string
vTribIBSUF: string
pAliqIBSMun: string
vTribIBSMun: string
pAliqCBS: string
vTribCBS: string
}
}
gIBSCBSMono?: {
gIBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemIBS: string
vIBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemIBSReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gIBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoUF: string
vIBSMonoUF: string
pAliqMonoMun: string
vIBSMonoMun: string
vIBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gCBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemCBS: string
vCBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemCBSReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
gCBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoCBS: string
vCBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
vTotIBSMonoItem: string
vTotCBSMonoItem: string
}
gTransfCred?: {
vIBS: string
vCBS: string
}
gAjusteCompet?: {
competApur: string
vIBS: string
vCBS: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
gCredPresOper?: {
vBCCredPres: string
cCredPres: string
gIBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
gCBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
}
gCredPresIBSZFM?: {
competApur: string
tpCredPresIBSZFM: number
vCredPresIBSZFM: string
}
}
}
}, ...({
nItem: number
prod: {
cProd: string
cEAN: string
xProd: string
NCM: string
CEST?: string
CFOP: string
uCom: string
qCom: string
vUnCom: string
vProd: string
cEANTrib: string
uTrib: string
qTrib: string
vUnTrib: string
vDesc?: string
indTot: (0 | 1)
}
imposto: {
ICMS: {
ICMSSN102?: {
orig: number
CSOSN: ("102" | "103" | "300" | "400")
}
ICMSSN500?: {
orig: number
CSOSN: "500"
}
ICMS00?: {
orig: number
CST: "00"
modBC: number
vBC: string
pICMS: string
vICMS: string
}
}
PIS?: {
PISAliq?: {
CST: ("01" | "02")
vBC: string
pPIS: string
vPIS: string
}
PISNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
PISOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pPIS: string
vPIS: string
}
}
COFINS?: {
COFINSAliq?: {
CST: ("01" | "02")
vBC: string
pCOFINS: string
vCOFINS: string
}
COFINSNT?: {
CST: ("04" | "05" | "06" | "07" | "08" | "09")
}
COFINSOutr?: {
CST: ("49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "70" | "71" | "72" | "73" | "74" | "75" | "98" | "99")
vBC: string
pCOFINS: string
vCOFINS: string
}
}
IS?: {
CSTIS: string
cClassTribIS: string
vBCIS?: string
pIS?: string
adRemIS?: string
uTrib?: string
qTrib?: string
vIS?: string
}
IBSCBS?: {
CST: string
cClassTrib: string
indDoacao?: 1
gIBSCBS?: {
vBC: string
gIBSUF: {
pIBSUF: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSUF: string
}
gIBSMun: {
pIBSMun: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
vIBSMun: string
}
vIBS: string
gCBS: {
pCBS: string
gDif?: {
pDif: string
vDif: string
}
gDevTrib?: {
pDevTrib?: string
vDevTrib: string
}
gRed?: {
pRedAliq: string
pAliqEfet: string
}
gALCZFMCBS?: {
tpALCZFMCBS: (1 | 2)
nProcSuframa?: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
vCBS: string
}
gTribRegular?: {
CSTReg: string
cClassTribReg: string
pAliqEfetRegIBSUF: string
vTribRegIBSUF: string
pAliqEfetRegIBSMun: string
vTribRegIBSMun: string
pAliqEfetRegCBS: string
vTribRegCBS: string
}
gTribCompraGov?: {
pAliqIBSUF: string
vTribIBSUF: string
pAliqIBSMun: string
vTribIBSMun: string
pAliqCBS: string
vTribCBS: string
}
}
gIBSCBSMono?: {
gIBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemIBS: string
vIBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemIBSReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gIBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoUF: string
vIBSMonoUF: string
pAliqMonoMun: string
vIBSMonoMun: string
vIBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vIBSMonoReten: string
}
gMonoRet?: {
vIBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vIBSDiferenca: string
}
}
gCBSMonoAdRem?: {
gMonoPadrao?: {
qBCMono: string
adRemCBS: string
vCBSMono: string
}
gMonoReten?: {
qBCMonoReten: string
adRemCBSReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
gCBSMonoAdValorem?: {
gMonoPadrao?: {
vBCMono: string
pAliqMonoCBS: string
vCBSMono: string
}
gMonoReten?: {
vBCMonoReten: string
pAliqMonoReten: string
vCBSMonoReten: string
}
gMonoRet?: {
vCBSMonoRet: string
}
gpBioDiferenca?: {
qBCBioComb: string
vCBSDiferenca: string
}
}
vTotIBSMonoItem: string
vTotCBSMonoItem: string
}
gTransfCred?: {
vIBS: string
vCBS: string
}
gAjusteCompet?: {
competApur: string
vIBS: string
vCBS: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
gCredPresOper?: {
vBCCredPres: string
cCredPres: string
gIBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
gCBSCredPres?: {
pCredPres: string
vCredPres?: string
vCredPresCondSus?: string
}
}
gCredPresIBSZFM?: {
competApur: string
tpCredPresIBSZFM: number
vCredPresIBSZFM: string
}
}
}
})[]]
total: {
ICMSTot: {
vBC: string
vICMS: string
vICMSDeson: string
vFCPUFDest?: string
vBCST: string
vST: string
vFCPST: string
vProd: string
vFrete: string
vSeg: string
vDesc: string
vII: string
vIPI: string
vIPIDevol: string
vPIS: string
vCOFINS: string
vOutro: string
vNF: string
}
ISTot?: {
vIS: string
}
IBSCBSTot?: {
vBCIBSCBS: string
gIBS?: {
gIBSUF: {
vDif: string
vDevTrib: string
vIBSUF: string
}
gIBSMun: {
vDif: string
vDevTrib: string
vIBSMun: string
}
vIBS: string
vCredPres: string
vCredPresCondSus: string
}
gCBS?: {
vDif: string
vDevTrib: string
vCBS: string
vCredPres: string
vCredPresCondSus: string
}
gMono?: {
vIBSMono: string
vCBSMono: string
vIBSMonoReten: string
vCBSMonoReten: string
vIBSMonoRet: string
vCBSMonoRet: string
}
gEstornoCred?: {
vIBSEstCred: string
vCBSEstCred: string
}
}
vNFTot?: string
}
transp: {
modFrete: number
}
pag: {
/**
 * @minItems 1
 * @maxItems 100
 */
detPag: [{
indPag?: (0 | 1)
tPag: string
vPag: string
}, ...({
indPag?: (0 | 1)
tPag: string
vPag: string
})[]]
vTroco?: string
}
}
}
