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
 *    para um arquivo do Real; o código do Real não está transcrito. Comprimento 4 = um
 *    caractere por trimestre (Fork 5→(a) trimestral, 4 janelas); o alfabeto do código não é
 *    restringido porque não foi verificado.
 *  - `formaApur` (0010.FORMA_APUR) — Fork 5→(a) Trimestral ratificado ⇒ enum fechado `['T']`
 *    com default `'T'`; entra como parâmetro (BRIEF item 9), não como constante do serializer.
 *  - `indAliqCsll`/`indRecReceita` — mesmo shape e defaults do Presumido (reuso direto).
 *
 * O que NÃO existe aqui (forks pendentes — BRIEF §2/§3): `hashEcfAnterior` (Fork 2) e
 * `lalurAdjustments` (Fork 4). `HASH_ECF_ANTERIOR` sai vazio como no Presumido.
 */

const FiscalRealSchema = z
  .object({
    // 0010.FORMA_TRIB — 1 dígito; valor informado pelo caller (sem default, ver cabeçalho).
    formaTrib: z.string().regex(/^\d$/, 'FORMA_TRIB = 1 dígito (tabela do Manual da ECF).').default('1'),
    // 0010.FORMA_TRIB_PER — 4 posições (uma por trimestre); sem default (ver cabeçalho).
    formaTribPer: z.string().length(4, 'FORMA_TRIB_PER = 4 posições (uma por trimestre).'),
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
