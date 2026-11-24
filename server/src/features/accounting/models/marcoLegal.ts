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
] as const;
export type MarcoLegal = (typeof MARCOS_LEGAIS)[number];

/** A data (`YYYY-MM-DD`) do marco na linha em vigor; várias em vigor ⇒ a de `vigenteDesde` mais recente. */
export function dataDoMarco(linhas: readonly LinhaLegal[], marco: MarcoLegal, dataConsultada: string): string {
  let melhor: LinhaLegal | undefined;
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== 'MARCO_LEGAL' || l.chave !== marco || l.discriminador !== null) continue;
    if (!melhor || l.vigenteDesde > melhor.vigenteDesde) melhor = l;
  }
  if (!melhor?.valorTexto) throw new ParametroLegalAusenteError('MARCO_LEGAL', dataConsultada, marco);
  return melhor.valorTexto;
}

/** Competência (`YYYY-MM`) em que a redação da LC 214 sobre o RBT12 passa a valer — o mês da data do marco. */
export function inicioLc214Competencia(linhas: readonly LinhaLegal[], dataConsultada: string): string {
  return dataDoMarco(linhas, 'INICIO_LC214_RBT12', dataConsultada).slice(0, 7);
}
