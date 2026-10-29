# ADR-M2 — Topologia de deploy: VPS própria, instância por cliente, BYOK por env, migração como etapa separada

> **Status: Accepted — RATIFICADO PELO DONO 2026-08-22** (via `AskUserQuestion`). Quatro decisões, sem
> fork intermediário nem parecer independente — o dono decidiu diretamente. Resultado:
> **(1) Alvo → VPS própria AGORA, com encaixe CLEAN para PaaS** (implantar já no host próprio; nada do
> artefato pode fechar a porta de migrar para um PaaS gerenciado depois — ver §4);
> **(2) Topologia → uma instância por cliente** (um SQLite + uma env por cliente, não uma instância
> compartilhada por `AccountingScope`);
> **(3) BYOK → chave de IA do próprio cliente** (`OPENAI_API_KEY` é do cliente; custo zero de código
> por consequência direta de (2) — KMS e BYOC ficam explicitamente FORA de escopo);
> **(4) Migração → etapa separada do pipeline de deploy**, nunca passo manual nem entrypoint que migra
> no boot — justificativa citável do dono: *"ainda vai mudar muito e a tabela só vai realmente estar
> pronta quando todos os módulos fixos estiverem completos"*.
>
> **Aberto (fora deste ADR):** qual VPS/provedor concreto; se o Qdrant vira serviço gerenciado;
> F-P2-3 e F-P2-4 do `ADR-P2-second-vertical.md` (não tocados aqui).
>
> **Emenda 2026-10-29 (§8):** cada instância ganha um serviço **Redis** para a fila BullMQ dos teammates
> (F-TM-5, PR #969). As quatro decisões acima não mudam.
>
> Criado: 2026-08-22.

---

## 1. Contexto e problema

O Bloco A do master map trava em `RUNBOOK-M2-DEPLOY-SMOKE.md` numa pré-condição sem resposta: "alvo de
deploy decidido e provisionado — hoje inexistente". O runbook (preparado em branco em 2026-08-17,
`docs/operating-manual/RUNBOOK-FORMAT.md`) não pode avançar sem essa decisão — é gate humano, não
sessão de agente. Em 2026-08-22 o dono tomou as quatro decisões acima via `AskUserQuestion`. Este ADR
as registra; ele **não** provisiona nada, **não** roda migração, **não** assina o runbook — só formaliza
o "por quê" para o executor humano não re-decidir no meio da execução.

## 2. Decisões do dono (texto fiel — sem suavização)

1. **Alvo:** VPS própria AGORA, "mas com encaixe CLEAN para PaaS" (palavras dele) — implantar já no
   host próprio, com a exigência de que nada do artefato feche a porta de migrar para PaaS gerenciado
   depois.
2. **Topologia:** UMA INSTÂNCIA POR CLIENTE (um arquivo SQLite por cliente, uma env por cliente), e não
   uma instância compartilhada por `AccountingScope`.
3. **BYOK = chave de IA do próprio cliente** (a `OPENAI_API_KEY` é do cliente, não do produto).
   Consequência direta da topologia: com instância por cliente isso custa ZERO código — a env var da
   instância já é a chave dele. NÃO existe, e não foi decidido, cifra de dado em repouso (KMS) nem
   rodar na conta de nuvem do cliente (BYOC) — as duas ficam explicitamente FORA de escopo desta
   decisão.
4. **Quem aplica a migração:** ETAPA SEPARADA do pipeline de deploy (job próprio, antes do swap de
   container), NÃO passo manual e NÃO entrypoint que migra no boot. Justificativa dele, citável:
   "ainda vai mudar muito e a tabela só vai realmente estar pronta quando todos os módulos fixos
   estarem completos".

## 3. Evidência de código (re-verificada 2026-08-22 — grau: verificado em disco)

