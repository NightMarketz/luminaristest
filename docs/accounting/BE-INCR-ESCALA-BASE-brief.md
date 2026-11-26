# BE-INCR-ESCALA-BASE — BRIEF: escala como módulo base (disponibilidade de recurso, lida pela agenda e pelo DP)

- **Data:** 2026-11-26 · **Autor:** `sessao-planejamento` (agente) · **Base:** `origin/main` `40b6ab8f4`
- **Estado:** BRIEF escrito; forks F-ESC-1..16 **RATIFICAÇÃO PENDENTE** (no [PRE-ADR](../adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md) §5);
  **sem `executa`**. Nó: [`ESCALA-BASE`](../plano/nos/ESCALA-BASE.md).
- **Condicional:** o checklist segue o caminho recomendado de cada fork. Cada item diz de que fork depende (`[F-ESC-n]`).
  Fork decidido contra a recomendação → o item marcado é reescrito antes do `executa`. Item sem marca é direto.
- **Escopo:** backend. O FE (tela da escala, seletor de horário livre na agenda, encaixe) é o nó vizinho `FE-INCR-ESCALA`,
  a abrir. As rotas de leitura que ele consome saem no PR-3. Até lá, a tabela genérica edita a escala (item 10).
- **Branch:** `integration/escala-base` (feature com 6 PRs no mesmo tema, D-2026-11-10). Um PR por fase, nascido em draft;
  cada item é um commit com o número no título (D-2026-11-25).

## TLDR

A escala sai do JSON `employees.workSchedule` e vira quatro tabelas DynamicTable no Core: `resources`, `schedules`,
`scheduleShifts`, `scheduleExceptions`. Ela vale para pessoa (CLT, parceiro, sócio) e para recurso (sala, box,
equipamento). O gate da agenda continua no `AppointmentsPlugin`, que agora resolve a disponibilidade no fuso da unidade e
aceita encaixe registrado. Feriado e afastamento do DP chegam à escala como dado projetado. A `DpJornada` não muda.
**Risco principal:** PR-2 troca o que a agenda recusa (dia desligado passa a recusar; mesma pessoa em duas unidades passa a
conflitar). Por isso ele começa medindo o dado real e diz no corpo do PR quantas linhas mudam de comportamento.

## 0. Autorização, decisões e insumos

- **Autorização:** dono, chat, 2026-11-26, questionário: *"Escala como módulo base (disponibilidade do profissional, CLT ou
  parceiro, lida pela agenda e pelo DP): autoriza planejar o PRE-ADR e o BRIEF? É só documento, sem código e sem
  'executa'."* → *"Planejar (Recomendado)"*. Cobre este BRIEF, o PRE-ADR e a nota do nó. **Não** cobre código.
- **Decisões que este BRIEF respeita sem reabrir:** Contrato §2.1 (`B1`, `B4`); `ADR-PERSISTENCE-BOUNDARY`;
  `ADR-PAIS-NA-BORDA` (R1 nomes novos em inglês, R2 calendário na borda, R3 porta no centro, F-PBA-3 controller, rota e job
  no lugar de sempre); F-DP-1 (`employeeRef`); F-DPF-1/2 (divisor e DSR pela `DpJornada`); D-2026-11-07 (12×36 no
  `DP-PONTO`); D-3 do F0+F1 (porta do DP só com consumidor); D-2026-10-31 (`employees` no Core).
- **Fatos de código:** PRE-ADR §0 e §2.2 (lidos nesta sessão). O principal: o gate atual é
  `AppointmentsPlugin.assertWithinEmployeeHours` sobre `employees.workSchedule`, e os caminhos de escrita de `appointments`
  (rota genérica e agente do chat) passam todos pelo `DynamicTableService` e pelos plugins.

## 1. Mapa-alvo

| Camada | Onde | O quê |
|---|---|---|
| Tabelas (DT, Core) | `presets/modules/core/{Resources,Schedules,ScheduleShifts,ScheduleExceptions}Module.ts` + `CoreSystemPreset.ts` | esquema desenhado pelo usuário |
| Campo novo | `UnitsModule.ts` (`timeZone`), `AppointmentsModule.ts` (`resourceId`, `availabilityOverride`, `availabilityOverrideReason`) | |
| Plugins (motor) | `SchedulesPlugin.ts` (novo), `AppointmentsPlugin.ts`, `EmployeesPlugin.ts` | leem só DT (`B1`) |
| Centro puro | `features/scheduling/models/` (`availability.ts`, `cycle.ts`, `rows.ts`) | resolve disponibilidade e horário livre |
| DTO | `features/scheduling/dtos/` | Zod `.strict()` das linhas e das rotas |
| Portas (centro) | `features/scheduling/ports/` (`HolidayCalendarPort`, `AbsenceSourcePort`, `PlannedScheduleReader`) | R3 |
| Serviços | `features/scheduling/services/` (`AvailabilityService`, `HolidayExceptionService`, `HrAbsenceProjectionService`, `WorkScheduleMigrationService`) | fora do motor |
| Repositório | `features/scheduling/repositories/SchedulingRowRepository.ts` | lê e escreve as linhas pelo `DynamicTableService` (`isSystem` só nas projeções) |
| Política | `features/scheduling/policies/SchedulingPolicy.ts` | |
| Borda BR | `features/scheduling/paises/br/adapters/BrHolidayCalendarAdapter.ts` | `isHoliday` + `LegalParameter` `FERIADO_*` |
| Aplicação | `controllers/schedulingController.ts`, `routes/scheduling.ts`, `routes/docs/scheduling.paths.ts`, `jobs/SchedulingHolidaySyncScheduler.ts`, `jobs/SchedulingHrAbsenceReconcileScheduler.ts` | F-PBA-3 (a) |
| Composição | `lib/factory.ts` | liga as portas aos adaptadores |

