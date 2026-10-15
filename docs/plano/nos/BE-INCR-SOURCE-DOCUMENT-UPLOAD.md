---
id: "BE-INCR-SOURCE-DOCUMENT-UPLOAD"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Criar SourceDocument a partir de um arquivo (PDF do DAS e documento do histórico pré-adoção do Simples)"
estado: "planned"
estado_detalhe: "15/10: BRIEF escrito (12 itens, 1 PR — rota standalone POST /api/accounting/source-documents multipart; targetType SOURCE_DOCUMENT; sourceType em lista fechada; DAS passa a validar o sourceDocumentId e aceita anexar a DAS já registrado; documento exposto em dasOficial e na view do histórico); F-SD-1..11 RATIFICADOS 15/10 (todos na recomendação). Origem: lacuna do PR-B do FE-INCR-SIMPLES (D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS, PR #718). Sem executa"
depende_de: ["[[X14]]"]
autorizacao: "dono, chat, 2026-10-15, questionário: \"Autorizo só o BRIEF\" — só sessao-planejamento (BRIEF); sem código, sem executa · dono, chat, 2026-10-15: \"Ratifico F-SD-1..11 todos na recomendação do BRIEF. Só o BRIEF — sem executa.\""
ancora_sdd: "—"
atualizado: "2026-10-15"
prs: ["#721"]
---
# BE-INCR-SOURCE-DOCUMENT-UPLOAD — `SourceDocument` a partir de arquivo

**Estado:** `planned` — BRIEF escrito e forks F-SD-1..11 ratificados (15/10). Sem executa.  
**Autorização:** dono, chat, 2026-10-15 — "Autorizo só o BRIEF"; forks ratificados na recomendação. Sem `executa`.  
**Depende de:** [[X14]] ✅ (rotas do DAS e do histórico).  
**Desbloqueia:** a emenda do [[FE-INCR-SIMPLES]] (PDF do DAS no PR-B, documento do histórico no PR-C).

## Docs
- [`BE-INCR-SOURCE-DOCUMENT-UPLOAD-brief.md`](../../accounting/BE-INCR-SOURCE-DOCUMENT-UPLOAD-brief.md) — BRIEF (15/10), F-SD-1..11 ratificados
- `D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS` (no PR #718) — a lacuna que abriu esta frente
