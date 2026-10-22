import { z } from 'zod';
import { UF_CODES, crcNumberFieldFor, signerCpfOrCnpjSchema } from './SpedEcdDto';
import { CNPJ_REGEX } from '../../../lib/cnpj';
import { SPED_ECF_QUALIF_ASSINANTE_CODES } from '../models/spedQualifAssinante';
import { isValidCpf } from '../../../lib/cpf';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';

/**
 * Zod DTO for SPED ECF generation (ADR-INCR-SPED-ECF, D4 — TRANSIENTE).
 * The declarant identity/cadastral (registers 0000/0030) and the signers (0930)
 * are transient request params — never persisted as a TaxRegime/LegalEntity
 * (would reopen the rejected multi-company tower, master map §4). Validation is
 * shape-only at the boundary; `.strict()` rejects unknown keys.
 *
 * Passo A (FASE 2) — o que NÃO existe neste DTO e por quê:
 *  - `ecdRecibo`/`ecdHash`: os Blocos C/E são recuperados PELO PVA da ECD ativa
 *    na base (não importados) — não há campo de recibo/hash a preencher.
 *  - `mappingVersion`: o `.txt` não emite linha keyed por código referencial RFB
 *    (P100/P150/J/K recuperados pelo PVA); o gate é exaustividade da RECEITA
 *    (contas Revenue → linha de presunção), não cobertura referencial.
 * Regime fixo = Lucro Presumido (D1); os parâmetros fiscais fixos (FORMA_TRIB=5,
 * FORMA_APUR=T, TIP_ESC_PRE=C, FORMA_TRIB_PER=PPPP) são default do serviço, não
 * input do usuário.
 */

// BE-INCR-CNPJ-ALFA (T10): mesma forma canônica do SpedEcdDto (lib/cnpj.ts); só formato (F-CNPJ-2 → a).
const cnpj = z
  .string()
  .regex(CNPJ_REGEX, 'CNPJ = 14 posições sem máscara: 12 alfanuméricas maiúsculas + 2 dígitos verificadores.');

/** Declarante — identificação (0000) + dados cadastrais (0030). Manual pp. 61-101. */
export const DeclarantSchema = z
  .object({
    // 0000
    cnpj,
    nome: z.string().min(1).max(150),
    // 0030
    codNat: z.string().regex(/^\d{3,4}$/, 'Código de natureza jurídica (tabela Sped).'),
    cnaeFiscal: z.string().regex(/^\d{7}$/, 'CNAE-Fiscal = 7 dígitos.'),
    endereco: z.string().min(1).max(150),
    num: z.string().max(6).default('S/N'),
    compl: z.string().max(50).optional(),
    bairro: z.string().min(1).max(50),
    uf: z.enum(UF_CODES),
    codMun: z.string().regex(/^\d{7}$/, 'Código IBGE do município = 7 dígitos.'),
    cep: z.string().regex(/^\d{8}$/, 'CEP = 8 dígitos (só números).'),
    numTel: z.string().max(15).optional(),
    email: z.string().email('E-mail inválido.'),
  })
  .strict();

/** Parâmetros fiscais opcionais (0010/0020). Defaults = Presumido trimestral 9% CSLL. */
const FiscalSchema = z
  .object({
    // 0020.IND_ALIQ_CSLL — ECF ≥ 2019 ∈ {1 (9%), 4 (15%)} (REGRA_PREENCHIMENTO_IND_ALIQ_CSSL).
    indAliqCsll: z.enum(['1', '3', '4', '7', '8']).default('1'),
    // 0010.IND_REC_RECEITA — 2 = Regime de Competência (default; mantém a ECD).
    indRecReceita: z.enum(['1', '2']).default('2'),
  })
  .strict();

/**
 * Signatário — 0930 (7 campos, máx 2). Manual pp. 103-106. IDENT_QUALIF é código
 * de 3 dígitos da tabela SPEDECF_QUALIF_ASSINANTE ('900' = Contador). Quando
 * '900' ⇒ CPF (11 dígitos) e IND_CRC obrigatórios.
 */
export const SignerSchema = z
  .object({
    identNom: z.string().min(1),
    identCpfCnpj: signerCpfOrCnpjSchema('0930'),
    identQualif: z.enum(SPED_ECF_QUALIF_ASSINANTE_CODES, {
      message: '0930.IDENT_QUALIF fora da tabela SPEDECF_QUALIF_ASSINANTE (Manual ECF L12 p. 105).',
    }),
    // F-4 → a (BE-INCR-CRC-CFC-FOLLOWUPS): o leiaute não declara formato (Manual ECF L12 pp. 103-105),
    // a máscara CFC é escolha da casa — o mesmo contador sai igual na ECD e na ECF.
    indCrc: crcNumberFieldFor('0930').optional(),
    email: z.string().email('E-mail do signatário inválido.'),
    fone: z.string().min(1).max(14),
  })
  .strict();

