---
id: "D-2026-11-04-A1-TEXTO-ATIVACAO"
tipo: "decisao"
dominio: "plataforma"
titulo: "A-1: a faixa de ativação contábil fica; o texto da confirmação diz que o plano em geral já está instalado"
estado: "decided"
autorizacao: "dono, chat, 2026-11-04 (questionário, depois da explicação de que a faixa é a saída de recuperação do onboarding): \"Manter e ajustar texto\""
atualizado: "2026-11-04"
---
# D-2026-11-04-A1-TEXTO-ATIVACAO

**Estado:** `decided`. Fecha o achado **A-1** do `RUNBOOK-H2-ATIVACAO-CONTABIL.md` (execução de 04/11, PR #1035) e a
pergunta 3 do [`HANDOFF-2026-11-04-orquestradora.md`](../../accounting/HANDOFF-2026-11-04-orquestradora.md).

## Achado

A confirmação de "Ativar contabilidade" prometia *"(1) o plano de contas padrão é instalado se o da unidade estiver
vazio"*, mas qualquer leitura da Contabilidade que liste contas já semeia o plano (`PostingService.listAccounts`), então o
efeito (1) quase nunca acontece pela ativação.

## Contexto que o dono pediu

O dono perguntou onde se clica em ativar, já que o sistema vem do onboarding com a contabilidade ligada. Resposta: o
onboarding ativa sozinho (`dashboardController.ts`, `activateAccountingOrReport`, nó I4). A faixa da Contabilidade só
aparece na unidade sem binding `Active` — ativação do onboarding que falhou ou ficou `Draft` (F-I4-2 b: o sistema do
cliente fica de pé) ou unidade criada fora do onboarding — e nunca no modo cliente. É a saída de recuperação que a
própria mensagem de erro do onboarding indica (F-BA-4 a).

## Decisão

**Manter a faixa e ajustar o texto** (só texto, sem mudar comportamento): o efeito (1) passa a dizer que o plano é
conferido, que costuma já ter sido instalado quando alguma tela da Contabilidade lista as contas, e que só é instalado
agora se ainda estiver vazio.

Correção do revisor-independente (05/11, dono: "Corrige 1069"): a primeira redação dizia "no primeiro acesso à
Contabilidade", mas a aba que abre primeiro (Balancete, `getTrialBalance`) lê sem semear. O plano só é semeado por
`listAccounts`, pelo `postEntry` e pela própria ativação. Mudança em `my-app/public/locales/{pt,en}/accounting.json` (`activation.confirm.message`) e no texto de reserva
de `AccountingActivationBanner.tsx`.
