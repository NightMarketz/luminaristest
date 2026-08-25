# ADR-INCR-BINDING-FEEDER — O alimentador: bindings `Active` do banco chegando ao dispatcher

> **Status: Accepted — RATIFICADO PELO DONO 2026-08-22** (via `AskUserQuestion`, duas rodadas). Seis
> decisões, tomadas sobre os forks levantados em `docs/accounting/BE-INCR-BINDING-FEEDER-brief.md`
> (sessão de planejamento, 2026-08-22). Resultado:
> **F-FEEDER-1 → ADR PRÓPRIO** (este documento — não é emenda ao `ADR-P1-binding-press.md`);
> **F-FEEDER-2 → `server/src/lib/factory.ts` DENTRO do perímetro zero-diff** da prova de saída do P2;
> **F-FEEDER-3 → chave composta `unitId:sourceType`** no `Map` de mappers do `AccountingSyncService`;
> **F-FEEDER-4 → o boot FALHA** se zero bindings `Active`;
> **F-FEEDER-5 → PRÉ-BOOT** — `server.ts` aguarda o alimentador antes de `app.listen()`;
> **F-FEEDER-6 → migração de dado via compilador real** (`BindingCompileService.compile()`), nunca
> seed direto nem auto-compilação no boot.
>
> **Origem:** achado desta sessão de planejamento sobre `docs/adr/ADR-P1-binding-press.md` (Accepted,
> PR #211, `dfaed751`) — a prensa comprime mas nada alimenta o motor em produção. **Classe:** DECISÃO
> ARQUITETURAL — muda o BOOT do processo (F-FEEDER-4/F-FEEDER-5), o que a torna distinta de "troca de
> fonte de dado" e justifica rastreabilidade própria (ver §2, F-FEEDER-1).
>
> Criado: 2026-08-22.

---

## 1. Contexto e o achado

O `ADR-P1-binding-press.md` (Accepted, mergeado) entregou o **compilador**: `POST
/accounting-binding/compile` roda o validador, persiste uma linha `Active` em `accounting_bindings`.
O que ele não entregou — e que esta sessão de planejamento encontrou ao verificar o estado real do
código — é o **alimentador**: o caminho que leva essa linha `Active` até o `AccountingSyncService`, o
dispatcher que de fato processa eventos contábeis em runtime.

Evidência de código (reconfirmada nesta sessão):

- Único call-site de produção do dispatcher — `server/src/lib/factory.ts:519`:
  ```
  const accountingSyncService = new AccountingSyncService(postingService, buildSalonAccountingMappers());
  ```
  `buildSalonAccountingMappers()` itera `SALON_BINDING_V1.eventBindings`, um **import estático** de
  TypeScript (`factory.ts:97`) — nunca uma leitura de `prisma.accountingBinding`.
- `AccountingBindingRepository` (e o resto do módulo `accountingBinding`) não tem consumidor no
  dispatcher — é usado só pelo ciclo compile/validate/listar (rotas `POST
  /accounting-binding/compile|validate`, `GET /accounting-binding`), nunca lido de volta para montar o
  array de mappers de `AccountingSyncService`.

Consequência prática: um operador que recompila o binding do salão (ex.: adiciona uma dimensão, muda
um `roleSlots.accountCode`) vê a rota responder 200/`Active`, mas o dispatcher continua rodando com os
mappers gerados de `SALON_BINDING_V1` fixo em código, montado uma única vez no boot — silenciosamente
divergente. Para o vertical 2 (P2), isso é o bloqueio literal citado pelo dono: acrescentar o binding
do setor 2 exigiria editar `factory.ts` à mão, o que faz a prova de saída da Fase P2 (`git diff` do
motor/ledger/intérprete vazio) sair vazia **por construção** — não porque a prensa funcionou, mas
porque ninguém tentou fazer o segundo vertical acontecer sem editar código.

## 2. Decisão F-FEEDER-1 — ADR próprio, não emenda ao ADR-P1

O alimentador deixou de ser "só troca de fonte de dado" e passou a mudar o **BOOT do processo**
(F-FEEDER-4: boot falha sem binding `Active`; F-FEEDER-5: `server.ts` passa a aguardar uma Promise
antes de `app.listen()` pela primeira vez no bootstrap do projeto). Uma mudança de timing/modo-de-falha
do bootstrap merece rastreabilidade própria — citável e auditável sem reabrir o `ADR-P1-binding-press.md`,
que o master map já trata como fechado (fold 2026-08-22). É por isso que este ADR existe como
documento independente, e não como emenda.

## 3. Decisão F-FEEDER-2 — `factory.ts` entra no perímetro zero-diff da prova de saída do P2

Todo diff em `server/src/lib/factory.ts` entre o vertical 1 e o vertical 2 conta, a partir de agora,
como **FALHA da prensa**. O texto que formaliza isso no documento que define a prova de saída é uma
emenda ao `ADR-P2-second-vertical.md` §2, aplicada nesta mesma tarefa (ver §10 abaixo).

## 4. Decisão F-FEEDER-3 — chave composta `unitId:sourceType`

O `Map` de mappers do `AccountingSyncService` (hoje `new Map(mappers.map(m => [m.sourceType, m]))`,
`AccountingSyncService.ts:45`, lookup por `event.sourceType` na `:51`) passa a ser chaveado por
**unidade + evento** (`unitId:sourceType`), usando o `unitId` que o `AccountingEvent` já carrega
(`AccountingSyncPort.ts`, campo documentado como *"Tenancy unit of the SOURCE record — never defaulted
or inferred elsewhere"*). Isso fecha a colisão de `eventKey` entre dois bindings `Active` **por
construção**, mantendo o singleton do dispatcher (não exige a mudança de forma
singleton→resolvido-por-escopo que a opção alternativa do BRIEF, F-FEEDER-3(a) "por escopo completo",
exigiria).

> **ATENÇÃO — esta opção não estava no BRIEF.** Ela surgiu de medição feita depois da sessão de
> planejamento original (que só apresentava "por escopo" vs. "global" como opções). A chave composta é
> uma terceira via, mais barata que reformar o `AccountingSyncService` para resolvido-por-escopo e mais
> segura que o `Map` global chaveado só por `sourceType`.

**Premissa a confirmar na implementação (não provada aqui):** que `unitId` seja um id de linha
globalmente único (nunca reutilizado entre tenants/unidades diferentes). A documentação do campo em
`AccountingSyncPort.ts` indica isso ("Tenancy unit... never defaulted or inferred elsewhere"), mas essa
propriedade **não foi verificada em código/teste** por esta sessão — é uma leitura de comentário, não
uma prova. A sessão de feature que implementar este ADR deve confirmá-la (ou instrumentá-la) antes de
confiar na chave composta para fechar a colisão.

## 5. Decisão F-FEEDER-4 — boot falha sem binding `Active`

Se a leitura de bindings `Active` no banco devolver zero linhas, o **boot falha**: o processo não sobe,
erro fatal antes de `app.listen()`. Para o caso hoje conhecido (o salão, único vertical), a aplicação
sempre precisa ter pelo menos um binding ativo para operar; um boot sem binding nenhum é, por
definição, um ambiente mal-provisionado — falhar cedo é mais barato que descobrir a ausência de
lançamentos no fechamento mensal. Esta decisão fecha o modo de falha silencioso identificado no BRIEF
(comportamento 4): hoje o import estático garante 5 mappers sempre; lendo do banco, "sobe mudo e falha
só por evento" seria o modo de falha vetado por esta decisão.

## 6. Decisão F-FEEDER-5 — pré-boot

`server.ts` passa a **aguardar** a inicialização do alimentador (leitura assíncrona dos bindings
`Active` no banco) antes de chamar `app.listen()`.

Registro honesto: esta é a **primeira vez** que o bootstrap do projeto bloqueia o `listen()` numa
dependência assíncrona. O precedente existente aponta na direção contrária — o Qdrant é inicializado
**fire-and-forget** deliberadamente (o servidor aceita tráfego HTTP antes do Qdrant estar pronto). Esta
decisão diverge desse precedente conscientemente, porque combina com F-FEEDER-4: se o boot já pode
falhar por ausência de binding, falhar ali mesmo (síncrono ao operador, visível no log de start) é mais
simples que descobrir a falha no primeiro request contábil.

**Timeout e política de retry ficam para a implementação** — não decididos por este ADR.

## 7. Decisão F-FEEDER-6 — migração de dado via compilador real

Como `SALON_BINDING_V1` vira linha `Active` no banco (pré-requisito para F-FEEDER-4 não travar o boot
do próprio salão): via **script standalone de migração de dado** que chama
`BindingCompileService.compile()` contra o chart de contas **real** do tenant, produzindo uma linha
`Active` legítima — passou pelo validador, não é um snapshot de fixture bypassando o Corpo B.

Explicitamente rejeitados:
- **Seed direto** (`prisma.accountingBinding.create` com o payload serializado da fixture) — nasce sem
  passar pelo validador; se o chart real de um tenant novo divergir do snapshot embutido na fixture, a
  linha "ativa" pode não corresponder ao chart real daquele tenant.
- **Auto-compilação no boot** (o próprio alimentador detecta ausência de `Active` e compila sozinho
  antes de servir) — reintroduz async no caminho de boot além do que F-FEEDER-5 já introduz, e mistura
  "ler o que está no banco" com "decidir o que devia estar no banco" no mesmo código; risco de esconder
  o caso em que a migração de dado deveria ter rodado como etapa de deploy e não rodou.

Este script se encaixa na etapa de migração já ratificada no `ADR-M2-deploy-topology.md` (decisão 4:
migração como etapa separada do pipeline, nunca passo manual nem entrypoint que migra no boot) — pode
viajar no **mesmo job**, não precisa de infraestrutura própria.

## 8. Consequências

1. **O boot passa a depender do banco.** Antes desta decisão, `ApplicationFactory.getInstance()` era
   inteiramente síncrono e não tocava o banco para montar o dispatcher contábil. Depois, o processo só
   sobe se a leitura de `accounting_bindings` (a) rodar sem erro e (b) devolver ao menos uma linha
   `Active`. Isso é uma mudança de superfície de falha de deploy — qualquer suíte de teste de
   integração que hoje instancia a factory sem semear `accounting_bindings` passa a precisar semear,
   inclusive suítes que não testam nada de contabilidade, se o boot falhar cedo.
2. **A ordem de bootstrap vira pré-condição dura de deploy.** Chart de contas do tenant → binding
   compilado (F-FEEDER-6) → boot do processo (F-FEEDER-4/F-FEEDER-5) é agora uma sequência obrigatória,
   não uma conveniência. Isso encadeia diretamente com a decisão 4 do `ADR-M2-deploy-topology.md`
   (migração como etapa separada, antes do swap de container): o job de migração de dado deste ADR
   **precisa** rodar e terminar antes do container novo receber tráfego, ou o boot falha por desenho
   (F-FEEDER-4). Um deploy que rode o swap de container antes do job de migração terminar quebra a
   aplicação inteira, não silenciosamente — é a consequência aceita da decisão, não um bug.
3. **`dev.db` sem seed vira boot quebrado, não vacuidade silenciosa.** Antes: um `dev.db` sem linha
   `AccountingBinding` `Active` produzia smoke-gates vacuamente verdes (zero bindings ⇒ zero mappers ⇒
   nenhum lançamento tentado ⇒ nenhuma asserção de contabilização exercitada). Depois de F-FEEDER-4,
   esse mesmo estado impede o processo de subir — troca vacuidade silenciosa por ruído, o resultado que
   o BRIEF (risco 3) registrou como desejável.
4. **`AccountingSyncService` ganha uma dimensão nova de chave sem mudar de forma.** F-FEEDER-3 evita a
   reforma singleton→resolvido-por-escopo que "por escopo completo" exigiria, mas não é grátis: todo
   código que hoje monta um `AccountingEvent` precisa garantir que `unitId` está preenchido e é
   confiável (ver premissa aberta abaixo) — um `unitId` vazio ou default colidiria de volta ao problema
   original dentro da mesma unidade.


**Correção 2026-08-23 (achado do review da implementação) — a ordem tem UM DEGRAU A MAIS.** O
`compile()` roda o dry-run do validador (F-P1-6b1), que chama `PostingService.validateEntry` — e
esse caminho exige um `AccountingPeriod` **OPEN no mês corrente**. Sem período aberto, o binding sai
`Draft` (bloqueante "período fechado", `BindingValidationService.ts:42`) e a linha `Active` nunca
nasce — logo o boot falha depois, com uma mensagem que aponta para o binding ausente e **não** para
a causa real. Descoberto empiricamente: o `--self-check` de `scripts/activate-salon-binding.mjs`
precisou semear um `AccountingPeriod` OPEN só para o caminho feliz passar.

**Ordem real, obrigatória:** chart de contas semeado → **`AccountingPeriod` do mês corrente ABERTO**
→ binding compilado (`Active`) → boot do processo.

## 9. Aberto (não decidido por este ADR)

1. **Timeout e retry do pré-boot** (F-FEEDER-5) — se o banco não responder, quanto tempo o processo
   espera antes de desistir, e se tenta de novo. Fica para a sessão de feature que implementar.
2. **A premissa de unicidade global de `unitId`** (F-FEEDER-3) — documentada em comentário
   (`AccountingSyncPort.ts`), não provada em código/teste. A implementação precisa confirmá-la ou
   instrumentá-la antes de a chave composta poder ser tratada como fechando a colisão de fato.
3. **A union fechada de `sourceType` em `AccountingSyncPort.ts`** (5 literais TypeScript) — um
   `eventKey` de um binding de setor 2 (ex.: `clinic.appointment.completed`) não pertence a essa union
   hoje; o cast (`binding.eventKey as AccountingEventLike['sourceType']`) compila mas não alarga o tipo.
   Widening real tocaria `AccountingSyncPort.ts` e os ~14 arquivos que referenciam literais `salon.*`.
   Isto está registrado no BRIEF (`BE-INCR-BINDING-FEEDER-brief.md`, achados fora de escopo) como
   pré-requisito de P2, não deste alimentador — não planejado nem decidido aqui.

## 10. Próximos passos de governança

1. ~~Ratificação do dono (F-FEEDER-1..6)~~ ✅ FEITA 2026-08-22 (este documento).
2. BRIEF (`docs/accounting/BE-INCR-BINDING-FEEDER-brief.md`, já produzido) → implementação via sessão
   de feature.
3. Emenda ao `ADR-P2-second-vertical.md` §2 incorporando F-FEEDER-2 — ver §3 acima e o texto em
   `ADR-P2-second-vertical.md` (aplicado nesta mesma tarefa).
