---
id: "D-2026-11-26-ESCALA-BASE-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-ESC-1..16 da escala como módulo base — questionário do dono em 26/11"
estado: "decided"
autorizacao: "dono, chat, 2026-11-26: \"faz o questionário dos forks F-ESC comigo\" e, depois de interromper o 4º bloco, \"Segue\"; questionário (AskUserQuestion) em 4 blocos, todos respondidos na opção recomendada. Respostas literais: F-ESC-1 → \"DynamicTable no Core (Recommended)\"; F-ESC-2 → \"Core, tabelas visíveis (Recommended)\"; F-ESC-3 → \"Tabela resources + alvo XOR (Recommended)\"; F-ESC-4 → \"Ciclo de N dias com âncora (Recommended)\"; F-ESC-5 → \"Recusa, com encaixe registrado (Recommended)\"; F-ESC-11 → \"Conflito por pessoa (Recommended)\"; F-ESC-16 → \"Passa pelo gate e encaixa (Recommended)\"; F-ESC-15 → \"Sem escala = sem restrição (Recommended)\"; F-ESC-6 → \"Projeção pela borda BR (Recommended)\"; F-ESC-7 → \"Projeção em 2 etapas (Recommended)\"; F-ESC-8 → \"DpJornada segue a fonte (Recommended)\"; F-ESC-10 → \"Mesma escala + origin (Recommended)\"; F-ESC-12 → \"Migra e aposenta (Recommended)\"; F-ESC-13 → \"units.timeZone IANA (Recommended)\"; F-ESC-14 → \"Aceita fora da transação (Recommended)\"; F-ESC-9 → \"Fora desta fase (Recommended)\". Escopo: ratificar os forks do PRE-ADR e do BRIEF. Não é 'executa' de nenhum PR do BRIEF."
atualizado: "2026-11-26"
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

## Emenda 3 (27/11): leitura de disponibilidade (itens 31 e 32, `L-20261127-020426-4039`)

| Fork | Achado | Decisão |
|---|---|---|
| F-ESC-20 profissional da unidade no free-slots (item 32) | Sem `employeeId`, o BRIEF não define quem é "profissional da unidade" | Dono, chat, 2026-11-27, questionário: entra quem tem a unidade no cadastro (`employees.unitId`) ou tem padrão vivo nela. Quem não tem nenhum dos dois fica fora da lista da unidade, embora o gate aceite agendar com ele (F-ESC-15) — *"Cadastro ou escala (Recommended)"* |
| Alvo sem padrão vivo na leitura (item 31) | Sem fork, caminho único pela paridade com o gate (F-ESC-15 a): a leitura devolve a janela inteira com `unrestricted: true` | Decidido pela sessão de planejamento |
| Formato do `GET /api/scheduling/availability` (item 31) | Sem fork, caminho único: `{ unrestricted, intervals }`, o mínimo para o FE distinguir "livre o dia todo" de "sem horário" | Decidido pela sessão de planejamento |
