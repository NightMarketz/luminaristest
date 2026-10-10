# BRIEF — BE-INCR-DFE-ADN-EMISSOR (emissor próprio de NFS-e na Sefin Nacional / ADN, sem depender do A1 real) — nó X10i

> Produzido em `sessao-planejamento` (2026-10-10), nó [`X10i`](../plano/nos/X10i.md), gate [`D5`](../plano/gates/D5.md),
> Fase E do [`PLANO-EMISSAO-FISCAL-2026-09-27.md`](PLANO-EMISSAO-FISCAL-2026-09-27.md) (o passo E.3 previa um BRIEF
> `BE-INCR-DFE-FOCUS`; com o D5 de 07/10 o adaptador passa a ser o nosso). **Este documento não escreve código.** Traz
> checklist, contratos esboçados e forks **F-ADN-1..13, todos com RATIFICAÇÃO PENDENTE**. A `sessao-feature` só abre
> com "executa" do dono. A emissão real continua exigindo o "executa" da emissão (regra do X10i, passo E.2).
>
> **Em duas linhas:** dá para construir e provar com certificado autoassinado gerado no teste e um servidor HTTPS
> falso com mTLS: guarda do A1 por unidade, XML da DPS, assinatura XMLDSig, cliente com certificado de cliente, envio
> síncrono, consulta pelo Id da DPS, cancelamento e releitura. **Risco principal:** o contrato JSON da Sefin Nacional
> (nomes de campo, códigos HTTP) **não está em fonte primária legível sem certificado**. O Swagger oficial responde 403
> sem mTLS (medido em 10/10), então os nomes de campo deste BRIEF têm grau I (fórum de desenvolvedores) até o runbook do
> D5. Também fica pendente a cifra do A1 em repouso: depende de chave provisionada no M2, como no F5.

---

## 0. Contexto fixo (não rediscutir)

- **Item a planejar:** adaptador de emissão própria de NFS-e na Sefin Nacional (API do Emissor Público Nacional) e no
  ADN, no nó [`X10i`](../plano/nos/X10i.md) ("Emissão de DF-e — implementação"). Só o que **não** depende do A1 real nem
  do acesso à produção restrita. A homologação real é **gate humano** (runbook do D5, §6.2), não item do checklist.
- **Autorização (ORCH-006), citada literalmente:** dono, chat, **2026-10-10**, questionário: *"BRIEF emissor ADN
  (Recommended)"*. Opção descrita como *"BRIEF do emissor próprio no ADN sem depender do A1 real, junto com a emenda do
  BE-INCR-NFCE de Focus para emissor próprio"*. Escopo: **só documento, sem código, sem "executa"**. Campo
  `autorizacao` do X10i: *"dono em chat 27/09: 'planeje com granularidade…' — só planejamento; a emissão real exige
  'executa'"*. O campo do D5 está vazio ("falta") porque o D5 é gate humano; este BRIEF não o fecha.
- **Contexto da mudança:** D5, fold 07/10. Dono: *"Não é pra ter conta focus, é pra usar a api deles para aprender e
  fazer a nossa"* e *"sim, atualiza o D5 para emissor próprio no ADN"*. O estado do D5 passa a dizer: *"Critério R8 (N
  contas sob 1 chave) passa a ser requisito do NOSSO emissor: um A1 por unidade/CNPJ, sequência de DPS por ambiente"*.
  Estudo de desenho: [`FOCUS-API-ESTUDO-2026-10-07.md`](FOCUS-API-ESTUDO-2026-10-07.md) §Reenquadramento.
