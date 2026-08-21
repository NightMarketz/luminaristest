> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Dossiê técnico — Prova do Segundo Vertical (P2)

> Lê `docs/adr/ADR-P2-second-vertical.md` (F-P2-1..4 abertos), `docs/adr/ADR-P1-binding-press.md`
> (a prensa da qual P2 depende), `docs/ROADMAP-PLATAFORMA.md` Parte B (Fases P1/P2), e
> `docs/accounting/ACCOUNTING-MASTER-MAP.md` §1/§2/§4. Nenhum fork é decidido aqui — cada seção que
> depende de F-P2-1 (barbearia × clínica estética) é escrita **por opção**, sem escolher.
>
> **Grau de evidência:** todo claim sobre código carrega citação `arquivo:linha` lida nesta sessão
> (Read/Grep). Onde a análise depende de código que **ainda não existe** (o intérprete/binding da
> prensa — P1 não implementado), isso é dito explicitamente como **inferido/assumido**, nunca
> apresentado como verificado.

---

## 0. Achado prévio que reformula o resto do dossiê (verificado)

Antes de entrar nas 5 partes pedidas, um achado de leitura muda o formato da resposta: o **preset
`beautySalon` já se anuncia à IA de matching como cobrindo barbearia e clínica estética**, sem
nenhuma tabela ou campo dedicado a essas variantes:

```
server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts:17
"Um sistema completo de gestão para negócios na área da beleza, como salões, barbearias,
clínicas de estética ou spas. [...] Inclui tabelas para: Clientes [...] Serviços [...]
Agendamentos [...] Produtos [...] Vendas [...] e Funcionários [...]"
```

E o registro de presets tem **exatamente uma entrada** hoje:

```
server/src/features/dynamicTables/presets/index.ts:19-26
export const tablePresetSuites = {
  services: { beautySalon: BeautySalonPreset },
  sales: { crmModule: CrmModulePreset },
};
```

Consequência: se F-P2-1 escolher **barbearia**, é plausível que a "prova" de P2 não precise sequer de
um preset novo — o `PresetMatcher` (`server/src/features/interview/InterviewService/PresetMatcher.ts:19-74`)
já resolveria uma descrição de barbearia para `beautySalon` hoje, sem ratificar fork nenhum e sem P1.
Isso não decide F-P2-1 — mas é um dado que o dono precisa ver antes de decidir, porque muda o que
"provar a prensa" significa na prática (ver §2 e a pergunta aberta OQ-1).

---

## (a) Comparativo POR OPÇÃO — barbearia × clínica estética

Baseline: as 17 tabelas de `BeautySalonPreset` (`server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts:34-53`):
`customers, suppliers, services, packages, products, productUnits, appointments, sales, saleItems,
goals, reports, campaigns, expenses, otherRevenues, financialBaselines, stockMovements, commissions`.

### Opção (i) — Barbearia

| Tabela/campo do preset | Muda? | Evidência |
|---|---|---|
| `services` (`ServiceModule.ts:17-43`) | **Fica** — `category` é `string` livre (`ServiceModule.ts:29-33`, sem enum); "Corte", "Barba", "Sobrancelha" são só valores de dado, não schema | Zero diff de schema |
| `products`/`productUnits` (`ProductModule.ts:17-100`) | **Fica** — pomadas/óleos/lâminas são catálogo, mesma shape (`sku`, `category` string livre, `salePrice`) | Zero diff |
| `appointments` | **Fica** — agenda por funcionário+serviço é o mesmo shape (não lido campo a campo nesta sessão; não referenciado por nenhum mapper contábil, então fora do caminho crítico da prova) | Não lido — marcar como não verificado se entrar no escopo |
| `customers` (`CustomerModule.ts:26-93`) | **Fica** — identidade fiscal + LGPD + CRM lifecycle já genérico, nada específico de estética | Zero diff |
| `packages` (`PackageCatalogModule.ts:15-46`) | **Fica** — "pacote de 5 cortes" é o mesmo objeto que "pacote de 5 sessões" | Zero diff |
| `commissions` (`CommissionsModule.ts:8-52`) | **Fica** — comissão por barbeiro/serviço é o mesmo modelo que por profissional de salão | Zero diff |
| `expenses`/`stockMovements` | **Fica** — genéricos | Zero diff |
| **Preset novo (arquivo)?** | **Provavelmente NÃO precisa** — `PresetKnowledgeBase.ts:17` já cobre "barbearias" no texto do matcher; não há tabela/campo que uma barbearia precise e o salão não tenha | Ver §0 |

