# RUNBOOK: M2 — 1º deploy real + Chromium smoke-launch-gate

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> **Atualizado 2026-08-22** — o dono ratificou a topologia de deploy via `AskUserQuestion`
> (`docs/adr/ADR-M2-deploy-topology.md`, Status: Accepted). A pré-condição de alvo abaixo deixou de
> ser "decisão inexistente"; falta só o provisionamento concreto — ver o item atualizado.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17) + fila §5.1 Bloco A item 5 +
`ADR-M2-deploy-topology.md` (topologia ratificada 2026-08-22).
Pré-condições (verificar antes de começar):
- **Alvo de deploy: CLASSE decidida, host concreto ainda por PROVISIONAR.** `ADR-M2-deploy-topology.md`
  ratificou: VPS própria (com encaixe CLEAN para PaaS), uma instância por cliente (um SQLite + uma env
  por cliente), WAL + `busy_timeout` aplicados pela aplicação (`server/src/lib/prisma.ts:23-24`) —
  qualquer host escolhido precisa oferecer disco LOCAL real (sem NFS/EFS/objeto-storage, ver ADR §4.b).
  **Falta:** qual VPS/provedor concreto (item explicitamente ABERTO no ADR) — isso continua decisão do
  dono, não do agente.
- Backup do banco de produção-alvo feito ANTES de qualquer migração. **O backup É o rollback** —
  ver o bloco A5 abaixo antes de rodar qualquer migração no alvo.
- Branch a implantar integrada e CI verde (registrar o commit).
- Chromium/dependências do puppeteer presentes no host (é o que este gate prova).
- **O artefato de implantação NÃO sobe o schema** — ver A5 abaixo. **Quem roda `prisma migrate
  deploy` tem resposta:** `ADR-M2-deploy-topology.md` §2 decisão 4 — etapa SEPARADA do pipeline de
  deploy (job próprio, antes do swap de container), nunca passo manual e nunca entrypoint que migra
  no boot. **Atualizado 2026-08-30 (Wave 1, item B-3):** o job existe — `npm run deploy:migrate`
  (`server/package.json` → `scripts/migrate-deploy.mjs`; backup com `wal_checkpoint(TRUNCATE)` →
  `prisma migrate deploy` → `integrity_check`/`foreign_key_check`/contagem de linha pós-migração →
  exit code, com `--self-check` cobrindo caminho feliz e falha forjada sem tocar banco do projeto).
  Falta só o pipeline de CI/CD concreto que o dispare no host provisionado (ADR §7 item 1, aberto).

### A5 — o que a auditoria de 2026-08-15 mediu sobre voltar atrás (triagem ratificada 2026-08-20)

Três fatos verificados em `main` `3a761812`. Não são recomendação de alvo; são o que o executor
precisa saber **antes** de aplicar a primeira migração num banco que importa:

1. **Não existe migração `down`.** `find server/prisma/migrations -iname "*down*"` = **0**. Voltar de
   uma migração aplicada é restaurar o arquivo do banco — por isso o backup acima é pré-condição
   dura, não higiene.
2. **9 das 30 migrações fazem rebuild destrutivo de tabela** (padrão do SQLite: cria nova, copia,
   dropa a velha) — re-medido em 2026-08-22 (pós PR #211): `ls -d prisma/migrations/*/ | wc -l` = **30**
   e `grep -rl "DROP TABLE" prisma/migrations` = 9. **Correção da medição de 2026-08-20:** à época
   eram 29 e a última da fila era destrutiva; o merge do P1 acrescentou
   `20260821090000_accounting_binding` (nº 30/30), que é **aditiva pura** (1 `CREATE TABLE` + 2
   `CREATE INDEX`, sem `DROP TABLE` nem `RAISE`). Logo a destrutiva com guard passou a ser a
   **penúltima** (`20260814120000_counterparty_notnull`, nº 29/30) — ela **documenta no próprio SQL** que
   o `RAISE(ABORT)` do guard **não reverte a migração** — pós-abort o backfill segue commitado
   (classe já registrada: `migracao-sqlite-nao-e-transacional`).
3. **Nenhum artefato executável roda `prisma migrate deploy`**: `grep "migrate deploy"` no repo =
   0 hits fora de prosa de closeout; `docker-compose.yml` não tem `command`/`entrypoint`, o volume
   `sqlite_data` nasce vazio e `server/Dockerfile` faz `COPY dist ./dist` com `dist/` no gitignore.
   Consequência prática: **subir o compose no alvo dá um container sem schema** — a migração é passo
   manual do executor até que alguém decida o contrário (decisão do dono, não do agente).
   **Atualizado 2026-08-30:** o job existe agora (`npm run deploy:migrate` — ver pré-condição acima);
   o resto do parágrafo continua verdadeiro — o compose segue sem `command`/`entrypoint` por desenho
   (decisão 4 do ADR), o volume nasce vazio, e o executor precisa rodar `deploy:migrate` por fora
   antes do swap de container. A citação a `COPY dist ./dist` está OBSOLETA desde `f869294e`
   (`server/Dockerfile` virou multi-stage) — ver `ADR-M2-deploy-topology.md` §4.b para a correção
   completa; não repetida aqui em detalhe para não duplicar a fonte.

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
