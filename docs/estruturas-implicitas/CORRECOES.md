# Correções da auditoria de estruturas implícitas: triagem e estado

Fonte do estado da orquestração dos 114 achados de Classe = Correção. Uma linha por achado; duplicatas numa linha só.
Quem retoma lê este arquivo, não o histórico da sessão.

- **Autorização:** dono, chat, 2026-11-10: "Me da o prompt para a sessão Opus realizar a orquestração das 114 correções".
  Autoriza orquestrar. **Nenhum achado está aprovado**: a aprovação é por ID, escrita pelo dono no chat, depois desta triagem.
- **Inventários:** branch `claude/implicit-state-machines-inventory-e766ea`, commit `f5f70b03f`, pasta `docs/estruturas-implicitas/`
  (fora da `main`). Ler com `git show f5f70b03f:docs/estruturas-implicitas/<arquivo>`.
- **Triagem:** 2026-11-10, sessão de orquestração, só leitura.

## Como esta triagem foi feita

1. **Código atual × inventário.** `origin/main` = `d3cf331e7`, o mesmo commit dos inventários: `git diff d3cf331e7 origin/main`
   vazio. Nenhuma linha citada mudou ou sumiu; nenhum achado foi reclassificado por deriva de código.
2. **PRs abertos que tocam linhas citadas** (`gh pr list` + arquivos, 10/11): #1133 (teammates PR-7, `ActionProposalRepository`,
   `ProposalExpiryScheduler`), #1145 (H2-21d, `useSalesCreateForm.ts`; a venda de pacote com validade passa a nascer rascunho),
   #1146 (assinador local AL-PR-3: `dfeEnvio.ts`, `FiscalDocumentLifecycleService.ts`, `FiscalNumberVoidService.ts`,
   `DfeAssinaturaResolver.ts`, `routes/dfeAssinador.ts`), #1150 (`RECEIVABLE_TRANSITIONS`, item 1 do PRE-ADR). Quando um deles
   entrar, as linhas citadas nesses arquivos mudam: reabrir antes de instrumentar.
3. **Reabertura por mim (10/11), marcada `[OBS ✔] 10/11` na coluna Evidência:** 7 dos 8 itens da ordem sugerida (INV F-40.1 só
   indiretamente, pelo `beforeCreate` lido para o F-40.2), os 2 que o BRD manda reabrir antes de triar (F-63.1, F-08.1) e SOT F-01.1,
   SOT F-18.1, EFX F-19.1. Os 12 marcados confirmam o defeito descrito; no BRD F-63.1, só a metade "calendário" (o teto é política).
   Também li o código de SOT F-17.2 (Q-08), SOT F-22.1, EFX F-13.1 e EFX F-14.2: os quatro caíram, e a leitura está no Desfecho
   de cada um. Os demais seguem com a evidência do
   inventário: `[OBS ✔]` reaberto pela sessão de descoberta, `[OBS]` vindo da coleta e não reaberto, `[INF]` inferido. No BRD a
   evidência está na ficha; "(nr)" quer dizer não reaberto.
4. **GAP-MAP atual conferido** para linha que já cubra o achado: SM F-09.2 é resíduo de uma linha [CORRIGIDO 07/10]; INV F-42.1 é
   vizinho da linha "Pacote — cancelar ou devolver venda de pacote", cuja parte de devolução segue aberta.
5. **Não rodei teste nenhum.** Nenhum achado foi promovido a defeito provado: isso é da `sessao-instrumentacao`.

## Faixas

Depois das respostas do dono (seção abaixo):

| Faixa | Regra | Linhas |
|---|---|---|
| 1 | pronta para instrumentar: D2/D3, fora de ZP, fora dos temas F e G, sem questão aberta, sem corrida | 45 |
| 2 | depende do dono ou de outro achado; hoje só os 2 bloqueados pelo BRD F-01.1 | 2 |
| 3 | não delegada: tema F inteiro, tema G inteiro, D4/D5, zona proibida. Um ID por vez, ZP liberada só naquela execução | 50 |
| 4 | corrida [INF]: só anda com teste-guarda determinístico (Windows serializa o SQLite) | 11 (12 IDs; INV F-11.2 reaberto em 10/11) |
| — | desfecho na triagem: 4 descartados (confirmados pelo dono em 10/11) e 1 duplicata fundida (EFX F-15.1); o 5º proposto, SOT F-17.2, voltou à faixa 1 e foi descartado pelo dono em 11/11 (sai da faixa 1) | 5 + SOT F-17.2 |

Total: 45 + 2 + 50 + 12 + 5 = 114. EFX F-15.1 conta nos 12 da faixa 4. Em 10/11 o INV F-11.2 saiu da fusão com o SM F-01.2, porque o #1160 não cobre o CAS do `revertClaim`.
Antes das respostas: faixa 1 = 33, faixa 2 = 16 linhas, faixa 3 = 49, faixa 4 = 9.

### Pergunta nova desta triagem

**Q-A: plugin de preset é zona proibida?** O `CONTEXTO.md` põe "`DynamicTableService.ts` e o motor de plugins" na ZP. Os inventários
divergem: o INV pede liberação da ZP para mexer em `StockMovementsApplyPlugin.ts` (F-41.1) e o EFX marca ZP no mesmo arquivo
(F-23.1), mas o INV não marca ZP em `SalesPlugin.ts` (F-14.2, F-40.x). Precedente: VP-1 e VP-1b do GAP-MAP corrigiram
`SalesPlugin.ts` pelo fluxo normal. O reflexo STOP do `CLAUDE.md` mira injeção de serviço Prisma e integração entre módulos dentro do
motor, não guarda local de um plugin. Decide a faixa de INV F-14.2, F-41.1, F-26.1, F-40.1 e F-40.2.

### Ressalva sobre a ordem sugerida

A ordem sugerida no prompt da orquestração começa por INV F-16.3, F-40.1, F-40.2, F-14.2, F-42.1. Na triagem, F-40.1 e F-40.2
tinham a INV Q-11 aberta (faixa 2) e F-14.2 dependia da Q-A. Com as respostas de 10/11, os 8 da ordem sugerida estão na faixa 1.
F-40.1, F-40.2 e SOT F-23.1 tocam `useSalesCreateForm.ts`, que o #1145 aberto também muda: instrumentar depois dele, ou rebasear.

## Respostas do dono

Questionário (AskUserQuestion) desta sessão, 2026-11-10. Responde a pergunta; **não aprova ID nenhum**.

