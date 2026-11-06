# RUNBOOK: H2-PACOTE-VALIDADE — Sign-off de browser da validade do pacote e do aceite (FE-INCR-PACOTE-VALIDADE)

> Preparado por agente em 2026-10-05 contra a branch `claude/fe-incr-pacote-validade-258dfe`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche. O agente verificou o que o CI vê (`tsc`, `test:types`,
> vitest, build de produção, unit + integração do server) e **mediu** em build de produção, por sonda, a caixa da validade
> (`font-size` 16px, `font-weight` 600, borda 2px) e a ordem das chamadas (venda → itens → aceite) num banco-cópia
> descartável; ele **não** leu o PDF impresso nem conferiu a tela como um humano o faria — é isso que este runbook fecha.
> Este runbook é o gate humano que o F-JUR-4 pede antes do deploy do PACOTE-VALIDADE (junto com o M2).

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-05 — "Executa o FE-INCR-PACOTE-VALIDADE" (nó `FE-INCR-PACOTE-VALIDADE`,
`docs/accounting/FE-INCR-PACOTE-VALIDADE-brief.md` item 17). Rastreio: `docs/plano/nos/FE-INCR-PACOTE-VALIDADE.md`
(`estado_detalhe`) e o item de sign-offs de browser do Bloco A (`docs/plano/gates/`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR do FE-INCR-PACOTE-VALIDADE **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Servidor no ar com o `dev.db` populado (`server/prisma/prisma/dev.db`) **depois de aplicar a migração** `20261005120000_add_package_validity_acceptances` (`cd server && npx prisma migrate deploy`) e um `AccountingBinding` `Active` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` (ou `401`: o servidor responde) | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` (a tela está atrás de `withAuth`) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | Catálogo com **2 pacotes ativos**: um com `validityDays` = `30` e outro **sem** validade (vazio/`0`) | Tabela "Packages" | [ ] |
| P5 | 1 cliente cadastrado e 1 unidade; sessão do operador logada | — | [ ] |
| P6 | Um cliente com **saldo vencido** num pacote (para o passo 9): `expiresAt` anterior a hoje em `customer_package_balances` (acerto manual no banco de teste — não em produção) | `sqlite3 …/dev.db "select packageId, expiresAt from customer_package_balances"` | [ ] |
| P7 | Impressora real ou "Salvar como PDF" para conferir o tamanho da cláusula impressa; DevTools aberto (console e Network, filtro `package-acceptances`) | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando, o PDF) — nunca uma frase descrevendo que deu certo.

1. "Nova Venda" → **Pacotes**; unidade + cliente; aba **Itens** → adicionar o pacote **com validade (30 dias)**.
   Resultado esperado: abaixo dos itens aparece o bloco "Validade do pacote" — caixa com borda, "Válido até DD/MM/AAAA" e o
   texto legal inteiro (prazo, data da compra, último dia, regra do feriado, "não será devolvido"). O último dia confere
   com a conta (data da venda + 30; se cair em feriado nacional, o dia útil seguinte). Os botões "Salvar Rascunho" e
   "Finalizar Venda" estão **desabilitados**.
   EVIDÊNCIA: [screenshot da aba Itens com o bloco e os botões desabilitados]

2. Marcar "Li este texto ao cliente e ele concordou".
   Resultado esperado: os dois botões habilitam. Voltar ao Cabeçalho, mudar a **data** da venda e voltar a Itens: o
   bloco mostra a data/último dia novos e o checkbox **volta desmarcado** (botões desabilitados de novo).
   EVIDÊNCIA: [screenshot do bloco após a troca de data, checkbox desmarcado]

3. Com o checkbox marcado, **Salvar Rascunho** (ou Finalizar Venda, se o defeito do modal Nova Venda registrado em "Achados" já estiver
   corrigido).
   Resultado esperado: no Network, nesta ordem: `POST` da venda, `POST` do item, `POST /api/package-acceptances` → `201`
   com `textVersion` `v1`. O corpo do `POST` do aceite tem **só** `unitId`, `saleId`, `textVersion`, `textSha256`.
   EVIDÊNCIA: [as três linhas do Network + o corpo do POST do aceite]

4. Abrir a venda criada na lista (detalhe).
   Resultado esperado: a "Validade do pacote" aparece em destaque (a mesma caixa) com o texto **gravado**; abaixo, "Aceite
   registrado por … em DD/MM/AAAA HH:MM (texto v1)"; **sem** o selo "Aceite não registrado". A data do cabeçalho do detalhe
   é o dia da venda (não o dia anterior).
   EVIDÊNCIA: [screenshot do detalhe]

