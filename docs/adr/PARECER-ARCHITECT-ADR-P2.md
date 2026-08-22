> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Parecer do luminaris-accounting-architect sobre o PRE-ADR ADR-P2 (segundo vertical)

Persona: `luminaris-accounting-architect`. Este parecer **enriquece** o PRE-ADR com invariantes
contábeis e evidência de código — **não ratifica** F-P2-1..4 nem qualquer fork de ADR-P1. Todo claim
sobre comportamento de código foi verificado por leitura real (`Read`/`Grep`) nesta sessão; grau
declarado em cada afirmação.

---

## 0. Sumário executivo

1. **A prova zero-diff, como redigida em ADR-P2 §2.2, é falseável na letra mas subespecificada na
   prática** — hoje já existe código vertical-específico ("salão") em dois arquivos que **não** estão
   dentro de nenhum dos três caminhos que o §2.2 nomeia (`features/dynamicTables`,
   `features/accounting` núcleo, "intérprete"): `server/src/controllers/dynamicTablesController.ts`
   (linhas 12-14, 119-121, 148-149) e `server/src/lib/factory.ts` (linhas 91-95, 402-407). **Verificado.**
2. **O corpus de arquétipos de P1 reusa por FORMATO de tabela (`internalName`), não por preset** — as
   quatro bridges de salão fazem `findTableByInternalName(actor.userId, 'sales'|'saleItems')`
   (`SalonSalesAccountingBridge.ts:55`, `SalonPackageSoldBridge.ts:50`, `SalonSaleSettlementBridge.ts:59`,
   `SalonSaleReversalBridge.ts:59`) — **não** checam o preset/setor do tenant. Isso é uma notícia melhor
   que a suposição implícita do PRE-ADR: se o vertical 2 reusar os módulos `salesModule`/
   `saleItemsMixedModule` sob as mesmas chaves de tabela, três dos cinco arquétipos (reconhecimento,
   liquidação, estorno) disparam **hoje, sem P1, sem código novo** — o que muda o cálculo de risco de
   F-P2-1. **Verificado.**
3. **Dois arquétipos do corpus NÃO são garantidos para um vertical de serviço puro**: pacote pré-pago
   (depende de `packages`/`packageCatalogModule`) e CMV (depende de linhas de produto com estoque
   rastreado via `InventoryService`) — uma barbearia/clínica sem revenda de produto físico não dispara
   `SalonSaleCogsMapper` nunca (`SalonSalesAccountingBridge.ts:146` retorna cedo se
   `productLines.length === 0`). **Verificado.**
4. **Comissão a profissional não tem arquétipo nenhum no corpus** — zero ocorrência de `commission`/
   `Commission` em `server/src/features/accounting/**` (grep exaustivo). Para um vertical anel-1 onde
   comissão é o custo operacional mais recorrente, isso é uma lacuna de cobertura do P1, não do P2.
   **Verificado.**
5. **O onboarding hoje não prepara a contabilidade para nenhum tenant, nem para o salão** — a wizard
   de entrevista (`InterviewService`/`StageHandlers`) termina em `COMPLETED` sem tocar
   `AccountingScope`/plano de contas/período; o plano de contas só nasce **lazy**, dentro da própria
   `postEntry`, na primeira tentativa de lançamento (`PostingService.ts:114-139`); e o **período contábil
   não nasce automaticamente em nenhum caso** — exige chamada explícita a
   `POST /accounting/{unitId}/periods/seed-year` (`accountingController.ts:480-500`,
   `PeriodService.ts:33-40`). *time-to-first-ECD* hoje inclui um passo humano/manual fora do wizard,
   **para qualquer vertical, inclusive o salão**. **Verificado.**

---

## 1. (a) O que a prova zero-diff precisa DEFINIR com precisão

ADR-P2 §2.2 diz: *"`git diff` do motor (`features/dynamicTables`), do ledger (`features/accounting`
núcleo) e do intérprete de runtime entre antes e depois do vertical é vazio."* Três problemas de
precisão, cada um verificado por leitura da árvore real:

### 1.1 `features/dynamicTables` mistura MOTOR (deve ficar em zero) com PRESET (deve CRESCER)

Árvore real do diretório (`Bash: find server/src/features/dynamicTables -maxdepth 1`):

