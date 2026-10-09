# CONSULTA AO CRC-SP — software × serviço contábil (F-GOV-1) — 2026-10-02

> Rascunho preparado pelo agente. **O dono envia** (consulta formal ao CRC-SP, pelo canal que ele escolher); o agente
> não enviou nada.
> Origem: F-GOV-1 do [`BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md) §1 e §7 (nó
> [[GOV-CONTADOR]]); recomendação do plano: consultar **antes de vender "com contador incluso"**
> ([`PLANO-POS-CONTADOR-2026-09-23.md`](PLANO-POS-CONTADOR-2026-09-23.md) linha 129). Cruza com o gate [[Z0-a]].
> **Ponto a validar pedido pelo dono (02/10):** o efeito do F-GOV-11 (a), em que o dono reabre períodos que o
> contador cobriu ([`D-2026-10-02-GOV-CONTADOR-FORKS`](../plano/decisoes/D-2026-10-02-GOV-CONTADOR-FORKS.md)).
> **Status 10/10/2026:** texto **aprovado pelo dono para envio** ao CRC-SP pelo canal oficial de consultas (Q4 a de
> [`D-2026-10-10-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-10-QUESTIONARIO-DONO.md)). Envio = dono; data de envio
> e protocolo: _a preencher pelo dono_. Trava comercial: "com contador incluso" suspenso até a triagem da resposta.

---

## Texto para enviar

> Prezados,
>
> Somos uma empresa de **software de gestão** para pequenos negócios (salões, clínicas). O sistema faz a escrituração
> a partir das operações do cliente: o operador do cliente registra vendas e despesas, e o sistema gera os
> lançamentos, o fechamento de período e os arquivos da ECD/ECF. Queremos oferecer o produto **"com contador
> incluso"**: um contador com registro no CRC, contratado pelo cliente (ou indicado por nós), revisa e assina.
>
> Pedimos orientação sobre os pontos abaixo.
>
> **1. Onde está a linha entre software e serviço contábil.** Ao gerar lançamentos e demonstrações automaticamente,
> o software (ou a empresa que o fornece) passa a prestar serviço contábil, sujeito a registro de organização
> contábil? Faz diferença se nós indicamos o contador, ou se o contador é contratado pelo cliente?
>
> **2. Contador que assina o que não conduziu.** O contador contratado assina a escrituração que o sistema e o
> operador do cliente produziram, desde que (i) haja contrato escrito, (ii) o contador revise, (iii) a trava do período
> seja dele. Isso atende à NBC PG 01 (item 5c: não assinar o que não passou pela sua orientação, supervisão ou revisão;
> item 10: parte do serviço executada pelo cliente, se o contrato disser)?
>
> **3. Reabertura de período já revisado — ponto central.** No nosso desenho:
> - enquanto há um contador responsável ativo, **só ele** reabre um período fechado;
> - **o empresário pode encerrar a relação com o contador sozinho** (registrando o motivo). Sem contador ativo, o
>   **próprio empresário pode reabrir qualquer período**, inclusive os que o contador anterior revisou e cobriu;
> - um novo contador, quando ativo, também pode reabrir períodos revisados pelo contador anterior;
> - tudo fica registrado em trilha de auditoria (quem encerrou, quem reabriu, quando), mas **o sistema não impede**.
>
> A regra "cada contador responde pelo seu período" (Manual da ECD, leiaute 9, p. 12; Res. CFC 1.590/2020 art. 9º
> parágrafo único e art. 10) ficaria garantida só pelo contrato, pelo distrato e pela assinatura com e-CPF na ECD, e não
> pelo sistema. Perguntamos:
> - (a) Esse desenho é aceitável, do ponto de vista do contador que assina? Ou o sistema deveria **impedir** a
>   reabertura de período coberto por um contador, mesmo pelo empresário, e exigir lançamento extemporâneo (ITG 2000
>   item 36)?
> - (b) Se o empresário reabre e altera um período que o contador revisou, qual é a situação do contador que assinou?
>
> **4. Categoria profissional.** A revisão que o contador faz no sistema é "revisão de escritas" no sentido do
> DL 9.295/1946 art. 25 "c", privativa de contador (art. 26)? Ou um técnico em contabilidade pode fazê-la?
>
> **5. Assinatura dentro do sistema.** O aceite e a assinatura da revisão dentro do sistema (login + declaração de que
> existe contrato escrito) têm algum valor perante o CRC, ou só a assinatura com e-CPF na ECD conta?
>
> Agradecemos a orientação.

---

## Critério de aceite INTERNO (não vai no texto)

| # | Pergunta | Critério | O que a resposta move |
|---|---|---|---|
| 1 | Software × serviço contábil | Resposta nomeada: precisa / não precisa de registro; diferença por quem contrata o contador | **precisa registro** → frente de negócio do dono (não é código); pode reabrir o modelo "com contador incluso" |
| 2 | Assinar o que não conduziu | Atende / não atende / atende com condição nomeada | Confirma ou não a resposta do contador em 23/09 ([[Z0-a]]: "assina sob condições") |
| **3** | **Reabertura pelo dono (F-GOV-11 a + F-GOV-10 a)** | (a) aceitável / sistema deve impedir; (b) situação do contador | **"deve impedir"** → crítica contra o F-GOV-11 (a), ratificado contra a recomendação; fork reaberto ao dono, com o (b) do BRIEF (`responsibleFrom` no aceite) como caminho pronto. Também pode reabrir o F-GOV-10 (BRIEF §7) |
| 4 | Categoria | Contador / técnico também | **só contador** → a atribuição registra a categoria (BRIEF §7); emenda pelo dono |
| 5 | Valor da assinatura interna | Tem valor / só e-CPF | Registro; não muda código (o BRIEF já trata como atestado interno) |

**Tensão já conhecida, para o dono ler antes de enviar:** em 23/09 o próprio contador pôs como condição para assinar a
"trava de período só ele reabre" ([`TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md)
linha 52). O F-GOV-11 (a) + F-GOV-10 (a) deixa o dono encerrar a atribuição e reabrir. A pergunta 3 leva isso ao
CRC-SP. O BRIEF §7 registra também que o contador ainda não revalidou o desenho. Perguntar isso a ele é outro pedido,
e o dono decide se manda.

## Quando a resposta chegar

Chame o agente com "triagem da resposta do CRC-SP". A resposta é dado externo, não sign-off: cada ponto vira
confirmação, crítica (fork ao dono) ou frente de negócio. O F-GOV-1 só sai de "do dono, fora do código" quando a
triagem registrar a resposta.

**Diretriz do dono para a pergunta 3 (10/10, chat):** se o CRC-SP disser que a reabertura pelo dono fere a
responsabilidade técnica do contador, o sistema passa a **proibir a reabertura** (trava definitiva) e todo ajuste de
período encerrado entra como **lançamento extemporâneo** na competência atual, com o período de origem no histórico.
O dono citou o item 36 da ITG 2000 como base; **não conferido na fonte** pelo agente. Os nós afetados seriam
F-GOV-10 e F-GOV-11, reabertos ao dono na triagem.
