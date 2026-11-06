# Retorno — BE-INCR-MODULOS-BASE-SUBMODULOS PR-6 (itens 30–34)

- modelo: claude-opus-5-5
- perfil-previsto: sessao-feature (classe vermelha esperada → revisor-independente → lote diário)
- rodadas-de-review: —
- custo: custo: US$ 14.93 · claude-opus-5-5 US$ 14.93 · 56 min
- branch: `claude/modulos-base-pr6`, empilhada sobre `origin/claude/modulos-base-pr5` (#1114, não mergeado)
- autorização: dono, chat, 2026-11-06, questionário de 'executa': "BUILDER-VERTICAIS,TEAMMATES,RAG-DOCUMENTOS" — sessao-feature, sem merge

## Checklist

| # | Comportamento | Teste | Status |
|---|---|---|---|
| 30 | `aiDescription` em pt dos módulos: já estavam no registro desde os PR-2..4 (texto de VEN-PAC idêntico ao BRIEF). Única mudança: `moduleKnowledge()` passa a levar `category`, para a IA sugerir por categoria. É texto de prompt (server), não string de UI, então não entra no i18n do front | `ModuleKnowledgeBase.test.ts` → "todo módulo aparece no conhecimento da IA, com categoria e descrição em pt" | feito |
| 31 | `ModuleSuggester`: a base fixa da categoria entra junto com qualquer pick da categoria; os picks são resolvidos juntos (AGE-0 + VEN-SERV fecha). Se o conjunto não fechar, volta ao pick a pick de antes (o pick que não fecha é descartado, sem 400) | `ModuleSuggester.test.ts` → "loja de roupas sem agendamento", "barbearia", "FIN-REC traz FIN-0"; o teste antigo de descarte continua verde | feito |
| 32 | `StateManager`/`sessionComposition` já usavam `MODULE_REGISTRY`/`moduleOfTable`, sem lista paralela (conferi lendo o código). Sem mudança de código, só testes | `removability.session.test.ts` → "desmarcar `packages` desmarca VEN-PAC" (com o aviso "o módulo saiu junto"), "desmarcar `sales` → recusa" com os dois motivos ("As duas juntas") | feito |
| 33 | Sessão nascida do salão = default §1 | `customCreation.w1.test.ts` → "PR-6 item 33" | feito (teste) |
| 34 | `buildQuickPreset('beautySalon', [])` = default §1 | `onboarding/services/__tests__/buildQuickPreset.defaultModules.test.ts` (novo) | feito (teste) |

**Decisão "Aceitar até o PR-6" (EST-0/AGE-0 travados na entrevista):** o item 32 do BRIEF diz "base fixa travada" e que isso vale para todas as categorias. Li isso como resposta: a entrevista **não** ganha a remoção da categoria inteira, e no Controle Total a categoria continua saindo. Mantive o teste do PR-3 que trava `stockMovements`/`appointments`. Isto é leitura do BRIEF, não decisão nova. Se o dono quiser a remoção da categoria inteira na entrevista, é fork novo.

**Fotografia (suitePayloadBaseline) e contratos:** não mudaram. Nenhum DTO nem rota foi tocado: `InterviewModuleOption` ficou igual e `IModuleKnowledge` só alimenta o prompt.

## PROVA

```yaml
PROVA:
  - command: "cd server && npx jest src/features/dynamicTables/presets/ai/__tests__/ModuleKnowledgeBase.test.ts src/features/interview/InterviewService/__tests__/ModuleSuggester.test.ts src/features/interview/CustomizationService/__tests__ src/features/onboarding/services/__tests__/buildQuickPreset.defaultModules.test.ts --selectProjects unit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr6-1.log
    sha256: beb6de7ccbd01c38e691dfdd392d74bb51707748add83fd02c1d6fc7b6231d4c
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr6-2.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx tsc -p tsconfig.test.json --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr6-3.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npm run check:arch"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr6-4.log
    sha256: 4a2cb249039fa49a4bbb98e9c6873b4f4a9f38fce08517a5c92bfe1ca7103719
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/modulos-base-pr6-5.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
VEREDITO: PASS
```

Unit: 6 suítes, 53 testes. Não rodei integração: nenhum caminho de integração mudou (ModuleSuggester e os testes novos são unit). A 1ª tentativa de `check:arch` na raiz deu exit 1 por "Missing script"; o gate roda em `server/`.

## Lacunas

- Nenhuma que pare o trabalho. Única leitura registrada: a do item 32, acima.

## Fora de escopo

- Front da entrevista. Não rodei integração, `docs:generate` nem o fold do vault (a nota foi editada à mão).
