---
id: "D-2026-10-24-OBSERVABILIDADE-FASE-B-PARCIAL"
tipo: "decisao"
dominio: "plataforma"
titulo: "Fase B parcial do nó OBS (itens 11, 13 e 15) autorizada; 4 lacunas de spec respondidas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-24: \"Executa os itens 11, 13 e 15 do PRE-ADR-OBSERVABILIDADE §5 (Fase B) com F-OBS-5 (b) e F-OBS-6 (b) provisórios, empilhado no #874. Itens 12 e 14 ficam para a Onda 0. Não autorizo merge.\" Respostas por AskUserQuestion no mesmo turno"
atualizado: "2026-10-24"
---
# D-2026-10-24-OBSERVABILIDADE-FASE-B-PARCIAL

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-24: *"Executa os itens 11, 13 e 15 do PRE-ADR-OBSERVABILIDADE §5 (Fase B) com
F-OBS-5 (b) e F-OBS-6 (b) provisórios, empilhado no #874. Itens 12 e 14 ficam para a Onda 0. Não autorizo merge."*

Os itens 11, 13 e 15 de [`PRE-ADR-OBSERVABILIDADE`](../../adr/PRE-ADR-OBSERVABILIDADE.md) §5 deixavam 4 lacunas de
spec. Foram perguntadas por questionário (AskUserQuestion, 1 rodada), com a recomendada como 1ª opção. As cédulas
anteriores são [[D-2026-10-23-OBSERVABILIDADE-FORKS]] e [[D-2026-10-23-OBSERVABILIDADE-FORKS-2]].

## Respostas do dono

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| Item 11, "6 meses mais margem" | "190 dias (Recommended)" | `ACCESS_LOG_RETENTION_DAYS = 190`: 6 meses dão no máximo 184 dias (jul–dez), mais 6 de folga |
| F-OBS-6 (b), qual header traz a porta | "Header fixo X-Client-Port" (não é a recomendada, que era o nome por env) | a porta vem de `X-Client-Port`; sem o header, ou com valor que não é inteiro 1–65535, fica `null`. A Onda 0 configura o proxy para preencher o header |
| Item 13, quando expurgar | "1ª escrita de cada dia (Recommended)" | o expurgo roda quando muda o dia UTC da escrita, não só uma vez por processo |
| Item 15, até onde vai | "Também trava no compose" (não é a recomendada, que era runbook + `.env.example`) | passo 4a no `RUNBOOK-M2-DEPLOY-SMOKE.md`, nota no `.env.example` e `${ALERT_WEBHOOK_URL:?…}` no `docker-compose.yml` |

## Fica para a Onda 0

- Item 12: padrão de guarda do art. 13 (volume encriptado, papel nomeado, inventário de leitura).
- Item 14: agregador remoto do log de erro (F-OBS-4).
- A confirmação de F-OBS-5 (b) e F-OBS-6 (b) com a topologia real.
