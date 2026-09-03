# Cédula de decisão — 2026-09-03 (fechamento por módulo: contábil · financeiro · fiscal)

> **O que este doc é:** o registro das **12 decisões ratificadas pelo dono em 2026-09-03** (9 na 1ª rodada + F-M7/F-M8 + F-Z0/F-Q1/F-W2F-3/5 nas rodadas 2 e 3) (sessão,
> `AskUserQuestion`, duas rodadas) sobre o que "fechar" cada um dos três módulos significa, a
> **medição por módulo** com denominador explícito, e a fila resultante. Segue a
> [cédula de integração](CEDULA-DECISAO-2026-09-03-integracao.md) do mesmo dia. Todo claim de estado
> foi verificado contra `origin/main` (`2c2fda6a`): rotas em `server/src/routes/*.ts`, abas em
> `my-app/features/accounting/AccountingView.tsx` (19 ids), consumidores FE por grep em
> `my-app/lib/services` + `my-app/features`, ADRs em `docs/adr/` (44 entradas, incl. INDEX e 2 pareceres).
>
> **O que não é:** execução. Cada item da seção E cita a decisão que o autoriza (ORCH-006); frentes
> novas abrem por **ADR + BRIEF**, não por esta cédula.

---

## A. Objeção de partida — os três módulos não existiam como régua

Nenhum doc do repo define "financeiro", "contábil" e "fiscal" (grep em `docs/`, `CLAUDE.md`, skills:
zero ocorrências de "módulo financeiro/fiscal/contábil"). A régua oficial (§7 do master map) tem
**5 núcleos** cortados por maturidade, não por domínio. A partição abaixo foi construída do inventário
real e ratificada como **F-M1**. A régua do §7 continua; esta é uma segunda projeção do mesmo estado.

Achado colateral: o §2 do master map diz "16 abas"; `AccountingView.tsx` tem **19** (aging, contrapartes
e aprovações entraram depois do texto).

---

## B. As 12 decisões (9 + 3 rodadas) — ✅ RATIFICADAS 2026-09-03 (dono, `AskUserQuestion`)

