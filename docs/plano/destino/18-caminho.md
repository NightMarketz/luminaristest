---
tipo: "destino"
secao_sdd: "§18"
titulo: "Caminho: de hoje ao completo — plano em grafo"
---
# §18 Caminho: de hoje ao completo — plano em grafo

Cada caixa é um nó; cada seta é dependência real. Colunas são ondas; nós na mesma onda sem seta entre si podem correr
em paralelo — desde que em domínios diferentes (PAR-005: mesmo domínio ⇒ serial). **O grafo ordena, não autoriza
(ORCH-006).** A ordem entre domínios da régua segue **R6: contábil → financeiro → fiscal** (§M5.1).

### 18.1 Ondas

| Onda | Nós | Selo |
|---|---|---|
| **0 · provar** | B-4 (ensaio de restauração) → SEED-MY → H1 (PVA Presumido) → H1 2ª passada (Lucro Real) · P4 (instalar validadores) · H2 (browser sign-off) · H3 (prova P2 clínica) · X2 (catálogo RFB oficial) · E9/D2 (NF-e real anonimizada) · M2 (host + 1º deploy) · Z0-a (contador aceita assinar?) · envio do pedido ao contador (D1, itens 6–13) | gate humano / dado externo — agente não fecha |
| **1 · régua 57** | C8 PR-4 (retificação versionada + J801/J932 + `GET /data-exchange/jobs`) · C8 PR-5 (NF-e modo 4) · F7 → FE-INCR-BANK-SETTLEMENT · F5 remessa · F6 Pix · X6 · X4-14 · FE-INCR-LALUR PR 2 · X7 → X8/X9 · X10b → X10a → X10i (emissão) → X11 · X12 | DECIDIDO (régua) |
| **2 · self-service** | I1 + I1b → I3 → I4 + I5 + I8 → telas FE pendentes (REVIEW, DELIVERY, FIXED-ASSETS, SPED-SIGNERS) · GAP-MAP 7/8 · PR-B `atomicUntil` | DECIDIDO (wizard/motor) |
| **3 · Essencial** | IBS/CBS 2027 (tabela com vigência) · split payment · régua de cobrança · Simples/MEI · PDV + NFC-e · WhatsApp · **ESSENCIAL GA** (1º tenant pagante) | PROPOSTO — exige PRE-ADR |
| **4 · Gestão** | P3 multi-operador → aprovação + SoD · folha + eSocial · compras op. · custo de estoque · atendimento | GATILHO/PROPOSTO |
| **5 · Avançado** | RBAC + LGPD fina · orçamento/rateio · produção leve | GATILHO/PROPOSTO |
| **6 · plataforma** | API + webhooks · marketplace · portal do contador (só se Z0-a = não) | GATILHO P5 / condicional |

### 18.2 Arestas verificadas (fonte no repo)

| Nó | Depende de | Saída verificável | Fonte |
|---|---|---|---|
| SEED-MY | B-4 **assinado** | seed 2025+2026 | cédula #318 §4 |
| H1 | P4 · D8 (dados P6 do contador); alvo = SEED-MY | PVA-SIGNOFF assinado | Parte III §III.2 |
| H1 2ª passada | X4 ✅ · X4-14 · SEED-MY | 2P-1..2P-4 assinados | RUNBOOK-H1 |
| H3 | C10 (P2 clínica) · H1 | ECD do vertical 2 PVA-limpa | `RUNBOOK-H3-P2-CLINICA.md` |
| M2 | H2 (pontilhada) | 1º deploy | Parte III §III.2 |
| C8 PR-4 | C12 ✅ #353 | retificação versionada; jobs listáveis | `CADEIA-A.md` §3 |
| C8 PR-5 | C8 PR-2/PR-3 ✅ (permutável com PR-4) | contábil +1 (C8 conta no PR-5) | `BE-INCR-FIXED-ASSETS-execution-plan.md` l.84, l.90 |
| F7 | R9 ✅ · forks F-F7-1..5 · D1 (Fase C) | baixa por retorno | BRIEF F7 |
| F5 · F6 | D6 (· P-IA para F5, **ADR adiado R10**) | remessa / Pix | GRAFO 09-14 §3 |
| X7 | D1 itens 1/1b (Serpro adiado R5) | apuração IRPJ/CSLL | cédula #319 R5 |
| X8 · X9 | X7 | EFD-Contribuições · DCTFWeb | GRAFO 09-14 §2 |
| X10i (emissão) | X10b ✅ · X10a · D1f · D5 · **M2** | nota emitida | **cadeia crítica real** |
| I1 → I3 → I4 | LAC-B (ativada) | tenant novo contabilmente operante pela tela | §M5.1 |
| P3 | edição vendável + carga real | ADR reabrindo T11 se preciso | §IV.1 P3 |
| Portal do contador | Z0-a = não | F-Z0 reaberto por ADR | §M5.1 (F-Z0) |

