# Spec — Lint Layer-Gate (fatia P1 · higiene determinística)

> **Status:** implementada e no CI — `server` roda `npm run lint`, `my-app` roda `npm run lint:gate`, e o `zinc-guard` é job próprio (verificado em `.github/workflows/ci.yml`). **Tipo:** build-gate determinístico (núcleo rígido da metodologia reuse-vs-divergência). **Escopo:** *config de lint + CI*, **não** pagamento de dívida nem construção de wrappers.

Esta fatia transforma três regras hoje **convenção-apenas** (contrato `.claude/skills/_ARCHITECTURE-CONTRACT.md`) em **gate lintável determinístico**, sem depender de triggering de skill. O contrato continua sendo o bar de qualidade; este gate é o subconjunto *mecanizável* dele.

## Princípio que governa cada regra

O critério **shape+posse** é **detector de candidatos, não decisor**. O lint automatiza só o detector. A decisão "consolidar vs divergir" continua factual e humana — por isso cada regra abaixo declara explicitamente *qual trabalho ela faz*:

- **Barra ilha** (confinamento real): só onde o estado atual já é o correto e há destino conforme. Ex.: `recharts`.
- **Inventaria** (tripwire de visibilidade): onde o espalhamento é divergência *sancionada*; o `error` não previne ilha, só força a próxima adição a aparecer num diff onde o critério shape+posse deve ser aplicado por julgamento. Ex.: `@dnd-kit`, `@fullcalendar`.
- **Converte dívida oculta em dívida marcada**: onde há violação viva pré-existente; `error` global + supressão **inline por-linha** (não exceção no config). Ex.: `prisma.*` em controller/service.

## Regras

### R1 — `prisma` singleton confinado a Repository (server)
- **Onde:** `server/eslint.config.mjs`, `no-restricted-imports` dos **três** patterns `@/lib/prisma` / `**/lib/prisma` / `*/lib/prisma`, em `controllers/**` e `**/services/**`. O do meio é o que casa a forma relativa (`'../../../lib/prisma'`), que é a maioria dos sites — não o omita ao citar a regra.
- **Trabalho:** barra regressão (novo `prisma` em controller/service = erro) + inventaria dívida viva.
- **PONTO CEGO DECLARADO — o gate é mais estreito que o contrato.** O contrato §2 é categórico (*"Repository: único lugar com `prisma.*`"*), mas os globs cobrem só `controllers/**` e `**/services/**`. Fora deles há acesso ao singleton **vivo, sem supressão e sem erro de lint** — `server/src/app.ts`, `server/src/server.ts` e `server/src/jobs/**`. Verificável por probe: um `src/jobs/zz.job.ts` importando o singleton **não** produz erro. **Não grave aqui a contagem — meça:**
  ```bash
  rg -n 'prisma\.[a-zA-Z$]+' server/src -g '!**/{controllers,services,repositories,__tests__}/**' -g '!**/*.test.ts' -g '!**/lib/prisma.ts' -g '!*.md'
  ```
  (Note o `$` na classe: sem ele o padrão perde `$queryRawUnsafe`/`$disconnect` e devolve um número **menor e plausível** — foi assim que uma redação anterior desta linha registrou "7 acessos" quando eram 10, em 5 arquivos e não 3. Instrumento que erra em silêncio: `[OPS-003]`.) Consequência: **o backlog mede a dívida de R1, não a dívida do contrato §2** — ampliar o glob, ou marcar esses sites, é fatia própria.
- **Dívida viva (supressão inline `DEBT: prisma`) — 3 sites** (medido em `dc7fd12`, 2026-07-30):
  `server/src/controllers/dashboardController.ts:6`, `server/src/features/chat/services/ChatService.ts:13`,
  `server/src/features/reports/services/ReportService.ts:6`.
  **Pago desde a redação original:** `authController` e `userController`/`features/users/**` não importam mais
  `lib/prisma` (o único acesso em `features/users/` é `UserRepository.ts`, que é a camada permitida). A lista caiu
  de 5 → 3 por **pagamento de dívida**, não por supressão removida com violação viva — `npx eslint src` verde confirma.
- **Exceção sancionada (supressão inline `SANCTIONED`):** `DynamicTableService` — orquestração de `prisma.$transaction` documentada no contrato §2.
- `import type` de `generated/prisma` **não** é alvo (tipo, não acesso a dados).

### R1b — Service não importa `express` (server)
- `no-restricted-imports` de `express` em `**/services/**`. Zero violação viva hoje → só barra regressão (contrato §2: "Service: Zero Express").

