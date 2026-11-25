---
id: "D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks da drenagem da caixa (25/11): nota DENIED, cancelamento em 2 commits, polling DF-e que desiste e re-drive automático (dono, 25/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-25, questionário (AskUserQuestion) da sessão que drenou a caixa de lacunas. Não é 'executa' de PR nenhum: cada tema vira um BRIEF por sessao-planejamento, e o 'executa' do BRIEF de grupo sem fork segue a emenda de 21/11 de D-2026-11-11-LACUNA-VAI-AO-MAESTRO."
atualizado: "2026-11-25"
---
# D-2026-11-25 — forks da drenagem da caixa

**Estado:** `decided`. As quatro perguntas traziam evidência e o que cada opção deixava aberto; a recomendada vinha
primeiro e o dono escolheu a recomendada nas quatro (nenhuma contra a recomendação).

| Tema (lacunas) | Resposta | O que vira |
|---|---|---|
| Nota DF-e DENEGADA (`4eaa`, `db50`, `9b9d`, `4fb9`) | **Estrutural em etapas** | PR-0: `DENIED` terminal "substituível" (libera o `saleKey` por rename, como no `CANCELLED`) e `SefazNfeEmissor.consultar` mapeia 101/151 e as rejeições da própria consulta (252, 226, 236, 526, 562, 561, 613) para estado terminal ou alerta, sem repetir para sempre. PR-1: reemissão com número novo pela rota existente. A premissa "o número da denegada fica consumido" **continua gate humano** (`9b9d`, oráculo externo); o texto ao operador segue neutro. |
| Cancelamento em 2 commits (`69c7`, `c4d3`, `9d3e`) | **Estado `CANCELLING` persistido** | Migração: estado/coluna gravado ANTES do estorno; o reconcile re-dirige `CANCELLING→CANCELLED` repetindo só o estorno idempotente e pulando efeito físico/estoque já feito; `BLOCKED` passa a ser persistido com alerta (fecha `9d3e`). Etapas: PR-0 `PayableService`, PR-1 JCP e distribuição de lucros. |
| Polling DF-e que desiste (`3cf5`, `cf36`, `6e13`, `f5fb`, `92c5`) | **Colunas próprias + re-arme** | PR-0: `pollDeferredSince`/`pollAlertedAt` (sai do texto em `pollLastError`) e `pollGaveUpAt`/`pollAttempts` no DTO e na lista. PR-1: re-arme automático (backoff longo, teto de idade e alerta) + `POST /documents/:id/rearmar-polling` (Policy `canEmitFiscalDocument`) e botão; contingência que falha sempre ganha teto e alerta. |
| Item preso sem re-tentativa (`aaf4`, `72d3`) | **Scheduler com teto** | Job de re-drive com rodízio por `updatedAt`, teto por passada e alerta por idade; a rota manual continua; motivo permanente não é re-tentado. Entra no BRIEF do cancelamento `CANCELLING`. |

Cada lacuna voltou à fila como `aberta` com a classe da resposta e este texto no destino
(`lacunas.mjs set … --classe …`). Os BRIEFs saem de `sessao-planejamento` do grupo, um por tema.

## Ratificação dos forks dos três BRIEFs (dono, chat, 25/11, 2º questionário)

Os BRIEFs saídos da tabela acima trouxeram forks próprios; o dono ratificou **todas as recomendadas** ("Ratificar as 4 / as 8 /
as 5 recomendadas"). O BRIEF de cada tema carrega a marca e a citação; esta tabela é só o índice.

| BRIEF (PR) | Forks ratificados |
|---|---|
| `BE-INCR-DFE-DENIED-SUBSTITUIVEL` (#1406) | F-DEN-1(a) transição terminal `CANCELLED` própria para 101/151 · F-DEN-2(a) consulta inválida lança `DfeConsultaInvalidaError`, desiste na 1ª e alerta · F-DEN-3(a) NFC-e denegada sai do alerta quando a substituta é `AUTHORIZED` · F-DEN-4(a) auto-cura na emissão (renomeia `DENIED` antigo; sem migração de dado) |
| `BE-INCR-CANCELAMENTO-CANCELLING` (#1407) | F-CX-1(a) · F-CX-2(a) só para frente + pré-cheques · F-CX-3(a) vivo para leitura fiscal/razão, morto para escrita · F-DR-1(a) `BLOCKED` na bandeja `ReconcilePendingItem` (+`alertedAt`) · F-AR-1(a) · F-RD-1(a) por item · F-RD-2(a) scheduler próprio · F-RD-3(b) JCP/distribuição `PENDING_POST` entram |
| `BE-INCR-DFE-POLLING-DESISTE` (#1405) | F-PD-1(a) re-arme a cada 6 h · F-PD-2(a) teto de 7 dias · F-PD-3(a) adiado por transporte com o mesmo teto · F-PD-4(a) contingência cai no contador do poll · F-PD-5(a) `pollAlertedAt` = "alerta final saiu" |

Efeito (emenda de 21/11 de `D-2026-11-11-LACUNA-VAI-AO-MAESTRO`): BRIEF de grupo da caixa sem fork pendente permite a
`sessao-feature`. Os três BRIEFs ainda não estão na `main`; a execução parte da branch do PR do BRIEF. A premissa "número da
denegada fica consumido" segue gate humano (`9b9d`) e não é tocada. O PR-3 do polling (`f5fb`) só depois do #1146.
