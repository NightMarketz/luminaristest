---
name: sessao-instrumentacao
description: Sessão de INSTRUMENTAÇÃO — escreve o teste-guarda que FALHA pelo motivo da lacuna, sem tocar em código de aplicação. É o pré-requisito da sessão de correção. Use quando a lacuna está no GAP-MAP mas não existe teste que a reproduza. Triggers "escreve o teste que falha", "instrumenta essa lacuna", "prova a lacuna antes de corrigir", "sessão de instrumentação", "teste-guarda".
argument-hint: "[linha da lacuna no GAP-MAP + comportamento correto esperado]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  governance-skill-id: "SKL-SESS-INSTR"
  governance-version: "1.0.0"
  governance-status: "draft"
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
  decisão do dono sobre a lista, sem aparato novo).
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
timeout de ambiente). Critério de verificação: a suíte inteira roda, o
teste novo é o ÚNICO vermelho, e o motivo da falha é a asserção final —
não a preparação. Nenhuma linha de código de aplicação é alterada.

### Regras de escopo — invioláveis
1. PROIBIDO corrigir. Se a correção parecer óbvia e de uma linha,
   continua proibida — registre a observação no relatório. O fix
   pertence à sessão de correção, com este teste como guarda.
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
5. Qualquer decisão não coberta por este documento — inclusive escolha
   entre interpretações do comportamento correto esperado — deve ser
   registrada e a execução pausada. Interpretar comportamento esperado
   é decisão do dono, não sua.

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
   (caminho + nome do caso).
5. Relatório final: teste criado, motivo exato da falha (colar a
   mensagem), confirmação de zero mudança em código de aplicação, e
   "Achados fora de escopo" (mesmo vazia).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

**Comando da suíte no passo 1 — não improvise.** O baseline errado é o modo mais barato de envenenar a
sessão seguinte:

```bash
cd server && npm run test:integration
```

`npx jest --selectProjects integration` **cru** faz 29 de 41 suítes colidirem no mesmo SQLite — o
`npm run` passa `--runInBand`. Para unit, `npx jest` normal. Antes de reportar regressão, **isole a suíte**.

**Worktree novo não tem ambiente.** Se a sessão roda em worktree isolado (default do projeto), o passo 1
falha por motivo espúrio sem: `npm ci` (o `node_modules` não é herdado e o client Prisma junctionado do
main é stale) e um `.env` com `OPENAI_API_KEY=ci-dummy-openai-key` (integração devolve 500 sem ele).

**Ruído pré-existente conhecido:** há flake de saída do jest catalogado como ambiente, não diff. É
exatamente o que o passo 1 manda registrar antes de escrever qualquer coisa.

**A classe mais cara é a de omissão.** O BUG-1 (13 eventTypes fora da allowlist do audit → 500 + rollback)
sobreviveu a review independente e 1135 testes porque **os testes mockavam o colaborador**. Se a lacuna a
instrumentar for desse tipo, o teste precisa varrer a fonte e cruzar emitido-vs-declarado — o exemplar é
`auditAllowlistCoverage.test.ts`. Não confie em suíte verde que mocka o colaborador para provar caminho de
escrita.

## Pendência de ratificação do próprio template

Registrada, **não aplicada**: a definição de pronto diz "o teste novo é o **ÚNICO vermelho**", enquanto o
passo 3 diz "o único vermelho **novo**". Com ruído pré-existente conhecido no repo, a segunda formulação é
a executável. Proposta: alinhar a definição de pronto ao passo 3.
