---
id: "D-2026-10-02-FE-INCR-DFE-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-FE-DFE-6..9 do BRIEF FE-INCR-DFE (tela da emissão manual de NFS-e)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: rodada de ratificação por questionário dos forks pendentes (AskUserQuestion) — só decisão, sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-FE-INCR-DFE-FORKS — cédulas da ratificação do BRIEF da tela de DF-e

**Estado:** `decided` (F-FE-DFE-6..9, 4/4, todos na recomendação)
**Autorização:** dono, chat, 02/10/2026: *"Autorizo uma rodada de ratificação por questionário dos forks pendentes
abaixo (dono, 02/10). Só decisão: não escreva código nem BRIEF novo, não dê 'executa'."* Frontmatter de
[[FE-INCR-DFE]] conferido antes: os quatro seguiam pendentes.
**Não é "executa"** (ORCH-006). Na fila, o nó continua depois do [[SEED-UNITS]].

Documento dos forks: [`FE-INCR-DFE-brief.md`](../../accounting/FE-INCR-DFE-brief.md) §4 (texto e tabela de ratificação).

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-FE-DFE-6 | Onde vivem as telas de perfil fiscal | (a) aba nova "Perfil fiscal" | *"(a) Aba nova "Perfil fiscal" (Recommended)"* | não |
| F-FE-DFE-7 | Município do local da prestação sem tabela IBGE → nome | (a) código + instrução | *"(a) Código + instrução (Recommended)"* | não |
| F-FE-DFE-8 | Endereço do tomador | (a) só o que a DPS tem | *"(a) Só o que a DPS tem (Recommended)"* | não |
| F-FE-DFE-9 | Cancelamento manual se o portal não entregar o XML do evento | (a) manter F-MAN-5 (a) e medir | *"(a) Manter F-MAN-5 (a) e medir (Recommended)"* | não |

## Reaberturas previstas (não são decisão nova)

- F-FE-DFE-7 → (b)/(c) se o PV-4 do `RUNBOOK-H2-DFE-MANUAL` mostrar que a busca do município não aceita o código.
- F-FE-DFE-8 → (b) se o PV-3 mostrar que o portal exige o endereço.
- F-FE-DFE-9 → o dono reabre o F-MAN-5 se o PV-1 confirmar que o portal só entrega HTML.

Na mesma rodada, o F-COB-1 (a) ([[D-2026-10-02-MAPA-COBERTURA-FORKS]]) acrescentou o passo 8 ao runbook do PR-2.
