# Relatório de pesquisa legal — verif-2026-10-17-simples-mei

**Pergunta:** Verificar decisões do projeto sobre Simples Nacional e MEI (LC 123/2006, Res. CGSN 140/2018 e posteriores, LC 214/2025 a partir de 2027, SIMEI, DEFIS, regime de caixa, Anexos I–V, fator R, Anexo XI/piso ISS) contra o texto vigente em 17/10/2026
**Aberto em:** 2026-10-17T09:51:45-03:00 · **Atualizado em:** 2026-10-17T10:08:23-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Até 31/12/2026 o motor do Simples e do SIMEI confere com a lei e a resolução vigentes.** Verificado:
- as 312 tabelas dos Anexos I–V (2018 e 2027–2033) foram regeneradas pelo próprio `scripts/gen-simples-anexos.mjs` a partir do Planalto baixado hoje [D12][D13], com **0 diferenças** em relação ao TXT commitado;
- os limites (R$ 360 mil, R$ 4,8 mi, sublimite de R$ 3,6 mi, MEI R$ 81 mil, TAC R$ 251,6 mil), o fator R de 28%, a CPP do SIMEI (5% e 12%), os valores fixos do Anexo VII de 2027–2033, o salário mínimo de 2026 (R$ 1.621), o piso de 2% do ISS e o Anexo XI (sha256 idêntico, id 81177) conferem.

**Para 2027 há quatro pontos desatualizados**, todos porque o projeto declara "não regulamentado" o que a **Res. CGSN 190/2026** passou a regular (DOU 10/08/2026, efeitos em 01/01/2027, art. 9º [D16]):
1. **RBT12 e fator R no início de atividade em 2027.** O art. 22 § 2º (nova redação) manda usar a 1ª faixa no 1º e no 2º mês e a média dos meses antecedentes ao mês anterior × 12 do 3º ao 13º mês. O art. 26 § 6º fixa o fator "r" em 0,28 nos 2 primeiros meses [D16]. O código lança `SimplesRegraNaoRegulamentadaError` (`simplesCalc.ts:227-231`).
2. **Retenção de ISS no início de atividade em 2027.** O art. 27 II (nova redação) dá 2% no mês de início **e no mês seguinte** [D16]. O código dá 2% só no mês de início (`SimplesApuracaoService.ts:1021`). No 2º mês ele cai no item 1 e devolve 422.
3. **A DEFIS acaba em 01/01/2027.** O art. 72 é revogado (art. 8º XXI). As informações socioeconômicas passam a ser prestadas no PGDAS-D, de janeiro a março, "do ano-calendário anterior" (art. 38-B [D16]). A linha `sn2-obr-defis-simples` diz que "a redação de 2027 do art. 25 não foi regulamentada". Isso não vale mais. A data (31/03/2027) coincide, mas o veículo muda (ver A1).
4. **A fonte do SIMEI em 2027.** O art. 101 II/III é revogado (art. 8º XXVII). Os valores de ICMS e ISS passam ao art. 101 IV/V + Anexo XIII [D16][D18]. Os valores de 2027–2028 são iguais (R$ 1,00 / R$ 5,00): o efeito é só de citação, não de cálculo.

**Divergência entre a resolução e a lei (não é do projeto):** o Anexo I da Res. 190 traz **18,90%** na 6ª faixa a partir de 2029 [D19]. O Anexo XVIII da LC 214 (Planalto, compilado) traz **19,00%** [D12]. O projeto segue a lei, que é a leitura correta pela hierarquia normativa. O PGDAS-D pode calcular pela resolução (A2).

