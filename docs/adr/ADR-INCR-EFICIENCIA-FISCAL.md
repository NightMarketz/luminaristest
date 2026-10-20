# ADR-INCR-EFICIENCIA-FISCAL — Eficiência fiscal lícita como módulo de sugestão e guarda: combo itemizado com desconto incondicional rateado e piso por item, segregação por NCM, simuladores (fator r, regime, remuneração do sócio), alertas (sublimite, salão-parceiro, interdependência), guarda anti-simulação no documento fiscal e relatório de economia (nó EFICIENCIA-FISCAL)

> **Verificação legal de 20/10/2026** (dossiê `pesquisas-legais/eficiencia-fiscal-praticas/relatorio.md`, acervo
> ctresb/leis + Planalto compilado + Sijut/CGSN/CARF/STF/STJ; pesquisa consolidada em
> `docs/accounting/PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md`). Artigos conferidos: CTN arts. 116 p.ú., 148, 149 VII [D01];
> Lei 8.137 art. 1º II e IV [D02]; LC 123 arts. 3º § 1º e § 4º III/IV/IX, 18 § 4º-A e §§ 5º-J/5º-K/5º-M e § 24 [D04];
> Lei 10.147 arts. 1º I "b" e 2º [D05]; Lei 12.592 art. 1º-A § 5º (red. Lei 13.352) [D23][D07]; LC 214 arts. 5º, 7º, 12,
> 13, 127, 128, 130, 136, 341-F, 542 XI [D08] (compilada no Planalto — o acervo [D03] era republicação); LC 87 arts. 13 I
> e § 1º II "a", 15 [D31] (base do ICMS = "o valor da operação"). Referências `[Dnn]` são do dossiê (atualizado em
> 20/10 12:50 com o esclarecimento do dono — commit `7f2a7609` do #776).

- **Data:** 2026-10-20
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork está decidido e nenhum código está autorizado.
- **Autor:** `sessao-planejamento` (agente), com base em `origin/main` `b60418a3` + branch do PR #776 (`206ee6d5`,
  onde vivem a pesquisa, o dossiê e a cédula). **Empilhado no #776** por conteúdo: a cédula
  `D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR` e a linha F1.5 da `FILA-ORDEM` só existem lá.
