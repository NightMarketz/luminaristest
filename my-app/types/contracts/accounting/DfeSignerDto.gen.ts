// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface DfeSignerCodigoViewInput {
codigo: string
expiraEm: string
}
export interface DfeSignerPareamentoBodyInput {
codigo: string
nomeDispositivo: string
versaoAssinador: string
certificadoDerB64: string
}
export interface DfeSignerPareamentoRespostaInput {
dispositivoId: string
token?: string
unidades: {
unitId: string
cnpj: string
}[]
ambiente: ("producao" | "homologacao")
protocolo: "v1"
}
export interface DfeSignerViewInput {
dispositivoId: string
nome: string
versaoAssinador: string
versaoMinima: string
lastSeenAt: (string | null)
online: boolean
tokenPresente: boolean
certCnpjRaiz: string
certNotAfter: string
diasParaVencer: number
certThumbprint: string
ambiente: ("producao" | "homologacao")
pareadoEm: string
outrasUnidades: {
unitId: string
nome: string
}[]
}
