# BE-INCR-BINDING-FEEDER — BRIEF de planejamento (o alimentador da prensa)

> Produzido por **sessão de planejamento** em 2026-08-22. Escopo: **backend**. FE é nó vizinho (não
> há UI nova prevista — o gap é 100% de boot/wiring). **Este documento NÃO ratifica fork nenhum** —
> todo fork abaixo está `RATIFICAÇÃO PENDENTE`, decisão fora desta sessão (dono).

> **Atualização 2026-08-22 — os 6 forks foram RATIFICADOS pelo dono** (`AskUserQuestion`, duas
> rodadas, mesma data — evento separado desta sessão de planejamento). Nenhum fork abaixo continua
> `RATIFICAÇÃO PENDENTE`; cada linha da tabela na §5 ganhou uma coluna de decisão preservando o texto
> original de opções/recomendação. §2 (checklist, itens 3 e 7) e §3 (contrato esboçado) foram
> ajustados para ficarem consistentes com as decisões — sem implementar nada, o BRIEF continua sendo
> planejamento. F-FEEDER-1 decidiu **CONTRA** a recomendação original e nasceu **ADR próprio**:
> [`docs/adr/ADR-INCR-BINDING-FEEDER.md`](../adr/ADR-INCR-BINDING-FEEDER.md) (em elaboração por outra
> sessão neste momento — este documento só referencia o caminho, não o lê nem o cria).

## Contexto fixo

