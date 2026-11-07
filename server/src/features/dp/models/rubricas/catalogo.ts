/**
 * Catálogo de rubricas do núcleo do DP — BE-INCR-DP-F0-F1 itens 50, 51 e 55 (PR-5; F-PES-9 → a, F-DP-5 revisto).
 *
 * Dado em código, sem intérprete e sem fórmula: `calculo` só nomeia a família (a função pura que calcula é do F2).
 * Rubrica nova = PR com teste (`__tests__/rubricas.test.ts`); rubrica publicada não muda de enquadramento — o
 * `published.json` congela `{codigo, natureza, incidencia}` e mudança vira código novo (item 53).
 * Sem ligação CCT × rubrica no F1 (item 55): o piso da convenção não é rubrica; a ligação nasce no F2.
 *
 * Enquadramento (item 51): cada código foi escolhido nas tabelas carregadas no PR-2 (`legal_parameters_dp_v1.sql`),
 * com a linha do dossiê `pesquisas-legais/brief-pes4-f0-f1/docs/` citada ao lado. **É escolha do executor e vai ao
 * contador** (BRIEF §5): até a resposta, `RUBRICAS_CONFERIDAS_PELO_CONTADOR` fica `false`.
 * - natureza: Tabela 03 [D10 `D10_tabelas-html.html`, cabeçalho linha 389];
 * - `cp`/`fgts`: domínios de `codIncCP` e `codIncFGTS` do S-1010 [D09 `D09_index-html.html`, linhas 4041 e 4104];
 * - `irrf`: Tabela 21 [D10, cabeçalho linha 9741; campo `codIncIRRF` do S-1010 em D09 linha 4091].
 */
import { z } from 'zod';
import { CATEGORIAS_NUCLEO } from '../vinculo';

export const RUBRICA_TIPOS = ['PROVENTO', 'DESCONTO', 'INFORMATIVA'] as const;
export const RUBRICA_CALCULOS = ['CONTRATUAL', 'LEGAL', 'INFORMADO'] as const;

/** `codRubr` do S-1010 é "C 1 1-30" [D09]; o código é estável e nunca reaproveitado. */
const codigo = z.string().regex(/^[A-Z][A-Z0-9_]{0,29}$/);
const codTabela = z.string().regex(/^\d{1,4}$/);

export const rubricaDefSchema = z
  .object({
    codigo,
    nome: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
    tipo: z.enum(RUBRICA_TIPOS),
    natureza: codTabela,
    incidencia: z.object({ cp: codTabela, irrf: codTabela, fgts: codTabela }).strict(),
    categorias: z.array(z.enum(CATEGORIAS_NUCLEO)).min(1),
    calculo: z.enum(RUBRICA_CALCULOS),
  })
  .strict();
export type RubricaDef = z.infer<typeof rubricaDefSchema>;

/** Item 51 / BRIEF §5: o enquadramento abaixo ainda não foi conferido pelo contador. */
export const RUBRICAS_CONFERIDAS_PELO_CONTADOR = false;

/**
 * Item 51 — o mínimo do primeiro holerite e do pró-labore; o F2 acrescenta as variáveis (as informadas no PR-1).
 * Citações: [D10 linha] = linha da natureza na Tabela 03; os códigos de incidência estão na carga do PR-2.
 */
