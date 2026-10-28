# DECISÃO PENDENTE — F-GOV-1 / A7: fechar o gate sem o CRC-SP? e a trava "com contador incluso" — 2026-10-25

> **DECIDIDO 25/10/2026** — dono, chat: "Aprovo Q1 (c) e Q2 (c) do DECISAO-F-GOV-1-GATE-E-TRAVA-2026-10-25. Lê a Res.
> 1.555, a NBC PG 01 e as alterações da Res. 1.640 e aplica o fold." Leituras feitas (§6); fold aplicado no
> [[GOV-CONTADOR]] (Fold 25/10 (2)). Nada foi enviado ao CRC-SP.
>
> Preparado pelo agente para o dono decidir.
> Nó: [[GOV-CONTADOR]] (fork F-GOV-1) · fila: A7 de `docs/plano/FILA-ORDEM.md` · decisão anterior: Q4 de
> [`D-2026-10-10-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-10-QUESTIONARIO-DONO.md) (enviar a consulta; não vender
> "com contador incluso" até a resposta).
> Base: [`CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md`](CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md) (perguntas 1–5 e critério de
> aceite interno) e o dossiê `pesquisas-legais/consulta-crc-sp-itg2000-dl9295/` (D01 Lei 12.249, D02 DL 9.295, D03 Res. CFC
> 1.640/2021, D04 Res. CFC 1.590/2020). **O dossiê e o fold 25/10 estão só no worktree `cool-bun-b66805`, sem commit.**

## 0. Correção de um fato dado como verificado

A premissa "ambiguidade material sobre técnicos" **não se sustenta no texto da Res. CFC 1.640/2021** [D03]:

- Art. 3º, *caput*: "São atribuições privativas dos profissionais da contabilidade" — a privatividade é do
  profissional (contador **e** técnico, art. 2º) frente ao leigo.
- Art. 3º, **§ 1º**: "São atribuições privativas dos contadores [...] as enunciadas neste artigo, sob os incisos I, II, III,
  IV, VII, XVI, **XX**, XXI, XXII, XXIII, XXVII, XXVIII e XXXI." O **inciso VIII (escrituração) não está na lista**.
- Art. 3º, XX: "revisões de quaisquer demonstrações [...] ou de registros contábeis" — **está** na lista do § 1º.

Leitura: o técnico pode escriturar; a **revisão** de registros e demonstrações é privativa do contador (coerente com o
DL 9.295, art. 26 c/c art. 25 "c" [D02]). Grau: **verificado** no texto lido, com um alerta aberto — D03 é a
**publicação original** do DOU; alterações posteriores da Res. 1.640 não foram conferidas.

A ambiguidade que sobra no art. 3º, VIII, é outra e é **material** (ver §3, item 1): "procedimento executado
exclusivamente pelo profissional da contabilidade" contra o desenho em que o operador leigo do cliente registra a
operação e o software gera o lançamento.

## 1. Questão 1 — o gate F-GOV-1 pode fechar sem resposta do CRC-SP?

Hoje a consulta diz: "O F-GOV-1 só sai de 'do dono, fora do código' quando a triagem registrar a resposta." A consulta
não foi enviada; a decisão de enviar tem 15 dias (10/10) e o órgão não tem prazo de resposta.

| Opção | Consequência | Risco residual | Custo de errar |
|---|---|---|---|
| **(a)** Manter: fecha só com a resposta | Gate segue aberto sem data; A7 continua contando como oráculo externo aberto (a regra ⛔ do CLAUDE.md segue travada por ele) | Nenhum novo | Baixo em lei; alto em tempo — a oferta comercial fica parada por prazo que ninguém controla |
| **(b)** Fechar agora com risco residual, como está | Gate fecha; consulta vira opcional | 3 normas citadas no desenho **não lidas** no texto oficial (Res. CFC 1.555/2018, NBC PG 01, alterações da Res. 1.640) + as ambiguidades do §3 | Médio: fecharia sobre leitura incompleta — o que a Res. 1.555 disser sobre organização contábil pode mudar a resposta da Questão 2 |
| **(c)** Fechar em 2 passos: o agente lê no texto oficial os 3 itens não lidos; o gate fecha com o risco residual escrito, e a consulta, reduzida às perguntas do §3, fica a critério do dono | Gate fecha em dias, não em meses; o critério de fechamento passa a ser "norma lida + decisão registrada + risco nomeado" | Só as ambiguidades do §3, que nenhum texto resolve | Baixo-médio: se o CRC-SP depois discordar, o efeito cai na oferta comercial e no contador, não no código (o código nunca dependeu do F-GOV-1 — autorização de 03/10 no nó) |

**Recomendação: (c).** Fundamento:
- O que a consulta pergunta já está, em boa parte, respondido no texto: categoria (Q4) pela Res. 1.640, art. 3º, § 1º e XX
  [D03] + DL 9.295, arts. 25 "c" e 26 [D02] — **verificado**; contrato escrito e período do rescindente (Q3) pela Res. 1.590,
  art. 1º, parágrafo único, art. 9º, parágrafo único, e art. 10 [D04] — **verificado**; assinatura com categoria e CRC pela
  Res. 1.640, art. 4º [D03] e DL 9.295, art. 20, parágrafo único [D02] — **verificado**.
- Reabertura de período revisado: nenhuma norma examinada proíbe nem autoriza; ITG 2000 (R1), item 36, exige histórico
  com datas efetivas e razão do registro extemporâneo e **não veda reabertura** — **inferido** (texto de fonte
  secundária; o PDF do CFC não foi lido). É decisão de arquitetura, já tomada (F-GOV-10 a, F-GOV-11 a) com o risco
  escrito no BRIEF §5.3.
- O que falta ler (Res. 1.555/2018, NBC PG 01, alterações da Res. 1.640) é leitura de norma pelo método
  `VERIFICACAO-LEGAL.md`, não aparato de auditoria.

## 2. Questão 2 — a trava "com contador incluso"

| Opção | Consequência | Risco residual | Custo de errar |
|---|---|---|---|
| **(a)** Manter suspensa até a resposta do CRC-SP | Nenhuma venda com essa promessa até data incerta | Nenhum | Comercial: a oferta fica parada; sem efeito regulatório |
| **(b)** O dono assume por escrito e libera "com contador incluso" como está (Luminaris indica o contador e o pacote vem junto) | Venda liberada | Ambiguidades 1 e 2 do §3: se o CRC-SP entender que a Luminaris presta serviço contábil, ela teria de se registrar como organização contábil (Res. 1.555 **não lida**); se entender que o lançamento gerado pelo software a partir do operador leigo fere o art. 3º, VIII, o contador que assina fica exposto a infração (Res. 1.590, art. 11, remete ao DL 9.295, art. 27 "c" e "g" [D04]) | Alto: o custo cai sobre o contador parceiro (processo ético) e sobre a Luminaris (fiscalização, revisão do modelo de venda e dos contratos já firmados) |
| **(c)** Liberar uma forma restrita e manter a trava só no "incluso" empacotado: o cliente contrata o contador **diretamente**, por contrato escrito próprio (Res. 1.590, art. 1º), o contador **revisa** e assina com categoria e CRC (Res. 1.640, arts. 3º XX e 4º); a Luminaris pode indicar, mas não vende o serviço contábil | Vende-se "contador parceiro, contratado por você"; "com contador incluso" segue suspenso até os passos da Questão 1 (c) e, se o dono quiser, a resposta do CRC-SP | Ambiguidade 1 do §3 continua (vale para qualquer ERP com contador revisor); ambiguidade 2 fica bem menor, porque a Luminaris não contrata nem cobra o serviço | Baixo-médio: se o CRC-SP disser que indicar já basta para exigir registro, o ajuste é parar de indicar, não desfazer contratos de serviço contábil |

**Recomendação: (c), assumida por escrito pelo dono na forma restrita; o "incluso" empacotado segue suspenso.**
Grau: a base de cada condição é **verificada** (artigos acima); a conclusão de que o contrato direto reduz o risco de
registro de organização contábil é **inferida** — depende da Res. 1.555/2018, que não foi lida.

Ponto independente do CRC-SP: o contador de 23/09 condicionou a assinatura a "trava de período só ele reabre"
([[Z0-a]]); o F-GOV-11 (a) permite ao dono, encerrada a atribuição, reabrir períodos que o contador cobriu. Qualquer
opção que libere venda com contador exige que **o contador aceite esse desenho** (ou o dono reabra o F-GOV-11). Isso
não é lei; é condição do parceiro.

## 3. Ambiguidades que bloqueiam decisão (só as materiais)

1. **Res. CFC 1.640/2021, art. 3º, VIII** — escrituração "executada exclusivamente pelo profissional da contabilidade".
   Leitura A: o profissional responde pela escrituração, e o lançamento gerado pelo software a partir do registro do
   operador, revisado e assinado por ele, cabe aí. Leitura B: o próprio ato de escriturar não pode ser de leigo nem
   automático sem o profissional. O texto não define "executado". A leitura A é a da prática de mercado (ERP + contador),
   mas nenhuma norma lida a confirma. **Bloqueia:** a opção (b) da Questão 2.
2. **Registro de organização contábil** quando a Luminaris indica ou empacota o contador (Res. CFC 1.555/2018, **não
   lida**). **Bloqueia:** a opção (b) da Questão 2; pode ser reduzida a leitura no passo 1 de (c).
3. *(Não bloqueia lei, bloqueia o parceiro)* reabertura pelo dono após encerrar a atribuição (F-GOV-11 a) × condição do
   contador de 23/09. Nenhuma norma examinada resolve; Res. 1.590, art. 9º, parágrafo único, só diz que o rescindente
   elabora as demonstrações do seu período.

Fora da lista por não serem materiais: valor do aceite interno × e-CPF no PVA (Q5 — o BRIEF já trata como atestado
interno); ITG 2000 item 32; página do Manual ECD (já tirada da consulta); categoria do técnico (resolvida no §0).

**Pergunta exata ao CRC-SP, se o dono quiser enviar** (reduz a consulta atual às duas ambiguidades legais):

> 1. A Resolução CFC 1.640/2021, art. 3º, VIII, qualifica a escrituração como procedimento "executado exclusivamente
>    pelo profissional da contabilidade". Atende a essa regra o arranjo em que o operador do cliente registra as
>    operações, um software gera os lançamentos e um contador registrado no CRC, com contrato escrito, revisa e assina a
>    escrituração e as demonstrações?
> 2. Uma empresa de software que indica ao seu cliente um contador registrado — sem contratar nem cobrar o serviço
>    contábil, que é contratado diretamente pelo cliente — precisa de registro como organização contábil? E se o serviço
>    do contador for vendido junto com a assinatura do software?

## 4. Fold proposto para o GOV-CONTADOR (o dono aprova ou recusa)

> ## Fold 25/10 (2) — decisão do F-GOV-1 / A7
>
> - **Gate:** critério de fechamento muda de "resposta do CRC-SP" para "norma lida + decisão registrada + risco
>   nomeado" (opção c de `DECISAO-F-GOV-1-GATE-E-TRAVA-2026-10-25.md`). Antes de fechar, o agente lê no texto oficial a
>   Res. CFC 1.555/2018, a NBC PG 01 e as alterações da Res. CFC 1.640/2021.
> - **Categoria:** resolvida no texto — Res. CFC 1.640/2021, art. 3º, § 1º: escrituração (VIII) não é privativa de
>   contador; revisão de registros (XX) é. O técnico pode escriturar; só o contador revisa.
> - **Trava comercial:** "contador parceiro, contratado pelo cliente" liberado sob responsabilidade escrita do dono
>   (contrato direto, Res. CFC 1.590/2020, art. 1º; revisão e assinatura do contador, Res. CFC 1.640/2021, arts. 3º XX e
>   4º). **"Com contador incluso" (empacotado) segue suspenso.**
> - **Risco residual aceito:** art. 3º, VIII, da Res. 1.640 (escrituração gerada por software) sem leitura oficial que o
>   resolva; reabertura pelo dono (F-GOV-11 a) sem aceite do contador.
> - **Consulta ao CRC-SP:** opcional; se enviada, só as 2 perguntas do §3 do documento de decisão.
> - Autorização: _dono, chat, data — a preencher pelo dono_.

## 5. Caso adversarial tentado

Tentei derrubar a recomendação (c) da Questão 1 com a leitura B do art. 3º, VIII: se ela valer, o produto inteiro (não
só o "incluso") estaria fora da norma, e fechar o gate seria esconder isso. Resultado: a leitura B atinge qualquer ERP
com contador revisor, e não muda com a resposta do CRC-SP chegar ou não — muda o que se vende. Por isso (c) fecha o gate
e mantém o "incluso" suspenso, e a ambiguidade fica nomeada como risco aceito, não como resolvida.

## 6. Resultado das leituras de 25/10 (passo 1 da opção c)

Dossiê: `pesquisas-legais/f-gov-1-res1555-nbcpg01-res1640/relatorio.md`.

| Item | Resultado | Efeito nesta decisão |
|---|---|---|
| Res. CFC 1.555/2018 | **Revogada** pela Res. CFC 1.708/2023 (CFC SRE). Vigente: 1.708, arts. 1º e 3º § 3º — PJ que explora atividade contábil "em qualquer modalidade" registra-se no CRC; registro só com maioria do capital de profissionais. Alterações (1.717 e 1.726/2024) não tocam nesses artigos. **Verificado.** | A ambiguidade 2 do §3 encolhe: vender o serviço junto exige registro que a Luminaris não obtém (**inferido**) → o "incluso" empacotado segue suspenso. Resta só "indicar sem contratar" × "em qualquer modalidade". |
| NBC PG 01 | Sem alteração desde 2019. Item 5 (c) e item 10 confirmados no texto oficial. **Verificado.** | Forma restrita ganha uma condição: a proposta e o contrato dizem que o cliente registra as operações no sistema (item 10). Ambiguidade 1 atenuada, não resolvida. |
| Res. CFC 1.640/2021 | Em vigor, **sem alteração** (CFC SRE). Art. 3º, VIII e § 1º idênticos no PDF oficial. **Verificado.** | O §0 (técnico escritura, só contador revisa) deixa de ter alerta. |

As perguntas ao CRC-SP do §3 continuam válidas. Na pergunta 2, troque "registro como organização contábil" pela
referência vigente: Res. CFC 1.708/2023, art. 1º.
