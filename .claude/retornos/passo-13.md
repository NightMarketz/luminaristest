# RETORNO — PASSO-13 (PR-B atomicUntil)

tarefa: boundary test atomicUntil vermelho com os 8 ofensores → 8 cabeçalhos JSDoc, mesmo PR, zero lógica
agente: sessão principal (sessao-instrumentacao → sessao-correcao), worktree zen-cannon-23c6ee; review por Agent isolado (model opus, worktree própria)
modelo: opus-5.5/low
perfil-previsto: opus-baixo
rodadas-de-review: 2 até PASS — r1: PASS + 8 não-bloqueantes (6 corrigidos, 2 por desenho); r2: PASS + 2 não-bloqueantes de texto (ambos corrigidos)
custo: US$ 12.86 · claude-opus-5-5 US$ 12.86 · 46 min
veredicto: PASSOU

### Arquivos
- server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts (NEW)
- server/src/features/accounting/services/{AccountingReview,BankSettlement,DataExchangeImport,Depreciation,ExerciseClosing,FixedAsset,Payable,Receivable}Service.ts (EDIT — só JSDoc prepended)
- .claude/skills/backend-service-generator/governance.md (EDIT — SVC-008 gate static)
- governance/coverage.md, governance/coverage-auto.md (EDIT — AC-2.3-2 ✅)
- docs/operating-manual/GAP-MAP.md (EDIT — Nível 3 [COBERTO], fila 9 ✅; linha N3 [ABERTO] "BankSettlementService sem teste de serviço")

### Checks executados
- `npx jest --selectProjects unit --testPathPatterns atomicUntil` em f0602058 → FAIL, offenders = exatamente os 8 services (vermelho pelo motivo certo)
- mesmo comando após retrofit → PASS (2/2)
- `npm run test:unit` → PASS (3443 passed, 3 skipped, 1 todo)
- `npm run test:integration` → PASS (786/786)
- `npx tsc --noEmit` (server) → exit 0
- `node .claude/skills/skill-audit/skill-audit.mjs run` → 0 findings
- grep literal de cada `teste: X.test.ts › "…"` no arquivo citado → 25/25 OK

### Gates de envio OPS-001
- Caso adversarial tentado: citação que existe mas não prova a linha — o revisor achou 3 (sourceId do import, re-drive da depreciação, idempotência do import); viraram citação correta ou `[sem teste — GAP-MAP]`.
- Checagem que teria falhado se errado: o boundary test ficou vermelho em f0602058 com os 8 nomes; o revisor removeu o 1º JSDoc em simulação e os 8 voltam a falhar; a população tem asserção `> 0` (não fica verde por vazio).
- Risco principal remanescente: o teste confere a presença das 5 linhas, não se a citação é verdadeira — a exatidão das citações depende de review humano/independente (achado 8, por desenho; regra de não montar aparato novo).

### Aberto
- `[sem teste — GAP-MAP]` declarados: BankSettlementService (todas as linhas → GAP-MAP N3 [ABERTO] "BankSettlementService sem teste de serviço"), commit 2 de AccountingReview e DataExchangeImport, retry PARTIAL do import, re-drive de rascunhos da depreciação.
- `scripts/session-cost.mjs` não existe na base 6cf3f244; rodado a partir de `origin/main` (cópia temporária, não commitada).

## PROVA

```yaml
PROVA:
  - command: "cd server && npx jest --selectProjects unit --testPathPatterns atomicUntil"
    exit_code: 0
    log: .claude/retornos/_logs/passo-13-boundary.log
    sha256: dd125c60dda33ed0ceb8b117aeb74b3aabe3ae1e13b35130e6b181f03ca3eeaa
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/passo-13-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "node .claude/skills/skill-audit/skill-audit.mjs run"
    exit_code: 0
    log: .claude/retornos/_logs/passo-13-skillaudit.log
    sha256: 1eb9d075fc45cf4d27a2192dc9d4dace4455f36d462ba4aeaaa08130c138259c
  - command: "cd server && npm run test:unit"
    exit_code: 0
    log: .claude/retornos/_logs/passo-13-unit.log
    sha256: 27cdc8e0f0d37501c5e0b4f9fde1eac10d012cf480466b0a179d6e70af6d2ceb
VEREDITO: PASS
```
