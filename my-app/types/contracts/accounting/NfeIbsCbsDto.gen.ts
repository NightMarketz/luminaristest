// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface NfeIbsCbsInput {
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
export interface NfeIbsCbsTotInput {
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
export interface NfeIsInput {
CSTIS: string
cClassTribIS: string
vBCIS?: string
pIS?: string
adRemIS?: string
uTrib?: string
qTrib?: string
vIS?: string
}
export interface NfeIsTotInput {
vIS: string
}
