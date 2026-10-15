import type { ServiceFiscalCatalogItem } from '../dtos/SectorKitDto';
import type { Suggestion } from '../dtos/ServiceFiscalSuggestionDto';

/** Máximo de sugestões por nome (7b). */
export const MAX_SUGESTOES = 3;

const STOPWORDS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'no', 'na', 'nos', 'nas']);

/**
 * Normalização da camada 1 (7b): minúsculas, sem acento, sem pontuação, sem stopwords, plural simples (`-s` final em
 * palavra de 4+ letras). Nome e sinônimo passam pela MESMA função, então a regra só precisa ser consistente.
 */
export function normalizarTermos(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map((t) => (t.length >= 4 && t.endsWith('s') ? t.slice(0, -1) : t));
}

/** `agulha` aparece como sequência contígua em `palheiro`? */
function contemSequencia(palheiro: string[], agulha: string[]): boolean {
  if (agulha.length === 0 || agulha.length > palheiro.length) return false;
  for (let i = 0; i + agulha.length <= palheiro.length; i++) {
    if (agulha.every((t, j) => palheiro[i + j] === t)) return true;
  }
  return false;
}

/**
 * Camada 1, determinística (BE-INCR-KIT-SETOR-EMENDA-1, PR-K3, item 7b; F-KE-4, dono 13/10): casa o nome do serviço com
 * os sinônimos do catálogo do kit. Função PURA. Cada entrada do catálogo vale uma vez, pelo sinônimo mais longo que
 * casou (mais específico primeiro); empate fica na ordem do catálogo. Até `MAX_SUGESTOES`. Sem casamento ⇒ `[]`.
 */
export function suggestFromCatalog(nome: string, catalogo: readonly ServiceFiscalCatalogItem[]): Suggestion[] {
  const termos = normalizarTermos(nome);
  const achados: Array<{ ordem: number; peso: number; s: Suggestion }> = [];
  catalogo.forEach((item, ordem) => {
    let melhor: { peso: number; termo: string } | null = null;
    for (const sinonimo of item.sinonimos) {
      const agulha = normalizarTermos(sinonimo);
      if (contemSequencia(termos, agulha) && (!melhor || agulha.length > melhor.peso)) melhor = { peso: agulha.length, termo: sinonimo };
    }
    if (melhor) {
      achados.push({
        ordem,
        peso: melhor.peso,
        s: { key: item.key, cTribNac: item.cTribNac, ...(item.cNBS ? { cNBS: item.cNBS } : {}), label: item.label, origem: 'dicionario', termo: melhor.termo },
      });
    }
  });
  return achados
    .sort((a, b) => b.peso - a.peso || a.ordem - b.ordem)
    .slice(0, MAX_SUGESTOES)
    .map((a) => a.s);
}
