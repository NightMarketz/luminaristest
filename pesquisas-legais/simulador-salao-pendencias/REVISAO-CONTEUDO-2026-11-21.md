# Revisão do conteúdo informativo do Simulador Tributário do Salão (21/11/2026)

Artifact: https://claude.ai/artifact/4T2JYWqnJXm9e6p2aUfDLu. Revisei a **v46** (id 1795277394-6b76, 281.073 bytes, idêntica byte a byte a `simulador-v46.html` desta pasta). Li o arquivo inteiro. **Não editei o artifact.**

**Resumo:** 26 achados, R01 a R26. Três estão errados perante a lei (R01, R02, R03). Há uma família de textos fixos que supõem o Simples e ficam falsos com a página no Presumido ou no Real (R06 a R09). E há textos velhos depois das versões 44 a 46 (R10 a R14).

Todos os achados vão à caixa com `--rodada revisao-conteudo-simulador` (ids na tabela do §5). Os nits de clareza ficam agrupados em uma lacuna só, a R21.

**Legenda.** Grau: **V** = verificado (trecho literal do dossiê ou do acervo, ou leitura do CALC); **I** = inferido; **A** = assumido. As fontes `[dossiê Dnn]` apontam para `pesquisas-legais/<dossiê>/relatorio.md`. O dossiê novo desta revisão é `pesquisas-legais/revisao-conteudo-simulador-salao` (D01: Lei 12.592 do acervo, compilada, sem alerta).

## 1. Lei e número

