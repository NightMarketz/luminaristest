/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a) — os nomes das tabelas de `LegalParameter` que o Departamento Pessoal lê.
 * Saíram do enum central da plataforma (`legalParameter.ts`); o catálogo que o serviço confere é o registro composto na
 * factory. Ficam no centro do DP, ao lado dos leitores, porque a `P1` proíbe o centro de importar a borda.
 */

/** As que o DP declara (formato em `paises/br/legalParameters/`, que registra exatamente estes nomes). */
export const DP_LEGAL_TABLES = [
  // BE-INCR-DP-F0-F1 PR-2 (nó PES-4, itens 20 e 23): tabela progressiva do INSS do empregado (EC 103 art. 28) e as tabelas
  // do eSocial como dado (precedente NATUREZA_RENDIMENTO). Consumidor = features/dp/models/parametrosFolha.ts e o
  // cadastro do DP (categoria do vínculo, natureza e incidência das rubricas, motivo do afastamento).
  'INSS_EMPREGADO',
  'ESOCIAL_CATEGORIA',
  'ESOCIAL_NATUREZA_RUBRICA',
  'ESOCIAL_INCIDENCIA_RUBRICA',
  'ESOCIAL_MOTIVO_AFASTAMENTO',
  // BE-INCR-DP-F2 PR-0R (nó PES-4, itens 65–66; regra de parâmetro do dono, 06/11): número de lei da folha como dado
  // (adicionais, hora noturna, dias, limites de jornada, idades e prazos, arredondamento) e o que cada categoria do
  // núcleo recolhe. Consumidor = features/dp/models/regrasFolha.ts.
  'FOLHA_REGRA',
  'DP_CATEGORIA_ENCARGO',
  // BE-INCR-DP-F2 PR-1 (item 13): Tabela 07 do eSocial (tipos de dependente), no padrão do D-8 do F0+F1. Consumidor =
  // features/dp/services/DpDependenteService.ts.
  'ESOCIAL_TIPO_DEPENDENTE',
  // BE-INCR-DP-PONTE-RAZAO PR-P0 (nó PES-4, itens 1–3): o que a CPP patronal fora do DAS lê além da ENCARGO_FOLHA —
  // alíquota do RAT por grau (Lei 8.212 art. 22 II), limites do FAP (Lei 10.666 art. 10) e terceiros por FPAS (IN RFB
  // 2.110 Anexo III). Consumidor = features/dp/paises/br/models/folha/cpp.ts.
  'RAT_ALIQUOTA',
  'FAP_LIMITES',
  'TERCEIROS_FPAS',
  // PR-P1 item 7 (F-PNT-3 b): o enquadramento da empresa, linha por CNPJ publicada pelo admin — grau do RAT e FAP do
  // estabelecimento, FPAS da raiz. Consumidor = features/dp/paises/br/models/enquadramentoCpp.ts.
  'RAT_GRAU_ESTABELECIMENTO',
  'FAP_ESTABELECIMENTO',
  'FPAS_EMPRESA',
] as const;

/**
 * As que a folha lê e a contabilidade declara (F-F3-2 a: dona das cinco compartilhadas; a leitura segue livre). Só o
 * nome: o DP não importa nada da contabilidade para isso.
 */
export const DP_SHARED_LEGAL_TABLES_READ = ['ENCARGO_FOLHA', 'SALARIO_MINIMO', 'IRRF_PF_MENSAL'] as const;

export type DpLegalTable = (typeof DP_LEGAL_TABLES)[number] | (typeof DP_SHARED_LEGAL_TABLES_READ)[number];
