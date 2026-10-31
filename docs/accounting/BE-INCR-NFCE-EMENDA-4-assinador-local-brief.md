# BE-INCR-NFCE — EMENDA 4 (assinatura e transmissão da NF-e/NFC-e num assinador local, com o A3 do cliente)

> `sessao-planejamento`, 2026-10-30. Base: branch `claude/d5-psc-ecnpj-decision-2331b3` (PR #993, só docs, não
> mergeado) sobre `origin/main` `b20c21e3`. Emenda às [`-EMENDA-1`](BE-INCR-NFCE-EMENDA-1-brief.md),
> [`-EMENDA-2`](BE-INCR-NFCE-EMENDA-2-brief.md) e [`-EMENDA-3`](BE-INCR-NFCE-EMENDA-3-brief.md) (nó
> [`X10a`](../plano/nos/X10a.md)). **Sem código.** Implementação exige `executa` próprio (ORCH-006).
>
> **Autorização, literal:** dono, chat, 2026-10-30, à pergunta *"Abro a sessão de planejamento da emenda do X10a para o
> assinador local?"*: *"Sim, planeja"*. **Cobre só este BRIEF** (checklist, contratos esboçados, forks pendentes).
> Não é `executa`, não ratifica fork, não autoriza merge nem o ADR do PR-0 (que pede autorização "só ADR" própria).
>
> **Em duas linhas:** o servidor continua montando, numerando e decidindo o estado da nota. Duas operações saem dele
> para um **assinador local** na máquina do cliente: assinar com a chave do token (rsa-sha1) e abrir o mTLS com a SEFAZ
> com o mesmo certificado. **Risco principal (inferido, não testado):** a pilha Windows do token (driver + CNG/CSP)
> precisa assinar PKCS#1 v1.5 com SHA-1 **e** servir de chave cliente no TLS. Nada no repositório prova isso; só o
> runbook A3 (passos 2 e 3) prova. Até lá, todo o plano abaixo é exercitável só com certificado de teste em software.

## 0. Formulário (contexto fixo)

- **Item a planejar:** nó [`X10a`](../plano/nos/X10a.md), plano PR-7..PR-9 da EMENDA-2 §5 (adaptador SEFAZ, NFC-e
  on-line, contingência), na parte "quem assina e quem transmite". Origem: [`D5-DECISAO-2026-10-30.md`](../plano/gates/D5-DECISAO-2026-10-30.md)
  §8.5 item 3 (*"o adaptador SEFAZ do PR-7 sai do servidor e vai para o assinador local, e o PR-9 também"*).
- **Autorização:** a citação acima. **Confere com o item:** pede o BRIEF da emenda, e é isso que este documento é. O
  `executa` de 29/10 ([[D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO]]) cobre PR-7..PR-9 **contra PSC falso** e não cobre
  nada daqui. Sem divergência de escopo.
