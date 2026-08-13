# PRE-ADR-ACCOUNTING-TIMEZONE — O que a contabilidade chama de "hoje"

- **Data:** 2026-08-13
- **Status:** **ACCEPTED — RATIFICADO FORK-A-FORK PELO DONO 2026-08-13** (F-TZ1→b · F-TZ2→a · F-TZ3b→a; ver §4). **Implementação NÃO iniciada nesta sessão** — ver §8. F-TZ3 **auditado 2026-08-13** (ver §4): a máquina de período NÃO usa "hoje"; o audit achou um caminho estreito de bridge e um contra-achado que **restringe** como o F-TZ1 pode ser implementado. Nenhum fork abaixo se auto-ratifica. O agente que
  produziu este documento **não implementa** nada dele sem sinal humano fork-a-fork (ORCH-006).
- **Origem:** achado do 2º review independente do `BE-INCR-SUBLEDGER-FILTERS` (delta `d082cd9..d529d8dd`),
  ataque (a). Severidade atribuída pelo revisor: **MAIOR como defeito de produto, não bloqueante para
  aquele incremento** — o delta *herdou* o comportamento, não o introduziu.
- **Nó do master map:** §7 Núcleo 2 (operação real) e Núcleo 4 (gestão). Toca `AgingReportService`,
  a lista dos subrazões (`overdue`) e, dependendo do fork F3 abaixo, a resolução de período.

## TLDR (2 linhas)

A contabilidade inteira chama de "hoje" a **data UTC**, num produto **brasileiro operando em UTC-3**.
Entre **21:00 e 23:59 BRT**, uma conta que vence hoje já é classificada como **vencida** — e o
`AccountingScope` **já carrega um campo `timeZone: 'America/Sao_Paulo'` que nenhuma linha do módulo lê**.

---

## 1. O fato, medido (não inferido)

O revisor executou:

```
instante   2026-08-14T00:05:00.000Z  =>  BRT 13/08/2026, 21:05:00
utcToday() = 2026-08-14                  (o calendário brasileiro ainda marca 2026-08-13)
conta que vence 2026-08-13 é VENCIDA?  true
às 20:59 BRT  utcToday() = 2026-08-13  =>  VENCIDA? false
```

**Janela de erro:** 3 horas por dia, todo dia (4 horas no horário de verão do hemisfério norte, quando
o offset de outros fusos muda — irrelevante aqui, mas o Brasil não observa DST desde 2019, então a
janela é estável em 3h).

**Superfícies afetadas hoje:**

| Superfície | Como usa "hoje" | Efeito na janela das 21h |
|---|---|---|
| `AgingReportService` | `asOf` default quando o chamador omite; e o teste `asOf == hoje` que libera o tie-out | Linha que vence hoje cai no bucket `d1_30`; o tie-out pode ser suprimido por `as_of_not_today` |
| Lista AP/AR (`overdue`) | `dueDate < utcToday()` | Conta que vence hoje aparece como vencida |

**Pré-existência confirmada em disco:** `git show d082cd9:...AgingReportService.ts` já tinha
`const asOf = params.asOf ?? utcToday()`. O `BE-INCR-SUBLEDGER-FILTERS` (F9) promoveu a função para
`models/dates.ts` e a reusou — **propagou para uma segunda superfície, não criou**.

## 2. O agravante que ninguém tinha nomeado

`server/src/features/accounting/scope/AccountingScope.ts:24` declara:

```ts
timeZone: 'America/Sao_Paulo',  // Locale time zone for period resolution
```

**Esse campo nunca é lido em lugar nenhum do módulo** (grep do revisor). Existe a intenção declarada
de operar em horário local — inclusive nomeando *resolução de período* — e a implementação inteira
ignora. Isto é pior que não ter o campo: um leitor do `AccountingScope` conclui, razoavelmente, que a
contabilidade é fuso-consciente.

## 3. Por que isto é ADR, e não correção

Três razões, e a terceira é a que decide:

1. **Não é bug de um site.** "Hoje" aparece em pelo menos duas superfícies e potencialmente numa
   terceira (período). Trocar um `utcToday()` conserta um sintoma.
