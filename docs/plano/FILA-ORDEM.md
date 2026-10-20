# Ordem de execução — fila viva (14/10/2026)

> **Estado deste documento:** RATIFICADA pelo dono em 14/10/2026 ([[D-2026-10-14-FILA-ORDEM-RATIFICADA]]), montada a partir do frontmatter dos nós e das cédulas
> citadas. A ordem vale; cada PR de código ainda precisa de `executa` próprio.
> Mudança de estado de nó continua sendo feita no frontmatter (`plano-vault.mjs fold`). Este arquivo não
> substitui o `_INDEX.md` (gerado): ele só responde **o que vem primeiro**.

## Regras da ordem

1. **Prazo legal externo primeiro**, quando bloqueia código ou gate já em curso.
2. **Gate humano em cadeia** segue a ordem que o dono fixou: H1 → H2 → M2 (`[[H1]]`).
3. **Código só com `executa` citável** (ORCH-006). Brief pronto sem `executa` não entra como "a fazer agora": entra como "pronto para autorizar".
4. Dependência explícita (`depende_de`) manda. Sufixo `?` (condicional) não bloqueia, mas sinaliza risco.

## A. Prazos e decisões do dono (só o dono move)

| # | Item | Por que está aqui | Desbloqueia | Ação do dono |
|---|---|---|---|---|
| A1 | **Caminho da emissão NFS-e (ADN / PSC / PAA)** — [[D5]], [[X10i]] | NFS-e nacional obrigatória para ME/EPP do Simples em **01/11/2026** (Res. CGSN 191 art. 3º I). A decisão de 13/10 pausou o ADN; a FAQ NFS-e v1.1 17.7 exige certificado do próprio prestador no mTLS, o que não fecha com PSC. | [[X10i]], [[X10a]], [[X11]], [[D5]] | Escolher o caminho (decisão F-ADN-1) e acionar o advogado (L-ADN-5) antes de qualquer certificado de cliente. |
| A2 | **H1 — PVA Presumido** [[H1]] | Parado no P5. Falta o passo do dono no RUNBOOK-H1 (PUT da conta 3.4 nas 2 unidades; re-semear; ECD/ECF). | [[H2]] → [[M2]] | Executar o passo e colar a evidência. Agente não preenche desfecho nem assinatura. |
| A3 | **H2 — sign-off de browser** [[H2]] | Depende de H1 (ordem do dono). Inclui o passo de validade do pacote. | [[M2]], deploy do [[PACOTE-VALIDADE]] | Sign-off humano. |
| A4 | **M2 — host e 1º deploy** [[M2]] | VPS contratada (26/09). Chave do MP no ambiente e conta de emissão por unidade (R8). | [[F5]] em produção, [[PACOTE-VALIDADE]], [[GOV-CONTADOR]] (consulta CFC), [[P4]] (assinatura) | Deploy após H2. |
| A5 | **D7 — PNCT** (vigilância de comunicações) | Prazo **31/12/2026**. Nasce com a emissão (depende de A1). | — | Corrigir até o prazo, com contador responsável. |
| A6 | **D1 / D1f / D2 — contador e XML real de NF-e** | Pedido de follow-up de 26/09 não enviado; falta alíquota de ISS e cClassTrib; sem XML real (E9 fica preso). | Fixtures reais ([[E9]]), itens 5a–5f | Enviar o pedido ao contador (o agente só monta). |
| A7 | **F-GOV-1 — consulta ao CRC-SP** | Dono decidiu enviar agora (10/10). | [[GOV-CONTADOR]] | Confirmar envio. |

## B. Código destravado (precisa de `executa` do dono, por PR)

Ordem sugerida, da menor dependência para a maior:

| # | Nó | Estado de dependência | Próximo passo |
|---|---|---|---|
| B1 | [[X9]] — DCTFWeb / MIT (PR-2 e PR-4) | **Destravado em 14/10**: [[X7]] foi fechado (Fases A, B e C em `main`). | `executa` do PR-2 (itens 10–12, 15–17). |
| B2 | [[I5]] + [[I4]] — venda sem mapper e onboarding | BRIEF conjunto com forks F-I4-4/5 e F-I5-1..4 ratificados. Sem fork pendente. | `executa` do BRIEF I4+I5. |
| B3 | [[BE-INCR-SIMPLES-DEFIS-MANUAL]] e [[BE-INCR-SIMPLES-GET-ENTRADAS]] | BRIEFs prontos (12/10). Pré-requisitos do FE do Simples. | `executa` de cada um (PRs separados). |
| B4 | [[FE-INCR-SIMPLES]] — PR-A a PR-D | **Em `main`** (fold 20/10): PR-A/B/C mergeados em 15/10 (#714, #718, #720) e PR-D #733 em 16/10. Nó `done`. | Fechado — nada a executar. |
| B5 | [[CRM-RB]] / [[FE-INCR-CRM-REPORT-BUILDER]] — PR-C (modelos) | PR-A, PR-B e PR-D em `main`. PR-C precisa do pré-requisito de BE (`GET /api/crm/reports/templates`), que **não existe** em `main`. | Planejar o BE do GET; depois `executa` do PR-C. |
| B6 | [[F5]] — FE da cobrança (EMENDA-1 pronta) | Mercado Pago em `main` (PR-2 e PR-3). Chave no ambiente só com M2 (A4). | `executa` do FE da cobrança. |
| B7 | [[FE-INCR-BANK-SETTLEMENT-FEE]] | Depende de F5 (B6). BE da view (#620) já em `main`. | `executa` do FE depois de B6. |
| B8 | [[LAC-B]] — UI da prensa de binding | **Destravado em 14/10** (estado `ready`): a pausa F-KS-0 caiu com o KIT-SETOR concluído; F-I4-4 (a) e F-BA-2 (b) decididos em 13/10. Acoplamento: PR-0 e I4 PR-2 criam o mesmo `mapperReload.ts` (quem chegar primeiro em `main` cria, o outro importa). | `executa` do PR-0 e depois do PR-1. Coordenar com I4 PR-2. |
| B9 | [[X14-CAIXA]] | **Em `main`** (fold 20/10): #729 → #738 → #739 mergeados em 16/10. Nó `done`; as pendências A1–A3 do contador ficam fora da fila de código. | Fechado — nada a executar. |

## C. Backlog sem prioridade (planejado, sem `executa`)

[[W2]], [[W4]], [[W5]], [[W6]], [[W7]], [[I6]], [[I7]], [[I11]]. O [[W3]] tem código mergeado; falta o sign-off de browser (humano) e a decisão F-W3-1.

## D. Bloqueado por gate externo (não entra na fila de código)

- [[X10a]] (NFC-e e NFS-e por tipo) e [[X10i]] (emissão): dependem de A1.
- [[X11]] PR-2: dependem de [[X10i]].
- [[CSLL-RESSEGURADORES]]: espera o ADE da Receita com o leiaute novo da ECF.
- [[F6]] (Pix de saída): gate externo do Mercado Pago (chave ed25519).
- [[P-IA]]: depende de R10 e D6.

## E. Correções do molde operacional (achados de 19/10)

> Encaixada a pedido do dono em 19/10 ([[D-2026-10-19-ACHADOS-NA-FILA]]). A **ordem interna é proposta do agente**; não altera A–D
> ratificadas. Cada PR de código continua exigindo `executa` próprio; merge só por número.

| # | Item | Estado | Por que nesta posição | Ação do dono |
|---|---|---|---|---|
| E1 | Merge dos PRs: [[DT-ARQ-CORRECOES]] (#769 ✅ 20/10), [[FIX-ESTOQUE-FINALIZE]] (#771 ✅ 20/10), [[FIX-ANALYTICS-DADO]] (#770 ✅ 20/10), [[FIX-ADDEDFIELDS-VAZAMENTO]] (#772 ✅ 20/10) | **Fechado (20/10)**: os quatro mergeados | Já prontos. O #771 corrige o fluxo de venda que os passos 6–11 do [[H2]] (A3) exercitam na tela — entrou antes do sign-off | — (a decisão (a)/(b) do item 3 do #770 continua com o dono) |
| E2 | [[TESTE-ACOPLAMENTO-PRESET]] | planned | Barato e preventivo: é a causa comum de 4 achados (campo lido que o preset não declara) | `executa` |
| E3 | [[FIX-PLUGINS-VENDA]] | planned | Mudam estoque e receita em silêncio no molde; mesmos arquivos do #771 (depois de E1) | `executa` (pode ser fatiado) |
| E4 | [[FIX-AUTH-CONTA]] | planned | Delete de usuário 500 com vetores já apagados; logout/JWT; ADMIN desativando o próprio layout | `executa` |
| E5 | [[FIX-CHAT-AGENTE]] | planned | Injeção de `system` no histórico; PROCESSING eterno; propostas sem TTL | `executa` |
| E6 | [[FIX-FE-DASHBOARD]] | planned | Datetime com dia anterior, 401 e erros por campo — o que o dono vê ao clicar | `executa` |
| E7 | [[FIX-ANALYTICS-RESIDUO]] | planned | Período/fuso e validador; depois do #770 | `executa` |
| E8 | BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS` (branch local `claude/mystifying-ptolemy-65dd7c`, empilhada no #769, não pushada) | BRIEF com forks ratificados | Arquitetura, sem efeito no dado do usuário; depende do #769 | Pedir o push/PR do BRIEF; depois `executa` |

Estruturais (não entram na fila de código; precisam de PRE-ADR): [[BUILDER-VERTICAIS]] (só o CRM é módulo; preset é código)
e [[W1]] (a entrevista descarta a customização).

## Pendências de documentação que esta fila expôs

- `LAC-B` estava `blocked` sem motivo atual. Corrigido para `ready` em 14/10 (ver B8). Pendência: `I3` (done) lista LAC-B em `depende_de`.
- `F5` → `P-IA?`: **não bloqueia o FE do Mercado Pago**. A aresta pertence ao adaptador CNAB (ADR-INCR-PAYMENT-PROVIDER-COLLECTION §6.1). A fase CNAB depende também de D6, que não está em `depende_de` de F5.
- O índice (`_INDEX.md`) ordena os "Destravados" alfabeticamente, não por esta ordem.
- Os PRs #769–#772 (19/10) não tinham nó no vault; o fold entrou num PR de docs à parte ([[D-2026-10-19-ACHADOS-NA-FILA]]), porque os PRs já estavam abertos.

## F. Complemento pela régua TOTVS / Salesforce / Power BI (ratificado 20/10)

> Régua **própria** de 22 nós, separada da régua de 63 ([[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]], Q1 a). Detalhe,
> dependências e fronteira em [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20`](PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md)
> §4. Entra **depois** de A–E; nó só vira `nos/` com PRE-ADR ratificado; código só com `executa` por PR.

| # | Onda | Nós | Estado | Ação do dono |
|---|---|---|---|---|
| F1 | Prazo legal (01/12/2026 · 01/01/2027) | `IBS-CBS-2027` (promove [[M5-ibs-cbs]]) · `RETENCOES-FONTE` · `EFD-REINF` · [[NFE-DANFE-IBSCBS]] · [[PRESUMIDO-TETO-78MI]] | PRE-ADRs **autorizados** (Q2 a, só planejamento) | ratificar forks; `executa` por PR |
| F5.1 | Pré-requisito | `EMAIL-TRANSPORT` | proposta | Q7 (BYOK) + PRE-ADR |
| F1.5 | Eficiência fiscal lícita (sugestão + guarda) | [[EFICIENCIA-FISCAL]] — combo itemizado com desconto incondicional rateado e piso por item; segregação por NCM; simuladores de fator r, regime e remuneração do sócio; guarda anti-simulação; relatório de economia ([pesquisa 20/10](../accounting/PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md)) | PRE-ADR **Proposed** 20/10 ([[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]; `ADR-INCR-EFICIENCIA-FISCAL`); forks F-EF-1..9 pendentes | ratificar forks; P-EF-1..6 ao contador (A1–A3); `executa` por PR, PR-1 só depois do P-EF-1 |
| F2 | Financeiro nível TOTVS | `TESOURARIA` · `REGUA-COBRANCA` · `CONC-ADQUIRENTE` · `CONTRATOS-RECORRENTES` · `ALCADA-PAGAMENTO` (portão P3) · `ORCAMENTO` | proposta | Q6 + PRE-ADR cada |
| F3 | Contábil nível TOTVS | `RATEIO-DIMENSOES` · `PROVISOES-AGENDADAS` (ADR × [[R-motor-regras]]) · `FECHAMENTO-ASSISTIDO` · `RB-CONTABIL` | proposta | Q5 + PRE-ADR cada |
| F5 | Analytics nível Power BI | `EXPORT-RELATORIOS` · `ALERTAS-ASSINATURAS` · `IA-ANALYTICS` (promove [[M5-ia-analytics]], depois do [[H1]]) | proposta | PRE-ADR cada |
| F4 | Fiscal de comércio (gate: contribuinte de ICMS) | `TABELA-TRIBUTARIA-PRODUTO` · `MANIFESTACAO-DFE` · `EFD-ICMS-IPI` · `AGENDA-FISCAL` · `NFSE-PAULISTANA` | proposta | Q9 |

Fechado em 20/10 (R0, Q3 a): E1 inteiro mergeado (#769 · #771 · #770 · #772); X14-CAIXA (#729/#738/#739), FE-INCR-SIMPLES
PR-D (#733) e X11 PR-1 (#633) em `main` — fold em sessão própria.
