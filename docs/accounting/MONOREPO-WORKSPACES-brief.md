# BRIEF — MONOREPO-WORKSPACES (melhorias 5 e 6 de 7)

**Estado:** BRIEF — **melhoria 5 (pnpm) PARADA** pelo dono depois do spike (chat, 2026-11-04: "Sim, parar o pnpm").
Fica o depósito do #1034. Segue só a **melhoria 6 (cache de tarefa)**: o PR-A (`tsc --incremental`) está pronto para um
`executa`. F-MW-9 = npm workspaces + Turborepo; F-MW-10 = turbo fixo em 2.8.21 (o ≥ 2.9 não roda nesta CPU). O próximo
passo é o spike do item 20 (seção 0.3), que precisa de `executa`. Nenhum código.

## 0.2 Decisão depois do spike (dono, chat, 2026-11-04: "Sim, parar o pnpm")

- **Melhoria 5 parada.** Os itens 1–10 e os PRs PR-0, PR-1, PR-2 e PR-4 ficam **arquivados**, e o texto continua abaixo
  como registro. O que destrava uma reabertura: um pnpm em JS (não binário nativo) em que o depósito global resolva os
  tipos do my-app, ou o depósito do #1034 deixar de servir.
- **Ficam valendo:** F-MW-6 (cache nativo primeiro, depois um executor) e F-MW-7 (integração nunca vem do cache). Os forks
  F-MW-2, 3, 4, 5 e 8 só valiam para o pnpm e saem de cena.
