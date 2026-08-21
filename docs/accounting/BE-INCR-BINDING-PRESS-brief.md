# BE-INCR-BINDING-PRESS — BRIEF de implementação (a Prensa, Fase P1)

> Produzido por **sessão de planejamento** em 2026-08-21. Escopo: **backend**. FE é nó vizinho
> (fica para `FE-INCR-*` próprio, se houver).

## Contexto fixo

- **Item:** BE-INCR-BINDING-PRESS — engine de binding em tempo de geração + intérprete fixo de
  runtime, conforme [ADR-P1-binding-press.md](../adr/ADR-P1-binding-press.md) (**Accepted**,
  ratificado fork-a-fork 2026-08-21) e `ROADMAP-PLATAFORMA.md` Fase P1.
- **Autorização:** ADR-P1 cabeçalho (ratificação F-P1-1..7 + revogação da pré-condição de PVA,
  dono, 2026-08-21, via AskUserQuestion nesta sessão) + master map, atualização 2026-08-21 (nó ⏳).
- **Insumos (artefatos em disco, não memória):** `docs/adr/ADR-P1-binding-press.md` (§11 emendas),
  `docs/adr/PARECER-ARCHITECT-ADR-P1.md`, `docs/accounting/P1-DOSSIER-arquetipos.md` (§2 catálogo,
  §4 esboço `Archetype`), `P1-DOSSIER-schema-binding.md` (§a anatomia `AccountingBindingV1`),
  `P1-DOSSIER-validador.md` (§1 checklist 9 checagens, §3.2 contrato de saída),
  `P1-DOSSIER-interprete.md` (§b `InterpretedEventMapper` + factory.ts:402-408, §c guards, §e paths),
  `P1-DOSSIER-golden-test.md` (corpus 15 casos, serializador canônico, 2 fases).
- **Nós vizinhos:** consome `IAccountingEventMapper`/`AccountingSyncService` (contrato intocado),
  `PostingService.postEntry` (toque ÚNICO permitido: modo validate-only, emenda §8),
  `AccountRepository` (checagens 3-5), chart fixture. É consumido por `lib/factory.ts` (array de
  mappers vira construído) e, futuramente, pelo pipeline de geração (P2).

## Decisões já ratificadas que este BRIEF materializa (não rediscutir)

F-P1-1(b) 2 classes de arquétipo · F-P1-2(b) tabela Prisma `AccountingBinding` · F-P1-3(a) swap do
salão pós-golden · F-P1-4(a) dinheiro no intérprete + discriminador de slot · F-P1-5(a) papel→conta
na compilação · F-P1-6(b1) validador estrutural + validate-only · F-P1-7 módulo irmão
`server/src/features/accountingBinding/` · Emendas 1-6 do parecer (ADR §11).

## Checklist numerado de comportamentos (cada um testável individualmente)

### Fase 0 — schema e contratos (SERIAL; nada dos corpos antes dela)

1. **Model Prisma `AccountingBinding`** — migração aditiva `CREATE TABLE` pura (zero ALTER):
   `userId`+`unitId` (tenancy padrão), `sectorKey`, `bindingVersion` (int monotônico),
   `compiledAt`, `compiledFromHash`, `payload` (JSON do `AccountingBindingV1`), `status`
   (`Draft|Active|Superseded`), soft-delete `deletedAt`,
   `@@unique([userId, unitId, sectorKey, bindingVersion])`. Dono do model: módulo
   `accountingBinding` (F-P1-7) — **nunca** `features/accounting`. Teste: migração roda sobre cópia
   do dev.db real sem tocar tabela existente.
2. **DTO Zod `.strict()` do binding** — `AccountingBindingV1Schema` conforme
   `P1-DOSSIER-schema-binding.md §a`, com: `archetypeKey` enum FECHADO (2 classes),
   `fieldSlots[].transform` enum fechado (`cents_from_reais|identity` — nunca expressão livre,
   invariante 5), `roleSlots[].accountCode` obrigatório (F-P1-5a → sempre presente; o shape
   condicional do dossiê colapsa). Gate: snapshot de shape dos DTOs atualizado na mesma mudança.
3. **Catálogo de papéis `AccountRole` como union fechada** — congelado nesta fase (fork F-BP-3
   ratificado; lista de 9 papéis do `P1-DOSSIER-arquetipos.md §4` como ponto de partida). Teste:
   todo `role` usado pelos arquétipos do item 4/5 pertence à union.

### Corpo A — catálogo de arquétipos (paralelo após Fase 0)