2. **Muda comportamento de relatório já validado.** O aging é lido por humano e comparado com o
   subrazão; mudar a fronteira do dia muda números que alguém pode já ter conferido.
3. **A resposta certa depende de uma pergunta de domínio que o agente não pode responder:**
   *o vencimento de um título é uma data-calendário no fuso do estabelecimento, ou um instante?*
   Contabilmente é data-calendário — mas **qual** calendário, num produto que pode ter unidades em
   fusos diferentes (Acre é UTC-5), é decisão do dono, não default de implementação.

---

## 4. Forks

### ✅ RATIFICADOS FORK-A-FORK PELO DONO — 2026-08-13

| Fork | Decisão | O que fica valendo |
|---|---|---|
| **F-TZ1** | ~~(b)~~ → **(c)** | **EMENDADO 2026-08-13, mesma data.** Ratificado inicialmente (b) (fuso fixo); emendado para **(c)** ao constatar que a PR #189 já havia implementado (c) com qualidade — o `timeZone` do `AccountingScope` **passa a ser lido** e deixa de ser campo morto. O ADR já registrava que "(b) é (c) com o valor chumbado, então (b)→(c) é refino, não retrabalho"; aqui o refino chegou primeiro, e reduzir a (b) jogaria fora trabalho testado para chegar num estado menos capaz |
| **F-TZ2** | **(a)** | Corrigir **aging e lista juntos**, aceitando que números de aging mudem na fronteira do dia. Nenhum saldo, lançamento ou SPED muda — só a faixa em que a linha aparece |
| **F-TZ3b** | ~~(a)~~ → **(b)** | **EMENDADO 2026-08-13.** Ratificado inicialmente (a) (falhar alto); emendado para **(b)** — o fallback **permanece**, resolvido no fuso do escopo. Fecha a janela de 3h sem transformar em erro um caminho que hoje é defensivo (`date` é `required: true` no preset de vendas). Ver §4.1 para o que (b) aceita, nomeado |

**Restrição herdada do audit (§F-TZ3), vale para a implementação do F-TZ1(b):** o conserto é
**cirúrgico na conversão instante → dia**. A leitura de data-only (`extractYearMonth`,
`fiscalYearFrom`, `isValidDateOnly`) **permanece UTC** — mexer nela reintroduz o bug de ano fiscal
que o ADR-INCR3 Emenda 3 já fechou.

**Consequência mecânica a resolver na implementação (não é fork):** com o F-TZ1(b) o nome
`utcToday()` passa a mentir — a função devolverá o hoje de São Paulo, não o de UTC. Renomear
(`hojeLocal`/`todayLocal`) faz parte do escopo ratificado; deixar o nome antigo seria plantar a
próxima confusão exatamente no ponto que este ADR existe para desfazer.

**Consequência do F-TZ3b(a) a decidir na implementação (não é fork):** "registra e pula" precisa de um
eventType/log específico, e a lição da casa é que catch de erro genérico em bridge best-effort esconde
bug real — o skip tem de ser por condição própria (data ausente), nunca por `catch` largo.

### F-TZ1 — Qual é a fonte de "hoje"? ✅ **RATIFICADO → (b), EMENDADO → (c)**

| Perna | Caminho | Custo | Consequência |
|---|---|---|---|
| **(a)** | Manter UTC, e **documentar** o limite no `utcToday()` e nas descrições de API | ~0 | O defeito continua, mas para de ser invisível. Honesto e barato; erra 3h/dia |
| **(b)** | `utcToday()` passa a resolver no fuso **fixo** `America/Sao_Paulo` (constante do módulo) | Baixo — 1 função, 2 chamadores | Correto para 100% da operação atual. Ignora o `timeZone` do escopo (que segue morto) |
| **(c)** | "Hoje" resolve pelo **`timeZone` do `AccountingScope`** — o campo passa a ser lido | Médio — a função vira dependente de escopo, e todo chamador precisa passá-lo | Cumpre a intenção já declarada no código; suporta unidade em fuso distinto |
| **(d)** | Remover o campo `timeZone` do escopo e assumir UTC explicitamente | Baixo | Elimina a promessa não cumprida, mas fecha a porta que (c) abre |

