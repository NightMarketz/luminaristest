# BRIEF — BE-INCR-NFCE (NFC-e modelo 65 + NF-e 55 própria atrás da porta, seleção por tipo) — nó X10a

> Produzido em `sessao-planejamento` (2026-10-02), nó [`X10a`](../plano/nos/X10a.md), Fase F do
> [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md). Base:
> [`ADR-INCR-DFE-EMISSAO-PARCEIRO`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) (§3, §9, §10, §11),
> [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](MAPA-COBERTURA-EMISSAO-2026-10-02.md), o próprio plano.
> **Este documento NÃO escreve código** — checklist + contratos esboçados + forks. **Forks F-NFCE-1..12: ✅
> RATIFICADOS 2026-10-02** pelo dono, por questionário (3 lotes); **F-NFCE-3, F-NFCE-7 e F-NFCE-12 contra a
> recomendação** — registro e efeitos no fim da §5 e em
> [`D-2026-10-02-X10A-NFCE-FORKS`](../plano/decisoes/D-2026-10-02-X10A-NFCE-FORKS.md). **Sub-fork F-NFCE-12b:
> ✅ RATIFICADO 2026-10-02 → (b) todos os subgrupos do UB, contra a recomendação.** Nenhum fork pendente. A
> `sessao-feature` só abre com "executa" do dono.
>
> **Em duas linhas:** tudo o que não depende da conta Focus (D5) cabe aqui — seleção do adaptador por `kind`,
> `NFCE` na porta, perfil fiscal do produto, IE do emitente, montagem do leiaute 55/65 validada localmente,
> numeração + inutilização, cancelamento/CC-e da NF-e/NFC-e — e é exercitável com o `NullEmissor`.
> **Risco principal:** o "conserto" do `icmsContribuinte` pedido no GAP-MAP, feito ao pé da letra, faz a **compra**
> do Simples creditar ICMS (`nfeCost.ts:140`) — o campo significa crédito, não inscrição (§1, F-NFCE-2).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X10a`](../plano/nos/X10a.md) — "Adaptador por TIPO de documento fiscal". Escopo
  nomeado pelo dono (02/10): seleção do emissor por `kind` (`selectDfeEmissor.ts:23-43` ignora o `kind`),
  `ProductFiscalProfile`, inutilização, transcrição do leiaute 65, eventos da NF-e/NFC-e (fronteira com o X11),
  conserto do `icmsContribuinte` forçado a `false` no Simples (GAP-MAP Nível 5, `GAP-MAP.md:117`).
- **Autorização (ORCH-006):** dono em chat, **2026-10-02**: *"Autorizo planejar o BRIEF do X10a — NFC-e modelo 65 +
  NF-e própria (dono, 02/10) — só o BRIEF, sem 'executa'. O D5 (conta Focus) ainda não existe: planeje tudo que não
  depende dele e deixe o contrato do adaptador Focus como lacuna marcada (fork/pré-condição), sem inventar payload."*
  Campo `autorizacao` da nota: *"resposta 9 (10/09) — requisito, sem 'executa'"*. F-PLAN-2 (a) ratificado 27/09
  ("NFC-e na porta, via parceiro, com roteamento por tipo — BRIEF próprio no X10a, depois da dúvida D-2"); D-2
  resolvida 29/09 (decisão 6 de [`D-2026-09-29`](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md)).
  **Cobre:** este BRIEF (backend). **Não cobre:** código; o adaptador da Focus (passo E.3 do plano, BRIEF
  `BE-INCR-DFE-FOCUS` no nó [`X10i`](../plano/nos/X10i.md)); a tela (FE, nó vizinho inexistente — §8).
  Divergência de escopo conferida: nenhuma — o pedido cobre exatamente o nó.
- **1º cliente** (decisão de 29/09): Simples Nacional, São Paulo capital, **com IE**, vende produto no balcão.
- **Downloads autorizados nesta sessão** (dono, questionário 02/10, *"Baixar os 3"*): MOC 7.0 Visão Geral e Anexo I
  (sha256 igual ao do MANIFEST de 26/09) e Portaria SRE 79/2024 (SP). Registro no `MANIFEST.md`.

### Insumos lidos nesta sessão (arquivo:linha — grau V salvo indicação)

| Insumo | O que diz |
|---|---|
| `dfe/selectDfeEmissor.ts:23-43` | seleção só por `DFE_PARTNER` + `DFE_PARTNER_ENV`; `partner ∉ {null, manual}` ⇒ porta desabilitada. **Não recebe `kind`** |
| `dfe/resolveEmissor.ts:16-23` | adaptador do **documento** (`FiscalDocument.partner`), do #405 — base reaproveitável |
| `dfe/DfeEmissorPort.ts:13,57-62,111` | `DfeKind = 'NFSE' \| 'NFE'`; `DfeCapabilities{numbersDps,consultar,cancelar,webhook}`; `cancelar(partnerRef, {cMotivo: 1\|2\|9, xMotivo})` — forma da NFS-e (e101101) |
| `dfe/ManualEmissor.ts:9-18` | `numbersDps: true` (o portal numera); só NFS-e existe em portal público (ADR §11.1 item 4) |
| `services/FiscalDocumentEmissionService.ts:125,141,180,513` | 4 chamadas a `selectDfeEmissor(process.env)` |
| `services/FiscalDocumentEmissionService.ts:399-403` | `kind === 'NFE'` ⇒ 400 `nfe_nao_implementada` (F-DFE-13 a) |
| `services/FiscalDocumentLifecycleService.ts:114,171,314,508` | mais 4 chamadas; `:125,512` já usam `resolveEmissorFor(doc.partner)`; `:235` `cancelar(scope, id, {cMotivo, xMotivo})` |
| `dtos/FiscalProfileDto.ts:34,66-72` | `icmsContribuinte: boolean`; `SIMPLES && icmsContribuinte` ⇒ 400 citando LC 123 art. 23 |
| `prisma/schema.prisma:1326` | `icmsContribuinte Boolean @default(false) // crédito de ICMS próprio na compra para revenda (item 8)` |
| `lib/nfeCost.ts:127,140` | `creditoIcms = regime.icmsContribuinte && !insumo ? it.vICMSCents : 0` — o campo **liga o crédito de ICMS da compra** |
| `prisma/schema.prisma` `FiscalProfile` | sem IE, sem série de NF-e/NFC-e; `codMun` IBGE 7 (os 2 primeiros dígitos = cUF) |
| `prisma/schema.prisma` `ServiceFiscalProfile` | molde do perfil por linha: `serviceRef` string escopada, `@@unique([userId, unitId, serviceRef])`, soft-delete com rename |
| `prisma/schema.prisma` `FiscalDocument` / `FiscalDocumentSequence` | `kind String // NFSE \| NFE`; `cTribNac = ""` para NFE; `vServCents` = crédito 3.3 para NFE; sequência `@@id([userId, unitId, kind, serie])` — **sem ambiente** |
| `presets/modules/product/ProductModule.ts:26-37` | `products`: `name, brand, description, sku, category, usageType` — **sem NCM/CFOP/origem** |
| `presets/fields/relation/RelationPresets.ts:77-84` | `saleItems.productId` → tabela `products` |
| `sync/bridges/saleItems.ts:48,79` | `productLines: {productRef, qty}[]` já existe |
| `presets/fields/select/SelectPresets.ts:40-46` | `paymentMethod ∈ {Credit Card, Debit Card, Cash, Pix, Package Balance}` |
| `audit/auditCanonical.ts:140,160-167` | `fiscal_profile.updated` (lista campos) e `dfe.*` |
| [`BE-INCR-DFE-brief.md`](BE-INCR-DFE-brief.md) itens 32–37 | Fase E (NF-e 55) `[pendente-insumo]`; F-DFE-13 (a) fatiou; item 35 previa `FiscalNumberVoid` |
| ADR §10 | F-DFE-1 (b), F-DFE-3 (a) manual, F-DFE-7 **(b) exigir CPF/CNPJ**, F-DFE-8 (b) Simples, F-DFE-11 (a) totais do razão |
| Notas [`X11`](../plano/nos/X11.md) e [`D5`](../plano/gates/D5.md) | X11: "eventos da NF-e/NFC-e vão com o X10a"; D5: Focus escolhida, conta/contrato/A1 ausentes |

