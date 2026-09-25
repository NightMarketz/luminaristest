import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { CNPJ_REGEX, CPF_REGEX } from '../../../lib/cnpj';
import { isValidCpf } from '../../../lib/cpf';
import {
  isValidCrcCertificate,
  normalizeCrcCertificate,
  normalizeCrcNumber,
  crcNumberUf,
} from '../models/AccountingContact.model';
import { SPED_ECD_QUALIF_ASSINANTE_CODES } from '../models/spedQualifAssinante';

/**
 * Zod DTO for SPED ECD generation (ADR-INCR-SPED-ECD, D3). The declarant
 * identity (register 0000), the book term (I030/J900) and the signers (J930)
 * are TRANSIENT request params — they do NOT exist in the ledger and are NEVER
 * persisted as a LegalEntity/CompanyProfile (would reopen the rejected
 * multi-company tower, master map §4). Validation is shape-only at the boundary;
 * the service trusts the parsed types. `.strict()` rejects unknown keys.
 */

const dateOnly = z
  .string()
  .refine(isValidDateOnly, 'Data deve ser uma data real no formato YYYY-MM-DD');

/** Tabela de Unidades da Federação (0000 campo 07, manual p. 67). */
export const UF_CODES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

// BE-INCR-CNPJ-ALFA (T10): CNPJ alfanumérico (IN RFB 2.229/2024) — forma canônica da lib, sem máscara,
// MAIÚSCULO (F-CNPJ-1 → rejeita minúscula aqui; quem lê fonte suja normaliza com stripCnpjMask). Só
// formato (F-CNPJ-2 → a): DV é conferido pelo PVA, não duplicado na fronteira. Manual ECF L12 §2.4: CNPJ C 014.
const cnpj = z
  .string()
  .regex(CNPJ_REGEX, 'CNPJ = 14 posições sem máscara: 12 alfanuméricas maiúsculas + 2 dígitos verificadores.');

/**
 * IDENT_CPF_CNPJ do signatário (J930 campo 03 / 0930 campo 3) — CPF com dígito verificador
 * (`REGRA_VALIDA_CPF`, reuso de `isValidCpf`) OU CNPJ só por formato (`REGRA_VALIDA_CNPJ`; DV
 * segue F-CNPJ-2 → a, não duplicado na fronteira). Mesmo objeto de domínio nos dois leiautes
 * (BE-INCR-SPED-IDENTITY-MASKS §4 item 5) — exportado para o DTO da ECF reusar em vez de clonar.
 */
export function signerCpfOrCnpjSchema(registro: 'J930' | '0930') {
  return z.string().superRefine((value, ctx) => {
    if (CPF_REGEX.test(value)) {
      if (!isValidCpf(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${registro}.IDENT_CPF_CNPJ — CPF inválido (dígito verificador não confere, REGRA_VALIDA_CPF).`,
        });
      }
      return;
    }
    if (CNPJ_REGEX.test(value)) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${registro}.IDENT_CPF_CNPJ deve ser CPF (11 dígitos com DV) ou CNPJ (14 posições alfanuméricas maiúsculas).`,
    });
  });
}

/** J930 campo 06 (IND_CRC) — mesma máscara CFC do contato (#305, F-C12-3 → a): `normalizeCrcNumber`
 * aceita as grafias usuais e devolve a forma canônica `UF-NNNNNN/O-D`, ou reprova. */
const crcNumberField = z.string().transform((value, ctx) => {
  const normalized = normalizeCrcNumber(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'J930.IND_CRC deve seguir o formato do CRC: UF-NNNNNN/O-D (ex.: SP-123456/O-1).',
    });
    return z.NEVER;
  }
  return normalized;
});

/** J930 campo 10 (NUM_SEQ_CRC) — `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC`: UF/AAAA/NÚMERO, UF na tabela. */
const crcCertificateField = z.string().transform((value, ctx) => {
  const normalized = normalizeCrcCertificate(value);
  if (!isValidCrcCertificate(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'J930.NUM_SEQ_CRC deve seguir UF/AAAA/NÚMERO (Manual ECD L9 p. 202), com UF da Tabela de UF.',
    });
    return z.NEVER;
  }
  return normalized;
});