4. **5 arquétipos classe 1 (`kind: 'postEntry'`) em código testado** — reconhecimento-receita,
   liquidação, estorno-origem (devolução — emenda 1: NÃO é o reversedById), passivo-performance,
   cmv — extraídos 1:1 dos mappers (slots/guards/linhas conforme `P1-DOSSIER-arquetipos.md §2`).
   Balanceiam por construção (Σdebit==Σcredit simbólico) — teste de propriedade por arquétipo.
   Slot de dimensão opcional em todos (emenda 2). `sourceType`/`sourceId` passthrough puro (emenda 5).
5. **Arquétipo classe 2 (`kind: 'createSubledgerRecord'`)** — `criacao-titulo-receber`, extraído do
   `CrmReceivableBridge`: os **3 guards de idempotência ficam em CÓDIGO do arquétipo** (chave por
   `documentNumber`, lookup tombstone-aware, cancelado nunca ressuscita — cerca anti-§4 do ADR §11).
   Teste: segunda emissão do mesmo comando converge sem duplicar (asserção na SEGUNDA chamada —
   lição `comentario-de-teste-afirma-o-que-nao-assere`).

### Corpo B — validador determinístico (paralelo)

6. **Checagens estruturais 1-8** do `P1-DOSSIER-validador.md §1` (arquétipo existe; slots completos;
   conta existe/folha/ativa via `AccountRepository`; **natureza×papel** — checagem 6, o gap central,
   nova; sem slot órfão; versão íntegra). Checagem 9 colapsa em F-P1-5(a): checagens 3-6 rodam na
   compilação contra o `accountCode` literal. Um teste vermelho→verde por checagem.
7. **Modo validate-only do `postEntry`** (F-P1-6b1) — refatoração interna do `PostingService`
   preservando contrato público; roda TODAS as validações e não persiste. **Par de testes de
   caracterização antes/depois obrigatório** (emenda §8 do ADR) + teste de que validate-only não
   grava linha nem evento de audit.
8. **Contrato de saída `BindingValidationResult`** (bloqueante vs aviso, conforme
   `P1-DOSSIER-validador.md §3.2`), consumível pelo compilador (item 9) e pelo futuro fluxo
   PROPOSED da entrevista.

### Corpo C — compilador (paralelo)

9. **`BindingCompileService`** — entrada: (schema operacional do preset instalado + chart do tenant +
   escolhas papel→conta); saída: `AccountingBindingV1` **validado** (itens 6-8) e persistido com `bindingVersion`
   incrementado e `compiledFromHash` (hash de schema+chart). **F-BP-2(b): validador PASS sem
   bloqueante ⇒ auto-ativa** (`Active`; a versão anterior vira `Superseded` atomicamente na mesma
   tx — gate re-checado in-tx, T6); qualquer bloqueante ⇒ fica `Draft` com o
   `BindingValidationResult` persistido/retornado. Recompilação NUNCA edita in-place (invariante 4).
   Gatilhos de recompilação documentados no service (emenda 4); arquivamento de conta = F-BP-6(a),
   validador proativo sem hook.
10. **Binding do salão compilado como fixture de referência** — o corpus dos 5+1 arquétipos
    re-expresso como dado (insumo do golden, item 12). Sem IA nesta fase: a proposta assistida por
    IA na entrevista fica FORA (ver Achados fora de escopo).

### Corpo D — intérprete fixo + wiring (paralelo)

11. **`interpret()` + `InterpretedEventMapper`** — adaptador fino implementando
    `IAccountingEventMapper` (proposta literal do `P1-DOSSIER-interprete.md §b`); dispatch por
    `kind` (2 efeitos), **zero branch de negócio** (lista proibido/permitido do dossiê §a); guards
    de dinheiro no intérprete com discriminador `moneyReais`/`moneyCentsExact` (F-P1-4a; divergência
    de tetos preservada — fork F-BP-4). Atualizar o comentário de `IAccountingEventMapper.ts:7-10`.
12. **Golden test byte-idêntico** — serializador canônico + Fase 0 (fixtures dos mappers-à-mão) +
    Fase 1 (mapper vs intérprete+binding-do-salão, os 15 casos do corpus + lacunas apontadas no
    dossiê cobertas); entra no job `Server – typecheck & test` (obrigatório na branch protection).
13. **Teste de fronteira de import** — espelho do precedente `no-accounting-imports.boundary.test.ts`:
    `features/accountingBinding/` não importa de `features/accounting` além dos contratos públicos
    listados (DTO/`IAccountingEventMapper`), e `features/accounting` não importa de
    `accountingBinding` — direção única, factory como único ponto de junção.

### Fase B — swap e registro (SERIAL, gated no item 12 verde)

14. **Swap do salão (F-P1-3a)** — `lib/factory.ts:402-408` deixa de instanciar os 5 mappers à mão e
    constrói o array com `InterpretedEventMapper` sobre o binding do salão. Zero linha em
    `AccountingSyncPort`/`AccountingSyncService`/bridges. Gate: golden verde É pré-condição do
    commit deste item; suíte accounting inteira verde depois do swap.