- **Insumos lidos:**
  - Decisões: [`D5-DECISAO-2026-10-30.md`](../plano/gates/D5-DECISAO-2026-10-30.md) §4.1, §5, §8;
    [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]; [[D-2026-10-29-X10A-PR7-9-FORKS]] (na branch do #984/#992);
    [`pesquisas-legais/d5-byok-psc/relatorio.md`](../../pesquisas-legais/d5-byok-psc/relatorio.md) ([D05], [D06], [D07],
    [D08], [X04]).
  - BRIEFs: EMENDA-1 §3 (E-1..E-10) e §4; EMENDA-2 §1, §4–§5; EMENDA-3 §2 (E3-1 c).
  - Runbook: [`RUNBOOK-D5-PRODUCAO-RESTRITA-NFE-NFCE.md`](RUNBOOK-D5-PRODUCAO-RESTRITA-NFE-NFCE.md), notas da variante A3.
  - Contrato e ADRs: `.claude/skills/_ARCHITECTURE-CONTRACT.md`; `docs/adr/INDEX.md`; `ADR-ARCH-BOUNDARIES.md` §1–§5;
    `ADR-INCR-DFE-EMISSAO-PARCEIRO.md` (D6, porta `DfeEmissorPort`); `ADR-M2-deploy-topology.md` (uma instância por
    cliente, em VPS); `ADR-OBSERVABILIDADE.md` (catálogo de eventos, gate de scheduler sem alerta).
  - **Código em `main`** (lido, não alterado): `server/src/lib/nfeSignature.ts` (`verifyNfeSignature`, `readCertFacts`,
    constantes `rsa-sha1`/`sha1`/c14n); `features/accounting/dfe/DfeEmissorPort.ts`, `selectDfeEmissor.ts`,
    `resolveEmissor.ts`; `features/accounting/models/nfeMontagem.ts` (`montarNfe` → payload sem numeração).
  - **Código em PR aberto, não mergeado** (lido nas cabeças `9dc01931` #984, `e84ff550` #986, `6050dfe2` #992):
    `AssinadorRemotoPort.ts` (porta que assina **hash**), `lib/dfeXmlSign.ts` (assinatura em duas fases, `AssinarHash`
    injetado), `lib/nfeXml.ts` (`serializeNfe`), `dfe/sefaz/SefazNfeEmissor.ts`, `dfe/sefaz/SefazSoapClient.ts`
    (`call(url, servico, xml)`, mTLS com `DFE_TRANSMISSOR_CERT`, `SefazTransporteError`),
    `services/DfeAssinaturaResolver.ts`, estados `PENDING_SIGNATURE` e `CONTINGENCY`, `NfceContingenciaService`.
- **Nós vizinhos:** consome [[X10b]] (porta) e [[D5]] (credencial); desbloqueia [[X10i]]. Na tela, o pareamento e o
  estado do assinador são de um FE-INCR vizinho (§9). O PSC continua possível como [[D5]] §7 (i), e o F-AL-7 decide
  o que fazer com ele.

## 1. O que esta emenda muda (e o que não muda)

| Peça | Hoje (EMENDA-2 + PRs #984/#986/#992, PSC falso) | Com a EMENDA-4 |
|---|---|---|
| Montagem, numeração, chave, QR, máquina de estados, contingência (decisões 1–10 de 29/10) | servidor | **servidor, sem mudança** |
| `SignedInfo` canonicalizado (`dfeXmlSign.ts`) | servidor | servidor |
| Assinatura do hash (`AssinadorRemotoPort.assinarHash`) | PSC por OAuth (`PscAssinador`) | **assinador local**, com a chave do token (novo adaptador da mesma porta) |
| mTLS com a SEFAZ (`SefazSoapClient.call`) | servidor, com o e-CNPJ do Luminaris (`DFE_TRANSMISSOR_CERT`) | **assinador local**, com o certificado do cliente (novo transporte atrás da mesma assinatura `call`) |
| Quem é o transmissor (MOC §4.2.3) | Luminaris (caiu em 30/10) | o próprio cliente, que também é o emitente [D05] |
| Guarda de chave | nenhuma | nenhuma: o token fica no caixa; o A1, se houver, só no store do Windows daquela máquina |

**Precedência:** a decisão de 30/10 ([[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]) vence a EMENDA-2 §4.1 linha "e-CNPJ do
Luminaris no transporte". O resto da EMENDA-2 e da EMENDA-3 segue. Esta emenda **não** reabre nenhuma das decisões de
29/10. Onde ela as estende por analogia (assinador fora do ar × sessão do PSC vencida), a extensão é fork (F-AL-6).

## 2. Desenho em uma figura

```
caixa do cliente (Windows)                        VPS do cliente (server/)                       SEFAZ
┌──────────────────────────┐   HTTPS de saída    ┌──────────────────────────────┐
│ assinador local          │ ──long-poll──────▶  │ /api/dfe-assinador/tarefas   │
│  - token/cartão A3 (CNG) │ ◀── tarefa ───────  │ DfeSignerTask (fila, Prisma) │
│  - PIN digitado aqui     │                     │ SefazNfeEmissor (inalterado) │
│  - assina rsa-sha1       │ ── resultado ─────▶ │  assinador: 'local'          │
│  - mTLS com o mesmo cert │ ───────────────── mTLS (cert do cliente) ───────────────────────▶ │ NFeAutorizacao4…
└──────────────────────────┘                     └──────────────────────────────┘
```

O assinador só conhece **duas primitivas**: `ASSINAR` (conferir o conteúdo e assinar) e `TRANSMITIR` (abrir o mTLS com
um host da lista e devolver a resposta crua). Toda regra fiscal fica no servidor, onde já está testada.

## 3. Checklist de comportamentos

Marcadores: `[direto]` sem fork · `[fork:F-AL-n]` vale o ramo recomendado se o dono ratificar · `[cond:…]` só existe
num ramo. Cada item tem o teste que o prova. Numeração AL-n para não colidir com E-n nem com os itens do original.

### Fase S — servidor (pacote `server/`, cadeia Route → Controller → Service → Repository → Prisma + Policy)

- **AL-1 [direto] Interface `SefazTransporte`** extraída de `SefazSoapClient` (método `call(url, servico, xml)`, mesmos
  erros `SefazTransporteError`). `SefazNfeEmissor` passa a depender da interface. Refatoração sem mudança de
  comportamento. *Teste:* a suíte do `SefazNfeEmissor` e a do `fakeSefaz` passam sem edição.
- **AL-2 [fork:F-AL-7] Seleção do assinador por tipo:** `DFE_ASSINADOR_<KIND>` (fallback `DFE_ASSINADOR`) ∈
  `local | psc`. `local` injeta `AssinadorLocalSigner` + `AssinadorLocalTransporte` no `SefazNfeEmissor` e dispensa
  `DFE_TRANSMISSOR_CERT`. Valor ausente ou desconhecido ⇒ porta desabilitada com motivo nomeado (mesmo padrão de
  `selectDfeEmissor`, nunca silêncio). *Teste:* tabela env → seleção, inclusive "`local` sem `sefaz`" ⇒ desabilitada.
- **AL-3 [fork:F-AL-3] Pareamento.** Usuário com a policy do perfil fiscal da unidade gera um código de uso único
  (≥ 10 caracteres de alfabeto sem ambíguos, TTL 10 min, só o hash SHA-256 no banco). O assinador troca o código por
  um token de dispositivo (32 bytes aleatórios; banco guarda só o hash) e manda a parte pública do certificado
  escolhido. O servidor confere com `readCertFacts` (já em `main`): CNPJ-raiz do certificado = CNPJ-raiz da unidade
  (regra `[SIG-CERT-CNPJ]`, F-SIG-3 b), validade cobrindo hoje. EKU "Autenticação Cliente" (MOC §4.2.3 [D05]) entra
  como checagem se o PR-2 conseguir ler o EKU pelo mesmo leitor de DER; senão fica para o runbook (§7 item 1).
  Recusas nomeadas: `dfe_signer_codigo_invalido`, `dfe_signer_cnpj_divergente`, `dfe_signer_certificado_vencido`.
  *Teste:* código expirado, reusado e de outra unidade ⇒ 400 nomeado; certificado de outra raiz ⇒ 400; caminho feliz
  devolve o token uma vez só e grava só o hash.
- **AL-4 [fork:F-AL-3] Um assinador ativo por unidade.** Parear de novo revoga o anterior na mesma tx. Um dispositivo
  pode servir N unidades **da mesma raiz** (a matriz assina a filial, F-SIG-3 b), cada vínculo explícito. Revogação por
  rota própria, com soft-delete. *Teste:* segundo pareamento ⇒ o token antigo dá 401; unidade de outra raiz ⇒ 400.
- **AL-5 [direto] Autenticação das rotas do assinador:** `Authorization: Bearer <token de dispositivo>`, middleware
  próprio (não é sessão de usuário; `withAuth` não se aplica), compara hash em tempo constante, limite de taxa por
  dispositivo. Token revogado ou desconhecido ⇒ 401 sem dizer qual. *Teste:* os três casos + rota de usuário com token
  de dispositivo ⇒ 401.
- **AL-6 [direto] Fila persistida `DfeSignerTask`** (contrato §4.2): estados `PENDING → DELIVERED → DONE | FAILED |
  EXPIRED`, `leaseUntil` para reentrega, resultado idempotente por `taskId` (segundo POST com o mesmo id ⇒ 200 sem
  efeito; com conteúdo diferente ⇒ 409). *Teste:* entrega, reentrega após o lease, resultado duplicado, tarefa vencida.
- **AL-7 [fork:F-AL-2] Long-poll:** `GET /api/dfe-assinador/tarefas?espera=25` segura a conexão até 25 s e devolve as
  tarefas do dispositivo, ou 204. O próprio poll é o heartbeat (AL-12). *Teste:* com tarefa ⇒ responde na hora; sem
  tarefa ⇒ 204 depois da espera (relógio injetado).
- **AL-8 [fork:F-AL-10] `AssinadorLocalSigner implements AssinadorRemotoPort`** (`name = 'local'`): cria a tarefa
  `ASSINAR` e espera o resultado até `DFE_ASSINADOR_TIMEOUT_MS` (padrão proposto 20 s). Resultado → `signatureValueB64`
  para o `dfeXmlSign.ts` existente. Erros do assinador → `AssinaturaRemotaError` com o código novo
  `ASSINADOR_INDISPONIVEL` (offline, token ausente, PIN cancelado) ou `CONTEUDO_RECUSADO`. *Teste:* com um assinador
  falso em processo, o XML assinado passa no `verifyNfeSignature` existente (`lib/nfeSignature.ts`) — prova de ida e
  volta com código já provado.
- **AL-9 [direto] `AssinadorLocalTransporte implements SefazTransporte`:** cria a tarefa `TRANSMITIR` com
  `{url, servico, envelope}` e devolve o conteúdo de `nfeResultMsg` pelo `extrairResultado` existente. Os erros do
  assinador mapeiam **um a um** para os códigos de `SefazTransporteError` (`sefaz_timeout | sefaz_tls | sefaz_http |
  sefaz_resposta_ilegivel`), então a contingência automática da decisão 4 de 29/10 continua ligando pelo mesmo
  `isFalhaDeComunicacao`. **Assinador fora do ar não é falha de comunicação com a SEFAZ** e não liga contingência
  (F-AL-6). *Teste:* cada código do assinador ⇒ o `SefazTransporteError` certo; `ASSINADOR_INDISPONIVEL` ⇒ não entra
  em `CONTINGENCY`.
- **AL-10 [fork:F-AL-5] Tarefa `ASSINAR` leva o conteúdo:** além do hash, o servidor manda o XML do elemento assinado
  (`infNFe`, `infEvento` ou `infInut`) e o `SignedInfo` canonicalizado. Para o QR Code v3 off-line (PR-9), manda a base
  dos parâmetros 1–7 e a chave. `dfeXmlSign.ts` ganha a variante que expõe esses dois blocos (sem mudar a assinatura do
  caminho PSC). *Teste:* o servidor manda o que o assinador falso consegue reconferir (contrato §4.2).
- **AL-11 [direto] Lista de hosts do transporte:** gerada na build a partir do `sefazEndpoints.data.json` do PR-7
  (E-11), só hosts `https`, e embarcada no assinador. O servidor manda a URL; o assinador recusa host fora da lista
  (`HOST_FORA_DA_LISTA`). *Teste no servidor:* toda URL da tabela está na lista gerada (propriedade); *no assinador:*
  AL-19.
- **AL-12 [direto] Estado do assinador na unidade:** cada poll grava `lastSeenAt`, versão, `certNotAfter` e
  `tokenPresente`. `GET /api/accounting/dfe-assinador/:unitId` (usuário) devolve a view sem segredo. *Teste:* view não
  traz hash de token nem certificado inteiro.
- **AL-13 [fork:F-AL-6] Pré-voo e pendência:** emissão com assinador sem poll há mais de 90 s, ou com `tokenPresente =
  false`, nomeia o faltante `assinador local` (mesmo desenho do `FALTANTE_SESSAO_PSC` do PR-7). Se o assinador cair no
  meio, a nota vai para `PENDING_SIGNATURE` (estado do PR-7). *Teste:* os dois caminhos, sem número consumido a mais.
- **AL-14 [fork:F-AL-6] Retomada:** o primeiro poll depois de uma queda dispara o reenvio das notas
  `PENDING_SIGNATURE` da unidade (espelho da decisão 5 de 29/10, em que o callback OAuth reenvia), e o `reenviar`
  manual continua aceitando o estado. *Teste:* nota pendente + assinador volta ⇒ uma autorização, não duas.
- **AL-15 [direto] Alerta (gate F-OBS-14):** `DfeSignerHealthScheduler` alerta (a) assinador sem poll com nota
  pendente há mais de 15 min, (b) certificado do dispositivo vencendo em 30 dias, (c) NFC-e de contingência perto do
  prazo com assinador fora (o prazo já é alerta do PR-9; aqui só o motivo). O teste de scheduler descobre o arquivo e
  exige o caso de alerta. *Teste:* os três casos com relógio injetado.
- **AL-16 [direto] Observabilidade e auditoria:** eventos novos no catálogo `LOG_EVENTS` (`dfe.signer.paired`,
  `dfe.signer.revoked`, `dfe.signer.offline`, `dfe.signer.task_timeout`, `dfe.signer.conteudo_recusado`) e
  `dfe_signer.paired` / `dfe_signer.revoked` na allowlist do `auditCanonical.ts`. **PII:** o e-CNPJ traz o CPF do
  responsável (OID 2.16.76.1.3.4) — não gravar o certificado nem o subject inteiro em log nem em auditoria; só
  CNPJ-raiz, validade e impressão digital SHA-256. Nunca logar XML, envelope, token ou URL com query (OBS-R7).
  *Teste:* o guarda de PII da allowlist reprova campo novo sem guarda; snapshot de log sem CPF.
- **AL-17 [direto] Gates que o diff aciona:** snapshot de shape dos DTOs (rotas novas), guard de path-count do
  openapi, `accountingResetClassification` (3 tabelas novas), `resetDb`, `check:arch` do `server/` (novos arquivos nas
  camadas certas), `tsc` e `test:types`. Contrato compartilhado: JSON Schema gerado do Zod por `z.toJSONSchema()`
  (Zod 4, sem dependência nova) em `server/src/features/accounting/dtos/dfeSigner.schema.json`, commitado; teste falha
  se o gerado divergir do commitado.

### Fase L — assinador local (pacote novo, fora de `server/` e `my-app/`; plataforma pelo F-AL-1)

- **AL-18 [fork:F-AL-1] Esqueleto e pareamento:** serviço de usuário no Windows (não serviço de sistema: o PIN e o
  store `CurrentUser\My` pedem a sessão do usuário logado), janela mínima para colar o código e escolher o
  certificado. Token de dispositivo guardado com DPAPI (`CurrentUser`). Lê certificados do store do Windows: o A3 em
  token ou cartão aparece pelo minidriver do fabricante; o A1 é importado pelo próprio Windows como não exportável.
  Assim A1 e A3 seguem o mesmo caminho e o assinador nunca lê arquivo de chave. *Teste:* com certificado de teste em
  software no store, pareamento contra um servidor falso grava o token cifrado e nunca em texto.
- **AL-19 [fork:F-AL-5] `ASSINAR` com conferência:** recalcula o `DigestValue` do elemento recebido (c14n 2001 + sha1,
  `[SIG-*]`), confere que ele bate com o do `SignedInfo`, que o CNPJ do emitente (ou do `infEvento`/`infInut`) tem a
  raiz do certificado e que `tpAmb` = ambiente do pareamento. Só então assina PKCS#1 v1.5 SHA-1 com a chave do store.
  Grava um diário local (chave, tipo, data, hash) para o cliente conferir. *Teste:* fixture do servidor (AL-10) assinada
  aqui passa no `verifyNfeSignature` do servidor (teste de contrato com arquivo gerado nos dois lados); CNPJ trocado,
  `tpAmb` trocado e digest trocado ⇒ `CONTEUDO_RECUSADO`.
- **AL-20 [direto] `TRANSMITIR`:** TLS 1.2 ou superior com o certificado do store como certificado cliente, cadeia da
  SEFAZ embarcada (ICP-Brasil), host conferido contra a lista (AL-11), timeout. Devolve status HTTP e corpo cru; não
  interpreta `cStat` (isso é do servidor). *Teste:* servidor TLS local exigindo certificado cliente: sem certificado ⇒
  `TLS`; host fora da lista ⇒ `HOST_FORA_DA_LISTA` sem abrir conexão; resposta gravada ⇒ corpo idêntico.
- **AL-21 [direto] PIN:** quem pede o PIN é o driver ou a janela do Windows. O assinador não tem campo de PIN, não
  guarda PIN e não repassa PIN (o Luminaris não coleta fator de autenticação do titular, mesmo princípio da
  DOC-ICP-17.01 6.4.3.2.1 citado no D5 §5). *Teste:* revisão estática (o pacote não tem API de PIN); runbook passo 1.
- **AL-22 [fork:F-AL-8] Versão, distribuição e atualização:** o servidor publica a versão mínima e responde 426
  `dfe_signer_versao_antiga` ao poll de versão inferior. O instalador e a atualização seguem o ramo do F-AL-8.
  *Teste:* poll com versão antiga ⇒ 426 nomeado.
- **AL-23 [direto] CI:** job Windows que compila e roda os testes do assinador; o job atual de `server/` e `my-app/`
  não muda. *Teste:* o job falha com um teste vermelho plantado (gate na condição que falha).

### Fase R — runbook (gate humano; o agente prepara, o dono executa e assina)

- **AL-24 [direto] Runbook A3 impresso:** aplicar as trocas da variante A3 (P2–P5, passos 1 e 7) num arquivo próprio
  `RUNBOOK-D5-A3-ASSINADOR-LOCAL.md`, com passos novos: "parear o assinador" e "remover o token no meio do envio ⇒
  `PENDING_SIGNATURE`, recolocar ⇒ autoriza uma vez". O passo 4 mantém a checagem da rejeição 972 (§8.5 item 1 do D5).

## 4. Contratos (esboço materializável)

### 4.1 Porta e transporte no servidor

```ts
// dfe/sefaz/SefazTransporte.ts — AL-1 (extraído de SefazSoapClient; SefazSoapClient passa a implementar)
export interface SefazTransporte {
  /** Devolve o conteúdo de nfeResultMsg. Falha de transporte ⇒ SefazTransporteError (mesmos 4 códigos). */
  call(url: string, servico: SefazServico, xml: string): Promise<string>;
}

// dfe/AssinadorRemotoPort.ts — acréscimos (AL-8, AL-10)
export type AssinaturaErro =
  | 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA' | 'FORA_DO_ESCOPO' | 'PSC_INDISPONIVEL' | 'COTA_ESGOTADA'
  | 'ASSINADOR_INDISPONIVEL' | 'CONTEUDO_RECUSADO';
/** Conteúdo que o assinador local reconfere antes de assinar (F-AL-5 b). O PSC ignora. */
export interface ConteudoAssinado {
  alvo: 'infNFe' | 'infEvento' | 'infInut' | 'qrCodeV3Offline';
  elementoXml?: string;          // o elemento com Id, como o servidor o serializou
  signedInfoC14nB64?: string;    // SignedInfo canonicalizado (c14n 2001)
  baseQrB64?: string;            // parâmetros 1–7 do QR v3 off-line
  chave: string;                 // 44 dígitos
}
// assinarHash(digestB64, algoritmo, tipo, cred, conteudo?: ConteudoAssinado)

// dfe/local/AssinadorLocal.ts — AL-8 e AL-9
export class AssinadorLocalSigner implements AssinadorRemotoPort { readonly name = 'local'; /* fila + espera */ }
export class AssinadorLocalTransporte implements SefazTransporte { /* tarefa TRANSMITIR */ }
// isSessaoPscVencida(e) || e.code === 'ASSINADOR_INDISPONIVEL' ⇒ PENDING_SIGNATURE (F-AL-6 a)
```

### 4.2 Protocolo servidor ⇄ assinador (versão `v1`; Zod `.strict()`, JSON Schema gerado em AL-17)

```ts
// dtos/DfeSignerDto.ts
export const PareamentoBody = z.object({
  codigo: z.string().min(10).max(32),
  nomeDispositivo: z.string().min(1).max(80),
  versaoAssinador: z.string().regex(/^\d+\.\d+\.\d+$/),
  certificadoDerB64: z.string().min(100).max(20_000),   // só a parte pública
}).strict();
export const PareamentoResposta = z.object({
  dispositivoId: z.string(),
  token: z.string().length(43),                         // base64url de 32 bytes; mostrado uma vez
  unidades: z.array(z.object({ unitId: z.string(), cnpj: z.string().length(14) }).strict()),
  ambiente: z.enum(['producao', 'homologacao']),
  protocolo: z.literal('v1'),
}).strict();

export const Heartbeat = z.object({
  versaoAssinador: z.string().regex(/^\d+\.\d+\.\d+$/),
  tokenPresente: z.boolean(),
  certThumbprintSha256: z.string().length(64),
}).strict();                                            // vai em headers ou query do long-poll (AL-7)

const TarefaAssinar = z.object({
  id: z.string(), tipo: z.literal('ASSINAR'),
  algoritmo: z.literal('rsa-sha1'),
  digestB64: z.string(),                                // sha1 do SignedInfo canonicalizado (ou da base do QR)
  conteudo: z.object({
    alvo: z.enum(['infNFe', 'infEvento', 'infInut', 'qrCodeV3Offline']),
    elementoXml: z.string().max(2_000_000).optional(),
    signedInfoC14nB64: z.string().optional(),
    baseQrB64: z.string().optional(),
    chave: z.string().regex(/^\d{44}$/),
    tpAmb: z.enum(['1', '2']),
  }).strict(),
  expiraEm: z.string().datetime(),
}).strict();
const TarefaTransmitir = z.object({
  id: z.string(), tipo: z.literal('TRANSMITIR'),
  url: z.string().url().startsWith('https://'),
  servico: z.enum(['NFeAutorizacao4', 'NFeConsultaProtocolo4', 'NFeInutilizacao4', 'NFeRecepcaoEvento4', 'NFeStatusServico4']),
  envelopeB64: z.string(),                              // SOAP 1.2 já montado pelo servidor
  timeoutMs: z.number().int().min(1_000).max(60_000),
  expiraEm: z.string().datetime(),
}).strict();
export const TarefasResposta = z.object({ tarefas: z.array(z.discriminatedUnion('tipo', [TarefaAssinar, TarefaTransmitir])) }).strict();

export const ResultadoBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), tipo: z.literal('ASSINAR'), signatureValueB64: z.string() }).strict(),
  z.object({ ok: z.literal(true), tipo: z.literal('TRANSMITIR'), httpStatus: z.number().int(), corpoB64: z.string() }).strict(),
  z.object({
    ok: z.literal(false),
    code: z.enum(['TOKEN_AUSENTE', 'PIN_CANCELADO', 'CERT_VENCIDO', 'CONTEUDO_RECUSADO',          // ASSINAR
                  'TLS', 'TIMEOUT', 'REDE', 'HTTP', 'HOST_FORA_DA_LISTA']),                       // TRANSMITIR
    message: z.string().max(500),                       // sem XML, sem PIN, sem caminho local
  }).strict(),
]);
// Mapa TRANSMITIR → SefazTransporteError (AL-9): TLS→sefaz_tls · TIMEOUT|REDE→sefaz_timeout · HTTP→sefaz_http ·
// corpo sem nfeResultMsg→sefaz_resposta_ilegivel · HOST_FORA_DA_LISTA→erro 500 nosso (tabela e lista divergiram).
// Mapa ASSINAR → AssinaturaErro (AL-8): TOKEN_AUSENTE|PIN_CANCELADO|CERT_VENCIDO→ASSINADOR_INDISPONIVEL · CONTEUDO_RECUSADO→CONTEUDO_RECUSADO.
```

Rotas (2 toques: `routes/accounting.ts` + doc em `routes/docs/`):

| Método e caminho | Quem | Efeito |
|---|---|---|
| `POST /api/accounting/dfe-assinador/:unitId/codigos` | usuário, policy do perfil fiscal | gera código de pareamento |
| `GET /api/accounting/dfe-assinador/:unitId` | usuário | view do estado (AL-12) |
| `DELETE /api/accounting/dfe-assinador/:unitId` | usuário, policy do perfil fiscal | revoga (soft-delete) |
| `POST /api/dfe-assinador/v1/pareamento` | assinador, sem token (só o código) | AL-3 |
| `GET /api/dfe-assinador/v1/tarefas?espera=25` | assinador, Bearer | AL-7 |
| `POST /api/dfe-assinador/v1/tarefas/:id/resultado` | assinador, Bearer | AL-6 |

### 4.3 Persistência (Prisma first-class: infraestrutura de emissão, não tabela que o usuário desenha)

```prisma
model DfeSignerDevice {
  id               String    @id @default(cuid())
  userId           String
  nome             String
  tokenHash        String    @unique              // sha256(token); o token nunca é gravado
  certCnpjRaiz     String
  certThumbprint   String                         // sha256 do DER; certificado e subject NÃO são gravados (CPF do responsável)
  certNotAfter     String                         // AAAA-MM-DD, como readCertFacts
  ambiente         String                         // producao | homologacao
  versaoAssinador  String
  tokenPresente    Boolean   @default(false)
  lastSeenAt       DateTime?
  createdAt        DateTime  @default(now())
  deletedAt        DateTime?
  units            DfeSignerDeviceUnit[]
  @@map("dfe_signer_devices")
}
model DfeSignerDeviceUnit {                         // N unidades da mesma raiz (AL-4)
  deviceId  String
  unitId    String
  createdAt DateTime @default(now())
  deletedAt DateTime?
  device    DfeSignerDevice @relation(fields: [deviceId], references: [id])
  @@id([deviceId, unitId])
  @@index([unitId])                                 // "um ativo por unidade" é guarda no serviço, dentro da tx
  @@map("dfe_signer_device_units")
}
model DfeSignerPairingCode {
  id        String    @id @default(cuid())
  userId    String
  unitId    String
  codeHash  String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  @@map("dfe_signer_pairing_codes")
}
model DfeSignerTask {
  id          String    @id @default(cuid())
  deviceId    String
  unitId      String
  documentId  String?                             // FiscalDocument / FiscalNumberVoid / evento
  tipo        String                              // ASSINAR | TRANSMITIR
  payload     String                              // JSON da tarefa; apagado ao concluir (não guardar XML com CPF do destinatário além do necessário)
  status      String                              // PENDING | DELIVERED | DONE | FAILED | EXPIRED
  leaseUntil  DateTime?
  resultHash  String?                             // idempotência do resultado (AL-6)
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  @@index([deviceId, status])
  @@map("dfe_signer_tasks")
}
```

## 5. Plano por fatias (substitui, para o caminho A3, a linha "PR-7 … §4 item 1 + adaptador PSC + transporte" da EMENDA-2 §5)

| PR | Itens | Depende | Natureza |
|---|---|---|---|
| AL-PR-0 (docs) | ADR-ASSINADOR-LOCAL (Proposed) com os forks F-AL-1..5 e 8; emenda §14 do `ADR-INCR-DFE-EMISSAO-PARCEIRO` (transmissão fora do servidor) | F-AL-0 + autorização "só ADR" | decisão estrutural |
| AL-PR-1 (server) | AL-1, AL-2 | #984, #986, #992 em `main` (F-AL-11) | refatoração + seleção |
| AL-PR-2 (server) | AL-3, AL-4, AL-5, AL-12, AL-16 (parte de pareamento), AL-17 | AL-PR-1; F-AL-3 | migração + rotas |
| AL-PR-3 (server) | AL-6..AL-11, AL-13, AL-14, AL-16 (resto) | AL-PR-2; F-AL-2, 5, 6, 10 | fila + adaptadores, com assinador falso |
| AL-PR-4 (server) | AL-15 | AL-PR-3 | scheduler + alerta |
| AL-PR-5 (assinador) | AL-18..AL-21, AL-23 | AL-PR-0 ratificado; F-AL-1 | pacote novo |
| AL-PR-6 (assinador) | AL-22 | AL-PR-5; F-AL-8 | distribuição |
| AL-PR-7 (docs) | AL-24 | AL-PR-3 e AL-PR-5 | runbook em branco |

O runbook A3 (gate humano, dono executa) só começa com AL-PR-3 e AL-PR-5 em `main`, um cliente com e-CNPJ A3 próprio e
inscrição estadual em SP habilitada para homologação [X04]. O FE de pareamento é incremento à parte (§9).

## 6. Forks — RATIFICAÇÃO PENDENTE (nenhum decidido nesta sessão)

### F-AL-0 — O assinador local pede ADR próprio?
O assinador é um **componente novo fora de `server/` e `my-app/`**: outra unidade de deploy (a máquina do cliente,
fora da topologia do ADR-M2), possivelmente outra linguagem, uma superfície de autenticação nova (dispositivo) e uma
fronteira que o `check:arch` não alcança (ADR-ARCH-BOUNDARIES §5: mudar fronteira = ADR ou emenda datada).
- **(a)** ADR novo `ADR-ASSINADOR-LOCAL` (Proposed) + emenda §14 do ADR-DFE.
- **(b)** Só emenda do ADR-DFE (a porta já existe).
- **(c)** Sem ADR; o BRIEF basta.
- **Recomendação: (a).** As decisões F-AL-1, 2, 3, 5 e 8 são duráveis e fora do domínio fiscal; uma emenda do ADR-DFE
  as esconderia num documento sobre parceiro emissor. **PENDENTE.**

### F-AL-1 — Plataforma e linguagem do assinador
- **(a) .NET 8 (C#), Windows:** `X509Store` vê A1 e A3 pelo mesmo caminho (minidriver/CNG/CSP); `RSA.SignHash` com
  SHA-1 e PKCS#1; `HttpClientHandler.ClientCertificates` / `SslStream` usam a chave do token no TLS sem engine extra;
  `XmlDsigC14NTransform` para a conferência do AL-19. Custo: segunda linguagem no monorepo e job Windows no CI.
- **(b) Node.js empacotado (SEA) + PKCS#11** (`pkcs11js`/`graphene`): mesma linguagem, reusa `nfeSignature.ts` e
  `dfeXmlSign.ts`. Risco: o `tls` do Node só usa chave em token por engine OpenSSL (`privateKeyEngine`), e engine é
  legado no OpenSSL 3; cada fabricante de token traz uma biblioteca PKCS#11 diferente para configurar.
- **(c) Go ou Rust + PKCS#11:** binário único e pequeno; mesma dependência de biblioteca PKCS#11 por fabricante, e
  linguagem nova sem reuso nenhum.
- **Recomendação: (a).** O mTLS com a chave no token é o ponto que decide, e no .NET ele sai pelo store do Windows,
  que é onde o driver do token já registra o certificado. Grau: **inferido** (documentação de plataforma conhecida,
  nada testado com token real). **PENDENTE.**

### F-AL-2 — Como o servidor fala com o assinador
- **(a) Long-poll HTTPS saindo do caixa:** nenhuma porta aberta no cliente; reusa Express sem dependência nova; o
  poll é o heartbeat.
- **(b) WebSocket saindo do caixa:** latência menor; dependência nova (`ws`) e conexão de longa duração atrás do proxy
  da VPS.
- **(c) O navegador do caixa fala com o assinador em `127.0.0.1`** (o app web serve de ponte): sem canal servidor ⇄
  assinador, mas exige o navegador aberto na máquina do token, esbarra no Private Network Access do Chrome
  (página pública chamando endereço local) e põe a regra no frontend.
- **(d) O servidor chama o assinador** (porta aberta ou túnel): exige abrir porta no cliente. Descartável.
- **Recomendação: (a).** É o mesmo princípio do ADR-DFE D6 (polling), não abre porta e cabe no Express. A latência
  de um poll é de milissegundos quando a tarefa já está na fila. **PENDENTE.**

### F-AL-3 — Autenticação e vínculo do assinador
- **(a) Código de pareamento + token de dispositivo** (hash no banco), certificado conferido no pareamento (CNPJ-raiz =
  unidade), **um assinador ativo por unidade**, um dispositivo servindo N unidades da mesma raiz.
- **(b) mTLS do assinador contra o servidor com o próprio e-CNPJ:** identidade forte, mas o proxy da VPS tem de
  terminar TLS com certificado cliente ICP e o token pediria PIN a cada reconexão.
- **(c) Desafio assinado pela chave do token a cada sessão:** prova posse da chave sem mexer no proxy; PIN a cada
  sessão.
- **Recomendação: (a)**, com o certificado amarrado no pareamento e conferido de novo em cada tarefa `ASSINAR` pelo
  CNPJ (AL-19). (b) e (c) prendem o caixa ao PIN fora da hora da venda. **PENDENTE.**

### F-AL-4 — Contingência off-line no caixa
A contingência ratificada (E1-5 b, decisões 4 e 6–10 de 29/10) trata **a SEFAZ fora do ar**. Com o assinador, aparece
um caso novo: o caixa sem internet nenhuma (sem Luminaris e sem SEFAZ).
- **(a) Só a contingência ratificada:** o servidor monta, o assinador assina (inclusive o QR v3 off-line) e a
  transmissão espera. Caixa sem conexão com o Luminaris = sem venda pelo Luminaris (o app web já não funciona assim).
- **(b) O assinador ganha montagem local e fila:** emite NFC-e off-line sem o servidor. Duplica montagem, numeração
  (série própria de contingência) e regra fiscal no desktop.
- **Recomendação: (a).** (b) leva o domínio fiscal para fora do servidor, contra a figura do §2 e contra o contrato
  (regra única num lugar). Fica registrado em §9 como frente que só nasce com autorização nova. **PENDENTE.**

### F-AL-5 — O assinador assina às cegas ou confere o conteúdo?
- **(a) Só o hash**, como o PSC: assinador mínimo, nenhuma c14n no desktop.
- **(b) Confere o conteúdo:** recalcula o digest, confere CNPJ e `tpAmb` e grava um diário local antes de assinar
  (AL-10, AL-19).
- **Recomendação: (b).** O token é do cliente e obedeceria a qualquer hash que o servidor mandasse; com (a), um
  servidor comprometido assina NF-e falsa em nome do cliente. No PSC o titular tem o app do PSC como controle; aqui o
  único controle é o assinador. Custo: c14n no assinador e o teste de contrato de ida e volta. **PENDENTE.**

### F-AL-6 — Assinador indisponível na hora da emissão
- **(a) Herdar o `PENDING_SIGNATURE` do PR-7:** pré-voo nomeia o faltante; queda no meio ⇒ `PENDING_SIGNATURE`;
  quando o assinador volta, as pendentes saem sozinhas, e o `reenviar` manual também funciona (espelho da decisão 5
  de 29/10). Não liga contingência.
- **(b) Recusar a emissão (409) sem criar documento.**
- **(c) Ligar a contingência off-line.**
- **Recomendação: (a).** (c) não resolve: a contingência off-line também precisa assinar a nota e o QR com o token
  [MOC Anexo IV, via PR-9]. (b) perde a nota que caiu no meio. A decisão 5 foi dada para a sessão do PSC; aplicá-la
  aqui é extensão, por isso fork. **PENDENTE.**

### F-AL-7 — O que fazer com o ramo PSC (#984/#986/#992)
- **(a) Manter o PSC como segundo adaptador da `AssinadorRemotoPort`, atrás de `DFE_ASSINADOR=psc`** (desligado por
  padrão), e **retirar o transporte com o e-CNPJ do Luminaris** (`DFE_TRANSMISSOR_CERT`) no AL-PR-1, porque ele não
  tem mais dono depois de 30/10.
- **(b) Arquivar o PSC:** tirar o PSC dos PRs abertos antes do merge (retrabalho em 3 PRs empilhados) e guardar numa
  tag.
- **(c) Mergear como está** e decidir depois.
- **Recomendação: (a).** O PSC do cliente continua BYOK e permitido pela decisão de 30/10 ([[D5]] §7 (i)), e o código
  já está escrito e testado com o falso. O caminho PSC só volta a transmitir se a saída (b) do D5 §4.1 (PKCS#11) ou o
  próprio assinador local fizer o transporte. Já o transmissor com certificado do Luminaris contraria a decisão e não
  deve ficar configurável. **PENDENTE.**

### F-AL-8 — Distribuição, assinatura de código e atualização
- **(a) Binário sem assinatura de código**, baixado da própria instância do cliente, com SHA-256 publicado na tela;
  o SmartScreen avisa na primeira execução; atualização pelo assinador consultando a versão na instância.
- **(b) Certificado de assinatura de código do Luminaris:** some o aviso, mas é **compra do Luminaris** e contraria
  [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]; só com decisão nova.
- **(c) Microsoft Store / MSIX:** a loja assina o pacote; conta de desenvolvedor, termos e custo **não verificados**.
- **Recomendação: (a)** para a homologação e o 1º cliente, com (c) pesquisado antes de um segundo cliente. **PENDENTE.**

### F-AL-9 — Selo Eletrônico depois de 02/03/2029
O A3 de PJ vale até 02/03/2029 e depois a PJ passa ao Selo Eletrônico [D06]; o MOC ainda diz "A1 ou A3" [D05] e não
achei nota técnica que admita o Selo.
- **(a)** Vigilância datada no nó: revisar o MOC online e a FAQ do ITI em 03/2028; o assinador já lê o store, então o
  SE-H em token entra sem mudança de desenho (inferido).
- **(b)** Nada agora.
- **Recomendação: (a).** Não pede código (go-live só em 2027; a regra só muda em 2029). **PENDENTE.**

### F-AL-10 — Quanto tempo o pedido do operador espera o assinador
- **(a) Espera até 20 s** (`DFE_ASSINADOR_TIMEOUT_MS`) e aplica o resultado síncrono (decisão 1 de 29/10); estourou ⇒
  `SENT`/`PENDING_SIGNATURE` e o ciclo de polling continua.
- **(b) Sempre assíncrono** (202 e a tela consulta).
- **Recomendação: (a).** Mantém o resultado síncrono ratificado e o balcão sabe na hora se a nota saiu. O número 20 s
  é proposta, a medir no runbook. **PENDENTE.**

### F-AL-11 — Ordem com os PRs abertos do PSC falso
- **(a)** Esta emenda empilha **depois** de #984, #986 e #992 entrarem em `main` (merge pela maestro ou pelo lote do
  dono, como manda a classe de risco).
- **(b)** Reescrever os PRs abertos já para o assinador local.
- **Recomendação: (a).** Os três PRs têm `executa` e revisão própria; reescrevê-los mistura duas autorizações num
  diff. **PENDENTE.**


## 7. Pendente de validação externa

1. **EKU "Autenticação Cliente" no e-CNPJ A3 vendido hoje** — exigido pelo MOC §4.2.3 [D05]; conferir no certificado
   real (runbook P4).
2. **Token assina PKCS#1 v1.5 com SHA-1 pela pilha do Windows** e serve de chave cliente no TLS — técnico, só o
   runbook prova (passos 2 e 3). Se algum minidriver recusar SHA-1, o caminho A3 cai para aquele fabricante.
3. **Regra 972 (`infRespTec`) em SP** — sem ato achado [D07][D08][X04]; o grupo vai vazio e a homologação responde
   (runbook passo 4).
4. **Homologação só para contribuinte** [X04]: o Luminaris não testa sozinho; precisa do cliente com IE, certificado e
   CSC de homologação.
5. **A1 de PJ ainda vendido e válido até 2029:** a FAQ do ITI diz que os tipos atuais valem até 02/03/2029 [D06], a
   loja vendia A1 em 30/10 (D5 §8.3), e o fold de 10/10 do [[D5]] fala em A1 extinto (Res. 211/2024), não reconferido.
   Conferir no texto da Resolução antes de oferecer o A1 ao cliente.
6. **Selo Eletrônico na NF-e** (F-AL-9).
7. **SmartScreen e Microsoft Store** (F-AL-8): comportamento e termos não lidos.

## 8. Insumos ausentes (pausados — regra 2)

1. Compatibilidade dos tokens e cartões mais vendidos (middleware dos fabricantes) com CNG/minidriver — não lida.
2. Número de caixas e de unidades do 1º cliente (quantos assinadores por instância).
3. Cadeia de certificados servidor da SEFAZ-SP e das demais autorizadoras para embarcar no assinador (AL-20) — o PR-7
   tem `DFE_SEFAZ_CA` opcional, sem o arquivo.

## 9. Achados fora de escopo (não planejados)

1. **FE-INCR do assinador:** tela de pareamento (gerar código, ver estado, revogar) e aviso no balcão quando o
   assinador está fora. Incremento à parte (a casa separa BE e FE).
2. **NFS-e pelo mesmo assinador:** a FAQ NFS-e v1.1 item 17.7 exige no mTLS o certificado do próprio prestador
   (D5 §4.3). O token do cliente **é** esse certificado. O assinador local poderia, em tese, reabrir a emissão própria
   da NFS-e que saiu em 22/10 ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]). Exige decisão nova.
3. **EFD-Reinf:** o `ReinfTransmissorPort` do ADR-EFD-REINF tem o certificado como fork aberto; o mesmo assinador
   serviria. Exige decisão nova.
4. **Contingência com caixa totalmente off-line** (F-AL-4 b), se o dono quiser um dia.
5. **Pendências do template da `sessao-planejamento`** (regra 1 × linha na nota do nó): o fold curto na nota do X10a
   foi pedido explicitamente pela sessão de origem.

## 10. Gates de envio [OPS-001]

1. **Objetivo:** a frase do §2 ("o servidor continua dono de tudo; o assinador só assina e transmite") responde ao
   pedido de mover PR-7..PR-9 para o caixa sem refazer o que os PRs abertos já provaram.
2. **Grau dos claims:** norma e prazo **verificados** pelas fontes do dossiê ([D05], [D06], [X04]); desenho da
   plataforma (F-AL-1) e funcionamento do token no TLS **inferidos**; reuso de `SefazSoapClient.call`,
   `AssinadorRemotoPort.assinarHash`, `PENDING_SIGNATURE` e `isFalhaDeComunicacao` **verificado por leitura** das
   cabeças dos PRs #984/#992 — que **não estão em `main`**.
3. **Caso adversarial tentado:** "o assinador fora do ar devia ligar a contingência off-line" — falha, porque a
   contingência também exige assinar a nota e o QR v3 com o token; daí o AL-9 separar `ASSINADOR_INDISPONIVEL` das
   falhas de transporte. Segundo caso: "um servidor comprometido usa o token do cliente" — virou o F-AL-5 (b).
4. **Checagem que teria falhado:** se a seleção de assinador e o transporte não tivessem um ponto de injeção, o AL-1
   seria reescrita, não extração; a leitura de `SefazNfeEmissorOptions.soap: SefazSoapClient` e de `AssinarHash`
   injetado em `dfeXmlSign.ts` confirmou os dois pontos.
5. **Duas primeiras linhas:** o cabeçalho "Em duas linhas" entrega o desenho e o risco principal (token + SHA-1 + TLS
   no Windows, não testado).
