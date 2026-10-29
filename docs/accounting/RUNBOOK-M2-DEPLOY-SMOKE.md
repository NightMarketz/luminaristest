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

  > **[EMENDA 2026-09-02 — decisão do dono]** *"Deixe o host para só na finalização do app."* O
  > provisionamento do host concreto **sai da fila corrente** e passa a ser a última tarefa antes de
  > operar cliente real; o M2 inteiro fica atrás dela. Consequências: (a) o item ABERTO do ADR §7
  > deixa de ser pendência de decisão e vira tarefa agendada, sem prazo; (b) nenhum gate acima do M2
  > depende disto — B-4/X2/H1/H2 rodam contra o `dev.db` real local, não contra host; (c) a classe
  > ratificada (VPS própria, 1 instância/cliente, disco local real) **continua valendo** — o adiamento
  > é de provedor concreto, não de topologia.
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

> **[EMENDA 2026-10-05 — autorizada pelo dono em chat: *"Pode emendar o runbook M2 com os 3 passos novos"*]**
> Três pré-condições novas, cada uma com passo próprio e EVIDÊNCIA (passos 2–4 abaixo; os antigos 2–4 viraram 5–7):
> - **I4 — nenhum tenant com venda real postada antes do deploy** (insumo I4 do
>   [`PACOTE-VALIDADE-PENDENCIAS-brief.md`](PACOTE-VALIDADE-PENDENCIAS-brief.md) §7; condição do F-PP-4 em
>   [`D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS`](../plano/decisoes/D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS.md)).
>   **Não é o nó `[[I4]]` do vault** (onboarding activate-default) — mesmo nome, coisa diferente. Se houver venda real,
>   o F-PP-4 volta ao dono (estorno + relançamento) e este runbook termina em BLOQUEADO.
> - **Migrações de 05/10 aplicadas pelo `deploy:migrate` ANTES de subir o servidor.** São **duas** pastas com o mesmo
>   timestamp: `20261005120000_add_package_validity_acceptances` (#530) e `20261005120000_add_tax_assessment_anual_fields`
>   (#529), ambas aditivas. O compose não migra (por desenho); servidor de pé sem elas quebra em runtime nas colunas/tabela
>   novas. **Não existe mais backfill no boot** — removido no delta D1 do #483 (`2d1ddbe5`); subir o servidor não grava
>   prazo em saldo antigo.
> - **Chave da cifra das credenciais de pagamento** (`PAYMENT_CREDENTIAL_KEYS` + `PAYMENT_CREDENTIAL_KEY_ACTIVE`;
>   [BRIEF do F5](BE-INCR-PAYMENT-PROVIDER-brief.md) §6.3, P1-2; fold 02/10 de `docs/plano/gates/M2.md`). Sem ela o
>   servidor **sobe** e a cobrança responde 503 (`server/src/lib/secretBox.ts:33-40`) — não trava o boot, trava a 1ª
>   credencial do Mercado Pago. Backup da chave **separado** do backup do `.db`. Onde a chave mora além do env
>   (cofre/KMS) continua decisão deste gate.

> **[EMENDA 2026-10-29: Redis por instância. Dono, chat, 2026-10-29: *"Dispara sessão para o … Runbook do M2 com
> Redis, para colocar em produção."*]** O escopo é só preparar o runbook. Origem: F-TM-5 = "BullMQ + Redis" (PR #969,
> `D-2026-10-29-TEAMMATES-FORKS.md` e `BE-INCR-TEAMMATES-brief.md` itens 19–22). Desenho do serviço em
> [`ADR-M2-deploy-topology.md` §8](../adr/ADR-M2-deploy-topology.md) (versão, rede, senha, AOF, `noeviction`, backup).
> - **Bloco R (passos R0–R5), condicional:** só se aplica quando o commit implantado contém o **PR-4 do TEAMMATES**
>   (fila BullMQ). O passo R0 decide isso com um comando. Sem o PR-4, o bloco inteiro fica de fora e o resto do runbook
>   segue igual.
> - **Redis ausente não é falha de deploy do ERP.** Pelo item 22 do BRIEF, a aplicação sobe sem Redis e só os
>   teammates respondem 503 `TEAMMATES_FILA_INDISPONIVEL`. O passo R5 prova isso.
> - **Regra de desfecho do bloco R** (proposta nesta emenda; se o dono não a aceitar, vale a regra geral do formato):
>   cada passo R tem desfecho próprio. **R3 FALHOU** (Redis alcançável de fora ou sem senha) → para tudo, e o M2 fica
>   FALHOU, porque é exposição. Qualquer **outro** passo R FALHOU ou BLOQUEADO → para **só o bloco R**: o executor
>   desliga os teammates (`docker compose stop redis`), registra em "Achados", e o M2 segue nos passos numerados (5–7)
>   sem contar isso como falha do ERP.
> - **Ordem:** R0–R3 vêm entre o 4a e o 5 (Redis de pé antes do server). R4–R5 vêm entre o 6 e o 7 (precisam do server
>   de pé, e o 7 lê os logs depois da queda simulada).
> - **Pendências de infraestrutura** (compose, CI, `/health`, reconciliação), que são código do PR-4 e não deste
>   runbook: seção "Pendências do bloco R", no fim.

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

2. **I4 — conferir que não há venda real postada.** No banco do alvo (antes de migrar), rodar:
   `sqlite3 <caminho do .db do alvo> "SELECT u.username, je.sourceType, COUNT(*), MIN(je.date), MAX(je.date) FROM journal_entries je JOIN \"User\" u ON u.id = je.userId WHERE je.sourceType LIKE 'sale.%' AND je.status IN ('Posted','Reconciled') GROUP BY 1, 2;"`
   Resultado esperado: 0 linhas, ou só usernames de tenant do seed (o executor declara, por nome, que cada um é seed).
   Qualquer tenant real na saída → parar: desfecho BLOQUEADO (pré-condição I4) e o F-PP-4 volta ao dono.
   EVIDÊNCIA: [saída completa da query + a declaração por username]

3. **Migrar ANTES de subir o servidor** (processo do server ainda parado ou na versão anterior). No host, com
   `server/` instalado (`npm ci` + `npx prisma generate` — o script carrega `server/generated/prisma`) e o
   `DATABASE_URL` do alvo no ambiente: `cd server && npm run deploy:migrate -- --backup-dir <dir de backup>`.
   Depois: `sqlite3 <caminho do .db do alvo> "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name LIKE '20261005120000_%';"`
   Resultado esperado: exit 0 do `deploy:migrate` (backup criado, `integrity_check` ok, `foreign_key_check` vazio,
   nenhuma tabela perde linha); a query devolve **2 linhas** (`…_add_package_validity_acceptances` e
   `…_add_tax_assessment_anual_fields`), ambas com `finished_at` preenchido e `rolled_back_at` vazio.
   Exit ≠ 0 → restaurar do backup que o script indicou; não subir o servidor.
   EVIDÊNCIA: [saída completa do `deploy:migrate` + caminho do backup + saída da query]

4. **Provisionar a chave da cifra no env da instância.** Gerar (fora do repo, sem colar o valor em lugar nenhum):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` → definir
   `PAYMENT_CREDENTIAL_KEYS="1:<base64>"` e `PAYMENT_CREDENTIAL_KEY_ACTIVE=1` no env da instância; guardar a chave em
   backup **separado** do backup do `.db`. Conferir no mesmo ambiente do processo do server, sem imprimir a chave:
   `node -e "const e=process.env;console.log(e.PAYMENT_CREDENTIAL_KEYS.split(',').map(x=>{const[v,b]=x.split(':');return v+':'+Buffer.from(b,'base64').length+'B'}).join(','),'active='+e.PAYMENT_CREDENTIAL_KEY_ACTIVE)"`
   Resultado esperado: `1:32B active=1`.
   EVIDÊNCIA: [saída da conferência (NUNCA a chave) + onde fica o backup da chave (local, não o conteúdo)]

4a. **`ALERT_WEBHOOK_URL` no env da instância** (nó OBS, Fase B, item 15 do
   [`PRE-ADR-OBSERVABILIDADE.md`](../adr/PRE-ADR-OBSERVABILIDADE.md) §5; emenda autorizada pelo dono em chat,
   2026-10-24: *"Executa os itens 11, 13 e 15 do PRE-ADR-OBSERVABILIDADE §5 (Fase B)"*). Obrigatória em produção,
   opcional em dev. Sem ela, `server/src/lib/alertWebhook.ts` não envia nada e falha de job ou do processo some sem
   aviso. O `docker-compose.yml` recusa subir sem a variável (`${ALERT_WEBHOOK_URL:?…}`). Conferir sem imprimir a URL
   (o path costuma carregar segredo): `docker compose config --format json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const u=JSON.parse(s).services.server.environment.ALERT_WEBHOOK_URL||'';console.log(u?'set host='+new URL(u).host:'MISSING')})"`
   Resultado esperado: `set host=<host do receptor>`; `MISSING` ou erro do compose → parar.
   EVIDÊNCIA: [saída da conferência (NUNCA a URL inteira)]

