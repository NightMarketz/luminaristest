# Relatório de pesquisa legal — brief-pes4-f0-f1

**Pergunta:** BRIEF do DP (PES-4) F0+F1: INSS do segurado empregado por faixas (EC 103/2019 art. 28 + tabela 2026), pró-labore do sócio como contribuinte individual (Lei 8.212 arts. 12 V f, 21, 28 III, 30 § 4º; Lei 10.666 art. 4º), FGTS (Lei 8.036 art. 15 e § 7º), férias (CLT arts. 130 e 134), categorias do eSocial
**Aberto em:** 2026-11-02T20:11:32-03:00 · **Atualizado em:** 2026-11-02T21:43:01-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Tudo o que o BRIEF de F0+F1 do DP usa como regra legal está conferido em fonte oficial ou no acervo, salvo o texto da
Portaria Interministerial MPS/MF 13/2026 no DOU (lacuna já conhecida, coberta pela tabela oficial do INSS).

- **INSS do empregado, aprendiz incluído:** alíquotas progressivas por faixa, cada alíquota sobre a parte do
  salário-de-contribuição dentro da faixa [D01/D06 EC 103 art. 28 I–IV e § 1º]. Os limites são reajustados todo ano
  [D06 art. 28 § 2º]. Para 2026 (a partir da competência 01/2026): até R$ 1.621,00 7,5%; de 1.621,01 a 2.902,84 9%;
  de 2.902,85 a 4.354,27 12%; de 4.354,28 a 8.475,55 14% [D07, que cita a Portaria 13/2026].
- **Pró-labore:** o sócio que recebe pela atividade é segurado obrigatório como contribuinte individual [D02 Lei 8.212
  art. 12 V "f"], e o salário-de-contribuição é a remuneração auferida no mês, até o teto [D02 art. 28 III]. Alíquota de
  11%, desconto pela empresa e patronal de 20% já estão na `ENCARGO_FOLHA` (dossiê eficiencia-fiscal-pr3-encargos). No
  eSocial é a categoria 723 [D10 Tabela 01], que usa o S-2300 [D09] e cujo envio prévio é obrigatório, porque 723 não
  está entre as categorias dispensadas [D11 MOS, S-1200 item 23.1]. O S-1200 aceita remuneração de contribuinte
  individual [D09, S-1200, `codRubr` validação "a"]. **O MEI não cadastra o próprio CPF para informar pró-labore**: a
  contribuição dele vai no DAS-MEI [D11 MOS §2.1].
- **FGTS:** 8% da remuneração [D04 Lei 8.036 art. 15]; **2% no contrato de aprendizagem** [D04 art. 15 § 7º], § incluído
  pela Lei 10.097/2000, que entrou em vigor na publicação [D13 art. 4º], no DOU de 20/12/2000 [D14].
- **Aprendiz:** de 14 a 24 anos, contrato escrito por prazo determinado [D05 CLT art. 428]; prazo máximo de 2 anos
  [art. 428 § 3º] e extinção quando completa 24 [art. 433], salvo pessoa com deficiência [art. 428 § 5º]. "A partir de
  quatorze anos" [D12 CF art. 7º XXXIII, red. EC 20/1998]; abaixo de 16, só como aprendiz [idem].
- **Férias (períodos):** direito a cada 12 meses de vigência do contrato [D05 CLT art. 130 caput], concedidas nos 12
  meses seguintes [art. 134 caput]. Dias por faltas [art. 130 I–IV] e perda do direito [art. 133] dependem de dado de
  folha e de afastamento: ficam para a fase das folhas especiais.
- **Categorias do eSocial:** 101 empregado geral, 103 aprendiz, 723 sócio, 901 estagiário [D10 Tabela 01]. S-2200 só
  para as categorias do vínculo de emprego (101, 103…); S-2300 para as sem vínculo (723, 901…) [D09].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Faixas progressivas | EC 103 art. 28 § 1º | [D01]/[D06] | "aplicadas de forma progressiva sobre o salário de contribuição do segurado, incidindo cada alíquota sobre a faixa de valores compreendida nos respectivos limites" |
