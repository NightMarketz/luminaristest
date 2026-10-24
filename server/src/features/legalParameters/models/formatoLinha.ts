import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates';
import { REGIMES_EMPRESA } from '../../accounting/models/regimeEmpresa';
import { ORDEM_OBRIGACOES, STATUS_OBRIGACAO } from '../../accounting/models/obrigacoesPorRegime';
import { REGRAS_VENCIMENTO_IBS_CBS } from '../../accounting/models/ibsCbsParams';
import { EnquadramentoJsonSchema, FaixaJsonSchema, ReparticaoJsonSchema, TetoIssJsonSchema } from '../../accounting/models/simplesCalc';
import type { LegalParameterTabela } from './legalParameter';

/**
 * BE-INCR-LEGAL-PARAMS PR-2 (BRIEF §4: `valorJson` "validado por um schema por tabela") — o formato de cada linha por
 * tabela: chave, discriminador e QUAL valor (int, texto ou JSON) com que forma. É o que o consumidor em código sabe
 * ler; linha fora do formato ⇒ 400 na proposta (`exigirFormato`), nunca um cálculo quebrando depois da publicação.
 * O mesmo predicado roda sobre a semente (teste-guarda), então o banco migrado e uma linha nova obedecem à mesma regra.
 */
export interface LinhaParaFormato {
  tabela: LegalParameterTabela;
  chave: string;
  discriminador?: string | null;
  valorInt?: number | null;
  valorTexto?: string | null;
  valorJson?: unknown;
}

const NOMES_CODIGO_RECEITA_IRPJ_CSLL = [
  'IRPJ_PRESUMIDO', 'IRPJ_REAL_TRIMESTRAL_OBRIGADA', 'IRPJ_REAL_TRIMESTRAL_OPTANTE', 'CSLL_PRESUMIDO', 'CSLL_REAL_TRIMESTRAL',
  'IRPJ_ESTIMATIVA_OBRIGADA', 'IRPJ_ESTIMATIVA_OPTANTE', 'CSLL_ESTIMATIVA', 'IRPJ_AJUSTE_ANUAL_OBRIGADA', 'IRPJ_AJUSTE_ANUAL_OPTANTE',
  'CSLL_AJUSTE_ANUAL', 'IRPJ_DIFERENCA_POSTERGADA_16_OBRIGADA', 'IRPJ_DIFERENCA_POSTERGADA_16_OPTANTE',
  'IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16',
] as const;
export type NomeCodigoReceita = (typeof NOMES_CODIGO_RECEITA_IRPJ_CSLL)[number];
export const NOMES_CODIGO_RECEITA: ReadonlySet<string> = new Set(NOMES_CODIGO_RECEITA_IRPJ_CSLL);

const status = z.enum(STATUS_OBRIGACAO);
const texto = z.string().trim().min(1);

export const NcmMonofasicoJson = z.object({ ordem: z.number().int().min(1), exceto: z.array(z.string().regex(/^\d{8}$/)).min(1).optional() }).strict();
export const ObrigacaoRegimeJson = z
  .object({
    statusBase: status,
    condicoes: z.array(
      z
        .object({
          chave: z.enum(['aporteInvestidorAnjo', 'livroCaixaSemEscrituracao', 'distribuicaoAcimaBase']),
          quandoTrue: status,
          pergunta: texto,
          fonte: texto,
        })
        .strict(),
    ),
    perguntaBase: texto.optional(),
    inativa: z.object({ status, fonte: texto, pergunta: texto.optional() }).strict(),
  })
  .strict();
export const Lc116ServicoJson = z
  .object({
    linha: z.number().int().min(1),
    descricao: texto,
    li: z.array(z.enum(['EP', 'LP', 'ET'])),
    grupo: z.enum(['obra', 'atvEvento']).nullable(),
  })
  .strict();

/**
 * PR-3 (item 9; questionário do dono 07/10: "chave=sourceRow, disc=source") — linha do Anexo III. `valorInt` = taxa
 * anual em bp; o resto do que o bem e a lista de taxas mostram vai no JSON. As 2 Notas não têm `sourceRow` na fonte:
 * chave `NOTA`, distinguidas pelo discriminador.
 */
