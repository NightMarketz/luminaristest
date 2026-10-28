---
id: "D-2026-10-28-FLUXO-AUTONOMO"
tipo: "decisao"
dominio: "processo"
titulo: "Fluxo autônomo: 'executa' por BRIEF inteiro, merge por classe de risco (verde automático, vermelho em lote do dono), revisor-independente só no vermelho e uma sessão maestro diária"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28: \"Grande parte das minhas tarefas … eu só tenho selecionado o que é recomendado e pedido para continuar … para que as tarefas … fossem de fato concluídas comitadas e mergeadas sem a minha supervisão tão direta.\" Respostas por AskUserQuestion no mesmo turno"
atualizado: "2026-10-28"
---
# D-2026-10-28-FLUXO-AUTONOMO

**Estado:** `decided`.

**Por quê:** o dono passava o dia escolhendo a opção recomendada e escrevendo "continua". Cada PR tinha três toques
humanos: o `executa` do PR (ORCH-006), o OK de merge por número (CLAUDE.md §Merge) e o clique no cartão da sessão
filha. Nenhum desses toques mudava o resultado quando a resposta era a recomendada.

## Respostas (AskUserQuestion, a recomendada era a 1ª opção)

| # | Pergunta | Resposta literal | Regra que passa a valer |
|---|---|---|---|
| 1 | Que autorização permanente o dono dá? | "Por BRIEF inteiro (Recomendado)" | Um `executa` na nota do nó cobre **todos os PRs do BRIEF** (PR-0..PR-n), desde que o BRIEF esteja ratificado e não tenha fork pendente. Fork novo no meio da execução para o nó: vira pergunta (AskUserQuestion com contexto) e cédula, e o resto da fila segue. Nó sem BRIEF continua precisando de autorização para a sessão de planejamento |
| 2 | Como o merge funciona? | "Auto por classe de risco (Recomendado)" | `node scripts/classe-risco.mjs pr <n>` classifica. **Verde**: a maestro mergeia sozinha (squash) quando todos os checks passaram, não há conflito e o PR não é draft. **Vermelho** (contábil/fiscal, prisma, auth, legalParameters, `.claude/**`, CLAUDE.md, `.github/**`, cédula, gate, ADR, trilho, dependência major, draft, título "não mergear"): entra no **lote diário** do dono, que aprova por número |
| 3 | Quem confere além do CI? | "Revisor só na classe vermelha (Recomendado)" | Exceção à regra ⛔ do CLAUDE.md: o agente `revisor-independente` (já versionado, F-1) roda **só em PR vermelho**, em worktree isolado, antes de o PR entrar no lote. Verde fica com CI + `tsc` + `check:arch`. Não é bancada, rodada nem gate novo: é um passo do lote |
| 4 | Quem toca a fila? | "Sessão maestro sua (Recomendado)" | O dono abre um chat por dia e cola `.claude/prompts/maestro.md`. Por ser chat do dono, a maestro abre as sessões filhas direto (sem cartão). Ela lê o `_INDEX`, calcula as ondas (`paralelo.mjs`), acompanha o CI, mergeia o verde e fecha o dia com um resumo que lista só o que espera o dono |

## O que **não** muda

- Gate humano e dado externo (H1, H2, M2, X1, X2, PVA, XML de NF-e, contador, deploy): desfecho e assinatura seguem do dono.
- Fork de produto, de lei ou de arquitetura: pergunta ao dono, nunca auto-ratificado.
- A maestro não mergeia vermelho, não muda a lista `VERMELHO` do `classe-risco.mjs` (só o dono, por cédula) e não faz deploy.
- Revisor-independente com veredito FALHOU: o PR não entra no lote como "pronto"; entra com o achado.
