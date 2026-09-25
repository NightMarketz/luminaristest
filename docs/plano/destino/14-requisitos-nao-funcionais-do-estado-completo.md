---
tipo: "destino"
secao_sdd: "§14"
titulo: "Requisitos não funcionais do estado completo"
---
# §14 Requisitos não funcionais do estado completo

| Requisito | Alvo |
|---|---|
| Exatidão monetária | Centavo inteiro, igualdade exata, zero epsilon; Σ subrazão = saldo GL verificado por reconcile |
| Integridade | Constraint de banco para idempotência; gate in-tx para invariante mutável; trilha verificável por hash |
| Disponibilidade | Emissão fiscal com contingência e reenvio; indisponibilidade de terceiro nunca bloqueia a venda |
| Desempenho | Relatório mensal de PME em segundos; ECD anual gerada sem timeout |
| Recuperação | Backup diário com restauração testada; exportação completa pelo dono |
| Observabilidade | Log de erro agregado (hoje NDJSON local); alerta remoto só com produção existente |
| Evolução | Migração versionada com smoke-gate sobre dado real; mudança fiscal como dado com vigência |
