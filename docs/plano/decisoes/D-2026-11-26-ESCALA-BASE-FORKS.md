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
