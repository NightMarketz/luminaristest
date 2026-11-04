---
id: "D-2026-11-04-RECURSOS-LOCAIS"
tipo: "decisao"
dominio: "operacao"
titulo: "Política de recursos da máquina: dependências compartilhadas, teste só do que mudou, sessões e cache de prompt"
estado: "decided"
autorizacao: "dono, chat, 2026-11-03: \"O projeto precisa parar de quando disparar alguns testes todos do sistema todo serem disparados, isso pesa o pc demais\"; 2026-11-04: \"Tenho certeza que os testes e os nodes que vem abrindo não tem configuração correta e estão fazendo retestes sem necessidade\" e \"Não da tbm pra criar isso como politica do projeto, assim como isolar testes apenas na suite que esta sendo mexida, caching de prompt e contexto tbm\""
atualizado: "2026-11-04"
---
# D-2026-11-04-RECURSOS-LOCAIS

**Estado:** `decided`. Vale para toda sessão de agente neste repositório, inclusive as abertas por outra sessão.

## Medição que motivou (03–04/11)

| O quê | Medido |
|---|---|
| Processos `node` vivos com 7 sessões em paralelo | 46, somando 7,1 GB (mais 16 do Chrome, 823 MB) |
| Instalações completas em 24 h | 27 `npm ci` (16 no `server`, 11 no `my-app`), uma por worktree nova |
| Worktrees no disco | 347, das quais 101 com `node_modules` próprio |
| `npx jest --selectProjects unit <caminho>` | roda as 448 suítes (o caminho vira nome de projeto); corrigido pelo #1019 |
| Skills de sessão | mandavam `npm run test:integration` (227 suítes, 4 shards de 8 GB); corrigido pelo #1019 |
| Sessões abrindo sessões | C1, C6, C7 e C8 abriram 7 sessões filhas em 03–04/11, cada uma com worktree e instalação novas |
| `--changedSince` na integração | 1 arquivo contábil mudado seleciona 191 das 227 suítes (todo teste importa o app) |
| O app caiu | 3 vezes em 03/11, por carga |

## Regras

### R1 — Dependências: depósito compartilhado, não `npm ci` por worktree

- Worktree nova roda `node scripts/worktree-deps.mjs` na raiz, e não `npm ci`. Cada versão de lockfile instala uma vez em
  `~/.luminaris-deps/<app>-<sha1>`, e a worktree ganha uma junção para lá. O cliente Prisma continua por worktree
  (`server/generated/prisma`, via `prisma generate`), então schema de branch diferente não vaza.
- `npm ci` local só quando o PR muda o `package-lock.json` — e mesmo aí pelo script, que instala o lockfile novo no
  depósito uma única vez.
- Para remover worktree: `git worktree remove`, nunca `rm -rf` (pode seguir a junção). Apagar o depósito é seguro: ele
  se refaz na próxima chamada.

### R2 — Teste só do que está sendo mexido

- **Unit:** o teste-guarda e os testes dos arquivos tocados, por caminho — `npx jest <caminho> --selectProjects unit`
  (caminho **antes** do `--selectProjects`). Para "tudo que depende do que mudei": `npm run test:changed`
  (`jest --changedSince=origin/main`).
- **Integração:** só o arquivo do comportamento, um por vez, `npx jest <arquivo> --selectProjects integration --runInBand`.
  Não existe "integração do que mudou": o `--changedSince` puxa quase tudo.
