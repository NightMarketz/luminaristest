# ADR-INCR-EFD-REINF — EFD-Reinf a partir das retenções do tenant: eventos R-1000, R-2010/R-2099, R-4010/R-4020/R-4099 (e R-9000) como XML do leiaute 2.1.x, gerados do resumo mensal do RETENCOES-FONTE e do IRRF-DISTRIBUICAO, com porta de transmissão nomeada e adaptador adiado (nó EFD-REINF)

> **Verificação legal de 20/10/2026** (dossiê `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md`).
> IN RFB 2.043/2021 lida na **visão vigente do Sijut** (idAto 119859, alterada até a IN 2.181/2024): arts. 1º–10.
> Leiaute 2.1.2 e Manual de Orientação do Usuário **não lidos em fonte oficial** (portal SPED `ECONNREFUSED`; gov.br 404) —
> insumo ausente §10. IN RFB 2.237/2024 (DCTFWeb) = V-fonte no ADR do X9.

- **Data:** 2026-10-20
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork está decidido e nenhum código está autorizado.
- **Autor:** `sessao-planejamento` (agente), com base em `origin/main` `ad792aca`. Empilhado no PRE-ADR `RETENCOES-FONTE`
  (PR #778): **depende dele em conteúdo** (consome o D8 daquele).
- **Autorização (ORCH-006), citada:**
  - dono, chat, 2026-10-20: *"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)."* — **Q2 (a)** da
    `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20` §5: *"Sim, os três, `sessao-planejamento`, sem `executa`"*.
  - Antes: **F-PES-5 (b)** e **F-PES-4** (fase 1 = nenhuma transmissão) do `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF`,
    ratificados em lote (dono, chat, 2026-10-12). Este PRE-ADR **herda** F-PES-5 (b) (R-1000 + R-4010 + R-4020 + R-4099 +
    R-2010/R-2099 derivados do contas a pagar) e detalha a saída.
  - **Passo 1 (cobertura):** cobre exatamente este PRE-ADR e a nota do nó. Mesma divergência do RETENCOES-FONTE quanto ao
    id PES-2 (F-RET-1 decide; aqui não se repete o fork).
- **Related:** `ADR-INCR-RETENCOES-FONTE` (D8 resumo mensal; `TaxWithholding`) · BRIEF `BE-INCR-IRRF-DISTRIBUICAO`
  (dividendos 10% cód. 1841; JCP 17,5% cód. 5706; "a declaração (R-4000 → DCTFWeb) ficou fora: não há Reinf no código") ·
  `ADR-INCR-DCTFWEB-MIT` (D7 nunca "sem movimento"; D9 retidos vão à Reinf; F-X9-6 DCTFWeb na matriz com débitos vindos
  da Reinf) · `ADR-INCR-SPED-ECD-file-generation` (serializer puro `lib/sped.ts`, builder por registro citando a página do
  manual, gate de cobertura de registros) · `ADR-INCR-TAX-ASSESSMENT` (porta nomeada, adaptador adiado — R5) ·
  `FiscalCertificate` (X10i PR-1: certificado do cliente cifrado, já em `main`) · `ADR-FISCAL-OBLIGATION-PROFILE` (matriz
  de obrigações como dado) · `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` §6 F-PES-4/F-PES-5.

## TLDR (2 linhas)

Desde os fatos de **01/01/2025** a DIRF foi substituída pela **série R-4000 da EFD-Reinf** (IN RFB 2.043 art. 3º § 1º I, red. IN 2.181): **quem retém IR/CSRF declara pela Reinf** até o **dia 15 do mês seguinte** (art. 6º), e **quem contrata cessão de mão de obra** declara o INSS de 11% no R-2010 (art. 3º I). O Luminaris tem **0 linhas** de Reinf; as retenções que ele passará a gravar (RETENCOES-FONTE) e já grava (IRRF-DISTRIBUICAO: dividendos e JCP) não têm saída declaratória. Este PRE-ADR gera os **XML dos eventos** (R-1000, R-2010/R-2099, R-4010/R-4020/R-4099; R-9000 para exclusão) no padrão do ECD (serializer puro + gate de cobertura), com **relatório de conferência** e **porta de transmissão nomeada**; o adaptador (webservice com o `FiscalCertificate` do cliente) é fork, no molde do R5.
**Risco principal:** a Reinf **não tem PVA nem importação de arquivo** — ou se transmite por webservice assinado, ou o operador digita na Reinf Web. Sem transmissão, o XML prova o leiaute **lido**, não o **aceito**; e o leiaute 2.1.2 **não foi lido em fonte oficial** nesta sessão (só secundária). O número que a DCTFWeb vai confessar sai daqui.

---

## 1. Contexto e objetivo

- **O que já está decidido e este PRE-ADR respeita (§4):** retenções moram no contas a pagar (F-PES-5 b); fase 1 sem
  transmissão (F-PES-4); retidos ficam fora do MIT (X9 D9) e a DCTFWeb nasce de eSocial + Reinf + MIT (IN 2.237 art. 5º);
  o Simples entrega DCTFWeb com débitos vindos da Reinf (F-X9-6 a); serializer de obrigação acessória é **lib pura +
  serviço sem conhecimento de leiaute** (ECD D2); porta nomeada/adaptador adiado (R5); certificado do cliente já
  existe cifrado (`FiscalCertificate`, X10i PR-1).
- **O que existe hoje (V, §2):** `FiscalCertificate` (PFX nunca persistido; chave e DER cifrados); `lib/sped.ts`/`lib/ecf.ts`
  (builders por registro, `__selfCheck`, cobertura); `obrigacoesPorRegime.ts` sem linha Reinf; IRRF-DISTRIBUICAO planejado
  com `codigoReceita` 1841/5706 e resumo mensal; nenhuma linha de Reinf.
- **Objetivo:** fixar (i) **quais eventos** e **de qual dado**; (ii) a **forma** (XML por evento, lote, assinatura);
  (iii) o **período** e o **prazo**; (iv) retificação/exclusão; (v) a **saída** na fase 1 e a **porta** da transmissão;
  (vi) a linha da matriz de obrigações; (vii) o que fica fora.

## 2. Evidência de código (CBM-001 — lida em `origin/main` `ad792aca`)

| Ponto | O que existe | Arquivo:linha |
|---|---|---|
| Reinf no código | **0 ocorrências** de `reinf` em `server/src` | grep |
| Certificado do cliente | `FiscalCertificate { keyCiphertext?, certCiphertext?, keyVersion?, cnpjCertificado, notBefore, notAfter, fingerprintSha256 }` — PKCS#8 + DER cifrados (keyring `DFE_CERT_KEYS`), 1 por (userId, unitId) | `prisma/schema.prisma` (bloco `FiscalCertificate`, após `LegalParameter`) |
| Serializer puro (molde) | `lib/sped.ts`: `spedLine`, builders por registro com a página do manual citada; `lib/ecf.ts`: `build0000…`, `buildEcfFile`, `__selfCheck()`; o serviço "carries NO layout knowledge (D2)" | `src/lib/sped.ts:1-40`; `src/lib/ecf.ts:52-466` |
| Matriz de obrigações | `ObrigacaoSped` sem `REINF`; linhas em `OBRIGACAO_REGIME` (dado) | `models/obrigacoesPorRegime.ts:19-25` |
| DCTFWeb (X9) | `montarArquivoMit` só IRPJ/CSLL; D7 nunca `SemMovimento`; D9 retidos fora; `MitExport` (hash + ids, sem conteúdo) | `ADR-INCR-DCTFWEB-MIT` §4, §6; `prisma/schema.prisma` (`MitExport`) |
| Log de entrega com hash (molde) | `AccountingDeliveryLog { periodStart/End, manifestSha256 }`; `MitExport { sha256, apuracaoIds }` | ADR do X9 §2 |
| Retenções (futuro, RETENCOES-FONTE) | `TaxWithholding { direction, tributo, event, baseCents, aliquotaBp, amountCents, codigoReceita, competencia, status }` + resumo mensal D8 | PRE-ADR RETENCOES-FONTE §7/§5 D8 |
| Dividendos/JCP (planejado) | `GET /accounting/profit-distributions/irrf?competencia=` (1841); `GET /accounting/jcp/irrf?competencia=` (5706); sócio com CPF (model próprio, F-IRD-2) | BRIEF IRRF-DISTRIBUICAO itens 21, 31 |
| Contraparte | `Counterparty.taxId` dígitos **sem DV**; `regimeTributario` proposto no RETENCOES-FONTE | `prisma/schema.prisma:1382` |
| Contador/PII | `AccountingContact.cpf` — PII nunca em auditoria (ADR X9 §2) | `prisma/schema.prisma:1770-1784` |

## 3. Fonte legal e técnica (com grau)

| Regra | Fonte | Grau |
|---|---|---|
| A EFD-Reinf é transmitida ao SPED e válida após confirmação de recebimento e validação | IN RFB 2.043 art. 2º | V-fonte (Sijut vigente) |
| **Obrigados** (ainda que imunes/isentos): (I) empresas que **prestam e contratam** serviços por cessão de mão de obra ou empreitada (Lei 8.212 art. 31) — red. IN 2.096; (II) CPRB; (III–IV) rural; (V–VII) desporto; **(VIII) as pessoas do art. 2º da IN 1.990/2020** (antigos declarantes da DIRF: quem pagou/creditou rendimento com retenção de IR) | IN 2.043 art. 3º caput I–VIII | V-fonte |
| **DIRF substituída, para fatos desde 01/01/2025**, (I) pelos eventos da **série R-4000**, (II) S-1210 e (III) S-2501 do eSocial | IN 2.043 art. 3º § 1º (red. IN 2.181/2024) | V-fonte |
| Regras no **Manual de Orientação do Usuário** no portal SPED | IN 2.043 art. 3º § 2º | V-fonte (o manual, NV) |
| Comissões/corretagens recebidas (IN SRF 153/1987) ⇒ quem **recebe** informa no R-4080; quem paga fica dispensado | IN 2.043 art. 3º §§ 3º–4º (red. IN 2.163) | V-fonte |
| **Sem fato no período ⇒ dispensada** | IN 2.043 art. 4º | V-fonte |
| Cronograma: 3º grupo PJ desde 05/2021; Simples do 2º grupo desde 2019 | IN 2.043 art. 5º II "a"–"b", III | V-fonte |
| **Prazo: até o dia 15 do mês subsequente**, postergado ao 1º dia útil (§ 2º); lucros/dividendos **isentos**: até o dia 15 do 2º mês após o trimestre (§ 3º) | IN 2.043 art. 6º caput, §§ 2º–3º | V-fonte |
| Multas: 2% ao mês sobre os tributos informados, até 20%, mínimo R$ 500; R$ 20 por grupo de 10 incorreções; **−50% ME/EPP, −90% MEI** | IN 2.043 art. 7º I–II, §§ 2º, 4º | V-fonte |
| Contribuições previdenciárias recolhidas por DARF da DCTFWeb | IN 2.043 art. 8º | V-fonte |
| DCTFWeb tem como fontes eSocial, EFD-Reinf e MIT; IRPJ/CSLL/PIS/Cofins **retidos** vão para a Reinf (não ao MIT); Simples entrega DCTFWeb | IN RFB 2.237 arts. 5º I–II, 9º § 1º I, 3º I (ADR do X9 §3) | V-adr |
| Art. 2º I da IN 1.990: obrigado quem pagou/creditou rendimento com retenção de IR **ainda que em um único mês** | IN RFB 1.990/2020 (PRE-ADR de pessoal §4, fonte secundária) | V-sec |
| Eventos: R-1000 (contribuinte), R-1070 (processos), R-2010 (serviços tomados com cessão de mão de obra, retenção 11%), R-2020 (prestados), R-2030/2040/2050/2055/2060, R-2098/2099 (fechamento R-2000), R-3010, **R-4010 (PF)**, **R-4020 (PJ)**, R-4040 (não identificado), R-4080 (autorretenção), **R-4099 (fechamento R-4000)**, R-9000 (exclusão), R-9001/9005/9011/9015 (totalizadores de retorno) | Manual 2.1.2 (secundária: Tecnospeed/TDN); TAF Escopo (referências TOTVS) | **V-sec** |
| Leiaute **2.1.2** (ADE COFIS 23/2023) com NT 01/2026 (09/03), 02/2026 (08/05: isenção de lucros/dividendos no R-4010), 03/2026 (CNPJ alfanumérico; R-4010/R-4020); consolidação 2.1.2a (07/10/2024) | busca de 20/10 (secundária); PRE-ADR de pessoal §4 (V-sec) | **V-sec** |
| **Não há PVA nem importação de arquivo** na Reinf: transmissão por webservice (lotes assíncronos) ou digitação na Reinf Web | PRE-ADR de pessoal F-PES-5 ("I, L-PES-6"); MOS eSocial §8.1 (análogo) | **I** |
| Dividendos: IRRF 10% acima de R$ 50 mil/mês por PF (Lei 9.250 art. 6º-A) — cód. 1841; JCP 17,5% — cód. 5706; o isento (≤ R$ 50 mil) também se informa (art. 6º § 3º da IN 2.043 fala no prazo dos "isentos") | BRIEF IRRF-DISTRIBUICAO (verificado lá); IN 2.043 art. 6º § 3º (V-fonte) | V |
| CNPJ alfanumérico em produção desde 01/07/2026 (`lib/cnpj.ts`) — a NT 03/2026 adapta o R-4010/R-4020 | ADR do X9 §2; busca (secundária) | V (código) · I (NT) |

## 4. Decisões já ratificadas que limitam o desenho

| Decisão | Efeito aqui |
|---|---|
| **F-PES-5 (b)** (12/10) | Eventos = R-1000 + R-4010 + R-4020 + R-4099 + **R-2010/R-2099**, derivados de campos de retenção do contas a pagar; os demais `NAO_SE_APLICA` com fonte. Saída da fase 1: **relatório e XML não transmitido** |
| **F-PES-4** (12/10) | Fase 1 = nenhuma transmissão; fase 2 = (a) webservice com certificado A1 do cliente sob guarda do Luminaris, **condicionada a BRIEF de segurança** (L-PES-10) — aqui vira F-REINF-2 porque o `FiscalCertificate` **já existe** desde o X10i PR-1 (a guarda foi decidida lá) |
| X9 **D7** (nunca "sem movimento") · **D9** (retidos à Reinf) · **F-X9-6** (DCTFWeb na matriz, Simples inclusive) | A Reinf é a fonte dos retidos na DCTFWeb; o Luminaris continua sem afirmar "sem movimento" — e a Reinf **dispensa** entrega sem fato (art. 4º): coerente |
| ECD **D2** (serviço sem conhecimento de leiaute; builders citam o manual) + gate de cobertura de registros | Mesmo padrão: `lib/reinf.ts` puro, um builder por evento com a página do manual citada; teste de cobertura `EVENTOS_SUPORTADOS` × `NAO_SE_APLICA` com fonte |
| R5 (Integra Contador adiado) · X7 D11 (porta = tipo + função pura) | Porta `ReinfTransmissorPort` nomeada; adaptador só por fork (F-REINF-2) |
| RETENCOES-FONTE **D8** (resumo mensal por código) e **D1** (`direction = MADE`) | Só retenções **feitas** (MADE) entram na Reinf do tenant; as sofridas são da Reinf do cliente dele |
| IRRF-DISTRIBUICAO F-IRD-2 (model próprio de sócios com CPF), F-IRD-3 (reter sempre no Simples) | R-4010 dos dividendos/JCP lê o model de sócios; o CPF é PII (nunca em auditoria) |
| ADR X9 **D12** / `AccountingContact` | CPF/CNPJ de beneficiário só no XML; auditoria e log guardam **hash + ids** |
| `ADR-FISCAL-OBLIGATION-PROFILE` (matriz como dado) + F-X9-6 | Linha `REINF` na `OBRIGACAO_REGIME`: `CONDICIONAL` em todos os regimes (obrigada **se houver fato**: art. 3º VIII + art. 4º) |
| T11 (sem fila/outbox) | Transmissão (quando houver) é job interno síncrono por lote, como `MpReleaseReportScheduler`; nada de fila |
| ADR-PERSISTENCE-BOUNDARY | Prisma first-class: lei desenha; o registro de cada lote gerado é imutável (molde `MitExport`) |

## 5. Decisões fixadas (sem fork)

**D1 — Eventos e fonte de cada um (F-PES-5 b herdado):**

| Evento | Fonte no Luminaris | Quando |
|---|---|---|
| R-1000 | `CompanyFiscalProfile.declarante` (CNPJ raiz, nome), classificação tributária por regime, contato = `AccountingContact` do perfil | 1ª transmissão e a cada mudança |
| R-2010 | `TaxWithholding` MADE com `tributo = INSS` (cessão de mão de obra), por prestador (CNPJ) e por NF (`Payable.documentNumber`, `issueDate`) | mensal |
| R-2099 | fechamento da R-2000 do período | mensal, se houver R-2010 |
| R-4020 | `TaxWithholding` MADE com `tributo ∈ IRRF\|CSLL\|COFINS\|PIS` e beneficiário **CNPJ**, agrupados por beneficiário × natureza do rendimento × `codigoReceita`; JCP a PJ (5706) do IRRF-DISTRIBUICAO | mensal |
| R-4010 | idem com beneficiário **CPF**: dividendos (1841, inclusive isentos — art. 6º § 3º) e JCP a PF do IRRF-DISTRIBUICAO; **outras retenções de PF ficam fora** (F-RET-7 a: nó de pessoal) | mensal (isentos: trimestral) |
| R-4099 | fechamento da R-4000 | mensal, se houver R-40xx |
| R-9000 | exclusão de evento enviado | sob demanda, só com transmissão |
| R-1070, R-2020, R-2030/2040/2050/2055/2060, R-3010, R-4040, R-4080 | `NAO_SE_APLICA` com fonte (desporto, rural, CPRB, cessão prestada, não identificado, comissões recebidas) | — |

**D2 — Período e prazo.** Período = mês de competência da retenção (fato gerador: crédito ou pagamento, conforme o
RETENCOES-FONTE D2). Prazo = dia 15 do mês seguinte, postergado ao dia útil (art. 6º § 2º); dividendos isentos: dia 15 do
2º mês após o trimestre (§ 3º). O resumo mostra o prazo; o alerta é da `AGENDA-FISCAL` (F4), não daqui.

**D3 — Forma: XML por evento, no leiaute 2.1.x, em lote.** `lib/reinf.ts` puro: um builder por evento, cada um citando a
página do Manual (quando lido — insumo ausente), `__selfCheck()`, charset UTF-8, sem assinatura na fase 1. A assinatura
XML-DSig com o `FiscalCertificate` é do adaptador (F-REINF-2).

**D4 — Registro imutável do lote** (molde `MitExport`): `ReinfBatch { competencia, eventos[] (tipo, hash, ids de origem),
sha256 do lote, geradoPorId, status GERADO | TRANSMITIDO | ACEITO | REJEITADO }` — conteúdo **não persistido** (PII);
`defasado` calculado na leitura quando uma retenção de origem for estornada depois do lote (mesma regra do X9 F-X9-2).

**D5 — Retificação.** Evento já transmitido/aceito e retenção estornada ⇒ o próximo lote emite o evento **retificador**
(`indRetif = 2`, `nrRecibo` do original) ou o R-9000; sem transmissão (fase 1), o relatório marca `RETIFICAR` e o operador
faz na Reinf Web.

**D6 — Nunca "sem movimento".** Igual ao X9 D7: período sem retenção ⇒ 422 "nada a declarar" (e a Reinf dispensa, art. 4º).

**D7 — Matriz de obrigações ganha `REINF`** (dado): todos os regimes `CONDICIONAL` com pergunta "houve retenção de IR/CSRF
ou contratação por cessão de mão de obra no mês?" e fonte IN 2.043 arts. 3º VIII/§ 1º e 4º; inativa = `NAO_SE_APLICA`
(sem fato).

**D8 — PII.** CPF/CNPJ de beneficiários e sócios só dentro do XML gerado sob demanda; `ReinfBatch` e auditoria guardam
ids e hash. `Counterparty.taxId` sem DV ⇒ validação de DV **antes** de montar o evento (400 nomeado por contraparte).

**D9 — Fora:** eSocial e retenções de PF por trabalho/aluguel (PRE-ADR de pessoal, PES-1/PES-4); R-2020 (cessão
prestada); CPRB; retenções sofridas; DCTFWeb (X9); IBS/CBS.

## 6. Esqueleto de comportamentos por PR

Fatiamento (F-REINF-3): **PR-1 serializer + R-1000/R-4020/R-4099 + lote · PR-2 R-4010 (dividendos/JCP) + R-2010/R-2099 ·
PR-3 matriz + relatório + pacote do contador · PR-4 (só se F-REINF-2 a) adaptador de transmissão**.

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| 1 | `lib/reinf.ts`: `buildR1000`, `buildR4020`, `buildR4099` (PR-1), `buildR4010`, `buildR2010`, `buildR2099` (PR-2), `buildR9000` (PR-4); `serializeLote(eventos)`; `__selfCheck()`; `EVENTOS_SUPORTADOS` + `EVENTOS_NAO_APLICAVEIS` com fonte | lib pura | F-REINF-1 |
| 2 | Gate de cobertura: teste que lista **todos** os eventos do leiaute 2.1.x e exige que cada um esteja em suportados **ou** não aplicáveis (molde do ECD) | teste | — |
| 3 | `montarReinf(competencia)`: lê o resumo D8 do RETENCOES-FONTE (MADE), o resumo do IRRF-DISTRIBUICAO (1841/5706) e o perfil; agrupa por beneficiário × natureza × código; valida DV de CPF/CNPJ (D8) | serviço | — |
| 4 | Período sem fato ⇒ 422 (D6); Simples/MEI **não** ⇒ 400 (a Reinf vale para todos os regimes — diferente do X9 D10) | serviço | — |
| 5 | `ReinfBatch` (D4) + repo + rotas em 2 toques: `POST /accounting/reinf/batches` (gera, registra, devolve XML + relatório), `GET /accounting/reinf/batches?competencia=` (lista com `defasado`) | Prisma + camadas | — |
| 6 | Relatório de conferência (CSV/JSON): por evento, beneficiário (mascarado no relatório), natureza, base, retido, código, prazo | serviço | — |
| 7 | Retificação/exclusão (D5): estorno de retenção depois de lote `TRANSMITIDO/ACEITO` ⇒ `defasado = true` e próximo lote com retificador/R-9000 | serviço | — |
| 8 | Matriz `OBRIGACAO_REGIME` ganha `REINF` (D7); `ObrigacaoSped` cresce | dado + model | — |
| 9 | Pacote do contador: `EXPORT_REINF` (XML + relatório) | C6b | — |
| 10 | Porta `ReinfTransmissorPort = { enviarLote(xmlAssinado) → { protocolo }, consultar(protocolo) → { status, recibos[] } }` nomeada; adaptador **nenhum** na fase 1 | `lib/reinf.ts` | F-REINF-2 |
| 11 | (F-REINF-2 a) Adaptador: assina com `FiscalCertificate` (XML-DSig), envia lote assíncrono, consulta, grava `nrRecibo` por evento; job interno síncrono (T11) | adaptador + job | F-REINF-2 |
| 12 | Gates: snapshot de DTOs; allowlist `auditCanonical.ts` (`tax.reinf_batch.generated/transmitted`: ids, competência, sha256 — **sem CPF/CNPJ**); openapi path-count; i18n | vários | — |

## 7. Contratos esboçados

```prisma
model ReinfBatch {
  id            String   @id @default(cuid())
  userId        String   // a PJ (R8: CNPJ raiz)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  competencia   String   // YYYY-MM
  eventos       Json     // [{ tipo: 'R-1000'|'R-2010'|'R-2099'|'R-4010'|'R-4020'|'R-4099'|'R-9000', sha256, origemIds: string[], retificaRecibo?: string }]
  sha256        String   // do lote; o XML NÃO é persistido (D8)
  status        String   // GERADO | TRANSMITIDO | ACEITO | REJEITADO
  protocolo     String?  // F-REINF-2 (a)
  geradoPorId   String
  createdAt     DateTime @default(now())
  @@index([userId, competencia])
  @@map("reinf_batches")
}
```

```ts
// lib/reinf.ts — só o que a fase 1 emite (D1); cada builder cita a página do Manual 2.1.x quando lido
export type ReinfEvento = 'R-1000' | 'R-2010' | 'R-2099' | 'R-4010' | 'R-4020' | 'R-4099' | 'R-9000';
export const EVENTOS_NAO_APLICAVEIS: Record<string, string> = {
  'R-1070': 'sem processos administrativos/judiciais no escopo (IN 2.043 art. 3º)', 'R-2020': 'o tenant não presta cessão de mão de obra',
  'R-2030': 'desporto', 'R-2040': 'desporto', 'R-2050': 'rural', 'R-2055': 'rural', 'R-2060': 'CPRB (Simples não é CPRB)',
  'R-3010': 'desporto', 'R-4040': 'beneficiário não identificado', 'R-4080': 'comissões recebidas (IN 2.043 art. 3º § 3º)',
};
export interface ContribuinteR1000 { cnpjRaiz: string; nome: string; classTrib: string; contato: { nome: string; cpf: string; telefone?: string; email?: string } }
export interface RetencaoR4020 { cnpjBenef: string; nomeBenef: string; natRend: string; codigoReceita: string; competencia: string; baseCents: bigint; retidoCents: bigint; origemIds: string[] }
export interface RetencaoR4010 { cpfBenef: string; nomeBenef: string; natRend: string; codigoReceita: string | null /* isento */; competencia: string; baseCents: bigint; retidoCents: bigint; origemIds: string[] }
export interface ServicoTomadoR2010 { cnpjPrestador: string; nfNumero: string; nfData: string; valorBrutoCents: bigint; retidoCents: bigint; origemIds: string[] }
export function buildR1000(c: ContribuinteR1000): string;
export function buildR4020(c: ContribuinteR1000, linhas: RetencaoR4020[], periodo: string, retifica?: string): string;
export function buildR4010(c: ContribuinteR1000, linhas: RetencaoR4010[], periodo: string, retifica?: string): string;
export function buildR2010(c: ContribuinteR1000, linhas: ServicoTomadoR2010[], periodo: string, retifica?: string): string;
export function buildR2099(c: ContribuinteR1000, periodo: string): string;
export function buildR4099(c: ContribuinteR1000, periodo: string): string;
export function buildR9000(c: ContribuinteR1000, nrRecibo: string): string;
export function serializeLote(eventos: string[]): { xml: string; sha256: string };

// Porta (D11 do X7 / R5)
export interface ReinfTransmissorPort { enviarLote(xmlAssinado: string): Promise<{ protocolo: string }>; consultar(protocolo: string): Promise<{ status: 'EM_PROCESSAMENTO' | 'ACEITO' | 'REJEITADO'; recibos: { tipo: ReinfEvento; nrRecibo?: string; erros?: string[] }[] }> }

// DTO (Zod .strict())
export const ReinfBatchRequestSchema = z.object({ competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict();
```

## 8. FORKS — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-REINF-1** Forma da saída na fase 1 | **(a) completa:** XML dos eventos no leiaute 2.1.x (não assinado) **+** relatório de conferência **+** `ReinfBatch` com hash e `defasado` · (b) **mínimo:** só relatório de conferência para o operador digitar na Reinf Web — **deixa aberto** o leiaute (nunca testado contra o XSD) e a retificação rastreável | **(a).** F-PES-5 (b) já diz "relatório e XML não transmitido"; sem XML a fase 2 (transmissão) nasce do zero e o gate de cobertura não existe. O XSD oficial é o teste do leiaute **lido**; o aceito é P-REINF-1 | médio em (b) |
| **F-REINF-2** Transmissão | **(a)** porta nomeada + adaptador webservice com o `FiscalCertificate` do cliente (XML-DSig), em PR-4 próprio, **condicionado** a (i) leiaute/manual lidos em fonte oficial e (ii) um tenant real que retenha · (b) porta nomeada, adaptador **nunca** (operador digita/usa software terceiro) · (c) adaptador já no PR-1 | **(a).** O certificado já existe cifrado (X10i PR-1) — a objeção de segurança do F-PES-4 (L-PES-10) foi resolvida lá; sem adaptador a Reinf fica "cumprida fora sem que o sistema saiba" (o que o PES-2 veio corrigir). (c) transmite leiaute não lido. O molde é o R5: adaptador só com cliente | médio em (b): obrigação continua manual |
| **F-REINF-3** Fatiamento | **(a)** 4 PRs (§6) · (b) 2 PRs | **(a).** PR-1 fecha R-4020 (o que o salão/clínica PJ-pagadora precisa); PR-2 traz dividendos/JCP (IRRF-DISTRIBUICAO) e R-2010; PR-3 matriz; PR-4 só com F-REINF-2 (a) | baixo |
| **F-REINF-4** Dividendos isentos no R-4010 | **(a)** informar também os ≤ R$ 50 mil (isentos), no prazo trimestral do art. 6º § 3º, a partir do model de sócios · (b) só os retidos | **(a).** O art. 6º § 3º existe porque os isentos se informam; (b) omite rendimento e expõe à multa de R$ 20/10 omissões. O dado já está no IRRF-DISTRIBUICAO | baixo |
| **F-REINF-5** Natureza do rendimento (`natRend`) | **(a)** tabela `NATUREZA_RENDIMENTO` em `legal_parameters` (código Reinf × chave do `WithholdingProfile.naturezaServico` × fonte), linhas `DRAFT` até ler a tabela 01 do Manual · (b) hardcode no builder | **(a).** É a mesma regra do LEGAL-PARAMS (dado com fonte); a tabela oficial não foi lida (§10) | baixo |

## 9. Pendente de validação externa

| # | Pergunta | Por que importa | Quem fecha |
|---|---|---|---|
| P-REINF-1 | **Oráculo do leiaute:** o 1º lote real aceito pelo ambiente de produção restrita da Reinf (ou a Reinf Web conferindo o relatório) | teste prova o lido, não o aceito | gate humano (RUNBOOK-FORMAT); agente prepara, não assina |
| P-REINF-2 | Tabela 01 (natureza do rendimento) e códigos de receita por natureza para o salão/clínica | F-REINF-5 | Manual 2.1.x + contador |
| P-REINF-3 | O Simples tomador que retém só IRRF (sem CSRF) declara R-4020 do mesmo jeito? (ambiguidade A do RETENCOES-FONTE) | D1 | contador |
| P-REINF-4 | O salão contrata limpeza/vigilância **por cessão de mão de obra**? (decide se há R-2010) | D1 | contador (P-RET-5) |
| P-REINF-5 | Reinf Web permite digitar os eventos R-4000 à mão para a fase 1? | F-REINF-1 (b)/(a) | leitura do e-CAC (dono) |

## 10. Insumos ausentes (regra 2)

1. **Leiaute 2.1.2 (XSD) e Manual de Orientação do Usuário** da EFD-Reinf: portal SPED `ECONNREFUSED`, gov.br 404; só
   fontes secundárias (Tecnospeed/TDN). Nenhum builder pode citar página até isto ser lido.
2. **NT 01/02/03-2026** da Reinf (lucros/dividendos; CNPJ alfanumérico): secundárias.
3. **Tabela 01 — natureza do rendimento**: não lida.
4. **Documentação do webservice** (lotes assíncronos, endpoints, XML-DSig): não lida (só relevante no F-REINF-2 a).

## 11. Achados fora de escopo (regra 5)

1. `Counterparty.taxId` sem DV — a Reinf rejeita CPF/CNPJ inválidos; a validação de DV deveria entrar no COUNTERPARTY
   (emenda), não aqui (D8 só bloqueia o evento).
2. A matriz de obrigações ainda não tem **eSocial** (PRE-ADR de pessoal) nem **EFD-Contribuições** (Q8).
3. `AGENDA-FISCAL` (F4) é quem mostra o prazo do dia 15; aqui só se calcula.
4. **Pesquisa de código-fonte:** nem Odoo (core ou OCA `l10n-brazil`) nem ERPNext têm EFD-Reinf; a TOTVS faz pelo TAF
   ("Reinf Suporte Financeiro": extrator financeiro envia retenções ao TAF — referência de 20/10, VERIFICADO (trecho)).
   O que isto decide: a **origem** é o financeiro (como aqui) e o **transmissor** é um módulo separado com certificado —
   o mesmo corte porta/adaptador.

## 12. Riscos e vieses (T8)

- **Risco — leiaute não lido.** O builder é escrito contra fonte secundária até o insumo 1 chegar; o gate de cobertura e
  o `__selfCheck` provam consistência interna, não aceitação. Declarado no TLDR.
- **Risco — DCTFWeb confessa o que a Reinf diz.** Retenção a maior gravada no RETENCOES-FONTE vira débito confessado; a
  defesa é o relatório de conferência antes de transmitir (F-REINF-1 a).
- **Risco — valor para o 1º cliente.** O salão Simples retém IRRF (ambiguidade A) e declara dividendos (F-IRD-3 "reter
  sempre"): há fato para R-4010/R-4020 mesmo no Simples. Não é zero, ao contrário do X9.
- **Viés 1 (porta sem adaptador):** o R5 virou reflexo. Contrapeso: o certificado já está no sistema — por isso o F-REINF-2
  recomenda (a), condicionado.
- **Viés 2 (copiar o ECD):** pipe-delimited × XML. Só o **padrão** (lib pura, builder por registro, cobertura) é copiado.
- **Caso adversarial tentado contra "é só serializar o resumo":** retenção estornada **depois** de o lote ser aceito. Sem
  `defasado` e sem retificador, a DCTFWeb fica com débito que o razão não tem mais (art. 13 § 7º da IN 2.237 manda
  retificar). Por isso D4/D5 existem e `ReinfBatch` não é só um log. O que me derrubaria: o Manual mandar retificar por
  **evento** e não por lote — a estrutura por evento em `eventos[]` já aguenta.

## 13. Invariantes que a implementação DEVE provar

1. Período sem retenção MADE e sem dividendo/JCP ⇒ 422; com fato ⇒ R-1000 presente no 1º lote do tenant.
2. Todo evento do leiaute 2.1.x está em `EVENTOS_SUPORTADOS` ou em `EVENTOS_NAO_APLICAVEIS` com fonte (gate de cobertura).
3. R-4020 só com beneficiário CNPJ válido (DV); R-4010 só CPF válido; inválido ⇒ 400 nomeado com o id da contraparte.
4. Σ `retidoCents` do R-4020 do período = Σ `TaxWithholding` MADE (IRRF/CSLL/COFINS/PIS, CNPJ) `ACTIVE` da competência.
5. 2027-01: R-4020 não contém linhas de Cofins/PIS retidos (coerente com RETENCOES-FONTE invariante 1).
6. Lote gerado ⇒ `ReinfBatch` com `sha256` e `origemIds`; XML não persistido; auditoria sem CPF/CNPJ.
7. Estorno de retenção de origem depois de `TRANSMITIDO/ACEITO` ⇒ `defasado = true` no GET; próximo lote traz retificador ou R-9000.
8. R-4010 inclui dividendos isentos (F-REINF-4 a) com `codigoReceita = null` e prazo trimestral calculado.
9. Prazo = dia 15 do mês seguinte, deslocado ao dia útil seguinte (função de dias úteis existente).
10. Matriz: `REINF` = `CONDICIONAL` em MEI/SIMPLES/PRESUMIDO/REAL; inativa `NAO_SE_APLICA`.

## 14. Sinal humano — estado do gate

- **F-REINF-2 → (b)** (dono, questionário, 30/10, [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 2: *"Portal ou
  contador"*): sem adaptador de transmissão; o cliente transmite no Reinf Web ou o contador como procurador. Contra a
  recomendação (a). **F-REINF-1, 3, 4, 5:** PENDENTES. **P-REINF-1..5:** externos. BRIEF depois da ratificação e **depois do BRIEF do
  RETENCOES-FONTE** (dependência dura: consome o D8); código só com `executa`, PR a PR.
- Nota `docs/plano/nos/EFD-REINF.md` aponta para cá; `depende_de` RETENCOES-FONTE e IRRF-DISTRIBUICAO.

## 15. Fontes

| Documento | Origem | Observação |
|---|---|---|
| IN RFB 2.043/2021, visão vigente | Sijut idAto 119859 (navegador embutido, 20/10) | histórico até IN 2.181/2024; não copiada para o repo |
| IN RFB 2.237/2024 | ADR do X9 (02/10, Sijut) | V-adr |
| Leiaute 2.1.2 / Manual / NT 2026 / tabela 01 | **não lidos** | §10 |
| Referência TOTVS "Reinf Suporte Financeiro" | `REFERENCIAS-TOTVS-SALESFORCE-POWERBI-2026-10-20.md` (sessão de origem) | VERIFICADO (trecho) |
