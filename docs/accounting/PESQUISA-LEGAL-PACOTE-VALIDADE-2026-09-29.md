# Pesquisa legal — pendências externas PE-1..PE-6 do BE-INCR-PACOTE-VALIDADE (29/09/2026)

> **Pedido do dono (chat, 29/09):** *"Pesquise as leis das pendências externas"*, referindo-se ao §6 de
> [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md).
> **Isto é pesquisa, não decisão, e não substitui o contador nem o jurídico.** O que a norma diz vai
> transcrito. O que eu deduzo dela vai marcado como inferência, para o contador poder discordar do passo.

**Graus:**
- **V**: texto lido nesta sessão, na fonte oficial (Planalto, CVM, Câmara, RFB) ou no corpus do repo.
- **V-r**: texto lido numa reprodução não oficial (LegisWeb, Normas Legais). Tem de ser conferido no DOU antes de citar em ADR.
- **S**: fonte secundária (notícia, artigo). Serve de indício, não de prova.
- **I**: inferência minha a partir do texto.
- **NL**: procurei e não localizei. Não quer dizer que não exista.

## 0. Resumo: o que muda no BRIEF

| PE | O que a norma diz (fonte) | O que continua com o contador ou o jurídico | Efeito no BRIEF |
|---|---|---|---|
| **PE-1** contábil | O CPC 47 B46 tem **dois caminhos** para o valor que o cliente não usa: (i) reconhecer **proporcionalmente ao uso**, se a entidade espera ficar com esse valor; (ii) reconhecer quando o uso ficar **remoto**. A norma de microentidade (NBC TG 1002, até R$ 4,8 mi) **não trata** do assunto. O item 23.7 dela permite reconhecer a receita **na emissão da nota** | Qual norma a empresa segue. Se o histórico de não uso obriga ao método proporcional. Se a microentidade que emite a NFS-e na venda do pacote pode dispensar o passivo 2.1.1 | A decisão do dono ("vence → receita") é o caminho (ii). O caminho (i) mudaria o produto (estimativa + reconhecimento no consumo). **Pergunta nova (PE-1 iv):** a NBC TG 1002, item 23.7, pode tornar o diferimento inteiro opcional |
| **PE-2** Presumido | A receita bruta inclui "as receitas da atividade ou objeto principal" (DL 1.598 art. 12 IV). Nesse caso a presunção é de 32% (Lei 9.249 art. 15 § 1º III a) e incide PIS/Cofins cumulativo (Lei 9.718 art. 3º). Se a receita for "demais receitas", entra em 100% no IRPJ/CSLL (Lei 9.430 art. 25 II) | Enquadrar a receita por não uso no inciso IV (32%) ou em "demais receitas" (100%). **Não localizei** solução de consulta da RFB sobre isso | Nenhuma mudança de desenho. A resposta decide se a conta 3.4 entra em `PRESUNCAO_ACCOUNT_CODES` |
| **PE-3** Simples (1º cliente) | Desde 2025, a receita bruta do Simples inclui "as demais receitas da atividade ou objeto principal" (LC 123 art. 3º § 1º, redação da LC 214). **A partir de 01/01/2027**, a receita de serviço é **auferida no faturamento**, que é a **emissão do documento fiscal**, inclusive para valor recebido adiantado (Res. CGSN 190/2026). O regime de caixa acaba | Com `pacoteFatoGerador = VENDA`, a NFS-e já leva o pacote inteiro à receita na venda. Com `CONSUMO`, falta saber se o valor vencido é receita do Simples e com qual documento | **Achado fora do escopo do BRIEF:** a partir de 2027 o F-DFE 5c (VENDA × CONSUMO) passa a decidir **quando** o Simples tributa. Isso é insumo do PRE-ADR do Simples |
| **PE-4** ISS | O fato gerador do ISS é a **prestação** do serviço, e a base é o preço do serviço (LC 116 arts. 1º e 7º; itens 6.01/6.02 da lista) | (I) Em `CONSUMO`, o valor vencido não teve prestação, e pela letra da lei não há fato gerador. Em `VENDA`, o ISS já foi pago na nota da venda. Para o Simples, o ISS está dentro do DAS e segue o PE-3 | F-PV-9 (a) mantido |
| **PE-5** IBS/CBS | **O regulamento da CBS existe:** Decreto 12.955/2026, publicado no DOU de 30/04/2026. O art. 11 § 6º diz que, se o fornecimento pago antecipadamente não ocorrer, aplica-se o art. 57. O art. 57 § 1º II define "cancelamento de operação" como "desfazimento de operação antes do fornecimento" | **O ponto de interpretação:** vencer o pacote sem uso é um "desfazimento"? Leitura (a): sim, e o débito da antecipação é estornado. Leitura (b): não, porque o contrato não se desfaz, e a antecipação vira definitiva | **Errata no corpus:** a transcrição da LC 214 diz que "o regulamento ainda não existe". Para a CBS, ele existe desde 30/04/2026 |
| **PE-6** consumidor | **Não localizei lei** (federal ou de SP) sobre validade de crédito pré-pago de serviço. Valem as regras gerais: CDC arts. 6º III, 46, 51 IV e § 1º, 54 § 4º, e CC arts. 132, 211 e 884. Pelo CC art. 132 § 1º, **se o vencimento cai em feriado, o prazo vai para o dia útil seguinte**, "salvo disposição convencional em contrário" | Se a cláusula de validade é abusiva e qual prazo mínimo é razoável. Como redigir a cláusula para afastar o § 1º | **Sub-ponto novo no F-PV-1** (feriado). O F-PV-3 (a) (sem retroatividade) ganha apoio no CDC art. 46 |