| Fato | Onde | Estado |
|---|---|---|
| `docker-compose.yml` sobe 3 serviços (server, frontend, qdrant `qdrant/qdrant:latest`) | `docker-compose.yml:4,25,49-50` | **Confirmado** |
| 2 volumes com estado (`sqlite_data`, `qdrant_data`) | `docker-compose.yml:19-20,57,61-62` | **Confirmado** |
| Segredos todos por env — `JWT_SECRET`, `OPENAI_API_KEY`, `QDRANT_API_KEY`, `DATABASE_URL=file:/data/dev.db` | `docker-compose.yml:11-13,18` | **Confirmado** |
| `OPENAI_API_KEY` lida de `process.env` em 3 pontos, chave de PROCESSO (não por tenant) | `server/src/lib/openai/OpenAIService.ts:94,99`; `server/src/lib/vector/embedding.ts:154,158`; `server/src/lib/factory.ts:368` | **Confirmado** (linhas exatas re-medidas — ligeiramente diferentes das citadas na tarefa, mesmo arquivo/mecanismo) |
| `NEXT_PUBLIC_API_BASE_URL` inlinado em tempo de BUILD | `my-app/next.config.js:23` | **Confirmado**; **20** arquivos citam a var — `grep -rl NEXT_PUBLIC_API_BASE_URL my-app --include=*.ts --include=*.tsx --include=*.js | grep -v node_modules` = 20, dos quais 18 são fonte de app, 1 é o teste de wiring (`lib/api/__tests__/nextPublicEnvWiring.test.ts`) e 1 é a própria origem (`next.config.js`). Medido 2026-08-22; a contagem citada em `docker-compose.yml:31` é anterior |
| `server/Dockerfile` faz `COPY dist ./dist` com `dist/` no gitignore → imagem depende de build feito ANTES do `docker build` | `server/Dockerfile:10`; `.gitignore:7,10` (`dist/`) | **Confirmado** |
| Nenhum artefato de deploy roda `prisma migrate deploy` | `docker-compose.yml` sem `command`/`entrypoint`; grep por `"migrate deploy"` fora de `docs/**` só acha `scripts/smoke-migration-gate.mjs` (gate local, não deploy) e `execSync` dentro de suítes de teste de integração (harness, não artefato de produção) | **Confirmado** |
| 0 migrações `down` | `find server/prisma/migrations -iname "*down*"` = 0 | **Confirmado** |
| SQLite com WAL exige disco local; volume de rede quebra o locking | `server/src/lib/prisma.ts:23-24` (`PRAGMA journal_mode = WAL`, `PRAGMA busy_timeout = 5000`) | **Confirmado**; aplicado pela aplicação em runtime, não pelo compose |
| **DIVERGÊNCIA da tarefa:** "9 das 29 migrações fazem DROP TABLE; a última da fila (`20260814120000_counterparty_notnull`) tem `RAISE(ABORT)` que não reverte" | `ls -d server/prisma/migrations/*/` agora = **30** (não 29) — o merge do PR #211 (P1 binding press, `dfaed751`) acrescentou `20260821090000_accounting_binding` **depois** de `counterparty_notnull`. `grep -rl "DROP TABLE" server/prisma/migrations` continua = ~~**9**~~ **[EMENDA 2026-09-02]: 11** (ver abaixo) (nenhuma DROP TABLE nova). A migração nova (`accounting_bindings`) é **aditiva pura** — 1 `CREATE TABLE` + 2 `CREATE INDEX`, sem `DROP TABLE`, sem `RAISE`. | **Corrigido abaixo** |