- **Divergência de escopo conferida (passo 1 da sessão):** a autorização cobre exatamente este BRIEF. Ela **colide**
  com dois textos ratificados que o fold de 07/10 não revogou por escrito. (i) Decisão 2 de
  [`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md): *"Emissão só por parceiro
  BYOK. Emissor Nacional por API fica fora"*, que reabre só com duas condições juntas, a (b) sendo *"o dono aceitar
  que o Luminaris guarde o A1 do cliente, com cifra em repouso decidida no M2"*. (ii) ADR-DFE D1: *"o Luminaris nunca
  guarda certificado A1/A3"*, com §11.1 item 2. O fold de 07/10 diz que supera a decisão 1 *"só na parte que fala da
  Focus"*. **Não resolvo isso aqui:** vira o fork **F-ADN-1**, e o item 1 do checklist depende dele.
- **1º cliente** (decisão de 29/09): Simples Nacional, São Paulo capital, com IE, vende serviço e produto. O Simples
  emite NFS-e nacional obrigatoriamente a partir de 01/11/2026 (nota do X10i, fold 25/09).

### Insumos lidos nesta sessão (arquivo:linha, grau V salvo indicação)

| Insumo | O que diz |
|---|---|
| `dfe/DfeEmissorPort.ts:13,57-62,64-75,105-114` | `DfeKind = 'NFSE' \| 'NFE'`; `capabilities{numbersDps,consultar,cancelar,webhook}`; `EmitirInput{kind, ref, ambiente, cnpjEmitente, partnerAccountRef, payload}`; `consultar(partnerRef)` e `cancelar(partnerRef, motivo)` **sem escopo nem credencial** |
| `dfe/NullEmissor.ts:11-19` · `dfe/ManualEmissor.ts:19-25` | Null: `numbersDps:false`, recusa `NODE_ENV=production`. Manual: `numbersDps:true`, sem consultar/cancelar |
| `dfe/selectDfeEmissor.ts:23-43` · `dfe/resolveEmissor.ts:16-23` | só `null`/`manual` existem; qualquer outro nome ⇒ porta desabilitada / `dfe_adapter_unknown` |
| `services/FiscalDocumentEmissionService.ts:117-119` | `buildDpsId` = `"DPS"+cMun7+"2"+insc14+serie5+nDPS15` |
| `services/FiscalDocumentEmissionService.ts:286-300` | `createAndSend`: consome `nextNumber` na tx quando `numbersDps=false` e refaz os 15 últimos dígitos do `id` (GAP-MAP l.73 corrigido 07/10) |
| `services/FiscalDocumentEmissionService.ts:340-358` | `porta.emitir` **pós-commit**; o resultado **não é aplicado**, só a falha de rede (`dfe_emitir_failed`) |
| `services/FiscalDocumentLifecycleService.ts:172-245` | `reenviar` reusa `doc.numero` mas **não refaz o `id`** (resíduo do GAP-MAP l.73); `emitir` pós-commit, mesmo padrão |
| `services/FiscalDocumentLifecycleService.ts:368-445` | `retornoManual`: `parseNfseAutorizada` → `compareNfseWithDps` → guardas de identidade (prestador, `dhProc ≥ createdAt`, `ambGer=2 ∧ procEmi∈{2,3}`, `tpAmb`, chave única na tx) → `applyResult` |
| `services/FiscalDocumentLifecycleService.ts:251-295,529-545` | cancelamento: `OUT_OF_WINDOW` ⇒ 409 `DFE_CANCEL_OUT_OF_WINDOW` (E0822); `dfe_ambiente_divergente` (GAP-MAP l.74 corrigido 07/10) |
| `repositories/FiscalDocumentRepository.ts:19-21,182-190` | `attemptRef = "<id>:<n>"`; `nextNumber` por `(userId, unitId, kind, serie)`, **sem ambiente** (GAP-MAP l.139, ABERTO) |
| `dtos/DpsPayloadDto.ts:13-60` | DPS como JSON `.strict()`: `versao:'1.01'`, `infDPS.id` (no XSD é **atributo** `Id`), dinheiro string `"0.00"` |
| `lib/nfse.ts:83` · `lib/nfseReadback.ts:55,113` · `lib/nfseSignature.ts:28-36,59,63` · `lib/nfseEvento.ts:34` | leitor da NFS-e autorizada (assinatura primeiro), releitura de 13 campos, verificação XMLDSig (rsa-sha1/rsa-sha256 aceitos), leitor do `e101101` |
| `lib/nfeSignature.ts:105-120` | `readCertFacts(der)` lê OtherName CNPJ/CPF e validade do certificado |
| `lib/secretBox.ts:17-83` | AES-256-GCM, AAD = id da linha, keyring `PAYMENT_CREDENTIAL_KEYS`/`_ACTIVE`, sem chave ⇒ 503 (F5 PR-1) |
| `test/helpers/nfeSignature.ts:13-70` | gera par RSA e **certificado X.509 de teste com OtherName CNPJ** e assina com `xml-crypto` (já é dependência, `package.json:64`) |
| `prisma/schema.prisma:1404-1490,1661-1765` | `FiscalProfile.partnerAccountRef String?` (R8, reservado), `dpsSerie` 1–49999, `codMun`; `FiscalDocument.partner/partnerRef/ambiente`; `FiscalDocumentSequence @@id([userId, unitId, kind, serie])` |
| `PaymentAccount` (`schema.prisma:2438-2465`) | molde da credencial cifrada por linha: `credentialCiphertext Bytes?`, `credentialKeyVersion`, `credentialSetAt`, `credentialExpiresAt` |
| [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](MAPA-COBERTURA-EMISSAO-2026-10-02.md) §3.4 | o que faltava para emitir direto: guarda do A1, DPS em XML, assinatura, cliente mTLS, consulta/cancelamento; releitura e numeração se aproveitam |
| [`BE-INCR-DFE-EVENTOS-brief.md`](BE-INCR-DFE-EVENTOS-brief.md) PR-2 itens 18–19 | consulta de eventos e cancelamento em voo **esperam o X10i**: fronteira com este BRIEF (§8) |
| [`BE-INCR-NFCE-brief.md`](BE-INCR-NFCE-brief.md) itens 3–7, 23 | `NFCE` na porta, `kinds`, seleção por tipo, sequência por `(kind, ambiente, serie)`. Emenda irmã: [`BE-INCR-NFCE-EMENDA-1-brief.md`](BE-INCR-NFCE-EMENDA-1-brief.md) |

### Nós vizinhos

| Vizinho | Relação | Contrato existente |
|---|---|---|
| [`X10b`](../plano/nos/X10b.md) (done) | porta, `FiscalDocument`, sequência, job, montagem da DPS | `DfeEmissorPort.ts`, `DpsPayloadDto.ts` |
| [`DFE-MANUAL`](../plano/nos/DFE-MANUAL.md) / [`DFE-TPAMB`](../plano/nos/DFE-TPAMB.md) (done) | releitura, adaptador por documento, `tpAmbFor` | `lib/nfseReadback.ts`, `resolveEmissor.ts`, `tpAmbFor` |
| [`X10a`](../plano/nos/X10a.md) | `kinds`, seleção por tipo, sequência com ambiente (mesma tabela, F-NFCE-4 a) | `BE-INCR-NFCE-brief.md` + emenda irmã |
| [`X11`](../plano/nos/X11.md) | janela do cancelamento, substituição, eventos vistos de fora | `BE-INCR-DFE-EVENTOS-brief.md` |
| [`D5`](../plano/gates/D5.md) | A1 de teste + produção restrita = homologação real | runbook (§6.2) |
| [`M2`](../plano/gates/M2.md) | chave da cifra do A1 no env da instância | pré-condição de deploy (§6.3) |
| [`D1f`](../plano/gates/D1f.md) | perfil fiscal aprovado pelo contador | `FiscalProfile` |

## 1. O que a fonte primária diz (acesso em 2026-10-10)

Arquivos baixados pela ferramenta de leitura nesta sessão, com sha256 conferido contra o
[`MANIFEST.md`](fontes-oficiais/MANIFEST.md). Nada foi commitado.

| Chave | Regra | Fonte (URL, acesso 10/10/2026) | Grau |
|---|---|---|---|
| `[API-NFSE-POST]` | `POST /nfse`: "Geração **síncrona**"; a API valida a DPS e devolve "a mensagem de erro com o motivo da rejeição" **ou** "o arquivo XML da NFS-e gerada com a DPS" | Manual dos Contribuintes, API do Emissor Público, §1.3.2 a. <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf> (sha256 `ac2f36e34ff5…` = MANIFEST `nfse-manual-emissor`; o histórico interno diz "1.0, 17/03/2025") | V |
| `[API-NFSE-SUBST]` | DPS com chave de NFS-e a substituir ⇒ a API gera "Evento de Cancelamento de NFS-e por Substituição" e a substituta | idem, §1.3.2 a | V |
| `[API-NFSE-GET]` | `GET /nfse/{chaveAcesso}`: consulta a NFS-e pela chave | idem, §1.3.2 b | V |
| `[API-DPS-GET]` | `GET /dps/{id}` devolve a chave da NFS-e a partir do Id da DPS (Cód. Mun 7 + tpInsc 1 + inscrição 14 + série 5 + nDPS 15), só se o certificado da conexão for de um ator da nota (prestador, tomador, intermediário) | idem, §1.4.1–1.4.2 a | V |
| `[API-DPS-HEAD]` | `HEAD /dps/{id}`: informa se a NFS-e foi gerada, sem a chave, para "qualquer usuário desde que realize a consulta com um certificado digital válido" | idem, §1.4.2 b | V |
| `[API-EVT-POST]` | `POST /nfse/{chaveAcesso}/eventos`: pedido de registro de evento, **síncrono**; mensagens em JSON, o DF-e em XML "contendo a assinatura digital do emissor do evento" | idem, §1.5.2 a | V |
| `[API-EVT-GET]` | `GET /nfse/{chave}/eventos`, `…/eventos/{tipoEvento}`, `…/{tipoEvento}/{numSeqEvento}` | idem, §1.5.2 b–d | V |
| `[API-PARAM]` | `GET /parametros_municipais/{codigoMunicipio}/convenio`, `/{codigoMunicipio}/{codigoServico}`, `/{codigoMunicipio}/{CPF/CNPJ}` | idem, §1.2.1 | V |
| `[ADN-DIST]` | `GET /DFe/{NSU}` e `GET /NFSe/{ChaveAcesso}/Eventos`; consulta pode usar "certificado cujo CNPJ tenha o mesmo CNPJ Raiz do contribuinte" (só a **distribuição**) | Manual dos Contribuintes, APIs do ADN, v1.0 12/02/2026, §1.1. <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf> (sha256 `9ffc97d8b1be…` = MANIFEST `nfse-manual-adn`) | V |
| `[HOSTS]` | Produção restrita: Sefin Nacional `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index`; ADN contribuintes `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html`. Produção: `https://sefin.nfse.gov.br/SefinNacional/docs/index`; `https://adn.nfse.gov.br/contribuintes/docs/index.html`. Página "Atualizado em 20/08/2026" | <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao> | V (hosts das **docs**). O caminho base da API em cada ambiente (`/API/SefinNacional` × `/SefinNacional`) é **I** |
| `[SWAGGER-403]` | `curl` sem certificado de cliente nos dois índices da Sefin de produção restrita ⇒ HTTP **403** | medição desta sessão, 10/10/2026 | V (o 403). Que a causa seja a falta de mTLS é **I** |
| `[XSD-DPS]` | `DPS` (ns `http://www.sped.fazenda.gov.br/nfse`) = `infDPS` + `ds:Signature` **0-1**; `@versao` obrigatório | `DPS_v1.01.xsd`, `tiposComplexos_v1.01.xsd:737-742` do zip <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip> (sha256 `e7935cbd9470…` = MANIFEST `nfse-xsd`) | V |
| `[XSD-IDDPS]` | `TSIdDPS` = `DPS[0-9]{42}`: "DPS" + Cód.Mun (7) + Tipo de Inscrição Federal (1) + Inscrição (14) + Série (5) + Núm. DPS (15) | `tiposSimples_v1.01.xsd:44-56` | V |
| `[XSD-NDPS]` | `TSNumDPS` = `[1-9]{1}[0-9]{0,14}` (sem zero à esquerda no elemento `nDPS`); `TSSerieDPS` = `^0{0,4}\d{1,5}$` | `tiposSimples_v1.01.xsd:158-161,1310-1318` | V |
| `[XSD-TPAMB]` | `TSTipoAmbiente`: 1 = Produção; 2 = Homologação | `tiposSimples_v1.01.xsd:57-70` | V |
| `[XSD-DSIG]` | o `xmldsig-core-schema.xsd` do pacote é o **genérico** do W3C: `Algorithm` é `anyURI` sem enumeração. O XSD **não fixa** algoritmo de assinatura, digest nem c14n | `xmldsig-core-schema.xsd:69-132` | V |
| `[XSD-PEDREG]` | `pedRegEvento` = `infPedReg` + `ds:Signature` 0-1; `TSIdPedRegEvt` = `PRE[0-9]{56}`. A documentação diz "PRE + chave + tipo do evento + nPedRegEvento", mas o padrão tem 56 dígitos = chave (50) + tipo (6). O XSD vence | `pedRegEvento_v1.01.xsd`; `tiposEventos_v1.01.xsd:69-75`; `tiposSimples_v1.01.xsd:1508-1518` | V (a divergência) |
| `[RN-DPS-SIG]` | E0714–E0718: assinatura da DPS válida, "certificado do emitente da DPS", obrigatória só via Web Service | [`TRANSCRICAO-NFSe-…-2026-09-27.md`](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md) §6 (Anexo I, aba RN, [645]–[649]) | V |
| `[RN-E0010]` | série 00001–49999 = "emissão com aplicativo próprio" | idem §5 | V |
| `[NFSE-ORIGEM]` | `ambGer` 2 = Sefin Nacional; `procEmi` 1 = "aplicativo do contribuinte (API)" | idem §2 ([15], [17]) | V |
| `[ENVELOPE-JSON]` | corpo `{"dpsXmlGZipB64": "<DPS gzip+base64>"}`; resposta de erro com `tipoAmbiente`, `versaoAplicativo`, `idDPS`, `erros[{Codigo, Descricao}]`; mTLS com A1 e-CNPJ do prestador; `GET /dps/{id}` não gerada ⇒ 404 `E2404` | relato de desenvolvedor, fórum ACBr: <https://www.projetoacbr.com.br/forum/topic/92867-nfs-e-nacional-sefin-produ%C3%A7%C3%A3o-restrita-%E2%80%94-e999-mesmo-com-xmldsig-ok-e-dps-equivalente-ao-emissor-web/> | **I**. Fonte secundária, sem resposta oficial. Só o Swagger com mTLS (D5) promove |

## 2. O que o código faz hoje e o que muda

1. **Não há adaptador real.** A seleção conhece `null` e `manual`. Todo o caminho de máquina (`consultar`, `cancelar`,
   job de polling) foi exercitado só com o `NullEmissor`.
2. **A porta não carrega credencial.** `emitir` recebe `cnpjEmitente` e `partnerAccountRef`; `consultar` e `cancelar`
   recebem só o `partnerRef`. Com A1 por unidade, o adaptador precisa da chave e do certificado **da unidade do
   documento** em cada chamada. A porta continua sem Prisma (§2.1): quem resolve a credencial é o serviço (item 16).
3. **O resultado do envio é descartado.** O POST da Sefin é síncrono e devolve a NFS-e. Hoje `createAndSend` e
   `reenviar` só gravam a falha de rede, e a nota ficaria `SENT` até o polling (F-ADN-5).
4. **A DPS existe só como JSON.** O XML (atributos `@versao` e `@Id`, namespace, ordem do XSD), a assinatura e o
   envelope gzip+base64 não existem.
5. **`reenviar` não refaz o `id`** com o número do documento (resíduo declarado do GAP-MAP l.73). Na Sefin, `Id` e
   `nDPS` divergentes seriam rejeitados (inferido do `[XSD-IDDPS]`, que amarra o número ao Id).
6. **A sequência não separa ambiente** (GAP-MAP l.139). O D5 de 07/10 faz disso requisito.
7. **A releitura confia em "modo manual".** As guardas de origem de `retornoManual` exigem `procEmi ∈ {2,3}` (portal).
   A nota emitida por nós volta com `procEmi = 1` (`[NFSE-ORIGEM]`), então a guarda precisa ser parametrizada por
   origem, e a série/número/Id passam a ser identidade (fomos nós que numeramos).

## 3. Checklist de comportamentos

`[direto]` = sem fork · `[cond:F-…]` = depende do fork · `[I]` = campo com grau I, que o runbook do D5 confirma ou
corrige sem mudar o comportamento. Cada item termina no teste que o prova. Nenhum item exige A1 real nem rede externa.

### PR-0 — Insumo e registro (docs, sem código)

1. **[cond:F-ADN-1]** Emenda do ADR-DFE (§12, docs): registra a reabertura da decisão 2 de 26/09 e a nova consequência
   do D1 (o Luminaris guarda o A1, cifrado, por unidade). Registra também o adaptador `adn` como protocolo próprio
   (decisão 3: um adaptador por protocolo) e os forks ratificados deste BRIEF. Critério: `node scripts/plano-vault.mjs check` sai 0.
2. **[direto]** Transcrição `fontes-oficiais/TRANSCRICAO-NFSe-API-Sefin-ADN-2026-10-XX.md` com as chaves da §1 deste
   BRIEF (`[API-*]`, `[ADN-DIST]`, `[HOSTS]`, `[XSD-*]`, `[RN-*]`) e a ordem dos elementos de `TCInfDPS` e `TCInfPedReg`
   tirada do XSD 1.01. `[ENVELOPE-JSON]` entra numa seção separada, "grau I, a confirmar pelo Swagger", e nunca vira
   chave citada por teste como fato. Entrada no `MANIFEST.md` para os dois manuais (sha já conferido).

### PR-1 — Certificado A1 por unidade (guarda, cifra, validade)

3. **[cond:F-ADN-2]** Model `FiscalCertificate` (Prisma first-class, §2.1: credencial de emissão legal), uma linha
   viva por `(userId, unitId)` (R8: um A1 por unidade/CNPJ), soft-delete com rename. Guarda chave privada PKCS#8 e
   certificado DER **cifrados** (`secretBox`, AAD = `id`), mais as projeções legíveis: `cnpjCertificado`,
   `notBefore`, `notAfter`, `fingerprintSha256`. Migração aditiva com prólogo `DROP TABLE IF EXISTS` (memória
   migracao-sqlite-nao-e-transacional). Teste: CRUD + tenancy + rename-on-delete; ciphertext copiado para outra linha
   não decifra.
4. **[cond:F-ADN-3]** Keyring da cifra: `secretBox` passa a receber o prefixo do env, e o certificado usa
   `DFE_CERT_KEYS` / `DFE_CERT_KEY_ACTIVE` (mesmo formato `"<versão>:<base64 32 bytes>"`). **Falha fechada:** sem
   keyring, gravar ou ler certificado ⇒ 503 `dfe_cert_key_missing`, sem efeito; o resto da aplicação sobe. Nada de
   chave padrão, nada de texto puro. **Pré-condição de deploy do M2** (§6.3). Teste: sem env ⇒ 503 e 0 linhas; com env ⇒
   ida e volta; versão antiga decifra depois da troca da ativa; os testes atuais do F5 seguem verdes sem edição.
5. **[cond:F-ADN-4]** Upload `PUT /api/accounting/fiscal-certificates/:unitId` (multipart: arquivo PFX/P12 + senha).
   O serviço abre o PKCS#12 **em memória**, extrai chave e certificado, descarta o PFX e a senha (nenhum dos dois é
   persistido nem logado) e valida antes de gravar: (i) chave privada corresponde ao certificado (assina e verifica um
   desafio); (ii) OtherName de CNPJ 2.16.76.1.3.3 presente (`readCertFacts`, `[SIG-CERT-CNPJ-OID]`); (iii) CNPJ do
   certificado bate com o CNPJ da unidade, regra exata em F-ADN-11; (iv) `notAfter` no futuro. Falha ⇒ 422 com o motivo
   nomeado. Teste: PFX gerado no teste com o CNPJ certo ⇒ 200 e view sem segredo; senha errada ⇒ 422
   `certificado_senha_invalida`; CNPJ de outra unidade ⇒ 422; vencido ⇒ 422; o log do teste não contém a senha.
