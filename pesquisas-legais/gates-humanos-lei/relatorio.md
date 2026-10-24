# Relatório de pesquisa legal — gates-humanos-lei

**Pergunta:** Quais pendências dos gates humanos (D1f, D7, D5, H1/P5) são só de lei e o que a norma vigente responde
**Aberto em:** 2026-10-21T13:42:36-03:00 · **Atualizado em:** 2026-10-24T13:24:23-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Os quatro pontos de lei dos gates D1f, D7 e H1 (P5), com o grau de cada um:

1. **D1f: ISS do salão no Simples. VERIFICADO.** Para optante do Simples, o ISS é recolhido no DAS (LC 123, art. 13, VIII [D01]). Isso vale até 31/12/2032. A LC 214 acrescenta IBS e CBS ao art. 13 a partir de 2027 (arts. 516–517 e 544, III [D10]). Só o art. 518, que produz efeitos a partir de 1º/01/2033 (art. 544, V [D10]), tira o ISS do regime. A alíquota de 5% de São Paulo vale **fora** do Simples. Os subitens 6.01–6.03 não estão na lista de 2% do art. 16, I, "a", que só inclui o 6.04. Eles caem no art. 16, IV, com 5% [D08]. A LC 116 fixa o piso do ISS em 2% (art. 8º-A [D03]).
2. **D7: prazo de 31/12/2026 do PNCT. VERIFICADO.** A fonte é o Ato Conjunto RFB/CGIBS nº 5/2026, art. 2º, § 1º, III [D05], e não o Ato 4. O prazo é condição para **permanecer** no PNCT em 2026: o contribuinte que não cumpre as obrigações acessórias do IBS/CBS continua enquadrado se, entre outros requisitos, retificar até essa data as inconsistências que a administração comunicou. Não é prazo de emissão. O inciso IV exige indicar profissional da contabilidade, e o art. 3º, § 3º deixa esse profissional representar o contribuinte [D05]. A base legal é a LC 214, arts. 471-A a 471-C [D10].
3. **H1 (P5): mapeamento referencial na ECD. VERIFICADO.** O Manual de Orientação da ECD (leiaute de maio/2026) diz que *"O mapeamento para os planos de contas referenciais é facultativo"* [D09]. O bloqueio `unmappedAccounts` vem do gate de cobertura do Luminaris, não da ECD. Para a ECF o código referencial continua necessário. Isso é fato de código e de leiaute da ECF, fora deste dossiê.
4. **D1f: cClassTrib 000001. SEM FONTE OFICIAL (em aberto).** Ver §4.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| ISS no DAS | LC 123, art. 13, VIII | [D01] | "VIII - Imposto sobre Serviços de Qualquer Natureza - ISS. *(Vide Lei Complementar nº 214, de 16/1/2025)*" |
| IBS no art. 13 | LC 214, art. 516 (art. 13, IX da LC 123) | [D10] | "IX - Imposto sobre Bens e Serviços (IBS); (Redação dada pela Lei Complementar nº 227, de 2026)" |
| ISS sai só em 2033 | LC 214, art. 544, V | [D10] | "V - a partir de 1º de janeiro de 2033, em relação aos arts. 518 e 543" |
| IBS/CBS a partir de 2027 | LC 214, art. 544, III | [D10] | "III - a partir de 1º de janeiro de 2027, em relação aos arts. 168 a 171, [...] 517, 519 a 534 e 542; (Redação dada pela Lei Complementar nº 227, de 2026)" |
| 2% em SP não inclui 6.01–6.03 | Lei SP 13.701, art. 16, I, "a" | [D08] | "a) nos itens 4 e 5 e nos subitens 1.09, 2.01, 6.04, 8.01, [...] da lista do caput do art. 1º;(Redação dada pela Lei nº 18.066/2023)" |
| 5% para os demais | Lei SP 13.701, art. 16, IV | [D08] | "IV - 5,0% (cinco por cento) para os demais serviços descritos na lista do “caput” do art. 1°.(Redação dada pela Lei nº 16.272, de 30 de setembro de 2015)" |
| Piso de 2% | LC 116, art. 8º-A | [D03] | "A alíquota mínima do Imposto sobre Serviços de Qualquer Natureza é de 2% (dois por cento)." |
| PNCT: permanência | Ato Conjunto RFB/CGIBS 5/2026, art. 2º, § 1º, III e IV | [D05] | "III - promover, até 31 de dezembro de 2026, a retificação das inconsistências comunicadas [...]" · "IV - indicar e manter profissional da contabilidade responsável pela conformidade fiscal." |
| Contador representa | Ato Conjunto 5/2026, art. 3º, § 3º | [D05] | "O profissional da contabilidade indicado na forma do § 1º poderá representar o sujeito [...]" |
| Mapeamento facultativo | Manual da ECD, item 1.17 | [D09] | "O mapeamento para os planos de contas referenciais é facultativo." |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - **D02** (LC 214 no acervo é a promulgação dos vetos derrubados, não texto compilado): substituído pelo texto compilado do Planalto [D10], baixado em 24/10/2026. O "(Vide LC 214)" do art. 13, VIII da LC 123 [D01] foi resolvido por ele: o ISS fica no DAS até 2032 (§2).
  - **D04** (LC 227 como "texto da fonte oficial", não compilado): a pergunta aberta era se a LC 227 muda o art. 13 ou o Anexo III da LC 123 quanto ao ISS. A redação compilada da LC 214 [D10] já mostra o que a LC 227 alterou (incisos IX, XII-A e XII-B, § 9º e um teto de 5% para a fatia do ISS). Nenhuma dessas alterações tira o ISS do DAS. **Fechado.**
