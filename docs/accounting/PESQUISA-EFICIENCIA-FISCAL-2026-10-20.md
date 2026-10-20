# Eficiência fiscal automatizável — práticas, limite legal e o nó proposto (20/10/2026)

> Pedido do dono (chat, 20/10): *"precisamos ter uma sessão de instalar práticas de eficiência fiscal, pesquise aqui
> algumas, por exemplo a mudança na cobrança e lucro em produtos num pacote de produtos, onde vc mantém o valor da soma
> dos produtos no combo, mas muda o valor na nota para o produto que possui uma alíquota menor de imposto … para
> deixarmos automática no sistema"*.
> Base legal lida no acervo `ctresb/leis` e no Planalto pelo método oficial — dossiê
> [`pesquisas-legais/eficiencia-fiscal-praticas/relatorio.md`](../../pesquisas-legais/eficiencia-fiscal-praticas/relatorio.md)
> (referências [Dnn] abaixo são desse dossiê). Práticas de mercado: pesquisa web de 20/10 em fonte oficial (RFB, CARF,
> CGSN, Sebrae), seção 3. Grau: **V** verificado na norma/fonte · **I** inferido · **A** assumido.

**Em duas linhas.** O exemplo do combo (manter o total e jogar o preço para o item menos tributado) **não é elisão, é
preço inexato no documento fiscal**: o CTN manda arbitrar (art. 148) e rever por simulação (art. 149 VII), a Lei 8.137
art. 1º II/IV tipifica como crime, e a LC 214 art. 7º § 3º + art. 13 I "b" já preveem o arbitramento item a item a partir
de 2027 — não entra no sistema como automação. **Esclarecimento do dono no mesmo dia: a ideia é preço de custo, não
preço fictício** — isso é lícito com guardas (seção 2): o desconto do combo vai primeiro aos itens de maior carga até o
piso do custo, nenhum item sobe acima do catálogo, tudo destacado na nota. É essa a regra do item 1 do nó. O resto que
entra é a **versão lícita das mesmas economias**: segregação monofásico/ST, fator r, salão-parceiro, escolha de regime e
de anexo por simulação, créditos e retenções — tudo com a lei como régua e o humano decidindo.

---

## 1. O limite legal (o que separa elisão de simulação)

| Regra | Norma | O que diz | Efeito no desenho |
|---|---|---|---|
| Arbitramento do preço | CTN art. 148 [D01] | o fisco arbitra "sempre que… não mereçam fé… os documentos expedidos pelo sujeito passivo" | preço por item tem de ser defensável (valor real/mercado) |
| Norma antielisão | CTN art. 116 p.ú. [D01] | desconsidera ato "com a finalidade de dissimular a ocorrência do fato gerador" (procedimento ainda sem lei ordinária) | forma sem substância não vale |
| Revisão por simulação | CTN art. 149 VII [D01] | lançamento revisto de ofício com "dolo, fraude ou simulação" | multa qualificada + crime |
| Crime | Lei 8.137 art. 1º II e IV [D02] | "inserindo elementos inexatos… em documento"; "emitir… documento que saiba ou deva saber… inexato" | reclusão 2–5 anos |
| Combo (2027+) | LC 214 art. 7º [D08] | com tratamentos diferentes, "obrigatória a especificação de cada fornecimento e de seu respectivo valor"; § 3º: cobrança unificada irregular → cada item independente e base **arbitrada** (art. 13) | o sistema tem de itemizar e precificar cada item do combo |
| Arbitramento IBS/CBS | LC 214 art. 13 I "b" [D08] | "valor notoriamente inferior ao valor de mercado" → base = valor de mercado | preço líquido do item precisa de piso |
| Desconto incondicional | LC 214 art. 12 § 2º III e § 3º [D08]; LC 123 art. 3º § 1º [D04] | fora da base / fora da receita bruta se "conste do documento fiscal e não dependa de evento posterior" | desconto na nota, por item, documentado |
| Principal + acessório | LC 214 art. 7º II e § 2º [D08] | acessório = "condição ou meio" do principal → tratamento do principal | kit se classifica, não se re-precifica |

