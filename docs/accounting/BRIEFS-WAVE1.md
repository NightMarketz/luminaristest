# BRIEFS — Wave 1 (pré-dados-reais)

> **Nota do registrador (2026-08-31):** registro histórico congelado — este é o BRIEF tal como
> existia no momento da execução (2026-08-30); status de fork, "pendente"s e achados aqui **podem
> estar desatualizados**. Os desfechos reais (o que de fato foi mergeado, o que ficou em andamento,
> o que foi diferido) estão em
> [`PRE-DADOS-REAIS-2026-08-30.md`](./PRE-DADOS-REAIS-2026-08-30.md).

> Sessão de PLANEJAMENTO (S0-PLAN). Autorização: "Pode disparar" (dono, 2026-08-30), ratificando a
> Wave 1 do plano pré-dados-reais. Repo lido em
> `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/financial-accounting-tax-next-steps-49b2fa`
> (= main `41884c8a`). Nenhum código foi escrito; nenhum fork foi ratificado aqui — cada um listado
> abaixo é decisão do dono, não desta sessão.

---

## BRIEF-W1-A — chamador HTTP para `verifyAuditChain` (item A-2)

**Objetivo:** expor `AuditService.verifyAuditChain(scope)` (hoje sem nenhum caller de produção) via
`GET /api/accounting/audit/verify-chain`, seguindo a cadeia Route→Controller→Service→Repository e o
padrão de gate-de-policy-dentro-do-service já usado por todo o resto do módulo.

### Achado que muda o desenho (leia antes de implementar)

`AuditService` hoje **não recebe `IAccountingPolicy`** — construtor é só
`(auditRepo: IAuditRepository, postingRepo: IPostingRepository)`
(`server/src/features/accounting/services/AuditService.ts:41-44`). Todo outro service de leitura do
módulo (`AccountingReportService`, `PeriodService`, `PostingService`, `DocumentAttachmentService`…)
gateia com `if (!this.policy.canRead(scope)) throw new ForbiddenError(...)` **dentro do service**, nunca
no controller/factory — confirmado por grep (`canRead(` aparece só dentro de services, nunca em
controllers). Para expor uma rota read-only consistente com o resto do módulo, `AuditService` precisa
ganhar essa 3ª dependência.

Também não existe getter público `getAuditService()` no factory — a instância de `AuditService`
construída em `server/src/lib/factory.ts:482-485` é um `const` local usado só para injetar em outros
services (`postingService`, `entryApprovalService`, …), nunca guardada em `this.services`.

### Checklist

1. `AuditService` (`server/src/features/accounting/services/AuditService.ts`): adicionar 3º parâmetro
   `private readonly policy: IAccountingPolicy` ao construtor (import `type { IAccountingPolicy } from
   '../policies/IAccountingPolicy'`, `import { ForbiddenError } from '../../../lib/errors'` — mesmo
   padrão de `PeriodService.ts:1,5`). No topo de `verifyAuditChain`: `if (!this.policy.canRead(scope))
   throw new ForbiddenError('Você não tem permissão para ler a trilha de auditoria.');`.
2. Atualizar os 2 call-sites do construtor:
   - `server/src/lib/factory.ts:253` (`buildAccountingBindingAuditPort`) — passar
     `this.policies.accounting` (a função já recebe `postingRepo`; adicionar o mesmo `this.policies.accounting`
     usado nas demais construções da função factory, ex. linha 491).
   - `server/src/lib/factory.ts:482-485` (build principal) — mesmo `this.policies.accounting`.
3. Guardar a instância: adicionar `audit: auditService` ao objeto `this.services = { ... }`
   (`server/src/lib/factory.ts:577+`, ao lado de `posting: postingService`) e expor
   `public getAuditService = (): AuditService => this.services.audit;` ao lado de
   `getPostingService`/`getTieOutDiagnosticService` (`server/src/lib/factory.ts:851,877`).
