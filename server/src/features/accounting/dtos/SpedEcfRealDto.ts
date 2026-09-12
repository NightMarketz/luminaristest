import { z } from 'zod';
import { DeclarantSchema, SignerSchema, refineEcfSigners } from './SpedEcfDto';

/**
 * Zod DTO for SPED ECF generation — Lucro Real (ADR-INCR-SPED-ECF-FASE3, esqueleto;
 * BRIEF `BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md` §2 + item 3). Serviço/rota dedicados
 * (Fork 1→(b), ratificado 2026-09-02): este DTO é o corpo de `POST /sped/ecf/real/generate`.
 *
 * REUSO (item 3): `DeclarantSchema` (0000/0030) e `SignerSchema` (0930) são o MESMO objeto de
 * domínio do Presumido e vêm importados de `SpedEcfDto.ts` — nunca redigitados.
 *
 * O que é diferente do Presumido, e por quê cada campo fiscal existe:
 *  - `formaTrib` (0010.FORMA_TRIB) — default `'1'` = Lucro Real, RATIFICADO pelo dono em
 *    2026-09-02 ("Ratifico FORMA_TRIB=1 como default, aplica"). Artefato:
 *    `docs/accounting/BE-INCR-SPED-ECF-layout-transcription.md:85` (Manual da ECF p. 13 §1.3,
 *    "recuperação da ECF anterior do Lucro REAL — FORMA_TRIB=1"). O caller ainda pode informar
 *    outro dígito; o servidor só supre a ausência.
 *  - `formaTribPer` (0010.FORMA_TRIB_PER) — OBRIGATÓRIO, SEM DEFAULT, pela MESMA regra: o
 *    default da lib (`'PPPP'`, `ecf.ts` Reg0010Input) é o código do Presumido e não pode vazar
 *    para um arquivo do Real. Alfabeto VERIFICADO (BRIEF 3B item 2; Manual do Leiaute 12 pp.71-72,
 *    campo 7, `C 4`, `[0;R;P;A;E;S]`): um caractere por trimestre (Fork 5→(a), 4 janelas) ⇒
 *    `/^[0RPAES]{4}$/`. `'PPPP'` é VÁLIDO no Manual — o que vaza é o DEFAULT, não o valor.
 *  - `codVer` (0000.COD_VER) — OPCIONAL, override do caller (Fork 7→(a)); ausente ⇒ tabela
 *    ano→leiaute em `lib/ecf.ts` (`resolveEcfCodVer`), erro explícito para ano sem leiaute.
 *  - `formaApur` (0010.FORMA_APUR) — Fork 5→(a) Trimestral ratificado ⇒ enum fechado `['T']`
 *    com default `'T'`; entra como parâmetro (BRIEF item 9), não como constante do serializer.
 *  - `indAliqCsll`/`indRecReceita` — mesmo shape e defaults do Presumido (reuso direto).
 *
 * O que NÃO existe aqui e NÃO deve existir (BRIEF 3B §2.1): `hashEcfAnterior` — Fork 2→(d), Manual
 * p.70 campo 2 "preenchido automaticamente pelo sistema" (Obrigatório=Não): o PVA preenche na
 * recuperação da ECF anterior, o `.txt` emite vazio, `.strict()` recusa a chave; e os ajustes do
 * e-Lalur — Fork 4→(b): o gerador LÊ do model (`LalurEntry`), o DTO de geração não os carrega.
 */

const FiscalRealSchema = z
  .object({
    // 0010.FORMA_TRIB — 1 dígito; valor informado pelo caller (sem default, ver cabeçalho).
    formaTrib: z.string().regex(/^\d$/, 'FORMA_TRIB = 1 dígito (tabela do Manual da ECF).').default('1'),
    // 0010.FORMA_TRIB_PER — 4 posições (uma por trimestre) no alfabeto do Manual pp.71-72; sem default.
    formaTribPer: z
      .string()
      .regex(/^[0RPAES]{4}$/, 'FORMA_TRIB_PER = 4 posições em [0;R;P;A;E;S], uma por trimestre (Manual pp.71-72).'),
    // 0000.COD_VER — override opcional (Fork 7→(a)); 4 dígitos como '0012'.
    codVer: z.string().regex(/^\d{4}$/, 'COD_VER = 4 dígitos (ex.: 0012).').optional(),
    // 0010.FORMA_APUR — Fork 5→(a): Trimestral.
    formaApur: z.enum(['T']).default('T'),
    // 0020.IND_ALIQ_CSLL — ECF ≥ 2019 ∈ {1 (9%), 4 (15%)} (REGRA_PREENCHIMENTO_IND_ALIQ_CSSL).
    indAliqCsll: z.enum(['1', '4']).default('1'),
    // 0010.IND_REC_RECEITA — 2 = Regime de Competência (default; mantém a ECD).
    indRecReceita: z.enum(['1', '2']).default('2'),
  })
  .strict();

/**
 * POST /sped/ecf/real/generate body. `year` drives the four quarterly windows (Fork 5→(a)).
 * `fiscal` é OBRIGATÓRIO (não tem default de bloco) porque `formaTribPer` não tem default —
 * omitir o bloco é 400. Só `formaTrib` tem default ratificado (`'1'`).
 */
export const SpedEcfRealRequestSchema = z
  .object({
    unitId: z.string().min(1),
    year: z.number().int().gte(2015).lte(2100),
    declarant: DeclarantSchema,
    fiscal: FiscalRealSchema,
    signers: z.array(SignerSchema).min(1).max(2),
  })
  .strict()
  .superRefine(refineEcfSigners);

export type SpedEcfRealRequestDto = z.infer<typeof SpedEcfRealRequestSchema>;
