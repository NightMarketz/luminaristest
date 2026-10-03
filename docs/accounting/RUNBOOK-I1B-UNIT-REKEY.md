# RUNBOOK: I1b — Re-key do `unitId` legado no `dev.db` real

> **EM BRANCO — preparado pelo agente (sessao-feature, 2026-10-03), não executado.** Formato:
> `docs/operating-manual/RUNBOOK-FORMAT.md`. O agente **não** preenche EVIDÊNCIA, **não** marca desfecho e **não**
> assina — runbook sem assinatura de executor humano é nulo (ADR-INCR-UNIT-REKEY §4 comportamento 16).

Executor: ____________________ (humano)           Data: ____________

Autorização: execução do CLI contra o `dev.db` real **ainda não autorizada** — o "executa" de 2026-10-03 cobre só o
CLI e os testes (nota `docs/plano/nos/I1b.md`, campo `autorizacao`). Preencher com a decisão do dono que pedir esta
execução (doc + data): ____________________

Spec: `docs/adr/ADR-INCR-UNIT-REKEY-migration.md` §4 (itens 15–18), §6 (F-RK-1..12 fechados em 02/10).

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código em `main` com `server/src/jobs/rekeyLegacyUnitCli.ts` e `scripts/rekey-legacy-unit.mjs` (PR do I1b mergeado) | `git log origin/main --oneline -1`; `ls scripts/rekey-legacy-unit.mjs` | [ ] |
| P2 | `node scripts/rekey-legacy-unit.mjs --self-check` verde no mesmo checkout | última linha `[self-check] OK` | [ ] |
| P3 | `server/.env` → `DATABASE_URL` aponta para o `dev.db` real (`server/prisma/prisma/dev.db` — o `server/prisma/dev.db` é isca de 0 byte) | o `alvo:` impresso no passo 2 | [ ] |
| P4 | Nenhuma migração pendente (o CLI recusa com `SCHEMA_PENDING_MIGRATIONS`) | `cd server && npx prisma migrate status` | [ ] |
| P5 | I6 **não** mergeado ainda (F-RK-12 a: I1b executado antes do I6) | `git log origin/main --oneline \| grep -i I6` vazio | [ ] |
| P6 | Python 3 no PATH (só se for usar a impressão digital do RUNBOOK-B4) | `python --version` | [ ] |

## Regras fixas desta execução (forks ratificados — não rediscutir aqui)

- **Uma unidade por `--apply`** (F-RK-1 a); `--name` obrigatório, escolhido pelo humano (F-RK-9 a).
- **Não aplicar** `unit-incr6-val` nem `unit-incr6-val-1782938879534` (F-RK-3 b): ficam órfãos documentados no Registro.
- `seed-unit-presumido` / `seed-unit-real` aparecem como `EXCLUDED_TENANT` e o CLI recusa (F-RK-2 a) — não insistir.
- `SKIP_REAL_UNIT` (ex.: a `Matriz` do admin) não se aplica — já é linha de `units`.
- Medição de 26/09 (ADR §2.2): com as três regras acima, **o conjunto a aplicar pode ser vazio**. Quem decide é o
  `--plan` do dia (passo 2), não a medição antiga.

## Passos

1. **Servidor PARADO** (F-RK-10 a). Encerrar o processo do backend (e qualquer job/scheduler in-process).
   Resultado esperado: nada escutando na porta do backend; nenhum processo `node` do server.
   EVIDÊNCIA: [colar saída de `netstat -ano | findstr :<PORT>` (vazia) ou equivalente]

2. **Plano (só leitura).** `node scripts/rekey-legacy-unit.mjs --plan`
   Resultado esperado: 1ª linha `alvo: <...>\server\prisma\prisma\dev.db`; JSON `rows` com status por par
   `(ownerUserId, unitId)` e contagem por tabela. Exit 0.
   EVIDÊNCIA: [colar a saída inteira]