**Já correto para 2027 (verificado):** janela do RBT12 M−13…M−2 (LC 214 art. 517 / LC 123 art. 18 § 1º [D12]; Res. 190 art. 21 II "a"); retenção do ISS pela faixa do mês da prestação (LC 227 art. 169, efeitos pelo art. 182 I "b" [D03]; código `FAIXA_MES_PRESTACAO`); opção semestral pelo IBS/CBS regular (LC 123 art. 13 § 10, red. LC 227 [D03]); fim do regime de caixa em 2027 (Res. 190 art. 8º IX–XII [D16]); NFS-e nacional obrigatória desde 01/11/2026 (Res. CGSN 191 art. 3º I, que revogou a Res. 189 [D17]).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Limite ME/EPP | LC 123 art. 3º I e II | [D01] | "igual ou inferior a R$ 4.800.000,00" |
| Sublimite (+IBS em 2027) | LC 123 art. 13-A; red. LC 214 art. 517 | [D01][D12] | "Para efeito de recolhimento do ICMS, do ISS e do IBS ... R$ 3.600.000,00" |
| Fator R 28% | LC 123 art. 18 §§ 5º-J, 5º-M | [D01] | "igual ou superior a 28% (vinte e oito por cento)" |
| RBT12 2027 | LC 123 art. 18 § 1º (red. LC 214 art. 517) | [D12] | "doze meses antecedentes ao mês anterior ao do período de apuração" |
| Início de atividade 2027 | Res. 140 art. 22 § 2º (red. Res. 190) | [D16] | "no 1º (primeiro) e 2º (segundo) mês de atividade, as alíquotas previstas na primeira faixa" |
| Fator r 2027 | Res. 140 art. 26 § 6º (red. Res. 190) | [D16] | "referente aos 2 (dois) primeiros meses de início de atividades será considerado 0,28" |
| Retenção ISS 2027 | LC 123 art. 21 § 4º I (red. LC 227 art. 169); Res. 140 art. 27 I–II (red. Res. 190) | [D03][D16] | "no mês da prestação" · "no mês de início de atividade da ME ou EPP, ou no mês seguinte, a alíquota aplicável será de 2%" |
| Teto ISS / transferência | LC 123 art. 18 § 1º-B I; Anexos XX/XXI (red. LC 227) | [D01][D03] | "aos tributos federais e IBS da mesma faixa" |
| MEI R$ 81 mil / TAC | LC 123 art. 18-A § 1º; art. 18-F I e III | [D01] | "R$ 251.600,00" · "12% (doze por cento) sobre o salário-mínimo" |
| SIMEI 2027+ | LC 123 Anexo VII (LC 214 Anexo XXIII); Res. 140 Anexo XIII | [D12][D18] | "R$ 0,994 R$ 0,006 R$ 7,00" |
| Salário mínimo 2026 | Decreto 12.797/2025 art. 1º | [D21] | "R$ 1.621,00" |
| Piso ISS 2% | Res. 140 art. 31 p.ú.; art. 32 § 1º | [D15] | "não poderão resultar em percentual menor do que 2% ... exceto ... 7.02, 7.05 e 16.01" |
| Fim da DEFIS | Res. 190 art. 8º XXI; art. 38-B | [D16] | "o art. 72" · "no período de janeiro a março de cada ano-calendário" |
| Arredondamento DAS 2027 | Res. 140 art. 45-A (incl. Res. 190) | [D16] | "arredondados para duas casas decimais ... será fixado em R$ 0,01" |
| Anexo I 6ª faixa 2029 | LC 214 Anexo XVIII × Res. 190 Anexo I | [D12][D19] | LC: "19,00%" · Res.: "18,90%" |
| Anexo XI | Res. 140 Anexo XI (red. Res. 182/2025) | [D20] | sha256 `cb3845804f3c…` = o seed `lp6-mei-ax-*` |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos.** D02 (LC 214) é só a promulgação dos vetos, e D03 (LC 227) é texto original. Por isso a LC 214 compilada e a LC 123 foram conferidas no Planalto [D12][D13]. D01 (LC 123 compilada, 13/10/2026) só traz "Vide LC 214/227" nos dispositivos de 2027, e a redação nova foi lida em D12/D03. As Res. CGSN 185–189 e 193 do acervo [D04–D09] são publicação original. A Res. 140 compilada, a 190 e a 191 **não estão no acervo** e foram lidas no Normas RFB [D15][D16][D17], com o browser embutido para a visão "vigente". D10/D11 (ADE Cofis) entraram por engano e são irrelevantes.
- **Alterações de 2025–2026 em LC.** Na compilação, as únicas LCs que alteram a LC 123 são a 216/2025 (não toca o cálculo) e a 227/2026. As ementas das LCs 225–237/2026 do acervo não tocam o Simples. **Não existe lei que mude o limite do MEI**: o art. 18-A § 1º segue com R$ 81.000,00 [D01][D13] (verificado).
- **Resoluções CGSN posteriores à 183.** A 184 (opção na Redesim), a 185/187 (parcelamento, calamidade), a 186 (opção 2027), a 188 (DAS para ISS/MAN), a 189 (revogada pela 191), a 191 (NFS-e, 01/11/2026) e a 193 (regimento) não mudam o cálculo. A **190** muda o cálculo de 2027 (itens 1–4 da conclusão).

