---
id: "D-2026-10-14-I4-EMENDA-FISCAL-PROFILE"
tipo: "decisao"
dominio: "plataforma"
titulo: "EMENDA 14/10 do BRIEF I4: o perfil fiscal da unidade nasce no onboarding — F-I4-6..F-I4-10 ratificados"
estado: "decided"
autorizacao: "dono, chat, 2026-10-14, por questionário (AskUserQuestion), na sessao-planejamento pedida com 'Faça esta tarefa aqui: EMENDA do BRIEF I4: FiscalProfile da unidade no onboarding'"
atualizado: "2026-10-14"
---
# D-2026-10-14-I4-EMENDA-FISCAL-PROFILE — cédulas dos forks da EMENDA 14/10

**Estado:** `decided` — 5/5 forks ratificados, todos na recomendação.

**Autorização:** dono, chat, 14/10/2026, por questionário. A sessão de planejamento foi pedida com *"Faça esta tarefa
aqui: 'EMENDA do BRIEF I4: FiscalProfile da unidade no onboarding'"*. Ela continua a L-1 de
[[D-2026-10-14-I4-I5-LACUNAS-EXECUCAO]] (*"Pausar PR-2, EMENDA"*).

**Documentos:**
- Forks com contexto: [`BE-INCR-ONBOARDING-ACTIVATION-brief.md`](../../accounting/BE-INCR-ONBOARDING-ACTIVATION-brief.md),
  EMENDA 14/10, E14.5.
- Regra legal: dossiê [`pesquisas-legais/pis-cofins-regime-por-tributacao/relatorio.md`](../../../pesquisas-legais/pis-cofins-regime-por-tributacao/relatorio.md)
  (Planalto, D01–D04 com SHA-256).

Nó: [[I4]].

| Fork | Pergunta | Resposta |
|---|---|---|
| F-I4-6 | Onde nasce o `FiscalProfile` da unidade | ✅ **(a)** o onboarding deriva do regime informado (passo 3b); sem derivação possível, nada é criado e a ativação sai `Draft` |
| F-I4-7 | `icmsContribuinte` no Presumido/Real | ✅ **(a)** uma pergunta fechada a mais (sim / não / não sei), só nesses regimes; "não sei" não cria o perfil |
| F-I4-8 | `pisCofinsRegime` no Lucro Real | ✅ **(a)** salão → `NAO_CUMULATIVO`; clínica estética não deriva (Lei 10.833 art. 10, XIII, "a" ambíguo) — o contador informa |
| F-I4-9 | Wizards Rápido e Controle Total sem a pergunta fiscal | ✅ **(a)** a pergunta fiscal entra nos 3 wizards (PR-4) |
| F-I4-10 | Falha ao gravar o perfil da unidade | ✅ **(a)** `logger.error` e segue; tenant de pé, ativação `Draft` (mesma assimetria do F-I4-2 b) |

**Consequências:**
- **F-I4-7:** tensão escrita no BRIEF com o F-OBP-6 (c) ("só regime e porte"). É uma pergunta só, fechada e com
  "não sei".
- **F-I4-8:** a pergunta da clínica estética no Real vira linha no pedido ao contador (E14.7 do BRIEF).
- **Não é "executa" novo.** O código do PR-2 segue sob a autorização de 14/10 (*"Executa o I4 e o I5 … sessao-feature,
  um PR por vez na ordem do BRIEF"*), que estava pausada só por esta lacuna. Retomar o PR-2 é pedido do dono.
