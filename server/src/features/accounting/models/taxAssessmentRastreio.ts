import { z } from 'zod';
import type { MemoriaLinha } from './taxAssessmentCalc';

/**
 * BE-INCR-TAX-ASSESSMENT-C — EMENDA RASTREIO (BRIEF `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-EMENDA-RASTREIO-brief.md`
 * itens 1–5, contrato §2.1; forks F-RT-1..6 ratificados pelo dono em 03/11). A origem de cada linha da memória de cálculo,
 * montada e congelada na confirmação, gravada em `TaxAssessment.rastreio` (F-RT-4 b). `MemoriaLinhaSchema` não muda.
 * Puro: sem I/O — o serviço lê o razão e passa os movimentos e saldos.
 */

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const CENTAVOS = /^-?\d+$/;

/** Item 2 (F-RT-1 a) e item 3 (F-RT-2 a): uma conta analítica que alimentou a linha, na janela do cálculo. */
export const RastreioContaSchema = z
  .object({
    accountCode: z.string().min(1),
    accountName: z.string(),
    from: z.string().regex(DIA), // janela usada no cálculo
    to: z.string().regex(DIA),
    movimentoCents: z.string().regex(CENTAVOS),
    saldoFinalCents: z.string().regex(CENTAVOS).optional(), // F-RT-2: saldo no fim da janela, congelado
  })
  .strict();

export const ORIGEM_TIPOS = ['RAZAO', 'MEMORIA_ANTERIOR', 'PARAMETRO', 'INFORMADO', 'CALCULO'] as const;
export type OrigemTipo = (typeof ORIGEM_TIPOS)[number];

export const RastreioLinhaSchema = z
  .object({
    codigo: z.string().min(1), // = MemoriaLinha.codigo
    origemTipo: z.enum(ORIGEM_TIPOS),
    origemApuracaoId: z.string().optional(), // MEMORIA_ANTERIOR
    origemPeriodo: z.string().optional(), // MEMORIA_ANTERIOR: 'T01' | 'A03' …
    contas: z.array(RastreioContaSchema).optional(), // RAZAO
  })
  .strict();
export const RastreioApuracaoSchema = z.array(RastreioLinhaSchema);
export type RastreioConta = z.infer<typeof RastreioContaSchema>;
export type RastreioLinha = z.infer<typeof RastreioLinhaSchema>;
export type RastreioApuracao = z.infer<typeof RastreioApuracaoSchema>;

// ─── Classificação da linha (itens 2, 4, 5) ─────────────────────────────────────────────────────────────────────

/** Item 2: linhas cujo valor é o movimento de contas do razão (receita do Presumido/estimativa; LAIR do Real). */
const RAZAO = new Set(['RECEITA_SERVICO', 'RECEITA_REVENDA', 'RECEITA_NAO_USO', 'LAIR', 'LAIR_PERIODO_EM_CURSO']);
/**
 * Item 4: linha lida da memória de UMA apuração anterior — a sobra do trimestre imediatamente anterior (IN 2.305 art. 15
 * § 4º lê só o anterior). As linhas que SOMAM vários períodos (receita acumulada, Σ devido/retido/estimativas dos meses,
 * Σ excedentes) são `CALCULO`, com os períodos somados na descrição — dono, 03/11, achado A1 da revisão do #1013: um
 * ponteiro para a anterior não sustenta um acumulado que ela não carrega.
 */
const MEMORIA_ANTERIOR = new Set(['LC224_SOBRA_ANTERIOR']);
/** Item 5: o valor é (ou aplica) um coeficiente da tabela legal vigente — alíquota, adicional, limite, teto, prazo. */
const PARAMETRO = new Set([
  'ALIQUOTA',
  'ADICIONAL',
  'LC224_LIMITE_TRIMESTRE',
  'COMPENSACAO_TETO',
  'DIFERENCA_POSTERGADA_VENCIMENTO',
  'VENCIMENTO_QUOTA_UNICA',
]);
/** Item 5: o que o usuário informou — deduções, linhas do e-Lalur/e-Lacs, chaves do perfil fiscal. */
const INFORMADO = new Set(['ADICOES', 'EXCLUSOES', 'COMPENSACAO', 'LC224_SUSPENSO', 'GUARDA_CIRCULARIDADE']);
const DEDUCAO = /^DEDUCAO_\d+$/;
/** Linha de UM período anterior: a diferença postergada daquele período e a estimativa paga daquele mês. */
const DE_UM_PERIODO = /^(?:DIFERENCA_POSTERGADA|ESTIMATIVA_PAGA)_((?:T0[1-4])|(?:A(?:0[1-9]|1[0-2])))$/;