4. DTO de query (novo arquivo `server/src/features/accounting/dtos/AuditDto.ts`, espelhando
   `CounterpartyScopeQuerySchema` de `CounterpartyDto.ts:66-68` — só `unitId`, sem `.strict()` extra
   porque é uma query de 1 campo):
   ```ts
   export const VerifyAuditChainQuerySchema = z.object({ unitId: z.string().min(1) });
   export type VerifyAuditChainQueryInput = z.infer<typeof VerifyAuditChainQuerySchema>;
   ```
   Com bloco `@openapi components.schemas.VerifyAuditChainQuery` no mesmo padrão do arquivo.
5. Controller — novo export `getVerifyAuditChain` em `server/src/controllers/accountingController.ts`,
   mesmo esqueleto de `getTieOutDiagnostic` (linha 433): `getUserContextFromRequest` → 401 se ausente →
   `safeParse` do DTO → 400 se inválido → `resolveAccountingScope(user, parsed.data.unitId)` →
   `getFactory().getAuditService().verifyAuditChain(scope)` → `res.json({ success: true, data })` →
   `catch` → `handleApiError`.
6. Rota — `server/src/routes/accounting.ts`: import `getVerifyAuditChain` no bloco de imports de
   `accountingController` (linha ~1-24) e `router.get('/audit/verify-chain', getVerifyAuditChain);`
   perto dos outros `GET` de relatório (linhas 84-92, junto de `/reports/tie-out`).
7. Doc OpenAPI — bloco `@openapi` novo em `server/src/routes/docs.paths.ts`, path
   `/api/accounting/audit/verify-chain`, `get`, `tags: [Accounting]`, `security: bearerAuth`, parâmetro
   `unitId` query obrigatório, resposta 200 com o shape de `VerifyResult` (`ok`, `checkedEvents`,
   `firstSeq`, `lastSeq`, `headHash`, `failure?{seq,reason}` — tipos de
   `AuditService.ts:22-29`; **`bigint` não serializa em JSON puro** — o controller precisa decidir
   serializar `firstSeq`/`lastSeq`/`failure.seq` como `string` antes do `res.json`, senão
   `JSON.stringify` lança `TypeError` em runtime; documentar os campos como `string` no schema, não
   `integer`), 400/401/500 iguais aos outros.
8. **Regenerar o artefato estático + subir o guard**: `cd server && npm run docs:generate` (reescreve
   `public/openapi.json`); depois `server/src/__tests__/openapi-paths.test.ts:39` — `BASELINE = 142` →
   subir para `143` (rota nova soma 1 path), com comentário de linha explicando o incremento (mesmo
   estilo das linhas 20-38 do próprio teste).
9. Teste de integração novo — `server/src/controllers/__tests__/accountingController.audit.integration.test.ts`
   (padrão dos outros `*.integration.test.ts` da pasta): caso feliz (cadeia íntegra criada via `postEntry`
   real → `GET /audit/verify-chain` devolve `ok:true`) e caso adverso (adulterar diretamente no banco de
   teste o campo `hash` de um `AuditEvent` existente via `prisma.auditEvent.update` → a rota devolve
   `ok:false` com `failure.reason === 'HASH_MISMATCH'` e o `failure.seq` correto). Cobrir também 401
   (sem token) e 400 (`unitId` ausente).

### Gate de saída

`cd server && npx tsc --noEmit` limpo; `npm run test:integration` (o novo arquivo, `--runInBand`) verde;
`node scripts/skill-audit/skill-audit.mjs` não se aplica (nenhuma skill tocada); `openapi-paths.test.ts`
verde com o `BASELINE` novo; `npm run docs:generate` rodado e `public/openapi.json` commitado junto.

### Forks pendentes

- **F-A1** — `AuditService` deve exigir `IAccountingPolicy` como parâmetro **obrigatório** (quebra a
  assinatura para os 12 `it()` de `AuditService.test.ts` que hoje instanciam com 2 args — cada um
  precisa passar um `fakePolicy` novo), ou o parâmetro deveria ser opcional com fallback
  permissivo para não tocar o teste existente? A consistência com o resto do módulo pede obrigatório;
  isso é custo de refatoração aceito pela sessão de feature, mas quem decide "obrigatório vs opcional"
  é quem vai revisar o diff — deixo registrado, não decido por vocês.
