import { z } from 'zod';
import { UF_CODES } from './SpedEcdDto';
import { CNPJ_REGEX } from '../../../lib/cnpj';
import { REGIMES_EMPRESA } from '../models/regimeEmpresa';

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 5, §4.3) — perfil fiscal da EMPRESA por ano. `.strict()`.
 *
 * Regras do `superRefine` (BRIEF item 5):
 *  - bloco `ecf` só em PRESUMIDO/REAL — MEI/SIMPLES não entregam ECF (IN RFB 2.004/2021 art. 1º §1º I);
 *  - `livroCaixaSemEscrituracao`/`distribuicaoAcimaBase` só no PRESUMIDO (IN RFB 2.003/2021 art. 3º §1º V e §3º);
 *  - `ecd.nire` só com `ecd.indNire = '1'`.
 * `declarante` (F-XP-2 → a): os campos de 0000/0030 que hoje vêm no corpo de cada geração, TODOS opcionais aqui —
 * o que falta aparece em `faltantes` do endpoint de obrigações. Regex/limites espelham `SpedEcdDto`/`SpedEcfDto`.
 */
const ANO_MIN = 2014; // ECF desde o ano-calendário 2014 (IN RFB 2.004/2021 art. 1º)

export const CompanyFiscalProfileAnoParamSchema = z
  .object({ ano: z.coerce.number().int().gte(ANO_MIN).lte(2100) })
  .strict();

export const CompanyFiscalProfileCopyParamSchema = z
  .object({ ano: z.coerce.number().int().gte(ANO_MIN).lte(2100), anoAnterior: z.coerce.number().int().gte(ANO_MIN).lte(2100) })
  .strict()
  .refine((v) => v.anoAnterior !== v.ano, { message: 'anoAnterior deve ser diferente de ano.', path: ['anoAnterior'] });

export const CompanyFiscalProfileScopeSchema = z.object({ unitId: z.string().min(1) }).strict();

/** PR-2 item 16 (F-XP-5 a) — recibo da ECF transmitida no PVA (retificadora = recibo novo; a trava fica). */
export const EcfTransmitidaSchema = z
  .object({ unitId: z.string().min(1), recibo: z.string().trim().min(1).max(100) })
  .strict();

export const CompanyDeclaranteSchema = z
  .object({
    nome: z.string().min(1).max(150),
    cnpj: z.string().regex(CNPJ_REGEX, 'CNPJ = 14 posições sem máscara: 12 alfanuméricas maiúsculas + 2 dígitos verificadores.'),
    uf: z.enum(UF_CODES),
    codMun: z.string().regex(/^\d{7}$/, 'Código IBGE do município = 7 dígitos.'),
    ie: z.string().min(1).max(20),
    im: z.string().min(1).max(20),
    codNat: z.string().regex(/^\d{3,4}$/, 'Código de natureza jurídica (tabela Sped).'),
    cnaeFiscal: z.string().regex(/^\d{7}$/, 'CNAE-Fiscal = 7 dígitos.'),
    endereco: z.string().min(1).max(150),
    num: z.string().min(1).max(6),
    compl: z.string().min(1).max(50),
    bairro: z.string().min(1).max(50),
    cep: z.string().regex(/^\d{8}$/, 'CEP = 8 dígitos (só números).'),
    numTel: z.string().min(1).max(15),
    email: z.string().email('E-mail inválido.'),
  })
  .partial()
  .strict();

export const UpsertCompanyFiscalProfileSchema = z
  .object({
    unitId: z.string().min(1), // escopo/policy apenas — a chave é (dono, ano)
    regime: z.enum(REGIMES_EMPRESA),
    grandePorte: z.boolean().nullable().default(null),
    inativa: z.boolean().default(false),
    condicoes: z
      .object({
        aporteInvestidorAnjo: z.boolean().nullable().default(null),
        livroCaixaSemEscrituracao: z.boolean().nullable().default(null),
        distribuicaoAcimaBase: z.boolean().nullable().default(null),
      })
      .strict()
      .default({ aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null }),
    declarante: CompanyDeclaranteSchema.nullable().optional(),
    ecd: z
      .object({
        indNire: z.enum(['0', '1']),
        nire: z.string().min(1).optional(),
        numOrd: z.string().min(1),
        natLivr: z.string().min(1).max(80),
      })
      .strict()
      .nullable()
      .optional(),
    ecf: z
      .object({ indAliqCsll: z.enum(['1', '4']), indRecReceita: z.enum(['1', '2']) })
      .strict()
      .nullable()
      .optional(),
    contadorContactId: z.string().min(1).nullable().optional(),
    representanteLegalSignerId: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const semEcf = v.regime === 'MEI' || v.regime === 'SIMPLES';
    if (semEcf && v.ecf) {
      ctx.addIssue({ code: 'custom', path: ['ecf'], message: `Regime ${v.regime} não entrega ECF (IN RFB 2.004/2021 art. 1º §1º I).` });
    }
    if (v.regime !== 'PRESUMIDO') {
      for (const k of ['livroCaixaSemEscrituracao', 'distribuicaoAcimaBase'] as const) {
        if (v.condicoes[k] !== null) {
          ctx.addIssue({ code: 'custom', path: ['condicoes', k], message: `${k} só se aplica ao Lucro Presumido (IN RFB 2.003/2021 art. 3º §1º V e §3º).` });
        }
      }
    }
    if (v.ecd?.nire && v.ecd.indNire !== '1') {
      ctx.addIssue({ code: 'custom', path: ['ecd', 'nire'], message: "nire só cabe com indNire = '1'." });
    }
  });

export type UpsertCompanyFiscalProfileInput = z.infer<typeof UpsertCompanyFiscalProfileSchema>;
export type CompanyDeclarante = z.infer<typeof CompanyDeclaranteSchema>;
