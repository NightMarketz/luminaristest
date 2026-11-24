# Relatório de pesquisa legal — salao-fpas-515

**Pergunta:** O salão de beleza (CNAE 9602-5/01, SP capital) está no FPAS 515? Quadro do art. 577 da CLT na fonte oficial, DL 9.853/1946 (Sesc) e DL 1.146/1970 (Incra) compilados.
**Aberto em:** 2026-11-24T01:20:23-03:00 · **Atualizado em:** 2026-11-24T01:59:41-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Sim. O salão de beleza fica no FPAS 515.** Grau: **verificado** em cada um dos quatro elos abaixo, lido no texto oficial vigente em 24/11/2026. A
decomposição dos 0,2% do Incra é inferida (seção 2).
A cadeia de quatro elos:
1. **A RFB manda classificar a atividade pelo quadro do art. 577 da CLT.** A classificação usa a atividade principal do objeto
   social e do CNPJ [D04, IN RFB 2.110 art. 84 I e II]. Com ela, a empresa recebe o código FPAS dos quadros do Anexo II
   [D04, art. 85 I].
2. **O quadro do art. 577, no Planalto, põe "salões de barbeiros e de cabeleireiros, institutos de beleza e similares" no
   5º grupo da Confederação Nacional do Comércio (CNC), "Turismo e hospitalidade"** [D01, Anexo da CLT]. O grupo
   profissional correspondente é o 4º, "Empregados em Turismo e hospitalidade", com "Oficiais, barbeiros, cabeleireiros e
   similares" [D01].
3. **O Anexo II da IN 2.110 dá o FPAS 515 ao 5º grupo da CNC** [D05, Quadro 2: "5º - Turismo e hospitalidade 515"].
4. **O salão não está nas listas especiais.** O art. 86 (atividades industriais, FPAS 507) e o art. 87 (comerciais e de
   serviços com FPAS fixado) não citam salão, beleza, cabeleireiro nem barbeiro [D04, arts. 86 e 87; busca por essas
   palavras no texto inteiro da IN: 0 ocorrências].

**Alíquotas do FPAS 515 (empresa fora do Simples):** INSS 20%, RAT variável e 5,8% de terceiros [D06, Anexo III da IN 2.110]:

| Entidade | Alíquota | Código | Base legal do sujeito passivo | Base legal da alíquota |
|---|---|---|---|---|
| Salário-educação | 2,5% | 0001 | (fora do escopo desta pergunta) | [D06] |
| Incra | 0,2% | 0002 | DL 1.146 art. 3º [D03], para toda empresa | [D06]; conta na seção 2 |
| Senac | 1,0% | 0016 | (enquadramento na CNC) | [D06] |
| Sesc | 1,5% | 0032 | DL 9.853 art. 3º: o enquadrado na CNC pelo art. 577 [D02] | Lei 8.036 art. 30 [D07]; [D06] |
| Sebrae | 0,6% | 0064 | (adicional sobre Sesc e Senac) | [D06] |
| **Total** | **5,8%** | **0115** (I: soma dos códigos) | | [D06] |

**No Simples (Anexo III):** o FPAS continua 515, mas o optante não paga terceiros. O parecer já resolveu isso e não muda:
código de terceiros 0000 no S-1020 (parecer [D74], item 7.1) pela LC 123 art. 13 § 3º (parecer [D01]).

