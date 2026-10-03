---
id: "D-2026-10-02-MAPA-COBERTURA-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-COB-1..3 do MAPA-COBERTURA-EMISSAO-2026-10-02 (entrega ao tomador, NFS-e tomadas, A1 até a Focus)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: rodada de ratificação por questionário dos forks pendentes (AskUserQuestion) — só decisão, sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-MAPA-COBERTURA-FORKS — cédulas da ratificação do mapa de cobertura da emissão

**Estado:** `decided` (F-COB-1..3, 3/3, todos na recomendação)
**Autorização:** dono, chat, 02/10/2026: *"Autorizo uma rodada de ratificação por questionário dos forks pendentes
abaixo (dono, 02/10). Só decisão: não escreva código nem BRIEF novo, não dê 'executa'."* O mapa não é nó do vault, e
por isso a cédula é própria. Os forks tocam [[FE-INCR-DFE]] (F-COB-1), a Fase G do plano de emissão (F-COB-2), [[X10i]]
e o gate [[D5]] (F-COB-1 e F-COB-3).

**Colisão de ID:** o **F-COB-1** de 10/09 (catálogo de adições/exclusões, [[X12]], "F-COB-1 → b") é outro fork. Aqui,
"F-COB-n" = "F-COB-n (mapa 02/10)".

Documento dos forks: [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](../../accounting/MAPA-COBERTURA-EMISSAO-2026-10-02.md) §3.

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-COB-1 | Entregar a nota ao tomador | (a) fora do produto + medir (b) | *"(a) Fora + medir (b) (Recommended)"* | não |
| F-COB-2 | NFS-e tomadas e busca sem parceiro | (b) estender F-PLAN-3 ao `nfsen_recebida` | *"(b) Estender F-PLAN-3 (Recommended)"* | não |
| F-COB-3 | Como o A1 do cliente chega à Focus | (a) cliente sobe no painel | *"(a) Cliente sobe no painel (Recommended)"* | não |

## Efeitos

- **F-COB-1 (a):** o operador baixa o XML/DANFSe e repassa pelo canal dele. A medição de (b) entra em dois lugares: a
  pergunta 2 do [[D5]] e o passo 8 do `RUNBOOK-H2-DFE-MANUAL` (FE-INCR-DFE §5). Reabre para (c) se um cliente pedir
  envio automático.
- **F-COB-2 (b):** o BRIEF do passo G.2 do [`PLANO-EMISSAO-FISCAL`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md)
  consome `nfsen_recebida` ao lado de `nfe_recebida`. O serviço tomado continua lançado à mão até lá.
- **F-COB-3 (a):** confirma o F-NFCE-8 (a) ([[D-2026-10-02-X10A-NFCE-FORKS]]), que já dizia "CSC e A1 cadastrados pelo
  cliente no painel da Focus". A pergunta 1 do [[D5]] segue como medição. Se o painel não aceitar, o fork volta ao dono.
