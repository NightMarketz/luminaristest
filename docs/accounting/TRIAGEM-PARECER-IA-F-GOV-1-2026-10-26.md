# TRIAGEM — parecer colado sobre a consulta CRC-SP v2 (F-GOV-1) — 2026-10-26

> O dono colou no chat em 26/10 um "parecer jurídico" sobre as 2 perguntas da v2
> ([`CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md`](CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md)).
> **Natureza:** texto gerado por IA. Os links trazem `utm_source=chatgpt.com`, e o próprio texto diz que "não constitui
> parecer jurídico vinculante". **Não é a resposta do CRC-SP e não substitui o envio da v2.** É uma pista, e cada
> citação dele foi conferida na fonte oficial. Dossiê:
> [`pesquisas-legais/triagem-parecer-ia-crc-sp/relatorio.md`](../../pesquisas-legais/triagem-parecer-ia-crc-sp/relatorio.md).

## 1. As citações conferem?

O parecer usou LegisWeb e um PDF do CRC-RJ. Conferi tudo nos PDFs do SRE do CFC. Os SHA-256 são os mesmos do dossiê
`verif-2026-10-17-contabil-lacunas`: ITG 2000 (R1) `6b4355f83fb7`, Res. 1.590 `ecaa931e8404`, NBC PG 01 `cb3ca0a1aca8`.

| Citação do parecer | Confere? |
|---|---|
| NBC PG 01 item 5 (c): não assinar o que está fora da "orientação, supervisão ou revisão" | sim, literal |
| NBC PG 01 item 10: parte do serviço pelo tomador, "explicitado na proposta e no contrato" | sim, literal |
| Res. CFC 1.590/2020 art. 2º "c" (cláusula dos serviços do contratante) e art. 4º (a proposta diz a parte do contratante) | sim |
| Res. 1.590 art. 6º: distrato obrigatório "com o estabelecimento da cessação das responsabilidades" | sim, literal |
| Res. 1.590 art. 9º p.ú.: o rescindente elabora as demonstrações do seu período, salvo distrato | sim. O caput do art. 9º trata de devolução de livros, e o parecer cita certo o parágrafo único |
| Res. 1.590 art. 10: obrigações acessórias do período do contrato ficam com o rescindente | sim, literal |
| ITG 2000 (R1) itens 31–35: retificação por estorno, transferência ou complementação | sim |
| ITG 2000 (R1) item 32: o histórico deve precisar "o motivo da retificação, a data e a localização do lançamento de origem" | sim, literal |
| ITG 2000 (R1) item 36: lançamento fora da época consigna "as datas efetivas das ocorrências e a razão do registro extemporâneo" | sim, literal. **Isso fecha a lacuna da diretriz do dono de 10/10**, que citava o item 36 sem conferência |
| FAQ da RFB sobre o prazo de substituição da ECD | **não conferido.** O link aponta para a FAQ da ECF; fica como pista |

Nenhuma citação errada. A única não conferida é a da RFB, que não sustenta conclusão nenhuma aqui.

## 2. O que o parecer conclui, e se bate com o que já temos

| Ponto | Parecer | Nossa posição | Efeito |
|---|---|---|---|
| Q1: contador assina o que o cliente registrou | Defensável, se a revisão for efetiva e o contrato disser o que o cliente faz | Igual à leitura do BRIEF GOV-CONTADOR (F-GOV-7 a+, F-GOV-8 a) | confirmação |
| Q2 (a): o sistema precisa bloquear a reabertura? | Não achou norma que obrigue | Igual ao F-GOV-11 (a) | confirmação (não vinculante) |
| Q2 (a): todo ajuste vira extemporâneo na competência atual? | **Não como regra universal**: depende do tipo de correção (estorno/complementação × extemporâneo × substituição da ECD) | A diretriz do dono de 10/10 dizia "todo ajuste [...] entra como lançamento extemporâneo na competência atual" | **ressalva à diretriz de 10/10**, que só vale se o CRC-SP mandar travar. Se isso acontecer, o desenho da trava precisa distinguir os três casos |
| Q2 (b): situação do contador anterior | A alteração posterior não passa a ser dele, e o trabalho que ele fez continua dele | Sem posição anterior | registro |
| Salvaguarda central | Reabrir pode; o que não pode é **apresentar a versão alterada como aprovada pelo contador anterior** | ver §3 | medido |

