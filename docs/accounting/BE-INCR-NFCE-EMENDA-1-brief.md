# BE-INCR-NFCE — EMENDA 1 (de "via Focus" para emissor próprio na SEFAZ)

> `sessao-planejamento`, 2026-10-10. **Emenda** ao BRIEF canônico [`BE-INCR-NFCE-brief.md`](BE-INCR-NFCE-brief.md)
> (nó [`X10a`](../plano/nos/X10a.md); F-NFCE-1..12 + 12b ratificados em 02/10). Sem código de aplicação. O BRIEF
> original **não foi editado** (regra 1). **Implementação exige "executa" próprio** (ORCH-006). Forks novos
> **F-NFCE-E1-1..9, todos com RATIFICAÇÃO PENDENTE.**
>
> **Autorização, citada literalmente:** dono, chat, **2026-10-10**, questionário: *"BRIEF emissor ADN (Recommended)"*.
> Opção descrita como *"BRIEF do emissor próprio no ADN sem depender do A1 real, junto com a emenda do BE-INCR-NFCE de
> Focus para emissor próprio"*. Só documento, sem código, sem "executa". Contexto: o D5 mudou em 07/10 para *"Emissor
> próprio direto no ADN — sem conta Focus"* ([`D5`](../plano/gates/D5.md), fold 07/10;
> [`FOCUS-API-ESTUDO-2026-10-07.md`](FOCUS-API-ESTUDO-2026-10-07.md)). BRIEF irmão:
> [`BE-INCR-DFE-ADN-EMISSOR-brief.md`](BE-INCR-DFE-ADN-EMISSOR-brief.md), que traz guarda do A1, cifra e cliente mTLS.
> Esta emenda **reusa** esses itens e não os repete.
>
> **Em duas linhas:** 21 dos 33 itens do BRIEF original seguem como estão, porque foram escritos para rodar com o
> `NullEmissor` e sem parceiro. Onze mudam e um cai (o 33, adaptador Focus). Muda o que dizia "fica no parceiro": QR Code, contingência, DANFE NFC-e e a
> comunicação com a SEFAZ passam a ser nossos. **Risco principal:** o ADN é só NFS-e. A NFC-e de SP vai ao webservice
> da **SEFAZ-SP** (SOAP 4.00, mTLS), com regra estadual de contingência e de QR Code que a pesquisa não fechou
> (L-NFCE-1..5). E o fold de 07/10 fala em "ADN": que ele cubra também a emissão própria de NFC-e é **leitura minha**,
> e por isso vira o F-NFCE-E1-1.

---

## 0. Fatos e fontes desta emenda (acesso em 2026-10-10)

| Chave | Fato | Fonte | Grau |
|---|---|---|---|
| `[NT2025001-QRV3]` | QR Code **versão 3**: a autenticidade passa a ser "pela assinatura de campos específicos do QR-Code", **só nas NFC-e emitidas em Contingência**; "não será mais necessário o controle do CSC"; eliminação futura do CSC "sem data definida" | NT 2025.001 v1.02 (publicada 02/09/2025), §02.1, p. 5. Portal NF-e, lista de NTs (<https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=>), arquivo `exibirArquivo.aspx?conteudo=3NLMgy80wTE=`, sha256 `44b71f16bf11…`, 15 pp. | V |
| `[NT2025001-PJ]` | "No caso de emitente Pessoa Jurídica (CNPJ) é **opção** da empresa adotar esse novo leiaute do QR-Code, ou não" | idem, §02.2, pp. 5–6 | V |
| `[NT2025001-UF]` | ZX02-220/222: "Se QR Code versão 3 e UF não aceita esta versão" ⇒ rejeição **407**; "Parâmetro por UF, enquanto todas as UF não migrarem" | idem, p. 12 | V |
| `[NT2025001-URL]` | URL do QR v3 on-line: `https://<consulta>?p=<chave>|<versao_qrcode>|<tpAmb>`; off-line: `…|<dia_data_emissao>|<vNF>|<tp_idDest>|<idDest>|<assinatura>`; v2 on-line: `…|<identificador_csc>|<codigo_hash>`. Endereços por UF: "Manual de Padrões Técnicos do DANFE NFC-e e QR-Code" | idem, §04, p. 14 | V |
| `[NT2025001-SINC]` | Resposta síncrona obrigatória para lote com 1 NF-e (rej. **452** se `indSinc=0`, produção 13/10/25); "para a NFC-e (modelo 65) foi tornada obrigatória" antes | idem, §02.3 e GAP03a-3, pp. 6, 8 | V |
| `[NT2025001-ATRASO]` | NFC-e: "atraso máximo de 5 minutos" entre `dhEmi` e a autorização; NF-e: 7 dias com cStat 100, depois 150 | idem, §02.4, p. 6 | V |
| `[WS-SP-NFCE]` | SEFAZ-SP, NFC-e 4.00 (NT 2016.002). Homologação `https://homologacao.nfce.fazenda.sp.gov.br/ws/{NFeAutorizacao4, NFeRetAutorizacao4, NFeInutilizacao4, NFeConsultaProtocolo4, NFeRecepcaoEvento4, NFeStatusServico4}.asmx`; produção `https://nfce.fazenda.sp.gov.br/ws/…` (mesmos nomes). **Contingência EPEC** própria: `https://homologacao.nfce.epec.fazenda.sp.gov.br/EPECws/RecepcaoEPEC.asmx` e `https://nfce.epec.fazenda.sp.gov.br/EPECws/…` | <https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx> | V (a página tem erros de digitação nos links: "ttps://", ".asm") |
| `[WS-NFE]` | NF-e 55: SP é autorizadora própria (`https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx` etc.); outras UF usam SVRS/SVAN; contingência SVC-AN/SVC-RS | Portal NF-e, "Relação de Serviços Web": <https://www.nfe.fazenda.gov.br/portal/webServices.aspx> | V |
| `[NT-NOVAS]` | NTs publicadas **depois** do corpus: NT 2025.002 **v1.52** (01/10/2026; o corpus tem a v1.51); NT 2026.004 v1.01 (08/06/2026, "schema … CNPJ alfanumérico"); NT 2026.001 v1.02b (31/07/2026, "Provedor de Assinatura e Autorização (PAA)"); NT 2026.007 v1.10 e NT 2026.008 v1.00 (01/10/2026) | lista de NTs do Portal NF-e (URL acima) | V (títulos e datas; conteúdo não lido) |
| `[MOC-*]`, `[NFCE-*]` | as chaves da §2 do BRIEF original (MOC 7.0 VG + Anexo I, NT 2025.002 v1.51, Portaria SRE 79/2024) | BRIEF original §2 | V (como lá) |
| `[SIG-*]` | parâmetros de assinatura da NF-e/NFC-e: c14n 2001, rsa-sha1, sha1, enveloped, `Reference URI = #NFe…` | [`TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`](fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md) §1–§2 | V |