```
dynamicTables/
├── __tests__/  docs/  dtos/  models/  policies/  repositories/  rules/  services/  utils/  validation/   ← MOTOR
└── presets/                                                                                              ← PRESET (cresce por vertical)
    ├── PresetManager.ts, ai/, fields/                                                                    ← MOTOR de preset (deve ficar em zero)
    └── systems/  (CoreSystemPreset.ts, BeautySalonPreset.ts, CrmModulePreset.ts)                         ← DADO por vertical
    └── modules/  (business/ core/ crm/ finance/ inventory/ people/ planning/ product/ service/)          ← módulos reusáveis OU novos
```

Se a prova for lida **literalmente** ("diff da árvore `features/dynamicTables` é vazio"), ela **falha
no dia 1** — um vertical 2 exige no mínimo um arquivo novo `presets/systems/<Vertical>Preset.ts`
(paralelo a `BeautySalonPreset.ts:30-56`) e, tipicamente, novos módulos em `presets/modules/*`. Isso
contradiz o próprio §1 do PRE-ADR ("só: preset do setor + binding..."), que **autoriza** essa adição.
**A prova precisa separar explicitamente:**

- **Subárvore MOTOR** (diff deve ser **zero**, nenhum arquivo tocado/criado): `services/`,
  `repositories/`, `policies/`, `rules/`, `validation/`, `dtos/`, `models/`, `utils/` no nível de
  `dynamicTables/`, e `presets/PresetManager.ts` + `presets/ai/` + `presets/fields/` no nível de
  `presets/`.
- **Subárvore PRESET/DADO** (pode **crescer** com arquivos novos; diff em arquivos **existentes**
  compartilhados — ex.: um `modules/finance/SalesModule.ts` já usado pelo salão — deve ser zero, ou é
  reparent/edição do arquétipo, não preset novo): `presets/systems/*`, `presets/modules/*`.

Sem essa distinção escrita, um implementador que adicionar um novo módulo em `presets/modules/finance/`
e alterar `SalesModule.ts:34` para acomodar um campo do vertical 2 estaria, pela letra atual, violando
"zero diff em `features/dynamicTables`" mesmo fazendo exatamente o que o PRE-ADR pede — ou, no sentido
inverso, um revisor complacente poderia deixar passar uma edição real do motor por não notar que
"cresceu dentro da árvore certa".

### 1.2 Código vertical-específico HOJE mora FORA dos três caminhos nomeados — achado não previsto pelo PRE-ADR

Verificado por `Grep` de `SalonSalesAccountingBridge|SalonPackageSoldBridge|SalonSaleReversalBridge|
SalonSaleSettlementBridge` em `server/src`: as quatro bridges são importadas e invocadas
incondicionalmente em **`server/src/controllers/dynamicTablesController.ts:12-14`** (imports) e
**`:119-121`** (`await maybeSyncSalonSaleFinalized/maybeSyncSalonPackageSold/maybeSyncSalonSaleSettled`
no `create`) e **`:148-149`** (mesmo trio no `update`). Esse arquivo:

- **não** está em `features/dynamicTables` (está em `server/src/controllers/`);
- **não** está em `features/accounting`;
- é o controller **genérico** de escrita de DynamicTable — roda para **qualquer** preset, não só salão.

Do mesmo modo, **`server/src/lib/factory.ts:91-95`** importa as cinco classes de mapper de salão e
**`:402-407`** constrói `new AccountingSyncService(postingService, [new SalonSaleFinalizedMapper(), ...,
new SalonPackageSoldMapper()])` — um array **hardcoded** por classe concreta. Esse arquivo também fica
fora dos três caminhos nomeados.

**Consequência prática:** se o intérprete fixo de P1 (quando existir) continuar sendo invocado a partir
de `dynamicTablesController.ts` e sua composição continuar montada em `factory.ts` — o que é plausível,
já que são os pontos de integração atuais — então **esses dois arquivos precisam OU (i) permanecer sem
diff entre verticais (prova de que a composição do intérprete é table-shape-driven e não precisa mais
listar classes por vertical), OU (ii) entrar explicitamente no escopo nomeado da prova de saída.** Hoje
nenhuma das duas coisas está escrita no PRE-ADR. Isso é uma lacuna de definição, não um bug de código.

### 1.3 "Núcleo" do ledger é ambíguo entre duas leituras já usadas no próprio corpus de docs

