---
id: "D-2026-11-24-MONOFASICO-POR-LINHA"
tipo: "decisao"
dominio: "fiscal"
titulo: "Monofásico de 2027 deixa de ser data na função: o fim lido da linha PIS_COFINS (vigenteAte), fail-closed sem linha, reverte a decisão 3 de D-2026-10-27"
estado: "decided"
autorizacao: "dono, chat, 2026-11-24 (lacuna L-20261124-210955-1033, ressalva do #1357): confirmou a reversão da decisão 3 de D-2026-10-27. Registro da decisão só; não autoriza código além do que o PR #1389 (Onda 3.2) já traz"
atualizado: "2026-11-24"
---
# D-2026-11-24-MONOFASICO-POR-LINHA

**Estado:** `decided`. **Autorização:** dono, chat, 2026-11-24. Origem: lacuna `L-20261124-210955-1033` (a reversão estava
confirmada no chat e sem nota). Reverte a **decisão 3** (I-9, "monofásico ≥ 2027 na função, por data") de
[[D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO]]. Nó: [[EFICIENCIA-FISCAL]].

## O que muda

| | Antes (D-2026-10-27, decisão 3) | Agora |
|---|---|---|
| Fim do monofásico | data fixa no código: `segregacaoPorNcm` devolve sem PIS/COFINS a partir de 2027-01-01 (LC 214/2025 art. 542 XI) | o dia seguinte ao maior `vigenteAte` das linhas `PIS_COFINS` em vigor (`fimMonofasicoPisCofins` → `diaSeguinteAoFimDeVigencia`) |
| Sem linha `PIS_COFINS` em vigor | (não se aplicava: a data era literal) | **fail-closed**: `ParametroLegalAusenteError` (400, `PARAMETRO_LEGAL_AUSENTE`) |
| Linha em vigor sem `vigenteAte` | (não se aplicava) | **fail-closed**: `FimDeVigenciaNaoPublicadoError` (mesmo código); uma linha aberta não apaga o fim que a lei fixa |

As linhas `PIS_COFINS_MONOFASICO_NCM` continuam como estavam (a importação de NF-e, X6, as lê); só a **data de corte** passa
a vir da linha `PIS_COFINS`, que já carrega o fim (2026-12-31 nas quatro linhas semeadas).

## Onde está no código

- Onda 3.2 (datas de corte de lei como linha), PR #1389: `legalParameter.ts` (`diaSeguinteAoFimDeVigencia`),
  `segregacaoNcm.ts` (`fimMonofasicoPisCofins`).
- Ressalva do mesmo PR (lacuna 03e4, decidida pelo dono): a **publicação** (e a proposta) recusa com 400 a linha de
  `PIS_COFINS` e de `ISS_LIMITE/ALIQUOTA_MAX_BP` sem `vigenteAte`, dizendo a chave — o fail-closed da leitura não vira
  derrubada da plataforma por um erro de dado (`erroDeFimObrigatorio`, `LegalParameterService.propose/publish`).

## O que fica aberto

- A fonte citada no 400 de 2027 é a da linha; a das quatro linhas semeadas é a IN RFB 2.121/2022 (alíquota), não a
  revogação — tratada no PR #1390 (lacuna 84ad).
- `pisCofinsParams.ts` ainda converte `vigenteAte` nulo em `9999-12-31` na apuração (lacuna 4944): a guarda de publicação
  impede linha nova aberta, mas não revalida a que já foi publicada.
