import { z } from 'zod';
import { UF_CODES } from './SpedEcdDto';
import { CNPJ_REGEX } from '../../../lib/cnpj';
import { REGIMES_EMPRESA } from '../models/regimeEmpresa';
import { isValidDateOnly } from '../models/dates';

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 5, §4.3) — perfil fiscal da EMPRESA por ano. `.strict()`.
 *
 * Regras do `superRefine` (BRIEF item 5):
 *  - bloco `ecf` só em PRESUMIDO/REAL — MEI/SIMPLES não entregam ECF (IN RFB 2.004/2021 art. 1º §1º I);
 *  - `livroCaixaSemEscrituracao`/`distribuicaoAcimaBase` só no PRESUMIDO (IN RFB 2.003/2021 art. 3º §1º V e §3º);
 *  - `ecd.nire` só com `ecd.indNire = '1'`.
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 1, 2, 2b; ADR D1):
 *  - `formaApuracaoIrpjCsll` em SIMPLES/MEI ⇒ 400; PRESUMIDO + ANUAL ⇒ 400 (o `ANUAL` do REAL é da Fase B, item 1);
 *  - `lucroRealObrigatorio` só no REAL (contrato §2: "só REAL: 0220 × 3373");
 *  - `lc224AcrescimoSuspenso = true` exige `lc224LiminarReferencia` (F-TA-5 a);
 *  - datas de atividade date-only com calendário validado (F-TA-4 b).
 * BE-INCR-TAX-ASSESSMENT Fase B (nó X7, BRIEF B item 3b; F-TB-5 b): `prestadoraExclusivaServicos` — a declaração da
 * PJ × ano de que se enquadra na IN RFB 1.700/2017 art. 33 § 7º (16% na estimativa). A trava é do service. Fase B
 * PR-4 (BRIEF B item 1, F-TB-8.1): `ANUAL` liberado no REAL; a troca de forma com o e-Lalur do ano preenchido é do
 * service (item 2).
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

export const FORMAS_APURACAO_IRPJ_CSLL = ['TRIMESTRAL', 'ANUAL'] as const;

const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

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