## 4. Ambiguidades (só o que precisa de decisão humana)

**A1. DEFIS do ano-calendário 2026.** O art. 72 é revogado em 01/01/2027, antes do prazo de 31/03/2027. O art. 38-B manda informar o ano anterior no PGDAS-D de jan–mar.
- Leitura 1: a informação de 2026 vai no PGDAS-D de jan–mar/2027, pelo art. 38-B. É a leitura literal.
- Leitura 2: a DEFIS de 2026 ainda é entregue, por ser o fato gerador de 2026. A Res. não tem regra de transição.
- Nas duas leituras o prazo é 31/03/2027 e o conteúdo é o mesmo. Muda só o rótulo e o veículo.
- Leitura mais segura: manter o espelho anual com prazo de 31/03/2027 e trocar a fonte para "art. 72 (até 2026) / art. 38-B (a partir de 2027)".
- **Pergunta ao contador:** "A declaração socioeconômica do AC 2026 será feita na DEFIS ou no PGDAS-D de jan–mar/2027 (art. 38-B da Res. 140, red. Res. 190)?"

**A2. Anexo I, 6ª faixa, 2029+: 19,00% (LC 214) × 18,90% (Res. 190).**
- Pela lei, vale 19%. É a escolha atual do projeto.
- Pela resolução, o PGDAS-D pode cobrar 18,9% e o DAS oficial diverge do espelho. O impacto fica restrito à revenda com RBT12 acima de R$ 3,6 mi, a partir de 2029.
- Leitura mais segura: manter 19% e emitir um alerta de divergência quando o DAS oficial registrado diferir.
- **Pergunta:** "O PGDAS-D de 2029 aplicará 18,90% (Res. 190 Anexo I) ou 19% (LC 214 Anexo XVIII) na 6ª faixa do Anexo I?"

**A3. MEI 2027–2028: CBS R$ 0,994 e IBS R$ 0,006 × art. 45-A.** O art. 45-A manda arredondar os valores do DAS a 2 casas, com mínimo de R$ 0,01. O projeto guarda milésimos e arredonda só o total (F-TAC-7).
- O total é igual nas duas leituras (R$ 7,00).
- As linhas por tributo seriam R$ 0,99 e R$ 0,01.
- Leitura mais segura: manter o total e exibir as linhas arredondadas pelo art. 45-A.

**A4. Teto do ISS na 6ª faixa em 2029+.** A lei transfere o excesso "aos tributos federais e IBS". A repartição da 6ª faixa não tem coluna de IBS, porque o IBS sai pela fórmula da 5ª faixa (Res. 190 art. 21 IV). O código reparte só entre os federais. Pela proporção literal da faixa, o resultado é o mesmo. Fica em aberto se o IBS também recebe parte do excesso. Isso é inferido e merece uma pergunta ao contador junto com a A2.

