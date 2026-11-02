// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AlertaRegimeInput {
codigo: ("SUBLIMITE_80" | "SUBLIMITE_EXCEDIDO" | "LIMITE_EPP_EXCEDIDO" | "JANELA_OPCAO")
detalhe: string
}
export interface FatorRSimulacaoQueryInput {
unitId: string
competencia: string
folhaAlvoCents: unknown
tipoFolha?: ("PRO_LABORE" | "EMPREGADO")
}
export interface FatorRSimulacaoInput {
competencia: string
tipoFolha: ("PRO_LABORE" | "EMPREGADO")
rAtual: number
rSimulado: number
anexoAtual: string
anexoSimulado: string
fs12AtualCents: string
folhaAdicionalCents: string
dasAtualCents: string
dasSimuladoCents: string
custoFolhaAdicionalCents: string
economiaLiquidaCents: string
avisos: string[]
parametrosSha256: string
}
export interface RegimeSimulacaoQueryInput {
unitId: string
ano: number
}
export interface RegimeSimulacaoInput {
ano: number
regimeAtual: (string | null)
simulacao: {
ano: number
receitaBrutaCents: string
cenarios: {
regime: ("SIMPLES" | "PRESUMIDO" | "REAL")
disponivel: boolean
motivoIndisponivel: (string | null)
cargaTotalCents: string
componentes: {
das: string
irpj: string
csll: string
pis: string
cofins: string
cbs: string
ibs: string
cpp: string
iss: string
}
}[]
melhor: (("SIMPLES" | "PRESUMIDO" | "REAL") | null)
avisos: string[]
}
projecao2027: ({
ano: number
receitaBrutaCents: string
cenarios: {
regime: ("SIMPLES" | "PRESUMIDO" | "REAL")
disponivel: boolean
motivoIndisponivel: (string | null)
cargaTotalCents: string
componentes: {
das: string
irpj: string
csll: string
pis: string
cofins: string
cbs: string
ibs: string
cpp: string
iss: string
}
}[]
melhor: (("SIMPLES" | "PRESUMIDO" | "REAL") | null)
avisos: string[]
} | null)
economiaCents: string
alertas: {
codigo: ("SUBLIMITE_80" | "SUBLIMITE_EXCEDIDO" | "LIMITE_EPP_EXCEDIDO" | "JANELA_OPCAO")
detalhe: string
}[]
avisos: string[]
parametrosSha256: string
}
export interface RemuneracaoSocioQueryInput {
unitId: string
ano: number
partnerId: string
valorAnualCents: unknown
}
export interface RemuneracaoSocioSimulacaoInput {
ano: number
partnerId: string
regime: string
valorAnualCents: string
mixes: {
mix: ("PRO_LABORE_INTEGRAL" | "PRO_LABORE_MINIMO_DIVIDENDOS" | "PRO_LABORE_MINIMO_JCP_DIVIDENDOS")
proLaboreCents: string
dividendosCents: string
jcpCents: string
inssSocioCents: string
cppEmpresaCents: string
irpfProLaboreCents: string
irrfDividendosCents: string
irrfJcpCents: string
economiaIrpjCsllJcpCents: string
cargaTotalCents: string
liquidoSocioCents: string
}[]
melhor: ("PRO_LABORE_INTEGRAL" | "PRO_LABORE_MINIMO_DIVIDENDOS" | "PRO_LABORE_MINIMO_JCP_DIVIDENDOS")
economiaCents: string
avisos: string[]
parametrosSha256: string
}
export interface SimulacaoSugestaoInput {
suggestionId: string
reaproveitada: boolean
avisos: string[]
}