## 2. Checklist de comportamentos

### PR-0 — Contrato e núcleo puro (nada instala, nada muda de comportamento)

1. `features/scheduling/dtos/rows.ts`: os schemas Zod da §3.1 (`scheduleShiftSchema`, `scheduleSchema`,
   `scheduleExceptionSchema`, `resourceSchema`). Teste: cada `superRefine` tem um caso que passa e um que falha (XOR de
   alvo, `validTo ≥ validFrom`, `endAt > startAt`, data fora do calendário como `2027-02-30` recusada pelo
   `isValidDateOnly`, não só por regex). [F-ESC-3, F-ESC-4]
2. `models/cycle.ts` `dayOfCycle(date, anchor, n)`: `((dia(date) − dia(anchor)) mod n + n) mod n + 1`, contado no número de
   dia (date-only, sem `Date` local). Teste com data antes da âncora, n = 1, n = 7, n = 56. [F-ESC-4]
3. `models/availability.ts` `expandShifts(schedules, range, timeZone)`: os intervalos `[início, fim)` em instante UTC dos
   turnos vigentes no intervalo, começando **um dia antes** do intervalo, para pegar o turno que passa da meia-noite.
   Conversão hora local → instante por `date-fns-tz` (`fromZonedTime`). Teste: 12×36 noturno (N = 2, 19:00 + 720 min),
   intervalo que corta a meia-noite, fuso `America/Manaus` e `America/Sao_Paulo`. [F-ESC-4, F-ESC-13]
4. `resolveAvailability({ schedules, exceptions, timeZone, range })` = união dos turnos − exceções de indisponibilidade
   (`DAY_OFF`, `BLOCK`, `ABSENCE`, `HOLIDAY`) + exceções `EXTRA`. A exceção **com alvo** vale para aquela pessoa ou recurso
   em **qualquer** unidade (a pessoa afastada não atende em lugar nenhum). A exceção **sem alvo** vale para todos os alvos
   daquela unidade. A `EXTRA` vence a indisponibilidade no mesmo trecho (o encaixe planejado num feriado). Teste de
   propriedade (`fast-check`): o resultado é ordenado e disjunto, fica dentro do intervalo e não muda se a ordem das
   exceções mudar. [F-ESC-6]
5. `isCovered(available, appointment)`: o agendamento cabe inteiro numa só faixa disponível. Teste das bordas: início igual
   ao início do turno, fim igual ao fim do turno, um minuto além do turno. [F-ESC-5]
6. `freeSlots(available, busy, durationMinutes, stepMinutes)`: inícios possíveis alinhados ao passo, sem sobrepor `busy`.
   Teste: passo 15, duração 45, ocupado no meio do turno. Propriedade: todo slot devolvido passa no `isCovered` e não toca
   em `busy`.
7. Validação da escala de **uma** pessoa (`assertNoOverlappingShifts`): turnos do mesmo padrão não se sobrepõem, inclusive
   o que passa da meia-noite contra o primeiro do dia seguinte; dois padrões da mesma pessoa não se sobrepõem no tempo,
   seja na mesma unidade ou em outra. Erro `SCHEDULE_OVERLAP` com os dois ids. [F-ESC-11]
8. `ports/PlannedScheduleReader.ts`: a interface da §3.2 e a implementação pura `plannedDays(...)` (por dia local: minutos
   e intervalos planejados, já com as exceções). É o contrato que o DP consumirá por porta própria. Aqui ele é usado pelo
   `AvailabilityService` (PR-4). Teste golden: 6×1 de 440 min com um feriado no mês dá o total de minutos esperado.
   [F-ESC-8]
9. Nenhum import de `paises/` no centro (`P1` do `check:arch`) e nenhum serviço Prisma em `models/`.

### PR-1 — Tabelas no Core e regras da escala

10. Quatro módulos de preset no Core, com nomes de tabela, campos e relações da §3.3, registrados no `CoreSystemPreset`.
    As tabelas nascem visíveis (`standalone`): a tabela genérica é a tela de edição da escala até o FE próprio. Sem isso,
    ninguém editaria a escala depois do item 23. [F-ESC-1, F-ESC-2, F-ESC-3, F-ESC-12]