**Recomendação: (c)**, com **(b) como degrau aceitável** se o dono quiser o conserto pequeno agora.
Justificativa: o campo já existe e já promete isso; (b) é (c) com o valor chumbado, então (b)→(c) é
refino, não retrabalho. **(a) e (d) são as únicas que exigem decisão contrária à intenção já escrita
no código.**

### F-TZ2 — O que fazer com o aging já lido por humano? ✅ **RATIFICADO → (a)**

| Perna | Caminho |
|---|---|
| **(a)** | Corrigir e aceitar que números de aging mudem na fronteira do dia (nenhum lançamento muda; só a classificação) |
| **(b)** | Corrigir só a lista (`overdue`) e deixar o aging em UTC | **Contraindicada** — reintroduz exatamente a divergência que o F9 fechou |
| **(c)** | Corrigir os dois atrás de um flag, com cutover explícito |

**Recomendação: (a)**. Nenhum saldo, lançamento ou arquivo SPED muda — só a faixa em que uma linha
aparece, e só na janela de 3h. (b) é a única perna que o F9 já excluiu por argumento.

### F-TZ3 — Isto alcança a resolução de PERÍODO? — ✅ **AUDITADO 2026-08-13. Resposta: NÃO pela máquina de período; SIM por um caminho estreito de bridge.**

**O que foi verificado em disco (não inferido):**

| Pergunta | Resposta | Evidência |
|---|---|---|
| O gate de período deriva de "hoje"? | **Não** — deriva da **data do lançamento** | `PostingService.assertPeriodOpen(scope, dateStr)` → `extractYearMonth(dateStr)`; o gate autoritativo in-tx usa o mesmo `dateStr` |
| O ano fiscal deriva de "hoje"? | **Não** | `fiscalYearFrom(dateStr)` = `new Date(dateStr).getUTCFullYear()` |
| Abrir/fechar período usa mês corrente? | **Não** | `PeriodService` opera sobre `periodId`/`year` **explícitos**; nenhuma transição infere o período de agora |
| Existe `new Date()` sem argumento no caminho de período? | Só carimbos de auditoria | `AccountingPeriodRepository.ts:71-72` (`openedAt`/`closedAt`) — instantes, corretos como instantes |

**⚠️ CONTRA-ACHADO que EMENDA o F-TZ1 — leia antes de implementar qualquer perna.**

`PostingService.fiscalYearFrom` carrega um comentário que documenta um **bug já corrigido, na direção
oposta** (ADR-INCR3 Emenda 3):

> *"Converting to America/Sao_Paulo here (as a prior version did) shifts UTC midnight on Jan 1 back to
> Dec 31 21:00 BRT, so entries dated 2026-01-01 were numbered under fiscal year 2025 even though the
> period gate correctly placed them in 2026-01 — the two disagreed on the fiscal year of the exact
> same date."*

Ou seja: **duas operações que se parecem são opostas**, e confundi-las já custou um bug aqui.

| Operação | Fuso correto | Se errar |
|---|---|---|
| `agora` → dia-calendário do operador (`utcToday`) | **local** (é o que o F-TZ1 propõe) | conta vence "hoje" e aparece vencida às 21h |
| string data-only informada → `Date` (`extractYearMonth`, `fiscalYearFrom`, `isValidDateOnly`) | **UTC** — e é assim hoje | `2026-01-01` volta para 2025; período e numeração discordam |

**Restrição que qualquer implementação do F-TZ1 DEVE respeitar:** o conserto é cirúrgico na função que
converte **instante → dia**. Nenhuma perna do F-TZ1 autoriza mexer na leitura de data-only. Uma
implementação que "converta tudo para São Paulo" **reintroduz o bug de ano fiscal já fechado**.

**O caminho estreito que o audit ACHOU — e que não estava em nenhum fork:**