**Leitura:** a barbearia é o **anel mais próximo possível** — tão próximo que talvez nem seja preset
novo, e sim o mesmo preset com catálogo (dado de tenant, não código) diferente. Se F-P2-1 escolher
este anel, a "prova de saída" (ADR-P2 §2.1) pode ficar mais fraca como demonstração de fábrica
(nenhum preset novo é gerado) — ou mais forte como prova de zero-diff (é o caso mais difícil de
falhar). Os dois lados são reais; não decido qual pesa mais.

### Opção (ii) — Clínica estética

| Tabela/campo do preset | Muda? | Evidência |
|---|---|---|
| `services` | **Fica** na forma; category livre cobre "Limpeza de Pele", "Peeling" etc. | `ServiceModule.ts:29-33` |
| `products` | **Fica** — cosméticos/insumos são catálogo | `ProductModule.ts:17-62` |
| `customers` — **campo clínico ausente** | **Muda** (candidato) — hoje não há nenhum campo de anamnese/contraindicação/termo de consentimento; `CustomerModule.ts:26-93` só tem identidade fiscal+LGPD+CRM, sem `healthNotes`/`consentSignedAt`/similar | Verificado por leitura integral do módulo — **campo não existe** |
| `packages` | **Fica** — "pacote de 5 sessões de peeling" é o mesmo objeto | Zero diff |
| `qualifiedEmployees` em `services` (`ServiceModule.ts:9,39`, campo importado de `../../fields`) | **Fica** na forma; pode precisar de dado de credencial (ex.: registro profissional) se o procedimento for regulado — não é diff de schema, é dado a preencher | Não lido o field preset `qualifiedEmployees` — não verificado se já carrega esse subcampo |
| **Diff provável** | Campo(s) novo(s) em `customers` (ficha clínica) — via `FieldCustomizationService` (customização de sessão, `server/src/features/interview/README.md:65-71`) OU via edição direta do módulo canônico | Ver §2 — este é o único ponto do comparativo onde um diff de **preset** é esperado, não acidental |

**Leitura:** a clínica estética é o anel que testa a customização de **campo**, não só de tabela — é
o caso que exercita `FieldCustomizationService`/re-compilação do binding (invariante 4 do ADR-P1,
`ADR-P1-binding-press.md:73`) de um jeito que a barbearia não exercita. Se o objetivo de P2 é provar
que a prensa absorve customização de campo (não só troca de catálogo), este anel é o mais informativo
— mas também o que mais risco carrega de "nascer arquétipo novo" (não-objetivo do ADR-P2 §4).

### Arquétipos contábeis que CADA opção reusa (cruzado com os mappers reais)

Nenhuma das duas opções precisa de arquétipo contábil novo — ambas passam pelas mesmas 5 classes de
evento já mapeadas (`server/src/features/accounting/sync/mappers/`), porque ambas continuam vendendo
"serviço com ou sem produto" pela mesma tabela `sales`/`saleItems`:

| Evento (`sourceType`) | Mapper (arquivo:linha) | Lançamento | Vale para barbearia? | Vale para clínica? |
|---|---|---|---|---|
| `salon.sale.finalized` | `SalonSaleFinalizedMapper.ts:18-66` | D 1.1.2 / C 3.1+3.3 (split via `revenueSplit.ts:32-56`) | Sim — corte=serviço(3.1), pomada=revenda(3.3) | Sim — procedimento=serviço(3.1), cosmético=revenda(3.3) |
| `salon.sale.settled` | `SalonSaleSettledMapper.ts:23-103` | D conta-por-`paymentMethod` / C 1.1.2 | Sim — mesmo mapa `Cash/Pix/Debit/Credit/Package Balance` (linhas 36-42) | Sim |
| `salon.sale.returned` | `SalonSaleReturnedMapper.ts:17-61` | D 3.2 / C 1.1.2 | Sim | Sim |
| `salon.package.sold` | `SalonPackageSoldMapper.ts:17-57` | D 1.1.2 / C 2.1.1 | Sim (pacote de cortes) | Sim (pacote de sessões) |
| `salon.sale.cogs` | `SalonSaleCogsMapper.ts:25-65` | D 4.2 / C 1.1.6 | Sim, só nas linhas com `productId` | Sim, idem |