### Nós vizinhos

| Vizinho | Relação | Contrato existente |
|---|---|---|
| [`X10b`](../plano/nos/X10b.md) (done) | porta, `FiscalDocument`, sequência, job, webhook | `DfeEmissorPort.ts`, BRIEF `BE-INCR-DFE` |
| [`DFE-MANUAL`](../plano/nos/DFE-MANUAL.md) | `resolveEmissorFor` por documento; releitura | `resolveEmissor.ts`, `lib/nfseReadback.ts` |
| [`X10i`](../plano/nos/X10i.md) | consome este BRIEF: o adaptador da Focus mapeia o payload daqui | BRIEF `BE-INCR-DFE-FOCUS` (não existe — passo E.3) |
| [`X11`](../plano/nos/X11.md) | eventos da **NFS-e** (janela e101101, substituição e105102) | BRIEF irmão em PR #466 (`BE-INCR-DFE-EVENTOS`, não mergeado): §7 dá ao X10a os eventos 55/65; `janelaEventos` e F-EVT-1 reusados no item 27 / F-NFCE-10 |
| [`D5`](../plano/gates/D5.md) | contrato da Focus — **lacuna marcada** (§7) | — |
| FE (sem nó) | telas de perfil do produto, botão "Emitir NFC-e", DANFE NFC-e ao consumidor | §8 |

## Definição de pronto

Este BRIEF está pronto quando: (1) checklist numerado, cada item testável sozinho; (2) contratos em forma de
schema; (3) forks listados com caminhos + recomendação + **PENDENTE**; (4) pendências externas, insumos ausentes e
achados fora de escopo listados (mesmo vazios). Não é preciso decidir nenhum fork.

## 0. Decisões do dono que este BRIEF consome (não são forks)

| Decisão | Fonte | Efeito aqui |
|---|---|---|
| Só parceiro BYOK; Focus primeiro; Luminaris nunca guarda A1 | D-2026-09-26 decisões 1–2; ADR §3 D1, §11.1 | assinatura, QR Code, CSC, contingência, DANFE NFC-e e comunicação com a SEFAZ ficam no parceiro |
| Um adaptador por **protocolo**; UF/município são configuração | D-2026-09-26 decisão 3; ADR §11.1 item 3 | nenhum adaptador por UF; regra de SP vira dado/config |
| Adaptador do documento é o do documento | ADR §11.1 item 6; `resolveEmissor.ts` | consultar/cancelar/inutilizar resolvem por `doc.partner` |
| NFC-e na porta, via parceiro, com roteamento por tipo | F-PLAN-2 (a), 27/09 | `DfeKind` ganha `NFCE`; seleção por `kind` |
| Simples suportado | F-DFE-8 (b) | CRT=1 é o primeiro caso, não exceção |
| Totais do lançamento `sale.finalized` | F-DFE-11 (a); ADR §9.2 item 2 | `Σ` dos itens de produto == crédito **3.3**, exato |
| Tentativa imutável, `ref = <id>:<n>` | F-DFE-10 (a) | reuso integral |
| Gatilho manual | F-DFE-3 (a) | ver F-NFCE-6 (a NFC-e é tempo real) |
| Exigir CPF/CNPJ do tomador | F-DFE-7 (b) | **colide com a NFC-e de balcão** — F-NFCE-7 |
| Eventos da NF-e/NFC-e vão com o X10a | nota X11 (29/09, D-2) | §3 Fase E |

## 1. O que o código faz hoje e o que muda

1. **Seleção ignora o tipo.** `selectDfeEmissor(env)` devolve um único adaptador para qualquer `kind`. Com o 1º
   cliente, NFS-e sai pelo **modo manual** (portal nacional; decisão 29/09: é o caminho legal do Simples) e NFC-e só
   pode sair por **parceiro** (não há portal público de NFC-e — ADR §11.1 item 4). Os dois coexistem ⇒ a seleção
   tem de ser por `kind` (F-NFCE-1).
2. **`icmsContribuinte` não significa "tem IE".** O GAP-MAP (`GAP-MAP.md:117`) diz que a regra mistura "apura pelo
   regime normal" com "tem IE". O código diz outra coisa: o campo é *"crédito de ICMS próprio na compra para
   revenda"* (`schema.prisma:1326`) e liga `creditoIcms` em `nfeCost.ts:140`. Liberar `true` no Simples faria a
   compra de revenda do Simples sair com ICMS **fora do custo** — e o Simples não se apropria de crédito
   (LC 123/2006 art. 23, já citada em `FiscalProfileDto.ts:6-8`). **O que falta para a NFC-e é a IE do emitente
   (`emit/IE`, id C17) e o CRT (C21), não o crédito.** O conserto certo separa os dois (F-NFCE-2). O texto do
   GAP-MAP precisa de correção (§8 achado 1) — não editado aqui (regra 1).
3. **NF-e recusada por construção** (`EmissionService.ts:399-403`) e `NfePayload = unknown`. Nada de NFC-e.
4. **Sem dado fiscal de produto**: `products` não tem NCM, CFOP, origem, CSOSN, unidade comercial, GTIN.
5. **Cancelamento com forma de NFS-e** (`cMotivo 1|2|9`); NF-e/NFC-e cancela com `nProt` + `xJust` 15–255
   (MOC VG §5.9.1, Tabela 5-37). Não há CC-e nem inutilização na porta.
6. **Sequência sem ambiente** (GAP-MAP "numeração não separada por ambiente", ABERTO). Na NF-e/NFC-e a chave
   natural inclui o ambiente/tipo de emissão (MOC VG §2.2.7, p. 20) — homologação e produção são bases distintas.

## 2. Fontes primárias lidas (seção citada) — insumo do PR-0

Arquivos: `MOC-7.0-Visao-Geral.pdf` (sha256 `f664dcf94b77…`, 150 pp.), `MOC-7.0-Anexo-I.pdf` (`5eb4cf2010b1…`,
153 pp.), `NFe-NT-2025.002-v1.51.pdf` (`a4aaaa181522…`, lido de outra worktree, mesmo sha do MANIFEST),
`Portaria-SRE-79-2024-SP.html` (`f197f7e5a5bf…`, baixado 02/10). Chaves `[NFCE-…]` serão citadas pelos testes.

