# BE-INCR-EFICIENCIA-FISCAL — BRIEF (nó EFICIENCIA-FISCAL, régua F seção F1.5)

> **Sessão:** `sessao-planejamento` (agente). A saída é este documento mais o fold da nota do nó. **Sem código, sem `executa`, sem merge.**
> **Base:** `origin/main` `65e1dd6b` (22/10). A cédula `D-2026-10-21-FORKS-EFICIENCIA-FISCAL`, a triagem
> `D-2026-10-21-TRIAGEM-CONTADOR-F1` e o PRE-ADR `ADR-INCR-EFICIENCIA-FISCAL` (D1–D11, §6, §7, §13) já estão em `main`.

> **RATIFICAÇÃO 22/10/2026** ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]; dono, chat, 2026-10-22: "Dispara 1 pra ratificar os forks", respostas no
> AskUserQuestion): **F-EF-14..17 todos (a)**, a recomendação do BRIEF. F-EF-16 (a) reabre o F-DFE-15 (a) com o destaque do
> desconto na NFS-e. **Não é `executa`.**

## Emenda 28/10 — fila de pesquisa de 27/10 (bloco 3; dossiê `pesquisas-legais/fila-2026-10-27-bloco3-eficiencia`)

> **Pedido do dono** (chat, 2026-10-28): *"Faz o fold dos achados da fila de pesquisa de 27/10 (blocos 1 a 6) no vault e
> nos BRIEFs, junto com os 7 dossiês, num PR sem merge."* Escopo: este BRIEF e a nota do nó. **Só fato de fonte oficial:
> nenhum fork é ratificado, e não é `executa`.** Resumo da fila: [[PESQUISA-FILA-2026-10-27]].

1. **P-EF-6: em SP, perfumaria e cosméticos (NCM 3303, 3304 e 3305) estão fora da ICMS-ST desde 01/04/2026.** A Portaria
   SRE 94/2025 revogou o Anexo XI da Portaria CAT 68/2019, a lista paulista do art. 313-E do RICMS/SP, com vigência em
   01/04/2026 (arts. 1º e 4º [D14]); a Resposta à Consulta 33677/2026 confirma para o NCM 3304.99.10 que as operações
   internas "não estão mais submetidas" à ST [D12]. O Conv. ICMS 142/2018, Anexo XIX, só lista os itens que **podem** entrar
   em ST (3303.00.10 a 3305.90.00, CEST 20.007.00 a 20.022.00) [D11]; cada UF adota ou não. **Efeito:** a tabela
   `ICMS_ST_NCM_UF` (item 11) fica sem linha de SP a partir de 2026-04-01; em SP o PR-2 segrega só o PIS/Cofins monofásico,
   e segregar ICMS-ST de cosmético depois de 01/04/2026 é o caso do alerta `SEGREGACAO_INDEVIDA` (item 14). Outras UFs
   entram quando houver cliente nelas (RICMS de cada uma não lido).
2. **P-EF-8: SUP de SP em 2026.** O regime especial vale para os subitens 4.01, 4.02, 4.06, 4.08, 4.11–4.14, 4.16, 5.01,
   7.01, 17.13, 17.15 e 17.18, mais economistas (Lei SP 13.701 art. 15, redação da Lei 17.719/2021 [D05]): **salão (6.01,
   6.02) fica fora; a clínica pode entrar.** Tabela oficial da Fazenda de SP para 2026 [D10], base mensal por profissional:
   até 5, R$ 2.413,62 (ISS trimestral de R$ 144,81 a 2%, art. 16 I "a", ou R$ 362,04 a 5%); 6 a 10, R$ 6.048,39; 11 a 20,
   R$ 12.096,79; 21 a 30, R$ 24.193,60; 31 a 50, R$ 36.290,39; 51 a 100, R$ 48.387,19; 101 ou mais, R$ 72.580,80.
   Vencimento trimestral: 10/04, 10/07, 10/10 e 10/01 [D08]. O "amparo judicial para limitada" do contador tem base no
   texto (§ 2º VII exclui a sociedade empresária; § 14 exige "a responsabilidade ilimitada do profissional sócio").
   **Efeito:** a linha SP da `ISS_FIXO_SUP` (item 28) pode sair de `DRAFT` com esses valores. Os códigos "uso restrito"
   04112 (Medicina) e 03380 (Advocacia), com valor único de R$ 2.656,48, não têm origem explicada: só entram com documento
   (item 29).
3. **P-EF-11: esteticista é profissão regulamentada.** A Lei 13.643/2018 "Regulamenta as profissões de Esteticista"
   [D06]; o art. 40 da Lei 9.250 (16%) "não se aplica [...] às sociedades prestadoras de serviços de profissões legalmente
   regulamentadas" [D03, p.ú.], repetido no RIR/2018 art. 592 § 4º [D16]. Salão de estética fica fora dos 16%. Cabeleireiro,
   manicure, depilador e maquiador têm o exercício "reconhecido" pela Lei 12.592/2012 [D02], sem o verbo "regulamenta":
   leitura segura de 32%, com diferença máxima de R$ 2.880 de IRPJ por ano (16 p.p. × R$ 120 mil × 15%). Pergunta ao
   contador só se houver cliente real no Presumido com receita de até R$ 120 mil. **Efeito:** o texto de ajuda do item 30
   (`PROFISSAO_REGULAMENTADA_TIRA_16`) cita a Lei 13.643 art. 1º como lida.
4. **P-EF-12: o "valor de mercado" está nos arts. 14 e 16 do Regulamento da CBS** (Decreto 12.955/2026 [D07]; o BRIEF citava
   arts. 12 e 13). Valor de mercado é "o valor praticado em operações comparáveis entre partes não relacionadas" (art. 14),
   pelas operações dos últimos 3 meses do contribuinte ou de terceiros (§ 1º), com a ordem de reserva do § 3º. O
   arbitramento cabe quando o documento declara "valor notoriamente inferior ao valor de mercado" (art. 16 I "b"); o
   desconto incondicional que consta do documento sai da base (art. 13 § 2º III e § 3º). **Efeito:** o comparável do item
   num combo é a venda avulsa do mesmo item nos 3 meses anteriores; `PROPORCIONAL_CATALOGO` segue de pé; o CARGA continua
   só com aceite do contador (F-EF-3), e a evidência que a P-EF-1 (resto) pede é essa venda avulsa.
5. **Lacunas:** RICMS das outras 26 UFs; Regulamento do IBS (Resolução CGIBS 6/2026); o ato conjunto do art. 14 § 7º; a
   origem dos códigos "uso restrito" da SUP; a RDC Anvisa 50 continua não lida.

## TLDR (2 linhas)

O nó entra em cinco PRs. Os PRs 1 e 4 já podem receber `executa`:
- **PR-1:** combo itemizado, com o desconto por item **proporcional ao catálogo** (padrão de 21/10), piso de custo, guarda na emissão da NFS-e e trilha de sugestão;
- **PR-2:** segregação por NCM, **bloqueada** até o `ProductFiscalProfile` (X10a) chegar a `main`;
- **PR-3:** simuladores de fator r, regime e remuneração do sócio;
- **PR-4:** alertas e relatório de economia;
- **PR-5:** serviços — 8 %/12 % hospitalar, ISS fixo de sociedade uniprofissional (SUP), enquadramento, pacote e parceria.