| Faixas de 2026 | Portaria Interministerial MPS/MF 13/2026 | [D07] | "Até R$ 1.621,00 7,5% / De R$ 1.621,01 a R$ 2.902,84 9% / De R$ 2.902,85 até R$ 4.354,27 12% / De R$ 4.354,28 até R$ 8.475,55 14%" |
| Sócio é contribuinte individual | Lei 8.212 art. 12 V "f" | [D02] | "o sócio gerente e o sócio cotista que recebam remuneração decorrente de seu trabalho em empresa urbana ou rural" |
| Base do contribuinte individual | Lei 8.212 art. 28 III | [D02] | "a remuneração auferida em uma ou mais empresas [...] durante o mês, observado o limite máximo" |
| Vigência do § 7º | Lei 10.097/2000 art. 4º; DOU | [D13]/[D14] | "Esta Lei entra em vigor na data de sua publicação"; "publicado no D.O.U. de 20.12.2000" |
| Piso salarial | CF art. 7º V | [D12] | "piso salarial proporcional à extensão e à complexidade do trabalho" |
| FGTS do aprendiz | Lei 8.036 art. 15 § 7º | [D04] | "Os contratos de aprendizagem terão a alíquota a que se refere o caput deste artigo reduzida para 2% (dois por cento)" |
| Aprendiz | CLT art. 428 caput, §§ 3º e 5º; art. 433 | [D05] | "ao maior de 14 (quatorze) e menor de 24 (vinte e quatro) anos"; "não poderá ser estipulado por mais de 2 (dois) anos" |
| Idade mínima | CF art. 7º XXXIII | [D12] | "salvo na condição de aprendiz, a partir de quatorze anos" |
| Período aquisitivo | CLT art. 130 caput | [D05] | "Após cada período de 12 (doze) meses de vigência do contrato de trabalho, o empregado terá direito a férias" |
| Período concessivo | CLT art. 134 caput | [D05] | "nos 12 (doze) meses subseqüentes à data em que o empregado tiver adquirido o direito" |
| Categorias | Tabela 01 do eSocial | [D10] | "723 Contribuinte individual - Empresário, sócio e membro de conselho de administração ou fiscal" |
| S-2200 × S-2300 | Leiaute S-1.3 | [D09] | "O evento S-2300 é permitido apenas para as categorias de trabalhadores [... 723 ... 901 ...]" |
| S-2300 obrigatório para 723 | MOS, S-1200 item 23.1 | [D11] | "(701, 711, 712, 741, 751, 781, 903 e 904) o envio prévio do evento S-2300 (TSVE – Início) não é obrigatório" |
| MEI sem pró-labore no eSocial | MOS §2.1 | [D11] | "não deve cadastrar seu próprio CPF como contribuinte individual para informar o valor do seu pró-labore" |

## 3. Vigência conferida
- Alertas do acervo: D01 (EC 103) veio como "original"; conferida no Planalto [D06], sem alteração marcada no art. 28
  (só a nota "(Vigência)"). D02–D05: compiladas, cópia de 13/10/2026, sem alerta. Fonte oficial não aberta para elas.
- MOS: a cópia lida em 10/10 (consolidada até a NO 11/2026) foi substituída pela consolidada até a **NO 12/2026** [D11],
  que é a lida aqui. Leiaute e tabelas: versão S-1.3 com a NT 07/2026 rev. 20/10/2026 [D09, D10].
- Regulamentação anual: a portaria de 2027 trará as faixas e o teto novos; o salário mínimo de 2027 sai por decreto.
  Entram por PR de dado (linha nova com vigência), como as de 2026.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma que mude o cadastro. Leitura adotada e registrada no BRIEF: o limite de 24 anos do aprendiz vale para todo o
contrato (art. 433: extingue-se ao completar 24), e não só na admissão.

## 5. Lacunas
- Texto da Portaria Interministerial MPS/MF 13/2026 no DOU (usada a tabela oficial do INSS que a transcreve, [D07]).
- Lei 11.788/2008 (estágio) não lida: o F1 só cadastra o estagiário (categoria 901); jornada máxima, recesso e seguro
  ficam para o BRIEF da fase que calcular a bolsa.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Emenda Constitucional nº 103 de 12/11/2019 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/emendas-constitucionais/2019/emc-103-2019-11-12.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:emenda.constitucional:2019-11-12;103> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-11-02T20:11:39-03:00 · arquivo local `docs/D01_emc-103-2019-11-12.md` · SHA-256 `3b965eaafea881bd5adc3bb2e3a663521aaed299139996efa8ce60ecf540ee88`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-02T20:11:39-03:00 · arquivo local `docs/D02_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`