| # | Local (aba · trecho literal) | O que está errado | Correção proposta · fonte | Grau | Lacuna |
|---|---|---|---|---|---|
| R01 | Aba 5 com a página no Presumido ou no Real (`lucroReg`): "com a retenção de 10% sobre o que passar de R$ 50 mil por mês a um sócio (Lei 9.250 art. 6º-A)" | A lei manda reter 10% **sobre o total** pago no mês quando ele passa de R$ 50 mil. A aba 5 no Simples e a aba 7 já dizem "sobre o total"; esta frase as contradiz. O mesmo vale para o cartão "Pró-labore × lucro", que diz que o lucro "pode sair como lucro, sem retenção" sem a ressalva dos R$ 50 mil. | "com a retenção de 10% sobre o total pago no mês ao sócio que receber mais de R$ 50 mil no mês (Lei 9.250 art. 6º-A, red. Lei 15.270)". No cartão, acrescentar "até R$ 50 mil por mês por sócio". [parecer-salao-sp-4-pessoas D15: "à alíquota de 10% (dez por cento) sobre o total do valor pago"] | V | ver §5 |
| R02 | Insumos, campo "Origem da compra de fora": "Para o Simples, SP usa 12% em qualquer origem (RICMS art. 115 § 8º)" | O § 8º tem dois itens: 4% para a mercadoria importada da Res. Senado 13/2012 e 12% para as demais. A própria opção do campo ("Importado… (4%)") e o texto da seção ICMS ("12% … em qualquer origem, ou 4% no importado") contradizem esta ajuda. | "Para o Simples, SP usa 12% em qualquer origem, ou 4% no importado da Res. Senado 13/2012 (RICMS art. 115 § 8º itens 1 e 2)." [insumos-salao-sp D20] | V | ver §5 |
| R03 | Aba 4, aviso abaixo dos 6 requisitos: "N de 6 itens faltando. Sem contrato formalizado, ou com o parceiro em outra função, a lei considera o cabeleireiro empregado (art. 1º-C). Aí o cenário volta a ser o da CLT…" | (a) O aviso aparece quando falta **qualquer** item, inclusive o CNPJ (c3) e a nota (c5). Esses dois não geram vínculo: sem CNPJ, a cota volta à receita (Res. CGSN 140 art. 2º § 5º VI), e a página diz em outro lugar que a Lei 12.592 não exige CNPJ (§ 7º). (b) O art. 1º-C liga os incisos com **"e"** ("I - não existir contrato … ; e II - … funções diferentes"); a página e o parecer leem "ou". | Separar o aviso por item: c1, c2 e c4 → risco de vínculo (art. 1º-C); c3 → a cota volta à receita do salão; c5 e c6 → obrigação fiscal do salão, sem vínculo. Na aba 7, pôr a ambiguidade "e" × "ou" ("I e II são cumulativos, ou basta um?"), com a leitura segura "basta um". [revisao-conteudo-simulador-salao D01, art. 1º-C e § 11; parecer §2] | V no texto da lei; I na leitura | ver §5 |
| R04 | Aba 6: "Dados de 2026 no PGDAS-D (jan a mar de 2027) · substitui a DEFIS: art. 72 revogado e art. 38-B da Res. CGSN 140 (Res. CGSN 190)" | A página afirma como fato o que o dossiê marca como **leitura (I)**: o art. 38-B vale desde 01/01/2027 e fala do "ano-calendário anterior". | Manter a data e acrescentar "leitura da pesquisa: confirme com o contador se os dados de 2026 já vão no PGDAS-D ou ainda na DEFIS". [parecer D37, art. 38-B § 1º; parecer linha "Leitura (I)"] | V (o grau do dossiê) | ver §5 |
| R05 | Aba 6 com a página no Presumido ou no Real: "A cada serviço · NFS-e pelo Emissor Nacional · Res. CGSN 140 art. 59" | O art. 59 § 1º obriga só o **optante** do Simples ao Emissor Nacional. Fora do Simples, em SP capital, a nota é a NFS-e Paulistana. Essa informação vem da memória `nfse-nacional-fontes-oficiais`, não de dossiê. | Condicionar a linha ao regime. Fora do Simples: "NFS-e pelo sistema da Prefeitura de SP", com a fonte municipal, depois de conferir pelo método oficial. [parecer D13 art. 59 § 1º: "O optante … utilizará, obrigatoriamente…"] | I (a regra de fora do Simples não foi lida em dossiê) | ver §5 |
| R20 | Ficha, "Gastos pessoais do sócio pagos pelo salão": "(IN RFB 1.700 arts. 68 e 83)"; no LALUR: "Gastos pessoais do sócio (A.069)" | O campo junta duas linhas da tabela do dossiê: despesa não necessária (A.069; IN arts. 68 e 69) e bem do sócio (A.050; IN art. 83; Lei 9.249 art. 13 II e III). A citação pula o art. 69, o A.050 e a Lei 9.249. | "(IN RFB 1.700 arts. 68, 69 e 83; Lei 9.249 art. 13 II e III)" e, no LALUR, "(A.069 e A.050)". [salao-lucro-real-adicoes-exclusoes, tabela linhas 7 e 8] | V | ver §5 |
| R26 | Aba 6: "10/07 · TFE do ano · …, em até 4 parcelas (Lei SP 13.477 art. 22 § 3º)"; ficha: "TFE 2026 …: R$ 236,35 … (Lei SP 13.647; tabela da SF)" | O § 3º só fixa a parcela mínima de R$ 50. A página da SF fala em "no máximo 5 parcelas"; o "até 4" sai de R$ 236,35 ÷ R$ 50. Na ficha falta a lei que institui a TFE (13.477); a 13.647 só limita o valor. A aba 7 cita as duas. | Aba 6 (revisto na 2ª passada: o "até 4" é a conta do dossiê, R$ 236,35 ÷ mínimo de R$ 50, e está certo): "em até 4 parcelas: a SF aceita até 5, mas nenhuma pode ser menor que R$ 50 (página da SF; Lei SP 13.477 art. 22 § 3º)". Ficha: "(Lei SP 13.477; limite da Lei SP 13.647; tabela da SF)". [parecer D39, D47, D55] | V | ver §5 |

**Conferidos e certos** (o caso adversarial que tentei contra cada um e o que deu):
- **Lei 12.592 art. 1º-A § 11**, citado para "não há vínculo de emprego". Achei que fosse o art. 1º-D. O acervo confirma o § 11: "não terá relação de emprego ou de sociedade" [revisao D01].
- **§§ 3º, 5º, 6º, 7º, 8º e 10 (7 incisos) da Lei 12.592:** batem [D01].
- **Res. CGSN 140 art. 145 § 1º** ("relativo ao IRPJ"): bate [parecer D13].
- **IN RFB 2.003 art. 3º § 1º I** (ECD no Simples): bate [parecer D21].
- **LC 214 art. 349 § 2º** (22/12): bate. A notícia do Senado fala em 15/12, mas a página segue a lei [parecer D11, D33].
- **RAT de 2% do CNAE 9602-5/01:** bate [parecer D40].
- **Meses da opção pelo regime regular, "set e mar":** batem. O § 11 traz "setembro e abril", mas a Res. CGSN 190 art. 40-D fixa março [parecer].
- **TCU 11,3% e "alíquota menos 0,1 ponto":** batem [parecer D33, art. 347].
- **"Seguro + Social", cl. 27ª, até o dia 10:** bate [parecer D56].