6. **[direto]** `GET /api/accounting/fiscal-certificates/:unitId` devolve só a view (`cnpjCertificado`, `notBefore`,
   `notAfter`, `fingerprintSha256`, `diasParaVencer`, `setAt`). `DELETE` faz soft-delete e **zera** o ciphertext na
   mesma tx. Policy: `canManageFiscalCertificate` delegando a `canManageFiscalProfile` (molde `AccountingPolicy.ts`).
   Audit na mesma mudança: `fiscal_certificate.set` e `fiscal_certificate.removed` com `{unitId, fingerprintSha256,
   notAfter}` (sem CNPJ de terceiro, sem segredo; allowlist do `auditCanonical.ts`). Teste: guarda da allowlist; o
   DELETE deixa `ciphertext = null`.
7. **[cond:F-ADN-10]** Pré-voo de emissão: unidade sem certificado vivo, ou com `notAfter` anterior ao instante do
   envio ⇒ 400 com `faltantes: ['certificado A1 da unidade']`, nada criado. Certificado que vence em até N dias ⇒
   `avisos: ['certificado_vence_em_<n>_dias']` no preview e no `getStatus()`. Teste: relógio injetado; vencido ⇒ 400
   antes de consumir número da sequência.

### PR-2 — XML, assinatura, envelope, numeração (puro, sem rede)

