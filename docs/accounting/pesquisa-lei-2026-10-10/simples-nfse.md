# Pesquisa de lei: Simples Nacional / MEI e datas da NFS-e (10/10/2026)

Autorização: dono, chat, 10/10: "Sim, roda a pesquisa para termos um questionário mais completo e assertivo".
Nada foi editado no repositório; nada foi commitado. Fontes salvas em `scratchpad/lei/`. Todas acessadas em **10/10/2026**.

**Placar:** 12 RESOLVIDAS · 4 PARCIAIS · 0 NÃO ALCANÇADAS.

**Resposta prioridade 1 (verificada no texto):** para ME/EPP do Simples, a **NFS-e de padrão nacional, emitida pelo Emissor
Nacional (web ou API), é obrigatória desde 01/11/2026** (Res. CGSN 191/2026 art. 3º I). A data de 01/09/2026 da
Res. 189 **nunca vigorou**: a 191 a revogou (art. 2º) antes da data de efeito. A data de **01/01/2027** do Ato Conjunto
RFB/CGIBS 4/2026 § 1º trata de **outra obrigação**: a dos documentos fiscais do IBS/CBS (art. 112 do RIBS/RCBS). Ela não
adia a NFS-e nacional do Simples.

**Risco principal:** três conclusões de documentos do repo caem. (1) O MANIFEST do corpus diz que a compilação da
Res. 140 "vai até a 183". Falso: o **mesmo arquivo (sha `8d9b024965c1`)** já traz as Res. 190 e 191. (2) A PESQUISA-X14-PR4 §3a
diz que a LC 214 não muda o art. 26 § 6º da LC 123. Falso: a LC 214, art. 517, reescreve o inciso II, e **a partir de
01/01/2027 o MEI emite documento fiscal em toda venda**, inclusive para pessoa física. (3) A Res. 190 revoga o art. 106 I/II e o
art. 106-A § 2º da Res. 140. A regra do alerta `NFSE_DIVERGE_RECEITA` do MEI muda em 2027.
**Prazo urgente encontrado:** a opção pelo Simples para 2027 termina em **15/10/2026** (Res. CGSN 186 art. 1º, red. Res. 194).
A opção pelo regime regular do IBS/CBS (1º semestre de 2027) termina em **30/10/2026** (art. 2º).

---

## Fontes primárias lidas (todas em 10/10/2026)

| Norma | URL | Observação |
|---|---|---|
| Res. CGSN 140/2018, multivigente | `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/visao/multivigente` | sha256 `8d9b024965c1…` = **idêntico** ao corpus. O histórico do ato lista as Res. 184, 187, 190 e 191 |
| Res. CGSN 184 · 185 · 186 · 187 · 188 · 189 · 190 · 191 · 192 · 193 · 194 | mesma API, `ato/{147558, 149833, 150653, 150654, 150756, 150788, 152832, 152781, 152805, 152752, 153801}` | ids achados por varredura da API (ids 147560–155000; o maior id existente em 10/10 fica entre 154000 e 154200, ato de 07/10/2026). **Não há CGSN posterior à 194** |
| Res. 190, Anexo III e Anexo Único (XIII) | `…/ato/152832/anexo/85771` e `/85784` (PDF) | — |
| Res. 169/2022 | `…/ato/125242/visao/multivigente` | — |
| Ato Conjunto RFB/CGIBS 4/2026 | `cgibs.gov.br/upload/arquivos/202607/31091735-20260730-16h30-ato-conjunto-rfb-cgibs-na-c2-ba-4-260731-090909.pdf` | PDF assinado |
| LC 123/2006 compilada | `planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm` | 1.622.252 bytes (mesmo tamanho do corpus; o sha do HTML do Planalto não é estável) |
| LC 214/2025 compilada (arts. 517, 544, Anexo XX) | `planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm` | — |
| LC 116/2003 (arts. 8º-A, 8º-B) | `planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm` | — |
| Decreto 8.264/2014 (arts. 8º e 9º) | `planalto.gov.br/ccivil_03/_ato2011-2014/2014/decreto/d8264.htm` | — |
| Manual PGDAS-D e DEFIS | `www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/MANUAL_PGDAS-D_2018_V4.pdf` | versão de 17/06/2025, sha `e73b2bfc7ede` = corpus |
| Anexo I do leiaute DPS/NFS-e v1.01 | `gov.br/nfse/.../anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx` | sha `de5bc492959e` = corpus |
| PLP 108/2021, ficha | `camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2295251` | lida via WebFetch (resumo por modelo) |
| Cópia da Res. 191 (impressão do Normas) | `economia.df.gov.br/documents/d/seec/resol-cgsn-n-191-2026-pdf` | texto igual ao da API; diz "seção 1E", e a API diz "seção 1-A" |

---

## 1. R191 + Res. CGSN 184–192/2026: data da NFS-e nacional para ME/EPP — **RESOLVIDA**

