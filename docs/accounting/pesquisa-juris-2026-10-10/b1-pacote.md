# Jurisprudência — Bloco 1 (pacote pré-pago com validade / breakage) — 10/10/2026

> Prompt: `docs/accounting/PROMPT-PESQUISA-JURISPRUDENCIA-2026-10-10.md`, Bloco 1, questões 1.1 a 1.4.
> Autorização do dono (chat, 10/10): "Faz um prompt para o que o contador não confirmou e pesquise jurisprudencia".
> Ponto de partida, não repetido aqui: `PESQUISA-JURISPRUDENCIA-PACOTE-VALIDADE-2026-09-29.md` (J1–J6, SC Cosit
> 144/2023, 276/2024, 12/2017, Tema 581), `RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md`, `pesquisa-lei-2026-10-10/`
> (PE-3, PE-4). **Isto é pesquisa, não parecer nem decisão.**

**Graus usados:**
- **V**: lido nesta sessão no portal oficial ou em documento oficial baixado (CARF Solr/PDF, STF `downloadPeca`, API Normas RFB, PDF da Prefeitura de SP, Planalto).
- **V-ant**: lido na sessão de 29/09 (fonte oficial), não relido hoje.
- **S**: só fonte secundária. **Número não conferido no portal oficial.** Não citar em ADR sem conferir.
- **NL**: procurei e não localizei. **I**: inferência minha.

**Limites do método (declarados):**
- **SCON/STJ**: devolveu desafio anti-robô (HTTP 403, "Verificação automática em andamento"). **Não contornei.** A busca de informativos (`processo.stj.jus.br`) não devolveu resultado com a sintaxe que tentei.
- **TJSP/CJSG**: o formulário exige reCAPTCHA. **Não contornei.** O link público `getArquivo.do` de um acórdão achado em busca aberta devolveu HTML vazio. **Não há acórdão do TJSP verificado neste bloco.**
- **CARF**: o índice Solr público (`acordaos.economia.gov.br/solr/acordaos2`) funcionou. A busca vale só para a **ementa** (`ementa_s`) e o dispositivo (`decisao_txt`). O inteiro teor (`conteudo_txt`) não é pesquisável (a busca por "multiplus" no inteiro teor deu 0, mas o acórdão existe). Um "não localizei no CARF" quer dizer "não está em ementa".
- **API Normas/RFB**: o endpoint `ato/{id}/visao/multivigente` funcionou para atos com id conhecido. Não achei endpoint público de busca. As SC sem id conhecido ficaram como S.

---

