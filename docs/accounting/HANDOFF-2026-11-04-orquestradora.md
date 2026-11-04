# Handoff — sessão orquestradora de 04/11/2026 (tarde)

Autorização da sessão: dono, chat, 2026-11-04: *"Pode fechar aqui, mergear tudo e dar o prompt para seguir numa nova
sessao orquestradora"*. Fora da lista de 04/11 vale a classe de risco (verde → merge com CI verde; vermelho →
revisor-independente + lote que o dono confirma por número). Dependabot: não mergear.

## Feito (medido com `gh` em 04/11)

| PR | Estado |
|---|---|
| #1011, #1023, #1024, #1025, #1038, #1040 | mergeados (auto-merge squash) |
| #1027 (Y600 PR-2) | rebase sobre main + snapshot do PartnerDto reaplicado; mergeado 13:18Z |
| #1028 (retentor C8) | rebase sobre main + snapshot/openapi reaplicados; mergeado 13:21Z |
| #1052 (VP-1, Qtd de pacote no SalesPlugin) | guarda + fix; verde; mergeado 14:50Z |
| #1054 (MONOREPO PR-A, `tsc --incremental`) | verde; mergeado 14:53Z (2ª rodada do tsc do server 10,4 s → 4,5 s) |

**Armadilha vista no rebase das pilhas:** o merge driver `regen` do `.gitattributes` (`__dto-shapes__.json`,
`openapi.json`, `*.gen.ts`) mantém o lado de main e **descarta** a mudança do PR — o rebase chega a dropar o commit como
"patch contents already upstream". Conserto: `git show <sha> | git apply` (sem `--3way`) só nesses arquivos e conferir
`git diff --stat` contra o original.

Decisões do dono (questionário, 04/11): PR-A "executa PR-A (Recomendado)"; spike do item 20 "executa, depois do PR-A";
revisão do turbo fixo "Data fixa: 2027-02-01" (foldadas no BRIEF pelo #1054); IMO-1 da baixa "409 (BRIEF item 14)";
worktrees paradas: "Só as limpas e sem sessão" (resultado: nenhuma — as 5 limpas eram de sessão aberta);
sessões: arquivar as do Luminaris, manter as 7 de fora ("Não, deixa").

## Aberto

| PR | Estado | Próximo |
|---|---|---|
| #982 (H2, draft) | head `c9632a03` | passos 14, 18, 19 (cartão); depois desfecho geral do H2 e tirar do draft se PASSOU |
| #1035 (runbooks irmãos, draft) | head `023ccec3` | ATIVACAO e WIZARD (principal + W6) PASSOU; VENDA-PACOTE e IMOBILIZADO FALHOU no passo 5 (bugs VP-1 — corrigido — e IMO-1); PACOTE-VALIDADE espera o PV-A; DFE-MANUAL não rodou |
| #1053 (IMO-1, draft) | head `72d04c85`, guardas de ativar e baixar vermelhos de propósito | correção (cartão) |
| #1051 (PR-3 npm workspaces + turbo) | classe **vermelha**, CI verde | revisor-independente (cartão) → lote do dono |
| #1046 (spike MONOREPO) | classe verde, CI verde | não mergeado: conferir sobreposição no BRIEF com #1054/#1051 antes |

## Cartões propostos (nada rodando)

IMO-1 correção (ativar + baixar) · VENDA-PACOTE de novo pela tela · H2 passos 14/18/19 · DFE-MANUAL pela tela ·
revisor-independente do #1051. Máximo 3 pesados ao mesmo tempo; telas uma por vez.

## Perguntas ao dono (não respondidas)

- Serviço com quantidade 2 deve contar a quantidade? (VP-1 só mudou pacote; divergência em `server/src/lib/saleLine.ts`, #913.)
- PV-A (PACOTE-VALIDADE passo 6): o roteiro mede na janela de 5 min do job ou a tela mostra o saldo vencido zerado?
- A-1 (texto da ativação contábil, "se estiver vazio"): só texto.

## Ambiente

- A máquina bateu no limite de memória (bash `fork` 0xC000012D; três sessões caíram com 0xC0000409). Um app por vez.
- TELA-LOCK: estava em nome de `c7-irmaos-fecho` (sessão arquivada) — órfã; os cartões de tela podem retomá-la.
- Worktree órfã `.claude/worktrees/h2-y600-build` (detached em `3ed76080`, sem sessão): pode sair com `git worktree remove`.
- Lembrete do dono: Dev Drive (`RUNBOOK-DEV-DRIVE`) é dele.

## Próximo comando

```bash
gh pr view 1053 --json state,isDraft; gh pr view 1051 --json state,mergeable; node scripts/classe-risco.mjs pr 1046
```
