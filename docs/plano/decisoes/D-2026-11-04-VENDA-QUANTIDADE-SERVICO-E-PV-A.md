---
id: "D-2026-11-04-VENDA-QUANTIDADE-SERVICO-E-PV-A"
tipo: "decisao"
dominio: "vendas"
titulo: "Serviço vendido com quantidade conta a quantidade; o PV-A do PACOTE-VALIDADE mede na janela do job"
estado: "decided"
autorizacao: "dono, chat, 2026-11-04, respostas às perguntas do HANDOFF-2026-11-04-orquestradora: \"1. serviço vendido com quantidade deve contar a quantidade\" e \"2. o roteiro mede a janela\"; execução: \"Sim, faz aqui\" (registrar as decisões 1 e 2 e corrigir o subtotal do serviço, teste que falha e depois o fix)"
atualizado: "2026-11-04"
---
# D-2026-11-04-VENDA-QUANTIDADE-SERVICO-E-PV-A

**Estado:** `decided`. Fecha as perguntas 1 e 2 de [`HANDOFF-2026-11-04-orquestradora.md`](../../accounting/HANDOFF-2026-11-04-orquestradora.md) §"Perguntas ao dono".

## 1 — Serviço com quantidade conta a quantidade (VP-1b)

Pergunta: *"Serviço com quantidade 2 deve contar a quantidade?"* (o VP-1, #1052, só mudou o pacote; divergência com as
pontes em `server/src/lib/saleLine.ts`, review do #913).

Resposta do dono: **conta**. A linha de venda vale `quantidade × preço unitário` para os três tipos (produto, serviço,
pacote); sem a coluna `quantity` (preset só-serviços) a quantidade é 1, como já faz `saleLineQuantity`.

Efeito: a regra das pontes contábeis (`quantity × unitPrice`) passa a ser a única; some a divergência do #913.

- `SalesPlugin.ts` — as duas somas (`beforeUpdate`: guarda "desconto ≤ subtotal"; `afterUpdate`: regrava
  `subtotal`/`totalAmount`) usam a quantidade de toda linha.
- `my-app/.../finance/utils/packageSale.ts` `lineQuantity` — idem na tela (substitui o "serviço é sempre 1" do F-FE-VP-3 b,
  que só tratava do pacote).
- Teste-guarda: `server/src/features/dynamicTables/rules/__tests__/SalesPlugin.serviceQuantity.integration.test.ts`.

Fora: o modal Nova Venda continua sem campo de quantidade na aba de serviços (`SaleItemsManager.tsx`, `hasQuantity`), e a
linha nasce com `quantity: 1` — a mudança só aparece em linha gravada com quantidade > 1 (API, tabela, importação).

## 2 — PV-A: o roteiro mede na janela do job

Pergunta: *"PV-A (PACOTE-VALIDADE passo 6): o roteiro mede na janela de 5 min do job ou a tela mostra o saldo vencido
zerado?"*

Resposta do dono: **o roteiro mede a janela**. O passo 6 do `RUNBOOK-H2-PACOTE-VALIDADE.md` espera a rodada do job de
vencimento (janela de 5 min) e confere o efeito depois dela; não é exigido que a tela zere o saldo antes do job. A emenda
do texto do passo é do runbook (PR #1035), não deste registro.

## Não decidido aqui

- **A-1** (texto da confirmação da ativação contábil): em aberto. O dono perguntou por que existe o botão, já que o
  onboarding ativa a contabilidade; a faixa é a saída de recuperação do onboarding (F-I4-2 b, F-BA-4 a). Escolha entre
  ajustar o texto, manter ou retirar a faixa ainda pendente.
