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

2. Seção **Taxas**: conferir que o catálogo do Anexo III apareceu (1º acesso semeia no servidor), com origem
   `ANEXO_III_*` e link "fonte". Criar uma taxa `CUSTOM` (NCM, descrição, vida útil, %, justificativa). Ocultar uma
   linha do Anexo e marcar "Mostrar ocultas".
   Resultado esperado: catálogo listado; a taxa nova aparece como `CUSTOM`; a oculta some e reaparece com o selo
   "oculta" ao marcar "Mostrar ocultas"; nada é apagado.
   EVIDÊNCIA: [screenshot da lista com as 3 situações + Network do `POST /depreciation-rates` e do `…/hide`]

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

6. **Rodar depreciação** do mês (default = mês anterior ao de hoje; ajustar para o mês do passo 5). Rodar de novo o
   mesmo mês. Fechar o período desse mês (UI Períodos) e rodar de novo.
   Resultado esperado: 1ª rodada `N lançada(s)`; 2ª `0 lançada(s)`/`ignorada(s)` (idempotente); com o período fechado,
   a tabela de falhas mostra `PERIOD_NOT_OPEN` com o botão "Abrir períodos" que leva à aba Períodos; o balancete
   (aba Balancete) refletiu a depreciação.
   EVIDÊNCIA: [screenshot do resultado das 3 rodadas + screenshot do Balancete + Network do `POST …/depreciation/run`]

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
