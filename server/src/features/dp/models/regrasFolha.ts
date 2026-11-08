/**
 * Regras da folha como dado — BE-INCR-DP-F2 item 67 (PR-0R; regra de parâmetro do dono, 06/11: "uma mudança em escala
 * ou em leis não pode mudar de fato alguma coisa além de fórmulas pra nós").
 *
 * Leitor puro sobre a fotografia do `LegalParameterService`, com o mesmo contrato de `parametrosFolha`: linha ausente na
 * data ⇒ `ParametroLegalAusenteError` nomeando tabela, chave e data; nunca cai em valor padrão nem na linha de outra
 * vigência. `RegrasFolha` é o único caminho de número de regra para as calculadoras do F2 (§0.1 do BRIEF): nelas não há
 * literal numérico de regra legal.
 */
import { exigirLinhaVigente, ParametroLegalAusenteError, type LegalParameterTabela, type LinhaLegal } from '../../legalParameters/models/legalParameter';
import {
  DpCategoriaEncargoJson,
  FOLHA_REGRA_CHAVES_TEXTO,
  type FolhaRegraChaveInt,
  type FolhaRegraChaveTexto,
} from '../../legalParameters/models/formatoLinha';
import { CATEGORIAS_NUCLEO, CHAVES_IDADE_POR_CATEGORIA, type CategoriaNucleo, type RegrasIdade } from './vinculo';
import type { MesesFerias } from './ferias';
import type { DiaSemana } from './escala';

/** As tabelas que o leitor consome — o que o serviço pede à `fotografia`. */
export const TABELAS_REGRAS_FOLHA = ['FOLHA_REGRA', 'DP_CATEGORIA_ENCARGO'] as const satisfies readonly LegalParameterTabela[];

export interface EncargoCategoria {
  inss: 'EMPREGADO' | 'CONTRIBUINTE_INDIVIDUAL' | 'NENHUM';
  fgtsChave: 'FGTS_BP' | 'FGTS_APRENDIZ_BP' | null;
  irrf: boolean;
}

/** Valor de uma regra com a linha de onde veio (a prova do cálculo cita `LP:<id>`; as mensagens citam a `fonte`). */
export interface ValorRegra<T> {
  valor: T;
  linhaId: string;
  fonte: string;
}

/** §3.1 do BRIEF (item 67), com as duas chaves de arredondamento do item 65. */
export interface RegrasFolha {
  heAdicionalBp: ValorRegra<number>;
  heRepousoAdicionalBp: ValorRegra<number>;
  noturno: { adicionalBp: ValorRegra<number>; horaSegundos: ValorRegra<number>; inicioMin: ValorRegra<number>; fimMin: ValorRegra<number> };
  afastamentoDiasEmpresa: ValorRegra<number>;
  mensalistaBaseDias: ValorRegra<number>;
  semanaDsrInicio: ValorRegra<DiaSemana>;
  jornadaLimiteSemanalMin: ValorRegra<number>;
  repousoDiasMin: ValorRegra<number>;
  salarioHoraDivisor: ValorRegra<(typeof FOLHA_REGRA_CHAVES_TEXTO)['SALARIO_HORA_DIVISOR'][number]>;
  arredondamentoInss: ValorRegra<(typeof FOLHA_REGRA_CHAVES_TEXTO)['ARREDONDAMENTO_INSS'][number]>;
  arredondamento: ValorRegra<(typeof FOLHA_REGRA_CHAVES_TEXTO)['ARREDONDAMENTO'][number]>;
  salarioFamiliaIdadeMax: ValorRegra<number>;
  encargoPorCategoria: Record<CategoriaNucleo, ValorRegra<EncargoCategoria>>;
}

/** Uma regra inteira de `FOLHA_REGRA` vigente na `data` (discriminador = categoria, quando a regra varia por ela). */
export function regraInt(fotografia: readonly LinhaLegal[], chave: FolhaRegraChaveInt, data: string, categoria: string | null = null): ValorRegra<number> {
  const l = exigirLinhaVigente(fotografia, 'FOLHA_REGRA', chave, data, categoria);
  if (l.valorInt === null) throw new ParametroLegalAusenteError('FOLHA_REGRA', data, chave);
  return { valor: l.valorInt, linhaId: l.id, fonte: l.fonte };
}

/** Uma regra de texto de `FOLHA_REGRA` vigente na `data`; valor fora das formas que o código conhece ⇒ ausente. */
export function regraTexto<K extends FolhaRegraChaveTexto>(
  fotografia: readonly LinhaLegal[],
  chave: K,
  data: string,
): ValorRegra<(typeof FOLHA_REGRA_CHAVES_TEXTO)[K][number]> {
  const l = exigirLinhaVigente(fotografia, 'FOLHA_REGRA', chave, data);
  const opcoes: readonly string[] = FOLHA_REGRA_CHAVES_TEXTO[chave];
  if (l.valorTexto === null || !opcoes.includes(l.valorTexto)) throw new ParametroLegalAusenteError('FOLHA_REGRA', data, chave);
  return { valor: l.valorTexto as (typeof FOLHA_REGRA_CHAVES_TEXTO)[K][number], linhaId: l.id, fonte: l.fonte };
}