### Bloco R — Redis da fila dos teammates (condicional ao PR-4 do TEAMMATES; ADR-M2 §8)

R0. **O bloco se aplica?** No checkout do commit implantado (o do pré-requisito "branch a implantar integrada"):
   `grep -c '"bullmq"' server/package.json`
   Resultado esperado: `1` → o PR-4 está no commit, e R1–R5 são obrigatórios. `0` → o bloco **não se aplica**: colar a
   saída, pular R1–R5 (inclusive R4 e R5, depois do passo 6) e não subir Redis. Com `0`, nada aqui conta como pendência do M2.
   EVIDÊNCIA: [saída do grep + `git rev-parse HEAD`]

R1. **`REDIS_PASSWORD` no `.env` da instância** (ao lado do `docker-compose.yml`). Gerar fora do repo, sem colar o valor
   em lugar nenhum: `openssl rand -hex 32` → linha `REDIS_PASSWORD=<hex>` no `.env`. A `REDIS_URL` do server é montada
   pelo compose (`redis://:${REDIS_PASSWORD}@redis:6379/0`, ADR-M2 §8.2) e não é escrita à mão. Conferir sem imprimir a
   senha:
   `docker compose config --format json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const u=new URL(JSON.parse(s).services.server.environment.REDIS_URL||'redis://MISSING');console.log('host='+u.hostname+' port='+u.port+' db='+u.pathname+' senha='+(u.password?u.password.length+' chars':'AUSENTE'))})"`
   Resultado esperado: `host=redis port=6379 db=/0 senha=64 chars`. `host=MISSING`, `senha=AUSENTE` ou erro do
   compose → FALHOU.
   EVIDÊNCIA: [saída da conferência (NUNCA a senha nem a URL inteira)]
   Desfecho do passo (marcar UM): [ ] PASSOU  [ ] FALHOU  [ ] BLOQUEADO

