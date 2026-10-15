---
id: "D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec do PR-A das telas do Simples Nacional — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário na sessão de feature do PR-A — campos MEI: 'Seção nova na aba (Recomendado)'; sem perfil: 'Só texto, sem atalho (Recomendado)'; 12 toasts: 'Dedupe no ToastProvider'"
atualizado: "2026-10-15"
---
# D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS — lacunas de spec do PR-A do [[FE-INCR-SIMPLES]]

**Estado:** `decided` (3 cédulas; 2 na recomendação, 1 contra).
**Autorização:** dono, chat, 15/10/2026, questionário, na sessão de feature do PR-A (o "executa" dos PR-A/B/C é do
mesmo dia, repassado pela sessão que abriu esta).

Origem: `docs/accounting/FE-INCR-SIMPLES-brief.md` itens 1 e 8, e um achado da verificação no build de produção. A
sessão parou em cada um antes de escolher (regra 2).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 8 (campos MEI "no `FiscalProfilePanel`") | O `FiscalProfilePanel` edita o perfil fiscal **da unidade** (`/fiscal-profile`, regime só SIMPLES/PRESUMIDO/REAL). Os 4 campos MEI vivem no perfil fiscal **da empresa por ano** (`/company-fiscal-profile/:ano`), que não tinha tela no my-app; o PUT dele é substituição total | **Seção nova na aba Perfil fiscal** ("Enquadramento do MEI (Anexo XI)"): GET do perfil do ano, edita só os 4 campos (ocupações = linhas MEI_ANEXO_XI publicadas e vigentes no ano) e devolve o perfil inteiro no PUT (lê-altera-grava). O atalho do 400 do detalhe MEI leva até ela | não |
| Item 1 ("sem perfil do ano → atalho") | Não existe tela que **crie** o perfil fiscal do ano (nasce no onboarding) | **Só texto, sem atalho**: "Perfil fiscal de AAAA não cadastrado…" | não |
| Achado no build de produção (12 GETs da grade) | O `apiClient` notifica cada erro; num ano MEI sem enquadramento (ou 2027 com regra não regulamentada) a grade mostrava 12 toasts iguais | **Dedupe no `ToastProvider`**: toast igual (tipo + título + texto) já visível não ganha cópia — vale para o app inteiro | **sim** (recomendação era um flag `silent` no `apiClient` só para a carga do ano) |

## Consequências

- `features/accounting/components/MeiEnquadramentoSection.tsx` + `lib/companyFiscalProfileForm.ts` (mapper do
  lê-altera-grava; recusa sem enviar se a ECD/ECF gravada tiver campo nulo que o PUT exige).
- `lib/services/companyFiscalProfile.service.ts` (GET/PUT do perfil do ano) é também a fonte do regime do ano na aba
  Apuração (item 1).
- `lib/context/ToastContext.tsx`: o dedupe muda o comportamento global — duas notificações idênticas em sequência
  (ex.: salvar duas vezes o mesmo formulário) mostram um toast enquanto o primeiro estiver visível.
- A seção MEI não é governada pela política versionada (`POLICY_TARGETS` = FISCAL_PROFILE e SCOPE_SETTINGS; o perfil
  do ano não está entre eles) — PUT direto, como o BE aceita hoje.
