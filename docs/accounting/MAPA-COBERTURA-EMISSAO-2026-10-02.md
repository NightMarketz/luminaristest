# Mapa de cobertura da emissão fiscal — o que o Luminaris já faz com código próprio (2026-10-02)

> Registro pedido pelo dono em chat, 02/10: *"atualiza a documentação para cobrir todos os pontos que estão
> faltando e caso necessite atualizar com detalhes os pontos necessários"*, depois de três leituras do repositório
> na mesma sessão (acoplamento com a NFE.io; cobertura própria × intermediário; o que já estava documentado).
> Base: `origin/main` = `669b41d3`. **Não ratifica nada, não autoriza código e não cria nó no vault** (ORCH-006;
> `docs/plano/README.md`: proposta nova só vira nota em `nos/` depois de PRE-ADR ratificado).
> Grau: **V** = verificado (lido no código ou no documento) · **I** = inferido · **NV** = não verificado.
>
> **Em duas linhas:** dos 20 itens que um emissor intermediário oferece, 18 já estavam tratados nos documentos
> (feitos, planejados ou deixados de fora por decisão), 1 só em parte (captura) e 1 não aparecia em lugar nenhum
> (entregar a nota ao cliente). **Risco principal:** sem intermediário, hoje só existe o modo manual de NFS-e, que
> não tem tela e cujo cancelamento depende de um XML que o guia oficial diz que o portal não entrega (F-FE-DFE-9).

---

## 0. O que foi perguntado e o que foi respondido

| Pergunta do dono (02/10) | Resposta | Onde neste documento |
|---|---|---|
| Quanto o sistema depende da NFE.io? | Nada. Não há integração com ela nem com outro provedor | §1 |
| O que já tenho equivalente ao que ela oferece, e o que falta? | 3 itens prontos, 10 parciais, 7 inexistentes | §2 |
| Quanto disso já estava nos briefs? | 18 de 20; os pontos que faltavam estão registrados aqui | §2 (coluna "Documentado em") e §3 |

O checklist do dono chegou cortado no item 20 (*"Buscar NFS-e tomadas / NF-e emitidas contra o"*). Foi lido como
"contra o meu CNPJ". Se havia itens depois dele, não estão neste mapa.

## 1. NFE.io — sem integração (V)

- A única ocorrência no repositório é a lista de candidatos do fork F-DFE-4
  ([`ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md), linha 204). O histórico do git
  (todos os branches) só a menciona em documentos.
- O parceiro escolhido é a **Focus NFe** (decisão 1 de
  [`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md)), ainda sem adaptador:
  `selectDfeEmissor.ts:29-34` só conhece `null` e `manual`; qualquer outro valor desabilita a porta.
- Não há SDK de emissor em `server/package.json` nem em `my-app/package.json`, e nenhuma URL de provedor fiscal em
  `server/src`. As únicas chamadas HTTP de saída são o healthcheck do Qdrant (`app.ts:92`) e o alerta
  (`lib/alertWebhook.ts:41`).
- Termos buscados (sem diferenciar maiúsculas, fora de `node_modules`): `nfe.io`, `nfeio`, `nfe_io`, `nfe-io`,
  `api.nfe.io`, `InvoiceProvider`, `FiscalGateway`, `NotaFiscalService`, `FiscalProvider`, `NfseProvider`,
  `DfeProvider`, `focusnfe`, `enotas`, `plugnotas`, `webmania`, `tecnospeed`, `nuvemfiscal`.

**Acoplamento da camada de emissão:** isolada atrás de `DfeEmissorPort` (`dfe/DfeEmissorPort.ts:106-116`). Status
(`IFiscalDocumentRepository.ts:9`), payload (`DpsPayloadDto.ts`, leiaute nacional v1.01) e colunas
(`schema.prisma:1463-1508`) são nossos ou do leiaute, não de fornecedor. Trocar ou acrescentar provedor mexe em um
adaptador novo, em `selectDfeEmissor.ts` e em `resolveEmissor.ts`.

## 2. Os 20 itens — código hoje × onde está documentado

Classe do código: **TEM** (implementado e exercitado por teste) · **PARCIAL** · **NÃO TEM**. "Teste" aqui é teste
de serviço: não há tela nem teste HTTP das rotas `/api/nfe/dfe`, e nenhuma nota saiu por este código (o `dev.db`
real tinha 0 `FiscalDocument` em 28/09 — [`BE-INCR-DFE-TPAMB-brief.md`](BE-INCR-DFE-TPAMB-brief.md) §1, M8).

### A. Emissão

