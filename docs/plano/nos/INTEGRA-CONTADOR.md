---
id: "INTEGRA-CONTADOR"
tipo: "regua-f"
dominio: "fiscal"
titulo: "Entrega à Receita pela API Integra Contador (Serpro): PGDAS-D + DAS, encerramento do MIT, DARF pelo Sicalc e consulta de pagamento, BYOK (PJ ou escritório procurador) com A1 guardado cifrado — reabre a R5"
estado: "planned"
estado_detalhe: "21–22/11 (planejamento): R5 reaberta pelo dono ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]). Pesquisa na documentação oficial do Serpro (26 docs com hash, pesquisas-legais/integra-contador-serpro). PRE-ADR-INTEGRA-CONTADOR (Accepted 22/11) + BRIEF BE-INCR-INTEGRA-CONTADOR: 32 itens em 7 PRs (PR-0..PR-6) em integration/integra-contador. Forks F-IC-1..8 RATIFICADOS pelo dono por questionário: F-IC-1 BYOK nos dois modos (PJ ou escritório procurador); F-IC-2 → b, contra a recomendação: A1 cifrado no servidor, para todos os usos ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]); F-IC-8 → b, contra a recomendação: DEFIS e DASN-SIMEI no PR-2; os demais na recomendação. Produção espera o parecer de advogado sobre a guarda (RB-IC-0). Reinf, ECD e ECF não estão na API. Sem 'executa'."
fecha_regua: false
depende_de: ["[[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]", "[[R5]]", "[[X9]]", "[[X14]]", "[[X7]]", "[[IRRF-DISTRIBUICAO]]", "[[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]", "[[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]", "[[X10i]]?", "[[PES-4]]?"]
autorizacao: "dono, 2026-11-21, questionário — à pergunta \"Fork R5: a integração com a Receita pela API Integra Contador (Serpro) está adiada… Reabrir para planejar a entrega automática?\", a resposta \"Reabrir e planejar\"; chat do mesmo dia: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\" (citação repassada pela sessão de origem e confirmada pelo dono ao iniciar o cartão). Escopo: planejamento (nota + PRE-ADR + BRIEF + forks), sem 'executa'; contratação segue com o dono"
ancora_sdd: "§III.2 quadro"
atualizado: "2026-11-22"
prs: ["#1329"]
perfil_previsto: "opus-medio"
perfil_evidencia: "forks F-IC-1..8 ratificados em 21–22/11; opus-medio por PR (porta + adaptador HTTP no molde DfeEmissorPort, mTLS com A1 em memória, máquina de idempotência com 504 indeterminado, mapper do PGDAS-D por atividade); produção atrás do RB-IC-0 (parecer)"
write_set: ["server/src/features/accounting/receita/**", "scripts/integra-contador-trial.mjs", "server/prisma/migrations/**", "server/src/features/accounting/dtos/ReceitaCredencialDto.ts", "server/src/features/accounting/dtos/DarfDto.ts", "server/src/features/accounting/dtos/MitExportDto.ts", "server/src/features/accounting/dtos/SimplesDto.ts", "server/src/features/accounting/services/ReceitaCredencialService.ts", "server/src/features/accounting/services/ReceitaRequisicaoService.ts", "server/src/features/accounting/services/SimplesEntregaService.ts", "server/src/features/accounting/services/SimplesApuracaoService.ts", "server/src/features/accounting/services/DarfService.ts", "server/src/features/accounting/services/ReceitaPagamentoService.ts", "server/src/features/accounting/services/MitExportService.ts", "server/src/features/accounting/services/MitEncerramentoService.ts", "server/src/features/accounting/services/TaxAssessmentService.ts", "server/src/features/accounting/services/ProfitDistributionService.ts", "server/src/features/accounting/services/InterestOnEquityService.ts", "server/src/features/accounting/services/SimplesDeclaracaoService.ts", "server/src/features/accounting/services/FiscalCertificateService.ts", "server/src/features/accounting/repositories/FiscalCertificateRepository.ts", "server/src/features/accounting/repositories/ReceitaCredencialRepository.ts", "server/src/features/accounting/repositories/ReceitaRequisicaoRepository.ts", "server/src/controllers/ReceitaController.ts", "server/src/features/accounting/policies/AccountingPolicy.ts", "server/src/features/accounting/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/prisma/schema.prisma", "server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.receita.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/test/helpers/db.ts"]
---
# INTEGRA-CONTADOR — entrega à Receita pela API Integra Contador (Serpro)

