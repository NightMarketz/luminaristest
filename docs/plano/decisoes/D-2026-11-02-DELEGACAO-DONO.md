---
id: "D-2026-11-02-DELEGACAO-DONO"
tipo: "decisao"
dominio: "gate"
titulo: "Delegação do dono (02/11): H1, H2, cédulas pendentes e o #907 decididos pela sessão"
estado: "decided"
autorizacao: "dono, chat, 2026-11-02: \"gates humanos H1 e H2, as cédulas de decisão pendentes e o #907. Faz e me substitui nas decisões\""
atualizado: "2026-11-02"
---
# D-2026-11-02-DELEGACAO-DONO

**Estado:** `decided`. **Autorização:** dono, chat, 02/11/2026: *"gates humanos H1 e H2, as cédulas de decisão
pendentes e o #907. Faz e me substitui nas decisões"*. As decisões abaixo foram tomadas pela sessão do agente nessa
delegação. Onde havia recomendação escrita no BRIEF, a sessão a seguiu; onde não havia, a decisão traz o porquê.

**Limites da delegação, lidos pela sessão:** vale para H1, H2, o #907 e as cédulas que estavam pendentes em 02/11. Não
altera regra do `CLAUDE.md` nem do `RUNBOOK-FORMAT.md`. A assinatura do agente nos gates H1 e H2 segue a emenda de
29/10 (`agente <modelo>, AI tester, sob autorização do dono`): atesta execução e conferência, não substitui o oráculo
(PVA, NF-e real, contador, produção). Os forks ratificados aqui **não** são `executa`: cada BRIEF pede pedido próprio.

Levantamento dos pendentes: um agente de leitura conferiu cada família citada como "pendente" contra `decisoes/`, a
nota do nó e o BRIEF. A maior parte já estava ratificada, e a nota do nó estava velha (lista no fim).

## 1. #1003 — kit D1/D1f

O revisor independente reprovou o #1003 porque o agente marcou `[x] FECHA` no kit, sem assinatura. Decisão: os `[x]`
saem (o agente não marca desfecho em gate de contador) e D1/D1f ficam fechados pelo fold das notas, que cita o chat
do dono (31/10 *"Pode fechar o d1"*, 02/11 *"Sim, fecha o D1f"*), como no [[D8]]. Commit `b5fed32b` no PR #1003.

## 2. #1005 — FIX-DRE-DEDUCAO-SINAL

Aprovado para merge. Revisor independente: APROVA em `1485fc86`, sem achado de corretude; CI 17 verdes. Risco aceito:
o sinal exibido da linha de dedução passa de +650 para −650, que é o que o J150 da ECD precisa.

## 3. #907 — ITG 2000 (R1) itens 32 e 36

A sessão de correção fica autorizada no mesmo PR (OPS-006 leve), com as três escolhas que o PR deixou ao dono:

1. **Motivo do estorno obrigatório** no serviço e no DTO. Os chamadores internos de `reverseEntry` passam um motivo
   fixo do próprio fluxo. Porquê: o item 32 vale para toda retificação, não só para a feita pela tela.
2. **Localização do lançamento de origem** é o número do Diário no formato da tela (`<exercício>/<nº com 4 dígitos>`,
   `JournalEntry.entryNumber`), com a data em dd/mm/aaaa. O id interno só entra se o número faltar. Porquê: é o número
   que o contador e o fiscal leem no livro (é o `I200.NUM_LCTO` da ECD); o cuid não localiza nada no Diário.
3. **Item 36:** "fora da época devida" é lançamento com data num período que já teve fechamento. Ele exige a razão do
   registro extemporâneo, e o histórico consigna a data efetiva e a razão. A guarda vale para os dois caminhos de
   reabertura (o reopen e o `openPeriod` a partir de `SOFT_CLOSED`). Porquê: é a leitura que o teste-guarda já fixa e a
   única que o sistema mede sem regra nova de prazo. As outras (prazo após o fim do mês, data anterior ao último período
   fechado) ficam fora.

