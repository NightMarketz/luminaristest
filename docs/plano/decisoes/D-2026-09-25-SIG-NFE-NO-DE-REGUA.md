---
id: "D-2026-09-25-SIG-NFE-NO-DE-REGUA"
tipo: "decisao"
dominio: "fiscal"
titulo: "Critério de contagem: SIG-NFE e ITEM-DESTINATION são nós de régua, não crescimento"
estado: "decided"
autorizacao: "dono, 2026-09-25, em sessão: \"SIG-NFE deveria ser nó de régua, ajusta\" + \"ITEM-DESTINATION também vira nó de régua\""
atualizado: "2026-09-25"
---
# D-2026-09-25-SIG-NFE-NO-DE-REGUA — SIG-NFE é nó de régua

**Estado:** `decided`
**Autorização:** dono, 2026-09-25, em sessão: *"SIG-NFE deveria ser nó de régua, ajusta"*

## A decisão

A verificação de assinatura (XMLDSig) do XML de NF-e importado ([[SIG-NFE]]) entra na régua como **nó
próprio do domínio fiscal** — `tipo: "regua"`. Não é crescimento do nó de NF-e ([[FIS-08]]).

**Efeito na contagem:** fiscal **10/17 → 10/18**, total **48/58 → 48/59**. O numerador não muda (o nó nasce
`planned`).

## Por que era pergunta

A sessão que criou a nota (25/09, migração da fila pós-contador para o vault) a abriu como `tipo: "subno"`,
seguindo o precedente de contagem que tratou tela e correção de comportamento como **crescimento** do nó
existente (`fecha_regua=false` do [[X6]], tela do e-Lalur, tela do F7). O dono decidiu o contrário para este
caso, e a razão registrada distingue os dois grupos:

- **crescimento** = mais superfície sobre um comportamento que já existe e já foi provado (uma tela para uma
  rota que existe, um aviso a mais num diagnóstico);
- **nó de régua** = capacidade que **não existe** e cuja ausência é lacuna de integridade — hoje o import
  aceita XML com assinatura adulterada (medido em 23/09, V2: nenhum `Signature`/xmldsig em `server/src`).

## Consequência operacional

- O denominador da régua fiscal sobe para 18; nenhum fold anterior precisa ser recontado (nós de régua
  já existentes não mudaram).
- `SIG-NFE` continua **sem autorização de execução** (`autorizacao` vazia ⇒ não roteia, ORCH-006): o plano
  pede "instrumenta a assinatura" e depois a resposta ao fork **F-SIG-1**.
- Precedente a citar em contagem futura: lacuna de integridade/segurança sem capacidade no código = nó,
  não crescimento.

---

## EMENDA — mesma data, 2ª aplicação do critério: [[ITEM-DESTINATION]]

**Autorização:** dono, 2026-09-25, em sessão: *"ITEM-DESTINATION também vira nó de régua"*.

Destinação por item na entrada (revenda × insumo do serviço) passa de `subno` a **`tipo: "regua"`** no domínio
fiscal, pelo mesmo critério da seção acima: é **capacidade que não existe** — hoje não há como dizer, por item
de uma nota de entrada, se ele é revenda ou insumo do serviço, e é essa distinção que decide estoque, crédito
de PIS/COFINS ([[X6]]) e ICMS de uso e consumo. Não é superfície nova sobre comportamento já provado.

**Efeito na contagem:** fiscal **10/18 → 10/19**, total **48/59 → 48/60**. Numerador inalterado.

O nó continua **sem autorização de execução** e com dependência externa aberta: espera o item **0.8(e)** do
follow-up ao contador ([[D1]], [[ENVIO-PEDIDO-CONTADOR]]) — por isso **não** aparece em "Destravados agora".

## O que ficou de fora, de propósito

[[GOV-CONTADOR]] (Fase 5, governança do contador) segue `subno`: pelo [[README]] do vault, proposta de produto
só vira nó de régua **depois de PRE-ADR ratificado**. Promovê-la é decisão do dono, e o freio é o PRE-ADR, não
o critério desta nota.
