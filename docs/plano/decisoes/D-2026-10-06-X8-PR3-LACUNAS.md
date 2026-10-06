---
id: "D-2026-10-06-X8-PR3-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X8 PR-3: lacunas L-1..L-5 da provisão de PIS/Cofins decididas (L-2 baixa o saldo usado; L-5 lança os outros créditos — reabre em parte o F-PCB-3 a)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — L-1 (a) ratificado; L-2 'Baixar também o saldo usado'; L-3 ratificado; 2ª rodada: L-4 (a) ratificado; L-5 'Lançar outros créditos no PR-3'"
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

## 2. 2ª rodada (dono, chat, 06/10, questionário) — L-4 e L-5

- **L-4 → (a), ratificado.** Ordem de consumo = a da memória: NF-e do mês → outros créditos do mês (art. 3º III–IX,
  informados) → saldo credor anterior.
- **L-5 → "Lançar outros créditos no PR-3" — REABRE EM PARTE o F-PCB-3 (a).** Padrão de mercado: todo crédito do não
  cumulativo entra no "a recuperar". Fonte indicada pelo dono: prática contábil citando o ADI SRF 3/2007 — D PIS/Cofins a
  recuperar / C despesa (redutora), **nunca contra receita**. Implementação: conta nova no perfil fiscal da unidade,
  `pisCofinsCreditoOutrosAccountId` (`Expense`, redutora; a ECF continua intocada — F-PCB-1 b), e a provisão do mês lança
  D a recuperar / C redutora pelos outros créditos do mês; a baixa do crédito consumido passa a ser uma só (NF-e + outros
  + saldo anterior). `provisaoContasConfiguradas` exige a redutora quando o mês tem outros créditos. Mês sem débito com
  outros créditos também provisiona (o reconhecimento). Retenções continuam sem lançamento (a parte não reaberta do F-PCB-3).
- **Residual (declarado):** o saldo credor anterior **informado** pelo operador no 1º mês (F-PCB-2 a) nunca foi lançado
  pelo sistema; a baixa dele só não deixa o "a recuperar" credor se o saldo de abertura o tiver posto no ativo. Retenções
  seguem fora do razão (o "a recolher" fica acima do DARF pelo valor delas).

## Consequências

- O PR-3 (#556) lança até 6 pernas por tributo/mês (despesa/a recolher; a recuperar/redutora; uma baixa); testes provam
  "a recolher" líquido = DARF no cenário do saldo de janeiro (835 centavos), no saldo parcialmente consumido e no mês
  seguinte a outros créditos — com o "a recuperar" terminando em 0, nunca credor.
- Contrato: campo novo `pisCofinsCreditoOutrosAccountId` no perfil fiscal (DTO, snapshot, tipos gerados do FE, allowlist
  `fiscal_profile.updated`, migração aditiva de 1 coluna).
- PR-2 (#554) e PR-3 (#556) continuam entrando em `main` juntos ([[D-2026-10-06-X8-PR2-LACUNAS-E-MERGE]]).