- **F-MW-9 — RATIFICAÇÃO PENDENTE: o Turborepo sem pnpm.** O Turborepo precisa de um workspace de gerenciador de pacotes.
  Com npm, isso quer dizer `"workspaces"` no `package.json` da raiz, e o npm passa a querer **um** `package-lock.json` na
  raiz. Isso desmancha os dois lockfiles por app, o depósito do #1034 (que tem uma chave por lockfile de app) e o
  Dependabot por diretório.
  - (a) npm workspaces + Turborepo, refazendo o depósito com uma chave para o lockfile da raiz;
  - (b) só o cache nativo (PR-A), e o Turborepo fica para quando houver workspace;
  - (c) um executor que não exija workspace.
  - **Recomendação: (b).** O PR-A ataca a 2ª rodada do `tsc` (9,1 s) sem mexer em instalação. O ganho do Turborepo entre
    tarefas não paga desmontar o depósito que acabou de ser provado.
  - **→ Ratificado: (a), npm workspaces + Turborepo, contra a recomendação** (dono, chat, 2026-11-04: "npm workspaces +
    turbo"). Plano na seção 0.3.

## 0.3 Caminho ratificado no F-MW-9: npm workspaces + Turborepo (nenhum código ainda)

**Restrição medida em 04/11 (`npx -y turbo@<v> --version` nesta máquina):** o Turborepo é binário nativo, e da 2.9 em
diante ele não roda nesta CPU, com o mesmo erro do pnpm 12 (`Fatal Error: HW capability … requested: 0x20000000`).

| Versão | Resultado |
|---|---|
| 2.3.4, 2.5.8, 2.6.3, 2.7.6, 2.8.21 | roda |
| 2.9.18, 2.10.13, 2.11.10 (a mais nova) | **não roda** |

Daí o fork novo:

- **F-MW-10 — RATIFICAÇÃO PENDENTE: aceitar o Turborepo preso na 2.8.21?**
  - (a) Fixar `turbo@2.8.21` e pôr no Dependabot um `ignore` para `>= 2.9`. Fica sem correção nova enquanto a máquina for
    esta. O CI (Linux) poderia rodar a mais nova, mas aí os dois divergem.
  - (b) Nx, que também tem núcleo nativo e não foi testado nesta CPU. Testar antes de escolher.
  - (c) Voltar ao F-MW-9 (b): só o cache nativo.
  - **Recomendação: (c), ou então (a) com data para revisar.** Uma ferramenta de build presa em versão antiga por causa
    da CPU de uma máquina é dívida que cresce a cada release.
  - **→ Ratificado: (a), fixar `turbo@2.8.21`** (dono, chat, 2026-11-04: "Fixar turbo 2.8.21"). Consequências que entram
    no checklist:
    - `turbo` exato em `2.8.21` no `package.json` da raiz (sem `^`), igual no CI e local: uma versão só, sem divergência;
    - `ignore` no `.github/dependabot.yml` para `turbo` com `versions: [">= 2.9.0"]`, com comentário apontando esta seção;
    - **data de revisão: não definida pelo dono.** Fica como pendência: reabrir quando a máquina de trabalho mudar, ou
      quando uma release do turbo voltar a rodar aqui (`npx -y turbo@<nova> --version`).

**Itens do caminho (F-MW-10 = (a), fixar a 2.8.21):**

14. **Workspace npm** — `package.json` da raiz com `"private": true` e `"workspaces": ["server", "my-app"]`.
15. **Lockfile único na raiz** — o npm de workspace quer um só `package-lock.json`. **Insumo ausente:** se o
    `npm install --package-lock-only` na raiz preserva as versões dos dois lockfiles de hoje (o `pnpm import` não
    preservava). Prova: o mesmo comparador de diretos do spike (62/62 e 45/45).
16. **Hoisting** — o npm de workspace iça para o `node_modules` da raiz. As dependências fantasmas continuam resolvendo,
    e o cartão "Declarar dependências fantasmas" segue valendo para não depender disso.
17. **Depósito do #1034 rechaveado** — uma entrada por lockfile da raiz, e a junção passa a ser o `node_modules` da raiz
    (mais as pastas por app que o npm criar). Muda o `worktree-deps.mjs`, o `session-start-deps.mjs` e o R1.
18. **CI, Docker, Dependabot** — `cache-dependency-path: package-lock.json`, `npm ci` na raiz, Dockerfiles com contexto na
    raiz, e Dependabot em `/`. São os mesmos efeitos que o F-MW-2 teria tido no pnpm.
19. **`turbo.json`** — o contrato da seção 2, com `test:integration` em `cache: false` (F-MW-7). `turbo` fixo em
    `2.8.21` e o `ignore` do Dependabot (F-MW-10). Prova: `npx turbo --version` → `2.8.21` local e no CI.
20. **Primeiro passo: um spike**, como o PR-0, mas com npm. Itens 15 e 17 e os 8 comandos do item 1, mais
    `turbo run typecheck` duas vezes, a 2ª vinda do cache. Precisa do seu `executa`.

## 0. Ratificação (dono, chat, 2026-11-04)

| Fork | Resposta do dono (literal) | Recomendação | Efeito no BRIEF |
|---|---|---|---|
| F-MW-1 | "Só o spike (Recomendado)" | igual | só o PR-0 está liberado; migrar depende do resultado |
| F-MW-2 | "Um só na raiz" | **contra** (era um por app) | um `pnpm-lock.yaml` na raiz; o `my-app/Dockerfile` passa a construir com contexto na raiz (item 7); Dependabot em `/` (item 8) |
| F-MW-3 | "Tirar se o spike passar (Recomendado)" | igual | o `server/.npmrc` sai no PR-1 se o PR-0 instalar sem ele; se não, volta como pergunta |
| F-MW-4 | "Mesmo PR (Recomendado)" | igual | lockfile, CI e Docker num PR só (PR-1) |
| F-MW-5 | "Conferir na doc antes (Recomendado)" | igual | antes do PR-1, confirmar na doc do GitHub o suporte do Dependabot ao pnpm 11; sem suporte, volta como pergunta |
| F-MW-6 | "Turborepo + incremental (Recomendado)" | igual | PR-A (`tsc --incremental`) independente; PR-3 com `turbo.json` |
| F-MW-7 | "Nunca (Recomendado)" | igual | `test:integration` com `cache: false` |
| F-MW-8 | "pnpm 11 (Recomendado)" | igual | `packageManager: pnpm@11.x` pelo corepack; o PR-0 confirma o corepack no Node 22 |
**Sessão:** `sessao-planejamento`, 04/11/2026.

## Contexto fixo

- **Item a planejar:** a FASE B do pedido de 04/11, que junta as melhorias 5 e 6 "porque as duas exigem workspaces":
  - pnpm com depósito virtual global no lugar do `worktree-deps.mjs` e do `npm ci`;
  - cache de resultado de tarefa;
  - plano de migração em PRs pequenos, com critério de reversão e medição antes/depois.
- **Autorização:** dono, chat, 2026-11-04: *"Me da um prompt para implementar todas as 7 sugestões"*. A FASE B diz:
  *"estruturais, pela sessao-planejamento (BRIEF + forks, SEM código)"* … *"Forks em aberto como perguntas para mim.
  Pare ao entregar o BRIEF."*
- **Divergência registrada (passo 1):** o item não tem nota de nó em `docs/plano/nos/`. É frente operacional autorizada
  direto no chat, como a `D-2026-11-04-RECURSOS-LOCAIS`. O BRIEF sai num PR próprio, como os BRIEFs anteriores (#1010),
  embora a regra 1 do formulário diga "não cria branch" (pendência 2 do próprio template).
- **Insumos (fato consumado):**

| Artefato | O que fixa |
|---|---|
| `D-2026-11-04-RECURSOS-LOCAIS` (#1034) | R1: depósito por lockfile; R2: teste só do que mudou; R3: 2 vagas pesadas (emenda #1040) |
| `scripts/worktree-deps.mjs` (#1034) | depósito em `~/.luminaris-deps/<app>-<sha>`, chave = comando + lockfile + package.json, junção na worktree, `prisma generate` local |
| `scripts/session-start-deps.mjs` + `.worktreeinclude` (#1038) | preparação automática da worktree |
| `scripts/heavy-slot.cjs` (#1037) | semáforo de trabalho pesado |
| `scripts/test-scope-guard.cjs` (#1019) | suíte inteira só no CI |
| `allowScripts` em `server/package.json` e `my-app/package.json` (#1034) | server: prisma, @prisma/client, @prisma/engines, @swc/core, unrs-resolver; my-app: esbuild, sharp, unrs-resolver; bloqueados: puppeteer, @scarf/scarf, core-js |
| `server/.npmrc` | `legacy-peer-deps=true` |
| `.nvmrc` | `22` (CI); localmente Node 24.20 e npm 11.19 |
| `.github/workflows/ci.yml` | `actions/setup-node` com `cache: npm` por `cache-dependency-path` de cada app; 22 chamadas `npm ci`/`npx`/`npm run`; cache do jest por shard e do `.next/cache` |
| `.github/dependabot.yml` | ecossistema `npm` em `/server` e `/my-app`, `docker` em `/server` e `/my-app` |
| `server/Dockerfile`, `my-app/Dockerfile` | `npm ci`; o do my-app constrói **só com a pasta `my-app/`** |
| `server/stryker.config.mjs` | `testRunner: 'jest'`, `inPlace: true` (fixtures por caminho relativo) |
| `server/jest.config.js` | `transformIgnorePatterns: ['/node_modules/(?!(uuid\|@qdrant/js-client-rest)/)']` |

- **Nós vizinhos:** este BRIEF consome o `worktree-deps.mjs` e o hook (que ele substitui) e o `heavy-slot` (que ele
  mantém). É consumido pelas 5 skills `sessao-*` (124 ocorrências de `npm ci`/`npx`/`npm run` em `.claude/skills`), pelo
  `CLAUDE.md` e pelo `server/CLAUDE.md`.

## Fontes externas (lidas em 04/11/2026)

- **pnpm** ([global-virtual-store](https://pnpm.io/global-virtual-store), [settings](https://pnpm.io/settings),
  [build](https://pnpm.io/settings/build); as páginas não mostram data nem versão).
  - O modo se liga com `virtualStoreType: global` no `pnpm-workspace.yaml`. A doc diz que ele está "currently disabled by
    default for project installs and marked as experimental" e que "is most useful when you have multiple checkouts …
    such as when using git worktrees".
  - Em CI ele "is generally not useful".
  - Layout: `<store>/links/@/<pkg>/<versão>/<hash>/node_modules/<pkg>`, com um segmento `node_modules` no caminho.
  - Windows não é citado.
  - Scripts de instalação: `allowBuilds` substituiu o `onlyBuiltDependencies` "in v11". O padrão bloqueia, com
    `strictDepBuilds: true`.
- **Turborepo** ([caching](https://turborepo.dev/docs/crafting-your-repository/caching) e
  [configuration](https://turborepo.dev/docs/reference/configuration), atualizadas em 02/11/2026).
  - `inputs` padrão: "all files in the package that are checked into source control". `outputs` vazio guarda só os logs.
  - `envMode` padrão `strict`. Cache local em `.turbo/cache`.
  - Em worktree, quando não há `cacheDir`, "Turborepo automatically shares the cache with the main worktree".
  - Windows não é citado.
- **Nx** ([cache-task-results](https://nx.dev/docs/features/cache-task-results)). O cache fica em `~/.nx/<id>/cache`,
  compartilhado entre checkouts, e as entradas ficam "for a week".

## Medição de antes (04/11/2026, máquina carregada: 2–3 outras sessões rodando, ~8,7 GB livres de 31,2 GB)

| Medida | Hoje | Como foi medida |
|---|---|---|
| Instalação, worktree nova, lockfile já no depósito | **2,6 s** (`worktree-deps.mjs server`) + `prisma generate` | prova do #1034, worktree `prova-deposito-1034b` |
| Instalação, lockfile novo no depósito (cache do npm quente) | server 22 s (996 pacotes), my-app 20 s (798) | idem, depois da correção da chave |
| Hook de sessão numa worktree limpa | 4 s (server + my-app pelo depósito) | prova do #1038 |
| Disco por worktree | ~0 (junção) + `server/generated/prisma`; antes do depósito, ~351 MB só de `server/node_modules` | uma worktree removida em 04/11 tinha 24.525 arquivos, 351 MB |
| Disco do depósito | 6 entradas em `~/.luminaris-deps`; **tamanho não medido** (o `du` não terminou com a carga) | — |
| 2ª rodada sem mudança: `tsc` do server | 9,1 s (1ª: 9,8 s) | `npx tsc --noEmit`, runbook do Dev Drive (#1042) |
| 2ª rodada sem mudança: 1 arquivo de integração | 5,3 s (1ª: 6,3 s) | `auth.routes.integration.test.ts`, idem |

**Leitura:** o depósito do #1034 já derrubou a instalação por worktree de ~20 s (e 27 `npm ci` por dia) para 2,6 s. O ganho
que sobra para o pnpm é menor do que parecia quando a melhoria 5 foi pedida. Isso é o F-MW-1.

## 0.1 Resultado do spike PR-0 (04/11/2026, pnpm 11.28.9, Windows 11, Node 24.20)

Rodado em worktrees descartáveis (`spike-pnpm-a/b/c`, branch local `spike/pnpm-pr0-local`, nunca publicada), com o
`pnpm-workspace.yaml` do contrato da seção 2. **Parcial:** parou no item 5b porque o hook do projeto proíbe esta sessão
de editar arquivo de outra worktree (era preciso mudar o `jest.config.js` do spike). `next build` e `stryker` não rodaram.

| # | Comando | Depósito global **ligado** | Depósito global **desligado** (pnpm clássico) |
|---|---|---|---|
| 0 | Converter os lockfiles (F-MW-2 = raiz) | `pnpm import` **não converte** para um lockfile só: usa o do app onde roda e resolve o outro do zero (28 diretos do server ou 14 do my-app mudariam). Mesclando à mão os dois lockfiles por app (script do spike): `--frozen-lockfile` aceita, 62/62 e 45/45 diretos iguais; 19 snapshots de mesma versão com transitivas diferentes ficaram com a do server | igual |
| 1 | `pnpm install` na 1ª worktree | 40 s, exit 0; `strictDepBuilds` passou com a lista do `allowScripts`; `prisma generate` no postinstall | — |
| 2 | `pnpm install` numa worktree limpa | **4,2 s e 3,6 s**, exit 0, nada baixado (depósito do #1034, mesma condição, server + my-app: **3,8 s**) | **21,8 s**, `node_modules` da worktree com 1,2 GB contados pelo `du` (o pnpm usa clone/hardlink no Windows; o disco real é menor, não medido) |
| 3 | `prisma generate` | ok (postinstall) | ok |
| 4a | `tsc` do server | exit 2: `dotenv` não está no `server/package.json` (dependência fantasma); com `publicHoistPattern: [dotenv]`, **0 erros** | 0 erros (com o mesmo hoist) |
| 4b | `tsc` do my-app | exit 2, **5–6 erros** de tipo depois do hoist de `@dnd-kit/*`, `@fullcalendar/*`, `styled-jsx` (fantasmas): o `contentStyle` do recharts e o `<style jsx>` não acham o `@types/react` do projeto pelo caminho do depósito global; `addMissingPeerTypes: true` não resolve | **0 erros** |
| 5a | jest unit, `PostingService.test.ts` | — | 92 passed, exit 0 |
| 5b | jest integração, `auth.routes.integration.test.ts` | — | exit 1: `uuid` (só ESM) não transformado, porque o `transformIgnorePatterns` não reconhece `node_modules/.pnpm/<pkg>/node_modules/`. Correção candidata, **não testada** (bloqueio do hook): `'/node_modules/(?!(\.pnpm/[^/]+/node_modules/)?(uuid\|@qdrant/js-client-rest)/)'` |
| 6 | vitest, `__tests__/users/fixAuthContaLote4.test.tsx` | — | 3 passed, exit 0 |
| 7 | `next build` | não rodou | não rodou |
| 8 | `stryker run --dryRunOnly` | não rodou | não rodou |

**Leitura contra o critério do item 1:**
- **Correção do critério:** o "≤ 2,6 s" comparava com o depósito só do server. Na mesma condição, server + my-app, o
  depósito leva 3,8 s.
- **Depósito global ligado:** empata com o depósito (3,6–4,2 s contra 3,8 s), mas **quebra o `tsc` do my-app**. Reprova.
- **Depósito global desligado:** passa no que rodou, com 3 correções (hoist das dependências fantasmas e a regex do
  jest). Leva 21,8 s por worktree, contra 3,8 s do depósito. Reprova no tempo.
- **Pelo critério ratificado, o spike reprova nas duas configurações.** A decisão de parar a migração ou de testar outra
  coisa é do dono.

**Achados que valem com ou sem pnpm** (fora do escopo; viram cartão ou linha de relatório):
- **Dependências fantasmas:** o código importa pacote que não está no próprio `package.json` e só funciona porque o npm
  iça tudo para a raiz:
  - server: `dotenv` (`src/config/env.ts`);
  - my-app: `@dnd-kit/utilities`, `@fullcalendar/core` (locales) e os tipos de `styled-jsx`.

**Fato novo para o F-MW-8:** o pnpm mais recente é o **12.16.1** (`npm view pnpm dist-tags`, 04/11). O fork comparou só o
10 com o 11.

**pnpm 12 (dono, chat, 04/11: "Testar o pnpm 12"): não roda nesta máquina.**
- O pacote `pnpm@12.16.1` só traz binário nativo (`optionalDependencies`: `@pnpm/exe.win32-x64` e afins).
- `corepack pnpm@12.16.1 --version` e `npx pnpm@12.16.1 --version` saem com `Fatal Error: HW capability found:
  0x178BFBFF 0xFED8320B, but HW capability requested: 0x20000000 0x00`.
- O binário exige uma capacidade de CPU que este processador não tem. Nenhum comando do spike chegou a rodar.
- Consequência: o pnpm 12 também fica fora para qualquer colaborador com CPU parecida. Só o pnpm 11 (JS) roda aqui.

## 0.4 Resultado do spike de npm workspaces + turbo 2.8.21 (04/11/2026; dono, chat: "Executa o spike")

Rodado **nesta worktree** (`gifted-shaw-ddc107`, por causa do hook que proíbe escrever em outra), numa branch local
descartável a partir da `main` (`23d3eee1`), com Node 24.20 e npm 11.19. Nada foi versionado, e a worktree voltou ao estado
anterior.

| # | Passo | Resultado |
|---|---|---|
| 15a | `npm install --package-lock-only` na raiz, com `"workspaces": ["server","my-app"]` | exit 0 em 31 s, mas **re-resolve**: server com 5 diretos e 59 transitivos diferentes (ex.: `openai` 7.43.0→7.50.0, `typescript` 5.9.2→5.9.3); my-app com 14 diretos e 300 transitivos |
| 15b | **Mescla dos dois `package-lock.json`** no lockfile da raiz (script do spike: o server fica na raiz; do my-app, o que for igual em versão e integridade é compartilhado e o resto vai para `my-app/node_modules`) | **server 875/875 e my-app 866/866 pacotes de topo iguais aos de hoje**; 263 compartilhados e 603 realocados |
| 1 | `npm ci` na raiz com o lockfile mesclado | exit 0 em 40 s, 1.534 pacotes, **sem `--legacy-peer-deps`** (o "Missing: openapi-types" do #949 não aparece) |
| 3 | `npx prisma generate` | exit 0, 2,8 s |
| 4a | `npx tsc --noEmit` (server) | exit 0, 0 erros, 11,5 s |
| 4b | `npx tsc --noEmit` e `npm run test:types` (my-app) | exit 0 e exit 0, 0 erros (as dependências fantasmas resolvem pelo hoisting; o #1045 as declara de vez) |
| 5a | jest unit `PostingService.test.ts` | 92 passed, exit 0 |
| 5b | jest integração `auth.routes.integration.test.ts` | 5 passed, exit 0 (27 s, com o banco-modelo frio). O `transformIgnorePatterns` atual funciona: o npm não usa o caminho `.pnpm` |
| 6 | vitest `__tests__/users/fixAuthContaLote4.test.tsx` | 3 passed, exit 0 |
| 7 | `npx next build` | exit 0 em 37 s |
| 8 | Stryker `--dryRunOnly`, com escopo de 1 arquivo e 1 teste | **o dry-run passou** (92 testes) **e o processo não saiu**: ficou vivo mais de 9 min com 2 filhos e deixou o `PostingService.ts` instrumentado (modo `inPlace`). Restaurado com `git checkout`, e a árvore do processo encerrada. **Não se sabe** se o travamento vem do workspace ou também acontece na `main`: falta a mesma rodada de controle |
| 19 | `turbo run typecheck` (turbo 2.8.21, dois apps) | 1ª: 2 tarefas executadas, 11,0 s; **2ª, sem mudança: 2/2 do cache, 1,3 s** ("FULL TURBO"); com um arquivo do server mudado: server com cache miss e my-app com cache hit |
| 17 | Depósito rechaveado e reuso numa 2ª worktree | **não medido**: exige mudar o `worktree-deps.mjs` e outra worktree, e o hook bloqueia escrever fora desta |

**O que o turbo exige e o BRIEF ainda não tinha:**
- campo `packageManager` no `package.json` da raiz (`Could not resolve workspaces. Missing packageManager field`);
- **telemetria anônima ligada por padrão**: desligar no repositório (variável `TURBO_TELEMETRY_DISABLED=1` no CI e no
  ambiente das sessões, ou `turbo telemetry disable`). No spike, desligada pela variável;
- um script `typecheck` em cada app (hoje não existe; no spike, entrou temporariamente com `npm pkg set`).

**Leitura:**
- O caminho npm workspaces + turbo 2.8.21 **funciona em tudo o que rodou**, desde que o lockfile da raiz seja **mesclado**,
  e não gerado, se o objetivo é não subir versão.
- O cache de tarefa entrega o prometido: a 2ª rodada do `typecheck` cai de 11,0 s para 1,3 s.
- Em aberto:
  - o travamento do Stryker na saída;
  - o reuso do depósito rechaveado (item 17);
  - o `allowScripts` do npm 11 no workspace: o `npm install` avisou que `sharp`, `esbuild` e `core-js` têm script não
    aprovado, e falta saber se a lista passa dos `package.json` dos apps para o da raiz.

**F-MW-11 — RATIFICADO: como nasce o lockfile da raiz no PR-3?**
- (a) Mesclado pelo script do spike, sem subir nenhuma versão.
- (b) Gerado pelo npm (`npm install --package-lock-only`), aceitando os bumps de uma vez (19 diretos e 359 transitivos), com
  o CI inteiro como prova.
- **Recomendação: (a).** O PR-3 fica só estrutural, e os bumps continuam vindo pelo Dependabot, um grupo por vez. O script
  de mescla entra no PR como ferramenta de uso único e sai depois.
- **→ Ratificado: (a), mesclado** (dono, chat, 2026-11-04: "Mesclado"). O PR-3 gera o `package-lock.json` da raiz pela
  mescla. A prova é o comparador do spike: 875/875 e 866/866 iguais aos lockfiles de hoje, mais `npm ci` exit 0. O PR-3
  também traz `packageManager` na raiz, a telemetria do turbo desligada e o script `typecheck` nos dois apps. Ele ainda
  depende de um `executa` e deixa em aberto o Stryker na saída, o reuso do depósito rechaveado e o `allowScripts` no
  workspace.

## 1. Checklist de comportamentos (cada um testável sozinho)

Só entram os que valem **qualquer que seja** o fork. Os que dependem de fork estão marcados com `[F-MW-n]`.

1. **PR-0 — spike, sem merge** `[F-MW-1]`. Numa branch descartável: `pnpm import` nos dois apps e
   `virtualStoreType: global`. Rodar e medir, um por vez:
   1. `pnpm install` na 1ª worktree;
   2. `pnpm install` numa 2ª worktree limpa;
   3. `prisma generate`;
   4. `tsc` do server e do my-app;
   5. jest de 1 arquivo unit e de 1 arquivo de integração;
   6. `vitest` de 1 arquivo;
   7. `next build`;
   8. `stryker run --dryRunOnly`.

   Critério de passar: os oito com o mesmo exit de hoje, e a 2ª worktree em ≤ 2,6 s, que é o tempo do depósito. Senão, o
   BRIEF para no PR-0 e o depósito fica.
2. **Workspace na raiz** `[F-MW-2]` — `package.json` raiz privado e `pnpm-workspace.yaml` com `packages: [server, my-app]`.
   A versão do pnpm vai fixada em `packageManager`. Prova: `pnpm -r exec node -e "1"` passa nos dois.
3. **Lockfile** `[F-MW-2]` — `pnpm import` a partir dos `package-lock.json` atuais, sem subir versão. Prova: um script de
   diff lista as versões resolvidas antes e depois, e as duas listas são iguais.
4. **Scripts de instalação** — o `allowScripts` do #1034 vira `allowBuilds` no `pnpm-workspace.yaml`, com a mesma lista de
   permitidos e de bloqueados. Prova: `pnpm install` com `strictDepBuilds: true` sai 0, e o puppeteer não baixa Chromium.
5. **Peer deps** `[F-MW-3]` — o `legacy-peer-deps=true` do server sai. Prova: `pnpm install` passa sem ele, e o
   `openapi-types` (o "Missing" do #949) aparece resolvido.
6. **CI** `[F-MW-4]` — `pnpm/action-setup` (SHA fixado, como os outros), `setup-node` com `cache: pnpm`,
   `pnpm install --frozen-lockfile`, e o global virtual store **desligado** no CI (a doc diz que não serve lá). Prova: o CI
   do PR fica verde, com o tempo de cada job anotado contra a última run verde da `main`.
7. **Docker** `[F-MW-2 = lockfile na raiz]` — os dois Dockerfiles com `corepack`/pnpm e `--frozen-lockfile`. Como o
   lockfile fica na raiz, o build passa a ter contexto na raiz: o `docker-compose.yml` e o job `docker-build` do `ci.yml`
   mudam o `context`, e o Dockerfile copia `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json` da raiz e só a pasta do
   app (`pnpm install --frozen-lockfile --filter <app>...`). Um `.dockerignore` na raiz tira a outra pasta e os
   `node_modules`. Prova: o job `docker-build` fica verde e a imagem do my-app não contém `server/`.
8. **Dependabot** `[F-MW-2]` `[F-MW-5]` — o ecossistema `npm` passa de `/server` e `/my-app` para `directory: /`, onde
   está o lockfile, mantendo os grupos de minor/patch. Prova: um PR do Dependabot depois do merge altera o
   `pnpm-lock.yaml`.
9. **Chamadas `npx`/`npm run`** — os 3 scripts do server que chamam npm (`build`, `prebuild`, `test`), as 22 do `ci.yml`, os
   13 scripts em `scripts/` e `server/scripts/` que chamam `npx`, e as 124 ocorrências nas skills passam a chamar
   `pnpm`/`pnpm exec`. Prova: `git grep -n -E "npm ci|npx " -- ':!docs/**' ':!*.md'` fica vazio, salvo as exceções listadas
   no PR.
10. **Saída do depósito** — `worktree-deps.mjs` e `session-start-deps.mjs` passam a chamar `pnpm install --frozen-lockfile`.
    Depois, num PR à parte, o `worktree-deps.mjs` é apagado e o R1 da `D-2026-11-04-RECURSOS-LOCAIS` ganha emenda.
    Prova: a worktree limpa de pé pelo hook, e o tempo do hook medido.
11. **Cache de tarefa** `[F-MW-6]` `[F-MW-7]` — o executor escolhido no F-MW-6 com tarefas `typecheck`, `lint`, `test:unit`
    e `build`, cada uma com `inputs` estreitos. Testes usam `outputs: []`; o `build` do my-app usa `outputs: [".next/**",
    "!.next/cache/**"]`. O cache é local e compartilhado entre worktrees (sem `cacheDir`, no Turborepo). Prova: 2ª rodada
    sem mudança volta do cache; mudar 1 arquivo de `server/src` invalida `typecheck` e `test:unit` do server e não toca o
    my-app.
12. **O que não vem do cache** `[F-MW-7]` — a integração. Ver o fork.
13. **Medição de depois** — a tabela "Medição de antes", com as mesmas linhas, na mesma condição de carga, mais: tempo da
    2ª rodada com cache e tamanho de `~/.local/share/pnpm/store` (ou `pnpm store path`) contra o depósito.

## 2. Contratos (esboço materializável)

```yaml
# pnpm-workspace.yaml (raiz) — esboço; os valores marcados dependem de fork
packages: [server, my-app]
virtualStoreType: global          # F-MW-1; no CI, desligado por env ou config
strictDepBuilds: true
allowBuilds:                      # = allowScripts do #1034
  prisma: true
  '@prisma/client': true
  '@prisma/engines': true
  '@swc/core': true
  unrs-resolver: true
  esbuild: true
  sharp: true
  puppeteer: false                # Chromium fica de fora (como hoje)
  '@scarf/scarf': false
  core-js: false
# strictPeerDependencies: false   # padrão; F-MW-3
```

```jsonc
// package.json (raiz)
{ "private": true, "packageManager": "pnpm@<F-MW-8>", "engines": { "node": ">=22" } }
```

```jsonc
// turbo.json — só se o F-MW-6 escolher Turborepo; as globs de inputs são o contrato
{
  "tasks": {
    "typecheck":  { "inputs": ["src/**", "test/**", "tsconfig*.json", "prisma/schema.prisma"], "outputs": [] },
    "lint":       { "inputs": ["src/**", "test/**", "eslint*.{js,mjs}"], "outputs": [] },
    "test:unit":  { "inputs": ["src/**", "test/**", "jest.config.js", "prisma/schema.prisma", "prisma/data/**"],
                    "outputs": [], "env": ["TZ"] },
    "build":      { "inputs": ["$TURBO_DEFAULT$", "!**/__tests__/**"], "outputs": [".next/**", "!.next/cache/**"],
                    "env": ["NEXT_PUBLIC_*"] },
    "test:integration": { "cache": false }  // F-MW-7, recomendação
  }
}
```

## 3. Forks — RATIFICADOS em 2026-11-04 (respostas na seção 0)

**F-MW-1 — Vale migrar para o pnpm agora, com o depósito já resolvendo a instalação?**
- **(a)** Migrar já, pelo checklist inteiro.
- **(b)** Só o spike PR-0. Migrar só se ele bater o depósito em tempo e disco, sem quebrar nada.
- **(c)** Não migrar: fica o depósito do #1034, e o BRIEF segue só com o cache de tarefa (que funciona com npm workspaces).

**Recomendação: (b).**
- O depósito já levou a 2ª worktree a 2,6 s.
- O global virtual store é "experimental" e desligado por padrão, e a doc não fala de Windows. Esta máquina é Windows, e
  ninguém o testou aqui.
- Spike barato antes de trocar o gerenciador de pacotes do repo inteiro.

**F-MW-2 — Um lockfile só na raiz, ou um por app?**
- **(a)** Um `pnpm-lock.yaml` na raiz (o padrão do pnpm workspace).
- **(b)** Um por app (`sharedWorkspaceLockfile: false`).

**Recomendação: (b).**
- O `my-app/Dockerfile` constrói só com a pasta `my-app/`.
- O Dependabot hoje trabalha por diretório.
- `server` e `my-app` não compartilham pacote interno.
- Com (a), o Docker do my-app precisa mudar de contexto, e um bump de um app reescreve o lockfile do outro.

**→ Ratificado: (a), um lockfile na raiz, contra a recomendação** (dono: "Um só na raiz"). O custo fica no checklist:
o item 7 muda o contexto do Docker e o item 8 move o Dependabot para `/`.

**F-MW-3 — Tirar o `legacy-peer-deps` do server?**
- **(a)** Tirar, e corrigir o que o pnpm reclamar.
- **(b)** Manter o equivalente (`strictPeerDependencies: false`, que já é o padrão, mais `autoInstallPeers`).

**Recomendação: (a), mas só se o PR-0 mostrar que o `pnpm install` passa.** A flag existe por causa do "Missing:
openapi-types" do npm 11 (#949), que é comportamento do npm, não do pnpm. Insumo ausente: o PR-0 ainda não rodou.

**F-MW-4 — CI: o pnpm entra no mesmo PR do lockfile, ou o CI segue no npm por um tempo?**
- **(a)** Mesmo PR: lockfile, CI e Docker juntos.
- **(b)** CI e Docker num PR seguinte, mantendo os dois lockfiles em paralelo nesse intervalo.

**Recomendação: (a).** Dois lockfiles em paralelo divergem no primeiro bump do Dependabot, e o CI deixaria de testar o que
roda localmente. O PR fica maior, mas é um corte só e se reverte com um `git revert`.

**F-MW-5 — Dependabot com pnpm 11: insumo ausente.**
- **(a)** Confirmar na doc do GitHub que o ecossistema `npm` do Dependabot entende o `pnpm-lock.yaml` da versão escolhida
  no F-MW-8, antes do PR de CI.
- **(b)** Aceitar o risco e medir no primeiro PR do Dependabot.

**Recomendação: (a).** Sem Dependabot, as dependências param de subir em silêncio. Hoje ele abre 2 PRs por semana (#946,
#949).

**F-MW-6 — Qual executor de cache de tarefa?**
- **(a)** Turborepo: só config (`turbo.json`), compartilha o cache com a worktree principal sem configurar nada, e tem
  `envMode: strict` por padrão.
- **(b)** Nx: cache fora do repo (`~/.nx`), também compartilhado entre checkouts, mas com grafo de projetos e plugins que
  este repo não usa.
- **(c)** Nenhum: ligar só o cache nativo das ferramentas (`tsc --incremental` com `tsBuildInfoFile`, o cache do jest, o
  `.next/cache` que o CI já guarda).

**Recomendação: (a), com (c) antes como PR independente.**
- O `tsc --incremental` sozinho já ataca a 2ª rodada do `typecheck` (9,1 s hoje) sem ferramenta nova.
- O Turborepo acrescenta o "não roda de novo o que não mudou" entre tarefas e entre worktrees, que é a regra "não repita
  gate sem mudança" da R2, agora com mecanismo.
- O Nx traz mais coisa do que o repo precisa.

**F-MW-7 — A integração (SQLite) pode vir do cache?**
- **(a)** Nunca (`cache: false`).
- **(b)** Sim, com `inputs` largos (schema, `prisma/data/**`, `src/**`, `test/**`) e a data do dia na chave.

**Recomendação: (a).** Evidência de que o resultado não depende só dos arquivos:
- há teste que fica vermelho entre 00:00 e 03:00 UTC (memória `teste-de-hoje-quebra-em-janela-utc`);
- o banco-modelo de integração é aquecido no `globalSetup` a partir do schema e do ambiente;
- o jest de integração lê fixtures por caminho relativo (o `inPlace` do Stryker existe por isso);
- o `server/.env` muda o banco de dados (memória `env-override-defeats-db-flag`).

Um verde em cache esconderia exatamente esses casos. O `test:unit` pode vir do cache, porque não abre banco.

**F-MW-8 — Versão do pnpm e do Node.**
- **(a)** pnpm 11, que tem `allowBuilds` e o global virtual store documentado nas páginas lidas, fixado em
  `packageManager` e chegando pelo corepack.
- **(b)** pnpm 10, mais rodado, mas com `onlyBuiltDependencies`, que a doc diz ter sido removido no 11.

**Recomendação: (a).** Insumo ausente: confirmar que o corepack do Node 22 (CI, `.nvmrc`) e do 24 (local) instala o pnpm 11
fixado. A diferença entre Node 22 no CI e 24 local já existe hoje e não é deste BRIEF.

## 4. Plano de migração em PRs pequenos

| PR | Conteúdo | Depende de | Classe esperada | Reversão |
|---|---|---|---|---|
| PR-A | `tsc --incremental` + `tsBuildInfoFile` nos dois apps (F-MW-6) — **ativo** | nada | verde | `git revert` |
| ~~PR-0~~ (arquivado) | spike pnpm (branch descartável, **não mergeia**): os 8 comandos do item 1, com tempo e exit | F-MW-1 = (b) | — | nada a reverter |
| ~~PR-1~~ (arquivado) | workspace + `pnpm-lock.yaml` na raiz + `allowBuilds` + CI + Docker com contexto na raiz + Dependabot em `/` (itens 2–8) | PR-0 passou; doc do Dependabot conferida (F-MW-5) | vermelho (CI, deps) | `git revert`; os `package-lock.json` voltam com ele |
| ~~PR-2~~ (arquivado) | `worktree-deps.mjs`/hook chamando pnpm; skills, `CLAUDE.md` e `server/CLAUDE.md` (itens 9–10) | PR-1 | vermelho (skills) | `git revert` |
| PR-3 | `turbo.json` + npm workspaces (itens 14–20, seção 0.3), turbo 2.8.21 — **depende do spike do item 20** | spike | verde ou vermelho, conforme toque `ci.yml` | `git revert`; apagar `.turbo/` |
| ~~PR-4~~ (arquivado) | apagar `worktree-deps.mjs` e emendar o R1 | PR-2 estável por 1 semana | vermelho (cédula) | `git revert` |
| PR-5 | medição de depois (item 13), sem código | PR-3 | verde | — |

**Critério de reversão do PR-1** (qualquer um reverte):
- algum dos 8 comandos do PR-0 com exit diferente de hoje;
- a 2ª worktree instalando em mais que os 2,6 s do depósito;
- algum job do CI 20% mais lento que a mediana das 5 últimas runs verdes da `main`;
- o Dependabot sem conseguir atualizar o lockfile;
- o `docker-build` vermelho.

## 5. Pendências de validação externa

Nenhuma regra contábil, fiscal ou legal envolvida.

## 6. Insumos ausentes

- **pnpm no Windows** com o global virtual store, nesta máquina: nunca rodou. É o PR-0.
- **Jest com o caminho do global virtual store:** o `transformIgnorePatterns` deve continuar casando, porque o caminho tem
  `node_modules/uuid`. Não testado.
- **Next.js com dependência fora da pasta do projeto** (o store fica fora do repo): não testado. Pode exigir
  `outputFileTracingRoot`.
- **Stryker com `inPlace: true` e `node_modules` de symlinks:** não testado.
- **Dependabot com pnpm 11** (F-MW-5) e **corepack com pnpm 11 no Node 22** (F-MW-8): não conferidos na doc.
- **Tamanho do depósito atual** (`~/.luminaris-deps`): o `du` não terminou com a carga de 04/11.

## 7. Achados fora de escopo

- O CI roda Node 22 (`.nvmrc`) e esta máquina roda Node 24 com npm 11. Essa diferença causou o "Missing: openapi-types"
  (#949), e este BRIEF não a resolve.
- O `node --test scripts/*.test.mjs` (heavy-slot, test-scope-guard) não roda no CI.
- O `.claude/settings.json` está em `deny` para o agente, então o hook do #1038 precisa ser colado pelo dono.
