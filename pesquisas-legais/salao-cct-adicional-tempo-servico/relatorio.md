# Relatório de pesquisa legal — salao-cct-adicional-tempo-servico

**Pergunta:** Cláusula 17ª da CCT SP006651/2026 (adicional por tempo de serviço): base, contagem, teto, regra REPIS, efeito do aditivo SP009373/2026 e integração à remuneração (FGTS, 13º, férias)
**Aberto em:** 2026-11-21T11:45:20-03:00 · **Atualizado em:** 2026-11-21T11:55:28-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O adicional por tempo de serviço (ATS) da cláusula 17ª da CCT SP006651/2026 [D01] confere: empresa em geral paga **1,5% por ano de serviço prestado à mesma empresa, pago mês a mês, até 15% (10 anos)**; empresa **enquadrada no REPIS** "poderá aplicar" **1% por ano, até 15% (15 anos)** (§ 2º); fica ressalvado o direito adquirido ao biênio/triênio de 5% de CCTs anteriores (§ 1º). A conta começa na **admissão** ("por ano de serviço, prestados à mesma empresa"), não na data-base. Termo aditivo SP009373/2026 [D02]: não trata do ATS e mantém "todas as demais cláusulas" (cl. 11ª), então a regra não mudou. **A cláusula não diz qual é a base de cálculo** (salário contratual, piso ou remuneração com comissão), e isso fica para o contador (§ 4). O ATS tem natureza salarial e entra na base do FGTS, do INSS, do 13º e das férias (Súm. 203 TST [D07][D08]; Lei 8.036 art. 15 [D04]; Lei 8.212 art. 28 I [D05]; Lei 4.090 art. 1º § 1º [D06]; CLT art. 142 [D03]).

**Para o simulador:** `ATS = base × min(anos_completos × 1,5%, 15%)` (empresa em geral) ou `base × min(anos_completos × 1%, 15%)` (REPIS que aplicar o § 2º). O ATS entra no salário de cada mês e, por isso, também em FGTS, INSS, 13º, férias + 1/3 e aviso prévio. Valor padrão da base até o contador responder: o salário contratual fixo, que é a leitura mais comum e a de menor custo. Deixe o campo editável.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Percentual, contagem e teto (geral) | CCT SP006651/2026, cl. 17ª caput | [D01] | "o percentual de 1,5% (um virgula cinco por cento), por ano de serviço, prestados à mesma empresa, pagos mês a mês, limitando-se ao máximo de 15% (quinze por cento), ou seja 10 (dez) anos" |
| Direito adquirido | cl. 17ª § 1º | [D01] | "tenham adquirido o direito ao biênio ou triênio de 5% (cinco por cento)" |
| REPIS | cl. 17ª § 2º | [D01] | "As empresas enquadradas no REPIS [...] poderão aplicar o percentual de 1% (um por cento) para cada ano [...] limitando-se ao máximo de 15% [...] ou seja 15 (quinze) anos" |
| Equivalência salarial ≠ REPIS | Aditivo cl. 4ª § 1º | [D02] | "única e exclusivamente a pratica do piso salarial diferenciado [...] sem os demais benefícios concedidos às empresas que se enquadrem no REPIS" |
| Prazo de adesão ao REPIS 2026/2027 | Aditivo cl. 3ª § 2º | [D02] | "se encerrará no dia 30 DE SETEMBRO DE 2026" |
| Aditivo não altera o ATS | Aditivo cl. 11ª | [D02] | "Todas as demais cláusulas existentes na CCT 2025/2027 [...] aqui não mencionadas ficam mantidas" |
| Vigência | CCT cl. 1ª | [D01] | "01º de junho de 2025 a 31 de maio de 2027 e a data-base da categoria em 01º de junho" |
| Natureza salarial | Súmula 203 TST | [D07][D08] | "A gratificação por tempo de serviço integra o salário para todos os efeitos legais." |
| FGTS | Lei 8.036, art. 15 caput | [D04] | "8% [...] da remuneração paga ou devida [...] incluídas na remuneração as parcelas de que tratam os arts. 457 e 458 da CLT" |
| INSS | Lei 8.212, art. 28, I | [D05] | "a totalidade dos rendimentos pagos [...] nos termos da lei ou do contrato ou, ainda, de convenção ou acordo coletivo" |
| 13º | Lei 4.090, art. 1º § 1º | [D06] | "1/12 avos da remuneração devida em dezembro, por mês de serviço" |
| Férias | CLT art. 142 caput | [D03] | "a remuneração que lhe for devida na data da sua concessão" |
| Composição do salário | CLT art. 457 § 1º | [D03] | "Integram o salário a importância fixa estipulada, as gratificações legais e as comissões" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - D03 a D06 (CLT, 8.036, 8.212, 4.090): compilados, cópia de 13/10/2026, sem alerta.
  - D07 (Súm. 203, caderno consolidado e corpo curto): conferida no livro oficial do TST baixado hoje [D08], com o mesmo texto e marcada "(mantida) - Res. 121/2003". Resíduo: a edição do livro não tem data explícita, e a resolução mais recente citada nele é a Res. 220/2017. Não houve como confirmar uma alteração depois disso, porque o site de jurisprudência do TST carrega por JavaScript.
