# RETORNO — W3 FE-INCR-W3-CHOICE (itens 7–14)

tarefa: botões "Criar o sistema agora" × "Customizar" no chat da Entrevista, com modal de confirmação (BRIEF `WIZARD-W3-ESCOLHA-CRIACAO-brief.md`, itens 7–14)
agente: sessão principal (sessao-feature), worktree w3-choice-creation-fe-ababb9; review independente: r1 por agente Opus separado em worktree isolada
base: origin/main d6530790 (BE #455 já presente)
modelo: sonnet-5.5/medio
perfil-previsto: sonnet-medio
custo: US$ 1.31 · claude-sonnet-5-5 US$ 1.31 · 5 min (`scripts/session-cost.mjs` na hora da escrita; não inclui o review)
veredicto: review r1 = FAIL (1 achado alto, corrigido em seguida; r2 não rodada) — não mergeado, merge só com OK do dono

## Checklist

| # | Item | Status | Onde / teste |
|---|---|---|---|
| 7 | Botões quando há `choicePrompt` | ✅ | `CreationChoice.tsx`; `CreationChoice.test.tsx` "item 7"; hook "item 7" (aparece e zera) |
| 8 | Customizar envia direto `choice:'customize'` | ✅ | "item 8" (sem modal) + hook "itens 8/9" (corpo com `choice`) |
| 9 | Criar → Modal canônico, só Confirmar envia | ✅ | "item 9": Voltar → 0 chamadas; Confirmar → 1 `create` |
| 10 | Negação abre Modal sozinha; Criar agora / Customizar mesmo assim (F-W3-B3: sem 2º modal) | ✅ | "item 10" |
| 11 | Erro/ambíguo: sem modal, mensagem + botões | ✅ | `it.each(initial/unclear/error)` |
| 12 | Em voo: botões desabilitados; duplo clique → 1 fetch | ✅ | `disabled` no componente + `choiceInFlight` (ref síncrona) no hook; hook "item 12" |
| 13 | i18n `common` pt+en | ✅ | 10 chaves `choice*` nos dois arquivos; JSON válido; `skill-audit run` 0 findings |
| 14 | Gates | ✅ máquina / ⏳ humano | tsc + `test:types` limpos; sign-off de browser: runbook em BRANCO (`docs/accounting/RUNBOOK-W3-ESCOLHA-CRIACAO.md`) — não preenchido, não assinado |

## Checks executados
- `cd my-app && npx vitest run features/interview` → 4 arquivos, 16 testes PASS (inclui os 2 arquivos novos e os 2 existentes)
- `cd my-app && npx tsc --noEmit` → exit 0, sem saída
- `cd my-app && npm run test:types` → exit 0, sem saída
- `node .claude/skills/skill-audit/skill-audit.mjs run` → 0 findings (gerou diff em `governance/coverage-auto.md`; revertido, fora de escopo)
- Não rodado: build de produção / navegador (gate humano); suíte completa do my-app (só o subtree `features/interview`)

## Diff resumido
- `useAiInterview.ts`: `handleSendMessage` extraído em `postTurn(msgs, choice?)`; novo estado `choicePrompt` (vem do turno, `?? null`), `sendCreationChoice`, trava `choiceInFlight`.
- `types/InterviewTypes.ts`: `CreationChoice`, `CreationChoiceReason`, `ICreationChoicePrompt` (espelho do BE).
- `CreationChoice.tsx` (novo) + montagem em `AiInterviewSetup/index.tsx` (acima do `InputArea`, texto livre mantido — F-W3-B2).
- 2 arquivos de teste novos; locales pt/en; runbook em branco.

## Review r1 (independente, Opus)
- **FAIL → corrigido:** `postTurn` mandava `presetKey`/`sessionId` = `null`; `ChatInterviewSchema` usa `z.string().optional()` e recusa `null` (400). Reproduzido pelo revisor com o schema; cadeia até o 400 do controller é inferida (não subiu servidor). Fix: omite os campos ausentes (`useAiInterview.ts`), teste do hook agora afirma que o corpo não tem `sessionId` nem `null`. **Atenção:** o defeito era anterior (mesma linha em `main`) e o envio por texto herda o fix — mudança de comportamento fora da letra dos itens 7–14, mas inevitável: os botões passam pela mesma chamada.  
- Baixo: modal mostra `presetKey`, não o nome (lacuna 1 acima, inalterada).
- Sabotagem do revisor: remover a trava `choiceInFlight` deixa o teste do item 12 vermelho (4 fetches em vez de 3).
- Não verificado: o 400 ponta a ponta contra o servidor real (só schema isolado). Fica no runbook, passo 4.

## Lacunas de spec
1. **Item 9 pede "o nome do preset" no modal.** A resposta do servidor só traz `presetKey` (não `presetName`; `ICustomizationState.presetName` só existe depois de customizar). Usei `presetKey` no texto. Se o dono quer o nome de exibição, é lacuna de contrato do BE (nó vizinho) — não alterei.
2. **Fechar o modal da negação (X/Esc/fora)** não está especificado. Implementei como dispensar: os dois botões do item 7 seguem na tela (o modal não reabre para o mesmo turno). Escolha minha, trivial de mudar.
3. **Mensagem de erro de rede** no clique (fetch falha): o hook mantém `choicePrompt` e mostra a mensagem genérica existente; spec não cobre.

## Achados fora de escopo
- Nenhum novo. (Os 3 do BRIEF §6 seguem como estão.)

## Gates de envio OPS-001
- Caso adversarial tentado: duplo clique no mesmo tick — `isLoading` só muda no render seguinte, então só o `disabled` não bastaria; o teste do hook dispara duas chamadas síncronas e exige 1 fetch (3 no total contando saudação e turno). Primeira rodada de testes falhou por erro meu de contagem (3 mensagens, não 2), corrigido no teste, não no código.
- Risco principal: nada foi visto em navegador; o comportamento visual (modal sobre o chat, layout dos botões) só está provado por jsdom. O sign-off humano do runbook é o oráculo.
- Viés declarado: o teste de componente mocka `t` (chave crua), então texto real/interpolação `{{preset}}` não é exercido.

Linha de fold (pós-merge, `docs/plano/README.md`): `id: W3`, `estado: inflight`, `estado_detalhe: parte (a) ✅ #454; BE ✅ #455; FE ✅ <PR> (sign-off de browser pendente: RUNBOOK-W3-ESCOLHA-CRIACAO); falta F-W3-1`, `prs: [#454, #455, <PR>]`.
