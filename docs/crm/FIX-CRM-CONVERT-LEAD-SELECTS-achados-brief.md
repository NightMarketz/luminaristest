# BRIEF — achados fora de escopo do FIX-CRM-CONVERT-LEAD-SELECTS

> Produzido por **sessão de planejamento** em 28/09/2026. Sem código de aplicação.
> **Autorização (chat, 28/09/2026):** *"Planeje e pesquise as soluções ideais para os achados fora do escopo e corrija"* —
> cobre os 4 achados do relatório do FIX-CRM-CONVERT-LEAD-SELECTS (`FIX-CRM-CONVERT-LEAD-SELECTS-brief.md`), nada além.
> **Forks ratificados pelo dono em 28/09/2026 (questionário em chat):** F-1 → (a) convenção canônica; F-2 → (b) banner no modal;
> F-3 → (a) registrar varrido, sem guarda; F-4 → (a) `rmSync` com retry.

## 1. Fatos (pesquisa)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| A1 | Os defaults dos presets são inglês: `crmAccounts.size` = `Micro/Small/Medium/Large/Enterprise`, `crmContacts.role` = `Decision Maker/Influencer/Champion/Gatekeeper/User` | `CrmAccountsModule.ts:24`, `CrmContactsModule.ts:50` | lido |
| A2 | Convenção canônica de rótulo de opção no FE: `t(\`database:options.${valor}\`, valor)` — valor fica, rótulo traduz; valor sem chave cai nele mesmo (serve p/ opção do tenant, ex. `P`) | `GenericFilterBar.tsx:67-74` + 9 outros arquivos (20 usos) | lido |
| A3 | `database.json` → `options` tem só `Medium` (`Médio`) dos 10 valores; faltam 9 em pt e en | `public/locales/{pt,en}/database.json:111-157` | verificado (grep) |
| A4 | O modal vive em `Lead360Modal`, hospedado por `pages/crm/index.tsx` e `pages/crm/pipeline.tsx` (via `CrmPipelineBoard`); **nenhuma das duas carrega o namespace `database`** (`['common','crm']`) — `accounts/contacts/proposals` carregam | `serverSideTranslations` nas páginas | lido |
| B1 | Falha HTTP do `getTables()` **já vira toast** global (`apiClient` → `notify(errorMessage,'error')` antes do `throw`); só erro de rede (`fetch` rejeita) sai sem toast — e aí o próprio `convertLead` também falha visível | `lib/api/api-client.ts:86-101` | lido |
| C1 | Varredura da classe: `freeSelects` não-vazio só em `CRM-2A {crmAccounts:['size']}` e `CRM-2B {crmContacts:['role']}`; os únicos lugares que fixavam as opções eram o próprio preset e o `ConvertLeadSchema` (já corrigido). População restante = **0** | `grep freeSelects:` + `grep "Micro\|Decision Maker"` em server/src e my-app | verificado |
| D1 | Mecanismo do EBUSY: com um `PrismaClient` conectado ao arquivo, `fs.rmSync(db)` → `EBUSY`; após `$disconnect()` → OK; `fs.promises.rm(db,{maxRetries:10,retryDelay:200})` com o handle solto em 1,5 s → OK em 2058 ms | sonda `probe.js`/`probe2.js` (scratchpad, 28/09) | verificado |
| D2 | O EBUSY é **intermitente e sem suíte culpada fixa**: 1ª falha após `lalur`/`dashboardCreate.firstUnit`/`PartialSettlement` nas 3 rodadas; int2 = FAIL #32, PASS #54, FAIL #57. As 90 suítes passam isoladas | logs `base-int`/`int2`/`int3` | verificado |
| D3 | `pushTestSchema()` faz `fs.rmSync(DB_FILE)` **sem retry** (`test/helpers/db.ts:20-22`); `rmSync` da stdlib aceita `maxRetries`/`retryDelay` justamente p/ `EBUSY/EPERM` no Windows | leitura + doc Node `fs.rmSync` | lido |
| D4 | `prisma db push --force-reset` (alternativa sem unlink) é **bloqueado** pelo guarda anti-agente do Prisma — não usar | sonda 28/09 | verificado |

