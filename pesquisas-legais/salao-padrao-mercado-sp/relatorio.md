# Relatório de pesquisa legal — salao-padrao-mercado-sp

**Pergunta:** Valores padrão, com fonte citável e faixa, para o exemplo de salão pequeno em SP capital (F-SIM-6/7): insumo em % da receita, taxa média do cartão, rotatividade da equipe CLT, vale-transporte, equipamentos e pró-labore. Sem fonte, fica sem padrão.
**Aberto em:** 2026-11-24T01:39:28-03:00 · **Atualizado em:** 2026-11-24T02:29:36-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Este dossiê é uma **pesquisa de mercado**, não legal. Cada valor abaixo vem de fonte oficial citável e tem faixa. O que não tem
fonte fica **sem padrão**, com aviso. Fontes que o dono aceitou: Sebrae, IBGE, CCT e Banco Central. Fonte oficial fora dessa
lista entra como **candidata**, marcada, e não como padrão.

| Campo da página (v50) | Unidade do campo | Padrão proposto | Faixa | Fonte | Situação |
|---|---|---|---|---|---|
| Insumos do mês (`insumo`, `f_ins`) | R$ por mês | **7,2% da receita operacional líquida** | 7,2% a 9,4% | IBGE PAS 2023 [D06] | padrão |
| Taxa do cartão (`mdr`, `f_mdr`) | % da receita total | **MDR médio de 1,79%** sobre o que passa no cartão | 1,05% (débito) a 2,30% (crédito parcelado) | Banco Central, 2º tri de 2026 [D01] | MDR com padrão; **fração da receita no cartão sem padrão** |
| Rotatividade da equipe CLT (`rot`, `f_rot`) | % que sai por ano | **sem padrão** | — | nenhuma das fontes aceitas mede | sem padrão (candidata fora da lista na seção 4) |
| Vale-transporte por empregado (`vt`, `f_vt`) | R$ por mês | R$ 275,60 (2 × R$ 5,30 × 26 dias) | R$ 233,20 a R$ 551,20 | Prefeitura de SP, tarifa de 2026 [D09] | padrão (fonte aceita pelo dono, chat, 24/11/2026: "Sim, aceitar") |
| Equipamentos (lista `bens`: valor e vida útil) | R$ por bem | compra anual de máquinas, equipamentos e móveis = **1,5% da receita líquida** | 1,5% a 5,7% por ano | IBGE PAS 2023 [D06] | padrão como ordem de grandeza (I) |
| Pró-labore dos sócios (`pl`, `f_pl`) | R$ por mês, total | **R$ 1.621 por sócio por mês**, o salário mínimo de 2026, porque o dado da PAS fica abaixo dele | R$ 1.621 a R$ 5.635 por sócio (PAS 2023: R$ 1.527 a R$ 5.635) | IBGE PAS 2023 [D06]; Decreto 12.797/2025 art. 1º [D10] | padrão |

**Insumo (grau: verificado no dado; a escolha do padrão é inferida).** A PAS 2023 do IBGE publica o detalhe da atividade
"Cabeleireiros e outros serviços de tratamento de beleza" **só para empresas com 20 ou mais pessoas ocupadas**. As menores
entram apenas no total de "Serviços pessoais" [D06, notas das Tabelas 5, 6 e 11]. Os dois pontos dão a faixa:
- **salões com 20+ pessoas:** "Mercadorias, materiais de consumo e de reposição" de R$ 145,8 mi, sobre receita operacional
  líquida de R$ 2.014,8 mi, dá **7,24%** [D06, Tabelas 6 e 5]. Sobre a receita bruta de serviços (R$ 2.390,9 mi), dá 6,10%;
- **serviços pessoais, todos os portes:** R$ 2.438,5 mi sobre R$ 25.900,6 mi dá **9,41%** [D06]. São 57.320 empresas com 4,4
  pessoas em média, o que fica perto do porte do exemplo. O agregado, porém, mistura salões com lavanderias e outros serviços
  pessoais.

O padrão de 7,2% é o único número do próprio setor. A coluna inclui material de consumo que não é insumo do serviço (limpeza,
escritório), então o 7,2% é teto do "insumo puro" dessa amostra, e não piso (I). Com a receita do exemplo (R$ 40.000 de
serviço), dá cerca de R$ 2.900 por mês.