- **F-A2** — serialização de `BigInt`: o projeto tem algum serializador central (`res.json` custom,
  middleware) ou cada controller resolve na mão? Não achei um precedente de rota que devolva `BigInt`
  no payload atual — decisão de convenção (campo `string` vs `number` truncado) fica para quem
  implementa/revisa.

---

## BRIEF-W1-B — índice com `date` em `JournalEntry` (item D-1)

**Objetivo:** acrescentar `@@index([userId, unitId, date])` a `JournalEntry` via migração aditiva pura
(só `CREATE INDEX`), provada sobre cópia do `dev.db` real antes de ir para `main`.

### Checklist

1. `server/prisma/schema.prisma` — model `JournalEntry` (linhas 485-519): adicionar
   `@@index([userId, unitId, date])` junto das duas existentes (linhas 516-517):
   ```prisma
   @@index([userId, unitId, status])
   @@index([userId, unitId, fiscalYear])
   @@index([userId, unitId, date])
   ```
2. Migração nova em `server/prisma/migrations/` — pasta `<timestamp>_add_journal_entry_date_index`
   (timestamp posterior a `20260825120000`, a última existente — ex. `20260830120000`, formato
   `YYYYMMDDHHMMSS` igual às demais). Conteúdo — 1 única instrução, sem `IF NOT EXISTS` (nenhuma das
   13 migrações do repo usa essa cláusula; `CREATE INDEX` puro é o padrão observado, ex.
   `20260821090000_accounting_binding/migration.sql:28`):
   ```sql
   -- CreateIndex
   CREATE INDEX "journal_entries_userId_unitId_date_idx" ON "journal_entries"("userId", "unitId", "date");
   ```
   (nome da coluna física é `date`; tabela mapeada é `journal_entries` via `@@map`, linha 518).
   Sendo 1 única `CREATE INDEX` — sem `DROP TABLE`/rebuild — o risco de "não-transacional deixa a
   metade aplicada" (memória `migracao-sqlite-nao-e-transacional`) não se aplica aqui: essa migração
   não tem "metade". Registrar isso explicitamente no commit/PR para quem revisar não reabrir o medo à
   toa.
3. `npx prisma generate` local após a migração (client passa a refletir o índice — só para dev; CI
   roda `postinstall`).

### Gate de saída — smoke-migration-gate sobre CÓPIA do `dev.db` real

Protocolo espelhando `docs/accounting/SMOKE-MIGRATION-GATE-BE-INCR9.md` (mesmo formato de relatório
esperado ao final):

1. Rodar `cd server && npm run smoke:migration` (script `scripts/smoke-migration-gate.mjs`, já cobre
   S1–S8: hash do `dev.db` original intocado, `integrity_check`, `foreign_key_check`, nenhuma tabela
   perde linha, colunas antigas sobrevivem byte-a-byte, nenhum índice nomeado desaparece, partida
   dobrada Σdébito=Σcrédito). O banco alvo por default já é o populado —
   `server/prisma/prisma/dev.db` (o `server/prisma/dev.db` de fora é isca de 0 byte).
2. **Verificação adicional que o script genérico não faz sozinho** (ele prova que índices VELHOS não
   somem, não que o NOVO nasceu): sobre a mesma cópia temporária que o script usa (ou uma cópia
   equivalente feita à mão), `PRAGMA index_list('journal_entries')` deve listar
   `journal_entries_userId_unitId_date_idx`; conferir com
   `PRAGMA index_info('journal_entries_userId_unitId_date_idx')` que as colunas são
   `userId, unitId, date` na ordem certa.
3. Fingerprint antes/depois de `journal_entries` (mesma query-canônica do relatório INCR-9:
   `SELECT userId,unitId,sourceType,sourceId,fiscalYear,entryNumber,status FROM journal_entries ORDER
   BY id`, sha256) — deve bater byte-idêntico.
4. Registrar o resultado em `docs/accounting/SMOKE-MIGRATION-GATE-D1-JOURNAL-DATE-INDEX.md`, mesmo
   formato do INCR-9 (Objetivo / Banco alvo / Método / Evidência / Veredicto).

### Forks pendentes

- Nenhum. Escopo fechado: 1 linha de schema + 1 migração de 1 instrução + gate já scriptado. Não há
  campo que dependa de decisão do dono aqui.

---

