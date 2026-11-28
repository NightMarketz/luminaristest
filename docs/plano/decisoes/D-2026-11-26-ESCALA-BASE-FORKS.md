---
id: "D-2026-11-26-ESCALA-BASE-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-ESC-1..16 da escala como módulo base — questionário do dono em 26/11"
estado: "decided"
autorizacao: "dono, chat, 2026-11-26: \"faz o questionário dos forks F-ESC comigo\" e, depois de interromper o 4º bloco, \"Segue\"; questionário (AskUserQuestion) em 4 blocos, todos respondidos na opção recomendada. Respostas literais: F-ESC-1 → \"DynamicTable no Core (Recommended)\"; F-ESC-2 → \"Core, tabelas visíveis (Recommended)\"; F-ESC-3 → \"Tabela resources + alvo XOR (Recommended)\"; F-ESC-4 → \"Ciclo de N dias com âncora (Recommended)\"; F-ESC-5 → \"Recusa, com encaixe registrado (Recommended)\"; F-ESC-11 → \"Conflito por pessoa (Recommended)\"; F-ESC-16 → \"Passa pelo gate e encaixa (Recommended)\"; F-ESC-15 → \"Sem escala = sem restrição (Recommended)\"; F-ESC-6 → \"Projeção pela borda BR (Recommended)\"; F-ESC-7 → \"Projeção em 2 etapas (Recommended)\"; F-ESC-8 → \"DpJornada segue a fonte (Recommended)\"; F-ESC-10 → \"Mesma escala + origin (Recommended)\"; F-ESC-12 → \"Migra e aposenta (Recommended)\"; F-ESC-13 → \"units.timeZone IANA (Recommended)\"; F-ESC-14 → \"Aceita fora da transação (Recommended)\"; F-ESC-9 → \"Fora desta fase (Recommended)\". Escopo: ratificar os forks do PRE-ADR e do BRIEF. Não é 'executa' de nenhum PR do BRIEF."
atualizado: "2026-11-27"
---
# D-2026-11-26-ESCALA-BASE-FORKS — forks da escala como módulo base

**Estado:** `decided`
**Autorização:** dono, chat, 26/11/2026, questionário com contexto em quatro blocos. As respostas literais estão no
cabeçalho. O escopo é **ratificar os forks** do [PRE-ADR](../../adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md) §5 e do
[BRIEF](../../accounting/BE-INCR-ESCALA-BASE-brief.md) §4. Não autoriza código: cada PR pede o `executa`.

Nó: [[ESCALA-BASE]]. PR do documento: #1424.

## Forks

| Fork | Decisão | Recomendação seguida? |
|---|---|---|
| F-ESC-1 onde mora | **(a)** DynamicTable no Core (`resources`, `schedules`, `scheduleShifts`, `scheduleExceptions`); gate no `AppointmentsPlugin` | sim |
| F-ESC-2 registro | **(a)** Core, tabelas visíveis (a tabela genérica edita até o FE próprio) | sim |
| F-ESC-3 recurso | **(a)** `resources` só para o que não é pessoa; escala com `employeeId` XOR `resourceId`; `appointments.resourceId` opcional com 2º `noOverlap` | sim |
| F-ESC-4 padrão | **(a)** ciclo de N dias (1..56) com âncora; turno `{dayOfCycle, startMinute, durationMinutes}` | sim |
| F-ESC-5 fora da disponibilidade | **(a)** 400 `OUTSIDE_AVAILABILITY`, salvo encaixe `availabilityOverride` com motivo obrigatório | sim |
| F-ESC-6 feriado | **(a)** projeção diária pela borda BR em `scheduleExceptions` `HOLIDAY`; o apagado pelo usuário não volta | sim |
| F-ESC-7 afastamento do DP | **(a)** projeção em duas etapas: a1 (job de reconcile, sem tocar `features/dp/**`) neste BRIEF; a2 (o DP chama depois do commit) no BRIEF do DP | sim |
| F-ESC-8 DP consome | **(a)** `DpJornada` segue a jornada contratual e a fonte da folha; a escala oferece o `PlannedScheduleReader`; a porta do DP nasce no BRIEF que consumir | sim |
| F-ESC-9 aprovação | **(b)** fora desta fase | sim |
| F-ESC-10 parceiro | **(a)** mesma escala, `origin` `DECLARED` (padrão) ou `ASSIGNED`; alerta de vínculo só na borda BR depois do P1 | sim |
| F-ESC-11 conflito entre unidades | **(a)** `noOverlap` por pessoa (sem `unitId`) e por recurso | sim |
| F-ESC-12 `workSchedule` | **(a)** migra (só dias `active`) e aposenta (`readOnly`, fora do formulário; remoção depois) | sim |
| F-ESC-13 fuso | **(a)** `units.timeZone` IANA, default da borda do país | sim |
| F-ESC-14 gate fora da tx | **(a)** aceita o preflight em `beforeCreate`/`beforeUpdate` | sim |
| F-ESC-15 sem escala | **(a)** sem restrição | sim |
| F-ESC-16 agendamento da venda | **(a)** passa pela função do gate; sem horário livre, grava encaixe `AUTO_FROM_SALE` | sim |

