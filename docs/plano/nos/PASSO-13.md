---
id: "PASSO-13"
tipo: "motor"
dominio: "motor"
titulo: "PR-B — atomicUntil boundary test + retrofit dos 8 JSDocs"
estado: "ready"
estado_detalhe: "'executa' dado em 2026-10-01 (passo 10 já em main via #358)"
ancora_sdd: "§III.1 passo 13 · §III.4"
autorizacao: "EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): \"Vamos testar os sonnet e o opus para implementar as tarefas\" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono"
atualizado: "2026-10-01"
---
# PASSO-13 — PR-B — atomicUntil boundary test + retrofit dos 8 JSDocs

**Estado:** `ready` — 'executa' dado em 2026-10-01 (passo 10 já em main via #358)  
**Autorização:** EXECUTA: dono, chat, 2026-10-01 (AskUserQuestion): "Vamos testar os sonnet e o opus para implementar as tarefas" + 'executa' marcado para SEED-UNITS, ITEM-DESTINATION, PASSO-13 e LAC-B; PR + revisor Opus, merge após OK do dono  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 passo 13 · §III.4

## Docs

- [`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`](../../adr/ADR-DOMAIN-MOTOR-rejected.md)
- [`docs/operating-manual/GAP-MAP.md`](../../operating-manual/GAP-MAP.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1510` → | 13 | **PR-B — `atomicUntil` boundary test + retrofit dos 8** | motor contábil (fora da régua) | `sessao-instrumentacao` (teste vermelho: 8 ofensores) → `sessao-correcao` (8 cabeçalhos) no **mesmo PR** | Contrato `[AC-2.3-2]`; população calculada pelo próprio teste (`grep .postEntry(` em `features/*/services`, exclui `PostingService`) — sem registro a manter; cada linha cita teste existente; linha sem teste escreve `[sem teste — GAP-MAP]`, **não** inventa teste de comportamento; 0 lógica tocada | teste verde; GAP-MAP Nível 3 `[PAPEL]→[COBERTO]`; `governance.md` de `backend-service-generator` 
- `docs/SDD-LUMINARIS.md:1969` → ### Passo 13 — PR-B: `atomicUntil` Boundary Test + Retrofit (Haiku)
- `docs/SDD-LUMINARIS.md:1917` → **Consequência:** os passos 11–13 **não estão mais bloqueados pelo passo 10** — falta só a autorização do dono ("instrumenta" / "executa"). **Pendura aberta:** o PR **#357** (`claude/domain-motor-architecture-7ec49d`) segue OPEN com o mesmo conteúdo já em `main` — virou duplicata; fechá-lo ou não é decisão do dono.