Depois da 1ª correção (`02420458`), duas consequências da escolha 3 foram decididas:

4. **Tela:** o modal de lançamento manual ganha o campo "Razão do registro extemporâneo", opcional e sempre visível.
   Sem ele, quem reabre o período para corrigir recebe 400 e não tem como responder.
5. **Gravadores automáticos** (`sourceType` diferente de `manual`): sem razão informada, o serviço grava
   `lançamento automático (<sourceType>) processado depois do fechamento do período`. Essa é a razão real do registro
   tardio, e a data efetiva continua no histórico. Lançamento manual segue exigindo a razão digitada. Porquê: sem isso,
   bridges, reconciliação e AP/AR passariam a falhar em período reaberto.

6. **A razão automática vale só para chamada interna** (03/11, depois da 2ª correção em `8f4b1a14`): pelo HTTP o cliente
   escolhe o `sourceType` e escaparia da razão digitada. A origem automática passa por parâmetro de código; pelo HTTP, a
   razão é sempre exigida. O acerto da revisão profissional, feito por pessoa, também passa a exigir a razão digitada (C4
   do handoff).

Ficam como lacuna aberta no GAP-MAP: aprovação de rascunho e estorno em período reaberto, o `reversalPostingDate`
datetime do reconcile e o tamanho do HIST do I250.

O PR é vermelho pela classe de risco (contabilidade): passa por revisor independente antes do merge.

## 4. Gate H1 — cobertura referencial na ECD (fold 24/10 do [[H1]])

**Afrouxar só na ECD, com aviso.** Conta sem código referencial deixa de dar 400 na ECD: sai sem I051 para ela, e a
resposta traz o aviso com a lista de contas. Na ECF o gate continua (lá o código é exigido). Porquê: o Manual da ECD,
item 1.17, diz que o mapeamento referencial é facultativo; o 1º cliente é do Simples, sem ECF. É mudança de código:
vira item próprio, sem `executa` aqui.

## 5. Gate H1 — passo 6

Mantida a pausa de [[D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA]]. O passo 6 só fecha com ECD assinada, e a assinatura
exige certificado ICP-Brasil de um CNPJ real. Desde [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] o Luminaris não compra
certificado, então a ECD assinada vem do 1º cliente. Nada mais a executar no H1 hoje: a tentativa 4 (29/10) já tem os
passos 1–5 com desfecho PASSOU e assinatura AI tester no RUNBOOK-H1, e as tentativas 1–3 ficam como histórico, sem
marcação nova. O desfecho geral do H1 segue em branco até o passo 6.

## 6. H2

