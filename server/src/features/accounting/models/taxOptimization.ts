import { createHash } from 'crypto';

/**
 * EFICIENCIA-FISCAL PR-1 (BRIEF BE-INCR-EFICIENCIA-FISCAL itens 5, 7, 8; ADR-INCR-EFICIENCIA-FISCAL D3) — vocabulário e
 * regras PURAS da política de eficiência fiscal e das sugestões.
 */

export const TAX_PRACTICES = [
  'CRITERIO_CARGA',
  'COMBO_DESCONTO_ALOCADO',
  'PRINCIPAL_ACESSORIO',
  'SEGREGACAO_NCM',
  'FATOR_R_FOLHA',
  'TROCA_DE_REGIME',
  'REMUNERACAO_SOCIO',
  'SALAO_PARCEIRO_CONTRATO',
  'SUBLIMITE',
  'INTERDEPENDENCIA',
  'RETENCAO_SOFRIDA',
  'CREDITO_NAO_TOMADO',
  'PRESUNCAO_HOSPITALAR',
  'ISS_UNIPROFISSIONAL',
  'NFSE_PACOTE_POR_CONSUMO',
  'NBS_SAUDE_2027',
  'ENQUADRAMENTO_SERVICO',
] as const;
export type TaxPractice = (typeof TAX_PRACTICES)[number];

export const SUGGESTION_PROPOSED = 'tax.suggestion.proposed';
export const SUGGESTION_ACCEPTED = 'tax.suggestion.accepted';
export const SUGGESTION_REJECTED = 'tax.suggestion.rejected';
export const POLICY_UPDATED = 'tax.policy.updated';
export const SERVICE_COST_CREATED = 'tax.policy.service_cost_created';
export const SERVICE_COST_DELETED = 'tax.policy.service_cost_deleted';
export const FISCAL_GUARD_BLOCKED = 'sale.fiscal_guard.blocked';

export const SYSTEM_PROPOSER = 'SYSTEM';

/** Base legal da troca para CARGA (item 8: L7/L8/L17), copiada do ADR §3 — nunca texto livre. */
export const CRITERIO_CARGA_LEGAL_BASIS = [
  { norma: 'LC 214/2025', artigo: 'art. 12 § 2º III e § 3º (L7)' },
  { norma: 'LC 123/2006', artigo: 'art. 3º § 1º (L8)' },
  { norma: 'LC 87/1996', artigo: 'art. 13 I (L17)' },
] as const;

export const PRINCIPAL_ACESSORIO_DESDE = '2027-01-01';

export interface PoliticaVigente {
  id: string | null;
  criterioAlocacao: 'PROPORCIONAL_CATALOGO' | 'CARGA_TRIBUTARIA';
  pisoServico: 'CUSTO_INFORMADO' | 'CATALOGO_MINIMO' | 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL';
  aprovador: string;
  severidadePisoProporcional: 'WARN' | 'BLOCK';
  vigenteDesde: string | null;
  vigenteAte: string | null;
}

/** Sem versão gravada: os padrões do BRIEF §4.1 (PROPORCIONAL — triagem 21/10; F-EF-1 a; F-EF-3 a; F-EF-14 a). */
export const POLITICA_PADRAO: PoliticaVigente = {
  id: null,
  criterioAlocacao: 'PROPORCIONAL_CATALOGO',
  pisoServico: 'CUSTO_INFORMADO',
  aprovador: 'CONTADOR_SENAO_ADMIN',
  severidadePisoProporcional: 'WARN',
  vigenteDesde: null,
  vigenteAte: null,
};

interface LinhaVigencia {
  vigenteDesde: string;
  vigenteAte: string | null;
}

/** A linha vigente na data: vigenteDesde ≤ data ≤ vigenteAte (aberta = sem fim); a de início mais recente vence. */
export function vigenteEm<T extends LinhaVigencia>(linhas: readonly T[], data: string): T | null {
  const vivas = linhas.filter((l) => l.vigenteDesde <= data && (l.vigenteAte === null || data <= l.vigenteAte));
  return vivas.length === 0 ? null : vivas.reduce((a, b) => (b.vigenteDesde >= a.vigenteDesde ? b : a));
}

/** JSON canônico (chaves ordenadas; bigint como string) → sha256 — `parametrosSha256` (I-10). */
export function canonicalSha256(value: unknown): string {
  const canon = (v: unknown): unknown => {
    if (typeof v === 'bigint') return v.toString();
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return createHash('sha256').update(JSON.stringify(canon(value))).digest('hex');
}

/**
 * Item 10 / I-7 — natureza fiscal de um item de kit: a do principal só com sugestão PRINCIPAL_ACESSORIO ACEITA para o kit
 * e só a partir de 2027 (LC 214 art. 7º II e § 2º); senão, a própria.
 */
export function naturezaDoItemDoKit<N extends string>(propria: N, principal: N | null, principalAceito: boolean, data: string): N {
  return principalAceito && principal !== null && data >= PRINCIPAL_ACESSORIO_DESDE ? principal : propria;
}
