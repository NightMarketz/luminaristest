# RETORNO — I1b (CLI de re-key do unitId legado + testes + runbook em branco)

**Veredito: REVISADO, PASS-COM-RESSALVAS. Não mergear sem o OK do dono.** O `--apply` (a escrita) foi verificado pelo
revisor independente. O `--verify` dá **falso verde** em dois cenários de adulteração (achado R1, abaixo). Enquanto isso
não for corrigido, o passo 7 do runbook não serve como prova. Há também uma lacuna de spec aberta (L1).

tarefa: executar o código do I1b — só o CLI e os testes. Autorização: dono, 03/10/2026, *"Executa o código do I1b — só
  o CLI e os testes; rodar contra o dev.db real NÃO está autorizado"*. Ela foi registrada no campo `autorizacao` de
  `docs/plano/nos/I1b.md`, e `plano-vault.mjs check` passou verde.
spec: `docs/adr/ADR-INCR-UNIT-REKEY-migration.md`. Usei o §4 (itens 1–19) e o §5. Os forks F-RK-1..12 do §6 foram
  ratificados em 02/10, com F-RK-8 → b e F-RK-2 → a.
sessão: sessao-feature · branch `claude/i1b-cli-tests-rekey-d235e3` (a partir de `origin/main` `d6530790`) · commit
  `8bf69265` · PR https://github.com/NightMarketz/luminaristest/pull/480 (aberto, **não mergeado**).
modelo: Claude Opus 5.5 (`claude-opus-5-5`) na execução · revisor: agente separado, Opus, em worktree isolada.
perfil-previsto: opus-medio · perfil-real: opus-medio. É uma feature de um nó só, sem fork decidido na sessão. Teve 1
  rodada de review, sem correção depois dele, porque a ordem foi parar.
custo: o contexto desta sessão estava em cerca de 279 mil tokens quando o review começou. O revisor gastou cerca de 168
  mil tokens, em 24 chamadas e 12,9 min. O plano Max usou 2% da janela de 5 h e 26% da semanal (`get_usage`). O
  custo em USD não aparece nesta conta.

## Checklist (ADR §4)

| # | Comportamento | Status | Teste |
|---|---|---|---|
| 1 | Invocação só explícita | ✅ | `rekeyLegacyUnitCli.boot.test.ts`: busca `rekey` nos Dockerfiles, no compose, em `server.ts` e nos scripts de boot |
| 2 | Inventário vindo do DMMF, com classificação fechada (47 = 45 REKEY + 2 KEEP) | ✅ | integração, item 2 |
| 3 | Pré-check de schema e de migrações pendentes | ✅ | integração, item 3 (com uma migração a menos: exit 1, digest idêntico) |
| 4 | `--plan` só lê | ✅ | integração, itens 4–6 (digest de todas as tabelas idêntico) |
| 5 | SKIP_REAL_UNIT / UNIT_OWNER_MISMATCH | ✅ | integração, item 5 |
| 6 | EXCLUDED_TENANT (sem `units` **ou** `seed-unit-*`) → NO_UNITS_TABLE | ✅ | integração, itens 4–6 |
| 7 | Args validados por Zod → exit 2 | ✅ | integração, item 7 |
| 8 | Linha criada por `createTableData` com `{tx}` e os plugins | ✅ (teste parcial, R3) | integração, item 8 (cobre o pipeline, não o estoque) |
| 9 | 45 UPDATEs filtrados por dono, numa única tx; `storageKey` intacto | ✅ | integração, itens 8–17 |
| 10 | Contagem antes/depois e rollback total | ✅ | integração, item 10 (falha injetada na 20ª tabela: banco idêntico, nada em `units` nem no pipeline) |
| 11 | Trilha legada selada | ✅ | `verifyAuditChain` legado com a mesma `lastSeq` e o mesmo `headHash` |
| 12 | Âncora `unit.rekeyed` com seq=1, mais a allowlist | ✅ | integração + `auditCanonical.test.ts` |
| 13 | Idempotência | ✅ | 2ª execução: NOTHING_TO_DO, 1 unidade, 1 evento, 1 pipeline |
| 14 | `logger.info` depois do commit, mais JSON no stdout | ✅ | spy no logger |
| 15 | Backup fresco | ✅ (L1 aberta) | ausente, inválido e velho: exit 1, nada escrito |
| 16 | Runbook em branco | ✅ | `docs/accounting/RUNBOOK-I1B-UNIT-REKEY.md`, sem evidência, desfecho ou assinatura |
| 17 | `--verify` pré × pós | ⚠️ implementado, **falso verde (R1, R2)** | integração: verde depois do apply e vermelho com `User` adulterado |
| 18 | Aviso de servidor parado | ✅ | o CLI imprime o aviso; o passo 1 do runbook cobre |
| 19 | Gates mecânicos | ✅ | ver PROVA |

## PROVA (rodada nesta sessão)