11. `units` ganha `timeZone` (string, IANA, opcional). Sem valor, o default é o da borda do país da instância
    (`paises/br`: `America/Sao_Paulo`). O valor é validado por `Intl.supportedValuesOf('timeZone')`. [F-ESC-13]
12. Instância existente recebe as quatro tabelas e o campo pela sincronização de preset. Teste: usuário criado com o Core
    de antes do PR vê as tabelas depois da sincronização, sem perder linha. (Ler o `PresetSyncService` antes, §6.)
13. `SchedulesPlugin` em `schedules`: XOR de alvo, vigência coerente, ciclo entre 1 e 56, âncora calendário válida, e o
    item 7 contra os padrões vivos da mesma pessoa ou recurso (lidos pelo `ctx.repository`). [F-ESC-3, F-ESC-11]
14. `SchedulesPlugin` em `scheduleShifts`: `dayOfCycle ≤ cycleLengthDays` do padrão-pai e turnos do mesmo padrão sem
    sobreposição (item 7).
15. `SchedulesPlugin` em `scheduleExceptions`: `endAt > startAt`; alvo opcional (ausente = unidade inteira); `kind` e `origin`
    no domínio; usuário não grava `origin ≠ USER` (só `isSystem`). Linha `origin: HR` não é editada nem apagada pelo usuário
    (400 `EXCEPTION_READ_ONLY`). Linha `origin: HOLIDAY_CALENDAR` pode ser apagada (abrir no feriado), não editada. [F-ESC-6, F-ESC-7]
16. `deleteConstraints`: apagar `schedules` apaga os turnos dele (cascata da regra de preset); apagar uma linha `employees`
    ou `resources` com padrão vivo é recusado (`RESTRICT`). Teste dos dois.
17. `removability.ts`: as quatro tabelas são do Core e não saem pela tela de módulos.
18. Rótulos pt/en das tabelas e dos campos (paridade i18n).
19. Teste de isolamento Tier-0: o padrão de outro dono não aparece nem conflita.
20. O `MODULE_REGISTRY` não muda (Core fica fora dele). Teste de que `MODULE_KEYS` continua igual. [F-ESC-2]

### PR-2 — Inventário, migração do `workSchedule` e o gate da agenda (testados juntos)

21. **Inventário antes de mudar (somente leitura, script em `server/src/scripts/`):** por instância, conta (a) os
    funcionários com `workSchedule`; (b) os dias `active: false` com horário; (c) os funcionários com escala e sem unidade;
    (d) os agendamentos vivos `Scheduled` da mesma pessoa que se sobrepõem em unidades diferentes; (e) os agendamentos sem
    profissional. Os números vão no corpo do PR. [F-ESC-11, F-ESC-12]
22. `WorkScheduleMigrationService`: cada `workSchedule` com pelo menos um dia `active` e `start < end` vira um `schedules`
    (N = 7, âncora `2024-01-01`, uma segunda-feira, `validFrom` = data da migração, `origin: DECLARED`,
    `unitId` = `employees.unitId`, ou vazio = qualquer unidade) e os turnos dele. Dia `active: false` não vira turno.
    Idempotente pela marca `migratedFrom = 'workSchedule'` + `employeeId`: rodar duas vezes não duplica. Teste com os
    formatos reais do FE (`active` ausente, `active: false` com horário, `start` vazio). [F-ESC-12]
23. Depois da migração, `employees.workSchedule` fica `readOnly` no preset, e o `EmployeesPlugin` deixa de usar o campo
    (a regra "unidade ou um dia de trabalho" passa a ser "unidade", ou fica sem a segunda metade; ver §6 item 4). [F-ESC-12]
24. `AppointmentsPlugin`: `assertWithinEmployeeHours` sai. No lugar entra `assertWithinAvailability`: lê pelo
    `ctx.repository` os padrões vivos do profissional e do recurso (se houver) na unidade, as exceções com esse alvo em
    qualquer unidade e as exceções sem alvo da unidade (regra do item 4); resolve (item 4) no fuso da unidade (item 11); recusa com 400 `OUTSIDE_AVAILABILITY` (detalhe: alvo e
    intervalo) quando o item 5 falha. Sem padrão vivo para o alvo → passa (F-ESC-15 a). Fecha as lacunas
    `L-20261126-180055-8f07` e `L-20261126-180056-7893`. [F-ESC-5, F-ESC-13, F-ESC-15]
25. Encaixe: `appointments` ganha `availabilityOverride` (boolean, default `false`) e `availabilityOverrideReason` (string).
    Com `true`, o item 24 não recusa, e o motivo passa a ser obrigatório (400 `OVERRIDE_REASON_REQUIRED`). O ledger de versões
    do motor guarda quem gravou. [F-ESC-5]
