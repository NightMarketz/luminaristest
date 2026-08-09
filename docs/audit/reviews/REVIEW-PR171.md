# Revisão independente — PR #171

**Revisor:** agente independente (claude-opus-5), sessão separada da autora, em worktree isolado.
**Data:** 2026-08-07 · **Commit revisado:** `18b14b12` (merge do PR #171, branch `claude/friendly-volhard-d14329`)
**Worktree usado:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-171` (detached em `18b14b12`)
**Lente:** o teste falha se o código quebrar? (correção + **alcance real**)

---

## 1. Veredito

**`revisado_com_ressalva`.**

**As quatro barreiras mordem de verdade onde tocam — reproduzi 7 dos kills dos autores com mutações
minhas e todos morreram — mas a manchete de que "4 de 6 mutações do controller sobreviveram porque o
fail-closed é estrutural" é FALSA: a mutação central (`POST /api/accounting` público) MATA 8 testes, e
foi rotulada de sobrevivente porque os autores mediram uma FATIA (`-t "autoriza"`) em vez do arquivo.
O risco principal é o que essa manchete escondeu: a barreira do controller alcança 4 de 56 rotas do
mount, e uma quebra de inquilino cross-tenant em `deleteAccount` — a MESMA classe de bug que os autores
mataram em `postEntry` — passa por 398 testes de integração sem uma reprovação.**

Eu reprovaria a *escrituração da medição* (não o código de teste), e estou **PROIBIDO de corrigir**
qualquer coisa nesta revisão. Por isso o veredito é `revisado_com_ressalva`, e a ressalva é exatamente
o motivo da reprovação: **os dois artefatos de auditoria (`docs/audit/TRIAGEM-R1-R3.json` e
`docs/audit/REVIEW-LEDGER.jsonl`) registram um `mutation_score` errado e uma explicação estrutural que
não sobrevive à medição.** O código de teste entregue permanece bom e não recomendo revertê-lo.

Crédito onde é devido, porque isto pesa no veredito: o próprio PR registrou `sem_revisao_independente`
e apontou, no `note` do ledger, os dois pontos exatos que eu deveria confrontar. Um deles caiu; o
outro (a decisão de soft-delete do `ReferentialMapping`) resistiu integralmente.

---

## 2. O que reexecutei (com CONTROLE de baseline)

### 2.0 Achado de harness que invalidou o primeiro baseline

O primeiro baseline veio **todo vermelho** — `Test Suites: 4 failed, 4 total` / `Tests: 43 failed,
43 total`, erro `The table main.User does not exist in the current database`. Isso é a armadilha
"tudo vermelho é indistinguível de harness quebrado", e **não** foi tratado como resultado.

Causa medida, não presumida: em `rv-171/server`, `generated/` é um **symlink** para
`.../worktrees/intelligent-davinci-11d7b9/server/generated`. O client Prisma gerado lá dentro resolve
`DATABASE_URL=file:./test-integration.db` contra o diretório do schema **do outro worktree**, enquanto
`pushTestSchema()` roda `prisma db push` com `cwd` em `rv-171/server`. Prova direta:

```
rv-171/server/prisma/test-integration.db                      786.432 bytes  (o que o db push criou)
intelligent-davinci-11d7b9/server/prisma/test-integration.db        0 bytes  (o que o client abriu)
```

Correção do harness (apenas caminhos **gitignored**, nada rastreado; `git check-ignore` confirma
`server/generated`, `server/node_modules`, `server/prisma/test-integration.db`):

```
rm rv-171/server/generated            # o symlink
cd rv-171/server && npx prisma generate
```

Isto refina a memória `worktree-deps-stale-prisma-client`: o sintoma não é só client *stale* — com
`generated/` junctionado, **o banco de teste que o `db push` cria não é o que o client abre**, e a
suíte inteira reprova por "table does not exist".

### 2.1 CONTROLE de baseline (harness corrigido, sem mutação)

```
cd rv-171/server
OPENAI_API_KEY=ci-dummy-openai-key npx jest --selectProjects integration --runInBand \
  --cacheDirectory C:/Users/smurf/AppData/Local/Temp/jestcache-171 \
  accountingController.integration CounterpartyRepository.integration \
  DimensionRepository.integration ReferentialMappingRepository.integration
```

```
Test Suites: 4 passed, 4 total
Tests:       43 passed, 43 total
Time:        28.454 s
```

Este é o CONTROLE contra o qual toda mutação abaixo foi lida. Distribuição: controller 13,
ReferentialMapping 12, Dimension 9, Counterparty 9 = 43. Zero `.skip`/`.only`/`.todo` nos quatro
arquivos (46/31/44/46 `expect(` respectivamente).

### 2.2 Suíte de integração COMPLETA (falsificador de alcance)

```
OPENAI_API_KEY=ci-dummy-openai-key npx jest --selectProjects integration --runInBand --forceExit
```

Rodada duas vezes, **cada uma já sob mutação minha** (M2 e M4). Nos dois casos:

```
Test Suites: 36 passed, 36 total
Tests:       398 passed, 398 total
```

Ou seja: dois bugs de uma linha — DELETE cross-tenant de conta contábil e escrita de dimensão fora da
transação — atravessam o projeto inteiro sem uma reprovação. **Limite declarado:** não rodei a suíte
completa SEM mutação, então meu controle de baseline é o dos 4 arquivos (§2.1), não o dos 36 (§7).

### 2.3 Harness: divergências declaradas em relação ao dos autores

- Adicionei `--forceExit`. Sem ele o jest **completa a medição e não sai** ("Jest did not exit one
  second after the test run has completed") — foi exatamente isso que os autores leram como
  "travou além de 6m40s / resultado inconclusivo". Ver §5, alegação (b).
- Client Prisma local em vez do symlink (§2.0).
- Protocolo de mutação: `cp F F.bak` → mutar → `git diff --numstat` → rodar → `cp F.bak F` →
  `git diff --numstat` vazio → `rm F.bak`. **Nenhum `git checkout -- <arquivo rastreado>` foi usado**,
  em nenhum momento. Script em scratchpad, fora do repositório.

---

## 3. Minhas próprias mutações

Todas as mutações abaixo foram **escritas por mim** — nenhuma foi copiada literalmente do texto dos
autores. As linhas `R*` reproduzem a *intenção* declarada por eles em sítios que eu localizei sozinho;
as linhas `M*` são ataques que **eles não escreveram**.

### 3.1 Reexecução das mutações dos autores (minha redação, minha medição)

| # | mutação (arquivo:linha — o quê) | `git diff --numstat` | resultado MEU | alegação do autor | leitura |
|---|---|---|---|---|---|
| R1 | `dtos/PostingDto.ts:59` — `debitCents` perde `.max(MAX_CENTS)` | 1/1 | **MORTA** — `Tests: 1 failed, 42 passed` | MATOU | **confirma**, e confirma a nota de precisão: o kill vem do `toContain('debitCents')`, não do status. Mensagem recebida: `fieldErrors.lines: ["creditCents excede o limite..."]` — o 400 continua vindo pelo teto do gêmeo |
| R2 | `controllers/accountingController.ts:37` — `postEntry` resolve dono de `req.body.userId ?? user.userId` | 1/1 | **MORTA** — `Tests: 1 failed` (`inquilino: userId no CORPO é ignorado`) | MATOU | **confirma** |
| R3 | `middleware/auth.ts:76` — `routedMethod` vira `return method` (sem dobra HEAD→GET) | 1/1 | **SOBREVIVEU** — `43 passed, 43 total` | SOBREVIVEU | **confirma**, e confirma a explicação: `routedMethod` só decide `isPublic`/`isAdminOnly`, e o mount de contabilidade não é nenhum dos dois |
| R4 | `middleware/auth.ts:103` — `delete req.headers[header]` vira `void header` (strip desligado) | 1/1 | **SOBREVIVEU** — `43 passed, 43 total` | SOBREVIVEU | **confirma**, e a razão é estrutural mesmo: `auth.ts:126-127` reescreve `x-user-id`/`x-user-role` incondicionalmente pós-verificação |
| R5 | `middleware/auth.ts:40` — `{ path: '/api/accounting', method: 'POST', match: 'prefix' }` **substituindo** a regra de `/api/users` | 1/1 | **MORTA** — `Tests: 8 failed, 35 passed` | SOBREVIVEU | **REFUTA** |
| R5b | `middleware/auth.ts:41` — a MESMA regra **acrescentada** (mutação idêntica à descrita no commit `8d124293`, sem remover nada) | **1/0** | **MORTA** — `Tests: 8 failed, 35 passed` | SOBREVIVEU | **REFUTA** — e isola: o kill não vem de eu ter removido a regra de `/api/users` |
| R6 | `repositories/CounterpartyRepository.ts:24` — `findById` perde `...accountingScopeWhere(scope)` | 1/1 | **MORTA** — `Tests: 1 failed` | MATOU | **confirma** |
| R7 | `repositories/DimensionRepository.ts:63` — `countActiveValues` perde `deletedAt: null` | 1/1 | **MORTA** — `Tests: 1 failed` | MATOU | **confirma** |
| R8 | `repositories/ReferentialMappingRepository.ts:57` — `deleteByAccountVersion` perde `userId, unitId` do `where` | 1/1 | **MORTA** — `Tests: 1 failed` | MATOU | **confirma** |

Os 8 testes que R5/R5b matam (idênticos nos dois): o CONTROLE de `POST /post`, os 3 casos de dinheiro
que dependem de um POST autenticado, e os 4 de inquilino. Os **4 casos do bloco AUTORIZA seguem
verdes** — a frase estreita que os autores escreveram *dentro do arquivo* é verdadeira; o rótulo
`SOBREVIVEU` aplicado à mutação e o número derivado dele não são.

### 3.2 Minhas mutações — as que eles não escreveram

| # | mutação (arquivo:linha — o quê) | `git diff --numstat` | resultado | leitura |
|---|---|---|---|---|
| **M1** | `accountingController.ts:69` — `getTrialBalance` resolve o dono de `(req.query.userId as string) ?? user.userId` | 1/1 | **SOBREVIVEU** — `43 passed` | Mesma classe de bug do R2 (kill dos autores), em handler irmão. A barreira mata em `postEntry` e é cega em `trial-balance`, que ela *toca* (só afere status 401/200 no HEAD/GET) |
| **M2** | `accountingController.ts:194` — `deleteAccount` resolve o dono de `(req.query.userId as string) ?? user.userId` | 1/1 | **SOBREVIVEU** — `43 passed`; e **SOBREVIVEU a `36 suites / 398 tests` da integração inteira** | DELETE cross-tenant de conta do plano, por parâmetro de query, passa por todo o projeto sem uma reprovação |
| **M3** | `accountingController.ts:246` — `if (req.query.from !== undefined \|\| req.query.to !== undefined)` vira `if (false)` | 1/1 | **SOBREVIVEU** — `43 passed` | É literalmente a classe registrada `param-aceito-e-ignorado-e-bug`, com o comentário `ADR-INCR4 Q3` na linha de cima. Ninguém a exercita |
| **M4** | `DimensionRepository.ts:125` — `createPostingDimension` escreve por `prisma` em vez de `(tx ?? prisma)` | 1/1 | **SOBREVIVEU** — `43 passed`; e **SOBREVIVEU a `36 suites / 398 tests` da integração inteira** | Classe registrada `tx-nao-propagado-ao-repo`, na superfície que o próprio arquivo de teste chama de "a que ninguém olha". Produção chama com `tx` em 3 sítios (`PostingService.ts:315`, `:519`, `EntryApprovalService.ts:441`), dentro da tx do `postEntry` — e nem os testes do `PostingService` reprovam |
| **M5** | `CounterpartyRepository.ts:50` — `update` escreve por `prisma` em vez de `(tx ?? prisma)` | 1/1 | **MORTA** — `Tests: 1 failed` (`serviço pelo factory: archive ... na mesma tx`) | Eu previa sobrevivência (nenhum teste chama `update` com handle). O caso de serviço pelo factory pegou. **Ponto para os autores** |
| **M6** | `ReferentialMappingRepository.ts:56` — `deleteByAccountVersion` escreve por `prisma` em vez de `(tx ?? prisma)` | 1/1 | **MORTA** — `Tests: 1 failed` (`sem soft-delete (D5): unset APAGA a linha...`) | Idem — o caso passa pelo serviço e alcança a propagação. **Ponto para os autores** |

Nenhuma das 15 execuções produziu o resultado inválido `Test Suites: falhou` com `Tests: 0 failed`.
Toda mutação foi restaurada de `.bak` com `git diff --numstat` vazio antes da seguinte.

---

## 4. Alegações que CAÍRAM

### (b1) "no accountingController 4 de 6 mutações SOBREVIVERAM" — **FALSO**

Medido: a mutação `auth.ts` → `POST /api/accounting` em `publicApiRoutes` **mata 8 dos 43 testes**,
nas duas formas que testei (substitutiva R5 e aditiva R5b, esta última byte-a-byte o que o commit
`8d124293` descreve, `numstat 1/0`). O placar correto do controller é:

| | autores | medido por mim |
|---|---|---|
| mataram | 2 | **3** (R1, R2, R5b) |
| sobreviveram | 4 | **2** (R3, R4) |
| inválida (não compila) | — | 1 (remover o `throw` da linha 32) |

**Como o erro entrou, e é a parte que importa:** o próprio commit registra o quase-erro —
`"a mutação do publicApiRoutes travou a suíte inteira além de 6m40s na primeira tentativa; timeout é
resultado INCONCLUSIVO, não kill. Refeita com filtro -t \"autoriza\" para obter medição de verdade."`
Reproduzi o mesmo travamento (§2.3): **a suíte não travou — ela terminou e o jest não saiu.** O
arquivo de saída da minha primeira tentativa já continha `Test Suites: 1 failed, 3 passed / Tests: 8
failed, 35 passed / Time: 27.495 s` seguido de `Jest did not exit one second after the test run has
completed`. Os autores converteram um handle aberto em **redução de escopo**, mediram a fatia que
queriam caracterizar, e leram o verde da fatia como sobrevivência da mutação.

Falsificador de uma linha, executável:
`bash mut.sh R5b src/middleware/auth.ts '<insere a regra pública>'` → `Tests: 8 failed, 35 passed`.

### (b2) "no mount de contabilidade o fail-closed é DUPLAMENTE guardado, então **nenhuma mutação de uma linha o derruba**" — **enganosa como escrita**

A parte defensável: com a rota pública, um pedido anônimo continua recebendo 401 (o
`if (!user) throw new UnauthorizedError()` do controller devolve o mesmo status). Não consegui derrubar
isso com uma linha, e concordo que a guarda da linha 32 é **do tipo** — reproduzi que removê-la não
compila (`UserContext | null` em `resolveAccountingScope`).

O que a frase esconde: a mesma mutação **quebra o caminho autenticado** e é apanhada em cheio.
"Nenhuma mutação de uma linha o derruba" foi promovida, no JSON de triagem, a explicação de um
`mutation_score`, e como tal ela é falsa: a mutação é **morta**.

### (b3) A sobrevivência que SOBROU no controller **não é propriedade do desenho — é alcance**

Este é o ataque que os autores pediram e que a evidência sustenta:

- O mount `/api/accounting` registra **56 rotas** (`src/routes/accounting.ts`); o controller exporta
  **23 handlers**. O arquivo novo alcança **4 rotas** (`POST /post`, `POST /reverse`, `GET /entries`,
  `GET`+`HEAD /trial-balance`) — e `trial-balance` só por status.
- `src/controllers/__tests__/accountingController.integration.test.ts` é o **único** teste do
  repositório inteiro que exercita `/api/accounting` (`grep -rln "api/accounting" src --include=*.test.ts`
  devolve, além dele, só `middleware/__tests__/auth.test.ts`, `openapi-paths.test.ts` e
  `route-spec-wiring.test.ts` — nenhum bate no controller).
- Consequência medida: **M1** e **M2** — a MESMA quebra de inquilino que os autores mataram em
  `postEntry` — sobrevivem em `getTrialBalance` e em `deleteAccount`. **M2 sobrevive à suíte de
  integração completa: `36 suites / 398 tests`, tudo verde, com um DELETE cross-tenant de conta do
  plano contábil ativo no código.**

Falsificador de uma linha: aplicar M2 e rodar `npx jest --selectProjects integration --runInBand
--forceExit` → `Test Suites: 36 passed / Tests: 398 passed`.

### (b4) O placar global "13 mutações, 9 mataram" — **contabilidade incompleta**

`TRIAGEM-R1-R3.json`, bloco `PROVA DE MORDIDA por unidade`, enumera **três** das quatro unidades:
Dimension 3/3, ReferentialMapping 4/4, controller 2/6 = 13. **As 3 mutações do `CounterpartyRepository`
(commit `b1464747`, todas mataram) não aparecem** — `"Counterparty" in <bloco>` devolve `False`. O
`REVIEW-LEDGER.jsonl` herda o 13/9.

Total real pelos próprios commits: **16 mutações**. Placar correto após a minha correção de R5:
**13 mataram · 2 sobreviveram · 1 inválida**. Curiosamente o erro subestima o trabalho deles em
contagem enquanto o erro (b1) o superestima em narrativa — os dois têm a mesma raiz: medir por fatia e
não agregar o arquivo.

---

## 5. Alegações que SOBREVIVERAM ao ataque

1. **(c) "`ReferentialMapping` não tem soft-delete; o rótulo da subfila veio do classificador do AV-R2,
   que casa por forma de símbolo e não por schema."** — **VERIFICADO, e é honesto, não conveniente.**
   `prisma/schema.prisma`, `model ReferentialMapping`: 12 campos, **nenhum `deletedAt`**, nenhum
   `@@index([deletedAt])` (compare com `Counterparty` e `DimensionDefinition`, que têm os dois).
   `IReferentialMappingRepository` declara `"No soft-delete (D5) — unset is a real delete; the change
   trail lives in AuditEvent"` e o comentário é **anterior ao PR** (o PR só toca arquivos de teste e
   docs). `deleteByAccountVersion` é `deleteMany`, não `update`. Escrever um caso de soft-delete ali
   inventaria contrato. E as duas substituições são mais fortes que o caso que não cabia: (a) trava a
   característica (unset→re-set não morre em P2002, que é a classe
   `unique-de-idempotencia-x-soft-delete` **não** mordendo aqui) e (b) trava o soft-delete que a
   unidade de fato consome (liveness da conta re-checada in-tx, ACC-011). Minha mutação **R8** e a
   deles em `AccountRepository.ts:52` cobrem os dois lados.

2. **(a) 7 dos kills declarados** — R1, R2, R6, R7, R8 reproduzem exatamente, com a redação da
   mutação sendo minha. As barreiras de repositório são reais.

3. **R3 e R4 são sobrevivências genuínas e a explicação estrutural delas está certa.** Não consegui
   derrubar nenhuma das duas. `routedMethod` só alimenta `isPublic`/`isAdminOnly`, e o strip de
   `INBOUND_IDENTITY_HEADERS` perde para a reescrita incondicional de `x-user-id`/`x-user-role` em
   `auth.ts:126-127`. Nesses dois casos os comentários do arquivo dizem a verdade e declaram o limite
   em vez de vendê-lo como cobertura.

4. **O harness é honesto.** `test/helpers/app.ts` usa `createApp()` de produção; `test/helpers/auth.ts`
   assina **JWT real** com o mesmo segredo que `lib/jwt` verifica (não injeta `x-user-*` direto);
   nenhum dos quatro arquivos faz `jest.mock('@/lib/prisma')`; os negativos de escrita conferem a BASE
   (`prisma.journalEntry.count`), não só o status. Todos os controles positivos que os arquivos
   prometem existem e funcionam — R5/R5b são a prova, porque foi um CONTROLE que os apanhou.

5. **A auto-declaração do PR é correta.** O `REVIEW-LEDGER.jsonl` registra `sem_revisao_independente`
   sem campo `reviewer`, e o `note` nomeia os dois pontos que eu deveria atacar. Um caiu, um resistiu.

---

## 6. Achados novos (NÃO corrigidos — cada um com falsificador executável de uma linha)

Nenhum destes foi corrigido: esta revisão só lê e muta temporariamente.

**RV171-F1 — `createPostingDimension` pode ignorar o `tx` sem nenhum teste reprovar.**
A ponte posting↔valor é escrita **dentro da tx do `postEntry`** em 3 sítios de produção
(`PostingService.ts:315`, `PostingService.ts:519`, `EntryApprovalService.ts:441`). O arquivo novo cobre
a **leitura** da ponte (tenancy de `findPostingDimensions`) e o próprio comentário chama a ponte de
"a superfície que ninguém olha" — mas a **propagação de tx da escrita** não tem caso. Uma etiqueta
escrita fora da tx sobrevive ao rollback de um lançamento abortado: metadado órfão apontando para
`Posting` que não existe. O agravante medido é que **nem os testes do `PostingService` reprovam** —
a etiqueta escrita pelo cliente ambiente é o último write do laço e comita mesmo assim.
*Falsificador:* trocar `(tx ?? prisma).postingDimension.create({ data })` por
`prisma.postingDimension.create({ data })` em `DimensionRepository.ts:125` → `36 suites / 398 tests`
**todos verdes** (e 43/43 nos arquivos do PR).

**RV171-F2 — o controller de contabilidade tem 1 teste para 56 rotas; a quebra de inquilino é
invisível fora de `postEntry`/`reverse`.**
*Falsificador:* trocar `resolveAccountingScope(user, parsed.data.unitId)` por
`resolveAccountingScope({ userId: (req.query.userId as string) ?? user.userId }, parsed.data.unitId)`
em `accountingController.ts:194` (`deleteAccount`) → `36 suites / 398 tests` **todos verdes**.

**RV171-F3 — `getBalanceSheet`/`getIncomeStatement`: a guarda `FROM_DATE_NOT_SUPPORTED_IN_INCR4` não
tem barreira.** É a classe registrada `param-aceito-e-ignorado-e-bug`, com ADR citado na linha acima.
*Falsificador:* `if (req.query.from !== undefined || req.query.to !== undefined)` → `if (false)` em
`accountingController.ts:246` → 43/43 verdes.

**RV171-F4 (harness, não código) — worktree de revisão com `server/generated` junctionado produz
`Tests: 43 failed` por banco vazio, não por regressão.** Ver §2.0. Qualquer revisor que leia esse
vermelho como resultado reprova um PR bom. O gatilho é `The table main.User does not exist`; a prova é
comparar o tamanho dos dois `prisma/test-integration.db`.
*Falsificador:* `ls -la <worktree>/server/generated` → se for symlink, o baseline é inválido antes de
rodar qualquer coisa.

**RV171-F5 (medição) — `jest` sem `--forceExit` nesta suíte termina e não sai.**
`Jest did not exit one second after the test run has completed` aparece DEPOIS do bloco
`Test Suites:`/`Tests:`. Ler o não-encerramento como "travou / inconclusivo" descarta uma medição
completa — foi a causa direta de (b1).
*Falsificador:* rodar os 4 arquivos sem `--forceExit` e procurar `Test Suites:` no arquivo de saída
enquanto o processo ainda vive.

---

## 7. O que ficou FORA desta revisão (sem arredondar)

- **O projeto `unit` (133 suítes / 1590 testes) não foi rodado nenhuma vez.** Zero medição minha ali.
- **`npx tsc --noEmit` não foi rodado.** Confiei no type-check do `ts-jest` para detectar mutação que
  não compila (nenhuma das minhas 15 produziu `Tests: 0`), o que é mais fraco que o gate real.
- **Reexecutei 8 das 16 mutações dos autores.** Das 16, deixei sem reproduzir: 2 das 3 de Counterparty,
  2 das 3 de Dimension, 3 das 4 de ReferentialMapping e a inválida do controller (`throw` da linha 32 —
  aceitei a explicação de narrowing sem executar). Reproduzi pelo menos uma por unidade e por
  invariante (inquilino, tx, softdelete, dinheiro).
- **Suíte de integração completa rodada só sob 2 mutações** (M2 e M4) e **nunca sem mutação**. Meu
  CONTROLE de baseline é o dos 4 arquivos, não o dos 36. Se a suíte completa tiver flake pré-existente,
  minha leitura de "398 passed" o teria absorvido em silêncio.
- **Não medi o alcance dos outros 52 endpoints de `/api/accounting`** além de constatar que nenhum
  teste os toca. Não afirmo que cada um tenha bug — afirmo que nenhum teria barreira se tivesse.
- **`scripts/bancada-gate.mjs` e `scripts/review-ledger-check.mjs` não foram rodados.** Não verifiquei
  se a correção do placar (b4) reprovaria algum gate de bancada.
- **Frontend (`my-app/`), browser sign-off, PVA: fora por completo.** O PR não os toca.
- **Não avaliei se o `mutation_score` errado propaga para `TRIAGEM-AV-R7.json`** (r3/r4), que o próprio
  merge `1158d49c` declara como consequência aberta.

---

## 8. Meus próprios vieses, nomeados

1. **Viés de caçador de buraco.** Escolhi M1/M2/M3 deliberadamente em handlers que eu já sabia
   inalcançados — mutação desenhada para sobreviver sobrevive. Mitiguei reexecutando 8 mutações dos
   autores, das quais 7 mataram, e escrevendo M5/M6 esperando sobrevivência: **as duas mataram**, e
   registrei isso como ponto para eles em vez de omitir o negativo que me contrariou.
2. **Viés de escopo barato.** Rodei 13 das 15 mutações só contra os 4 arquivos do PR, o que enviesa
   para "sobreviveu". Mitiguei levando as duas conclusões mais pesadas (M2, M4) à suíte de integração
   inteira antes de escrevê-las como achado.
3. **Viés de harness próprio.** Mudei o harness (`generated/` local, `--forceExit`) e comparei meus
   números com os deles como se fossem o mesmo instrumento. Nas contagens de teste isso é seguro
   (mesmos 43 casos, mesmo controle); em tempo de execução **não é**, e por isso não usei tempo como
   evidência de nada.
4. **Viés de manchete.** Recebi a instrução de que a alegação (b) era "a mais suspeita do lote". Fui
   procurar exatamente lá, e achei. Isso não valida a instrução: se o furo real estivesse em (c), meu
   esforço desbalanceado teria dado a (c) um passe barato. Contra-medida parcial: fui ao schema e à
   interface de (c) antes de mutar qualquer coisa, e (c) resistiu por evidência própria.
5. **Viés de família.** Sou o mesmo modelo que escreveu o PR. O que os autores acharam óbvio e não
   testaram tende a ser o que eu acho óbvio e não testo. A quantidade de sobrevivências que encontrei
   por *alcance* (e não por lógica) é consistente com esse ponto cego compartilhado — não descarto que
   exista uma classe inteira que nenhum de nós dois enxergou.
6. **Viés de generosidade tardia.** Ao descobrir que (b) caiu, tive de resistir à inclinação de
   endurecer o veredito para além do que a evidência sustenta. O código de teste entregue é bom; o que
   está errado é a escrituração da medição, e o veredito separa as duas coisas de propósito.

---

## 9. Estado do worktree ao encerrar

`git status --porcelain` em `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-171`: **vazio**.
Nenhum `.bak` remanescente fora de `node_modules`. Nenhum commit, `git add`, push ou merge foi feito.
As únicas alterações persistentes são **gitignored** e de harness: `server/generated/` deixou de ser
symlink e passou a ser client gerado localmente (§2.0), e `server/prisma/test-integration.db` foi
recriado pelos `pushTestSchema()` das suítes. Este arquivo de relatório é o único artefato escrito no
worktree do orquestrador.

---

## Adendo do orquestrador — reexecução independente da mutação central

**Autor deste adendo:** claude-opus-5, sessão orquestradora (2026-08-07). É uma **terceira** medição:
nem a sequência que implementou o PR #171, nem o revisor acima. Worktree `rv-168`, com o client Prisma
**gerado localmente** (não junctionado — ver o achado de harness da §2.0 acima, que reproduzi).

Motivo do adendo: a alegação (b) é a manchete do lote inteiro, e o revisor a derrubou usando
`match: 'prefix'` nas duas formas. Fui atrás da forma **literal** descrita no comentário do teste
(`accountingController.integration.test.ts:312`), que é `match: 'exact'`. O resultado separa duas
coisas que estavam coladas.

| Mutação em `middleware/auth.ts` | `git diff --numstat` | `tsc --noEmit` | Resultado |
|---|---|---|---|
| **controle** (sem mutação) | 0/0 | 0 | `Tests: 13 passed, 13 total` |
| `{ path: '/api/accounting', method: 'POST', match: 'exact' }` acrescentada — **a forma literal do comentário do autor** | 1/0 | 0 | **VERDE** (82/82 nas 14 suítes de integração do recorte) |
| a mesma linha com `match: 'prefix'` | 1/0 | 0 | **`Tests: 8 failed, 5 passed, 13 total`** |

Comando (as três linhas usaram o mesmo harness, com o controle verde na mesma sessão):

```
OPENAI_API_KEY=ci-dummy-openai-key npx jest --selectProjects integration --runInBand --forceExit \
  --cacheDirectory <cache> src/controllers/__tests__/accountingController.integration.test.ts
```

**O que isto acrescenta ao que o revisor achou.** A alegação "*nesta rota o fail-closed é DUPLAMENTE
guardado, e por isso NENHUMA mutação de uma linha o derruba*" cai por **duas** razões independentes, e
a segunda é pior que a primeira:

1. **Uma mutação de uma linha derruba, sim** — `prefix` mata 8 de 13. É o que o revisor mediu, e eu
   reproduzi o número exato por caminho próprio.
2. **A mutação que o autor de fato escreveu era VACUOSA.** `match: 'exact'` sobre `/api/accounting`
   não casa `/api/accounting/entries` — o `publicApiRoutes` do arquivo distingue `exact` de `prefix`
   explicitamente. A regra acrescentada nunca é consultada por rota nenhuma, então o verde dela não é
   evidência sobre o fail-closed: é evidência de que a mutação não tocou o sistema. Um teste que
   "sobrevive" a uma mutação que não muda comportamento não demonstra propriedade de desenho nenhuma.
   Isto é a **armadilha 5** do `CONTINUACAO.md` com o sinal invertido: lá a suíte não roda e parece
   mordida; aqui a mutação não morde e parece propriedade.

**Sobre o "travamento" que levou o autor a re-medir com `-t "autoriza"`:** reproduzi. Sem
`--forceExit`, o jest não sai depois de terminar os testes e a execução fica pendurada — a minha
estourou um teto de 10 minutos sem imprimir o placar. O `package.json` do próprio projeto usa
`--forceExit` em `test:integration`; com ele, a mesma suíte termina em 10,8 s e reprova. O que foi
lido como "a suíte trava, preciso reduzir o escopo" era **handle aberto na saída do jest**, não a
suíte. A redução de escopo que veio depois é o que produziu o rótulo `SOBREVIVEU`.

**Limite deste adendo:** medi o arquivo do controller (13 casos), não os 43 do recorte do revisor, e
não reexecutei as outras 12 mutações do lote — a §5 acima já o fez. Não corrigi nada: nem o comentário
do teste, nem o `TRIAGEM-R1-R3.json`, nem o placar. Os dois achados acima ficam **abertos e não
triados**, pelo bloco 9 do AV-00.
