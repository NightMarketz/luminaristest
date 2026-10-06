---
id: "D-2026-10-06-X8-PR3-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X8 PR-3: lacunas L-1..L-3 da provisão de PIS/Cofins decididas (L-2 muda o código: baixa também o saldo credor usado)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — L-1 (a) ratificado; L-2 'Baixar também o saldo usado'; L-3 ratificado"
atualizado: "2026-10-06"
---
# D-2026-10-06-X8-PR3-LACUNAS — PR-3 do [[X8]]

**Estado:** `decided`.
**Autorização:** dono, chat, 06/10/2026, questionário. A execução do PR-3 veio antes, do mesmo dia: *"Executa o PR-3 do
X8 em opus médio"* (PR #556, empilhado sobre o #554). A resposta L-2 autoriza mudar o código do PR-3 antes do merge.

Origem: `.claude/retornos/x8-pis-cofins-pr3.md` (branch do PR #556), seção "Lacunas de spec".

## 1. As 3 lacunas do item 17 (provisão) — decididas

1. **L-1 → (a), ratificado.** "Crédito da NF-e aproveitado no mês" = `min(CREDITO_NFE + CREDITO_NFE_DERIVADO, débito)`:
   o crédito da NF-e do mês é consumido primeiro.
2. **L-2 → "Baixar também o saldo usado" (diverge da leitura do executor).** No não cumulativo, a provisão lança também
   D PIS/COFINS a recolher / C PIS/COFINS a recuperar pelo saldo credor anterior consumido no mês, para o "a recolher"
   bater com o DARF. Saldo parcialmente consumido ⇒ só a parte usada; mês sem débito ⇒ nada; o cumulativo não tem saldo
   (EMENDA §7, leitura 5).
3. **L-3 → ratificado.** Um único lançamento por tributo/mês (até 6 pernas: despesa/a recolher, baixa da NF-e, baixa do
   saldo anterior); a chave de idempotência continua a apuração (`sourceId`); reconcile repetido não duplica.

Detalhe na EMENDA §8 de `docs/accounting/BE-INCR-PIS-COFINS-brief.md`.

## 2. Leitura nova, aberta (do executor, ao implementar a L-2)

- **L-4 (pendente de ratificação):** ordem de consumo = a da memória — NF-e do mês → outros créditos do mês (art. 3º
  III–IX, informados) → saldo credor anterior. Com outros créditos no mês, a baixa do saldo é menor do que seria se o
  saldo consumisse antes deles. Os outros créditos seguem sem lançamento (F-PCB-3 a).
- **L-5 (risco, pendente):** o saldo credor anterior pode conter crédito de "outros" de meses anteriores, que nunca passou
  pelo "a recuperar"; a baixa dele pode deixar a conta a recuperar com saldo credor. Oráculo = contador (P-1/P-5).

## Consequências

- O PR-3 (#556) passa a lançar até 6 pernas por tributo/mês; testes provam "a recolher" líquido = DARF no cenário do saldo
  de janeiro (835 centavos) e no saldo parcialmente consumido.
- PR-2 (#554) e PR-3 (#556) continuam entrando em `main` juntos ([[D-2026-10-06-X8-PR2-LACUNAS-E-MERGE]]).
