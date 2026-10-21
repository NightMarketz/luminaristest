# RETORNO — IRRF-DISTRIBUICAO PR-1 (BE-INCR-IRRF-DISTRIBUICAO itens 1–9)

tarefa: executar o PR-1 do BE-INCR-IRRF-DISTRIBUICAO (sócios + parâmetros), sessao-feature, sem merge. PR-2..PR-4 fora.
autorização: dono, chat, 2026-10-21: "dispara os chats A, C e F agora". Escopo = 1ª linha do prompt do Chat A: "Executa o PR-1
  do BE-INCR-IRRF-DISTRIBUICAO (sócios + parâmetros) — sessao-feature, sem merge. PR-2..PR-4 fora."
agente: sessão filha do Chat A (sessao-feature), worktree optimistic-hofstadter-bcc6b7
base: `origin/main` `7c063e39`
modelo: degrau 1 (Opus 5.5 low)
rodadas-de-review: 0. Review independente NÃO despachado (regra ⛔ do CLAUDE.md: Bloco A com oráculo aberto)
veredicto: fatia COMPLETA (itens 1–9) depois das rodadas 2–4 de destrave; gates verdes. As escolhas 1 e 2 da rodada 4 são PROVISÓRIAS por decisão do dono. NÃO mergear sem OK do dono.

## Checklist (BRIEF §3.1)
| Item | Estado | Onde / teste |
|---|---|---|
| 1 Model `Partner` PJ-wide, `taxId` 11/14 com DV, `tipoPessoa` derivado, soft-delete, cadeia completa | feito | `schema.prisma` (model Partner), `PartnerDto.ts`, `PartnerRepository.ts`, `PartnerService.ts`, `partnerController.ts`, `routes/accounting.ts`, factory; `partner.test.ts` (DTO), `partner.integration.test.ts` "item 1" (CPF com DV errado → 400) |
| 2 Vigência sem sobreposição por `taxId`, gate dentro da tx | feito | `PartnerService.assertSemSobreposicao` (tx propagado ao `listByTaxId`); "item 2" (sequencial) + "duas criações concorrentes → uma 201 e uma 409" |
| 3 `GET /accounting/partners?data=` → vigentes + `somaParticipacaoBp` + aviso (≠ 10000 não bloqueia) | feito | `PartnerService.list`; "item 3" (soma 9000 com aviso; 10000 sem aviso) |
| 4 Cadastro aceita `residenteBrasil: false` | feito (lado do cadastro) | "item 4". A recusa `SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO` é dos fluxos de dividendos (PR-2) e JCP (PR-3) |
| 5 Parâmetros: `IRRF_DISTRIBUICAO` (1000 bp, 5.000.000 cents, JCP 1750 bp, transição 2025-12-31 substituída por 2026-01-31) e `TJLP` 2026 (7658·7608·7617·7742) com fonte/URL/sha; formato; sem linha → erro explícito | feito | `legalParameter.ts` (enum + `exigirLinhaVigente`), `formatoLinha.ts`, `prisma/data/legal_parameters_irrf_distribuicao_v1.sql` = texto da migração; `irrfDistribuicao.test.ts` |
| 6 Plano-semente (2.1.3/2.1.4/2.3.2/2.3.3/4.3.4) | **PAUSADO: L-1** | — |
| 7 `FiscalProfile`: dividendos/JCP a pagar, IRRF a recolher (Liability), despesa de JCP (Expense), FK Restrict, natureza checada | feito (configuração) | `FiscalProfileService.validate` + DTO, repo, view, auditoria, `ACCOUNT_KEYS` da política versionada; "item 7". O 400 de "conta não configurada" nasce com o consumidor (PR-2), L-3 |
| 8 `CompanyFiscalProfile.jcpBaseContas`: Equity do escopo; outra PJ → 404; não-Equity → 400 | feito | `CompanyFiscalProfileService.assertRefs` (dentro da tx, inclusive na cópia de ano); "item 8". O aviso "conta de PL com saldo fora do mapa" é da prévia do JCP (PR-3) |
| 9 Prefixo de `2.1.3` em `FINANCING_LIABILITY_CODE_PREFIXES` | **PAUSADO: depende do código final do item 6 (L-1)** | — |
| 32 snapshot dos DTOs: só inserções | feito | `__dto-shapes__.json` (accounting e legalParameters) e `.gen.ts`: o UPDATE no Windows reordenou tudo; revertido, entrando só o novo |
| 33 allowlist: `partner.created/updated/deleted` sem nome e sem CPF/CNPJ; ids das contas novas e `jcpBaseContas` | feito | `auditCanonical.ts`; "item 1" verifica a ausência do CPF e do nome |
| 34 rota em 2 toques + OpenAPI | feito | `routes/docs/accounting.partners.paths.ts`; `public/openapi.json` +2 paths. O gerador no Windows corrompia 9 descrições alheias ("secundário") e trazia `fiscal-certificates/{unitId}` (drift anterior da main): mantive a main e inseri só os paths novos |
| 35 `check:arch` / tsc | feito | ver PROVA |
| 36 `resetDb` limpa `partners` | feito | `test/helpers/db.ts`; Partner classificado como BLOCKING em `accountingResetClassification.ts` (o onboarding não escreve sócio) |