8. **[direto]** `lib/dpsXml.ts` · `serializeDps(payload: DpsPayload): string` — namespace
   `http://www.sped.fazenda.gov.br/nfse` sem prefixo, `@versao` na raiz, `infDPS/@Id` = `payload.infDPS.id` (`[XSD-DPS]`,
   divergência 1 da transcrição: atributo `Id`), elementos na ordem do XSD (PR-0), `nDPS` sem zero à esquerda
   (`[XSD-NDPS]`), dinheiro como a string do DTO, sem campo fora do DTO. Teste: ida e volta, com o XML serializado lido
   pelo mesmo leitor da DPS embutida que `parseNfseAutorizada` usa, devolvendo os 13 campos da releitura iguais;
   golden file revisado à mão contra o XSD; DTO com campo extra é recusado antes de serializar.
9. **[cond:F-ADN-7]** `lib/dfeXmlSign.ts` · `signEnveloped(xml, rootLocalName, idOfSignedNode, credential, algos)`:
   `ds:Signature` enveloped como último filho de `<DPS>`, `Reference URI = "#" + infDPS/@Id`, transforms
   enveloped + c14n, `KeyInfo/X509Data/X509Certificate` só com o certificado do usuário final. Parâmetros de algoritmo
   vêm de **uma constante** (F-ADN-7), não espalhados. Guarda local antes de assinar: o CNPJ do certificado tem de
   bater com `prest/CNPJ` pela regra do F-ADN-11 (`[RN-DPS-SIG]`, E0718 "certificado do emitente da DPS"). Teste:
   certificado de teste com o CNPJ do prestador ⇒ assinatura verificada por um verificador espelho do
   `verifyNfseSignature`, apontado para `DPS`/`infDPS`; 1 byte do `infDPS` alterado depois de assinar ⇒ falha;
   certificado de outro CNPJ ⇒ erro local `dps_certificado_nao_e_do_emitente`, sem chamada de rede.
10. **[direto] [I]** `lib/adnEnvelope.ts` · `toDpsEnvelope(signedXml) → { dpsXmlGZipB64 }` e
    `fromGZipB64(b64) → string` (gzip + base64, `node:zlib`). O **nome** do campo vem de `[ENVELOPE-JSON]` (I) e
    fica numa constante única, corrigível pelo runbook do D5. Teste: ida e volta byte a byte; base64 malformado ⇒ erro
    nomeado `adn_envelope_invalido`.
11. **[direto]** `reenviar` refaz os 15 últimos dígitos do `id` com `doc.numero` (mesma operação do `createAndSend`).
    Fecha o resíduo do GAP-MAP l.73. Teste-guarda: documento REJECTED com `numero = 7` reenviado ⇒ `infDPS.id` termina
    em `000000000000007` e `nDPS = 7`.
12. **[cond:F-ADN-9]** Sequência por ambiente (D5, 07/10; GAP-MAP l.139): `FiscalDocumentSequence` passa a
    `@@id([userId, unitId, kind, ambiente, serie])`. `nextNumber` recebe o ambiente do documento. Migração: cada linha
    existente é **copiada** para os dois ambientes com o mesmo `last`. Assim nenhum número já consumido volta a ser
    usado em nenhum dos dois. Teste (integração, `--runInBand`): homologação e produção numeram independentemente a
    partir do `last` herdado; duas emissões concorrentes no mesmo ambiente não repetem número.

### PR-3 — Cliente HTTP com mTLS (rede só contra servidor local de teste)

13. **[direto]** `dfe/adn/AdnHttpClient.ts`: `https.request` com `key`/`cert` da credencial **por chamada** (sem
    agente global compartilhado entre unidades), `minVersion: 'TLSv1.2'`, `rejectUnauthorized: true`, timeout de
    conexão e de resposta configuráveis, corpo JSON, `Content-Type: application/json`. A URL vem da tabela de hosts por
    ambiente (F-ADN-12): `homologacao` ⇒ produção restrita (`[HOSTS]`), `producao` ⇒ produção. Teste: servidor
    `https.createServer({requestCert: true, rejectUnauthorized: true, ca})` local, com CA autoassinada gerada no teste:
    cliente sem certificado ⇒ falha de handshake; cliente com certificado da CA ⇒ 200; certificado de outra CA ⇒ falha;
    timeout ⇒ erro `adn_timeout` (não `REJECTED`).
14. **[direto] [I]** Classificação da resposta (função pura): 2xx com XML da NFS-e ⇒ `AUTHORIZED` + `xml`; 4xx com
    `erros[]` ⇒ `REJECTED`, com cada `codigo` E0xxx preservado **sem tradução** em `errors[].code`; 5xx, timeout,
    corpo ilegível ⇒ **lança** (o documento fica `SENT` com `dfe_emitir_failed` e entra na recuperação, item 20).
    Nomes dos campos de resposta = constantes únicas, grau I (`[ENVELOPE-JSON]`). Teste: tabela status × corpo ×
    resultado esperado; um 400 com `E0010` ⇒ `errors[0].code === 'E0010'`.

### PR-4 — Adaptador `adn` na porta

15. **[direto]** `dfe/adn/AdnEmissor.ts` implementa `DfeEmissorPort`: `name = 'adn'`; capabilities
    `{numbersDps: false, consultar: true, cancelar: [cond:F-ADN-13], webhook: false}` (a API não tem webhook,
    `[API-*]`); com o X10a, `kinds: ['NFSE']`. **Não** recusa `NODE_ENV=production` (é o adaptador real).
    `verifyWebhook` ⇒ `{ok: false}` sempre. Teste: unitário de capabilities; `verifyWebhook` nunca aceita.
16. **[direto]** Contrato da porta ganha a credencial resolvida pelo serviço (§4): `EmitirInput.credential?:
    DfeCredential` e um 2º parâmetro `ctx: DfeCallContext` em `consultar` e `cancelar`. `Null`/`Manual` ignoram.
    Quem abre o `FiscalCertificate` da unidade **do documento** é o serviço (emissão: a unidade do escopo; job e
    consulta: `doc.unitId`), nunca a porta. Teste: `tsc`; os testes atuais de Null/Manual verdes sem editar asserção;
    o job de polling resolve a credencial pelo `unitId` do documento, não pelo escopo do chamador.
17. **[cond:F-ADN-6]** `emitir`: `serializeDps` → `signEnveloped` → `toDpsEnvelope` → `POST /nfse` → item 14.
    `partnerRef` = `infDPS/@Id` (45 caracteres). Teste com o servidor local do item 13 programado: 201 com NFS-e ⇒
    `AUTHORIZED` e `xml`; 400 com `E0010` ⇒ `REJECTED`; o corpo que chegou ao servidor descomprime para um XML cuja
    assinatura verifica.
18. **[cond:F-ADN-5]** Resultado síncrono aplicado: `createAndSend` e `reenviar` passam o `EmissaoResult` imediato
    para o **mesmo** `applyResult` do ciclo (via `FiscalDocumentLifecycleService`, sem caminho paralelo) quando o
    status ≠ `PROCESSING`. A falha de rede continua como hoje. Teste: emissão com o servidor local devolvendo NFS-e ⇒
    o documento sai da chamada `AUTHORIZED` (ou `AUTHORIZED_DIVERGENT`) com `xmlAttachmentId` ou pendência de anexo, e
    o job de polling não volta a consultá-lo.
