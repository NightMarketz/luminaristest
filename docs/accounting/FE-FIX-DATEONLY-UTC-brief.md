# BRIEF — correção da classe `date-only-utc-shift` no frontend (GAP-MAP nº 5)

> **Status: FORKS RATIFICADOS PELO DONO EM 2026-09-02** — mensagem "ratifica as recomendações e abre
> a sessão de correção". Ratificadas **as recomendações como escritas**: **F1(a)**, **F2(b)**,
> **F3(b)**, **F4(b)**, **F5(a)**. Esta é a autorização citável que a `sessao-correcao` exige.
>
> **Consequência de F4(b) a executar junto:** o site #13 (`DynamicForm.tsx:301`) sai deste lote, e o
> teste-guarda dele (`DynamicForm.todayButton.test.tsx`) **não pode aterrissar vermelho na `main`** —
> ele acompanha o item próprio que F4(b) manda abrir. O lote desta correção é de **12 sites**.

- **Autorização:** mensagem do dono de **2026-09-01** que mandou varrer a classe (a mesma que fechou o
  AgingPanel, registrada no GAP-MAP registro de predição nº 4) + mensagem de **2026-09-02**
  ("abre os forks da varredura date-only-utc-shift"). A autorização cobre **abrir** os forks; a
  correção é frente separada e exige ratificação (ORCH-006).
- **Insumos:** commit `6a83c6b9` no worktree `angry-shamir-fb713c` (13 testes-guarda vermelhos +
  entrada nº 5 do `docs/operating-manual/GAP-MAP.md`); PR #250 (fork (a) do aging, **ainda ABERTO**);
  `server/src/features/accounting/models/dates.ts` (`scopeDay`);
  `server/src/features/accounting/scope/AccountingScope.ts`; `my-app/lib/api/api-client.ts`;
  `server/src/middleware/auth.ts`.
- **Escopo declarado como desvio do template:** o template manda separar `BE-INCR-*` de `FE-INCR-*`.
  Aqui isso é impossível sem esvaziar a decisão — **os forks são exatamente sobre em que lado da
  fronteira o "hoje" é derivado**. O BRIEF atravessa as duas metades de propósito; o *fatiamento* em
  incrementos separados só é decidível depois de F1/F2.

## 0. O defeito, em uma frase

Todos os 13 sites derivam o dia default com `new Date().toISOString().slice(0,10)` — o dia-calendário
**UTC**. O produto opera em UTC-3, então **das 21h às 00h BRT o default já é o dia seguinte**:
read-paths pedem a posição de amanhã, write-paths **gravam o dia errado em silêncio**.

## 1. Checklist numerado (13 comportamentos, cada um com teste-guarda já vermelho)

Cada linha é individualmente testável; o oráculo já existe em `6a83c6b9` (fake timers em
`2026-09-01T02:30Z` = 23:30 BRT de 31/08, asserção fork-agnóstica `['', '2026-08-31']` — ou seja,
**os testes aceitam tanto "omitir" quanto "derivar certo"**, então não pré-julgam o fork).

### Read-paths — 5 (o dano é relatório errado/vazio, visível)

| # | Site | Campo | Dano específico |
|---|---|---|---|
| 1 | `BalanceSheetPanel.tsx:9` | `asOf` | posição do BP um dia à frente |
| 2 | `IncomeStatementPanel.tsx:9` | `asOf` | **em 31/12 a janela year-to-date vira o ano seguinte → DRE vazia** |
| 3 | `DFCPanel.tsx:15` | `asOf` | idem DRE, DFC vazia em 31/12 |
| 4 | `PeriodComparisonPanel.tsx:9` | `asOfCurrent` | comparativo contra período errado |
| 5 | `DailyJournalPanel.tsx:10` | `Até` | Livro Diário inclui um dia que ainda não existe no escopo |

### Write-paths — 8 (o dano é dado errado gravado, invisível)

| # | Site | Campo | Dano específico |
|---|---|---|---|
| 6 | `JournalEntryModal.tsx:106` | `date` | lançamento manual no dia errado; numa virada de mês cai em período diferente |
| 7 | `JournalEntriesPanel.tsx:204` | `reversalDate` | estorno com data futura |
| 8 | `AccountsPayablePanel.tsx:31` | `paidAt` (re-derivada no clique) | baixa AP no dia errado |
| 9 | `AccountsReceivablePanel.tsx:31` | `paidAt` | baixa AR no dia errado |
| 10 | `CreatePayableModal.tsx:31` | `issueDate` + `dueDate` | competência do reconhecimento errada |
| 11 | `CreateReceivableModal.tsx:30` | `issueDate` + `dueDate` | idem |
| 12 | `useSalesWizard.ts:58` | `date` da venda | **ponte contábil reconhece receita no dia errado** |
| 13 | `DynamicForm.tsx:301` | botão "Hoje" | o rótulo promete hoje e grava amanhã |

