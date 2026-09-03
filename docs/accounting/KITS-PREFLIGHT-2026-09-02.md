# Kits de preflight dos gates humanos — 2026-09-02

> **O que é:** preparação de agente (copiloto de gate, `.claude/skills/luminaris-gate-copilot/SKILL.md`)
> para os itens 1, 2, 3, 4, 6 e 7 da fila `PROXIMOS-PASSOS-2026-09-02.md`. Um kit por gate, gerado por um
> agente Sonnet independente, em sequência, contra o HEAD `2e95ffe9` (= `origin/main` na data).
> O item 5 (ECF Fase 3) não é gate humano: saiu como `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md`
> (Proposed) + `BE-INCR-SPED-ECF-FASE3-lucro-real-brief.md` (forks PENDENTE).
>
> **O que NÃO é:** evidência de runbook (GHC-002), desfecho ou assinatura (GHC-001). Os runbooks seguem em
> branco. Tudo aqui é `preflight`, com grau `verificado` / `inferido` / `[DONO confere]`. Este arquivo é
> descartável por execução (GHC-004): quando os runbooks forem executados, ele vira histórico.
>
> **Autorização citável:** dono, em sessão, 2026-09-02: *"Prepara todas em sequencia em multi agents
> sonnets"*, aplicada à fila vigente. Cobre preparação; não cobre execução de gate nem ratificação de fork.

## Achados transversais (mordem mais de um gate)

| # | Achado | Grau | Gates afetados |
|---|---|---|---|
| T1 | O `dev.db` real (`server/prisma/prisma/dev.db`, raiz) tem **29 de 35 migrações** aplicadas; `accounting_bindings` não existe nele. Sem `migrate deploy` + ativação de binding o server nem sobe (`server.ts` exit 1). | verificado (leitura `mode=ro`, reconfirmado pelo orquestrador) | B-4 (P2 do H1: backup É o rollback), H1, H2, M2 |
| T2 | `referential_mappings` e `referential_accounts` têm **zero linhas** no `dev.db` real: `coverage.ready=false`, o passo 3 do H1 recusa com 400. São **8** contas-folha vivas a mapear na unidade com movimento ([EMENDA 2026-09-02] — a contagem original, 9, não filtrava soft-delete). | verificado | X2, H1 |
| T3 | O XLSX oficial da RFB **não entra direto** no conversor: cabeçalhos em português (`CÓDIGO`/`DESCRIÇÃO`/`TIPO`), `TIPO` = `A`/`S`, e o parser lê só a 1ª aba. | verificado (leitura do parser) | X2 |
| T4 | ~~PRs #250, #252, #254 seguem **OPEN**~~ **[EMENDA 2026-09-02]** a **#250 foi mergeada** (`64d8e675`, 18:01Z — corrige o site do AgingPanel); **#252 e #254 seguem OPEN**, então a classe date-only UTC shift continua viva em `main` nos demais sites. | verificado (`gh pr view`) | H2 |
| T5 | Este worktree não tem `my-app/node_modules`, `server/.env` nem `generated/prisma`; build de produção e smoke só rodam na raiz. | verificado | todos |
| T6 | ~~O recibo PDF existe no backend mas **nenhuma tela chama**~~ **[EMENDA 2026-09-02 — FECHADO por `1d68a12e`]** o botão "Recibo (PDF)" existe por lançamento no Livro Diário; o passo 4 do H2 tem onde clicar. | verificado | H2 |

## [EMENDA 2026-09-02] O que mudou depois deste kit

Este kit foi levantado contra `2e95ffe9`. No mesmo dia, o trabalho da PR #263 e a merge da #250
fecharam parte dos achados. **Os kits abaixo seguem válidos; só as linhas listadas aqui envelheceram**
(cada uma também está emendada no ponto de origem).