**Correção do fato divergente:** a migração hoje **última da fila** é `20260821090000_accounting_binding`
(aditiva, sem risco de reversão). A migração com `RAISE(ABORT, ...)` que não reverte no SQLite
(`prisma.migrate deploy` não envolve o arquivo em transação — comentário no próprio SQL) é
`20260814120000_counterparty_notnull` (`server/prisma/migrations/20260814120000_counterparty_notnull/migration.sql`,
bloco de assert por trigger + 2 rebuilds de tabela com `DROP TABLE "payables"`/`DROP TABLE "receivables"`),
que agora é a **penúltima**, não a última — o risco descrito no runbook (A5) continua real e
continua na fila de migrações pendentes de um alvo novo; só a posição ordinal mudou. Nenhuma
consequência para as 4 decisões do dono: a migração como etapa separada (decisão 4) cobre a fila
inteira, não só o topo dela.

**[EMENDA 2026-09-02] — recontagem (kit de preflight M2, `docs/accounting/KITS-PREFLIGHT-2026-09-02.md`):**
a correção acima (2026-08-22) já ficou estale. Medido de novo agora, com o mesmo par de comandos:
`ls server/prisma/migrations | grep -c "^[0-9]"` = **35** migrações no total (não mais 30);
`grep -l -i "DROP TABLE" server/prisma/migrations/*/migration.sql | wc -l` = **11** (não mais 9).
As 11 migrações com `DROP TABLE`, na ordem da fila:

1. `20251217012341_add_chat_instance_type`
2. `20260430211446_add_user_locale_currency`
3. `20260627150000_add_entry_numbering`
4. `20260701014733_add_document_attachments`
5. `20260714171742_approval_tower_maker_checker`
6. `20260715060000_incr_counterparty`
7. `20260720115019_add_inventory_subledger`
8. `20260721120000_dashboard_multi_tab_layouts`
9. `20260814120000_counterparty_notnull` (o `RAISE(ABORT)` descrito acima continua aqui)
10. `20260830160349_counterparty_identity_normalization` (nova; também tem `RAISE(ABORT)` — probe
    de colisão de `nameNormalized`, mesmo padrão de assert-por-trigger da nº 9)
11. `20260831032258_int_to_bigint_cents` (nova; SEM `RAISE(ABORT)` — 11 `DROP TABLE` de rebuild
    de coluna INTEGER→BigInt, verificado com `grep -c "RAISE(ABORT" nesse arquivo` = 0)