## 1. PE-1: tratamento contábil do vencido

### 1.1 CPC 47: direitos não exercidos (breakage) — V

Fonte: *CPC 47, Receita de Contrato com Cliente*, versão Rev. 14 hospedada pela CVM
(`conteudo.cvm.gov.br/.../CPC_47_Rev_14.pdf`). Lido em 29/09/2026: 582.026 bytes, sha256
`c2a1b53f102830dd6dad4134db5b02a62f05e3aa6d9bb5c70be392e0a550e03e`. O PDF **não foi commitado**.

| Item | Conteúdo (paráfrase; trecho literal curto entre aspas) |
|---|---|
| 106 | Pagamento recebido antes de transferir o serviço vira **passivo de contrato** |
| B44 | No pré-pagamento, reconhece-se o passivo de contrato. Ele é baixado, e a receita reconhecida, quando o serviço é transferido |
| B45 | Os clientes podem não exercer todos os direitos. O CPC chama isso de "quebra" |
| **B46** | Se a entidade **espera ter direito** ao valor da quebra, reconhece a quebra esperada como receita "proporcionalmente ao padrão de direitos exercidos pelo cliente". Se **não espera**, reconhece quando a probabilidade de o cliente exercer os direitos restantes ficar **remota**. A decisão observa os itens 56 a 58 (restrição a estimativas de contraprestação variável) |
| B47 | Se a lei obriga a entregar o valor não reclamado a um terceiro (ex.: governo), é passivo, não receita |

**Leitura (I):**
- A decisão 18 do dono (o vencido vira receita no vencimento) cabe no **2º ramo do B46**: com prazo contratual, o uso fica remoto no vencimento.
- Se o salão tiver histórico que permita **esperar** a quebra, o CPC 47 manda o **1º ramo**: receita proporcional ao consumo, antes do vencimento. Isso exigiria estimativa e mudaria o lançamento do consumo, não só o do vencimento.
- Não pesquisei se existe no Brasil lei de "propriedade não reclamada" que atraia o B47. Hoje ele é tratado como inaplicável, mas sem verificação.

### 1.2 Qual norma a empresa segue — V-r / S

- **NBC TG 1002, Contabilidade para Microentidades** (CFC, 18/11/2021), lida na reprodução do LegisWeb (V-r):
  - Alcance, item P2: "organizações com finalidade de lucros, com receita bruta até R$ 4.800.000,00 (…) por ano".
  - Vigência: exercícios iniciados a partir de 01/01/2023.
  - Item 23.5: "A receita de prestação de serviços deve ser apropriada quando da transferência dos serviços ou dos seus benefícios ao cliente."
  - **Item 23.7:** "O mais comum é a microentidade atender aos requisitos desta seção contabilizando a receita conforme a emissão da nota fiscal. Quando essa prática produzir demonstrações contábeis que representem adequadamente a posição patrimonial e o desempenho da microentidade, poderá ser utilizada (…)".
  - Pela leitura do LegisWeb, **não há** item sobre adiantamento de cliente ou direito não exercido.
