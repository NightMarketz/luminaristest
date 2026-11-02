---
id: "D-2026-10-30-TRIAGEM-CONTADOR"
tipo: "decisao"
dominio: "externo"
titulo: "Triagem das 22 perguntas abertas ao contador: 21 saem (lei, doc oficial, dono); pedido de 30/10 só com a P-C1"
estado: "decided"
autorizacao: "dono, chat, 2026-10-30: \"triagem das perguntas ao contador e, se sobrar alguma, montagem do pedido — só docs, sem código, sem enviar nada (quem envia sou eu)\" + \"Em vez de pedir a contador pesquisa e decide vc ja consegue\"; questionário (AskUserQuestion) do mesmo dia: A1 → \"Automatizar dez/2026 (Recomendado)\"; P-EF-1 → \"Obrigatório (Recomendado)\"; F-RET-15 → \"Na emissão da NFS-e (Recomendado)\"; fato novo: \"Esse projeto vai pro ar só em 2027 então pode registarar isso\""
atualizado: "2026-10-30"
---
# D-2026-10-30-TRIAGEM-CONTADOR

**Estado:** `decided`. Só docs. Nenhuma decisão aqui é `executa`: o código que ela muda espera o `executa` do nó.

**Fonte:** dossiê [`triagem-contador-2026-10-30`](../../../pesquisas-legais/triagem-contador-2026-10-30/relatorio.md) (§1 tem
a tabela das 22, com a fonte de cada uma). Pedido final: [`PEDIDO-CONTADOR-2026-10-30.md`](../../accounting/PEDIDO-CONTADOR-2026-10-30.md).

## Contagem

| Saída | Qtde | Itens |
|---|---|---|
| (a) a lei ou norma responde | 12 | III-4, III-7a, III-8, III-10, P-ISS-1, P-ISS-2, P-ISS-3, P-EF-11, F-RET-15 (natureza), P-PT-1, P-PT-3, A1 (leitura) |
| (b) documento oficial responde | 2 | III-9 (guia RFB, IN 2.055 art. 28), P-RET-9 (manual e FAQ da Reinf) |
| (c) decisão de produto | 6 | já decididas antes: P-EF-7, P-EF-12, P-PT-2 (F-PT-4 a), A2 (F-CX-2 c), A3 (16/10); decidida em 30/10: P-EF-1. Também foi perguntado em 30/10 o lado de produto da A1 e da F-RET-15 (abaixo) |
| não é pergunta ao contador (gate do dono) | 1 | P-C5 |
| (d) só o contador responde | 1 | P-C1 |

## Respostas do dono em 30/10

| # | Pergunta | Resposta | Efeito |
|---|---|---|---|
| 1 | [[X14-CAIXA]] A1: receita de 2026 não recebida → PGDAS-D de dez/2026 (Res. CGSN 140 art. 20 II b) | **Automatizar dez/2026**, revertendo a D-6 (a) de 10/10 | **Sem efeito prático:** o produto vai ao ar só em 2027 (fato novo do mesmo dia) e o caixa acaba em 31/12/2026. Não se abre `executa`. Se um cliente importar 2026 para apurar, a decisão já está tomada |
| 2 | [[EFICIENCIA-FISCAL]] P-EF-1: prova de custo no modo CARGA | **Documento obrigatório** em `ServiceCostEvidence.sourceDocumentId` (NF de compra ou ficha de custo) | entra no item 5 do BRIEF EF; base: DL 1.598 art. 9º § 1º |
| 3 | [[RETENCOES-FONTE]] F-RET-15: quando lançar a dedução do ISS retido | **Na emissão da NFS-e com ISS retido** (D "ISS sobre serviços" × C "ISS retido a receber do tomador"); o recebimento só baixa | **emenda** ao item 25 do BRIEF de retenções (PR-3/PR-4), que lançava no recebimento; base: Lei 6.404 art. 177 (competência) e DL 1.598 art. 12 § 1º III |

## Fato novo: go-live em 2027

Dono, chat, 30/10: "Esse projeto vai pro ar só em 2027". Regra que vale só até 31/12/2026 não tem cliente real. Por isso
A1, A2 e A3 saem sem código. Isso vale para o resto do [[X14-CAIXA]]: o nó já está `done` e não pede mais nada.

## Confirmações de 10/10 sem assinatura

A III-4, a III-7a, a III-8, a III-9 e a III-10 (CST 02) estavam com grau "fonte secundária" e esperavam a assinatura do
contador (TRIAGEM-RESPOSTA-CONTADOR-2026-10-10 §5). Agora estão **conferidas em fonte primária**, e a assinatura não é mais
pedida. Duas ressalvas entraram no registro:
- **III-8:** a dispensa de R$ 10 da Lei 9.430 art. 67 é da PF. Na PJ o IRRF pequeno se acumula até o DARF de R$ 10 (já no
  código, #902).
- **III-9:** no trimestral, o PER/DCOMP feito antes de fechar o ano não exige a ECF [D11].

## Achado lateral: emissão do MEI para consumidor PF em 2027 (conferido 30/10)

Dono, chat, 30/10: "Sim, confere aqui". Em 2027 a LC 214 art. 517 e a Res. CGSN 190 passam a obrigar o documento fiscal
em toda venda do MEI, e a **Res. CGSN 195/2026 (art. 106-C)** deixa a DASN-Simei valer como documento na venda a consumidor
PF. O MEI segue sem precisar de NFS-e por venda a PF, e a NFS-e continua obrigatória para tomador CNPJ. O produto já faz
isso (`SimplesApuracaoService.ts:1028`). Falta só atualizar a base legal do comentário (art. 106-C) no próximo PR que tocar o
arquivo. Detalhe: dossiê `triagem-contador-2026-10-30` §6 e o adendo do dossiê `emissao-mei-me-por-tipo`. Não muda
[[D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO]].

Não autoriza merge fora da regra de classe de risco ([[D-2026-10-28-FLUXO-AUTONOMO]]).