## 2. Texto × conta (o que o texto diz que o CALC faz)

| # | Local · trecho | O que está errado | Correção proposta · fonte | Grau | Lacuna |
|---|---|---|---|---|---|
| R06 | Aba 3, aviso: "Sem empregado CLT: não há DCTFWeb de folha." | Com pró-labore ou com retenção de parceiro sem CNPJ continua havendo DCTFWeb (INSS de contribuinte individual). A aba 6 mostra a DCTFWeb sempre. | "Sem empregado CLT: a DCTFWeb só é devida se houver pró-labore ou retenção de parceiro sem CNPJ." Conferir a hipótese de dispensa na IN RFB 2.237 pelo método. [parecer D14, arts. 3º I e 6º] | I | ver §5 |
| R07 | Aba 3, aviso do pró-labore: "A parte patronal de 20% está no DAS." Ficha, "Pró-labore": "a parte patronal está no DAS (IN RFB 2.110 arts. 37 II e 41 I)" | No Presumido e no Real o CALC cobra "INSS s/ pró-labore" de 20% fora do DAS (`folhaIt`). O cartão do sócio já condiciona ao regime; estes dois textos não. | "No Simples, a parte patronal está no DAS; no Presumido e no Real, são 20% em guia própria." | V (CALC) | ver §5 |
| R08 | Aba 3, abertura: "o INSS patronal de 20% já está dentro do DAS"; aba 5, abertura: "O lucro que o Simples distribui aos sócios é isento… Sem contabilidade, a lei põe um teto nessa isenção." | São textos fixos. Com a página no Presumido ou no Real ficam falsos: no Real não há teto presumido, como diz a própria aba 5. | Trocar por frases neutras ("no Simples, …; fora dele, …") ou gerá-las pelo regime aplicado. | V (render) | junto com R07 |
| R09 | Aba 1, cartão Presumido: "32% do que os clientes pagam"; Base legal: "adicional de 10% sobre a presunção de 32%"; aba 7: "A conta usa 32%." | Em 2027 a presunção vem do campo "Presunção do IRPJ e da CSLL em 2027" (`presF`). Com outro valor no campo, os três textos ficam errados. | Ler `presF` (ou dizer "32% em 2026; em 2027, o valor do campo da ficha"). | V (CALC) | junto com R07 |
| R11 | Cadastros, Equipamentos vazio: "no Lucro Real ela também sai do lucro tributável e dá crédito"; aba 1, O que esta conta supõe: "No Presumido de 2026 e no Simples ela não muda o imposto"; cartão Real: "crédito de aluguel…, energia e insumo do serviço" | Em 2027 a depreciação dá crédito de CBS/IBS no Presumido, no Real **e** no Simples com a opção pelo regular (`consumo()` de 2027 desconta `depB27` em todos os regimes). O cartão Real não cita o crédito sobre a depreciação de 2026 (Lei 10.833 art. 3º VI), que a conta usa. | Equipamentos: "no Lucro Real ela também sai do lucro tributável; o crédito vem em 2026 no Real e, em 2027, no Presumido, no Real e no Simples com CBS/IBS por fora". Suposições: "no Simples que paga tudo no DAS…". Cartão Real: acrescentar "e depreciação (art. 3º VI)". [salao-depreciacao-equipamentos] | V (CALC) | ver §5 |
| R12 | Cadastros, Despesas: "Marque 'dá crédito'… Só pesa fora do Simples." | Em 2027, o Simples com CBS/IBS por fora (SR) também usa o crédito das despesas. A aba DAS diz isso. | "Só pesa fora do Simples e, em 2027, no Simples com CBS e IBS por fora." | V (CALC; aba DAS) | junto com R11 |
| R13 | Ficha, "Rotatividade": "aviso prévio, 13º e férias do aviso, FGTS e multa de 40%"; `<footer>` (igual); cartão da Equipe: "aviso de N dias, 13º e férias dele, FGTS, multa de 40%, homologação"; Demonstrativo: "Provisão de rescisão (aviso prévio, multa do FGTS)" | `rescisao()` também soma o trintídio de 1/12 e, sem REPIS e com 1 ano ou mais, os R$ 150 de homologação. A "Base legal" da Equipe cita os dois; as outras descrições não. | Usar uma frase só em todas: "aviso prévio, 13º e férias do aviso, FGTS, multa de 40%, trintídio de 1/12 e, sem REPIS, homologação". [salao-provisao-rescisao §1] | V (CALC) | ver §5 |
| R14 | Aba 1, O que esta conta supõe (li Real): "…no quadro da aba Lucro"; aba DAS fora do Simples: "(quadro do LALUR na aba Lucro)" | `lalurTab` só desenha o quadro com a página no **Real**. Com a página no Simples (Base legal da aba 1) ou no Presumido (aba DAS), a promessa aponta para um quadro que não existe. | "no quadro da aba Lucro, com a página no Lucro Real"; na aba DAS, mostrar o trecho só quando `c.reg==="RE"`. | V (render) | ver §5 |
| R17 | Ficha, rótulo "Telemedicina + Seguro Social da convenção"; aba 3, cartão "Telemedicina + Seguro Social"; aba 3, Total: "Cesta, telemedicina e Seguro Social da convenção" | (a) O benefício da CCT chama-se "Seguro + Social" (cl. 27ª), como na aba 6. "Seguro Social" se lê como INSS. (b) A linha do Total soma o convênio odontológico (`tele = ben + odo`), mas o rótulo não o nomeia. | Usar "Seguro + Social" em toda a página. Total: "Cesta, telemedicina, Seguro + Social e odontológico da convenção". [parecer D56] | V | ver §5 |