Questão 1.1 — ISS sobre pacote pré-pago que vence sem nenhuma sessão prestada
Posição: **(c) inexistente sobre o ponto exato**, com a premissa "fato gerador = prestação efetiva, não recebimento" **apoiada**. Há **um indício administrativo paulistano contrário** para valor retido após desistência (SC SF/DEJUG 11/2020, item 9.4.1). Segurança: **média** para "receber antecipado não gera ISS"; **baixa** para "o vencido nunca gera ISS em SP".
Decisões:
  - **STF, RE 1.610.607/RJ**, rel. Min. Flávio Dino, decisão monocrática, 22/06/2026 (publicação noticiada em 23/06/2026, não conferida no DJe). Força: **isolado**. Não é decisão de mérito do STF: nega seguimento porque a matéria é infraconstitucional (Súmulas 279/280; não há ofensa ao art. 97 nem à SV 10). Mantém o TJRJ. **V**: https://portal.stf.jus.br/processos/downloadPeca.asp?id=15388234073&ext=.pdf (autenticação 7E18-FFD1-ACC5-2694; sha256 `3eaa3427a708…`).
    Trecho do acórdão do TJRJ transcrito na decisão: "se o pagamento é antecipado, por qualquer motivo, antes da prestação do serviço, a incidência do tributo não é abreviada para este momento".
  - **TJRJ, Apelação Cível 0322451-06.2021.8.19.0001**, j. 20/08/2024 (*Sistema Elite de Ensino × Município do RJ*, anuidade escolar paga à vista). Força: **persuasivo** (outro estado, mesma LC 116). **V**, pela ementa transcrita no RE acima: "A LC Nº 116/2003 DISPÕE QUE O ISS TEM COMO FATO GERADOR A EFETIVA PRESTAÇÃO DO SERVIÇO".
  - **Prefeitura de SP, SC SF/DEJUG nº 11, de 02/03/2020** (ISS, subitem 8.01, mensalidade/anuidade antecipada). Força: **administrativo** (vincula a SF só perante a consulente). **V**: https://www.prefeitura.sp.gov.br/cidade/upload/sc_11-2020_1594393170.pdf (sha256 `4e0b4c7e48d7…`).
    - A favor, item 7: o contrato com pagamento antecipado cria relações "que somente adquirirão caráter tributário com o início da prestação do serviço".
    - **Contra (adversarial), item 9.4.1:** "Possível desistência do aluno dá lugar ao cancelamento do documento fiscal emitido, seguido de nova emissão de NFS-e caso constem valores não devolvidos pela consulente."
    - Leitura (I): para a SF/SP, o valor **retido e não devolvido** depois que a prestação começou vai para a NFS-e (ISS). A SC não trata de prestação que nunca começou. Mas é o texto paulistano mais próximo de "saldo retido gera ISS".
  - **STF, RE 651.703, Tema 581** (planos de saúde; V-ant). Força: **vinculante** para o caso dele. Contra-argumento: "estar à disposição" é serviço. Já registrado em 29/09; o objeto do pacote de salão são sessões, não cobertura.
  - **TJSP, AI 0168314-89.2012.8.26.0000**, 18ª Câm. Dir. Público, rel. Osvaldo Capraro, liminar de 14/08/2012 (ABRASEL × SP, ISS antecipado do valet, IN SF/SUREM 6/2012). Força: **isolado** (liminar). **S** (Migalhas; não conferido no e-SAJ). Fundamento: a IN "impõe o pagamento do tributo antes da ocorrência do fato gerador". O STF, no ARE 1.088.649 AgR (1ª T., rel. Fux, DJe 13/02/2020, citado no RE 1.610.607, **V** só como citação), tratou o tema do valet paulistano como infraconstitucional.
  - **NL:**
    - STJ sobre ISS em saldo pré-pago expirado, vale-serviço ou multa por desistência;
    - TJSP sobre ISS paulistano em pacote vencido;
    - qualquer SC da SF/SP sobre expiração;
    - o "REsp 4.962/1994" citado em 29/09 segue S.
Superação/vigência:
  - A SC 11/2020 segue publicada; não achei revogação.
  - O RE 1.610.607 é de 22/06/2026; não verifiquei se houve agravo interno.
  - Efeito sistêmico (I): ao dizer que a matéria é infraconstitucional, o STF manda a disputa ao STJ e aos TJs. Não haverá tese do STF sobre isso.
Conclusão em 2 linhas: os tribunais confirmam que receber adiantado não é fato gerador de ISS. Ninguém decidiu o pacote que vence sem uso. E a própria SF/SP manda emitir NFS-e sobre valor retido após desistência, quando a prestação já começou.
Pergunta que sobra para advogado ou contador: "Pela SC SF/DEJUG 11/2020 (item 7 × item 9.4.1), o saldo de pacote retido pelo salão **sem nenhuma sessão prestada** fica fora do ISS? E o saldo retido de pacote **parcialmente usado**, que vence: a SF exige NFS-e sobre ele (9.4.1)?" Alternativa formal: consulta à SF/DEJUG (Lei SP 14.107/2005, arts. 73–78).

---

