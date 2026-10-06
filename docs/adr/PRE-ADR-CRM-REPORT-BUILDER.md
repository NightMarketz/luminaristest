# PRE-ADR-CRM-REPORT-BUILDER — Builder de relatórios/dashboards self-service do CRM: abertura do nó CRM-RB

- **Data:** 2026-10-06
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork novo decidido aqui; nenhum código autorizado.
- **Autorização:** dono, chat, 2026-10-06: *"Autorizo escrever o PRE-ADR do CRM-RB — sem 'executa'"* (ratificado com
  *"Dispara em sequencia aqui tudo em opus medio"*). Cobre **só** este PRE-ADR. Não cobre código, BRIEF novo, emenda do
  BRIEF nem ratificar fork.
- **Por que existe:** o [`README` do vault](../plano/README.md) exige PRE-ADR ratificado antes de nó novo em `nos/`. O
  [[CRM-RB]] nasceu em 26/09 por instrução, com autorização citável mas sem PRE-ADR; o dono decidiu em 26/09
  (AskUserQuestion) que o nó segue `planned` e que o PRE-ADR é passo próprio, antes do "executa". Este é esse passo.
- **Nó:** [[CRM-RB]] · **BRIEF:** [`BE-INCR-CRM-REPORT-BUILDER-brief.md`](../crm/BE-INCR-CRM-REPORT-BUILDER-brief.md)
  (PR #395, mergeado 26/09; emenda F-RB8 no PR #448, mergeado 29/09).
- **ADR vizinho:** [`ADR-ANALYTICS-DEFS-write-unblock`](ADR-ANALYTICS-DEFS-write-unblock.md), F-AD5 → (b) builder dedicado
  (emenda de 26/09). F-AD0 = (c) continua congelado.
- **Autor:** `sessao-planejamento` (agente, Opus médio). Lido em `origin/main` `76d1a432`.

## TLDR

O desenho do builder já está fechado no BRIEF: 7/7 forks F-RB1..F-RB7 ratificados em 26/09 e o F-RB8 (moeda) decidido em
29/09. Este PRE-ADR não reabre nada disso. Ele faz três coisas: **(1)** confirma no código que a fronteira está certa (a
definição salva e a tabela de taxas são Prisma, o relatório só **lê** linhas DynamicTable por um serviço de aplicação, e
nenhum serviço Prisma entra no motor); **(2)** leva ao dono três perguntas abertas (perfil de execução, fatiamento em PRs e
o valor de pipeline do §4.2); **(3)** registra cinco achados de código que o BRIEF precisa absorver antes do "executa".
**Risco principal:** o motor de agregação aceita `sort.by: 'measure'` e ignora (ordena sempre pelo nome), e carrega a
tabela inteira na memória antes de qualquer teto. Os dois afetam itens já ratificados (contrato do spec e F-RB5).

## 1. Fronteira DynamicTable × Prisma — confirmada no código

Pergunta do CLAUDE.md (STOP): onde o módulo mora, e alguma peça injeta serviço Prisma no motor DynamicTable?

| Peça | Camada | Evidência (lida nesta sessão) | Grau |
|---|---|---|---|
| `CrmReportDefinition` (definição salva) | Prisma first-class (F-RB1 = (a), ratificado 26/09) | Precedentes do mesmo shape já em Prisma: `SavedTableView` (`server/prisma/schema.prisma:74`, `tableId` sem FK, `config Json`) e `DashboardLayout` (`schema.prisma:109`). O único precedente DynamicTable (`analyticsDefinitions`) é tabela `system`, read-only para todos: `DynamicTablePolicy.ts:40-42` (`presentation === 'system'` → `false`) | verificado |
| `PtaxRate` (cotação do BCB) | Prisma first-class, global, em `server/src/features/fx/` (§1.1 do BRIEF, por regra) | Precedente global sem `userId`: `ReferentialAccount` (`schema.prisma:533`). `features/fx/` ainda não existe (`ls`); nenhum `CrmReport`/`PtaxRate` em `server/src` (grep) | verificado |
| Linhas lidas pelo relatório (`leads`, `crmOpportunities`…) | DynamicTable — o builder só **lê** | `DynamicTableService.getAllTableData(user, tableId)` (`DynamicTableService.ts:628-631`) passa pelo `getTableById` (checa permissão) e devolve as linhas | verificado |
| `CrmReportService` (novo) | serviço de aplicação no CRM, **fora** do motor | Molde vivo: `CrmAnalyticsService` recebe `DynamicTableService` + `IDynamicTableRepository` no construtor (`CrmAnalyticsService.ts:36-39`) e chama o `AggregatePipelineProcessor` com um contexto montado por ele (`:60-72`). A direção é CRM → motor, a permitida | verificado |
| O motor | **intocado** | Construtor do `DynamicTableService` = `repository`, `policy`, `knowledgeGraphService?` (`DynamicTableService.ts:54-58`). O BRIEF não injeta nada ali, não cria `RulePlugin` nem mexe no `RuleContext`. O único import de fora do motor no serviço é o `kpiCacheService` de analytics (`:14`), pré-existente | verificado |

**Conclusão:** nenhum anti-padrão do §2.1 do Contrato. Serviço Prisma não entra no motor, o `DynamicTableService` não é
modificado para integrar módulos, e nenhuma entidade com invariante vira linha DynamicTable (a `PtaxRate` foi justamente
tirada do motor pelo `@@unique` de idempotência, BRIEF §8).

**Caso adversarial tentado:** "o widget do dashboard (F-RB2, item 12) valida o `reportId` no serviço". Se a validação
morar no `DashboardLayoutService`, nasce a dependência `dashboardLayout → crm`. Não é o motor, então não é STOP, mas é
acoplamento que o BRIEF não pediu. O DTO do layout aceita `widgetConfig: z.any()` (`DashboardLayoutDto.ts:44`) e o próprio
item 12 testa o erro no `run` ("widget com `reportId` apagado → erro nomeado"). **Leitura recomendada para a sessão de
feature:** a validação mora em `CrmReportService.run`, e o `dashboardLayout` não importa nada do CRM. Não é fork novo: é
a leitura de menor acoplamento de um item já ratificado. Se o dono quiser a validação no salvamento do layout, aí sim vira
pergunta.

**ADMIN rodando relatório alheio (F-RB4 = (c), item 3):** funciona sem se passar pelo dono. A tabela é resolvida por
`findTableByInternalName(report.userId, …)` (o mesmo método de `CrmAnalyticsService.ts:42`), e a leitura passa no
`canView` porque o ADMIN já vê qualquer tabela (`DynamicTablePolicy.ts:13-14`). Grau: leitura verificada; comportamento
inferido (sem teste).

## 2. Achados de código que o BRIEF precisa absorver (antes do "executa")

Nenhum reabre fork ratificado. Todos mudam **como** um item ratificado se cumpre.

| # | Achado | Evidência | Grau | Item afetado |
|---|---|---|---|---|
| A1 | **`sort.by` e `sort.key` são aceitos e ignorados.** O agregador ordena sempre pelo nome do ponto e só respeita `dir`. O `ReportSpecSchema` do BRIEF aceita `by: 'measure'`, ou seja, parâmetro aceito e ignorado (memória `param-aceito-e-ignorado-e-bug`). Isso responde à dúvida do BRIEF §6 ("confirmar se aplica `sort`/`limit`"): `limit` sim, `sort` só por nome | `Pipeline.ts:58-62` (`Sort = {by, key?, dir?}`); `AggregatePipelineProcessor.ts:420-428` (`results.sort((a, b) => a.name.localeCompare(b.name))`) | verificado | §3 (contrato) e item 7 |
| A2 | **A tabela inteira vai para a memória antes de qualquer teto.** `findAllDataByTableId` é `findMany` sem `take`. Se o teto do F-RB5 for checado depois da carga, o 422 sai depois do custo que ele deveria evitar. Já existe leitura em lotes, `getTableDataStream` (`DynamicTableService.ts:633-636`), que permite parar em `teto + 1` sem tocar o motor | `DynamicTableRepository.ts:131-135`; `DynamicTableService.ts:628-631` | leitura verificada; custo inferido | item 9 (F-RB5) |
| A3 | **Join com tabela não instalada devolve vazio em silêncio** no molde atual: o `fetchByPresetTableKey` do `CrmAnalyticsService` devolve `rows: []` quando a tabela não existe. Copiar esse molde no `CrmReportService` traz de volta a classe E8 ("descarta em silêncio") que o item 6 quer fechar. A fonte principal já lança `moduleNotInstalled` (`:43`); o join tem de fazer o mesmo | `CrmAnalyticsService.ts:68-71` | verificado | itens 5 e 6 |
| A4 | **A dimensão de período lê a data no fuso do servidor.** `formatPeriod` faz `new Date(...)` e usa `getFullYear`/`getMonth`/`getDate` locais. Data só-dia gravada como ISO UTC pode cair no dia ou mês anterior conforme o fuso do processo (memórias `motor-grava-date-como-iso-utc-scopeday-recua-um-dia` e `date-only-rendering-utc-shift-class-bug`). Pré-existente no motor; o builder herda a classe em "ganhos por mês" sobre `closedAt` | `AggregatePipelineProcessor.ts:64-90` | leitura verificada; efeito inferido (sem execução) | item 7 (teste com ISO real e servidor em `America/Sao_Paulo`) |
| A5 | **Linhas do schema citadas no BRIEF andaram.** `SavedTableView` 69 → **74**, `DashboardLayout` 104 → **109**, `ReferentialAccount` 516 → **533** | `schema.prisma` em `76d1a432` | verificado | só citação |

**Recomendação:** uma emenda curta do BRIEF, autorizada à parte, absorve A1–A3: tirar `by`/`key` do `sort` no v1 ou
implementar a ordenação por medida no serviço; teto por leitura em lotes; join com tabela ausente vira 4xx nomeado. A4 vira
um caso de teste do item 7. Este PRE-ADR **não** edita o BRIEF (fora da autorização).

## 3. Forks — RATIFICAÇÃO PENDENTE

### F-RBP1 — Perfil de execução: a regra 2 vale pela letra ou só para invariante?

A nota do nó prevê `opus-medio` "pela letra" da regra 2 e registra a ambiguidade. A taxonomia
(`.claude/agents/classificador.md:22-30`) aplica a **primeira regra que casar**:

- **Regra 1** ("com fork `PENDENTE` → `precisa-de-planejamento`"): pela letra, **casa**. O BRIEF ainda traz um item
  `⏳ PENDENTE` (§4.2, valor de pipeline). O próprio BRIEF diz que o §4.2 "não é deste nó" e "não bloqueia", então a
  leitura pelo objetivo não casa. A nota do nó não registrava esta segunda ambiguidade.
- **Regra 2** ("toca invariante contábil, fiscal ou financeiro (… ou BRIEF que cria/altera lançamento, tributo, saldo **ou
  migração de schema**)"): pela letra, **casa**. São duas migrações (`CrmReportDefinition`, `PtaxRate`). Pelo objetivo, não:
  o builder só lê, e a PTAX é exibição.
- **Regra 4** (mais de 8 itens, ou BE e FE juntos): casa, com 26 itens. Daria `sonnet-alto`.

| Caminho | Resultado | Custo |
|---|---|---|
| **(a)** letra: o parêntese da regra 2 lista "migração de schema" como gatilho próprio, e o §4.2 é declarado fora do nó (regra 1 não conta) | `opus-medio` | nenhum; é o que a nota já prevê |
| **(b)** objetivo: a regra 2 só vale com invariante | `sonnet-alto` (regra 4) | a migração SQLite não transacional e o job com rede externa ficam com o perfil mais barato |
| **(c)** emendar a regra no `classificador.md` para separar "migração" de "invariante" | depende da redação | mexe numa regra do dono por causa de um nó |

**Recomendação: (a).** A regra é do dono, e o parêntese nomeia a migração de forma explícita. Lê-la pelo "objetivo" seria
o agente reescrever a regra. As duas migrações têm risco próprio (memória `migracao-sqlite-nao-e-transacional`), e o job
da PTAX é o primeiro `fetch` do servidor a uma API pública (BRIEF §6). O *"tudo em opus medio"* de 06/10 vale para as
sessões disparadas hoje, não como perfil do executor; por isso a pergunta continua aberta. **Risco de viés:** a
recomendação coincide com o que a nota já diz (viés de confirmação). O que a sustenta é o texto do parêntese, não a nota.

### F-RBP2 — Fatiamento em PRs

O BRIEF já separa o item 16 (remover `custom-kpis`) num PR próprio. Os outros 25 itens cabem num PR só pelo texto.

| Caminho | PRs |
|---|---|
| **(a)** três PRs: **PR-1** `features/fx` (itens 20-23 e 26: `PtaxRate`, repositório, client, job); **PR-2** o builder (itens 1-15, 17-19, 24-25); **PR-3** remover `custom-kpis` (item 16) | 3 |
| **(b)** dois PRs: builder + fx juntos; `custom-kpis` à parte | 2 |
| **(c)** o builder sem conversão primeiro (itens 1-19); a conversão e o fx depois (20-26) | 3 |

**Recomendação: (a).** O PR-1 não depende de nada e tem a parte com rede externa e migração. Testado sozinho, ele chega
pronto para o item 24 do PR-2 e para o ADR de moeda que vai reusá-lo. (c) adia justamente a visão convertida que o dono
pediu em 29/09.

### F-RBP3 — Valor de pipeline (decisão ortogonal, BRIEF §4.2) — **não bloqueia este nó**

**Fato (relido nesta sessão em `76d1a432`, sem mudança desde 29/09):**

- **Visão geral:** `my-app/features/crm/hooks/useCrmData.ts:61-69` soma `leads.latestProposalAmount` de todo lead com
  status diferente de Lost e Disqualified, **inclusive Won e Converted**, e ignora a moeda.
- **Analytics:** `server/src/features/analytics/kpis/crm/CrmConversionProcessor.ts:34-36` soma só `status === 'Open'`. Quando
  a tabela existe, `CrmAnalyticsService.ts:86-97` troca `pipelineValue`, ganhos, win rate, forecast e ticket por
  `crmOpportunities.amount` (decisão do dono de 25/09). Também ignora a moeda.
- GAP-MAP: linha "CRM — valor de pipeline diverge entre visão geral e analytics, e soma moedas"
  (`docs/operating-manual/GAP-MAP.md:127`; o BRIEF cita a linha 107, que andou), `[ABERTO]`, só registro.
- A direção do dono no ADR lead × oportunidade (§9.2, só documentada) tira o lead convertido do funil de leads. Com isso,
  somar leads passa a medir só quem está em qualificação (`ADR-CRM-lead-opportunity-model.md:351-353`).

**Pergunta:** o que o número "pipeline" do CRM mede?

| Caminho | O que muda |
|---|---|
| **(a)** pipeline = **oportunidades abertas** (`crmOpportunities`, status Open), **por moeda**; sem a tabela de oportunidades, cai para leads Open. Os leads em qualificação e os ganhos ganham números próprios | a visão geral passa a ler o que o analytics já lê |
| **(b)** pipeline = leads (o analytics volta para `leads`) | desfaz a decisão de 25/09 |
| **(c)** os dois convivem, com rótulos distintos ("pipeline de leads" × "pipeline de oportunidades") | dois números na tela, cada um com uma definição |
| **(d)** adiar até o ADR lead × oportunidade ser ratificado | a divergência de hoje continua visível ao usuário |

**Recomendação: (a).** A decisão de 25/09 já escolheu a fonte ("ganhos, win rate, ticket e receita vêm de
`crmOpportunities`"), e só a visão geral não acompanhou. Pipeline é negócio em aberto, e Won já foi ganho. É compatível
com a direção do §9.2 do ADR lead × oportunidade, então não precisa esperar por ele, como (d) proporia. Qualquer caminho
herda o F-RB8: o card passa a mostrar um valor por moeda. **Execução fora deste nó:** é instrumentação (teste-guarda que
falha pela divergência) seguida de correção, com autorização própria. O builder não depende disso, porque nele o usuário
escolhe fonte e filtro, e os templates do F-RB7 não somam dinheiro (BRIEF item 13).

## 4. O que fica como está (não reaberto)

F-RB1..F-RB7 (26/09), F-RB8 e F-RB8a..f (29/09), F-AD5 → (b) e F-AD6 → apagar `custom-kpis` (emenda do ADR-ANALYTICS-DEFS,
26/09). O realizado e o monitor de câmbio continuam fora deste nó: vão para o ADR de moeda no Contas a Receber
([[D-2026-09-29-CRM-RB-MOEDA-REALIZADO]]). O D4 do conselho CRM continua congelado: F-RB4 = (c) usa só o papel `ADMIN`
global (`schema.prisma:150-153`), sem modelo de equipe.

## 5. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal (BRIEF §5). A PTAX é publicação do BCB, usada para exibição. A saída de rede do
servidor em produção para `olinda.bcb.gov.br` continua **desconhecida** (BRIEF §6). Sem ela, a visão convertida cai em
`RATE_UNAVAILABLE` e a verdade por moeda segue intacta.

## 6. Consequência se for ratificado

- O [[CRM-RB]] passa de `planned` a `ready`: BRIEF existe, forks do nó fechados (F-RBP1 e F-RBP2), e o F-RBP3 é ortogonal.
  **Continua exigindo "executa" próprio**, como sempre.
- A emenda curta do BRIEF (§2, A1–A3, mais o fatiamento do F-RBP2) é feita antes do "executa", com autorização própria.
- Se o F-RBP3 for ratificado, nasce um item de instrumentação → correção para a visão geral do CRM, fora deste nó.

## 7. Checagens desta sessão

- **PASSO 0:** `gh pr list --state all --search CRM` e `git log origin/main` não mostram PRE-ADR do CRM-RB, e `docs/adr/`
  não tem arquivo dele. Os PRs do nó são #395 (BRIEF) e #448 (emenda F-RB8), ambos mergeados.
- **Checagem que teria falhado se a fronteira estivesse errada:** um serviço Prisma no construtor do
  `DynamicTableService` (`:54-58`) ou um import de `features/crm`/`features/accounting` no motor. Nenhum dos dois existe.
- **Checagem que teria falhado se o A1 estivesse errado:** um ramo de `compiled.sort.by` no agregador. Só existe o
  `localeCompare` do nome (`:420`) e o `reverse` do `dir` (`:421-423`).