## 3. Coerência entre abas

| # | Local · trecho | O que está errado | Correção proposta · fonte | Grau | Lacuna |
|---|---|---|---|---|---|
| R10 | Aba 7, abertura: "…as respostas da pesquisa e os dois pontos com mais de uma leitura." | "Ainda é decisão" tem **nove** perguntas depois das versões 44 a 46. | "…e os pontos que ainda têm mais de uma leitura." | V | ver §5 |
| R18 | Ficha, "Revenda em cosmético (NCM 33.03 a 33.07)": "o resto do cosmético, 25%"; Insumos, ICMS: "25% para cosmético 33.03, 33.04, 33.05 e 33.07, exceto xampu 33.05.10; 18% para o resto" | Cada aba enuncia a exceção dos 18% de um jeito. A ficha põe desodorante (33.07.20) e antissolar nos 18%; a aba Insumos põe 33.07 inteiro nos 25%. A faixa da ficha inclui a 33.06 (higiene bucal), que não está na lista dos 25% do próprio CALC (comentário de `INS_LEI`). | Uma frase única nas duas abas: "25% para 33.03, 33.04, 33.05 e 33.07, exceto xampu 33.05.10, desodorante 33.07.20 e antissolar; 18% para o resto, inclusive 33.06 (Lei SP 6.374 art. 34)". Conferir no dossiê a posição 33.06 e o antissolar. [insumos-salao-sp D17] | I | ver §5 |
| R19 | Aba 4, abertura: "Assistente e recepcionista ficam de fora: são empregados."; aba 4: "Assistente e recepcionista ficam na CLT nos dois"; cartão da sugestão: "Assistente e recepcionista ficam na CLT (Lei 12.592 art. 1º-A)" | O CALC também deixa o **gerente** fora da parceria (`PARC_NAO`), e a nota dos Cadastros o nomeia. | Acrescentar "e gerente" nas três frases. | V (CALC) | junto com R03 |
| R15 | Aba 4, aviso "Parceiro sem CNPJ": "como manda a Lei 12.592 art. 1º-A § 5º, que não põe a condição do CNPJ (I)." | O "(I)" é a marca de grau "inferido" do dossiê, vazada para a página. | Tirar o "(I)" ou escrever "pela leitura da pesquisa". | V | ver §5 |

## 4. Clareza para o dono do salão

