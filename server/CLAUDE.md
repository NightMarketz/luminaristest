# server/ — regras de camada (path-scoped)

Este arquivo carrega **só quando o agente mexe em `server/`**. É o equivalente
Claude Code ao `paths:` do Cursor: escopo por diretório, via CLAUDE.md aninhado.

Docs de referência (leia sob demanda — não carregam sozinhos):

- Contrato de arquitetura backend: [_ARCHITECTURE-CONTRACT.md](../.claude/skills/_ARCHITECTURE-CONTRACT.md)
- Critério reuse-vs-bespoke: [_REUSE-CRITERION.md](../.claude/skills/_REUSE-CRITERION.md)

## Gates rápidos ao editar server/

1. Cadeia obrigatória: `Route → Controller → Service → Repository → Prisma` (+ Policy). Nunca pule uma camada nem inline uma policy.
2. Injeção via **Factory**; entrada validada por **DTO Zod**; **soft-delete**, não hard-delete.
3. Módulo novo com invariante financeiro/legal → **Prisma first-class** (Model+Service+Repo+Policy), nunca DynamicTable. Nunca injete serviço Prisma no `DynamicTableService`/`RuleContext`/`RulePlugin`.
4. `tsc` limpo é gate: `cd server && npx tsc --noEmit` — não avance vermelho.
5. Gate autoritativo (período/saldo/status) re-checado **dentro** do `runTransaction`, com `tx` propagado ao repo; `@@unique` não fecha TOCTOU sozinho.

## Armadilha de ambiente — cliente Prisma stale entre worktrees

Sintoma: erro de tipo/model inexistente no client Prisma (ex.: coluna que não está no `schema.prisma`
de `main`), ou comportamento defasado depois de uma mudança de schema, sem relação óbvia com o que foi
tocado. Causa: worktree novo **não herda** `node_modules` nem `.env`, e o client Prisma gerado é o de
outro worktree/branch (schema divergente). Remédio: `npm ci` + `npx prisma generate` em **todo** worktree
novo, antes de rodar teste ou servidor (ver `worktree-deps-stale-prisma-client` na memória do projeto).
