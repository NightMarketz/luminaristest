# Relatório de pesquisa legal — eficiencia-fiscal-pr3-encargos

**Pergunta:** Encargos de folha para o simulador do fator r e da remuneração do sócio: INSS do contribuinte individual (11%, teto RGPS 2026), patronal 20%, FGTS 8%; IRRF/IRPF do pró-labore; LC 123 art. 13 VI (CPP no DAS dos Anexos III e V)
**Aberto em:** 2026-10-28T21:48:37-03:00 · **Atualizado em:** 2026-10-28T22:27:21-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O sócio que recebe pró-labore é contribuinte individual: contribui com 20% do salário-de-contribuição [D01 art. 21 caput], menos
45% da contribuição da empresa, limitada a 9% [D01 art. 30 § 4º] — 11% efetivos, descontados pela empresa [D02 art. 4º], até o
limite máximo do salário-de-contribuição [D01 art. 28 § 5º], R$ 8.475,55 desde a competência 01/2026 [D05]. A empresa paga 20%
sobre as remunerações a empregados e a contribuintes individuais [D01 art. 22 I e III]; no Simples essa CPP está no DAS, salvo o
Anexo IV [D04 art. 13 VI; art. 18 § 5º-C]. FGTS: 8% da remuneração do empregado [D03 art. 15]. Os quatro valores viraram a tabela
`ENCARGO_FOLHA` (PUBLISHED). A opção pelo Simples é feita em janeiro, até o último dia útil, e é irretratável no ano [D04 art. 16
caput e § 2º].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| 20% do contribuinte individual | Lei 8.212 art. 21 caput | [D01] | "A alíquota de contribuição dos segurados contribuinte individual e facultativo será de vinte por cento" |
| Dedução de 45%, até 9% | Lei 8.212 art. 30 § 4º | [D01] | "poderá deduzir, da sua contribuição mensal, quarenta e cinco por cento da contribuição da empresa [...] limitada a dedução a nove por cento" |
| Patronal de 20% | Lei 8.212 art. 22 I e III | [D01] | "vinte por cento sobre o total das remunerações pagas ou creditadas [...] aos segurados contribuintes individuais" |
| Desconto pela empresa | Lei 10.666 art. 4º | [D02] | "Fica a empresa obrigada a arrecadar a contribuição do segurado contribuinte individual a seu serviço" |
| FGTS de 8% | Lei 8.036 art. 15 | [D03] | "a importância correspondente a 8% (oito por cento) da remuneração paga ou devida" |
| CPP no DAS | LC 123 art. 13 VI | [D04] | "exceto no caso da microempresa e da empresa de pequeno porte que se dediquem às atividades [...] do § 5º-C do art. 18" |
| Opção pelo Simples | LC 123 art. 16 § 2º | [D04] | "deverá ser realizada no mês de janeiro, até o seu último dia útil" |
| Teto de 2026 | Portaria Interministerial MPS/MF 13/2026 | [D05] | "De R$ 4.354,28 até R$ 8.475,55 14%" (tabela oficial do INSS) |

## 3. Vigência conferida
- Alertas do acervo: nenhum (D01–D04 compiladas, cópia de 2026-10-13). O art. 16 § 2º traz "(Vide LC 214/2025)"; a cópia
  compilada é posterior à LC 214, então o § 2º lido é a redação vigente. O alcance da remissão não foi lido (fora do PR-3).
- O valor do art. 28 § 5º no texto da lei é histórico (Cr$); o vigente sai da portaria anual [D05]. A Portaria 13/2026 não baixou
  do DOU (403); a tabela oficial do INSS que a cita foi lida no navegador, com SHA-256 do texto.
- Regulamentação pendente: a portaria de 2027 trará o teto novo — entra por PR de dado.

## 4. Ambiguidades
Nenhuma que mude o cálculo. RAT/FAP (art. 22 II) e terceiros ficam fora por decisão de escopo, com aviso.

## 5. Lacunas
- Portaria Interministerial MPS/MF 13/2026 no texto do DOU (in.gov.br recusou o download; usada a tabela oficial do INSS).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-28T21:48:47-03:00 · arquivo local `docs/D01_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`
- **[D02]** Lei nº 10.666 de 08/05/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8d5689c5609a8924f8f487dcad5ec2877f0bc2de/federal/leis-ordinarias/2003/lei-10666-2003-05-08.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-05-08;10666> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-28T21:48:49-03:00 · arquivo local `docs/D02_lei-10666-2003-05-08.md` · SHA-256 `3311fc0954581236c74cbcd937470a15a481f5a858b6197fc538ce11e824d827`
- **[D03]** Lei nº 8.036 de 11/05/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ccdcc898b79c13be701c7841b195174e1898ccf8/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-28T21:48:50-03:00 · arquivo local `docs/D03_lei-8036-1990-05-11.md` · SHA-256 `2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22`
- **[D04]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-28T21:48:59-03:00 · arquivo local `docs/D04_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`

## Registro de buscas
_Nenhuma busca registrada._
- **[D05]** Tabela de contribuição mensal do INSS (valores da Portaria Interministerial MPS/MF nº 13/2026) — gov.br/INSS, fonte oficial  
  <https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal>  
  Lido no navegador embutido em 2026-10-28 · arquivo local `docs/D05_inss-tabela-contribuicao-2026-navegador.txt` · SHA-256 do texto `45b1ddf9d2fd7f0f2d1fdb862876c619a783393d10e4b561a4b9533b0e38cd20`
