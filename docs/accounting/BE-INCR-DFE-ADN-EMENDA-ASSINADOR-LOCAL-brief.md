# BE-INCR-DFE-ADN — EMENDA ASSINADOR LOCAL (NFS-e na Sefin Nacional assinada e transmitida pelo token do próprio prestador) — nó X10i

> `sessao-planejamento`, 2026-10-31. Base: branch `claude/x10a-emenda-assinador-local-d3a515` (PR #995, só docs, não
> mergeado), empilhada sobre `claude/d5-psc-ecnpj-decision-2331b3` (PR #993, só docs, não mergeado), sobre `origin/main`
> `b20c21e3`. Emenda o [`BE-INCR-DFE-ADN-EMISSOR-brief.md`](BE-INCR-DFE-ADN-EMISSOR-brief.md) (aqui "BRIEF-ADN") e
> reaproveita o protocolo da [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md)
> (aqui "EMENDA-4"). **Sem código.** Implementação exige `executa` próprio (ORCH-006).
>
> **Autorização, literal:** [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 1 — dono, questionário, 30/10/2026, à
> cédula [`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../plano/gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md) §1:
> *"Reabrir já"*. Texto da decisão: *"Planejar uma emenda do `BE-INCR-DFE-ADN-EMISSOR-brief.md` que troca a guarda do
> certificado pelo assinador local da EMENDA-4 … O portal segue valendo até a emenda ficar pronta e implementada."*
> **Cobre só este documento.** Não é `executa`, não ratifica fork, não autoriza merge.
>
> **Forks: todos com RATIFICAÇÃO PENDENTE (§6).** Os F-ADN-1..13 de 12/10 ficam com o estado que o §1 dá a cada um.
>
> **Em duas linhas:** o BRIEF-ADN volta sem a guarda: a DPS e o pedido de cancelamento são assinados, e o mTLS com a
> Sefin é aberto, pelo **mesmo assinador local** da NF-e/NFC-e, com o e-CNPJ do próprio prestador; o servidor continua
> montando, numerando e relendo. **Risco principal:** a NFS-e exige o certificado do **estabelecimento** (CNPJ de 14
> dígitos, FAQ 17.2/28.2), e o assinador da EMENDA-4 foi desenhado com vínculo por **raiz** (AL-4) — filial atendida pelo
> token da matriz emite NF-e, mas não NFS-e (F-ADL-3). O resto do risco é o da EMENDA-4: nada provou ainda que o token
> assina SHA-1 e serve de chave cliente no TLS do Windows; só o runbook A3 prova.

## 0. Formulário (contexto fixo)

- **Item a planejar:** nó [`X10i`](../plano/nos/X10i.md), emissão automática de NFS-e (BRIEF-ADN, PR-0..PR-4), na parte
  "onde mora a chave e quem abre o mTLS". Origem: [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 1.
- **Autorização:** a citação acima. **Confere com o item:** pede "uma emenda do `BE-INCR-DFE-ADN-EMISSOR-brief.md` que
  troca a guarda do certificado pelo assinador local", e é isso que este documento é. Não cobre a NFC-e off-line
  (item 3 da mesma decisão), nem o FE do assinador (item 4), nem a Reinf (item 2). Sem divergência de escopo.
- **O que a decisão supera e o que mantém:** supera, só no ponto "emissão automática de NFS-e só com o PAA", o item 2 do
  §1 de [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]. **Mantém o item 3** (o Luminaris não guarda certificado; o caminho
  de guarda do BRIEF-ADN segue arquivado) e o item 1 (portal desde 01/11/2026 até esta emenda ser implementada).
- **Insumos lidos:**
  - Decisões: [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]], [[D-2026-10-30-X10A-EMENDA-4-FORKS]],
    [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]], [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] (via EMENDA-4 §0).
  - Cédula [`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../plano/gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md) §1.
  - BRIEFs: BRIEF-ADN inteiro (§0–§11, F-ADN-1..13 de 12/10); [`BE-INCR-DFE-ADN-EMENDA-PSC-brief.md`](BE-INCR-DFE-ADN-EMENDA-PSC-brief.md)
    §0–§2 (superada em 12/10 e em 13/10; vale como registro do desenho em duas fases); EMENDA-4 inteira (AL-1..AL-24,
    contratos §4, forks §6).
  - Pesquisas: [`nfse-adn-certificado-numeracao`](../../pesquisas-legais/nfse-adn-certificado-numeracao/relatorio.md)
    ([D01] FAQ NFS-e v1.1 itens 17.2, 17.7, 18.5, 28.2 — **lidos no texto do dossiê nesta sessão**; [D02] Decreto
    12.955 arts. 124–130); [`emissao-mei-me-por-tipo`](../../pesquisas-legais/emissao-mei-me-por-tipo/relatorio.md)
    (Res. CGSN 140 art. 59 § 1º, red. Res. 191/2026); [`dfe-mtls-psc`](../../pesquisas-legais/dfe-mtls-psc/relatorio.md)
    ([D02] manual da API §1.4: `GET /dps/{id}` só para ator da nota, `HEAD` para qualquer certificado válido; [D03] ADN).
  - **Código em `main` `b20c21e3` (lido, não alterado):** `dfe/DfeEmissorPort.ts` (`DfeKind = 'NFSE' | 'NFE' | 'NFCE'`,
    `kinds`, `substituir`, `consultar(partnerRef)` e `cancelar(partnerRef, input: CancelInput)` ainda **sem contexto de
    credencial**); `prisma/schema.prisma:2306-2315` (`FiscalDocumentSequence @@id([userId, unitId, kind, ambiente,
    serie])`, com `ambiente = ''` para NFSE); `services/FiscalDocumentEmissionService.ts:399` (`nextNumber(…, kind ===
    'NFSE' ? '' : selection.ambiente, …)`).
  - **Código em PR aberto, não mergeado** (cabeça `e093a246` do #992, empilhado sobre #984/#986):
    `dfe/AssinadorRemotoPort.ts` (`TipoDfeAssinado = 'NFSE_DPS' | 'NFE' | 'NFCE'`, `AlgoritmoHash = 'sha1' | 'sha256'`,
    `assinarHash(digestB64, algoritmo, tipo, cred)`).
- **Nós vizinhos:** consome [[X10a]] (EMENDA-4: assinador, fila, pareamento, transporte), [[X10b]] (porta,
  `FiscalDocument`), [[DFE-MANUAL]] (releitura, adaptador por documento), [[D5]] (credencial = token do cliente);
  limita-se com [[X11]] (eventos e substituição). O FE do assinador (`FE-INCR-NFCE-ASSINADOR`, item 4 da decisão de
  30/10) é vizinho de tela.

## 1. Mapa: o que cai, o que fica e o que entra no BRIEF-ADN

### 1.1 Itens do §3 do BRIEF-ADN

| Item BRIEF-ADN | Estado com esta emenda | Por quê |
|---|---|---|
| 1 (emenda ADR-DFE §12 da guarda) | **Substituído por ADL-1** | Não há guarda; o registro vai para o ADR-ASSINADOR-LOCAL (AL-PR-0) e o ADR-DFE §14 |
| 2 (transcrição API Sefin/ADN) | **Mantido** | Independe de onde a chave mora |
| 3–7 (`FiscalCertificate`, keyring, upload PFX, view, pré-voo do A1) | **Caem** | Arquivados em 22/10 e não reabertos (item 3 de [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]). Entram ADL-4..ADL-6 |
| 8 (`serializeDps`) | **Mantido** | Puro |
| 9 (`signEnveloped` com `credential`) | **Substituído por ADL-7** | A assinatura vira duas fases (`dfeXmlSign.ts` do #984) com `AssinadorLocalSigner` |
| 10 (envelope gzip+base64) | **Mantido** | Puro |
| 11 (`reenviar` refaz o `id`) | **Mantido** | Resíduo do GAP-MAP l.73, independente |
| 12 (sequência por ambiente) | **Reescrito como ADL-8** | A chave já tem `ambiente` em `main` (`schema.prisma:2310`); falta a NFS-e deixar de usar `''` |
| 13 (`AdnHttpClient` com `key`/`cert`) | **Cai; entra ADL-9/ADL-10** | O servidor não tem chave. O mTLS sai do assinador pelo `TRANSMITIR` |
| 14 (classificação da resposta) | **Mantido** | Função pura sobre status + corpo, agora vindos do `TRANSMITIR` |
| 15 (adaptador `adn`) | **Mantido, com ADL-11** | Capabilities e `kinds: ['NFSE']` iguais |
| 16 (`credential` na porta) | **Substituído por ADL-11** | O contexto leva o assinador da unidade, não a chave |
| 17 (`emitir`) | **Mantido**, encadeando ASSINAR → TRANSMITIR | |
| 18 (resultado síncrono) | **Mantido**, com o orçamento do F-AL-10 (ADL-12) | |
| 19 (releitura obrigatória) | **Mantido** | Independe do transporte |
| 20 (recuperação por `GET /dps/{id}`) | **Mantido, com ADL-13** | Com o certificado do prestador na conexão, o `GET` funciona (prestador é ator); exige o assinador ligado |
| 21 (cancelamento por evento) | **Mantido**, assinado pelo assinador (ADL-7) | |
| 22–23 (seleção, `tpAmb` × host) | **Mantidos, com ADL-14** | A seleção ganha o eixo "portal × automática" por unidade |
| 24–25 (rotas e DTOs do certificado) | **Caem** | Sem certificado guardado; as rotas do assinador são da EMENDA-4 (AL-3, AL-12) |
| 26 (gates + mutações) | **Mantido, com a mutação (iv) trocada** (ADL-17) | Não há senha de PFX para procurar no banco |

### 1.2 Forks F-ADN-1..13 (ratificados em 12/10 para o caminho de guarda)

| Fork | Estado com esta emenda |
|---|---|
| F-ADN-1 (registro da reabertura da guarda) | **Sem objeto.** O ADR-DFE D1 ("o Luminaris nunca guarda certificado") volta a valer sem ressalva; o registro do `adn` com assinador local vai em ADL-1 |
| F-ADN-2, F-ADN-3, F-ADN-4 (onde mora o A1, keyring, PKCS#12) | **Sem objeto** |
| F-ADN-5 (aplicar o resultado síncrono) | **Mantido (a)**, dentro do tempo do F-AL-10 (ADL-12) |
| F-ADN-6 (`partnerRef` = `infDPS/@Id`) | **Mantido (a)** |
| F-ADN-7 (algoritmo em constante única, rsa-sha1 inicial) | **Mantido (c)**. Consequência direta: o protocolo do assinador aceita `rsa-sha1` **e** `rsa-sha256` (ADL-2) |
| F-ADN-8 (consulta não acha a nota ⇒ `dfe_nao_recebida`) | **Mantido (a)**, com insumo novo da FAQ 18.5 (§5) |
| F-ADN-9 (sequência por ambiente migrada por este BRIEF) | **Parcialmente cumprido em `main`** (chave com `ambiente`); o resto é ADL-8 |
| F-ADN-10 (pré-voo de validade do A1) | **Substituído** pelo pré-voo do AL-13 + validade do certificado do dispositivo + regra dos 14 dígitos (ADL-6) |
| F-ADN-11 (14 dígitos) | **Mantido (a)**, agora sustentado pela FAQ 17.2/17.7/28.2 — e em conflito com o vínculo por raiz do AL-4 (F-ADL-3) |
| F-ADN-12 (`ADN_HOSTS` no código) | **Mantido (a)**; a mesma tabela alimenta a lista de hosts do assinador (ADL-3) |
| F-ADN-13 (cancelamento por API neste BRIEF) | **Mantido (a)** |

A `BE-INCR-DFE-ADN-EMENDA-PSC-brief.md` segue superada (12/10 e 13/10). O desenho em duas fases que ela propôs (E-7)
já existe no #984 e é reaproveitado aqui.

## 2. Desenho em uma figura

```
caixa/escritório do prestador (Windows)        VPS do cliente (server/)                         Sefin Nacional
┌────────────────────────────────┐            ┌──────────────────────────────────┐
│ assinador local (EMENDA-4)     │◀─ tarefa ──│ AdnEmissor ('adn')               │
│  ASSINAR: infDPS | infPedReg   │── result ─▶│  serializeDps → dfeXmlSign (2 fases)
│   confere digest, CNPJ (14) e  │            │  → envelope gzip+b64             │
│   tpAmb antes de assinar       │            │  → TRANSMITIR rest               │
│  TRANSMITIR rest: POST /nfse,  │── mTLS com o e-CNPJ do PRESTADOR ───────────────────────▶ │ POST /nfse, GET/HEAD /dps,
│   GET|HEAD /dps, GET /nfse,    │            │  classificação (item 14),        │            │ GET /nfse, eventos
│   POST /nfse/{chave}/eventos   │            │  releitura (item 19)             │
└────────────────────────────────┘            └──────────────────────────────────┘
```

O assinador continua com **duas primitivas**. Esta emenda acrescenta **alvos** ao `ASSINAR` (`infDPS`, `infPedReg`) e um
**protocolo** ao `TRANSMITIR` (`rest`, além do `soap12` da NF-e). Toda regra fiscal da NFS-e fica no servidor.

## 3. Checklist de comportamentos

Marcadores: `[direto]` sem fork · `[fork:F-ADL-n]` vale o ramo recomendado se o dono ratificar · `[cond:…]` só existe
num ramo. Numeração ADL-n para não colidir com AL-n (EMENDA-4) nem com os itens 1–26 do BRIEF-ADN. Cada item termina no
teste que o prova. Nenhum item exige token real nem rede externa.

### Fase D — docs

- **ADL-1 [direto] Registro no ADR.** No AL-PR-0 da EMENDA-4 (ou em emenda dele, se já mergeado): o
  `ADR-ASSINADOR-LOCAL` passa a nomear a NFS-e como segundo cliente do assinador, com o protocolo `rest`; a emenda §14
  do `ADR-INCR-DFE-EMISSAO-PARCEIRO` registra o adaptador `adn` (decisão 3 do ADR: um adaptador por protocolo) e que a
  decisão 2 de 26/09 ("Emissor Nacional por API fica fora") foi superada por [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]]
  item 1. *Critério:* `node scripts/plano-vault.mjs check` íntegro.

### Fase P — protocolo servidor ⇄ assinador (estende o contrato §4.2 da EMENDA-4)

- **ADL-2 [fork:F-ADL-1] `ASSINAR` com os alvos da NFS-e:** `conteudo.alvo` ganha `infDPS` e `infPedReg`; `algoritmo`
  passa a `rsa-sha1 | rsa-sha256` (F-ADN-7 c: a constante é do servidor, o assinador aceita os dois). *Teste (servidor):*
  o schema gerado (`dfeSigner.schema.json`, AL-17) contém os alvos novos e o teste de divergência do gerado × commitado
  fica vermelho se alguém mexer só de um lado.
- **ADL-3 [fork:F-ADL-1] `TRANSMITIR` com `protocolo: 'rest'`:** método `POST | GET | HEAD`, URL completa, `Content-Type`
  `application/json` só no POST, corpo opcional; resposta `httpStatus` + `corpoB64` (vazio no `HEAD`). A lista de hosts
  do AL-11 passa a ser gerada **também** de `ADN_HOSTS` (F-ADN-12), com o conjunto fechado de caminhos por host
  (`/nfse`, `/nfse/{chave}`, `/nfse/{chave}/eventos`, `/dps/{id}`); caminho fora do conjunto ⇒ `HOST_FORA_DA_LISTA`.
  *Teste (servidor):* toda URL que o `AdnEmissor` monta, nos dois ambientes, casa com a lista gerada (propriedade).

### Fase V — vínculo do assinador com a unidade para a NFS-e

- **ADL-4 [direto] CNPJ completo do certificado no dispositivo.** `DfeSignerDevice` ganha `certCnpj` (14 dígitos, do
  OtherName 2.16.76.1.3.3 por `readCertFacts`, já em `main`) ao lado do `certCnpjRaiz` do AL-3. CNPJ é dado da empresa,
  não PII; o CPF do responsável (OID 2.16.76.1.3.4) continua fora (AL-16). Se o AL-PR-2 ainda não estiver em `main`, a
  coluna entra nele; senão, migração aditiva (F-ADL-5). *Teste:* pareamento com certificado de teste grava os 14
  dígitos; a view do AL-12 expõe `certCnpj` e não expõe subject.
- **ADL-5 [fork:F-ADL-2] Um assinador por unidade serve NF-e, NFC-e e NFS-e.** O `DfeSignerDeviceUnit` do AL-4 não ganha
  eixo de tipo: a mesma fila, o mesmo token de dispositivo e o mesmo pareamento atendem os três. `DFE_ASSINADOR_NFSE`
  (AL-2: `DFE_ASSINADOR_<KIND>`) = `local` liga o caminho. *Teste:* unidade com um dispositivo recebe tarefas de NF-e e de
  NFS-e na mesma fila, com `documentId` distintos; revogar o dispositivo desliga os dois.
- **ADL-6 [fork:F-ADL-3] Pré-voo da NFS-e automática:** além do AL-13 (assinador sem poll há mais de 90 s, token
  ausente), a emissão de NFS-e da unidade exige `device.certCnpj === unit.cnpj` (14 dígitos, F-ADN-11 a) e
  `certNotAfter` cobrindo o instante do envio. Falha ⇒ 400 com `faltantes: ['e-CNPJ do próprio estabelecimento no
  assinador']`, nada criado, número não consumido. Aviso a partir de 30 dias do vencimento (mesmo princípio do F-ADN-10
  a), já coberto pelo alerta (b) do AL-15. *Teste:* dispositivo da matriz vinculado à filial (mesma raiz, AL-4) ⇒ NF-e da
  filial passa no pré-voo, NFS-e da filial recebe o faltante; relógio injetado para o vencimento.

### Fase S — servidor, adaptador `adn` (substitui itens 9, 13, 16 do BRIEF-ADN)

- **ADL-7 [direto] Assinatura da DPS e do `pedRegEvento` em duas fases.** `dfeXmlSign.ts` (#984) com
  `AssinadorLocalSigner` (AL-8) no lugar do `signEnveloped(…, credential)`: `Reference URI = "#" + infDPS/@Id` (ou
  `infPedReg/@Id`), enveloped + c14n, algoritmo da constante do F-ADN-7, `X509Certificate` com a parte pública que o
  assinador devolve no pareamento (AL-3). Tipo `TipoDfeAssinado = 'NFSE_DPS'` (já existe no #984). A guarda local antes
  de assinar (item 9 do BRIEF-ADN) fica no servidor **e** no assinador (AL-19 com a regra dos 14 dígitos para os alvos
  da NFS-e, ADL-15). *Teste:* com o assinador falso em processo (AL-8), a DPS assinada verifica no espelho do
  `verifyNfseSignature`; 1 byte do `infDPS` alterado depois ⇒ falha; `prest/CNPJ` de outro estabelecimento ⇒ erro local
  `dps_certificado_nao_e_do_emitente` sem tarefa criada.
- **ADL-8 [direto] Sequência da NFS-e com ambiente.** `FiscalDocumentEmissionService` deixa de passar `''` para NFSE
  quando o adaptador numera localmente (`numbersDps = false`, caso do `adn`); passa o ambiente do documento. Linhas NFSE
  existentes com `ambiente = ''` são **copiadas** para `homologacao` e `producao` com o mesmo `last` (regra do F-ADN-9
  a), na migração do PR que fizer a troca. *Teste (integração, `--runInBand`):* NFSE `adn` em homologação e produção
  numeram de forma independente a partir do `last` herdado; NFSE `manual` continua sem consumir a sequência.
- **ADL-9 [direto] `AdnTransporte`** (interface, mesmo papel do `SefazTransporte` do AL-1): `requisitar(metodo, url,
  corpoJson?) → { httpStatus, corpo }`. Implementação de produção: `AssinadorLocalAdnTransporte`, que cria a tarefa
  `TRANSMITIR` `rest` e espera o resultado. **Não há implementação com chave no servidor.** Erros do assinador mapeiam
  um a um para `AdnTransporteError` (`adn_timeout | adn_tls | adn_resposta_ilegivel`); `ASSINADOR_INDISPONIVEL` não é
  falha de transporte (F-AL-6 a). *Teste:* cada código do assinador ⇒ o erro certo; `ASSINADOR_INDISPONIVEL` ⇒
  `PENDING_SIGNATURE`, não `SENT` com `dfe_emitir_failed`.
- **ADL-10 [direto] Prova do mTLS fica no assinador.** O teste "cliente sem certificado ⇒ handshake falha; com
  certificado da CA ⇒ 200; outra CA ⇒ falha" do item 13 do BRIEF-ADN passa para a suíte do assinador (AL-20), com um
  servidor HTTPS local em modo `rest` que exige certificado cliente. No servidor, o teste do `AdnEmissor` usa um
  assinador falso que repassa o `TRANSMITIR` a um servidor Sefin falso programado (o mesmo do item 17). *Teste:* os dois
  lados; o servidor não importa `https.request` com `key`/`cert` em lugar nenhum de `dfe/adn/` (grep no teste de
  arquitetura do `check:arch`, ou caso no próprio teste do adaptador).
- **ADL-11 [direto] Contexto da porta por documento.** `consultar` e `cancelar` ganham `ctx: DfeCallContext =
  { ambiente, unitId }`; quem resolve o dispositivo ativo é o `AdnEmissor` via um resolvedor injetado
  (`DfeAssinaturaResolver` do #984 estendido), pela `unitId` **do documento**, nunca pelo escopo do chamador.
  `Null`/`Manual`/`sefaz` ignoram. Sem Prisma na porta (§2.1). *Teste:* `tsc`; testes de Null/Manual verdes sem editar
  asserção; job de polling com documento da unidade B resolve o dispositivo de B.
- **ADL-12 [direto] Orçamento de tempo do envio síncrono.** `emitir` encadeia `ASSINAR` e `TRANSMITIR` dentro do mesmo
  `DFE_ASSINADOR_TIMEOUT_MS` do F-AL-10 (a), medido do início do `emitir`. Estourou no `ASSINAR` ⇒ `PENDING_SIGNATURE`;
  estourou no `TRANSMITIR` ⇒ `SENT` com `dfe_emitir_failed` e o item 20 recupera. *Teste:* relógio injetado nos dois
  pontos; nenhuma nota com duas tarefas `TRANSMITIR` de `POST /nfse` para o mesmo `Id`.
- **ADL-13 [direto] Recuperação com o assinador.** O item 20 do BRIEF-ADN (`GET /dps/{id}` → `GET /nfse/{chave}`) sai
  por `TRANSMITIR` `rest`, com o certificado do prestador, que é ator da nota (manual da API §1.4, dossiê
  `dfe-mtls-psc` [D02]). Assinador fora ⇒ o job pula o documento com motivo `assinador_offline` (não conta tentativa do
  F-ADN-8). *Teste:* servidor falso que perde a resposta do POST mas gerou a nota ⇒ autoriza uma vez; assinador fora ⇒
  contagem do F-ADN-8 não anda.
- **ADL-14 [fork:F-ADL-4] Portal × automática por unidade.** Campo `nfseEmissao: 'portal' | 'automatica'` no perfil
  fiscal da unidade (padrão `portal`). `resolveEmissorFor` escolhe `manual` para `portal` e `adn` para `automatica`;
  `automatica` sem `DFE_PARTNER_NFSE=adn` na instância ⇒ porta desabilitada com motivo nomeado (padrão do
  `selectDfeEmissor`). Documento já criado mantém o adaptador com que nasceu. *Teste:* matriz unidade × env ⇒
  adaptador; trocar o campo não muda documento antigo; série da DPS do `adn` dentro de 00001–49999 (`[RN-E0010]`).

### Fase L — assinador local (estende AL-19 e AL-20)

- **ADL-15 [direto] Conferência dos alvos da NFS-e.** `infDPS`: recalcula o digest (c14n + o algoritmo da tarefa),
  confere que `prest/CNPJ` tem **os 14 dígitos** do certificado (não a raiz) e que `tpAmb` = ambiente do pareamento.
  `infPedReg`: mesmo digest, `CNPJAutor` com os 14 dígitos, `tpAmb`, e só `tpEvento` da lista que o servidor emite hoje
  (`101101`, cancelamento). Diário local (AL-19) ganha o tipo `NFSE_DPS` / `NFSE_EVENTO`. *Teste:* fixtures geradas pelo
  servidor (ADL-2) assinadas aqui verificam no servidor; CNPJ da filial com certificado da matriz ⇒
  `CONTEUDO_RECUSADO`; `tpEvento` fora da lista ⇒ `CONTEUDO_RECUSADO`.
- **ADL-16 [direto] `TRANSMITIR` `rest`.** Mesmo TLS do AL-20 (1.2+, certificado do store como cliente, cadeia
  ICP-Brasil embarcada); confere host **e** caminho contra a lista (ADL-3) antes de abrir conexão; `HEAD` devolve só o
  status. *Teste:* servidor HTTPS local `rest` com certificado cliente obrigatório; caminho fora da lista ⇒
  `HOST_FORA_DA_LISTA` sem conexão; corpo devolvido idêntico byte a byte.

### Fase G — gates e observabilidade

- **ADL-17 [direto] Gates que o diff aciona:** snapshot de shape dos DTOs (campo novo no perfil fiscal, schema do
  protocolo), `docs:generate`/guard de path-count (se ADL-14 expuser o campo por rota existente, sem rota nova),
  `accountingResetClassification`/`resetDb` só se ADL-4 vier em migração própria, `check:arch`, `tsc` ×2,
  `test:types`, `npm run test:integration`. Mutações manuais, cada uma tem de ficar vermelha: (i) aceitar raiz no lugar
  dos 14 dígitos no ADL-6; (ii) idem no ADL-15; (iii) aceitar `procEmi = 2` na origem `adn` (item 19 do BRIEF-ADN);
  (iv) tirar o `ambiente` da sequência da NFSE (ADL-8).
- **ADL-18 [direto] Eventos de log e alerta.** `LOG_EVENTS` ganha `dfe.adn.emitir`, `dfe.adn.rejeitada`,
  `dfe.adn.recuperada`, `dfe.adn.identidade_divergente` (sem XML, sem envelope, sem URL com `Id` completo do tomador;
  OBS-R7). O `DfeSignerHealthScheduler` (AL-15) não muda: o caso (a) "sem poll com nota pendente" já cobre NFS-e
  `PENDING_SIGNATURE`; o teste ganha um caso com documento NFSE. *Teste:* snapshot de log sem CPF/CNPJ de tomador; caso
  NFSE no teste do scheduler.

### Fase R — runbook (gate humano; agente prepara, dono executa e assina)

- **ADL-19 [direto] `RUNBOOK-D5-ADN-HOMOLOGACAO.md`** (o §6.2 do BRIEF-ADN, reescrito): pré-condições = assinador
  pareado com o **e-CNPJ do próprio estabelecimento** (A3 no token ou A1 importado não exportável no store, F-AL-1),
  `nfseEmissao = automatica`, `DFE_PARTNER_NFSE=adn`, ambiente `homologacao` (produção restrita). Passos: 1 DPS
  autorizada com releitura `IGUAL`; 1 rejeição proposital com o código E0xxx preservado; 1 recuperação por `GET /dps`;
  1 cancelamento; 1 tentativa com o token da matriz numa filial ⇒ faltante do ADL-6 (se o cliente tiver filial). A
  EVIDÊNCIA é a saída literal; desfecho e assinatura são do dono.

## 4. Contratos (esboço materializável)

### 4.1 Acréscimos ao protocolo `v1` da EMENDA-4 (§4.2 dela; ramo recomendado do F-ADL-1)

```ts
// dtos/DfeSignerDto.ts — acréscimos (ADL-2, ADL-3)
const AlvoAssinado = z.enum(['infNFe', 'infEvento', 'infInut', 'qrCodeV3Offline', 'infDPS', 'infPedReg']);
const TarefaAssinar = z.object({
  id: z.string(), tipo: z.literal('ASSINAR'),
  algoritmo: z.enum(['rsa-sha1', 'rsa-sha256']),        // F-ADN-7 (c): o servidor escolhe pela constante
  digestB64: z.string(),
  conteudo: z.object({
    alvo: AlvoAssinado,
    elementoXml: z.string().max(2_000_000).optional(),
    signedInfoC14nB64: z.string().optional(),
    baseQrB64: z.string().optional(),
    chave: z.string().regex(/^\d{44}$|^DPS\d{42}$|^PRE\d{56}$/),  // NF-e 44 · Id da DPS 45 · Id do pedido 59
    tpAmb: z.enum(['1', '2']),
  }).strict(),
  expiraEm: z.string().datetime(),
}).strict();

const TransmitirSoap = z.object({                        // o ramo da EMENDA-4, sem mudança de campo
  id: z.string(), tipo: z.literal('TRANSMITIR'), protocolo: z.literal('soap12'),
  url: z.string().url().startsWith('https://'),
  servico: z.enum(['NFeAutorizacao4', 'NFeConsultaProtocolo4', 'NFeInutilizacao4', 'NFeRecepcaoEvento4', 'NFeStatusServico4']),
  envelopeB64: z.string(),
  timeoutMs: z.number().int().min(1_000).max(60_000),
  expiraEm: z.string().datetime(),
}).strict();
const TransmitirRest = z.object({                        // NFS-e (Sefin Nacional / ADN)
  id: z.string(), tipo: z.literal('TRANSMITIR'), protocolo: z.literal('rest'),
  metodo: z.enum(['POST', 'GET', 'HEAD']),
  url: z.string().url().startsWith('https://'),         // host + caminho conferidos contra a lista (ADL-3)
  corpoJsonB64: z.string().optional(),                  // só no POST; { dpsXmlGZipB64 } ou o pedido de evento [I]
  timeoutMs: z.number().int().min(1_000).max(60_000),
  expiraEm: z.string().datetime(),
}).strict();
// TRANSMITIR = z.discriminatedUnion('protocolo', [TransmitirSoap, TransmitirRest]) dentro do discriminador 'tipo'.
// Resultado: o mesmo ResultadoBody da EMENDA-4 (httpStatus + corpoB64; corpo vazio no HEAD).
// Mapa REST → AdnTransporteError (ADL-9): TLS→adn_tls · TIMEOUT|REDE→adn_timeout · corpo ilegível→adn_resposta_ilegivel ·
// HOST_FORA_DA_LISTA→erro 500 nosso. HTTP 4xx/5xx NÃO é erro de transporte: volta como httpStatus para o item 14.
```

Lista de hosts e caminhos gerada na build (ADL-3), a partir de `ADN_HOSTS` (F-ADN-12, caminho base grau I):

```json
{ "rest": {
  "sefin.producaorestrita.nfse.gov.br": ["/API/SefinNacional/nfse", "/API/SefinNacional/nfse/*", "/API/SefinNacional/nfse/*/eventos", "/API/SefinNacional/dps/*"],
  "sefin.nfse.gov.br":                  ["/SefinNacional/nfse", "/SefinNacional/nfse/*", "/SefinNacional/nfse/*/eventos", "/SefinNacional/dps/*"] } }
```

### 4.2 Servidor

```ts
// dfe/adn/AdnTransporte.ts — ADL-9
export interface AdnTransporte {
  requisitar(metodo: 'POST' | 'GET' | 'HEAD', url: string, corpoJson?: unknown): Promise<{ httpStatus: number; corpo: string }>;
}
export class AdnTransporteError extends Error { constructor(readonly code: 'adn_timeout' | 'adn_tls' | 'adn_resposta_ilegivel', msg: string) { super(msg); } }
export class AssinadorLocalAdnTransporte implements AdnTransporte { /* tarefa TRANSMITIR rest + espera (F-AL-10) */ }

// dfe/DfeEmissorPort.ts — ADL-11 (substitui o DfeCredential do item 16 do BRIEF-ADN; nenhuma chave na porta)
export interface DfeCallContext { ambiente: DfeAmbiente; unitId: string }
//   consultar(partnerRef: string, ctx?: DfeCallContext): Promise<EmissaoResult>;
//   cancelar(partnerRef: string, input: CancelInput, ctx?: DfeCallContext): Promise<CancelResult>;

// dfe/adn/AdnEmissor.ts — itens 15–23 do BRIEF-ADN com ADL-7, ADL-9, ADL-11..13
export interface AdnEmissorDeps {
  assinador: (unitId: string) => Promise<AssinadorRemotoPort>;   // AssinadorLocalSigner do dispositivo ativo da unidade
  transporte: (unitId: string) => Promise<AdnTransporte>;         // AssinadorLocalAdnTransporte do mesmo dispositivo
  certificadoPublico: (unitId: string) => Promise<{ derB64: string; cnpj: string; notAfter: string }>;
  clock: () => Date;
}
```

### 4.3 Persistência

```prisma
// ADL-4 — acréscimo ao DfeSignerDevice da EMENDA-4 §4.3
model DfeSignerDevice {
  // …campos da EMENDA-4…
  certCnpj  String   // 14 dígitos do OtherName 2.16.76.1.3.3; a NFS-e compara inteiro (F-ADN-11 a), a NF-e compara a raiz (AL-3)
}

// ADL-14 — ramo recomendado do F-ADL-4; onde o perfil fiscal da unidade mora hoje é confirmado no PR (insumo ausente 3)
//   nfseEmissao  String  @default("portal")   // portal | automatica

// ADL-8 — sem mudança de schema: FiscalDocumentSequence já tem @@id([userId, unitId, kind, ambiente, serie]) em main;
//   muda o valor passado para NFSE ('' → ambiente) e as linhas NFSE '' são copiadas para os dois ambientes.
```

```env
DFE_PARTNER_NFSE=adn            # por tipo, como DFE_ASSINADOR_<KIND> do AL-2
DFE_ASSINADOR_NFSE=local
DFE_PARTNER_ENV=homologacao     # producao só depois do runbook ADL-19 + "executa" da emissão real
# Sem DFE_CERT_KEYS / DFE_CERT_KEY_ACTIVE: nada é cifrado em repouso porque nada é guardado.
```

## 5. Plano por fatias (substitui o §10 do BRIEF-ADN)

| PR | Itens | Depende | Natureza |
|---|---|---|---|
| ADL-PR-0 (docs) | ADL-1, item 2 do BRIEF-ADN | AL-PR-0 (ou emenda dele) | registro |
| ADL-PR-1 (server, puro) | itens 8, 10, 11 do BRIEF-ADN; ADL-8 | só `executa` (F-ADL-5) | XML, envelope, numeração |
| ADL-PR-2 (server) | ADL-2, ADL-3, ADL-4 (se o AL-PR-2 já tiver entrado), ADL-6, ADL-14 | AL-PR-2 em `main` | protocolo, vínculo, pré-voo, portal × automática |
| ADL-PR-3 (server) | ADL-7, ADL-9..ADL-13; itens 14–23 do BRIEF-ADN; ADL-17, ADL-18 | ADL-PR-1, ADL-PR-2, AL-PR-3 | adaptador `adn` contra assinador falso |
| ADL-PR-4 (assinador) | ADL-15, ADL-16 | AL-PR-5 | conferência e transporte `rest` |
| ADL-PR-5 (docs) | ADL-19 | ADL-PR-3, ADL-PR-4 | runbook em branco |

O runbook ADL-19 só começa com tudo acima em `main`, o runbook A3 da EMENDA-4 (AL-24) passado nos passos 2 e 3 (token
assina e faz TLS) e um prestador com e-CNPJ do próprio estabelecimento. Até lá, a NFS-e segue pelo portal.

## 6. Forks — RATIFICAÇÃO PENDENTE (nenhum se auto-ratifica)

### F-ADL-1 — Como o protocolo do assinador ganha a NFS-e
O `TRANSMITIR` ratificado é SOAP (`servico` da NF-e, `envelopeB64`); a Sefin Nacional é REST com JSON e usa `GET`/`HEAD`.
O `ASSINAR` tem `algoritmo: 'rsa-sha1'` literal e alvos só da NF-e.
- **(a)** Ainda na versão `v1` (nada do protocolo foi implementado): `TRANSMITIR` vira união por `protocolo`
  (`soap12` com os campos da EMENDA-4 sem mudança, `rest` novo), `ASSINAR` ganha os alvos `infDPS`/`infPedReg` e o
  enum de algoritmo. A lista de hosts passa a ter caminhos por host.
- **(b)** Versão `v2` do protocolo, com `v1` só para NF-e; o assinador fala as duas.
- **(c)** `TRANSMITIR` genérico (método, URL, cabeçalhos, corpo) para os dois DF-e, sem `servico`.
- **Recomendação: (a).** O protocolo ainda é papel (AL-PR-3 e AL-PR-5 não existem); fazer `v2` antes da `v1` sair
  só cria compatibilidade sem cliente. (c) tira do assinador a única trava sobre o que ele transmite além do host;
  com (a), o ramo SOAP da NF-e fica exatamente como ratificado em 30/10. Se o AL-PR-3 já estiver em `main` quando este
  BRIEF tiver `executa`, a recomendação passa a (b).

### F-ADL-2 — O assinador serve à NF-e e à NFS-e da mesma unidade?
- **(a)** Sim: um dispositivo, um pareamento, uma fila; `DFE_ASSINADOR_<KIND>` liga cada tipo (ADL-5).
- **(b)** Pareamento separado por tipo (`DfeSignerDeviceUnit` com `kind`): um dispositivo para NF-e/NFC-e e outro
  para NFS-e na mesma unidade.
- **(c)** Assinador separado para a NFS-e (outro binário).
- **Recomendação: (a).** É o mesmo token e o mesmo prestador; dois pareamentos dobrariam o passo do runbook e o
  aviso de "assinador fora" no balcão sem ganho de segurança (a conferência é por alvo, ADL-15). (b) só se justifica
  com o (c) do F-ADL-3. Custo de (a): uma queda do assinador para os dois documentos ao mesmo tempo, o que já é verdade
  com o mesmo token.

### F-ADL-3 — Certificado por estabelecimento (NFS-e) × vínculo por raiz (AL-4 da EMENDA-4)
A FAQ NFS-e v1.1 diz que o CNPJ do OtherName e o do emitente "precisam ser idênticos" (17.2) e que matriz e filiais são
"entidades distintas, mesmo compartilhando a raiz" (28.2). O AL-4 (F-AL-3 a, ratificado) deixa um dispositivo da matriz
servir N unidades da mesma raiz, o que vale para a NF-e (F-SIG-3 b).
- **(a)** Manter o vínculo por raiz e decidir por tipo **no pré-voo e na conferência** (ADL-6, ADL-15): a filial
  atendida pelo token da matriz emite NF-e/NFC-e e recebe o faltante "e-CNPJ do próprio estabelecimento" na NFS-e.
  Quando a filial parear o próprio token, o AL-4 já revoga o vínculo da matriz para aquela unidade (um ativo por
  unidade), e o dispositivo novo atende os três tipos.
- **(b)** Exigir os 14 dígitos no pareamento de toda unidade que tiver `nfseEmissao = automatica` (o vínculo por raiz
  só sobra para unidade que não emite NFS-e automática).
- **(c)** Vínculo por `(unidade, tipo)`: o token da matriz fica ativo para a NF-e da filial e o token da filial para a
  NFS-e dela, ao mesmo tempo (exige o F-ADL-2 b).
- **Recomendação: (a).** Não muda nenhum fork ratificado da EMENDA-4, não pede compra de certificado a quem não emite
  NFS-e automática, e o erro aparece antes de consumir número, com o nome do que falta. (b) põe a regra da NFS-e no
  pareamento, onde o usuário ainda não escolheu emitir. (c) dá dois assinadores ativos na mesma unidade, contra o "um
  ativo por unidade" ratificado. Grau: a regra dos 14 dígitos é **verificada** (FAQ 17.2/17.7/28.2, texto lido no
  dossiê); que o 1º cliente tenha filial é **não verificado** (insumo ausente 1).

### F-ADL-4 — Portal e emissão automática convivendo
O portal segue até esta emenda ser implementada (decisão de 30/10) e, depois, pode seguir para quem não tiver o e-CNPJ
do próprio estabelecimento.
- **(a)** Campo por unidade `nfseEmissao: 'portal' | 'automatica'` (padrão `portal`), escolhido pelo usuário; o
  adaptador do documento sai dele (ADL-14).
- **(b)** Troca automática: unidade com dispositivo de 14 dígitos vai para `adn`, sem dispositivo vai para `manual`.
- **(c)** Por instância (env): toda a instância emite pelo portal ou toda pela API.
- **Recomendação: (a).** (b) muda o caminho da nota sem ninguém escolher, e uma queda do assinador viraria nota no
  portal sem aviso (o mesmo defeito de "parâmetro aceito e ignorado"). (c) quebra no cliente com matriz com token e
  filial sem. As séries não devem colidir: a API usa 00001–49999 (`[RN-E0010]` do BRIEF-ADN, verificado); que o portal
  use outra faixa é inferido do mesmo E0010 e o runbook ADL-19 confere.

### F-ADL-5 — Ordem com a EMENDA-4 e com os PRs abertos
- **(a)** O que é puro (ADL-PR-1: XML da DPS, envelope, `reenviar` refaz o `id`, sequência da NFSE com ambiente) pode
  andar logo depois do `executa`, sem esperar a EMENDA-4; o resto empilha depois do AL-PR-2/AL-PR-3/AL-PR-5. O
  `certCnpj` (ADL-4) entra no próprio AL-PR-2 se ele ainda não tiver sido mergeado.
- **(b)** Tudo depois da EMENDA-4 inteira e do runbook A3.
- **Recomendação: (a).** O ADL-PR-1 não toca no assinador nem no #984/#986/#992, e o item 11 fecha um resíduo do
  GAP-MAP que já existe. Pôr o `certCnpj` no AL-PR-2 evita uma segunda migração na mesma tabela. Custo: o executor do
  AL-PR-2 precisa ler este BRIEF (fica no fold do X10a quando o dono ratificar).

## 7. Pendente de validação externa

1. **Contrato JSON da Sefin** (nomes de campo, códigos HTTP, caminho base): segue grau I, como no BRIEF-ADN §6.1. Só
   o Swagger com mTLS ou o runbook ADL-19 respondem; agora o Swagger também se abre pelo assinador.
2. **O token assina SHA-1/SHA-256 e serve de chave cliente no TLS** — o mesmo risco da EMENDA-4 §7 itens 1–2, agora
   também contra a Sefin Nacional.
3. **Produção restrita exige habilitação prévia do CNPJ?** (BRIEF-ADN §6.1, NV). A FAQ 17.2 diz que os critérios de
   segurança da produção restrita são os de produção, então o teste pede o e-CNPJ **real** do estabelecimento.
4. **Reenvio depois de falha** (L-ADN-2): a FAQ 18.5 diz que número perdido por timeout é descartado e que basta
   "tentar uma nova transmissão" — mas fala do `nNFSe` (número da Sefin), não do `nDPS` (nosso). A leitura segura do
   dossiê continua: reenviar o mesmo `nDPS` só depois de confirmar pelo `HEAD`/`GET /dps` que não gerou nota.
5. **"Basic Constraint = false"** (FAQ 17.2): certificado de usuário final cumpre; conferir no e-CNPJ real do runbook.

## 8. Insumos ausentes (pausados — regra 2)

1. **Quantos estabelecimentos o 1º cliente tem, e quais têm e-CNPJ próprio** (decide o peso do F-ADL-3 na prática).
2. **Se o 1º cliente quer que o Luminaris emita a NFS-e no lugar do portal** (cédula de 30/10 §1, "não verificado").
3. **Onde mora hoje o perfil fiscal por unidade** que recebe `nfseEmissao` (ADL-14): não li o schema além da sequência;
   o executor confirma (`FiscalProfile` × `ServiceFiscalProfile`).
4. **Pedido de evento da NFS-e em JSON** (`POST /nfse/{chave}/eventos`): o envelope do pedido é grau I, como o da DPS.

## 9. Achados fora de escopo (não planejados)

1. **`substituir` no adaptador `adn`** (capability do X11 em `main`): a API gera a substituição a partir da DPS com a
   chave a substituir (`[API-NFSE-SUBST]`). Nem o BRIEF-ADN nem esta emenda planejam; fica no [[X11]].
2. **Distribuição por NSU no ADN** (`GET /DFe/{NSU}`, NFS-e tomadas): aceita certificado da mesma raiz; o assinador
   serviria. Outro nó, sem autorização.
3. **Envio do DANFSe ao tomador** (BRIEF-ADN §9 item 1): segue sem dono.
4. **Aviso ao executor do AL-PR-2 sobre o `certCnpj`** (F-ADL-5): feito em 31/10 (dono, chat: *"Pode editar o adn
   brief e atualizar a documentação"*) como nota no AL-4 da EMENDA-4. A nota do nó X10a não foi tocada, porque os
   PRs #997 e #998 já a editam.
5. **Template da `sessao-planejamento`, pendência 2** (fold na nota do nó): segue aberto; o fold curto no X10i foi
   pedido pela sessão de origem.

## 10. Gates de envio [OPS-001]

1. **Objetivo:** a frase do §2 ("o BRIEF-ADN volta sem a guarda: assinatura e mTLS pelo mesmo assinador local, com o
   e-CNPJ do próprio prestador") responde ao pedido de trocar a guarda pelo assinador, e o §1 diz item a item o que
   fica do BRIEF-ADN.
2. **Grau dos claims:** regra dos 14 dígitos e "certificado do próprio prestador" **verificados** no texto da FAQ v1.1
   (itens 17.2, 17.7, 28.2 lidos no `.txt` do dossiê nesta sessão); `GET /dps` só para ator **verificado** pelo dossiê
   `dfe-mtls-psc` [D02]; API como caminho do Simples **verificado** pelo dossiê `emissao-mei-me-por-tipo`; sequência com
   `ambiente` e NFSE com `''` **verificado por leitura** de `main` (`schema.prisma:2306-2315`,
   `FiscalDocumentEmissionService.ts:399`); `AssinadorRemotoPort` com `NFSE_DPS` **verificado** no #992 (não em `main`);
   o token funcionar no TLS **inferido** (herdado da EMENDA-4).
3. **Caso adversarial tentado:** "o vínculo por raiz do AL-4 já cobre a NFS-e" — falha pela FAQ 17.2 ("precisam ser
   idênticos"), daí o F-ADL-3. Segundo: "o `TRANSMITIR` ratificado serve à NFS-e como está" — falha porque o `servico`
   é enum SOAP e não há `GET`/`HEAD`, daí o F-ADL-1. Terceiro: "a recuperação por `GET /dps` não funciona sem PSC" —
   valia para o e-CNPJ do Luminaris no TLS; com o certificado do prestador, ele é ator e o `GET` funciona (ADL-13).
4. **Checagem que teria falhado:** se a NFS-e já usasse o ambiente na sequência, o ADL-8 seria vazio; a leitura de
   `FiscalDocumentEmissionService.ts:399` mostrou `kind === 'NFSE' ? ''`. Se o `AssinadorRemotoPort` do #992 não tivesse
   `NFSE_DPS`, o ADL-7 pediria tipo novo; o grep mostrou que tem.
5. **Duas primeiras linhas:** o cabeçalho "Em duas linhas" entrega o desenho e o risco principal (14 dígitos × raiz;
   token no TLS não testado).