**Taxa do cartão (verificado).** Dados abertos do Banco Central, série "Taxas de desconto (MDR) e volumetria". A média é
ponderada pelo valor das transações, somando bandeiras e formas de captura [D01]. Leio o campo `valorDesconto` como o valor das
transações, e não o valor descontado (I): a soma dá cerca de R$ 1,1 tri por trimestre, ordem de grandeza do volume de cartões,
enquanto o valor descontado seria uns 2% disso. A documentação da API não foi lida.


| Trimestre | Todas as funções | Débito | Crédito à vista | Crédito parcelado | Pré-pago |
|---|---|---|---|---|---|
| 2º/2025 | 1,882% | 1,093% | 2,071% | 2,460% | 1,262% |
| 3º/2025 | 1,882% | 1,081% | 2,060% | 2,467% | 1,233% |
| 4º/2025 | 1,828% | 1,081% | 2,012% | 2,332% | 1,228% |
| 1º/2026 | 1,822% | 1,078% | 1,954% | 2,329% | 1,208% |
| **2º/2026** | **1,792%** | **1,053%** | **1,906%** | **2,298%** | **1,211%** |

O campo da página não é o MDR: é o custo do cartão **sobre a receita toda** (a ajuda dá o exemplo "80% das vendas no cartão a
2,5% dá 2%"). Nenhuma fonte aceita traz a fração da receita de um salão que entra por cartão, contra Pix e dinheiro. Ela fica
sem padrão, e o motor pergunta. Com 100% no cartão, o campo seria 1,79%, que é o teto do padrão.

**Equipamentos (grau: inferido).** A página pede uma lista de bens com valor de compra e vida útil. Não há fonte aceita com o
valor de cada cadeira ou lavatório: o Sebrae dá listas de itens sem preço que sirva de padrão (seção 5). A PAS dá a ordem de
grandeza do que o setor compra por ano [D06, Tabela 13]:
- salões 20+: máquinas, equipamentos e instalações de R$ 26,7 mi, mais "outros (móveis e utensílios)" de R$ 3,7 mi, sobre
  R$ 2.014,8 mi = **1,51% da receita líquida por ano**;
- serviços pessoais, todos os portes: (R$ 600,5 mi + R$ 869,1 mi) / R$ 25.900,6 mi = **5,67%**.

A depreciação e amortização contábil fica em 5,34% (salões 20+) e 2,57% (todos) [D06, Tabela 9]. Essa conta inclui
amortização e edificações, então não serve como padrão de equipamento. A proposta para o motor: com o cadastro de bens vazio,
mostrar "o setor compra de 1,5% a 5,7% da receita por ano em equipamentos e móveis (IBGE, PAS 2023)" e não inventar a lista.

**Pró-labore (verificado no dado).** Pela PAS, as "retiradas pró-labore dos proprietários" dividem-se pelos "proprietários e
sócios com atividade na empresa" em 31/12/2023 [D06, Tabelas 10 e 11]:
- serviços pessoais, todos os portes: R$ 1.013,1 mi / 55.306 = **R$ 1.526,55 por sócio por mês**;
- salões 20+: R$ 15,8 mi / 234 = **R$ 5.634,62 por sócio por mês**.

São valores nominais de 2023, sem correção: nenhum índice foi escolhido e corrigir seria inventar. O motor mostra o ano.

**O ponto baixo fica abaixo do salário mínimo de 2026, que é R$ 1.621,00** [D10, Decreto 12.797/2025 art. 1º]. O sócio que
trabalha no salão contribui ao INSS como contribuinte individual. Usar R$ 1.527 como padrão daria uma base de INSS abaixo do
piso. Por isso o padrão é o salário mínimo do ano, e a PAS dá a faixa até R$ 5.635 (I: o piso da base do contribuinte
individual é regra da Lei 8.212, não relida neste dossiê).

**Vale-transporte (padrão; fonte aceita pelo dono em 24/11).** A tarifa do ônibus municipal de SP é R$ 5,30 desde 06/01/2026, com integração gratuita em até
quatro ônibus em três horas no Bilhete Único [D09; a de 2025 era R$ 5,00, D08]. Com uma tarifa por trajeto, dois trajetos por
dia e a jornada 6x1 da CCT (dossiê `salao-cct-pisos-2026` [D01], aditivo cl. 7ª § 3º: "jornada de 6x1 (seis dias trabalhados e um dia de folga)"):
- 26 dias × 2 × R$ 5,30 = **R$ 275,60 por mês**;
- 5x2 (22 dias): R$ 233,20;
- duas tarifas por trajeto: R$ 551,20.

O salão paga só o que passar de 6% do salário básico, e a página já desconta isso. A Prefeitura é fonte oficial fora da lista inicial (Sebrae, IBGE,
CCT, Banco Central). O dono a aceitou para o VT (chat, 24/11/2026: "Sim, aceitar"; seção 4, A1).

**O que isso destrava (item 20d).** O `DEF` da página tem `insumo: 0`, `mdr: 0`, `rot: 0`, `vt: 0` e `pl: 0`, e o `DEF_CAT`
tem `bens: []`. Com este dossiê, o item 20d pode preencher:
- `insumo` ≈ 7,2% da receita;
- `mdr` com o MDR de 1,79% vezes uma fração no cartão que o aviso declara como suposição, ou deixar `mdr` em zero com aviso;
- `pl` = R$ 1.621 por sócio (salário mínimo de 2026), com a faixa da PAS.

`vt` = R$ 275,60 por empregado (faixa R$ 233,20 a R$ 551,20). `rot` fica zero com o aviso "sem padrão de fonte aceita".
`bens` fica vazio com o aviso da ordem de grandeza da PAS. O aviso do
exemplo cita estas fontes, e o resultado mostra a faixa (F-SIM-7).

## 2. Fundamentação
| Ponto | Fonte | Onde | Dado literal |
|---|---|---|---|
| MDR por função | Banco Central, dados abertos `DESCONTODA` | [D01] (consulta a partir de 2025T2; traz 2025T2 a 2026T2) | campos `funcaoCartao`, `numeroparcelas`, `valorDesconto` (valor das transações, I), `txMediaDesconto` |
| Insumo, salões 20+ | IBGE PAS 2023, Tabela 6 | [D06] | "Cabeleireiros e outros serviços de tratamento de beleza \| 190689 \| 145808 \| 11748 \| 1079 \| 32054" (Total; Mercadorias, materiais de consumo e de reposição; CMV; combustíveis; outros; 1 000 R$) |
| Receita, salões 20+ | IBGE PAS 2023, Tabela 5 | [D06] | "… \| 2390918 \| 13631 \| 93737 \| 483482 \| 2014804" (serviços; revenda; outras; deduções; receita operacional líquida) |
| Insumo, serviços pessoais | Tabelas 6 e 5, total das empresas | [D06] | "Serviços pessoais \| 3189428 \| 2438540 …"; "Serviços pessoais \| 28155192 \| … \| 25900591" |
| Equipamentos | Tabela 13 | [D06] | salões 20+: "34210 \| - \| 2037 \| 26721 \| 1767 \| 3685"; serviços pessoais (total): "1918145 \| 73975 \| 239331 \| 600465 \| 135246 \| 869127" |
| Depreciação | Tabela 9 | [D06] | salões 20+: "147880 \| 107645 …"; serviços pessoais (total): "1361103 \| 666744 …" |
| Pró-labore | Tabela 10 | [D06] | salões 20+: "885299 \| 565206 \| 10892 \| 147 \| 15822"; serviços pessoais (total): "8393546 \| 5441884 \| 42147 \| 3748 \| 1013128" (última coluna: retiradas pró-labore) |
| Sócios e porte | Tabela 11 | [D06] | salões 20+: "226 \| 13982 \| 13745 \| 234 …"; serviços pessoais (total): "57320 \| 253566 \| 194267 \| 55306 …" |
| Tarifa de ônibus 2026 | Prefeitura de SP, 29/12/2025 | [D09] | "passando a ser de R$ 5,30"; "integração gratuita que passageiro pode fazer em até quatro ônibus no período de três horas com o Bilhete Único" |

## 3. Vigência conferida
- **Banco Central.** O 2º trimestre de 2026 é o último da série: o dado sai 90 dias depois do fim do trimestre, então o 3º de
  2026 ainda não existe. O parâmetro `@trimestre` da API é "a partir de". O [D01] já traz os cinco trimestres, e os [D02] a
  [D05] repetem os mesmos dados a partir de trimestres mais novos. Ficam como prova de que a série é a mesma.
- **IBGE.** A PAS 2023 é a última publicada. O FTP do IBGE tem `pas2023` como pasta mais nova [D07: índice das tabelas]. O
  `.txt` do [D06] é a extração das linhas usadas, feita por planilha. O zip original fica no dossiê com o SHA-256.
- **Prefeitura de SP.** Tarifa de 06/01/2026. A página da Prefeitura diz que o valor "será encaminhado à Câmara Municipal" [D09].
  Não li o decreto da tarifa (ver seção 5).
- **CCT.** A jornada 6x1 e os pisos estão no dossiê `salao-cct-pisos-2026`. O VT da CCT (cl. 21ª, parecer D56) manda
  complementar a diferença quando a tarifa sobe e não fixa valor.

## 4. Ambiguidades (só o que precisa de decisão humana)
**A1. Fonte oficial fora da lista do dono: vale-transporte (Prefeitura de SP) e rotatividade (Novo Caged/RAIS, do MTE).**
- **Leitura (i):** a lista "Sebrae, IBGE, CCT, Banco Central" é fechada. O VT e a rotatividade ficam sem padrão, com aviso.
- **Leitura (ii):** a lista dá exemplos de fonte oficial. Entram a tarifa da Prefeitura (VT = R$ 275,60, faixa R$ 233,20 a
  R$ 551,20) e, numa pesquisa nova, a rotatividade da subclasse 9602-5/01 no Novo Caged.
- **Efeito:** só muda o exemplo e o kit setorial. Nenhum dos dois toca imposto.
- **Recomendação:** (ii) para o VT, porque a tarifa é ato oficial e a conta é aritmética. Para a rotatividade, (ii) só depois de
  uma pesquisa própria no Novo Caged, que este dossiê não fez.
- **Decisão do VT (dono, chat, 24/11/2026):** "Sim, aceitar", em resposta a "Aceitar a tarifa da Prefeitura de SP como fonte
  do vale-transporte padrão?". O VT passa a padrão. A decisão não cobre a rotatividade: ela continua sem padrão até haver uma
  pesquisa no Novo Caged e uma decisão sobre essa fonte.

**A2. Fração da receita paga em cartão.** Sem fonte aceita. O motor pergunta ao usuário. Se o exemplo precisar de um número,
o aviso diz "suposição" e mostra a faixa de 0% (tudo em Pix ou dinheiro) a 1,79% (tudo no cartão, ao MDR médio).

**A3. Porte.** O único dado do próprio setor (salões) é de empresas com 20 ou mais pessoas, e o exemplo tem quatro. O agregado
de serviços pessoais tem o porte certo e o setor misturado. Por isso cada valor sai como faixa com os dois pontos (F-SIM-7).
O MDR do Banco Central é a média nacional ponderada por valor e não separa por porte do lojista. É provável que o salão pequeno
pague acima dela (I).

## 5. Lacunas
- **Sebrae.** As fichas e cartilhas que a busca achou (Sebrae PR, BA, MG e MT) dão listas de equipamentos, partilhas do
  investimento ("cerca de 50% em equipamentos") e investimento de barbearia "entre R$ 20 mil e R$ 40 mil" (BA, 2019). Nenhuma
  dá número de salão de SP, atual e com método. Não entram como padrão. A busca está no registro abaixo.
- **Rotatividade:** sem fonte aceita. A PAS dá só a variação trimestral do pessoal ocupado (salões 20+: 14.696 em 31/03/2023 e
  13.982 em 31/12/2023, Tabela 12), que é saldo e não rotatividade.
- **Decreto da tarifa de 2026:** não lido. O valor vem da nota oficial da Prefeitura [D09].
- **Correção monetária do pró-labore de 2023:** não feita, de propósito (ver seção 1).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_DESCONTODA-trimestre-trimestre- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://olinda.bcb.gov.br/olinda/servico/MPV_DadosAbertos/versao/v1/odata/DESCONTODA(trimestre=@trimestre)?@trimestre='20252'&$format=json>  
  Baixado em 2026-11-24T01:39:35-03:00 · arquivo local `docs/D01_DESCONTODA-trimestre-trimestre-.html` · SHA-256 `f0848c7ceae46000ce982c6609181961c26438ba1e2c2e393d56798a37d9bdfb`
- **[D02]** D02_DESCONTODA-trimestre-trimestre- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://olinda.bcb.gov.br/olinda/servico/MPV_DadosAbertos/versao/v1/odata/DESCONTODA(trimestre=@trimestre)?@trimestre='20253'&$format=json>  
  Baixado em 2026-11-24T01:39:36-03:00 · arquivo local `docs/D02_DESCONTODA-trimestre-trimestre-.html` · SHA-256 `e826d9c86fae4ff206f44991e6ced4d6b2359fa295c40bd2e7e24c55be41560a`
- **[D03]** D03_DESCONTODA-trimestre-trimestre- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://olinda.bcb.gov.br/olinda/servico/MPV_DadosAbertos/versao/v1/odata/DESCONTODA(trimestre=@trimestre)?@trimestre='20254'&$format=json>  
  Baixado em 2026-11-24T01:39:40-03:00 · arquivo local `docs/D03_DESCONTODA-trimestre-trimestre-.html` · SHA-256 `6f6829968e2032c12eff4d5b181e855832aa3ae446f1b47a5fbf5d87269686f9`
- **[D04]** D04_DESCONTODA-trimestre-trimestre- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://olinda.bcb.gov.br/olinda/servico/MPV_DadosAbertos/versao/v1/odata/DESCONTODA(trimestre=@trimestre)?@trimestre='20261'&$format=json>  
  Baixado em 2026-11-24T01:39:44-03:00 · arquivo local `docs/D04_DESCONTODA-trimestre-trimestre-.html` · SHA-256 `4da4111e5382239d58a871024270512110078fde7a183bb44382f1eaaca3ef11`
- **[D05]** D05_DESCONTODA-trimestre-trimestre- — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://olinda.bcb.gov.br/olinda/servico/MPV_DadosAbertos/versao/v1/odata/DESCONTODA(trimestre=@trimestre)?@trimestre='20262'&$format=json>  
  Baixado em 2026-11-24T01:39:45-03:00 · arquivo local `docs/D05_DESCONTODA-trimestre-trimestre-.html` · SHA-256 `339b2c0e8dc0e61c1824efbc7adb20397aacef01ecad887ede9db19192bab396`
- **[D06]** IBGE, Pesquisa Anual de Serviços 2023 — tabelas em xlsx (zip) — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://ftp.ibge.gov.br/Comercio_e_Servicos/Pesquisa_Anual_de_Servicos/pas2023/xlsx/tabelas_2023_xlsx.zip>  
  Baixado em 2026-11-24T01:40:57-03:00 · arquivo local `docs/D06_tabelas_2023_xlsx-zip.html` · SHA-256 `7bd51e1a484dabeb15e8a9766603454563e0c85f4b959b1819e1ff336d143b68`  
  ⚠ o arquivo é um zip de planilhas; o .txt é a extração das linhas usadas (Tabelas 5, 6, 9, 10, 11 e 13), feita por openpyxl, não o texto do zip
- **[D07]** Tabelas de resultados — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://ftp.ibge.gov.br/Comercio_e_Servicos/Pesquisa_Anual_de_Servicos/pas2023/tabelas_2023_indice.pdf>  
  Baixado em 2026-11-24T01:40:58-03:00 · arquivo local `docs/D07_tabelas_2023_indice-pdf.pdf` · SHA-256 `073cee77a45a0b7fa6f2a0d336f7b24e4a0124ef583d266e8c2805284e3e0f9a`
- **[D08]** Tarifa de ônibus será corrigida abaixo da inflação a partir de 6 de janeiro - Prefeitura de São Paulo - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/w/tarifa-de-%C3%B4nibus-ser%C3%A1-corrigida-abaixo-da-infla%C3%A7%C3%A3o-a-partir-de-6-de-janeiro>  
  Baixado em 2026-11-24T01:42:16-03:00 · arquivo local `docs/D08_tarifa-de-C3-B4nibus-ser-C3-A1-corrigida-abaixo-da-infla-C3-.html` · SHA-256 `5c2eca31823653550ee4e7b29d216cbf4c48672a62bd67cf50b46a715246a902`
- **[D09]** Tarifa de ônibus será atualizada a partir de 6 de janeiro - Prefeitura de São Paulo - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/w/tarifa-de-%C3%B4nibus-ser%C3%A1-atualizada-a-partir-de-6-de-janeiro-1>  
  Baixado em 2026-11-24T01:42:25-03:00 · arquivo local `docs/D09_tarifa-de-C3-B4nibus-ser-C3-A1-atualizada-a-partir-de-6-de-j.html` · SHA-256 `8e106da3e6be3659bccb49c69b8e984fe9e245bdd183401b83c152e995008e5b`
- **[D10]** D12797 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm>  
  Baixado em 2026-11-24T01:59:01-03:00 · arquivo local `docs/D10_d12797-htm.html` · SHA-256 `2f404a89da06d350add2cb7e4951c82198f7ea8cf52321e1ad2872f0f3e851f5`

## Registro de buscas
- 2026-11-24T01:45:14-03:00 · WebSearch (pista, não fonte): Sebrae · `Sebrae salão de beleza investimento equipamentos custo de produtos % do faturamento` → 18 resultado(s)
