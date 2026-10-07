// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ProposeLegalParameterInput {
tabela: ("TAX_ASSESSMENT" | "CSLL_ALIQUOTA" | "CODIGO_RECEITA" | "PIS_COFINS" | "PIS_COFINS_MONOFASICO_NCM" | "CST_PIS_COFINS" | "CFOP_IMOBILIZADO" | "NFE_CSTAT_AUTORIZADA" | "OBRIGACAO_REGIME" | "LC116_SERVICO" | "ISS_LIMITE" | "DEPRECIACAO_ANEXO_III" | "LEIAUTE_SPED" | "FERIADO_NACIONAL")
chave: string
discriminador?: string
valorInt?: number
valorTexto?: string
valorJson?: unknown
fonte: string
fonteUrl?: string
fonteSha256?: string
vigenteDesde: string
vigenteAte?: string
supersedesId?: string
motivo: string
}
export interface ListLegalParametersQueryInput {
tabela?: ("TAX_ASSESSMENT" | "CSLL_ALIQUOTA" | "CODIGO_RECEITA" | "PIS_COFINS" | "PIS_COFINS_MONOFASICO_NCM" | "CST_PIS_COFINS" | "CFOP_IMOBILIZADO" | "NFE_CSTAT_AUTORIZADA" | "OBRIGACAO_REGIME" | "LC116_SERVICO" | "ISS_LIMITE" | "DEPRECIACAO_ANEXO_III" | "LEIAUTE_SPED" | "FERIADO_NACIONAL")
status?: ("DRAFT" | "PUBLISHED" | "REVOKED")
}
export interface VigenteLegalParameterQueryInput {
tabela: ("TAX_ASSESSMENT" | "CSLL_ALIQUOTA" | "CODIGO_RECEITA" | "PIS_COFINS" | "PIS_COFINS_MONOFASICO_NCM" | "CST_PIS_COFINS" | "CFOP_IMOBILIZADO" | "NFE_CSTAT_AUTORIZADA" | "OBRIGACAO_REGIME" | "LC116_SERVICO" | "ISS_LIMITE" | "DEPRECIACAO_ANEXO_III" | "LEIAUTE_SPED" | "FERIADO_NACIONAL")
chave: string
data: string
discriminador?: string
}