**Risco principal:** em 21/10 o contador e o dono derrubaram a alocação por carga como padrão; ela agora só vale com aceite do contador. Abriram-se **4 forks novos** (F-EF-14..17, §5). O mais caro é o **F-EF-14**: no proporcional, um item que fica abaixo do custo em promoção real bloquearia a emissão de uma nota que a lei obriga a emitir.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `EFICIENCIA-FISCAL`, em `docs/plano/nos/EFICIENCIA-FISCAL.md` (régua F, seção F1.5; sem âncora no SDD).
- **Autorização:** dono, chat, 2026-10-22, repassada pela sessão de origem: *"Precisamos agora de sessões para a falta de brief"*.
  O pedido atribui a esta sessão o BRIEF do nó, só em docs, **sem código, sem `executa`, sem merge**.
  - **Passo 1 (cobertura):** a autorização cobre exatamente o BRIEF deste nó. Há uma divergência registrada: o campo
    `autorizacao` da nota cita só o PRE-ADR de 20/10 e diz "BRIEF e código exigem pedido próprio". **Este é o pedido
    próprio.** O fold (§9) acrescenta a citação de 22/10 ao `estado_detalhe` e não troca o campo `autorizacao`, que segue
    sem autorizar código.
- **Insumos (fato consumado):**
  - `docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md` (PRE-ADR, §3 L1–L26, D1–D11, §6 com 33 comportamentos, §7, §13 com I-1..19);
  - `docs/plano/decisoes/D-2026-10-21-FORKS-EFICIENCIA-FISCAL.md` (F-EF-1..13 ratificados);
  - `docs/plano/decisoes/D-2026-10-21-TRIAGEM-CONTADOR-F1.md`, com as respostas P-EF-1..10 e a **emenda do padrão do combo**;
  - `docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-21-PACOTE-F1.md`;
  - as pesquisas `PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md` e `PESQUISA-EFICIENCIA-FISCAL-SERVICOS-2026-10-20.md`;
  - a memória do projeto "realocar preço em combo": preço fictício é simulação; preço de custo no item de maior carga é lícito com guardas;
  - o código lido em `origin/main` (§0.1).
- **Nós vizinhos:**
  - consome X14 (`simplesCalc`, `ReceitaFiscalLinha`, `SalaoParceriaContrato`), X7 (`TaxAssessment`, `taxAssessmentCalc`), X13
    (`CompanyFiscalProfile`), LEGAL-PARAMS, DFE (montagem da DPS), INVENTORY (`InventoryItem`), GOV-CONTADOR
    (`AccountantAssignment`, `canDecidePolicyVersion`) e IRRF-DISTRIBUICAO (`Partner` em `main`; o cálculo de dividendos/JCP ainda não);
  - depende de X10a (`ProductFiscalProfile`, **ausente**) e IBS-CBS-2027 (tabela de 2027);
  - é consumido por `FE-INCR-EFICIENCIA-FISCAL` (sem nota) e pelo pacote do contador (C6b).

**Verificação legal** (dossiê `pesquisas-legais/brief-eficiencia-fiscal/relatorio.md`, 22/10):
- D01–D08 são do acervo ctresb/leis, compilados (cópia de 13/10), **sem alerta**;
- a LC 214 [D09] foi baixada compilada do Planalto, porque o acervo tem só a republicação;
- trechos conferidos: CTN 148; Lei 8.137 art. 1º II; LC 123 arts. 3º § 1º, 18 § 4º-A, §§ 5º-J/5º-K; LC 87 art. 13 I; Lei 9.249 art. 15
  § 1º III "a" e § 2º; Lei 9.250 art. 40 p.ú.; Lei 12.592 art. 1º-A § 5º; DL 406 art. 9º § 3º; LC 214 arts. 7º, 12 § 3º, 13 I "b";
- nada contradiz o PRE-ADR. Não lidos (ficam DRAFT): Decreto 12.955/2026, Conv. ICMS 142/2018, RDC Anvisa 50, Lei SP 13.701
  art. 15 (valores de 2026), Lei 13.643/2018.

