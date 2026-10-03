# RUNBOOK: W3-CHOICE — Sign-off de browser da escolha "criar × customizar" por botões (FE-INCR-W3-CHOICE, item 14)

> Preparado por agente em 2026-10-03 contra a branch `claude/w3-choice-fe-items-7-14`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Spec: `docs/accounting/WIZARD-W3-ESCOLHA-CRIACAO-brief.md` itens 7–12.

Executor: [nome — humano]           Data: [____]
Autorização: dono, 2026-09-30 — "(a), corrige e depois b" / "Autorizar W3 + ratificar F-W3-2" (nota `docs/plano/nos/W3.md`).
Rastreio: `docs/plano/nos/W3.md` (`estado_detalhe`) — registrar o desfecho ali.

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = PR do FE-INCR-W3-CHOICE (commit: ______) em `main` ou a branch checada (anote qual) | `git branch --show-current` / `git log --oneline -3` | [ ] |
| P2 | BE #455 presente (`choicePrompt` na resposta) | `git log --oneline --grep=455` ou `grep -rn choicePrompt server/src` | [ ] |
| P3 | Servidor sobe (precisa de `AccountingBinding` `Active`; ver P2 do `RUNBOOK-H2-WIZARD-ENTREVISTA.md`) e `OPENAI_API_KEY` real em `server/.env` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P4 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P5 | Dois usuários **sem tabelas** (um para o caminho "criar", outro para "customizar") | `GET /api/dynamic-tables` → `data: []` | [ ] |
| P6 | DevTools na aba Network, filtro `ChatInterview` | — | [ ] |

## Passos

EVIDÊNCIA é sempre artefato colado/anexado (screenshot, corpo da requisição no Network) — nunca frase.

1. Com o usuário 1, abrir `/dashboard/setup` → aba **Entrevista com IA** e conduzir a conversa até a IA propor o preset.
   Resultado esperado: aparecem dois botões **"Criar o sistema agora"** e **"Customizar"** acima do campo de texto; o campo de texto continua visível.
   EVIDÊNCIA: [screenshot]

2. Clicar em **Criar o sistema agora**.
   Resultado esperado: abre modal com o nome do preset e **Confirmar** / **Voltar**; nenhuma chamada `ChatInterview` nova no Network.
   EVIDÊNCIA: [screenshot do modal + Network sem chamada nova]

3. Clicar em **Voltar**.
   Resultado esperado: o modal fecha; nada é enviado; os botões seguem na tela.
   EVIDÊNCIA: [screenshot + Network]

4. Clicar em **Criar o sistema agora** → **Confirmar**; dar duplo clique rápido em Confirmar.
   Resultado esperado: **1** `POST ChatInterview` com `"choice":"create"` no corpo; depois pergunta fiscal e `POST /api/dashboard/create` único.
   EVIDÊNCIA: [corpo da requisição (aba Payload) + lista do Network]

5. Com o usuário 2, repetir até os botões e clicar em **Customizar**.
   Resultado esperado: **sem modal**; 1 `POST ChatInterview` com `"choice":"customize"`; o painel de customização abre.
   EVIDÊNCIA: [payload + screenshot]

6. Com um usuário sem tabelas, no estágio dos botões, digitar "não quero customizar" e enviar.
   Resultado esperado: abre sozinho o modal "Você prefere não customizar…" com **Criar agora** / **Customizar mesmo assim**; os botões do modal enviam `create` / `customize` (sem 2º modal).
   EVIDÊNCIA: [screenshot do modal + payload do botão clicado]

7. No estágio dos botões, enviar texto ambíguo (ex.: "hmm").
   Resultado esperado: a mensagem do servidor aparece e os dois botões seguem; **nenhum** modal abre.
   EVIDÊNCIA: [screenshot]

8. Trocar o idioma para inglês e repetir os passos 1–2.
   Resultado esperado: rótulos e modal em inglês ("Create the system now", "Customize", "Back", "Confirm").
   EVIDÊNCIA: [screenshot]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima; NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha de `docs/plano/nos/W3.md` atualizada com o desfecho + data]
- Assinatura do executor: ____________
