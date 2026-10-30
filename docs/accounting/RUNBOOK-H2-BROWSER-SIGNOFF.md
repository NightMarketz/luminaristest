# RUNBOOK: H2 — Browser sign-off final (carimbo humano + upload por clique + recibos PDF)

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> A varredura de agente de 2026-07-23 já de-riscou as telas (2 bugs achados e corrigidos, PR #151);
> o que resta é exatamente o que ela NÃO pode fazer: o olho final, o upload POR CLIQUE e o PDF.

> **EMENDA (agente, 2026-08-22) — fluxo de salão pós-swap ainda não coberto.** Em 2026-08-21
> (commit `04582d8a`, PR #211, "prensa de binding") `server/src/lib/factory.ts` passou a montar os
> 5 mappers do salão via `buildSalonAccountingMappers()` — que interpreta `SALON_BINDING_V1`
> (`server/src/features/accountingBinding/fixtures/salonBinding.ts`) através do intérprete
> genérico (`InterpretedEventMapper` + `archetypeCatalog`), em vez de instanciar as 5 classes
> `Salon*Mapper.ts` escritas à mão. O golden test (`__tests__/archetypes` / Corpo D) prova que o
> intérprete produz `PostEntryInput` byte-idêntico aos mappers antigos — **mas só EM TESTE**,
> contra fixtures em memória. Ninguém exercitou o intérprete novo com o app de pé: os passos 1–5
> abaixo (preparados em 2026-08-17, antes do swap) passam pelas telas de contabilidade mas **não
> fecham nenhuma venda de salão** — nenhum deles bate no caminho de runtime que mudou em
> `04582d8a`. Os passos 6–11 abaixo emendam essa lacuna, evento a evento, clicando na tela do
> salão (não no painel de contabilidade) e conferindo o lançamento resultante na aba de
> contabilidade. O passo 11 é o carimbo crítico do swap e por isso fica por último, depois da
> releitura geral do passo 5.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17); a autorização de execução vive no campo `autorizacao` de
[`docs/plano/gates/H2.md`](../plano/gates/H2.md) *(emenda 05/10 — dono em chat, 05/10: *"Pode emendar os 4"*; antes: fila §5.1 Bloco A item 4 do master map, já sem arquivo)*.
Rastreio a atualizar no fim: nota [`docs/plano/gates/H2.md`](../plano/gates/H2.md).
Pré-condições (verificar antes de começar):
- **[EMENDA 2026-09-24 — SEED-MY] Alvo = seed multi-exercício (`db:seed:accounting`).** O `dev.db` é
  seed de testes (decisão do dono 12/09). Depois do `npm run db:backup`, rode
  `cd server && SEED_ACCOUNTING_PASSWORD=<senha> npm run db:seed:accounting -- --years 2025,2026 --i-have-a-backup`:
  cria os tenants `seed-presumido`/`seed-real` (uma unidade por tenant, de **nome** `seed-unit-presumido` / `seed-unit-real` — na tela, escolha essa unidade; o `unitId` é o **id gerado**, impresso pelo seed) com o salão instalado e o chart completo (19 contas,
  `1.1.6/3.3/4.2` inclusas), 2025 encerrado + `HARD_CLOSED`, 2026 `OPEN` até o mês corrente, AP/AR e
  `FiscalProfile` por regime; sai 1 se o tie-out não fechar. Em seguida rode o
  `activate-salon-binding.mjs` impresso pelo comando para cada tenant (o seed não ativa binding). Com isso o
  P0.2b (completar chart + abrir mês) fica coberto para esses tenants. A 2ª passada (Lucro Real) usa
  `seed-real`. Um `dev.db` semeado antes do BE-INCR-SEED-UNIDADE-E-ENV precisa ser **re-semeado** depois do backup (e o
  `activate-salon-binding.mjs` rodado com o novo `unitId`) — ver a EMENDA 2026-10-03 do RUNBOOK-H1-PVA.
  **[EMENDA 2026-10-05 — dono em chat, 05/10: *"Pode emendar os 4"*]** A ordem válida é a da **EMENDA 2026-10-05 do RUNBOOK-H1-PVA** (P0 de boot, #527):
  `db:backup` → `prisma migrate deploy` (até `migrate status` = up to date) → **`npx prisma generate`** (sem ele o seed e o
  binding morrem com `TSError`) → `db:seed:accounting` → `activate-salon-binding.mjs` com o `unitId` novo. O
  `SEED_ACCOUNTING_PASSWORD` acima é **ignorado** para usuário que já existe (`ensureUser`): logue com a senha de hoje.
  O P0 é o mesmo do H1 — feito para o H1, não repita aqui.
- **[EMENDA 2026-08-27 — P0, BLOQUEIA O `npm start`; verificar ANTES de tudo]** Desde o PR #213
  (`cd853d2e`, 2026-08-25 — depois de este runbook ser escrito), `bootstrap()` em
  [server.ts:36](../../server/src/server.ts:36) **aguarda o alimentador de bindings antes do
  `app.listen()` e mata o processo com exit 1** se houver zero `AccountingBinding` `Active`
  (F-FEEDER-4/5). **Medido em 2026-08-27 sobre cópia do `dev.db` real: a tabela
  `accounting_bindings` NÃO EXISTE** — o banco tem 29 das 31 migrações, faltando
  `20260821090000_accounting_binding` e `20260825120000_rename_salon_to_sale_vocabulary`. Sem o P0
  abaixo, o passo 1 morre no boot e **nenhum passo deste runbook é executável**. Ordem obrigatória
  (ADR-INCR-BINDING-FEEDER §8: chart de contas → binding compilado → boot):
  1. **Smoke-migration-gate sobre cópia** — `node scripts/smoke-migration-gate.mjs` (o próprio
     script garante por md5, gate S1, que o original não é tocado). Só siga com PASS.
     *Nota de contexto (medida por consulta read-only sobre cópia do banco real em 2026-08-27 —
     **não** por uma rodada deste gate, que segue por executar):* `journal_entries` tem 15 linhas e **nenhuma** com
     sourceType `salon.*` (`IMPORT_JOURNAL_ENTRIES` ×9, `ACCOUNTING_OPENING_BALANCE_IMPORT` ×3,
     `manual` ×2, `reversal` ×1) e `stock_movements` está vazia ⇒ a metade de reescrita de dado da
     migração RN é **no-op** neste banco, e o gate S6 não reprova por backfill nesta rodada.
  2. **Backup do `dev.db` real + `prisma migrate deploy`** — aplica as 2 pendentes. Escreve em dado
     real: exige decisão do dono, não é passo de agente.
  3. **`node scripts/activate-salon-binding.mjs`** — a tabela nasce VAZIA, então migrar não basta;
     sem esta ativação o boot segue abortando. Compila `SALON_BINDING_V1` contra o chart real pelo
     compilador real (seed direto é proibido pelo ADR §7); é idempotente (2ª execução = no-op) e
     falha limpo se o chart ainda não existir.
  Confirmação de que o P0 fechou: `npm start` imprime `Luminaris Server running on ...` em vez de
  `Boot ABORTADO`. [ ]
- Build de produção dos DOIS lados, reiniciado do commit exato (servidor de dev longo serve
  código velho): `cd server && npm run build && npm start` · `cd my-app && npx next build && npx next start`.
- `dev.db` REAL em `server/prisma/prisma/dev.db`; login com a conta admin.
- Um arquivo **.ofx** e um **CNAB 240** de teste no disco do executor. Fonte pronta no repo: o
  bloco OFX de `server/src/lib/__tests__/ofx.test.ts` salvo como `extrato-teste.ofx` (o gate é o
  caminho de upload por clique, não o realismo do dado).
- Console do navegador ABERTO durante toda a sessão.
- **[EMENDA 2026-08-22]** Uma unidade/tenant de **Salão de Beleza** (`sectorKey: 'beautySalon'`,
  preset `server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts`) com dados que
  permitam fechar: venda só de serviço, venda com produto de estoque (para a CMV disparar via
  `InventoryService.recordSaleCogs`), pagamento em pelo menos 3 meios diferentes (Dinheiro/Pix e
  Cartão, para exercitar o resolvedor por sub-chave), devolução e venda de pacote. **Verificado
  nesta emenda: não existe seed para isso** — `server/prisma/seed.ts` e `server/seed-units.ts` não
  citam `salon`/`beautySalon` nenhuma vez. **Criar essa unidade e os dados (produto com estoque,
  pacote, cliente) pela própria UI (onboarding/interview → preset Salão de Beleza) faz parte dos
  passos 6–11 abaixo, não é pré-condição já satisfeita** — registrar como sub-passo do primeiro
  evento tocado.

## Passos

1. Passada final pelas abas do painel de contabilidade (AP, AR, Dimensões, Conciliação,
   Contrapartes, Aprovações, DRE/BP/DFC/Comparativo, Livro Diário, Compliance, Import/Export).
   Resultado esperado: telas renderizam, console sem erro.
   EVIDÊNCIA: [screenshots das abas-chave + print do console limpo ao final]

   > **Execução 2026-10-29.** Preenchida pelo agente sob comando do dono no chat (29/10: *"Autorizo executar os runbooks"*
   > e *"Segue pro H2"*). **P0:** é a re-semeadura do H1 e não foi repetida. A EVIDÊNCIA está no bloco "Tentativa 4 —
   > 2026-10-29" do P0 do [RUNBOOK-H1-PVA](RUNBOOK-H1-PVA.md) (PR #981): backup `dev-20261029-142253-pre-h1-t4.db`, 25
   > migrações, seed e binding idempotentes, build de produção de `455c1a45` (front `127.0.0.1:3100`, back `:3101`, `dev.db`
   > real). **Passo 1:** Puppeteer headless, login `seed-presumido`, unidade `seed-unit-presumido`, cada aba clicada com
   > 2,5 s de espera. Prints das 13 abas-chave em [`runbook-evidence/H2-2026-10-29/`](runbook-evidence/H2-2026-10-29/).
   > Saída literal:
   >
   > ```text
   > login seed-presumido · unidade cmuw4yqxg001jcii0iz2yb9rw · 29 abas
   >  1. Balancete · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   >  2. Períodos · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   >  3. Lançamentos · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   >  4. Aprovações · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-04-aprovacoes.png
   >  5. Contas a Pagar · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-05-contas-a-pagar.png
   >  6. Contas a Receber · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-06-contas-a-receber.png
   >  7. Aging · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   >  8. Fluxo de Caixa Projetado · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   >  9. Contrapartes · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-09-contrapartes.png
   > 10. Razão · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 11. Plano de Contas · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 12. BP · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-12-bp.png
   > 13. DRE · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-13-dre.png
   > 14. DFC · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-14-dfc.png
   > 15. Comparativo · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-15-comparativo.png
   > 16. Livro Diário · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-16-livro-diario.png
   > 17. Importação/Exportação · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-17-importacao-exportacao.png
   > 18. Conciliação · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-18-conciliacao.png
   > 19. NF-e · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 20. Compliance · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-20-compliance.png
   > 21. Dimensões · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum · passo1-21-dimensoes.png
   > 22. Imobilizado · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 23. Perfil fiscal · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 24. Parâmetros legais · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 25. Política contábil · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 26. Apuração · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 27. Pendências · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 28. Cobrança · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > 29. Kit de setor · console errors 0 · HTTP>=400 0 · texto de erro na tela: nenhum
   > ```
   >
   > DESFECHO: [dono]   ASSINATURA: [dono]

2. Na aba **Conciliação**, importar o extrato **clicando** no controle de upload e escolhendo o
   `.ofx` do disco (não colar, não fetch).
   Resultado esperado: extrato listado com linhas; auto-match roda.
   EVIDÊNCIA: [screenshot do extrato importado + nome do arquivo no diálogo]

3. Repetir o passo 2 com o arquivo **CNAB 240**.
   Resultado esperado: idem.
   EVIDÊNCIA: [screenshot]

   > **Execução 2026-10-29 — passos 2 e 3.** O **dono** fez os dois uploads por clique, no painel do navegador embutido
   > (build de produção, `127.0.0.1:3100`, login `seed-presumido`). O agente preparou a tela (Conciliação → Extratos, conta
   > `1.1.1.01 — Banco`, formato "Detectar pelo conteúdo", período 27/10/2026–28/10/2026, referência `H2 OFX`), gerou os
   > arquivos de teste no formato dos fixtures de `ofx.test.ts`/`cnab.test.ts`, clicou em "Auto-conciliar" e conferiu no
   > `dev.db`. Print: [`passo2-3-conciliacao-extratos.jpg`](runbook-evidence/H2-2026-10-29/passo2-3-conciliacao-extratos.jpg).
   > Saída literal:
   >
   > ```text
   > arquivos (C:\Users\smurf\Downloads\H2-BROWSER\)
   >   extrato-teste.ofx · 629 bytes · sha256 9ebfafec5ac21699e631c5fe5b36facc98f8594d1be265695a4f032fb61c7111
   >   extrato-teste-cnab240.ret · 726 bytes · sha256 ade0f16f228cdaf1747325772601a47eb47881a714abec6ef57959b4eb9c88b1
   > tela, depois do 2º upload:  "Extrato importado: 2 linha(s)."
   > tela, Auto-conciliar (CNAB): "Auto-conciliação: 0 conciliada(s), 0 ambígua(s), 2 sem candidato (de 2)."
   > tela, Auto-conciliar (OFX):  "Auto-conciliação: 0 conciliada(s), 0 ambígua(s), 3 sem candidato (de 3)."
   > console do painel (só erros): No console logs.
   > dev.db (bank_statements / bank_statement_lines, unidade cmuw4yqxg001jcii0iz2yb9rw)
   > extrato cmvtx4jbo000fci9czmbowfx0 | ref H2 OFX | conta 1.1.1.01 | periodo 2026-10-27..2026-10-28 | sha256 9ebfafec5ac21699e631c5fe5b36facc98f8594d1be265695a4f032fb61c7111 | criado 2026-10-29T19:10:20.628Z | anexo -
   >    1 | 2026-10-27T00:00:00.000Z | 35000 | PIX RECEBIDO CLIENTE TESTE | H2-OFX-1 | UNMATCHED
   >    2 | 2026-10-27T00:00:00.000Z | -12050 | TARIFA BANCARIA | H2-OFX-2 | UNMATCHED
   >    3 | 2026-10-28T00:00:00.000Z | 8990 | DEPOSITO | H2-OFX-3 | UNMATCHED
   > extrato cmvtx4li6000kci9cw27p8bn8 | ref H2 OFX | conta 1.1.1.01 | periodo 2026-10-27..2026-10-28 | sha256 ade0f16f228cdaf1747325772601a47eb47881a714abec6ef57959b4eb9c88b1 | criado 2026-10-29T19:10:23.454Z | anexo -
   >    1 | 2026-10-27T00:00:00.000Z | 45000 | TED RECEBIDA TESTE | H2-CNAB-1 | UNMATCHED
   >    2 | 2026-10-28T00:00:00.000Z | -7890 | PAGTO FORNECEDOR TESTE | H2-CNAB-2 | UNMATCHED
   > ```
   >
   > Leitura do agente: o sha256 de cada extrato é igual ao do arquivo, e as datas e os valores são os do arquivo (o dia
   > escrito, sem recuo UTC). Os desvios do roteiro ficam escritos aqui. (1) O CNAB entrou com a referência `H2 OFX`, porque o
   > campo não foi trocado entre os dois uploads. (2) Os dois uploads ficaram a 2,8 s um do outro, e o agente não viu o
   > diálogo de arquivo; o "por clique" é a palavra do dono ("upei os 2"), não um artefato. (3) Nenhuma linha casou: são
   > linhas sintéticas, sem lançamento correspondente.
   >
   > DESFECHO: [dono]   ASSINATURA: [dono]

4. Em **Recibos**, gerar o PDF de um recibo (caminho puppeteer) e ABRIR o arquivo baixado.
   Resultado esperado: PDF válido, com os dados do recibo.
   EVIDÊNCIA: [o PDF anexado ou screenshot dele aberto]

   > **Execução 2026-10-29.** Feita pelo agente sob comando do dono. O recibo fica na aba **Lançamentos** (botão "Recibo
   > (PDF)" de cada linha; não existe aba "Recibos"). Pela tela, no painel, o clique no lançamento `2026/0170` fez o GET
   > responder 200, sem erro no console. O destino do download do painel não ficou visível ao agente, então o mesmo endpoint
   > foi chamado pela API para salvar e abrir o arquivo (`pypdf`). Saída literal:
   >
   > ```text
   > painel: GET http://127.0.0.1:3101/api/accounting/journal-entries/cmuw4z7v302cmcii0fxxn95uz/receipt?unitId=REDACTED → 200 OK · console: No console logs.
   > API:    GET /accounting/journal-entries/cmuw4z7v302cmcii0fxxn95uz/receipt → HTTP 200 · application/pdf · attachment; filename="comprovante-lancamento-2026-170.pdf"
   >         58531 bytes · cabeçalho %PDF- · sha256 283c363dd955fb1a5fd0aebc36ee7178edc434e87db3d75e511ab656ef1b1896
   > PDF aberto: 1 pagina(s)
   >   Comprovante de Lançamento Contábil
   >   Lançamento nº 170/2026 – Posted
   >   Data 06/10/2026
   >   Histórico Contas a receber – Cliente Seed (Fatura SEED-AR-2026-10-2)
   >   Origem ar.receivable – ref. cmuw4z7ua02ckcii08hbl4pcn
   >   CONTA DESCRIÇÃO DÉBITO CRÉDITO
   >   1.1.2.03 Clientes a Receber R$ 2.568,00
   >   3.1 Receita de Serviços R$ 2.568,00
   >   Totais R$ 2.568,00 R$ 2.568,00
   >   Documento gerado eletronicamente em 29/10/2026.
   > ```
   >
   > **Arquivo baixado pela tela** (o dono localizou o download do painel e colou no chat):
   >
   > ```text
   > C:\Users\smurf\Downloads\recibo-cmuw4z7v302cmcii0fxxn95uz.pdf · 58531 bytes · 29/10/2026 16:15:40
   > sha256 da83ee4fda5b1dc248562bc5737be458315bb957dcf5906e9b56bb4dd1a434eb · 1 pagina(s)
   > texto: igual ao da cópia da API acima, linha a linha (nº 170/2026, 06/10/2026, 1.1.2.03 D / 3.1 C, R$ 2.568,00)
   > ```
   >
   > Os dois arquivos têm o mesmo tamanho e o mesmo texto, mas sha256 diferentes. Leitura inferida: cada geração grava data
   > e ID internos próprios no PDF.
   >
   > Achado para o passo 5 (rótulo, não foi corrigido): o recibo, que está em PT, mostra o status em inglês ("Posted").
   >
   > DESFECHO: [dono]   ASSINATURA: [dono]

5. Releitura crítica ("carimbo"): algo em qualquer tela está errado para uso real (rótulo,
   número, fluxo)? Se sim, registrar em Achados — não corrigir nada nesta sessão.
   Resultado esperado: veredicto consciente do executor.
   EVIDÊNCIA: [uma frase por tela inspecionada OU "sem ressalvas"]

   > **Execução 2026-10-29.** Releitura do **dono**, no chat, depois de ver as telas dos passos 1–4 no painel. Texto literal:
   >
   > ```text
   > Loguei, sem ressalvas
   > ```
   >
   > O achado do passo 4 continua registrado (o recibo em PT mostra o status "Posted" em inglês). É um rótulo e não foi
   > corrigido nesta sessão. O dono decide se ele vira ressalva no desfecho.
   >
   > DESFECHO: [dono]   ASSINATURA: [dono]

---

### [EMENDA 2026-08-22] Passos 6–11 — fluxo de salão pós-swap (intérprete `SALON_BINDING_V1`, `04582d8a`/PR #211)

> Cada passo abaixo é uma ação na **tela do salão** (não no painel de contabilidade); o resultado
> se confere DEPOIS, na aba **Livro Diário**/lançamento do painel de contabilidade. Se a unidade de
> salão (pré-condição acima) ainda não existir, criá-la é parte do passo 6.

> **[EMENDA 2026-09-02]** (kit de preflight H2, `docs/accounting/KITS-PREFLIGHT-2026-09-02.md`):
> o vocabulário de evento abaixo (`salon.sale.*`, `salon.package.sold`) é PRÉ-rename — o código usa
> `sale.*`/`sale.package.sold` desde o PR #222 (`docs/adr/ADR-RN-salon-to-sale-rename.md`,
> confirmado em `server/src/features/accounting/sync/AccountingSyncPort.ts` e nos mappers
> `Sale*Mapper.ts`). Cada ocorrência abaixo ganha a forma atual entre parênteses. O resultado
> esperado de cada passo (contas D/C) NÃO muda — é só o nome do evento que trocou.

> **[EMENDA 2026-10-05 — dono em chat, 05/10: *"Pode emendar os 4"*] "Finalizar Venda" do modal Nova Venda quebrado — feche a venda em 2 cliques.** Na `main`
> de 05/10 o modal Nova Venda cria a venda já `Finalized` e só depois os itens, que `assertParentSaleNotFinalized` recusa
> (`FinanceService.createSaleWithItems` + `useSalesCreateForm.ts:270`; F11 do `PACOTE-VALIDADE-PENDENCIAS-brief.md`; o fix está
> em sessão própria). Até ele entrar: no modal Nova Venda, **Salvar Rascunho**; depois, na lista de vendas ou no detalhe, **Finalizar**
> (`PUT` com `status: 'Finalized'`, `SalesTable.tsx:240` / `SaleDetailPanel.tsx:116`). No Network aparece o `POST` da venda
> (`Draft`), os `POST` dos itens e o `PUT` de finalização — o evento de finalização deve sair deste `PUT` (inferido pelo agente; o lançamento no razão é a prova). Se o "Finalizar Venda" do
> modal Nova Venda for clicado por engano, a venda órfã (finalizada, sem itens) é **achado**, não falha deste passo: anote e siga.
> Quando o fix do modal Nova Venda estiver em `main`, esta emenda cai e vale o texto original.

6. Na tela do salão, criar (se preciso) a unidade Salão de Beleza e fechar uma **venda só de
   serviço** (sem item de produto/estoque) — evento `salon.sale.finalized` (hoje: `sale.finalized`, PR #222).
   Resultado esperado: no Livro Diário, lançamento novo com D **1.1.2 A Receber** = valor da venda
   e C **3.1 Receita de Serviços** = mesmo valor. **Caso de borda:** a linha de C **3.3 Receita de
   Revenda NÃO deve aparecer** (base do split é zero para venda sem produto — `revenueSplit.ts`,
   `receita-revenda` é `optional: true` no arquétipo).
   EVIDÊNCIA: [print da tela de fechamento da venda + print do lançamento no Livro Diário/aba
   Lançamento mostrando as 2 linhas (e a ausência da 3ª)]

7. Vender um **pacote pré-pago** — evento `salon.package.sold` (hoje: `sale.package.sold`, PR #222).
   Resultado esperado: lançamento com D **1.1.2 A Receber** = valor do pacote e C **2.1.1 Pacotes
   Pré-pagos** (passivo, não receita — a venda do pacote NÃO reconhece receita agora, só cria
   passivo diferido).
   EVIDÊNCIA: [print da tela de venda de pacote + print do lançamento]

8. Fechar uma **venda com item de produto de estoque** — evento `salon.sale.finalized`
   (hoje: `sale.finalized`, PR #222) (com
   `revenueByNature` não-zero) seguido do evento automático `salon.sale.cogs`
   (hoje: `sale.cogs`, PR #222) (disparado pelo
   `InventoryService.recordSaleCogs` na baixa de estoque, mesma tela).
   Resultado esperado: DOIS lançamentos. (a) finalized: D 1.1.2 A Receber = total; C 3.1 Receita de
   Serviços + C **3.3 Receita de Revenda** (agora presente, valor = parte de produto do split). (b)
   cogs: D **4.2 CMV** = custo do produto (em centavos, sem arredondamento de reais) e C **1.1.6
   Estoques** = mesmo valor — confira que o valor da CMV bate com o custo cadastrado do produto,
   não com o preço de venda.
   EVIDÊNCIA: [print da tela + prints dos DOIS lançamentos no Livro Diário]

9. Fazer a **devolução** de uma das vendas acima — evento `salon.sale.returned` (hoje: `sale.returned`, PR #222).
   Resultado esperado: lançamento NOVO e separado (não é estorno/`reversedById` do lançamento
   original — o original de `salon.sale.finalized` (hoje: `sale.finalized`, PR #222) continua `Posted`, intocado) com D **3.2
   Devoluções de Vendas** (contra-receita) e C **1.1.2 A Receber**.
   EVIDÊNCIA: [print da devolução na tela + print do lançamento novo + confirmação de que o
   lançamento original da venda continua com status Posted, não alterado]

10. Registrar **pagamento** (liquidação) para pelo menos 3 vendas em aberto, uma por meio de
    pagamento diferente: **Dinheiro**, **Pix ou Cartão**, e (se houver saldo de pacote disponível)
    **Package Balance** — evento `salon.sale.settled` (hoje: `sale.settled`, PR #222). Este é o passo mais frágil do intérprete: a
    conta de débito é resolvida por SUB-CHAVE (`paymentMethod`), não por uma conta fixa.
    Resultado esperado, um lançamento por meio: C **1.1.2 A Receber** sempre; D varia por método —
    Dinheiro → **1.1.3 Caixa**; Pix → **1.1.1 Banco**; Cartão (Débito/Crédito) → **1.1.4 A Receber
    Cartão/Adquirente**; **Package Balance → 2.1.1 Pacotes Pré-pagos, NUNCA uma conta de
    caixa/banco** (guard `packageBalanceNeverCash`) — confira este último com atenção, é o caso que
    mais quebra se o mapeamento por sub-chave regredir.
    EVIDÊNCIA: [print de cada liquidação na tela + print do lançamento correspondente no Livro
    Diário, um par tela/lançamento por meio de pagamento testado]

11. Reconciliação final: revisar o console do navegador acumulado desde o passo 6 (nenhum erro) e
    conferir que os pares débito/conta de cada lançamento gerado nos passos 6–10 batem
    linha-a-linha com o que o golden test do intérprete afirma — rodar localmente
    `cd server && npx jest src/features/accountingBinding/__tests__/goldenPhase1.test.ts` (o par
    `goldenPhase0.test.ts` é o corpus congelado; `goldenPhase1.test.ts` é quem compara
    `InterpretedEventMapper` byte a byte contra os 5 mappers à mão, os mesmos 17 casos) e colar a
    saída.
    Resultado esperado: console limpo E o `goldenPhase1.test.ts` verde (paridade byte-idêntica
    confirmada).
    EVIDÊNCIA: [print do console final (sem erros) + saída do comando jest acima (verde) +
    confirmação linha-a-linha dos lançamentos dos passos 6–10, ou divergência registrada em
    Achados]

> **Execução 2026-10-29 — passos 6 a 11.** Feita pelo agente sob comando do dono no chat (29/10: *"Autorizo executar os
> runbooks"*). O dono logou `seed-presumido` no painel do navegador embutido, e o agente clicou cada ação na tela de vendas
> (Financeiro → Vendas, build de produção de `455c1a45`, `127.0.0.1:3100`, unidade `seed-unit-presumido` =
> `cmuw4yqxg001jcii0iz2yb9rw`, binding `beautySalon` v2 `Active`). Cada venda seguiu a EMENDA 2026-10-05: **Salvar
> Rascunho** no modal Nova Venda e depois **Finalizar** → "Confirmar finalização" na lista. O razão foi lido no `dev.db` real,
> só leitura, depois de cada ação.
>
> **Preparação (não é evidência de passo).** Backup `server/prisma/prisma/dev-20261029-pre-h2-p6.db` (9.895.936 bytes,
> sha256 `e23f4060d526715f7ac396f4b06191fb253ceadd5406b6f865fdce16a9198f99`, `integrity_check` ok), feito pela cópia online do
> SQLite antes do passo 6. A unidade estava sem catálogo (0 serviços, produtos, pacotes, clientes e vendas), então o catálogo
> H2 foi criado pela API do build com o login do seed:
>
> ```text
> POST customers → HTTP 201 | id cmvtxuu6b000pci9c3yk4b6n2 | {"name":"Cliente H2","email":"cliente.h2@example.com","mainUnitId":"cmuw4yqxg001jcii0iz2yb9rw"}
> POST services → HTTP 201 | id cmvtxuu71000tci9chpnj578o | {"name":"Corte H2","category":"Cabelo","price":80,"duration":30,"isActive":true}
> POST products → HTTP 201 | id cmvtxuu7l000xci9crbmlvkqu | {"name":"Shampoo H2","usageType":"Sale","sku":"H2-SHAMPOO"}
> POST packages → HTTP 201 | id cmvtxuu8f0015ci9c87vo9g6f | {"name":"Pacote H2","price":300,"validityDays":365,"active":true}
> ```
>
> O estoque com custo entrou **pela tela**, em Contas a Pagar → Nova Conta → "Compra de estoque", com Shampoo H2, 10 un.,
> R$ 200,00 e NF H2-NF-1. Resultado: título `OPEN` de 20000 centavos, `inventory_items` com qtd 10 e valor 20000 (custo de
> R$ 20,00/un.), `productUnits.stock` 10 e o lançamento 2026/0171 (abaixo).
>
> **Vendas na tela** (lista de vendas, saída literal do `dev.db`):
>
> ```text
> cmvtxzxnq001uci9chnle6uoe 2026-10-29 Returned Pending Pix 80               ← passo 6 (só serviço) e passo 9 (devolução)
> cmvty32ke002gci9c3ly0x5sj 2026-10-29 Finalized Paid Cash 300              ← passo 7 (pacote) e passo 10 (Dinheiro)
> cmvty55ma0035ci9ciymrduie 2026-10-29 Finalized Paid Pix 50                ← passo 8 (produto) e passo 10 (Pix)
> cmvtya7g00057ci9cidoityjv 2026-10-29 Finalized Paid Package Balance 80    ← passo 10 (saldo de pacote)
> ```
>
> **Razão** (`journal_entries` + `postings`, só leitura, todos os lançamentos criados na sessão; valores em centavos; o "date" é
> o dia escrito 29/10/2026, gravado como 00:00 UTC, e a tela mostra 29/10/2026):
>
> ```text
> lançamento 2026/0171 | ap.payable cmvtxwdiz0019ci9ckprvb3ze | Posted | binding vNone | criado 2026-10-29T19:31:59.518Z
>    D 1.1.3.01 Estoques | 20000                     C 2.1.2.01 Fornecedores a Pagar | 20000
> lançamento 2026/0172 | sale.finalized cmvtxzxnq001uci9chnle6uoe | Posted | reversedBy - | binding v2 | criado 2026-10-29T19:35:24.832Z
>    D 1.1.2.01 A Receber | 8000                     C 3.1 Receita de Serviços | 8000
> lançamento 2026/0173 | sale.package.sold cmvty32ke002gci9c3ly0x5sj | Posted | binding v2 | criado 2026-10-29T19:37:29.775Z
>    D 1.1.2.01 A Receber | 30000                    C 2.1.1.01 Pacotes Pré-pagos | 30000
> lançamento 2026/0174 | sale.finalized cmvty55ma0035ci9ciymrduie | Posted | binding v2 | criado 2026-10-29T19:39:05.938Z
>    D 1.1.2.01 A Receber | 5000                     C 3.3 Receita de Revenda de Mercadorias | 5000
> lançamento 2026/0175 | sale.cogs cmvty55ma0035ci9ciymrduie | Posted | binding v2 | criado 2026-10-29T19:39:05.972Z
>    D 4.2 Custo das Mercadorias Vendidas | 2000     C 1.1.3.01 Estoques | 2000
> lançamento 2026/0176 | sale.returned cmvtxzxnq001uci9chnle6uoe | Posted | reversedBy - | binding v2 | criado 2026-10-29T19:39:49.583Z
>    D 3.2 Devoluções de Vendas | 8000               C 1.1.2.01 A Receber | 8000
> lançamento 2026/0177 | sale.settled cmvty55ma0035ci9ciymrduie (Pix) | Posted | binding v2 | criado 2026-10-29T19:40:54.499Z
>    D 1.1.1.01 Banco | 5000                         C 1.1.2.01 A Receber | 5000
> lançamento 2026/0178 | sale.settled cmvty32ke002gci9c3ly0x5sj (Dinheiro) | Posted | binding v2 | criado 2026-10-29T19:41:23.995Z
>    D 1.1.1.02 Caixa | 30000                        C 1.1.2.01 A Receber | 30000
> lançamento 2026/0179 | sale.finalized cmvtya7g00057ci9cidoityjv | Posted | binding v2 | criado 2026-10-29T19:43:09.925Z
>    D 1.1.2.01 A Receber | 8000                     C 3.1 Receita de Serviços | 8000
> lançamento 2026/0180 | sale.settled cmvtya7g00057ci9cidoityjv (Saldo de pacote) | Posted | binding v2 | criado 2026-10-29T19:43:56.780Z
>    D 2.1.1.01 Pacotes Pré-pagos | 8000             C 1.1.2.01 A Receber | 8000
> ```
>
> Leitura linha a linha (o agente compara com o roteiro e com o binding v2; os códigos do binding v2 são subcontas, ex.:
> 1.1.2 → 1.1.2.01, 1.1.3 Caixa → 1.1.1.02, 1.1.6 Estoques → 1.1.3.01):
>
> - **Passo 6** (só serviço, R$ 80): 2026/0172 tem D 1.1.2.01 e C 3.1, de 8000 cada, e **nenhuma linha 3.3**. Prints:
>   [`passo6-01-nova-venda-servico.jpg`](runbook-evidence/H2-2026-10-29/passo6-01-nova-venda-servico.jpg),
>   [`passo6-02-venda-finalizada.jpg`](runbook-evidence/H2-2026-10-29/passo6-02-venda-finalizada.jpg).
> - **Passo 7** (pacote, R$ 300): 2026/0173 tem D 1.1.2.01 e C 2.1.1.01 (passivo), de 30000 cada, sem receita.
>   `customer_package_balances` = 30000, com vencimento em 29/10/2027 (aceite da validade marcado na tela,
>   `POST /api/package-acceptances` → 201). Print: [`passo7-01-nova-venda-pacote.jpg`](runbook-evidence/H2-2026-10-29/passo7-01-nova-venda-pacote.jpg).
> - **Passo 8** (produto, R$ 50, custo R$ 20): foram **dois** lançamentos. 2026/0174 tem D 1.1.2.01 e C 3.3, de 5000. 2026/0175
>   é a CMV, D 4.2 e C 1.1.3.01, de **2000 = custo cadastrado** (não o preço de 5000). O estoque foi de 10/20000 para 9/18000, com
>   `stock_movements` COGS −1/−2000. Print: [`passo8-01-nova-venda-produto.jpg`](runbook-evidence/H2-2026-10-29/passo8-01-nova-venda-produto.jpg),
>   [`passo7-8-vendas-finalizadas.jpg`](runbook-evidence/H2-2026-10-29/passo7-8-vendas-finalizadas.jpg).
>   **Desvio do roteiro:** a venda não teve serviço junto, então não houve C 3.1 + C 3.3 no mesmo lançamento. O modal Nova
>   Venda tem um tipo só por venda (Produtos | Serviços | Pacotes; `useSalesCreateForm.ts:177` define o `type` do item pela
>   variante — verificado no código). A venda mista não sai desta tela, e o split misto fica coberto só pelo golden test
>   ("finalized: split misto 100/100").
> - **Passo 9** (devolução da venda do passo 6): 2026/0176 é **novo** (`sale.returned`), com D 3.2 e C 1.1.2.01 de 8000. O original
>   2026/0172 continua `('Posted', reversedById None, version 1, updatedAt 1793302524832)`, e esse `updatedAt` é igual ao
>   instante de criação (19:35:24.832Z). Print: [`passo9-01-devolucao.jpg`](runbook-evidence/H2-2026-10-29/passo9-01-devolucao.jpg).
> - **Passo 10** (três meios, pelo botão "Pagar" → "Registrar pagamento"): Pix → 2026/0177 com D 1.1.1.01 Banco. Dinheiro →
>   2026/0178 com D 1.1.1.02 Caixa. **Saldo de pacote → 2026/0180 com D 2.1.1.01 Pacotes Pré-pagos, sem conta de caixa ou banco.**
>   O saldo foi de 30000 para 22000 (`package_balance_movements` debit 8000, venda `cmvtya7g…`). Cartão não foi testado; o roteiro
>   pede "Pix ou Cartão". Prints: [`passo10-01-pagamento-pix.jpg`](runbook-evidence/H2-2026-10-29/passo10-01-pagamento-pix.jpg),
>   [`passo10-02-pagamento-dinheiro.jpg`](runbook-evidence/H2-2026-10-29/passo10-02-pagamento-dinheiro.jpg),
>   [`passo10-03-pagamento-saldo-pacote.jpg`](runbook-evidence/H2-2026-10-29/passo10-03-pagamento-saldo-pacote.jpg),
>   [`passo10-04-lancamento-0180-saldo-pacote.jpg`](runbook-evidence/H2-2026-10-29/passo10-04-lancamento-0180-saldo-pacote.jpg).
> - **Passo 11:** a aba Lançamentos mostra 2026/0171–0180, todos "Postado", com data 29/10/2026
>   ([`passo11-01-lancamentos-0171-0180.jpg`](runbook-evidence/H2-2026-10-29/passo11-01-lancamentos-0171-0180.jpg)).
>   **Console:** `read_console_messages` (só erros) devolve **1** entrada, `Failed to load resource: the server responded with
>   a status of 400 (Bad Request)`, e ela já estava lá antes do primeiro clique do passo 6. Nenhuma requisição desta página
>   respondeu ≥400 (`performance` e o Network do painel, últimas 50). A origem do 400 não foi identificada, e o console **não**
>   está limpo. Golden test no worktree (`81c0f409`; `git diff 455c1a45..HEAD -- server/src/features/accountingBinding
>   server/src/features/accounting/sync` vazio, logo o mesmo código do intérprete do build). Saída literal:
>
> ```text
> $ cd server && npx jest src/features/accountingBinding/__tests__/goldenPhase1.test.ts
> PASS unit src/features/accountingBinding/__tests__/goldenPhase1.test.ts
>   golden Fase 1 — mapper-à-mão vs. InterpretedEventMapper+binding-do-salão (pós-P1, pré-swap)
>     √ finalized: sem breakdown — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte) (2 ms)
>     √ finalized: split misto 100/100 — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ finalized: rateio de desconto de header (180 sobre itens 100+100) — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ finalized: resíduo de arredondamento 1:2 sobre 10001¢ — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ finalized: só-serviço (sem linha 3.3 zerada) — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ finalized: só-produto (sem linha 3.1 zerada) — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte) (1 ms)
>     √ finalized: idempotência preservada sob split — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ finalized: arredondamento round-half-up no limite (0,005) — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ settled: Cash — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ settled: Pix — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte) (1 ms)
>     √ settled: Debit Card — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ settled: Credit Card — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ settled: Package Balance — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ returned: base — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ packageSold: base — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ cogs: base — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ cogs: fronteira MAX_CENTS — intérprete produz EXATAMENTE o que o mapper-à-mão produz (byte a byte)
>     √ cobre exatamente os mesmos 17 casos de goldenPhase0.test.ts (nenhum a mais/a menos sem revisão)
> Test Suites: 1 passed, 1 total
> Tests:       18 passed, 18 total
> [exited with code 0]
> ```
>
> **Achados da tela** (rótulo e fluxo, não corrigidos):
> - (A) Na lista de vendas, a venda **Devolvida** ainda mostra o botão "Finalizar" (verificado no DOM, linha "Devolvida
>   Pendente R$ 80,00"). O agente não clicou nele, e não se sabe o efeito.
> - (B) No "Registrar pagamento" com Saldo de pacote, a opção do pacote mostra "Pacote cmvtxuu8 — saldo R$ 300,00 …", um pedaço
>   do ID, em vez do nome "Pacote H2".
> - (C) A dica do modal de compra de estoque diz "Debita 1.1.6 Estoques", mas o lançamento real debita **1.1.3.01** Estoques
>   (plano do binding v2).
> - (D) O preço do serviço não vem do catálogo ao escolher o serviço; ele é digitado (`SaleItemsManager.tsx:198`, por desenho
>   do código). O campo de preço lê "8000" como R$ 8.000,00: quem digita em centavos erra por 100×.
> - (E) O botão "Próximo" do modal Nova Venda vira "Salvar Rascunho" no mesmo lugar, e um clique duplo grava o rascunho.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

> **Passos 6–10 refeitos sobre o #985 (agente, 30/10/2026 03:01–03:08 UTC, sob comando do dono no chat: "Sim, manda pra
> ela", repassado pela sessão-mãe; RUNBOOK-FORMAT §Fronteira).** O PR #985 (commits `10a8ebd7` teste-guarda e `81b8ca63`
> correção) corrige os achados A–D. Ambiente: build de produção da `origin/main` `c8b7c83551a665d29d3ca855d6f22a4a5fb340a4`
> (worktree separado, sem tocar o branch deste PR), back `:3101` e front `127.0.0.1:3100`, o mesmo `server/.env` e o dev.db
> real. Antes de subir: backup `server/prisma/prisma/dev.db.bak-h2-refazer-6-10-2026-10-29` (10.166.272 bytes, sha256
> `b430ee50ced2c74cbbd6fec042fa027a7c0ac412789bec0bfcfa6f2bb5be9bca`, API de backup do SQLite) e, com o ok do dono no chat
> ("Ok, migrate"), `npx prisma migrate deploy` aplicou as 2 migrações pendentes (`20261029130000_legal_parameters_retencoes_v3_inss`
> e `20261029150000_fix_chat_agente_r26_drop_structured_data`, `StructuredData` com 0 linhas). O dono logou `seed-presumido`
> no painel. Os passos rodaram depois das 03:00 UTC, fora da janela em que o dia BRT e o dia UTC divergem; as vendas são de
> 30/10/2026. Mesmo roteiro da execução de 29/10 (Salvar Rascunho → Finalizar → "Confirmar finalização"), com a mesma
> unidade, cliente e catálogo. Estado inicial lido no dev.db: último lançamento 2026/0180, Shampoo H2 9 un./18000,
> saldo de pacote 22000.
>
> Razão (`razao.py`, só leitura, lançamentos criados depois de 02:55 UTC; centavos; o `date` é o dia escrito 30/10, 00:00 UTC):
>
> ```text
> lançamento 2026/0181 | sale.finalized cmvudz55v0001ci38nrddtau5 | Posted | binding v2 | criado 2026-10-30T03:02:23.804Z
>    D 1.1.2.01 A Receber | 8000                     C 3.1 Receita de Serviços | 8000
> lançamento 2026/0182 | sale.package.sold cmvue0zpl000nci38s86twu4x | Posted | binding v2 | criado 2026-10-30T03:03:41.415Z
>    D 1.1.2.01 A Receber | 30000                    C 2.1.1.01 Pacotes Pré-pagos | 30000
> lançamento 2026/0183 | sale.finalized cmvue2rru001cci387qk76tpn | Posted | binding v2 | criado 2026-10-30T03:05:04.124Z
>    D 1.1.2.01 A Receber | 5000                     C 3.3 Receita de Revenda de Mercadorias | 5000
> lançamento 2026/0184 | sale.cogs cmvue2rru001cci387qk76tpn | Posted | binding v2 | criado 2026-10-30T03:05:04.158Z
>    D 4.2 Custo das Mercadorias Vendidas | 2000     C 1.1.3.01 Estoques | 2000
> lançamento 2026/0185 | sale.returned cmvudz55v0001ci38nrddtau5 | Posted | binding v2 | criado 2026-10-30T03:05:28.832Z
>    D 3.2 Devoluções de Vendas | 8000               C 1.1.2.01 A Receber | 8000
> lançamento 2026/0186 | sale.settled cmvue2rru001cci387qk76tpn (Pix) | Posted | binding v2 | criado 2026-10-30T03:06:05.569Z
>    D 1.1.1.01 Banco | 5000                         C 1.1.2.01 A Receber | 5000
> lançamento 2026/0187 | sale.settled cmvue0zpl000nci38s86twu4x (Dinheiro) | Posted | binding v2 | criado 2026-10-30T03:06:22.401Z
>    D 1.1.1.02 Caixa | 30000                        C 1.1.2.01 A Receber | 30000
> lançamento 2026/0188 | sale.finalized cmvue5lcy003eci38d00hecak | Posted | binding v2 | criado 2026-10-30T03:07:12.934Z
>    D 1.1.2.01 A Receber | 8000                     C 3.1 Receita de Serviços | 8000
> lançamento 2026/0189 | sale.settled cmvue5lcy003eci38d00hecak (Saldo de pacote) | Posted | binding v2 | criado 2026-10-30T03:07:45.442Z
>    D 2.1.1.01 Pacotes Pré-pagos | 8000             C 1.1.2.01 A Receber | 8000
> ```
>
> - **Passo 6** (só serviço): 2026/0181 tem D 1.1.2.01 e C 3.1, de 8000, sem linha 3.3. Print:
>   [`refazer-985-p6-01-servico-preco-do-catalogo.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p6-01-servico-preco-do-catalogo.jpg).
> - **Passo 7** (pacote): 2026/0182 tem D 1.1.2.01 e C 2.1.1.01, de 30000, sem receita. O modal mostrou "Válido até
>   30/10/2027", e o aceite foi marcado. Print: [`refazer-985-p7-01-pacote.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p7-01-pacote.jpg).
> - **Passo 8** (produto, R$ 50): 2026/0183 tem D 1.1.2.01 e C 3.3, de 5000. A CMV 2026/0184 tem D 4.2 e C 1.1.3.01, de **2000 =
>   custo** (não o preço). O estoque foi de 9/18000 para 8/16000. O produto não tem preço de venda no catálogo, então o campo
>   veio com R$ 0,00 e o agente digitou 50, como em 29/10. Print: [`refazer-985-p8-01-produto.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p8-01-produto.jpg).
>   Segue o desvio de 29/10: a venda mista não sai desta tela (um tipo por venda).
> - **Passo 9** (devolução da venda do passo 6): 2026/0185 é **novo** (`sale.returned`), com D 3.2 e C 1.1.2.01 de 8000. O original
>   2026/0181 continua `('Posted', reversedById None, version 1)`, com `updatedAt` = `createdAt` = 1793329343804. Print:
>   [`refazer-985-p9-01-devolucao-so-ver-detalhes.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p9-01-devolucao-so-ver-detalhes.jpg).
> - **Passo 10** ("Pagar" → "Registrar pagamento"): Pix → 2026/0186 com D 1.1.1.01 Banco. Dinheiro → 2026/0187 com D 1.1.1.02
>   Caixa. **Saldo de pacote → 2026/0189 com D 2.1.1.01, sem conta de caixa ou banco**, e `package_balance_movements` debit
>   8000 na venda `cmvue5lcy…`. Cartão não foi testado, como em 29/10. Print:
>   [`refazer-985-p10-01-saldo-pacote-nome.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p10-01-saldo-pacote-nome.jpg).
>
> **Achados A–D contra o #985** (cada um lido no DOM do build `c8b7c835`):
> - **(A) Confirmado corrigido.** As duas vendas Devolvidas (a de 29/10 e a nova de 30/10) mostram só "Ver Detalhes"; não há
>   "Finalizar". Prints: [`refazer-985-A-devolvida-sem-finalizar.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-A-devolvida-sem-finalizar.jpg),
>   [`refazer-985-p9-01-devolucao-so-ver-detalhes.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p9-01-devolucao-so-ver-detalhes.jpg).
> - **(B) Confirmado corrigido.** A opção do saldo diz "Pacote H2 — saldo R$ 520,00 — vence em 30/10/2027": é o nome, não o ID.
>   Print: [`refazer-985-p10-01-saldo-pacote-nome.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-p10-01-saldo-pacote-nome.jpg).
> - **(C) Confirmado corrigido.** O modal "Compra de estoque" diz "Debita 1.1.3.01 Estoques e valora o produto pelo custo
>   médio — o valor acima é o TOTAL da compra." O modal foi só aberto pelo deep link e fechado com Cancelar, sem registrar
>   nada. Print: [`refazer-985-C-dica-1.1.3.01.jpg`](runbook-evidence/H2-2026-10-29/refazer-985-C-dica-1.1.3.01.jpg).
> - **(D) Confirmado corrigido para o serviço.** Ao escolher "Corte H2", o preço veio R$ 80,00 do catálogo, sem digitação.
>   O produto continua vindo do `salePrice` (o Shampoo H2 não tem, daí R$ 0,00). Print do passo 6.
> - **(E) Continua aberto.** "Próximo" vira "Salvar Rascunho" no mesmo elemento (mesmo `ref` no DOM). Nesta execução o modal
>   mudou de altura ao trocar de aba, e o botão não ficou no mesmo pixel, mas o risco do clique duplo não foi testado.
> - **Console / 400.** O console das telas de venda se perdeu na navegação para a Contabilidade e não foi lido. Depois da
>   navegação, `read_console_messages` (só erros) voltou vazio. No log do servidor, a janela 02:55–03:09 UTC (login e passos
>   6–10) teve `{200: 324, 201: 9, 304: 91}` e **nenhuma** resposta ≥400. O 400 de origem não identificada de 29/10 não se
>   repetiu do lado do servidor, mas a causa segue sem identificação.
> - **Observação nova (não é achado de A–E):** a segunda compra do mesmo pacote pelo mesmo cliente não criou outro saldo. A
>   linha existente foi de 22000 para 52000 (antes da baixa do passo 10), e o vencimento **do saldo inteiro** foi de 29/10/2027 para
>   30/10/2027. Os R$ 220 antigos ganharam um dia de validade. Inferido pelo dado; não li o código que decide isso.
>
> DESFECHO: [dono]   ASSINATURA: [dono]

---

### [EMENDA 2026-09-28] Passos 12–14 — SPED pela tela (FE-FIX-SPED-ECD-SIGNERS + contrato gerado PR-1)

> Preparado por agente em 2026-09-28, **em branco** (A3 do `PLANO-PENDENCIAS-FE-DTO-2026-09-28.md`, F-A3 → a;
> item 19 do `PLANO-FE-CONTRACT-TYPES-2026-09-28.md` §6.4). Cobre a aba **Contabilidade → Compliance**
> depois do FE-FIX-SPED-ECD-SIGNERS (J930 sem `identQualif`, CRC/UF do CRC/e-mail/fone na linha) e do
> PR-1 do contrato gerado (o body dos três formulários passou a ser o tipo gerado do DTO). O H1 (PVA)
> herda o `.txt` do passo 12.
>
> Pré-condições: server e app no **commit do merge do PR-1** (ou posterior), **build de produção**
> (`npm run build && npm start` no my-app — a tela está atrás de `withAuth`); cópia do `dev.db` real
> (`server/prisma/prisma/dev.db`, `npm run db:backup` antes); unidade com mapeamento referencial "Pronto".

12. **ECD — signatários J930.** Compliance → Gerar SPED ECD. Preencher declarante, livro e **2
    signatários**: (a) contador, código `900`, CPF de 11 dígitos, CRC no formato `UF-NNNNNN/O-D`, UF do
    CRC, e-mail e fone, **não** responsável legal; (b) não-contador (ex.: `205`), responsável legal.
    Gerar.
    Resultado esperado: download do `.txt`; nenhum 400.
    EVIDÊNCIA: [status + corpo da resposta do `POST /api/accounting/sped/ecd/generate` (DevTools →
    Network) + a 1ª linha do `.txt` baixado (`|0000|…`)]

13. **ECD — recusa local.** Repetir o passo 12 apagando o CRC do contador.
    Resultado esperado: a tela recusa **antes** do envio, com a mensagem "O signatário contador (900)
    exige CPF de 11 dígitos, CRC, UF do CRC, e-mail e fone." e **nenhum** request no Network.
    EVIDÊNCIA: [print da mensagem + print do Network sem o POST]

14. **ECF (Presumido) e ECF Real pela tela.** Gerar a ECF (Lucro Presumido) e a ECF Real, cada uma
    com um contador `900` (CPF 11 + CRC) e um não-contador.
    Resultado esperado: download dos dois `.txt`; nenhum 400.
    EVIDÊNCIA: [status + corpo de `POST /api/accounting/sped/ecf/generate` e de
    `POST /api/accounting/sped/ecf/real/generate` + a 1ª linha de cada `.txt`]

> **EVIDÊNCIA dos passos 12–14 (agente, 29/10/2026, sob comando do dono no chat; RUNBOOK-FORMAT §Fronteira).**
> Ambiente: build de produção de `455c1a45` (back `:3101`, front `127.0.0.1:3100`), dev.db real
> `server/prisma/prisma/dev.db`, usuário `seed-presumido`, unidade `seed-unit-presumido`, exercício **2025** (`HARD_CLOSED`).
> O agente preencheu os formulários de Contabilidade → Compliance no painel do navegador embutido com os dados fictícios
> do H1 (CNPJ `08845676000198`, CPFs `23456789173`/`12345678062`, CRC `SP-123456/O-1`). Os códigos dos signatários foram
> escolhidos no combobox ("900 · Contador/Contabilista", "205 · Administrador", "203 · Diretor"). Status e corpo foram
> lidos no Network do painel.
>
> **Passo 12 — ECD:** `POST http://127.0.0.1:3101/api/accounting/sped/ecd/generate → 201 Created`. Corpo da resposta:
>
> ```text
> {"success":true,"data":{"id":"cmvtyocgj0066ci9c0phmim1f","direction":"EXPORT","kind":"EXPORT_SPED_ECD","status":"EXPORTED","fileName":"ecd_08845676000198_2025.txt","mimeType":"text/plain","sizeBytes":53513,"sha256":"7d23fc3820d688743791d9e9f2a5a7ec1346a1fc0d756634a13bee9f479fd880","totalRows":991,"validRows":0,"invalidRows":0,"committedRows":0,"createdAt":"2026-10-29T19:53:44.467Z","periodStart":"2025-01-01","periodEnd":"2025-12-31"},"perfilFiscal":{"aplicado":false,"sobrescritos":[]},"avisos":["perfil fiscal da empresa ausente para 2025: a geração usou só o corpo da requisição (F-XP-1 c)."]}
> ```
>
> O `.txt` caiu em `Downloads` e foi movido para `Downloads/H2-BROWSER/passo12-14/` (fora do repo). Conferência literal:
>
> ```text
> $ sha256sum ecd_08845676000198_2025.txt; head -1 …; grep "^|J930|" …; wc -l < …
> 7d23fc3820d688743791d9e9f2a5a7ec1346a1fc0d756634a13bee9f479fd880 *ecd_08845676000198_2025.txt
> |0000|LECD|01012025|31122025|CORP�REOS - SERVI�OS TERAP�UTICOS S.A.|08845676000198|SP||3550308|||0|0|0||0|0||N|N|0|0|1|
> |J930|CONTADOR FICTICIO DE TESTE|23456789173|Contador|900|SP-123456/O-1|contador.teste@example.com|1148583340|SP|||N|
> |J930|DIRETOR FICTICIO DE TESTE|12345678062|Administrador|205|||||||S|
> 991
> ```
>
> O sha256 do arquivo é igual ao da resposta. O `�` é o terminal UTF-8 lendo o `.txt` em Latin-1, que é a codificação do
> SPED. O J930 do contador tem CRC, UF, e-mail e fone, com `IND_RESP_LEGAL = N`. O do 205 tem `S`.
>
> **Passo 13 — recusa local:** com o CRC do contador apagado (DOM: `CRC=` vazio), "Gerar e baixar ECD" mostrou na tela
> "O signatário contador (900) exige CPF de 11 dígitos, CRC, UF do CRC, e-mail e fone.". Depois do clique, o Network
> filtrado em `sped/ecd` continuou com **um só** POST, o 201 do passo 12, e nenhum request novo. Print:
> [`passo13-01-recusa-local-crc.jpg`](runbook-evidence/H2-2026-10-29/passo13-01-recusa-local-crc.jpg).
>
> **Passo 14 — ECF Presumido:** `POST http://127.0.0.1:3101/api/accounting/sped/ecf/generate → 400 Bad Request`. Corpo:
>
> ```text
> {"code":"ECF_Y600_COMPLEMENTO_FALTANDO","message":"Y600: toda vigência de sócio em 2025 precisa de complemento em socios (qualif e valores); faltam os partnerId: cmvttnb71000cci9cinonvsp9.","details":{"partnerIds":["cmvttnb71000cci9cinonvsp9"]}}
> ```
>
> A tela mostra a mensagem inteira, mas não tem campo de sócios, então não há como completar o pedido por ela. O sócio é o
> `SOCIO TESTE H1`, criado pela API no H1 tentativa 4 (`partners`: `('cmvttnb71000cci9cinonvsp9', …, 'SOCIO TESTE H1',
> '11144477735', 'PF', 1, 10000, '2020-01-01', None, …)`, lido do dev.db em modo só-leitura). O código já registra a
> lacuna: `SpedEcfRealPanel.tsx:122` tem *"a tela ainda não coleta sócios — o servidor devolve 400 ECF_Y600_*; FE próprio
> pendente"*, e o `BE-INCR-ECF-Y600-brief.md:271` lista o **FE-INCR-ECF-Y600** como "vizinho, não planejado aqui". Print:
> [`passo14-01-ecf-presumido-400-y600.jpg`](runbook-evidence/H2-2026-10-29/passo14-01-ecf-presumido-400-y600.jpg).
>
> **Passo 14 — ECF Real** (mesmo tenant, `FORMA_TRIB = 1`, `FORMA_TRIB_PER = RRRR`):
> `POST http://127.0.0.1:3101/api/accounting/sped/ecf/real/generate → 400 Bad Request`. Corpo:
>
> ```text
> {"code":"VALIDATION_ERROR","message":"Feche a Parte B do e-Lalur/e-Lacs de T01/2025 (e dos trimestres seguintes) antes de gerar a ECF — o M500 e o E020 do exercício seguinte saem da materialização (Manual p.271)."}
> ```
>
> O tenant `seed-presumido` é de Lucro Presumido e não tem a Parte B de 2025 fechada. A ECF Real precisa do `seed-real`, que
> outro login abre. Mesmo nesse tenant, o painel do Real manda `socios: []` fixo (`SpedEcfRealPanel.tsx:123`), então um
> tenant com sócio cadastrado daria o mesmo 400 de Y600 (inferido pelo código, não executado). Print:
> [`passo14-02-ecf-real-400-parte-b.jpg`](runbook-evidence/H2-2026-10-29/passo14-02-ecf-real-400-parte-b.jpg).
>
> **Achado de tela (F):** nos dois painéis da ECF, a linha de signatário passa da largura do card e a página ganha rolagem
> horizontal (visível nos dois prints do passo 14).
>
> Leitura do agente: 12 e 13 conferem com o esperado. No 14, "nenhum 400" **não** se cumpriu nas duas ECFs.
> Desfecho escolhido pelo dono no chat (29/10, questionário): *"FALHOU no 14"*. O dono também pediu para refazer o 14 no
> `seed-real` antes de seguir.
>
> **Passo 14 refeito no `seed-real`** (o dono logou no painel; unidade `seed-unit-real`). Pelo dev.db, em modo só-leitura,
> o tenant tinha 0 sócios, 0 contas da Parte B e nenhum trimestre fechado. Pela tela (Compliance → e-Lalur → Fechamento do
> trimestre, ano 2025), o agente fechou T01→T04 confirmando o diálogo, e foram 4× `POST
> http://127.0.0.1:3101/api/lalur/parte-b/close → 200 OK`. A tela passou a mostrar os quatro "fechado 29/10/2026". No dev.db:
> `[(2025, 'T01', 1793304243209), (2025, 'T02', 1793304246022), (2025, 'T03', 1793304248855), (2025, 'T04', 1793304251672)]`.
> Depois, a ECF Real com os mesmos dados (203 + 900, `FORMA_TRIB_PER = RRRR`) deu
> `POST http://127.0.0.1:3101/api/accounting/sped/ecf/real/generate → 400 Bad Request`. Corpo:
>
> ```text
> {"code":"ECF_Y600_SEM_SOCIOS","message":"Y600: a ECF de 2025 exige ao menos um sócio, titular ou dirigente (Manual ECF L12 p. 56, OC para FORMA_TRIB 1 a 7) — cadastre os sócios em /accounting/partners ou informe dirigentes."}
> ```
>
> Print: [`passo14-03-ecf-real-seed-real-400-sem-socios.jpg`](runbook-evidence/H2-2026-10-29/passo14-03-ecf-real-seed-real-400-sem-socios.jpg).
> As duas metades se fecham. Sem sócio cadastrado, o servidor recusa (`ECF_Y600_SEM_SOCIOS`). Com sócio cadastrado, ele
> exige o complemento que a tela não coleta (`ECF_Y600_COMPLEMENTO_FALTANDO`, `seed-presumido`). **Nenhuma ECF de 2025 sai
> pela tela hoje.** Isso está verificado para o Real nos dois casos e para o Presumido no caso com sócio. O Presumido sem sócio
> foi inferido pela mesma regra Y600 do BRIEF (F-Y600-1 a, "Presumido e Real juntos") e não foi executado. A causa é a tela
> que falta (FE-INCR-ECF-Y600), não um bug do servidor.

Desfecho dos passos 12–14 (marcar UM):
[ ] PASSOU — 12, 13 e 14 com evidência conferindo com o esperado
[x] FALHOU — passo 14 divergiu; evidência colada acima; nenhum passo seguinte executado *(marcado pelo dono no chat, 29/10; assinatura abaixo continua do dono)*
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passos 12–14): ____________

### [EMENDA 2026-09-28] Passo 15 — telas contábeis com o body tipado (contrato gerado PR-2)

> Preparado por agente em 2026-09-28, **em branco** (`PLANO-FE-CONTRACT-TYPES-2026-09-28.md` §7). O PR-2
> trocou o body de escrita destas telas pelo tipo gerado do DTO; o fio deveria ser o mesmo de antes. Mesmas
> pré-condições dos passos 12–14 (commit do merge do PR-2 ou posterior, build de produção, cópia do `dev.db`).
> Em cada linha: executar a ação uma vez e colar status + corpo do request no Network.

15. Resultado esperado em todas: 2xx, sem 400 de `unrecognized_keys`/`invalid_type`.
    - a) Contas a Pagar: criar (braço despesa **e** braço estoque), pagar, cancelar pagamento, cancelar título.
      EVIDÊNCIA: [ ]
    - b) Contas a Receber: criar, receber, cancelar recebimento, cancelar título. EVIDÊNCIA: [ ]
    - c) e-Lalur: criar/editar/arquivar um ajuste; criar/editar/arquivar uma conta da Parte B. EVIDÊNCIA: [ ]
    - d) Aprovações: criar rascunho, editar, enviar, aprovar; outro rascunho rejeitado com motivo. EVIDÊNCIA: [ ]
    - e) Lançamentos: postar um lançamento com dimensão numa perna; estornar. EVIDÊNCIA: [ ]
    - f) Dimensões: criar eixo e valor; arquivar valor e eixo. EVIDÊNCIA: [ ]
    - g) Conciliação: auto-match, ignorar linha, vínculo manual, desfazer vínculo. EVIDÊNCIA: [ ]
    - h) Import/Export: confirmar uma importação; exportar um relatório. EVIDÊNCIA: [ ]
    - i) Referencial: salvar um lote de-para; copiar versão. EVIDÊNCIA: [ ]
    - j) Contrapartes: cadastrar (com e sem referência); arquivar. EVIDÊNCIA: [ ]
    - k) Plano de contas: criar conta; ligar/desligar "exige dimensão". Períodos: criar exercício, abrir,
      fechar (parcial/definitivo), reabrir; encerrar exercício. EVIDÊNCIA: [ ]