/** Item 66 — o que a categoria recolhe na `data`; sem linha ⇒ `PARAMETRO_LEGAL_AUSENTE`. */
export function encargoDaCategoria(fotografia: readonly LinhaLegal[], categoria: string, data: string): ValorRegra<EncargoCategoria> {
  const l = exigirLinhaVigente(fotografia, 'DP_CATEGORIA_ENCARGO', categoria, data);
  const v = DpCategoriaEncargoJson.safeParse(JSON.parse(l.valorJson ?? 'null'));
  if (!v.success) throw new ParametroLegalAusenteError('DP_CATEGORIA_ENCARGO', data, categoria);
  return { valor: v.data, linhaId: l.id, fonte: l.fonte };
}

/** Item 67 — todas as regras da folha vigentes na `data`. */
export function regrasFolha(fotografia: readonly LinhaLegal[], data: string): RegrasFolha {
  const i = (c: FolhaRegraChaveInt) => regraInt(fotografia, c, data);
  const encargoPorCategoria = Object.fromEntries(CATEGORIAS_NUCLEO.map((c) => [c, encargoDaCategoria(fotografia, c, data)])) as Record<
    CategoriaNucleo,
    ValorRegra<EncargoCategoria>
  >;
  return {
    heAdicionalBp: i('HE_ADICIONAL_BP'),
    heRepousoAdicionalBp: i('HE_REPOUSO_ADICIONAL_BP'),
    noturno: { adicionalBp: i('NOTURNO_ADICIONAL_BP'), horaSegundos: i('NOTURNO_HORA_SEGUNDOS'), inicioMin: i('NOTURNO_INICIO_MIN'), fimMin: i('NOTURNO_FIM_MIN') },
    afastamentoDiasEmpresa: i('AFASTAMENTO_DIAS_EMPRESA'),
    mensalistaBaseDias: i('MENSALISTA_BASE_DIAS'),
    semanaDsrInicio: regraTexto(fotografia, 'SEMANA_DSR_INICIO', data),
    jornadaLimiteSemanalMin: i('JORNADA_LIMITE_SEMANAL_MIN'),
    repousoDiasMin: i('REPOUSO_DIAS_MIN'),
    salarioHoraDivisor: regraTexto(fotografia, 'SALARIO_HORA_DIVISOR', data),
    arredondamentoInss: regraTexto(fotografia, 'ARREDONDAMENTO_INSS', data),
    arredondamento: regraTexto(fotografia, 'ARREDONDAMENTO', data),
    salarioFamiliaIdadeMax: i('SALARIO_FAMILIA_IDADE_MAX'),
    encargoPorCategoria,
  };
}

/**
 * Item 73 — a mensagem leva o número e o artigo da linha, não do código: o `{n}` vira o valor e `({fonte})` a fonte.
 * Trocar a linha troca o número e o artigo na mensagem.
 */
export function mensagemComRegra(modelo: string, r: ValorRegra<number>): string {
  return modelo.replace('{n}', String(r.valor)).replace('{fonte}', r.fonte);
}

/** Item 72 — as regras de idade e prazo que a categoria usa, na `data` (admissão). 901 e 723 não leem linha nenhuma. */
export function regrasIdadeDaCategoria(fotografia: readonly LinhaLegal[], categoria: CategoriaNucleo, data: string): RegrasIdade {
  const campo = {
    EMPREGADO_IDADE_MIN: 'empregadoIdadeMin',
    APRENDIZ_IDADE_MIN: 'aprendizIdadeMin',
    APRENDIZ_IDADE_MAX: 'aprendizIdadeMax',
    APRENDIZ_PRAZO_MAX_MESES: 'aprendizPrazoMaxMeses',
  } as const satisfies Partial<Record<FolhaRegraChaveInt, keyof RegrasIdade>>;
  const out: RegrasIdade = {};
  for (const chave of CHAVES_IDADE_POR_CATEGORIA[categoria]) out[campo[chave]] = regraInt(fotografia, chave, data);
  return out;
}

/** Item 72 — meses de aquisitivo e de concessivo das férias na `data` (admissão). */
export function mesesFerias(fotografia: readonly LinhaLegal[], data: string): MesesFerias {
  return { aquisitivo: regraInt(fotografia, 'FERIAS_AQUISITIVO_MESES', data).valor, concessivo: regraInt(fotografia, 'FERIAS_CONCESSIVO_MESES', data).valor };
}
