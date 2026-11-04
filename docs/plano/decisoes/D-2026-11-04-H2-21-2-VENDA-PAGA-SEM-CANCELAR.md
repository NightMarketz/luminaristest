---
id: "D-2026-11-04-H2-21-2-VENDA-PAGA-SEM-CANCELAR"
tipo: "decisao"
dominio: "vendas"
titulo: "H2 21-2: venda paga não mostra Cancelar nem Devolver; estorno de venda paga fica para incremento próprio"
estado: "done"
autorizacao: "dono, chat, 2026-11-02: \"Faz e me substitui nas decisões\" · dono, chat, 2026-11-04: \"Pode disparar uma sessão pra corrigir os achados e outra para cada não feito\" e \"dispara de novo a C7: corrigir os achados de código do H2\""
atualizado: "2026-11-04"
---
# D-2026-11-04-H2-21-2-VENDA-PAGA-SEM-CANCELAR

**Caso.** Na execução C7 do H2 (03/11, PR #982), o painel da venda mostrou **Cancelar** e **Devolver** numa venda
`Finalized` + `Paid` (`SaleDetailPanel.tsx`). Os dois cliques dão 400: o `SalesPlugin.beforeUpdate` recusa qualquer
troca de status de venda paga, exceto finalizar ("Venda paga não permite alteração de status (exceto finalizar)").
O `SalesCancellationService` grava com `isSystem`, mas a regra do plugin não olha `isSystem`.

**Opções.**
- (a) **Esconder** os dois botões em venda paga, pelo mesmo predicado da regra (`paymentStatus === 'Paid'`).
- (b) **Permitir o estorno**: liberar a transição de venda paga no plugin para a transição de sistema.

**Escolhida: (a).**

**Porquê.**
- A tela passa a oferecer só o que a regra aceita. Nenhuma regra de servidor muda.
- (b) não é correção, é feature sem desenho fechado. O ADR-D01 (D2-Q4, ratificado 26/06) já previa estornar o
  `sale.settled` "se existir" no **cancelamento**, e o `SaleReversalBridge` tem esse ramo. Mas a **devolução** de
  venda paga não estorna o recebimento: lança `D 3.2 / C 1.1.2` por cima de um A Receber já baixado, sem nenhum fluxo
  de reembolso. Ligar (b) acordaria um ramo contábil nunca exercido pela tela e deixaria a devolução paga sem desenho.
- O D2-Q4 decide **o que** estornar quando uma venda liquidada é cancelada; ele não manda a tela nem a regra aceitarem
  o cancelamento de venda paga. Não há conflito com a escolha (a).

**Fica aberto (incremento próprio, não esta nota):** cancelamento e devolução de venda paga com reembolso (estorno do
recebimento no cancelamento, desenho da devolução paga). Pede BRIEF antes de código.

**Prova:** `my-app/features/dashboard/category-views/finance/components/sales/__tests__/SaleDetailPanel.test.tsx`,
caso "venda Finalized e PAGA não mostra Cancelar nem Devolver".
