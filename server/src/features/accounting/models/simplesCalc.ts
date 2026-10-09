/**
 * BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF itens 4–9) — cálculo PURO do Simples Nacional ME/EPP: RBT12, fator R,
 * alíquota efetiva, repartição, teto do ISS e segregação. Sem banco, sem relógio: recebe a fotografia das linhas
 * `legal_parameters` (tabelas `SIMPLES_*`, carregadas por `scripts/gen-simples-anexos.mjs`) e o histórico de receita.
 *
 * Aritmética exata em racionais de BigInt (centavos × pontos-base); arredonda só o valor final, half-up a centavo.
 * Regra de arredondamento: LC 123 art. 18 § 1º-B II — "eventual diferença centesimal entre o total dos percentuais e a
 * alíquota efetiva será transferida para o tributo com maior percentual de repartição". Aplicada ao valor: o total de
 * cada parcela é arredondado uma vez e o resíduo dos tributos arredondados vai para o de maior percentual.
 */
import { z } from 'zod';
import { AtividadeSemAnexoError, SimplesRegraNaoRegulamentadaError } from '../../../lib/errors';
import { linhaLegalVigente, type LinhaLegal } from '../../legalParameters/models/legalParameter';

export const TRIBUTOS_SIMPLES = [
  'IRPJ',
  'CSLL',
  'COFINS',
  'PIS',
  'CBS',
  'IBS',
  'CPP',
  'ICMS',
  'ISS',
  'IPI',
] as const;
export type TributoSimples = (typeof TRIBUTOS_SIMPLES)[number];
export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';
/** PARCERIA_GESTAO = cota-parte do salão a título de gestão (Lei 12.592 art. 1º-A § 4º; F-SN-12 → b: Anexo III). */
export type NaturezaSimples = 'SERVICO' | 'REVENDA' | 'LOCACAO_MOVEL' | 'PARCERIA_GESTAO';

// ---- contrato de entrada 1: o valorJson das tabelas (materializado; o teste parseia todas as linhas da semente) ----

const tributo = z.enum(TRIBUTOS_SIMPLES);
const bp = z.number().int().min(0).max(10000);
const centavos = z.number().int().min(0);
export const FaixaJsonSchema = z
  .object({ receitaAteCents: centavos, aliquotaNominalBp: bp, parcelaDeduzirCents: centavos })
  .strict();
export const ReparticaoJsonSchema = z
  .partialRecord(tributo, bp)
  .refine((r) => Object.keys(r).length > 0, 'repartição vazia');
export const TetoIssJsonSchema = z
  .object({
    percentualBp: bp,
    limiarAliquotaEfetiva: z.string().regex(/^\d+(\.\d+)?$/),
    transfereAIbs: z.boolean(),
    transferencia: z.partialRecord(tributo, bp),
  })
  .strict();
export const EnquadramentoJsonSchema = z
  .object({ anexo: z.enum(['I', 'II', 'III', 'IV', 'V']), fatorR: z.boolean(), semIss: z.boolean() })
  .strict();

// ---- contrato de entrada 2: o que o chamador entrega ----

const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const MesReceitaSchema = z
  .object({ competencia, receitaBrutaCents: centavos, folhaCents: centavos.nullable().optional() })
  .strict();
export type MesReceita = z.infer<typeof MesReceitaSchema>;

/** Uma parcela da receita da atividade e os tributos que ela NÃO recolhe no DAS (LC 123 art. 18 §§ 4º-A, 12). */
export const ParcelaSchema = z.object({ receitaCents: centavos, excluir: z.array(tributo) }).strict();
export type Parcela = z.infer<typeof ParcelaSchema>;

export const AtividadeInputSchema = z
  .object({
    natureza: z.enum(['SERVICO', 'REVENDA', 'LOCACAO_MOVEL', 'PARCERIA_GESTAO']),
    cTribNac: z
      .string()
      .regex(/^\d{6}$/)
      .nullable(),
    /** A soma das parcelas é a receita da atividade no mês. */
    parcelas: z.array(ParcelaSchema).min(1),
  })
  .strict();
export type AtividadeInput = z.infer<typeof AtividadeInputSchema>;

