---
id: "D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacunas de spec do PR-B (joins) e do PR-D (widget) da tela do builder de relatórios do CRM — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário na sessão de feature do PR-B/PR-D — apelido: 'Obrigatório, pré-preenchido (Recomendado)'; join usado: 'Reescreve e confirma (Recomendado)'; limites do BE: 'Esconde e explica (Recomendado)'; widget: 'Sempre; 6×12, mín 3×8 (Recomendado)'"
atualizado: "2026-10-13"
---
# D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS — lacunas de spec do PR-B e do PR-D do [[FE-INCR-CRM-REPORT-BUILDER]]

**Estado:** `decided` (4 cédulas, todas na recomendação).
**Autorização:** dono, chat, 13/10/2026, questionário, na fase 1 da sessão de feature do PR-B e do PR-D (o "executa" dos
dois é do mesmo dia: *"pode seguir com o PR-B e o PR-D, mas em uma sessão nova, dispare ela"*).

Origem: `docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md` itens 10 e 20. A sessão de feature parou nos quatro antes de
escrever código (regra 2). Contrato do BE lido em `server/src/features/crm/services/CrmReportService.ts`
(`validate`, `execute`, `resolveRef`, `loadRelationTargets`) e `server/src/features/crm/dtos/CrmReportDto.ts`
(`ReportJoinSchema`).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 10 — apelido do cruzamento | O BE aceita `alias` opcional (padrão `'right'`) e devolve 400 `REPORT_JOIN_ALIAS_DUPLICATE` se repetir, se for `id`, se começar com `_` ou se coincidir com campo da fonte. Com ponto, a referência `apelido.campo` não resolve. A spec só diz "apelido" | **Obrigatório, pré-preenchido** com o `internalName` da tabela da direita (`leads`; `leads_2` se repetir), editável. A tela valida as regras do BE e também barra ponto e espaço. Inválido bloqueia o Visualizar/Salvar com a explicação | não |
| Item 10 — cruzamento em uso | Renomear o apelido, remover o cruzamento ou trocar a tabela da direita com medidas/agrupamentos/filtros usando `apelido.campo` (a spec só cobre a troca da fonte, item 3) | **Reescreve e confirma**: renomear o apelido reescreve as referências. Remover ou trocar a tabela da direita remove os itens que deixam de existir, depois de `Modal` de confirmação (mesmo padrão do item 3) | não |
| Item 10 — limites do BE no lado do join | (1) `apelido.id` passa no `assertField`, mas a linha do join não carrega o `id` (`index.set(key, rr.data)`) e o valor sai vazio. (2) Agrupar por campo de relação do join mostra o id cru (`loadRelationTargets` só resolve campos da fonte). (3) O casamento é N:1: cada linha da fonte pega a primeira linha da direita que casar | **Esconde e explica**: `apelido.id` não é oferecido nos itens 5–7 (segue disponível como campo do vínculo, onde funciona). Campo de relação do join não aparece em "Agrupar por". A seção mostra uma linha de ajuda sobre o casamento N:1. (1) e (2) viram achados de BE fora de escopo | não |
| Item 20 — tamanho e disponibilidade do widget | A spec pede o tipo novo em `DIMENSIONS` e no `FloatingAddWidgetButton`, mas não diz o tamanho nem se o widget aparece sem o CRM instalado | **Sempre no menu; 6×12, mínimo 3×8.** A configuração lista os relatórios salvos (`GET /api/crm/reports`). Lista vazia mostra "nenhum relatório salvo" com link para `/crm/reports` | não |

## Consequências

- `features/crm/lib/reportBuilder.ts` ganha os campos do join (`apelido.campo`) e a validação do apelido como motivo de
  bloqueio. A regra de moeda (item 8) vale também para dinheiro do lado do join, com o par prefixado (`apelido.currency`),
  como o `pairFieldOf` do BE.
- Os achados (1) e (2) ficam no relatório do PR-B como fora de escopo; consertá-los é nó de BE com autorização própria.