- **CPC PME / NBC TG 1000.** A 3ª edição da IFRS para PMEs traz uma Seção 23 baseada na IFRS 15, com vigência internacional em 01/01/2027 (S). **Não localizei** a adoção brasileira (CPC PME revisado / NBC TG 1000 R2) (NL).
- **IN RFB 1.700/2017 art. 26 §§ 6º–10** (V, corpus). Se o procedimento contábil der receita, ou momento de receita, diferente da lei tributária, a diferença vai para uma **conta de ajuste da receita bruta**. O § 10 II aplica isso expressamente aos procedimentos do CPC 47. A ECF já tem as linhas "CPC 47 – Ajustes de Receita Bruta" (`BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md:784-786`).

**Pergunta nova para o contador (PE-1 iv), de leitura minha (I):** com o item 23.7 da NBC TG 1002, uma
microentidade que emite a NFS-e **na venda do pacote** (`pacoteFatoGerador = VENDA`) pode reconhecer a receita
na venda, **sem passivo 2.1.1**. Nesse caso a receita por não uso deixa de existir para ela. O produto hoje
difere sempre (`SalePackageSoldMapper`). Se o contador aceitar o 23.7, o diferimento vira uma opção por tenant.
Isso é frente nova, fora deste BRIEF.

## 2. PE-2: Lucro Presumido (e Real)

Textos lidos no Planalto (versão compilada, 29/09/2026). Todos V:

- **DL 1.598/1977 art. 12** (redação da Lei 12.973/2014): "A receita bruta compreende: I - o produto da venda de bens nas operações de conta própria; II - o preço da prestação de serviços em geral; III - o resultado auferido nas operações de conta alheia; e **IV - as receitas da atividade ou objeto principal da pessoa jurídica não compreendidas nos incisos I a III.**"
- **Lei 9.249/1995 art. 15 § 1º III a:** 32% para "prestação de serviços em geral" (exceções hospitalares). **Art. 20 I** (redação da LC 167/2019): 32% para a CSLL das mesmas atividades.
- **Lei 9.430/1996 art. 25 II:** somam-se ao lucro presumido "os ganhos de capital, os rendimentos e ganhos líquidos auferidos em aplicações financeiras, **as demais receitas**, os resultados positivos decorrentes de receitas não abrangidas pelo inciso I (…)". Na prática, 100% da receita entra na base.
- **Lei 9.718/1998 art. 3º** (redação da Lei 12.973): o faturamento do PIS/Cofins cumulativo "compreende a receita bruta de que trata o art. 12 do Decreto-Lei nº 1.598". Os dois tributos são revogados a partir de 01/01/2027 (LC 214 arts. 542 e 544 III).
- **IN RFB 1.700/2017** (V, corpus): art. 26 reproduz o art. 12; art. 215 § 3º I, "demais receitas"; **art. 223 § 2º** (Presumido no regime de caixa): "Os valores recebidos adiantadamente, por conta de venda de bens ou direitos ou de prestação de serviços, serão computados como receita do mês em que se der o faturamento, a entrega do bem ou do direito ou a conclusão dos serviços, o que primeiro ocorrer."

**Leitura (I):**
- A receita por não uso de pacote de serviço tende a ser "receita da atividade ou objeto principal" (art. 12 IV): ela nasce do contrato de serviço, que é o objeto social. Então seria receita bruta, com presunção de 32% e PIS/Cofins cumulativo até 2026.
- A leitura contrária ("demais receitas", 100%) existe porque o valor não é "preço da prestação" (não houve prestação).
- **Não localizei** solução de consulta da Cosit específica (2 buscas: vale-presente vencido, crédito não utilizado) (NL).

**Nota (S):** a LC 224/2025 majorou em 10% os percentuais de presunção sobre a parcela da receita bruta anual
acima de R$ 5 mi. A leitura veio de fonte secundária, e há liminares contestando. Não pesa para o salão
abaixo desse limite.

## 3. PE-3: Simples Nacional (1º cliente)