**Efeito no simulador:** nenhum. A página e o kit setorial já usam 515 e 5,8% (parecer, S5). A lacuna c574 pedia só a
prova na fonte oficial dos elos que o parecer tinha tirado de cópias "original" do acervo. A ficha passa de "inferido" a
**"verificado"**.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Classificação pelo quadro da CLT | IN RFB 2.110 art. 84 I | [D04] | "a classificação será feita de acordo com o Quadro de Atividades e Profissões a que se refere o art. 577 da CLT, ressalvados os casos dispostos nos arts. 86 e 87" |
| Atividade principal × CNPJ | IN RFB 2.110 art. 84 II | [D04] | "a atividade declarada como principal no CNPJ deverá corresponder à classificação feita na forma do inciso I, prevalecendo esta em caso de divergência" |
| FPAS pelo Anexo II | IN RFB 2.110 art. 85 I | [D04] | "o código FPAS, de acordo com os quadros do Anexo II, considerado o grupo econômico como indicativo das diversas atividades" |
| Salão no 5º grupo da CNC | CLT, Quadro do art. 577 | [D01] | "CONFEDERAÇÃO NACIONAL DO COMÉRCIO … 5 ° GRUPO - Turismo e hospitalidade … salões de barbeiros e de cabeleireiros, institutos de beleza e similares" |
| 5º grupo da CNC = 515 | IN RFB 2.110 Anexo II, Quadro 2 | [D05] | "5º - Turismo e hospitalidade 515" |
| Alíquotas do 515 | IN RFB 2.110 Anexo III | [D06] | "515 20 Variável 2,5 0,2 --- --- 1,0 1,5 0,6 --- --- --- --- --- --- 5,8" |
| Sesc: quem paga | DL 9.853 art. 3º | [D02] | "Os estabelecimentos comerciais enquadrados nas entidades sindicais subordinadas à Confederação Nacional do Comércio (art. 577 da Consolidação das Leis do Trabalho …) … serão obrigadas ao pagamento de uma contribuição mensal ao Serviço Social do Comércio" |
| Sesc: de 2% para 1,5% | Lei 8.036 art. 30 | [D07] | "Fica reduzida para 1 1/2 (um e meio) por cento a contribuição devida pelas empresas ao Serviço Social do Comércio" |
| Incra: o adicional de 0,4% | DL 1.146 art. 3º | [D03] | "É mantido o adicional de 0,4% (quatro décimos por cento) a contribuição previdenciária das emprêsas" |
| Incra: 2,6%, com 2,4% ao Funrural | LC 11/1971 art. 15 II | [D10] | "da contribuição de que trata o art. 3º do Decreto-lei nº 1.146 … a qual fica elevada para 2,6% …, cabendo 2,4% … ao FUNRURAL" |
| Fim da parcela do Prorural | Lei 7.787 art. 3º § 1º | [D09] | "abrange as contribuições … para o PRORURAL, que ficam suprimidas a partir de 1º de setembro" |

- **Os 0,2% do Incra (I).** São 2,6% − 2,4% [D10], com a parcela do Funrural/Prorural absorvida nos 20% da Lei 7.787
  [D09]. É dedução sobre texto lido. O número que a RFB aplica está no Anexo III [D06], e é ele que o simulador usa.
- **O Sesc no DL 9.853 diz 2%** [D02, art. 3º § 1º], e a página do Planalto não traz nota de alteração nesse parágrafo. O
  1,5% vem da Lei 8.036 art. 30 [D07], que reduziu a alíquota sem mudar a redação do decreto-lei. Por isso o DL 9.853 vale
  para *quem* paga (o enquadrado na CNC), e a alíquota vem da Lei 8.036 e do Anexo III.

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos.** A lacuna c574 nasceu de o parecer ter usado o DL 9.853 e o DL 1.146 do
  acervo em "versao_texto: original" (parecer D26 e D30). Aqui os dois foram lidos no Planalto [D02, D03], que é a fonte
  oficial e mostra as notas de alteração:
  - o DL 9.853 não tem nenhuma nota "Redação dada", "Vide" ou "Revogado" [D02];
  - o DL 1.146 tem notas de "Vide" (Leis 7.231/1984, 8.315/1991 e 6.746/1976, LC 11/1971 e DL 1.989/1982) e a revogação
    do art. 5º § 4º. Nenhuma nota toca o art. 3º além do "Vide Lei Complementar nº 11, de 1971", lida em [D10].
  - A LC 11/1971 do acervo também era "original" (D08). O art. 15 foi lido no Planalto [D10].
  - A Lei 8.036 [D07] e a Lei 7.787 [D09] estão compiladas no acervo e sem alerta.
- **"TEXTO MUDOU desde 2026-11-20" no [D01].** Não é mudança da CLT. O `legal.py` comparou a página inteira com a transcrição
  manual do parecer (D75), que registrou a mesma URL com `#anexo`. As linhas do 5º grupo da CNC no D75 e no [D01] têm as
  mesmas palavras (linhas 74 a 88 do D75 contra as linhas 13580 a 13604 do D01). A conclusão do parecer vale.
- **IN RFB 2.110.** A visão multivigente de hoje [D04] tem o mesmo SHA-256 da capturada pelo parecer em 20/11 (parecer D34,
  `86982870…`). O Anexo II [D05] e o Anexo III [D06] também têm o mesmo hash das capturas de 20/11 (D35 e D36). Os arts. 84
  e 85 não estão riscados.
- **Regulamentação pendente:** nenhuma para o enquadramento. Em 2027 a reforma não muda a folha (o INSS, o RAT e os terceiros
  continuam).

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma muda o FPAS do salão.
- **O Anexo II tem um 6º grupo da CNC, "Serviços de saúde", que o quadro do Planalto não tem** [D05 × D01]. No Planalto,
  "Hospitais, clínicas casa de saúde" estão no mesmo 5º grupo dos salões. Isso só importa para a clínica (vertical P2), e
  as duas leituras dão 515 do mesmo jeito.
