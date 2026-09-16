# BRIEF — SEED-MY (seed multi-exercício do `dev.db`: 2025 + 2026)

> **Estado: BRIEF pronto; execução (`job-generator`) BLOQUEADA por gate humano.** `PROXIMOS-PASSOS-2026-09-14.md`
> passo 6: *"Pré-condição do #318: B-4 assinado pelo dono — se não estiver, deixe o BRIEF pronto e pare aqui."*
> Verificado em `origin/main` (2026-09-14): `RUNBOOK-B4-RESTORE-REHEARSAL.md` §Desfecho com os 3 `[ ]` em
> branco e *"Assinatura do executor: ____"*. **Parado aqui.** ✅ 2 forks RATIFICADOS 2026-09-16 (dono, via `AskUserQuestion`;
> registro em `CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`): F-SEED-2 → (a) · F-SEED-3 → (b), ambos na
> recomendação — **bloqueio por B-4 permanece**.

---

## Contexto fixo (não rediscutir)

- **Item:** SEED-MY — `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` l.44: *"✅ entra na fila —
  `job-generator` → seed fixture multi-exercício (2025 + 2026: períodos, lançamentos, AP/AR, chart com
  `1.1.6/3.3/4.2`). Materializa a decisão de 12/09 (`RUNBOOK-H1-PVA.md` §DECISÃO DO DONO). Até existir, H1
  roda como (ii)"*.
- **Autorização:** `RUNBOOK-H1-PVA.md` l.483 — decisão do dono (2026-09-12, questionário): *"o dev.db é só
  seed de testes, só popular a seed com dados para vários anos"* + cédula 14/09 (fila). Sessão de
  planejamento autorizada por `PROXIMOS-PASSOS-2026-09-14.md` passo 6.