| Chave | Regra | Onde |
|---|---|---|
| `[NFCE-SUBST-SAT]` | NFC-e substitui, a critério da UF, a NF modelo 2, o cupom de ECF e o **CF-e-SAT**; autorização **antes** do fato gerador | VG §2.2.3, p. 18 |
| `[SP-SAT-VEDADO]` | "A emissão do Cupom Fiscal Eletrônico - CF-e-SAT … fica vedada a partir de 1º de janeiro de 2026" (art. 34-D da Portaria CAT 147/12, acrescentado pelo art. 1º) | Portaria SRE 79/2024 (DOE 01/11/2024) |
| `[NFE-CHAVE]` | chave 44: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1); cNF aleatório | VG §2.2.6.1, Tabela 2-1, p. 19 |
| `[NFE-CHAVE-NATURAL]` | NFC-e: UF, CNPJ, série, número, modelo, tipo de emissão; duplicidade rejeitada | VG §2.2.7, p. 20 |
| `[NFE-SERIE]` | série 000–889 = aplicativo da empresa, numeração sequencial por CNPJ **controlada pelo emitente** | VG §2.2.8, Tabela 2-4, p. 21 |
| `[NFCE-EVENTOS]` | para a NFC-e o Ajuste SINIEF 19/16 regra **só** Cancelamento e EPEC; 110110 CC-e, 110111 Cancelamento, 110112 Cancelamento por substituição (NFC-e, ≤ 168 h) | VG §3.1, Tabela 3-1, p. 28 |
| `[NFCE-CANC-SUBST]` | 110112 só quando outra NFC-e **em contingência** acobertou a operação | VG §3.5, pp. 47–48 |
| `[NFE-CANC]` | entrada: `nProt` (15), `xJust` (15–255); 110112 acrescenta `cOrgaoAutor`, `tpAutor`, `verAplic`, `chNFeRef` | VG §5.9.1, Tabela 5-37, p. 105 |
| `[NFE-CANC-PRAZO]` | 110111: rej. **501** se autorizada há mais de **24 h**, "considera a exceção de prazo definida em legislação estadual"; 110112: 168 h | VG §5.9.3, Tabela 5-38, p. 106 **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** para a **NFC-e o prazo é 30 minutos** (Ajuste SINIEF 19/16 cl. 15ª, desde 01/10/2018); as 24 h valem para a NF-e (`pesquisa-lei-2026-10-10/piscofins-icms.md`). |
| `[NFCE-CANC-FORA]` | NF-e: a SEFAZ pode aceitar fora do prazo (cStat 155); **NFC-e fora do prazo é rejeitada (501)** | VG §5.9.4, p. 107 |
| `[NFCE-SEM-CCE]` | "Se Modelo = 65: NFC-e não permite o evento de Carta de Correção" | VG §5.10.3, Tabela 5-40, p. 111 |
| `[NFE-INUT]` | `inutNFe`: tpAmb, xServ='INUTILIZAR', cUF, ano(2), CNPJ, **mod (55 ou 65)**, serie(1-3), nNFIni/nNFFin(1-9), xJust(15-255) | VG §5.3.1, Tabela 5-9, pp. 78–79 |
| `[NFE-INUT-REGRAS]` | ano ≤ atual (453); nNFIni ≤ nNFFin (224); **≤ 10.000 números** (201); faixa já pedida (563) ou já inutilizada (256); **número já usado** (241) | VG §5.3.4, Tabela 5-12, pp. 80–81 |
| `[NFCE-DEST]` | grupo `dest` "Obrigatório para a NF-e (modelo 55)" ⇒ opcional na 65; na NFC-e `indIEDest=9` sem IE | Anexo I, p. 14 (E01) e p. 15 (Nota 1) |
| `[NFCE-TEMPO-REAL]` | rej. **704** se dhEmi atrasada > 5 min da recepção; "a emissão da NFC-e deve ocorrer de forma on-line, real-time" | Anexo I, regra B09-40, p. 76 |
| `[NFCE-IDE]` | NFC-e sem dhSaiEnt (705); tpNF≠0 (706); idDest=1 (707); tpImp ∈ {4,5} (709); finNFe=1 (715); indFinal=1 (716); indPres ∈ {1,4} (717) | Anexo I, pp. 76–77 |
| `[NFCE-CONTING]` | tpEmis=9 offline só se a UF aceita (712); tpEmis 2/4/5 inválido (714); SVC não autoriza NFC-e (783) | Anexo I, pp. 76–77 |
| `[NFCE-ENTREGA]` | indPres=4 exige dest identificado (787) + endereço (788) + transportador (786); UF pode vedar (785) | Anexo I, pp. 77, 83, 124 |
| `[NFCE-HOMOLOG]` | em homologação, `xProd` do **1º item** = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" (373) | Anexo I, regra I04-10, p. 89 |
| `[NFCE-CFOP]` | NFC-e aceita só 5.101, 5.102, 5.103, 5.104, 5.115, 5.405, 5.656, 5.667 (725) | Anexo I, regra I08-150, p. 93 |
| `[NFCE-PROIBIDOS]` | sem ISUF (730), veicProd (736), arma (738), ICMSPart (741), ICMSUFDest (807), II/PIS-ST/COFINS-ST (743/746/749), transporte sem entrega (754–759), `cobr` (760) | Anexo I, pp. 87–125 |
| `[NFE-PAG]` | `pag` obrigatório na NF-e e NFC-e; `detPag` 1–100; `tPag` 01 dinheiro, 03 crédito, 04 débito, 17 PIX, 90 sem pagamento, 99 outros…; NFC-e: tPag=90 rejeitado (899), 99 sob regra 436 | Anexo I, YA01–YA03, p. 62; pp. 125–126 |
| `[NFE-VNF]` | vNF = vProd − vDesc − vICMSDeson + vST + vFCPST + vFrete + vSeg + vOutro + vII + vIPI + vIPIDevol + vServ (610); limite de valor da NFC-e e de **destinatário não identificado** parametrizável por UF (750–752, 780 — pareamento embaralhado na extração, o PR-0 confirma) | Anexo I, W16, p. 122 |
| `[NFCE-QRCODE]` | `infNFeSupl/qrCode` com chave, versão, tpAmb, **identificador do CSC** e hash (396–400, 462–464); endereço por UF (395) | Anexo I, ZX02, pp. 129–133 |
| `[RTC-SIMPLES]` | IBS/CBS: orientações para CRT 1/2/4 "em NT futura", tributação "somente a partir de 2027" (LC 214 art. 348); grupo `IBSCBS` exigido em produção para CRT 1/2/4 **a partir de 04/01/2027**; CRT 3 em produção desde 03/08/2026 | NT 2025.002 v1.51, p. 7 e p. 42 (Obs. 2 e 3) |

## 3. Checklist de comportamentos

`[direto]` = sem fork · `[cond:F-…]` = depende do fork · `[pendente-insumo]` = espera fonte/contrato.
Cada item termina no teste que o prova.

### Fase 0 — Insumo e registro (docs, sem código)

1. **[direto]** PR-0: `fontes-oficiais/TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-XX.md` — tabela do leiaute de
   **saída** dos grupos que a montagem usa (`ide`, `emit`, `dest`, `det/prod`, `det/imposto/ICMS` com `ICMSSN102`/
   `ICMSSN500` e `ICMS00`, `PIS`, `COFINS`, `total/ICMSTot`, `transp`, `pag`, `infAdic`), com id, ocorrência,
   tamanho e as regras da §2 por chave. **F-NFCE-12 (b):** inclui o grupo **UB inteiro** (`det/imposto/IBSCBS`, NT
   2025.002 v1.51 pp. 19–30, com as regras de validação do grupo) e os totais do IBS/CBS. Ponto de partida: a §2 deste BRIEF. A transcrição de entrada
   (`BE-INCR-NFE-layout-transcription.md`) **não** serve (só as tags lidas pelo parser — BRIEF X10b item 32).
2. **[direto]** Emenda do ADR (§12, docs): `NFCE` entra na porta (F-PLAN-2 a), seleção por `kind`, a regra do
   `icmsContribuinte` (resultado do F-NFCE-2), e os forks ratificados deste BRIEF.

### Fase A — Porta e seleção por tipo (sem parceiro)

3. **[direto]** `DfeKind = 'NFSE' | 'NFE' | 'NFCE'` em `DfeEmissorPort.ts`, `FISCAL_DOCUMENT_KINDS`,
   `FiscalDocumentDto` (`z.enum`) e no comentário do `schema.prisma` (coluna é `String`, sem migração).
   Teste: snapshot de shape do DTO muda só no enum.
4. **[direto]** `DfeCapabilities.kinds: readonly DfeKind[]` — cada adaptador declara os tipos que emite:
   `ManualEmissor` = `['NFSE']`; `NullEmissor` = os três (recusa produção, como hoje); `DfeDisabledEmissor` = `[]`.
   Teste: unitário por adaptador.
5. **[cond:F-NFCE-1]** `selectDfeEmissor(env, kind)`: lê `DFE_PARTNER_<KIND>` / `DFE_PARTNER_ENV_<KIND>` com
   fallback para `DFE_PARTNER` / `DFE_PARTNER_ENV`; adaptador que não declara o `kind` ⇒ desabilitado com motivo
   nomeado (`parceiro 'manual' não emite NFCE`). As 8 chamadas (`EmissionService` ×4, `LifecycleService` ×4)
   passam o `kind`; `getStatus()` devolve o estado **por tipo**. Teste: matriz env × kind (NFS-e manual + NFC-e null
   habilitados juntos; NFC-e com `DFE_PARTNER=manual` ⇒ desabilitada com o motivo).
6. **[direto]** `resolveEmissorFor(partner, kind)` recusa `kind` fora de `capabilities.kinds` com
   `dfe_adapter_kind_unsupported` (código próprio, skip+log no job — memória erro-especifico-para-skip-em-job).
