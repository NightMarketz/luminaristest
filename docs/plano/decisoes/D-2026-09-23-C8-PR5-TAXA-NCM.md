---
id: "D-2026-09-23-C8-PR5-TAXA-NCM"
tipo: "decisao"
dominio: "contabil"
titulo: "C8 PR-5: taxa do rascunho de imobilizado derivada do NCM pelo Anexo III; sem coluna JSON no Payable"
estado: "decided"
autorizacao: "dono, 2026-09-23 (sessão de execução do plano, AskUserQuestion)"
atualizado: "2026-09-23"
---
# D-2026-09-23-C8-PR5-TAXA-NCM — C8 PR-5: taxa do rascunho de imobilizado derivada do NCM pelo Anexo III; sem coluna JSON no Payable

**Estado:** `decided`  
**Autorização:** dono, 2026-09-23  
**Depende de:** —  
**Desbloqueia:** —  

## Decisão

(1) Taxa do FixedAsset PENDING_ACTIVATION vindo de NF-e = DepreciationRate do escopo casada pelo prefixo NCM mais longo; sem correspondência → 400; prefixo mais longo com taxas distintas → 400 (nunca escolha silenciosa; consequência derivada no review). (2) Sem coluna Payable.fixedAssetItems: segue a spec, sourceItemRef + @@unique([payableId, sourceItemRef]). Origem: fork levantado pelo executor do C8 PR-5 (annualRateBp NOT NULL sem fonte na spec).