> **EVIDÊNCIA do passo 15 (agente, 29/10/2026, sob comando do dono no chat; RUNBOOK-FORMAT §Fronteira).** Mesmo ambiente dos
> passos 12–14, usuário `seed-real` (o dono logou no painel), unidade `seed-unit-real` (`cmuw4z7zj02ehcii0st3unfr4`). O agente
> operou as telas no painel do navegador embutido, com cliques e preenchimento de campos por script na página. Para ter o
> **corpo do request**, que o Network do painel não mostra, o agente instalou na página um gancho só de leitura em `fetch`/XHR.
> Ele grava método, URL, corpo, status e o começo da resposta de toda escrita. A saída abaixo é a transcrição desse gancho e do
> Network, com os ids encurtados só onde está indicado. Nos itens g) e h), os arquivos CSV foram entregues ao `<input type=file>`
> por `DataTransfer`, sem diálogo do sistema. O upload por clique é o passo 2, não este. Contagem final do gancho: **52 escritas,
> 1 com status ≥ 400** (o encerramento do item k, regra de negócio). Nenhuma escrita deu 400 de `unrecognized_keys` ou
> `invalid_type`.
>
> ```text
> ## a) AP
> POST /api/payables → 201 (resp id cmvtz4385006jci9c10ux4oes, amountCents 15000, expenseAccountId 4.1, status OPEN, withholdingAvisos SEM_PERFIL_RETENCAO)
> POST /api/payables/cmvtz4385006jci9c10ux4oes/pay → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","method":"Pix","paidAt":"2026-10-29","amountCents":15000}
> POST /api/payables/cmvtz4385006jci9c10ux4oes/payments/cmvtz51c7006uci9cyg1add7j/cancel → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reversalDate":"2026-10-29","reason":"H2 15a teste"}
>   resp updatedAt 20:06:43.262Z mas dev.db updatedAt 20:06:57.856 (resposta com updatedAt velho)
> POST /api/payables/cmvtz4385006jci9c10ux4oes/cancel → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reversalDate":"2026-10-29","reason":"H2 15a cancelar titulo"} resp status CANCELLED, documentNumber "deleted:<id>:NF-H2-1"
> braço estoque: seed-real sem produto ("Nenhum produto no catálogo"); feito pela tela no seed-presumido antes do passo 6 (Shampoo H2) sem status capturado
> Achados: "Cash" sem tradução no select; status "PARTIALLY_PAID" sem tradução na lista; dica "Debita 1.1.6" (=C)
> ## b) AR
> POST /api/receivables → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","customerName":"Cliente H2","description":"H2 15b receita","issueDate":"2026-10-29","dueDate":"2026-10-29","amountCents":12000,"revenueAccountId":"cmuw4z86802gpcii04kmwh7xu","documentNumber":"FAT-H2-1"}
> POST /api/receivables/cmvtz63wp007gci9cis6sswh9/receive → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","method":"Pix","receivedAt":"2026-10-29","amountCents":12000}
> POST /api/receivables/cmvtz63wp007gci9cis6sswh9/receipts/cmvtz6cl9007rci9c7vp2evu1/cancel → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reversalDate":"2026-10-29","reason":"H2 15b teste"}
> POST /api/receivables/cmvtz63wp007gci9cis6sswh9/cancel → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reversalDate":"2026-10-29","reason":"H2 15b cancelar titulo"}
> linhas: Recebida → Em aberto → some da lista
> ## c) e-Lalur
> POST /api/lalur/parte-b → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","codCtaB":"PB-H2-1","descricao":"H2 15c prejuizo fiscal","dtCriacao":"2026-03-31","codPbRfb":"1000","codTributo":"I","saldoIniCents":0,"indSaldoIni":"D"}  (id cmvtz7a7n008bci9cf3u0vmes)
> PATCH /api/lalur/parte-b/cmvtz7a7n008bci9cf3u0vmes → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","descricao":"H2 15c prejuizo fiscal (editada)","dtCriacao":"2026-03-31","codPbRfb":"1000","dtLimite":null,"saldoIniCents":0,"indSaldoIni":"D","cnpjSitEsp":null}
>   (1º PATCH 200 saiu com a descrição antiga — erro do agente: preencheu o campo errado; refeito)
> POST /api/lalur/parte-b → 201 ×2 (PB-H2-2 p/ passo 16; PB-H2-X p/ arquivar)
> POST /api/lalur/parte-b/cmvtz8dto008fci9c1o3u346y/archive → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"} resp codCtaB "deleted:<id>:PB-H2-X"; linha sumiu
> POST /api/lalur/entries → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","year":2026,"quarter":"T01","livro":"lalur","codigo":"8.60","valorCents":10000,"indRelacao":"4","histLancamento":"H2 15c ajuste de teste"}
> PATCH /api/lalur/entries/cmvtz92b0008hci9c1wup3g4p → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","valorCents":15000,"indRelacao":"4","parteBId":null,"accountId":null,"histLancamento":"H2 15c ajuste de teste (editado)"}
> POST /api/lalur/entries/cmvtz92b0008hci9c1wup3g4p/archive → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}; linha sumiu
> ## d) Aprovações
> POST /api/entry-approvals/drafts → 201 body={"date":"2026-10-29","description":"H2 15d rascunho A","unitId":"cmuw4z7zj02ehcii0st3unfr4","lines":[{"accountCode":"4.1","debitCents":5000,"creditCents":0},{"accountCode":"1.1.1.01","debitCents":0,"creditCents":5000}]}
> PUT /api/entry-approvals/drafts/cmvtza6j6008jci9cuva6bekg → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","date":"2026-10-29","description":"H2 15d rascunho A (editado)","lines":[{"accountCode":"4.1","debitCents":6000,"creditCents":0},{"accountCode":"1.1.1.01","debitCents":0,"creditCents":6000}],"expectedVersion":1}
> POST /api/entry-approvals/drafts/cmvtza6j6008jci9cuva6bekg/submit → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","expectedVersion":2}
> POST /api/entry-approvals/cmvtza6j6008jci9cuva6bekg/approve → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","expectedVersion":3} resp status "Posted", sourceType manual
> POST /api/entry-approvals/drafts → 201 (rascunho B, 3000)
> POST /api/entry-approvals/drafts/cmvtzayms008tci9c166s5kz7/submit → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","expectedVersion":1}
> POST /api/entry-approvals/cmvtzayms008tci9c166s5kz7/reject → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","expectedVersion":2,"reason":"H2 15d motivo da rejeição"}; card volta a rascunho (Editar/Enviar)
> ## e) Lançamentos (Balancete → Novo Lançamento)
> POST /api/accounting/post → 201 body={"date":"2026-10-29","description":"H2 15e lancamento com dimensao","unitId":"cmuw4z7zj02ehcii0st3unfr4","lines":[{"accountCode":"4.1","debitCents":2500,"creditCents":0,"dimensions":["cmvtzbva90091ci9cjb6dcsaa"]},{"accountCode":"1.1.1.01","debitCents":0,"creditCents":2500}]} → 2026/0180
> POST /api/accounting/reverse → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","lancamentoId":"cmvtzckf00093ci9crf8hl7ko","reversalPostingDate":"2026-10-29"}; linha 2026/0180 "Estornado" mas ainda com botão Estornar
> Achado (I): rascunho B (status Rascunho, sem nº) aparece em Lançamentos com "Recibo (PDF)" e "Estornar"
> ## f) Dimensões
> POST /api/dimensions/definitions → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","code":"H2_CC","name":"Centro de custo H2"}
> POST /api/dimensions/values → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","definitionId":"cmvtzboo5008zci9ckjlqx6u6","code":"LOJA1","name":"Loja 1 H2"}
> POST /api/dimensions/values/cmvtzbva90091ci9cjb6dcsaa/archive → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}
> POST /api/dimensions/definitions/cmvtzboo5008zci9ckjlqx6u6/archive → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}; tela: "Nenhum eixo de dimensão cadastrado"
> ## g) Conciliação (extrato CSV de 3 linhas injetado no input file por DataTransfer — não é "upload por clique"; isso foi o passo 2)
> POST /api/accounting/reconciliation/statements → 201 body=[FormData] (statement cmvtze2hc009jci9czqvrgtsz, ref EXTRATO-H2-15G, conta 1.1.1.01) tela "Extrato importado: 3 linha(s)."
> POST /api/accounting/reconciliation/statements/cmvtze2hc009jci9czqvrgtsz/auto-match → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"} res={"success":true,"data":{"processed":3,"matched":1,"zeroCandidates":2,"ambiguous":0}}
> POST /api/accounting/reconciliation/lines/cmvtze2hd009mci9co3ob8gug/ignore → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","ignored":true}
> (linha E sem candidato: 2026/0180 estornado; postado lançamento 4.1 D / 1.1.1.01 C 2500, POST /api/accounting/post → 201; 1ª abertura de Sugestões depois disso mostrou "Nenhum candidato" (GET suggestions → 200 {"success":true,"data":[]}); a API, chamada direto, devolveu o candidato; reaberto depois de "Atualizar", a tela listou. Ordem GET×POST não confirmada.)
> POST /api/accounting/reconciliation/matches → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","statementLineId":"cmvtze2hd009lci9cresny5cz","postingIds":["cmvtzfgju009uci9crgmpv7hg"]} res={"success":true,"data":{"matchedPostings":1}}
> POST /api/accounting/reconciliation/matches/cmvtzhcgc009wci9cmdtlhgq9/unmatch → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}; linha volta a Pendente
> ## h) Import/Export (CSV de lançamentos injetado no input file)
> POST /api/accounting/data-exchange/imports → 201 (job cmvtziswn009xci9c3nru7tqx, IMPORT_JOURNAL_ENTRIES, VALIDATED; tela "Total: 2 | Válidas: 2 | Inválidas: 0")
> POST /api/accounting/data-exchange/jobs/cmvtziswn009xci9c3nru7tqx/commit → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"} status COMMITTED
> POST /api/accounting/data-exchange/exports → 201 body={"kind":"EXPORT_TRIAL_BALANCE","format":"csv","unitId":"cmuw4z7zj02ehcii0st3unfr4"} status EXPORTED, export_trial_balance.csv 779 bytes
> ## i) Referencial (seed-real: 2025 = 42/42 "Pronto"; 2026 vazio)
> POST /api/accounting/referential/mappings/copy → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","fromVersion":"2025","toVersion":"2026"} (2026 passa a 42/42; com tudo mapeado a tela esconde a grade de edição)
> POST /api/accounting/referential/mappings/batch → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","mappingVersion":"2027","items":[{"accountId":"cmuw4z84o02g1cii05zbuilnh","referentialCode":"1.01.01.02.01","label":"Bancos Conta Movimento - No País"}]}; tela "Mapeadas: 1 | Pendentes: 41"
> ## j) Contrapartes
> POST /api/counterparties → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","type":"SUPPLIER","name":"Contraparte H2 com ref","ref":"H2-REF-001"}
> POST /api/counterparties → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","type":"CUSTOMER","name":"Contraparte H2 sem ref"}  (sem chave ref)
> POST /api/counterparties/cmvtzlc3900crci9c9791y9e1/archive → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}; linha sumiu
> ## k) Plano de contas / Períodos
> POST /api/accounting/accounts → 201 body={"code":"4.9","name":"Despesa teste H2","nature":"Expense","acceptsEntries":true,"unitId":"cmuw4z7zj02ehcii0st3unfr4"}
> PATCH /api/accounting/accounts/cmvtzm15000ctci9cizegw9tr/requires-dimension → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","requiresDimension":true} (linha "Obrigatória")
> PATCH .../requires-dimension → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","requiresDimension":false} (linha "Opcional")
> POST /api/accounting/cmuw4z7zj02ehcii0st3unfr4/periods/seed-year → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","year":2027} ("Semear 2027"; 12 meses Futuro)
> POST /api/accounting/periods/cmvtzmt7300cuci9cf3yhsv46/open → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"} (Jan/2027 Aberto)
> POST .../soft-close → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reason":"H2 15k teste"} (Fech. Parcial)
> POST .../reopen → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","periodId":"cmvtzmt7300cuci9cf3yhsv46","reason":"H2 15k teste"} (Aberto)
> POST .../hard-close → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","reason":"H2 15k teste"} (Definitivo)
> POST /api/accounting/closing/exercise → 400 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","year":2027} res={"code":"VALIDATION_ERROR","message":"Não há saldo de contas de resultado para encerrar em 2027."}
> Achado: modal "Encerrar exercício" mostra Unidade = id cru (cmuw4z7zj02ehcii0st3unfr4)
> Total: 52 escritas registradas pelo gancho; 1 ≥400 (o encerramento). Console: 4× "Failed to load resource: 400" desde o login no seed-real (ECF Real 400, encerramento 400 e 2 de origem não identificada).
> ```
>
> **Desvios e lacunas do passo 15:**
> - a) O braço **estoque** não rodou no `seed-real`: o modal mostra "Nenhum produto no catálogo". Ele rodou pela mesma tela no
>   `seed-presumido`, hoje, antes do passo 6 (Shampoo H2, 10 un., título `OPEN` de 20000; ver o bloco dos passos 6–11), mas
>   aquela sessão não guardou o status nem o corpo do request.
> - c) O 1º PATCH da conta da Parte B saiu com a descrição antiga porque o agente preencheu o campo errado (no modo edição os
>   índices mudam). Foi refeito; o PATCH válido está acima.
> - g) A 1ª abertura de "Sugestões" depois de postar o lançamento de R$ 25 mostrou "Nenhum candidato". A mesma rota chamada
>   pela API devolveu o candidato. Depois de "Atualizar", a tela também listou. Não foi confirmado se o GET saiu antes do POST.
> - k) "Encerrar exercício" deu 400 de regra ("Não há saldo de contas de resultado para encerrar em 2027"). O corpo
>   `{unitId, year}` passou pelo DTO. O agente não encerrou 2026 (exercício com movimento e meses abertos) para não lançar
>   encerramento real no dev.db. Efeito colateral no `seed-real`: 2027 semeado e Jan/2027 `HARD_CLOSED`.
>
> **Achados de tela (rótulo e fluxo, não corrigidos):** (G) "Cash" sem tradução no select de forma de pagamento/recebimento e
> status "PARTIALLY_PAID" sem tradução na lista de Contas a Pagar. (H) A resposta do cancelamento de pagamento traz um
> `updatedAt` velho (20:06:43.262Z, enquanto o dev.db tem 20:06:57.856). (I) Em Lançamentos, um rascunho (status "Rascunho",
> sem número) mostra "Recibo (PDF)" e "Estornar", e um lançamento "Estornado" ainda mostra "Estornar". (J) O modal "Encerrar
> exercício" mostra o `unitId` cru no campo Unidade. Console (só erros): 4× "Failed to load resource: 400" desde o login no
> `seed-real`. Dois são o 400 da ECF Real (passo 14) e o do encerramento. Os outros 2 não têm origem identificada, como no
> passo 11.
>
> **Refeitos a pedido do dono** (chat, 29/10, questionário: *"Refazer a/k antes"*):
>
> ```text
> a) produto pela tela (Dashboard → Produtos → Novo Produto):
> POST /api/dynamic-tables/cmuw4z7xu02drcii06zy1xj4m/data → 201 body={"data":{"name":"Condicionador H2","sku":"H2-COND","category":"Cabelo","usageType":"Sale"}}
> Contas a Pagar → Nova Conta → "Compra de estoque" (o select de produto passa a listar "Condicionador H2"):
> POST /api/payables → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","supplierName":"Fornecedor H2","description":"H2 15a estoque","issueDate":"2026-10-29","dueDate":"2026-10-29","amountCents":10000,"inventoryProductRef":"cmvu8199300dvci9ce08ij9sr","inventoryQty":5,"documentNumber":"NF-H2-EST-1"}
>   resposta: id cmvu81uyv00e3ci9ckhwb0e63, "expenseAccountId":null, "inventoryProductRef":"cmvu8199300dvc…"
> k) exercício com saldo: Períodos 2027 → Fev "Abrir"; Balancete → Novo Lançamento em 10/02/2027; Dez "Abrir"; "Encerrar exercício 2027":
> POST /api/accounting/periods/cmvtzmt7500cuci9c5bamfzy0/open → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}
> POST /api/accounting/post → 201 body={"date":"2027-02-10","description":"H2 15k despesa 2027 para encerramento","unitId":"cmuw4z7zj02ehcii0st3unfr4","lines":[{"accountCode":"4.9","debitCents":1000,"creditCents":0},{"accountCode":"1.1.1.01","debitCents":0,"creditCents":1000}]}
> POST /api/accounting/closing/exercise → 422 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","year":2027} res={"code":"ACCOUNTING_PERIOD_NOT_OPEN","message":"Período contábil 2027/12 não está aberto para lançamentos."}
> POST /api/accounting/periods/cmvtzmt7900d5ci9cg0bmvtxb/open → 200 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4"}   (Dez/2027)
> POST /api/accounting/closing/exercise → 201 body={"unitId":"cmuw4z7zj02ehcii0st3unfr4","year":2027} res={"success":true,"data":{"id":"cmvu80m5800dpci9c4cn3y3ev",…,"date":"2027-12-31T00:00:00.000Z","description":"Encerramento do exercício 2027 — apuração do resultado","status":"Posted","sourceType":"closing","sourceId":"2027",…}}
> tela: "Exercício encerrado. | Lançamento nº 2 — exercício 2027"
> ```
>
> Efeito no `seed-real`: 2027 com 2 lançamentos (a despesa de R$ 10 e o encerramento), Jan/2027 `HARD_CLOSED`, Fev e
> Dez/2027 abertos. O 2026 não foi tocado pelo encerramento. Antes do encerramento, a tela não avisa que Dez precisa estar
> aberto: o 422 aparece só depois do clique.
>
> Leitura do agente: a) a k) com 2xx nas escritas depois do refazer.
> Desfecho escolhido pelo dono no chat (29/10, questionário): *"PASSOU"*.