**A afirmação derivada também mudou de novo:** a correção de 2026-08-22 dizia que a última da fila
era `20260821090000_accounting_binding` (aditiva pura). Isso já não vale — 4 migrações foram
adicionadas depois dela, e a **última da fila hoje é `20260831032258_int_to_bigint_cents`**, que
NÃO é aditiva pura: reconstrói 11 tabelas via `DROP TABLE`/`CREATE TABLE` (mudança de tipo de coluna
para BigInt/centavos, PR #245). Sem `RAISE(ABORT)`, então não herda o risco específico de não-reversão
da nº 9/nº 10 — mas não é mais correto descrever a ponta da fila como "aditiva, sem risco de
reversão"; é um rebuild de tabela como as outras 10. O ponto que segue de pé: nenhuma delas muda as
4 decisões do dono (decisão 4 — migração como etapa separada — cobre a fila inteira, não só a ponta).

## 4. Encaixe CLEAN para PaaS — checklist

Esta lista é o que a palavra **"CLEAN"** do dono passa a significar operacionalmente — **derivada por
agente a partir dos fatos de código**, não ditada por ele. Sujeita a correção dele.

### 4.a — Já portável hoje (não precisa de trabalho)

| Item | Evidência | Grau |
|---|---|---|
| Segredos 100% por env (`JWT_SECRET`, `OPENAI_API_KEY`, `QDRANT_API_KEY`) | `docker-compose.yml:11-12,18` | verificado |
| `DATABASE_URL` por env, formato `file:` já parametrizável por instância | `docker-compose.yml:13` | verificado |
| BYOK por env da instância — custa zero código adicional dado (2) | `server/src/lib/openai/OpenAIService.ts:99`; `embedding.ts:158`; `factory.ts:368` (todas leem `process.env.OPENAI_API_KEY`, sem lookup por tenant) | verificado |
| WAL/`busy_timeout` aplicados pela aplicação, não pelo orquestrador — portam para qualquer host com disco local | `server/src/lib/prisma.ts:23-24` | verificado |
| Migração já pensada como etapa separada do processo de app (decisão 4 deste ADR + `smoke-migration-gate.mjs` já roda fora do boot) | `scripts/smoke-migration-gate.mjs` (script standalone, não chamado por `Dockerfile`/`docker-compose.yml`) | verificado |
| Sem *state* no processo do server além do arquivo SQLite e do índice Qdrant — nenhum outro volume/cache local declarado | `docker-compose.yml:19-20,61-62` (só os 2 volumes nomeados) | inferido |

### 4.b — Dívida que fecha a porta do PaaS se não for tratada

| Item | Custo se ignorado | Consertar QUANDO | Evidência | Grau |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` inlinada em tempo de BUILD | N domínios/clientes = N imagens de frontend rebuildadas (um PaaS que builda 1x e serve N domínios não funciona sem rebuild por cliente) | ao decidir servir múltiplos domínios de uma imagem só — hoje, com 1 instância por cliente (decisão 2), cada cliente já tem seu próprio build, então a dívida é dormente, não ativa | `my-app/next.config.js:23`; `docker-compose.yml:31-42` (comentário já documenta o mecanismo) | verificado |
| `server/Dockerfile` faz `COPY dist ./dist` — a imagem espera `dist/` pronto de FORA do `docker build` | um PaaS que builda a partir do git (Railway/Render/Fly build-from-source) não tem `dist/` no contexto — o build do PaaS quebraria na primeira imagem | ao trocar para um PaaS que builda a partir do repo — trivial de consertar (mover `RUN npm run build` para dentro do `Dockerfile`, multi-stage como o do frontend já faz), mas HOJE não está feito | `server/Dockerfile:5-13` (sem estágio de build); `.gitignore:7` (`dist/`) | verificado |
| 2 volumes persistentes (`sqlite_data`, `qdrant_data`) + exigência de disco LOCAL do WAL | restringe a lista de PaaS elegíveis a quem oferece volume persistente com lock POSIX real — descarta serverless puro e qualquer storage de objeto/rede (EFS/NFS) para o SQLite | ao escolher o PaaS concreto — é critério de seleção, não puro debt de código; nenhuma mudança de artefato resolve isso, é restrição estrutural do SQLite+WAL | `docker-compose.yml:19-20,61-62`; `server/src/lib/prisma.ts:23-24` | verificado |
| Nenhum job de migração declarado em nenhum artefato — decisão 4 diz "etapa separada", mas o "job próprio" ainda não existe em código/CI | sem esse job, o primeiro deploy em qualquer alvo (VPS ou PaaS) sobe um container sem schema — não é específico de PaaS, mas bloqueia a portabilidade igual | antes do primeiro deploy real (é a própria pré-condição do runbook, não uma dívida de "depois") | `docker-compose.yml` sem `command`/`entrypoint`; grep de `"migrate deploy"` = 0 fora de teste/gate local | verificado |
| `QDRANT_URL: http://qdrant:6333` aponta para o nome do serviço do compose | um PaaS que não orquestra os 3 serviços juntos (ex.: Qdrant como serviço gerenciado à parte) exige essa URL virar env externa — hoje é hardcoded no compose, não no `.env` | ao decidir se o Qdrant vira gerenciado (item explicitamente ABERTO neste ADR, ver cabeçalho) | `docker-compose.yml:14` | verificado |

**Correção factual desta Wave (2026-08-30, agente — Wave 1 item B-3, `claude/w1d-deploy-migrate`):**
duas linhas da tabela acima ficaram stale desde que este ADR foi escrito (2026-08-22); nenhuma
decisão do dono muda — só o fato de código.

- **`COPY dist ./dist` (linha 2 da tabela):** OBSOLETA. `server/Dockerfile` é multi-stage desde o
  commit `f869294e` ("feat(deploy,accounting-fe): 5 frentes do replanejamento…", mesmo dia
  2026-08-22, mesclado em `main` antes deste ADR ser escrito — a tabela não tinha sido atualizada
  contra o próprio commit-irmão). Hoje: estágio `builder` roda `npm run build` dentro da imagem
  (`prisma generate && tsc && tsc-alias`) e o estágio `runner` copia `dist/` + `generated/prisma` +
  `node_modules` do builder (`server/Dockerfile:1-30`, comentários no próprio arquivo citam este
  ADR). Um PaaS que builda a partir do git já funciona hoje sem trabalho adicional nesse ponto.
- **"Nenhum job de migração declarado… ainda não existe em código" (linha 4 da tabela):** TAMBÉM
  stale, e pela mesma causa — o mesmo commit `f869294e` já tinha criado `scripts/migrate-deploy.mjs`
  (backup via `wal_checkpoint(TRUNCATE)` → `prisma migrate deploy` → `integrity_check` +
  `foreign_key_check` + contagem de linha pós-migração → exit code; `--self-check` cobre caminho
  feliz e falha forjada sem tocar banco do projeto). O script **existia mas não estava wireado** a
  nenhum comando nomeado — nem `server/package.json`, nem `docker-compose.yml` (por desenho: não
  deve estar), nem citado no `RUNBOOK-M2-DEPLOY-SMOKE.md`. Fechado nesta Wave: `npm run deploy:migrate`
  (`server/package.json`) chama `node ../scripts/migrate-deploy.mjs`, comentário no
  `docker-compose.yml` junto do serviço `server` documenta a ordem, e o `RUNBOOK-M2-DEPLOY-SMOKE.md`
  foi emendado. O item 3 de §7 abaixo e o parágrafo de §6 sobre o "job próprio" seguem citando o
  estado de 2026-08-22 tal como escrito (histórico, não reescrito) — esta nota é a correção vigente.

## 5. O que a topologia por cliente custa

Decisão 2 (uma instância por cliente) compra o BYOK de graça (decisão 3) e isolamento total de dado
entre clientes, mas não é sem custo operacional — registrado sem venda:

- **N instâncias para atualizar.** Um deploy de correção vira N deploys (um por cliente), não um
  rollout único — sem orquestrador multi-instância declarado no repo hoje (nenhum Kubernetes/Nomad/
  fleet-manager no compose), o processo de "atualizar todo mundo" é manual ou depende de tooling que
  ainda não existe.
- **N backups.** Cada `sqlite_data` é um arquivo isolado por cliente — não existe hoje um mecanismo de
  backup agregado no repo (nenhum script de backup declarado); N clientes = N rotinas de backup a
  operar (mesmo que seja o mesmo script rodando N vezes, é N execuções, N janelas de falha, N
  verificações de integridade).
- **Rebuild de imagem de frontend por domínio.** Consequência direta do item já registrado em §4.b —
  com uma instância por cliente, o rebuild por `NEXT_PUBLIC_API_BASE_URL` acontece de qualquer forma
  (cada cliente já builda a sua), então a topologia por cliente **absorve** essa dívida em vez de
  expô-la — mas o custo de N builds de frontend continua existindo, só migrou de "bug de portabilidade"
  para "custo operacional normal da topologia".

## 6. Consequências

- O runbook `RUNBOOK-M2-DEPLOY-SMOKE.md` perde a pré-condição "alvo inexistente" — o alvo (classe) está
  decidido; falta provisionar o host concreto (item explicitamente ABERTO, cabeçalho). Atualizado na
  mesma tarefa (§7 abaixo).
- A pré-condição "decidir e registrar quem roda `prisma migrate deploy`" tem resposta: etapa separada
  do pipeline, nunca boot/manual — decisão 4 deste ADR. O "job próprio" em si (§4.b, última linha)
  **não existe ainda em código** — é trabalho de implementação futuro, não coberto por este ADR
  (que é só-documentação).
- Nenhuma decisão aqui abre trabalho de KMS/BYOC — ambos ficam fora de escopo até decisão explícita
  nova do dono.
- Este ADR não substitui o `RUNBOOK-M2-DEPLOY-SMOKE.md` nem o assina — gate humano continua gate
  humano (`docs/operating-manual/RUNBOOK-FORMAT.md`).

## 7. Próximos passos

1. Provisionar o host concreto (VPS/provedor) — decisão do dono, fora deste ADR.
2. Decidir se o Qdrant vira serviço gerenciado — fora deste ADR.
3. Escrever o job de migração como etapa separada do pipeline (decisão 4) — implementação, não
   documentação; candidato a sessão de planejamento antes de sessão de feature.
4. Rodar o `RUNBOOK-M2-DEPLOY-SMOKE.md` (atualizado) contra o alvo provisionado — gate humano, agente
   não preenche evidência nem assina.

## 8. Emenda 2026-10-29 — Redis por instância (fila dos teammates, F-TM-5)

**Origem:** o dono escolheu **"BullMQ + Redis"** para os turnos dos teammates (F-TM-5; a recomendação era fila em
tabela, sem Redis). Cédula `docs/plano/decisoes/D-2026-10-29-TEAMMATES-FORKS.md` e BRIEF
`docs/accounting/BE-INCR-TEAMMATES-brief.md` itens 19–22, os dois só no PR #969 (branch
`claude/teammates-planejamento`) até o merge. **Autorização desta emenda:** dono, chat, 2026-10-29: *"Dispara sessão
para o … Runbook do M2 com Redis, para colocar em produção."* O escopo é só documentação. Ninguém provisiona nada a
partir daqui; o `docker-compose.yml` e o `ci.yml` mudam no PR-4 do TEAMMATES (§8.7).

