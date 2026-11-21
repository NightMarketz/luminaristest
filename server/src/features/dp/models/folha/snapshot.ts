/**
 * Snapshot da folha — BE-INCR-DP-F2 itens 27–29 e §3.2 (PR-3).
 *
 * O snapshot é a entrada inteira do motor (PR-4): tudo o que o cálculo de uma competência lê, guardado como JSON e com
 * hash (F-DP-8: "o cálculo antigo se reproduz pelo snapshot gravado"). O schema Zod abaixo é o contrato da forma
 * serializada (dinheiro em string decimal), e é ele que a reprodução do item 53 relê.
 *
 * Leituras do PR-3 sobre o esboço do §3.2 (o texto de outro item obriga o campo; cédula
 * `D-2026-11-21-PES4-F2-PR3-PR4-LACUNAS`): `unitId` no vínculo e feriados por unidade; `discriminador` no `cct` (piso por
 * `cargoId`, G7); `ordem` e `categoriaOutraFonte` em `outrasRemuneracoes` (item 78); `id` em lançamento, afastamento e
 * parâmetro da CCT (item 28 ordena por id); parâmetro ou regra ausente vira ausência nomeada, para o motor puro emitir
 * `PARAMETRO_LEGAL_AUSENTE` por vínculo (item 61 b) em vez de a montagem abortar.
 *
 * PII (item 29, D-7): o snapshot guarda `trabalhadorId` e a idade já calculada, nunca nome, CPF nem nascimento.
 */
import { createHash } from 'crypto';
import { z } from 'zod';
import { DIAS_SEMANA, FOLHA_REGRA_CHAVES_TEXTO } from '../../../legalParameters/models/formatoLinha';
import { SemLinhaVigenteError } from '../../../legalParameters/models/legalParameter';
import { CompetenciaSchema } from '../competencia';
import { dpModuleKeySchema } from '../moduleRegistry';
import type { ParametrosFolha } from '../parametrosFolha';
import type { RegrasFolha } from '../regrasFolha';
import { CATEGORIAS_NUCLEO } from '../vinculo';

export const DP_SNAPSHOT_VERSAO_FORMATO = 1 as const;
export const ROTEIROS = ['MENSAL', 'ADIANTAMENTO'] as const;
export type Roteiro = (typeof ROTEIROS)[number];

const Cents = z.string().regex(/^-?\d+$/, 'centavos em string decimal');
const DataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const Int = z.number().int();

/** Parâmetro ou regra que a fotografia não tem na data: o motor emite `PARAMETRO_LEGAL_AUSENTE` com estes dados. */
export const AusenciaSchema = z.object({ tabela: z.string(), chave: z.string().nullable(), data: DataSchema }).strict();
export type Ausencia = z.infer<typeof AusenciaSchema>;
const ouAusente = <T extends z.ZodTypeAny>(valor: T) =>
  z.union([z.object({ ok: z.literal(true), valor }).strict(), z.object({ ok: z.literal(false), ausente: AusenciaSchema }).strict()]);

// ── Parâmetros legais (G2) na forma serializada ─────────────────────────────────────────────────────────────────────
const ParametrosFolhaJsonSchema = z
  .object({
    inssEmpregado: z.array(z.object({ ateCents: Cents.nullable(), aliquotaBp: Int }).strict()),
    tetoRgpsCents: Cents,
    fgtsBp: Int,
    fgtsAprendizBp: Int,
    ciSeguradoBp: Int,
    patronalBp: Int,
    salarioMinimoCents: Cents,
    irrf: z
      .object({
        faixas: z.array(z.object({ ateCents: Cents.nullable(), aliquotaBp: Int, deduzirCents: Cents }).strict()),
        reducaoArt3A: z.object({ limiteZeroCents: Cents, tetoCents: Cents, constanteCents: Cents, coeficienteMilionesimos: Cents }).strict().nullable(),
        dependenteCents: Cents,
        descontoSimplificadoBp: Int,
      })
      .strict(),
  })
  .strict();
export type ParametrosFolhaJson = z.infer<typeof ParametrosFolhaJsonSchema>;

