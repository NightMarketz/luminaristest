# ADR-RN — Renomear o vocabulário de evento `salon.*` → `sale.*`

- **Data:** 2026-08-25
- **Status:** **Proposed.** Nenhum fork deste ADR está ratificado — a ratificação é do dono (ORCH-006).
  Este documento nasce de sessão de planejamento; não escreve código, não decide fork.
- **Autores:** agente B1 do lote paralelo de 2026-08-25 (`sessao-planejamento`).
- **Autorização citada:**
  1. **Autorização de conteúdo (por quê esta frente existe):**
     [`docs/adr/ADR-P2-second-vertical.md` §3, fork **F-P2-6**](ADR-P2-second-vertical.md) — RATIFICADO
     2026-08-25 pelo dono (`AskUserQuestion`, contra a recomendação do agente) → **(b) renomear
     `salon.*` → `sale.*` antes do P2, como ciclo próprio (instrumentação → correção)**. O mesmo ADR,
     §5 item 4 e §6 passo 1, exige explicitamente **"ADR/BRIEF próprio e sinal humano"** para esta
     frente — é o que este documento e o `BE-INCR-RN-salon-to-sale-brief.md` irmão entregam.
  2. **Autorização de execução desta sessão:** mensagem do dono em 2026-08-25, *"Pode disparar"*,
     aprovando o lote multi-agente planejado no qual **B1 = "ADR-RN + BRIEF do rename `salon.*` →
     `sale.*` via sessão de planejamento"**. Cobre exatamente planejar (produzir os dois artefatos);
     **não cobre executar** — a execução é `sessao-instrumentacao` → `sessao-correcao`, sessão
     separada, com sinal humano próprio (ver §7).
- **Nó do master map:** `docs/accounting/ACCOUNTING-MASTER-MAP.md` §5.1 Bloco A, **linha RN** — "F-P2-6→(b)
  põe o rename `salon.*` → `sale.*` na frente [do P2], como ciclo próprio... Ele ainda precisa de
  ADR/BRIEF/sinal próprios" (linha 163-164). Também §5 item 4 do ADR-P2: pré-condição de entrada do
  próprio P2.
- **Gerado sobre:** `origin/main @ c1b4db84` (branch `claude/plano-proximas-tasks-27a8d2`, worktree
  `agent-a37525457295b7fe9`).

## TLDR (2 linhas)

O vocabulário de evento `salon.sale.finalized`/`.settled`/`.returned`/`.cogs` e `salon.package.sold`
— hoje hardcoded nas pontes/mappers/fixture de `features/accounting/sync/**` — é **genérico por
mecanismo** (as pontes leem a tabela `sales`/`saleItems` por `internalName`, não por preset) mas
**setorial por nome**: um binding de clínica teria de emitir literalmente `salon.*` para casar com o
dispatcher. O rename troca esse prefixo por `sale.*`, setorialmente neutro, **antes** do P2 tocar o
mesmo código — porque `features/accounting/sync/**` está **dentro** do perímetro zero-diff que o P2
existe para julgar (ADR-P2 §2 item 2), e mexer nele durante o P2 tornaria negociável exatamente o
critério que a prova mede.

---

## 1. Contexto e motivação

O binding do vertical 1 (salão) vincula 5 `eventKey` no namespace `salon.*`
([`salonBinding.ts:81,101,128,145,162`](../../server/src/features/accountingBinding/fixtures/salonBinding.ts)):

| `eventKey` atual | Arquétipo | Emitido por |
|---|---|---|
| `salon.sale.finalized` | `revenue_recognition` | [`SalonSalesAccountingBridge.ts`](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts) via [`AccountingSyncPort.buildSalonSaleFinalizedEvent`](../../server/src/features/accounting/sync/AccountingSyncPort.ts:94) |
| `salon.sale.settled` | `settlement` | [`SalonSaleSettlementBridge.ts`](../../server/src/features/accounting/sync/bridges/SalonSaleSettlementBridge.ts) via `buildSalonSaleSettledEvent` |
| `salon.sale.returned` | `reversal` | [`SalonSaleReversalBridge.ts`](../../server/src/features/accounting/sync/bridges/SalonSaleReversalBridge.ts) via `buildSalonSaleReturnedEvent` |
| `salon.package.sold` | `performance_liability` | [`SalonPackageSoldBridge.ts`](../../server/src/features/accounting/sync/bridges/SalonPackageSoldBridge.ts) via `buildSalonPackageSoldEvent` |
| `salon.sale.cogs` | `cogs` | [`jobs/accountingSyncReconcile.job.ts`](../../server/src/jobs/accountingSyncReconcile.job.ts) (CMV, ponte de estoque) |

