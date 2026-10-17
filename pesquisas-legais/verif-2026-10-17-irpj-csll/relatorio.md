# Relatório de pesquisa legal — verif-2026-10-17-irpj-csll

**Pergunta:** As decisões do projeto sobre IRPJ/CSLL (Presumido, Real, LALUR/LACS, ECF, adicional, alíquotas CSLL, JCP, compensação 30%) conferem com a lei vigente em 17/10/2026?
**Aberto em:** 2026-10-17T09:50:40-03:00 · **Atualizado em:** 2026-10-17T10:01:59-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Em duas linhas:** os 22 parâmetros e decisões de IRPJ/CSLL conferidos batem com o texto vigente em 17/10/2026 (alíquotas, adicional, presunções, LC 224, CSLL de financeiras, trava de 30%, limite de R$ 78 mi, formas de apuração). Há **2 divergências**. (1) O adicional do IRPJ usa sempre "× 3 meses" no trimestre, inclusive no trimestre de início ou de encerramento de atividade (ADR D7; `taxAssessmentCalc.ts:69`). A lei manda usar o número de meses do período de apuração [D02 art. 3º § 1º]. (2) A linha histórica `lp5-csll-3-a` (bancos, 20% de 03/2020 a 03/2026) ignora os 25% de 07–12/2021 e os 21% de 08–12/2022 [D16 art. 1º; D06 art. 3º, parágrafo único]. Hoje nenhuma apuração lê essa linha, porque o preview exige ano ≥ 2025.
**Risco principal:** a divergência (1) subcobra o adicional no trimestre de abertura ou encerramento de uma PJ com lucro trimestral acima de R$ 40 mil. Fora isso, três pontos seguem ambíguos e já têm pergunta registrada: LC 224 × estimativa do Real (P-B3); a CSLL de 2026 com limite de ¾; a regra de mês fracionado (P-B4).

Normas novas desde as últimas pesquisas (09–10/10), conferidas: nenhuma lei, LC ou IN publicada até 17/10 altera os parâmetros. Varri as 13 LC de 2026 [D19, D20 e as demais em scratchpad], as 27 IN RFB de 2026 do acervo, o histórico Sijut da IN 2.305 [D14] e o da IN 1.700 [D15]. O sha256 da IN 1.700 multivigente (`faa47fa1…`) é o **mesmo** de 09/10. O último ato que alterou a IN 1.700 é a IN 2.343 (vigente desde 18/09/2026). O último que alterou a IN 2.305 é a IN 2.307. O leiaute 13 da ECF **ainda não saiu**: a página do SPED lista o leiaute 12 como o mais recente [D21].

## 2. Fundamentação

