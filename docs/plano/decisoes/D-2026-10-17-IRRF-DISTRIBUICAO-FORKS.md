---
id: "D-2026-10-17-IRRF-DISTRIBUICAO-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "IRRF-DISTRIBUICAO: dividendos + JCP completo, model próprio de sócios, retenção no Simples, forks F-IRD-1..18 ratificados"
estado: "decided"
autorizacao: "dono, chat, 2026-10-17, questionário em seis rodadas na sessão de planejamento do BRIEF (sem 'executa')"
atualizado: "2026-10-17"
---
# D-2026-10-17-IRRF-DISTRIBUICAO-FORKS — escopo e forks do BRIEF do IRRF-DISTRIBUICAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-17. **Nenhuma cédula dá `executa`.** Nó: [[IRRF-DISTRIBUICAO]].
BRIEF: [`BE-INCR-IRRF-DISTRIBUICAO-brief.md`](../../accounting/BE-INCR-IRRF-DISTRIBUICAO-brief.md).

## Contexto apresentado ao dono

Desde 01/01/2026, quem distribui lucro a uma mesma pessoa física residente acima de R$ 50 mil no mês retém 10% sobre
o total do mês (Lei 9.250 art. 6º-A, incl. Lei 15.270/2025). O JCP retém 17,5% (Lei 9.249 art. 9º § 2º, red. LC 224).
O sistema não modela nem sócio, nem distribuição, nem JCP. Dossiê:
[`pesquisas-legais/irrf-distribuicao/relatorio.md`](../../../pesquisas-legais/irrf-distribuicao/relatorio.md).

## Cédulas

| # | Ponto | Escolha do dono (literal) | Recomendação | Diverge? |
|---|---|---|---|---|
| F-IRD-1 | Escopo do JCP | "JCP completo" | Só dividendos | **sim** |
| F-IRD-2 | Beneficiário | "Model próprio de sócios" | Counterparty PARTNER | **sim** |
| F-IRD-3 | Simples Nacional | "Reter sempre" | Reter + flag liminar | **sim** |
| F-IRD-4 | Fato gerador | "O primeiro evento (Recomendado)" | idem | não |
| F-IRD-5 | Pagamento que não cobre a retenção do mês | "Dá a soluçao que possua maior eficiencia fiscal" | Recusa com o mínimo | — (ver F-IRD-5R) |
| F-IRD-5R | Leitura da eficiência fiscal | "Teto + recusa (Recomendado)" | idem | não |
| F-IRD-6 | Lucro da transição (§ 3º) | "Sai da base, conta no limite" | Declara + anexa ato, fora da base e do limite | **sim** (conta no limite; a declaração e o ato anexado ficam) |
| F-IRD-7 | Sócio no exterior | "Recusa explícita (Recomendado)" | idem | não |
| F-IRD-8 | Cancelamento | "Só o último do mês (Recomendado)" | idem | não |
| F-IRD-9 | Liquidação | "Lançamento próprio (Recomendado)" | idem | não |
| F-IRD-10 | Distribuição acima do lucro | "Aviso, não bloqueia (Recomendado)" | idem | não |
| F-IRD-11 | Contabilização do JCP | "Despesa ou PL, com e-Lalur" | Despesa + recusa acima do limite | **sim** |
| F-IRD-12 | JCP fora do Real | "JCP só no Real (Recomendado)" | idem | não |
| F-IRD-13 | TJLP | "Tabela de plataforma (Recomendado)" | idem | não |
| F-IRD-14 | Escopo do model de sócios | "Mínimo com % (Recomendado)" | idem | não |
| F-IRD-15 | Contas do PL na base do JCP | "Mapa no perfil fiscal (Recomendado)" | idem | não |
| F-IRD-16 | TJLP pro rata die | "Saldo diário (Recomendado)" | idem | não |
| F-IRD-17 | Período do JCP no Real | "Por período de apuração (Recomendado)" | idem | não |
| F-IRD-18 | Divisor da TJLP diária (2ª rodada, depois da pesquisa das pendências) | "Mensal ÷ dias do mês (Recomendado)" | idem | não |

## Efeitos

- **F-IRD-6:** a interpretação de F-IRD-6 (b) mantém do texto da opção (a) a marcação "lucro da transição", o ano do
  resultado, a data da aprovação e o ato anexado. Muda só o limite: o valor sai da base do IRRF e **soma** para ver se o
  mês passou de R$ 50 mil.
- **F-IRD-4, F-IRD-6 e F-IRD-17** viram perguntas ao contador (BRIEF §4). O código segue a escolha até a resposta.
- **F-IRD-3:** a IN 1.500 art. 8º II ainda lista a isenção do Simples sem ressalva, e o P&R da RFB diz o contrário
  (dossiê §4.1). A escolha segue o P&R.