## BRIEF-W1-C — rotina de backup + runbook de ensaio de restauração (item B-1/B-4)

**Objetivo:** script `npm run db:backup` que produz uma cópia atômica e íntegra do `dev.db` via SQLite
`VACUUM INTO`, e o runbook em branco do ensaio de restauração (humano preenche/assina).

### Checklist — B-1, script de backup

1. Novo `server/scripts/db-backup.mjs` (padrão de `server/scripts/read-error-log.mjs`: shebang
   `#!/usr/bin/env node`, parse de flags manual `--out-dir`/`--db`, sem dependência nova). Reusa o
   mesmo padrão de conexão do `scripts/smoke-migration-gate.mjs:79`
   (`new PrismaClient({ datasources: { db: { url } } })`, `require('generated/prisma')` via
   `createRequire`) — **não** precisa de `better-sqlite3`/`sqlite3` como dependência nova, o projeto já
   não tem nenhuma (`grep sqlite server/package.json` = 0 hits fora do `@prisma/client`).
2. Lógica: ler `DATABASE_URL` (default o mesmo padrão do resto do repo — `file:` prefix), resolver o
   path do arquivo fonte; timestampar o destino (`<destDir>/dev-<YYYYMMDDHHMMSS>.db`); rodar
   `VACUUM INTO '<destPath>'` via `$executeRawUnsafe` no client apontado para a fonte — **atenção**:
   `VACUUM INTO` não aceita parâmetro bindado em todo driver SQLite; o path precisa ser
   sql-escapado na mão (aspas simples dobradas) em vez de placeholder `?`, e o SQLite recusa se o
   arquivo de destino **já existir** — daí o timestamp precisa ter granularidade de segundo (já
   suficiente, um backup por segundo não é caso real).
3. Verificação pós-backup (P1 do checklist do dono): abrir a cópia com um 2º `PrismaClient` apontado
   pro destino, rodar `PRAGMA integrity_check` (deve ser `ok`, mesmo padrão de
   `smoke-migration-gate.mjs:153-155`) e contar linhas da tabela sentinela `journal_entries` — comparar
   contra a contagem lida da fonte ANTES do vacuum (mesma tabela usada como fingerprint no gate de
   migração, por consistência de convenção do repo).
4. `server/package.json` — novo script `"db:backup": "node ./scripts/db-backup.mjs"` ao lado de
   `smoke:migration` (linha 21).
5. Saída do script: path final do backup + resultado do integrity check + contagem sentinela, em
   stdout — exit 1 se `integrity_check !== 'ok'` ou se a contagem sentinela não bater.

### Checklist — B-4, runbook em branco

6. Novo `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md`, formato de
   `docs/operating-manual/RUNBOOK-FORMAT.md` (evidência colada, desfecho PASSOU/FALHOU/BLOQUEADO,
   assinatura humana) — espelhar a estrutura de `docs/accounting/RUNBOOK-H1-PVA.md` (cabeçalho
   "Preparado por agente em [data] contra [commit]. Em branco de propósito", tabela de pré-condições
   com coluna "Como verificar", passos com EVIDÊNCIA obrigatória).
   Passos do ensaio (agente preenche a AÇÃO e o "resultado esperado"; humano preenche EVIDÊNCIA):
   - P1: `npm run db:backup` sobre o `dev.db` real → path do backup gerado.
   - P2: restaurar — copiar o arquivo de backup para um path alternativo (`DATABASE_URL` apontando pra
     lá, ex. `file:./restored-<data>.db`).
   - P3: subir o server (`cd server && npm run build && npm start`, mesma ressalva de build de
     produção do `RUNBOOK-H1-PVA.md` — nunca `next dev`) com `DATABASE_URL` apontando pro restaurado.
   - P4: 2-3 leituras de conferência — balancete (`GET /api/accounting/trial-balance?unitId=…`) e uma
     tela de listagem (ex. `GET /api/accounting/entries?unitId=…`) — comparar contra a mesma leitura no
     banco original, devem bater.
   - Desfecho + registro no rastreio (linha do item B-4 no plano/master-map, quando existir; hoje o
     item veio do plano da tarefa, não achei entrada B-1/B-4 explícita no
     `ACCOUNTING-MASTER-MAP.md` — ver fork F-C2 abaixo).

