#!/usr/bin/env bash
# Regenera os artefatos gerados depois de merge/rebase. Os conflitos deles são engolidos pelo
# driver `regen` do .gitattributes (mantém um lado qualquer); o valor certo vem daqui, dos fontes.
#   scripts/regen-generated.sh --setup   → registra o driver `regen` + git rerere + os hooks que geram o
#                                          índice do plano no checkout/merge (1x por clone; vale para todo worktree)
#   scripts/regen-generated.sh           → regenera tudo; revise `git status` e comite
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ "${1:-}" = "--setup" ]; then
  git config merge.regen.name "mantém um lado; regenere com scripts/regen-generated.sh"
  git config merge.regen.driver true
  git config rerere.enabled true   # grava resolução manual e reaplica no próximo conflito igual
  # Hooks na pasta comum do repositório: valem para o clone e todos os worktrees, inclusive os futuros.
  # O hook instalado só delega ao script versionado da branch em uso (atualizar o script não exige --setup).
  hooks="$(git rev-parse --git-common-dir)/hooks"
  mkdir -p "$hooks"
  for h in post-checkout post-merge; do
    if [ -f "$hooks/$h" ] && ! grep -q 'luminaris-plano-index' "$hooks/$h"; then
      echo "AVISO: $hooks/$h já existe e não é deste repo — não sobrescrevi; chame scripts/git-hooks/plano-index.sh dele"
      continue
    fi
    printf '%s\n' '#!/bin/sh' '# luminaris-plano-index — instalado por scripts/regen-generated.sh --setup' \
      'h="$(git rev-parse --show-toplevel)/scripts/git-hooks/plano-index.sh"' \
      '[ -f "$h" ] && sh "$h" "$@"' 'exit 0' > "$hooks/$h"
    chmod +x "$hooks/$h"
  done
  echo "driver regen + rerere + hooks post-checkout/post-merge (índice do plano) ligados"
  exit 0
fi

# _INDEX/_ANCORAS do plano: gerados na máquina, fora do git (dono, 2026-10-16).
node scripts/plano-vault.mjs index
(
  cd server
  npm run --silent docs:generate
  # reescreve __dto-shapes__.json E os my-app/types/contracts/**/*.gen.ts
  UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot
)
git status --short -- docs/plano server/public server/src/features/accounting/dtos/__tests__ my-app/types/contracts
