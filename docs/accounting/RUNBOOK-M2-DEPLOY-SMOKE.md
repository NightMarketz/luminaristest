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

5. Deploy do server e do front no alvo; subir os processos.
   Resultado esperado: processos de pé, `/api` respondendo autenticado.
   EVIDÊNCIA: [comandos usados + resposta de um endpoint autenticado]

6. Smoke-launch do Chromium no host: gerar um recibo PDF no ambiente implantado (caminho
   puppeteer real).
   Resultado esperado: PDF gerado sem erro de launch.
   EVIDÊNCIA: [o PDF ou o log do launch]

7. `cd server && npm run logs:errors` após alguns minutos de uso real.
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