As bridges do salão inventam a data do fato quando a origem não a informou:

```ts
const occurredAt = typeof data.date === 'string' ? data.date : new Date().toISOString();
```

`SalonSalesAccountingBridge.ts:87` · `SalonPackageSoldBridge.ts:80` · `SalonSaleReversalBridge.ts:84,97,124`
· `SalonSaleSettlementBridge.ts:117`

E `occurredAt` **vira a data do lançamento**: os 5 mappers fazem `date: event.occurredAt`, que alimenta
`postEntry` → gate de período **e** ano fiscal. **Consequência:** uma venda sem data, finalizada entre
21h e 23h59 BRT do último dia do mês, é contabilizada **no mês seguinte**. Se o mês corrente fechar
depois, o lançamento ficou no período errado — e isso é materialmente pior que um filtro de lista.

**O que limita o dano (verificado):** o campo `date` é `required: true` no preset de vendas
(`DatePresets.ts:17`, usado por `SalesModule`), então o fallback é defensivo, não o caminho comum.
**O que NÃO limita:** (1) `required` de preset é validação de aplicação, não constraint de banco;
(2) a guarda é `typeof data.date === 'string'` — uma data gravada em tipo não-string dispara o
fallback **mesmo existindo data**.

### F-TZ3b — O que fazer com o fallback de data das bridges? ✅ **RATIFICADO → (a), EMENDADO → (b)** *(fork novo, nascido do audit)*

| Perna | Caminho | Consequência |
|---|---|---|
| **(a) — recomendada** | **Falhar alto**: sem data na origem, a bridge não contabiliza; registra e pula | Inventar a data de um fato contábil é a mesma classe de "param aceito-e-ignorado" que esta casa já proíbe. O evento fica visível em vez de silenciosamente no mês errado |
| (b) | Manter o fallback, mas derivá-lo no fuso local | Reduz a janela de 3h para zero, mas segue inventando dado contábil |
| (c) | Manter como está e documentar | Barato; mantém o único caminho onde "agora" move dinheiro de mês |

**Veredito do audit sobre o F-TZ3 original:** a perna **(a)** vale — o escopo desta ADR fica em
**aging + lista + o fallback das bridges (F-TZ3b)**. A máquina de período em si está correta e **não
deve ser tocada**.

---

## 5. O que NÃO está em discussão

- **Não** muda `dueDate`, `issueDate` nem nenhuma data **informada** pelo usuário: essas são
  data-only, validadas por `isValidDateOnly`, e já são o que o usuário digitou.
- **Não** muda dinheiro, saldo, partida dobrada, numeração ou arquivo SPED.
- **Não** reabre multi-fuso como feature: F-TZ1(c) lê um campo que já existe, não cria torre nova.

## 6. Verificação exigida de quem implementar

1. Um teste que **falha hoje** e passa depois, congelando o relógio às 21:05 BRT e afirmando que uma
   conta que vence naquele dia **não** é vencida (a instrumentação é sessão própria — `sessao-instrumentacao`).
2. A suíte do aging verde, incluindo os 4 casos que já cobrem o default de `asOf` e os dois ramos de
   `as_of_not_today` (`AgingReportService.test.ts:239,441,458,463`).
3. Se F-TZ1(c): todo chamador de `utcToday()` passa escopo — e o campo deixa de ser morto.

## 7. Rastreabilidade

- Achado: 2º review independente do `BE-INCR-SUBLEDGER-FILTERS`, ataque (a), 2026-08-13.
- Chip de tarefa aberto pelo revisor: `task_332b21b6`.
- Código herdado: `models/dates.ts` (`utcToday`, promovida em `d529d8dd` por F9→(a)).
- Campo morto: `AccountingScope.ts:24`.

---

## 8. Estado da implementação — LEIA ANTES DE CODIFICAR

**Nada deste ADR foi implementado na sessão que o escreveu.** No momento da ratificação havia uma
sessão paralela em voo (chip `task_332b21b6`, aberta pelo 2º revisor **antes** deste ADR existir),
trabalhando sobre o mesmo tema sem conhecer as pernas ratificadas.

