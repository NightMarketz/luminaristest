---
id: "NFSE-PAULISTANA"
tipo: "plataforma"
dominio: "fiscal"
titulo: "NFS-e municipal de São Paulo (Nota Paulistana) emitida pelo produto: adaptador `paulistana` no DfeEmissorPort, assinado e transmitido pelo assinador local (BE-INCR-NFSE-PAULISTANA)"
estado: "planned"
estado_detalhe: "21/11 (planejamento): PRE-ADR + BRIEF escritos pela sessao-planejamento (`BE-INCR-NFSE-PAULISTANA-brief.md`, 37 itens em PR-0..PR-4 + PR-M numa `integration/nfse-paulistana`; forks F-NSP-0..12 RATIFICADOS no mesmo dia por questionário ([[D-2026-11-21-NFSE-PAULISTANA-FORKS]]): F-NSP-2 → b contra a recomendação — o modo manual (ficha + XML do site + releitura) entra no nó como PR-M, que não depende do assinador; F-NSP-2b perguntado em seguida); dossiê legal `nfse-paulistana-adaptador` D01–D09 (manual do webservice v3.4.1 de 19/11/2026; IN SF/SUREM 10/2011 art. 1º-A red. IN 13/2026). Achado que muda o público: desde 01/11/2026 Simples, MEI e quem sair do Simples estão vedados na Paulistana; sobra a PJ de SP capital em regime normal. A prefeitura não tem homologação (só TesteEnvioLoteRPS). Nasce da lacuna L-20261121-183240-e378. Forks ratificados, mas **não roteia código sem 'executa'**. PR-3/PR-4 esperam a fila do assinador local (#1146) em `main`; PR-1, PR-2 e PR-M não."
depende_de: ["[[D-2026-11-21-NFSE-PAULISTANA-FORKS]]", "[[X10b]]", "[[DFE-MANUAL]]", "[[X11]]", "[[X10a]]", "[[X7]]", "[[X10i]]?", "[[IBS-CBS-2027]]?"]
autorizacao: "dono, 2026-11-21, questionário, à pergunta \"Fork da NFS-e de São Paulo: … Planejar o adaptador?\", a resposta \"Planejar o adaptador\"; e no chat do mesmo dia: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\". Escopo desta nota: só planejamento (PRE-ADR/BRIEF, forks ao dono, PR só de .md); código exige 'executa' citável"
ancora_sdd: "—"
atualizado: "2026-11-21"
prs: ["#1325"]
perfil_previsto: "opus-medio"
perfil_evidencia: "forks pendentes em 21/11; molde conhecido (SefazNfeEmissor + FakePscServer + contrato do assinador da EMENDA-4); revisor obrigatório nos PR-2..PR-4 (schema, contrato do assinador, emissão)"
write_set: ["docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md", "docs/adr/ADR-ASSINADOR-LOCAL.md", "server/src/lib/paulistana/**", "server/prisma/migrations/**", "server/src/features/accounting/dtos/FiscalProfileDto.ts", "server/src/features/accounting/dtos/ServiceFiscalProfileDto.ts", "server/src/features/accounting/services/FiscalProfileService.ts", "server/src/features/accounting/services/ServiceFiscalProfileService.ts", "server/src/features/accounting/dfe/resolveEmissor.ts", "server/src/features/accounting/dfe/selectDfeEmissor.ts", "server/src/features/accounting/dfe/selectDfeAssinador.ts", "server/src/features/accounting/dfe/DfeEmissorPort.ts", "server/src/features/accounting/dfe/local/**", "server/src/features/accounting/dfe/paulistana/**", "server/src/features/accounting/dfe/ManualEmissor.ts", "server/src/features/accounting/dtos/DfeSignerDto.ts", "server/src/features/accounting/dtos/dfeSigner.schema.json", "server/src/features/accounting/repositories/FiscalDocumentRepository.ts", "server/src/features/accounting/models/issCompetencia.ts", "server/src/features/accounting/services/FiscalDocumentEmissionService.ts", "server/src/features/accounting/services/FiscalDocumentLifecycleService.ts", "server/src/controllers/fiscalDocumentController.ts", "server/src/routes/dfe.ts", "server/src/routes/docs/nfe.paths.ts", "docs/accounting/RUNBOOK-NFSE-PAULISTANA.md", "server/src/features/accounting/**/__tests__/**"]
registros: ["server/prisma/schema.prisma", "server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/__dto-shapes__.json"]
---
# NFSE-PAULISTANA — NFS-e municipal de São Paulo pelo produto

