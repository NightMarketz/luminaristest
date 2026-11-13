# RUNBOOK: H2-VENDA-PACOTE — Sign-off de browser da venda de pacote pelo modal Nova Venda (FE-INCR-VENDA-PACOTE)

> Preparado por agente em 2026-10-05 contra a branch `claude/fe-incr-venda-pacote`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche. O agente verificou só o que o CI vê
> (`tsc`, `test:types`, vitest, build de produção, unit + integração do server); **nenhuma conferência de tela**
> foi feita por agente.

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-05 — "executa o FE-INCR-VENDA-PACOTE" (nó `FE-INCR-VENDA-PACOTE`,
`docs/accounting/FE-INCR-VENDA-PACOTE-brief.md` item 10). Rastreio: `docs/plano/nos/FE-INCR-VENDA-PACOTE.md`
(`estado_detalhe`) e o item de sign-offs de browser do Bloco A (`docs/plano/gates/`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR do FE-INCR-VENDA-PACOTE **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Servidor no ar com o `dev.db` populado (`server/prisma/prisma/dev.db` — o `server/prisma/dev.db` é isca de 0 byte) e um `AccountingBinding` `Active` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` (a tela está atrás de `withAuth`) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | A tabela de itens de venda é a **mista** (tem `packageId`): presets salão/clínica | No modal "Nova Venda", o seletor "Tipo de Venda" mostra **Produtos / Serviços / Pacotes** | [ ] |
| P5 | Catálogo de pacotes com 1 pacote **ativo** (ex.: "Pacote 10", preço `300,00`) e 1 **inativo** | Tabela "Packages" | [ ] |
| P6 | A tabela de vendas tem o campo `aboveCatalogPrice` — se a tabela é anterior a este PR, um **admin** roda o sync do preset: `POST /api/dynamic-tables/sync-preset` com `{ "internalName": "<internalName da tabela de vendas>" }` | Resposta do sync com `aboveCatalogPrice` em `added` (ou o campo já no schema) | [ ] |
| P7 | 1 cliente cadastrado e 1 unidade | Tabelas de clientes e unidades | [ ] |
| P8 | DevTools aberto: console e aba Network (filtro `dynamic-tables`) | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando) — nunca uma frase descrevendo que deu certo.

1. "Nova Venda" → Tipo de Venda **Pacotes**. Na seção Cliente, conferir que não há o interruptor "Cliente avulso".
   Resultado esperado: a frase "Pacote precisa de cliente cadastrado: o saldo fica no nome dele." no lugar do
   interruptor; só o seletor de cliente cadastrado.
   EVIDÊNCIA: [screenshot da aba Cabeçalho]

2. Unidade + cliente; aba **Itens** → "Adicionar pacote"; abrir o seletor de pacote.
   Resultado esperado: o pacote ativo aparece; o **inativo não**. Escolhido o pacote, o preço unitário vem do
   catálogo (`300,00`).
   EVIDÊNCIA: [screenshot do seletor aberto + da linha com o preço]

3. Mudar o preço para `250,00`.
   Resultado esperado: aviso "Para cobrar menos que o catálogo, use o campo Desconto." na linha; "Finalizar Venda"
   recusa com a mesma frase. Voltar o preço para `300,00` e lançar `50,00` no campo **Desconto**: o total vira
   `250,00` e o envio passa a ser possível.
   EVIDÊNCIA: [screenshot do aviso + screenshot do total com desconto]

4. Adicionar uma 2ª linha com **outro** pacote ativo (se existir) e tentar finalizar.
   Resultado esperado: "Uma venda leva um único pacote. Para outro pacote, crie outra venda."; nada é enviado
   (Network sem `POST`). Remover a 2ª linha.
   EVIDÊNCIA: [screenshot da mensagem + Network vazio]

> **[EMENDA 2026-10-05 — dono em chat, 05/10: *"Pode emendar os 4"*] "Finalizar Venda" do modal Nova Venda quebrado — vale para os passos 5–7.** Na `main`
> de 05/10 o modal Nova Venda cria a venda já `Finalized` e só depois os itens, que `assertParentSaleNotFinalized` recusa
> (`FinanceService.createSaleWithItems` + `useSalesCreateForm.ts:270`; F11 do `PACOTE-VALIDADE-PENDENCIAS-brief.md`; o fix está
> em sessão própria). Até ele entrar: no modal Nova Venda, **Salvar Rascunho**; depois, na lista de vendas ou no detalhe, **Finalizar**
> (`PUT` com `status: 'Finalized'`, `SalesTable.tsx:240` / `SaleDetailPanel.tsx:116`). No Network aparece o `POST` da venda
> (`Draft`), os `POST` dos itens e o `PUT` de finalização — o evento de finalização deve sair deste `PUT` (inferido pelo agente; o lançamento no razão é a prova). Se o "Finalizar Venda" do
> modal Nova Venda for clicado por engano, a venda órfã (finalizada, sem itens) é **achado**, não falha deste passo: anote e siga.
> Quando o fix do modal Nova Venda estiver em `main`, esta emenda cai e vale o texto original.
> Nos passos 3–4 nada é enviado (a recusa é local), então o botão do modal Nova Venda pode ser clicado ali.

5. Desconto `0`, quantidade `2`, preço `320,00`; **Finalizar Venda**.
   Resultado esperado: subtotal `640,00`; no Network, `POST` da venda com `"aboveCatalogPrice": true` e `POST` do
   item com `"type": "Package"`, `"packageId"`, `"quantity": 2`, `"unitPrice": 320`. Na lista, a venda mostra a
   etiqueta **"Acima do catálogo"**; no detalhe, o item aparece como **Pacote** com o nome do pacote.
   EVIDÊNCIA: [as duas linhas do Network com os corpos + screenshot da lista e do detalhe]

6. Nova venda de pacote pelo preço do catálogo (`300,00`, qtd 1), finalizada.
   Resultado esperado: `"aboveCatalogPrice": false` no corpo do `POST`; sem etiqueta na lista.
   EVIDÊNCIA: [linha do Network + screenshot da lista]

7. Criar uma venda de **serviço** finalizada para o **mesmo cliente** e clicar **Pagar** → forma "Saldo de pacote".
   Resultado esperado: o saldo do pacote vendido nos passos 5–6 aparece como opção (crédito da ponte
   `sale.package.sold`).
   EVIDÊNCIA: [screenshot do select de pacotes do modal de pagamento]

8. Voltar à venda de pacote do passo 5 (finalizada, pendente) e clicar **Pagar** → "Saldo de pacote".
   Resultado esperado: o **próprio pacote vendido não aparece** como saldo para pagar a si mesmo (item 7 do BRIEF).
   Se o cliente tiver saldo de **outro** pacote, esse aparece (troca permitida, F-FE-VP-2).
   EVIDÊNCIA: [screenshot do select de pacotes do modal de pagamento]

9. Console do navegador ao longo de todos os passos.
   Resultado esperado: sem erro vermelho.
   EVIDÊNCIA: [screenshot do console]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do plano/mapa atualizada com o desfecho + data]
- Assinatura do executor: ____________

---

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2)

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*.

**Ambiente:** o mesmo do bloco de 04/11 do `RUNBOOK-H2-ATIVACAO-CONTABIL.md` (build de produção `3077cda9` = `main`
`f5dc79b7` + docs, `127.0.0.1:4100`/`:3100`, dev.db real, backup
`server/prisma/backups/c7-irmaos-2026-11-04-20261104-001134/` com sha256 conferido e `integrity_check ok`). Usuário
`seed-presumido`, unidade `seed-unit-presumido`, cliente `Cliente H2`. DevTools trocado pelo log de rede do runner (`[net]`).

**Pré-condições.** P1 `main` (`f5dc79b7`). P2/P3 servidor e app de pé. P4 o seletor mostra Produtos / Serviços / Pacotes
(passo 1). P6 `aboveCatalogPrice` no schema de Sales (`instr(schema,'aboveCatalogPrice')>0` → `1`). P7 ok. **P5 — desvio de
dado:** o catálogo só tinha `Pacote H2` (300,00, 365 dias, ativo). Criei pela tela (Financeiro → Outros → Packages) o
inativo e dois ativos que o `RUNBOOK-H2-PACOTE-VALIDADE.md` também usa
([print](runbook-evidence/VENDA-PACOTE-2026-11-04/pre-01-catalogo-pacotes.png)):
```text
[net] POST /api/dynamic-tables/cmuw4yqvi000rcii0tmjxkd13/data -> 201  req: {"data":{"name":"Pacote C7 Inativo","price":200,"active":false}}
[net] POST /api/dynamic-tables/cmuw4yqvi000rcii0tmjxkd13/data -> 201  req: {"data":{"name":"Pacote C7 30 dias","price":150,"validityDays":30,"active":true}}
[net] POST /api/dynamic-tables/cmuw4yqvi000rcii0tmjxkd13/data -> 201  req: {"data":{"name":"Pacote C7 Sem validade","price":120,"active":true}}
```
Como o `Pacote H2` tem validade (365 dias), o modal mostra o bloco "Validade do pacote" e pede o aceite (FE-INCR-PACOTE-VALIDADE,
posterior a este runbook). Marquei o aceite em toda venda; o `POST /api/package-acceptances` aparece no Network.

**Passo 1.** Nova Venda → Pacotes ([print](runbook-evidence/VENDA-PACOTE-2026-11-04/passo1-01-cabecalho-pacote.png)).
```text
[eval] {"frase":true,"avulso":false}
CLIENTE
Pacote precisa de cliente cadastrado: o saldo fica no nome dele.
Selecione...
```
Grau: verificado. **Confere.**

**Passo 2.** Unidade + cliente; Itens → "Adicionar pacote"; seletor aberto
([print](runbook-evidence/VENDA-PACOTE-2026-11-04/passo2-01-seletor-aberto.png) ·
[linha](runbook-evidence/VENDA-PACOTE-2026-11-04/passo2-02-linha-preco.png)).
```text
[eval] Pacote C7 Sem validade | Pacote C7 30 dias | Pacote H2        (o "Pacote C7 Inativo" não aparece)
Pacote H2		R$ 300,00
```
Grau: verificado. **Confere.**

**Passo 3.** Preço `250,00` → aviso na linha; "Finalizar Venda" com o aviso: nenhum `[net]` sai (recusa local); preço
`300,00` + Desconto `50,00` → total `250,00` e os botões habilitados
([aviso](runbook-evidence/VENDA-PACOTE-2026-11-04/passo3-01-aviso-preco-menor.png) ·
[após o clique](runbook-evidence/VENDA-PACOTE-2026-11-04/passo3-02-finalizar-recusa.png) ·
[total](runbook-evidence/VENDA-PACOTE-2026-11-04/passo3-03-total-com-desconto.png)).
```text
[eval] … Pacote H2 / Para cobrar menos que o catálogo, use o campo Desconto. / R$ 250,00 / … TOTAL / R$ 250,00 …
(clique em Finalizar Venda: nenhuma linha [net]; o aviso fica na linha)
[eval] 0:1 | 1:R$ 300,00 | 2:R$ 50,00
[eval] … Subtotal / R$ 300,00 / Desconto / TOTAL / R$ 250,00 …
[eval] Salvar Rascunho:disabled=false | Finalizar Venda:disabled=false
```
Grau: verificado. **Confere**, com uma nota: a recusa do "Finalizar Venda" não mostra a frase num toast ou faixa nova; a
frase que fica visível é a da linha. O roteiro diz "recusa com a mesma frase"; li como conferindo (nada é enviado, a frase
está na tela). Grau dessa leitura: inferido.

**Passo 4.** 2ª linha com `Pacote C7 30 dias` e "Finalizar Venda"
([print](runbook-evidence/VENDA-PACOTE-2026-11-04/passo4-01-um-pacote-por-venda.png)).
```text
[eval] {"msg":true,"novasReq":[]}     ← "Uma venda leva um único pacote. Para outro pacote, crie outra venda." e nenhuma requisição nova
```
Grau: verificado. **Confere.** (O modal foi descartado em seguida; o passo 5 abre um novo.)

**Desvio de dado antes do passo 5 (erro do runner, não do app).** Na 1ª tentativa o campo Qtd não aceitou a limpeza por
setter e o runner digitou `2` em cima de `1`: saíram dois rascunhos errados (qtd 12 e 11). Cancelei os dois pela lista:
```text
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmw1kxh65006hcio0uqoehxao -> 200  req: {"data":{"status":"Cancelled"}}
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmw1kyak0006qcio0n9wa1fzw -> 200  req: {"data":{"status":"Cancelled"}}
[eval] ["04/11/2026 Cliente H2 Cancelada Pendente R$ 300,00 R$ 300,00","04/11/2026 Cliente H2 Cancelada Acima do catálogo Pendente R$ 320,00 R$ 320,00",…]
```
Os totais desses rascunhos eram 3.300,00 e 3.840,00 antes do PUT; o PUT de status os reescreveu para 300,00 e 320,00. Foi
essa reescrita que levou ao achado VP-1, reproduzido no passo 5.

**Passo 5 — FALHOU.** Desconto 0, Qtd 2 (botão "+"), preço `320,00`; caminho da emenda F11 (o defeito segue em `main`:
`my-app/features/dashboard/category-views/finance/services/FinanceService.ts:42` cria a venda antes dos itens):
**Salvar Rascunho** e **Finalizar** pela lista
([itens](runbook-evidence/VENDA-PACOTE-2026-11-04/passo5-01-itens-qtd2-320.png) ·
[lista](runbook-evidence/VENDA-PACOTE-2026-11-04/passo5-02-lista-acima-catalogo.png) ·
[detalhe](runbook-evidence/VENDA-PACOTE-2026-11-04/passo5-03-detalhe.png)).
```text
[eval] 0:2 | 1:R$ 320,00 | 2:R$ 0,00
[eval] … R$ 640,00 / Subtotal / R$ 640,00 / TOTAL / R$ 640,00
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-04","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw","status":"Draft","paymentStatus":"Pending","subtotal":640,"totalAmount":640,"paymentMethod":"Pix","aboveCatalogPrice":true}}
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmw1ldyi70077cio0ammofgtc","packageId":"cmvtxuu8f0015ci9c87vo9g6f","type":"Package","quantity":2,"unitPrice":320}}
[net] POST /api/package-acceptances -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmw1ldyi70077cio0ammofgtc","textVersion":"v1","textSha256":"22b9a5380026457e617c806538c6c717ed68bdcbf39342dcf97b36bfbbfb2437"}
[eval] ["04/11/2026 Cliente H2 Rascunho Acima do catálogo Pendente R$ 640,00 R$ 640,00", …]
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmw1ldyi70077cio0ammofgtc -> 200  req: {"data":{"status":"Finalized"}}
[eval] ["04/11/2026 Cliente H2 Finalizada Acima do catálogo Pendente R$ 320,00 R$ 320,00", …]
detalhe: Finalizada · Pendente · Acima do catálogo … Subtotal R$ 320,00 · Total R$ 320,00
         Itens: Tipo Pacote | Produto/Serviço Pacote H2 | Qtd 2 | Preço R$ 320,00
banco (leitura):
journal_entries: cmw1le47n007mcio02e4vuatr | sale.package.sold | Posted | débito 64000 | crédito 64000
customer_package_balances (Cliente H2, Pacote H2): balanceCents 100000
```
O que confere: subtotal 640,00 no modal, os dois corpos de `POST` exatamente como o roteiro pede, a etiqueta "Acima do
catálogo" na lista e o item como **Pacote** com o nome no detalhe. O que diverge: ao finalizar, a venda passa a valer
**R$ 320,00** na lista e no detalhe, contra os R$ 640,00 do item e do razão (o lançamento `sale.package.sold` é de 640,00 e
o saldo do cliente subiu 640,00). O documento de venda e o razão ficam com valores diferentes. Grau: verificado (tela + banco).

**Passos 6–9: não executados** (regra do FALHOU).

### Desfecho (execução 2026-11-04)
[x] FALHOU — passo 5 divergiu: a venda de pacote com Qtd 2 fica com subtotal/total R$ 320,00 depois do `PUT` de
finalização, contra R$ 640,00 do item e do lançamento. Evidência acima. Nenhum passo seguinte foi executado.

### Registro (execução 2026-11-04)
- **VP-1 (alto: documento de venda × razão)** — `server/src/features/dynamicTables/rules/plugins/SalesPlugin.ts:323` (e o
  mesmo cálculo em `:153`, na validação de desconto da finalização): `const qty = isProduct ? Number(it.data?.quantity || 1) : 1;`
  conta quantidade só para `Product`; pacote (e serviço) vale sempre 1. O `afterUpdate` roda a cada `PUT` da venda (status ou
  pagamento) e regrava `subtotal`/`totalAmount` com esse cálculo (`:330`). Efeitos: venda de pacote com Qtd > 1 perde valor ao
  finalizar, ao cancelar e ao pagar; a validação "Desconto não pode ser maior que o subtotal" (`:157`) usa o subtotal errado.
  Instrumentação → correção: teste de integração do `SalesPlugin` que cria venda + item `type: 'Package'`, `quantity: 2`,
  `unitPrice: 320`, faz `PUT {status:'Finalized'}` e espera `subtotal === 640` (hoje dá 320); depois a correção no cálculo do
  `qty` (decidir se serviço também conta quantidade — o modal de serviço não tem campo Qtd hoje; inferido).
- **VP-2 (conhecido, segue aberto)** — F11: "Finalizar Venda" do modal cria a venda `Finalized` antes dos itens
  (`FinanceService.ts:42`, `useSalesCreateForm.ts:270`). A emenda 2026-10-05 continua valendo.
- **VP-3 (baixo, i18n)** — o cabeçalho da tabela genérica Packages mostra `KEY 'ACTIONS (PT)' RETURNED AN OBJECT INSTEAD OF
  STRING.` e a coluna `ACTIVE` sem tradução; o detalhe da venda mostra `DISCOUNT` e `TAXES` em inglês
  ([print](runbook-evidence/VENDA-PACOTE-2026-11-04/pre-01-catalogo-pacotes.png),
  [detalhe](runbook-evidence/VENDA-PACOTE-2026-11-04/passo5-03-detalhe.txt)). `common.json` tem `"actions"` como objeto
  (`my-app/public/locales/pt/common.json:586`); quem chama `t('actions')` como string não foi localizado nesta sessão.
  Instrumentação → correção: teste do cabeçalho da tabela genérica que reprova chave i18n devolvendo objeto.
- Desvios de dado no dev.db: pacotes `Pacote C7 Inativo`, `Pacote C7 30 dias`, `Pacote C7 Sem validade`; vendas canceladas
  `cmw1kxh65006hcio0uqoehxao` e `cmw1kyak0006qcio0n9wa1fzw` (com aceite gravado); venda finalizada
  `cmw1ldyi70077cio0ammofgtc` (subtotal 320 gravado pelo VP-1), lançamento `cmw1le47n007mcio02e4vuatr` e saldo do
  `Cliente H2` no `Pacote H2` +640,00.
- Rastreio: nota `FE-INCR-VENDA-PACOTE` fica para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.

---

## Execução 2026-11-11 — AI tester (reexecução depois do VP-1) — FALHOU no passo 9

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-11
Autorização (citada literalmente): dono, chat, 2026-11-11: *"rode todos os runbooks que são possíveis"* (sessões Sonnet
médio), com a emenda de 2026-10-29 de `docs/operating-manual/RUNBOOK-FORMAT.md` (assinatura como "AI tester").

**Ambiente.** Build de produção da `main` em `54e5086d0` (o VP-1, `f5943677b` / #1052, e o VP-1b, `d1d3f3fee` / #1068, são
ancestrais: `git merge-base --is-ancestor` → ok). Servidor `127.0.0.1:4200`, front `127.0.0.1:3200` (build com
`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4200/api`), usuário `seed-presumido`, unidade `seed-unit-presumido`, cliente
`Cliente H2`. **Banco: cópia privada** do `server/prisma/prisma/dev.db` do checkout principal (db + wal + shm, sha256 do
db `f959c9a1…`), com `prisma migrate deploy` aplicado em cima (a cópia estava atrás da `main`; a última migração é
`20261107170000_dfe_signer_pareamento`). A cópia existe para não escrever no banco que a outra sessão do H2 usa em paralelo.
Runner `scripts/runbook-tela.mjs` (Chromium headless shell), log de rede no lugar do DevTools (`[net]`).
Leitura de banco por `node:sqlite` em modo só leitura.

**Pré-condições.** P1 `main` `54e5086d0`. P2/P3 servidor e front de pé (`GET /api` → 200; `/users/login` → 200). P4 o seletor
mostra Produtos / Serviços / Pacotes (passo 1). P5 o seletor de pacote lista os 4 ativos e **não** lista o inativo (passo 2).
P6 `aboveCatalogPrice` já no schema (o `POST` da venda o aceita e o devolve). P7 cliente e unidade existem. P8 trocado pelo
log de rede. Desvio de método: no modal, "Pagamento" ficou `Pix` e o aceite da validade foi marcado em toda venda (o bloco
"Validade do pacote" é posterior ao roteiro de 05/10 e o pede quando o pacote tem validade).

**Passo 1.** Nova Venda → Pacotes ([print](runbook-evidence/VENDA-PACOTE-2026-11-11/passo1-01-cabecalho-pacote.png)).
```text
[eval] {"frase":true,"avulso":false}
```
Grau: verificado. **Confere.**

**Passo 2.** Unidade + cliente; Itens → "Adicionar pacote"; seletor aberto
([seletor](runbook-evidence/VENDA-PACOTE-2026-11-11/passo2-01-seletor-aberto.png) ·
[linha](runbook-evidence/VENDA-PACOTE-2026-11-11/passo2-02-linha-preco.png)).
```text
[eval] Pacote C7 Vencido | Pacote C7 Sem validade | Pacote C7 30 dias | Pacote H2        (o "Pacote C7 Inativo" não aparece)
[eval] tag 1|R$ 300,00|R$ 0,00        (qtd | preço unitário | desconto, depois de escolher "Pacote H2")
```
Grau: verificado. **Confere.**

**Passo 3.** Preço `250,00` → aviso; "Finalizar Venda"; preço `300,00` + Desconto `50,00`
([aviso](runbook-evidence/VENDA-PACOTE-2026-11-11/passo3-01-aviso-preco-menor.png) ·
[após o clique](runbook-evidence/VENDA-PACOTE-2026-11-11/passo3-02-finalizar-recusa.png) ·
[total](runbook-evidence/VENDA-PACOTE-2026-11-11/passo3-03-total-com-desconto.png)).
```text
[eval] {"avisoNaTela":true}                      ("Para cobrar menos que o catálogo, use o campo Desconto." com preço 250)
(clique em Finalizar Venda: nenhuma linha [net] nesse trecho do log; o aviso segue na tela)
[eval] {"avisoNaTela":true}
[eval] Subtotal / R$ 300,00 / Desconto / TOTAL / R$ 250,00 / …
[eval] Salvar Rascunho:disabled=false | Finalizar Venda:disabled=false
```
Grau: verificado. **Confere**, com a mesma nota de 04/11: a recusa não abre faixa nova, a frase fica na linha (leitura:
inferido).

**Passo 4.** 2ª linha com `Pacote C7 30 dias` e "Finalizar Venda"
([print](runbook-evidence/VENDA-PACOTE-2026-11-11/passo4-01-um-pacote-por-venda.png)).
```text
[eval] {"msg":true}        ("Uma venda leva um único pacote. Para outro pacote, crie outra venda."; nenhuma linha [net])
```
Grau: verificado. **Confere.**

**Passo 5 — conferido (VP-1 corrigido).** Qtd 2 (botão "+"), preço `320,00`, desconto `0`; caminho da emenda F11 (o
`FinanceService.createSaleWithItems` segue criando a venda antes dos itens): **Salvar Rascunho** e **Finalizar** pela lista
([itens](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-01-itens-qtd2-320.png) ·
[lista do rascunho](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-02-lista-rascunho.png) ·
[confirmação](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-03-lista-apos-finalizar.png) ·
[lista finalizada](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-03-lista-finalizada.png) ·
[detalhe](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-04-detalhe.png)).
```text
[eval] Subtotal / R$ 640,00 / Desconto / TOTAL / R$ 640,00 / …
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-11","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw","status":"Draft","paymentStatus":"Pending","subtotal":640,"totalAmount":640,"paymentMethod":"Pix","aboveCatalogPrice":true}}
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmwckeagc000ncizkq2rk6x0v","packageId":"cmvtxuu8f0015ci9c87vo9g6f","type":"Package","quantity":2,"unitPrice":320}}
[console.error] Failed to load resource: the server responded with a status of 400 (Bad Request)
[net] POST /api/package-acceptances -> 400  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmwckeagc000ncizkq2rk6x0v","textVersion":"v1","textSha256":"6a9ec8a1c543710b4c73a3882953401fea302a2bf9cfbbd5dcdee02a8d34da54"}
   res: {"code":"VALIDATION_ERROR","message":"Venda sem valor total válido."}
[eval] ["11/11/2026\tCliente H2\t Rascunho Acima do catálogo \tPendente\tR$ 640,00\tR$ 640,00\t", …]
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmwckeagc000ncizkq2rk6x0v -> 200  req: {"data":{"status":"Finalized"}}
[eval] ["11/11/2026\tCliente H2\t Finalizada Acima do catálogo \tPendente\tR$ 640,00\tR$ 640,00\t", …]
detalhe: Finalizada · Pendente · Acima do catálogo … Subtotal R$ 640,00 · Total R$ 640,00
         Itens: Tipo Pacote | Produto/Serviço Pacote H2 | Qtd 2 | Preço R$ 320,00
banco (leitura):
dynamic_table_data cmwckeagc000ncizkq2rk6x0v | Finalized | subtotal 640 | totalAmount 640 | aboveCatalogPrice 1
journal_entries cmwckfu8k0011cizk8qkm1x31 | sale.package.sold | Posted | postings: débito 64000 (1.1.2.01) | crédito 64000 (2.1.1.01)
package_balance_movements cmwckfu8w0017cizk8nwii4a0 | credit | deltaCents 64000 | sale cmwckeagc000ncizkq2rk6x0v
```
Os dois corpos de `POST` batem com o roteiro, a etiqueta "Acima do catálogo" está na lista e o item aparece como **Pacote** com
o nome no detalhe. **A divergência de 04/11 sumiu:** depois da finalização a venda vale R$ 640,00 no banco, na lista e no
detalhe, igual ao item e ao lançamento (era R$ 320,00). Grau: verificado (tela, rede e banco). Ressalva: o `PUT` devolve a
linha com `totalAmount: 0` no corpo da resposta (o recálculo roda depois de montar a resposta); a leitura do banco logo
em seguida mostra 640. **À margem do passo, achado VP-4 (abaixo):** o `POST /api/package-acceptances` devolve 400 e a tela
mostra o toast "Venda sem valor total válido." + o aviso "A venda foi criada, mas o aceite da validade não foi registrado".
O roteiro de 05/10 não menciona o aceite; os resultados esperados do passo 5 estão atendidos.

**Passo 6.** Pacote H2, qtd 1, preço `300,00`; Salvar Rascunho + Finalizar
([itens](runbook-evidence/VENDA-PACOTE-2026-11-11/passo6-01-itens-300-qtd1.png) ·
[lista](runbook-evidence/VENDA-PACOTE-2026-11-11/passo6-02-lista.png)).
```text
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-11","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw","status":"Draft","paymentStatus":"Pending","subtotal":300,"totalAmount":300,"paymentMethod":"Pix","aboveCatalogPrice":false}}
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmwckh4qp001bcizk52vfo59i","packageId":"cmvtxuu8f0015ci9c87vo9g6f","type":"Package","quantity":1,"unitPrice":300}}
[console.error] Failed to load resource: the server responded with a status of 400 (Bad Request)
[net] POST /api/package-acceptances -> 400  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmwckh4qp001bcizk52vfo59i","textVersion":"v1","textSha256":"6a9ec8a1c543710b4c73a3882953401fea302a2bf9cfbbd5dcdee02a8d34da54"}
   res: {"code":"VALIDATION_ERROR","message":"Venda sem valor total válido."}
[net] PUT /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data/cmwckh4qp001bcizk52vfo59i -> 200  req: {"data":{"status":"Finalized"}}
[eval] ["11/11/2026\tCliente H2\t Finalizada \tPendente\tR$ 300,00\tR$ 300,00\t","11/11/2026\tCliente H2\t Finalizada Acima do catálogo \tPendente\tR$ 640,00\tR$ 640,00\t"]
```
`"aboveCatalogPrice": false` no corpo; sem etiqueta na linha. Grau: verificado. **Confere** (o 400 do aceite repete o VP-4).

**Passo 7.** Venda de serviço (Corte H2, R$ 80,00) do mesmo cliente: Salvar Rascunho + Finalizar; detalhe → **Pagar** → forma
"Saldo de pacote" ([print](runbook-evidence/VENDA-PACOTE-2026-11-11/passo7-02-select-saldo-pacote.png)).
```text
[net] POST …/data -> 201  req: {"data":{"date":"2026-11-11","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw","status":"Draft","paymentStatus":"Pending","subtotal":80,"totalAmount":80,"paymentMethod":"Pix"}}
[net] POST …/data -> 201  req: {"data":{"saleId":"cmwckibre001zcizks66f0h05","serviceId":"cmvtxuu71000tci9chpnj578o","type":"Service","quantity":1,"unitPrice":80}}
[net] PUT …/data/cmwckibre001zcizks66f0h05 -> 200  req: {"data":{"status":"Finalized"}}
[set] select = Package Balance -> ok Package Balance
[eval] … {"opts":[":Selecione o pacote…","cmvtxuu8f0015ci9c87vo9g6f:Pacote H2 — saldo R$ 1.940,00 — vence em 11/11/2027","cmw1kcewn006dcio0uyrv1vd0:Pacote C7 Sem validade — saldo R$ 120,00 — sem validade"]}
```
O saldo do pacote vendido nos passos 5–6 aparece como opção. Grau: verificado. **Confere.**

**Passo 8.** Venda de pacote do passo 5 (finalizada, pendente) → **Pagar** → "Saldo de pacote"
([print](runbook-evidence/VENDA-PACOTE-2026-11-11/passo8-01-select-pacote-propria-venda.png)).
```text
[eval] abriu 11/11/2026	Cliente H2	 Finalizada Acima do catálogo 	Pendente	R$ 640,00	R$ 640,00
[set] select = Package Balance -> ok Package Balance
[eval] … {"opts":[":Selecione o pacote…","cmw1kcewn006dcio0uyrv1vd0:Pacote C7 Sem validade — saldo R$ 120,00 — sem validade"]}
```
O `Pacote H2` (o próprio vendido) **não** aparece; o saldo de outro pacote (`Pacote C7 Sem validade`) aparece. Grau: verificado.
**Confere.**

**Passo 9 — FALHOU.** Console do navegador ao longo dos passos 1–8: nos passos 1–4, 7 e 8 nenhuma linha `[console.error]`/
`[console.warn]`. Nos passos 5 e 6 o runner registrou, a cada venda de pacote com validade, uma linha vermelha:
```text
[console.error] Failed to load resource: the server responded with a status of 400 (Bad Request)
   ← par do [net] POST /api/package-acceptances -> 400  res: {"code":"VALIDATION_ERROR","message":"Venda sem valor total válido."}
```
Esperado: "sem erro vermelho". Divergência: duas linhas de erro (uma por venda de pacote criada), mais o toast de erro na tela
([print](runbook-evidence/VENDA-PACOTE-2026-11-11/passo5-02-lista-rascunho.png)). Causa lida no código, ver VP-4. Grau: verificado
(tela e rede); a causa é inferida da leitura do serviço e do plugin e confirmada pelo banco (venda no rascunho com
`totalAmount` 0; nenhuma linha em `package_validity_acceptances` para a venda).

### Desfecho (execução 2026-11-11)
[x] FALHOU — passo 9 divergiu: console com erro vermelho (`POST /api/package-acceptances` → 400) em toda venda de pacote com
validade criada pelo modal. Passos 1–8 conferem; o VP-1 está corrigido (venda de Qtd 2 vale 640,00 no banco, na tela e no
razão). Não há passo depois do 9.

### Registro (execução 2026-11-11)
- **VP-4 (alto: o modal Nova Venda nunca grava o aceite da validade)** — `server/src/features/packages/services/PackageAcceptanceService.ts:202`
  lê `totalAmount` da venda e recusa `<= 0`. Desde o INV F-40.1 (#1168, `128467696`, `SalesPlugin.ts:213-216`) a venda criada por
  usuário nasce com `subtotal`/`totalAmount` 0 (só o `afterUpdate` recalcula, na finalização). O modal Nova Venda registra o
  aceite logo depois de criar os itens (`SalesCreateModal.tsx:252-254`), ainda no rascunho, então o `POST /package-acceptances`
  cai sempre em "Venda sem valor total válido." (400). Efeito: nenhum aceite de validade é gravado pelo caminho normal; o
  detalhe mostra "ACEITE NÃO REGISTRADO" + o botão "Registrar aceite" depois de finalizada. O runbook `PACOTE-VALIDADE` depende
  disso. Instrumentação → correção: teste de integração que cria rascunho de pacote com item (total 0 na linha) e chama o
  aceite, esperando 201; a correção é decisão da sessão de correção (ler o total dos itens, como as pontes passaram a fazer
  no #1168, ou deixar o aceite para depois da finalização; muda o contrato do modal).
- **Roteiro desatualizado** — o passo 5 (e o 6) manda "Finalizar Venda" no modal; segue valendo a emenda F11. Desde o F-40.2 a
  criação de venda `Finalized` por usuário é recusada pelo plugin ("A venda é criada como rascunho; finalize-a depois de incluir
  os itens."), então o "Finalizar Venda" do modal tende a devolver 400 em vez de criar a venda órfã (inferido, não exercitado).
- Desvios de dado na cópia privada do dev.db: vendas de pacote `cmwckeagc000ncizkq2rk6x0v` (640,00, finalizada) e
  `cmwckh4qp001bcizk52vfo59i` (300,00, finalizada), venda de serviço `cmwckibre001zcizks66f0h05` (80,00, finalizada),
  lançamentos `sale.package.sold`, saldo do `Cliente H2` no `Pacote H2` +940,00. O banco compartilhado do dono não foi tocado.
- Rastreio: nota `FE-INCR-VENDA-PACOTE` atualizada com o desfecho de 11/11.
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-11). A assinatura atesta
  a execução e a conferência da evidência; não substitui oráculo externo.
