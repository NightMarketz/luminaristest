# ADR-INCR-TAX-ASSESSMENT — Apuração de IRPJ/CSLL por PJ e por ano: Lucro Real trimestral **e** anual por estimativa (balancete de suspensão/redução), Presumido trimestral; fronteira com PIS/COFINS (X8), DCTFWeb + MIT (X9) e ISS

- **Data:** 2026-09-29
- **Status:** **Accepted (02/10/2026).** F-X7-1 → **(a) ratificado pelo dono em 29/09** (decisão 9, abaixo): o ADR
  desenha as duas formas do Lucro Real. **F-X7-2..14 (§8) ratificados pelo dono em 02/10**, todos na recomendação
  (F-X7-9 → b; F-X7-10 → b; os demais → a), por questionário:
  [`D-2026-10-02-X7-TAX-ASSESSMENT-FORKS`](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md). **Nenhum
  código escrito, nenhum autorizado:** a autorização de 02/10 cobre o BRIEF da Fase A (*"planejar o BRIEF da Fase A
  do X7 … sem 'executa'"*); o código exige "executa" (ORCH-006). BRIEF:
  [`BE-INCR-TAX-ASSESSMENT-A-brief.md`](../accounting/BE-INCR-TAX-ASSESSMENT-A-brief.md).
  **Fontes legais conferidas na fonte primária em 29/09, a pedido do dono (§15).**
- **Autor:** `sessao-planejamento` (agente). Base `origin/main` `9dd690b3`.
- **Autorização (ORCH-006), citada:**
  1. **F-M2** (dono, 03/09, contra a recomendação): o escopo fiscal inclui *"apuração de tributos (IRPJ/CSLL,
     PIS/COFINS, ISS)"* ([cédula 03/09 §B](../accounting/CEDULA-DECISAO-2026-09-03-modulos.md)). No nó:
     `autorizacao: "F-M2 (2026-09-03) — só ADR; F-M8 (trimestral)"` ([X7](../plano/nos/X7.md)).
  2. **Decisão 9 da entrevista de 29/09**, palavras do dono *"Reabrir no ADR"*: *"(a) reabrir o F-M8 no ADR: as
     duas formas por cliente; implementação em fases (motor trimestral primeiro)"*. Fonte:
     `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md` e
     `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §4 (D-4, D-5). **Os dois estão no PR #440, ainda aberto**;
     foram lidos de `origin/claude/docs-decisoes-2026-09-29` (`b5398c87`).
  - **Passo 1 da sessão (cobertura):** a autorização cobre exatamente este documento, e só ele. Não cobre BRIEF nem
    código. Por isso a §5 é um **esqueleto de comportamentos** que o BRIEF herda, não o BRIEF.
- **Supersedes (em parte, a partir da Fase B):** a EMENDA 2026-09-03 do
  [`ADR-INCR-SPED-ECF-FASE3`](ADR-INCR-SPED-ECF-FASE3-lucro-real.md) (F-M8: *"atende Lucro Real com apuração
  trimestral; tenant em estimativa mensal fica fora até segunda ordem"*). **Até a Fase B mergear, a restrição
  continua valendo de fato**: o código só conhece `T` (§2).
- **Related:** `ADR-INCR-SPED-ECF-FASE3` (Fork 3: o PVA computa o Bloco N · Fork 4: e-Lalur persistido · Fork 5:
  trimestral) · `ADR-INCR-SPED-ECF-file-generation` §D1 ("o PVA aplica a presunção") ·
  `ADR-FISCAL-OBLIGATION-PROFILE-regime-porte` (perfil da PJ por ano) · `ADR-INCR-DFE-EMISSAO-PARCEIRO`
  (`FiscalDocument`, fonte do ISS) · `ADR-INCR-SPED-APURACAO-encerramento` · `ADR-C01` (bridge pós-commit) ·
  decisões R5 (Integra Contador adiado) e R8 (instância = CNPJ raiz) · rejeitadas `R-motor-regras` e
  `R-motor-dominio`.

## TLDR (2 linhas)

Hoje o sistema não calcula tributo nenhum, nem o trimestral. Este ADR desenha a apuração de IRPJ/CSLL como serviço Prisma first-class com parâmetros versionados: **Fase A** = Presumido e Real trimestrais; **Fase B** = Real anual por estimativa mais balancete de suspensão/redução. A forma é escolhida por PJ e por ano no `CompanyFiscalProfile` e é irretratável.
**Risco principal:** o **1º cliente é Simples** e o X7 não o atende (o DAS é da onda 3). Além disso, a ECF continua delegando o Bloco N ao PVA (F-X7-2), então o número do X7 só tem oráculo se o H1/X5 conciliar X7 × PVA.

---

## 1. Contexto e objetivo

- **Nada calcula tributo hoje (V).** A linha do SDD consolidado (`docs/SDD-LUMINARIS.md:1116`) registra: *"Hoje o
  sistema não computa tributo algum, por decisão ratificada: a ECF só segrega receita bruta por atividade e o PVA
  aplica a presunção"*. O F-M2 (03/09) abriu o escopo, mas nada foi construído desde então. Em `server/src`, `irpj|csll` aparece em 15
  arquivos, todos de ECF, e-Lalur ou do perfil (campo da alíquota da CSLL); nenhum é serviço de apuração (grep V;
  "nenhum calcula" é I, por nome e leitura parcial).
- **O que já existe e este ADR respeita como fato consumado:**
  - e-Lalur Parte A e Parte B persistidos, com fechamento por trimestre (Fork 4 → b; BRIEF 3C);
  - ECF Real gerando `L/M/N030` para `T01..T04`;
  - perfil fiscal da PJ por ano-calendário (`CompanyFiscalProfile`, nó X13).
- **O pedido do contador (23/09, itens 1/10 da triagem):** as duas formas do Lucro Real, por cliente. O dono decidiu em
  29/09 desenhar as duas e implementar em fases.
- **Objetivo deste ADR:** fixar
  - onde a forma de apuração mora e como ela trava;
  - como cada forma calcula;
  - o que persiste e o que vira lançamento;
  - o que sai para o X9;
  - as fases de implementação e os forks pendentes.
- **Declaração obrigatória: o X7 não serve o 1º cliente.** Ele é Simples, de SP capital e tem IE (decisão de 29/09,
  questionário 1). Para esse cliente a ECF não se aplica (`obrigacoesPorRegime.ts:80,91`, lido). O X7 é
  **régua** (Presumido/Real), provada pelo H1/H1b/X5. O cálculo do Simples (PGDAS-D/DAS) é o PRE-ADR "Simples/MEI" da
  onda 3 (decisão 8).

## 2. Evidência de código (CBM-001 — confirmada por leitura em `origin/main` `9dd690b3`)

Caminhos relativos a `server/src/` salvo indicação. Grau **V** em todas as linhas (lido nesta sessão).

| Ponto | O que está fixo no trimestral / o que já existe | Arquivo:linha |
|---|---|---|
| e-Lalur, constante | `LALUR_QUARTERS = ['T01','T02','T03','T04']` ("Fork 5→(a) trimestral"); `quarterBounds` só faz janela de trimestre | `features/accounting/models/Lalur.model.ts:21,25-31` |
| e-Lalur, DTO | `quarter: z.enum(LALUR_QUARTERS)` em lançamento, movimento da Parte B e fechamento (create e query) | `features/accounting/dtos/LalurDto.ts:97,221,342,380,403` |
| e-Lalur, banco | `quarter String // 'T01'..'T04'`: **String, sem enum no banco** (alargar não pede migração) | `prisma/schema.prisma:1950,2027,2059` (entry, movimento da Parte B, fechamento) |
| ECF Real, DTO | `formaApur: z.enum(['T']).default('T')`; `formaTribPer` com regex `[0RPAES]{4}` (o `E` só vale no caso REFIS — Manual L12 p.73; o Real anual usa `R`) | `features/accounting/dtos/SpedEcfRealDto.ts:40-42,46` |
| ECF Real, serializer | `formaApur: 'T'`; `EcfRealPeriod.perApur: 'T01'…'T04'` | `lib/ecfReal.ts:64-77` |
| Registro 0010 | `MES_BAL_RED` sempre vazio (*"vazio p/ FORMA_APUR='T'"*) | `lib/ecf.ts:179` |
| Geração ECF Real | períodos = `quarterWindows(year)`; exige os 4 fechamentos trimestrais da Parte B | `features/accounting/services/SpedEcfRealGenerationService.ts:190-203` |
| Perfil da PJ | `CompanyFiscalProfile`, `@@unique([userId, anoCalendario])`, `regime`, `ecfIndAliqCsll` (`'1'` 9% / `'4'` 15%), `regimeTravadoEm` | `prisma/schema.prisma:1370,1375,1386,1393,1400` |
| Compensação de prejuízo | o e-Lalur só confere *"compensação ≤ saldo da conta da Parte B"*. **Não existe trava de 30%** (grep `30%`/`trinta por cento` em `features/accounting` sem hit) | `features/accounting/services/LalurService.ts:226-229,279-288` |
| Presumido | segrega a **receita bruta por atividade** (3.1 serviço / 3.3 revenda) por trimestre via `groupByAccount`; *"o PVA-ECF computa toda a presunção e o imposto"* | `features/accounting/services/SpedEcfGenerationService.ts:30,47-49,78-128` |
| Matriz de obrigações | *"EFD-Contribuições, DCTFWeb, PGDAS-D, DEFIS, DASN-SIMEI e EFD ICMS/IPI ficam FORA até ter fonte"* | `features/accounting/models/obrigacoesPorRegime.ts:6-7` |
| Escopo contábil | `AccountingScope = { ownerUserId, actorUserId, unitId, ledgerCode }`: **todo dado contábil é por unidade** | `features/accounting/scope/AccountingScope.ts:12-20` |
| Alíquota da CSLL | `IND_ALIQ_CSLL ∈ {1 (9%), 4 (15%)}` (REGRA_PREENCHIMENTO do Manual, transcrita) | `features/accounting/dtos/SpedEcfRealDto.ts:47` |

