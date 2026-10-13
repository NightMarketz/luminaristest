---
id: "D-2026-10-13-KIT-SETOR-PR3-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "4 lacunas do PR-3 do KIT-SETOR (ajuste papel→conta): compensação auditada, 422 no Draft, base = kit instalado, view"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13: \"Executa o PR-3 do KIT-SETOR\" + questionário (as 4 recomendações)"
atualizado: "2026-10-13"
---
# D-2026-10-13-KIT-SETOR-PR3-LACUNAS — lacunas do PR-3 do KIT-SETOR

Documento: [`BE-INCR-KIT-SETOR-brief.md`](../../accounting/BE-INCR-KIT-SETOR-brief.md) §11 (emenda do PR-3), sobre os
itens 18–25 do §2. Nó: [[KIT-SETOR]].

## Lacunas decididas por questionário (13/10)

| # | Lacuna | Resposta literal | Decisão |
|---|---|---|---|
| E-11.1 | Desfazer o ajuste quando o compile dá `Draft`: o que a auditoria registra | *"Compensa e audita (Recomendado)"* | tx1 = gate + grava + evento; `Draft`/exceção ⇒ tx de compensação volta ao estado anterior e audita o desfazer com `kit.role_override_set`/`_removed` |
| E-11.2 | Resposta HTTP do PUT/DELETE com compile `Draft` | *"422 com os bloqueantes (Recomendado)"* | 422 `ROLE_OVERRIDE_COMPILE_DRAFT` com `{binding:{status:'Draft', bindingVersion}, blocking, missingEventKeys}` |
| E-11.3 | Base da recompilação; unidade sem kit `INSTALLED` | *"Kit instalado + 422 novo (Recomendado)"* | Binding do kit na `kitVersion` da `KitInstallation`; sem kit `INSTALLED` ⇒ 422 `KIT_NOT_INSTALLED` |
| E-11.4 | Shape do `RoleAccountOverrideView` | *"Com código do kit (Recomendado)"* | `{id, role, accountId, accountCode, kitAccountCode, motivo, setById, createdAt, updatedAt}` |