**Fronteira (STOP do CLAUDE.md):**
- **dado de venda** (`saleItems`, `sales`): continua **DynamicTable**, com campos novos de preset e guarda aritmética no `SalesPlugin`, sem nenhum serviço Prisma injetado;
- **sugestão, política, guarda fiscal e simuladores:** **Prisma first-class**, com `SaleFiscalGuardService` em `features/sales` no molde do `RegisterPaymentService`;
- **integração:** fica no seam Prisma-side (emissão do `FiscalDocument`, mapper pós-commit) e nunca em `DynamicTableService`, `RuleContext` ou `RulePlugin` (ADR D4; BRIEF #773).

### 0.1 Código atual que o BRIEF respeita (CBM-001: lido nos arquivos)

| Ponto | Fato | Onde |
|---|---|---|
| Venda | `discountAmount` **por venda**; `aboveCatalogPrice` boolean (pacote acima do catálogo, gravado pelo wizard) | `presets/modules/finance/SalesModule.ts:50,90` |
| Item | `saleId, itemType, productId?, serviceId?, packageId?, description, quantity, unitPrice, …, commission`. **Sem** preço de catálogo, desconto por item ou custo | `SalesItemsMixed.ts:14-27` (e `…ProductsOnly`, `…ServicesOnly`) |
| Guarda no finalize | `discount > subtotal ⇒ ValidationError` e nada mais | `rules/plugins/SalesPlugin.ts:140-152` |
| Rateio no razão | `splitRevenueCredit(totalCents, revenueByNature)`: **proporcional aos subtotais brutos por natureza** (3.1 × 3.3), com o resíduo no produto | `sync/mappers/revenueSplit.ts` |
| Rateio na subrazão do Simples | `ratearReceita(amount, lines)` proporcional a `lineReais = quantity × unitPrice`; grava `excluir: []` | `services/ReceitaFiscalService.ts:45,130`; `sync/bridges/saleItems.ts:205` |
| NFS-e | `assemble()` acumula pendências (`faltantes`) e lança `emissao_bloqueada` (400); `vServ` de cada DPS = parcela do crédito 3.1 por `splitCents(ledgerCents, pesos brutos)`; **sem `vDescIncond`** (F-DFE-15 a; coluna `vDescIncondCents` reservada = 0) | `services/FiscalDocumentEmissionService.ts:562-706,753-754`; `prisma/schema.prisma:1943`; `dtos/DpsPayloadDto.ts:110` |
| NF-e/NFC-e | `kind = 'NFE'` ⇒ 400 `nfe_nao_implementada`. **Não há documento fiscal de produto em `main`** | `FiscalDocumentEmissionService.ts:579` |
| Pacote na NFS-e | `FiscalProfile.pacoteFatoGerador CONSUMO\|VENDA`, padrão `CONSUMO`, por unidade (F-DFE-9 a) — **já é a política do F-EF-13** | `schema.prisma:1693`; `FiscalProfileDto.ts:101` |
| Perfil de serviço | `ServiceFiscalProfile { cTribNac, cNBS?, cClassTrib?, … }`, **sem** `finalidade` nem `elegivelHospitalar` | `schema.prisma:1850-1870` |
| Perfil de produto | `ProductFiscalProfile` **não existe** em `main` (fica no BRIEF da NFC-e, item 10; X10a `blocked`) | grep 0 em `schema.prisma` |
| Presunção X7 | `AtividadePresuncao = 'SERVICO' \| 'REVENDA'`; `regra16` no `taxAssessmentCalc` | `models/taxAssessmentParams.ts:32`; `models/taxAssessmentCalc.ts:411` |
| Simples | `fatorR`, `apurar`, `SEGREGACAO_EXCLUI`, puros; alertas `severity`/`motivoInformativo` | `models/simplesCalc.ts:110,257,317`; `dtos/SimplesDto.ts:117-126` |
| Monofásico | tabela `PIS_COFINS_MONOFASICO_NCM` + leitor por prefixo de NCM (`pisCofinsMonofasicoNcm.ts`) | `legalParameters/models/legalParameter.ts:14` |
| Custo | `InventoryItem { unitId, productRef, qtyOnHand, totalValueCents }` (média móvel) | `schema.prisma:1418-1434` |
| Contador | `AccountantAssignment.status PENDING\|ACTIVE\|ENDED`; `canDecidePolicyVersion(scope, active)` | `schema.prisma:2659`; `policies/AccountingPolicy.ts:229` |
| Sócios | `Partner { taxId, participacaoBp, entradaEm, saidaEm }` em `main`; o cálculo de dividendos/JCP ainda não | `schema.prisma:1802` |
| Sugestão/simulação | `grep TaxOptimization\|SaleFiscalGuard` em `server/` = 0 | — |

## 1. Decisões ratificadas que este BRIEF aplica

| Fork / decisão | Ratificado | Efeito no checklist |
|---|---|---|
| F-EF-1 piso do serviço | (a) custo informado → preço mínimo publicado → só proporcional | itens 4, 5 |
| F-EF-2 critério | (a) por unidade, troca vira sugestão com trilha — **padrão emendado em 21/10** (linha abaixo) | itens 3, 5, 8 |
| **Triagem 21/10 (dono + contador)** | **`PROPORCIONAL_CATALOGO` é o padrão**; `CARGA_TRIBUTARIA` só com aceite do **contador** (F-EF-3) | itens 3, 5, 8; I-6 |
| F-EF-3 aprovador | (a) contador ACTIVE; sem ele, ADMIN; quem propõe não decide | item 7. **Exceção da triagem:** a troca para CARGA exige contador ACTIVE (sem ele, fica indisponível) |
| F-EF-4 kit | (c) explode por padrão; kit-bem só com classificação do contador. P-EF-3 confirmou: produto aplicado = insumo do serviço; produto entregue = revenda | item 10 |
| F-EF-5 NCM/ST | (a) `ProductFiscalProfile` + `ICMS_ST_NCM_UF` DRAFT | PR-2 inteiro (**bloqueado** por X10a) |
| F-EF-6 fatiamento | (a) 5 PRs | §2 |
| F-EF-7 simulador | (a) completo, com o Real | item 16 |
| F-EF-8 estética 2027 | (a) sem redução — P-EF-4 confirmou | item 32 |
| F-EF-9 desconto condicional | (a) `discountKind` obrigatório | itens 1, 2, 9 |
| F-EF-10 / F-EF-11 hospitalar e estético | (a) / (a). P-EF-7: 8 %/12 % só para procedimento com sala cirúrgica/ambulatorial; consulta e toxina/preenchimento simples a 32 % | itens 25–27, 32 |
| F-EF-12 SUP | (a) simular e apurar, habilitada por documento. P-EF-8: em SP a limitada é desenquadrada, e a SUP em limitada exige amparo judicial | itens 28, 29 |
| F-EF-13 NFS-e do pacote | (a) política por unidade. **O campo já existe** (`pacoteFatoGerador`); como aplicar o padrão por regime é o F-EF-17 (§5) | item 31 |
| 16 % (triagem, B) | recorte **por empresa** (ADR L20) mantido; o contador recuou na 2ª resposta | item 30 |

**Consequência da emenda de 21/10 sobre o PRE-ADR:** D5 continua descrevendo a alocação por carga, mas ela deixa de ser o
padrão. O código implementa os dois critérios; o padrão de `TaxOptimizationPolicy.criterioAlocacao` é `PROPORCIONAL_CATALOGO`.
Com o proporcional como padrão, o `executa` do PR-1 **não depende mais** da P-EF-1 — o gate do ADR §14 foi respondido em 21/10.

## 2. Fatiamento (F-EF-6 a): cada PR com `executa` próprio

| PR | Conteúdo | Itens | Pode receber `executa` hoje? | Depende de |
|---|---|---|---|---|
| **PR-1** combo itemizado e guarda | campos de preset, guarda aritmética, alocação pura, piso, política, sugestão, `fiscal-check`, pré-condição da NFS-e, subrazão líquida, kit | 1–10 | **sim, depois de ratificar F-EF-14..16** | — |
| **PR-2** segregação por NCM | `ICMS_ST_NCM_UF` DRAFT, `segregacaoPorNcm`, `excluir` derivado, alerta | 11–14 | **não**: `ProductFiscalProfile` ausente (X10a `blocked`) | X10a PR da NFC-e item 10 |
| **PR-3** simuladores | fator r, regime, remuneração do sócio | 15–18 | sim (item 17 só depois do cálculo do IRRF-DISTRIBUICAO) | PR-1 (model de sugestão) |
| **PR-4** alertas e relatório | parceria, interdependência, sublimite, linhas consumidas, relatório | 19–24 | sim | PR-1 |
| **PR-5** serviços | finalidade/hospitalar, SUP, enquadramento, pacote, NBS 2027, parceria completa | 25–33 | sim, com a lista da Atribuição 4 como dado do contador (P-EF-7 respondida; RDC 50 não lida ⇒ fundamento = texto informado) | PR-1 (model de sugestão); item 32 depende da tabela do IBS-CBS-2027 |

## 3. Checklist numerado (cada item = ≥ 1 teste)

Os caminhos são relativos a `server/`. O padrão de camada é obrigatório em todo model novo (Contrato §2/§3): Route → Controller → Service
→ Repository → Prisma + Policy, Factory, DTO Zod `.strict()`, soft-delete (exceto trilha), rota em 2 toques.

### PR-1: combo itemizado, alocação, piso e guarda

1. **Campos de preset (aditivos, sem migração de dado).** `SalesItemsMixed/ProductsOnly/ServicesOnly` ganham:
   - `catalogUnitPrice` (number, readOnly pela API genérica, gravado pelo wizard como snapshot do catálogo);
   - `discountCents` (inteiro ≥ 0, padrão 0);
   - `custoSnapshotCents` (inteiro, nullable, readOnly; gravado só pelo `SaleFiscalGuardService` via `isSystem` whitelisted, molde do `RegisterPaymentService`);
   - `kitRef` (string, nullable) e `principalItem` (boolean, padrão false).

   `SalesModule` ganha `discountKind` (`select UNCONDITIONAL | CONDITIONAL`, nullable). Linhas antigas: `discountCents = 0` e
   `discountKind = null` ⇒ tratadas como `UNCONDITIONAL` **só** no relatório (I-4), nunca na emissão. Os campos vão para
   `NumberPresets` / `SelectPresets`; a paridade i18n pt/en entra no mesmo PR.

   **Testes:** schema do preset contém os campos; linha antiga lida sem erro.
2. **Guarda aritmética no `SalesPlugin` (finalize).** Reaproveita a leitura de `loadSaleItems` (`SalesPlugin.ts:136`). Quando algum
   item tem `discountCents > 0` ou o cabeçalho tem `discountAmount > 0`, cada regra abaixo dá um 400 nomeado:
   - (i) `discountKind` obrigatório (F-EF-9 a);
   - (ii) `Σ item.discountCents = round(discountAmount × 100)` ± 1 centavo, senão `RATEIO_NAO_FECHA`;
   - (iii) `discountCents ≥ 0` e `discountCents ≤ quantity × catalogUnitPrice × 100`;
   - (iv) com `catalogUnitPrice` presente, `unitPrice = catalogUnitPrice`, senão `PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO`. O desconto vai em `discountCents`, nunca embutido no preço.

   Venda sem `catalogUnitPrice` (legado, API) passa por (ii) e (iii) com `catalogUnitPrice := unitPrice`. **Zero import Prisma**
   em `rules/plugins/**`.

   **Testes:** um por regra; e o teste de mutação do ADR I-1 (transferir R$ 10 de A para B mantendo o total ⇒ 400 em B).
3. **`features/sales/models/discountAllocation.ts`**, função pura `alocarDescontoFiscal(itens, descontoCents, criterio)` (contrato §4.2):
   - `PROPORCIONAL_CATALOGO` (**padrão**): peso = `catalogUnitPriceCents × quantity`, resíduo no último item em ordem estável (`itemRef`);
   - `CARGA_TRIBUTARIA`: ordem decrescente de `cargaBp` (empate: maior catálogo, depois `itemRef`); cada item recebe `min(restante, catálogo − piso)`; sobra > 0 ⇒ `excedenteCents`.

   Item com `pisoCents = null` não recebe mais que a sua cota proporcional (D6, `SEM_CUSTO`).

   **Testes:** os casos do ADR §12 (combo R$ 200 → R$ 160, R$ 110, R$ 50); determinismo (I-4b, propriedade); soma exata.
4. **`features/sales/models/fiscalGuard.ts`**, puras:
   - `pisoPorItem(item, politica, custoServico)`: produto = `custoSnapshotCents`; serviço = F-EF-1 (a), ou seja custo informado com evidência → `CATALOGO_MINIMO` → `null`; pacote fora;
   - `verificarItens(itens, politica, cabecalho)` devolve `Violation[]` com `code`, `severity` e `legalBasis` (contrato §4.2). A severidade de `ITEM_ABAIXO_DO_PISO` e de `COMBO_ABAIXO_DO_CUSTO` **sob o critério proporcional** é o **F-EF-14** (§5); sob CARGA é `BLOCK` (D6, I-3).

   **Testes:** um por código.
5. **Model `TaxOptimizationPolicy`** (contrato §4.1), mais DTO `.strict()`, repo, policy, factory e rotas
   `GET|PUT /api/accounting/tax-optimization/policy`.
   - **Padrão `criterioAlocacao = PROPORCIONAL_CATALOGO`.** O `PUT` que troca para `CARGA_TRIBUTARIA` não grava direto: cria
     sugestão `CRITERIO_CARGA` (item 7) que **só o contador ACTIVE** decide (triagem 21/10; `canDecidePolicyVersion`). Sem
     contador ACTIVE ⇒ 409 `CRITERIO_CARGA_EXIGE_CONTADOR`.
   - `pisoServico` (F-EF-1 a) e o aprovador seguem F-EF-3 (a). A política é versionada (`vigenteDesde/Ate`), molde
     `IssBeneficioMunicipal`. A policy `canManageTaxOptimization` delega a `canManageFiscalProfile` (`AccountingPolicy.ts:158`).
   - **Custo de serviço (F-EF-1 a):** `ServiceCostEvidence { serviceRef, custoCents, vigenteDesde, sourceDocumentId? }` (contrato §4.1),
     com `catalogoMinimoCents` opcional por serviço no mesmo model.

   **Testes:** troca sem contador ⇒ 409; com contador ⇒ sugestão PROPOSED; aceita ⇒ nova versão.
6. **`features/sales/services/SaleFiscalGuardService.ts`** + `POST /api/sales/:id/fiscal-check` (molde `RegisterPaymentService`:
   recebe `IDynamicTableRepository` e os serviços Prisma de política e sugestão).
   - Lê os itens pelo repositório (padrão `loadSaleRevenueLines`), grava `custoSnapshotCents` do produto a partir do
     `InventoryItem` da unidade **na primeira verificação depois do finalize**, nunca recalculado (I-4b); depois aplica `verificarItens` e `alocarDescontoFiscal`.
   - Resposta `FiscalCheckResponse` (contrato §4.2).
   - **Pré-condição da emissão:** `FiscalDocumentEmissionService.assemble()` chama o guard e empurra cada violação `BLOCK` em
     `faltantes` como `fiscal_guard: <code> (<legalBasis>)`, reaproveitando o 400 `emissao_bloqueada` existente (linha 706),
     sem 409 novo, porque o mecanismo de pendência já existe e o FE já o lê.
   - Hoje isso só morde a **NFS-e** (NF-e/NFC-e não existe; o produto do combo fica coberto só pela subrazão até o X10a).

   **Testes:** emissão bloqueada com o código; `WARN` não bloqueia; venda sem documento não passa pelo guard (ADR §12).
7. **Model `TaxOptimizationSuggestion`** (ADR D3; contrato §4.1), mais DTO, repo (seam de tx `runInTransaction`), policy, factory e rotas:
   `GET /api/accounting/tax-optimization/suggestions?status=`, `POST …/suggestions/:id/accept|reject`. Regras:
   - imutável depois de decidida; uma `PROPOSED` viva por assunto;
   - `SYSTEM` nunca decide; proponente humano ≠ decisor;
   - `decisionReason` obrigatório em `REJECTED` e em aceite fora do padrão;
   - CAS do status **dentro da tx** (memória "gate autoritativo dentro da tx");
   - auditoria `tax.suggestion.proposed|accepted|rejected` com ids, prática e cents, **sem PII**, entrando na allowlist do `auditCanonical.ts` no mesmo PR.

   **Testes:** ciclo, 409 no CAS, decisor errado ⇒ 403, auditoria sem nome/CPF.
8. **Sugestão `CRITERIO_CARGA` (prática `COMBO_DESCONTO_ALOCADO`).** O `fiscal-check` de uma venda com desconto calcula as duas
   alocações e, quando a de carga economiza mais que zero, devolve `economiaPotencialCents` e o artigo (L7/L8/L17). A sugestão
   é **por unidade** (troca de critério, item 5), nunca por venda (a consistência é a defesa, ADR F-EF-2). Sem contador ACTIVE,
   a resposta traz o número com o aviso `CRITERIO_CARGA_EXIGE_CONTADOR` e não grava a sugestão.

   **Testes:** venda de combo com e sem contador.
9. **Subrazão e razão líquidos por item.**
   - `ratearReceita` (`ReceitaFiscalService.ts:45`) passa a usar `lineReais − discountCents/100` quando a venda tem `discountKind = UNCONDITIONAL` e itens com `discountCents`.
   - `CONDITIONAL` ⇒ peso bruto e `receitaCents` bruto (I-4; LC 87 art. 13 § 1º II "a"; LC 214 art. 12 § 3º).
   - Se o razão (`splitRevenueCredit`) e a DPS (`splitCents` por grupo) seguem o mesmo peso líquido, ou continuam proporcionais ao bruto, é o **F-EF-15**. Até ele, só a subrazão muda e o tie-out (`ReceitaFiscalService.tieOut`) continua por natureza.

   **Testes:** um por `discountKind`; Σ subrazão = crédito do razão.
10. **Kit (F-EF-4 c).** `kitRef` e `principalItem` (item 1) são dado de venda. No `fiscal-check`, `kitRef` com itens de naturezas
    diferentes e sem `principalItem` ⇒ `WARN KIT_SEM_PRINCIPAL`. Produto **aplicado** no serviço (P-EF-3) é insumo e não vira
    linha de venda (texto de ajuda; nenhuma regra nova). Kit como bem único só por sugestão `PRINCIPAL_ACESSORIO` aceita pelo
    contador (I-7); até lá, cada item segue pela própria natureza.

    **Testes:** kit sem principal ⇒ aviso; kit com sugestão aceita ⇒ tratamento do principal só a partir de 2027 (I-7).

### PR-2: segregação por NCM (bloqueado até o `ProductFiscalProfile` estar em `main`)

11. Tabela `ICMS_ST_NCM_UF` em `legal_parameters`, com linhas `DRAFT`: Conv. ICMS 142/2018 + protocolos, NCM 3303/3304/3305
    (P-EF-6, **não conferido** em fonte CONFAZ/UF). `PIS_COFINS_MONOFASICO_NCM` lida com `vigenteAte = 2026-12-31` (L10; LC 214
    art. 542 XI). Migração de dado com prólogo defensivo (SQLite não transacional).
12. `models/segregacaoNcm.ts`, pura: `segregacaoPorNcm(ncm, uf, data, linhas)` → `TributoSimples[]`, reusando
    `SEGREGACAO_EXCLUI` e `pisCofinsMonofasicoNcm`. Data ≥ 2027-01-01 ⇒ sem PIS/COFINS (I-9).
13. `ReceitaFiscalService.registrarVenda` preenche `excluir` por item a partir de `ProductFiscalProfile.ncm` (sem NCM ⇒ `[]` +
    `WARN SEM_NCM`). `SimplesApuracaoService` passa as linhas; a `SimplesSegregacaoManual` da competência **prevalece** com alerta
    `SEGREGACAO_DIVERGE` (I-8).
14. Alerta `SEGREGACAO_INDEVIDA` (LC 123 art. 29 V, risco de exclusão) no molde `severity`/`motivoInformativo` do `SimplesDto`.

### PR-3: simuladores (puros, com `parametrosSha256`, gravam sugestão e nunca apuração)

15. `GET /api/accounting/simples/simulacoes/fator-r?competencia=&folhaAlvoCents=` (contrato §4.2) sobre `fatorR` e `apurar` (`simplesCalc.ts:257,317`).
    Aviso **I-5** fixo, com o texto da P-EF-5: *"pró-labore pode subir se efetivamente pago e com INSS recolhido; não flutue
    para bater 28 %"*. `folhaAlvoCents` nunca é persistido.
16. `GET /api/accounting/simulacoes/regime?ano=` com Simples × Presumido × Real (F-EF-7 a) sobre os 12 meses do razão, e 2027 pela
    tabela do IBS-CBS-2027 (linha `DRAFT` ⇒ aviso). Inclui alerta de sublimite e da janela de opção (LC 123 art. 16).
17. `GET /api/accounting/simulacoes/remuneracao-socio?ano=&partnerId=`, com pró-labore × dividendos × JCP sobre `Partner`. **Só recebe
    `executa` depois do cálculo de dividendos/JCP do IRRF-DISTRIBUICAO em `main`**; até lá, a rota não existe (sem stub).
18. Cada simulação pode virar `TaxOptimizationSuggestion` (`FATOR_R_FOLHA`, `TROCA_DE_REGIME`, `REMUNERACAO_SOCIO`) com `calc` e
    `parametrosSha256`; linha de lei mais nova ⇒ aviso, nunca recálculo silencioso (I-10).

### PR-4: alertas e relatório

19. Alerta salão-parceiro: cota sem contrato vigente/homologado; contrato vigente com `cotaProfissionalCents = 0`; profissional
    sem CNPJ. A cláusula da P-EF-9 (% de locação de bem móvel, % de custeio, NFS-e do parceiro) entra como checklist **declarado**.
20. Alerta de interdependência (L13) pelo `Partner`: o dado de participação em outra empresa é **informado** no cadastro (campo
    novo `outrasParticipacoes Json?`, molde do X13). Só aviso.
21. Alerta de sublimite/teto: projeção 12 meses ≥ 80 % de R$ 3,6 mi / R$ 4,8 mi; excesso > 20 % (`SIMPLES_LIMITE`, `rbt12`).
22. Linhas do relatório que só **consomem**: retenções sofridas (RETENCOES-FONTE) e crédito não tomado (IBS-CBS-2027) ⇒
    `NAO_DISPONIVEL` com o nó citado até existirem.
23. `GET /api/accounting/tax-optimization/report?competencia=` (D9): soma só `ACCEPTED` (I-11), mais a economia medida, mais o artigo;
    `EXPORT_ECONOMIA_FISCAL` no `DataExchangeExportService` (pacote do contador).
24. **Gates (valem para todo PR):**
    - snapshot de shape dos DTOs novos, inserindo só a entrada nova (memória "UPDATE do snapshot reordena");
    - allowlist `auditCanonical.ts` (`tax.suggestion.*`, `tax.policy.*`, `sale.fiscal_guard.blocked`);
    - openapi path-count (`server/public/openapi.json`); i18n pt/en;
    - `check:arch` sem violação nova; teste de fronteira "nenhum import Prisma em `rules/plugins/**`" (I-12);
    - `resetDb` limpa as tabelas novas; `tsc` limpo (server + `tsconfig.test.json`); `node scripts/plano-vault.mjs check`.

### PR-5: serviços (S-1..S-6)

25. `ServiceFiscalProfile` ganha `finalidade TERAPEUTICA|ESTETICA|BELEZA` (nullable; null ⇒ ESTETICA, I-17), `elegivelHospitalar`
    (padrão false) e `fundamentoHospitalar` (texto, obrigatório quando elegível; o **refine** do contrato do ADR §7).
    `CompanyFiscalProfile` ganha `sociedadeEmpresaria`, `alvaraSanitarioValidoAte` (date-only, calendário validado) e
    `alvaraSourceDocumentId`. Migração aditiva; snapshot só das entradas novas.
26. X7: `AtividadePresuncao` ganha `HOSPITALAR`, com linhas `PRESUNCAO_IRPJ/HOSPITALAR = 800 bp` e `PRESUNCAO_CSLL/HOSPITALAR = 1200 bp`
    (Lei 9.249 arts. 15 § 1º III "a" e 20 [D05]). A receita de serviço é repartida **por serviço** (art. 15 § 2º [D05]):
    - HOSPITALAR exige `elegivelHospitalar`, `finalidade = TERAPEUTICA` e o checklist válido na data;
    - falta algum ⇒ 32 % + `HOSPITALAR_REQUISITO_AUSENTE` (I-14, I-15);
    - P-EF-7 vira texto de ajuda: "sala cirúrgica/ambulatorial; consulta e toxina/preenchimento simples = 32 %".
27. Sugestão `PRESUNCAO_HOSPITALAR` por serviço com receita no período, com economia estimada e checklist do que falta.
28. Tabela `ISS_FIXO_SUP` por `codMun` (linha SP `DRAFT`: valor 2026 não conferido, P-EF-8) e
    `GET /api/accounting/simulacoes/iss-uniprofissional?ano=`, com checklist do Tema 1.323 e a exigência municipal. Para SP o checklist traz a linha
    *"limitada: exige amparo judicial"* (P-EF-8). Regime SIMPLES ⇒ 400 `SUP_VEDADO_NO_SIMPLES` (I-16).
29. Modo de apuração `ISS_FIXO_SUP` no X7 Fase C, habilitado só com documento anexado (inscrição municipal no regime **ou**
    decisão judicial: P-EF-8) e vigência; a NFS-e continua emitida com o ISS do regime fixo.
30. Alertas de enquadramento:
    - `PROFISSAO_REGULAMENTADA_TIRA_16`: recorte **por empresa**, triagem B; texto cita Lei 9.250 art. 40 p.ú. [D06] e a Lei 13.643/2018, não lida;
    - `MEDICO_COM_SERVICO_ESTETICO`;
    - `LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES`;
    - `CESSAO_MAO_DE_OBRA_MEDICA`.
31. **Pacote (F-EF-13 a sobre o campo existente).** Sem campo novo: a política é `FiscalProfile.pacoteFatoGerador`. Como o padrão
    por regime se aplica é o **F-EF-17**. Em qualquer caminho, o perfil com `VENDA` em regime SIMPLES ou `CONSUMO` fora dele ganha
    `INFO PACOTE_FATO_GERADOR_FORA_DO_PADRAO`. O aviso fixo de 2027 (IBS/CBS no recebimento, LC 214 art. 10 § 4º) entra no texto.
32. Tabela `IBS_CBS_REDUCAO_NBS` (vigência 2027-01-01, Anexo III da LC 214, 6000 bp) + `cargaTributariaDoItem` de 2027: redução só com
    `cNBS` na tabela **e** `finalidade ≠ ESTETICA` (F-EF-8/11; P-EF-4); estético com NBS de saúde ⇒ alíquota cheia + sugestão
    `NBS_SAUDE_2027`.
33. Alertas de parceria completos (estende o 19): sem homologação, profissional sem CNPJ ativo, contrato vencido, parceiro em
    função administrativa, checklist do art. 1º-C **declarado** (I-19: nada inferido de agenda).

## 4. Contratos esboçados

### 4.1 Prisma

```prisma
model TaxOptimizationPolicy {            // política COMERCIAL (D2): não liga/desliga guarda legal
  id                String    @id @default(cuid())
  userId            String
  unitId            String
  criterioAlocacao  String    @default("PROPORCIONAL_CATALOGO") // | CARGA_TRIBUTARIA (só via sugestão aceita pelo contador)
  pisoServico       String    @default("CUSTO_INFORMADO")       // F-EF-1 a: CUSTO_INFORMADO → CATALOGO_MINIMO → SEM_DESCONTO_ALEM_DO_PROPORCIONAL
  aprovador         String    @default("CONTADOR_SENAO_ADMIN")  // F-EF-3 a
  severidadePisoProporcional String @default("WARN")            // F-EF-14 — RATIFICADO (a) em 22/10/2026
  vigenteDesde      String    // YYYY-MM-DD
  vigenteAte        String?
  createdById       String
  createdAt         DateTime  @default(now())
  deletedAt         DateTime?
  @@index([userId, unitId, vigenteDesde])
  @@map("tax_optimization_policies")
}

model ServiceCostEvidence {              // F-EF-1 a — piso do serviço
  id                  String    @id @default(cuid())
  userId              String
  unitId              String
  serviceRef          String
  custoCents          BigInt?   // custo informado com evidência
  catalogoMinimoCents BigInt?   // preço mínimo publicado
  sourceDocumentId    String?   // evidência (obrigatória quando custoCents != null)
  vigenteDesde        String
  vigenteAte          String?
  createdById         String
  createdAt           DateTime  @default(now())
  deletedAt           DateTime?
  @@index([userId, unitId, serviceRef, vigenteDesde])
  @@map("service_cost_evidences")
}

// TaxOptimizationSuggestion: como no ADR §7, com `practice` acrescido de CRITERIO_CARGA; sem soft-delete (trilha).
```

### 4.2 Zod / TS

```ts
// features/sales/dtos/FiscalCheckDto.ts
export const VIOLATION_CODES = ['ITEM_ABAIXO_DO_PISO', 'COMBO_ABAIXO_DO_CUSTO', 'ITEM_ACIMA_DO_CATALOGO',
  'PRECO_DIFERENTE_DO_CATALOGO_SEM_DESCONTO', 'DESCONTO_FORA_DO_DOCUMENTO', 'DESCONTO_CONDICIONAL_COMO_INCONDICIONAL',
  'RATEIO_NAO_FECHA', 'KIT_SEM_PRINCIPAL', 'SEM_CUSTO', 'ORDEM_DE_CARGA_INDETERMINADA', 'CRITERIO_CARGA_EXIGE_CONTADOR'] as const;
export const FiscalCheckResponseSchema = z.object({
  saleId: z.string(), ok: z.boolean(),
  criterio: z.enum(['PROPORCIONAL_CATALOGO', 'CARGA_TRIBUTARIA']),
  violations: z.array(z.object({ code: z.enum(VIOLATION_CODES), itemRef: z.string().nullable(),
    severity: z.enum(['BLOCK', 'WARN']), legalBasis: z.string(), detail: z.string() }).strict()),
  alocacao: z.array(z.object({ itemRef: z.string(), discountCents: z.coerce.bigint(),
    pisoCents: z.coerce.bigint().nullable(), cargaBp: z.number().int().nullable() }).strict()),
  economiaPotencialCents: z.coerce.bigint().nullable(),   // CARGA × proporcional (item 8)
  suggestionId: z.string().nullable(),
}).strict();

// features/sales/models/discountAllocation.ts — pura
export type CriterioAlocacao = 'PROPORCIONAL_CATALOGO' | 'CARGA_TRIBUTARIA';
export interface ItemParaAlocacao { itemRef: string; catalogUnitPriceCents: bigint; quantity: number;
  pisoCents: bigint | null; cargaBp: number | null; }
export function alocarDescontoFiscal(itens: readonly ItemParaAlocacao[], descontoCents: bigint, criterio: CriterioAlocacao):
  { porItem: Array<{ itemRef: string; discountCents: bigint }>; criterioAplicado: CriterioAlocacao;
    avisos: Array<'ORDEM_DE_CARGA_INDETERMINADA' | 'SEM_CUSTO'>; excedenteCents: bigint };

// features/sales/models/fiscalGuard.ts — pura
export interface ItemVendido { itemRef: string; natureza: 'SERVICO' | 'REVENDA' | 'PACOTE'; unitPriceCents: bigint;
  catalogUnitPriceCents: bigint | null; discountCents: bigint; quantity: number; pisoCents: bigint | null; }
export function verificarItens(itens: readonly ItemVendido[],
  politica: { criterio: CriterioAlocacao; severidadePisoProporcional: 'WARN' | 'BLOCK' },
  cabecalho: { discountCents: bigint; discountKind: 'UNCONDITIONAL' | 'CONDITIONAL' | null }): Violation[];

// accounting/dtos/TaxOptimizationDto.ts
export const UpdateTaxOptimizationPolicySchema = z.object({
  criterioAlocacao: z.enum(['PROPORCIONAL_CATALOGO', 'CARGA_TRIBUTARIA']),
  pisoServico: z.enum(['CUSTO_INFORMADO', 'CATALOGO_MINIMO', 'SEM_DESCONTO_ALEM_DO_PROPORCIONAL']),
  vigenteDesde: dateOnly,
}).strict();
export const DecideSuggestionSchema = z.object({ reason: z.string().min(3).max(280).optional() }).strict();
// FatorRSimulacao*, IssUniprofissionalSimulacaoSchema, ServiceFiscalProfileServicosSchema, ChecklistHospitalarSchema:
// como no ADR §7, sem mudança.
```

### 4.3 Rotas

| Rota | PR | Policy |
|---|---|---|
| `POST /api/sales/:id/fiscal-check` | 1 | `canManageFiscalProfile` (leitura da venda pelo dono do escopo) |
| `GET\|PUT /api/accounting/tax-optimization/policy` | 1 | `canManageTaxOptimization` |
| `GET\|POST\|DELETE /api/accounting/tax-optimization/service-costs` | 1 | idem |
| `GET /api/accounting/tax-optimization/suggestions?status=` | 1 | idem (leitura) |
| `POST /api/accounting/tax-optimization/suggestions/:id/accept\|reject` | 1 | decisor pela política (F-EF-3 a; CARGA = só contador) |
| `GET /api/accounting/simples/simulacoes/fator-r` | 3 | `canManageTaxAssessment` |
| `GET /api/accounting/simulacoes/regime` · `…/remuneracao-socio` · `…/iss-uniprofissional` | 3 / 3 / 5 | idem |
| `GET /api/accounting/tax-optimization/report` | 4 | idem |

## 5. FORKS NOVOS — RATIFICADOS em 22/10/2026 ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]])

Abertos ao ler o código atual contra a emenda de 21/10. **Nenhum se auto-ratifica.**

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-EF-14** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]) · Piso sob o critério **proporcional** (padrão desde 21/10) | **(a)** `ITEM_ABAIXO_DO_PISO` / `COMBO_ABAIXO_DO_CUSTO` = **WARN** sob PROPORCIONAL e **BLOCK** sob CARGA · (b) BLOCK nos dois (D6 literal) · (c) WARN nos dois | **(a).** D6 nasceu para a alocação **por carga**, que é escolha do contribuinte (é ela que o fisco pode ler como manobra). No proporcional, o item abaixo do custo é efeito de promoção real e o preço declarado **é** o praticado (LC 87 art. 13 I; CTN 148 exige que o documento "não mereça fé"). Bloquear em (b) impede emitir a nota de uma venda real, e a não emissão é ela mesma infração (LC 214 art. 13 I "a"). (c) tira a defesa de onde ela importa. O valor fica em `TaxOptimizationPolicy.severidadePisoProporcional` (fixo por enquanto, sem PUT) | **alto em (b):** queima de estoque sem nota |
| **F-EF-15** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]) · O razão (3.1 × 3.3) e as DPS seguem o desconto **por item**? | **(a)** `splitRevenueCredit` e o `splitCents` da DPS passam a usar o peso **líquido** por natureza/grupo (`Σ quantity × catalogUnitPrice − discountCents`) quando a venda tem `discountCents`; venda legada continua no bruto · (b) só a subrazão (`ratearReceita`) usa o líquido; o razão e a DPS seguem proporcionais ao bruto | **(a).** Uma fonte só (`saleItems.discountCents`): com o proporcional, o resultado é igual ao de hoje, salvo arredondamento; com CARGA, (b) faria o razão creditar 3.1/3.3 numa proporção e a NFS-e e a subrazão noutra, e o tie-out por natureza quebra. Toca o contrato do `ADR-INCR-REVENUE-SPLIT` D5 ("proporção dos subtotais brutos"), por isso é fork e não item direto | médio em (b): divergência razão × documento sob CARGA |
| **F-EF-16** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]) · Destaque do desconto na NFS-e (reabre **F-DFE-15 a**) | **(a)** `vServ` = Σ catálogo do grupo, `vDescIncond` = Σ `discountCents` do grupo; o tie-out passa a ser `Σ (vServ − vDescIncond) = crédito 3.1`; preenche `FiscalDocument.vDescIncondCents` · (b) manter F-DFE-15 (a): `vServ` líquido, sem destaque | **(a).** O motivo do F-DFE-15 (a) era o float→centavos fora do mapper; com `discountCents` inteiro por item o motivo some. O destaque é o que torna o desconto **incondicional** no IBS/CBS (LC 214 art. 12 § 3º: "que conste do respectivo documento fiscal") e mostra preço de catálogo × desconto (I-1). Em 2026 a base do ISS é a mesma nos dois | médio em (b) a partir de 2027 |
| **F-EF-17** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]) · Padrão do pacote por regime (F-EF-13 a) sobre `pacoteFatoGerador` existente | **(a)** não mudar o default do campo (`CONSUMO`, F-DFE-9 a); o padrão por regime vira só o alerta do item 31 e uma sugestão aceita pelo decisor · (b) default derivado do regime (`CONSUMO` no SIMPLES, `VENDA` fora) quando o campo não foi gravado explicitamente | **(a).** O campo é de outro nó e já é decisão ratificada, e o default `CONSUMO` é o padrão do Simples, que é o regime do 1º cliente. (b) muda em silêncio a emissão de quem está no Presumido | baixo |