- **Autorização (ORCH-006), citada:**
  - dono, chat, 2026-10-20: *"Commita a pesquisa e a linha F1.5 no PR #776. Autorizo planejar o PRE-ADR do
    EFICIENCIA-FISCAL — sessao-planejamento, sem 'executa'."* (cédula
    [`D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR`](../plano/decisoes/D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR.md)).
  - Pedido de origem, mesmo dia: *"precisamos ter uma sessão de instalar práticas de eficiência fiscal, pesquise aqui
    algumas, por exemplo a mudança na cobrança e lucro em produtos num pacote de produtos, onde vc mantém o valor da
    soma dos produtos no combo, mas muda o valor na nota para o produto que possui uma alíquota menor de imposto … para
    deixarmos automática no sistema"*.
  - **Esclarecimento do dono, mesmo dia** (chat, 20/10, relatado pela sessão de origem e gravado na pesquisa §0/§2 e na
    A1 do dossiê, commit `7f2a7609` do #776): *"A ideia era colocar preco de custo em produtos com muito imposto, nao
    precisa ser um preco fora da realidade"*. Regra que o dono fixou para o item 1: desconto do combo = soma dos preços de
    catálogo − preço do combo; aloca-se **primeiro aos itens de maior carga tributária, até o piso = custo** (custo médio
    do estoque, FIN-10, nunca abaixo); o resto vai aos demais; **nenhum item sobe acima do seu preço de catálogo**; cada
    item vai ao documento fiscal com o seu preço e o desconto incondicional destacado; o rateio proporcional fica como
    alternativa configurável.
  - **Passo 1 (cobertura):** a autorização cobre exatamente **este PRE-ADR e a nota do nó** — sem BRIEF, sem código.
    **Divergência a reportar (cobre menos que o pedido de origem):** o pedido fala em "instalar… deixarmos automática";
    este PRE-ADR só planeja. Sobre o exemplo: na leitura literal da primeira mensagem (preço "fora da realidade" para
    manter o total) ele é **ilícito** (§3, L1–L6) e a cédula o fixou como "não entra"; na leitura esclarecida pelo dono
    (item de maior carga **a preço de custo**, nunca abaixo; item de menor carga **no catálogo**, nunca acima; diferença
    = desconto incondicional destacado) ele é **lícito com guardas** (A1 reescrita; LC 87 art. 13 I / art. 15; LC 214
    art. 12) e **é a regra padrão do item 1 (D5)**. O que continua fora, como invariante I-1: item abaixo do custo e item
    acima do catálogo. Rediscutir isso exige ADR novo com sinal humano, não fork deste.
- **Related:** `PRE-ADR-SIMPLES-NACIONAL-CALCULO` / BRIEF `BE-INCR-SIMPLES-NACIONAL` (X14: `simplesCalc.apurar`,
  `fatorR`, `SEGREGACAO_EXCLUI`, `SimplesSegregacaoManual`, `SalaoParceriaContrato`, `ReceitaFiscalLinha.excluir`) ·
  `ADR-INCR-TAX-ASSESSMENT` (X7: `TaxAssessment`, `entradaInformada`, 2 commits + CAS) · BRIEF
  `BE-INCR-FISCAL-OBLIGATION-PROFILE` (X13: `CompanyFiscalProfile.regime` por ano) · BRIEF `BE-INCR-LEGAL-PARAMS`
  (tabelas versionadas, `PIS_COFINS_MONOFASICO_NCM` já existe) · BRIEF `BE-INCR-NFCE` item 10 (`ProductFiscalProfile`
  com `ncm`, F-NFCE-3 b — ainda não em `main`) · `ADR-INCR-REVENUE-SPLIT-by-nature` (seam pós-commit da venda) · BRIEF
  `BE-INCR-DT-NO-CONSUMER-CALLS` (#773: o motor não chama consumidor) · `ADR-INCR-APPROVAL-maker-checker`
  (`EntryApprovalService`: molde proposta → aprovação) · BRIEF `BE-INCR-IRRF-DISTRIBUICAO` (sócios, dividendos, JCP) ·
  nós irmãos `RETENCOES-FONTE` e `IBS-CBS-2027` (F1) · `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed` ·
  `R-motor-regras`.

## TLDR (2 linhas)

O sistema passa a **sugerir** a economia lícita disponível (desconto do combo alocado ao item de maior carga até o custo — regra do dono de 20/10 —, segregação monofásico/ST por NCM, fator r, regime, remuneração do sócio, salão-parceiro) **com o artigo citado**, a **registrar** cada sugestão como `TaxOptimizationSuggestion` (proposta → aceita/recusada, por quem, base legal, economia estimada) e a **bloquear** no documento fiscal a variante ilícita (item abaixo do custo, item acima do catálogo, desconto fora da nota, condicional lançado como incondicional).
**Risco principal:** o preço de custo é "o valor da operação" (LC 87 art. 13 I; LC 214 art. 12), mas em 2027 o fisco pode tomar o preço avulso do mesmo item como "valor de mercado" (LC 214 art. 13 I "b") — **sem posição oficial lida** (nenhuma SC Cosit nem acórdão CARF sobre alocação de desconto em kit). A defesa é a consistência (mesma regra em todo combo, tabela publicada, custo documentado no estoque), e a pergunta P-EF-1 vai ao contador **antes de qualquer `executa` do PR-1**.

---

## 1. Contexto e objetivo

- **O que o dono pediu e o que a lei permite.** O exemplo do combo (manter o total e declarar na nota o item menos
  tributado por mais do que vale) é preço inexato no documento fiscal (§3, I-1). O que sobra, e vale dinheiro para
  salão e clínica, é a versão lícita: itemizar pelo preço real e dar **desconto incondicional** destacado (LC 123 art.
  3º § 1º; LC 214 art. 12 § 2º III), **segregar** a revenda monofásica/ST (LC 123 art. 18 § 4º-A), cruzar o **fator r**
  com folha real (§§ 5º-J/K/M), formalizar o **salão-parceiro** (Lei 12.592 art. 1º-A § 5º), e **escolher regime e anexo
  por simulação** sobre os 12 meses reais do razão.
- **O que já está decidido e este PRE-ADR respeita (§4):** X14 calcula fator r e segregação, mas a segregação é
  **manual por parcela** (`SimplesSegregacaoManual`) e `ReceitaFiscalLinha.excluir` nasce vazio "até o X10a"; o desconto
  da venda é **por venda** (`SalesModule.discountAmount`), sem rateio por item nem flag incondicional/condicional; o
  pacote (`PackageCatalogModule`) é crédito monetário, "NOT an itemized combo"; o motor DynamicTable não chama consumidor
  (#773) e serviços Prisma não entram em `RuleContext`/`RulePlugin` (CLAUDE.md §STOP).
- **Objetivo:** fixar (i) a **fronteira do lícito como invariante** do módulo (§3/§13); (ii) os **11 comportamentos**
  da pesquisa §5 como checklist por PR (§6); (iii) o **model** `TaxOptimizationSuggestion` e **onde** a venda valida o
  rateio sem tocar `DynamicTableService` (§5 D4, §7); (iv) os **forks** (§8) e as **perguntas ao contador** (§9).

## 2. Evidência de código (CBM-001 — lida em `origin/main` `b60418a3`)

| Ponto | O que existe | Arquivo:linha |
|---|---|---|
| Venda | `SalesModule` com `subtotal`, `discountAmount` (**por venda**), `taxAmount`, `totalAmount`; `requiresTables: ['saleItems']`; `aboveCatalogPrice` (pacote vendido acima do catálogo) | `presets/modules/finance/SalesModule.ts:14,24,49-52,90-96` |
| Itens | `saleItems`: `saleId, itemType, productId?, serviceId?, packageId?, description, quantity, unitPrice, responsibleEmployeeId…` — **sem** desconto por item, sem preço de catálogo gravado, sem NCM | `presets/modules/finance/SalesItemsMixed.ts:14-25` |
| Pacote | "monetary credit, NOT an itemized combo: there is no component/entitlement list" | `presets/modules/finance/PackageCatalogModule.ts:9-13` |
| Guarda atual no finalize | `discount > subtotal ⇒ 400`; totais recalculados `totalAmount = max(0, subtotal − discount)` dentro do plugin | `rules/plugins/SalesPlugin.ts:140-151, 309-319` |
| Seam Prisma-side da venda | `features/sales/services/RegisterPaymentService.ts` recebe `DynamicTableService` + `IDynamicTableRepository` + `IDynamicTableWriteEffects`, escreve via `isSystem` whitelisted e dispara `SaleSettlementBridge` **pós-commit**; rotas `POST /sales/cancel|return|pay` | `RegisterPaymentService.ts:4-34`, `routes/sales.ts:8-11` |
| Bridge lê itens pelo repositório | `sync/bridges/saleItems.ts` classifica Product/Service/Package e soma `revenueByNature` "via the DynamicTable REPOSITORY only… never touches DynamicTableService/RuleContext/RulePlugin" | `saleItems.ts:9-12` |
| Subrazão fiscal de receita | `ReceitaFiscalLinha { natureza SERVICO\|REVENDA, cTribNac?, productRef?, receitaCents, excluir Json (vazio até o X10a), parceriaContratoId?, cotaProfissionalCents }` | `prisma/schema.prisma:2871-2903` |
| Segregação hoje | `SimplesSegregacaoManual` por competência (`parcelas` JSON, `MOTIVOS_SEGREGACAO = MONOFASICO\|ICMS_ST\|ISS_RETIDO\|MONOFASICO_E_ICMS_ST`) | `SimplesDto.ts:36`, `ISimplesEntradasRepository.ts` |
| Fator r | `fatorR(historico, base, receitaPaCents, folhaPaCents)` puro; `folhaCents` vem do histórico mensal informado | `models/simplesCalc.ts:257-275` |
| Apuração do Simples | `apurar(entrada: ApuracaoInput, linhas: LinhaLegal[])` puro; `ApuracaoInput.atividades[].parcelas[].excluir` | `models/simplesCalc.ts:89-103, 317` |
| Salão-parceiro | `SalaoParceriaContrato { profissionalContactId, cotaSalaoBp, naturezaCota, homologadoEm, sindicato, vigente… }` | `prisma/schema.prisma:2846-2866` |
| Tabelas de lei | `LEGAL_PARAMETER_TABELAS` inclui `PIS_COFINS_MONOFASICO_NCM`, `SIMPLES_*`, `CODIGO_RECEITA` | `legalParameters/models/legalParameter.ts:9-36` |
| Perfil fiscal | `CompanyFiscalProfile.regime MEI\|SIMPLES\|PRESUMIDO\|REAL` por ano; `FiscalProfile.regimeTributario, pisCofinsRegime` por unidade | `schema.prisma:1693-1700, 1598-1612` |
| Perfil de serviço / produto | `ServiceFiscalProfile.cTribNac` existe; `ProductFiscalProfile` (`ncm` 8 dígitos) está **só no BRIEF da NFC-e** (item 10, F-NFCE-3 b) | `schema.prisma:1793-1812`; `BE-INCR-NFCE-brief.md:388-405` |
| Custo do produto | `InventoryItem.totalValueCents / qtyOnHand` = média móvel (INCR-INVENTORY); `sale.cogs` carrega o CMV | `schema.prisma:1407-1434`; `AccountingSyncPort.ts:32,79` |
| Apuração com entrada informada | `TaxAssessment.entradaInformada`, `parametrosSha256`, `avisoParametroLegal` | `schema.prisma:2744-2790` |
| Maker-checker | `EntryApprovalService.createDraft/submitForApproval/approveEntry/rejectEntry` | `services/EntryApprovalService.ts:79-334` |
| Simulação | `grep simula` em `server/src` = só testes (pesquisa §4) | — |

## 3. Fonte legal — a fronteira do lícito (cada guarda com artigo e link do acervo)

| # | Regra | Texto (literal, do dossiê) | Norma · link | Grau | Guarda que ela funda |
|---|---|---|---|---|---|
| L1 | Arbitramento do preço | "a autoridade lançadora… arbitrará aquele valor ou preço, sempre que sejam omissos ou não mereçam fé as declarações… ou os documentos expedidos pelo sujeito passivo" | CTN art. 148 — [acervo D01](https://github.com/ctresb/leis/blob/04685ef7689b7028d0dc835e5cde644ad7a2d328/federal/leis-ordinarias/1966/lei-5172-1966-10-25.md) | V | I-1, I-2 (preço de item = catálogo) |
| L2 | Norma antielisão | "poderá desconsiderar atos ou negócios jurídicos praticados com a finalidade de dissimular a ocorrência do fato gerador… observados os procedimentos a serem estabelecidos em lei ordinária" | CTN art. 116 p.ú. — [D01] | V (procedimento sem lei ordinária: STF ADI 2446) | I-6 (alerta "forma sem substância") |
| L3 | Revisão por simulação | "quando se comprove que o sujeito passivo… agiu com dolo, fraude ou simulação" | CTN art. 149 VII — [D01] | V | I-1 (bloqueio, não aviso) |
| L4 | Crime | "inserindo elementos inexatos… em documento ou livro exigido pela lei fiscal" (II); "emitir ou utilizar documento que saiba ou deva saber falso ou inexato" (IV) | Lei 8.137 art. 1º II e IV — [acervo D02](https://github.com/ctresb/leis/blob/4014f7c4c6ca10c8b2509f14950fdb95d554a963/federal/leis-ordinarias/1990/lei-8137-1990-12-27.md) | V | I-1 (o sistema nunca emite preço de item que não é o praticado) |
| L5 | Combo com tratamentos diferentes (2027+) | "será obrigatória a especificação de cada fornecimento e de seu respectivo valor" (caput); § 3º: cobrança unificada irregular ⇒ "cada fornecimento será considerado independente… e a base de cálculo… será arbitrada na forma do art. 13" | LC 214 art. 7º caput, I, II, §§ 1º–3º — [Planalto D08](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm) (acervo [D03] é só a republicação) | V | I-2 (itemizar sempre), I-7 (principal + acessório é classificação) |
| L6 | Arbitramento IBS/CBS | "for declarado em documento fiscal valor notoriamente inferior ao valor de mercado"; base = "valor praticado em operações comparáveis entre partes não relacionadas" | LC 214 art. 13 I "b", p.ú. I — [D08] | V | I-3 (piso por item) |
| L7 | Desconto incondicional (IBS/CBS) | "parcela redutora do preço da operação que conste do respectivo documento fiscal e não dependa de evento posterior" | LC 214 art. 12 § 2º III e § 3º — [D08] | V | I-4 (desconto só se consta do documento, por item) |
| L8 | Receita bruta do Simples | "não incluídas as vendas canceladas e os descontos incondicionais concedidos" | LC 123 art. 3º § 1º (red. LC 214) — [acervo D04](https://github.com/ctresb/leis/blob/394a7e97c8604703a3ea6638df61ab1873cecc6e/federal/leis-complementares/2006/lcp-123-2006-12-14.md) | V | I-4; `ReceitaFiscalLinha.receitaCents` = líquido do desconto incondicional |
| L9 | Segregação obrigatória | "O contribuinte deverá segregar, também, as receitas: I - … tributação concentrada em uma única etapa (monofásica)… substituição tributária…" | LC 123 art. 18 § 4º-A I–V e § 12 — [D04] | V | PR-2 (segregação por NCM é **obrigação**, não opção) |
| L10 | Monofásico na revenda | "São reduzidas a zero as alíquotas… pelas pessoas jurídicas não enquadradas na condição de industrial ou importador" (33.03–33.07 exc. 33.06) | Lei 10.147 art. 1º I "b" e art. 2º — [acervo D05](https://github.com/ctresb/leis/blob/dc08d8291baac23e97bb4c5095389052d6846822/federal/leis-ordinarias/2000/lei-10147-2000-12-21.md) · **revogada em 01/01/2027** (LC 214 art. 542 XI) | V | PR-2 com vigência `vigenteAte = 2026-12-31` |
| L11 | Fator r | "Anexo III… caso a razão entre a folha de salários e a receita bruta… seja igual ou superior a 28%" (§ 5º-J); 12 meses anteriores (§ 5º-K); < 28% ⇒ Anexo V (§ 5º-M); folha = remunerações a PF + CPP + FGTS + pró-labore (§ 24) | LC 123 art. 18 §§ 5º-J, 5º-K, 5º-M, § 24 — [D04] | V | PR-3 simulador; I-5 (folha simulada ≠ folha real) |
| L12 | Salão-parceiro | "A cota-parte destinada ao profissional-parceiro não será considerada para o cômputo da receita bruta do salão-parceiro ainda que adotado sistema de emissão de nota fiscal unificada" | Lei 12.592 art. 1º-A § 5º (red. Lei 13.352) — [acervo D23](https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md) · contrato escrito homologado (§ 8º) | V | PR-4 alerta (X14 já aplica a cota) |
| L13 | Interdependência (vedação ao Simples) | sócio "de outra empresa que receba tratamento jurídico diferenciado… desde que a receita bruta global ultrapasse o limite" (III); "mais de 10%… de outra empresa não beneficiada" (IV); "resultante… de cisão… nos 5 anos-calendário anteriores" (IX) | LC 123 art. 3º § 4º III, IV, IX — [D04] | V | PR-4 alerta pelo cadastro de sócios (IRRF-DISTRIBUICAO) |
| L14 | Principal + acessório | acessório = "condição ou meio" do principal ⇒ tratamento do principal | LC 214 art. 7º II e § 2º — [D08] | V (texto); aplicação a salão/clínica = A2 | I-7 |
| L15 | Multa qualificada | 100% (reincidência 150%) | Lei 9.430 art. 44 § 1º VI–VII; LC 214 art. 341-F | V | texto do alerta de risco (PR-4) |
| L16 | Alíquotas reduzidas 2027 | saúde 60% só Anexo III (**estética não consta**); profissões 30% (art. 127, lista fechada); higiene 60% só Anexo VIII | LC 214 arts. 127, 128 II, 130, 136 — [D08] | V (lista); estética = NÃO CONFIRMADO | PR-3 simulador 2027 com aviso "enquadramento não confirmado" |
| L17 | Base do ICMS = preço praticado | "na saída de mercadoria… o valor da operação" (art. 13 I); descontos condicionais integram a base (§ 1º II "a"); "Na falta do valor… o preço corrente da mercadoria" (art. 15) | LC 87 arts. 13 I e § 1º II "a", 15 — [acervo D31](https://github.com/ctresb/leis/blob/0ee2fd30e01d0fb9cb3fb42d7ede8de312ea77e4/federal/leis-complementares/1996/lcp-87-1996-09-13.md) | V | D5: preço de custo é preço real e praticado ⇒ base; o "preço corrente" só entra na falta do valor |

**Elisão** (lícita, o que o módulo sugere): escolha que a própria lei oferece, antes do fato gerador, com substância —
regime, anexo, segregação, desconto real destacado, parceria com contrato. **Simulação** (ilícita, o que o módulo
bloqueia): documento que não espelha o negócio — preço de item inventado, folha de papel, parceria fictícia.
Posição oficial sobre **alocação de desconto entre itens de kit**: **não encontrada** (SC Cosit 98048/2026, 137/2024 e
Disit 138/2011 tratam de classificação do kit, não de rateio) — grau da ambiguidade A1 = "sem fonte"; a leitura adotada
(dono, 20/10; dossiê A1 reescrita) é a 1: preço de custo é valor da operação (L17) e o fisco precisa provar que o
documento "não merece fé" (L1); o contador confirma a evidência de custo a guardar (P-EF-1).

## 4. Decisões já ratificadas que limitam o desenho

| Decisão | Efeito aqui |
|---|---|
| `D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR` (dono, 20/10) | "O exemplo do combo não entra… O sistema **bloqueia** essa variante" (= preço fictício: abaixo do custo ou acima do catálogo); "Sugere e guarda; o humano decide (maker-checker)"; A1–A3 ao contador. **Não é fork** |
| **Esclarecimento do dono (chat, 20/10, pesquisa §0/§2, commit `7f2a7609`)** — "colocar preco de custo em produtos com muito imposto, nao precisa ser um preco fora da realidade" | Regra do item 1 **decidida pelo dono**: desconto do combo alocado primeiro aos itens de maior carga até o piso = custo; resto aos demais; teto = catálogo; tudo destacado; proporcional só como alternativa configurável. D5/D6 a transcrevem; **não é fork** (F-EF-2 só decide o que o dono não disse) |
| `ADR-PERSISTENCE-BOUNDARY` (dono, 14/10) + CLAUDE.md §STOP | Sugestão, guarda e relatório são **Prisma first-class** (lei desenha; imutabilidade da trilha; agregação em volume contra razão/subrazão). Venda e catálogo continuam DynamicTable; nenhum serviço Prisma entra em `RuleContext`/`RulePlugin` |
| `R-motor-regras` (rejeitada) | A "regra" é **tabela** (`legal_parameters`) + função pura nomeada por prática; nada de engine/DSL de otimização |
| BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS` (#773) | O plugin de vendas não chama a sugestão; a sugestão **lê** a venda (repositório) e é acionada pelo seam Prisma-side (`features/sales`) ou por rota própria |
| X14 (done) F-SN-5 c, F-PR4-12 b | `ReceitaFiscalLinha` é a subrazão por item com `excluir` — PR-2 preenche `excluir` **a partir da NCM** em vez de deixar vazio; `SimplesSegregacaoManual` continua mandando quando existir (precedente F-RET-8 a) |
| X7 F-TA-9/PR-4 (`entradaInformada`, `parametrosSha256`) | Simuladores gravam `parametrosSha256` e nunca recalculam silenciosamente |
| `ADR-INCR-APPROVAL-maker-checker` | `TaxOptimizationSuggestion` segue o ciclo PROPOSED → ACCEPTED/REJECTED com ator ≠ proponente quando o proponente é o sistema **e** o aceite tem efeito no documento fiscal (F-EF-3 decide quem aprova) |
| `ADR-INCR-REVENUE-SPLIT` + `saleItems.ts` bridge | A classificação do item (Product/Service/Package) e os valores por natureza já são lidos pelo repositório pós-commit; PR-1 reusa o mesmo leitor para o rateio |
| BRIEF `BE-INCR-NFCE` item 10 (F-NFCE-3 b, ratificado 02/10) | `ProductFiscalProfile.ncm` é o lugar da NCM — PR-2 **depende** dele (ou do nó F4 `TABELA-TRIBUTARIA-PRODUTO`, F-EF-5) |
| `D-2026-10-14-FILA-ORDEM-RATIFICADA` + F1.5 (cédula) | Entra depois de F1 e antes de F2; nó só roteia com forks ratificados |
| T9 BRL-only · T10 · ACC-014 (`MAX_CENTS`) | Centavos `BigInt` no Prisma; a venda (DynamicTable) continua float — a conversão é **uma** fronteira (molde do mapper do split) |

## 5. Decisões fixadas (sem fork)

**D1 — O módulo sugere e guarda; não decide.** Toda prática entra como (a) **cálculo** puro com artigo citado, (b)
**sugestão** persistida (`TaxOptimizationSuggestion`, D3) que um humano aceita ou recusa, e/ou (c) **guarda** no
documento fiscal (bloqueio 400 nomeado ou alerta `INFO|WARN` no molde do X14). Nenhuma prática altera o razão, a
apuração ou o documento sem aceite humano registrado.

**D2 — A fronteira do lícito é invariante, não configuração.** As guardas I-1..I-7 (§13) não têm flag para desligar
por tenant. O que o tenant configura é **política comercial** (margem mínima do piso, rateio padrão), nunca "pode
declarar preço diferente do praticado".

**D3 — Model `TaxOptimizationSuggestion` (Prisma first-class).** Uma linha por (escopo, prática, período/venda):
`practice` (enum fechado das 11 práticas), `status PROPOSED|ACCEPTED|REJECTED|EXPIRED`, `subjectType|subjectId`
(venda, competência, ano, sócio), `legalBasis` (artigo + link, texto do dossiê), `estimatedSavingCents`, `calc` (memória
JSON no molde do X7), `parametrosSha256`, `proposedBy SYSTEM|userId`, `decidedById`, `decidedAt`, `decisionReason`.
Imutável depois de decidida (nova proposta ⇒ nova linha com `supersedesId`). Sem soft-delete (é trilha). Auditoria
`tax.suggestion.proposed|accepted|rejected` com ids, prática e cents — **sem PII** (sócio por id).

**D4 — Onde a venda valida o rateio sem tocar `DynamicTableService`.** O combo itemizado e o rateio do desconto vivem
em **dois lugares separados por camada**:
1. **Dentro do motor, só dado de preset:** `saleItems` ganha `catalogUnitPrice` (snapshot do preço de catálogo no
   momento da venda) e `discountCents` por item; `SalesModule` ganha `discountKind UNCONDITIONAL|CONDITIONAL`. O
   `SalesPlugin` continua a única guarda **aritmética** no finalize (hoje `discount ≤ subtotal`), acrescida de
   `Σ item.discountCents = discountAmount` e `unitPrice = catalogUnitPrice` — tudo com dado da própria tabela, zero
   serviço Prisma injetado (CLAUDE.md §STOP respeitado).
2. **Fora do motor, no seam Prisma-side `features/sales`:** um `SaleFiscalGuardService` (molde
   `RegisterPaymentService`: recebe `IDynamicTableRepository` + serviços Prisma) exposto em `POST /sales/:id/fiscal-check`
   e chamado **antes da emissão** pelo `FiscalDocument` (X10a/X10i: pré-condição de emissão por item, como o item 11 do
   BRIEF da NFC-e já faz com o `ProductFiscalProfile`). Ele lê os itens pelo repositório (como `saleItems.ts`), aplica o
   **piso** (custo médio do `InventoryItem` × margem mínima de `TaxOptimizationPolicy`), a **regra de rateio** e as
   invariantes I-2..I-4, e devolve `{ ok, violations[], suggestion? }`. O bloqueio é **na emissão do documento fiscal**
   (onde a lei morde — L4, L5), não na gravação da venda interna; a venda pode ficar `Finalized` com aviso.
3. O desconto rateado por item alimenta `ReceitaFiscalLinha.receitaCents` (líquido) via o mapper pós-commit existente
   (ADR-INCR-REVENUE-SPLIT), para que a receita bruta do Simples saia certa (L8) sem segunda fonte.

**D5 — Alocação fiscal do desconto do combo (regra do dono, 20/10).** `desconto = Σ preço de catálogo − preço do combo`
(≥ 0; combo acima da soma ⇒ `aboveCatalogPrice`, sem alocação). A alocação percorre os itens em **ordem decrescente de
carga tributária** e dá a cada um o máximo até o seu **piso = custo** (D6); o que sobrar vai ao item seguinte; **nenhum
item recebe desconto negativo** (nunca sobe acima do catálogo). Se o desconto exceder `Σ (catálogo − custo)` de todos os
itens, o combo está abaixo do custo total ⇒ `COMBO_ABAIXO_DO_CUSTO` (I-3, bloqueio). Arredondamento em centavos, resto
no último item que recebeu desconto. A **ordem de carga** é dado, não engine: `cargaBp` por item calculado pela tabela
tributária vigente na data — no Simples, alíquota efetiva do anexo da atividade menos os tributos excluídos pela
segregação (`SEGREGACAO_EXCLUI`, NCM monofásica/ST); no Presumido/Real, PIS/COFINS + ICMS/ISS por CST/NCM/`cTribNac`; em
2027, alíquota de IBS/CBS por item (`IBS-CBS-2027`, com as reduções L16). Sem dado suficiente para ordenar (sem NCM, sem
`cTribNac`) ⇒ aviso `ORDEM_DE_CARGA_INDETERMINADA` e alocação **proporcional** (alternativa configurável em
`TaxOptimizationPolicy.criterioAlocacao`, também escolhível pelo tenant como padrão — F-EF-2).

**D6 — Piso de preço por item = custo (nunca abaixo).** Produto: custo médio do estoque (`InventoryItem.totalValueCents
/ qtyOnHand`, FIN-10) na data da venda, gravado como snapshot no item (`custoSnapshotCents`) — é a evidência que o
contador vai querer (P-EF-1). Serviço: não tem custo de estoque — F-EF-1 decide o piso. Pacote (crédito): fora da
alocação. Item abaixo do piso ⇒ **bloqueio** na emissão (`ITEM_ABAIXO_DO_PISO`, I-3) citando L1/L6/L17; item sem custo
registrado ⇒ piso indeterminado ⇒ o item **não recebe desconto além do proporcional** e `WARN` `SEM_CUSTO`.

**D7 — Segregação por NCM é derivação, não opção.** PR-2 preenche `ReceitaFiscalLinha.excluir` a partir de
`ProductFiscalProfile.ncm` × `legal_parameters` tabela `PIS_COFINS_MONOFASICO_NCM` (já existe) + nova `ICMS_ST_NCM_UF`
(linha `DRAFT` até fonte CONFAZ/UF lida) com vigência (`vigenteAte = 2026-12-31` para o monofásico — L10). A
`SimplesSegregacaoManual` da competência, quando existe, **prevalece** com aviso de divergência (precedente F-RET-8 a).

**D8 — Simuladores são funções puras sobre o razão/subrazão, com `parametrosSha256`:** fator r (12 meses do
`SimplesHistoricoMensal` + folha-alvo informada), regime (Simples × Presumido × Real sobre os 12 meses reais; 2027 com
CBS/IBS pela tabela do `IBS-CBS-2027`, linha `DRAFT` ⇒ aviso), remuneração do sócio (pró-labore × dividendos × JCP
reusando o cálculo do `IRRF-DISTRIBUICAO`). Nenhum simulador grava apuração; grava **sugestão** (D3).

**D9 — Relatório de economia por competência** = Σ `estimatedSavingCents` das sugestões `ACCEPTED` com efeito no
período + economia **medida** (quando mensurável: segregação = tributos excluídos; desconto = diferença de base), com o
artigo de cada linha, exportável no pacote do contador (C6b) para assinatura — **nunca** soma sugestões `PROPOSED`.

**D10 — Fora deste nó:** retenções sofridas/compensação (`RETENCOES-FONTE`); crédito amplo de IBS/CBS e split
(`IBS-CBS-2027`); exclusão do ICMS da base de PIS/COFINS (Tema 69 — emenda do X8, achado §11); dividendos/JCP cálculo
(`IRRF-DISTRIBUICAO`; aqui só o simulador consome); `ProductFiscalProfile` em si (NFC-e / `TABELA-TRIBUTARIA-PRODUTO`);
emissão do documento (X10a/X10i); FE (nó `FE-INCR-EFICIENCIA-FISCAL`, posterior).

## 6. Esqueleto de comportamentos por PR (os 11 da pesquisa §5)

Fatiamento proposto (F-EF-6): **PR-1 combo itemizado + rateio + piso + guarda · PR-2 segregação por NCM · PR-3
simuladores · PR-4 alertas + relatório**. Numeração `(p-n)` = prática n da pesquisa §5.

| # | Comportamento | Toca | Canônico reusado | Fork |
|---|---|---|---|---|
| **PR-1** | | | | |
| 1 | `(p-1)` `saleItems` ganha `catalogUnitPrice` (snapshot), `discountCents` e `custoSnapshotCents?`; `SalesModule` ganha `discountKind`; migração de preset aditiva (linhas antigas: `discountCents = 0`, `discountKind = null` ⇒ tratado como `UNCONDITIONAL` só para relatório, nunca para emissão) | presets `SalesItems*`, `SalesModule`, `NumberPresets` | `unitPrice`, `discountAmount` presets; `aboveCatalogPrice` como precedente de snapshot | — |
| 2 | `(p-1)` `SalesPlugin` no finalize: `Σ item.discountCents = discountAmount` (±1 centavo por arredondamento), `discountCents ≥ 0` (nunca acima do catálogo) e `unitPrice = catalogUnitPrice` quando `catalogUnitPrice` presente — 400 nomeado; nada de serviço Prisma | `rules/plugins/SalesPlugin.ts` | guarda `discount ≤ subtotal` existente | — |
| 3 | `(p-1)` Função pura `alocarDescontoFiscal(itens, descontoCents, criterio)` → `{ porItem[], criterio, avisos[] }`: `CARGA_TRIBUTARIA` (padrão, D5: ordem decrescente de `cargaBp`, cada item até o custo, resto ao seguinte) ou `PROPORCIONAL_CATALOGO` (alternativa); `cargaBp` vem de `cargaTributariaDoItem(item, perfil, tabela, data)` pura | `features/sales/models/discountAllocation.ts`, `accounting/models/cargaTributariaItem.ts` | `simplesCalc` (alíquota efetiva do anexo), `SEGREGACAO_EXCLUI`, `pisCofinsCalc`, tabela IBS-CBS | F-EF-2 (só o que o dono não fixou) |
| 4 | `(p-1,10)` Função pura `pisoPorItem(item, politica)` (produto = custo snapshot; serviço = F-EF-1) e `verificarItens(itens, piso, catalogo)` → `violations[]` com código (`ITEM_ABAIXO_DO_PISO`, `COMBO_ABAIXO_DO_CUSTO`, `ITEM_ACIMA_DO_CATALOGO`, `PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO`, `DESCONTO_FORA_DO_DOCUMENTO`, `DESCONTO_CONDICIONAL_COMO_INCONDICIONAL`, `SEM_CUSTO`) e artigo | `features/sales/models/fiscalGuard.ts` | `InventoryItem` média móvel (leitura) | F-EF-1 |
| 5 | `(p-1,10)` Model `TaxOptimizationPolicy` (`criterioAlocacao` padrão, piso de serviço, aprovador) versionada por escopo + DTO `.strict()` + repo + policy (`canManageTaxOptimization` delega a `canManageFiscalProfile`) + rotas em 2 toques | Prisma + camadas | molde `IssBeneficioMunicipal` (vigência, soft-delete) | F-EF-3 |
| 6 | `(p-10)` `SaleFiscalGuardService` + `POST /sales/:id/fiscal-check` (D4.2); chamado pela montagem do `FiscalDocument` como pré-condição (`FISCAL_GUARD_VIOLATION` ⇒ 409 nomeado) | `features/sales/services`, `controllers/salesController.ts`, `FiscalDocument` montagem | `RegisterPaymentService` (molde), `saleItems.ts` (leitor) | — |
| 7 | `(p-1)` Model `TaxOptimizationSuggestion` (D3) + DTO + repo + policy + rotas (`POST …/suggestions/:id/accept|reject`, `GET …/suggestions?status=`) | Prisma + camadas | `EntryApprovalService` (ciclo e ator ≠ proponente) | F-EF-3 |
| 8 | `(p-1)` Sugestão `COMBO_DESCONTO_ALOCADO` gerada no fiscal-check quando a venda tem desconto sem alocação, ou alocação ≠ a do critério padrão: mostra a alocação pela regra do dono (D5), a economia estimada contra o proporcional (Σ carga × diferença de base por item) e o artigo (L7/L8/L17); a alocação escolhida pelo tenant no modal Nova Venda vale sem aceite quando coincide com o critério padrão | serviço | `cargaTributariaDoItem` para estimar | — |
| 9 | `(p-1)` Mapper pós-commit grava `ReceitaFiscalLinha.receitaCents` **líquido** do desconto incondicional rateado (condicional não abate — L7/L8) | `sync/mappers`, `ReceitaFiscalService` | ADR-INCR-REVENUE-SPLIT | — |
| 10 | `(p-2)` Catálogo de kit: `PackageCatalogModule` **não** muda (é crédito); kit itemizado = `saleItems` com `kitRef` opcional (texto do grupo) + `principalItem` boolean por item — classificação principal/acessório é dado de venda, não de catálogo, até o A2 fechar | preset `SalesItems*` | — | F-EF-4 (kit sem NCM própria) |
| **PR-2** | | | | |
| 11 | `(p-3)` Tabela `ICMS_ST_NCM_UF` em `legal_parameters` (DRAFT até fonte) + leitura de `PIS_COFINS_MONOFASICO_NCM` com vigência até 2026-12-31 | migração de dado | LEGAL-PARAMS | F-EF-5 |
| 12 | `(p-3)` Função pura `segregacaoPorNcm(ncm, uf, data, linhas)` → `excluir: TributoSimples[]` | `models/segregacaoNcm.ts` | `SEGREGACAO_EXCLUI` | — |
| 13 | `(p-3)` `ReceitaFiscalService` preenche `excluir` por item a partir de `ProductFiscalProfile.ncm` (ou aviso `SEM_NCM` ⇒ `[]`); `SimplesApuracaoService` usa as linhas; `SimplesSegregacaoManual` prevalece com aviso `SEGREGACAO_DIVERGE` | serviços X14 | `ReceitaFiscalLinha.excluir` | — |
| 14 | `(p-3)` Alerta `SEGREGACAO_INDEVIDA` (NCM fora da faixa monofásica marcada como monofásica) — LC 123 art. 29 V | `SimplesDto` alertas | molde `NFSE_DIVERGE` (severity/motivo) | — |
| **PR-3** | | | | |
| 15 | `(p-4)` `GET /accounting/simples/simulacoes/fator-r?competencia=&folhaAlvoCents=` → r atual, r simulado, anexo, DAS atual × simulado, custo da folha adicional (INSS patronal/FGTS pela tabela), economia líquida, **aviso I-5** | rota + serviço + função pura | `fatorR`, `apurar`, `SimplesHistoricoMensal` | — |
| 16 | `(p-5)` `GET /accounting/simulacoes/regime?ano=` → carga total Simples × Presumido × Real (e 2027) sobre os 12 meses reais; alerta de sublimite (80 %) e de janela de opção (LC 123 art. 16) | rota + serviço | `apurar`, `TaxAssessmentService` (presunção), `pisCofinsCalc`, tabela IBS-CBS (DRAFT ⇒ aviso) | F-EF-7 |
| 17 | `(p-8)` `GET /accounting/simulacoes/remuneracao-socio?ano=&partnerId=` → pró-labore × dividendos × JCP com INSS/IRPF/IRRF 10 %/17,5 %, piso de pró-labore (SC Cosit 228/2023 — aviso "cinzento se irrisório") | rota + serviço | cálculo do `IRRF-DISTRIBUICAO` (depende do seu PR-2/3) | — |
| 18 | `(p-4,5,8)` Cada simulação pode virar `TaxOptimizationSuggestion` (`FATOR_R_FOLHA`, `TROCA_DE_REGIME`, `REMUNERACAO_SOCIO`) com `calc` e `parametrosSha256` | serviço | D3 | — |
| **PR-4** | | | | |
| 19 | `(p-6)` Alerta salão-parceiro: profissional com cota recebida sem `SalaoParceriaContrato` vigente/homologado; parceria vigente mas `ReceitaFiscalLinha.cotaProfissionalCents = 0`; profissional sem CNPJ | serviço + alerta | `SalaoParceriaContrato`, `findParceriasDoProfissional` | — |
| 20 | `(p-11)` Alerta interdependência (L13) pelo cadastro de sócios (`Partner` do IRRF-DISTRIBUICAO): sócio em outra empresa do Simples / >10 % em empresa fora / cisão < 5 anos — dado informado no cadastro, aviso só | serviço | `Partner` (IRRF-DISTRIBUICAO) | — |
| 21 | `(p-5)` Alerta de sublimite/teto: projeção 12 meses ≥ 80 % de R$ 3,6 mi (ICMS/ISS) e R$ 4,8 mi; excesso > 20 % | serviço | `SIMPLES_LIMITE`, `rbt12` | — |
| 22 | `(p-7,9)` Linhas do relatório que **só consomem**: retenções sofridas do mês (`RETENCOES-FONTE` D8) e crédito não tomado (`IBS-CBS-2027`) entram como "economia disponível" quando os nós existirem; até lá `NAO_DISPONIVEL` com o nó citado | relatório | — | — |
| 23 | `(p-11)` `GET /accounting/tax-optimization/report?competencia=` (D9) + `EXPORT_ECONOMIA_FISCAL` no pacote do contador | rota + serviço + C6b | `DataExchangeExportService` | — |
| 24 | Gates: snapshot de DTOs; allowlist `auditCanonical.ts` (`tax.suggestion.*`, `tax.policy.*`, `sale.fiscal_guard.blocked`); openapi path-count; i18n pt/en dos alertas; `check:arch`; `node scripts/plano-vault.mjs check` | vários | — | — |

## 7. Contratos esboçados

```prisma
model TaxOptimizationPolicy {           // política COMERCIAL do tenant (não liga/desliga guarda legal — D2)
  id                 String    @id @default(cuid())
  userId             String
  unitId             String
  criterioAlocacao   String    // CARGA_TRIBUTARIA (padrão — regra do dono 20/10) | PROPORCIONAL_CATALOGO (alternativa)
  pisoServico        String    // F-EF-1: CATALOGO_MINIMO | CUSTO_INFORMADO | SEM_DESCONTO_ALEM_DO_PROPORCIONAL
  aprovador          String    // ADMIN | CONTADOR_RESPONSAVEL | QUALQUER_GESTOR (F-EF-3)
  vigenteDesde       String
  vigenteAte         String?
  createdById        String
  createdAt          DateTime  @default(now())
  deletedAt          DateTime?
  @@index([userId, unitId, vigenteDesde])
  @@map("tax_optimization_policies")
}

model TaxOptimizationSuggestion {
  id                   String    @id @default(cuid())
  userId               String
  unitId               String
  practice             String    // COMBO_DESCONTO_ALOCADO | SEGREGACAO_NCM | FATOR_R_FOLHA | TROCA_DE_REGIME | REMUNERACAO_SOCIO | SALAO_PARCEIRO_CONTRATO | SUBLIMITE | INTERDEPENDENCIA | RETENCAO_SOFRIDA | CREDITO_NAO_TOMADO | PRINCIPAL_ACESSORIO
  subjectType          String    // SALE | COMPETENCIA | ANO | PARTNER | PROFISSIONAL
  subjectId            String
  status               String    // PROPOSED | ACCEPTED | REJECTED | EXPIRED
  legalBasis           Json      // [{ norma, artigo, url, trecho }] — copiado do dossiê, nunca digitado livre
  estimatedSavingCents BigInt    // ≥ 0; 0 permitido (alerta sem economia)
  calc                 Json      // memória (molde MemoriaLinha do X7)
  parametrosSha256     String
  proposedBy           String    // 'SYSTEM' | userId
  decidedById          String?
  decidedAt            DateTime?
  decisionReason       String?   // obrigatório em REJECTED e em ACCEPTED fora do padrão (rateio ≠ proporcional)
  supersedesId         String?
  createdAt            DateTime  @default(now())
  @@unique([userId, unitId, practice, subjectType, subjectId, status]) // 1 PROPOSED viva por assunto
  @@index([userId, unitId, status])
  @@map("tax_optimization_suggestions")
}
```

```ts
// features/sales/dtos/FiscalCheckDto.ts — Zod .strict()
export const FiscalCheckResponseSchema = z.object({
  saleId: z.string(),
  ok: z.boolean(),
  violations: z.array(z.object({
    code: z.enum(['ITEM_ABAIXO_DO_PISO', 'COMBO_ABAIXO_DO_CUSTO', 'ITEM_ACIMA_DO_CATALOGO',
                  'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', 'DESCONTO_FORA_DO_DOCUMENTO',
                  'DESCONTO_CONDICIONAL_COMO_INCONDICIONAL', 'RATEIO_NAO_FECHA', 'KIT_SEM_PRINCIPAL',
                  'SEM_CUSTO', 'ORDEM_DE_CARGA_INDETERMINADA']),
    itemRef: z.string().nullable(),
    severity: z.enum(['BLOCK', 'WARN']),
    legalBasis: z.string(),                 // ex. "CTN art. 148; LC 214 art. 13 I b"
    detail: z.string(),
  })),
  alocacaoSugerida: z.array(z.object({ itemRef: z.string(), discountCents: z.coerce.bigint(), cargaBp: z.number().int().nullable(),
    pisoCents: z.coerce.bigint().nullable() })).nullable(),
  criterio: z.enum(['CARGA_TRIBUTARIA', 'PROPORCIONAL_CATALOGO']),
  suggestionId: z.string().nullable(),
}).strict();

// features/sales/models/discountAllocation.ts — pura (D5)
export interface ItemParaAlocacao { itemRef: string; catalogUnitPriceCents: bigint; quantity: number;
  pisoCents: bigint | null;            // custo (produto) | piso de serviço (F-EF-1) | null = indeterminado
  cargaBp: number | null; }            // carga tributária do item na data (null = indeterminada)
export function alocarDescontoFiscal(itens: readonly ItemParaAlocacao[], descontoCents: bigint,
  criterio: 'CARGA_TRIBUTARIA' | 'PROPORCIONAL_CATALOGO'):
  { porItem: Array<{ itemRef: string; discountCents: bigint }>; criterioAplicado: 'CARGA_TRIBUTARIA' | 'PROPORCIONAL_CATALOGO';
    avisos: Array<'ORDEM_DE_CARGA_INDETERMINADA' | 'SEM_CUSTO'>; excedenteCents: bigint /* > 0 ⇒ COMBO_ABAIXO_DO_CUSTO */ };

// accounting/models/cargaTributariaItem.ts — pura
export function cargaTributariaDoItem(item: { natureza: 'SERVICO' | 'REVENDA'; ncm: string | null; cTribNac: string | null },
  perfil: { regime: 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL'; anexo?: AnexoSimples; uf: string }, data: string,
  linhas: readonly LinhaLegal[]): { cargaBp: number | null; memoria: string[] };

// features/sales/models/fiscalGuard.ts — pura
export interface ItemVendido { itemRef: string; natureza: 'SERVICO' | 'REVENDA' | 'PACOTE'; unitPriceCents: bigint;
  catalogUnitPriceCents: bigint | null; discountCents: bigint; quantity: number; custoSnapshotCents: bigint | null; }
export function verificarItens(itens: readonly ItemVendido[], politica: { pisoServico: string },
  cabecalho: { discountCents: bigint; discountKind: 'UNCONDITIONAL' | 'CONDITIONAL' | null }): Violation[];

// accounting/dtos/TaxOptimizationDto.ts
export const DecideSuggestionSchema = z.object({ reason: z.string().min(3).max(280).optional() }).strict();
export const FatorRSimulacaoQuerySchema = z.object({ competencia: z.string().regex(/^\d{4}-\d{2}$/),
  folhaAlvoCents: z.coerce.bigint().min(0n) }).strict();
export const FatorRSimulacaoSchema = z.object({
  competencia: z.string(), rAtual: z.number(), rSimulado: z.number(), anexoAtual: z.string(), anexoSimulado: z.string(),
  dasAtualCents: z.bigint(), dasSimuladoCents: z.bigint(), custoFolhaAdicionalCents: z.bigint(),
  economiaLiquidaCents: z.bigint(), avisos: z.array(z.string()), parametrosSha256: z.string(),
}).strict();
```

## 8. FORKS — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-EF-1** Piso do **serviço** (o do produto o dono fixou: custo médio do estoque, nunca abaixo) | **(a) completo:** `pisoServico` na política: `CUSTO_INFORMADO` (custo de mão de obra/insumo informado por serviço no catálogo, com evidência) quando existir, senão `CATALOGO_MINIMO` (preço mínimo publicado por serviço), senão o serviço **não recebe desconto além do proporcional** · (b) serviço sempre `CATALOGO_MINIMO` · (c) serviço nunca recebe o desconto da alocação por carga (só produtos) | **(a).** Fecha a lacuna por inteiro: no salão o item de maior carga costuma ser o **serviço** (Anexo III/V com ISS × revenda monofásica), e sem piso de serviço a regra do dono não alcança o caso principal; (b) usa um número sem lastro de custo; (c) tira a economia do caso típico. P-EF-1 decide a evidência de custo que o contador quer para serviço | médio em (c): regra do dono sem efeito no 1º cliente |
| **F-EF-2** O que o dono **não** fixou na alocação | **(a)** `criterioAlocacao` por tenant com padrão `CARGA_TRIBUTARIA`; `PROPORCIONAL_CATALOGO` escolhível; mudança de critério gera sugestão a aceitar (trilha) · (b) `CARGA_TRIBUTARIA` fixo, proporcional só como fallback automático (ordem indeterminada) · (c) critério escolhido venda a venda no modal Nova Venda, sem política | **(a).** É o que o dono disse ("o rateio proporcional fica como alternativa configurável") com trilha de quem mudou; (b) tira a alternativa; (c) deixa a regra inconsistente entre vendas — e a **consistência é a defesa** contra o arbitramento (A1). Empate de carga entre itens: ordem pelo maior preço de catálogo (determinístico) | baixo |
| **F-EF-3** Quem aceita a sugestão | **(a)** aprovador configurável na política: `CONTADOR_RESPONSAVEL` quando há atribuição ACTIVE (GOV-CONTADOR), senão `ADMIN`; proponente ≠ decisor quando o proponente é humano · (b) só ADMIN · (c) qualquer gestor da unidade | **(a).** Reusa o `AccountingPolicy` do GOV-CONTADOR (F-GOV-3 a: com contador ACTIVE, só ele) e o maker-checker já aceito; sugestões com efeito no documento fiscal são do contador quando ele existe | baixo |
| **F-EF-4** Kit sem NCM própria (SC Cosit 98048/2026: kit sortido classificado pelas RGI 3(b)) | **(a)** o sistema **não cria** NCM de kit: o kit é sempre explodido em itens (L5), cada um com a NCM do produto; alerta `KIT_SEM_NCM_PROPRIA` quando o tenant cadastrar um "produto kit" sem itens · (b) permitir `ProductFiscalProfile` do kit com NCM própria informada pelo contador, tratando o kit como um bem · (c) ambos, com a classificação do contador por kit | **(c)**, com (a) como padrão: a SC Cosit admite o kit como bem único quando a RGI 3(b) manda; **a decisão por kit é do contador** (A2/P-EF-3), registrada como sugestão `PRINCIPAL_ACESSORIO`/kit. (a) sozinho perde o caso lícito de kit-bem; (b) sozinho deixa o rateio sem controle | médio |
| **F-EF-5** Fonte da NCM e da ST | **(a)** depender do `ProductFiscalProfile` do BRIEF da NFC-e (X10a, F-NFCE-3 b) e abrir `ICMS_ST_NCM_UF` em LEGAL-PARAMS com linhas `DRAFT` · (b) criar `ncm` direto no preset de produtos (DynamicTable) · (c) esperar o nó F4 `TABELA-TRIBUTARIA-PRODUTO` | **(a).** A NCM é invariante legal (Prisma, §2.1) e o X10a já pediu o model; (b) viola a fronteira; (c) atrasa PR-2 até uma onda sem data | baixo |
| **F-EF-6** Fatiamento | **(a)** 4 PRs (§6) · (b) 2 PRs (PR-1+2 venda/segregação; PR-3+4 simulação/alertas/relatório) | **(a).** PR-1 é o único com guarda de emissão e migração de preset — isola o risco; PR-2 depende do `ProductFiscalProfile` e pode esperar | baixo |
| **F-EF-7** Simulador de regime: Lucro Real | **(a)** Simples × Presumido × Real **completo**, com PIS/COFINS não cumulativo e créditos pelo X8, IRPJ/CSLL pela apuração do X7 · (b) só Simples × Presumido (Real = "consulte o contador") · (c) Simples × Presumido agora, Real quando o H1 estiver assinado | **(a).** O dono fixou Lucro Real como regime-alvo (memória) e o X7/X8 já calculam; (b) deixa o alvo fora; (c) é (a) com data humana — aceitável se o dono quiser reduzir o PR-3 | médio em (b) |
| **F-EF-8** Estética × Anexo III / saúde 60 % (2027) | **(a)** simulador 2027 trata serviço estético como **sem redução** (fora do Anexo III da LC 214) e procedimento por médico/dentista como 60 % **só** com `cTribNac` de saúde e profissional habilitado informado, com aviso "enquadramento não confirmado" · (b) perguntar ao contador antes de simular 2027 | **(a)**, com P-EF-4 em paralelo. Conservador por construção; o aviso impede decisão sobre número não confirmado | baixo |
| **F-EF-9** Desconto condicional | **(a)** `discountKind` obrigatório na venda com desconto (default `UNCONDITIONAL` só para linhas antigas, no relatório); `CONDITIONAL` nunca abate a receita bruta nem entra na nota como redutor · (b) só `UNCONDITIONAL`, condicional fica fora do sistema | **(a).** O erro clássico (condicional lançado como incondicional) é a guarda I-4; sem o campo o sistema não consegue bloquear | baixo |

## 9. Pendente de validação externa — item 1b do D1 (perguntas exatas ao contador)

| # | Pergunta (texto para enviar) | Ambiguidade | Decide |
|---|---|---|---|
| P-EF-1 | "Numa venda de combo (serviço + produto de revenda), vocês aceitam o desconto do combo **alocado ao item mais tributado até o preço de custo** (custo médio do estoque), com **teto no preço de catálogo** para os demais itens e tudo **destacado na nota** como desconto incondicional? Que **evidência de custo** querem que a gente guarde (custo médio na data da venda, NF de compra, ficha de custo do serviço)? Para **serviço**, que piso vocês defendem: custo de mão de obra informado ou preço mínimo publicado?" | A1 (reescrita 20/10) | F-EF-1, I-3 |
| P-EF-2 | "Para o Simples Nacional, confirmam que a receita bruta de cada item para a segregação (monofásico × serviço) é o preço **líquido do desconto incondicional alocado a esse item**, e que a alocação por carga tributária (até o custo) e a proporcional ao catálogo são ambas critérios aceitáveis no PGDAS-D?" | A1 / L8 | item 9 |
| P-EF-3 | "Produto **aplicado** durante o serviço (ex.: ampola usada no tratamento) é acessório do serviço (LC 214 art. 7º II e § 2º, tratamento do serviço) e produto **entregue** ao cliente para levar é fornecimento próprio (revenda, NCM própria)? Para kit vendido fechado (ex.: 'kit home care'), vocês classificam como um bem (NCM do kit, RGI 3 b — SC Cosit 98048/2026) ou explodem por item? Em qual caso?" | A2 | F-EF-4 |
| P-EF-4 | "Procedimento estético feito por médico na clínica: vocês enquadram como serviço de saúde do Anexo III da LC 214 (redução de 60 % em 2027) ou fora? E no fator r / Anexo III do Simples hoje, a clínica estética vai pelo CNAE de medicina ou pelo de estética (caso do salão)?" | L16 / pesquisa §3.2 | F-EF-8, item 16 |
| P-EF-5 | "Para cruzar o fator r (28 %), vocês consideram seguro elevar o **pró-labore** dentro do mês, desde que efetivamente pago com INSS recolhido? Existe piso/teto que vocês recomendam para não caracterizar remuneração 'de papel' (SC Cosit 228/2023)?" | A3 | item 15/17 (texto do aviso I-5) |
| P-EF-6 | "A ST de ICMS para cosméticos/perfumaria na UF do tenant: qual protocolo/convênio e quais NCM vocês usam hoje para segregar no PGDAS-D? Têm a tabela que usam?" | L9 (ST) | item 11 (`ICMS_ST_NCM_UF`) |

## 10. Insumos ausentes (regra 2)

1. **Posição oficial sobre alocação de desconto em kit** (SC Cosit / CARF): não encontrada — P-EF-1 é o substituto.
2. **`ProductFiscalProfile`** (NCM) ainda não está em `main` — PR-2 depende do PR-0/PR-1 da NFC-e (X10a, F-NFCE-3 b) ou
   do nó F4; F-EF-5.
3. **Tabela de ICMS-ST por NCM × UF** (CONFAZ/UF) não lida — linhas `DRAFT` até fonte oficial (P-EF-6).
4. **Decreto 12.955/2026** (regulamento da LC 214, arts. 12 § 4º e 13) não lido — pode mudar a forma do "valor de
   mercado" no arbitramento (L6); conferir antes do `executa` do PR-1.
5. **Custo do serviço** (para o piso): não existe no sistema; F-EF-1 decide o piso de serviço (custo informado, preço
   mínimo publicado, ou sem desconto além do proporcional).
6. **Folha real** (para o fator r): `SimplesHistoricoMensal.folhaCents` é informado; o PRE-ADR de pessoal (PES-1) é
   quem traria a folha calculada — até lá a simulação usa o informado + a folha-alvo.
7. **Tabela tributária por item antes do nó F4 `TABELA-TRIBUTARIA-PRODUTO`:** a ordem de carga (D5) usa o que existe
   (`ServiceFiscalProfile.cTribNac`, `ProductFiscalProfile.ncm` quando chegar, `PIS_COFINS_MONOFASICO_NCM`, anexo do X14);
   sem isso a alocação cai no proporcional com aviso.

## 11. Achados fora de escopo (regra 5)

1. **Exclusão do ICMS da base de PIS/COFINS (Tema 69)** — `pisCofinsCalc.ts` grep 0; é emenda do X8, com vigência só
   até 12/2026. Não planejada aqui.
2. **`PackageCatalogModule` como combo itemizado** (lista de itens/entitlements) — o arco H do próprio comentário do
   preset; este nó só adiciona `kitRef`/`principalItem` nos itens da venda, não muda o pacote.
3. **Custo de serviço** (mão de obra por serviço) — nó de pessoal/custos, não aqui.
4. **Pesquisa de código-fonte (regra do dono: Odoo/ERPNext antes de fork de arquitetura).** Ver §11.1 — preenchido com
   o que foi lido em 20/10.

### 11.1 O que Odoo e ERPNext fazem (lido em 20/10; "NÃO LIDO" onde não foi aberto)

Lido no código-fonte (raw GitHub, `version-15` e `17.0`) por agente de pesquisa em 20/10; grau V para o que está citado
por arquivo/função, NÃO LIDO onde indicado.

| Ponto | ERPNext v15 | Odoo 17 |
|---|---|---|
| Kit/combo | **Uma linha** de venda/fatura = o bundle; componentes vão na child table `packed_items` (`stock/doctype/packed_item/packed_item.py::make_packing_list`); `PackedItem` só tem `rate`/`incoming_rate`, sem `amount` nem `item_tax_template` ⇒ **imposto por linha do kit, nunca por componente**; `update_packed_item_price_data()` preenche `rate` do filho pela price list/valuation (informativo); o inverso (`editable_bundle_item_rates`: soma dos filhos ⇒ preço do pai) é opcional. **Nenhum rateio do preço do kit para os filhos** | Kit = BoM `phantom` (`mrp/models/mrp_bom.py`); a `sale.order.line` continua o kit e `_prepare_invoice_line()` copia `price_unit/discount/tax_ids` do kit ⇒ **uma linha de fatura com os impostos do kit**; `sale_mrp/models/account_move.py::_stock_account_get_anglo_saxon_price_unit` rateia só o **custo** (CPV) pelos componentes, nunca o preço |
| Desconto global | `taxes_and_totals.py::apply_discount_amount()` **rateia proporcional ao `net_amount`** de cada item (`distributed_discount_amount`), base `Net Total` ou `Grand Total − impostos "Actual"`; arredondamento corrigido **na linha corrente** quando `expected_net_total − net_total ≠ 0`; `is_cash_or_non_trade_discount` + Grand Total ⇒ não rateia | Wizard `sale/wizard/sale_order_discount.py`: `sol_discount` escreve `%` em todas as linhas; `so_discount` cria **linha negativa por grupo de impostos** com o produto de desconto; `amount` cria linha negativa fixa sem imposto. **Não há rateio proporcional por linha** nem resto de arredondamento |
| Desconto por linha | `discount_percentage` ⇒ `rate = price_list_rate × (1 − %)` arredondado em `precision("rate")`, `discount_amount` derivado; `validate_max_discount()` contra `Item.max_discount` | `discount` (%) por linha; `price_subtotal = currency.round(price_unit_after_discount × qty)`; impostos `round_per_line` ou global |
| Piso de preço | `selling_controller.py::validate_selling_price` (Selling Settings `validate_selling_price`): **bloqueia** `base_net_rate < last_purchase_rate` e, para item de estoque, `< valuation_rate` (SO/Quotation) ou `< incoming_rate` (DN/SI) — compara o **net rate já com desconto rateado**; sem piso de margem %; `set_gross_profit()` só informa | `sale_margin`: `margin = price_subtotal − purchase_price × qty`, **informativo, nenhum bloqueio**; `product_pricelist_item.py::_compute_price` tem `price_min_margin/price_max_margin` **relativos ao preço-base da regra**, só na formação do preço da pricelist |
| Simulação/otimização tributária | inexistente nos arquivos lidos (`regional/` NÃO LIDO) | inexistente; `l10n_br*` só documento/sequência (`l10n_br_avatax` NÃO LIDO) |

**O que isto decide aqui.** (i) Os dois ERPs tratam kit como **uma linha com o imposto do kit** — exatamente o que a
LC 214 art. 7º proíbe quando os tratamentos diferem (L5); logo não há molde a copiar para o combo: **D4.1 (itens
explodidos com preço de catálogo por item) é exigência da lei brasileira, não escolha de design**, e F-EF-4 (a) é o
padrão. (ii) O rateio proporcional com correção de arredondamento é o que o ERPNext faz (base `net_amount`; aqui base =
preço de catálogo) — é a **alternativa** configurável do D5; a alocação por carga tributária até o custo (regra do dono)
**não existe em nenhum dos dois** — é desenho próprio, e por isso a função é pura, determinística e com memória. O Odoo
mostra "linha negativa por grupo de imposto", que **não serve** porque a LC 123 art. 3º § 1º e a LC 214 art. 12 exigem o
desconto **no item/documento**, não como item de preço negativo. (iii) O piso bloqueante por custo (última compra ou
valuation) **existe e é opcional** no ERPNext e é só informativo no Odoo — aqui é obrigatório (D6) porque não é controle
gerencial, é defesa contra arbitramento (L1/L6/L17); a comparação com o **net rate após rateio** (ERPNext
`validate_selling_price`) é a mesma do I-3. (iv) Nenhum dos dois tem sugestão/otimização fiscal — não há canônico
externo; o desenho D1/D3 é próprio e por isso **pequeno** (uma tabela de sugestão + funções puras), nunca engine.
Nada é copiado; serve como régua de completude e de "o que o mercado já aceita".

## 12. Riscos e vieses (T8)

- **Risco — "piso" vira "preço mínimo do fisco".** Não existe tabela oficial de preço de mercado para serviço de
  salão; o piso é defesa do tenant (custo + margem), não norma. Declarado no texto da violação ("critério interno de
  defesa", citando L1/L6).
- **Risco — segregação errada por NCM.** NCM errada no cadastro ⇒ monofásico indevido ⇒ exclusão do Simples (LC 123
  art. 29 V, § 9º). Invariante 4 + alerta `SEGREGACAO_INDEVIDA` + a `SimplesSegregacaoManual` prevalecendo.
- **Risco — simulador induz folha de papel.** Aviso I-5 em toda simulação de fator r ("economia só vale com folha
  efetivamente paga e recolhida"), e o simulador nunca grava folha.
- **Viés 1 (completude × 1º cliente):** o salão Simples do 1º cliente ganha com PR-1 (combo) e PR-2 (monofásico de
  cosméticos) — ambos morrem/mudam em 2027 (L10, alíquota uniforme do IBS/CBS). Declarado: o valor de PR-2 é 2026;
  o de PR-1 cresce em 2027 (L5 exige preço por item).
- **Viés 2 (reuso do maker-checker):** o `EntryApprovalService` aprova lançamentos; aqui a sugestão aprova um
  **rateio/decisão** — reuso é do ciclo e da policy, não do model.
- **Caso adversarial tentado contra a regra do dono (D5):** combo serviço R$ 100 (Anexo III, carga ~6 % + ISS) +
  cosmético R$ 100 (revenda monofásica, custo médio R$ 60) vendido por R$ 160 (desconto R$ 40). Ordem de carga: o
  serviço tem carga maior ⇒ recebe o desconto primeiro, até o seu piso. **Se o serviço não tem piso** (sem custo de
  serviço — insumo ausente 5), a regra do dono não alcança o caso típico do salão: ou o serviço fica sem piso e pode ir
  a R$ 0 (abaixo de qualquer custo — ilícito pelo próprio dono), ou cai no proporcional. É por isso que F-EF-1 existe
  e é o fork que mais importa. Com piso de serviço R$ 70: serviço R$ 70 + cosmético R$ 90; DAS sobre R$ 70 de serviço e
  R$ 90 de revenda sem PIS/COFINS. Caso-limite: desconto R$ 90 ⇒ serviço R$ 70 (piso), cosmético R$ 80, ok; desconto
  R$ 150 > Σ(catálogo − custo) = R$ 70 ⇒ `COMBO_ABAIXO_DO_CUSTO`, bloqueio (I-3). O que me derrubaria: o contador
  dizer que preço de custo em venda sistemática é "notoriamente inferior ao valor de mercado" mesmo com tabela
  publicada (leitura 2 da A1) — aí D5 volta ao proporcional como padrão e a carga vira só sugestão. Sem fonte, a
  regra do dono fica com as guardas e a pergunta P-EF-1 na frente do `executa`.
- **Caso adversarial contra "bloquear só na emissão":** venda `Finalized` sem documento fiscal (cliente sem nota)
  nunca passa pela guarda — o DAS sai pela subrazão com o preço praticado, que é o correto; a guarda existe para o
  **documento**, que é onde L4 morde. A venda interna com item abaixo do piso recebe `WARN`, não `BLOCK` (D4.2).

## 13. Invariantes que a implementação DEVE provar

1. **I-1 (fronteira):** não existe caminho de API que grave em `saleItems.unitPrice` valor ≠ `catalogUnitPrice` **sem**
   `discountCents ≥ 0` correspondente destacado — nenhum item sobe acima do catálogo (`ITEM_ACIMA_DO_CATALOGO`) e
   nenhum desce abaixo do custo; teste de mutação: tentar "transferir" R$ 10 do item A para o B mantendo o total ⇒
   `ITEM_ACIMA_DO_CATALOGO` em B e `PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO` em A.
2. **I-2:** toda venda com ≥ 2 itens de naturezas diferentes emite documento **itemizado** (um valor por item) — nunca
   uma linha "combo" (L5).
3. **I-3:** item com `unitPrice − discount < piso` ⇒ `ITEM_ABAIXO_DO_PISO` `BLOCK` na emissão; desconto do combo >
   `Σ (catálogo − piso)` ⇒ `COMBO_ABAIXO_DO_CUSTO` `BLOCK`; item sem piso determinável ⇒ não recebe desconto além do
   proporcional e `WARN` `SEM_CUSTO`.
4. **I-4:** `discountKind = CONDITIONAL` ⇒ `ReceitaFiscalLinha.receitaCents` bruto e sem redutor no documento;
   `UNCONDITIONAL` ⇒ líquido e `Σ discountCents = discountAmount` (±1 centavo, resto no último item que recebeu).
4b. **I-4b (determinismo da alocação):** `alocarDescontoFiscal` com os mesmos itens, carga, pisos e critério devolve a
   mesma alocação (propriedade testada); `CARGA_TRIBUTARIA` percorre em ordem decrescente de `cargaBp` (empate: maior
   catálogo) e cada item recebe `min(restante, catálogo − piso)`; `custoSnapshotCents` do item é o custo médio **na data
   da venda**, nunca recalculado depois.
5. **I-5:** toda resposta de simulação de fator r carrega o aviso de folha real; `folhaAlvoCents` nunca é persistido
   como histórico.
6. **I-6:** sugestão `ACCEPTED` fora do padrão (rateio ≠ proporcional) exige `decisionReason` e decisor permitido pela
   política (F-EF-3); `SYSTEM` nunca aceita.
7. **I-7:** kit com `principalItem` marcado em 2027+ ⇒ itens acessórios herdam o tratamento do principal **só** se a
   sugestão `PRINCIPAL_ACESSORIO` do kit estiver `ACCEPTED`; senão cada item vai pela própria NCM/`cTribNac`.
8. `ReceitaFiscalLinha.excluir` derivado da NCM = `segregacaoPorNcm(...)` (função pura) e, havendo
   `SimplesSegregacaoManual` na competência, a apuração usa a manual com alerta `SEGREGACAO_DIVERGE`.
9. Monofásico com data ≥ 2027-01-01 ⇒ `excluir = []` para PIS/COFINS (L10 revogada; tabela com `vigenteAte`).
10. `parametrosSha256` em toda sugestão e simulação; linha de lei publicada depois ⇒ aviso, nunca recálculo silencioso.
11. Relatório de economia soma **só** `ACCEPTED`; `PROPOSED`/`REJECTED` aparecem em contagem, nunca em cents.
12. Nenhum import de serviço Prisma em `rules/plugins/**` (`check:arch` + teste de fronteira já existente).
13. Auditoria `tax.suggestion.*` sem nome/CPF de sócio ou profissional.

## 14. Sinal humano — estado do gate

- **F-EF-1..9:** PENDENTES. **P-EF-1..6:** externos (contador). BRIEF depois da ratificação; código só com `executa`
  por PR. **O PR-1 não deve receber `executa` antes da resposta de P-EF-1** (piso e rateio são o núcleo dele).
- A nota `docs/plano/nos/EFICIENCIA-FISCAL.md` aponta para cá.

## 15. Fontes (hash no dossiê)

| Documento | Origem | Observação |
|---|---|---|
| CTN (Lei 5.172) arts. 116 p.ú., 148, 149 VII | acervo [D01], compilada, cópia 13/10 | — |
| Lei 8.137 art. 1º | acervo [D02], compilada | — |
| LC 123 arts. 3º, 18 | acervo [D04], compilada (red. LC 214, efeitos 01/01/2025) | § 4º-A "Vide LC 214" |
| Lei 10.147 | acervo [D05], compilada | revogada em 01/01/2027 (LC 214 art. 542 XI) |
| LC 214 arts. 5º, 7º, 12, 13, 127–136, 341-F, 542 | Planalto [D08], compilada com LC 227/2026 | acervo [D03] = republicação (alerta resolvido) |
| Lei 12.592 art. 1º-A (red. Lei 13.352) | acervo [D23] compilada; Planalto [D07] | acervo [D06] da 13.352 era original (alerta resolvido) |
| LC 87 arts. 13, 15 | acervo [D31], compilada, cópia 13/10 (lido 20/10 12:49) | base do ICMS = valor da operação (esclarecimento do dono) |
| SC Cosit 98048/2026, 137/2024, 111/2015, 127/2019, 17/2021, 81/2025, 228/2023; Res. CGSN 140 arts. 25–26 | Sijut (pesquisa §3) | V (texto); aplicação a kit de cosméticos = I |
| Decreto 12.955/2026; CONFAZ ST por NCM | **não lidos** | §10 |
| Odoo / ERPNext | GitHub (20/10) | §11.1 |
