# RETORNO — F5 PR-1 (BE-INCR-PAYMENT-PROVIDER: cifra da credencial + PaymentAccount)

tarefa: implementar o PR-1 do BE-INCR-PAYMENT-PROVIDER (P1-1..P1-10, BRIEF §3/§4.1/§4.3/§4.5). PR-2 e PR-3 fora.
  Autorização citável: dono, chat, 2026-10-03 — "Executa o PR-1 do BE-INCR-PAYMENT-PROVIDER — só esta fatia"
  (registrada no `autorizacao` de `docs/plano/nos/F5.md`). Sessão: `sessao-feature`.
modelo: Claude Opus 5.5 (`claude-opus-5-5`) na sessão de execução; review independente por agente separado
  (Opus, worktree isolada, sem acesso ao transcript).
perfil-previsto: opus-medio (frontmatter da nota F5). Perfil real: opus-medio confere — 1 rodada de questionário
  (4 lacunas), 0 retrabalho de desenho, 1 patch pós-review.
custo: plano Max, sem cobrança por token. Medido no meio da sessão: janela de 5 h em 23%, semanal em 24%, contexto
  ~265k/1M. Review independente: ~164k tokens de subagente, 31 tool uses, ~8,7 min.
branch: `claude/be-incr-payment-provider-pr1-be10cc` (de `origin/main` `b5d6f2eb`) · PR
  https://github.com/NightMarketz/luminaristest/pull/484 · **NÃO mergeado** (merge só com o OK do dono).
veredito do review independente: **PASS COM RESSALVAS** (nada bloqueante).

## Checklist

| Item | Status | Evidência |
|---|---|---|
| P1-1 `lib/secretBox.ts` AES-256-GCM, `iv‖tag‖ct`, keyring do env | ✅ | `secretBox.test.ts` |
| P1-2 sem chave ⇒ 503 `payment_credential_key_missing`, sem efeito; o app sobe | ✅ | unit + integração (linha idêntica, 0 audit) |
| P1-3 model + migração `DROP TABLE IF EXISTS`; folha; imutável | ✅ | integração; `migrate diff` vazio; `smoke:migration` OK no dev.db real |
| P1-4 uma ACTIVE por (escopo, provedor), gate dentro da tx | ✅ | integração (PUT e PATCH ⇒ 409) |
| P1-5 discriminatedUnion; OAUTH declarado e recusado | ✅ | DTO + integração |
| P1-6 credencial só escrita; `credentialSetAt` + `accessTokenLast4` | ✅ | integração |
| P1-7 credencial fora de resposta, audit e log | ✅ | integração (captura do console provada) |
| P1-8 ciphertext copiado não decifra | ✅ | unit + integração |
| P1-9 CRUD em camadas, soft-delete, 2 toques | ✅ | integração |
| P1-10 audit com chaves fechadas | ✅ | integração (payload exato) |

## Lacunas de spec (todas ratificadas pelo dono em 03/10, por questionário)

1. `credentialExpiresAt`: o P1-6 cita a coluna, mas o §4.1 não a tem → **incluída**, sempre null.
2. Policy de leitura não especificada → GET = `canReadAccountingSettings`; escrita = `canManageAccountingSettings`.
3. Chaves de audit não especificadas e DELETE sem evento listado → só ids/status, sem `label`; DELETE sem evento.
4. Transições do PATCH e PUT em conta DISABLED → ao pé da letra (só ACTIVE↔DISABLED, o resto 409; PUT sempre ativa).

**Aberta (decisão do dono, não escolhi):** PATCH para o **mesmo** status (`ACTIVE` numa ACTIVE) responde 200 sem
efeito e sem evento. A decisão 4 não diz se isso entra no "resto ⇒ 409" (ressalva 3 do review).

## Ressalvas do review e o que foi feito

1. Concorrência do gate P1-4 sem teste de 2 PUTs simultâneos → **não feito**: no Windows o SQLite serializa, então
   um verde local não provaria nada (memória `windows-serializa-sqlite-ci-linux-nao`). Esperado em corrida: erro de lock,
   não duas ACTIVE (grau **inferido**).
2. Folha da conta contábil checada **fora** da tx → **corrigido** (patch pós-review): re-checagem dentro do
   `runTransaction` com `tx` (server/CLAUDE.md gate 5).
3. PATCH no mesmo status → aberto acima; teste de sucesso DISABLED→ACTIVE com `.updated` **acrescentado**.

## Gates

- `tsc --noEmit` server ✅ · my-app ✅ · `test:types` my-app ✅.
- Snapshot de DTO + `PaymentAccountDto.gen.ts` ✅ · openapi 227 → 230 paths, baseline subido ✅ · allowlist do audit ✅.
- `resetDb()` passou a limpar `payment_accounts` (a guarda derivada do schema cobrou).
- Suíte completa, 1º passe: unit 253/256, integração 92/94. Vermelhos: 3 unit (SQLite real, timeout/"Unable to start a
  transaction" sob carga), `CounterpartyBackfill` (timeout de hook) e `resetDb.accounting` (meu, corrigido). Re-rodados
  isolados: **todos verdes**. Depois do patch pós-review re-rodei só `tsc` + `paymentAccount.integration` (8/8).

## Caso adversarial tentado

O teste do 503 compara a linha inteira antes e depois: uma escrita antes do `loadKeyring` o reprovaria. O teste de
vazamento só vale se a captura de log funcionar, então ele assere que o 503 anterior **aparece** no log capturado.

## Achados fora de escopo

- `CounterpartyBackfill.integration` aplica todas as migrações com `npx prisma db execute` uma por uma: 131 s isolado
  contra um teto de hook de 180 s. Cada migração nova chega mais perto do teto (sob carga, já estourou).
- Policy negando com 403 não tem teste (o `AccountingPolicy` atual só nega quando `actorUserId` está vazio).

## Pré-condição de deploy (M2)

`PAYMENT_CREDENTIAL_KEYS="1:<base64 32 bytes>"` + `PAYMENT_CREDENTIAL_KEY_ACTIVE=1` no env, com o backup da chave
**fora** do backup do `.db`. Sem as duas variáveis, a feature responde 503.

## Linha de fold (pós-merge, `docs/plano/README.md`)

`id: F5` · `estado: in_progress` · `estado_detalhe: "PR-1 (cifra + PaymentAccount) mergeado em #484; PR-2 (cobrança +
MP + webhook) e PR-3 (relatório + F7, espera a sonda) sem executa"` · `prs: [#484]`

## Vieses declarados (T8)

O desenho seguiu o molde do `AccountingContact` (policy-first, evento ausente onde o spec não lista). Isso pende a
copiar as escolhas dele, inclusive o "mesmo status = no-op", sem perguntar. O revisor leu o mesmo BRIEF que eu, então
uma lacuna que nenhum dos dois enxergou no BRIEF passa pelos dois.