R2. **Subir o Redis e conferir versão e configuração** (antes do server, no passo 5):
   `docker compose up -d redis`
   `docker image inspect --format '{{index .RepoDigests 0}}' $(docker compose images -q redis)`
   `docker compose exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --no-auth-warning INFO server | grep redis_version; REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --no-auth-warning CONFIG GET maxmemory-policy maxmemory appendonly appendfsync save'`
   Resultado esperado: o digest `redis@sha256:…` igual ao fixado no `docker-compose.yml`; `redis_version:8.2.x`;
   `maxmemory-policy` = `noeviction`, `maxmemory` = `134217728`, `appendonly` = `yes`, `appendfsync` = `everysec`,
   `save` = vazio. Qualquer política diferente de `noeviction` → FALHOU, porque o BullMQ quebra (ADR-M2 §8.4).
   EVIDÊNCIA: [saída dos três comandos]
   Desfecho do passo (marcar UM): [ ] PASSOU  [ ] FALHOU  [ ] BLOQUEADO

R3. **O Redis não está exposto.** Na VPS:
   `docker compose port redis 6379; echo "exit=$?"`
   `docker inspect --format '{{json .NetworkSettings.Ports}}' $(docker compose ps -q redis)`
   `ss -ltn '( sport = :6379 )'`
   `docker compose exec -T redis redis-cli ping`
   E **de fora da VPS** (outra máquina, contra o IP público): `nc -vz -w 5 <IP público da VPS> 6379`. No Windows:
   `Test-NetConnection <IP público da VPS> -Port 6379`.
   Resultado esperado: `docker compose port` sem endereço e `exit` ≠ 0; `{"6379/tcp":null}` (porta exposta só na rede
   do compose, sem *binding* no host); `ss` só com a linha de cabeçalho; `ping` sem senha → `NOAUTH Authentication
   required.`; o teste externo recusado ou em *timeout* (`TcpTestSucceeded : False`). Qualquer *binding* no host,
   conexão externa aceita ou `PONG` sem senha → **FALHOU, e o M2 inteiro para** (regra do bloco R).
   EVIDÊNCIA: [saída literal dos cinco comandos, com o externo identificado por máquina de origem]
   Desfecho do passo (marcar UM): [ ] PASSOU  [ ] FALHOU  [ ] BLOQUEADO