- **CCT e aditivo:** baixados hoje do Mediador oficial [D01][D02]. A CCT foi registrada em 21/07/2026 e vale de 01/06/2025 a 31/05/2027. O aditivo foi registrado em 30/09/2026 e vale de 01/06/2026 a 31/05/2027. A cláusula 17ª saiu idêntica no download hoje e no de 20/11 (comparada com diff).
- **Norma mais específica:** a CCT é a fonte do direito, e a lei não prevê ATS. Nada pendente.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Base de cálculo.** A cl. 17ª diz só "o percentual de 1,5%", sem dizer sobre o quê. Há três leituras:
   - (a) salário contratual fixo, que é o menor custo e a prática mais comum;
   - (b) piso da categoria, que fica menor ainda para quem ganha acima do piso;
   - (c) remuneração total com comissões, que é o maior custo, e muito maior para o comissionista.
   - Leitura mais segura para o empregador evitar passivo: (a) com piso mínimo. A (c) é a do maior risco se o sindicato a defender.
   - Pergunta ao contador: *"A cl. 17ª da CCT SP006651/2026 não define a base do ATS. No nosso salão, o 1,5%/ano incide sobre o salário fixo contratual, sobre o piso ou sobre fixo + comissões? E para o comissionista com garantia de piso?"*
2. **Fração de ano.** O texto fala em "por ano de serviço" e não menciona fração. A leitura mais segura é contar só anos completos desde a admissão. Pergunta: *"O ATS sobe no aniversário de admissão (ano completo) ou proporcionalmente?"*
3. **Quem é REPIS e se aplica o 1%.** O § 2º é facultativo ("poderão"). Só vale para empresa com certificado REPIS 2026/2027, pedido até 30/09/2026. Quem tem só a "equivalência salarial" paga 1,5%. No simulador, isso vira um campo: REPIS sim ou não, e, se sim, se aplica o 1%.
4. **Art. 457 § 1º** fala em "gratificações legais", e o ATS é convencional. A integração vem da Súm. 203 e das bases amplas (8.036 art. 15, 8.212 art. 28 I, que cita "convenção ou acordo coletivo"). Risco residual baixo.

## 5. Lacunas
- Não há norma nem cláusula que defina a base do ATS. A resposta depende do contador ou do sindicato (§ 4.1).
- Não foi possível confirmar no site do TST se a Súm. 203 mudou depois da Res. 220/2017 (página dinâmica).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Mediador - Extrato Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR008673%2F2026>  
  Baixado em 2026-11-21T11:45:21-03:00 · arquivo local `docs/D01_ResumoVisualizar.html` · SHA-256 `597dbc67c4f055fec95b3f584750fe21767796f6048b298e36e98922d70c9197`
- **[D02]** Mediador - Extrato Termo Aditivo de Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR060354%2F2026>  
  Baixado em 2026-11-21T11:45:21-03:00 · arquivo local `docs/D02_ResumoVisualizar.html` · SHA-256 `0f1d4dd502c80faef38fe6fffafbea016710621008f760000b98edae5601e002`
- **[D03]** Decreto-Lei nº 5.452 de 01/05/1943 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/f3db126e93c366f938bd927bbf184a8fcf64b2ea/federal/decretos-lei/1943/del-5452-1943-05-01.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1943-05-01;5452> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:19-03:00 · arquivo local `docs/D03_del-5452-1943-05-01.md` · SHA-256 `7eee0da3b620a17fbd7b34a0eb9adc967c4fb6650d1acba37469d247f88f4600`
- **[D04]** Lei nº 8.036 de 11/05/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ccdcc898b79c13be701c7841b195174e1898ccf8/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:21-03:00 · arquivo local `docs/D04_lei-8036-1990-05-11.md` · SHA-256 `2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22`
- **[D05]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:22-03:00 · arquivo local `docs/D05_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`
- **[D06]** Lei nº 4.090 de 13/07/1962 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/20775c2cef862b096ea72544740d35e0653b3849/federal/leis-ordinarias/1962/lei-4090-1962-07-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1962-07-13;4090> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:24-03:00 · arquivo local `docs/D06_lei-4090-1962-07-13.md` · SHA-256 `07f6d7929f10c8349173691920021a1d37759e1319f14689da0ad541716fa752`
- **[D07]** Súmula nº 203 do TST — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d6c0159be76282be2cdb1dc03c91346ae6dc9b51/jurisprudencia/tst/sumulas/sumula-203.md>  
  Fonte oficial declarada: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf> · versao_texto: caderno consolidado do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T11:46:25-03:00 · arquivo local `docs/D07_sumula-203.md` · SHA-256 `030c6e2f17023792b1fb58f0af4e1706a34666ac7ac5ea6606e4eb12b9d07ef7`  
  ⚠ versao_texto = 'caderno consolidado do tribunal' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D08]** TRIBUNAL SUPERIOR DO TRABALHO — TST  
  Link oficial: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf>  
  Baixado em 2026-11-21T11:49:36-03:00 · arquivo local `docs/D08_Livro-Internet-pdf.pdf` · SHA-256 `46321b2d8d04840eeeb55417937c5a6657c9df5ac40fed1d44a2bf0989c06e8a`

## Registro de buscas
_Nenhuma busca registrada._
