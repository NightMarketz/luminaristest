---
id: "D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO"
tipo: "decisao"
dominio: "fiscal"
titulo: "A simulação de regime do EFICIENCIA-FISCAL é corrigida pela raiz: montadores de entrada e uma elegibilidade por ano compartilhados pela apuração e pela simulação; as lacunas f514, 35df, 7bff e a2ce viram itens do BRIEF, sem correção avulsa"
estado: "decided"
autorizacao: "dono, 2026-11-21, questionário, à pergunta \"corrigir pela raiz (um montador de entrada e uma regra de elegibilidade compartilhados por rota e simulação) ou corrigir os 4 defeitos um a um?\": \"Montador único\"; chat do mesmo dia: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\"; confirmado pelo dono ao iniciar o cartão da sessão de planejamento — planejamento (BRIEF + contratos + forks pendentes); o código espera os forks e o 'executa'"
atualizado: "2026-11-21"
---
# D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO

**Estado:** `decided`. **Nó:** [[EFICIENCIA-FISCAL]] (emenda do item 16, simulação de regime).

## Autorização (citação exata)

- Dono, 21/11/2026, questionário da sessão que mediu o gap fiscal, à pergunta *"corrigir pela raiz (um montador de entrada e
  uma regra de elegibilidade compartilhados por rota e simulação) ou corrigir os 4 defeitos um a um?"*: **"Montador único"**.
- Chat do mesmo dia: *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*.
- O dono confirmou ao iniciar o cartão da `sessao-planejamento` desta emenda.

## O que foi decidido

1. A simulação de regime deixa de montar a própria entrada. Cada apuração (Simples, IRPJ/CSLL, PIS/COFINS, IBS/CBS) expõe a
   montagem da entrada num leitor chamável em modo "e se", sem gravar, usado pela rota e pela simulação.
2. Uma função pura de elegibilidade por ano (limites ME/EPP, vedações do art. 15 da Res. CGSN 140, interdependência, teto do
   Presumido, obrigação de ir ao Real) gera os alertas da rota e filtra a simulação antes do ranking.
3. Fato que só existe no regime simulado vira premissa declarada, nunca zero silencioso.
4. O cenário do regime atual é aferido contra a apuração confirmada.
5. As lacunas `L-20261121-172247-f514`, `L-20261121-172248-35df`, `L-20261121-175856-7bff` e `L-20261121-172251-a2ce` viram
   itens do BRIEF; nenhuma correção avulsa é despachada.
6. **Fora:** a camada de decisão (premissas do usuário, projeção, otimização dentro do regime), que só começa quando as rotas
   fecharem.

## Escopo desta cédula

Planejamento: o BRIEF [`BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md`](../../accounting/BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md),
os contratos esboçados e os forks F-MU-1..13, levados ao dono e **ratificados** em 21/11, todos (a)
([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]). O código de cada PR espera o `executa` para este BRIEF
([[D-2026-10-28-FLUXO-AUTONOMO]]: o `executa` cobre BRIEF ratificado e sem fork pendente). PR do planejamento: #1323.
