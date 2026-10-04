---
id: "D-2026-10-04-GOV-CONTADOR-FE-POL-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Ratificação por questionário: F-POL-1..7 (política versionada) e F-FE-GOV-1..4 (telas do contador)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03: \"Planeja os BRIEFs das telas e da política versionada do GOV-CONTADOR […] Forks novos vão para mim por questionário. Sem 'executa'.\" — respostas por AskUserQuestion em 04/10"
atualizado: "2026-10-04"
---
# D-2026-10-04-GOV-CONTADOR-FE-POL-FORKS — cédulas da ratificação dos dois BRIEFs de 03–04/10

**Estado:** `decided` (11/11)
**Autorização:** dono, chat, 03/10/2026: *"Planeja os BRIEFs das telas e da política versionada do GOV-CONTADOR
(dono, 03/10/2026) — sessao-planejamento. […] Forks novos vão para mim por questionário. Sem 'executa'. Consulta ao
CFC fica fora (espera o M2, F-V1 c)."* As respostas vieram por AskUserQuestion, na mesma sessão, em 04/10.
**Não é "executa"** (ORCH-006). F-GOV-1 (CRC-SP) e F-V1 c (CFC) continuam fora.

Documentos dos forks (texto, caminhos e justificativa):
- [`BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md`](../../accounting/BE-INCR-ACCOUNTING-POLICY-VERSION-brief.md) §5 e §5.1
- [`FE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](../../accounting/FE-INCR-ACCOUNTANT-GOVERNANCE-brief.md) §5 e §5.1

## Política versionada (BE)

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-POL-1 | Forma da versão | (a) registro ao lado das tabelas vivas | *"Registro ao lado (Recomendado)"* | não |
| F-POL-2 | Quais parâmetros exigem aprovação | (b) `FiscalProfile` + `AccountingScopeSettings` | *"Perfil fiscal + settings (Recomendado)"* | não |
| F-POL-3 | Dono muda parâmetro com contador ativo | (a) vira proposta | *"Vira proposta (Recomendado)"* | não |
| F-POL-4 | Forma da API | (b) `PUT` → 409 + `POST /policy-versions` | *"409 + rota de proposta (Recomendado)"* | não |
| F-POL-5 | Carimbo da versão nos consumidores | (a) não; vigente pelo instante | *"Não; deriva pelo instante (Recomendado)"* | não |
| F-POL-6 | Nova proposta com outra pendente | (a) a nova substitui | *"Nova substitui a pendente (Recomendado)"* | não |
| F-POL-7 | Versão inicial dos escopos existentes | (a) nenhuma; começa no deploy | *"Não; começa no deploy (Recomendado)"* | não |

## Telas do contador (FE)

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-FE-GOV-1 | Onde o contador trabalha | (a) página própria `/accounting/clients` | *"Modo no AccountingView"* | **sim** |
| F-FE-GOV-2 | Rótulo da unidade do cliente | (a) e-mail do dono + `unitId` curto | *"E-mail + unitId curto (Recomendado)"* | não |
| F-FE-GOV-3 | CRC no sign-off delegado | (a) pré-preenchido e só-leitura | *"Preenchido e só-leitura (Recomendado)"* | não |
| F-FE-GOV-4 | Botões do dono com contador ativo | (a) visíveis + banner + erro traduzido | *"Visíveis + banner (Recomendado)"* | não |

## Consequência registrada (contra a recomendação)

- **F-FE-GOV-1 (b):** o modo cliente vive dentro do `AccountingView`, que monta 22 abas que resolvem o escopo do
  próprio usuário. Os itens 6 e 8 do BRIEF do FE foram reescritos na sessão para três defesas:
  - a lista **`DELEGATED_TABS`**, que diz quais abas aparecem; aba nova fica fora por padrão;
  - um ramo próprio da aba Compliance, que mostra só o painel de revisão;
  - `useAccountingData` sem balancete no modo cliente.
  O teste 13c trava as três. **Risco que sobra:** um painel novo posto **dentro** do `PeriodsPanel` ou do `ReviewPanel`
  aparece no modo cliente. A revisão de PR futuro nesses dois painéis precisa olhar a prop `governance`.

## Efeito no BRIEF do BE fora dos forks

- O model novo `AccountingPolicyVersion` tem `unitId` e entra em `REKEY_MODELS` no mesmo PR, pelo critério do F-RK-5
  (pedido explícito do dono, caso #493). Durante o planejamento, o #504 (`TaxAssessment`) já moveu a contagem uma vez.
  Na base `fe842379`, o inventário vai a **52 = 50 REKEY + 2 KEEP**, e o PR de código tem de rebasear e reconferir antes
  do merge.
