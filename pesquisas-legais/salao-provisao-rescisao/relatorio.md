# Relatório de pesquisa legal — salao-provisao-rescisao

**Pergunta:** Provisão mensal da rescisão sem justa causa de empregado CLT de salão em SP: aviso prévio proporcional, multa de 40% do FGTS, LC 110, FGTS/INSS do aviso indenizado, férias/13º proporcionais e cláusulas da CCT SP006651/2026
**Aberto em:** 2026-11-21T11:45:20-03:00 · **Atualizado em:** 2026-11-21T11:55:28-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Na dispensa sem justa causa de um CLT do salão, o custo **incremental** que a provisão mensal de 13º e de férias (1/12) **não** cobre é este:
- **(a) aviso prévio indenizado:** 30 dias + 3 por ano de serviço, até 90 dias [D05][D16] (60 dias + proporcional se o empregado tem mais de 45 anos e mais de 2 anos de casa, CCT cl. 38ª [D01]);
- **(b) reflexos do aviso no 13º e nas férias + 1/3:** a projeção do aviso conta como tempo de serviço (CLT 487 § 1º [D03]; Súm. 371 [D14][D18]);
- **(c) FGTS de 8% sobre o aviso e o 13º da rescisão** (Súm. 305 [D11][D18]), mas não sobre as férias indenizadas (Lei 8.036 art. 15 § 6º → Lei 8.212 art. 28 § 9º "d" [D04][D08]);
- **(d) multa de 40%** sobre todos os depósitos do contrato (Lei 8.036 art. 18 § 1º [D04]);
- **(e) adicionais da CCT:** 1 salário se a dispensa (com o aviso projetado) cair no trintídio antes de 1º/06 (cl. 34ª [D01]; Lei 7.238 art. 9º [D19]) e R$ 150 de homologação no sindicato para quem não é contribuinte (cl. 36ª § 6º).

Os **10% da LC 110 não existem mais** desde 01/01/2020 (Lei 13.932 art. 12 [D07]; Planalto [D15]). **INSS não incide** sobre o aviso indenizado (STJ Tema 478, mantido em 13/05/2026 [D12]; a própria RFB o exclui, IN RFB 2.110 art. 34 XXXII [D22]), **mas incide sobre o reflexo dele no 13º** (mesmo inciso). As férias proporcionais + 1/3 e o 13º proporcional até a data da dispensa **já estão na provisão mensal de 1/12** (CLT 146 p.ú./147, Lei 4.090 art. 3º, Súm. 171/328) e não entram de novo.

