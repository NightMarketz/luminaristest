---
id: "D-2026-11-06-PARADOS-NO-DONO"
tipo: "decisao"
dominio: "plataforma"
titulo: "Parados no dono (06/11): FIX-AUTH #10/#11/#20, Kanban passo 9, quem roda o W3, roteiro do PACOTE-VALIDADE; W3, GOV-CONTADOR e BUILDER-VERTICAIS sem pergunta"
estado: "decided"
autorizacao: "dono, chat, 2026-11-06, questionário: #10 \"Allowlist (Recomendado)\"; #11 \"Arquivo vai na purga (Recomendado)\"; #20 \"Preencher do banco\"; Kanban \"Corrigir e agente roda (Recomendado)\"; W3 \"Agente roda (Recomendado)\"; PV-A \"Ajustar o roteiro (Recomendado)\""
atualizado: "2026-11-06"
---
# D-2026-11-06-PARADOS-NO-DONO

**Estado:** `decided`. Em 06/11 o dono pediu para separar os nós destravados em três sessões. Esta nota é a da sessão
"parados no dono". Cada nó foi conferido na sua nota, em `decisoes/` e no runbook antes de virar pergunta. Três nós
não tinham pergunta, porque a nota estava velha.

## 1. Sem pergunta: a nota do nó estava velha

| Nó | O que a nota dizia | O que vale (verificado) |
|---|---|---|
| [[W3]] | F-W3-C1..C3 pendentes | Ratificados em 21/10, todos (a): [[D-2026-10-21-CHAT-C-FORKS]] (l. 22–24); listados em [[D-2026-11-02-DELEGACAO-DONO]] §"Já ratificados". O BRIEF WIZARD-W3-CONFIRMACAO-RESUMO segue sem `executa` |
| [[GOV-CONTADOR]] | falta o sign-off do H2 passo 23 + emenda do 22 j | `RUNBOOK-H2-BROWSER-SIGNOFF.md`: passo 23 **PASSOU** (l. 2461–2469, execução C7 de 03/11, AI tester sob [[D-2026-11-02-DELEGACAO-DONO]] §6); passo 22 **PASSOU** em 04/11 (l. 2170–2182). O 22 j "não se aplica" (sem contador ACTIVE na unidade, l. 2051) e o caso dele fica coberto pelo 23 a). Falta só o BRIEF BE-INCR-CRC-CFC-VALIDACAO, depois do [[M2]] (F-V1 c) |
| [[BUILDER-VERTICAIS]] | F-BV-1..7 pendentes | Ratificados em 21/10, todos (a): [[D-2026-10-21-CHAT-C-FORKS]] (l. 51–57). O F-BV-2 foi recortado em 31/10 ([[D-2026-10-31-MODULOS-BASE-SUBMODULOS]]). Não há fork pendente. O BRIEF BE-INCR-MODULOS-BASE-SUBMODULOS espera `executa` |

## 2. FIX-AUTH-CONTA ([[FIX-AUTH-CONTA]], §3.4 do ACHADOS-2026-10-19)

- **#10, cobertura da purga: allowlist** (na recomendação). Hoje `jobs/PurgeDeletedRecords.ts:33-42` apaga só
  `DynamicTableData` e `InterviewSession`. Cada model com `deletedAt` ganha uma classe: **operacional**, purgado em 90
  dias, ou **contábil/fiscal**, que a purga nunca apaga. A guarda vai até a prescrição (CTN art. 195 parágrafo único;
  Lei 8.981/1995 art. 45 III, já citados em [[D-2026-11-02-DELEGACAO-DONO]] §9). Um teste reprova model com `deletedAt`
  que não tenha classe.
- **#11, arquivo do anexo: vai na purga** (na recomendação). `DELETE /crm/attachments/:id` só marca `deletedAt`. O
  arquivo continua em disco, e a purga do #10 apaga linha e arquivo juntos depois de 90 dias. Restaurar volta a
  funcionar.
- **#20, `createdAt`/`updatedAt` no `UserContext`: preencher do banco** (**contra a recomendação**, que era remover os
  campos). O middleware passa a injetar as datas reais do `User`. Hoje `lib/authUtils.ts:18-19,30-31` cai em
  `new Date()` porque `middleware/auth.ts:21-22` só remove esses headers e nunca os preenche. Custo aceito: uma leitura do
  usuário por request, ou reaproveitar a leitura que o middleware já faz, se ela existir (a sessão de correção confere).
  O grep de 06/11 não achou quem leia esses campos (inferido).
- **Código:** o pedido de 21/10 já cobre a instrumentação e a correção do §3.4 ("instrumentar e corrigir… lotes de até 8
  itens por PR, sem merge"). Faltava esta decisão, e agora ela existe. Fica para a sessão de instrumentação → correção.
  Não é feito aqui.

## 3. FE-INCR-KANBAN-REORDER ([[FE-INCR-KANBAN-REORDER]])

- **"Alinhar tela × rebalanceio parcial" já está fechado.** A Emenda 1 (refetch no `online`) foi para `main` no #931, e o
  passo 4 (o aceite dela) conferiu na rodada de 27/10. Nada novo a decidir.
- **Passo 9, texto fixo em PT: corrigir, e o agente roda** (na recomendação). Em 06/11 o texto "Adicione uma descrição
  mais detalhada..." ainda está em `KanbanCardDetailModal.tsx:225` e `:251`. A sessão de instrumentação → correção leva
  esse texto para o i18n (pt/en). Depois o agente roda os passos **6b, 9 e 10** do `docs/runbooks/RUNBOOK-KANBAN-REORDER.md`
  em build de produção, na persona revisor, pela exceção de 25/10 (`RUNBOOK-FORMAT.md` §Fronteira: conferência na tela
  do próprio app). Este questionário é o comando do dono para esse runbook. Sem merge sem OK.

## 4. W3: quem roda o RUNBOOK-W3-ESCOLHA-CRIACAO

- **O agente roda** (na recomendação), pela mesma exceção de 25/10: é conferência na tela do próprio app, fora de
  H1/H2/M2/X1/X2. O agente assina como agente, na persona revisor, e nunca com nome de pessoa. Este questionário é o
  comando do dono para esse runbook. O runbook chama a OpenAI de verdade, e o custo foi aceito.
- Preflight de 06/11 (grau verificado, por leitura):
  - #455 e #477 estão em `origin/main` (`b580f425d`);
  - `choicePrompt` aparece em `interviewController.ts` e `InterviewService.ts`;
  - `server/.env` tem `OPENAI_API_KEY` não vazia;
  - `server/prisma/prisma/dev.db` tem 8 `accounting_bindings` Active e 4 de 11 usuários sem `dynamic_tables` (o P5 pede 2).
  - P3 e P4 (servidor e build de produção no ar) se medem na hora da execução.

## 5. PACOTE-VALIDADE: roteiro do H2-PACOTE-VALIDADE

- **PV-A e PV-B: ajustar o roteiro** (na recomendação). A emenda de 06/11 entrou no `RUNBOOK-H2-PACOTE-VALIDADE.md`, nos
  passos 7 e 9. A venda sem aceite passa a ser criada por API. O "vencido em …" se mede na janela do job de 5 min. Saldo
  que o job já zerou e que sumiu do select é desenho, não FALHOU. Não há código.
- **O que falta é do dono:** a P7 e o fim do passo 6, que são imprimir o comprovante e colher a assinatura do cliente no
  papel (F-FE-PV-3 b). A execução de 04/11 fechou BLOQUEADO só por isso. O deploy depende ainda do [[M2]] e do [[I4]].
