// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ServicoFiscalAvaliacaoQueryInput {
unitId: string
ano: number
}
export interface ServicoFiscalAvaliacaoResponseInput {
ano: number
regime: string
alertas: {
code: ("PROFISSAO_REGULAMENTADA_TIRA_16" | "MEDICO_COM_SERVICO_ESTETICO" | "LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES" | "CESSAO_MAO_DE_OBRA_MEDICA" | "PACOTE_FATO_GERADOR_FORA_DO_PADRAO")
severity: ("WARN" | "INFO")
serviceRefs: string[]
motivoInformativo: string
legalBasis: string
}[]
sugestoes: {
practice: ("PRESUNCAO_HOSPITALAR" | "NBS_SAUDE_2027")
serviceRef: string
suggestionId: string
estimatedSavingCents: string
faltando: string[]
}[]
avisos: string[]
}
