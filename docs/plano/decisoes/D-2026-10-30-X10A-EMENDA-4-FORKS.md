---
id: "D-2026-10-30-X10A-EMENDA-4-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X10a EMENDA-4 (assinador local): F-AL-0..11 ratificados pela recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-30, na sessão de planejamento da EMENDA-4, sobre a lista F-AL-0..11 com recomendação: \"Pode ratificar todos e vamos abordar os que estao fora do escopo como decidir, pesquise\"; não é 'executa' nem autoriza merge"
atualizado: "2026-10-30"
---
# D-2026-10-30-X10A-EMENDA-4-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 30/10/2026 (citação no frontmatter). **Não é `executa`**
(ORCH-006): o BRIEF fica pronto para execução, mas a implementação e o ADR do AL-PR-0 pedem pedido próprio.

## Decisão: os 12 forks pela recomendação

BRIEF: [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](../../accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md) §6.

| Fork | Ramo ratificado |
|---|---|
| F-AL-0 | (a) ADR próprio `ADR-ASSINADOR-LOCAL` + emenda §14 do ADR-DFE |
| F-AL-1 | (a) .NET 8 (C#), Windows, store de certificados do Windows |
| F-AL-2 | (a) long-poll HTTPS saindo do caixa |
| F-AL-3 | (a) código de pareamento + token de dispositivo; um assinador ativo por unidade; N unidades da mesma raiz |
| F-AL-4 | (a) só a contingência ratificada (SEFAZ fora do ar); caixa sem Luminaris = sem venda pelo Luminaris |
| F-AL-5 | (b) o assinador confere digest, CNPJ e `tpAmb` antes de assinar, com diário local |
| F-AL-6 | (a) assinador fora ⇒ pré-voo nomeado e `PENDING_SIGNATURE`; retomada automática + `reenviar`; não liga contingência |
| F-AL-7 | (a) PSC fica como adaptador atrás de `DFE_ASSINADOR=psc`, desligado; sai o transporte com `DFE_TRANSMISSOR_CERT` |
| F-AL-8 | (a) binário sem assinatura de código, servido pela instância com SHA-256; Microsoft Store pesquisada antes do 2º cliente |
| F-AL-9 | (a) vigilância do Selo Eletrônico em 03/2028 |
| F-AL-10 | (a) espera até 20 s, resultado síncrono; estourou ⇒ ciclo de polling |
| F-AL-11 | (a) a emenda empilha depois de #984, #986 e #992 em `main` |

## Efeitos

- Nenhum fork da EMENDA-4 segue pendente. O que falta para começar: `executa` do dono e, antes do AL-PR-1, o
  AL-PR-0 (ADR) com autorização "só ADR" ou dentro do `executa`.
- Os achados fora de escopo do BRIEF (§9) **não** entram por esta decisão: o dono pediu pesquisa para decidir cada um
  ([`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md)).
- **Mesmo dia, depois:** o F-AL-4 foi reaberto e passou a **(b)**, contra a recomendação
  ([[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 3). Os outros 11 forks ficam como na tabela.