- **LC 123/2006 art. 3º § 1º** (V, Planalto), redação da LC 214/2025, com efeitos **desde 01/01/2025** (LC 214 art. 544 II, que alcança o art. 516): "Considera-se receita bruta (…) o produto da venda de bens e serviços nas operações de conta própria, o preço dos serviços prestados, o resultado nas operações em conta alheia **e as demais receitas da atividade ou objeto principal** das microempresas ou das empresas de pequeno porte, não incluídas as vendas canceladas e os descontos incondicionais concedidos."
- **Resolução CGSN nº 190, de 04/08/2026** (DOU 10/08/2026; **efeitos a partir de 01/01/2027**, art. 9º) (V-r na Normas Legais + notícia oficial da RFB de 14/08/2026). Nova redação do art. 2º da Res. CGSN 140/2018:
  - "§ 8º As receitas decorrentes da venda de bens ou direitos ou da prestação de serviços consideram-se auferidas no momento do faturamento da operação, observado o disposto no § 9º-A."
  - "§ 9º Aplica-se o disposto no § 8º também na hipótese de **valores recebidos adiantadamente** e às vendas para entrega futura."
  - "§ 9º-A. Para fins do Simples Nacional, considera-se faturamento: I - **a emissão de documento fiscal** que formalize a operação de venda de bens ou direitos, a prestação de serviços, inclusive nas hipóteses de venda para entrega futura; e II - a emissão de documento fiscal que altere, complemente ou modifique os valores de documento fiscal anteriormente emitido (…)."
  - Segundo a notícia da RFB, **o regime de caixa deixa de existir** no Simples a partir de 2027.
  - A resolução cita um "LC 123 art. 3º § 1º-A" que **não localizei** no compilado do Planalto, na LC 214 art. 516 nem na LC 227/2026 (NL).
- Em 2026 continua valendo a Res. CGSN 140 com a opção competência/caixa (art. 16) (S; não reli o texto vigente).

**Leitura (I):**
- **A partir de 2027, no Simples, a nota fiscal decide o momento da receita.**
  - Com `pacoteFatoGerador = VENDA`, a NFS-e da venda leva o pacote inteiro à receita bruta na venda. O vencimento não muda nada no Simples.
  - Com `CONSUMO`, cada sessão tem a sua nota. O saldo vencido **nunca é faturado**. Ele não é "prestação de serviço" (o § 8º não o alcança), mas pode ser "demais receitas da atividade" (LC 123 art. 3º § 1º). O contador precisa dizer se entra no PGDAS-D, quando e com qual documento.
- **Consequência para o produto (fora deste BRIEF):** o fork 5c do BE-INCR-DFE (VENDA × CONSUMO, hoje com default
  `CONSUMO` e "pendente contador") passa a decidir, para o Simples, **quando** a receita é tributada. É insumo do
  PRE-ADR do Simples/MEI (decisão 8 de 29/09).

## 4. PE-4: ISS

- **LC 116/2003** (V, Planalto):
  - art. 1º: "tem como fato gerador a **prestação** de serviços constantes da lista anexa";
  - art. 7º: "A base de cálculo do imposto é o preço do serviço";
  - lista: 6.01 "Barbearia, cabeleireiros, manicuros, pedicuros e congêneres"; 6.02 "Esteticistas, tratamento de pele, depilação e congêneres".
- **São Paulo, Decreto 53.151/2012 (RISS)** art. 1º: o fato gerador é a prestação dos serviços da lista (V-r, LegisWeb). **Não localizei** no RISS a regra de quando emitir a NFS-e em caso de pagamento antecipado (NL).

**Leitura (I):**
- Em `CONSUMO`, a parte vencida **não teve prestação**, e pela letra da LC 116 não há fato gerador do ISS.
- Em `VENDA`, a NFS-e saiu na venda pelo valor cheio e o ISS foi pago. O salão fica com o dinheiro, então não se fala em recuperar o ISS.
- Para o 1º cliente (Simples), o ISS está no DAS, e o que vale é o PE-3.
- O F-PV-9 (a), nenhum documento fiscal no vencimento, fica **sustentado pela letra** para o ISS. O contador confirma.

## 5. PE-5: IBS/CBS

