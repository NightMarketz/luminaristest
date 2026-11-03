import { z } from 'zod';

/**
 * EFICIENCIA-FISCAL PR-3 itens 15–18 (BRIEF BE-INCR-EFICIENCIA-FISCAL §3 PR-3, §4.2/§4.3; ADR-INCR-EFICIENCIA-FISCAL D8;
 * decisões do dono no AskUserQuestion de 28/10 em D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO) — simuladores puros: fator r,
 * regime e remuneração do sócio. GET calcula e não grava; o POST gêmeo `…/sugestao` grava a sugestão do SYSTEM (decisão 5).
 * Centavos saem como string (convenção das views do PR-1); `economia*` pode ser negativa.
 */
const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competencia = YYYY-MM');
const ano = z.coerce.number().int().min(2018).max(2100);
const centsIn = z.coerce.bigint().min(0n).max(BigInt(Number.MAX_SAFE_INTEGER));
const cents = z.string().regex(/^\d+$/);
const signedCents = z.string().regex(/^-?\d+$/);

export const TIPOS_FOLHA = ['PRO_LABORE', 'EMPREGADO'] as const;
export type TipoFolha = (typeof TIPOS_FOLHA)[number];

// ---- item 15: fator r ----

/** Decisão 2: `folhaAlvoCents` = a folha (FS12) dos 12 meses da janela do RBT12 da competência. Nunca é persistido (I-5). */
export const FatorRSimulacaoQuerySchema = z
  .object({
    unitId: z.string().min(1),
    competencia,
    folhaAlvoCents: centsIn,
    tipoFolha: z.enum(TIPOS_FOLHA).default('PRO_LABORE'),
  })
  .strict();
export type FatorRSimulacaoQuery = z.infer<typeof FatorRSimulacaoQuerySchema>;

/** ADR §7 `FatorRSimulacaoSchema` + `tipoFolha`, `fs12AtualCents` e `folhaAdicionalCents` (decisões 1 e 2). */
export const FatorRSimulacaoSchema = z
  .object({
    competencia: z.string(),
    tipoFolha: z.enum(TIPOS_FOLHA),
    rAtual: z.number(),
    rSimulado: z.number(),
    anexoAtual: z.string(),
    anexoSimulado: z.string(),
    fs12AtualCents: cents,
    folhaAdicionalCents: cents,
    dasAtualCents: cents,
    dasSimuladoCents: cents,
    custoFolhaAdicionalCents: cents,
    economiaLiquidaCents: signedCents,
    avisos: z.array(z.string()),
    parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type FatorRSimulacao = z.infer<typeof FatorRSimulacaoSchema>;

// ---- item 16: regime ----

export const RegimeSimulacaoQuerySchema = z.object({ unitId: z.string().min(1), ano }).strict();
export type RegimeSimulacaoQuery = z.infer<typeof RegimeSimulacaoQuerySchema>;

export const REGIMES_SIMULADOS = ['SIMPLES', 'PRESUMIDO', 'REAL'] as const;
export type RegimeSimulado = (typeof REGIMES_SIMULADOS)[number];

/** Decisão 3: o que entra na carga de cada regime (componentes zerados ficam com 0; os não calculáveis, nos avisos). */
const ComponentesSchema = z
  .object({
    das: cents,
    irpj: cents,
    csll: cents,
    pis: cents,
    cofins: cents,
    cbs: cents,
    ibs: cents,
    cpp: cents,
    iss: cents,
  })
  .strict();

const CenarioRegimeSchema = z
  .object({
    regime: z.enum(REGIMES_SIMULADOS),
    disponivel: z.boolean(),
    motivoIndisponivel: z.string().nullable(),
    cargaTotalCents: cents,
    componentes: ComponentesSchema,
  })
  .strict();

const SimulacaoAnoSchema = z
  .object({
    ano: z.number().int(),
    receitaBrutaCents: cents,
    cenarios: z.array(CenarioRegimeSchema),
    melhor: z.enum(REGIMES_SIMULADOS).nullable(),
    avisos: z.array(z.string()),
  })
  .strict();

export const AlertaRegimeSchema = z.object({ codigo: z.enum(['SUBLIMITE_80', 'SUBLIMITE_EXCEDIDO', 'LIMITE_EPP_EXCEDIDO', 'JANELA_OPCAO']), detalhe: z.string() }).strict();

export const RegimeSimulacaoSchema = z
  .object({
    ano: z.number().int(),
    regimeAtual: z.string().nullable(),
    simulacao: SimulacaoAnoSchema,
    /** Decisão 4: ano ≤ 2026 traz a mesma receita sob as regras de 2027; ano ≥ 2027 ⇒ null. */
    projecao2027: SimulacaoAnoSchema.nullable(),
    economiaCents: signedCents,
    alertas: z.array(AlertaRegimeSchema),
    avisos: z.array(z.string()),
    parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type RegimeSimulacao = z.infer<typeof RegimeSimulacaoSchema>;

// ---- item 17: remuneração do sócio ----

/** Decisão 6: `valorAnualCents` = quanto o sócio quer receber no ano; comparam-se 3 mixes. */
export const RemuneracaoSocioQuerySchema = z
  .object({
    unitId: z.string().min(1),
    ano,
    partnerId: z.string().min(1),
    valorAnualCents: centsIn.refine((v) => v > 0n, 'valorAnualCents > 0'),
  })
  .strict();
export type RemuneracaoSocioQuery = z.infer<typeof RemuneracaoSocioQuerySchema>;

export const MIXES_REMUNERACAO = ['PRO_LABORE_INTEGRAL', 'PRO_LABORE_MINIMO_DIVIDENDOS', 'PRO_LABORE_MINIMO_JCP_DIVIDENDOS'] as const;
export type MixRemuneracao = (typeof MIXES_REMUNERACAO)[number];

const MixSchema = z
  .object({
    mix: z.enum(MIXES_REMUNERACAO),
    proLaboreCents: cents,
    dividendosCents: cents,
    jcpCents: cents,
    inssSocioCents: cents,
    cppEmpresaCents: cents,
    irpfProLaboreCents: cents,
    irrfDividendosCents: cents,
    irrfJcpCents: cents,
    economiaIrpjCsllJcpCents: cents,
    cargaTotalCents: signedCents,
    liquidoSocioCents: signedCents,
  })
  .strict();

export const RemuneracaoSocioSimulacaoSchema = z
  .object({
    ano: z.number().int(),
    partnerId: z.string(),
    regime: z.string(),
    valorAnualCents: cents,
    mixes: z.array(MixSchema),
    melhor: z.enum(MIXES_REMUNERACAO),
    economiaCents: cents,
    avisos: z.array(z.string()),
    parametrosSha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type RemuneracaoSocioSimulacao = z.infer<typeof RemuneracaoSocioSimulacaoSchema>;

// ---- item 18: sugestão ----

export const SimulacaoSugestaoSchema = z
  .object({
    suggestionId: z.string(),
    reaproveitada: z.boolean(),
    avisos: z.array(z.string()),
  })
  .strict();
export type SimulacaoSugestao = z.infer<typeof SimulacaoSugestaoSchema>;
