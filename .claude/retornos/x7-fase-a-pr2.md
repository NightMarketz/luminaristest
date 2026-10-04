# RETORNO — X7 Fase A PR-2 (model + prévia/confirmação/leitura, itens 12–14, 17, 19–22)

tarefa: executar o PR-2 da Fase A do X7 (F-TA-10 a) — itens 12–14, 17, 19–22 do BE-INCR-TAX-ASSESSMENT-A-brief.md; PR-3 (itens 15, 16, 18) fora
autorizacao: dono, chat, 03/10/2026 — "Executa o PR-2 da Fase A do X7 … PR-3 fora" (ainda NÃO registrada no `autorizacao` de docs/plano/nos/X7.md — entra no fold)
agente: sessão principal (sessao-feature), worktree sig-nfe-xmldsig-verification-5dd1b9, branch claude/x7-fase-a-pr2-tax-2503d6; review por Agent isolado (general-purpose, model opus, worktree própria)
base: 93af35b1 (origin/main, 04/10)
modelo: opus-5.5
rodadas-de-review: 1 — PASS COM RESSALVAS, 4 achados não-bloqueantes; 1 corrigido (lacuna de teste: 2 testes novos), 3 registrados abaixo
veredicto: PASSOU (alvo) — suíte de integração completa com 1 suíte em timeout de hook, ver Checks

### Decisões do dono tomadas nesta sessão (questionário, 04/10)
1. **Cascata da substituição** (lacuna do F-TA-3 "força reconfirmar os seguintes"): substituir Tq marca SUPERSEDED também as linhas CONFIRMED dos trimestres posteriores, sem substituta; a resposta lista `reconfirmar`. Com o 409 literal (leitura do BRIEF B item 13) não haveria saída — T03 nunca deixa de existir. **O BRIEF B item 13 (meses) diz 409; fica divergente da cascata até o dono alinhar a Fase B.**
2. **`unitId` nos GET**: obrigatório na query, só escopo/policy; a lista é da PJ inteira.

### Checklist
| # | Status | Teste |
|---|---|---|
| 12 model TaxAssessment + migração + repo/interface/factory | ✅ | integration (linhas gravadas); smoke:migration OK |
| 13 prévia (IRPJ+CSLL, não persiste; 400 SIMPLES/MEI, ANUAL, perfil ausente, multiunidade) | ✅ | integration 23 f, 23 g, Presumido T01, Real T01 |
| 14 confirmação commit 1 (CAS, um-só-CONFIRMED, ordem, regime, trava na tx, supersede, auditoria) | ✅ | integration Presumido T01, cascata, review (parcial/T04/2 posteriores), 23 e |
| 17 leitura (lista + :id com memória e provisaoPendente) | ✅ | integration (cascata) |
| 19 policy canRead/canManageTaxAssessment | ✅ | por leitura (predicado = Lalur, sempre true hoje) |
| 20 rotas 2 toques + path-count | ✅ | openapi-paths (BASELINE 239), route-spec-wiring |
| 21 snapshot de DTO + tipo FE | ✅ | dtoShapeSnapshot; TaxAssessmentDto.test (refines) |
| 22 allowlist de auditoria | ✅ | integration (chaves = allowlist) |
| rekeyLegacyUnitCli: TaxAssessment REKEY | ✅ | rekeyLegacyUnitCli.integration (51 models) |
| resetDb limpa tax_assessments | ✅ | resetDb.accounting.integration (a guarda pegou na 1ª rodada) |

### Lacunas de spec
1. **Trimestre fora da atividade** (review achado 1): nada recusa apurar Tq ∉ `trimestresEmAtividade` (ex.: início em 15/08 ⇒ T01/T02 confirmáveis depois do T04, zerados, sem cascata). O BRIEF não pede recusa; 400 seria comportamento novo — pendente do dono.
2. **Corrida no Linux** (review achado 2, inferido): no Windows 3 confirmações simultâneas deram 201/409/409; no Linux a 2ª tx tende a SQLITE_BUSY ⇒ **500 em vez de 409** (sem duplicata). A CI Linux é o teste.
3. **Auditoria da cascata** (review achado 4): linhas posteriores caídas em cascata têm `supersededById` = nova linha do Tq substituído; a reconfirmação delas nasce com `supersedesId = null`.
4. **Gates do item 14 além do texto**: perfil re-lido na tx com CAS por `updatedAt`, e o conjunto de memórias anteriores re-checado na tx (409 `TAX_ASSESSMENT_STALE`) — consequência do "todos os gates autoritativos dentro da tx".
5. **`provisaoContasConfiguradas`** = as 4 contas preenchidas; a guarda de circularidade do Real exige as 2 de despesa.
6. **Ordem F-TA-3**: T(q−1) exigido só se estiver em `trimestresEmAtividade`; nos 2 tributos.
7. Testes 23 (e, f, g) cobertos aqui; 23 (a) depende da provisão (PR-3).
8. Rota em `routes/taxAssessments.ts` montada em `index.ts` como `/accounting/tax-assessments` (o BRIEF item 20 dizia `routes/accounting.ts`; o dono pediu index.ts + docs.paths.ts).

### Achados fora de escopo
- Worktree `claude/x7-fase-a-pr3-tax-f4be34` existe em 93af35b1 sem commits — o PR-3 depende deste model.
- PR-3: a cascata precisa estornar a provisão das linhas posteriores caídas (item 15 fala só da substituída).
- `npm ci` foi necessário (faltava json-schema-to-typescript no node_modules da worktree).

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0
- `npm run test:unit` → 269 suítes, 3782 passed
- `npm run test:integration` → 1ª rodada: 103/104 suítes, 1 falha legítima (resetDb sem tax_assessments — corrigida). 2ª rodada: 103/104, a falha é **timeout de hook (180 s)** no `CounterpartyBackfill.integration` (aplica cada migração via `npx prisma db execute`; 213 s sob carga). Isolado: PASS em 131 s. Flake de tempo pré-existente que cada migração nova encosta no teto — a CI Linux é o teste; fora de escopo corrigir aqui.
- `npm run docs:generate` → 239 paths; `npm run smoke:migration` sobre cópia do dev.db real → OK, original intocado
- mutações: trava fora da tx + cascata desligada ⇒ 3 testes vermelhos; restaurado ⇒ verdes

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: inflight` · `estado_detalhe: + "04/10: Fase A PR-2 mergeado no #<n> (model TaxAssessment + prévia/confirmação/leitura; cascata da substituição e unitId-só-escopo decididos pelo dono em 04/10)"` · `prs: + "#<n>"` · `autorizacao: + "executa o PR-2 da Fase A (itens 12–14, 17, 19–22; PR-3 fora) (dono, 03/10)"`

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr2-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest --selectProjects unit --testPathPatterns \"TaxAssessmentDto|dtoShapeSnapshot|openapi-paths|route-spec-wiring|auditCanonical|taxAssessment\""
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr2-unit-alvo.log
    sha256: c2a45da06af0d4a1f853aeb6c50ba835b742c8a9d4352df982abddff103b154f
  - command: "cd server && npx jest --selectProjects integration --runInBand --forceExit -- taxAssessment rekeyLegacyUnitCli resetDb.accounting"
    exit_code: 0
    log: .claude/retornos/_logs/x7-fase-a-pr2-integ-alvo.log
    sha256: 0161d3e75e6cab74b1d2d00044034a1fb4a54024a0fb38c67b0f886c331d7f6f
VEREDITO: PASS
```
