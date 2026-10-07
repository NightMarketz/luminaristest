/**
 * FixedAsset domain constants + fórmula pura de depreciação (BE-INCR-FIXED-ASSETS, nó C8).
 * PR-1 (execution-plan Passo 4) escreve isto cedo — junto do schema — porque é testável SEM banco;
 * `quotaCumulativa`/`lifeMonths` só ganham chamador real no `runMonth` do PR-3 (Bloco C).
 */
import { ValidationError } from '../../../lib/errors';
import { DepreciacaoAnexoJson } from '../../legalParameters/models/formatoLinha';
import { linhasVigentesDaTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export const FIXED_ASSET_STATUSES = ['PENDING_ACTIVATION', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED'] as const;
export type FixedAssetStatus = (typeof FIXED_ASSET_STATUSES)[number];

export const DEPRECIATION_RATE_SOURCES = [
  'ANEXO_III_IN_1700_2017',
  'ANEXO_III_NOTA_1',
  'ANEXO_III_NOTA_2',
  'CUSTOM',
] as const;
export type DepreciationRateSource = (typeof DEPRECIATION_RATE_SOURCES)[number];

/** Linhas ANEXO_* são imutáveis (parecer D4, BRIEF item 2) — só CUSTOM aceita edição/criação livre. */
export const isAnexoSource = (source: string): boolean => source !== 'CUSTOM';

/** Allowlist do PR-1 (Passo 5) — `depreciation_rate.created`/`.hidden` no `auditCanonical.ts`. */
export const DEPRECIATION_RATE_CREATED = 'depreciation_rate.created';
export const DEPRECIATION_RATE_HIDDEN = 'depreciation_rate.hidden';

/**
 * Quota ACUMULADA (não a do mês isolado) até o mês `k` desde a ativação, em `BigInt` de centavos —
 * `floor(base × bp × k ÷ 120000)`, onde `bp` é basis points anuais (10% = 1000) e 120000 =
 * 12 (meses) × 10000 (bp de 100%). A quota do mês N é `quotaCumulativa(k=N) − quotaCumulativa(k=N-1)`
 * (item 12/13, PR-3) — não faz parte desta função: aqui só a fórmula fechada, sem estado.
 *
 * Item 12 (BRIEF): `k=12`, `bp=1000` (10% a.a.) → `Σ12 = base × bp ÷ 10000` exato — sem resíduo.
 * Para taxas que não dividem 120000 exatamente (ex.: 33,3% → 3330 bp), a cumulativa ULTRAPASSA
 * `base` antes do fim da vida útil nominal (`lifeMonths`, abaixo) — o CAP (`min(cumulativa, base −
 * acumulado)`) é responsabilidade de quem chama (`runMonth`, PR-3), não desta função pura.
 */
export function quotaCumulativa(baseCents: bigint, annualRateBp: number, k: number): bigint {
  return (baseCents * BigInt(annualRateBp) * BigInt(k)) / 120000n;
}

/**
 * Nº de meses para a cumulativa nominal atingir 100% da base — `ceil(120000 ÷ bp)` (item 12,
 * [D4]): 120 para 10% a.a., 37 para 33,3% a.a. (a cumulativa em 37 meses já passa de 100%, daí o
 * cap no mês final). Usado pelo `runMonth` (PR-3) para decidir quando parar de chamar esta série.
 */
export function lifeMonths(annualRateBp: number): number {
  return Math.ceil(120000 / annualRateBp);
}

/** Só os campos que `resolveRateForNcm` lê — `DepreciationRate` inteiro não é necessário aqui. */
export interface NcmRateCandidate {
  id: string;
  ncm: string | null;
  annualRateBp: number;
}

/**
 * BE-INCR-LEGAL-PARAMS PR-3 (item 9, D-3; questionário do dono 07/10: "União no mesmo shape") — uma taxa do catálogo
 * como a rota de taxas a devolve, venha da PLATAFORMA (Anexo III, `legal_parameters`) ou do ESCOPO (CUSTOM,
 * `depreciation_rates`). `origem` diz qual coluna do bem a guarda: `legalParameterId` ou `rateId` (L-1).
 */
export interface TaxaDepreciacaoView {
  id: string;
  origem: 'PLATAFORMA' | 'ESCOPO';
  ncm: string | null;
  sourceRow: number | null;
  description: string;
  lifeYears: number;
  annualRateBp: number;
  source: string;
  sourceUrl: string | null;
  sourceSha256: string | null;
  justification: string | null;
  hiddenAt: string | null;
  createdAt: string;
}

/** Linha de plataforma com os campos que a view mostra além do lookup (`fonteUrl`/`fonteSha256`/`createdAt`). */
export type LinhaAnexoIII = LinhaLegal & { fonteUrl: string | null; fonteSha256: string | null; createdAt: Date };

/**
 * PR-3 — as linhas DEPRECIACAO_ANEXO_III em vigor na `data` como taxas do catálogo. `chave` = `sourceRow` (ou `NOTA`
 * nas 2 Notas, que não têm linha na fonte), `discriminador` = `source`, o resto no `valorJson` (formatoLinha.ts).
 */
export function taxasAnexoIII(linhas: readonly LinhaAnexoIII[], data: string): TaxaDepreciacaoView[] {
  return linhasVigentesDaTabela(linhas, 'DEPRECIACAO_ANEXO_III', data).map((l) => {
    const v = DepreciacaoAnexoJson.parse(JSON.parse(l.valorJson ?? 'null'));
    return {
      id: l.id,
      origem: 'PLATAFORMA',
      ncm: v.ncm,
      sourceRow: l.chave === 'NOTA' ? null : Number(l.chave),
      description: v.description,
      lifeYears: v.lifeYears,
      annualRateBp: v.annualRateBp,
      source: l.discriminador ?? '',
      sourceUrl: l.fonteUrl,
      sourceSha256: l.fonteSha256,
      justification: v.justification ?? null,
      hiddenAt: null,
      createdAt: l.createdAt.toISOString(),
    };
  });
}

/** PR-3 (L-1) — onde o bem grava a taxa escolhida: Anexo de plataforma ⇒ `legalParameterId`; CUSTOM ⇒ `rateId`. */
export interface TaxaEscolhida {
  rateId: string | null;
  legalParameterId: string | null;
  annualRateBp: number;
}

export const taxaEscolhidaDe = (t: Pick<TaxaDepreciacaoView, 'id' | 'origem' | 'annualRateBp'>): TaxaEscolhida =>
  t.origem === 'PLATAFORMA'
    ? { rateId: null, legalParameterId: t.id, annualRateBp: t.annualRateBp }
    : { rateId: t.id, legalParameterId: null, annualRateBp: t.annualRateBp };

/**
 * BE-INCR-FIXED-ASSETS PR-5 (fork "annualRateBp do rascunho", decisão do dono 23/09 + review
 * independente do PR #366, achado 2): deriva a taxa de depreciação do NCM de um item pelo Anexo
 * III. FUNÇÃO PURA — chamada tanto por `PayableService.resolveFixedAssetLines` (validação ANTES do
 * tx1 do Payable, achado 1 do review: a rejeição tem de acontecer antes de qualquer efeito, nunca
 * depois do `postEntry`) quanto por qualquer re-drive que precise repetir o MESMO casamento.
 *
 * Casa por PREFIXO normalizado (dígitos só — `DepreciationRate.ncm` tem granularidade variável, com
 * ou sem ponto: capítulo de 4 dígitos até subposição de 6; o NCM do item da NF-e vem com 8 dígitos
 * sem pontuação) e escolhe o(s) prefixo(s) MAIS ESPECÍFICO(S) (mais longos) entre os que batem.
 *
 * **Ambiguidade (achado 2 do review #366):** o Anexo III tem NCMs com MAIS DE UMA taxa distinta sob
 * o MESMO prefixo — ex. `8417` (fornos industriais, 10% a.a.) × `8417` (fornos para vidro, Nota 1,
 * 33,3% a.a.); `3926.90` tem duas subposições com taxas diferentes (correias 20%, artigos de
 * laboratório 10% — dígitos do exemplo do review). Quando os candidatos de MAIOR prefixo têm
 * `annualRateBp` DISTINTOS entre si, o casamento é ambíguo — rejeita loud (nunca escolhe um dos dois
 * em silêncio pela ordem do seed, a mesma disciplina de "nunca default 0"). Candidatos duplicados
 * com a MESMA taxa (linha repetida) não são ambíguos — o primeiro serve.
 */
export function resolveRateForNcm(
  rates: readonly NcmRateCandidate[],
  ncmRaw: string | undefined,
  itemLabel: string,
): { rateId: string; annualRateBp: number } {
  if (!ncmRaw || ncmRaw.trim() === '') {
    throw new ValidationError(
      `Item de imobilizado '${itemLabel}' sem NCM — não é possível derivar a taxa de depreciação pelo Anexo III.`,
    );
  }
  const targetDigits = ncmRaw.replace(/\D/g, '');
  let bestLen = -1;
  let candidates: NcmRateCandidate[] = [];
  for (const rate of rates) {
    if (!rate.ncm) continue;
    const prefixDigits = rate.ncm.replace(/\D/g, '');
    if (prefixDigits.length === 0 || !targetDigits.startsWith(prefixDigits)) continue;
    if (prefixDigits.length > bestLen) {
      bestLen = prefixDigits.length;
      candidates = [rate];
    } else if (prefixDigits.length === bestLen) {
      candidates.push(rate);
    }
  }
  if (candidates.length === 0) {
    throw new ValidationError(
      `Nenhuma taxa de depreciação do Anexo III casa com o NCM '${ncmRaw}' do item '${itemLabel}' — cadastre uma taxa CUSTOM (POST /api/accounting/depreciation-rates) antes de importar esta NF-e.`,
    );
  }
  const distinctRates = new Set(candidates.map((c) => c.annualRateBp));
  if (distinctRates.size > 1) {
    const options = candidates.map((c) => `${c.id} (${c.annualRateBp} bp)`).join(', ');
    throw new ValidationError(
      `NCM '${ncmRaw}' do item '${itemLabel}' casa com MAIS DE UMA taxa do Anexo III sob o mesmo prefixo (${options}) — cadastre uma taxa CUSTOM explícita (rateId) para este item, o sistema não escolhe por você.`,
    );
  }
  return { rateId: candidates[0].id, annualRateBp: candidates[0].annualRateBp };
}
