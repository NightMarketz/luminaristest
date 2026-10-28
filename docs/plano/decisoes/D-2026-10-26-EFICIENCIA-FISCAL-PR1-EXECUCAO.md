---
id: "D-2026-10-26-EFICIENCIA-FISCAL-PR1-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do EFICIENCIA-FISCAL PR-1 (BRIEF #846) e discountKind obrigatório só no desconto por item; lacunas de spec da execução"
estado: "decided"
autorizacao: "dono, chat, 2026-10-26: \"faz o EFICIENCIA-FISCAL PR-1 (BRIEF #846)\" — executa só do PR-1 (itens 1–10). Decisão no AskUserQuestion do mesmo dia: \"Só no desconto por item (Recomendado)\". Sem merge"
atualizado: "2026-10-26"
---
# D-2026-10-26-EFICIENCIA-FISCAL-PR1-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-26: *"faz o EFICIENCIA-FISCAL PR-1 (BRIEF #846)"*. Nó:
[[EFICIENCIA-FISCAL]]. Forks do PR-1 já ratificados: [[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]], [[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]].

## Dependência aberta no `_INDEX`

O nó estava na "Fila aberta", não em "Destravados agora": a aresta firme [[X7]] está `inflight` só por oráculos humanos (a
Fase C está em `main`). O PR-1 não consome nada do X7 (ele entra no PR-3, simuladores). O BRIEF §2 já dizia que o PR-1 "pode
receber `executa` hoje". A sessão seguiu com o pedido do dono e registra a aresta aqui.

## Decisão do dono (AskUserQuestion, 26/10)

Pergunta: a regra (i) do item 2 (`discountKind` obrigatório quando há desconto, F-EF-9 a) fazia o finalize de qualquer venda com
desconto dar 400. Isso valia até o FE-INCR-EFICIENCIA-FISCAL. O wizard Nova Venda e o seed de dev mandam só `discountAmount`.

| Opção | Escolha |
|---|---|
| **Só no desconto por item (Recomendado)**: `discountKind` obrigatório quando algum item tem `discountCents`; o desconto só no cabeçalho (legado ou wizard atual) passa sem ele, segue como hoje (sem destaque, peso bruto) e o fiscal-check avisa (`DESCONTO_FORA_DO_DOCUMENTO`) | **escolhida** |
| Obrigatório sempre (letra) | — |
| Obrigatório + FE mínimo neste PR | — |

## Lacunas de spec abertas na execução (não decididas; o PR registra o caminho tomado)

1. **Fonte da carga por item.** O `cargaTributariaDoItem` do ADR §6 item 3 não está no checklist do PR-1. O código depende da
   NCM, que vem do X10a. O guard tem a porta `cargaDoItem`, que devolve nulo. Com isso, a alocação por CARGA sempre cai no
   proporcional com `ORDEM_DE_CARGA_INDETERMINADA` (D5), e o item 8 (economia e sugestão `CRITERIO_CARGA`) só se exercita em
   teste. *Decidir:* em que PR ou nó a fonte entra.
2. **CONDITIONAL "receitaCents bruto" (item 9, I-4) × "Σ subrazão = crédito do razão".** O razão credita `totalAmount`, que é
   líquido de qualquer desconto. Gravar a subrazão bruta quebra o tie-out, a menos que o razão passe a lançar o desconto
   condicional como despesa, e isso está fora da spec. *Implementado:* o peso fica bruto e o valor fica o do razão (como hoje).
   O mesmo vale para a DPS no CONDITIONAL: `vServ` segue a parcela líquida, sem destaque.
3. **Severidade e nome não especificados.** Foram escolhidos `DESCONTO_FORA_DO_DOCUMENTO` e
   `DESCONTO_CONDICIONAL_COMO_INCONDICIONAL` como WARN. Os 400 das regras (i) e (iii) do item 2 receberam os nomes
   `DESCONTO_SEM_TIPO` e `DESCONTO_ITEM_FORA_DA_FAIXA`.
4. **COMBO_ABAIXO_DO_CUSTO com item sem piso** só é avaliado quando todos os itens alocáveis têm piso. Nos outros casos vale o
   `SEM_CUSTO` por item (D6).
5. **ADR §12, combo de R$ 110:** o texto diz "serviço R$ 70 + cosmético R$ 80", que soma R$ 150. Pela regra (Σ (catálogo − piso)
   = R$ 70), o desconto de R$ 90 já é `COMBO_ABAIXO_DO_CUSTO`. Os testes seguem a aritmética.
