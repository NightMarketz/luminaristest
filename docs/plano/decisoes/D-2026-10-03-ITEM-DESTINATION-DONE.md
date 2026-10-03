---
id: "D-2026-10-03-ITEM-DESTINATION-DONE"
tipo: "decisao"
dominio: "fiscal"
titulo: "ITEM-DESTINATION fecha como done com o item 7 em (c)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03: \"aplica o fold com estado done\""
atualizado: "2026-10-03"
---
# D-2026-10-03-ITEM-DESTINATION-DONE — fold do [[ITEM-DESTINATION]] como `done`

**Estado:** `decided`.
**Autorização:** dono, chat, 03/10/2026: *"aplica o fold com estado done"*. A pergunta veio depois do merge do #481:
o agente avisou que o item 7 do BRIEF (crédito de PIS/COFINS do monofásico comprado como insumo, F-ID-4) segue em
(c) até a transcrição da P-1, e que isso poderia ser lido como pendência do nó.

**Decisão:** as duas fatias do §7 do BRIEF estão em `main` (#461 e #481), e o nó fecha como `done`. A virada do
item 7 de (c) para (a) **não** fica pendente neste nó: ela depende de insumo externo (P-1, contador e transcrição
autorizada) e, quando o insumo chegar, entra como trabalho próprio.

Fica fora deste nó, como já registrado no BRIEF §6: o par FE (A-6), `USO_CONSUMO` (A-2) e o estoque de insumo
com consumo por serviço (A-5).