## 6. Pendente de validação externa (contador / fonte oficial; não são forks)

| # | Estado em 22/10 | Trava | Quem |
|---|---|---|---|
| P-EF-1 | **respondida 21/10:** só proporcional tem respaldo ⇒ padrão emendado. **Resta:** a evidência de custo que o contador quer guardar quando aceitar CARGA (NF de compra × custo médio na data × ficha de custo do serviço) | item 5 (`ServiceCostEvidence.sourceDocumentId` obrigatório?) | contador |
| P-EF-2 | respondida: receita líquida do incondicional (L8) | — | — |
| P-EF-3, P-EF-4, P-EF-5, P-EF-9, P-EF-10 | respondidas, confirmação (§1) | — | — |
| P-EF-6 | ~~dado: Conv. ICMS 142/2018 + protocolos, NCM 3303/3304/3305~~ **conferido 27/10 para SP:** fora da ST desde 01/04/2026 (Portaria SRE 94/2025; RC 33677/2026); outras UFs quando houver cliente (Emenda 28/10 item 1) | item 11 (SP sem linha desde 2026-04-01) | fonte oficial SEFAZ-UF (outras UFs) |
| P-EF-7 | respondida (critério); **lista por procedimento** com fundamento na Atribuição 4 ainda por cliente | item 26 (`fundamentoHospitalar`) | contador, por tenant |
| P-EF-8 | respondida (SP: amparo judicial); ~~valor 2026 não conferido~~ **valor 2026 conferido 27/10** na tabela oficial da Fazenda de SP: R$ 2.413,62 por profissional até 5 (Emenda 28/10 item 2) | item 28 (linha SP sai de DRAFT por PR de dado) | — |
| P-EF-11 (nova) | ~~esteticista é profissão regulamentada pela Lei 13.643/2018?~~ **Lida 27/10: sim** ("Regulamenta", art. 1º); salão só de estética perde os 16 %. Cabeleireiro (Lei 12.592) fica ambíguo: leitura segura 32 % (Emenda 28/10 item 3) | texto do item 30 | contador só com cliente real no Presumido até R$ 120 mil |
| P-EF-12 (nova) | ~~Decreto 12.955/2026 arts. 12 e 13~~ **Lido 27/10:** a forma está nos arts. 14 e 16 do Regulamento da CBS (comparável = venda avulsa nos 3 meses anteriores; Emenda 28/10 item 4) | antes de ligar CARGA em produção (segue com aceite do contador) | — |

