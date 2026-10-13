# BRIEF — Emenda PSC do BE-INCR-DFE-ADN-EMISSOR (assinatura por certificado em nuvem contratado pelo Luminaris) — nó X10i

> Produzido em `sessao-planejamento` (2026-10-12), nó [`X10i`](../plano/nos/X10i.md), gate [`D5`](../plano/gates/D5.md).
> **Este documento não escreve código.** Emenda o [`BE-INCR-DFE-ADN-EMISSOR-brief.md`](BE-INCR-DFE-ADN-EMISSOR-brief.md)
> (chamado aqui de "BRIEF-ADN"): diz o que cai, o que fica e o que entra. Forks novos **F-PSC-1..8, todos
> RATIFICADOS (a) em 12/10** (F-PSC-1 segue condicionado à L-ADN-4). A `sessao-feature` só abre com "executa" do dono, e a emissão real continua exigindo o
> "executa" da emissão (regra do X10i).
>
> **Em duas linhas:** a assinatura da DPS sai do A1 guardado e vai para a API OAuth do PSC (DOC-ICP-17.01 §6.4); o resto
> do BRIEF-ADN (XML, envelope, numeração, adaptador, releitura) fica. **Risco principal:** o mTLS com a Sefin. A chave
> do certificado em nuvem nunca sai do PSC, e a API do PSC assina *hash*, não *handshake TLS*. Então a conexão não pode
> usar o certificado do cliente, e só funciona se a Sefin aceitar um certificado de transmissor (o do Luminaris) — é a
> pergunta **L-ADN-4**, que deixa de ser curiosidade e passa a **bloquear o PR-3** (F-PSC-1).

---

## 0. Contexto fixo (não rediscutir)

### Autorização
- Dono, chat, 2026-10-12: *"executa a emenda do BRIEF do ADN para o PSC"*. Cobre **este documento** (planejamento da
  emenda). Não cobre código, nem a emissão real.

