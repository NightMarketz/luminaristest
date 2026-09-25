# Índice do plano (GERADO — não edite)

> Gerado por `node scripts/plano-vault.mjs index` a partir do frontmatter das notas. Para mudar um estado,
> edite o frontmatter da nota do nó e regenere. Protocolo de leitura em [[README]].

## Régua (calculada)

| Domínio | Fechados | Total |
| --- | --- | --- |
| contabil | 20 | 22 |
| financeiro | 17 | 19 |
| fiscal | 9 | 17 |
| **total** | **46** | **58** |

## Destravados agora (abertos, todas as dependências fechadas)

> Candidatos a próximo passo — **ainda exigem autorização citável do dono** (ORCH-006).

| Nó | Título | Estado | Autorização |
| --- | --- | --- | --- |
| [[C8]] | Imobilizado + depreciação (+ retificação versionada ECD/ECF, ex-C9) | ready | "Executa C8" (dono, 18/09, corpo do #354) |
| [[C9]] | Retificação de ECD/ECF versionada (absorvida no C8 Bloco G / PR-4) | ready | "Executa C8" 18/09 (cobre a retificação; CADEIA-A §2) |
| [[FE-INCR-BANK-SETTLEMENT]] | Tela do F7 (baixa por retorno bancário) | planned | dono 17/09 (F-PS-1 → a) — só BRIEF |
| [[FE-INCR-DELIVERY]] | Tela do pacote ao contador (consome C6b; files[].kind = ExportKind) | planned | — |
| [[FE-INCR-DFE]] | Tela da emissão de DF-e | planned | — |
| [[FE-INCR-LALUR-PR2]] | FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela | ready | — |
| [[FE-INCR-REVIEW]] | Aba do C11 (revisão profissional) | planned | — |
| [[GET-DATA-EXCHANGE-JOBS]] | Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria | planned | F-FA15 → (a) (dono, 18/09) |
| [[I1]] | Primeira unidade nasce no onboarding (BE-INCR-ONBOARDING-FIRST-UNIT) | ready | forks F-I1-* ratificados 2026-09-07; 'Executa I1' (dono, 24/09, questionário da sessão X13 PR-3) |
| [[I1b]] | Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes) | ready | F-I1-3 → (b) 2026-09-07 |
| [[I5]] | Venda sem mapper = blocked visível, não loop de erro | planned | — |
| [[LAC-B]] | UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION) | planned | dono 'Ativar agora' 2026-09-07 |
| [[SEED-MY]] | Seed multi-exercício 2025+2026 (alvo dos runbooks H1/H2/H3) | ready | cédula 14/09 (#318/#319) SEED-MY autorizado |
| [[X12]] | Catálogo de adições/exclusões dirigido por dado (F-COB-1 → b) | planned | resposta 4 + F-COB-1 → (b) (10/09) |

## Fila aberta

### Gates humanos e dado externo

| Nó | Título | Estado | Depende de (✗ = aberto) | Autorização |
| --- | --- | --- | --- | --- |
| [[D1]] | Resposta do contador (itens 1/1b · P6 (D8) · 5a-5f · encargo/desconto F7 · exceções PIS/COFINS X6 · linhas E) | human-open — Resposta recebida 23/09; triagem em docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md (3 críticas PIS/COFINS, requisitos novos). Faltam: códigos do referencial, cClassTrib, D8 | — | — |
| [[D1f]] | Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib) | human-open — Pode virar campo obrigatório do FiscalProfile (técnica X6) — decisão do dono | [[D1]] ✗ | — |
| [[D2]] | XML de NF-e real (compra da própria empresa, ago/set 2026) | human-open | — | — |
| [[D5]] | Parceiro emissor + certificado A1 (critério: N contas sob 1 chave, R8) | human-open | — | — |
| [[D6]] | Convênio/leiaute do banco do 1º cliente | human-open | — | — |
| [[D7]] | Vigilância de comunicações PNCT até 31/12/2026 | human-open — Obrigação operacional; nasce com a emissão | [[X10i]] ✗ | — |
| [[D8]] | Dados P6 do contador (declarante/signatários para o H1) | human-open | [[D1]] ✗ | — |
| [[E9]] | Trocar fixtures *.SYNTHETIC.xml da NF-e por NF-e 4.00 real anonimizada | blocked — Autorização citável em main (G-6, 17/09); espera D2 | [[D2]] ✗ | — |
| [[H1]] | PVA em Lucro Presumido (ECD + apuração + ECF) | human-open — Runbook em branco; alvo = SEED-MY (pontilhada) | [[P4]] ✗, [[D8]] ✗, [[SEED-MY]] ✗ | — |
| [[H1b]] | H1 2ª passada em Lucro Real (2P-1..2P-4) | human-open — 2P-1..2P-4 preparados em branco | [[X4]], [[X4-14]], [[SEED-MY]] ✗, [[FE-INCR-LALUR-PR2]] ✗ | — |
| [[H2]] | Sign-off de browser (inclui upload OFX/CNAB/NF-e por clique, wizard) | human-open — Runbooks em branco | — | — |
| [[H3]] | Sign-off / prova do P2 clínica (ECD do vertical 2 PVA-limpa) | human-open — Runbook em branco | [[P2]], [[H1]] ✗ | — |
| [[M2]] | Host + 1º deploy (VPS, 1 instância por cliente, BYOK; conta de emissão por unidade R8) | human-open — Alvo decidido 22/08; runbook em branco | [[H2]] ✗ | — |
| [[P4]] | Instalar validadores (PVA ECD/ECF) | human-open — PVA 10.4.1/12.2.6 instalados (i4jparams.conf, reconciliação 17/09); evidência do P4 segue do dono | — | — |
| [[SEED-MY]] | Seed multi-exercício 2025+2026 (alvo dos runbooks H1/H2/H3) | ready — BRIEF ✅ #325; forks F-SEED-2 a · F-SEED-3 b; B-4 assinado 24/09 (#371) — execução liberada | [[B-4]] | cédula 14/09 (#318/#319) SEED-MY autorizado |
| [[X2]] | Import do arquivo oficial RFB (referencial / catálogo) | human-open — Executável desde 31/08 (arquivo no corpus); runbook em branco | — | — |
| [[Z0-a]] | Contador com CRC aceita assinar escrituração que não conduziu? (premissa do F-Z0) | human-open — Cédula 10/09 resposta 1 fechou F-Z0 pelo produto e descondicionou o trilho; SDD §18/§19 ainda o tratam como aberto (item 0 do pedido) | — | — |

