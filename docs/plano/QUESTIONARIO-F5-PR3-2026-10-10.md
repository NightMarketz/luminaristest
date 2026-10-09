# Questionário do dono — F5 PR-3 (relatório de liberações do MP + F7), 10/10/2026

O agente de execução parou antes de escrever código. Ao conferir o BRIEF com o código, achou lacunas que afetam quase todos os itens P3-*.
A branch `claude/f5-pr3-relatorio` já está preparada, só no local, com os merges do #608 e do PR-2. Retorno completo: `.claude/retornos/f5-pr3.md` (worktree `agent-a620023cd52617d51`).
Responda no chat, por exemplo "G1 a, G2 a…".

**G1 — Como saber de qual conta do MP é um extrato** (P3-4, P3-6, P3-9)
Hoje o `BankStatement` não guarda `paymentAccountId`, e o código deixa duas contas MP usarem a mesma conta contábil (verificado no `PaymentAccountService.create`).
- [ ] (a) Coluna nova `paymentAccountId` no extrato, preenchida no import do `mp_release` — *recomendado*: o vínculo fica explícito e não depende da conta contábil.
- [ ] (b) Proibir duas contas MP na mesma conta contábil e deduzir a conta MP pela conta contábil.
- [ ] (c) Aceitar qualquer conta MP que use aquela conta contábil.

**G2 — Saldo de abertura e de fechamento** (P3-1)
- [ ] (a) Tirar os dois saldos das linhas de saldo inicial e final do próprio relatório. Se o DTO também mandar saldos, responder 400 — *recomendado*: uma fonte só, sem ambiguidade.
- [ ] (b) O valor do DTO prevalece sobre o do arquivo.

**G3 — Sinal das colunas de tarifa** (P3-7) — *parcialmente respondido pela documentação do MP*
No CSV de exemplo da doc do relatório "released money", a tarifa (`MP_FEE_AMOUNT`) vem **negativa** e o líquido é a soma do bruto com a tarifa: 269,00 + (−43,04) = 225,96. A doc não escreve isso como regra; só dá para ler no exemplo.
- [ ] (a) Conferir NET = GROSS + Σ(colunas de tarifa e impostos, como vêm, negativas) e recusar a linha que não bater — *recomendado*: é o que o exemplo oficial mostra, e a recusa protege se o sinal vier diferente num arquivo real.
- [ ] (b) Usar o valor absoluto das tarifas (NET = GROSS − |tarifas|). Tolera sinais trocados, mas esconde um arquivo malformado.

**G4 — Por onde o job começa na primeira execução** (P3-5)
- [ ] (a) Pela data em que a credencial foi gravada — *recomendado*: antes disso não existe cobrança nossa para conciliar.
- [ ] (b) Pela data de criação da conta MP no Luminaris.
- [ ] (c) Por uma data que o usuário informa ao ativar a conta.

**G5 — Em nome de qual usuário o job faz o import** (P3-5)
- [ ] (a) O usuário que gravou ou ativou a credencial da conta MP, revalidando a permissão a cada execução — *recomendado*: alguém real responde pelo import.
- [ ] (b) Um usuário de sistema, que pula a policy. Contraria o padrão do repositório.

**G6 — Como o endpoint de upload recebe `format = mp_release`**
- [ ] (a) Campo `format` opcional no DTO. Se vier vazio, o formato é detectado pelo conteúdo, como hoje. Upload `mp_release` numa conta contábil sem conta MP → 409 — *recomendado*.
- [ ] (b) Só detectar pelo conteúdo, sem campo novo.

**G7 — Cobrança expirada, cancelada ou com falha no casamento do relatório** (P3-6 × F9)
O F9 foi ratificado como "sem baixa automática". Mesmo assim, uma cobrança nesses estados ainda casaria e viraria proposta de baixa no F7, que depois um humano confirma.
- [ ] (a) Casar e mostrar a proposta com um aviso "cobrança em estado terminal no Luminaris", com a confirmação sempre humana — *recomendado*: o dinheiro entrou de fato, e esconder a linha deixaria o extrato sem conciliar.
- [ ] (b) Não casar e deixar a linha pendente para conciliação manual.

**G8 — Quando gravar o evento `payment_account.release_report_imported`** (P3-12)
- [ ] (a) Também no upload manual, com `fromUtc`/`toUtc` tirados das datas do próprio arquivo — *recomendado*: auditoria igual nos dois caminhos.
- [ ] (b) Só no job.

## Fora do escopo (FE, só para você saber)
A tela do F7 não mostra a tarifa (`feeCents`). O usuário veria uma proposta de 10000 contra uma linha de 9700 sem explicação. Pede um item de FE separado.

Fontes (doc do Mercado Pago):
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/additional-content/reports/released-money/report-fields
- https://www.mercadopago.com.br/developers/en/docs/reports/released-money/how%20to%20use