`ROADMAP-PLATAFORMA.md:149` (Fase P-i18n) define núcleo como **"`PostingService`/`PeriodService`/
`AuditService`/`PostingRepository`"** — explicitamente **excluindo** `sync/mappers` e `sync/bridges`.
Mas ADR-P2 §2.2 diz "ledger (`features/accounting` núcleo)" sem repetir essa definição, e o corpus que
ADR-P1 §2 lista como "o que muda" é justamente `features/accounting/sync/mappers/*` e
`features/accounting/sync/bridges/*` — ou seja, **arquivos dentro de `features/accounting`, mas fora
do núcleo pela definição de P-i18n**. Se a prova de P2 usar a definição estrita de núcleo (só
Posting/Period/Audit/PostingRepository), então os 5 mappers de salão + as 4 bridges de salão **já
provam nada por si**: eles podem crescer/mudar por vertical sem violar "núcleo vazio" — o que esvazia
o objetivo declarado no roadmap ("o motor de binding... roda apenas na geração; o caminho do dinheiro
nunca vê engine", `ROADMAP-PLATAFORMA.md:82-83`). **A prova precisa fixar qual das duas leituras vale**,
e minha recomendação de arquiteto (não-vinculante) é a leitura AMPLA: `features/accounting/sync/**`
inteiro deve ficar em zero-diff para o vertical 2, porque é justamente esse diretório que hoje contém
o acoplamento por vertical (mappers/bridges nomeados "Salon*") que P1 promete eliminar.

### 1.4 "O intérprete de runtime" ainda não tem endereço no código

ADR-P1 §4 ponto 6 diz onde o intérprete **não** pode viver (nunca em `features/accounting`, nunca no
motor DynamicTable) mas não decide onde ele **vive** — "pipeline de geração (`features/interview/*` /
presets)" é citado para a ENGINE de geração (que roda só na criação do preset), não necessariamente
para o intérprete FIXO de runtime, que por definição roda a cada evento contábil, não na geração. Hoje
não existe esse arquivo — é código que ADR-P1 ainda propõe criar. **A prova de saída de P2 cita um
terceiro caminho (`intérprete de runtime`) que só pode ser nomeado com precisão depois que ADR-P1
decidir F-P1-2 (forma do binding) e escrever onde o intérprete mora.** Até lá, "diff do intérprete
vazio" é uma frase sem referente de arquivo — não falseável como está.

### 1.5 Lista de paths a fechar antes da prova rodar (recomendação, não decisão)

| Caminho | Hoje contém código de vertical? | Tratamento recomendado na prova |
|---|---|---|
| `features/dynamicTables/{services,repositories,policies,rules,validation,dtos,models,utils}` | Não (verificado) | Zero-diff estrito |
| `features/dynamicTables/presets/{PresetManager.ts,ai/,fields/}` | Não (verificado) | Zero-diff estrito |
| `features/dynamicTables/presets/{systems/,modules/}` | Sim, por desenho (`BeautySalonPreset.ts`) | Arquivos NOVOS permitidos; diff em arquivo EXISTENTE compartilhado = falha |
| `features/accounting/{services,repositories,models,policies,scope}` (núcleo estrito) | Não (verificado — mappers/bridges ficam fora) | Zero-diff estrito |
| `features/accounting/sync/{mappers,bridges}` | **Sim, hoje** (`Salon*Mapper.ts` ×5, `Salon*Bridge.ts` ×4) | Deveria ser zero-diff **depois** que P1 substituir por binding — ADR-P2 precisa dizer isso explicitamente |
| `server/src/controllers/dynamicTablesController.ts` | **Sim, hoje** (linhas 12-14/119-121/148-149) | Fora do escopo nomeado hoje — recomendo INCLUIR |
| `server/src/lib/factory.ts` | **Sim, hoje** (linhas 91-95/402-407) | Fora do escopo nomeado hoje — recomendo INCLUIR (ou provar que pós-P1 a composição é genérica) |
| "intérprete de runtime" | Não existe ainda | Endereço pendente de ADR-P1 (F-P1-2) |

---

## 2. (b) Riscos por opção — F-P2-1..4 (análise por opção, nenhuma ratificada)

### F-P2-1 — Setor do vertical 2