### Gate de saída

Script: `cd server && npx tsc --noEmit` limpo (é `.mjs`, não passa por tsc — mas o resto do backend
sim); rodar `npm run db:backup` uma vez de fato contra o `dev.db` real (efeito colateral: cria 1 arquivo
de backup — apagar depois do teste manual) e confirmar que sai `integrity_check: ok` + contagem
sentinela batendo. Runbook: entregue em branco — **agente não preenche evidência nem assina**; gate de
saída da PARTE do runbook é "existe e segue o formato", não "foi executado".

### Forks pendentes

- **F-C1** — destino default dos backups: proponho `server/prisma/backups/` (dentro do repo, mas
  automaticamente coberto pelo `.gitignore` global `*.db`/`*.db.*` — não precisa de entrada nova no
  gitignore). **Isto é adequado só para dev/staging.** Em produção (VPS por cliente, ADR-M2 §2) o
  destino certo provavelmente é um path FORA do container/volume da app (outro disco, ou storage
  externo) — decisão que este BRIEF não crava porque depende do host concreto ainda não provisionado
  (`ADR-M2-deploy-topology.md` §7 item 1, explicitamente aberto). O script aceita `--out-dir` para não
  bloquear nisso, mas ONDE de fato os backups de produção vão morar é decisão do dono.
- **F-C2** — não achei os itens "B-1"/"B-4" citados como tal em `docs/accounting/ACCOUNTING-MASTER-MAP.md`
  nem em `docs/accounting/PROXIMOS-PASSOS-2026-08-28.md` (grep direto = 0). Presumi que são a
  numeração do plano-mãe desta Wave (fora do repo, no seu documento de trabalho) e escrevi o BRIEF
  pelo conteúdo pedido, não pela citação. Se master map tiver uma entrada correspondente a atualizar
  no fim do runbook, aponte-a — hoje não decidi qual linha do mapa este runbook fecha.

---

## BRIEF-W1-D — artefato de deploy aplica o schema (item B-3)

**Objetivo:** fechar a lacuna medida (nenhum artefato roda `prisma migrate deploy`; volume SQLite nasce
vazio) com o **job de migração como etapa separada do pipeline** — não com boot/entrypoint automático.

### ⚠️ Conflito com decisão já ratificada — lido antes de especificar

O prompt desta tarefa pede "entrypoint/command que roda `npx prisma migrate deploy` antes do boot do
server" (compose `command:` ou `entrypoint.sh`). **Isso contradiz uma decisão já `Accepted` do dono:**
`docs/adr/ADR-M2-deploy-topology.md` §2, decisão 4 (ratificada via `AskUserQuestion` em 2026-08-22,
citação literal do dono): *"Migração → etapa separada do pipeline de deploy, **nunca** passo manual
nem entrypoint que migra no boot"* — justificativa dele, também citada no ADR: *"ainda vai mudar muito
e a tabela só vai realmente estar pronta quando todos os módulos fixos estiverem completos"*. O próprio
ADR §7 item 3 já lista esse job como próximo passo, nomeado exatamente como "etapa separada", **não**
como entrypoint.

Este BRIEF segue a decisão 4 do ADR (mais recente e explicitamente ratificada), não a redação do
prompt — registrando aqui o porquê em vez de silenciosamente divergir. Se a intenção real for revisitar
a decisão 4, isso é uma nova pergunta ao dono, não algo que este BRIEF resolve sozinho.

### Achado que muda o escopo do B-3

O gap "`COPY dist ./dist` com `dist/` gitignorado" que o prompt pede para EXCLUIR do escopo **já não
existe** — medido: `server/Dockerfile` hoje é multi-stage (`builder` roda `npm run build` dentro da
imagem, `runner` copia `dist/`+`generated/`+`node_modules` do builder), commit `f869294e` ("feat(deploy,
accounting-fe): 5 frentes do replanejamento — artefatos de deploy…"). O `ADR-M2-deploy-topology.md`
§4.b ainda lista esse item como dívida aberta — **está desatualizado**; ver fork F-D2.

### Checklist