7. **[direto]** `cancelar` vira união discriminada por tipo: `{kind:'NFSE', cMotivo, xMotivo}` |
   `{kind:'NFE'|'NFCE', xJust}` (`[NFE-CANC]`); adaptadores existentes recebem o ramo NFSE sem mudança de
   comportamento. Teste: `tsc` + os testes atuais do cancelamento NFS-e verdes sem edição de asserção.

### Fase B — Perfil fiscal do emitente e do produto

8. **[cond:F-NFCE-2]** Emitente: `FiscalProfile.inscricaoEstadual String?` (C17, validação de formato por UF =
   [pendente-insumo], só tamanho/caracteres no PR) e CRT **derivado** de `regimeTributario` (SIMPLES ⇒ 1;
   PRESUMIDO/REAL ⇒ 3; CRT 2 = §6). `icmsContribuinte` mantém o significado de crédito e a regra atual do DTO.
   NFC-e/NF-e sem IE ⇒ `emissao.faltantes` com `inscricaoEstadual`. `fiscal_profile.updated` ganha o campo na
   allowlist (`auditCanonical.ts:140`). Teste: Simples **com** IE emite NFC-e (Null) **e** a compra do mesmo
   perfil continua com `creditoIcms = 0` (`nfeCost`); perfil sem IE ⇒ 400 listando o campo.
9. **[direto]** Séries por tipo no `FiscalProfile`: `nfceSerie Int @default(1)` e `nfeSerie Int @default(1)`,
   faixa 0–889 (`[NFE-SERIE]`). Teste: 890 ⇒ 400.
10. **[F-NFCE-3 ✅ b]** `ProductFiscalProfile` Prisma first-class (§2.1 — invariante legal), molde do
    `ServiceFiscalProfile` **sem `unitId`**: `productRef` = id da linha `products` (string escopada, não FK),
    `@@unique([userId, productRef])` — um perfil por produto, valendo para todas as unidades; soft-delete com rename.
    `csosn` e `cstIcms` convivem no mesmo perfil; a montagem escolhe pelo CRT do **perfil da unidade emitente**
    (CRT 1 ⇒ `csosn` obrigatório; CRT 3 ⇒ `cstIcms`). Campos: `ncm` (8 díg.), `cest?`, `origem` (0–8),
    `cfopPadrao` (4 díg.), `csosn?` (CRT 1) / `cstIcms?` (CRT 3), `uCom`, `cEan` (GTIN ou "SEM GTIN"),
    `cstPis`/`cstCofins`, `ibsCbsCst?`/`ibsCbsClassTrib?` (2027 / CRT 3), `xProd?` (null ⇒ `products.name`).
    Valores admitidos de cada código = transcrição do PR-0, nunca de memória. Cadeia completa: Route → Controller →
    `ProductFiscalProfileService` → Repository → Prisma + Policy (`canManageProductFiscalProfile` delegando a `canManageFiscalProfile`, molde de `AccountingPolicy.ts:143-144`) + Factory +
    DTO `.strict()` + audit `product_fiscal_profile.updated`. Teste: CRUD + tenancy por `userId` + rename-on-delete;
    duas unidades do mesmo dono leem o mesmo perfil.
11. **[direto]** Pré-condição de emissão por item: todo `productLine` da venda tem `ProductFiscalProfile`; o
    `CFOP` está na lista `[NFCE-CFOP]` quando `kind=NFCE`; CSOSN só com CRT 1, CST ICMS só com CRT 3.
    Teste: venda com 1 produto sem perfil ⇒ 400 `faltantes: ['produto <ref>: perfil fiscal']`, nada enviado.

### Fase C — Montagem do documento 55/65 (validada localmente, sem parceiro)

12. **[pendente-insumo: item 1]** `NfePayloadSchema` (Zod `.strict()`) transcrito do PR-0, discriminado por
    `ide.mod ∈ {55, 65}`; as regras `[NFCE-IDE]`, `[NFCE-DEST]`, `[NFCE-CFOP]`, `[NFCE-PROIBIDOS]` viram
    `superRefine` com o código de rejeição na mensagem. Teste: 1 caso vermelho por regra (o código da SEFAZ na
    mensagem).
13. **[direto]** `kind` dos itens de produto: a montagem usa **só** `productLines` (serviço continua na NFS-e;
    venda mista ⇒ 2 documentos, invariante `Σ NFS-e + Σ NF-e/NFC-e == totalCents − Package`, ADR §9.2 item 6).
    Teste: fixture mista ⇒ dois documentos, fecho exato.
14. **[cond:F-NFCE-11]** Valores: `Σ vProd` (líquido) == crédito **3.3** do `sale.finalized`, rateio pela técnica
    canônica (extrair `splitCents` em `revenueSplit.ts` se preciso — nunca re-inline, BRIEF X10b item 34);
    `vNF` pela fórmula `[NFE-VNF]`. Teste: tie-out com desconto de cabeçalho, centavo de resíduo na última linha.
15. **[direto]** Identificação: `ide` com `mod`, `tpNF=1`, `idDest=1`, `finNFe=1`, `indFinal=1`, `indPres=1`,
    `tpImp=4`, `tpEmis=1`, `procEmi=0`, `cMunFG = codMun`, `cUF = codMun[0..2]`; `tpAmb` = ambiente do
    **documento** (`tpAmbFor`, mesmo mapeamento da DPS — F-AMB-6 a). `dhEmi` = momento da montagem (F-NFCE-6).
    Teste: `tpAmb` homologação ⇒ 2; cUF ≠ prefixo do `codMun` impossível por construção.
16. **[direto]** Homologação: `xProd` do 1º item = literal de `[NFCE-HOMOLOG]`. Teste: payload de homologação ⇒
    literal; produção ⇒ nome do produto.
17. **[F-NFCE-7 ✅ b]** `dest` **obrigatório nos dois modelos** (F-DFE-7 b mantido também na NFC-e): venda ligada a
    cliente com `taxId` válido por DV ⇒ `CPF`/`CNPJ` + `indIEDest=9` (NFC-e, `[NFCE-DEST]`); venda sem cliente ou
    sem documento ⇒ 400 com `faltantes: ['cliente com CPF/CNPJ']`, **nada enviado** — mesma pré-condição da NFS-e.
    Teste: cliente com CPF válido ⇒ `dest/CPF`; venda só com `simpleCustomerName` ⇒ 400; CPF com DV errado ⇒ 400.
18. **[direto]** `pag`: `tPag` mapeado de `sales.paymentMethod` — Cash→01, Credit Card→03, Debit Card→04, Pix→17
    (`[NFE-PAG]`); `Package Balance` ⇒ recusa nomeada até o §6 responder. `vPag = vNF`. Teste: tabela de mapeamento.
19. **[direto]** ICMS do Simples (CRT 1): grupo `ICMSSN` com o `csosn` do perfil do produto; nenhum valor de ICMS
    calculado (o Simples recolhe no DAS); IBS/CBS: CRT 1 **não** leva o grupo `IBSCBS` antes de 04/01/2027
    (`[RTC-SIMPLES]`); a partir daí o documento é **recusado com motivo nomeado** até a NT futura ser transcrita
    (F-NFCE-12). Teste: data 2026 ⇒ sem grupo; data ≥ 04/01/2027 ⇒ 400 `rtc_simples_nao_transcrito`.
20. **[F-NFCE-12 ✅ b; subgrupos = F-NFCE-12b]** CRT 3 (regime normal): grupo `IBSCBS` obrigatório desde
    03/08/2026 (`[RTC-SIMPLES]`, Obs. 2) **atendido neste ciclo**: montagem do grupo pela transcrição do PR-0 (item
    1), com `ibsCbsCst`/`ibsCbsClassTrib` do perfil do produto e as regras do grupo como `superRefine` (código da
    rejeição na mensagem). **F-NFCE-12b (b): todos os subgrupos do UB** (base, `gRed`, diferimento, monofásico,
    crédito presumido, ajuste de competência) — nenhum `cClassTrib` válido da transcrição é recusado por falta de
    subgrupo. Teste: um caso por subgrupo, mais perfil PRESUMIDO + produto com
    CST/cClassTrib ⇒ grupo montado e validado; produto sem CST ⇒ 400 nos faltantes.
