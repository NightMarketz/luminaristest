# Relatório de pesquisa legal — ibs-cbs-referencial-sped

**Pergunta:** Códigos do plano referencial RFB (ECF L100A/P100A) para IBS a recolher e CBS a recolher (item 12 do BRIEF IBS-CBS-2027)
**Aberto em:** 2026-10-21T18:24:04-03:00 · **Atualizado em:** 2026-10-21T18:24:34-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## Conclusão
**Nenhum código específico.** A tabela dinâmica oficial da ECF [D01] (leiaute 12, AC 2025, publicada em 28/05/2026) não tem
conta de IBS nem de CBS nas abas L100A (Lucro Real) e P100A (Presumido): a busca por "IBS", "CBS" e "Bens e Serviços" não
achou nada. O grupo `2.01.01.02`, que o contador indicou (`2.01.01.02.xx`), **não existe** nessas abas. Os tributos a
recolher ficam em `2.01.01.09 OBRIGAÇÕES FISCAIS – CIRCULANTE`, com as folhas .01 a .14 e .28.

## Leituras possíveis (ambiguidade, para o dono e o contador)
1. **`2.01.01.09.28 Outros Tributos a Recolher – Circulante`** (folha "A", existe nas duas abas desde 2015) para IBS e para
   CBS até a RFB publicar contas próprias. Única folha atual que comporta os dois tributos.
2. **Aguardar a tabela do AC 2027** (ECF de 2028), que pode criar contas próprias. Antes disso o mapeamento fica DRAFT.
3. O `2.01.01.02.xx` do contador: sem respaldo em [D01]. Talvez venha de outro plano (ECD de instituição financeira, ou
   uma tabela futura). Precisa da fonte do contador.

Pergunta exata ao contador: "Na falta de conta própria de IBS/CBS no referencial da ECF, mapeamos IBS a recolher e CBS a
recolher em 2.01.01.09.28 (Outros Tributos a Recolher)? E de onde vem o 2.01.01.02.xx?"

## Lacuna
[D01] é do AC 2025. Não há tabela publicada do AC 2027, o primeiro ano com IBS/CBS no regime regular.

## Leitura
O XLSX foi salvo pelo `legal.py` com a extensão `.html`. Lido pelo `openpyxl` a partir de uma cópia `.xlsx`.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/E1/20FDEEE25CAA9F998AC2AD3045DE0E9C631D3C/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx>  
  Baixado em 2026-10-21T18:24:14-03:00 · arquivo local `docs/D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_.html` · SHA-256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`

## Registro de buscas
_Nenhuma busca registrada._