**Estado:** `planned` — 21/11 (planejamento): PRE-ADR + BRIEF escritos pela sessao-planejamento (`BE-INCR-NFSE-PAULISTANA-brief.md`, 37 itens em PR-0..PR-4 + PR-M numa `integration/nfse-paulistana`; forks F-NSP-0..12 RATIFICADOS no mesmo dia por questionário ([[D-2026-11-21-NFSE-PAULISTANA-FORKS]]): F-NSP-2 → b contra a recomendação — o modo manual (ficha + XML do site + releitura) entra no nó como PR-M, que não depende do assinador; F-NSP-2b perguntado em seguida); dossiê legal `nfse-paulistana-adaptador` D01–D09 (manual do webservice v3.4.1 de 19/11/2026; IN SF/SUREM 10/2011 art. 1º-A red. IN 13/2026). Achado que muda o público: desde 01/11/2026 Simples, MEI e quem sair do Simples estão vedados na Paulistana; sobra a PJ de SP capital em regime normal. A prefeitura não tem homologação (só TesteEnvioLoteRPS). Nasce da lacuna L-20261121-183240-e378. Forks ratificados, mas **não roteia código sem 'executa'**. PR-3/PR-4 esperam a fila do assinador local (#1146) em `main`; PR-1, PR-2 e PR-M não.  
**Autorização:** dono, 2026-11-21, questionário: "Planejar o adaptador"; chat do mesmo dia: "Executa tudo pra liberar e poder rodar em xhigh até terminar" (planejamento; só `.md`)
**Depende de:** [[X10b]] (porta, `FiscalDocument`, montagem), [[DFE-MANUAL]] (adaptador por documento), [[X11]] (cancelamento, eventos e job), [[X10a]] (EMENDA-4: fila e pacote do assinador local — bloqueia PR-3/PR-4), [[X7]] (relatório de ISS que passa a ver a nota); pontilhadas: [[X10i]] (mesma extensão do protocolo do assinador, campo por unidade), [[IBS-CBS-2027]] (o grupo IBSCBS do leiaute 2)
**Desbloqueia:** emissão de NFS-e para PJ de SP capital em regime normal; ISS dessas notas no relatório do [[X7]]; a tela fiscal (FE, lacuna na caixa)
**Âncora no SDD consolidado:** —

## Escopo

- Adaptador `paulistana` no `DfeEmissorPort`: RPS do **leiaute 2** (ISS + IBS + CBS) a partir da mesma montagem da
  NFS-e, `EnvioRPS` síncrono, consulta por `ChaveRPS`, cancelamento, cancelamento feito no site visto pelo job do X11,
  teste de envio (`TesteEnvioLoteRPS`) no lugar da homologação que a prefeitura não tem.
- Roteamento **por unidade** (`nfseSistema`), com as guardas da IN SF/SUREM 10/2011 art. 1º-A § 2º (red. IN 13/2026).
- Assinatura e mTLS pelo **assinador local** do cliente (alvos e serviço novos no protocolo da EMENDA-4), com o certificado
  da própria PJ.
- **Modo manual** (F-NSP-2 b): ficha do RPS, a pessoa emite no site da prefeitura e devolve o XML, releitura campo a
  campo, cancelamento pelo XML da nota cancelada; escolhido por unidade (`nfseEmissao: portal | automatica`, F-NSP-2b).
  Não depende do assinador.
- Runbook de gate humano para a 1ª nota real, o 1º cancelamento e o modo manual.
- **Fora:** tela (FE), NFS-e recebidas, NFTS, guia de ISS (F-X7-12 a: o ISS é municipal e fica
  sem guia no produto).

## Docs

- BRIEF: [`BE-INCR-NFSE-PAULISTANA-brief.md`](../../accounting/BE-INCR-NFSE-PAULISTANA-brief.md)
- Dossiê legal: [`pesquisas-legais/nfse-paulistana-adaptador`](../../../pesquisas-legais/nfse-paulistana-adaptador/relatorio.md)
- Origem: [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md`](../PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md) (linha 248, F4) e a lacuna `L-20261121-183240-e378`

## Gatilho

- Cliente de SP capital em Presumido/Real que não esteve no Simples desde 01/11/2026. O primeiro cliente é do Simples:
  para ele a NFS-e é a Nacional ([[X10i]] / [[DFE-MANUAL]]).

## Forks

Ratificados em 21/11 ([[D-2026-11-21-NFSE-PAULISTANA-FORKS]]), todos na recomendação exceto F-NSP-2 → (b).
F-NSP-0 (quando executar) · F-NSP-1 (quem vai para a Paulistana) · F-NSP-2 (modo manual) · F-NSP-2b (manual × automático) · F-NSP-3 (homologação) ·
F-NSP-4 (de onde sai o RPS) · F-NSP-5 (série) · F-NSP-6 (contador) · F-NSP-7 (síncrono × lote) · F-NSP-9 (cancelamento no
site) · F-NSP-10 (conferência da cadeia no assinador) · F-NSP-12 (código de serviço de 5 dígitos) — texto e recomendações no
BRIEF §6.
