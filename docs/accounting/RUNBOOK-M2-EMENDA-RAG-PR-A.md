# Emenda proposta ao RUNBOOK M2: saída do Qdrant e entrada do índice `sqlite-vec` (RAG-PR-A)

> **Texto preparado pelo agente, NÃO aplicado ao `RUNBOOK-M2-DEPLOY-SMOKE.md` e NÃO assinado.** É gate humano
> (BE-INCR-RAG-DOCUMENTOS item 12; `docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira: o agente prepara, o dono
> assina). Vale só depois que o dono aprovar o texto e mandar aplicar ao runbook.
>
> **Origem:**
> - BRIEF `docs/accounting/BE-INCR-RAG-DOCUMENTOS-brief.md` itens 1, 4 e 12, mais a §4 ("Runbook M2").
> - Decisão do dono (chat, 2026-11-06): *"vec0 em arquivo próprio"*, com o segundo arquivo no backup e no volume.

## O que muda no artefato de implantação (já no código do RAG-PR-A)

- **Serviço `qdrant`:** sai do `docker-compose.yml`, junto com o volume `qdrant_data`, o `depends_on` e as
  variáveis `QDRANT_URL`/`QDRANT_API_KEY`.
- **Arquivo de vetores:** passa a ser um **segundo arquivo SQLite**, `VECTOR_DB_PATH: /data/vectors.db`. Fica no
  mesmo volume `sqlite_data` do `dev.db`. O Prisma nunca abre esse arquivo.
- **Abertura no boot:** o server abre o arquivo e cria a tabela virtual `chunk_vec`, de forma idempotente. Se a
  extensão não carregar, **o boot cai** com `VEC_EXTENSAO_NAO_CARREGADA`.
- **Migração dos vetores:** os trechos já existentes não têm vetor local. Depois do 1º deploy, roda-se
  `npm run rag:reindex`. Ele refaz o embedding com a `OPENAI_API_KEY` da instância, e por isso gera custo.

## Edições propostas ao `RUNBOOK-M2-DEPLOY-SMOKE.md`

**E1 — Inventário (seção "Inventário do repo para o alvo").** Trocar o trecho do `qdrant` por:

> `docker-compose.yml` orquestra 2 serviços (`server`, `frontend`). O índice de vetores do RAG é o arquivo
> `/data/vectors.db` (sqlite-vec 0.1.9 via better-sqlite3 12.11.1), no volume `sqlite_data`, ao lado do `dev.db`.

**E2 — Pré-condições.** Acrescentar depois do item de backup:

> - O backup do banco **inclui o arquivo de vetores**: `dev.db` e `vectors.db`, do mesmo instante, com o server
>   parado. O `deploy:migrate` só copia o `dev.db`. O `vectors.db` sai num passo próprio (passo V1 abaixo).
>   Restaurar só um dos dois deixa vetor sem trecho (o `VecOrphanSweepScheduler` limpa em até 24 h) ou trecho
>   sem vetor (o `npm run rag:reindex` refaz).

**E3 — Passo novo V0 (antes do passo 1): a extensão carrega dentro da imagem.**

```
V0. Na imagem do server já construída para o alvo, rodar:
    docker compose run --rm server node -e "const D=require('better-sqlite3');const v=require('sqlite-vec');const d=new D(':memory:');v.load(d);console.log(d.prepare('select vec_version() v').get().v)"
    Resultado esperado: imprime v0.1.9 e sai com 0.
    Qualquer erro de carga → parar: desfecho BLOQUEADO (pré-condição V0). O boot do server cairia com
    VEC_EXTENSAO_NAO_CARREGADA.
    EVIDÊNCIA: [saída completa do comando]
```

> **Risco medido, mas não resolvido.** O `server/Dockerfile` usa `node:22-alpine` (musl). O binário
> `sqlite-vec-linux-x64@0.1.9` (`vec0.so`) é ligado contra a glibc. Os símbolos que ele traz são `libc.so.6`,
> `GLIBC_2.2.5`, `GLIBC_2.3.4`, `GLIBC_2.4`, `GLIBC_2.7` e `GLIBC_2.14`, conforme a varredura do `.so` feita pelo
> agente em 2026-11-06. É **provável** (inferido, não executado) que o V0 falhe no Alpine. Há duas saídas, e
> nenhuma foi aplicada: trocar a base para `node:22-slim` (glibc) ou compilar o `vec0` para musl. A escolha é do
> dono.

**E4 — Passo novo V1 (junto do passo 3, com o server parado): backup do arquivo de vetores.**

```
V1. Com o server parado, ANTES do deploy:migrate:
    sqlite3 /data/vectors.db "PRAGMA wal_checkpoint(TRUNCATE);" && cp /data/vectors.db <dir de backup>/vectors-<data>.db
    (se o arquivo ainda não existe — 1º deploy pós-Qdrant —, anotar "não existe" e seguir)
    Resultado esperado: checkpoint sem erro; cópia com o mesmo tamanho do original.
    EVIDÊNCIA: [saída dos dois comandos + ls -l do original e da cópia]
```

**E5 — Passo novo V2 (depois do passo 5, server no ar): reindexação e conferência.**

```
V2. cd server && npm run rag:reindex
    Resultado esperado: "rag:reindex — N trecho(s) reindexado(s) em U usuário(s)." e exit 0.
    Depois, uma busca de documento pela tela de chat (modo RAG) devolve trecho do documento escolhido.
    EVIDÊNCIA: [saída do comando + screenshot da resposta com a fonte]
```

**E6 — Pendências do bloco R, P1.** O diff proposto para o Redis ainda mostra `depends_on: - qdrant`. Esse bloco
não existe mais. No diff, o `depends_on` passa a ter só `- redis`.

## Fecha

- O item aberto do `ADR-M2-deploy-topology.md`, "se o Qdrant vira serviço gerenciado": sem Qdrant, a pergunta não
  existe mais. A nota de fechamento está no próprio ADR, no RAG-PR-A.

## Registro

- Texto preparado por: agente claude-opus-5-5 (sessão de feature RAG-PR-A, 2026-11-06), sem execução no host.
- Aprovação do texto e aplicação ao runbook: ____________ (dono)
- Assinatura do executor (na execução do M2): ____________