- **[D03]** Lei nº 10.666 de 08/05/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2003/lei-10666-2003-05-08.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-05-08;10666> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-02T20:11:40-03:00 · arquivo local `docs/D03_lei-10666-2003-05-08.md` · SHA-256 `3311fc0954581236c74cbcd937470a15a481f5a858b6197fc538ce11e824d827`
- **[D04]** Lei nº 8.036 de 11/05/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-02T20:11:40-03:00 · arquivo local `docs/D04_lei-8036-1990-05-11.md` · SHA-256 `2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22`
- **[D05]** Decreto-Lei nº 5.452 de 01/05/1943 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/decretos-lei/1943/del-5452-1943-05-01.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1943-05-01;5452> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-02T20:11:41-03:00 · arquivo local `docs/D05_del-5452-1943-05-01.md` · SHA-256 `7eee0da3b620a17fbd7b34a0eb9adc967c4fb6650d1acba37469d247f88f4600`
- **[D06]** Emenda Constitucional nº 103 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm>  
  Baixado em 2026-11-02T20:12:01-03:00 · arquivo local `docs/D06_emc103-htm.html` · SHA-256 `3ab0d2f339cbe287f7be69af1d9138b9253ac0b91f7f1f5d1b4a3e4fb5b76219`
- **[D07]** Tabela de contribuição mensal — Instituto Nacional do Seguro Social - INSS — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal>  
  Baixado em 2026-11-02T20:12:01-03:00 · arquivo local `docs/D07_tabela-de-contribuicao-mensal.html` · SHA-256 `10048cc43744e44a290665d685b27d82ad38161d9f7da2edc5fecf35197240e2`
- **[D08]** Documentação Técnica — eSocial — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/esocial/pt-br/documentacao-tecnica>  
  Baixado em 2026-11-02T20:12:45-03:00 · arquivo local `docs/D08_documentacao-tecnica.html` · SHA-256 `c4794de2bff2405954ec80f8de91076ba36920b1c51a3086bbb9a600507fb774`
- **[D09]** eSocial versão S-1.3 - Leiautes — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-07-2026-rev-20-10-2026/index.html>  
  Baixado em 2026-11-02T20:12:54-03:00 · arquivo local `docs/D09_index-html.html` · SHA-256 `25ffc2061fab32043d62be331db2da16590008bcb89ecc8de0f5276ddeca6425`
- **[D10]** eSocial versão S-1.3 - Tabelas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-07-2026-rev-20-10-2026/tabelas.html>  
  Baixado em 2026-11-02T20:13:06-03:00 · arquivo local `docs/D10_tabelas-html.html` · SHA-256 `19abfe05f6823c7b6428d7c7cfb35f8e06f39b20e585ee5eb8c5079a607c2347`
- **[D11]** MANUAL DE ORIENTAÇÃO DO ESOCIAL – VERSÃO … — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-12-2026.pdf>  
  Baixado em 2026-11-02T20:17:18-03:00 · arquivo local `docs/D11_mos-s-1-3-consolidada-ate-a-no-s-1-3-12-2026-pdf.pdf` · SHA-256 `a44f285aa0c904d5dcded779a9eff89f75b4ab262351a4c379390d12c7fc318a`
- **[D12]** Constituição — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm>  
  Baixado em 2026-11-02T21:37:20-03:00 · arquivo local `docs/D12_constituicao-htm.html` · SHA-256 `1b3b493dc795287a343d9a94e10117c8f051b40fca7e22553e6f91ba706a631a`
- **[D13]** Lei nº 10.097 de 19/12/2000 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2000/lei-10097-2000-12-19.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2000-12-19;10097> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-02T21:42:44-03:00 · arquivo local `docs/D13_lei-10097-2000-12-19.md` · SHA-256 `0c8fa026383bb03f5cfd5fa70c8fa7b612c7f5448a8cb11e9865a1dccc837d0f`
- **[D14]** L10097 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l10097.htm>  
  Baixado em 2026-11-02T21:42:51-03:00 · arquivo local `docs/D14_l10097-htm.html` · SHA-256 `c9b49fedd47d73abe547ad5ceb9a9209bc006518e2d9cb2b95c5f04419398cdc`

## Registro de buscas
_Nenhuma busca registrada._