/**
 * POST /sped/ecf/generate body. `year` drives the four quarterly windows (D3).
 * Regime = Presumido (D1). No dtIni/dtFin override (annual calendar → 4 trimestres).
 */
/**
 * 0930 compliance (REGRA_OBRIGATORIO_ASSIN_CONTADOR, p. 104): ≥1 contador
 * (IDENT_QUALIF='900' com IND_CRC) e ≥1 não-contador. Mesmo objeto de domínio nos
 * dois regimes (Presumido e Real) — exportado para que o DTO Real reuse em vez de clonar.
 */
export const refineEcfSigners = (
  val: { signers: Array<z.infer<typeof SignerSchema>> },
  ctx: z.RefinementCtx,
): void => {
  const contadores = val.signers.filter((s) => s.identQualif === '900');
  const hasNonContador = val.signers.some((s) => s.identQualif !== '900');
  if (contadores.length < 1 || !hasNonContador) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signers'],
      message: 'A ECF exige um signatário contador (IDENT_QUALIF=900) e um não-contador.',
    });
  }
  for (const c of contadores) {
    if (c.identCpfCnpj.length !== 11 || !c.indCrc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signers'],
        message: 'O signatário contador (900) exige CPF de 11 dígitos e IND_CRC.',
      });
    }
  }
};

/**
 * 0000.RETIFICADORA/NUM_REC (BE-INCR-FIXED-ASSETS PR-4, Passo 19). `'N'` = original (default);
 * `'S'` = retificadora, exige `numRec` (C 40 — hash do recibo da ECF anterior) e
 * `supersedesJobId` (id do job EXPORTED que está sendo retificado). `'F'` NÃO existe na tabela
 * do manual — `z.enum(['N','S'])` já reprova (400) de propósito, sem precisar de um `.refine`.
 */
export const refineEcfRectification = (
  val: { year: number; retificadora?: string; numRec?: string; supersedesJobId?: string; deadlineJustification?: string },
  ctx: z.RefinementCtx,
): void => {
  if (val.retificadora === 'S') {
    if (!val.numRec || val.numRec.length !== 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numRec'],
        message: '0000.NUM_REC é obrigatório (40 caracteres) quando RETIFICADORA=S.',
      });
    }
    if (!val.supersedesJobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supersedesJobId'],
        message: 'supersedesJobId é obrigatório quando RETIFICADORA=S.',
      });
    }
    // Prazo (art. 8º §4 — grau INFERIDO, mesma regra do DTO da ECD, execution-plan Passo 19).
    const currentYear = new Date().getUTCFullYear();
    const diff = currentYear - val.year;
    if (diff > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['year'],
        message: `Fora do prazo de retificação da ECF (art. 8º §4): o exercício ${val.year} é anterior a ${currentYear - 2}.`,
      });
    } else if (diff === 2 && !val.deadlineJustification) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deadlineJustification'],
        message: `deadlineJustification é obrigatória: o exercício ${val.year} está no limite do prazo de retificação (ano-2, art. 8º §4).`,
      });
    }
  } else {
    if (val.numRec) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['numRec'], message: '0000.NUM_REC só é aceito quando RETIFICADORA=S.' });
    }
    if (val.supersedesJobId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['supersedesJobId'], message: 'supersedesJobId só é aceito quando RETIFICADORA=S.' });
    }
  }
};

// ─── Y600 — sócios, titular, dirigentes (BE-INCR-ECF-Y600, L11 do H1; forks F-Y600-1..10 → (a), D-2026-10-22) ───
// Fonte: Manual de Orientação do Leiaute 12 da ECF (maio/2026), pp. 570–575. A pessoa do sócio vem do cadastro
// `Partner` (F-Y600-2); o request traz só o que é da ECF. Os 5 valores são obrigatórios, sem default (F-Y600-3).

const y600Cents = z.number().int().nonnegative().max(MAX_CENTS);
const y600Date = (f: string) => z.string().refine(isValidDateOnly, `${f} deve ser uma data real YYYY-MM-DD`);
const y600Cpf = z
  .string()
  .regex(/^\d{11}$/, 'CPF = 11 dígitos sem máscara')
  .refine(isValidCpf, 'CPF com dígito verificador inválido');

/** Y600 campos 13–17 (p. 573) — todos obrigatórios, zero explícito (p. 570). */
export const Y600ValoresSchema = z
  .object({
    remTrabCents: y600Cents, // VL_REM_TRAB: pró-labore, aluguéis… antes do IRRF
    lucDivCents: y600Cents, // VL_LUC_DIV: lucros/dividendos efetivamente pagos no ano
    jurCapCents: y600Cents, // VL_JUR_CAP: JCP pagos ou creditados, antes do IRRF
    demRendCents: y600Cents, // VL_DEM_REND: demais rendimentos
    irRetCents: y600Cents, // VL_IR_RET
  })
  .strict();

/** Campos 11–12 (p. 573). M12: os dois juntos (o objeto garante). Faixa PF {01..06}; PJ só {01,06} — serviço (tipo vem do cadastro). */
export const RepresentanteLegalSchema = z
  .object({ cpf: y600Cpf, qualif: z.enum(['01', '02', '03', '04', '05', '06']) })
  .strict();