| # | Decisão/parâmetro | Onde | Norma citada no projeto | Texto vigente lido | Status | Grau |
|---|---|---|---|---|---|---|
| 1 | IRPJ 15% | `legal_parameters_v1.sql:1` | IN 1.700 art. 29 | Lei 9.249 art. 3º caput [D02]; IN 1.700 art. 29 [D15] | CONFERE | verificado |
| 2 | Adicional de 10% sobre o que passa de R$ 20 mil × meses | `v1.sql:2-3`; `taxAssessmentCalc.ts:352-383` | IN 1.700 art. 29 §§ 1º–2º | Lei 9.249 art. 3º § 1º: *"pelo número de meses do respectivo período de apuração"* [D02]; Lei 9.430 art. 2º § 2º (estimativa) [D03] | CONFERE para os valores; **DIVERGE** no "× 3" fixo do trimestre de início/encerramento (ver §4.1) | verificado (texto) / inferido (efeito) |
| 3 | Presunção do IRPJ: 8% revenda, 32% serviço | `v1.sql:4-5` | Lei 9.249 art. 15 caput e § 1º III a | idem, compilada; os §§ 5º–7º foram vetados (Lei 15.224/2025) [D02] | CONFERE | verificado |
| 4 | Presunção da CSLL: 12% e 32% | `v1.sql:6-7` | Lei 9.249 art. 20 | art. 20 I e III (red. LC 167/2019) [D02] | CONFERE | verificado |
| 5 | 16% para prestadora exclusiva até R$ 120 mil/ano | `v1.sql:12-13`; `taxAssessmentCalc.ts:390-420` | Lei 9.250 art. 40; IN 1.700 arts. 33 § 7º e 215 § 10 | Lei 9.250 art. 40 e parágrafo único [D12]; IN 1.700 art. 215 § 10 (alíneas b, c, d, f, g, j) [D15] | CONFERE | verificado |
| 6 | Trava de 30% na compensação de prejuízo e base negativa, sobre o lucro ajustado | `v1.sql:8`; `taxAssessmentCalc.ts:ajustesParteA` | IN 1.700 art. 64 | Lei 9.065 arts. 15–16 [D10]; IN 1.700 arts. 64 e 203 [D15] | CONFERE | verificado |
| 7 | LC 224: acréscimo de 10% (×1,10) só na receita acima de R$ 5 mi/ano (R$ 1,25 mi por trimestre, com sobra, ajuste no T04 e § 9º) | `v1.sql:9-11`; `taxAssessmentCalc.ts:115-230` | IN 2.305 arts. 14–15 (red. IN 2.306) | LC 224 art. 4º §§ 4º VII e 5º [D01]; IN 2.305 arts. 13–15, compilada [D14] | CONFERE | verificado |
| 8 | LC 224: IRPJ desde 01/01/2026, CSLL desde 01/04/2026 | `v1.sql:9-10`; `taxAssessmentCalc.ts:123` | IN 2.305 art. 3º | LC 224 art. 14 I a e III [D01]; IN 2.305 art. 3º I–II [D14] | CONFERE | verificado |
| 9 | CSLL de 2026: o T01 fica fora da LC 224, limite anual de ¾ | `taxAssessmentCalc.ts:178-180` | P&R RFB v5 item 13; SC Disit 10010/2026 | a lei e a IN não falam do ano de transição [D01, D14]; é leitura administrativa | CONFERE com a orientação da RFB (ambíguo, §4.3) | inferido |
| 10 | Liminar suspende o acréscimo (flag no perfil) | `taxAssessmentCalc.ts:487` | F-TA-5 | sem norma: é decisão de produto | NÃO VERIFICÁVEL (sem norma) | — |
| 11 | CSLL 9% (código 1) e 15% (código 4) | `v1.sql:15-16` | Lei 7.689 art. 3º III e I | art. 3º III e I [D06]; IN 1.700 art. 30-D I e V [D15] | CONFERE até 31/12/2026; ver nota 11a | verificado |
| 11a | Resseguradora local no código 4 | — | — | Lei 15.525/2026: inciso V (9%) e ressalva no I, **com efeito em 01/01/2027** [D06, D17] | DESATUALIZADO-RISCO (baixo: fora do público-alvo, sem consumidor) | verificado |
| 12 | Bancos 20% (código 3) desde 01/04/2026 | `v4.sql:1` | IN 1.700 art. 30-D II | Lei 7.689 art. 3º II-A (red. LC 224) [D06]; IN 1.700 art. 30-D II [D15] | CONFERE | verificado |
| 13 | Bancos 20% de 01/03/2020 a 31/03/2026 (`lp5-csll-3-a`) | `v5.sql:1` | IN 1.700 art. 30 IV (red. IN 1.942) | Lei 14.183 art. 1º: II-A *"25% até 31/12/2021 e 20% a partir de 1º/01/2022"* [D16]; Lei 7.689 art. 3º p.ú.: 21% até 31/12/2022 [D06]; a IN 1.700 art. 30 IV (tachado) nunca refletiu os 25% nem os 21% [D15] | **DIVERGE** (dado histórico; impacto nulo hoje, porque `TaxAssessmentDto.ts:83` exige ano ≥ 2025) | verificado (texto) / inferido (datas de início: 25% desde 01/07/2021 pela MP 1.034; 21% desde 01/08/2022 pela MP 1.115) |
| 14 | Instituição de pagamento / balcão / bolsas (código 7): 9% → 12% → 15% | `v4.sql:2-4` | IN 1.700 art. 30-D III | Lei 7.689 art. 3º II-B [D06]; LC 224 art. 7º e art. 14 I b [D01] | CONFERE | verificado; 9% no T1/2026 = inferido (texto anterior não compilado; a redação anterior do inciso I, dada pela Lei 14.183 art. 1º, listava os incisos II–VII, IX e X da LC 105, sem VIII, XI e XII [D16]) |
| 15 | SCFI / capitalização (código 8): 15% → 17,5% → 20% | `v4.sql:5-7` | IN 1.700 art. 30-D IV | Lei 7.689 art. 3º II-C [D06]; IN 1.700 art. 30-D IV [D15]; inciso I anterior com IV e capitalização a 15% (Lei 14.183 art. 1º I [D16]) | CONFERE | verificado |
| 16 | Real anual com código 7/8 ⇒ 400 | `taxAssessmentCalcAnual.ts:73` | F-CA-4 (a) | a lei não fixa rateio [D06, D01] | CONFERE (recusa explícita, sem regra inventada) | inferido |
| 17 | Estimativa do Real sem o acréscimo da LC 224 | `taxAssessmentCalcAnual.ts:159, 216` | P-B3 | LC 224 art. 4º § 2º II a cita só os arts. 25–26 da Lei 9.430 [D01]; IN 2.305 art. 13 é genérico [D14] | CONFERE com a leitura mais literal (ambíguo, §4.2) | inferido |
| 18 | Presumido sempre trimestral; Real trimestral × anual; opção irretratável | ADR X7 D1/D2; `taxAssessmentCalc.ts` | Lei 9.430 arts. 1º–3º e 26 | Lei 9.430 arts. 1º, 2º, 3º e 26 §§ 1º–4º [D03]; Lei 9.718 art. 13 § 1º [D04] | CONFERE (art. 26 §§ 3º–4º admite passar de Presumido a Real, já registrado como fork em 10/10) | verificado |
| 19 | Limite de R$ 78 mi do Presumido e obrigatoriedade do Real | (sem parâmetro em código; o perfil recebe `lucroRealObrigatorio`) | Lei 9.718 arts. 13–14 | Lei 9.718 art. 13 caput e art. 14 I (red. Lei 12.814/2013) [D04] | CONFERE (valor vigente; o sistema não valida o teto, quem declara é o perfil) | verificado |
| 20 | Base do Presumido = receita 3.1/3.3/3.4 × presunção; outras receitas ⇒ 400 pelo gate | `taxAssessmentCalc.ts:332, 459` | Lei 9.430 art. 25 I | Lei 9.430 art. 25 I e II [D03]; IN 1.700 art. 215 § 3º [D15] | CONFERE (o art. 25 II é recusado, não ignorado) | verificado |
| 21 | Hospitalar 8% não modelado (P-7, a conta 3.1 é "serviço em geral") | `BE-INCR-TAX-ASSESSMENT-A-brief.md:422` | Lei 9.249 art. 15 § 1º III a | IN 1.700 art. 33 § 1º II a e § 4º na **red. IN 2.343/2026** (lista ampliada: fisioterapia, terapia ocupacional, fonoaudiologia, anestesiologia…; exclui sociedade simples e empresário individual) [D18, D15] | DESATUALIZADO-RISCO (o corpus local da IN 1.700 é anterior à IN 2.343; o P-7 segue válido como recusa, mas o enquadramento do vertical clínica mudou) | verificado (texto) / inferido (impacto) |
| 22 | IRRF sobre JCP a 17,5% | só nota fora de escopo (`BE-INCR-CSLL-ALIQUOTA-LC224-brief.md` §8) | "IN 2.315 art. 2º" | Lei 9.249 art. 9º § 2º (red. LC 224 art. 8º), **efeito em 01/01/2026** (LC 224 art. 14 III) [D02, D01] | NÃO VERIFICÁVEL como decisão (não há tabela); nota: a data é a da lei, não a da IN | verificado |
| 23 | IRRF de 10% sobre dividendos acima de R$ 50 mil/mês e IRPFM | não modelado (`mapa-2026-10-10/dominio-contabil.md:92`) | Lei 15.270/2025 | Lei 9.250 art. 6º-A, incluído pela Lei 15.270 (efeito em 01/01/2026, art. 8º) [D07] | NÃO VERIFICÁVEL (lacuna de produto, não decisão) | verificado |
| 24 | Códigos de receita DCTF (2089-01, 2372-01 etc.) | `v2.sql` | Tabela RFB de 12/03/2024 | não é norma do acervo; não reconferido | NÃO VERIFICÁVEL nesta rodada | — |

