---
name: sessao-instrumentacao
description: Sessão de INSTRUMENTAÇÃO — escreve o teste-guarda que FALHA pelo motivo da lacuna, sem tocar em código de aplicação. É o pré-requisito da sessão de correção. Use quando a lacuna está no GAP-MAP mas não existe teste que a reproduza. Triggers "escreve o teste que falha", "instrumenta essa lacuna", "prova a lacuna antes de corrigir", "sessão de instrumentação", "teste-guarda".
argument-hint: "[linha da lacuna no GAP-MAP + comportamento correto esperado]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  governance-skill-id: "SKL-SESS-INSTR"
  governance-version: "1.1.0"
  governance-status: "validated"
  governance-owner: "engineering"
---

# Sessão de instrumentação — o teste vem antes do fix

"Instrumentar antes de corrigir" é regra da casa comprovada (o #176 provou a mordida nos dois elos antes
do merge). Esta sessão produz **um teste vermelho pelo motivo certo** — e nada além disso.

O pronto não é *"o teste falha"*. É **"o teste falha pela asserção do comportamento"**. Um teste que
quebra por import errado ou fixture faltando satisfaz a versão ingênua e **envenena a sessão de correção
seguinte**, que vai bater na regra 3 dela e parar.

## Roteamento — quando NÃO é esta sessão

| Situação | Sessão correta |
|---|---|
| Já existe teste-guarda vermelho | `sessao-correcao` |
| A lacuna **não está** no GAP-MAP | Nenhuma — a moratória suspende rodada de descoberta (`CLAUDE.md` §⛔) |
| É feature ausente, não lacuna (o comportamento nunca existiu) | `sessao-planejamento` → `sessao-feature` |
| Gate humano ou dado externo | Nenhuma — runbook humano |

## Onde achar os campos

- **Lacuna:** `docs/operating-manual/GAP-MAP.md` — a linha exata, com nível (1–5 ou O) e a coluna Status.
- **Autorização:** a decisão do dono que priorizou aquela linha (o GAP-MAP registra que a triagem é
  decisão do dono sobre a lista, sem aparato novo). Se a lacuna virou nó do vault
  (`docs/plano/nos/PASSO-*.md` — ex.: GAP-MAP 7 = `PASSO-11`), a autorização é o campo `autorizacao` da
  nota; vazio = não roteia (ORCH-006).
- **Nó do vault, se houver:** o passo 4 atualiza o GAP-MAP **e** roda o fold no próprio PR
  (`node scripts/plano-vault.mjs fold <NÓ> --pr <n>`, `docs/plano/README.md` §Fold). Achado da faixa 1 da
  auditoria de estruturas implícitas é exceção: o PR não edita o `GAP-MAP.md` (ver passo 4).
- **Um PR só:** [OPS-006] (`.claude/skills/_OPERATING-GATES.md`; dono, 2026-11-10). Esta sessão e a
  `sessao-correcao` saem sempre num só PR, na mesma sessão de trabalho: commit `test:` (vermelho) e depois `fix:`.
- **Comportamento correto esperado:** uma frase. Se houver mais de uma leitura possível, **pare** — a
  regra 5 diz que interpretar comportamento esperado é decisão do dono.

---

## O formulário — preencher ANTES de executar

> Pré-requisito: este prompt só é preenchível para lacuna que já está
> LISTADA no GAP-MAP com decisão do dono priorizando-a. Instrumentar
> lacuna listada é permitido sob a moratória; usar esta sessão pra
> descobrir lacuna nova não é. Se durante a escrita do teste você
> encontrar outra lacuna, ela vai para "Achados fora de escopo" — não
> ganha teste nesta sessão.

### Contexto fixo (não rediscutir)
> Regra de preenchimento: todo campo abaixo deve conter conteúdo real do
> repositório. Campo que não se aplica deve ser APAGADO antes de abrir a
> sessão — placeholder ou exemplo deixado no formulário conta como
> decisão não coberta e dispara pausa imediata (regra 5).