- **LC 214/2025 art. 10 §§ 4º–7º:** a transcrição do corpus (`TRANSCRICAO-LC214-art10-…`, com a errata de 29/09) confere com o Planalto relido em 29/09 (V).
- **LC 214 art. 47 § 8º** (redação da LC 227/2026) (V): "Na devolução e no cancelamento de operações em que o adquirente não seja contribuinte no regime regular, o fornecedor sujeito ao regime regular poderá apropriar créditos ou estornar débitos com base nos valores dos débitos incidentes na operação devolvida ou cancelada."
- **Decreto 12.955, de 29/04/2026, Regulamento da CBS** (DOU 30/04/2026) (V: Câmara, publicação original e texto atualizado, iguais nestes pontos):
  - **Art. 11 § 5º:** reproduz a antecipação do art. 10 § 4º da LC (débito na data de cada parcela; valor definitivo no fornecimento).
  - **Art. 11 § 6º:** "Na hipótese do § 5º, caso não ocorra o fornecimento a que se refere o pagamento, inclusive em decorrência de distrato, será observado o disposto no art. 57."
  - **Art. 57 § 1º:** "I - devolução de operação - desfazimento de operação após o fornecimento; e II - **cancelamento de operação - desfazimento de operação antes do fornecimento**."
  - **Art. 57 § 3º:** quando a operação cancelada não gera crédito para o adquirente (consumidor final), "deverá ser emitido documento fiscal no valor da operação (…) cancelada". Os efeitos são o estorno da parcela não extinta do débito e, para a parcela extinta, transferência, restabelecimento ou crédito. **§ 6º II:** no cancelamento, o documento é emitido pelo fornecedor.
  - **Art. 315** (programas de fidelidade, LC art. 219-A): a base é o valor dos pontos emitidos, deduzidos os resgates e os valores "ressarcidos por pontos não utilizados computados como receita". É um **análogo**, não uma regra do pacote.
  - A hipótese da janela de 5 dias (LC art. 10 § 7º) **não foi localizada** no decreto: a busca por "cinco dias" perto de antecipação deu 0 (NL).
- O regulamento do **IBS** (CGIBS) **não foi lido**. Segundo fonte secundária, foi publicado junto.

**Leitura (I), que é o núcleo da pergunta ao contador:**
- (a) O vencimento é "não ocorrer o fornecimento". Aplica-se o art. 57 (cancelamento): o fornecedor emite o documento de cancelamento e **estorna o débito da antecipação**. Resultado estranho: o dinheiro retido não sofre CBS.
- (b) O vencimento **não é desfazimento**: o contrato foi cumprido do lado do fornecedor, que ficou "disponível", e o cliente perdeu o direito. A antecipação vira definitiva. O art. 11 § 1º II, que trata da disponibilização de bem imaterial, "inclusive direito", é o apoio possível.
- Para o optante do Simples que fica no DAS (decisão 1 de 29/09), IBS/CBS seguem a receita do Simples (PE-3), não o art. 57.

## 6. PE-6: direito do consumidor

- **CDC, Lei 8.078/1990** (V, Planalto, versão compilada):
  - art. 6º III: "a informação adequada e clara sobre os diferentes produtos e serviços (…)";
  - **art. 46:** os contratos "não obrigarão os consumidores, se não lhes for dada a oportunidade de tomar conhecimento prévio de seu conteúdo (…)";
  - art. 47: interpretação mais favorável ao consumidor;
  - **art. 51 IV:** são nulas as cláusulas que "estabeleçam obrigações consideradas iníquas, abusivas, que coloquem o consumidor em desvantagem exagerada (…)";
  - § 1º do art. 51: presunção de vantagem exagerada (I a III);
  - **art. 54 § 4º:** "As cláusulas que implicarem limitação de direito do consumidor deverão ser redigidas com destaque (…)";
  - art. 39 V: "exigir do consumidor vantagem manifestamente excessiva".
- **Código Civil, Lei 10.406/2002** (V, Planalto):
  - **art. 132:** "Salvo disposição legal ou convencional em contrário, computam-se os prazos, excluído o dia do começo, e incluído o do vencimento."
  - **§ 1º:** "Se o dia do vencimento cair em feriado, considerar-se-á prorrogado o prazo até o seguinte dia útil."
  - § 3º: prazos em meses ou anos vencem no dia de igual número;
  - art. 211: decadência convencional;
  - art. 884: enriquecimento sem causa.
- **Lei específica:** não localizei lei federal nem de SP sobre validade de crédito pré-pago de serviço ou vale-presente (3 buscas) (NL).
- **Orientação e jurisprudência** (S, indício, não prova):
  - Defensoria Pública do PR (15/06/2022): o vale-presente pode ter validade se ela for informada com clareza antes da contratação.
  - Jurisprudência citada em buscas trata a expiração convencional informada como decadência convencional, não abusiva.
  - Telefonia: o STJ (presidência, 2013) suspendeu liminar do TRF1 e permitiu validade de crédito pré-pago de celular. É setor regulado, só analogia.
  - Um acórdão do TJSP sobre validade de pacote de estética foi achado, mas **não aberto**: o e-SAJ exige login/captcha, que não foi contornado (NL).