## 3. Vigência conferida
- **Alertas do acervo:**
  - D01 (LC 224, "original"): conferi as 13 LC de 2026. A LC 235/2026 art. 11 alterou **só** o art. 4º § 8º V (entidades sem fins lucrativos), e o art. 1º dela afasta o art. 5º em 2026 [D20]. Nenhuma toca os §§ 4º–5º nem o art. 7º. A LC 224 vale como está.
  - D07 (Lei 15.270, "original"): não há parâmetro do projeto que dependa dela.
  - D08 (RIR): não serviu de fonte primária. O projeto cita a lei e a IN.
  - D09, D13 e D18 (IN 2.315, 2.306 e 2.343, publicação original): resolvidas pelas compiladas do Sijut, D14 (IN 2.305) e D15 (IN 1.700).
  - D16 e D17 (Lei 14.183, republicação; Lei 15.525, original): os trechos usados são os próprios artigos alterados, conferidos contra a Lei 7.689 compilada [D06].
- **Redação atual:**
  - Lei 7.689 art. 3º: compilada, com a LC 224 e a Lei 15.525 [D06].
  - Lei 9.249 arts. 3º, 9º, 15 e 20: compilada. O art. 3º § 5º (resseguradoras, Lei 15.525) só vale a partir de 2030 [D02].
  - IN 1.700: multivigente com sha igual ao de 09/10 [D15].
  - IN 2.305: art. 15 na redação da IN 2.306. O Anexo foi trocado pela IN 2.307 [D14].
