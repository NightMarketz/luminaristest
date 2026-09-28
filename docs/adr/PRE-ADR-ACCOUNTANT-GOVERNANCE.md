# PRE-ADR-ACCOUNTANT-GOVERNANCE — Contador responsável: papel com CRC, política versionada e quem reabre período

- **Data:** 2026-09-27
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork decidido; nenhum código autorizado.
- **Autorização:** dono, em sessão, 2026-09-27, sobre o item "GOV-CONTADOR fica `subno` por regra": *"1. segue o
  caminho"* — o caminho que o [`README` do vault](../plano/README.md) fixa para proposta de produto é
  **PRE-ADR → ratificação → nó em `nos/`**. Este documento é esse passo, e só ele. Precedente de forma:
  [`PRE-ADR-FISCAL-OBLIGATION-PROFILE`](ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md) (24/09).
- **Nó:** [[GOV-CONTADOR]] (hoje `subno`, fora da régua — vira nó de régua **se** este PRE-ADR for ratificado).
- **Autor:** `sessao-planejamento` (agente). Forks decididos pelo dono, fora desta sessão.
- **Origem do conteúdo:** Fase 5 do [`PLANO-POS-CONTADOR-2026-09-23`](../accounting/PLANO-POS-CONTADOR-2026-09-23.md)
  (item 0 da resposta do contador) + inventário 5.1 medido nesta sessão (§2).

## TLDR

O produto quer vender "com contador incluso", mas hoje **não existe a figura do contador** no sistema: só há
`Role { USER, ADMIN }`, toda policy contábil se resolve em "tem `actorUserId`?", e **qualquer** usuário
autenticado fecha, reabre e assina. A escrituração já é tecnicamente imutável (estorno, não edição) e já tem
proveniência por lançamento — o que falta é **quem responde por ela**. Proposta: papel de **contador
responsável com CRC** por escopo contábil, **reabertura de período restrita a esse papel**, **parâmetros de
política versionados com aprovação** e a **trilha de quem assinou** já existente no C11 passando a exigir o
papel. Nada disso é motor de regras: é papel + policy + tabela versionada.

## 1. O problema, em uma frase

Sem um responsável identificável, a escrituração que o sistema gera **não tem a quem imputar** — e é isso que o
CRC cobra do contador que assina, não a qualidade do arquivo.

## 2. Inventário 5.1 — o que JÁ existe (medido nesta sessão, `arquivo:linha`)

| Peça | Estado hoje | Evidência |
|---|---|---|
| Imutabilidade do lançamento | ✅ existe — "posted/reversed entries are immutable — corrections via a reversing entry (estorno)" | `server/src/features/accounting/services/PostingService.ts:72` |
| Invariante de balanço + choke-point de centavos | ✅ existe (ACC-014/ACC-024) | `PostingService.ts:201,297,318` |
| Proveniência por lançamento | ✅ existe — `sourceType`/`sourceId` com `@@unique[userId,unitId,sourceType,sourceId]` e `SourceDocument` anexável | `prisma/schema.prisma:542,566,832` |
| Ciclo de revisão + sign-off | ✅ existe (C11) — `canReviewAccounting`, `canSignOffReview` | `policies/AccountingPolicy.ts:165-171` |
| Máquina de estados do período | ✅ existe — `SOFT_CLOSED → OPEN (reopen)`, `HARD_CLOSED` terminal | `services/PeriodService.ts:17-19,60` |
| **Papel de contador** | ❌ **não existe** — `enum Role { USER, ADMIN }` | `prisma/schema.prisma:145-149` |
| **Quem pode fechar/reabrir** | ⚠️ **qualquer autenticado** — `canClosePeriod` = `!!scope.actorUserId`, e reabrir usa a mesma policy | `AccountingPolicy.ts:23-25`; `PeriodService.ts:34` |
| **Quem pode assinar a revisão** | ⚠️ `canSignOffReview` = `canManage` (mesmo gate de quem lança) | `AccountingPolicy.ts:169-171` |
| Segregação de funções (SoD) | ⚠️ escrita, mas **no-op**: `ownerUserId !== actorUserId`, e hoje owner === actor sempre | `AccountingPolicy.ts:176-179` |
| CRC em algum lugar | ❌ só como **dado do destinatário** do pacote (`AccountingContact`), não como responsável | `schema.prisma:53` |