export const DP_RUBRICAS = [
  {
    codigo: 'SALARIO_BASE',
    nome: { pt: 'Salário base', en: 'Base salary' },
    tipo: 'PROVENTO',
    natureza: '1000', // "Salário, vencimento, soldo" [D10 linha 402]
    incidencia: { cp: '11', irrf: '11', fgts: '11' }, // CP mensal; IR remuneração mensal; FGTS mensal
    categorias: ['101', '103'],
    calculo: 'CONTRATUAL',
  },
  {
    codigo: 'BOLSA_ESTAGIO',
    nome: { pt: 'Bolsa de estágio', en: 'Internship stipend' },
    tipo: 'PROVENTO',
    natureza: '1350', // "Bolsa de estudo - Estagiário" [D10 linha 802]
    incidencia: { cp: '00', irrf: '11', fgts: '00' }, // não é base de CP nem de FGTS; IR remuneração mensal
    categorias: ['901'],
    calculo: 'CONTRATUAL',
  },
  {
    codigo: 'PRO_LABORE',
    nome: { pt: 'Pró-labore', en: 'Partner compensation (pró-labore)' },
    tipo: 'PROVENTO',
    natureza: '3508', // "Retiradas (pró-labore) de proprietários ou sócios" [D10 linha 1234]
    incidencia: { cp: '11', irrf: '11', fgts: '00' }, // CP mensal; IR remuneração mensal; sem FGTS
    categorias: ['723'],
    calculo: 'CONTRATUAL',
  },
  {
    codigo: 'INSS_SEGURADO',
    nome: { pt: 'INSS do segurado', en: 'Employee social security (INSS)' },
    tipo: 'DESCONTO',
    natureza: '9201', // "Contribuição previdenciária" [D10 linha 1594]
    incidencia: { cp: '31', irrf: '41', fgts: '00' }, // CP descontada do segurado, mensal; dedução PSO mensal
    categorias: ['101', '103', '723'],
    calculo: 'LEGAL',
  },
  {
    codigo: 'IRRF',
    nome: { pt: 'IRRF', en: 'Withholding income tax (IRRF)' },
    tipo: 'DESCONTO',
    natureza: '9203', // "Imposto de Renda Retido na Fonte" [D10 linha 1610]
    incidencia: { cp: '00', irrf: '31', fgts: '00' }, // retenção do IRRF sobre remuneração mensal
    categorias: ['101', '103', '901', '723'],
    calculo: 'LEGAL',
  },
  {
    codigo: 'FGTS_MES',
    nome: { pt: 'FGTS do mês', en: 'Monthly FGTS deposit' },
    tipo: 'INFORMATIVA',
    natureza: '9908', // "FGTS - Depósito" [D10 linha 2010]
    incidencia: { cp: '00', irrf: '9', fgts: '00' }, // IR 9 = verba de natureza diversa de rendimento
    categorias: ['101', '103'],
    calculo: 'LEGAL',
  },
  // ── BE-INCR-DP-F2 PR-1 (itens 16–19; do item 23, decidido pelo dono em 07/11: "PR-1 já com INFORMADO") ────────────
  // As rubricas que o lançamento informa. Natureza e incidência pela proposta do dossiê
  // `pesquisas-legais/brief-pes4-f2-contador/relatorio.md` §9 (linha da Tabela 03 em [F1-D10]); escolha do executor, vai
  // ao contador com as outras (BRIEF §5). Categorias: só empregado (101) e aprendiz (103) — as 723/901 não têm jornada
  // nem comissão no núcleo; a HE fica só no 101 porque a CLT art. 432 veda a prorrogação da jornada do aprendiz [D02].
  {
    codigo: 'HORA_EXTRA_50',
    nome: { pt: 'Horas extras (dia útil)', en: 'Overtime (working day)' },
    tipo: 'PROVENTO',
    natureza: '1003', // "Horas extraordinárias" [F1-D10 linha 426]; dossiê §9: inferido
    incidencia: { cp: '11', irrf: '11', fgts: '11' },
    categorias: ['101'],
    calculo: 'INFORMADO',
  },
  {
    codigo: 'HORA_EXTRA_100',
    nome: { pt: 'Horas extras (repouso e feriado)', en: 'Overtime (rest day and holiday)' },
    tipo: 'PROVENTO',
    natureza: '1003', // [F1-D10 linha 426]; dossiê §9: AMBÍGUO com a 1012 (c) — vai ao contador
    incidencia: { cp: '11', irrf: '11', fgts: '11' },
    categorias: ['101'],
    calculo: 'INFORMADO',
  },
  {
    codigo: 'ADICIONAL_NOTURNO',
    nome: { pt: 'Adicional noturno', en: 'Night shift premium' },
    tipo: 'PROVENTO',
    natureza: '1205', // "Adicional noturno" [F1-D10 linha 666]; dossiê §9: inferido
    incidencia: { cp: '11', irrf: '11', fgts: '11' },
    categorias: ['101', '103'],
    calculo: 'INFORMADO',
  },
  {
    codigo: 'COMISSAO',
    nome: { pt: 'Comissões', en: 'Commissions' },
    tipo: 'PROVENTO',
    natureza: '1207', // "Comissões, porcentagens, produção" [F1-D10 linha 682]; dossiê §9: inferido
    incidencia: { cp: '11', irrf: '11', fgts: '11' },
    categorias: ['101', '103'],
    calculo: 'INFORMADO',
  },
  {
    codigo: 'FALTAS',
    nome: { pt: 'Faltas', en: 'Absences' },
    tipo: 'DESCONTO',
    natureza: '9207', // "Faltas" [F1-D10 linha 1626]; dossiê §9: inferido (subtrai das bases, MOS 1.2 "a")
    incidencia: { cp: '11', irrf: '11', fgts: '11' },
    categorias: ['101', '103'],
    calculo: 'INFORMADO',
  },
] as const satisfies readonly RubricaDef[];

export type RubricaCodigo = (typeof DP_RUBRICAS)[number]['codigo'];

/** Item 50 — o catálogo passa pelo schema `.strict()` ao carregar o módulo (dado de código inválido não sobe). */
export const DP_RUBRICAS_VALIDADAS: readonly RubricaDef[] = z.array(rubricaDefSchema).parse(DP_RUBRICAS);