19. **[direto]** Releitura obrigatória na autorização por máquina: o XML devolvido passa por `parseNfseAutorizada`
    (assinatura da Sefin primeiro, E1630/E1634) → `compareNfseWithDps` → guardas de identidade **extraídas** de
    `retornoManual` numa função compartilhada, parametrizada pela origem esperada. Origem `adn`: `ambGer = 2` ∧
    `procEmi = 1` (`[NFSE-ORIGEM]`); `tpAmb` = ambiente do documento; prestador = emitente; **`DPS/@Id`, `serie` e
    `nDPS` iguais aos enviados** (fomos nós que numeramos); chave não usada em outro documento (dentro da tx).
    Divergência de identidade ⇒ `REJECTED` local com `dfe_identidade_divergente` e alerta (a nota existe no fisco e
    exige ação humana); divergência de conteúdo ⇒ `AUTHORIZED_DIVERGENT` (F-MAN-2 c, inalterado). Teste: NFS-e de
    teste assinada por um certificado "Sefin" gerado no teste, com a DPS embutida igual ⇒ `AUTHORIZED`; `vServ`
    mutado ⇒ `AUTHORIZED_DIVERGENT`; `nDPS` trocado ⇒ identidade; `procEmi = 2` ⇒ identidade; os testes atuais de
    `retornoManual` verdes sem editar asserção.
20. **[cond:F-ADN-8]** Recuperação de falha de rede: o job de polling, para documento `adn` em `SENT` com
    `dfe_emitir_failed` há mais de N minutos, chama `consultar(Id)` = `GET /dps/{id}` (`[API-DPS-GET]`) → se houver
    chave, `GET /nfse/{chave}` → item 19. Sem chave (404/`E2404`, grau I) ⇒ resultado conforme o F-ADN-8. **Nunca**
    reenvia sozinho. Teste: servidor local que "perde" a resposta do POST mas gerou a nota ⇒ o job encontra pela
    consulta e autoriza **uma** vez; servidor sem a nota ⇒ o documento segue o ramo ratificado.
21. **[cond:F-ADN-13]** `cancelar(Id, ctx, {cMotivo, xMotivo})`: monta `pedRegEvento` (`infPedReg/@Id` =
    `"PRE" + chave + "101101"`, 59 caracteres pelo `[XSD-PEDREG]`; `tpAmb` do documento; `CNPJAutor` = emitente;
    `chNFSe`; `e101101{xDesc, cMotivo, xMotivo}`), assina (item 9, Reference `#` + `infPedReg/@Id`), envia
    `POST /nfse/{chave}/eventos` (`[API-EVT-POST]`). O evento devolvido passa por `verifyNfseEventoSignature` +
    `parseEventoCancelamento` (chave e motivo conferidos) ⇒ `CANCELLED`; rejeição com o código do prazo municipal
    (E0822, BRIEF X11 §1.2) ⇒ `OUT_OF_WINDOW`; outra rejeição ⇒ `REJECTED`. Teste: servidor local devolvendo evento
    assinado ⇒ `CANCELLED` e XML do evento anexado; `E0822` ⇒ 409 `DFE_CANCEL_OUT_OF_WINDOW` (caminho existente).
22. **[direto]** Seleção: `selectDfeEmissor` aceita `DFE_PARTNER=adn` com `DFE_PARTNER_ENV` obrigatório;
    `resolveEmissorFor('adn')` resolve o adaptador; a guarda `dfe_ambiente_divergente` (GAP-MAP l.74) vale igual.
    Teste: matriz env × partner; documento `adn` de homologação com env em produção ⇒ 400 nos dois caminhos.
23. **[direto]** `tpAmb`: documento `homologacao` ⇒ `tpAmb = 2` (`[XSD-TPAMB]`) **e** host de produção restrita;
    `producao` ⇒ 1 e host de produção. Uma tabela só, nas duas direções, ao lado de `tpAmbFor` (F-AMB-6 a). Teste:
    `assertTpAmb` + host derivado do mesmo ambiente; impossível montar `tpAmb = 2` apontando para produção.

### PR-5 — Rotas, DTOs, gates

24. **[direto]** Rotas novas em 2 toques (`index.ts` + `docs.paths.ts`; `npm run docs:generate`; BASELINE do
    `openapi-paths.test.ts`): `PUT/GET/DELETE /api/accounting/fiscal-certificates/:unitId`. Deny-by-default. O upload
    tem limite de tamanho (PFX < 64 KB) e `multer` em memória, nunca em disco.
25. **[direto]** DTOs `.strict()` + snapshot de shape: `UploadFiscalCertificateSchema` (senha `min(1).max(128)`,
    nunca ecoada), `FiscalCertificateViewSchema`. `getStatus()` do DF-e passa a expor `certificado: {presente,
    diasParaVencer}` por unidade.
26. **[direto]** Gates: `tsc` ×2; `npm run test:integration`; snapshot DTO; `docs:generate` sem diff; allowlist do
    audit; paridade i18n se houver mensagem nova exposta. Mutação manual, cada uma tem de ficar vermelha: (i) tirar a
    guarda de CNPJ do item 9; (ii) tirar `ambiente` da chave da sequência (item 12); (iii) aceitar `procEmi = 2` na
    origem `adn` (item 19); (iv) gravar a senha do PFX em qualquer coluna (teste do item 5 procura a senha no banco).

## 4. Contratos esboçados

```ts
// dfe/DfeEmissorPort.ts — acréscimos (item 16)
export interface DfeCredential {               // em memória, nunca serializada nem logada
  keyPem: string;                              // PKCS#8
  certPem: string;                             // usuário final (EndCertOnly)
  cnpj: string;                                // do OtherName 2.16.76.1.3.3
  notAfter: string;                            // AAAA-MM-DD
}
export interface DfeCallContext { ambiente: DfeAmbiente; credential?: DfeCredential }
export interface EmitirInput { /* …inalterado… */ credential?: DfeCredential }
export interface DfeEmissorPort {
  // emitir inalterado na assinatura
  consultar(partnerRef: string, ctx?: DfeCallContext): Promise<EmissaoResult>;
  cancelar(partnerRef: string, motivo: { cMotivo: 1 | 2 | 9; xMotivo: string }, ctx?: DfeCallContext): Promise<CancelResult>;
}
// Com o X10a mergeado, `cancelar` usa a união `CancelInput` do BRIEF NFCE (item 7); o ramo NFSE é este.
```

```ts
// dfe/adn/adnContract.ts — campos [I] em constantes únicas (item 10, 14). Corrigíveis pelo runbook do D5.
export const ADN_FIELDS = { dpsIn: 'dpsXmlGZipB64', nfseOut: 'nfseXmlGZipB64' /* [I] nome de saída não visto */, erros: 'erros' } as const;
export const AdnErroSchema = z.object({ Codigo: z.string(), Descricao: z.string() }).passthrough();   // [I] fórum
export const AdnRejeicaoSchema = z.object({
  tipoAmbiente: z.union([z.literal(1), z.literal(2)]).optional(),
  versaoAplicativo: z.string().optional(),
  idDPS: z.string().regex(/^DPS\d{42}$/).optional(),
  erros: z.array(AdnErroSchema).min(1),
}).passthrough();                             // passthrough: resposta de terceiro, não DTO nosso
export const ADN_HOSTS: Record<DfeAmbiente, { sefin: string; adn: string }> = {   // [HOSTS] V (docs) / caminho base I
  homologacao: { sefin: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional', adn: 'https://adn.producaorestrita.nfse.gov.br/contribuintes' },
  producao:    { sefin: 'https://sefin.nfse.gov.br/SefinNacional',                    adn: 'https://adn.nfse.gov.br/contribuintes' },
};
```

```ts
// dtos/FiscalCertificateDto.ts (item 25)
export const UploadFiscalCertificateSchema = z.object({
  senha: z.string().min(1).max(128),          // arquivo vem do multer (memória), não do corpo JSON
}).strict();
export const FiscalCertificateViewSchema = z.object({
  unitId: z.string(), cnpjCertificado: z.string().regex(CNPJ_REGEX),
  notBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diasParaVencer: z.number().int(), fingerprintSha256: z.string().regex(/^[0-9a-f]{64}$/), setAt: z.string().datetime(),
}).strict();
```