**Verificado:** fora do `as_of_not_today` do aging, o backend **não tem nenhuma checagem de "hoje"** —
nada barra o dia errado nos 8 write-paths.

## 2. Contratos tocados (esboço)

Estado atual, lido nos DTOs (não de memória):

```ts
// server/src/features/accounting/dtos/PostingDto.ts:331,337   (BP, DRE)
asOf: z.string().refine(isValidDateOnly, '...')                 // OBRIGATÓRIO
// server/src/features/accounting/dtos/cashFlowReport.dto.ts:31 (DFC)
asOf: z.string().refine(isValidDateOnly, '...')                 // OBRIGATÓRIO
// server/src/features/accounting/dtos/aging.dto.ts            (aging — precedente)
asOf: dateOnly.optional()                                       // JÁ OPCIONAL
// server/src/features/accounting/dtos/PayableDto.ts:54,55,117,136
issueDate / dueDate / paidAt / reversalDate                     // TODOS OBRIGATÓRIOS
// server/src/features/accounting/dtos/PostingDto.ts:91
date: z.string().refine(isValidDateOnly, '...')                 // OBRIGATÓRIO
```

Forma exigida **se** F1/F2 escolherem "omitir e o backend decide":

```ts
asOf: dateOnly.optional()          // + default `scopeDay(scope)` no Service, nunca no DTO
```

> ⚠ Isso aciona o **snapshot de shape dos DTOs Zod** e o **guard de path-count do openapi**
> (`npm run docs:generate`) — pertencem ao checklist da correção, não à improvisação.

**Fato que separa este caso do aging:** o aging já tinha `asOf?` opcional — o PR #250 mudou **só o FE**.
Nos 5 read-paths o DTO **exige** a data, então espelhar o precedente aqui **não é um fix de FE**: exige
mudar contrato no backend. É isso que transforma o que parecia uma varredura de FE em fork de fronteira.

## 3. Forks — RATIFICAÇÃO PENDENTE

### F1 — read-paths (#1–#5): quem decide "hoje"?

- **(a) Espelhar o PR #250:** DTO `asOf` vira opcional, Service defaulta com `scopeDay(scope)`, FE usa
  `useState('')` + flag `touched` + ecoa `report.asOf` de volta no input.
  *Custo:* 3 DTOs + 3 Services + 5 componentes + snapshot de shape + openapi.
- **(b) Corrigir só no FE**, derivando o dia no fuso certo sem tocar contrato.
  *Custo:* ~5 linhas. *Preço:* o "hoje" passa a ter duas definições no produto (F3 decide qual).
- **(c) Não corrigir os read-paths** — o usuário vê a data na tela e pode trocar.
  *Preço:* o caso 31/12 (DRE/DFC vazias) é silencioso e sazonal; quem vê "vazio" conclui "não há dado".

> **Recomendação: (a).** É o único caminho em que "hoje" tem **uma** definição, e é o precedente que o
> dono já ratificou uma vez (GAP-MAP nº 4). O custo é real mas é mecânico e cada passo tem teste.
> **Contra-argumento honesto:** (a) é ~11 arquivos para um bug de 3 horas por dia; se a prioridade é
> fechar a classe rápido, (b) fecha os 13 sites por um preço menor — e F3 é justamente o que decide se
> esse preço é aceitável.

### F2 — write-paths (#6–#13): omitir não é simétrico

Aqui **(a) não se aplica em bloco**, e essa assimetria é a decisão:

- `date` (#6), `reversalDate` (#7), `paidAt` (#8, #9): "hoje no escopo" é um default **defensável** —
  o backend pode decidir.
- `dueDate` (#10, #11): **não existe default legítimo** para um vencimento. Tornar opcional seria
  contrato pior. Só resta corrigir a derivação no FE.
- `date` da venda (#12) e botão "Hoje" (#13): o rótulo/UX **promete o dia local**; omitir muda o
  significado da tela, não só o valor.

- **(a) Misto:** omitir onde há default legítimo (#6–#9), corrigir no FE onde não há (#10–#13).
- **(b) Tudo no FE:** um mecanismo só para os 8, contrato intacto.
- **(c) Tudo no backend:** exige tornar `dueDate` opcional — **não recomendado**, degrada o contrato.

> **Recomendação: (b) para os 8.** Write-path é onde o usuário está *olhando* a data no formulário antes
> de confirmar; um campo que chega vazio e é preenchido pelo servidor depois é pior UX e pior auditoria
> do que um campo certo desde o início. (a) é aceitável mas cria dois padrões na mesma tela.

### F3 — se o FE derivar o dia, **qual fuso**? (o fork de fronteira de verdade)

Este é o que F1(b) e F2(b) dependem. Três mecanismos, todos verificados no código:

- **(a) Fuso do navegador** — `Intl.DateTimeFormat().resolvedOptions().timeZone`. Já é computado hoje em
  `api-client.ts:47` e enviado como `x-user-timezone` em toda requisição.
  *Preço:* o `middleware/auth.ts` declara em teste que esse header **"is client-supplied and carries no
  authority"**. Usá-lo para derivar competência contábil contradiz essa decisão registrada. E um usuário
  viajando grava no fuso errado.
- **(b) Constante de escopo no FE** — `'America/Sao_Paulo'`, espelhando `AccountingScope.timeZone`.
  *A favor:* o campo é hoje um **literal type hardcoded** (`timeZone: 'America/Sao_Paulo'`), não varia
  por tenant — então (b) é **comportamentalmente idêntico** a perguntar ao backend, por ~1 linha.
  *Preço:* duplica através da fronteira uma constante cujo próprio doc diz que existe para o dia em que
  virar configurável. No dia em que virar, o FE mente sem avisar.
- **(c) O backend passa o fuso do escopo ao FE** (campo em resposta já existente ou endpoint de config).
  *A favor:* fecha (b) sem duplicar. *Preço:* nó novo de contrato para um valor que hoje é constante.

> **Recomendação: (b) com comentário `ponytail:` nomeando o teto** — "constante espelhada de
> `AccountingScope.timeZone`; vira (c) quando o fuso for por tenant". É a única que não paga por
> flexibilidade que não existe e não usa um header que a casa já declarou sem autoridade.
> **Viés a declarar:** essa recomendação é a que menos código escreve, e eu opero sob instrução de
> minimalismo — o dono deve pesar se a duplicação da constante o incomoda mais do que a economia.

### F4 — `DynamicForm.tsx:301` (#13) não é contabilidade

O botão "Hoje" é do **motor genérico de formulários**, usado por todo o dashboard, não pelo escopo
contábil. Não existe `AccountingScope` ali.

- **(a)** Tratar junto, usando o mesmo mecanismo de F3.
- **(b)** Tirar do lote e abrir item próprio — blast radius é o dashboard inteiro, não a contabilidade.

> **Recomendação: (b).** Um botão rotulado "Hoje" que grava amanhã é bug real, mas o alcance dele é outro
> e o critério de "hoje" de um formulário de CRM não é o do razão. Meter os dois no mesmo diff mistura
> dois blast radius. **Se o dono discordar,** (a) é seguro *desde que* F3 escolha (b) ou (c).

### F5 — como esta correção entra, dado que o PR #250 está ABERTO

O #250 toca `GAP-MAP.md` no **mesmo ponto de inserção** (registros nº 4 e nº 5) — conflito garantido.

- **(a)** Mergear o #250 primeiro, rebasear `angry-shamir` em cima, resolver mantendo os dois registros.
- **(b)** Abrir a correção como PR empilhado sobre o #250.

> **Recomendação: (a).** `squash-merge-quebra-prs-empilhados` é precedente registrado da casa; empilhar
> sobre um PR aberto é o erro que já custou rebase aqui.

## 4. Pendente de validação externa

- **Nenhum item deste BRIEF depende de oráculo externo** (contador, PVA, NF-e). É defeito de derivação de
  data, verificável por teste. Registrado explicitamente porque a fila do produto está travada em oráculo
  externo e este item **não está** — é executável hoje.

## 5. Insumos ausentes

- **Não verificado:** se algum relatório *fora* da contabilidade (analytics/KPI) deriva "hoje" da mesma
  forma. Os processors de analytics recebem `timeZone` por parâmetro (`CashflowKpiProcessor.ts:63`), o
  que sugere que **não** mordem — mas isso é inferência a partir da assinatura, **não** verificado
  lendo o caminho completo. Varrer exigiria sair do item autorizado (regra 2).

## 6. Achados fora de escopo

- `EditRecordButton.tsx:48` — classe **adjacente** (`new Date(raw)` no round-trip de renderização), morde
  só se o valor armazenado for datetime. Não instrumentado, não planejado aqui.
- A memória `fe-dateonly-utc-shift-sweep` dizia "NÃO commitados"; o trabalho **está** commitado em
  `6a83c6b9`. Corrigido na memória em 2026-09-02.