- **Redação atual:** Lei SP 13.701, art. 16, com redação de 2023 para o inciso I, "a" e de 2015 para o inciso IV [D08]. A cópia de 24/10/2026 tem o mesmo SHA-256 (`35632c29…`) das baixadas nos dossiês `verif-2026-10-17-iss-nfse` (D10) e `eficiencia-fiscal-servicos` (D11). O Manual da ECD [D09] tem o mesmo hash da cópia de 17/10/2026 (`verif-2026-10-17-contabil-ecd`, D07).
- **A partir de 2027:** os Anexos I a V da LC 123 passam à redação dos Anexos XVIII a XXII da LC 214, e o Anexo VII entra pelo Anexo XXIII (arts. 519 e 520 [D10]). A partilha do ISS dentro do Anexo III em 2027 não foi lida aqui. Isso não muda as conclusões de 2026.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **cClassTrib do serviço de salão (D1f).** O informe técnico IT 2025.002 v1.31 [D07], de 15/12/2025, hospedado no portal SPED de MG, é a última versão lida em domínio oficial. O texto extraído não traz a linha do código 000001, porque a tabela fica no anexo. Versões posteriores (1.50 ou mais) só apareceram em fonte secundária.
  - **Leitura A:** 000001 (tributação integral) vale para o serviço do salão. Implica a alíquota cheia de IBS/CBS no regime regular.
  - **Leitura B:** existe classificação mais específica numa versão posterior da tabela. Implica outro CST ou redução.
  - **Mais segura:** tratar o 000001 como **secundário** até ler a tabela vigente no Portal NF-e ou no portal da NFS-e nacional. Essa conferência é do agente, numa fonte oficial, não do contador.
- **H1 (P5): afrouxar o gate só na ECD** é decisão de produto do dono, não de lei. A lei permite a ECD sem mapeamento [D09]. A contrapartida é que a ECF continua exigindo o código da conta 3.4.

