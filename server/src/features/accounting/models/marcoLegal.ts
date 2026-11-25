/**
 * Onda 3.2, fatia 4 (auditoria 24/11/2026; dono, chat, 24/11/2026: "tabela nova `MARCO_LEGAL`: chave = nome do marco,
 * valorTexto = data, `fonte` obrigatória") — marco de lei SEM linha temática própria como dado, no lugar do literal em código.
 *
 * Forma da linha: `tabela = MARCO_LEGAL`, `chave` ∈ `MARCOS_LEGAIS`, sem discriminador, `valorTexto` = data `YYYY-MM-DD`
 * (o 1º dia em que a regra vale), `fonte` = norma + artigo. O `vigenteDesde` da linha é a vigência do próprio dado (quando a
 * norma que cria o marco passou a valer), NÃO o marco: por isso o lookup NÃO filtra pela data do fato (um PA de 2026 precisa
 * ler o marco de 2027 para saber que ainda está antes dele). Trocar um marco = publicar linha que substitui a anterior.
 *
 * Sem linha em vigor ⇒ `ParametroLegalAusenteError` (400 `PARAMETRO_LEGAL_AUSENTE`), nunca um default em código.
 */
import { ParametroLegalAusenteError, linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/** Marcos que um consumidor em código lê. Marco sem consumidor não entra (mesma regra do enum de tabelas). */
export const MARCOS_LEGAIS = [
  // LC 214/2025 art. 517 (red. LC 123 art. 18 § 1º, "doze meses antecedentes ao mês anterior"), efeitos pelo art. 544 III.
  'INICIO_LC214_RBT12',
  // LC 214/2025 art. 517 (LC 123 art. 13 IX–X e §§ 9º a 11: opção do Simples pelo IBS/CBS regular), efeitos pelo art. 544 III.
  'INICIO_OPCAO_IBS_CBS_DAS',
  // Res. CGSN 190/2026 art. 1º/8º IX e XII (fim do regime de caixa), efeitos pelo art. 9º II (red. Res. CGSN 196/2026).
  'FIM_REGIME_CAIXA_SIMPLES',
  // LC 214/2025 art. 343 (2026: só IBS estadual de 0,1%) e art. 344 (2027: estadual 0,05% + municipal 0,05%).
  'INICIO_IBS_MUNICIPAL',
] as const;
export type MarcoLegal = (typeof MARCOS_LEGAIS)[number];

/** A linha em vigor do marco (a de `vigenteDesde` mais recente); sem linha ⇒ `ParametroLegalAusenteError`. Devolve a linha para a proveniência. */
export function linhaDoMarco(linhas: readonly LinhaLegal[], marco: MarcoLegal, dataConsultada: string): LinhaLegal & { valorTexto: string } {
  let melhor: LinhaLegal | undefined;
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== 'MARCO_LEGAL' || l.chave !== marco || l.discriminador !== null) continue;
    if (!melhor || l.vigenteDesde > melhor.vigenteDesde) melhor = l;
  }
  if (!melhor?.valorTexto) throw new ParametroLegalAusenteError('MARCO_LEGAL', dataConsultada, marco);
  return { ...melhor, valorTexto: melhor.valorTexto };
}

/** A data (`YYYY-MM-DD`) do marco na linha em vigor. */
export function dataDoMarco(linhas: readonly LinhaLegal[], marco: MarcoLegal, dataConsultada: string): string {
  return linhaDoMarco(linhas, marco, dataConsultada).valorTexto;
}

/** Competência (`YYYY-MM`) em que a redação da LC 214 sobre o RBT12 passa a valer — o mês da data do marco. */
export function inicioLc214Competencia(linhas: readonly LinhaLegal[], dataConsultada: string): string {
  return dataDoMarco(linhas, 'INICIO_LC214_RBT12', dataConsultada).slice(0, 7);
}

/** Competência (`YYYY-MM`) a partir da qual o optante do Simples pode escolher o IBS/CBS pelo regime regular — o mês do marco. */
export function inicioOpcaoIbsCbsDasCompetencia(linhas: readonly LinhaLegal[], dataConsultada: string): string {
  return dataDoMarco(linhas, 'INICIO_OPCAO_IBS_CBS_DAS', dataConsultada).slice(0, 7);
}

/**
 * Perfil/ano-calendário `ano` ANTES do marco = o ano inteiro termina antes dele (`ano-12-31 < marco`). Com marco em 1º de janeiro
 * é "ano < ano do marco"; com marco no meio do ano, o ano que contém o marco NÃO é "antes" (a regra já vale em parte dele).
 */
export const anoTerminaAntesDoMarco = (ano: number, dataMarco: string): boolean => `${ano}-12-31` < dataMarco;

/** Perfil/ano-calendário `ano` DEPOIS do marco = o ano inteiro começa nele ou depois (`ano-01-01 >= marco`). */
export const anoComecaNoOuDepoisDoMarco = (ano: number, dataMarco: string): boolean => `${ano}-01-01` >= dataMarco;

/** Como a mensagem ao usuário fala do marco: só o ano quando é 1º de janeiro ("2027"), senão `DD/MM/AAAA`. */
export function rotuloDoMarco(dataMarco: string): string {
  return dataMarco.endsWith('-01-01') ? dataMarco.slice(0, 4) : `${dataMarco.slice(8, 10)}/${dataMarco.slice(5, 7)}/${dataMarco.slice(0, 4)}`;
}
