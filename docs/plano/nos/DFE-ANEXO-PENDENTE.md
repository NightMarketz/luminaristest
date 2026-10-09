---
id: "DFE-ANEXO-PENDENTE"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Anexo e proveniência da NFS-e autorizada não se perdem se falharem depois da autorização (BE-INCR-DFE-ANEXO-PENDENTE)"
estado: "ready"
estado_detalhe: "28/09: BRIEF escrito (#425); F-PA-1..8 ratificados por questionário (F-PA-5 c, F-PA-7 b e F-PA-8 b contra a recomendação). Sem 'executa'. Nó aberto em 09/10 depois do cruzamento BRIEF × git log: nenhum commit de implementação"
depende_de: ["[[X10b]]"]
autorizacao: "dono, chat, 2026-09-28: \"BRIEF da pendência de anexo\" (só o BRIEF); dono, chat, 2026-10-09: \"sim, abre os nós\" (só a nota do nó); dono, chat, 2026-10-09: \"Já não consegue automatizar? ja que tudo esta planejado\" (execução do nó, sem merge)"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: [425]
---
# DFE-ANEXO-PENDENTE — pendência de anexo da NFS-e autorizada

**Estado:** `ready` — BRIEF com forks ratificados. Código só depois de um `executa` do dono.

## Escopo

- Resíduo [ABERTO] do GAP-MAP deixado pelo #420: depois da tx de autorização, uma falha no anexo ou na proveniência
  deixa o documento AUTHORIZED sem `xmlAttachmentId`/`sourceDocumentId`. No retorno manual o XML se perde.
- Pendência com os bytes gravada **na mesma tx da autorização**, drenada por uma varredura idempotente no scheduler
  que já existe, com registro de progresso por passo (o `upload` não é idempotente, F-PA-3).

## Docs

- [`docs/accounting/BE-INCR-DFE-ANEXO-PENDENTE-brief.md`](../../accounting/BE-INCR-DFE-ANEXO-PENDENTE-brief.md) — BRIEF + forks F-PA-1..8