- `cd server && npx tsc --noEmit`: exit 0.
- `npx jest --selectProjects integration --runInBand --testPathPatterns rekeyLegacyUnitCli`: **8/8**.
- `npx jest --selectProjects unit --testPathPatterns "rekeyLegacyUnitCli|auditCanonical|auditAllowlist"`: **54/54**.
- `node scripts/rekey-legacy-unit.mjs --self-check`: `[self-check] OK`, 8 asserções.
- `npm run test:integration` (suíte inteira): 93/94 suítes. A que falhou foi **`CounterpartyBackfill.integration.test.ts`**,
  e ela falha **sozinha também**: o timeout de 180 s estoura no `beforeAll`, que aplica cerca de 50 migrações com
  `prisma db execute`. Ela não toca nenhum arquivo do diff. Chamo isso de lentidão do ambiente Windows, por inferência;
  quem confirma é a CI.
- Unit inteira: `PostingRepository.concurrency.test.ts` deu "Unable to start a transaction" com 50 transações
  concorrentes. É a classe `windows-serializa-sqlite`, e o teste não toca o diff (inferido).

## Review independente — PASS-COM-RESSALVAS

O revisor conferiu (a) atomicidade, (b) filtro por dono, (c) SQL parametrizado em lista fechada, (d) a âncora,
(e) a classificação, (f) a idempotência, (h) o self-check e (i) o runbook. Para o item (h), ele envenenou o
`server/.env` com um banco-isca: o self-check continuou no banco temporário e a isca nem chegou a ser criada.

Achados verificados:
- **R1 — `--verify` não confere para onde o `unitId` foi** (`rekeyLegacyUnitCli.ts:463-466`). O revisor devolveu uma
  conta ao legado e mudou o `unitId` de uma conta de outro dono para `HIJACKED`. O verify saiu com exit 0 e
  `failures: []`. Causa: o 17(b) calcula o hash sem a coluna `unitId`. Correção mínima: exigir que o `unitId` de cada
  linha fique igual, a menos que a linha fosse (dono, legado) e agora seja (dono, novo). **Não bloqueia o merge;
  bloqueia usar o passo 7 do runbook como prova.**
- **R2 — sem cabeça de cadeia legada, o verify não vê nenhum re-key** (`rekeyed: []`). Nesse caso ele pula a checagem
  de que a linha nova está em `units` e o item (e). O self-check cai justamente nesse caso.
- **R3 — o teste do item 8 não cobre o estoque semeado para a unidade nova.**

Suspeitas que o revisor não executou:
- Dois `--apply` simultâneos podem criar uma unidade vazia: as checagens rodam fora da tx e nada exige "≥ 1 linha
  movida". O risco é baixo com o servidor parado e um único operador.
- O id de uma `units` apagada por soft delete vira LEGACY. Isso segue a letra do item 5.

**Não corrigi R1–R3**: a ordem foi "review → pare". Corrigir R1, R2 e R3 é um patch pequeno no mesmo PR, e espera o seu OK.

## Lacunas de spec

> Documentadas na spec em 03/10: ADR-INCR-UNIT-REKEY §10 (L-RK-1 = L1; L-RK-2 = R1; L-RK-3 = R2; L-RK-4 e L-RK-5 = as duas suspeitas do revisor). Todas com opções e nenhuma decidida.

- **L1 (aberta, sua decisão):** sem `--backup-path`, o §5 manda exit **2** (`backupPath` obrigatório no Zod) e o item
  15 manda exit **1** ("sem o flag → exit 1"). O código segue o §5. O teste assere só o que as duas leituras têm em
  comum: recusa e nada escrito. Para fechar: (a) manter o exit 2, ou (b) tornar o campo opcional no Zod e devolver
  exit 1 como pré-condição.

Leituras do contrato, declaradas (o revisor confirmou que nenhuma é escolha indevida de fork): `tables` do payload como
JSON estável; sem cabeça legada → `auditAnchor: null` e nenhum evento; `--apply` sobre unidade real → exit 0
`SKIP_REAL_UNIT`; "último updatedAt" = máximo sobre as tabelas que têm a coluna; self-check com `NODE_ENV=test` mais a
guarda do `alvo:`.

## Achados fora de escopo

- **Com os forks ratificados, o dev.db medido em 26/09 não tem nenhuma unidade a aplicar.** Os 5 unitIds se dividem
  assim: Matriz = SKIP, 2× `incr6` ficam de fora (F-RK-3 b), 2× `seed-unit-*` são EXCLUDED (F-RK-2 a). Se o `--plan`
  do dia confirmar, a execução humana se resume a plano + órfãos documentados. Isso é inferido da tabela §2.2 do ADR;
  quem mede é o `--plan` do dia. O runbook já prevê "lista vazia".
- O ADR continua com o status "Proposed" no cabeçalho, embora tenha 12/12 forks fechados e "executa" (não editei).

## Fold pós-merge (não aplicado — fica para depois do seu OK)

`id: I1b` · `estado: ready` (continua: execução no dev.db = gate humano) · `estado_detalhe: "+ 03/10: código do CLI e
testes no PR #480 (review PASS-COM-RESSALVAS: verify com falso verde R1/R2; lacuna L1 exit 1×2); runbook em branco"` ·
`prs: ["#392", "#480"]`

## Riscos e vieses (T8)

- O R1 é o tipo de defeito que meus próprios testes não pegariam: eu testei o verify só com adulteração **fora** do
  inventário. Foi viés de confirmação, porque testei o caminho que já esperava ver passar.
- Escrevi o self-check e quase o rodei sem a guarda do `alvo:`. A classe `env-override` só foi tratada porque estava
  na memória do projeto, não porque eu a deduzi.
