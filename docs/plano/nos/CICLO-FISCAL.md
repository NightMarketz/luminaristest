---
id: "CICLO-FISCAL"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Ciclo fiscal agendado por competência: calendário de obrigações com prazo da lei, job que calcula a prévia, confirma pela política do tenant, gera Reinf/MIT e avisa vencimento (BE-INCR-CICLO-FISCAL)"
estado: "planned"
estado_detalhe: "21/11 (planejamento): PRE-ADR + BRIEF escritos pela sessao-planejamento (`BE-INCR-CICLO-FISCAL-brief.md`, 23 itens em 4 PRs; forks F-CF-1..10 RATIFICADOS no mesmo dia por questionário ([[D-2026-11-21-CICLO-FISCAL-FORKS]]: F-CF-4 → b e F-CF-5 → b contra a recomendação; F-CF-6 perguntado de novo depois da leitura do PostingService; 3ª rodada F-CF-4b/5b depois da leitura do registrarDas e do SpedEcdRequestSchema); dossiê legal `ciclo-fiscal-prazos`, D01–D10). Abre a lacuna L-20261121-184212-4fdb. A nota nasce antes da ratificação por pedido da sessão de origem (precedente IBS-CBS-2027): **não roteia código até o dono dar 'executa'** (forks já ratificados). Backend do que o `AGENDA-FISCAL` (F4, FE) vai mostrar."
depende_de: ["[[D-2026-11-21-CICLO-FISCAL-FORKS]]", "[[X7]]", "[[X8]]", "[[X9]]", "[[X13]]", "[[X14]]", "[[EFD-REINF]]", "[[IBS-CBS-2027]]", "[[LEGAL-PARAMS]]", "[[TAX-ASSESSMENT-PERIODOS]]", "[[OBS]]", "[[PES-4]]?", "[[RETENCOES-FONTE]]?"]
autorizacao: "dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\" — em resposta à proposta de planejar o job do ciclo fiscal (repassada pela sessão de origem). Escopo desta nota: só planejamento (PRE-ADR/BRIEF, forks ao dono, PR só de .md); código exige 'executa' citável. Forks: dono, chat, 2026-11-21, questionário (D-2026-11-21-CICLO-FISCAL-FORKS)"
ancora_sdd: "—"
atualizado: "2026-11-21"
prs: []
perfil_previsto: "opus-medio"
perfil_evidencia: "forks F-CF-1..10 ratificados em 21/11: opus-medio (clone do par LegalParamsRecalcScheduler/TaxAssessmentRecalcService + modelo com CAS), revisor obrigatório no PR-2 (confirmação automática)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/prisma/data/legal_parameters_prazo_obrigacao_v1.sql", "server/src/lib/prazoObrigacao.ts", "server/src/features/accounting/models/cicloFiscal.ts", "server/src/features/accounting/models/periodosEsperados.ts", "server/src/features/accounting/services/TaxAssessmentPeriodosService.ts", "server/src/features/accounting/repositories/IObrigacaoFiscalOcorrenciaRepository.ts", "server/src/features/accounting/repositories/ObrigacaoFiscalOcorrenciaRepository.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/accounting/services/CicloFiscalService.ts", "server/src/jobs/CicloFiscalScheduler.ts", "server/src/jobs/__tests__/schedulerFailureAlert.test.ts", "server/src/features/accounting/services/SimplesApuracaoService.ts", "server/src/features/accounting/services/IbsCbsAssessmentService.ts", "server/src/features/accounting/services/ReinfService.ts", "server/src/features/accounting/services/MitExportService.ts", "server/src/features/accounting/services/SpedGenerationService.ts", "server/src/features/accounting/services/SpedEcfGenerationService.ts", "server/src/features/accounting/services/SpedEcfRealGenerationService.ts", "server/src/features/accounting/dtos/CicloFiscalDto.ts", "server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts", "server/src/controllers/cicloFiscalController.ts", "server/src/routes/obrigacoes.ts", "server/src/routes/docs/accounting.obrigacoes.paths.ts", "server/src/features/accounting/**/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/server.ts", "server/src/lib/alertWebhook.ts", "server/src/features/accounting/audit/auditCanonical.ts"]
---
# CICLO-FISCAL — ciclo fiscal agendado por competência

