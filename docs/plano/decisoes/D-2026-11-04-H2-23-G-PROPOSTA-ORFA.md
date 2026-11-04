---
id: "D-2026-11-04-H2-23-G-PROPOSTA-ORFA"
tipo: "decisao"
dominio: "contabilidade"
titulo: "H2 23-g: encerrar a atribuição do contador mantém a PROPOSED (BRIEF POLICY-VERSION item 11 manda); sem mudança de código"
estado: "done"
autorizacao: "dono, chat, 2026-11-02: \"Faz e me substitui nas decisões\" · dono, chat, 2026-11-04: \"Pode disparar uma sessão pra corrigir os achados e outra para cada não feito\" e \"dispara de novo a C7: corrigir os achados de código do H2\""
atualizado: "2026-11-04"
---
# D-2026-11-04-H2-23-G-PROPOSTA-ORFA

**Caso.** Na execução C7 do H2 (03/11, PR #982), encerrar a atribuição do contador deixou a versão de política
`PROPOSED` do escopo como estava (`AccountantAssignmentService.end`). A pergunta de desenho: o encerramento deveria
resolver a `PROPOSED` na mesma tx?

**Opções.**
- (a) **Manter como está:** a `PROPOSED` sobrevive ao encerramento.
- (b) **Resolver no encerramento:** a `PROPOSED` vira `SUPERSEDED` (ou outro estado) na tx do `end`, com trilha.

**Decisão anterior encontrada — ela manda.** O BRIEF
[`BE-INCR-ACCOUNTING-POLICY-VERSION`](../../accounting/BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md), com os forks
F-POL-1..7 ratificados pelo dono em 04/10, decide o caso no **item 11, "Propostas órfãs"**: quando a atribuição termina,
a `PROPOSED` fica como está; o próximo `PUT` do dono (já sem ACTIVE) aplica e a marca `SUPERSEDED`; um contador novo
que aceite depois pode aprovar ou rejeitar, porque a aprovação é do escopo, não da atribuição (**F-GOV-11 a**). O
código segue isso: `AccountingPolicyVersionService` (cabeçalho, "Propostas órfãs (item 11)") e
`policyVersionApply.ts` (o PUT direto passa a órfã para `SUPERSEDED` com `supersededById`).

**Escolhida: (a).** A recomendação (b) da sessão que abriu o achado contradiz o item 11 e o F-GOV-11 (a). Pela regra
da tarefa, a decisão anterior prevalece. Mudar isso é reabrir um fork ratificado, que é do dono, não desta sessão.

**O que o H2 viu de errado é outra coisa e foi corrigido:** depois do PUT direto, a faixa "aguardando o contador"
seguia na tela porque o `useGovernedSave` não relia a pendente (achado **23-h1**, corrigido no mesmo PR; guarda em
`my-app/features/accounting/governance/__tests__/useGovernedSave.test.tsx`). Com isso, a tela acompanha o desenho do
item 11: a órfã some quando o dono salva direto.

**Sem teste novo do lado do servidor:** não há lacuna a provar; o comportamento é o desenhado.