21. **[direto]** Chave de acesso montada localmente (`[NFE-CHAVE]`; `nfeChaveCheckDigit`, `lib/cnpj.ts:82`;
    `cNF` aleatório de 8 dígitos ≠ nNF) **só** quando o adaptador declara `numbersDps: false`. Teste: DV confere
    com `NFE_CHAVE_REGEX`; mutação de 1 dígito ⇒ DV diferente.
22. **[direto]** Preview (`POST /api/nfe/dfe/preview`) aceita `NFE`/`NFCE` e devolve a lista de faltantes sem
    persistir (reuso do item 23 do X10b). Teste: preview de venda sem IE ⇒ faltantes, 0 linhas gravadas.

### Fase D — Numeração e inutilização

23. **[cond:F-NFCE-4]** Sequência por `(userId, unitId, kind, ambiente, serie)` para `NFE`/`NFCE` (a NFS-e fica
    como está — lacuna no GAP-MAP, fora daqui); consumida **na mesma tx** do `createSent`, só quando
    `numbersDps === false`. Teste: homologação e produção numeram de 1 independentemente; duas emissões
    concorrentes não repetem número (integração, `--runInBand`).
24. **[cond:F-NFCE-5]** `FiscalNumberVoid` (faixa inutilizada) + `inutilizar()` na porta (capability
    `inutilizar: boolean`) + `POST /api/nfe/dfe/inutilizacoes {unitId, kind, serie, nIni, nFin, xJust}`. Guardas
    locais **antes** da porta, espelhando `[NFE-INUT-REGRAS]`: faixa ≤ 10.000, nIni ≤ nFin, ano ≤ atual, xJust 15–255,
    nenhum número da faixa com `FiscalDocument` vivo ou autorizado (local 241), sem sobreposição com faixa já
    inutilizada (local 256/563). Teste: um caso por guarda; faixa válida + Null ⇒ `HOMOLOGATED` + audit.
25. **[cond:F-NFCE-5]** Lacunas de numeração visíveis: `GET …/inutilizacoes/pendentes?unitId&kind` lista números
    consumidos sem documento autorizado/cancelado (ex.: tentativa rejeitada abandonada). **Nada automático.**
    Teste: sequência 1..5 com o 3 rejeitado e abandonado ⇒ pendência `[3]`.
26. **[direto]** Audit na mesma mudança: `dfe.number_voided` (`voidId, kind, serie, nIni, nFin, ambiente`) e
    `product_fiscal_profile.updated`; sem PII. Teste: guarda da allowlist.

### Fase E — Eventos da NF-e/NFC-e (fronteira com o X11: F-NFCE-10)