/** Declarante — identificação do registro 0000 (manual pp. 64-67). */
const DeclarantSchema = z
  .object({
    nome: z.string().min(1).max(150),
    cnpj,
    uf: z.enum(UF_CODES),
    ie: z.string().optional(),
    codMun: z.string().regex(/^\d{7}$/, 'Código IBGE do município = 7 dígitos.'),
    im: z.string().optional(),
    indSitEsp: z.enum(['1', '2', '3', '4']).optional(), // cisão/fusão/incorp/extinção
    indSitIniPer: z.enum(['0', '1', '2']).default('0'),
    indNire: z.enum(['0', '1']),
    indFinEsc: z.enum(['0', '1']).default('0'), // 0=Original
    codHashSub: z.string().optional(),
    indGrandePorte: z.enum(['0', '1']),
    tipEcd: z.enum(['0', '1', '2']).default('0'),
    codScp: cnpj.optional(),
    identMf: z.enum(['S', 'N']).default('N'), // MVP: N (sem moeda funcional)
    indEscCons: z.enum(['S', 'N']).default('N'),
    indCentralizada: z.enum(['0', '1']).default('0'),
    indMudancPc: z.enum(['0', '1']).default('0'),
    codPlanRef: z.enum(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']).optional(),
  })
  .strict();

/** Livro — termo de abertura/encerramento (I030/J900, manual pp. 113/195). */
const BookSchema = z
  .object({
    numOrd: z.string().min(1),
    natLivr: z.string().min(1).max(80),
    nire: z.string().optional(),
    dtArq: dateOnly.optional(),
    dtArqConv: dateOnly.optional(),
    descMun: z.string().optional(),
    dtExSocial: dateOnly, // encerramento do exercício social (obrigatório)
  })
  .strict();

/**
 * Signatário — J930 (Manual ECD L9 pp. 199-203). Campo 04 (IDENT_QUALIF) NÃO é aceito (F-C12-1 → a):
 * é derivado da tabela de qualificação pelo gerador a partir de COD_ASSIN — quem manda o campo recebe
 * `unrecognized_keys` (`.strict()`), quebra de compat declarada. COD_ASSIN é fechado na Tabela de
 * Qualificação do Assinante (pp. 201-202).
 */
const SignerSchema = z
  .object({
    identNom: z.string().min(1),
    identCpfCnpj: signerCpfOrCnpjSchema('J930'),
    codAssin: z.enum(SPED_ECD_QUALIF_ASSINANTE_CODES, {
      message:
        'J930.COD_ASSIN fora da Tabela de Qualificação do Assinante (Manual ECD L9 pp. 201-202).',
    }), // campo 05
    indCrc: crcNumberField.optional(),
    email: z.string().optional(),
    fone: z.string().optional(),
    ufCrc: z.enum(UF_CODES).optional(),
    numSeqCrc: crcCertificateField.optional(),
    dtCrc: dateOnly.optional(),
    indRespLegal: z.enum(['S', 'N']),
  })
  .strict()
  .superRefine((val, ctx) => {
    // A UF embutida no IND_CRC tem de bater com UF_CRC (mesma técnica de
    // AccountingContactDto.refineCrcUfMatches, reaplicada aos primitivos de
    // AccountingContact.model.ts — os nomes de campo divergem: J930 usa indCrc/ufCrc, o contato usa
    // crcNumber/crcUf, então não é o mesmo símbolo, é a mesma técnica).
    if (val.indCrc && val.ufCrc) {
      const embedded = crcNumberUf(val.indCrc);
      if (embedded && embedded !== val.ufCrc) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ufCrc'],
          message: `J930.UF_CRC (${val.ufCrc}) diverge da UF embutida no IND_CRC (${embedded}).`,
        });
      }
    }

    // REGRA_OBRIGATORIO_CONTADOR (Manual ECD L9 p. 202): COD_ASSIN=900 ⇒ IND_CRC, EMAIL, FONE e
    // UF_CRC obrigatórios. F-C12-6 → (a): + CPF de 11 posições (regra de assinatura 2, p. 198 — o
    // contador/contabilista é sempre pessoa física; o DTO ECF já exige o mesmo).
    if (val.codAssin === '900') {
      if (val.identCpfCnpj.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['identCpfCnpj'],
          message:
            'J930.IDENT_CPF_CNPJ deve ser CPF (11 dígitos) quando COD_ASSIN=900 (o contador é pessoa física, Manual ECD L9 p. 198).',
        });
      }
      if (!val.indCrc) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['indCrc'],
          message:
            'J930.IND_CRC é obrigatório quando COD_ASSIN=900 (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202).',
        });
      }
      if (!val.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message:
            'J930.EMAIL é obrigatório quando COD_ASSIN=900 (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202).',
        });
      }
      if (!val.fone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fone'],
          message:
            'J930.FONE é obrigatório quando COD_ASSIN=900 (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202).',
        });
      }
      if (!val.ufCrc) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ufCrc'],
          message:
            'J930.UF_CRC é obrigatório quando COD_ASSIN=900 (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202).',
        });
      }
    }
  });

