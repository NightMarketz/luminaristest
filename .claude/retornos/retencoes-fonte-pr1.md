# RETORNO — RETENCOES-FONTE PR-1 (BE-INCR-RETENCOES-FONTE itens 1–9) + HANDOFF do PR-2

tarefa: executar o PR-1 e o PR-2 do BE-INCR-RETENCOES-FONTE pela sessao-feature, sem merge. PR-3 e PR-4 fora.
autorização: dono, chat, 2026-10-24: "executa RETENCOES-FONTE PR-1 e PR-2". Condição do dono: se o PR-1 ou o PR-2 tocarem o
  P-RET-4 ou os itens 7 a 9 do contador, parar.
decisões do dono nesta sessão (chat, AskUserQuestion, 2026-10-24):
  1. "Seguir com os DRAFT (Recomendado)": PR-1 e PR-2 inteiros como a cédula de 22/10. O referencial das folhas fica DRAFT, o
     INSS/CPRB nasce DRAFT sem valor e o PF soma o mês (P-RET-4/7/8 seguem ao contador).
  2. "Folhas fora até o P-RET-4 (Recomendado)": as folhas 1.1.8.01–03 e 2.1.9.01–03 sem referencial derrubavam a cobertura da
     ECD de toda unidade já mapeada (medido: `ready` true → false; o `SpedGenerationService.ts:150` recusa gerar). Não entram
     no plano padrão. Os 7 papéis ficam no perfil fiscal; só o IRRF retido é preenchido sozinho, pela 2.1.7.03.
base: `origin/main` `24758cdc`
rodadas-de-review: 0. Review independente NÃO despachado (regra ⛔ do CLAUDE.md: Bloco A com oráculo aberto)
veredicto: PR-1 COMPLETO no escopo decidido; gates verdes (PROVA abaixo). NÃO mergear sem OK do dono. PR-2 NÃO começado
  (handoff no fim, pela regra de higiene de contexto).

## Checklist do PR-1 (BRIEF §4)
| Item | Estado | Onde / teste |
|---|---|---|
| 1 `RETENCAO` | feito | CSRF CSLL 100 / COFINS 300 / PIS 65 de 2004-02-01 a 2026-12-31; CSLL 100 desde 2027-01-01; IRRF 714/716/718; INSS 1100; MINIMO CSRF/DARF/IRRF_REAL/PRESUMIDO/ARBITRADO/PF = 1000; INSS/CPRB DRAFT sem valor. `legalParameter.ts`, `formatoLinha.ts`; `retencoes.test.ts` "item 1" (2026-12-31 × 2027-01-01; proposta fora do formato) |
| 2 `RETENCAO_CODIGO` | feito | 248 linhas das tabelas "R-4020"/"R-4010" (zip oficial, sha 31c04713…), residência no Brasil; INSS DRAFT (chave `CESSAO_MAO_DE_OBRA`, o código do INSS não é por natRend). `models/retencaoParams.ts` `codigoReceitaRetencao` (IRRF+CNPJ⇒IRPJ, +CPF⇒IRPF; CSLL/COFINS/PIS⇒AGREGADO enquanto houver linha CSRF/COFINS vigente); `familiasDaLinha` = []. Testes do BRIEF: 15022 170806/595207, 15052 804506, 12016 570602, 12001 184101, sem linha ⇒ null + `CODIGO_RECEITA_DRAFT` |
| 3 `IRRF_PF_MENSAL` | feito | faixas Lei 11.482 art. 1º XII; REDUCAO_ART3A; DEPENDENTE 18959; DESCONTO_SIMPLIFICADO_BP 2500. `tabelaIrrfPfDe`, `impostoPelaTabela`, `reducaoArt3A`; testes R$ 5.000 ⇒ 0, R$ 6.000 ⇒ 179,75, R$ 7.350,01 ⇒ 0 |
| 4 vencimento | feito, **caminho diferente do BRIEF** | `src/lib/vencimentoRetencao.ts` (não `accounting/models/`): o núcleo contábil não importa `packages/` (`core-boundary.test.ts`); mesmo arranjo do `lib/ibsCbsApuracao.ts`. Testes: 2026-03 ⇒ 04-20; sábado/domingo; 20/11 nacional; municipal só no codMun |
| 5 regime da contraparte | feito | `Counterparty.regimeTributario`/`declaracaoOptanteDocumentId`; create aceita os dois; **comando novo `POST /api/counterparties/:id/regime`** (o catálogo não tinha update e o item pede "CRUD"; o controlador só aceita comando, nunca PATCH genérico). PF exige CPF; CNPJ+PF ⇒ 400; declaração = SourceDocument vivo do escopo. Auditoria `counterparty.regime_set` (sem taxId/nome). `retencoesFontePr1.integration.test.ts` |
| 6 `WithholdingProfile` | feito | model + repo (`runInTransaction`) + `canManageWithholdingProfile`/`canReadWithholdingProfile` (régua do AP) + service + controller + rotas GET/POST/PATCH/DELETE + factory. PATCH = corpo inteiro (sem `.partial()`). Regras: flag ⇒ campo; natRend na Tabela 01 (só DRAFT ⇒ aviso); PF só irrf; vigência sem sobreposição dentro da tx (teste concorrente); soft-delete; resetDb |
| 7 `NATUREZA_RENDIMENTO` | feito | 55 linhas: grupo 15 (52 naturezas; 15049 não existe na Tabela 01), 12001 ×2 vigências, 12016; `PUBLISHED`, `fonteSha256` = sha do zip |
| 8 contas | feito no escopo decidido (dono 24/10) | 7 papéis em `fiscal_profiles` + DTO/repo/serviço/view/auditoria/política versionada; natureza checada (teste por papel). `PERFIL_FISCAL_PLANO_PADRAO` só com IRRF retido → 2.1.7.03. Folhas 1.1.8/2.1.9 fora até o P-RET-4 |
| 9 gates | feito | allowlist `withholding_profile.*`, `counterparty.created` + `regimeTributario`, `counterparty.regime_set`; doc `routes/docs/accounting.withholdings.paths.ts`; openapi +3 paths (só inserções); snapshot só inserções; tsc; check:arch. **i18n: N/A** (nenhuma string de UI no PR-1) |

