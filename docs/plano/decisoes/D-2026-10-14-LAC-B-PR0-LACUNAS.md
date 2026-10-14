---
id: "D-2026-10-14-LAC-B-PR0-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "3 lacunas da LAC-B sobre a main com kit de setor: gate do 2º setor na tx do begin, 409 também para kit não-INSTALLED, tela sem o kit"
estado: "decided"
autorizacao: "dono, chat, 2026-10-14: \"Executa o LAC-B (FE-INCR-BINDING-ACTIVATION) — sessao-feature, PR-0 e depois PR-1\" + questionário (as 3 recomendações)"
atualizado: "2026-10-14"
---
# D-2026-10-14-LAC-B-PR0-LACUNAS — lacunas da LAC-B abertas pelo kit de setor

Documentos: [`FE-INCR-BINDING-ACTIVATION-screen-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-screen-brief.md)
(item 0, F-BA-5) e [`FE-INCR-BINDING-ACTIVATION-EMENDA-1-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-EMENDA-1-brief.md)
§7. Nó: [[LAC-B]].

**Por que existem:** o BRIEF da tela (06/10) é anterior ao KIT-SETOR PR-2. Desde ele, o `activate-default` instala o
kit em 7 passos com commit próprio (sem tx única até o `Active`), e a `KitInstallation` tem `@@unique([userId, unitId])`.
O BRIEF da tela não previa nenhum dos dois, e o BRIEF do KIT-SETOR (§ vizinhos) pedia uma emenda da tela para mostrar o kit.

## Lacunas decididas por questionário (14/10)

| # | Lacuna | Resposta literal | Decisão |
|---|---|---|---|
| L-1 | Onde fica a guarda do 2º setor ("gate dentro da tx") | *"Pré-check + tx no begin (Recommended)"* | O `BindingActivationService` lê o `Active` de qualquer setor e a `KitInstallation` e devolve 409 cedo. A mesma checagem roda de novo dentro de uma tx, junto com o `begin` da `KitInstallation` (o gate autoritativo), e o P2002 da corrida vira 409 quando quem venceu é outro kit. Liga por `install(…, { exclusiveSector: true })`, que só o `/activate-default` passa. O CLI do kit não muda |
| L-2 | O 409 cobre a `KitInstallation` de outro setor que não está `INSTALLED`? | *"Sim, 409 nos dois casos (Recommended)"* | `BINDING_SECTOR_CONFLICT` 409 para outro setor na unidade, seja binding `Active` ou kit em qualquer status (antes era o 400 do `KitInstallService`) |
| L-3 | A tela mostra o kit (versão, pendências)? | *"Tela como no BRIEF (Recommended)"* | PR-1 segue BRIEF + EMENDA-1. Os códigos do kit (`KIT_FISCAL_PROFILE_REQUIRED`, `KIT_INSTALL_STEP_FAILED`) aparecem pela `message` do BE (fallback do item 6). Versão e pendências do kit ficam como achado, para uma emenda futura (`FE-INCR-KIT-SETOR`) |
