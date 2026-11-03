---
id: "D-2026-10-27-EFD-REINF-PR2-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Execução do EFD-REINF PR-2 autorizada; 4 lacunas de spec respondidas por questionário (dividendo a PJ, vlrRendTrib no mês que cruza o limite, pacote R-2010/R-2099, relatório)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-27: \"Executa o EFD-REINF PR-2 e PR-3 (BRIEF #848) — sessao-feature, um PR por fatia, empilhados, sem merge.\" Respostas por AskUserQuestion no mesmo dia"
atualizado: "2026-10-27"
---
# D-2026-10-27-EFD-REINF-PR2-LACUNAS

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-27: *"Executa o EFD-REINF PR-2 e PR-3 (BRIEF #848) — sessao-feature, um PR por fatia,
empilhados, sem merge."* Esta cédula é do PR-2 (itens 15–19 do
[`BE-INCR-EFD-REINF-brief.md`](../../accounting/BE-INCR-EFD-REINF-brief.md)), empilhado no PR-1 (#912). Nó: [[EFD-REINF]].

Antes do código, a leitura do BRIEF contra o código de `main` (IRRF-DISTRIBUICAO PR-2/PR-4 e RETENCOES-FONTE PR-2) e contra
o XSD oficial [D06] mostrou 4 lacunas. Elas foram perguntadas por questionário (AskUserQuestion), com a recomendada como 1ª
opção. O dono escolheu a recomendada nas 4.

## Respostas do dono

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| A. Dividendo a sócio PJ: o item 16 manda ao R-4020 "com a natureza 12016 (JCP)", mas a Tabela R-4020 de 15/01/2026 não tem código de dividendo e o IRRF-DISTRIBUICAO não retém de PJ (`calcularMes`, L5) | "Fora + aviso (Recomendado)" | Dividendo a PJ não vai a evento. O relatório traz o aviso `DIVIDENDO_PJ_FORA_DA_REINF`; a dúvida vira **P-REINF-10** ao contador. JCP a PJ vai ao R-4020 na 12016 com o IR |
| B. Mesmo CPF com vários eventos no mês cruzando R$ 50 mil (o IR do total é retido no evento que cruza) | "Todas tributáveis (Recomendado)" | No mês que cruzou o limite, toda `infoPgto` CORRENTE leva `vlrRendTrib` = bruto; `vlrIR` só onde houve retenção. Σ `vlrRendTrib` = base do mês. No mês que não cruzou, só o bruto (MOU item 9) |
| C. Pacote R-2010/R-2099: (1) `numDocto` nulo ⇒ 400; (2) prestador sem CNPJ válido ⇒ 400 `REINF_PRESTADOR_CNPJ_INVALIDO`; (3) `indCPRB` divergente no mesmo prestador ⇒ 400; (4) R-2099 só com R-2010 no lote; (5) NF = título, `vlrBruto` = bruto da linha de INSS, uma `infoTpServ` por `tpServico` | "Aceito o pacote (Recomendado)" | Os 5 pontos como descritos |
| D. Linhas de R-4010 e R-2010 no relatório de conferência já no PR-2 (item 14 é "por evento"; o item 22 do PR-3 é o "completo") | "Já no PR-2 (Recomendado)" | O relatório traz as linhas dos três eventos; CPF mascarado `***.NNN.NNN-**`, CNPJ como no PR-1; código derivado das tabelas no R-4010 (1841, 5706); no R-2010, o `codigoReceita` gravado na linha de INSS pelo RETENCOES-FONTE |

## Decorrências registradas sem pergunta (fonte citada)

- **E4 confirmado contra o código** (BRIEF §5.1): `ProfitDistributionEvent` e `InterestOnEquityCalculation`/`Allocation` estão em
  `main`. A Reinf lê pelas interfaces de repositório que já existem (`listDaCompetencia`, `findById`, `IPartnerRepository.list`),
  só leitura; nenhum nó vizinho muda.
- Só `POSTED` entra (item 16: "`ProfitDistributionEvent` `POSTED`"); o JCP segue a mesma regra.
- Sócio não residente não chega à Reinf: o IRRF-DISTRIBUICAO recusa o evento antes (F-IRD-7).
- `tpIsencao = 12` vem da NT 02/2026 [D04] (a carga da `NATUREZA_RENDIMENTO` ainda traz `tiposIsencao: []` na 12001); a carga é do
  RETENCOES-FONTE e não muda aqui.
- `defasado` passa a olhar também os dividendos e as alocações de JCP: origem cancelada depois do lote ⇒ `defasado` (item 13).
- A ordem do lote: R-1000 → R-2010 → R-4010 → R-4020 → R-2099 → R-4099 (periódicos antes dos fechamentos, item 10).