O dispatcher (`AccountingSyncService.sync`, [linha 116](../../server/src/features/accounting/sync/AccountingSyncService.ts:116))
casa por `event.sourceType` puro — não por `sectorKey`. **As pontes que emitem esses eventos não são
específicas do salão**: leem a tabela `sales`/`saleItems` por `internalName`
([`SalonSalesAccountingBridge.ts:55`](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:55),
citado no BRIEF do P2), então rodam **para qualquer preset** que use essas tabelas — inclusive o
vertical 2 (`aestheticClinic`). Consequência verificada: se o binding da clínica não redeclarar
literalmente `eventKey: 'salon.sale.finalized'`, o dispatcher não acha mapper e lança
`ValidationError` — a ponte então **engole** esse erro e loga em nível `error` (não `warn`: um
`ValidationError` de mapper ausente não bate nenhum código de `SYNC_SKIP_ERROR_CODES` em
[`AccountingSyncPort.ts:91`](../../server/src/features/accounting/sync/AccountingSyncPort.ts:91) —
só `ACCOUNTING_PERIOD_NOT_OPEN`/`MAX_CENTS_EXCEEDED` caem no ramo `warn`; o catch está em
[`SalonSalesAccountingBridge.ts:108-125`](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:108),
achado do BRIEF do P2, comportamento 5) — a venda grava, o lançamento contábil não nasce, o HTTP
devolve 200, e fica "left for reconciliation". Um vocabulário `salon.*` sobrevivendo no vertical 2 não é cosmético: é uma ECD
silenciosamente incompleta por construção.

**Por que agora, e não dentro do P2:** `features/accounting/sync/**` é um dos quatro caminhos do
perímetro zero-diff da prova de saída do P2 (ADR-P2 §2 item 2, junto com o motor DynamicTable, o
ledger e `factory.ts`). Se o rename acontecesse durante a execução do P2, o `git diff` desse
perímetro entre "antes" e "depois" do vertical 2 deixaria de ser vazio por um motivo que **não é**
falha da prensa — contaminando a própria métrica que o P2 foi desenhado para medir. Rodar o rename
antes, como incremento próprio, mantém a prova do P2 limpa.

## 2. Objetivo

Substituir o prefixo de namespace `salon.` por `sale.` em todo `eventKey`/`sourceType` que **descreve
o mecanismo genérico de venda** (não o vertical), preservando o comportamento observável do vertical 1
byte-a-byte — mesmos débitos/créditos, mesmas contas, mesma idempotência — e produzindo uma superfície
onde nenhum vocabulário de evento denuncia "salão" fora do texto humano (`descriptionTemplate`, que é
setorial por desenho e **não** faz parte deste rename — ver §3).

## 3. Escopo — a fronteira que decide o que é "vocabulário" vs "identidade do vertical"

Esta é a decisão arquitetural central do ADR. Duas coisas hoje carregam a palavra "salon"/"salão" e
**não são a mesma coisa**:

