---
id: "D-2026-11-07-TM-PR7-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "TEAMMATES PR-7: lacunas L-PR7-1..4 da caixa única respondidas por questionário (registro sem despachante, LIMITE_ATINGIDO retoma, faxina do chat só sem expiresAt, vencida antes do scheduler = 409)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, AskUserQuestion sobre as lacunas do PR-7 · execução coberta pelo EXECUTA do nó TEAMMATES (dono, chat, 2026-11-06)"
atualizado: "2026-11-07"
---
# D-2026-11-07-TM-PR7-LACUNAS

**Estado:** `decided`. Nó: [[TEAMMATES]]. PR: TM PR-7 (caixa única de propostas, itens 31–33 do
`BE-INCR-TEAMMATES-brief.md`).

| Lacuna | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| L-PR7-1 | Item 32 despacha `SETTLEMENT_MATCH` (conciliação, PR-8) e `MCP_TOOL_CALL` (`McpClientService`, PR-10), que ainda não existem | "Registro, sem despachante (Recomendado)" | Registro de despachantes por `kind` no `ProposalInboxService`, só `TABLE_ROW` ligado. Kind sem despachante → 409 `KIND_SEM_DESPACHANTE`, a proposta fica `PENDING`. PR-8 e PR-10 registram os seus, com o teste do kind junto |
| L-PR7-2 | O que faz Confirmar numa `LIMITE_ATINGIDO` | "Retoma o teammate/thread (Recomendado)" | Confirmar volta o teammate (ou a thread) a `ACTIVE` e marca `EXECUTED`; se o limite ainda estiver estourado, pausa de novo no próximo turno. Implementado no PR-4, onde a pausa nasce; no PR-7 o kind fica sem despachante |
| L-PR7-3 | A faxina do chat (`deleteOldProposals(24)`) apagaria as propostas dos teammates (72 h) antes de vencerem | "Faxina só sem expiresAt (Recomendado)" | `deleteOldProposals` apaga só PENDING sem `expiresAt`; o fluxo do chat não muda. As dos teammates seguem PENDING → EXECUTED/REJECTED/EXPIRED. Confirmar uma do chat pela caixa marca `EXECUTED` em vez de apagar |
| L-PR7-4 | PENDING com `expiresAt` já passado, antes do scheduler, conta como vencida? | "Sim, 409 e marca EXPIRED (Recomendado)" | Confirmar/rejeitar confere `expiresAt < agora` na tx: grava `EXPIRED`, commita e responde 409 `PROPOSTA_EXPIRADA` |

**Registrada, sem pergunta (não bloqueia):** L-PR7-5 — o contrato `TABLE_ROW` (§2.2) aceita `action = DELETE`, mas
nenhuma origem gera proposta de exclusão e o chat também a recusa (`Unsupported proposal action`). O despachante do PR-7
repete essa recusa (400). Se um PR futuro gerar `DELETE`, o despachante ganha o caminho junto.

**Achado fora de escopo (para o dono):** o caminho antigo do chat (`ChatService` com `confirmedProposalId` →
`LuminarisAgentService.executeProposal`) executa qualquer proposta do dono pelo id, inclusive a de teammate, sem olhar
`status` nem `expiresAt`, e apaga a linha. Hoje só o FE do chat chama esse caminho com ids que ele mesmo recebeu; fechar
isso (recusar proposta com `teammateId`, ou mandar o chat pela caixa) muda o nó vizinho `chat` e fica para decisão.
