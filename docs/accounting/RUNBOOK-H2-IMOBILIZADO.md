# RUNBOOK: H2-IMOBILIZADO — Sign-off de browser da aba "Imobilizado" (FE-INCR-FIXED-ASSETS PR-1)

> Preparado por agente em 2026-10-03 contra a branch `claude/fe-incr-fixed-assets-pr1-4b7ac8`. **Em branco de
> propósito:** EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche. O agente verificou só o que o CI vê
> (`tsc`, `test:types`, vitest, build); **nenhuma conferência de tela** foi feita por agente.

Executor: [nome — humano]           Data: [____]
Autorização: dono, 2026-10-03 — "Executa o PR-1 do FE-INCR-FIXED-ASSETS" (nó `FE-INCR-FIXED-ASSETS`,
`docs/accounting/FE-INCR-FIXED-ASSETS-brief.md` item 34). Rastreio: `docs/plano/nos/FE-INCR-FIXED-ASSETS.md`
(`estado_detalhe`) e o item de sign-offs de browser do Bloco A (`docs/plano/gates/`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR do FE-INCR-FIXED-ASSETS PR-1 **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Servidor no ar com o `dev.db` populado (`server/prisma/prisma/dev.db` — o `server/prisma/dev.db` é isca de 0 byte) e um `AccountingBinding` `Active` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` (a tela está atrás de `withAuth`) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | Plano de contas do escopo com: uma conta folha de **Ativo** para o bem (ex.: 1.2.1.x), uma de **Ativo** para a depreciação acumulada (1.2.9.x), uma de **Despesa** para a depreciação, uma de **Receita** e uma de **Despesa** para ganho/perda na baixa, e o banco | UI "Plano de Contas" | [ ] |
| P5 | Ao menos 1 período **aberto** (o do mês que o passo 6 vai depreciar) | UI "Períodos" | [ ] |
| P6 | DevTools aberto: console e aba Network (filtro `fixed-asset`) | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando) — nunca uma frase descrevendo que deu certo.

1. Abrir a aba **Imobilizado** (última aba da barra), seção **Contas**; escolher a despesa de depreciação,
   o ganho e a perda na baixa; **Salvar**. Recarregar a página e voltar à seção.
   Resultado esperado: "Contas salvas."; após recarregar, os 3 selects voltam preenchidos; no Network, `PUT
   /api/accounting/settings` com **só** `unitId` + os 3 campos; console limpo.
   EVIDÊNCIA: [screenshot da seção após recarregar + linha do Network com o corpo do PUT]

2. Seção **Taxas**: conferir que o catálogo do Anexo III aparece (vem da tabela de plataforma `DEPRECIACAO_ANEXO_III`,
   não é mais semeado por escopo), com origem `ANEXO_III_*` e link "fonte", **sem botão "Ocultar"** nessas linhas
   (regra L-14: só taxa `CUSTOM` se oculta). Criar uma taxa `CUSTOM` (NCM, descrição, vida útil, %, justificativa).
   **Ocultar a taxa `CUSTOM`** e marcar "Mostrar ocultas".
   Resultado esperado: catálogo listado sem "Ocultar" nas linhas do Anexo; a taxa nova aparece como `CUSTOM` com
   "Ocultar"; a oculta some e reaparece com o selo "oculta" ao marcar "Mostrar ocultas"; nada é apagado.
   EVIDÊNCIA: [screenshot/DOM da lista (Anexo sem botão, `CUSTOM` com botão, `CUSTOM` oculta) + Network do `POST /depreciation-rates` e do `…/hide` da `CUSTOM`]

3. Seção **Classes**: criar uma classe depreciável (conta do bem + conta de depreciação acumulada) e uma **não**
   depreciável (a conta acumulada não aparece). Tentar remover uma classe com bem vivo (depois do passo 4).
   Resultado esperado: a classe não depreciável não mostra o select de acumulada; o `POST` dela não leva
   `accumulatedDepreciationAccountId`; a remoção com bem vivo mostra o 400 do servidor na confirmação.
   EVIDÊNCIA: [screenshot do modal das duas classes + Network do `POST` da não depreciável + screenshot do 400]

4. Seção **Bens** → **Novo bem**: classe depreciável, custo `5.000,00`, residual `500,00`, aquisição numa data
   conhecida, taxa **do catálogo** (escolher pelo combobox). Depois criar um 2º bem com taxa **explícita**.
   Resultado esperado: os dois aparecem em `Aguardando ativação`; a data de aquisição na lista é **a mesma** que foi
   digitada (sem voltar um dia); custo exibido `R$ 5.000,00`; no Network, o 1º `POST` leva `rateId` e **não** leva
   `annualRateBp`, o 2º o inverso.
   EVIDÊNCIA: [screenshot da lista + Network dos dois `POST`]

5. **Ativar** o 1º bem (data no mês a depreciar; deixar a abertura em branco se a data for posterior ao 1º período
   aberto). Em seguida abrir a mesma tela numa 2ª aba do navegador, ativar o 2º bem lá e **voltar à 1ª aba** e tentar
   ativar o 2º bem com o `version` velho.
   Resultado esperado: o 1º vira `Ativo`; na 1ª aba o 2º bem dá a mensagem "O bem mudou — lista recarregada" (409
   de CAS), recarrega a lista e **não reenvia sozinho**.
   EVIDÊNCIA: [screenshot do `Ativo` + screenshot da mensagem do 409 + Network do 409]

6. **Rodar depreciação** do mês M (default = mês anterior ao de hoje; ajustar para o mês do passo 5). Rodar de novo o
   mesmo mês M. Depois **fechar (UI Períodos) o período de um mês M+1 que ainda NÃO foi depreciado** (o bem ativo
   precisa cobri-lo) e rodar a depreciação de M+1. (O servidor ignora o que já foi lançado **antes** do gate de período:
   reexecutar M com o período fechado dá `0 lançada(s)`/`ignorada(s)`, não `PERIOD_NOT_OPEN` — por isso o gate se prova
   com um mês novo.)
   Resultado esperado: 1ª rodada de M `N lançada(s)`; 2ª `0 lançada(s)`/`ignorada(s)` (idempotente); a rodada de M+1 com
   o período fechado mostra na tabela de falhas `PERIOD_NOT_OPEN` com o botão "Abrir períodos" que leva à aba Períodos;
   o balancete (aba Balancete) refletiu a depreciação de M.
   EVIDÊNCIA: [screenshot do resultado das 3 rodadas + screenshot do Balancete + Network dos `POST …/depreciation/run`]

7. **Reconciliar**.
   Resultado esperado: o resultado `verificado(s)/reparado(s)/rascunho(s) recriado(s)` aparece; sem erro no console.
   EVIDÊNCIA: [screenshot do resultado + Network do `POST …/reconcile`]

8. **Baixar** o bem ativo: uma baixa **com valor recebido** (a contrapartida obrigatória aparece; tentar confirmar sem
   ela) e, noutro bem, uma baixa **imprestável** (valor 0, sem contrapartida).
   Resultado esperado: sem contrapartida, a tela bloqueia o envio; com ela, o bem vira `Baixado`, sem botões de
   ação; a baixa imprestável não pede contrapartida; o `POST` leva `version`.
   EVIDÊNCIA: [screenshot do bloqueio + da lista com os `Baixado` + Network dos dois `dispose`]

9. **[Só após o PR-2 do FE-INCR-FIXED-ASSETS (itens 27–31) — NÃO executável com o PR-1; deixar em branco]**
   Aba **NF-e**: importar uma NF-e de compra com 1 item marcado `Imobilizado` (+ 1 `Produto`); voltar a
   **Imobilizado → Bens**.
   Resultado esperado: o item imobilizado aparece como bem `Aguardando ativação` com o selo "da NF-e".
   EVIDÊNCIA: [screenshot da lista com o selo]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos (1–8) com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Rótulos de status e textos de ajuda ("imprestável", "abertura retroativa") — linguagem de contador: [ok / ajustar: ___]
  (pendente de validação humana, BRIEF §4)
- Atualização do artefato de rastreio: [linha do plano atualizada com o desfecho + data]
- Assinatura do executor: ____________

## Execução 2026-11-04 — AI tester (C7, runbooks irmãos do H2) — PARCIAL, sem desfecho

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04
Autorização (citada literalmente): dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o
#907. Faz e me substitui nas decisões"*; e dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e
outra para cada não feito"*.

**Estado: execução interrompida depois do passo 1, no teto de contexto da sessão. Sem desfecho.** A próxima sessão
continua do passo 2, no mesmo ambiente e com as contas abaixo. O handoff está na pasta de notas do grupo.

**Ambiente:** o mesmo do bloco de 04/11 do `RUNBOOK-H2-PACOTE-VALIDADE.md` (build de produção `3077cda9` = `main`
`f5dc79b7` + docs, `127.0.0.1:4100`/`:3100`, dev.db real, backup `server/prisma/backups/c7-irmaos-cont-20261104-014813/`).
Unidade `seed-unit-presumido` (`cmuw4yqxg001jcii0iz2yb9rw`). Tela: Contabilidade (`/accounting`) → aba **Imobilizado**
(seções Bens · Classes · Taxas · Contas).

**Pré-condições.** P1 `main` `f5dc79b7`. P2/P3 servidor e app de pé, binding `Active`. P5 períodos 2026/01–11 `OPEN`
(leitura de `accounting_periods`). P6 trocado pelo log de rede do runner. **P4 — desvio de dado:** o plano da unidade não
tinha nenhuma conta 1.2.x. Criei pela aba Plano de Contas → Nova Conta
([print](runbook-evidence/IMOBILIZADO-2026-11-04/pre-P4-01-plano-de-contas.png)):
```text
[net] POST /api/accounting/accounts -> 201  req: {"code":"1.2","name":"Ativo Não Circulante C7","nature":"Asset","acceptsEntries":false,"unitId":"cmuw4yqxg001jcii0iz2yb9rw"}
[net] POST /api/accounting/accounts -> 201  req: {"code":"1.2.1","name":"Imobilizado C7","nature":"Asset","acceptsEntries":false,…}
[net] POST /api/accounting/accounts -> 201  req: {"code":"1.2.1.01","name":"Máquinas e Equipamentos C7","nature":"Asset","acceptsEntries":true,…}   → cmw1ovbmz004lci40836wvwkd
[net] POST /api/accounting/accounts -> 201  req: {"code":"1.2.9","name":"Depreciação Acumulada C7","nature":"Asset","acceptsEntries":false,…}
[net] POST /api/accounting/accounts -> 201  req: {"code":"1.2.9.01","name":"(-) Depreciação Acumulada Máquinas C7","nature":"Asset","acceptsEntries":true,…}   → cmw1ovk7s004pci40oo32tvo1
[net] POST /api/accounting/accounts -> 201  req: {"code":"3.7","name":"Ganho na Baixa de Imobilizado C7","nature":"Revenue","acceptsEntries":true,…}   → cmw1ovotk004rci407v01jq5p
[net] POST /api/accounting/accounts -> 201  req: {"code":"4.7","name":"Perda na Baixa de Imobilizado C7","nature":"Expense","acceptsEntries":true,…}   → cmw1ovt8k004tci40buahw4gy
[net] POST /api/accounting/accounts -> 201  req: {"code":"4.8","name":"Despesa de Depreciação C7","nature":"Expense","acceptsEntries":true,…}   → cmw1ovxj7004vci402oag9nbn
```
O banco da contrapartida da baixa é o `1.1.1.01 — Banco`, que já existia.

**Passo 1.** Imobilizado → Contas: Despesa de depreciação `4.8`, Ganho `3.7`, Perda `4.7` → **Salvar**; recarregar a
página e voltar à seção ([print após recarregar](runbook-evidence/IMOBILIZADO-2026-11-04/passo1-01-contas-apos-recarregar.png)).
```text
[net] PUT /api/accounting/settings -> 200  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","depreciationExpenseAccountId":"cmw1ovxj7004vci402oag9nbn","disposalGainAccountId":"cmw1ovotk004rci407v01jq5p","disposalLossAccountId":"cmw1ovt8k004tci40buahw4gy"}
[eval] ["Contas salvas."]
(reload) [eval] ["Despesa de depreciação = 4.8 — Despesa de Depreciação C7","Ganho na baixa = 3.7 — Ganho na Baixa de Imobilizado C7","Perda na baixa = 4.7 — Perda na Baixa de Imobilizado C7"]
console: nenhuma linha [console.error]/[console.warn] na execução
```
O corpo do `PUT` leva só `unitId` + os 3 campos. O `PUT` saiu duas vezes, idênticas: a 1ª execução do runner caiu num
erro de sintaxe do próprio roteiro, depois do `PUT` e antes da leitura. Grau: verificado. **Confere.**

**Passos 2–9: não executados nesta sessão.** O passo 9 depende de importar uma NF-e de compra real (XML de NF-e = dado
externo). Pela regra do C7, fica BLOQUEADO quando chegar a vez dele, mesmo com o PR-2 já em `main` (selo "da NF-e" em
`FixedAssetsSection.tsx`).

### Registro parcial (execução 2026-11-04)
- Desvios de dado no dev.db: as 8 contas acima na unidade `seed-unit-presumido`; `accounting_scope_settings` da unidade
  com as 3 contas do imobilizado.
- Assinatura: nenhuma. A execução não tem desfecho; a próxima sessão assina ao fechar.

## Execução 2026-11-04 (continuação) — AI tester — FALHOU no passo 5

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04 (03:20–03:31 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e outra para
cada não feito"*; regra de assinatura em `docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira.

**Ambiente:** o mesmo da execução parcial acima, retomado do passo 2. Build de produção `3077cda9` (worktree
`agent-af93873e91c9b426b`), servidor `127.0.0.1:4100` e app `127.0.0.1:3100`, dev.db real
`server/prisma/prisma/dev.db`, unidade `seed-unit-presumido` (`cmuw4yqxg001jcii0iz2yb9rw`), usuário `seed-presumido`.
Antes da 1ª escrita: backup `server/prisma/backups/c7-imobilizado-20261104-032058/`
(`dev.db` sha256 `c364fc85…5f274`, `dev.db-wal` `03036cc9…1aff`). Depois de derrubar tudo: `PRAGMA integrity_check -> ok`.
Trava de tela tomada às 03:20 e apagada às 03:31, com 3100/4100 livres. Os passos 1 e P4 já tinham evidência e não foram
refeitos; o estado do banco (8 contas e as 3 contas salvas) seguia o mesmo. P6 (DevTools) foi trocado pelo log de rede do
runner (`passoN-net.txt`, JWT redigido).

**Passo 2 — PASSOU, pela regra ratificada L-14 (ressalva abaixo).**
O catálogo lista **222 linhas** do Anexo III, cada uma com origem `ANEXO_III_*` e link "fonte"
([print](runbook-evidence/IMOBILIZADO-2026-11-04/passo2-01-catalogo-anexo-iii.png)):
```text
[eval] {"linhas":222,"origens":{"ANEXO_III_IN_":220,"ANEXO_III_NOTA_":2},"linksFonte":222,"hrefExemplo":"https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente"}
[net] POST /api/accounting/depreciation-rates -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","ncm":"8419.81.00","description":"Máquina de café espresso C7","lifeYears":5,"annualRateBp":2000,"justification":"Uso intensivo em dois turnos — laudo técnico C7 (teste H2)"}
   res: {"success":true,"data":{"id":"cmw1qejhv0005cit07emr72mc",…,"source":"CUSTOM",…,"hiddenAt":null,…}}
[eval] {"n":1,"rows":["8419.81.00 Máquina de café espresso C7 5 20% CUSTOM Uso intensivo em dois turnos — laudo técnico C7 (teste H2) Ocultar"]}
```
O roteiro manda ocultar uma linha **do Anexo**. Desde o BE-INCR-LEGAL-PARAMS PR-3, o Anexo III é tabela de plataforma e não
tem linha por escopo. O fork L-14 (`docs/accounting/BE-INCR-LEGAL-PARAMS-brief.md:278`, ratificado) diz *"404/400 — só
CUSTOM se oculta"*. O roteiro (03/10) é anterior a essa regra, então a regra manda. Testei os dois lados:
```text
(a) linha do Anexo 8437 → Ocultar → Confirmar
[net] POST /api/accounting/depreciation-rates/lp3-dep-anexo-100/hide -> 404  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw"}
   res: {"code":"NOT_FOUND","message":"Taxa de depreciação 'lp3-dep-anexo-100' não foi encontrada."}
(modal) Taxa de depreciação 'lp3-dep-anexo-100' não foi encontrada.
(b) a CUSTOM → Ocultar → Confirmar
[net] POST /api/accounting/depreciation-rates/cmw1qejhv0005cit07emr72mc/hide -> 200  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw"}
   res: {…,"source":"CUSTOM",…,"hiddenAt":"2026-11-04T06:26:02.741Z",…}
[eval] {"n":0,"rows":[]}                                   ← sem "Mostrar ocultas", a CUSTOM some
[eval] Mostrar ocultas=true
[eval] {"n":1,"rows":["8419.81.00 Máquina de café espresso C7oculta 5 20% CUSTOM Uso intensivo em dois turnos — …"]}
```
Prints: [recusa do Anexo](runbook-evidence/IMOBILIZADO-2026-11-04/passo2-02-ocultar-linha-anexo-recusada.png) e
[CUSTOM com o selo "oculta"](runbook-evidence/IMOBILIZADO-2026-11-04/passo2-03-custom-oculta-com-mostrar-ocultas.png).
A taxa não foi apagada: a resposta traz a linha com `hiddenAt` preenchido. Não saiu `POST` de semeadura no log; o 1º acesso não
semeia mais, porque o Anexo vem da fotografia legal (`DepreciationRateService.ts`, comentário do PR-3). Grau: verificado.
**Ressalva:** a tela oferece "Ocultar" nas 222 linhas do Anexo, mas o servidor sempre as recusa. Isso virou o achado IMO-2.

**Passo 3 — PASSOU.**
```text
[eval] {"depreciavel":true,"selects":["Conta do bem = 1.2.1.01 — Máquinas e Equipamentos C7","Conta de deprec. acumulada = 1.2.9.01 — (-) Depreciação Acumulada Máquinas C7"]}
[net] POST /api/accounting/fixed-asset-classes -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","code":"MAQ-C7","name":"Máquinas e equipamentos C7","depreciable":true,"costAccountId":"cmw1ovbmz004lci40836wvwkd","accumulatedDepreciationAccountId":"cmw1ovk7s004pci40oo32tvo1"}
[eval] {"depreciavel":false,"selects":["Conta do bem = 1.2.1.01 — Máquinas e Equipamentos C7"]}      ← o select da acumulada sumiu
[net] POST /api/accounting/fixed-asset-classes -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","code":"TER-C7","name":"Terrenos C7 (não depreciável)","depreciable":false,"costAccountId":"cmw1ovbmz004lci40836wvwkd"}
(depois do passo 4) MAQ-C7 → Remover → Confirmar remoção
[net] DELETE /api/accounting/fixed-asset-classes/cmw1qhp0m0007cit0jb4bjr3d -> 400  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","classId":"cmw1qhp0m0007cit0jb4bjr3d"}
   res: {"code":"VALIDATION_ERROR","message":"Classe 'cmw1qhp0m0007cit0jb4bjr3d' tem 2 ativo(s) vivo(s) — remova ou baixe-os antes."}
(modal) Classe 'cmw1qhp0m0007cit0jb4bjr3d' tem 2 ativo(s) vivo(s) — remova ou baixe-os antes.
```
O `POST` da não depreciável não leva `accumulatedDepreciationAccountId`. Prints:
[modal depreciável](runbook-evidence/IMOBILIZADO-2026-11-04/passo3-01-modal-classe-depreciavel.png),
[modal não depreciável](runbook-evidence/IMOBILIZADO-2026-11-04/passo3-02-modal-classe-nao-depreciavel.png),
[lista](runbook-evidence/IMOBILIZADO-2026-11-04/passo3-03-lista-de-classes.png) e
[400 na confirmação](runbook-evidence/IMOBILIZADO-2026-11-04/passo3-04-remover-classe-com-bem-vivo-400.png). Grau: verificado.

**Passo 4 — PASSOU.** O 1º bem usa taxa do catálogo, escolhida no combobox pela NCM 9402 ("cadeiras para salões de
cabeleireiro", 10% a.a.). O 2º usa taxa explícita de 10%.
```text
[net] POST /api/accounting/fixed-assets -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","classId":"cmw1qhp0m0007cit0jb4bjr3d","code":"BEM-C7-01","description":"Cadeira hidráulica de corte C7","quantity":1,"costCents":500000,"residualValueCents":50000,"acquiredAt":"2026-09-15","rateId":"lp3-dep-anexo-255"}
[net] POST /api/accounting/fixed-assets -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","classId":"cmw1qhp0m0007cit0jb4bjr3d","code":"BEM-C7-02","description":"Secador profissional C7","quantity":1,"costCents":300000,"residualValueCents":0,"acquiredAt":"2026-09-20","annualRateBp":1000}
[eval] {"n":2,"rows":["BEM-C7-01 Cadeira hidráulica de corte C7 Máquinas e equipamentos C7 R$ 5.000,00 R$ 0,00 R$ 5.000,00 Aguardando ativação 15/09/2026 — Ativar Editar Remover","BEM-C7-02 Secador profissional C7 Máquinas e equipamentos C7 R$ 3.000,00 R$ 0,00 R$ 3.000,00 Aguardando ativação 20/09/2026 — Ativar Editar Remover"]}
```
O 1º `POST` leva `rateId` sem `annualRateBp`; o 2º leva o inverso. As datas digitadas, 2026-09-15 e 2026-09-20, aparecem como
15/09/2026 e 20/09/2026, sem recuo de um dia. O custo aparece como `R$ 5.000,00`. Prints:
[modal](runbook-evidence/IMOBILIZADO-2026-11-04/passo4-01-modal-bem-taxa-catalogo.png) e
[lista](runbook-evidence/IMOBILIZADO-2026-11-04/passo4-02-lista-de-bens.png). Grau: verificado.
Método: na 1ª tentativa, o roteiro do runner casou o select "Classe" com o filtro da página, que tem o mesmo `aria-label`. A
tela bloqueou o envio com "Selecione a classe." e nenhum `POST` saiu. Repeti com o seletor restrito ao modal.

**Passo 5 — FALHOU.** Ativei o BEM-C7-01 em 2026-10-01, sem abertura. O 1º período aberto é 2026-01, então a abertura pode
ficar em branco. Depois abri uma 2ª aba, ativei lá o BEM-C7-02, voltei à 1ª aba (lista ainda com o BEM-C7-02 em "Aguardando
ativação") e tentei ativá-lo com o `version` velho.
```text
[aba1] POST /api/accounting/fixed-assets/cmw1qjr3t000bcit0l847f5v7/activate -> 200  req: {…,"activatedAt":"2026-10-01","version":1}
[eval] … "BEM-C7-01 … Ativo 15/09/2026 01/10/2026 Baixar Remover" …
[aba2] POST /api/accounting/fixed-assets/cmw1qjxju000dcit0mg4t1kjq/activate -> 200  req: {…,"activatedAt":"2026-10-01","version":1}
[aba1] (lista antes do clique) … "BEM-C7-02 … Aguardando ativação 20/09/2026 — Ativar Editar Remover"
[aba1] POST /api/accounting/fixed-assets/cmw1qjxju000dcit0mg4t1kjq/activate -> 400  req: {…,"activatedAt":"2026-10-01","version":1}
   res: {"code":"VALIDATION_ERROR","message":"Ativo 'cmw1qjxju000dcit0mg4t1kjq' está em status ACTIVE; só PENDING_ACTIVATION pode ser ativado."}
[aba1] (4 s depois) aviso na seção: []   lista: … "BEM-C7-02 … Aguardando ativação 20/09/2026 — Ativar Editar Remover"
banco (leitura): BEM-C7-01 | ACTIVE | version 2      BEM-C7-02 | ACTIVE | version 2
```
Prints: [1º bem Ativo](runbook-evidence/IMOBILIZADO-2026-11-04/passo5-01-bem1-ativo.png),
[2ª aba](runbook-evidence/IMOBILIZADO-2026-11-04/passo5-02-aba2-bem2-ativo.png) e
[1ª aba depois do clique](runbook-evidence/IMOBILIZADO-2026-11-04/passo5-03-aba1-version-velho-400.png).
O que confere: o 1º bem virou `Ativo`, e a 1ª aba não reenviou nada (3 `POST …/activate` no log, um por clique).
O que diverge: o esperado era o 409 de CAS com o aviso "O bem mudou — lista recarregada" e a lista recarregada. Veio um
**400** com a mensagem crua no modal, que expõe o id interno. A 1ª aba seguiu mostrando o BEM-C7-02 como "Aguardando
ativação" e oferecendo "Ativar". Caso adversarial: e se a 1ª aba tivesse recarregado antes do clique? O corpo enviado leva
`version: 1` e o banco está em `version: 2`, então o cliente mandou mesmo o `version` velho. A divergência é do servidor
(IMO-1), não do método. Grau: verificado (tela, rede e banco).

**Passos 6–8: não executados** (regra do FALHOU). **Passo 9:** não executado. Quando chegar a vez dele, fica BLOQUEADO,
porque depende de NF-e de compra real (dado externo).

### Desfecho (execução 2026-11-04)
[x] FALHOU — passo 5 divergiu: ativar com `version` velho, depois que outra aba ativou o bem, devolve 400 de status em vez
do 409 de CAS. A tela não mostra "O bem mudou — lista recarregada" e não recarrega a lista. Evidência acima. Nenhum passo
seguinte foi executado.

### Registro (execução 2026-11-04, continuação)
- **IMO-1 (médio: contrato de concorrência)**: `server/src/features/accounting/services/FixedAssetService.ts:195`. O
  `activateAsset` checa `current.status !== 'PENDING_ACTIVATION'` (400) antes do CAS de `version` (`:222-223`, 409). Quem
  chega com `version` velho porque o bem já foi ativado recebe 400, e o FE só recarrega a lista no 409
  (`FixedAssetsSection.tsx:115`, `onConflict`). O contrato do FE diz "409 `ConflictError` em `version` divergente"
  (`FE-INCR-FIXED-ASSETS-brief.md:38` e item 14). O `disposeAsset` tem a mesma ordem: status em `:238`, antes do CAS de
  leitura em `:253`. Inferido, não exercitado: baixar pela 2ª vez com `version` velho também dá 400.
  Instrumentação → correção: teste de serviço que ativa um bem (`version` 1→2) e chama `activateAsset` de novo com
  `version: 1`, esperando `ConflictError`. Hoje dá `ValidationError`. Idem para `disposeAsset` com o bem já `DISPOSED`.
  Correção provável: comparar `dto.version` com `current.version` antes do gate de status. A decisão fica com a sessão de
  correção.
- **IMO-2 (baixo: UI × regra L-14)**: `my-app/features/accounting/components/DepreciationRatesSection.tsx:198`. O botão
  "Ocultar" aparece em toda linha não oculta, inclusive nas 222 do Anexo III, que o servidor sempre recusa com 404 (L-14). A
  mensagem do 404 expõe o id interno `lp3-dep-anexo-100`. Instrumentação → correção: teste do componente que reprova
  "Ocultar" em linha com `source` `ANEXO_III_*` (ou `origem` ≠ `ESCOPO`).
- **IMO-3 (texto)**: as mensagens de erro do servidor mostram o id interno em vez do código. Exemplos: "Classe
  'cmw1qhp0m0007cit0jb4bjr3d' tem 2 ativo(s) vivo(s)…" (passo 3) e "Ativo 'cmw1qjxju000dcit0mg4t1kjq' está em status
  ACTIVE…" (passo 5). Linguagem de operador: ajustar para o código (`MAQ-C7`, `BEM-C7-02`) e o rótulo do status.
- **Roteiro desatualizado**: o passo 2 deste runbook ainda manda ocultar uma linha do Anexo e diz que "1º acesso semeia no
  servidor". As duas coisas mudaram com o BE-INCR-LEGAL-PARAMS PR-3 e o L-14. Quem reescrever o runbook troca "linha do Anexo"
  por "a taxa CUSTOM" e tira a semeadura.
- Rótulos "imprestável" e "abertura retroativa": não avaliados, porque os passos 7–8 não rodaram. O texto de ajuda da
  ativação ("Obrigatória se a ativação for anterior ao 1º período aberto — o servidor avisa se faltar.") está claro.
- Desvios de dado no dev.db (unidade `seed-unit-presumido`): taxa CUSTOM `cmw1qejhv0005cit07emr72mc` (oculta); classes
  `MAQ-C7` `cmw1qhp0m0007cit0jb4bjr3d` e `TER-C7` `cmw1qhudi0009cit0c6d43lwn`; bens `BEM-C7-01` `cmw1qjr3t000bcit0l847f5v7`
  e `BEM-C7-02` `cmw1qjxju000dcit0mg4t1kjq`, ambos `ACTIVE` desde 2026-10-01 e sem depreciação postada. Somam-se às 8 contas
  e às 3 contas salvas da execução parcial. A próxima execução, depois da correção do IMO-1, parte deste estado: o passo 5
  precisa de um bem novo em `Aguardando ativação`.
- Rastreio: a nota `FE-INCR-FIXED-ASSETS` fica para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-04). A assinatura
  atesta a execução e a conferência da evidência; não substitui oráculo externo.

## Execução 2026-11-11 (3ª) — AI tester — reexecução curta dos passos 2 e 6 do roteiro reescrito (IMO-U1 + débito `de67`)

Autorização: dono, chat, 2026-11-11 (corrigir as lacunas dos runbooks H2 rodados no dia). Escopo: **só** conferir que o roteiro
novo dos passos 2 e 6 se cumpre e que o fix IMO-U1 (sem "Ocultar" em linha do Anexo III) está na tela. Os demais passos não
foram refeitos; o passo 9 (NF-e real) segue **BLOQUEADO**, externo. Sem desfecho geral do runbook.

**Ambiente (isolado):** build de produção da branch `claude/fix-imo-u1-ocultar-anexo-f8eb71` (commit do fix `5d8d4020f`),
front `127.0.0.1:3710`, servidor `127.0.0.1:3711`, **cópia privada** do `dev.db` (+wal) em pasta de scratchpad — o banco do dono
não foi aberto para escrita. Unidade `seed-unit-presumido`, usuário `seed-presumido`, bens `BEM-C7-01`/`-02` já `Ativo` desde 01/10.
Runner `scripts/runbook-tela.mjs`; evidência em `runbook-evidence/IMOBILIZADO-2026-11-11-3a/`. Servidores derrubados ao fim
(3710/3711 livres).

**Passo 2 — PASSOU** ([DOM](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo2-04-taxas-contagem-dom.png),
[lista](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo2-01-anexo-sem-ocultar.png),
[modal](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo2-02-modal-ocultar-custom.png),
[oculta](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo2-03-custom-oculta-mostrar-ocultas.png), net em `passo2-net.txt`):
```text
[eval] {"linhas":222,"anexo":222,"anexoComOcultar":0,"custom":0,"customComOcultar":0}
[net] POST /api/accounting/depreciation-rates -> 201  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","ncm":"8471","description":"Taxa CUSTOM 3a execucao","lifeYears":4,"annualRateBp":2500,"justification":"Roteiro H2 3a execucao 2026-11-11"}
[net] POST /api/accounting/depreciation-rates/cmwcnnwfo0005cigw2bmyc6t2/hide -> 200  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw"}   (res.data.source = "CUSTOM", hiddenAt preenchido)
[assert] "Taxa CUSTOM 3a execucao" presente=false (esperado ausente)      ← some da lista
(marcar "Mostrar ocultas") GET …/depreciation-rates?unitId=…&includeHidden=true -> 200; texto "oculta" presente
```
Nenhum `POST …/hide` em linha do Anexo foi possível (0 botões) — o 404 com id interno `lp3-dep-anexo-100` não chega mais ao usuário.
A contagem `custom: 0` do `[eval]` é da recarga final, em que a CUSTOM já estava oculta e "Mostrar ocultas" desmarcado.

**Passo 6 — PASSOU** (roteiro novo: M = 2026-10 depreciado, M+1 = 2026-11 fechado e não depreciado;
[rodada 1](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo6-01-rodada1-mes-M-2026-10.png),
[rodada 2](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo6-02-rodada2-mes-M-idempotente.png),
[fechar Nov](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo6-04-periodo-nov-fechado.png),
[falhas](runbook-evidence/IMOBILIZADO-2026-11-11-3a/passo6-05-rodada-M1-periodo-fechado-PERIOD_NOT_OPEN.png),
net em `passo6-net.txt`, `passo6c-net.txt`, `passo6d-net.txt`):
```text
[net] POST /api/accounting/fixed-assets/depreciation/run -> 200  req: {"unitId":"…","yearMonth":"2026-10"}
   res: {"success":true,"data":{"yearMonth":"2026-10","posted":2,"skipped":0,"failed":[]}}
[net] POST /api/accounting/fixed-assets/depreciation/run -> 200  req: {"unitId":"…","yearMonth":"2026-10"}
   res: {"success":true,"data":{"yearMonth":"2026-10","posted":0,"skipped":2,"failed":[]}}
[net] POST /api/accounting/periods/cmuw4yzmz01cocii0558nkumb/soft-close -> 200   (year 2026, month 11, status SOFT_CLOSED)
[net] POST /api/accounting/fixed-assets/depreciation/run -> 200  req: {"unitId":"…","yearMonth":"2026-11"}
   res: {"success":true,"data":{"yearMonth":"2026-11","posted":0,"skipped":0,"failed":[{"assetId":"cmw1qjr3t000bcit0l847f5v7","code":"PERIOD_NOT_OPEN","message":"Período contábil 2026/11 não está aberto para lançamentos."},{"assetId":"cmw1qjxju000dcit0mg4t1kjq","code":"PERIOD_NOT_OPEN", …}]}}
```
Tela: "Depreciação de 2026-11: 0 lançada(s), 0 ignorada(s), 2 com falha." com a tabela de falhas e o link "Abrir períodos".
**Não conferido nesta reexecução:** a leitura do Balancete refletindo a depreciação de M (o roteiro dos 3 itens fica como
está; o Balancete foi coberto na execução de 04/11).

Assinatura: AI tester, agente claude-sonnet-5-5, sob autorização do dono (chat, 2026-11-11).