26. `appointments` ganha `resourceId` (relação `resources`, opcional). O item 24 confere o recurso também. [F-ESC-3]
27. `noOverlap`: o escopo passa a `['responsibleEmployeeId']`, e entra um segundo `noOverlap` com escopo `['resourceId']`.
    Antes de mudar, ler como o `GovernanceEngine` trata escopo vazio (§6 item 1) e provar que agendamentos sem profissional
    não conflitam entre si. [F-ESC-11]
28. O gate vale para os quatro caminhos de escrita (PRE-ADR §2.2). Teste pela rota genérica (`createTableData` e
    `updateTableData`), pelo agente do chat (`LuminarisAgentService`, mesmo serviço) e pela restauração de versão
    (`DynamicTableVersionService`). O quarto caminho, o agendamento automático da venda (`appointmentSync.ts:133`, direto
    pelo `ctx.repository`), passa a chamar a mesma função pura do gate: fora da escala ou em conflito, procura o primeiro
    horário livre do dia; sem horário, grava com `availabilityOverride: true` e motivo `AUTO_FROM_SALE`. A venda não falha
    por causa da escala. Fecha a lacuna `L-20261126-180939-51cf`. `isSystem` continua fora do gate de horário, como hoje
    (manter e testar). [F-ESC-16]
29. Remarcar (`beforeUpdate` que muda `startAt`/`endAt`/profissional/recurso) passa pelo mesmo gate; mudar só o `status`
    não passa (concluir um atendimento antigo não pode falhar porque a escala mudou depois).
30. Teste de regressão do comportamento de hoje que fica: escala semanal migrada aceita o mesmo horário que o
    `workSchedule` aceitava, nos dias `active`, com o processo em `TZ=UTC` e em `TZ=America/Sao_Paulo`.

### PR-3 — Leitura: disponibilidade e horário livre

31. `AvailabilityService.availability(user, { unitId, employeeId | resourceId, from, to })` → as faixas disponíveis (item 4).
    Lê as linhas pelo `SchedulingRowRepository`, fora do motor.
32. `AvailabilityService.freeSlots(user, { unitId, employeeId?, resourceId?, serviceId?, from, to, stepMinutes })`: a
    duração vem do `services.duration` quando há `serviceId`; tira os agendamentos vivos `Scheduled` (busy) do profissional
    e do recurso; devolve os inícios (item 6). Sem `employeeId`, devolve por profissional da unidade.
33. `GET /api/scheduling/availability` e `GET /api/scheduling/free-slots`: Route → Controller → Service → Repository, DTO
    Zod `.strict()` de query (§3.4), `from`/`to` com janela máxima de 31 dias (400 `RANGE_TOO_LARGE`).
34. `SchedulingPolicy.canRead`: o usuário lê a unidade (mesma régua de leitura das tabelas do motor; conferir no PR qual).
    Teste Tier-0: outro dono → 404 ou lista vazia.
35. `docs.paths` + `openapi.json` (+2 paths) e o teste de contagem.
36. Snapshot de shape dos DTOs novos.

### PR-4 — Feriado pela borda BR

37. `ports/HolidayCalendarPort.ts` (centro): `holidaysFor(userId, unitId, year) → string[]` (datas date-only).
38. `paises/br/adapters/BrHolidayCalendarAdapter.ts`: usa `isHoliday` com o `codMun` da unidade e as linhas
    `FERIADO_NACIONAL`/`FERIADO_LOCAL` vigentes. Ligado na `factory.ts`. [F-ESC-6]
39. `HolidayExceptionService.sync(user, { unitId?, year })`: para cada feriado, uma `scheduleExceptions` da unidade
    (`kind: HOLIDAY`, `origin: HOLIDAY_CALENDAR`, dia inteiro no fuso da unidade, `sourceType: 'HOLIDAY'`,
    `sourceId: '<unitId>:<date>'`). Chave idempotente `(sourceType, sourceId)`, **contando a linha apagada**: o feriado que
    o usuário apagou não volta. Devolve `{ created, skipped, deletedByUser }`. [F-ESC-6]
40. `POST /api/scheduling/holidays/sync` (centro; o serviço chama a porta). Política `canManage`; `docs.paths` + `openapi.json` (+1 path).
41. `SchedulingHolidaySyncScheduler` diário: gera o ano corrente e o seguinte das unidades que ainda não os têm. A unidade
    nova recebe os feriados em até 24 h. Não há gancho na criação da unidade: ela é linha de DT criada por três caminhos
    (rota genérica, `SystemProvisioningService`, `rekeyLegacyUnitCli`), e o plugin não pode ler o `LegalParameter`. Teste
    do caso de alerta (regra F-OBS-14).
42. Feriado municipal novo no `LegalParameter` depois do sync → o próximo sync cria só o que falta (teste).

### PR-5 — Afastamento do DP na agenda (etapa a1: reconcile, sem tocar `features/dp/**`)