5. Sonda de estilo (DevTools → Console) na caixa do detalhe:
   `getComputedStyle(document.querySelector('[data-testid="package-validity-text"]'))` → `fontSize`, `fontWeight`.
   Resultado esperado: `fontSize` ≥ `16px` e `fontWeight` ≥ `600`.
   EVIDÊNCIA: [saída da sonda]

6. No detalhe, **Baixar comprovante (PDF)**; abrir e **imprimir** (ou salvar como PDF e conferir no leitor).
   Resultado esperado: unidade, cliente, pacote, valor, data da venda; a **cláusula** em caixa com borda, em negrito, maior
   que o corpo do restante (12pt); o aceite (quem, quando em horário de Brasília, versão); a linha "Assinatura do cliente"
   e nada de "ACEITE NÃO REGISTRADO". Colher a assinatura do cliente no papel (F-FE-PV-3 b) e guardar.
   EVIDÊNCIA: [o PDF anexado + foto/scan da cláusula impressa com a régua do tamanho]

7. Venda sem aceite: o modal Nova Venda não deixa salvar sem o checkbox, então crie uma venda do pacote com validade **pela tabela
   genérica** (Sales + Sale Items, sem passar pelo modal Nova Venda) e abra o detalhe.
   Resultado esperado: selo vermelho "Aceite não registrado", a validade em destaque e o botão "Registrar aceite". Clicar,
   marcar o checkbox e "Confirmar aceite": o selo some e o aceite aparece. Em **outra** venda igual, ainda sem aceite,
   baixar o PDF: a cláusula leva a marca **ACEITE NÃO REGISTRADO**.
   EVIDÊNCIA: [screenshot do selo + do botão + do aceite depois; o PDF com a marca]

8. Venda do pacote **sem validade**: modal Nova Venda → pacote sem validade.
   Resultado esperado: o bloco mostra "Sem validade", **não há** checkbox e a venda pode ser salva sem aceite; no detalhe, sem
   selo e sem botão de PDF.
   EVIDÊNCIA: [screenshot do modal Nova Venda + do detalhe]

9. Venda de **serviço** finalizada para o cliente do P6 → **Pagar** → "Saldo de pacote".
   Resultado esperado: cada saldo mostra "vence em DD/MM/AAAA" ou "sem validade"; o saldo **vencido** aparece
   **desabilitado**, com "vencido em DD/MM/AAAA"; ao escolher um saldo válido, a frase "Este saldo vence em …" aparece
   em destaque (≥ 16px, semibold).
   EVIDÊNCIA: [screenshot do select com as três situações + da frase em destaque]

10. (Só se o passo 9 permitir forçar) Chamar `POST /api/sales/pay` com o `packageId` do saldo vencido pelo DevTools.
    Resultado esperado: `400` com o código `PACKAGE_BALANCE_EXPIRED` (a autoridade é o servidor, não o select).
    EVIDÊNCIA: [linha do Network com o corpo da resposta]

11. Console do navegador ao longo de todos os passos.
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

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2)

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*.

**Ambiente:** build de produção `3077cda9` (= `main` `f5dc79b7` + só docs) da worktree `agent-af93873e91c9b426b`, servidor
em `127.0.0.1:4100` (`DFE_PARTNER=manual`, `DFE_PARTNER_ENV=homologacao`), app em `127.0.0.1:3100`, `dev.db` real
(`server/prisma/prisma/dev.db`). Backup antes da 1ª escrita: `server/prisma/backups/c7-irmaos-cont-20261104-014813/`
(db + wal + shm; sha256 do db `c364fc853c7c3f445d1a38cecf3beafcf56b26e9795a915fd6dff205cb55f274`, igual ao original;
`PRAGMA integrity_check` → `ok`). Runner Puppeteer headless com clique por DOM; o DevTools foi trocado pelo log de rede do
runner (`[net]`) e por sondas `getComputedStyle`. Usuário `seed-presumido`, unidade `seed-unit-presumido`, cliente `Cliente H2`.

