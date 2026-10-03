---
id: "D-2026-10-03-INTEGRACAO-REKEY-ECF-X7"
tipo: "decisao"
dominio: "plataforma"
titulo: "Integração de 03/10: classificação REKEY dos models novos, exclusão do encerramento no helper compartilhado, #483 retido"
estado: "decided"
autorizacao: "dono, chat, 2026-10-03 (\"Resolve os conflitos restantes, mergeia tudo e atualiza a documentação\"; AskUserQuestion)"
atualizado: "2026-10-03"
---
# D-2026-10-03-INTEGRACAO-REKEY-ECF-X7 — cédulas da sessão de integração de 03/10

**Estado:** `decided` (3/3)
**Autorização:** dono, chat, 03/10/2026: *"Resolve os conflitos restantes, mergeia tudo e atualiza a documentação"*.
As três decisões vieram por AskUserQuestion durante a integração. Em todas, o conflito apareceu no merge e não estava
na lista de superfícies conhecidas (regra 3 da `sessao-integracao`).

## 1. Models novos com `unitId` → REKEY

- **Contexto dado:** o CLI do I1b ([[I1b]], #480) tem inventário fechado de models com `unitId` e falha fechado
  (`UNCLASSIFIED_MODEL`) com model não classificado. O #480 e o #484 ([[F5]], `PaymentAccount`) mergearam verdes, cada
  um sozinho, e o `main` ficou vermelho em `311dac6b` (6 testes do `rekeyLegacyUnitCli`). O #482 ([[GOV-CONTADOR]],
  `AccountantAssignment`) trazia a mesma colisão.
- **Opções:** (a) os dois REKEY: escopo do dono por `(userId, unitId)`, sem hash, mesmo critério F-RK-5 do
  `ProductDestinationDefault` (**recomendada**) · (b) `PaymentAccount` REKEY e `AccountantAssignment` KEEP · (c) parar.
- **Resposta literal:** *"Ambos REKEY (Recommended)"* → ✅ (a).
- **Efeito:** o inventário passa a **50 = 48 REKEY + 2 KEEP**, e foi assim que entrou em `main` pelo #482
  (`db3a4465`). A cifra do `PaymentAccount` usa AAD = `id`, não `unitId`, então o re-key não quebra a decifragem.
  O #494 levava só o `PaymentAccount` e foi fechado sem merge, com diff zero depois do #482; o #495 duplicava o #494.

## 2. Exclusão do lançamento de encerramento vai para o helper compartilhado

- **Contexto dado:** o #488 fazia a ECF Presumido ignorar o `sourceType = 'closing'` (sem isso, o T04 de um exercício
  encerrado sai com receita 0, e o gate de exaustividade deixa passar conta Revenue fora de 3.1/3.3). Em paralelo, o
  #478 ([[X7]] Fase A PR-1) extraiu essas leituras para `receitaBrutaPorAtividade.ts`, que o X7 reusa.
- **Opções:** (a) a exclusão em `netCreditById` do helper, valendo para a ECF e para o X7 (**recomendada**) ·
  (b) parâmetro opcional só para a ECF · (c) não resolver.
- **Resposta literal:** *"Sim, no helper (Recommended)"* → ✅ (a).
- **Efeito:** a apuração trimestral do X7 também exclui o encerramento do T4. O teste
  `SpedEcfGenerationService.closing.integration.test.ts` (#488) prova o lado da ECF.

## 3. #483 (PACOTE-VALIDADE) fica aberto

- **Contexto dado:** o título do #483 diz "não mergear; produção só após PE-6". O backfill roda no 1º boot de qualquer
  ambiente, sem flag (F-PV-3c b), então a única trava é o deploy.
- **Opções:** (a) deixar aberto até o PE-6 (**recomendada**) · (b) mergear e travar só o deploy.
- **Resposta literal:** *"Deixar #483 aberto (Recommended)"* → ✅ (a).
- **Efeito:** o auto-merge que estava ligado no #483 foi desligado na mesma sessão. Ver [[PACOTE-VALIDADE]].