## Lacunas de spec
1. **L-1 (bloqueia os itens 6 e 9).** Os códigos que o BRIEF sugere colidem com o kit publicado:
   - os kits v6 (salão e clínica) já usam `2.1.3 Obrigações Tributárias` › 2.1.3.01–.04 (IRPJ/CSLL/PIS/COFINS a recolher), em
     `sectorKits/kits/_shared/conteudoFiscalCanonico.ts:77`. Com `2.1.3` no plano canônico, o refinamento "Conta já é do plano
     canônico" (`SectorKitDto.ts`) reprova o kit v6;
   - folha patrimonial nova sem mapeamento referencial derruba a prontidão da ECD em todo escopo
     (`referencialEmenda33.ts:2-3`). Mapear exige um kit v7 e o código referencial RFB de cada folha. O BRIEF não traz nenhum
     dos dois, e a emenda 3.3 só mapeou com decisão do dono (F-HR-4 a).
   O BRIEF deixa ao executor só a conferência dos códigos. Escolher onde a folha vive (canônico × kit v7) e o referencial é
   decisão (regra 2) → pausado. Perguntas ao dono: (a) códigos (ex.: obrigações com sócios em 2.1.7 e IRRF como 2.1.3.05,
   dentro de "Obrigações Tributárias"); (b) canônico ou extensão de um kit v7; (c) referencial RFB 2025 de cada folha.
2. **L-2 (não bloqueia).** O contrato §4 (`/^(\d{11}|\d{14})$/`) recusa o CNPJ alfanumérico, que `lib/cnpj.ts` já aceita.
   Implementado pela letra do BRIEF.
3. **L-3 (não bloqueia).** Item 7, "conta não configurada → 400 com o rótulo": o PR-1 não tem consumidor das contas. O 400
   nasce no PR-2, no lançamento.
4. **Escolha registrada (I).** `GET /partners` sem `data` usa hoje no fuso do escopo (mesma convenção do `anoCorrente`).

## Achados fora de escopo
- `public/openapi.json` da main não tem `/api/accounting/fiscal-certificates/{unitId}`, que o gerador produz (drift anterior).
  Não tocado.
- `scripts/generate-openapi.js` no Windows corrompe descrições com "secundário" (perde "/secundário"). Não tocado.

## write_set
Além dos globs do nó, o BRIEF obrigou a tocar: `FiscalProfileService.ts` (natureza das contas, item 7),
`CompanyFiscalProfileService.ts` + `ICompanyFiscalProfileRepository.ts` (item 8), `IFiscalProfileRepository.ts`,
`AccountingPolicyVersionService.ts` (`ACCOUNT_KEYS`), `accountingResetClassification.ts`, `legalParameters/__tests__/*`,
`test/helpers/{templateDb,legalParams}.ts`, `my-app/types/contracts/**.gen.ts` (gerados) e `prisma/data/*.sql`.
Nenhum arquivo de PR-2..PR-4.

## PROVA
```yaml
PROVA:
  - command: cd server && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.test.json
    exit_code: 0
  - command: cd my-app && npx tsc --noEmit && npm run test:types
    exit_code: 0
  - command: cd server && npm run check:arch
    exit_code: 0
    log: "no dependency violations found (1595 modules); 31 known violations ignored (baseline intocado)"
  - command: cd server && npm run test:unit
    exit_code: 0
  - command: cd server && npm run test:integration
    exit_code: 0
    log: "4/4 shards verdes (377+347+350+389)"
  - command: cd server && node ../scripts/smoke-migration-gate.mjs --db <main>/server/prisma/prisma/dev.db
    exit_code: 0
    log: "OK: 12 migração(ões) aplicada(s) na cópia sem perda. Original intocado (S1)."
  - command: cd server && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url file:./shadow.db --exit-code
    exit_code: 0
    log: "No difference detected."
```

## Gates OPS-001
1. Objetivo: o PR-1 entrega sócios, parâmetros e contas configuráveis para o PR-2 calcular o IRRF. Os itens 6 e 9 (plano-semente)
   ficam com o dono (L-1). Ver "veredicto".
2. Grau: checklist e PROVA (V); L-1 com caminho:linha (V); escolha 4 (I).
3. Caso adversarial tentado: duas criações concorrentes com vigências sobrepostas (o gate fora da tx deixaria passar as duas).
   Resultado: uma 201 e uma 409, `count = 1`.