- Lacuna: [linha exata do GAP-MAP — nível, tipo, descrição]
- Autorização: [referência à decisão do dono que priorizou — linha +
  data]
- Localização suspeita: [arquivo(s)/função(ões) onde o censo apontou a
  lacuna]
- Comportamento correto esperado: [uma frase: o que o sistema DEVERIA
  fazer e hoje não faz — é contra isso que o teste afirma]

### Definição de pronto (única)
Um teste novo que FALHA PELO MOTIVO DA LACUNA: a asserção que quebra é
a que expressa o comportamento correto esperado acima, e a mensagem de
falha evidencia a lacuna (não erro de import, não fixture quebrada, não
timeout de ambiente). Critério de verificação: os testes do escopo rodam (o novo + os do
mesmo módulo), o teste novo é o único vermelho NOVO (o ruído pré-existente registrado no
passo 1 não conta), e o motivo da falha é a asserção final — não a
preparação. Nenhuma linha de código de aplicação é alterada.

Forma alternativa — comando-guarda isolado: quando a lacuna é do próprio
ambiente de execução da suíte (ordem de arquivos, shard, cache, custo de
setup contra o timeout de hook) e não cabe numa asserção, o guarda pode
ser um comando que roda o caso mínimo explicitamente, sem depender da
composição do shard. Ele entra na coluna "Comando que prova" do GAP-MAP,
e a falha dele É a assinatura da lacuna (ex.: "Exceeded timeout … for a
hook" quando a lacuna é esse timeout — aí timeout não é ruído de
ambiente, é o motivo certo). Vale o mesmo critério: vermelho repetível
pelo motivo da lacuna, verde no controle que só difere da condição que
morde, e zero mudança em código de aplicação.

### Regras de escopo — invioláveis
1. PROIBIDO corrigir no commit `test:`. Ele sozinho tem de ficar
   vermelho pelo motivo certo. O fix entra depois, no commit `fix:` do
   mesmo PR, pelo formulário da sessão de correção e com este teste
   como guarda.
2. PROIBIDO alterar código de aplicação para "facilitar o teste". Se a
   lacuna for genuinamente intestável sem mudança no código (falta de
   injeção, acoplamento), isso é um ACHADO — registre "intestável como
   está, exige refatoração X" e PARE. A refatoração é decisão do dono.
3. O teste deve falhar pela asserção do comportamento, não pelo setup.
   Se você não conseguir montar o cenário (fixture impossível, dado
   inexistente), registre o bloqueio e PARE — teste que falha por setup
   quebrado envenena a sessão de correção seguinte.
4. Um teste por lacuna, a lacuna do formulário. Casos adjacentes que
   "valeria cobrir junto" vão pra "Achados fora de escopo".
5. Escolha entre interpretações do comportamento correto esperado é
   fork de produto: registre e pause. Interpretar comportamento esperado
   é decisão do dono, não sua. O mesmo vale para fork de lei, de
   arquitetura ou irreversível. Escolha de rotina (nome do caso,
   fixture, arquivo do teste) você faz e declara em "Escolhas tomadas"
   (dono, 2026-11-10, `D-2026-11-10-METODO-FABLE-5-2`). Na dúvida entre
   rotina e fork, é fork. Campo do formulário com placeholder continua
   sendo pausa imediata.

### Sequência obrigatória
1. Rode a suíte atual e registre o estado (o que já falha antes de
   você, se algo falha). Seu teste precisa ser distinguível do ruído
   pré-existente.
2. Escreva o teste afirmando o comportamento correto esperado.
3. Rode. Confirme: falha, é o único vermelho novo, e a falha é na
   asserção final com mensagem que evidencia a lacuna. Se falhar por
   outro motivo, corrija O TESTE (nunca a aplicação) até a falha ser a
   certa.
