---
id: "D-2026-10-04-I1B-RUNBOOK-ASSINADO"
tipo: "decisao"
dominio: "plataforma"
titulo: "RUNBOOK-I1B-UNIT-REKEY: desfecho PASSOU (lista vazia) assinado pelo dono no chat, sem editar o arquivo"
estado: "decided"
autorizacao: "dono, chat, 2026-10-04: \"Eu estou autorizando daqui a assinatura, nao preciso seguir a politica de mudar o arquivo\" + desfecho \"PASSOU (Recommended)\" no AskUserQuestion"
atualizado: "2026-10-04"
---
# D-2026-10-04-I1B-RUNBOOK-ASSINADO — fechamento do runbook do I1b

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-04 (sessão do copiloto de gate). Resposta literal: *"Eu estou autorizando daqui a
assinatura, nao preciso seguir a politica de mudar o arquivo"*. Desfecho escolhido no AskUserQuestion: *"PASSOU
(Recommended)"*.

Documentos:
- Runbook (modelo): [`RUNBOOK-I1B-UNIT-REKEY.md`](../../accounting/RUNBOOK-I1B-UNIT-REKEY.md)
- Registro da execução: [`RUNBOOK-I1B-UNIT-REKEY.rascunho-2026-10-04.md`](../../accounting/RUNBOOK-I1B-UNIT-REKEY.rascunho-2026-10-04.md)

## O que foi assinado

- **Executado em** `main` = `fbd99ab3`, checkout raiz, contra `server/prisma/prisma/dev.db` (a linha `alvo:` do passo 2).
- **Passo 3: lista de aplicação vazia.** Os únicos `LEGACY` são `unit-incr6-val` e `unit-incr6-val-1782938879534`
  (14 contas, 4 lançamentos e 8 postings cada), que continuam órfãos documentados pelo F-RK-3 b. `seed-unit-presumido`
  e `seed-unit-real` são `EXCLUDED_TENANT` (19 contas, 357 lançamentos e 717 postings cada). A Matriz do admin é
  `SKIP_REAL_UNIT`.
- **Passos 4–7 e 9: N/A.** Não há `--apply`, e o `dev.db` não foi alterado (md5 `9de3277d…` conferido pelo S1 do
  `smoke:migration`).
- **Passo 10:** boot de produção sem `Boot ABORTADO`. O 200 autenticado com `<novo>` não foi colhido porque não existe
  `<novo>`.

## Desvio da política, registrado e não escondido

- O RUNBOOK-FORMAT e o CLAUDE.md exigem que a evidência seja colada pelo executor humano e assinada **no arquivo**. Aqui,
  a evidência dos passos 1–3, 8 e 10 foi **colhida e colada por uma sessão de agente**, a pedido do dono. A assinatura
  foi dada **pelo chat**, e o dono dispensou explicitamente a edição do arquivo. O copiloto (GHC-001) avisou antes e
  não assinou: esta nota transcreve a assinatura do dono, não a substitui.
- O dono é quem define a política, e a dispensa vale **para esta execução**. Não é precedente geral: outro gate só
  dispensa o arquivo com nova dispensa citável.

## Achados no caminho (fora do escopo)

- **Lacuna do runbook:** os esperados dos passos 6, 7, 9 e 10 pressupõem lista não vazia. Falta definir o esperado
  para lista vazia. Sem "executa".
- **Ambiente:** o Qdrant está configurado mas inalcançável (`/health` 503 `degraded`). Isso não aborta o boot.
- **Incidente:** na 1ª tentativa do passo 10, a sessão-agente matou o `ts-node-dev` da sessão
  `fe-incr-accountant-governance`, que ocupava a porta 3001. O pai também já tinha morrido quando conferido às 23h+.
  A sessão precisa reiniciar o servidor lá.
- **Consequência de produto:** o I1b fecha **sem nenhum re-key**. Os dois `unit-incr6-val*` continuam no `dev.db`
  como órfãos.
