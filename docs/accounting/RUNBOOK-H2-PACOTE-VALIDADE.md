# RUNBOOK: H2-PACOTE-VALIDADE — Sign-off de browser da validade do pacote e do aceite (FE-INCR-PACOTE-VALIDADE)

> Preparado por agente em 2026-10-05 contra a branch `claude/fe-incr-pacote-validade-258dfe`. **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche. O agente verificou o que o CI vê (`tsc`, `test:types`,
> vitest, build de produção, unit + integração do server) e **mediu** em build de produção, por sonda, a caixa da validade
> (`font-size` 16px, `font-weight` 600, borda 2px) e a ordem das chamadas (venda → itens → aceite) num banco-cópia
> descartável; ele **não** leu o PDF impresso nem conferiu a tela como um humano o faria — é isso que este runbook fecha.
> Este runbook é o gate humano que o F-JUR-4 pede antes do deploy do PACOTE-VALIDADE (junto com o M2).

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-05 — "Executa o FE-INCR-PACOTE-VALIDADE" (nó `FE-INCR-PACOTE-VALIDADE`,
`docs/accounting/FE-INCR-PACOTE-VALIDADE-brief.md` item 17). Rastreio: `docs/plano/nos/FE-INCR-PACOTE-VALIDADE.md`
(`estado_detalhe`) e o item de sign-offs de browser do Bloco A (`docs/plano/gates/`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR do FE-INCR-PACOTE-VALIDADE **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Servidor no ar com o `dev.db` populado (`server/prisma/prisma/dev.db`) **depois de aplicar a migração** `20261005120000_add_package_validity_acceptances` (`cd server && npx prisma migrate deploy`) e um `AccountingBinding` `Active` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api` → `200` (ou `401`: o servidor responde) | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` (a tela está atrás de `withAuth`) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | Catálogo com **2 pacotes ativos**: um com `validityDays` = `30` e outro **sem** validade (vazio/`0`) | Tabela "Packages" | [ ] |
| P5 | 1 cliente cadastrado e 1 unidade; sessão do operador logada | — | [ ] |
| P6 | Um cliente com **saldo vencido** num pacote (para o passo 9): `expiresAt` anterior a hoje em `customer_package_balances` (acerto manual no banco de teste — não em produção) | `sqlite3 …/dev.db "select packageId, expiresAt from customer_package_balances"` | [ ] |
| P7 | Impressora real ou "Salvar como PDF" para conferir o tamanho da cláusula impressa; DevTools aberto (console e Network, filtro `package-acceptances`) | — | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado
(screenshot, linha do Network, saída de comando, o PDF) — nunca uma frase descrevendo que deu certo.

1. "Nova Venda" → **Pacotes**; unidade + cliente; aba **Itens** → adicionar o pacote **com validade (30 dias)**.
   Resultado esperado: abaixo dos itens aparece o bloco "Validade do pacote" — caixa com borda, "Válido até DD/MM/AAAA" e o
   texto legal inteiro (prazo, data da compra, último dia, regra do feriado, "não será devolvido"). O último dia confere
   com a conta (data da venda + 30; se cair em feriado nacional, o dia útil seguinte). Os botões "Salvar Rascunho" e
   "Finalizar Venda" estão **desabilitados**.
   EVIDÊNCIA: [screenshot da aba Itens com o bloco e os botões desabilitados]

2. Marcar "Li este texto ao cliente e ele concordou".
   Resultado esperado: os dois botões habilitam. Voltar ao Cabeçalho, mudar a **data** da venda e voltar a Itens: o
   bloco mostra a data/último dia novos e o checkbox **volta desmarcado** (botões desabilitados de novo).
   EVIDÊNCIA: [screenshot do bloco após a troca de data, checkbox desmarcado]

3. Com o checkbox marcado, **Salvar Rascunho** (ou Finalizar Venda, se o defeito do wizard registrado em "Achados" já estiver
   corrigido).
   Resultado esperado: no Network, nesta ordem: `POST` da venda, `POST` do item, `POST /api/package-acceptances` → `201`
   com `textVersion` `v1`. O corpo do `POST` do aceite tem **só** `unitId`, `saleId`, `textVersion`, `textSha256`.
   EVIDÊNCIA: [as três linhas do Network + o corpo do POST do aceite]

4. Abrir a venda criada na lista (detalhe).
   Resultado esperado: a "Validade do pacote" aparece em destaque (a mesma caixa) com o texto **gravado**; abaixo, "Aceite
   registrado por … em DD/MM/AAAA HH:MM (texto v1)"; **sem** o selo "Aceite não registrado". A data do cabeçalho do detalhe
   é o dia da venda (não o dia anterior).
   EVIDÊNCIA: [screenshot do detalhe]

5. Sonda de estilo (DevTools → Console) na caixa do detalhe:
   `getComputedStyle(document.querySelector('[data-testid="package-validity-text"]'))` → `fontSize`, `fontWeight`.
   Resultado esperado: `fontSize` ≥ `16px` e `fontWeight` ≥ `600`.
   EVIDÊNCIA: [saída da sonda]

6. No detalhe, **Baixar comprovante (PDF)**; abrir e **imprimir** (ou salvar como PDF e conferir no leitor).
   Resultado esperado: unidade, cliente, pacote, valor, data da venda; a **cláusula** em caixa com borda, em negrito, maior
   que o corpo do restante (12pt); o aceite (quem, quando em horário de Brasília, versão); a linha "Assinatura do cliente"
   e nada de "ACEITE NÃO REGISTRADO". Colher a assinatura do cliente no papel (F-FE-PV-3 b) e guardar.
   EVIDÊNCIA: [o PDF anexado + foto/scan da cláusula impressa com a régua do tamanho]

7. Criar outra venda do pacote com validade e **fechar a janela sem aceitar** não é possível pelo wizard (o botão não
   habilita); então: criar a venda pela tabela genérica (Packages → Sales) **sem** passar pelo wizard e abrir o detalhe.
   Resultado esperado: selo vermelho "Aceite não registrado", a validade em destaque e o botão "Registrar aceite". Clicar,
   marcar o checkbox e "Confirmar aceite": o selo some e o aceite aparece. Baixar o PDF **antes** de registrar numa outra
   venda igual: a cláusula leva a marca **ACEITE NÃO REGISTRADO**.
   EVIDÊNCIA: [screenshot do selo + do botão + do aceite depois; o PDF com a marca]

8. Venda do pacote **sem validade**: wizard → pacote sem validade.
   Resultado esperado: o bloco mostra "Sem validade", **não há** checkbox e a venda pode ser salva sem aceite; no detalhe, sem
   selo e sem botão de PDF.
   EVIDÊNCIA: [screenshot do wizard + do detalhe]

9. Venda de **serviço** finalizada para o cliente do P6 → **Pagar** → "Saldo de pacote".
   Resultado esperado: cada saldo mostra "vence em DD/MM/AAAA" ou "sem validade"; o saldo **vencido** aparece
   **desabilitado**, com "vencido em DD/MM/AAAA"; ao escolher um saldo válido, a frase "Este saldo vence em …" aparece
   em destaque (≥ 16px, semibold).
   EVIDÊNCIA: [screenshot do select com as três situações + da frase em destaque]

10. (Só se o passo 9 permitir forçar) Chamar `POST /api/sales/pay` com o `packageId` do saldo vencido pelo DevTools.
    Resultado esperado: `400` com o código `PACKAGE_BALANCE_EXPIRED` (a autoridade é o servidor, não o select).
    EVIDÊNCIA: [linha do Network com o corpo da resposta]

11. Console do navegador ao longo de todos os passos.
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
