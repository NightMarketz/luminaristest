# my-app/ — regras de frontend (path-scoped)

Este arquivo carrega **só quando o agente mexe em `my-app/`** (Next.js Pages Router).
Equivalente Claude Code ao `paths:` do Cursor: escopo por diretório, via CLAUDE.md aninhado.

Docs de referência (leia sob demanda — não carregam sozinhos):

- Design system / tokens: [frontend-design-system/SKILL.md](../.claude/skills/frontend-design-system/SKILL.md)
- Scaffolding por camada (nomes/paths): [GENERATION_CONTRACTS.md](../docs/claude-skills/GENERATION_CONTRACTS.md)
- Critério reuse-vs-bespoke: [_REUSE-CRITERION.md](../.claude/skills/_REUSE-CRITERION.md)

## Gates rápidos ao editar my-app/

1. **Reuse o canônico** antes de recriar: `GenericTable`, `Modal`, `StandardPagination`, `AnalyticsDashboard`. Bespoke só com divergência de shape/posse justificada.
2. Cores `neutral-*`, **nunca** `zinc-*`; cards `rounded-2xl`/`3xl`; zero `any` evitável.
3. `tsc` limpo é gate: `cd my-app && npx tsc --noEmit` — não avance vermelho.
4. Telas atrás de `withAuth` → verifique contra **build de produção**, não `next dev`.
5. Composição JSX não é aresta `CALLS` no grafo — para liveness de componente React, use existência + `SIMILAR_TO`, não in-degree.
6. **Body de escrita tipado pelo contrato gerado** — `@/types/contracts/<domínio>/*.gen.ts` (gerado do `dtoShapeSnapshot` do server; `<X>Schema` → `<X>Input`). Nunca espelhe o DTO à mão nem importe do backend. Array `.min(1)` vira `[T, ...T[]]`: monte com `nonEmpty()` (`lib/utils/nonEmpty.ts`).
7. **Regra do mapper** — objeto aninhado sai de função com retorno declarado (`toX(d): XInput['y']`) ou `satisfies`; arrays por `.map(toX)` ou `.map((d): T => …)`. **Proibido** `.map` sem anotação, `{ ...rascunho }` e `as` no objeto (os três escapam da checagem de chave extra); `as` só em folha string → união, com `// ponytail:`.
8. **`.gen.ts` nunca se edita** — mudou o DTO: `cd server && UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot` e comite o JSON + os `.gen.ts`.

## Ao escrever testes (`**/__tests__/*`)

Testes vivem espalhados em `__tests__/` sob `features/*`, `lib/` etc. — não há subtree
próprio, então estas regras ficam aqui (carregam junto com o resto de `my-app/`).

- Runner é **vitest** (`jsdom`, `globals: true`), **não jest**. Config: `vitest.config.ts`; setup `vitest.setup.ts` só registra os matchers do `jest-dom`.
- Componente sob teste que **não** faz `import React` + você vai renderizar → adicione no topo do teste `(globalThis as unknown as { React: typeof React }).React = React;` (jsx `preserve` + runtime clássico esperam `React` em escopo). **Nunca** no código de produção.
- `jest` exit-1 esporádico é `TECH-DEBT-TEST-001` (ambiente, não o diff) — não trate como falha do seu código.
