// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CompetenciaParamInput {
competencia: string
}
export interface SimplesHistoricoUpsertInput {
unitId: string
receitaBrutaCents: number
folhaCents?: (number | null)
sourceDocumentId?: (string | null)
}
export interface SimplesSegregacaoParcelaInput {
natureza: ("SERVICO" | "REVENDA" | "LOCACAO_MOVEL")
receitaCents: number
motivo: ("MONOFASICO" | "ICMS_ST" | "ISS_RETIDO" | "MONOFASICO_E_ICMS_ST")
}
export interface SimplesSegregacaoUpsertInput {
unitId: string
/**
 * @maxItems 50
 */
parcelas: {
natureza: ("SERVICO" | "REVENDA" | "LOCACAO_MOVEL")
receitaCents: number
motivo: ("MONOFASICO" | "ICMS_ST" | "ISS_RETIDO" | "MONOFASICO_E_ICMS_ST")
}[]
}
export interface SalaoParceriaContratoInput {
unitId: string
profissionalContactId: string
cotaSalaoBp: number
naturezaCota: ("ALUGUEL_BEM_MOVEL" | "GESTAO")
homologadoEm: string
sindicato: string
vigenteDesde: string
vigenteAte: (string | null)
profissionalCnpj?: (string | null)
checklistDeclarado?: ({
clausulaLocacaoBemMovel: ("SIM" | "NAO" | "NAO_INFORMADO")
clausulaCusteio: ("SIM" | "NAO" | "NAO_INFORMADO")
nfseEmitidaPeloParceiro: ("SIM" | "NAO" | "NAO_INFORMADO")
} | null)
}
export interface SalaoParceriaContratoPatchInput {
unitId: string
profissionalContactId?: string
cotaSalaoBp?: number
naturezaCota?: ("ALUGUEL_BEM_MOVEL" | "GESTAO")
homologadoEm?: string
sindicato?: string
vigenteDesde?: string
vigenteAte?: (string | null)
profissionalCnpj?: (string | null)
checklistDeclarado?: ({
clausulaLocacaoBemMovel: ("SIM" | "NAO" | "NAO_INFORMADO")
clausulaCusteio: ("SIM" | "NAO" | "NAO_INFORMADO")
nfseEmitidaPeloParceiro: ("SIM" | "NAO" | "NAO_INFORMADO")
} | null)
}
export interface AlertaSimplesInput {
codigo: ("ATIVIDADE_SEM_ANEXO" | "RBT12_INCOMPLETO" | "LIMITE_ME_EXCEDIDO" | "LIMITE_EPP_EXCEDIDO" | "SUBLIMITE_ICMS_ISS" | "SEGREGACAO_MANUAL" | "TIEOUT_DIVERGENTE" | "HISTORICO_IGNORADO" | "LIMITE_MEI_EXCEDIDO" | "NFSE_DIVERGE_RECEITA" | "BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO" | "ISS_VALOR_FIXO_MUNICIPAL" | "MEI_ENQUADRAMENTO_DIVERGE" | "MEI_TAC_COM_OCUPACAO_A" | "MEI_OCUPACAO_EXCLUIDA" | "REGIME_CAIXA_RECALCULO" | "IMPEDIMENTO_CAIXA_ICMS_ISS" | "CARTAO_RECEBIMENTO_ESTIMADO" | "RECEBIMENTO_DE_VENDA_TRIBUTADA_POR_COMPETENCIA" | "SEM_NCM" | "SEGREGACAO_DIVERGE" | "SEGREGACAO_INDEVIDA" | "ICMS_ST_NAO_CONFERIDA" | "PARCERIA_COTA_SEM_CONTRATO" | "PARCERIA_SEM_COTA" | "PARCEIRO_SEM_CNPJ" | "PARCERIA_CHECKLIST_INCOMPLETO" | "INTERDEPENDENCIA_SOCIO" | "INTERDEPENDENCIA_RECEITA_NAO_INFORMADA" | "PROJECAO_LIMITE_EPP" | "PROJECAO_SUBLIMITE_ICMS_ISS")
detalhe: string
severity: ("INFO" | "WARNING")
motivoInformativo?: ("DOCUMENTO_MUNICIPAL_TRANSIÇÃO" | "REGIME_CAIXA" | "CARTAO_RECEBIMENTO_ESTIMADO")
}
export interface BaseCaixaInput {
recebidoPaCents: number
receitaAuferidaPaCents: number
art20Cents: {
parcelaVencida: number
encerramento: number
retornoCompetencia: number
exclusao: number
}
}
export interface ChecklistParceriaInput {
clausulaLocacaoBemMovel: ("SIM" | "NAO" | "NAO_INFORMADO")
clausulaCusteio: ("SIM" | "NAO" | "NAO_INFORMADO")
nfseEmitidaPeloParceiro: ("SIM" | "NAO" | "NAO_INFORMADO")
}
export interface ImpedimentoCaixaInput {
mesBase: string
receitaNaoRecebidaCents: number
icmsCents: number
issCents: number
}
export interface RegistroValoresAReceberQueryInput {
unitId: string
ano: number
}
export interface LinhaAnexoIxInput {
saleId: string
dataOperacao: string
documentosFiscais: string[]
valorTotalCents: number
quantidadeParcelas: number
parcelas: {
numero: number
valorCents: number
vencimento: string
dataRecebimento: (string | null)
valorPagoCents: number
saldoAReceberCents: number
incobravelCents: number
}[]
dispensadaCartao: boolean
}
export interface SimplesCreditoIncobravelCreateInput {
unitId: string
saleId: string
valorCents: number
meioCobranca: ("NOTIFICACAO_EXTRAJUDICIAL" | "PROTESTO" | "COBRANCA_JUDICIAL" | "CADASTRO_PROTECAO_CREDITO")
data: string
evidencia: string
}
export interface SimplesUnitQueryInput {
unitId: string
}
export interface SimplesIdParamInput {
id: string
}
export interface SimplesDasRegistroInput {
unitId: string
numeroDocumento: string
valorCents: number
vencimento: string
sourceDocumentId?: (string | null)
}
export interface AnoParamInput {
ano: number
}
export interface SimplesDasnDigitadoInput {
contratouEmpregado: boolean
}
export interface SimplesDasnUpsertInput {
unitId: string
contratouEmpregado: boolean
}
export interface SimplesDefisSocioInput {
contactId: string
rendimentosIsentosCents: number
rendimentosTributaveisCents: number
participacaoBp: number
irrfCents: number
}
export interface SimplesDefisExportacaoComercialInput {
cnpj: string
valorCents: number
}
export interface SimplesDefisDoacaoEleitoralInput {
cnpj: string
tipoBeneficiario: ("CANDIDATO" | "COMITE_FINANCEIRO" | "PARTIDO_POLITICO")
formaDoacao: ("CHEQUE" | "OUTROS_TITULOS_CREDITO" | "TRANSFERENCIA_ELETRONICA" | "DEPOSITO_ESPECIE" | "DINHEIRO" | "BENS" | "SERVICOS")
valorCents: number
}
export interface SimplesDefisDigitadoInput {
empregadosInicio: number
empregadosFim: number
ganhosCapitalCents: number
ganhosRendaVariavelCents: number
exportacaoDiretaCents: number
/**
 * @maxItems 100
 */
exportacaoComercial: {
cnpj: string
valorCents: number
}[]
cotasTesourariaBp: number
/**
 * @maxItems 100
 */
socios: {
contactId: string
rendimentosIsentosCents: number
rendimentosTributaveisCents: number
participacaoBp: number
irrfCents: number
}[]
/**
 * @maxItems 100
 */
doacoesEleitorais: {
cnpj: string
tipoBeneficiario: ("CANDIDATO" | "COMITE_FINANCEIRO" | "PARTIDO_POLITICO")
formaDoacao: ("CHEQUE" | "OUTROS_TITULOS_CREDITO" | "TRANSFERENCIA_ELETRONICA" | "DEPOSITO_ESPECIE" | "DINHEIRO" | "BENS" | "SERVICOS")
valorCents: number
}[]
}
export interface SimplesDefisDigitadoLeituraInput {
empregadosInicio: number
empregadosFim: number
ganhosCapitalCents?: number
ganhosRendaVariavelCents: number
exportacaoDiretaCents?: number
/**
 * @maxItems 100
 */
exportacaoComercial?: {
cnpj: string
valorCents: number
}[]
cotasTesourariaBp?: number
/**
 * @maxItems 100
 */
socios: {
contactId: string
rendimentosIsentosCents: number
rendimentosTributaveisCents: number
participacaoBp: number
irrfCents: number
}[]
/**
 * @maxItems 100
 */
doacoesEleitorais?: {
cnpj: string
tipoBeneficiario: ("CANDIDATO" | "COMITE_FINANCEIRO" | "PARTIDO_POLITICO")
formaDoacao: ("CHEQUE" | "OUTROS_TITULOS_CREDITO" | "TRANSFERENCIA_ELETRONICA" | "DEPOSITO_ESPECIE" | "DINHEIRO" | "BENS" | "SERVICOS")
valorCents: number
}[]
}
export interface SimplesDefisUpsertInput {
unitId: string
empregadosInicio: number
empregadosFim: number
ganhosCapitalCents: number
ganhosRendaVariavelCents: number
exportacaoDiretaCents: number
/**
 * @maxItems 100
 */
exportacaoComercial: {
cnpj: string
valorCents: number
}[]
cotasTesourariaBp: number
/**
 * @maxItems 100
 */
socios: {
contactId: string
rendimentosIsentosCents: number
rendimentosTributaveisCents: number
participacaoBp: number
irrfCents: number
}[]
/**
 * @maxItems 100
 */
doacoesEleitorais: {
cnpj: string
tipoBeneficiario: ("CANDIDATO" | "COMITE_FINANCEIRO" | "PARTIDO_POLITICO")
formaDoacao: ("CHEQUE" | "OUTROS_TITULOS_CREDITO" | "TRANSFERENCIA_ELETRONICA" | "DEPOSITO_ESPECIE" | "DINHEIRO" | "BENS" | "SERVICOS")
valorCents: number
}[]
}