/** J801.COD_MOT_SUBS (Manual ECD L9 p. 193, transcrição §1.4) — 3 dígitos, a tabela de valores
 * (não o "Tamanho 010" do leiaute, que a própria tabela contradiz — dono 23/09, A4). */
export const COD_MOT_SUBS_CODES = ['001', '002', '003', '004', '005', '099'] as const;

/** HASH_RTF / 0000.COD_HASH_SUB — 40 hex (dono 23/09, A5: o manual não declara o algoritmo; o
 * exemplo do J801 tem 40 caracteres — SHA-1 hex). */
const hash40Hex = z.string().regex(/^[0-9a-fA-F]{40}$/, 'Hash de 40 caracteres hexadecimais (SHA-1).');

/**
 * J932 — Signatário do Termo de Verificação para Fins de Substituição da ECD (Manual ECD L9 pp.
 * 203-205, transcrição §2). Dono 23/09: só o código 910 está no escopo (920/Auditor Independente
 * fora); `identQualif` (campo 04) NÃO é aceito — mesmo padrão F-C12-1 do J930, derivado
 * server-side de `codAssin` (`J932_QUALIF_910` em `lib/sped.ts`). REGRA_OBRIGATORIO_ASS_TERMO
 * (p. 204): IND_CRC/EMAIL/FONE/UF_CRC obrigatórios quando COD_ASSIN_T=910 — como todo signatário
 * aqui é 910, são obrigatórios sempre (nunca opcionais como no leiaute genérico).
 */
const VerificationTermSignerSchema = z
  .object({
    identNom: z.string().min(1),
    identCpfCnpj: signerCpfOrCnpjSchema('J930'), // mesmo objeto de domínio (CPF/CNPJ), reg. J932.
    codAssin: z.literal('910', {
      message: 'J932.COD_ASSIN_T só aceita 910 (920/Auditor Independente fora do escopo, dono 23/09).',
    }),
    indCrc: crcNumberField,
    email: z.string().min(1),
    fone: z.string().min(1),
    ufCrc: z.enum(UF_CODES),
    numSeqCrc: crcCertificateField.optional(),
    dtCrc: dateOnly.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const embedded = crcNumberUf(val.indCrc);
    if (embedded && embedded !== val.ufCrc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ufCrc'],
        message: `J932.UF_CRC_T (${val.ufCrc}) diverge da UF embutida no IND_CRC_T (${embedded}).`,
      });
    }
  });