### Decisões já ratificadas que esta emenda respeita como fato
| Decisão | Fonte | Efeito aqui |
|---|---|---|
| F-E8-1R = (a): certificado em nuvem num PSC para NFS-e, NF-e e NFC-e | [`BE-INCR-DFE-ASSINATURA-PLANEJAMENTO-2026-10-11.md`](BE-INCR-DFE-ASSINATURA-PLANEJAMENTO-2026-10-11.md) §5 (#635) | Uma porta de assinatura remota para os três DF-e (contrato §4 daquele doc, refinado na §4 abaixo) |
| F-E8-2 = (b): **o Luminaris contrata o PSC e revende** (contra a recomendação) | [`D-2026-10-12-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-12-QUESTIONARIO-DONO.md) | O Luminaris é cliente do PSC e registra a aplicação; o **titular** do certificado continua sendo o CNPJ do salão |
| F-E8-3 reaberto = (b): lista curta de 1–2 PSCs homologados | idem | Um adaptador na API v0, mas só os PSCs da lista são habilitados (cadastro, item E-4) |
| Decisão 2 de 26/09: o Luminaris nunca guarda a chave do A1 do cliente | EMENDAS-BRIEF-2026-10-11 §8 | Nada de PFX, nada de chave privada do cliente no banco |

### Fato de leitura que limita o desenho (grau V, já transcrito)
- DOC-ICP-17.01 v2.3 §6.4: API OAuth 2.0 obrigatória e igual em todo PSC (`/v0/oauth/authorize`, `/oauth/token`,
  `/oauth/signature`); escopo `signature_session` permite várias assinaturas enquanto o token valer; o titular autoriza
  no equipamento dele e "as aplicações não deverão coletar fatores de autenticação do titular" (6.4.3.2). Fonte: §9 do
  doc de planejamento da assinatura.
- RN E0714–E0718: a DPS é assinada pelo "certificado do emitente da DPS" (`[RN-DPS-SIG]` do BRIEF-ADN §1). Logo, mesmo
  com o Luminaris contratando, **o certificado tem de ser do CNPJ do salão** — o F-E8-2 (b) muda quem paga e quem
  registra a aplicação, não de quem é o certificado.

### Inferência central (grau I; o passo fica à mostra)
- TLS com autenticação de cliente exige que o cliente assine o handshake com a chave privada do certificado. A API do
  PSC só expõe assinatura de hash por `/oauth/signature`; o Node (`tls`/`https`) não tem gancho para delegar a assinatura
  do handshake a um serviço remoto sem engine nativa. **Conclusão:** o `AdnHttpClient` do BRIEF-ADN item 13 (mTLS "com
  `key`/`cert` da credencial") não funciona com certificado em nuvem do cliente. Caso adversarial tentado: "o PSC
  devolve um certificado de cliente utilizável no TLS" — o DOC-ICP-17.01 lista "listagem e recuperação de certificado"
  (só a parte pública); sem a chave, o handshake não fecha. A leitura se sustenta; a palavra final é do runbook do D5.

---

## 1. Mapa dos forks do BRIEF-ADN depois da emenda

| Fork | Estado novo | Motivo |
|---|---|---|
| F-ADN-1 | **Superado** | Já registrado (EMENDAS §8) |
| F-ADN-2 (onde mora o A1) | **Sem objeto** | Não há A1 do cliente. O que se guarda é o token do PSC (F-PSC-3) |
| F-ADN-3 (chave da cifra do A1) | **Reaparece como F-PSC-3** | O token de `signature_session` é segredo de terceiro; precisa de cifra em repouso igual |
| F-ADN-4 (abrir PKCS#12) | **Sem objeto** para o cliente. Volta só se F-PSC-1 = (a) (A1 **do Luminaris** para o mTLS) | |
| F-ADN-5, F-ADN-6, F-ADN-8, F-ADN-9, F-ADN-12, F-ADN-13 | **Mantidos como estão** (RATIFICAÇÃO PENDENTE) | Não dependem de onde a chave mora |
| F-ADN-7 (algoritmos) | **Mantido, com insumo novo** | O algoritmo passa a ser o que o PSC aceita em `/oauth/signature` (insumo ausente 1). A recomendação (c) "constante única" segue válida |
| F-ADN-10 (pré-voo de validade do A1) | **Substituído por F-PSC-5** | Validade agora é do certificado em nuvem **e** da sessão do token |
| F-ADN-11 (CNPJ do certificado × unidade) | **Mantido** | Vale para o certificado em nuvem do mesmo jeito (E0718) |

---

## 2. Checklist — o que muda no §3 do BRIEF-ADN

Itens do BRIEF-ADN não citados aqui ficam como estão (8, 10, 11, 12, 14, 15, 17–26).

### PR-0 — docs
- **E-1 [direto]** Emenda do ADR-DFE §12: o emissor próprio assina por PSC (API v0 do DOC-ICP-17.01), o Luminaris é o
  contratante (F-E8-2 b) e o titular é o CNPJ da unidade. Cita a decisão D-2026-10-12 e a §0 deste documento.

### PR-1 — Credencial do PSC por unidade (substitui os itens 3–7 do BRIEF-ADN)
- **E-2 [cond: F-PSC-2]** Model `PscProvider` (Prisma first-class, credencial de emissão legal — Contrato §2.1): um
  registro por PSC homologado (F-E8-3 b), com `nome`, `baseUrl`, `clientId` da aplicação do Luminaris, segredo do
  cliente OAuth **cifrado**, `cotaAnual`, `lifetimeMaxSegundos`, `algoritmos`, `habilitadoEm`. Teste: CRUD restrito a
  admin da plataforma; tenant comum não lê nem escreve.
- **E-3 [cond: F-PSC-3]** Model `PscCredential`: uma linha viva por `(userId, unitId)` (R8), com `pscProviderId`,
  `titularCnpj`, `certificadoPem` (parte pública, recuperada do PSC), `certNotAfter`, `accessTokenCiphertext`,
  `tokenExpiraEm`, `keyVersion`, `escopo` (`NFSE_DPS|NFE|NFCE`), soft-delete com rename. Cifra pelo keyring de F-PSC-3.
  **Falha fechada:** sem keyring ⇒ 503 `dfe_psc_key_missing`, sem efeito. Teste: ida e volta; ciphertext copiado para
  outra linha não decifra; sem env ⇒ 503 e 0 linhas.
- **E-4 [direto]** Fluxo de autorização OAuth 2.0 com PKCE (RFC 7636), escopo `signature_session`:
  `POST /api/accounting/psc-credentials/:unitId/authorize` devolve a URL de autorização do PSC (com `state` assinado e
  `code_challenge`); `GET /api/accounting/psc-credentials/callback` troca o `code` pelo token, recupera o certificado,
  confere `titularCnpj` contra a unidade (F-ADN-11) e grava. O Luminaris **nunca** recebe senha/OTP do titular
  (6.4.3.2). Teste com **servidor PSC falso local** (authorize/token/signature/certificado): `state` adulterado ⇒ 400;
  certificado de outro CNPJ ⇒ 422 `psc_certificado_nao_e_da_unidade`; PSC fora da lista ⇒ 422 `psc_nao_homologado`.
- **E-5 [direto]** `GET /api/accounting/psc-credentials/:unitId` devolve só a view (PSC, titular, `certNotAfter`,
  `tokenExpiraEm`, `consumoNoAno`, `cotaAnual`); `DELETE` faz soft-delete, zera o ciphertext na mesma tx e chama a
  revogação do token no PSC se existir (falha da revogação não bloqueia o DELETE; vira aviso). Policy delegando a
  `canManageFiscalProfile`. Audit na mesma mudança: `psc_credential.authorized`, `psc_credential.removed` (sem token,
  sem CNPJ de terceiro além do da unidade; allowlist do `auditCanonical.ts`).
- **E-6 [cond: F-PSC-5]** Pré-voo de emissão: sem credencial viva, certificado vencido ou **token expirado** ⇒ o
  documento não consome número e a resposta traz `faltantes: ['sessão do PSC']` com o link de reautorização. Aviso a
  partir de N dias do `certNotAfter`. Teste: relógio injetado.

### PR-2 — Assinatura em duas fases (substitui o item 9 do BRIEF-ADN)
- **E-7 [direto]** `lib/dfeXmlSign.ts` passa a ter duas funções puras: `prepararAssinatura(xml, rootLocalName, idRef,
  algos) → { signedInfoC14n, digestParaAssinar }` e `montarAssinatura(xml, prep, signatureValueB64, certPem) → xml`. O
  meio é a porta `AssinadorRemotoPort` (§4). A guarda local do item 9 (CNPJ do certificado = `prest/CNPJ`) continua,
  com o `certificadoPem` da credencial. Teste: com um assinador **local de teste** (chave gerada no teste atrás da
  mesma porta) a DPS verifica no verificador espelho do `verifyNfseSignature`; 1 byte alterado ⇒ falha.
- **E-8 [direto]** `dfe/psc/PscAssinador.ts` implementa `AssinadorRemotoPort` contra `/v0/oauth/signature`
  (hash em base64, algoritmo da constante do F-ADN-7). Erros mapeados para `CREDENCIAL_EXPIRADA | CREDENCIAL_REVOGADA
  | FORA_DO_ESCOPO | PSC_INDISPONIVEL | COTA_ESGOTADA`. Timeout configurável. Teste contra o PSC falso: 401 ⇒
  `CREDENCIAL_EXPIRADA`; 429/limite ⇒ `COTA_ESGOTADA`; timeout ⇒ `PSC_INDISPONIVEL` sem consumir número.
- **E-9 [cond: F-PSC-4]** Contador de consumo por credencial (uma assinatura = +1), comparado com a cota do
  `PscProvider`. Teste: passar de X% da cota ⇒ aviso no `getStatus()`.

### PR-3 — Conexão com a Sefin (substitui o item 13 do BRIEF-ADN)
- **E-10 [cond: F-PSC-1]** Cliente HTTP da Sefin. Com F-PSC-1 (a): mTLS com o certificado **do Luminaris**
  (transmissor), um por instância, carregado de arquivo/segredo do deploy; a DPS segue assinada pelo certificado em
  nuvem do salão. Teste: o mesmo servidor mTLS local do item 13 do BRIEF-ADN. **Bloqueado para produção** até a
  L-ADN-4 responder (runbook do D5).
- **E-11 [cond: F-PSC-1]** Consulta da DPS: o `GET /dps/{id}` exige que o certificado da conexão seja de um ator da
  nota (`[API-DPS-GET]`). Com o certificado do Luminaris na conexão, ele **não** é ator ⇒ a recuperação do item 20 do
  BRIEF-ADN passa a usar `HEAD /dps/{id}` (`[API-DPS-HEAD]`, qualquer certificado válido) para saber se gerou, e a
  chave vem do retorno síncrono ou de nova tentativa. Teste: tabela HEAD 200/404 × estado do documento.

### PR-4 — Adaptador (ajustes nos itens 16 e 17 do BRIEF-ADN)
- **E-12 [direto]** `DfeCallContext.credential` deixa de ser `{keyPem, certPem}` e passa a ser
  `{ assinador: AssinadorRemotoPort; credencial: CredencialPscResolvida }`. Quem resolve é o serviço pela unidade do
  documento (regra do item 16 inalterada). Teste: o job de polling resolve pela `doc.unitId`.
- **E-13 [cond: F-PSC-6]** Sessão vencida no meio do expediente: a emissão não falha como `REJECTED`; o documento
  fica `PENDING_SIGNATURE` (estado novo) sem número consumido, e a tela pede reautorização. Teste: token expira entre
  duas vendas ⇒ a 2ª fica pendente, nenhum número pulado.

---

## 3. Fatias (substitui a tabela do §10 do BRIEF-ADN)

| PR | Itens | Depende |
|---|---|---|
| PR-0 docs | E-1, BRIEF-ADN item 2 | — |
| PR-1 credencial PSC | E-2..E-6, BRIEF-ADN 24–25 (parte) | F-PSC-2, 3, 5; F-ADN-11 |
| PR-2 XML + assinatura remota | BRIEF-ADN 8, 10–12; E-7..E-9 | F-ADN-7, 9, 11; F-PSC-4 |
| PR-3 conexão | E-10, E-11, BRIEF-ADN 14 | **F-PSC-1** |
| PR-4 adaptador | BRIEF-ADN 15, 17–23, 26; E-12, E-13 | F-ADN-5, 6, 8, 12, 13; F-PSC-6; PR-1..3 |
| — runbook D5 | §6.2 do BRIEF-ADN + L-ADN-4 + 1 assinatura real no PSC | PR-4 + contrato com o PSC + "executa" da emissão real |

**Prazo 01/11:** PR-0 a PR-2 se provam sem PSC real (PSC falso local). O PR-3 tem teste local, mas produção depende da
L-ADN-4. Sem resposta até ~25/10, a saída de contingência para 01/11 é o **emissor web da Sefin** (portal), que o
`ManualEmissor` já cobre — registrado em F-PSC-7.

---

## 4. Contratos esboçados

```ts
// dfe/AssinadorRemotoPort.ts — refinamento do §4 do doc de planejamento (assina hash, não XML)
export type TipoDfeAssinado = 'NFSE_DPS' | 'NFE' | 'NFCE';
export interface CredencialPscResolvida {      // em memória, nunca serializada nem logada
  pscProviderId: string;
  accessToken: string;
  titularCnpj: string;                         // regex CNPJ alfanumérico (NT 2026.004)
  certificadoPem: string;                      // parte pública
  escopo: TipoDfeAssinado[];
}
export type AssinaturaResultado =
  | { ok: true; signatureValueB64: string; assinadoEm: string }
  | { ok: false; code: 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA' | 'FORA_DO_ESCOPO' | 'PSC_INDISPONIVEL' | 'COTA_ESGOTADA'; message: string };
export interface AssinadorRemotoPort {
  readonly name: string;
  assinarHash(digestB64: string, algoritmo: string, tipo: TipoDfeAssinado, cred: CredencialPscResolvida): Promise<AssinaturaResultado>;
}
```

```ts
// dtos/PscCredentialDto.ts
export const AuthorizePscSchema = z.object({ pscProviderId: z.string().min(1), escopo: z.array(z.enum(['NFSE_DPS', 'NFE', 'NFCE'])).min(1) }).strict();
export const PscCredentialViewSchema = z.object({
  unitId: z.string(), psc: z.string(), titularCnpj: z.string().regex(CNPJ_REGEX),
  certNotAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), tokenExpiraEm: z.string().datetime(),
  consumoNoAno: z.number().int().nonnegative(), cotaAnual: z.number().int().positive().nullable(),
}).strict();
```

```prisma
model PscProvider {
  id                    String    @id @default(cuid())
  nome                  String
  baseUrl               String
  clientId              String
  clientSecretCipher    Bytes?
  keyVersion            Int?
  cotaAnual             Int?
  lifetimeMaxSegundos   Int?
  algoritmos            String    // JSON: ["rsa-sha256", …] — insumo ausente 1
  habilitadoEm          DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?
  @@map("psc_providers")
}
model PscCredential {
  id                    String    @id @default(cuid())
  userId                String
  unitId                String
  pscProviderId         String
  titularCnpj           String
  certificadoPem        String
  certNotAfter          String    // AAAA-MM-DD
  accessTokenCiphertext Bytes?    // null após DELETE
  tokenExpiraEm         DateTime
  keyVersion            Int?
  escopo                String    // JSON
  consumoNoAno          Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?
  @@unique([userId, unitId])      // soft-delete com rename
  @@map("psc_credentials")
}
```

```env
DFE_PSC_KEYS="1:<base64 de 32 bytes>"   # F-PSC-3; backup separado do .db
DFE_PSC_KEY_ACTIVE=1
DFE_TRANSMISSOR_CERT=/caminho/seguro    # só com F-PSC-1 (a): A1 DO LUMINARIS, não do cliente
```

---

## 5. Forks — RATIFICADOS (a) em 12/10 pelo dono

### F-PSC-1 — Com que certificado a conexão (mTLS) com a Sefin é feita
- **(a)** Certificado **do Luminaris** (e-CNPJ A1 próprio, transmissor), um por instância; a DPS segue assinada pelo
  certificado em nuvem do salão.
- **(b)** Certificado em nuvem do salão também no TLS, por engine/HSM remoto (PKCS#11 do PSC, se existir).
- **(c)** Sem mTLS próprio: usar o emissor web da Sefin (portal) até haver resposta, pelo `ManualEmissor`.
- **Recomendação: (a)**, condicionada à L-ADN-4. É o único caminho que a API do PSC permite sem dependência nativa; o
  A1 é do próprio Luminaris, então a decisão 2 de 26/09 não é ferida. (b) não tem fonte de que algum PSC exponha
  PKCS#11 (insumo ausente 2). (c) é a contingência, não o desenho. **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-2 — Onde fica o cadastro dos PSCs homologados
- **(a)** Tabela `PscProvider` gerida pela plataforma (admin), habilitação só depois de assinatura de teste real.
- **(b)** Constante no código por PSC.
- **Recomendação: (a).** Com o F-E8-2 (b) o `clientId`/segredo é do contrato do Luminaris e muda sem deploy; a cota é
  dado comercial. **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-3 — Cifra do token e do segredo OAuth em repouso
- **(a)** Keyring próprio `DFE_PSC_KEYS` no formato do F5 (`secretBox` com prefixo), falha fechada.
- **(b)** Reusar o keyring do F5.
- **Recomendação: (a).** Mesmo raciocínio do F-ADN-3 (b) original: chaves separadas por finalidade, rotação
  independente. Pré-condição de deploy do M2. **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-4 — Cota de assinaturas
- **(a)** Contador por credencial + aviso a partir de 80% da cota anual do PSC.
- **(b)** Só registrar o erro `COTA_ESGOTADA` quando o PSC recusar.
- **Recomendação: (a).** O §9 do planejamento mostra cota de 5–6 mil/ano em PSCs com preço público; o salão pode
  passar disso. Com o F-E8-2 (b), estourar a cota é problema comercial do Luminaris. **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-5 — Pré-voo: o que bloqueia a emissão
- **(a)** Bloqueia com certificado vencido ou token expirado; avisa 30 dias antes do `certNotAfter` e quando o token
  vence em menos de 1 h.
- **(b)** Só bloqueia; sem aviso.
- **Recomendação: (a)**, herdando o F-ADN-10 (a). **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-6 — Sessão vencida durante o expediente
- **(a)** Estado novo `PENDING_SIGNATURE`: a nota espera a reautorização sem consumir número.
- **(b)** `REJECTED` com `psc_sessao_expirada`, e o operador reenvia.
- **Recomendação: (a).** Com `lifetime` de até 12 h (Bird ID, indício), o salão reautoriza 1×/dia; (b) faria cada
  venda após o vencimento virar rejeição visível. Custo: estado novo no enum de status do DF-e (snapshot de contrato).
  **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-7 — Contingência para 01/11
- **(a)** Se o PR-3 não tiver a L-ADN-4 respondida até 25/10, o 1º cliente começa no emissor web da Sefin com o
  `ManualEmissor` (já em main) e migra para o `adn` depois.
- **(b)** Sem contingência; segura a 1ª emissão até o `adn` estar pronto.
- **Recomendação: (a).** O 01/11 é obrigação do cliente, não do Luminaris; o portal cumpre. **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

### F-PSC-8 — Revenda: como o custo do PSC chega ao cliente
- **(a)** Fora deste BRIEF (decisão comercial/plano de preço); o BE só registra consumo (E-9).
- **(b)** O BE gera cobrança do consumo.
- **Recomendação: (a).** Cobrança é outro nó (F5/plano comercial). **RATIFICADO (a)**: dono, chat, 2026-10-12, questionário ([[D-2026-10-12-QUESTIONARIO-DONO]] §F-PSC). Sem "executa".

---

## 6. Pendente de validação externa

1. **L-ADN-4 (agora bloqueante do PR-3):** a Sefin aceita mTLS com certificado do transmissor (Luminaris) e DPS
   assinada pelo certificado do prestador? Quem responde: suporte do Sistema Nacional NFS-e ou o runbook do D5.
2. **Advogado (§10.3, foco novo):** responsabilidade do Luminaris como **contratante e revendedor** do certificado em
   nuvem do cliente; termo com o cliente (titular) sobre a autorização da `signature_session`; LGPD do token.
3. **Advogado (F-3 de 10/10):** SE-S × e-CNPJ A3 em nuvem para assinar DPS/NF-e — qual tipo de certificado contratar.
4. **PSCs da lista curta:** cota, `lifetime` máximo, algoritmos aceitos e tipo de certificado (pergunta escrita do §9 do
   planejamento), mais condições de contrato B2B para revenda (F-E8-2 b).

## 7. Insumos ausentes (pausados, não varridos — regra 2)

1. **Algoritmos aceitos em `/oauth/signature`** pelos PSCs candidatos (decide o F-ADN-7).
2. **PKCS#11/HSM remoto** oferecido por algum PSC (decide se F-PSC-1 (b) existe).
3. **DOC-ICP-17.01 v3.0** (IN ITI 20/2020, citada na pesquisa de 10/10): conferir se a API v0 mudou.
4. **Contrato B2B dos PSCs** (revenda, faturamento por consumo).

## 8. Achados fora de escopo

1. **NFC-e e NF-e** passam a usar a mesma `AssinadorRemotoPort` (F-E8-1R a). A emenda dos BRIEFs NFCE/X10a fica para
   pedido próprio; esta emenda só desenha a porta para que sirva aos três.
2. **Tela de credencial do PSC** (autorizar, reautorizar, consumo × cota): BRIEF de FE próprio (substitui o item 4 dos
   achados do BRIEF-ADN, "tela do certificado").
3. **Nota D-2026-10-11:** ainda lista F-ADN-2..13 como pendentes; F-ADN-2/3/4/10 mudaram de estado aqui (§1). Fold no
   PR desta emenda.

## 9. Gates de envio [OPS-001]

1. **Objetivo:** permitir executar o emissor da NFS-e no caminho escolhido (PSC contratado pelo Luminaris) antes de
   01/11. A §3 mostra o que se prova sem PSC real e o que depende de resposta externa.
2. **Grau:** API do PSC e regra E0718 **V** (fontes já transcritas, citadas); impossibilidade do mTLS com certificado em
   nuvem **I** (raciocínio da §0); lifetime de 12 h **indício**.
3. **Caso adversarial:** "o PSC entrega certificado de cliente utilizável no TLS" — a API lista só recuperação da parte
   pública; sem chave, o handshake não fecha. Também tentei "com o Luminaris contratando, o certificado pode ser do
   Luminaris" — a E0718 exige o certificado do emitente da DPS; não pode.
4. **Checagem que teria falhado:** o runbook do D5 com um token real — se o `POST /nfse` aceitar mTLS com certificado
   do Luminaris, F-PSC-1 (a) se confirma; se recusar, só resta (b) ou (c).
5. **Vieses (T8):** puxei para manter o máximo do BRIEF-ADN (reuso). Os itens 8, 10–12, 14–23 foram mantidos sem
   reler cada um contra o PSC; só os que tocam chave/conexão foram revistos.