27. **[cond:F-NFCE-10]** Cancelamento 55/65 (110111) com `xJust` 15–255 (`[NFE-CANC]`). Janela pela **mesma**
    função pura do BRIEF irmão do X11 (`janelaEventos`, item 3 do PR #466), estendida com o ramo 55/65: base = data
    da autorização devolvida pelo parceiro (`EmissaoResult.dhProc`, item 1 do X11; tag exata no PR-0), prazo
    `nfeCancelPrazoHoras`/`nfceCancelPrazoHoras` do perfil com `null` ⇒ 24 h (`[NFE-CANC-PRAZO]`, regra nacional **[ERRATA 10/10 — `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §10.2]** default da NFC-e = 30 min (Ajuste SINIEF 19/16 cl. 15ª), não 24 h; o campo em horas não comporta — precisa de minutos.
    com exceção estadual). Política = a do F-EVT-1 ratificado; com (a), fora da janela **segue** para a porta com
    aviso, e `OUT_OF_WINDOW` passa a significar "o fisco rejeitou com **501**" para 55/65 (`[NFCE-CANC-FORA]`: na
    NFC-e é terminal). Teste: autorizada há 25 h, prazo nulo ⇒ resposta com `avisos: ['fora_da_janela_configurada']`
    e porta chamada; porta falsa devolvendo 501 ⇒ 409 `OUT_OF_WINDOW`.
28. **[F-NFCE-9 ✅ c]** CC-e (110110): **não implementada**. A porta ganha `cce?` e `capabilities.cce` (contrato §4)
    sem implementação e sem rota; nenhum adaptador declara `cce: true`. Teste: `tsc`.
29. **[F-NFCE-9 ✅ c]** Cancelamento por substituição (110112) e EPEC: **fora** — os dois só existem com contingência,
    que é do parceiro (`[NFCE-CANC-SUBST]`; ADR §3 D1). O BRIEF do X11 (§7, PR #466) os entregava ao X10a; a
    ratificação os deixa fora dos dois nós até haver contingência no Luminaris.

### Fase F — Rotas, DTOs, gates

30. **[direto]** Rotas novas em 2 toques (`index.ts` + `docs.paths.ts`; `npm run docs:generate`; BASELINE do
    `openapi-paths.test.ts`): `GET/PUT/DELETE /api/accounting/product-fiscal-profiles[…]`, `POST
    /api/nfe/dfe/inutilizacoes`, `GET /api/nfe/dfe/inutilizacoes/pendentes` (sem rota de CC-e: F-NFCE-9 c).
    Deny-by-default; `canEmit*`/`canCancel*` existentes.
31. **[direto]** DTOs `.strict()` + snapshot de shape: `UpsertProductFiscalProfileSchema`,
    `VoidNumberRangeSchema`, `CancelFiscalDocumentSchema` (união), `EmitFiscalDocumentSchema`
    (`kind` com `NFCE`). Booleans de query por `queryBoolean()`.
32. **[direto]** Gates: `tsc` ×2; `npm run test:integration`; snapshot DTO; `docs:generate` sem diff; allowlist;
    paridade i18n se houver mensagem nova exposta; mutação manual: trocar crédito 3.3 por 3.1 no tie-out e aceitar
    `kind` fora de `capabilities.kinds` — os dois têm de ficar vermelhos.

### Fase G — Adaptador Focus — **LACUNA MARCADA (D5)**

33. **[pendente-insumo: D5]** Mapear `NfePayload` (tags do MOC) → JSON da Focus para NFC-e e NF-e, numeração,
    inutilização, cancelamento, CC-e, retorno de XML/DANFE NFC-e, cadastro do CSC. **Nenhum campo do JSON da Focus
    é escrito neste BRIEF.** Vai para o BRIEF `BE-INCR-DFE-FOCUS` (passo E.3, nó X10i). Pré-condições: conta de
    homologação, contrato conferido (NFC-e incluída), A1 de teste, resposta ao F-NFCE-8.

## 4. Contratos esboçados

```ts
// dfe/DfeEmissorPort.ts
export type DfeKind = 'NFSE' | 'NFE' | 'NFCE';
export interface DfeCapabilities {
  kinds: readonly DfeKind[];      // item 4
  numbersDps: boolean;            // nome mantido; semântica: "o parceiro numera o documento deste adaptador"
  consultar: boolean; cancelar: boolean; webhook: boolean;
  inutilizar: boolean;            // item 24
  cce: boolean;                   // item 28
}
export type NfePayload = z.infer<typeof NfePayloadSchema>;           // item 12 (era `unknown`)
export type CancelInput =
  | { kind: 'NFSE'; cMotivo: 1 | 2 | 9; xMotivo: string }           // Anexo II e101101 (inalterado)
  | { kind: 'NFE' | 'NFCE'; xJust: string };                        // MOC VG Tabela 5-37 (15–255)
export interface InutilizarInput {
  kind: 'NFE' | 'NFCE'; ambiente: DfeAmbiente; cnpjEmitente: string; partnerAccountRef: string | null;
  ano: number; serie: number; nIni: bigint; nFin: bigint; xJust: string;               // Tabela 5-9
}
export interface InutilizarResult { status: 'HOMOLOGATED' | 'REJECTED' | 'PROCESSING'; nProt?: string; errors: Array<{ code: string; message: string }> }
export interface DfeEmissorPort {
  // … emitir/consultar/verifyWebhook inalterados …
  cancelar(partnerRef: string, input: CancelInput): Promise<CancelResult>;
  inutilizar?(input: InutilizarInput): Promise<InutilizarResult>;   // só se capabilities.inutilizar
  cce?(partnerRef: string, xCorrecao: string, nSeqEvento: number): Promise<CancelResult>; // só NFE
}
// dfe/selectDfeEmissor.ts (cond. F-NFCE-1)
export function selectDfeEmissor(env: NodeJS.ProcessEnv, kind: DfeKind): DfeSelection;
```

```ts
// NfePayloadSchema — esqueleto; ids/tamanhos finais vêm do PR-0 (item 1). Só regras da §2.
const Ide = z.object({
  cUF: z.string().regex(/^\d{2}$/), cNF: z.string().regex(/^\d{8}$/), natOp: z.string().min(1),
  mod: z.union([z.literal(55), z.literal(65)]), serie: z.number().int().min(0).max(889),   // [NFE-SERIE]
  nNF: z.number().int().min(1).max(999_999_999), dhEmi: z.string(),                          // AAAA-MM-DDThh:mm:ssTZD
  tpNF: z.literal(1), idDest: z.literal(1), cMunFG: z.string().regex(/^\d{7}$/),
  tpImp: z.number().int(), tpEmis: z.literal(1), cDV: z.number().int().min(0).max(9),
  tpAmb: z.union([z.literal(1), z.literal(2)]), finNFe: z.literal(1), indFinal: z.literal(1),
  indPres: z.number().int(), procEmi: z.literal(0), verProc: z.string().min(1),
}).strict();
const Dest = z.object({ CPF: z.string().regex(/^\d{11}$/).optional(), CNPJ: z.string().optional(),
  xNome: z.string().optional(), indIEDest: z.literal(9) }).strict();                 // [NFCE-DEST]
const Det = z.object({ nItem: z.number().int().min(1),
  prod: z.object({ cProd: z.string(), cEAN: z.string(), xProd: z.string().min(1), NCM: z.string().regex(/^\d{8}$/),
    CFOP: z.string().regex(/^\d{4}$/), uCom: z.string(), qCom: Dec, vUnCom: Dec, vProd: Money,
    cEANTrib: z.string(), uTrib: z.string(), qTrib: Dec, vUnTrib: Dec, indTot: z.literal(1) }).strict(),
  imposto: z.object({ ICMS: IcmsSn.or(IcmsNormal), PIS: Pis, COFINS: Cofins, IBSCBS: IbsCbs.optional() }).strict(),
}).strict();
export const NfePayloadSchema = z.object({ infNFe: z.object({
  ide: Ide, emit: Emit /* CNPJ, xNome, enderEmit, IE (C17), CRT (C21) */, dest: Dest.optional(), det: z.array(Det).min(1),
  total: Total /* ICMSTot com vNF [NFE-VNF] */, transp: z.object({ modFrete: z.literal(9) }).strict(),
  pag: z.object({ detPag: z.array(DetPag).min(1).max(100) }).strict(), infAdic: InfAdic.optional(),
}).strict() }).strict().superRefine(regrasModelo65);   // [NFCE-IDE] [NFCE-CFOP] [NFCE-PROIBIDOS] [NFCE-HOMOLOG]
// infNFeSupl (qrCode/urlChave) NÃO é montado aqui: precisa do CSC, que fica no parceiro ([NFCE-QRCODE]; F-NFCE-8).
```

```prisma
// FiscalProfile — campos novos (cond. F-NFCE-2)
inscricaoEstadual String?            // emit/IE (C17)
nfceSerie         Int     @default(1) // 0–889, [NFE-SERIE]
nfeSerie          Int     @default(1)
nfeCancelPrazoHoras  Int?           // cond. F-NFCE-10: null => 24 (MOC VG Tabela 5-38); irmão do cancelPrazoDias do X11
nfceCancelPrazoHoras Int?           // idem; valor de SP = §6 (NV)

model ProductFiscalProfile {        // F-NFCE-3 ✅ b — por produto (sem unitId)
  id String @id @default(cuid())
  userId String
  productRef String                  // id da linha `products` (saleItems.productId), plain string
  ncm String                         // 8 dígitos
  cest String?
  origem Int                         // 0–8 (tabela do PR-0)
  cfopPadrao String                  // 4 dígitos; NFC-e ⊂ [NFCE-CFOP]
  csosn String?                      // CRT 1
  cstIcms String?                    // CRT 3
  uCom String
  cEan String                        // GTIN ou "SEM GTIN"
  cstPis String
  cstCofins String
  ibsCbsCst String?
  ibsCbsClassTrib String?
  xProd String?
  createdById String?
  updatedById String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  @@unique([userId, productRef])
  @@map("product_fiscal_profiles")
}

model FiscalNumberVoid {            // cond. F-NFCE-5
  id String @id @default(cuid())
  userId String
  unitId String
  kind String                        // NFE | NFCE
  ambiente String                    // producao | homologacao
  serie Int
  nIni BigInt
  nFin BigInt
  ano Int
  xJust String
  status String                      // REQUESTED | HOMOLOGATED | REJECTED
  partner String
  nProt String?
  errorsJson String?
  createdById String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, unitId, kind, ambiente, serie])
  @@map("fiscal_number_voids")
}

// FiscalDocumentSequence (cond. F-NFCE-4): chave passa a [userId, unitId, kind, ambiente, serie];
// linhas NFSE existentes recebem ambiente = '' (lacuna da NFS-e segue no GAP-MAP, fora deste BRIEF).
```

## 5. Forks — ✅ RATIFICADOS 2026-10-02 (F-NFCE-1..12 + 12b)

### F-NFCE-1 — Como a seleção passa a considerar o tipo
- **(a)** Um parceiro por instância (`DFE_PARTNER`) que declara `kinds`; tipo não suportado ⇒ desabilitado.
- **(b)** Variável por tipo (`DFE_PARTNER_NFCE` etc.), sem `kinds` declarado.
- **(c)** As duas: variável por tipo com fallback para `DFE_PARTNER` **e** `kinds` declarado pelo adaptador.
- **Recomendação: (c).** O 1º cliente precisa de NFS-e pelo modo manual e NFC-e por parceiro ao mesmo tempo — (a)
  não permite; (b) sozinho deixa ligar `manual` para NFC-e e só descobrir no envio. Custo de errar com (a): o
  cliente escolhe entre NFS-e e NFC-e. **✅ RATIFICADO 02/10 → (c).**

### F-NFCE-2 — Conserto do `icmsContribuinte` no Simples (GAP-MAP Nível 5)
- **(a)** Como o GAP-MAP descreve: liberar `icmsContribuinte=true` no Simples.
- **(b)** Separar: `inscricaoEstadual` novo (o que a NFC-e precisa) e CRT derivado do regime; `icmsContribuinte`
  segue sendo "crédito de ICMS da compra", ainda proibido no Simples.
- **(c)** (b) + renomear `icmsContribuinte` → `icmsCreditoCompra` (migração + DTO + OpenAPI + 12 testes).
- **Recomendação: (b).** (a) faz a compra do Simples tirar o ICMS do custo (`nfeCost.ts:140`), contra a LC 123
  art. 23. (c) corrige o nome, com blast radius em 12 arquivos de teste e no contrato público, sem mudar
  comportamento. Custo de errar com (a): custo de estoque subavaliado em toda compra do 1º cliente. **✅ RATIFICADO 02/10 → (b).**

### F-NFCE-3 — Granularidade do perfil fiscal do produto
- **(a)** Por unidade: `@@unique([userId, unitId, productRef])`, como o `ServiceFiscalProfile`.
- **(b)** Por produto: `@@unique([userId, productRef])`; NCM é natureza da mercadoria.
- **Recomendação: (a).** Unidade = filial com regime e UF próprios (R8); CSOSN/CFOP dependem disso. Custo: o NCM se
  repete por unidade (o cliente de hoje tem uma). **✅ RATIFICADO 02/10 → (b).**

### F-NFCE-4 — Quem numera NF-e/NFC-e, e a sequência separa ambiente?
- **(a)** Numeração local gapless por `(kind, ambiente, serie)` sempre que o adaptador declarar `numbersDps: false`
  (a mesma chave da NFS-e hoje) — pronta para qualquer contrato.
- **(b)** Esperar o D5 e só numerar se a Focus exigir.
- **Recomendação: (a).** A Tabela 2-4 diz "sequencial por CNPJ, controlado pelo emitente" na série 000–889; não
  depende do D5 e o `NullEmissor` exercita. O ambiente entra na chave porque a chave natural o inclui
  (`[NFE-CHAVE-NATURAL]`). Custo de errar com (b): o BRIEF da Focus reabre a sequência. **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-5 — Inutilização: quem detecta, quem pede
- **(a)** Tabela `FiscalNumberVoid` + método da porta + rota; o sistema **lista** as lacunas, o operador pede.
- **(b)** (a) + pedido automático das lacunas no fim do dia (job).
- **(c)** Só registrar a inutilização feita no painel do parceiro (sem método na porta).
- **Recomendação: (a).** Segue o gatilho manual ratificado (F-DFE-3). (b) inutilizaria um número cuja tentativa ainda
  pode voltar autorizada (241 do lado da SEFAZ). (c) deixa a lacuna invisível no Luminaris. **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-6 — Momento da emissão da NFC-e × gatilho manual (F-DFE-3)
- **(a)** Manual, com `dhEmi` = momento da montagem; aviso quando a venda foi finalizada há mais de N minutos
  (a NFC-e se autoriza "antes da ocorrência do fato gerador", `[NFCE-SUBST-SAT]`).
- **(b)** Automático no `sale.finalized` quando a venda tem produto e o perfil está completo (reabre F-DFE-3 para
  NFC-e).
- **Recomendação: (a)** agora, com o botão no fluxo de finalizar a venda (FE). (b) depois do H2 em homologação,
  como o ADR já previa para o lote. A rejeição 704 (`[NFCE-TEMPO-REAL]`) não morde em (a), porque `dhEmi` é o
  momento do envio; o risco é **legal** (nota emitida depois da venda), não técnico. **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-7 — Consumidor sem documento × F-DFE-7 (b) ratificado
- **(a)** Para `NFCE`, `dest` opcional (`[NFCE-DEST]`): cliente com CPF/CNPJ válido entra; consumidor anônimo
  emite sem `dest`, dentro do limite de valor da UF (§6). F-DFE-7 (b) continua valendo para NFS-e e NF-e 55.
- **(b)** Manter F-DFE-7 (b) também para a NFC-e: sem CPF/CNPJ, sem nota.
- **Recomendação: (a).** Venda de balcão a consumidor anônimo é o caso típico do 1º cliente; (b) o deixa sem
  documento fiscal, e o SAT está vedado (`[SP-SAT-VEDADO]`). **Reabre decisão ratificada — só o dono.** **✅ RATIFICADO 02/10 → (b).**

### F-NFCE-8 — CSC (e A1) da NFC-e até o parceiro
- **(a)** O cliente cadastra o CSC no painel da Focus; o Luminaris não vê o CSC (mesma linha do F-MCE-3 a).
- **(b)** O Luminaris recebe e repassa pela API de empresas, sem gravar.
- **Recomendação: (a)**, decidido junto com o F-MCE-3. O CSC entra no hash do QR Code (`[NFCE-QRCODE]`) — é segredo
  do contribuinte, como o A1. Depende de conferir o painel no D5. **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-9 — Eventos além do cancelamento: CC-e (110110, só 55) e cancelamento por substituição (110112, só 65)
- **(a)** Os dois neste BRIEF (o BRIEF do X11, §7, entrega os dois ao X10a).
- **(b)** CC-e sim; 110112 não.
- **(c)** Nenhum dos dois; a porta ganha os métodos opcionais (contrato §4) sem implementação.
- **Recomendação: (c).** O 1º cliente emite NFC-e, que não admite CC-e (`[NFCE-SEM-CCE]`); a NF-e 55 só é obrigatória
  para quem movimenta bem sem IE a partir de 01/12/2026 (Ato 4 § 4º) ou em venda a contribuinte. O 110112 só cabe
  quando outra NFC-e **em contingência** acobertou a venda (`[NFCE-CANC-SUBST]`), e contingência é do parceiro.
  Quem prefere completude escolhe (b): +1 rota, +1 evento de audit. **✅ RATIFICADO 02/10 → (c).**

### F-NFCE-10 — Janela do cancelamento 55/65 × F-EVT-1 do X11
- **(a)** Seguir o F-EVT-1 do X11 (PR #466), qualquer que seja a escolha do dono lá: uma só função `janelaEventos`
  com ramo 55/65 (24 h nacional, prazo por UF no perfil) e uma só política (com a recomendação de lá: informa, não
  bloqueia; `OUT_OF_WINDOW` = rejeição 501).
- **(b)** Regra própria para 55/65: bloquear localmente, porque a NFC-e fora do prazo é rejeição terminal
  (`[NFCE-CANC-FORA]`).
- **Recomendação: (a).** Duas regras de janela no mesmo serviço divergem na primeira manutenção; o custo de (a) para a
  NFC-e é uma chamada rejeitada ao parceiro, sem escrita errada. A "exceção estadual" (Tabela 5-38) torna o 24 h
  local tão incerto quanto o prazo municipal da NFS-e — o argumento do F-EVT-1 vale igual. **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-11 — Desconto no item da NF-e/NFC-e
- **(a)** Preço líquido: `vUnCom` já descontado, `vDesc = 0` (mesma escolha do F-DFE-15 a na DPS).
- **(b)** Preço bruto + `vDesc` rateado por item.
- **Recomendação: (a).** O crédito 3.3 já é líquido; (a) fecha o tie-out por construção. Custo de errar: o DANFE não
  mostra o desconto ao consumidor — a confirmar com o contador (§6). **✅ RATIFICADO 02/10 → (a).**

### F-NFCE-12 — IBS/CBS na NF-e/NFC-e
- **(a)** Simples primeiro: CRT 1 sem grupo em 2026; ≥ 04/01/2027 recusa nomeada até a NT futura; regime normal
  recusado com motivo até um PR próprio transcrever o grupo UB da NT 2025.002.
- **(b)** Transcrever o grupo UB agora e atender o regime normal neste ciclo.
- **Recomendação: (a)**, com o PR do regime normal no mesmo BRIEF (como F-DFE-13 a fatiou a NF-e). O grupo UB tem
  monofásico, diferimento, crédito presumido e ajuste de competência (NT pp. 19–30); o salão em regime normal usa
  um subconjunto que só o contador confirma. **✅ RATIFICADO 02/10 → (b).**

### F-NFCE-12b — Quais subgrupos do UB o regime normal atende neste ciclo (aberto pela ratificação do F-NFCE-12 b)
- **(a)** Grupo base (CST, cClassTrib, base, `gIBSUF`, `gIBSMun`, `gCBS`, totais) + `gRed` (redução de alíquota);
  `cClassTrib` que exige diferimento, monofásico, crédito presumido ou ajuste de competência ⇒ 400 nomeado.
- **(b)** Todos os subgrupos da NT 2025.002 v1.51 pp. 19–30.
- **Recomendação: (a).** Monofásico (combustíveis), diferimento e crédito presumido dependem de `cClassTrib` que um
  salão em regime normal não usa (inferido); a recusa nomeada aponta o que falta se o contador indicar uso.
  Custo de errar (a): produto do cliente cai num `cClassTrib` recusado e a nota não sai até a fatia seguinte.
  **✅ RATIFICADO 02/10 (2ª rodada) → (b), contra a recomendação.**

### RATIFICAÇÃO — 2026-10-02 (dono, questionário, 3 lotes; pedido: *"ratifica os forks F-NFCE por questionário"*)

| Fork | Escolha do dono | Contra a recomendação? | Efeito no BRIEF |
|---|---|---|---|
| F-NFCE-1 | (c) env por tipo + `kinds` declarado | não | item 5 |
| F-NFCE-2 | (b) `inscricaoEstadual` separado; `icmsContribuinte` segue = crédito | não | item 8; o GAP-MAP Nível 5 corrige o diagnóstico na mesma mudança (§8 achado 1) |
| **F-NFCE-3** | **(b) por produto** | **SIM** | item 10 e schema: sem `unitId`, `@@unique([userId, productRef])`; `csosn` e `cstIcms` no mesmo perfil, escolhidos pelo CRT da unidade emitente. Limite declarado: duas unidades com regimes ou UF diferentes não podem ter CSOSN/CFOP diferentes para o mesmo produto |
| F-NFCE-4 | (a) numeração local por (tipo, ambiente, série) | não | item 23 |
| F-NFCE-5 | (a) o sistema lista, o operador pede | não | itens 24–25 |
| F-NFCE-6 | (a) manual, no fluxo de finalizar a venda | não | item 15 (`dhEmi` = envio); botão no FE |
| **F-NFCE-7** | **(b) manter F-DFE-7 b: sem CPF/CNPJ, sem nota** | **SIM** | item 17: `dest` obrigatório na NFC-e. **Consequência declarada:** com o SAT vedado em SP (`[SP-SAT-VEDADO]`), a venda de produto no balcão só tem documento fiscal pelo Luminaris se o operador cadastrar o CPF/CNPJ do consumidor; venda anônima fica sem NFC-e |
| F-NFCE-8 | (a) CSC e A1 cadastrados pelo cliente no painel da Focus | não | item 33 (pré-condição do D5) |
| F-NFCE-9 | (c) nem CC-e nem 110112 | não | itens 28–30: métodos opcionais na porta, sem rota |
| F-NFCE-10 | (a) seguir o F-EVT-1 do X11 | não | item 27 |
| F-NFCE-11 | (a) preço líquido, `vDesc = 0` | não | item 14 |
| **F-NFCE-12** | **(b) transcrever o UB agora e atender o regime normal neste ciclo** | **SIM** | item 1 (PR-0 com o UB); item 20 deixa de recusar o regime normal; insumo ausente 6 sai da §7; abre o **F-NFCE-12b** (subgrupos) |
| **F-NFCE-12b** (2ª rodada, 02/10) | **(b) todos os subgrupos do UB** (NT 2025.002 v1.51 pp. 19–30) | **SIM** | item 1: a transcrição cobre cada subgrupo com as regras de validação dele; item 20: o PR-6 monta todos, sem recusa nomeada por `cClassTrib` especial, com um teste vermelho por subgrupo. **Consequência declarada:** PR-0 e PR-6 maiores; monofásico (combustíveis) e crédito presumido entram sem uso conhecido no salão — código exercitado só por fixture até um cliente usar |

## 6. Pendente de validação externa (fonte citada, grau declarado)

| Ponto | Quem responde | Grau hoje |
|---|---|---|
| CSOSN dos produtos do salão (102 × 500) e CFOP (5.102 × 5.405): perfumaria/higiene saíram da ST em SP em 01/04/2026 (Portaria SRE 94/2025, lida 29/09); estoque comprado com ST antes dessa data | contador (pergunta 2 da lista de 29/09) | I |
| NCM de cada produto vendido | contador / cliente | NV |
| SP: prazo de cancelamento da NFC-e (MOC: 24 h com exceção estadual), limite de valor da NFC-e (W16; o do consumidor não identificado deixou de importar com F-NFCE-7 b), contingência offline aceita (712), entrega a domicílio (785) | ato da SEFAZ-SP que regula a NFC-e — **não identificado nesta sessão** | NV |
| CRT 2 (excesso de sublimite) | contador | NV |
| Venda paga com saldo de pacote (`Package Balance`): `tPag` | contador (casa com F-DFE-9) | NV |
| Desconto: líquido no item basta ao consumidor? (F-NFCE-11) | contador | I |
| Formato da IE de SP | tabela de validação de IE por UF | NV |

## 7. Insumos ausentes

1. **Contrato e API da Focus para NFC-e/NF-e (D5)** — endpoint, JSON, numeração, inutilização, CC-e, cadastro do
   CSC, retorno do DANFE NFC-e. **Lacuna marcada; nada inventado.** Destino: `BE-INCR-DFE-FOCUS` (E.3).
2. Manual de Especificações Técnicas do DANFE NFC-e e QR Code (MOC VG §1) — só necessário se o Luminaris montar o
   QR Code; pela decisão D1 quem monta é o parceiro.
3. Manual de Contingência NFC-e (MOC Anexo IV/V) — contingência é do parceiro.
4. Ajuste SINIEF 19/16 (texto) — o MOC cita a cláusula 15ª-A; lida só pela citação.
5. Tabela de unidades comerciais (regra 734) e tabela de origem da mercadoria — PR-0.
6. ~~Grupo UB (IBS/CBS) da NT 2025.002~~ → entra no PR-0 (item 1), F-NFCE-12 (b). O PDF está no disco de outra
   worktree (`execucao-sequencia-fe-luminaris-7fa341`), não nesta — a sessão do PR-0 copia ou rebaixa (sha `a4aaaa181522`).
7. NT futura do IBS/CBS para o Simples — anunciada na NT 2025.002 v1.51 (p. 7); não está no corpus e não procurei se já saiu.

## 8. Achados fora de escopo

1. **Texto do GAP-MAP Nível 5 (`GAP-MAP.md:117`) diagnostica errado**: o campo é crédito, não inscrição (§1 item 2).
   Corrigir na mesma mudança que fechar o F-NFCE-2; não editado aqui (regra 1).
2. **DANFE NFC-e ao consumidor no balcão** (impresso ou eletrônico, `tpImp` 4/5): tela e entrega — nó de FE
   inexistente; casa com F-MCE-1.
3. **Telas**: perfil fiscal do produto, IE no perfil da unidade, "Emitir NFC-e" no fluxo de finalizar venda,
   inutilizações — BRIEF `FE-INCR-NFCE` (exige autorização própria).
4. **Numeração da NFS-e sem ambiente** (GAP-MAP, ABERTO) — o F-NFCE-4 só resolve 55/65.
5. **`numbersDps`** fica com nome de NFS-e servindo aos três tipos — renomear é churn sem comportamento.
6. **NF-e recebidas** (F-PLAN-3) e **NFS-e tomadas** (F-MCE-2) — Fase G do plano.

## 9. Plano de execução por fatias (para a `sessao-feature`)

| PR | Itens | Depende |
|---|---|---|
| PR-0 (docs) | 1 (com o grupo UB inteiro, F-NFCE-12b b), 2 | ✅ forks ratificados |
| PR-1 porta + seleção | 3–7 | F-NFCE-1 |
| PR-2 perfis | 8–11, 26 (parte), 30–31 (parte) | F-NFCE-2, F-NFCE-3 |
| PR-3 montagem (Simples) | 12–19, 21–22 | PR-0 |
| PR-4 numeração + inutilização | 23–26 | F-NFCE-4, F-NFCE-5 |
| PR-5 eventos | 27–29 | F-NFCE-9, F-NFCE-10; `janelaEventos` do X11 mergeado (item 3 do PR #466) |
| PR-6 regime normal (IBS/CBS) | 20 (todos os subgrupos) | PR-0 com o UB |
| — Focus | 33 | D5 + "executa" da emissão real (X10i) |

## 10. Gates de envio [OPS-001]

1. **Objetivo:** planejar tudo que não depende do D5 — §3 Fases 0–F; o que depende está isolado na Fase G e na §7.
2. **Grau:** código V (lido, arquivo:linha na tabela de insumos); regras V com página (§2); itens de SP NV (§6).
3. **Caso adversarial tentado:** antes do commit, o BRIEF irmão do X11 (PR #466, aberto em paralelo) foi lido na
   fronteira: a 1ª versão deste BRIEF bloqueava o cancelamento fora da janela, contra o F-EVT-1 (a) de lá — alinhado
   (item 27, F-NFCE-10). Também: o conserto pedido no GAP-MAP foi testado contra quem lê o campo — `grep
   icmsContribuinte` levou a `nfeCost.ts:140`, e o conserto literal quebra o custo da compra (F-NFCE-2). Também:
   "a NFC-e pode ser emitida depois, como a NFS-e" — o Anexo I B09-40 diz que não (F-NFCE-6).
4. **Checagem que teria falhado:** sha256 dos dois PDFs do MOC igual ao do MANIFEST (confere); `node
   scripts/plano-vault.mjs check` sobre a nota dobrada.
5. **Vieses (T8):** as recomendações puxam para o menor diff (F-NFCE-5, 9, 12); o dono já disse preferir completude,
   por isso cada uma diz o que a reabre. A leitura do PDF por `pdftotext` embaralhou tabelas (W16, Tabela 3-1): os
   códigos marcados como "o PR-0 confirma" não estão verificados.