## 5. Lacunas
- A tabela de cClassTrib vigente (v1.50 ou mais) não foi encontrada em domínio oficial (§4).
- [D06] (SC SF/DEJUG 10/2025, ISS de assistência funeral e momento da NFS-e) foi baixado, mas não sustenta nenhuma conclusão dos gates.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-21T13:42:48-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-21T13:42:50-03:00 · arquivo local `docs/D02_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-21T13:43:38-03:00 · arquivo local `docs/D03_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D04]** Lei Complementar nº 227 de 13/01/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/leis-complementares/2026/lcp-227-2026-01-13.md>  
  Fonte oficial declarada: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm> · versao_texto: texto da fonte oficial · cópia de 2026-10-15  
  Lido em 2026-10-21T13:51:35-03:00 · arquivo local `docs/D04_lcp-227-2026-01-13.md` · SHA-256 `47f4fbcbb78694c49003c2c41c5631c0db1c3a1e7cdd19b5c244db5639312156`  
  ⚠ versao_texto = 'texto da fonte oficial' (não é texto compilado: alterações posteriores não aparecem)
- **[D05]** D05_13065932-ato-conjunto-rfb-cgibs-n-c2-ba-5-2026-regulamenta-o — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.cgibs.gov.br/upload/arquivos/202608/13065932-ato-conjunto-rfb-cgibs-n-c2-ba-5-2026-regulamenta-o-programa-nacional-de-conformidade-tributaria-docx-assinado.pdf>  
  Baixado em 2026-10-21T13:52:00-03:00 · arquivo local `docs/D05_13065932-ato-conjunto-rfb-cgibs-n-c2-ba-5-2026-regulamenta-o.pdf` · SHA-256 `251f7a8d886b70f86448fb93db9aa9da8b08e92ccf7d0ce9abdd2aa511a1d82e`
- **[D06]** D06_sc-10-2025-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/documents/d/fazenda/sc-10-2025-pdf>  
  Baixado em 2026-10-21T13:52:24-03:00 · arquivo local `docs/D06_sc-10-2025-pdf.pdf` · SHA-256 `0bf4c2b86afd3d05447b8813cec5223617b6f15a5d13f946b2668964b40b2aba`
- **[D07]** D07_IT-2025-002-v-1-31-Tabelas-de-Classificacao-do-IBS-e-da-CBS- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portalsped.fazenda.mg.gov.br/spedmg/export/sites/spedmg/nfag/downloads/IT-2025.002-v.1.31-Tabelas-de-Classificacao-do-IBS-e-da-CBS.pdf>  
  Baixado em 2026-10-21T13:52:25-03:00 · arquivo local `docs/D07_IT-2025-002-v-1-31-Tabelas-de-Classificacao-do-IBS-e-da-CBS-.pdf` · SHA-256 `ce2d90764fb6742be00511c6ddbb3e78df74b905349499d50d5f9da666ebb2e0`
- **[D08]** LEI Nº 13.701 DE 24 DE DEZEMBRO DE 2003 « Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/lei-13701-de-24-de-dezembro-de-2003>  
  Baixado em 2026-10-24T13:22:27-03:00 · arquivo local `docs/D08_lei-13701-de-24-de-dezembro-de-2003.html` · SHA-256 `35632c29f753d4c5ebd4ad9961039b17d47a83e45b0d48dd7c24d25770a253f8`
- **[D09]** D09_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/71/1BD273E4A9F51ED8EF01AC3A6BC15812A3481F/Manual_de_Orienta%c3%a7%c3%a3o_da_ECD_Leiaute_20_maio_2026.pdf>  
  Baixado em 2026-10-24T13:22:35-03:00 · arquivo local `docs/D09_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p.pdf` · SHA-256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`
- **[D10]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-24T13:22:36-03:00 · arquivo local `docs/D10_lcp214-htm.html` · SHA-256 `9698a3bddf4ca69a1dd89c622bedbc873a844fdce88854d7ac96e908b53152ee`

## Registro de buscas
_Nenhuma busca registrada._
