# PEDIDO AO JURÍDICO — validade do pacote pré-pago (PE-6) — 2026-10-02

> Rascunho preparado pelo agente. **O dono envia**; o agente não enviou nada.
> Escopo: **só o PE-6** do [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md) §6 (nó
> [[PACOTE-VALIDADE]]). As perguntas contábeis e fiscais (PE-1..PE-5) vão ao contador:
> [`PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md`](PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md).
>
> **Por que isto agora:** em 02/10 o dono decidiu que os saldos vendidos **antes** da regra também ganham prazo
> (backfill, F-PV-3 b), que esse backfill é um job no boot, e que **o incremento só vai a produção depois deste parecer**.
> Ou seja, o PE-6 é **pré-condição do deploy**, e com ele do backfill (registro:
> [`D-2026-10-02-PACOTE-VALIDADE-FORKS`](../plano/decisoes/D-2026-10-02-PACOTE-VALIDADE-FORKS.md)).

---

## Texto para enviar

> Olá, [nome],
>
> Preciso de um parecer sobre **prazo de validade em pacote pré-pago de serviços** (salão de beleza; consumidor
> pessoa física). Como funciona: o cliente compra um crédito, por exemplo R$ 500, e vai usando em serviços. A partir de
> agora, o pacote passa a ter prazo (por exemplo, 90 dias). **Quando o prazo vence, o saldo que sobrou deixa de valer e
> fica com o salão** (vira receita). O sistema mostra a validade na consulta do saldo. Ainda não existe aviso ativo
> (e-mail/WhatsApp) antes de vencer.
>
> Duas decisões já tomadas aumentam o risco e dependem do seu parecer **antes de entrar em produção**:
> - os **saldos vendidos antes** da regra também vão ganhar prazo, contado a partir do dia em que a regra entrar
>   (o cliente que já comprou recebe o prazo inteiro a partir dali, mas comprou sem prazo informado);
> - o saldo vencido fica **100%** com o salão.
>
> Perguntas:
>
> 1. **A cláusula de validade é válida** em serviço pré-pago para consumidor? Há **prazo mínimo**?
> 2. **Saldos antigos:** podemos aplicar prazo a quem comprou **sem** prazo informado, desde que o prazo conte da data
>    em que a regra entrar e o cliente seja avisado? Ou esses saldos têm de ficar sem validade? (CDC art. 46; TJDFT,
>    Acórdão 1992212.)
> 3. **Perda integral:** o STJ julga abusiva a perda integral do valor pago antecipadamente quando o consumidor desiste
>    (REsp 1.321.655; retenção de até 20% no REsp 1.580.278). O vencimento com 100% retido se enquadra nisso? Precisamos
>    devolver parte, ou limitar a retenção?
> 4. **Como informar na compra:** o que basta? Destaque no comprovante/contrato (CDC art. 54 § 4º)? Aceite expresso?
> 5. **Aviso antes de vencer:** é obrigatório avisar o cliente (e-mail/WhatsApp) antes do vencimento, ou basta a
>    validade estar visível na consulta do saldo?
> 6. **Contagem do prazo:** contamos em dias corridos (venda 01/03 + 30 dias = vale até 31/03). Se o último dia cair em
>    feriado, o Código Civil (art. 132 § 1º) empurra para o dia útil seguinte, "salvo disposição convencional em
>    contrário". Uma cláusula "validade em dias corridos" afasta isso? Ou precisamos tratar feriados?
>
> Se ajudar: não achei lei específica sobre pacote de salão que vence; os precedentes que encontrei são análogos
> (vale-presente, desistência de serviço pago antecipado). Posso mandar a pesquisa.
>
> Obrigado!

---

## Itens pedidos — critério de aceite INTERNO (não vai no texto)

Fonte: BRIEF §6 (PE-6), §5.1 e §5.2; [pesquisa legal](PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md) §6;
[jurisprudência](PESQUISA-JURISPRUDENCIA-PACOTE-VALIDADE-2026-09-29.md) §6.

| # | Pergunta | Critério de aceite interno | O que a resposta move |
|---|---|---|---|
| 1 | Validade da cláusula; prazo mínimo | Sim/não + prazo mínimo (ou "não há") | **não** → o nó inteiro volta ao dono (a decisão 18 de 29/09 depende disto) |
| 2 | Backfill dos saldos antigos | Pode / não pode / pode com condição nomeada | **não pode** → crítica contra o F-PV-3 (b), ratificado contra a recomendação; fork reaberto ao dono. **Com condição** (ex.: aviso prévio) → requisito novo, fork ao dono |
| 3 | Retenção de 100% | Pode reter 100% / limite (%) | **limite** → muda o lançamento do item 13 (parte vira devolução, não receita); fork ao dono |
| 4 | Como informar na compra | Requisito nomeado (texto, destaque, aceite) | Pré-requisito do nó de FE vizinho (BRIEF §8, F-PV-11) |
| 5 | Aviso ativo obrigatório | Sim/não | **sim** → F-PV-11 (b) vira obrigatório; canal de saída não existe (frente nova, §8) |
| 6 | Dias corridos × feriado | Cláusula basta / precisa calendário | **precisa calendário** → reabre o sub-ponto do F-PV-1 |

**Gate:** enquanto este pedido não tiver resposta triada, o incremento PACOTE-VALIDADE **não vai a produção** (decisão
do dono, 02/10). O código pode ser construído e testado; o deploy espera.

## O que NÃO estamos pedindo

- Tratamento contábil, ISS, Simples, IBS/CBS: é do contador (PE-1..PE-5).
- Revisão do contrato-modelo inteiro: só a cláusula de validade.

## Quando a resposta chegar

Chame o agente com "triagem da resposta do jurídico". Cada item vira **dado**, **crítica** (fork ao dono) ou
**confirmação**. O parecer não é sign-off do incremento: ele destrava o deploy na nota de decisão quando a triagem o
registrar.
