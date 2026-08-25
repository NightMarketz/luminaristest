# PLANO DA SESSÃO DE INTEGRAÇÃO — BE-INCR-NFE (`claude/nfe-fase-a` → `main`)

> **O que este documento é.** Mapa de execução para a futura `sessao-integracao` que vai transportar
> `claude/nfe-fase-a` para `main`. Produzido por uma tarefa de PREPARAÇÃO (A3) — só documentação, nenhum
> git de escrita foi rodado para gerar isto (`log`/`diff`/`merge-base`/`show`/`ls-tree` apenas). **Não
> destrava o merge** — o gate de dado externo (§1) continua aberto até o dono trazer o XML real. Item 11
> da fila §5.1 do master map; ver também `docs/accounting/BE-INCR-NFE-impl-plan.md` (o BRIEF original) e
> `docs/adr/ADR-INCR-NFE-fiscal-ingestion.md`.
>
> **Números medidos nesta passada** (verificado, `git merge-base`/`git diff --numstat`/`git log` contra
> `origin/main` em `dfaed751`, 2026-08-22): merge-base `dc7fd120`, HEAD da branch `68df00f4`, **33 arquivos**
> tocados pela branch, **16 colidem** com o que `main` mudou desde a base — os mesmos números já citados na
> §3 do master map. **`origin/main` está 239 commits à frente do merge-base nesta passada** (o master map
> registrava 156 numa passada anterior — o número SOBE a cada semana que o XML real não chega; quem for
> executar isto deve rodar `git rev-list --count 68df00f4..origin/main` de novo, não confiar neste número
> nem no do master map).

---

## 1. Estado e por que está travado

**A trava é deliberada, não um bug.** `server/src/lib/__tests__/nfe-fixture-provenance.test.ts:25-30`
(teste `'nenhum fixture é sintético (troque pela NF-e real p/ destravar o merge)'`) lê todo `.xml` de
`server/src/lib/__tests__/fixtures/nfe/` e falha se qualquer um carregar o marcador literal
`SYNTHETIC-FIXTURE-NOT-REAL` (`nfe-fixture-provenance.test.ts:13`, constante `SENTINEL`). Como
`Server – typecheck & test` é check obrigatório na branch protection do `main`, esse teste vermelho
**segura o CI sozinho** — não existe workflow nem label extra (comentário `ponytail` no próprio arquivo,
linha 10: "o teste é a trava — sem workflow/label extra. Some sozinho quando a nota real chega.").

**O que o dono precisa trazer** (não o agente — ORCH-006, gate humano, sem sessão de agente): 1 NF-e 4.00
de **compra** (XML que um fornecedor emite, CFOP de entrada 1102/2102…) + 1 de **venda**, cada uma
anonimizada preservando estrutura: troca `CNPJ`/`CPF`/`xNome`/endereço/`IE`, zera `<Signature>`, mas
**preserva** `vProd`/`vDesc`/`vFrete`/`vIPI`/`vST`/`vNF`, `qCom`, `cStat`, e o formato da chave de 44
dígitos (`@Id` = `NFe`+`chNFe`, idênticos). Passo a passo completo em
`server/src/lib/__tests__/fixtures/nfe/README.md` (existe só em `claude/nfe-fase-a` — ver abaixo).

**Onde os arquivos vão:** `server/src/lib/__tests__/fixtures/nfe/`. **Hoje esse diretório não existe em
`main`** (verificado — `git ls-tree -r --name-only origin/main | grep fixtures/nfe` não retorna nada; o
diretório e os 2 `*.SYNTHETIC.xml` só existem em `claude/nfe-fase-a`). Ou seja: a troca do sintético pelo
real não é "editar 2 arquivos existentes em `main`" — é parte do próprio conteúdo que o rebase da branch
traz. Duas ordens possíveis (ver §3 passo 1): (a) o dono materializa os XMLs reais **em `claude/nfe-fase-a`
antes do rebase**, apagando/substituindo os `*.SYNTHETIC.xml` que já estão lá; ou (b) o rebase acontece
primeiro com os sintéticos ainda no lugar (branch fica vermelha no CI) e os reais entram depois, num commit
sobre a branch já rebaseada. A ordem (a) é a que este plano recomenda — ver justificativa no passo 1 da §3.

---

## 2. Colisão por grupo de risco

16 arquivos colidem (tocados por `claude/nfe-fase-a` **e** por `origin/main` desde a base `dc7fd120`).
Deltas de linha são os da branch NF-e contra a base (`git diff --numstat dc7fd120...claude/nfe-fase-a`).

### 2.1 Migração fora de ordem — grau: nomes/timestamps **verificado**; drift do `migrate dev` **inferido**

