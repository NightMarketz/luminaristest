---
id: "EFD-REINF"
tipo: "regua-f"
dominio: "fiscal"
titulo: "EFD-Reinf a partir das retenções do tenant: XML dos eventos R-1000, R-2010/R-2099, R-4010/R-4020/R-4099 (leiaute 2.1.x) com lote registrado, relatório de conferência e porta de transmissão nomeada (materializa a metade Reinf do PES-2)"
estado: "planned"
estado_detalhe: "20/10: PRE-ADR **Proposed** (ADR-INCR-EFD-REINF) pela sessao-planejamento sob a Q2 (a) da proposta de 20/10 — forks F-REINF-1..5 PENDENTES, P-REINF-1..5 (runbook do 1º lote, tabela de natureza do rendimento, contador). **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. Depende em conteúdo do RETENCOES-FONTE (consome o resumo mensal D8) e do IRRF-DISTRIBUICAO (dividendos 1841, JCP 5706). IN RFB 2.043 lida na visão vigente do Sijut (série R-4000 substitui a DIRF para fatos desde 01/01/2025, art. 3º § 1º I; sem fato ⇒ dispensada, art. 4º; prazo dia 15, art. 6º). Leiaute 2.1.2 e Manual NÃO lidos em fonte oficial (portal SPED ECONNREFUSED) — insumo ausente. Hoje: 0 linhas de Reinf no código"
depende_de: ["[[RETENCOES-FONTE]]", "[[IRRF-DISTRIBUICAO]]", "[[X9]]?", "[[X10i]]?"]
autorizacao: "dono, chat, 2026-10-20: \"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a).\" — Q2 (a) = PRE-ADRs de F1 por sessao-planejamento, sem 'executa' (cédula D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS, sessão de origem). Antes: F-PES-4 e F-PES-5 (b), ratificados em lote (dono, chat, 2026-10-12, [[D-2026-10-12-QUESTIONARIO-DONO]]) — só o PRE-ADR de pessoal, sem nó. Só o PRE-ADR e esta nota"
ancora_sdd: "§M5 · §M7.1"
atualizado: "2026-10-20"
prs: []
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: 5 forks pendentes (forma da saída, transmissão com o FiscalCertificate, fatiamento, dividendos isentos, tabela de natureza do rendimento) e o leiaute oficial ainda não lido; depois deles: opus-medio (serializer puro no molde do ECD + gate de cobertura + ReinfBatch; o adaptador de transmissão, se F-REINF-2 a, é PR próprio)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/lib/reinf.ts", "server/src/lib/__tests__/reinf*", "server/src/features/accounting/models/reinf*", "server/src/features/accounting/dtos/ReinfDto.ts", "server/src/features/accounting/services/ReinfService.ts", "server/src/features/accounting/services/DataExchangeExportService.ts", "server/src/features/accounting/repositories/*Reinf*", "server/src/features/accounting/policies/**", "server/src/controllers/*Reinf*", "server/src/features/accounting/models/obrigacoesPorRegime.ts", "server/src/features/accounting/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.reinf.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# EFD-REINF — EFD-Reinf a partir das retenções do tenant (série R-4000 + R-2010)

**Estado:** `planned` — 20/10: PRE-ADR **Proposed** (ADR-INCR-EFD-REINF); forks F-REINF-1..5 PENDENTES; não roteia até a ratificação; sem BRIEF, sem 'executa'  
**Autorização:** dono, chat, 2026-10-20: "Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)." — Q2 (a): PRE-ADR por sessao-planejamento, sem 'executa'  
**Depende de:** [[RETENCOES-FONTE]] (dura: resumo mensal D8, `TaxWithholding` MADE), [[IRRF-DISTRIBUICAO]] (dura: dividendos 1841 e JCP 5706, sócios com CPF), [[X9]] (pontilhada: a DCTFWeb consome a Reinf — IN 2.237 art. 5º), [[X10i]] (pontilhada: `FiscalCertificate` para a transmissão, F-REINF-2)  
**Desbloqueia:** linha `REINF` da matriz de obrigações; `AGENDA-FISCAL` (F4) mostra o prazo  
**Âncora no SDD consolidado:** §M5 · §M7.1  
**Régua:** seção **F1** da régua F (Q1 (a), 20/10) — não entra na régua de 63

## Escopo (D1–D9 do ADR)

- Eventos (F-PES-5 b herdado): R-1000 (contribuinte), R-4020 (retenções a PJ), R-4010 (dividendos/JCP a PF — outras retenções de PF ficam no nó de pessoal), R-4099, R-2010/R-2099 (INSS 11% de cessão de mão de obra tomada), R-9000 (exclusão, só com transmissão). Os demais `NAO_SE_APLICA` com fonte.
- Fonte = retenções **feitas** (`direction = MADE`) do [[RETENCOES-FONTE]] + resumos do [[IRRF-DISTRIBUICAO]]; retenções sofridas são da Reinf do cliente, não do tenant.
- Forma: `lib/reinf.ts` puro (molde do ECD: builder por evento citando o Manual, `__selfCheck`, gate de cobertura de eventos), XML por evento em lote, não assinado na fase 1.
- `ReinfBatch` imutável (hash + ids de origem, sem conteúdo nem PII), `defasado` na leitura; retificador/R-9000 no lote seguinte.
- Período mensal; prazo dia 15 do mês seguinte (IN 2.043 art. 6º), isentos de dividendos trimestral (§ 3º). Nunca "sem movimento" (a Reinf dispensa sem fato, art. 4º).
- Matriz de obrigações ganha `REINF` = `CONDICIONAL` em todos os regimes (art. 3º VIII + § 1º; art. 4º).
- Porta `ReinfTransmissorPort` nomeada; adaptador webservice com o `FiscalCertificate` (já cifrado desde o X10i PR-1) é o fork F-REINF-2 — recomendação (a), condicionada ao leiaute lido e a um tenant que retenha.
- Fora: eSocial e retenções de PF por trabalho/aluguel (PRE-ADR de pessoal), R-2020, CPRB, DCTFWeb ([[X9]]), IBS/CBS ([[IBS-CBS-2027]]).

## Gatilho

- Obrigação vigente: quem pagou/creditou rendimento com retenção de IR declara pela série R-4000 desde os fatos de 01/01/2025 (IN RFB 2.043 art. 3º VIII e § 1º I, red. IN 2.181/2024 — lida no Sijut em 20/10). Hoje o tenant "cumpre fora sem que o sistema saiba" (PRE-ADR de pessoal §6).
- Lacuna medida em 20/10 (proposta §3.3): `reinf` = 0 arquivos.

## Docs

- [`ADR-INCR-EFD-REINF.md`](../../adr/ADR-INCR-EFD-REINF.md) — **PRE-ADR Proposed (20/10)**: D1–D9 (eventos × fonte, prazo, forma, lote, retificação, matriz, PII), esqueleto de 12 comportamentos em 4 PRs, contratos (`ReinfBatch`, builders, porta), forks F-REINF-1..5 PENDENTES, P-REINF-1..5
- [`relatorio.md`](../../../pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md) — verificação legal de 20/10 (IN 2.043 arts. 1º–10 no Sijut; lacuna: leiaute 2.1.2/Manual)
- [`ADR-INCR-RETENCOES-FONTE.md`](../../adr/ADR-INCR-RETENCOES-FONTE.md) — D8 (resumo mensal por código) que este nó consome
- [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md`](../../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) — F-PES-4 (fase 1 sem transmissão) e F-PES-5 (b) (eventos), ratificados 12/10 em [[D-2026-10-12-QUESTIONARIO-DONO]]
- [`ADR-INCR-DCTFWEB-MIT.md`](../../adr/ADR-INCR-DCTFWEB-MIT.md) — D7/D9 e F-X9-6 (DCTFWeb na matriz, débitos vindos da Reinf)
- [`BE-INCR-IRRF-DISTRIBUICAO-brief.md`](../../accounting/BE-INCR-IRRF-DISTRIBUICAO-brief.md) — "a declaração (EFD-Reinf R-4000 → DCTFWeb) ficou fora: não há Reinf no código"
- Decisão que abriu o nó: `D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS` (sessão de origem, 20/10; entra no vault com o fold R0)

## O que espera o dono

- Ratificar F-REINF-1..5 (recomendação = opção completa: XML + relatório + lote; transmissão com o certificado como PR-4 condicionado).
- Ler/obter o leiaute 2.1.2 e o Manual em fonte oficial (portal SPED) — insumo ausente que bloqueia o BRIEF.
- P-REINF-3/4 ao contador (junto dos P-RET do [[RETENCOES-FONTE]]); P-REINF-1 é runbook humano (1º lote real).
- Ordem: BRIEF só depois do BRIEF do [[RETENCOES-FONTE]]; `executa` por PR.

## Evidência

- grep `reinf` em `server/src` = 0 (V, 20/10).
- `server/prisma/schema.prisma` — `FiscalCertificate` (X10i PR-1): chave PKCS#8 e DER cifrados, 1 por (userId, unitId).
- `server/src/lib/sped.ts:1-40`, `server/src/lib/ecf.ts:52-466` — molde de serializer puro com `__selfCheck` e cobertura.
- `server/src/features/accounting/models/obrigacoesPorRegime.ts:19-25` — `ObrigacaoSped` sem `REINF`.