**Pré-condições.** P1 `main` `f5dc79b7` (o PACOTE-VALIDADE está em `main`). P2 migração aplicada (`package_validity_acceptances`
existe no banco) e binding `Active`. P3 build de produção, `http://127.0.0.1:3100/` → `200`. P4 `Pacote C7 30 dias`
(`validityDays` 30) e `Pacote C7 Sem validade`, criados pela tela em 04/11 pelo `RUNBOOK-H2-VENDA-PACOTE.md`. P5 ok.
**P6 — desvio de dado e de método:** em vez do acerto manual no banco, criei o saldo vencido pela tela: pacote novo
`Pacote C7 Vencido` (30 dias) e venda dele com data `2026-09-15`, finalizada. O saldo existe, mas o job de expiração
(`Package expiry reconcile`, a cada 5 min) o zera na rodada seguinte (ver passo 9). **P7 — não se sustenta:** sem
impressora e sem papel; o PDF foi baixado e lido por extração de texto e de fonte, sem impressão.

**Passo 1.** Nova Venda → Pacotes; Itens → `Pacote C7 30 dias`
([print](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo1-01-bloco-validade.png) ·
[texto](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo1-01-bloco-validade.txt)).
```text
VALIDADE DO PACOTE
Válido até 04/12/2026
VALIDADE DO PACOTE: este pacote vale por 30 dias corridos a contar da data da compra (04/11/2026). Último dia para usar: 04/12/2026. Se o prazo terminar em feriado nacional, ele vai até o dia útil seguinte, e a data acima já considera isso. O saldo não usado até essa data não será devolvido nem trocado por dinheiro.
Li este texto ao cliente e ele concordou
[eval] Salvar Rascunho:disabled=true | Finalizar Venda:disabled=true
[eval] {"fontSize":"16px","fontWeight":"600"}          (caixa com borda âmbar no print)
```
04/11/2026 + 30 = 04/12/2026, uma sexta sem feriado nacional. Grau: verificado. **Confere.**

**Passo 2.** Marquei o checkbox; voltei a Geral, troquei a data para `2026-11-03` e voltei a Itens
([marcado](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo2-01-aceite-marcado.png) ·
[após a troca](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo2-02-data-trocada-checkbox-desmarcado.png)).
```text
[eval] aceite=true
[eval] Salvar Rascunho:disabled=false | Finalizar Venda:disabled=false
[eval] data=2026-11-03
[eval] checkbox=false
[eval] Salvar Rascunho:disabled=true | Finalizar Venda:disabled=true
print: "Válido até 03/12/2026 … data da compra (03/11/2026). Último dia para usar: 03/12/2026."
```
Grau: verificado. **Confere.**

**Passo 3.** Checkbox marcado de novo → **Salvar Rascunho** (o F11 segue aberto, VP-2 do `RUNBOOK-H2-VENDA-PACOTE.md`).
```text
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-03","customerId":"cmvtxuu6b000pci9c3yk4b6n2","simpleCustomer":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw","status":"Draft","paymentStatus":"Pending","subtotal":150,"totalAmount":150,"paymentMethod":"Pix","aboveCatalogPrice":false}}
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmw1n8fm30001ci40q8sw43cg","packageId":"cmw1kc9hi0069cio0izm4vrk4","type":"Package","quantity":1,"unitPrice":150}}
[net] POST /api/package-acceptances -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmw1n8fm30001ci40q8sw43cg","textVersion":"v1","textSha256":"d60d22d8aef15b2857fac04aa8ba9742c522cf3d785aabf54a98bd9a04b54fd7"}
   res: {"success":true,"data":{"id":"cmw1n8fnu0008ci40uhvxk52p",…,"saleDate":"2026-11-03","validityDays":30,"expiresOn":"2026-12-03","textVersion":"v1",…
```
Ordem venda → item → aceite; o corpo do aceite tem só os 4 campos. Rede completa em
[passo3-net.txt](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo3-net.txt). Grau: verificado. **Confere.**

**Passo 4.** Lista → linha `03/11/2026 … Rascunho … R$ 150,00` → Detalhes
([print](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo4-01-detalhe.png) ·
[aceite](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo4-02-detalhe-aceite.png)).
```text
Detalhes / Data 03/11/2026 / Rascunho / Pendente / … / Validade do pacote / Baixar comprovante (PDF)
Válido até 03/12/2026
VALIDADE DO PACOTE: este pacote vale por 30 dias corridos a contar da data da compra (03/11/2026). …
Aceite registrado por Seed PRESUMIDO em 04/11/2026, 01:55:35 (texto v1)
[eval] document.body.innerText.includes('Aceite não registrado') → false
```
A data do detalhe é o dia da venda (03/11). Grau: verificado. **Confere.**