/**
 * Termo de Verificação para Fins de Substituição da ECD (J801 + J932). Presente SÓ quando
 * `declarant.indFinEsc='1'` (substituta). `signers`: 1 a 2, ao menos um 910 (dono 23/09, A13/A10
 * — como só 910 está no escopo, TODOS são 910; a checagem "≥1 910" é trivialmente satisfeita e
 * mantida por legibilidade do contrato). REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE (p. 204):
 * a dupla CPF/CNPJ+código não pode repetir.
 */
const VerificationTermSchema = z
  .object({
    codMotSubs: z.enum(COD_MOT_SUBS_CODES, {
      message: 'J801.COD_MOT_SUBS fora da tabela (Manual ECD L9 p. 193): 001..005 ou 099.',
    }),
    descRtf: z.string().optional(),
    signers: z.array(VerificationTermSignerSchema).min(1).max(2),
    // Art. 8º §4 (prazo de substituição) — grau INFERIDO, sem página do manual transcrita para
    // esta regra específica (a transcrição J801/J932 cobre o leiaute, não o prazo legal); exigido
    // só quando o exercício está no limite (ver superRefine do schema pai).
    deadlineJustification: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasContador = val.signers.some((s) => s.codAssin === '910');
    if (!hasContador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signers'],
        message: 'REGRA_OBRIGATORIO_CONTADOR_ASS_TERMO: exige ao menos um signatário 910 (Manual ECD L9 p. 204).',
      });
    }
    const seen = new Set<string>();
    val.signers.forEach((s, i) => {
      const key = `${s.identCpfCnpj}|${s.codAssin}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['signers', i],
          message:
            'J932 duplicado: a dupla IDENT_CPF_CNPJ_T + COD_ASSIN_T já aparece em outro signatário (REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE, Manual ECD L9 p. 204).',
        });
      }
      seen.add(key);
    });
  });

/**
 * POST /sped/ecd/generate body. `year` drives the annual window (Jan 1 → Dec 31,
 * D11); the MVP is annual only (D4), so no dtIni/dtFin override is exposed.
 *
 * Retificação versionada (BE-INCR-FIXED-ASSETS PR-4, Passo 19): `declarant.indFinEsc='1'`
 * (substituta) exige `declarant.codHashSub` (40 hex), `supersedesJobId` (id do job EXPORTED que
 * está sendo substituído) e `verificationTerm` (J801+J932); `'0'` (original, default) proíbe os
 * três. O .rtf em si (J801.ARQ_RTF) chega por multipart — a rota valida a presença do arquivo
 * fora deste DTO (o Zod não carrega binário).
 */
export const SpedEcdRequestSchema = z
  .object({
    unitId: z.string().min(1),
    mappingVersion: z.string().min(1),
    year: z.number().int().gte(2000).lte(2100),
    declarant: DeclarantSchema,
    book: BookSchema,
    signers: z.array(SignerSchema).min(1),
    supersedesJobId: z.string().min(1).optional(),
    verificationTerm: VerificationTermSchema.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // Passo 19 — indFinEsc='1' ⇒ codHashSub + supersedesJobId + verificationTerm obrigatórios;
    // '0' ⇒ os três proibidos (nunca uma ECD "meio substituta").
    if (val.declarant.indFinEsc === '1') {
      if (!val.declarant.codHashSub || !hash40Hex.safeParse(val.declarant.codHashSub).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['declarant', 'codHashSub'],
          message: '0000.COD_HASH_SUB é obrigatório (40 hex) quando IND_FIN_ESC=1 (substituta).',
        });
      }
      if (!val.supersedesJobId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['supersedesJobId'],
          message: 'supersedesJobId é obrigatório quando IND_FIN_ESC=1 (substituta).',
        });
      }
      if (!val.verificationTerm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationTerm'],
          message: 'verificationTerm (J801+J932) é obrigatório quando IND_FIN_ESC=1 (substituta).',
        });
      }
    } else {
      if (val.declarant.codHashSub) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['declarant', 'codHashSub'],
          message: '0000.COD_HASH_SUB só é aceito quando IND_FIN_ESC=1 (substituta).',
        });
      }
      if (val.supersedesJobId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['supersedesJobId'],
          message: 'supersedesJobId só é aceito quando IND_FIN_ESC=1 (substituta).',
        });
      }
      if (val.verificationTerm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationTerm'],
          message: 'verificationTerm só é aceito quando IND_FIN_ESC=1 (substituta).',
        });
      }
    }
    // Prazo de substituição (art. 8º §4 — grau INFERIDO, execution-plan Passo 19; sem página do
    // manual transcrita especificamente para esta regra): exercício anterior a ano-2 → 400;
    // exatamente ano-2 → aviso, exige `verificationTerm.deadlineJustification`.
    if (val.declarant.indFinEsc === '1') {
      const currentYear = new Date().getUTCFullYear();
      const diff = currentYear - val.year;
      if (diff > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['year'],
          message: `Fora do prazo de substituição da ECD (art. 8º §4): o exercício ${val.year} é anterior a ${currentYear - 2}.`,
        });
      } else if (diff === 2 && !val.verificationTerm?.deadlineJustification) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['verificationTerm', 'deadlineJustification'],
          message: `deadlineJustification é obrigatória: o exercício ${val.year} está no limite do prazo de substituição (ano-2, art. 8º §4).`,
        });
      }
    }
    // J930 compliance (REGRA_OBRIGATORIO_ASSIN_CONTADOR / _UM_RESP_LEGAL, p. 200):
    // exactly one legal responsible, at least one contador (900) and one non-900.
    const respLegal = val.signers.filter((s) => s.indRespLegal === 'S');
    if (respLegal.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signers'],
        message: 'Deve haver exatamente um signatário responsável legal (IND_RESP_LEGAL=S).',
      });
    }
    const hasContador = val.signers.some((s) => s.codAssin === '900');
    const hasNonContador = val.signers.some((s) => s.codAssin !== '900');
    if (!hasContador || !hasNonContador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signers'],
        message: 'A ECD exige um signatário contador (COD_ASSIN=900) e um não-contador.',
      });
    }

    // F-C12-7 → (a), item 11 — REGRA_QUALIF_INV_RESP_LEGAL (Manual ECD L9 p. 202): o responsável
    // legal nunca é o contador (é o próprio exemplo oficial da p. 203 que viola esta regra).
    val.signers.forEach((s, i) => {
      if (s.indRespLegal === 'S' && s.codAssin === '900') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['signers', i, 'indRespLegal'],
          message:
            'J930.IND_RESP_LEGAL=S é inválido com COD_ASSIN=900 (REGRA_QUALIF_INV_RESP_LEGAL, Manual ECD L9 p. 202 — o contador nunca é o responsável legal).',
        });
      }
    });

    // REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE (Manual ECD L9 p. 202): chave
    // [IDENT_CPF_CNPJ + COD_ASSIN] única — a mesma pessoa pode assinar duas vezes com códigos
    // diferentes (ex.: contador 900 e procurador 309), nunca duas vezes com o mesmo código.
    const seen = new Set<string>();
    val.signers.forEach((s, i) => {
      const key = `${s.identCpfCnpj}|${s.codAssin}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['signers', i],
          message:
            'J930 duplicado: a dupla IDENT_CPF_CNPJ + COD_ASSIN já aparece em outro signatário (REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE, Manual ECD L9 p. 202).',
        });
      }
      seen.add(key);
    });
  });

export type SpedEcdRequestDto = z.infer<typeof SpedEcdRequestSchema>;
export type SpedDeclarantDto = z.infer<typeof DeclarantSchema>;
export type SpedBookDto = z.infer<typeof BookSchema>;
export type SpedSignerDto = z.infer<typeof SignerSchema>;
export type SpedVerificationTermDto = z.infer<typeof VerificationTermSchema>;
export type SpedVerificationTermSignerDto = z.infer<typeof VerificationTermSignerSchema>;