## 1. Decisões do BRIEF original (§0) sob o emissor próprio

| Decisão (§0 do original) | Fonte | Destino |
|---|---|---|
| "Só parceiro BYOK; Focus primeiro; Luminaris nunca guarda A1" ⇒ "assinatura, QR Code, CSC, contingência, DANFE NFC-e e comunicação com a SEFAZ ficam no parceiro" | D-2026-09-26 dec. 1–2; ADR §3 D1, §11.1 | **CAI**, condicionado ao **F-NFCE-E1-1** e ao F-ADN-1 do BRIEF irmão. Cada uma dessas peças vira item ou fork abaixo |
| Um adaptador por **protocolo**; UF/município são configuração | D-2026-09-26 dec. 3; ADR §11.1 item 3 | **PERMANECE**, e agora se aplica de fato: o webservice NF-e 4.00 é **um** protocolo (mesmos nomes de serviço em todas as UF, `[WS-SP-NFCE]` `[WS-NFE]`); a URL por UF e modelo é tabela de configuração (F-NFCE-E1-3) |
| Adaptador do documento é o do documento | ADR §11.1 item 6 | PERMANECE |
| NFC-e na porta, **via parceiro**, com roteamento por tipo | F-PLAN-2 (a), 27/09 | **MUDA:** "via parceiro" vira "via adaptador `sefaz`". A seleção por tipo (F-NFCE-1 c) segue |
| Simples suportado; totais do `sale.finalized`; tentativa imutável; gatilho manual; exigir CPF/CNPJ; eventos 55/65 no X10a | F-DFE-8 b, F-DFE-11 a, F-DFE-10 a, F-DFE-3 a, F-DFE-7 b (+ F-NFCE-7 b), nota X11 | PERMANECEM |

## 2. Item a item do BRIEF original

`PERMANECE` = texto e teste valem como estão · `MUDA` = o comportamento muda (o que muda está escrito) · `CAI` = sai.

