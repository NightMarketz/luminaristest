import { z } from 'zod';
import { linhaLegalVigente, linhasEmVigor, type LinhaLegal } from '../../legalParameters/models/legalParameter';

/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF itens 1, 2, 3 e 7; Emenda 22/10 item 1) — vocabulário e leitura PURA das tabelas de
 * retenção na fonte. Guarda números e listas, nunca lógica (`R-motor-regras`); o cálculo das retenções é do PR-2.
 */

/** Chave da `RETENCAO` que o perfil escolhe (§5.1 `WithholdingProfile.naturezaServico`). */
export const NATUREZAS_SERVICO = [
  'SERVICO_PROFISSIONAL', // RIR/2018 art. 714
  'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', // RIR/2018 art. 716
  'COMISSAO_PROPAGANDA', // RIR/2018 art. 718
  'CESSAO_MAO_DE_OBRA', // Lei 8.212 art. 31
  'TRABALHO_NAO_ASSALARIADO_PF', // RIR/2018 art. 685 (F-RET-7 b)
  'OUTRO',
] as const;
export type NaturezaServico = (typeof NATUREZAS_SERVICO)[number];

/** Naturezas com alíquota própria de IRRF na `RETENCAO` (chave `IRRF`, discriminador = natureza). */
export const NATUREZAS_IRRF_ALIQUOTA = ['SERVICO_PROFISSIONAL', 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', 'COMISSAO_PROPAGANDA'] as const;

/** F-RET-5 (a) — regime da contraparte (`Counterparty.regimeTributario`). */
export const REGIMES_CONTRAPARTE = ['SIMPLES', 'MEI', 'PRESUMIDO', 'REAL', 'ARBITRADO', 'PF', 'COOPERATIVA', 'EXTERIOR'] as const;
export type RegimeContraparte = (typeof REGIMES_CONTRAPARTE)[number];

/** `TaxWithholding.tributo` (§5.1). */
export const TRIBUTOS_RETENCAO = ['IRRF', 'CSLL', 'COFINS', 'PIS', 'INSS', 'ISS'] as const;
export type TributoRetencao = (typeof TRIBUTOS_RETENCAO)[number];

/** Emenda 22/10 item 1 — o discriminador da `RETENCAO_CODIGO`, o mesmo das tabelas "R-4020"/"R-4010" da Reinf. */
export const DISCRIMINADORES_CODIGO = ['IRPJ', 'IRPF', 'CSLL', 'COFINS', 'PIS', 'AGREGADO', 'INSS'] as const;
export type DiscriminadorCodigo = (typeof DISCRIMINADORES_CODIGO)[number];

/** `RETENCAO` chave `CSRF` (Lei 10.833 art. 30; LC 214 art. 509 a partir de 2027). */
export const TRIBUTOS_CSRF = ['CSLL', 'COFINS', 'PIS'] as const;
/** `RETENCAO` chave `INSS` (Lei 8.212 art. 31; `CPRB` nasce DRAFT sem valor — P-RET-8). */
export const DISCRIMINADORES_INSS = ['CESSAO_MAO_DE_OBRA', 'CPRB'] as const;
/** `RETENCAO` chave `MINIMO`, em centavos: CSRF (art. 31 § 3º), DARF (Lei 9.430 art. 68) e IRRF por regime (RIR 785 I–II). */
export const DISCRIMINADORES_MINIMO = ['CSRF', 'DARF', 'IRRF_REAL', 'IRRF_PRESUMIDO', 'IRRF_ARBITRADO', 'IRRF_PF'] as const;

/** O código do INSS retido não é por natureza do rendimento: a linha usa a natureza do serviço como chave. */
export const CHAVE_CODIGO_INSS = 'CESSAO_MAO_DE_OBRA';

export const PERIODICIDADES_CODIGO = ['MENSAL', 'DECENDIAL', 'QUINZENAL', 'DIARIO'] as const;
export const CodigoRetencaoJson = z.object({ periodicidade: z.enum(PERIODICIDADES_CODIGO) }).strict();

/** Item 7 — forma do BRIEF da Reinf (F-REINF-5 a): os campos da Tabela 01 que os dois nós leem. */
export const NaturezaRendimentoJson = z
  .object({
    descricao: z.string().trim().min(1),
    grupo: z.number().int().min(10).max(99),
    declarante: z.enum(['PF', 'PJ', 'PF/PJ']),
    tributos: z.array(z.enum(['IR', 'CSLL', 'COFINS', 'PP', 'AGREGADO'])),
    tiposIsencao: z.array(z.string().regex(/^\d{1,2}$/)),
  })
  .strict();
export type NaturezaRendimento = z.infer<typeof NaturezaRendimentoJson>;

/** Item 3 — faixa da tabela progressiva mensal (Lei 11.482 art. 1º XII). `ateCents: null` = última faixa. */
export const FaixaIrrfPfJson = z
  .object({ ateCents: z.number().int().positive().nullable(), aliquotaBp: z.number().int().min(0).max(10_000), deduzirCents: z.number().int().min(0) })
  .strict();
/** Item 3 — redução mensal do art. 3º-A da Lei 9.250 (Lei 15.270/2025). */
export const ReducaoArt3AJson = z
  .object({
    limiteZeroCents: z.number().int().positive(),
    tetoCents: z.number().int().positive(),
    constanteCents: z.number().int().positive(),
    coeficienteMilionesimos: z.number().int().positive(),
  })
  .strict();
export const CHAVES_IRRF_PF_JSON = /^FAIXA_[1-9]$/;
export const CHAVES_IRRF_PF_INT = ['DEPENDENTE', 'DESCONTO_SIMPLIFICADO_BP'] as const;

const json = (l: LinhaLegal): unknown => (l.valorJson === null ? null : JSON.parse(l.valorJson));

/** Item 2 — aviso quando a linha do código está só em DRAFT (ou ausente): o cálculo não bloqueia, só o DARF fica sem grupo. */
export const AVISO_CODIGO_RECEITA_DRAFT = 'CODIGO_RECEITA_DRAFT';

/** `taxId` só dígitos: 11 = CPF, 14 = CNPJ, outro = desconhecido (BRIEF item 5: derivado, nunca coluna). */
export function taxIdKindDe(taxId: string | null | undefined): 'CPF' | 'CNPJ' | null {
  if (!taxId) return null;
  return taxId.length === 11 ? 'CPF' : taxId.length === 14 ? 'CNPJ' : null;
}

/**
 * Item 2 + Emenda 22/10 itens 1 e 3 — o discriminador da `RETENCAO_CODIGO` para o tributo da retenção:
 * - `IRRF` ⇒ `IRPJ` (beneficiário CNPJ) ou `IRPF` (CPF), pelo `taxId` — mapa determinístico, sem fork;
 * - `CSLL`/`COFINS`/`PIS` ⇒ `AGREGADO` enquanto a CSRF tem as três contribuições (há linha `RETENCAO` CSRF/COFINS vigente
 *   na data: Lei 10.833 art. 30, até 2026-12-31); depois, o próprio tributo (LC 214 art. 509, efeitos art. 544 III);
 * - `INSS` ⇒ `INSS`. `ISS` não tem código federal ⇒ `null`.
 */
export function discriminadorDoCodigo(
  linhas: readonly LinhaLegal[],
  tributo: TributoRetencao,
  beneficiarioKind: 'CPF' | 'CNPJ' | null,
  data: string,
): DiscriminadorCodigo | null {
  switch (tributo) {
    case 'IRRF':
      return beneficiarioKind === 'CPF' ? 'IRPF' : beneficiarioKind === 'CNPJ' ? 'IRPJ' : null;
    case 'CSLL':
    case 'COFINS':
    case 'PIS':
      return linhaLegalVigente(linhas, 'RETENCAO', 'CSRF', data, 'COFINS') ? 'AGREGADO' : tributo;
    case 'INSS':
      return 'INSS';
    case 'ISS':
      return null;
  }
}

/**
 * Item 2 — o código de receita (6 dígitos) da retenção. Sem linha PUBLISHED vigente ⇒ `codigo: null` + aviso
 * `CODIGO_RECEITA_DRAFT`: reter é obrigação, o código só agrupa o DARF, então o cálculo não bloqueia.
 */
export function codigoReceitaRetencao(
  linhas: readonly LinhaLegal[],
  e: { tributo: TributoRetencao; natRend: string | null; beneficiarioKind: 'CPF' | 'CNPJ' | null; data: string },
): { codigo: string | null; discriminador: DiscriminadorCodigo | null; aviso: string | null } {
  const discriminador = discriminadorDoCodigo(linhas, e.tributo, e.beneficiarioKind, e.data);
  if (discriminador === null) return { codigo: null, discriminador, aviso: e.tributo === 'ISS' ? null : AVISO_CODIGO_RECEITA_DRAFT };
  const chave = discriminador === 'INSS' ? CHAVE_CODIGO_INSS : e.natRend;
  const linha = chave ? linhaLegalVigente(linhas, 'RETENCAO_CODIGO', chave, e.data, discriminador) : undefined;
  return linha?.valorTexto ? { codigo: linha.valorTexto, discriminador, aviso: null } : { codigo: null, discriminador, aviso: AVISO_CODIGO_RECEITA_DRAFT };
}

/** Item 7 — a natureza do rendimento vigente na data (`undefined` = fora da Tabela 01 publicada). */
export function naturezaRendimentoVigente(linhas: readonly LinhaLegal[], natRend: string, data: string): NaturezaRendimento | undefined {
  const l = linhaLegalVigente(linhas, 'NATUREZA_RENDIMENTO', natRend, data);
  return l ? NaturezaRendimentoJson.parse(json(l)) : undefined;
}

// ─── Item 3 — IRRF de PF (F-RET-7 b; desenho no F-RET-17 a) ──────────────────────────────────────────────────────────

export interface FaixaIrrfPf {
  ateCents: bigint | null;
  aliquotaBp: number;
  deduzirCents: bigint;
}
export interface TabelaIrrfPf {
  faixas: FaixaIrrfPf[];
  /** `null` antes de 2026-01-01 (art. 3º-A). */
  reducao: { limiteZeroCents: bigint; tetoCents: bigint; constanteCents: bigint; coeficienteMilionesimos: bigint } | null;
  dependenteCents: bigint;
  descontoSimplificadoCents: bigint;
}

/** Arredondamento HALF_UP em centavo de `n / d` (n, d ≥ 0) — mesma regra do `pisCofinsCalc`. */
export function divHalfUp(n: bigint, d: bigint): bigint {
  return (n * 2n + d) / (2n * d);
}

/**
 * A tabela `IRRF_PF_MENSAL` vigente na `data` (o mês do pagamento): faixas ordenadas, redução, dependente e o desconto
 * simplificado em centavos (25% do teto da faixa zero — Lei 9.250 art. 4º § 2º). Sem faixas ou sem dependente/desconto ⇒
 * `undefined` (o chamador traduz em `PARAMETRO_LEGAL_AUSENTE`).
 */
export function tabelaIrrfPfDe(linhas: readonly LinhaLegal[], data: string): TabelaIrrfPf | undefined {
  const vigentes = linhasEmVigor(linhas).filter(
    (l) => l.tabela === 'IRRF_PF_MENSAL' && l.vigenteDesde <= data && (l.vigenteAte === null || data <= l.vigenteAte),
  );
  const ultima = (chave: string) => vigentes.filter((l) => l.chave === chave).sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1))[0];
  const chavesFaixa = [...new Set(vigentes.map((l) => l.chave).filter((c) => CHAVES_IRRF_PF_JSON.test(c)))].sort();
  const faixas = chavesFaixa.map((c) => {
    const f = FaixaIrrfPfJson.parse(json(ultima(c)));
    return { ateCents: f.ateCents === null ? null : BigInt(f.ateCents), aliquotaBp: f.aliquotaBp, deduzirCents: BigInt(f.deduzirCents) };
  });
  const dep = ultima('DEPENDENTE');
  const desc = ultima('DESCONTO_SIMPLIFICADO_BP');
  if (faixas.length === 0 || !dep?.valorInt || desc?.valorInt == null) return undefined;
  const red = ultima('REDUCAO_ART3A');
  const r = red ? ReducaoArt3AJson.parse(json(red)) : null;
  const tetoZero = faixas[0].ateCents ?? 0n;
  return {
    faixas,
    reducao: r
      ? { limiteZeroCents: BigInt(r.limiteZeroCents), tetoCents: BigInt(r.tetoCents), constanteCents: BigInt(r.constanteCents), coeficienteMilionesimos: BigInt(r.coeficienteMilionesimos) }
      : null,
    dependenteCents: BigInt(dep.valorInt),
    descontoSimplificadoCents: divHalfUp(tetoZero * BigInt(desc.valorInt), 10_000n),
  };
}

