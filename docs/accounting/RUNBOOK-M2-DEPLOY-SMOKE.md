# RUNBOOK: M2 — 1º deploy real + Chromium smoke-launch-gate

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> Este é o único item do Bloco A que depende de uma DECISÃO ainda não tomada (alvo de deploy).
> Sem alvo decidido, o desfecho honesto é BLOQUEADO — e o Bloco A não fecha sem ele.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17) + fila §5.1 Bloco A item 5.
Pré-condições (verificar antes de começar):
- **Alvo de deploy decidido e provisionado** (host, forma de processo, onde vive o SQLite com
  WAL + busy_timeout — decisão do dono; hoje inexistente).
- Backup do banco de produção-alvo feito ANTES de qualquer migração.
- Branch a implantar integrada e CI verde (registrar o commit).
- Chromium/dependências do puppeteer presentes no host (é o que este gate prova).

## Inventário do repo para o alvo (levantado 2026-08-19)

Fatos observados no worktree — não é recomendação de alvo (decisão do dono):

- **`my-app/Dockerfile:1-30`** — multi-stage `node:20-alpine`; builder roda `npm run build`
  (o `NEXT_PUBLIC_API_BASE_URL` é `ARG`+`ENV` no builder porque `next.config.js:23` inlina
  `NEXT_PUBLIC_*` em tempo de BUILD, não runtime — comentário em `docker-compose.yml:11-17`
  documenta esse ponto); runner expõe `3000`, `CMD npm start`.
- **`server/Dockerfile:1-15`** — single-stage `node:20-alpine`; `npm ci --only=production`,
  `npx prisma generate`, e **`COPY dist ./dist`** — ou seja, o `dist/` já vem pronto de fora
  (build TypeScript acontece FORA da imagem, ao contrário do frontend); expõe `3001`,
  `CMD node dist/server.js`.
- **`docker-compose.yml`** (raiz) — orquestra 3 serviços: `server` (build de `./server`,
  porta 3001, `DATABASE_URL: file:/data/dev.db` sobre `volumes: sqlite_data:/data` — volume
  nomeado persistente, acomoda o arquivo SQLite conforme a restrição do projeto), `frontend`
  (build de `./my-app`, porta 3000, `NEXT_PUBLIC_API_BASE_URL` passado como build-arg),
  `qdrant` (imagem `qdrant/qdrant:latest`, exige `QDRANT_API_KEY` via `:?` — recusa subir sem
  a chave, portas 6333/6334 publicadas). WAL/`busy_timeout` são aplicados pela aplicação em
  runtime (`server/src/lib/prisma.ts:23-24`: `PRAGMA journal_mode = WAL` +
  `PRAGMA busy_timeout = 5000`), não pelo compose — qualquer alvo escolhido precisa manter o
  arquivo `dev.db` num filesystem com lock POSIX/Windows normal (sem NFS/objeto-storage).
- **Scripts de processo:** `server/package.json` — `build: npx prisma generate && tsc`,
  `start: node dist/server.js`, `smoke:migration: node ../scripts/smoke-migration-gate.mjs`,
  `logs:errors: node ./scripts/read-error-log.mjs`. Sem Procfile, sem `ecosystem.config`
  (pm2) e sem unit `.service` no repo — nenhum supervisor de processo declarado além do que
  o Dockerfile/compose cobre.
- **`scripts/smoke-migration-gate.mjs:1-37`** (cabeçalho) — roda LOCAL contra CÓPIA do
  `dev.db` real (`--db`, default `server/prisma/prisma/dev.db`), aplica `prisma migrate
  deploy` na cópia e prova 8 invariantes (S1–S8: hash do original intocado, migração limpa,
  `integrity_check`, `foreign_key_check`, nenhuma tabela perde linha, colunas antigas
  sobrevivem byte-a-byte, nenhum índice nomeado some, partida dobrada Σdébito=Σcrédito) mais
  2 avisos não-bloqueantes (W1 mudança de ação de FK, W2 gate vazio quando as tabelas
  contábeis têm 0 linhas). Declara o próprio limite: prova BANCO, não serviço — não substitui
  o browser sign-off.

## Passos

1. Rodar o smoke-migration-gate contra CÓPIA do banco do ambiente-alvo:
   `cd server && npm run smoke:migration`.
   Resultado esperado: PASS; atenção ao pass vacuoso — tabelas vazias passam por vacuidade
   (registrado no precedente INCR-COUNTERPARTY-NOTNULL: semear antes se necessário).
   EVIDÊNCIA: [saída completa do comando]

2. Deploy do server e do front no alvo; subir os processos.
   Resultado esperado: processos de pé, `/api` respondendo autenticado.
   EVIDÊNCIA: [comandos usados + resposta de um endpoint autenticado]

3. Smoke-launch do Chromium no host: gerar um recibo PDF no ambiente implantado (caminho
   puppeteer real).
   Resultado esperado: PDF gerado sem erro de launch.
   EVIDÊNCIA: [o PDF ou o log do launch]

4. `cd server && npm run logs:errors` após alguns minutos de uso real.
   Resultado esperado: sem erro novo.
   EVIDÊNCIA: [saída do comando]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 5 do master map + data]
- Assinatura do executor: ____________