## 2. Checklist

1. **(A, F-1)** `LeadConvertModal`: rótulo de cada `<option>` = `t(\`database:options.${o}\`, o)`; `value` = `o` inalterado.
2. **(A, F-1)** `database.json` pt/en → `options`: +9 chaves (`Micro, Small, Large, Enterprise, Decision Maker, Influencer, Champion, Gatekeeper, User`); `Medium` já existe.
3. **(A, F-1)** `pages/crm/index.tsx` e `pages/crm/pipeline.tsx`: `serverSideTranslations(..., ['common','crm','database'])`.
4. **(A)** Teste: T-3 ganha um caso — schema com `size=['Small']` e `t` que traduz `database:options.Small` → rótulo "Pequena", `value` "Small" no payload.
5. **(B, F-2 → b)** `getTables()` rejeitado → `setError(resolveErrorMessage(err, t))` no banner já existente do modal; o form segue utilizável (sem Porte/Papel). Teste: mock rejeita → banner visível, Converter habilitado.
6. **(C, F-3 → a)** registrar "varrido, população 0" na linha do GAP-MAP, sem guarda nova.
7. **(D, F-4)** `pushTestSchema`: `fs.rmSync(f, { maxRetries: 10, retryDelay: 200 })` (backoff linear ≈ 11 s de teto).
   Prova = `npm run test:integration` **rodada única** no Windows com `grep -c EBUSY` = 0 (3/3 rodadas de hoje deram > 0).
   Se o EBUSY persistir, é ACHADO (dono do handle persistente) — reportar, não empilhar remédio.

## 3. Contratos

```ts
// FE — LeadConvertModal (option)
<option key={o} value={o}>{t(`database:options.${o}`, o)}</option>
// i18n — database.json "options" (pt): "Micro":"Micro", "Small":"Pequena", "Large":"Grande", "Enterprise":"Corporação",
//   "Decision Maker":"Decisor", "Influencer":"Influenciador", "Champion":"Defensor", "Gatekeeper":"Guardião", "User":"Usuário"
// test helper
fs.rmSync(f, { maxRetries: 10, retryDelay: 200 });
```

## 4. Forks — RATIFICADOS 28/09/2026 (F-1 a · F-2 b · F-3 a · F-4 a)

- **F-1 rótulos pt dos defaults** — (a) convenção canônica `database:options` + 9 chaves + namespace nas 2 páginas **[recomendado:
  reuso do canônico (A2); vale também p/ qualquer tela que já usa a convenção; valor do tenant intocado]**; (b) chaves novas em
  `crm.json` (`convert.options.*`) — isolado, mas duplica a convenção; (c) trocar os defaults do preset para pt — muda dado
  instalado/validação de tenants existentes (migração), fora da proporção.
- **F-2 falha do `getTables()`** — (a) manter (HTTP já tem toast; rede derruba o convert também) **[recomendado: B1]**; (b) além
  disso, mostrar o erro no banner do modal; (c) bloquear "Converter" até carregar as opções.
- **F-3 classe DTO × freeSelects** — (a) registrar varrido/população 0, sem guarda **[recomendado: C1 + regra permanente de não
  montar aparato; população de 2 campos, ambos já corretos]**; (b) teste unit que cruza `freeSelects` × `z.enum` dos DTOs.
- **F-4 EBUSY** — (a) `rmSync` com `maxRetries/retryDelay` **[recomendado: D1–D3, 1 linha de stdlib, sem aparato]**; (b) não mexer
  (seguir com rerun isolado + CI Linux como oráculo); (c) `globalSetup` com um único push por rodada — muda a semântica de "banco
  novo por arquivo" de 90 suítes.

