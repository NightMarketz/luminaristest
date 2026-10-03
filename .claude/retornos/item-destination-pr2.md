# RETORNO — ITEM-DESTINATION PR-2 (default de destinação por produto)

tarefa: BRIEF BE-INCR-ITEM-DESTINATION §7 PR-2 — itens 2 (tabela), 9 (origem PRODUTO), 16–19 + EMENDA item 25
agente: sessão principal (sessao-feature), worktree item-destination-pr2-60b7bc; review por Agent isolado (revisor-independente, model opus, worktree própria)
base: d6530790 (= origin/main no início)
modelo: opus-5.5/low
perfil-previsto: opus-medio
rodadas-de-review: 1 — r1: PASS, 0 achados
custo: US$ 8.96 · claude-opus-5-5 US$ 8.96 · 454 min
veredicto: PASSOU — PR NightMarketz/luminaristest#481 aberto, **não mergeado** (merge só com OK do dono)

### Checklist (spec §7 PR-2)
- [x] 2 — `ProductDestinationDefault` (schema.prisma) + migração `20261003120000_add_product_destination_defaults` (só CREATE … IF NOT EXISTS) + `resetDb()`
- [x] 9 — `resolveDestinations`: classId → destination → default do produto (PRODUTO) → FALLBACK; uma query de defaults no import e no preview
- [x] 16 — `ProductDestinationDefaultRepository` (upsert revive o soft-deletado)
- [x] 17 — `ProductDestinationService` (canManageFiscalProfile, ProductRefLookup, `product_destination.set/.cleared` na tx + allowlist)
- [x] 18 — `GET/PUT /api/accounting/product-destinations`, `DELETE /:productRef`; docs.paths + openapi.json (227 → 229)
- [x] 19 — factory: repo de defaults em NfeImportService/NfePreviewService; service novo registrado
- [x] EMENDA 25 — default só `REVENDA | INSUMO_SERVICO` (DTO + guard `defaultByProductRefFrom`)

### Arquivos
- server/prisma/schema.prisma, server/prisma/migrations/20261003120000_add_product_destination_defaults/migration.sql (NEW)
- server/src/features/accounting/{models/itemDestination.ts, dtos/ProductDestinationDto.ts (NEW), repositories/{I,}ProductDestinationDefaultRepository.ts (NEW), services/ProductDestinationService.ts (NEW), services/Nfe{Import,Preview}Service.ts, audit/auditCanonical.ts}
- server/src/controllers/productDestinationController.ts (NEW), server/src/routes/{accounting,docs.paths}.ts, server/src/lib/factory.ts, server/public/openapi.json, server/test/helpers/db.ts
- testes: itemDestination.test.ts, ProductDestinationDto.test.ts (NEW), ProductDestinationService.test.ts (NEW), Nfe{Import,Preview}Service.test.ts, auditCanonical.test.ts, openapi-paths.test.ts, productDestination.integration.test.ts (NEW)
- snapshot `__dto-shapes__.json` + my-app/types/contracts/accounting/ProductDestinationDto.gen.ts (NEW)

### Checks executados
- `npx tsc --noEmit` server e my-app → exit 0; `npm run test:types` (my-app) → exit 0
- unit restrito aos arquivos tocados → 53 suítes / 782 testes (1ª rodada); 201/201 na rodada de PROVA
- `npm run test:integration` completo → 91/94 suítes; as 3 restantes (ReferentialMappingRepository, fixedAssetController, CounterpartyBackfill) falharam por **timeout no beforeAll** (smoke de migração rodando junto, Windows) e passaram isoladas, 33/33. Não tocam código deste PR
- `node scripts/smoke-migration-gate.mjs --db <dev.db real>` → OK, 2 migrações aplicadas na cópia sem perda
- `prisma migrate diff --from-migrations … --to-schema-datamodel` → vazio

### Gates de envio OPS-001
- Objetivo: o operador cadastra uma vez que a tinta X é insumo do serviço, e toda nota seguinte lança X na despesa sem precisar remarcar. O teste de integração "item 9/19" mostra isso: mapeamento sem `destination` → `INSUMO_SERVICO/PRODUTO`, e o lançamento sai idêntico ao do PR-1 (1.1.6 7961 · 4.1.9 8788 · C 2.1.2 19333).
- Caso adversarial tentado: o default vencer o override explícito, ou alcançar item com `classId`. Coberto por `itemDestination.test.ts` e pela paridade preview = import. O revisor inverteu a ordem do resolver e os dois testes ficaram vermelhos.
- Checagem que teria falhado: o revisor tirou o `deletedAt: null` do upsert e o teste de integração do item 16 ficou vermelho.
- Risco principal: só a API alcança a feature até existir o par FE (achado A-6 do BRIEF). Sem a tela, nenhum default é cadastrado e tudo segue em FALLBACK.
- Viés (T8): o PR seguiu o precedente do `ServiceFiscalProfileService` em pontos que a spec não fixa (listados em "Lacunas"), sem perguntar ao dono.

### Lacunas de spec
Nenhuma bloqueante. Três pontos que a spec não fixa foram resolvidos pelo **precedente canônico do módulo** (`ServiceFiscalProfileService`), não por escolha nova. Se o dono quiser outro comportamento, é patch:
1. `GET` usa `canReadFiscalProfile`; a spec só nomeia a policy da escrita (`canManageFiscalProfile`).
2. `DELETE` de default inexistente → 404.
3. Payload dos eventos `{ productRef, destination }`.

### Achados fora de escopo
- O revisor notou que o contrato §2 prefere 404 para cross-tenant, mas a spec (item 17) pede 400 explicitamente. Segui a spec.

### Fold pós-merge (docs/plano)
`id: ITEM-DESTINATION` · `estado: done` (o PR-2 é a última fatia do §7) · `estado_detalhe: + "· 03/10: PR-2 (default por produto, itens 2/9/16–19) em #481; item 7 segue (c) até a P-1; par FE = A-6"` · `prs: + "#481"`

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/item-destination-pr2-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/item-destination-pr2-tsc-app.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest --selectProjects unit --testPathPatterns \"itemDestination|ProductDestination|NfePreviewService|NfeImportService|auditCanonical|auditAllowlistCoverage|dtoShapeSnapshot|openapi-paths\""
    exit_code: 0
    log: .claude/retornos/_logs/item-destination-pr2-unit.log
    sha256: 5df299ccf6f39892c612942103bb7df99a3097f1322b2cf31f07240a777963a8
  - command: "cd server && npm run test:integration -- --testPathPatterns \"productDestination|nfeController.purchase\""
    exit_code: 0
    log: .claude/retornos/_logs/item-destination-pr2-integ.log
    sha256: fa3ca8943408b9f5a68c623a36f8b6f9625a9d098da25c055db52f1133929f27
VEREDITO: PASS
```
