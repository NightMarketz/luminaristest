> **BRIEF (sessão de planejamento)** — checklist + contratos esboçados + forks **PENDENTES DE
> RATIFICAÇÃO**. Não é ADR e não ratifica nada (ORCH-006). Nenhuma linha de código de aplicação foi
> escrita nesta sessão. Gerado por agente em 2026-08-25, sobre `origin/main` @ `166d09a2`.

# BRIEF — BE-INCR-P2-VERTICAL-CLINICA (Fase P2: o segundo vertical prova a prensa)

## 0. Autorização e a divergência que ela carrega

**Autorização citada:** `docs/adr/ADR-P2-second-vertical.md` §6 item 3 — *"Promover a Accepted → BRIEF
(sessão de planejamento) → execução → runbooks humanos (PVA + prova)"* — somado ao sinal direto do
dono nesta sessão (2026-08-25): *"escreve o BRIEF do P2"*. Os dois forks que definem o objeto deste
BRIEF estão **ratificados** e citados no próprio ADR: **F-P2-1 → clínica estética** (2026-08-21) e
**F-P2-2 → (a) tenant-fixture interno sintético** (2026-08-22).

**DIVERGÊNCIA ENTRE A AUTORIZAÇÃO E O ITEM — reportada, não resolvida aqui.** A autorização cobre
*escrever o BRIEF*; ela **não** cobre executar. Três fatos que separam uma coisa da outra:

1. **O ADR-P2 ainda está `Status: Draft`.** Seu próprio §6 coloca "promover a Accepted" **antes** do
   BRIEF. Este documento nasce, portanto, um passo à frente do que o ADR prevê. Isso é reversível e
   sem custo (um BRIEF não roteia nada sozinho), mas fica registrado: **promover o ADR-P2 a Accepted
   é pré-condição de execução**, não deste texto.
2. **A pré-condição de entrada §5.2 do ADR-P2 NÃO está satisfeita** — *"Vertical 1 validado (Parte A:
   PVA verde + sign-offs)"*. Hoje: PVA nunca rodou, browser sign-off pós-swap pendente. Ver §7.
3. **Dois forks do próprio ADR-P2 seguem abertos** — F-P2-3 (profundidade da prova) e F-P2-4 (onde
   registrar a métrica). Eles são pré-requisitos de *escopo de execução*, e este BRIEF acrescenta
   **seis forks novos** (§6), achados lendo o código atual.

**Consequência prática:** este BRIEF é executável quando (1) o ADR-P2 for Accepted, (2) os forks
F-P2-3..10 forem ratificados, e (3) o dono decidir se a pré-condição §5.2 vale como escrita ou é
revogada — como o próprio dono já revogou a pré-condição de PVA do P1 (registrada no ADR-P1 §9).

---

## 1. O que este incremento é — e o que ele NÃO é

