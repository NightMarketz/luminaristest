---
id: "D-2026-10-14-FILA-ORDEM-RATIFICADA"
tipo: "decisao"
dominio: "plano"
titulo: "Ratifica a ordem de execução de docs/plano/FILA-ORDEM.md como fila oficial"
estado: "decided"
autorizacao: "dono, chat, 2026-10-14: \"Ratifico a ordem de FILA-ORDEM.md como fila oficial.\" Só ratifica a ORDEM. Não autoriza 'executa' de nenhum nó: cada item de código continua exigindo autorização própria (ORCH-006)"
atualizado: "2026-10-14"
---
# D-2026-10-14-FILA-ORDEM-RATIFICADA

**Estado:** `decided`. **Autorização:** dono, chat, 14/10/2026, ratificação da ordem em [[FILA-ORDEM]].
**Não é "executa"** (ORCH-006).

## O que fica ratificado

- A ordem de execução de [[FILA-ORDEM]] passa a ser a fila oficial: seção A (prazos e decisões do dono), depois B (código destravado, por PR), depois C (backlog) e D (bloqueado por gate externo).
- A regra de cadeia de gates H1 → H2 → M2 (já fixada pelo dono em [[H1]]) continua valendo.

## O que não fica ratificado por esta decisão

- Nenhum PR da seção B fica autorizado. Cada um precisa do seu `executa` citável.
- As decisões de A1 (caminho da emissão NFS-e), A6 (pedido ao contador) e A7 (consulta ao CRC-SP) continuam do dono, uma a uma.

## Como aplicar

- Reordenar a leitura: a fila oficial é a de [[FILA-ORDEM]]; o [[_INDEX]] segue alfabético e só mostra estado e dependência.
- Quando uma linha da seção B for autorizada, a nota do nó recebe a citação do `executa` em `autorizacao`. O documento de fila só muda quando a ordem muda, não a cada autorização.