Desfecho do passo 15 (marcar UM):
[x] PASSOU — a) a k) com evidência conferindo com o esperado *(marcado pelo dono no chat, 29/10; assinatura abaixo continua do dono)*
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 15): ____________

### [EMENDA 2026-09-28] Passo 16 — e-Lalur: movimentos M410, fechamento do trimestre e diagnóstico (FE-INCR-LALUR-PR2)

> Preparado por agente em 2026-09-28, **em branco** (`PLANO-ONDA1-FE-2026-09-28.md` §4). Mesmas pré-condições dos
> passos 12–14 (commit do merge do FE-INCR-LALUR-PR2 ou posterior, build de produção, cópia do `dev.db`), num
> tenant em Lucro Real com ao menos 2 contas da Parte B do mesmo tributo (seed `seed-real`).

16. Contabilidade → Compliance → e-Lalur → "Movimentos da Parte B (M410)".
    - a) Criar um movimento `CR` com contrapartida (a lista só oferece contas do mesmo tributo, sem a própria) e
      um `PF` (a contrapartida some). Resultado esperado: 2xx; o `PF` sai sem `contrapartidaId` no request.
      EVIDÊNCIA: [ ]
    - b) Histórico com `|`: a tela recusa antes do envio. EVIDÊNCIA: [ ]
    - c) Fechar T01, depois T02 (o botão de T03 só habilita com T02 fechado); reabrir T02 (o de T01 fica
      desabilitado enquanto T02 estiver fechado). Resultado esperado: 2xx; o chip muda de estado e o
      diagnóstico recarrega. EVIDÊNCIA: [ ]
    - d) Diagnóstico: saldos por trimestre × conta; se houver divergência, a linha fica vermelha e aparece na
      lista do topo; se houver aviso M312, "Ver o ajuste na Parte A" filtra o ajuste. EVIDÊNCIA: [ ]
    - e) Usuário sem `canManageLalur`: sem botões de escrita; a leitura segue. EVIDÊNCIA: [ ]

