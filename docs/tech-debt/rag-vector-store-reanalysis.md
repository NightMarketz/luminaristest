# Dívida: RAG sem uso real + Qdrant como serviço avulso — re-analisar antes de qualquer investimento em IA

> Registrado em 2026-09-14 por ordem do dono ("por hora apenas documente"). **Não é autorização de
> implementar** — é o ponto de re-análise que qualquer item de IA/RAG do roadmap (A7 "IA/analytics",
> Fase P4) tem que cruzar antes de entrar na fila. Sem ADR + sinal humano, nada aqui vira código.

## O que foi medido (2026-09-14, `main` `c96e2227`)

| Fato | Evidência | Grau |
|---|---|---|
| Qdrant é um serviço à parte que o app não exige para subir, mas reporta em `/health` | `server/src/app.ts:68-89` — ping em `QDRANT_URL/healthz`, `503 degraded` quando cai; boot segue (`server.ts` só aborta por binding) | verificado |
| No ambiente do dono ele está caído — `/health` vive `degraded` | log de boot dos ensaios P0/B-4 de 14/09: `Falha ao verificar ou criar a coleção no Qdrant … fetch failed`; `/health` `{"database":"ok","qdrant":"error"}` | verificado |
| O RAG **nunca foi exercitado com dado real** | `dev.db` real (`server/prisma/prisma/dev.db`, 42 migrações): tabela `documents` **não existe** → zero documento, zero chunk, zero busca | verificado |
| Superfície que o app usa do Qdrant é pequena | uma coleção `documents`; `IVectorRepository` com 6 métodos — upsert de chunks, busca por similaridade filtrada por `userId` (+ `documentIds`), get/delete por documento, delete por usuário (LGPD art. 18 VI) | verificado (`server/src/features/documents/repositories/IVectorRepository.ts`) |
| Embedding = `text-embedding-3-small` (1536 dims ≈ 6 KB/chunk) | `server/src/lib/vector/embedding.ts:55` | verificado |
| Blast radius de trocar o backend | 13 arquivos no server (`grep -li qdrant`), zero no frontend — a interface isola | verificado |

## As duas perguntas que a re-análise tem que responder, nesta ordem

1. **Que uso real o RAG tem no produto?** Hoje é chat sobre documentos enviados (modo RAG do agente,
   `ChatService`) sem nenhum documento real. A tese do produto (memória `luminaris-product-thesis`) é ERP
   setorial gerado por onboarding — o RAG só ganha valor se servir a algo dessa tese (ex.: manuais do
   SPED/NF-e/NFS-e já baixados em `docs/accounting/` como corpus do agente contábil; documentos fiscais do
   tenant; base de conhecimento por vertical). **Sem um uso nomeado, não se troca backend — remove-se.**
2. **Só depois: qual backend.** Análise já feita em sessão (14/09), a ser confirmada no ADR:
   - **Preferido:** vetores no próprio SQLite — `DocumentChunk` Prisma com `embedding Bytes` + cosseno
     em TS sobre as linhas filtradas por tenant. Mesma interface, zero dependência nova, remove serviço,
     env (`QDRANT_URL/API_KEY`), initializer e um container do deploy (ADR-M2). Teto declarado: ~20–50k
     chunks por tenant.
   - **Se bater o teto:** `sqlite-vec` sobre a mesma tabela — exige driver que carregue extensão
     (`better-sqlite3` + adapter Prisma preview) — troca de implementação, não de arquitetura.
   - **pgvector: não** enquanto valer a decisão de ficar no SQLite (`stay-on-sqlite-no-postgres`).
     Manter pgvector **e** sqlite-vec = duas implementações para um Postgres que nenhum ambiente roda.
   - Qdrant/Chroma/Weaviate/Milvus = mesmo custo operacional com outra logo; LanceDB é o meio-termo
     embarcado se o teto preocupar.

## Gatilho para reabrir

Qualquer um destes: (a) item de IA/RAG entrando na fila; (b) primeiro tenant real com documento a
indexar; (c) decisão de topologia de deploy (ADR-M2) precisando fechar a lista de containers. Ao
reabrir: ADR curto (fronteira Prisma first-class — `module-boundary-selector`) → `sessao-planejamento`.

Vieses do registro: a recomendação "para dentro" nasce de quem acabou de medir o custo operacional
(serviço caído); o custo de *qualidade* de busca do brute-force vs. índice não foi medido com dado real —
porque não há dado real.
