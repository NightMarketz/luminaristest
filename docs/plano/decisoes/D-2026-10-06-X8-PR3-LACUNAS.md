---
id: "D-2026-10-06-X8-PR3-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X8 PR-3: lacunas L-1..L-5 + retenções da provisão de PIS/Cofins decididas (L-2 baixa o saldo usado; L-5 e retenções reabrem o F-PCB-3 a inteiro)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — L-1 (a) ratificado; L-2 'Baixar também o saldo usado'; L-3 ratificado; 2ª rodada: L-4 (a) ratificado; L-5 'Lançar outros créditos no PR-3'; 3ª rodada: 'sim, os dois' — smoke:migration numa cópia do dev.db real + retenções lançadas como na L-5"
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

## 3. 3ª rodada (dono, chat, 06/10: "sim, os dois") — retenções e smoke

- **Retenções → lançadas, como a L-5 — REABRE O RESTO do F-PCB-3 (a)** (o F-PCB-3 a fica inteiramente reaberto). Nos 2
  regimes, no mesmo lançamento da provisão: D PIS/Cofins **retido a compensar** (Asset, `pisCofinsRetidoCompensarAccountId`)
  / C **retenções a conciliar com clientes** (Asset redutora de clientes, transitória — `pisCofinsRetencaoConciliarAccountId`)
  pelas retenções do mês, e D a recolher / C retido a compensar pela parte abatida. O excedente (retenção acima do devido
  depois dos créditos) fica no retido a compensar (compensação fora do sistema, F-TA-9 a). "a recolher" líquido = DARF.
- **Fonte da contrapartida:** no padrão contábil a retenção nasce no recebimento — D Banco / D tributo retido a compensar
  / C Clientes (prática contábil; grau **inferido**); a base legal da retenção é Lei 10.833/2003 arts. 30, 31 e 36 (retenção na fonte de PIS 0,65% / Cofins 3% sobre serviços pagos por PJ; o valor retido é antecipação do devido) e IN SRF 459/2004 — grau **inferido** (não relidas na fonte nesta sessão). Como o
  recebimento líquido está FORA do sistema, a contrapartida do reconhecimento é uma transitória redutora de clientes, a
  conciliar com o título a receber (proposta do executor, grau **inferido**; validação externa P-8 do BRIEF).
- **Teto da L-3 ajustado de 6 para 10 pernas** (um lançamento por tributo/mês continua): despesa/a recolher, a recuperar/
  redutora (L-5), baixa do crédito consumido, retido/a conciliar, baixa da retenção.
- **Smoke de migração** numa cópia do dev.db real: PASS (registro no retorno do PR-3, bloco PROVA rodada 4).
- **Saldo informado no 1º mês → validação externa P-7** do BRIEF (o contador confirma o saldo de abertura do "a recuperar").

## Consequências

- O PR-3 (#556) lança até 10 pernas por tributo/mês (despesa/a recolher; a recuperar/redutora; baixa do crédito; retido/a
  conciliar; baixa da retenção); testes provam
  "a recolher" líquido = DARF no cenário do saldo de janeiro (835 centavos), no saldo parcialmente consumido e no mês
  seguinte a outros créditos — com o "a recuperar" terminando em 0, nunca credor.
- Contrato: 3 campos novos no perfil fiscal — `pisCofinsCreditoOutrosAccountId`, `pisCofinsRetidoCompensarAccountId`,
  `pisCofinsRetencaoConciliarAccountId` (DTO, snapshot, tipos gerados do FE, allowlist `fiscal_profile.updated`, migração
  aditiva `20261006120000_add_pis_cofins_provisao_pr3_accounts` com 3 `ADD COLUMN`).
- PR-2 (#554) e PR-3 (#556) continuam entrando em `main` juntos ([[D-2026-10-06-X8-PR2-LACUNAS-E-MERGE]]).
