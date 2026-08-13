# PRE-ADR-ACCOUNTING-TIMEZONE — O que a contabilidade chama de "hoje"

- **Data:** 2026-08-13
- **Status:** **PROPOSED — RATIFICAÇÃO PENDENTE.** Nenhum fork abaixo se auto-ratifica. O agente que
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

### F-TZ1 — Qual é a fonte de "hoje"? **RATIFICAÇÃO PENDENTE**

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

### F-TZ2 — O que fazer com o aging já lido por humano? **RATIFICAÇÃO PENDENTE**

| Perna | Caminho |
|---|---|
| **(a)** | Corrigir e aceitar que números de aging mudem na fronteira do dia (nenhum lançamento muda; só a classificação) |
| **(b)** | Corrigir só a lista (`overdue`) e deixar o aging em UTC | **Contraindicada** — reintroduz exatamente a divergência que o F9 fechou |
| **(c)** | Corrigir os dois atrás de um flag, com cutover explícito |

**Recomendação: (a)**. Nenhum saldo, lançamento ou arquivo SPED muda — só a faixa em que uma linha
aparece, e só na janela de 3h. (b) é a única perna que o F9 já excluiu por argumento.

### F-TZ3 — Isto alcança a resolução de PERÍODO? **RATIFICAÇÃO PENDENTE**

O comentário do campo diz *"for period resolution"*. Se período (INCR-1) também resolver "hoje" em
UTC, o gate de postagem pode abrir/fechar 3h antes na virada de mês — o que é materialmente pior que
o filtro de lista.

| Perna | Caminho |
|---|---|
| **(a)** | Escopo desta ADR = aging + lista. Período é investigação separada |
| **(b)** | Auditar o período **antes** de decidir F-TZ1, porque o resultado pode mudar a recomendação |

**Recomendação: (b) primeiro, como verificação barata** — é um grep por `new Date()` no caminho de
período. Se período não usa "hoje" (usa a data do lançamento, informada), então (a) e o escopo fica pequeno.

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
