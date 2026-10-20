---
id: "FIX-ANALYTICS-RESIDUO"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Analytics, resíduo: seletor de período não chega aos pipelines, fusos divergentes entre KPIs, card do grupo errado, \"1.500\" vira 1,5, validador que só loga…"
estado: "planned"
estado_detalhe: "Registrado 19/10; itens 7–24 de §3.2 do documento de achados. Depende do #770"
depende_de: ["[[FIX-ANALYTICS-DADO]]", "[[TESTE-ACOPLAMENTO-PRESET]]?"]
write_set: ["server/src/features/analytics/**", "my-app/features/dashboard/category-views/finance/components/analytics/**"]
atualizado: "2026-10-19"
---
# FIX-ANALYTICS-RESIDUO — Analytics, resíduo: seletor de período não chega aos pipelines, fusos divergentes entre KPIs, card do grupo errado, "1.500" vira 1,5, validador que só loga…

**Estado:** `planned` — Registrado 19/10; itens 7–24 de §3.2 do documento de achados. Depende do #770  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[FIX-ANALYTICS-DADO]], [[TESTE-ACOPLAMENTO-PRESET]]?  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Itens (§3.2)

- Seletor de período não afeta pipelines/CORE/discover; fronteiras de período divergem (custos em UTC, receita no fuso do usuário).
- Card do grupo mostra o último KPI do grid com o título do grupo.
- `DataSanitizer`: "1.500" vira 1,5. Categorias de despesa por keyword (`Personnel` em fixo e admin). Dia útil do mês e 8h fixos.
- Margem de contribuição por produto com fórmula errada admitida; `previousValue` NaN.
- Validação de campo só loga (o que deixou "contas a pagar 0" passar); drill-down por `tableSource` → 404 [I].
- Leitura dupla e O(n·m) por ponto; rotas órfãs (`chart/:key/details`, CRUD de definitions); código morto.
