---
id: "D-2026-10-16-W5-CHAVE-CONTROLE-TOTAL"
tipo: "decisao"
dominio: "plataforma"
titulo: "W5 item 6: o Controle Total aceita só a chave do registro (beauty_salon → 404)"
estado: "decided"
autorizacao: "dono, questionário, 2026-10-16: \"Só a chave do registro\"; confirmado no chat da sessão do W5 em 2026-10-16: \"Vale a (b): só a chave do registro\""
atualizado: "2026-10-16"
---
# D-2026-10-16-W5-CHAVE-CONTROLE-TOTAL: chave do Controle Total

**Estado:** `decided`, contra a recomendação do agente, que era a opção (a).

**Autorização:** no questionário de 16/10/2026, o dono respondeu *"Só a chave do registro"*. No mesmo dia, no chat da
sessão de execução do W5, confirmou: *"Vale a (b): só a chave do registro"*. Essa resposta substitui a escolha
anterior, feita na mesma sessão, pela opção (a).

**Documento:** [`BE-INCR-PRESET-KB-SINGLE-SOURCE-brief.md`](../../accounting/BE-INCR-PRESET-KB-SINGLE-SOURCE-brief.md) §2 item 6.

Nós: [[W5]], [[I4]] (F-I4-3 a).

## A lacuna

O item 6 do BRIEF faz o Controle Total resolver o preset por `presetService.getPresetByKey`, que procura no registro;
chave fora dele dá 404. Isso quebrava o teste do I4 (#693, `dashboardCreate.accounting.integration.test.ts`, itens 9 e 10),
que mandava `presetKey: 'beauty_salon'`, em snake_case, e esperava 201. Até então essa chave era resolvida pelo import
dinâmico do `PresetManager`.

| Opção | Efeito |
|---|---|
| (a) casar a chave por `keyToPascalCase` contra o registro | `beauty_salon` continua dando 201 |
| **(b) só a chave do registro** ✅ | `beauty_salon` → 404; o teste do I4 passa a mandar `beautySalon` |

## Consequências aplicadas no PR-1 do W5 (#726)

1. O teste do I4 passa a usar `presetKey: 'beautySalon'` → 201 (Active). Um caso novo prova que `beauty_salon` → 404 e
   que nada é instalado.
2. O comentário de `resolveOnboardingSectorKey` (`dashboardController.ts`) dizia que o Controle Total aceitava
   `beauty_salon`. Foi corrigido. A função continua normalizando por `keyToPascalCase` (e o teste unitário dela segue
   valendo), mas o create só a chama com a chave do registro.
3. Outros clientes que mandam snake_case, procurados por grep em `server/` (src, test, scripts, prisma, `public/openapi.json`),
   `my-app/` (features, lib, pages, components) e `docs/`. Termos: `beauty_salon|aesthetic_clinic|crm_module|core_system`
   e `mode: 'custom'`. Nenhum cliente real manda snake_case:
   - O único cliente do Controle Total no FE é `TotalControlSetup.tsx:185`, que manda `selectedPreset.key`, a chave do
     registro vinda de `GET /dashboard/presets`.
   - Não há snake_case em seed, na doc do OpenAPI nem no chat-agent.
   - As outras ocorrências são o próprio teste do I4 (corrigido), o teste unitário da função pura e exemplos em
     JSDoc do `PresetManager.ts` / `TablePreset.model.ts`. O `PresetManager.ts` fica fora do diff pelo F-W5-2.
