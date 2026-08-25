> **BRIEF (sessão de planejamento)** — checklist + contratos esboçados. Não é ADR e não ratifica nada
> (ORCH-006). Nenhuma linha de código de aplicação foi escrita nesta sessão. Gerado por agente em
> 2026-08-25 (agente B1, lote paralelo), sobre `origin/main @ c1b4db84`.

# BRIEF — BE-INCR-RN: renomear vocabulário de evento `salon.*` → `sale.*`

## 0. Autorização

Mesma dupla do ADR irmão ([`ADR-RN-salon-to-sale-rename.md`](../adr/ADR-RN-salon-to-sale-rename.md)):
(1) conteúdo — [`ADR-P2-second-vertical.md` §3 F-P2-6](../adr/ADR-P2-second-vertical.md) → **(b)**,
ratificado 2026-08-25, que exige "ADR/BRIEF/sinal próprios" para esta frente (§5 item 4, §6 passo 1);
(2) execução desta sessão — sinal do dono 2026-08-25, *"Pode disparar"*, sobre o lote no qual B1 é
exatamente esta tarefa. **Este BRIEF cobre planejar, não executar** — a execução (`sessao-instrumentacao`
→ `sessao-correcao`) exige ratificação prévia dos forks §6 e sinal humano próprio.

---

## 1. O que este incremento é — e o que ele NÃO é

**É** um rename de vocabulário: todo `eventKey`/`sourceType` que hoje começa com `salon.` e descreve um
**fato de negócio genérico de venda** (não o vertical) passa a começar com `sale.`. Ver
[ADR-RN §3](../adr/ADR-RN-salon-to-sale-rename.md) para a fronteira exata entre "vocabulário de evento"
(dentro) e "identidade do vertical" (`sectorKey`, preset, `descriptionTemplate` — fora).

**NÃO é:**
- Não é o P2 nem uma emenda a ele — é pré-condição de entrada do P2 (ADR-P2 §5 item 4).
- Não muda nenhum débito/crédito, conta, arquétipo ou regra de balanceamento — é rename de **rótulo**,
  o comportamento contábil observável do vertical 1 deve ficar byte-idêntico (mesma garantia que os
  goldens de Fase 0/1 do P1 já prometem, e que este incremento precisa **continuar** provando, não
  reprovar).
- Não toca o motor DynamicTable, o núcleo do ledger (`PostingService`, `models/`) nem o intérprete
  genérico (`interpret.ts` lê `eventKey` como dado do binding, não como constante).
- Não decide identificadores de código nem string exata por evento — são forks (§6).
- Não tem frontend: `my-app` não referencia nenhum literal `salon.sale.*`/`salon.package.*` (verificado
  — grep vazio). Escopo é 100% backend.

**Escopo de camada:** o rename não adiciona nem remove nenhuma camada (Route/Controller/Service/
Repository/Prisma) — toca só literais de string e (conforme F-RN-1) nomes de símbolos já existentes.
Nenhum DTO/Policy/Factory novo nasce aqui.

---

## 2. O estado real do código que este BRIEF assume (verificado nesta sessão via `search_graph` +
## `Grep`/`Read`, confirmado por leitura — CBM-001)