Questão 1.2 — IRPJ/CSLL e PIS/Cofins: o breakage é receita da atividade ou "outra receita"? Quando se reconhece?
Posição:
- Momento, IRPJ/CSLL: **(a) apoia** reconhecer na expiração (ou por estimativa estatística), na única CSRF localizada. Segurança **média** (um caso, de terceiro operador de programa de fidelidade).
- Momento, PIS/Cofins: **(b) contraria** o diferimento, no regime de 2012, porque tributa no recebimento. Segurança **média-baixa** para hoje, porque o fundamento foi o RTT.
- Natureza no Presumido (32% × 100%): **(c) inexistente.**
Decisões:
  - **CARF, CSRF/1ª Turma, Acórdão 9101-006.862**, Processo 10314.722542/2016-22 (Multiplus, IRPJ/CSLL, AC 2011), rel. Fernando Brasil de Oliveira Pinto, sessão 07/03/2024, publ. 28/03/2024. Unanimidade no conhecimento e provimento do recurso do contribuinte; Edeli Pereira Bessa pelas conclusões. Força: **administrativo não vinculante** (CSRF uniformiza no CARF, não vincula a RFB). **V**: Solr CARF + PDF https://acordaos.economia.gov.br/acordaos2/pdfs/processados/10314722542201622_7045660.pdf (sha256 `7800c84f8ecc…`).
    - Ementa: "O montante recebido em uma transação cuja obrigação de performance não se encontra plenamente determinada deve ser reconhecido como receita diferida, ocorrendo o reconhecimento da receita apenas quando atendidas as obrigações assumidas."
    - No corpo do voto (fl. 16): no caso "de decaírem os pontos do participante (breakage), a receita bruta será igual ao valor $$$(B)".
    - Fl. 23–24: correto contabilizar a receita "no momento do resgate dos pontos pelo cliente e/ou no momento da expiração dos pontos", inclusive por estimativa mensal ("Provisão de Breakage").
  - **CARF, 1201-002.302**, mesmo processo, 1ª TO/2ª Câm./1ª Seção, rel. Luis Henrique Marotti Toselli, sessão 25/07/2018, publ. 30/08/2018. Força: **não vinculante; superado** pelo 9101-006.862 no mesmo processo. **V** (Solr). A provisão de resgates futuros, calculada considerando "a expectativa de pontos não resgatados (breakage)", é "não dedutível".
  - **CARF, CSRF/3ª Turma, Acórdão 9303-015.298**, Processo 19515.720554/2016-21 (Multiplus, Cofins/PIS, AC 2012), rel. Rosaldo Trevisan, sessão 11/06/2024, publ. 21/08/2024. Provimento parcial por maioria: o pedido subsidiário foi acolhido para evitar dupla tributação em anos seguintes. Força: **administrativo não vinculante**. **V**: Solr + PDF https://acordaos.economia.gov.br/acordaos2/pdfs/processados/19515720554201621_7118672.pdf (sha256 `e5772c539b79…`).
    - Ementa: é "indevido o diferimento da tributação das receitas obtidas na comercialização de direitos de resgate de prêmios para o momento do resgate de pontos", porque para fins tributários valem os critérios contábeis de 31/12/2007 (RTT).
    - Confirma o 3201-006.137 (rel. Charles Mayer de Castro Souza, 19/11/2019, **V** Solr).
  - **CARF, 1301-004.411**, Processo 16327.720173/2017-51, 1ª TO/3ª Câm./1ª Seção, rel. Rogério Garcia Peres (redator designado Roberto Silva Junior em outra matéria), sessão 10/03/2020, publ. 04/06/2020. Força: **não vinculante**. **V** (Solr). Ementa: "As despesas relacionadas a Programa de Incentivo são dedutíveis [...] mesmo existindo a possibilidade de expiração dos pontos. Se os beneficiários perderem o direito aos pontos, a reversão do passivo será tributada."
  - **SC Cosit 144/2023 e 276/2024** (V-ant): no Presumido, a receita bruta de serviço "compreende o preço do serviço prestado". São o apoio fraco ao "32%".
  - **Lei 9.430/1996, art. 70, § 3º, III** (texto de lei, **V** Planalto): multa ou vantagem paga **por pessoa jurídica** em virtude de rescisão de contrato é "acrescido ao lucro presumido". Ou seja, entra a 100%, fora dos 32%.
    - Não se aplica diretamente: no salão, o cliente é pessoa física.
    - Indica (I) o risco: se o vencido for qualificado como "vantagem por rescisão", sai da receita bruta e vai a 100% (art. 25 II).
  - **SC Cosit 90/2018** (S, via IBET; não conferida no portal oficial): lucros cessantes recebidos em rescisão não integram a receita bruta e seguem o art. 70. As remunerações ligadas ao objeto principal ficam na receita bruta (DL 1.598 art. 12 IV).
  - **NL:**
    - SC Cosit sobre breakage de vale-presente, de cartão-presente ou de crédito pré-pago de serviço;
    - CARF com "vale-presente", "cartão-presente", "gift card" ou "no-show" ligado a receita (todos com 0 resultado em ementa);
    - qualquer decisão sobre o enquadramento do breakage no art. 25 I × II do Presumido.