- **Código de terceiros 0115.** É a soma dos códigos das colunas [D06]. A Tabela 4 do eSocial não foi lida. Para o
  simulador basta a alíquota de 5,8%; o código é do leiaute do S-1020, que fica para o motor da folha (PES-4).

## 5. Lacunas
- Nenhuma de conteúdo.
- A ferramenta: o alerta "TEXTO MUDOU" compara uma transcrição manual com a página inteira (seção 3). Vai à caixa de
  lacunas como assunto do `legal.py`, junto com o caso igual do D40 (Decreto 3.048, dossiê `d3048-anexo-v-rat-9602`).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** DEL5452 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm>  
  Baixado em 2026-11-24T01:20:25-03:00 · arquivo local `docs/D01_del5452-htm.html` · SHA-256 `3c3df8f3ffe2f21509ec0ff440f8e2cdb8cd736664eb8299cadcd828351e1df5`  
  ⚠ TEXTO MUDOU desde 2026-11-20. Dossiês que citaram a versão anterior: parecer-salao-sp-4-pessoas D75. Conferir se a conclusão deles ainda vale
- **[D02]** DEL9853-46 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto-lei/1937-1946/del9853.htm>  
  Baixado em 2026-11-24T01:20:44-03:00 · arquivo local `docs/D02_del9853-htm.html` · SHA-256 `6f610535f92b9f0245023ba400daafe59fa042b5003659e4edc2e4629855116d`
- **[D03]** Del1146 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto-lei/1965-1988/del1146.htm>  
  Baixado em 2026-11-24T01:20:44-03:00 · arquivo local `docs/D03_del1146-htm.html` · SHA-256 `1f0b8ce6d5065ca0e5c249b06a344c982e09756c53de56d6837c581f3639c1a7`
- **[D04]** Instrução Normativa RFB nº 2110, de 17 de outubro de 2022 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/126687/visao/multivigente>  
  Baixado em 2026-11-24T01:21:26-03:00 · arquivo local `docs/D04_rfb-126687-multivigente.json` · SHA-256 `86982870db15f3c896ab8af4dab8e179a1b87008df9369f93f12c179b4108241`  
  ⚠ 12 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar
- **[D05]** D05_67106 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/anexo/67106>  
  Baixado em 2026-11-24T01:21:26-03:00 · arquivo local `docs/D05_67106.pdf` · SHA-256 `c488e91a3c76ad5b6df724658490fa6e21d2bfaf08aa265316eaddf593c8e8d2`
- **[D06]** D06_84090 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/anexo/84090>  
  Baixado em 2026-11-24T01:21:26-03:00 · arquivo local `docs/D06_84090.pdf` · SHA-256 `086341e32ed3e9a4d50ebad945e7a196ba36651d6b7823a22e1a8ad97e763cf6`
- **[D07]** Lei nº 8.036 de 11/05/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ccdcc898b79c13be701c7841b195174e1898ccf8/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:24:53-03:00 · arquivo local `docs/D07_lei-8036-1990-05-11.md` · SHA-256 `2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22`
- **[D08]** Lei Complementar nº 11 de 25/05/1971 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/bb95336663e0bdcfd48d51d280064530b51041b4/federal/leis-complementares/1971/lcp-11-1971-05-25.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:1971-05-25;11> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-11-24T01:24:54-03:00 · arquivo local `docs/D08_lcp-11-1971-05-25.md` · SHA-256 `855c04b5a86f7b005c7876c253fe61b2a676273f02e0844508747882423364dd`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D09]** Lei nº 7.787 de 30/06/1989 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/7d6f729c8058824f285518d0c007c16272362e0a/federal/leis-ordinarias/1989/lei-7787-1989-06-30.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1989-06-30;7787> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:24:56-03:00 · arquivo local `docs/D09_lei-7787-1989-06-30.md` · SHA-256 `e62d1d5392d120299aecbea19c075a99cd5777b99e6a7160b9d39eee845358d8`
- **[D10]** Lcp11 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp11.htm>  
  Baixado em 2026-11-24T01:25:10-03:00 · arquivo local `docs/D10_lcp11-htm.html` · SHA-256 `1d5c8cd2b6caa665eedeba0a4ec1b980321f3bf3d514eb67779e826022539673`

## Registro de buscas
_Nenhuma busca registrada._