| # | Capacidade | Código | Evidência (V) | Documentado em |
|---|---|---|---|---|
| 1 | Montar a DPS a partir da venda | **TEM** no modo manual · **PARCIAL** para envio por máquina | `FiscalDocumentEmissionService.ts:383-698`; 26 testes. Recusa pacote `VENDA` (`:441`), ISS retido (`:493-499`), MEI (`DpsPayloadDto.ts:38`). Por máquina o `id` sai com o número zerado (GAP-MAP "`id` [102] nunca refeito") | [`BE-INCR-DFE-brief.md`](BE-INCR-DFE-brief.md) §1–§2 |
| 2 | Gerar e assinar XML com A1 | **NÃO TEM** | Sem serializador de XML; assinatura só em helper de teste (`server/test/helpers/nfeSignature.ts:113-158`); produção só verifica (`lib/nfseSignature.ts:126`) | Fora por decisão: ADR §3 D1 e §11.1 item 2; BRIEF X10b linha `[416]` e item 19 ("XML fica com o adaptador/parceiro") |
| 3 | Enviar ao emissor nacional | **PARCIAL** (só com pessoa no portal) | Ficha (`EmissionService.ts:294`) + retorno pelo XML com releitura (`LifecycleService.ts:351-425`); 21 testes. Por API: nada | [`BE-INCR-DFE-MANUAL-brief.md`](BE-INCR-DFE-MANUAL-brief.md); API direta fora (decisão 2 de 26/09) |
| 4 | Webservices municipais | **NÃO TEM** | Nenhum padrão municipal no código | ADR §11.1 item 3 (um adaptador por protocolo; município é configuração; só via Focus); [`DOSSIE-DECISOES-2026-09-29.md`](DOSSIE-DECISOES-2026-09-29.md) §0 U2 |
| 5 | NF-e de produto (SEFAZ) | **NÃO TEM** | `EmissionService.ts:399-403` recusa `kind='NFE'` | BRIEF X10b Fase E (pendente de transcrição do leiaute de saída) |
| 6 | NFC-e | **NÃO TEM** | `DfeKind = 'NFSE' \| 'NFE'` (`DfeEmissorPort.ts:13`) | F-PLAN-2 (a) em [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md); nó [`X10a`](../plano/nos/X10a.md) |
| 7 | Campos IBS/CBS | **PARCIAL** | Grupo `IBSCBS` com CST e `cClassTrib` (`DpsPayloadDto.ts:109-127`, `EmissionService.ts:686-695`); valores só do retorno | BRIEF X10b §0 (5d), §5 p5, §6 item 2 (tabela de CST fora do corpus) |
| 8 | Cancelamento e substituição | **PARCIAL** | Cancelamento manual com XML do evento (`LifecycleService.ts:450-479`); por máquina só contra adaptador falso; substituição não existe | BRIEF X10b `[113-116]` (substituição fora do MVP); nó X11 aberto (dossiê §2); **F-FE-DFE-9** em [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) §4 |
| 9 | Consulta e emissão assíncrona | **PARCIAL** | Estados, job de polling e reenvio (`LifecycleService.ts:84-228`, `jobs/dfePollPending.job.ts`); 35 testes. Falta a chamada real | ADR §10 F-DFE-5 (c); GAP-MAP "consultar, cancelar e webhook usam o ambiente do env" |
| 10 | DANFSe e guarda do XML | **PARCIAL** | Guarda XML/PDF como anexo, só em produção (`LifecycleService.ts:642-662`); não gera DANFSe | ADR §3 D1 (DANFSe é do parceiro); BRIEF manual item 11 (PDF opcional por upload); FE item 24 |

### B. Em volta da emissão