**Não muda:** as quatro decisões da §2. A topologia continua sendo uma instância por cliente: cada instância passa a ter
**o seu** Redis, nunca um Redis compartilhado entre clientes (isso quebraria o isolamento da decisão 2 e o BYOK da 3).

### 8.1 O que o Redis guarda, e o que acontece se ele perder tudo

| Dado no Redis | Fonte da verdade fora do Redis | Perda do Redis apaga… |
|---|---|---|
| Job `{ turnId }` na fila `teammate-turns` (item 20: payload é **só** o id) | linha `AgentTurn` no SQLite, com `status` espelhado (item 19) | o job, não o turno: a linha `PENDING`/`RUNNING` continua no `.db` |
| *Job scheduler* por rotina (`upsertJobScheduler`, id = `routineId`, item 25 do PR-5) | linha `TeammateRoutine` no SQLite | o agendamento: a rotina para de disparar **sem erro**, até alguém regravar o scheduler |
| Estado interno do BullMQ (locks, contadores, retenção de concluídos/falhos) | — | nada de negócio |

Leitura (grau: **inferido** do BRIEF, código ainda não existe): **nada no Redis é dado de negócio**, mas ele não é
descartável sem a **reconciliação no boot**, que o BRIEF não lista: re-enfileirar `AgentTurn` em `PENDING` (e
`RUNNING` sem lock) e regravar um scheduler por `TeammateRoutine` ativa. `jobId = turnId` e `id = routineId` deixam
as duas operações idempotentes. Sem reconciliação, um volume do Redis perdido some com turnos pendentes e com toda
rotina agendada, sem alerta. Isso vira pendência do PR-4/PR-5 (§8.7, P2).