## 3. Fonte legal (com grau)

**V-corpus** = lido em `docs/accounting/fontes-oficiais/IN-RFB-1700-2017.txt` (linha citada). **V-fonte** = lido na
fonte primária oficial nesta sessão (29/09); onde e como está na §15. **I** = inferido. Nenhuma linha depende mais
do dossiê.

| Regra | Fonte | Grau |
|---|---|---|
| Trimestral é a regra. Quem opta pela estimativa tem período **anual** e apura em 31/12 | IN 1.700 art. 31 caput, §§ 3º, 4º e 6º (`:612-624`) | V-corpus |
| A periodicidade do IRPJ determina a da CSLL | IN 1.700 art. 31 § 7º (`:626`) | V-corpus |
| Estimativa: base mensal = receita bruta × percentual (IRPJ 8% / 1,6% / 16% / 32%; CSLL 12% / 32%) | IN 1.700 arts. 33–34 (`:640-740`) | V-corpus |
| Suspensão/redução: período em curso = 01/01 → último dia do mês; compara com a soma das estimativas **devidas** nos meses anteriores; deduções (IRRF/CSLL retida, estimativas anteriores) | IN 1.700 arts. 47 e 49 (`:983-1045`) | V-corpus |
| Janeiro pode ser por balancete; prejuízo no mês dispensa o pagamento | IN 1.700 art. 48 (`:1019-1021`) | V-corpus |
| Cada balancete **recalcula do zero** o período em curso; ajustes vão **só na Parte A**, *"não cabendo nenhum registro na Parte B"* | IN 1.700 art. 50 I–II (`:1047-1052`) | V-corpus |
| Falta de estimativa gera multa isolada de 50%; balancete não escriturado até o vencimento é desconsiderado | IN 1.700 arts. 52–53 (`:1064-1085`) | V-corpus |
| **Irretratável no ano**, para as duas formas. A estimativa é manifestada pelo pagamento de janeiro (*"ainda que intempestivo"*) ou pelo balancete de suspensão. No início de atividade, vale o 1º mês | IN 1.700 art. 54 caput, §§ 1º–2º (`:1087-1092`) | V-corpus |
| IRPJ 15%; adicional de 10% sobre o que exceder R$ 20.000 × meses do período, sem deduções | IN 1.700 art. 29 caput e §§ 1º–2º (`:468-473`) | V-corpus |
| Compensação de prejuízo fiscal / base negativa ≤ 30% do lucro ajustado | IN 1.700 art. 64 (`:1245-1247`) | V-corpus |
| Presumido: percentuais do art. 33 (caput e §§ 1º–2º) por atividade, **por trimestre** | IN 1.700 art. 215 (`:3947`) | V-corpus |
| Percentual de IRPJ reduzido (16%) para PJ **exclusivamente** prestadora de serviço (alínea j, o caso do salão) com receita anual ≤ R$ 120 mil, e diferença postergada se passar do limite | IN 1.700 art. 33 §§ 7º–8º (`:704-706`; alínea j em `:684`); Lei 9.250/95 art. 40 (*"base de cálculo mensal"*; o parágrafo único exclui profissões regulamentadas) | V-corpus + V-fonte. Aplicação ao Presumido: a lei fala em base mensal e o art. 215 da IN só remete ao caput e aos §§ 1º–2º do art. 33; **não achei** norma que estenda (I) |
| Lucro Real: trimestral (art. 1º) **ou** estimativa mensal (art. 2º: 15% + adicional de 10% sobre o que exceder R$ 20 mil/mês; deduções no § 4º, inclusive o IR pago ou retido na fonte); apuração anual em 31/12 (§ 3º); opção **irretratável** no ano, manifestada pelo pagamento de janeiro ou do mês de início de atividade (art. 3º) | Lei 9.430/96 arts. 1º–3º | V-fonte |
| A estimativa vence no último dia útil do mês seguinte. Saldo anual positivo: **quota única até o último dia útil de março**, com juros Selic desde 1º de fevereiro. A estimativa de dezembro vence no último dia útil de janeiro. Saldo negativo: restituição ou compensação (art. 74) | Lei 9.430 art. 6º | V-fonte |
| Suspensão/redução por balanço ou balancete mensal, que **tem de ser transcrito no livro Diário**; só produz efeito no próprio ano; prejuízo desde janeiro dispensa o pagamento | Lei 8.981/95 art. 35 §§ 1º–3º; RIR/2018 art. 227 § 1º I | V-fonte |
| O RIR consolida o mesmo: 217 (trimestral), 218 (apuração anual de quem opta), 219 (opção), 220 (base 8%), 225 (15%), 226 (deduções), 227 (suspensão/redução), 229 (irretratável) | Decreto 9.580/2018 arts. 217–229 | V-fonte |
| Presumido = percentuais do art. 15 da Lei 9.249 sobre a receita do trimestre (inciso I) **+ ganhos de capital, rendimentos financeiros e demais receitas** (inciso II) | Lei 9.430 art. 25 I–II | V-fonte |
| Percentuais-base: IRPJ 8% (caput) e **32% para "prestação de serviços em geral"** (§ 1º III a — o salão); CSLL 32% para as atividades do § 1º III e 12% para as demais. O art. 20 vale **no pagamento mensal e no trimestral** (remete aos arts. 2º, 25 e 27 da Lei 9.430) | Lei 9.249/95 arts. 15 e 20 | V-fonte |
| A CSLL segue as regras de apuração e pagamento do IRPJ (arts. 1º a 3º); quem optou pela estimativa paga a CSLL mensal sobre a base do art. 29 | Lei 9.430 arts. 28 e 30 | V-fonte |
| CSLL de **9% para as demais PJ** (inciso III). A LC 224 (art. 7º) e a Lei 15.525/2026 mudaram as alíquotas de financeiras e seguradoras (incisos I e II-A a II-C) — fora do público-alvo | Lei 7.689/88 art. 3º, texto compilado | V-fonte |
| O Presumido conta como **benefício** (§ 2º II a, que cita só os arts. 25 e 26 da Lei 9.430; a estimativa do Real **não** está na lista). Acréscimo de 10% nos percentuais de presunção (§ 4º VII), **só sobre a parcela da receita que exceder R$ 5 mi no ano**, com o limite proporcional a cada período e ajuste nos seguintes, e o acréscimo proporcional por atividade (§ 5º I–II). Efeitos: art. 14 | LC 224/2025 art. 4º §§ 2º, 4º e 5º; art. 14 | V-fonte |
| Regulamentação da LC 224: IRPJ desde **01/01/2026**, CSLL desde **01/04/2026** (art. 3º); o acréscimo vale para IRPJ e CSLL (art. 14); limite de **R$ 1.250.000,00 por trimestre**, verificado na receita do trimestre; a sobra de um trimestre abaixo do limite passa aos seguintes; **acerto no 4º trimestre** contra o limite anual, com dedução no T04 ou restituição/compensação com Selic; limite proporcional em início/encerramento de atividade (art. 15 §§ 1º–9º, redação da IN 2.306/2026). A palavra "estimativa" não aparece na IN | IN RFB 2.305/2025, texto compilado | V-fonte |
| Dirf **substituída** para fatos a partir de 01/01/2025 | IN RFB 2.181/2024 art. 1º (nova redação do art. 3º § 1º da IN RFB 2.043/2021) | V-fonte |
| DCTFWeb: fatos a partir de 01/01/2025 (art. 1º § 1º); é confissão de dívida (art. 2º); **prazo: último dia útil do mês seguinte (art. 6º)**; IRPJ, CSLL, PIS e Cofins entram pelo **MIT** (arts. 8º–9º); os **retidos na fonte** vão para a EFD-Reinf (art. 9º § 1º I); o Simples não informa o que está no DAS (art. 8º § 4º) | IN RFB 2.237/2024, texto compilado | V-fonte. **Corrige o dossiê**, que punha o prazo nos arts. 8º–9º |
| GIA dispensada a partir de 01/01/2026 para quem está no regime periódico de apuração | Portaria SRE 2/2025 art. 2º I (item 5 do § 4º do art. 1º do Anexo IV da Portaria CAT 92/98) | V-fonte |
| PIS/Cofins revogados a partir de 01/01/2027 (LC 7 art. 3º b; LC 70 arts. 1º–6º; Lei 9.718 arts. 2º–8º-B; Lei 10.637 arts. 1º–5º-A; Lei 10.833 arts. 1º–16; entre outros) | LC 214/2025 art. 542; efeito pelo art. 544 III (redação da LC 227/2026) | V-fonte |
| ECF: `0010.FORMA_APUR` `[T;A]`, e `FORMA_TRIB_PER` com `E` **só no caso REFIS** (p.73); `MES_BAL_RED` = 12 posições `[0;E;B]`, E = receita bruta, B = balanço/balancete (p.74); `PER_APUR` `A00` = anual e `A01..A12` = "receita bruta do mês / balanço até o mês" (p.128); `L030` até 13 ocorrências, L100/L300 também nos meses `B` (p.47); N620/N660 só em `A01..A12`, N630/N670 em `A00` ou `T0x` (p.49) | Manual da ECF L12, atualização jul/2026 | V-fonte |
| O MIT **importa arquivo JSON** no leiaute oficial; a importação cria a apuração "Em Edição" e **o usuário tem de encerrá-la** para ela ir à DCTFWeb; também exporta no mesmo leiaute (§§ 8.3 e 9, pp.24–26). Leiaute 1.0 (retificado em 20/02/2025): `BalancoLucroReal` (booleano do mês), objetos `Irpj`/`Csll` com `ListaDebitos` → `CodigoDebito` (6 dígitos, ex. `"022012"`), `ValorDebito`, `AnoDebito` (ajuste anual) | Manual do MIT (jan/2025); leiaute JSON de importação 1.0 | V-fonte. A tabela de códigos de receita **não** está no leiaute (ver a linha seguinte) |
| Tabelas Dinâmicas, N620 e N660: base, 15%, adicional (fórmula com `MESES_PERIODO()` no balancete), "devido em meses anteriores" (soma dos `A01..` anteriores quando `B`) e "devido no mês" são `CNA`/`CA`, ou seja, **fórmula do PVA**. Só são `E` (informadas pela PJ) as deduções de incentivo e as retenções/pagamentos (N620 linhas 5, 7–17.50, 21–25.99, 27; N660 10–11.02, 13–17.99, 19). Contagem: N620 = 14 CNA, 3 CA, 24 E, 2 R; N660 = 5 CNA, 7 CA, 19 E, 3 R | Tabelas Dinâmicas da ECF L12 (planilha da página de 28/05/2026, arquivo atual 24/09/2026) | V-fonte |
| Códigos de receita (código/variação): IRPJ Presumido **2089/01**; Real trimestral **0220/01** (obrigada) ou **3373/01** (optante); estimativa mensal **2362/01** (obrigada) ou **5993/01** (optante); saldo do ajuste anual **2430/01** (obrigada) ou **2456/01** (optante), declarado na competência de março. CSLL Presumido **2372/01**; Real trimestral **6012/01**; estimativa **2484/01**; ajuste anual **6773/01**. A diferença postergada do 16% tem código próprio (2089/02, 2362/02, 5993/02) | Receita, "DCTF — Tabelas de códigos/extensões" IRPJ e CSLL (atualizadas em 12/03/2024) | V-fonte (a tabela). Que o MIT usa a mesma tabela é **I**: o formato bate (código + variação, 6 dígitos; o exemplo do leiaute é `"022012"` = 0220/12) |
| Transmitir a ECD **supre** a obrigação de transcrever no Diário o balancete de suspensão/redução do art. 35 da Lei 8.981 | IN RFB 2.003/2021 art. 9º III (corpus `IN-RFB-2003-2021-ECD.txt:105-108`); repetido no Manual da ECD L9, jan/2026, p.8 | V-corpus + V-fonte |
| O acréscimo da LC 224 está contestado no STF: **ADI 7936** (CNS, relator Fux) e **ADI 7944** (OAB, relator Fux). Nenhuma das duas tem decisão cautelar: a 7936 está conclusa ao relator desde 27/08/2026, depois de AGU e PGR; a 7944, desde 20/05/2026 | Portal do STF, andamentos das duas ADIs, lidos em 29/09 | V-fonte |

