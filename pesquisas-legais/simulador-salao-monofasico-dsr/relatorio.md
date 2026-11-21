# Relatório de pesquisa legal — simulador-salao-monofasico-dsr

**Pergunta:** No Simples de 2026, a revenda de cosmético monofásico paga PIS e Cofins dentro do DAS? E o empregado que recebe comissão em % dos serviços tem direito a repouso semanal remunerado sobre a comissão, e como se calcula?
**Aberto em:** 2026-11-21T10:41:49-03:00 · **Atualizado em:** 2026-11-21T11:04:54-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Monofásico no DAS (2026).** Não paga. A receita de revenda de produto sujeito à tributação monofásica é segregada
(LC 123 art. 18 § 4º-A I [D01]) e, na apuração de cada tributo do mês, "serão consideradas as reduções relativas aos
tributos […] sobre os quais tenha havido tributação monofásica" (art. 18 § 12 [D01]). No DAS da revenda (Anexo I), a
parte de PIS e de Cofins da receita de cosmético monofásico sai; IRPJ, CSLL, CPP e ICMS ficam. Vale para 2026: o § 4º-A I
traz "(Vide LC 214)" e a Lei 10.147 é revogada em 1º/1/2027 (dossiê `regime-fora-simples-salao`), quando o DAS passa a
levar CBS e IBS. Aplicado no simulador (marcador `mono-das v1`), só a PIS e Cofins da revenda, só em 2026.

**DSR sobre a comissão.** É devido: "É devida a remuneração do repouso semanal e dos dias feriados ao empregado
comissionista, ainda que pracista" (TST Súmula 27 [D03], conferida no caderno oficial [D04]); todo empregado tem direito
ao repouso semanal remunerado e aos feriados (Lei 605 art. 1º [D02]). O salário fixo mensal já os inclui (art. 7º § 2º
[D02]); a comissão, não. Aplicado no simulador (marcador `dsr-comissao v1`): comissão ÷ dias trabalhados × domingos e
feriados do ano; o valor entra no salário e, por isso, no FGTS, no 13º, nas férias e, fora do Simples, no INSS patronal.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Segregação da receita monofásica | LC 123 art. 18 § 4º-A I | [D01] | "O contribuinte deverá segregar, também, as receitas: I - decorrentes de operações ou prestações sujeitas à tributação concentrada em uma única etapa (monofásica)…" |
| Redução do tributo no mês | LC 123 art. 18 § 12 | [D01] | "serão consideradas as reduções relativas aos tributos já recolhidos, ou sobre os quais tenha havido tributação monofásica, isenção, redução…" |
| Direito ao repouso | Lei 605 art. 1º | [D02] | "Todo empregado tem direito ao repouso semanal remunerado, de vinte e quatro horas consecutivas, preferentemente aos domingos e […] nos feriados civis e religiosos" |
| DSR do comissionista | TST Súmula 27 | [D03], [D04] | "É devida a remuneração do repouso semanal e dos dias feriados ao empregado comissionista, ainda que pracista." |
| Fixo mensal já inclui o repouso | Lei 605 art. 7º § 2º | [D02] | "Consideram-se já remunerados os dias de repouso semanal do empregado mensalista ou quinzenalista…" |
| Base de cálculo usada | Lei 605 art. 7º "c" | [D02] | "para os que trabalham por tarefa ou peça, o equivalente ao salário correspondente às tarefas ou peças feitas durante a semana, no horário normal de trabalho, dividido pelos dias de serviço efetivamente prestados ao empregador" |
| VT: base dos 6% de quem tem fixo + comissão | Decreto 10.854 arts. 114 I e 117 | [D05], [D06] | "I - o salário básico ou vencimento, excluídos quaisquer adicionais ou vantagens; e II - o montante percebido no período, nas seguintes hipóteses: a) quando se tratar de trabalhador remunerado por tarefa ou serviço feito; ou b) quando se tratar de remuneração constituída exclusivamente de comissões, percentagens, gratificações, gorjetas ou equivalentes" |

**Vale-transporte (pergunta acessória, 21/11).** Com salário fixo mais comissão, os 6% do empregado saem do fixo
(art. 117 I); só com remuneração exclusivamente de comissão a base é o total do período (art. 117 II "b"). O simulador
já fazia assim; o texto da fórmula no cartão da aba Equipe foi corrigido para mostrar a base usada. [D05] é o texto
original do acervo; conferido no compilado do Planalto [D06], com o mesmo art. 117.