const s = (v: bigint) => v.toString();
const sn = (v: bigint | null) => (v === null ? null : v.toString());
const b = (v: string) => BigInt(v);
const bn = (v: string | null) => (v === null ? null : BigInt(v));

export function parametrosParaJson(p: ParametrosFolha): ParametrosFolhaJson {
  const r = p.irrf.reducaoArt3A;
  return {
    inssEmpregado: p.inssEmpregado.map((f) => ({ ateCents: sn(f.ateCents), aliquotaBp: f.aliquotaBp })),
    tetoRgpsCents: s(p.tetoRgpsCents),
    fgtsBp: p.fgtsBp,
    fgtsAprendizBp: p.fgtsAprendizBp,
    ciSeguradoBp: p.ciSeguradoBp,
    patronalBp: p.patronalBp,
    salarioMinimoCents: s(p.salarioMinimoCents),
    irrf: {
      faixas: p.irrf.faixas.map((f) => ({ ateCents: sn(f.ateCents), aliquotaBp: f.aliquotaBp, deduzirCents: s(f.deduzirCents) })),
      reducaoArt3A: r && { limiteZeroCents: s(r.limiteZeroCents), tetoCents: s(r.tetoCents), constanteCents: s(r.constanteCents), coeficienteMilionesimos: s(r.coeficienteMilionesimos) },
      dependenteCents: s(p.irrf.dependenteCents),
      descontoSimplificadoBp: p.irrf.descontoSimplificadoBp,
    },
  };
}

/** Volta da forma serializada para o tipo do leitor (`parametrosFolha`), sem perda (teste de ida e volta). */
export function parametrosDeJson(j: ParametrosFolhaJson): ParametrosFolha {
  const r = j.irrf.reducaoArt3A;
  return {
    inssEmpregado: j.inssEmpregado.map((f) => ({ ateCents: bn(f.ateCents), aliquotaBp: f.aliquotaBp })),
    tetoRgpsCents: b(j.tetoRgpsCents),
    fgtsBp: j.fgtsBp,
    fgtsAprendizBp: j.fgtsAprendizBp,
    ciSeguradoBp: j.ciSeguradoBp,
    patronalBp: j.patronalBp,
    salarioMinimoCents: b(j.salarioMinimoCents),
    irrf: {
      faixas: j.irrf.faixas.map((f) => ({ ateCents: bn(f.ateCents), aliquotaBp: f.aliquotaBp, deduzirCents: b(f.deduzirCents) })),
      reducaoArt3A: r && { limiteZeroCents: b(r.limiteZeroCents), tetoCents: b(r.tetoCents), constanteCents: b(r.constanteCents), coeficienteMilionesimos: b(r.coeficienteMilionesimos) },
      dependenteCents: b(j.irrf.dependenteCents),
      descontoSimplificadoBp: j.irrf.descontoSimplificadoBp,
    },
  };
}

// ── Regras da folha (item 67) — já são JSON (números e textos com a linha de origem) ────────────────────────────────
const valorRegra = <T extends z.ZodTypeAny>(valor: T) => z.object({ valor, linhaId: z.string(), fonte: z.string() }).strict();
const vInt = valorRegra(Int);
const vTexto = <K extends keyof typeof FOLHA_REGRA_CHAVES_TEXTO>(k: K) =>
  valorRegra(z.enum(FOLHA_REGRA_CHAVES_TEXTO[k] as unknown as [string, ...string[]]));
const EncargoSchema = valorRegra(
  z
    .object({
      inss: z.enum(['EMPREGADO', 'CONTRIBUINTE_INDIVIDUAL', 'NENHUM']),
      fgtsChave: z.enum(['FGTS_BP', 'FGTS_APRENDIZ_BP']).nullable(),
      irrf: z.boolean(),
    })
    .strict(),
);
const RegrasFolhaSchema = z
  .object({
    heAdicionalBp: vInt,
    heRepousoAdicionalBp: vInt,
    noturno: z.object({ adicionalBp: vInt, horaSegundos: vInt, inicioMin: vInt, fimMin: vInt }).strict(),
    afastamentoDiasEmpresa: vInt,
    mensalistaBaseDias: vInt,
    semanaDsrInicio: vTexto('SEMANA_DSR_INICIO'),
    jornadaLimiteSemanalMin: vInt,
    repousoDiasMin: vInt,
    salarioHoraDivisor: vTexto('SALARIO_HORA_DIVISOR'),
    arredondamentoInss: vTexto('ARREDONDAMENTO_INSS'),
    arredondamento: vTexto('ARREDONDAMENTO'),
    salarioFamiliaIdadeMax: vInt,
    encargoPorCategoria: z.object(Object.fromEntries(CATEGORIAS_NUCLEO.map((c) => [c, EncargoSchema])) as Record<(typeof CATEGORIAS_NUCLEO)[number], typeof EncargoSchema>).strict(),
  })
  .strict();

