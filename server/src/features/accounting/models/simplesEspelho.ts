/**
 * BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, item 18; F-SN-8 → b) — espelho do PGDAS-D na árvore do manual. PURO.
 *
 * Fonte dos rótulos: Manual do PGDAS-D e DEFIS, versão 17/06/2025 (corpus, sha256 `e73b2bfc7ede`), item 6.5 ("Atividades
 * econômicas com receita no período de apuração") e item 6.6.1 ("Qualificações tributárias"). O espelho é a declaração
 * que o usuário digita no portal: uma atividade por item 6.5 e, dentro dela, cada parcela com a qualificação do tributo
 * que ela tira do cálculo. Só os itens que o produto gera: 1 (revenda), 5 (locação de bem móvel) e 7 (serviços).
 */
import type { AnexoSimples, AtividadeApurada, NaturezaSimples, Parcela, TributoSimples } from './simplesCalc';

export interface EspelhoParcela {
  receitaCents: number;
  /** Item 6.6.1: tributo → qualificação (só os que a parcela tira do cálculo). */
  qualificacoes: Partial<Record<TributoSimples, string>>;
}
export interface EspelhoAtividade {
  item: '1' | '5' | '7';
  atividade: string;
  detalhe: string;
  anexo: AnexoSimples;
  receitaCents: number;
  parcelas: EspelhoParcela[];
}

const ITEM_REVENDA = '1 - Revenda de mercadorias, exceto para o exterior';
const ITEM_LOCACAO = '5 - Locação de bens móveis, exceto para o exterior';
const ITEM_SERVICO = '7 - Prestação de Serviços, exceto para o exterior';
const SEM_ST = 'Sem substituição tributária/tributação monofásica/antecipação com encerramento de tributação';
const COM_ST = 'Com substituição tributária/tributação monofásica/antecipação com encerramento de tributação';
const ISS_PROPRIO = 'sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento';
const ISS_RETIDO = 'com retenção/substituição tributária de ISS';

/** Item 6.6.1 — a qualificação que cada exclusão do PR-2 corresponde (monofásico: 6.6.4; ST de ICMS: 6.6.3). */
const QUALIFICACAO: Partial<Record<TributoSimples, string>> = {
  PIS: 'Tributação monofásica',
  COFINS: 'Tributação monofásica',
  ICMS: 'Substituição tributária',
  ISS: 'Retenção/substituição tributária',
};

function detalheServico(anexo: AnexoSimples, fatorR: boolean, retido: boolean): string {
  const iss = retido ? ISS_RETIDO : ISS_PROPRIO;
  if (fatorR) return `Sujeitos ao fator "r", ${iss}`;
  if (anexo === 'IV') return `Sujeitos ao Anexo IV, ${iss}`;
  return `Não sujeitos ao fator "r" e tributados pelo Anexo III, ${iss}`;
}

export function espelhoPgdas(entrada: ReadonlyArray<{ natureza: NaturezaSimples; parcelas: readonly Parcela[] }>, apuradas: readonly AtividadeApurada[]): EspelhoAtividade[] {
  const grupos = new Map<string, EspelhoAtividade>();
  entrada.forEach((at, i) => {
    const ap = apuradas[i];
    for (const p of at.parcelas) {
      if (p.receitaCents === 0) continue;
      const qualificacoes = Object.fromEntries(p.excluir.filter((t) => QUALIFICACAO[t]).map((t) => [t, QUALIFICACAO[t] as string]));
      let item: EspelhoAtividade['item'];
      let atividade: string;
      let detalhe: string;
      if (at.natureza === 'REVENDA') {
        item = '1';
        atividade = ITEM_REVENDA;
        detalhe = p.excluir.length > 0 ? COM_ST : SEM_ST;
      } else if (at.natureza === 'LOCACAO_MOVEL') {
        item = '5';
        atividade = ITEM_LOCACAO;
        detalhe = '';
      } else {
        item = '7';
        atividade = ITEM_SERVICO;
        detalhe = detalheServico(ap.anexo, ap.fatorR !== null, p.excluir.includes('ISS'));
      }
      const chave = `${item}|${detalhe}|${ap.anexo}`;
      const g = grupos.get(chave) ?? { item, atividade, detalhe, anexo: ap.anexo, receitaCents: 0, parcelas: [] };
      g.receitaCents += p.receitaCents;
      g.parcelas.push({ receitaCents: p.receitaCents, qualificacoes });
      grupos.set(chave, g);
    }
  });
  return [...grupos.values()].sort((a, b) => (a.item + a.detalhe < b.item + b.detalhe ? -1 : 1));
}
