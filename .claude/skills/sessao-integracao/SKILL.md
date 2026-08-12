---
name: sessao-integracao
description: Sessão de INTEGRAÇÃO — transporta branch já revisada para o alvo, resolvendo conflito só por regra pré-decidida, sem melhorar nada e sem consertar gate que falhe depois. Exige conteúdo já aprovado em sessão de review. Triggers "integra a branch", "faz o rebase da", "merge da branch X", "sessão de integração", "traz a branch para main".
argument-hint: "[branch de origem + alvo + onde está a autorização de integrar]"
allowed-tools: Read, Grep, Glob, Edit, Bash
metadata:
  governance-skill-id: "SKL-SESS-INTEG"
  governance-version: "1.0.0"
  governance-status: "draft"
  governance-owner: "engineering"
---

# Sessão de integração — transportar intacto, não melhorar

O conteúdo da branch é **fato consumado**: ele já passou por review em sessão própria. Aqui o trabalho é
transporte. Integração que "aproveita pra arrumar" destrói a rastreabilidade do que foi revisado.

> **Por que esta skill não tem `Write`:** resolução de conflito edita arquivo existente; o `git` cria os
> arquivos que vêm da origem. Precisar de `Write` significa estar criando conteúdo novo — que é
> exatamente o que a regra 1 proíbe. A ausência da ferramenta é a regra 1 materializada.

## Roteamento — quando NÃO é esta sessão

| Situação | Sessão correta |
|---|---|
| O conteúdo ainda tem pendência de review | Sessão de review (agente separado, worktree isolado) |
| A branch não existe ainda — o trabalho não foi feito | `sessao-planejamento` → `sessao-feature` |
| O gate falhou depois do merge e "só falta um ajuste" | **Nenhuma** — regra 5: pare e reporte; o diagnóstico é do dono |
| Gate humano ou dado externo trava o merge (ex.: fixture real da NF-e) | **Nenhuma** — runbook humano; ver `docs/operating-manual/RUNBOOK-FORMAT.md` |

---

## O formulário — preencher ANTES de executar

> Pré-requisito: este prompt só é preenchível para branch cujo conteúdo
> já foi revisado e aprovado em sessão própria. Integração NÃO é
> re-revisão nem oportunidade de melhoria: o conteúdo é fato consumado;
> o trabalho aqui é transportá-lo intacto. Se o conteúdo ainda tem
> pendência de review, a sessão correta é a de review, não esta.

### Contexto fixo (não rediscutir)
> Regra de preenchimento: todo campo abaixo deve conter conteúdo real do
> repositório. Campo que não se aplica deve ser APAGADO antes de abrir a
> sessão — placeholder ou exemplo deixado no formulário conta como
> decisão não coberta e dispara pausa imediata (regra 6).

- Branch de origem: [nome + commit HEAD atual + nº de commits]
- Alvo: [branch de destino + commit HEAD atual]
- Autorização: [decisão do dono que mandou integrar — documento + data]
- Superfícies de conflito conhecidas: [lista dos arquivos/áreas onde
  conflito é esperado, com a regra de resolução de cada uma decidida
  ANTES — ex.: "schema X: prevalece origem", "config Y: prevalece alvo"]
- Gate de saída: [comando(s) exato(s) que devem passar depois do merge —
  suíte, smoke gate, build — colar os comandos, não descrever]

### Definição de pronto (única)
A branch alvo contém o trabalho da origem, o gate de saída passa, e o
relatório de conflitos está completo. Nenhuma linha foi alterada além
do estritamente exigido pela resolução de conflitos.

### Regras de escopo — invioláveis
1. PROIBIDO melhorar. Código feio, nome ruim, oportunidade de refactor
   vista durante o conflito: transporta como está e registra em
   "Achados fora de escopo". Integração que "aproveita pra arrumar"
   destrói a rastreabilidade do que foi revisado.
2. Conflito em superfície CONHECIDA: resolva pela regra pré-decidida do
   formulário, e registre no relatório (arquivo, regra aplicada, diff
   da resolução).