### 8.2 Serviço

- **Um serviço `redis` no compose de cada instância**, imagem oficial `redis`, linha **8.2**, com **tag de patch exata e
  digest** (`redis:8.2.<patch>-alpine@sha256:…`), **nunca** `latest` nem tag só de major. O patch exato é escolhido
  no PR-4, que é quem escreve o compose. O runbook cola o digest que subiu como EVIDÊNCIA (passo R1). A linha 8.2 foi
  conferida publicada no Docker Hub em 29/10 (tags `8.2.10`, `8.2.10-alpine`); qual é o patch mais novo, os snapshots
  do Hub divergem, então o PR-4 confere no dia. O BullMQ pede Redis ≥ 5 e recomenda ≥ 6.2 (fonte secundária, espelho
  da doc do BullMQ); a 8.2 atende.
- **Licença** (grau: inferido, não é parecer): o Redis 8 é tri-licenciado (RSALv2 / SSPLv1 / AGPLv3). Aqui ele roda
  **sem modificação**, como componente interno da instância, sem ser oferecido a terceiros como serviço de banco. Nessa
  leitura, nenhuma das três licenças cria obrigação para o produto. Se o dono preferir zerar a questão, a troca direta é
  o **Valkey** (BSD-3, compatível no protocolo e listado como suportado pelo BullMQ, fonte secundária), sem mudar uma
  linha de código.
