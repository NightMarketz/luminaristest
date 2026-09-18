import { z } from 'zod';
import { CNPJ_REGEX, CPF_REGEX } from '../../../lib/cnpj';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 19 + §3) — transcrição do leiaute da DPS (NFS-e nacional, Anexo I
 * v1.01). `.strict()` em toda a árvore: campo fora do leiaute é bug nosso, não silêncio. Dinheiro como
 * string "0.00" (o parceiro/ADN espera texto, não float) — a CONVERSÃO cents -> string mora no
 * assembler (FiscalDocumentEmissionService), nunca aqui.
 *
 * NÃO valide de memória (I052): cada campo cita o item do leiaute entre colchetes.
 */

const Money = z.string().regex(/^\d{1,15}\.\d{2}$/); // 1-15V2
const Pct2 = z.string().regex(/^\d{1,2}\.\d{2}$/); // 1-2V2
const Ibge7 = z.string().regex(/^\d{7}$/);

export const DpsPayloadSchema = z
  .object({
    versao: z.literal('1.01'),
    infDPS: z
      .object({
        id: z.string().regex(/^DPS\d{42}$/), // [102] "DPS"+cMun7+tpInsc1+insc14+serie5+nDPS15
        tpAmb: z.union([z.literal(1), z.literal(2)]), // [103]
        dhEmi: z.string().datetime({ offset: true }), // [104]
        verAplic: z.string().min(1).max(20), // [105]
        serie: z.number().int().min(1).max(49999), // [106] E0010
        nDPS: z.number().int().min(1).max(999999999999999), // [107]
        dCompet: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // [108] = sale.date
        tpEmit: z.literal(1), // [109]
        cLocEmi: Ibge7, // [112]
        prest: z
          .object({
            CNPJ: z.string().regex(CNPJ_REGEX), // [118] alfanumérico (#280 / F-DFE-17 a)
            IM: z.string().max(15).optional(), // [123]
            xNome: z.string().max(150).optional(), // [124]
            regTrib: z
              .object({
                opSimpNac: z.union([z.literal(1), z.literal(3)]), // [140] MEI (2) fora do MVP
                regApTribSN: z.number().int().min(1).max(3).optional(), // [141]
                regEspTrib: z.number().int().min(0).max(9), // [142]
              })
              .strict(),
          })
          .strict(),
        toma: z
          .object({
            // [143] sempre presente (F-DFE-7 b)
            CNPJ: z.string().regex(CNPJ_REGEX).optional(),
            CPF: z.string().regex(CPF_REGEX).optional(), // + DV no serviço (lib/cpf.ts, F-DFE-17 a)
            xNome: z.string().min(1).max(150),
            end: z
              .object({
                // F-DFE-14; obrigatório se tpRetISSQN=2 (E0237)
                endNac: z.object({ cMun: Ibge7, CEP: z.string().regex(/^\d{8}$/) }).strict(),
                xLgr: z.string().min(1).max(255),
                nro: z.string().min(1).max(60),
                xCpl: z.string().max(156).optional(),
                xBairro: z.string().min(1).max(60),
              })
              .strict()
              .optional(),
          })
          .strict()
          .refine((t) => Boolean(t.CNPJ) !== Boolean(t.CPF), 'CNPJ xor CPF'),
        serv: z
          .object({
            locPrest: z.object({ cLocPrestacao: Ibge7 }).strict(), // [192]
            cServ: z
              .object({
                cTribNac: z.string().regex(/^\d{6}$/), // [195] — refine ∈ lista transcrita no serviço
                cTribMun: z.string().regex(/^\d{3}$/).optional(), // [196]
                xDescServ: z.string().min(1).max(1000), // [197]
                cNBS: z.string().regex(/^\d{9}$/).optional(), // [198]
                cIntContrib: z.string().max(20).optional(), // [199]
              })
              .strict(),
            infoCompl: z.object({ xInfComp: z.string().max(2000).optional() }).strict().optional(),
          })
          .strict(),
        valores: z
          .object({
            vServPrest: z.object({ vServ: Money }).strict(), // [250]
            vDescCondIncond: z
              .object({ vDescIncond: Money.optional(), vDescCond: Money.optional() })
              .strict()
              .optional(), // F-DFE-15
            trib: z
              .object({
                tribMun: z
                  .object({
                    tribISSQN: z.literal(1), // [301]
                    tpRetISSQN: z.union([z.literal(1), z.literal(2)]), // [311]
                    pAliq: Pct2.optional(), // [312] <= 5.00 (E0595)
                  })
                  .strict(),
                totTrib: z.union([
                  // [325] choice 1-1
                  z
                    .object({
                      pTotTrib: z.object({ pTotTribFed: Pct2, pTotTribEst: Pct2, pTotTribMun: Pct2 }).strict(),
                    })
                    .strict(),
                  z.object({ pTotTribSN: Pct2 }).strict(), // só SIMPLES (E0713)
                ]),
              })
              .strict(),
          })
          .strict(),
        IBSCBS: z // [336] opcional
          .object({
            finNFSe: z.literal(0),
            cIndOp: z.string().regex(/^\d{6}$/),
            indDest: z.literal(0),
            valores: z
              .object({
                trib: z
                  .object({
                    gIBSCBS: z
                      .object({ CST: z.string().regex(/^\d{3}$/), cClassTrib: z.string().regex(/^\d{6}$/) })
                      .strict(),
                  })
                  .strict(),
              })
              .strict(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

export type DpsPayload = z.infer<typeof DpsPayloadSchema>;