## 5. Pendente de validação externa
- Nenhuma (tradução de rótulo de UI; não é regra fiscal/contábil).

## 6. Insumos ausentes
- Nenhum.

## 7. Achados fora de escopo
- Telas `accounts`/`contacts` (GenericTable) exibem `size`/`role` pela convenção? Não verificado — se usarem, ganham o rótulo pt de graça pelo item 2.

## 8. Resultado do F-4 (execução 28/09) — REFUTADO, revertido

- Rodada única `npm run test:integration` com o retry: **304 EBUSY, 16 suítes FAIL**, cada uma em ~11,7 s (= teto do backoff
  200·(1+…+10) ms). O dono do handle segura o arquivo por **mais de 11 s** — D2 ("transitório") estava errado.
- Retry **revertido** (não resolve e custa ~11 s por suíte que falha). Nada de remédio empilhado (item 7).
- Hipótese seguinte (inferida, não verificada): o dono é um `PrismaClient` **do próprio processo jest** (`--runInBand` roda as 90
  suítes num processo só) que não foi desconectado — `rmSync` síncrono bloqueia o event loop, então nenhum retry deixa um
  handle do mesmo processo ser solto. Coerente com: (i) sonda D1 (`$disconnect` solta o handle na hora), (ii) falha intermitente
  que "sara" depois (GC do client órfão), (iii) todas as 90 suítes chamam `disconnect` — logo o órfão seria um client *extra*
  (os ~20 arquivos que fazem `new PrismaClient` ou o factory).
- Checagem que decide (próximo passo, exige nova autorização): contar `PrismaClient` construídos × desconectados por suíte na rodada
  única (ex.: wrapper temporário no `generated/prisma` via `setupFiles`), e ver se a 1ª suíte EBUSY sucede um arquivo com saldo > 0.

## 9. F-4 — causa verificada e correção (28/09, após o §8)

| Checagem | Resultado | Grau |
|---|---|---|
| Sonda de registro de `PrismaClient` em ARQUIVO (construído/consultado/desconectado por suíte) | todo client consultado foi desconectado; nos 32/32 EBUSY, **0** client aberto de outro arquivo; 1 PID | verificado → hipótese "client órfão" do §8 **refutada** |
| `schema-engine` sobrevivendo ao `npx prisma db push` | arquivo livre em t+0…8 s, nenhum processo `schema-engine` | verificado → refutada |
| Dono do lock no momento do EBUSY (Restart Manager `RmGetList`, validado com controle positivo e negativo) | **60/60 EBUSY → o próprio processo jest** (`pid == process.pid`) | verificado |
| Unlink × truncate com dono vivo | unlink `EBUSY`; `truncateSync(f,0)` OK; `db push` recria o schema; client novo grava e lê | verificado |

- Causa (inferida dos verificados acima): o engine do Prisma de uma suíte anterior, no mesmo processo `--runInBand` e já
  `$disconnect`-ado, ainda mantém o handle; o SQLite no Windows abre **sem `FILE_SHARE_DELETE`**, então só o unlink falha.
- Correção: `pushTestSchema` (`test/helpers/db.ts`) e as 3 cópias inline que recriam o `test-integration.db`
  (`DynamicTableService`/`NoOverlapConcurrency`/`UniqueFieldConcurrency.integration.test.ts`) **truncam** em vez de apagar.
  Arquivo vazio = SQLite vazio. As ~20 suítes com banco próprio seguem com `unlink` em `try/catch` (não derrubam nada).
- Prova: `npm run test:integration` **rodada única** → `Test Suites: 90 passed, 90 total` · `Tests: 778 passed` · `grep -c EBUSY` = 0
  (contra 6/6 rodadas anteriores de hoje com 94–1268 EBUSY).
- Substitui o F-4 (a) (retry), refutado no §8. **Ratificado pelo dono em 28/09/2026 (questionário em chat): "Ratifico truncar".**

