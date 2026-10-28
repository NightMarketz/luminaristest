---
id: "FIX-PLUGINS-VENDA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Plugins de venda/estoque: resíduo dos achados de 19/10 (compra vira Adjustment, provisionamento pára em 50, efeitos fora da tx, ponte com linha pré-recálculo…)"
estado: "done"
estado_detalhe: "26/10 (fold): **#897 em `main`** pelo consolidado #902 (25/10, `2e9f3e06`) — as 6 chaves `owner: 'FIX-PLUGINS-VENDA'` do KNOWN_GAPS esvaziadas (sourceType ×2, reason SALE/RETURN ×4), critério de pronto do dono cumprido. Fica inflight só pelo resíduo #898 (i18n SALE/RETURN, Entrada+Compra → Payable), autorizado à parte pelo dono em 25/10 (\"Isso aqui podemos resolver em outra sessão?\" → New session); fecha no merge do #898 · Registrado 19/10; itens 3–18 de §3.1 do documento de achados, todos [V] por leitura. Depende do #771 (mesmos arquivos)"
depende_de: ["[[FIX-ESTOQUE-FINALIZE]]", "[[TESTE-ACOPLAMENTO-PRESET]]?"]
write_set: ["server/src/features/dynamicTables/rules/**", "server/src/features/dynamicTables/presets/modules/**"]
atualizado: "2026-10-27"
autorizacao: "**EXECUTA** (dono, chat, 2026-10-25): \"Dispara uma sessao para FIX-PLUGINS-VENDA e FIX-ANALYTICS-RESIDUO: já têm o teste-guarda como critério de pronto. Cada um fecha quando esvaziar a sua parte de `KNOWN_GAPS`: 6 chaves para o primeiro, 14 para o segundo.\" — SÓ as 6 chaves `owner: 'FIX-PLUGINS-VENDA'` de `presetSchemaCoupling.test.ts` (sourceType ×2, reason=SALE/RETURN ×4), sessao-correcao; demais itens do nó fora; sem merge · questionário (dono, chat, 2026-10-25): reason → \"Preset ganha SALE/RETURN\"; sourceType → \"Tirar a leitura, manter reason\""
prs: ["#897", "#898"]
---
# FIX-PLUGINS-VENDA — Plugins de venda/estoque: resíduo dos achados de 19/10 (compra vira Adjustment, provisionamento pára em 50, efeitos fora da tx, ponte com linha pré-recálculo…)

**Estado:** `done` — 26/10 (fold): **#897 em `main`** pelo consolidado #902 (25/10, `2e9f3e06`) — as 6 chaves `owner: 'FIX-PLUGINS-VENDA'` do KNOWN_GAPS esvaziadas (sourceType ×2, reason SALE/RETURN ×4), critério de pronto do dono cumprido. Fica inflight só pelo resíduo #898 (i18n SALE/RETURN, Entrada+Compra → Payable), autorizado à parte pelo dono em 25/10 ("Isso aqui podemos resolver em outra sessão?" → New session); fecha no merge do #898 · Registrado 19/10; itens 3–18 de §3.1 do documento de achados, todos [V] por leitura. Depende do #771 (mesmos arquivos)  
**Autorização:** **EXECUTA** (dono, chat, 2026-10-25), só as 6 chaves de `KNOWN_GAPS` deste nó — ver `autorizacao` no frontmatter  
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