4. Atualize a linha da lacuna no GAP-MAP com a referência ao teste
   (caminho + nome do caso). Exceção: achado da faixa 1 da auditoria de
   estruturas implícitas não edita o `GAP-MAP.md` no PR (emenda de
   10/11 da `D-2026-11-10-FAIXA1-MERGE-LIVRE`); a referência ao teste
   vai no corpo do PR.
5. Relatório final: teste criado, motivo exato da falha (colar a
   mensagem), confirmação de zero mudança em código de aplicação, e
   "Achados fora de escopo" (mesmo vazia).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

**Comando da suíte no passo 1 — não improvise.** O baseline errado é o modo mais barato de envenenar a
sessão seguinte:

```bash
cd server && npx jest <teste-guarda> <testes dos arquivos tocados> --selectProjects unit
cd server && npx jest <arquivo>.integration.test.ts --selectProjects integration --runInBand   # um arquivo por vez
```

**Escopo, não suíte inteira** (dono, chat, 2026-11-03: "isso pesa o pc demais"). O caminho vem **antes** do
`--selectProjects`: depois dele o jest 30 lê o caminho como nome de projeto e roda as 448 suítes. Suíte inteira
(`npm run test:integration`, `npm test`, jest ou vitest sem caminho) é do CI do PR e fica bloqueada fora dele sem
`FULL_SUITE=1` (`scripts/test-scope-guard.cjs`). No relatório/PR, diga quais testes rodaram aqui e que a suíte
completa é a do CI.

Integração sempre com `--runInBand`: sem ele, as suítes colidem no mesmo SQLite. Antes de reportar regressão, **isole a suíte**.

**Worktree novo não tem ambiente.** Se a sessão roda em worktree isolado (default do projeto), o passo 1
falha por motivo espúrio sem: `npm ci` (o `node_modules` não é herdado e o client Prisma junctionado do
main é stale) e um `.env` com `OPENAI_API_KEY=ci-dummy-openai-key` (integração devolve 500 sem ele).

**Ruído pré-existente conhecido:** há flake de saída do jest catalogado como ambiente, não diff. É
exatamente o que o passo 1 manda registrar antes de escrever qualquer coisa.

**O motivo certo inclui a condição certa.** Classe nomeada pelo dono (2026-08-17, terceira instância em
dois dias): gate cujo predicado lê variável de ambiente que difere entre onde o teste roda e onde a
lacuna morde — worktree×raiz, sessão autônoma×interativa, branch×detached HEAD (SG-005 dormia em CI de PR
e só mordia em push na main — predicado corrigido no PR #203, o exemplo fica como registro da classe). Primos já catalogados no repo: Windows serializa SQLite (a CI Linux é o
oráculo), janela UTC 00:00–03:00, fixture SQL grava TEXT × Prisma grava INTEGER. Se o predicado da
lacuna lê branch, env var, cwd, SO, fuso ou modo de sessão, o teste-guarda deve reproduzir a CONDIÇÃO em
que ela morde — vermelho/verde fora da condição não é evidência. Condição irreproduzível localmente é
ACHADO: registre "a condição X só existe em Y; o push/CI é o teste" e não trate o resultado local como
prova.

**A classe mais cara é a de omissão.** O BUG-1 (13 eventTypes fora da allowlist do audit → 500 + rollback)
sobreviveu a review independente e 1135 testes porque **os testes mockavam o colaborador**. Se a lacuna a
instrumentar for desse tipo, o teste precisa varrer a fonte e cruzar emitido-vs-declarado — o exemplar é
`auditAllowlistCoverage.test.ts`. Não confie em suíte verde que mocka o colaborador para provar caminho de
escrita.

## Ratificações do próprio template

- **2026-10-09, dono (chat): "ratifica o item 3, alinha o template".** A definição de pronto dizia "o
  **ÚNICO vermelho**" e o passo 3 "o único vermelho **novo**"; alinhada ao passo 3. Na mesma ratificação,
  entrou o **comando-guarda isolado** como forma aceita de guarda (origem: instrumentação do shard 2/4 de
  integração, PR #588, em que o guarda era um comando com o banco-modelo frio, não um teste da suíte).