## 7. Insumos ausentes

1. **`ProductFiscalProfile`** (NCM) fora de `main`: PR-2 bloqueado; X10a `blocked`.
2. **Documento fiscal de produto** (NFC-e/NF-e) fora de `main`: a guarda de emissão só morde a NFS-e; o produto do combo fica
   coberto pela subrazão e pelo `fiscal-check` até o X10a.
3. **Cálculo de dividendos/JCP** do IRRF-DISTRIBUICAO: o item 17 espera.
4. **Tabela IBS/CBS 2027** com alíquota publicada: o item 16 (2027) e o item 32 rodam com aviso de `DRAFT`.
5. RDC Anvisa 50: não lida (§6). ~~Conv. ICMS 142/2018, Lei SP 13.701 art. 15 (2026), Lei 13.643/2018, Decreto 12.955/2026~~:
   lidos em 27/10 (Emenda 28/10).
6. **Wizard Nova Venda** grava `catalogUnitPrice` e `discountCents`: é FE (`FE-INCR-EFICIENCIA-FISCAL`). Até ele, venda pela API
   genérica cai no ramo legado do item 2 (`catalogUnitPrice := unitPrice`, desconto só no cabeçalho, rateio proporcional calculado
   pelo `fiscal-check`).

## 8. Achados fora de escopo (não planejados)