- **Insumos existentes (lidos):**
  - `server/prisma/seed.ts` — hoje semeia **só o admin** (`upsert` por e-mail; **reescreve a senha** a cada
    `db:seed` — memória `parked-unmerged-worktrees`), nada de tenant/contabilidade.
  - `server/scripts/seed-test-data.js` — seed de KPIs sobre DynamicTables com **IDs de tabela
    hardcoded** (`T = { sales: 'cmqaecoxj…' }`) — não reusável para contabilidade.
  - `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts` — **19 contas**, e **já tem**
    `1.1.6 Estoques` (l.41), `3.3 Receita de Revenda de Mercadorias` (l.68), `4.2 Custo das Mercadorias
    Vendidas` (l.76), todas `acceptsEntries: true` (desde INCR-INVENTORY; `ESTOQUES_CODE`/`CMV_CODE` exportados).
    O "chart de 13 contas sem as três" do `RUNBOOK-H1-PVA.md` l.403 é o **chart real do `dev.db`**, não o
    fixture — e o l.423 manda criar as três "com os mesmos códigos/nomes/naturezas do fixture".
  - `PeriodService.seedYear(scope, year)` (`:33`) — cria os 12 períodos do ano; `softClosePeriod`
    (`:73`), `hardClosePeriod`, `reopenPeriod` (`:137`, `HARD_CLOSED` terminal).
  - `PostingService.postEntry` (`:286`, gate de período OPEN) — único caminho de escrita no razão;
    `PayableService.createPayable` / `ReceivableService` (AP/AR) com liquidação parcial (#245/#309).
  - `scripts/activate-salon-binding.mjs` (raiz do repo; P0.2b) — ativa o binding do salão; ADR-INCR-BINDING-FEEDER
    §7 **proíbe seed direto de binding** (só por CLI de ativação).
  - `RUNBOOK-H1-PVA.md` l.401/406 — `ECF_COD_VER_BY_YEAR = { 2025: '0012' }` (só 2025 gera ECF Real);
    todo o razão do `dev.db` é 2026; **nada em 2025**; P7 "dezembro OPEN" não existe em 2025.
  - `RUNBOOK-B4-RESTORE-REHEARSAL.md` (#318) — backup/restauração ensaiada por SQL; **não assinado**.
- **Nós vizinhos:** consome chart/períodos/posting/AP/AR ✅, binding via CLI ✅. Consumido por
  RUNBOOK-H1 (P0 passa a apontar o seed), H2, H3 (P2 clínica — F-P2-2 → a "tenant-fixture interno").

## 1. O que o nó é

Um **comando idempotente** `npm run db:seed:accounting -- --years 2025,2026 [--tenant salon|clinic]` que
popula um tenant-fixture com: o `ChartOfAccountsFixture` inteiro (19 contas, já com `1.1.6/3.3/4.2`), 12 períodos por ano, lançamentos
por mês em todas as contas de resultado, AP/AR com títulos abertos/parciais/liquidados, **exercício 2025
fechado** (`HARD_CLOSED` até dezembro) e **2026 aberto até o mês corrente** — pelos **serviços** (nunca
`prisma.*` direto no razão), para que todo invariante (débito=crédito, período, numeração, auditoria)
seja o mesmo da operação real. **Não é:** dado "real" (F-P2-2 a), seed de binding (proibido), nem
migração.

## 2. Checklist de comportamentos

1. **Comando versionado** `server/src/jobs/seedAccountingFixtureCli.ts` + script `db:seed:accounting`
   (padrão `activateAccountingBindingCli.ts`, `runCli` sem `process.exit`, testável). Recusa rodar se
   `NODE_ENV=production` ou se `DATABASE_URL` não for `file:` — `runCli` devolve **exit 1** com erro nomeado
   (padrão `activateAccountingBindingCli.ts`; CLI não fala HTTP), nunca "seguir".
2. **Idempotência por marcador**: tenant-fixture identificado por `username='seed-accounting'`;
   2ª execução com os mesmos anos **não duplica** (verifica `journal_entries` por `sourceType='seed'`
   + `sourceId=<ano-mês-seq>`; `findBySource` já existe) — teste assere a **2ª** chamada.
3. **Chart completo**: instala o `ChartOfAccountsFixture` **como está** (19 contas — `1.1.6/3.3/4.2` já
   presentes, RUNBOOK-H1 P0.2b l.423 pede exatamente esses códigos/nomes/naturezas); tenant `clinic` (H3)
   usa o mesmo fixture (F-P2-8a: nenhuma conta nova por papel). Sem fork.
4. **Períodos**: `seedYear` para cada ano; 2025 → `softClose` + `hardClose` de 01..12 **depois** dos
   lançamentos; 2026 → OPEN até o mês corrente (`scopeToday`, classe `teste-de-hoje-quebra-em-janela-utc`).
5. **Lançamentos**: por mês, `postEntry` com `sourceType:'seed'`: receita de serviço (3.1 × 1.1.3/1.1.1),
   receita de revenda (3.3 × 1.1.4) com CMV (4.2 × 1.1.6), despesas (4.x × 1.1.1), pacotes pré-pagos
   (2.1.1). Valores determinísticos por semente (`--seed`), em centavos, dentro de `MAX_CENTS`.
6. **AP/AR**: por mês, 2 payables (1 liquidado, 1 parcial) e 2 receivables (1 recebido, 1 aberto) pelos
   serviços — cobre o Aging (#248) e a liquidação parcial (#245).
7. **Binding**: o seed **não** ativa binding; imprime o comando `activate-salon-binding.mjs` a rodar em
   seguida (ordem chart → binding → boot, ADR-FEEDER §8).
8. **Tie-out ao final**: balancete de dezembro/2025 fecha (Σ débitos = Σ créditos; ativo = passivo +
   PL + resultado) — o comando imprime e **sai 1** se não fechar (é o teste do seed).
9. **Backup antes de escrever** (F-SEED-2): o comando exige `--i-have-a-backup` ou roda
   `npm run db:backup` primeiro — o P2 dos runbooks continua obrigatório.
10. **Runbooks**: `RUNBOOK-H1-PVA.md` P0 e `RUNBOOK-H2` ganham *"alvo = seed multi-exercício
    (`db:seed:accounting`)"* — docs, no PR do seed.
11. **Gates**: `tsc` · unit do CLI (parse/recusas) · integração (seed sobre `test-integration.db` +
    tie-out) · sem rota/DTO/migração → snapshot, `docs:generate`, `smoke:migration` **não** acendem.

## 3. Forks — RATIFICAÇÃO PENDENTE

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-SEED-2** | Proteção do dado | (a) exige `--i-have-a-backup` (o humano roda B-4/`db:backup`) · (b) o comando chama `db:backup` sozinho · (c) sem proteção (é "só seed") | **(a)** — B-4 é gate humano; automatizar o backup dentro do seed esconde o gate. (c) contradiz o P2 dos runbooks |
| **F-SEED-3** | Regime do tenant-fixture | (a) um tenant Presumido 2025 + 2026 (H1 2ª passada é Real → precisa de M/N) · (b) dois tenants: `seed-presumido` e `seed-real` · (c) um tenant Real nos dois anos | **(b)** — H1 2ª passada é Lucro Real (regime-alvo ratificado 02/09) e a ECF Presumido já foi validada; um tenant por regime evita "trocar regime" (IN 2004 art. 7º §2º proíbe na retificadora) |

## 4. Pendente / insumos ausentes

1. **B-4 assinado** — gate humano; sem ele nada escreve no `dev.db`. Agente não preenche nem assina.
2. `activate-salon-binding.mjs` é do salão; o tenant `clinic` (H3) usa `CLINIC_BINDING_V1` via
   `activateAccountingBindingCli.ts` — confirmar na feature qual CLI serve cada tenant.

## 5. Achados fora de escopo

1. `seed.ts` reescreve a senha do admin a cada `db:seed` (memória) — não tocar aqui.
2. `seed-test-data.js` com IDs hardcoded é morto para outro banco — candidato a remoção, autorização própria.