## 5. Lacunas
- Res. CGSN 194/2026 (28/09/2026, altera a Res. 186 sobre os prazos de opção de 2027): o texto integral não foi lido, nem no acervo nem no Normas. Uma busca web achou só a ementa num site não oficial. Não afeta o cálculo, pela ementa (inferido).
- Res. CGSN 192/2026: não localizada. Não aparece no histórico de alterações da Res. 140 [D15].
- Anexos II–V da Res. 190: lidos em PDF (pypdf) na pasta de rascunho e comparados por script com a LC 214. Só o Anexo I de 2029+ diverge. O Anexo I foi registrado com hash [D19]. Os demais não foram registrados como Dnn.
- O manual do PGDAS-D de 2027 (telas do bloco socioeconômico) não foi conferido.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 123 de 14/12/2006 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:53-03:00 · arquivo local `docs/D01_lcp-123-2006-12-14.md` · SHA-256 `62ae5f126e5d6a0bf1e149614362aeca97730684067c128251c92cc1f732bdd9`
- **[D02]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:55-03:00 · arquivo local `docs/D02_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lei Complementar nº 227 de 13/01/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/leis-complementares/2026/lcp-227-2026-01-13.md>  
  Fonte oficial declarada: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm> · versao_texto: texto da fonte oficial · cópia de 2026-10-15  
  Lido em 2026-10-17T09:52:57-03:00 · arquivo local `docs/D03_lcp-227-2026-01-13.md` · SHA-256 `47f4fbcbb78694c49003c2c41c5631c0db1c3a1e7cdd19b5c244db5639312156`  
  ⚠ versao_texto = 'texto da fonte oficial' (não é texto compilado: alterações posteriores não aparecem)
- **[D04]** Resolução CGSN nº 185, de 9 de MARÇO de 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ea0d91e6d324be2e3f53149980cb9048e55732da/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-185-de-9-de-marco-de-2026-691788735.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-185-de-9-de-marco-de-2026-691788735> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:52:59-03:00 · arquivo local `docs/D04_resolucao-cgsn-n-185-de-9-de-marco-de-2026-691788735.md` · SHA-256 `e489e196d219338ae19f941fbdb62d957eca9155e63ca3a57969b0bdb48d003a`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D05]** Resolução CGSN nº 186, DE 9 DE ABRIL DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-186-de-9-de-abril-de-2026-700230741.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-186-de-9-de-abril-de-2026-700230741> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:01-03:00 · arquivo local `docs/D05_resolucao-cgsn-n-186-de-9-de-abril-de-2026-700230741.md` · SHA-256 `4eef7398f152be1eacdecee700269c5fb5a2003f2dd9de646726b09fce4a77e9`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** Resolução CGSN nº 187, 9 de abril de 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-187-9-de-abril-de-2026-700221762.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-187-9-de-abril-de-2026-700221762> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:04-03:00 · arquivo local `docs/D06_resolucao-cgsn-n-187-9-de-abril-de-2026-700221762.md` · SHA-256 `257f51759e8e1abd2a4863c6113c424485f383356b642b86a56dcb1149ec956e`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D07]** Resolução CGSN Nº 188, de 23 DE ABRIL De 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-188-de-23-de-abril-de-2026-701462810.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-188-de-23-de-abril-de-2026-701462810> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:06-03:00 · arquivo local `docs/D07_resolucao-cgsn-n-188-de-23-de-abril-de-2026-701462810.md` · SHA-256 `18b54cc40dc46c2618930ffdbc3cc784092571f118526e7c08942aee4f23eedd`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D08]** Resolução CGSN Nº 189, de 23 DE ABRIL De 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-189-de-23-de-abril-de-2026-702052637.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-189-de-23-de-abril-de-2026-702052637> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:07-03:00 · arquivo local `docs/D08_resolucao-cgsn-n-189-de-23-de-abril-de-2026-702052637.md` · SHA-256 `4f8b512d6c06e3af1ea0d7e1777dbedd5618fe646cc628552af728792835d22d`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D09]** Resolução CGSN Nº 193, de 4 DE agosto De 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/fazenda/resolucoes/2026/resolucao-cgsn-n-193-de-4-de-agosto-de-2026-724208269.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgsn-n-193-de-4-de-agosto-de-2026-724208269> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:53:09-03:00 · arquivo local `docs/D09_resolucao-cgsn-n-193-de-4-de-agosto-de-2026-724208269.md` · SHA-256 `11b3d90c89b1dc3bc2c76f18d2b93b9c800f77d0476df0a215998f3081bbb563`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D10]** Ato Declaratório Executivo Cofis nº 30, de 12 de abril de 2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/abc9f6edcd02b4f155270e6f03298226eaf65a6e/reguladores/rfb/2018/rfb-sijut-138414.md>  
  Fonte oficial declarada: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/138414/visao/original> · versao_texto: publicação original — visão original da fonte · cópia de 2026-10-16  
  Lido em 2026-10-17T09:53:12-03:00 · arquivo local `docs/D10_rfb-sijut-138414.md` · SHA-256 `819041c34e0904286619ad87034cc613b173fe5f0746f54997ca42446cc9ceb2`  
  ⚠ versao_texto = 'publicação original — visão original da fonte' (não é texto compilado: alterações posteriores não aparecem)
- **[D11]** Ato Declaratório Executivo Cofis nº 30, de 12 de abril de 2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/abc9f6edcd02b4f155270e6f03298226eaf65a6e/reguladores/rfb/2018/rfb-sijut-139412.md>  
  Fonte oficial declarada: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/139412/visao/original> · versao_texto: publicação original — visão original da fonte · cópia de 2026-10-16  
  Lido em 2026-10-17T09:53:14-03:00 · arquivo local `docs/D11_rfb-sijut-139412.md` · SHA-256 `82fb4386245d31994bb2bf4def94a007090b6330f1c14b04fb55a46c8fde24d4`  
  ⚠ versao_texto = 'publicação original — visão original da fonte' (não é texto compilado: alterações posteriores não aparecem)
- **[D12]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-17T09:54:38-03:00 · arquivo local `docs/D12_lcp214-htm.html` · SHA-256 `68ffb9542ac5dc535c558ce9b2f72c07b7af5c26184b5e342c95580f415b664f`
- **[D13]** Lcp 123 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm>  
  Baixado em 2026-10-17T09:54:51-03:00 · arquivo local `docs/D13_lcp123-htm.html` · SHA-256 `93865441a411a1e357fd84120665db7c979d156ea8559a76a4f7a6e5dab1a43a`
- **[D14]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado>  
  Baixado em 2026-10-17T09:57:46-03:00 · arquivo local `docs/D14_link-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D15]** D15_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/visao/multivigente>  
  Baixado em 2026-10-17T10:05:16-03:00 · arquivo local `docs/D15_multivigente.html` · SHA-256 `8d9b024965c1568c12560992791181d1560a0c24982d65b451cc407231374d80`