1. Tema 69 (ICMS fora da base de PIS/COFINS): emenda do X8 (ADR §11).
2. `PackageCatalogModule` como combo de entitlements (arco H).
3. Custo de mão de obra calculado por serviço (nó de pessoal/custos); aqui só o custo **informado** com evidência (F-EF-1 a).
4. O ADR D5/F-EF-2 ainda descreve CARGA como padrão. A emenda do ADR para `Accepted` é do fold que o aceitar, não deste BRIEF.
5. `aboveCatalogPrice` (pacote acima do catálogo) segue boolean sem preço gravado (F-FE-VP-1b); com `catalogUnitPrice` no item ele
   fica derivável. Não é emendado aqui.

## 9. Fold desta sessão

`docs/plano/nos/EFICIENCIA-FISCAL.md`:
- `estado` continua `planned`;
- `estado_detalhe` ganha a entrada de 22/10: BRIEF escrito, padrão proporcional pela triagem, F-EF-14..17 PENDENTES, PR-2 bloqueado por X10a;
- "Docs" aponta para este arquivo e para o dossiê de 22/10; "O que espera o dono" troca a lista de forks antigos pelos novos;
- `atualizado` = 2026-10-22. `autorizacao` não muda.

## 10. Invariantes (cada uma vira teste; ADR §13 com as emendas de 21–22/10)