**Elisão** (lícita): escolha permitida pela própria lei, antes do fato gerador, com substância (regime, anexo, segregação,
desconto real, estrutura real de parceria). **Evasão/simulação** (ilícita): documento que não espelha o negócio real
(preço de item inventado, folha de papel, parceria fictícia).

## 2. O caso-teste: combo com preço realocado

| Variante | Veredito | Por quê |
|---|---|---|
| Manter o total do combo e declarar na nota o item de alíquota menor por mais do que vale e o outro por menos | **ILÍCITA** | CTN 148/149 VII, Lei 8.137 art. 1º II/IV, LC 214 art. 7º § 3º + 13 I "b" — V |
| Itemizar o combo pelos preços reais de catálogo e dar **desconto incondicional** rateado proporcionalmente | **LÍCITA** — padrão do sistema | LC 123 art. 3º § 1º; LC 214 art. 12 § 2º III — V |
| **Esclarecimento do dono (20/10): item de maior carga a preço de custo (nunca abaixo), item de menor carga no preço de catálogo (nunca acima); a diferença para a soma de catálogo é o desconto incondicional do combo** | **LÍCITA com guardas** (defensável; A1 do dossiê reescrita) | preço de custo é preço real e praticado: a base é "o valor da operação" (LC 87 art. 13 I [D31]; LC 214 art. 12 caput) e o preço corrente só entra "na falta do valor" (LC 87 art. 15); o fisco precisa provar que o documento "não merece fé" (CTN 148) — o que a consistência (mesmo preço em todo combo, tabela publicada, item real, custo documentado no estoque FIN-10) afasta. Risco residual: o fisco tomar o preço avulso como "valor de mercado" (LC 214 art. 13 I "b", 2027+) — mitigado porque o preço do combo passa a ser ele mesmo "operação comparável entre partes não relacionadas" |
| Concentrar o desconto no item mais tributado **abaixo do custo**, ou inflar o item de menor carga acima do catálogo | **CINZENTA → ILÍCITA** | abaixo do custo deixa de ser preço praticado e vira o caso de arbitramento; acima do catálogo é o preço fictício da linha 1 |
| Kit em que o produto é aplicado no serviço (condição/meio) → tratamento do serviço | **LÍCITA** (2027+, art. 7º II) | classificação por fornecimento principal; produto levado para casa é fornecimento próprio (A2) |
| Produto monofásico (perfumaria/toucador 33.03–33.07) vendido dentro do combo, com preço real, **segregado** no Simples | **LÍCITA** | LC 123 art. 18 § 4º-A I; Lei 10.147 art. 2º — V; X14 já segrega |

Ganho real que sobra para o salão/clínica no Simples: segregar a receita de revenda de cosméticos (monofásico) e de
produtos com ICMS-ST tira PIS/COFINS/ICMS do DAS daquela parcela. A partir de 2027 a alíquota do IBS/CBS é uniforme para
produtos de perfumaria e cosméticos (o Anexo VIII da LC 214 só reduz em 60 % higiene básica: sabões de toucador 3401.11.90,
dentifrícios, escovas, papel higiênico, fraldas — art. 136 [D08], V), mas **serviços de saúde** têm redução de 60 %
(arts. 128 II e 130, Anexo III [D08]) e profissões regulamentadas 30 % (art. 127 [D08]). Ou seja: numa clínica estética
com procedimento médico, o combo "procedimento + produto" terá alíquotas diferentes em 2027, e é exatamente aí que o art. 7º
exige preço real por item ou a classificação principal/acessório — o incentivo para realocar preço cresce, e a regra que o
proíbe também.

## 3. Práticas de mercado, classificadas

