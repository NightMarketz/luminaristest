# Relatório de pesquisa legal — lc224-sobra-limite

**Pergunta:** LC 224/2025 e IN RFB 2.305/2025 art. 15 §§ 4º-5º: a diferença não usada do limite trimestral (R$ 1,25 mi) acumula de trimestre em trimestre (memória: sobra = limite + sobra anterior − receita) ou só passa ao trimestre seguinte (tabela dinâmica da ECF: 25140 = 1,25 mi + 25170 do trimestre anterior, 25170 = 1,25 mi − receita)? O ajuste do § 5º no T04 reconcilia o ano?
**Aberto em:** 2026-11-03T19:22:04-03:00 · **Atualizado em:** 2026-11-03T19:29:10-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**A memória está certa. A fórmula do PVA é mais estreita que a norma, e o código não muda.**

- **IN RFB 2.305/2025 art. 15 § 4º** (redação da IN 2.306/2026) [D02, extrato A1]: *"No trimestre em que a receita
  bruta for inferior ao limite proporcional previsto no § 2º, a diferença poderá ser considerada para fins de apuração do
  limite aplicável aos trimestres subsequentes do mesmo ano-calendário."* A norma diz "trimestres subsequentes", no
  plural, e não "o trimestre seguinte". A diferença de um trimestre vale para todos os trimestres seguintes do ano, e
  não só para o próximo. A LC 224 art. 4º § 5º I diz o mesmo de forma genérica: *"permitido o ajuste nos períodos
  seguintes"* [D01, D04]. O P&R v5 da RFB (item 11) repete a lei e não detalha o transporte [D03].
- **Memória** (`parcelaExcedenteLc224`, `taxAssessmentCalc.ts`): sobra = max(0, limite + sobra anterior − receita). A
  sobra não usada se acumula de um trimestre para o outro, e o que um trimestre consome sai da sobra. Essa é a leitura do
  § 4º ratificada no BRIEF X7-A (l. 171: *"a sobra não usada dos trimestres anteriores (§ 4º)"*; F-TA-3 a, dono, 02/10).
- **Tabela dinâmica da ECF** (leiaute 12, 28/05/2026) [extrato A2]: a P200 25140 é `CNA`, calculada pelo PVA e não
  alterável pelo contribuinte, e vale 1.250.000 + P200("25.170"; trimestre anterior). Já a 25170 vale 1.250.000 −
  P200("25.110"), só do próprio trimestre. A diferença de um trimestre passa, portanto, **só ao trimestre seguinte**. A
  própria orientação da 25170 diz o contrário da fórmula: *"pode ser acumulado para período(s) seguinte(s)"*.

**Caso medido** (IRPJ 2026, serviço, receita de R$ 1 mi no T01 e no T02 e de R$ 2 mi no T03; memória **verificada** rodando `apurarPresumidoTrimestral`
em sequência num teste descartável (03/11: T03 com `LC224_SOBRA_ANTERIOR` = 0,5 mi e `LC224_EXCEDENTE` = 0,25 mi; T04 = 1 mi ⇒
`LC224_ACERTO_T04` = R$ 2.000,00; T04 = 2 mi ⇒ `LC224_EXCEDENTE` = 0,75 mi); PVA **verificado** só na leitura da fórmula):

| | T01 | T02 | T03 |
|---|---|---|---|
| Diferença do § 4º (1,25 mi − receita) | 0,25 mi | 0,25 mi | — |
| Limite do trimestre: memória (= IN, plural) | 1,25 | 1,25 + 0,25 = 1,50 | 1,25 + 0,25 + 0,25 = **1,75** |
| Limite do trimestre: PVA (25140) | 1,25 | 1,25 + 0,25 = 1,50 | 1,25 + 25170(T02) 0,25 = **1,50** |
| Parcela excedente: memória / PVA | 0 / 0 | 0 / 0 | **0,25 / 0,50** |

No T03, o PVA perde a diferença do T01 (R$ 250 mil) e calcula o acréscimo sobre o dobro da parcela que a IN manda.

**O § 5º do T04 reconcilia o ano, mas não o trimestre.**
- Memória (`parcelaExcedenteLc224`, ramo T04): limite anual = 4 × 1,25 mi (§ 9º), E = receita acumulada − limite anual,
  e S = soma das parcelas excedentes do T01 ao T03.
  - Ramo III (E ≥ S): T04 = E − S, e o ano fica com E.
  - Ramo II ou I (E < S): o T04 fica sem acréscimo, e cada trimestre é recalculado na razão E/S, com dedução no T04. O ano
    também fica com E.
  - Conferido no caso com T04 = R$ 1 mi (E = 0, ramo I, o ano fica com 0) e com T04 = R$ 2 mi (E = 1 mi, S = 0,25,
    T04 = 0,75, o ano fica com 1,0).
