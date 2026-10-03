#!/usr/bin/env bash
# Regenera os artefatos gerados depois de merge/rebase. Os conflitos deles são engolidos pelo
# driver `regen` do .gitattributes (mantém um lado qualquer); o valor certo vem daqui, dos fontes.
#   scripts/regen-generated.sh --setup   → registra o driver `regen` + git rerere (1x por clone)
#   scripts/regen-generated.sh           → regenera tudo; revise `git status` e comite
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ "${1:-}" = "--setup" ]; then
  git config merge.regen.name "mantém um lado; regenere com scripts/regen-generated.sh"
  git config merge.regen.driver true
  git config rerere.enabled true   # grava resolução manual e reaplica no próximo conflito igual
  echo "driver regen + rerere ligados"
  exit 0
fi

node scripts/plano-vault.mjs index
(
  cd server
  npm run --silent docs:generate
  # reescreve __dto-shapes__.json E os my-app/types/contracts/**/*.gen.ts
  UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot
)
git status --short -- docs/plano server/public server/src/features/accounting/dtos/__tests__ my-app/types/contracts