## 3. A salvaguarda central já existe no código? (medido em `9137c939`)

| Requisito do parecer | Situação | Evidência |
|---|---|---|
| A aprovação fica presa à versão examinada | **verificado** | `AccountingReview` aponta para um par exato `ecdJobId`/`ecfJobId` (`@@unique`), e o job guarda o `sha256` do artefato (`server/prisma/schema.prisma`, models `AccountingReview` e `AccountingDataExchangeJob`) |
| Uma versão nova não herda a aprovação antiga | **verificado** | A entrega exige `SIGNED_OFF` do **mesmo par** (`AccountingReviewService.assertPairSignedOff`). Uma ECD regerada depois da reabertura é outro job e precisa de nova revisão. `SIGNED_OFF` é terminal e não tem DELETE (`models/ledgerStatus.ts:22`) |
| Achado resolvido depois da geração bloqueia o sign-off | **verificado** | `signOff` → `staleFindings` → 409 `REVIEW_STALE` (`AccountingReviewService.ts:412`) |
| O lançamento original não é apagado; a correção referencia a origem | **inferido** | Posted/reversed são imutáveis e a correção é por estorno com `reversedById` (`PostingService.ts:72`, schema `JournalEntry.reversedById`). A edição de linhas de lançamento postado não aparece nos `updateMany`/`casUpdate` do repositório, que mexem em status, aprovação e hash. Não rodei teste que prove isso |
| ITG 32: o histórico do estorno precisa o **motivo**, a **data** e a localização da origem | **lacuna** | `PostingService.ts:617`: `description: input.reason ? \`Estorno de ${id} — ${reason}\` : \`Estorno de ${id}\``. O motivo é **opcional** e a **data** do lançamento de origem não vai para o histórico. Só a localização (o id) está sempre lá |
| ITG 36: um lançamento extemporâneo num período reaberto consigna a data efetiva e a razão | **não medido / provável lacuna** | Não achei gate que exija histórico de extemporâneo quando se lança num período reaberto. Precisa de instrumentação |
| A tela não mostra como "revisado" um período alterado depois da revisão | **não medido** | A revisão é por ano e por par de jobs, não por período. Falta conferir o que a tela mostra |

**Conclusão:** a salvaguarda central (não apresentar uma versão alterada como aprovada) **já está no desenho**, porque a
aprovação está presa ao arquivo. O parecer abre duas lacunas de ITG 2000 que valem com ou sem a consulta: o histórico do
estorno (item 32) e o do lançamento extemporâneo (item 36). As duas são código e precisam de autorização do dono
(instrumentação → correção).

## 4. O que muda

- **O envio da v2 continua.** O parecer não é vinculante e o dono já decidiu enviar.
- **A diretriz de 10/10 para a pergunta 2** ganha uma ressalva: se o CRC-SP mandar travar, a trava não pode jogar toda
  correção na competência atual. Estorno e complementação (ITG 31–35), extemporâneo (item 36) e substituição da ECD são
  caminhos diferentes. Isso fica para a triagem da resposta do CRC-SP.
- **Lacunas novas:** ITG 32 (motivo opcional e data de origem fora do histórico do estorno) e ITG 36 (sem exigência de
  histórico de extemporâneo). Ficam para o dono autorizar.
- **Contrato-modelo:** o parecer lista 6 cláusulas mínimas (§1.3 dele). Elas servem de checklist para o contrato com o
  contador parceiro, que continua sendo do dono com o contador.
