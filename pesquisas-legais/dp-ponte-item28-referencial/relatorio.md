# Relatório de pesquisa legal — dp-ponte-item28-referencial

**Pergunta:** Códigos do plano referencial RFB (ECF L100A/L300A, P100A/P150A) das folhas de pessoal do plano padrão (item 28 da ponte folha→razão)
**Aberto em:** 2026-11-26T16:21:23-03:00 · **Atualizado em:** 2026-11-26T16:41:52-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Quinze das dezoito folhas de pessoal que a ponte pede têm linha própria na tabela dinâmica da ECF [D01], com o mesmo
código no Lucro Real (L100A/L300A) e no Presumido (P100A/P150A), analítica e sem DT_FIM. Três não fecham e ficam fora
do plano padrão até a resposta do dono (§4).

| Folha do plano | Papel | Referencial | Grau |
|---|---|---|---|
| 1.1.10.01 Adiantamentos Salariais | SALARY_ADVANCES | 1.01.02.01.03 Adiantamentos a Funcionários – Circulante | verificado |
| 2.1.10.01 Salários a Pagar | SALARIES_PAYABLE | 2.01.01.01.01 Salários e Remunerações a Pagar | verificado |
| 2.1.10.02 Pró-labore a Pagar | OWNER_PAY_PAYABLE | 2.01.01.01.01 (a ORIENTAÇÃO cita "pro labore") | verificado |
| 2.1.10.03 INSS a Recolher | INSS_A_RECOLHER | 2.01.01.01.03 INSS a Recolher | verificado (com nota §4) |
| 2.1.10.04 FGTS a Recolher | FGTS_A_RECOLHER | 2.01.01.01.04 FGTS a Recolher | verificado |
| 2.1.10.05 Provisão de Férias | VACATION_PROVISION | 2.01.01.15.03 Férias a Pagar (grupo PROVISÕES – CIRCULANTE) | inferido (nota §4) |
| 2.1.10.06 Provisão de 13º Salário | PROVISAO_13 | 2.01.01.15.04 13º Salário a Pagar (grupo PROVISÕES) | inferido (nota §4) |
| 4.10.01 Salários e Ordenados | SALARIES_EXPENSE | 3.01.01.07.01.02 Ordenados, Salários, Gratificações… a Empregados | verificado |
| 4.10.02 Pró-labore | OWNER_PAY_EXPENSE | 3.01.01.07.01.01 Remuneração a Dirigentes ("titular de firma individual, aos sócios") | verificado |
| 4.10.03 INSS Patronal | INSS_PATRONAL | 3.01.01.07.01.05 Encargos Sociais – Previdência Social (Lei 8.212 art. 22 I [D02]) | verificado |
| 4.10.04 RAT | RAT | 3.01.01.07.01.05 (Lei 8.212 art. 22 II [D02]: contribuição da empresa à Seguridade Social) | inferido |
| 4.10.05 Contribuições a Terceiros | TERCEIROS | 3.01.01.07.01.07 Encargos Sociais – Outros ("demais encargos sociais", fora de Previdência e FGTS) | inferido |
| 4.10.06 FGTS | FGTS | 3.01.01.07.01.06 Encargos Sociais – FGTS | verificado |
| 4.10.07 Férias | VACATION_EXPENSE | 3.01.01.07.01.26 Provisões para Férias | verificado |
| 4.10.08 13º Salário | DESPESA_13 | 3.01.01.07.01.27 Provisões para 13º Salário de Empregados | verificado (com nota §4) |

O IRRF da folha reusa a 2.1.7.03 → 2.01.01.09.01, que já existe (F-RET-19 a).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Salários e pró-labore a pagar | Tabela ECF, L100A 2.01.01.01.01 | [D01] | "salários, ordenados, pro labore, horas extras" |
| Pró-labore (despesa) | Tabela ECF, L300A 3.01.01.07.01.01 | [D01] | "remuneração mensal e fixa atribuída ao titular de firma individual, aos sócios" |
| Provisão de férias e 13º (passivo) | Tabela ECF, L100A 2.01.01.15.03/.04 | [D01] | "Férias a Pagar" / "13º Salário a Pagar", sob "PROVISÕES – CIRCULANTE" |
| Patronal à Seguridade | Lei 8.212, art. 22 I | [D02] | "vinte por cento sobre o total das remunerações pagas, devidas ou creditadas" |
| RAT à Seguridade | Lei 8.212, art. 22 II | [D02] | "incapacidade laborativa decorrente dos riscos ambientais do trabalho" |
| Encargos de previdência | Tabela ECF, L300A 3.01.01.07.01.05 | [D01] | "contribuições para a Previdência Social, não computadas nos custos" |

