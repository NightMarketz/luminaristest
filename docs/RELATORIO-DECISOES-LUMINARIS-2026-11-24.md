# Relatório consolidado de decisões do Luminaris (o quê e por quê) — revisão de 24/11/2026

Esta é uma revisão do relatório consolidado a partir do vault do Obsidian (`30 Projects/Luminaris/MEMORY.md` e
`20 Topics/`). Ele foi conferido contra o repositório: primeiro em `origin/main` `6a2fc5a6b`, depois em `d3f3a201c`, depois
do lote de merge de 24/11 (`docs/plano/decisoes/`, `docs/plano/nos/`, `docs/adr/`).

**Legenda de grau:**
- **[repo]**: conferido no arquivo citado.
- **[nota]**: fiel à nota do vault ou da memória, sem conferir se ainda está vigente no repo.
- **[parcial]**: há um ponto que não foi confirmado, e ele está dito na linha.

**O que mudou em relação à versão anterior:**
- 8 linhas foram corrigidas (marcadas com ✎).
- Foi acrescentada a seção 5, com as decisões de processo de outubro e novembro.
- As pendências da seção 7 foram refeitas.
- **Lote de 24/11 (marcado com ⊕):** foram acrescentadas as decisões que entraram na `main` pelo lote (país na borda
  aceito, motor de leis, conta canônica pelo papel, simulação de 12 meses, `executa` de três nós), e a seção 7 foi
  refeita de novo. O que entrou está na seção 8.

---

## 1. Produto, posicionamento e horizonte