4. Checagem que falharia se eu estivesse errado: `migrate diff` (schema × migração), teste byte a byte migração × arquivo de
   dados, `erroDeFormato` sobre a carga, e o snapshot de DTO (verde só depois de inserir os campos).
5. As duas primeiras linhas do relatório dizem: parcial (6/9 bloqueados por L-1) e não mergear sem OK.

## Rodada 2 (2026-10-21): destrave do coordenador, PARADO de novo na colisão
Destrave (dono, chat da sessão-mãe, 2026-10-21): "2.1.7 e 2.1.3.05, plano padrão, referencial pesquisa você".
Regra do coordenador: "Se 2.1.7 ou 2.1.3.05 colidir com conta já usada num kit, PARE e traga."
- **Colide (V, execução):** `2.1.3.05` no plano padrão exige a sintética-pai `2.1.3` também no plano padrão
  (`ChartOfAccountsFixture.plano4niveis.test.ts:34-36`: "falta <pai>"). Com `2.1.3` + `2.1.3.05` no fixture, importar
  `kits/beautySalon/kit.v6.ts` e `kits/aestheticClinic/kit.v6.ts` lança `"Conta 2.1.3 já é do plano canônico."`
  (refinamento de `SectorKitDto.ts`; o `2.1.3` vem de `CONTAS_FISCAIS_V2`, `conteudoFiscalCanonico.ts:77`). Os kits são
  parseados no import → o servidor não sobe. Fixture revertido; nada commitado nesta rodada.
- `2.1.7` sozinho não colide (nenhum kit usa 2.1.7), mas não segui: a ordem era parar na colisão, e os itens 6 e 9 andam juntos.
- A pesquisa do referencial não foi iniciada.
- Saídas possíveis (decisão do dono, não escolhi):
  (a) IRRF a recolher também fora do 2.1.3 no plano padrão (ex.: 2.1.7.03 ou 2.1.8.01). Não colide;
  (b) 2.1.3.05 como extensão de um kit v7 (contradiz "plano padrão"; escopo sem kit fica sem a conta);
  (c) mover o `2.1.3` sintético para o plano padrão e tirá-lo da extensão. Exige mudar a validação dos kits v6 já publicados
  (ex.: pular a sintética que já existe no canônico), e os publicados não se editam.

## Rodada 3 (2026-10-21): "(a) com 2.1.7.03". Referencial pesquisado, PARADO por ambiguidade e veículo do mapeamento
Destrave: dono, chat da sessão-mãe, 2026-10-21: "(a) com 2.1.7.03". Dossiê: `pesquisas-legais/irrf-referencial-2025/relatorio.md`
(catálogo `referential_accounts` 2025 do dev.db real, sha256 da cópia `4bfcdbfc…20bdbe`).
- Leitura única (V, catálogo): 2.1.7.01 → 2.01.01.17.13.10 · 2.1.7.02 → 2.01.01.17.12.10 · 2.1.7.03 → 2.01.01.09.01 ·
  2.3.3.01 → 2.03.02.03.01 · 4.3.4 → 3.01.01.09.01.04.
- **Ambíguo:** 2.3.2.01 Capital social integralizado → 2.03.01.01.01 (residentes no país) **ou** 2.03.01.02.01 (exterior). O
  cadastro aceita sócio não residente (F-IRD-7). Pela regra do coordenador ("mais de uma leitura → pare e traga"), não escolhi.
- **Veículo do mapeamento (lacuna nova):** a prontidão da ECD exige toda folha mapeada (`ReferentialMappingService.coverage`), e
  só a instalação/upgrade de kit grava mapeamento (`KitInstallService`). Os kits v6 não se editam. As folhas no plano padrão sem
  um kit v7 (só com o referencial) deixam todo escopo existente "não pronto". Não escolhi entre publicar um kit v7 do salão e
  da clínica ou criar outra via de mapeamento. Nenhum código desta rodada.

