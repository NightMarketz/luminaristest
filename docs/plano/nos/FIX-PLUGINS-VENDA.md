---
id: "FIX-PLUGINS-VENDA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Plugins de venda/estoque: resíduo dos achados de 19/10 (compra vira Adjustment, provisionamento pára em 50, efeitos fora da tx, ponte com linha pré-recálculo…)"
estado: "planned"
estado_detalhe: "Registrado 19/10; itens 3–18 de §3.1 do documento de achados, todos [V] por leitura. Depende do #771 (mesmos arquivos)"
depende_de: ["[[FIX-ESTOQUE-FINALIZE]]", "[[TESTE-ACOPLAMENTO-PRESET]]?"]
write_set: ["server/src/features/dynamicTables/rules/**", "server/src/features/dynamicTables/presets/modules/**"]
atualizado: "2026-10-19"
---
# FIX-PLUGINS-VENDA — Plugins de venda/estoque: resíduo dos achados de 19/10 (compra vira Adjustment, provisionamento pára em 50, efeitos fora da tx, ponte com linha pré-recálculo…)

**Estado:** `planned` — Registrado 19/10; itens 3–18 de §3.1 do documento de achados, todos [V] por leitura. Depende do #771 (mesmos arquivos)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[FIX-ESTOQUE-FINALIZE]], [[TESTE-ACOPLAMENTO-PRESET]]?  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Itens, por efeito no dado (detalhe e arquivo:linha no documento de achados §3.1)

**Mudam número ou estoque:**
- Compra manual vira `Adjustment` (`sourceType` não declarado no preset) e some do KPI de custo.
- Provisionamento de estoque por produto/unidade pára em 50 linhas (`findDataByTableId` sem paginação).
- Efeitos de escrita em hooks `before*` fora da tx (estoque, agendamento, soft delete da venda).
- Ponte contábil e resposta HTTP recebem a linha pré-recálculo (receita = total enviado pelo cliente).
- Venda que nasce `Finalized` pula os guards de finalização.
- Fallback de estoque cruza unidade; serviço conta qty 1 no cabeçalho e `q*p` nos KPIs.

**Silenciosos:** edição de item de serviço falha com Appointments instalado; falha no 1º item apaga o rascunho;
agendamento automático escapa de `noOverlap`/`lifecycle`; `customerMetrics` sobrescreve estágio; `id` gravado no JSON;
`GoalsPlugin` mantém "Reached"; `reason` `'SALE'` × `'Sale'`; `LeadsPlugin` limpa campo depois de persistido.

**Morto:** ramo `sourceType === 'SALE'`, código inalcançável em `SalesPlugin.beforeUpdate`, tolerância de duração descartada,
campos declarados sem leitor.