**Leitura (I) para o BRIEF:**
- **F-PV-1:** a contagem do BRIEF ("venda 01/03, N = 30 → usa até 31/03") bate com o caput do art. 132: exclui o dia da venda e inclui o do vencimento.
- O **§ 1º (feriado → próximo dia útil) não está coberto**. Há dois caminhos:
  - o contrato afasta o § 1º ("disposição convencional em contrário"), o que é tarefa do jurídico;
  - ou o produto precisa de calendário de feriados, que não existe hoje.
- **F-PV-3 (a)** (sem retroatividade): reforçado pelo CDC art. 46. Quem comprou sem a cláusula não está obrigado a ela.
- **F-PV-11:** o dever de informar é de **destaque** (art. 54 § 4º). Mora na tela de venda e no comprovante (nó de FE) e no texto da cláusula (jurídico).
- **Risco residual:** prazo curto demais pode cair no art. 51 IV. Não há prazo mínimo legal localizado, então o jurídico precisa dizer o que é razoável.

## 7. Erratas e achados para o corpus

1. `TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md` §2 diz que "o regulamento do § 7º (…) ainda não
   existe". O **regulamento da CBS existe** (Decreto 12.955/2026, DOU 30/04/2026) e regula a antecipação no art. 11. A hipótese dos 5 dias do § 7º **não foi localizada** nele. Registrado neste doc; a transcrição ganha uma linha de errata apontando para cá.
2. **Simples 2027** (Res. CGSN 190/2026): a receita vem da **emissão do documento fiscal**. Isso afeta o fork 5c do
   BE-INCR-DFE (VENDA × CONSUMO) e o PRE-ADR do Simples. Fica registrado, sem mudança de código.
3. **NBC TG 1002, item 23.7:** pode tornar o diferimento do pacote opcional para microentidades (PE-1 iv).

## Fontes (acessadas em 29/09/2026)

- CPC 47 Rev. 14, CVM: https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_47_Rev_14.pdf
- NBC TG 1002 (LegisWeb): https://www.legisweb.com.br/legislacao/?id=424024
- IFRS para PMEs, 3ª edição (S): https://jlscontabil.com.br/noticias/tecnicas/2026/08/14/terceira-edicao-da-ifrs-para-pmes-e-preparacao-contabil-para-2027.html
- DL 1.598/1977: https://www.planalto.gov.br/ccivil_03/decreto-lei/del1598.htm
- Lei 9.249/1995: https://www.planalto.gov.br/ccivil_03/leis/l9249.htm
- Lei 9.430/1996: https://www.planalto.gov.br/ccivil_03/leis/l9430.htm
- Lei 9.718/1998: https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm
- IN RFB 1.700/2017: corpus, `docs/accounting/fontes-oficiais/IN-RFB-1700-2017.txt`
- LC 224/2025 (S): https://documentacao.senior.com.br/exigenciaslegais/noticias/federal/2026/2026-01-07-federal-lei-complementar-n-224-2025-percentuais-de-presuncao-do-lucro-presumido-serao-majorados-em-10-para-empresas-que-faturam-mais-de-r-5-000-000-00/
- LC 123/2006: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm
- LC 214/2025: https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214.htm
- LC 227/2026: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm
- Res. CGSN 190/2026 (Normas Legais): https://www.normaslegais.com.br/legislacao/Resolucao-cgsn-190-2026.htm
- Notícia oficial da RFB, 14/08/2026: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/regime-de-caixa-deixa-de-ser-utilizado-na-apuracao-do-simples-nacional
- LC 116/2003: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
- Decreto SP 53.151/2012 (LegisWeb): https://www.legisweb.com.br/legislacao/?id=241434
- Decreto 12.955/2026, texto atualizado (Câmara): https://www2.camara.leg.br/legin/fed/decret/2026/decreto-12955-29-abril-2026-799019-normaatualizada-pe.html
- CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Código Civil: https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
- Defensoria Pública do PR (S): https://www.defensoriapublica.pr.def.br/Noticia/Vale-presente-tem-prazo-de-validade
- STJ, crédito de celular pré-pago (S): https://www.conjur.com.br/2013-nov-01/stj-libera-prazo-validade-creditos-celular-pre-pagos/
