---
id: "D-2026-09-25-FASE1-PIS-COFINS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Fase 1 PIS/COFINS pós-contador: F-PC-1 → b, F-PC-2 → a, flag de IPI rejeitada no DTO"
estado: "decided"
autorizacao: "dono, 2026-09-25 (sessão de execução; mensagem 'Corrige a Fase 1; F-PC-1 → (b), F-PC-2 → (a)' + AskUserQuestion da flag de IPI)"
atualizado: "2026-09-25"
---
# D-2026-09-25-FASE1-PIS-COFINS — Fase 1 PIS/COFINS pós-contador

**Estado:** `decided`  
**Autorização:** dono, 2026-09-25  
**Depende de:** —  
**Desbloqueia:** [[X6]] (emenda)  

## Decisão

Forks da Fase 1 de [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md),
insumo [`TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md):

- **F-PC-1 → (b):** crédito de compra de fornecedor do Simples continua **não credita** por default; o cliente liga com aprovação do contador. Sem mudança de código.
- **F-PC-2 → (a):** alerta de CST divergente só no `warnings` da importação (hoje exposto pelo preview, `NfePreviewService.ts:69`); persistência para a revisão do contador fica para a Fase 5.
- **Flag `pisCofinsCreditIncludesIpi`** (pergunta da sessão de correção): o DTO do perfil fiscal **rejeita `true`** (400, STJ Tema 1.373 — IPI fora da base é regra fixa); a coluna fica no banco com default `false`, sem migração.

## Execução

- Instrumentação: #379 (`f8029916`) — GAP-MAP 10–13, transcrição da Lei 13.097/2015.
- Correção: #381 (`c1937b1a`) — C-1, C-3, IPI-BASE, C-2 (bebidas) verdes.
- **Aberto:** combustíveis (nenhuma lei lida traz NCM); crédito do não-varejista de bebida pelo valor da nota (Lei 13.097 art. 30) não modelado; CST 05..09 seguem decidindo antes do NCM.