## Rodada 4 (2026-10-21): itens 6 e 9 FEITOS
Destrave: dono, chat da sessão-mãe, 2026-10-21: "Acredito que a gente pode seguir assim, inclusive com as suas recomendações,
de fato. […] Isso vai ser revisado após o app estiver completo […]". Leitura do coordenador: capital → 2.03.01.01.01, conta
única; mapeamento pela opção (b), fora dos kits; as duas escolhas são **PROVISÓRIAS**.
| Item | Estado | Onde / teste |
|---|---|---|
| 6 plano padrão: 2.1.7 Obrigações com Sócios (.01 Dividendos, .02 JCP a pagar, .03 IRRF a recolher), 2.3.2/2.3.2.01 Capital, 2.3.3/2.3.3.01 Reserva legal, 4.3.4 JCP | feito | `ChartOfAccountsFixture.ts`; `irrfPlanoPadrao.integration.test.ts` "o seed cria" |
| 6 referencial das folhas novas, em todo escopo, fora dos kits | feito | `REFERENCIAL_PLANO_PADRAO` + `ReferentialMappingService.ensureCanonicalMappings` (reusa `applySet`; só as versões que o escopo já mapeia; nunca sobrescreve), chamado no fim do `PostingService.ensureChartOfAccounts` (adaptador tardio na factory); testes "escopo que já mapeia 2025" (cobertura `ready`) e "idempotente" |
| 6 referencial conferido na fonte oficial | feito | `pesquisas-legais/irrf-referencial-sped` [D01] = tabela dinâmica da ECF (leiaute 12, AC 2025; sha256 `366b8d90…`). Os 6 códigos são analíticos em L100A/L300A e P100A/P150A; sem divergência |
| 6 kits v6 continuam aceitos | feito | import dos dois `kit.v6` sem erro; servidor sobe sobre a cópia do `dev.db` real migrada (porta escutando, HTTP 401 sem token) |
| 9 dividendos e JCP a pagar → Financiamento | feito | `FINANCING_LIABILITY_CODE_PREFIXES` + `2.1.7.01`, `2.1.7.02`; `cashFlowIrrfDistribuicao.test.ts`. O IRRF a recolher (2.1.7.03) fica no operacional, como os outros tributos a recolher (leitura minha, I) |
| teste-guarda L8 | ajustado | `plano4niveis.test.ts`: o 4.3.4 nasceu depois da L8 e não é renomeação |

Lacuna conhecida (registrada, provisória): subconta 2.3.2.01.02 → 2.03.01.02.01 quando houver sócio estrangeiro / RDE-IED.

```yaml
PROVA-rodada-4:
  - command: cd server && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.test.json
    exit_code: 0
  - command: cd my-app && npx tsc --noEmit
    exit_code: 0
  - command: cd server && npm run check:arch
    exit_code: 0
  - command: cd server && npm run test:unit
    exit_code: 0
    log: "5052 passed"
  - command: cd server && npm run test:integration
    exit_code: 1
    log: "CORREÇÃO: o commit 7b945f32 declarou 0 por engano — a rodada falhou (migratePlano4NiveisCli e kitV2Referencial, 4 testes). Ver rodada 4b."
```

## Rodada 4b (2026-10-21): correção do que a integração pegou
1. `kitV2Referencial`: a instalação do kit v6 deixava as 6 folhas novas sem mapeamento. O passo 7 do kit abre a versão depois do
   `ensureChartOfAccounts`. Correção: o adaptador `buildKitReferentialPort.batchSet` (factory) também chama
   `ensureCanonicalMappings`. O teste agora espera 38 folhas cobertas (antes 32).
2. `KitInstallService` (9 testes): com o passo acima, catálogo carregado SEM os códigos abortava a instalação no passo 7
   ("não existe no catálogo da versão 2026"). Correção: `ensureCanonicalMappings` pula o código que o catálogo carregado não
   reconhece (ou é sintético), registra `logger.warn` e não aborta; a folha aparece como não mapeada na `coverage`. Não
   inventa código. Teste: "catálogo da versão carregado sem os códigos".
3. `migratePlano4NiveisCli`: a migração L8 cria as sintéticas novas (2.1.7/2.3.2/2.3.3), mas não as folhas novas (não são
   renomeação; nascem no próximo `ensureChartOfAccounts`). O teste exclui as `FOLHAS_POS_L8`.
4. `importBoundary`: o teste do sectorKits não importa de `features/accounting`; os 6 códigos entram como literais.
Arquivos fora do write_set tocados nesta rodada: `lib/factory.ts` (registro), `jobs/__tests__/migratePlano4NiveisCli…`,
`sectorKits/__tests__/kitV2Referencial…`, `fixtures/__tests__/…plano4niveis…`, `PostingService.ts`,
`ReferentialMappingService.ts` + repo (o mecanismo da opção (b)).

5. Performance: chamar `ensureCanonicalMappings` em TODO `ensureChartOfAccounts` (que roda em todo lançamento) deu timeout
   de hook (PostingDimension, taxAssessmentAnual/Provision, reproduzido isolado). Agora roda só quando o ensure cria (ou
   restaura) alguma conta do plano padrão; a versão aberta depois chega pelo passo 7 do kit. Teste do item 6 refeito para
   simular o escopo de antes do deploy (folhas novas apagadas → recriadas e mapeadas).

```yaml
PROVA-rodada-4b:
  - command: cd server && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.test.json
    exit_code: 0
  - command: cd server && npm run check:arch
    exit_code: 0
  - command: cd server && npm run test:unit
    exit_code: 0
    log: "5052 passed"
  - command: cd server && npm run test:integration
    exit_code: 0
    log: "4/4 shards verdes (380+349+349+389)"
```