**Caminho crítico (repo):** emissão ← **D1f · D5 · M2** (dado do contador, parceiro emissor + A1, deploy). No lado da
prova: **B-4 → SEED-MY → H1 → H1 2ª passada**. Nenhum passo de código move esses dois caminhos — o início é humano.

### 18.3 Regras do grafo
- **Prazo externo fixo:** IBS/CBS e split payment têm data legal (CBS plena e split a partir de 2027) — puxam a
  Onda 3 mesmo que outras ondas atrasem. NF-e para não contribuinte de ICMS em 01/12/2026 (§M5).
- **P3 é o portão da Onda 4:** aprovação e SoD pressupõem mais de um operador por tenant. (Folha não está atrelada ao
  P3 — §M5.)
- **Z0-a é aresta condicional:** "não" do contador puxa o portal do contador e reabre F-Z0; "sim" elimina o nó.
- **Nós PROPOSTO entram na §M5.1 como ⏳ só após PRE-ADR ratificado.**

### 18.4 Divergências abertas — SDD colado × repo (decisão do dono, não resolvidas aqui)

O SDD de 23/09 afirmava as arestas abaixo; o repo não as sustenta. A tabela §18.2 segue o repo. Se alguma for
**intenção nova** do dono, vira decisão registrada aqui — até lá, vale o repo.

| # | O SDD dizia | O repo diz | Fonte |
|---|---|---|---|
| D-1 | C8 PR-4 ← H1 | PR-4 depende só de C12 ✅ e da transcrição do J801 | `CADEIA-A.md` §3; plano C8 l.83 |
| D-2 | C8 PR-5 ← PR-4 e E9 | PR-4/PR-5 **permutáveis**; PR-5 ← PR-2/PR-3; E9 é dado externo sem aresta ao C8 | plano C8 l.84, 90, 328 |
| D-3 | C8 PR-5 → "contábil 22/22" | PR-5 dá **+1** (21/22); 22/22 só se a retificação contar como nó próprio — contradiz "C9 não é linha própria" | §M7.1; `CEDULA-DECISAO-2026-09-03-modulos.md:79-80` |
| D-4 | Fiscal ×7 ← H1; inclui NF-e 55 | Apuração (X7) ← D1 itens 1/1b; X8/X9 ← X7; NF-e 55 é parte do X10b; não há lista "×7" | GRAFO 09-14 §2/§3 |
| D-5 | ADR P-IA na Onda 1, antes da remessa | **R10: "não abrir ADR P-IA agora"**, adiado até D6 | cédula #319 R10 |
| D-6 | Remessa → "financeiro 19/19" | Remessa sozinha = 18/19; Pix (F6) é o outro nó | `CEDULA-DECISAO-2026-09-10-entrevista.md:58` |
| D-7 | IBS/CBS → split ← Fiscal ×7 | ADR condicionado ao item 1b do contador | §M5 |
| D-8 | Caminho crítico B-4 → H1 → PR-4 → PR-5 → GA → … | Emissão ← D1f · D5 · M2; prova ← B-4 → SEED-MY → H1 | Parte III §III.1 |
| D-9 | H3 = "PVA limpo + browser" | H3 = prova do P2 clínica; browser = **H2** (omitido no SDD) | `RUNBOOK-H3-P2-CLINICA.md:1` |
| D-10 | Ondas por edição (Essencial antes de Gestão) | Ordem ratificada entre domínios da régua = R6 contábil → financeiro → fiscal | §M5.1 R6 |
| D-11 | "I3b", "Telas Fase 4 (~8 telas)" | sem ocorrência no repo | — |
| D-12 | "P4" como fase | colide com "P4 Instalar validadores" (gate humano do GRAFO) | GRAFO 09-14 l.111 |