## Consequências

- O PRE-ADR passa a **Accepted 2026-11-26**. O BRIEF fica com todos os forks decididos, e o checklist condicional vale
  como escrito: nenhum item muda.
- O `executa` continua pendente. Quando vier, o trabalho roda em `integration/escala-base` (D-2026-11-10), um PR por fase
  (D-2026-11-25).
- O que fica fora deste nó: o P1 (advogado: escala `ASSIGNED` para parceiro e risco de vínculo); P2 e P3 (DP); a etapa a2
  do F-ESC-7 e a porta do F-ESC-8 (BRIEF do DP, serial com o [[PES-4]]); o FE (`FE-INCR-ESCALA`, a abrir).
- As lacunas `L-20261126-180055-8f07`, `L-20261126-180056-7893` e `L-20261126-180939-51cf` continuam na caixa até o PR-2.

## Emenda (dono, chat, 2026-11-26): lacunas de spec achadas no `executa`

A sessão que executa o BRIEF parou os itens 11, 23 e 27 por três lacunas de spec. Duas foram ao dono por questionário; a
terceira tem caminho único e foi decidida pela sessão de planejamento.

| Fork | Achado | Decisão (resposta literal) |
|---|---|---|
| F-ESC-17 escopo vazio no `noOverlap` (item 27) | `GovernanceEngine.enforceNoOverlap` descarta o campo de escopo vazio, então "vazio casa com tudo". Hoje um agendamento sem profissional conflita com toda a unidade; com `['resourceId']`, todo agendamento sem sala conflitaria com a tabela inteira | **(a)** flag opt-in `skipWhenScopeEmpty` em `INoOverlapRule`, tratada no `GovernanceEngine` (não é o `DynamicTableService`; não fere a `B4`). O conflito segue na tx. Vale nos dois `noOverlap` da agenda — *"Flag opt-in no motor (Recommended)"* |
| F-ESC-18 fuso padrão (item 11) | O default do fuso é da borda (R2 e), e o plugin não importa `paises/` (R3) | **(a)** o rollout grava `timeZone` = padrão da borda nas unidades sem fuso; o provisionamento do onboarding cria a unidade já com fuso; o job diário da borda BR (o dos feriados) preenche a que nascer sem fuso. Na janela de até 24 h, o gate usa o fuso do processo, como hoje, com lacuna na caixa — *"Grava como dado + job (Recommended)"* |
| Rollout de esquema em instância existente (itens 23 e 27) | O `PresetSyncService` só leva campo novo, opção de select e `immutableAfter`; não leva mudança de `noOverlap` nem o `readOnly` do `workSchedule` | **Sem fork (caminho único):** o script de rollout da escala (itens 12 e 22, idempotente) aplica as duas mudanças por `updateTableSchemaAsSystem`. Decidido pela sessão de planejamento |

O `GovernanceEngine` entra no write-set do PR-2 (`server/src/features/dynamicTables/validation/GovernanceEngine.ts`).

## Emenda 2 (dono, chat, 2026-11-26): escala em outra unidade (item 24)

| Fork | Achado | Decisão (resposta literal) |
|---|---|---|
| F-ESC-19 alcance do F-ESC-15 (item 24) | O profissional tem padrão vivo só na unidade A, e o agendamento é na unidade B. O F-ESC-15 diz "recurso sem escala", mas este recurso tem escala, só que em outra unidade | **(R2)** O F-ESC-15 vale só para o alvo sem nenhum padrão vivo. O alvo que tem padrão vivo é conferido contra os padrões da unidade do agendamento e os sem unidade. Se nenhum desses cobre o horário, a resposta é 400 `OUTSIDE_AVAILABILITY`, salvo encaixe com motivo. "Vivo" = não apagado. Padrão vivo fora da vigência na data não cobre — *"Recusa em B (Recommended)"* |

