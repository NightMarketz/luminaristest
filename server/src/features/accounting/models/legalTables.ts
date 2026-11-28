/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a) — os nomes das tabelas de `LegalParameter` que a contabilidade lê e cujo
 * formato ela declara (F-F3-2 a: inclusive as cinco compartilhadas). Saíram do enum central da plataforma
 * (`legalParameter.ts`); o catálogo que o serviço confere é o registro composto na factory, e
 * `paises/br/legalParameters/` registra exatamente estes nomes (teste `formatCatalog.test.ts`).
 *
 * Fica no centro, ao lado dos leitores (`models/`, `services/`), porque a `P1` proíbe o centro de importar a borda.
 * Os comentários de origem de cada nome vêm do enum antigo.
 */
export const ACCOUNTING_LEGAL_TABLES = [
  'TAX_ASSESSMENT',
  'CSLL_ALIQUOTA',
  'CODIGO_RECEITA',
  'PIS_COFINS',
  'PIS_COFINS_MONOFASICO_NCM',
  'CST_PIS_COFINS',
  'CFOP_IMOBILIZADO',
  'NFE_CSTAT_AUTORIZADA',
  'OBRIGACAO_REGIME',
  'LC116_SERVICO',
  'ISS_LIMITE',
  'DEPRECIACAO_ANEXO_III',
  'LEIAUTE_SPED',
  'FERIADO_NACIONAL',
  // BE-INCR-SIMPLES-NACIONAL PR-1 (nó X14, BRIEF item 1; F-SN-2 → b): tabelas do Simples no canônico, sem model novo.
  'SIMPLES_ANEXO_FAIXA',
  'SIMPLES_ANEXO_REPARTICAO',
  'SIMPLES_TETO_ISS',
  'SIMPLES_ENQUADRAMENTO',
  'SIMPLES_LIMITE',
  'SIMEI_VALOR',
  'SALARIO_MINIMO',
  // SIMPLES-PISO-ANEXO-XI bloco 2 (BRIEF item 11): ocupações permitidas ao MEI (Res. CGSN 140 Anexo XI, Tabelas A e B).
  'MEI_ANEXO_XI',
  // F-E4-1 (a) (dono, 12/10; executa 17/10): feriados estaduais e municipais (CC 132 § 1º; Lei 9.093/1995 arts. 1º e 2º).
  'FERIADO_LOCAL',
  // BE-INCR-IRRF-DISTRIBUICAO PR-1 (item 5; F-IRD-13, F-IRD-18): IRRF na distribuição de lucros e no JCP; TJLP trimestral.
  'IRRF_DISTRIBUICAO',
  'TJLP',
  // IBS-CBS-2027 PR-1 (BRIEF item 1): alíquotas de IBS/CBS por vigência (LC 214 arts. 343, 344, 346, 347).
  'IBS_CBS',
  // IBS-CBS-2027 PR-3 (BRIEF item 15): lista de uso ou consumo pessoal (LC 214 art. 57), chave = prefixo de NCM (dono 21/10).
  // Nasce vazia — o conteúdo é do contador (P-IBS-2); consumidor = NfeImportService (models/ibsCbsCredito.ts).
  'IBS_CBS_USO_CONSUMO',
  // IBS-CBS-2027 PR-3 (dono 22/10): taxa de referência PROVISÓRIA da CBS para a prévia enquanto a linha IBS_CBS/CBS de 2027 for
  // DRAFT (sem fonte oficial — o operador da plataforma publica; a confirmação nunca a usa). Nasce vazia.
  'IBS_CBS_PROVISORIA',
  // RETENCOES-FONTE PR-1 (BRIEF itens 1, 2, 3 e 7; Emenda 22/10 item 1): alíquotas e mínimos das retenções, código de
  // receita por natureza do rendimento × tributo, natureza do rendimento (Tabela 01 da Reinf) e a tabela mensal do IRRF de
  // PF. RETENCAO_CODIGO e NATUREZA_RENDIMENTO são as ÚNICAS tabelas desse dado — a EFD-REINF lê estas.
  'RETENCAO',
  'RETENCAO_CODIGO',
  'NATUREZA_RENDIMENTO',
  'IRRF_PF_MENSAL',
  // ISS-TRANSICAO-IBS PR-1 (BRIEF item 2): fator de redução do ISS em 2029–2032 (LC 116 art. 8º-B I–IV, incl. LC 214 art. 508).
  'ISS_TRANSICAO',
  // BE-INCR-NFCE PR-3 (nó X10a, item 17 pela A9; D-2026-10-26-X10A-EXECUCAO): limites da NFC-e (Aj. SINIEF 19/16 cl. 4ª VII
  // "a" e § 4º), valor nacional sem discriminador e redução por UF (§ 5º) com o código IBGE da UF.
  'NFCE_LIMITE',
  // BE-INCR-NFCE PR-4 (nó X10a, EMENDA-3 F-NFCE-E3-2 a): UF onde o pedido de inutilização "não se aplica" desde 01/11/2026
  // (Aj. SINIEF 40/26 na NF-e, 38/26 na NFC-e) — aviso na lista de lacunas, não recusa (E3-1 c).
  'INUT_NAO_SE_APLICA',
  // BE-INCR-EFICIENCIA-FISCAL PR-2 (item 11; F-EF-5 a; D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO): NCM sob ICMS-ST por UF
  // (IBGE no discriminador) — segregação do Simples (LC 123 art. 18 § 4º-A I). Consumidor = models/segregacaoNcm.ts.
  'ICMS_ST_NCM_UF',
  // BE-INCR-EFICIENCIA-FISCAL PR-3 (itens 15–17; D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO decisão 1): encargos da folha
  // (INSS do contribuinte individual, patronal, FGTS, teto do RGPS). Consumidor = models/taxSimulation.ts.
  'ENCARGO_FOLHA',
  // EFICIENCIA-FISCAL PR-5 (item 32; F-EF-8/11 a): serviços de saúde com redução de 60 % do IBS/CBS a partir de 2027 (LC 214
  // art. 130 e Anexo III), chave = prefixo de NBS. Consumidor = models/servicoFiscalAvaliacao.ts.
  'IBS_CBS_REDUCAO_NBS',
  // Onda 3.2 fatia 5 (dono, 24/11/2026: tabelas NT CST/cClassTrib viram LegalParameter): as três tabelas do IT 2025.002 v1.70 que
  // as regras do grupo UB da NF-e consultam, uma por forma de linha (chave = código; valorJson = colunas da planilha, `ordem` =
  // posição na aba; cClassTrib leva a vigência da planilha em vigenteDesde/vigenteAte). Consumidor = models/ibsCbsTabelas.ts.
  'CST_IBS_CBS',
  'CCLASSTRIB_IBS_CBS',
  'CCREDPRES_IBS_CBS',
  // Onda 3.2 fatia 4 (dono, 24/11/2026): marcos de lei sem linha temática própria — chave = nome do marco, valorTexto = data
  // (YYYY-MM-DD), fonte obrigatória. Consumidor = models/marcoLegal.ts (hoje: INICIO_LC214_RBT12 em simplesCalc.ts).
  'MARCO_LEGAL',
] as const;
export type AccountingLegalTable = (typeof ACCOUNTING_LEGAL_TABLES)[number];