Superação/vigência:
  - Os dois acórdãos da CSRF são de 2024. O 9303 aplicou o RTT (anos até 2014). Desde a Lei 12.973/2014, vale o CPC 47 com os ajustes de neutralidade (IN 1.753, Anexo IV). Por isso a razão de decidir do 9303 **não se transporta automaticamente** a 2026 (I).
  - O 9101 apoiou-se no CPC 30 e na lógica de competência, e se transporta melhor (I).
  - A divergência entre a 1ª e a 3ª Turmas da CSRF (IR × PIS/Cofins) segue aberta. Não achei súmula CARF sobre o tema.
Conclusão em 2 linhas: a única CSRF sobre breakage (IRPJ) trata o valor expirado como receita, reconhecida na expiração ou por estimativa, e pelo valor cheio. Para PIS/Cofins, a CSRF tributou já no recebimento. O enquadramento 32% × 100% no Presumido não foi decidido por ninguém.
Pergunta que sobra para advogado ou contador: "No Presumido, o saldo de pacote vencido entra como receita bruta de serviço (32%, art. 25 I) ou como demais receitas (100%, art. 25 II, por analogia ao art. 70 § 3º III)? E no Lucro Real não cumulativo: PIS/Cofins na venda do pacote ou só na sessão/expiração, dada a CSRF 9303-015.298 (anos do RTT)?"

---

Questão 1.3 — Simples Nacional: o saldo vencido entra no PGDAS-D? Qual anexo? É "indenização" (Res. CGSN 140, art. 2º, § 5º, V)?
Posição: **(c) inexistente sobre o vencido.** As SC Cosit **apoiam** a regra-mãe: a receita entra no faturamento ou na prestação, o que vier primeiro, e o adiantamento não antecipa. Segurança **média** para a regra-mãe; **baixa** para o vencido.
Decisões:
  - **SC Cosit nº 158, de 28/12/2020**, DOU 18/01/2021 (Simples, hospedagem, pagamento antecipado por cartão). Força: **administrativo vinculante para a RFB** (IN RFB 2.058/2021, art. 33, citado de memória e não relido). **V**: API Normas `ato/114933`.
    "a receita oriunda da prestação de serviço de hospedagem deve ser reconhecida por ocasião do faturamento ou na proporção em que os serviços são efetivamente prestados, o que ocorrer primeiro, ainda que haja o recebimento de valores adiantados por meio de cartão de crédito."
  - **SC Cosit nº 15, de 09/01/2023**, DOU 11/01/2023 (Simples, venda com pontos de fidelidade). Força: **vinculante para a RFB**. **V**: API Normas `ato/128320`.
    - A receita da venda geradora de pontos é reconhecida "integralmente no momento do faturamento ou da entrega do bem".
    - "não haverá receita bruta a reconhecer em decorrência da entrega de mercadoria adquirida por meio do resgate de pontos".
    - Leitura (I): no Simples, a RFB não difere receita por obrigação futura. Tributa tudo no faturamento. Se o salão emite documento fiscal na venda do pacote, a receita já entrou e o vencimento não gera nada novo.
  - **SC Cosit nº 12/2017** (V-ant): entrega futura, regime de competência.
  - **SC Cosit nº 192/2018** (**S**: blogs; datas conflitantes, 23/05 ou 30/10/2018; número não conferido no portal): multa ou indenização por rescisão contratual recebida pelo optante não integra a receita bruta, "desde que não corresponda à parte executada do contrato". Aplicação (S): **SC Disit/SRRF07 nº 7.045/2019**, sem IRRF sobre essa verba.
  - **NL:**
    - SC, CARF ou TRF sobre saldo pré-pago vencido no Simples;
    - qualquer decisão que qualifique a retenção de saldo não usado como "indenização" do § 5º V;
    - acórdão do CARF com Simples e adiantamento em ementa.