Desfecho do passo 16 (marcar UM):
[ ] PASSOU — a) a e) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 16): ____________

### [EMENDA 2026-09-28] Passo 17 — SPED: qualificação do assinante e contador do cadastro (FE-INCR-SPED-SIGNERS)

> Preparado por agente em 2026-09-28, **em branco** (`PLANO-ONDA1-FE-2026-09-28.md` §5). Mesmas pré-condições dos
> passos 12–14 (commit do merge do FE-INCR-SPED-SIGNERS ou posterior). Para o item c), um contador cadastrado em
> `/api/accounting/contacts` na unidade (com e sem telefone).

17. Contabilidade → Compliance → Gerar SPED.
    - a) O código do signatário (ECD `COD_ASSIN`, ECF/ECF Real `IDENT_QUALIF`) é um combobox com "código · descrição",
      busca por texto e **sem texto livre**: digitar um código fora da tabela e sair do campo limpa o valor. A ECD
      oferece `001` (só na J930); a ECF não. EVIDÊNCIA: [ ]
    - b) Gerar a ECD escolhendo `900` e `205` pelo combobox. Resultado esperado: 2xx. EVIDÊNCIA: [ ]
    - c) "Contador do cadastro": escolher o contador e deixar só a linha do responsável legal. Resultado esperado: o
      request leva `signerContactIds: [id]` e 2xx; na ECF com um contador **sem telefone** no cadastro, a tela mostra o
      400 do servidor ("não tem telefone") inteiro. EVIDÊNCIA: [ ]

