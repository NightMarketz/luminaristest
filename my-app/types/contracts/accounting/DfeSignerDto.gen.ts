// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface DfeSignerCodigoViewInput {
codigo: string
expiraEm: string
}
export interface DfeSignerConteudoInput {
alvo: ("infNFe" | "infEvento" | "infInut" | "qrCodeV3Offline")
elementoXml?: string
signedInfoC14nB64?: string
baseQrB64?: string
chave?: string
tpAmb: ("1" | "2")
}
export interface DfeSignerHeartbeatInput {
versaoAssinador: string
tokenPresente: boolean
certThumbprintSha256: string
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
export type DfeSignerResultadoBodyInput = ({
ok: true
tipo: "ASSINAR"
signatureValueB64: string
certificadoDerB64: string
} | {
ok: true
tipo: "TRANSMITIR"
httpStatus: number
corpoB64: string
} | {
ok: false
code: ("TOKEN_AUSENTE" | "PIN_CANCELADO" | "CERT_VENCIDO" | "CONTEUDO_RECUSADO" | "TLS" | "TIMEOUT" | "REDE" | "HTTP" | "HOST_FORA_DA_LISTA")
message: string
})
export interface DfeSignerTarefaAssinarInput {
id: string
tipo: "ASSINAR"
algoritmo: "rsa-sha1"
digestB64: string
conteudo: {
alvo: ("infNFe" | "infEvento" | "infInut" | "qrCodeV3Offline")
elementoXml?: string
signedInfoC14nB64?: string
baseQrB64?: string
chave?: string
tpAmb: ("1" | "2")
}
expiraEm: string
}
export type DfeSignerTarefaInput = ({
id: string
tipo: "ASSINAR"
algoritmo: "rsa-sha1"
digestB64: string
conteudo: {
alvo: ("infNFe" | "infEvento" | "infInut" | "qrCodeV3Offline")
elementoXml?: string
signedInfoC14nB64?: string
baseQrB64?: string
chave?: string
tpAmb: ("1" | "2")
}
expiraEm: string
} | {
id: string
tipo: "TRANSMITIR"
url: string
servico: ("NFeAutorizacao4" | "NFeConsultaProtocolo4" | "NFeInutilizacao4" | "NFeRecepcaoEvento4" | "NFeStatusServico4")
envelopeB64: string
timeoutMs: number
expiraEm: string
})
export interface DfeSignerTarefaTransmitirInput {
id: string
tipo: "TRANSMITIR"
url: string
servico: ("NFeAutorizacao4" | "NFeConsultaProtocolo4" | "NFeInutilizacao4" | "NFeRecepcaoEvento4" | "NFeStatusServico4")
envelopeB64: string
timeoutMs: number
expiraEm: string
}
export interface DfeSignerTarefasQueryInput {
espera?: number
versaoAssinador: string
tokenPresente: ("true" | "false")
certThumbprintSha256: string
}
export interface DfeSignerTarefasRespostaInput {
tarefas: ({
id: string
tipo: "ASSINAR"
algoritmo: "rsa-sha1"
digestB64: string
conteudo: {
alvo: ("infNFe" | "infEvento" | "infInut" | "qrCodeV3Offline")
elementoXml?: string
signedInfoC14nB64?: string
baseQrB64?: string
chave?: string
tpAmb: ("1" | "2")
}
expiraEm: string
} | {
id: string
tipo: "TRANSMITIR"
url: string
servico: ("NFeAutorizacao4" | "NFeConsultaProtocolo4" | "NFeInutilizacao4" | "NFeRecepcaoEvento4" | "NFeStatusServico4")
envelopeB64: string
timeoutMs: number
expiraEm: string
})[]
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