| Achado original | Estado hoje | Fechado por |
|---|---|---|
| T6 / H2 achado 1 — recibo PDF sem botão em tela | ✅ **fechado**: botão "Recibo (PDF)" por lançamento no Livro Diário | `1d68a12e` (#263) |
| H2 achado 2 — `accept` do upload sem extensão CNAB | ✅ **fechado**: `accept=".csv,.xlsx,.ofx,.ret,.cnab"` | `1d68a12e` (#263) |
| H2 achado 3 — runbook com vocabulário `salon.*` pré-rename | ✅ **fechado**: cada ocorrência anotada com o nome atual | `ad903847` (#263) |
| M2 achado — contagem de `DROP TABLE` no ADR-M2 desatualizada | ✅ **fechado**: ADR emendado para 11/35 | `ad903847` (#263) |
| T4 — "PRs #250, #252, #254 seguem OPEN" | ⚠️ **parcial**: a **#250 foi mergeada** (`64d8e675`, 18:01Z); #252 e #254 seguem OPEN | merge da #250 |
| H1 2ª passada — "a ECF Fase 3 não existe em código" | ⚠️ **mudou de forma**: o esqueleto existe; o bloqueio agora é o conteúdo de L/M/N | `02fc802b` (#263) |
| P5 do H1 — "9 contas-folha" | ✅ **corrigido**: são **8** vivas (a query não filtrava soft-delete) | esta emenda |

**Não mudou:** o diagnóstico central de cada gate. `dev.db` real segue em **29/35** migrações, sem
`accounting_bindings`, e `referential_mappings`/`referential_accounts` seguem com **0 linhas** —
reconferido em 2026-09-02 por leitura `mode=ro`.

---

## KIT DE EXECUÇÃO — B-4 (ensaio de restauração: backup → restore → conferência)

**Runbook:** `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`
Confirmado com `git log -1 --format=%h -- docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`:
```
97ea2089
```
(PR #253, "fix RUNBOOK-B4 steps 2/3 — DATABASE_URL override + relative-path bugs"; nenhum commit
tocou o arquivo depois disso — `git log --oneline -3 -- <path>` mostra só `97ea2089` e `b37ca9ec`.
HEAD deste worktree é `2e95ffe9` = `origin/main` — runbook não foi emendado desde meu contato.)
O cabeçalho do próprio runbook cita "preparado contra `41884c8a`", mas o commit real de última
edição é `97ea2089` (posterior) — nota, não divergência: o texto do cabeçalho não foi atualizado
no fix de steps 2/3, mas o conteúdo do runbook é o vigente.

**Ordem na fila / dependências:** item **1 de 7** em `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md`
§1 — primeiro da fila, sem dependência de nenhum outro gate. Nota do próprio doc: "Pré-condição P2
do H1: o backup **é** o rollback (não há migração *down*)" — ou seja, H1 (item 3) depende deste
gate ter rodado, não o contrário. §1 confirma: "nenhum gate de 1 a 4 depende do host", roda 100%
contra o `dev.db` real local.

---

**Preflight**

| # | Pré-condição | Como verifiquei | Resultado | Grau |
|---|---|---|---|---|
| P1 | Código = `main` `41884c8a`+, com `db-backup.mjs`/`npm run db:backup` presentes | `git log origin/main --oneline -1` → `2e95ffe9`; `grep db:backup server/package.json` → linha 22 `"db:backup": "node ./scripts/db-backup.mjs"`; `ls -la server/scripts/db-backup.mjs` → existe, 5616 bytes | **OK** | verificado |
| P2 | `dev.db` real existe e está populado | `ls -la "C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db"` → `1208320 bytes, Aug 15 23:46` (bate com CONTEXTO-COMUM). Bônus: query RO `SELECT COUNT(*) FROM journal_entries` → **15** linhas | **OK** | verificado |
| P3 | `npm ci && npx prisma generate` já rodado (client presente) | `ls server/generated/prisma` **neste worktree** → *"No such file or directory"*; `ls server/node_modules` **neste worktree** → diretório existe mas **0 entradas** (criado 30/ago, vazio) | **VERMELHO neste worktree** — ver nota abaixo | verificado |
| P4 | Portas 3001/3000 livres | `netstat -ano \| grep ":3000 \|:3001 "` → sem saída (sem match = livre) | **OK** | verificado |
| P5 | 2 leituras de referência do banco ORIGINAL (balancete + listagem), tiradas ANTES de restaurar | precisa server de pé + login com credenciais reais — não tenho | **[DONO confere]** | — |
| P6 | `OPENAI_API_KEY` não vazia em `server/.env` | `server/.env` **não existe neste worktree** (confirma CONTEXTO-COMUM). No checkout raiz (`C:/Users/smurf/Downloads/Luminaris/server/.env`, mesmo commit `2e95ffe9`): `grep "^OPENAI_API_KEY" server/.env` → linha 4 presente, valor não exibido (não colei o segredo) | **OK no checkout raiz** | verificado |
| P7 | `unitId` da unidade a testar | Query RO em `journal_entries` (checkout raiz, mesmo commit) → 3 valores distintos: `cmr2jyirc006oci1kscm61n6n`, `unit-incr6-val`, `unit-incr6-val-1782938879534`. Caminho alternativo do runbook (`AccountingBinding status=Active`) **não roda**: tabela `accounting_bindings` **não existe** no `dev.db` real — ver achado abaixo | **candidatos achados, qual usar é julgamento do dono** | inferido |

**Achado adicional, fora da tabela P1–P7 mas ligado à ressalva de "Migração pendente" do próprio
passo 3 do runbook** (fiz a checagem que o runbook manda fazer "ANTES do boot", agora, em preflight,
porque é mais barato saber antes de reservar a sessão — Phase 2 da skill):

```
DATABASE_URL="file:C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db" npx prisma migrate status
```
```
35 migrations found in prisma/migrations
Following migrations have not yet been applied:
20260821090000_accounting_binding
20260825120000_rename_salon_to_sale_vocabulary
20260830120000_add_journal_entry_date_index
20260830130000_add_job_watermark
20260830160349_counterparty_identity_normalization
20260831032258_int_to_bigint_cents
```
O `dev.db` real (a FONTE do backup, não a cópia restaurada) está **6 migrações atrás** do schema
de `main` `2e95ffe9` — inclusive a migração que cria a própria tabela `accounting_bindings`
(confirmado: `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%binding%'` → `[]`).
Grau: verificado.

---

**Pré-condições vermelhas ou não verificáveis aqui**

- **P3 — vermelha só NESTE worktree.** `npm ci && npx prisma generate` não foi de fato concluído
  aqui: `server/node_modules` existe como diretório mas está vazio, `server/generated/prisma`
  não existe. Diverge da leitura de "tem `server/node_modules`" do CONTEXTO-COMUM — o diretório
  existe, mas não está populado; achado, não corrigido por mim (GHC-003). **No checkout raiz**
  (`C:/Users/smurf/Downloads/Luminaris`, mesmo commit `2e95ffe9`, branch `main`) P3 está **OK**:
  `node_modules` com 530 entradas, `generated/prisma` presente. **Consequência operacional:** o
  script `db-backup.mjs` faz `require('generated/prisma')` e, sem `--db`/`DATABASE_URL`, resolve a
  fonte para `server/prisma/prisma/dev.db` **relativo ao `server/` de onde ele roda** — neste
  worktree isso aponta para um arquivo que não existe. `[DONO confere]`: rode o passo 1 a partir do
  **checkout raiz** `C:/Users/smurf/Downloads/Luminaris` (branch `main`, mesmo commit deste
  worktree), não deste worktree — ou populei incorretamente a ordem, então confirme com
  `cd server && npm run db:backup` de dentro do checkout raiz.
- **P5** — `[DONO confere]`: suba o server real (checkout raiz, `npm start` de produção, nunca
  `npm run dev`) e rode os dois curls (login + trial-balance + entries) do runbook, com usuário e
  senha reais, ANTES do passo 1. Guarde as respostas.
- **P7 (qual `unitId` usar)** — `[DONO confere]`: dos 3 candidatos achados
  (`cmr2jyirc006oci1kscm61n6n`, `unit-incr6-val`, `unit-incr6-val-1782938879534`), qual é "a unidade
  a testar" é decisão do dono — os dois últimos têm cara de fixture/seed de teste
  (`unit-incr6-val*`), o primeiro tem cara de `cuid()` de unidade real. Confirme pela tela
  `/accounting` (dropdown "Unidade") contra build de produção, ou aceite o candidato `cuid()` como
  o mais provável.
- **Migrações pendentes no `dev.db` real (achado acima)** — `[DONO confere]`: decida ANTES de
  iniciar o passo 1 se roda `prisma migrate deploy` contra o `dev.db` real primeiro (isso muda o
  arquivo fonte — decisão dele, não minha; eu só rodei `migrate status`, que é leitura) ou se aceita
  fazer o ensaio sabendo que o passo 3 vai provavelmente bater em `P2021` / tabela ausente.

---

**Armadilhas deste repo que mordem neste gate**

- **Server em `npm run dev` não vale** — o passo 3 do runbook já exige build de produção
  explicitamente; reforça a armadilha geral de telas atrás de `withAuth`.
- **Migração SQLite não é transacional** (memória `migracao-sqlite-nao-e-transacional`) — se o
  dono decidir rodar `prisma migrate deploy` contra o `dev.db` real para destravar o achado acima,
  um `ABORT` no meio deixa o schema pela metade; o próprio doc do repo pede prólogo `IF EXISTS`.
- **`dev.db` "aninhado"** — `server/prisma/dev.db` é isca de 0 byte (aqui nem existe); o real é
  `server/prisma/prisma/dev.db`. O próprio `db-backup.mjs` cita essa armadilha no comentário de
  cabeçalho.
- **`DATABASE_URL=... npm start` na mesma linha não funciona** — `server/.env` sobrescreve
  silenciosamente via `dotenv.config({ override: true })` fora de `NODE_ENV=test`. O runbook já
  documenta isso linha a linha no passo 3; só reforço porque é a armadilha mais fácil de repetir sob
  pressão.
- **Path relativo no `DATABASE_URL` do passo 3 resolve contra `server/prisma/`, não contra o cwd**
  — outra armadilha já coberta pelo próprio runbook, citada aqui só para reforçar que é fácil errar.

---

**Runbook em branco:** `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`
```
grep -n "EVIDÊNCIA\|Assinatura\|\[ \]" docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md | head
4:> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
21:| P1 | ... | [ ] |
22:| P2 | ... | [ ] |
23:| P3 | ... | [ ] |
24:| P4 | ... | [ ] |
26:listagem — comparar depois contra o restaurado) | ver "Leituras de referência" abaixo | [ ] |
27:| P6 | ... | [ ] |
28:| P7 | ... | [ ] |
```
Todos os 7 checkboxes de pré-condição estão `[ ]`, os 4 campos `EVIDÊNCIA:` dos passos 1–4 são
placeholders `[colar ...]`, e `Assinatura do executor: ____________` está vazia. Confirmado: nada
preenchido por mim.

---

**Achados fora de escopo:** nenhum além do já registrado acima (migrações pendentes e P3 vermelho
neste worktree são dentro do escopo do próprio B-4, não "fora de escopo").

---

**O que eu não sei**

1. Se as 6 migrações pendentes no `dev.db` real já eram esperadas pelo dono (ex.: ele sabe que
   ainda não rodou `migrate deploy` neste ciclo) ou se é novidade para ele.
2. Qual dos 3 `unitId` candidatos é "a unidade a testar" — decisão de julgamento, não de dado.
3. Se o checkout raiz (`C:/Users/smurf/Downloads/Luminaris`, branch `main`) é de fato onde o dono
   pretende rodar o ensaio, ou se ele vai preparar um worktree/checkout dedicado com `npm ci`
   completo antes de começar.
4. O tamanho do `server/.env` do checkout raiz (478 bytes, `Jul 1`) sugere que não foi tocado desde
   antes das últimas features de contabilidade — não verifiquei se outras chaves além de
   `OPENAI_API_KEY`/`DATABASE_URL` estão corretas para o boot completo (ex.: JWT secret), porque o
   runbook só pede essas duas.

---

**Caso adversarial que tentei contra a minha própria conclusão e o que aconteceu:** tentei assumir
que "P2 e P3 OK" bastava para dizer que o passo 1 rodaria limpo neste worktree — rodei
`ls server/generated/prisma` e `ls server/node_modules` de verdade em vez de confiar no texto do
CONTEXTO-COMUM ("tem `server/node_modules`"), e a checagem direta contradisse a premissa: o
diretório existe mas está vazio. Isso me levou a testar no checkout raiz, onde achei o ambiente
completo — e SÓ AÍ a query `prisma migrate status` contra o `dev.db` real revelou as 6 migrações
pendentes, que teriam derrubado o passo 3 em produção sem aviso prévio se eu tivesse me limitado a
"P1–P4 verificados, pode rodar". A pré-condição que eu teria dado como óbvia (schema da fonte =
schema do código) não está no runbook como pré-condição explícita — é uma lacuna do próprio
runbook, não só deste ambiente.

---

## KIT DE EXECUÇÃO — X2 (import do referencial RFB "PJ em Geral")

**Runbook:** `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md`, lido no commit `496730bc`
(`git log -1 --format=%h -- docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` → `496730bc`). Este
runbook já embute a **[EMENDA 2026-08-31]** sobre XLSX × conversor pipe e ano-calendário 2025 —
não é preciso reescrevê-la aqui.

**Ordem na fila / dependências:** item 2 de `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md` §1.
Fica **entre B-4 (item 1) e H1 (item 3)** na ordem da fila, mas **não há dependência declarada
entre B-4 e X2** — o master map (`ACCOUNTING-MASTER-MAP.md` linha B-4) só amarra B-4 como
pré-condição do **H1** ("a pré-condição P2 do H1 exige backup, porque o passo 1 do H1 escreve no
razão"). X2 escreve em `referential_accounts` (tabela global, sem tenancy), não no razão — nada no
runbook X2 nem no master map cita B-4 como pré-condição sua. Grau: **verificado** (lido nas duas
fontes; nenhuma menção cruzada encontrada). §1 confirma: "nenhum gate de 1 a 4 depende do host".

**Preflight**

| Pré-condição / passo do runbook | Como verifiquei | Resultado | Grau |
|---|---|---|---|
| Conversor `server/scripts/rfb-referential-to-catalog.mjs` existe e roda | `node server/scripts/rfb-referential-to-catalog.mjs --selfcheck` (não toca `dev.db`, não escreve fora do script) | `SELFCHECK OK`, exit 0 | verificado |
| Formato de entrada do conversor (passo 1) | Leitura de `server/scripts/rfb-referential-to-catalog.mjs:1-33` — `DEFAULTS = { code:0, name:1, tipo:5, parent:6, ini:2, fim:3, sep:'\|' }`; `tipoToAnalytic` aceita só `S`/`A`, qualquer outro token é erro duro | Confere com o que o runbook descreve (default de fornecedor; a própria emenda já corrige para `--tipo 4 --parent 5` no arquivo real da RFB) | verificado |
| Rota de import (passo 2) — registro e assinatura | `grep -n "referential/catalog" server/src/routes/accounting.ts` → linha 158: `router.post('/referential/catalog/import', referentialCatalogUpload, importReferentialCatalog);` (o runbook cita `:146` — **desatualizado em 12 linhas**, arquivo cresceu desde 17/08; a rota existe e a assinatura bate) | Existe; linha do runbook está stale | verificado (rota) / achado (linha) |
| Gate admin-only do import (passo 2) | `server/src/controllers/referentialCatalogController.ts:38-42`: `if (user.role !== 'ADMIN') return res.status(403)...` | Confere com o runbook | verificado |
| Body obrigatório (`unitId`, `layoutVersion`) | `server/src/features/accounting/dtos/ReferentialCatalogDto.ts:29-33` — `ImportReferentialCatalogSchema = z.object({ unitId: idLike, layoutVersion: shortText(32) }).strict()` | Confere | verificado |
| Colunas exigidas pelo CSV/XLSX de entrada do passo 2 | `server/src/lib/referentialCatalog.ts:42` — `REQUIRED_CATALOG_COLS = ['code','name','isAnalytic']`; validação em `:78-79` é `headers.includes(c)` — **case-sensitive, sem normalização** | `code`/`name`/`isAnalytic` minúsculos exatos; `CÓDIGO`/`DESCRIÇÃO`/`TIPO` do arquivo oficial **não batem** | verificado |
| Prova de validação viva (passo 3 — de-para inválido rejeitado) | Lógica em `server/src/features/accounting/services/ReferentialMappingService.ts:242-264` (`resolveDestinationLabel`): código sintético → `ValidationError` (linhas 249-253); código ausente do catálogo carregado → `ValidationError` (linhas 258-262). Testada em `server/src/features/accounting/services/__tests__/ReferentialMappingService.test.ts:182-202` (dois `it()` — "SYNTHETIC code → ValidationError" e "code ABSENT → ValidationError", ambos com `rejects.toBeInstanceOf(ValidationError)` + `expect(repo.upsert).not.toHaveBeenCalled()`) | Validação está viva em código E coberta por teste unitário — não é só instalada | verificado (código e teste lidos); **não executei o teste** (motivo abaixo) |
| Cobertura pós-import (passo 4) | `grep` em `server/src/routes/accounting.ts` confirma `router.get('/referential/coverage', getReferentialCoverage)` já registrada | Endpoint existe | verificado |
| `dev.db` real tem o schema esperado (`accounting_bindings` etc.) | Fato apurado pelo B-4: `dev.db` real está 6 migrações atrás do schema de `main`; `accounting_bindings` não existe nele | Confirmo o fato repassado, não re-verifiquei eu mesmo | inferido (herdado do B-4, grau dele = verificado) |

**Pré-condições vermelhas ou não verificáveis aqui**

- **[DONO confere] Rodar `npx jest ReferentialMappingService.test.ts`** para ver o passo 3 verde
  ao vivo — `server/node_modules` neste worktree está vazio (0 entradas, `jest` ausente). Comando
  exato a rodar na raiz (`C:/Users/smurf/Downloads/Luminaris`, branch `main`, commit `2e95ffe9`):
  `cd server && npx jest src/features/accounting/services/__tests__/ReferentialMappingService.test.ts`
- **[DONO confere] Subir o server contra o `dev.db` real e logar como admin** — este worktree não
  tem `server/.env` nem `my-app/node_modules`; build de produção do frontend não roda aqui. Rodar
  na raiz: `cd server && npm run dev` (ou o script de produção do projeto) com o `.env` real.
- **[DONO confere] Migrar o `dev.db` real para o schema de `main` antes de importar** — herdado do
  achado do B-4 (6 migrações de atraso). Se o passo 2 for executado contra o `dev.db` desatualizado,
  o resultado é imprevisível (tabela `ReferentialAccount`/`accounting_bindings` pode não bater com o
  Prisma Client gerado). Comando de checagem (leitura, não aplica): `cd server && npx prisma migrate status`.
- **[DONO confere] Confirmar qual das duas abas do arquivo oficial usar, e preparar o arquivo de
  entrada** — ver achado abaixo sobre 1 planilha por vez.
- ~~**[DONO confere] Resolver a data do Leiaute 12** (28/05/2026 vs 25/07/2026 — §6 item 4 da fila)~~
  **[RESOLVIDO 2026-09-02, fonte secundária — carimbo oficial `[DONO confere]`]** A versão vigente do Manual da ECF Leiaute 12 (Anexo ao ADE Cofis nº 2/2026) **não é nem 28/05 nem 25/07**: recebeu atualização em **23/07/2026**, superando a de 20/05/2026. Fonte: ATVI, citando o Sped como origem; a página oficial `sped.rfb.gov.br` bloqueia fetch automatizado, então o carimbo exato de "Atualização" no PDF ainda deve ser conferido pelo dono antes de fechar o `layoutVersion`. Ressalva registrada: a resposta é sobre o **Manual** (PDF); o XLSX das Tabelas Dinâmicas já baixado carrega `28_05_2026` no nome, e se a atualização de 23/07 republicou também o XLSX é parte do que o dono confere na página oficial. Registrar a versão conferida no campo `layoutVersion` do passo 2.
- **[DONO confere] Confirmar que o ano-calendário 2025 do arquivo bate com o exercício que o H1 vai
  encerrar** — a emenda do runbook já avisa; é decisão de domínio, não checagem de código.

**Armadilhas deste repo que mordem neste gate**

- `dev.db` populado real = `server/prisma/prisma/dev.db` (o de fora é isca de 0 byte) — o runbook já
  cita isso na pré-condição de server.
- Tela atrás de `withAuth` (aba Compliance, passos 2-4) só vale em **build de produção**, nunca
  `next dev`.
- Servidor de dev longevo serve código velho — reinicie do commit exato antes do passo 2.
- `resetDb()` **fecha a contabilidade** desde o PR #231 (limpa as 31 tabelas + guarda), mas isso é
  irrelevante aqui: X2 não chama `resetDb()`, é import aditivo/upsert.

**Achados fora de escopo (verificados, não pertencem ao passo-a-passo do runbook como está)**

1. **O caminho (a) da emenda ("pular o conversor") não é upload direto da planilha oficial.**
   `parseTable` (`server/src/lib/spreadsheet.ts:99-104`) lê **só a primeira worksheet**
   (`wb.worksheets[0]`) de qualquer XLSX, e a API de import não tem parâmetro de nome de aba
   (`ImportReferentialCatalogSchema` não tem campo `sheet`). O arquivo oficial baixado
   (`Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx`) tem pelo menos duas
   abas relevantes (`L100A`, `L300A`) — se `L100A` não for a primeira aba do arquivo, o import lê a
   aba errada **em silêncio** (sem erro, sem aviso). Consequência prática: o dono precisa preparar
   **um arquivo por aba** (cada um com essa aba como única/primeira planilha) e rodar o passo 2
   **duas vezes**, uma por `layoutVersion`/aba — o upsert é idempotente por
   `@@unique[layoutVersion, code]`, então duas importações sob o mesmo `layoutVersion` acumulam sem
   se sobrescrever (`ReferentialCatalogService.ts:100-105`), mas isso não está escrito no runbook.
2. **Os cabeçalhos exigidos são exatos e case-sensitive.** `REQUIRED_CATALOG_COLS = ['code','name','isAnalytic']`
   (`referentialCatalog.ts:42`) é checado com `headers.includes(c)` sem normalização
   (`referentialCatalog.ts:78-79`; `spreadsheet.ts:132` só faz `.trim()`). Os cabeçalhos do arquivo
   oficial são `CÓDIGO`, `DESCRIÇÃO`, `TIPO`, `CONTA SUPERIOR` (português, acentuado, maiúsculo) — não
   batem. O dono precisa **renomear as colunas** no arquivo preparado, não só "mapear
   mentalmente" como a emenda descreve.
3. **`isAnalytic` espera token booleano, não `A`/`S`.** `parseAnalytic` (`referentialCatalog.ts:56-60`)
   só aceita `true`/`false`/`1`/`0` (case-insensitive); qualquer outro valor vira erro de linha (rejeição
   all-or-nothing do arquivo inteiro). A coluna `TIPO` do arquivo oficial traz `A`/`S` — precisa ser
   traduzida para `true`/`false` (ou `1`/`0`) na preparação do arquivo, não só a coluna renomeada.
4. **Linha citada pelo runbook para a rota (`accounting.ts:146`) está desatualizada** — hoje é
   `:158`. Não muda o comportamento, só o apontador.

**Runbook em branco:** `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md`. Confirmado vazio (nenhum
campo preenchido, nenhum `[x]` marcado):
```
75:   EVIDÊNCIA: [saída completa do conversor]
86:   EVIDÊNCIA: [screenshot do painel com a versão importada]
92:   EVIDÊNCIA: [print da rejeição]
96:   EVIDÊNCIA: [print da cobertura]
99:[ ] PASSOU — todos os passos com evidência conferindo com o esperado
100:[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
102:[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou
107:- Assinatura do executor: ____________
```

**O que eu não sei**

1. Se `L100A` é de fato a primeira aba do arquivo `.xlsx` baixado — não tenho o arquivo (é externo
   ao repositório, não commitado; não procurei fora do worktree). Só quem abriu o arquivo sabe.
2. Se o `dev.db` real, depois de migrado (achado do B-4), preserva dados de mapeamento existentes
   que dependam do catálogo antigo (versão anterior de `layoutVersion`, se houver) — não explorei
   `referential_accounts`/`referential_mappings` no `dev.db` real porque isso exigiria abrir o banco,
   e a tarefa restringe leitura só ao necessário; não achei motivo para abrir.
3. ~~Qual das duas datas do Leiaute 12 (28/05/2026 ou 25/07/2026) é a vigente~~ — **resolvido em
   2026-09-02** (23/07/2026, fonte secundária; ver a pré-condição riscada acima e o §6.4 da fila).

**Caso adversarial que tentei contra a minha própria conclusão e o que aconteceu:** supus que o
caminho (a) da emenda ("pular o conversor, a rota já aceita XLSX") fosse literalmente "subir o
arquivo baixado". Fui ler `parseTable` e `REQUIRED_CATALOG_COLS` para confirmar — achei que a rota
aceita XLSX **de fato**, mas só a primeira aba e com cabeçalhos ingleses exatos; a emenda descreve o
*mapeamento* de colunas mas não diz que o dono precisa **criar um arquivo novo** (aba única,
cabeçalho renomeado, `TIPO` traduzido para booleano) antes de subir. Registrei isso como achado
porque, se seguido ao pé da letra, o passo 2 (caminho a) rejeitaria a planilha oficial com
`CatalogHeaderError` na primeira tentativa — não um bug, mas uma lacuna de instrução que custaria uma
rodada de FALHOU evitável.

---

## KIT DE EXECUÇÃO — H1 (Sign-off PVA, 1ª passada em Lucro Presumido) + seção H1 2ª passada (Lucro Real)

**Runbook:** `docs/accounting/RUNBOOK-H1-PVA.md`, última modificação `17ee9c9c` (é ancestral do
HEAD lido `2e95ffe9` — confirmado com `git merge-base --is-ancestor 17ee9c9c HEAD`, sem
divergência desde a emenda 2026-09-02 sobre rodar em Presumido de propósito).
Também lidos: `docs/operating-manual/RUNBOOK-FORMAT.md` (`17ee9c9c`), `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md`
(`2e95ffe9`), `docs/accounting/ACCOUNTING-MASTER-MAP.md` (`2e95ffe9`), `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md`,
`.claude/skills/luminaris-gate-copilot/SKILL.md`.

**Ordem na fila / dependências (§1 e §4 de `PROXIMOS-PASSOS-2026-09-02.md`):**
1. **B-4** (ensaio de restauração) vem antes de H1 — pré-condição P2 do H1 escreve no razão e não
   há migração *down*; o backup **é** o rollback (master map, linha B-4).
2. **X2** (import do referencial RFB) vem antes de H1 na fila (item 2 do §1), mas **não é
   pré-condição de boot do H1** — ver achado de código abaixo. É pré-condição de **qualidade do
   dado** do bloco I051/J930, não de execução.
3. H1 é item 3 do §1 — depende só de B-4 e X2 estarem fechados ou de aceitar o risco de rodar sem eles.
4. H1 **1ª passada roda em Lucro Presumido de propósito** (emenda 2026-09-02, ratificada pelo
   dono): "o serializer é Presumido MVP... pedir Lucro Real hoje seria FALHOU garantido". A 2ª
   passada (item 6 da fila) é **NOVA, obrigatória antes de operar cliente real**, e está
   bloqueada pela ECF Fase 3 (item 5, ADR + `sessao-planejamento` **não autorizada**).

---

### Preflight — 1ª passada (Lucro Presumido)

| Pré-condição (runbook) | Como verifiquei | Resultado | Grau |
|---|---|---|---|
| P1 — código = `main` `f14dc262` ou posterior | `git rev-parse HEAD` no worktree = `2e95ffe9` (posterior); runbook lido a partir daqui | ✅ OK | verificado |
| P2 — backup do `dev.db` real feito | Não existe cópia de backup neste worktree; é ato humano (B-4). Arquivo real confirmado: `ls -la "C:/Users/smurf/Downloads/Luminaris/server/prisma/prisma/dev.db"` → `-rw-r--r-- 1 smurf 197609 1208320 Aug 15 23:46 ...dev.db` | ❌ Não feito | verificado (o arquivo existe; o backup não) |
| **P2b — migrações aplicadas + binding `Active`** | Query read-only (`sqlite3` via Python, `mode=ro`) em `_prisma_migrations`: 29 aplicadas, a última `20260814120000_counterparty_notnull`; `server/prisma/migrations/` no worktree tem 34 pastas de migração + `migration_lock.toml` (35 entradas, 34 reais) → **6 migrações pendentes** (`20260821090000_accounting_binding`, `20260825120000_rename_salon_to_sale_vocabulary`, `20260830120000_add_journal_entry_date_index`, `20260830130000_add_job_watermark`, `20260830160349_counterparty_identity_normalization`, `20260831032258_int_to_bigint_cents`). `SELECT name FROM sqlite_master WHERE type='table'` confirma: **tabela `accounting_bindings` não existe** no dev.db real. | ❌ Vermelho — bate com o fato apurado pelos agentes anteriores | verificado |
| P3 — server/app em build de produção do commit exato | `ls server/node_modules` → 0 entradas (vazio); `server/generated` não existe; `server/.env` não existe; `my-app/node_modules` não existe. Nada disso roda neste worktree. | `[DONO confere]` — comando exato abaixo | verificado (ausência confirmada) / não executável aqui |
| P4 — PVA da ECD e da ECF instalados | Dado externo (máquina do executor) | `[DONO confere]` | não verificável aqui |
| P5 — mapeamento referencial com cobertura pronta + versão | Query no dev.db real: `SELECT count(*) FROM referential_mappings WHERE unitId=?` para a unidade com mais movimento (`cmr2jyirc006oci1kscm61n6n`, 7 lançamentos) → **0 linhas**. ~~`SELECT count(*) FROM accounts WHERE unitId=? AND acceptsEntries=1` → **9 contas-folha**~~ **[EMENDA 2026-09-02: a query estava errada — faltava o filtro de soft-delete que o repositório aplica]** `SELECT count(*) FROM accounts WHERE unitId=? AND acceptsEntries=1 AND deletedAt IS NULL` → **8 contas-folha** (a 9ª, `9.9.9-F Conta Teste F Incr6`, está soft-deleted e `accountRepo.findManyByUnit` a exclui). `SpedGenerationService.ts:103-109` chama `referential.coverage(scope, dto.mappingVersion)` e lança `ValidationError` se `!coverage.ready`; `ReferentialMappingService.coverage()` ([:315-338](../../server/src/features/accounting/services/ReferentialMappingService.ts:315)) define `ready = unmappedAccounts.length === 0`, universo = contas-folha (`acceptsEntries`) menos as mapeadas na versão pedida. **8 contas-folha vivas, 0 mapeadas ⇒ `coverage.ready = false` para QUALQUER `mappingVersion` hoje.** (Vale para as outras unidades também: `unit-incr6-val` e `unit-incr6-val-1782938879534` têm 10 folha cada, 0 mapeadas; `referential_mappings` tem 0 linhas no banco inteiro.) | ❌ Vermelho, causa raiz identificada | verificado |
| P6 — dados do declarante/livro/signatários do contador | Dado externo | `[DONO confere]` | não verificável aqui |
| P7 — dezembro do ano-calendário OPEN | Query em `accounting_periods` para a unidade com mais movimento: `(2026, 12, 'OPEN')`. Mas os lançamentos `Posted` de FY**2025** dessa unidade são **1 único** (`SELECT fiscalYear, status, count(*) ... GROUP BY` → `(2025,'Posted',1)`, `(2026,'Posted',5)`, `(2026,'Reversed',1)`); o `accounting_periods` só tem linhas para **ano 2026** nessa unidade — não há linha de período para 2025. O encerramento (`POST /closing/exercise`) e o gate de período operam sobre o **ano-calendário do lançamento**, não necessariamente sobre a existência de uma linha em `accounting_periods` — ver "O que eu não sei" abaixo; não testei se dezembro/2025 sem linha em `accounting_periods` bloqueia ou é tratado como aberto por default. | ⚠️ Parcialmente verificado, achado ambíguo | inferido (a mecânica exata do gate de período p/ ano sem linha carece de leitura do `PeriodGuard`/serviço de período, não feita aqui) |

**Achado extra fora do checklist do runbook — volume de dados real:** `journal_entries` no dev.db
real inteiro = **15 linhas**, `payables` = 0, `receivables` = 0, `source_documents` = 0, em 3
unidades pequenas (`unit-incr6-val`, `unit-incr6-val-1782938879534`,
`cmr2jyirc006oci1kscm61n6n`) — nomes e formato batem com seed de validação de incremento, não
uso real de cliente. A unidade com mais movimento tem só **1 lançamento** em FY2025 (D 1.1.1
Banco / C 3.1 Receita de Vendas, R$1.111,00) — há saldo de resultado a encerrar (o passo 1 não
cairia no 400 "sem saldo"), mas o volume é mínimo: a ECD/ECF gerada terá poucos registros de
movimento, o que é esperado num dry-run mas != prova de escala. Grau: verificado (query direta).

---

### Preflight — rotas, serializers e testes (verificação de código)

| Item | Verificação | Resultado | Grau |
|---|---|---|---|
| Rotas registradas (index + docs) | `grep -n "sped/ecd\|sped/ecf\|closing/exercise" server/src/routes/accounting.ts` → `router.post('/sped/ecd/generate', generateSpedEcd)` (:127), `router.post('/sped/ecf/generate', generateSpedEcf)` (:130), `router.post('/closing/exercise', closeExercise)` (:134). `grep` em `docs.paths.ts` → blocos JSDoc-OpenAPI presentes para as 3 rotas (`:2207`, `:2271`, `:2341`). | ✅ As 3 rotas existem e estão documentadas nos 2 lugares | verificado |
| Serializer ECF — regime declarado | `server/src/lib/ecf.ts:4` comentário "Pure serializer... Lucro Presumido MVP"; `build0010()` (~linha 148-152) usa `i.formaTrib ?? '5'` como default; comentário em `:330-336` lista blocos L/M/N/Q/S/T/U/V/W/X "entram vazios pela regra 'todos os blocos obrigatórios'". `SpedEcfDto.ts` não tem campo `formaTrib` (confirmado por leitura — o DTO não expõe parâmetro de regime). | ✅ Bate exatamente com o texto da emenda do runbook | verificado |
| Serializer ECD — coverage gate (D5) | `SpedGenerationService.ts:101-109`: `const coverage = await this.referential.coverage(scope, dto.mappingVersion); if (!coverage.ready) throw new ValidationError(..., { unmappedAccounts, mappingVersion })`. Erro citado no passo 3 do runbook (`unmappedAccounts`) bate literalmente com o `payload` do `ValidationError`. | ✅ | verificado |
| DTO `identQualif` obrigatório (correção 2026-09-01 do runbook) | `SpedEcdDto.ts:70`: `identQualif: z.string().min(1)` — sem `.optional()`. `:71` `codAssin` regex 3 dígitos. `:78` `indRespLegal: z.enum(['S','N'])`. `:99/:107/:108` — regras "exatamente um `indRespLegal='S'`" e "pelo menos um `codAssin='900'` e um diferente" implementadas com `.filter`/`.some`. | ✅ Confirma o texto do runbook | verificado |
| Testes existentes | `server/src/lib/__tests__/ecf.test.ts` (184 linhas) — self-check do serializer, primitivas (0010 default Presumido trimestral, COD_VER=0012, segregação 3.1/3.3), determinismo byte-a-byte (sha256), ordem canônica de blocos, blocos vazios recuperados/irrelevantes. `server/src/lib/__tests__/sped.test.ts` (453 linhas) — primitivas comuns (centavos sem float, D/C, datas sem UTC-shift, `spedLine`), builders de registro (0000, I010, I030, I050, I051 "sem COD_ENT_REF"). `SpedGenerationService.test.ts` (341 linhas) — bloqueio por cobertura incompleta (D5, o MESMO gate do P5), `ForbiddenError` por policy, I350/I355 só em exercício `CLOSED`, 12 I150 mensais, determinismo, falha de `saveFile` não deixa job em `EXPORTED`. `SpedEcfGenerationService.test.ts` (265 linhas) — bloqueio `unmappedRevenueAccounts` (o MESMO erro citado no passo 5 do runbook), 0010 Presumido, latin1+CRLF, determinismo. `ExerciseClosingService.test.ts` (171 linhas) — fecha resultado balanceado, lucro/prejuízo, break-even sem perna, rejeita 2º fechamento reinflando ano já fechado, ceiling Int32. **Ressalva de classe conhecida (memória do projeto):** esses testes de serviço usam repositório FAKE — não são prova de integração contra o schema real; a prova de schema é o `smoke-migration-gate` (P0 do runbook), não estes testes. | ✅ cobertura de unidade ampla nos 3 arquivos-chave | verificado (existência e asserções); NÃO verificado rodando (sem `node_modules` neste worktree) |
| `mappingVersion` livre × catálogo RFB (a pergunta pedida sobre X2) | `ReferentialMappingService.ts:242-264` (`resolveDestinationLabel`): se o catálogo (`referential_accounts`, populado pelo X2) **não tiver linhas para a versão pedida**, `setMapping`/`batchSet` aceita o `referentialCode` como **string livre**, sem validar contra a RFB (comentário no código: "no catalog for this version → INCR-9 free-string behavior"). Se o catálogo **tiver** linhas para a versão, o código é validado e o rótulo vem do catálogo (autoridade). **Confirmado no dev.db real:** `SELECT count(*) FROM referential_accounts` → **0** (X2 nunca rodou aqui). | X2 **não é pré-condição de boot** de P5/ECD — o gate `coverage.ready` só exige que HAJA mapeamento por conta, não que ele seja RFB-validado. X2 é pré-condição de **qualidade**: sem ele, os códigos I051/0930 que o executor digitar entram sem checagem contra a RFB real. | verificado (código + dado real) |
| Boot P0 (F-FEEDER-4) | `server/src/server.ts:34-53`: `bootstrap()` chama `await initializeAccountingSyncFromBindings()` ANTES de `app.listen()`; o `.catch` no fim do arquivo loga "Boot ABORTADO" e `process.exit(1)`. Bate com a citação do runbook (`server.ts:36`, aproximado — a função começa em `:34`). | ✅ Confirma que sem `AccountingBinding` `Active` o `npm start` não sobe (P2b é bloqueante de fato) | verificado |
| Scripts do P0 existem | `scripts/smoke-migration-gate.mjs` e `scripts/activate-salon-binding.mjs` existem no worktree (raiz do repo, fora de `server/`/`my-app/`) | ✅ existem | verificado |

---

### Pré-condições vermelhas ou não verificáveis aqui

1. **P2/B-4 — backup não feito.** `[DONO confere]`: executar `RUNBOOK-B4-RESTORE-REHEARSAL.md`
   antes, ou no mínimo copiar `server/prisma/prisma/dev.db` para um local seguro antes do passo 1
   do H1 (que escreve no razão).
2. **P2b — migrações pendentes + binding ausente.** `[DONO confere]`, na raiz `C:/Users/smurf/Downloads/Luminaris`
   (não neste worktree):
   ```
   cd server
   node ../scripts/smoke-migration-gate.mjs   # sobre CÓPIA do dev.db real — só siga se PASS
   npx prisma migrate deploy                  # no dev.db real — decisão do dono, escreve em dado real
   node scripts/activate-salon-binding.mjs    # a tabela accounting_bindings nasce vazia; migrar não basta
   ```
   Confirmação de sucesso: `npm start` imprime `Luminaris Server running on ...` em vez de `Boot ABORTADO`.
3. **P3 — build de produção.** `[DONO confere]`, na raiz:
   ```
   cd server && npm ci && npm run build && npm start
   cd my-app && npm ci && npm run build && npm start
   ```
   (worktree não tem `node_modules`/`.env`/`generated/prisma` — não roda aqui.)
4. **P4 — PVA da ECD/ECF instalados.** `[DONO confere]` — checar localmente (site do SPED/Receita).
5. **P5 — cobertura referencial.** `[DONO confere]`: na aba **Compliance**, mapear as **8 contas-folha**
   (`1.1.1` Banco, `1.1.2` A Receber, `1.1.3` Caixa, `1.1.4` A Receber Cartão/Adquirente, `2.1.1` Pacotes
   Pré-pagos, `3.1` Receita de Vendas, `3.2` Devoluções de Vendas, `4.1` Despesas Operacionais)
   da unidade contra algum plano referencial (ideal: depois do X2 ter importado o catálogo oficial,
   para que a validação não seja free-string). Sem isso o passo 3 do H1 (gerar ECD) recusa com 400
   `unmappedAccounts` — é o desfecho **BLOQUEADO**, não uma falha de execução.
6. **P6 — dados do declarante/contador.** `[DONO confere]` — levantar os campos do checklist do
   próprio runbook (separados 🏢 dono / 📗 contador), com atenção a `identQualif` (J930, obrigatório,
   é o campo que a correção de 2026-09-01 do runbook adicionou).
7. **P7 — dezembro aberto, mas achado ambíguo sobre 2025.** `[DONO confere]`: antes do passo 1,
   conferir no controle de Períodos se existe linha para **dezembro/2025** (o `accounting_periods`
   real só tem linhas de 2026 para a unidade com movimento) — se o `ANO` do encerramento no passo 1
   for 2025, confirmar que a ausência de linha de período não é tratada como bloqueio pelo gate
   (não lido aqui; ver "O que eu não sei").

---

### Armadilhas deste repo que mordem neste gate

- Servidor de dev longevo serve código velho — reiniciar do commit exato antes de confiar em
  qualquer tela (`RUNBOOK-FORMAT.md`).
- Telas atrás de `withAuth` só valem contra **build de produção**, nunca `next dev`.
- `dev.db` populado é `server/prisma/prisma/dev.db` — o `server/prisma/dev.db` (sem o `prisma/`
  duplicado) é isca de 0 byte. Confirmado neste preflight: o caminho correto tem 1.208.320 bytes.
- Migração SQLite não é transacional — um `ABORT` no meio de `prisma migrate deploy` (P0) deixa
  metade aplicada; script tem prólogo `IF EXISTS`, mas o dono deve olhar a saída linha a linha.
- Não reabrir/re-salvar o `.txt` gerado em editor de texto — a codificação Latin-1 (`ISO-8859-1`,
  confirmado em `SpedGenerationService.ts` via `Buffer.from(text, 'latin1')`) corrompe se salvo
  como UTF-8.
- **Se houver crítica no PVA:** desfecho FALHOU, parar — não seguir para os passos seguintes
  (regra do próprio runbook, reforçada pelo GHC-003 desta skill: divergência vira achado, nunca
  reexecução).

---

### Runbook em branco

Apontador: `docs/accounting/RUNBOOK-H1-PVA.md`. Confirmação de que os campos ficam vazios:

```
$ grep -n "EVIDÊNCIA\|Assinatura\|\[ \]" docs/accounting/RUNBOOK-H1-PVA.md | head
```
Resultado (colado): o arquivo tem `Executor: [nome — humano]`, `Data: [____]`, e cada um dos 6
passos termina em `EVIDÊNCIA: [colar ...]` com o placeholder entre colchetes — nenhum
preenchido; o bloco **Desfecho** lista `[ ] PASSOU`, `[ ] FALHOU`, `[ ] BLOQUEADO`, nenhum
marcado; `Assinatura do executor: ____________` vazia. Confere com o formato exigido por
`RUNBOOK-FORMAT.md`.

---

### Seção — H1, 2ª passada em Lucro Real (item 6 da fila, HOJE BLOQUEADA)

**Pré-condição bloqueante, declarada, não planejada aqui:** ~~a **ECF Fase 3 — Lucro Real**
(master map §5.1 Bloco B item 10) não existe em código. É **ADR + `sessao-planejamento` NÃO
autorizada** (ORCH-006)~~ — este kit não abre essa frente, só nomeia o delta já medido pelo
próprio mapa e pela emenda do runbook.

> **[EMENDA 2026-09-02 — o bloqueio mudou de forma, não desapareceu]** O ADR foi escrito, os Forks 1
> (endpoint dedicado) e 5 (trimestral) foram ratificados pelo dono e o **esqueleto foi implementado e
> mergeado** (`02fc802b`): existe `POST /sped/ecf/real/generate` → `SpedEcfRealGenerationService` →
> `server/src/lib/ecfReal.ts`. **A 2ª passada continua BLOQUEADA por outro motivo:** o arquivo que ela
> levaria ao PVA sai **vazio exatamente nos blocos que definem o regime** — `L001/L990`, `M001/M990` e
> `N001/N990` são marcadores sem dados (`ecfReal.ts:107-111`, `buildBlockOpen(open, false)`), e o teste
> crava que nada de dinheiro chega ao arquivo (`ecfReal.test.ts:127`: gerar com `quarters=[]` produz
> arquivo idêntico). Sem balanço/DRE (L), e-Lalur (M) e cálculo de IRPJ/CSLL (N) não existe o que a 2ª
> passada deveria provar. Isso depende dos **Forks 2, 3 e 4**, que dependem das seções L/M/N do Manual
> do Leiaute 12 (não commitado). A tabela de delta abaixo segue válida como enumeração do que falta.

**O que muda no runbook H1 na 2ª passada** (delta medido em `server/src/lib/ecf.ts`, citado pela
emenda 2026-09-02 do próprio `RUNBOOK-H1-PVA.md` e pela linha 10 do master map §5.1 Bloco B):

| Campo/bloco | Hoje (Presumido, 1ª passada) | Na 2ª passada (Lucro Real) |
|---|---|---|
| `FORMA_TRIB` (0010) | `'5'` fixo, default em `build0010()` (`ecf.ts` ~linha 152) | Passa a exigir valor de Lucro Real (código RFB correspondente); `SpedEcfDto` hoje **não tem** campo `formaTrib` — precisa ser adicionado ao DTO |
| Bloco **L** (balanço/DRE) | Marcador vazio (`ecf.ts:330-336`, "blocos de outros regimes") | Precisa serializer novo — hoje não existe nenhuma função `buildL*` em `ecf.ts` |
| Bloco **M** (e-Lalur/e-Lacs) | Marcador vazio | Serializer novo — apuração do lucro real (adições/exclusões) |
| Bloco **N** (cálculo IRPJ/CSLL) | Marcador vazio | Serializer novo |
| `HASH_ECF_ANTERIOR` (0010) | Sempre `EMPTY` (comentário: "preenchido pelo sistema; só Lucro Real") | Passa a ser preenchido pelo sistema — precisa de lógica de hash encadeado entre exercícios |
| `0010` demais campos | `formaApur` default `'T'` (trimestral), `TIP_ESC_PRE='C'` | Regime Real tem regras próprias de apuração (pode ser anual com balanço, muda `formaApur`/`TIP_ESC_PRE`) |
| `SpedEcfDto` | Sem campo de regime | Precisa expor o parâmetro (hoje a emenda do runbook é explícita: "não acrescente campo de regime a este request — a API não tem onde recebê-lo") |

**Não planejo a Fase 3 aqui** (fora do escopo desta tarefa e da fronteira desta skill —
GHC-004: não crio aparato/plano novo). O trabalho de dimensionar cabe ao ADR/BRIEF da Fase 3,
não a este kit.

---

### Achados fora de escopo

1. **P7 tem uma ambiguidade não resolvida por este preflight**: o `accounting_periods` real não
   tem nenhuma linha para o ano 2025 na unidade com movimento, embora exista 1 lançamento
   `Posted` de FY2025. Se o `ANO` do passo 1 (`POST /closing/exercise`) for 2025, não é claro se
   o gate de período trata "sem linha" como aberto por default ou bloqueia — recomendo o
   executor conferir a aba **Períodos** para 2025 antes do passo 1, e se não houver linha,
   verificar o comportamento do gate lendo o serviço de período (fora do escopo deste kit).
2. **Volume de dado real é mínimo** (15 lançamentos, 1 em FY2025) — não é um achado que bloqueia,
   mas é relevante para calibrar a expectativa: a ECD/ECF gerada nesta 1ª passada será um arquivo
   pequeno, coerente com "prova do módulo", não com operação real.

### O que eu não sei

1. Se o `ANO` que o executor vai usar no passo 1 é 2025 ou 2026 — isso muda qual achado de P7
   pesa (a linha de dezembro/2026 está `OPEN`; dezembro/2025 não tem linha).
2. O comportamento exato do gate de período quando não há linha de `accounting_periods` para o
   ano pedido (não li o serviço de período neste preflight).
3. Se o mapeamento referencial que o executor vai criar na aba Compliance vai usar uma
   `mappingVersion` já coberta pelo catálogo do X2 (se X2 rodar antes) ou uma versão livre — isso
   é decisão de execução, não de preflight.
4. Estado real do PVA/leiaute instalado na máquina do executor (P4) — inverificável por leitura de código.

### Caso adversarial que tentei contra a minha própria conclusão e o que aconteceu

Tentei falsificar "X2 é pré-condição obrigatória de boot do H1" lendo o próprio gate de cobertura
(`ReferentialMappingService.coverage()`): o gate conta **qualquer** linha de `referential_mappings`
por conta-folha, independente de ela ter sido validada contra o catálogo do X2 — e `setMapping`
aceita código livre quando o catálogo daquela versão está vazio (`resolveDestinationLabel`,
comentário "free-string behavior"). Isso derruba a hipótese "X2 bloqueia H1 tecnicamente": X2 não
é pré-condição de execução, é pré-condição de **qualidade do dado** gerado. Também tentei
confirmar que a query no dev.db real batia com o código lendo as DUAS pontas independentemente
(contagem de `referential_mappings`=0 e `referential_accounts`=0) — bateram, o que reforça que o
achado não é artefato de uma leitura só.

---

## KIT DE EXECUÇÃO — H2 (Browser sign-off final)

**Runbook:** `docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md`, lido no commit `59d67a5e`
(`git log -1 --format=%h -- docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md`). HEAD do worktree no
momento deste kit: `2e95ffe9` = `origin/main` (verificado). O runbook **não** foi emendado depois
do último contato registrado nele (emenda mais recente datada 2026-08-22; nada mais novo em
`git log --follow` até `2e95ffe9`).

**Ordem na fila / dependências:** fila `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md` linha 29:
item 4 = H2, pré-condição "LAC-A: CUMPRIDA (#259)". Confirmado: LAC-A está mergeada (master map
§5.1, PR #259, `f28ac87c`) e as ações Pagar/Cancelar/Devolver existem na tela — ver preflight linha
"LAC-A wiring" abaixo. B-4 (backup/rollback) não está listado como pré-condição textual do runbook,
mas o P0 do próprio runbook (migrar + ativar binding) escreve no `dev.db` real — é a mesma classe de
risco que B-4 cobre; não há evidência aqui de que B-4 já rodou para esta escrita específica.

**Preflight**

| Pré-condição | Como verifiquei | Resultado | Grau |
|---|---|---|---|
| Runbook em branco (sem evidência/desfecho/assinatura preenchidos) | `grep -n "EVIDÊNCIA\|Assinatura\|\[ \]" RUNBOOK-H2...md` | Todos os campos `EVIDÊNCIA:` seguem com placeholder `[...]`; `[ ]` dos 3 desfechos vazios; `Assinatura do executor: ____________` vazia | verificado |
| P0.1 migração pendente: `accounting_bindings` inexistente no `dev.db` real | Fato herdado do agente anterior (29/35 migrações aplicadas no `dev.db` real) + `ls server/prisma/migrations \| wc -l` neste worktree = 36 pastas (35 migrações + `migration_lock.toml`) | Worktree tem **35** migrações (não 31 como o runbook antigo supunha); `dev.db` real citado como tendo 29 → **hoje faltam pelo menos 6, possivelmente mais** (4 migrações novas surgiram depois: `20260830120000_add_journal_entry_date_index`, `20260830130000_add_job_watermark`, `20260830160349_counterparty_identity_normalization`, `20260831032258_int_to_bigint_cents`) | inferido (contagem própria verificada; contagem aplicada no `dev.db` real é herdada, não re-medida por mim) |
| P0.2 script de ativação existe com o nome que o runbook cita | `ls -la scripts/activate-salon-binding.mjs` | Existe, executável, 12290 bytes. Uso documentado no cabeçalho: `node scripts/activate-salon-binding.mjs --owner-user-id <id> --unit-id <id> [--sector-key beautySalon] [--db <caminho>]` | verificado |
| P0.3 evento vocabulário do runbook (`salon.sale.finalized` etc.) bate com o código atual | `grep -n "eventKey:" server/src/features/accountingBinding/fixtures/saleBinding.ts` (arquivo renomeado de `salonBinding.ts`) | **DIVERGE.** Código atual usa `sale.finalized`, `sale.settled`, `sale.returned`, `sale.package.sold`, `sale.cogs` (PR #222, RN rename, mergeado 2026-08-25 — ANTES da emenda 2026-08-22 do runbook, que é cronologicamente anterior ao rename apesar de aparecer "depois" no texto). O runbook (passos 6-11) ainda escreve `salon.sale.finalized`, `salon.package.sold` etc. Nomes de conta (D/C) e mecânica continuam corretos — só o rótulo do evento mudou. | verificado |
| LAC-A wiring: Pagar/Cancelar/Devolver existem na tela e chamam as rotas dedicadas | `grep` em `my-app/lib/services/sales.service.ts:51-68` (paySale→POST /sales/pay, cancelSale→POST /sales/cancel, returnSale→POST /sales/return) e `my-app/features/dashboard/category-views/finance/hooks/sales/useSalesData.ts:133-147` (handlers expostos) e `my-app/features/dashboard/category-views/finance/components/sales/SaleActionModals.tsx` (UI: `SalePaymentModal`, modal de cancelar/devolver com chaves i18n `finance_view:sales.confirm_cancel`/`confirm_return`) | Confirma a nota da fila: as 3 ações existem na tela e batem nas rotas dedicadas, não mais no PUT genérico | verificado |
| Painel de contabilidade (passos 1-5): abas existem como componentes | `find my-app/features/accounting/components -iname "*.tsx"` | Existem: `ReconciliationPanel`, `ImportExportPanel`, `AccountsReceivablePanel`, `AccountsPayablePanel` (nome inferido do padrão), `JournalEntriesPanel`, `DailyJournalPanel`, `JournalEntryModal` — todas renderizadas via `my-app/features/accounting/AccountingView.tsx` (composição, não rota própria) atrás de `my-app/pages/accounting/index.tsx` | verificado (existência de arquivo); não abri `AccountingView.tsx` para listar as abas 1 a 1 |
| `/accounting` está atrás de `withAuth`? | `grep -c "withAuth" my-app/pages/accounting/index.tsx` = 0; leitura do arquivo mostra guarda própria (`useAuth()` + `useEffect` redirecionando para `/users/login` se `!user`) | **NÃO usa o HOC `withAuth`** — usa um guard client-side equivalente, não o padrão citado no CLAUDE.md. `my-app/pages/dashboard/index.tsx` (onde vive a tela de venda dos passos 6-11) **usa `withAuth`** de fato. | verificado |
| Passos 6-11 rodam atrás de build de produção | armadilha do CLAUDE.md/CONTEXTO-COMUM: tela atrás de `withAuth` só vale em build de produção | `dashboard/index.tsx` usa `withAuth` → passos 6-11 exigem build de produção real, não `next dev`. Passos 1-5 (`/accounting`, guard próprio) têm o mesmo risco na prática (client-side auth check se comporta diferente em dev com fast-refresh), mas tecnicamente não é o HOC citado — registrar a mesma cautela mesmo assim. | inferido |
| Upload OFX por clique (passo 2) | `ReconciliationPanel.tsx:506`: `<input type="file" accept=".csv,.xlsx,.ofx">` + botão que dispara `fileRef.current.click()` | Existe e aceita `.ofx` no seletor | verificado |
| Upload CNAB 240 por clique (passo 3) | mesmo `<input>` (`accept=".csv,.xlsx,.ofx"`, `ReconciliationPanel.tsx:506`); backend `server/src/controllers/reconciliationController.ts:45-61` (`sniffFormat`) aceita `.ret`/`.cnab`/linha de 240 chars por CONTEÚDO, não por extensão do `accept` do FE | **RISCO REAL**: o `accept` do `<input type="file">` não lista `.ret`/`.cnab`/`.txt`/`.240` — dependendo do navegador, o diálogo de seleção pode ESCONDER o arquivo CNAB por padrão (usuário precisa trocar o filtro do diálogo para "Todos os arquivos"). O texto visível do formulário ("Envie um CSV, XLSX ou OFX") também não menciona CNAB — a tela não anuncia o caminho que o backend já suporta. | verificado |
| Recibo PDF (passo 4) — endpoint puppeteer existe e É clicável na tela | Backend: `GET /journal-entries/:entryId/receipt` registrado em `server/src/routes/accounting.ts:104`, implementação em `server/src/lib/pdf.ts`/`receiptHtml.ts`. FE: `grep -rn "receipt" my-app/features/accounting --include=*.tsx --include=*.ts` só bate em `AccountsReceivablePanel.tsx` (que é a tabela de recebimentos de AR, campo de dados `receivable.receipts` — NÃO o recibo em PDF); busca dedicada por `getEntryReceipt`/`.../receipt\`` em todo `my-app` não retorna nada. | **BLOQUEIO CONFIRMADO**: não existe botão/link em nenhuma tela do painel de contabilidade que chame `GET /journal-entries/:entryId/receipt`. O passo 4 do runbook, como escrito ("gerar o PDF... clicando"), **não tem onde clicar hoje**. | verificado |
| i18n pt/en das chaves novas de ação de venda | `grep` em `my-app/public/locales/{pt,en}/finance_view.json` para `confirm_cancel`, `confirm_return`, `package_balance`, `package_option` | Presentes nos dois idiomas, com textos coerentes (pt: "Devolver venda?" / en: "Return sale?") | verificado |
| P2 (LAC-C) saldo de pacote no modal de pagamento | `grep` em `SaleActionModals.tsx` por `packageBalancesService`/`GET /package-balances` | Import e chamada presentes — o modal busca saldo real, não é placeholder | verificado |

**Pré-condições vermelhas ou não verificáveis aqui**

- **P0 completo (migrar + ativar binding no `dev.db` real)**: `[DONO confere]`. Comando exato, nesta
  ordem, a partir da raiz `C:/Users/smurf/Downloads/Luminaris` (fora deste worktree):
  1. `node scripts/smoke-migration-gate.mjs` (roda sobre CÓPIA, PASS obrigatório antes de seguir).
  2. Backup do `server/prisma/prisma/dev.db` real, depois `npx prisma migrate deploy` (aplica as
     migrações pendentes — hoje pelo menos 6, possivelmente mais; recontar no momento da execução).
  3. `node scripts/activate-salon-binding.mjs --owner-user-id <id> --unit-id <id> --sector-key
     beautySalon` (tabela nasce vazia mesmo depois de migrada).
  4. Confirmar: `npm start` imprime `Luminaris Server running on ...`, não `Boot ABORTADO`.
- **Build de produção dos dois lados** (`cd server && npm run build && npm start`;
  `cd my-app && npx next build && npx next start`): `[DONO confere]` — este worktree não tem
  `my-app/node_modules` nem `server/.env`; só roda na raiz.
- **Unidade Salão de Beleza com dados de teste** (venda só de serviço, venda com produto de estoque,
  pagamento em 3+ meios, devolução, pacote): `[DONO confere]` — runbook já registra que não existe
  seed pronto; criar pela UI é sub-passo do passo 6, não pré-condição satisfeita.
  Não verifiquei o `dev.db` real além do fato herdado (não abri em modo leitura nesta sessão).
- **Arquivo CNAB 240 de teste**: `[DONO confere]` — escolher/gerar um arquivo cuja extensão passe
  pelo filtro do `<input accept=".csv,.xlsx,.ofx">` (ex.: renomear para `.csv` antes do upload, já
  que o backend detecta o formato pelo conteúdo) OU usar a opção "Todos os arquivos" do diálogo do
  SO, registrando qual das duas foi usada.
- **B-4 (backup) antes da migração real**: não é pré-condição textual do H2, mas escreve no mesmo
  banco — `[DONO confere]` se B-4 já rodou ou se o passo 2 do P0 acima faz esse papel sozinho.

**Armadilhas deste repo que mordem neste gate**

- **Date-only UTC shift (13 sites, PR #254 ABERTA; fix parcial PR #250 ABERTA; #252 ABERTA)**:
  ~~confirmado por `gh pr view 250|252|254` — as 3 PRs seguem `OPEN`, nenhuma mergeada em `main`.~~
  **[EMENDA 2026-09-02: a #250 foi MERGEADA (`64d8e675`) e a #254 mudou de natureza às 18:45Z** —
  passou de instrumentação (13 guardas vermelhos) para o ciclo completo (12 sites corrigidos, forks
  F1..F5 ratificados), verde na CI, bloqueada só por conflito com `main`. A classe **continua viva
  no `main` que este sign-off testa** — o que muda é o custo de fechá-la: rebase da #254, não
  trabalho de correção novo.**]
  A classe "data volta um dia entre 21h-00h BRT" está viva no `main` que este sign-off testa. O
  runbook **não** menciona horário de execução. Nem `RUNBOOK-FORMAT.md` nem `RUNBOOK-H2...md`
  resolvem esse fork — decisão do dono: (a) rodar H2 fora da janela 21h-00h BRT e registrar a data
  agravos vermelhos conhecidos como achado esperado (não bloqueante), ou (b) esperar o merge de
  #250/#254 antes de agendar H2. Nenhuma das duas está escrita — **fork em aberto, registrar no
  achado de fila, não decidir por conta própria aqui.**
  **CONTEXTO-COMUM** citou explicitamente o botão Pagar quebrado como o "vermelho conhecido" que a
  janela original perdeu (LAC-A já corrigiu isso) — a lista de vermelhos vivos hoje é: date-only
  UTC shift (13 sites) + o recibo PDF sem botão (achado novo desta sessão, ver abaixo).
- **Servidor de dev longevo serve código velho**: reiniciar do commit exato antes de confiar em
  qualquer tela — vale em dobro aqui porque LAC-A (#259) é recente (mergeado hoje, 2e95ffe9 já a
  inclui).
- **Migração SQLite não é transacional**: o P0 do runbook aplica migrações reais no `dev.db` real —
  se abortar no meio, fica half-applied; é por isso que o backup (item acima) é obrigatório antes.
- **`dev.db` populado é o aninhado** (`server/prisma/prisma/dev.db`), não o de fora (isca 0 byte) —
  já correto no P0 do runbook, sem correção necessária.

**Runbook em branco:** `docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md` — confirmado acima
(EVIDÊNCIA/desfecho/assinatura todos vazios).

**Achados fora de escopo**

1. ~~**Recibo PDF (passo 4) sem UI wired**~~ **[EMENDA 2026-09-02 — FECHADO por `1d68a12e`: existe o
   botão "Recibo (PDF)" por lançamento no Livro Diário, chamando `accountingService.downloadReceipt`.]**
   Texto original: `GET /journal-entries/:entryId/receipt` existe no
   backend (`server/src/routes/accounting.ts:104`) mas nenhuma tela em `my-app/features/accounting`
   o chama. O passo 4 do runbook não tem onde clicar hoje. Isto não é um problema do runbook — é um
   gap de produto que o sign-off vai bater de frente. Registrar como achado de domínio (candidato a
   item novo de fila / §5.2), não corrigir aqui (GHC-004/CBM-001).
2. ~~**CNAB 240 sem extensão no filtro de upload**~~ **[EMENDA 2026-09-02 — FECHADO por `1d68a12e`:
   `accept=".csv,.xlsx,.ofx,.ret,.cnab"`; o texto visível do formulário ainda não cita CNAB.]**
   Texto original: `ReconciliationPanel.tsx:506` só aceita
   `.csv,.xlsx,.ofx` no `<input>`; o backend detecta CNAB por conteúdo/`.ret`/`.cnab`, mas a tela
   não anuncia isso e pode esconder o arquivo do diálogo nativo. Contorno possível sem código
   (renomear extensão ou trocar filtro do diálogo), mas é atrito real na execução do passo 3.
3. ~~**Runbook cita vocabulário de evento pré-rename**~~ **[EMENDA 2026-09-02 — FECHADO por `ad903847`:
   cada ocorrência dos passos 6-11 foi anotada com o nome atual, ex. `salon.sale.finalized (hoje:
   sale.finalized, PR #222)`.]** Texto original: (`salon.sale.finalized` etc., deveria ser
   `sale.finalized` etc. desde PR #222/2026-08-25) nos passos 6-11. Não muda o resultado esperado
   (contas D/C), só o nome do evento nas anotações do executor — vale uma nota de leitura, não
   bloqueia a execução.
4. **`/accounting` (passos 1-5) não usa o HOC `withAuth`**, usa guard próprio equivalente — a regra
   do CLAUDE.md ("telas atrás de withAuth só valem em build de produção") foi escrita pensando no
   HOC; aqui o guard é outro componente, mas o risco prático (comportamento dev vs prod) é o mesmo.
   Vale a mesma cautela, registrado por precisão, não é bloqueio.

**O que eu não sei**

- Se o `dev.db` real está de fato em 29/35 migrações agora, ou se mudou desde a medição herdada
  (não abri o banco nesta sessão, só recontei os arquivos de migração no worktree).
- Se existe uma unidade Salão de Beleza com dados utilizáveis no `dev.db` real hoje (só sei que não
  há seed automático).
- O conteúdo de `AccountingView.tsx` linha a linha (confirmei que as abas existem como componentes
  separados, não abri o arquivo de composição para listar a ordem/nome exibido de cada aba).
- Se B-4 (runbook de backup) já rodou para este ciclo — não é pré-condição textual do H2 mas
  compartilha o mesmo risco de escrita.

**Caso adversarial que tentei contra a minha própria conclusão e o que aconteceu**

Tentei falsificar "o recibo PDF está acessível pela tela" assumindo que eu só não tinha achado o
nome certo do componente — busquei por `receipt`, `Receipt`, `pdf`, `PDF`, `getEntryReceipt` e pela
própria string da rota (`journal-entries.*receipt`) em todo `my-app` (não só `features/accounting`).
Todas as buscas deram zero fora do único hit em `AccountsReceivablePanel.tsx`, que é sobre outro
recurso (histórico de recebimentos de AR, campo `receivable.receipts`, sem PDF/puppeteer). Reli o
arquivo de rotas do backend para confirmar que o endpoint puppeteer é mesmo esse
(`getEntryReceipt`/`journal-entries/:entryId/receipt`) e não um nome diferente — bateu. Considero o
achado sólido: verificado, não inferido.

---

## KIT DE EXECUÇÃO — M2 (provisionar host + 1º deploy + smoke)

**Runbook:** `docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md` lido em `bcb94131`... **correção:** o próprio
runbook foi lido no commit `2e95ffe9` (HEAD do worktree = `origin/main`); `bcb94131` é o commit do
`ADR-M2-deploy-topology.md`. Confirmado via
`git log -1 --format=%h -- docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md` = `2e95ffe9`.
Demais âncoras no mesmo HEAD `2e95ffe9`, exceto `docs/operating-manual/RUNBOOK-FORMAT.md` (`17ee9c9c`)
e `docs/adr/ADR-M2-deploy-topology.md` (`bcb94131`) — ambos anteriores a `2e95ffe9` e não emendados
depois, confirmado por `git log -1 --format=%h` em cada caminho.

**Ordem na fila / dependências:** `docs/accounting/PROXIMOS-PASSOS-2026-09-02.md` §1 — M2 é o **item 7,
último da fila**, **adiado por decisão do dono** ("Deixe o host para só na finalização do app.",
2026-09-02) e reordenado para depois de B-4 → X2 → H1(Presumido) → H2 → ECF Fase 3 (Lucro Real) → H1
2ª passada (Lucro Real). Nenhum desses seis depende do host — todos rodam contra o `dev.db` real local
(citação literal do doc: "nenhum gate de 1 a 4 depende do host… e nenhum depende da ECF Fase 3"). A
classe da topologia (VPS própria, 1 instância/cliente, disco local) segue ratificada; só o provedor
concreto foi adiado — grau: **verificado** (texto do doc + emenda no próprio `RUNBOOK-M2-DEPLOY-SMOKE.md`).

**Preflight**

| Pré-condição do runbook | Como verifiquei | Resultado | Grau |
|---|---|---|---|
| Alvo de deploy: classe decidida | `docs/adr/ADR-M2-deploy-topology.md` §Status/§2 lido | VPS própria, 1 instância/cliente, BYOK, migração separada — **Accepted 2026-08-22** | verificado |
| Provedor concreto do host | grep por provedor nomeado no ADR/runbook/fila | **Não existe** — item explicitamente ABERTO (§7.1 do ADR) e agora **adiado**, sem prazo | verificado |
| `npm run build` do server aponta para `dist/` e usa `tsc-alias` (PR #204) | `server/package.json` linha `"build": "npx prisma generate && tsc && tsc-alias"`, `"start": "node dist/server.js"` | Presentes e coerentes com a lição do PR #204 (alias fora do rootDir precisa do alvo espelhado) | verificado |
| `deploy:migrate` existe e é a etapa separada exigida pela decisão 4 do ADR | `server/package.json`: `"deploy:migrate": "node ../scripts/migrate-deploy.mjs"`; script lido (`scripts/migrate-deploy.mjs:1-45`) | Existe, faz backup (`wal_checkpoint(TRUNCATE)`) → `prisma migrate deploy` → `integrity_check`+`foreign_key_check`+contagem de linha → exit code; comentário no próprio script proíbe chamada por Dockerfile CMD/ENTRYPOINT/compose `command`/`postinstall` | verificado |
| `docker-compose.yml` não roda migração no boot | lido por inteiro | Serviço `server` só tem `build`+`environment`+`volumes`+`depends_on`+`restart`; comentário no topo do serviço cita o ADR e proíbe reintroduzir `command` de migração | verificado |
| `smoke:migration` existe e o que prova | `server/package.json` → `"smoke:migration": "node ../scripts/smoke-migration-gate.mjs"`; script lido (`scripts/smoke-migration-gate.mjs:1-33`) | Roda LOCAL sobre CÓPIA de `--db` (default `server/prisma/prisma/dev.db`); prova S1–S8 (hash intocado, migração limpa, integrity/FK check, nenhuma tabela perde linha, colunas antigas byte-a-byte, índices sobrevivem, partida dobrada Σdébito=Σcrédito) + avisos W1/W2 (FK action mudou; gate vazio se tabelas contábeis têm 0 linhas). Prova BANCO, não serviço — não roda no CI de propósito ("o dado real não existe no CI") | verificado |
| `logs:errors` existe e o que lê | `server/package.json` → `"logs:errors": "node ./scripts/read-error-log.mjs"`; script lido por inteiro | Agrupa por mensagem o NDJSON de `logger.error`/`warn` em `server/logs/errors-YYYY-MM-DD.ndjson` (ou `LOG_ERROR_DIR`); sem args lê o dia corrente | verificado |
| Chromium/puppeteer real (não mockado) | `grep -rl puppeteer server/src` → `server/src/lib/pdf.ts`, `server/src/lib/receiptHtml.ts`; dependência em `server/package.json:55` (`puppeteer: ^25.3.0`) | O caminho de recibo PDF usa puppeteer real (não há flag de mock em produção). CI **não** referencia `puppeteer`/`chromium`/`smoke:migration`/`logs:errors`/`deploy:migrate` (`grep -i` no `.github/workflows/ci.yml` = 0 hits) — confirma que o launch do Chromium **só é provado no host real**, nunca no CI | verificado |
| Variáveis de ambiente exigidas em produção (nome, sem valor) | `server/src/config/env.ts:100-165` lido por inteiro; `docker-compose.yml` lido por inteiro; `server/src/app.ts:35` | Schema Zod (`buildEnvSchema`): `DATABASE_URL` sempre obrigatória; `JWT_SECRET` obrigatória **só em produção** (`NODE_ENV==='production'`, `superRefine`); `PORT`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `REDIS_URL` opcionais (produção só **avisa**, não falha, se `OPENAI_API_KEY`/`QDRANT_URL` faltarem — `env.ts:143-147`). **Fora do schema Zod, mas exigidas de fato:** `ALLOWED_ORIGIN` (lida direto em `app.ts:35`, cai em `http://localhost:3000` se ausente — CORS quebra em silêncio contra um host real; o compose força com `:?`); `ATTACHMENTS_DIR` (cai em `<cwd>/storage/attachments`; comentário no compose explica por que isso é perigoso sem volume dedicado). O compose também exige `QDRANT_API_KEY` via `:?` (o Zod só torna opcional, o compose endurece) | verificado |
| Boot falha sem `AccountingBinding` `Active` (F-FEEDER-4) | `server/src/server.ts:1-55` lido por inteiro | Confirmado: `bootstrap()` faz `await ApplicationFactory.getInstance().initializeAccountingSyncFromBindings()` **antes** de `app.listen()` (linhas ~32-38); rejeição (zero binding `Active` ou colisão de `eventKey`) cai no `.catch` de `bootstrap()` (linhas ~48-55), loga e `process.exit(1)` — processo nunca aceita tráfego HTTP. Isto vira **passo obrigatório do deploy**: ativar o binding do setor (hoje via CLI `activateAccountingBindingCli.ts`, item LAC-B diferido — não existe self-service) **antes** do primeiro `app.listen()` no host novo | verificado |
| WAL/`busy_timeout` exigem disco local | `server/src/lib/prisma.ts` lido por inteiro | `$connect().then()` roda `PRAGMA journal_mode = WAL` + `PRAGMA busy_timeout = 5000` + `PRAGMA foreign_keys = ON` fora de teste (`NODE_ENV !== 'test'`) — confirma a exigência do ADR §3 de filesystem com lock POSIX/Windows normal, nunca NFS/EFS/objeto-storage | verificado |
| Backup antes de migrar (B-4 / A5 do runbook) | `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` não lido nesta sessão (fora do escopo desta tarefa) — `server/scripts/db-backup.mjs:1-24` lido | `db-backup.mjs` faz `VACUUM INTO` + `integrity_check` + contagem sentinela (`journal_entries`); default de saída = `server/prisma/backups/` — comentário no próprio script diz que isso serve dev/staging e que o destino de produção (fora do container/volume) é **decisão do dono ainda aberta** (`ADR-M2-deploy-topology.md §7 item 1`). `migrate-deploy.mjs` já embute seu próprio backup antes de migrar (`--backup-dir`, default `<repo>/backups/migrate-deploy`) | verificado |
| Migrações pendentes / risco de rebuild destrutivo | `ls -d server/prisma/migrations/*/ \| wc -l` = **35**; `grep -rl "DROP TABLE" server/prisma/migrations \| wc -l` = **11**; `find server/prisma/migrations -iname "*down*"` = **0** | Worktree (=`main` HEAD `2e95ffe9`) tem 35 migrações, 11 fazem `DROP TABLE`/rebuild destrutivo, 0 são `down`. O `dev.db` real está em 29/35 (fato apurado por agente anterior, não re-verificado por mim) — **6 migrações pendentes** cairiam sobre ele no dia do `deploy:migrate`, incluindo pelo menos a penúltima/antepenúltima destrutiva citada no ADR (`counterparty_notnull`, `RAISE(ABORT)` que não reverte). Contagem de `DROP TABLE` (11) diverge da do ADR (9, medida em 2026-08-22, quando havia 30 migrações) — **achado**, não pré-condição vermelha: 2 migrações novas desde então também fazem rebuild destrutivo; não identifiquei quais sem abrir cada uma, fora do escopo desta tarefa | verificado (contagens); inferido (que as 2 DROP TABLE novas estão entre as 6 pendentes do dev.db real) |
| `my-app` build de produção (`next build`) | `my-app/package.json` scripts lidos | `"build": "next build"`, `"start": "next start"`; **não roda neste worktree** — `my-app/node_modules` inexistente (`ls` retorna erro) | não verificável aqui — `[DONO confere]` |
| Estado de dependências deste worktree | `ls server/node_modules \| wc -l` = **0**; `ls my-app/node_modules` = erro; `ls server/.env` = erro; `find . -iname dev.db` = vazio | Confirma `CONTEXTO-COMUM.md`: nenhum build/start roda neste worktree | verificado |

**Pré-condições vermelhas ou não verificáveis aqui:**
- **Provedor/host concreto** — `[DONO decide]`. Não há comando de leitura que resolva isto; é decisão adiada explicitamente.
- **DNS, TLS/certificado, reverse proxy (nginx/caddy/etc.), firewall** — nada disso está declarado em `docker-compose.yml`, `Dockerfile`(s) ou no ADR (`grep -rniE "nginx|reverse proxy|TLS|certbot|letsencrypt"` sobre os 3 arquivos = 0 hits, exceto a menção a "sem unit `.service`" no próprio runbook). `[DONO decide]` — nenhum artefato do repo assume um destes; o serviço `server` expõe `3001` e `frontend` expõe `3000` diretamente, sem proxy reverso na frente.
- **Supervisor de processo (systemd/pm2)** — runbook confirma por escrito: "Sem Procfile, sem `ecosystem.config` (pm2) e sem unit `.service` no repo — nenhum supervisor de processo declarado além do que o Dockerfile/compose cobre." `[DONO decide]` se o alvo usa só `docker compose up -d --restart unless-stopped` (já configurado nos 3 serviços) ou adiciona supervisor de host.
- **`next build` do `my-app` em produção** — não roda neste worktree (`my-app/node_modules` ausente). `[DONO confere]` com: `cd my-app && npm ci && npm run build` a partir da raiz `C:/Users/smurf/Downloads/Luminaris` (não deste worktree) ou dentro do estágio `builder` do `my-app/Dockerfile`, que já faz isso.
- **`npm run smoke:migration` / `npm run deploy:migrate --self-check` reais** — exigem `server/node_modules` populado e Prisma client gerado; este worktree tem `server/node_modules` vazio. `[DONO confere]` com: `cd server && npm ci && npx prisma generate && npm run smoke:migration` a partir da raiz do repo (não deste worktree).
- **Valores reais de `JWT_SECRET`, `OPENAI_API_KEY`, `QDRANT_API_KEY`, `ALLOWED_ORIGIN`, `DATABASE_URL` do alvo** — credenciais, nunca inseridas por agente. `[DONO decide/preenche]` no `.env` do host.
- **Destino do backup em produção fora do container/volume** — decisão explicitamente aberta no próprio ADR §7 item 1 combinado com o comentário de `db-backup.mjs`. `[DONO decide]`.
- **Ativação do `AccountingBinding` `Active` no host novo antes do 1º `app.listen()`** — hoje só via CLI manual (`activateAccountingBindingCli.ts`); sem self-service (LAC-B diferido). `[DONO confere]` que alguém rode o CLI (ou o compilador via `deploy:migrate`/seed equivalente) antes de subir o container do `server`, ou o boot aborta com `process.exit(1)`.

**Armadilhas deste repo que mordem neste gate:**
- Migração SQLite não é transacional — `RAISE(ABORT)` de um guard não desfaz o que já rodou antes dele na mesma migração (`counterparty_notnull`, penúltima da fila de 35, ainda vale para o `dev.db` real que está 6 migrações atrás).
- `dev.db` populado real fica em `server/prisma/prisma/dev.db`; `server/prisma/dev.db` é isca de 0 byte — comando errado engana quem roda `smoke:migration`/`db-backup`/`migrate-deploy` sem `--db` explícito.
- Servidor de dev longevo serve código velho — reinicie do commit exato antes de confiar em qualquer smoke pós-deploy.
- Windows serializa SQLite; teste de concorrência verde local não é evidência do host Linux real.
- `NEXT_PUBLIC_API_BASE_URL` é inlinada em **build-time** do `my-app`, não runtime — trocar o valor exige rebuild da imagem de frontend, não só reiniciar o container.
- `db:seed` faz upsert da senha do admin — não rodar contra o alvo de produção sem confirmar que é isso que se quer.

**Runbook em branco:** `docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md`. Confirmado vazio via
`grep -n "EVIDÊNCIA\|Assinatura\|\[ \]" docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md`:
```
109:   EVIDÊNCIA: [saída completa do comando]
113:   EVIDÊNCIA: [comandos usados + resposta de um endpoint autenticado]
118:   EVIDÊNCIA: [o PDF ou o log do launch]
122:   EVIDÊNCIA: [saída do comando]
125:[ ] PASSOU — todos os passos com evidência conferindo com o esperado
126:[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
128:[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou
133:- Assinatura do executor: ____________
```
Todos os campos de evidência/desfecho/assinatura seguem `[...]`/`[ ]`/`____________` — nenhum preenchido.

**Achados fora de escopo:**
- ~~Contagem de migrações com `DROP TABLE` no `ADR-M2-deploy-topology.md` (9) está **desatualizada**~~ **[EMENDA 2026-09-02 — FECHADO por `ad903847`: o ADR §3 foi emendado para 11/35, com a lista das migrações e a correção da afirmação derivada sobre a ponta da fila.]** Texto original: hoje são 11 sobre 35 migrações (o ADR mediu 9 sobre 30 em 2026-08-22). Não é pré-condição vermelha do M2 (o A5 do runbook já avisa que a fila de destrutivas é o padrão esperado), mas o número citado no ADR §3 não bate mais com o disco. Sinalizo para quem emendar o ADR na próxima passada de higiene — não corrijo aqui (fora do escopo desta tarefa e não edito arquivos do repo).
- `ALLOWED_ORIGIN` não está no schema Zod de `config/env.ts` (só `app.ts:35` a lê, com fallback silencioso para `localhost:3000`), enquanto `docker-compose.yml` a torna obrigatória via `:?`. Ou seja, **fora do compose** (ex.: rodando `node dist/server.js` direto num host sem docker) nada impede o boot de subir com CORS quebrado em silêncio contra um domínio real. Não é pré-condição do M2 propriamente, mas é o tipo de "erro de ambiente" que o copiloto existe para prevenir — registro para o executor conferir manualmente se o alvo não usar o compose tal como está.

**O que eu não sei:**
- Se o `dev.db` real (29/35) será de fato o dado inicial do host provisionado, ou se o cliente real começa de banco vazio + seed. A fila não resolve isso explicitamente para M2; é decisão do dono no momento do deploy.
- Quais das 2 migrações novas com `DROP TABLE` (11 vs. 9 do ADR) caem entre as 6 pendentes do `dev.db` real — não abri cada migração para checar; o A5 do runbook já cobre o risco em geral (backup obrigatório antes de migrar), então não bloqueia o kit, mas fica em aberto como detalhe.
- Qual será o provedor de host, se haverá reverse proxy/TLS gerenciado pelo provedor ou configurado à mão, e se o supervisor de processo será só o `restart: unless-stopped` do compose ou algo adicional no host.

**Caso adversarial que tentei contra a minha própria conclusão e o que aconteceu:** Tentei achar evidência
de que o `docker-compose.yml` ou algum Dockerfile chamasse migração no boot (o que quebraria a decisão 4
do ADR) — `grep` por `"migrate deploy"` e por `command:`/`entrypoint:` nos 3 serviços do compose não achou
nada, e o comentário no topo do serviço `server` proíbe isso explicitamente por escrito. Também tentei
achar uma referência a Chromium/puppeteer no `ci.yml` que provasse que o passo 3 do runbook já teria sido
exercitado em CI (o que tornaria o smoke redundante) — zero hits, confirmando que o launch real do
Chromium só acontece no host, nunca antes. As duas checagens **teriam falhado** se minha leitura do ADR/
runbook estivesse errada sobre "migração é etapa separada" ou "Chromium só se prova no host" — não falharam.

---