Superação/vigência:
  - A SC 158/2020 e a SC 15/2023 aplicam o art. 2º §§ 8º e 9º na redação anterior à Res. CGSN 190.
  - **Em 2027** a Res. 190 muda o § 8º: a receita passa a "auferida no momento do faturamento", e o § 9º-A define faturamento como emissão de documento fiscal (já em `simples-nfse.md` PE-3). As duas SC perdem a parte "prestação, o que ocorrer primeiro" para fatos de 2027 em diante (I).
Conclusão em 2 linhas: hoje a RFB reconhece a receita do Simples no faturamento ou na prestação, o que vier primeiro. Vencido nunca faturado e nunca prestado não tem regra escrita. A tese de "indenização" (§ 5º V) só tem SC por fonte secundária e nunca foi aplicada a saldo pré-pago.
Pergunta que sobra para advogado ou contador: "Pacote vendido sem documento fiscal na venda (NFS-e só na sessão) e vencido sem uso: em 2026 o valor entra no PGDAS-D? Em que mês e em qual anexo (III, do serviço)? Ou cabe a exclusão do art. 2º § 5º V como indenização? E em 2027, com faturamento = documento fiscal, a resposta muda?"

---

Questão 1.4 — Consumidor: a cláusula de validade com perda do saldo é válida?
Posição: **(c) dividida.**
- A validade informada com destaque tem apoio em setor regulado e em vale-presente.
- A perda integral do valor pago sem contraprestação é rejeitada pelo STJ em casos vizinhos.
- Segurança: **média** para "o prazo, em si, pode existir"; **baixa** para "perder 100% é válido".
Decisões:
  - **STJ, REsp 1.321.655/MG**, 3ª T., rel. Min. Paulo de Tarso Sanseverino, j. 22/10/2013 (Inf. 533). Força: **persuasivo**. **V-ant**. Perda integral do valor pago antecipadamente é abusiva (CDC 51 II e IV; CC 413).
  - **STJ, REsp 1.580.278**, 3ª T., rel. Min. Nancy Andrighi, notícia de 25/09/2018. Força: **persuasivo**. **V-ant**. Retenção limitada a 20%.
  - **STJ, REsp 1.878.651/SP**, 3ª T., rel. Min. Moura Ribeiro, j. 04/10/2022 (Inf. 753). Força: **persuasivo**. **V-ant**. Expiração de pontos é válida porque o programa é **gratuito**. O fundamento não se transporta para pacote pago.
  - **STJ, 1ª Turma, 2009, rel. Min. Luiz Fux**: negou recurso do MPF contra o prazo de 90 dias dos créditos de celular pré-pago (Anatel). Força: **persuasivo; setor regulado**. **S** (Migalhas 11/03/2009, Sedep). **Número do REsp não localizado.** O fundamento noticiado é processual (dissídio não demonstrado), não de mérito.
  - **TRF1, 5ª Turma, ACP do MPF** (proc. noticiado como 2005.39.00.004354-0), rel. Des. Souza Prudente, 2013: validade dos créditos pré-pagos = "confisco antecipado"; cláusulas e normas da Anatel declaradas nulas. Força: **persuasivo; contra a validade**. **S** (IDEC, Câmara; número não conferido no TRF1). Desdobramentos (**S**):
    - a presidência do STJ (Min. Félix Fischer, out/2013) suspendeu a decisão a pedido da Anatel;
    - a Anatel ajuizou a **Rcl 16.265** no STF, com resultado **NL**.
  - **TJRS, AC 70080293178**, 15ª Câm. Cível, rel. Des. Ana Beatriz Iser, j. 13/03/2019 (vale-presente, prazo de 12 meses informado no cartão = decadência convencional válida). Força: **persuasivo**. **S** (já em 29/09).
  - **TJDFT, Acórdão 1992212** (V-ant): prazo não informado com clareza não pode ser invocado depois (CDC 47).
  - **TJSP sobre pacote de estética/academia com validade: NL.** O CJSG tem reCAPTCHA e não foi contornado. A busca aberta só trouxe resumos de caso de clínica fechada e de multa de 30% em academia, **S**, sem tribunal ou número conferido.
