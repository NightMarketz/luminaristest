---
id: "D-2026-10-31-MODULOS-BASE-SUBMODULOS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Corte de F-BV-2: categorias com base fixa + submódulos de uma tabela (F-MB-1..6) — questionário do dono em 31/10"
estado: "decided"
autorizacao: "dono, 2026-10-31, questionário (AskUserQuestion) sobre o recálculo de F-BV-2: F1 → \"Categoria PESSOAS própria\"; F2 → \"requiresOneOf (Recommended)\"; F3 → \"Temos que decidir pra onde vai, provavelmente em categoria gestão mais acima num modulo a parte\" e, no seguimento, \"Gestão com base fixa\"; Campanhas → \"Submódulo do CRM\"; PESSOAS → \"Clientes base, Fornec. opcional (Recommended)\"; F4 → \"Um bloco fixo (Recommended)\"; F5/F6 → \"Ratifico os dois (Recommended)\". Decide forks; não autoriza BRIEF nem código (sem 'executa')"
atualizado: "2026-10-31"
---
# D-2026-10-31-MODULOS-BASE-SUBMODULOS — corte do F-BV-2

**Estado:** `decided`
**Autorização:** dono, 2026-10-31, questionário (respostas literais no cabeçalho). Escopo: **ratificar forks**.
Não autoriza BRIEF nem código. Base: [[BUILDER-VERTICAIS]], F-BV-2 (a) "todo agrupamento vira módulo no registro,
faseado" ([[D-2026-10-21-CHAT-C-FORKS]]).

## Regra geral

A categoria pode ser opcional; a base dela é fixa (existe se e somente se a categoria existe, como o CRM-0); cada
submódulo não-fixo tem uma tabela (regra atual do `registry.ts`).

## Forks

| Fork | Decisão |
|---|---|
| F-MB-1 | `customers` vai para a categoria **PESSOAS** própria: base fixa PESSOAS-0 = `customers` (mantém `lockedBy: 'accounting'`); **Fornecedores** (`suppliers`) é submódulo opcional. VENDAS e AGENDA dependem de PESSOAS-0 |
| F-MB-2 | Catálogo de VENDAS por `requiresOneOf`: Serviços, Produtos e Pacotes são submódulos; o validador exige pelo menos um; a variante de `saleItems` sai dos que estão ligados |
| F-MB-3 | **GESTÃO** é categoria com base fixa = Relatórios (`reports`); Metas (`goals`) é submódulo. Campanhas **não** fica em GESTÃO |
| F-MB-3b | **Campanhas** (`campaigns`) é submódulo do **CRM**, dependente de CRM-0; sem ele, `sales.campaignId` (opcional) é descartado na instalação |
| F-MB-4 | ESTOQUE = um bloco fixo (`productUnits` + `stockMovements`), dependente do submódulo Produtos |
| F-MB-5 | A trava contábil de Pacotes passa da tabela para o módulo: desligar na criação é permitido; depois do primeiro lançamento não sai |
| F-MB-6 | O obrigatório é derivado das pontes do manifesto (`bridges: ['sales@1']` obriga VENDAS-0 + PESSOAS-0), não de lista fixa por preset |

## Mapa resultante

| Categoria | Base fixa | Submódulos |
|---|---|---|
| Core | units, employees, tasks, stakeholders | — |
| PESSOAS | customers | Fornecedores |
| VENDAS | sales, saleItems | Serviços, Produtos, Pacotes (≥1), Comissões |
| ESTOQUE | productUnits + stockMovements | — |
| AGENDA | appointments | — |
| CRM | CRM-0 | CRM-1, CRM-2A, CRM-2B, CRM-3, Campanhas |
| FINANCEIRO operacional | expenses | otherRevenues, financialBaselines |
| GESTÃO | reports | Metas |

Os pontos FINANCEIRO e Comissões seguem a proposta de 31/10, sem pergunta específica.

## F-MS — forks do BRIEF ([`BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md`](../../accounting/BE-INCR-MODULOS-BASE-SUBMODULOS-brief.md))

Dono, 2026-10-31, questionário sobre o BRIEF (autorizado no chat: *"Sim, abre o BRIEF"*): F-MS-1/2 → *"Sufixo legível"*;
F-MS-3+6 → *"Ratifico os dois (Recommended)"*; F-MS-4+5 → *"Ratifico os dois (Recommended)"*; F-MS-7+8 → *"Ratifico os
dois (Recommended)"*. Decide forks; **não** é "executa".

| Fork | Decisão |
|---|---|
| F-MS-1 | (b) chaves com sufixo legível: `PES-0`, `PES-FORN`, `VEN-0`, `VEN-SERV`, `VEN-PROD`, `VEN-PAC`, `VEN-COM`, `EST-0`, `AGE-0`, `FIN-0`, `FIN-REC`, `FIN-BASE`, `GES-0`, `GES-META` |
| F-MS-2 | (b) Campanhas = `CRM-CAMP` |
| F-MS-3 | (a) só Pacotes → variante mixed |
| F-MS-4 | (a) `deleteConstraint` com alvo ausente descartada no install, restaurada no "ligar depois" |
| F-MS-5 | (a) sem caminho novo; teste das guardas atuais; vermelho → lacuna |
| F-MS-6 | (a) `freeSelects` dos módulos novos nascem vazios |
| F-MS-7 | (a) `bridges` no preset TS agora |
| F-MS-8 | (a) Comissões em VENDAS; FINANCEIRO com base Despesas (confirma o mapa acima) |

## Consequências

- Campanhas exige CRM: quem não liga CRM-0 não tem campanha (escolha do dono).
- Fornecedores saiu de FINANCEIRO para PESSOAS; `stockMovements.supplierId` segue opcional.
- Pendências para o BRIEF (não verificadas): `deleteConstraints` de `products` apontando para ESTOQUE ausente;
  consumidores de `MODULE_KEYS` no FE; se o arquétipo `cogs` exige ESTOQUE.
