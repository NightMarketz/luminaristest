/**
 * Mapa rubrica → calculadora — BE-INCR-DP-F2 item 24 (PR-2).
 *
 * Toda rubrica do catálogo (`../rubricas/catalogo.ts`) aponta para a(s) calculadora(s) que dão o seu valor; rubrica sem
 * entrada não compila (`satisfies Record<RubricaCodigo, …>`) e o teste reprova (sem rubrica órfã).
 *
 * Duas espécies de calculadora, numa lista fechada:
 * - `CALCULADORAS_PR0`: a função pura que já existe (itens 3–12 do PR-0), referenciada pela própria função;
 * - `CALCULADORAS_A_IMPLEMENTAR`: a forma que o BRIEF especifica num item do PR-4 (ou do F-DPF-7) e que ainda não tem
 *   função; o valor é o item do BRIEF. O PR-4 move cada uma para a lista de funções ao escrevê-la; o teste do item 24
 *   fixa esta lista, e calculadora pendente nova reprova. Leitura do executor do PR-2 (registrada no corpo do PR):
 *   o item 24 não diz se o PR-2 escreve as funções que faltam; escrevê-las adiantaria o PR-4.
 *
 * Sem ordem de avaliação aqui: a ordem é a lista do item 35 (PR-4), que o teste de lá cobre contra este mapa.
 */
import type { RubricaCodigo } from '../rubricas/catalogo';
import { fgtsDaCategoria, inssContribuinteIndividual, inssEmpregado, irrfMensal } from './encargos';
import { proporcionalMensalista } from './salario';
import { adicionalNoturno, complementoMinimo, dsrSobreVariaveis, horaExtra, pisoProporcional } from './variaveis';

/** As calculadoras do PR-0 que dão valor de rubrica (`salarioHora`, `divisorHoras` e `horasNoturnas` são passos internos). */
export const CALCULADORAS_PR0 = {
  proporcionalMensalista, // item 4
  inssEmpregado, // item 5
  inssContribuinteIndividual, // item 6
  fgtsDaCategoria, // item 7
  irrfMensal, // item 8
  horaExtra, // item 9
  adicionalNoturno, // item 10
  dsrSobreVariaveis, // item 11
  complementoMinimo, // item 12
  pisoProporcional, // item 12 / F-DPF-6
} as const;

/** Forma especificada no BRIEF e ainda sem função: o valor é o item que a especifica. */
export const CALCULADORAS_A_IMPLEMENTAR = {
  salarioHorista: 'item 37', // horas normais × salário-hora contratual (Lei 605 art. 7º "b")
  valorInformado: 'item 38', // o valorCents do lançamento (COMISSAO)
  descontoFaltas: 'item 36', // minutos de falta × salário-hora
  dsrPerdido: 'item 36', // DSR da semana da falta injustificada (Lei 605 art. 6º)
  adiantamento: 'item 42', // percentual da instância × salário contratual
  descontoAdiantamento: 'item 43', // o que a execução ADIANTAMENTO mais recente pagou
  salarioFamilia: 'item 15 / F-DPF-7', // cota × dependentes; sem a cota vigente, aviso SALARIO_FAMILIA_SEM_PARAMETRO
} as const;

export type CalculadoraNome = keyof typeof CALCULADORAS_PR0 | keyof typeof CALCULADORAS_A_IMPLEMENTAR;

/**
 * Item 24. Mais de uma calculadora = a forma muda com o vínculo (mensalista × horista, empregado × contribuinte
 * individual pela linha `DP_CATEGORIA_ENCARGO`, mínimo × piso da CCT).
 */
export const RUBRICA_CALCULO = {
  SALARIO_BASE: ['proporcionalMensalista', 'salarioHorista'],
  BOLSA_ESTAGIO: ['proporcionalMensalista'],
  PRO_LABORE: ['proporcionalMensalista'],
  INSS_SEGURADO: ['inssEmpregado', 'inssContribuinteIndividual'],
  IRRF: ['irrfMensal'],
  FGTS_MES: ['fgtsDaCategoria'],
  HORA_EXTRA_50: ['horaExtra'],
  HORA_EXTRA_100: ['horaExtra'],
  ADICIONAL_NOTURNO: ['adicionalNoturno'],
  COMISSAO: ['valorInformado'],
  FALTAS: ['descontoFaltas'],
  DSR_VARIAVEIS: ['dsrSobreVariaveis'],
  DSR_PERDIDO: ['dsrPerdido'],
  COMPLEMENTO_MINIMO: ['complementoMinimo'],
  COMPLEMENTO_PISO: ['complementoMinimo', 'pisoProporcional'],
  AFASTAMENTO_EMPRESA_15D: ['proporcionalMensalista'], // dias pagos pela empresa na base do mensalista (itens 31–32)
  ADIANTAMENTO: ['adiantamento'],
  DESCONTO_ADIANTAMENTO: ['descontoAdiantamento'],
  SALARIO_FAMILIA: ['salarioFamilia'],
} as const satisfies Record<RubricaCodigo, readonly [CalculadoraNome, ...CalculadoraNome[]]>;
