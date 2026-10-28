---
id: "IRRF-DISTRIBUICAO"
tipo: "plataforma"
dominio: "fiscal"
titulo: "IRRF na distribuição: dividendos (Lei 15.270/2025) e JCP a 17,5% (LC 224)"
estado: "done"
estado_detalhe: "17/10: BRIEF escrito (BE-INCR-IRRF-DISTRIBUICAO-brief.md, 36 itens em 4 PRs: sócios + parâmetros → dividendos com IRRF → JCP cálculo → JCP lançamento + e-Lalur). Forks F-IRD-1..18 ratificados no mesmo dia ([[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]); 4 contra a recomendação (JCP completo, model próprio de sócios, reter sempre no Simples, lucro da transição conta no limite). 17/10, 2ª rodada (pesquisa das pendências): resolvidos o DARF do JCP (5706, MAFON 2025), a TJLP 2026 (tabela RFB) e o período do JCP (SC Cosit 45/2018). Novo: o STF prorrogou para 31/01/2026 o prazo de aprovação dos lucros de 2025 (ADIs 7.912/7.914) e negou a cautelar do Simples (ADI 7.917). F-IRD-18 ratificado. Para o contador: P1 (deliberação = creditamento?) e P2 (transição no limite), mais as confirmações P3 e P7. 21/10: PR-1 (#794) mergeado. 23/10 (executa: dono, \"Executa todas\"): PR-2 (#863, distribuição com IRRF), PR-3 (#864, cálculo e prévia do JCP) e PR-4 (#865, confirmação, lançamento, e-Lalur e DARF do JCP) abertos e empilhados — backend completo; FE no nó vizinho; 6 lacunas decididas ([[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]])"
depende_de: ["[[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]", "[[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]]"]
autorizacao: "dono, chat, 2026-10-28: \"Pode fechar as lacunas então?\" com a escolha \"Sessões paralelas\" — executa só a emenda do item 1 da cédula D-2026-10-28-LACUNAS-EXECUTA-27-28 (409 na remoção de sócio com distribuição), sem merge · antes: dono, chat, 2026-10-23: \"Executa todas\" (sobre a lista cujo item 4 era \"IRRF-DISTRIBUICAO PR-2 a PR-4\") — executa os PR-2, PR-3 e PR-4, sem merge · antes: dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — executa só o PR-1 · dono, chat, 2026-10-17: \"Autorizo planejar o BRIEF de <NÓ> — sessao-planejamento, sem 'executa'\" + \"Pode decidir vc memso\" (o agente escolheu este nó) — só o BRIEF; forks ratificados no questionário do mesmo dia ([[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]) — sem 'executa' · antes: dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota"
ancora_sdd: "—"
atualizado: "2026-10-28"
prs: ["#761", "#794", "#863", "#864", "#865", "#956"]
perfil_previsto: "opus-medio"
perfil_evidencia: "4 PRs empilhados com 2 commits + CAS + reconcile no molde do X7, cálculo pro rata die e integração com o e-Lalur; regras legais já fechadas no BRIEF, sem fork aberto"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/accounting/models/partner*", "server/src/features/accounting/models/profitDistribution*", "server/src/features/accounting/models/interestOnEquity*", "server/src/features/accounting/dtos/PartnerDto.ts", "server/src/features/accounting/dtos/ProfitDistributionDto.ts", "server/src/features/accounting/dtos/InterestOnEquityDto.ts", "server/src/features/accounting/services/PartnerService.ts", "server/src/features/accounting/services/ProfitDistributionService.ts", "server/src/features/accounting/services/InterestOnEquityService.ts", "server/src/features/accounting/repositories/*Partner*", "server/src/features/accounting/repositories/*ProfitDistribution*", "server/src/features/accounting/repositories/*InterestOnEquity*", "server/src/features/accounting/policies/**", "server/src/controllers/*Partner*", "server/src/controllers/*ProfitDistribution*", "server/src/controllers/*InterestOnEquity*", "server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts", "server/src/features/accounting/services/CashFlowReportService.ts", "server/src/features/accounting/dtos/FiscalProfileDto.ts", "server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/features/legalParameters/models/formatoLinha.ts", "server/src/features/accounting/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.partners.paths.ts", "server/src/routes/docs/accounting.profit-distributions.paths.ts", "server/src/routes/docs/accounting.jcp.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# IRRF-DISTRIBUICAO — IRRF na distribuição: dividendos (Lei 15.270/2025) e JCP a 17,5% (LC 224)

**Estado:** `done` — 17/10: BRIEF escrito (BE-INCR-IRRF-DISTRIBUICAO-brief.md, 36 itens em 4 PRs: sócios + parâmetros → dividendos com IRRF → JCP cálculo → JCP lançamento + e-Lalur). Forks F-IRD-1..18 ratificados no mesmo dia ([[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]); 4 contra a recomendação (JCP completo, model próprio de sócios, reter sempre no Simples, lucro da transição conta no limite). 17/10, 2ª rodada (pesquisa das pendências): resolvidos o DARF do JCP (5706, MAFON 2025), a TJLP 2026 (tabela RFB) e o período do JCP (SC Cosit 45/2018). Novo: o STF prorrogou para 31/01/2026 o prazo de aprovação dos lucros de 2025 (ADIs 7.912/7.914) e negou a cautelar do Simples (ADI 7.917). F-IRD-18 ratificado. Para o contador: P1 (deliberação = creditamento?) e P2 (transição no limite), mais as confirmações P3 e P7. 21/10: PR-1 (#794) mergeado. 23/10 (executa: dono, "Executa todas"): PR-2 (#863, distribuição com IRRF), PR-3 (#864, cálculo e prévia do JCP) e PR-4 (#865, confirmação, lançamento, e-Lalur e DARF do JCP) abertos e empilhados — backend completo; FE no nó vizinho; 6 lacunas decididas ([[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]])  
**PRs:** #761, #794, #863, #864, #865, #956  

## Escopo

- Dividendos: Lei 9.250 art. 6º-A, incluído pela Lei 15.270/2025: IRRF de 10% sobre o que passar de R$ 50 mil/mês por beneficiário PF (verificado [D07] do dossiê IRPJ).
  - **[ERRATA 17/10 — BRIEF §2 L1]** O IRRF de 10% incide sobre o **total** pago no mês quando ele passa de R$ 50 mil, e não só sobre o excedente (art. 6º-A caput: "sobre o total do valor pago"; P&R RFB item 4). Dossiê [`irrf-distribuicao`](../../../pesquisas-legais/irrf-distribuicao/relatorio.md) [D05].
- JCP: IRRF de 17,5% (Lei 9.249 art. 9º §2º com a redação da LC 224/2025; efeitos em 01/01/2026 pela LC 224 art. 14 III, verificado [D01][D02]). Hoje só há nota no BRIEF CSLL-LC224 §8, que cita a IN 2.315; a data que vale é a da lei.
- Saída esperada: lançamento da retenção + DCTFWeb/obrigação do código de receita (códigos DCTF não verificados).
  - 17/10 (BRIEF): o código dos dividendos é 1841 (P&R RFB itens 11 e 23). A declaração (EFD-Reinf R-4000 → DCTFWeb) ficou fora: não há Reinf no código.

## Gatilho

- Pedido do dono. Já vigente (2026): o pró-labore/distribuição do salão pode cruzar o teto.

## Docs

- Dossiê [`verif-2026-10-17-irpj-csll`](../../../pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
- BRIEF [`BE-INCR-IRRF-DISTRIBUICAO-brief.md`](../../accounting/BE-INCR-IRRF-DISTRIBUICAO-brief.md) (17/10) e dossiê [`irrf-distribuicao`](../../../pesquisas-legais/irrf-distribuicao/relatorio.md).
- Forks: [[D-2026-10-17-IRRF-DISTRIBUICAO-FORKS]]. Lacunas do PR-2 ao PR-4 (23/10): [[D-2026-10-23-IRRF-DISTRIBUICAO-LACUNAS]].
- 21/10 (PR-1, #794): plano padrão com 2.1.7 Obrigações com Sócios (.01 dividendos, .02 JCP, .03 IRRF a recolher), 2.3.2.01 capital,
  2.3.3.01 reserva legal e 4.3.4 JCP (dono, chat, 21/10: "(a) com 2.1.7.03"). Referencial conferido na tabela dinâmica da ECF
  ([`irrf-referencial-sped`](../../../pesquisas-legais/irrf-referencial-sped/relatorio.md)). **PROVISÓRIO por decisão do dono
  (21/10), a revisar com usuários e contador depois do app completo:** (1) o capital social é uma conta única, ligada a
  2.03.01.01.01 (residentes); falta a subconta 2.3.2.01.02 → 2.03.01.02.01 para sócio estrangeiro / RDE-IED; (2) o referencial
  do plano padrão é mapeado fora dos kits, em todo escopo (`ReferentialMappingService.ensureCanonicalMappings`).

## Emendas

- 28/10 — item 1 da cédula `D-2026-10-28-LACUNAS-EXECUTA-27-28` (fork "Bloquear remoção (Recomendado)"; cédula em
  `docs/plano/decisoes/` na branch do PR #937, ainda sem merge): `PartnerService.remove` responde **409
  `SOCIO_COM_DISTRIBUICAO`** quando o sócio tem evento de distribuição de lucros ou alocação de JCP em qualquer status,
  com a checagem dentro do `runTransaction`, antes do `softDelete`. Linha soft-deletada (o evento, ou o cálculo do JCP)
  não conta. A mensagem manda registrar a saída em `saidaEm`. A leitura vai por `existsDoSocio`
  (`IProfitDistributionRepository`) e `existsAlocacaoDoSocio` (`IInterestOnEquityRepository`); a porta
  `IPartnerRepository` não muda, e o 400 `REINF_SOCIO_REMOVIDO` do EFD-REINF continua para dado legado.