## 3. Vigência conferida
- Alertas do acervo: [D01] e [D02] compilados, cópia de 13/10/2026, sem alerta. [D03] é "caderno consolidado do
  tribunal": conferido em 21/11/2026 no Livro de Súmulas do TST [D04], onde a Súmula 27 consta "(mantida) - Res. 121/2003".
- Redação atual: art. 18 § 12 da LC 123 com redação da LC 147/2014; art. 7º "a" e "b" da Lei 605 com redação da Lei
  7.415/1985 ("c" e § 2º no texto original).
- Norma posterior: o § 4º-A I traz "(Vide LC 214)". O simulador não aplica a redução em 2027.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Fórmula do DSR do comissionista.** A Lei 605 não tem alínea própria para comissão. Leitura usada: a do salário por
  tarefa ou peça (art. 7º "c"), ganho ÷ dias de serviço prestados, por dia de repouso; no mês, comissão ÷ dias trabalhados
  × domingos e feriados. Outra leitura: a divisão por seis do art. 7º "d", que a lei reserva ao empregado em domicílio
  (daria 16,67% fixos, contra 20,86% em 2026 com 6 dias por semana). A leitura usada é a mais cara para o salão e, por
  isso, a mais segura na simulação. Pergunta para o contador: "A folha do salão calcula o DSR da comissão por dias úteis
  trabalhados × domingos e feriados do mês? O sábado conta como dia trabalhado?"
- **Feriados.** O fator usa os feriados nacionais e os de São Paulo capital que o simulador já usava no vencimento do DAS
  (dossiê `parecer-salao-sp-4-pessoas`), sem o Carnaval. A convenção coletiva não foi relida para feriado próprio da
  categoria.

## 5. Lacunas
- Não procurei jurisprudência sobre a forma de cálculo do DSR do comissionista além da Súmula 27.
- Convenção coletiva (CCT SP006651/2026): não relida nesta pesquisa quanto a DSR ou a dias de trabalho por semana.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T10:42:01-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei nº 605 de 05/01/1949 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8b1889b66586a63a2d4756b874dc2082bf982f67/federal/leis-ordinarias/1949/lei-605-1949-01-05.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1949-01-05;605> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T10:42:03-03:00 · arquivo local `docs/D02_lei-605-1949-01-05.md` · SHA-256 `6c29fe16e8c5f4052f345e2d2576f4232d703ea9c2f03a35b41e01be7f2b7f10`
- **[D03]** Súmula nº 27 do TST — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d6c0159be76282be2cdb1dc03c91346ae6dc9b51/jurisprudencia/tst/sumulas/sumula-27.md>  
  Fonte oficial declarada: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf> · versao_texto: caderno consolidado do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T10:42:22-03:00 · arquivo local `docs/D03_sumula-27.md` · SHA-256 `7b2afa2c4555604e17f2a0c239222d6df89e8102c79530d6ea4fd7f301d19a00`  
  ⚠ versao_texto = 'caderno consolidado do tribunal' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D04]** TRIBUNAL SUPERIOR DO TRABALHO — TST  
  Link oficial: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf>  
  Baixado em 2026-11-21T10:42:59-03:00 · arquivo local `docs/D04_Livro-Internet-pdf.pdf` · SHA-256 `46321b2d8d04840eeeb55417937c5a6657c9df5ac40fed1d44a2bf0989c06e8a`
- **[D05]** Decreto nº 10.854 de 10/11/2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2021/dec-10854-2021-11-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2021-11-10;10854> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-11-21T11:02:30-03:00 · arquivo local `docs/D05_dec-10854-2021-11-10.md` · SHA-256 `691460deea1935e3aab2096909a9fd11c701d64455a0dbaca537b470d85cfecb`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** D10854 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/d10854.htm>  
  Baixado em 2026-11-21T11:02:45-03:00 · arquivo local `docs/D06_d10854-htm.html` · SHA-256 `283caeafd80f46fbb71b91f379da5e37f352877991ee4f7966d4d50502bfadca`

## Registro de buscas
_Nenhuma busca registrada._
