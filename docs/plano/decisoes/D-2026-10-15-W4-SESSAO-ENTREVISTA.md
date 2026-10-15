---
id: "D-2026-10-15-W4-SESSAO-ENTREVISTA"
tipo: "decisao"
dominio: "plataforma"
titulo: "W4: planejar autorizado; F-W4-1 (a) tabela Prisma, F-W4-2 (b) 404 estruturado + front, F-W4-3 (a) TTL 24 h deslizante"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15: \"Autorizo planejar o BRIEF do W4 — sessao-planejamento, sem código, sem 'executa'\" + questionário (AskUserQuestion) do mesmo dia"
atualizado: "2026-10-15"
---
# D-2026-10-15-W4-SESSAO-ENTREVISTA — sessão da entrevista persistida

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-15. Abre o [[W4]] **só para planejar** (BRIEF + nota + fold). Código exige "executa".
**BRIEF:** [`BE-INCR-INTERVIEW-SESSION-brief.md`](../../accounting/BE-INCR-INTERVIEW-SESSION-brief.md).

## Decisões (questionário com contexto, 2026-10-15)

| # | Fork | Decisão | Resposta |
|---|---|---|---|
| 1 | F-W4-1 · armazenamento | **(a) tabela Prisma** `InterviewSession` no SQLite atual; sem Redis | *"Tabela Prisma (Recommended)"* |
| 2 | F-W4-2 · sessão perdida/expirada/alheia | **(b) 404 `{code:'INTERVIEW_SESSION_NOT_FOUND'}`** (mesma resposta para sessão de outro usuário) + `useAiInterview` volta à escolha criar × customizar do mesmo preset. A pergunta trouxe a correção: o "front já trata 404" do plano de 07/09 era sobre a rota `CustomizeFields` (W6), não sobre o `ChatInterview` | *"404 estruturado + front (Recommended)"* |
| 3 | F-W4-3 · TTL | **(a) 24 h deslizante** (cada turno renova) | *"24h deslizante (Recommended)"* |

Pendentes no BRIEF (D2, internos, não perguntados): F-W4-4 (turnos concorrentes) e F-W4-5 (janela de expurgo).
