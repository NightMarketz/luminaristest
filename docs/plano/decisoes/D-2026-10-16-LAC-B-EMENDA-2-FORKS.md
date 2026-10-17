---
id: "D-2026-10-16-LAC-B-EMENDA-2-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-KA-1..6 da EMENDA-2 da LAC-B: aba 'Kit de setor', pendências com aceitar/recusar (PR-2), retomada só em FAILED, steps na view, versão M disponível, fora do modo cliente"
estado: "decided"
autorizacao: "dono, chat, 2026-10-16: \"Passa os forks F-KA-1..6 da EMENDA-2 por questionário\" + questionário (2 blocos) + \"Grava + emenda o BRIEF\" — só docs, sem 'executa'"
atualizado: "2026-10-16"
---
# D-2026-10-16-LAC-B-EMENDA-2-FORKS — forks da tela do kit de setor

Documento: [`FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief.md`](../../accounting/FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief.md)
§5 (forks) e §10 (ratificação). Nó: [[LAC-B]]. Origem: L-3 de [[D-2026-10-14-LAC-B-PR0-LACUNAS]].

## Insumos do §7 fechados antes do questionário (lidos em `origin/main` `b8a8a160`, não executados)

1. `resolveBindingScope(user, unitId)` devolve `ownerUserId = user.userId` (`server/src/features/accountingBinding/scope/BindingScope.ts:25`).
   Em modo cliente, `GET /accounting-kit` leria o silo do **contador**, não o do cliente.
2. `KitInstallationRepository.begin` sobre linha existente só regrava `status: 'INSTALLING'` (sem trava nem
   verificação de status); o laço de `install()` retoma de `lastCompletedStep + 1`. Dois cliques concorrentes rodariam os
   mesmos passos em paralelo.
3. A retomada tem teste de integração no serviço (`KitInstallService.integration.test.ts:184`, "retoma do passo 7 sem
   duplicar efeito"). Pela rota `activate-default` com o mesmo setor: **não** há teste (só leitura).

## Forks decididos (questionário, 16/10)

| Fork | Resposta literal | Decisão | Na recomendação? |
|---|---|---|---|
| F-KA-1 | *"(c) Aba nova 'Kit de setor'"* | Aba nova em `TABS` da AccountingView. A faixa da LAC-B não muda (F-BA-1 a segue) | **Não** (era b) |
| F-KA-2 | *"(c) Lista com aceitar/recusar"* | Pendências com aceitar/recusar + `motivo` (10–500 chars, `DecideKitPendingRequestSchema`) pelas rotas `POST /accounting-kit/pending/:id/accept\|reject` já em `main`. Traz para esta emenda a parte "decidir pendências" que o §8 deixava no `FE-INCR-KIT-SETOR` amplo; editor papel→conta e rastro seguem lá | **Não** (era b) |
| F-KA-3 | *"(a)+(ii) Botão em FAILED (Recomendado)"* | `FAILED` ⇒ aviso + "Retomar instalação" (`ConfirmModal` → `activate-default` com o mesmo setor); `INSTALLING` ⇒ "em andamento", sem botão. Teste de integração da retomada pela rota entra no PR-0 | Sim |
| F-KA-4 | *"(b) PR-0 BE aditivo (Recomendado)"* | PR-0: `steps` (último passo + avisos) na `KitInstallationView` | Sim |
| F-KA-5 | *"(a) N instalada · M disponível (Recomendado)"* | "Versão N instalada · versão M disponível" + changelog; `lastRun FAILED` ⇒ "a última atualização falhou" | Sim |
| F-KA-6 | *"(a) Fora, como a faixa (Recomendado)"* | Com `governance`, a aba não aparece e o hook não chama a rota | Sim |
| Pacote | *"PR-2 FE separado (Recomendado)"* | PR-0 BE (steps + teste da retomada pela rota) → PR-1 FE (aba, versão, lista só leitura, retomada, avisos) → PR-2 FE (aceitar/recusar com motivo, confirmação que lista o efeito, mapeamento de erros) | Sim |
| Depois | *"Grava + emenda o BRIEF (Recomendado)"* | Esta nota + §10 do BRIEF + nó LAC-B. **Sem 'executa'**: cada PR exige o seu | Sim |

## Achado aberto pela decisão do F-KA-2 (c) — para o PR-2

- `KitPendingService.accept/reject` checa só `canManageKit` (`!!actorUserId`) e não mostra, por grep, gate do contador
  ativo (o passo 3 do install tem: `KitInstallService.integration.test.ts:335`). **Inferido por grep, não lido
  integralmente.** O PR-2 confirma lendo o serviço antes de expor o botão; se faltar, é lacuna para o GAP-MAP, não
  conserto dentro do PR-2.
