---
id: "D-2026-10-29-F5-16B-TITULO-CANCELADO"
tipo: "decisao"
dominio: "financeiro"
titulo: "Lista global de cobranças (F5 16b): o nº de título cancelado vai sem link"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29, questionário (AskUserQuestion) na sessão que executa o §2 itens 3–5 de `D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO` (PR #971), sobre a ressalva do revisor-independente no PR #983: Título cancelado → \"Sem link (Recomendado)\""
atualizado: "2026-10-29"
---
# D-2026-10-29-F5-16B-TITULO-CANCELADO

**Estado:** `decided`. Lacuna de spec achada pelo revisor-independente no PR #983 ([[F5]] 16b) e respondida na recomendação.

| Lacuna | Resposta do dono | Efeito |
|---|---|---|
| [[D-2026-10-29-F5-16B-E-P-RET-4]] item 2 fez do nº do título um link para o AR filtrado pelo nº, com o drawer de cobranças aberto. Título cancelado sai do AR (`deletedAt`), então o link abria o AR vazio ou, com nº reaproveitado, outro título vivo, sem drawer | **Sem link** | a lista ganha `receivableCancelled` (`deletedAt` do título, no mesmo join do nº); o FE mostra o nº como texto com o selo "cancelado"; o clique na linha continua abrindo o detalhe da cobrança |

Não autoriza merge fora da regra de classe de risco ([[D-2026-10-28-FLUXO-AUTONOMO]]).