1. Novo script `scripts/deploy-migrate.mjs` na raiz (ao lado de `scripts/smoke-migration-gate.mjs`,
   mesmo padrão: standalone, chamado fora do processo da app). Faz **só** `npx prisma migrate deploy`
   contra `DATABASE_URL` do ambiente — sem lógica de smoke/verificação (isso já é o
   `smoke-migration-gate.mjs`, que roda ANTES, contra cópia). Script fino: existe para dar ao pipeline
   de deploy um alvo nomeado e auditável (`npm run deploy:migrate` chamado como job próprio antes do
   swap do container), não para reimplementar nada.
2. `server/package.json` — novo script `"deploy:migrate": "prisma migrate deploy"` (uma linha; não
   precisa do `.mjs` se for só isso — decisão de simplicidade: um script npm de 1 comando não precisa
   de wrapper Node. Ver fork F-D1 sobre qual dos dois formatos usar).
3. **Não tocar** `docker-compose.yml` nem `server/Dockerfile` para chamar migração no boot — isso é
   exatamente o que a decisão 4 do ADR proíbe. O compose continua subindo um container que espera
   schema JÁ aplicado por fora.
4. Documentar a ordem no próprio `docker-compose.yml` (comentário, não código executável) próximo ao
   serviço `server`: "schema aplicado por `npm run deploy:migrate` (ou `deploy-migrate.mjs`) ANTES do
   `docker compose up`/swap — nunca pelo container" — para quem operar o deploy não reintroduzir a
   tentação do entrypoint.
5. Emenda de 1-2 linhas em `docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md`: sob a pré-condição existente
   "O artefato de implantação NÃO sobe o schema" — trocar "O job em si ainda não existe em código" por
   algo como "O job existe: `npm run deploy:migrate` / `scripts/deploy-migrate.mjs`, chamado como etapa
   SEPARADA do pipeline antes do swap de container (decisão 4 do ADR-M2) — falta só o pipeline de CI/CD
   concreto que o dispare no host provisionado."
6. Emenda equivalente em `docs/adr/ADR-M2-deploy-topology.md` §4.b, última linha da tabela ("Nenhum job
   de migração declarado…") — marcar como resolvido nesta Wave, apontando pro script novo.

### Gate de saída

**Honesto, não fingido**: `prisma migrate deploy` real só é exercitável contra um banco de destino de
verdade (mesmo que seja uma cópia local) — isso o `smoke-migration-gate.mjs` já prova (é o mesmo
comando, `prisma migrate deploy`, rodando sobre a cópia). O script novo em si é fino o bastante (1
comando) para não ter lógica própria a testar. **O gate real deste item é o `RUNBOOK-M2-DEPLOY-SMOKE.md`
executado contra o host provisionado — que ainda não existe** (`ADR-M2-deploy-topology.md` §7 item 1,
explicitamente aberto, decisão do dono). Não declaro verde aqui o que só o M2 pode fechar.

### Forks pendentes

- **F-D1** — `deploy:migrate` como script npm de 1 linha (`prisma migrate deploy`) vs. um `.mjs`
  wrapper com log/timestamp (útil se o pipeline de CI precisar de saída estruturada). Proponho o
  1-liner por ser o mínimo que resolve "job nomeado e auditável"; decisão de quem for montar o pipeline
  de CI real.
- **F-D2** — o ADR-M2 §4.b cita `COPY dist ./dist` como dívida aberta; medi que já foi resolvido
  (Dockerfile multi-stage, commit `f869294e`). Isto não é fork de implementação — é uma correção de
  fato que precisa voltar pro ADR (mesma classe do "DIVERGÊNCIA da tarefa" que o próprio ADR já corrigiu
  uma vez em §3). Deixo registrado aqui em vez de editar o ADR eu mesmo (sessão de planejamento não
  edita ADR ratificado sem pedido explícito).
- **F-D3** — item 1 do ADR §7 ("provisionar o host concreto") e item 2 ("Qdrant gerenciado?") seguem
  abertos e são pré-condição para o `RUNBOOK-M2` rodar de verdade — nenhum dos dois é deste BRIEF, só
  registro que o "fechamento" deste item B-3 é parcial (o job existe; o pipeline que o chama, não).