## 4. Decisões fixadas (sem fork: a lei ou um precedente ratificado já decide)

**D1 — A forma de apuração pertence à PJ, por ano-calendário, e mora no `CompanyFiscalProfile`.**
- A chave `(userId, anoCalendario)` já é "PJ × ano" (R8: instância = CNPJ raiz).
- Um campo só para IRPJ e CSLL, porque a CSLL segue o IRPJ (IN 1.700 art. 31 § 7º). Valores: `TRIMESTRAL | ANUAL`.
- `regime = PRESUMIDO` ⇒ só `TRIMESTRAL` (Lei 9.430 art. 25; IN 1.700 art. 215). `ANUAL` com Presumido ⇒ 400.
- `regime ∈ {SIMPLES, MEI}` ⇒ campo `null`, e o X7 recusa (400, *"regime fora da apuração IRPJ/CSLL — DAS é da
  onda 3"*).
- `regime = REAL` com o campo nulo ⇒ `TRIMESTRAL`. Isso preserva o comportamento do F-M8 e todos os dados do
  e-Lalur já gravados (todos `T0x`).

**D2 — Existe trava da forma.** A escolha é irretratável no ano para as duas formas (IN 1.700 art. 54 caput). O
molde já existe no mesmo model: `regimeTravadoEm` (F-XP-5 a). **Quando** a trava nasce é o F-X7-5.

**D3 — O cálculo é um serviço Prisma first-class com parâmetros como dado versionado, sem motor de regras.**
- Alíquotas, percentuais, limites e teto de compensação ficam em **dado versionado em código**, cada linha com
  `fonte` e `vigenteDesde`. O molde é `obrigacoesPorRegime.ts` (F-XP-7 a).
- O cálculo são funções puras, `(entrada, tabela vigente) → memória de cálculo`, testáveis linha a linha.
- Não há engine, DSL nem template: `R-motor-regras` e `R-motor-dominio` estão rejeitadas. "Motor", neste ADR e na
  decisão 9, é só o apelido desse serviço.

**D4 — A base do Lucro Real vem do LAIR do razão.**
- Base = resultado antes de IRPJ/CSLL da janela + adições − exclusões da Parte A do e-Lalur − compensação.
- Com **guarda de circularidade**: as contas de provisão de IRPJ/CSLL ficam fora da leitura. Sem isso, a provisão
  confirmada mudaria a base do cálculo seguinte.

**D5 — O Presumido reusa a segregação de receita que já existe.** A base por atividade vem do mapa de presunção +
`groupByAccount` por trimestre de `SpedEcfGenerationService`. É reuso canônico; não haverá segunda segregação.

**D6 — Compensação limitada a 30% do lucro ajustado** (IN 1.700 art. 64), com IRPJ e CSLL separados. O serviço
recusa (400) a apuração cuja compensação lançada na Parte A passe do teto. Hoje o e-Lalur só confere o saldo da
Parte B (§2).
- **O PVA não cobre isso (verificado em 29/09).** Nas Tabelas Dinâmicas, as linhas de compensação de períodos
  anteriores (M300A/M350A 173–174; M300R/M350R 347–348) são `E`, informadas pela PJ, e não calculadas.
- A única checagem do PVA é a regra 360 (370 no rural) de `SPEDECF_DINAMICA_M300_A_REGRAS` / `M350_A_REGRAS`
  (pasta `recursos/tabelas` do PVA ECF instalado, versão 15 do arquivo de regras, instalação de 01/09/2026):
  `SE ((M300(171)>0) E (M300(173)+M300(174)>(ARRED(0,3*M300(169))))) ENTAO AVISO()`.
- Essa regra é **AVISO, não ERRO**: a ECF transmite assim mesmo.
- E ela só roda na ECF do ano seguinte, depois que o DARF do trimestre já foi pago. Então o teto tem de ser
  aplicado aqui, na apuração.

**D7 — Adicional de IRPJ** = 10% × máx(0, base − R$ 20.000 × meses do período) (IN 1.700 art. 29 § 1º). Os meses
do período valem:
- 3 no trimestre;
- 1 na estimativa mensal;
- os meses do período em curso no balancete (art. 49 II, *"acrescido do adicional"*);
- 12 no ajuste anual.

**D8 — A alíquota da CSLL sai de `CompanyFiscalProfile.ecfIndAliqCsll`** (`'1'` = 9%, `'4'` = 15%). Uma fonte só
serve a ECF (0020) e a apuração. Campo nulo ⇒ 400 *"perfil incompleto"*. Só `'1'` (9%, Lei 7.689 art. 3º III) e
`'4'` (15%, inciso I) entram; as alíquotas de financeiras da LC 224 ficam fora (400).

**D9 — O balancete de suspensão/redução (Fase B) recalcula o período em curso do zero** (01/01 → fim do mês), a cada
mês, e usa **só a Parte A** (IN 1.700 art. 50 I–II). A Parte B só se movimenta no ajuste anual.

**D10 — Estimativa e Presumido usam uma tabela de percentuais só.** A estimativa por receita bruta usa os mesmos
percentuais do Presumido (arts. 33–34; o art. 215 remete ao art. 33). É uma tabela com dois consumidores.

**D11 — Consequências da V4 (fechada em 29/09):**
- nenhum nó para DIRF nem para GIA-SP;
- o X9 passa a ser "DCTFWeb + MIT";
- a matriz de obrigações segue sem DCTFWeb até o X9 trazer a fonte (IN 2.237/2024). Não é deste ADR.

**D12 — Simples e MEI ficam fora do X7** (ver §1 e o TLDR).

## 5. Fases e esqueleto de comportamentos (o BRIEF herda; isto não é o BRIEF)

Cada fase exige "planeja" (BRIEF próprio) e depois "executa". A numeração é provisória. Os itens que dependem de
fork citam o fork.

### Fase A — apuração trimestral (Presumido e Real): vem primeiro

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| A1 | Perfil ganha `formaApuracaoIrpjCsll` e `formaApuracaoTravadaEm` (migração aditiva, nullable), e o dado "Lucro Real **obrigatório** ou **por opção**", porque o código de receita do IRPJ muda com isso (0220 × 3373; 2362 × 5993; 2430 × 2456 — §3). O DTO aplica as regras do D1 e bloqueia a troca depois da trava | `CompanyFiscalProfile` + DTO + service | F-X7-5 |
| A2 | Tabela de parâmetros versionada (D3): IRPJ 15%, adicional 10% / R$ 20 mil·mês, percentuais dos arts. 33–34, teto de 30%, cada um com `fonte`/`vigenteDesde` | arquivo novo em `models/` | F-X7-10, F-X7-14 |
| A3 | Model `TaxAssessment`, com memória de cálculo | Prisma + repo + factory | F-X7-3 |
| A4 | **Presumido trimestral:** base por atividade (D5) × percentual → IRPJ (15% + adicional, D7) e CSLL (D8) | serviço de apuração | F-X7-10, F-X7-14 |
| A5 | **Real trimestral:** LAIR (D4) + Parte A (livros `lalur`/`lacs`) − compensação (D6) → IRPJ e CSLL. Exige a Parte B do trimestre fechada (`LalurParteBClosing`), a mesma pré-condição da ECF | serviço de apuração + leitura do e-Lalur | F-X7-7 |
| A6 | Deduções do imposto (IRRF / CSLL retida) | DTO + memória | F-X7-11 |
| A7 | Fluxo prévia → confirmação → substituição: a prévia não persiste; a confirmação é imutável; corrigir exige nova versão que **nomeia** a substituída | rotas + service | F-X7-3 |
| A8 | Provisão contábil da apuração confirmada | bridge + `postEntry` | F-X7-4 |
| A9 | Leitura: lista e detalhe com memória; o X9 e o pacote do contador leem os confirmados | rotas GET | F-X7-8 |
| A10 | Gates que o diff aciona: snapshot de shape dos DTOs, paridade i18n pt/en, allowlist do `auditCanonical.ts` (`tax.assessment.confirmed` / `.superseded`, só ids e centavos como string), guard de path-count do openapi, rota em 2 toques, cabeçalho `atomicUntil` (Contrato AC-2.3-2) se F-X7-4 → (a) | vários | — |

### Fase B — Lucro Real anual por estimativa + balancete de suspensão/redução

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| B1 | `ANUAL` liberado no DTO do perfil (só com `regime = REAL`), com a trava | perfil | F-X7-5 |
| B2 | **Estimativa por receita bruta** no mês m: base = receita × percentual (D10) → IRPJ com adicional mensal (D7) e CSLL | serviço | F-X7-10, F-X7-14 |
| B3 | **Balancete de suspensão/redução** do mês m: calcula o devido do período em curso (01/01 → fim de m; só Parte A, D9) e subtrai a soma das estimativas **devidas e confirmadas** dos meses anteriores (art. 47). Resultado ≤ 0 suspende; > 0 reduz. A CSLL do mês usa o mesmo modo do IRPJ (art. 47 § 1º). A transcrição no Diário (Lei 8.981 art. 35 § 1º a) é **suprida pela transmissão da ECD** (IN 2.003 art. 9º III), sem registro especial. O que continua valendo é a escrituração até a data do pagamento, senão o balancete é desconsiderado (IN 1.700 art. 52 § 4º): os lançamentos do mês têm de estar no razão antes de confirmar o balancete | serviço + e-Lalur | F-X7-6 |
| B4 | A forma de cada mês (receita bruta × balancete) fica registrada; é o `MES_BAL_RED` da ECF | `TaxAssessment.modo` | — |
| B5 | Janeiro por balancete (art. 48) e início de atividade (art. 54 § 2º) | serviço | F-X7-5 |
| B6 | **Ajuste anual em 31/12:** lucro real anual (Parte A + Parte B) − soma das estimativas → saldo a pagar (quota única até o último dia útil de março, com juros Selic desde 1º de fevereiro) ou saldo negativo (restituição/compensação) — Lei 9.430 art. 6º. A estimativa de dezembro vence no último dia útil de janeiro (§ 3º) | serviço | — |
| B7 | e-Lalur com períodos mensais/anual: validação período × forma do ano; movimento de Parte B em período mensal ⇒ 400 (art. 50 II) | `Lalur.model.ts`, `LalurDto.ts`, `LalurService` | F-X7-6 |
| B8 | ECF Real com `formaApur = 'A'` e `FORMA_TRIB_PER = 'RRRR'` (o `E` é só do caso REFIS, p.73); `MES_BAL_RED` de 12 posições `E`/`B` vindo do B4 (p.74); `L/M/N030` com `A00` mais os `A01..A12` do ano (L030 até 13, p.47); L100/L300 também nos meses `B` (p.47); N620/N660 nos `A01..A12`, N630/N670 no `A00` (p.49); fechamento exigido = o anual, não os 4 trimestrais (`SpedEcfRealGenerationService.ts:198-203`) | `ecf.ts`, `ecfReal.ts`, DTO, service | TIPO das linhas: §10 |
| B9 | Emenda ao `ADR-INCR-SPED-ECF-FASE3` retirando a restrição do F-M8, no mesmo PR que liga o B8 | doc | — |

### Fase C — vizinhos (cada item com autorização própria)

| # | Comportamento | Fork |
|---|---|---|
| C1 | Contrato de saída para o X9: valores confirmados por tributo, período e código de receita, no formato que o leiaute JSON do MIT pede (`Irpj`/`Csll` → `ListaDebitos`; `BalancoLucroReal` no mês); porta `EnvioMit` | F-X7-8, F-X7-9 |
| C2 | ISS por competência | F-X7-12 |
| C3 | Memória de cálculo no pacote do contador. O item 3.4 do C6b depende do X7 (decisão 16: *"memória de cálculo depois do X7"*) | — |

## 6. Contratos esboçados (forma materializável; o BRIEF fecha)

```prisma
// CompanyFiscalProfile — aditivo (A1)
formaApuracaoIrpjCsll  String?   // TRIMESTRAL | ANUAL — D1 (null + REAL ⇒ TRIMESTRAL; PRESUMIDO ⇒ só TRIMESTRAL)
formaApuracaoTravadaEm DateTime? // D2 / F-X7-5 — IN 1.700 art. 54

// A3 — se F-X7-3 → (a). Dinheiro em BigInt centavos (MAX_CENTS é política, não persistência).
model TaxAssessment {
  id                 String    @id @default(cuid())
  userId             String    // a PJ (R8) — mesma chave do CompanyFiscalProfile
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId             String    // unidade cujo razão/e-Lalur foi lido — proveniência (F-X7-7), não chave
  anoCalendario      Int
  tributo            String    // IRPJ | CSLL (String: X8/onda 3 alargam sem migração, se o dono quiser — F-X7-13)
  regime             String    // PRESUMIDO | REAL — cópia do perfil no momento da confirmação
  forma              String    // TRIMESTRAL | ANUAL
  periodo            String    // T01..T04 | M01..M12 | ANUAL
  modo               String    // PRESUMIDO | REAL_TRIMESTRAL | ESTIMATIVA_RECEITA | BALANCETE_SUSPENSAO_REDUCAO | AJUSTE_ANUAL
  baseCents          BigInt
  devidoCents        BigInt    // alíquota + adicional (IRPJ)
  deducoesCents      BigInt
  aPagarCents        BigInt    // 0 na suspensão
  saldoNegativoCents BigInt    @default(0) // só AJUSTE_ANUAL
  memoria            Json      // MemoriaCalculoSchema (DTO) — molde: CompanyFiscalProfile.declarante Json (F-XP-2 a)
  tabelaVersao       String    // versão da tabela de parâmetros usada (D3)
  status             String    // CONFIRMED | SUPERSEDED
  supersedesId       String?   // a versão que esta substitui (substituição explícita)
  provisaoEntryId    String?   // F-X7-4 (a); nulo = provisão pendente (commit 2)
  confirmedById      String
  confirmedAt        DateTime
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?

  @@index([userId, anoCalendario, tributo, periodo])
  @@map("tax_assessments")
}
// "Um só CONFIRMED por (PJ, ano, tributo, período)" é gate DENTRO da tx do confirm, não @@unique:
// o @@unique colide com a substituição (classe unique-de-idempotencia × soft-delete).
```

```ts
// DTOs — esboço (Zod .strict(); centavos como string de dígitos no JSON)
const PERIODOS_TRIMESTRAIS = ['T01', 'T02', 'T03', 'T04'] as const;
const PERIODOS_MENSAIS = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12'] as const;
const Cents = z.string().regex(/^\d+$/);

export const TaxAssessmentPreviewSchema = z.object({
  unitId: z.string().min(1),
  anoCalendario: z.number().int().min(2025),
  periodo: z.union([z.enum(PERIODOS_TRIMESTRAIS), z.enum(PERIODOS_MENSAIS), z.literal('ANUAL')]),
  modoMensal: z.enum(['RECEITA_BRUTA', 'BALANCETE']).optional(), // só forma ANUAL + período Mxx
  deducoes: z.array(z.object({
    tributo: z.enum(['IRPJ', 'CSLL']),
    tipo: z.enum(['IRRF', 'CSLL_RETIDA', 'OUTRA']),          // F-X7-11
    valorCents: Cents,
    documento: z.string().max(120).optional(),
  }).strict()).max(50).default([]),
}).strict();
// superRefine (no service, contra o perfil do ano): Txx ⇔ TRIMESTRAL; Mxx/ANUAL ⇔ ANUAL; modoMensal só em Mxx.
// Sempre calcula IRPJ E CSLL juntos (art. 31 § 7º; art. 47 § 1º) — não há "tributo" no input.

export const TaxAssessmentConfirmSchema = TaxAssessmentPreviewSchema.extend({
  expectedAPagarCents: z.object({ IRPJ: Cents, CSLL: Cents }).strict(), // CAS: confirma o que a prévia mostrou; diverge ⇒ 409
  supersedesIds: z.array(z.string()).max(2).optional(),                // obrigatório se já houver CONFIRMED no período ⇒ senão 409
}).strict();

// Saída
type MemoriaLinha = { codigo: string; descricao: string; valorCents: string; fonte: string }; // fonte = "IN 1.700 art. 29 §1º" etc.
type TaxAssessmentView = {
  id: string; tributo: 'IRPJ' | 'CSLL'; periodo: string; modo: string;
  baseCents: string; devidoCents: string; deducoesCents: string; aPagarCents: string; saldoNegativoCents: string;
  status: 'CONFIRMED' | 'SUPERSEDED'; provisaoPendente: boolean; tabelaVersao: string; memoria: MemoriaLinha[];
};
```

```ts
// A2 — tabela de parâmetros (dado versionado, D3). Alíquotas em basis points (convenção de FiscalProfile.issAliquotaBp).
type ParametroApuracao = {
  chave: 'IRPJ_ALIQ' | 'IRPJ_ADIC_ALIQ' | 'IRPJ_ADIC_LIMITE_MES_CENTS' | 'PRESUNCAO_IRPJ' | 'PRESUNCAO_CSLL' | 'COMPENSACAO_TETO';
  atividade?: 'SERVICO' | 'REVENDA';   // só PRESUNCAO_*; mesma chave de atividade do mapa de presunção (D5)
  valor: number;                        // bp, ou centavos p/ limite
  fonte: string;                        // "IN RFB 1.700/2017 art. 33 §1º IV j" — obrigatório
  vigenteDesde: string;                 // ISO date
};
```

**Rotas (esboço):**

| Rota | O que faz |
|---|---|
| `POST /accounting/tax-assessments/preview` | calcula e não persiste |
| `POST /accounting/tax-assessments` | confirma e persiste |
| `GET /accounting/tax-assessments?anoCalendario=&periodo=&status=` | lista |
| `GET /accounting/tax-assessments/:id` | detalhe com memória |

Por padrão (deny-by-default no middleware), tudo fica atrás de policy. Quem confirma depende do GOV-CONTADOR (§7).

## 7. Fronteira com os vizinhos

| Vizinho | Relação |
|---|---|
| **X8** EFD-Contribuições / PIS-COFINS | Fora deste ADR (F-X7-13). PIS/COFINS são revogados em 01/01/2027 (LC 214 art. 542), então o X8 é raso por desenho (cédula 03/09 E.3). O crédito de aluguel/energia (P8) é do X8 |
| **X9** DCTFWeb + MIT | Consome o contrato C1. Se F-X7-8 → (a), o X9 tem ADR próprio. Este ADR **nomeia** a porta `EnvioMit` (cédula 03/09, D2 anotada (ii): *"o ADR X7 nomeia a porta e adia o adaptador"*). O adaptador é o F-X7-9; o HTTP (Integra Contador/Serpro) está adiado pela R5 |
| **ECF Fase 3** (X4/X5) | F-X7-2: o Bloco N continua com o PVA. A Fase B altera o gerador (B8) |
| **e-Lalur** (FE-LALUR) | É a fonte da Parte A e da compensação. A Fase B alarga os períodos (F-X7-6) |
| **C6b / FE-INCR-DELIVERY** | A memória de cálculo entra no pacote do contador (C3) |
| **GOV-CONTADOR** | Define quem confirma e quem substitui uma apuração (papel "contador responsável"). Até lá, vale a policy vigente de dado contábil. **Insumo**: o BRIEF da Fase A lê o estado do GOV no dia |
| **ADR-INCR-SPED-APURACAO-encerramento** | A provisão (F-X7-4) entra antes do encerramento do período |
| **ADR-INCR-DFE-EMISSAO-PARCEIRO** | O `FiscalDocument` autorizado é a fonte do ISS (F-X7-12) |
| **PRE-ADR Simples/MEI** e **PRE-ADR IBS/CBS 2027** (onda 3) | Podem avaliar o reuso do `TaxAssessment` pelo critério de reuso (`_REUSE-CRITERION.md`). **Não se decide aqui** |

## 8. FORKS — RATIFICADOS (F-X7-1 em 29/09; F-X7-2..14 em 02/10, [D-2026-10-02-X7-TAX-ASSESSMENT-FORKS](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md))

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-X7-1** Reabrir o F-M8? | (a) as duas formas por cliente · (b) só trimestral | ✅ **RATIFICADO (a) — dono, 29/09** (*"Reabrir no ADR"*; implementação em fases) | — |
| **F-X7-2** O cálculo do X7 × o Bloco N da ECF | **(a)** o X7 calcula para guia, DCTFWeb e provisão; a ECF continua delegando o N ao PVA (Fork 3 da Fase 3; §D1 da ECF Presumido); a conciliação X7 × PVA vira passo do runbook H1/H1b/X5 · (b) o X7 alimenta o Bloco N (reabre o Fork 3) | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** As linhas `CNA` da Tabela Dinâmica são fórmula do PVA, e o Luminaris só emite as linhas `E` (Fork 3 → a, verificado na emenda de 11/09 do ADR-ECF-FASE3), então o (b) é em boa parte inviável. O PVA vira oráculo **do X7**, e isso é o que falta a ele | médio: sem conciliação, duas contas divergem em silêncio |
| **F-X7-3** Persistir a apuração? | **(a)** persistida; imutável depois de confirmada; correção = nova versão que nomeia a substituída · (b) calculada sob demanda, sem tabela | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O art. 47 manda subtrair o que foi **devido** nos meses anteriores, não um recálculo; um lançamento retroativo mudaria o passado. O art. 54 precisa de um fato registrado para travar. A DCTFWeb confessa valores fixos. **Caso adversarial tentado:** "só a Fase A (trimestral) poderia viver sem persistência". Na Fase A isolada o (b) funciona; ele cai na Fase B. Adotar (b) agora obriga a migrar depois | alto na Fase B |
| **F-X7-4** Provisão contábil | **(a)** confirmar gera o lançamento de provisão (D despesa IRPJ/CSLL, C IRPJ/CSLL a recolher) por **bridge explícita** (ADR-C01), com contas configuradas no perfil (molde `icmsRecuperavelAccountId`). São 2 commits (`postEntry` abre tx raiz; cabeçalho `atomicUntil`, AC-2.3-2), com reconcile idempotente. Substituir = estorno + novo lançamento · (b) o X7 não lança; o contador provisiona à mão | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** F-Z0: o Luminaris **é** a escrituração, e sem provisão a DRE e a ECD saem sem IRPJ/CSLL. As contas dependem do contador (§9) | médio: (a) errado duplica a provisão de quem já lança à mão |
| **F-X7-5** Quando a forma trava | **(a)** na tx da **confirmação da 1ª apuração do ano**: `T01` no trimestral; janeiro (estimativa ou balancete) no anual. É o substituto do "pagamento de janeiro" do art. 54 § 1º · (b) numa ação explícita do operador (*"confirmo o pagamento de janeiro"*) · (c) sem trava, só aviso | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O sistema não vê o DARF pago. A confirmação é o primeiro fato que ele controla, e o art. 54 torna a escolha irretratável para as duas formas. Não há destravar no MVP (declarado) | alto em (c): permitir trocar a forma no meio do ano gera apuração inválida |
| **F-X7-6** Períodos anuais no e-Lalur (Fase B) | **(a)** alargar o enum da coluna `quarter` (é `String`, sem migração) para `T01..T04 ∪ A00..A12` (`A00` = anual, Manual p.128), validado contra a forma do ano · (b) coluna nova `perApur` + migração + rename | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** É o menor diff: o banco já é `String` (§2), e o nome `quarter` passa a ser herança documentada num comentário | baixo |
| **F-X7-7** PJ × unidade | **(a)** a apuração é gravada na chave da PJ (`userId`), lê o razão e o e-Lalur de **uma** unidade (a mesma que gera a ECD/ECF hoje) e responde 400 se outra unidade da PJ tiver movimento no período, até existir um ADR de consolidação · (b) somar todas as unidades · (c) apurar por unidade | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** IRPJ/CSLL são da PJ (R8), mas todo o contábil é por `unitId` (§2). O (b) soma razões que ninguém consolidou (intercompany etc.); o (c) contraria a lei | alto em (c) |
| **F-X7-8** X9 fundido ou separado | **(a)** ADR próprio do X9 (DCTFWeb + MIT), que consome o contrato C1 e os valores do X8; aqui só se nomeia a porta `EnvioMit` · (b) fundir no X7 | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O MIT confessa também PIS/COFINS e retenções, que não são do X7. A pendência do adaptador (F-X7-9) independe do cálculo | baixo |
| **F-X7-9** Adaptador 1 do MIT (pendência "gerar arquivo × HTTP") | **(a)** ficha para digitação manual no MIT · **(b)** **arquivo JSON de importação** no leiaute oficial 1.0 (verificado: o MIT importa, a apuração cai "Em Edição" e o usuário encerra) · **(c)** HTTP pelo Integra Contador | ✅ **RATIFICADO (b) — dono, 02/10.** **(b).** O leiaute é oficial e publicado, e o encerramento no MIT, que é a confissão de dívida (IN 2.237 art. 2º), continua sendo ato humano. A ficha (a) fica só como alternativa enquanto a tabela de códigos de receita não estiver transcrita (§10). O (c) continua adiado pela R5 (*"X7 nasce com adaptador (port) … envio atrás de interface para plugar Serpro quando houver tenant pagando"*). Se F-X7-8 → (a), este fork migra para o ADR do X9 com a mesma recomendação. **Mudou em 29/09:** era (a) antes da verificação (§15) | baixo: a porta isola |
| **F-X7-10** LC 224/2025 (Presumido acima de R$ 5 mi/ano) | **(a)** bloquear a apuração (400 explicando) quando a receita passar do limite · **(b)** implementar a regra da IN 2.305 art. 15 (redação da IN 2.306): limite de R$ 1,25 mi por trimestre, sobra transportada, acerto no T04 com dedução ou restituição; IRPJ desde 01/01/2026 e CSLL desde 01/04/2026 · (c) ignorar | ✅ **RATIFICADO (b) — dono, 02/10.** **(b).** O motivo do (a) era "ninguém leu o rateio". Agora o rateio está na lei (LC 224 art. 4º § 5º) e na IN, e é determinístico. As datas diferentes de IRPJ e CSLL são o caso que a tabela versionada do D3 resolve. O acerto do T04 (§ 5º da IN) entra na memória do T04. **Mudou em 29/09:** era (a) antes da verificação (§15) | alto em (c): pagar a menos |
| **F-X7-11** Deduções (IRRF / CSLL retida; art. 47 §§ 5º–6º) | **(a)** o operador informa as deduções na apuração, com documento opcional, e elas vão para a memória · (b) derivar de AR/NFS-e (retenção no recebimento); **não existe modelo de retenção hoje** (I) · (c) sem deduções no MVP (valor a pagar superestimado) | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Não inventa modelo novo e não superestima. O retido é escriturado **pelo pagador** na EFD-Reinf (IN 2.237 art. 9º § 1º I); aqui entra só a dedução de quem sofreu a retenção (Lei 9.430 art. 2º § 4º III). Incentivos (PAT etc.) ficam fora, declarados | baixo |
| **F-X7-12** ISS | **(a)** relatório somente leitura por competência e município, somando o ISS dos `FiscalDocument` autorizados (ADR-DFE), com o retido separado e sem guia (é municipal), na Fase C · (b) ISS fora do X7, com o DFE | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** O F-M2 nomeia o ISS; a guia do município (em SP capital, a Paulistana para regime normal) não é integração nossa. Custa um relatório, depois que a emissão existir | baixo |
| **F-X7-13** PIS/COFINS dentro do X7? | **(a)** fora: o X8 (raso) desenha PIS/COFINS mensal, EFD-Contribuições e crédito de aluguel/energia (P8), podendo reusar o `TaxAssessment` (o `tributo` é String) · (b) o X7 já cobre o PIS/COFINS **cumulativo** do Presumido (alíquota sobre receita) e deixa o não-cumulativo para o X8 | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Com a revogação em 01/01/2027 (art. 542), o que se construir agora vive cerca de 3 meses de fato gerador. O custo-benefício é decisão do dono no X8 (§11 item 1) | baixo |
| **F-X7-14** 16% para prestador exclusivo de serviço ≤ R$ 120 mil (IN 1.700 art. 33 §§ 7º–8º; Lei 9.250 art. 40) | **(a)** não modelar na Fase A: usar 32% (paga a mais, nunca a menos) e registrar a opção como futura · (b) modelar o § 7º com a diferença postergada do § 8º | ✅ **RATIFICADO (a) — dono, 02/10.** **(a).** Pagar a mais é conservador. Só o prestador **exclusivo** se qualifica (salão que vende produto no balcão não), e a lei fala em base **mensal**: não achei norma que estenda o 16% ao Presumido (§3). Reabrir quando houver cliente real que se qualifique | baixo: sobrepreço recuperável |

## 9. Pendente de validação externa (contador ou oráculo; nada disso entra no checklist como decidido)

1. **LC 224 no caso concreto:** a regra está verificada, e as ADIs 7936 e 7944 não têm cautelar (§3). As liminares
   dos TRFs noticiadas por escritórios não foram conferidas no tribunal. Por natureza, valem só para quem as obteve
   (**I**), então o que importa é se **o cliente** tem uma. Isso só o contador ou o jurídico dele sabe. Se tiver, o
   acréscimo precisa poder ser desligado por cliente. Se o STF der cautelar, desliga-se para todos. Nos dois casos,
   a tabela versionada (D3) já comporta a mudança.
2. ~~Códigos de receita~~ — **resolvido** pela tabela oficial (§3). Fica só a confirmação, com o contador ou na 1ª
   importação no MIT, de que o MIT aceita exatamente essa tabela (hoje é inferência pelo formato).
3. **Contas** de provisão e o código do referencial correspondente (despesa IRPJ/CSLL, IRPJ/CSLL a recolher, saldo
   negativo a compensar) — F-X7-4.
4. **"Demais receitas" do Presumido** (receitas financeiras, ganhos de capital; Lei 9.430 art. 25 II; IN 1.700 art.
   216). O mapa de presunção atual só cobre 3.1/3.3 (`SpedEcfGenerationService.ts:117-118` recusa receita sem linha).
5. **Art. 33 § 7º:** se algum cliente-alvo se qualifica e se o 16% vale no Presumido (F-X7-14).
6. ~~Prazo e acréscimos do saldo do ajuste anual~~ — **resolvido** pela Lei 9.430 art. 6º (§3, B6).
7. **Oráculo do número:** a 1ª apuração real é conferida contra o PVA (H1 Presumido / X5 Real) e contra o contador.
   Isso é gate humano (RUNBOOK-FORMAT). O agente prepara o passo em branco; não preenche, não marca desfecho, não
   assina.

## 10. Insumos ausentes (pausa registrada; não varri além dos insumos, regra 2)

1. ~~Tabelas Dinâmicas: TIPO das linhas N620/N660~~ — **resolvido** (§3). Os cálculos são do PVA, o que confirma o
   F-X7-2 (a) também para a Fase B. Transcrever as duas abas antes do BRIEF da Fase B, no molde `TRANSCRICAO-*.md`.
2. ~~Manual do MIT: existe leiaute de importação de arquivo?~~ — **resolvido**: existe (§3), e mudou a recomendação
   do F-X7-9.
3. **Compensação no e-Lalur em detalhe.** Li `LalurService.ts:226-229,279-288` (linha tipo P, `indRelacao = 1`,
   limitada ao saldo da Parte B). O BRIEF confirma se a linha P é a única fonte da compensação que o D6 vai
   limitar.
4. ~~Tabela oficial de códigos de receita~~ — **resolvido** (§3).
5. **Retenções** (IRRF/CSRF): não há modelo (F-X7-11).
6. ~~IN 1.700 do corpus possivelmente defasada~~ — **retirado**: a LC 224 foi regulamentada numa IN própria
   (2.305/2025), não por alteração da IN 1.700, então a ausência no corpus não indica defasagem.
7. ~~Balancete no Diário × ECD~~ — **resolvido**: a ECD supre a transcrição (IN 2.003 art. 9º III). Ver B3.

## 11. Achados fora de escopo (registrados, não planejados — regra 5)

1. **O X8 perde objeto para fatos a partir de 01/01/2027** (LC 214 art. 542): restam cerca de 3 meses de fato
   gerador (out–dez/2026), mais retificações. Cabe ao dono reavaliar se o X8 ainda se constrói. Não é decisão deste
   ADR.
2. **Multi-unidade × PJ:** todo o contábil é por `unitId`, mas IRPJ/CSLL, ECD e ECF são da PJ (CNPJ raiz, R8). O X7
   contorna com o F-X7-7 (a); a consolidação de verdade pede ADR próprio. A mesma pergunta vale para ECD/ECF hoje e
   não foi verificada aqui.
3. **A CSLL de financeiras mudou** (LC 224 art. 7º; Lei 15.525/2026), e o `IND_ALIQ_CSLL` do sistema só conhece
   `1`/`4`. Fora do público-alvo; registrar se algum dia entrar cliente financeiro.

## 12. Riscos e vieses (T8)

- **Risco — sem oráculo interno.** O número do X7 só é provado pelo PVA (H1/X5) e pelo contador. Até lá, "teste
  verde" prova a aritmética contra a tabela, não contra a lei.
- **Risco — valor para o 1º cliente é zero** (é Simples). O X7 concorre na fila com trabalho do cliente (decisão 2:
  "régua e cliente juntos").
- **Risco — cálculo duplicado** (X7 × PVA). Sem a conciliação do F-X7-2 (a), divergem em silêncio.
- **Viés 1 (fonte legível) — corrigido em 29/09:** a 1ª versão usou a IN 1.700 do corpus e deixou as leis "via
  dossiê". O dono cobrou; as leis foram lidas na fonte (§15) e três recomendações ou fatos mudaram. O viés que sobra:
  o que não consegui abrir (planilha de Tabelas Dinâmicas, Manual da ECD) continua marcado como insumo, não como
  fato.
- **Viés 2 (completude × ponytail):** as recomendações de persistir (F-X7-3) e provisionar (F-X7-4) aumentam a
  superfície. A memória "o dono quer completude" empurra nessa direção. O contrapeso é que as duas nascem de artigo
  de lei (art. 47, art. 54, F-Z0), não de gosto.
- **Viés 3 (fork inflation):** são 13 forks pendentes. Vários têm recomendação óbvia (F-X7-6, 8, 11, 12, 13, 14) e
  podem ser ratificados em lote. Os que mudam desenho são F-X7-2, 3, 4, 5 e 7.
- **Caso adversarial tentado contra a tese "desenhar as duas formas agora é barato":** o custo real aparece no e-Lalur
  (o art. 50 II proíbe Parte B nos balancetes) e na ECF (fechamento anual × trimestral). O ADR expõe esses dois
  pontos (B7, B8) em vez de esconder; a tese se sustenta porque nada disso é código antes da Fase B.

## 13. Invariantes que a implementação DEVE provar (o BRIEF herda; cada uma vira teste)

1. `PRESUMIDO` + `ANUAL` ⇒ 400. `SIMPLES`/`MEI` ⇒ 400. `REAL` com a forma nula ⇒ calcula como `TRIMESTRAL`.
2. Trocar a forma depois da trava ⇒ 400. A trava nasce **dentro da tx** da confirmação (gate autoritativo dentro da
   tx).
3. A base do Real não muda depois de a provisão ser lançada (sequência: calcula, confirma e provisiona, recalcula;
   a base tem de ser a mesma) — D4.
4. Compensação acima de 30% do lucro ajustado ⇒ 400 (D6), para IRPJ e CSLL separadamente.
5. Adicional: base exatamente em R$ 20.000 × meses ⇒ adicional 0; 1 centavo acima ⇒ adicional sobre 1 centavo. A
   regra de arredondamento é fixada no BRIEF, com fonte.
6. Um só `CONFIRMED` por (PJ, ano, tributo, período), garantido dentro da tx. Confirmar de novo sem `supersedesIds`
   ⇒ 409. A prévia divergente do `expectedAPagarCents` ⇒ 409.
7. (Fase B) Movimento de Parte B em período mensal ⇒ 400 (art. 50 II).
8. (Fase B) Uma estimativa confirmada não muda com lançamento retroativo; só muda por substituição explícita.
9. (Fase B) IRPJ e CSLL do mesmo mês no mesmo modo (art. 47 § 1º).
10. Payload de auditoria só com ids e centavos como string, sem PII (allowlist do `auditCanonical.ts` na mesma
    mudança).
11. (F-X7-4 a) Falha no commit 2 (provisão) ⇒ apuração confirmada com `provisaoPendente = true`; o reconcile 2× é
    idempotente, **asserindo a segunda chamada**.

## 14. Sinal humano — estado do gate

- **F-X7-1:** ✅ (a), 29/09.
- **F-X7-2 a F-X7-14:** ✅ 02/10, questionário em 4 lotes; todos na recomendação. Cédulas com a resposta literal em
  [`D-2026-10-02-X7-TAX-ASSESSMENT-FORKS`](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md). O F-X7-9
  migra para o ADR do X9 (efeito do F-X7-8 → a), que herda o (b).
- **Planejamento autorizado (02/10)** → [`BE-INCR-TAX-ASSESSMENT-A-brief.md`](../accounting/BE-INCR-TAX-ASSESSMENT-A-brief.md).
  Código só com "executa".
- **`Accepted` em 02/10.** As notas dos nós ([X7](../plano/nos/X7.md) e [X9](../plano/nos/X9.md)) apontam para este
  ADR na seção "Docs".

## 15. Verificação na fonte primária (29/09)

Pedido do dono, depois da 1ª versão: *"Se são artigos de lei, precisa ter pesquisado antes"*.

**Como cada fonte foi lida:**
- **Planalto** (leis e decreto), pelo navegador embutido, porque o antirrobô do Planalto derruba o WebFetch
  (ECONNRESET). Texto compilado, sem os trechos tachados:
  - Lei 9.430/96 — <https://www.planalto.gov.br/ccivil_03/leis/l9430.htm>
  - Lei 8.981/95 — <https://www.planalto.gov.br/ccivil_03/leis/l8981.htm>
  - Lei 7.689/88 — <https://www.planalto.gov.br/ccivil_03/leis/l7689.htm>
  - Lei 9.249/95 — <https://www.planalto.gov.br/ccivil_03/leis/l9249.htm>
  - Lei 9.250/95 — <https://www.planalto.gov.br/ccivil_03/leis/l9250.htm>
  - LC 224/2025 — <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm>
  - LC 214/2025 — <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>
  - Decreto 9.580/2018 (RIR) — <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>
- **Receita** (INs), pela API do Sijut, a mesma de onde veio a IN 1.700 do corpus, visão compilada:
  - IN RFB 2.305/2025, com a redação da IN 2.306/2026 — `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/148694/visao/multivigente`
  - IN RFB 2.237/2024 — mesma API, ato `141910`
  - IN RFB 2.181/2024 — mesma API, ato `136650`
- **Sefaz-SP:** Portaria SRE 2/2025 — <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-2-de-2025.aspx>
- **PDFs oficiais**, lidos com `pdftotext`. O WebFetch salvou a cópia sozinho na pasta de resultados da sessão.
  **Nada foi copiado para o repo nem para o corpus**, porque isso exige autorização (decisão 10 de 29/09).

| Documento | Origem | Bytes | sha256 (12) | Observação |
|---|---|---|---|---|
| Manual da ECF L12, atualização jul/2026 | gov.br/sped, `manual_ecf_leiaute_12_20_05_2026_ac_2025_sit_esp_2026.pdf` | 6.508.506 | `f583475c109b` | **não** é a versão do MANIFEST (`7216ec2bd62d`) |
| Manual do MIT, jan/2025 | URL do MANIFEST `manual-mit` | 1.791.656 | `49da7ca21177` | igual ao MANIFEST |
| Leiaute JSON de importação do MIT 1.0 (retificado em 20/02/2025) | gov.br/receitafederal, `mit_leiaute_json_importacao_20-02-2025.pdf` | ~280 mil | `4e840b311cca` | fora do MANIFEST |

**O que mudou no ADR por causa da verificação:**
1. **Prazo da DCTFWeb:** está no art. 6º da IN 2.237, não nos arts. 8º–9º (erro herdado do dossiê).
2. **LC 224:** o limite de R$ 5 mi está no § 5º, não no § 4º VII. A regra de rateio existe na lei e na IN 2.305
   (R$ 1,25 mi por trimestre, acerto no T04). A CSLL começa em 01/04/2026. A estimativa do Real fica fora. O
   **F-X7-10 passou de (a) bloquear para (b) implementar**.
3. **MIT:** importa JSON com leiaute oficial. O **F-X7-9 passou de (a) ficha para (b) arquivo**.
4. **Balancete no Diário:** requisito novo no B3 (Lei 8.981 art. 35 § 1º a). A forma na ECD virou insumo (§10 item 7).
5. **`FORMA_TRIB_PER`:** o `E` é só do caso REFIS; o Real anual usa `R` (§2 e B8).
6. **`MES_BAL_RED` e `A00`:** passaram de inferência a fato (p.74 e p.128). O F-X7-6 usa `A00..A12`.
7. **Prazo do ajuste anual** (§9 item 6): resolvido pela Lei 9.430 art. 6º.
8. **Retirado:** "IN 1.700 do corpus defasada" (§10 item 6).
9. **CSLL:** os 9% foram conferidos (Lei 7.689 art. 3º III). As alíquotas novas de financeiras ficaram registradas
   como fora do alvo (D8; §11 item 3).

**Segunda rodada (29/09, pedido do dono: "Tenta verificar esses"):**

| Documento | Origem | sha256 (12) | Observação |
|---|---|---|---|
| Tabelas Dinâmicas da ECF L12 (.xlsx, 79 abas) | gov.br/sped, página "atualização 28/05/2026"; o arquivo servido é o de 24/09/2026 | `2a4c9688df7a` | fora do MANIFEST (`366b8d9030a0` era outra versão) |
| Manual da ECD L9, jan/2026 | gov.br/sped | `7ddf47755f61` | **igual** ao MANIFEST |
| Tabelas de códigos IRPJ e CSLL | páginas HTML da Receita (navegador) | — | atualizadas em 12/03/2024 |
| ADI 7936 e ADI 7944 | `portal.stf.jus.br/processos` (navegador) | — | andamentos lidos em 29/09 |

**O que mudou por causa da segunda rodada:**
1. Os cálculos de N620/N660 são do PVA, o que reforça o F-X7-2 (a).
2. O código de receita depende de Lucro Real obrigatório × por opção, então o A1 ganha esse dado.
3. A transcrição do balancete no Diário é suprida pela ECD, então o B3 fica mais simples.
4. As ADIs contra a LC 224 estão sem cautelar, e as liminares individuais viraram uma chave por cliente (§9 item 1).

**O que continua sem verificação:**
- se o MIT usa exatamente a tabela de códigos da DCTF (inferido pelo formato);
- as liminares dos TRFs, que não foram conferidas no tribunal e valem só para quem as obteve.