## Lacunas de spec / desvios registrados
1. Item 8: folhas fora do plano padrão (decisão 2 acima). O BRIEF/cédula previam folhas com referencial DRAFT; o código mostrou
   que "sem referencial" bloqueia a ECD.
2. Item 4 em `lib/` (gate core-boundary).
3. Item 5: comando `POST /counterparties/:id/regime` (não previsto nominalmente; único jeito de dar regime às contrapartes já existentes).
4. Linhas de residência no exterior das tabelas "R-4020"/"R-4010" fora da carga (a chave não tem residência; EXTERIOR ⇒ 400).
5. Vigência das linhas sem data própria na lei = 2025-01-01 (precedente emenda §9 L-10 do LEGAL-PARAMS).

## Achados fora de escopo
1. `POST/GET /api/counterparties*` seguem fora da doc OpenAPI (baseline `KNOWN_UNDOCUMENTED`); só a rota nova foi documentada.
2. `npm run docs:generate` no Windows reordena e ainda diverge da main em `/api/dashboard-layout/{id}` e
   `/api/reports/generate-chart-data` (drift anterior). Mantida a main; inseridos só os paths novos.

## PROVA (comandos rodados nesta sessão, 24/10)
- `cd server && npx tsc --noEmit` → exit 0; `npx tsc --noEmit -p tsconfig.test.json` → exit 0; `cd my-app && npx tsc --noEmit` → exit 0.
- `npm run check:arch` → "no dependency violations found (1681 modules, 7484 dependencies cruised)".
- `npx jest --selectProjects unit` → "Tests: 7 skipped, 1 todo, 5348 passed, 5356 total".
- `npm run test:integration` (4 shards) → 18 suítes FAIL, 84 delas por "Exceeded timeout of 60000 ms for a hook" (stall de
  I/O dos shards concorrentes no SQLite do Windows). As 18 em série (`jest --selectProjects integration --runInBand`) →
  "Test Suites: 2 failed, 16 passed". As 2 eram regressões deste PR (`rekeyLegacyUnitCli`: `WithholdingProfile` não
  classificado; `CounterpartyIdentityNormalization`: client novo num banco parcialmente migrado) → corrigidas no 2º commit →
  "Tests: 20 passed, 20 total".
- `retencoesFontePr1.integration.test.ts` → "Tests: 12 passed, 12 total".
- `node ../scripts/smoke-migration-gate.mjs --db <dev.db real>` → "OK: 6 migração(ões) aplicada(s) na cópia sem perda. Original intocado (S1)".
- Teste temporário (apagado depois) da decisão 2: unidade mapeada em 2025 → coverage `ANTES true`, depois das folhas 1.1.8/2.1.9
  → `DEPOIS false ["1.1.8.01","1.1.8.02","1.1.8.03","2.1.9.01","2.1.9.02","2.1.9.03"]`.
- Snapshot de DTO e openapi: o UPDATE no Windows reordena tudo; montados por script a partir do HEAD + só o novo
  (ordem de declaração), conferidos pelo teste sem UPDATE ("Tests: 264 passed").
- PR: https://github.com/NightMarketz/luminaristest/pull/888

## HANDOFF — PR-2 (itens 10–23), próxima sessão
- autorização: a mesma de 24/10 (cobre o PR-2). Branch novo empilhado: `git switch -c claude/retencoes-fonte-pr2 claude/retencoes-fonte-pr1-pr2-18d6c9`.
- ler: BRIEF §4 itens 10–23, §5.1 `TaxWithholding`, §5.2, §5.3, §5.4, F-RET-10/11/12/17/18 (§6); este retorno.
- pontos já sabidos do código: `PayableService.ts` cabeçalho atomicUntil l.1-16; createPayable tx1 l.286, recognition
  `postEntry` l.345; `registerPayment` SUM-CAS `claimForPayment` l.591; `cancelPayment` l.819; `reconcilePayables` l.915;
  `SETTLEMENT_KINDS` em `models/BankSettlement.model.ts:70`; `PayablePayment.method` fechado (`resolvePaymentMethodAccount`).
- PR-1 entrega: `retencaoParams.ts` (códigos, natureza, tabela PF), `lib/vencimentoRetencao.ts`, `withholdingProfile` + repo,
  regime da contraparte, papéis `retencao*AccountId` (6 sem folha padrão ⇒ conta ausente na hora de lançar = `ValidationError`
  nomeado, F-TA-7).
- atenção: P-RET-7 (soma mensal do PF) segue com o contador; a decisão 1 do dono manda implementar a soma (F-RET-17 a).
- gates do PR-2: allowlist `ap.withholding.recorded|reversed`, `tax_payable.upserted`; cabeçalho atomicUntil + 1 teste por
  linha; migração aditiva (`tax_withholdings`, `Payable.origin`, `Payable.liabilityAccountId`); snapshot/openapi só inserções
  (script de reordenação desta sessão: ver "PROVA").