| Fato | Evidência |
|---|---|
| O dispatcher casa por `event.sourceType` puro (mais chave composta `unitId:sourceType`); sem mapper → `ValidationError` | [`AccountingSyncService.ts:116-119`](../../server/src/features/accounting/sync/AccountingSyncService.ts:116) |
| A ponte **engole** esse erro e só loga `warn` — venda grava, lançamento não nasce, HTTP 200 | [`SalonSalesAccountingBridge.ts:108`](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:108) (achado do BRIEF do P2, reconfirmado aqui) |
| As pontes leem `sales`/`saleItems` por `internalName`, não por preset — mecanismo genérico, não específico do salão | [`SalonSalesAccountingBridge.ts:55`](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:55) |
| A fixture `SALON_BINDING_V1` declara `sectorKey: 'beautySalon'` (identidade do vertical, fora do escopo) separado de 5 `eventKey: 'salon.*'` (vocabulário, dentro do escopo) | [`salonBinding.ts:74,81,101,128,145,162`](../../server/src/features/accountingBinding/fixtures/salonBinding.ts:74) |
| `descriptionTemplate` é setorial **por desenho** — existe para variar o texto humano por vertical, não faz parte do rename | comentário de campo em `AccountingBindingDto.ts`, citado no BRIEF do P2 |
| Cada mapper "legado" (Corpo A/B, não instanciado em produção, só golden-test) carrega o `sourceType` como propriedade da própria classe | [`SalonSaleFinalizedMapper.ts:20`](../../server/src/features/accounting/sync/mappers/SalonSaleFinalizedMapper.ts:20) — `public readonly sourceType = 'salon.sale.finalized' as const;` |
| `lib/factory.ts` usa `SALON_BINDING_V1` só como **valor de bootstrap síncrono**, substituído pré-boot por `initializeAccountingSyncFromBindings()`, que lê os `AccountingBinding` `Active` do **banco** (BE-INCR-BINDING-FEEDER, PR #213) | [`factory.ts:175-186,522-529,829-830`](../../server/src/lib/factory.ts:175) |
| `JournalEntry.sourceType`/`InventoryCostLayer.sourceType` são `String` livre (não enum) — sem migração de schema Prisma necessária; o risco é **de dado**, não de shape | [`schema.prisma:493,742,1146`](../../server/prisma/schema.prisma:493) |
| `auditCanonical`/allowlist de audit **não** referencia `salon.*` como `eventType` (grep vazio em `features/accounting/audit/`) — T8 não tem superfície aqui | verificado, `features/accounting/audit/**` |
| `my-app` não tem nenhum literal `salon.sale.*`/`salon.package.*` | verificado, grep vazio em `my-app/**` |
| `docs.paths.ts`/`openapi.json` carregam a palavra "salon" só em **prosa humana** de `summary`/descrição de rota (ex.: "Cancel a finalized salon sale"), não em `eventKey` — `openapi.json` é artefato **gerado** (`npm run docs:generate`), nunca editado à mão | [`docs.paths.ts:1471,1501,1531,1536,2980`](../../server/src/routes/docs.paths.ts:1471) |

**Inventário de arquivos por categoria** (52 arquivos batem o literal `salon\.(sale|package)\.`; a
contagem abaixo é a base do checklist §3 — cada linha do checklist cobre um subconjunto testável):

| Categoria | Arquivos (produção) | Arquivos de teste |
|---|---|---|
| Port (event builders) | `AccountingSyncPort.ts` | — |
| Bridges | `SalonSalesAccountingBridge.ts`, `SalonSaleSettlementBridge.ts`, `SalonSaleReversalBridge.ts`, `SalonPackageSoldBridge.ts`, `salonSaleItems.ts` | 5 arquivos `__tests__` espelho |
| Mappers (golden-only, não instanciados em produção) | `SalonSaleFinalizedMapper.ts`, `SalonSaleReturnedMapper.ts`, `SalonSaleSettledMapper.ts`, `SalonPackageSoldMapper.ts`, `SalonSaleCogsMapper.ts` | 5 arquivos `__tests__` espelho |
| Fixture do binding | `fixtures/salonBinding.ts` (só `eventKey`/`SALON_OPERATIONAL_SCHEMA_SNAPSHOT`) | `fixtures/__tests__/salonBinding.test.ts` |
| Job de reconciliação | `jobs/accountingSyncReconcile.job.ts` (6 funções `reconcileSalon*`) | `jobs/__tests__/accountingSyncReconcile.test.ts` |
| CLI de ativação | `jobs/activateAccountingBindingCli.ts` (import, não o CLI em si — F-P2-7 já tratou parametrização) | `jobs/__tests__/activateAccountingBindingCli.test.ts` |
| Bootstrap da factory | `lib/factory.ts` (`buildSalonAccountingMappers`) | `lib/__tests__/factory.initializeAccountingSyncFromBindings.integration.test.ts` |
| Controller (F-P2-10 já pôs este arquivo no perímetro zero-diff) | `controllers/dynamicTablesController.ts` (3 imports/`await maybeSyncSalon*`) | `controllers/__tests__/dynamicTablesController.salonBridge.test.ts` |
| Golden tests (Fases 0/1 do P1 — byte-idêntico) | — | `goldenPhase0.test.ts`, `goldenPhase1.test.ts`, `archetypes.balance.test.ts` |
| Intérprete/validador de binding | — | `interpret.test.ts`, `InterpretedEventMapper.test.ts`, `BindingValidationService.test.ts`, `BindingCompileService.integration.test.ts`, `AccountingBindingDto.test.ts`, `CompileBindingDto.test.ts`, `accountingBindingController.test.ts`, `AccountingBindingFeederService.test.ts`, `AccountingBindingRepository.integration.test.ts` |
| Serviços de leitura/relatório que asserem o literal | — | `TieOutDiagnosticService.test.ts`, `ReceiptService.test.ts`, `PostingService.test.ts`, `AccountingSyncService.test.ts`, `InventoryCogs.integration.test.ts`, `SourceProvenance.integration.test.ts`, `receiptHtml.test.ts`, `KpiCacheService.test.ts` |
| Comentários (cosmético, não funcional) | `schema.prisma` (3 linhas), `ReceivableService.ts`, `InventoryService.ts`, `Inventory.model.ts` | — |
| Docs gerados/prosa | `docs.paths.ts` (5 linhas de `summary`/prosa), `public/openapi.json` (regenerar, não editar) | — |

---

## 3. Checklist numerado de comportamentos

Cada item é individualmente testável. "Teste" descreve o oráculo, não o arquivo.

**1. Os 5 `eventKey` da fixture do vertical 1 usam o namespace `sale.*`.**
`fixtures/salonBinding.ts`: `eventBindings[].eventKey` e as chaves de `SALON_OPERATIONAL_SCHEMA_SNAPSHOT`
trocam de `salon.*` para o mapeamento decidido em F-RN-2. `sectorKey: 'beautySalon'` e todo
`descriptionTemplate` ficam **intocados**.
*Teste:* `salonBinding.test.ts` (ou seu sucessor) assere os novos `eventKey`; `AccountingBindingV1Schema.parse`
continua aceitando o fixture sem erro de shape.

**2. Os 4 event-builders do Port emitem `sourceType` no novo namespace.**
`AccountingSyncPort.ts` — `buildSalonSaleFinalizedEvent`/`buildSalonSaleReturnedEvent`/
`buildSalonSaleSettledEvent`/`buildSalonPackageSoldEvent` (nomes de função sujeitos a F-RN-1).
*Teste:* cada builder, chamado com um evento de amostra, devolve `sourceType` igual ao valor decidido
em F-RN-2 para aquele fato.

**3. As 4 bridges + o helper `salonSaleItems.ts` emitem/consultam o novo `sourceType`.**
`SalonSalesAccountingBridge.ts`, `SalonSaleSettlementBridge.ts`, `SalonSaleReversalBridge.ts`,
`SalonPackageSoldBridge.ts` — toda chamada a `postEntry`/`sync` e toda leitura de log/erro que cita o
`sourceType` literal.
*Teste:* espelho dos 5 arquivos `__tests__` já existentes — a asserção sobre o `sourceType` do
`PostEntryInput` gerado muda para o novo valor; comportamento contábil (linhas D/C, contas, valores)
**idêntico**.

**4. Os 5 mappers "legado" (golden-only) carregam o `sourceType` novo como propriedade da classe.**
`SalonSaleFinalizedMapper.ts`, `SalonSaleReturnedMapper.ts`, `SalonSaleSettledMapper.ts`,
`SalonPackageSoldMapper.ts`, `SalonSaleCogsMapper.ts`.
*Teste:* `goldenPhase0.test.ts` continua verde — compara mapper manual × saída esperada, ambos agora no
vocabulário novo.

**5. O intérprete + fixture produzem a MESMA saída byte-idêntica que os mappers manuais, agora sob
`sale.*`.**
Nenhuma mudança em `interpret.ts`/`InterpretedEventMapper.ts` — eles leem `eventKey` do binding como
dado. O golden compara mapper manual (item 4) × `InterpretedEventMapper` construído a partir da fixture
renomeada (item 1).
*Teste:* `goldenPhase1.test.ts` verde, byte-idêntico, exatamente como hoje — é a prova de que o rename
não vazou para nenhum campo de `PostEntryInput` além de `sourceType`.

**6. O job de reconciliação consulta/dedupe pelo novo `sourceType` em todas as 6 funções `reconcileSalon*`.**
`jobs/accountingSyncReconcile.job.ts` — toda chamada a `hasExistingEntry(scope, '<sourceType>', ...)` e
todo literal usado para decidir o que já foi sincronizado.
*Teste:* espelho de `accountingSyncReconcile.test.ts` — uma venda com lançamento já existente sob o
`sourceType` **novo** não é re-processada; ver também comportamento 8 (dado histórico sob o
`sourceType` **antigo**).

**7. `factory.ts` e `controllers/dynamicTablesController.ts` continuam wireando os builders/bridges
renomeados sem diff de contrato.**
`buildSalonAccountingMappers()` (bootstrap síncrono) e os 3 `import`/`await maybeSyncSalon*` do
controller — nomes sujeitos a F-RN-1, comportamento (o quê é chamado, quando) inalterado.
*Teste:* `factory.initializeAccountingSyncFromBindings.integration.test.ts` e
`dynamicTablesController.salonBridge.test.ts` verdes; nenhuma mudança de assinatura pública.

**8. Dado já persistido com `sourceType` antigo continua legível/reconciliável (ou é migrado) — decisão
de F-RN-3.**
Comportamento exato depende do fork: se a decisão for "migrar", este item vira um script de migração de
dado + teste que prova que uma linha antiga passa a bater com o `sourceType` novo; se for "conviver",
vira um teste que prova que o reconcile job **não** re-processa nem duplica uma linha histórica sob o
prefixo antigo.
*Teste:* depende de F-RN-3 — o teste-guarda desta linha só nasce depois da ratificação.

**9. Qualquer `AccountingBinding` `Active` já persistido no banco (via `activateAccountingBindingCli.ts`)
é recompilado/reativado com o `eventKey` novo, atomicamente com a mudança de código — decisão de F-RN-4.**
Sem isto, o dispatcher (que em produção lê do banco, não da fixture — BE-INCR-BINDING-FEEDER) continua
esperando o `eventKey` antigo enquanto as pontes já emitem o novo, e **todo** evento do vertical 1
passa a cair no ramo "sem mapper" (item verificado: a ponte engolindo o erro, comportamento §2).
*Teste:* depende de F-RN-4 — cenário de integração que ativa/recompila o binding e confirma que o
dispatcher casa o evento pós-rename sem `ValidationError`.

**10. Toda superfície de teste que assere o literal `salon.sale.*`/`salon.package.*` é atualizada em
uníssono com o código de produção — nenhum teste falso-verde por comparar string antiga com string
antiga.**
Lista completa em §2 (coluna "Arquivos de teste") — 27 arquivos de teste batem o padrão nesta sessão.
*Teste:* é o próprio conjunto — cada arquivo listado precisa recompilar e passar. Este item é o que a
`sessao-instrumentacao` teste-guarda primeiro (um teste que hoje passaria comparando `'salon.sale.
finalized'` com `'salon.sale.finalized'` precisa passar a falhar assim que o código de produção mudar
para `'sale.*'` sem o teste acompanhar — prova de que a rede de teste não está cega ao rename).

**11. (Should, não bloqueante) Prosa gerada/comentários varrida para consistência.**
`docs.paths.ts` (5 linhas de `summary`), comentários em `schema.prisma`/`ReceivableService.ts`/
`InventoryService.ts`/`Inventory.model.ts`, e `public/openapi.json` regenerado via `npm run
docs:generate` (nunca editado à mão — nota do CLAUDE.md). Não afeta comportamento; existe para não
deixar a doc gerada denunciando um vocabulário que o código já abandonou.
*Teste:* nenhum — é checklist de varredura textual, não comportamento. Pode ficar para o fim do diff da
`sessao-correcao` sem risco.

---

## 4. Contratos esboçados

### 4.1 Mapeamento de `eventKey` — shape, valores dependem de F-RN-2

```ts
// server/src/features/accountingBinding/fixtures/salonBinding.ts
// ANTES                          → DEPOIS (valor exato = decisão de F-RN-2, ver §6)
'salon.sale.finalized'  →  <F-RN-2>   // revenue_recognition
'salon.sale.settled'    →  <F-RN-2>   // settlement
'salon.sale.returned'   →  <F-RN-2>   // reversal
'salon.package.sold'    →  <F-RN-2>   // performance_liability
'salon.sale.cogs'       →  <F-RN-2>   // cogs
```

Shape do binding (`AccountingBindingV1`, `AccountingBindingDto.ts`) **não muda** — só o valor de
`eventBindings[].eventKey` (`string`) e as chaves de `SALON_OPERATIONAL_SCHEMA_SNAPSHOT`
(`Record<string, unknown>`). `sectorKey` e `descriptionTemplate` continuam fora do diff deste item.

### 4.2 `AccountingEvent.sourceType` (contrato do Port — inalterado em shape)

```ts
// server/src/features/accounting/sync/AccountingSyncPort.ts
interface AccountingEvent {
  unitId: string;
  sourceType: string; // valor muda de 'salon.*' para o novo namespace; TIPO continua string livre
  sourceId: string;
  // ...campos por evento, inalterados
}
```

### 4.3 `JournalEntry.sourceType` / `InventoryCostLayer.sourceType` (Prisma — sem migração de schema)

```prisma
// server/prisma/schema.prisma — inalterado, só o VALOR gravado muda daqui pra frente
sourceType   String // taxonomia viva: crm.opportunity.won | sale.* | IMPORT_JOURNAL_ENTRIES | ...
@@unique([userId, unitId, sourceType, sourceId])
```

Nenhuma migração Prisma nasce deste incremento **a menos que F-RN-3 escolha reescrever dado
histórico** — nesse caso a "migração" é um script de dado sobre linhas existentes, não uma alteração
de schema (o campo já é `String` livre).

---

## 5. Pendências de validação externa

Nenhuma — este incremento não tem dependência de regra contábil/fiscal/legal nova (é rename de rótulo
interno, não de arquétipo nem de plano de contas). O que ele **preserva** (T5/T7/T8, ADR-RN §5) já tem
artefato de origem citado no próprio ADR.

## 6. Forks — RATIFICAÇÃO PENDENTE (nenhum decidido nesta sessão)

| # | Pergunta | Opções | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-RN-1** | Identificadores de código (`SalonSalesAccountingBridge`, `SalonSaleFinalizedMapper`, `SALON_BINDING_V1`, nomes de arquivo, nomes de função como `buildSalonSaleFinalizedEvent`/`reconcileSalonSales`) acompanham o rename? | **(a)** só o literal `eventKey`/`sourceType` muda — classes/arquivos continuam "Salon*" · **(b)** identificadores também mudam para "Sale*"/neutro, incluindo `git mv` dos arquivos | **(b)** — o próprio motivo do rename (ADR-RN §1) é que este código é **mecanismo genérico**, não específico do salão; deixar `SalonSalesAccountingBridge.ts` chamando algo que agora se chama `sale.finalized` é a mesma inconsistência que o rename existe para resolver, só que no nome do arquivo em vez do valor da string. Custo: diff maior (~25 arquivos de produção + espelhos de teste, `git mv` preserva blame) |
| **F-RN-2** | Mapeamento exato de string por `eventKey` | **(a)** swap mecânico do prefixo — `salon.sale.finalized`→`sale.sale.finalized`, `salon.package.sold`→`sale.package.sold`, `salon.sale.cogs`→`sale.sale.cogs` (busca-e-substitui puro, zero ambiguidade) · **(b)** colapsar o segmento redundante — `sale.finalized`/`sale.settled`/`sale.returned`/`sale.cogs`/`sale.package.sold`, seguindo a taxonomia `domínio.verbo` já usada em `ap.payable`/`ap.payment` no mesmo `schema.prisma` | **(b)** — evita o gaguejo `sale.sale.*`, e o próprio comentário do schema (`crm.opportunity.won \| salon.sale.* \| ...` ao lado de `ap.payable`/`ap.payment`) já mistura os dois estilos; colapsar aproxima o namespace do padrão de 2 segmentos que o resto do domínio usa. Custo: exige uma tabela de rename explícita (5 entradas) em vez de um `sed` puro — baixo risco dado o tamanho |
| **F-RN-3** | Dado já persistido (`JournalEntry`/`InventoryCostLayer` com `sourceType='salon.*'`, hoje só em `dev.db`, nunca deployado) | **(a)** deixar como está — reconcile/leituras futuras precisam tolerar os dois prefixos permanentemente · **(b)** script de migração de dado que reescreve as linhas existentes para o `sourceType` novo, rodado junto com a correção · **(c)** janela dual-suporte (código aceita os dois prefixos por um tempo, depois remove o antigo) | **(b)** — o produto **nunca foi deployado** (master map §5.1, "4 de 4" gates humanos/dado externo abertos), então não há usuário real cujo histórico se perderia numa reescrita; (a) deixaria uma dívida permanente de "dois vocabulários" exatamente no dado que o rename existe para limpar; (c) resolve um problema de zero-downtime que não existe aqui (YAGNI). Risco a nomear na execução: `Migração SQLite não é transacional` (memória do projeto) — o script precisa de prólogo idempotente e não pode assumir ABORT-limpo |
| **F-RN-4** | `AccountingBinding` `Active` já persistido no banco (se algum ambiente já rodou `activateAccountingBindingCli.ts` pós-FEEDER) | **(a)** mudança atômica única — código (pontes+fixture) e reativação/recompilação do binding no banco landam no MESMO incremento/commit, sem janela onde um lado já mudou e o outro não · **(b)** duas fases — suportar os dois `eventKey` temporariamente, migrar o binding, depois remover o antigo | **(a)** — mesma razão de F-RN-3 (nunca deployado, sem downtime a proteger); (b) é a resposta certa **se e quando** houver produção real, não hoje. Risco a nomear: se um binding `Active` sobreviver no `dev.db` com `eventKey` antigo enquanto o código já emite o novo, **todo** evento do vertical 1 cai no ramo "sem mapper" da ponte (comportamento §2/§3 item 9) — silenciosamente, porque a ponte engole o erro. A correção precisa verificar isso explicitamente, não assumir que não há binding `Active` no ambiente de teste |

**Insumo ausente, registrado — não varrido nesta sessão:** os 27 arquivos de teste listados em §2 foram
**localizados** (grep + `search_graph`) e uma amostra foi **lida** (fixture, um mapper, um bridge, o
dispatcher, `factory.ts`, o controller, `goldenPhase1.test.ts`) para confirmar o padrão — mas não há
leitura linha-a-linha dos 27 nesta sessão de planejamento. Isso é esperado: `idempotency-class-fix-
discipline` (memória do projeto) trata "enumerar todo write-path" como disciplina da **sessão de
correção**, não da sessão de planejamento — mas fica registrado aqui como o que falta antes de fechar o
checklist item 10 como concluído.

## 7. Achados fora de escopo

- **`docs.paths.ts`/`openapi.json`** carregam prosa "salon sale" nas rotas HTTP de `sales`/`saleItems`
  (endpoints genéricos, não específicos do vertical). Isso é vocabulário de **produto**, não de
  `eventKey` — listado como checklist item 11 (should, não bloqueante), não como achado que abre nova
  frente.
- **`BeautySalonPreset.ts`/`presets/ai/PresetKnowledgeBase.ts`** continuam corretamente nomeados —
  são o vertical 1 de fato, não vocabulário de evento. Nenhuma ação.
- Nenhuma frente adjacente nova identificada durante o levantamento — o rename é autocontido dentro do
  perímetro descrito no ADR-RN §3.