**É** a materialização de um segundo vertical (**clínica estética**) usando exclusivamente os
mecanismos que a prensa (P1, PR #211) e o alimentador (FEEDER, PR #213) entregaram: **preset novo +
binding compilado + ativação por CLI**. O sucesso é medido por uma saída falseável — `git diff` vazio
no perímetro do motor/ledger/intérprete/`factory.ts` (ADR-P2 §2.2 + emenda de 2026-08-22).

**NÃO é** (não-objetivos, herdados do ADR-P2 §4 e reafirmados):
- Não nasce arquétipo contábil novo. Se nascer, é **achado de que o corpus do P1 estava incompleto** —
  registra-se como lacuna do P1 (instrumentação → correção), não se implementa aqui.
- Não inclui frontend. A casa separa `BE-INCR-*` de `FE-INCR-*`; o FE do vertical 2 é incremento
  próprio, se e quando houver.
- Não inclui módulo de Compras/AP operacional (Fase P4).
- Não decide multi-tenant de infraestrutura (Fase P3).

**Escopo de camada:** backend. Toda cadeia nova respeita `Route → Controller → Service → Repository →
Prisma` (+ Policy), DTO Zod `.strict()`, injeção por Factory — mas **a expectativa deste incremento é
não precisar de nenhuma cadeia nova**: se o vertical 2 exigir rota/service/repo novos, isso é sinal de
falha da prensa, não trabalho a fazer. Ver comportamento 9.

---

## 2. O estado real do código que este BRIEF assume (verificado em `166d09a2`)

Todos os itens abaixo foram lidos nesta sessão (`Read`/`Grep`), não recuperados de memória:

| Fato | Evidência |
|---|---|
| O alimentador lê **todos** os bindings `Active` do banco e devolve registros `{unitId, mapper}` | [AccountingBindingFeederService.ts:75](../../server/src/features/accountingBinding/services/AccountingBindingFeederService.ts:75) |
| O dispatcher chaveia por `unitId:sourceType` com fallback para a chave bare | [AccountingSyncService.ts:116](../../server/src/features/accounting/sync/AccountingSyncService.ts:116) |
| Evento sem mapper → `ValidationError` lançada pelo dispatcher | [AccountingSyncService.ts:117](../../server/src/features/accounting/sync/AccountingSyncService.ts:117) |
| …mas a **ponte engole** esse erro: `logger.warn('AccountingSync skipped — erro determinístico não-retriável')` | [SalonSalesAccountingBridge.ts:108](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:108) |
| O catálogo de arquétipos é **fechado em 6 chaves**, sem inserção exposta | [catalog.ts:27](../../server/src/features/accountingBinding/archetypes/catalog.ts:27) |
| `AccountRole` é uma union **CONGELADA de 9 papéis** (F-BP-3a) | [types.ts:23](../../server/src/features/accountingBinding/models/types.ts:23) |
| O binding compilado carrega `sectorKey` + `eventBindings[].{eventKey,archetypeKey,fieldSlots,roleSlots,descriptionTemplate}` | [AccountingBindingDto.ts](../../server/src/features/accountingBinding/dtos/AccountingBindingDto.ts) |
| `descriptionTemplate` existe **exatamente porque** o texto é setorial ("um vertical de clínica não diria 'salão'") | [AccountingBindingDto.ts](../../server/src/features/accountingBinding/dtos/AccountingBindingDto.ts), comentário do campo |
| O binding do salão vincula 5 eventos: `salon.sale.finalized/settled/returned`, `salon.package.sold`, `salon.sale.cogs` | [salonBinding.ts:74](../../server/src/features/accountingBinding/fixtures/salonBinding.ts:74) |
| `factory.ts` ainda importa `SALON_BINDING_V1` como **valor de bootstrap síncrono**, substituído no pré-boot | [factory.ts:529](../../server/src/lib/factory.ts:529) e [factory.ts:829](../../server/src/lib/factory.ts:829) |
| O registro de presets tem **uma** entrada em `services` | [presets/index.ts:19](../../server/src/features/dynamicTables/presets/index.ts:19) |
| A base de conhecimento do matcher tem **uma** entrada, e ela já reivindica "clínicas de estética" | [PresetKnowledgeBase.ts:17](../../server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts:17) |
| `customerModule` **não tem** nenhum campo clínico (anamnese/consentimento/contraindicação) | [CustomerModule.ts:26](../../server/src/features/dynamicTables/presets/modules/people/CustomerModule.ts:26) — lido integralmente |
| O CLI de ativação **hardcoda** `SALON_BINDING_V1`; `--sector-key` só troca o rótulo e a chave de idempotência | [activateAccountingBindingCli.ts:29](../../server/src/jobs/activateAccountingBindingCli.ts:29), [:61](../../server/src/jobs/activateAccountingBindingCli.ts:61), [:121](../../server/src/jobs/activateAccountingBindingCli.ts:121) |

**As duas leituras que mais mudam o desenho deste incremento** são a 4ª e a última — estão
desenvolvidas nos comportamentos 5 e 6.

---

## 3. Checklist numerado de comportamentos

Cada item é individualmente testável. "Teste" descreve o oráculo, não o arquivo.

### Bloco I — o preset do vertical

**1. Existe um preset `aestheticClinic`, composto por módulos existentes, registrado no catálogo.**
Arquivo novo `presets/systems/AestheticClinicPreset.ts`, espelhando a composição de
[BeautySalonPreset.ts:30](../../server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts:30);
entrada nova em `tablePresetSuites.services` ([presets/index.ts:19](../../server/src/features/dynamicTables/presets/index.ts:19)).
**Invariante duro:** as tabelas `sales` e `saleItems` mantêm os mesmos `internalName` do salão — é por
`internalName` que as pontes contábeis acham a tabela
([SalonSalesAccountingBridge.ts:55](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:55)),
não por preset key.
*Teste:* o preset resolve pelo registro; as chaves de tabela exigidas pelas 4 pontes existem; **nenhum
arquivo compartilhado de `presets/modules/` aparece no diff**.

**2. A ficha clínica existe nos `customers` do vertical 2 sem editar o módulo compartilhado.**
Hoje `customerModule` não tem campo clínico algum (verificado). O vertical 2 precisa de pelo menos um
campo que o salão não tem — é isso que torna a prova honesta em vez de "o mesmo preset com outro
catálogo" (o achado OQ-1 do dossiê, que derrubou a opção barbearia).
**Mecanismo é fork — ver F-P2-5.** Editar `CustomerModule.ts` está **vetado**: é arquivo existente
compartilhado com o salão, e o parecer classifica diff nele como falha da prova, não como preset novo.
*Teste:* a tabela `customers` instanciada para um tenant de clínica tem o campo; a instanciada para um
tenant de salão **não** tem; `CustomerModule.ts` fora do diff.

**3. O matcher resolve uma descrição de clínica estética para `aestheticClinic`, não para `beautySalon`.**
Isto exige **duas** mudanças, e a segunda é fácil de esquecer: entrada nova em `presetKnowledgeBase`
**e** emenda à `aiDescription` do `beautySalon`, que hoje reivindica literalmente "clínicas de estética"
([PresetKnowledgeBase.ts:17](../../server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts:17)).
Sem a emenda, as duas entradas competem pela mesma descrição e o desempate fica a cargo da IA — a prova
passaria ou falharia por acaso.
*Teste:* `PresetMatcher.findMatchingPreset` sobre uma descrição de clínica devolve `aestheticClinic`;
sobre uma descrição de salão devolve `beautySalon`. **`PresetKnowledgeBase.ts` está em `presets/ai/`,
que o parecer classifica como MOTOR de preset (zero-diff estrito) — ver F-P2-10.**

### Bloco II — o binding do vertical

**4. Existe uma fixture de binding do vertical 2, validável contra o catálogo real.**
Arquivo novo `fixtures/clinicBinding.ts`, espelhando
[salonBinding.ts](../../server/src/features/accountingBinding/fixtures/salonBinding.ts):
`sectorKey: 'aestheticClinic'`, os mesmos `archetypeKey` do catálogo fechado, `roleSlots[].accountCode`
literais resolvidos contra o chart, e `descriptionTemplate` **setorial** — "Receita clínica —
Atendimento {sourceId}" no lugar de "Receita salão — Venda {sourceId}". O campo existe exatamente para
isso.
*Teste:* espelho do caso "`SALON_BINDING_V1` … valida OK contra o catálogo REAL" que já existe em
`BindingValidationService.test.ts` — o binding da clínica passa nas checagens do validador sem
nenhum `SLOT_UNFILLED`/`SLOT_ORPHAN`.

**5. O binding do vertical 2 cobre TODOS os eventos que a operação dele emite — e a ausência de
cobertura é detectada por gate, não por leitura de log.**
Este é o comportamento mais importante do incremento, e ele nasce de um achado desta sessão:

> O dispatcher lança `ValidationError` quando não acha mapper
> ([AccountingSyncService.ts:117](../../server/src/features/accounting/sync/AccountingSyncService.ts:117)),
> **mas a ponte captura esse erro e apenas loga um `warn`**
> ([SalonSalesAccountingBridge.ts:108](../../server/src/features/accounting/sync/bridges/SalonSalesAccountingBridge.ts:108)).
> A venda é gravada com sucesso; nenhum lançamento contábil nasce; o HTTP devolve 200.

Consequência para a prova: um binding de clínica a que falte, digamos, `salon.sale.cogs` produz uma
**ECD silenciosamente incompleta** — o arquivo é gerado, passa os gates internos, e falta CMV. A
métrica *time-to-first-ECD* marcaria sucesso. O oráculo interno inteiro diria PASS.
**Comportamento exigido:** um gate de cobertura que compare o conjunto de `eventKey` do binding
`Active` da unidade com o conjunto de `sourceType` que as pontes podem emitir para as tabelas
instaladas, e falhe explicitamente na falta. **Onde esse gate roda é fork — ver F-P2-6.**
*Teste-guarda:* fixture de clínica com um `eventBinding` deliberadamente removido → o gate reprova.
Sem esse teste, o comportamento 5 é prosa.

**6. A ativação do binding do vertical 2 compila o payload do vertical 2.**
Hoje o CLI hardcoda `SALON_BINDING_V1`/`SALON_OPERATIONAL_SCHEMA_SNAPSHOT`
([activateAccountingBindingCli.ts:29](../../server/src/jobs/activateAccountingBindingCli.ts:29),
[:121](../../server/src/jobs/activateAccountingBindingCli.ts:121)) e `--sector-key` só troca o rótulo
gravado e a chave de idempotência
([:61](../../server/src/jobs/activateAccountingBindingCli.ts:61),
[:92](../../server/src/jobs/activateAccountingBindingCli.ts:92)). **Rodar hoje
`--sector-key aestheticClinic` gravaria o binding DO SALÃO sob o rótulo da clínica** — uma linha
`Active`, válida, com os `descriptionTemplate` errados e sem nenhum erro. É um footgun ativo, não uma
lacuna teórica. **Mecanismo é fork — ver F-P2-7.**
*Teste:* ativar o setor `aestheticClinic` grava uma linha cujo payload tem
`sectorKey: 'aestheticClinic'` e os `descriptionTemplate` da clínica; par vermelho→verde contra o
comportamento de hoje.

### Bloco III — o tenant-fixture e a operação (F-P2-2a)

**7. Existe um tenant-fixture sintético da clínica, semeado pela ordem real de bootstrap.**
A ordem é **dura e foi descoberta na marra no FEEDER**: chart de contas → **`AccountingPeriod` OPEN no
mês corrente** → binding compilado → boot. Sem o período aberto, a compilação sai `Draft`, a linha
`Active` não nasce, e o boot falha depois apontando para o binding ausente — não para a causa real.
O script de seed espelha `scripts/activate-salon-binding.mjs`, incluindo o modo `--self-check` que não
toca em banco do projeto.
**Risco de domínio a mitigar explicitamente:** um fixture sintético não cobre formato de dado real —
ele **tem que** popular pelo caminho real de escrita (Prisma Client via os services), nunca por SQL
direto. Um fixture que grava `TEXT` onde o Prisma grava `INTEGER` ms-epoch faria a ECD "passar" sobre
um dado que a operação real nunca produziria.
*Teste:* `--self-check` do próprio script, no padrão do irmão do salão.

**8. A operação de um ano-calendário da clínica é postada, fechada e exportada.**
Vendas (`sales`/`saleItems`), pacotes, despesas; fechamento de cada período tocado; `closeExercise`
para o ano; `EXPORT_SPED_ECD`.
**Pré-requisito conhecido, que já mordeu antes:** o encerramento lê **piso em 1º-jan do exercício** — a
fixture precisa cobrir o ano-calendário inteiro, não "alguns meses", ou o encerramento lê base
incompleta.
*Teste:* integração ponta-a-ponta — o job produz arquivo; o balancete da clínica fecha; Σ do subrazão
casa com o razão.

### Bloco IV — a prova e seus artefatos

**9. A prova zero-diff roda como comando versionado, não como inspeção manual.**
Um script que executa o `git diff` sobre o perímetro e sai não-zero se houver qualquer arquivo. O
perímetro **hoje ratificado** é: motor DynamicTable (`services/ repositories/ policies/ rules/
validation/ dtos/ models/ utils/`), `presets/PresetManager.ts` + `presets/ai/` + `presets/fields/`,
núcleo de `features/accounting`, `features/accounting/sync/`, o intérprete
(`features/accountingBinding/{archetypes,interpreter,models}`) e **`server/src/lib/factory.ts`**
(emenda ratificada 2026-08-22). `dynamicTablesController.ts` está fora — F-P2-10.
**Nota de honestidade que o script deve carregar por escrito:** `factory.ts` contém hoje
`buildSalonAccountingMappers()` e o import estático de `SALON_BINDING_V1`
([factory.ts:529](../../server/src/lib/factory.ts:529)). Isso é o **valor de bootstrap síncrono**,
substituído no pré-boot e nunca observado por um request. O vertical 2 **não precisa tocá-lo** — logo
o zero-diff é alcançável. Mas o arquivo permanece nominalmente vertical-1: a prova mede "não precisei
editar", não "não há mais nada de salão aqui".
*Teste:* o script detecta um diff plantado no perímetro e passa quando não há.

**10. O runbook `P2-1` existe em branco.**
Formato `RUNBOOK-FORMAT.md`: pré-condições, passos com evidência colada, desfecho em 3 estados,
assinatura. **O agente prepara; não preenche evidência, não marca desfecho, não assina.**

**11. A métrica *time-to-first-ECD* tem T0 e T1 definidos por escrito antes de ser medida.**
F-P2-4 segue aberto. Independente da opção, **T0 é ambíguo hoje** — ver §8, insumo ausente 1.

---

## 4. Contratos esboçados

### 4.1 Preset do vertical (forma existente, sem schema novo)

```ts
// presets/systems/AestheticClinicPreset.ts — MESMO shape de PresetSuite (presets/index.ts)
const AestheticClinicPreset = {
  key: 'aestheticClinic',
  name: 'ERP para Clínica de Estética',
  description: '...',
  tables: {
    customers:  createTableFromModule(/* módulo da ficha clínica — F-P2-5 */),
    services:   createTableFromModule(serviceModule),       // reuso literal
    products:   createTableFromModule(productModule),       // reuso literal
    packages:   createTableFromModule(packageCatalogModule),
    sales:      createTableFromModule(salesModule),         // internalName 'sales' — INVARIANTE
    saleItems:  createTableFromModule(saleItemsMixedModule),
    // ... demais módulos reusados sem diff
  },
};
```

### 4.2 Binding do vertical (schema JÁ existente — nenhum campo novo)

O contrato é `AccountingBindingV1Schema`, **inalterado**. O vertical 2 preenche, não estende:

```ts
{
  sectorKey: 'aestheticClinic',
  bindingVersion: /* o compilador atribui */,
  compiledAt: /* o compilador atribui */,
  compiledFromHash: /* o compilador atribui */,
  eventBindings: [
    { eventKey: 'salon.sale.finalized',  archetypeKey: 'revenue_recognition',
      fieldSlots: [/* ... */],
      roleSlots: [{ role: 'receita-serviço', accountCode: '3.1' }, /* ... */],
      descriptionTemplate: 'Receita clínica — Atendimento {sourceId}' },
    { eventKey: 'salon.sale.settled',   archetypeKey: 'settlement',            /* ... */ },
    { eventKey: 'salon.sale.returned',  archetypeKey: 'reversal',              /* ... */ },
    { eventKey: 'salon.package.sold',   archetypeKey: 'performance_liability', /* ... */ },
    { eventKey: 'salon.sale.cogs',      archetypeKey: 'cogs',                  /* ... */ },
  ],
}
```

> **O `eventKey` `salon.*` numa clínica não é engano de digitação — é F-P2-6.** As pontes emitem esse
> `sourceType` literal e vivem no perímetro zero-diff.

### 4.3 Entrada de compilação (rota e DTO existentes — nenhum contrato novo)

`POST /accounting-binding/compile`, corpo `CompileBindingRequestSchema` **inalterado**:
`{ unitId, sectorKey, operationalSchema, chart[], eventBindings[] }`.
**Se este incremento precisar alterar qualquer um dos três DTOs do módulo, isso é sinal de falha da
prensa** — o binding do vertical 2 deveria caber no shape que o vertical 1 fixou.

### 4.4 Gate de cobertura de evento (contrato NOVO — o único deste incremento)

```ts
// forma; o lugar é F-P2-6
interface BindingCoverageReport {
  unitId: string;
  sectorKey: string;
  boundEventKeys: string[];      // do binding Active
  emittableEventKeys: string[];  // derivado das tabelas instaladas + pontes registradas
  missing: string[];             // emittable \ bound  → não-vazio = reprova
  orphan: string[];              // bound \ emittable  → binding aponta p/ evento que ninguém emite
}
```

### 4.5 Gates que o diff aciona (checagem, não improviso do implementador)

| Gate | Aplica? | Por quê |
|---|---|---|
| Snapshot de shape dos DTOs Zod | **Não esperado** | nenhum DTO novo nem alterado; se acionar, é sinal de falha (§4.3) |
| Paridade i18n pt/en | **Não esperado** | incremento é backend |
| Allowlist do `auditCanonical.ts` | **Não esperado** | reusa `binding.compiled`/`binding.activated` |
| Guard de path-count do openapi | **Não esperado** | nenhuma rota nova |
| `tsc` server + my-app limpos | **Sim** | gate permanente |
| CI Linux | **Sim** | oráculo de concorrência; verde local não substitui |

> As quatro primeiras linhas dizerem "não esperado" **é a tese do incremento**, não uma isenção: se
> alguma acionar, o item vira achado sobre a prensa.

---

## 5. Forks já ratificados (contexto — não rediscutir)

| # | Decisão | Data |
|---|---|---|
| **F-P2-1** → clínica estética | setor do vertical 2 | 2026-08-21 |
| **F-P2-2** → (a) tenant-fixture interno sintético | tenant da prova | 2026-08-22 |
| **Emenda §2** → `factory.ts` dentro do perímetro zero-diff | escopo do diff | 2026-08-22 |

## 6. Forks PENDENTES DE RATIFICAÇÃO

Dois herdados do ADR-P2, seis novos deste BRIEF. **Nenhum se auto-ratifica.**

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-P2-3** (herdado) | Profundidade da prova contábil | (a) até ECD gerada (gates internos) · (b) (a) + import PVA-limpo | **(b)** pelo mérito; **(a)** pela ordem — pedir PVA do vertical 2 antes do vertical 1 inverte a dependência que o roadmap declara. Aberto **por dependência do H1**, não por indecisão |
| **F-P2-4** (herdado) | Onde registrar *time-to-first-ECD* | (a) runbook manual · (b) instrumentação no produto | **(a)** — YAGNI com um tenant. Mas as duas dependem de resolver T0 (§8) |
| **F-P2-5** (novo) | Mecanismo da ficha clínica | (a) módulo novo `AestheticClinicCustomerModule.ts` composto pelo preset · (b) `customerModule` + `FieldCustomizationService` em runtime · (c) editar `CustomerModule.ts` compartilhado | **(a)** — arquivo novo em `presets/modules/`, zona onde o parecer autoriza crescer. **(c) está vetado** (diff em arquivo compartilhado = falha da prova). (b) é o caminho que mais exercita a prensa (customização de campo é o invariante 4 do ADR-P1) e por isso o mais informativo — mas acopla a prova ao wizard, que tem lacuna própria (§8) |
| **F-P2-6** (novo) | Vocabulário `salon.*` e onde mora o gate de cobertura | (a) o binding da clínica vincula `salon.*` como está; gate de cobertura vive no alimentador, no boot · (b) renomear para `sale.finalized` neutro em `sync/bridges/` **antes** do P2 · (c) gate vive só como teste da fixture, não em runtime | **(a)** para a prova — (b) é diff dentro do perímetro zero-diff, logo é **lacuna do P1** e exige instrumentação→correção própria, não cabe aqui. Registrar (b) como dívida nomeada. **(c) é o caminho barato e o que eu menos recomendo**: o modo de falha do comportamento 5 é silencioso em produção, não só na prova |
| **F-P2-7** (novo) | Parametrização do CLI de ativação | (a) registry `sectorKey → {binding, operationalSchema}` dentro do CLI atual · (b) 2º CLI para a clínica · (c) CLI lê payload de arquivo JSON por flag | **(a)** — o CLI está fora do perímetro zero-diff, então editá-lo é legítimo; um registry mantém um caminho só. (b) duplica o pré-check de idempotência. (c) é o mais geral e o mais perigoso: abre porta para payload não-versionado ativar binding em produção |
| **F-P2-8** (novo) | Amplitude operacional da clínica na prova | (a) serviço + revenda de cosmético + pacote (exercita os 5 arquétipos) · (b) serviço puro (exercita 3) | **(a)** — sob (b), `cogs` e `performance_liability` **nunca disparam** (a ponte de CMV sai cedo com zero linhas de produto), e a prova cobriria menos que o vertical 1 já cobre |
| **F-P2-9** (novo, era OQ-2 do dossiê) | Fechamento dos meses da fixture | (a) `SOFT_CLOSED` (reabrível) · (b) `HARD_CLOSED` (terminal) | **(b)** — a prova é "gera a própria ECD"; hard close é o estado em que um exercício real é declarado. (a) deixa a prova reabrível e enfraquece o que ela afirma |
| **F-P2-10** (novo, era OQ-4 do dossiê) | Perímetro: `dynamicTablesController.ts` e `presets/ai/` | (a) incluir os dois no zero-diff · (b) manter só o que a emenda de 08-22 nomeou · (c) incluir o controller, excluir `presets/ai/` | **(c)** — o controller invoca as pontes de salão incondicionalmente e é o acoplamento vertical mais claro fora do perímetro atual; já `presets/ai/PresetKnowledgeBase.ts` **precisa** de uma linha nova (comportamento 3), então mantê-lo em zero-diff estrito reprovaria a prova por fazer exatamente o que o ADR-P2 §1 autoriza |

> **F-P2-10 é bloqueante de execução**, não cosmético: o comportamento 3 exige editar um arquivo que a
> classificação vigente do parecer põe em "MOTOR de preset, zero-diff estrito". Ou o perímetro se
> ajusta, ou o comportamento 3 falha a prova por construção.

---

## 7. Pendente de validação externa (nunca entra no checklist como decidido)

1. **PVA da ECD do vertical 2** (F-P2-3b). Gate humano. Runbook `P2-1`, evidência colada, assinatura.
   **Não reaproveita** a evidência do H1 — é dado de tenant diferente.
2. **PVA do vertical 1** — pré-condição de entrada §5.2 do ADR-P2, **não satisfeita**. Ou o dono a
   revoga explicitamente (como revogou a do P1), ou o P2 espera.
3. **Browser sign-off pós-swap do salão** (RUNBOOK-H2, passos 6-11) — pendente, e agora com o caminho
   de runtime do salão vindo do banco.
4. **Conteúdo clínico da ficha (comportamento 2) — dado pessoal sensível de saúde.** Anamnese,
   contraindicação e termo de consentimento são categoria especial sob a LGPD, com regime de
   tratamento próprio. **Nenhum artefato jurídico foi citado nesta sessão**, então nenhum campo
   concreto entra no checklist: o comportamento 2 fixa *que existe um campo próprio da clínica* e
   deixa *quais campos, com que base legal e que retenção* para validação externa. Um preset que
   colete dado de saúde sem esse respaldo é risco jurídico do produto, não detalhe de schema.
5. **Plano de contas da clínica** — se algum papel exigir conta que o salão não usa, é conta nova por
   papel (autorizada pelo ADR-P2 §1). Nenhuma das leituras desta sessão indicou necessidade; **não
   verificado exaustivamente** contra o catálogo de 9 papéis.

## 8. Insumos ausentes (registrados, não varridos — regra 2)

1. **T0 da métrica não tem evento no código.** O wizard termina em `COMPLETED` sem persistir nenhum
   marco de "sistema pronto". Qualquer das duas opções de F-P2-4 precisa que isso seja decidido antes.
2. **A orquestração server-side da entrevista não está plugada** — sem controller/rota; a lógica ativa
   vive no frontend, **não auditada** por esta sessão nem pelo dossiê. O passo 1 do roteiro
   ponta-a-ponta assume essa camada.
3. **`seedYear` não é chamado por nenhum fluxo de onboarding** e o plano de contas nasce *lazy*, dentro
   do primeiro `postEntry`. Os dois degraus manuais entram no relógio da métrica se não forem isolados —
   **gap pré-existente do vertical 1** que o P2 herdaria e mediria junto.
4. **`appointments` não foi lido campo a campo** por nenhuma sessão até aqui. Fora do caminho crítico
   contábil (nenhum mapper deriva de agendamento), mas entra no preset da clínica.

## 9. Achados fora de escopo (não planejar — exigem autorização própria)

1. **Comissão a profissional não tem arquétipo.** Zero ocorrência de `commission` em
   `features/accounting/`. Para uma clínica, comissão por atendimento é custo dominante. Ou continua
   lançamento manual via `expenses` (como no salão hoje), ou é **arquétipo novo — o que o ADR-P2 §4
   declara não-objetivo e manda registrar como lacuna do corpus do P1**.
2. **Agendamento não é fato gerador de receita** em nenhum mapper. Clínicas comumente faturam ao
   concluir o atendimento; para reusar o corpus, a UI precisa continuar gerando linha em `sales`.
   Restrição de modelagem operacional a registrar no preset.
3. **O fallback de chave bare do dispatcher segue vivo**
   ([AccountingSyncService.ts:116](../../server/src/features/accounting/sync/AccountingSyncService.ts:116)) —
   estruturalmente inalcançável em produção (o alimentador só emite entradas escopadas) e testado como
   tal. Removê-lo mudaria o tipo aceito pelo construtor: fork, não limpeza.
4. **`factory.ts` continua nominalmente vertical-1** (bootstrap `buildSalonAccountingMappers()`).
   Não impede o zero-diff; incomoda a leitura. Limpar exigiria decidir o que o bootstrap síncrono
   constrói quando não há vertical privilegiado — fork próprio, fora deste incremento.

## 10. Ordem de execução sugerida

Fatias que fecham sozinhas, na ordem em que uma destrava a seguinte:

1. **A** — preset + matcher (comportamentos 1, 2, 3). Depende de F-P2-5 e F-P2-10.
2. **B** — binding + ativação (4, 6). Depende de F-P2-6 e F-P2-7.
3. **C** — gate de cobertura (5). Depende de F-P2-6. *Antes* do fixture, para que a fixture nasça coberta.
4. **D** — tenant-fixture + operação do ano (7, 8). Depende de F-P2-8 e F-P2-9.
5. **E** — prova zero-diff + runbook + métrica (9, 10, 11). Depende de F-P2-10 e F-P2-4.

**Fatia A não começa antes de F-P2-5 e F-P2-10 ratificados** — os dois decidem em qual arquivo a
primeira linha é escrita.

---

## 11. Autoavaliação (T2/T8)

- **Grau dos claims sobre código:** todos os itens do §2 são **verificados** por leitura nesta sessão,
  com `arquivo:linha`. Os comportamentos do §3 são **propostos** — nenhum existe.
- **Caso adversarial tentado:** procurei ativamente se o vertical 2 poderia ser provado *sem* preset
  novo — a hipótese que a opção barbearia levantava. Não se sustenta sob F-P2-1: `PresetKnowledgeBase`
  tem uma entrada só, e ela reivindica "clínicas de estética", então sem entrada nova o matcher devolve
  `beautySalon` e a prova mediria o próprio preset do vertical 1. O comportamento 3 nasceu desse teste.
- **Checagem que teria me falsificado:** se a ponte propagasse o `ValidationError` do dispatcher, o
  comportamento 5 seria desnecessário — o vertical 2 falharia alto na primeira venda sem binding. Fui
  ler o `catch` esperando encontrar propagação; encontrei `logger.warn` e um `return`. O comportamento
  5 existe por causa dessa leitura, não por precaução genérica.
- **Viés a declarar:** li o código pelo caminho que os documentos-fonte já apontavam
  (`accountingBinding`, `sync/`, `presets/`, `factory.ts`, o CLI). **Não** varri `server/src`
  inteiro atrás de outros acoplamentos vertical-específicos — a regra 2 desta sessão proíbe, e o
  parecer de 08-21 já se declarava não-exaustivo no mesmo ponto. Se existe acoplamento de salão em
  rota de relatório ou serviço de CRM, este BRIEF não o cobre.
- **Segundo viés:** tenho tendência a converter risco em mais gate. Os comportamentos 5 e 9 são gates
  novos. Sob a moratória de auditoria vigente, **eles se justificam por serem gates do produto** (um
  reprova ECD incompleta em runtime, o outro é a definição de sucesso do próprio ADR) — não aparato de
  auditoria sobre o instrumento. Se o dono ler qualquer um dos dois como aparato, F-P2-6(c) é a saída
  barata para o 5, e o 9 vira inspeção manual no runbook.