export const DEPRECIACAO_ANEXO_III_FONTES = ['ANEXO_III_IN_1700_2017', 'ANEXO_III_NOTA_1', 'ANEXO_III_NOTA_2'] as const;
export const DepreciacaoAnexoJson = z
  .object({
    annualRateBp: z.number().int().min(1).max(10_000),
    ncm: z.string().trim().min(1).nullable(),
    description: texto,
    lifeYears: z.number().int().min(1),
    justification: texto.optional(),
  })
  .strict();

/** SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF §4 `MeiAnexoXiLinha`) — linha do Anexo XI da Res. CGSN 140. */
export const MeiAnexoXiJson = z
  .object({ ocupacao: texto, cnae: z.string().regex(/^\d{4}-\d\/\d{2}$/), descricaoCnae: texto, iss: z.boolean(), icms: z.boolean() })
  .strict();

type Valor = 'int' | 'texto' | 'json';
interface Regra {
  /** Função quando a tabela mistura chaves de valor inteiro e de texto (IRRF_DISTRIBUICAO). */
  valor: Valor | ((l: LinhaParaFormato) => Valor);
  /** Erro em português ou `null` quando a linha está no formato. */
  checar: (l: LinhaParaFormato) => string | null;
}

const so = (cond: boolean, msg: string): string | null => (cond ? null : msg);
const semDisc = (l: LinhaParaFormato) => l.discriminador === undefined || l.discriminador === null;
const jsonOk = (schema: z.ZodType, v: unknown, msg: string): string | null => (schema.safeParse(v).success ? null : msg);

const bp = (l: LinhaParaFormato) => (l.valorInt ?? -1) >= 0 && (l.valorInt ?? 0) <= 10_000;
/** BE-INCR-IRRF-DISTRIBUICAO item 5 — chaves da tabela e o tipo de valor de cada uma. */
const IRRF_DISTRIBUICAO_CHAVES_INT = ['ALIQUOTA_PF_BP', 'LIMITE_MENSAL_PF_CENTS', 'ALIQUOTA_JCP_BP'];
/** D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO — chave = anexo; faixa F1..F6 nas tabelas por faixa (o que `simplesCalc` lê). */
const anexo = (l: LinhaParaFormato) => ['I', 'II', 'III', 'IV', 'V'].includes(l.chave);
const faixa = (l: LinhaParaFormato) => /^F[1-6]$/.test(l.discriminador ?? '');