**Resposta:** a partir de **01/11/2026**, a ME/EPP do Simples usa "obrigatoriamente" a NFS-e de padrão nacional
emitida pelo **Emissor Nacional** (web ou API) (nova redação do art. 59 § 1º da Res. 140). Até 31/10/2026 vale a redação
anterior: nota no modelo do Município. A Res. 189, que dava 01/09/2026, foi revogada. O Ato 4 § 1º (01/01/2027) é o início,
para o Simples, da obrigação dos DF-e do **IBS/CBS**, e não da NFS-e nacional.

**Citações:**
- Res. 191 art. 1º (art. 59 § 1º da Res. 140): *"a Microempresa (ME) ou Empresa de Pequeno Porte (EPP) optante pelo Simples
  Nacional utilizará, obrigatoriamente, a Nota Fiscal de Serviço eletrônica (NFS-e) de padrão nacional, emitida pelo Emissor
  Nacional da NFS-e"*
- Res. 191 art. 2º: *"Fica revogada a Resolução CGSN nº 189, de 23 de abril de 2026."*
- Res. 191 art. 3º: *"produzirá efeitos: I - a partir de 01 de novembro de 2026, em relação ao art. 1º"*
- Res. 189 art. 2º (riscado no Normas): *"Esta Resolução entra em vigor em 01 de setembro de 2026."* (DOU 28/04/2026)
- Ato Conjunto 4/2026 art. 1º caput: *"A obrigatoriedade de emissão dos documentos fiscais eletrônicos de que trata o art. 112
  dos regulamentos do IBS (RIBS) e da CBS (RCBS)"*. § 1º: *"Para os contribuintes optantes pelo Simples Nacional, a
  obrigatoriedade de emissão dos documentos de que tratam os incisos do caput deste artigo iniciar-se-á em 1º de janeiro de
  2027."*

**Mapa das resoluções de 2025–2026 (todas lidas):**
| Res. | Data / DOU | Assunto | Toca a NFS-e/Simples do salão? |
|---|---|---|---|
| 184 | 04/11/2025 · DOU 10/11 | art. 144-B (opção em início de atividade até o módulo Redesim) | não |
| 185 | 09/03/2026 · DOU 11/03 | prorroga parcelamento (Juiz de Fora/Ubá/Matias Barbosa) | não |
| 186 | 09/04/2026 · DOU 17/04 | prazos de opção pelo Simples e pelo regime regular IBS/CBS para 2027 | **sim** (prazos abaixo) |
| 187 | 09/04/2026 · DOU 17/04 | parcelamento em calamidade (art. 40-A § 6º) | não |
| 188 | 23/04/2026 · DOU 27/04 | DAS para o ISS do regime geral via MAN da NFS-e, até 31/12/2032 | não (regime geral) |
| 189 | 23/04/2026 · DOU 28/04 | NFS-e nacional obrigatória a partir de 01/09/2026 | **revogada pela 191** |
| 190 | 04/08/2026 · DOU 10/08 | grande reforma da Res. 140 para 2027 (= R2027) | **sim** (§§ 3–8 abaixo) |
| 191 | 04/08/2026 · DOU 10/08 | NFS-e nacional obrigatória a partir de 01/11/2026 | **sim** |
| 192 | 04/08/2026 · DOU 10/08 | Res. 11/2007: partilha da arrecadação com o CGIBS | não |
| 193 | 04/08/2026 · DOU 10/08 | Regimento Interno do CGSN | não |
| 194 | 25/09/2026 · DOU 28/09 | altera a 186: opção pelo Simples até **15/10/2026**; IBS/CBS regular até **30/10/2026**; cancelamento de 03/11 a 20/12/2026 | **sim** |

**URLs:** `…/ato/152781` (191), `…/ato/150788` (189), PDF do Ato 4 no cgibs.gov.br. Acesso em 10/10/2026.
**Grau:** verificado na fonte primária.

**Caso adversarial tentado contra a conclusão:**
1. *"A 191 foi alterada ou adiada depois de 10/08?"* Varri a API do Normas nos ids 147560–155000, que cobrem atos até
   07/10/2026. A última CGSN é a **194**, e ela altera só a 186. O histórico da Res. 140 termina em 190/191. Resultado:
   nenhuma norma posterior mexe na 191.