| # | Capacidade | Código | Evidência (V) | Documentado em |
|---|---|---|---|---|
| 11 | Cálculo de impostos | **PARCIAL** | Alíquota configurada (`issAliquotaBp`), ISS lido do retorno; sem retenções federais | ADR §9.2 item 1 (ISS fora do razão até o X7); BRIEF X10b `[313-324]` (retenções omitidas, declarado) |
| 12 | Códigos de serviço por cliente | **TEM** | 337 códigos em `models/lc116ListaNacional.ts`; `ServiceFiscalProfile` (`schema.prisma:1434-1453`); `lc116IndOp.test.ts` | BRIEF X10b item 8 |
| 13 | Entregar a nota ao tomador | **NÃO TEM** | Sem transporte de e-mail ou mensageria no servidor | **Não estava documentado** → §3.1 |
| 14 | Vários CNPJs emissores | **PARCIAL** | Escopo por dono e unidade; CNPJ por unidade; teste de tenancy (`FiscalDocument.integration.test.ts:113`). Sem credencial por CNPJ | ADR §3 D2 (emendas 10/09 e 14/09, R8) |
| 15 | Guarda do A1 | **NÃO TEM** | Sem upload, tabela ou cifra. Reaproveitável: leitura de CNPJ e validade de um certificado (`lib/nfeSignature.ts:90-147`) | ADR §3 D1 e §5 F-DFE-2 (b) descartado; plano passo E.3 ("pré-voo de validade do A1"). Falta o caminho do A1 até a Focus → §3.3 |
| 16 | Fila, retentativa, idempotência | **PARCIAL** | Idempotência testada (`FiscalDocument.integration.test.ts:65,102`). Sem fila; falha de rede não reenvia (`EmissionService.ts:253`) | BRIEF X10b item 20 ("não há tentativa 2 automática"); trilho T11; [`BE-INCR-DFE-ANEXO-PENDENTE-brief.md`](BE-INCR-DFE-ANEXO-PENDENTE-brief.md) (retentativa só do anexo) |
| 17 | Motivo de rejeição visível | **PARCIAL** | Gravado e devolvido pela API (`EmissionService.ts:749`); sem tela | BRIEF X10b item 26; FE itens 16 e 22 |
| 18 | Homologação separada | **TEM**, com duas lacunas abertas | `tpAmb` conferido contra o ambiente do documento (`DfeEmissorPort.ts:50-54`); homologação não anexa nem cria proveniência | [`BE-INCR-DFE-TPAMB-brief.md`](BE-INCR-DFE-TPAMB-brief.md); GAP-MAP "numeração não separada por ambiente" e "ambiente do env" |
| 19 | Gatilho automático | **NÃO TEM** | Serviços só são chamados pelo controller e pelo job de polling | Decisão: ADR §10 F-DFE-3 (a), manual; (c) lote como evolução |

### C. Captura

| # | Capacidade | Código | Evidência (V) | Documentado em |
|---|---|---|---|---|
| 20 | Buscar notas contra o CNPJ | **PARCIAL** | NF-e por upload de XML, com assinatura conferida, tela e testes (`routes/nfe.ts:17-19`, `NfeImportService.ts`, `NfePanel.tsx`). Busca automática e NFS-e tomadas: nada | NF-e recebidas via Focus: F-PLAN-3 (a). **NFS-e tomadas e busca sem parceiro não estavam documentadas** → §3.2 |

## 3. Pontos que faltavam na documentação

Três viram fork do dono (**RATIFICAÇÃO PENDENTE**, com recomendação). O quarto é só medição.

### 3.1 F-COB-1 — Entregar a nota ao tomador (e-mail ou WhatsApp)

**Fatos**