| Decisão | Quando | Por quê | Grau / fonte |
| :--- | :--- | :--- | :--- |
| **SaaS B2B multi-tenant que gera ERPs setoriais.** O salão é o molde, não o produto | 13/07 | Provar os 3 eixos de desacoplamento (setor, origem, país: a periferia varia, o centro é invariante). São módulos canônicos (DynamicTables, presets, wizard de onboarding com IA) sobre uma espinha contábil invariante | [nota] `luminaris-product-thesis` |
| **Completude estrutural, nunca MVP** | 07/09, estendida em 21/11 | O dono quer as lacunas fechadas de verdade, sem recomendação calibrada por menor diff (o plugin *ponytail* foi extinto em 10/11). Custo é insumo de plano. Desde 21/11 isso vale para toda proposta: a opção estrutural é sempre gerada e é a recomendação padrão, e o remendo entra só como alternativa | [repo] `D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL` |
| **Go-live só em 2027** | 30/10 | Nenhum cliente real apura período de 2026. Regra que morre em 31/12/2026 não justifica código nem pergunta ao contador, salvo se alcançar fato de 2027. Consequência em 21/11: o ICMS da revenda fora do Simples entra no go-live e nasce o nó ICMS-EFD | [nota] `go-live-em-2027` · [repo] `D-2026-11-21-ICMS-RPA-GO-LIVE-2027` |
| ✎ **Frontend: o adiamento foi suspenso para a contabilidade em 13/07** | adiado até 13/07 | O backend ficaria completo antes da tela, para evitar retrabalho visual. Em 13/07 o backend de compliance/SPED chegou à `main` e o FE contábil virou trabalho ativo (A1a, PR #89). A regra "tela ausente é dívida planejada" valeu só até então | [nota] `frontend-deferred-strategy` (cabeçalho "STATUS UPDATE") |
| **Repositório em `NightMarketz/luminaristest`**, com a landing em repo separado | 31/07 | Os 7 repos ativos foram transferidos (não copiados), o que preservou 42 issues e PRs. A landing fica fora do monorepo (`Landing Page v0.2`) | [nota] `repos-migrados-para-nightmarketz` |

## 2. Arquitetura e fronteiras de dados

| Decisão | Quando | Por quê | Grau / fonte |
| :--- | :--- | :--- | :--- |
| ⊕ **País na borda, sempre**: o conceito universal fica no centro e a instância legal na borda | direção 15/11, ADR Accepted 24/11 | Folha, rubrica, alíquota e plano de contas são universais (contar palavra mede idioma, não país). Do Brasil são as instâncias (INSS, eSocial, SPED, ICMS, CNPJ). A dependência vai só da borda para o centro, já no código novo. **24/11:** forks F-PB-1..9 decididos (borda em `features/<dominio>/paises/br/**`, centro em inglês, dado existente migrado por fatias). Redação R1–R7 e forks F-PBA-1..7 ratificados, e o ADR passou a `Accepted`. Nasceu o nó `PAIS-NA-BORDA`, com os BRIEFs das fatias F1 (razão) e F3 (registro de formato do `LegalParameter`); pelo F-PBA-7, a F3 entra antes do PR-0 do ciclo e do PR-P0 da ponte. O dono decidiu que os BRIEFs com `executa` já nascem pela regra, e o #1338 emendou cinco: os quatro com `executa` (CICLO-FISCAL, NFSE-PAULISTANA, DP-PONTE-RAZAO, EFICIENCIA-FISCAL) e o do PR-0 da simulação | [repo] `D-2026-11-15-PAIS-NA-BORDA`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §1 e §6, `D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS`, `docs/adr/ADR-PAIS-NA-BORDA.md` l. 4, `git show --stat fcccd7f57` |
| ⊕ **Motor de leis da plataforma**: a forma da regra legal também vira dado | 14/11 | O dono pediu um motor em que se encaixam as leis e o comportamento muda com a lei, para o projeto todo e não só para o DP. Reabre F-DP-5 e F-PES-9. A direção está decidida, e os forks de desenho F-ML-0..14 seguem **ratificação pendente** no BRIEF | [repo] `D-2026-11-14-MOTOR-DE-LEIS`, `docs/plano/nos/LEGAL-REGRAS.md`, `docs/accounting/BE-INCR-LEGAL-REGRAS-brief.md` l. 3 |
| **Fronteira DynamicTable × Prisma** | 14/10 | **DynamicTable** é o que o usuário desenha. **Prisma** é só o núcleo que a lei desenha igual para todos *e* que exige atomicidade multi-tabela, agregação em volume ou imutabilidade por construção (razão, períodos, apuração, SPED, DF-e, Folha). "Precisa de consistência", sozinho, não manda para o Prisma; em dúvida, vai DynamicTable com a ponte `postEntry`. AP/AR, contraparte e estoque estão em Prisma e são candidatos declarados a voltar para DynamicTable | [repo] `docs/adr/ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md` |
| **Fronteiras de camada mecanizadas (`check:arch`)** | 13/10 | Gate estático que lê o código como o `tsc` e bloqueia violação nova; o baseline só encolhe. É exceção ratificada à bancada desligada | [repo] `docs/adr/ADR-ARCH-BOUNDARIES.md` |
| ⊕ **Primitivas de plataforma, allowlist e mensagens** | 21/11 | Três forks da caixa de lacunas: as primitivas (datas, dinheiro, `AccountingScope`, `AuditService`) sobem para uma camada compartilhada fora de `features/accounting`. A allowlist de auditoria passa a ser por domínio, com composição central. As mensagens do servidor passam a um catálogo por módulo, de forma incremental. As lacunas seguem as fatias do país na borda | [repo] `D-2026-11-21-FORKS-DA-CAIXA`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §1 |
| **Ficar no SQLite (sem PostgreSQL)** | 24/06 | WAL, `busy_timeout=5000` e `foreign_keys=ON` entregam a corretude do ledger: ACID em `$transaction`, idempotência por `@@unique` com escritor único, `CHECK` e `BigInt` de 64 bits. O schema fica portável caso apareça um gatilho real (réplica, gargalo de escrita medido) | [nota] `stay-on-sqlite-no-postgres` |
| **Tenancy por `AccountingScope`, sem torre multiempresa** | 23/06 | Separar desde já `ownerUserId` (dono do dado) de `actorUserId` (quem agiu, para auditoria e SoD), com `unitId`, evita refazer o tenancy se uma unidade passar a ser compartilhada | [nota] `accounting-scope-foundation-no-multicompany` |
| **Motor de domínio REJEITADO; vale o Contrato §2.3 `atomicUntil`** | 21/09 | É o 1º ADR `Rejected` do repo. 3 das 5 falhas alegadas já tinham solução, o pseudo-código não sustentava ACID e o que varia por vertical é mapeamento. Vence o modelo de 2 commits (razão e subrazão) com `reconcile`, declarado no cabeçalho `atomicUntil`, com 4 gatilhos de reabertura. O motor de leis de 14/11 é outra coisa: parâmetro legal como dado, não engine de domínio | [nota] `motor-de-dominio-rejeitado-atomicuntil` · [repo] `docs/adr/ADR-DOMAIN-MOTOR-rejected.md` |
| **Tipos de payload do FE gerados do `dtoShapeSnapshot` (`.gen.ts`)** | 28/09 | O espelho escrito à mão causou 8 dias de 400 na ECD (`identQualif`). `import type` do backend arrastava 76 arquivos, e o OpenAPI à mão divergia em 17 de 117 endpoints. O gerador cobre 258 schemas em 17 domínios | [nota] `fe-contract-types-import-type` |
| **Auditoria append-only com `PAYLOAD_ALLOWLIST` anti-PII** | 01/09 | A trilha (`AuditEvent` com hash-chain) é irreversível, então PII ali colide com a LGPD para sempre. A denylist foi rejeitada 2 vezes. O teste-guarda chama `AuditService.append` direto, e quem alarga a allowlist traz o teste do campo no mesmo PR | [nota] `accounting-audit-allowlist-guards` |

## 3. Contabilidade, fiscal, pagamentos e DP/Folha

| Decisão | Quando | Por quê | Grau / fonte |
| :--- | :--- | :--- | :--- |
| **Partição contábil → financeiro → fiscal em escopo máximo** | 03/09 | Sem denominador explícito, o "%" de conclusão era chute. O dono ratificou a escrituração completa nos 3 módulos, com ordem fixa de fechamento. A régua v2 (07/11) tirou C9 e X6 do total e marca **55/60** | [nota] `accounting-fechamento-por-modulo` · [repo] `D-2026-11-07-REGUA-REDEFINICAO`, `-REGUA-DENOMINADOR` |
| **Regime-alvo: Lucro Real**, com o H1 em Presumido primeiro | 02/09 | O Lucro Real não dispensa ECD e ECF e não engloba o Simples (o DAS é obrigação paralela). A ECF Fase 3 (nó X4) consta como done no vault em 10/11 | [nota] `accounting-regime-lucro-real-alvo` |
| ⊕ **Conta canônica pelo papel, não pelo código** | 21/11, código em 24/11 | Em escopo legado o código da conta pode colidir. Por isso a conta canônica se identifica pelo papel ou pela natureza, e a DRE classifica a conta de insumo pelo papel `insumoExpenseAccountId`, não pelo prefixo. A DRE e o J150 entraram em #1318. A conta canônica (PR-1..PR-3) entrou pela integração #1352 | [repo] `D-2026-11-21-FORKS-DA-CAIXA`, `D-2026-11-21-DRE-INSUMO-PELO-PAPEL`, `gh pr view 1352` |
| ⊕ **Fechamento definitivo exige obrigações quitadas ou entregues** | 21/11 | A regra mora na máquina de estados do período, não numa checagem solta | [repo] `D-2026-11-21-FORKS-DA-CAIXA` |
| **Emissor próprio; a Focus NFe é só referência** | 07/10 | O dono não quer conta na Focus. A API dela serve de modelo de desenho para o emissor próprio | [nota] `focus-e-referencia-nao-fornecedor` |
| ✎ **Certificado e transmissão dos DF-e** | 11/10, depois 22/10, 30/10 e 22/11 | **11/10:** PAA descartado (o Ajuste SINIEF 9/22 exclui Presumido e Real e restringe o Simples a intermediador de e-commerce) e PSC em nuvem para os 3 DF-e. **22/10:** a NFS-e vai pelo portal, porque o PSC não cobre a NFS-e. **30/10:** o Luminaris não contrata PSC nem e-CNPJ, e serviço contratado algum dia será BYOK; a transmissão real de NF-e e NFC-e fica bloqueada até haver saída para o mTLS. **22/11:** o A1 do cliente (e o do escritório procurador) volta a ser guardado cifrado no servidor, para todos os usos; a produção espera o parecer de advogado (L-ADN-5) | [repo] `D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO`, `D-2026-10-30-D5-SEM-CONTRATACAO-BYOK`, `D-2026-11-22-GUARDA-A1-TODOS-OS-USOS` |
| ⊕ **NFS-e Paulistana** | forks 21/11, `executa` 24/11 | Ratificados os forks F-NSP-0..12 (F-NSP-2 contra a recomendação: modo manual dentro do nó). Em 24/11 o nó ganhou `executa` do BRIEF do #1325 inteiro, já emendado pelo país na borda no #1338 | [repo] `D-2026-11-21-NFSE-PAULISTANA-FORKS`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §4, `docs/plano/nos/NFSE-PAULISTANA.md` |
| **Entrega à Receita pela API Integra Contador (Serpro): R5 reaberta** | 21/11 | Planejar a entrega pela API; a contratação segue com o dono. Em 24/11 o nó **não** recebeu `executa` e continua só com planejamento | [repo] `D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §4 |
| ✎ **Simples 2027: forks F-SN-0..13 ratificados; decide-se pela lei** | 07/10 | A LC 214 muda o cálculo em 01/01/2027 (RBT12, IBS/CBS no DAS). PRE-ADR Accepted, com 14 forks (F-SN-0, F-SN-2 e F-SN-12 contra a recomendação). Regra do dono: *"a lei é unica e não é interpretativa, apenas faça baseado na lei"*. Por isso o §8 deixou de ser pedido ao contador. ⊕ Em 21/11, a partição do Anexo III 2027–2028, que somava 100,01%, passou a ser reescalada para 100% e documentada. ⊕ Em 24/11, a opção pelo regime regular de CBS/IBS ficou em setembro e março (LC 123 art. 13 § 10, red. LC 227), lida no texto compilado | [repo] `D-2026-10-07-SIMPLES-FORKS`, `docs/adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md` l. 4, `D-2026-11-21-FORKS-DA-CAIXA`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §5 |
| **Eficiência fiscal: montador único da simulação de regime** | 21/11 | Correção pela raiz: a apuração e a simulação compartilham os montadores de entrada e uma elegibilidade por ano. As lacunas f514, 35df, 7bff e a2ce viraram itens do BRIEF. Forks F-MU-1..16 todos na recomendação. ⊕ Em 24/11 o BRIEF foi emendado pelo país na borda no #1338 (nó `inflight`) | [repo] `D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO`, `-FORKS`, `docs/plano/nos/EFICIENCIA-FISCAL.md` |
| ⊕ **Simulação completa de 12 meses** | 21/11 | *"O que queremos é que fique uma simulação completa, os dados realmente vão ser todos entregues pelo usuário"*: 12 meses, não 1 mês com média, com valor padrão realista. PRE-ADR e forks F-SIM-1..8 ratificados: motor do produto com a página como protótipo, sem persistência por ora, entrada em camadas, 2027 com 2026 histórico, núcleo neutro com SP primeiro. Nó `SIMULACAO-CENARIO` e BRIEF do PR-0, sem `executa` | [repo] `D-2026-11-21-SIMULACAO-COMPLETA-PRE-ADR`, `docs/adr/PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md`, `docs/plano/nos/SIMULACAO-CENARIO.md` |
| **Insumo do serviço** | 21/11 | Três decisões: o insumo vira estoque com ajuste por inventário periódico (F-ID-3 reaberta); DRE e J150 classificam o insumo pelo papel; o crédito de PIS/Cofins do monofásico usado como insumo é chave por cliente, ligada por padrão | [repo] `D-2026-11-21-INSUMO-INVENTARIO-PERIODICO`, `D-2026-11-21-DRE-INSUMO-PELO-PAPEL`, `D-2026-11-21-C516-MONOFASICO-INSUMO-CREDITO` |
| ⊕ **Ciclo fiscal** | forks 21/11, `executa` 24/11 | Forks F-CF-1..10 ratificados (F-CF-4 e F-CF-5 contra a recomendação). Em 24/11 o nó ganhou `executa` do BRIEF inteiro, já emendado pelo país na borda no #1338 | [repo] `D-2026-11-21-CICLO-FISCAL-FORKS`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §4, `docs/plano/nos/CICLO-FISCAL.md` |
| ✎ **Cobrança Mercado Pago (F5): BYOK, AES-GCM no env, baixa só pelo relatório** | 02/10 | O BYOK resolve a colisão do OAuth de plataforma com uma instância por cliente, e a cifra com chave no env evita KMS. A baixa vem só do relatório de liberações, porque `GET /v1/orders/{id}` não traz tarifa nem data de aprovação. **O PR-3 (#615) foi mergeado em 09/10.** Nó F5 `inflight` com EXECUTA de 29/10 (lista global de cobranças) | [repo] `gh pr view 615`, `docs/plano/nos/F5.md` · [parcial] não confirmei se a sonda de colunas em produção rodou |
| ✎⊕ **DP/Folha (PES-4): Prisma first-class, PRE-ADR → BRIEF → executa** | 02/11, forks em 06/11, 14/11, 21/11 e 24/11 | A spec externa trazia escolhas incompatíveis com o repo (Postgres com RLS, outbox, Decimal, KMS) e foi adaptada no PRE-ADR. F0 e F1 estão na `main` (#1041). Forks F-DPF-1..13 decididos em 06/11, com a regra de parâmetro: número de lei e escala viram dado (`LegalParameter`, `DpJornada`) e o código só guarda a forma. Em 07/11: um emprego só e jornada 12×36 sem escala até o usuário informar. Em 14/11: a 2ª rodada de lacunas de escopo encaixou cada uma pela lei no BRIEF da norma (cálculo → F3, eSocial → F4, guia e guarda → F5, SST), sem questionário. Em 21/11: ponte folha → razão, Simples e CPP (F-PNT-1..7 e 3b; RAT, FAP e FPAS em parâmetros legais, contra a recomendação). **Em 24/11:** `executa` da emenda DP-PONTE-RAZAO inteira, depois do PR-6 do F2 (pilha do #1326); CNPJ por estabelecimento numa tabela BR 1:1 da `Unit`; horista com horas contratuais e desconto de falta e DSR, contra a recomendação | [repo] `D-2026-11-06-DP-BRIEF-F2`, `D-2026-11-07-PES4-F2-EMPREGO-UNICO-E-12X36`, `D-2026-11-14-DP-ESCOPO-LACUNAS-2`, `D-2026-11-21-DP-PONTE-RAZAO`, `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §2–§4 |
| **`*Cents` em `BigInt`; `MAX_CENTS` é só política** | 31/08 | O #245 migrou 13 colunas para `BigInt`, o que é ganho defensivo para dado herdado. O teto de R$ 21.474.836,47 segue como 400 nos DTOs, por decisão de produto | [nota] `max-cents-e-politica-nao-persistencia` |

## 4. IA nativa, Teammates e RAG (com escolhas contra a recomendação)

| Decisão | Quando | Por quê (e o que NÃO "consertar") | Grau / fonte |
| :--- | :--- | :--- | :--- |
| **TEAMMATES nativos (OpenBot descartado)** | 29/10 | O OpenBot caiu por licença (PolyForm Noncommercial), por ser desktop sem API e pelo `approvalPolicy: never`. **Contra a recomendação, de propósito:** F-TM-4 canais completos no v1, F-TM-5 BullMQ + Redis (evidência do gatilho (b) do motor, mas reabrir o motor ainda exige ADR), F-TM-11 webhook de rotina e F-TM-12 cliente MCP no v1. Também F-TM-6: só BYOK. ✎ **Tem EXECUTA do nó desde 06/11**; o PR-3 teve as lacunas decididas em 07/11 | [nota] `teammates-nativos-forks-2026-10-29` · [repo] `D-2026-11-07-TM-PR3-LACUNAS` |
| **RAG-DOCUMENTOS com `sqlite-vec` e orçamento unificado** | 30/10, emenda em 07/11 | **Contra a recomendação:** F-RAG-1 `sqlite-vec`, F-RAG-2 `POST /documents/search` mantido, F-RAG-3 dois modos de chat, F-RAG-5 embedding pela `LlmCredential` do usuário com a chave da instância de reserva, e F-RAG-B2 embedding e contexto no orçamento único (`AWAITING_BUDGET`). ✎ **EXECUTA do nó desde 06/11.** Em 07/11 o RAG ganhou dois modos de resposta: descritivo (chunkId, fonte, dados técnicos no hover) e rápido. O descritivo vale também no agente (M6, contra a recomendação) | [nota] `rag-documentos-forks-2026-10-30` · [repo] `D-2026-11-07-RAG-MODOS` |

## 5. Processo, governança e qualidade

### 5.1 Fluxo de trabalho e merge

- **Fonte da verdade do plano:** o vault no repo, `docs/plano/`. O `_INDEX` é gerado, `fold` é decisão e o SDD é snapshot de 23/09. Ordem da fila ratificada em 14/10 (`FILA-ORDEM.md`). [repo] `D-2026-10-14-FILA-ORDEM-RATIFICADA`
- **Fluxo autônomo (28/10):** o `executa` vale para o BRIEF inteiro (PR-0..PR-n, BRIEF ratificado e sem fork pendente). Merge por classe de risco (`scripts/classe-risco.mjs`): verde a sessão maestro mergeia sozinha; vermelho vai ao revisor-independente e ao lote diário do dono. Fora da maestro nenhuma sessão mergeia. [repo] `D-2026-10-28-FLUXO-AUTONOMO`
- **Revisão do PR vermelho (06/11):** revisor obrigatório só no vermelho de código, até 3 rodadas, a 2ª e a 3ª só no diff novo. Em 10/11, o vermelho da faixa 1 da auditoria de estruturas implícitas passou a entrar sem o lote, com revisor PASS. Em 11/11 começou um experimento para medir o acerto do revisor por tamanho de lote. [repo] `D-2026-11-06-REVISAO-CONVERGENCIA`, `D-2026-11-10-FAIXA1-MERGE-LIVRE`, `D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO`
- ✎ **Pilhas e branch de integração (08/11, emendado em 10/11):** um PR por item do GAP-MAP. Feature com 2 ou mais PRs usa `integration/<slug>` com pilha nativa (`gh stack`), livre dentro dela; a `main` recebe um PR só, quando a feature fecha. A profundidade máxima entre a `main` e o resto é 2 (`main` → integração → pilha). Fora de integração, filho sobre pai não mergeado continua proibido. O GAP-MAP passa a ter um fragmento por achado (a migração espera a faixa 1 fechar). [repo] `D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE`, CLAUDE.md
- **Lacuna fora de escopo vai à caixa do maestro (11/11):** o que é da tarefa a sessão resolve; o resto vai para `node scripts/lacunas.mjs add`, nunca por `SendMessage`, e o maestro abre a sessão que resolve. Em 21/11 ficou definido que, se o `pulso` imprimir `DRENO`, a sessão propõe o cartão de dreno. [repo] `D-2026-11-11-LACUNA-VAI-AO-MAESTRO`
- **Sem conflito artificial:** valor derivado (índice, contador, carimbo) se calcula na `main` depois do merge. Nunca comentário público em PR. [nota] `valor-derivado-calcula-na-main-nao-no-pr`, `sem-comentario-publico-em-pr`

### 5.2 Validação, oráculo e bancada

- **Gargalo é validação humana, não código.** A bancada de auditoria foi desligada em 09/08 e não deve ser recriada enquanto houver item do Bloco A com oráculo externo aberto há mais de 14 dias (hoje 4 de 4). Exceções ratificadas: `check:arch`, `no-console` e `catch` silencioso no ESLint, o teste de alerta dos schedulers e o revisor-independente só no vermelho. [repo] CLAUDE.md · [nota] `oracle-deficit-proposta`
- ✎ **H1 (ECD/ECF no PVA) vai para o último passo (22/10).** O dono decidiu fechar ECD e ECF perto do 1º cliente e fazer todo o resto em volta antes disso. O passo 6 do H1 espera uma ECD assinada (M2 ou 1º cliente), porque o PVA da ECF só recupera ECD assinada. Em 02/11, H1, H2 e cédulas pendentes foram delegados à sessão. [repo] `D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO`, `D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA`, `D-2026-11-02-DELEGACAO-DONO`
- **Runbook e gate humano:** o agente prepara o runbook e, sob comando do dono, preenche a evidência com a saída literal. Desfecho e assinatura são do dono, com duas exceções: o runbook de tela rodado pelo agente (25/10) e o "AI tester" nos cinco gates, só onde o dono autorizar (29/10). [repo] CLAUDE.md, `D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR`

### 5.3 Modelos, máquina e propostas

- **Modelos:** o que seria Sonnet roda em Opus 5.5 low (23/09). Desde 10/11, Fable 5.2 planeja, Opus 5.5 implementa e o revisor fica em Opus; Sonnet 5.5 entra em teste só na faixa 1. O agente `executor` e os retornos com PROVA foram aposentados, e a prova é o CI. O leitor é Haiku médio, só coletando. O revisor tem que ser um agente separado. [nota] `sonnet-vira-opus-low` (a nota `D-2026-11-10-METODO-FABLE-5-2` não existe como arquivo na `main` em `d3f3a201c`; o método está nos commits `19cb13935` e `75e87bbd1`)
- **Recursos da máquina (04/11):** dependências compartilhadas por lockfile (`scripts/worktree-deps.mjs`) e teste local só com escopo, porque a suíte inteira é do CI. Até 3 subagentes e 3 cartões por turno, e 2 vagas de trabalho pesado por máquina. [repo] `D-2026-11-04-RECURSOS-LOCAIS`
- **Regra global de input (13/11):** passa a ser opt-in tela a tela (`data-own-style`), em vez de vencer a utilitária do campo. [repo] `D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA`

---

## 6. Escolhas deliberadamente contra a recomendação (não "consertar")

- **Partição dos módulos:** F-M2, F-M3 e F-M4, escopo máximo (03/09).
- **Simples:** F-SN-0, F-SN-2 e F-SN-12 (07/10).
- **TEAMMATES:** F-TM-4, F-TM-5, F-TM-11 e F-TM-12 (29/10).
- **RAG:** F-RAG-1, F-RAG-2, F-RAG-3, F-RAG-5, F-RAG-5b e F-RAG-B2 (30/10), mais F-RAG-M6 (07/11).
- **DP:** vigência só por data de efeito (02/11); divisor pela escala, salário-família e outro emprego no F2 (06/11); F-PNT-3, RAT, FAP e FPAS em parâmetros legais (21/11); ⊕ horista com horas contratuais e desconto de falta e DSR (24/11).
- **NFS-e Paulistana:** F-NSP-2 (21/11).
- **Ciclo fiscal:** F-CF-4 e F-CF-5 (21/11).
- ⊕ **País na borda (24/11):** F-PB-7 (migrar o dado existente por fatias, em vez de congelar), F-PB-1 (pasta por país no domínio), F-PB-4 (centro em inglês), F-PNT-PB-1 (CNPJ do estabelecimento pelo `PUT /accounting/fiscal-profile/br`) e "os BRIEFs com `executa` já nascem pela regra" (emendados no #1338).

## 7. Pendências abertas e pontos de atenção (refeitas de novo em 24/11, depois do lote)

1. **H1 no PVA:** pausado no passo 6 por falta de ECD assinada. Pela decisão de 22/10, é o último passo antes do 1º cliente, não a restrição ativa de agora. [repo]
2. **Transmissão real de NF-e e NFC-e:** bloqueada desde 30/10 até haver saída para o mTLS sem e-CNPJ do Luminaris. Em 22/11 o A1 voltou ao servidor, mas a produção espera o parecer de advogado (L-ADN-5). [repo]
3. **F5:** confirmar se a sonda de colunas reais do relatório do Mercado Pago rodou. O #615 já está na `main`, mas a nota do nó ainda a cita como condição (l. 41). [parcial]
4. **TEAMMATES e RAG:** com EXECUTA. Antes de abrir os PRs restam a pesquisa LGPD (PR-8 e PR-10 do TEAMMATES), o Redis no runbook do M2 e a prova da carga do `sqlite-vec` e do drift do Prisma (RAG-PR-A). [nota]
5. ⊕ **Ordem antes do código:** CICLO-FISCAL, NFSE-PAULISTANA, DP-PONTE-RAZAO e EFICIENCIA-FISCAL têm `executa`, e os quatro BRIEFs já foram emendados pelo país na borda no #1338. Pelo F-PBA-7, a fatia F3 (registro de formato do `LegalParameter`) entra antes do PR-0 do ciclo e do PR-P0 da ponte. A DP-PONTE-RAZAO espera também o PR-6 do F2 (pilha do #1326). [repo] `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §4 e §6, `D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS`
6. ⊕ **Sem `executa`:** o INTEGRA-CONTADOR continua só com planejamento (não foi marcado em 24/11), e a contratação do Serpro é do dono. O SIMULACAO-CENARIO tem só a nota e o BRIEF do PR-0. O nó PAIS-NA-BORDA não tem `executa` de nenhuma fatia (a F0 roda dentro do montador único). [repo] campo `autorizacao` de cada nó
7. ⊕ **Forks pendentes do motor de leis:** F-ML-0..14 seguem com ratificação pendente no BRIEF de LEGAL-REGRAS desde 14/11. [repo]
8. ⊕ **Simulador do salão:** a `integration/simulador-salao` recebeu o #1348 (item 20c/d, DIFAL do RPA) e segue sem PR para a `main`, porque o grupo de lacunas do simulador ainda tem itens planejados. [repo] `gh pr view 1348`
9. **Contradição documental:** a nota `luminaris-product-thesis` (l. 51) diz que AR/AP está fora do roadmap. AP/AR estão implementados em Prisma e a ADR de persistência os trata como candidatos a voltar para DynamicTable. A nota do vault está marcada `revisao: profunda`. [repo] na nota, l. 13 e 51

**Resolvido pelo lote:** o `PRE-ADR-PAIS-NA-BORDA.md` que só existia como arquivo não rastreado está na `main` (#1334), e o
ADR foi aceito (#1338). As lacunas `L-20261124-024900-567c` e `L-20261124-032018-f96d` estão como resolvidas na caixa. O
pedido de `executa` para PES-4 (ponte), NFSE-PAULISTANA e CICLO-FISCAL foi respondido em 24/11.

## 8. O que entrou no lote de 24/11

| PR | Onde | O que é |
| :--- | :--- | :--- |
| #1331 | `main` | forks da caixa e país na borda ratificados; `executa` de CICLO-FISCAL, NFSE-PAULISTANA e DP-PONTE |
| #1332 | `main` | PRE-ADR da simulação completa de 12 meses, nó SIMULACAO-CENARIO e BRIEF do PR-0 |
| #1334 | `main` | motor de leis (LEGAL-REGRAS), D-2026-11-14/15 e o inventário de 14/11 |
| #1338 | `main` | ADR-PAIS-NA-BORDA (Accepted 24/11) e emenda pela regra dos 5 BRIEFs com `executa` |
| #1339 | `main` | BRIEF da fatia F3 do país na borda (registro de formato do `LegalParameter` por domínio e país) |
| #1341 | `main` | BRIEF da fatia F1 do país na borda (razão sem e-Lalur nem regra de níveis da ECD) |
| #1342 | `main` | pesquisas do simulador: FPAS, pisos da CCT, ECD, RAT e padrão de mercado |
| #1343 | `main` | pesquisas legais do simulador: DGT/LC 224, fator r 6.02/6.03, DIFAL do RPA, RICMS 596, IBS, NFS-e do parceiro, energia |
| #1352 | `main` | integração da conta canônica pelo papel, com #1333, #1335 e #1337 (PR-1..PR-3) |
| #1348 | `integration/simulador-salao` | item 20c/d do simulador: DIFAL do RPA e exemplo com fontes |

O #1336 estava fechado e ficou fora do lote.