- **Regulamentação pendente ou norma mais específica:**
  - Leiaute 13 da ECF (AC 2026): ainda não publicado [D21].
  - Manual L12: segue contraditório sobre os códigos 7/8 (P-CA-3, PVA).
  - LC 225/2026 art. 41: bônus de adimplência de 1% a 3% da CSLL para quem detém selo Confia/Sintonia há 12 meses ou mais. Não vale para o Simples [D19]. Não há decisão do projeto sobre isso; ver §5.

## 4. Ambiguidades (só o que precisa de decisão humana)

### 4.1 Adicional no trimestre de início ou encerramento (DIVERGE, leitura a decidir)
- **Leitura A (código atual, ADR D7):** usa sempre 3 meses no trimestre. Efeito: uma PJ aberta em fevereiro tem limite de R$ 60 mil no T01, em vez de R$ 40 mil, e paga menos adicional.
- **Leitura B:** número de meses do período de apuração = meses em atividade no trimestre [D02 art. 3º § 1º; IN 1.700 art. 29 § 1º, D15]. Também vale no evento do art. 1º §§ 1º–2º da Lei 9.430 (incorporação, fusão, cisão, extinção) [D03]. O próprio código já faz isso no anual (`taxAssessmentCalcAnual.ts:415`, `ativos.length`) e na LC 224 (§ 9º).
- **Mais segura:** B. Falta resolver o mês fracionado (P-B4, já com pergunta registrada em 10/10).
- **Pergunta ao contador:** "Pela Lei 9.249 art. 3º § 1º, numa PJ do Presumido aberta em 10/02, o adicional do T01 usa R$ 20 mil × 2 (fev–mar)? Fevereiro parcial conta como mês inteiro?"