export const ApuracaoInputSchema = z
  .object({
    competencia,
    historico: z.array(MesReceitaSchema),
    /** Mês de início de atividade (null = antes da janela). */
    inicioAtividade: competencia.nullable(),
    /** Receita bruta total do PA — usada só no mês de início (Res. CGSN 140 art. 22 § 2º; art. 26 § 6º). */
    receitaPaCents: centavos,
    folhaPaCents: centavos,
    /** Sublimite do art. 13-A excedido: ICMS/ISS (e IBS a partir de 2027) saem do DAS. */
    sublimiteExcedido: z.boolean(),
    atividades: z.array(AtividadeInputSchema).min(1),
  })
  .strict();
export type ApuracaoInput = z.infer<typeof ApuracaoInputSchema>;

/**
 * Item 8 — o que cada segregação do § 4º-A tira do DAS (§ 12; Res. CGSN 140 art. 25 §§ 7º–8º). ISS devido a outro
 * município (§ 4º-A V) NÃO sai: "quando será recolhido no Simples Nacional" — só muda o destinatário.
 * A partir de 2027 a repartição não tem PIS/COFINS; o monofásico de CBS é por produto (LC 214) e entra pela parcela.
 */
export const SEGREGACAO_EXCLUI = {
  monofasico: ['PIS', 'COFINS'],
  icmsSt: ['ICMS'],
  issRetido: ['ISS'],
  issOutroMunicipio: [],
} as const satisfies Record<string, readonly TributoSimples[]>;

// ---- contrato de saída ----

export interface AtividadeApurada {
  anexo: AnexoSimples;
  natureza: NaturezaSimples;
  cTribNac: string | null;
  receitaCents: number;
  faixa: number;
  aliquotaNominal: string; // percentual, 2 casas
  parcelaDeduzirCents: number;
  aliquotaEfetiva: string; // percentual, 4 casas (half-up; o cálculo usa o racional exato)
  fatorR: string | null; // razão, 4 casas — só para atividade sujeita ao fator R
  tributos: Partial<Record<TributoSimples, number>>;
  /**
   * X14 PR-4 (item 29): percentual efetivo de cada tributo sobre a receita da atividade (alíquota efetiva × repartição,
   * já com teto do ISS e sublimite), 4 casas. É o que a retenção do ISS (LC 123 art. 21 § 4º I) e o crédito do adquirente
   * (art. 23 § 2º, red. 2027) leem.
   */
  percentuais: Partial<Record<TributoSimples, string>>;
}
export interface ApuracaoCalculada {
  competencia: string;
  regime: 'SIMPLES';
  rbt12Cents: number;
  janelaRbt12: Janela;
  mesesFaltantes: string[];
  atividades: AtividadeApurada[];
  totalCalculadoCents: number;
  tabela: Array<{ legalParameterId: string; fonte: string; vigenteDesde: string }>;
}

// ---- aritmética racional ----

type Q = { n: bigint; d: bigint };
const q = (n: bigint, d: bigint = 1n): Q => (d < 0n ? { n: -n, d: -d } : { n, d });
const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q): Q => add(a, q(-b.n, b.d));
const cmp = (a: Q, b: Q): number => {
  const x = a.n * b.d - b.n * a.d;
  return x === 0n ? 0 : x > 0n ? 1 : -1;
};
/** Half-up para inteiro (valores ≥ 0). */
const arred = (a: Q): bigint => (2n * a.n + a.d) / (2n * a.d);
const BP = (v: number): Q => q(BigInt(v), 10000n);
const decimal = (a: Q, casas: number): string => {
  const e = 10n ** BigInt(casas);
  const v = arred(mul(a, q(e)))
    .toString()
    .padStart(casas + 1, '0');
  return `${v.slice(0, -casas)}.${v.slice(-casas)}`;
};

// ---- item 5: RBT12 ----

export interface Janela {
  de: string;
  ate: string;
  regra: 'LC123-art18-§1' | 'LC214-art517';
}
/** Primeiro PA em que vale a redação da LC 214 (art. 517; efeitos pelo art. 544 III). */
export const INICIO_LC214 = '2027-01';

