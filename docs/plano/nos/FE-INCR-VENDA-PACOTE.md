---
id: "FE-INCR-VENDA-PACOTE"
tipo: "fe"
dominio: "financeiro"
titulo: "Vender pacote pré-pago pelo wizard de venda"
estado: "done"
estado_detalhe: "Aberto 05/10 pelo F-FE-PV-1 (c): o FE não vende pacote (wizard só produto/serviço) e o dono quis nó próprio ANTES do FE-INCR-PACOTE-VALIDADE. O servidor já vende (item Package na tabela mista, ponte sale.package.sold, crédito). BRIEF: 12 itens (1–10 + 3a, 3b), FE + 1 campo no preset de vendas. Forks F-FE-VP-1..3 + 1b ratificados 05/10, todos contra a recomendação: preço do catálogo editável só para cima (abaixo = campo desconto), flag aboveCatalogPrice na venda; troca de pacote pago com saldo de outro PERMITIDA (risco aceito: o valor ganha prazo novo; PE-VP-1 ao contador); quantidade N. Achado: venda de pacote sem cliente lança o 2.1.1 sem crédito (a tela passa a exigir cliente). Não depende do #483; sem 'executa' · 05/10: 'executa' do dono → PR #519 mergeado (`c88ddaa1`, OK do dono 05/10): variante Pacotes no wizard, preço só para cima, aboveCatalogPrice, um pacote por venda com quantidade N, cliente obrigatório, sem pagar o pacote com o próprio saldo. Insumos I1..I3 decididos por questionário. Residual: sign-off de browser (RUNBOOK-H2-VENDA-PACOTE, humano); regras são de tela (servidor aceita pela API genérica); menor não corrigido: pacote vendido como saldo se a lista de itens não carregou ao abrir o pagamento · 05/10: 'executa' do dono → PR #519 mergeado (`c88ddaa1`, OK do dono 05/10): variante Pacotes no wizard, preço só para cima, aboveCatalogPrice, um pacote por venda com quantidade N, cliente obrigatório, sem pagar o pacote com o próprio saldo. Insumos I1..I3 decididos por questionário. Residual: sign-off de browser (RUNBOOK-H2-VENDA-PACOTE, humano); regras são de tela (servidor aceita pela API genérica); menor não corrigido: pacote vendido como saldo se a lista de itens não carregou ao abrir o pagamento"
depende_de: []
autorizacao: "dono, chat, 2026-10-05: \"executa o FE-INCR-VENDA-PACOTE\"; antes: dono, chat, 2026-10-05, questionário: \"Nota + BRIEF agora\" (opção: \"Planeja também a variante Pacotes do wizard nesta sessão (sem 'executa')\") — nota + BRIEF; código fora"
prs: ["#519"]
ancora_sdd: "—"
perfil_previsto: "sonnet-alto"
perfil_evidencia: "regra 1 não casa (F-FE-VP-1..3 + 1b ratificados 05/10); regra 2 não casa (sem lançamento, tributo, saldo nem migração Prisma: a ponte e o crédito já existem; muda um preset DynamicTable); regra 4: 12 itens, FE + preset"
atualizado: "2026-10-05"
---
# FE-INCR-VENDA-PACOTE — Vender pacote pré-pago pelo wizard de venda

**Estado:** `done` — Aberto 05/10 pelo F-FE-PV-1 (c): o FE não vende pacote (wizard só produto/serviço) e o dono quis nó próprio ANTES do FE-INCR-PACOTE-VALIDADE. O servidor já vende (item Package na tabela mista, ponte sale.package.sold, crédito). BRIEF: 12 itens (1–10 + 3a, 3b), FE + 1 campo no preset de vendas. Forks F-FE-VP-1..3 + 1b ratificados 05/10, todos contra a recomendação: preço do catálogo editável só para cima (abaixo = campo desconto), flag aboveCatalogPrice na venda; troca de pacote pago com saldo de outro PERMITIDA (risco aceito: o valor ganha prazo novo; PE-VP-1 ao contador); quantidade N. Achado: venda de pacote sem cliente lança o 2.1.1 sem crédito (a tela passa a exigir cliente). Não depende do #483; sem 'executa'
**Autorização:** dono, chat, 2026-10-05: "executa o FE-INCR-VENDA-PACOTE"; antes: dono, chat, 2026-10-05, questionário: "Nota + BRIEF agora" (opção: "Planeja também a variante Pacotes do wizard nesta sessão (sem 'executa')") — nota + BRIEF; código fora
**Depende de:** —
**Desbloqueia:** [[FE-INCR-PACOTE-VALIDADE]] (os itens 10–11 dele se apoiam na variante `packages` daqui)
**Âncora no SDD consolidado:** —
**PRs:** #519

Origem: [[D-2026-10-05-FE-PACOTE-VALIDADE-FORKS]] (F-FE-PV-1 c e a cédula de abertura).

## Docs

- [`docs/accounting/FE-INCR-VENDA-PACOTE-brief.md`](../../accounting/FE-INCR-VENDA-PACOTE-brief.md) — BRIEF 05/10: 13
  fatos lidos (variante detectada pelo schema; só o preset `Mixed` tem `packageId`; venda sem cliente não credita; o
  servidor aceita pagar pacote com saldo de pacote), 12 itens, contrato (tipos do wizard + campo `aboveCatalogPrice`
  no preset de vendas), forks ✅ ratificados (§5.1), PE-VP-1 (contador: lançamento da troca), insumos I1..I3. Não
  autoriza código: exige "executa".