### 4.2 LC 224 na estimativa do Real (P-B3)
- **Leitura A (código):** a estimativa não tem acréscimo. O art. 4º § 2º II a da LC 224 só cita o lucro presumido [D01].
- **Leitura B:** a estimativa tem acréscimo, pelo art. 13 da IN 2.305 ("regimes … base de cálculo … presumida") [D14].
- **Mais segura para o fisco:** B. **Mais fiel ao texto da lei:** A.
- Situação: a pergunta já está registrada (pesquisa de 10/10, P-B3). Não há fato novo.

### 4.3 CSLL de 2026 com limite de ¾
- O código segue o P&R v5 da RFB. A lei não trata do ano de transição.
- **Leitura alternativa:** limite anual inteiro, contando a receita do T01. Ela daria menos CSLL.
- **Mais segura:** a do código, porque segue a RFB.

### 4.4 Vertical clínica e a presunção de 8%
- Com a IN 2.343 (18/09/2026), a lista "hospitalar" ficou mais larga [D18].
- A clínica estética **não** aparece na lista. Uma clínica com fisioterapia, fonoaudiologia ou procedimentos médicos listados, organizada como sociedade empresária e dentro das normas da Anvisa, pode usar 8%/12%.
- Situação: o P-7 continua como recusa ou pergunta ao contador. O texto da pergunta deve citar a redação da IN 2.343.