/** Lei 11.482 art. 1º XII — imposto da base pela faixa: base × alíquota − parcela a deduzir (HALF_UP), nunca negativo. */
export function impostoPelaTabela(baseCents: bigint, t: Pick<TabelaIrrfPf, 'faixas'>): bigint {
  if (baseCents <= 0n) return 0n;
  const faixa = t.faixas.find((f) => f.ateCents === null || baseCents <= f.ateCents) ?? t.faixas[t.faixas.length - 1];
  const ir = divHalfUp(baseCents * BigInt(faixa.aliquotaBp), 10_000n) - faixa.deduzirCents;
  return ir > 0n ? ir : 0n;
}

/**
 * Lei 9.250 art. 3º-A (Lei 15.270/2025) — redução sobre os RENDIMENTOS tributáveis do mês: até o limite zero o imposto
 * zera; até o teto, constante − coeficiente × rendimento (HALF_UP); acima do teto, nada (§ 2º). Limitada ao imposto (§ 1º).
 */
export function reducaoArt3A(rendimentoCents: bigint, impostoCents: bigint, t: Pick<TabelaIrrfPf, 'reducao'>): bigint {
  const r = t.reducao;
  if (!r || impostoCents <= 0n) return 0n;
  if (rendimentoCents <= r.limiteZeroCents) return impostoCents;
  if (rendimentoCents > r.tetoCents) return 0n;
  const linear = r.constanteCents - divHalfUp(rendimentoCents * r.coeficienteMilionesimos, 1_000_000n);
  const reducao = linear > 0n ? linear : 0n;
  return reducao < impostoCents ? reducao : impostoCents;
}
