---
id: "FIX-ANALYTICS-RESIDUO"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Analytics, resíduo: seletor de período não chega aos pipelines, fusos divergentes entre KPIs, card do grupo errado, \"1.500\" vira 1,5, validador que só loga…"
estado: "inflight"
estado_detalhe: "26/10 (fold): **#894 em `main`** pelo consolidado #902 (25/10, `63e0342f`) — as 14 chaves de `importantFields` do KNOWN_GAPS esvaziadas pela fonte do KPI (tableSource por KPI, F-TAP-6 b), critério de pronto do dono cumprido. Fica inflight só pelo #899 (só doc: colunas do detalhe em KPI mixed, \"Aceitar e documentar\", dono 25/10); fecha no merge do #899 · Registrado 19/10; itens 7–24 de §3.2 do documento de achados. Depende do #770"
depende_de: ["[[FIX-ANALYTICS-DADO]]", "[[TESTE-ACOPLAMENTO-PRESET]]?"]
autorizacao: "dono, chat, 2026-10-25: \"Dispara uma sessao para FIX-PLUGINS-VENDA e FIX-ANALYTICS-RESIDUO: já têm o teste-guarda como critério de pronto. Cada um fecha quando esvaziar a sua parte de `KNOWN_GAPS`: 6 chaves para o primeiro, 14 para o segundo.\" + \"Rota de detalhe órfã (§3.2 #20): se ela sobrevive é decisão do FIX-ANALYTICS-RESIDUO. Se for removida, as chaves de `importantFields` saem junto.\" — escopo LIMITADO às 14 chaves de `importantFields` do KNOWN_GAPS de analyticsFieldMappingCoupling.test.ts e à decisão sobre a rota `chart/:chartKey/details`; demais itens §3.2 (validador #15, período/fuso, measures, cache) fora; sem merge"
write_set: ["server/src/features/analytics/**", "my-app/features/dashboard/category-views/finance/components/analytics/**"]
atualizado: "2026-10-26"
prs: ["#894"]
---
# FIX-ANALYTICS-RESIDUO — Analytics, resíduo: seletor de período não chega aos pipelines, fusos divergentes entre KPIs, card do grupo errado, "1.500" vira 1,5, validador que só loga…

**Estado:** `inflight` — 26/10 (fold): **#894 em `main`** pelo consolidado #902 (25/10, `63e0342f`) — as 14 chaves de `importantFields` do KNOWN_GAPS esvaziadas pela fonte do KPI (tableSource por KPI, F-TAP-6 b), critério de pronto do dono cumprido. Fica inflight só pelo #899 (só doc: colunas do detalhe em KPI mixed, "Aceitar e documentar", dono 25/10); fecha no merge do #899 · Registrado 19/10; itens 7–24 de §3.2 do documento de achados. Depende do #770  
**Autorização:** dono, chat, 2026-10-25 — só as 14 chaves de `importantFields` em `KNOWN_GAPS` e a decisão sobre a rota de detalhe (§3.2 #20); resto do nó fora; sem merge  
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

## Decisões do dono (questionário, 2026-10-25)

- Rota de detalhe órfã (§3.2 #20): **(a) manter** a rota `GET /api/analytics/chart/:chartKey/details` e corrigir os `importantFields`.
- Write_set estendido só para `presets/modules/finance/ExpensesModule.ts` e `SalesModule.ts` (blocos `importantFields`/`defaultImportantFields`) e para o `KNOWN_GAPS` do teste.
- Em `expenses`: `date` → `dueDate`; `status` → `paymentStatus`.
- Caixa: "Contas a Pagar Vencidas" e "Prazo Médio de Pagamento (dias)" ganham entradas próprias, com os campos de "Contas a Pagar Total"; a chave morta "Lucro por Cliente" vira "Lucro Médio por Cliente".
