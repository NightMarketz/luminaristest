---
id: "D-2026-10-06-X8-PR2-LACUNAS-E-MERGE"
tipo: "decisao"
dominio: "fiscal"
titulo: "X8 PR-2: 8 leituras das lacunas de spec ratificadas + PR-2 e PR-3 mergeados juntos (risco D6)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — ratifica as 8 leituras do executor do PR-2 e decide 'Mergear PR-2 e PR-3 juntos'"
atualizado: "2026-10-06"
---
# D-2026-10-06-X8-PR2-LACUNAS-E-MERGE — PR-2 do [[X8]]

**Estado:** `decided`.
**Autorização:** dono, chat, 06/10/2026, questionário. A execução do PR-2 veio antes, do mesmo dia: *"Executa o PR-2 do
X8 (BE-INCR-PIS-COFINS) — sessao-feature; PR-3 fora; merge só com meu OK"*. Esta decisão **não** é "executa" do PR-3.

Origem: `.claude/retornos/x8-pis-cofins-pr2.md` (branch do PR #554), seções "Lacunas de spec" e "Divergências" (D6).

## 1. As 8 leituras estritas — ratificadas

1. "1º mês apurado": M(x−1) não confirmado e nenhum mês anterior confirmado no mesmo ano; confirmar mês anterior a um já
   confirmado ⇒ 409 "de trás para frente".
2. A ordem (409) vale também na prévia.
3. Perfil fiscal da unidade ausente ⇒ 400.
4. No não cumulativo, `provisaoContasConfiguradas` exige também a conta "PIS/Cofins a recuperar".
5. Cumulativo: crédito anterior informado > 0 ⇒ 400; saldo lido > 0 é ignorado com aviso.
6. Nomes das linhas e totais da memória como implementados (`deducoesCents` = créditos + retenções).
7. Resposta com chaves `pis`/`cofins`.
8. `regime` e `tabelaVersao` (`pis-cofins-2026-10-06`) gravados na linha.

Detalhe na EMENDA §7 de `docs/accounting/BE-INCR-PIS-COFINS-brief.md`.

## 2. Risco D6 — ordem de merge

Até o PR-3 (provisão, itens 17–19), uma apuração de PIS/Cofins confirmada com débito > 0 conta como provisão pendente no
`ExerciseClosingService` e **bloqueia o encerramento do ano**, sem saída (o reconcile a recusa pela guarda D4).

Decisão do dono: **"Mergear PR-2 e PR-3 juntos".** O #554 não entra em `main` antes do PR-3 do X8. Registrado também no
corpo do PR #554.

## Consequências

- O PR-3 do X8 continua exigindo "executa" próprio; até lá, o #554 fica aberto.
- Os P-1..P-6 do BRIEF §4 seguem abertos (oráculo = contador).