```prisma
// cond. F-ADN-2 (a)
model FiscalCertificate {
  id                 String    @id @default(cuid())
  userId             String
  unitId             String
  keyCiphertext      Bytes?    // PKCS#8 cifrado (secretBox, AAD = id); null após DELETE
  certCiphertext     Bytes?    // DER do certificado do usuário final, cifrado
  keyVersion         Int?
  cnpjCertificado    String    // projeção legível (OtherName 2.16.76.1.3.3)
  notBefore          String    // AAAA-MM-DD
  notAfter           String
  fingerprintSha256  String
  setById            String?
  setAt              DateTime  @default(now())
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  @@unique([userId, unitId])  // soft-delete com rename (padrão ServiceFiscalProfile)
  @@map("fiscal_certificates")
}

// cond. F-ADN-9: FiscalDocumentSequence @@id([userId, unitId, kind, ambiente, serie]); linhas antigas copiadas para os 2 ambientes.
```

```env
# Pré-condição de deploy do M2 (§6.3), cond. F-ADN-3 (b)
DFE_CERT_KEYS="1:<base64 de 32 bytes>"    # backup SEPARADO do backup do .db
DFE_CERT_KEY_ACTIVE=1
DFE_PARTNER=adn
DFE_PARTNER_ENV=homologacao               # producao só depois do runbook do D5 + "executa" da emissão real
```

## 5. Forks — RATIFICAÇÃO PENDENTE (nenhum se auto-ratifica)

### F-ADN-1 — Registro da reabertura da decisão 2 (26/09) e do D1 do ADR
- **(a)** Emenda do ADR-DFE (§12) e nota de decisão citando o fold de 07/10 como cumprimento da condição (b) da
  decisão 2 ("aceite de custódia do A1, com cifra decidida no M2"), **antes** do PR-1.
- **(b)** Considerar a fala de 07/10 suficiente e seguir sem emenda.
- **Recomendação: (a).** O ADR ainda diz "o Luminaris nunca guarda certificado A1/A3", e a nota de decisão diz
  "emissão direta fora". Um executor que leia os dois vai parar no PR-1. A condição (a) da decisão 2 (demanda de
  cliente só-serviço sensível a preço) também não foi registrada como cumprida; só o dono diz se ela ainda importa.
  **RATIFICAÇÃO PENDENTE.**

### F-ADN-2 — Onde mora o A1
- **(a)** Tabela nova `FiscalCertificate` por unidade, cifrada por linha (molde do `PaymentAccount`).
- **(b)** Colunas cifradas no `FiscalProfile`.
- **(c)** Arquivo PFX + senha no env/disco da instância (estilo D2, "uma chave por instância").
- **Recomendação: (a).** R8 pede um A1 por unidade, e o `FiscalProfile` já tem dezenas de colunas de natureza
  diferente (contas e parâmetros, `schema.prisma:1404-1490`). (c) quebra com duas unidades e põe o segredo fora da cifra com AAD. Custo de (a): uma tabela e
  uma rota. **RATIFICAÇÃO PENDENTE.**

### F-ADN-3 — Chave da cifra do A1
- **(a)** Reusar o keyring do F5 (`PAYMENT_CREDENTIAL_KEYS`).
- **(b)** Keyring próprio `DFE_CERT_KEYS`, com o `secretBox` parametrizado pelo prefixo.
- **Recomendação: (b).** O A1 assina documento fiscal em nome do cliente, o que é risco maior que um token de
  cobrança. Rotação e backup separados, e o vazamento de um não abre o outro. O custo é um parâmetro no `secretBox`
  e uma linha a mais no runbook do M2. **RATIFICAÇÃO PENDENTE.**

### F-ADN-4 — Como abrir o PKCS#12
- **(a)** Dependência nova `node-forge` (JS puro), versão fixada, só no upload; os testes também a usam para gerar PFX.
- **(b)** `openssl pkcs12` por processo filho.
- **(c)** Não aceitar PFX: o cliente sobe chave PEM + certificado PEM.
- **Recomendação: (a).** O `node:crypto` não lê PKCS#12; o TLS aceita `pfx`, mas a assinatura XML precisa da chave em
  PEM. (b) depende de binário no host da VPS e no CI. (c) empurra para o cliente uma conversão que ele não sabe fazer
  (o A1 vem em .pfx da AC). Custo de (a): dependência nova, com auditoria de versão. **RATIFICAÇÃO PENDENTE.**

### F-ADN-5 — Aplicar o resultado síncrono no envio
- **(a)** `createAndSend`/`reenviar` aplicam o resultado imediato pelo `applyResult` existente.
- **(b)** Manter `SENT` e deixar o polling buscar por `GET /dps/{id}`.
- **Recomendação: (a).** O POST devolve a NFS-e (`[API-NFSE-POST]`); com (b), cada nota custa uma 2ª e uma 3ª chamada
  e fica minutos "em envio" na tela. O risco de (a) é a corrida com o polling; o `applyResult` já tem guarda de
  transição dentro da tx (`whenStatusIn`). **RATIFICAÇÃO PENDENTE.**

### F-ADN-6 — `partnerRef` do documento `adn`
- **(a)** `partnerRef` = `infDPS/@Id` (45 caracteres, a chave que a API consulta).
- **(b)** Manter o `attemptRef` `"<id>:<n>"` e derivar o Id do payload a cada consulta.
- **Recomendação: (a).** A Sefin não conhece o nosso `ref` (não há idempotência por referência como na Focus). O Id
  da DPS **é** a chave de idempotência dela: o mesmo Id não gera duas notas (inferido do `[API-DPS-GET]`). O
  `attemptRef` continua sendo a chave da tentativa no banco. **RATIFICAÇÃO PENDENTE.**

### F-ADN-7 — Algoritmos da assinatura da DPS e do pedido de evento
- **(a)** Fixar rsa-sha256 + sha256 + c14n.
- **(b)** Fixar rsa-sha1 + sha1 + c14n, os parâmetros do MOC 7.0 da NF-e (`[SIG-*]`, mesma família de padrão).
- **(c)** Constante única com (b) como padrão inicial, trocada só pelo resultado do runbook do D5.
- **Recomendação: (c).** O XSD não fixa algoritmo (`[XSD-DSIG]`), o corpus não fixa, e o nosso verificador já aceita
  os dois (`nfseSignature.ts:28-32`). (b) é o único parâmetro com fonte primária na família. O runbook fecha a dúvida
  com uma nota de verdade. **RATIFICAÇÃO PENDENTE.**

### F-ADN-8 — Falha de rede depois do POST: o que fazer quando a consulta não acha a nota
- **(a)** O job consulta `GET /dps/{id}`; achou ⇒ item 19; não achou em N tentativas espaçadas ⇒ `REJECTED` com
  `dfe_nao_recebida` (libera o `reenviar` com o **mesmo** número).
- **(b)** Não achou ⇒ fica `SENT` com pendência visível até o operador decidir.
- **Recomendação: (a)**, com N e espaçamento como constantes. (b) deixa nota parada sem prazo. (a) só é seguro se o
  mesmo Id puder ser reenviado depois de não gerar nota, e isso é pergunta **L-ADN-2**; até a resposta, (a) com
  reenvio manual (nunca automático). **RATIFICAÇÃO PENDENTE.**

### F-ADN-9 — Sequência por ambiente: quem migra a tabela
- **(a)** Este BRIEF migra a chave para incluir `ambiente` em **todos** os tipos (item 12); o PR-4 do BRIEF NFCE
  passa a só consumir.
- **(b)** O PR-4 do BRIEF NFCE migra (F-NFCE-4 a) e este BRIEF espera.
- **Recomendação: (a).** O D5 de 07/10 põe a sequência por ambiente como requisito do emissor de NFS-e, e a NFS-e é
  a primeira a sair (01/11/2026). Duas migrações na mesma chave em PRs diferentes colidem; quem chegar primeiro migra,
  e a outra emenda registra isso. **RATIFICAÇÃO PENDENTE.**