// ── Vínculo ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const EscalaSchema = z.object({ diasTrabalho: z.array(z.enum(DIAS_SEMANA)), minutosPorDia: Int }).strict();
const JornadaSnapshotSchema = z
  .object({ id: z.string(), nome: z.string(), minutosSemanais: Int, tipoJornada: z.string(), escala: EscalaSchema.nullable() })
  .strict();
const VersaoSnapshotSchema = z
  .object({
    id: z.string(),
    vigenteDesde: DataSchema,
    vigenteAte: DataSchema.nullable(),
    salarioCents: Cents,
    unidadeSalario: z.string(),
    jornada: JornadaSnapshotSchema.nullable(),
    cargoId: z.string().nullable(),
    cargoNome: z.string().nullable(),
    sindicatoId: z.string().nullable(),
  })
  .strict();
const CctSnapshotSchema = z
  .object({
    id: z.string(),
    sindicatoId: z.string(),
    chave: z.string(),
    discriminador: z.string().nullable(),
    valorInt: Cents,
    vigenteDesde: DataSchema,
    vigenteAte: DataSchema.nullable(),
  })
  .strict();
const AfastamentoSnapshotSchema = z.object({ id: z.string(), motivo: z.string(), inicio: DataSchema, fim: DataSchema.nullable() }).strict();
/** `id` nulo = item da porta de jornada (o ponto não tem id de lançamento). */
const LancamentoSnapshotSchema = z
  .object({
    id: z.string().nullable(),
    rubrica: z.string(),
    quantidadeMin: Int.optional(),
    valorCents: Cents.optional(),
    origem: z.enum(['MANUAL', 'MODULO']),
    data: DataSchema.optional(),
  })
  .strict();
const OutraRemuneracaoSnapshotSchema = z
  .object({ id: z.string(), remuneracaoCents: Cents, contribuicaoCents: Cents, ordem: z.string(), categoriaOutraFonte: z.string() })
  .strict();

export const VinculoSnapshotSchema = z
  .object({
    vinculoId: z.string(),
    trabalhadorId: z.string(),
    unitId: z.string(),
    matricula: z.string(),
    categoria: z.enum(CATEGORIAS_NUCLEO),
    dataInicio: DataSchema,
    dataTermino: DataSchema.nullable(),
    idadeNaDataPagamento: Int,
    pcd: z.boolean(),
    versoes: z.array(VersaoSnapshotSchema),
    cct: z.array(CctSnapshotSchema),
    afastamentos: z.array(AfastamentoSnapshotSchema),
    lancamentos: z.array(LancamentoSnapshotSchema),
    /** Origem do que a porta `JORNADA_APURADA` devolveu (o motor aplica a precedência do item 19). */
    jornadaApurada: z.object({ origem: z.enum(['NULO', 'MODULO']), motivo: z.string().optional() }).strict(),
    dependentes: z.object({ irrf: Int, salarioFamilia: z.array(z.object({ idade: Int, invalido: z.boolean() }).strict()) }).strict(),
    jaPagoNoMesDePagamento: z.object({ rendimentoCents: Cents, irrfRetidoCents: Cents }).strict(),
    adiantamentoPagoCents: Cents.optional(),
    outrasRemuneracoes: z.array(OutraRemuneracaoSnapshotSchema),
  })
  .strict();
export type VinculoSnapshot = z.infer<typeof VinculoSnapshotSchema>;
export type VersaoSnapshot = VinculoSnapshot['versoes'][number];
export type AfastamentoSnapshot = VinculoSnapshot['afastamentos'][number];