3. Conflito em superfície NÃO listada: PARE nesse arquivo. Registre o
   conflito (os dois lados, colados), proponha resolução com
   justificativa, status PENDENTE, e siga apenas nos arquivos
   independentes dele. Resolução de conflito imprevisto é decisão do
   dono — a regra de "não escolher caminho por conta própria" vale
   dobrado aqui, porque o erro contamina histórico.
4. PROIBIDO reescrever histórico além do rebase autorizado: sem squash
   não pedido, sem reordenar, sem editar mensagem de commit.
5. Se o gate de saída falhar após o merge: PARE. Não conserte o código
   pra fazer o gate passar — a falha significa que uma resolução de
   conflito quebrou comportamento, e o diagnóstico é do dono. Registre
   qual gate falhou, a saída completa, e a lista de resoluções que
   tocaram área relacionada.
6. Qualquer decisão não coberta — inclusive "esse conflito conta como
   superfície conhecida ou nova?" — pausa e registro. Na dúvida, é nova.

### Sequência obrigatória
1. Registre o estado inicial: HEAD da origem, HEAD do alvo, resultado
   do gate de saída RODADO NO ALVO antes de qualquer coisa (baseline —
   sem isso, falha posterior não é atribuível).
2. Execute o rebase/merge por etapas, resolvendo conflito por conflito
   conforme regras 2 e 3.
3. Rode o gate de saída completo.
4. Relatório final: mapa de conflitos (cada um: arquivo, conhecido/novo,
   regra aplicada ou PENDENTE, diff da resolução), resultado do gate
   (baseline vs. final), confirmação de zero mudança fora de resolução,
   e "Achados fora de escopo" (mesmo vazia).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

**O baseline do passo 1 tem um pré-requisito próprio.** Em worktree novo o gate falha por ambiente, não
por código, e aí o baseline mente: rode `npm ci` e crie o `.env` com `OPENAI_API_KEY=ci-dummy-openai-key`
**antes** de medir. O client Prisma junctionado do main é stale.

**Gate de saída — os comandos que costumam entrar:**

```bash
cd server && npx tsc --noEmit && npm run test:integration
```

`npx jest --selectProjects integration` cru faz 29 de 41 suítes colidirem no mesmo SQLite. Some
`cd my-app && npx tsc --noEmit`, `npm run docs:generate` (se tocou rota/DTO documentado) e
`npm run smoke:migration` (se a origem traz migração).

**Armadilhas de histórico que a regra 4 cobre:**

- **Fila de PRs empilhadas:** rebaseie o **filho** ANTES de mergear o pai. Squash-merge com
  `--delete-branch` fecha o filho em vez de retargetá-lo.
- **Confirme a branch depois de todo checkout** antes de escrever — escrever no contexto errado é classe
  registrada aqui.
- **CI sob instabilidade:** o `ci.yml` tem `cancel-in-progress`. Dispare **um** rerun e não toque; rerun
  em cima de run boa mata a run boa. Flake de teardown de concorrência é distinto de outage — nesse caso
  rerun alvo é seguro.

**Precedente de resolução por união:** quando o CNAB conflitou em `docs.paths.ts`/`openapi.json`, a
resolução foi **união + regeneração** (`npm run docs:generate`), não escolha de lado. Se essa superfície
estiver na sua lista, essa é a regra que já tem precedente.

**Caso de referência para preencher o formulário — P1 (NF-e):**

| Campo | Valor verificado |
|---|---|
| Origem | `claude/nfe-fase-a`, HEAD `68df00f4`, 9 commits próprios |
| Alvo | `origin/main` — **156 commits** que a origem não tem |
| Superfícies conhecidas | `PayableDto` (tocado por #186/#188) · `openapi.json` + `docs.paths.ts` (união + regen) · **snapshot de shape dos DTOs** (#182 — o `NfeDto` é novo e o snapshot comitado vai precisar do caso novo) |
| Bloqueio anterior ao merge | Fixture real da NF-e (runbook X1) — o CI segura sozinho enquanto for sintético |

O near-miss que justifica o passo 1: já houve duplicata construída sobre `main` stale. Cheque
PR-merged + `git diff --stat origin/main..branch` antes de acreditar no que a branch contém.