15. **Rotas 3-toques + audit + gates de casa** — **F-BP-1(b) ratificado:** rotas
    `POST /accounting-binding/compile`, `POST /accounting-binding/validate`,
    `GET /accounting-binding` (listagem/estado) com a cadeia completa
    Route→Controller→Service→Repository (+ Policy, Factory, DTO Zod `.strict()`); registro 2 toques
    (`index.ts` + `docs.paths.ts`) + guard de path-count do openapi atualizado. (Sem rota `activate`
    separada: F-BP-2(b) fez a ativação ser efeito do compile/validate.) Todo eventType novo
    (`binding.compiled`, `binding.activated`, `binding.validation_failed`) entra na allowlist do
    `auditCanonical.ts` NA MESMA mudança (o `auditAllowlistCoverage.test.ts` morde); snapshot de
    shape dos DTOs atualizado.

## Contratos (forma materializável)

Esboços completos e citados nos dossiês — o implementador parte deles, não de prosa:
`AccountingBindingV1Schema` (`P1-DOSSIER-schema-binding.md:102-133`), `Archetype` union 2 membros +
`ArchetypeSlotSchema`/`ArchetypeLineSchema` (`P1-DOSSIER-arquetipos.md:292-387`),
`BindingValidationResult` (`P1-DOSSIER-validador.md §3.2`), `InterpretedEventMapper`
(`P1-DOSSIER-interprete.md:134-143`).

## Forks — estado da ratificação (2026-08-21, dono via AskUserQuestion)

| # | Fork | Decisão | Status |
|---|---|---|---|
| F-BP-1 | Exposição do compilador/ativação | **(b) rotas 3-toques já** (`/binding/compile`, `/validate`, `/activate`) — divergiu da rec. (a); item 15 do checklist vira obrigatório com cadeia completa DTO+Policy+Factory+openapi | **RATIFICADO** |
| F-BP-2 | Quem ativa o binding (Draft→Active) | **(b) auto-ativa pós-validador** — divergiu da rec. (a). **Risco assumido registrado:** o validador determinístico (com dry-run validate-only) passa a ser o ÚNICO gate entre compilação e caminho do dinheiro — nenhum checkpoint humano. Isso ELEVA o item 6/7 (validador) a criticidade máxima do incremento | **RATIFICADO** |
| F-BP-3 | Congelar `AccountRole` na Fase 0 | **(a) congelar já** (9 papéis do dossiê como base) | **RATIFICADO** |
| F-BP-4 | Tetos de dinheiro divergentes | Seguindo **(a) preservar verbatim** — **por decorrência**, não por ratificação: a opção (b) quebraria o gate byte-idêntico do ADR §7 (JÁ ratificado) e exigiria emenda. Dono pediu revisão um-a-um não concluída — **reabrível sem custo antes do merge** (unificação seria follow-up de qualquer forma) | DECORRÊNCIA · revisão pendente |
| F-BP-5 | Guard `SalonSaleSettledMapper.ts:85-89` | Seguindo **(a) guard permitido no intérprete, verbatim** — mesma decorrência do §7 (mover quebra byte-idêntico); registrado como caso-fronteira nomeado na lista de permitidos do gate anti-erosão | DECORRÊNCIA · revisão pendente |
| F-BP-6 | Gatilho de recompilação por conta arquivada | Seguindo **(a) validador proativo, sem hook** — caminho sem código novo (construir o hook (b) é que exigiria autorização); rede final = erro in-tx do `resolveLeafAccount`, presente nas duas opções | DECORRÊNCIA · revisão pendente |

## Pendente de validação externa

- Nenhuma regra contábil/fiscal NOVA: os arquétipos herdam partidas já mergeadas e testadas (mappers
  de produção). O sign-off PVA do vertical 1 segue aberto (Degrau 0) e a revogação da pré-condição
  está registrada no ADR §9 com o risco assumido.

## Insumos ausentes

- Encaixe do veredito do validador no fluxo PROPOSED da entrevista: o lado server de
  `features/interview` está NÃO-PLUGADO (`features/interview/README.md:16-21`) e o frontend não foi
  auditado — irrelevante para os itens 1-15 (nenhum depende da entrevista), vira insumo do P2.

## Achados fora de escopo (não planejar aqui)

- Proposta de binding assistida por IA na entrevista (engine de matching) — P2/incremento próprio.
- FE de qualquer natureza; envio de ECD por e-mail; preset clínica estética (P2).
- Unificação dos tetos de dinheiro (se F-BP-4(a)) — candidato a follow-up pós-golden.
