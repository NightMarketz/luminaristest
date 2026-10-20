---
id: "RETENCOES-FONTE"
tipo: "regua-f"
dominio: "financeiro"
titulo: "Retenções na fonte feitas e sofridas pelo tenant — IRRF, CSRF (só CSLL em 2027), INSS 11% e ISS retido em AP e AR, perfil por contraparte × natureza, título de imposto por código, resumo mensal (materializa o PES-2)"
estado: "planned"
estado_detalhe: "20/10: PRE-ADR **Proposed** (ADR-INCR-RETENCOES-FONTE) pela sessao-planejamento sob a Q2 (a) da proposta de 20/10 — forks F-RET-1..9 PENDENTES, P-RET-1..6 ao contador/fonte oficial. **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. Achado legal de 20/10: a CSRF 4,65% vale só até 31/12/2026 — LC 214 art. 509 (efeitos art. 544 III) deixa só CSLL 1% a partir de 01/01/2027; o Simples como pagador não retém CSRF (Lei 10.833 art. 30 § 2º) e pagamento a optante não sofre (art. 32 III). Relação com o PES-2 (F-PES-1 a, ratificado 12/10, sem nó em nos/): este nó + EFD-REINF o materializam (F-RET-1). Hoje: Payable sem campo de retenção (grep 0); só retenções sofridas informadas à mão (X7 item 15, X8, ISS tpRetISSQN)"
depende_de: ["[[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]", "[[FIN-01]]", "[[FIN-02]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]?", "[[X7]]?", "[[D1]]?"]
autorizacao: "dono, chat, 2026-10-20: \"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a).\" — Q2 (a) = PRE-ADRs de F1 por sessao-planejamento, sem 'executa' (cédula D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS, sessão de origem). Antes: F-PES-1 (a) PES-2 e F-PES-5 (b), ratificados em lote (dono, chat, 2026-10-12, [[D-2026-10-12-QUESTIONARIO-DONO]]) — só o PRE-ADR de pessoal, sem nó. Só o PRE-ADR e esta nota"
ancora_sdd: "§M7.1"
atualizado: "2026-10-20"
prs: []
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: 9 forks pendentes (id × PES-2, fatiamento, escopo do lado pagador, CSRF na baixa parcial, regime do beneficiário, mínimo do IRRF, PF, ligação X7/X8, conta do ISS sofrido); depois deles: opus-medio (2 models novos, kind novo em PayablePayment/ReceivableReceipt, legs novas nos entries de AP/AR na mesma tx, título de imposto por competência)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/accounting/models/withholding*", "server/src/features/accounting/models/retencaoParams.ts", "server/src/features/accounting/dtos/PayableDto.ts", "server/src/features/accounting/dtos/ReceivableDto.ts", "server/src/features/accounting/dtos/CounterpartyDto.ts", "server/src/features/accounting/dtos/WithholdingProfileDto.ts", "server/src/features/accounting/services/PayableService.ts", "server/src/features/accounting/services/ReceivableService.ts", "server/src/features/accounting/services/CounterpartyService.ts", "server/src/features/accounting/services/WithholdingService.ts", "server/src/features/accounting/services/TaxAssessmentService.ts", "server/src/features/accounting/services/PisCofinsAssessmentService.ts", "server/src/features/accounting/repositories/*Withholding*", "server/src/features/accounting/repositories/*Payable*", "server/src/features/accounting/repositories/*Receivable*", "server/src/features/accounting/policies/**", "server/src/controllers/*Withholding*", "server/src/controllers/*Payable*", "server/src/controllers/*Receivable*", "server/src/features/accounting/sync/mappers/*Payable*", "server/src/features/accounting/sync/mappers/*Receivable*", "server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts", "server/src/features/accounting/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.withholdings.paths.ts", "server/src/routes/docs/accounting.payables.paths.ts", "server/src/routes/docs/accounting.receivables.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# RETENCOES-FONTE — Retenções na fonte feitas e sofridas pelo tenant (AP e AR)

**Estado:** `planned` — 20/10: PRE-ADR **Proposed** (ADR-INCR-RETENCOES-FONTE); forks F-RET-1..9 PENDENTES; não roteia até a ratificação; sem BRIEF, sem 'executa'  
**Autorização:** dono, chat, 2026-10-20: "Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)." — Q2 (a): PRE-ADR por sessao-planejamento, sem 'executa'  
**Depende de:** [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] (cédula Q2 (a)), [[FIN-01]] (Payable/PayablePayment), [[FIN-02]] (Receivable/ReceivableReceipt), [[LEGAL-PARAMS]] (tabela `RETENCAO` + códigos), [[IRRF-DISTRIBUICAO]] (pontilhada: molde do resumo mensal/DARF, função de vencimento), [[X7]] (pontilhada: item 15 consome as sofridas), [[D1]] (pontilhada: item 1b — P-RET-1..6)  
**Desbloqueia:** `EFD-REINF` (R-4010/R-4020/R-2010 nascem do resumo mensal D8)  
**Âncora no SDD consolidado:** §M7.1  
**Régua:** seção **F1** da régua F (Q1 (a), 20/10) — não entra na régua de 63

## Escopo (D1–D10 do ADR)

- Um model `TaxWithholding` para os dois lados: **feita** (AP, o tenant é fonte pagadora) e **sofrida** (AR, o cliente reteve).
- Fato gerador **por tributo**, como a lei: IRRF no crédito/reconhecimento (RIR art. 714 "pagas ou creditadas"), CSRF na baixa (Lei 10.833 art. 30 "pagamentos efetuados"), INSS 11% na emissão da NF (Lei 8.212 art. 31), ISS no documento.
- Alíquotas, mínimos e códigos em `legal_parameters` tabela `RETENCAO` com vigência: 4,65% até 2026-12-31; **só CSLL 1% desde 2027-01-01** (LC 214 art. 509 / 544 III).
- Quem retém de quem = dado: pagador Simples/MEI não retém CSRF (art. 30 § 2º); beneficiário optante não sofre CSRF (art. 32 III); cooperativa só CSLL; PF ⇒ nó de pessoal.
- `WithholdingProfile` por contraparte × natureza do serviço (IRRF/CSRF/INSS/ISS + `codMun` + alíquota informada), com fonte do enquadramento; o título só sobrescreve **para menos**, com motivo.
- Título de imposto = `Payable` da União/INSS/município por (competência, código), vencimento legal (IRRF/CSRF: último dia útil do 2º decêndio do mês seguinte — Lei 11.196 art. 70 I "e", Lei 10.833 art. 35; INSS: dia 20), na **mesma tx** do título/pagamento de origem.
- Legs no entry de reconhecimento e de baixa (`kind = WITHHOLDING` em `PayablePayment`/`ReceivableReceipt`, molde `DISCOUNT`).
- Resumo mensal feito/sofrido por código (molde do IRRF-DISTRIBUICAO) — insumo do `EFD-REINF` e sugestão para X7 item 15 / X8 / ISS Fase C.
- Fora: PF e eSocial (PRE-ADR de pessoal), dividendos/JCP ([[IRRF-DISTRIBUICAO]]), órgão público pagador, CBS/IBS ([[IBS-CBS-2027]]), transmissão Reinf (`EFD-REINF`).

## Gatilho

- Lacuna medida em 20/10 (proposta §3.1): PCC/IRRF/INSS ⬜; `Payable` sem campo de retenção; a Reinf (obrigatória para quem retém — IN RFB 2.043 art. 3º VIII e § 1º) não tem fonte no sistema.
- Data legal: **01/01/2027** — mudança da CSRF (LC 214 art. 509). Sem vigência na tabela, o tenant reteria Cofins/PIS inexistentes.

## Docs

- [`ADR-INCR-RETENCOES-FONTE.md`](../../adr/ADR-INCR-RETENCOES-FONTE.md) — **PRE-ADR Proposed (20/10)**: D1–D10, esqueleto de 15 comportamentos em 4 PRs, contratos (`WithholdingProfile`, `TaxWithholding`, `calcularRetencoes`), forks F-RET-1..9 PENDENTES, P-RET-1..6; pesquisa de código-fonte (ERPNext `tax_withholding_category.py`, Odoo `l10n_account_withholding_tax`, OCA `l10n_br_account_withholding`) em §11
- [`relatorio.md`](../../../pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md) — verificação legal de 20/10 (RIR arts. 714–723; Lei 10.833 arts. 29–36 + LC 214 art. 509; Lei 8.212 art. 31; LC 116 art. 6º; Lei 9.430 arts. 64/67; Lei 11.196 art. 70); ambiguidades A–C ao contador
- [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](../../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) — §2.1 "retenções hoje", F-PES-1 (a) PES-2, F-PES-5 (b) (ratificados 12/10 em [[D-2026-10-12-QUESTIONARIO-DONO]])
- [`BE-INCR-IRRF-DISTRIBUICAO-brief.md`](../../accounting/BE-INCR-IRRF-DISTRIBUICAO-brief.md) — molde do resumo mensal do DARF (L8, item 21)
- [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] — decisão que abriu o nó (20/10): Q2 (a) PRE-ADRs de F1; proposta em [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md`](../PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md) §3.1 (linha "Retenções") e §4 (tabela F1)

## O que espera o dono

- Ratificar F-RET-1..9 (recomendação = opção completa; o mínimo está em cada linha com o que deixa aberto).
- Enviar P-RET-1..6 ao contador (item 1b do [[D1]]): IRRF do Simples como tomador; mínimo de R$ 10 no IRRF de PJ; fato gerador por tributo; contas do referencial; cessão de mão de obra e subitens retidos no município.
- Depois: BRIEF e `executa` por PR (F-RET-2: 4 PRs).

## Evidência

- `server/prisma/schema.prisma:1114-1150, 1178-1197, 1206-1232, 1249-1270, 1373-1400` — Payable/PayablePayment/Receivable/ReceivableReceipt/Counterparty sem retenção.
- grep `reten|withhold` em `PayableDto.ts`, `PayableService.ts` = 0.
- `server/src/features/accounting/models/issCompetencia.ts:18,61` — `retido = tpRetISSQN === 2` (sofrido, lido da NFS-e).
- Proposta de 20/10 §3.1, linha "Retenções PCC/IRRF/INSS/ISS": ⬜ (V).