Pesquisa de 20/10 (agente, 150 chamadas) no acervo, Planalto, base de normas da RFB (Soluções de Consulta, Res. CGSN
140), PGFN, CARF, STF e STJ. Textos lidos ficaram no dossiê (`docs/D09`–`D30`). **V** = fonte oficial lida; **I** =
inferido. Três correções de premissa que a pesquisa trouxe: a multa qualificada é **100 %** (Lei 9.430 art. 44 § 1º VI;
150 % só na reincidência, VII; o IBS/CBS copia em LC 214 art. 341-F); a **Lei 10.147 é revogada em 01/01/2027** (LC 214
art. 542 XI — a segregação monofásica perde o objeto; estoque ganha crédito presumido de CBS, art. 381); **estética não
consta do Anexo III** da LC 214 (redução de 60 % só para os serviços de saúde listados).

### 3.1 Kits, combos e cestas

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Kit só com itens de mesma tributação | rateio de preço é indiferente para o tributo | LC 214 art. 7º I | LÍCITA | validar NCM/NBS | I |
| Kit classificado como um só bem | a Cosit aplica as RGI/SH 3(b) ao sortido; a NCM do kit decide monofásico e ST | [SC Cosit 98048/2026](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=149647) | CINZENTA | alerta: kit sem NCM própria | V (SC); aplicação a cosméticos I |
| Cesta como "novo bem" | empacotar pode ser produção de bem novo; não fala de rateio de preço | [SC Cosit 137/2024](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=138254) | CINZENTA | cadastro de kit como produto | V |
| Fisco separa o kit por componente | alíquota zero só para a parte que a tem; o resto à alíquota normal | [SC Disit/SRRF09 138/2011](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=67952) | CINZENTA | explodir o kit em itens na apuração | V |
| **Desconto concentrado no item mais tributado** | reduz a base do item tributado e preserva o monofásico; **nenhuma SC ou acórdão encontrado** | CTN art. 148: arbitra se declarações "não mereçam fé", com avaliação contraditória | CINZENTA; ILÍCITA se nota/contrato forem falsos (Lei 8.137 art. 1º II/IV) | simulação com preços avulsos; alerta de desvio do rateio | V (texto); posição do fisco NÃO ENCONTRADA |
| Rateio proporcional ao preço avulso de tabela | critério objetivo, defensável sob arbitramento | "valor de mercado" (LC 214 art. 13 p.ú. I) por analogia | LÍCITA | rateio automático | I |
| Desconto incondicional na própria NF | sai da receita bruta se consta do documento e não depende de evento posterior | Lei 10.637 art. 1º § 3º V "a"; [SC Cosit 380/2017](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=86078); [SC Disit/SRRF04 58/2012](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=64726) | LÍCITA | bloquear "desconto" fora da NF | V |
| IBS/CBS: valor de cada item do kit | obrigatório, salvo mesmo tratamento ou principal + acessórios; cobrança unificada irregular → item independente e base arbitrada | LC 214 arts. 7º, 12 § 2º III/§ 3º, 13 | LÍCITA se discriminado | bloqueio na emissão; valor por item | V |
| Brinde e bonificação | incidem (art. 5º II), salvo bonificação no documento fiscal sem evento posterior (§ 1º I) | LC 214 art. 5º | LÍCITA com NF | alerta de bonificação fora da NF | V |