As linhas inteiras (código, descrição, DT_INI, DT_FIM, TIPO, superior, nível, natureza, orientação), das quatro abas,
estão em `docs/D01_linhas-citadas.txt`. O teste `ChartOfAccountsFixture.contasPessoal.test.ts` as lê.

## 3. Vigência conferida
- [D01] baixado de novo em 26/11/2026 pelo link oficial `download/8002`. O SHA-256 é o mesmo da cópia de 21/10
  (`pesquisas-legais/irrf-referencial-sped`), então a tabela não mudou. A página de versões
  (http://sped.rfb.gov.br/pasta/show/1644, lida em 26/11/2026) lista como mais recente "Leiaute 12 (Atualização:
  28/05/2026)". Não há leiaute 13 publicado.
- Todas as linhas usadas: TIPO A, DT_INI 01012015, DT_FIM vazio, natureza 1/2/4 conforme a conta. Mesmo código e
  rótulo na aba do Real e na do Presumido.
- [D02] acervo compilado, cópia de 13/10/2026, sem alerta.
- O binário [D01] não é versionado de novo neste dossiê porque é o mesmo arquivo (mesmo hash) do
  `irrf-referencial-sped/docs/`.

## 4. Ambiguidades (só o que precisa de decisão humana)
**Ao dono (fora do plano até a resposta):**
- **Bolsa de estágio (INTERNSHIP_STIPEND_EXPENSE).** Leitura 1: 3.01.01.07.01.03 "Outros Gastos com Pessoal" ("demais
  gastos com pessoal não especificados"). Leitura 2: 3.01.01.07.01.04 "Outros Serviços Prestados por Pessoa Física ou
  Jurídica", que diz "que não tenha vínculo empregatício"; o estágio não cria vínculo (Lei 11.788, art. 3º, não lido
  nesta sessão). A .02 fala em "empregados" e fica de fora. A leitura mais segura é a 1, porque a bolsa é gasto com
  pessoal e não serviço contratado. Mesmo assim fica como pergunta.
- **Encargos sobre a provisão (PROVISION_CHARGES_EXPENSE e PROVISION_CHARGES).** Na despesa, a .26 (férias) e a .27
  (13º) incluem "encargos sociais", e uma conta única de encargos não se divide entre as duas. No passivo, a
  2.01.01.15.03/.04 não cita encargos, e a 2.01.01.01.09 "Demais Encargos a Recolher" exclui INSS e FGTS. Leitura 1:
  dividir o papel em encargos de férias e encargos de 13º, cada par na sua linha (.26/.27 e 2.01.01.15.03/.04). Leitura
  2: uma conta só, na 3.01.01.07.01.07 / 2.01.01.15.05 "Provisões de Natureza Trabalhista". A Leitura 1 segue o texto da
  tabela, mas muda o catálogo de papéis do item 18. São papéis do PR-P4.

**Ao contador, no P-FOL-5 (as folhas entram como PROVISÓRIAS):**
- Duas linhas analíticas nomeiam o passivo de férias e 13º: a 2.01.01.15.03/.04, sob PROVISÕES, e a 2.01.01.01.01, cuja
  ORIENTAÇÃO inclui "o valor das férias do período aquisitivo já completo, 13 salários a pagar". A provisão mensal foi para
  a 2.01.01.15.03/.04 porque é provisão e o período aquisitivo ainda corre. Pergunta: férias de período já completo
  migram para a 2.01.01.01.01, ou a provisão fica toda na 2.01.01.15.03?
- A .27 diz "no caso de apuração trimestral do imposto". Pergunta: no Lucro Real anual, a despesa de 13º do ano vai à .27
  ou à .02?
- Terceiros na despesa .07, e no passivo junto do INSS a Recolher (2.01.01.01.03), porque o item 20 credita tudo numa
  conta. Pergunta: o passivo de terceiros pede conta própria na 2.01.01.01.09?
- Pessoal da prestação de serviço: a .05/.06 dizem "não computadas nos custos". Pergunta: no salão, salário e encargos
  dos profissionais vão a custo (3.01.01.03.01.03) ou ficam em despesa operacional?

## 5. Lacunas
- Lei 11.788/2008 (estágio) não foi lida nesta sessão. Ela só sustentaria a Leitura 2 da bolsa.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/E1/20FDEEE25CAA9F998AC2AD3045DE0E9C631D3C/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx>  
  Baixado em 2026-11-26T16:21:30-03:00 · arquivo local `docs/D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_.html` · SHA-256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`
- **[D02]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-26T16:21:57-03:00 · arquivo local `docs/D02_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`

## Registro de buscas
_Nenhuma busca registrada._