Superação/vigência:
  - Não achei overruling dos REsp 1.321.655 e 1.580.278.
  - O caso da telefonia é de setor regulado. A Anatel hoje disciplina a validade por resolução, que não conferi nesta sessão. A analogia com salão é fraca nos dois sentidos.
Conclusão em 2 linhas: o tribunal superior nunca julgou o pacote pago que vence. O STJ aceita validade quando o crédito é gratuito ou regulado e rejeita a perda total de valor pago em desistência. O risco do "100% para o salão" segue o mesmo apontado pelo jurídico em 04/10.
Pergunta que sobra para advogado ou contador: "Para pacote de salão em SP, com validade informada com destaque na compra, qual prazo mínimo e qual percentual de retenção do saldo vencido o advogado considera defensável no TJSP (pesquisa no CJSG, que exige acesso humano)?"

---

## Quadro-resumo (Bloco 1)

| Q | Tema | Posição | Segurança | Precedente mais forte (grau) |
|---|---|---|---|---|
| 1.1 | ISS no vencido sem sessão | (c) inexistente; premissa "prestação ≠ recebimento" apoiada; SF/SP 9.4.1 contra o retido após início | média / baixa | RE 1.610.607 (V, monocrática) + SC SF/DEJUG 11/2020 (V) |
| 1.2 | IRPJ/CSLL e PIS/Cofins do breakage | IRPJ: (a) receita na expiração. PIS/Cofins: (b) na venda (RTT). Presumido 32×100: (c) | média / média-baixa / — | CSRF 9101-006.862 (V); CSRF 9303-015.298 (V) |
| 1.3 | Simples: vencido no PGDAS-D | (c) inexistente; regra "faturamento ou prestação, o que vier primeiro" apoiada | média / baixa | SC Cosit 158/2020 e 15/2023 (V) |
| 1.4 | Validade e perda do saldo (CDC) | (c) dividida | média / baixa | REsp 1.321.655 e 1.580.278 (V-ant) × TJRS 70080293178 (S) |

**Onde a jurisprudência mais muda o produto (Bloco 1):**
1. **SC SF/DEJUG 11/2020, item 9.4.1.** Se a SF aplicar ao salão a lógica "valor retido e não devolvido vai para a NFS-e", o saldo vencido de pacote **parcialmente usado** pode exigir NFS-e. Isso toca o F-PV-9 e muda o ramo "vencido sem nota".
2. **CSRF 9101-006.862.** Dá respaldo administrativo a reconhecer o breakage na expiração ou por estimativa. Sustenta a política "vence → receita" para o IRPJ/CSLL do Lucro Real.
3. **CSRF 9303-015.298.** Para PIS/Cofins no Lucro Real, o risco é a RFB exigir as contribuições na venda do pacote, não na sessão nem no vencimento. Muda o momento do lançamento de PIS/Cofins, se o produto atender Lucro Real.
4. **SC Cosit 15/2023 e 158/2020.** No Simples, emitir documento fiscal na venda antecipa a receita inteira. O vencimento fica neutro. Sem documento na venda, o vencido fica sem regra. É o argumento para o contador escolher onde emitir.
5. **REsp 1.321.655 e 1.580.278.** Perda de 100% segue o ponto mais frágil. O parâmetro de 20% do STJ é a referência que um juiz pode usar para limitar a retenção.