### 3.2 Simples Nacional

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Segregar monofásico (cosméticos, xampus) | receita monofásica sai do PIS/COFINS do DAS (PGDAS-D); 33.03–33.07 exc. 33.06 | LC 123 art. 18 § 4º-A I e § 12; [CGSN 140 art. 25 §§ 6º–7º](http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado); [SC Cosit 111/2015](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=64253) | LÍCITA (obrigação) | NCM monofásica por item → segregação automática | V |
| Segregar ICMS-ST | remove o ICMS quando já retido | CGSN 140 art. 25 § 8º | LÍCITA (obrigação) | por CST/CSOSN | V |
| Segregação indevida reiterada | causa de exclusão de ofício | LC 123 art. 29 V e § 9º | ILÍCITA se deliberada | alerta NCM × segregação | V |
| Salão: serviços no Anexo III; revenda no Anexo I | salão/estética como única atividade | [SC Cosit 127/2019](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=99744); CGSN 140 art. 25 § 1º III "m", § 18 | LÍCITA | atividade → anexo | V |
| Fator r em clínica | medicina, odontologia, fisioterapia…: Anexo III se folha/receita ≥ 28 %; folha inclui pró-labore, encargos, FGTS (caixa) e MEI contratado | LC 123 art. 18 §§ 5º-J/K/M; CGSN 140 arts. 25 § 1º V e 26; [SC Cosit 17/2021](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=116177); [SC Cosit 81/2025](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=144579) | LÍCITA | fator r mensal + pró-labore ótimo | V |
| Clínica "estética" no fator r | medicina → fator r; estética → caso do salão; sem SC específica | CGSN 140 art. 25 | CINZENTA | alerta ao cadastrar CNAE | I |
| Salão-parceiro: cota fora da receita | exige contrato escrito homologado e profissional com CNPJ | LC 123 art. 13 § 1º-A; CGSN 140 art. 2º § 5º VI; Lei 13.352 art. 1º-A §§ 5º/8º/10; [nota CGSN/RFB](https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=4bb88b6e-394f-45ff-ad26-a4661a1ae01d) | LÍCITA com contrato real | validar contrato/CNPJ; NF unificada discriminando a cota | V |
| Parceria que mascara emprego | sem contrato ou com função diversa → vínculo (art. 1º-C); STF ADI 5625 validou a lei mas parceria que encobre emprego é nula; [SC Cosit 80/2014](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=52783) já tributava "gestão de caixa" de PJs de fachada | Lei 13.352 art. 1º-C | ILÍCITA | checklist de contrato; alerta de profissional sem CNPJ | lei/SC V; ADI I |
| Sublimite e exclusão por excesso | R$ 4,8 mi total; R$ 3,6 mi ICMS/ISS; excesso até 20 % exclui só no ano seguinte | LC 123 arts. 3º, 13-A, 19–20; CGSN 140 arts. 9º–12 | LÍCITA | projeção 12 meses; alerta em 80 % | V |
| Lucros isentos no Simples | até a presunção (Lei 9.249 art. 15) menos o DAS; mais com escrituração | LC 123 art. 14 §§ 1º–2º | LÍCITA | teto isento | V; efeito da Lei 15.270 no Simples I |
| Caixa × competência | opção de caixa só para a base mensal; parcelas a prazo entram até o fim do ano seguinte | CGSN 140 arts. 19–20; [SC Cosit 22/2025](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=143124) | LÍCITA | simulação (X14-CAIXA ✅) | V |

### 3.3 Regime, pró-labore, lucros e JCP

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Presunção do Presumido | 8 % comércio / 32 % serviços (IRPJ); serviços hospitalares 8 % só sociedade empresária dentro da Anvisa | Lei 9.249 arts. 15 e 20; [SC Cosit 195/2019](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=101592); [SC Cosit 127/2026](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=152634) | LÍCITA; CINZENTA p/ clínica estética sem requisitos | alerta 8 % × 32 % | V |
| Simples × Presumido × Real | carga total; Presumido/Simples no PIS/COFINS cumulativo, Real não cumulativo | Lei 10.637 art. 8º; Lei 10.833 art. 2º | LÍCITA | simulador com 12 meses reais | V (regras) |
| Troca de regime | opção irretratável no ano | LC 123 art. 16 | LÍCITA | alerta de janela | V |
| Pró-labore × lucros | pró-labore tem INSS/IR; lucros isentos; pró-labore irrisório sem lastro é atacado | Lei 9.249 art. 10; [SC Cosit 228/2023](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=134391); RIR art. 314 | LÍCITA; CINZENTA se irrisório | alerta de mínimo; trade-off com fator r | V |
| Lucros no Presumido | isento: base presumida − IRPJ/CSLL/PIS/COFINS; excesso só com contabilidade | [IN RFB 1.700/2017 art. 238 § 2º](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268); [SC Cosit 200/2024](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=139134) | LÍCITA | teto isento; bloqueio acima sem contabilidade | V |
| Dividendos 2026+ | 10 % acima de R$ 50 mil/mês por fonte e PF; lucros de 2025 aprovados até 31/12/2025 isentos | [Lei 15.270](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) (Lei 9.250 art. 6º-A; art. 16-A > R$ 600 mil/ano) | LÍCITA | alerta de limite mensal (IRRF-DISTRIBUICAO) | V |
| JCP | só Lucro Real; TJLP; lucros ≥ 2× juros; IRRF 17,5 % desde 2026 | Lei 9.249 art. 9º (LC 224/2025) | LÍCITA | teto + IRRF (IRRF-DISTRIBUICAO) | V |
| Retenções compensáveis | IRRF/CSRF sofridas compensam na apuração | Lei 9.430 arts. 64–65 | LÍCITA | conciliar no razão (RETENCOES-FONTE) | I |

