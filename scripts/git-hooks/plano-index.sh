#!/bin/sh
# Gera docs/plano/_INDEX.md e _ANCORAS.md (não versionados — dono, 2026-10-16) depois de checkout e merge,
# para todo worktree e todo `git pull` já nascerem com o índice. Chamado pelos hooks post-checkout e
# post-merge que `scripts/regen-generated.sh --setup` instala. Nunca reprova a operação do git.
cd "$(git rev-parse --show-toplevel)" || exit 0
# post-checkout de arquivo (3º argumento = 0) não troca de branch: nada a gerar.
[ "${3:-1}" = "0" ] && exit 0
# Só onde o índice é ignorado. Em branch antiga ele ainda é versionado, e gerar sujaria a árvore.
git check-ignore -q docs/plano/_INDEX.md || exit 0
command -v node >/dev/null 2>&1 || exit 0
[ -f scripts/plano-vault.mjs ] || exit 0
node scripts/plano-vault.mjs index >/dev/null 2>&1 \
  || echo "plano-index: não gerou docs/plano/_INDEX.md — rode: node scripts/plano-vault.mjs index" >&2
exit 0