- **Rede: só a interna do compose.** Sem `ports:` no serviço: nada publicado no host e nada na interface pública da
  VPS. O server alcança o Redis por `redis:6379`. Isso é diferente do `qdrant`, que hoje publica 6333/6334, e ele não
  serve de modelo.
- **Senha por env:** `REDIS_PASSWORD` no `.env` da instância, obrigatória no compose (`${REDIS_PASSWORD:?…}`, mesmo
  padrão do `QDRANT_API_KEY`), em hex (`openssl rand -hex 32`) para não exigir *escape* na URL. O server recebe
  `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0`, montada no compose. `REDIS_URL` já existe como opcional em
  `server/src/config/env.ts:113`. A senha é a segunda barreira; a primeira é a rede interna.
- **Sem `depends_on: condition: service_healthy`** do server para o redis: a aplicação **sobe sem Redis** (item 22).
  Basta `depends_on: [redis]` para a ordem de partida. Um healthcheck do Redis que travasse o boot do ERP contrariaria
  o item 22.

### 8.3 Persistência: AOF, `appendfsync everysec`

**Escolha: AOF ligado** (`--appendonly yes --appendfsync everysec`), sem RDB periódico (`--save ""`), num volume
nomeado `redis_data:/data`.

Por que não "nenhuma": a fila de turnos pode ser refeita a partir do `AgentTurn`, mas só quando a reconciliação da
§8.1 existir, e os schedulers das rotinas (PR-5) **não estão em lugar nenhum além do Redis** enquanto ela não existir.
Sem persistência, qualquer `docker compose restart`, *reboot* da VPS ou atualização da imagem apagaria as rotinas em
silêncio. Com AOF `everysec`, o pior caso num *crash* é perder até ~1 s de escrita: um job recém-enfileirado, cujo
`AgentTurn` já está no `.db` e é recuperado pela reconciliação. O custo é desprezível com payload de um id.

Por que não `appendfsync always`: o Redis aqui não é fonte da verdade, e o `fsync` por escrita disputaria o disco com o
SQLite em WAL na mesma VPS.

**Quando a reconciliação (P2) estiver entregue e provada**, "sem persistência" vira opção legítima. Trocar continua
sendo emenda deste ADR, não ajuste de compose.

### 8.4 Memória e despejo

- `--maxmemory 128mb --maxmemory-policy noeviction`. **`noeviction` é obrigatório para o BullMQ:** com qualquer
  política `allkeys-*`/`volatile-*`, o Redis pode despejar a chave de um job ou de um lock no meio do processamento e
  quebrar a fila sem erro claro (guia "Going to production" do BullMQ).