const REGRAS: Partial<Record<LegalParameterTabela, Regra>> = {
  CODIGO_RECEITA: {
    valor: 'texto',
    checar: (l) =>
      so(/^\d{6}$/.test(l.valorTexto ?? ''), 'valorTexto = código de receita de 6 dígitos (código + variação)') ??
      so(
        (NOMES_CODIGO_RECEITA.has(l.chave) && semDisc(l)) ||
          (['PIS', 'COFINS'].includes(l.chave) && ['CUMULATIVO', 'NAO_CUMULATIVO'].includes(l.discriminador ?? '')),
        'chave = nome do código IRPJ/CSLL (sem discriminador) ou PIS|COFINS com discriminador CUMULATIVO|NAO_CUMULATIVO',
      ),
  },
  PIS_COFINS_MONOFASICO_NCM: {
    valor: 'json',
    checar: (l) =>
      so(/^\d{2,8}$/.test(l.chave) && semDisc(l), 'chave = prefixo de 2 a 8 dígitos do NCM, sem discriminador') ??
      jsonOk(NcmMonofasicoJson, l.valorJson, 'valorJson = { ordem: inteiro ≥ 1, exceto?: [NCM de 8 dígitos] }'),
  },
  CST_PIS_COFINS: {
    valor: 'texto',
    checar: (l) => so(/^\d{2}$/.test(l.chave) && semDisc(l) && ['SEM_CREDITO', 'TRIBUTADO'].includes(l.valorTexto ?? ''), 'chave = CST de 2 dígitos; valorTexto SEM_CREDITO|TRIBUTADO'),
  },
  CFOP_IMOBILIZADO: {
    valor: 'texto',
    checar: (l) => so(/^\d{4}$/.test(l.chave) && semDisc(l) && l.valorTexto === 'ENTRADA_IMOBILIZADO', 'chave = CFOP de 4 dígitos; valorTexto ENTRADA_IMOBILIZADO'),
  },
  NFE_CSTAT_AUTORIZADA: {
    valor: 'texto',
    checar: (l) => so(/^\d{3}$/.test(l.chave) && semDisc(l) && l.valorTexto === 'AUTORIZADA', 'chave = cStat de 3 dígitos; valorTexto AUTORIZADA'),
  },
  OBRIGACAO_REGIME: {
    valor: 'json',
    checar: (l) =>
      // Achado 4 do #861: a chave é qualquer obrigação da matriz (ORDEM_OBRIGACOES), não só as do PR-2.
      so((ORDEM_OBRIGACOES as readonly string[]).includes(l.chave) && (REGIMES_EMPRESA as readonly string[]).includes(l.discriminador ?? ''), `chave ${ORDEM_OBRIGACOES.join('|')}; discriminador = regime (MEI|SIMPLES|PRESUMIDO|REAL)`) ??
      jsonOk(ObrigacaoRegimeJson, l.valorJson, 'valorJson = { statusBase, condicoes[], perguntaBase?, inativa }'),
  },
  LC116_SERVICO: {
    valor: 'json',
    checar: (l) =>
      so(/^\d{6}$/.test(l.chave) && semDisc(l), 'chave = cTribNac de 6 dígitos, sem discriminador') ??
      jsonOk(Lc116ServicoJson, l.valorJson, 'valorJson = { linha, descricao, li: [EP|LP|ET], grupo: obra|atvEvento|null }'),
  },
  ISS_LIMITE: {
    valor: 'int',
    checar: (l) => so(l.chave === 'ALIQUOTA_MAX_BP' && semDisc(l) && (l.valorInt ?? -1) >= 0 && (l.valorInt ?? 0) <= 10_000, 'chave ALIQUOTA_MAX_BP; valorInt em bp (0..10000)'),
  },
  LEIAUTE_SPED: {
    valor: 'texto',
    checar: (l) =>
      so(
        semDisc(l) && ((l.chave === 'ECD' && /^\d+\.\d{2}$/.test(l.valorTexto ?? '')) || (l.chave === 'ECF' && /^\d{4}$/.test(l.valorTexto ?? ''))),
        'chave ECD (valorTexto 9.99) ou ECF (valorTexto de 4 dígitos)',
      ),
  },
  DEPRECIACAO_ANEXO_III: {
    valor: 'json',
    checar: (l) =>
      so(
        (/^\d+$/.test(l.chave) || l.chave === 'NOTA') && (DEPRECIACAO_ANEXO_III_FONTES as readonly string[]).includes(l.discriminador ?? ''),
        'chave = linha da fonte (sourceRow) ou NOTA; discriminador ANEXO_III_IN_1700_2017|ANEXO_III_NOTA_1|ANEXO_III_NOTA_2',
      ) ??
      jsonOk(DepreciacaoAnexoJson, l.valorJson, 'valorJson = { annualRateBp: 1..10000, ncm: string|null, description, lifeYears ≥ 1, justification? }'),
  },
  MEI_ANEXO_XI: {
    valor: 'json',
    checar: (l) =>
      so(/^[AB]-\d{4}$/.test(l.chave) && l.discriminador === l.chave.slice(0, 1), 'chave = tabela + ordinal da fonte (A-0001…); discriminador = A|B da chave') ??
      jsonOk(MeiAnexoXiJson, l.valorJson, 'valorJson = { ocupacao, cnae 0000-0/00, descricaoCnae, iss, icms }'),
  },
  FERIADO_NACIONAL: {
    valor: 'texto',
    checar: (l) => so(/^\d{2}-\d{2}$/.test(l.chave) && isValidDateOnly(`2024-${l.chave}`) && semDisc(l) && l.valorTexto === 'FIXO', 'chave = MM-DD de calendário; valorTexto FIXO'),
  },
  // F-E4-1 (a): discriminador = código IBGE da UF (2 dígitos) ou do município (7); data fixa MM-DD ou móvel PASCOA±N.
  FERIADO_LOCAL: {
    valor: 'texto',
    checar: (l) => so(
      /^(\d{2}|\d{7})$/.test(l.discriminador ?? '') &&
        ((l.valorTexto === 'FIXO' && /^\d{2}-\d{2}$/.test(l.chave) && isValidDateOnly(`2024-${l.chave}`)) ||
          (l.valorTexto === 'PASCOA' && /^PASCOA[+-]\d{1,3}$/.test(l.chave))),
      'discriminador = IBGE da UF (2) ou do município (7); chave MM-DD com valorTexto FIXO, ou PASCOA±N com valorTexto PASCOA',
    ),
  },
  // BE-INCR-IRRF-DISTRIBUICAO item 5: alíquotas em bp, limite mensal em centavos (Lei 9.250 art. 6º-A; Lei 9.249 art. 9º
  // § 2º) e o prazo de aprovação do lucro da transição (date-only, art. 6º-A § 3º II; liminar das ADIs 7.912/7.914).
  IRRF_DISTRIBUICAO: {
    valor: (l) => (l.chave === 'TRANSICAO_APROVACAO_ATE' ? 'texto' : 'int'),
    checar: (l) =>
      so(semDisc(l), 'sem discriminador') ??
      (l.chave === 'TRANSICAO_APROVACAO_ATE'
        ? so(isValidDateOnly(l.valorTexto ?? ''), 'TRANSICAO_APROVACAO_ATE: valorTexto = data YYYY-MM-DD de calendário')
        : l.chave === 'LIMITE_MENSAL_PF_CENTS'
          ? so((l.valorInt ?? 0) > 0, 'LIMITE_MENSAL_PF_CENTS: valorInt = centavos > 0')
          : so(IRRF_DISTRIBUICAO_CHAVES_INT.includes(l.chave) && bp(l), 'chave ALIQUOTA_PF_BP|ALIQUOTA_JCP_BP (valorInt em bp 0..10000), LIMITE_MENSAL_PF_CENTS ou TRANSICAO_APROVACAO_ATE')),
  },
  // F-IRD-13/F-IRD-18: chave = trimestre YYYY-T0n; valorInt = taxa MENSAL publicada pela RFB em décimos de milésimo de ponto
  // percentual (0,7742% = 7742).
  TJLP: {
    valor: 'int',
    checar: (l) => so(/^\d{4}-T0[1-4]$/.test(l.chave) && semDisc(l) && (l.valorInt ?? 0) > 0, 'chave = trimestre YYYY-T01..T04; valorInt = taxa mensal (0,7742% = 7742) > 0'),
  },
  // Achado 1 do #861: a linha VENCIMENTO (PR-5) é de texto — a regra que `vencimentoIbsCbsDe` sabe ler; as alíquotas seguem
  // valorInt, como na regra do PR-1.
  IBS_CBS: {
    valor: (l) => (l.discriminador === 'VENCIMENTO' ? 'texto' : 'int'),
    checar: (l) =>
      l.discriminador === 'VENCIMENTO'
        ? so(['IBS', 'CBS'].includes(l.chave) && (REGRAS_VENCIMENTO_IBS_CBS as readonly string[]).includes(l.valorTexto ?? ''), `chave IBS|CBS; valorTexto = regra de vencimento (${REGRAS_VENCIMENTO_IBS_CBS.join('|')})`)
        : so(
            ((l.chave === 'CBS' && l.discriminador === 'ALIQUOTA') || (l.chave === 'IBS' && ['ALIQUOTA_UF', 'ALIQUOTA_MUN'].includes(l.discriminador ?? ''))) && bp(l),
            'chave CBS com discriminador ALIQUOTA, ou IBS com ALIQUOTA_UF|ALIQUOTA_MUN (ou VENCIMENTO); valorInt em bp (0..10000)',
          ),
  },
  // IBS-CBS-2027 PR-3 (item 15; dono 21/10): lista de uso ou consumo pessoal (LC 214 art. 57) — chave = prefixo de NCM.
  IBS_CBS_USO_CONSUMO: {
    valor: 'texto',
    checar: (l) => so(/^\d{2,8}$/.test(l.chave) && semDisc(l), 'chave = prefixo de NCM (2 a 8 dígitos); valorTexto = categoria do art. 57'),
  },
  // IBS-CBS-2027 PR-3 (dono 22/10): taxa de referência PROVISÓRIA da CBS enquanto a Res. SF não sai (art. 349 I) — só a prévia
  // a lê; a confirmação continua bloqueada. chave CBS, discriminador ALIQUOTA, valorInt em bp.
  // D-2026-10-24-LEGAL-PARAMS-SIMPLES-FORMATO (dono 24/10): o valorJson é o que `simplesCalc` parseia; a semente é do X14 #573.
  SIMPLES_ANEXO_FAIXA: {
    valor: 'json',
    checar: (l) =>
      so(anexo(l) && faixa(l), 'chave = anexo I..V; discriminador F1..F6') ??
      jsonOk(FaixaJsonSchema, l.valorJson, 'valorJson = { receitaAteCents, aliquotaNominalBp, parcelaDeduzirCents }'),
  },
  SIMPLES_ANEXO_REPARTICAO: {
    valor: 'json',
    checar: (l) =>
      so(anexo(l) && faixa(l), 'chave = anexo I..V; discriminador F1..F6') ??
      jsonOk(ReparticaoJsonSchema, l.valorJson, 'valorJson = { <tributo do Simples>: bp 0..10000 }, ao menos um'),
  },
  SIMPLES_TETO_ISS: {
    valor: 'json',
    checar: (l) =>
      so(anexo(l) && semDisc(l), 'chave = anexo I..V, sem discriminador') ??
      jsonOk(TetoIssJsonSchema, l.valorJson, 'valorJson = { percentualBp, limiarAliquotaEfetiva: "decimal", transfereAIbs, transferencia: { <tributo>: bp } }'),
  },
  SIMPLES_ENQUADRAMENTO: {
    valor: 'json',
    checar: (l) =>
      so((['REVENDA', 'LOCACAO_MOVEL', 'PARCERIA_GESTAO'].includes(l.chave) || /^SERVICO:\d{6}$/.test(l.chave)) && semDisc(l), 'chave REVENDA|LOCACAO_MOVEL|PARCERIA_GESTAO|SERVICO:<cTribNac de 6 dígitos>, sem discriminador') ??
      jsonOk(EnquadramentoJsonSchema, l.valorJson, 'valorJson = { anexo: I..V, fatorR, semIss }'),
  },
  IBS_CBS_PROVISORIA: {
    valor: 'int',
    checar: (l) => so(l.chave === 'CBS' && l.discriminador === 'ALIQUOTA' && bp(l) && (l.valorInt ?? 0) > 0, 'chave CBS, discriminador ALIQUOTA; valorInt em bp (1..10000)'),
  },
};

/** Erro de formato da linha da tabela (ou `null`). Tabela sem regra aqui = o serviço aplica a do PR-1. */
export function erroDeFormato(l: LinhaParaFormato): string | null {
  const regra = REGRAS[l.tabela];
  if (!regra) return null;
  const tem = { int: l.valorInt !== undefined && l.valorInt !== null, texto: l.valorTexto !== undefined && l.valorTexto !== null, json: l.valorJson !== undefined && l.valorJson !== null };
  const valor = typeof regra.valor === 'function' ? regra.valor(l) : regra.valor;
  if (!tem[valor]) return `${l.tabela}: o valor desta tabela é ${valor === 'int' ? 'valorInt' : valor === 'texto' ? 'valorTexto' : 'valorJson'}.`;
  const erro = regra.checar(l);
  return erro ? `${l.tabela}/${l.chave}: ${erro}.` : null;
}

export const TEM_REGRA_DE_FORMATO = (t: LegalParameterTabela): boolean => REGRAS[t] !== undefined;