### Contábil

| Nó | Título | Estado | Depende de (✗ = aberto) | Autorização |
| --- | --- | --- | --- | --- |
| [[C8]] | Imobilizado + depreciação (+ retificação versionada ECD/ECF, ex-C9) | ready — PR-1..3 ✅ #354-#356; PR-4 (retificação/J801/J932/lista de jobs) e PR-5 (NF-e modo 4) ⬜ não abertos; conta no numerador só no PR-5 | [[D3b]], [[C12]] | "Executa C8" (dono, 18/09, corpo do #354) |
| [[C9]] | Retificação de ECD/ECF versionada (absorvida no C8 Bloco G / PR-4) | ready — Sem elo próprio (dono 18/09 'Pode seguir'); implementada no C8 PR-4, não aberto; fold 22/09 diz que não é linha própria da régua | [[X4]], [[C12]] | "Executa C8" 18/09 (cobre a retificação; CADEIA-A §2) |
| [[FE-INCR-DELIVERY]] | Tela do pacote ao contador (consome C6b; files[].kind = ExportKind) | planned — BRIEF ✅ 17/09; forks F-FE-DL-1..4 pendentes | [[C6b]] | — |
| [[FE-INCR-FIXED-ASSETS]] | Tela do C8 (imobilizado) | blocked — Espera merge do BE (F-PS-4 → a); sem BRIEF | [[C8]] ✗ | — |
| [[FE-INCR-REVIEW]] | Aba do C11 (revisão profissional) | planned — BRIEF ✅ 17/09; forks F-FE-RV-1..4 pendentes | [[C11]] | — |
| [[FE-INCR-SPED-SIGNERS]] | Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova) | blocked — BE C12 já mergeado (#353); texto de 17/09 ainda diz 'espera merge do BE' | [[C12]] | — |
| [[GET-DATA-EXCHANGE-JOBS]] | Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria | planned — Não existe; previsto no C8 PR-4 ou no FE-INCR-REVIEW (F-FA15 → a) | — | F-FA15 → (a) (dono, 18/09) |

### Financeiro

| Nó | Título | Estado | Depende de (✗ = aberto) | Autorização |
| --- | --- | --- | --- | --- |
| [[F5]] | Remessa CNAB 240 / boleto (conta bancária como entidade) | blocked — ADR não aberto; depende de dado externo D6 (convênio/leiaute do banco); P-IA (pontilhada, ADR adiado R10) | [[D6]] ✗, [[P-IA]] ✗ | F-M3 (2026-09-03) — autoriza abrir ADR, não código |
| [[F6]] | Pix de saída (API separada) | blocked — ADR não aberto; depende de D6; F5 pontilhada | [[D6]] ✗, [[F5]] ✗ | F-M3 (03/09) + resposta 21 (10/09) — só ADR |
| [[FE-INCR-BANK-SETTLEMENT]] | Tela do F7 (baixa por retorno bancário) | planned — BRIEF ✅ 17/09; forks F-FE-BS-1..4 pendentes [H] | [[F7]], [[FF7]] | dono 17/09 (F-PS-1 → a) — só BRIEF |

### Fiscal

| Nó | Título | Estado | Depende de (✗ = aberto) | Autorização |
| --- | --- | --- | --- | --- |
| [[FE-INCR-DFE]] | Tela da emissão de DF-e | planned — BRIEF próprio, ainda não aberto | [[X10b]] | — |
| [[FE-INCR-LALUR-PR2]] | FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela | ready — Crescimento do X4; falta 'executa' | [[X4]] | — |
| [[X10a]] | Adaptador por TIPO de documento fiscal (NFS-e, NF-e 55…) | blocked — estado do grafo 14/09 (blocked); fold 18/09 diz que 'materializou dentro do X10b' — ver DUVIDAS-INVENTARIO D-2. Fold 18/09: 'materializou dentro do nó X10b' (só NFS-e existe; NF-e 55 fora); §18.1 Onda 1 e grafo 14/09 ainda o listam  | [[X10b]] | resposta 9 (10/09) — requisito, sem 'executa' |
| [[X10i]] | Emissão de DF-e — implementação (cadeia crítica) | blocked — cadeia crítica: emissão ← D1f · D5 · M2; regra 'não X10b/emissão' só o dono reverte | [[X10b]], [[X10a]] ✗, [[D1f]] ✗, [[D5]] ✗, [[M2]] ✗ | — |
| [[X11]] | Eventos de DF-e com prazo legal validado (cancelamento, substituição, CC-e) | blocked — estado do grafo 14/09 (blocked); fold 18/09 diz que 'materializou dentro do X10b' — ver DUVIDAS-INVENTARIO D-2. Fold 18/09: materializou dentro de X10b (F-DFE-12; cancelamento com janela existe); grafo 14/09 e §18.1 ainda o listam a | [[X10i]] ✗ | resposta 13 (10/09) |
| [[X12]] | Catálogo de adições/exclusões dirigido por dado (F-COB-1 → b) | planned — estado do grafo 14/09 (planned); fold 18/09 diz que 'materializou dentro do X10b' — ver DUVIDAS-INVENTARIO D-2. Fold 18/09 diz que materializou dentro de X10b (improvável: é bloco M/e-Lalur); grafo 14/09: plan (BRIEF); §18.1 Onda 1  | [[X4]], [[D3b]] | resposta 4 + F-COB-1 → (b) (10/09) |
| [[X13]] | Perfil de obrigações por empresa — regime × porte, capturado no onboarding (BE-INCR-FISCAL-OBLIGATION-PROFILE) | planned — PRE-ADR aceito 24/09 (10 forks na recomendação); BRIEF 24/09; F-XP-1..8 ratificados 24/09; PR-1/2/3 implementados em #373 (não mergeado; PR-3 depende do I1 em #374); lacuna L-PR3-1 (FiscalProfile da unidade no onboarding) ao dono | [[D-2026-09-24-FISCAL-OBLIGATION-PROFILE]], [[I1]] ✗ | F-OBP-0..9 + F-XP-1..8 ratificados; "executa X13 PR-1/PR-2/PR-3" (dono, 24/09) |
| [[X7]] | Apuração de tributos (IRPJ/CSLL trimestral; PIS/COFINS, ISS) — ADR-INCR-TAX-ASSESSMENT | blocked — ADR não aberto; espera D1 itens 1/1b; Serpro adiado (R5) | [[D1]] ✗ | F-M2 (2026-09-03) — só ADR; F-M8 (trimestral) |
| [[X8]] | EFD-Contribuições (+ apuração PIS/COFINS, raso, por último) | blocked — ADR não aberto; depende de X7 | [[X7]] ✗ | F-M2 (2026-09-03) — só ADR |
| [[X9]] | DCTF / DCTFWeb (MIT) | blocked — ADR não aberto; depende de X7 (pode fundir) | [[X7]] ✗ | F-M2 (2026-09-03) — só ADR |

### Motor, plataforma, FE e outros

| Nó | Título | Estado | Depende de (✗ = aberto) | Autorização |
| --- | --- | --- | --- | --- |
| [[I1]] | Primeira unidade nasce no onboarding (BE-INCR-ONBOARDING-FIRST-UNIT) | ready — I1 itens 1–7 implementados (PR aberto, não mergeado); item 6 = sign-off de browser humano; I1b segue ADR próprio | — | forks F-I1-* ratificados 2026-09-07; 'Executa I1' (dono, 24/09, questionário da sessão X13 PR-3) |
| [[I1b]] | Backfill CLI do unitId legado (re-key como ADR de migração, B-4 antes) | ready — BRIEF no I1; F-I1b-1 → (b); código não iniciado | — | F-I1-3 → (b) 2026-09-07 |
| [[I3]] | activate-default + período OPEN (backend da LAC-B) | planned — F-I3-1 → (a) openCurrentPeriodIfMissing; demais forks pendentes | [[LAC-B]] ✗ | LAC-B ativada + F-I3-1 → (a) (07/09) |
| [[I4]] | Onboarding chama activate-default | planned — Forks F-I4-1..3 pendentes | [[I1]] ✗, [[I3]] ✗, [[I5]] ✗ | — |
| [[I5]] | Venda sem mapper = blocked visível, não loop de erro | planned — Forks F-I5-1/2 pendentes | — | — |
| [[I8]] | CRM como categoria composta por módulos (BE-INCR-CRM-MODULE-COMPOSITION) | ready — BRIEF pronto, 9/9 forks ratificados 07/09; código não iniciado; exige 'executa' | [[I1]] ✗ | F-I8-1 → (d) + 9/9 forks 2026-09-07 (execução sem 'executa') |
| [[LAC-B]] | UI da prensa de binding — ativação self-service (FE-INCR-BINDING-ACTIVATION) | planned — ⏳ ATIVADA 07/09 pelo dono; executar pelo BRIEF + emenda F-I3-1 (a) | — | dono 'Ativar agora' 2026-09-07 |
| [[P-IA]] | Extração genérica de documento por IA (F-BANK-1 → b), fora da régua | blocked — ADR adiado (R10) até D6 | [[R10]], [[D6]] ✗ | F-BANK-1 → (b) (10/09, contra a recomendação); R10 adia |
| [[PASSO-12]] | GAP-MAP 8 — deleteTableData ignora immutableAfter/lifecycle (teste + fork a/b) | blocked — Espera 'instrumenta' + fork do dono (a guard no delete × b RESTRICT) | — | — |
| [[PASSO-13]] | PR-B — atomicUntil boundary test + retrofit dos 8 JSDocs | blocked — Espera 'executa' (passo 10 já em main via #358) | — | — |

## Fechados, decididos e referência

- **dado-externo** (3): [[D-NFSE]] · [[D3b]] · [[ENVIO-PEDIDO-CONTADOR]]
- **decisao** (21): [[D-2026-09-23-C8-PR4-AMBIGUIDADES-MANUAL]] · [[D-2026-09-23-C8-PR5-TAXA-NCM]] · [[D-2026-09-23-MANUAL-ECD-L9-VIGENTE]] · [[D-2026-09-23-PASSO-11-CORRECAO]] · [[D-2026-09-23-SONNET-PARA-OPUS-LOW]] · [[D-2026-09-24-FISCAL-OBLIGATION-PROFILE]] · [[F-M1]] · [[F-M2]] · [[F-M3]] · [[F-M4]] · [[F-M5]] · [[F-M6]] · [[F-Z0]] · [[FF7]] · [[R10]] · [[R2]] · [[R5]] · [[R6]] · [[R7]] · [[R8]] · [[R9]]
- **diferido** (28): [[M5-apuracao-encerramento]] · [[M5-apuracao-tributos]] · [[M5-baixa-parcial]] · [[M5-caixa-projetado]] · [[M5-cnab-nfe]] · [[M5-cnpj-alfa]] · [[M5-contas-a-pagar]] · [[M5-dctf]] · [[M5-dimensoes]] · [[M5-ecd]] · [[M5-ecf]] · [[M5-efd-contribuicoes]] · [[M5-emissao-dfe]] · [[M5-envio-contador]] · [[M5-ia-analytics]] · [[M5-ibs-cbs]] · [[M5-imobilizado]] · [[M5-inbox-outbox]] · [[M5-lgpd-rbac]] · [[M5-ofx]] · [[M5-referencial]] · [[M5-remessa]] · [[M5-seam-crm-ar]] · [[M5-source-document]] · [[M5-split-receita]] · [[M5-subrazoes-restantes]] · [[M5-telas-ja-existente]] · [[M5-torre-aprovacao]]
- **gate** (1): [[B-4]]
- **motor** (1): [[PASSO-11]]
- **plataforma** (6): [[P-i18n]] · [[P1]] · [[P2]] · [[P3]] · [[P4-fase]] · [[P5]]
- **regua** (47): [[C11]] · [[C12]] · [[C6]] · [[C6b]] · [[C7]] · [[CONT-01]] · [[CONT-02]] · [[CONT-03]] · [[CONT-04]] · [[CONT-05]] · [[CONT-06]] · [[CONT-07]] · [[CONT-08]] · [[CONT-09]] · [[CONT-10]] · [[CONT-11]] · [[CONT-12]] · [[CONT-13]] · [[CONT-14]] · [[CONT-15]] · [[F1]] · [[F3]] · [[F4]] · [[F7]] · [[FIN-01]] · [[FIN-02]] · [[FIN-03]] · [[FIN-04]] · [[FIN-05]] · [[FIN-06]] · [[FIN-07]] · [[FIN-08]] · [[FIN-09]] · [[FIN-10]] · [[FIN-11]] · [[FIN-12]] · [[FIN-13]] · [[FIS-01]] · [[FIS-02]] · [[FIS-03]] · [[FIS-04]] · [[FIS-05]] · [[FIS-06]] · [[FIS-08]] · [[X10b]] · [[X4]] · [[X6]]
- **rejeitada** (6): [[R-contab-preset-dt]] · [[R-motor-dominio]] · [[R-motor-regras]] · [[R-multimoeda]] · [[R-postgresql]] · [[R-torre-multiempresa]]
- **subno** (2): [[X10]] · [[X4-14]]
- **trilho** (12): [[T1]] · [[T10]] · [[T11]] · [[T12]] · [[T2]] · [[T3]] · [[T4]] · [[T5]] · [[T6]] · [[T7]] · [[T8]] · [[T9]]