5. Deploy do server e do front no alvo; subir os processos.
   Resultado esperado: processos de pé, `/api` respondendo autenticado.
   EVIDÊNCIA: [comandos usados + resposta de um endpoint autenticado]

6. Smoke-launch do Chromium no host: gerar um recibo PDF no ambiente implantado (caminho
   puppeteer real).
   Resultado esperado: PDF gerado sem erro de launch.
   EVIDÊNCIA: [o PDF ou o log do launch]

R4. **Smoke da fila: enfileirar e consumir um job de teste** (bloco R; server do passo 5 de pé). Usa uma fila
   própria, `m2-smoke`, e não a `teammate-turns`: um job de teste na fila real seria pego pelo worker do app, que não
   acharia o `AgentTurn` e dispararia `job_failed`. Roda dentro do container do server, com o `bullmq` e a `REDIS_URL`
   da imagem implantada:
   ```
   docker compose exec -T server node -e "
   const IORedis=require('ioredis');const {Queue,Worker}=require('bullmq');
   const mk=()=>new IORedis(process.env.REDIS_URL,{maxRetriesPerRequest:null});
   const q=new Queue('m2-smoke',{connection:mk()});const t0=Date.now();
   const fim=async(c)=>{await w.close();await q.obliterate({force:true});await q.close();process.exit(c)};
   const w=new Worker('m2-smoke',async j=>({eco:j.data.ping}),{connection:mk()});
   w.on('completed',(j,r)=>{console.log('consumido id='+j.id+' retorno='+JSON.stringify(r)+' ms='+(Date.now()-t0));fim(0)});
   w.on('failed',(j,e)=>{console.log('FALHOU '+e.message);fim(1)});
   q.add('ping',{ping:'m2'},{jobId:'m2-smoke-1'}).then(j=>console.log('enfileirado id='+j.id));
   setTimeout(()=>{console.log('TIMEOUT 15s');process.exit(2)},15000);
   "; echo "exit=$?"
   ```
   Depois, para conferir que o teste não deixou resto:
   `docker compose exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --no-auth-warning --scan --pattern "bull:m2-smoke:*" | wc -l'`
   Resultado esperado: `enfileirado id=m2-smoke-1`, depois `consumido id=m2-smoke-1 retorno={"eco":"m2"} ms=<n>` e
   `exit=0`; a contagem de chaves dá `0`. `FALHOU`, `TIMEOUT` ou `exit` ≠ 0 → FALHOU (regra do bloco R).
   `Cannot find module` → BLOQUEADO: é defeito do runbook diante da imagem, não do deploy. Não improvisar; o agente
   diagnostica.
   **Limite do passo:** prova Redis + BullMQ + rede + senha na imagem implantada. Não prova o worker do app
   (`TeammateTurnWorker`), que só se prova no primeiro turno real de um teammate, fora do M2.
   EVIDÊNCIA: [saída literal dos dois comandos]
   Desfecho do passo (marcar UM): [ ] PASSOU  [ ] FALHOU  [ ] BLOQUEADO