export const IBS_CBS_OPCOES = ['DAS', 'REGULAR'] as const;
/** X14 F-PR4-12 (b), dono 10/10: regime de apuração da receita no Simples (Res. CGSN 140 art. 16). */
export const SIMPLES_REGIMES_APURACAO = ['COMPETENCIA', 'CAIXA'] as const;

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
      .object({ indAliqCsll: z.enum(['1', '3', '4', '7', '8']), indRecReceita: z.enum(['1', '2']) })
      .strict()
      .nullable()
      .optional(),
    contadorContactId: z.string().min(1).nullable().optional(),
    representanteLegalSignerId: z.string().min(1).nullable().optional(),
    formaApuracaoIrpjCsll: z.enum(FORMAS_APURACAO_IRPJ_CSLL).nullable().default(null),
    lucroRealObrigatorio: z.boolean().nullable().default(null),
    inicioAtividadeEm: dateOnly('inicioAtividadeEm').nullable().default(null),
    encerramentoAtividadeEm: dateOnly('encerramentoAtividadeEm').nullable().default(null),
    lc224AcrescimoSuspenso: z.boolean().default(false),
    lc224LiminarReferencia: z.string().trim().min(1).max(60).nullable().default(null),
    prestadoraExclusivaServicos: z.boolean().default(false),
    declaraNaoProfissaoRegulamentada: z.boolean().default(false),
    // BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, item 14; F-SN-11 → a): IBS/CBS no DAS ou pelo regime regular, por
    // semestre, a partir de 2027 (LC 123 art. 13 §§ 9º–10, red. LC 214). null = DAS. O ano é checado no serviço.
    ibsCbsOpcaoS1: z.enum(IBS_CBS_OPCOES).nullable().default(null),
    ibsCbsOpcaoS2: z.enum(IBS_CBS_OPCOES).nullable().default(null),
    // BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, item 25; fork L1): enquadramento do MEI no Anexo XI — contribuinte de ICMS
    // e/ou de ISS (Res. CGSN 140 art. 101 II/III e § 1º). Só no regime MEI; null = não declarado.
    meiContribuinteIcms: z.boolean().nullable().default(null),
    meiContribuinteIss: z.boolean().nullable().default(null),
    // X14 PR-4 (F-PR4-13): MEI transportador autônomo de cargas (Res. CGSN 140 art. 100 § 1º-A). Só no regime MEI.
    meiTransportadorCargas: z.boolean().nullable().default(null),
    // SIMPLES-PISO-ANEXO-XI item 12 (F-AX-2 a): ocupações do MEI = chaves da tabela MEI_ANEXO_XI (Res. CGSN 140 art. 100
    // caput e § 1º-C I). Existência/vigência da chave no ano é checada no serviço (400, decisão do dono 10/10).
    meiOcupacoes: z.array(z.string().regex(/^[AB]-\d{4}$/, 'Chave do Anexo XI = A-0001 ou B-0001.')).min(1).max(20).nullable().default(null),
    // X14 F-PR4-12 (b), dono 10/10: regime de apuração da receita no Simples. Default COMPETENCIA.
    simplesRegimeApuracao: z.enum(SIMPLES_REGIMES_APURACAO).default('COMPETENCIA'),
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
    // X7 item 1 (ADR D1)
    if (semEcf && v.formaApuracaoIrpjCsll !== null) {
      ctx.addIssue({ code: 'custom', path: ['formaApuracaoIrpjCsll'], message: `Regime ${v.regime} não apura IRPJ/CSLL por forma trimestral/anual (ADR-INCR-TAX-ASSESSMENT D1).` });
    } else if (v.formaApuracaoIrpjCsll === 'ANUAL' && v.regime === 'PRESUMIDO') {
      ctx.addIssue({ code: 'custom', path: ['formaApuracaoIrpjCsll'], message: 'Lucro Presumido é só trimestral (ADR-INCR-TAX-ASSESSMENT D1).' });
    }
    if (v.regime !== 'REAL' && v.lucroRealObrigatorio !== null) {
      ctx.addIssue({ code: 'custom', path: ['lucroRealObrigatorio'], message: 'lucroRealObrigatorio só se aplica ao Lucro Real (código 0220 × 3373).' });
    }
    // X7 item 2b (F-TA-5 a)
    if (v.lc224AcrescimoSuspenso && !v.lc224LiminarReferencia) {
      ctx.addIssue({ code: 'custom', path: ['lc224LiminarReferencia'], message: 'informe o processo da liminar' });
    }
    // X14 PR-2 item 14 — a opção só existe para optante ME/EPP
    if (v.regime !== 'SIMPLES') {
      for (const k of ['ibsCbsOpcaoS1', 'ibsCbsOpcaoS2'] as const) {
        if (v[k] !== null) ctx.addIssue({ code: 'custom', path: [k], message: 'A opção do IBS/CBS por semestre é do optante pelo Simples Nacional (LC 123 art. 13 §§ 9º–10).' });
      }
    }
    // X14 PR-4 item 25 — o enquadramento do Anexo XI só existe para o MEI
    if (v.regime !== 'MEI') {
      for (const k of ['meiContribuinteIcms', 'meiContribuinteIss', 'meiTransportadorCargas', 'meiOcupacoes'] as const) {
        if (v[k] !== null) ctx.addIssue({ code: 'custom', path: [k], message: 'O enquadramento ICMS/ISS do Anexo XI é do MEI (Res. CGSN 140 art. 101 § 1º).' });
      }
    }
    // BE-INCR-TAX-PRESUMIDO-16 item 11 (F-P16-1 a)
    if (v.regime === 'PRESUMIDO' && v.prestadoraExclusivaServicos && !v.declaraNaoProfissaoRegulamentada) {
      ctx.addIssue({
        code: 'custom',
        path: ['declaraNaoProfissaoRegulamentada'],
        message:
          'confirme que a empresa não é sociedade de profissão legalmente regulamentada nem presta serviço hospitalar ou de transporte — sem isso o 16% não se aplica (Lei 9.250/1995 art. 40 parágrafo único).',
      });
    }
  });

export type UpsertCompanyFiscalProfileInput = z.infer<typeof UpsertCompanyFiscalProfileSchema>;

/**
 * X13 PR-3 item 19 (F-OBP-6 → c): bloco `fiscal` do `POST /dashboard/create` — o onboarding pergunta SÓ regime e porte,
 * com "não sei" (`NAO_SEI` ⇒ nada é criado; o resto do perfil vem depois, no formulário). Pergunta fechada: o modelo
 * da entrevista não infere o regime (item 20).
 */
export const OnboardingFiscalSchema = z
  .object({
    regime: z.enum([...REGIMES_EMPRESA, 'NAO_SEI']),
    grandePorte: z.boolean().nullable().optional(),
  })
  .strict();
export type OnboardingFiscalInput = z.infer<typeof OnboardingFiscalSchema>;
export type CompanyDeclarante = z.infer<typeof CompanyDeclaranteSchema>;