2. *"O Ato 4 § 1º (01/01/2027) prevalece e adia a NFS-e?"* O caput do Ato 4 delimita o objeto ("documentos fiscais
   eletrônicos de que trata o art. 112" do RIBS/RCBS); a 191 decorre da LC 123 e altera o art. 59 da Res. 140.
   São obrigações distintas, uma sobre o modelo e o emissor da nota e outra sobre o DF-e do IBS/CBS. Resultado: as duas
   coexistem, e a conclusão se mantém. A Fenacon (secundária) lê da mesma forma.
3. *"A 189 vigorou entre 01/09 e 10/08?"* Não: a revogação (art. 2º, efeito imediato pelo art. 3º II) saiu em 10/08,
   antes de 01/09. Resultado: a data de 01/09 nunca teve efeito.
4. *"Município com sistema próprio integrado ao ADN cumpre a 191?"* O texto diz "emitida pelo Emissor Nacional da NFS-e".
   Boletins secundários citam Jundiaí (GissOnline integrado) e Guarulhos (emissor próprio até 31/10). Isso não muda a
   data, mas abre a dúvida **operacional** do item 1-b abaixo.

**Ponto aberto residual (não muda a data):**
- 1-b. *"Pela Res. CGSN 140 art. 59 § 1º (red. Res. 191, efeitos a partir de 01/11/2026), entendemos que a ME/EPP de São Paulo
  deve emitir pelo **Emissor Nacional** (web ou API) e não pelo sistema municipal, ainda que integrado ao ADN. Confirma? Se
  não, qual norma diz diferente?"* Para quem: **órgão** (SF/SP, ou CGNFS-e via gov.br/nfse).
- 1-c. (inferido) A 191 não diz se o marco é a data de emissão ou a do fato gerador. Lemos como data de emissão: nota
  emitida a partir de 01/11 sai pelo Emissor Nacional, mesmo que o serviço seja de outubro. *"Pela Res. 191 art. 3º I,
  entendemos que vale a data de emissão. Confirma?"* Para quem: **contador**.

---

## 2. R169/2022 (MEI) — **RESOLVIDA**

**Resposta:** a Res. 169 incluiu o art. 106-A (NFS-e nacional do MEI) e mudou o art. 106 § 1º. A vigência desses
dispositivos mudou duas vezes: 01/01/2023, depois 03/04/2023 (Res. 171) e por fim **01/09/2023** (Res. 172). Isso explica as
duas datas do portal gov.br/nfse, 03/04/2023 e 01/09/2023. Até 31/12/2026 a NFS-e do MEI para pessoa física é **facultativa**
(art. 106-A § 2º). Esse § 2º é revogado pela Res. 190 a partir de 01/01/2027 (ver § 8).
**Citação:** Res. 169 art. 3º I (red. Res. 172/2023): *"em 1º de setembro de 2023, em relação aos arts. 106 e 106-A da
Resolução CGSN nº 140, de 2018"*. Res. 140 art. 106-A § 2º: *"Nas operações para tomador consumidor final pessoa física, a
emissão da NFS-e é facultativa."*
**URL:** `…/ato/125242/visao/multivigente`; `…/ato/92278`. Acesso em 10/10/2026. **Grau:** verificado.

---

## 3. R2027: resolução que ajusta o art. 27 e o PGDAS-D/MEI de 2027 — **RESOLVIDA**

**Resposta:** é a **Res. CGSN 190/2026**, com efeitos a partir de 01/01/2027 (art. 9º). O que ela faz, entre outros pontos:
- **art. 27 I:** a alíquota de retenção do ISS passa a ser a da faixa *"no mês da prestação"*. **art. 27 II:** 2% no mês de
  início *"ou no mês seguinte"*;
- RBT12 = *"doze meses antecedentes ao mês anterior ao do período de apuração"* (art. 21 II "a"); no 1º e no 2º mês de
  atividade vale a 1ª faixa (art. 22 § 2º I); fator r = 0,28 nos dois primeiros meses (art. 26 § 6º);
- PGDAS-D com **declaração assistida** até o dia 10 (art. 38-A) e informações socioeconômicas anuais dentro dele (art. 38-B);
- IBS/CBS no DAS (art. 4º IX–X); opção semestral pelo regime regular (arts. 40-C a 40-E); split payment (art. 45-B);
  arredondamento do DAS (art. 45-A);
- **MEI:** IBS/CBS em valor fixo no **Anexo XIII**: 2027–28: ICMS R$ 1,00 · ISS R$ 5,00 · CBS R$ 0,994 · IBS R$ 0,006
  (art. 101 IV–V); art. 106 reescrito (ver § 8);
- Anexos I–V reescritos com as vigências 2027–28, 2029, 2030, 2031, 2032 e 2033+.
**Citação:** Res. 190 art. 9º: *"produzirá efeitos a partir de 1º de janeiro de 2027."* Art. 27 I: *"para a faixa de receita
bruta a que a ME ou EPP estiver sujeita no mês da prestação"*.
**URL:** `…/ato/152832/visao/multivigente` + anexos 85769/85771/85784. Acesso em 10/10/2026. **Grau:** verificado.
**Efeito no repo:** fecha o item 3 do "Não achado" da PESQUISA-X14-PR4 e a dúvida do F-PR4-2 (janela M−13…M−2).

---

## 4. F-SN-7: a opção pelo regime de caixa ainda existe em 2027? — **RESOLVIDA**

**Resposta:** **não.** A partir de 01/01/2027 a LC 123 art. 18 § 3º (red. LC 214 art. 517, efeitos pelo art. 544 III) deixa
de prever a receita recebida. A Res. 190 revoga os arts. 16 § 1º, 17 p.ú., 18 § 1º, 19, 20, 61 V, 77 e 78 da Res. 140. O
art. 16 passa a falar só de receita **auferida**.
**Citações:** LC 123 art. 18 § 3º (2027): *"Sobre a receita bruta auferida no mês incidirá a alíquota efetiva determinada na
forma do caput e dos §§ 1º, 1º-A e 2º."* Res. 190 art. 8º XII: *"os art. 19 e 20"* (revogados). Res. 140 art. 16 (2027):
*"será a receita bruta total mensal auferida."*
**URL:** `planalto.gov.br/.../lcp214.htm` (art. 517 e art. 544 III); `…/ato/152832`. Acesso em 10/10/2026.
**Grau:** verificado. A recomendação (a) do F-SN-7, "só competência", tem apoio na norma.
**Nota adversarial (inferida):** o art. 19 I, que manda registrar a opção no PGDAS-D de novembro com efeito no ano
seguinte, ainda está em vigor em nov/2026. Mas uma opção para 2027 não teria base legal em 2027. O tratamento das vendas a
prazo de 2026 na virada está no item 13.

---

## 5. DEFIS mensal em 2027? — **RESOLVIDA**

**Resposta:** **não há DEFIS mensal.** O art. 72 (DEFIS) é revogado a partir de 2027. A declaração do PGDAS-D passa a ser a
mensal (LC 123 art. 25, red. LC 214), e as informações socioeconômicas e fiscais vão **uma vez por ano, dentro do PGDAS-D,
de janeiro a março** (Res. 140 art. 38-B § 1º). Em extinção, cisão, fusão ou incorporação, vão no PGDAS-D do mês do
evento (§ 2º).
**Citações:** Res. 190 art. 8º XXI: *"o art. 72"* (revogado). Art. 38-B § 1º: *"deverão ser prestadas uma única vez no
PGDAS-D, no período de janeiro a março de cada ano-calendário"*. LC 123 art. 25 § 2º (2027): *"conterá as informações
socioeconômicas e fiscais do optante conforme forma e prazos definidos pelo CGSN."*
**URL:** `…/ato/152832`; lcp214.htm art. 517. Acesso em 10/10/2026. **Grau:** verificado. (A DEFIS de 2027, relativa a 2026,
segue o art. 72 até 31/12/2026. Isso é inferido: a revogação produz efeito em 01/01/2027, e o portal pode tratar a entrega de
mar/2027 de outro modo. Não verificado.)

---

## 6. Anexo XX: o excesso de ISS inclui o IBS? E 14,92537% × 14,93% — **RESOLVIDA**

**Resposta:** **sim, o IBS recebe parte do excesso.** A LC 123 art. 18 § 1º-B I (incluído pela LC 227) e a Res. 140 art. 21 III
(red. Res. 190) mandam a diferença aos "tributos federais **e IBS**". A tabela do Anexo XX/Anexo III de 2027–28 dá ao IBS
"(Alíquota efetiva − 5%) × 0,26%". A soma 6,02 + 5,26 + 23,20 + 65,26 + 0,26 dá 100,00. A nota (*) de 2027–28 ainda diz só
"tributos federais", e isso é resíduo de redação: a lei e a resolução prevalecem e a própria tabela traz o IBS.
**14,92537% × 14,93%:** o limiar exato é 5% ÷ 33,50% = 14,925373…%. O "14,93%" do rótulo da linha 2027–28 é arredondamento
do mesmo número. A anomalia aparece igual na LC 214 Anexo XX (red. LC 227) e na Res. 190 Anexo III; nas vigências de 2029 em
diante, ambas usam 14,92537%. **Use 14,92537%.**
**Citações:** LC 123 art. 18 § 1º-B I (LC 227): *"transferindo-se eventual diferença, de forma proporcional, aos tributos
federais e IBS da mesma faixa de receita bruta anual"*. Res. 190 Anexo III: *"5ª Faixa, com alíquota efetiva superior a
14,93% … (Alíquota efetiva - 5%) x 0,26%"* [IBS].
**URL:** lcp214.htm (art. 517 e Anexo XX); `…/ato/152832/anexo/85771`. Acesso em 10/10/2026. **Grau:** verificado (o
cálculo do limiar é aritmética).

---

## 7. LC 123 art. 18 §§ 5º-C, 5º-I, § 4º V e art. 13-A com IBS — **RESOLVIDA**

**Resposta:**
- **§ 4º V** (red. LC 147, não reescrito pela LC 214): locação de bens móveis vai para o **Anexo III, deduzido o ISS**.
- **§ 5º-C:** Anexo IV (construção, vigilância/limpeza/conservação, advocacia), com a **CPP fora do DAS**.
- **§ 5º-I:** Anexo V (atividades intelectuais e técnicas), que vai ao Anexo III com fator r ≥ 28% (§ 5º-J).
- Nenhuma das listas nomeia cabeleireiro, estética ou massagem, o que confirma o PRE-ADR.
- **Art. 13-A (2027):** o sublimite de R$ 3,6 mi passa a valer **também para o IBS** (Res. 140 art. 9º e art. 12, red.
  Res. 190, iguais).
**Citações:** § 4º V: *"locação de bens móveis, que serão tributadas na forma do Anexo III desta Lei Complementar, deduzida
a parcela correspondente ao ISS"*. Art. 13-A (LC 214 art. 517): *"Para efeito de recolhimento do ICMS, do ISS e do IBS no
Simples Nacional, o limite máximo […] será de R$ 3.600.000,00"*.
**URL:** lcp123.htm; lcp214.htm art. 517; `…/ato/152832`. Acesso em 10/10/2026. **Grau:** verificado.

---

## 8. Res. 140 art. 106 § 1º — **RESOLVIDA** (com achado que muda o PR-4)

**Resposta (até 31/12/2026):** o MEI fica dispensado de: I. escrituração dos livros fiscais e contábeis; II. Declaração
Eletrônica de Serviços; III. documento fiscal eletrônico de operação com ICMS, salvo exigência do ente; IV. outro documento
municipal de ISS quando emitiu a NFS-e nacional.
**A partir de 01/01/2027 (Res. 190):** o inciso III é revogado e entra o **V**, que dispensa o MEI de *"destacar os valores de
IBS e CBS"*. O caput do art. 106 passa a ser *"O MEI deverá emitir os documentos fiscais nas vendas e nas prestações de
serviços realizadas."* Os incisos I e II (dispensa para pessoa física) e o **art. 106-A § 2º** (NFS-e facultativa para PF) são
revogados. A base legal é a LC 123 art. 26 § 6º II, reescrita pela LC 214 art. 517: *"será obrigatória a emissão de documento
fiscal nas vendas e nas prestações de serviços realizadas pelo MEI."*
**URL:** `…/ato/92278`; `…/ato/152832` (art. 1º e art. 8º XXIX–XXX); lcp214.htm art. 517. Acesso em 10/10/2026.
**Grau:** verificado.
**Consequência para o repo:** a "Conclusão 3a" da `PESQUISA-X14-PR4-LACUNAS-2026-10-09.md` vale **só até 31/12/2026**. A
frase *"§§ 1º e 6º não mudam"* está **errada**: a LC 214 reescreve o § 1º e o § 6º II. A partir de 2027, a divergência
NFS-e × receita do MEI volta a ser comparável contra **toda** a receita de serviço.

---

## 9. PLP 108/2021 (limite do MEI) — **RESOLVIDA** (situação)

**Resposta:** o projeto **não foi aprovado**. Está na Câmara em regime de urgência (aprovada em 17/03/2026), aguardando o
parecer do relator (Dep. Jorge Goetten) na Comissão Especial instalada em 16/04/2026. Último andamento: 24/08/2026,
REQ 4105 e 4106/2026 (pauta e apensação do PLP 186/2026). Proposta: MEI até R$ 130.000,00 e até 2 empregados. **Limite
vigente:** R$ 81.000,00 (LC 123 art. 18-A § 1º, red. LC 155/2016). Para o TAC: R$ 251.600,00 (art. 18-F I).
**Citação:** ementa: *"receita bruta anual de até R$ 130.000,00"*; LC 123 art. 18-A § 1º: *"de até R$ 81.000,00 (oitenta e um
mil reais)"*.
**URL:** ficha da Câmara (WebFetch, resumida por modelo) + lcp123.htm. Acesso em 10/10/2026.
**Grau:** verificado. A ficha foi lida por resumo automático; o limite vigente foi lido no texto.