43. `ports/AbsenceSourcePort.ts` (centro): `absencesFor(userId, range) → { sourceId, employeeRef, unitId, startDate,
    endDate | null }[]`. [F-ESC-7]
44. Adaptador que lê `DpAfastamento` pelos serviços do DP já expostos na factory (`DpVinculoService`,
    `DpAfastamentoFeriasService.listAfastamentos`), achando a pessoa por `DpTrabalhador.employeeRef`. **Antes do código:**
    `npm run check:arch` com o import planejado. Se a regra recusar `scheduling → dp`, o adaptador muda para
    `features/dp/adapters/` no BRIEF do DP, e este item espera (§6 item 3).
45. `HrAbsenceProjectionService.reconcile(user)`: read-first; cria, atualiza ou apaga (`isSystem`) as `scheduleExceptions`
    `kind: ABSENCE`, `origin: HR`, `sourceType: 'DP_ABSENCE'`, `sourceId` = id do afastamento. Afastamento sem fim
    (`fim: null`) vira exceção até o fim da janela de projeção (hoje + 400 dias), renovada a cada reconcile. Vínculo sem
    `employeeRef` → pulado e contado (`skippedNoEmployeeRef`). [F-ESC-7]
46. `SchedulingHrAbsenceReconcileScheduler` diário + caso de alerta (F-OBS-14). Log sem PII (só ids; `ADR-OBSERVABILIDADE`).
47. Teste ponta a ponta: afastamento criado no DP → reconcile → agendamento do profissional naquele dia → 400
    `OUTSIDE_AVAILABILITY`; afastamento apagado → reconcile → o agendamento passa.
48. O parceiro (sem `DpTrabalhador`) não é tocado pela projeção (teste).

## 3. Contratos (esboço materializável)

### 3.1 Linhas (Zod, `features/scheduling/dtos/rows.ts`)

```ts
import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates'; // conferir o caminho do validador de calendário no PR-0

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateOnly, 'data fora do calendário');
const instant = z.string().datetime({ offset: true });
const id = z.string().min(1);

export const SCHEDULE_ORIGINS = ['DECLARED', 'ASSIGNED'] as const;                         // F-ESC-10
export const EXCEPTION_KINDS = ['DAY_OFF', 'BLOCK', 'ABSENCE', 'HOLIDAY', 'EXTRA'] as const;
export const EXCEPTION_ORIGINS = ['USER', 'HOLIDAY_CALENDAR', 'HR'] as const;               // F-ESC-6/7
export const MAX_CYCLE_DAYS = 56;                                                          // F-ESC-4

export const resourceSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.string().min(1).max(40),            // select com opções do usuário (sala, equipamento, box, caixa…)
  unitId: id.optional(),
  isActive: z.boolean().default(true),
}).strict();

export const scheduleSchema = z.object({
  employeeId: id.optional(),
  resourceId: id.optional(),
  unitId: id.optional(),                      // ausente = vale em qualquer unidade (migração de funcionário sem unidade)
  cycleLengthDays: z.number().int().min(1).max(MAX_CYCLE_DAYS),
  cycleAnchorDate: dateOnly,
  validFrom: dateOnly,
  validTo: dateOnly.nullable().optional(),    // inclusive; null = sem fim
  origin: z.enum(SCHEDULE_ORIGINS).default('DECLARED'),
  migratedFrom: z.literal('workSchedule').optional(),
  notes: z.string().max(500).optional(),
}).strict().superRefine((s, ctx) => {
  if (!!s.employeeId === !!s.resourceId) ctx.addIssue({ code: 'custom', message: 'SCHEDULE_TARGET_REQUIRED' });
  if (s.validTo && s.validTo < s.validFrom) ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'validTo < validFrom' });
});

export const scheduleShiftSchema = z.object({
  scheduleId: id,
  dayOfCycle: z.number().int().min(1).max(MAX_CYCLE_DAYS),  // ≤ cycleLengthDays do pai (plugin, item 14)
  startMinute: z.number().int().min(0).max(1439),          // hora local da unidade
  durationMinutes: z.number().int().min(1).max(1440),      // passa da meia-noite sem ambiguidade
}).strict();

export const scheduleExceptionSchema = z.object({
  employeeId: id.optional(),
  resourceId: id.optional(),                  // os dois ausentes = a unidade inteira
  unitId: id,
  kind: z.enum(EXCEPTION_KINDS),
  origin: z.enum(EXCEPTION_ORIGINS).default('USER'),
  startAt: instant,
  endAt: instant,
  reason: z.string().max(300).optional(),
  sourceType: z.enum(['HOLIDAY', 'DP_ABSENCE']).optional(), // chave idempotente das projeções
  sourceId: z.string().min(1).optional(),
}).strict().superRefine((e, ctx) => {
  if (e.employeeId && e.resourceId) ctx.addIssue({ code: 'custom', message: 'one target at most' });
  if (e.endAt <= e.startAt) ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'endAt <= startAt' });
  if ((e.origin === 'USER') !== (e.sourceType === undefined)) ctx.addIssue({ code: 'custom', message: 'projection key mismatch' });
});
```

