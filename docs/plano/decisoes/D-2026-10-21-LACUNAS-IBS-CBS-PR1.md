---
id: "D-2026-10-21-LACUNAS-IBS-CBS-PR1"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas L1–L3 do PR-1 do IBS-CBS-2027 (#812) ratificadas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"ratifica L1–L3 por questionário\" — respostas no AskUserQuestion de 21/10. Aplicadas no PR #812 sob o 'executa o PR-1' do mesmo dia"
atualizado: "2026-10-21"
---
# D-2026-10-21-LACUNAS-IBS-CBS-PR1

| Lacuna | Resposta | O que fica decidido |
|---|---|---|
| L1 — RN E0959 no cClassTrib do serviço | **Ao salvar o serviço** (a) | O upsert do perfil do serviço lê o CST do perfil da unidade (dentro da tx) e responde 400 se o prefixo não bater; perfil sem CST não confere. A emissão não reconfere (troca posterior do CST fica fora) |
| L2 — trilha de auditoria | **Entra** (a) | `service_fiscal_profile.updated` leva `cClassTrib`; allowlist do `auditCanonical.ts` atualizada no mesmo PR |
| L3 — fim da linha DRAFT da CBS 2027 | **Sem data final** (b) — contra a recomendação | `ibscbs-cbs-2027` com `vigenteAte = NULL`. Risco registrado: em 2029 a linha continuaria valendo até outra ser publicada |

Não há merge. P-IBS-1..7 seguem com o contador / fonte oficial.