- Com `noeviction`, memória cheia faz o Redis **recusar escrita** (erro OOM). Para a aplicação, isso precisa virar o
  mesmo 503 `TEAMMATES_FILA_INDISPONIVEL` de "Redis fora", e não um 500 (pendência P3).
- 128 MB é folga larga para uma instância de um cliente com concorrência 1 (D-4) e payload `{ turnId }`. O que enche
  um Redis de BullMQ é a **retenção** de jobs concluídos e falhos, que por padrão é ilimitada. O PR-4 precisa fixar
  `removeOnComplete`/`removeOnFail` com teto (pendência P4). O histórico que importa já está no `AgentTurn`.
- O `maxmemory` fica **abaixo** do limite de memória do container (se houver), para que o Redis recuse escrita antes
  de o kernel matar o processo.

### 8.5 Backup: não precisa (condicionado)

**O Redis não entra na rotina de backup da instância.** Todo dado de negócio que passa por ele tem fonte da verdade no
SQLite (§8.1), e o backup do `.db` (pré-condição do runbook) já cobre essa fonte. Fazer backup do AOF traria de volta
jobs de um instante que não bate com o `.db` restaurado (turnos que o `.db` já marca `DONE` reaparecendo na fila), ou
seja, mais risco do que proteção.

**Condição:** isso vale quando a reconciliação no boot (P2) existir. Até lá, restaurar a instância é restaurar o `.db`
e **regravar as rotinas à mão** (desativar e reativar cada uma). O runbook registra isso como pendência, e não como
passo.

### 8.6 Observabilidade (cruza com `ADR-OBSERVABILIDADE.md`)

- `/health` (`server/src/app.ts:82-116`) hoje devolve 503 quando qualquer check falha. Se o PR-4 incluir o Redis
  nesse cálculo, **Redis fora derruba o health do ERP**, o que contraria o item 22 e faria um supervisor ou monitor
  externo reiniciar ou alertar o ERP inteiro por causa dos teammates. Proposta: o check do Redis entra no corpo como
  informação (`checks.redis = 'ok' | 'error' | 'not_configured'`) e fica **fora** do `allOk` (pendência P5).
- Falha final de turno já alerta (`job_failed`, item 21, OBS-R11). Redis inalcançável por tempo prolongado não tem
  alerta previsto no BRIEF. Ele é degradação (`warn`), não queda do ERP. Fica como pendência P6, para o PR-4 decidir
  com o ADR-OBSERVABILIDADE: um alerta por janela, não um por tentativa de reconexão.

### 8.7 Pendências de infraestrutura (código, do PR-4 do TEAMMATES; este ADR não altera arquivo)

| # | Onde | O quê |
|---|---|---|
| P1 | `docker-compose.yml` | serviço `redis` conforme §8.2–8.4 + volume `redis_data` + `REDIS_URL` no `server` (diff proposto no runbook, bloco R) |
| P2 | `features/teammates` (PR-4/PR-5) | reconciliação no boot: re-enfileirar `AgentTurn` `PENDING`/`RUNNING` órfão e regravar o scheduler de cada `TeammateRoutine` ativa; teste com Redis zerado |
| P3 | idem | erro OOM do Redis (`noeviction` cheio) → 503 `TEAMMATES_FILA_INDISPONIVEL`, igual a conexão recusada |
| P4 | idem | `removeOnComplete`/`removeOnFail` com teto fixo |
| P5 | `server/src/app.ts` `/health` | Redis informativo, fora do `allOk` |
| P6 | idem + `ADR-OBSERVABILIDADE.md` | alerta de Redis inalcançável por janela (decidir se entra no v1) |
| P7 | `.github/workflows/ci.yml` | serviço Redis (mesma linha 8.2) no job que roda `npm run test:integration`, como o BRIEF §5 já lista |
| P8 | idem (PR-4) | reconexão: Redis volta → rotas de teammates saem do 503 **sem reiniciar o server**; teste |