export const DpSnapshotSchema = z
  .object({
    versaoFormato: z.literal(DP_SNAPSHOT_VERSAO_FORMATO),
    competencia: CompetenciaSchema,
    roteiro: z.enum(ROTEIROS),
    dataPagamento: DataSchema,
    parametros: z
      .object({ competencia: ouAusente(ParametrosFolhaJsonSchema), pagamento: ouAusente(ParametrosFolhaJsonSchema), adiantamentoBp: Int.optional() })
      .strict(),
    regras: ouAusente(RegrasFolhaSchema),
    /** Por `unitId`: feriados do mês na unidade (nacional, eleição e local do município do perfil fiscal). */
    feriados: z.record(z.string(), z.array(DataSchema)),
    modulosAtivos: z.array(dpModuleKeySchema),
    vinculos: z.array(VinculoSnapshotSchema),
  })
  .strict();
export type DpSnapshot = z.infer<typeof DpSnapshotSchema>;

/** Leitor que pode faltar na data: devolve o valor ou a ausência nomeada (só para `SemLinhaVigenteError`). */
export function lerOuAusente<T, J>(ler: () => T, paraJson: (v: T) => J): { ok: true; valor: J } | { ok: false; ausente: Ausencia } {
  try {
    return { ok: true, valor: paraJson(ler()) };
  } catch (e) {
    if (e instanceof SemLinhaVigenteError) return { ok: false, ausente: { tabela: e.tabela, chave: e.chave, data: e.data } };
    throw e;
  }
}

export const regrasParaJson = (r: RegrasFolha) => r as unknown as z.infer<typeof RegrasFolhaSchema>;
/** As regras na forma do leitor (`RegrasFolha`): o schema é o mesmo, só a largura do tipo do texto muda. */
export const regrasDeJson = (j: z.infer<typeof RegrasFolhaSchema>) => j as unknown as RegrasFolha;

// ── Forma canônica e hash (item 28) ─────────────────────────────────────────────────────────────────────────────────
function canonico(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(canonico);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = canonico(x);
    }
    return out;
  }
  return v;
}

/** Item 28 — JSON com chaves ordenadas, `bigint` como string decimal e sem chave `undefined`. */
export function formaCanonica(v: unknown): string {
  return JSON.stringify(canonico(v));
}

export function sha256Canonico(v: unknown): string {
  return createHash('sha256').update(formaCanonica(v)).digest('hex');
}

const porTexto = <T>(chave: (x: T) => string) => (a: T, b: T) => {
  const ka = chave(a);
  const kb = chave(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

/**
 * Item 28 — ordena toda lista do snapshot por id (ou, onde a linha não tem id no snapshot, pela forma canônica dela),
 * para a ordem de leitura do banco não mudar o hash. Versões por `vigenteDesde` (única por vínculo, sem sobreposição).
 */
export function normalizarSnapshot(snap: DpSnapshot): DpSnapshot {
  const feriados = Object.fromEntries(Object.entries(snap.feriados).map(([u, ds]) => [u, [...ds].sort()]));
  return {
    ...snap,
    feriados,
    modulosAtivos: [...snap.modulosAtivos].sort(),
    vinculos: [...snap.vinculos]
      .map((v) => ({
        ...v,
        versoes: [...v.versoes].sort(porTexto((x) => x.vigenteDesde)),
        cct: [...v.cct].sort(porTexto((x) => x.id)),
        afastamentos: [...v.afastamentos].sort(porTexto((x) => x.id)),
        lancamentos: [...v.lancamentos].sort(porTexto((x) => formaCanonica(x))),
        outrasRemuneracoes: [...v.outrasRemuneracoes].sort(porTexto((x) => x.id)),
        dependentes: { ...v.dependentes, salarioFamilia: [...v.dependentes.salarioFamilia].sort(porTexto((x) => formaCanonica(x))) },
      }))
      .sort(porTexto((v) => v.vinculoId)),
  };
}

/** Item 28 — `snapshotSha256` = SHA-256 da forma canônica do snapshot normalizado. */
export function snapshotSha256(snap: DpSnapshot): string {
  return sha256Canonico(normalizarSnapshot(snap));
}