1. **I-1:** nenhum caminho de API grava `unitPrice ≠ catalogUnitPrice`; o desconto vive em `discountCents ≥ 0`, nunca acima do catálogo (teste de mutação do item 2).
2. **I-2:** venda com ≥ 2 naturezas ⇒ documento itemizado por grupo (hoje: N DPS por `cTribNac`, F-DFE-16 b).
3. **I-3:** sob CARGA, item abaixo do piso ou combo abaixo do custo ⇒ `BLOCK` na emissão; sob PROPORCIONAL ⇒ conforme F-EF-14; item sem piso não recebe mais que a cota proporcional.
4. **I-4:** `CONDITIONAL` ⇒ receita bruta e sem redutor; `UNCONDITIONAL` ⇒ líquida e `Σ discountCents = discountAmount` (±1).
5. **I-4b:** alocação determinística; `custoSnapshotCents` gravado uma vez, nunca recalculado.
6. **I-5:** toda simulação de fator r traz o aviso de folha real (texto P-EF-5); `folhaAlvoCents` nunca persiste.
7. **I-6:** `criterioAlocacao = CARGA_TRIBUTARIA` só existe por sugestão `ACCEPTED` por contador ACTIVE; `SYSTEM` nunca decide.
8. **I-7:** tratamento do principal só com `PRINCIPAL_ACESSORIO` aceita, e só a partir de 2027.
9. **I-8/I-9:** `excluir` derivado = `segregacaoPorNcm`; a manual prevalece com alerta; monofásico em ≥ 2027 ⇒ sem PIS/COFINS.
10. **I-10/I-11:** `parametrosSha256` em toda sugestão e simulação; o relatório soma só `ACCEPTED`.
11. **I-12/I-13:** nenhum import Prisma em `rules/plugins/**`; auditoria sem PII.
12. **I-14..I-19:** como no ADR §13 (hospitalar por data, por atividade, SUP vedado no Simples, ESTETICA nunca a 8 %/60 % sem aceite, pacote por consumo, parceria só por dado declarado).