| Fato | Verificado |
|---|---|
| Migração da NF-e | `server/prisma/migrations/20260723190934_nfe_multi_item_discriminator/` (23/jul) |
| Migrações de `main` que já rodaram DEPOIS desse timestamp | `20260814120000_counterparty_notnull` (14/ago) e `20260821090000_accounting_binding` (21/ago) |

A pasta da NF-e tem timestamp **anterior** a duas migrações que `main` já aplicou. O Prisma ordena e aplica
migrações por nome de pasta (prefixo de timestamp); inserir uma pasta "do passado" depois que pastas
"futuras" já rodaram é o padrão de drift descrito em `[[migracao-sqlite-nao-e-transacional]]` — o efeito
exato sobre `prisma migrate dev`/`deploy` não foi reproduzido aqui (isso é papel do smoke-migration-gate na
integração real, não deste doc). **Ação:** antes de rodar qualquer `migrate`, **renomear** a pasta da NF-e
para um timestamp posterior ao mais recente de `main` no momento do rebase (hoje `20260821090000`) —
por exemplo `20260822120000_nfe_multi_item_discriminator` — preservando o conteúdo do `migration.sql`
inalterado. O oráculo de que a migração renomeada é segura é o smoke-migration-gate rodado sobre cópia do
`dev.db` real (padrão dos incrementos anteriores — `[[smoke-gate-s6-x-migracao-de-dado]]`), não este doc.

### 2.2 Injeção — `server/src/lib/factory.ts` (36 inserções / 11 remoções)

Ambas as branches inserem código nas MESMAS duas regiões do arquivo, mas em símbolos diferentes:

- **Bloco de imports** (linha original ~87-88, logo após o import de `InventoryService`): a NF-e insere 2
  imports novos (`NfeImportService`, `NfeSaleReconciliationService`) ali; o commit `04582d8a` (P1 —
  BE-INCR-BINDING-PRESS) reescreve o bloco de imports **a partir da mesma vizinhança** (linha original 88
  em diante), trocando os 5 imports de mapper manual do salão por imports do motor de binding. As duas
  edições ficam adjacentes o bastante para o `git rebase`/3-way merge provavelmente marcar conflito de
  contexto — mas é **mecânico**: são dois blocos de `import` novos, sem símbolo compartilhado; resolução é
  manter os dois blocos, em qualquer ordem.
