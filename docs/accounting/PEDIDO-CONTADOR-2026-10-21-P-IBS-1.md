# PEDIDO AO CONTADOR — 2026-10-21 (P-IBS-1, urgente: prazo 01/01/2027)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> Pedido do dono (chat, 21/10): "monta o pedido da P-IBS-1 ao contador".
> **Mesma pergunta que a nº 1 do [`PEDIDO-CONTADOR-2026-10-17-AMBIGUIDADES.md`](PEDIDO-CONTADOR-2026-10-17-AMBIGUIDADES.md)
> (A2), que não foi enviado.** Se o pacote de 17/10 for junto, mande só ele com o pedido de urgência abaixo — não pergunte
> duas vezes.

---

## Mensagem ao contador

Olá, [nome do contador],

Uma pergunta com prazo — precisamos da sua leitura **até [data, sugestão: 15/12/2026]**, porque define como o sistema
trata o IBS/CBS a partir de janeiro:

**IBS/CBS em 2026, empresas do Lucro Presumido e do Lucro Real.** A LC 214/2025, art. 348 § 1º, dispensa o recolhimento do
IBS (0,1%) e da CBS (0,9%) de 2026 para quem cumprir as obrigações acessórias. Para ficar dispensado, **basta emitir a
NFS-e/NF-e com o grupo IBS/CBS preenchido** (CST e cClassTrib), ou há **outra obrigação acessória** a cumprir em 2026 (por
exemplo, alguma declaração ou apuração)? Se houver, qual e com que prazo?

Basta "basta a nota" ou "não basta, falta X", com a base se tiver.

Obrigado!

---

## Interno (não vai na mensagem)

| Item | Resposta esperada | Critério de aceite nosso | O que destrava |
|---|---|---|---|
| P-IBS-1 (= A2) | "basta a nota" **ou** "não basta: obrigação X, prazo Y" | resposta com a obrigação nomeada (ou explícito "nenhuma outra"); citação de norma conferida no acervo/fonte oficial antes de virar registro (memória "pesquisa colada: conferir citações") | **"basta":** F-IBS-7 (b) fica de pé; registro "confirma, nada muda" na cédula [[D-2026-10-21-FORKS-IBS-CBS-2027]]; o `executa` do PR-2 cita esta resposta (F-IBS-13 a). **"não basta":** o F-IBS-7 volta ao dono **antes** do PR-2 (F-IBS-13 a), com a obrigação X como insumo |

- **Prazo interno:** sem resposta até ~15/12/2026, o PR-2 não recebe `executa` sem nova decisão do dono (F-IBS-13 a).
- **Base legal já lida:** LC 214 art. 348 § 1º — dossiê `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs` [D08]
  (Planalto compilado) e dossiê de 17/10 [D09]. A resposta do contador não substitui essa leitura; resolve a ambiguidade.
- **Sem anexo, sem PII:** a pergunta não pede documento.

**Não estamos pedindo agora:** P-IBS-2 (cClassTrib/cst + uso/consumo), P-IBS-3 (pacote pré-pago), P-IBS-4 (classe contábil) —
vão no próximo pacote do [[D1]]; nenhum trava 01/01/2027 (PR-1/PR-2 usam DRAFT/provisório).

**Quando a resposta chegar:** "triagem do que o contador mandou".
