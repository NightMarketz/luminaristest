---
tipo: "referencia"
titulo: "Dúvidas do inventário do vault"
---
# Dúvidas do inventário (23/09) — esperam decisão do dono

> Levantadas na extração do vault (agente separado + conferência contra o banner 46/57). O vault **não** as
> decidiu: onde havia leitura ratificada, seguiu-a; onde não, seguiu o grafo de 14/09. Ver também as divergências
> SDD × repo em [[18-caminho]].

- D-1 X6: cédula 03/09 o conta como nó 12 do fiscal (merge #328 → fiscal 10/16); §M5.1 e o fold 22/09 o tratam como crescimento do nó NF-e → 9/16. Vault segue a leitura ratificada (fecha_regua=false). Decisão do dono.
- D-2 X10a/X11/X12: fold 18/09 diz que materializaram dentro do X10b, mas estão no denominador 16 e o grafo 14/09 os lista abertos. Vault usa o estado do grafo. X12 (catálogo de adições/exclusões) dentro de um nó de DF-e parece improvável.
- D-3 C9: nó 19 da cédula 03/09, mas o fold 22/09 diz que 'não é linha própria' (absorvido no C8 PR-4). Sem ele o contábil teria 21 linhas; não está claro se o C8 PR-5 soma +1 ou +2.
- D-4 Numeração: não há esquema único para os 57 nós; IDs do grafo onde 1:1, senão CONT-nn/FIN-nn/FIS-nn pelo número da cédula. Associações C7, F1, F4, X10b são inferência do extrator.
- D-5 Z0-a: cédula 10/09 resposta 1 já fecha F-Z0 pelo produto e descondicionou o trilho, mas o SDD (§18/§19) o trata como aberto. Vault mantém human-open; fechar é decisão do dono.
- X10b tem autorização null: não achei nos docs lidos a frase do dono que reverteu a regra 'não X10b/emissão' (SDD:1536 a marca como HISTÓRICO sem citar quem autorizou).
- Arestas pontilhadas para nós fora do inventário ou com ID de outro doc: C10 no mermaid = P2 aqui (H3 depende_de P2); FF7 (forks do F7, já ratificados 15/09) segue como dependência do FE-INCR-BANK-SETTLEMENT; X10i (emissão real), X10, D-NFSE, D3b, X4-14 e R9 não são nós deste inventário. D1f → X10b vem do grafo 14/09, anterior ao fechamento do X10b sem D1f (este entrou como config no FiscalProfile, SDD:490).
- I3 × LAC-B: o onboarding trata I3 como o backend da LAC-B, e o §18.2 (SDD:410) escreve 'I1 → I3 → I4 depende de LAC-B'. Registrei I3 dependendo de LAC-B e NÃO de I1 (o mermaid do onboarding não tem a aresta I1→I3).
- FE-INCR-SPED-SIGNERS: SDD:1510 diz 'espera o merge do BE', mas o C12 já está mergeado (#353). O estado blocked vem do texto; na prática pode estar planejável.
- PASSO-11 está como inflight: o teste foi escrito e autorizado ('autorizo o passo 11', 23/09), mas não tem PR. Pela legenda do §III.2, inflight exige PR aberto ou BRIEF em worktree. O teste existe só em worktree.
- Nós CONT-01..13, FIN-01..13, FIS-01..04: autorizacao null (são anteriores à régua, não rastreei a frase). A lista de PRs deles é parcial, só o que aparece no SDD.
- Regra de estado usada: estado = estado do trabalho por evidência (merge em main), não se o nó conta no numerador. Por isso a contagem fiscal diverge do banner 9/16.
