---
id: "D-2026-09-25-SIG-NFE-NO-DE-REGUA"
tipo: "decisao"
dominio: "fiscal"
titulo: "SIG-NFE (assinatura XMLDSig da NF-e) é nó de régua, não crescimento do nó NF-e"
estado: "decided"
autorizacao: "dono, 2026-09-25, em sessão: \"SIG-NFE deveria ser nó de régua, ajusta\""
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
