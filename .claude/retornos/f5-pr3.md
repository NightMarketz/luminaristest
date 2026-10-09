---
slug: f5-pr3
no: F5
veredicto: PASS (alegação do orquestrador; prova-runner não rodou)
---
# Retorno — F5 PR-3 (relatório de liberações do MP → extrato da PaymentAccount → F7)

Implementação: commit ec426e7c (P3-1..P3-12), sob as decisões G1–G8 (D-2026-10-10-F5-PR3-FORKS, dono, chat, 2026-10-10).
O agente executor caiu por erro de API (403 oauth_org_not_allowed) enquanto esperava a integração. O orquestrador
trouxe o main por merge (o #609 já estava mergeado), regenerou o snapshot de shape (43b7caea) e rodou os gates abaixo.

## PROVA
| Comando | Exit | Resultado |
|---|---|---|
| server `npx tsc --noEmit` | 0 | limpo |
| server `npx tsc --noEmit -p tsconfig.test.json` | 0 | limpo |
| server `npx eslint src --quiet` | 0 | limpo |
| my-app `npx tsc --noEmit` | 0 | limpo |
| server `npx jest --selectProjects unit` | 0 | 4304 passed, 5 skipped, 1 todo |
| server `NODE_OPTIONS=--max-old-space-size=8192 npm run test:integration` | 0 | 137/137 suítes, 1140 testes (log sha256 \2ce8bbe74ba8d11…) |

## Aberto
- Merge só depois da sonda de colunas em produção (F-PPB-1 c); deploy exige PAYMENT_CREDENTIAL_KEYS no env do M2 e webhook no painel do MP.
- FE do F7 sem exibir feeCents: BRIEF de FE separado (dono vai abrir).
- Sem review independente.
