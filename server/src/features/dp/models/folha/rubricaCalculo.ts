/**
 * Mapa rubrica → calculadora — BE-INCR-DP-F2 item 24 (PR-2).
 *
 * Toda rubrica do catálogo (`../rubricas/catalogo.ts`) aponta para a(s) função(ões) pura(s) que dão o seu valor; rubrica
 * sem entrada não compila (`satisfies Record<RubricaCodigo, …>`) e o teste reprova (sem rubrica órfã).
 *
 * As calculadoras que o BRIEF especificava no PR-4 (faltas, DSR perdido, afastamento, adiantamento, desconto do
 * adiantamento, salário-família, horista e valor informado) foram escritas neste PR por decisão do dono (chat,
 * 2026-11-07: "Escrever agora"): o motor do PR-4 só as consome. Sem ordem de avaliação aqui: a ordem é a lista do item
 * 35 (PR-4), que o teste de lá cobre contra este mapa.
 */
import type { RubricaCodigo } from '../rubricas/catalogo';
import { adiantamento, descontoAdiantamento } from './adiantamento';
import { afastamentoEmpresa } from './afastamento';
import { fgtsDaCategoria, inssContribuinteIndividual, inssEmpregado, irrfMensal } from './encargos';
import { descontoFaltas, dsrPerdido } from './faltas';
import { proporcionalMensalista, salarioHorista } from './salario';
import { salarioFamilia } from './salarioFamilia';
import { adicionalNoturno, complementoMinimo, dsrSobreVariaveis, horaExtra, pisoProporcional, valorInformado } from './variaveis';

/** As calculadoras que dão valor de rubrica (`salarioHora`, `divisorHoras`, `horasNoturnas` e afins são passos internos). */
export const CALCULADORAS = {
  proporcionalMensalista, // item 4
  salarioHorista, // item 37
  inssEmpregado, // item 5
  inssContribuinteIndividual, // item 6
  fgtsDaCategoria, // item 7
  irrfMensal, // item 8
  horaExtra, // item 9
  adicionalNoturno, // item 10
  dsrSobreVariaveis, // item 11
  complementoMinimo, // item 12
  pisoProporcional, // item 12 / F-DPF-6
  valorInformado, // item 38
  descontoFaltas, // item 36
  dsrPerdido, // item 36
  afastamentoEmpresa, // item 32
  adiantamento, // item 42
  descontoAdiantamento, // item 43
  salarioFamilia, // item 15 / F-DPF-7
} as const;

export type CalculadoraNome = keyof typeof CALCULADORAS;

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
  AFASTAMENTO_EMPRESA_15D: ['afastamentoEmpresa'],
  ADIANTAMENTO: ['adiantamento'],
  DESCONTO_ADIANTAMENTO: ['descontoAdiantamento'],
  SALARIO_FAMILIA: ['salarioFamilia'],
} as const satisfies Record<RubricaCodigo, readonly [CalculadoraNome, ...CalculadoraNome[]]>;