---

## 10. Manual do PGDAS-D e da DEFIS: existência e versão — **RESOLVIDA**

**Resposta:** existe. A versão vigente é a de **17/06/2025**, na URL `…/MANUAL_PGDAS-D_2018_V4.pdf`, e o sha baixado hoje
(`e73b2bfc7ede…`) é igual ao do corpus. **Não há** manual com IBS/CBS ou com a regra de 2027 nessa URL. O manual ainda descreve a
opção pelo regime de caixa (item 5.1) e a DEFIS.
**Citação:** capa: *"Versão - 17 de junho de 2025"*.
**Grau:** verificado na URL do corpus. Ausência de versão mais nova é **inferida**: não achei outro índice de manuais no
portal.

---

## 11. F-PI-2v (o PGDAS-D eleva o ISS a 2%, como piso absoluto?) e LC 116 art. 8º-A × 8º-B — **PARCIAL**

**O que a fonte diz:**
- LC 116 art. 8º-A: a alíquota mínima é 2%; o § 1º proíbe benefício que resulte em carga menor que 2%, salvo os subitens
  7.02, 7.05 e 16.01.
- Res. 140 art. 31 p.ú.: no Simples, o piso aparece como limite **aos benefícios** (*"os benefícios de que tratam os incisos I
  e II do caput não poderão resultar em percentual menor do que 2%"*).
- **Manual PGDAS-D, itens 6.6.8/6.6.9:** a isenção de ISS não é aceita, e a **redução é limitada a 60%**. *"o percentual efetivo
  de ISS não pode ser inferior a 2% e poderá ser objeto de concessão de redução até o limite máximo de 60%"*.
- O manual **não diz** que o sistema eleva a 2% um percentual de tabela abaixo disso. O mecanismo descrito é um teto no
  percentual de redução (60% = 5% → 2%), e não um `max(·, 2%)`.
- **LC 116 art. 8º-B:** de 2029 a 2032, as alíquotas municipais vigentes em 31/12/2028 caem 10/20/30/40%, e os benefícios caem
  na mesma proporção (§§ 1º–3º). O texto **não menciona** o art. 8º-A.
- No Simples, o efeito do 8º-B já está embutido nas partilhas da Res. 190/LC 214 (ISS do Anexo III, 1ª faixa:
  33,50 → 30,15 → 26,80 → 23,45 → 20,10%, ou seja 33,50 × 0,9/0,8/0,7/0,6). Isso é verificado por aritmética.

**Inferido:** o PGDAS-D não aplica um piso absoluto de 2%. Um percentual de tabela abaixo de 2% (ex.: 1,92%) com redução
municipal ≤ 60% pode dar ISS efetivo abaixo de 2%, porque o sistema só limita o percentual de redução. Isso sustenta a
recomendação (a) `min(tabela, max(reduzido, 2%))` só na parte "nunca acima da tabela". A regra exata do sistema não está
escrita.
**Perguntas reformuladas:**
- 11-a (contador): *"Pelo Manual do PGDAS-D (versão de 17/06/2025, itens 6.6.8–6.6.9) e pela Res. CGSN 140 art. 31 p.ú.,
  entendemos que o PGDAS-D não eleva o ISS a 2% quando o percentual efetivo da tabela já fica abaixo de 2%; ele só bloqueia
  a isenção e limita a redução municipal a 60%. Confirma, pelo que você vê no sistema? Se não, qual norma ou tela diz
  diferente?"*
- 11-b (advogado): *"Pela LC 116 art. 8º-B, entendemos que a redução de 2029–2032 alcança as alíquotas e os benefícios
  municipais, mas não reduz o mínimo de 2% do art. 8º-A, que fica inalterado por falta de menção. Confirma? Se não, qual
  norma diz que o piso também cai?"*
**URL:** lcp116.htm; manual PGDAS-D; `…/ato/92278` (art. 31). Acesso em 10/10/2026.

---

## 12. SEST/SENAT do TAC fora do DAS-MEI? — **PARCIAL**

**O que a fonte diz:** o art. 18-F da LC 123 (TAC-MEI) fixa só o limite de R$ 251.600 e a contribuição de 12% sobre o
salário-mínimo. Não há SEST/SENAT no art. 18-F, no art. 101 da Res. 140, na Res. 190 nem no Anexo XIII (busca por
"SEST", "SENAT" e "8.706": zero ocorrências). A LC 123 art. 13 § 3º dispensa o optante das contribuições a serviços sociais
autônomos: *"ficam dispensadas do pagamento das demais contribuições instituídas pela União, inclusive as contribuições para
as entidades privadas de serviço social e de formação profissional […] e demais entidades de serviço social autônomo."*
**Não lido:** Lei 8.706/1993 art. 7º (a URL do Planalto deu "conteúdo não encontrado").
**Inferido:** o SEST/SENAT não entra no DAS-MEI. Se cabe cobrá-lo à parte do TAC-MEI, como contribuinte individual
pessoa física, é a dúvida aberta.
**Pergunta reformulada (contador):** *"Pela LC 123 art. 13 § 3º e art. 18-F, entendemos que o TAC inscrito como MEI não
recolhe SEST/SENAT, nem no DAS-MEI nem em guia própria, e que o tomador não retém essa contribuição sobre o frete pago ao
TAC-MEI. Confirma? Se não, qual norma (Lei 8.706/1993 art. 7º? IN RFB?) diz diferente?"*
**URL:** lcp123.htm; `…/ato/92278`; `…/ato/152832`. Acesso em 10/10/2026.

---

## 13. Base do DAS no regime de caixa (Res. 140 arts. 16–20; X14) — **PARCIAL**

**O que a fonte diz (2026):**
- art. 16: a base é a receita *"recebida (Regime de Caixa)"*.
- art. 19 p.ú.: o caixa vale *"exclusivamente para a apuração da base de cálculo mensal"*, e a competência vale para
  limites, sublimites e alíquota (RBT12).
- art. 20 I: a parcela não vencida entra obrigatoriamente na base *"até o último mês do ano-calendário subsequente"*.
- art. 20 II: a receita auferida e não recebida entra no encerramento, na exclusão e *"b) retorno ao Regime de Competência,
  no último mês de vigência do Regime de Caixa"*.
- art. 2º § 9º: o valor recebido adiantadamente segue o § 8º, *"ainda que no regime de caixa"*.
- Os arts. 19, 20, 77 e 78 são revogados a partir de 01/01/2027 (Res. 190 art. 8º XII e XXIII).

**Inferido:** quem optou por caixa em 2026 deve oferecer, no PA de **dezembro/2026**, toda a receita auferida e ainda não
recebida (art. 20 II "b"), porque 2027 força a competência. A Res. 190 não traz regra de transição própria (busca por
"caixa" no texto da 190: só as revogações).
**Pergunta reformulada (contador):** *"Pela Res. CGSN 140 art. 20 II 'b' (vigente até 31/12/2026) e pela revogação dos
arts. 19–20 pela Res. 190, entendemos que o optante pelo caixa em 2026 inclui no PA de dezembro/2026 todos os valores a
receber de 2026 ainda não recebidos, e não os tributa de novo em 2027 quando os receber. Confirma? Se não, qual norma ou
orientação da RFB diz diferente?"*
**URL:** `…/ato/92278`; `…/ato/152832`. Acesso em 10/10/2026.

---

## 14. PE-3: a receita de pacote vencido entra na receita bruta do PGDAS-D? Em qual anexo? — **PARCIAL**

Regra do dono, 07/10: "decide-se pela lei". A lei fixa o momento do reconhecimento, mas **não nomeia** o pacote vencido.

**O que a fonte diz:**
- **2026:** Res. 140 art. 2º II (red. Res. 183, vigente desde 01/01/2026, espelha a LC 123 art. 3º § 1º red. LC 214): a
  receita bruta inclui *"as demais receitas da atividade ou objeto principal"*. O § 8º reconhece a receita *"quando do
  faturamento, da entrega do bem ou do direito ou à proporção em que os serviços forem efetivamente prestados, o que primeiro
  ocorrer"*; o § 9º estende isso aos *"valores recebidos adiantadamente"*. O § 5º V exclui *"multa ou indenização por
  rescisão contratual, desde que não corresponda à parte executada do contrato"*.
- **2027:** Res. 140 art. 2º § 8º (red. Res. 190): *"consideram-se auferidas no momento do faturamento"*. § 9º-A: faturamento
  = *"a emissão de documento fiscal"*. § 3º-A e LC 123 art. 3º § 1º-A (LC 214): a receita bruta compreende operações com bens
  materiais ou imateriais, inclusive direitos, ou com serviços.

**Inferido:**
- (i) Se a NFS-e do pacote é emitida **na venda**, toda a receita já entrou no PGDAS-D naquele mês, e o vencimento não gera
  nova receita no Simples.
- (ii) Se a nota sai por sessão, o saldo vencido é "receita da atividade" (art. 2º II) e entra em 2026 no mês do vencimento.
  O anexo seria o do serviço, Anexo III (cabeleireiro e estética pela regra residual), e não há segregação própria.
- (iii) Em 2027, sem documento fiscal não há "faturamento" pelo § 9º-A, e daí sai a dúvida de quando o saldo é auferido.
- O § 5º V (indenização por rescisão) é a leitura contrária possível, mas o vencimento por prazo não é rescisão.

**Pergunta reformulada (contador; se houver dúvida, consulta à RFB):** *"Pela Res. CGSN 140 art. 2º II e §§ 8º–9º (2026) e
§§ 8º, 9º e 9º-A (red. Res. 190, 2027), entendemos que: (a) o saldo de pacote pré-pago não usufruído e vencido é receita
bruta da atividade, tributada no Anexo III no mês do vencimento quando a NFS-e não foi emitida na venda; (b) não se aplica o
art. 2º § 5º V (indenização por rescisão); (c) em 2027, emite-se NFS-e do saldo vencido para materializar o 'faturamento' do
§ 9º-A. Confirma os três? Se não, qual norma diz diferente?"*
**URL:** `…/ato/92278`; `…/ato/152832`; lcp214.htm art. 517. Acesso em 10/10/2026.

---

## 15. ENC §6-7: a receita financeira fica fora da receita bruta do Simples? — **RESOLVIDA** (com uma sub-dúvida para 2027)

**Resposta:** **sim, para rendimento de aplicação financeira.** A Res. 140 art. 2º § 5º VII (texto atual, repetido pela
Res. 190 em 2027) exclui da receita bruta *"os rendimentos ou ganhos líquidos auferidos em aplicações de renda fixa ou
variável"*. A LC 123 art. 3º § 1º limita "demais receitas" às *"da atividade ou objeto principal"*. Em 2026, os juros e
multas de mora também ficam fora (§ 5º II).
**Sub-dúvida 2027:** a Res. 190 acrescenta ao § 4º (compõem a receita bruta) o inciso *"VI- juros, multas, acréscimos e
encargos"* e não revoga o § 5º II (juros moratórios não compõem). A tensão está no próprio texto.
**Pergunta reformulada (contador):** *"Pela Res. CGSN 140 art. 2º § 4º VI (red. Res. 190, 2027) e § 5º II (mantido),
entendemos que, em 2027, os juros e encargos embutidos no preço ou na venda a prazo compõem a receita bruta, e os juros e
multas de mora por atraso continuam fora. Confirma? Se não, qual norma diz diferente?"*
**URL:** `…/ato/92278`; `…/ato/152832`. Acesso em 10/10/2026. **Grau:** verificado (exclusão das aplicações); a sub-dúvida
é leitura do texto.

---

## 16. `pTotTribSN` (E0713 do leiaute da DPS): semântica — **RESOLVIDA**

**Resposta:** é o *"Valor percentual aproximado do total dos tributos da alíquota do Simples Nacional (%)"*, ou seja, o campo
da Lei 12.741/2012 ("De Olho no Imposto") para o optante. **Proibido para não optante (E0713) e para MEI.** O Decreto
8.264/2014 art. 9º deixa a ME/EPP informar *"apenas a alíquota a que se encontram sujeitas nos termos do referido regime,
desde que acrescida de percentual ou valor nominal estimado a título de IPI, substituição tributária e outra incidência
tributária anterior monofásica"*. Para o MEI, a informação é facultativa (art. 8º).
**Inferido:** a "alíquota a que se encontram sujeitas" é a **alíquota efetiva** do mês (LC 123 art. 18), e não a nominal.
Assim, o cálculo do PGDAS-D pode alimentar o campo, o que responde ao item 13 do PRE-ADR. O valor tem *"caráter meramente
informativo"* (Dec. 8.264 art. 6º).
**URL:** Anexo I v1.01 (gov.br/nfse, sha `de5bc492959e`); `planalto.gov.br/.../d8264.htm`. Acesso em 10/10/2026.
**Grau:** verificado (definição do campo, regra E0713, Decreto); inferido (efetiva × nominal).

---

## Achados colaterais (fora da lista, mas mudam documentos do repo)

1. **MANIFEST de `fontes-oficiais/`:** a linha `res-cgsn-140-2018` diz que a compilação *"vai até a Res. CGSN 183/2025 — a
   191/2026 NAO esta compilada"*. É falso para o próprio arquivo (sha `8d9b024965c1`): ele contém as anotações das Res. 184,
   187, 190 e 191, verificado hoje no histórico do JSON. O PRE-ADR do Simples repete o erro.
2. **PESQUISA-X14-PR4 §3a** (*"§§ 1º e 6º não mudam"*): errado. Ver § 8.
3. **Prazos de opção para 2027** (Res. 186, red. Res. 194):
   - Simples: de 01/09 a **15/10/2026**;
   - IBS/CBS pelo regime regular (jan–jun/2027): até **30/10/2026**;
   - cancelamento: de 03/11 a 20/12/2026;
   - regularização de pendência: até 30/10/2026.
   Se algum cliente-piloto ainda não for optante, isso é decisão de dias.
4. **Res. 190 art. 144-D/144-E:** quem entra no Simples em 01/01/2027 (ou sai do SIMEI em 2026) confirma as receitas
   de dez/2025 a nov/2026 até **20/12/2026** e a de dez/2026 até 20/01/2027, no módulo "Receitas Anteriores à Opção".
5. **Res. 140 art. 2º § 9º-A (2027):** *"considera-se faturamento: I - a emissão de documento fiscal"*. O reconhecimento da
   receita no Simples passa a seguir a nota emitida. Isso toca o PE-3 e qualquer venda antecipada.

## Grau e limites desta pesquisa
- **Verificado:** todo trecho entre aspas foi lido no texto baixado (API Normas/RFB, Planalto, PDF do CGIBS, xlsx do
  gov.br/nfse, PDF do manual).
- **Inferido:** marcado em cada item.
- **Secundário:** Fenacon e boletins municipais (Guarulhos, Jundiaí) entraram só como pista no item 1, caso 4. A ficha do
  PLP 108 foi lida por resumo automático.
- **Não lido:** Lei 8.706/1993 (URL do Planalto falhou); o texto do RIBS/RCBS art. 112 (Decreto 12.955/2026, Res. CGIBS
  6/2026), citado pelo Ato 4; o portal de manuais do Simples além da URL do corpus.
- **Varredura da API Normas:** cobre os ids que respondem à visão `multivigente`. Ato que só tenha outra visão escaparia,
  mas os 11 atos CGSN de 2025–26 achados batem com a sequência numérica 184–194, sem buraco.