A classificação `serviceReais`/`productReais` que alimenta o split 3.1×3.3 vem do
**tipo de linha da venda**, não do setor — `salonSaleItems.ts:71-89` decide por `productId`/`serviceId`/
`packageId` na própria linha, então qualquer preset que reuse `sales`/`saleItems` com esse shape herda
o split de graça. **Isto vale hoje, sem P1** — é o mesmo achado do §0: os mappers e a bridge
(`SalonSalesAccountingBridge.ts:54-56`) resolvem a tabela por `internalName==='sales'`, não por preset
key, então a ligação contábil já é setor-agnóstica para quem reusa esse internalName.

---

## (b) Definição operacional de "`git diff` vazio"

### Paths que compõem motor/ledger/intérprete (verificados por leitura da árvore)

```
== features/dynamicTables (o "motor") ==
server/src/features/dynamicTables/
├── README.md, docs/, __tests__/
├── dtos/         (validação Zod das tabelas dinâmicas)
├── models/       (ITableSchema, DynamicTable.model)
├── policies/     (RBAC do motor)
├── repositories/ (persistência genérica de linhas)
├── rules/        (RuleContext/RulePlugin — o "motor de regras" já existente do próprio DynamicTable)
├── services/     (DynamicTableService)
├── utils/        (TableFactory etc.)
└── validation/
   — presets/ e ai/ ficam DE FORA deste conjunto (ver "paths onde diff é esperado", abaixo)

== features/accounting núcleo (o "ledger") ==
server/src/features/accounting/
├── models/       (Account, JournalEntry, Posting, Period, ...)
├── policies/
├── repositories/
├── scope/        (AccountingScope)
├── services/      (PostingService, PeriodService, AuditService, ExerciseClosingService, SpedGenerationService, reports)
├── dtos/
└── audit/
   — sync/ fica DE FORA deste conjunto (bridges+mappers — ver abaixo)

== "intérprete" (P1) ==
Ainda NÃO existe em código — nasce com o ADR-P1 no pipeline de geração
(`features/interview/*`/`presets/*`), ao lado de `PresetMatcher`/`CustomizationService`
(ADR-P1-binding-press.md:81-82). Por isso este dossiê não pode enumerar paths do intérprete por
leitura — só pode dizer ONDE ele deve nascer (ADR-P1 §4 invariante 6) e onde NÃO pode (accounting/,
motor). Tratar como **assumido**, não verificado.
```

### Paths onde diff É esperado (não conta contra a prova)

| Path | Por quê é esperado |
|---|---|
| `server/src/features/dynamicTables/presets/systems/*.ts` (preset novo, se F-P2-1(a)-clínica ou qualquer outra opção exigir tabela/campo novo) | É o preset do setor — objeto central da prova (ADR-P2 §1) |
| `server/src/features/dynamicTables/presets/index.ts:19-26` | Registrar a nova chave em `tablePresetSuites` |
| `server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts:13-19` | Nova entrada de conhecimento para o `PresetMatcher` — **só se** a opção escolhida não reusar `beautySalon` (ver §0) |
| Binding compilado do vertical (formato ainda em fork F-P1-2 — `ADR-P1-binding-press.md:109`) | É o artefato central de P1/P2; onde ele mora depende de F-P1-2 |
| Fixtures de chart **por papel**, se F-P1-5(a) exigir conta nova (ADR-P2 §1: "contas novas no chart via papel") | `ChartOfAccountsFixture.ts` já é fixture única compartilhada — uma conta nova aqui é esperada SE o vertical precisar de um papel que o salão não usa; nenhuma das duas opções do comparativo (a) parece exigir isso hoje |

### Paths que devem ficar em ZERO diff (o motor/ledger/intérprete)

Achado adicional (verificado): mesmo **sem P1**, os pontos de integração já são genéricos por
`internalName`, não por preset key:

```
server/src/controllers/dynamicTablesController.ts:119-121,148-149
  await maybeSyncSalonSaleFinalized(ctx, req.params.tableId, created);
  await maybeSyncSalonPackageSold(ctx, req.params.tableId, created);
  await maybeSyncSalonSaleSettled(ctx, req.params.tableId, created);
```
— chamado incondicionalmente em TODO create/update de linha de qualquer tabela dinâmica; cada bridge
se autolimita por `findTableByInternalName(actor.userId, 'sales')` (`SalonSalesAccountingBridge.ts:54-56`).
E os mappers são fiados por `sourceType`, não por preset, em `server/src/lib/factory.ts:403-407`.

Consequência prática: **para a opção barbearia (reusa `sales`/`saleItems`/`expenses` com o mesmo
shape), `server/src/controllers/dynamicTablesController.ts`, `server/src/features/accounting/sync/**`
e `server/src/lib/factory.ts` também devem ficar em zero diff HOJE — antes mesmo de P1 existir.** Isso
é uma pista de que a prova "zero diff no motor/ledger" pode já ser demonstrável parcialmente sem
esperar P1, mas **não decido** se isso substitui ou antecede a prova formal do ADR-P2 (é pergunta para
o dono — OQ-1).

### Comando de `git diff` proposto

Assumindo o repositório com um commit "antes" (`BASE`) e um "depois" (`HEAD`) do vertical 2:

```bash
git diff BASE..HEAD -- \
  server/src/features/dynamicTables/dtos \
  server/src/features/dynamicTables/models \
  server/src/features/dynamicTables/policies \
  server/src/features/dynamicTables/repositories \
  server/src/features/dynamicTables/rules \
  server/src/features/dynamicTables/services \
  server/src/features/dynamicTables/utils \
  server/src/features/dynamicTables/validation \
  server/src/features/accounting/models \
  server/src/features/accounting/policies \
  server/src/features/accounting/repositories \
  server/src/features/accounting/scope \
  server/src/features/accounting/services \
  server/src/features/accounting/dtos \
  server/src/features/accounting/audit \
  server/src/features/accounting/sync \
  server/src/controllers/dynamicTablesController.ts \
  server/src/lib/factory.ts
```

Saída vazia (`git diff --stat` = 0 arquivos) é a prova de saída #2 do ADR-P2 (`ADR-P2-second-vertical.md:24-26`).
`sync/` e `dynamicTablesController.ts`/`factory.ts` entraram na lista por evidência de código (achado
acima), não por citação do ADR-P1 — **este dossiê propõe estendê-los à definição operacional**; cabe
ao parecer do `luminaris-accounting-architect` e à ratificação do dono confirmar ou rejeitar essa
extensão antes de travar o comando.

---

## (c) Roteiro numerado ponta-a-ponta

Agente = executável hoje ou com P1 implementado, sem intervenção humana no passo. Gate humano = exige
assinatura per `RUNBOOK-FORMAT.md`.

1. **[AGENTE]** Rodar a entrevista de onboarding. *Ressalva verificada:* a orquestração server-side
   (`server/src/features/interview/`) está **não-plugada** — sem controller/rota
   (`server/src/features/interview/README.md:16-21`); a lógica ativa vive no frontend
   (`my-app/features/interview/`, não lido campo-a-campo nesta sessão). O roteiro assume a versão
   frontend, que não foi auditada por este dossiê — **não verificado**.
2. **[AGENTE]** `PresetMatcher.findMatchingPreset` resolve a descrição do negócio para uma `key` de
   preset (`PresetMatcher.ts:19-74`). Se F-P2-1 = barbearia, plausivelmente resolve para `beautySalon`
   sem preset novo (§0).
3. **[AGENTE, condicional]** Se a opção escolhida exigir campo novo (ex.: clínica estética, ficha
   clínica em `customers`) — `FieldCustomizationService` processa a customização de campo
   (`server/src/features/interview/README.md:37,65-71`). Sob P1: esta customização vira **binding v1**
   e passa pelo validador determinístico antes de ativar (ADR-P1 §3 item 3, `ADR-P1-binding-press.md:63-64`).
4. **[AGENTE]** Instanciação do sistema: tabelas do preset (+ customizações) materializadas como
   `DynamicTable`s do tenant.
5. **[GATE HUMANO — leve]** Confirmação do tenant/dono de que o ERP instanciado reflete o negócio
   descrito (equivalente a um "aceite de onboarding"; não tem runbook formal hoje — candidato a nota
   no runbook da prova, §(d)).
6. **[AGENTE]** Operação do mês: lançar vendas (`sales`/`saleItems`), despesas (`expenses`), pacotes
   (`packages`) via a UI normal do ERP gerado — cada `Finalized`/`Paid`/`Returned` dispara os mappers
   do comparativo (a) por post-commit (`dynamicTablesController.ts:119-121,148-149`).
7. **[AGENTE]** Fechamento mensal de cada período tocado: `PeriodService.softClose`
   (`PeriodService.ts:72-104`, transição `OPEN → SOFT_CLOSED`) ou `hardClose`
   (`PeriodService.ts:104-135`, terminal). A prova deve decidir (pergunta aberta OQ-2) se usa soft ou
   hard close para os meses da fixture.
8. **[AGENTE]** No fim do exercício fiscal simulado: `ExerciseClosingService.closeExercise(scope, year)`
   (`ExerciseClosingService.ts:46`) posta o encerramento real (zera contas de resultado contra `2.3.1`).
   Pré-requisito conhecido: leitura de piso em 1º-jan do exercício (memória
   `accounting-apuracao-encerramento`) — a fixture precisa cobrir o ano-calendário inteiro, não só
   "alguns meses", ou o encerramento lê base incompleta.
9. **[AGENTE]** Geração do arquivo: `SpedGenerationService` → job `EXPORT_SPED_ECD`
   (`SpedGenerationService.ts:78,119,153`). Este é o "primeiro ECD" que fecha a métrica
   *time-to-first-ECD* (§e).
10. **[GATE HUMANO]** Import do arquivo `.txt` gerado no PVA oficial (RFB) — **fora do agente por
    natureza** (ferramenta desktop, não há API). Runbook H1 do `RUNBOOK-FORMAT.md:32` já existe para
    este gate no vertical 1; a prova do vertical 2 precisa da SUA PRÓPRIA execução (dado de tenant
    diferente), não reaproveita a evidência colada do H1 original. Ver §(d).
11. **[AGENTE]** Medir e registrar *time-to-first-ECD* — ver §(e) por opção de F-P2-4.
12. **[AGENTE]** Rodar o `git diff` de §(b) e colar o resultado (vazio ou não) no relatório da prova.
    Diff não-vazio nos paths do motor/ledger vira lacuna e volta ao P1 (sessão de instrumentação →
    correção), conforme ADR-P2 §2.2 (`ADR-P2-second-vertical.md:25-26`) — **não** é "ajuste" da prova.

---

## (d) Esboço do runbook em branco da prova (formato `RUNBOOK-FORMAT.md`)

Segue o formato de `docs/operating-manual/RUNBOOK-FORMAT.md:42-74` **sem preencher evidência**. Não é
um dos 5 runbooks já catalogados na tabela de `RUNBOOK-FORMAT.md:28-36` (H1/H2/M2/X1/X2) — é um
runbook **novo**, específico da prova P2; proponho o ID `P2-1` para o item 10 do roteiro (import PVA
do vertical 2), reservando `P2-2` caso F-P2-2 escolha tenant real (reabre oráculo de dado real, ADR-P2
§3 linha F-P2-2). **A criação formal deste ID na tabela de `RUNBOOK-FORMAT.md` é decisão do dono**, não
deste dossiê.

```
# RUNBOOK: [P2-1 — Sign-off PVA do vertical 2 (setor: ___ , decidido por F-P2-1)]

Executor: [nome — humano]           Data: [____]
Autorização: [ratificação de F-P2-1..4 pelo dono + doc/data]
Pré-condições: [
  "ADR-P1 Accepted + implementado + golden test byte-idêntico verde (commit ___)",
  "preset do vertical 2 instanciado (tenant-fixture ___, se F-P2-2(a))",
  "lançamentos do mês de fixture postados (período ___ SOFT/HARD_CLOSED)",
  "ExerciseClosingService.closeExercise executado para o ano ___ (entry id ___)",
  "arquivo ECD gerado (job EXPORT_SPED_ECD, artefato ___)"
]

## Passos

1. Rodar `git diff` conforme comando do §(b) deste dossiê, entre o commit anterior ao vertical 2 e o
   commit corrente.
   Resultado esperado: 0 arquivos alterados nos paths listados.
   EVIDÊNCIA: [colar saída do comando aqui]

2. Registrar o timestamp de início do onboarding (T0) e o timestamp de emissão do primeiro arquivo
   EXPORT_SPED_ECD válido (T1) — conforme opção de F-P2-4 escolhida.
   Resultado esperado: T1 − T0 = time-to-first-ECD, em [unidade].
   EVIDÊNCIA: [colar os dois timestamps + a subtração]

3. Importar o `.txt` do ECD gerado no validador PVA oficial da RFB.
   Resultado esperado: import sem crítica bloqueante (ou lista de críticas, se houver).
   EVIDÊNCIA: [colar tela/protocolo do PVA — nunca frase]

## Desfecho (marcar UM)
[ ] PASSOU — diff vazio + PVA sem crítica bloqueante + métrica registrada
[ ] FALHOU — passo __ divergiu; [se diff não-vazio: listar os arquivos fora do escopo]
[ ] BLOQUEADO — pré-condição __ não se sustentava (ex.: P1 ainda não implementado)

## Registro
- Achados no caminho: [lista ou "nenhum"]
- Atualização do artefato de rastreio: docs/adr/ADR-P2-second-vertical.md (linha de status) +
  docs/accounting/ACCOUNTING-MASTER-MAP.md (nó do grafo, se promovido)
- Assinatura do executor: ____________
```

---

## (e) Medição de *time-to-first-ECD* — por opção de F-P2-4

| | (a) Runbook manual | (b) Instrumentação no produto |
|---|---|---|
| **Como mede** | Executor humano anota T0 (início da entrevista, passo 1 do roteiro) e T1 (arquivo `EXPORT_SPED_ECD` emitido, passo 9) manualmente no runbook `P2-1` (§d, passo 2) | Timestamp automático: gravar `createdAt` do início de sessão do `InterviewService`/frontend equivalente como T0, e o `createdAt` do primeiro job `kind='EXPORT_SPED_ECD'` bem-sucedido (`SpedGenerationService.ts:119,153`) como T1; calcular a diferença em um relatório/rota nova |
| **Onde o código viveria (se (b))** | N/A | Fora dos paths de §(b) que devem ficar em zero diff — tocaria `features/interview/*` (onboarding) e possivelmente um novo consumidor de `Job`/`SpedGenerationService` (leitura, não escrita do núcleo). **Não violaria a prova de zero-diff do motor/ledger por si só**, mas é código de produto novo, não é "preset+binding" — teria seu próprio incremento e ADR pequeno (fora do escopo desta prova) |
| **Custo de acerto** | Baixo — reusa o formato já existente de runbook, uma prova única | Mais alto — exige decidir onde persistir os dois timestamps por tenant, e só compensa com >1 tenant medindo |
| **Recomendação do ADR-P2 (não-vinculante, para contexto)** | (a) — `ADR-P2-second-vertical.md:40`: "para a prova única; (b) só quando houver mais de um tenant medindo — YAGNI antes disso" | — |
| **Este dossiê acrescenta** | A opção (a) tem um ponto cego verificável: T0 "início da entrevista" depende de qual camada é o roteiro real (frontend, não auditado — achado do passo 1 de §c). Antes de travar T0 operacionalmente, confirmar em qual evento do frontend a entrevista de fato começa (pergunta OQ-3) | — |

---

## Perguntas em aberto (só o dono responde)

1. **OQ-1** — O achado do §0 (o `PresetMatcher` já resolveria "barbearia" para `beautySalon` sem preset
   novo, hoje, sem P1) enfraquece ou não a prova de F-P2-1(a)-barbearia como demonstração de "fábrica
   gerando vertical novo"? Se enfraquecer, a prova pode precisar exigir explicitamente um preset com
   **alguma** diferença de forma (o que empurra para a opção clínica estética, ou para uma barbearia
   com uma customização deliberada) — decisão do dono, não deste dossiê.
2. **OQ-2** — O roteiro (c) passo 7 assume fechamento mensal via `softClose`. A prova deveria travar em
   `SOFT_CLOSED` (reabrível) ou `HARD_CLOSED` (terminal) para os meses da fixture? Nenhum dos dois documentos-fonte decide isso.
3. **OQ-3** — Confirmar qual evento do frontend (`my-app/features/interview/**`, não auditado nesta
   sessão) marca T0 da métrica *time-to-first-ECD* antes de travar o runbook `P2-1`.
4. **OQ-4** — Este dossiê propõe estender a lista de paths "zero diff obrigatório" (§b) além do que o
   ADR-P2 cita literalmente (motor/ledger/intérprete) para incluir `dynamicTablesController.ts` e
   `lib/factory.ts`, por evidência de que a integração já é genérica por `internalName`. Essa extensão
   deveria entrar no `ADR-P2-second-vertical.md` como emenda antes da prova rodar, ou fica só como nota
   deste dossiê?
5. Todos os forks F-P2-1..4 do `ADR-P2-second-vertical.md:35-40` seguem **abertos** — este dossiê não
   ratifica nenhum; é insumo para o parecer do `luminaris-accounting-architect` e para a decisão do dono.