### Fórmula de provisão mensal (por empregado CLT)
Entradas por pessoa: `S` = remuneração mensal (fixo + ATS + média de comissões; CLT 487 § 3º manda média de 12 meses para tarefa, e Súm. 354 tira a gorjeta), `n` = anos completos de casa, `D` = saldo acumulado de depósitos de FGTS (ou `8% × S × 13,33 × n` como estimativa), `t` = rotatividade anual sem justa causa (campo).
```
dias_aviso = min(30 + 3·n_extra, 90)        # n_extra: ver Ambiguidade 1; cl. 38ª: 60 + 3·n_extra se >45 anos e >2 anos de casa
AV        = S × dias_aviso / 30             # aviso indenizado
avos      = arred(dias_aviso / 30)           # meses projetados (fração ≥ 15 dias = 1 avo; Lei 4.090 art. 1º § 2º; CLT 146 p.ú.)
R13       = S × avos / 12                    # reflexo no 13º
RFER      = S × avos / 12 × 4/3              # reflexo em férias + 1/3 (indenizadas)
FGTS_resc = 8% × (AV + R13)                  # Súm. 305; férias indenizadas fora (8.212 art. 28 § 9º "d")
MULTA     = 40% × (D + FGTS_mês_rescisão [+ FGTS_resc ? ver Ambiguidade 2])
INSS_patr = alíquota_patronal × R13          # só fora do Simples Anexo III (ou CPP do Anexo IV); aviso e férias indenizadas fora (IN 2.110 art. 34 XXXII)
CCT       = (1/12) × S                       # valor esperado da cl. 34ª, se as dispensas se distribuem no ano
          + R$150 × p_não_contribuinte        # cl. 36ª § 6º (só empresa não REPIS homologa no sindicato, § 1º)
CUSTO_RESC = AV + R13 + RFER + FGTS_resc + MULTA + INSS_patr + CCT
PROVISÃO_MENSAL = t × CUSTO_RESC / 12
```
Com **aviso trabalhado**, AV deixa de ser custo extra (é salário com trabalho), os reflexos somem, e cabe só a redução de 2 h/dia ou 7 dias (CLT 488; cl. 39ª), que vira custo de produção perdida. Há exceção na cl. 38ª § único: quem tem mais de 45 anos e mais de 2 anos de casa trabalha 30 dias e recebe o resto indenizado. Para provisão, a hipótese conservadora é o **indenizado**.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Aviso proporcional | Lei 12.506 art. 1º p.ú. | [D05][D16] | "acrescidos 3 (três) dias por ano de serviço prestado na mesma empresa, até o máximo de 60 (sessenta) dias, perfazendo um total de até 90 (noventa) dias" |
| Aviso indenizado integra tempo de serviço | CLT art. 487 § 1º | [D03] | "garantida, sempre, a integração desse período no seu tempo de serviço" |
| Projeção limitada a vantagens | Súm. 371 TST | [D14][D18] | "efeitos limitados às vantagens econômicas obtidas no período de pré-aviso, ou seja, salários, reflexos e verbas rescisórias" |
| Aviso especial CCT | cl. 38ª | [D01] | "mais de 45 (quarenta e cinco) anos de idade, e mais de 02 (dois) anos de contrato [...] será de 60 dias, sem prejuízo da proporcionalidade" |
| FGTS no aviso | Súm. 305 TST | [D11][D18] | "aviso prévio, trabalhado ou não, está sujeito a contribuição para o FGTS" |
| FGTS sem férias indenizadas | Lei 8.036 art. 15 § 6º + Lei 8.212 art. 28 § 9º "d" | [D04][D08] | "Não se incluem na remuneração [...] as parcelas elencadas no § 9º do art. 28" / "férias indenizadas e respectivo adicional constitucional" |
| Multa 40% | Lei 8.036 art. 18 § 1º | [D04] | "quarenta por cento do montante de todos os depósitos realizados na conta vinculada durante a vigência do contrato" |
| Base da multa | OJ-SDI1-42 II TST | [D18] | "saldo da conta vinculada na data do efetivo pagamento das verbas rescisórias, desconsiderada a projeção do aviso prévio indenizado" |
| LC 110 extinta | Lei 13.932 art. 12 | [D07][D15] | "A partir de 1º de janeiro de 2020, fica extinta a contribuição social instituída por meio do art. 1º da LC 110" |
| INSS no aviso indenizado | STJ Tema 478 | [D12] | "Não incide contribuição previdenciária sobre os valores pagos a título de aviso prévio indenizado" |
| RFB aplica, salvo reflexo no 13º | IN RFB 2.110 art. 34 XXXII | [D22] | "o aviso prévio indenizado [...] exceto seu reflexo na gratificação natalina" |
| Regulamento sem a exclusão | Decreto 3.048 art. 214 § 9º V "f" | [D17] | "f) aviso prévio indenizado; (Revogado pelo Decreto nº 6.727, de 2009)" |
| 13º na rescisão | Lei 4.090 art. 3º | [D09] | "o empregado receberá a gratificação devida nos termos dos parágrafos 1º e 2º [...] calculada sobre a remuneração do mês da rescisão" |
| Férias proporcionais | CLT 146 p.ú., 147; Súm. 171, 328 | [D03][D18] | "na proporção de 1/12 (um doze avos) por mês de serviço ou fração superior a 14 (quatorze) dias" |
| Férias proporcionais com menos de 1 ano | CCT cl. 67ª | [D01] | "menos de 01 (um) ano e, tiverem, no mínimo 15 (quinze) dias de serviços [...] férias proporcionais acrescidas de 1/3" |
| Indenização do trintídio | CCT cl. 34ª; Lei 7.238 art. 9º; Súm. 182, 314 | [D01][D19][D13][D18] | "dispensados, sem justa causa, no trintídio que antecede a data base, será devido o pagamento de indenização de 01 (um) salário" |
| Data da dispensa = fim do aviso projetado | cl. 34ª § 1º; OJ-SDI1-82 | [D01][D18] | "considera-se data da dispensa a do último dia da data projetada para o aviso prévio indenizado ou trabalhado" |
| Indenização do trintídio sem INSS | Lei 8.212 art. 28 § 9º "e" 9 | [D08] | "indenização de que trata o art. 9º da Lei nº 7.238" |
| Homologação | CCT cl. 36ª §§ 1º, 4º, 6º | [D01] | "obrigatória a homologação [...] vigência igual ou superior de 12 (doze) meses [...] para as empresas NÃO enquadradas no REPIS" / "R$ 150,00" |
| Prazo de pagamento | CLT 477 § 6º, § 8º | [D03] | "até dez dias contados a partir do término do contrato" |
| Aviso proporcional só desde 13/10/2011 | Súm. 441 TST | [D18] | "rescisões de contrato de trabalho ocorridas a partir da publicação da Lei nº 12.506" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - **Lei 12.506 [D05]** (versão original): conferida no Planalto [D16], sem alteração. Tem 2 artigos e o texto é idêntico.
  - **LC 110 [D06]:** aparece como "compilada", mas o art. 1º estava sem nota de extinção. O Planalto [D15] traz "(Vide Lei nº 13.932, de 2019)", e a Lei 13.932 art. 12 [D07] a extingue desde 01/01/2020.
  - **Lei 7.238 [D10]** (versão original): conferida no Planalto [D19], com o art. 9º idêntico e sem nota de revogação.
  - **Súmulas 305, 182 e 371 [D11][D13][D14]** (caderno consolidado): conferidas no livro oficial do TST baixado hoje [D18], todas "(mantida)" ou com a redação de 2005. O resíduo é o mesmo do outro dossiê: o livro cita até a Res. 220/2017, e a página dinâmica do TST [D21] veio vazia.
  - **STJ Tema 478 [D12]** (dados abertos): o próprio registro diz que, "Na sessão do dia 13/05/2026", a 1ª Seção manteve a tese do Tema 478 (acórdão no DJEN de 09/06/2026). A RFB já a aplica (IN 2.110 art. 34 XXXII [D22], visão multivigente baixada hoje, sem riscado).
