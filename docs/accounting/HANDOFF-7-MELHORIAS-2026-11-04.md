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
