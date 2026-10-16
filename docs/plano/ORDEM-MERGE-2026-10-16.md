# Ordem de merge — lote de 16/10 (I6, I7, I11, W4, W5, X14-CAIXA, FE-INCR-SIMPLES PR-D)

> **Isto é um roteiro, não uma autorização.** Pela regra "Merge só com PR nomeado" (CLAUDE.md raiz), cada merge
> exige o dono confirmar **por número** no chat. A tabela abaixo é a lista que vai a ele.
> Montada em 16/10 a partir dos arquivos tocados por PR (`gh pr view --json files`) e do estado de CI naquela hora.

## Regras do lote

1. **Pilha = de baixo pra cima, e o filho é rebaseado ANTES do pai sair.** O squash do pai com `--delete-branch` fecha
   o filho em vez de retargetar (memória `squash-merge-quebra-prs-empilhados`). Sequência por degrau: rebase do filho
   sobre `origin/main` + o pai (equivalência de patch) → retarget do filho para `main` → squash do pai → CI do filho
   verde → próximo degrau.
2. **Um nó por vez.** Depois de cada nó, os próximos da fila rebaseiam em `main`, e a CI deles roda verde antes do merge.
3. **Arquivos gerados não se resolvem à mão:** `docs/plano/_INDEX.md` → `node scripts/plano-vault.mjs index`;
   `server/public/openapi.json` → regerar pelo script do server; `__dto-shapes__.json` → inserir só os schemas novos
   (no Windows, o UPDATE reordena tudo). Conflito em `docs.paths.ts` ou `lib/factory.ts` → manter as duas entradas.
4. **Fiscal/contábil** (I6, I7 PR-2, X14-CAIXA, FE-INCR-SIMPLES PR-D) é marcado na lista ao dono.

## Ordem

| # | Nó | PRs (ordem dentro da pilha) | Fiscal/contábil? | Por que nesta posição | Pré-condição |
|---|---|---|---|---|---|
| 1 | FE-INCR-SIMPLES PR-D | #733 | sim (DASN/DEFIS) | Não divide código com ninguém (só o `_INDEX`); sai sem reempilhar nada | CI verde (estava 14/14) |
| 2 | W4 | #734 → #735 | não | Divide `InterviewService`, `useAiInterview` e os locales com o W5; sai antes porque o W6 depende dele | CI verde (os dois estavam 14/14) |
| 3 | I11 | #725 → #731 → #736 | não | Divide `OpenAIService` com o W5 e `DynamicTableService`/`factory` com o I7; sai antes dos dois | #736 terminar a CI |
| 4 | W5 | #726 → #727 → #728 | não | Rebase sobre o W4 (wizard) e o I11 (OpenAIService); divide `dashboardController` com o I7 | #728: confirmar se a falha/cancelados são rodada velha anterior ao reempilhamento; rerodar |
| 5 | I7 | #730 → PR-2 (ainda não aberto) | PR-2 sim | Rebase sobre I11 e W5 (`DynamicTableService`, `dashboardController`, `factory`) | PR-2 aberto com as 3 decisões de 16/10 (perfil da empresa, APV com/sem contador, evento pela cadeia) |
| 6 | X14-CAIXA | #729 → #738 → #739 | sim | Migração de schema; divide `schema.prisma`, `simplesController` e o teste de integração do Simples com o I6 | **#729 (2 falhas) e #738 (3 falhas) verdes**; #739 com CI rodada |
| 7 | I6 | #732 → #737 → PR-3 → PR-4 → PR-5 | sim | **Por último de propósito:** o PR-5 liga a regra do `check:arch` com baseline zero. Saindo depois, a regra já vê os endpoints novos do X14-CAIXA, W4 e I7 e os cobre no mesmo lote; saindo antes, cada um desses teria de adotar o guard no rebase | PR-3..5 abertos; rebase sobre todos os anteriores |

**Fora deste lote:** #650 (X10i PR-1, nó `blocked`; divide `schema.prisma`, `rekeyLegacyUnitCli` e `auditCanonical`
com o X14-CAIXA; se destravar, entra depois do X14-CAIXA) e #696 (Stryker, ferramenta; independente, entra quando o dono quiser).

## Pontos para olhar na revisão antes do OK

- **`DynamicTableService.ts` é tocado pelo I11 PR-2 (#731, +31 linhas, filtro no repositório, F-I11-2 b) e pelo I7 (#730,
  preserva o 1º T0 em `updateMany`).** O CLAUDE.md raiz manda PARAR se o motor estiver sendo usado para integrar
  módulos. Os dois parecem locais (filtro e T0), mas vale um olho antes do merge.
- **W6 destrava quando o W4 (#734) entrar.** O código do W6 ainda precisa de 'executa'.