- **Decreto 3.048 [D17]:** a exclusão "f" foi revogada em 2009. Hoje prevalecem o Tema 478 e a IN 2.110.
- **CCT e aditivo [D01][D02]:** a CCT vale de 01/06/2025 a 31/05/2027 e o aditivo de 01/06/2026 a 31/05/2027. O aditivo não toca as cl. 34ª, 36ª, 38ª, 39ª e 67ª (cl. 11ª mantém as demais).

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **Quando entram os 3 dias.** A Lei 12.506 diz "3 dias por ano de serviço", sem dizer se o primeiro ano conta.
   - (a) 33 dias ao completar 1 ano. Essa leitura aparece atribuída à Nota Técnica 184/2012 CGRT/SRT/MTE e ao TRT-3, mas só a vi em fontes secundárias ([TRT-3](https://portal.trt3.jus.br/internet/conheca-o-trt/comunicacao/noticias-juridicas/importadas-2015-2016/acrescimo-de-tres-dias-no-aviso-previo-proporcional-e-computado-a-partir-do-primeiro-ano-de-servico-completo-27-08-2015-06-00-acs), [Contábeis](https://www.contabeis.com.br/noticias/5876/aviso-previo-proporcional-nota-tecnica-cgrt-srt-mte-184-2012/)), sem o texto oficial da nota. Fórmula: 30 + 3·n.
   - (b) só a partir do 2º ano. Fórmula: 30 + 3·(n−1).
   - A (a) custa mais e é a mais segura para provisão.
   - Pergunta: *"No cálculo do aviso proporcional, quem tem 1 ano completo recebe 33 dias (30 + 3·n) ou 30?"*
2. **Base da multa de 40%.** O art. 18 § 1º fala em "todos os depósitos realizados" (não em saldo, e saques entram, OJ-42 I). A OJ-42 II manda usar o saldo "na data do efetivo pagamento [...] desconsiderada a projeção do aviso prévio indenizado".
   - (a) O FGTS recolhido na rescisão sobre o aviso e o 13º entra na base.
   - (b) Não entra.
   - Não li a regra do FGTS Digital ou da GFD sobre isso. A diferença é pequena (40% × 8% × (AV + R13)).
   - Pergunta: *"Na guia rescisória do FGTS Digital, a multa de 40% inclui o FGTS sobre o aviso indenizado e o 13º da rescisão?"*
3. **Cl. 38ª e o teto de 90 dias.** O aviso especial é de "60 dias, sem prejuízo da proporcionalidade".
   - (a) 60 + 3·n, que pode passar de 90 (por exemplo, 60 + 60 = 120).
   - (b) 60 como piso e 90 como teto total.
   - O texto pende para (a), mais caro.
   - Pergunta: *"Para empregado com mais de 45 anos e mais de 2 anos de casa, o aviso da cl. 38ª é 60 + 3/ano sem teto de 90?"*
4. **Homologação obrigatória (cl. 36ª) × CLT pós-2017.** A Lei 13.467 revogou o art. 477 § 1º (homologação), mas a CCT a impõe às empresas não REPIS para contratos de 12 meses ou mais, com multa diária de 1/30 do piso, limitada a 2 pisos (§ 4º). Para provisão, conta o custo de R$ 150 por homologação (§ 6º), e a multa só aparece se houver atraso. A validade da cláusula não muda a provisão; fica para o advogado se surgir litígio.
5. **Encargo patronal sobre o reflexo no 13º.** Depende do regime: CPP no Anexo IV ou fora do Simples; no Simples Anexo III, está dentro do DAS. É regra de regime, não da rescisão.

## 5. Lacunas
- Não li o texto oficial da NT 184/2012 MTE (só fontes secundárias). Ver § 4.1.
- Não li a regra do FGTS Digital sobre a base da multa de 40%. Ver § 4.2.
- As estabilidades da CCT tornam a dispensa mais cara ou a impedem, e ficaram fora da fórmula: gestante (cl. 41ª), serviço militar (42ª), acidentado (43ª), pré-aposentadoria de 24 meses (44ª) e auxílio-doença (49ª). Isso pede uma regra de exclusão ("não dispensável") no simulador, não provisão.
- Cl. 30ª: o substituto de quem foi dispensado deve receber o salário do dispensado. Afeta custo de reposição, não a rescisão.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Mediador - Extrato Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR008673%2F2026>  
  Baixado em 2026-11-21T11:45:22-03:00 · arquivo local `docs/D01_ResumoVisualizar.html` · SHA-256 `ad8a587ed6d1e8972a313bba59e78b894c081fac88afffabe048d1477a442be2`
- **[D02]** Mediador - Extrato Termo Aditivo de Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR060354%2F2026>  
  Baixado em 2026-11-21T11:45:23-03:00 · arquivo local `docs/D02_ResumoVisualizar.html` · SHA-256 `5f76f7adcb4f5b9bb962833da79429e6cc0c0aa75b14f772c846a87f52c685e3`
- **[D03]** Decreto-Lei nº 5.452 de 01/05/1943 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/f3db126e93c366f938bd927bbf184a8fcf64b2ea/federal/decretos-lei/1943/del-5452-1943-05-01.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1943-05-01;5452> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:34-03:00 · arquivo local `docs/D03_del-5452-1943-05-01.md` · SHA-256 `7eee0da3b620a17fbd7b34a0eb9adc967c4fb6650d1acba37469d247f88f4600`
- **[D04]** Lei nº 8.036 de 11/05/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ccdcc898b79c13be701c7841b195174e1898ccf8/federal/leis-ordinarias/1990/lei-8036-1990-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:35-03:00 · arquivo local `docs/D04_lei-8036-1990-05-11.md` · SHA-256 `2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22`
- **[D05]** Lei nº 12.506 de 11/10/2011 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/3549980ec9c5319a860d6c0a06d5aab04d9ea6c0/federal/leis-ordinarias/2011/lei-12506-2011-10-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2011-10-11;12506> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:37-03:00 · arquivo local `docs/D05_lei-12506-2011-10-11.md` · SHA-256 `9f85bd014508766e62bb51c4cdf40ba47dd536f9a6d9d63ede812aea8349f8b9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** Lei Complementar nº 110 de 29/06/2001 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6a41d4561539564a02dd7bbf23e156e095c157d8/federal/leis-complementares/2001/lcp-110-2001-06-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2001-06-29;110> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:38-03:00 · arquivo local `docs/D06_lcp-110-2001-06-29.md` · SHA-256 `8cafc13a860b49747ec63dd2176f5bfda16ff3ecd29b9737a5766c44366d25d5`
- **[D07]** Lei nº 13.932 de 11/12/2019 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4a9e54bd7d60c85337ae85b45d3a7d4ea8e3be2a/federal/leis-ordinarias/2019/lei-13932-2019-12-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2019-12-11;13932> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:40-03:00 · arquivo local `docs/D07_lei-13932-2019-12-11.md` · SHA-256 `029a39bc41db9e0177899bd6a930a6e7d887f34521f01c5e7aef1ff97c14e3f0`
- **[D08]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:41-03:00 · arquivo local `docs/D08_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`
- **[D09]** Lei nº 4.090 de 13/07/1962 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/20775c2cef862b096ea72544740d35e0653b3849/federal/leis-ordinarias/1962/lei-4090-1962-07-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1962-07-13;4090> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:42-03:00 · arquivo local `docs/D09_lei-4090-1962-07-13.md` · SHA-256 `07f6d7929f10c8349173691920021a1d37759e1319f14689da0ad541716fa752`
- **[D10]** Lei nº 7.238 de 29/10/1984 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/f369b5b1a443668aeebac28caaf1b60aaabd2668/federal/leis-ordinarias/1984/lei-7238-1984-10-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1984-10-29;7238> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-11-21T11:46:44-03:00 · arquivo local `docs/D10_lei-7238-1984-10-29.md` · SHA-256 `428ebdb3efbec2a296c27afe9beeb620635cf2a2864078858332fce07a1beaf3`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D11]** Súmula nº 305 do TST — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d6c0159be76282be2cdb1dc03c91346ae6dc9b51/jurisprudencia/tst/sumulas/sumula-305.md>  
  Fonte oficial declarada: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf> · versao_texto: caderno consolidado do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T11:46:45-03:00 · arquivo local `docs/D11_sumula-305.md` · SHA-256 `1e58eb0447f8d8550024d6940fbb91bb91022659a9097c5fd2105a1819c9e619`  
  ⚠ versao_texto = 'caderno consolidado do tribunal' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D12]** Tema repetitivo nº 478 do STJ — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8431a0f1642e726006aac605e365c363b5675ba6/jurisprudencia/stj/repetitivos/tema-478.md>  
  Fonte oficial declarada: <https://dadosabertos.web.stj.jus.br/dataset/4238da2f-c07b-4c1a-b345-4402accacdcf/resource/df29da13-7d6b-41ba-ad96-cd1a5bbd191c/download/temas.csv> · versao_texto: dados abertos do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T11:46:47-03:00 · arquivo local `docs/D12_tema-478.md` · SHA-256 `46b3b1d735d10d5ad022f1fe27b97a0af0682b8d63294e701f7881ae2a831598`  
  ⚠ versao_texto = 'dados abertos do tribunal' (não é texto compilado: alterações posteriores não aparecem)
- **[D13]** Súmula nº 182 do TST — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d6c0159be76282be2cdb1dc03c91346ae6dc9b51/jurisprudencia/tst/sumulas/sumula-182.md>  
  Fonte oficial declarada: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf> · versao_texto: caderno consolidado do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T11:46:49-03:00 · arquivo local `docs/D13_sumula-182.md` · SHA-256 `99b849aead3109d2dfbe6b1f9cafef3b374dd060ceb9c7400a66f0cd6b529e52`  
  ⚠ versao_texto = 'caderno consolidado do tribunal' (não é texto compilado: alterações posteriores não aparecem)
- **[D14]** Súmula nº 371 do TST — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d6c0159be76282be2cdb1dc03c91346ae6dc9b51/jurisprudencia/tst/sumulas/sumula-371.md>  
  Fonte oficial declarada: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf> · versao_texto: caderno consolidado do tribunal · cópia de 2026-10-15  
  Lido em 2026-11-21T11:46:50-03:00 · arquivo local `docs/D14_sumula-371.md` · SHA-256 `fee46c342e1bcd6fe7f85f206f8048335364c3be846deeb857519fc4659b190c`  
  ⚠ versao_texto = 'caderno consolidado do tribunal' (não é texto compilado: alterações posteriores não aparecem)
- **[D15]** Lcp110 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp110.htm>  
  Baixado em 2026-11-21T11:47:34-03:00 · arquivo local `docs/D15_lcp110-htm.html` · SHA-256 `2df25bd81db092222b57f2b75ed6a0c75d3a7b3bb959d5d5e2398fd6d88162c5`
- **[D16]** L12506 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12506.htm>  
  Baixado em 2026-11-21T11:47:34-03:00 · arquivo local `docs/D16_l12506-htm.html` · SHA-256 `4a3a3c9606882312f8f1050b1e55d48a25e50c3726827fd0cc33e9ab70c12960`
- **[D17]** D3048 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/decreto/d3048.htm>  
  Baixado em 2026-11-21T11:47:35-03:00 · arquivo local `docs/D17_d3048-htm.html` · SHA-256 `782e757ca4d1b8e166ad23c580d9b0e5a888bfd1731bb0829fa1705cab30bb22`
- **[D18]** TRIBUNAL SUPERIOR DO TRABALHO — TST  
  Link oficial: <https://www.tst.jus.br/documents/10157/63003/Livro-Internet.pdf>  
  Baixado em 2026-11-21T11:48:05-03:00 · arquivo local `docs/D18_Livro-Internet-pdf.pdf` · SHA-256 `46321b2d8d04840eeeb55417937c5a6657c9df5ac40fed1d44a2bf0989c06e8a`
- **[D19]** L7238 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/1980-1988/l7238.htm>  
  Baixado em 2026-11-21T11:52:05-03:00 · arquivo local `docs/D19_l7238-htm.html` · SHA-256 `4c171eda36e07d0b7a2954dfe5540b7580af9814c249bbc30a31ae462603f9a5`
- **[D20]** Normas.leg.br: Legislação Federal — Normas - Congresso Nacional  
  Link oficial: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1984-10-29;7238>  
  Baixado em 2026-11-21T11:52:05-03:00 · arquivo local `docs/D20_doc.html` · SHA-256 `fa27c6b6784a6c56e3b984ca2b8d86544f2e51556cddcf26db40c33506905ae1`
- **[D21]** Pesquisa de jurisprudência — TST  
  Link oficial: <https://jurisprudencia.tst.jus.br/?tipoJuris=SUM&orgao=TST&pesquisar=1>  
  Baixado em 2026-11-21T11:52:40-03:00 · arquivo local `docs/D21_doc.html` · SHA-256 `db15ed4f1573ecd41335e3c2f814980b037785819ec1151cc61bbd776791ab98`
- **[D22]** Instrução Normativa RFB nº 2110, de 17 de outubro de 2022 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/126687/visao/multivigente>  
  Baixado em 2026-11-21T11:53:21-03:00 · arquivo local `docs/D22_rfb-126687-multivigente.json` · SHA-256 `86982870db15f3c896ab8af4dab8e179a1b87008df9369f93f12c179b4108241`  
  ⚠ 12 anexos binários não baixados (o texto integral pode estar neles): as URLs estão no fim do texto e no campo 'anexos'; baixe com 'legal.py baixar' os que a pesquisa citar  
  ⚠ há captura de 2026-10-17 (verif-2026-10-17-lgpd-cdc-obrigacoes D23), mas o texto dela não foi guardado

## Registro de buscas
_Nenhuma busca registrada._
