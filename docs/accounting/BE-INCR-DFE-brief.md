# BRIEF — BE-INCR-DFE (documento fiscal de saída: NFS-e nacional + NF-e 55, montado até a borda e entregue por porta) — nó X10b

> Produzido em `sessao-planejamento` (2026-09-17), nó **X10b** do [grafo 14/09](GRAFO-DEPENDENCIAS-2026-09-14.md)
> (`X10b → X10a → X10i → X11`), item 13 do módulo fiscal (§7.1 do master map). Executa o
> [`ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) (Accepted, F-DFE-1..11
> ratificados 08/09, emendas 10/09 e 14/09-R8) com as **duas decisões do dono desta sessão** (§0).
> **Este documento NÃO escreve código** — checklist + contratos esboçados. **Forks F-DFE-12..19: ✅ RATIFICADOS
> 2026-09-17 pelo dono (`AskUserQuestion`, 2 lotes) — 12/13/14/15/16/17/18 na recomendação; F-DFE-19 → (b)
> contra a recomendação.** Registro e efeitos no fim de §4. A `sessao-feature` pode abrir com "executa".

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** X10b — BRIEF `BE-INCR-DFE`: perfil fiscal de serviço + `FiscalDocument` + porta
  `DfeEmissorPort` com `FileEmissor`/`NullEmissor` + montagem/validação da DPS (NFS-e nacional) e da NF-e 55
  de venda + retorno como proveniência. [`README.md:68`](README.md) "X10b ⬜ sem BRIEF"; grafo 14/09 l.246
  "blocked (BRIEF)"; ADR §4 "Ordem: … → BRIEF `BE-INCR-DFE` (perfil fiscal + `FiscalDocument` + porta +
  `FileEmissor`/`NullEmissor` + montagem da DPS) → **espera D5** → BRIEF do adaptador do parceiro".
- **Autorização (ORCH-006):** dono, 2026-09-17, mensagem literal *"Executa o BRIEF X10b atrás da porta com
  D1f no FiscalProfile"* + confirmação por `AskUserQuestion` na mesma sessão: **(1)** *"Abrir o BRIEF agora"*
  (sessão de planejamento; código só em sessão de feature separada); **(2)** *"Sim: 5a–5f viram campos
  configuráveis"* (item LC 116 e NBS por serviço, `issRetido`, fato gerador do pacote, destaque IBS/CBS, regras
  do Simples, limiar do aviso de competência — todos no perfil, default = recomendação do ADR, marcados
  "pendente contador"; quando D1f chegar muda-se config, não código). Cadeia anterior: F-M7 → (d) (cédula
  03/09), ADR §10 (F-DFE-1..11), cédula 14/09 R8. **Cobre exatamente:** o backend da emissão atrás da porta.
  **Não cobre:** adaptador HTTP de parceiro (D5), FE (`FE-INCR-DFE`, nó vizinho), apuração de ISS/IBS/CBS (X7),
  DAS/PGDAS-D, H2-DFE (gate humano).
- **Insumos existentes (lidos nesta sessão, arquivo:linha):**
  - ADR `:75-174` D1–D8; `:222-232` §7 invariantes; `:242-320` §9 emendas (9.1 tentativa, 9.2 itens 1–12,
    9.3 forks 9–11); `:322-336` §10 ratificação (F-DFE-1 **b**, 5 **c**, 7 **b**, 8 **b** contra a recomendação).
  - Parecer `PARECER-ARCHITECT-ADR-INCR-DFE-EMISSAO-PARCEIRO.md` §1.1–1.12, §4 gates, §5 riscos.
  - **Fonte primária — corpus local** `docs/accounting/fontes-oficiais/` (`MANIFEST.md:21-29`, baixado
    2026-09-10): `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx` (abas `LEIAUTE DPS_NFS-e` 417 linhas, `RN
    DPS_NFS-e` 654, `MUN.INCID_INFO.SERV.` 341), `NFSe-ANEXO-II-eventos-v1.01.xlsx`, `NFSe-ANEXO-B` (lista
    nacional + NBS 2.0), `NFSe-ANEXO-C` (INDOP IBS/CBS), `NFSe-ESQUEMAS_XSD-v1.01.zip`. **O grafo 14/09 ainda
    marca D-NFSE "dono baixa"; o corpus já o tem** — §7 achado 2. Transcrição da parte usada: §1.
  - Código: `schema.prisma:1282-1306` (`FiscalProfile`, X6 + `partnerAccountRef` R8), `:565-574`
    (`JournalEntrySequence`), `:584-602` (`DocumentAttachment` FK real a `JournalEntry`), `:800-822`
    (`SourceDocument`), `:940-947` (rename-on-delete do `Payable` — classe `unique-de-idempotencia-x-soft-delete`);
    `FiscalProfileDto.ts`, `IFiscalProfileRepository.ts`, `FiscalProfileService.ts` (padrão `upsert`
    idempotente + audit in-tx); `PostingService.ts:45-52,736-785` (`attachSourceDocument`, idempotente por
    `externalRef` in-tx, exige `canManage`); `NfeSaleReconciliationService.ts:28,84-100,117-122` (âncora
    `findBySource('sale.finalized', saleId)`, Σ débito, chamada do attach); `revenueSplit.ts:32-59`
    (`splitRevenueCredit`, resíduo na linha de produto); `saleItems.ts:16-80` (`loadSalePackageInfo`: kind,
    `serviceId`/`productId`/`quantity`/`unitPrice`/`type`; **não expõe linhas de serviço**);
    `SaleSalesAccountingBridge.ts:49,66,91` (só `Finalized`; all-`Package` retorna; `occurredAt =
    scopeDay(scope, data.date)`); `SalePackageSoldBridge.ts:79`; `AccountingSyncPort.ts:1-40` (porta de
    aplicação, pós-commit, nunca do motor); `middleware/auth.ts:36-42,79-86` (`publicApiRoutes` exact/prefix,
    HEAD dobrado); `audit/auditCanonical.ts:56,133-138` (allowlist id-only, `fiscal_profile.updated`);
    `routes/nfe.ts:17-19` + `routes/index.ts:75` + `docs.paths.ts:3131-4251` (2 toques); `lib/cnpj.ts:24-97`
    (CNPJ alfanumérico + DV; `CPF_REGEX` só regex; `NFE_CHAVE_REGEX`, `nfeChaveCheckDigit`);
    `dynamicTables/utils/ValidationUtils.ts:13-50` (**`isValidCpf`/`isValidCnpj` do preset = só contagem de
    dígitos, sem DV, e `replace(/\D/g,'')` remove letras** → CNPJ alfanumérico é rejeitado em `units.cnpj`);
    presets `UnitsModule.ts:16-18` (`name, cnpj, address` string único), `CustomerModule.ts:33-50` (`name,
    email, phone, taxId, street, addressNumber, …, city` **texto**, `stateUF, zipCode`), `SalesModule.ts:28-46`
    (`unitId, date, saleStatus, customerId, simpleCustomerName, totalAmount, discountAmount, taxAmount`),
    `SalesItemsMixed.ts:15-22` (`saleId, itemType, productId, serviceId, packageId, description, quantity,
    unitPrice`); `jobs/AccountingSyncScheduler.ts` (lock process-local, JOB-005); `lib/factory.ts:1103-1109`.
  - `PEDIDO-CONTADOR-2026-09-03.md:101-106` itens **5a–5f** (D1f) — não enviado (`PROXIMOS-PASSOS-2026-09-17.md:191`).
  - BRIEF irmão de formato: `BE-INCR-NFE-COST-REGIME-brief.md` (X6, dono do `FiscalProfile`).
- **Nós vizinhos:** consome `FiscalProfile` (X6 ✅ #328 `fb7ae649` — estende por `ADD COLUMN`), lançamento âncora
  `sale.finalized`/`sale.package.sold` (bridges de venda — só leitura), `PostingService.attachSourceDocument`
  (seam NFE-X), `DocumentAttachment`/`attachmentStorage` (INCR-5), `lib/cnpj.ts` (#280), presets
  `units`/`customers`/`services`/`sales`/`saleItems` (leitura via repositório, nunca via motor). É consumido
  por: `FE-INCR-DFE` (botão na venda + tela de documentos — BRIEF próprio), BRIEF do adaptador do parceiro
  (D5), X7 (colunas tributárias), vigilância PNCT (`errorsJson`), H2-DFE (runbook).

## Definição de pronto

Igual ao formulário: checklist numerado + contratos esboçados + forks listados, não decididos.

---

## 0. As duas decisões do dono desta sessão (transcritas — não são forks)

**D-X10b-1 — "atrás da porta".** Este BRIEF entrega `DfeEmissorPort` + `NullEmissor` (teste) + `FileEmissor`
(grava DPS/NF-e validada em disco para envio manual pelo emissor web nacional — a "válvula" do ADR §6) e
**nenhum adaptador HTTP**. A seleção é por env (`DFE_PARTNER=null|file|<parceiro>`); `<parceiro>` sem
adaptador registrado ⇒ emissão desabilitada com aviso nomeado. Consequência: **D5 deixa de bloquear X10b**;
o que fica bloqueado por D5 é só o BRIEF do adaptador. O webhook (F-DFE-5 c) nasce como **método da porta +
rota pública**, que `Null`/`File` recusam (F-DFE-12).

**D-X10b-2 — "D1f no FiscalProfile".** Cada item 5a–5f do pedido ao contador vira **campo persistido** com
default = recomendação do ADR e marca `[pendente contador]` no comentário do schema e no `GET` do perfil
(`pendingExternalValidation: string[]`). **Ambos os ramos de cada campo são implementados** (dono: "muda-se
config, não código"):

| Item | Campo | Default (fonte da recomendação) | Ramo alternativo implementado |
|---|---|---|---|
| **5a** item LC 116 + onde o ISS é devido | `ServiceFiscalProfile.cTribNac` (6 dígitos, aba `MUN.INCID_INFO.SERV.`), `cNBS`, `cTribMun?`; `cLocPrestacao` = `FiscalProfile.codMun` | sem default de código (400 "perfil de serviço incompleto"); incidência **EP** para o grupo 6 (**primária**: `MUN.INCID` l.73-78 marca `X` em "Estabelecimento/Domicílio do Prestador") | `cLocPrestacao` explícito por serviço (`ServiceFiscalProfile.cLocPrestacao?`) para serviço com LI ≠ EP |
| **5b** ISS retido | `FiscalProfile.issRetidoTomadorPj: Boolean` | `false` (ADR §9.2 item 3: retenção fora do MVP; `tpRetISSQN = 1`) | `true` ⇒ tomador CNPJ ⇒ `tpRetISSQN = 2`, exige endereço nacional do tomador (RN **E0237**) — sem endereço ⇒ 400 nomeado |
| **5c** pacote: fato gerador | `FiscalProfile.pacoteFatoGerador: 'CONSUMO' \| 'VENDA'` | `CONSUMO` (F-DFE-9 a: âncora `sale.finalized` do serviço pago com pacote) | `VENDA` ⇒ venda all-`Package` emite ancorada em `sale.package.sold` (D 1.1.2 / C 2.1.1), tie-out `Σ vServ == débito 1.1.2` |
| **5d** IBS/CBS 2026 | `FiscalProfile.ibsCbsInformar: Boolean`, `ibsCbsCst` (3), `ibsCbsClassTrib` (6); `ServiceFiscalProfile.cIndOp` | `ibsCbsInformar = regimeTributario !== 'SIMPLES'`; `cIndOp = '030101'` (**primária** Anexo C l.5: serviço prestado fisicamente sobre a pessoa, estabelecimento do fornecedor); `cst`/`classTrib` **sem default** (tabela fora do corpus — §6) | `false` ⇒ grupo `IBSCBS` omitido (permitido: OCOR 0-1) |
| **5e** Simples na DPS | `regimeTributario = 'SIMPLES'` ⇒ `opSimpNac = 3`; `FiscalProfile.regApTribSN: Int?`, `pTotTribSNCent: Int?` | `regApTribSN = 1` [inferido da RN 508: "apuração do ISSQN pelo SN"] ; `ibsCbsInformar=false` (leiaute: "para optantes … só a partir de 2027") | valores livres; **MEI (`opSimpNac = 2`) fora do MVP** — RN **E1302** proíbe o grupo `valores` exceto `vLiq`; 400 nomeado |
| **5f** competência × mês seguinte | `FiscalProfile.emissaoForaDoMes: 'AVISAR' \| 'BLOQUEAR'` | `AVISAR` (ADR §9.2 item 4 d) — preview devolve `competenciaAlerta: true` quando `mês(hoje) > mês(sale.date)` no fuso do escopo | `BLOQUEAR` ⇒ 400 nomeado |

Campos exigidos pela **primária** que o pedido ao contador **não** cobria (viram configuráveis + linhas novas
no pedido — §7 achado 3): `pTotTribFedCent/EstCent/MunCent` (Lei 12.741 — `totTrib` é **1-1** e `indTotTrib`
é **proibido** para não-optante, RN **E0713**), `issAliquotaBp?` (só quando o município de incidência **não** é
conveniado ativo — RN **E0617/E0618**; conveniado ⇒ campo proibido, alíquota vem do sistema), `cNBS` (obrigatório
se `IBSCBS` informado — RN **E0322**; ex.: cabeleireiros = `1.2602.10.00`, Anexo B `LISTA.NBS_v2.0` l.1202).

---

## 1. Transcrição do leiaute — a parte da DPS que este BRIEF usa (I052: nunca de memória)

Fonte: `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx`, aba `LEIAUTE DPS_NFS-e` (nº da linha da planilha entre
colchetes), tipos `E`/`G`/`CE`/`CG`, ocorrência, tamanho. O schema Zod `DpsPayloadSchema` (§3) transcreve
**estas** linhas; tudo o que não está aqui é omitido (OCOR 0-1) ou fica fora do MVP (declarado).

| Caminho | Campo | OCOR | TAM | Origem no Luminaris | RN que morde |
|---|---|---|---|---|---|
| `infDPS/` [102] | `id` | 1-1 | 45 | `"DPS" + cLocEmi(7) + "2" + CNPJ(14) + serie(5) + nDPS(15)` | — |
| [103] | `tpAmb` | 1-1 | 1 | `DFE_PARTNER_ENV`: producao=1, homologacao=2 | E0006 |
| [104] | `dhEmi` | 1-1 | D | instante do `SENT` (UTC, TZD) | E0015 (`dCompet ≤ dhEmi`) |
| [105] | `verAplic` | 1-1 | 1-20 | `luminaris/<versão do package.json>` | — |
| [106] | `serie` | 1-1 | 1-5 | `FiscalProfile.dpsSerie` (faixa **00001–49999** "aplicativo próprio") | E0010 |
| [107] | `nDPS` | 1-1 | 1-15 | `FiscalDocumentSequence` por (`unitId`, `kind`, `serie`), ACC-015 por analogia | — |
| [108] | `dCompet` | 1-1 | D | **`sale.date`** (mesma do lançamento — `scopeDay`), nunca "hoje" | E0015; "deve ser a data da prestação do serviço" (nota do leiaute) |
| [109] | `tpEmit` | 1-1 | 1 | `1` (prestador) | — |
| [112] | `cLocEmi` | 1-1 | 7 | `FiscalProfile.codMun` (IBGE) | E0016 (convênio ativo na competência) |
| [113-116] | `subst{chSubstda,cMotivo,xMotivo}` | 0-1 | — | reenvio por **substituição** de NFS-e autorizada — **fora do MVP** (declarado); cancelamento + nova DPS cobre o salão | — |
| `prest/` [118] | `CNPJ` | CE 1-1 | 14 | `units.cnpj` da unidade (alfanumérico — `lib/cnpj.ts`) | E0160 (cadastro SN) |
| [123] | `IM` | 0-1 | 15 | `FiscalProfile.inscricaoMunicipal?` | — |
| [124] | `xNome` | 0-1 | 150 | `units.name` | — |
| [125-137] | `end`, `fone`, `email` | 0-1 | — | **omitidos** (endereço do prestador é do cadastro nacional) | — |
| [140] | `regTrib/opSimpNac` | 1-1 | 1 | `regimeTributario`: SIMPLES→3, senão→1; MEI (2) fora do MVP | E0160, E1302 |
| [141] | `regApTribSN` | 0-1 | 1 | `FiscalProfile.regApTribSN` só se SIMPLES | RN 508-510 |
| [142] | `regEspTrib` | 1-1 | 1 | `FiscalProfile.regEspTrib` default `0` | — |
| `toma/` [143] | grupo | **0-1** | — | **sempre informado** (F-DFE-7 b — dono) | E0187 (obrigatório p/ `cIndOp` 030102/03…) |
| [144-145] | `CNPJ`/`CPF` | CE 1-1 | 14/11 | `customers.taxId` com **DV** (CPF: função nova em `lib/cnpj.ts`; CNPJ: `isValidCnpj`) | E0188 (DV) |
| [150] | `xNome` | 1-1 | 150 | `customers.name` | — |
| [151-163] | `end/endNac{cMun,CEP}`, `xLgr…` | 0-1 | — | F-DFE-14 (omitir × Anexo A × preset); **obrigatório** se `tpRetISSQN = 2` | E0237 |
| `serv/locPrest/` [192] | `cLocPrestacao` | CE 1-1 | 7 | `ServiceFiscalProfile.cLocPrestacao ?? FiscalProfile.codMun` (EP p/ grupo 6) | — |
| `serv/cServ/` [195] | `cTribNac` | 1-1 | 6 | `ServiceFiscalProfile.cTribNac` (ex.: `060101`, `060201`) | validado contra a lista transcrita |
| [196] | `cTribMun` | 0-1 | 3 | `ServiceFiscalProfile.cTribMun?` | — |
| [197] | `xDescServ` | 1-1 | 1000 | `ServiceFiscalProfile.xDescServ ?? services.name` + linhas (qtd × unit) | — |
| [198] | `cNBS` | 0-1 | 9 | `ServiceFiscalProfile.cNBS?` (obrigatório se `IBSCBS`) | E0322 |
| [199] | `cIntContrib` | 0-1 | 20 | `FiscalDocument.id` (cuid, 25 chars) **não cabe** → `ref` curto = `nDPS` ou hash 20; decisão do implementador (D1) | — |
| [200-239] | `comExt`, `obra`, `atvEvento` | 0-1 | — | **omitidos** (grupo 6 não exige — `MUN.INCID` col. "obra/atvEvento" = `-`) | — |
| [241-246] | `infoCompl{xInfComp}` | 0-1 | 2000 | `"Venda <saleId> — Luminaris"` (sem PII) | — |
| `valores/vServPrest/` [250] | `vServ` | 1-1 | 15V2 | **F-DFE-11 a**: crédito 3.1 do lançamento âncora em centavos → reais 2 casas | — |
| [251-253] | `vDescCondIncond{vDescIncond,vDescCond}` | 0-1 | 15V2 | F-DFE-15 (líquido × bruto + desconto) | — |
| [254-297] | `vDedRed` | 0-1 | — | **omitido** (sem dedução no salão) | — |
| `trib/tribMun/` [301] | `tribISSQN` | 1-1 | 1 | `1` (operação tributável); imunidade/exportação fora do MVP | — |
| [311] | `tpRetISSQN` | 1-1 | 1 | `1`; `2` se `issRetidoTomadorPj && tomador CNPJ` | E0204, E0237 |
| [312] | `pAliq` | 0-1 | 1V2 | `FiscalProfile.issAliquotaBp` só quando **setado** (município não conveniado); ≤ 5% | E0595, E0617/E0618 |
| [313-324] | `tribFed{piscofins,vRetCP,vRetIRRF,vRetCSLL}` | 0-1 | — | **omitido** no MVP (retenções federais = tomador PJ; PIS/COFINS próprio é X7) — declarado | — |
| `trib/totTrib/` [325] | grupo | **1-1** | — | choice: `vTotTrib{Fed,Est,Mun}` **ou** `pTotTrib{Fed,Est,Mun}` **ou** `indTotTrib=0` **ou** `pTotTribSN` | E0712, **E0713** |
| [330-333] | `pTotTrib*` | 1-1 | 1-2V2 | `FiscalProfile.pTotTribFedCent/EstCent/MunCent` (não-optante); `pTotTribSNCent` (SIMPLES) | — |
| `IBSCBS/` [336] | grupo | 0-1 | — | se `ibsCbsInformar` | E0850 (competência ≥ 2026-01-01), E1515 |
| [337] | `finNFSe` | 1-1 | 1 | `0` | — |
| [339] | `cIndOp` | 1-1 | 6 | `ServiceFiscalProfile.cIndOp` (Anexo C) | E0901 |
| [344] | `indDest` | 1-1 | 1 | `0` (tomador = destinatário) | — |
| [405-407] | `trib/gIBSCBS{CST,cClassTrib}` | 1-1 | 3/6 | `FiscalProfile.ibsCbsCst`/`ibsCbsClassTrib` (3 primeiros dígitos iguais) | E0958, E0959 |
| [416] | `Signature` | 0-1 | — | **do parceiro** (D1) — `FileEmissor` grava sem assinatura | — |

**O que o leiaute prova e o ADR/parecer tinham como secundário (grau sobe para verificado):** `dCompet` =
data da prestação (§9.2 item 4); tomador é opcional no leiaute (F-DFE-7 (b) é escolha do dono, não exigência
do fisco); alíquota é do sistema em município conveniado; número da NFS-e é do ADN (`nNFSe` [8] "a Sefin
Nacional irá gerar o número de forma sequencial por emitente … não irá reutilizar números"), número/série da
DPS é do prestador; cancelamento = evento `e101101` com `cMotivo ∈ {1 erro na emissão, 2 serviço não prestado,
9 outros}` + `xMotivo` 15-255 (Anexo II `LEIAUTE EVENTO` l.21-24); **prazo de cancelamento é parametrizado pelo
município** (Anexo II RN **E0822**, nível 3) — não é 24h fixo; substituição existe (`e105102`) e fica fora do
MVP; **grupo IBSCBS da DPS não carrega valores** — `vIbsCents`/`vCbsCents` das colunas do ADR §9.2 item 1 só
podem vir do **retorno** (NFS-e gerada), nunca da montagem.

---

## 2. Checklist de comportamentos

Tags: **[direto]** implementável sem fork; **[cond:F-DFE-n]** pausa até o fork; **[pendente-insumo]** só
com o insumo de §6. Cada item nomeia o teste que o exercita.

### Fase 0 — Schema (serial; 1 migração aditiva, prólogo `IF NOT EXISTS`, smoke sobre cópia do `dev.db` real)

1. **[direto]** `FiscalProfile` ganha colunas (§3): `codMun`, `inscricaoMunicipal?`, `cnae?`, `dpsSerie`,
   `regEspTrib`, `regApTribSN?`, `issAliquotaBp?`, `issRetidoTomadorPj`, `pacoteFatoGerador`, `ibsCbsInformar`,
   `ibsCbsCst?`, `ibsCbsClassTrib?`, `pTotTribFedCent?`, `pTotTribEstCent?`, `pTotTribMunCent?`,
   `pTotTribSNCent?`, `emissaoForaDoMes`. Todas `ADD COLUMN` com default ou nullable — linhas X6 existentes
   continuam válidas para importar NF-e; só a **emissão** exige o conjunto completo (item 14). Testável:
   `prisma migrate diff` = no difference; `smoke:migration` PASS com a linha X6 do `dev.db` preservada.
2. **[direto]** `ServiceFiscalProfile` (Prisma first-class, F-DFE-6 a; `serviceRef` = id da linha `services`,
   plain string como `Payable.supplierRef`): `cTribNac`, `cTribMun?`, `cNBS?`, `cIndOp`, `cLocPrestacao?`,
   `xDescServ?`; `@@unique([userId, unitId, serviceRef])` com rename-on-delete (`deleted:<id>:<ref>`) — classe
   `unique-de-idempotencia-x-soft-delete`. Testável: delete → re-create não dá P2002.
3. **[cond:F-DFE-10 ✅ a]** `FiscalDocument` + `FiscalDocumentAttempt` (§3): documento guarda estado
   corrente + colunas tributárias; tentativa guarda `payloadJson` imutável + `ref = <docId>:<n>` + resultado.
   `@@unique([userId, unitId, saleKey, kind])` sobre vivos via rename-on-cancel (`saleKey = saleId` →
   `cancelled:<id>:<saleId>`). Testável: 2ª emissão para a mesma (venda, kind) viva → 409; após `CANCELLED`
   → nova permitida.
4. **[direto]** `FiscalDocumentSequence` (`@@id([userId, unitId, kind, serie])`, `last`) — espelho de
   `JournalEntrySequence`, **nunca** a sequência do razão. Incremento **dentro** da tx do `SENT` (ACC-015 por
   analogia). Testável: 2 emissões concorrentes → números distintos e consecutivos (Windows serializa — a CI é
   o oráculo, memória `windows-serializa-sqlite-ci-linux-nao`).
5. **[direto]** Repositórios + interfaces (`IServiceFiscalProfileRepository`, `IFiscalDocumentRepository` com
   `findLiveBySale`, `createSent`, `appendAttempt`, `transition`, `listPending`, `runTransaction`, `tx?` em
   todos); policy `canReadFiscalDocument`/`canEmitFiscalDocument`/`canCancelFiscalDocument` +
   `canManageServiceFiscalProfile` em `IAccountingPolicy` (deny-by-default, régua de `canManageFiscalProfile`);
   factory (zero `new` em serviço). Testável: policy falsa → 403 em cada rota.

### Fase A — Perfil fiscal estendido (X6 herda; D1f configurável)

6. **[direto]** `UpsertFiscalProfileSchema` estende-se com os campos do item 1 (`.strict()`, snapshot de shape
   regenerado). `superRefine`: `SIMPLES` ⇒ `ibsCbsInformar=false` permitido e `pTotTribSNCent` esperado;
   `≠ SIMPLES` ⇒ `regApTribSN`/`pTotTribSNCent` proibidos (RN E0713 espelhada); `issAliquotaBp ≤ 500`
   (E0595); `ibsCbsClassTrib.slice(0,3) === ibsCbsCst` (E0959); `codMun` 7 dígitos; `dpsSerie ∈ [1, 49999]`
   (E0010). Testável: cada regra com par válido/inválido.
7. **[direto]** `GET /api/accounting/fiscal-profile` devolve `emissao: { completo: boolean, faltantes: string[],
   pendingExternalValidation: string[] }` — os campos D1f com valor = default aparecem em
   `pendingExternalValidation` até o operador salvá-los explicitamente (`*_confirmedAt`? não — usa
   `updatedById` + flag `d1fConfirmado: Boolean @default(false)` que o PUT seta `true`). Testável: perfil X6
   puro → `completo=false`, `faltantes` lista `codMun`, `pTotTrib*`, …
8. **[direto]** `ServiceFiscalProfile` CRUD: `GET /api/accounting/service-fiscal-profiles?unitId`, `PUT
   /api/accounting/service-fiscal-profiles/:serviceRef` (upsert idempotente), `DELETE` (soft). DTO `.strict()`;
   `cTribNac` validado contra a lista nacional transcrita (const `lc116ListaNacional.ts`: 341 códigos da aba
   `MUN.INCID_INFO.SERV.`, chave = ordinal da fonte — memória `tabela-transcrita-de-lei-conferir-redacao-vigente`);
   `cIndOp` contra Anexo C (const); `cNBS` 9 dígitos. Testável: código fora da lista → 400.
9. **[direto]** Audit: `fiscal_profile.updated` ganha as chaves novas (enum/boolean/int como string — nada de
   texto livre); `service_fiscal_profile.updated` novo — allowlist **na mesma mudança**, teste-guarda padrão
   #255/#258.

### Fase B — Porta e adaptadores (D-X10b-1)

10. **[direto]** `DfeEmissorPort` (§3) em `features/accounting/dfe/DfeEmissorPort.ts`, desenho de
    `AccountingSyncPort` (porta de aplicação, invocada por serviço/controller, jamais de plugin). `capabilities`
    declaradas por adaptador (`numbersDps`, `webhook`, `cancel`, `consultar`).
11. **[direto]** `NullEmissor`: `emitir` devolve `AUTHORIZED` sintético (número = `nDPS`, `chaveOuCodigo`
    fake determinístico, `xml` = payload serializado), `consultar` ecoa, `cancelar` devolve `CANCELLED`;
    **recusa `NODE_ENV=production`** no construtor (ADR §7 item 6). Testável: construir sob production lança.
12. **[direto]** `FileEmissor`: grava `payload` em `DFE_FILE_DIR/<ambiente>/<kind>/<ref>.json` (+ `.xml` na
    onda NF-e) e devolve `PROCESSING` com `partnerRef = ref`; `consultar` lê um arquivo-resposta opcional
    `<ref>.result.json` (o dono cola o retorno do emissor web) — sem arquivo continua `PROCESSING`; `cancelar`
    devolve `OUT_OF_WINDOW`/`REJECTED` tipado ("cancelamento manual no emissor web") — nunca `CANCELLED`
    sem prova. Testável: emitir → arquivo existe; colocar result → consultar vira `AUTHORIZED`.
13. **[direto]** Seleção por env na factory: `DFE_PARTNER` ∈ {`null`,`file`} neste BRIEF; ausente ou
    `<parceiro>` sem adaptador ⇒ `DfeDisabledEmissor` cujo `emitir` lança `ValidationError('dfe_disabled: …')`
    e `GET /api/nfe/dfe/status` devolve `{ enabled:false, reason }` (ADR §7 item 6 "desabilitada com aviso,
    nunca em silêncio"). `DFE_PARTNER_ENV` ∈ {`producao`,`homologacao`} obrigatório quando habilitado.
    Testável: 3 combinações de env.

### Fase C — Montagem e envio da DPS (NFS-e) — a ordem NFS-e antes de NF-e é do ADR §10 F-DFE-1

14. **[direto]** Pré-condições **antes** de chamar a porta, todas devolvidas juntas em 400 com a lista
    (ADR §7 item 3): (i) venda existe no escopo e `status = 'Finalized'`; (ii) `kind` da venda ≠ `Empty`; all-
    `Package` ⇒ só se `pacoteFatoGerador = 'VENDA'` (item 21), senão 400 "pacote emite no consumo"; (iii)
    perfil da unidade completo (item 7); (iv) todo item de serviço tem `ServiceFiscalProfile` com `cTribNac`
    (+ `cNBS` se `ibsCbsInformar`); (v) tomador: `sales.customerId` obrigatório (F-DFE-7 b) com `taxId` válido
    por **DV** — `simpleCustomerName` sem cliente ⇒ 400 "vincular cliente / cadastrar documento"; (vi) nenhum
    documento vivo para (venda, `NFSE`); (vii) `emissaoForaDoMes = 'BLOQUEAR'` e competência cruzou o mês ⇒
    400; (viii) porta habilitada. Testável: um teste por pré-condição, cada um provando que a porta **não** foi
    chamada (spy).
15. **[direto]** Linhas de serviço da venda: função nova **ao lado** de `loadSalePackageInfo` em `saleItems.ts`
    (`loadSaleServiceLines(userId, saleId)` → `{ serviceRef, description, quantity, unitPrice }[]`) — reuso do
    mesmo repositório, sem tocar o classificador. Testável: venda mista devolve só as linhas `Service`.
16. **[cond:F-DFE-11 ✅ a, F-DFE-15]** Valores: `vServCents` = crédito **3.1** do lançamento âncora
    (`findBySource('sale.finalized', saleId)`, posting `accountCode = SERVICE_REVENUE_ACCOUNT`); as linhas
    de serviço entram só em `xDescServ` (descrição/quantidade). **Um `vServ` por documento** (a DPS é
    mono-serviço: `cServ` é 1-1 — venda com serviços de `cTribNac` **distintos** ⇒ F-DFE-16). Tie-out
    **exato em centavos** `vServCents === crédito 3.1` provado no teste com desconto de header que não divide
    (classe `bp-dre-diagnostics-test-must-mix-natures`: fixture **mista**). Testável: venda 3 serviços + 1
    produto + desconto 10,01 → `vServCents` == crédito 3.1 do posting real.
17. **[direto]** Competência: `dCompet = sale.date` (string `date` do preset, já é dia do escopo), `dhEmi` =
    agora UTC; asserção local `dCompet ≤ dhEmi` (E0015) antes de enviar; `competenciaAlerta` no resultado
    quando o mês cruzou (item 5f). Testável: venda de ontem à noite em UTC-3 não vira "hoje" (classe
    `date-only-rendering-utc-shift`).
18. **[direto]** Numeração: `serie = dpsSerie`, `nDPS = sequence.last + 1` **na tx do `SENT`**; quando
    `capabilities.numbersDps` do adaptador for `true` (adaptador futuro), o número da DPS vem do retorno e a
    sequência **não** é consumida — decidido pela porta, não por env. Testável: `Null`/`File` consomem a
    sequência.
19. **[direto]** `DpsPayloadSchema` (§3) transcrito de §1; a montagem produz o objeto e **valida com o schema
    antes** de persistir a tentativa (payload inválido = bug nosso, 500 com detalhe, não 400). Serialização:
    JSON canônico (chaves na ordem do leiaute) em `FiscalDocumentAttempt.payloadJson`; XML fica com o
    adaptador/parceiro (D1: assinatura é dele) — `FileEmissor` grava o JSON. Testável: snapshot do payload de
    uma venda-fixture; mutação (trocar `tpRetISSQN` para 2 sem CNPJ) falha no schema (E0204 espelhada).
20. **[direto]** Ciclo `SENT`: em **uma** tx do repositório de documentos — cria/atualiza `FiscalDocument`
    (status `SENT`, colunas tributárias, `ambiente`), cria `FiscalDocumentAttempt` n, consome sequência,
    audita `dfe.emitted` in-tx; **pós-commit** chama `porta.emitir` (mesma regra pós-commit do
    `AccountingSyncPort`); resultado aplica `transition` (item 24). Falha de rede após o commit ⇒ documento fica
    `SENT` e o job (item 27) re-consulta. Testável: porta lança → documento persiste `SENT` com `errorsJson`
    da exceção; não há tentativa 2 automática.
21. **[direto]** Pacote `VENDA` (item 5c ramo b): âncora `findBySource('sale.package.sold', saleId)`,
    `vServCents` = débito 1.1.2 do lançamento, `xDescServ` = nome do pacote, `SourceDocument` anexado a esse
    lançamento. Sob `CONSUMO` (default) a venda do pacote é recusada (item 14 ii) e o serviço pago com pacote
    (`paidWithPackageId`) emite normalmente pela âncora `sale.finalized`. Testável: os dois ramos com a mesma
    fixture, trocando só o campo do perfil.
22. **[direto]** Simples (5e): `opSimpNac=3`, `regApTribSN`, `pTotTribSN`; grupo `IBSCBS` omitido por default;
    `pAliq` conforme RN 508-511 só quando `issAliquotaBp` setado. MEI ⇒ 400 nomeado (E1302). Testável:
    perfil SIMPLES gera payload sem `IBSCBS` e com `pTotTribSN`.
23. **[direto]** Preview: `POST /api/nfe/dfe/preview { saleId, kind }` — roda itens 14–19 **sem** persistir
    nem chamar a porta; devolve `{ payload, faltantes, competenciaAlerta, tieOut: { vServCents, ledgerCents } }`.
    Testável: preview de venda incompleta devolve `faltantes` e não cria linha.

### Fase D — Resultado, proveniência, cancelamento, polling, webhook

24. **[direto]** `transition(doc, result)` como máquina de estados única (serviço): `SENT|PROCESSING →
    AUTHORIZED|REJECTED|PROCESSING`; `AUTHORIZED → CANCELLED`; qualquer outra transição lança. `AUTHORIZED`
    exige `partnerRef` + número (`nNFSe`) + `chaveOuCodigo` (ADR D3 iv). Testável: tabela de transições
    válidas/inválidas.
25. **[cond:F-DFE-18, F-DFE-19]** `AUTHORIZED` **em `producao`**: (1) XML/PDF do retorno → `DocumentAttachment`
    no lançamento âncora via `attachmentStorage` (sha256, mime); (2) `attachSourceDocument(scope, anchor.id,
    { sourceType: 'dfe.nfse', externalRef: chaveOuCodigo, documentDate: sale.date, description: 'NFS-e
    <nNFSe>', attachmentId, rawJson: resultado sem PII })` — 1 e só 1 `SourceDocument`, **0 lançamentos
    novos** (contagem antes/depois); (3) `sourceDocumentId` gravado; (4) colunas `vIssCents`, `aliqIssBp`,
    `vIbsCents`, `vCbsCents` preenchidas **do retorno** quando o adaptador as devolver (§1: a DPS não as
    carrega). Em `homologacao`: grava o documento, **não** anexa proveniência nem attachment (ADR §9.2 item 5).
    Audit `dfe.authorized`. Testável: `NullEmissor` em `producao`-de-teste (env fake, não `NODE_ENV`) →
    1 `SourceDocument`; em `homologacao` → 0.
26. **[direto]** `REJECTED`: `errorsJson` = `[{code,message}]` do parceiro; `POST …/:id/reenviar` só de
    `REJECTED`, cria tentativa n+1 com `ref` novo (`<id>:<n+1>`), payload **remontado** (perfil/venda corrigidos);
    a tentativa n fica intacta (prova). Audit `dfe.rejected` / `dfe.emitted` (n+1). Testável: reenvio muda o
    payload, mantém o documento, `ref` distinto; tentativa 1 não muda (assere a **segunda** leitura —
    classe `comentario-de-teste-afirma-o-que-nao-assere`).
27. **[direto]** Job `dfe_poll_pending` (JOB-005, Prisma-direto, lock process-local — mesmo molde de
    `AccountingSyncScheduler`; parametrizar o scheduler existente ou clone mínimo é decisão D1 do implementador):
    varre `SENT|PROCESSING` mais velhos que `DFE_POLL_AFTER_MS`, chama `consultar`, aplica `transition`;
    `ValidationError` de código próprio (`dfe_*`) = skip+log; outro erro = alerta (classe
    `erro-especifico-para-skip-em-job`). `POST …/:id/consultar` faz o mesmo para um documento (tela).
    Testável: documento `SENT` + `File` com result → job o leva a `AUTHORIZED`; sem result → continua e loga.
28. **[cond:F-DFE-12]** Webhook `POST /api/nfe/dfe/webhook/:partner` na `publicApiRoutes` (**prefix**, método
    POST — HEAD não se aplica) **de propósito** (ADR §10 F-DFE-5 c): corpo bruto → `porta.verifyWebhook` →
    inválido/adaptador sem `capabilities.webhook` ⇒ **401 sem efeito**; válido ⇒ enfileira `consultar` do
    `partnerRef` (o corpo **nunca** transiciona estado — só acorda a re-consulta). Idempotente por
    (`partnerRef`, status). Testável: assinatura inválida ⇒ 401 e 0 escrita; `Null`/`File` ⇒ 401 sempre.
29. **[direto]** Cancelamento: `POST …/:id/cancelar { cMotivo: 1|2|9, xMotivo (15-255) }` (Anexo II
    `e101101`) só de `AUTHORIZED`; `porta.cancelar` devolve tipado — `CANCELLED` ⇒ transição + marca na
    proveniência (F-DFE-18) + audit `dfe.cancelled`; `OUT_OF_WINDOW` ⇒ 409 nomeado "prazo do município
    (E0822)"; `REJECTED` ⇒ 409 com erros. **Não** toca a venda nem o razão (ADR §7 item 5: contagem de
    lançamentos antes/depois). Testável: 3 resultados da porta → 3 respostas; razão inalterado.
30. **[direto]** Venda cancelada/devolvida **depois** de `AUTHORIZED`: nada automático; `GET …/documents`
    devolve `pendencias: ['sale_cancelled_with_live_document']` para a venda (a tela exige cancelar). `CANCELLED`
    sem novo documento vivo na mesma venda = `pendencias: ['cancelled_without_replacement']` (ADR §9.2 item 7 ii).
    Testável: fixture com venda `Cancelled` + doc `AUTHORIZED` → pendência listada.
31. **[direto]** Identidade: `isValidCpf` **com DV** nova em `lib/cnpj.ts` (a `ValidationUtils.isValidCpf` é
    só contagem); tomador CNPJ por `isValidCnpj` (alfanumérico); emitente `units.cnpj` idem. **Teste de que
    unidade com CNPJ alfanumérico cadastra no preset `units`** (ADR §9.2 item 10) — hoje **falha por
    construção** (`ValidationUtils.isValidCnpj` remove letras, `:37`): a correção é delegar para
    `lib/cnpj.ts` — fora do módulo contábil, blast radius = todo preset com `format: 'cnpj'` (§7 achado 1;
    **F-DFE-17** decide se entra aqui).

### Fase E — NF-e 55 de venda (onda 2 **no mesmo BRIEF**, F-DFE-1 → b) — [pendente-insumo]

32. **[pendente-insumo: MOC 7.0 saída]** Transcrição F0-2-saída: grupos `ide` (`cNF`, `nNF`, `serie`, `tpNF=1`,
    `idDest`, `cMunFG`, `tpEmis`, `finNFe=1`, `indFinal`, `indPres`), `emit` (CRT), `dest` (CPF/CNPJ com
    `indIEDest=9`), `det/prod` (`cProd`, `xProd`, `NCM`, `CFOP` 5.102/5.405, `uCom`, `qCom`, `vUnCom`,
    `vProd`), `det/imposto` (ICMS por CST/CSOSN, PIS/COFINS CST, **IBSCBS** NT 2025.002), `total/ICMSTot` +
    `vNFTot`, `transp{modFrete=9}`, `pag`. A transcrição existente (`BE-INCR-NFE-layout-transcription.md`) é do
    **parser de entrada** e cobre só as tags lidas — não serve de fonte para a saída. Sem transcrição, **nenhum
    item 33–37 abre**.
33. **[pendente-insumo]** `NfePayloadSchema` transcrito; `kind = 'NFE'` reusa itens 14, 18–20, 24–30 pela
    mesma porta (`FiscalDocument.kind`).
34. **[pendente-insumo]** Linhas de **produto** da venda (`productLines` já existe em `saleItems.ts`);
    `vProd` total = crédito **3.3** do lançamento âncora, rateado por linha pela técnica canônica
    (`splitRevenueCredit` **não** re-inlinada — extrair `splitCents(total, weights[])` se necessário, na
    mesma unidade `revenueSplit.ts`); tie-out `Σ vProd == crédito 3.3` exato, fixture mista.
35. **[cond:F-DFE-13]** Numeração **gapless por série + inutilização de faixas** (ADR §9.2 item 9 / §10
    F-DFE-1: "entra como fork do próprio BRIEF"): `FiscalDocumentSequence(kind='NFE')` + tabela
    `FiscalNumberVoid` (faixa inutilizada, protocolo) + evento de inutilização na porta.
36. **[pendente-insumo]** Chave de 44 posições: `cUF + AAMM + CNPJ(14, alfanumérico #280) + mod 55 + serie +
    nNF + tpEmis + cNF + cDV` via `nfeChaveCheckDigit` (`lib/cnpj.ts:82`); `NFE_CHAVE_REGEX` na validação.
37. **[pendente-insumo]** Venda **mista** ⇒ 2 documentos (`NFSE` + `NFE`) na mesma venda; invariante de fecho
    `Σ vServ + Σ vProd == totalCents − linhas Package` (ADR §9.2 item 6); tie-out por total de
    `NfeSaleReconciliationService.ts:98` **não** se aplica (cada documento é subconjunto do débito — parecer §1.1).

### Fase F — Rotas, DTOs, docs, gates

38. **[direto]** Rotas (ACC-016, 2 toques `index.ts` + `docs.paths.ts`; `npm run docs:generate` + BASELINE de
    `openapi-paths.test.ts`, contar **paths**): `GET /api/nfe/dfe/status`; `POST /api/nfe/dfe/preview`; `POST
    /api/nfe/dfe/documents` (emitir `{saleId, kind}`); `GET /api/nfe/dfe/documents?unitId&saleId?&status?` (com
    `pendencias`); `GET /api/nfe/dfe/documents/:id` (+ tentativas); `POST …/:id/consultar`; `POST
    …/:id/reenviar`; `POST …/:id/cancelar`; `POST /api/nfe/dfe/webhook/:partner` (pública, F-DFE-12); `GET/PUT/
    DELETE /api/accounting/service-fiscal-profiles[…]`. Todas atrás de `canRead*/canEmit*/canCancel*`
    (deny-by-default no middleware).
39. **[direto]** DTOs `.strict()`: `EmitFiscalDocumentSchema`, `FiscalDocumentListQuerySchema` (booleans por
    `queryBoolean()`, classe `zod-coerce-boolean-inverte-query-string`), `CancelFiscalDocumentSchema`,
    `UpsertServiceFiscalProfileSchema`, `DpsPayloadSchema`, `WebhookParamsSchema`; snapshot de shape.
40. **[direto]** Audit allowlist na mesma mudança: `dfe.emitted` (`documentId, kind, attemptNo, ref,
    vServCents, ambiente`), `dfe.authorized` (`documentId, partnerRef, nNFSe, chaveOuCodigo, sourceDocumentId`),
    `dfe.rejected` (`documentId, attemptNo, errorCodes`), `dfe.cancelled` (`documentId, cMotivo`),
    `service_fiscal_profile.updated`. **Sem CPF/nome do tomador** em payload algum (parecer §1.12; teste-guarda).
41. **[direto]** Gates: `tsc` ×2; `npm run test:integration`; snapshot DTO; `docs:generate` diff vazio;
    allowlist; smoke sobre cópia do `dev.db` real (`server/prisma/prisma/dev.db`); review independente em
    worktree; mutação manual sobre `transition` (aceitar `SENT → CANCELLED`) e sobre o tie-out (trocar 3.1 por
    3.3) — ambas devem ficar vermelhas.
42. **[direto]** Docs no mesmo PR (fatia final): ADR-DFE ganha EMENDA 2026-09-17 (D-X10b-1/2 + o que o
    leiaute primário corrigiu — §1 último parágrafo); grafo: D-NFSE ✅ (corpus), D1f **desacoplado** (config),
    D5 só bloqueia adaptador; master map §5 linha "Emissão de DF-e" ⏳→🔄; `RUNBOOK-H2-DFE` em branco
    preparado pelo `gate-copilot` (não por esta sessão).

---

## 3. Contratos esboçados

### Prisma — colunas novas do `FiscalProfile` (ADD COLUMN sobre X6)

```prisma
  // BE-INCR-DFE — emitente (ADR D5) + D1f configurável (D-X10b-2). Sem valor => emissão incompleta (item 7), import NF-e segue.
  codMun               String?  // IBGE 7 dígitos — cLocEmi / cLocPrestacao default (leiaute [112],[192])
  inscricaoMunicipal   String?  // prest/IM [123]
  cnae                 String?  // informativo
  dpsSerie             Int      @default(1)      // serie [106], faixa 1–49999 (E0010)
  regEspTrib           Int      @default(0)      // [142] 0 = nenhum
  regApTribSN          Int?                      // [141] só SIMPLES; default 1 [inferido RN 508] — pendente contador (5e)
  issAliquotaBp        Int?                      // pAliq [312] em bp (≤ 500); só município NÃO conveniado (E0617/E0618) — pendente contador (5a)
  issRetidoTomadorPj   Boolean  @default(false)  // 5b — tpRetISSQN=2 para tomador CNPJ (exige endereço, E0237) — pendente contador
  pacoteFatoGerador    String   @default("CONSUMO") // 5c — CONSUMO | VENDA — pendente contador
  ibsCbsInformar       Boolean  @default(true)   // 5d — grupo IBSCBS [336]; SIMPLES => default false (só 2027)
  ibsCbsCst            String?                   // gIBSCBS/CST [405] 3 dígitos — tabela fora do corpus (§6) — pendente contador (1b)
  ibsCbsClassTrib      String?                   // gIBSCBS/cClassTrib [406] 6 dígitos, prefixo = CST (E0959)
  pTotTribFedCent      Int?                      // totTrib/pTotTribFed [330] em centésimos de % (Lei 12.741/IBPT) — pendente contador (novo)
  pTotTribEstCent      Int?
  pTotTribMunCent      Int?
  pTotTribSNCent       Int?                      // [335] só SIMPLES
  emissaoForaDoMes     String   @default("AVISAR") // 5f — AVISAR | BLOQUEAR — pendente contador
  d1fConfirmado        Boolean  @default(false)  // item 7 — PUT explícito do operador retira os campos de pendingExternalValidation
```

### Prisma — `ServiceFiscalProfile`

```prisma
model ServiceFiscalProfile {
  id            String   @id @default(cuid())
  userId        String
  unitId        String
  serviceRef    String   // id da linha `services` (plain string, não FK — precedente Payable.supplierRef); rename-on-delete
  cTribNac      String   // 6 dígitos, lista nacional (Anexo I MUN.INCID) — ex. 060101
  cTribMun      String?  // 3 dígitos
  cNBS          String?  // 9 dígitos (Anexo B NBS 2.0) — obrigatório se ibsCbsInformar (E0322)
  cIndOp        String   @default("030101") // Anexo C — serviço sobre a pessoa, estabelecimento do fornecedor
  cLocPrestacao String?  // IBGE 7; null => FiscalProfile.codMun (EP)
  xDescServ     String?  // default = services.name
  createdById   String?
  updatedById   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  @@unique([userId, unitId, serviceRef])
  @@map("service_fiscal_profiles")
}
```

### Prisma — `FiscalDocument`, `FiscalDocumentAttempt`, `FiscalDocumentSequence`

```prisma
model FiscalDocument {
  id                String   @id @default(cuid())
  userId            String
  unitId            String
  kind              String   // NFSE | NFE
  status            String   // SENT | PROCESSING | AUTHORIZED | REJECTED | CANCELLED
  saleId            String   // sourceId da venda (linha DynamicTable)
  saleKey           String   // = saleId enquanto vivo; "cancelled:<id>:<saleId>" após CANCELLED (libera o unique)
  cTribNac          String   @default("") // F-DFE-16 (b): um documento NFSE por código de serviço da venda; "" para NFE (não null — ver unique)
  anchorEntryId     String   // JournalEntry âncora: sale.finalized | sale.package.sold (pacote VENDA)
  ambiente          String   // producao | homologacao (ADR §9.2 item 5)
  partner           String   // null | file | <parceiro>
  partnerRef        String?
  serie             Int
  numero            BigInt?  // nDPS (nosso) | nNF (NF-e)
  nNFSe             String?  // número da NFS-e gerado pelo ADN (retorno)
  chaveOuCodigo     String?  // chave ADN da NFS-e | chave 44 da NF-e
  dCompet           String   // AAAA-MM-DD = sale.date
  vServCents        BigInt   // NFSE: crédito 3.1 | NFE: crédito 3.3 (vProd) — tie-out exato
  vDescIncondCents  BigInt   @default(0) // F-DFE-15
  baseIssCents      BigInt?
  aliqIssBp         Int?     // retorno (pAliqAplic) ou issAliquotaBp
  vIssCents         BigInt?  // retorno
  tpRetISSQN        Int      @default(1)
  vIbsCents         BigInt?  // retorno (a DPS não carrega valores de IBS/CBS — §1)
  vCbsCents         BigInt?
  currentAttemptNo  Int      @default(1)
  authorizedAt      DateTime?
  cancelledAt       DateTime?
  cancelMotivo      Int?     // e101101 cMotivo 1|2|9
  cancelReason      String?  // xMotivo 15-255
  errorsJson        String?  // último resultado REJECTED / inconsistência PNCT
  xmlAttachmentId   String?
  pdfAttachmentId   String?
  sourceDocumentId  String?
  createdById       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  attempts          FiscalDocumentAttempt[]
  @@unique([userId, unitId, saleKey, kind, cTribNac]) // F-DFE-16 (b); SQLite trata NULL como distinto — NFE usa cTribNac = "" (string vazia), não null, para o unique morder
  @@index([userId, unitId, status])
  @@map("fiscal_documents")
}

// F-DFE-19 (b) — DocumentAttachment generalizado (rebuild de tabela; ver ratificação §4):
//   targetType String  // JOURNAL_ENTRY | FISCAL_DOCUMENT | FISCAL_DOCUMENT_ATTEMPT
//   targetId   String  // plain string; existência validada no serviço por targetType — SEM FK, SEM relation em JournalEntry

model FiscalDocumentAttempt {
  id          String   @id @default(cuid())
  documentId  String
  document    FiscalDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  attemptNo   Int
  ref         String   // "<documentId>:<attemptNo>" — idempotência no parceiro por tentativa (ADR §9.1)
  payloadJson String   // IMUTÁVEL após criação (teste: update rejeitado pelo repositório)
  sentAt      DateTime @default(now())
  resultStatus String? // PROCESSING | AUTHORIZED | REJECTED
  resultJson  String?  // retorno bruto SEM PII (F-DFE-19: xml/pdf de rejeição ficam aqui ou em DFE_FILE_DIR)
  @@unique([documentId, attemptNo])
  @@unique([ref])
  @@map("fiscal_document_attempts")
}

model FiscalDocumentSequence {
  userId String
  unitId String
  kind   String
  serie  Int
  last   BigInt @default(0)
  updatedAt DateTime @updatedAt
  @@id([userId, unitId, kind, serie])
  @@map("fiscal_document_sequences")
}
```

### Porta

```ts
export type DfeKind = 'NFSE' | 'NFE';
export type DfeAmbiente = 'producao' | 'homologacao';
export interface DfeCapabilities { numbersDps: boolean; consultar: boolean; cancelar: boolean; webhook: boolean }
export interface EmitirInput { kind: DfeKind; ref: string; ambiente: DfeAmbiente; cnpjEmitente: string; partnerAccountRef: string | null; payload: DpsPayload | NfePayload }
export type EmissaoResult = {
  status: 'PROCESSING' | 'AUTHORIZED' | 'REJECTED';
  partnerRef: string; numero?: string; serie?: string; nNFSe?: string; chaveOuCodigo?: string;
  valores?: { vIssCents?: string; aliqIssBp?: number; vIbsCents?: string; vCbsCents?: string; baseIssCents?: string }; // strings = BigInt-safe
  xml?: Buffer; pdf?: Buffer; errors: Array<{ code: string; message: string }>;
};
export type CancelResult = { status: 'CANCELLED' | 'OUT_OF_WINDOW' | 'REJECTED' | 'PROCESSING'; errors: Array<{ code: string; message: string }> };
export interface DfeEmissorPort {
  readonly name: string;
  readonly capabilities: DfeCapabilities;
  emitir(input: EmitirInput): Promise<EmissaoResult>;
  consultar(partnerRef: string): Promise<EmissaoResult>;
  cancelar(partnerRef: string, motivo: { cMotivo: 1 | 2 | 9; xMotivo: string }): Promise<CancelResult>;
  verifyWebhook(headers: Record<string, string | undefined>, rawBody: Buffer): { ok: true; partnerRef: string } | { ok: false };
}
```

### Zod — `DpsPayloadSchema` (transcrição de §1; tudo `.strict()`; dinheiro como string "0.00")

```ts
const Money = z.string().regex(/^\d{1,15}\.\d{2}$/);           // 1-15V2
const Pct2 = z.string().regex(/^\d{1,2}\.\d{2}$/);              // 1-2V2
const Ibge7 = z.string().regex(/^\d{7}$/);
export const DpsPayloadSchema = z.object({
  versao: z.literal('1.01'),
  infDPS: z.object({
    id: z.string().regex(/^DPS\d{42}$/),                         // [102] "DPS"+cMun7+tpInsc1+insc14+serie5+nDPS15
    tpAmb: z.union([z.literal(1), z.literal(2)]),                // [103]
    dhEmi: z.string().datetime({ offset: true }),                // [104]
    verAplic: z.string().min(1).max(20),                         // [105]
    serie: z.number().int().min(1).max(49999),                   // [106] E0010
    nDPS: z.number().int().min(1).max(999999999999999),          // [107]
    dCompet: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),            // [108] = sale.date; refine dCompet <= dhEmi (E0015)
    tpEmit: z.literal(1),                                        // [109]
    cLocEmi: Ibge7,                                              // [112]
    prest: z.object({
      CNPJ: z.string().regex(CNPJ_REGEX),                        // [118] alfanumérico #280
      IM: z.string().max(15).optional(),                         // [123]
      xNome: z.string().max(150).optional(),                     // [124]
      regTrib: z.object({
        opSimpNac: z.union([z.literal(1), z.literal(3)]),        // [140] MEI (2) fora do MVP
        regApTribSN: z.number().int().min(1).max(3).optional(),  // [141]
        regEspTrib: z.number().int().min(0).max(9),              // [142]
      }).strict(),
    }).strict(),
    toma: z.object({                                             // [143] sempre presente (F-DFE-7 b)
      CNPJ: z.string().regex(CNPJ_REGEX).optional(),
      CPF: z.string().regex(CPF_REGEX).optional(),               // + DV no serviço (item 31)
      xNome: z.string().min(1).max(150),
      end: z.object({ endNac: z.object({ cMun: Ibge7, CEP: z.string().regex(/^\d{8}$/) }).strict(), xLgr: z.string().min(1).max(255), nro: z.string().min(1).max(60), xCpl: z.string().max(156).optional(), xBairro: z.string().min(1).max(60) }).strict().optional(), // F-DFE-14; obrigatório se tpRetISSQN=2 (E0237)
    }).strict().refine(t => !!t.CNPJ !== !!t.CPF, 'CNPJ xor CPF'),
    serv: z.object({
      locPrest: z.object({ cLocPrestacao: Ibge7 }).strict(),     // [192]
      cServ: z.object({
        cTribNac: z.string().regex(/^\d{6}$/),                   // [195] + refine ∈ lista transcrita
        cTribMun: z.string().regex(/^\d{3}$/).optional(),        // [196]
        xDescServ: z.string().min(1).max(1000),                  // [197]
        cNBS: z.string().regex(/^\d{9}$/).optional(),            // [198]
        cIntContrib: z.string().max(20).optional(),              // [199]
      }).strict(),
      infoCompl: z.object({ xInfComp: z.string().max(2000).optional() }).strict().optional(),
    }).strict(),
    valores: z.object({
      vServPrest: z.object({ vServ: Money }).strict(),           // [250]
      vDescCondIncond: z.object({ vDescIncond: Money.optional(), vDescCond: Money.optional() }).strict().optional(), // F-DFE-15
      trib: z.object({
        tribMun: z.object({
          tribISSQN: z.literal(1),                               // [301]
          tpRetISSQN: z.union([z.literal(1), z.literal(2)]),     // [311]
          pAliq: Pct2.optional(),                                // [312] ≤ 5.00 (E0595)
        }).strict(),
        totTrib: z.union([                                       // [325] choice 1-1
          z.object({ pTotTrib: z.object({ pTotTribFed: Pct2, pTotTribEst: Pct2, pTotTribMun: Pct2 }).strict() }).strict(),
          z.object({ pTotTribSN: Pct2 }).strict(),               // só SIMPLES (E0713)
        ]),
      }).strict(),
    }).strict(),
    IBSCBS: z.object({                                           // [336] opcional
      finNFSe: z.literal(0), cIndOp: z.string().regex(/^\d{6}$/), indDest: z.literal(0),
      valores: z.object({ trib: z.object({ gIBSCBS: z.object({ CST: z.string().regex(/^\d{3}$/), cClassTrib: z.string().regex(/^\d{6}$/) }).strict() }).strict() }).strict(),
    }).strict().optional(),
  }).strict(),
}).strict();
```

### Zod — entradas HTTP

```ts
export const EmitFiscalDocumentSchema = z.object({ unitId: z.string().min(1), saleId: z.string().min(1), kind: z.enum(['NFSE', 'NFE']) }).strict();
export const CancelFiscalDocumentSchema = z.object({ unitId: z.string().min(1), cMotivo: z.union([z.literal(1), z.literal(2), z.literal(9)]), xMotivo: z.string().min(15).max(255) }).strict();
export const FiscalDocumentListQuerySchema = z.object({ unitId: z.string().min(1), saleId: z.string().optional(), status: z.enum(['SENT','PROCESSING','AUTHORIZED','REJECTED','CANCELLED']).optional(), pendencias: queryBoolean().optional() }).strict();
export const UpsertServiceFiscalProfileSchema = z.object({ unitId: z.string().min(1), cTribNac: z.string().regex(/^\d{6}$/), cTribMun: z.string().regex(/^\d{3}$/).nullable().optional(), cNBS: z.string().regex(/^\d{9}$/).nullable().optional(), cIndOp: z.string().regex(/^\d{6}$/).default('030101'), cLocPrestacao: z.string().regex(/^\d{7}$/).nullable().optional(), xDescServ: z.string().max(1000).nullable().optional() }).strict();
```

### Saídas

```ts
// GET /api/nfe/dfe/status
{ enabled: boolean; partner: string | null; ambiente: DfeAmbiente | null; reason?: string; capabilities?: DfeCapabilities }
// POST /api/nfe/dfe/preview
{ ok: boolean; faltantes: string[]; competenciaAlerta: boolean; payload?: DpsPayload; tieOut: { vServCents: string; ledgerCents: string; matches: boolean } }
// FiscalDocumentView
{ id, kind, status, saleId, anchorEntryId, ambiente, partner, partnerRef, serie, numero: string|null, nNFSe, chaveOuCodigo, dCompet, vServCents: string, tpRetISSQN, vIssCents: string|null, vIbsCents, vCbsCents, currentAttemptNo, authorizedAt, cancelledAt, errors: {code,message}[], sourceDocumentId, pendencias: string[], attempts: { attemptNo, ref, sentAt, resultStatus }[] }
```

---

## 4. Forks NOVOS — ✅ RATIFICADOS 2026-09-17 (texto original mantido como registro; decisões e efeitos no fim da seção)

Os forks F-DFE-1..11 do ADR estão ratificados e **não** são reabertos. Os abaixo nascem da leitura da fonte
primária e das duas decisões de §0.

### F-DFE-12 — Webhook atrás da porta, sem parceiro
- **(a) Rota pública + `verifyWebhook` na porta agora**; `Null`/`File` devolvem `{ok:false}` ⇒ 401 sempre;
  teste-guarda de assinatura inválida entra neste BRIEF. O adaptador futuro só implementa o método.
- (b) Diferir a rota inteira para o BRIEF do adaptador (D5) — a `publicApiRoutes` só muda quando houver quem
  assine.
- **Recomendação: (a).** F-DFE-5 (c) já foi ratificada "com risco aceito por escrito"; abrir a rota sem
  ninguém que a valide é surface pública morta, mas com 401-sempre e teste-guarda o custo é zero e o adaptador
  não precisa tocar `auth.ts` (que é o arquivo do RISK-SEC-AUTH-001). Custo de errar (b): o BRIEF do adaptador
  reabre o middleware de auth.

### F-DFE-13 — NF-e 55 sem fonte primária de saída no corpus
- **(a) Fatiar: PRs NFS-e (Fases 0–D, F) fecham e mergeiam; Fase E abre como PR(s) próprio(s) depois da
  transcrição do MOC 7.0 (saída) entrar no corpus** — mesmo BRIEF, mesma porta, `kind` já genérico. O item 13
  do fiscal só conta quando E fechar.
- (b) Bloquear tudo até a transcrição — respeita "o ciclo é um só" ao pé da letra; atrasa 01/10.
- (c) Transcrever o MOC dentro da própria `sessao-feature` — mistura planejamento e código.
- **Recomendação: (a).** O ADR §10 já diz "o BRIEF ordena os comportamentos NFS-e antes dos NF-e"; (a) é
  isso com PRs. Custo de errar (b): perde o prazo da NFS-e por um insumo que a NF-e (01/12) não precisa agora.

### F-DFE-14 — Endereço do tomador (`toma/end`, OCOR 0-1)
- **(a) Omitir por default**; obrigatório só quando `tpRetISSQN = 2` (E0237) — aí exige-se `customers.street/
  addressNumber/neighborhood/zipCode` + `cMun` resolvido por **lookup do Anexo A** (`NFSe-ANEXO-A-municipios`
  → const transcrita `(UF, nome normalizado) → IBGE`; ambíguo/ausente ⇒ 400 nomeado).
- (b) Sempre enviar endereço (mesma lookup) — mais rejeições E0188-família por cadastro sujo de cliente.
- (c) Campo `codMunIbge` no preset `customers` — viola §2.1 (dado fiscal no preset), F-DFE-6 já rejeitou a classe.
- **Recomendação: (a).** O leiaute prova que é opcional; o salão vende a PF sem retenção. Custo de errar (a):
  nenhum fiscal — se o município exigir para cancelamento (E0824 é "tomador identificado", não "endereço"), o
  CPF/CNPJ já está lá.

### F-DFE-15 — Desconto de header na DPS
- **(a) `vServ` = crédito 3.1 (já líquido do desconto rateado), sem `vDescIncond`** — `Σ documento == razão`
  por construção; a BC do ISS é a mesma (`vBC = vServ − descIncond`).
- (b) `vServ` bruto (Σ linhas de serviço em reais → centavos) + `vDescIncond` = diferença para o crédito 3.1 —
  espelha a venda como o cliente viu; reintroduz float→centavos fora do mapper e resíduo próprio.
- **Recomendação: (a).** É a F-DFE-11 (a) levada até o campo. Custo de errar (b): 1 centavo de divergência
  sistemática (parecer §1.1) e re-inlinar a técnica canônica.

### F-DFE-16 — Venda com serviços de `cTribNac` distintos (DPS é mono-serviço: `cServ` 1-1)
- **(a) MVP: 400 nomeado** "serviços de códigos distintos na mesma venda — emita por código" + registro no
  GAP-MAP; o salão típico (6.01 + 6.02 na mesma venda: corte + depilação) **cai aqui** — é o caso real, não
  edge.
- (b) **N DPS por venda**, uma por `cTribNac`, cada uma com `vServ` = parcela do crédito 3.1 rateada por peso
  das linhas (técnica canônica, resíduo na última), `@@unique` passa a `[…, saleKey, kind, cTribNac]`, tie-out
  `Σ vServ das N == crédito 3.1`. Mais colunas, mais testes, cobre o salão.
- (c) Agrupar tudo sob o `cTribNac` majoritário — errado fiscalmente (código de serviço mente).
- **Recomendação: (b).** Preferência registrada do dono: completude, não MVP; (a) bloqueia a venda mais comum
  do molde. Custo de errar (b): complexidade de N documentos por venda; mitigado porque `kind`+`cTribNac` é só
  mais uma dimensão da mesma máquina.

### F-DFE-17 — Preset `units.cnpj` rejeita CNPJ alfanumérico (verificado `ValidationUtils.ts:37`)
- **(a) Corrigir neste BRIEF**: `ValidationUtils.isValidCnpj`/`isValidCpf` delegam a `lib/cnpj.ts`
  (`isValidCnpj` alfanumérico + DV; `isValidCpf` nova com DV) — blast radius: todo preset com `format:
  'cnpj'|'cpf'` (`units`, `customers.taxId`?, `suppliers`, `crmAccounts`); DV passa a ser exigido onde hoje só
  contava dígitos (cadastros existentes com DV inválido param de **editar**).
- (b) Registrar como lacuna (`sessao-instrumentacao` → `correcao`) fora deste BRIEF; a emissão valida o CNPJ
  no serviço (item 31) e o preset continua permissivo/errado.
- **Recomendação: (a) com migração de dado zero e teste que mede o `dev.db` real** (quantos `taxId`/`cnpj`
  atuais falhariam no DV — se > 0, vira (b) + aviso). O ADR §9.2 item 10 já pôs o teste no BRIEF; (b) deixa a
  invariante de emissão dependendo de um cadastro que o preset aceita errado. Custo de errar (a): cliente com
  CPF digitado errado não consegue salvar até corrigir — comportamento desejado, mas visível.

### F-DFE-18 — Marca da nota cancelada na proveniência
- **(a) Wirear o soft-delete do `SourceDocument`** (`deletedAt` reservado, `:813` "NENHUM path de delete é
  wired") via método novo `PostingService.retireSourceDocument(scope, sourceDocumentId, reason)` — audit
  `entry.source_retired`; drill-down/`NUM_ARQ` param de apontar para a nota morta.
- (b) Marca em `description`/`rawJson` (`"CANCELADA <data> — <motivo>"`) — sem tocar o seam; a proveniência
  continua "viva" para quem filtra por `deletedAt`.
- **Recomendação: (a).** É o único caminho que faz a nota morta sumir das listagens sem `if` em cada consumidor.
  Custo de errar (a): toca `PostingService` (seam canônico) — mudança pequena e com teste; (b) espalha regra de
  apresentação.

### F-DFE-19 — XML/PDF de rejeição, homologação e pacote (sem lançamento âncora ⇒ sem `DocumentAttachment`)
- **(a) Ficam em `FiscalDocumentAttempt.resultJson` (texto) + `DFE_FILE_DIR/<ambiente>/<kind>/<ref>.*`** via o
  mesmo `attachmentStorage.saveFile` (chave própria), sem linha em `document_attachments`. `DocumentAttachment`
  só no `AUTHORIZED` de produção.
- (b) Generalizar `DocumentAttachment` (tirar a FK a `JournalEntry`) — rebuild de tabela em SQLite, blast
  radius INCR-5 inteiro.
- **Recomendação: (a).** O ADR §9.2 item 8 diz "o ADR não promete o que o schema não dá". Custo de errar (a):
  arquivo de rejeição fora da trilha de anexos — aceitável, é evidência operacional, não fiscal.

### RATIFICAÇÃO — 2026-09-17 (dono, `AskUserQuestion`, 2 lotes de 4)

| Fork | Decisão | Contra a recomendação? | Efeito no checklist / contratos (emenda — vale sobre o texto acima) |
|---|---|---|---|
| **F-DFE-12** | **(a)** rota pública + `verifyWebhook` agora | não | item 28 abre; `Null`/`File` ⇒ 401 sempre, teste-guarda no PR-3 |
| **F-DFE-13** | **(a)** fatiar — NFS-e primeiro, Fase E em PR próprio após o MOC 7.0 (saída) entrar no corpus | não | PR-1..3 fecham sem a Fase E; item 13 do fiscal conta só com E; §8 vale como está |
| **F-DFE-14** | **(a)** omitir `toma/end`; exigir só com `tpRetISSQN = 2` | não | item 14 (v) inalterado; lookup do Anexo A (`(UF, nome normalizado) → IBGE`, const transcrita) entra **só** no ramo `issRetidoTomadorPj=true` |
| **F-DFE-15** | **(a)** `vServ` = crédito 3.1 líquido, sem `vDescIncond` | não | item 16 fecha; `vDescIncondCents` fica `0` (coluna reservada) |
| **F-DFE-16** | **(b)** **N DPS por venda, uma por `cTribNac`** | não | **Emenda:** `FiscalDocument` ganha `cTribNac String @default("")` (`""` para `NFE` — não null, senão o unique do SQLite não morde); `@@unique([userId, unitId, saleKey, kind, cTribNac])`; item 16: `vServCents` por documento = parcela do crédito 3.1 rateada pelo peso das linhas de serviço daquele código (técnica canônica extraída de `revenueSplit.ts` — `splitCents(total, weights)` — resíduo na **última**), invariante `Σ vServCents dos N == crédito 3.1` exato; item 14 (vi) passa a "nenhum documento vivo para (venda, kind, cTribNac)"; `POST …/documents` emite **todos** os códigos da venda numa chamada (uma tx por documento, ordem determinística por `cTribNac`); item 25: N `SourceDocument` (um por documento, `externalRef` distintos — a idempotência por `externalRef` do seam cobre); item 30 pendência por documento; item 37 (NF-e) herda: fecho `Σ_N vServ + Σ vProd == totalCents − Package` |
| **F-DFE-17** | **(a)** corrigir `ValidationUtils.isValidCnpj`/`isValidCpf` delegando a `lib/cnpj.ts` | não | item 31 abre inteiro; **pré-passo obrigatório:** medir no `dev.db` real (`server/prisma/prisma/dev.db`) quantos `customers.taxId`/`units.cnpj`/`suppliers`/`crmAccounts` falham no DV — resultado colado no PR; se > 0, PR traz aviso nomeado e o dono decide o tratamento (nova pergunta, não silêncio) |
| **F-DFE-18** | **(a)** soft-delete do `SourceDocument` wired | não | `PostingService.retireSourceDocument(scope, sourceDocumentId, reason)` + `entry.source_retired` na allowlist (item 40 ganha o evento); `findSourcesByEntry` passa a filtrar `deletedAt IS NULL` por default (verificar consumidores: drill-down C4, `NUM_ARQ` futuro) |
| **F-DFE-19** | **(b) generalizar `DocumentAttachment`** | **SIM** | **Emenda:** migração **com rebuild de tabela** (SQLite não altera FK): `document_attachments` perde a FK `journalEntry` → `targetType` ∈ {`JOURNAL_ENTRY`, `FISCAL_DOCUMENT`} (+ `FISCAL_DOCUMENT_ATTEMPT` para XML de rejeição por tentativa), `targetId` plain string validado **no serviço** por `targetType` (existência no escopo). Prólogo `IF EXISTS` + cópia + rename (classe `migracao-sqlite-nao-e-transacional`); `smoke:migration` sobre cópia do `dev.db` real é **gate não-vacuoso** (tabela com dado: INCR-5). Blast radius a verificar por leitura: `DocumentAttachmentService.ts`/`IDocumentAttachmentRepository.ts`/`DocumentAttachmentRepository.ts` + `attachmentStorage` (INCR-5), a relação `JournalEntry.attachments @relation("JournalEntryAttachments")` (`schema.prisma:538,590`) — some do modelo (o drill-down por lançamento passa a consultar por `targetType + targetId`), o `onDelete: Cascade` (apagar lançamento apagava anexo — passa a ser regra de serviço). Item 25 (1): **uma** linha `DocumentAttachment` por arquivo, `targetType = FISCAL_DOCUMENT`; `SourceDocument.attachmentId` aponta para ela, e o drill-down do lançamento chega ao XML/PDF pela proveniência (sem segunda linha apontando para o entry — duplicar metadado do mesmo `storageKey` é proibido). Homologação/rejeição anexam ao documento (`FISCAL_DOCUMENT`) ou à tentativa (`FISCAL_DOCUMENT_ATTEMPT`); pacote `VENDA` anexa ao documento. `DFE_FILE_DIR` continua só para o `FileEmissor` (payload a enviar), não para retorno. Risco aceito por escrito pelo dono: rebuild de tabela com dado real + toque no INCR-5 |

**Fatiamento após a ratificação (atualiza §8):** F-DFE-19 (b) e F-DFE-17 (a) entram no **PR-1** (são schema/validação: rebuild de `document_attachments`, colunas `cTribNac`, preset DV) porque o smoke de migração precisa correr uma vez com tudo; PR-2/PR-3 como estavam; Fase E = PR-4+ após o insumo 1 de §6.

---

## 5. Pendente de validação externa (regra de domínio — fonte citada, grau declarado)

| # | Regra | Fonte | Grau / o que falta |
|---|---|---|---|
| p1 | Serviços do salão = subitens **6.01** (`060101`) e **6.02** (`060201`); ISS devido no **estabelecimento do prestador** (EP) | Anexo I `MUN.INCID_INFO.SERV.` l.73-74 (**primária, no corpus**); LC 116 art. 3º (`LC-116-2003.html` no corpus) | **verificado** no leiaute; o contador confirma o enquadramento **do cliente** (5a) — vira valor de `cTribNac` por serviço, não código |
| p2 | Alíquota do ISS: fornecida pelo sistema em município conveniado ativo; do emitente só se não conveniado, ≤ 5% | RN E0617/E0618/E0595 (**primária**) | **verificado**; `issAliquotaBp` só para município não conveniado — contador informa se o município do 1º cliente é conveniado (5a) |
| p3 | ISS retido pelo tomador PJ — quando | LC 116 art. 6º [corpus]; RN E0204/E0237 | regra legal **[NC]** (não lida nesta sessão); default `false` (5b) |
| p4 | Pacote pré-pago: fato gerador na prestação | [secundária] — parecer §1.5 | **[NC]**; default `CONSUMO` (5c), ramo `VENDA` implementado |
| p5 | IBS/CBS 2026: destaque na DPS sem recolhimento; valores calculados pelo ADN | LC 214/2025 art. 348 [secundária]; RN E0850 + leiaute (grupo sem valores) (**primária**) | mecânica **verificada**; obrigatoriedade para não-optante em 2026 **[NC]** — default `true` (5d); `CST`/`cClassTrib` **sem tabela no corpus** (§6) |
| p6 | Simples: `opSimpNac=3`, `regApTribSN`, `pTotTribSN`; IBSCBS só 2027; MEI restrito | Leiaute [140-141,335-336] + RN 508-511, E0712, E1302 (**primária**) | mecânica **verificada**; valor de `regApTribSN` do cliente e emissão facultativa antes de 01/01/2027 (Ato 4 §1º, PDF fora do repo) — contador (5e) |
| p7 | Competência = data da prestação; emissão em mês seguinte × PNCT | Leiaute [108] nota (**primária**); Ato nº 5 (PNCT) **não lido** | metade verificada; consequência PNCT **assumida** — default `AVISAR` (5f) |
| p8 | `totTrib` (Lei 12.741) obrigatório; percentuais IBPT por NBS/município | Leiaute [325-335] + E0713 (**primária**); tabela IBPT fora do corpus | mecânica **verificada**; **valores** — contador/IBPT (**item novo** para o pedido, §7 achado 3) |
| p9 | Cancelamento: evento `e101101`, prazo parametrizado pelo município | Anexo II l.21-24, RN E0822 (**primária**) | **verificado**; prazo concreto do município do cliente — parceiro/município (D5) |
| p10 | NF-e 55 de saída: leiaute, CFOP 5.102/5.405, gapless + inutilização, IBSCBS NT 2025.002 | MOC 7.0 Anexo I + NT 2025.002 — **não no corpus** | **[NC]** inteiro — Fase E |
| p11 | e-CNPJ da matriz vale para filiais (ADR R8 item 4) | RFB [secundária] | **[NC]**; irrelevante atrás da porta (certificado é do parceiro) — cai no BRIEF do adaptador |

## 6. Insumos ausentes

1. **MOC 7.0 Anexo I (saída) + NT 2025.002 v1.40** — não estão em `fontes-oficiais/` (o corpus tem só os
   anexos da NFS-e); `BE-INCR-NFE-layout-transcription.md` cobre as tags do **parser** de entrada. Bloqueia a
   Fase E (F-DFE-13). Baixar por `scripts/baixar-fontes-oficiais.mjs` (lição: ler a 1ª página para provar
   identidade — memória `corpus-fontes-oficiais-local`).
2. **Tabela `cClassTrib`/CST IBS-CBS** (NT/ADN) — Anexo C traz só `cIndOp`. Sem ela `ibsCbsCst`/`ibsCbsClassTrib`
   ficam nulos e `ibsCbsInformar=true` ⇒ perfil incompleto; o operador/contador preenche (item 1b do pedido).
3. **Ato Conjunto RFB/CGIBS nº 5/2026 (PNCT)** — PDF não no repo; só afeta o texto do aviso (5f).
4. **Tabela IBPT** (Lei 12.741) — percentuais `pTotTrib*`; configuráveis, valores do contador.
5. **`dev.db` real:** medir `customers.taxId`/`units.cnpj` com DV inválido antes de F-DFE-17 (a).

## 7. Achados fora de escopo

1. **`ValidationUtils.isValidCnpj`/`isValidCpf` do preset não validam DV e removem letras** (`:15-50`) —
   afeta `units`, `customers`, `suppliers`, `crmAccounts` independentemente da emissão; #280 corrigiu `lib/cnpj.ts`
   e os DTOs SPED, não o preset. Tratado como F-DFE-17 porque o ADR §9.2 item 10 pôs o teste neste BRIEF; se
   o dono escolher (b), vira lacuna do GAP-MAP.
2. **Grafo 14/09 e PROXIMOS-PASSOS 17/09 marcam D-NFSE como aberto ("dono baixa")**, mas o corpus local tem
   os 3 manuais + Anexos I/II/A/B/C + XSD desde 10/09 (`MANIFEST.md:21-29`). Fold: D-NFSE ✅; a cadeia crítica
   de emissão passa a ser `D5 · M2` (+ D1f **desacoplado** por D-X10b-2).
3. **Pedido ao contador ganha 3 linhas** (não enviadas ainda — #331): (i) percentuais IBPT `pTotTrib*` por
   serviço/município (Lei 12.741; obrigatório para não-optante — E0713); (ii) `CST` + `cClassTrib` IBS/CBS
   para serviço 6.01/6.02 em 2026 (o item 1b pergunta `cClassTrib` da NF-e — a NFS-e é outra tabela);
   (iii) `cNBS` dos serviços (Anexo B: cabeleireiros `1.2602.10.00`; esteticistas — a confirmar).
4. **`FE-INCR-DFE`** (botão na venda, tela de documentos, aviso de competência, pendências) — BRIEF próprio;
   este BE já devolve `faltantes`/`pendencias`/`competenciaAlerta` prontos para a tela.
5. **`AccountingSyncScheduler` é mono-job** (`JOB` const) — segunda instância para `dfe_poll_pending` pede
   parametrização; não é deste BRIEF generalizar, só instanciar.
6. **`cIntContrib` tem 20 posições** e o cuid tem 25 — o `ref` da tentativa não cabe; usar `nDPS` ou hash
   (D1 do implementador), registrado para o adaptador futuro não assumir `ref === cIntContrib`.

---

## 8. Plano de execução por fatias (para a `sessao-feature`, precedente C6b #336)

- **PR-1 (Fase 0 + A):** migração aditiva (FiscalProfile ADD COLUMN, 4 tabelas novas), repos, policy, factory,
  DTOs, rotas do perfil de serviço, audit, `lc116ListaNacional.ts` + `indOp.ts` transcritos. `smoke:migration`.
- **PR-2 (Fase B + C):** porta, `Null`/`File`/`Disabled`, montagem da DPS, `DpsPayloadSchema`, preview,
  emitir (`SENT` + tentativa + sequência), rotas de documento. Fixture mista com desconto que não divide.
- **PR-3 (Fase D):** transições, proveniência (F-DFE-18/19), reenvio, cancelamento, job de polling, webhook
  (F-DFE-12), pendências. Emenda do ADR + folds (item 42).
- **PR-4+ (Fase E, F-DFE-13 a):** após transcrição do MOC no corpus — NF-e 55, gapless + inutilização.
- Review independente em worktree a cada PR; `luminaris-accounting-architect` lê o PR-2 (tie-out) e o PR-3
  (proveniência) antes do merge.

## 9. Gates de envio [OPS-001]

1. **Objetivo:** o dono pediu "executa X10b atrás da porta com D1f no FiscalProfile" — este BRIEF é o artefato
   que a `sessao-feature` exige (§2 checklist de 42 itens, §3 contratos, §4 forks), com a porta sem parceiro
   (§0 D-X10b-1) e os 6 itens do contador como config com ambos os ramos (§0 D-X10b-2). Código não foi
   escrito (regra 1 da sessão).
2. **Grau:** o leiaute da DPS e as RNs citadas são **verificados** no corpus (Anexo I/II/B/C, linhas
   numeradas); o código citado foi lido (`arquivo:linha`); regras legais sem norma lida estão **[NC]** em §5;
   obrigatoriedade do IBSCBS para não-optante em 2026 é **assumida** (default configurável).
3. **Caso adversarial tentado:** (a) "o BRIEF pode assumir `vIbsCents`/`vCbsCents` da montagem, como o ADR
   §9.2 item 1 sugere" — o leiaute [404-415] mostra `gIBSCBS` só com CST/`cClassTrib`: os valores **não**
   existem na DPS, só no retorno ⇒ colunas viram "do retorno"; (b) "tomador é obrigatório no fisco" — `toma`
   é 0-1 [143] ⇒ F-DFE-7 (b) é escolha do dono, registrada como tal; (c) "uma DPS por venda basta" — `cServ`
   é 1-1 [193] ⇒ corte + depilação (6.01 + 6.02) quebra o MVP ⇒ F-DFE-16; (d) "o preset já valida CNPJ
   alfanumérico após #280" — `ValidationUtils.ts:37` faz `replace(/\D/g,'')` ⇒ falha por construção ⇒ F-DFE-17.
4. **Checagem que teria falhado se eu estivesse errado:** `ls docs/accounting | grep -i dfe` vazio em 31
   worktrees provou que não havia BRIEF (se houvesse, esta sessão seria `sessao-feature`); `grep -n
   "FiscalDocument\|DfeEmissorPort" server/src` = 0 provou que tudo é novo; a leitura de
   `MUN.INCID_INFO.SERV.` l.73-78 com `X` na coluna EP teria mostrado `LP`/`ET` se a incidência do grupo 6
   fosse outra.
5. **Risco principal e viés:** o **NF-e 55** (metade do escopo por F-DFE-1 b) está inteiro em
   `[pendente-insumo]` — este BRIEF é completo para a NFS-e e um esqueleto para a NF-e; o viés desta sessão
   é favorecer a onda do prazo (01/10) e tratar a NF-e como fatia posterior (F-DFE-13 a). Segundo risco:
   "configurável" para 5a–5f dobra os ramos a testar (pacote `VENDA`, retenção com endereço) — o custo é
   nomeado em §0, não escondido.