## Emenda 3 (dono, chat, 2026-11-27): leitura de disponibilidade (itens 31 e 32, `L-20261127-020426-4039`)

As três perguntas foram ao dono por questionário; as três respostas foram a recomendação.

| Fork | Achado | Decisão (resposta literal) |
|---|---|---|
| F-ESC-20 profissional da unidade no free-slots (item 32) | Sem `employeeId`, o BRIEF não define quem é "profissional da unidade" | Entra quem tem a unidade no cadastro (`employees.unitId`) ou tem padrão vivo nela. Quem só tem escala em outra unidade aparece sem horário, coerente com o F-ESC-19, para manter a paridade com o gate. Quem não tem nenhum dos dois fica fora da lista da unidade, embora o gate aceite agendar com ele (F-ESC-15) — *"Cadastro + escala (Recomendado)"* |
| F-ESC-21 alvo sem padrão vivo na leitura (item 31) | O F-ESC-15 (a) diz "sem restrição" para o gate; o BRIEF não diz o que a leitura devolve | A leitura devolve a janela inteira, com `unrestricted: true`, em paridade com o gate — *"Janela inteira (Recomendado)"* |
| F-ESC-22 formato do `GET /api/scheduling/availability` (item 31) | O §3.4 não fixa o corpo da resposta | `{ unrestricted: boolean, intervals: [{ startAt, endAt }] }`, em ISO, com `.strict()`: o mínimo para o FE distinguir "livre o dia todo" de "sem horário" — *"Aceito o proposto (Recomendado)"* |

## Emenda 4 (dono, chat, 2026-11-27): feriado da escala (item 39, `L-20261127-124714-2e66`)

A sessão que executa o PR-4 (#1447) mandou as duas perguntas à sessão principal. A sessão de planejamento também as levou
ao dono por questionário. No F-ESC-23 as duas sessões trouxeram respostas opostas: aqui saiu (B), e na sessão principal
saiu (C). A sessão de planejamento pôs o conflito ao dono numa pergunta própria, e ele confirmou a (C), que vale. O F-ESC-24
seguiu a recomendação sem conflito, e o #1447 já o implementa.

| Fork | Achado | Decisão (resposta literal) |
|---|---|---|
| F-ESC-23 feriado apagado depois da purga (item 39) | O `PurgeDeletedRecords` (`jobs/PurgeDeletedRecords.ts:135`) apaga de vez a linha soft-deletada há 90 dias, e a versão vai junto por cascade (`schema.prisma:363`). Sem a linha, o sync diário recria o feriado que o usuário apagou | **(C)** A linha `origin: HOLIDAY_CALENDAR` não se apaga, ela se **desliga**. Uma marca na `scheduleExceptions` (campo novo do preset, levado pelo rollout) fica, e a purga não a leva. O "apagar" do usuário nessa linha vira "desligar". O gate e a leitura ignoram a linha desligada, o sync não recria o feriado desligado, e o FE a esconde. O item 15 muda de "pode ser apagada" para "pode ser desligada". A (B), "aceitar os 90 dias", não fica nem como etapa. A (A), o ledger de versões, caiu pelo cascade. Respostas do dono: *"Marca que fica (Recomendado)"* na sessão principal e, no desempate, *"Marca que fica"*. A resposta anterior aqui, *"Aceitar os 90 dias (Recommended)"*, ficou superada |
| F-ESC-25 religar o feriado desligado (item 15, F-ESC-23) | O item 15 e o F-ESC-23 dizem que o feriado se desliga, mas não dizem se volta | O update da linha `HOLIDAY_CALENDAR` aceita `disabled` nos dois sentidos, e só esse campo muda. O DELETE continua recusado (400 `EXCEPTION_READ_ONLY`), e o sync não recria a linha, porque ela nunca some — *"Desligar e religar (Recommended)"* |
| F-ESC-24 sync manual em unidade sem fuso (item 39) | O `POST /api/scheduling/holidays/sync` pode rodar numa unidade sem `timeZone`, e o instante gravado na exceção não se corrige depois | Antes de gravar, o sync preenche a unidade com o fuso padrão da borda (`BR_DEFAULT_TIME_ZONE`), como o job diário faz pelo F-ESC-18. A alternativa recusada era usar o fuso do processo — *"Padrão da borda antes (Recommended)"* |