### R2 — `apiClient` confinado a `lib/services` (frontend)
- `no-restricted-imports` do path `**/api/api-client` fora de `lib/services/**` e `lib/api/**`.
- **Dívida viva: ZERO** (medido em `dc7fd12`, 2026-07-30). Nenhuma supressão `DEBT: apiClient` existe no repo.
  `TotalControlSetup.tsx` e `QuickSetup.tsx` continuam existindo em `my-app/features/interview/setup/`, mas já
  consomem `SetupService` (`lib/services/setup.service`) em vez de `api/api-client`. Varredura
  `rg -l "api/api-client" my-app` retorna só `lib/services/**` (+ config de lint e docs).
- **A regra mudou de natureza.** Foi escrita como *"converte dívida oculta em dívida marcada"* (§Princípio, 3º caso),
  premissa que exigia violação viva pré-existente. Sem dívida aberta, R2 hoje é **barra ilha** (1º caso): o
  confinamento em `lib/services` já é o estado correto e o `error` só impede a próxima regressão — mesmo trabalho
  que R3a faz para `recharts`, e mesmo estado que R1b sempre teve. Reclassifique-a assim ao reler o spec.

### R3a — `recharts` confinado (frontend, **barra ilha**)
- `error`; allowlist por glob: `**/analytics/charts/**`, `**/analytics/kpi/**`, `components/widgets/analytics/GoldKpiWidgetView.tsx`. Qualquer outro import = erro.

### R3b — `@dnd-kit` / `@fullcalendar` inventariados (frontend, **tripwire**)
- `error`; allowlist reflete os usos **sancionados atuais** + comentário no config declarando o que a lista significa. Adicionar path = afirmar divergência sancionada (shape+posse diferente), **não** ilha. **Não** se constrói wrapper canônico para estas nesta fatia — os usos são legitimamente diferentes.

### R4 — CI gate
- **server**: step `npm run lint` (`eslint src`) entre typecheck e test.
- **my-app**: step `npm run lint:gate` (`eslint . --config eslint.gate.config.mjs`). Usa um config **separado** do `eslint.config.mjs` (next/dev): o frontend nunca foi lintado (`ignoreDuringBuilds: true`) e o ruleset next produz ~6000 erros pré-existentes — adotá-lo é iniciativa própria, não esta fatia. O gate roda isolado, só as regras de camada.
- **zinc-guard** (job próprio, repo-root): a base tem ~33 `zinc-` vivos (o contrato §4 dizia "base é neutral" — falso). Em vez de reprovar nelas, o job é **diff-scoped**: falha só quando a mudança INTRODUZ `zinc-` novo. Mesmo princípio do layer-gate (barra regressão, não força refactor). Backlog: `grep -rn "zinc-" my-app/{features,lib,components,pages,styles}`.

## Gate de aceitação (verificável)
> Os números abaixo são **medidos**, não declarados — reconfira antes de citá-los (última medição: `dc7fd12`, 2026-07-30).
> Ao medir, normalize o caminho antes de filtrar — `rg -l "api/api-client" my-app | tr '\\' '/' | rg -v "lib/services/"`.
> Sem o `tr`, em win32, o filtro casa zero e a lista inteira vira falso positivo. Regra geral e o auto-probe
> ("o `-v` removeu alguma linha?"): `[OPS-003]` em `.claude/skills/_OPERATING-GATES.md`.

1. `server`: `npx eslint src` verde; os únicos acessos ao singleton em controller/service são os **4 sites suprimidos**
   (3 `DEBT: prisma` + 1 `SANCTIONED` em `DynamicTableService`) e **nada além**; `tsc` segue verde.
2. `my-app`: `npx eslint . --config eslint.gate.config.mjs` verde; **zero** import de apiClient fora de
   `lib/services/**`/`lib/api/**` (nenhuma supressão necessária) e **zero** import direto de
   recharts/dnd-kit/fullcalendar fora do allowlist; build segue verde.
3. CI: jobs `lint` adicionados; zinc-guard **diff-scoped** verde (a base tem `zinc-` vivos — ver R4; o gate falha só
   quando o diff INTRODUZ `zinc-` novo, não pela base).
4. `grep "DEBT: prisma"` retorna a lista exata da dívida aberta de R1 (hoje 3 sites) e `grep "DEBT: apiClient"`
   retorna **vazio** (R2 sem dívida). Backlog mensurável **de R1/R2** = o que o grep devolve, não o que este
   spec afirma;
   divergência entre os dois é bug **do spec**, e fechá-la é atualizar o texto — nunca adicionar supressão
   para casar com a lista.

## Linha que esta fatia não cruza
- Não refatora os sites de dívida (isso é trabalho de domínio, fatia própria; a lista de supressões `DEBT:` **no código**
  é o backlog — este documento só a espelha, e quando os dois divergem quem manda é o código).
- Não constrói wrapper canônico para dnd-kit/fullcalendar (usos sancionados ≠ ilha).
- Não rebaixa nenhuma regra para `warn` (warn não tem dente no CI).