| Fato | Grau |
|---|---|
| Nenhum documento de emissão trata de entregar a nota ao cliente (lidos inteiros em 02/10: os 5 briefs de DF-e, o ADR, o parecer, o plano, o handoff e o dossiê) | V |
| O servidor não tem transporte de e-mail nem de mensageria (sem dependência em `server/package.json`; `ADR-CONTADOR-DELIVERY.md`, linha 70, mediu o mesmo) | V |
| Precedente: o pacote ao contador é gerado e **o dono envia pelo próprio e-mail** (F-CD1 → (a); [`09-integracoes-e-ecossistema`](../plano/destino/09-integracoes-e-ecossistema.md)) | V |
| A tela planejada oferece "Baixar XML" e "Baixar DANFSe", só em produção ([`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) item 24 e fato F5) | V |
| O cadastro de cliente já tem `email` e `phone` (`CustomerModule.ts:36-37`) | V |
| A DPS montada não leva contato do tomador (`DpsPayloadDto.ts:45-64`); o BRIEF X10b transcreveu do grupo `toma` só as linhas `[143-163]` | V |
| Se o leiaute tem campo de e-mail/telefone do tomador | NV (não transcrito) |
| Se o portal nacional ou a Focus enviam a nota ao tomador quando o contato é informado | NV |
| WhatsApp e SMS estão como PROPOSTO no destino §9, o que exige PRE-ADR | V |

**Opções**

- **(a)** Fora do produto: o operador baixa o XML/DANFSe pela tela e repassa pelo canal dele. Mesmo desenho do
  F-CD1 (a).
- **(b)** O contato do tomador vai na nota (ou ao parceiro) e quem emite envia. Depende de transcrever o resto do
  grupo `toma` e de conferir o comportamento do portal e da Focus.
- **(c)** O Luminaris envia. Pede transporte novo (dependência, credencial, LGPD) e PRE-ADR, porque é canal PROPOSTO.

**Recomendação: (a) agora, e medir (b) sem custo de código** — uma linha no D5 (pergunta à Focus) e um passo no
`RUNBOOK-H2-DFE-MANUAL` (o portal envia?). Reabrir para (c) se o cliente pedir envio automático.
**Quem decide:** o dono. **Toca:** [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md) (achado A8 do BRIEF) e o gate
[`D5`](../plano/gates/D5.md).

### 3.2 F-COB-2 — Captura de NFS-e tomadas e busca sem parceiro

**Fatos**

| Fato | Grau |
|---|---|
| A NF-e de compra entra só por upload do XML (`routes/nfe.ts:17-19`) | V |
| F-PLAN-3 (a), ratificado: "NF-e recebidas" da Focus vira 2ª origem **quando houver conexão com a Focus** | V |
| A Focus tem os eventos `nfe_recebida` e `nfsen_recebida` (ADR §11.2); o plano só usa o primeiro (passo G.2) | V |
| Não existe import de NFS-e **tomada**: `parseNfseAutorizada` só é chamado pelo retorno manual, cujas guardas exigem que o prestador seja a própria unidade (`LifecycleService.ts:364-385`) | V |
| O serviço comprado entra hoje como título lançado à mão em Contas a Pagar | I (não percorri o fluxo) |
| Buscar direto no governo (distribuição de documentos por CNPJ) exige certificado A1 do cliente, e por isso esbarra na decisão 2 de 26/09 | I |

**Opções**

- **(a)** Fora por ora: serviço tomado continua lançado à mão.
- **(b)** Estender o F-PLAN-3 ao evento `nfsen_recebida` quando o BRIEF do passo G.2 abrir.
- **(c)** Upload manual do XML da NFS-e tomada, sem parceiro, virando título a pagar (irmão do import de NF-e).

**Recomendação: (b)**, como linha do BRIEF de G.2; (c) só se aparecer cliente sem Focus que precise.
**Quem decide:** o dono. **Toca:** Fase G do plano de emissão.

### 3.3 F-COB-3 — Como o A1 do cliente chega à Focus

**Fatos**

| Fato | Grau |
|---|---|
| O Luminaris nunca guarda certificado (ADR §3 D1) | V |
| O D5 pede "A1 de teste" e o passo E.3 pede "pré-voo de validade do A1", mas nenhum documento diz **quem sobe o arquivo e por onde** | V |
| A Focus tem "API de empresas" (ADR §11.2) | V |
| Se o cliente consegue subir o próprio certificado no painel da Focus, sem passar pelo Luminaris | NV |

**Opções**

- **(a)** O cliente sobe o A1 no painel da Focus. O Luminaris só lê a validade pela API, se ela existir.
- **(b)** O Luminaris recebe o arquivo e a senha e repassa à API de empresas, sem gravar. O arquivo e a senha passam
  pelo servidor, o que pede regra escrita sobre trânsito × guarda (D1 fala de guarda).

**Recomendação: (a).** Mantém o D1 sem interpretação. **Quem decide:** o dono, depois de conferir o painel no D5.
**Toca:** BRIEF `BE-INCR-DFE-FOCUS` (passo E.3) e o gate [`D5`](../plano/gates/D5.md).

### 3.4 O que faltaria para emitir NFS-e direto no Emissor Nacional (medição, não fork)

A decisão 2 de 26/09 continua valendo: emissão direta fora, e só reabre com as duas condições juntas (demanda de
clientes só-serviço sensíveis a preço **e** aceite do dono para guardar o A1 com cifra decidida no M2). O ADR §11.1
diz que "a custódia continua sendo o impedimento, não o esforço". Esta tabela é o esforço, para quando a condição
for discutida.

| Peça | Hoje | Evidência |
|---|---|---|
| Guarda do A1 (upload, cifra em repouso, validade) | Não existe | §2 item 15; cifra em repouso está fora do escopo do M2 atual |
| DPS em XML | Não existe; a DPS é JSON em `FiscalDocumentAttempt.payloadJson` | BRIEF X10b item 19 (V) |
| Assinatura com chave privada | Só em helper de teste; `xml-crypto` já é dependência (`server/package.json:63`) | §2 item 2 (V) |
| Cliente HTTP com certificado de cliente + endereços do ambiente nacional | Não existe; o Anexo IV do ADN constava como download pendente em 29/09 (dossiê §5 D-8) | V / status do download NV |
| Consulta, cancelamento e substituição por API | A porta tem `consultar` e `cancelar`; sem implementação real; substituição é o nó X11 | §2 itens 8 e 9 (V) |
| Numeração própria | Aproveita: série 1–49999 "aplicativo próprio" (E0010) e `FiscalDocumentSequence` | BRIEF X10b `[106]`/`[107]` (V) |
| Releitura do XML autorizado | Aproveita inteira (`lib/nfse.ts`, `lib/nfseReadback.ts`) | V |

Dois limites do caminho direto: **(i)** cobre só NFS-e; NFC-e e NF-e pedem SEFAZ por UF, e nada disso foi começado
(nó X10a `blocked`); **(ii)** para o 1º cliente (Simples, São Paulo capital, com IE e venda no balcão —
[`D-2026-09-29`](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md)) a NFC-e é obrigação atual, então
a emissão direta não tiraria o parceiro da frente (I).

## 4. O que já está registrado e morde no primeiro envio por máquina

Nada aqui é novo; são ponteiros para quem abrir o BRIEF do X10i ou reabrir a decisão 2.

| Lacuna | Onde está | Estado em 02/10 |
|---|---|---|
| `id` da DPS sai com o número zerado | [`GAP-MAP.md`](../operating-manual/GAP-MAP.md), "`id` [102] nunca refeito com o `nDPS` real" | ABERTO |
| Consultar, cancelar e webhook usam o ambiente do env, não o do documento | GAP-MAP, "DF-e — consultar, cancelar e webhook…" | ABERTO |
| Homologação e produção consomem a mesma sequência | GAP-MAP, "DPS — numeração não separada por ambiente" | ABERTO |
| O portal pode não entregar o XML do evento de cancelamento | [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) §4 F-FE-DFE-9 e §5 PV-1 | fork pendente |
| Falha de anexo depois da autorização perde o XML do retorno manual | [`BE-INCR-DFE-ANEXO-PENDENTE-brief.md`](BE-INCR-DFE-ANEXO-PENDENTE-brief.md) | BRIEF ratificado, falta "executa" |
| Releitura provada só com repositório falso | [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) §1 F2 e item 12 | teste de integração planejado |

## 5. O que este registro mudou em outros documentos

| Documento | Mudança |
|---|---|
| [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) §7 | achado A8 (entrega ao tomador) |
| [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md), "Achados fora de escopo" | item 4, com os três forks F-COB |
| Notas [`X10i`](../plano/nos/X10i.md), [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md) e [`D5`](../plano/gates/D5.md) | seção "Fold 02/10" no corpo; frontmatter intocado (nenhum estado mudou) |
| [`09-integracoes-e-ecossistema`](../plano/destino/09-integracoes-e-ecossistema.md) | duas marcas `⟨corr 02/10⟩`: emissão direta fora por decisão; entrega ao tomador sem decisão |
| [`README.md`](README.md) §6 | linha para este mapa |

## 6. Limites e autoverificação (OPS-001)

1. **Objetivo:** dizer o que já existe, o que falta e o que não estava escrito — §2 e §3.
2. **Grau:** cada fato de §3 tem grau; §2 é V para o código e para a existência do documento citado.
3. **Caso adversarial tentado:** a primeira versão desta resposta, feita por busca de palavra-chave, dava 3 itens
   como "não documentados" que estavam documentados (validade do A1, regra de município, XML do adaptador). A
   leitura integral corrigiu os três. O item 13 foi relido procurando o mesmo erro (campo de contato no leiaute,
   envio pelo parceiro, download para repassar) e continuou sem registro.
4. **Checagem que teria falhado:** `node scripts/plano-vault.mjs check` (links das notas tocadas) e a busca de
   `nodemailer|sendMail|createTransport|smtp|whatsapp` em `server/src` fora de testes. Ela devolve um único
   arquivo, `CampaignsModule.ts`, onde "WhatsApp" é rótulo de canal de campanha, não transporte.
5. **Não lido por inteiro:** `GAP-MAP.md` (só as linhas de DF-e), `D-2026-09-29` (só os fatos do cliente), a
   transcrição do leiaute, as cédulas e o `SDD-LUMINARIS.md`. "Não estava documentado" vale para o conjunto lido.

**Vieses (T8):** as três recomendações de §3 escolhem o menor diff, e o dono já disse preferir completude — por isso
cada uma diz o que a reabre. A classificação de §2 conta teste de serviço como "exercitado"; por um critério de
ponta a ponta, os itens 3, 8 e 9 seriam NÃO TEM.