Execução autorizada pela frase acima, pela emenda de 29/10. Ordem: [[FIX-DRE-DEDUCAO-SINAL]] (#1005) em `main` →
re-semear o `dev.db` real (P0, com backup) → passos 16–23 do `RUNBOOK-H2-BROWSER-SIGNOFF` → runbooks irmãos do H2. O
passo 14 segue FALHOU (Y600 ausente na ECF) até o [[FE-INCR-ECF-Y600]] existir, e por isso o desfecho geral do H2 não
pode ser PASSOU nesta execução. Para destravá-lo, o [[FE-INCR-ECF-Y600]] recebe `executa` do BRIEF inteiro (forks já
ratificados em 29/10); depois dele, o passo 14 é refeito pela tela como AI tester.

## 6b. Lote de merge

Aprovados para a maestro, com condição: #1011 e #1003 com CI verde; #907 depois do revisor independente aprovar a
cabeça final; #982 depois de terminar a execução do H2. Ordem, prompts e correções restantes em
[`HANDOFF-2026-11-02-delegacao-dono.md`](../../accounting/HANDOFF-2026-11-02-delegacao-dono.md).

## 7. Forks pendentes — ratificados pela recomendação do BRIEF

| Família | Nó | Ramo ratificado | BRIEF |
|---|---|---|---|
| F-OFF-0..12 | [[X10a]] | 0 (a) · 1 (b) · 2 (a) · 3 (b) · 4 (a) · 5 (a) · 6 (a) · 7 (c) · 8 (c) · 9 (a) · 10 (a) · 11 (a) · 12 (a) | [`BE-INCR-NFCE-OFFLINE-CAIXA-brief.md`](../../accounting/BE-INCR-NFCE-OFFLINE-CAIXA-brief.md) §forks (l. 537–704) |
| F-ADL-1..5 | [[X10i]] | todos (a); o F-ADL-1 vira (b) se o AL-PR-3 já estiver em `main` quando o ADL-PR-1 começar, como o próprio BRIEF prevê | [`BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md`](../../accounting/BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md) l. 365–418 |
| F-C6bE-1..11 | [[C6b]] (emenda 3.4) | 1 (c) · 2 (b) · 3 (a) · 4 (a) · 5 (a) · 6 (a) · 7 (a) · 8 (a) · 9 (a) · 10 (a) · 11 (b) | [`BE-INCR-CONTADOR-PACKAGE-EMENDA-3-4-brief.md`](../../accounting/BE-INCR-CONTADOR-PACKAGE-EMENDA-3-4-brief.md) l. 309–319 |
| F-ENC-4, 5, 7, 8 | [[F7]] (emenda 3.3) | 4 (a)+(a1), teto de 20% · 5 (a) · 7 (a) · 8 (a) | [`BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md`](../../accounting/BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md) l. 438–442 |

Nenhum deles foi contra a recomendação.

## 8. Perguntas da maestro de 02/11

- **Alerta de prazo do #992 a cada tick:** limitar. Vira item de correção próprio (um aviso por nota e por dia), sem
  código aqui.
- **Dependabot com check falhando** (#944, #946, #948, #949, #951, #952): não mergear e não corrigir agora. São versões
  maiores (TypeScript 7, openai 7, recharts 3, i18next 26, express); cada uma pede migração própria.

## Já ratificados (a nota do nó estava velha)

F-BV-1..7 (D-2026-10-21-CHAT-C-FORKS), F-W3-C1..C3 e F-W3-1, F-REINF-1..13, F-EF-1..17, F-RET-1..19, F-FE-COB-1..8,
F-FE-POL-1..4, os forks do GOV-CONTADOR, F-ISS-1..7, F-PV-1..11, F-NFCE-12b, F-NFCE-E1-1..9, F-TC-1..7, F-X7-1..14,
F-MIT-1..3, F-RB9..11 e F-ENC-1, 2, 6, 9..13. Cada um tem a ratificação em `decisoes/`.

## 9. P-C1 — formato da memória de cálculo (03/11; pesquisa no lugar do parecer do contador)

Dono, chat, 03/11: *"Pode seguir rodando aqui pesquisa pra substituir parecer de contador"*. Era a última pergunta
aberta ao contador ([[D-2026-10-30-TRIAGEM-CONTADOR]]). Dossiê:
[`pc1-memoria-calculo`](../../../pesquisas-legais/pc1-memoria-calculo/relatorio.md).

- **A lei não fixa formato:** só manda guardar os papéis da apuração até a prescrição (Lei 8.981/1995 art. 45 III; CTN
  art. 195 parágrafo único).
- **O layout de conferência é o da ECF:** P200/P300/P400/P500 no Presumido e N620/N630/N660/N670 no Real, uma linha por
  código da tabela dinâmica (Manual da ECF, leiaute 12; tabelas dinâmicas de 28/05/2026).
- **Decisão, saída (b) do critério de aceite:** manter o formato longo e acrescentar `registroEcf` e `linhaEcf` a cada
  passo que tem linha na ECF. A conta contábil já vai em `fonte`, e a data do recolhimento fica com o DARF e a
  DCTFWeb/MIT ([[X9]]). É emenda ao BRIEF X7-C §C3 item 5, com `executa` por esta delegação (correção C8 do handoff).
- **O pedido ao contador de 30–31/10 não vai:** ficou sem pergunta. A P-C1 sai do [[X7]] e libera o X9.