Riscos concretos de deixar as duas correrem juntas, nesta ordem de gravidade:

1. **A sessão paralela pode violar a restrição do §F-TZ3** — ela não viu o contra-achado. Uma correção
   que "converta tudo para São Paulo" reintroduz o bug de ano fiscal do ADR-INCR3 Emenda 3.
2. **Ela pode ter escolhido outra perna** — (c), ler o `timeZone` do escopo, é a recomendação que este
   documento fazia antes da ratificação; o dono escolheu (b).
3. **Colisão de arquivo** em `models/dates.ts`, `AgingReportService.ts` e nas 5 bridges.

**Sequência correta a partir daqui:** conferir o que a sessão paralela produziu → reconciliar contra
as pernas ratificadas acima → só então instrumentar (§6) e corrigir. Implementar em paralelo é a única
opção que garante retrabalho.

### 8.1 Conferência da PR #189 (2026-08-13) — o que ela implementou, perna a perna

A sessão paralela **terminou** e abriu a **PR #189** (branch `claude/heuristic-austin-7992d0`), baseada
em `origin/main`. Conferida contra as pernas ratificadas:

| Fork | Ratificado | O que a #189 fez | Situação |
|---|---|---|---|
| **F-TZ1** | (b) → emendado (c) | **(c)** — `scopeDay(scope, instant)` + `scopeToday(scope)`, lendo `scope.timeZone` | ✅ **Alinhado pela emenda.** Primeiro consumidor real do campo |
| **F-TZ2** | (a) | Corrigiu o aging (`asOf` default e o teste `as_of_not_today`) | ✅ Alinhado — a lista vem desta branch; juntas fecham (a) |
| **F-TZ3b** | (a) → emendado **(b)** | **(b)** — manteve o fallback e o converteu para o fuso local: `scopeDay(scope, typeof data.date === 'string' ? data.date : undefined)` | ✅ **Alinhado pela emenda de 2026-08-13** |

**A restrição do §F-TZ3 foi respeitada, e melhor do que o pedido.** A #189 não tocou `PostingService.ts`,
e o `scopeDay` faz **short-circuit em string date-only** — devolve intacta o que já é dia-calendário,
convertendo só instante de verdade. O doc dela cita explicitamente o `fiscalYearFrom` como razão. É a
forma correta da distinção que o audit levantou.

**Resolvido pela emenda de 2026-08-13:** o dono emendou o F-TZ3b para (b). A #189 fica **integralmente
alinhada** às pernas ratificadas; nenhuma divergência permanece aberta.

**Verificação adicional feita ao fechar (o `catch` que parecia largo, e não é):**
`CrmReceivableBridge.toDateOnly` envolve o `scopeDay` num `try/catch` que atribui `dateOnly = ''` — o
que à primeira vista é a classe "catch largo esconde bug real". **Não é:** a linha seguinte é
`if (!isValidDateOnly(dateOnly)) throw new ValidationError(...)` **com o `opportunityId`**. O catch não
engole; ele enriquece a mensagem, e o sentinela vazio garante que o throw aconteça. **Data inválida
falha alto nas duas pontas** — o fallback de (b) cobre apenas data **ausente**.

### 4.1 O que a perna (b) aceita — nomeado, para não virar surpresa

1. **O fato contábil pode nascer com uma data que ninguém informou.** Mitigado, não eliminado: `date` é
   `required: true` no preset de vendas (`DatePresets.ts:17`), logo o caminho é defensivo.
2. **`required` de preset é validação de aplicação, não constraint de banco** — uma linha criada por
   caminho que pule a validação não tem a garantia.
3. **A guarda é `typeof data.date === 'string'`.** Uma data gravada em tipo não-string dispara o
   fallback **mesmo existindo data** — e sob (b) isso passa a inventar o dia certo em vez do errado,
   o que é melhor, mas continua sendo invenção. Se algum dia o store da DynamicTable passar a devolver
   `Date` em vez de string neste campo, o fallback vira o caminho comum **em silêncio**.