**Leitura:** as três lacunas de governança (papel, reabertura, assinatura) são **da camada de policy**, não do
razão. O razão já se comporta como escrituração; o que falta é autorização diferenciada.

## 3. Proposta

1. **`AccountantAssignment`** (Prisma first-class, por `AccountingScope`): `userId` do contador, `crcNumber`,
   `crcUf`, `vigenciaInicio`/`vigenciaFim`, `ativo`. É o registro de **quem responde** pelo período — não um
   campo no `User`, porque muda no tempo e precisa de histórico.
2. **Policy nova:** `canReopenPeriod` deixa de herdar `canClosePeriod` e passa a exigir contador ativo no
   escopo. `canSignOffReview` idem. `canClosePeriod` (fechar) **continua** com o operador — fechar é rotina.
3. **Parâmetros de política versionados** (`AccountingPolicyVersion`): as escolhas que hoje vivem em constante
   de código ou no `FiscalProfile` (regime, defaults de crédito, critério de arredondamento…) ganham versão com
   `aprovadoPor` + data. É **dado versionado, não engine** — mesma regra que o PRE-ADR do X13 aplicou.
4. **Bloqueio do operador do fornecedor:** ação de escrituração feita por quem não é do tenant fica registrada
   e, nos pontos acima, recusada. Depende do `membership` que a SoD já espera.
5. **Login do contador** = crescimento do C11 (ele já tem revisão, achados e sign-off); não nasce módulo novo.

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-GOV-2** — onde mora o papel | (a) `AccountantAssignment` por escopo, com vigência · (b) valor novo em `enum Role` (`ACCOUNTANT`) · (c) os dois | **(a)** — `Role` é global ao usuário; responsabilidade é por empresa **e** por período, e (b) não guarda CRC nem histórico |
| **F-GOV-3** — o que o contador tranca | (a) só reabertura de período + sign-off · (b) também o fechamento · (c) também todo lançamento manual | **(a)** — (b) e (c) travam a operação diária do salão, que é quem lança; o contador revisa e responde |
| **F-GOV-4** — tenant sem contador | (a) tudo como hoje (nada trava) até existir um contador atribuído · (b) trava reabertura para todos · (c) trava e exibe convite | **(a)** — não quebrar quem já usa; a trava nasce com a atribuição |
| **F-GOV-5** — CRC é validado? | (a) formato apenas (`NNNNNN/UF`) · (b) formato + consulta ao CFC · (c) campo livre | **(a)** — (b) é integração externa com oráculo próprio; vira item de dado externo se o dono quiser |
| **F-GOV-6** — política versionada agora ou depois | (a) junto, no mesmo incremento · (b) incremento próprio depois do papel | **(b)** — o papel sozinho já fecha as 3 lacunas medidas; a versão de política é maior e não bloqueia o H1 |
| **F-GOV-1** *(herdado do plano, Fase 5)* — consulta ao CRC-SP sobre software × serviço contábil | (a) consultar antes de vender "com contador incluso" · (b) seguir sem consultar | **(a)** — **decisão do dono, fora do código**; cruza com [[Z0-a]] |

## 5. Pendente de validação externa

- **F-GOV-1** e a pergunta do [[Z0-a]] ("contador com CRC aceita assinar escrituração que não conduziu?") são o
  mesmo assunto visto de dois lados. A resposta muda o **produto**, não o desenho acima.
- O contador respondeu 23/09 ao item 0 da triagem; o que ele pediu está refletido em §3, mas **não** foi
  revalidado com ele depois deste desenho.

## 6. Consequência se for ratificado

`GOV-CONTADOR` sai de `subno` e vira **nó de régua** (denominador +1, pelo critério de
[`D-2026-09-25-SIG-NFE-NO-DE-REGUA`](../plano/decisoes/D-2026-09-25-SIG-NFE-NO-DE-REGUA.md): é capacidade que
não existe), e o BRIEF `BE-INCR-ACCOUNTANT-GOVERNANCE` nasce depois — **com "executa" próprio**, como sempre.
