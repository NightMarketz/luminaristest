# BE-INCR-NFCE-OFFLINE-CAIXA — NFC-e off-line gerada no caixa quando o servidor do Luminaris está fora

> `sessao-planejamento`, 2026-10-31. Base: branch `claude/x10a-emenda-assinador-local-d3a515` (PR #995, só docs, não
> mergeado), que empilha sobre o #993. Frente nova do nó [`X10a`](../plano/nos/X10a.md), filha da
> [`EMENDA-4`](BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md) (F-AL-4 → b). **Sem código.** Implementar exige `executa`
> próprio (ORCH-006).
>
> **Autorização, literal:** [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 3. Dono, chat, 30/10/2026, questionário
> sobre a cédula `X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30` §3: *"Abrir frente nova"*. A decisão diz que a frente "precisa de
> BRIEF próprio (planejamento)". **Cobre só este BRIEF.** Não é `executa`, não ratifica fork e não autoriza merge.
>
> **Forks: todos PENDENTES** (§6). Nenhum foi decidido nesta sessão.
>
> **Em duas linhas:** quando o caixa não alcança o servidor, o assinador local monta, numera numa **série só dele**,
> assina e imprime a NFC-e `tpEmis=9`. Na volta da conexão, ele manda a nota pronta, e o servidor cria a venda, lança no
> razão pelo caminho normal e transmite pelo job do PR-9. **Risco principal:** a regra fiscal passa a rodar também no
> desktop. Se a cópia divergir do servidor, a nota impressa ao consumidor fica diferente da que o servidor monta e
> confere. Em SP, um número reservado e não usado não tem mais inutilização (Aj. SINIEF 38/26) e vira presunção de nota
> não transmitida. Por isso F-OFF-2 e F-OFF-3 decidem a frente.

## 0. Formulário (contexto fixo)

- **Item a planejar:** F-AL-4 (b) da EMENDA-4. O assinador "monta e numera a NFC-e off-line (série própria de
  contingência) quando o caixa não alcança o Luminaris, e sincroniza depois" ([[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]]
  item 3).
- **Autorização:** a citação acima. **Confere com o item.** Ela abre o planejamento desta frente e nada mais. O checklist
  AL-1..AL-24 da EMENDA-4 não muda (F-AL-4 na EMENDA-4 §6). Sem divergência de escopo.
