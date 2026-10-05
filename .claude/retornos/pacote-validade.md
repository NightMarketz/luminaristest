# RETORNO — PACOTE-VALIDADE (BE-INCR-PACOTE-VALIDADE)

tarefa: executar o BRIEF (§3 + §5.2; §5.4 novo — lacunas) — código e testes; produção só após o PE-6
agente: sessão principal (sessao-feature), worktree be-incr-pacote-validade-c5934d; review por Agent isolado (general-purpose, model opus, worktree própria)
autorização: dono, 2026-10-03 — "Executa o BE-INCR-PACOTE-VALIDADE — código e testes; não vai a produção antes do PE-6" (registrada no `autorizacao` do nó, commit 5d4a92b0)
base: origin/main d6530790 (main andou 1 commit de docs depois — #476, sem conflito: `git merge-tree` limpo)
branch / PR: feat/be-incr-pacote-validade · NightMarketz/luminaristest#483 (aberto, NÃO mergeado — merge só com OK do dono)
modelo: opus-5.5
perfil-previsto: opus-medio
rodadas-de-review: 1 — PASS com ressalvas (5 achados: 2 médios, 3 baixos). Depois, a pedido do dono (03/10): achados 1 e 3 CORRIGIDOS; 2, 4 e 5 seguem abertos
custo: US$ 29.70 · claude-opus-5-5 US$ 29.70 · 459 min (scripts/session-cost.mjs; inclui o revisor como subagente)
veredicto: PASS com ressalvas (revisor independente) — aguardando o dono

### Lacunas de spec (registradas e perguntadas; o dono respondeu em 03/10 — BRIEF §5.4; o §5.3 é a triagem do PE-6, #506)
- L1 NFS-e do vencido cancelada → **reemite** (letra do §5.2; contra a recomendação)
- L2 reenvio de NFS-e do vencido rejeitada → remonta pelo vencimento
- L7 `xDescServ` → "Pacote <nome> — saldo não utilizado, vencido em <expiresOn>"
- L8 `cIndOp` → 030101

### Decisões de materialização (não são forks; declaradas para o review)
- Guarda 9.1 usa o mesmo predicado do passe de consumo, **sem** a marca d'água (a listagem marcada nunca veria um consumo 2 dias depois). O revisor confirmou.
- `prólogo IF NOT EXISTS` (§5.2 13a) não existe para `ADD COLUMN` no SQLite → 2 migrações de 1 statement cada (precedente 20261002120000).
- `AccountRole` ganhou o 10º papel `receita-nao-uso` (contrato do arquétipo no §4.3); `ROLE_ALLOWED_NATURES['receita-nao-uso'] = Revenue`.
- Pendência do vencimento usa `sourceId` = chave do movimento em todos os estágios (guarda, lançamento, nota); rescan de chave cujo prazo mudou resolve.
- Perfil fiscal ausente = emissão não aplicável (não pendência).

### Checks executados
- `cd server && npx tsc --noEmit` → 0
- `npm run test:unit` → 3583 passed, 3 skipped, 1 todo
- `npm run test:integration` → 797/799; as 2 falhas eram `BindingCompileService.eventCoverage` (o item 12 manda atualizar) — atualizado; re-rodado com o E2E: 14/14
- E2E `pacoteValidade.e2e.integration.test.ts` (SQLite real, 8 testes): item 17 inteiro (7000 em 3.4, 2.1.1 = 0, nota = 3.4), sem CPF, VENDA, TOCTOU, guardas 9.1/9.2, 2ª rodada no-op, item 4 HTTP 400 sem escrita, item 5, item 16
- `cd my-app && npx tsc --noEmit` → 0; `npm run test:types` → 0
- `node scripts/smoke-migration-gate.mjs --db <dev.db real>` → OK (3 migrações na cópia, original intocado)
- `npm run docs:generate` → 227 paths (inalterado)
- Medido (§7): dev.db real tem 0 saldos vivos e 0 linhas de catálogo de pacote → o backfill não tocaria nada lá

### Gates de envio OPS-001
- Caso adversarial tentado: o E2E inicial passou com uma divergência que EU plantei (débito sem liquidação na unidade B); o tie-out acusou 2 em vez de 1 — corrigi o cenário para o fluxo real (receita + liquidação + débito re-dirigido).
- Checagem que teria falhado se errado: sem a guarda 9.1/9.2 os saldos de F/G vão a 0 (E2E assere 2000/3000 e zero movimentos); sem a regra DRE 3.4 o teste da DRE dá 7000 em vez de 14000; sem a 3.4 fora do Presumido o teste da ECF não reprova.
- Risco principal: achado 1 do review (nota do vencido pode ancorar na venda errada após recompra) e PE-1..PE-6 abertos.

### Achados do review independente
1. **Média — CORRIGIDO** — `getExpiryContext` escolhe o crédito mais novo no momento da emissão; se a nota ficou pendente e o cliente recompra, a nota sai com `saleId` da venda nova (`PackageBalanceService.ts:228-233`). Correção: só créditos com `createdAt ≤ movimento.createdAt` (`PackageBalanceService.getExpiryContext`).
2. **Média** — `emissaoForaDoMes = BLOQUEAR` + carência de +2 faz parte das notas ficar pendente para sempre (competência no último dia do mês, job no dia 1). Lacuna de spec.
3. **Baixa/média — CORRIGIDO** — dois vencimentos com a mesma `expiresOn` no mesmo saldo colidem na chave do movimento → P2002 vira "idempotente" e o saldo fica > 0 sem pendência. Reproduzido no E2E (saldo travado em 500). Correção: a 2ª ocorrência na mesma data ganha sufixo (`expiry:<balanceId>:<expiresOn>:2`), escolhido DENTRO da tx; a 1ª ocorrência mantém a forma do BRIEF §3 item 6. O passe usa a próxima chave livre como identidade de pendência enquanto as guardas bloqueiam (`nextExpiryMovementKey`).
4. **Baixa** — guarda 9.2 não vê venda de origem soft-deletada. Lacuna (BRIEF fala só de Cancelled/Returned).
5. **Baixa** — guarda 9.1 pode bloquear para sempre com código "transitório" (débito impossível); o teste E2E de F não discrimina a escolha sem marca d'água.

### Fora de escopo (registrado)
- `ListPackageBalancesQuerySchema` segue sem `.strict()` (BRIEF §8).
- O item 18 cita o snapshot de shape para `ArchetypeKeySchema` e a query de package-balances, mas o `dtoShapeSnapshot` só lê `features/accounting/dtos` — cobri o enum com teste exato em `AccountingBindingDto.test.ts`.
- 3 suítes de unit com SQLite real (`PostingRepository.concurrency/moneyOverflow`, `renameDataMigrationGuard`) falharam uma vez por colisão concorrente no Windows e passam isoladas — ambiente, fora do diff.

### Fold pós-merge (docs/plano/README.md)
id: PACOTE-VALIDADE · estado: done (após merge) · estado_detalhe: "03/10: executado em #483 (código + testes); produção só após PE-6; recompilar bindings Active por unidade" · prs: [483]

### Correção dos achados 1 e 3 (dono, 03/10: "corrige os achados 1 e 3 do review")
- Vermelho → verde no MESMO conjunto de testes: com o `PackageBalanceService` antigo os 2 testes E2E novos falham pelo motivo certo (âncora = recompra; saldo travado em 500 — `.claude` log local pv-red.log); com a correção, 10/10.
- Unit: 3587 passed. Integração completa: 801/801. E2E `pacoteValidade`: 10/10. `tsc` server: 0.
- Desvio declarado da letra do §3 item 6: a chave do movimento ganha sufixo `:n` só a partir da 2ª ocorrência na mesma data (a 1ª é idêntica ao BRIEF).

### GAP-MAP (dono, 03/10: "Documente os achados restantes para o gap map")
- Achados 2, 4 e 5 registrados em `docs/operating-manual/GAP-MAP.md` Nível 5, logo abaixo da linha do E-1: 2 e 4 [ABERTO], 5 [PARCIAL]; cada linha com o comando que prova o status.
- Merge de `origin/main` (bf48780f): conflito só em `server/src/lib/errors.ts` (os dois lados acrescentavam classes; mantidos ambos). O main estendeu o snapshot de shape a `accountingBinding` e `packages` — regenerado (AccountingBindingDto, CompileBindingDto, PackageBalanceDto + tipos do FE). E2E 10/10; unit 3713 verde no re-run (1 flaky de concorrência conhecido na 1ª rodada).

### 2º merge de `origin/main` (Auto-fix, 03/10)
- Conflito textual só em `docs/operating-manual/GAP-MAP.md` (Nível 4): a linha do OOM do `test:leaks` e a linha do #479 (`test-integration.db` com duas rodadas) entraram no mesmo ponto — mantidas as duas.
- O `main` trouxe `20261003120000_add_payment_accounts`, com o MESMO prefixo das minhas migrações; as minhas ordenavam ENTRE as do `main` (`add_f…` < `add_p…`), ou seja, fora de ordem num banco que já tivesse as do `main`. Como nenhuma das minhas foi aplicada em lugar nenhum, renomeadas para `20261003130000_add_fiscal_profile_pacote_ctribnac` e `20261003130100_add_fiscal_profile_pacote_cnbs` (depois de todas).
- Checks depois do merge: `tsc` server 0; `node scripts/plano-vault.mjs check` íntegro; `npm run docs:generate` 232 paths (o `openapi.json` regenerado entra, junta as duas edições de `docs.paths`); `smoke-migration-gate` sobre o `dev.db` real: 5 migrações na cópia, sem perda; unit 3743 passed + 1 falha no flaky de concorrência conhecido (`nextEntryNumber`, fora do diff).
- Integração completa: 829/835 — as 6 falhas são todas em `rekeyLegacyUnitCli.integration.test.ts` (`UNCLASSIFIED_MODEL: PaymentAccount`): o modelo do F5 (`PaymentAccount`, #484) não foi classificado na CLI do I1b. Herdado do `main`, que tem as MESMAS 6 falhas no CI (run de `f5181646`: 6 failed, 819 passed). Fora do escopo deste nó (regra 3: vizinhos F5 × I1b); não corrigido aqui.

### CI — OOM do `test:leaks` e NODE_OPTIONS (dono, 03/10)
- O passo "Assert no leaked handles" (`jest --detectOpenHandles --runInBand`, todas as suítes num processo) morreu por heap (~4 GB) em 2 de 3 runs do `500ec008` (run 37139821632 push + re-run; o 37139824079 pull_request passou). Os testes estavam verdes nas duas quedas (unit 3713, integração 813/813). Registrado no GAP-MAP Nível 4 a pedido do dono ("registra o OOM do test:leaks no gap map").
- Mitigação aplicada a pedido do dono ("aplica o NODE_OPTIONS no passo do test:leaks"): `env: NODE_OPTIONS: --max-old-space-size=8192` só nesse passo de `.github/workflows/ci.yml` (repo público → runner `ubuntu-latest` com 16 GB de RAM). A linha do GAP-MAP passa a [PARCIAL]: o teto subiu, mas o pico de heap no `main` e a retenção por `--detectOpenHandles` seguem sem medida.
- Prova de que resolveu: só o próximo run da CI deste PR (o push é o teste — não há como provar o teto de 8 GB localmente no Windows).

### 3º merge de `origin/main` (Auto-fix, 03/10) — `b840e6b3`
- Conflitos só no vault do plano:
  - `docs/plano/nos/PACOTE-VALIDADE.md`: o `main` (#498, "wip fold") já tinha dobrado o nó para `inflight` com `prs: ["#483"]`, mas com a autorização antiga ("sem 'executa'"). Resolução: `estado`/`estado_detalhe`/`prs` do `main` + a autorização "Executa…" de 03/10 deste lado (frontmatter e corpo).
  - `docs/plano/_INDEX.md`: base do `main` + `node scripts/plano-vault.mjs index`; `check` → íntegro.
- O merge trouxe o conserto do `main` (#493: `PaymentAccount` → REKEY no CLI do I1b) — as 6 falhas herdadas do `rekeyLegacyUnitCli.integration.test.ts` saem daqui.
- `ci.yml`: o `main` trocou o passo único do `test:leaks` por jest em shards com `--detectOpenHandles`; o merge automático pôs o `NODE_OPTIONS=--max-old-space-size=8192` no passo novo ("Run tests + assert no leaked handles"). A prova do OOM agora vem dos shards.
- Migrações: a nova do `main` (`20261003130000_add_accountant_assignments`) ordena ANTES das minhas (`add_a` < `add_f`) — ordem correta, sem renomear.
- Checks depois do merge: `tsc` server 0; `docs:generate` 236 paths (`openapi.json` regenerado entra no merge); unit 3858 passed + 1 falha no flaky de concorrência conhecido (`nextEntryNumber`, fora do diff); `pacoteValidade` + `rekeyLegacyUnitCli`: 18/18. Integração completa NÃO rodada localmente nesta rodada — fica para a CI do PR.

### Delta D1+D2 da triagem do PE-6 (dono, 04/10: "Autorizo o delta D1+D2 no #483 (executa)")
- Spec: `D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO` §Delta + BRIEF §5.3 (PR #506).
- **D1 (F-JUR-2, F-PV-3 volta a a):** removidos `jobs/packageValidityBackfill.job.ts` + teste, a chamada no boot (`server.ts`) e `listBackfillCandidates`/`setExpiresAtIfNull` (repo + interface; únicos chamadores eram o job). O teste "saldo `null` com saldo > 0 continua `null`" já existia (`PackageBalanceService.test.ts:126`). O merge não grava mais nada no 1º boot.
- **D2 (F-JUR-6):** `lastValidDay` prorroga o último dia que cair em feriado nacional até o próximo dia que não é feriado nem domingo (CC 132 § 1º). Lista transcrita do Planalto em 04/10: Lei 662/1949 art. 1º (red. Lei 10.607/2002), Lei 6.802/1980 (12/10), Lei 14.759/2023 (20/11, ≥ 2024). Sexta-feira da Paixão fora (Lei 9.093/1995 art. 2º, municipal). **Lacuna de spec aberta e decidida no meio:** Código Eleitoral art. 380 + CF arts. 28/29/77 → domingos de eleição (1º e último de outubro, anos pares); dono escolheu **os dois turnos**, contra a recomendação (só o 1º). Estaduais/municipais fora (`ponytail:`).
- Checks: `tsc` server 0; unit de `packages`/`jobs`/`sync` verdes; `npm run test:integration` 856/856 (104 suítes, em série). Unit completa NÃO rodada localmente — fica para a CI. Branch atrás do `main` (#504), não trazido (sessão de integração).

### 4º merge de `main` (Auto-fix, 04/10) — `fa9a27f5`
- Sobre o commit do delta D1+D2 (`071bda48`, outra sessão). Conflitos só em documentação:
  - BRIEF: os dois lados criaram um "§5.3". A emenda da triagem do PE-6 (#506) ficou §5.3 (a nota do nó e este retorno já a citam por esse número); as lacunas L1/L2/L7/L8 desta execução viraram **§5.4**, e as referências acima foram ajustadas.
  - Nota do nó: tudo do `main` + a autorização "Executa…" de 03/10; `_INDEX.md` regenerado, vault íntegro.
- Checks: `tsc` 0; `docs:generate` 239 paths; unit 3865 passed + 1 flaky de concorrência conhecido; `pacoteValidade` + `rekeyLegacyUnitCli` 24/24.

### #483 mergeado (05/10 02:09, head `1a6342dc`, merge `2d1ddbe5`) e follow-up #512
- O review independente do delta D1+D2 deu FAIL só por um teste dependente de data (pedido do dono, repassado pela sessão "GOV BRIEFs e merges múltiplos"): o e2e somava 30 dias corridos para o vencimento esperado; com o D2 (feriado nacional / domingo de eleição prorrogam) divergia do `lastValidDay` quando hoje+20/+30 caía num desses dias — 19 datas nos próximos 365 dias, a 1ª em 05/10/2026 (25/10 = 2º turno).
- Como o #483 já estava mergeado, a correção saiu em PR novo: **NightMarketz/luminaristest#512** (`fix/e2e-pacote-validade-feriado`, base `main`, NÃO mergeado). Só teste, código de aplicação intocado:
  - esperado derivado de `lastValidDay`: vencimento da unidade A, mês de competência da unidade B, as duas consultas `expiresOnOrBefore` do item 16;
  - `validity.test.ts`: renomeado o caso "feriados encadeados: 20/11 sobre 21/11" (não testa encadeamento — 20/11/2026 é sexta → sábado).
- Prova (hook temporário só no `Date`, timers reais, não commitado): versão anterior com `Date` = 05/10/2026 → 6 falhas (`Expected "2026-10-25" / Received "2026-10-26"`); versão nova com 05/10, 13/10, 26/10/2026 e hoje → 10/10; 05/10 re-provado sobre o `main` atual. `tsc` 0; unit `validity` verde.
- Incidente: o 1º push recriou `feat/be-incr-pacote-validade` (apagada no merge) só com esse commit sobre base antiga; a branch remota foi apagada de novo — o commit vive no #512.