**Passo 5.** Sonda no detalhe:
```text
[eval] {"fontSize":"16px","fontWeight":"600","caixa":"2px solid"}
```
Grau: verificado. **Confere.**

**Passo 6.** Detalhe → **Baixar comprovante (PDF)** →
[comprovante-pacote-cmw1n8fm30001ci40q8sw43cg.pdf](runbook-evidence/PACOTE-VALIDADE-2026-11-04/comprovante-pacote-cmw1n8fm30001ci40q8sw43cg.pdf).
Texto (extração por `pdf-parse`) e corpo de fonte (operadores do PDF, `pypdf`):
```text
Comprovante de Venda de Pacote / seed-unit-presumido / Cliente Cliente H2 / Pacote Pacote C7 30 dias / Valor R$ 150,00 / Data da venda 03/11/2026
VALIDADE DO PACOTE: … Último dia para usar: 03/12/2026. … não será devolvido nem trocado por dinheiro.
Aceite registrado por Seed PRESUMIDO / Em 04/11/2026 01:55 (Brasília) / Versão do texto v1
Assinatura do cliente: Cliente H2 / Documento gerado eletronicamente.
fonte da cláusula: Arial-BoldMT 16.0 pt   ·  corpo: ArialMT 13.0 pt (rótulos) / 12.0 pt (unidade, assinatura)
"ACEITE NÃO REGISTRADO" no PDF: ausente   ·  retângulos (re) no conteúdo: 3
```
O que confere: unidade, cliente, pacote, valor, data, cláusula em negrito e maior que o corpo, aceite com quem, quando
(Brasília) e versão, linha de assinatura, sem a marca. Grau: verificado (texto e fonte); a borda da caixa é **inferida**
pelos retângulos, porque o PDF não foi rasterizado (sem `pdftoppm` na máquina). **Não executado: imprimir e colher a
assinatura do cliente no papel (F-FE-PV-3 b).** É oráculo humano (papel e cliente reais) → BLOQUEADO neste item.

**Passo 7 — desvio de método.** Este build não tem tabela genérica de Sales na tela: `Financeiro → Outros` lista só
Commissions, Outras Receitas, Baselines Financeiros e Packages (`FinanceView.tsx:37` tira Sales e Sale Items). Criei as duas
vendas sem aceite pela API, a partir da sessão logada do navegador (o mesmo `POST` que a tabela genérica faria, como no
DevTools). O resto foi pela tela.
```text
[net] POST /api/dynamic-tables/cmuw4yqvn000zcii0dqy91u0x/data -> 201  req: {"data":{"date":"2026-11-02",…,"status":"Draft",…,"subtotal":150,"totalAmount":150,…}}  → venda cmw1njih7000aci40t13y1jtq
[net] POST /api/dynamic-tables/cmuw4yqvo0011cii0biovlxj9/data -> 201  req: {"data":{"saleId":"cmw1njih7000aci40t13y1jtq","packageId":"cmw1kc9hi0069cio0izm4vrk4","type":"Package","quantity":1,"unitPrice":150}}
[net] POST … (mesmo par com "date":"2026-11-01") → venda cmw1njjnp000ici401qnl104l
detalhe da venda de 02/11: … Válido até 02/12/2026 … / ACEITE NÃO REGISTRADO / Registrar aceite
clique em "Registrar aceite": … / ACEITE NÃO REGISTRADO / Li este texto ao cliente e ele concordou / Confirmar aceite
[net] POST /api/package-acceptances -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmw1njih7000aci40t13y1jtq","textVersion":"v1","textSha256":"be21758ebac35f5b69f7802bc493e718f277aa241b1c1b9b87b09e35b4414570"}
depois: … / Aceite registrado por Seed PRESUMIDO em 04/11/2026, 02:05:08 (texto v1)    [eval] includes('ACEITE NÃO REGISTRADO') → false
PDF da venda de 01/11 (sem aceite): … trocado por dinheiro. / ACEITE NÃO REGISTRADO / Assinatura do cliente: Cliente H2
```
([selo](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo7-01-selo-aceite-nao-registrado.png) ·
[formulário](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo7-02-registrar-aceite-form.png) ·
[depois](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo7-03-aceite-depois.png) ·
[PDF com a marca](runbook-evidence/PACOTE-VALIDADE-2026-11-04/comprovante-pacote-cmw1njjnp000ici401qnl104l.pdf))
O selo é vermelho no print. Grau: verificado. **Confere.**

