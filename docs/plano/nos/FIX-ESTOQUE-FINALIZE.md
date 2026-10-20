---
id: "FIX-ESTOQUE-FINALIZE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Venda: estoque não baixa no Finalized · comissão grava commissionRate em vez de rate · DynamicForm envia readOnly (400 na edição)"
estado: "done"
estado_detalhe: "PR #771 aberto, 3 pares test→fix, GAP-MAP Nível 3 [CORRIGIDO]; mergeado em 20/10 (7180ee3e), squash, CI 14/14; merge autorizado pelo dono em chat: \"Autorizo o merge do #771 e do #769, nessa ordem, com CI verde.\""
autorizacao: "dono, chat, 2026-10-19 (questionário): \"Autorizo as duas (Recommended)\" — registrar no GAP-MAP, instrumentar e corrigir; merge NÃO autorizado"
prs: ["#771"]
atualizado: "2026-10-20"
---
# FIX-ESTOQUE-FINALIZE — Venda: estoque não baixa no Finalized · comissão grava commissionRate em vez de rate · DynamicForm envia readOnly (400 na edição)

**Estado:** `done` — PR #771 aberto, 3 pares test→fix, GAP-MAP Nível 3 [CORRIGIDO]; mergeado em 20/10 (7180ee3e), squash, CI 14/14; merge autorizado pelo dono em chat: "Autorizo o merge do #771 e do #769, nessa ordem, com CI verde."  
**Autorização:** dono, chat, 2026-10-19 (questionário): "Autorizo as duas (Recommended)" — registrar no GAP-MAP, instrumentar e corrigir; merge NÃO autorizado  
**Depende de:** —  
**PRs:** #771  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

## Lacunas

1. **Estoque nunca baixava ao finalizar venda** (provado em SQLite real: stock 10 / reserved 2 depois de Finalized, com
   movimento de saída gravado). A guarda de idempotência de `stockSync` relia a venda já persistida como Finalized.
2. Comissão materializada gravava `commissionRate`; o campo do preset é `rate`.
3. A edição genérica de registro enviava campos `readOnly` (booleanos sempre) e o servidor recusava com 400.

## Por que vem antes do H2

Os passos 6–11 do [[H2]] fazem vendas pela tela do salão. Sem este PR, o sign-off de browser valida estoque errado.
