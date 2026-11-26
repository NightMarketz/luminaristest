# PRE-ADR-ESCALA-DISPONIBILIDADE — Escala como módulo base: a disponibilidade de um recurso, lida pela agenda e pelo DP

- **Data:** 2026-11-26
- **Status:** **Proposed** — forks F-ESC-1..16 **RATIFICAÇÃO PENDENTE** (§5). Não autoriza código.
- **Autorização:** dono, chat, 2026-11-26, questionário. Pergunta: *"Escala como módulo base (disponibilidade do
  profissional, CLT ou parceiro, lida pela agenda e pelo DP): autoriza planejar o PRE-ADR e o BRIEF? É só documento, sem
  código e sem 'executa'."* Resposta: *"Planejar (Recomendado)"*.
- **Escopo da autorização (passo 1 da `sessao-planejamento`):** cobre este PRE-ADR, o BRIEF
  [`BE-INCR-ESCALA-BASE-brief.md`](../accounting/BE-INCR-ESCALA-BASE-brief.md) e a nota do nó
  [`ESCALA-BASE`](../plano/nos/ESCALA-BASE.md). Não cobre código nem `executa`. **Divergência declarada:** o protocolo do
  vault (`docs/plano/README.md`, fim do §Fold) diz que proposta nova vira nó só depois do PRE-ADR ratificado. O nó nasce
  agora porque a tarefa e a autorização pedem; o estado dele diz que o PRE-ADR está pendente, e o `autorizacao` limita o
  escopo ao documento.
- **Ordem do dono (26/11):** (1) núcleo do DP (F2 + ponte folha → razão); (2) **a escala como módulo base, ligando agenda
  e DP**; (3) compilador de binding, em paralelo; (4) varejo; (5) eSocial depois dos contadores. Núcleo primeiro; lei e
  alíquota na borda e no fim.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `40b6ab8f4` (26/11).