| # | Local · trecho | Problema | Proposta | Grau | Lacuna |
|---|---|---|---|---|---|
| R16 | Insumos, cartão "Contabilidade": "O Luminaris hoje lança o insumo como despesa… lacunas L-…-35d3 e L-…-f79c"; rodapé da aba: "dossiê pesquisas-legais/insumos-salao-sp (relatorio.md, D01 a D31)" | São referências internas do projeto numa página para o dono do salão. O id de lacuna, ainda por cima, aparece truncado. | Tirar a frase sobre o Luminaris e as lacunas, que continuam na caixa. Deixar os dossiês só no `<footer>`. | V | ver §5 |
| R21 | Vários pontos: códigos A.178, A.058, A.069, A.163, E.043, E.125, "Parte B do LALUR", GARE, "CPR 1200", FPAS, VRE, DCTFWeb, MOS; "1 parceira / 2 parceiras" (resumo da equipe na ficha) × "parceiro" no resto; Insumos, Real: "reduz o IRPJ e a CSLL em até R$ X (15% + 9%, mais 10% de adicional…)", em que X é 24% e o "mais 10%" contradiz o "em até"; `<footer>` com "Lei 10.666" citada duas vezes | Jargão sem explicação e frases ambíguas. | Glossário curto recolhido (o "As siglas:" da aba 1 é o modelo) que cubra os códigos do LALUR e as guias. Usar "parceiro" em toda a página. Insumos: "reduz o IRPJ e a CSLL em R$ X (24%), ou até 34% com o adicional". Tirar a duplicata do rodapé. | V | ver §5 |

## 5. Lacunas registradas

Todas com `--rodada revisao-conteudo-simulador`. Os ids abaixo são os que o `lacunas.mjs add` devolveu. Não dupliquei as que já existiam:
- 368c: DIFAL do RPA, ligado a R02 só pelo texto.
- ec55: ECD fora do Simples, que a aba 5 já remete ao contador.
- 967b: convenções diferentes de crédito em 2027.
- 3f49: limite por RBT12.

| Achados | Lacuna |
|---|---|
| R01 (10% sobre o total; cartão "sem retenção") | L-20261121-163215-8890 |
| R02 (12% ou 4%) | L-20261121-163230-3c1b |
| R03 + R19 (aviso dos 6 requisitos; "e" × "ou"; gerente) | L-20261121-163245-d3bf |
| R04 (DEFIS: leitura como fato) | L-20261121-163300-693c |
| R05 (NFS-e fora do Simples) | L-20261121-163315-fe42 |
| R06 (DCTFWeb sem CLT) | L-20261121-163329-a600 |
| R07 + R08 + R09 (textos fixos que supõem Simples ou 32%) | L-20261121-163344-7ebe |
| R10 (aba 7, "dois pontos") | L-20261121-163358-2945 |
| R11 + R12 (crédito da depreciação e das despesas em 2027) | L-20261121-163411-38c6 |
| R13 (descrição da provisão de rescisão) | L-20261121-163424-ee62 |
| R14 (promessa do quadro do LALUR) | L-20261121-163439-079e |
| R15 + R16 (marca "(I)" e referências internas) | L-20261121-163454-add7 |
| R17 ("Seguro + Social"; odontológico no total) | L-20261121-163509-db88 |
| R18 (NCM e ICMS de 25% × 18%) | L-20261121-163525-b9d2 |
| R20 + R26 (citações incompletas: gastos do sócio; TFE) | L-20261121-163539-c365 |
| R21 (glossário e nits) | L-20261121-163554-300d |

## 6. Depende do item 7 (meses do ano): listado, não registrado

A sessão do item 7 reescreve estas frases. Ficam aqui para ela conferir quando o modo "mês a mês" ou "sazonalidade" entrar:
- topo: "12 meses iguais";
- aba 1: "O valor por ano supõe os 12 meses iguais ao da ficha" e "Com meses iguais, o trimestre e a estimativa mensal dão o mesmo";
- ficha: "com meses iguais, a conta usa até 1/12 do saldo por mês" (prejuízo fiscal);
- Equipamentos: "com meses iguais, a conta supõe a reposição de cada bem";
- aba 1, li depreciação de 2027: "com meses iguais, a conta supõe a compra de reposição";
- Demonstrativo: "com meses iguais";
- `<footer>`: "A conta supõe receita igual nos 12 meses";
- aba DAS: "Vazio: 12 × a receita do mês da ficha".

## 7. Não conferido nesta revisão (grau A para o texto da página)

