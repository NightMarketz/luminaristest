# PARECER — luminaris-accounting-architect sobre ADR-INCR-DFE-EMISSAO-PARCEIRO

**Veredito: ADR apto a ratificação com 6 ajustes de texto (2 contradições internas, 4 lacunas de invariante) e 3 forks novos a levar ao dono — nenhum reabre decisão commitada.**

> **PARECER DE DOMÍNIO** (`luminaris-accounting-architect`) — não é BRIEF nem ADR; não ratifica fork nenhum (ACC-001/ACC-003). Complementa `ADR-INCR-DFE-EMISSAO-PARCEIRO.md` (rodada 6 SDD, PR #289). Data: 2026-09-08. Todo claim de código foi verificado por leitura real em `origin/main` (worktree isolado, sem `dev.db`, zero arquivo criado/editado pelo parecerista); grau declarado em cada linha (verificado / inferido / assumido). Fontes fiscais fora do repo estão marcadas **[secundária / pendente de validação externa]**. Autorização citável: plano SDD 2026-09-07 rodada 6 (*"ADR → parecer `luminaris-accounting-architect` → R"*); F-M7 → (d) e R4 ✅ conforme a cédula de módulos e o próprio ADR §8.

---

## 0. Sumário executivo (as duas primeiras linhas, OPS-001 gate 5)

**Verdade:** o ADR está corretamente ancorado — `FiscalDocument` é literalmente o exemplar nomeado em `AC-2.1-B2` do Contrato (verificado), a proveniência reusa o seam `attachSourceDocument` sem relançar (coerente com ADR-NFE D2b/D7 e INCR8 D5), a credencial segue o molde ADR-M2 (R4 ✅), e D1–D8 não colidem com nenhuma decisão commitada. **Risco principal (silencioso, de dinheiro):** o ADR trata o documento como "proveniência, nunca fato contábil" (D7) e isso é verdadeiro para a **receita**, mas é falso para o **ISS** que a NFS-e destaca — o plano de contas canônico **não tem nenhuma conta de tributo** (verificado: `ChartOfAccountsFixture` só carrega 1.1.x, 2.1.1, 2.1.2, 2.3.1, 3.1/3.2/3.3, 4.1/4.2), o razão reconhece receita **bruta** pelo `totalAmount` e o ADR não diz em lugar nenhum que o ISS destacado fica fora do razão até o `ADR-INCR-TAX-ASSESSMENT` (X7). Segundo risco: o ADR contém uma **contradição interna** — D3(ii) "payload imutável após `SENT`" × D7 "operador corrige perfil/venda e reenvia (novo `SENT`, mesmo `ref`)" — que, lida ao pé da letra pela sessão de feature, ou proíbe o reenvio corrigido ou destrói a evidência do que foi enviado.

---

## 1. Invariantes contábeis/fiscais que o ADR não nomeou

### 1.1 [CRÍTICO] NFS-e × reconhecimento de receita: o documento deve amarrar com o crédito **por natureza** (3.1), não com o total da venda

- **O que o razão já faz (verificado):** `SaleFinalizedMapper` lança `D 1.1.2 = totalCents / C 3.1 = serviceCents / C 3.3 = productCents` com `amountCents = Math.round(totalAmount × 100)` a partir de um **float em reais** do preset (`SalesModule.totalAmount`, `numberFormat:'currency'`). O split por natureza vem de `splitRevenueCredit` (`revenueSplit.ts`): proporção pelos subtotais crus `quantity×unitPrice` (`saleItems.ts`), **resíduo de arredondamento absorvido pela linha de produto**, desconto de header rateado proporcionalmente.
- **Invariante que o ADR precisa escrever:** `Σ vServ dos itens de serviço da DPS == crédito 3.1 do lançamento âncora` (e, na onda 2, `Σ vProd da NF-e == crédito 3.3`), **em centavos, igualdade exata**. O §7 item 4 só assere "0 lançamentos novos + 1 SourceDocument" — não assere que o documento bate com o razão. Uma NFS-e autorizada com valor ≠ receita escriturada é exatamente a inconsistência que o cruzamento ADN × ECF do PNCT (item 10) vai devolver ao contador [inferido — a mecânica exata do cruzamento é do Ato nº 5, não lido].
- **Modo de falha concreto (inferido, decorre de código verificado):** se o BRIEF montar a DPS recomputando valores dos floats da venda/itens, um desconto de header que não divide exato produz `Σ itens da DPS ≠ crédito 3.1` por 1 centavo — e o tie-out por total (`NfeSaleReconciliationService.ts:98`, que compara `vNF` com `Σ débito` do lançamento) **passa** para venda pura e **falha** por desenho em venda mista com dois documentos (cada documento é subconjunto do débito). Ver fork novo F-DFE-11 (§3).
- **Reuso obrigatório:** a técnica de rateio com resíduo já é canônica (`splitCredit`/`splitRevenueCredit`, extraída justamente para não ser re-inlinada — memória `reuse-criterion-blind-to-reinlined-technique`). A montagem da DPS não pode reescrevê-la.

### 1.2 [CRÍTICO] ISS devido × ISS retido: o documento origina um fato contábil que o razão hoje não tem onde pousar

- **Verificado:** nenhuma conta de tributo no plano canônico; `taxAmount` existe no preset `sales` mas o mapper **ignora-o** (usa só `totalAmount`); `ISS`/`PIS`/`COFINS` = 0 arquivos de código (cédula de módulos §D confirma).
- **ISS próprio (devido pelo prestador):** conta redutora de receita (ou despesa tributária) × `2.1.x ISS a recolher`, por competência. Não nasce do documento — nasce da **apuração** (X7). O ADR pode legitimamente deixá-lo fora do MVP, mas **tem de dizer isso**: "a NFS-e destaca ISS; o razão não o escritura até `ADR-INCR-TAX-ASSESSMENT`; a apuração/pagamento do ISS é obrigação humana até lá". Hoje o D7 "nada muda no razão" é lido como cobertura total.
- **ISS retido pelo tomador** (tomador PJ, LC 116 art. 6º — **[secundária]**): o valor a receber cai (`recebido = total − ISS retido`) e nasce `1.1.x ISS retido a compensar`. Com `sale.settled` liquidando o total (verificado que o settlement é bridge própria), o AR × banco divergiria pelo ISS retido. Salão vendendo a PF nunca tem retenção [secundária], então o MVP pode declarar "retenção fora do escopo" — mas então `ServiceFiscalProfile.issRetido` (D5) está no **eixo errado**: retenção é propriedade da **operação/tomador** (PJ, município, serviço), não do serviço. Recomendo tirar `issRetido` do perfil por serviço e tratá-lo por documento (default `false`, sem UI no MVP).
- **Alíquota de ISS:** para 6.01/6.02 o ISS é devido no **estabelecimento prestador** [secundária] ⇒ a alíquota é função de (`FiscalProfile.codMun`, item da lista), não do serviço isolado. O pedido ao contador já exclui "alíquotas municipais por cidade" até o 1º cliente ter município — coerente; o ADR §4 pede "alíquota de ISS por serviço do salão" — ajustar para "item da lista + alíquota do município do 1º cliente".
- **IBS/CBS 2026 (ano-teste, 0,1% + 0,9%, LC 214 art. 348 — [secundária], master map §5):** o documento destaca, mas não há recolhimento em 2026 para quem cumpre as acessórias [secundária]. Invariante: **nenhum lançamento de IBS/CBS de teste no razão** — o ADR deve declará-lo como não-objetivo explícito, senão alguém "corrige" o D7 postando 2.1.x IBS/CBS.
- **Consequência de modelo (inferido):** `FiscalDocument` deveria persistir os valores tributários **calculados em centavos** (`vServCents`, `baseIssCents`, `aliqIssBp`, `vIssCents`, `vIbsCents`, `vCbsCents`, `issRetido`) como colunas, não só dentro de `payloadJson` opaco — X7 vai consumi-los sem parsear JSON, e o tie-out §1.1 precisa deles.

### 1.3 [ALTO] Documento cancelado após venda quitada — três direções, o ADR só cobre uma

- **Verificado:** `SalesCancellationService` aceita cancelar/devolver **qualquer** venda `Finalized` (`:67-68`), sem gate de `paymentStatus`; `SaleReversalBridge` reverte `sale.finalized` **e** `sale.settled` em `Cancelled`, e posta contra-receita 3.2 em `Returned` (receita original fica). `SourceDocument.deletedAt` existe mas "**NENHUM path de delete é wired**" (`schema.prisma:774`, comentário literal).
- **(i) Venda cancelada depois de autorizada** — o ADR cobre ("tela exige cancelar o documento, não automático"). Falta: prazo de cancelamento é do fisco (NF-e 55: 24h [secundária, notório]; NFS-e nacional: regra do ADN/município [secundária, **pendente manual**]) — fora do prazo é substituição/evento, não cancelamento. O `cancelar` do porto precisa devolver "fora do prazo" como resultado tipado, não erro genérico.
- **(ii) Documento cancelado fiscalmente, venda continua `Finalized`** — direção que o ADR não nomeia. Só é legítima como passo de **substituição** (reemitir). Se ficar assim, há receita escriturada sem documento vivo — inconsistência PNCT. Invariante: `CANCELLED` sem novo documento vivo na mesma venda ⇒ pendência visível (tela), não estado estável.
- **(iii) Proveniência da nota cancelada continua anexada ao lançamento** — `attachSourceDocument` é idempotente por `externalRef` **dentro do mesmo entry**; a nota substituta tem número novo ⇒ o lançamento fica com **2 `SourceDocument`** (cancelada + nova) e nada marca a primeira. O drill-down (`FE-INCR-AUDIT-PROVENANCE`, C4) e um futuro `NUM_ARQ` da ECD (§1.7) apontariam para a nota morta. Recomendo: no `CANCELLED`, gravar o status no `SourceDocument` (`description`/`rawJson`) ou wirear o soft-delete que o schema já reservou — decisão do BRIEF.
- **(iv) `Returned` (devolução)** — a NFS-e nacional não tem "devolução parcial" [secundária]; para produto (onda 2) é NF-e de entrada de devolução [secundária]. Declarar **fora do MVP** explicitamente (hoje o ADR só fala de `Cancelled`).

### 1.4 [ALTO] Competência × emissão em mês seguinte

- **Verificado:** a data do lançamento é `scopeDay(scope, sale.date)` (`SaleSalesAccountingBridge.ts:91`) — a **competência é a data da venda**; `attachSourceDocument` **não tem gate de período** (comentário `:711` "posts NOTHING; the balance/period gates are irrelevant" + código sem `assertPeriodOpen`), então anexar proveniência a um mês `HARD_CLOSED` é permitido hoje.
- **Invariantes a escrever:** (a) a DPS leva **competência = data da prestação = `sale.date`**, e a data de emissão é outra coisa (`dhEmi` na autorização) — o campo `dCompet` da DPS [secundária, **pendente manual**] deve vir de `sale.date`, nunca de "hoje"; (b) `SourceDocument.documentDate` = data da prestação/competência, `FiscalDocument.authorizedAt` = data de autorização — o D7 hoje diz só "`documentDate`" sem dizer qual; (c) anexar a período fechado é **intencional** (descritivo, não altera saldo — ACC-021 preservado) e o ADR deve dizê-lo, para que ninguém instale um gate de período no `attach` "por segurança" e trave a regularização do PNCT; (d) emissão fora do mês da competência é exatamente o tipo de inconsistência que o PNCT devolve [assumido — Ato nº 5 não lido] — a tela deve avisar quando `hoje − sale.date` cruza o mês.

### 1.5 [ALTO] Venda mista serviço + produto + **pacote** — o ADR só resolve o par serviço/produto

- **Verificado:** `saleItems.ts` classifica `Product | Service | Package | Mixed | Empty`; venda **all-Package** **não** posta `sale.finalized` (bridge retorna em `kind === 'Package'`, `:66`) — posta `sale.package.sold` (`D 1.1.2 / C 2.1.1 Pacotes Pré-pagos`); linhas `Package` numa venda `Mixed` "contribute to neither" natureza, então o dinheiro do pacote cai em 3.1/3.3 **por proporção** (`splitRevenueCredit` aplica a proporção ao total).
- **Consequências para o ADR:** (a) a pré-condição D4 "venda `Finalized`" + D7 "anexa ao lançamento `sale.finalized`" ⇒ venda de pacote **não tem âncora** → `NotFoundError` no attach, depois de a nota já estar autorizada no parceiro (ordem errada: o parceiro autoriza antes de o Luminaris descobrir que não tem onde pousar). O ADR não trata pacote. (b) Fiscalmente, ISS tem fato gerador na **prestação** [secundária — **pendente contador**]: emitir na venda do pacote antecipa ISS e produz NFS-e sem receita no razão; emitir no consumo (serviço pago com pacote, `paidWithPackageId`) tem âncora `sale.finalized` e casa com a receita. É fork do dono (F-DFE-9, §3). (c) `@@unique([userId,unitId,saleId,kind])` está certo para o par NFSE/NFE por venda; adicionar que a **pré-condição checa `kind`** (`Empty` e all-`Package` ⇒ recusa antes de enviar).
- **Invariante de fecho de venda mista:** `Σ NFS-e + Σ NF-e == totalCents − (linhas Package)`; o BRIEF tem de decidir se Package na venda mista bloqueia a emissão (mais simples) ou é excluído do documento com o tie-out ajustado.

### 1.6 [MÉDIO] Numeração e PNCT — quem numera o quê

- **NFS-e nacional:** o número da NFS-e é atribuído pelo ADN na autorização [secundária]; a DPS tem número/série do **prestador** [secundária — **pendente manual**]. O D3(iv) "`AUTHORIZED` exige número" está certo. O que falta: se o parceiro **não** numera a DPS, a numeração é nossa ⇒ vale ACC-015 por analogia (número nasce no `SENT`, dentro da tx, com lock de sequência por `(unitId, serie)`), **nunca** reusando `JournalEntrySequence`/`entryNumber` (sequência do razão ≠ sequência fiscal). Gap de numeração de DPS é inconsistência PNCT? [assumido — pendente manual/Ato nº 5].
- **NF-e 55 (onda 2):** `nNF`/série/`cNF` entram na chave de 44 posições (`lib/cnpj.ts` já tem `NFE_CHAVE_REGEX` e o cálculo de `cDV` — verificado) ⇒ sequência **gapless por série** com inutilização de faixas [secundária] — é o item mais pesado da onda 2 e o ADR deve marcá-lo como fork do BRIEF da onda 2, não herdar em silêncio.
- **PNCT:** o ADR usa o PNCT como argumento para o gatilho manual (D4) — correto. Acrescentar: a **vigilância** (D7 do grafo) precisa de um lugar para registrar a inconsistência recebida contra o `FiscalDocument` — pode ser `errorsJson` reaproveitado; nomear.

### 1.7 [BAIXO] ECD/ECF — nada muda hoje; uma referência nasce disponível

- **Verificado:** `RegI250Input.numArq?` existe no serializer (`lib/sped.ts:364-393`, campo `NUM_ARQ` do I250 — "número/localização do documento arquivado", Manual pp. 147-148 conforme comentário) e `SpedGenerationService` **nunca o preenche** (sempre `EMPTY`). `SpedEcfGenerationService` (Presumido) só segrega 3.1/3.3 por trimestre — o documento não entra. Blocos L/M/N (Lucro Real) pendentes.
- **Conclusão:** a existência do `FiscalDocument`/`SourceDocument.externalRef` **não altera** ECD nem ECF no MVP; `NUM_ARQ` é o único consumidor natural futuro (não-objetivo agora — declarar). Sob Lucro Real, o ISS vira dedução da receita bruta na DRE/ECF — volta ao §1.2, que é de X7.

### 1.8 [MÉDIO] `DocumentAttachment` não é polimórfico de fato — o XML/PDF só tem casa quando há lançamento

- **Verificado:** `DocumentAttachment.targetType` é string com default `JOURNAL_ENTRY`, mas `targetId` tem **FK real** `journalEntry JournalEntry @relation(..., onDelete: Cascade)` (`schema.prisma:570-572`). Logo o "XML/PDF em `DocumentAttachment`" do D7 só funciona anexando ao lançamento âncora — o que serve para `AUTHORIZED` em venda com `sale.finalized`, mas **não** para documento `REJECTED` (o parceiro pode devolver XML de rejeição), para homologação, nem para venda de pacote. O ADR precisa escolher: anexar só em `AUTHORIZED` (e o resto fica em `payloadJson`/`errorsJson`), ou generalizar `DocumentAttachment` (migração com rebuild em SQLite — blast radius), ou storage próprio do `FiscalDocument`. Decisão do BRIEF; o ADR só não pode prometer o que o schema não dá.

### 1.9 [MÉDIO] Homologação × proveniência; `ambiente` não é persistido

- D2 define `DFE_PARTNER_ENV=producao|homologacao` e D6 passa `ambiente` ao porto, mas D3 **não persiste** `ambiente` no `FiscalDocument`, e D7 anexa `SourceDocument` em todo `AUTHORIZED`. Uma NFS-e de **homologação** não tem valor fiscal — vira proveniência de uma receita real? Invariante (inferido, mesma classe do "NullEmissor recusa produção"): `SourceDocument` só de documento autorizado em `producao`; homologação grava `FiscalDocument` (com `ambiente`) e **não** anexa proveniência. Acrescentar coluna `ambiente`.

### 1.10 [MÉDIO] Idempotência no parceiro × reenvio após rejeição (ACC-013)

- D6 fixa `ref = FiscalDocument.id` como chave de idempotência no parceiro; D7 manda reenviar "com o mesmo `ref`". Parceiros que tratam `ref` como identidade única da nota devolvem **o mesmo resultado** para o mesmo `ref` [secundária — comportamento típico de API de emissor] ⇒ o documento **nunca sai de `REJECTED`**. O `ref` precisa ser **por tentativa** (`id:attempt`), e isso conflita com D3(ii) "payload imutável após `SENT`" (o reenvio corrigido muda o payload). É a contradição interna do §0 — fork F-DFE-10 (§3).

### 1.11 [BAIXO] Identidade do tomador/emitente — o que a lib prova e o que não prova

- **Verificado:** `CustomerModule.taxId` = string **sem `format`**, comentário literal "accepts either CPF or CNPJ" (`TextPresets.ts:64-71`), `unique` de preset (TOCTOU, `AC-2.2-2`); `lib/cnpj.ts` tem `CPF_REGEX = /^[0-9]{11}$/` (**só regex, sem DV**) e DV completo só para CNPJ. `UnitsModule.cnpj` usa `format: 'cnpj'` do preset — **não verifiquei** se esse validador de formato já é alfanumérico pós-#280 (o PR tocou lib, DTOs SPED e parser). §7 item 7 do ADR promete "tomador PF por CPF" — hoje isso é regex, não DV. O BRIEF precisa de DV de CPF (função nova em `lib/cnpj.ts` ou irmã) e de um teste de que uma unidade com CNPJ alfanumérico **cadastra** no preset.

### 1.12 [Confirma o ADR, sem achado novo]

- **Fronteira §2.1:** `FiscalDocument` é o exemplar de `AC-2.1-B2` (verificado, linha 108 do Contrato); `FiscalProfile` por `ref` a linha DynamicTable segue exatamente `Payable.supplierRef`/`inventoryProductRef` ("plain string, not a FK" — verificado `schema.prisma:867-920`). Correto.
- **Porta de aplicação:** `AccountingSyncPort` é invocado pós-commit por controller, nunca pelo motor (verificado cabeçalho) — `DfeEmissorPort` no mesmo desenho está certo.
- **Seam de proveniência:** `attachSourceDocument` faz gate de idempotência por `externalRef` **dentro** da tx com `tx` propagado (verificado `:751-785`, ACC-011/012 ok), audita `entry.source_recorded` in-tx (ACC-019), exige `canManage` — reuso correto.
- **Allowlist de auditoria:** padrão id-only/money-as-string (verificado `auditCanonical.ts`); os 4 eventos `dfe.*` do ADR devem seguir isso e o teste-guarda entra no **mesmo PR** (memória `accounting-audit-allowlist-guards`). Payload sem CPF/nome do tomador.
- **Policy:** `canEmitFiscalDocument` não existe (verificado `IAccountingPolicy`) — é novo, coerente com a cadeia.
- **Regime:** D8/F-DFE-8 replica a técnica do F-M8 (verificado no `ADR-INCR-SPED-ECF-FASE3` §emenda) — correto.

---

## 2. Reconciliação D1–D8 × decisões commitadas

| Decisão | Contra | Resultado |
|---|---|---|
| **D1** monta; parceiro emite | F-M7 → (d) (cédula 03/09, palavras do dono); F-Z0 "até a ponta da emissão" | **Coerente.** Lacuna: "documento completo e validado localmente" precisa da **fonte dos valores** (§1.1/F-DFE-11) |
| **D2** BYOK por env da instância | R4 ✅ 2026-09-08; ADR-M2 (1 instância/cliente, `OPENAI_API_KEY` por env — verificado `docker-compose`/`OpenAIService.ts:99` no ADR-M2 §3) | **Coerente.** Lacuna: `ambiente` não persistido (§1.9); "1 chave N CNPJs" é **[secundária]** → vira critério de F-DFE-4 |
| **D3** `FiscalDocument` Prisma | Contrato §2.1 `AC-2.1-B2` (nome literal); F-NFE3 → (a) "casa se a volumetria crescer" | **Coerente.** **Contradição interna** (ii) × D7 reenvio (§1.10); lacunas: `ambiente`, valores tributários em colunas (§1.2), attachments (§1.8), pré-condição por `kind` (§1.5) |
| **D4** gatilho manual | Item 10 PNCT (autorregularização); LAC-A (ações pela tela, #259) | **Coerente.** Lacuna: pré-condição não olha pacote/`Empty` nem aviso de competência (§1.4/1.5) |
| **D5** perfil fiscal Prisma por `ref` | §2.1 `AC-2.1-B3`; padrão `Payable.supplierRef` | **Coerente.** Lacuna: `issRetido` no eixo errado; alíquota ISS = município × item (§1.2) |
| **D6** porta + polling | `AccountingSyncPort` (porta de aplicação); T11 sem inbox/outbox | **Coerente.** Lacuna: `ref` por tentativa (§1.10); documento preso em `SENT`/`PROCESSING` sem job nomeado — "job existente" não é nenhum dos atuais [assumido: o reconcile job re-dirige postings, não consulta parceiro] |
| **D7** proveniência, nunca fato contábil | ADR-NFE D2b/D7; INCR8 D5; NFE-X #228 | **Coerente para receita; incompleto para tributos** (§1.2). Lacunas: nota cancelada permanece como proveniência (§1.3 iii), `documentDate` semântica (§1.4), homologação (§1.9), `DocumentAttachment` FK (§1.8) |
| **D8** duas ondas + qualificação | F-M8 técnica; Ato nº 4 (datas lidas pelo ADR no PDF — **fora do repo, assumido a partir do ADR §1**; a triagem de 03/09 registrava o PDF como *localizado, não lido*, o ADR afirma leitura em 07/09) | **Coerente.** Lacuna: pacote pré-pago fora das duas ondas (§1.5); numeração da onda 2 (§1.6) |

**Colisão com decisão commitada: nenhuma.** Nenhuma torre nova (tenancy segue `AccountingScope`/`unitId`), SQLite mantido, Prisma first-class, sem DynamicTable para dado fiscal, sem plugin.

---

## 3. Forks — parecer fork a fork (nenhum ratificado)

| Fork | Parecer | Motivo / emenda |
|---|---|---|
| **F-DFE-1** só NFS-e (a) | **manter (a)** | Prazo 01/10; a onda 2 carrega numeração gapless por série (§1.6) que não cabe agora |
| **F-DFE-2** env da instância (a) | **manter (a)** | Fiel ao ADR-M2; "N CNPJs por conta" é **[secundária]** e vira critério de seleção em F-DFE-4, não premissa |
| **F-DFE-3** manual (a) | **manter (a)** | Reforço: (b) automático faria o parceiro autorizar antes de o Luminaris achar a âncora (pacote, §1.5) — o custo de errar de (b) é maior que "rejeição em massa": é nota autorizada sem casa |
| **F-DFE-4** parceiro | **manter "sem recomendação"** | Acrescentar aos critérios: `ref` idempotente **por tentativa** ou reenvio com `ref` novo; cancelamento devolve "fora do prazo" tipado; substituição de NFS-e; ambiente de homologação da **NFS-e nacional** (não só da NF-e) [secundária]; retorno com `dCompet` ecoado |
| **F-DFE-5** polling (a) | **manter (a)** | Emenda: nomear **qual** job re-consulta `SENT`/`PROCESSING` órfãos (nenhum existente serve — assumido); sem isso um documento fica preso até alguém abrir a tela |
| **F-DFE-6** perfil fiscal Prisma (a) | **manter (a) com emenda** | `issRetido` sai do `ServiceFiscalProfile` (eixo tomador/operação, §1.2); `aliqIss` é (município do `FiscalProfile` × item LC 116), não atributo solto do serviço |
| **F-DFE-7** tomador opcional (a) | **manter (a)** | É a única opção compatível com `simpleCustomerName` (venda sem linha de cliente). Emenda: quando `taxId` vier, validar **DV** (CPF hoje é só regex, §1.11) antes de enviar |
| **F-DFE-8** qualificação de regime (a) | **manter (a)** | Idêntico ao F-M8; regime-alvo Lucro Real |

**Forks faltantes (máximo 3, cada um com caminhos + recomendação — o dono ratifica):**

| Fork novo | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-DFE-9 — pacote pré-pago × NFS-e** | (a) emitir na **venda do pacote** (âncora `sale.package.sold`, receita ainda não reconhecida) · (b) emitir no **consumo** (serviço pago com pacote, `paidWithPackageId`; âncora `sale.finalized` existe) · (c) MVP **bloqueia** emissão para venda com item `Package`, com aviso | **(b) + (c) para a venda do pacote em si.** ISS tem fato gerador na prestação [secundária — **pendente contador**]; (b) casa documento com receita reconhecida; (a) cria NFS-e sem receita no razão (crédito é 2.1.1 passivo) e antecipa ISS. (c) sozinho é aceitável como MVP mínimo | (a) errado = ISS pago na venda **e** no consumo, ou nota sem receita; ignorar = `NotFoundError` depois de o parceiro já ter autorizado |
| **F-DFE-10 — reenvio após rejeição × imutabilidade** | (a) tabela filha `FiscalDocumentAttempt` (payload + `ref` + resultado por tentativa; `FiscalDocument` guarda o status corrente) · (b) `payloadJson` mutável até `AUTHORIZED`, `errorsJson` acumula · (c) `REJECTED` é terminal; reenvio = **novo** `FiscalDocument` (rename-on-reject libera o `@@unique`) | **(a).** Preserva "o que foi enviado" por tentativa (evidência para PNCT/contador) e dá `ref` único por tentativa (idempotência no parceiro, §1.10). (c) é o menor diff aceitável; (b) contradiz D3(ii) e apaga evidência | (b) = perde a prova do que foi rejeitado; manter D3(ii)+D7 como estão = reenvio proibido ou `ref` repetido que nunca sai da rejeição |
| **F-DFE-11 — fonte dos valores da DPS** | (a) totais **do lançamento `sale.finalized` já postado** (crédito 3.1 em centavos como teto; itens da venda só para descrição/quantidade, rateados com resíduo na última linha) · (b) recomputar dos floats da venda/itens em reais | **(a).** `Σ documento == razão` **por construção**; (b) diverge por arredondamento em desconto de header (§1.1) e ainda exige re-inlinar `splitRevenueCredit` | (b) errado = 1 centavo de divergência sistemática entre ADN e ECF em toda venda com desconto — inconsistência PNCT em massa |

---

## 4. Gates de domínio — o que só um oráculo externo prova, e em que ordem

| # | Oráculo | O que prova (o repo não consegue) | Quando |
|---|---|---|---|
| 1 | **Manual de integração da NFS-e nacional + leiaute da DPS (primária)** | `dCompet` vs `dhEmi`; tomador não identificado; quem numera a DPS (série/número do prestador); cancelamento (prazo) × substituição; grupos IBS/CBS/`cClassTrib`; ambiente de homologação | **Antes do schema Zod do BRIEF** (lição I052 — o ADR já exige) |
| 2 | **Contador (item novo no pedido)** | item LC 116 do salão (6.01/6.02) + alíquota do município do 1º cliente; regra de ISS retido (PJ); fato gerador em pacote pré-pago (F-DFE-9); IBS/CBS 2026 sem recolhimento; emissão fora do mês de competência | **Em paralelo ao 1**, antes de fechar F-DFE-6/9 |
| 3 | **Ato nº 5 (PNCT) — PDF** | o que é "inconsistência" (gap de numeração? competência?), canal de intimação, prazo 31/12 | Antes do BRIEF do FE (aviso na tela) — não bloqueia o BE |
| 4 | **Parceiro em homologação (H2-DFE)** | idempotência real do `ref`; N CNPJs por conta; retorno XML+PDF; cancelamento fora do prazo; rejeição → reenvio; **1ª nota** com `Σ DPS == crédito 3.1` | **Depois de D5** (contratado) e do BE mergeado; **nenhuma nota de produção antes** |
| 5 | **Parceiro em produção** | 1ª NFS-e real ⇒ `SourceDocument` real; vigilância PNCT começa | Depois do 4 PASSOU |

Ordem: **1 ∥ 2 → BRIEF `BE-INCR-DFE-NFSE` → 3 (FE) → D5 → 4 → 5.** Gates 1–3 são dado externo/humano (runbook em branco, sem sessão de agente); 4–5 são gate humano assinado.

**Gates de teste que o BRIEF herda (além do §7 do ADR):** tie-out `Σ itens DPS == crédito 3.1` em venda **com desconto de header que não divide exato** e em venda **mista** (fixture de uma natureza só deixaria passar — classe `bp-dre-diagnostics-test-must-mix-natures`); venda all-`Package` recusada **antes** de chamar o porto; `REJECTED` → reenvio gera `ref` novo; `CANCELLED` deixa marca na proveniência; homologação não anexa `SourceDocument`; `NullEmissor` recusa produção; CNPJ alfanumérico **cadastra** no preset `units`; CPF com DV inválido recusado; eventos `dfe.*` sem PII (teste-guarda no mesmo PR).

---

## 5. Riscos de dinheiro/legais — nomeados, com grau

| Risco | Grau | Base |
|---|---|---|
| NFS-e destaca ISS que o razão não escritura e ninguém apura até X7 — obrigação de recolhimento fica humana e invisível ao produto | **verificado** (plano de contas sem tributo; mapper ignora `taxAmount`) | §1.2 |
| Documento ≠ razão por 1 centavo em toda venda com desconto rateado (inconsistência ADN × ECF sistemática) | **inferido** (decorre de `splitRevenueCredit` + montagem a partir de floats) | §1.1 / F-DFE-11 |
| Pacote pré-pago: ISS 2× ou 0×; nota autorizada sem âncora | **inferido** (código verificado; fato gerador **[secundária, pendente contador]**) | §1.5 / F-DFE-9 |
| Reenvio após rejeição nunca sai da rejeição (mesmo `ref`) | **inferido** (comportamento de API de emissor **[secundária]**) | §1.10 / F-DFE-10 |
| Nota cancelada segue como proveniência viva do lançamento | **verificado** (sem path de delete; attach idempotente só por `externalRef`) | §1.3 |
| Nota de homologação vira proveniência de receita real | **inferido** (D7 não distingue; `ambiente` não persistido) | §1.9 |
| XML/PDF de rejeição/homologação/pacote sem onde pousar (`DocumentAttachment` FK a `JournalEntry`) | **verificado** | §1.8 |
| Tomador PF com CPF sem DV / unidade com CNPJ alfanumérico que o preset recusa | **verificado** (regex) / **assumido** (validador `format:'cnpj'` não lido) | §1.11 |
| Prazo 01/10/2026 e datas do Ato nº 4 | **assumido** a partir do ADR (PDF fora do repo; a triagem de 03/09 o registrava como não lido) | §2 D8 |
| Emissão fora do mês de competência = inconsistência PNCT | **assumido** (Ato nº 5 não lido) | §1.4 |
| PII (CPF/nome do tomador) escapar para `AuditEvent` via `dfe.*` | **verificado** o padrão que evita; risco só se o BRIEF desviar | §1.12 |
| Responsabilidade: com BYOK o emitente é o cliente; o PNCT entrega inconsistência ao contador — obrigação humana | **declarado pelo ADR**, concordo | §6 do ADR |

**Vieses deste parecer (T8):** li os arquivos que o ADR cita mais os bridges/mappers de venda e o serializer ECD; **não** varri `my-app` nem os jobs para confirmar "nenhum job existente consulta parceiro" (assumido). Toda afirmação sobre NFS-e nacional/ISS/IBS-CBS é **secundária** — o parecer não substitui o manual nem o contador. Favoreci o menor diff (colunas em vez de tabelas novas) exceto em F-DFE-10, onde a evidência por tentativa vale a tabela filha.

---

## 6. O que este parecer NÃO decide

- Não ratifica F-DFE-1..8 nem os 3 novos — cabe ao dono (ACC-003).
- Não escolhe parceiro (D5), não lê o manual nem o Ato nº 5 — dado externo.
- Não redige o schema final de `FiscalDocument`/`FiscalDocumentAttempt` — é da `sessao-planejamento`; aqui só se nomeiam as colunas que os invariantes exigem.
- Não decide o tratamento contábil do ISS — é do `ADR-INCR-TAX-ASSESSMENT` (X7); aqui só se exige que este ADR **declare** a fronteira.
- Não implementa nada — zero arquivo criado/editado (ACC-001).

## Gates de envio [OPS-001]

1. **Objetivo:** a frase que responde ao pedido é o veredito + §0 — ADR apto com 6 ajustes (D3(ii)×D7; ISS fora do razão declarado; `ambiente`; `documentDate`; nota cancelada na proveniência; `DocumentAttachment` FK) e 3 forks novos.
2. **Grau:** cada linha de §1/§5 carrega verificado/inferido/assumido; fontes fiscais externas marcadas **[secundária]**.
3. **Caso adversarial tentado:** procurei ativamente (a) uma conta de tributo no plano canônico ou uso de `taxAmount` no mapper que invalidasse §1.2 — `ChartOfAccountsFixture` e `SaleFinalizedMapper` lidos, não há; (b) um gate de período ou de status no `attachSourceDocument` que invalidasse §1.4 — código lido, não há; (c) um `targetType` polimórfico real em `DocumentAttachment` — a FK `journalEntry` existe, §1.8 se sustenta; (d) tratamento de `Package` no ADR — zero ocorrência da palavra "pacote"/"Package" no texto do ADR.
4. **Checagem que teria falhado se eu estivesse errado:** se `splitRevenueCredit` não absorvesse resíduo na linha de produto ou o mapper usasse centavos nativos, §1.1 cairia — a leitura de `revenueSplit.ts`/`SaleFinalizedMapper.ts` (`Math.round(amount*100)`) é a checagem; se `SaleSalesAccountingBridge` postasse `sale.finalized` para venda all-Package, §1.5 cairia — `:66` retorna antes.
5. **Duas primeiras linhas:** verdade (ADR ancorado, sem colisão) e risco principal (ISS fora do razão + contradição D3(ii)×D7) estão no veredito e no §0.