**Estado:** `planned` — 21–22/11 (planejamento): R5 reaberta pelo dono ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]). Pesquisa na documentação oficial do Serpro (26 docs com hash, pesquisas-legais/integra-contador-serpro). PRE-ADR-INTEGRA-CONTADOR (Accepted 22/11) + BRIEF BE-INCR-INTEGRA-CONTADOR: 32 itens em 7 PRs (PR-0..PR-6) em integration/integra-contador. Forks F-IC-1..8 RATIFICADOS pelo dono por questionário: F-IC-1 BYOK nos dois modos (PJ ou escritório procurador); F-IC-2 → b, contra a recomendação: A1 cifrado no servidor, para todos os usos ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]); F-IC-8 → b, contra a recomendação: DEFIS e DASN-SIMEI no PR-2; os demais na recomendação. Produção espera o parecer de advogado sobre a guarda (RB-IC-0). Reinf, ECD e ECF não estão na API. Sem 'executa'.  
**Autorização:** dono, 2026-11-21, questionário: *"Reabrir e planejar"*. No chat do mesmo dia: *"Executa tudo pra
liberar e poder rodar em xhigh até terminar"*. Cobre só planejamento ([[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]]).
**Depende de:**
- [[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]] (autorização) e [[R5]] (a decisão que se reabre);
- [[X9]]: `montarArquivoMit`, `MitExport`;
- [[X14]]: espelho do PGDAS-D e `registrarDas`;
- [[X7]]: apurações confirmadas;
- [[IRRF-DISTRIBUICAO]]: DARF 1841/5706;
- [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] (BYOK: o cliente contrata) e [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]], com o item 3 superado por [[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]] (A1 guardado cifrado; produção espera o parecer);
- [[X10i]], pontilhada (o PR-1 já está em `main`): o `FiscalCertificate` (A1 cifrado por unidade), usado no mTLS com o SAPI (F-IC-2 → b);
- [[PES-4]], pontilhada: a folha de 12 meses que o PGDAS-D exige desde o PA 11/2026.

**Desbloqueia:** o passo "entregar" do CICLO-FISCAL (PR #1322; o PR-6 deste BRIEF liga os dois), a guia (DAS/DARF)
que hoje não é gerada e a baixa por consulta de pagamento.
**Âncora no SDD consolidado:** §III.2 quadro (linha da R5).

## O que a API entrega (resumo; detalhe no PRE-ADR §2)

- **Sim:** PGDAS-D transmitido com comparação exata do nosso valor, ou só calculado; DAS; encerramento do MIT com o
  mesmo JSON do arquivo; DCTFWeb (XML assinado); DARF pelo Sicalc com multa, juros e Pix; consulta de pagamentos.
- **Não:** EFD-Reinf, ECD, ECF e eSocial. Também não há ambiente de homologação com dado real: o trial é mock.
- **Custo:** por chamada, em faixas. Na 1ª faixa: consulta R$ 0,24, emissão R$ 0,32, declaração R$ 0,40. O
  Simples sai a ~R$ 1 por PJ por mês. Só 200, 202 e 403 são cobrados.
- **Identidade:** o token exige o e-CNPJ do contratante no TLS e o NI igual ao do certificado. Sem procuração quando
  autor = contribuinte.

## Docs

- [`PRE-ADR-INTEGRA-CONTADOR.md`](../../adr/PRE-ADR-INTEGRA-CONTADOR.md) — pesquisa, restrições, desenho da porta, o
  que vira automático, forks F-IC-1..8 e a ratificação (§10)
- [`BE-INCR-INTEGRA-CONTADOR-brief.md`](../../accounting/BE-INCR-INTEGRA-CONTADOR-brief.md) — BRIEF: 32 itens, 7 PRs,
  contratos, write-set
- [`pesquisas-legais/integra-contador-serpro/relatorio.md`](../../../pesquisas-legais/integra-contador-serpro/relatorio.md)
  — dossiê das fontes oficiais (21/11/2026)

## Linhas de origem

> A R5 nasceu na cédula #319 (`CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md:25,36`): *"Adiar até X7 destravar —
> sem desenho de adaptador agora"*. Foi reaberta em 21/11 por [[D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR]].