| Conceito | Exemplo | Ownership | Neste rename |
|---|---|---|---|
| **Vocabulário de evento** (`eventKey`/`sourceType`) — o nome do fato de negócio que o dispatcher casa | `salon.sale.finalized` | Mecanismo genérico (roda para qualquer preset que use `sales`/`saleItems`) | **DENTRO** — vira `sale.*` |
| **Identidade do vertical** (`sectorKey`) — qual preset/setor este binding serve | `sectorKey: 'beautySalon'` | O vertical 1 em si — é literalmente um salão de beleza | **FORA** — permanece `beautySalon` |
| **Preset do DynamicTable** | `BeautySalonPreset.ts`, `presets/ai/PresetKnowledgeBase.ts` entrada `beautySalon` | O vertical 1 em si | **FORA** — nenhum diff |
| **Texto humano do lançamento** | `descriptionTemplate: 'Receita salão — Venda {sourceId}'` | Setorial por desenho — o campo existe **exatamente** para variar por vertical (BRIEF do P2, achado da leitura de `AccountingBindingDto.ts`) | **FORA** — nenhum diff |

Confundir as duas colunas é o erro que este ADR existe para prevenir: renomear `sectorKey` ou
`BeautySalonPreset` apagaria a identidade real do vertical 1 sem necessidade; **não** renomear o
`eventKey` deixa o vertical 2 vinculando um vocabulário emprestado do vertical 1 por acidente de
implementação, não por escolha.

**Dentro do perímetro do rename** (ver BRIEF §2 para o inventário completo por arquivo):
`features/accounting/sync/**` (Port, Service, bridges, mappers), a fixture
`fixtures/salonBinding.ts` (só o campo `eventKey`/`SALON_OPERATIONAL_SCHEMA_SNAPSHOT`, não
`sectorKey` nem `descriptionTemplate`), `jobs/accountingSyncReconcile.job.ts`,
`jobs/activateAccountingBindingCli.ts` (a chamada que ativa o binding, não o CLI em si — fork do P2
F-P2-7 já tratou o CLI), `lib/factory.ts` (`buildSalonAccountingMappers`, bootstrap síncrono),
`controllers/dynamicTablesController.ts` (os três `import`/`await maybeSyncSalon*`), comentários em
`schema.prisma` que citam o `eventKey` como exemplo de taxonomia, `public/openapi.json` (artefato
gerado — `npm run docs:generate`, não editado à mão) e todo teste que assere o literal `salon.sale.*`
ou `salon.package.*`.

**Fora do perímetro:** `sectorKey: 'beautySalon'`, `BeautySalonPreset.ts`,
`presets/ai/PresetKnowledgeBase.ts`, `descriptionTemplate` de cada `eventBinding`, qualquer prosa que
descreva o *vertical* (não o evento) — inclusive comentários que dizem "o binding do salão" quando se
referem ao vertical 1, que continua sendo, de fato, um salão.

## 4. Alternativas consideradas

1. **Não renomear; deixar o vertical 2 emitir `salon.*` também.** Rejeitada — é a opção (a) do F-P2-6,
   já rejeitada pelo dono no ADR-P2. Consequência aceita como pior: todo binding futuro carrega um
   vocabulário emprestado por acidente, permanente.
2. **Renomear só a fixture do vertical 2 (nova), mantendo `salon.*` no vertical 1 intacto.** Rejeitada
   — o dispatcher casa por `eventKey` puro; se o vertical 2 emitisse `sale.*` mas as pontes (código
   compartilhado, não duplicado por vertical) continuassem hardcoding `salon.*`, a incompatibilidade
   apareceria no primeiro evento do vertical 2, não na revisão. As pontes são o mecanismo genérico —
   não podem falar dois vocabulários a depender de quem chama.