- PVA: o § 5º exige o recálculo, e o PVA o recebe pela linha `E` P300 14.10 / P500 12.10 *"(-) Tributo Pago em
  decorrência da Lei Complementar 224/25"* [A2; D02 da pc1], que o contribuinte digita no último período. No ramo I/II, o
  ano fecha se o contribuinte informar a 14.10. **Inferido:** não rodei o PVA.
- Em ambos, a soma do ano é a parcela excedente anual. O T03, porém, sai diferente: o DARF e a DCTFWeb do T03 pela
  memória, que segue a IN, ficam **menores** que o IRPJ do T03 que o PVA calcula na ECF. A 25140 é `CNA` e não aceita
  correção.

**Sem correção de código.** A memória segue a norma. Mudar a memória para imitar o PVA faria pagar acréscimo a mais no T03,
sem base na IN. O que sobra é a conduta diante da ECF (§ 4).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Limite proporcional com ajuste nos períodos seguintes | LC 224/2025 art. 4º § 5º I | [D01], compilada [D04] | "o limite proporcionalmente a cada período de apuração no ano, permitido o ajuste nos períodos seguintes" |
| Limite trimestral = R$ 1,25 mi, verificado na receita do trimestre | IN RFB 2.305 art. 15 § 2º (red. IN 2.306) | [D02] / A1 | "corresponde a R$ 1.250.000,00 (…) por trimestre e deve ser verificado considerando a receita bruta do respectivo trimestre" |
| Diferença do trimestre abaixo do limite vale para os seguintes | IN RFB 2.305 art. 15 § 4º (red. IN 2.306) | [D02] / A1 | "a diferença poderá ser considerada para fins de apuração do limite aplicável aos trimestres subsequentes do mesmo ano-calendário" |
| Acerto no último trimestre (ramos I, II, III) | IN RFB 2.305 art. 15 § 5º (incl. IN 2.306) | [D02] / A1 | "No último trimestre do ano-calendário, a pessoa jurídica deverá verificar o limite anual considerando a receita bruta acumulada" |
| P&R da RFB não detalha o transporte | P&R LC 224 v5 (30/07/2026), item 11 | [D03] | "sendo admitido ajuste nos períodos subsequentes" |
| Fórmula do PVA: só o trimestre anterior | Tabela dinâmica ECF L12, P200 25140 / 25170 | A2 | 25140: "1250000 + P200("25.170";"T02")" no T03; 25170: "(1250000 - P200("25.110"))" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - D01 (LC 224, versão "original"): conferido na compilada do Planalto [D04]. O § 5º está idêntico, e a única redação
    nova no art. 4º é a do § 8º V (LC 235/2026), que não trata do tema.
  - A IN 2.305 não está no acervo: foi lida na multivigente do SIJUT [D02]. O SHA-256 `635eb830…` é o mesmo da cópia de
    17/10 (dossiê `verif-2026-10-17-irpj-csll` [D14]), então nenhum ato posterior a alterou.
- **Redação atual / alterações posteriores:** art. 15 inteiro na redação da IN 2.306/2026 (vigente desde 23/01/2026).
- **Regulamentação pendente ou norma mais específica:** busca no SIJUT (03/11) por "limite proporcional" e por
  "2.305 acréscimo presunção limite" em 2026. Só voltaram a própria IN 2.306 e a SC Cosit 150/2026 (variação cambial no
  limite do Lucro Real, outro tema). Não há solução de consulta sobre o transporte da diferença. O leiaute 13 da ECF
  (ano-calendário 2026) ainda não saiu: o leiaute 12 é o que traz as linhas 25xxx.

## 4. Ambiguidades (só o que precisa de decisão humana)

### 4.1 Consumo da diferença (resolvida pela leitura da memória, registrada)
- **Leitura A (memória, ratificada no BRIEF X7-A):** a diferença acumula e o uso a consome. Exemplo: T01 = 0,5 mi deixa
  diferença de 0,75; T02 = 1,4 mi usa 0,15 dela; T03 tem limite de 1,25 + 0,60.
- **Leitura B (literal, sem consumo):** a diferença do T01 valeria inteira em todos os trimestres seguintes, e o T03
  teria limite de 1,25 + 0,75. Usaria o mesmo limite duas vezes. Descartada.
- **Leitura C (PVA):** só a diferença do trimestre anterior, e o T03 teria limite de 1,25. Contraria o plural do § 4º e a
  orientação da própria linha 25170.
- **Mais segura e fiel ao texto:** A.