export function origemTipoDaLinha(l: MemoriaLinha): OrigemTipo {
  if (RAZAO.has(l.codigo)) return 'RAZAO';
  if (PARAMETRO.has(l.codigo)) return 'PARAMETRO';
  if (INFORMADO.has(l.codigo) || DEDUCAO.test(l.codigo)) return 'INFORMADO';
  if (MEMORIA_ANTERIOR.has(l.codigo)) return 'MEMORIA_ANTERIOR';
  const m = DE_UM_PERIODO.exec(l.codigo);
  if (m) {
    // `taxAssessmentCalcAnual` (ajuste anual): "paga (informada)" é o valor que o usuário informou; sem ele, o confirmado.
    return l.codigo.startsWith('ESTIMATIVA_PAGA_') && l.descricao.includes('(informada)') ? 'INFORMADO' : 'MEMORIA_ANTERIOR';
  }
  return 'CALCULO';
}

/**
 * F-RT-6 (a): a linha `CALCULO` diz a operação na descrição — um operador aritmético ou de comparação, `Σ`, `min(` ou
 * `max(`. O teste da emenda passa todas as memórias das funções puras por aqui.
 */
export const DESCRICAO_COM_OPERACAO = /[×÷+−=Σ≤≥<>]|min\(|max\(/;

// ─── Montagem e validação (itens 1–5) ───────────────────────────────────────────────────────────────────────────

/** Movimento de uma conta na janela do cálculo (o mesmo `groupByAccount` que o cálculo já fez — sem query nova). */
export interface MovimentoConta {
  accountId: string;
  accountCode: string;
  accountName: string;
  movimentoCents: bigint;
}

export interface ContextoRastreio {
  /** Janela do cálculo (date-only) e as contas de cada linha `RAZAO`, por código da linha. */
  razao: { from: string; to: string; contasPorCodigo: Record<string, MovimentoConta[]> };
  /** Item 3 (F-RT-2 a): saldo de cada conta no fim da janela, lido na confirmação. Ausente ⇒ sem `saldoFinalCents`. */
  saldoFinalPorConta?: ReadonlyMap<string, bigint>;
  /** Apurações confirmadas anteriores do MESMO tributo que o cálculo leu (F-TA-3 a). */
  anteriores: readonly { id: string; periodo: string }[];
}

/**
 * Uma entrada por código de linha da memória (item 1). `MEMORIA_ANTERIOR` aponta a apuração do período nomeado no código
 * (`DIFERENCA_POSTERGADA_T01`, `ESTIMATIVA_PAGA_A03`) ou, na sobra da LC 224, a imediatamente anterior.
 */
export function montarRastreio(memoria: readonly MemoriaLinha[], ctx: ContextoRastreio): RastreioApuracao {
  const anteriores = [...ctx.anteriores].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const imediata = anteriores[anteriores.length - 1];
  const vistos = new Set<string>();
  const out: RastreioApuracao = [];
  for (const l of memoria) {
    if (vistos.has(l.codigo)) continue;
    vistos.add(l.codigo);
    const origemTipo = origemTipoDaLinha(l);
    const entrada: RastreioLinha = { codigo: l.codigo, origemTipo };
    if (origemTipo === 'RAZAO') {
      entrada.contas = (ctx.razao.contasPorCodigo[l.codigo] ?? [])
        .filter((c) => c.movimentoCents !== 0n)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
        .map((c) => {
          const saldo = ctx.saldoFinalPorConta?.get(c.accountId);
          return {
            accountCode: c.accountCode,
            accountName: c.accountName,
            from: ctx.razao.from,
            to: ctx.razao.to,
            movimentoCents: c.movimentoCents.toString(),
            ...(saldo !== undefined ? { saldoFinalCents: saldo.toString() } : {}),
          };
        });
    } else if (origemTipo === 'MEMORIA_ANTERIOR') {
      const periodo = DE_UM_PERIODO.exec(l.codigo)?.[1];
      const origem = periodo ? anteriores.find((a) => a.periodo === periodo) : imediata;
      if (origem) {
        entrada.origemApuracaoId = origem.id;
        entrada.origemPeriodo = origem.periodo;
      }
    }
    out.push(entrada);
  }
  return out;
}

/** Item 1: rastreio inválido não é silenciado — erro sem classe HTTP ⇒ 500, com o motivo. */
export class RastreioInvalidoError extends Error {
  constructor(motivo: string) {
    super(`Rastreio da memória de cálculo inválido: ${motivo}.`);
    this.name = 'RastreioInvalidoError';
  }
}

/** Item 1: o rastreio passa no schema e cada `codigo` existe na memória que ele explica. */
export function validarRastreio(rastreio: unknown, memoria: readonly MemoriaLinha[]): RastreioApuracao {
  const parsed = RastreioApuracaoSchema.safeParse(rastreio);
  if (!parsed.success) throw new RastreioInvalidoError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const codigos = new Set(memoria.map((l) => l.codigo));
  const estranhos = parsed.data.filter((r) => !codigos.has(r.codigo)).map((r) => r.codigo);
  if (estranhos.length > 0) throw new RastreioInvalidoError(`código(s) ${estranhos.join(', ')} fora da memória`);
  return parsed.data;
}