**Passo 8.** Nova Venda → `Pacote C7 Sem validade` → Salvar Rascunho → Detalhes
([modal](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo8-01-modal-sem-validade.png) ·
[detalhe](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo8-02-detalhe-sem-validade.png)).
```text
VALIDADE DO PACOTE / Sem validade / Cancelar / Salvar Rascunho / Finalizar Venda
[eval] sem checkbox
[eval] Salvar Rascunho:disabled=false | Finalizar Venda:disabled=false
[net] POST …/data -> 201 (venda cmw1nrpra000rci40xj6q4mhu, subtotal 120) · POST …/data -> 201 (item Package) · nenhum POST /api/package-acceptances
detalhe: "Validade do pacote / Sem validade"   [eval] {"selo":false,"pdf":false}
```
Grau: verificado. **Confere.**

**Preparação do P6 e do passo 9 (desvio de dado, pela tela).** Pacote `Pacote C7 Vencido` (100,00, 30 dias); venda dele
de `2026-09-15` finalizada pela lista; venda do passo 8 finalizada pela lista; venda de serviço `Corte H2` (80,00) para o
`Cliente H2`, salva e finalizada pela lista (venda `cmw1o7icf002kci40qh1g7ttk`).
```text
[net] POST /api/dynamic-tables/cmuw4yqvi000rcii0tmjxkd13/data -> 201  req: {"data":{"name":"Pacote C7 Vencido","price":100,"validityDays":30,"active":true}}
[net] PUT …/data/cmw1nyvco0013ci40x4bowpgk -> 200  req: {"data":{"status":"Finalized"}}      (venda de 15/09)
[net] PUT …/data/cmw1nrpra000rci40xj6q4mhu -> 200  req: {"data":{"status":"Finalized"}}      (sem validade, 120,00)
[net] PUT …/data/cmw1o7icf002kci40qh1g7ttk -> 200  req: {"data":{"status":"Finalized"}}      (serviço, 80,00)
```
Na 1ª abertura do Pagar (05:2x UTC), o saldo vencido **não** aparecia
([print](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo9-01-select-tres-situacoes.png)). Causa medida: o job de expiração
já o tinha zerado; o select lista só `balanceCents > 0` (`SaleActionModals.tsx:63`).
```text
GET /api/package-balances?… → {"packageId":"cmw1ny2o6000zci406p3udvel","balanceCents":0,"expiresAt":"2026-10-15T00:00:00.000Z",…,"updatedAt":"2026-11-04T05:19:52.199Z"}
package_balance_movements: credit 10000 05:16:16 · expiry 10000 05:19:52
server.log: "Package expiry reconcile complete","total":1,…,"blocked":1   (code PACKAGE_EXPIRY_NFSE_PENDING)
```
Para o P6 valer, repeti a venda vencida (`2026-09-20`, venda `cmw1ohf4d003aci40qcp8cknn`) logo depois de um tick do job e
abri o Pagar dentro da janela de 5 minutos (05:30:00 → 05:30:53 UTC; o tick seguinte foi às 05:34:52).

**Passo 9.** Venda de serviço finalizada → **Pagar** → "Saldo de pacote"
([select](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo9-02-select-tres-situacoes.png) ·
[frase](runbook-evidence/PACOTE-VALIDADE-2026-11-04/passo9-03-frase-validade.png)).
```text
[eval] 2026-11-04T05:30:49.945Z
cmvtxuu8f0015ci9c87vo9g6f=Pacote H2 — saldo R$ 1.000,00 — vence em 04/11/2027
cmw1ny2o6000zci406p3udvel=Pacote C7 Vencido — saldo R$ 100,00 — vencido em 20/10/2026 [desabilitado]
cmw1kcewn006dcio0uyrv1vd0=Pacote C7 Sem validade — saldo R$ 120,00 — sem validade
(escolhido Pacote H2) [eval] {"texto":"Este saldo vence em 04/11/2027.","fontSize":"16px","fontWeight":"600"}
```
Grau: verificado. **Confere**, com a ressalva da janela (achado PV-A).

**Passo 10.** Com o modal aberto, `POST /api/sales/pay` com o `packageId` vencido, da sessão do navegador:
```text
[net] POST /api/sales/pay -> 400  req: {"tableId":"cmuw4yqvn000zcii0dqy91u0x","saleId":"cmw1o7icf002kci40qh1g7ttk","paymentMethod":"Package Balance","packageId":"cmw1ny2o6000zci406p3udvel"}
   res: {"code":"PACKAGE_BALANCE_EXPIRED","message":"Saldo de pacote vencido em 20/10/2026."}
[eval] 2026-11-04T05:30:53.629Z
```
O modal foi cancelado sem pagar. Grau: verificado. **Confere.**

