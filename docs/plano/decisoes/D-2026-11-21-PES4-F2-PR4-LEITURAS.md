---
id: "D-2026-11-21-PES4-F2-PR4-LEITURAS"
tipo: "decisao"
dominio: "dp"
titulo: "DP F2 (PR-4/PR-5): IRRF do adiantamento pelo art. 63 § 1º no PR-5, data no lançamento de jornada só no mês com troca de versão, horas da Súm. 340 pela escala"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21, questionário da sessão de execução do PR-4 (sessao-feature), as três pela recomendação: \"Art. 63 § 1º no PR-5 (Recommended)\" · \"Data só se o mês troca (Recommended)\" · \"Escala − faltas + HE (Recommended)\" · execução coberta pelo executa do F2 (dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\")"
atualizado: "2026-11-21"
---
# D-2026-11-21-PES4-F2-PR4-LEITURAS

**Estado:** `decided`. Nó: [[PES-4]]. BRIEF: [BE-INCR-DP-F2](../../accounting/BE-INCR-DP-F2-brief.md) itens 36–38, 42–43 e
F-DPF-10. PR do motor: #1326.

Origem: três pontos do motor (PR-4) que nenhum item fixa e que mudam o valor do holerite. O primeiro também foi o
achado A1 do revisor do #1326 (rodada 1): o roteiro `ADIANTAMENTO` não seguia o F-DPF-10 revisto.

| # | Ponto | Decisão | Onde entra |
|---|---|---|---|
| P1 | F-DPF-10 revisto (06/11): com a mensal paga em outro mês, o IRRF do adiantamento se calcula na hora (IN RFB 1.500 art. 63 § 1º). O catálogo congelou `ADIANTAMENTO` e `DESCONTO_ADIANTAMENTO` com IRRF `9`, e o snapshot do adiantamento não sabe a data da mensal | **"Art. 63 § 1º no PR-5"**: o PR-5 grava no snapshot do adiantamento a data de pagamento da mensal da competência. Rubricas novas com IRRF 11 para o caso "mês diferente" (as publicadas não mudam: `published.json`); a mensal desconta da base do IRRF o adiantamento já tributado. O enquadramento vai ao contador | PR-5 (snapshot, catálogo, motor) |
| P2 | Versão ou escala que muda no meio do mês: os lançamentos de HE, noturno, comissão e horas normais não têm data | **"Data só se o mês troca"**: num mês com troca de versão, o lançamento de jornada exige a data, e cada um usa a versão do seu dia; sem data, vira pendência. No mês sem troca, segue sem data (versão única) | PR-5 (DTO/validação do lançamento e motor) |
| P3 | Súm. 340 do TST: "horas efetivamente trabalhadas" do comissionista sem módulo de ponto | **"Escala − faltas + HE"**: dias de trabalho da escala no período × minutos por dia − faltas + HE (como o PR-4 já faz, `horasTrabalhadasMinutos`); com o DP-PONTO (F6), as horas vêm do ponto. Vai ao contador com os goldens | PR-4 (já no #1326) |