R5. **Redis fora → ERP segue no ar** (bloco R; item 22 do BRIEF). Use o mesmo endpoint autenticado e o mesmo token do
   passo 5 (`$TOKEN` abaixo). Antes, ache o path da listagem de teammates:
   `grep -o '"/teammates[^"]*"' server/public/openapi.json | sort -u`
   ```
   docker compose stop redis
   curl -s -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:3001/health
   curl -s -o /dev/null -w 'erp=%{http_code}\n' -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/<endpoint do passo 5>
   curl -s -w '\nteammates=%{http_code}\n' -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/api/<path de listagem de teammates>
   docker compose start redis
   ```
   Aguardar ~15 s **sem reiniciar o server** e repetir só o último `curl`.
   Resultado esperado, com o Redis parado: `health=200`, `erp=200`, `teammates=503` e corpo com
   `TEAMMATES_FILA_INDISPONIVEL`. Depois do `start`: `teammates=200`. `health=503` com o Redis fora → FALHOU
   (pendência P5: o `/health` não pode cair por causa dos teammates). `erp` ≠ 200 → FALHOU do **M2**, porque aí o
   ERP depende do Redis, contra o item 22. `teammates` ainda 503 depois do `start` → FALHOU (pendência P8,
   reconexão).
   EVIDÊNCIA: [saída literal de todos os comandos, na ordem, incluindo o `curl` repetido]
   Desfecho do passo (marcar UM): [ ] PASSOU  [ ] FALHOU  [ ] BLOQUEADO

7. `cd server && npm run logs:errors` após alguns minutos de uso real.
   Resultado esperado: sem erro novo. Se o bloco R rodou, erros de conexão ao Redis **dentro da janela do R5** são
   esperados: listar, com o horário, separados do resto. Fora dessa janela, erro de Redis conta como erro novo.
   EVIDÊNCIA: [saída do comando]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 5 do master map + data]
- Bloco R: [ ] não se aplica (R0 = `0`)  [ ] aplicou. Desfecho de cada passo marcado acima.
- Assinatura do executor: ____________

## Pendências do bloco R (código do PR-4 do TEAMMATES; nada aqui foi aplicado)

Levantadas em 29/10 contra `main` `455c1a45`. Hoje o `docker-compose.yml` não tem serviço Redis e o `ci.yml` não tem
serviço nenhum. Sem P1 o bloco R não roda; sem P5 e P8, o R5 termina em FALHOU. Detalhe e motivo de cada uma em
[`ADR-M2-deploy-topology.md` §8.7](../adr/ADR-M2-deploy-topology.md).

**P1: diff proposto para o `docker-compose.yml`** (não aplicado; o patch e o digest da imagem são escolhidos no PR-4):

```diff
   server:
     environment:
+      # ADR-M2 §8.2: só rede interna; senha hex por env. Sem Redis o server sobe (BRIEF TEAMMATES item 22).
+      REDIS_URL: redis://:${REDIS_PASSWORD:?defina REDIS_PASSWORD no .env (openssl rand -hex 32)}@redis:6379/0
     depends_on:
       - qdrant
+      - redis
+
+  redis:
+    # ADR-M2 §8.2–8.4. SEM `ports:`: nunca publicar 6379 no host.
+    image: redis:8.2.<patch>-alpine@sha256:<digest>
+    environment:
+      REDIS_PASSWORD: ${REDIS_PASSWORD:?defina REDIS_PASSWORD no .env}
+    command: ["sh", "-c", "exec redis-server --requirepass \"$$REDIS_PASSWORD\" --appendonly yes --appendfsync everysec --save '' --maxmemory 128mb --maxmemory-policy noeviction"]
+    volumes:
+      - redis_data:/data
+    restart: unless-stopped

 volumes:
+  redis_data:
```

**P7: diff proposto para o `.github/workflows/ci.yml`**, job `server-tests` (matriz `integration`, 4 shards):

```diff
   server-tests:
     runs-on: ubuntu-latest
+    services:
+      redis:
+        image: redis:8.2.<patch>-alpine
+        ports: ["6379:6379"]
+        options: >-
+          --health-cmd "redis-cli ping" --health-interval 5s --health-timeout 3s --health-retries 10
+    env:
+      REDIS_URL: redis://localhost:6379/0
```

**Demais (comportamento, com teste no PR-4/PR-5):** P2, reconciliação no boot (re-enfileirar `AgentTurn` órfão e
regravar os schedulers de `TeammateRoutine`); sem ela, perder o volume `redis_data` apaga as rotinas em silêncio, e
restaurar a instância exige regravar as rotinas à mão · P3, OOM do `noeviction` → 503, não 500 · P4,
`removeOnComplete`/`removeOnFail` com teto · P5, Redis informativo no `/health`, fora do 503 · P6, alerta de Redis
inalcançável por janela · P8, reconexão sem reiniciar o server.
