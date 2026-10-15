---
id: "BE-INCR-SIMPLES-GET-ENTRADAS"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Simples: GET do histórico pré-adoção e da segregação manual por competência"
estado: "done"
estado_detalhe: "15/10 (executa): itens 1–7 implementados em 1 PR — GET /historico/:competencia e GET /segregacao/:competencia (404 sem registro, F-GE-1); item 4 vácuo (os dois modelos não têm deletedAt); item 5: +2 operações e 0 paths (287 → 287, medido com docs:generate; a guarda de path-count não muda); item 7: nenhum DTO novo, snapshot de shape inalterado. Merge só com OK do dono · 12/10: BRIEF escrito (7 itens, 1 PR); F-GE-1 (404 sem registro) RATIFICADO 12/10. Pré-requisito do PR-C do FE-INCR-SIMPLES (P4-3 b). Sem executa"
depende_de: ["[[X14]]"]
autorizacao: "dono, chat, 2026-10-12, questionário: \"(a) Um GET por competência (Recomendado)\" + \"Só os BRIEFs (Recomendado)\" — só o BRIEF (sessao-planejamento); sem código, sem executa · dono, chat, 2026-10-12, questionário: forks ratificados na recomendação — sem executa · **EXECUTA** (dono, chat, 2026-10-15): \"identifique o proximo brief aberto e livre pra implementar e faz\" — este nó foi o identificado (1º destravado com BRIEF pronto, forks ratificados e sem sessão nem branch); sem merge"
ancora_sdd: "—"
atualizado: "2026-10-15"
prs: ["#697"]
---
# BE-INCR-SIMPLES-GET-ENTRADAS — leitura do histórico e da segregação

**Estado:** `done` — 15/10 (executa): itens 1–7 implementados em 1 PR — GET /historico/:competencia e GET /segregacao/:competencia (404 sem registro, F-GE-1); item 4 vácuo (os dois modelos não têm deletedAt); item 5: +2 operações e 0 paths (287 → 287, medido com docs:generate; a guarda de path-count não muda); item 7: nenhum DTO novo, snapshot de shape inalterado. Merge só com OK do dono · 12/10: BRIEF escrito (7 itens, 1 PR); F-GE-1 (404 sem registro) RATIFICADO 12/10. Pré-requisito do PR-C do FE-INCR-SIMPLES (P4-3 b). Sem executa  
**Desbloqueia:** PR-C do [[FE-INCR-SIMPLES]].

## Docs
- [`BE-INCR-SIMPLES-GET-ENTRADAS-brief.md`](../../accounting/BE-INCR-SIMPLES-GET-ENTRADAS-brief.md)