### F-ADN-10 — Pré-voo de validade do A1
- **(a)** Recusa com o A1 vencido + aviso a partir de 30 dias antes.
- **(b)** Só recusa.
- **(c)** (a) + job diário que grava alerta no painel.
- **Recomendação: (a).** Mesmo princípio do pré-voo previsto no passo E.3 do plano. (c) é frente de notificação (FE);
  fica em achados. **RATIFICAÇÃO PENDENTE.**

### F-ADN-11 — CNPJ do certificado × CNPJ da unidade emitente
- **(a)** Igualdade dos 14 dígitos (R8 literal: "um A1 por unidade/CNPJ").
- **(b)** Igualdade da raiz (8 dígitos), como o SIG-NFE aceita na NF-e (`[SIG-CERT-CNPJ]`, F-SIG-3 b).
- **Recomendação: (a) até a L-ADN-1 responder.** A RN E0718 fala em "certificado do emitente da DPS", e só a
  distribuição do ADN declara a regra da raiz (`[ADN-DIST]`). (b) deixaria a filial emitir com o A1 da matriz, e
  isso a fonte de emissão não autoriza por escrito. Custo de (a): filial sem A1 próprio não emite. **RATIFICAÇÃO PENDENTE.**

### F-ADN-12 — Endereços da API
- **(a)** Tabela no código (`ADN_HOSTS`, citando a página gov.br de 20/08/2026) com override por env só para o
  caminho base.
- **(b)** Só env (`DFE_ADN_SEFIN_URL`, `DFE_ADN_URL`).
- **Recomendação: (a).** O host por ambiente é fato oficial e não deve depender de digitação no deploy; o caminho base
  (`/API/SefinNacional` × `/SefinNacional`) é o único ponto de grau I e o runbook pode exigir troca. **RATIFICAÇÃO PENDENTE.**

### F-ADN-13 — Cancelamento por API neste BRIEF ou no PR-2 do X11
- **(a)** Neste BRIEF: o adaptador nasce com `cancelar: true` (item 21). A janela e a substituição seguem no X11.
- **(b)** `cancelar: false` aqui; o cancelamento por máquina entra no PR-2 do X11.
- **Recomendação: (a).** Sem (a), a primeira nota errada emitida pelo `adn` só se cancela no portal, por fora, e o
  documento fica `AUTHORIZED` no Luminaris. O caminho de cancelamento já existe na porta e no serviço; falta só o
  protocolo. **RATIFICAÇÃO PENDENTE.**

## 6. Pendente de validação externa

### 6.1 Contrato da API (só o Swagger com mTLS ou o runbook respondem)

| Ponto | Grau hoje | Quem responde |
|---|---|---|
| Nome do campo de entrada (`dpsXmlGZipB64`) e de saída da NFS-e no POST | I (fórum) | Swagger da Sefin com certificado (D5) |
| Códigos HTTP de sucesso (201?) e de rejeição; forma de `erros[]` (`Codigo`/`Descricao`) | I | idem |
| Caminho base da API em cada ambiente | I | idem |
| Algoritmo de assinatura aceito (F-ADN-7) | NV | runbook do D5 |
| `GET /dps/{id}` de DPS não gerada devolve 404/`E2404` | I | runbook do D5 |
| A produção restrita exige cadastro/habilitação prévia do CNPJ | NV (o relato do fórum pergunta isso, sem resposta) | runbook do D5 |
| Parâmetros municipais de São Paulo (convênio, alíquota) pela API `[API-PARAM]` | NV | consulta com certificado |

### 6.2 Gate humano — runbook do D5 (fora do checklist; o agente prepara em branco)

`RUNBOOK-D5-ADN-HOMOLOGACAO.md` (formato `RUNBOOK-FORMAT`), preparado depois do PR-4 com "executa": pré-condições (A1
de teste do dono instalado pela rota do item 5, keyring no env, `DFE_PARTNER=adn`, `DFE_PARTNER_ENV=homologacao`); 1
DPS autorizada na produção restrita com releitura `IGUAL`; 1 rejeição proposital com o código E0xxx preservado; 1
consulta por Id; 1 cancelamento. A EVIDÊNCIA é a saída literal; desfecho e assinatura são do dono.

### 6.3 Pré-condição de deploy do M2

`DFE_CERT_KEYS`/`DFE_CERT_KEY_ACTIVE` provisionados antes do 1º upload de certificado, com backup **separado** do
backup do `.db` (senão a cifra não protege o dump). Onde a chave mora além do env (cofre, KMS) é decisão do M2, não
deste BRIEF. Linha a acrescentar na nota do M2 e no runbook do M2 quando o PR-1 tiver "executa".

## 7. Perguntas de lei

### L-ADN-1 — O A1 da matriz serve para a filial?
- **(a) Pergunta:** a DPS de uma filial pode ser assinada, e a conexão mTLS feita, com o e-CNPJ da matriz (mesma raiz,
  CNPJ de 14 dígitos diferente)?
- **(b) Por que importa:** decide o F-ADN-11 e a validação do item 5 (CNPJ do certificado × unidade). Com "sim", o
  cliente com filiais compra um A1 só; com "não", cada unidade precisa do seu. Também fecha o ponto que o ADR-DFE
  §2 R8 item 4 deixou como "INFERIDO até o BRIEF citar a fonte".
- **(c) O que a pesquisa encontrou:** a RN E0718 do Anexo I diz "certificado do emitente da DPS"
  ([`TRANSCRICAO-NFSe-…`](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md) §6). O manual do
  ADN aceita certificado com a mesma raiz **só para as consultas de distribuição**
  (<https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf>,
  §1.1, acesso 10/10/2026). Na NF-e, o MOC 7.0 aceita "CNPJ de um dos estabelecimentos" (`[SIG-CERT-CNPJ]`). Não basta:
  nenhuma fonte da NFS-e diz se "emitente" se lê pela raiz ou pelos 14 dígitos na emissão.
- **(d) Quem responde:** órgão (Receita Federal / Secretaria-Executiva do CGNFS-e, canal de suporte do Sistema
  Nacional NFS-e), ou o runbook do D5 com dois CNPJs da mesma raiz.

### L-ADN-2 — Número de DPS rejeitada ou não recebida pode ser reusado?
- **(a) Pergunta:** quando a Sefin rejeita uma DPS (ou ela não chega), o mesmo número/Id pode ser reenviado? E número
  consumido que nunca vira nota precisa de alguma justificativa ou inutilização na NFS-e nacional?
- **(b) Por que importa:** decide o F-ADN-8 e mantém ou derruba o comportamento atual do `reenviar` (reusa
  `doc.numero`). Se o número "queima" na rejeição, o reenvio tem de consumir um novo número, e a sequência ganha
  lacunas que podem precisar de registro.
- **(c) O que a pesquisa encontrou:** o manual da API diz que a rejeição devolve "a mensagem de erro com o motivo"
  (§1.3.2 a, URL na §1) e não fala em reuso. A NFS-e nacional não tem evento de inutilização entre os 16 do Anexo II
  ([`BE-INCR-DFE-EVENTOS-brief.md`](BE-INCR-DFE-EVENTOS-brief.md) §1.1). Pelo fórum (grau I), a consulta de DPS
  rejeitada dá 404 `E2404`, o que sugere que nada foi gravado. Não basta: é comportamento observado, não regra.
- **(d) Quem responde:** órgão (suporte do Sistema Nacional NFS-e) ou a regra correspondente do Anexo I (aba RN),
  que o PR-0 pode procurar. Se o Anexo I não tiver, vale como pergunta ao suporte.

### L-ADN-3 — Sequência da DPS separada por ambiente é exigência ou só boa prática?
- **(a) Pergunta:** homologação (produção restrita) e produção podem consumir a mesma série/numeração da DPS, ou a
  numeração de produção precisa ser contínua, sem os buracos que os testes deixariam?
- **(b) Por que importa:** o item 12 separa por ambiente porque o D5 manda. Se houver regra de continuidade, a
  migração precisa de outra forma de tratar as linhas antigas, e não só copiá-las. O GAP-MAP l.139 marca o impacto
  legal como "INFERIDO (fonte não conferida)".
- **(c) O que a pesquisa encontrou:** a produção restrita é "cópia do ambiente de produção, sem validade jurídica"
  (apresentação RFB, <https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/apresentacoes/reforma-tributaria-do-consumo/nfs-e_live_rj_es.pdf/@@download/file>,
  acesso 10/10/2026), e o `tpAmb` separa os dois (`[XSD-TPAMB]`). Nada sobre continuidade da numeração.