| Item | Original (resumo) | Destino | O que muda / por quê |
|---|---|---|---|
| 1 | PR-0: transcrição do leiaute de saída (grupos + UB) | **MUDA** | Acrescenta: `infNFeSupl` (`qrCode`, `urlChave`) nas versões 2 e 3 (`[NT2025001-URL]`); `enviNFe`/`retEnviNFe` com `indSinc` (`[NT2025001-SINC]`); `protNFe`/`nfeProc`; `consSitNFe`; `inutNFe`/`retInutNFe`; `envEvento` 110111. **Rebaixar a NT 2025.002 v1.52** (`[NT-NOVAS]`; o PR-0 foi planejado sobre a v1.51) e transcrever a NT 2025.001 v1.02 |
| 2 | Emenda do ADR (§12) | **MUDA** | Junta-se ao item 1 do BRIEF irmão (F-ADN-1): a mesma emenda registra o adaptador `sefaz` |
| 3 | `DfeKind` com `NFCE` | PERMANECE | — |
| 4 | `capabilities.kinds` | **MUDA (acréscimo)** | Novo adaptador `SefazNfeEmissor` declara `['NFE','NFCE']`; `AdnEmissor` declara `['NFSE']` |
| 5 | seleção por `kind` (F-NFCE-1 c) | PERMANECE | `DFE_PARTNER_NFCE=sefaz` passa a ser um valor válido |
| 6 | `resolveEmissorFor(partner, kind)` | PERMANECE | resolve também `sefaz` |
| 7 | `cancelar` como união por tipo | PERMANECE | — |
| 8 | `inscricaoEstadual` + CRT derivado (F-NFCE-2 b) | PERMANECE | — |
| 9 | séries por tipo | PERMANECE | — |
| 10 | `ProductFiscalProfile` (F-NFCE-3 b) | PERMANECE | — |
| 11 | pré-condição por item | PERMANECE | — |
| 12 | `NfePayloadSchema` + regras como `superRefine` | **MUDA** | O comentário "`infNFeSupl` NÃO é montado aqui: precisa do CSC, que fica no parceiro" (contrato do original, §4) **cai**. O schema ganha `infNFeSupl` (E-3) |
| 13–14 | só `productLines`; tie-out com o crédito 3.3 | PERMANECE | — |
| 15 | `ide` (`tpEmis=1`, `procEmi=0`, `dhEmi` = montagem) | **MUDA** | `dhEmi` = instante da **montagem imediatamente antes do envio síncrono**. Com emissor próprio não há fila de parceiro entre os dois (`[NT2025001-ATRASO]`, rej. 704 do original). `tpEmis` deixa de ser literal 1 se o F-NFCE-E1-5 trouxer contingência. `verProc` = versão do Luminaris |
| 16 | literal de homologação no 1º item | PERMANECE | — |
| 17 | `dest` obrigatório (F-NFCE-7 b) | PERMANECE | — |
| 18 | `tPag` | PERMANECE | — |
| 19–20 | ICMS do Simples; UB do regime normal (F-NFCE-12/12b b) | PERMANECE | O PR-6 confere contra a v1.52 (item 1) |
| 21 | chave de acesso local "**só** quando `numbersDps: false`" | **MUDA** | O emissor próprio nunca é numerado por terceiro: a chave é **sempre** montada localmente (`cNF` aleatório ≠ `nNF`, `cDV`), e o `infNFe/@Id = "NFe" + chave` |
| 22 | preview | PERMANECE | — |
| 23 | sequência por `(kind, ambiente, serie)` (F-NFCE-4 a) | **MUDA (ordem)** | Se o F-ADN-9 (a) for ratificado, quem migra a chave é o BRIEF irmão; este item só consome |
| 24 | `FiscalNumberVoid` + `inutilizar()` | **MUDA** | `inutilizar()` passa a ser implementado: `inutNFe` assinado → `NFeInutilizacao4` da UF (E-6). As guardas locais `[NFE-INUT-REGRAS]` seguem antes da chamada |
| 25 | lista de lacunas | PERMANECE | — |
| 26 | audit `dfe.number_voided`, `product_fiscal_profile.updated` | **MUDA (acréscimo)** | + eventos do certificado (reuso do BRIEF irmão, item 6) e `dfe.contingency_entered/left` se o F-NFCE-E1-5 trouxer contingência |
| 27 | cancelamento 110111 com janela do X11 (F-NFCE-10 a) | **MUDA** | O evento é montado, assinado e enviado por nós (`NFeRecepcaoEvento4`); o `501` vem direto da SEFAZ em `retEvento/cStat`, sem parceiro no meio (E-7). Janela e política inalteradas |
| 28 | CC-e: só o contrato (F-NFCE-9 c) | PERMANECE | — |
| 29 | 110112 e EPEC **fora** — "contingência é do parceiro" | **MUDA** | A justificativa cai: sem parceiro, a contingência é nossa ou não existe. Vira o **F-NFCE-E1-5** |
| 30–32 | rotas, DTOs, gates | PERMANECE (+ acréscimos E-10) | — |
| 33 | Fase G — adaptador Focus (lacuna D5) | **CAI** | Substituído pelos itens E-1..E-10 abaixo. Nenhum campo de JSON da Focus foi escrito, então nada a desfazer |