### 4.2 Conduta quando a ECF diverge do DARF do trimestre (pergunta ao contador, só se o caso ocorrer)
O caso ocorre quando há dois ou mais trimestres seguidos abaixo de R$ 1,25 mi e depois um trimestre acima do limite, mas
abaixo do limite acumulado, num cliente que passa de R$ 5 mi no ano. Nesse caso, o IRPJ e a CSLL do trimestre na ECF,
pela fórmula `CNA` do PVA, saem maiores que os da DCTFWeb e do DARF, pela IN.
- (a) Manter o DARF pela IN e entregar a ECF como o PVA calcula. A diferença de trimestre aparece no cruzamento
  ECF × DCTFWeb, e o ano fecha pelo § 5º.
- (b) Pagar o T03 como o PVA calcula e recuperar no T04 pela P300 14.10. Isso paga a mais sem base legal, para não
  divergir da ECF.
- **Mais segura:** (a), porque a norma ampara o valor pago. O 1º cliente (salão, Simples ou Presumido abaixo de R$ 5 mi)
  não chega a esse caso, e o go-live é em 2027.
- **Pergunta ao contador, se o caso ocorrer:** "No Presumido com LC 224, o PVA calcula a P200 25140 do trimestre só com
  a sobra do trimestre anterior, enquanto a IN 2.305 art. 15 § 4º permite somar as sobras de todos os trimestres
  anteriores. Pagamos o T03 pela IN. Como a ECF mostra um IRPJ do T03 maior que o da DCTFWeb, entregamos assim e
  justificamos, ou existe outra conduta?"

## 5. Lacunas
- Não rodei o PVA. O efeito da P300 14.10 / P500 12.10 no T04, e o ramo da P200 25200 do último período, ficam
  **inferidos** pela leitura da fórmula (oráculo do H1). Uma observação: no último período, a 25200 usa toda a parcela
  excedente anual (25130 − 25180) quando a 25150 do T04 passa da 25160, e não "anual − anteriores", como no § 5º III. A
  reconciliação desse ramo depende da 14.10 levar os acréscimos já pagos. Isso não muda a conclusão do § 4º.
- Não achei solução de consulta, parecer ou ADI da RFB sobre o transporte da diferença em fonte oficial (SIJUT, 03/11).

**Extratos (não são fonte nova, são recortes legíveis):**
- `docs/A1_IN2305-art15-compilado-extraido-de-D02.txt`: segmentos não tachados do art. 15, tirados do JSON do [D02].
  SHA-256 `dd5901b6…46e7`. Os acentos saem como U+FFFD no próprio JSON do SIJUT.
- `docs/A2_tabela-dinamica-P200-25xxx-extraido-de-pc1-D02.txt`: linhas 25110–25200 da aba P200 da tabela dinâmica
  (`pesquisas-legais/pc1-memoria-calculo/docs/D02_…html`, XLSX, SHA-256 `366b8d90…3cac`). SHA-256 do extrato
  `970d34a3…3ec3b`.
- Buscas no SIJUT (navegador embutido, 03/11): `numero_ato=106&ano_ato=2026` (a SC Cosit 106/2026 é sobre SAF/TEF);
  `termoBusca="limite proporcional"&ano_ato=2026` (IN 2.306 e SC Cosit 150/2026); `termoBusca=2.305 acréscimo presunção
  limite&ano_ato=2026` (só a IN 2.306).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 224 de 26/12/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-complementares/2025/lcp-224-2025-12-26.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-12-26;224> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-11-03T19:22:15-03:00 · arquivo local `docs/D01_lcp-224-2025-12-26.md` · SHA-256 `6d2c451c17be08da1e811f15c80f188b47b66c7d3811220ade0fb69ee8b0a07c`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** D02_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/148694/visao/multivigente>  
  Baixado em 2026-11-03T19:22:37-03:00 · arquivo local `docs/D02_multivigente.html` · SHA-256 `635eb830122e9cb95bfda0d34b600c469cda97e0368564bc5219f07591e0c797`
- **[D03]** D03_perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tr — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/beneficios-fiscais/perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tributarios-v5-final.pdf>  
  Baixado em 2026-11-03T19:24:12-03:00 · arquivo local `docs/D03_perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tr.pdf` · SHA-256 `72c14639c7aa75402a7157b4edba0f3d94dabcae75706dbe30c68ed5cf4de9b8`
- **[D04]** Lcp 224 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm>  
  Baixado em 2026-11-03T19:27:21-03:00 · arquivo local `docs/D04_lcp224-htm.html` · SHA-256 `7f16d18bd7f4d02bd9222493743d43992a7d50023e44ffad074165866eabf12a`

## Registro de buscas
_Nenhuma busca registrada._