**Passo 11.** Console ao longo de todas as execuções do runner deste runbook:
```text
p1 (login): [console.error] Failed to load resource: … status of 401 (Unauthorized)   ← GET /api/auth/me antes do login (sessão do perfil expirada)
p9e (passo 10): [console.error] Failed to load resource: … status of 400 (Bad Request)  ← o 400 provocado no passo 10
demais execuções: 0 linhas [console.error] / [console.warn]
```
Os dois erros vêm de requisições esperadas (sessão velha antes do login; o 400 do próprio passo 10). Nenhum outro erro.
Grau: verificado. **Confere.**

### Desfecho (execução 2026-11-04)
[x] BLOQUEADO — pré-condição P7 (impressora real e papel) e item final do passo 6 (imprimir e colher a assinatura do
cliente, F-FE-PV-3 b): oráculo humano. Desvio do roteiro: os demais passos (1–5, o PDF do 6, 7–11) foram executados e
conferem com o esperado; passo 7 por API da sessão (sem tabela genérica de Sales na tela); P6 criado pela tela e medido
dentro da janela do job de expiração. Falta só o papel: imprimir o comprovante do passo 6 e colher a assinatura.

### Registro (execução 2026-11-04)
- **PV-A (baixo, roteiro × desenho)** — o saldo vencido só aparece "desabilitado, vencido em …" até a rodada seguinte do job
  de expiração (5 min). O job grava o movimento `expiry` e zera `balanceCents`, e o select esconde saldo zerado
  (`my-app/features/dashboard/category-views/finance/components/sales/SaleActionModals.tsx:63`,
  `rows.filter((b) => b.balanceCents > 0 && …)`). Na operação real, o ramo "vencido em" quase nunca aparece. Pergunta de
  desenho, não bug: o roteiro (P6, "acerto manual no banco") parte de um saldo vencido que dura. Ou o roteiro passa a medir
  na janela, como aqui, ou a tela passa a mostrar o saldo vencido zerado. Grau: verificado (log, banco e tela).
- **PV-B (baixo, roteiro)** — o passo 7 manda criar a venda "pela tabela genérica (Sales + Sale Items)", mas a tela não
  tem essa tabela (`my-app/features/dashboard/category-views/finance/FinanceView.tsx:37`). O roteiro precisa de outro
  caminho para a venda sem aceite (API ou fixture). Grau: verificado.
- **PV-C (observação)** — o lançamento do vencimento fica bloqueado com `PACKAGE_EXPIRY_NFSE_PENDING` (log do servidor, a
  cada rodada), porque o vencimento espera a NFS-e e o parceiro é `manual`. Parece desenho (BE-INCR-PACOTE-VALIDADE), não
  bug. Grau: inferido (só o log; o código não foi lido).
- **VP-3 (mesma classe, já registrado no VENDA-PACOTE)** — no detalhe da venda também aparecem `IS NEW CUSTOMER` e
  `IS LOYAL CUSTOMER` sem tradução, ao lado de `DISCOUNT`/`TAXES`.
- Desvios de dado no dev.db: pacote `Pacote C7 Vencido` (`cmw1ny2o6000zci406p3udvel`); vendas `cmw1n8fm30001ci40q8sw43cg`
  (rascunho 03/11, com aceite), `cmw1njih7000aci40t13y1jtq` (rascunho 02/11, criado por API, aceite registrado pelo
  detalhe), `cmw1njjnp000ici401qnl104l` (rascunho 01/11, criado por API, sem aceite), `cmw1nrpra000rci40xj6q4mhu`
  (finalizada, 120,00, sem validade), `cmw1nyvco0013ci40x4bowpgk` e `cmw1ohf4d003aci40qcp8cknn` (finalizadas, 15/09 e
  20/09, `Pacote C7 Vencido`), `cmw1o7icf002kci40qh1g7ttk` (serviço 80,00 finalizado, pagamento pendente). Saldos do
  `Cliente H2`: `Pacote C7 Sem validade` 120,00; `Pacote C7 Vencido` zerado pelo job (dois movimentos `expiry`, lançamento
  pendente de NFS-e).
- Rastreio: nota `FE-INCR-PACOTE-VALIDADE` fica para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-02). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.