## Caso adversarial tentado

- **Contra a leitura 1.1 ("vencido sem sessão não gera ISS"):** procurei decisão ou SC que tributasse ISS sobre saldo expirado, multa por desistência, no-show ou "disponibilidade".
  - Não achei decisão judicial.
  - **Achei** a SC SF/DEJUG 11/2020, item 9.4.1: valor não devolvido após desistência vai para nova NFS-e. É o contra-indício mais forte, e por isso a 1.1 caiu de "apoia" para "(c), segurança baixa no vencido".
- **Contra a 1.2 ("breakage é receita na expiração"):** a CSRF 9303-015.298 tributou PIS/Cofins já na venda dos pontos. A posição ficou partida por tributo.
- **Contra a 1.4:** procurei decisão que validasse a perda integral de saldo pago. Só achei casos gratuitos (REsp 1.878.651) ou regulados (telefonia, S). O TRF1 (S) foi no sentido oposto.

**Checagem que teria falhado se eu estivesse errado:**
- Os números CARF 9101-006.862 e 9303-015.298 vieram do índice oficial, com relator, data e processo, e os PDFs baixados trazem o número no cabeçalho de cada folha.
- O RE 1.610.607 foi baixado do `portal.stf.jus.br` com código de autenticação.
- Se algum desses números fosse invenção de fonte secundária, a consulta `numero_decisao_s` ou o `downloadPeca` teria voltado vazia.
- O REsp da telefonia de 2009, o processo do TRF1, a SC 192/2018 e o TJRS **não** passaram por essa checagem e estão marcados como S.

## Fontes (acessadas em 10/10/2026)

- CARF Solr: `https://acordaos.economia.gov.br/solr/acordaos2/select?q=numero_decisao_s:...`
- CARF PDFs:
  - https://acordaos.economia.gov.br/acordaos2/pdfs/processados/10314722542201622_7045660.pdf (9101-006.862)
  - https://acordaos.economia.gov.br/acordaos2/pdfs/processados/19515720554201621_7118672.pdf (9303-015.298)
  - https://acordaos.economia.gov.br/acordaos2/pdfs/processados/16327720173201751_6209877.pdf (1301-004.411; o PDF veio corrompido, e a ementa foi lida no Solr)
- STF RE 1.610.607: https://portal.stf.jus.br/processos/downloadPeca.asp?id=15388234073&ext=.pdf
- SC SF/DEJUG 11/2020: https://www.prefeitura.sp.gov.br/cidade/upload/sc_11-2020_1594393170.pdf
- SC Cosit 158/2020: https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/114933/visao/multivigente
- SC Cosit 15/2023: https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/128320/visao/multivigente
- Lei 9.430/1996 (arts. 25 e 70): https://www.planalto.gov.br/ccivil_03/leis/l9430.htm
- Secundárias (pistas):
  - Migalhas 161893 (valet TJSP); Migalhas 79868 e Sedep (STJ 2009, pré-pago);
  - IDEC, Câmara e Coad (TRF1 2013, Rcl 16.265);
  - Velloza e IBET (Multiplus); Tributo Devido e Tributário nos Bastidores (SC 192/2018, Disit 7.045/2019); IBET (SC 90/2018).
- Arquivos baixados: `scratchpad/juris/b1/`.
