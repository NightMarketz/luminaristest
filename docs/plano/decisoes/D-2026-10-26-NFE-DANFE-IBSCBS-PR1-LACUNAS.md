---
id: "D-2026-10-26-NFE-DANFE-IBSCBS-PR1-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas do PR-1 do NFE-DANFE-IBSCBS (readNfeTree sem opts, gates do parseNfe no DANFE, infAdFisco no modelo) decididas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-26: \"Executa o NFE-DANFE-IBSCBS PR-1 — sessao-feature, sem merge.\" As 3 lacunas abertas pela sessão de feature foram respondidas no AskUserQuestion do mesmo dia. Decide lacunas do PR-1; não é merge"
atualizado: "2026-10-26"
---
# D-2026-10-26-NFE-DANFE-IBSCBS-PR1-LACUNAS

**Estado:** `decided`. **Contexto:** a `sessao-feature` do PR-1 (dono, chat, 2026-10-26: *"Executa o NFE-DANFE-IBSCBS PR-1 —
sessao-feature, sem merge."*) leu o BRIEF (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`, itens 4–10 e §4) e achou três
pontos que ele não decidia. Pausou e perguntou antes do código. Nó: [[NFE-DANFE-IBSCBS]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| Item 4: o contrato esboçado dá `opts?: { allowHomologacao }` à `readNfeTree`, mas o texto do item só pede DOCTYPE e assinatura | "Sem opts (Recomendado)" | `readNfeTree(input)` sem opts; a recusa de homologação fica no `parseNfe`, na ordem de hoje |
| Item 5: o BRIEF diz "cStat ∈ {100,150} … (os mesmos do parseNfe)", e o `parseNfe` usa a tabela `NFE_CSTAT_AUTORIZADA` (F-LP-4 a) e valida formato, DV e CNPJ da chave | "Os mesmos do parseNfe (Recomendado)" | `readDanfeModel(xml, legais)`; as checagens da chave e do protocolo viram funções compartilhadas em `lib/nfe.ts` (`assertChaveAcesso`, `assertProtocoloAutorizado`) sem mudar o `parseNfe` |
| Item 10: `[MOC-DANFE-INFCPL]` exige `infAdFisco` e `infCpl` em "Informações Complementares"; o modelo esboçado só tinha `infCpl` | "Incluir infAdFisco (Recomendado)" | `DanfeModel.infAdFisco: string \| null` (Z02); o PR-2 imprime os dois |

## O que NÃO decide

Não é merge e não é `executa` do PR-2 nem do PR-3.