## 5. Lacunas
- Os códigos de receita DCTF (`v2.sql`) não foram reconferidos: a tabela RFB não está no acervo.
- O texto anterior a 01/04/2026 do inciso I do art. 3º da Lei 7.689 não está no acervo compilado. Eu o reconstruí pela Lei 14.183 [D16] e pela lista da Lei 15.270 [D07] (grau inferido).
- JCP (dedução no Real e IRRF de 17,5%), dividendos da Lei 15.270 e bônus de adimplência da LC 225 não têm decisão nem código. São lacunas de produto, não divergências.
- O P&R v5 da RFB e as SC citadas no código (SC Disit/SRRF10 10010/2026) não foram relidos: não são norma, e não há evidência de versão nova.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 224 de 26/12/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/27a3371bb8bcc8f1c5d753672d422f89680f8830/federal/leis-complementares/2025/lcp-224-2025-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-12-26;224> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:06-03:00 · arquivo local `docs/D01_lcp-224-2025-12-26.md` · SHA-256 `6d2c451c17be08da1e811f15c80f188b47b66c7d3811220ade0fb69ee8b0a07c`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** Lei nº 9.249 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d955e7e66c4a7176278ee8ac74513668de7fc989/federal/leis-ordinarias/1995/lei-9249-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9249> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:07-03:00 · arquivo local `docs/D02_lei-9249-1995-12-26.md` · SHA-256 `18cb96b64a850a3f9b738da870044230b76a336068e3fae79cb83f10b14d4699`
- **[D03]** Lei nº 9.430 de 27/12/1996 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6c8aa8aa7d6126d14c332df3ab07f956b17f4bf2/federal/leis-ordinarias/1996/lei-9430-1996-12-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-27;9430> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:09-03:00 · arquivo local `docs/D03_lei-9430-1996-12-27.md` · SHA-256 `6e8e20371d0e7796244402441b7e3fc72df83a7bbe640029d4919359a6115bcc`
- **[D04]** Lei nº 9.718 de 27/11/1998 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2ee55c0d178cb912e1a74026bc8bf4a365018bf0/federal/leis-ordinarias/1998/lei-9718-1998-11-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1998-11-27;9718> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:10-03:00 · arquivo local `docs/D04_lei-9718-1998-11-27.md` · SHA-256 `b15173fa6f57c3ef3a6c7709268c5757ad900c2f567a08f2e646ec014feadf12`
- **[D05]** Lei nº 12.973 de 13/05/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/5a77b1ed480d4b4fc20fabaac59f6674b120d7ec/federal/leis-ordinarias/2014/lei-12973-2014-05-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-05-13;12973> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:12-03:00 · arquivo local `docs/D05_lei-12973-2014-05-13.md` · SHA-256 `d73a401dbbd14ab1feb1c8bce8daa51c3cfcb0cbc264e87b9023fc875f1b89cf`
- **[D06]** Lei nº 7.689 de 15/12/1988 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/109b06481773474599dbf7e4d73a01309b658007/federal/leis-ordinarias/1988/lei-7689-1988-12-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1988-12-15;7689> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:13-03:00 · arquivo local `docs/D06_lei-7689-1988-12-15.md` · SHA-256 `7c57b2c916e9d1627edd79bf85758f111d036cbf52c0964fb2527090ac0ed22b`
- **[D07]** Lei nº 15.270 de 26/11/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4f02311c78e8f4f559c63b67861c2bd33d691ea2/federal/leis-ordinarias/2025/lei-15270-2025-11-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2025-11-26;15270> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:51:14-03:00 · arquivo local `docs/D07_lei-15270-2025-11-26.md` · SHA-256 `32c63ec7cff289c036bab1475951631181b42d4f5ced56ceb3304526d50779b9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D08]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:51:16-03:00 · arquivo local `docs/D08_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D09]** INSTRUÇÃO NORMATIVA RFB Nº 2.315, DE 18 DE MARÇO DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ea0d91e6d324be2e3f53149980cb9048e55732da/reguladores/rfb/instrucoes-normativas/2026/instrucao-normativa-rfb-n-2.315-de-18-de-marco-de-2026-694441058.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-rfb-n-2.315-de-18-de-marco-de-2026-694441058> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:51:17-03:00 · arquivo local `docs/D09_instrucao-normativa-rfb-n-2-315-de-18-de-marco-de-2026-69444.md` · SHA-256 `47893843f9f8f08fd2a35e49e4becc69caacb73ec6cdd2ba8244e637cb2abc71`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D10]** Lei nº 9.065 de 20/06/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2fe7d2c98c7d8bf2fc725fb77b42405b02a0cb5c/federal/leis-ordinarias/1995/lei-9065-1995-06-20.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-06-20;9065> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:53:17-03:00 · arquivo local `docs/D10_lei-9065-1995-06-20.md` · SHA-256 `5a68cf95708d0bf02d9032181a605412384d0fa2440a9629f2fe59e06f4a2fac`
- **[D11]** Lei nº 8.981 de 20/01/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8bf2e5070525043cb82294b9de8630a4aea5e53d/federal/leis-ordinarias/1995/lei-8981-1995-01-20.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-01-20;8981> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:53:19-03:00 · arquivo local `docs/D11_lei-8981-1995-01-20.md` · SHA-256 `b567b47ee6be147deb0aeea63f5cc92d7c93652f40fae948125979dac84680e7`
- **[D12]** Lei nº 9.250 de 26/12/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ec2d052273aea51cd30fac55a779a8d933c11046/federal/leis-ordinarias/1995/lei-9250-1995-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-12-26;9250> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:53:22-03:00 · arquivo local `docs/D12_lei-9250-1995-12-26.md` · SHA-256 `aa9eedaae0195205b7f5bcde33c46572d4f1f5352de3cf92ec1e36342e88befd`
- **[D13]** INSTRUÇÃO NORMATIVA RFB Nº 2.306, DE 22 DE JANEIRO DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1b9bb3ddaa43737703ca11821142da8cb6d6a2cf/reguladores/rfb/instrucoes-normativas/2026/instrucao-normativa-rfb-n-2.306-de-22-de-janeiro-de-2026-682798613.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-rfb-n-2.306-de-22-de-janeiro-de-2026-682798613> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:24-03:00 · arquivo local `docs/D13_instrucao-normativa-rfb-n-2-306-de-22-de-janeiro-de-2026-682.md` · SHA-256 `cc04ae59a22944b8fa4674001d8a796c13d3a4ef17302320623d4455706b3d03`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D14]** D14_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/148694/visao/multivigente>  
  Baixado em 2026-10-17T09:57:31-03:00 · arquivo local `docs/D14_multivigente.html` · SHA-256 `635eb830122e9cb95bfda0d34b600c469cda97e0368564bc5219f07591e0c797`
