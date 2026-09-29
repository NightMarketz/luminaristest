---
id: "D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE"
tipo: "decisao"
dominio: "plataforma"
titulo: "Entrevista de 29/09: 1º cliente (Simples, SP capital, com IE), fila régua+cliente, D-2 do inventário, MP no F5, onda 3 começa pelo Simples, forks de I4/I5/GOV/FE-INCR-DFE e CRM-RB"
estado: "decided"
autorizacao: "dono, chat, 2026-09-29: \"Pesquisa a fundo para ancorar as decisões que vamos tomar antes de entrevistar\" + \"Pode começar a entrevista\" + 6 questionários (AskUserQuestion); delegação anterior \"pode decidir tudo\" (28/09) para os forks do BRIEF FE-INCR-DFE"
atualizado: "2026-09-29"
---
# D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE — decisões da entrevista de 29/09

**Estado:** `decided`
**Autorização:** dono, chat, 29/09/2026. Seis questionários com contexto (`AskUserQuestion`), depois da pesquisa pedida
com *"Pesquisa a fundo para ancorar as decisões que vamos tomar antes de entrevistar"*.
**Base de evidência:** [`DOSSIE-DECISOES-2026-09-29.md`](../../accounting/DOSSIE-DECISOES-2026-09-29.md). Ele tem fonte e
grau de cada fato: código lido em `origin/main` `7c050670` e fonte oficial lida em 29/09.
**Não é "executa"**, salvo onde a tabela diz. "Planejar" autoriza BRIEF/ADR; código continua exigindo "executa" (ORCH-006).

## Fatos do 1º cliente (dono, questionário 1)

| Pergunta | Resposta |
|---|---|
| Regime | **Simples Nacional** |
| Município | **São Paulo capital** |
| Inscrição estadual | **Tem IE e vende produto no balcão** |

Consequências registradas (fonte no dossiê §0):
- **NFS-e:** pelo Emissor Nacional (web/API), **obrigatório e exclusivo desde 01/11/2026** (Res. CGSN 191/2026). Os campos de IBS/CBS só a partir de 01/01/2027 (Ato Conjunto 4 § 1º). A tela [[FE-INCR-DFE]] (modo manual) passa a ser o caminho legal desse cliente.
- **NFC-e 65:** obrigação **atual**, porque o CF-e-SAT está vedado em SP desde 01/01/2026 (Portaria SRE 79/2024). O [[X10a]] sobe de prioridade.
- **Obrigações do Simples:** ECF não se aplica e a ECD é facultativa (`obrigacoesPorRegime.ts:80,91`). O H1/H1b provam a régua Presumido/Real, não esse cliente.

## Decisões