3. **Lista de aplicação** — derivada do passo 2: todo `LEGACY` **exceto** os dois `unit-incr6-val*`. Para cada um,
   o humano escolhe `--name` (e `--type` opcional: `Own` | `Franchise` | `Department`).
   Resultado esperado: tabela `ownerUserId | from | --name | --type`, ou "vazia".
   EVIDÊNCIA: [colar a tabela]

4. **Backup fresco** (procedimento provado no RUNBOOK-B4, 24/09): `cd server && npm run db:backup`
   Resultado esperado: `OK: backup íntegro em <path>.` com `integrity_check: ok`.
   EVIDÊNCIA: [colar a saída; anotar o `<path>`]

5. **(Opcional, recomendado) Ensaio sobre cópia.** Copiar o backup do passo 4 para um path fora do repo; trocar
   `DATABASE_URL` do `server/.env` para esse path absoluto; repetir os passos 6–7 contra a cópia; **reverter o `.env`**.
   Resultado esperado: mesmos resultados dos passos 6–7, com `alvo:` = a cópia.
   EVIDÊNCIA: [colar `alvo:` + saídas, e a linha `DATABASE_URL` restaurada]

6. **Aplicar, uma unidade por vez** (para cada linha do passo 3; **um backup novo do passo 4 antes de cada uma** — o
   CLI recusa backup anterior ao último `updatedAt` com `BACKUP_STALE`):
   `node scripts/rekey-legacy-unit.mjs --apply --owner-user-id <id> --from <legado> --name "<nome>" [--type <tipo>] --backup-path <path do passo 4>`
   Resultado esperado: `alvo:` = dev.db real; aviso de servidor parado; linha JSON `{"event":"unit_rekeyed",...,"to":"<cuid>","tables":{...},"auditAnchor":{...}}`; exit 0.
   **Mapa legado → novo (BRIEF item 10) é esta linha JSON colada aqui.** Exit ≠ 0 → nada foi commitado (tx única):
   parar, desfecho FALHOU.
   EVIDÊNCIA: [colar cada saída]

7. **Verificação dirigida** (F-RK-11 a, substitui o S6):
   `node scripts/rekey-legacy-unit.mjs --verify --against <backup do passo 4 do PRIMEIRO --apply>`
   Resultado esperado: `"ok": true`, `"failures": []`, `rekeyed` lista as unidades do passo 6,
   `integrity_check: ok`, `foreign_key_check: 0`, `s8_unbalanced_entries: 0`.
   EVIDÊNCIA: [colar a saída]

8. **`smoke:migration` como integridade** (0 migrações pendentes — prova só integridade, não o re-key):
   `cd server && npm run smoke:migration`
   Resultado esperado: verde, 0 migrações aplicadas.
   EVIDÊNCIA: [colar a saída]

9. **Idempotência.** Repetir o `--apply` de UMA unidade do passo 6 (com backup novo).
   Resultado esperado: `{"status":"NOTHING_TO_DO",...}`, exit 0.
   EVIDÊNCIA: [colar a saída]

10. **Restart e boot.** Subir o backend (build de produção). O boot relê `accounting_bindings` — a linha `Active`
    agora sob o `unitId` novo, se o legado tinha binding.
    Resultado esperado: boot sem `Boot ABORTADO`; `GET /api/accounting/accounts?unitId=<novo>` responde 200 com as contas re-chaveadas.
    EVIDÊNCIA: [colar log de boot + resposta]

## Desfecho (marcar UM)

[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha. Rollback: restaurar o backup do passo 4 (procedimento RUNBOOK-B4).
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro

- Órfãos documentados (F-RK-3 b): `unit-incr6-val`, `unit-incr6-val-1782938879534` — contagens do passo 2: ____________
- Excluídos (F-RK-2 a): `seed-unit-presumido`, `seed-unit-real` — contagens do passo 2: ____________
- Achados no caminho (fora do escopo deste runbook): ____________
- Atualização do artefato de rastreio: `docs/plano/nos/I1b.md` (estado/estado_detalhe) com o desfecho + data: ____________
- Assinatura do executor: ____________