Desfecho do passo 17 (marcar UM):
[ ] PASSOU — a) a c) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 17): ____________

### [EMENDA 2026-09-28] Passo 18 — Revisão profissional (FE-INCR-REVIEW)

> Preparado por agente em 2026-09-28, **em branco** (BRIEF `FE-INCR-REVIEW-brief.md` §1). Mesmas pré-condições dos
> passos 12–14, com a ECD e a ECF do exercício já geradas pela tela (passo 12/14).

18. Contabilidade → Compliance → "Revisão profissional".
    - a) "Abrir revisão": os selects listam os arquivos EXPORTED do exercício; abrir com a ECD e a ECF. Abrir de novo
      o mesmo par dá 409 com a mensagem e a lista recarrega. EVIDÊNCIA: [ ]
    - b) No detalhe: adicionar um achado BLOCKER (I050) e um NOTE (I200). "Assinar" fica desabilitado enquanto o
      BLOCKER estiver aberto. EVIDÊNCIA: [ ]
    - c) Resolver o BLOCKER por "Apontar dado editado" (conta) — o link leva ao Plano de Contas; resolver o NOTE por
      "Lançar acerto" com "Estornar também o lançamento original" (só aparece no I200). EVIDÊNCIA: [ ]
    - d) Assinar (nome + CRC `UF-NNNNNN/O-D` + declaração). Se vier 409 `REVIEW_STALE`, regerar, "Trocar jobs" e
      assinar de novo. Resultado esperado: status "assinada". EVIDÊNCIA: [ ]
    - e) Em outra revisão: "Rejeitar" com motivo → status "rejeitada", sem mais ações. EVIDÊNCIA: [ ]

