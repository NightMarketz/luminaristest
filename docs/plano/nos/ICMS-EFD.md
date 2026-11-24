---
id: "ICMS-EFD"
tipo: "regua-f"
dominio: "fiscal"
titulo: "ICMS próprio e ICMS-ST da revenda no regime periódico de apuração (RPA), SP primeiro: livro fiscal por item, NF-e CRT 3, apuração mensal com saldo credor, provisão, ST, CIAP, transição 2029–2033 — e a EFD ICMS/IPI como fase própria (F-ICR-10)"
estado: "planned"
estado_detalhe: "21/11 (planejamento): nó criado pelo §12 do PRE-ADR-ICMS-IPI-EFD (F-ICMS-1 a), porque o gatilho g3 disparou por decisão do dono (go-live de 2027, [[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]]). BRIEF BE-INCR-ICMS-RPA: 45 itens em 9 PRs (PR-0..PR-8) em integration/icms-rpa; forks F-ICR-1..10 RATIFICADOS pelo dono por questionário em 21/11 (nove na recomendação; F-ICR-4 → b, débito nota a nota, contra a recomendação). Sem 'executa'. A NF-e CRT 3 segue recusada (CRT3_ICMS_SEM_SPEC) até o PR-2"
fecha_regua: false
depende_de: ["[[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]]", "[[D-2026-10-12-QUESTIONARIO-DONO]]", "[[X10a]]", "[[X6]]", "[[LEGAL-PARAMS]]", "[[IBS-CBS-2027]]", "[[X14]]", "[[FIN-10]]?", "[[C8]]?"]
autorizacao: "dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\"; questionário do mesmo dia — à pergunta \"Fork do ICMS: … Isso entra no escopo do go-live de 2027?\", a resposta \"Entra, planejar já\" (citação repassada pela sessão de origem e confirmada pelo dono ao iniciar o cartão; [[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]]). Escopo: planejamento (nota + BRIEF + forks), sem 'executa' e sem o BRIEF da EFD (F-ICR-10)"
ancora_sdd: "—"
atualizado: "2026-11-21"
prs: []
perfil_previsto: "opus-medio"
perfil_evidencia: "forks F-ICR-1..10 ratificados em 21/11; opus-medio por PR (família nova de apuração com CAS + cascata + provisão em 2 commits, migração aditiva, parser e montagem de NF-e com regras de rejeição); PR-2 em série com o X10a (nfeMontagem.ts, NfePayloadDto.ts)"
write_set: ["server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/prisma/data/legal_parameters_icms_*.sql", "server/prisma/migrations/**", "server/src/features/accounting/dtos/FiscalProfileDto.ts", "server/src/features/accounting/dtos/ProductFiscalProfileDto.ts", "server/src/features/accounting/dtos/NfePayloadDto.ts", "server/src/features/accounting/dtos/IcmsAssessmentDto.ts", "server/src/features/accounting/models/icms*.ts", "server/src/features/accounting/models/nfeMontagem.ts", "server/src/features/accounting/models/nfeIbsCbsMontagem.ts", "server/src/features/accounting/models/nfePrecondicoes.ts", "server/src/features/accounting/models/obrigacoesPorRegime.ts", "server/src/lib/nfe.ts", "server/src/lib/nfeCost.ts", "server/src/features/accounting/services/NfeImportService.ts", "server/src/features/accounting/services/FiscalDocumentEmissionService.ts", "server/src/features/accounting/services/FiscalBookService.ts", "server/src/features/accounting/services/IcmsAssessmentService.ts", "server/src/features/accounting/services/IcmsCiapService.ts", "server/src/features/accounting/repositories/*FiscalBook*", "server/src/features/accounting/repositories/*IcmsApuracao*", "server/src/features/accounting/policies/**", "server/src/controllers/*Icms*", "scripts/gerar-icms-*.mjs", "server/src/features/accounting/services/InventoryService.ts", "server/src/features/accounting/repositories/*Inventory*", "server/src/features/accounting/services/AccountingPolicyVersionService.ts", "server/src/features/accounting/services/policyVersionApply.ts", "server/src/features/accounting/dtos/AccountingPolicyVersionDto.ts", "docs/accounting/fontes-oficiais/TRANSCRICAO-*ICMS*"]
registros: ["server/prisma/schema.prisma", "server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.icms-assessments.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# ICMS-EFD — ICMS próprio e ICMS-ST da revenda no RPA (SP primeiro)

**Estado:** `planned` — 21/11 (planejamento): BRIEF escrito; forks F-ICR-1..10 ratificados (F-ICR-4 → b contra a recomendação). Sem `executa`.  
**Autorização:** dono, chat, 2026-11-21: "Executa tudo pra liberar e poder rodar em xhigh até terminar" + questionário
do mesmo dia, "Entra, planejar já" — só planejamento ([[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]])  
**Depende de:**
- [[D-2026-11-21-ICMS-RPA-GO-LIVE-2027]] (autorização);
- [[D-2026-10-12-QUESTIONARIO-DONO]] (F-ICMS-0..14 ratificados);
- [[X10a]]: montagem da NF-e/NFC-e, `ProductFiscalProfile` e `FiscalDocument`. O PR-2 edita arquivos dele;
- [[X6]]: crédito do ICMS na entrada;
- [[LEGAL-PARAMS]]: tabelas com vigência;
- [[IBS-CBS-2027]]: molde da apuração mensal;
- [[X14]]: sublimite, F-ICR-1;
- [[FIN-10]], pontilhada: estorno por perda, F-ICR-7;
- [[C8]], pontilhada: CIAP, PR-7.

**Desbloqueia:**
- a NF-e/NFC-e do regime normal (CRT 3), recusada hoje por `CRT3_ICMS_SEM_SPEC`;
- o vencimento do ICMS no calendário do CICLO-FISCAL (PR #1322);
- o ICMS do RPA na simulação (`taxSimulation.ts:368`, montador único);
- a EFD ICMS/IPI (F-ICR-10; lacuna `L-20261121-183239-3b81`).

**Âncora no SDD consolidado:** — (item PROPOSTO em `destino/06-catalogo-completo-de-modulos-16-dominios.md:86`)  
**Régua:** fora da régua de 63; frente do go-live de 2027

## Docs

- [`docs/accounting/BE-INCR-ICMS-RPA-brief.md`](../../accounting/BE-INCR-ICMS-RPA-brief.md) — BRIEF (21/11): 45 itens,
  PR-0..PR-8, forks F-ICR-1..10, tabela do que vale do PRE-ADR depois de 21/11
- [`docs/accounting/PRE-ADR-ICMS-IPI-EFD.md`](../../accounting/PRE-ADR-ICMS-IPI-EFD.md) — PRE-ADR de 10/10 (F-ICMS-0..14
  ratificados em 12/10)
- Dossiê legal: [`pesquisas-legais/icms-revenda-regime-normal-sp/relatorio.md`](../../../pesquisas-legais/icms-revenda-regime-normal-sp/relatorio.md)

## Escopo (resumo do BRIEF)

- **Quem:** Presumido/Real com IE no RPA de SP e, pelo F-ICR-1 (a), o Simples impedido pelo sublimite. UF é dado (chave
  das tabelas); só SP é carregado (F-ICMS-2 a).
- **Fundação:** tabelas legais (alíquota interna de SP, interestadual, NCM sob ST pela Portaria CAT 68/2019, prazo pelo
  CPR do Anexo IV), perfil da unidade (`icmsApuracao` derivado, CPR, contas), livro fiscal por item gravado na entrada
  importada e na saída autorizada (F-ICMS-13 a), parser completo da NF-e.
- **Saída:** ICMS por item "por dentro" (LC 87 art. 13) e montagem CRT 3 (`ICMS00/20/40/41/60`).
- **Apuração:** mensal, por estabelecimento, no quadro do RICMS/SP art. 87 III, com saldo credor transportado (LC 87
  art. 24 III), DIFAL de entrada dentro da apuração (RICMS/SP art. 117), devoluções, estorno e ajustes com fundamento.
  Provisão em 2 commits + reconcile e vencimento pelo CPR (CPR 1200 = dia 20).
- **ST:** substituído completo (PR-5: antecipação do art. 426-A, complemento e ressarcimento atrás da CAT 42/2018) e
  substituto (PR-6, F-ICR-5).
- **Depois:** CIAP (PR-7) e transição 2029–2033 (PR-8).
- **Fora:** IPI, Bloco K, DIFAL de saída a não contribuinte, ICMS do Simples fora do DAS (F-ICMS-10, lacuna na caixa) e
  o gerador da EFD (F-ICR-10, autorização própria).

## Gatilho

- PRE-ADR de 10/10, F-ICMS-0 (c): o nó nasce quando disparar um gatilho. O g3 (*"o dono contrata vertical de
  comércio/indústria contribuinte"*) disparou em 21/11, quando o dono pôs a revenda fora do Simples no go-live de 2027.
- Medição de 21/11 (handoff do gap fiscal): a linha "ICMS próprio e ST da revenda fora do Simples" estava em "não existe;
  ST só como tabela (SP, DRAFT)".
