# RUNBOOK: H2-VENDA-PACOTE — Sign-off de browser da venda de pacote pelo wizard (FE-INCR-VENDA-PACOTE)

> Preparado por agente em 2026-10-05 contra a branch `claude/fe-incr-venda-pacote`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche. O agente verificou só o que o CI vê
> (`tsc`, `test:types`, vitest, build de produção, unit + integração do server); **nenhuma conferência de tela**
> foi feita por agente.

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-05 — "executa o FE-INCR-VENDA-PACOTE" (nó `FE-INCR-VENDA-PACOTE`,
`docs/accounting/FE-INCR-VENDA-PACOTE-brief.md` item 10). Rastreio: `docs/plano/nos/FE-INCR-VENDA-PACOTE.md`
(`estado_detalhe`) e o item de sign-offs de browser do Bloco A (`docs/plano/gates/`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR do FE-INCR-VENDA-PACOTE **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Servidor no ar com o `dev.db` populado (`server/prisma/prisma/dev.db` — o `server/prisma/dev.db` é isca de 0 byte) e um `AccountingBinding` `Active` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` (a tela está atrás de `withAuth`) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | A tabela de itens de venda é a **mista** (tem `packageId`): presets salão/clínica | No wizard "Nova Venda", o seletor "Tipo de Venda" mostra **Produtos / Serviços / Pacotes** | [ ] |
| P5 | Catálogo de pacotes com 1 pacote **ativo** (ex.: "Pacote 10", preço `300,00`) e 1 **inativo** | Tabela "Packages" | [ ] |
| P6 | A tabela de vendas tem o campo `aboveCatalogPrice` — se a tabela é anterior a este PR, um **admin** roda o sync do preset: `POST /api/dynamic-tables/sync-preset` com `{ "internalName": "<internalName da tabela de vendas>" }` | Resposta do sync com `aboveCatalogPrice` em `added` (ou o campo já no schema) | [ ] |
| P7 | 1 cliente cadastrado e 1 unidade | Tabelas de clientes e unidades | [ ] |
| P8 | DevTools aberto: console e aba Network (filtro `dynamic-tables`) | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando) — nunca uma frase descrevendo que deu certo.

1. "Nova Venda" → Tipo de Venda **Pacotes**. Na seção Cliente, conferir que não há o interruptor "Cliente avulso".
   Resultado esperado: a frase "Pacote precisa de cliente cadastrado: o saldo fica no nome dele." no lugar do
   interruptor; só o seletor de cliente cadastrado.
   EVIDÊNCIA: [screenshot da aba Cabeçalho]

2. Unidade + cliente; aba **Itens** → "Adicionar pacote"; abrir o seletor de pacote.
   Resultado esperado: o pacote ativo aparece; o **inativo não**. Escolhido o pacote, o preço unitário vem do
   catálogo (`300,00`).
   EVIDÊNCIA: [screenshot do seletor aberto + da linha com o preço]

3. Mudar o preço para `250,00`.
   Resultado esperado: aviso "Para cobrar menos que o catálogo, use o campo Desconto." na linha; "Finalizar Venda"
   recusa com a mesma frase. Voltar o preço para `300,00` e lançar `50,00` no campo **Desconto**: o total vira
   `250,00` e o envio passa a ser possível.
   EVIDÊNCIA: [screenshot do aviso + screenshot do total com desconto]

4. Adicionar uma 2ª linha com **outro** pacote ativo (se existir) e tentar finalizar.
   Resultado esperado: "Uma venda leva um único pacote. Para outro pacote, crie outra venda."; nada é enviado
   (Network sem `POST`). Remover a 2ª linha.
   EVIDÊNCIA: [screenshot da mensagem + Network vazio]

5. Desconto `0`, quantidade `2`, preço `320,00`; **Finalizar Venda**.
   Resultado esperado: subtotal `640,00`; no Network, `POST` da venda com `"aboveCatalogPrice": true` e `POST` do
   item com `"type": "Package"`, `"packageId"`, `"quantity": 2`, `"unitPrice": 320`. Na lista, a venda mostra a
   etiqueta **"Acima do catálogo"**; no detalhe, o item aparece como **Pacote** com o nome do pacote.
   EVIDÊNCIA: [as duas linhas do Network com os corpos + screenshot da lista e do detalhe]

6. Nova venda de pacote pelo preço do catálogo (`300,00`, qtd 1), finalizada.
   Resultado esperado: `"aboveCatalogPrice": false` no corpo do `POST`; sem etiqueta na lista.
   EVIDÊNCIA: [linha do Network + screenshot da lista]

7. Criar uma venda de **serviço** finalizada para o **mesmo cliente** e clicar **Pagar** → forma "Saldo de pacote".
   Resultado esperado: o saldo do pacote vendido nos passos 5–6 aparece como opção (crédito da ponte
   `sale.package.sold`).
   EVIDÊNCIA: [screenshot do select de pacotes do modal de pagamento]

8. Voltar à venda de pacote do passo 5 (finalizada, pendente) e clicar **Pagar** → "Saldo de pacote".
   Resultado esperado: o **próprio pacote vendido não aparece** como saldo para pagar a si mesmo (item 7 do BRIEF).
   Se o cliente tiver saldo de **outro** pacote, esse aparece (troca permitida, F-FE-VP-2).
   EVIDÊNCIA: [screenshot do select de pacotes do modal de pagamento]

9. Console do navegador ao longo de todos os passos.
   Resultado esperado: sem erro vermelho.
   EVIDÊNCIA: [screenshot do console]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do plano/mapa atualizada com o desfecho + data]
- Assinatura do executor: ____________