Desfecho do passo 18 (marcar UM):
[ ] PASSOU — a) a e) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 18): ____________

### [EMENDA 2026-09-28] Passo 19 — Entrega ao contador (FE-INCR-DELIVERY PR-D1/PR-D2)

> Preparado por agente em 2026-09-28, **em branco** (BRIEF `FE-INCR-DELIVERY-brief.md` §1). Pré-condições dos passos
> 12–14 + revisão do par ECD/ECF **assinada** (passo 18) + os 12 meses do exercício `HARD_CLOSED`. O sistema **não
> envia nada**: `SENT` registra que o operador despachou pelo canal dele (F-CD1-a).

19. Contabilidade → Compliance → "Entrega ao contador".
    - a) Contadores: cadastrar um (CPF, CRC `UF-NNNNNN/O-D`, UF do CRC); editar limpando a certidão; salvar um perfil de
      pacote com "Balancete". EVIDÊNCIA: [ ]
    - b) Montar pacote: escolher o contador (o balancete do exercício vem pré-marcado pelo perfil), a ECD e a ECF;
      "Validar pacote" → manifesto com ECD, ECF e os extras na ordem, sha256 e período. Sem revisão assinada: 409
      `REVIEW_REQUIRED` com o link "Revisão profissional ↑". EVIDÊNCIA: [ ]
    - c) Baixar os arquivos pelo manifesto e conferir o sha256; marcar "Confirmo que despachei…" e "Registrar despacho"
      → recibo com `SENT`, o significado devolvido pelo servidor, o contador e o signatário J930. EVIDÊNCIA: [ ]
    - d) Entregas: a entrega aparece no histórico; o detalhe lista os itens; "Reprocessar" só aparece em `FAILED`.
      EVIDÊNCIA: [ ]