3. **Renomear durante a execução do P2, como emenda ao perímetro.** Rejeitada explicitamente pelo dono
   (ADR-P2 §3 F-P2-6, texto: "o rename vira ciclo próprio... não uma emenda ao perímetro no meio do
   P2"). Motivo (§1 acima): contaminaria a métrica zero-diff que o P2 mede.
4. **(Escolhida) Ciclo próprio, antes do P2, via `sessao-instrumentacao` → `sessao-correcao`**, com
   este ADR + o BRIEF irmão como a spec que a `sessao-feature`/`sessao-correcao` executa.

## 5. Riscos e invariantes preservados

| Invariante | Como este rename o preserva |
|---|---|
| **T5 — Estorno é lançamento novo, nunca edição.** | O rename não toca `reverseEntry`/`PostingService`; só o rótulo do evento de origem. Nenhum `JournalEntry` existente é editado por este incremento (ver risco de dado abaixo — é rename de **vocabulário de emissão**, não de histórico, a menos que o fork de migração de dado decida o contrário). |
| **T7 — Idempotência liga em `sourceType+sourceId`, nunca `userId`.** | **Risco direto.** `JournalEntry.@@unique([userId,unitId,sourceType,sourceId])` — trocar o `sourceType` que uma ponte emite para um `sourceId` que já tem uma linha com o `sourceType` antigo cria uma **segunda** linha idempotente-distinta para o mesmo fato de negócio (não decorre um erro; decorre uma **duplicata silenciosa** na próxima re-tentativa/reconcile). Isto é exatamente a classe `idempotency-class-fix-discipline` da memória do projeto — o BRIEF trata como comportamento obrigatório (não é detalhe de execução), com o fork de migração de dado (F-RN-3) endereçando o antes/depois. |
| **T8 — todo `eventType` novo entra na allowlist do `auditCanonical`.** | Verificado nesta sessão: `auditCanonical`/allowlist **não** referencia `salon.*` como `eventType` de audit (grep vazio em `features/accounting/audit/`) — o rename não tem superfície aqui. Registrado como fato confirmado, não assumido. |
| **Zero-diff do motor/ledger/intérprete.** | Este incremento **não** toca `features/dynamicTables` (motor), o núcleo do ledger (`PostingService`, `models/`) nem `interpret.ts` (o intérprete lê `eventKey` do binding como dado, não como constante hardcoded — nenhuma mudança de contrato). Só os **emissores** (`sourceType` que as pontes escrevem) e a **fixture** (`eventKey` que o binding declara) mudam, em uníssono. |
| **Golden tests byte-idênticos (Fases 0/1 do P1).** | `goldenPhase0.test.ts`/`goldenPhase1.test.ts` comparam saída dos mappers manuais (Corpo A/B, ainda existentes como referência) contra o intérprete. Se os mappers manuais tiverem `sourceType` renomeado e a fixture/intérprete também, o golden continua comparando like-com-like — **mas é um ponto de atenção do checklist** (BRIEF item de teste dedicado), não algo que este ADR resolve sozinho. |

## 6. Não-objetivos

- **Não** decide se os identificadores de código (`SalonSalesAccountingBridge`, `SalonSaleFinalizedMapper`,
  `SALON_BINDING_V1`, nomes de arquivo) acompanham o rename do `eventKey` — é fork (BRIEF F-RN-1).
- **Não** decide o mapeamento exato de string por `eventKey` (`sale.finalized` vs `sale.sale.finalized`)
  — é fork (BRIEF F-RN-2).
- **Não** decide o que fazer com `JournalEntry`/`InventoryCostLayer` já persistidos com `sourceType`
  antigo em bancos existentes (dev.db) — é fork (BRIEF F-RN-3).
- **Não** implementa nada. Não roteia sozinho (ORCH-006) — a execução é sessão separada, com sinal
  humano próprio sobre os forks ratificados.
- **Não** reabre nenhum fork já ratificado do ADR-P2.

## 7. Sequência de governança

1. ~~ADR-RN (este documento) + BRIEF-RN (`sessao-planejamento`).~~ ✅ Este commit.
2. Ratificação dos forks F-RN-1..F-RN-4 pelo dono (ORCH-006, fora desta sessão).
3. `sessao-instrumentacao` — teste-guarda que falha pelo motivo certo (asserção do vocabulário
   `sale.*` onde hoje o código emite `salon.*`; ou teste de cobertura do binding, se F-RN a tratar como
   tal).
4. `sessao-correcao` — diff mínimo que faz o teste-guarda passar, escopo travado ao inventário do
   BRIEF §2, sem tocar nada fora dele.
5. Review independente (branch/worktree separado) + `tsc` limpo × 2 + suíte completa verde.
6. Integração (`sessao-integracao`) para `main`.
7. Isto libera a pré-condição §5 item 4 do ADR-P2 — o P2 pode então avançar (sujeito às suas próprias
   pré-condições restantes, §5 itens 2/3).