- **(a) anel 1 — barbearia/clínica estética.** Risco principal: **falso positivo de zero-diff**. Como
  mostrado em §1.2/§1.3, os arquétipos de receita/liquidação/estorno já disparam por formato de tabela
  (`internalName`), então um vertical anel-1 que reusa `salesModule` **pode passar a prova mesmo que P1
  nunca tenha sido implementado** — isso mediria "quão parecido o vertical 2 é do salão", não "quão boa
  é a prensa". Mitigação: a prova de saída deveria rodar **duas vezes** — uma com os mappers atuais
  (linha de base, esperado PASS trivial) e uma exigindo que o binding compilado (P1) seja o único
  mecanismo, nunca os mappers `Salon*` — senão P2 valida o acaso, não a fábrica.
- **(b) anel 2 — petshop/varejo.** Risco secundário confirmado pelo próprio master map: puxa
  Compras/AP operacional (Fase P4, `ROADMAP-PLATAFORMA.md:125-131` — "hoje `Expenses` é registro de
  custo... sem vencimento, sem vínculo de liquidação com fornecedor, sem documento de compra"). Dois
  incrementos por prova = ambos os riscos se misturam; se a prova falhar, não se sabe se foi a prensa
  ou o AP operacional que faltou.

### F-P2-2 — Tenant da prova (fixture vs real)

- **(a) fixture sintético.** Risco de domínio já registrado na memória do projeto:
  `sintetico-nao-cobre-formato-de-dado-real` — fixture SQL grava `TEXT`, Prisma grava `INTEGER`
  ms-epoch; um fixture "realista" pode não reproduzir o formato exato de coluna que o Prisma Client
  grava em produção. Para uma prova cujo objetivo final é "gera a própria ECD", isso é risco direto:
  ECD lê direto das tabelas populadas pelo `SpedGenerationService` — se o fixture povoar diferente do
  fluxo real de `postEntry`, o "sucesso" da ECD gerada não garante que o binding funciona no caminho
  real de escrita.
- **(b) tenant real.** Reabre exatamente o déficit de oráculo que `CLAUDE.md` já registra como
  travado: 4 de 4 oráculos externos abertos (PVA, browser sign-off, XML NF-e real, arquivo RFB) — regra
  vigente proíbe montar aparato novo de auditoria enquanto isso não fechar, e a moratória é sobre
  "aparato", mas o *espírito* (não abrir 2ª frente de dado externo antes da 1ª fechar) se aplica.

### F-P2-3 — Profundidade da prova contábil

- **(a) até ECD gerada (gate interno).** Risco: repete o mesmo déficit que a auditoria de 5 rodadas já
  registrou para o vertical 1 — arquivo existe e passa gate de cobertura interno, mas **nenhum humano
  confirmou no PVA que o SPED é lido corretamente**. Sem oráculo externo, "ECD gerada" mede geração de
  bytes, não corretude contábil.
- **(b) (a) + import PVA-limpo.** Risco: acopla P2 ao mesmo gargalo humano do Bloco A
  (`ACCOUNTING-MASTER-MAP.md:296` — "Sign-off humano no PVA... bloqueia declarar Núcleo 5 fechado").
  Hoje **nenhum** dos três SPEDs do vertical 1 tem PVA confirmado — pedir PVA para o vertical 2 antes do
  vertical 1 fechar inverte a ordem de dependência real que o próprio roadmap declara ("Parte A
  terminada + PVA verde", `ROADMAP-PLATAFORMA.md:84-85`).

### F-P2-4 — Onde registrar a métrica (runbook vs instrumentação)

- **(a) runbook manual.** Risco baixo, mas **o timestamp de "onboarding" não tem um evento único e
  claro no código hoje** para ancorar o relógio — a wizard termina em `nextStage: 'COMPLETED'`
  (`StageHandlers.ts:78,96,117`), mas nada nesse ponto persiste um timestamp de "sistema pronto";
  quem preencher o runbook manualmente terá que decidir, sem ajuda do código, qual evento marca T0.
- **(b) instrumentação no produto.** YAGNI-correto para uma prova única (concordo com a recomendação do
  PRE-ADR), mas o achado acima (nenhum T0 marcado) também é relevante aqui: instrumentar exigiria
  primeiro decidir ONDE fica esse T0 — não é gratuito nem no cenário (b).

---

## 3. (c) Arquétipos que um vertical anel-1 reusaria — e quais NÃO (evidência nos mappers/bridges)

**Reuso confirmado (gatilho é o `internalName` da tabela, não o preset — `SalonSalesAccountingBridge.ts:55`,
`SalonPackageSoldBridge.ts:50`, `SalonSaleSettlementBridge.ts:59`, `SalonSaleReversalBridge.ts:59`):**

| Arquétipo | Mapper/Bridge | Reuso por anel-1 (barbearia/clínica) |
|---|---|---|
| Reconhecimento de receita | `SalonSaleFinalizedMapper.ts:18-66` via `SalonSalesAccountingBridge.ts:39-126` | **Sim, incondicional** — dispara para qualquer `sales.status==='Finalized'` na tabela `internalName:'sales'`, independente de setor |
| Liquidação | `SalonSaleSettledMapper.ts:6-30` via `SalonSaleSettlementBridge.ts` | **Sim, incondicional** — mesmo gatilho por tabela |
| Estorno de origem | `SalonSaleReturnedMapper.ts:6-22` via `SalonSaleReversalBridge.ts` | **Sim, incondicional** — idem |

**Reuso CONDICIONAL — depende do shape operacional que o setor escolher, não do preset em si:**

| Arquétipo | Mapper/Bridge | Condição de disparo (verificado) | Aplica a barbearia/clínica? |
|---|---|---|---|
| Passivo de performance (pacote pré-pago) | `SalonPackageSoldMapper.ts:6-16` via `SalonPackageSoldBridge.ts` | `saleInfo.kind === 'Package'` (`SalonSalesAccountingBridge.ts:66`), que depende de `packages`/`packageCatalogModule` estar no preset e a venda referenciar um pacote | Plausível para clínica estética (pacotes de sessões); menos comum para barbearia avulsa — **depende da escolha operacional dentro de F-P2-1(a), não é automático** |
| CMV | `SalonSaleCogsMapper.ts:25-65` via `maybeSyncSalonSaleCogs` (`SalonSalesAccountingBridge.ts:138-181`) | Só dispara se `productLines.length > 0` (`SalonSalesAccountingBridge.ts:146`) — exige `stockMovementsModule`/`InventoryService` com linhas de produto na venda | Só se o vertical revender produto físico com estoque rastreado (ex.: cosméticos numa clínica). Barbearia pura de serviço: **zero produtLines, arquétipo nunca dispara** |
| Comando de subrazão (criação de título AR) | `CrmReceivableBridge.ts:14-40`, invocado de `crmController.ts` (grep) | Depende do fluxo CRM `Opportunity` → `Won`, presente em `CoreSystemPreset.ts:33-37` (instalado para todo tenant) | Tecnicamente disponível para qualquer vertical, mas **operacionalmente improvável** para o fluxo B2C típico de barbearia/clínica avulsa (sem pipeline de negociação por cliente) |

**Confirmado como AUSENTE do corpus — não é "não decidido pelo fork", é lacuna de cobertura de P1:**

- **Comissão a profissional.** Zero ocorrência de `commission`/`Commission` em
  `server/src/features/accounting/**` (grep exaustivo nesta sessão). O módulo `commissionsModule`
  existe no preset de salão (`BeautySalonPreset.ts:52`) mas não tem nenhum mapper/bridge associado — é
  uma tabela DynamicTable pura, sem journal entry automático. Para um vertical anel-1 onde comissão por
  atendimento é o custo operacional dominante (barbeiro/esteticista), isso significa: **ou o time
  aceita que comissão continua sendo lançamento manual via `ExpensesModule`** (mesmo padrão hoje
  aplicado ao salão, sem vínculo formal com o evento de venda), **ou é um arquétipo novo que P1 não
  cobre** — e, pelo §4 do PRE-ADR de P2, "nenhum arquétipo novo deveria nascer aqui" na prova do
  vertical 2; se nascer, é achado que o corpus do P1 estava incompleto (texto do próprio PRE-ADR,
  `ADR-P2-second-vertical.md:44-45`).
- **Agendamento (`AppointmentsModule`) como fato gerador de receita.** Não existe nenhum mapper com
  `sourceType` derivado de `appointments` — o gatilho de receita no corpus inteiro é sempre a tabela
  `sales`/`saleItems`. Se o vertical 2 registrar faturamento diretamente na finalização de um
  agendamento (fluxo comum em clínicas — "concluir atendimento" gera cobrança sem passar por um
  documento de venda separado), não há arquétipo pronto; a UI teria que continuar gerando uma linha em
  `sales` para reusar o corpus — restrição de modelagem operacional, não só de contabilidade.

---

## 4. (d) O que o time-to-first-ECD exige do onboarding hoje — e o que falta (evidência no wizard)

Fluxo lido em `InterviewService.ts` (linhas 47-106) + `PresetMatcher.ts` (linhas 9-97) +
`StageHandlers.ts` (linhas 12-122):

1. `InterviewService` conduz o diálogo, chama `PresetMatcher.findMatchingPreset` (IA escolhe a `key`
   do preset, `PresetMatcher.ts:19-73`) e, ao confirmar, retorna `{ nextStage: 'COMPLETED', presetKey }`
   (`StageHandlers.ts:78,96,117`) — **isso instala as tabelas DynamicTable do preset** (fora do escopo
   lido nesta sessão o passo exato de materialização, mas o contrato de retorno da wizard não carrega
   nenhum campo relativo a contabilidade: sem `unitId` de contabilidade, sem `AccountingScope`, sem
   período).
2. **Plano de contas**: não existe nenhum passo de seed explícito em nenhum controller de onboarding —
   grep exaustivo por `ChartOfAccountsFixture`/`CANONICAL_ACCOUNTS` no repo (19 arquivos) mostra que o
   único ponto de escrita é `PostingService.ensureChartOfAccounts` (`PostingService.ts:114-139`),
   chamado **de dentro do próprio `postEntry`** (verificado pela docstring da função, linha 102-113: "
   Idempotently ensure the canonical chart of accounts exists for the scope"). Ou seja: **o plano de
   contas de um tenant novo só existe depois do PRIMEIRO lançamento bem-sucedido** — não há passo de
   onboarding que o antecipe.
3. **Período contábil**: `PeriodService.seedYear` (`PeriodService.ts:33-40`) é o único ponto que cria
   `AccountingPeriod` rows, exposto pela rota `POST /accounting/{unitId}/periods/seed-year`
   (`accountingController.ts:480-500`, doc-comment "`201: Periods seeded`"). **Não há chamada
   automática a essa rota em nenhum lugar do fluxo de interview/onboarding verificado nesta sessão** —
   é uma ação que depende do frontend/humano abrir a aba de Contabilidade e disparar o seed. Sem
   período `OPEN`, `PostingService` lança `AccountingPeriodNotOpenError`
   (`PostingService.ts:96-99`) — ou seja, **nenhuma venda finalizada posta em contabilidade até esse
   passo manual acontecer**, mesmo no vertical 1 hoje.
4. **Consequência para *time-to-first-ECD*:** o relógio da métrica, se cravado no fim do wizard
   (`COMPLETED`), mede um intervalo que inclui um degrau manual não documentado no wizard
   (seed-year) e um efeito colateral lazy (chart of accounts) — nenhum dos dois é parte do onboarding
   propriamente dito. **Isso não é um gap introduzido pelo vertical 2 — é um gap PRÉ-EXISTENTE do
   vertical 1** que a prova de P2 vai herdar e medir junto, distorcendo a métrica se não for isolado.

**O que falta, objetivamente, para o time-to-first-ECD ser medível sem ruído do gap acima (proposta
técnica, não decisão):**

- Um passo explícito (produto ou runbook) que, ao fim do wizard, dispare `seedYear` para o ano corrente
  E force um primeiro `ensureChartOfAccounts` (ex.: um lançamento de abertura de saldo, ou apenas expor
  a rota de seed como parte do checklist pós-onboarding) — sem isso, T0 real da métrica é ambíguo entre
  "fim do wizard" e "primeira venda finalizada com sucesso contábil".
- Decidir, antes de instrumentar F-P2-4(b), qual evento marca T0 — o achado de §2 (F-P2-4) já registra
  que nenhum evento de "sistema pronto" é persistido hoje.

---

## 5. (e) Veredito com emendas (parecer de arquitetura — não ratifica fork nenhum)

**Veredito geral:** o PRE-ADR de P2 está corretamente ancorado na tese e coerente com as decisões
travadas (T3/T10 do master map) — não abre nenhuma torre nova, não reabre o Motor de Regras (§4), e
condiciona corretamente sua entrada a ADR-P1 Accepted + golden test verde. **Como parecer de domínio,
recomendo três emendas ao texto antes de qualquer ratificação de fork**, todas de precisão, nenhuma de
mérito:

1. **Emenda ao §2.2 (prova de saída):** substituir a frase única "`git diff` do motor/ledger/intérprete
   é vazio" pela tabela de §1.5 deste parecer (ou equivalente) — nomeando explicitamente
   `dynamicTablesController.ts` e `lib/factory.ts` como dentro ou fora do escopo, e resolvendo a
   ambiguidade "núcleo estrito" vs "`features/accounting/sync/**` incluído". Sem essa emenda, a prova
   de saída aceita um resultado que não testa o que P2 diz testar (achado §1.2/§1.3).
2. **Emenda ao F-P2-1:** registrar explicitamente que os arquétipos de reconhecimento/liquidação/
   estorno **já reusariam hoje** por formato de tabela (achado §3) — o que significa que, se a
   ratificação escolher (a), a prova de saída deve rodar em modo que EXCLUA os mappers `Salon*`
   atuais (força uso do binding de P1), senão o resultado "zero-diff" é trivialmente verdadeiro
   independente de P1 ter sido bem-sucedido.
3. **Emenda ao §6 (próximos passos de governança):** adicionar, antes do item 1 ("ratificar F-P2-1
   agora"), um passo "0: fechar a definição de escopo do diff (emenda 1)" — ratificar o setor sem
   antes fechar o que "zero-diff" significa é ratificar cedo demais o único fork que o próprio PRE-ADR
   já reconhece como "pode ser cedo" (`ADR-P2-second-vertical.md:6`), correndo o risco de precisar
   reabrir a decisão quando a prova for escrita.

**Achado adicional para registrar (fora do escopo de decisão de P2, mas relevante para P1):** a lacuna
de comissão (§3) e a imprecisão "papel→conta = padrão INCR-9" (ADR-P1 §4 ponto 2, `ADR-P1-binding-press.md:71`)
merecem nota — verificado por grep que não existe hoje nenhum conceito de "papel de conta" no código
(`AccountRole`/`accountRole`) fora de um comentário de teste; INCR-9 (per `ACCOUNTING-MASTER-MAP.md:266`)
é o mapeamento Account→código RFB (eixo de compliance), um mecanismo DIFERENTE de "papel→conta por
tenant" que F-P1-5 propõe. Isso é um achado sobre P1, registrado aqui porque §6.2 do PRE-ADR de P2 pede
parecer "quando o preset do setor esboçar contas novas por papel" — o mecanismo de papel ainda não
existe em nenhuma forma no código, então qualquer preset do vertical 2 que dependa dele depende de algo
que P1 ainda vai criar do zero, não de um padrão já provado.

---

## 6. Grau de evidência (auto-avaliação, T2/T8)

- Todos os claims de código neste parecer são **verificados** (Read/Grep executados nesta sessão, não
  memória). Nenhum claim comportamental se apoia só em texto do PRE-ADR.
- **Caso adversarial tentado:** procurei ativamente uma chamada automática de `seedYear` ou de
  `ensureChartOfAccounts` disparada pelo próprio fluxo de interview/preset-install (o que teria
  invalidado o achado de §4) — grep exaustivo por `seed`/`ensureSeeded`/`bootstrapChart`/
  `CANONICAL_ACCOUNTS` fora de `features/accounting` não encontrou nenhum ponto de chamada externo;
  a única invocação de `ensureChartOfAccounts` é interna a `PostingService`. Resultado: achado se
  sustenta.
- **Viés a declarar:** a leitura da árvore de `dynamicTables` e dos bridges foi guiada pelo próprio
  corpus que ADR-P1 já cita — não fiz uma varredura independente de TODO o `server/src` procurando
  outros pontos de acoplamento vertical-específico fora de `features/accounting`/`dynamicTablesController.ts`/
  `factory.ts`; é possível que exista mais algum ponto de acoplamento não coberto por este parecer
  (ex.: em rotas de relatório, em serviços de CRM). Declarado como **não-exaustivo** fora do que foi
  listado.
