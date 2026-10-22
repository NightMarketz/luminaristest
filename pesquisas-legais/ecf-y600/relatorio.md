# Relatório de pesquisa legal — ecf-y600

**Pergunta:** Registro Y600 da ECF (Leiaute 12): obrigatoriedade para Lucro Presumido/Real, campos e regras de validação
**Aberto em:** 2026-10-22T10:40:28-03:00 · **Atualizado em:** 2026-10-22T10:42:20-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
A ECF do ano-calendário 2025 com `0010.FORMA_TRIB` de "1" a "7" (Real = 1, Presumido = 5) tem de trazer o registro
**Y600** ("OC (Se 0010.FORMA_TRIB = "1" a "7")", ocorrência [0;N]; [D01] p. 56, Tabela de Registros). O Luminaris
emite Y001 vazio nos dois regimes, e o PVA 12.2.7 acusa "Registro obrigatório não preenchido → Y600" (H1, 22/10).
O Y600 lista sócios, titular, dirigentes e conselheiros (até 500 na data final, ordenados pelo total das remunerações,
mais até 499 alterações do período), com 17 campos, os cinco de valor obrigatórios mesmo quando zero ([D01] pp. 570–575).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Obrigatoriedade | Manual ECF L12, 4.2 Tabela de Registros | [D01] p. 56 | "OC (Se 0010.FORMA_TRIB = "1" a "7")" |
| Quem entra | Registro Y600, regras de preenchimento 1 e 2 | [D01] p. 570 | "Informar os 500 maiores dirigentes, conselheiros, sócios ou titulares na data final" |
| Saídas no ano | Registro Y600, introdução | [D01] p. 570 | "inclusive os titulares, sócios, dirigentes e conselheiros que tenham se retirado" |
| Valores zerados | Registro Y600, observação | [D01] p. 570 | "devem ser informados em todos os casos, mesmo quando o valor seja "zero"" |
| Campos 1–17 | Registro Y600, tabela de campos | [D01] pp. 570–573 | REG, DT_ALT_SOC, DT_FIM_SOC, PAIS, IND_QUALIF_SOCIO, CPF_CNPJ, NOM_EMP, QUALIF, PERC_CAP_TOT, PERC_CAP_VOT, CPF_REP_LEG, QUALIF_REP_LEG, VL_REM_TRAB, VL_LUC_DIV, VL_JUR_CAP, VL_DEM_REND, VL_IR_RET |
| 100% | PERC_CAP_TOT / PERC_CAP_VOT | [D01] pp. 572–573 | "Caso o valor seja 100,00%, informe somente "100"" |
| Regras de campo (Erro) | REGRA_DATA_FIM_SOC, REGRA_OBRIGATORIO_BRASIL, REGRA_VALIDA_CPF_CNPJ, REGRA_CPF_IND_QUALIF_*, REGRA_Y600_QUALIF, REGRA_QUALIF_REP_LEG_OBRIGATORIO | [D01] p. 574 | "Verifica se o Y600.CPF_CNPJ está preenchido somente quando Y600.PAIS for igual a "105" (Brasil)" |

## 3. Vigência conferida
- O Manual não está no acervo ctresb/leis (é anexo de ADE Cofis, publicado só em sped.rfb.gov.br). Lido na fonte oficial.
- Versão: "Atualização: maio/2026" (índice oficial <http://sped.rfb.gov.br/pasta/show/1644>, conferido em 22/10/2026:
  "Leiaute 12 (Atualização: 20/05/2026)", a mais recente; não há Leiaute 13 publicado). sha256 = o do corpus do repo
  (`docs/accounting/fontes-oficiais/MANIFEST.md`, `7216ec2bd62d…`).
- Vale para o ano-calendário 2025 (e situações especiais de 2026), que é o ano do H1.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Exemplo × tabela.** O exemplo da p. 575 tem 16 campos (sem DT_FIM_SOC); a tabela tem 17. Leitura mais segura: a
   tabela (o exemplo parece anterior à inclusão do DT_FIM_SOC). Quem decide é o PVA (importação no H1).
2. **QUALIF 18 (usufrutuário).** Está na descrição do campo (p. 572), mas a REGRA_Y600_QUALIF (p. 574) não o aceita em
   nenhuma combinação. Leitura mais segura: não emitir 18 (o PVA aplica a regra como Erro).
3. **Mudança de participação no ano.** O manual manda informar as alterações (regra 2) e reserva o DT_FIM_SOC para a
   saída do quadro. Leitura inferida: cada vigência vira uma ocorrência, com DT_FIM_SOC só na saída de fato; em qual
   ocorrência vão os valores do ano o manual não diz. Pergunta ao contador: "Sócio que mudou de 60% para 40% em julho:
   são duas linhas Y600 (DT_ALT_SOC de cada mudança)? Os valores pagos no ano vão inteiros na linha vigente em 31/12 e
   zerados na outra, ou divididos por período?"
4. **"499 maiores alterações".** O manual não diz o critério de "maiores". Irrelevante na escala do produto (PJ com
   poucos sócios); só importa acima de 500 ocorrências.

## 5. Lacunas
- Tabela de países do Sped (código do PAIS para não residente): só existe dentro do programa PVA
  (`Recursos/Tabelas`), não está no corpus. O "105 = Brasil" está no próprio Manual (pp. 571–574).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/54/7E3B296352B7AFD32210C180962BDB938B0804/Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026.pdf>  
  Baixado em 2026-10-22T10:40:46-03:00 · arquivo local `docs/D01_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf.pdf` · SHA-256 `7216ec2bd62de7d45e5b019298be2420d08c2a3c6ade3646a053412937e95265`

## Registro de buscas
_Nenhuma busca registrada._