| Pergunta | Resposta do dono | Achados afetados |
|---|---|---|
| Q-A plugin de preset é ZP? | "Só o motor é ZP": `DynamicTableService.ts` e o contrato `RuleRegistry`/`RuleContext`/`RulePlugin`; guarda local em plugin vai pelo fluxo normal; injetar serviço Prisma em plugin continua proibido | INV F-14.2, F-41.1, F-26.1, F-40.1, F-40.2 → faixa 1 |
| INV Q-11 venda nasce finalizada? | "Só rascunho na criação" (a) | INV F-40.1, F-40.2 |
| INV Q-02 `reserved <= stock` vale sempre? | "Vale sempre" (a) | INV F-26.1 |
| SM Q-03 consumo da `ActionProposal` | "Mesma tx, senão CAS" (c, com b de reserva); `expiresAt` vencido recusa | SM F-40.2 = EFX F-15.1 → faixa 4 |
| BRD F-66.4 teto de PDF/DOCX (10/11, depois do #1200) | "Recusar com 400"; "500 páginas / 2 mi caracteres": PDF até 500 páginas, DOCX até 2.000.000 de caracteres extraídos | BRD F-66.4 |
| SOT Q-07 reais → centavos | "Erro e teto em tudo" (a) | SOT F-11.1 |
| BRD Q6 `NODE_ENV` ausente | "Exigir no boot" (a) | BRD F-03.4 |
| BRD Q7 resposta do modelo cortada | "Texto com aviso de corte" (a) | BRD F-56.2 |
| SM Q-07 job preso em `PROCESSING` | "Varredura leva a FAILED" (a) | EFX F-18.2 (= SM F-18.3, Produto) |
| BRD F-71.1/F-71.2 config inválida derruba o boot? | "Os dois falham no boot" | F-71.1 → faixa 1; F-71.2 → faixa 3 (ZP) |
| BRD F-72.4 limite de tempo | "60 s API, 10 s ViaCEP" | BRD F-72.4 |
| SOT F-02.1 junto com F-02.2? | "Aprova F-02.1 junto": F-02.1 (Representação D1) entra antes, em PR próprio. Falta o ID escrito na lista de aprovação | SOT F-02.2 |
| BRD Q1 envelope de erro | "(c) `handleApiError` único": vira BRIEF próprio (`sessao-planejamento`), não correção | BRD F-01.1 (faixa 3); F-04.3, F-73.1 bloqueados por ele |

**Dia 2 (10/11, tarde).** Duas rodadas, uma na sessão "Descartes propostos e desbloqueios" (aberta pelo dono; respostas lidas no
transcript dela) e outra na orquestração do dia 2:

| Pergunta | Resposta do dono | Achados afetados |
|---|---|---|
| Quais dos 5 descartes você confirma? (sessão Descartes) | "SOT F-22.1, EFX F-08.1, EFX F-13.1 e F-14.2" | os quatro → descartado. SOT F-17.2 não marcado |
| Liberar `accounting/models/dates` nos `importBoundary.test`? (sessão Descartes) | "Liberar" | SOT F-12.1: os 2 sítios restantes (`KitInstallationDto.today`, `ActivateDefaultBindingDto.period`) |
| Exigir `isSystem` para a linha `ACCOUNTING_PAYABLE:`? (sessão Descartes) | "Exigir isSystem" | INV F-41.1: resíduo |
| BRIEF do BRD F-01.1 roda onde? (sessão Descartes) | "Sessão própria". A pergunta dizia: "Sua mensagem conta como a autorização para o BRIEF, sem código" | BRD F-01.1 (só BRIEF); destrava F-04.3 e F-73.1 depois |
| SOT F-17.2: descartar, faixa 1 ou aberto? (orquestração d2) | "qual a sugestão de correção?" Sem decisão; respondido no chat: a correção da ficha é "invalidar nas escritas que alimentam KPI", e não há escrita assim, porque nenhum KPI lê tabela Prisma (Q-08) | SOT F-17.2 segue `descartado (proposto)` |
| Quais follow-ups viram linha nova da faixa 1? (orquestração d2) | "INV F-26.1 delete In, INV F-42.1 controle, BRD F-73.2 35 catch" | linhas novas F1-N1, F1-N2 e F1-N3 (seção Linhas novas) |
| EFX F-18.2 `updateJob` sem CAS (orquestração d2) | "Registrar na faixa 4" | linha nova F4-N1; só anda com o ID escrito pelo dono |


**Dia 3 (11/11).** Sessão "decisões pendentes da auditoria" (aberta pela orquestração, a pedido do dono no chat), cinco questionários.
As respostas são o rótulo da opção que o dono marcou; a íntegra de cada pergunta está no relatório da sessão.

| Pergunta | Resposta do dono | Onde ficou |
|---|---|---|
| F-ENV-0..9 do BRIEF do BRD F-01.1 | as dez com a recomendação: ADR antes (PR-0); `success:false`; flatten + `kind`/`source`; front antes + espelho `error`; `parseOrThrow` no controller; `requireUser(req)`; `code` string com regex; bordas de terceiros fora, como exceção no ADR; um PR por domínio; "Ratifico a regra ESLint" | `BE-INCR-API-ERROR-ENVELOPE-brief.md` §3 |
| F-ENV-10 liberação de ZP | "Libero tudo no executa" (fora da recomendação, que era liberar PR a PR) | BRIEF §3 |
| SOT F-17.2 | "Descartar (não reproduzido)": o cache guarda só as definições (`AnalyticsService.ts:59-177`), o valor sai a cada pedido das linhas do DynamicTable (`AnalyticsResolver.ts:316-330`), conferido em 11/11 | Tabela, Desfecho do SOT F-17.2 |
| Faixa 4, quais IDs | INV F-27.1, INV F-37.1, SM F-16.1, SM F-40.2 (com EFX F-15.1; espera o #1133), INV F-06.1, INV F-12.1, INV F-15.2, INV F-16.4, SM F-21.1, EFX F-18.3, F4-N1 | §Aprovados |
| Faixa 3, quais IDs | EFX F-23.3, BRD F-54.2, BRD F-53.1, BRD F-46.2, BRD F-71.2, BRD F-49.1, BRD F-64.1, "EFX F-18.1 só metade CRM"; os do #1146: SM F-09.2, SM F-11.2, EFX F-09.1; e EFX F-17.1, EFX F-02.1, SM F-06.1 | §Aprovados |
| Os 35 restantes da faixa 3 (20 AUT, 11 REG, 4 com questão aberta) | "Rodada das questões abertas (Recommended)": um questionário com AUT Q-01..Q-07, EFX Q-02/Q-03/Q-05 e BRD Q2 antes da aprovação por ID; o tema G espera o oráculo externo | pendente, próximo passo |
| #1160 no lote | não perguntado: o dono mergeou o #1160 em 2026-11-11 16:28 UTC (`gh pr view 1160`: `MERGED`, `mergedBy` = conta do dono) | §Aprovados, Tabela (INV F-11.2) |

Seguem abertas e não perguntadas nesta rodada (faixa 3, uma por vez): AUT Q-01..Q-07, EFX Q-02/Q-03/Q-05, BRD Q2, e as questões do
tema G (REG Q-03, REG-IMOBILIZADO Q-04/Q-05, REG-FECHAMENTO Q-301..Q-304, REG-CLASSIFICACAO Q-C1/Q-C3/Q-C4).

## Aprovados

Só IDs escritos pelo dono no chat; faixas 3 e 4, um ID por vez.

- **Merge livre do vermelho da faixa 1 (D-2026-11-10-FAIXA1-MERGE-LIVRE, PR #1163):** dono, chat, 2026-11-10: "Sim, confirma o #1163"
  (confirmação do lote vermelho daquele PR, só texto; copiada no corpo do #1163). Ressalva: o #1160 (SM F-01.2) carrega também o
  INV F-11.2, que é da faixa 4 (autorizado pelo dono na sessão SM); a exceção cobre só a faixa 1, então o #1160 segue para o lote
  do dono, salvo ordem dele em contrário.
- **Faixa 1 inteira (45 linhas, 46 IDs com INV F-11.2), mais SOT F-02.1:** dono, chat, 2026-11-10: "Dispara a faixa 1 em opus
  médio 1 para cada categoria". Aprovação por faixa vale só para a faixa 1 (regra do prompt da orquestração). SOT F-02.1 é
  Representação D1, aprovado como dependência do SOT F-02.2 ("Aprova F-02.1 junto", questionário da mesma data).
- **Execução pedida:** uma sessão por tema (SM, INV, SOT, EFX, BRD), Opus com esforço médio.
- **Os 5 descartes propostos:** quatro confirmados pelo dono em 10/11 (SOT F-22.1, EFX F-08.1, EFX F-13.1, EFX F-14.2). SOT F-17.2 não.
- **Resíduos do SOT F-12.1 e do INV F-41.1 (dono, questionário da sessão Descartes, 10/11):** em execução naquela sessão, como
  filhos do #1177 e do #1181. Ela manda à orquestração uma linha por PR; o CORRECOES.md só a orquestração edita.
- **BRIEF do BRD F-01.1:** autorizado em sessão própria (mesma rodada), só BRIEF, sem código. A sessão Descartes ia propor o cartão.
- **Linhas novas da faixa 1 (F1-N1..N3):** dono, questionário do dia 2, 10/11. Entram pela aprovação da faixa 1; cada uma ganha linha
  no GAP-MAP (este PR) antes do PR de correção.
- **Merge da faixa 1 (dono, chat, 2026-11-10: "tem qeu ficar livre isso"; questionário: "Livre só nesta faixa 1"):** PR vermelho
  da faixa 1 com revisor PASS, CI verde e sem arquivo de ZP entra como verde. Nota `D-2026-11-10-FAIXA1-MERGE-LIVRE`, PR #1163
  (vermelho só de texto: precisa de uma confirmação do dono no lote; depois disso, os PRs vermelhos da faixa 1 não vão mais ao lote).
- **Registro:** PR #1153 (GAP-MAP, seção "Estruturas implícitas — faixa 1", 46 linhas; classe verde).
- **Sessões (10/11):** `faixa1-brd` (28), `faixa1-inv` (7) e `faixa1-sot` (8), todas iniciadas a partir do branch do #1153.
  `faixa1-sm` (SM F-01.2) e `faixa1-efx` (EFX F-19.1, F-18.2) iniciadas no turno seguinte (dono, chat, 2026-11-10: "Dispara SM e EFX").

- **Dia 3 (11/11), aprovação por ID das faixas 3 e 4 (dono, questionário da sessão de decisões pendentes, 2026-11-11; o rótulo
  marcado é a frase):**
  - Faixa 4 (teste-guarda determinístico: repositório que muda o status entre a leitura e a escrita, ou assert do status no `where`;
    nunca concorrência real, porque o Windows serializa o SQLite): "INV F-27.1 (score 4)", "INV F-37.1 (score 4)", "SM F-16.1 (score 3)",
    "SM F-40.2 (score 6, espera #1133)", "INV F-06.1 (score 2)", "INV F-12.1 (score 2)", "INV F-15.2 (score 2)", "INV F-16.4 (score 1)",
    "SM F-21.1 (score 0.5)", "EFX F-18.3 (score 0.5)", "F4-N1 (resíduo do #1167)". SM F-40.2 inclui o EFX F-15.1 e só é instrumentado
    depois do merge do #1133; EFX F-18.3 confere com o INV-39 antes.
  - Faixa 3 (ZP liberada só na execução daquele ID): "EFX F-23.3 (score 2, motor)", "BRD F-54.2 (SEFAZ)", "BRD F-53.1 (PSC)",
    "BRD F-46.2 (pagamento)", "BRD F-71.2 (boot)", "BRD F-49.1 (PSC)", "BRD F-64.1 (NFS-e)", "EFX F-18.1 só metade CRM" (a metade
    Reinf fica na faixa 3, não aprovada), "EFX F-17.1 (D5, score 2)", "EFX F-02.1 (score 0.5)", "SM F-06.1 (score 1)" (também é
    corrida: teste determinístico). Depois do merge do #1146: "SM F-09.2 (score 2)", "SM F-11.2 (score 1, D2)", "EFX F-09.1 (score 0.5)".
    BRD F-53.1 espera o #1146 se o fix tocar o `AssinadorRemotoPort.ts`.
  - Antes de instrumentar cada um: `git fetch && git diff d3cf331e7 origin/main -- <arquivos citados>`; se mudou, reabrir.
- **BRIEF do BRD F-01.1 ratificado (dono, questionário, 2026-11-11):** F-ENV-0..10 respondidos (registro no BRIEF §3). Falta só o
  `executa` do dono no chat para a `sessao-feature`; pela F-ENV-10 ("Libero tudo no executa"), ele libera a ZP de todos os PRs do BRIEF.
- **#1160:** mergeado pelo dono em 2026-11-11 16:28 UTC, fora da maestro; sai do lote.
- **SOT F-17.2:** descartado (dono, questionário, 2026-11-11: "Descartar (não reproduzido)").

## Estado e próximo passo (handoff)

**Atualização de 11/11 (sessão de decisões pendentes):** dos itens "Parado no dono" abaixo, ficaram resolvidos o SOT F-17.2
(descartado), o #1160, o #1167 e o #1209 (os três `MERGED` no `gh` em 11/11), os forks F-ENV-0..10 (ratificados) e a aprovação de 25 IDs das faixas 3 e 4 (§Aprovados,
dia 3). Seguem parados no dono: o `executa` do BRIEF do BRD F-01.1, a rodada das questões abertas (AUT Q-01..Q-07, EFX Q-02/Q-03/Q-05, BRD Q2) e a metade Reinf do EFX F-18.1.

**Medido de novo em 10/11, fim do dia (orquestração d1, depois que a d2 foi arquivada):** 33 PRs de correção da faixa 1 mergeados
(marcados `**mergeado dd/mm (#n)**` na Tabela; GAP-MAP em `[CORRIGIDO]`), 15 abertos (#1155, #1157, #1160, #1162, #1167, #1170,
#1173, #1178, #1181, #1191, #1197, #1199, #1201, #1210, #1211), #1198 fechado pelo GitHub com a base e substituído pelo #1214
(mergeado). O BRIEF do BRD F-01.1 (#1207) entrou. O texto abaixo é o da d2 e não foi remedido.

Atualizado em 10/11, dia 2 (orquestração d2, medido com `gh` e `git diff` às ~16h40 UTC).

- **Medido:**
  - Primeira leitura (~16h40 UTC): nenhum PR da faixa 1 mergeado nem fechado; os 46 abertos e `MERGEABLE`.
  - `git diff d3cf331e7 origin/main` só muda doc e `crmPipeline.integration.test.ts` (#1182); nenhuma linha das faixas 2–4 cita esse
    arquivo. Nenhuma evidência reaberta por deriva. #1133, #1145, #1146 e #1150 seguem abertos.
  - **Merges da maestro entre 16:43 e 17:02 UTC (9):** #1161 BRD F-57.1, #1165 BRD F-58.1, #1168 INV F-40.1, #1169 BRD F-66.2,
    #1171 BRD F-72.1, #1172 SOT F-23.1, #1174 BRD F-03.4, #1185 BRD F-08.1, #1193 BRD F-62.1. Nenhum PR fechado sem merge.
  - **Mais 3 merges (17h05–17h30 UTC):** #1175 INV F-14.2, #1180 INV F-26.1, #1195 BRD F-65.3. Total da faixa 1: 12.
  - O #1193 trouxe à `main` uma linha deste arquivo (BRD F-57.3, igual à do #1196); o #1196 fez merge da `main` mantendo a própria
    versão. Sessão filha não edita este arquivo: manda a linha à orquestração.
  - **Conflitos depois desses merges** (`git merge-tree` contra `origin/main`, 17h05): 14 dos 37 abertos. 12 só no `GAP-MAP.md`
    (#1154, #1177, #1179, #1181, #1184, #1190, #1192, #1194, #1197, #1199, #1201, #1202): cada PR muda a própria linha da tabela, e o
    merge da linha vizinha conflita. Fora da lista prevista: parado no dono. #1191 também em `AgentTool.model.ts` (enum de erros, com
    o #1161: previsto, unir os valores). #1170 também em `SalesPlugin.ts`, com o #1168 já mergeado: **fora da lista**, parado no dono.
    O #1172 entrou antes do #1145: o conflito previsto em `useSalesCreateForm.ts` passa para o #1145, que não é da faixa 1.
  - Foto de CI (uma leitura, sem polling): #1197 com `Server – typecheck & lint` vermelho (tipo do `req` num teste); o resto verde ou
    rodando.
- **Merge (só a maestro):**
  - Verde: entra direto. Vermelho da faixa 1 com revisor PASS no SHA de cabeça: entra pela D-2026-11-10-FAIXA1-MERGE-LIVRE.
  - Vão ao lote do dono: #1160 (carrega o INV F-11.2, da faixa 4) e #1167 (acrescenta entrada ao ledger de dívida em
    `docs/architecture/lint-layer-gate.md`: baseline de gate, item 2 da nota). O #1178 dizia "lote"; cumpre a nota e não vai.
  - Leitura de ZP nos 46 PRs: só o #1167 toca arquivo da lista da nota. #1158/#1167 tocam `lib/alertWebhook.ts` (alerta, não
    webhook de pagamento); #1162 só rótulos de DF-e no front; #1201 só o leitor de ms do `DfePollScheduler` (não é transmissão) [inferido].
  - Depois do #1166: o #1198 precisa de `rebase --onto origin/main` e troca de base (`sessao-integracao`).
- **Conflito novo avisado (10/11):** #1211 × #1152 (não é da faixa 1) no comentário `ponytail:` do `StockMovementsApplyPlugin.ts`:
  o #1211 tira, o #1152 renomeia. Fora da lista: quando aparecer, parar e reportar ao dono.
- **Conflitos previstos:** #1170 e #1172 com o #1145 (`useSalesCreateForm.ts`); #1161, #1164 e #1191 no enum de erros (unir os
  valores); #1197 e #1199 nos imports (manter os dois); #1171 e #1202 no `api-client.ts`, em trechos diferentes. Conflito fora desta
  lista: parar e reportar ao dono.
- **Em outra sessão (aberta pelo dono):** "Descartes propostos e desbloqueios" executa os resíduos: #1210 (SOT F-12.1, filho do
  #1177) e #1211 (INV F-41.1, draft, filho do #1181). Quando o pai entrar: `rebase --onto origin/main` e troca de base para `main`.
- **Parado no dono:**
  - SOT F-17.2: descartar ou não (o dono pediu a sugestão de correção; respondida no chat).
  - Faixas 3 e 4: um ID por vez, escrito no chat. Inclui a linha nova F4-N1.
  - #1160, #1167 e #1209 no lote.
  - Forks F-ENV-0..10 do BRIEF do BRD F-01.1 (#1207).
- **Conflitos de GAP-MAP, decisão do dono (10/11, questionário da orquestração do dia 1: "Tirar o GAP-MAP dos PRs" e "Trocar pela
  linha já na main"):** a orquestração do dia 1 executa. Cada PR aberto da faixa 1 ganha commit que devolve o `GAP-MAP.md` ao
  merge-base; um PR só de docs atualiza as linhas (mergeado → a linha que o PR escreveu; aberto → `[EM PR #n]`); um PR de cédula
  emenda a condição 1 da D-2026-11-10-FAIXA1-MERGE-LIVRE para "o ID do título tem linha na seção da faixa 1 do GAP-MAP da main".
- **#1170 × #1168 em `SalesPlugin.beforeCreate` (fora da lista):** a sessão INV resolveu localmente (`c6e5f1845`, os dois blocos
  intactos: recusa de `Finalized` do F-40.2 e zeramento dos totais do F-40.1) e segurou o push a pedido da orquestração. Liberado
  pelo dono (chat, 2026-11-10: "Libera o push"), com push só depois de os testes de venda e do finance passarem, e nova rodada do
  revisor no SHA novo (resolução de conflito em código derruba o PASS).
- **GAP-MAP fora dos PRs (feito pela orquestração do dia 1, 10/11):** 31 PRs abertos com commit que devolve o `GAP-MAP.md` à base;
  #1208 (verde) atualiza a seção da faixa 1: 12 `[CORRIGIDO 10/11, #n]` e 34 `[EM PR #n]`; #1209 (vermelho só texto, **precisa da
  confirmação do dono**) emenda a D-FAIXA1: condição 1 = o ID tem linha no GAP-MAP da `main`; condição 3 = o PASS sobrevive ao
  commit do GAP-MAP e a rebase/merge sem conflito em código; fim = nenhuma linha `[ABERTO]` ou `[EM PR #n]`. As F1-N não estão na
  lista de IDs da nota, então seguem fora da exceção, mas, abertas, adiam o fim dela. **Manter a seção é da orquestração d2:** a cada
  merge de PR da faixa 1, `[EM PR #n]` → `[CORRIGIDO dd/mm, #n]` no #1208 enquanto aberto, depois em PR de docs novo. O #1196 e o
  #1208 entram em qualquer ordem sem conflito (`git merge-tree`, 17h30).
- **Linhas novas (dia 2):** F1-N1, F1-N2 e F1-N3 na faixa 1 (GAP-MAP neste PR) e F4-N1 na faixa 4 (só aqui). Cada F1-N começa
  depois do merge do pai (#1180, #1178, #1206) e deste PR, com sessão cortada de `origin/main`.
- **Próximo passo:** depois de cada merge, mudar o Desfecho da linha para `corrigido #<PR> (mergeado <data>)` num PR de estado.
  Antes de instrumentar uma linha nova: `git fetch && git diff d3cf331e7 origin/main -- <arquivos citados>`; se mudou, reabrir.

## Linhas novas (dia 2)

Fora da contagem dos 114: são resíduos de PRs da faixa 1, não achados do inventário.

| Linha | Origem | Defeito | Faixa | Pai | Desfecho |
|---|---|---|---|---|---|
| F1-N1 | INV F-26.1, #1180 | apagar movimentação In pode deixar o estoque abaixo de `reserved` | 1 | #1180 (mergeado 10/11) | GAP-MAP neste PR; pronta quando este PR entrar |
| F1-N2 | INV F-42.1, #1178 | isenção de venda só de pacote na devolução sem teste de controle | 1 | #1178 | GAP-MAP neste PR; espera o merge do pai |
| F1-N3 | BRD F-73.2, #1206 | 35 `catch` do front não triados | 1 | #1206 | GAP-MAP neste PR; espera o merge do pai |
| F4-N1 | EFX F-18.2, #1167 | `updateJob` do EXPORTED sem CAS sobre PROCESSING: exportação > 10 min sobrescreve o FAILED da varredura [INF] | 4 | #1167 | aprovado 11/11 (dono, questionário: "F4-N1 (resíduo do #1167)") · registrado; só anda com o ID escrito pelo dono e teste-guarda determinístico |

## Tabela

Colunas: Tema + ID · Defeito · D · Score (só compara dentro do tema) · Evidência · Dependência · Faixa · Desfecho.
Desfecho: `aberto` · `aprovado <data>` · `GAP-MAP #<PR>` · `instrumentado #<PR>` · `não reproduzido` · `corrigido #<PR>` ·
`descartado` · `bloqueado`, sempre com o motivo.

| Achado | Defeito | D | Score | Evidência | Dependência | Faixa | Desfecho |
|---|---|---|---|---|---|---|---|
| SM F-40.2 | `executeProposal` não consome a proposta antes de escrever, nem confere `status`, `expiresAt` ou `kind` | D3 | 6.00 | [OBS ✔] [INF] | resp. 10/11: Q-03 = consumo na mesma tx da escrita; sem `options.tx`, CAS `PENDING → EXECUTED` e volta se a escrita falhar; `expiresAt` vencido recusa. A parte "executa duas vezes" é corrida; a parte `expiresAt`/`kind` é determinística. #1133 aberto toca `ActionProposalRepository`: reabrir depois dele | 4 | aprovado 11/11 (dono, questionário); instrumentar depois do merge do #1133 · aberto · inclui EFX F-15.1 |
| SM F-16.1 | estorno lê o status fora da tx e grava `Reversed` sem status no `where` | D3 | 3.00 | [OBS ✔] [INF] | nada; efeito de corrida [INF] | 4 | **[EM PR #1232]** (vermelho · revisor obrigatório; revisor rodada 1 **PASS**, 0 achados): `JournalEntryRepository.setStatus` ganha `expectedStatus?` (status no `where`, 0 linhas ⇒ `ConflictError` 409); `reverseEntry` passa `Posted`. Guarda determinístico `reverseEntryStatusCas.integration.test.ts` (vermelho antes; 2/2 depois). Ressalvas: estorno de `closing` conferido só por leitura; quem perde a corrida recebe 409 genérico, e o retry dá o 400 certo; fora de escopo: `setReversedBy` grava sem condição (não roda mais na corrida). Vai ao lote do dono · aprovado 11/11 (dono, questionário) · aberto |
| SM F-01.2 | recálculos de status do AP/AR sem `assertTransition` | D3 | 2.00 | [OBS ✔] | fila do PRE-ADR §4 item 2; entra depois do #1150 (item 1, toca `Receivable.model.ts`) | 1 | corrigido PARCIAL #1160 (vermelho; revisor rodada 2 PASS): lado AP com `assertTransition`; inclui o CAS do INV F-11.2. Falta o `assertTransition` do AR, à espera do #1150 (GAP-MAP [PARCIAL]). Vai ao lote do dono |
| SM F-09.2 | `transition()` do `FiscalDocument` grava sem CAS quando falta `whenStatusIn`; 2 chamadas sem guarda | D3 | 2.00 | [OBS ✔] [OBS] [INF] | ZP transmissão fiscal (`dfeEnvio.ts`); #1146 aberto toca os dois arquivos; resíduo da linha do GAP-MAP "DF-e — resultado automático gravado sem guarda de status" [CORRIGIDO 07/10]; corrida [INF] | 3 | aprovado 11/11 (dono, questionário); instrumentar depois do merge do #1146 · aberto |
| SM F-06.1 | `PaymentAccount`: troca de status sem CAS; PATCH e `CREDENTIAL_INVALID` concorrem | D3 | 1.00 | [OBS] [INF] | ZP pagamento (`PaymentAccount`); corrida [INF] | 3 | aprovado 11/11 (dono, questionário) · aberto |
| SM F-11.2 | `applyResult` da inutilização sem CAS de status | D2 | 1.00 | [OBS ✔] | ZP transmissão fiscal (inutilização); #1146 toca `FiscalNumberVoidService.ts` | 3 | aprovado 11/11 (dono, questionário); instrumentar depois do merge do #1146 · aberto |
| SM F-21.1 | reinstalação do kit volta a `INSTALLING` sem CAS | D3 | 0.50 | [OBS ✔] | nada; corrida [INF] | 4 | aprovado 11/11 (dono, questionário) · aberto |
| INV F-26.1 | saída manual de estoque ignora a reserva (e a edição de movimentação também) | D3 | 4.00 | [OBS ✔] | resp. 10/11: Q-02 = vale sempre; Q-A = só o motor é ZP | 1 | **mergeado 10/11 (#1180)** · **corrigido #1180 (mergeado 10/11)** · instrumentado e corrigido #1180 (verde; base #1153): saída e edição de movimentação recusam deixar estoque abaixo de `reserved`. Fora de escopo: o delete de uma entrada In também pode furar a reserva · o delete de entrada In virou a linha nova F1-N1 (dono, 10/11) |
| INV F-27.1 | `convertLead` confere `Converted` fora da tx; a tela só barra o duplo clique numa aba | D3 | 4.00 | [OBS ✔] [INF] | nada; corrida [INF] | 4 | **[EM PR #1230]** (verde): `convertLead` relê o lead em `repository.withTransaction(tx)` no início da tx e repete a guarda `Converted` antes de qualquer escrita; teste-guarda determinístico `CrmPipelineService.test.ts` › "INV F-27.1: lead convertido por outra chamada entre a leitura e a tx → ValidationError, sem conta nem contato" (stub lê Open fora da tx e Converted no repo da tx; vermelho antes: "Received promise resolved instead of rejected"); integração `dashboardModules` não rodou local (heavy-slot), fica com a CI. Fora de escopo anotado: `DynamicTableService.updateTableData` (~l. 788) lê `existingData` pelo repositório raiz mesmo com `options.tx` · aprovado 11/11 (dono, questionário) · aberto |
| INV F-37.1 | `reject` da revisão contábil confere o status fora da tx | D3 | 4.00 | [OBS ✔] [INF] | nada; corrida [INF] | 4 | **[EM PR #1231]** (vermelho · revisor obrigatório; revisor rodada 1 **PASS**): `reject` relê a revisão com `tx` e confere que segue aberta antes de escrever, como o `signOff`; 409 `REVIEW_NOT_OPEN` sem update nem evento. Guarda determinístico `AccountingReviewService.test.ts` › "reject: revisão assinada entre o preflight e a tx → 409 REVIEW_NOT_OPEN" (vermelho antes). Não rodado local: `rotasSemIntegracao.lote3.integration.test.ts` (sem `.env` no worktree do revisor; heavy-slot); fica com a CI. Vai ao lote do dono · aprovado 11/11 (dono, questionário) · aberto |
| INV F-06.1 | exclusão de conta e lançamento conferem um ao outro fora da tx | D3 | 2.00 | [OBS ✔] [OBS] [INF] | nada; corrida [INF] | 4 | aprovado 11/11 (dono, questionário) · aberto |
| INV F-11.2 | `revertClaim` devolve centavos sem guarda no `where`; caminho para saldo negativo não encontrado | D3 | 1.00 | [OBS ✔] | reaberto em 10/11: o #1160 (SM F-01.2) não cobre o CAS do `revertClaim`, e a sessão SM o deixou fora do escopo. Volta a ser linha própria: corrida (CAS no `where`) | 4 | **corrigido #1160 (mergeado 11/11, pelo dono)** · corrigido no #1160 (faixa 4 autorizada pelo dono na sessão SM: "Já resolve aqui esse fora do escopo", conferido no transcript): `releaseClaim` e `resolveRevertedClaim` com where status PAYING/RECEIVING e saldo suficiente; guardas falhavam antes do fix e o teste de integração do CAS real passa |
| INV F-12.1 | três escritas em título de imposto (`DEFERRED`, reabertura) sem a condição de saldo | D2 | 2.00 | [OBS ✔] [INF] | nada; corrida [INF] | 4 | aprovado 11/11 (dono, questionário) · aberto |
| INV F-16.3 | ativação de imobilizado aceita acumulado de abertura acima de `custo − residual`; o bem para de depreciar | D3 | 4.00 | [OBS ✔] [OBS] · **[OBS ✔] 10/11** | reaberto: `activateAsset` não compara o acumulado de abertura com a base (`FixedAssetService.ts:222-236`) | 1 | aprovado 10/11 (faixa 1) · PR #1155 aberto, **vermelho** (revisor obrigatório; rodada 1 PASS segundo a sessão) → lote do dono. Reproduzido; base no branch do #1153 |
| INV F-40.1 | o total da venda na criação é o que o navegador mandou, e vai ao razão se a venda nasce finalizada | D3 | 3.00 | [OBS ✔] | resp. 10/11: Q-11 = só rascunho na criação; Q-A. PR separado do F-40.2. #1145 aberto toca `useSalesCreateForm.ts` | 1 | **mergeado 10/11 (#1168)** · **corrigido #1168 (mergeado 10/11)** · aprovado 10/11 (faixa 1) · PR #1168 aberto, verde. Reproduzido (o POST gravava total 500, esperado 0). Escopo ampliado ao `dynamicTablesController.updateTableData`, que relê a linha antes das pontes, com autorização do dono dada na sessão INV ("pode estender a correção ao dynamicTablesController.ts", conferida por busca no transcript em 10/11) |
| INV F-40.2 | venda criada já finalizada pula as guardas do finalizar; "Finalizar Venda" da tela usa esse caminho | D3 | 3.00 | [OBS ✔] [INF] · **[OBS ✔] 10/11** | resp. 10/11: Q-11 = só rascunho na criação (o POST recusa `Finalized` de fora do sistema; a tela finaliza por atualização); Q-A. O teste-guarda é a "confirmação por execução" que o achado pede. #1145 aberto toca `useSalesCreateForm.ts` · reaberto: o `beforeCreate` não roda as guardas do finalizar (`SalesPlugin.ts:141-217`) | 1 | instrumentado e corrigido #1170 (verde; base main): o POST de venda Finalized dava 201; o `SalesPlugin.beforeCreate` passa a recusar Finalized de fora do sistema (400) e o `useSalesCreateForm` cria Draft e finaliza por `updateSale` depois dos itens. Conflito com o #1168 no `SalesPlugin.ts` resolvido no merge c6e5f1845 (push liberado pelo dono: "Libera o push", com os testes antes): createFinalized 1/1, createTotals 1/1, serviceQuantity 2/2, vitest financeiro 104/104; revisor rodada 2 no diff do merge PASS (os blocos F-40.2 e F-40.1 intactos; tirar a guarda do F-40.2 deixa o createFinalized vermelho). Conflito textual previsto com o #1145 (mesmas linhas do submit). Tela no build de produção não verificada |
| INV F-14.2 | venda de pacote sem cliente cadastrado lança o passivo e não credita saldo; só a tela exige cliente | D3 | 2.00 | [OBS ✔] [OBS] · **[OBS ✔] 10/11** | resp. 10/11: Q-A = só o motor é ZP · reaberto: "cliente simples" passa sem `customerId` (`SalesPlugin.ts:163-171`) | 1 | **mergeado 10/11 (#1175)** · **corrigido #1175 (mergeado 10/11)** · instrumentado e corrigido #1175 (verde; base #1153): o PUT Finalized de venda só de pacote com cliente simples dava 200; a guarda do finalizar exige `customerId` (400). Fixture do `packageQuantity` passa a usar cliente cadastrado |
| INV F-15.2 | o reconcile do estoque contábil regrava o retrato fora de transação | D2 | 2.00 | [OBS ✔] [OBS] [INF] | nada; corrida [INF] | 4 | aprovado 11/11 (dono, questionário) · aberto |
| INV F-41.1 | compra manual de estoque: só a tela barra | D3 | 2.00 | [OBS ✔] | resp. 10/11: Q-A = só o motor é ZP (a guarda é local no `StockMovementsApplyPlugin.ts`) | 1 | instrumentado e corrigido #1181 (verde; base #1153): o `StockMovementsApplyPlugin` recusa In/Purchase que não seja a linha do título; o seed de dev (`SeedInventory.ts`) passou o estoque inicial para Adjustment. Resíduo: o prefixo do `detailKey` é forjável; exigir `isSystem` fica para decisão do dono · 10/11: exigir `isSystem` autorizado (dono, questionário da sessão Descartes); em PR filho do #1181, naquela sessão · resíduo no #1211 (draft, base #1181): a linha `ACCOUNTING_PAYABLE:` só com `ctx.isSystem === true`; só o commit `test:` subiu (vermelho provado na CI: o jest local ficou na fila do heavy-slot); `fix:`, classe e revisor depois · resíduo → #1211 (verde; empilhado no #1181): o plugin só aceita a linha `ACCOUNTING_PAYABLE:` com `ctx.isSystem === true` (dono, 10/11: "Exigir isSystem"); vermelho provado na CI (run 42866346019), fix 631aae1e6. Conflito previsto com o #1152 no comentário "ponytail:" |
| INV F-42.1 | devolução lança a contra-receita sem conferir a receita | D3 | 2.00 | [OBS ✔] [OBS] · **[OBS ✔] 10/11** | nada; vizinho da linha do GAP-MAP "Pacote — cancelar ou devolver venda de pacote" (a parte devolução segue aberta lá, com decisão do dono pendente) e mexe no mesmo `SaleReversalBridge.ts` · reaberto: `Returned` lança sem a guarda de ordem que a liquidação tem (`SaleReversalBridge.ts:133-158` × `SaleSettlementBridge.ts:90-106`) | 1 | instrumentado e corrigido #1178 (vermelho, job de reconcile; revisor rodada 1 PASS): a devolução só lança com o `sale.finalized` já lançado, na ponte e nas duas chamadas do reconcile; sem ele, `OPENING_ENTRY_MISSING`. Venda só de pacote inalterada. Revisor: a isenção de pacote não tem teste (removida, 71 testes verdes); teste de controle fica como follow-up. Cumpre a D-2026-11-10-FAIXA1-MERGE-LIVRE (sem arquivo de ZP; PASS a conferir no SHA de cabeça), então não vai ao lote · o teste de controle virou a linha nova F1-N2 (dono, 10/11) |
| INV F-16.4 | editar ativo confere o status fora da tx e grava sem versão | D2 | 1.00 | [OBS ✔] [INF] | nada; corrida [INF] | 4 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-01.1 | Quatro formatos de corpo de erro; a mesma falha de validação sai em dois (`flatten` nos 485 `safeParse`; `issues` quando o schema lança) | D4 | 2,0 | ficha BRD-01 | resp. 10/11: BRD Q1 = (c) `handleApiError` único. D4, contrato de API (ZP), 485 respostas: vai à `sessao-planejamento` (BRIEF próprio), não à correção | 3 | **forks F-ENV-0..10 ratificados 11/11** (dono, questionário); falta o `executa` · **BRIEF mergeado 10/11 (#1207)** · aberto · 10/11: BRIEF autorizado em sessão própria, só BRIEF (dono, questionário da sessão Descartes) · BRIEF no #1207 (só docs, `BE-INCR-API-ERROR-ENVELOPE-brief.md`, verde, base main); forks F-ENV-0..10 pendentes do dono · BRIEF → #1207 (verde, base main, só docs; aberto pela sessão brief-brd-f01-1) |
| BRD F-02.1 | JSON malformado ou corpo acima do limite respondem 500 e entram no log como defeito | D3 | 4,0 | ficha BRD-02 · **[OBS ✔] 10/11** | reaberto: `handleApiError` não reconhece erro do body-parser e cai no 500 (`apiUtils.ts:59-68`) | 1 | **mergeado 10/11 (#1154)** · aprovado 10/11 (faixa 1) · PR #1154 aberto, verde (vermelho → verde segundo a sessão; base no branch do #1153) |
| BRD F-03.4 | `NODE_ENV` ausente vale `development`: o 500 leva `stack` ao cliente e as guardas "recusa produção" dos adaptadores falsos não disparam | D3 | 3,0 | ficha BRD-03 | resp. 10/11: Q6 = exigir `NODE_ENV` no boot; conferir scripts de dev, teste e deploy | 1 | **mergeado 10/11 (#1174)** · **corrigido #1174 (mergeado 10/11)** · corrigido #1174 (verde; base #1153): `validateEnv` lança sem `NODE_ENV`; Dockerfile `ENV NODE_ENV=production`; `.env.example` `NODE_ENV=development`. Efeito: dev com `server/.env` antigo sem `NODE_ENV` passa a falhar no boot (consequência da decisão BRD Q6) |
| BRD F-04.2 | Paginação por `Number()`: `listDocuments` deixa `NaN` seguir; `getTableData` troca valor inválido por 1 e 50 | D3 | 2,0 | ficha BRD-04 | nada | 1 | **mergeado 10/11 (#1184)** · corrigido #1184 (verde): `parsePageParam` responde 400 para page/limit/pageSize inválido |
| BRD F-04.3 | Handler com validação à mão (`throw ValidationError`) e `safeParse` responde a mesma falha em dois formatos | D3 | 1,0 | ficha BRD-01, BRD-04 | resp. 10/11: BRD Q1 = (c); espera o BRD F-01.1 | 2 | bloqueado: depende do BRIEF do BRD F-01.1 · no BRIEF #1207 é o PR-10 · 11/11: forks ratificados; espera o `executa`, o PR-1 e o PR-4 |
| BRD F-08.1 | `getAnalyticsData` valida só `key` e repassa `{ ...req.query }` inteiro | D3 | 1,0 | ficha BRD-08 · **[OBS ✔] 10/11** | reaberto: `{ ...req.query }` entra depois da validação dos mapeamentos e os sobrescreve em `processorParams` (`AnalyticsResolver.ts:318`, `:355-357`); o alcance fica nos dados do próprio usuário | 1 | **mergeado 10/11 (#1185)** · **corrigido #1185 (mergeado 10/11)** · corrigido #1185 (verde): `resolveChartData` confere `statusField`/`amountField`/`dateField`/`paymentStatusField` sobre o preset somado à query, de modo que o parâmetro de query não passa por cima do mapeamento validado |
| BRD F-46.2 | `webhookSecret` ausente na credencial faria `createHmac` lançar fora de `try` (500) [INF] | D3 | 1,0 | ficha BRD-46 (nr = não reaberto) | ZP (marca da ficha) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-49.1 | Chaveiro ausente é 503 com tipo; chaveiro malformado é `Error` simples (500) | D3 | 1,0 | ficha BRD-49, BRD-71 (nr = não reaberto) | ZP: a ficha BRD-49 (callback do PSC) é marcada ZP | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-53.1 | `assinarHash` promete `ok:false`, mas corpo JSON `null` lança `TypeError` fora do `try` | D3 | 1,0 | ficha BRD-53 | ZP (marca da ficha) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-54.1 | Retorno da SEFAZ sem `cStat` vira `REJECTED` (`sefaz_sem_cstat`) em emitir, cancelar e inutilizar | D4 | 1,5 | ficha BRD-54 | D4; ZP; BRD Q2 | 3 | aberto |
| BRD F-54.2 | `parser.parse` do retorno sem `try`: XML ilegível sobe sem o tipo `SefazTransporteError` | D3 | 1,0 | ficha BRD-54 (nr = não reaberto) | ZP (marca da ficha) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-56.1 | Falha do provedor de LLM no chat e na entrevista vira `Error` genérico (500), com duas linhas de log; os teammates têm tipo por categoria | D3 | 2,0 | ficha BRD-56, BRD-60 | nada | 1 | **mergeado 10/11 (#1189)** · corrigido #1189 (verde): o `OpenAIService` lança `LlmProviderError`; o `handleApiError` responde `LLM_<kind>` 503/502 com texto fixo. Encosta no `handleApiError`, alvo do BRIEF do BRD F-01.1 (faixa 3): o BRIEF parte deste código |
| BRD F-56.2 | `finish_reason` não é lido em nenhum cliente: resposta cortada por limite de tokens passa por completa | D3 | 2,0 | ficha BRD-56 | resp. 10/11: Q7 = mostrar o texto com aviso de corte | 1 | **mergeado 10/11 (#1190)** · corrigido #1190 (verde): o `OpenAIService` lê `finish_reason` e anexa aviso de corte nos 3 métodos de texto livre (decisão BRD Q7 = a); teammates fora |
| BRD F-57.1 | Chamada de ferramenta com argumentos ilegíveis é pulada sem mensagem `tool`, com o histórico já contendo a chamada | D3 | 4,0 | ficha BRD-57 | nada | 1 | **mergeado 10/11 (#1161)** · **corrigido #1161 (mergeado 10/11)** · aprovado 10/11 (faixa 1) · PR #1161 aberto, verde (enum `ARGUMENTOS_INVALIDOS` novo; o F-57.2 mexe na mesma linha, rebaseia quem entrar depois) |
| BRD F-57.2 | Erro de argumento do modelo: `query_table_data` devolve erro ao modelo; `search_documents` e nome desconhecido lançam e viram HTTP 4xx para o usuário | D3 | 4,0 | ficha BRD-57 | nada | 1 | **mergeado 10/11 (#1164)** · aprovado 10/11 (faixa 1) · PR #1164 aberto, verde. Trocou a asserção de `searchDocumentsTool.test.ts` que fixava o `ValidationError` (o próprio defeito); conflito previsto com o #1161 na linha do enum |
| BRD F-57.3 | Argumentos de ferramenta lidos por cast; a proposta é gravada sem validar contra a tabela, e a falha só aparece na confirmação | D3 | 2,0 | ficha BRD-57 (nr = não reaberto) | nada; #1133 aberto mexe na caixa de propostas, rebasear | 1 | corrigido #1191 (verde): `SchemaValidator` na criação da proposta; `DADOS_INVALIDOS` volta ao modelo. O enum de erro conflita com #1161/#1164; resolução = união dos valores |
| BRD F-58.1 | Intenção e nova tabela da entrevista: `JSON.parse` devolvido cru com o tipo declarado; `tableName` e `description` só conferidos como verdadeiros | D2 | 4,0 | ficha BRD-58 | nada | 1 | **mergeado 10/11 (#1165)** · **corrigido #1165 (mergeado 10/11)** · aprovado 10/11 (faixa 1) · PR #1165 aberto, verde |
| BRD F-60.2 | O prefixo de código do erro lê `error.code`; o erro do provedor tem `kind` | D3 | 1,0 | ficha BRD-60 | nada; teammates "escrito e não ligado" (EFX-16), efeito hoje só em teste; #1133 é do mesmo módulo | 1 | **mergeado 10/11 (#1192)** · corrigido #1192 (verde): o `TeammateRunner` prefixa o erro FAILED com `LlmProviderError.kind` (antes lia um `code` que o erro do provedor não tem). Independente do #1189: a classe já existe na base |
| BRD F-62.1 | O 415 de upload tem texto fixo de tipos aceitos, errado para certificado e XML | D3 | 2,0 | ficha BRD-62 | nada | 1 | **mergeado 10/11 (#1193)** · **corrigido #1193 (mergeado 10/11)** · corrigido #1193 (verde): a mensagem 415 do `uploadSecurity` é montada da allowlist do chamador |
| BRD F-63.1 | NF-e recebida: sem teto de valor e sem validação de calendário, segundo a coleta | D3 | 2,0 | ficha BRD-63 (nr, [INF]) · **[OBS ✔] 10/11** | reaberto: `moneyToCents` sem teto e `dateOnly` só por regex (`nfe.ts:166-196`). O teto é política (o valor 13v2 cabe sem perda); o defeito é o calendário | 1 | **mergeado 10/11 (#1194)** · corrigido #1194 (vermelho, `nfe.ts`; revisor rodada 1 PASS, sabotagem dupla): o `dateOnly` da NF-e recebida recusa data fora do calendário (ex.: 2026-02-30); o teto de valor segue como política. Entra pela D-2026-11-10-FAIXA1-MERGE-LIVRE |
| BRD F-64.1 | Evento de NFS-e: `dhProc` conferido só quanto à presença | D3 | 1,0 | ficha BRD-64 (nr = não reaberto) | ZP (marca da ficha) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-65.1 | XLSX corrompido responde 500 genérico em extrato, importação contábil e catálogo; CSV inválido responde 400 com detalhe | D3 | 4,0 | ficha BRD-65, BRD-67 · **[OBS ✔] 10/11** | reaberto: `wb.xlsx.load` sem `try` (`spreadsheet.ts:103`) | 1 | **mergeado 10/11 (#1156)** · aprovado 10/11 (faixa 1) · PR #1156 aberto, verde (base no branch do #1153). Fora do escopo, anotado pela sessão: o teto `MAX_IMPORT_CELLS` lança `Error` simples (500) |
| BRD F-65.3 | Relatório do provedor: data impossível é aceita e rola o dia | D3 | 1,0 | ficha BRD-65 (nr = não reaberto) | nada; o parser `S/lib/mpReleaseReport.ts` é do relatório do provedor de pagamento: confirmar na aprovação que não conta como ZP | 1 | **mergeado 10/11 (#1195)** · **corrigido #1195 (mergeado 10/11)** · corrigido #1195 (verde): o parser `mpReleaseReport` recusa DATE fora do calendário; o adaptador de pagamento (ZP) não foi tocado, só `server/src/lib/mpReleaseReport.ts`. Base ainda na branch do #1153 (já mergeado): falta rebase para main |
| BRD F-66.1 | Custo de tokens: sem conferência de assinatura de bytes; erro do extrator responde 500 | D3 | 2,0 | ficha BRD-66 | nada | 1 | corrigido #1197 (verde): `computeTokenCost` confere os magic bytes (415) e o erro do extrator vira 400; o fixture do teste #15 passou a ter assinatura ZIP real |
| BRD F-66.2 | Custo de tokens: `data.buffer.slice(0, byteLength)` ignora `byteOffset` | D2 | 4,0 | ficha BRD-66 | nada | 1 | **mergeado 10/11 (#1169)** · **corrigido #1169 (mergeado 10/11)** · aprovado 10/11 (faixa 1) · PR #1169 aberto, verde |
| BRD F-66.3 | `documentsController` duplica o multer e a conferência de bytes com regra diferente para `octet-stream` | D3 | 0,5 | ficha BRD-66 (nr = não reaberto) | nada | 1 | corrigido #1199 (verde): o `documentsController` usa os comuns `makeUploadMiddleware`/`validateMagicBytes`; `msword` saiu da allowlist (o `.doc` já era sempre recusado). Conflita com o #1197 nos imports; resolução = manter os dois |
| BRD F-66.4 | Extração de PDF, DOCX e XLSX de documento sem limite de páginas ou células | D3 | 2,0 | ficha BRD-66 (nr = não reaberto) | nada | 1 | **mergeado 10/11 (#1200)** · corrigido #1200 (verde): XLSX com o teto `MAX_IMPORT_CELLS` (2.000.000); PDF até 500 páginas e DOCX até 2.000.000 de caracteres extraídos, acima disso `ValidationError` → 400 (decisão do dono 10/11) |
| BRD F-69.1 | Leitura central de `LegalParameter.valorJson` faz `JSON.parse` sem `try`: uma linha ilegível derruba toda leitura de parâmetros | D3 | 3,0 | ficha BRD-69 | nada | 1 | **mergeado 10/11 (#1176)** · corrigido #1176 (vermelho, parâmetro legal; revisor rodada 1 PASS, 2 sabotagens): valor JSON ilegível vira 500 `PARAMETRO_LEGAL_ILEGIVEL` pelo `handleApiError`. Vai ao lote do dono |
| BRD F-71.1 | `readMsEnv` copiado em 6 arquivos; 5 lançam em valor inválido e 1 (`DFE_POLL_AFTER_MS`) usa o default em silêncio | D2 | 1,0 | ficha BRD-71 (nr = não reaberto) | resp. 10/11: um leitor `readMsEnv` só, que lança em valor inválido | 1 | corrigido #1201 (vermelho, jobs de polling do DF-e e de parâmetro legal; revisor rodada 1 PASS, sabotagem dupla): um `readMsEnv` único em `src/jobs`; `DFE_POLL_AFTER_MS` inválido lança no `DfePollScheduler.start()`. Nenhum arquivo de envio/cancelamento/assinatura (ZP) no diff. Entra pela D-2026-11-10-FAIXA1-MERGE-LIVRE |
| BRD F-71.2 | Configuração de integração validada só na primeira chamada: o erro aparece para o usuário como 500/503 | D3 | 1,0 | ficha BRD-71 (nr = não reaberto) | resp. 10/11: conferir no boot a configuração das integrações habilitadas; toca pagamento, PSC e SEFAZ (ZP) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| BRD F-72.1 | Erro HTTP gera toast; erro de rede não gera e leva a mensagem crua do navegador | D3 | 4,0 | ficha BRD-72 | nada | 1 | **mergeado 10/11 (#1171)** · **corrigido #1171 (mergeado 10/11)** · instrumentado e corrigido #1171 (verde; base #1153): o TypeError do fetch vira toast e `Error(NETWORK_ERROR_MESSAGE)` sem status. 5 testes de serviço que fixavam a string "Failed to fetch" passaram a afirmar a constante |
| BRD F-72.2 | Resposta 2xx com corpo não-JSON volta como dado de sucesso | D3 | 2,0 | ficha BRD-72 | nada | 1 | **mergeado 10/11 (#1202)** · corrigido #1202 (verde): o `apiClient` rejeita resposta 2xx que não é JSON, com status e toast; um assert antigo foi trocado. Mesmo `api-client.ts` do #1171, em hunks diferentes |
| BRD F-72.4 | Sem timeout no cliente de API e no ViaCEP | D3 | 2,0 | ficha BRD-72 | resp. 10/11: limite de 60 s no cliente de API e 10 s no ViaCEP | 1 | **mergeado 10/11 (#1203)** · corrigido #1203 (verde): 60 s no `apiClient` (`AbortSignal.timeout` + `AbortSignal.any`), 10 s no ViaCEP, mensagem no estouro (decisão do dono 10/11). O teste da Entrevista passou de "identidade do signal" para "abortar o do chamador aborta". `AbortSignal.any` exige navegador recente (Chrome 116, Safari 17.4, Firefox 124) |
| BRD F-72.6 | `document.service.ts` sem default de URL base e com leitura do cookie por `split` | D2 | 2,0 | ficha BRD-72 | nada | 1 | **mergeado 10/11 (#1204)** · corrigido #1204 (verde): o `document.service` passa a usar os comuns `multipartBaseUrl`/`AuthHeaders`/`ParseError` |
| BRD F-73.1 | Doze extratores de mensagem de erro; os dois principais com ordem inversa, e um não trata o formato de validação | D3 | 2,0 | ficha BRD-73 | resp. 10/11: BRD Q1 = (c); espera o BRD F-01.1 | 2 | bloqueado: depende do BRIEF do BRD F-01.1 · no BRIEF #1207 é o PR-2 (antes da migração) · 11/11: forks ratificados; espera o `executa` e o PR-1 |
| BRD F-73.2 | 44 pontos do front engolem a falha: 16 `catch` vazios, 19 só `console`, 9 `.catch(() => null)` | D3 | 2,0 | ficha BRD-73 (nr = não reaberto) | nada; a 1ª etapa é separar os `catch` intencionais (comentados) dos que engolem falha | 1 | **mergeado 10/11 (#1206)** · corrigido nos 9 pontos nomeados na ficha, #1206 (verde; base main): 4 corrigidos (`fetchAllRows` passa a rejeitar em vez de engolir, 1ª carga do Kanban, Pessoas, widget ERP) e 5 intencionais ou inalcançáveis. Resíduo: 35 ocorrências achadas pelo script da ficha não foram triadas. `fetchAllRows` é o loader comum das tabelas do CRM (`useTableData`): raio amplo · as 35 ocorrências viraram a linha nova F1-N3 (dono, 10/11) |
| BRD F-74.1 | Conversão de lead: valor com vírgula vira `NaN` e a oportunidade é criada sem valor, sem aviso | D3 | 4,0 | ficha BRD-74 · **[OBS ✔] 10/11** | reaberto: `Number(amount)` e `amount: undefined` em silêncio (`OpportunityCreateModal.tsx:100-113`) | 1 | **mergeado 10/11 (#1159)** · aprovado 10/11 (faixa 1) · PR #1159 aberto, verde |
| BRD F-75.1 | `localStorage` e `router.query` lidos por cast, sem checagem | D2 | 1,0 | ficha BRD-75 (nr = não reaberto) | nada | 1 | **mergeado 10/11 (#1205)** · corrigido #1205 (verde; base main): `useTheme`/`_document` só aceitam light\|dark; o dashboard ignora `?category` vindo em array. O ponto de `leads/[id]` não reproduziu (teste-guarda verde sem fix), sem correção |
| EFX F-02.1 | cancelamento de cobrança perde o autor em queda | D3 | 0.50 | [OBS ✔] [INF] | ZP pagamento | 3 | aprovado 11/11 (dono, questionário) · aberto |
| EFX F-06.1 | cancelamento de NF-e/NFC-e sem intenção gravada e sem reconciliação | D5 | 3.00 | [OBS ✔] [INF] | D5; ZP fiscal; EFX Q-02 | 3 | aberto |
| EFX F-06.2 | retorno do evento de cancelamento não é guardado | D3 | 2.00 | [OBS ✔] [OBS] | ZP fiscal; EFX Q-03 (tema G: guardar o retorno é obrigação?) | 3 | aberto |
| EFX F-08.1 | inutilização presa em `REQUESTED` | D5 | 2.00 | [OBS] | — | — | descartado (dono, questionário da sessão Descartes, 10/11: "SOT F-22.1, EFX F-08.1, EFX F-13.1 e F-14.2"): duplicata de SM F-11.1, que é Classe Produto (SM Q-02) e segue fora desta orquestração |
| EFX F-09.1 | consumo do PSC contado depois | D3 | 0.50 | [OBS] [INF] | ZP assinatura (PSC; minha leitura, o inventário não marca); #1146 toca `DfeAssinaturaResolver.ts` | 3 | aprovado 11/11 (dono, questionário); instrumentar depois do merge do #1146 · aberto |
| EFX F-13.1 | chamada paga a LLM sem registro de uso | D3 | 2.00 | [OBS] | — | — | descartado (dono, questionário da sessão Descartes, 10/11: "SOT F-22.1, EFX F-08.1, EFX F-13.1 e F-14.2"): não é defeito. O código registra as duas faltas como decisão: "embedding excluded — F-I11-5 → a" e "its usage is lost (accepted limit, BRIEF item 15)" (`ChatService.ts:117`, `:123`). Sobra a entrevista sem registro: é escopo do I11, pergunta de Produto [OBS ✔, 10/11] |
| EFX F-14.2 | trechos sem vetor depois de falha do embedding | D2 | 1.00 | [OBS] | — | — | descartado (dono, questionário da sessão Descartes, 10/11: "SOT F-22.1, EFX F-08.1, EFX F-13.1 e F-14.2"): a condição do próprio achado é satisfeita. `ChunkRepository.findStale` seleciona `embeddingModel: null` (`:43-55`) e o `ChunkReindexService` reembeda e carimba (`:30-53`). Ressalva: a reindexação é o CLI `rag:reindex`, manual [OBS ✔, 10/11] |
| EFX F-15.1 | proposta do agente executa duas vezes | D3 | 6.00 | [OBS ✔] | duplicata | — | linha única em SM F-40.2 |
| EFX F-17.1 | Reinf e upload de importação falham sem alerta | D5 | 2.00 | [OBS ✔] [OBS] | D5 | 3 | aprovado 11/11 (dono, questionário) · aberto |
| EFX F-18.1 | arquivo órfão no anexo do CRM e na Reinf | D2 | 2.00 | [OBS] | metade em ZP (Reinf). A metade CRM (`AttachmentService.ts:88-96`) sozinha seria faixa 1; dividir é decisão do dono | 3 | aprovado 11/11 só a metade CRM (dono, questionário: "EFX F-18.1 só metade CRM"); metade Reinf segue aberta · aberto |
| EFX F-18.2 | job de exportação preso em `PROCESSING` | D3 | 1.00 | [OBS] [INF] | resp. 10/11: SM Q-07 = varredura por `updatedAt` antigo leva a `FAILED` com motivo (padrão `claimStaleConfirming`); o scheduler precisa do caso de alerta que o teste de schedulers exige | 1 | corrigido #1167 (vermelho contábil; revisor rodada 1 FAIL, rodada 2 PASS): `DataExchangeStaleSweepScheduler` (5 min) leva a FAILED por CAS o job PROCESSING com `updatedAt` > 10 min e limpa o `supersedesJobId` (achado da rodada 1). Fora de escopo: o `updateJob` do EXPORTED não tem CAS sobre PROCESSING (requisição > 10 min sobrescreve o FAILED). Vai ao lote do dono também por baseline: acrescenta `DataExchangeStaleSweepScheduler.ts: 1` ao ledger de dívida em `docs/architecture/lint-layer-gate.md` (baseline de gate cresce; fora da exceção, item 2) · o `updateJob` sem CAS virou a linha nova F4-N1, faixa 4 (dono, 10/11) |
| EFX F-18.3 | geração simultânea do mesmo SPED | D3 | 0.50 | [INF] | corrida [INF]; conferir com INV-39 | 4 | aprovado 11/11 (dono, questionário) · aberto |
| EFX F-19.1 | passo da purga que falha bloqueia os outros | D3 | 1.00 | [OBS] · **[OBS ✔] 10/11** | reaberto: passos da purga em sequência, sem `try` por passo (`PurgeDeletedRecords.ts:116-130`) | 1 | **mergeado 10/11 (#1158)** · aprovado 10/11 (faixa 1) · PR #1158 aberto, verde. Reproduzido (os passos seguintes eram chamados 0 vezes) e corrigido, segundo a sessão |
| EFX F-23.1 | estoque gravado em gancho `before*`, fora da transação | D3 | 2.00 | [OBS ✔] | ZP motor de plugins e contrato do `DynamicTableService`; EFX Q-05 | 3 | aberto |
| EFX F-23.3 | `supports` que lança desliga o plugin em silêncio | D3 | 2.00 | [OBS ✔] | ZP motor (`RuleRegistry.ts`) | 3 | aprovado 11/11 (dono, questionário) · aberto |
| SOT F-01.1 | a tela calcula o saldo do título por conta própria, diferente da do servidor | D2 | 4.00 | [OBS ✔] [INF] · **[OBS ✔] 10/11** | reaberto: `amountCents - sumActive(receipts)` (`AccountsReceivablePanel.tsx:393`, `:441`) | 1 | aprovado 10/11 (faixa 1) · PR #1157 aberto, **vermelho** (tela contábil); revisor rodada 1 aprova, segundo a sessão |
| SOT F-18.1 | `FiscalDocumentStatus` do front com 6 dos 9 status | D3 | 4.00 | [OBS ✔] [INF] · **[OBS ✔] 10/11** | nada (lê o tipo gerado, não o altera) · reaberto: 6 status em `dfe.service.ts:51`, 9 no tipo gerado | 1 | aprovado 10/11 (faixa 1) · PR #1162 aberto, **vermelho** (tela fiscal); revisor rodada 1 aprova, segundo a sessão |
| SOT F-02.2 | histórico de pagamentos mostra `NONE` e `ProviderBalance` crus | D3 | 2.00 | [OBS ✔] [INF] | resp. 10/11: o dono escolheu "aprova F-02.1 junto": SOT F-02.1 (Representação D1, só tipo) entra antes, em PR próprio | 1 | **SOT F-02.1 mergeado 10/11 (#1166)** · **mergeado 10/11 (#1214)** · corrigido, em PR #1214 (vermelho; revisor rodada 1 APROVA no #1198): o histórico do AP mostra rótulo para `NONE`; o do AR, para `ProviderBalance` e `SplitPayment`; locales pt/en em paridade. O #1198, empilhado no #1166, foi fechado pelo GitHub quando o #1166 entrou; os dois commits foram aplicados sobre a main sem conflito e o diff do #1214 é idêntico. O SOT F-02.1 (#1166) já está mergeado. Limite: os testes provam o texto padrão do `t()`, não a chave do JSON |
| SOT F-11.1 | três regras de reais → centavos | D3 | 2.00 | [OBS ✔] [OBS] | resp. 10/11: Q-07 = erro e teto `MAX_CENTS` em todos os caminhos; um teste-guarda por caminho | 1 | corrigido #1173 (vermelho, `saleLine.ts`; revisor rodada 1 APROVA): `reaisToCents` lixo→erro e teto; `centsFromReais` teto; `assertCentsInRange` já conforme. Desconto vazio segue 0 (só lixo vira erro); ~14 conversões escritas no próprio sítio ficaram fora (o diff passaria de 15 arquivos) |
| SOT F-12.1 | data e competência validadas só por regex em 14 sítios | D3 | 2.00 | [OBS ✔] [OBS] [INF] | nada; família de 14 sítios: sítio em ZP sai (o exemplo citado, `FiscalCertificateDto.ts`, é certificado; a BRD-68 marca PFX como ZP) | 1 | **mergeado 10/11 (#1177)** · corrigido PARCIAL #1177 (vermelho; revisor rodada 1 APROVA): 7 de 14 sítios. Fora: 4 em ZP (certificado, assinador, PSC, DPS); 2 por fronteira de import (`KitInstallationDto.today`, `ActivateDefaultBindingDto.period`: liberar `models/dates` no `importBoundary.test` é decisão do dono); `WithholdingService:620` sem borda · 10/11: liberar `models/dates` autorizado (dono, questionário da sessão Descartes); os 2 sítios em PR filho do #1177, naquela sessão · resto no #1210 (base #1177; regex + refine em `KitInstallationDto.today` e `ActivateDefaultBindingDto.period`, allowlist dos 2 `importBoundary.test`; vermelho, ponte venda → razão; revisor rodada 1 em andamento; shape do contrato inalterado) · resto → #1210 (vermelho, ponte venda → razão; revisor rodada 1 APROVA; empilhado no #1177): `KitInstallationDto.today` e `ActivateDefaultBindingDto.period` com regex + refine; o `importBoundary.test` libera só esses 2 nomes de `accounting/models/dates` (dono, 10/11: "Liberar"); shape do contrato inalterado |
| SOT F-23.1 | subtotal da venda com duas fórmulas no front | D3 | 2.00 | [OBS ✔] [OBS] [INF] | nada; #1145 aberto toca `useSalesCreateForm.ts`, citado na ficha | 1 | **mergeado 10/11 (#1172)** · **corrigido #1172 (mergeado 10/11)** · corrigido #1172 (verde; base #1153): `saleLinesSubtotal` única para formulário e detalhe. Conflito provável com o #1145 em `useSalesCreateForm.ts` |
| SOT F-01.4 | texto do tie-out do AP descreve a soma errada | D3 | 1.00 | [OBS ✔] | nada | 1 | **mergeado 10/11 (#1179)** · corrigido #1179 (vermelho; revisor rodada 1 APROVA): o detail do check do AP passa a ser montado de `PAYABLE_OUTSTANDING_STATUSES`. Vai ao lote do dono |
| SOT F-17.2 | cache de KPI invalidado só por escrita de DynamicTable | D2 | 1.00 | [OBS ✔] [INF] | Q-08 respondida por leitura | — | descartado (dono, questionário, 2026-11-11: "Descartar (não reproduzido)") · não reproduzido na instrumentação (10/11; dono, chat da sessão Descartes: "Volta à faixa 1" e "Pode autorizar essa tbm"): o `KpiCacheService` guarda só a lista de gráficos (definições), não valor de KPI; o valor é calculado a cada pedido em `AnalyticsResolver.ts:316-330`; toda escrita que muda as definições invalida (controllers de DynamicTable, `dashboardController.installModule`, provisionamento, reset, `analyticsDefinitionsController`). Teste-guarda verde sem fix, nenhum PR. Resíduo, não defeito: `compensateProvisioning` apaga tabelas sem invalidar (TTL 5 min) |
| SOT F-22.1 | duas `formatBRL` com comportamento diferente | D3 | 1.00 | [OBS] | — | — | descartado (dono, questionário da sessão Descartes, 10/11: "SOT F-22.1, EFX F-08.1, EFX F-13.1 e F-14.2"): não reproduzido. As duas `formatBRL` devolvem "R$ 0,00" para ausente, `null` e `NaN` (`finance/utils/formatters.ts:19-21`; `shared/utils/formatters.ts:15-27`); só ±Infinity diverge, o que a ficha não descreve. Unificar as duas é Representação [OBS ✔, 10/11] |
| AUT F-01.1 | usuário apagado continua autenticado e com o papel do token | D3 | 6.00 | [OBS ✔] [INF] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-01.2 | papel lido do JWT; troca de papel ou de senha não invalida tokens | D3 | 6.00 | [OBS ✔] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-23.1 | catálogo referencial global exige `ADMIN` no controller; o resto da plataforma exige `PLATFORM_ADMIN` | D3 | 4.00 | [OBS ✔] [OBS] | tema F (não delegado) | 3 | aberto |
| AUT F-04.2 | `ADMIN` troca senha e papel de `PLATFORM_ADMIN` | D3 | 3.00 | [OBS ✔] [INF] | tema F (não delegado) | 3 | aberto |
| AUT F-52.1 | `ADMIN` lê e altera dado de qualquer cliente em 6 módulos e em nenhum dos outros | D3 | 3.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-04.1 | criação de usuário por admin cai na rota pública e o papel é ignorado | D3 | 3.00 | [OBS ✔] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-01.3 | cookie de 24 h e JWT de 7 dias | D3 | 2.00 | [OBS ✔] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-45.1 | prefixo público do assinador cobre rotas que ainda não existem | D3 | 2.00 | [OBS ✔] [INF] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-51.1 | binding e kit aceitam `unitId` sem validar | D3 | 2.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-02.1 | documentação da API pública | D3 | 2.00 | [OBS ✔] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-52.3 | listas fechadas de papel excluem `PLATFORM_ADMIN` | D3 | 2.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-52.2 | policy contábil não distingue dono de delegado | D3 | 1.50 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-01.4 | dois leitores do contexto do usuário | D3 | 1.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-51.2 | 9 handlers no comentário, 15 no código | D3 | 1.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-52.4 | regra de papel repetida em dois serviços | D3 | 1.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-55.1 | três páginas sem `withAuth` | D3 | 1.00 | [OBS ✔] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-53.1 | escritas por `id` sem dono no `where` | D3 | 0.67 | [OBS ✔] [OBS] | tema F (não delegado) | 3 | aberto |
| AUT F-53.2 | repositório da DynamicTable sem dono em nenhuma consulta | D3 | 0.67 | [OBS ✔] [OBS] | tema F (não delegado); ⛔ | 3 | aberto |
| AUT F-51.3 | cinco handlers declaram `read` e gravam; a exceção só está em comentário | D3 | 1.00 | [OBS ✔] | tema F (não delegado) | 3 | aberto |
| AUT F-52.5 | predicado de leitura em 5 escritas e de gestão em 13 leituras | D3 | 1.00 | [OBS ✔] [OBS] | tema F (não delegado) | 3 | aberto |
| REG F-02.1 | valores gravados com parâmetro fora do alcance do job (Simples, retenções, IRRF de distribuição, JCP, NCM) não são recalculados nem avisados quando o parâmetro muda | D3 | 3.00 | [OBS ✔] [OBS] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-IMOBILIZADO F-225.1 | a linha de sistema do JCP no e-Lalur aceita alteração de valor, relação e conta pela API; as do Bloco F e o `PF`/`BC` não | D3 | 4.00 | [OBS ✔] [OBS] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-IMOBILIZADO F-219.1 | linha da Parte A, conta e movimento da Parte B são gravados em período com a Parte B fechada, sem aviso; o derivado do fechamento fica velho | D3 | 3.00 | [OBS ✔] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-FECHAMENTO F-301.1 | o encerramento do exercício não acompanha lançamentos posteriores; encerrar de novo devolve o antigo | D3 | 4.50 | [OBS ✔] [INF] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-FECHAMENTO F-310.2 | a ECF lê o razão vivo e não confere com a apuração confirmada | D3 | 4.50 | [OBS ✔] [OBS] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-FECHAMENTO F-315.1 | conta de receita sem regra de prefixo é encerrada, mas fica fora da DRE, do J150 e do LAIR | D3 | 4.50 | [OBS ✔] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-FECHAMENTO F-302.1 | estorno de encerramento aceito com data em outro exercício | D3 | 3.00 | [OBS ✔] [INF] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-FECHAMENTO F-303.1 | reabrir período ou mudar o razão não marca apuração nem arquivo já gerado | D3 | 3.00 | [OBS ✔] [OBS] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-CLASSIFICACAO F-417.1 | ajuste de papel, pendência aceita e upgrade do kit ativam versão nova do vínculo sem recarregar os mappers; a conta nova só vale depois de reinício ou da ativação de outra unidade | D3 | 4.50 | [OBS ✔] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-CLASSIFICACAO F-407.1 | cancelamento estorna o CMV no razão e não devolve ao estoque valorado | D4 | 4.50 | [OBS ✔] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
| REG-CLASSIFICACAO F-406.1 | guarda "Package Balance nunca caixa" sem efeito no intérprete; ajuste aceita conta de ativo | D3 | 3.00 | [OBS ✔] | tema G: fonte normativa, validador nomeado e cenário de referência externo | 3 | aberto |
