# Retorno — BE-INCR-MODULOS-BASE-SUBMODULOS PR-5 (itens 26–29)

- modelo: claude-opus-5-5
- perfil-previsto: sessao-feature (classe vermelha esperada, BRIEF §8 → revisor-independente → lote diário)
- rodadas-de-review: —
- custo: custo: US$ 10.95 · claude-opus-5-5 US$ 10.95 · 30 min
- branch: `claude/modulos-base-pr5` (de `origin/main`), commits `1c1dcab57` (código), `40a8a11b5` (nota do vault), mais o deste retorno
- autorização: dono, chat, 2026-11-06, questionário de 'executa': "BUILDER-VERTICAIS,TEAMMATES,RAG-DOCUMENTOS" — sessao-feature, sem merge (antes: "executa" do BRIEF inteiro de 31/10, citado no corpo do #1002)

## Checklist

| # | Comportamento | Teste | Status |
|---|---|---|---|
| 26 | `BRIDGE_KEYS = ['sales@1']`, `bridgeKeySchema`, `BRIDGE_REQUIRES` em `presets/index.ts`; `PresetSuite.bridges?`, obrigatório em `SelectablePresetSuite`; salão e clínica `['sales@1']`, crmModule `[]` | `AestheticClinicPreset.test.ts`, `moduleSelection.test.ts` (PR-5) | feito |
| 27 | `assertBridgeModulesKept`, chamado no create depois de `applyModuleRemovals` → 400 `{reason:'BRIDGE_REQUIRES_MODULE', bridge, module}` com a mensagem do BRIEF | `moduleSelection.test.ts` → "remover VENDAS do salão → 400 (VEN-0)", "remover PESSOAS → 400 (PES-0)"; `dashboardModules.integration.test.ts` → os dois casos dão 400 sem instalar nada (ver lacuna 1) | feito, com lacuna; a parte do `StateManager` está pausada (lacuna 2) |
| 28 | `ModuleDef.lockedBy` em PES-0/VEN-0; `lockOf` lê primeiro a trava do módulo (precisa de `lockedBy` e de uma ponte da suíte que o exija), depois a `meta`; `computeTableLocks`/`assertRemovalsAllowed` recebem `bridges` como parâmetro obrigatório (controller, StateManager, TableExtractor); `lockedModuleTables` e a opção `locked` da composição saíram; `lockedByAccounting` continua no TableFactory | `removability.test.ts` → "packages sem trava no salão", "customers travado por ACCOUNTING", "mensagem inalterada"; `moduleRegistry.test.ts`; `removability.session.test.ts`; `dashboardModules` → "salão − packages → 201"; fotografia | feito |
| 29 | Pacotes depois do 1º lançamento, sem caminho novo | `src/__tests__/pacotesAposLancamento.integration.test.ts` (novo): reset → 409 `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING` e a tabela continua lá; DELETE da linha do pacote vendido → 4xx e a linha fica | verde, sem lacuna no GAP-MAP |

**Fotografia:** muda só `locks.packages` (`ACCOUNTING` → `null`) nas 2 suítes. A justificativa está no cabeçalho do teste. Conferi por script: com `locks.packages` de volta a `ACCOUNTING`, o `JSON.stringify` é igual ao da fixture de `origin/main` (2 trocas, `true`).

## PROVA

```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-tsc.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx tsc -p tsconfig.test.json --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-tsc-test.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npm run check:arch"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-arch.log
    sha256: 32d6eb73cd11444c7bfbea66eb96de1ed96398eb646d173c80f21c3a7769d390
  - command: "cd my-app && npm run check:arch"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-arch-fe.log
    sha256: 6ced813e1791ebe1b88cbf42002963cf2edc741e16de5c2b2c63855a096f1329
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-tsc-fe.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/dynamicTables/presets src/features/interview --selectProjects unit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-unit-scoped.log
    sha256: 0cb62d50dfc3aad7113062e72979e1acc7217a21dbe9cb4ef3c3d98d9abae5a3
  - command: "cd server && npm run test:changed"
    exit_code: 1
    log: .claude/retornos/_logs/modulos-base-pr5-unit.log
    sha256: 663f057596c7ec46143bf027c13ec3af05be0273766c7cfb91b181cb7463af3f
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5 -- npx jest src/__tests__/pacotesAposLancamento.integration.test.ts --selectProjects integration --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-int-pacotes.log
    sha256: 6c01e25fe411ba83cc13feddd36ddace1e895ec451cd89588d4b6a1776f6c59e
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5 -- npx jest src/controllers/__tests__/dashboardModules.integration.test.ts --selectProjects integration --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-int-modules.log
    sha256: f33631ab1d7ab9a3cb36b0517e5cdcb304748cfebd41c6fc3dc7fcbf98e300b8
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5 -- npx jest src/controllers/__tests__/dashboardCreate.removability.integration.test.ts --selectProjects integration --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-int-dashboardCreate.removability.log
    sha256: 12ab98ef1ffc455bc779151136714cbd0e774687c160adc1ca4c3592837c6879
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5 -- npx jest src/features/dynamicTables/presets/__tests__/suitePayloadBaseline.integration.test.ts --selectProjects integration --runInBand --forceExit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr5-int-suitePayloadBaseline.log
    sha256: 9a7c88e3cf15d6fba93195957f9756ab909f1a0a0e5aff955d67845fbba0351d
VEREDITO: PASS
```

O `test:changed` sai com 1 por causa de um único teste, `route-spec-wiring.test.ts`: 501 rotas fora da spec, todas de contabilidade e de outros domínios. Este diff não toca rota nenhuma. Grau **inferido**: é ambiental ou já existia antes. Não reproduzi o teste na `main`.

As integrações rodaram antes da última edição: nas suítes, `as BridgeKey[]` virou `'sales@1' as const`, para tirar o ciclo que o check:arch acusou. A mudança é só de tipo. Depois dela rodaram de novo `tsc`, `tsc` de teste, unitários e arch.

Não há DTO, snapshot de shape, `.gen.ts` nem i18n tocados: o diff não muda DTO nem string de FE.

## Rodada 2 (lacunas 1–2) — comandos

```yaml
PROVA_RODADA_2:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
  - command: "cd server && npx tsc -p tsconfig.test.json --noEmit"
    exit_code: 0
  - command: "cd server && npm run check:arch"
    exit_code: 0
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
  - command: "cd server && npx jest src/features/interview/CustomizationService/__tests__/removability.session.test.ts src/features/dynamicTables/presets/modules --selectProjects unit"
    exit_code: 0
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5b -- npx jest src/controllers/__tests__/dashboardModules.integration.test.ts --selectProjects integration --runInBand"
    exit_code: 0
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5b -- npx jest src/controllers/__tests__/dashboardCreate.removability.integration.test.ts --selectProjects integration --runInBand"
    exit_code: 0
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label builder-pr5b -- npx jest <suitePayloadBaseline.integration.test.ts> --selectProjects integration --runInBand"
    exit_code: 0
VEREDITO: PASS
```
Logs fora do git (`.claude/retornos/_logs/pr5b-*.log`). custo: US$ 13.78 · claude-opus-5-5 US$ 13.78 · 49 min

## Lacunas de spec

1. **DECIDIDA (dono, questionário 2026-11-06, "As duas juntas").** No create, `findRemovalLock` + `findMissingBridgeModule` → `throwRemovalRefusals`: um motivo = o 400 de sempre; dois = um 400 só, `error` com as duas mensagens e `details` = 1º motivo (`TABLE_LOCKED`, compatível com quem lê `details.reason`) + `reasons: [{reason:'TABLE_LOCKED',table,lock,message},{reason:'BRIDGE_REQUIRES_MODULE',bridge,module,message}]`. Aditivo em `ValidationError.details` (Record livre), sem mudar DTO. `dashboardModules` → "remover VENDAS" afirma os dois.
2. **DECIDIDA (mesma decisão).** Na conversa (`CustomizationService.processRemovingTable`, a recusa de `StateManager.removeTable`), a resposta junta `describeTableLock` e `bridgeRequirementsOfTable` (sales → VEN-0, customers → PES-0). `removability.session.test.ts` → "As duas juntas".
4. **Nova, aberta: "remover PESSOAS" no create não chega à ponte.** Com VENDAS mantida, `applyModuleRemovals` recusa PES-0 (`DEPENDENT_MODULE_KEPT`, VEN-0 depende dele), então PES-0 não falta e o 400 sai só com `TABLE_LOCKED`. Juntar este 3º motivo à lista não foi decidido; o teste afirma o observado (`reasons` ausente). O dono decide.
5. `dashboard.paths.ts` (OpenAPI) não descreve `details.reasons`; não mexi (só descrição, sem DTO).
3. Escolha de forma registrada: o contrato do BRIEF diz `PresetSuite.bridges: BridgeKey[]`. No código ficou opcional em `PresetSuite`, porque o `CoreSystemPreset` não é selecionável, e obrigatório em `SelectablePresetSuite`. As 3 suítes declaram.

## Achados fora de escopo

- `route-spec-wiring.test.ts` vermelho local (ver acima).
- `my-app/features/interview/setup/creationErrorMessage.ts` não conhece `BRIDGE_REQUIRES_MODULE` (FE-INCR).
- Não existe rota para apagar uma tabela dinâmica isolada. A guarda de "apagar a tabela `packages`" é só o reset do sistema.
