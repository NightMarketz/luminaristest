// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface DpsPayloadInput {
versao: "1.01"
infDPS: {
id: string
tpAmb: (1 | 2)
dhEmi: string
verAplic: string
serie: number
nDPS: number
dCompet: string
tpEmit: 1
cLocEmi: string
prest: {
CNPJ: string
IM?: string
xNome?: string
regTrib: {
opSimpNac: (1 | 3)
regApTribSN?: number
regEspTrib: number
}
}
toma: {
CNPJ?: string
CPF?: string
xNome: string
end?: {
endNac: {
cMun: string
CEP: string
}
xLgr: string
nro: string
xCpl?: string
xBairro: string
}
}
serv: {
locPrest: {
cLocPrestacao: string
}
cServ: {
cTribNac: string
cTribMun?: string
xDescServ: string
cNBS?: string
cIntContrib?: string
}
infoCompl?: {
xInfComp?: string
}
}
valores: {
vServPrest: {
vServ: string
}
vDescCondIncond?: {
vDescIncond?: string
vDescCond?: string
}
trib: {
tribMun: {
tribISSQN: 1
tpRetISSQN: (1 | 2)
pAliq?: string
}
totTrib: ({
pTotTrib: {
pTotTribFed: string
pTotTribEst: string
pTotTribMun: string
}
} | {
pTotTribSN: string
})
}
}
IBSCBS?: {
finNFSe: 0
cIndOp: string
indDest: 0
valores: {
trib: {
gIBSCBS: {
CST: string
cClassTrib: string
}
}
}
}
}
}
export interface DpsManualPayloadInput {
versao: "1.01"
infDPS: {
tpAmb: (1 | 2)
dhEmi: string
verAplic: string
dCompet: string
tpEmit: 1
cLocEmi: string
prest: {
CNPJ: string
IM?: string
xNome?: string
regTrib: {
opSimpNac: (1 | 3)
regApTribSN?: number
regEspTrib: number
}
}
toma: {
CNPJ?: string
CPF?: string
xNome: string
end?: {
endNac: {
cMun: string
CEP: string
}
xLgr: string
nro: string
xCpl?: string
xBairro: string
}
}
serv: {
locPrest: {
cLocPrestacao: string
}
cServ: {
cTribNac: string
cTribMun?: string
xDescServ: string
cNBS?: string
cIntContrib?: string
}
infoCompl?: {
xInfComp?: string
}
}
valores: {
vServPrest: {
vServ: string
}
vDescCondIncond?: {
vDescIncond?: string
vDescCond?: string
}
trib: {
tribMun: {
tribISSQN: 1
tpRetISSQN: (1 | 2)
pAliq?: string
}
totTrib: ({
pTotTrib: {
pTotTribFed: string
pTotTribEst: string
pTotTribMun: string
}
} | {
pTotTribSN: string
})
}
}
IBSCBS?: {
finNFSe: 0
cIndOp: string
indDest: 0
valores: {
trib: {
gIBSCBS: {
CST: string
cClassTrib: string
}
}
}
}
}
}