- **[D15]** D15_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente>  
  Baixado em 2026-10-17T09:57:31-03:00 · arquivo local `docs/D15_multivigente.html` · SHA-256 `faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3`
- **[D16]** Lei nº 14.183 de 14/07/2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/e3db373dc20968124cc876ee38efba5f3ded5926/federal/leis-ordinarias/2021/lei-14183-2021-07-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2021-07-14;14183> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T09:58:47-03:00 · arquivo local `docs/D16_lei-14183-2021-07-14.md` · SHA-256 `990a572ccdb2d87c36bd9857596758c8468cc326f9501d4585c233140d1f82ca`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D17]** Lei nº 15.525 de 28/09/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/eae0f9c4edbe531e6ee19052afa58af733835f23/federal/leis-ordinarias/2026/lei-15525-2026-09-28.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2026-09-28;15525> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:59:53-03:00 · arquivo local `docs/D17_lei-15525-2026-09-28.md` · SHA-256 `0e1de5351bad08db2c900600e386521734ac313158c6c29d9e4b0a364e70bb20`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D18]** INStrução normativa rfb Nº 2.343, DE 17 DE setembro DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/rfb/instrucoes-normativas/2026/instrucao-normativa-rfb-n-2.343-de-17-de-setembro-de-2026-732611655.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-rfb-n-2.343-de-17-de-setembro-de-2026-732611655> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:59:54-03:00 · arquivo local `docs/D18_instrucao-normativa-rfb-n-2-343-de-17-de-setembro-de-2026-73.md` · SHA-256 `5a2d9eaa418c355a526a350487761e906b60837dff62f2285b3f25d19aac37bf`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D19]** Lei Complementar nº 225 de 08/01/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/fd9a9b9dea4c78482acb90a5da095fd7b9a70cd0/federal/leis-complementares/2026/lcp-225-2026-01-08.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2026-01-08;225> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:59:55-03:00 · arquivo local `docs/D19_lcp-225-2026-01-08.md` · SHA-256 `bd69c4e4f8649a476651e3c8db85b2bb3aa69a38832e8dacf87b5c53c91719df`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D20]** Lei Complementar nº 235 de 27/08/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/c7e09d0b27e001dbfcef9bfca6178647e167431e/federal/leis-complementares/2026/lcp-235-2026-08-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2026-08-27;235> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:59:57-03:00 · arquivo local `docs/D20_lcp-235-2026-08-27.md` · SHA-256 `7a8794962213e1e8b771e009b355f1bceb14ec57ed7ed085e9dbca162611faf9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D21]** Manuais — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pasta/show/1644>  
  Baixado em 2026-10-17T09:59:57-03:00 · arquivo local `docs/D21_1644.html` · SHA-256 `d63a09d5e50a2fd7e42bde6d83fd32ed5cf8384b8a6c080529674ebeb6409c31`

## Registro de buscas
_Nenhuma busca registrada._
