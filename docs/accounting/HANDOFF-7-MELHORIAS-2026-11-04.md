# Handoff — 7 melhorias de sessões paralelas (04/11/2026)

Autorização: dono, chat, 2026-11-04: "Me da um prompt para implementar todas as 7 sugestões".

## Feito

| Melhoria | PR | Base | Classe |
|---|---|---|---|
| depósito: provas que faltavam + fix de peer deps no my-app | #1034 (saiu do draft) | main | vermelho |
| 1 semáforo `heavy-slot` | #1037 | main | verde |
| 2 `.worktreeinclude` + script do hook SessionStart | #1038 | #1034 | vermelho |
| 3 `worktrees-paradas.mjs` + remoção de 37 do grupo A e das 3 provas | #1039 | main | verde |
| 4 runbook do Dev Drive + medição de antes | #1042 | main | verde |
| 7 conduta de sessões (emenda R3) | #1040 | #1034 | vermelho |
| 5+6 BRIEF MONOREPO-WORKSPACES (F-MW-1..8 pendentes) | #1043 | main | verde |

## Pendente (do dono)

- Colar o hook `SessionStart` no `.claude/settings.json` (o trecho está no corpo do #1038; o arquivo está em `deny` para o agente).
- Ratificar os forks F-MW-1..8 do BRIEF.
- Executar o `RUNBOOK-DEV-DRIVE.md`.
- Lote de merge dos vermelhos (#1034, depois rebasear #1038 e #1040 antes do squash).
- Grupo B (56 worktrees com arquivo não commitado): revisar à mão. `nifty-lederberg-b855b8` é de sessão viva.

## Próximo comando exato

`node scripts/classe-risco.mjs pr 1034` → lote do dono → depois `git rebase` de `claude/worktree-auto-prep` e
`claude/conduta-sessoes` sobre a `main`.

## Atualização 04/11, fim da sessão: PR-3 autorizado

Autorização: dono, chat, 2026-11-04: **"Executa o PR-3"** (BRIEF `MONOREPO-WORKSPACES-brief.md`, seções 0.3 e 0.4, itens
14–20; forks F-MW-9 = npm workspaces + turbo, F-MW-10 = turbo fixo em 2.8.21, F-MW-11 = lockfile da raiz mesclado).

Desde a 1ª versão deste handoff: #1034, #1037, #1039, #1042, #1043 e #1045 foram mergeados. O #1038 e o #1040 tiveram o
conflito resolvido depois do squash do #1034, estão mergeáveis e são vermelhos (lote do dono). O #1046 traz o spike.

**Executar pela `sessao-feature`**, numa sessão nova, porque esta passou de ~180k de contexto. O que entra no PR-3:
1. `package.json` da raiz: `private`, `"workspaces": ["server","my-app"]`, `packageManager: "npm@<versão>"`, `turbo` exato
   `2.8.21` em devDependencies.
2. `package-lock.json` da raiz **mesclado** com `docs/accounting/monorepo-workspaces-spike/merge-npm-ws.cjs`. A entrada é o
   lockfile gerado por `npm install --package-lock-only` mais os dois lockfiles por app de hoje. A prova é
   `cmp-npm-ws.cjs` com 875/875 e 866/866, e `npm ci` exit 0. Os `package-lock.json` por app saem.
3. `turbo.json` com o contrato da seção 2 (com `test:integration` em `cache: false`), script `typecheck` nos dois apps e
   telemetria do turbo desligada (`TURBO_TELEMETRY_DISABLED=1` no CI e nas sessões).
4. CI (`.github/workflows/ci.yml`): `cache-dependency-path: package-lock.json` e `npm ci` na raiz. Docker com contexto na
   raiz, mais um `.dockerignore`. Dependabot: npm em `/`, com `ignore` do turbo `>= 2.9.0`.
5. `scripts/worktree-deps.mjs` e `scripts/session-start-deps.mjs` rechaveados para o lockfile da raiz (item 17), mais a
   emenda do R1 na `D-2026-11-04-RECURSOS-LOCAIS`.
6. O `allowScripts` do npm 11 no workspace: descobrir se ele vai para o `package.json` da raiz.

**Em aberto, para medir no PR-3:**
- o Stryker não sai depois do dry-run (comparar com a `main`);
- o reuso do depósito numa 2ª worktree, que exige uma sessão própria, por causa do hook.

**Regras desta frente:** teste só com escopo, 1 pesado por vez, nada destrutivo sem o dono, nenhum merge e
`node scripts/classe-risco.mjs pr <n>` em cada PR.