### 3.2 Núcleo puro e porta de leitura

```ts
export interface Interval { start: number; end: number }   // epoch ms, [start, end)
export interface ScheduleWithShifts { schedule: ScheduleRow; shifts: ShiftRow[] }

export function resolveAvailability(i: {
  schedules: ScheduleWithShifts[]; exceptions: ExceptionRow[]; timeZone: string; range: Interval;
}): Interval[];
export function isCovered(available: Interval[], appointment: Interval): boolean;
export function freeSlots(available: Interval[], busy: Interval[], durationMinutes: number, stepMinutes: number): Interval[];

// ports/PlannedScheduleReader.ts — o contrato que o DP consumirá por porta própria (F-ESC-8; D-3)
export interface PlannedDay { date: string; minutes: number; intervals: Array<{ startAt: string; endAt: string }> }
export interface PlannedScheduleReader {
  plannedDays(userId: string, target: { employeeId: string } | { resourceId: string },
              unitId: string | null, from: string, to: string): Promise<PlannedDay[]>;
}

// ports/HolidayCalendarPort.ts (adaptador em paises/br/adapters/)
export interface HolidayCalendarPort { holidaysFor(userId: string, unitId: string, year: number): Promise<string[]> }

// ports/AbsenceSourcePort.ts (F-ESC-7 a1)
export interface AbsenceRecord { sourceId: string; employeeRef: string; unitId: string; startDate: string; endDate: string | null }
export interface AbsenceSourcePort { absencesFor(userId: string, from: string, to: string): Promise<AbsenceRecord[]> }
```

### 3.3 Tabelas de preset (Core)

| Tabela (`internalName`) | Campos | Regras |
|---|---|---|
| `resources` | `name`, `kind` (select, opções livres), `unitId` → `units`, `isActive` | `RESTRICT` no delete com padrão vivo |
| `schedules` | `employeeId` → `employees`, `resourceId` → `resources`, `unitId` → `units`, `cycleLengthDays`, `cycleAnchorDate` (date), `validFrom` (date), `validTo` (date), `origin` (select), `migratedFrom`, `notes` | `SchedulesPlugin` (itens 13, 7); `CASCADE` dos turnos |
| `scheduleShifts` | `scheduleId` → `schedules`, `dayOfCycle`, `startMinute`, `durationMinutes` | `SchedulesPlugin` (item 14) |
| `scheduleExceptions` | `employeeId`, `resourceId`, `unitId`, `kind` (select), `origin` (select), `startAt`/`endAt` (datetime), `reason`, `sourceType`, `sourceId` | `SchedulesPlugin` (item 15) |
| `units` (+campo) | `timeZone` (string IANA) | item 11 |
| `appointments` (+campos) | `resourceId` → `resources`, `availabilityOverride` (boolean), `availabilityOverrideReason` | itens 25–27 |

### 3.4 Rotas

```ts
export const AvailabilityQuerySchema = z.object({
  unitId: z.string().min(1),
  employeeId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
}).strict();                                               // + refine: janela ≤ 31 dias; um alvo no availability

export const FreeSlotsQuerySchema = AvailabilityQuerySchema.extend({
  serviceId: z.string().min(1).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(1440).optional(), // obrigatório sem serviceId
  stepMinutes: z.coerce.number().int().min(5).max(120).default(15),
}).strict();

export const FreeSlotsResponseSchema = z.object({
  slots: z.array(z.object({ employeeId: z.string().nullable(), resourceId: z.string().nullable(),
                            startAt: z.string(), endAt: z.string() }).strict()),
}).strict();

export const HolidaySyncBodySchema = z.object({ unitId: z.string().min(1).optional(), year: z.number().int().min(2024).max(2100) }).strict();
export const HolidaySyncResponseSchema = z.object({ created: z.number().int(), skipped: z.number().int(), deletedByUser: z.number().int() }).strict();
```

Códigos de erro novos (inglês, R1): `OUTSIDE_AVAILABILITY`, `OVERRIDE_REASON_REQUIRED`, `SCHEDULE_OVERLAP`,
`SCHEDULE_TARGET_REQUIRED`, `EXCEPTION_READ_ONLY`, `RANGE_TOO_LARGE`.

## 4. Forks — RATIFICAÇÃO PENDENTE

