---
id: "D-2026-10-06-LEGAL-PARAMS-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-LP-0..8 (BE-INCR-LEGAL-PARAMS) e F-P16-0..3 (BE-INCR-TAX-PRESUMIDO-16)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06: \"Commita, abre o PR e ratifica os forks por questionário\" (AskUserQuestion) — sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-LEGAL-PARAMS-FORKS — cédulas da sessão de ratificação

**Estado:** `decided` (F-LP: 10/10 + F-LP-9 decidido antes no mesmo dia; F-P16: 4/4).
**Autorização:** dono, chat, 06/10/2026: *"Commita, abre o PR e ratifica os forks por questionário"*. As respostas
vieram pelo AskUserQuestion: o agente apresentou e o dono decidiu. **Não é "executa"** (ORCH-006).
Documentos: [`BE-INCR-LEGAL-PARAMS-brief.md`](../../accounting/BE-INCR-LEGAL-PARAMS-brief.md) §5 e
[`BE-INCR-TAX-PRESUMIDO-16-brief.md`](../../accounting/BE-INCR-TAX-PRESUMIDO-16-brief.md) §3. PR #559.

## Antes desta rodada (mesmo dia, questionário)
- **F-LP-9 / D-1:** *"Errata + BRIEF do 16%"*. **D-3:** *"Esperar a tabela no banco (Recomendado)"*.
  **D-2:** *"Junto do BRIEF da tabela (Recomendado)"*.

## F-LP (BE-INCR-LEGAL-PARAMS)
| Fork | Resposta literal | Resultado |
|---|---|---|
| F-LP-0 registro no vault | *"Nó próprio (Recomendado)"* | ✅ (a) — nota [[LEGAL-PARAMS]] |
| F-LP-1 ordem | *"Correções antes (Recomendado)"* | ✅ (a); a depreciação (D-3) espera a migração, decidido antes |
| F-LP-2 quem publica | *"Papel novo (Recomendado)"* | ✅ (b) `PLATFORM_ADMIN` |
| F-LP-3 dupla checagem | *"Um admin faz tudo"* | ✅ (b) — **contra a recomendação (a)**. A auditoria registra quem fez; o risco "erro numa linha atinge todos os clientes" fica sem segunda pessoa |
| F-LP-4 injeção nos cálculos | *"Fotografia passada ao cálculo (Recomendado)"* | ✅ (a) |
| F-LP-5 linha retroativa × apuração confirmada | *"Recalcular sozinho"* | ✅ (b) — **contra a recomendação (a)** |
| F-LP-6 suspensão LC 224 | *"A plataforma vai atualizar os dados fiscais de acordo com a lei sempre, contador apenas valida quando for sair pra fora da plataforma"* (Other) | ✅ (b) **fica como está** (sem aprovação do contador na flag), mais o **princípio** registrado abaixo |
| F-LP-7 tela | *"BRIEF de tela separado (Recomendado)"* | ✅ (a) `FE-INCR-LEGAL-PARAMS` |
| F-LP-8 linhas `ANEXO_*` já semeadas | *"Migrar e apagar"* | ✅ (b) — **contra a recomendação (a)**; consequências no BRIEF (item 9) |
| F-LP-10 forma do "apagar" (nasceu do F-LP-8) | *"Apagar de vez"* | ✅ (b) delete físico depois do repoint — **contra a recomendação (a) soft-delete**, padrão da casa |

### Princípio do dono (F-LP-6), vale como regra citável
> *"A plataforma vai atualizar os dados fiscais de acordo com a lei sempre, contador apenas valida quando for sair pra
> fora da plataforma."*

Leitura: atualização legal é dever da plataforma, sem aprovação por empresa; o ponto de validação do contador é a
**saída** (entrega da escrituração, guia, declaração). É coerente com F-LP-5 (b) e F-LP-3 (b). **Não** muda, por
si só, as permissões de confirmação de apuração (achado de 06/10 sobre o GOV-CONTADOR), que continuam fora deste nó.

## F-P16 (BE-INCR-TAX-PRESUMIDO-16)
| Fork | Resposta literal | Resultado |
|---|---|---|
| F-P16-0 reabrir o F-X7-14 | *"Reabrir (Recomendado)"* | ✅ (a) — F-X7-14 reaberto |
| F-P16-1 declaração da flag | *"Confirmação explícita (Recomendado)"* | ✅ (a) |
| F-P16-2 diferença postergada | *"Decidir pela leitura do X9 (Recomendado)"* | ✅ condicionado ao X9 (insumo ausente) |
| F-P16-3 16% × LC 224 | *"Erro explicando (Recomendado)"* | ✅ (b) 400 |
