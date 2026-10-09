# Questionário do dono — F5 PR-2/PR-3 (Mercado Pago), 10/10/2026

O agente de execução parou na fase 1 sem escrever código: o BRIEF tem lacunas que decidem o núcleo do PR-2.
Os itens abaixo foram conferidos no código, no SDK oficial `mercadopago@3.6.1` e na doc do MP.
Retorno completo: `.claude/retornos/f5-pr2.md` (worktree `agent-a3b0680846fae9cdf`).
Responda no chat, por exemplo "F1 a, F2 b…".

## Bloqueantes do PR-2

**F1 — Assinatura do webhook: o `data.id` vai para minúsculo antes do HMAC?**
O BRIEF manda passar para minúsculo; o SDK oficial assina como chega, e o teste dele cobre esse caso.
- [ ] (a) Seguir o SDK oficial, sem minúsculo — *recomendado*: o SDK é a implementação de referência do MP.
- [ ] (b) Seguir o BRIEF, com minúsculo.
- [ ] (c) Aceitar as duas formas: tenta como chega e, se falhar, tenta em minúsculo.

**F2 — Unidade do `ts` no webhook**
O exemplo da doc e o teste do SDK usam milissegundos, mas o código de tolerância do SDK trata o valor como segundos.
- [ ] (a) Detectar pela grandeza: valor com 13 dígitos = ms, com 10 = s — *recomendado*: aceita os dois sem arriscar recusar todos os webhooks.
- [ ] (b) Milissegundos.
- [ ] (c) Segundos.

**F3 — Quando uma cobrança `CREATING` passa a ser considerada velha?**
- [ ] (a) 10 minutos — *recomendado*: folga sobre o timeout da chamada ao MP.
- [ ] (b) 30 minutos.
- [ ] (c) Outro valor.

**F4 — `expiresAt` quando o prazo é omitido** (o MP define: 3 dias úteis no boleto, 24 h no Pix)
- [ ] (a) Sempre mandar um prazo explícito, calculado por nós com os mesmos padrões do MP — *recomendado*: o campo sai preenchido já no `CREATING`.
- [ ] (b) `expiresAt` opcional no `CREATING`, preenchido com a resposta do MP.

**F5 — Cancelar um título com cobrança ativa** (hoje o `reverseEntry` roda antes da transação, `ReceivableService.ts:352-364`)
- [ ] (a) Checar a cobrança ativa ANTES do `reverseEntry` (409 sem lançar nada) e re-checar dentro da transação — *recomendado*: evita que o estorno fique lançado e só depois venha o 409.
- [ ] (b) Mover o `reverseEntry` para dentro da transação. É uma mudança maior, num código que está em produção.

**F6 — Não há conta MP `ACTIVE` no escopo**
- [ ] (a) 409 `PAYMENT_ACCOUNT_NOT_ACTIVE` — *recomendado*.
- [ ] (b) 400.

**F7 — Policy das rotas de cobrança**
- [ ] (a) Reusar `canManageReceivable` / `canReadReceivable` — *recomendado*: a cobrança é ação sobre o título.
- [ ] (b) Métodos novos `canManageCharge` / `canReadCharge`.

**F8 — Audit da passagem para `CREDENTIAL_INVALID`**
- [ ] (a) eventType novo `payment_account.credential_invalid` — *recomendado*.
- [ ] (b) Sem audit.

**F9 — Pontos menores (aceitar todos os recomendados em bloco?)**
- Erros 409 com nomes `CHARGE_*` (`CHARGE_ALREADY_ACTIVE`, `CHARGE_NOT_CANCELLABLE`…).
- Pode cobrar título em `RECEIVING` ou `PARTIALLY_RECEIVED`, só pelo saldo em aberto.
- `EXPIRED`, `CANCELLED` e `FAILED` são terminais: se o MP depois disser `accredited`, a baixa entra e um alerta de conciliação é aberto.
- `description` enviada ao MP = número do título + nome da empresa, sem dado do cliente.
- O pagador (dado pessoal) não aparece no GET da cobrança, só no detalhe com permissão de gestão.
- [ ] Sim, todos como recomendado.
- [ ] Não, quero decidir item a item.

## Bloqueante do PR-3

**F10 — `manualMatch` ignora a perna da tarifa** (`ReconciliationService.ts:568-575`: só soma os débitos)
No exemplo do BRIEF, a soma dá 10000 contra a linha de 9700, e o confirm com tarifa termina em erro. O BRIEF (P3-10) diz que isso é insumo ausente.
- [ ] (a) Corrigir o `manualMatch` com soma pelo sinal (débito − crédito) numa sessão de correção à parte, antes do PR-3 — *recomendado*.
- [ ] (b) No PR-3, a baixa com tarifa não passa pelo `manualMatch` (caminho próprio).

## Não é fork (só para saber)
O model novo `CollectionCharge` entra no CLI de re-key (`rekeyLegacyUnitCli.ts`) pelo critério F-RK-5. Senão o teste de inventário fica vermelho.