Os dezesseis forks, com caminhos e recomendação, estão no [PRE-ADR §5](../adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md#5-forks--ratificação-pendente).
Índice de quais itens cada um muda:

| Fork | Recomendação | Itens que dependem |
|---|---|---|
| F-ESC-1 Onde mora | (a) DynamicTable | 10, e o desenho inteiro |
| F-ESC-2 Registro | (a) Core, tabelas visíveis | 10, 12, 17, 20 |
| F-ESC-3 Recurso | (a) `resources` + XOR | 1, 10, 13, 26 |
| F-ESC-4 Padrão | (a) ciclo de N dias | 1–3, 14 |
| F-ESC-5 Fora da disponibilidade | (a) recusa + encaixe | 5, 24, 25 |
| F-ESC-6 Feriado | (a) projeção da borda BR | 4, 15, 37–42 |
| F-ESC-7 Afastamento do DP | (a) projeção em duas etapas (a1 aqui) | 15, 43–48 |
| F-ESC-8 DP consome | (a) `DpJornada` segue a fonte | 8 |
| F-ESC-9 Aprovação | (b) fora | — |
| F-ESC-10 Parceiro | (a) `origin` DECLARED/ASSIGNED | 1, 22 |
| F-ESC-11 Conflito entre unidades | (a) por pessoa | 7, 13, 21, 27 |
| F-ESC-12 `workSchedule` | (a) migra e aposenta | 21–23 |
| F-ESC-13 Fuso | (a) `units.timeZone` | 3, 11, 24, 30 |
| F-ESC-14 Gate fora da tx | (a) aceita | 24 (sem item novo) |
| F-ESC-15 Sem escala | (a) sem restrição | 24 |
| F-ESC-16 Agendamento automático da venda | (a) gate + encaixe `AUTO_FROM_SALE` | 28 |

### Decisões de detalhe sem fork (caminho único pelo que já está decidido)

- **Nomes em inglês** para tabela, campo, enum, erro, rota e arquivo novos (R1, F-PBA-1 a). Rótulo para o usuário pelo i18n.
- **Turno em minutos locais + duração**, não `HH:MM`: o formulário converte. É a forma que valida sem ambiguidade na
  meia-noite e segue a "quantidade em inteiro de escala declarada" do DP.
- **Âncora fixa `2024-01-01`** na migração semanal: é uma segunda-feira, e o `dayOfCycle` 1 = segunda. Qualquer segunda
  serviria; fixa evita diferença entre instâncias.
- **`unitId` opcional no padrão** só para não perder a escala do funcionário sem unidade na migração (item 22). O fuso, nesse
  caso, vem da unidade do agendamento.
- **Sem `postEntry`, sem Prisma novo, sem `eventType` de auditoria:** a escala não toca o razão. O histórico das linhas é o
  ledger de versões do motor (`DynamicTableVersionService`).

## 5. Pendente de validação externa

- **P1 (advogado):** escala definida pela empresa para o parceiro como indício de subordinação. Ver PRE-ADR §6. **Nenhum
  item deste BRIEF depende da resposta.** O alerta, se houver, é da borda BR num BRIEF próprio.
- **P2, P3:** trabalho em feriado e conformidade da escala do CLT são do DP (PRE-ADR §6). Não entram no checklist.

## 6. Insumos ausentes

1. Tratamento de escopo vazio no `noOverlap` (`validation/GovernanceEngine.ts`). Bloqueia o item 27 até a leitura, que é o
   primeiro passo do item.
2. Como a sincronização de preset leva tabela nova do Core a uma instância existente (`PresetSyncService`). É o primeiro
   passo do item 12.
3. Se o `check:arch` aceita `features/scheduling` importar serviço de `features/dp` (item 44). Se não aceitar, o item 44 vai
   para o BRIEF do DP.
4. O `EmployeesPlugin` aceita funcionário sem unidade quando há horário (item 23). Sem o `workSchedule`, fica só "unidade
   obrigatória" ou "unidade opcional". A escolha muda o cadastro e é do dono **se** o inventário (item 21 c) achar
   funcionário sem unidade. Se achar zero, segue "unidade opcional", como o campo já é.
5. Mecanismo da casa para migração de dado em linhas de DynamicTable (item 22). Recomendado: serviço idempotente chamado por
   script em `server/src/scripts/`, nunca SQL cru. A memória do projeto registra que SQL cru não grava como o ORM.

## 7. Achados fora de escopo (na caixa)

- `L-20261126-180055-8f07`: dia desligado no `workSchedule` aceito pela agenda. Fecha no item 24.
- `L-20261126-180056-7893`: fuso do processo na conferência de horário (`AppointmentsPlugin.ts:102, 111-112`; a evidência
  na caixa diz 113-114 por engano). Fecha nos itens 11 e 24.
- `L-20261126-180939-51cf`: o agendamento automático da venda grava pelo repositório, fora do gate e do `noOverlap`. Fecha
  no item 28.

Ficam na caixa porque valem hoje, antes do `executa`. Se o dono quiser contenção antes do PR-2, o remendo de duas linhas
(ler `active`; converter no fuso da unidade) é uma `sessao-correcao` sobre o teste-guarda, e o PR-2 apaga o código depois.

## 8. Gates que o diff aciona

- `tsc` do server; `npm run check:arch` (`P1`: centro sem `paises/`; `B1`: plugin sem serviço Prisma); ESLint (`no-console`,
  `catch` silencioso).
- Snapshot de shape dos DTOs novos (PR-3).
- Paridade i18n pt/en das tabelas e campos novos (PR-1); gate de wiring (preset órfão).
- `openapi.json` + teste de contagem de paths (+3: `availability`, `free-slots`, `holidays/sync`).
- Teste de scheduler com caso de alerta para os dois jobs (F-OBS-14).
- Teste local só com escopo: `npx jest <caminho> --selectProjects unit`; integração um arquivo por vez com `--runInBand`.

## 9. Tamanho e perfil

| PR | Itens | Perfil previsto |
|---|---|---|
| PR-0 | 1–9 | `opus-medio` (fuso, meia-noite e propriedades) |
| PR-1 | 10–20 | `opus-baixo` (preset e plugin no molde) |
| PR-2 | 21–30 | `opus-medio` (muda comportamento visível; migração) |
| PR-3 | 31–36 | `opus-baixo` |
| PR-4 | 37–42 | `opus-baixo` |
| PR-5 | 43–48 | `opus-medio` (costura com o DP) |

Classe de risco: PR-2 é vermelho (motor e comportamento da agenda), com revisor independente. PR-5 provavelmente também
(costura com o DP).

## 10. Riscos (inclui vieses do autor)

- **Mudança de comportamento da agenda no PR-2.** Caso adversarial tentado: "o dono não quer que a agenda passe a recusar
  nada". O item 21 mede antes, e o item 30 prova que o horário aceito nos dias `active` continua aceito. O que passa a
  recusar (dia desligado, duplo agendamento entre unidades) é o que o usuário já declarou ou um conflito real. Mesmo assim,
  vai no corpo do PR com os números.
- **Projeção atrasada = aceitação silenciosa.** Afastamento lançado no DP só chega à agenda no próximo reconcile (até 24 h).
  O a2 do F-ESC-7 (o DP chama depois do commit) fecha isso, no BRIEF do DP.
- **Sessão viva no PES-4** (ponte folha → razão): este BRIEF não edita `features/dp/**`. Se o item 44 precisar, ele espera o
  BRIEF do DP (serial com o PES-4).
- **Viés de completude:** seis fases. O caminho mínimo que entrega o pedido do dono (parceiro com escala na agenda) é PR-0,
  PR-1 e PR-2. PR-3 a PR-5 podem esperar sem quebrar nada.

## 11. Write-set

| PR | Arquivos |
|---|---|
| PR-0 | `server/src/features/scheduling/{models,dtos,ports}/**` |
| PR-1 | `server/src/features/dynamicTables/presets/modules/core/{Resources,Schedules,ScheduleShifts,ScheduleExceptions,Units}Module.ts`, `server/src/features/dynamicTables/presets/systems/CoreSystemPreset.ts`, `server/src/features/dynamicTables/presets/fields/relation/RelationPresets.ts`, `server/src/features/dynamicTables/presets/removability.ts`, `server/src/features/dynamicTables/rules/plugins/SchedulesPlugin.ts`, `server/src/features/dynamicTables/rules/RuleRegistry.ts`, `server/src/features/scheduling/paises/br/models/**`, rótulos i18n (a conferir no PR) |
| PR-2 | `server/src/features/dynamicTables/rules/plugins/{Appointments,Employees}Plugin.ts`, `server/src/features/dynamicTables/rules/plugins/sales/appointmentSync.ts`, `server/src/features/dynamicTables/presets/modules/planning/AppointmentsModule.ts`, `server/src/features/dynamicTables/presets/modules/core/EmployeesModule.ts`, `server/src/features/scheduling/services/WorkScheduleMigrationService.ts`, `server/src/scripts/scheduling-*.ts` |
| PR-3 | `server/src/features/scheduling/{services,repositories,policies,dtos}/**`, `server/src/controllers/schedulingController.ts`, `server/src/routes/scheduling.ts`, `server/src/routes/docs/scheduling.paths.ts`, `server/public/openapi.json`, `server/src/__tests__/openapi-paths.test.ts` |
| PR-4 | `server/src/features/scheduling/paises/br/**`, `server/src/features/scheduling/services/HolidayExceptionService.ts`, `server/src/jobs/SchedulingHolidaySyncScheduler.ts` |
| PR-5 | `server/src/features/scheduling/adapters/**`, `server/src/features/scheduling/services/HrAbsenceProjectionService.ts`, `server/src/jobs/SchedulingHrAbsenceReconcileScheduler.ts` |

**Choke points (PAR-001):** `server/src/lib/factory.ts` (PR-3, PR-4, PR-5), `server/src/routes/index.ts` (PR-3),
`server/src/features/dynamicTables/rules/RuleRegistry.ts` (PR-1). **Não toca:** `server/prisma/schema.prisma`,
`server/src/features/dp/**`, `DynamicTableService.ts`, `MODULE_REGISTRY`.