/** QUALIF aceito pela REGRA_Y600_QUALIF (p. 574); o 18 da descrição (p. 572) fica de fora (F-Y600-9). */
export const Y600_QUALIF = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17'] as const;

/** Complemento ECF de UMA vigência do cadastro (`partnerId` = id da linha `Partner`, F-Y600-4). */
export const SocioEcfSchema = z
  .object({
    partnerId: z.string().min(1),
    qualif: z.enum(Y600_QUALIF),
    // Só para não residente (F-Y600-10): código da tabela de países do Sped (p. 571) — o DTO valida o formato.
    pais: z
      .string()
      .regex(/^\d{3}$/, 'PAIS = 3 dígitos (tabela de países do Sped)')
      .refine((p) => p !== '105', 'PAIS 105 (Brasil) não se informa: o sócio residente sai com 105 pelo cadastro')
      .optional(),
    percCapVotBp: z.number().int().min(0).max(10000).optional(), // default = participacaoBp (F-Y600-3)
    representanteLegal: RepresentanteLegalSchema.optional(),
    valores: Y600ValoresSchema,
  })
  .strict();

/** Administrador/diretor/conselheiro fora do cadastro de sócios (F-Y600-5): sai PAIS 105, PF, percentuais 0. */
export const DirigenteEcfSchema = z
  .object({
    nome: z.string().trim().min(1).max(200),
    cpf: y600Cpf,
    qualif: z.enum(['10', '11', '12', '13', '14', '15', '16', '17']),
    dtAltSoc: y600Date('dtAltSoc'),
    dtFimSoc: y600Date('dtFimSoc').optional(),
    representanteLegal: RepresentanteLegalSchema.optional(),
    valores: Y600ValoresSchema,
  })
  .strict();

/**
 * Regras locais do Y600 (BRIEF item 6): `partnerId` único; dirigente com `dtFimSoc ≥ dtAltSoc` e, pela
 * REGRA_DATA_FIM_SOC (Erro, p. 574), `dtFimSoc` dentro do ano. O que depende do cadastro (M11 do sócio, PJ só
 * 01/06 no representante, país × residência) é do serviço (item 9). Exportado para o DTO do Real (item 7).
 */
export const refineEcfY600 = (
  val: { year: number; socios: Array<z.infer<typeof SocioEcfSchema>>; dirigentes: Array<z.infer<typeof DirigenteEcfSchema>> },
  ctx: z.RefinementCtx,
): void => {
  const seen = new Set<string>();
  val.socios.forEach((s, i) => {
    if (seen.has(s.partnerId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['socios', i, 'partnerId'], message: `partnerId '${s.partnerId}' repetido em socios.` });
    }
    seen.add(s.partnerId);
  });
  val.dirigentes.forEach((d, i) => {
    if (!d.dtFimSoc) return;
    if (d.dtFimSoc < d.dtAltSoc) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dirigentes', i, 'dtFimSoc'], message: 'dtFimSoc não pode ser anterior a dtAltSoc.' });
    }
    if (d.dtFimSoc < `${val.year}-01-01` || d.dtFimSoc > `${val.year}-12-31`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dirigentes', i, 'dtFimSoc'],
        message: `Y600.DT_FIM_SOC deve cair no ano ${val.year} (REGRA_DATA_FIM_SOC, Manual ECF L12 p. 574).`,
      });
    }
  });
};

export const SpedEcfRequestSchema = z
  .object({
    unitId: z.string().min(1),
    year: z.number().int().gte(2015).lte(2100),
    declarant: DeclarantSchema,
    fiscal: FiscalSchema.default({ indAliqCsll: '1', indRecReceita: '2' }),
    signers: z.array(SignerSchema).min(1).max(2),
    // Y600 (BRIEF itens 4–5): obrigatório; o serviço exige ≥ 1 ocorrência no total (item 11).
    socios: z.array(SocioEcfSchema).max(999),
    dirigentes: z.array(DirigenteEcfSchema).max(999).default([]),
    retificadora: z.enum(['N', 'S']).default('N'),
    numRec: z.string().optional(),
    supersedesJobId: z.string().min(1).optional(),
    deadlineJustification: z.string().min(1).optional(),
  })
  .strict()
  .superRefine(refineEcfSigners)
  .superRefine((val, ctx) => refineEcfRectification(val, ctx))
  .superRefine((val, ctx) => refineEcfY600(val, ctx));

export type SpedEcfRequestDto = z.infer<typeof SpedEcfRequestSchema>;
export type SpedEcfDeclarantDto = z.infer<typeof DeclarantSchema>;
export type SpedEcfSignerDto = z.infer<typeof SignerSchema>;
export type SocioEcfDto = z.infer<typeof SocioEcfSchema>;
export type DirigenteEcfDto = z.infer<typeof DirigenteEcfSchema>;