Desfecho do passo 19 (marcar UM):
[ ] PASSOU — a) a d) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 19): ____________

### [EMENDA 2026-09-29] Passo 20 — Baixas por retorno bancário (FE-INCR-BANK-SETTLEMENT)

> Preparado por agente em 2026-09-29, **em branco** (BRIEF `FE-INCR-BANK-SETTLEMENT-brief.md` §1). Pré-condições dos
> passos 12–14 + um extrato importado (fixture OFX do repo) na conta bancária e uma conta a pagar aberta que case com
> uma linha dele. O `dev.db` tem `bank_settlement_items` vazia (o F7 nunca rodou fora de teste).

20. Contabilidade → Conciliação → sub-aba "Baixas por retorno".
    - a) "Varrer extrato": o resumo mostra novos/já existentes/ambíguos/sem título/desatualizados; a lista abre em
      PENDING. Varrer de novo não duplica (sobe "já existentes"). EVIDÊNCIA: [ ]
    - b) Confirmar um item com o meio certo (Pix/TED…): status CONFIRMED, o balancete recarrega e o lançamento aparece.
      Um item com encargo e sem conta configurada mostra o 400 `charge_account_not_configured` inteiro. EVIDÊNCIA: [ ]
    - c) Rejeitar outro item com motivo: REJECTED, sem ações. EVIDÊNCIA: [ ]
    - d) Item FAILED (se houver) mostra a etapa e o motivo; "Reprocessar" disponível. EVIDÊNCIA: [ ]