- **Respeita:** Contrato §2.1–2.3 (`AC-2.1-B1..B5`), [`ADR-PERSISTENCE-BOUNDARY`](ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md),
  [`ADR-PAIS-NA-BORDA`](ADR-PAIS-NA-BORDA.md) (Accepted 24/11, R1–R7), [`ADR-ARCH-BOUNDARIES`](ADR-ARCH-BOUNDARIES.md),
  [`ADR-DOMAIN-MOTOR-rejected`](ADR-DOMAIN-MOTOR-rejected.md), [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL`](PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md)
  (F-DP-1 `employeeRef`), D-2026-10-31-MODULOS-BASE-SUBMODULOS (`employees` no Core), D-2026-11-06-DP-BRIEF-F2 (F-DPF-1/2:
  divisor e DSR pela escala da `DpJornada`), D-2026-11-07-PES4-F2-EMPREGO-UNICO-E-12X36 (12×36 é do `DP-PONTO`).

## TLDR (2 linhas)

A escala operacional (quem está disponível, onde e quando) é desenhada pelo usuário e vale para qualquer recurso: CLT,
parceiro, sócio, sala, máquina. Ela mora em DynamicTable no Core, onde o gate da agenda já roda. A jornada contratual do CLT
continua na `DpJornada` (Prisma, desenhada pela lei). O que é Prisma e a agenda precisa ver (feriado, férias, afastamento)
chega à escala como **dado projetado** depois do commit, nunca como serviço injetado no motor. **Risco principal:** o gate
da agenda roda em `beforeCreate`, fora da transação, e hoje já confere um horário (`employees.workSchedule`) com dois
defeitos medidos. A troca precisa migrar esse dado sem que a agenda passe a recusar o que hoje aceita, nem o contrário.

## 0. Correção da premissa: a agenda já lê uma escala

A tarefa registrou que *"a agenda hoje não lê disponibilidade nem escala"* (grep de 26/11 por escala, jornada,
disponibilidade, availability). **O grep não pegou o nome em inglês `workSchedule`.** Estado medido nesta sessão, lendo os
arquivos (grau V):

| Fato | Onde |
|---|---|
| A tabela `employees` (Core, instalada para todo usuário) tem o campo `workSchedule` (JSON), no formato `{ "monday": { "start": "09:00", "end": "18:00" } }` | `presets/modules/core/EmployeesModule.ts:54-60`; `systems/CoreSystemPreset.ts:22` |
| O FE grava `{ [dia]: { active, start, end } }`. Desligar um dia muda só o `active` e deixa `start`/`end` | `my-app/.../dynamic-form-fields/WorkScheduleField.tsx:37-40, 70-95` |
| O `AppointmentsPlugin` recusa agendamento fora do horário do dia (`assertWithinEmployeeHours`), lendo o `employees` pelo `ctx.repository` | `rules/plugins/AppointmentsPlugin.ts:74-76, 96-117` |
| O plugin **ignora `active`**: dia desligado com `start`/`end` preenchidos conta como dia de trabalho. Dia ausente no JSON aceita qualquer horário | `AppointmentsPlugin.ts:103-106` |
| O plugin usa `getDay()` e `getHours()`, que leem o fuso do processo Node. O `server/Dockerfile` (`node:22-slim`) não define `TZ`, e só o Vitest do `my-app` fixa `America/Sao_Paulo` (`ci.yml:360-367`). Com o processo em UTC, "09:00–18:00" é conferido em UTC. **Grau I** quanto ao fuso de produção (não medi o processo em execução) | `AppointmentsPlugin.ts:102, 111-112` |
| O `EmployeesPlugin` aceita um funcionário sem unidade se houver um dia com `start`/`end`, e também ignora `active` | `rules/plugins/EmployeesPlugin.ts:14-25, 30-39` |
| A venda cria agendamento sozinha (`autoCreateAppointmentForServiceItem`: agora + 1 h, 60 min) **direto pelo `ctx.repository.createData`**. Esse caminho não passa pelo `AppointmentsPlugin` nem pelo `noOverlap` | `rules/plugins/sales/appointmentSync.ts:116-133` |
| Conflito entre agendamentos: `noOverlap` com escopo `(unitId, responsibleEmployeeId)`, re-checado na transação sob fila por tabela; `isSystem` pula a fila | `planning/AppointmentsModule.ts:54-61`; `services/DynamicTableService.ts:1049-1058` |
| `beforeCreate` dos plugins roda **fora** da transação | `DynamicTableService.ts:602-603` |

Consequência para o desenho: **a escala já existe como dado de DynamicTable no Core, lido pelo motor.** O PRE-ADR troca um
JSON sem vigência, sem exceção e sem fuso por um módulo de escala. A agenda não passa de "nada" a "algo". Os dois defeitos
(dia desligado aceito; fuso do processo) foram para a caixa (§8) porque valem hoje, antes de qualquer BRIEF.

## 1. Objetivo (sob a letra)

O pedido é "escala como módulo base". O objetivo por baixo é este: **quem não é CLT também precisa de disponibilidade na
agenda, e a agenda e o DP precisam ler a mesma verdade sobre quem está disponível.** No salão, muitas vezes quem atende é
profissional-parceiro (Lei 12.592), sem vínculo e sem `DpVinculo`. Se a escala morasse só no DP, o parceiro ficaria sem
escala. Se a agenda continuasse num JSON próprio, a folga e as férias do CLT, que o DP sabe, não chegariam à agenda.

Fica fora: ponto (registro de jornada realizada, `DP-PONTO`), cálculo de hora extra, adicional noturno e trabalho em
feriado (DP), conformidade legal da escala do CLT (DP, §6), FE (nó vizinho), escala de outro país.

## 2. Evidência

### 2.1 Plano e decisões

| Fonte | O que fixa | Grau |
|---|---|---|
| `ADR-PERSISTENCE-BOUNDARY` §2.1 | "O usuário desenha o esquema? (catálogo, **agenda**, venda…) → DynamicTable" | V |
| Contrato `AC-2.1-B1`, `B4` | Nunca injetar serviço Prisma no `DynamicTableService`/`RuleContext`/`RulePlugin`; nunca mudar o `DynamicTableService` para integrar domínios | V |
| `ADR-PERSISTENCE-BOUNDARY` §4 | Costura fixa: pós-commit → escrita idempotente → `reconcile*()` read-first | V |
| `PRE-ADR-DP` F-DP-1 (a) | Trabalhador e vínculo em Prisma, com `employeeRef` para a linha `employees`; a `employees` "continua sendo a pessoa da agenda e da comissão" | V |
| D-2026-10-31 | Core = `units`, `employees`, `tasks`, `stakeholders`, instalado para todo usuário; AGENDA = AGE-0 (`appointments`) | V |
| D-2026-11-06 (F-DPF-1/2) e `dp/models/escala.ts` | Divisor do salário-hora e DSR leem `DpJornada.diasTrabalho` + `minutosPorDia`; feriado pelo `isHoliday` | V |
| D-2026-11-07 | Jornada 12×36 sem escala até o usuário informar; escala irregular é do `DP-PONTO` (F6) | V |
| `BE-INCR-DP-F0-F1` D-3 | Porta do DP só nasce no BRIEF que a consome ("porta sem consumidor é contrato especulativo") | V |
| `ADR-PAIS-NA-BORDA` R1–R3, R2 (e) | Conceito novo em inglês; "fuso e calendário" do país na borda `paises/<cc>/`; o centro nunca importa `paises/` | V |
| `PRE-ADR-FOLHA-CONTABILIZACAO` §7 | O vínculo (CLT × parceiro × sócio) é dado da lei, no lado Prisma; o plugin de comissão continua sem saber do vínculo | V |

### 2.2 Código (fato consumado)

Além do §0:

| Fato | Onde | Grau |
|---|---|---|
| `DpJornada`: `diasTrabalho` (máscara SEG..DOM), `minutosPorDia`, `tipoJornada` do S-2200; 12×36 recusada com `DP_ESCALA_IRREGULAR` | `schema.prisma:4038-4055`; `dp/models/escala.ts:19-40` | V |
| `DpTrabalhador.employeeRef String?` liga o trabalhador à linha `employees` | `schema.prisma:4127` | V |
| `DpAfastamento` (`motivo`, `inicio`, `fim`) e leitura por vínculo `listAfastamentos(scope, vinculoId)` | `schema.prisma:4194`; `dp/services/DpAfastamentoFeriasService.ts:60` | V |
| Férias gozadas com data ainda não existem como registro: só `DpFeriasImplantacao` (saldo) e `getFerias` (período aquisitivo); gozo é do F3 | `DpAfastamentoFeriasService.ts:102-144` | I (não li o F3, que não existe) |
| `isHoliday(dateOnly, feriados, codMun)` sobre `LegalParameter` `FERIADO_NACIONAL`/`FERIADO_LOCAL` | `packages/models/validity.ts:92` | V |
| Caminhos de escrita de `appointments` (grep de todos os chamadores de `createTableData`/`updateTableData` e de `ctx.repository.createData` fora do serviço): rota genérica (`dynamicTablesController.ts:122, 153`), agente do chat (`LuminarisAgentService.ts:293, 297`) e restauração de versão (`DynamicTableVersionService.ts:111`), todos pelo `DynamicTableService`, que roda os plugins; e o agendamento automático da venda (`appointmentSync.ts:133`), direto pelo repositório, **sem** plugin. Os outros chamadores do serviço (CRM, estoque, provisionamento de unidade, venda) não escrevem `appointments` | as linhas citadas | V |
| `date-fns-tz` já é dependência do server | `server/package.json:62` | V |
| Registro de módulos com 7 categorias; Core fora do registro (instalado pelo `CoreSystemPreset`) | `presets/modules/registry.ts:64`; `CoreSystemPreset.ts` | V |

### 2.3 Lei (acervo `ctresb/leis`)

| Ponto | Norma | Grau |
|---|---|---|
| O parceiro não tem vínculo enquanto durar a parceria (§ 11); o vínculo se configura sem contrato formalizado ou com função diferente da do contrato (art. 1º-C). As cláusulas obrigatórias do contrato (§ 10, I a VII) **não** tratam de horário; a mais próxima é o inciso IV ("acesso e circulação nas dependências") | Lei 12.592/2012, art. 1º-A §§ 10 e 11, art. 1º-C (red. Lei 13.352/2016). [acervo](https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md) · fonte `https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592` · `versao_texto` compilada, `baixado_em` 2026-10-13 | V |

A lei não diz se uma escala imposta pelo salão ao parceiro indica subordinação. Isso vai para o §6, como pergunta.

## 3. Modelo proposto (centro, em inglês — R1)

**Conceito universal:** recurso agendável, padrão de disponibilidade, exceção, disponibilidade resolvida. Existe em qualquer
ERP de qualquer país (R5). Vínculo, feriado, CLT e parceria são instâncias de país: ficam na borda ou no DP.

| Peça | Mundo | O quê |
|---|---|---|
| `employees` (existe) | DT, Core | A pessoa da agenda (F-DP-1). Continua sendo o alvo da escala de pessoa |
| `resources` (nova) | DT, Core | Recurso que não é pessoa: sala, cadeira, box, elevador, equipamento, caixa (F-ESC-3) |
| `schedules` (nova) | DT, Core | Padrão de disponibilidade de **um** alvo (pessoa XOR recurso) em **uma** unidade, com vigência e ciclo de N dias ancorado numa data (F-ESC-4) |
| `scheduleShifts` (nova) | DT, Core | Turnos do padrão: dia do ciclo, início em minutos locais, duração |
| `scheduleExceptions` (nova) | DT, Core | Folga, bloqueio, feriado, ausência e horário extra num intervalo. Pode ser da pessoa, do recurso ou da unidade inteira, com `origin` (`USER`, `HOLIDAY_CALENDAR`, `HR`) |
| `units.timeZone` (campo novo) | DT, Core | Fuso IANA da unidade. O default vem da borda do país (BR: `America/Sao_Paulo`) (F-ESC-13) |
| `features/scheduling/models/` | código puro | Resolve disponibilidade = turnos vigentes − exceções de indisponibilidade + extras, no fuso da unidade. Calcula horários livres |
| `features/scheduling/paises/br/` | borda | Projeta os feriados (`isHoliday`) em `scheduleExceptions` de origem `HOLIDAY_CALENDAR` (F-ESC-6) |
| `DpJornada` (existe) | Prisma, DP | **Jornada contratual** do vínculo CLT. Continua a fonte do divisor e do DSR (F-ESC-8) |

**Ligação pessoa ↔ DP:** a escala aponta para a linha `employees`; o DP chega lá por `DpTrabalhador.employeeRef` (F-DP-1).
Nada novo no DP para achar a pessoa.

**Por que o gate fica no plugin.** Três dos quatro caminhos de escrita de `appointments` passam por
`DynamicTableService.createTableData/updateTableData` e pelos plugins (§2.2). Um gate acima do motor (controller ou serviço
de aplicação) seria pulado pela rota genérica, pelo agente do chat e pela restauração de versão. O quarto caminho (o
agendamento automático da venda) grava pelo repositório, dentro de outro plugin. Ele chama a mesma função pura do gate de
forma explícita (F-ESC-16). Para ficar no único ponto que vê todos os caminhos, o
gate só pode ler DynamicTable (`AC-2.1-B1`). Por isso tudo o que a agenda precisa saber e mora em Prisma (feriado, férias,
afastamento) entra na escala **como dado**, escrito por serviço de aplicação depois do commit, idempotente, com reconcile.
É a costura do `ADR-PERSISTENCE-BOUNDARY` §4 no sentido inverso: Prisma → DynamicTable. Não é motor de domínio: as
chamadas são fixas no código.

## 4. Como isso responde às cinco perguntas

| Pergunta | Resposta recomendada | Fork |
|---|---|---|
| Onde mora a escala | DynamicTable no Core (`schedules` + `scheduleShifts` + `scheduleExceptions` + `resources`), ao lado de `employees` | F-ESC-1, F-ESC-2 |
| Como o DP consome a escala de um CLT | A `DpJornada` continua a jornada contratual e a fonte da folha. A escala oferece um contrato de leitura (dias e minutos planejados por pessoa e período). O DP o consome por porta própria, no BRIEF do DP que precisar dele, como o `DP-PONTO` para 12×36 e a conformidade escala × jornada. Nada do F2 reabre | F-ESC-8 |
| Como o parceiro sem vínculo tem escala | Pela mesma escala, porque ela aponta para `employees`, não para `DpVinculo`. O centro não sabe de vínculo. A origem do padrão (`DECLARED` pelo profissional × `ASSIGNED` pela empresa) é dado do centro; o alerta de risco de vínculo é da borda BR, depois do §6 | F-ESC-10 |
| Conflito, folga e feriado na agenda | Conflito: `noOverlap` por pessoa (sem a unidade no escopo) e por recurso. Folga e ausência: exceção na escala; a exceção com alvo vale para a pessoa ou o recurso em qualquer unidade, e a sem alvo vale para a unidade inteira. Feriado: exceção projetada pela borda BR, que o usuário pode apagar para abrir no feriado. Fora da disponibilidade: recusa, salvo encaixe explícito e registrado | F-ESC-5, F-ESC-6, F-ESC-7, F-ESC-11, F-ESC-14, F-ESC-15, F-ESC-16 |
| Outros setores | Clínica: médico em plantão (ciclo), sala e equipamento como `resources`. Oficina: box e elevador como recurso, mecânico com escala. Loja com turno: escala de caixa e vendedor sem agenda (a escala não depende de AGE-0). Indústria e saúde: 12×36 e revezamento pelo ciclo de N dias | F-ESC-2, F-ESC-3, F-ESC-4 |

## 5. Forks — RATIFICAÇÃO PENDENTE

Cada fork traz a opção estrutural primeiro (D-2026-11-21). "Reabre" lista a decisão fechada que a opção desfaria; opção que
reabre decisão é `DECISÃO ARQUITETURAL` e não é recomendada aqui.

| Fork | Recomendação | Reabre algo? |
|---|---|---|
| F-ESC-1 Onde mora a escala | (a) DynamicTable | não |
| F-ESC-2 Posição no registro | (a) Core | não |
| F-ESC-3 Recurso que não é pessoa | (a) tabela `resources` + alvo XOR | não |
| F-ESC-4 Forma do padrão | (a) ciclo de N dias com âncora | não |
| F-ESC-5 O que a agenda faz fora da disponibilidade | (a) recusa, com encaixe explícito | não |
| F-ESC-6 Feriado | (a) exceção projetada pela borda BR | não |
| F-ESC-7 Férias e afastamento do CLT na agenda | (a) projeção DP → escala, em duas etapas | não |
| F-ESC-8 Como o DP consome a escala | (a) `DpJornada` segue a fonte; contrato de leitura para porta futura | não |
| F-ESC-9 Workflow de aprovação de escala | (b) fora desta fase | não |
| F-ESC-10 Escala do parceiro | (a) mesma escala + `origin` DECLARED/ASSIGNED | não |
| F-ESC-11 Conflito entre unidades | (a) `noOverlap` por pessoa | não (muda comportamento de AGE-0) |
| F-ESC-12 `workSchedule` legado | (a) migra e aposenta | não |
| F-ESC-13 Fuso | (a) `units.timeZone` IANA | não |
| F-ESC-14 Gate fora da transação | (a) aceita o preflight | não |
| F-ESC-15 Recurso sem escala | (a) sem restrição | não |
| F-ESC-16 Agendamento automático da venda | (a) passa pelo gate e grava encaixe | não |

### F-ESC-1 — Onde mora a escala

- **(a)** DynamicTable no Core: `schedules`, `scheduleShifts`, `scheduleExceptions` (e `resources`, F-ESC-3). O gate da
  agenda lê pelo `ctx.repository`, como já lê `workSchedule`. O DP lê de fora do motor, pelo serviço (ler DT a partir de
  Prisma é permitido; o proibido é o contrário).
- **(b)** Prisma first-class (`features/scheduling` com `Schedule`, `ScheduleShift`, `ScheduleException`). O plugin não pode
  ler (`AC-2.1-B1`). O gate teria de subir ao controller, e a rota genérica e o agente do chat o pulariam. Para fechar, ou se
  injeta o serviço no motor (proibido) ou se muda o `DynamicTableService` (proibido, `B4`).
- **(c)** Dentro do DP: a `DpJornada` vira a escala, e o parceiro ganha um `DpTrabalhador` sem vínculo. O módulo da lei
  passaria a guardar quem não tem vínculo, a agenda passaria a depender do DP, e o plugin continuaria sem poder ler.
- **Recomendação: (a).** A escala operacional é desenhada pelo usuário (cada setor nomeia turnos e exceções do seu jeito) e
  não tem nenhum dos quatro gatilhos do `ADR-PERSISTENCE-BOUNDARY` §2.1: não é escrita multi-tabela com gate, não é agregação
  em volume, não é imutável e não é regra de lei. É o único lugar onde o gate da agenda continua no ponto que todos os
  caminhos atravessam. (b) e (c) quebram o `B1` ou abrem um caminho de escrita sem gate.

### F-ESC-2 — Posição no registro de módulos

- **(a)** Core (`CoreSystemPreset`), instalado para todo usuário, como `employees`. A agenda, o DP e a loja sem agenda contam
  com a escala. Instâncias existentes recebem as tabelas pela sincronização de preset.
- **(b)** Categoria nova `escala` no `MODULE_REGISTRY` (base fixa `ESC-0`), opcional; AGE-0 lê se existir.
- **(c)** Submódulo da agenda (`AGE-ESC`). A loja com turno e o DP sem agenda ficam sem escala.
- **Recomendação: (a).** O dono chamou de "módulo base", e os dois consumidores (agenda e DP) estão em mundos diferentes. Só
  o Core é garantido a ambos. (b) cria uma categoria cuja ausência o DP teria de tratar. (c) amarra a escala à agenda, que é
  o oposto do pedido. Custo de (a): quatro tabelas a mais em toda instância. Elas nascem visíveis (`standalone`), para que a
  tabela genérica (`GenericTable`) sirva de tela de edição até o FE próprio existir. Se nascessem ocultas, ninguém editaria
  a escala depois que o `workSchedule` saísse do formulário (F-ESC-12).

### F-ESC-3 — Recurso que não é pessoa

- **(a)** Tabela `resources` (sala, equipamento, box, posto, caixa; `kind` é `select` com opções livres do usuário). A
  escala aponta para `employeeId` **ou** `resourceId` (exatamente um). `appointments` ganha `resourceId` opcional com um
  segundo `noOverlap`.
- **(b)** Tabela `resources` única para tudo, e a pessoa vira um recurso que aponta para `employees`. O agendamento passa a
  apontar para recurso, e isso muda o AGE-0 e cada plugin que lê `responsibleEmployeeId` (comissão, venda).
- **(c)** Só pessoa nesta fase; o recurso vem depois.
- **Recomendação: (a).** Clínica (sala e equipamento) e oficina (box e elevador) são casos desta fase, pela ordem do dono.
  (a) não duplica a pessoa nem toca os plugins que leem `responsibleEmployeeId`. (c) deixa clínica e oficina para uma
  segunda migração.

### F-ESC-4 — Forma do padrão

- **(a)** Ciclo de N dias (1 ≤ N ≤ 56) ancorado numa data. O semanal é N = 7 com âncora numa segunda-feira. O turno guarda
  `{ dayOfCycle, startMinute, durationMinutes }`, e a duração permite passar da meia-noite. Cobre 5×2, 6×1, 12×36 (N = 2),
  24×72 (N = 4), revezamento de 4 semanas (N = 28) e plantão.
- **(b)** Só semanal, como o `workSchedule`, mais exceções.
- **(c)** RRULE (RFC 5545) por turno.
- **Recomendação: (a).** Um modelo só cobre a semana e as escalas irregulares que o DP deixou para depois (D-2026-11-07).
  Quando o `DP-PONTO` chegar, a 12×36 já tem onde morar. (b) deixa 12×36 e plantão sem escala. (c) é expressivo demais para
  o que o usuário desenha e difícil de validar num formulário.

### F-ESC-5 — O que a agenda faz fora da disponibilidade

- **(a)** Recusa com 400 `OUTSIDE_AVAILABILITY`, salvo encaixe explícito: o agendamento traz `availabilityOverride: true` e
  `availabilityOverrideReason`, que ficam gravados no próprio agendamento (e no ledger de versões do motor).
- **(b)** Só avisa e grava.
- **(c)** Recusa sempre.
- **Recomendação: (a).** O salão encaixa cliente fora do horário. (c) empurra o usuário a apagar a escala, e (b) torna a
  escala decorativa. Com (a) o encaixe fica auditável. Para o CLT, encaixe fora da jornada é um fato que o DP vai querer ler
  (hora extra); isso fica para o DP (§6, P3).

### F-ESC-6 — Feriado

- **(a)** Serviço da borda BR (`features/scheduling/paises/br/`) projeta os feriados da unidade (`isHoliday`, com o
  município da unidade) em `scheduleExceptions` de `kind: HOLIDAY`, `origin: HOLIDAY_CALENDAR`, por ano, com chave
  idempotente `(unitId, date)`. O usuário pode apagar a exceção para abrir no feriado. A projeção não recria o que foi
  apagado, porque o soft-delete conta na chave. Roda por job diário, que gera o ano corrente e o seguinte das unidades que
  ainda não os têm (a unidade nova recebe em até 24 h), e por ação explícita. Não há gancho na criação da unidade: ela é
  linha de DT criada por três caminhos (rota genérica, provisionamento, CLI de rekey), e o plugin não pode ler o
  `LegalParameter`.
- **(b)** A agenda ignora feriado; o usuário cadastra à mão.
- **(c)** Configuração da unidade ("abre em feriado") e o gate lê o `LegalParameter`. Impossível no plugin (`B1`).
- **Recomendação: (a).** Feriado é calendário de país (R2 e): a borda calcula e o centro só vê exceções. Abrir ou não no
  feriado é escolha do usuário, e apagar a exceção expressa isso sem flag nova.

### F-ESC-7 — Férias e afastamento do CLT na agenda

- **(a)** Projeção DP → `scheduleExceptions` (`kind: ABSENCE`, `origin: HR`, somente leitura para o usuário), chave
  idempotente `(sourceType, sourceId)`. **Versão incremental:** (a1) nesta fase, um job de reconcile read-first lê os
  afastamentos pelo serviço do DP e sincroniza, sem mudar `features/dp/**`; (a2) no BRIEF do DP que tocar afastamento e
  férias (F3), o serviço do DP chama a projeção depois do commit, e o job fica como rede.
- **(b)** Só o job, para sempre.
- **(c)** Não projeta; o usuário marca a folga à mão.
- **Recomendação: (a).** (c) deixa a agenda marcar cliente com quem está de licença, sabendo o sistema que está. (a1) entrega
  já sem tocar o DP, que tem sessão viva. (a2) tira o atraso do job quando o DP for emendado.
- **Limite:** férias gozadas com data só existem no F3 do DP (§2.2). Até lá, a projeção cobre só `DpAfastamento`.

### F-ESC-8 — Como o DP consome a escala de um CLT

- **(a)** A `DpJornada` continua a jornada contratual e a fonte do divisor e do DSR (F-DPF-1/2 ficam). A escala define e
  testa um contrato de leitura (`PlannedScheduleReader`: dias e minutos planejados por pessoa, unidade e período). A porta do
  DP que o consome nasce no BRIEF do DP que precisar dele (D-3), por exemplo o `DP-PONTO` (12×36, previsto × realizado) ou a
  conformidade escala × jornada × lei. A conformidade é do DP, como pendência, porque é regra de lei.
- **(b)** A escala vira a fonte do divisor e do DSR, no lugar de `DpJornada.diasTrabalho/minutosPorDia`. **Reabre** F-DPF-1/2
  e D-2026-11-07, e põe dado mutável desenhado pelo usuário no cálculo da folha.
- **(c)** O DP gera a escala a partir da jornada (DP é a fonte, a agenda é projeção). O parceiro fica sem fonte, e a escala
  real do salão (quem cobre qual sábado) não cabe na jornada contratual.
- **Recomendação: (a).** Jornada contratual (o que o contrato diz) e escala (quem está disponível quando) são duas coisas,
  com donos diferentes. (a) liga as duas sem reabrir nada do F2.
- **Nota:** o contrato de leitura é definido e testado aqui porque o *slot finder* da agenda já o consome. O que nasce só
  quando o DP pedir é a porta do lado do DP.

### F-ESC-9 — Aprovação de escala (rascunho → publicada)

- **(a)** Estado `DRAFT`/`PUBLISHED` com troca de turno entre pessoas.
- **(b)** Fora desta fase: a escala vale ao gravar.
- **Recomendação: (b).** O caso do dono é disponibilidade para a agenda e o DP. A publicação é workflow de gestão de equipe,
  e cabe como submódulo depois, sem mudar o modelo (seria um campo a mais).

### F-ESC-10 — Escala do parceiro

- **(a)** A mesma escala, com o campo `origin` do padrão: `DECLARED` (informado pelo profissional) ou `ASSIGNED` (definido
  pela empresa). O padrão é `DECLARED`. O gate trata os dois igual. O centro não sabe de vínculo.
- **(b)** Escala separada para parceiro.
- **(c)** Parceiro sem escala; agenda livre para ele.
- **Recomendação: (a).** Disponibilidade declarada × escala atribuída é um conceito que existe em qualquer país (prestador ×
  empregado). Se e como alertar o salão sobre risco de vínculo é da borda BR e depende da pergunta P1 (§6). (c) é o problema
  que o dono quer resolver.

### F-ESC-11 — Conflito entre unidades

- **(a)** `noOverlap` de `appointments` com escopo só `responsibleEmployeeId` (a pessoa não está em duas unidades ao mesmo
  tempo) e um segundo com escopo `resourceId`. A escala também recusa turnos da mesma pessoa que se sobrepõem em unidades
  diferentes.
- **(b)** Mantém o escopo `(unitId, responsibleEmployeeId)`.
- **Recomendação: (a).** Hoje a mesma pessoa pode ser agendada em duas unidades no mesmo horário (§0). Uma rede de salões com
  profissional que circula é o caso comum da multiunidade. **Muda comportamento de AGE-0:** agendamento duplicado que hoje
  existe passa a ser recusado na próxima edição. O BRIEF mede antes (item de inventário).

### F-ESC-12 — `workSchedule` legado

- **(a)** Migração de dado: cada `employees.workSchedule` vira um `schedules` semanal (N = 7) na unidade do funcionário, só
  com os dias `active`. O gate passa a ler só a escala. O campo fica `readOnly` e some do formulário. A remoção é numa fatia
  posterior.
- **(b)** O `workSchedule` continua a fonte da escala semanal da pessoa, e a tabela nova serve só para recurso e exceção.
- **(c)** Apaga sem migrar.
- **Recomendação: (a).** Uma fonte só. (b) mantém duas formas de escala para a mesma pessoa, com o defeito do `active`. (c)
  perde dado do usuário. Na migração, o dia desligado (`active: false`) **não** vira turno. A agenda passa a recusar nesse
  dia, como o usuário pediu ao desligá-lo; a mudança vai no corpo do PR.

### F-ESC-13 — Fuso

- **(a)** Campo `timeZone` (IANA) na `units`, com default dado pela borda do país (BR: `America/Sao_Paulo`). O gate e o
  *slot finder* convertem instante ↔ hora local da unidade (`date-fns-tz`).
- **(b)** Um fuso por instância.
- **(c)** `TZ=America/Sao_Paulo` no processo do servidor.
- **Recomendação: (a).** Turno é hora local de um lugar. (c) conserta o defeito de hoje mas amarra o servidor a um fuso e
  quebra a unidade em outro fuso (Manaus, Fernando de Noronha). (b) é (a) sem a unidade. O campo é universal; o default é da
  borda (R2 e).

### F-ESC-14 — Gate fora da transação

- **(a)** Aceita o preflight em `beforeCreate`/`beforeUpdate`, fora da transação, como os outros plugins. A corrida (escala
  muda entre o preflight e o commit) é rara, e o resultado se desfaz remarcando. O `noOverlap` continua dentro da transação.
- **(b)** Re-checa dentro da transação. Exigiria um gancho de plugin em transação no `DynamicTableService` (`B4`) ou um
  `noOverlap` declarativo contra outra tabela, que o motor não tem.
- **Recomendação: (a).** A regra "gate autoritativo dentro da tx" é para invariante que não se desfaz (período, saldo). Um
  agendamento fora da escala se remarca. Se o dono quiser (b), é PRE-ADR do motor, não desta fase.

### F-ESC-16 — Agendamento automático da venda

- **(a)** O `autoCreateAppointmentForServiceItem` resolve a disponibilidade com a mesma função pura do gate (lendo as linhas
  pelo `ctx.repository`) e confere conflito com os agendamentos vivos do profissional. Se o horário padrão (agora + 1 h)
  estiver fora ou em conflito, ele procura o primeiro horário livre do dia. Se não houver, grava com
  `availabilityOverride: true` e motivo `AUTO_FROM_SALE`. A venda não falha por causa da escala.
- **(b)** Recusa a venda quando não há horário.
- **(c)** Mantém como está (fora do gate).
- **Recomendação: (a).** A venda no balcão não pode travar por agenda, e (c) deixa um caminho que ignora a escala e o
  conflito (lacuna `L-20261126-180939-51cf`). (a) mantém a venda andando e deixa o encaixe registrado.

### F-ESC-15 — Recurso sem escala

- **(a)** Sem escala = sem restrição (o que acontece hoje quando o `workSchedule` está vazio).
- **(b)** Sem escala = indisponível.
- **Recomendação: (a).** (b) trava a agenda de toda instância que ainda não cadastrou escala. Quem quiser restringir
  cadastra a escala.

## 6. Pendente de validação externa

| # | Pergunta exata | Para quem | Efeito no desenho |
|---|---|---|---|
| P1 | Num contrato de parceria (Lei 12.592), a empresa registrar no sistema uma escala de horário **definida por ela** para o profissional-parceiro é indício de subordinação (CLT art. 3º, não conferido no acervo nesta sessão, grau A) que ajude a configurar vínculo? A disponibilidade **informada pelo profissional** tem o mesmo risco? | advogado trabalhista | Só a borda BR: um alerta (`ASSIGNED` + parceiro). O centro já separa `DECLARED`/`ASSIGNED` (F-ESC-10) |
| P2 | Trabalho do CLT em feriado (Lei 605/1949, art. 9º) e abertura do comércio em feriado por convenção coletiva (Lei 10.101/2000, art. 6º-A); artigos não conferidos no acervo nesta sessão (grau A) | contador / leitura no acervo no BRIEF do DP | Do DP. A escala só mostra a exceção `HOLIDAY` apagada |
| P3 | Conformidade da escala do CLT: limite semanal, DSR, interjornada e intervalo (CLT arts. 58, 59-A, 66, 67, 71) e domingo no comércio | DP (BRIEF próprio) | Do DP, pela porta do F-ESC-8. Os artigos ainda não foram conferidos no acervo nesta sessão (grau A) |

## 7. Insumos ausentes

- Como o `noOverlap` trata o escopo nulo (agendamento sem profissional): ler `GovernanceEngine.ts` no PR que mudar o escopo
  (BRIEF item de inventário).
- Data das férias gozadas: não existe antes do F3 do DP (F-ESC-7, limite).
- O fuso do processo em produção: o `server/Dockerfile` (`node:22-slim`) não define `TZ`, e a imagem roda em UTC por
  padrão (grau I: não medi o processo em execução).

## 8. Achados fora de escopo (na caixa)

- `L-20261126-180055-8f07` (defeito · produto · G3 · E1 · silencioso · verificado): dia desligado no `workSchedule` aceito
  pela agenda (`AppointmentsPlugin.ts:103-106` × `WorkScheduleField.tsx:37-40`).
- `L-20261126-180056-7893` (defeito · produto · G3 · E1 · silencioso · inferido): fuso do processo na conferência de horário
  (`AppointmentsPlugin.ts:102, 111-112`; a evidência gravada na caixa diz 113-114 por engano).
- `L-20261126-180939-51cf` (defeito · produto · G3 · E2 · silencioso · inferido): o agendamento automático da venda
  grava pelo repositório, fora do gate e do `noOverlap` (`appointmentSync.ts:133`). Fecha pelo F-ESC-16.

O BRIEF substitui esse código (F-ESC-12, F-ESC-13). A lacuna fica porque o
defeito vale hoje e o BRIEF ainda não tem `executa`.

## 9. Riscos e vieses (T8)

- **Viés de ancoragem no motor:** recomendei DT em quase tudo porque o gate já está lá. Caso adversarial testado: "e se a
  escala precisar de atomicidade com o DP?". Não precisa. Nenhuma escrita da escala mexe no razão ou na folha. A folha lê a
  `DpJornada` (F-ESC-8 a), e a projeção do DP é idempotente com reconcile.
- **Premissa errada da tarefa (§0):** um grep por palavra em português perdeu o `workSchedule`. Corrigi lendo os plugins. Os
  forks F-ESC-11 e F-ESC-12 mudam comportamento visível da agenda de hoje; por isso o BRIEF mede antes de mudar.
- **Quatro tabelas no Core** de toda instância (F-ESC-2 a): custo de UI e de sincronização de preset. Elas ficam visíveis
  na tabela genérica, que é a tela de edição até o FE próprio.
- **Projeção = dado duplicado** (feriado e afastamento viram linha de DT). A verdade continua no lado Prisma; a linha é
  derivada, com chave idempotente e reconcile. Se a projeção atrasar, a agenda aceita um agendamento que deveria recusar
  (silencioso). O job de reconcile tem caso de alerta (regra F-OBS-14).