- **(d) Quem responde:** contador (prática de fiscalização municipal sobre lacuna de numeração) e, se ele não souber,
  órgão (suporte do Sistema Nacional NFS-e).

### L-ADN-4 — O software pode transmitir com certificado próprio?
- **(a) Pergunta:** no `POST /nfse`, a conexão mTLS precisa usar o certificado do prestador, ou pode usar o e-CNPJ do
  Luminaris (transmissor), com a DPS assinada pelo A1 do prestador?
- **(b) Por que importa:** se puder, o mTLS usa um certificado só por instância, e o A1 do cliente só assina. Isso não
  elimina a custódia, mas muda o contrato de credencial (item 16) e o que o runbook testa.
- **(c) O que a pesquisa encontrou:** o manual da API amarra a consulta por Id ao "certificado digital da conexão
  solicitante" ser de um ator da nota (§1.4.2 a), mas não diz nada sobre quem transmite no POST. O relato do fórum usa
  o A1 do próprio prestador nas duas pontas (grau I). Os anexos da NFS-e Via (municipal) falam em transmissor e-CNPJ,
  mas são de outro sistema.
- **(d) Quem responde:** órgão (suporte do Sistema Nacional NFS-e) ou o runbook do D5.

### L-ADN-5 — Custódia do A1 do cliente pelo fornecedor do software
- **(a) Pergunta:** o que o Luminaris precisa ter (contrato, autorização expressa do titular, termo de
  responsabilidade, base legal na LGPD) para guardar e usar a chave privada do A1 do cliente na emissão?
- **(b) Por que importa:** é a condição (b) da decisão 2 de 26/09 e a consequência que o ADR-DFE D1 proibia. Sem
  resposta, o PR-1 grava um segredo de terceiro sem lastro contratual. Não bloqueia código em homologação; bloqueia o
  1º A1 de cliente em produção.
- **(c) O que a pesquisa encontrou:** o DOC-ICP-05, item 2.1.3 (redação da Resolução ITI 74), lista como obrigação do
  titular "garantir a proteção e o sigilo das chaves privadas, senhas e dispositivos criptográficos" e usar a chave
  conforme a Política de Certificado
  (<https://mailman.iti.gov.br/images/repositorio/legislacao/resolucoes/em-vigor/Resolucao_74.pdf>, acesso
  10/10/2026). Não fala de terceiro que guarda a chave em nome do titular, nem de responsabilidade do fornecedor.
- **(d) Quem responde:** advogado (contrato e LGPD), com a PC da AC emissora do A1 do cliente como insumo.

## 8. Insumos ausentes (pausados, não varridos — regra 2)

1. **Swagger da Sefin Nacional** (JSON): 403 sem certificado de cliente. Destino: runbook do D5. Até lá, os campos da
   §4 marcados `[I]` ficam em constantes únicas.
2. **Validador de XSD no CI** (o Node não valida XSD sem dependência). O item 8 prova por ida e volta e golden file; a
   validação formal contra o XSD 1.01 fica para o runbook, ou para um fork de dependência que este BRIEF não abre.
3. **Anexo IV do ADN** (`NFSe-ANEXO-IV-ADN-v1.00.xlsx`, sha no MANIFEST): não está no disco desta worktree. O PR-0 o
   rebaixa se a distribuição por NSU entrar em escopo (hoje não entra; §9 item 2).
4. **Regras do Anexo I para duplicidade de DPS** (pergunta L-ADN-2): a planilha não está no disco; o PR-0 procura na
   aba RN.
5. **CNPJ do certificado com que a Sefin assina a NFS-e** (transcrição §9): segue fora do corpus. O item 19 confere
   integridade e OtherName, não o titular (mesmo limite do `retornoManual`).

## 9. Achados fora de escopo (registrados, não planejados)

1. **Entrega da nota ao tomador** (F-MCE-1 ratificado 02/10 → (a): "a Focus envia"): perde o objeto com o emissor
   próprio. O ADN tem API de DANFSe (`[HOSTS]`, `…/danfse/docs`). Frente nova: exige autorização própria.
2. **Distribuição por NSU** (`GET /DFe/{NSU}`, `[ADN-DIST]`): captura de NFS-e tomadas (F-MCE-2, Fase G). Mesmo
   certificado, outro nó.
3. **Pré-checagem pelos parâmetros municipais** (`[API-PARAM]`): consultar alíquota/convênio antes de montar a DPS
   reduziria rejeição. Não pedido aqui.
4. **Tela do certificado** (upload, validade, aviso de vencimento) e alerta diário (F-ADN-10 c): BRIEF de FE próprio.
5. **Notas do vault desatualizadas:** X10a e X10i ainda citam "D5 (Focus)" e a "rota NFS-e Nacional da Focus" (o fold
   do D5 de 07/10 já registra). O passo E.3 do plano ainda chama o BRIEF de `BE-INCR-DFE-FOCUS`. Fold depois da
   ratificação (regra 1: não editado aqui).
6. **Data de obrigatoriedade do Simples:** um comunicado municipal (Fortaleza, via legisweb,
   <https://www.legisweb.com.br/legislacao/?id=498664>) cita a Resolução CGSN **189**/2026 com obrigatoriedade em
   **01/09/2026**, e o corpus tem a notícia RFB da CGSN **191**/2026 com **01/11/2026**. Fonte secundária, não
   conferida: vale reconferir na Receita antes de prometer prazo ao cliente.
7. **`lib/nfseSignature.ts` exige `infNFSe/dhProc` dentro da validade do certificado da Sefin:** se a Sefin trocar de
   certificado, notas antigas relidas depois continuam válidas (a regra é sobre `dhProc`). Sem ação.

## 10. Plano de execução por fatias (para a `sessao-feature`, só depois de "executa")

| PR | Itens | Depende |
|---|---|---|
| PR-0 (docs) | 1–2 | F-ADN-1 |
| PR-1 certificado | 3–7, 24–25 (parte) | F-ADN-2, 3, 4, 10, 11 |
| PR-2 XML/assinatura/numeração | 8–12 | F-ADN-7, 9, 11 |
| PR-3 cliente mTLS | 13–14 | PR-2 |
| PR-4 adaptador | 15–23, 26 | F-ADN-5, 6, 8, 12, 13; PR-1..3 |
| — runbook D5 | §6.2 | PR-4 + A1 de teste + "executa" da emissão real |

## 11. Gates de envio [OPS-001]

1. **Objetivo:** o pedido é poder construir o emissor próprio sem esperar o A1. A §3 inteira se prova com certificado
   gerado no teste e servidor HTTPS local com mTLS (itens 5, 9, 13, 17–21). O que exige A1 real está isolado na §6.2.
2. **Grau:** endpoints e regras do XSD V, com URL e sha (§1); envelope JSON I (fórum, §1 `[ENVELOPE-JSON]`); código
   V com arquivo:linha (§0).
3. **Caso adversarial tentado:** "o Swagger público dá os nomes de campo" → `curl` nos dois índices da Sefin de
   produção restrita devolveu 403 (medido 10/10), e por isso os campos ficaram com grau I, em constante única.
   Também: "o GAP-MAP l.73 está aberto" → lido no arquivo: corrigido em 07/10 no `createAndSend`, com resíduo no
   `reenviar` (item 11). Também: "o XSD fixa rsa-sha1 como na NF-e" → o `xmldsig-core-schema.xsd` do pacote é o
   genérico, sem enumeração (F-ADN-7).
4. **Checagem que teria falhado:** sha256 dos três arquivos baixados igual ao MANIFEST (`ac2f36e34ff5`,
   `9ffc97d8b1be`, `e7935cbd9470`): confere. Se o governo tivesse reeditado, o sha mudaria.
5. **Vieses (T8):** puxei para reusar o que existe (`secretBox`, `readCertFacts`, helper de teste, `applyResult`). Esse
   viés é deliberado pelo critério de reuso, mas o F-ADN-3 e o F-ADN-4 dizem o custo. O desenho da Focus influenciou
   o F-ADN-6. A Focus tem `ref`, e a Sefin não tem, então a recomendação vai contra copiar a Focus.