- **Registro de serviços** (getters + literal de `services`): a NF-e extrai `payableService` como `const`
  antes do literal de retorno (para o `NfeImportService` compartilhar a MESMA instância de `PayableService`
  que o resto do app usa — comentário da branch: "the NF-e de compra books every cent through the proved
  createPayable path, never postEntry directly") e adiciona `nfeImport`/`nfeSaleReconciliation` ao literal
  e aos getters. **Verificado:** `04582d8a` NÃO toca a construção de `PayableService` nem o literal
  `payable: ...` — só troca o array de mappers manuais do `AccountingSyncService` (`SalonSaleFinalizedMapper`
  etc. → `buildSalonAccountingMappers()`) e adiciona um método novo (`getAccountingBindingCompileService`)
  perto do fim da classe. **Conclusão: o conflito aqui é mecânico (linhas próximas, símbolos diferentes),
  não semântico** — não há dois donos escrevendo a mesma instância de `PayableService` nem o mesmo array de
  mappers. Não precisa de re-review de comportamento, só de resolução textual (manter os dois blocos).
  **O que precisa de olhar humano mesmo assim:** confirmar, depois do merge textual, que `payableService`
  (a instância compartilhada nova) ainda é a MESMA que entra no literal `payable: payableService` — um erro
  de resolução manual clássico é a IDE/humano "simplificar" de volta para dois `new PayableService(...)`.

### 2.3 DTO — `PayableDto.ts` (66/5) + `PayableDto.test.ts` (60/0)

`main` acrescentou `counterpartyId`/`dueFrom`/`dueTo`/`q`/`overdue` ao DTO de listagem de `Payable` (PR
#190, subrazão de filtros — `ea91f406`/`8d5aa337`/`d3b4fbbe`/`987ab1a2` no `git log` do arquivo). A NF-e
mexe no MESMO arquivo para o DTO de criação (campo relacionado a `inventoryMultiItem`/multi-item). O
snapshot comitado **precisa ser regenerado**: `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts`
compara cada DTO contra `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` — um `NfeDto`
novo (se a branch expõe um) ou um `PayableDto` com forma alterada faz esse teste falhar até o snapshot ser
regravado. **Grau:** a existência do teste e do snapshot commitado é verificado; que o snapshot vai
realmente divergir é inferido (depende do shape exato pós-merge) — o próprio teste é o oráculo.

### 2.4 Serviço — MAIOR delta de lógica, re-review obrigatório em 2 arquivos, não só 1

- **`PostingService.ts`** (106/1 na branch NF-e; 146/56 em `main`, tocado por `16a0d363` e por `04582d8a`).
  **Achado da conferência linha-a-linha:** os dois lados adicionam método(s) novos **no mesmo ponto** do
  arquivo — `main` fecha a classe com um hunk `@@ -395,6 +439,52 @@` (52 linhas novas logo antes do fim da
  classe) e a NF-e fecha com `@@ -395,6 +411,95 @@` (95 linhas novas, incluindo `attachSourceDocument`, no
  MESMO ponto de referência). Vão colidir textualmente no rebase; a resolução correta é **concatenar os
  dois blocos de método novo** (nenhum dos dois substitui o outro), mas isso exige olhar humano/reviewer —
  um merge automático mal resolvido pode apagar um dos dois métodos silenciosamente.
- **`PayableService.ts`** (118/18 na branch NF-e; delta comparável em `main` — 92/30 — tocado por 5 commits —
  `ea91f406`, `8d5aa337`, `d3b4fbbe`, `7b0929fc`, `16a0d363`). **Este é o ponto de maior risco SEMÂNTICO do
  merge inteiro:** as duas branches editam o MESMO trecho de `reconcilePayables` — o bloco
  `if (this.inventoryService) { await this.inventoryService.receiveStock(...) } catch (error) { ... }`.
  `main` (triagem 08-15, achado A4) reescreve a assinatura de retorno (`+ blocked/failed`) e o `catch` para
  classificar erro determinístico-esperado (`blocked`) vs. erro genuíno (`failed`) via `syncSkipErrorCode`.
  A NF-e reescreve a CONDIÇÃO do mesmo `if` para `this.inventoryService && hasSingleInventorySku(payable)`
  — uma nota multi-item não tenta `receiveStock` (o comentário da própria branch documenta a limitação: o
  re-drive do detalhe por SKU de uma nota multi-item não recebida por completo cai fora do reconcile,
  fica a cargo de `receiveInventoryItems`).

  > **DECIDIDO 2026-08-22 (dono, via AskUserQuestion): conta como `blocked`.** É exatamente o caso que
  > `main` desenhou `blocked` para cobrir — pulo determinístico e esperado, não erro; `failed` viraria
  > alarme falso permanente sobre uma limitação conhecida por desenho, e o pulo silencioso (nenhum dos
  > dois, o comportamento de hoje na branch) cai na classe `[[param-aceito-e-ignorado-e-bug-silencioso]]`
  > — o payable existe, ninguém recebe, ninguém é avisado.
  >
  > **Consequência de implementação para o passo 9** (verificado em `main` `dfaed751`,
  > `server/src/features/accounting/services/PayableService.ts:492-526`): hoje `blocked` só nasce de um
  > `catch (error)` (linha 509) classificando `syncSkipErrorCode(error)` contra
  > `SYNC_SKIP_ERROR_CODES = ['ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED']`
  > (`server/src/features/accounting/sync/AccountingSyncPort.ts:91`) — um **throw classificado** dentro
  > do `try` do bloco de compra (linhas 493-508, o `if (this.inventoryService) { await
  > this.inventoryService.receiveStock(...) }`). A condição que a NF-e introduz
  > (`this.inventoryService && hasSingleInventorySku(payable)`) é um **skip por CONDIÇÃO no `if`**, não
  > um throw: quando `hasSingleInventorySku(payable)` é `false`, `receiveStock` simplesmente não é
  > chamado — nenhum erro é lançado, o `catch` (linha 509) não roda, `blocked` não incrementa hoje.
  > **O caso REAL: o `catch` atual NÃO serve** para esse skip — a resolução exige um caminho novo:
  > (i) incrementar `blocked` direto no ramo que pula `receiveStock` (mais direto, sem inventar erro), ou
  > (ii) introduzir um código de skip novo (ex. `'MULTI_ITEM_NOT_SINGLE_SKU'`) e lançá-lo através do mesmo
  > `catch`/`syncSkipErrorCode` por uniformidade com o resto do método. Este doc não escolhe entre (i)/(ii)
  > — é decisão de implementação do passo 9, não deste mapa; qualquer uma das duas fecha a decisão do
  > dono acima.
  >
  > **Teste que asserta a forma de retorno (regravar/estender no passo 9):**
  > `server/src/features/accounting/services/__tests__/PayableService.test.ts:596-626` (`describe`
  > "failed vs blocked classification (A4)") — é onde a nova contagem para nota multi-item tem de
  > aparecer como caso novo, ao lado dos dois já existentes (`failed` genérico via erro inesperado e
  > `blocked` via `MaxCentsExceededError`).

### 2.5 Contrato — `openapi.json`/`docs.paths.ts`/`routes/index.ts`/`openapi-paths.test.ts`

`routes/index.ts` (2/0): a NF-e registra `router.use('/nfe', nfeRoutes)` — import + linha de uso, sem
tocar nada que `main` também mudou nesse arquivo (colisão é só "mesmo arquivo", não "mesma linha").
`docs.paths.ts` (49/0) e `openapi.json` (181/0) são saída do gerador (`npm run docs:generate`) — não
resolver manualmente, regenerar depois que o código-fonte das rotas estiver mesclado.
`openapi-paths.test.ts`: a branch NF-e trava `BASELINE = 139` (137 da base + 2 rotas `/api/nfe/purchase` e
`/api/nfe/sale`). **`main` hoje está em `BASELINE = 141`** (verificado, `server/src/__tests__/openapi-paths.test.ts:31`,
mais o `+3` do binding-press que ainda não está refletido em nenhum baseline citado no master map). O
número certo pós-rebase **não é 139 nem 141** — é `141 + (paths novos que a NF-e realmente adiciona)`,
hoje presumivelmente `143` (141 + as mesmas 2 rotas), mas **recalcule rodando o teste**, não escreva o
número por aritmética: `npx jest openapi-paths --silent` imprime a contagem real no primeiro `expect` que
falhar se o número estiver errado.

### 2.6 Trivial — resto

`package.json`/`package-lock.json`: a NF-e só ADICIONA a dependência `fast-xml-parser@^5.10.1` (1 linha +
lockfile); nenhuma remoção, nenhum conflito esperado com o que `main` mudou no lockfile (adições de outras
dependências em posições alfabéticas diferentes). `schema.prisma` (9/0): só ADICIONA o campo nullable
`inventoryMultiItem Boolean?` no model `Payable` — aditivo, mesmo padrão do resto do schema recente (regra
"nullable, não NOT-NULL-com-default", citando a lição `expenseAccountId` no próprio comentário da branch).
`auditCanonical.ts` (3/0): só ADICIONA uma entrada de comentário ao `PAYLOAD_ALLOWLIST` (não emite evento
`nfe.*` próprio — decisão A/T8 do BRIEF). `IPayableRepository.ts` (4/0): só ADICIONA o campo
`inventoryMultiItem: boolean | null` a `CreatePayableData`. `PayableService.test.ts` (106/0) e
`PostingService.test.ts` (95/0): testes 100% novos, sem remoção — mesmo que o arquivo colida (o alvo já foi
editado por `main`), a inserção de `describe`/`it` novos ao fim do arquivo tem baixíssima chance de
overlap de linha; ainda assim rodar (§3 passo 6) para confirmar que os testes novos passam contra o
`PayableService`/`PostingService` já mesclados (o comportamento por trás deles pode ter mudado — ver §2.4).

---

## 3. Ordem de execução da sessão de integração

O XML real vem ANTES do rebase de propósito: rebasear primeiro só produz retrabalho, porque
`nfe-fixture-provenance.test.ts` (§1) segura o merge de qualquer jeito enquanto os fixtures forem
sintéticos — não há vantagem em resolver 16 colisões de arquivo antes de ter o insumo que faz o CI ficar
verde no fim.

| # | Passo | Comando | Critério PASSA / FALHA |
|---|---|---|---|
| 1 | **XML real** (gate humano, fora do agente) — dono materializa os 2 XMLs anonimizados em `server/src/lib/__tests__/fixtures/nfe/` na branch, substituindo os `*.SYNTHETIC.xml`, e remove o marcador | manual, ver `fixtures/nfe/README.md` | PASSA: `npx jest nfe-fixture-provenance --silent` verde. FALHA: continua vermelho → não prossiga, o resto do plano fica sem sentido |
| 2 | **Rebase** da branch sobre `origin/main` atual | `git checkout claude/nfe-fase-a && git rebase origin/main` | PASSA: rebase termina sem `<<<<<<<` residual (`git diff --check` limpo). FALHA: conflitos abertos → resolver arquivo a arquivo pelos grupos §2.1-2.6, nunca `--theirs`/`--ours` em massa |
| 3 | **Renomear a migração** para depois da mais recente de `main` | `git mv server/prisma/migrations/20260723190934_nfe_multi_item_discriminator server/prisma/migrations/<novo_timestamp>_nfe_multi_item_discriminator` (novo timestamp > o mais recente de `main` no momento) | PASSA: `ls server/prisma/migrations \| sort \| tail -1` mostra a pasta da NF-e por último. FALHA: ordem errada → migração não roda |
| 4 | **tsc limpo** nos dois lados | `cd server && npx tsc --noEmit` · `cd my-app && npx tsc --noEmit` | PASSA: 0 erros nos dois. FALHA: qualquer erro → não avance (gate duro do CLAUDE.md raiz) |
| 5 | **Suite de accounting** | `cd server && npx jest accounting --silent` (usa `--runInBand` se rodar junto com integration — `[[integration-suite-precisa-de-runinband]]`) | PASSA: 0 vermelho. FALHA: identificar se é regressão do merge ou teste pré-existente instável (checar contra `origin/main` isolado antes de culpar a NF-e) |
| 6 | **`docs:generate`** | `cd server && npm run docs:generate` | PASSA: `openapi.json`/`docs.paths.ts` regravados sem erro, `git diff` mostra só as rotas novas de NF-e (mais o que já estava pendente de `main`). FALHA: erro no gerador → provável drop silencioso de path (achado histórico, ver comentário do teste em §2.5) |
| 7 | **Guarda de contagem de paths** | `cd server && npx jest openapi-paths --silent` | PASSA: verde com o `BASELINE` atualizado para o número real pós-passo 6 (não assuma 143 — leia o número que o teste reporta e grave-o no `BASELINE`). FALHA: contagem abaixo do baseline anterior → path caiu, investigar antes de subir o número |
| 8 | **Snapshot de shape do DTO** | `cd server && npx jest dtoShapeSnapshot -u` (revisar o diff do `__dto-shapes__.json` ANTES de commitar — `-u` regrava sem julgar) | PASSA: diff do snapshot contém só os campos que a NF-e realmente introduziu. FALHA: diff mexe em DTO que a NF-e não deveria tocar → sinal de merge mal resolvido em outro arquivo |
| 9 | **Re-review dos conflitos semânticos** — §2.2 (instância compartilhada de `payableService`) e §2.4 (`PostingService` dois métodos novos concatenados + implementar a decisão do dono 2026-08-22 — nota multi-item conta como `blocked` — escolhendo o caminho (i) ou (ii) do bloco "DECIDIDO" da §2.4) | leitura humana/reviewer independente do diff final desses 2 arquivos, não delegável a lint | PASSA: reviewer confirma por escrito (no PR) que os dois pontos foram implementados, com o teste de `PayableService.test.ts:596-626` estendido, não só "compilou". FALHA: qualquer um dos dois pontos sem decisão/implementação explícita → não mergear |
| 10 | **Smoke-migration-gate** sobre cópia do `dev.db` real (padrão dos incrementos anteriores, não pular por causa da renomeação do passo 3) | seguir o padrão de `SMOKE-MIGRATION-GATE-INCR-INVENTORY.md`/`-AP.md` — cópia do `dev.db` real, `prisma migrate deploy`, checar integridade + FKs/índices | PASSA: rebuild preserva linhas de `payables`/`stock_movements` byte-a-byte, sem drop de FK/índice. FALHA: qualquer perda → a renomeação do passo 3 não bastou, investigar antes de aplicar em cima do `dev.db` real |
| 11 | **Merge** | PR normal contra `main`, squash conforme convenção do repo | PASSA: CI (`Server – typecheck & test`, incluindo `nfe-fixture-provenance`) verde end-to-end. FALHA: qualquer check vermelho → não usar admin override |

---

## 4. O que este documento NÃO decide

- **O XML real em si** — só o dono traz (§1); este doc não pode antecipar o que ele contém.
- **O timestamp exato** da migração renomeada (§2.1 passo 3) — depende de qual seja a última migração de
  `main` NO MOMENTO do rebase, que este doc não pode fixar hoje.
- **O `BASELINE` final** do guard de paths (§2.5) — só o resultado real do passo 7 decide o número; este
  doc dá o cálculo esperado (141 + N), não o valor final.
- **Se a ordem (a) ou (b) do §1** (XML antes vs. depois do rebase) é a que o dono vai seguir — este doc
  recomenda (a) por custo, mas quem executa pode preferir (b) por razão operacional própria.
- **Ratificação de qualquer fork novo** que a re-review do passo 9 descobrir — se aparecer um terceiro
  fork além dos F-NFE7/F-NFE8 já ratificados (ver `BE-INCR-NFE-impl-plan.md` §0), ele exige
  `AskUserQuestion`/sinal humano como os outros dois, não decisão silenciosa na integração.