- **Insumos lidos:**
  - Cédula [`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../plano/gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md) §3 e
    a decisão que a fecha.
  - EMENDA-4 §1–§6 (figura, AL-1..AL-24, contratos §4.1–§4.3, F-AL-0..11).
  - Dossiê [`nfce-sp-contingencia`](../../pesquisas-legais/nfce-sp-contingencia/relatorio.md): Aj. SINIEF 19/16 cl. 11ª
    §§ 1º–3º; Portaria SRE 40/2024 art. 6º.
  - **Dossiê novo desta sessão:** [`nfce-offline-caixa-serie`](../../pesquisas-legais/nfce-offline-caixa-serie/relatorio.md).
    É o Aj. SINIEF 19/16 baixado do CONFAZ em 31/10 (sha256 `6692d344…`). Cobre a cl. 4ª § 1º III (revogada), § 2º,
    a cl. 11ª § 5º e a cl. 16ª § 6º (Aj. 38/26).
  - [[D-2026-10-29-X10A-PR7-9-FORKS]] decisões 4 e 6–10, lidas na cabeça `e093a246` do #992.
  - Transcrição `TRANSCRICAO-NFCe-QRCode-contingencia-2026-10-29.md` (#992): §1(b)–(c) QR off-line, §3.1–§3.3 (MOC 7.0
    Anexo IV pp. 7–12) e §4 (divergências).
  - `BE-INCR-NFCE-brief.md` `[NFE-SERIE]`: série 000–889 do aplicativo da empresa, "controlada pelo emitente" (MOC VG
    §2.2.8).
  - **Código em `main`** (lido, não alterado): `models/nfeMontagem.ts` (`montarNfe` puro → `NfePayloadSemNumeracao`,
    `numerarNfe`, `gerarCnf`, `destNfce`, `limitesNfce`); `FiscalDocumentSequence` (`@@id([userId, unitId, kind, ambiente,
    serie])`); `IFiscalDocumentRepository.nextNumber` (dentro da tx do `SENT`);
    `sync/bridges/SaleSalesAccountingBridge.ts` (a venda é linha DynamicTable `sales`; receita lançada **pós-commit** pelo
    controller do motor, com idempotência no `PostingService`).
  - **Código no #992, não mergeado:** `NfceContingenciaService` (estado por unidade e ambiente, `paraContingencia`,
    `aoFalharComunicacao`, `tick` que transmite as `CONTINGENCY`, alerta de prazo e órfãs) e `models/nfceContingencia.ts`
    (`emContingencia`, `semNumeracao`, `prazoTransmissao`, `alertaDePrazo`, `suplDoXml`). Também `dfe/sefaz/nfceQrCode.ts`
    (`baseAssinavelQrV3Offline`, `qrCodeV3Offline`, `qrCodeV2Offline`), migração `20261029200000_nfce_contingencia` e a
    coluna `fiscal_documents.contingenciaSuplJson`.
- **Nós vizinhos:** consome a EMENDA-4 inteira (pareamento AL-3/AL-4, fila AL-6, assinatura AL-19, transporte AL-20 e o
  pacote do assinador AL-18) e o PR-9 (#992). A venda e o razão são do motor DynamicTable `sales` e da ponte
  `SaleSalesAccountingBridge`. Este BRIEF não altera nenhum dos dois, só os chama de fora. A tela de pareamento é do
  `FE-INCR-NFCE-ASSINADOR` (decisão 4 da mesma cédula).

## 1. O que muda, e o que não muda

| Peça | EMENDA-4 + PR-9 | Com esta frente |
|---|---|---|
| Servidor de pé, SEFAZ fora | servidor monta `tpEmis=9`, assinador assina, job do PR-9 transmite | **igual** |
| Servidor de pé, assinador fora | `PENDING_SIGNATURE` (F-AL-6 a) | **igual** |
| **Caixa sem o servidor** | sem venda pelo Luminaris (F-AL-4 a) | o assinador **monta, numera, assina e imprime** a NFC-e `tpEmis=9` e guarda o XML |
| Numeração | só o servidor (`FiscalDocumentSequence`) | o servidor nas séries dele; **o caixa numa série reservada a ele** (F-OFF-2) |
| Regra de montagem | só em `server/` | `server/` continua a fonte; o caixa roda a **mesma** regra (F-OFF-3) |
| Venda e razão | venda criada no app web; receita pela ponte pós-commit | venda criada **na sincronização**, pela mesma ponte (F-OFF-4) |
| Transmissão da off-line | job do PR-9 (`tick`) | job do PR-9, com o documento já chegando em `CONTINGENCY` (F-OFF-8) |

**Precedência:** esta frente estende o §2 da EMENDA-4 ("toda regra fiscal fica no servidor") **só** para o modo
off-line, e só se F-OFF-3 for ratificado. A EMENDA-4 e as decisões de 29/10 continuam valendo em tudo o que não está
nesta tabela.

**Consequência do AL-4 (ratificado):** só pode haver **um assinador ativo por unidade**, e o off-line só emite na
máquina onde está o token. Se a unidade tem dois caixas, só um vende off-line. Fica registrado, não é fork, porque mudar
isso é reabrir o F-AL-3.

## 2. Desenho em uma figura

```
caixa (Windows, assinador .NET 8)                                   VPS (server/)
┌───────────────────────────────────────────┐                      ┌──────────────────────────────────────┐
│ on-line: AL-7 long-poll (EMENDA-4)        │ ◀── snapshot ──────  │ GET  /dfe-assinador/v1/offline/       │
│                                           │                      │      snapshot  (produtos, perfis,     │
│ servidor inacessível > N s  (F-OFF-1)     │                      │      emitente, linhas legais, QR)     │
│  └▶ PDV mínimo (F-OFF-9)                  │                      │                                      │
│      └▶ montagem do bundle (F-OFF-3)      │                      │                                      │
│          └▶ nº = último+1 da série do     │                      │ série do caixa reservada (OFF-1):     │
│             caixa, com diário (F-OFF-2)   │                      │  nextNumber() do servidor recusa      │
│          └▶ assina infNFe + QR (token)    │                      │                                      │
│          └▶ DANFE impresso (F-OFF-7)      │                      │                                      │
│ reconexão ───── lote em ordem de número ─▶│ ──────────────────▶  │ POST /dfe-assinador/v1/offline/notas  │
│                                           │                      │  confere série, nº, chave, assinatura │
│                                           │                      │  cria venda `sales` + FiscalDocument │
│                                           │                      │  CONTINGENCY na mesma tx (F-OFF-4)    │
│                                           │                      │  pós-commit: ponte lança a receita    │
│                                           │ ◀── TRANSMITIR ────  │  tick do PR-9 transmite (F-OFF-8)     │
└───────────────────────────────────────────┘                      └──────────────────────────────────────┘
```

## 3. Checklist de comportamentos

Marcadores: `[direto]` sem fork · `[fork:F-OFF-n]` vale o ramo recomendado **se** o dono ratificar · `[cond:…]` só existe
num ramo · `[legal:…]` regra com artefato citado. Numeração OFF-n, para não colidir com AL-n nem com E-n.

### Fase S — servidor (`server/`, cadeia Route → Controller → Service → Repository → Prisma + Policy)

- **OFF-1 [fork:F-OFF-2] Série do caixa reservada.** Usuário com a policy do perfil fiscal reserva, para um dispositivo
  pareado, uma série NFC-e por ambiente (faixa 0–889, `[NFE-SERIE]`). A reserva fica em `DfeSignerOfflineSeries`
  (contrato §4.3). Guardas na mesma tx: a série não pode ser a `nfceSerie` do `FiscalProfile` nem ter número já emitido
  pelo servidor em `FiscalDocumentSequence`, e não pode estar reservada a outro dispositivo. `nextNumber` passa a recusar
  série reservada (`dfe_serie_reservada_ao_caixa`), e o `FiscalProfile` recusa trocar a `nfceSerie` para ela. *Teste:* as
  três recusas; `nextNumber` na série reservada ⇒ erro nomeado, nunca número. `[legal]` série própria é lícita e não
  obrigatória: cl. 4ª § 1º III **revogada** pelo Aj. 26/19 [dossiê `nfce-offline-caixa-serie` D01]; Anexo IV p. 7 "não é
  necessária a adoção de série específica".
- **OFF-2 [fork:F-OFF-6] Snapshot do cadastro para o caixa.** `GET /api/dfe-assinador/v1/offline/snapshot` (Bearer de
  dispositivo, AL-5) devolve o `OfflineSnapshot` (§4.2) da unidade: emitente, CRT, `codMun`, produtos ativos com preço e
  `ProductFiscalProfile`, `tPag` aceitos, linhas legais que a montagem lê (limites da NFC-e e `RTC_SIMPLES_DESDE`), URLs do
  QR (`nfceQrCode.data.json`) e o modo de QR (OFF-14). O snapshot leva `versao` (hash do conteúdo), `geradoEm` e
  `validoAte`. Com `If-None-Match` igual ⇒ 304. O servidor **guarda cada versão** servida (`DfeOfflineSnapshot`), porque
  a conferência OFF-6 remonta com a versão que o caixa usou. *Teste:* produto sem perfil fiscal fica fora com motivo
  listado; 304 com a mesma versão; o snapshot não traz custo, cliente nem segredo, exceto o CSC no ramo `[cond:F-OFF-7 c,
  v2]`.
- **OFF-3 [direto] Heartbeat com o estado off-line.** O `Heartbeat` da EMENDA-4 (§4.2) ganha `offline: {serie, ultimoNumero,
  pendentes, dhEmiMaisAntiga?}`. O servidor grava esses campos no dispositivo. É o que deixa o servidor alertar sobre
  nota que ainda não chegou (OFF-9). *Teste:* o heartbeat grava; `ultimoNumero` menor que o maior já recebido ⇒ alerta
  `dfe.offline.diario_regrediu` (o caixa perdeu o diário).
- **OFF-4 [direto] Recepção do lote.** `POST /api/dfe-assinador/v1/offline/notas` recebe até 50 notas em ordem crescente
  de número (§4.2). Para cada nota, **antes** de gravar, o servidor confere:
  - série reservada a **este** dispositivo e ambiente do pareamento;
  - `tpEmis = 9`, `mod = 65`, `dhCont` e `xJust` presentes (Anexo IV p. 9; rej. 557);
  - a chave recalculada a partir do `ide` bate com o `Id` (`[NFE-CHAVE]`);
  - a assinatura passa no `verifyNfeSignature` (`lib/nfeSignature.ts`, já em `main`), e o certificado tem o
    `certThumbprint` do dispositivo;
  - o QR e a `urlChave` passam no `InfNFeSuplSchema` (#992).

  Recusa nomeada por nota (`dfe_offline_*`); uma nota recusada não derruba as outras do lote. A idempotência é por
  `offlineId` (UUID gerado no caixa): o mesmo id com o mesmo hash ⇒ 200 sem efeito; com hash diferente ⇒ 409. *Teste:*
  cada recusa; reenvio do lote inteiro ⇒ zero efeitos novos; nota de outro dispositivo ⇒ recusa.
- **OFF-5 [fork:F-OFF-4] Reconciliação: venda, documento e razão.** `NfceOfflineSyncService` (accounting, Prisma
  first-class), chamado pelo controller da rota OFF-4. Ele **não** é plugin nem regra do motor (Contrato §2.1). Numa tx
  só:
  1. cria a venda na tabela `sales` (e `sale_items`) pelo `DynamicTableService` com `options.tx`, com `status =
     'Finalized'`, os itens, o `paymentMethod` e o cliente (F-OFF-5);
  2. cria o `FiscalDocument` NFCE com `origem = 'CAIXA_OFFLINE'`, `offlineId`, série, número, `status = 'CONTINGENCY'`,
     `contingenciaSuplJson` (o QR que foi impresso) e a tentativa 1 com o **XML do caixa como veio**, sem remontar;
  3. grava o número recebido em `DfeSignerOfflineSeries.ultimoRecebido`.

  Depois do commit, o controller chama `maybeSyncSaleFinalized`, a mesma ponte do motor. A receita entra no razão como em
  qualquer venda finalizada, e o job de reconciliação refaz a ponte se ela falhar. *Teste:* o lote de uma nota gera uma
  venda, um documento e um lançamento; a ponte com falha não desfaz a venda e o job refaz uma vez; o reenvio não duplica
  nada (`@@unique` do `PostingService` + `offlineId`).
- **OFF-6 [fork:F-OFF-3] Conferência por remontagem.** Depois do commit, o servidor roda `montarNfe` com a venda criada
  e a **versão do snapshot** que o caixa declarou, e compara com o `infNFe` recebido (fora `Id`, `cNF`, `cDV`, `dhEmi`,
  `dhCont`, `xJust`). Se divergir, alerta `dfe.offline.divergencia` com os campos divergentes (sem valor de CPF). **A nota
  não é reescrita**: ela já foi emitida na impressão do DANFE (cl. 11ª § 1º IV "a"). *Teste:* fixture idêntica ⇒ sem
  alerta; preço alterado à mão no XML (com assinatura refeita no teste) ⇒ alerta com `vProd`.
- **OFF-7 [fork:F-OFF-8] Transmissão pelo job do PR-9.** O documento nasce `CONTINGENCY`, e o `tick` do
  `NfceContingenciaService` o transmite pela fila `TRANSMITIR` (AL-9), sem código novo de transmissão. O prazo continua o
  do `prazoTransmissao(dhEmi)`, e o alerta, o da decisão 9. Rejeitada ⇒ decisão 10: mesmo número e série, cNF novo, nova
  assinatura pelo `ASSINAR` (AL-8), agora com o assinador on-line. *Teste:* a nota do caixa é transmitida no tick e
  autorizada; rejeitada ⇒ mesmo número, chave nova.
- **OFF-8 [legal:cl. 11ª § 5º + cl. 16ª § 6º] Buraco na série do caixa.** Para cada série reservada, o servidor confere se
  os números recebidos são contíguos desde o primeiro. Um buraco é alerta `dfe.offline.buraco` com a série e a faixa.
  **Não** gera pedido de inutilização em SP: desde 01/11/2026 ele "não se aplica" a AC, BA e SP (Aj. 38/26), e o
  servidor já trata isso pela E3-1 (c) (a SEFAZ decide). O alerta existe porque, a partir do 11º dia do mês seguinte, o
  buraco sem inutilização é presumido nota "emitida em contingência e não transmitida" (cl. 11ª § 5º). *Teste:* números
  1, 2, 4 ⇒ alerta com a faixa [3, 3]; a chegada do 3 fecha o alerta.
- **OFF-9 [direto] Alerta (gate F-OBS-14).** O `DfeSignerHealthScheduler` (AL-15) ganha dois casos:
  - (d) heartbeat com `pendentes > 0` e `dhEmiMaisAntiga` perto do prazo (mesma regra das 4 h da decisão 9);
  - (e) dispositivo **sem heartbeat** cuja série tem `ultimoNumero` (último informado) acima de `ultimoRecebido`. Nesse
    caso o servidor só sabe que há nota no caixa, não o prazo, e alerta por dia útil.

  *Teste:* os dois casos, com relógio injetado; o teste do scheduler já descobre o arquivo.
- **OFF-10 [direto] Observabilidade e auditoria.** Eventos no `LOG_EVENTS`: `dfe.offline.synced`, `dfe.offline.recusada`,
  `dfe.offline.divergencia`, `dfe.offline.buraco`, `dfe.offline.diario_regrediu`, `dfe.offline.snapshot_served`. Na
  allowlist do `auditCanonical.ts`: `dfe_offline_series.reserved` e `dfe_offline_series.released`. **PII:** a nota traz
  CPF/CNPJ e nome do destinatário (F-NFCE-7 b exige o documento). Log e auditoria levam só `offlineId`, série, número e
  chave; nunca o XML, o `dest`, nem o snapshot (OBS-R7). *Teste:* o guarda de PII da allowlist reprova campo novo sem
  guarda; snapshot de log sem CPF.
- **OFF-11 [direto] Gates que o diff aciona:** snapshot de shape dos DTOs, guard de path-count do openapi,
  `accountingResetClassification` e `resetDb` (tabelas novas), `check:arch` do `server/`, `tsc` e `test:types`. O JSON
  Schema gerado do Zod (AL-17) ganha `dfeOffline.schema.json`, e o teste falha se o gerado divergir do commitado.

### Fase M — a regra compartilhada (só no ramo recomendado do F-OFF-3)

- **OFF-12 [cond:F-OFF-3 b] Bundle da montagem.** Um script de build gera `assinador/montagem/montagem.bundle.js` a
  partir dos módulos **puros** do servidor: `nfeMontagem.ts`, `nfceContingencia.ts` (`emContingencia`), `numerarNfe`, o
  cálculo da chave, `lib/nfeXml.ts` (`serializeNfe`) e `nfceQrCode.ts`. O bundle sai com sha256 e versão, e é commitado ao
  lado do assinador. O build falha se algum desses módulos importar Prisma, `fs`, rede ou o relógio sem injeção. O caixa
  só roda o bundle: não há montagem escrita à mão em C#. *Teste:* um teste em `server/` falha se o bundle commitado não
  for o gerado agora (mesmo padrão do JSON Schema da AL-17).
- **OFF-13 [cond:F-OFF-3 b] Fixtures douradas dos dois lados.** Um conjunto de vendas de exemplo (`server/test/fixtures/
  offline/*.json`, com snapshot, venda, número e cNF fixos) produz um XML esperado. O Jest do servidor e o teste do
  assinador (rodando o bundle no motor embarcado) têm de chegar ao **mesmo byte**. *Teste:* o job Windows (AL-23) roda as
  fixtures e falha com uma fixture trocada (gate na condição que falha).

### Fase L — assinador local (pacote da EMENDA-4, F-AL-1 a: .NET 8)

- **OFF-14 [fork:F-OFF-7] QR off-line.** O snapshot traz `qr: {modo: 'v3' | 'v2', ...}`. O servidor aprende o modo com a
  última autorização da UF (rej. 407 ⇒ `v2`; transcrição §4 item 3). Com `v3`, o caixa assina com o token a base dos
  parâmetros 1–7 (`baseAssinavelQrV3Offline`) e monta o 8º parâmetro. Sem CSC no caixa. Com `v2`, usa o CSC do snapshot,
  guardado com DPAPI, e o `DigestValue` (`qrCodeV2Offline`). *Teste:* os dois modos com o vetor do Manual do DANFE v6.0
  (transcrição §1(b)–(c)); `v3` sem token presente ⇒ venda recusada antes de numerar.
- **OFF-15 [fork:F-OFF-1] Entrada e saída do modo off-line.** O assinador entra no modo off-line quando o long-poll falha
  por N segundos seguidos (proposta: 30 s, três tentativas) **e** o snapshot está dentro do `validoAte`. Ele grava
  `dhCont` (a hora da entrada) e o `xJust` fixo `"Sem comunicacao com o sistema emissor do contribuinte"` (15–256, B29).
  Sai quando um poll volta 200, e a partir daí a venda nova volta a ser pelo servidor. *Teste:* entrada após 3 falhas;
  snapshot vencido ⇒ não entra (mostra "sem venda off-line: cadastro desatualizado"); saída no primeiro poll bom.
- **OFF-16 [fork:F-OFF-9] PDV mínimo.** É uma janela do assinador, usada só no modo off-line: busca de produto do
  snapshot, quantidade, CPF/CNPJ (DV conferido; sem documento ⇒ sem NFC-e, pelo F-NFCE-7 b), forma de pagamento do
  snapshot e o total. A janela não tem desconto nem cancelamento (OFF-21). *Teste:* venda sem documento ⇒ recusa; produto
  fora do snapshot não aparece.
- **OFF-17 [fork:F-OFF-2] Numeração com diário (write-ahead).** O diário local é um SQLite cifrado com DPAPI. A ordem é:
  1. monta a nota (OFF-12) com o número `ultimoGravado + 1` da série do caixa;
  2. assina `infNFe` e o QR;
  3. grava no diário, **numa transação local só**, o número, o XML assinado e o `offlineId`;
  4. imprime.

  Se cair antes do passo 3, o número não foi usado e não há buraco, porque a sequência só anda no commit. Se cair depois
  do 3, o assinador reimprime na próxima abertura. O número commitado nunca volta. Diário ausente ou corrompido ⇒ o modo
  off-line fica bloqueado até um heartbeat on-line devolver o `ultimoRecebido` do servidor. *Teste:* processo morto entre
  2 e 3 ⇒ o próximo número é o mesmo, sem buraco; morto entre 3 e 4 ⇒ reimprime; diário apagado ⇒ off-line recusado.
- **OFF-18 [fork:F-OFF-7] DANFE NFC-e impresso.** O assinador imprime em impressora térmica com papel de largura ≥ 56 mm
  (cl. 10ª § 2º I [dossiê `nfce-offline-caixa-serie` D01]), no leiaute do Manual do DANFE NFC-e v6.0. O texto obrigatório
  da contingência sai do manual (insumo ausente 2) e entra no bundle como dado, não à mão. *Teste:* render do leiaute em
  texto contra fixture; o QR impresso é o mesmo `qrCode` do `infNFeSupl` gravado.
- **OFF-19 [direto] Guarda do XML.** O XML fica no diário até o servidor responder 200 com o `documentId`. Depois disso,
  o caixa mantém só o resumo: chave, número, hash e a data do envio. A guarda eletrônica substitui a via em papel
  (RC 34105/2026 ementa II, dossiê `nfce-sp-contingencia` [D03]); no caixa, ela vale só até o servidor assumir. *Teste:*
  sem 200 o XML fica; com 200 o XML sai e o resumo fica.
- **OFF-20 [direto] Sincronização.** No primeiro poll bom, o assinador manda os pendentes em ordem de número, em lotes de
  50, e reenvia com o mesmo `offlineId` até receber 200 ou uma recusa nomeada. A nota recusada fica no diário com o
  motivo, e o servidor alerta (OFF-10). *Teste:* contra um servidor falso, a queda no meio do lote termina sem duplicata
  e sem perda.
- **OFF-21 [direto] Sem cancelamento no caixa.** A nota off-line só é cancelada depois de autorizada, pelo servidor
  (110111/110112 do PR-5 e do PR-9). O caixa não tem botão de cancelar. *Teste:* revisão estática (o pacote não tem
  evento de cancelamento).
- **OFF-22 [cond:F-OFF-8 c] Transmissão de emergência.** Faltando menos de 4 h para o prazo (`prazoTransmissao` no
  bundle), se o servidor ainda está fora **e** a SEFAZ responde, o assinador transmite a nota pelo `TRANSMITIR` local
  (AL-20). Ele guarda a resposta crua, sem interpretar o `cStat`, e a manda junto no lote. O servidor aplica essa
  resposta pelo `applyResult` existente. *Teste:* com relógio injetado, a nota perto do prazo é transmitida e a resposta
  chega ao servidor; longe do prazo, nada sai.

### Fase R — runbook (gate humano; o agente prepara, o dono executa e assina)

- **OFF-23 [direto] Passos no `RUNBOOK-D5-A3-ASSINADOR-LOCAL.md` (AL-24):**
  1. tirar o cabo de rede do caixa e vender off-line;
  2. conferir o DANFE impresso (texto de contingência e QR legível no celular);
  3. religar o cabo e ver a nota autorizada em homologação;
  4. conferir a venda e o lançamento no razão;
  5. desligar o processo no meio de uma venda e conferir que não sobra buraco na série.

## 4. Contratos (esboço materializável)

### 4.1 Porta da montagem compartilhada (ramo F-OFF-3 b)

```ts
// server/src/features/accounting/models/offline/montagemOffline.ts — entrada única do bundle (OFF-12)
export interface VendaOffline {
  offlineId: string;                         // UUID v4 gerado no caixa
  itens: Array<{ productRef: string; qty: number; vProdCents: number }>;
  dest: { CPF?: string; CNPJ?: string; xNome?: string };   // obrigatório (F-NFCE-7 b)
  paymentMethod: 'Cash' | 'Credit Card' | 'Debit Card' | 'Pix';   // chaves de TPAG_POR_METODO
}
export interface MontagemOfflineInput {
  snapshot: OfflineSnapshot;                 // §4.2
  venda: VendaOffline;
  serie: number; numero: number; cNF: string;
  dhEmi: string; dhCont: string; xJust: string;
}
/** Pura: snapshot + venda → montarNfe → emContingencia → numerarNfe. Mesma função no Jest e no caixa. */
export function montarNfceOffline(i: MontagemOfflineInput): NfePayload;
export function serializarParaAssinar(p: NfePayload): { infNFeXml: string; digestSha1B64: string; signedInfoC14nB64: string };
```

### 4.2 Protocolo (versão `v1` da EMENDA-4 §4.2; Zod `.strict()`)

```ts
// dtos/DfeOfflineDto.ts
export const OfflineSnapshot = z.object({
  versao: z.string().length(64),             // sha256 do conteúdo canônico
  geradoEm: z.string().datetime(), validoAte: z.string().datetime(),   // F-OFF-6
  ambiente: z.enum(['producao', 'homologacao']),
  unitId: z.string(),
  emit: z.object({ cnpj: z.string().length(14), razaoSocial: z.string(), ie: z.string(), logradouro: z.string(),
    numero: z.string(), complemento: z.string().nullable(), bairro: z.string(), municipio: z.string(), cep: z.string(),
    codMun: z.string().length(7) }).strict(),
  crt: z.literal(1),                         // montarNfe só aceita CRT 1 hoje
  produtos: z.array(z.object({ productRef: z.string(), xProd: z.string(), precoCents: z.number().int().nonnegative(),
    perfil: z.object({ ncm: z.string(), cest: z.string().nullable(), origem: z.number().int(), cfopPadrao: z.string(),
      csosn: z.string().nullable(), uCom: z.string(), cEan: z.string(), cstPis: z.string(), cstCofins: z.string() }).strict(),
  }).strict()),
  foraDoSnapshot: z.array(z.object({ productRef: z.string(), motivo: z.string() }).strict()),
  tPag: z.record(z.string(), z.string()),    // TPAG_POR_METODO
  legal: z.object({ limitesNfce: z.unknown(), rtcSimplesDesde: z.string(), feriados: z.array(z.string()) }).strict(),
  qr: z.discriminatedUnion('modo', [
    z.object({ modo: z.literal('v3'), qrCodeBase: z.string(), urlChave: z.string() }).strict(),
    z.object({ modo: z.literal('v2'), qrCodeBase: z.string(), urlChave: z.string(),
      csc: z.object({ id: z.string(), cscCifrado: z.string() }).strict() }).strict(),   // F-OFF-7 c; cifrado p/ o dispositivo
  ]),
  serie: z.number().int().min(0).max(889),   // a série reservada (OFF-1)
  bundle: z.object({ versao: z.string(), sha256: z.string().length(64) }).strict(),
}).strict();

export const OfflineHeartbeat = z.object({   // acrescido ao Heartbeat da EMENDA-4
  serie: z.number().int(), ultimoNumero: z.number().int().nonnegative(),
  pendentes: z.number().int().nonnegative(), dhEmiMaisAntiga: z.string().datetime({ offset: true }).optional(),
}).strict();

export const OfflineNota = z.object({
  offlineId: z.string().uuid(),
  snapshotVersao: z.string().length(64),
  serie: z.number().int(), numero: z.number().int().positive(), chave: z.string().regex(/^\d{44}$/),
  nfeXmlB64: z.string().max(2_000_000),      // NFe assinada com infNFeSupl, exatamente como foi impressa
  venda: VendaOfflineSchema,                 // §4.1, para criar a venda sem parsear o XML
  respostaSefazB64: z.string().optional(),   // [cond:F-OFF-8 c] resposta crua da transmissão de emergência
}).strict();
export const OfflineLote = z.object({ notas: z.array(OfflineNota).min(1).max(50) }).strict();
export const OfflineLoteResposta = z.object({ resultados: z.array(z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), offlineId: z.string(), documentId: z.string(), saleId: z.string(), repetida: z.boolean() }).strict(),
  z.object({ ok: z.literal(false), offlineId: z.string(),
    code: z.enum(['dfe_offline_serie_alheia', 'dfe_offline_chave_divergente', 'dfe_offline_assinatura_invalida',
                  'dfe_offline_certificado_alheio', 'dfe_offline_tpemis', 'dfe_offline_supl_invalido',
                  'dfe_offline_snapshot_desconhecido', 'dfe_offline_conflito']) }).strict(),
])) }).strict();
```

Rotas (2 toques: `routes/accounting.ts` + doc em `routes/docs/`):

| Método e caminho | Quem | Efeito |
|---|---|---|
| `PUT /api/accounting/dfe-assinador/:unitId/serie-offline` | usuário, policy do perfil fiscal | reserva a série (OFF-1) |
| `DELETE /api/accounting/dfe-assinador/:unitId/serie-offline` | idem | libera a série; só sem pendente (soft-delete) |
| `GET /api/dfe-assinador/v1/offline/snapshot` | assinador, Bearer | OFF-2 |
| `POST /api/dfe-assinador/v1/offline/notas` | assinador, Bearer | OFF-4, OFF-5 |

### 4.3 Persistência (Prisma first-class: documento fiscal e numeração, Contrato §2.1)

```prisma
model DfeSignerOfflineSeries {
  id              String    @id @default(cuid())
  userId          String
  unitId          String
  deviceId        String
  ambiente        String                         // producao | homologacao
  serie           Int
  ultimoInformado Int       @default(0)          // heartbeat (OFF-3)
  ultimoRecebido  Int       @default(0)          // maior número sincronizado (OFF-5)
  createdAt       DateTime  @default(now())
  deletedAt       DateTime?
  @@unique([userId, unitId, ambiente, serie])    // uma série, um dono (inclusive depois de liberada: nunca reusar)
  @@map("dfe_signer_offline_series")
}
model DfeOfflineSnapshot {                       // cada versão servida, para a remontagem (OFF-6)
  versao     String   @id                        // sha256
  userId     String
  unitId     String
  conteudo   String                              // JSON; sem CPF de cliente (o snapshot não tem cliente)
  createdAt  DateTime @default(now())
  @@index([userId, unitId])
  @@map("dfe_offline_snapshots")
}
// FiscalDocument: + origem String @default("SERVIDOR")  // SERVIDOR | CAIXA_OFFLINE
//                 + offlineId String? @unique
```

O `@@unique` da série **inclui as linhas soft-deleted**, de propósito. Memória `unique-de-idempotencia-x-soft-delete`:
aqui o P2002 ao reusar é o comportamento certo, porque número de série liberada não pode voltar a ser usado.

### 4.4 Assinador (.NET 8; nomes indicativos)

```csharp
interface IMotorMontagem { NotaMontada Montar(MontagemOfflineInput input); }      // roda o bundle (F-OFF-3 b)
interface IDiarioOffline {                                                          // SQLite + DPAPI (OFF-17)
  long ProximoNumero(int serie);
  void Gravar(long numero, string offlineId, byte[] xmlAssinado);                  // uma transação local
  IReadOnlyList<NotaPendente> Pendentes();
  void Confirmar(string offlineId, string documentId);                             // apaga o XML, mantém o resumo
}
interface IImpressoraDanfe { void Imprimir(DanfeLeiaute leiaute); }                 // ESC/POS, ≥ 56 mm (OFF-18)
```

## 5. Plano por fatias

| PR | Itens | Depende | Natureza |
|---|---|---|---|
| OFF-PR-0 (docs) | seção "modo off-line" no `ADR-ASSINADOR-LOCAL` (F-OFF-0), com F-OFF-1, 3 e 9 | AL-PR-0 + autorização "só ADR" | decisão estrutural |
| OFF-PR-1 (server) | OFF-1, OFF-2, OFF-3, OFF-11 (parte) | AL-PR-2; F-OFF-2, 6 | migração + rotas |
| OFF-PR-2 (server) | OFF-12, OFF-13 (lado servidor), `montagemOffline.ts` | OFF-PR-1; F-OFF-3 | bundle + fixtures |
| OFF-PR-3 (server) | OFF-4..OFF-8, OFF-10, OFF-11 (resto) | OFF-PR-2, AL-PR-3, #992 em `main`; F-OFF-4, 5, 8 | recepção + reconciliação |
| OFF-PR-4 (server) | OFF-9 | OFF-PR-3, AL-PR-4 | scheduler + alerta |
| OFF-PR-5 (assinador) | OFF-13 (lado caixa), OFF-14..OFF-21 | AL-PR-5, OFF-PR-2; F-OFF-1, 7, 9 | modo off-line |
| OFF-PR-6 (assinador) | OFF-22 | OFF-PR-5; F-OFF-8 = c | emergência |
| OFF-PR-7 (docs) | OFF-23 | OFF-PR-3, OFF-PR-5, AL-PR-7 | runbook em branco |

Nada daqui começa antes da EMENDA-4 ter AL-PR-3 e AL-PR-5 em `main`. O off-line usa o pareamento, a fila, a assinatura
local e o pacote do assinador como estão.

## 6. Forks — RATIFICAÇÃO PENDENTE

### F-OFF-0 — Onde registrar a decisão estrutural
O modo off-line contraria o §2 da EMENDA-4 ("o assinador só conhece duas primitivas") e põe regra fiscal num componente
fora de `server/`.
- **(a)** Uma seção "modo off-line" no `ADR-ASSINADOR-LOCAL` (AL-PR-0, ainda não escrito), com F-OFF-1, 3 e 9.
- **(b)** ADR próprio `ADR-NFCE-OFFLINE-CAIXA`.
- **(c)** Só este BRIEF.
- **Recomendação: (a).** É o mesmo componente, a mesma fronteira e o mesmo AL-PR-0. Um ADR à parte separaria duas
  decisões que se contradizem se lidas sozinhas ("só assina" × "monta"). **RATIFICAÇÃO PENDENTE.**

### F-OFF-1 — Quando o caixa entra no modo off-line
A cl. 11ª manda operar em contingência "quando em decorrência de problemas técnicos não for possível transmitir a NFC-e
[…] ou obter resposta" [dossiê `nfce-offline-caixa-serie` D01].
- **(a)** Só quando o caixa não alcança **nem o servidor nem a SEFAZ** (o assinador testa o `NFeStatusServico4` pelo
  AL-20). Com a SEFAZ no ar e o servidor fora, não há venda.
- **(b)** Sempre que o caixa não alcança o servidor, alcance ou não a SEFAZ, e a nota sai `tpEmis=9`.
- **(c)** Servidor fora e SEFAZ no ar ⇒ o caixa emite **normal** (`tpEmis=1`) direto na SEFAZ. Sem os dois ⇒ `tpEmis=9`.
- **Recomendação: (b).** (c) leva para o desktop o ciclo on-line inteiro: autorização, rejeição, nota sem resposta e
  110112. Isso é o que a regra 2 da casa e o F-AL-4 (a) tentavam evitar. (a) deixa o cliente sem vender justamente no
  caso mais comum (VPS fora com internet boa). A leitura de que "o sistema emissor do contribuinte fora" é problema
  técnico é **inferida**, não verificada (§7 item 1). **RATIFICAÇÃO PENDENTE.**

### F-OFF-2 — Como reservar a numeração do caixa sem colidir com o servidor
- **(a) Série exclusiva por dispositivo e ambiente** (OFF-1). O caixa numera em sequência própria, com diário
  write-ahead (OFF-17), e o servidor recusa usar a série.
- **(b) Faixa reservada (lease) dentro da série normal.** O servidor entrega ao caixa, por exemplo, 200 números da
  `nfceSerie`, e o que sobrar volta ao servidor.
- **(c) Série de contingência única por unidade**, dividida entre vários caixas.
- **Recomendação: (a).** É sem colisão por construção: o servidor não emite na série, e o caixa não emite em outra. A
  vedação de reusar em contingência número já transmitido como normal (cl. 11ª § 2º) fica satisfeita, porque a série do
  caixa nunca recebe nota normal. (b) cria buraco quando a faixa volta. Em SP, desde 01/11/2026, não há inutilização
  (cl. 16ª § 6º, Aj. 38/26), e o buraco vira presunção de nota não transmitida (cl. 11ª § 5º). (c) só faz sentido com
  vários caixas off-line, o que o AL-4 já impede. Série própria é lícita e não exigida: cl. 4ª § 1º III revogada [D01];
  Anexo IV p. 7. Lacuna: se a SEFAZ-SP limita o número de séries (cl. 4ª § 2º, §7 item 2). **RATIFICAÇÃO PENDENTE.**

### F-OFF-3 — Quanto da montagem vai para o desktop
- **(a) Cópia em C#** de `montarNfe`, `emContingencia`, numeração, chave, serialização e QR, com fixtures douradas
  compartilhadas para provar a igualdade.
- **(b) A mesma regra, gerada.** Os módulos puros do servidor viram um bundle JS (OFF-12), que o assinador roda num motor
  JS embarcado no .NET. As fixtures (OFF-13) provam o mesmo byte nos dois lados, e o CI recusa um bundle desatualizado.
- **(c) O servidor pré-monta** notas-modelo por produto, e o caixa só preenche quantidade e total.
- **Recomendação: (b).** Mantém **uma** regra escrita num lugar só (Contrato: regra única) e transforma o risco "regra
  fiscal no desktop" em teste de igualdade de bytes, não em disciplina de revisão. (a) dobra cada mudança fiscal futura:
  a NT da RTC de 2027 (`RTC_SIMPLES_DESDE`) teria de ser escrita duas vezes. (c) não fecha: o total, o `vProd` rateado e
  o QR dependem da venda inteira. Riscos de (b), **inferidos e não testados**: o motor embarcado (Jint, ClearScript ou
  Node como processo filho é sub-decisão do ADR) precisa de `node:crypto` (`randomInt`, `createHash`) e `Buffer` por
  shim, e `nfeMontagem.ts` importa `LinhaLegal`, cuja pureza o build tem de provar. **RATIFICAÇÃO PENDENTE.**

### F-OFF-4 — Como o servidor reconcilia e lança no razão a nota nascida fora dele
- **(a) A sincronização cria a venda** `sales` pelo `DynamicTableService` (com `options.tx`, chamado do serviço de
  integração, fora do motor) **e** o `FiscalDocument` `CONTINGENCY` na mesma tx. A receita entra pela ponte
  `SaleSalesAccountingBridge`, pós-commit, como em toda venda (OFF-5).
- **(b) Ponte nova a partir do documento fiscal:** a nota off-line lança a receita sem criar venda.
- **(c) A venda só nasce quando a SEFAZ autoriza.**
- **Recomendação: (a).** O razão continua com **um** caminho de receita, e a idempotência fica no `PostingService` como
  já está. (b) cria um segundo caminho de receita, e uma venda que existe no razão mas não no módulo de vendas (o
  relatório de vendas e o caixa do dia não fechariam). (c) atrasa o razão, e a nota rejeitada e regerada
  (cl. 11ª § 1º III) deixaria a venda em suspenso, embora a operação já tenha acontecido. Fato de código: a ponte é
  invocada hoje pelo controller do motor, então o serviço de sincronização chama a mesma função exportada
  (`maybeSyncSaleFinalized`) e não mexe no `DynamicTableService` (STOP do CLAUDE.md). **RATIFICAÇÃO PENDENTE.**

### F-OFF-5 — O cliente da venda off-line
F-NFCE-7 (b), ratificado: sem CPF/CNPJ, sem NFC-e. Logo, a venda off-line exige o documento do adquirente.
- **(a)** O documento é digitado no caixa, **sem cache de clientes**. Na sincronização, o servidor vincula ao cliente da
  unidade com o mesmo documento ou cria um cliente mínimo (nome + documento).
- **(b)** Cache dos clientes da unidade no snapshot.
- **(c)** (a), mas sem criar cliente: a venda fica sem `customerId` e o documento só no `dest` da nota.
- **Recomendação: (a).** Minimiza PII em disco no caixa (LGPD art. 6º III, necessidade; inferido, sem dossiê nesta
  sessão). Criar o cliente mantém a regra "vínculo do cliente = pedido do adquirente" de 26/10. (c) deixa uma venda sem
  cliente, que o resto do sistema não espera (insumo ausente 3). **RATIFICAÇÃO PENDENTE.**

### F-OFF-6 — Cadastro de produtos e preços em cache no caixa
- **(a) Snapshot versionado com validade** (OFF-2). Atualiza a cada poll quando a versão muda. Passado o `validoAte`, o
  caixa não entra em off-line. Preço = o do snapshot.
- **(b) Snapshot sem validade**, só a última versão.
- **(c) Preço digitado pelo operador** no off-line, com o perfil fiscal do snapshot.
- **Recomendação: (a), com `validoAte` = 72 h.** O número é proposta, a medir no runbook. A validade limita o tamanho
  do erro de preço e de perfil fiscal: uma NCM corrigida no servidor há uma semana não pode sair errada no caixa. (b)
  não tem esse limite. (c) põe o preço na mão do operador, e a remontagem (OFF-6) acusaria divergência em toda nota.
  **RATIFICAÇÃO PENDENTE.**

### F-OFF-7 — DANFE e QR v3 off-line impressos no caixa
- **(a) Só QR v3:** o token assina os parâmetros 1–7, sem CSC no caixa. Se a UF recusar v3 (rej. 407), a nota é
  rejeitada na transmissão e regerada com v2 pelo servidor, e o DANFE já impresso fica com um QR que não vale.
- **(b) Só QR v2:** CSC no caixa (DPAPI) e `DigestValue`.
- **(c) Adaptativo:** o snapshot traz o modo que a UF aceitou por último (aprendido pelo servidor). O CSC só desce no
  modo v2, cifrado para o dispositivo. O DANFE é impresso pelo assinador, com leiaute e texto do bundle (OFF-18).
- **Recomendação: (c).** A transcrição §4 item 3 deixa aberta a rej. 407 (ZX02-220) na NT 2025.001 v1.03. (a) pode
  imprimir QR inválido sem aviso. (b) põe o CSC em todo caixa, mesmo onde a v3 vale. O DANFE impresso pelo próprio
  assinador é consequência: o navegador não carrega sem o servidor. **RATIFICAÇÃO PENDENTE.**

### F-OFF-8 — Quem transmite a nota off-line e o que acontece se o servidor demorar
- **(a) Só o servidor**, depois da sincronização (OFF-7). Se o servidor ficar fora além do prazo, só há o alerta no
  caixa.
- **(b) O caixa transmite** sempre que a SEFAZ responder, interpreta o `cStat` e sincroniza o protocolo.
- **(c) (a) + emergência** (OFF-22): faltando 4 h para o prazo, com o servidor ainda fora e a SEFAZ no ar, o caixa
  transmite e manda a resposta crua para o servidor aplicar.
- **Recomendação: (c).** O prazo é o 1º dia útil seguinte (cl. 11ª § 1º II "a"). Uma VPS fora por um dia é rara, mas a
  consequência é infração. (c) cobre o prazo sem levar a interpretação do `cStat` para o desktop. (b) leva o ciclo de
  estados para o caixa. **RATIFICAÇÃO PENDENTE.**

### F-OFF-9 — Onde o operador vende quando o servidor está fora
O app web é servido pela VPS: sem o servidor, a tela de venda não abre.
- **(a) PDV mínimo na janela do assinador** (OFF-16), usado só no modo off-line.
- **(b) PWA com service worker no `my-app`**, falando com o assinador em `127.0.0.1`.
- **(c) Sem tela própria:** o off-line só conclui a venda que já estava aberta no navegador.
- **Recomendação: (a).** (b) repete o F-AL-2 (c), já descartado: Private Network Access do Chrome e regra no frontend.
  (c) não cobre a venda nova, que é o caso inteiro. A janela fica deliberadamente pobre: sem desconto, sem pacote e sem
  cancelamento. **RATIFICAÇÃO PENDENTE.**

## 7. Pendente de validação externa

1. **"Servidor do Luminaris fora" é problema técnico da cl. 11ª?** (F-OFF-1). O caput fala em não poder transmitir "ou
   obter resposta", sem dizer de quem é o problema [D01]. Leituras possíveis:
   - **ampla:** qualquer falha no sistema emissor do contribuinte conta. Então (b) é lícita;
   - **estrita:** só falha de comunicação com a SEFAZ conta. Então só (a) é lícita, e (b) vira emissão em contingência
     sem a hipótese legal.

   A cédula de 30/10 §3 leu como lícito gerar no caixa, mas tratou o caso sem internet, que é inequívoco. Pergunta exata
   ao contador: *"Com a internet do caixa funcionando e a SEFAZ no ar, mas o nosso servidor de emissão fora, podemos emitir
   NFC-e em contingência off-line (tpEmis=9)?"*.
2. **Limite de séries da NFC-e em SP** (cl. 4ª § 2º: "O Fisco poderá restringir a quantidade de séries"): ato da
   SEFAZ-SP não pesquisado.
3. **Texto obrigatório do DANFE em contingência e posição do QR** (Manual do DANFE NFC-e v6.0): transcrito no #992 só
   para o QR, não para o leiaute.
4. **Motor JS embarcado no .NET** (F-OFF-3 b): compatibilidade e desempenho não testados.
5. **Token presente na hora da venda off-line:** o QR v3 e a `infNFe` exigem o token. É o mesmo risco técnico da
   EMENDA-4 §7 item 2, agora sem servidor para mandar a nota para `PENDING_SIGNATURE`. Sem token, sem venda off-line.

## 8. Insumos ausentes (pausados — regra 2)

1. **As escritas que a venda de balcão on-line faz hoje** (linha `sales`, `sale_items`, pagamento por
   `RegisterPaymentService`, estoque). A OFF-5 tem de reproduzi-las na mesma ordem. Não varri o `my-app` nem o fluxo de
   pagamento; o executor lê antes do OFF-PR-3.
2. **Leiaute do DANFE NFC-e** (Manual v6.0, seções fora do QR) e se o repositório já renderiza DANFE NFC-e. O
   `DanfeDto` do #992 é da NF-e 55 (NFE-DANFE-IBSCBS).
3. **O que o sistema faz com venda sem `customerId`** (ramo F-OFF-5 c).
4. **Número de caixas do 1º cliente** (o mesmo insumo da EMENDA-4 §8 item 2): decide se a limitação do AL-4 dói.

## 9. Achados fora de escopo (não planejados)

1. **Estoque no off-line:** o caixa vende sem ver o saldo, e a sincronização pode deixar o estoque negativo. O
   tratamento é do módulo de estoque, não deste BRIEF.
2. **Pagamento off-line:** Pix e cartão dependem da maquininha ou do PSP, fora do Luminaris. Aqui só se registra o
   `paymentMethod`.
3. **Mais de um caixa off-line por unidade:** exige reabrir o F-AL-3 / AL-4 (um assinador por unidade).
4. **NF-e 55 off-line:** a contingência off-line é só da NFC-e (rej. 711 na 55, `emContingencia`). Fora.

## 10. Gates de envio [OPS-001]

1. **Objetivo:** a frase "o assinador monta, numera numa série só dele, assina e imprime; o servidor cria a venda, lança
   pelo caminho normal e transmite pelo job do PR-9" (cabeçalho) responde ao pedido de vender sem o servidor. Ela não
   reabre nada da EMENDA-4 nem do PR-9.
2. **Grau dos claims:**
   - **verificados** pela norma baixada hoje: série própria lícita e não exigida, buraco presumido como não transmitido,
     sem inutilização em SP desde 01/11/2026, papel ≥ 56 mm [D01];
   - **verificados por leitura de código:** venda = linha DynamicTable `sales` com ponte pós-commit (`main`), e
     `prazoTransmissao`, `emContingencia` e QR off-line no #992, que **não está em `main`**;
   - **inferidos:** a leitura ampla de "problema técnico" (§7 item 1) e o motor JS no .NET (§7 item 4);
   - **assumidos:** 72 h de validade, 30 s para entrar no off-line e 4 h para a emergência. São propostas, medidas no
     runbook.
3. **Caso adversarial tentado:** "faixa reservada na série normal é mais simples que série própria". Falha em SP: a
   faixa devolvida deixa buraco, e o buraco não tem mais inutilização (cl. 16ª § 6º) e vira presunção de nota não
   transmitida (cl. 11ª § 5º). Isso mudou a recomendação do F-OFF-2 para (a). Segundo caso: "o servidor remonta e
   corrige a nota do caixa". Falha porque a nota já foi emitida na impressão (cl. 11ª § 1º IV "a"), e daí a OFF-6 só
   alerta.
4. **Checagem que teria falhado:** se a regra de série exclusiva de contingência (séries 890–989 ou 501–999) estivesse
   vigente, a série "qualquer, 0–889" do OFF-1 estaria errada. A leitura do texto compilado mostrou "III - REVOGADO" com
   efeitos desde 18/12/2019, e as duas redações com séries específicas marcadas "sem efeitos" [D01].
5. **Duas primeiras linhas:** o bloco "Em duas linhas" dá o desenho e o risco principal (regra fiscal duplicada no
   desktop, e buraco sem inutilização em SP).