### 3.4 Lucro Real (até 12/2026 para PIS/COFINS)

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Créditos de PIS/COFINS | insumos e itens do art. 3º; mão de obra PF não; clínica médica/odonto/fisio fica no cumulativo mesmo no Real | Lei 10.637 art. 3º; Lei 10.833 art. 10 XIII "a"; [SC Cosit 126/2020](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=112765) | LÍCITA | classificar compra; alerta de crédito vedado | V |
| Revenda monofásica no Real | sem crédito na compra para revenda | [SC Disit/SRRF04 4002/2022](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=124931) | LÍCITA | bloquear crédito sobre NCM monofásica | V |
| Exclusão do ICMS da base (Tema 69) | ICMS **destacado**; desde 15/03/2017; Lei 14.592/2023 | [PGFN Parecer SEI 14483/2021](https://www.gov.br/pgfn/pt-br/assuntos/representacao-judicial/lista-dispensa-contestar-recorrer/parecer-sei-14483-2021.pdf); [IN RFB 2.121 art. 26 XII](https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=127905) | LÍCITA | excluir por CST | V |
| Depreciação e despesas necessárias | quota por vida útil; aceleração por turnos | RIR/2018 arts. 311, 313, 317–323 | LÍCITA | C8 ✅ + LALUR ✅ | V |
| PAT | dedução até 4 % do IR | Lei 6.321 art. 1º; Lei 9.532 arts. 5º–6º | LÍCITA | cálculo do teto | V |
| Prejuízo fiscal / base negativa | trava de 30 % | Lei 9.065 arts. 15–16 | LÍCITA | X4 ✅ (Parte B) | V |
| Estoque em 2027 | crédito presumido de CBS sobre estoque monofásico/cumulativo/ST | LC 214 art. 381 | LÍCITA | inventário em 31/12/2026 (FIN-10/11 ✅) | V |

### 3.5 ISS

| Prática | Como funciona | Base legal / posição oficial | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Item da lista | salão 6.01; estética/depilação 6.02; massagem 6.03; spa 6.05; tatuagem 6.06; medicina 4.01; clínicas 4.03 | LC 116, lista anexa | LÍCITA | item no cadastro; alerta de divergência | V |
| Local de incidência | estabelecimento prestador, salvo exceções | LC 116 art. 3º | LÍCITA | validar município (X7 ✅) | V |
| Alíquota mínima 2 % | benefício abaixo disso é nulo | LC 116 art. 8º-A | LÍCITA | alerta (`IssBeneficioMunicipal` ✅) | V |
| ISS fixo de sociedade uniprofissional | por profissional, não sobre faturamento; STJ Tema 1.323: limitada não impede; exige trabalho pessoal e sem estrutura empresarial | DL 406 art. 9º §§ 1º/3º; [STJ 22/10/2025](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2025/22102025-Repetitivo-define-que-sociedade-limitada-nao-esta-excluida-de-tributacao-diferenciada-do-ISS.aspx) | LÍCITA se requisitos; CINZENTA p/ clínica empresarial | checklist; simulação fixo × variável | V (tese); caso I |
| ISS fixo × Simples | decisões tratam como incompatíveis | só resumos | CINZENTA | bloquear opção simultânea | I |
| Serviço com produto aplicado | produto usado integra o serviço; revenda é mercadoria | LC 116; CGSN 140 art. 25 § 18 | LÍCITA com separação na NF | item serviço × item revenda | I |

### 3.6 Reforma tributária (2027+)

| Prática | Como funciona | Base legal | Classe | Automatizável? | Grau |
|---|---|---|---|---|---|
| Cronograma | 2026: CBS 0,9 % + IBS 0,1 %; 2027–28: IBS 0,05 %+0,05 %, CBS −0,1 p.p. | LC 214 arts. 343–347 | — | IBS-CBS-2027 | V |
| Redução 60 % saúde | só Anexo III (cirúrgicos, clínica médica, odonto, fisio, laboratório…); **estética não consta** | LC 214 art. 130 + Anexo III | CINZENTA p/ procedimento estético por médico | NBS → alíquota; alerta fora do Anexo III | V (lista); enquadramento NÃO CONFIRMADO |
| Redução 30 % profissões | lista fechada; esteticista/cabeleireiro fora; PJ com sócios habilitados e sem PJ sócia | LC 214 art. 127 | LÍCITA | checklist | V |
| Higiene pessoal 60 % | só Anexo VIII | LC 214 art. 136 | LÍCITA | NCM → alíquota | V |
| Cashback | PF no CadÚnico; 20 % padrão | LC 214 arts. 112–118 | LÍCITA | CPF na nota | V |
| Crédito amplo | crédito na extinção do débito do fornecedor; sem crédito em isentas/alíquota zero/uso pessoal | LC 214 arts. 47, 49, 57 | LÍCITA | conciliar crédito × pagamento; split | V |
| Simples no regime regular de IBS/CBS | optante pode apurar IBS/CBS pelo regime regular para dar crédito ao cliente PJ (art. 41 § 3º); sem volta após ressarcimento (§ 5º) | LC 214 arts. 41, 47 | LÍCITA | simulação Simples puro × regular pela base de clientes PJ | V (regras); vantagem I |

### 3.7 Limites

| Prática | Posição | Base | Automatizável? | Grau |
|---|---|---|---|---|
| Norma antielisiva | STF ADI 2446 (2022): constitucional; não proíbe economia por meios legítimos; sem regulamentação | CTN art. 116 p.ú. | alerta de estrutura sem substância | V (notícia oficial) |
| Sem propósito negocial | inoponível ao fisco | CSRF [Ac. 9101-004.817](https://acordaos.economia.gov.br/acordaos2/pdfs/processados/16327001725201052_6164225.pdf) | alerta | V (ementa) |
| Sem substância econômica | glosa mesmo formalmente lícito | CARF [Ac. 1101-001.691](https://acordaos.economia.gov.br/acordaos2/pdfs/processados/16327720946201881_7299429.pdf) | alerta | V (ementa) |
| Transparência afasta qualificação | planejamento declarado na contabilidade e acessórias não é fraude; Súmula CARF 14 | Lei 4.502 art. 72 | trilha de auditoria (T8 ✅) | V (resumo) |
| Multa de ofício | 75 %; qualificada 100 %; 150 % reincidente; +50 % sem atender intimação | Lei 9.430 art. 44; LC 214 art. 341-F | alerta de risco | V |
| Crime | reclusão 2–5 anos; pagamento integral extingue punibilidade | Lei 8.137 arts. 1º–2º; Lei 9.430 art. 83 § 4º | bloqueio de documento incoerente | V |
| Exclusão do Simples por fraude | 3 anos; 10 com ardil | LC 123 art. 29 §§ 1º/2º/9º | alerta | V |

**O que a pesquisa não confirmou:** nenhuma SC Cosit nem acórdão CARF sobre alocação de preço/desconto entre itens de kit
com tributação diferente; "subfaturamento parcial" como figura própria; estética × medicina no Anexo III/fator r; efeito
da Lei 15.270 nos lucros do Simples/Presumido; ISS fixo × Simples (só resumos); ADI 5625 e SV 24 (não abertas);
Decreto 12.955/2026 (regulamento da LC 214) não lido; ICMS-ST em kit (CONFAZ) fora do escopo.

## 4. O que o Luminaris já faz (medido no código, 20/10)

| Prática | Estado | Onde |
|---|---|---|
| Segregação monofásico / ICMS-ST / ISS retido no Simples | ✅ | `SimplesDto.MOTIVOS_SEGREGACAO`, `simplesCalc.ts` (X14) |
| Fator r (Anexo III × V) | ✅ cálculo | `simplesCalc.ts` item 7 (X14) — sem simulação "e se a folha fosse X" |
| Salão-parceiro (cota do profissional fora da receita; gestão no Anexo III) | ✅ | `NaturezaSimples.PARCERIA_GESTAO`, `SalaoParceriaContrato` (X14) |
| Desconto na venda | 🟡 | `SalesModule.discountAmount` é **por venda**, não por item; não há rateio nem flag incondicional/condicional |
| Combo/kit itemizado com preço por item | ⬜ | `PackageCatalogModule` é crédito monetário, "NOT an itemized combo" (comentário do preset) |
| Piso de preço por item (custo + margem) | ⬜ | — |
| Simulação de regime (Simples × Presumido × Real) e de anexo | ⬜ | `grep simula` = só testes |
| Pró-labore × dividendos × JCP | 🟡 | JCP/dividendos no BRIEF IRRF-DISTRIBUICAO (planned); pró-labore ⬜ |
| Créditos PIS/COFINS no Lucro Real | ✅ raso | X8 (PR-3: "outros créditos") — morre em 2027 |
| Exclusão do ICMS da base de PIS/COFINS (Tema 69) | ⬜ | `pisCofinsCalc.ts` grep 0 |
| ISS: local, alíquota, retenção | ✅ | X7 Fase C, `issCompetencia.ts`, `IssBeneficioMunicipal` |
| Retenções compensáveis (IRRF/CSRF sofridas) | ⬜ | nó `RETENCOES-FONTE` (F1, PRE-ADR em #778) |
| IBS/CBS: alíquotas reduzidas por setor, crédito, caixa × competência | ⬜ | nó `IBS-CBS-2027` (F1, PRE-ADR em #777) |

## 5. Nó proposto: `EFICIENCIA-FISCAL` (régua F, onda F1.5 — depois de F1, antes de F2)

**O que é:** um módulo de **sugestão e guarda**, não de decisão. Ele calcula a economia lícita disponível, mostra a base
legal, pede confirmação humana (maker-checker já existente) e **bloqueia** a variante ilícita no documento fiscal.
Fronteira: Prisma first-class (lê razão, apuração X7/X14, perfil fiscal X13; grava `TaxOptimizationSuggestion` com
estado proposta → aceita/recusada e trilha), sem tocar o motor DynamicTable; a tela de venda consome a regra de rateio por
ponte/validação de DTO. Colisão: nenhuma com trilho; a "regra" é tabela de lei (LEGAL-PARAMS), não engine
([[R-motor-regras]]).

| # | Automação | Tipo | Base legal | Depende de |
|---|---|---|---|---|
| 1 | **Combo itemizado com alocação fiscal do desconto** (regra do dono, 20/10): catálogo de kits com itens e preço de catálogo por item; o desconto do combo (soma de catálogo − preço do combo) é alocado **primeiro aos itens de maior carga tributária, até o piso = custo** (custo médio do estoque FIN-10, nunca abaixo), e o resto aos demais; nenhum item sobe acima do catálogo; o rateio proporcional fica como alternativa; cada item vai ao documento fiscal com o seu preço e o desconto incondicional destacado; a ordem de carga por item vem da tabela tributária (anexo/segregação no Simples; CST/NCM; alíquota IBS/CBS por item em 2027) | cálculo + bloqueio | LC 87 art. 13 I; LC 214 arts. 7º, 12 § 2º III, 13; LC 123 art. 3º § 1º e 18 § 4º-A; CTN 148 | SalesItems*, PackageCatalog, FIN-10 (custo), TABELA-TRIBUTARIA-PRODUTO, X10a/X10i (DF-e itemizada) |
| 2 | **Classificação principal + acessório** do kit (2027+) por regra declarada no catálogo (produto aplicado no serviço = acessório) | classificação | LC 214 art. 7º II/§ 2º | IBS-CBS-2027, TABELA-TRIBUTARIA-PRODUTO |
| 3 | **Segregação automática** por NCM do produto (monofásico 33.03–33.07 exc. 33.06; ICMS-ST pela UF) em vez de manual | cálculo | LC 123 art. 18 § 4º-A; Lei 10.147 | X14 ✅, TABELA-TRIBUTARIA-PRODUTO (NCM) |
| 4 | **Simulador de fator r**: folha/receita dos 12 meses, quanto falta para 28 %, custo de elevar folha × economia de Anexo V→III; alerta de cruzamento | simulação + alerta | LC 123 art. 18 §§ 5º-J/K/M | X14 ✅, folha (⚫) ou pró-labore manual |
| 5 | **Simulador de regime** Simples × Presumido × Real (e 2027 com CBS/IBS) sobre os 12 meses reais do razão; alerta de sublimite/teto (R$ 78 mi já é nó) | simulação | LC 123; Lei 9.718 arts. 13–14; LC 214 | X7 ✅, X14 ✅, IBS-CBS-2027 |
| 6 | **Salão-parceiro**: alerta quando há profissional sem contrato homologado recebendo cota (receita indevidamente no salão) e quando a parceria está formalizada mas a nota não separa a cota | alerta | Lei 12.592 art. 1º-A §§ 5º/8º | X14 ✅ |
| 7 | **Retenções sofridas → compensação** automática na apuração (IRRF/CSRF/INSS/ISS retidos na fonte nos recebimentos) | cálculo | RETENCOES-FONTE | F1 |
| 8 | **Pró-labore × dividendos × JCP**: simulador de remuneração do sócio (INSS/IRPF do pró-labore × IRRF 10 % de dividendos Lei 15.270 × JCP dedutível) com limite legal | simulação | IRRF-DISTRIBUICAO (BRIEF) | F1 |
| 9 | **Créditos e exclusões** no Lucro Real até 12/2026 (exclusão do ICMS da base PIS/COFINS, Tema 69) e, de 2027, crédito amplo de IBS/CBS por nota de entrada com alerta de crédito não tomado | cálculo + alerta | STF Tema 69 (I); LC 214 | X8 ✅, IBS-CBS-2027, MANIFESTACAO-DFE |
| 10 | **Guarda anti-simulação**: bloqueio de item abaixo do piso, de desconto não documentado, de "transferência de preço" entre itens; trilha de quem justificou | bloqueio | CTN 148/149; Lei 8.137 | 1 |
| 11 | **Relatório de economia**: por mês, o que foi economizado por prática lícita, com artigo citado — para o contador assinar | relatório | — | RB-CONTABIL (F3) |

**Não entra** (ilícito ou sem substância): realocação de preço entre itens; folha/pró-labore "de papel" para cruzar o
fator r; parceria sem contrato homologado; desconto condicional lançado como incondicional; fracionamento artificial de
empresa para ficar no Simples (LC 123 art. 3º § 4º III, IV e IX [D04], V: sócio em outra empresa do Simples com receita
global acima do limite, mais de 10 % em empresa fora do Simples, ou cisão nos 5 anos anteriores — o sistema pode **alertar**
pelo cadastro de sócios do IRRF-DISTRIBUICAO).

**Sessão:** `sessao-planejamento` → PRE-ADR `ADR-INCR-EFICIENCIA-FISCAL` + BRIEF com os 11 itens acima como comportamentos;
forks prováveis: piso de preço (custo × margem × tabela), rateio padrão (proporcional × manual com justificativa), quem
aprova a sugestão (ADMIN × contador do GOV-CONTADOR), e as ambiguidades A1–A3 do dossiê ao contador.
