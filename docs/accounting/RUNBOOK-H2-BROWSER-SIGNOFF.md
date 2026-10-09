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

2. Na aba **Conciliação**, importar o extrato **clicando** no controle de upload e escolhendo o
   `.ofx` do disco (não colar, não fetch).
   Resultado esperado: extrato listado com linhas; auto-match roda.
   EVIDÊNCIA: [screenshot do extrato importado + nome do arquivo no diálogo]

3. Repetir o passo 2 com o arquivo **CNAB 240**.
   Resultado esperado: idem.
   EVIDÊNCIA: [screenshot]

4. Em **Recibos**, gerar o PDF de um recibo (caminho puppeteer) e ABRIR o arquivo baixado.
   Resultado esperado: PDF válido, com os dados do recibo.
   EVIDÊNCIA: [o PDF anexado ou screenshot dele aberto]

5. Releitura crítica ("carimbo"): algo em qualquer tela está errado para uso real (rótulo,
   número, fluxo)? Se sim, registrar em Achados — não corrigir nada nesta sessão.
   Resultado esperado: veredicto consciente do executor.
   EVIDÊNCIA: [uma frase por tela inspecionada OU "sem ressalvas"]

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

> **[EMENDA 2026-10-05 — dono em chat, 05/10: *"Pode emendar os 4"*] "Finalizar Venda" do wizard quebrado — feche a venda em 2 cliques.** Na `main`
> de 05/10 o wizard cria a venda já `Finalized` e só depois os itens, que `assertParentSaleNotFinalized` recusa
> (`FinanceService.createSaleWithItems` + `useSalesWizard.ts:270`; F11 do `PACOTE-VALIDADE-PENDENCIAS-brief.md`; o fix está
> em sessão própria). Até ele entrar: no wizard, **Salvar Rascunho**; depois, na lista de vendas ou no detalhe, **Finalizar**
> (`PUT` com `status: 'Finalized'`, `SalesTable.tsx:240` / `SaleDetailPanel.tsx:116`). No Network aparece o `POST` da venda
> (`Draft`), os `POST` dos itens e o `PUT` de finalização — o evento de finalização deve sair deste `PUT` (inferido pelo agente; o lançamento no razão é a prova). Se o "Finalizar Venda" do
> wizard for clicado por engano, a venda órfã (finalizada, sem itens) é **achado**, não falha deste passo: anote e siga.
> Quando o fix do wizard estiver em `main`, esta emenda cai e vale o texto original.

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

Desfecho dos passos 12–14 (marcar UM):
[ ] PASSOU — 12, 13 e 14 com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência colada acima; nenhum passo seguinte executado
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

Desfecho do passo 15 (marcar UM):
[ ] PASSOU — a) a k) com evidência conferindo com o esperado
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