Confirmei que cada citação abaixo aparece no dossiê correspondente, mas não comparei a frase da página com o trecho literal:
- **Equipe:** Lei 605 art. 7º; Súmulas 27 e 203; CLT arts. 129, 579 a 583.
- **Encargos e retenções:** IN RFB 2.110 arts. 30, 34, 37, 41 e 84; Lei 11.196 art. 70 I "e"; IN RFB 2.237 arts. 5º a 7º.
- **Simples e documentos:** Res. CGSN 140 arts. 2º § 8º, 16, 22, 24, 25 § 18, 38-A, 40, 40-D, 59, 63, 77 e 100; RICMS/SP arts. 19, 112 e 115.
- **Contabilidade:** NBC TG 1002 itens 3.6, 5.1, 13.2, 13.6, 28.2, 28.5 e 29.3.
- **LC 214:** arts. 12, 13, 47, 57, 251, 261, 344, 347, 517 e 542.
- **Lucro Real:** os A./E. do LALUR.

Os dossiês que fizeram essas leituras ficam no `<footer>` da página. Não abri `das-espelho-guia`, `simples-regime-caixa`, `irrf-distribuicao`, `fer-sp-feriados-locais`, `pc1-vencimento-darf-irpj-csll`, `lc224-sobra-limite` nem `insumo-lucro-real-custo`. Por isso as citações das abas 2 e 6 que dependem deles ficam com grau A aqui, sem achado.

## 8. Caso adversarial e checagem que teria falhado
- **§ 11:** apostei que estava errado (seria o art. 1º-D). O acervo derrubou a aposta, e o achado saiu do relatório.
- **R01:** se a lei dissesse "sobre o excedente", o D15 teria outra redação. A citação literal "sobre o total do valor pago" sustenta o achado.
- **R02:** o trecho literal do § 8º tem os dois itens, 4% e 12%.
- **R07, R11 e R14:** a leitura do CALC é a checagem, nas linhas `folhaIt`, `consumo()` de 2027 e `lalurTab` (`if(... c.reg!=="RE") return ""`).
- **R05 e R06:** são inferidos e precisam de pesquisa pelo método antes de virar texto.

## 9. Correções preparadas (21/11, à tarde): `patches/p11_revisao_conteudo.py`

A pedido do dono ("continua corrigindo"), escrevi as correções de R01 a R26 como patch reaplicável. É só texto: o CALC fica idêntico, salvo o rótulo do LALUR "Gastos pessoais do sócio (A.069 e A.050)". As frases de "meses iguais" (§6) ficaram de fora. **Não publiquei:** a sessão do item 7 está mexendo no artifact agora, e uma publicação paralela criaria versões concorrentes.

- **Testado:** `python patches/p11_revisao_conteudo.py` aplica em uma cópia da v46 e todos os trechos casam com a contagem esperada. O JS passa no `node --check`. Abri a página no Playwright headless em Simples, Presumido e Real: nenhum erro de página.
- **Textos novos que conferi na tela:** aviso por efeito na aba 4 (com só o CNPJ faltando, sai o aviso da receita e não o de vínculo); NFS-e condicionada ao regime; ressalva da DEFIS; "10% sobre o total"; quadro do LALUR só no Real; pergunta nova "Parceria: quando nasce o vínculo" na aba 7.
- **R06 conferido no texto da norma:** a IN RFB 2.237 obriga toda pessoa jurídica (art. 3º I). Sem fato gerador, entrega a declaração sem movimento do 1º mês e depois fica dispensada (art. 6º § 2º II) [parecer D14, docs/D14].
- **R05 corrigido sem afirmar o emissor do regime normal:** a página passa a dizer só o que a fonte prova (art. 59 § 1º é do optante) e manda confirmar o emissor.
- **Para publicar:** aplicar o p11 depois dos p10* na versão que a sessão do item 7 publicar. Se algum trecho tiver sido reescrito, o `_pt.aplica` para com a contagem. Depois, marcar as 16 lacunas como resolvidas com destino "artifact vNN (p11 revisao-conteudo v1)".

## 10. Segunda passada (21/11, fim da tarde)

**Versão publicada agora: 1795280641-a69d** (286.369 bytes). Contra a v46, mudou **só o gráfico** da aba Regime, que passou a usar Recharts com reserva em SVG: Tailwind, React e Recharts no cabeçalho, `graficoSvg`/`GraficoRC`/`rcMount`. Nenhum texto informativo mudou. Os patches do item 7 (p10a a p10e) estão escritos em `patches/`, mas **ainda não foram publicados**.