- **Item:** BE-INCR-BINDING-FEEDER — o passo que falta depois de `BE-INCR-BINDING-PRESS` (P1,
  mergeado PR #211, `dfaed751`) para que um `AccountingBinding` **persistido no banco** com
  `status='Active'` realmente alimente o dispatcher (`AccountingSyncService`) em produção.
- **Autorização:** "pode disparar o plano" (dono, 2026-08-22, mensagem desta tarefa — FRENTE 1). Este
  BRIEF cobre exatamente o planejamento do alimentador; não amplia para P2 nem para qualquer código.
- **Insumos existentes (artefatos em disco):**
  - `docs/adr/ADR-P1-binding-press.md` (Accepted, ratificado fork-a-fork 2026-08-21) e
    `docs/accounting/BE-INCR-BINDING-PRESS-brief.md` (itens 14/15 — swap do salão e rotas 3-toques).
  - `docs/adr/ADR-P2-second-vertical.md` (Draft/PRE-ADR) + `docs/adr/PARECER-ARCHITECT-ADR-P2.md` §1.5.
  - `docs/adr/ADR-M2-deploy-topology.md` (Accepted 2026-08-22 — decisão 2: uma instância por cliente).
  - `docs/accounting/ACCOUNTING-MASTER-MAP.md` (fold 2026-08-22, linhas 62-90 e 461-469 — trata o
    swap do salão como fechado; **não menciona** este gap).
  - `docs/ROADMAP-PLATAFORMA.md` (Fase P1 "onde vive"/"prova de saída", Fase P2 linha ~104 "git diff
    do motor/ledger/intérprete… é vazio").
  - Código: `server/src/lib/factory.ts`, `server/src/features/accountingBinding/**`,
    `server/src/features/accounting/sync/AccountingSyncService.ts`,
    `server/src/features/accounting/sync/AccountingSyncPort.ts`,
    `server/src/features/accountingBinding/interpreter/InterpretedEventMapper.ts`,
    `server/src/features/accountingBinding/__tests__/goldenPhase1.test.ts`, `server/src/server.ts`.
- **Nós vizinhos:** consome `IAccountingBindingRepository`/`BindingScope` (módulo `accountingBinding`,
  intocado — só leitura nova), `archetypeCatalog` (Corpo A, intocado), `InterpretedEventMapper` (Corpo
  D, intocado — só quem o instancia muda), `AccountingScope`/`resolveAccountingScope` (leitura, não
  escrita). É consumido por `lib/factory.ts` (ponto único de construção do
  `AccountingSyncService`) e por `server/src/server.ts` (timing de boot).

## Definição de pronto (deste BRIEF)

Documento com: (1) checklist numerado de comportamentos testáveis individualmente; (2) contratos de
entrada/saída esboçados (assinatura, não implementação); (3) lista de forks — cada um com caminhos,
recomendação técnica marcada como recomendação, e status `RATIFICAÇÃO PENDENTE`. Nenhum fork abaixo
está decidido por este documento.

> **SUPERSEDIDO EM 2026-08-22 (mesma data):** este parágrafo descreve o estado do BRIEF **na sessão de
> planejamento**. Os 6 forks foram ratificados pelo dono no mesmo dia, via `AskUserQuestion` em duas
> rodadas — ver a coluna "Decisão RATIFICADA" na tabela de forks e o `docs/adr/ADR-INCR-BINDING-FEEDER.md`
> (Accepted). O texto original fica como registro do que o BRIEF sozinho **não** decidiu.

---

## 1. O achado — evidência e o que deixa de funcionar

### 1.1 Evidência (reconfirmada nesta sessão, em disco)

- Único call-site de produção: `grep -n "new AccountingSyncService" server/src/lib/factory.ts` →
  **uma ocorrência**, `factory.ts:519`:
  ```
  const accountingSyncService = new AccountingSyncService(postingService, buildSalonAccountingMappers());
  ```
- `buildSalonAccountingMappers()` (`factory.ts:173-182`) itera `SALON_BINDING_V1.eventBindings` — um
  **import estático** de TypeScript (`factory.ts:97`:
  `import { SALON_BINDING_V1 } from '../features/accountingBinding/fixtures/salonBinding'`), nunca
  uma leitura de `prisma.accountingBinding`.
- `grep -rln "AccountingBindingRepository" server/src` (fora de `__tests__`) → só
  `accountingBinding/controllers/accountingBindingController.ts`,
  `accountingBinding/policies/AccountingBindingPolicy.ts`,
  `accountingBinding/repositories/AccountingBindingRepository.ts`,
  `accountingBinding/repositories/IAccountingBindingRepository.ts`,
  `accountingBinding/services/BindingCompileService.ts` e o DI em `factory.ts:764`
  (`getAccountingBindingCompileService`). **Nenhum desses é o dispatcher.** O repositório serve só o
  ciclo compile/validate/listar (rotas `POST /accounting-binding/compile|validate`,
  `GET /accounting-binding`) — nunca é lido de volta para montar o array de mappers.
- O próprio master map confirma o mecanismo sem perceber o gap (`ACCOUNTING-MASTER-MAP.md:74`):
  *"`buildSalonAccountingMappers()` constrói `InterpretedEventMapper` sobre a fixture
  `SALON_BINDING_V1`"* — registrado como item FECHADO do BRIEF do P1 (item 14, "swap do salão"), que
  de fato está feito **para esse binding específico embutido em código**. O que não está feito é
  o binding **compilado/persistido pela rota `POST /compile`** chegar a esse array.

### 1.2 O que deixa de funcionar hoje

- `POST /accounting-binding/compile` roda o compilador, valida, persiste uma linha `Active` em
  `accounting_bindings` — e essa linha **não tem efeito nenhum** no runtime de postagem. Um operador
  que recompile o binding do salão (ex.: adicionar uma dimensão nova, mudar um `roleSlots.accountCode`)
  vê a rota responder 200/`Active`, mas o `AccountingSyncService` continua rodando com os mappers
  gerados do `SALON_BINDING_V1` **fixo em código**, montado uma vez no boot. Silenciosamente
  divergente — a UI/API de compilação mente sobre o que está "ativo".
- Para o vertical 2 (P2), isso é o bloqueio literal citado pelo dono: acrescentar o binding do setor 2
  exigiria editar `factory.ts` à mão (um segundo `import` + uma segunda entrada no array), o que faz a
  prova de saída da Fase P2 (`ROADMAP-PLATAFORMA.md` ~linha 104: *"`git diff` do motor/ledger/
  intérprete… é vazio"*) sair **vazia por construção** — não porque a prensa funcionou, mas porque
  ninguém tentou fazer o segundo vertical acontecer sem editar código.

---

## 2. Checklist numerado de comportamentos (candidato — nenhum implementado aqui)

1. **Montar o array de mappers a partir dos bindings `Active` do banco**, não de um import estático —
   substituindo (ou envolvendo) `buildSalonAccountingMappers()`. Teste: com uma linha `AccountingBinding`
   `Active` semeada no banco de teste, o array resultante contém um `InterpretedEventMapper` cujo
   `sourceType` bate com o `eventKey` da linha.
2. **Salão continua byte-idêntico** — `goldenPhase1.test.ts` (17 casos, comparação `.toBe` de string
   canonicalizada, nunca `.toEqual`) continua verde **sem editar o arquivo de teste**, alimentado pela
   MESMA fixture `SALON_BINDING_V1`, agora por um caminho que (nesse teste específico) pode continuar
   sendo a fixture direta — ver item 4 (o feeder lê do banco em produção; o teste golden não precisa
   depender do banco para continuar sendo o oráculo do intérprete). Este item é uma trava de regressão,
   não um comportamento novo.
3. **Dois bindings `Active` coexistem sem colisão de `eventKey`** — hoje
   `AccountingSyncService` registra mappers num `Map` chaveado por `sourceType`
   (`this.mappers = new Map(mappers.map((m) => [m.sourceType, m]))`,
   `AccountingSyncService.ts:39`), e `InterpretedEventMapper.sourceType` **vem literalmente de
   `binding.eventKey`** (`InterpretedEventMapper.ts:43`, comentário explícito confirmando que é a
   MESMA chave). Um `Map` com chave duplicada faz o último `set()` vencer **em silêncio** — sem erro,
   sem log. Teste: dois bindings `Active` (escopos diferentes ou, pior, o mesmo `eventKey` por erro de
   dado) montando o alimentador devem OU (a) ser mutuamente exclusivos por escopo (nunca colidem porque
   nunca coexistem no mesmo array — ver fork de resolução por scope abaixo) OU (b) o alimentador detecta
   e falha alto na colisão, nunca last-write-wins silencioso.
   **DECIDIDO 2026-08-22 (F-FEEDER-3 → opção nova (c), nem (a) nem (b) do parágrafo acima):** o `Map`
   de `AccountingSyncService` (`AccountingSyncService.ts:45`/`:51`) passa a ser chaveado por
   `` `${event.unitId}:${event.sourceType}` `` em vez de só `event.sourceType`. Fecha a colisão POR
   CONSTRUÇÃO: dois `Active` só colidem se tiverem o MESMO `unitId` **e** o MESMO `eventKey` — caso de
   dado inválido dentro da mesma unidade, não mais o caminho padrão entre setores diferentes. Teste:
   dois bindings `Active` de unidades diferentes emitindo o MESMO `eventKey` (ex.: as duas
   `salon.sale.finalized`) coexistem sem colidir; dois bindings `Active` da MESMA unidade com o MESMO
   `eventKey` continuam colidindo e devem falhar alto (o caso (b) do texto acima nunca foi descartado,
   só deixou de ser o único jeito de fechar o comportamento).
4. **Modo de falha: instância sobe sem NENHUM binding `Active`.** Hoje o import estático GARANTE que
   `buildSalonAccountingMappers()` sempre devolve 5 mappers — nunca zero. Lendo do banco, um banco sem
   seed (primeiro boot de um cliente novo, ou um teste de integração isolado) devolve **zero linhas**
   `Active` ⇒ array vazio ⇒ `AccountingSyncService` sobe **sem nenhum mapper registrado**. Hoje
   `AccountingSyncService.sync()` já lança `ValidationError` por `sourceType` desconhecido
   (`AccountingSyncService.ts:54` — "Nenhum mapper registrado para o evento…"), então o
   comportamento por-evento já falha alto — **mas só quando um evento chega**. O boot em si não avisa
   ninguém. Decisão obrigatória do fork F-FEEDER-4 (abaixo): o feeder tem de decidir se falha o BOOT
   (processo não sobe) ou loga ERRO alto e sobe mudo — "sobe mudo e falha por evento" é o modo de falha
   SILENCIOSO que este item existe para vetar. Teste: banco vazio de bindings ⇒ comportamento
   determinístico e ALTO (não passa despercebido em nenhum ambiente, inclusive produção).
5. **Escopo do binding lido é compatível com o escopo do evento.** `BindingScope`
   (`ownerUserId`+`actorUserId`+`unitId`) e `AccountingScope` têm o mesmo shape mas são tipos
   DIFERENTES por desenho (fronteira de módulo, `IAccountingBindingRepository.ts:4-11`). O feeder
   precisa decidir SE resolve por escopo (um array de mappers por `(userId,unitId)`) ou GLOBAL (um
   array único cobrindo todos os `Active` do banco, com o risco do item 3). Ver fork F-FEEDER-3.
6. **`goldenPhase1`/testes de unidade não passam a depender de banco.** O golden test é sobre o
   INTÉRPRETE (arquétipo+binding→`PostEntryInput`), não sobre O QUE ALIMENTA o dispatcher em produção —
   ele deve continuar construindo `InterpretedEventMapper` diretamente sobre `SALON_BINDING_V1`, sem
   tocar Prisma. Teste: `goldenPhase1.test.ts` não ganha `beforeEach` de seed de banco.
7. **Timing do boot documentado e testado.** `ApplicationFactory` é singleton com `private constructor`
   síncrono (`factory.ts:365`, `getInstance()` síncrono em `factory.ts:737-742`) — hoje **nenhum**
   ponto do bootstrap (`server.ts`) aguarda uma Promise antes de `app.listen()`. Ler bindings do banco
   é inerentemente assíncrono (`prisma.accountingBinding.findMany`). O comportamento escolhido
   (fork F-FEEDER-5) precisa ter teste de que o servidor não aceita tráfego HTTP antes do alimentador
   estar pronto (se a opção escolhida for pré-boot), ou que o primeiro request tolera lazy-load
   (se a opção for lazy).
   **DECIDIDO 2026-08-22 (F-FEEDER-5 → (a) PRÉ-BOOT):** `server.ts` aguarda a Promise do alimentador
   ANTES de `app.listen()` — primeira vez que o bootstrap do projeto bloqueia o `listen()` numa
   Promise (o precedente do `Qdrant` fire-and-forget, citado na §5, fica registrado como exceção
   deliberada anterior, não revogado). Teste: o servidor não aceita tráfego HTTP antes do alimentador
   estar pronto; a cláusula "primeiro request tolera lazy-load" NÃO se aplica — opção (b) não foi
   escolhida.

---

## 3. Contratos esboçados (forma, não implementação)

> **Atualizado 2026-08-22 pós-ratificação** — versão anterior deste contrato recebia `scopes:
> BindingScope[]` por causa do fork F-FEEDER-3 então em aberto. F-FEEDER-3 decidiu uma opção nova
> (nem (a) nem (b) da §5): chave composta no `Map` do singleton, sem parâmetro de escopo nenhum. O
> esboço abaixo reflete essa decisão — a versão com `scopes` fica só na §5 como registro histórico da
> opção (a) não escolhida.

```ts
// Substituto/envelope de buildSalonAccountingMappers(), forma candidata — local exato
// (factory.ts vs um serviço novo em accountingBinding) é o fork F-FEEDER-1/F-FEEDER-2, RATIFICADO
// 2026-08-22 → (b) ADR próprio (docs/adr/ADR-INCR-BINDING-FEEDER.md).
async function buildAccountingMappersFromActiveBindings(
  repo: IAccountingBindingRepository,
  archetypeCatalog: ReadonlyMap<string, Archetype>,
  // SEM parâmetro de escopo — RATIFICADO 2026-08-22 (F-FEEDER-3 → opção nova (c)): leitura é sempre
  // global, todos os `Active` do banco. O singleton de AccountingSyncService é preservado.
): Promise<IAccountingEventMapper[]> {
  // Lê TODOS os Active do banco (repo já tem essa forma), resolve archetypeKey→Archetype (mesmo
  // guard de erro hoje presente em buildSalonAccountingMappers — "fiação da Fase B quebrada").
  // Colisão (comportamento 3, F-FEEDER-3 → (c)): o Map de AccountingSyncService passa a ser
  // chaveado por `${event.unitId}:${event.sourceType}` (hoje só `event.sourceType`,
  // AccountingSyncService.ts:45/:51) — dois Active só colidem dentro do MESMO unitId; detectar e
  // falhar alto continua sendo o comportamento para essa colisão restante.
  // Zero bindings Active (comportamento 4, F-FEEDER-4 → (a)): lança alto ANTES de app.listen()
  // (F-FEEDER-5 → (a), pré-boot) — o processo não sobe, não "sobe mudo e falha por evento".
}
```

- **Entrada:** repositório de binding (já existe, intocado), catálogo de arquétipos (já existe,
  intocado). **RATIFICADO 2026-08-22 (F-FEEDER-3 → (c)):** nenhum parâmetro de escopo — a leitura é
  sempre global (todos os `Active` do banco); a opção (a) "lista explícita de `BindingScope`" NÃO foi
  escolhida.
- **Saída:** `IAccountingEventMapper[]` — mesmo shape que `AccountingSyncService` já recebe hoje no
  construtor (zero linha tocada em `AccountingSyncPort`/bridges — mesma garantia que o BRIEF do P1 já
  fez para o swap do salão). **Correção pós-ratificação:** a versão anterior desta frase incluía
  `AccountingSyncService` na lista de "zero linha tocada" — isso não é mais exato. A decisão
  F-FEEDER-3(c) muda a chave do `Map` interno de `AccountingSyncService` (~2 linhas,
  `AccountingSyncService.ts:45`/`:51`); só `AccountingSyncPort`/bridges seguem intocados.
- **Modo de erro:** colisão de `eventKey` **dentro da mesma chave composta** `unitId:sourceType` (dois
  `Active` do MESMO `unitId` com o MESMO `eventKey` — caso de dado inválido; deixou de ser o caminho
  padrão entre setores diferentes, que agora nunca colide) → erro nomeado explícito (não
  `ValidationError` genérica reaproveitada — precisa ser distinguível em log/alerta). Zero bindings
  `Active` → **RATIFICADO 2026-08-22 (F-FEEDER-4 → (a)):** o BOOT falha (processo não sobe), erro
  nomeado explícito DIFERENTE do de colisão, lançado antes de `app.listen()` (F-FEEDER-5 → (a),
  pré-boot).
- **Premissa a confirmar na implementação (F-FEEDER-3):** que `unitId` seja id de linha globalmente
  único — hoje isso é só o que a documentação do campo indica (`AccountingScope.ts:18`, "Business
  unit scoped string"), não algo provado por constraint de banco. A chave composta só fecha a colisão
  por construção se essa premissa for verdadeira; a sessão de feature precisa confirmá-la (ou blindar
  contra ela ser falsa) antes de tratar o comportamento 3 como fechado.
- **Fora do esboço:** o mecanismo exato de scheduling (boot único vs relido periodicamente) — **F-
  FEEDER-5 RATIFICADO → (a) pré-boot: leitura é boot único** (aguardada antes de `app.listen()`), não
  relida periodicamente; releitura fica fora deste alimentador, combinada com o "gatilho de
  recompilação" já registrado como decorrência em F-BP-6 do BRIEF do P1 (arquivo/versão nova só nasce
  por recompilação; nada hoje invalida um mapper JÁ construído quando um novo binding é ativado —
  esse é o mesmo problema, um nível acima).

---

## 4. Como `SALON_BINDING_V1` vira linha `Active` no banco — opções (sem escolher)

Hoje o salão roda 100% da fixture em código; nenhuma linha `accounting_bindings` para o salão existe
a menos que alguém chame `POST /compile` manualmente. Três caminhos, custo de cada:

| Opção | Mecanismo | Custo/risco |
|---|---|---|
| **(a) Seed de banco** (`prisma/seed.ts` ou script dedicado) | Insere a linha `Active` diretamente via `prisma.accountingBinding.create`, bypassando o compilador (o `payload` é literalmente `SALON_BINDING_V1` serializado) | Mais simples; mas a linha nasce SEM passar pelo validador/compilador — se o schema/chart real de um tenant novo divergir do snapshot embutido na fixture, a linha "ativa" pode não corresponder ao chart real daquele tenant. `parked-unmerged-worktrees` já registra que `db:seed` faz upsert da senha do admin — precedente de seed idempotente existe, mas nunca para dado contábil |
| **(b) Migração de dado** (script standalone, não `prisma migrate`) | Roda uma vez por instância, chama o `BindingCompileService.compile()` de verdade contra o chart real do tenant, produzindo uma linha `Active` legítima (passou pelo validador) | Mais correto (usa o caminho já testado do Corpo C), mas precisa rodar DEPOIS que o chart de contas do tenant existe — ordem de bootstrap importa; ADR-M2 já decidiu migração como ETAPA SEPARADA do deploy (decisão 4) — este script teria de se encaixar nessa etapa, não no boot do processo |
| **(c) Primeiro boot idempotente** (o próprio `buildAccountingMappersFromActiveBindings` detecta ausência de `Active` e AUTO-COMPILA o binding do salão antes de servir) | Zero passo manual — o processo se auto-corrige | Reintroduz async no caminho de boot (mesmo problema do comportamento 7); e mistura "ler o que está no banco" com "decidir o que devia estar no banco" no mesmo código — risco de esconder o caso (b) que DEVERIA ter rodado como etapa de deploy |

Nenhuma das três está descartada aqui — é fork F-FEEDER-6 (abaixo).

---

## 5. Forks — RATIFICADOS 2026-08-22 (dono, via `AskUserQuestion`, duas rodadas)

> Texto de "Opções"/"O que cada uma FECHA"/"Recomendação" preservado **como escrito nesta sessão de
> planejamento** — o histórico importa, em especial no F-FEEDER-1 (o dono decidiu CONTRA a
> recomendação) e no F-FEEDER-3 (a decisão é uma opção que este BRIEF não continha). A coluna
> "Decisão" é a única adição pós-ratificação.

| # | Fork | Opções | O que cada uma FECHA | Recomendação (não-vinculante) | Decisão RATIFICADA 2026-08-22 |
|---|---|---|---|---|---|
| **F-FEEDER-1** | Isto é resíduo do P1 (executa sem ADR novo, como emenda ao ADR-P1 já Accepted) ou incremento com ADR próprio? | (a) emenda ao `ADR-P1-binding-press.md` — o BRIEF do P1 já previu Fases 0/A/B/C implicitamente e este é "o resto da Fase B que ficou de fora do item 14/15" · (b) `ADR-INCR-BINDING-FEEDER` próprio, citando P1 como pré-requisito | (a) mantém tudo num documento só, evita fragmentar governança de uma decisão pequena; risco: o ADR-P1 já está "Accepted" e fechado no master map — reabri-lo para emenda pode confundir o fold de 2026-08-22 que o declarou mergeado. (b) cria rastreabilidade própria (mais fácil de citar/auditar depois), custo: mais um documento para um incremento que é, na prática, "terminar o item 14" | **(a)** — o gap é estritamente dentro do que o BRIEF do P1 já escopou como "swap do salão" (item 14); tratar como incremento novo com ADR próprio infla governança para o que é, tecnicamente, a metade que ficou faltando de uma decisão já ratificada (F-P1-3a). Mas a recomendação é fraca — se o dono achar que qualquer coisa que muda o boot do processo merece ADR próprio (dado o achado do timing síncrono, comportamento 7), (b) é defensável | **(b) ADR próprio** — o dono foi CONTRA a recomendação (a) registrada nesta linha. Razão dada: o alimentador muda o **BOOT** do processo (comportamento 7 — primeira vez que o bootstrap aguarda uma Promise antes do `listen()`), não é só trocar a fonte de dado de um binding já escopado pelo P1. ADR nascido: [`docs/adr/ADR-INCR-BINDING-FEEDER.md`](../adr/ADR-INCR-BINDING-FEEDER.md) (elaborado por sessão separada) |
| **F-FEEDER-2** | `factory.ts` entra ou sai do perímetro "zero-diff" da prova de saída do P2? | (a) dentro — todo diff em `factory.ts` entre vertical 1 e vertical 2 é falha da prensa · (b) fora — `factory.ts` pode mudar por vertical, a prova mede só `features/dynamicTables`+`features/accounting` núcleo+intérprete | Confirmado por leitura dos dois textos: `PARECER-ARCHITECT-ADR-P2.md` §1.5 (tabela) recomenda **explicitamente "INCLUIR"** `server/src/lib/factory.ts` no perímetro, citando as linhas hardcoded (`91-95/402-407`, hoje 97/173-182 pós-renumeração) como prova de acoplamento por vertical. O texto FINAL de `ADR-P2-second-vertical.md` §2 ("prova de saída") diz apenas *"git diff do motor (`features/dynamicTables`), do ledger (`features/accounting` núcleo) e do intérprete… é vazio"* — **`factory.ts` não é citado**, nem para incluir nem para excluir explicitamente. A emenda do parecer **não foi incorporada ao texto ratificado do ADR-P2**. Isso é exatamente a lacuna que este alimentador precisa fechar ANTES de a Fase P2 tentar rodar a prova — sem ele, `factory.ts` PRECISA mudar por vertical (import a mão), e (a) falharia trivialmente enquanto (b) validaria uma prova que o próprio parecer chama de risco de "falso positivo de zero-diff" | **(a)** — a recomendação do parecer é diretamente aplicável e o achado deste BRIEF (item 1) é a prova em código de que ela está certa: hoje `factory.ts` MUDARIA por vertical se nada for feito. Implementar o alimentador é precisamente o que torna (a) alcançável (o `factory.ts` para de listar classes por vertical); sem o alimentador, só (b) é fisicamente possível, o que o parecer já sinalizou como medir "quão parecido é o vertical 2", não "quão boa é a prensa" | **(a) `factory.ts` DENTRO do perímetro zero-diff** — confirma a recomendação registrada nesta linha; nenhuma opção nova |
| **F-FEEDER-3** | Resolução dos mappers é por ESCOPO (`userId`+`unitId`) ou GLOBAL (um array único, todos os `Active` do banco, chave `eventKey` compartilhada entre tenants) | (a) por escopo — o alimentador é chamado por `(userId,unitId)`, mirror do padrão já usado em `getAccountingBindingCompileService(scope)` (não memoizado, construído por chamada) · (b) global — um único array na construção do singleton, como hoje, só que lido do banco em vez da fixture · **(c) NOVA, ausente deste BRIEF na sessão de planejamento — chave composta `unitId:sourceType` no `Map` do singleton.** Mantém a forma GLOBAL de (b) (nenhuma mudança de `AccountingSyncService`/`getInstance()`/factory), mas o `Map` que hoje é `new Map(mappers.map(m => [m.sourceType, m]))` (confirmado em disco: `AccountingSyncService.ts:45`, lookup por `event.sourceType` na `AccountingSyncService.ts:51`) passa a ser chaveado por `` `${event.unitId}:${event.sourceType}` `` — usando o `unitId` que `AccountingEvent` já carrega. Custo ~2 linhas | (a) resolve o comportamento 3 (colisão de `eventKey`) por CONSTRUÇÃO — dois tenants nunca compartilham o mesmo array, então nunca colidem entre si (colisão só é possível DENTRO do mesmo escopo, caso de dado inválido). Mas exige que `AccountingSyncService` deixe de ser singleton-por-processo e passe a ser resolvido por request/escopo — mudança de forma, não só de fonte de dado. (b) preserva a forma atual (singleton) mas reintroduz o risco do item 3 entre tenants diferentes SE a instância hospedar mais de um `unitId`/`userId` (ver §6 abaixo — ADR-M2 não impede isso). **(c) fecha a mesma colisão que (a) fecha, por construção, sem o custo de forma de (a)** — e fecha exatamente a colisão que a MEDIÇÃO abaixo prova ser o caminho padrão, não um azar: a bridge de vendas acha a tabela por `findTableByInternalName(userId, 'sales')` (confirmado em disco: `SalonSalesAccountingBridge.ts:55`) — **cega a setor** —, então uma clínica emitiria `salon.sale.finalized`, chave IDÊNTICA à do salão; sem (c) [ou (a)], isso É uma colisão de `Map`, não uma hipótese | **(a)** tecnicamente mais correta (fecha a colisão por desenho, não por teste), mas é a opção de MAIOR custo de implementação (singleton→por-escopo é uma mudança de forma no `AccountingSyncService`/factory, tocando as dezenas de call-sites de `ApplicationFactory.getInstance()`/`getFactory()` (`grep -rl "getInstance()\|getFactory()" server/src \| wc -l` = 65 arquivos em 2026-08-22 — o número exato varia com o padrão do grep; o que importa é a ordem de grandeza) só indiretamente, mas exigindo decidir COMO o controller que dispara um evento contábil hoje obtém o `AccountingSyncService` já resolvido para o escopo certo). (b) é mais barata mas empurra o problema pro comportamento 3 nunca ser fechado por desenho — só por teste/detecção em runtime | **(c) chave composta `unitId:sourceType`** — nem (a) nem (b), opção que este BRIEF não continha na sessão de planejamento. Fecha a colisão por construção mantendo o singleton (evita o custo de forma de (a)); é mais barata que (a) e mais correta que (b) sozinho. **Medição que originou a opção, confirmada em disco nesta rodada:** `AccountingSyncService.ts:45` (`this.mappers = new Map(mappers.map((m) => [m.sourceType, m]))`) + `AccountingSyncService.ts:51` (`this.mappers.get(event.sourceType)`) e `SalonSalesAccountingBridge.ts:55` (`repo.findTableByInternalName(actor.userId, 'sales')`, cego a setor). **Premissa a confirmar na implementação:** que `unitId` seja id de linha globalmente único — hoje só documentado (`AccountingScope.ts:18`, "Business unit scoped string"), não provado por constraint. Contrato da §3 reescrito para refletir esta decisão |
| **F-FEEDER-4** | Modo de falha quando zero bindings `Active` | (a) falha o BOOT — processo não sobe, erro fatal no `server.ts` antes de `app.listen()` · (b) sobe, loga ERRO nível crítico (alerta), mas aceita tráfego — cada evento então falha individualmente (herda o `ValidationError` que `AccountingSyncService.sync()` já lança hoje por `sourceType` desconhecido) | (a) fecha o caso "produção rodando sem nenhum lançamento contábil acontecer, ninguém percebe até o fechamento do mês" — mas eleva o risco operacional de um deploy travar se o seed/migração (fork da §4) não rodou corretamente antes. (b) é mais tolerante a ordem de bootstrap (permite subir a API mesmo se o binding ainda não foi semeado) mas reintroduz exatamente o modo de falha silencioso que este item do checklist existe para vetar — só é "alto" se alguém está olhando o log de ERROR ativamente | **(a)** para o caso hoje conhecido (o salão, único vertical) — a app SEMPRE precisa ter pelo menos o binding do salão ativo para operar; um boot sem binding nenhum é, por definição, um ambiente mal-provisionado, e falhar cedo é mais barato que descobrir no fechamento mensal. Reavaliar para P2 se/quando existir um cenário legítimo de "app sobe antes do onboarding terminar" (não existe hoje, não verificado) | **(a) o BOOT FALHA** com zero bindings `Active` — confirma a recomendação registrada nesta linha; nenhuma opção nova |
| **F-FEEDER-5** | Timing do boot — pré-carrega antes de aceitar tráfego, ou lazy no primeiro uso | (a) pré-boot — `server.ts` aguarda uma Promise de inicialização do alimentador ANTES de `app.listen()` (mudança de padrão: hoje NADA no bootstrap é `await`ado antes do listen) · (b) lazy — primeiro `sync()`/primeira resolução do escopo dispara a leitura do banco sob demanda, com cache | (a) fecha o comportamento 7 de forma auditável (o processo simplesmente não sobe até o alimentador estar pronto) mas MUDA o padrão de bootstrap do servidor pela primeira vez (`Qdrant` é fire-and-forget deliberadamente — precedente contrário) — precisa decidir timeout/retry se o banco não responde. (b) preserva o padrão atual (nada bloqueia o listen) mas a PRIMEIRA requisição contábil paga a latência da leitura + corre risco de concorrência (duas requisições simultâneas disparando a leitura antes do cache popular) | **(a)** combina melhor com F-FEEDER-4(a) — se o boot já pode falhar por binding ausente, falhar ali mesmo (síncrono ao operador, no log de start) é mais simples que descobrir a falha no primeiro request. Mas é a opção que mais diverge do padrão hoje estabelecido em `server.ts` — merece atenção extra na revisão | **(a) PRÉ-BOOT** — confirma a recomendação registrada nesta linha; nenhuma opção nova. Primeira vez que o bootstrap do projeto bloqueia o `listen()` numa Promise |
| **F-FEEDER-6** | Como `SALON_BINDING_V1` vira `Active` no banco (detalhe da tabela da §4) | (a) seed direto · (b) migração de dado via compilador real · (c) auto-compila no primeiro boot | Ver custo/risco de cada na tabela da §4 | **(b)** — é o único caminho que exercita o validador (Corpo B) contra o chart real, em vez de confiar cegamente no snapshot embutido na fixture; encaixa na decisão 4 do ADR-M2 (migração como etapa separada do deploy, já um "job próprio" a escrever, §7.3 do ADR-M2) — este seed poderia viajar no MESMO job | **(b) MIGRAÇÃO DE DADO via compilador real** — confirma a recomendação registrada nesta linha; nenhuma opção nova. Encaixa na etapa de migração já separada pelo ADR-M2 decisão 4 — ver nova §8 "Pré-condição de deploy" abaixo |

---

## 6. A simplificação "instância por cliente ⇒ sem resolução por tenant" — checada contra o código

**Não se sustenta como está — evidência:**

1. `ADR-M2-deploy-topology.md` decisão 2 diz literalmente *"um SQLite + uma env por cliente, **não uma
   instância compartilhada por `AccountingScope`**"* — isso fecha o caso de MÚLTIPLOS CLIENTES na mesma
   instância. Mas não decide, e o código não impõe, que um único cliente tenha um único
   `(userId, unitId)`.
2. `AccountingScope.unitId` é documentado como *"Business unit scoped string (a DynamicTable row id
   used as plain scope key)"* (`AccountingScope.ts:18`) — uma unidade de negócio, não o cliente
   inteiro. Nada no schema/código impede um cliente (uma instância, um `ownerUserId`) de operar mais de
   uma `unitId` (ex.: uma rede com duas filiais, cada uma sua própria unidade DynamicTable) dentro do
   MESMO banco SQLite.
3. `BindingScope` (`IAccountingBindingRepository.ts:12-19`) espelha DELIBERADAMENTE o shape de
   `AccountingScope` — `ownerUserId`+`actorUserId`+`unitId` — e `AccountingBinding` é único por
   `(userId, unitId, sectorKey, bindingVersion)` (`@@unique`, item 1 do checklist do BRIEF do P1). Ou
   seja: o PRÓPRIO desenho do binding já assume que pode haver mais de um binding ativo por instância —
   um por unidade, não um por instância.
4. Nada verificado impede duas unidades do MESMO cliente rodando setores DIFERENTES (uma filial salão,
   outra filial — hipoteticamente — clínica estética), cada uma com seu próprio `sectorKey`/binding.
   Não há teste/constraint no código que rejeite essa configuração hoje.

**Conclusão:** "uma instância por cliente" fecha a resolução de binding **entre clientes** (nunca dois
`ownerUserId` de clientes diferentes competem por eventKey na mesma instância — isso É verdade e reduz
o problema). Mas **não** elimina a resolução por escopo **dentro** de uma instância, porque o eixo de
tenancy do domínio contábil é `(userId, unitId)`, não "a instância". O fork F-FEEDER-3 continua sendo
uma decisão real, não cosmética — a simplificação proposta na tarefa reduz o RAIO da colisão (de
"qualquer cliente" para "unidades do mesmo cliente"), não a elimina.

**RATIFICADO 2026-08-22 (F-FEEDER-3 → (c)):** a decisão real prevista acima aconteceu — a chave
composta `unitId:sourceType` fecha exatamente o raio que esta seção prova não-eliminado por "uma
instância por cliente": colisão **dentro** de uma instância entre `unitId`s diferentes do mesmo
cliente (ex.: duas filiais, setores distintos). Ver §5 (F-FEEDER-3) e §3 (contrato revisado).

---

## 7. Riscos

1. **Teste de integração** — hoje `ApplicationFactory.getInstance()` é síncrono e chamado em pelo menos
   52 pontos (`grep -rln "ApplicationFactory.getInstance\|getFactory()" server/src` = 52 arquivos).
   Qualquer opção que torne a construção do `accountingSyncService` assíncrona (F-FEEDER-5a) ou
   dependente de uma tabela populada (F-FEEDER-4a) exige que TODA suíte que hoje instancia a factory
   sem semear `accounting_bindings` passe a semear — inclusive suítes que não testam nada de
   contabilidade, se o boot falhar cedo. Risco de regressão ampla em `npm run test:integration`
   (lição já registrada: precisa `--runInBand`, isolar 1 suíte antes de reportar regressão).
2. **Primeiro deploy** — ADR-M2 decisão 4 fixa migração como etapa separada, NUNCA passo manual nem
   entrypoint que migra no boot. Se o alimentador ficar friccionado com essa decisão (ex.: F-FEEDER-6c,
   auto-compilar no boot), o feeder estaria fazendo NO PROCESSO exatamente o que o ADR-M2 acabou de
   proibir para migração de schema — mesmo não sendo uma migração de schema, é escrita de dado no boot,
   textualmente o padrão que a decisão 4 rejeitou ("etapa separada… nunca… entrypoint que migra no
   boot"). Isso pesa contra F-FEEDER-6(c) e a favor de (a)/(b) rodarem como job separado.
3. **`dev.db` real sem seed** — o mesmo padrão já registrado (`smoke-gate-s6-x-migracao-de-dado`,
   `dynamictable-money-and-uniqueness-limits`) se repete aqui: se o `dev.db` de desenvolvimento nunca
   ganhar uma linha `AccountingBinding` `Active` para o salão, QUALQUER smoke-gate rodado sobre cópia
   dele passaria por VACUIDADE (zero bindings ⇒ zero mappers ⇒ zero lançamento tentado ⇒ nenhuma
   asserção de contabilização é sequer exercitada) — a menos que o modo de falha (F-FEEDER-4) seja "a"
   (falha alto), que pelo menos torna a vacuidade RUIDOSA em vez de silenciosa.
4. **Blast radius do union fechado `AccountingEvent['sourceType']`** (achado colateral, fora do
   escopo estrito do alimentador mas bloqueante para P2 na prática): `sourceType` é uma union
   TypeScript fechada de 5 literais (`AccountingSyncPort.ts:26-30`), e
   `InterpretedEventMapper.sourceType = binding.eventKey as AccountingEventLike['sourceType']` já
   força um cast através dela. Um `eventKey` de um binding de setor 2 (ex.: algo como
   `clinic.appointment.completed`) não pertence a essa union — o cast compila (é só `string as union`),
   mas widening real da união exigiria tocar `AccountingSyncPort.ts` e os ~14 arquivos que hoje
   referenciam literais `salon.*` (`grep -rln "salon.sale.finalized" server/src` fora de testes = 14).
   Isso não é um comportamento deste BRIEF (não está no checklist §2) — registrado aqui como risco
   ADJACENTE que o dono deveria saber que existe antes de tratar o alimentador como "P2 pronto para
   rodar assim que ligar".

---

## 8. Pré-condição de deploy — encadeamento com o ADR-M2

**RATIFICADO 2026-08-22 — decorrência direta das decisões acima, não é fork novo:**

1. **F-FEEDER-4 → (a):** o boot FALHA com zero bindings `Active` no banco.
2. Um binding `Active` só existe depois de uma migração de dado rodar — **F-FEEDER-6 → (b)**:
   `BindingCompileService.compile()` de verdade contra o chart de contas real do tenant, não seed
   direto nem auto-compilação no boot.
3. Logo: **chart de contas semeado → binding compilado (`Active`) → boot do processo** é ordem
   OBRIGATÓRIA, não sugerida. Inverter qualquer par trava o boot (item 1) ou compila contra um chart
   que ainda não existe (item 2).
4. O script do F-FEEDER-6(b) **encaixa na etapa de migração já separada do deploy** — [ADR-M2
   decisão 4](../adr/ADR-M2-deploy-topology.md) já fixou "migração é etapa SEPARADA do pipeline de
   deploy, não acoplada" (ver §5.1 Bloco A item 5 do `ACCOUNTING-MASTER-MAP.md`). Este alimentador não
   introduz uma etapa nova de deploy: ele torna a ordem chart→binding→boot uma **pré-condição dura**
   que a etapa de migração do ADR-M2 já tinha o lugar certo para cumprir — o script do F-FEEDER-6(b) é
   o candidato natural a viajar nela, no MESMO job.
5. **Não decidido aqui** (fora do escopo deste BRIEF, decisão de implementação): o mecanismo exato que
   garante essa ordem em produção — checagem no próprio script de migração, gate no pipeline de
   deploy, ou uma mensagem de erro no boot que aponte para a causa em vez de só falhar mudo. Cabe à
   sessão de feature.

## Pendente de validação externa

- Nenhuma regra contábil/fiscal nova — o alimentador não decide QUE lançamento é gerado (isso é do
  intérprete/arquétipo, já mergeado), só QUAL array de mappers alimenta o dispatcher.

## Insumos ausentes

- Nenhum identificado que bloqueie a decisão dos forks acima — os seis forks são decidíveis com o que
  já está em disco.

## Achados fora de escopo (não planejar aqui)

- Widening do union `AccountingEvent['sourceType']` para aceitar `eventKey`s de setores futuros —
  registrado como risco (§7.4), não planejado neste BRIEF; é pré-requisito de P2, não deste alimentador.
- Mudança de forma de `AccountingSyncService` de singleton-por-processo para resolvido-por-escopo — só
  necessária SE F-FEEDER-3(a) for ratificado; não pré-decidida aqui.
- Job de migração de dado do ADR-M2 (§7 item 3 daquele ADR) como infraestrutura geral — este BRIEF só
  registra que o seed do binding do salão (F-FEEDER-6) poderia viajar nele, não desenha o job em si.
