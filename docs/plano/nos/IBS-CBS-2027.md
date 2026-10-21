---
id: "IBS-CBS-2027"
tipo: "regua-f"
dominio: "fiscal"
titulo: "IBS/CBS no regime regular (CBS plena em 01/01/2027): tabela de vigência, débito por documento, crédito por entrada, antecipação do pacote, apuração mensal e split payment — promove M5-ibs-cbs"
estado: "planned"
estado_detalhe: "20/10: PRE-ADR **Proposed** (ADR-INCR-IBS-CBS-2027) escrito pela sessao-planejamento sob a Q2 (a) da proposta de 20/10 — forks F-IBS-1..10 PENDENTES, P-IBS-1..7 ao contador/fonte oficial. **Não roteia até a ratificação** (README: nó novo vira nos/ depois de PRE-ADR ratificado; a nota existe por pedido da sessão de origem). Sem BRIEF, sem 'executa'. Prazo legal: 01/01/2027 (LC 214 art. 347/542, efeitos art. 544 III). Verificação legal de 20/10: pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs. Hoje o X8 responde 400 a partir de 01/2027 (pisCofinsParams vigenteAte 2026-12-31) — Presumido/Real ficam sem apuração federal sobre a receita · 21/10: forks F-IBS-1..7, 9, 10 RATIFICADOS por questionário ([[D-2026-10-21-FORKS-IBS-CBS-2027]]); F-IBS-7 = começar em 2027 (condicionado a P-IBS-1 antes de 01/01/2027); F-IBS-8 → contador (P-IBS-4). Próximo: BRIEF por pedido próprio"
depende_de: ["[[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]", "[[D-2026-10-21-FORKS-IBS-CBS-2027]]", "[[X7]]", "[[LEGAL-PARAMS]]", "[[F7]]?", "[[D1]]?", "[[M5-ibs-cbs]]?"]
autorizacao: "dono, chat, 2026-10-20: \"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a).\" — Q2 (a) = PRE-ADRs de F1 (IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF) por sessao-planejamento, sem 'executa' (cédula D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS, sessão de origem). Só o PRE-ADR e esta nota; BRIEF e código exigem pedido próprio"
ancora_sdd: "§M5"
atualizado: "2026-10-21"
prs: ["#777"]
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: 10 forks pendentes (escopo, persistência, fonte do débito, evidência de extinção do crédito, antecipação, split, 2026, classe contábil, fatiamento, cClassTrib por serviço); depois deles: opus-medio (família nova de apuração com CAS + provisão em 2 commits + migração aditiva + parser)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/accounting/models/ibsCbs*", "server/src/features/accounting/dtos/IbsCbsAssessmentDto.ts", "server/src/features/accounting/dtos/ServiceFiscalProfileDto.ts", "server/src/features/accounting/services/IbsCbsAssessmentService.ts", "server/src/features/accounting/services/FiscalDocumentEmissionService.ts", "server/src/features/accounting/services/BankSettlementService.ts", "server/src/features/accounting/repositories/*IbsCbs*", "server/src/features/accounting/policies/**", "server/src/controllers/*IbsCbs*", "server/src/lib/nfe.ts", "server/src/lib/ibsCbsApuracao.ts", "server/src/features/accounting/models/obrigacoesPorRegime.ts", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/accounting/**/__tests__/**", "server/src/lib/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.ibs-cbs-assessments.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# IBS-CBS-2027 — IBS/CBS no regime regular (CBS plena em 01/01/2027) — promove [[M5-ibs-cbs]]

**Estado:** `planned` — 20/10: PRE-ADR **Proposed** (ADR-INCR-IBS-CBS-2027) escrito pela sessao-planejamento sob a Q2 (a) da proposta de 20/10 — forks F-IBS-1..10 PENDENTES, P-IBS-1..7 ao contador/fonte oficial. **Não roteia até a ratificação** (README: nó novo vira nos/ depois de PRE-ADR ratificado; a nota existe por pedido da sessão de origem). Sem BRIEF, sem 'executa'. Prazo legal: 01/01/2027 (LC 214 art. 347/542, efeitos art. 544 III). Verificação legal de 20/10: pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs. Hoje o X8 responde 400 a partir de 01/2027 (pisCofinsParams vigenteAte 2026-12-31) — Presumido/Real ficam sem apuração federal sobre a receita · 21/10: forks F-IBS-1..7, 9, 10 RATIFICADOS por questionário ([[D-2026-10-21-FORKS-IBS-CBS-2027]]); F-IBS-7 = começar em 2027 (condicionado a P-IBS-1 antes de 01/01/2027); F-IBS-8 → contador (P-IBS-4). Próximo: BRIEF por pedido próprio  
**Autorização:** dono, chat, 2026-10-20: "Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)." — Q2 (a): PRE-ADR por sessao-planejamento, sem 'executa'  
**Depende de:** [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] (cédula Q2 (a)), [[X7]] (molde `TaxAssessment`, CAS, provisão), [[LEGAL-PARAMS]] (tabela de vigência), [[F7]] (pontilhada: split payment como parte da baixa), [[D1]] (pontilhada: item 1b do contador — P-IBS-1..4), [[M5-ibs-cbs]] (pontilhada: diferido que este nó promove)  
**Desbloqueia:** [[ISS-TRANSICAO-IBS]] (2029+), parte do [[NFE-DANFE-IBSCBS]] (totais IBS/CBS que o DANFE exibe)  
**Âncora no SDD consolidado:** §M5  
**Régua:** seção **F1** da régua F (Q1 (a), 20/10) — não entra na régua de 63

## Escopo (o que o PRE-ADR fixa — ver D1–D13 do ADR)

- Regime regular só (Simples/MEI ⇒ 400; IBS/CBS do optante vai no DAS desde 2027).
- Tabela `IBS_CBS` em `legal_parameters` com vigência: 2026 (0,1% / 0,9%), 2027–2028 (IBS 0,05% + 0,05%; CBS = referência − 0,1 p.p., **linha DRAFT até a resolução do Senado**).
- Débito = o que o `FiscalDocument` autorizado declarou (LC 214 art. 60 § 1º); recálculo só como aviso.
- Apuração mensal por tributo em família nova (`ConsumptionTaxAssessment`), saldo = débitos − créditos (art. 45), CAS + memória + parâmetros versionados.
- Crédito por nota de entrada **condicionado à extinção** (art. 47), uso/consumo pessoal fora (art. 57).
- Antecipação do pacote pré-pago (art. 10 § 4º; Decreto 12.955 art. 11 § 5º) como linha da apuração; o razão não muda (V7).
- Split payment (arts. 31–33) como parte `SPLIT_IBS_CBS` da baixa do F7 — nunca tarifa.
- 2026: ano-teste com dispensa declarada (art. 348 § 1º; ambiguidade A2).
- Parser da NF-e lê o grupo `IBSCBS` (dívida T3); `cClassTrib` por serviço em `ServiceFiscalProfile`.
- Fora: DeRE (P2), DANFE ([[NFE-DANFE-IBSCBS]]), ISS→IBS ([[ISS-TRANSICAO-IBS]]), perfil de produto (F4 `TABELA-TRIBUTARIA-PRODUTO`), guia e transmissão (R5: porta nomeada, adaptador adiado).

## Gatilho

- **Data legal:** 01/01/2027 — PIS/Cofins extintos (LC 214 art. 542 X/XI/XVIII/XXI; art. 544 III) e CBS plena (art. 347). Verificado em 17/10 ([D09] do dossiê PIS/Cofins) e relido em 20/10 ([D08] do dossiê F1).
- Risco medido em 20/10: `pisCofinsParams.ts` `vigenteAte = 2026-12-31` ⇒ 400 em 01/2027; nenhum nó de IBS/CBS aberto antes desta nota.

## Docs

- [`ADR-INCR-IBS-CBS-2027.md`](../../adr/ADR-INCR-IBS-CBS-2027.md) — **PRE-ADR Proposed (20/10)**: D1–D13, esqueleto de 20 comportamentos em 5 PRs, contratos esboçados, forks F-IBS-1..10 PENDENTES, P-IBS-1..7 (contador/fonte oficial/runbook)
- [`relatorio.md`](../../../pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md) — verificação legal de 20/10 (LC 214 arts. 10, 12, 14, 31–33, 41, 43–47, 57, 60, 344–349, 509, 542, 544; Decreto 12.955/2026)
- [`verif-2026-10-17-pis-cofins`](../../../pesquisas-legais/verif-2026-10-17-pis-cofins/relatorio.md) — risco de data registrado em 17/10 (itens 18 e 20)
- [`TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md`](../../accounting/fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md) — V5: antecipação no pacote pré-pago; o razão já difere a receita (V7)
- [[M5-ibs-cbs]] — diferido de 03/09 com a trilha (triagem 23/09 P2, verificação 17/10)
- [[D-2026-10-17-AMBIGUIDADES-A1-A10]] — A2 (dispensa de 2026) em leitura provisória, pergunta ao contador no pacote de 17/10
- [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] — decisão que abriu o nó (20/10): Q1 (a) régua F, Q2 (a) PRE-ADRs de F1, Q3 (a) fold R0; proposta em [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md`](../PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md) §4 (tabela F1) — cédula, proposta e referências copiadas idênticas do commit `6ca851d2` da sessão de origem

## O que espera o dono

- Ratificar F-IBS-1..10 (recomendação = a opção completa em cada um; ver §8 do ADR).
- Enviar P-IBS-1..4 ao contador (item 1b do [[D1]]; A2 já está no pacote de 17/10, não enviado).
- Depois: pedido de BRIEF (`sessao-planejamento`) e `executa` por PR (F-IBS-9: 5 PRs).

## Evidência

- `docs/plano/diferidos/M5-ibs-cbs.md` — "⚫ registrado 03/09; ADR exige item 1b do contador" e verificação 17/10 ("CBS plena em 01/01/2027 … risco de data").
- `server/src/features/accounting/models/pisCofinsParams.ts:1-30` — `vigenteAte = '2026-12-31'`, `PIS_COFINS_REVOGACAO_FONTE`.
- `server/src/lib/nfe.ts` — grep `IBSCBS` = 0 (dívida T3).
- `server/prisma/schema.prisma:1668,1793-1811,1984-2030,2744-2790,3016-3040` — `ibsCbsClassTrib`, `ServiceFiscalProfile`, `BankSettlementItem`/`ChargePart`, `TaxAssessment`, `LegalParameter`.