**Forks ratificados do original:** F-NFCE-1..7, 9..12, 12b **permanecem**. **F-NFCE-8** (*"CSC e A1 cadastrados pelo
cliente no painel da Focus"*) **perde o objeto**: sem Focus não há painel. O CSC e o A1 vêm para o Luminaris, e isso vira
o **F-NFCE-E1-4** (CSC) e o reuso do BRIEF irmão (A1). Não reabro o F-NFCE-8; registro que o objeto dele sumiu.

**Seções do original:** §6 (pendente de validação externa) permanece, e as linhas de SP viram as perguntas L-NFCE (§6
desta emenda). §7 insumo 1 (contrato Focus) **cai**. Os insumos 2 (Manual do DANFE NFC-e e QR Code) e 3 (Manual de
Contingência) **passam a ser necessários** (§7). §8 achado 2 (DANFE NFC-e ao consumidor) deixa de ser só FE (F-NFCE-E1-6).
§9 linha "Focus | 33" vira PR-7/PR-8 (§8 desta emenda).

## 3. O que a emissão própria de NF-e/NFC-e exige a mais (itens novos)

Numeração E-n para não colidir com o original. `[reuso ADN-n]` = item n do BRIEF irmão, sem repetição.

- **E-1 [reuso ADN-3..7]** Certificado A1 por unidade: guarda cifrada, upload do PFX, validade, pré-voo. O mesmo
  `FiscalCertificate` serve à NFS-e e à NF-e/NFC-e da unidade. A comparação de CNPJ na NF-e segue a regra já ratificada
  da raiz (`[SIG-CERT-CNPJ]`, F-SIG-3 b), diferente da NFS-e (F-ADN-11), porque a fonte da NF-e diz "um dos
  estabelecimentos". Teste: certificado da matriz assina NF-e de filial de mesma raiz; raiz diferente ⇒ erro local
  `nfe_certificado_nao_e_do_emitente` (rej. 213 do `[SIG-REJ-213]`).
- **E-2 [direto]** `lib/nfeXml.ts` · `serializeNfe(payload)` (namespace `http://www.portalfiscal.inf.br/nfe`,
  `infNFe/@versao="4.00"`, `@Id = "NFe" + chave`, ordem do PR-0) e assinatura enveloped de `infNFe` com os parâmetros
  `[SIG-*]` (rsa-sha1, c14n, `Reference URI = #NFe…`, EndCertOnly), reusando `signEnveloped` do BRIEF irmão (item 9)
  com outra constante de algoritmo. Teste: o XML assinado passa no `verifyNfeSignature` **existente**
  (`lib/nfeSignature.ts:159`), que é o verificador do import. Assim a ida e a volta usam código já provado.
- **E-3 [cond:F-NFCE-E1-4]** `infNFeSupl` da NFC-e: `qrCode` na versão escolhida e `urlChave`, com a URL de consulta da
  UF tirada do Manual do DANFE NFC-e (insumo ausente 1). Na v3 on-line não há CSC nem hash (`[NT2025001-URL]`). Teste:
  v3 on-line ⇒ `p=<chave>|3|<tpAmb>` sem CSC; com v2, o hash confere com o vetor de teste do manual.
- **E-4 [direto]** Cliente SOAP 1.2 do webservice NF-e 4.00 sobre o mesmo transporte mTLS do BRIEF irmão (item 13):
  envelope `nfeDadosMsg`, operações `NFeAutorizacao4`, `NFeConsultaProtocolo4`, `NFeInutilizacao4`,
  `NFeRecepcaoEvento4`, `NFeStatusServico4`. URL pela tabela `(UF, modelo, ambiente, serviço)` do F-NFCE-E1-3. Teste:
  servidor local com mTLS respondendo SOAP gravado; o handshake sem certificado falha.
- **E-5 [direto]** `SefazNfeEmissor.emitir`: lote `enviNFe` com **uma** nota e `indSinc=1` (`[NT2025001-SINC]`; `indSinc=0`
  com 1 nota é rejeição 452) → `retEnviNFe/protNFe`. Com `cStat` 100 ⇒ `AUTHORIZED`, e o XML guardado é o `nfeProc`
  (`NFe` + `protNFe`). Rejeição ⇒ `REJECTED` com o `cStat` em `errors[].code`. Duplicidade (a SEFAZ já tem a chave) ⇒
  `NFeConsultaProtocolo4` pela chave antes de qualquer outra decisão. `partnerRef` = chave de 44 dígitos. Resultado
  síncrono aplicado pelo mesmo caminho do F-ADN-5. Teste: servidor local devolvendo `protNFe` cStat 100 ⇒ documento
  `AUTHORIZED` com `nfeProc` anexado; cStat de rejeição ⇒ `REJECTED` com o código.
- **E-6 [direto]** `inutilizar()` (item 24 do original): `inutNFe` com `Id = "ID" + cUF + ano + CNPJ + mod + serie(3) +
  nIni(9) + nFin(9)` (formação a confirmar no PR-0, `[NFE-INUT]`), assinado, `NFeInutilizacao4`; `cStat` 102 ⇒
  `HOMOLOGATED`. Teste: guardas locais do original + resposta 102 do servidor local ⇒ `FiscalNumberVoid` homologado.
- **E-7 [direto]** Cancelamento 110111 (item 27 do original): `envEvento` com `infEvento/@Id = "ID110111" + chave +
  nSeqEvento(2)` (a confirmar no PR-0), `nProt`, `xJust` 15–255, assinado → `NFeRecepcaoEvento4`; `cStat` 135 ⇒
  `CANCELLED`; 501 ⇒ `OUT_OF_WINDOW` (`[NFCE-CANC-FORA]`). Teste: os dois ramos com o servidor local.
- **E-8 [direto]** Recuperação de falha de rede: o job de polling consulta `NFeConsultaProtocolo4` pela chave dos
  documentos `sefaz` em `SENT` com falha, e nunca reenvia sozinho (mesmo princípio do F-ADN-8). Com a chave montada
  localmente (E-5), a consulta não depende de resposta anterior. Teste: resposta perdida + nota autorizada no servidor
  ⇒ uma autorização.
- **E-9 [cond:F-NFCE-E1-5]** Contingência da NFC-e: modalidade conforme o fork (off-line `tpEmis=9` com QR v3
  assinado, EPEC de SP, ou nenhuma). Com contingência, a nota emitida nela tem de ser transmitida depois, e o
  cancelamento por substituição 110112 (`[NFCE-CANC-SUBST]`) volta ao escopo. Teste: depende do ramo ratificado.
- **E-10 [direto]** Releitura do autorizado: o `nfeProc` devolvido passa pelo `parseNfe` existente (assinatura
  primeiro, F-SIG-5 a) e é comparado com o que foi enviado (chave, emitente, `dest`, itens, `vNF`, `tPag`). Divergência
  de identidade ⇒ alerta; o protocolo da SEFAZ é o fato. Mesmo princípio do ADR §11.1 item 5 ("releitura em todo
  adaptador"). Teste: `nfeProc` com `vNF` mutado depois do protocolo ⇒ a assinatura falha, e isso é o que o teste
  prova. A comparação campo a campo cobre o caso de o XML ter sido montado diferente do payload persistido.

## 4. Contratos (acréscimos ao §4 do original)

```ts
// dfe/sefaz/sefazConfig.ts — cond. F-NFCE-E1-3
export type SefazServico = 'NFeAutorizacao4' | 'NFeConsultaProtocolo4' | 'NFeInutilizacao4' | 'NFeRecepcaoEvento4' | 'NFeStatusServico4';
export interface SefazEndpoint { uf: string; modelo: 55 | 65; ambiente: DfeAmbiente; servico: SefazServico; url: string; fonte: string /* URL + data */ }
export const SEFAZ_ENDPOINTS: readonly SefazEndpoint[] = [
  { uf: 'SP', modelo: 65, ambiente: 'homologacao', servico: 'NFeAutorizacao4',
    url: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    fonte: 'portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx (10/10/2026)' },
  // … demais linhas pela [WS-SP-NFCE] e [WS-NFE]; UF sem linha ⇒ adaptador desabilitado para aquela UF, com motivo nomeado
];
```

```ts
// NfePayloadSchema (§4 do original) — acréscimo: infNFeSupl (E-3)
const InfNFeSupl = z.object({
  qrCode: z.string().min(60).max(1000),      // limites a confirmar no PR-0 (a NT 2025.001 v1.01 mudou a documentação do tamanho)
  urlChave: z.string().url(),
}).strict();
// mod 65 ⇒ infNFeSupl obrigatório; mod 55 ⇒ ausente

// Capacidades do adaptador (item 4 do original)
// SefazNfeEmissor.capabilities = { kinds: ['NFE','NFCE'], numbersDps: false, consultar: true, cancelar: true,
//                                  webhook: false, inutilizar: true, cce: false }
```

```prisma
// cond. F-NFCE-E1-4 (b): CSC por unidade e ambiente, cifrado (só se a v2 for necessária)
model NfceCsc {
  id            String   @id @default(cuid())
  userId        String
  unitId        String
  ambiente      String   // producao | homologacao
  cscId         String   // identificador do CSC (6 dígitos, "cIdToken")
  cscCiphertext Bytes    // secretBox, AAD = id, keyring do F-ADN-3
  keyVersion    Int
  createdAt     DateTime @default(now())
  deletedAt     DateTime?
  @@index([userId, unitId, ambiente])
  @@map("nfce_cscs")
}
```

## 5. Forks novos — RATIFICAÇÃO PENDENTE

### F-NFCE-E1-1 — O emissor próprio cobre a NFC-e/NF-e, ou só a NFS-e?
- **(a)** Sim: o fold de 07/10 ("emissor próprio, sem conta Focus") vale para todos os tipos, e o X10a passa a falar
  direto com a SEFAZ.
- **(b)** Só a NFS-e é própria (ADN); a NFC-e espera outro parceiro emissor (BYOK) ainda não escolhido.
- **(c)** NFC-e fora do Luminaris por enquanto: o cliente emite em outro sistema.
- **Recomendação: (a).** A fala de 07/10 cita só "ADN", que é NFS-e, e por isso pergunto. Mas o pedido de hoje
  manda trocar "Focus por emissor próprio" no BRIEF da NFC-e, e (b) reabre a escolha de fornecedor que o dono acabou
  de descartar. O custo de (a) é maior que o da NFS-e: 27 UF, SOAP, contingência (§3). Para o 1º cliente só SP
  importa, e o resto fica como linha de tabela. **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-2 — Um adaptador para NF-e e NFC-e, ou dois
- **(a)** Um `SefazNfeEmissor` para `NFE` e `NFCE` (mesmo protocolo, mesmos serviços).
- **(b)** Dois adaptadores.
- **Recomendação: (a).** A decisão 3 de 26/09 diz um adaptador por protocolo, e os nomes de serviço são os mesmos
  nos dois modelos (`[WS-SP-NFCE]`, `[WS-NFE]`). O que muda é URL (tabela) e regra de leiaute (schema, já discriminado
  por `mod`). **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-3 — Endereços dos webservices
- **(a)** Tabela no código por `(UF, modelo, ambiente, serviço)` com a fonte de cada linha, começando só com SP
  (55 e 65) e as virtuais que SP não usa fora; UF sem linha ⇒ desabilitada com motivo.
- **(b)** Tabela completa das 27 UF agora.
- **(c)** URL por env.
- **Recomendação: (a).** O 1º cliente é de SP. (b) é dado que envelhece sem uso. (c) põe a URL da autorizadora na
  mão de quem faz o deploy. Custo de (a): o 2º cliente de outra UF exige um PR de dado. **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-4 — QR Code: versão 3 (sem CSC) ou versão 2 (com CSC)
- **(a)** Só v3: on-line sem CSC, contingência assinada com o A1 (`[NT2025001-QRV3]`). Não guarda CSC.
- **(b)** v2 com CSC por unidade e ambiente, cifrado (model `NfceCsc`), e v3 quando a UF aceitar.
- **(c)** v3 por padrão, com v2 + CSC como alternativa por UF onde a v3 for rejeitada (407).
- **Recomendação: (a) se a L-NFCE-1 confirmar que SP aceita a v3; senão (c).** A NT diz que a v3 é opção da PJ
  (`[NT2025001-PJ]`) e dispensa o CSC, que é mais um segredo do cliente a guardar. A regra 407 mostra que a aceitação
  é por UF, e não achei ato de SP que a confirme. **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-5 — Contingência da NFC-e
- **(a)** Nenhuma neste ciclo: SEFAZ fora ⇒ a venda segue sem NFC-e e o botão mostra o motivo; o operador emite
  depois. Isso é aceito só se a L-NFCE-2 disser que é legal.
- **(b)** Off-line `tpEmis=9` com QR v3 assinado, transmissão posterior e 110112.
- **(c)** EPEC da NFC-e de SP (endpoints existem, `[WS-SP-NFCE]`).
- **Recomendação: nenhuma até a L-NFCE-2.** Antes, o argumento era "a contingência é do parceiro". Sem parceiro,
  qualquer escolha tem consequência legal: (a) pode ser venda sem documento, (b) depende de a UF aceitar (rej. 712),
  e (c) contradiz a regra 714 do MOC ("tpEmis 2/4/5 inválido" na NFC-e) que o original transcreveu, o que só o ato de
  SP explica. Recomendar sem essa resposta seria inventar regra. **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-6 — DANFE NFC-e
- **(a)** Backend gera o DANFE NFC-e (PDF/80 mm) a partir do `nfeProc` e o anexa ao documento; a impressão e o envio
  ficam no FE.
- **(b)** Só os dados (chave, QR, URL) para o FE desenhar.
- **(c)** Fora deste ciclo.
- **Recomendação: (b)** neste BRIEF de backend, com o DANFE no BRIEF de FE. O leiaute do DANFE vem do manual ausente
  (insumo 1) e depende da L-NFCE-4 (impresso × eletrônico). **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-7 — Rebaixar a NT 2025.002 v1.52 antes do PR-0
- **(a)** Sim: o PR-0 transcreve o UB pela v1.52 (publicada 01/10/2026).
- **(b)** Transcrever pela v1.51 e conferir a diferença depois.
- **Recomendação: (a).** O F-NFCE-12b (b) manda transcrever todos os subgrupos do UB; transcrever uma versão já
  superada é retrabalho certo. O download exige a autorização do dono, como em 02/10. **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-8 — Credenciamento e status do serviço antes de emitir
- **(a)** `NFeStatusServico4` antes do 1º envio do dia por UF/ambiente, com cache curto; `cStat` ≠ 107 ⇒ aviso sem
  envio.
- **(b)** Enviar direto e tratar a falha.
- **Recomendação: (b)** com o status só no `getStatus()` sob demanda. O envio síncrono já diz se a SEFAZ está fora, e
  (a) dobra chamadas no caminho do balcão, onde o atraso de 5 minutos conta (`[NT2025001-ATRASO]`). **RATIFICAÇÃO PENDENTE.**

### F-NFCE-E1-9 — Ordem entre os dois BRIEFs
- **(a)** O BRIEF irmão (NFS-e/ADN) vai primeiro e entrega certificado, cifra e transporte mTLS; o PR-7 desta emenda
  começa depois do PR-3 de lá.
- **(b)** Em paralelo, com o certificado duplicado.
- **Recomendação: (a).** A NFS-e do Simples tem data (01/11/2026), o certificado é o mesmo objeto, e duplicar a guarda
  do A1 é o clone que o critério de reuso proíbe. **RATIFICAÇÃO PENDENTE.**

## 6. Perguntas de lei

### L-NFCE-1 — SP aceita o QR Code versão 3 para emitente PJ?
- **(a) Pergunta:** a SEFAZ-SP já aceita, em produção, NFC-e de pessoa jurídica com QR Code versão 3, sem CSC?
- **(b) Por que importa:** decide o F-NFCE-E1-4 e o item E-3. Com "não", o Luminaris tem de receber, cifrar e guardar o
  CSC de cada unidade e ambiente (model `NfceCsc`).
- **(c) O que a pesquisa encontrou:** a NT 2025.001 v1.02 diz que a v3 é opção da PJ e que a aceitação é "parâmetro
  por UF, enquanto todas as UF não migrarem" (rej. 407), pp. 5–6 e 12 (Portal NF-e, URL na §0, acesso 10/10/2026). O
  histórico da v1.01 registra a remoção da ZX02-220 "considerando que todas as UF irão disponibilizar" a v3, mas a
  tabela da v1.02 (p. 12) ainda a traz como parâmetro por UF. Blogs de fornecedores dizem que o CSC "segue indispensável em 2025/2026" (fonte secundária). Não
  achei ato nem página da SEFAZ-SP sobre a v3. Não basta: a fonte federal delega à UF.
- **(d) Quem responde:** órgão (SEFAZ-SP, portal da NFC-e / Fale Conosco) ou o runbook de homologação na SEFAZ-SP.

### L-NFCE-2 — Que contingência a legislação paulista admite para a NFC-e, e vender sem nota quando a SEFAZ cai é permitido?
- **(a) Pergunta:** em SP, quando a autorização on-line falha, o contribuinte é obrigado a usar uma contingência
  (off-line `tpEmis=9` ou EPEC), ou pode concluir a venda e emitir depois? Qual modalidade vale para NFC-e?
- **(b) Por que importa:** decide o F-NFCE-E1-5 inteiro e o item E-9. A recomendação ficou em branco por isso. Também
  decide se o 110112 volta ao escopo.
- **(c) O que a pesquisa encontrou:** a SEFAZ-SP publica endpoints de "contingência EPEC" para NFC-e
  (<https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx>, acesso 10/10/2026), mas a página não
  traz texto sobre quando usar. O MOC 7.0 Anexo I diz que `tpEmis=9` só vale se a UF aceita (712) e que `tpEmis` 2/4/5
  é inválido na NFC-e (714) (BRIEF original, `[NFCE-CONTING]`). As duas fontes parecem conflitar, e nenhuma é o ato
  normativo de SP. A Portaria SRE 79/2024 só veda o SAT.
- **(d) Quem responde:** lei pesquisável (Portaria CAT/SRE de SP que regula a NFC-e; o ato não foi identificado nesta
  sessão) e, se o texto não for claro, advogado tributarista ou SEFAZ-SP.

### L-NFCE-3 — Prazo de cancelamento da NFC-e em SP
- **(a) Pergunta:** SP aplica a exceção estadual ao prazo nacional de 24 h para cancelar NFC-e? Qual é o prazo?
- **(b) Por que importa:** alimenta `nfceCancelPrazoHoras` (item 27 do original, F-NFCE-10 a). Sem ele, o padrão é
  24 h, e a NFC-e fora do prazo é rejeição terminal (501).
- **(c) O que a pesquisa encontrou:** o MOC 7.0 VG Tabela 5-38 dá 24 h "considera a exceção de prazo definida em
  legislação estadual" (BRIEF original, `[NFE-CANC-PRAZO]`). O ato de SP não foi identificado (BRIEF original §6, "não
  identificado nesta sessão"). Nesta sessão também não.
- **(d) Quem responde:** lei pesquisável (ato da SEFAZ-SP sobre NFC-e) ou SEFAZ-SP.

### L-NFCE-4 — DANFE NFC-e: impresso obrigatório ou basta o eletrônico?
- **(a) Pergunta:** em SP, o DANFE NFC-e precisa ser impresso para o consumidor, ou pode ser entregue só por meio
  eletrônico (`tpImp=5`)? Precisa de concordância do consumidor?
- **(b) Por que importa:** decide o F-NFCE-E1-6 e se o 1º cliente precisa de impressora no balcão.
- **(c) O que a pesquisa encontrou:** o Anexo I aceita `tpImp ∈ {4,5}` na NFC-e (regra 709, BRIEF original
  `[NFCE-IDE]`). A NT 2026.002 (DANFE Simplificado Tipo 2, v1.11 de 01/10/2026) está na lista do portal, mas não foi
  lida. Nada de SP encontrado.
- **(d) Quem responde:** lei pesquisável (ato de SP + Manual do DANFE NFC-e) ou SEFAZ-SP.

### L-NFCE-5 — Emissor próprio precisa de credenciamento ou cadastro de software na SEFAZ-SP?
- **(a) Pergunta:** para emitir NFC-e em SP com aplicativo próprio (não o de um parceiro credenciado), o contribuinte
  precisa de credenciamento prévio como emissor de NFC-e, e o software precisa de algum cadastro ou homologação na
  SEFAZ-SP?
- **(b) Por que importa:** se precisar, há um passo humano antes do PR-7 valer em produção, e ele entra no runbook
  (gate), não no código. Pode também exigir dado do software no XML (`verProc`, responsável técnico `infRespTec`).
- **(c) O que a pesquisa encontrou:** nada específico de SP nesta sessão. O MOC fala em série 000–889 de "aplicativo
  da empresa" (`[NFE-SERIE]`), sem credenciamento. O grupo de responsável técnico existe no leiaute (NT 2018.005,
  fora do corpus).
- **(d) Quem responde:** órgão (SEFAZ-SP) e contador (conhece o procedimento de credenciamento do cliente).

## 7. Insumos ausentes (pausados — regra 2)

1. **Manual de Padrões Técnicos do DANFE NFC-e e QR-Code** (versão vigente): endereços de consulta por UF, fórmula
   da v2 e da v3. Necessário para E-3. Antes dispensável ("quem monta é o parceiro"), agora não.
2. **Manual de Contingência da NFC-e** (MOC Anexo IV/V): necessário só se o F-NFCE-E1-5 trouxer contingência.
3. **NT 2025.002 v1.52** (F-NFCE-E1-7) e **NT 2025.001 v1.02** no MANIFEST (lida nesta sessão a partir do scratchpad,
   sha `44b71f16bf11…`, não commitada nem registrada).
4. **NT 2026.004 (CNPJ alfanumérico no schema da NF-e/NFC-e)**: o `CNPJ_REGEX` do projeto já é alfanumérico na DPS
   (`DpsPayloadDto.ts:29`); o PR-0 confere o schema da NF-e.
5. **Ato da SEFAZ-SP que regula a NFC-e** (L-NFCE-2, 3, 4): não identificado.
6. **Formação exata dos `Id` de `inutNFe` e `envEvento`**: o PR-0 transcreve do MOC (E-6, E-7).

## 8. Achados fora de escopo

1. **NT 2026.001 — Provedor de Assinatura e Autorização (PAA)** (v1.02b, 31/07/2026, `[NT-NOVAS]`): pelo título, é um
   desenho oficial em que um terceiro assina e autoriza no âmbito da NF-e. Pode mudar o F-NFCE-E1-1 e a custódia do A1
   (L-ADN-5). Não lida. Vale uma leitura antes de ratificar o F-NFCE-E1-1.
2. **NF-e recebidas / manifestação** (F-PLAN-3, Fase G): com o A1 guardado, a distribuição de DF-e (NT 2014.002 v1.40,
   03/07/2026) fica tecnicamente ao alcance. Outro nó.
3. **Telas**: upload do certificado (BRIEF irmão), botão "Emitir NFC-e", DANFE no balcão, inutilizações, contingência:
   BRIEF `FE-INCR-NFCE` com autorização própria.
4. **Notas do vault**: o X10a ainda diz "Depende do D5 (Focus)". Fold depois da ratificação (regra 1).

## 9. Plano de execução por fatias (substitui só a linha "Focus | 33" do §9 original)

| PR | Itens | Depende |
|---|---|---|
| PR-0 (docs, ampliado) | 1 (com `infNFeSupl`, `enviNFe`, `inutNFe`, `envEvento`, v1.52) | F-NFCE-E1-7 + download autorizado |
| PR-1..PR-6 | como no original | inalterado |
| PR-7 adaptador SEFAZ | E-1 (reuso), E-2, E-4, E-5, E-6, E-7, E-8, E-10 | F-NFCE-E1-1, 2, 3, 8, 9; PR-1..3 do BRIEF irmão |
| PR-8 NFC-e on-line | E-3 | F-NFCE-E1-4 (+ L-NFCE-1) |
| PR-9 contingência | E-9 | F-NFCE-E1-5 (+ L-NFCE-2) |
| — runbook | homologação na SEFAZ-SP (NFC-e) | PR-7/8 + A1 de teste + "executa" da emissão real |

## 10. Gates de envio [OPS-001]

1. **Objetivo:** dizer, item a item, o que o BRIEF da NFC-e perde e ganha sem a Focus. A §2 cobre os 33 itens e os
   forks, e a §3 lista o que é novo, cada coisa ligada à fonte.
2. **Grau:** NT 2025.001, páginas da SEFAZ-SP e do Portal NF-e V, com URL e acesso 10/10. O conteúdo das NTs novas
   (`[NT-NOVAS]`) **não** foi lido (só título e data). Formação de `Id` de evento e inutilização: a confirmar no PR-0.
3. **Caso adversarial tentado:** "sem parceiro, o CSC é obrigatório e vira segredo nosso" → a NT 2025.001 diz que a
   v3 dispensa o CSC on-line (`[NT2025001-QRV3]`), e por isso o F-NFCE-E1-4 pode não guardar CSC nenhum. Mas a regra
   407 deixa a aceitação com a UF, e por isso a L-NFCE-1 existe. Também: "a NFC-e não tem contingência fora do
   off-line" (MOC 714) × endpoints EPEC de NFC-e na SEFAZ-SP: conflito registrado na L-NFCE-2, sem resolver.
4. **Checagem que teria falhado:** a lista de NTs do portal mostrou a v1.52 da NT 2025.002 (01/10/2026), mais nova que
   a do corpus (v1.51). Sem essa leitura, o PR-0 transcreveria uma versão superada (F-NFCE-E1-7).
5. **Vieses (T8):** a recomendação do F-NFCE-E1-1 (a) segue o pedido do dono, e eu a marco como leitura, não fato.
   O custo da emissão própria de NFC-e é bem maior que o da NFS-e (27 autorizadoras, SOAP, contingência), e isso
   pesa contra (a) se o 2º cliente não for de SP.