const somaMeses = (comp: string, delta: number): string => {
  const [a, m] = comp.split('-').map(Number);
  const t = a * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/**
 * Até 2026: os 12 meses anteriores ao PA (LC 123 art. 18 § 1º; Res. CGSN 140 art. 22 § 1º). A partir de 2027: os 12
 * meses antecedentes ao mês anterior ao PA (red. LC 214 art. 517).
 */
export function janelaRbt12(comp: string): Janela {
  return comp < INICIO_LC214
    ? { de: somaMeses(comp, -12), ate: somaMeses(comp, -1), regra: 'LC123-art18-§1' }
    : { de: somaMeses(comp, -13), ate: somaMeses(comp, -2), regra: 'LC214-art517' };
}

export interface Rbt12 {
  /** Para a alíquota: RBT12 = 0 conta como R$ 1,00 (Res. CGSN 140 art. 21 p.ú.). */
  valor: Q;
  cents: number;
  janela: Janela;
  metodo: 'ACUMULADO' | 'INICIO_PRIMEIRO_MES' | 'INICIO_MEDIA';
  mesesFaltantes: string[];
  /** Meses da janela que entram (os de atividade). */
  meses: string[];
}

export function rbt12(
  historico: readonly MesReceita[],
  comp: string,
  inicioAtividade: string | null,
  receitaPaCents: number,
): Rbt12 {
  const janela = janelaRbt12(comp);
  const todos: string[] = [];
  for (let m = janela.de; m <= janela.ate; m = somaMeses(m, 1)) todos.push(m);
  const meses = inicioAtividade ? todos.filter((m) => m >= inicioAtividade) : todos;
  const porMes = new Map(historico.map((h) => [h.competencia, h]));
  const mesesFaltantes = meses.filter((m) => !porMes.has(m));
  const soma = meses.reduce((s, m) => s + BigInt(porMes.get(m)?.receitaBrutaCents ?? 0), 0n);

  let valor: Q;
  let metodo: Rbt12['metodo'] = 'ACUMULADO';
  if (inicioAtividade && inicioAtividade > janela.de) {
    // Res. CGSN 140 art. 22 §§ 2º–4º: no 1º mês, a receita do PA × 12; depois, a média dos meses anteriores × 12.
    if (janela.regra === 'LC214-art517') {
      throw new SimplesRegraNaoRegulamentadaError(
        `RBT12 de início de atividade em ${comp}: a janela de 2027 (LC 214 art. 517) não tem a regra de início regulamentada (Res. CGSN posterior à 183 não lida)`,
      );
    }
    if (meses.length === 0) {
      valor = q(BigInt(receitaPaCents) * 12n);
      metodo = 'INICIO_PRIMEIRO_MES';
    } else {
      valor = q(soma * 12n, BigInt(meses.length));
      metodo = 'INICIO_MEDIA';
    }
  } else {
    valor = q(soma);
  }
  const cents = Number(arred(valor));
  if (valor.n === 0n) valor = q(100n);
  return { valor, cents, janela, metodo, mesesFaltantes, meses };
}

// ---- item 7: fator R ----

const R28 = q(28n, 100n);
const R01 = q(1n, 100n);

/**
 * Res. CGSN 140 art. 26 (LC 123 art. 18 §§ 5º-J, 5º-K, 5º-M, 24): r = FS12 / RBT12r na mesma janela do RBT12 (a
 * anualização do § 4º multiplica os dois termos pelo mesmo fator, então a razão é a das somas). No mês de início, r =
 * FSPA / RPAr (§ 6º). Casos de zero: §§ 6º e 7º. r ≥ 0,28 → Anexo III; senão Anexo V.
 */
export function fatorR(
  historico: readonly MesReceita[],
  base: Rbt12,
  receitaPaCents: number,
  folhaPaCents: number,
): Q {
  let fs: bigint;
  let rb: bigint;
  if (base.metodo === 'INICIO_PRIMEIRO_MES') {
    fs = BigInt(folhaPaCents);
    rb = BigInt(receitaPaCents);
    if (fs > 0n && rb === 0n) return R28;
    if (rb > 0n && fs === 0n) return R01;
    if (rb === 0n) return R01; // ambos zero: o § 6º não prevê; sem receita no PA não há o que tributar, o anexo é indiferente
  } else {
    const porMes = new Map(historico.map((h) => [h.competencia, h]));
    fs = base.meses.reduce((s, m) => s + BigInt(porMes.get(m)?.folhaCents ?? 0), 0n);
    rb = base.meses.reduce((s, m) => s + BigInt(porMes.get(m)?.receitaBrutaCents ?? 0), 0n);
    if (fs === 0n) return R01;
    if (rb === 0n) return R28;
  }
  return q(fs, rb);
}

// ---- leitura das tabelas ----

interface Usada {
  id: string;
  fonte: string;
  vigenteDesde: string;
}
function linha<T>(
  linhas: readonly LinhaLegal[],
  tabela: string,
  chave: string,
  data: string,
  disc: string | null,
  schema: z.ZodType<T>,
  usadas: Map<string, Usada>,
): T | undefined {
  const l = linhaLegalVigente(linhas, tabela, chave, data, disc);
  if (!l) return undefined;
  usadas.set(l.id, { id: l.id, fonte: l.fonte, vigenteDesde: l.vigenteDesde });
  return schema.parse(JSON.parse(l.valorJson ?? 'null'));
}
function exigir<T>(v: T | undefined, o_que: string): T {
  if (v === undefined) throw new Error(`simplesCalc: sem linha vigente de ${o_que}`);
  return v;
}

// ---- itens 4, 6 e 8: apuração ----

/** Tributos fora do DAS com o sublimite excedido (art. 13-A; IBS a partir de 2027, red. LC 214 art. 517). */
const SUBLIMITE: Record<Janela['regra'], readonly TributoSimples[]> = {
  'LC123-art18-§1': ['ICMS', 'ISS'],
  'LC214-art517': ['ICMS', 'ISS', 'IBS'],
};

export function apurar(entrada: ApuracaoInput, linhas: readonly LinhaLegal[]): ApuracaoCalculada {
  const input = ApuracaoInputSchema.parse(entrada);
  const data = `${input.competencia}-01`;
  const usadas = new Map<string, Usada>();
  const base = rbt12(input.historico, input.competencia, input.inicioAtividade, input.receitaPaCents);
  const sublimite = SUBLIMITE[base.janela.regra];

  const atividades = input.atividades.map((at): AtividadeApurada => {
    const chave = at.natureza === 'SERVICO' ? `SERVICO:${at.cTribNac ?? ''}` : at.natureza;
    const enq = linha(linhas, 'SIMPLES_ENQUADRAMENTO', chave, data, null, EnquadramentoJsonSchema, usadas);
    if (!enq)
      throw new AtividadeSemAnexoError(
        `atividade ${chave} sem anexo em SIMPLES_ENQUADRAMENTO vigente em ${data}`,
      );

    let anexo: AnexoSimples = enq.anexo;
    let r: Q | null = null;
    if (enq.fatorR) {
      r = fatorR(input.historico, base, input.receitaPaCents, input.folhaPaCents);
      anexo = cmp(r, R28) >= 0 ? 'III' : 'V';
    }

    const faixas = [1, 2, 3, 4, 5, 6].map((f) =>
      exigir(
        linha(linhas, 'SIMPLES_ANEXO_FAIXA', anexo, data, `F${f}`, FaixaJsonSchema, usadas),
        `faixa F${f} do Anexo ${anexo}`,
      ),
    );
    // Faixa pelo RBT12 (o R$ 1,00 do RBT12 zero cai na 1ª); acima da 6ª, a última (Res. CGSN 140 art. 22 § 5º).
    let faixa = faixas.findIndex((f) => cmp(base.valor, q(BigInt(f.receitaAteCents))) <= 0) + 1;
    if (faixa === 0) faixa = 6;
    const efetiva = (f: z.infer<typeof FaixaJsonSchema>): Q =>
      q(
        base.valor.n * BigInt(f.aliquotaNominalBp) - BigInt(f.parcelaDeduzirCents) * 10000n * base.valor.d,
        base.valor.n * 10000n,
      );
    const nominal = faixas[faixa - 1];
    const eff = efetiva(nominal);
    const rep = exigir(
      linha(linhas, 'SIMPLES_ANEXO_REPARTICAO', anexo, data, `F${faixa}`, ReparticaoJsonSchema, usadas),
      `repartição F${faixa} do Anexo ${anexo}`,
    );

    // Percentual efetivo de cada tributo = alíquota efetiva × repartição (LC 123 art. 18 § 1º-B; Res. CGSN 140 art. 21 III).
    const pct = new Map<TributoSimples, Q>();
    for (const [t, v] of Object.entries(rep) as Array<[TributoSimples, number]>) pct.set(t, mul(eff, BP(v)));

    // Res. CGSN 140 art. 21 III "b": RBT12 acima da 5ª faixa sem sublimite excedido — ICMS/ISS (e IBS) pela 5ª faixa.
    if (faixa === 6 && !input.sublimiteExcedido) {
      const rep5 = exigir(
        linha(linhas, 'SIMPLES_ANEXO_REPARTICAO', anexo, data, 'F5', ReparticaoJsonSchema, usadas),
        `repartição F5 do Anexo ${anexo}`,
      );
      const eff5 = efetiva(faixas[4]);
      for (const t of sublimite) if (rep5[t] !== undefined) pct.set(t, mul(eff5, BP(rep5[t] as number)));
    }
    if (input.sublimiteExcedido) for (const t of sublimite) pct.delete(t);

    // Locação de bem móvel: Anexo III "deduzida a parcela correspondente ao ISS" (art. 18 § 4º V) — ANTES do teto: a parcela
    // sai, não é transferida aos federais (review do PR-3, achado 6).
    if (enq.semIss) pct.delete('ISS');

    // Teto do ISS (art. 18 § 1º-B I): acima do teto, ISS = teto e a diferença vai pela tabela de transferência do anexo.
    const iss = pct.get('ISS');
    const teto = linha(linhas, 'SIMPLES_TETO_ISS', anexo, data, null, TetoIssJsonSchema, usadas);
    if (iss && teto && cmp(iss, BP(teto.percentualBp)) > 0) {
      if (faixa === 6) {
        // 6ª faixa (ISS pela fórmula da 5ª, Res. CGSN 140 art. 21 III "b"): a nota do anexo só traz a tabela da 5ª, então
        // vale o art. 21 III "a" literal — a diferença vai "aos tributos federais da mesma faixa", na proporção da
        // repartição da 6ª (X14 PR-3; a Focus NFe não trata o caso, dono 07/10: decide-se pela lei).
        const excesso = sub(iss, BP(teto.percentualBp));
        pct.set('ISS', BP(teto.percentualBp));
        const federais = (Object.entries(rep) as Array<[TributoSimples, number]>).filter(
          ([t]) => !sublimite.includes(t) && t !== 'ISS' && t !== 'ICMS',
        );
        const base = federais.reduce((s, [, v]) => s + v, 0);
        for (const [t, v] of federais)
          pct.set(t, add(pct.get(t) ?? q(0n), mul(excesso, q(BigInt(v), BigInt(base)))));
      } else if (faixa !== 5) {
        throw new SimplesRegraNaoRegulamentadaError(
          `teto do ISS excedido na ${faixa}ª faixa do Anexo ${anexo}: a nota do anexo só traz a repartição da 5ª faixa`,
        );
      } else {
        const excesso = sub(eff, BP(teto.percentualBp));
        for (const t of pct.keys()) if (t !== 'ISS') pct.delete(t);
        pct.set('ISS', BP(teto.percentualBp));
        for (const [t, v] of Object.entries(teto.transferencia) as Array<[TributoSimples, number]>)
          pct.set(t, mul(excesso, BP(v)));
      }
    }


    const tributos: Partial<Record<TributoSimples, number>> = {};
    let receita = 0;
    for (const p of at.parcelas) {
      receita += p.receitaCents;
      const R = q(BigInt(p.receitaCents));
      const inclusos = [...pct.entries()].filter(([t]) => !p.excluir.includes(t));
      if (inclusos.length === 0) continue;
      const valores = inclusos.map(([t, v]) => [t, arred(mul(R, v))] as const);
      const total = arred(
        mul(
          R,
          inclusos.reduce((s, [, v]) => add(s, v), q(0n)),
        ),
      );
      const residuo = total - valores.reduce((s, [, v]) => s + v, 0n);
      // § 1º-B II: o resíduo vai para o tributo de maior percentual (empate: o primeiro na ordem do anexo).
      const maior = inclusos.reduce((a, b) => (cmp(b[1], a[1]) > 0 ? b : a))[0];
      for (const [t, v] of valores)
        tributos[t] = (tributos[t] ?? 0) + Number(v + (t === maior ? residuo : 0n));
    }

    return {
      anexo,
      natureza: at.natureza,
      cTribNac: at.cTribNac,
      receitaCents: receita,
      faixa,
      aliquotaNominal: decimal(q(BigInt(nominal.aliquotaNominalBp), 100n), 2),
      parcelaDeduzirCents: nominal.parcelaDeduzirCents,
      aliquotaEfetiva: decimal(mul(eff, q(100n)), 4),
      fatorR: r ? decimal(r, 4) : null,
      tributos,
      percentuais: Object.fromEntries([...pct.entries()].map(([t, v]) => [t, decimal(mul(v, q(100n)), 4)])),
    };
  });

  const totalCalculadoCents = atividades.reduce(
    (s, a) => s + Object.values(a.tributos).reduce((x, v) => x + (v ?? 0), 0),
    0,
  );
  return {
    competencia: input.competencia,
    regime: 'SIMPLES',
    rbt12Cents: base.cents,
    janelaRbt12: base.janela,
    mesesFaltantes: base.mesesFaltantes,
    atividades,
    totalCalculadoCents,
    tabela: [...usadas.values()].map((u) => ({
      legalParameterId: u.id,
      fonte: u.fonte,
      vigenteDesde: u.vigenteDesde,
    })),
  };
}

// ---- X14 PR-4, item 25: SIMEI (valores fixos mensais do MEI) ----

/** O SIMEI recolhe CPP, ICMS e ISS em valor fixo (Res. CGSN 140 art. 101 I "b", II, III). */
export type TributoSimei = 'CPP' | 'ICMS' | 'ISS';
export interface ApuracaoSimei {
  competencia: string;
  regime: 'MEI';
  salarioMinimoCents: number;
  tributos: Partial<Record<TributoSimei, number>>;
  totalCalculadoCents: number;
  tabela: Array<{ legalParameterId: string; fonte: string; vigenteDesde: string }>;
}

/**
 * Res. CGSN 140 art. 101: DAS mensal do MEI = 5% do limite mínimo mensal do salário de contribuição (I "b", desde 05/2011)
 * + R$ 1,00 se contribuinte do ICMS (II) + R$ 5,00 se contribuinte do ISS (III), independentemente da receita do mês. O
 * enquadramento ICMS/ISS é o do Anexo XI declarado no perfil (§ 1º; fork L1, dono 08/10). Sem regra de arredondamento na
 * norma: half-up a centavo só no valor da CPP (regra silente nº 1 da nota de decisão). O transportador autônomo de cargas
 * (12%, alínea "c") está fora do BRIEF.
 */
export function apurarSimei(
  competencia: string,
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean },
  linhas: readonly LinhaLegal[],
): ApuracaoSimei {
  const data = `${competencia}-01`;
  const usadas = new Map<string, Usada>();
  const valor = (tabela: string, chave: string): number => {
    const l = linhaLegalVigente(linhas, tabela, chave, data);
    if (!l || l.valorInt === null || l.valorInt === undefined) throw new Error(`simplesCalc: sem linha vigente de ${tabela}/${chave} em ${data}`);
    usadas.set(l.id, { id: l.id, fonte: l.fonte, vigenteDesde: l.vigenteDesde });
    return Number(l.valorInt);
  };
  const salario = valor('SALARIO_MINIMO', 'NACIONAL');
  const tributos: Partial<Record<TributoSimei, number>> = {
    CPP: Number(arred(mul(q(BigInt(salario)), BP(valor('SIMEI_VALOR', 'CPP_PCT'))))),
  };
  if (enquadramento.contribuinteIcms) tributos.ICMS = valor('SIMEI_VALOR', 'ICMS');
  if (enquadramento.contribuinteIss) tributos.ISS = valor('SIMEI_VALOR', 'ISS');
  return {
    competencia,
    regime: 'MEI',
    salarioMinimoCents: salario,
    tributos,
    totalCalculadoCents: Object.values(tributos).reduce((s, v) => s + (v ?? 0), 0),
    tabela: [...usadas.values()].map((u) => ({ legalParameterId: u.id, fonte: u.fonte, vigenteDesde: u.vigenteDesde })),
  };
}