| # | Tema | Decisão | Palavras / origem |
|---|---|---|---|
| 1 | U1: opção do Simples pelo regime regular de IBS/CBS (janela até 30/09) | **Fica no DAS** (sem opção). Nova chance em mar/2027 | *"Deixar no DAS"* |
| 2 | Fila do agente | **Régua e cliente juntos.** [[FE-INCR-DFE]] entra logo depois do [[SEED-UNITS]]; o cálculo do Simples espera a onda 3 | *"Régua e cliente juntos"* |
| 3 | D-1: seletor de unidade (trabalho de 28/09 sem commit) | **Integrar e mergear**: PR #438 | *"Integrar e já mergear"* |
| 4 | D-2: CRM Porte/Papel (trabalho de 28/09 sem commit, 15 arquivos, com Generic* e `db.ts` fora do BRIEF) | **Integrar tudo junto** e mergear com a CI verde: PR #439 (auto-merge) | *"Integrar tudo junto"* + *"Mergear quando a CI ficar verde"* |
| 5 | `icmsContribuinte` forçado a `false` no Simples (`FiscalProfileDto.ts:64`) | **Registrar no GAP-MAP** `[ABERTO]`; o conserto entra no BRIEF do [[X10a]] | *"Registrar no GAP-MAP"* |
| 6 | Dúvida D-2 do inventário | **[[X10a]] e [[X11]] abertos; [[X12]] fecha** (materializado pelo X4/FE-LALUR) | *"X10a e X11 abertos, X12 fecha"* |
| 7 | [[F5]]/[[F6]] com o Mercado Pago | **F5 = "cobrança por provedor de pagamento"**: MP como 1º adaptador, CNAB depois. **F6 bloqueado** pela liberação do Payouts pelo MP (gate externo). O token por cliente exige cifra em repouso (M2). Autorização segue F-M3: só ADR | *"F5 = cobrança por provedor"* |
| 8 | Qual PRE-ADR da onda 3 primeiro | **Simples/MEI** (PGDAS-D/DAS/DEFIS, anexos, fator R); IBS/CBS 2027 em seguida. A NFC-e sai da onda 3 e vai para o X10a | *"Simples/MEI primeiro"* |
| 9 | F-X7-1 | **(a) reabrir o F-M8 no ADR**: as duas formas por cliente; implementação em fases (motor trimestral primeiro). A V4 fechou (DIRF extinta; X9 = DCTFWeb + MIT; sem GIA-SP). A aresta X7 → D1 sai (a tabela de obrigações chegou em 23/09) | *"Reabrir no ADR"* |
| 10 | Downloads de fonte oficial | **Autorizados os 4:** Guia do Emissor Web v1.2, Anexo IV do ADN, NT 2025.002 v1.51, NT 2026.006 e 2026.007 | questionário (seleção múltipla) |
| 11 | BRIEF da [[FE-INCR-DFE]] | **Abrir com os 5 forks decididos:** PR-0 com as telas de perfil fiscal (unidade + serviço); toque no BE para persistir a releitura e expor os ids de XML/PDF; botão no `SaleDetailPanel`; upload por `input file` (padrão `NfePanel`); ambiente derivado da view, com aviso se divergir do `/status` | *"Abrir com os 5 decididos"* |
| 12 | Wizard (9 nós fora do vault) | **Só criar os nós**: I2 e I3 → done; I6, I7, I11, W1–W7 como `planned`. O 404 do W6 vai para o GAP-MAP e fica sem decisão de correção | *"Só criar os nós"* |
| 13 | [[I4]]/[[I5]] | **Recomendações ratificadas:** F-I4-1 a · **F-I4-2 b** (o tenant nasce; resposta com contabilidade Draft + bloqueios) · F-I4-3 a · F-I5-1 a (`NO_MAPPER_FOR_UNIT`, muda o enum do contrato) · F-I5-2 b (linha visível na UI). **Planejar autorizado** | *"Ratificar as recomendações"* |
| 14 | [[CRM-RB]] × moeda (fork novo F-RB8) | **Soma por moeda** (nunca misturar) **e, à parte, uma visão convertida por câmbio**, com a **PTAX do BCB, taxa do dia**, guardada numa tabela de taxas e com a data exibida. Emenda do BRIEF, mais corrigir os nomes de campo (`leads.value` → `latestProposalAmount`, etc.) antes do "executa" | *"Soma por moeda e conversão a parte com cambio"* + *"PTAX do BCB, taxa do dia"* |
| 15 | [[GOV-CONTADOR]] | **Recomendações ratificadas:** F-GOV-2 a · 3 a · 4 a · 5 a · 6 b · F-V1 c · V2 a · V3 b · V4 a. Entram no escopo as 2 lacunas novas (`openPeriod` como 2º caminho de reabertura; configurações/imobilizado na mesma policy). **Planejar autorizado.** F-GOV-1 (consulta ao CRC-SP) fica com o dono | *"Ratificar recomendações"* |
| 16 | Fase 3 do plano pós-contador | **Planejar autorizado** para as 4 emendas: 3.1 [[ITEM-DESTINATION]] (a posição oficial da RFB sobre monofásico entra como fork, sem esperar o contador), 3.2 [[C8]] (R$1.200 por unidade funcional + benfeitoria + retomada do Bloco F), 3.3 [[F7]]/[[X4]] (4 classes de encargo + descontos), 3.4 [[C6b]] (inventário/ficha/aging agora; memória de cálculo depois do X7) | questionário (seleção múltipla: as 4) |
| 17 | E-1: cancelar/devolver venda de pacote contabiliza errado | **Só registrar** no GAP-MAP `[ABERTO]`; sem instrumentação por ora | *"Só registrar"* |
| 18 | E-2: pacote sem validade | **Validade por pacote**: o pacote ganha prazo, e o vencido vira receita por não uso. Nó novo [[PACOTE-VALIDADE]] (implementação, BRIEF próprio). O tratamento contábil do vencido é pendente de validação externa (contador) | *"Validade por pacote"* |
| 19 | Registro | PR de docs com auto-merge quando a CI ficar verde | *"PR e mergear na CI verde"* |

## Erratas registradas pela pesquisa (fonte no dossiê §9)
- A transcrição da LC 214 art. 10 no corpus usava o **§ 5º revogado** e omitia o § 6º. Corrigida neste PR.
- "MOC 7.0 fora do corpus" (PLANO-EMISSAO F.3) está errado: o manual está no MANIFEST desde 26/09. O que falta é a transcrição de saída.
- "NF-e antecipada para 01/12/2026" (D7/X10i) está errado: é o **início** da obrigação para quem não tem IE (Ato 4 § 4º).
- "Hoje só CSV" (triagem 23/09, 3.4) está errado: o XLSX existe (`exceljs`, `DataExchangeDto.ts:59`).
- A citação `PeriodService.ts:34` no PRE-ADR GOV aponta para o `seedYear`; a reabertura fica em `:137-142` e em `openPeriod` `:45-53`.
- Nota do MANIFEST "Planalto reeditou sem mudar o tamanho": provável falso positivo (o token antirrobô `f5_p` muda o sha).
