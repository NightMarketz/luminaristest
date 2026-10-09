import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates';
import { REGIMES_EMPRESA } from '../../accounting/models/regimeEmpresa';
import { STATUS_OBRIGACAO } from '../../accounting/models/obrigacoesPorRegime';
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
  valor: Valor;
  /** Erro em português ou `null` quando a linha está no formato. */
  checar: (l: LinhaParaFormato) => string | null;
}

const so = (cond: boolean, msg: string): string | null => (cond ? null : msg);
const semDisc = (l: LinhaParaFormato) => l.discriminador === undefined || l.discriminador === null;
const jsonOk = (schema: z.ZodType, v: unknown, msg: string): string | null => (schema.safeParse(v).success ? null : msg);

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
      so(['ECD', 'ECF', 'DCTFWEB'].includes(l.chave) && (REGIMES_EMPRESA as readonly string[]).includes(l.discriminador ?? ''), 'chave ECD|ECF|DCTFWEB; discriminador = regime (MEI|SIMPLES|PRESUMIDO|REAL)') ??
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
};

/** Erro de formato da linha da tabela (ou `null`). Tabela sem regra aqui = o serviço aplica a do PR-1. */
export function erroDeFormato(l: LinhaParaFormato): string | null {
  const regra = REGRAS[l.tabela];
  if (!regra) return null;
  const tem = { int: l.valorInt !== undefined && l.valorInt !== null, texto: l.valorTexto !== undefined && l.valorTexto !== null, json: l.valorJson !== undefined && l.valorJson !== null };
  if (!tem[regra.valor]) return `${l.tabela}: o valor desta tabela é ${regra.valor === 'int' ? 'valorInt' : regra.valor === 'texto' ? 'valorTexto' : 'valorJson'}.`;
  const erro = regra.checar(l);
  return erro ? `${l.tabela}/${l.chave}: ${erro}.` : null;
}

export const TEM_REGRA_DE_FORMATO = (t: LegalParameterTabela): boolean => REGRAS[t] !== undefined;