- **Front:** `npx vitest run <caminho>` ou `npm run test:changed` (`vitest run --changed origin/main`).
- **Suíte inteira é do CI.** Fora dele fica bloqueada sem `FULL_SUITE=1` (`scripts/test-scope-guard.cjs`, #1019).
- **Não repita gate sem mudança.** O mesmo teste só roda de novo depois de editar o código que ele cobre. A sabotagem
  roda só o teste-guarda. `tsc`, `check:arch` e lint, um de cada vez, uma vez por rodada de edição.
- **Build de produção só para conferência de tela**, um por vez na máquina, derrubado ao terminar.

### R3 — Sessões

- **Sessão aberta por sessão não abre outra.** Ela propõe o cartão, e o dono inicia (memória `sessao-filha-nao-dispara-neta`).
  Achado fora do escopo vira linha no relatório ou cartão, nunca sessão nova por conta própria.
- **Continue a sessão que tem o contexto** (`SendMessage`) em vez de abrir outra para o mesmo assunto. Sessão nova é
  worktree nova, `prisma generate` e cache frio.
- **No máximo 2 trabalhos pesados por máquina ao mesmo tempo** (jest de integração, `next build`, runner Puppeteer):
  o `scripts/heavy-slot.cjs` dá as vagas (`LUMINARIS_HEAVY_SLOTS`, padrão 2), e o terceiro espera mostrando quem ocupa.
  Era "3 sessões" até a emenda de 04/11 abaixo.

#### Emenda 2026-11-04 — onde cada trabalho roda e quanto uma sessão abre

Autorização: dono, chat, 2026-11-04: "Me da um prompt para implementar todas as 7 sugestões". Números ratificados pelo dono no mesmo
chat: fan-out "3 subag. · 3 cartões"; vagas pesadas "2 nos dois".

| O trabalho é… | Roda em | Por quê |
|---|---|---|
| Curto, na mesma worktree, sem instalação (ler, buscar, conferir doc, um teste com escopo) | **subagente** da sessão | herda a worktree e as dependências; nada de `npm ci`, `prisma generate` nem cache frio |
| Uma tarefa que o dono acompanha à parte (branch e PR próprios, outro nó do plano) | **sessão** local, proposta como **cartão** | worktree própria; o dono inicia, abre e para |
| Pesado (suíte inteira, várias integrações, build e varredura longos) | **sessão na nuvem**, quando o dono pedir | não disputa RAM nem as 2 vagas da máquina |

- **Fan-out:** no máximo **3 subagentes** ao mesmo tempo por sessão, e no máximo **3 cartões** de sessão propostos
  por turno. O resto vai para a fila do relatório.
- **Subagente não instala:** sem `npm ci`, `worktree-deps.mjs`, `prisma generate` ou build. Se a tarefa precisa disso,
  ela não é de subagente.
- **Sessão filha só propõe cartão** (já estava acima, e vale também para o coordenador aberto por sessão). O dono clica,
  ou digita "inicia" na sessão que propôs.
- **Sessão na nuvem só quando o dono pede.** Ela parte da branch publicada e não manda nota de volta: o resultado se lê
  no transcript dela.

### R4 — Cache de prompt e contexto

- O cache de prompt dura até 1 h sem uso. Sessão parada mais que isso no meio de uma tarefa paga o contexto inteiro de
  novo ao voltar. **Pausa longa → escreva o handoff e feche**, e retome numa sessão nova a partir dele.
- **Brief curto que aponta arquivos**, em vez de colar dossiê, diff ou log. Quem precisa do conteúdo lê.
- **Leitura cirúrgica:** `grep`/trecho por linha, não arquivo inteiro. Não releia arquivo já lido e não editado.
  Saída de comando com `tail`/`grep`, nunca o log inteiro.
- **Contexto acima de ~150k:** feche num passo fechado, faça push e handoff. Acima de ~180k não emende tarefa nova (já no
  CLAUDE.md).

## Mecanismos

| Regra | Mecanismo | Onde |
|---|---|---|
| R1 | `scripts/worktree-deps.mjs` | este PR |
| R2 suíte inteira | `scripts/test-scope-guard.cjs` no jest, vitest e shards | #1019 |
| R2 do que mudou | `npm run test:changed` no `server` e no `my-app` | este PR |
| R2, R3, R4 | texto no `CLAUDE.md` e nas skills de sessão | este PR e #1019 |
| R3 limite de 2 pesadas | `scripts/heavy-slot.cjs` no globalSetup da integração, no `npm run build` do my-app e no `run --` do runner de runbook | melhoria 1/7 (#1037) |
| R3 subagente × sessão × nuvem, fan-out 3 + 3 | sem mecanismo (regra de conduta) | melhoria 7/7 |