Desfecho do passo 20 (marcar UM):
[ ] PASSOU — a) a d) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 20): ____________

### [EMENDA 2026-10-03] Passo 21 — CRM, usuários, vendas, login e setup com o body tipado (contrato gerado PR-3)

> Preparado por agente em 2026-10-03, **em branco** (`PLANO-FE-CONTRACT-TYPES-2026-09-28.md` §8, item 5). O PR-3
> trocou o body de escrita destes 7 services pelo tipo gerado do DTO e tirou os spreads condicionais dos chamadores
> (`k: v || undefined`); o fio deveria ser o mesmo de antes. Mesmas pré-condições dos passos 12–14 (commit do merge
> do PR-3 ou posterior, build de produção, cópia do `dev.db`). Em cada linha: executar a ação uma vez e colar status
> + corpo do request no Network.

21. Resultado esperado em todas: 2xx, sem 400 de `unrecognized_keys`/`invalid_type`.
    - a) CRM (lead): avançar etapa comum, etapa de reunião (com `meetingAt`) e de proposta (`amount`/`currency`/
      `winProbability`); registrar no-show com reagendamento e com reversão; converter lead em conta/contato.
      EVIDÊNCIA: [ ]
    - b) CRM (oportunidade): criar a partir de um lead (com e sem valor, com e sem conta); avançar etapa comum e de
      proposta. EVIDÊNCIA: [ ]
    - c) Vendas: pagar (Pix **e** Package Balance com `packageId`), cancelar com e sem motivo, devolver com e sem
      motivo. EVIDÊNCIA: [ ]
    - d) Usuários: criar (admin), editar o perfil (nome, e-mail, senha), trocar idioma pela Navbar e moeda/idioma
      pelo perfil (`PATCH /users/me/preferences`). EVIDÊNCIA: [ ]
    - e) Login (por usuário e por e-mail) e cadastro (`/users/signup`). EVIDÊNCIA: [ ]
    - f) Setup: criar o dashboard pelo caminho rápido e pelo personalizado (usuário novo, sem tabelas). EVIDÊNCIA: [ ]

Desfecho do passo 21 (marcar UM):
[ ] PASSOU — a) a f) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 21): ____________

### [EMENDA 2026-10-05] Passo 22 — Perfil fiscal da unidade e dos serviços (FE-INCR-DFE PR-0)

> Preparado por agente em 2026-10-05, **em branco** (`FE-INCR-DFE-brief.md` item 9). A aba "Perfil fiscal" é a porta
> de entrada da emissão de NFS-e: sem o perfil da unidade e o de cada serviço nenhuma venda emite. Mesmas pré-condições
> dos passos 12–14 (commit do merge do PR-0 ou posterior, **build de produção**, cópia do `dev.db`), mais: tenant com
> unidade real (seed re-semeado depois do SEED-UNITS, #487) e pelo menos um serviço no catálogo. Em cada linha: executar
> a ação uma vez e colar print + (onde indicado) status e corpo do request no Network.

22. Resultado esperado em todas: 2xx nas escritas, console sem erro.
    - a) Aba **Perfil fiscal** aparece depois de Imobilizado, com os dois painéis (unidade em cima, serviços embaixo).
      Se o usuário também atende clientes como contador: no modo cliente a aba **não** aparece. EVIDÊNCIA: [ ]
    - b) Unidade **sem** perfil: formulário em branco e o aviso "nenhuma venda emite NFS-e". (Um toast vermelho do
      `apiClient` com "Perfil fiscal da unidade não cadastrado" pode aparecer junto — é o 404 esperado; anotar se
      aparecer.) EVIDÊNCIA: [ ]
    - c) Escolher Simples Nacional: ICMS desabilitado e PIS/COFINS travado em "Simples". Trocar para Lucro Presumido:
      some o campo do Simples e aparecem Federal/Estadual/Municipal. EVIDÊNCIA: [ ]
    - d) Preencher município (IBGE 7 dígitos), série da DPS (use **7**), ISS `2,00`, tributos aproximados `15,50`,
      "Competência fora do mês" = **Bloquear**; salvar. No Network: PUT com `issAliquotaBp: 200`, `pTotTribSNCent:
      1550`, `dpsSerie: 7`, `emissaoForaDoMes: "BLOQUEAR"` e **todos** os demais campos do perfil presentes.
      EVIDÊNCIA: [corpo do PUT]
    - e) Recarregar a página (F5), reabrir a aba: os valores voltam; salvar de novo sem mexer em nada — o corpo do PUT
      é o mesmo e série 7 / Bloquear continuam. EVIDÊNCIA: [corpo do 2º PUT + print]
    - f) O selo "Pronto para emitir NFS-e" ou a lista "O que falta" confere com o que foi preenchido; o aviso de valores
      do contador (D1f) some depois do primeiro salvamento. EVIDÊNCIA: [ ]
    - g) Serviços: cada serviço do catálogo aparece; os sem perfil mostram "sem perfil". Configurar um colando
      `01.07.01` no código de tributação: sai salvo como `010701` com a descrição da lista nacional ao lado. Corpo do
      PUT sem `cIndOp` quando o campo ficou vazio. EVIDÊNCIA: [print + corpo do PUT]
    - h) Código fora da lista nacional (ex.: `99.99.99`): o erro do servidor aparece inteiro no modal, que continua
      aberto. EVIDÊNCIA: [ ]
    - i) Excluir o perfil de um serviço: pede confirmação; confirmando, a linha volta a "sem perfil" e o DELETE leva o
      `unitId` na query. EVIDÊNCIA: [ ]
    - j) (Só se houver contador ACTIVE na unidade) Salvar o perfil da unidade: a mensagem do servidor sobre contador
      responsável aparece inteira, sem esconder o formulário. EVIDÊNCIA: [ ]
      **[EMENDA 2026-10-09 — FE-INCR-ACCOUNTING-POLICY-VERSION item 14]** o resultado esperado do 22 j mudou: com
      contador ACTIVE o botão já diz **"Enviar ao contador para aprovação"** (F-FE-POL-1 a) e o clique faz `POST
      /policy-versions` (201), não `PUT`. O roteiro completo está no passo 23.

Desfecho do passo 22 (marcar UM):
[ ] PASSOU — a) a j) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 22): ____________

### [EMENDA 2026-10-09] Passo 23 — Política contábil versionada: proposta do dono, decisão do contador (FE-INCR-ACCOUNTING-POLICY-VERSION)

> Preparado por agente em 2026-10-09, **em branco** (`FE-INCR-ACCOUNTING-POLICY-VERSION-brief.md` §7 e item 14). Agente
> não preenche evidência, não marca desfecho, não assina. Pré-condições: **build de produção** do commit do merge do PR
> ou posterior; `dev.db` real (`server/prisma/prisma/dev.db`); dois usuários (dono com unidade e perfil fiscal,
> contador com conta) e uma atribuição ACTIVE entre eles (convite + aceite pelas telas do #515); DevTools com o Network
> filtrado em `policy-versions`.

23. Resultado esperado em todas: 2xx nas escritas, console sem erro.
    - a) **Dono, Perfil fiscal:** o botão diz "Enviar ao contador para aprovação" e o aviso mostra o nome e o CRC do
      contador. Mudar "Crédito sobre compra de fornecedor do Simples" e enviar → 201; o formulário volta ao vigente
      (desmarcado) e aparece a faixa da proposta v{n}. EVIDÊNCIA: [corpo do POST — sem `unitId` dentro de `payload` — + print]
    - b) **Dono, Imobilizado → Contas:** mudar a despesa de depreciação e enviar → 201; a mensagem diz "Contas enviadas
      ao contador", nunca "Contas salvas". EVIDÊNCIA: [corpo do POST com só as 3 chaves do imobilizado]
    - c) **Dono, Perfil fiscal de novo:** enviar outra proposta → a faixa troca para v{n+1}; na aba **Política
      contábil**, a anterior aparece "Substituída". EVIDÊNCIA: [print]
    - d) **Contador, modo cliente:** a faixa do modo cliente mostra "2 proposta(s) de política aguardando sua decisão";
      a aba **Política contábil** aparece; o detalhe mostra o diff com o rótulo das contas. EVIDÊNCIA: [Network **sem**
      `GET /accounts`, `/fiscal-profile` ou `/settings` nesta sessão de tela; toda chamada com `ownerUserId`]
    - e) **Contador aprova** a do perfil → "Aplicada"; o dono recarrega e vê o campo marcado no perfil. EVIDÊNCIA: [ ]
    - f) **Contador rejeita** a das contas com motivo → "Rejeitada"; o dono vê o motivo na lista. EVIDÊNCIA: [ ]
    - g) **Corrida:** com o detalhe aberto no contador, o dono envia nova proposta; o contador aprova a antiga → texto
      "Esta proposta mudou…" e recarga (409 `POLICY_VERSION_STATUS_CHANGED`). EVIDÊNCIA: [ ]
    - h) **Sem contador:** encerrar a atribuição; o dono salva o perfil direto (PUT 200), e a lista mostra a versão como
      "aplicada direto (sem contador)". EVIDÊNCIA: [ ]

Desfecho do passo 23 (marcar UM):
[ ] PASSOU — a) a h) com evidência conferindo com o esperado
[ ] FALHOU — item __ divergiu; evidência colada acima
[ ] BLOQUEADO — pré-condição __ não se sustentava
Assinatura do executor (passo 23): ____________

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum" — bug novo vai para §5.2]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 4 do master map + data — cobre AMBOS:
  o browser sign-off original (passos 1–5) E, desde a emenda 2026-08-22, o fluxo de salão
  pós-swap do binding (passos 6–11, intérprete `SALON_BINDING_V1`/`04582d8a`/PR #211)]
- Assinatura do executor: ____________