**Estado:** `planned` — 21/11: PRE-ADR + BRIEF escritos; forks F-CF-1..10 ratificados no mesmo dia ([[D-2026-11-21-CICLO-FISCAL-FORKS]]). Não roteia código sem "executa".
**Autorização:** dono, chat, 2026-11-21: "Executa tudo pra liberar e poder rodar em xhigh até terminar" (planejamento do job do ciclo fiscal; só `.md`)
**Depende de:** [[X7]], [[X8]], [[X9]], [[X13]], [[X14]], [[EFD-REINF]], [[IBS-CBS-2027]] (serviços de apuração e geração que o job chama), [[LEGAL-PARAMS]] (prazo como linha de parâmetro + o molde `PeloSistema`/PLATFORM), [[TAX-ASSESSMENT-PERIODOS]] (períodos esperados), [[OBS]] (OBS-R11); pontilhadas: [[PES-4]] (folha → CPP/fator r), [[RETENCOES-FONTE]] (retenção sofrida sem digitação)
**Desbloqueia:** `AGENDA-FISCAL` (F4, tela), o checklist do `FECHAMENTO-ASSISTIDO` (apuração confirmada por período), e o aviso por e-mail quando o `EMAIL-TRANSPORT` existir
**Âncora no SDD consolidado:** —

## Escopo

- **Calendário** por PJ × obrigação × período, com o vencimento calculado pela regra da lei (com fonte) e a regra como
  linha de parâmetro legal com vigência. A prorrogação pontual e a calamidade (art. 40-A) entram como linhas novas.
- **Job diário** (clone do `LegalParamsRecalcScheduler` + `TaxAssessmentRecalcService`): materializa as ocorrências,
  checa os pré-requisitos (erro nomeado do serviço dono), calcula a prévia, confirma o que a política do tenant permite
  (opt-in por família, perto do vencimento, período fechado), gera Reinf e MIT, e deixa ao humano PGDAS-D/DAS oficial,
  PVA, encerramento no MIT e transmissão.
- **Rotas:** `GET` do calendário com a situação do prazo derivada na leitura; reprocessar uma; marcação humana auditada;
  entrada da ocorrência (deduções e retenções sofridas).
- **Fora:** a tela (`AGENDA-FISCAL`), o canal de e-mail/notificação, a transmissão (R5, EFD-REINF PR-4), ISS municipal,
  EFD-Contribuições/EFD ICMS-IPI, FGTS/eSocial (com o [[PES-4]]).

## Gatilho

- Lacuna `L-20261121-184212-4fdb` (21/11): "nenhum job agenda o ciclo fiscal". A matriz `obrigacoesPorRegime` existe,
  mas não dispara nada.
- Medição de 21/11 (handoff `2026-11-21-gap-fiscal-contabil.md` §2 C1): fiscal ~47%, e a trava central da automação é
  esta.

## Docs

- [`BE-INCR-CICLO-FISCAL-brief.md`](../../accounting/BE-INCR-CICLO-FISCAL-brief.md) — **PRE-ADR + BRIEF (21/11)**: 23 itens em 4 PRs (`integration/ciclo-fiscal`), contratos Prisma/Zod, forks F-CF-1..10 ratificados, pesquisa Odoo/ERPNext
- [`relatorio.md`](../../../pesquisas-legais/ciclo-fiscal-prazos/relatorio.md) — prazos de DAS, PGDAS-D, IRPJ/CSLL, PIS/COFINS, DCTFWeb, Reinf, ECD, ECF, DEFIS (revogada em 2027), bloco anual do PGDAS-D, DASN-SIMEI; regra de dia não útil de cada um

## O que espera o dono

- Depois: "executa" citável para o BRIEF (PR-0 → PR-3, na `integration/ciclo-fiscal`).
- Pendências externas (BRIEF §9): "expediente bancário" do DAS × feriado municipal (contador); prazo do DAS-MEI.