- **[D16]** D16_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/visao/multivigente>  
  Baixado em 2026-10-17T10:05:16-03:00 · arquivo local `docs/D16_multivigente.html` · SHA-256 `f6b9c4986b051322caeec2eeb7e467ea38ae6d4aa2d8b16a5c7d95cbfca0317c`
- **[D17]** D17_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152781/visao/multivigente>  
  Baixado em 2026-10-17T10:05:16-03:00 · arquivo local `docs/D17_multivigente.html` · SHA-256 `d2148c9d8019be7a839d9b7a391279d4b57127eca3caad267a68473051972483`
- **[D18]** D18_85784 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85784>  
  Baixado em 2026-10-17T10:05:16-03:00 · arquivo local `docs/D18_85784.pdf` · SHA-256 `6a7e99859482d0b2d202dfb68f89aea2dd72ced2a01c4be95bdf8c086c50c1c5`
- **[D19]** D19_85769 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152832/anexo/85769>  
  Baixado em 2026-10-17T10:05:16-03:00 · arquivo local `docs/D19_85769.pdf` · SHA-256 `ebaafdc46750043969d998b259d33101a2d0e7f7494cb2e554fb0424a7069c12`
- **[D20]** D20_81177 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/anexo/81177>  
  Baixado em 2026-10-17T10:05:18-03:00 · arquivo local `docs/D20_81177.pdf` · SHA-256 `cb3845804f3c14cb9cb1320aee19bf14498cf15988cd9263fd4618d8faaab8b6`
- **[D21]** Decreto nº 12.797 de 23/12/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/517db958cd0ae2ba36c1f0b524b3cc55fe4198c6/federal/decretos/2025/dec-12797-2025-12-23.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2025-12-23;12797> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-17T10:06:00-03:00 · arquivo local `docs/D21_dec-12797-2025-12-23.md` · SHA-256 `78c3055b89e22e81faed472972c481d8076e86a23788ee1cf29293215e6a3320`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)

## Registro de buscas
_Nenhuma busca registrada._