| # | Fork | Decisão | Contra a recomendação? |
|---|---|---|---|
| **F-M1** | Fronteira dos módulos | **Partição proposta ratificada:** contábil = razão/escrituração (inclui ECD, encerramento, pontes/prensa); financeiro = tesouraria + subrazões operacionais (inclui estoque/CMV); fiscal = referencial RFB, split, ECF, NF-e, apuração de tributos | não |
| **F-M2** | Escopo do fiscal | **Máximo:** obrigações anuais já mapeadas **+ apuração de tributos** (IRPJ/CSLL, PIS/COFINS, ISS) **+ EFD-Contribuições + DCTF/DCTFWeb** | **SIM** — recomendação era "só anuais já mapeadas" |
| **F-M2b** | Leitura do "também" | Confirmado: **os três** (apuração + as duas acessórias), não só arquivos a partir de valores manuais | — |
| **F-M3** | Escopo do financeiro | **Máximo:** mapeado (H2 + NF-e) **+ baixa parcial AP/AR + fluxo de caixa projetado (read-only) + remessa CNAB/boleto/Pix** | **SIM** — recomendação era só o mapeado |
| **F-M4** | Escopo do contábil | **Os 3 itens:** tela de `verify-chain`, tela de `source-documents`, **envio de ECD/ECF por e-mail ao contador** | **SIM** — recomendação deixava o e-mail diferido |
| **F-M5** | Oráculo das regras fiscais | **Pacote ao contador primeiro** — [PEDIDO-CONTADOR-2026-09-03.md](PEDIDO-CONTADOR-2026-09-03.md); os ADRs fiscais abrem com a resposta como insumo | não (o dono pediu "a task para passar ao contador") |
| **F-M6** | Ordem | **Contábil → Financeiro → Fiscal** | não |
| **F-M7** | **Emitir documento fiscal (NFS-e / NF-e) ou só ingerir?** — Ato Conjunto RFB/CGIBS nº 4/2026: NFS-e obrigatória para serviços sujeitos ao ISS em **01/10/2026**, NF-e para não contribuinte de ICMS em **01/12/2026** (secundárias convergentes; PDF pendente). Emissão = certificado A1/A3 e custódia, série/numeração, autorização, contingência, cancelamento, rejeições: **outro produto dentro do produto**. Decisão datada: até quando, e qual o gatilho | ✅ **RATIFICADO → (d), opção do dono:** *"chegar até a ponta da emissão para poder exportar e enviar a um parceiro emissor via API"*. O sistema **não emite**: monta o documento fiscal de saída completo (NFS-e padrão nacional / NF-e, com `cClassTrib` e grupos IBS/CBS) e o entrega a um **parceiro emissor por API**; certificado, autorização, contingência e rejeição ficam no parceiro. Abre `ADR-INCR-DFE-EMISSAO-PARCEIRO`; escolha do parceiro e credenciais = dado externo (gate humano). Entra no denominador do fiscal (nó 13) | — (4ª opção, definida pelo dono) |
| **F-M8** | **IRPJ/CSLL: declarar a restrição "só apuração trimestral" (Fork 5 da ECF Fase 3) como critério de qualificação de cliente, ou reabrir o Fork 5 para atender estimativa mensal?** Não é fork novo — é restrição já assumida que estava disfarçada de "aberto/dono" | ✅ **RATIFICADO → declarar.** "Atende Lucro Real com apuração **trimestral**"; tenant em estimativa mensal fica fora até segunda ordem. Registrado no `ADR-INCR-SPED-ECF-FASE3` (emenda) e herdado pelo futuro `ADR-INCR-TAX-ASSESSMENT`. Zero código | não |
| **F-Z0** | **CAMADA ZERO — o que o Luminaris é:** escrituração contábil (fonte da ECD, responsável pelo número) ou módulo fiscal alimentado pelo contador? Não constava de nenhum doc; a 3ª rodada da revisão do dono a expôs via imobilizado ("não existe empresa no Lucro Real sem imobilizado — 'só atendemos quem não deprecia' é lista vazia") | ✅ **RATIFICADO, palavras do dono:** *"substituir completamente todo o processo manual de contabilidade e exportar para contador apenas assinar o trabalho pronto, e enviar até a ponta para API de emissão de nota fiscal."* → **Luminaris É a escrituração.** Consequências: (1) **imobilizado + depreciação** viram frente autorizada (`ADR-INCR-FIXED-ASSETS`, já nomeado no §5 do master map), **acima** de EFD-Contribuições por sobrevivência (IRPJ/CSLL não são tocados pela reforma; o e-Lalur de 2028 parece com o de hoje); (2) **retificação de ECD/ECF** entra na lista; (3) o contador vira **assinante** — o pacote de saída é "pronto para assinar", e o e-mail ao contador (C6) deixa de ser conveniência; (4) os Forks 2/3/4 da ECF Fase 3 esperavam ESTA resposta, não só o PDF: a origem do bloco L é o próprio razão. **⚠️ RATIFICADA SOB PREMISSA NÃO TESTADA (4ª rodada, dono):** *"o contador só assina"* não é dele para conceder — a ECD é assinada com certificado do contabilista com CRC, que responde tecnicamente pela escrituração perante o conselho [L, alta confiança do dono; não conferido]. Nenhum contador assina o que não conduziu sem revisar; se a resposta for "não" ou "só lançamento a lançamento", **F-Z0 reabre e o trilho contábil autorizado por ela sai junto**. É C3×D5 (regulado, sem saída interna); oráculo = contador. **Aberto Z0-a**, ao lado de T1b, item **0** do pedido refeito. Segunda pergunta no mesmo pacote: fronteira entre *vender software de contabilidade* e *prestar serviço contábil* (atividade de CRC) — a linha prática é o contador do cliente seguir como responsável técnico; nenhum material comercial "sua contabilidade no sistema" antes da resposta | — (nova; 1ª opção era a recomendada) |
| **F-Q1** | Promover ADR-P2 (clínica estética) a `Accepted` agora ou esperar H1/H2 | ✅ **RATIFICADO → promover agora.** Status do ADR alterado nesta sessão. O BRIEF do P2 (já escrito, 8/8 forks ratificados em 25/08) pode abrir `sessao-feature` em paralelo aos gates | **SIM** — recomendação era esperar (pré-condição "vertical 1 validado" segue falsa; risco: a prensa muda no H2 e o P2 nasce sobre premissa não provada) |
| **F-W2F-3 / F-W2F-5** | Forma do conserto do skip-and-advance do job de reconcile (item falho / bloqueado por período pulado e nunca re-varrido) | ✅ **RATIFICADO → (b) marca avança; item vai para tabela de pendências re-varrida.** Exige migração (tabela nova) + comando/tela de pendências → BRIEF `BE-INCR-RECONCILE-PENDING` (contábil, C7). Substitui o "aberto/dono" da cédula de 31/08 §B² | **SIM** — recomendação era a mecânica do F-W2F-4 |
| **D2 anotadas pelo agente (não são forks; 3ª rodada)** | (i) **Docs de hoje = PR agora, pelo loop** (review independente + merge automático) — docs e código têm raio de explosão diferente; segurar a correção de data e a spec é fábrica de conflito. (ii) **MIT: porta `EnvioMit` com dois adaptadores possíveis** (file writer JSON × HTTP client) — o ADR X7 nomeia a porta e **adia** o adaptador; confirmar API no e-CAC é tarefa de 20 min, **não bloqueia** mais. (iii) **Item 9 colapsou:** NFS-e primeiro é calendário (01/10 → 01/12), não preferência; **varredura de parceiros emissores** com critério "emite NFS-e em São Paulo capital e Rio capital" é **execução** que alimenta o ADR X10; o único fork real que sobra é **onde vive a credencial** (uma chave do Luminaris emitindo por N tenants × credencial por tenant) — decisão de responsabilidade, do dono, no ADR. (iv) **Item 4 fechou por consequência:** a fixture tem de ser autorizada ≥ 03/08/2026 (grupos IBS/CBS); open source é pré-reforma e o XML do contador é de safra desconhecida → **XML de compra da própria empresa, de agosto ou setembro** | ✅ decididas e anotadas (C4×D1/D2) | — |
| **Item 10 — FECHADO por fato** | Programa de conformidade previsto no Ato nº 4 | **Ato Conjunto RFB/CGIBS nº 5, de 12/08/2026** (DOU 13/08) institui o **PNCT 2026** — verificado em secundárias convergentes ([IRIB](https://www.irib.org.br/ato-conjunto-rfb-cgibs-n-5-de-12-de-agosto-de-2026/), [LegisWeb](https://www.legisweb.com.br/legislacao/?id=499233), [APET](https://apet.org.br/noticia/receita-e-comite-gestor-definem-regras-de-conformidade-para-documentos-fiscais-de-ibs-e-cbs-em-2026/)); PDF não aberto. Enquadramento **automático** para quem cumpre as acessórias; permanência exige corrigir inconsistências **até 31/12/2026**; contador indicado recebe as inconsistências. **Não posterga 01/10.** Consequências: (1) o 1º release de emissão pode sair imperfeito e autorregularizar; (2) nasce uma **obrigação operacional humana** — vigilância de comunicações/intimações — que entra na lista de execução humana; (3) o compartilhamento com o contador é gancho legal do C6 | — |

**Ressalva registrada antes de proceder (dono reafirmou):** F-M2/F-M3/F-M4 reabrem cinco linhas que o
master map §5 e o `ROADMAP-PLATAFORMA.md` A7 marcam como **diferidas por demanda** ("não puxar por
completude"). A ratificação aqui é o sinal humano que o ORCH-006 exige para **abrir ADR**; não autoriza
implementar sem BRIEF nem sem os forks de cada ADR ratificados.

---

## C. Medição por módulo — denominador explícito, estado verificado

**Regra de contagem (aplicada primeiro a esta cédula):** um nó conta 1 quando está mergeado em `main`
**e** tem consumidor de tela quando é operação do dono (rota sem tela = aberto). Gate humano conta no
denominador "com gates", não no de código. Linha diferida **por decisão** (LAC-B, imobilizado, folha,
inbox/outbox) fica fora — não-objetivo não é lacuna. Peso 1 por nó; a régua mede nós, não esforço.

### C.1 Contábil — ~~13/17~~ **13/19 código (68%)** · ~~13/20~~ **13/22 com gates (59%)** — nós 18 e 19 entraram pelo F-Z0 (3ª rodada)

| # | Nó | Estado |
|---|---|---|
| 1 | Escopo + plano de contas hierárquico | ✅ |
| 2 | Períodos (FUTURE/OPEN/SOFT/HARD, gate in-tx) | ✅ + aba |
| 3 | Lançamento/estorno/numeração gapless/hash-chain/timezone | ✅ |
| 4 | Anexos sha256 | ✅ |
| 5 | Proveniência (SourceDocument) + seam `attachSourceDocument` | ✅ backend |
| 6 | Aprovação maker-checker | ✅ + aba |
| 7 | Dimensões + eixo obrigatório | ✅ + aba |
| 8 | Relatórios: balancete, razão, BP, DRE, comparativo, diário, por dimensão | ✅ + abas |
| 9 | Import/export CSV/XLSX com staging | ✅ + aba |
| 10 | Encerramento de exercício I350/I355 + tela (#238) | ✅ |
| 11 | ECD (serializer 25 registros, gate de cobertura) | ✅ + aba |
| 12 | Recibos PDF + botão (#263) | ✅ |
| 13 | Pontes de sync + feeder + prensa de binding (P1, CLI) | ✅ |
| 14 | **Tela de `GET /audit/verify-chain`** | ⛔ 0 consumidor FE (F-M4) |
| 15 | **Tela de `source-documents` por lançamento** | ⛔ 0 consumidor FE (F-M4) |
| 16 | **Envio de ECD/ECF por e-mail ao contador** | ⛔ ADR novo — canal + LGPD + confirmação por envio (F-M4) |
| 17 | Resíduos do job de reconcile **F-W2F-3 / F-W2F-5** | ⛔ ratificado (b) tabela de pendências re-varrida → BRIEF `BE-INCR-RECONCILE-PENDING` (migração) |
| 18 | **Imobilizado + depreciação** (F-Z0) — `ADR-INCR-FIXED-ASSETS` | ⛔ 0 linhas, 0 ADR escrito; **acima de EFD-Contribuições** por sobrevivência |
| 19 | **Retificação de ECD/ECF** (F-Z0: quem escritura, retifica) | ⛔ 0 ocorrências; entra no BRIEF da ECF Fase 3 ou em ADR próprio |
| G1 | **H1** — PVA da ECD/apuração (Presumido) | gate humano, runbook em branco |
| G2 | **H2** — sign-off de browser | gate humano, runbook em branco |
| G3 | **B-4** — ensaio de restauração (pré-condição do H1) | gate humano, runbook em branco |

### C.2 Financeiro — 13/17 código (76%) · 13/18 com gates (72%)

| # | Nó | Estado |
|---|---|---|
| 1 | Contas a Pagar (Payable + pagamento + ledger) | ✅ + aba |
| 2 | Contas a Receber | ✅ + aba |
| 3 | Contrapartes first-class + normalização | ✅ + aba |
| 4 | Aging AP/AR | ✅ + aba (#248) |
| 5 | Conciliação bancária: OFX + CNAB 240 + auto-match em lote + unmatch | ✅ + aba |
| 6 | DFC método indireto | ✅ + aba |
| 7 | Filtros ricos de subledger | ✅ |
| 8 | Ações da venda pela tela: pagar/cancelar/devolver (LAC-A) | ✅ #259 |
| 9 | Valoração da compra pela tela (LAC-D) | ✅ #259 |
| 10 | Estoque perpétuo + CMV + ponte AP→estoque | ✅ |
| 11 | Tie-out físico×contábil de estoque (LAC-E) | ✅ #259 |
| 12 | Pacotes (package balances) + reconcile de passivo | ✅ |
| 13 | Seam CRM → AR | ✅ |
| 14 | **Baixa parcial em AP/AR** | ⛔ rejeitada explicitamente hoje (`ReceivableService.ts:213`, `PayableService.ts:316`) — ADR novo (F-M3) |
| 15 | **Fluxo de caixa projetado (read-only sobre vencimentos AP/AR)** | ⛔ 0 ocorrências de forecast/projeção — BRIEF (F-M3) |
| 16 | **Remessa CNAB / boleto / Pix de saída** | ⛔ 0 linhas; `lib/cnab.ts` só lê retorno/extrato; sem entidade "conta bancária" — ADR novo + **dado externo do banco** (F-M3) |
| 17 | NF-e de compra pré-preenchendo AP (consumidor financeiro da NF-e) | ⏳ em voo pela cédula de integração (conta 1 aqui, o nó NF-e inteiro conta no fiscal) |
| G1 | **H2** — upload OFX/CNAB **por clique** | gate humano |

### C.3 Fiscal — ~~4/12~~ **4/13 código (31%)** · ~~4/14~~ **4/15 com gates (27%)** — nó 13 entrou pelo F-M7 (2ª rodada)

| # | Nó | Estado |
|---|---|---|
| 1 | Referencial RFB: mapeamento, lote, cópia, esqueleto, cobertura, catálogo + aba Compliance | ✅ |
| 2 | Split de receita por natureza | ✅ |
| 3 | ECF Lucro Presumido (Fase 2) + aba SPED | ✅ |
| 4 | ECF Lucro Real — esqueleto (rota/serviço/DTO/serializer, `0010` parametrizável) | ✅ #263 |
| 5 | **Import do catálogo RFB na tela** (`referential/catalog/import`) | ⛔ 0 consumidor FE; hoje só script |
| 6 | **Botão de ECF Lucro Real** (`sped/ecf/real/generate`) | ⛔ 0 consumidor FE |
| 7 | **ECF Lucro Real — blocos L/M/N + e-Lalur** | ⛔ marcadores vazios (`ecfReal.ts:38`); Forks 2/3/4 esperam o Manual (pedido item 4) |
| 8 | **NF-e** — BE (rebase da tag) + UI | ⏳ cédula de integração E2–E7 |
| 9 | **Apuração de tributos** (IRPJ/CSLL, PIS/COFINS, ISS) | ⛔ 0 ocorrências em `server/src`; ⚫ desde 31/08 → **autorizado a abrir ADR** (F-M2), insumo = pedido item 1 |
| 10 | **EFD-Contribuições** | ⛔ 0 linhas, 0 docs → ADR novo (F-M2), validador próprio (PVA EFD-Contribuições) |
| 11 | **DCTF / DCTFWeb** | ⛔ 0 linhas, 0 docs → ADR novo (F-M2). **Grau: inferido** — a DCTFWeb é gerada no e-CAC a partir das escriturações; o que o sistema entrega pode ser só os valores apurados. Pedido item 1 resolve |
| 12 | **Regra de custo D3 sob Lucro Real** (`vICMS`/PIS/COFINS recuperáveis) | ⛔ a fórmula do ADR-INCR-NFE §D3 assume não-contribuinte (Simples/Presumido); o próprio ADR exige flag de regime antes de reusar — pedido item 2 |
| 13 | **Emissão de documento fiscal de saída via parceiro emissor (API)** — NFS-e padrão nacional (salão, obrigatória 01/10/2026) e NF-e (revenda, 01/12/2026), montadas até a borda e entregues ao parceiro | ⛔ 0 linhas (F-M7 → (d)); ADR novo; parceiro + certificado = dado externo |
| G1 | **X2** — import do arquivo RFB (baixado, runbook em branco) | gate humano |
| G2 | **H1** — PVA Presumido, depois **H1 2ª passada** Lucro Real | gate humano ×2 |

**Leitura honesta:** o fiscal é o único módulo cujo denominador **cresceu** hoje (de 8 para 13 nós — 12 pelo F-M2, 13 pelo F-M7) por
decisão do dono. Antes do F-M2 ele estava em 4/8 (50%). O número caiu porque a régua ficou mais
verdadeira, não porque algo regrediu.

---

## D. Reverificação — o que foi conferido contra código, não contra docs

| Claim | Como | Resultado |
|---|---|---|
| Abas do painel | `grep "id: '" AccountingView.tsx` | 19 (o §2 do map diz 16 — desatualizado) |
| Rotas sem consumidor FE | grep dos paths em `my-app/lib/services` + `my-app/features` | `source-documents` 0 · `sped/ecf/real` 0 · `referential/catalog/import` 0 · `audit/verify-chain` 0 · `accounting-binding` 0 (LAC-B, diferida) |
| Baixa parcial | grep `parcial` nos services | rejeitada com 400 explícito em AP e AR |
| Remessa/boleto/Pix | grep case-insensitive em `server/src` | hits só como **string de forma de pagamento** em DTOs/modelos; nenhum gerador de remessa |
| Obrigações mensais do Lucro Real | grep `EFD`, `Contribui`, `DCTF`, `Reinf`, `eSocial`, `PIS`, `COFINS`, `ICMS` em `server/src` | `EFD`/`DCTF`/`Reinf`/`eSocial`/`PIS`/`COFINS`/`ICMS` = **0** arquivos de código; `Contribui` = 4 (contexto não fiscal) |
| Blocos L/M/N | `ecfReal.ts:38-42` | "marcadores vazios — conteúdo pendente do Manual do Leiaute 12" |
| Runbooks humanos | grep `desfecho (PASSOU\|FALHOU\|INCONCLUSIVO)` | H2, M2, X2 com **0** desfechos; B-4 e H1 com 1 (o cabeçalho de formato, não execução) |
| Imobilizado / folha | grep `fixed.?asset\|imobilizado` em `server/src` | 0 — seguem ⚫ (não entraram no F-M3/F-M4) |

---

## E. Fila resultante por módulo — ordem F-M6, cada item com a decisão que o autoriza

### E.1 Contábil (primeiro)

| # | Item | Sessão / dono | Autorização | Depende de |
|---|---|---|---|---|
| C1 | **B-4** ensaio de restauração | dono | fila 09-02 item 1 | — |
| C2 | **H1** PVA em Presumido (ECD + apuração + ECF) | dono | fila 09-02 item 3 | C1 |
| C3 | **H2** sign-off de browser | dono | fila 09-02 item 4 | — |
| C4 | `sessao-planejamento` → BRIEF **FE-INCR-AUDIT-PROVENANCE**: botão "verificar cadeia" (`verify-chain`) + lista de documentos de origem no `JournalEntriesPanel` | agente | F-M4 | — (pode ir no mesmo lote FE da NF-e) |
| C5 | `sessao-feature` do C4 + review + merge | agente | F-M4 + forks do BRIEF | C4 |
| C6 | **ADR-CONTADOR-DELIVERY**: envio de ECD/ECF por e-mail — canal, LGPD (dado contábil saindo do processo), confirmação explícita por envio | `sessao-planejamento` após ADR | F-M4 | — |
| C7 | ~~Decidir F-W2F-3 / F-W2F-5~~ → **BRIEF `BE-INCR-RECONCILE-PENDING`**: tabela de pendências do reconcile (item falho/bloqueado por período), re-varredura, comando/tela | `sessao-planejamento` → feature | F-W2F-3/5 → (b) | — |
| C8 | **`ADR-INCR-FIXED-ASSETS`**: imobilizado + depreciação (método, vida útil fiscal × contábil, baixa) — **entra antes de X8** na ordem global por sobrevivência | ADR → BRIEF → feature | F-Z0 | contador real: tabela de taxas que ele pratica (pedido ao contador, item novo) |
| C9 | **Retificação de ECD/ECF** — substituição de arquivo já entregue (registro `0000` com `IND_SIT_ESP`/retificadora, `HASH_ECF_ANTERIOR`) | BRIEF ECF Fase 3, item novo | F-Z0 | — |
| C10 | **P2 clínica estética** — BRIEF pronto, 8/8 forks ratificados (25/08), ADR promovido a `Accepted` hoje | `sessao-feature` | F-Q1 → promover | RUNBOOK-H3 para o sign-off |

### E.2 Financeiro (segundo)

| # | Item | Sessão / dono | Autorização | Depende de |
|---|---|---|---|---|
| F1 | NF-e BE + UI | cédula de integração E2–E7 | F-I2..F-I8 | — |
| F2 | **H2** upload OFX/CNAB por clique | dono | fila 09-02 item 4 | — |
| F3 | **ADR-INCR-PARTIAL-SETTLEMENT**: baixa parcial AP/AR (N recibos por título, aging por saldo, CAS por saldo) | ADR → BRIEF → feature | F-M3 | — |
| F4 | **BRIEF FE-INCR-CASH-FORECAST**: caixa projetado read-only sobre vencimentos AP/AR (sem migração) | `sessao-planejamento` | F-M3 | — |
| F5 | **ADR-INCR-BANK-OUTBOUND**: conta bancária como entidade + remessa CNAB 240 + boleto + Pix | ADR | F-M3 | **dado externo:** convênio/leiaute do banco do 1º cliente — gate humano, sem sessão de agente |

### E.3 Fiscal (terceiro)

| # | Item | Sessão / dono | Autorização | Depende de |
|---|---|---|---|---|
| X1 | **Enviar o pedido ao contador** ([PEDIDO-CONTADOR-2026-09-03.md](PEDIDO-CONTADOR-2026-09-03.md)) | dono | F-M5 | — |
| X2 | **X2** import do arquivo RFB | dono | fila 09-02 item 2 | — |
| X3 | BRIEF **FE-INCR-COMPLIANCE-2**: botão ECF Lucro Real + import do catálogo na aba Compliance | `sessao-planejamento` | F-M2 (telas do já-existente) | — |
| X4 | ECF Fase 3 — Forks 2/3/4 + blocos L/M/N | dono ratifica → `sessao-feature` | fila 09-02 item 5 | pedido item 4 (Manual) |
| X5 | **H1 2ª passada** em Lucro Real | dono | fila 09-02 item 6 | X4 |
| X6 | Triagem da resposta do contador → emenda **ADR-INCR-NFE §D3** (flag de regime) | liaison → ADR | F-M5 | X1 |
| X6b | **BRIEF `BE-INCR-CNPJ-ALFA`** (T10, transversal): `lib/cnpj.ts` alfanumérico + DV ASCII−48; troca dos 4 regex `\d{14}` em `SpedEcdDto`/`SpedEcfDto`; pré-requisito do merge da NF-e | `sessao-planejamento` → feature | achado [V-repo] da triagem | — |
| X7 | **ADR-INCR-TAX-ASSESSMENT — parte que atravessa 2027:** IRPJ/CSLL (trimestral, F-M8) + **DCTFWeb/MIT**. **Bloqueante:** MIT é file writer (JSON importado no e-CAC) ou HTTP client? | ADR | F-M2 | X1 (pedido item 1), F-M8, pendência MIT |
| X9 | **ADR-INCR-DCTFWEB** — pode fundir com X7 se o adaptador for um só | ADR | F-M2 | X7 |
| X10 | **ADR-INCR-DFE-EMISSAO-PARCEIRO** (F-M7): modelo do documento de saída (NFS-e nacional / NF-e com `cClassTrib` + IBS/CBS), adaptador HTTP para parceiro emissor, retorno (autorizado/rejeitado) gravado como `SourceDocument`. **Forks do ADR:** qual parceiro; NFS-e primeiro (onda 01/10) ou os dois; onde vive a chave de API (BYOK, coerente com ADR-M2). **Gate humano:** contratar parceiro + certificado do cliente | ADR → BRIEF | F-M7 | pendência MIT não bloqueia; T10 (CNPJ alfa) sim |
| X8 | **ADR-INCR-EFD-CONTRIBUICOES + apuração PIS/COFINS — deliberadamente raso:** vida útil ≈ 1 ano (PIS/COFINS morrem na transição, CBS entra). **Por último**, por sobrevivência (T11) | ADR | F-M2 | X7 |

**Execução humana (não é decisão) — lista completa após a 3ª rodada:** B-4 · X2 · H1 (Presumido) · H2 ·
H1 2ª passada · M2 · enviar o pedido ao contador (**refeito** — o de ontem não serve mais) · obter o XML de
compra da própria empresa (ago/set 2026) · baixar o PDF do Manual 20/05 · contratar parceiro emissor +
certificado do cliente · **vigilância de comunicações/intimações do PNCT até 31/12/2026** (obrigação
operacional, nasce com a emissão) · confirmar no e-CAC se o MIT tem API (20 min).

**O que esta cédula NÃO autoriza:** implementar F3/F5/X7/X8/X9/X10/C8 sem ADR ratificado fork-a-fork;
enviar qualquer coisa ao contador (CTD-001); aparato de auditoria novo (regra permanente); tocar em
folha, LAC-B ou inbox/outbox (seguem ⚫). ~~Imobilizado~~ saiu da lista de proibidos pelo F-Z0.

**Ordem global por sobrevivência (3ª rodada, T11 revisado):** ingestão NF-e + custo D3 split + CNPJ alfa
(T1a/T3/T10) → **imobilizado/depreciação (C8)** → ECD/ECF (Fase 3 L/M/N + retificação) → emissão via
parceiro (X10, onda 01/10) → DCTFWeb/MIT + IRPJ/CSLL (X7/X9) → por último, raso, PIS/COFINS + EFD-Contribuições (X8).

**Sobre o "3º grupo" (20–40 forks por vir):** a régua C×D já existe (`checkpoint-handler`): a maioria é C4×D1/D2 e
o agente decide e anota; a célula que exige o dono é C3×D4/D5 e tem 3–5 membros conhecidos (recuperabilidade
de ICMS, posição de IPI, credencial de emissão, escopo contábil — este já fechado pelo F-Z0). **Trava
registrada:** `ask` resolve como ALLOW silencioso em sessão autônoma; enquanto ≥D3 não estiver codificado como
`deny` no escopo que as sessões autônomas honram, "o agente decide D1/D2" é expectativa, não política. A política
em lote se decide **depois** de fechar a catraca, com amostragem de auditoria.

---

## F. Risco principal e vieses (T8)

- **Risco principal:** o fiscal cresceu 4 nós sem oráculo no repo (X7–X9 + D3 sob Lucro Real). Cada um
  depende do contador **e** de um validador oficial próprio; nenhum teste interno prova leiaute de
  EFD-Contribuições. É a mesma classe do PVA: o gargalo continua humano, agora maior.
- **Risco de sequência:** F-M6 põe o fiscal por último, mas o pedido ao contador (X1) é o item de maior
  latência de toda a fila. Ele deve sair **hoje**, mesmo com o fiscal sendo o terceiro módulo.
- **Viés desta sessão:** a partição F-M1 é minha; outra pessoa poderia pôr ECD no fiscal e estoque fora
  dos três. Os números de C mudariam, a fila de E não.
- **Viés de contagem:** peso 1 por nó — "botão de ECF Real" e "apuração de tributos" pesam igual. A
  régua mede nós fechados; esforço é trabalho do BRIEF de cada um.