**p11 sobre as bases possíveis** (todas testadas):
- versão atual sozinha: aplica;
- versão atual + p10a…p10e + p11: a cadeia inteira aplica;
- página no Playwright em Simples, Presumido e Real: nenhum erro;
- com rotatividade de 25%: o Demonstrativo e os cartões da Equipe mostram a descrição nova da provisão, com o trintídio.

**R26 corrigido no p11.** O "até 4 parcelas" da TFE é a conta do próprio dossiê e estava certo. Faltava só a fonte do teto de 5 da SF.

**Texto novo do item 7 (p10d e p10e): conferido, sem achado.** Bate com a tabela de citações de `salao-trimestre-adicional-irpj`:
- adicional sobre R$ 20 mil × meses do período (Lei 9.249 art. 3º § 1º);
- trimestre (Lei 9.430 art. 1º) e Presumido trimestral (art. 25);
- estimativa até o último dia útil do mês seguinte (art. 6º) e saldo em março (art. 6º § 1º I);
- balancete de suspensão (Lei 8.981 art. 35);
- CSLL pela regra do art. 28 com 32% (Lei 9.249 art. 20 I);
- compensação até 30% por período (Lei 9.065 arts. 15 e 16).

As frases de "meses iguais" do §6 ganham ressalva nos dois modos.

**§7 reduzido.** Agora conferidos contra o trecho literal da tabela de citações (grau V):

| Citação | Fonte |
|---|---|
| FGTS dia 20 (Lei 8.036 art. 15) | parecer D04 |
| Contribuição sindical (CLT arts. 579, 582 e 583) | D06 |
| VT sem natureza salarial (Lei 7.418 art. 2º); VT não pago em dinheiro (Decreto 10.854 art. 110) | D41, D42 |
| Inscrição antes de vender (RICMS/SP art. 19) | D71 |
| CF-e-SAT vedado desde 01/01/2026 | D70, Portaria CAT 147/2012 art. 34-D |
| Livro Caixa dispensado (Res. CGSN 140 art. 63 § 3º) | D13 |
| DAS no dia 20 (art. 40) | D13 |
| Teto do INSS por portaria (IN RFB 2.110 art. 30 § 2º) | D34 |
| MEI até R$ 81 mil (LC 123 art. 18-A § 1º) e cota inteira do parceiro MEI (Res. CGSN 140 art. 100 § 6º) | D01, D13 |
| Receita de 2026 pela prestação (art. 2º § 8º) e cartão no caixa (art. 77 § 3º) | D13 |
| Demonstrações (NBC TG 1002 item 3.6); DAS como dedução (itens 28.5 e 29.3) | D16 |
| Teto isento pelo IRPJ (Res. CGSN 140 art. 145 § 1º) | D13 |
| DIFAL do optante (LC 123 art. 13 § 1º XIII "h"); DIFAL do remetente para não contribuinte (Lei SP 6.374 art. 7º § 2º item 2) | insumos D01, D13 |
| Fim da ST em 01/04/2026 (Portaria SRE 94/2025) | insumos D18/D19 |
| Dedução de material só nos subitens 7.02 e 7.05 (LC 123 art. 18 § 23) | insumos D01/D08 |
| ISS sem dedução (Lei SP 13.701 art. 14) | insumos D31 |
| Revogação da Lei 10.147 (LC 214 art. 542 XI) | insumos D09 |
| Kit vendido = Anexo I (Res. CGSN 140 art. 25 § 18 II) | insumos D10 |
| Segregação do monofásico (LC 123 art. 18 § 4º-A I) | insumos D01 |

Seguem só com presença no dossiê, sem trecho literal comparado:
- **Equipe:** Lei 605; Súmulas 27 e 203.
- **IN RFB 2.110:** arts. 34, 37, 41 e 84.
- **Lei 11.196 art. 70 I "e":** o dossiê dá "dia 20, antecipa", que bate com a página.
- **Res. CGSN 140:** arts. 22, 24 e 38-A.
- **LC 214:** arts. 12, 13, 47, 57, 251, 261, 344, 347 e 517.
- **LALUR:** os A./E.

Os sete dossiês não abertos (§7) continuam não abertos.
