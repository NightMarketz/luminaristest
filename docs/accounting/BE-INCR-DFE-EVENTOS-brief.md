# BE-INCR-DFE-EVENTOS — BRIEF (nó X11): janela de cancelamento, substituição de NFS-e e o que falta no `e101101`

> Sessão de planejamento (`sessao-planejamento`), 2026-10-02. **Não escreve código, não ratifica fork.**
> Grau: **V** = verificado (lido na fonte ou no código) · **I** = inferido · **NV** = não verificado.
>
> **Em duas linhas:** a fonte primária **não traz número de prazo** — cancelamento (RN E0822) e substituição (RN
> E0050) são regras de nível 3, "conforme parametrização do município"; o único teto nacional é "2 anos" para a
> substituição (Anexo I [114]). Por isso a "janela calculada" depende de um dado do município que o corpus não tem
> (F-EVT-1/2), e o risco principal é tratar um prazo configurado como se fosse a regra do fisco.

---

## 0. Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X11`](../plano/nos/X11.md) — "Eventos de DF-e com prazo legal validado (cancelamento,
  substituição, CC-e)", estado `blocked`, `estado_detalhe` de 29/09: só o `e101101` existe, sem janela, sem `e105102`.
- **Autorização (ORCH-006):**
  - dono em chat, **02/10/2026**: *"Autorizo planejar o BRIEF do X11 (dono, 02/10) — só o BRIEF, sem 'executa'."*
    Escopo dado na mesma mensagem: janela de cancelamento calculada; substituição de NFS-e (`e105102`); o que falta no
    cancelamento `e101101`. **Eventos da NF-e/NFC-e ficam fora** (vão no BRIEF do X10a).
  - campo `autorizacao` da nota: *"resposta 13 (10/09)"* —
    [`CEDULA-DECISAO-2026-09-10-entrevista.md:50`](CEDULA-DECISAO-2026-09-10-entrevista.md): *"Todos, de acordo com
    os prazos da Receita"* → "Cancelamento, substituição e carta de correção com o prazo legal validado no comando".
  - **Cobre exatamente:** o BRIEF backend dos eventos de **NFS-e**. **Não cobre:** código (sem "executa"), FE
    (nó [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md)), adaptador da Focus ([`X10i`](../plano/nos/X10i.md)), eventos de
    NF-e/NFC-e ([`X10a`](../plano/nos/X10a.md)).
  - **Divergência de escopo registrada (passo 1):** o título do nó inclui **CC-e**. A NFS-e nacional **não tem carta
    de correção** — a aba `TIPO EVENTOS DE NFSe` do Anexo II lista 16 eventos e nenhum é de correção (V, §1.1). CC-e é
    evento de NF-e (`110110`), portanto cai na fronteira que o dono traçou: vai com o X10a. Não é escopo a mais nem a
    menos; é o título do nó que mistura os dois modelos.
- **Insumos lidos nesta sessão:**
  - [`ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) §9.2 item 7 (cancelamento: "fora do
    prazo" tipado; `CANCELLED` sem substituto = pendência), §11.1 itens 5–6, §11.2 (fatos da Focus), §11.3 (Ato 4).
  - [`BE-INCR-DFE-brief.md`](BE-INCR-DFE-brief.md) §1 linha `[113-116]` (substituição "fora do MVP"), p9, itens 29–30.
  - [`BE-INCR-DFE-MANUAL-brief.md`](BE-INCR-DFE-MANUAL-brief.md) item 13 e F-MAN-5 (a) (cancelamento manual com XML).
  - [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](MAPA-COBERTURA-EMISSAO-2026-10-02.md) §2 item 8, §4.
  - [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) item 23 (instrução "no portal use Cancelar, não Substituir") e
    **F-FE-DFE-9** (pendente: o portal pode não entregar o XML do evento).
  - [`DOSSIE-DECISOES-2026-09-29.md`](DOSSIE-DECISOES-2026-09-29.md) §2 linha X11.
  - **Fonte primária** (baixada 02/10 com autorização do dono nesta sessão; sha256 igual ao
    [`MANIFEST.md`](fontes-oficiais/MANIFEST.md)): `NFSe-ANEXO-II-eventos-v1.01.xlsx` (`5abe83d7e510`, 4 abas lidas
    inteiras), `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx` (`de5bc492959e`, grupo `subst` e RN [169]–[187]),
    `NFSe-ESQUEMAS_XSD-v1.01.zip` (`e7935cbd9470`, `tiposSimples`/`tiposComplexos`/`tiposEventos` 1.01),
    Guia do Emissor Público Nacional Web v1.2 (`85982d1ee76b`, §5–§5.5, pp. 79–84).
  - Código (`origin/main` = `4dd8fcb4`): `FiscalDocumentLifecycleService.ts` (`cancelar` :235-273, `markCancelled`
    :279-301, `cancelamentoManual` :450-479, `applyResult` :522-684); `dfe/DfeEmissorPort.ts` (`CancelResult` :97-100,
    `DfeCapabilities` :56-62); `dfe/NullEmissor.ts:46`, `dfe/ManualEmissor.ts:32`; `lib/nfseEvento.ts`
    (`parseEventoCancelamento`); `lib/nfse.ts` (`ParsedNfse`, sem `subst`); `dtos/DpsPayloadDto.ts` (sem `subst`;
    `opSimpNac ∈ {1,3}` :38); `schema.prisma:1320-1368` (`FiscalProfile`), `:1466-1515` (`FiscalDocument`);
    `FiscalDocumentEmissionService.ts:317-353` (pendências), `:564-569` (guarda "documento vivo");
    `routes/dfe.ts:32-47`; `audit/auditCanonical.ts:160-167`.
- **Nós vizinhos:** consome `X10b` (porta, máquina de estados — done) e o modo manual (`DFE-MANUAL`); depende de
  `X10i` (adaptador Focus) para o caminho por máquina; é consumido por `FE-INCR-DFE` (tela). Fronteira com `X10a` na §7.

---

## 1. O que a fonte primária diz (transcrição da parte usada)

> Regra de conflito herdada da [transcrição de 27/09](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md):
> **XSD vence** para nome e estrutura; **planilha vence** para regra de negócio. `[n]` = linha do Excel.

### 1.1 Os eventos de NFS-e (Anexo II, aba `TIPO EVENTOS DE NFSe`, [2]–[17])

| [n] | evento | código | autor | assinatura do emitente | cabe ao X11? |
|---|---|---|---|---|---|
| [2] | Cancelamento de NFS-e | `101101` | Emitente | Sim | **sim** (existe; lacunas na §2) |
| [3] | Cancelamento de NFS-e por Substituição | `105102` | **MEmis** (município emissor) | "-" | **sim** — o emitente **não envia** este evento (ver 1.3) |
| [4] | Solicitação de Análise Fiscal para Cancelamento | `101103` | Emitente | Sim | **fork F-EVT-4** |
| [5]/[6] | Cancelamento Deferido / Indeferido por Análise Fiscal | `105104` / `105105` | MEmis | "-" | **fork F-EVT-4** |
| [7]–[14] | Manifestações (confirmação/rejeição de prestador, tomador, intermediário; tácita; anulação) | `2xxxxx` | não emitentes / MIncid | Não | fora (§8) |
| [15]–[17] | Cancelamento, bloqueio e desbloqueio por ofício | `3051xx` | MEmis | "-" | fora (§8) |

Nenhum evento de correção (CC-e) na lista — **V**.

### 1.2 Prazo de cancelamento (Anexo II, aba `RN EVENTO_PED.REG.EVENTO`)

| [n] | RN | regra (texto da planilha, resumido) | nível | executa nos emissores públicos? |
|---|---|---|---|---|
| [28] | **E0822** | não cancela "fora do prazo limite … conforme parametrização do município emissor" | **3** | V |
| [29] | E0823 | não cancela acima de valor permitido pelo município | 3 | V |
| [30] | E0824 | não cancela NFS-e sem tomador identificado, se o município parametrizar | 3 | V |
| [31] | E0827 | não cancela NFS-e com evento de tributos recolhidos, se o município de incidência parametrizar | 3 | V |
| [35] | E0840 | não recepciona cancelamento se já houver evento impeditivo vinculado (matriz `RN EVENTOSxEVENTOS`) | 1 | V |

Nível 3 = "Regras de Negócio específicas conforme legislação municipal do município parametrizada no SN NFS-e"
(cabeçalho [2] da aba). **Nenhuma linha dá o número de dias.** — V.

Matriz `RN EVENTOSxEVENTOS` [5]–[7]: depois de um cancelamento ([6]) ou de um cancelamento por substituição ([7]),
**nenhum** outro evento é aceito (linha toda "X"); com análise fiscal pendente ([8]) o cancelamento direto é "X". — V.

**Guia do Emissor Web v1.2 §5.3 (pp. 81–82):** se o cancelamento não for possível pelas regras, o portal pergunta e,
com "SIM", **converte o pedido em Solicitação de Análise Fiscal** (`e101103`). — V.

### 1.3 Substituição (Anexo I + Anexo II + XSD + Guia)

- **Mecânica (Guia §5.2, p. 81; Anexo II [27]–[29]):** substituir = emitir **uma DPS nova** com o grupo
  `infDPS/subst` apontando a chave da nota original. Ao gerar a substituta, o sistema **gera e vincula** o evento
  `e105102` à original, cujo `cMotivo`/`xMotivo` são "obtidos do campo da DPS `DPS/infDPS/subst/…`" e cujo
  `chSubstituta` é a chave da nova. O emitente não monta nem assina o `e105102`. — V.
- **Grupo `subst` (Anexo I [113]–[116]; XSD `TCSubstituicao`):**

  | [n] | campo | OCOR | TAM / tipo | regra |
  |---|---|---|---|---|
  | [113] | `subst` | 0-1 | grupo | — |
  | [114] | `chSubstda` | 1-1 | 50 · `TSChaveNFSe` | obs.: "prazo máximo … parametrizar … **Prazo máximo parametrizável é 2 anos**" |
  | [115] | `cMotivo` | 1-1 | **XSD `TSCodJustSubst` = `01`·`02`·`03`·`04`·`05`·`99`** (planilha diz TAM 1 — XSD vence) | 01 desenquadramento do Simples · 02 enquadramento no Simples · 03 inclusão retroativa de imunidade/isenção · 04 exclusão retroativa · 05 rejeição pelo tomador/intermediário responsável · 99 outros |
  | [116] | `xMotivo` | 0-1 | 15–255 | obrigatório se `cMotivo = 99` (RN E0078, [187]) |

- **Regras de recepção da DPS substituta (Anexo I, aba `RN DPS_NFS-e`):**

  | [n] | RN | regra | nível |
  |---|---|---|---|
  | [170] | E0042 | chave a substituir com DV válido e mesmo município/tipo/inscrição do emitente | 1 |
  | [171] | E0044 | NFS-e a substituir tem de existir | 1 |
  | [172] | E0046 | NFS-e **cancelada** não pode ser substituída | 1 |
  | [173] | **E0050** | fora do prazo do município não substitui, **exceto `cMotivo` 1 ou 2** (Simples) | **3** |
  | [174] | E0056 | sem tomador identificado não substitui, se o município parametrizar | 3 |
  | [175] | E0058 | não altera identificação do não emitente, se o município parametrizar | 3 |
  | [176] | **E0060** | não optante (`opSimpNac = 1`): **não muda** `dCompet`, subitem da lista nacional, código complementar municipal, local da prestação | 2 |
  | [177] | **E0061** | MEI/ME/EPP (`opSimpNac = 2|3`): **não muda** identificação do tomador (se havia), `dCompet`, `vServ` | 2 |
  | [178] | E0065 | não substitui nota de outro ambiente gerador | 1 |
  | [179] | E0068 | não substitui com análise fiscal de cancelamento aguardando resposta | 1 |
  | [180]/[181] | E0070 / E0072 | não substitui com manifestação de confirmação (expressa ou tácita) | 2 |
  | [182] | E0074 | não substitui com tributos recolhidos, se o município de incidência parametrizar | 3 |
  | [183] | E0076 | não substitui com bloqueio de ofício vigente para `e105102` | 1 |

- **Guia §5.2 (p. 81)** — parâmetros que **cada município cadastra**: se existe prazo máximo; **qual o prazo, em dias**;
  se permite substituir nota sem não emitentes identificados; se permite alterar os não emitentes. — V.
- **Prova no modo manual:** a NFS-e substituta é baixável em XML (Guia §5, p. 79, "Download do XML da NFS-e") e o XML
  autorizado **embute a DPS** (`NFSe/infNFSe/DPS/infDPS/…`, transcrição 27/09 §1), logo carrega `subst/chSubstda`. A
  substituição tem prova em XML **sem depender do XML do evento** que o F-FE-DFE-9 põe em dúvida. — V para o caminho
  do leiaute; **I** que o portal grava o `subst` na DPS embutida (é o que o leiaute manda; não vi um XML real).

### 1.4 O que a fonte primária não tem

- O **número** de dias de cancelamento e de substituição de qualquer município (nível 3). Nem o de São Paulo.
- O **instante-base** da contagem (geração da nota? competência?) e se são dias corridos, úteis, de calendário local.
- Se existe API pública dos parâmetros municipais que exponha esses prazos (o manual da API do emissor público,
  `nfse-manual-emissor` no MANIFEST, **não foi lido** nesta sessão — insumo ausente §6).

---

## 2. O que existe hoje e o que falta (V, código em `4dd8fcb4`)

| # | Fato | Evidência | Lacuna |
|---|---|---|---|
| L1 | `cancelar` traduz `OUT_OF_WINDOW` em 409 `DFE_CANCEL_OUT_OF_WINDOW` | `LifecycleService.ts:257-259` | **nenhum adaptador devolve `OUT_OF_WINDOW`**: `NullEmissor.cancelar` sempre `CANCELLED` (:46), `ManualEmissor.cancelar` lança (:32). O 409 só existe no teste com porta falsa (`…LifecycleService.test.ts:416`) |
| L2 | Não há prazo em lugar nenhum | `FiscalProfile` sem campo de prazo (`schema.prisma:1320-1368`) | nada a calcular, nada a mostrar |
| L3 | `authorizedAt = new Date()` | `LifecycleService.ts:595` | no modo manual é a hora do **upload**, não o `dhProc` da nota; qualquer janela contada dele sai errada |
| L4 | `cancelamentoManual` lê e **descarta** o XML do evento | `:450-479` → `markCancelled` não anexa | a prova do cancelamento (o que o F-MAN-5 (a) exigiu) não fica guardada; `cancelledAt` = hora do upload, não o `dhProc` do evento |
| L5 | `cancelar` com resultado `PROCESSING` lança 409 e não grava nada | `:264-268` | pedido em voo some; o próximo clique reenvia |
| L6 | A porta não sabe dizer "esta nota foi cancelada lá fora" | `EmissaoResult.status` sem `CANCELLED` (`DfeEmissorPort.ts:77`); `VALID_RESULT_TRANSITIONS` proíbe por desenho (:33-40) | cancelamento por ofício, por análise fiscal ou feito no portal fica invisível |
| L7 | Substituição não existe | nenhum `subst` em `DpsPayloadDto.ts`, `lib/nfse.ts`, `EmissionService.ts` | — |
| L8 | Uma 2ª nota para a mesma (venda, kind, cTribNac) é recusada enquanto a 1ª vive | `EmissionService.ts:564-569` + `@@unique([userId, unitId, saleKey, kind, cTribNac])` | a substituta colide com a original até a original cair (F-EVT-3) |
| L9 | `retornoManual` não olha `subst` | `lib/nfse.ts` sem o grupo | se a pessoa clicar "Substituir" no portal e subir o XML como retorno de **outro** documento, o Luminaris aceita uma nota que já cancelou outra |

Fora desta tabela e **já registrado** (não replanejado aqui): GAP-MAP "DF-e — consultar, cancelar e webhook usam o
ambiente do env" (ABERTO; mapa de cobertura §4) e F-FE-DFE-9 (fork pendente).

---

## 3. Checklist de comportamentos

> `[direto]` = sem fork; `[cond:F-EVT-n]` = o texto vale para a recomendação, e muda se o dono escolher outra.
> Cada item é testável isolado. Regra fiscal só entra com a linha da fonte citada (regra 3 do formulário).

### PR-1 — sem parceiro (modo manual + contrato); não depende do X10i se F-EVT-7 (a)

1. **[direto]** **Instante fiscal da nota.** `FiscalDocument.nfseDhProc DateTime?` gravado no `AUTHORIZED`: no retorno
   manual = `nota.dhProc` (Anexo I `infNFSe/dhProc` [19], `TSDateTimeUTC` com fuso); no caminho por máquina =
   `EmissaoResult.dhProc?` (campo novo, opcional). `authorizedAt` mantém o significado atual. Testável: retorno manual
   com `dhProc = 2026-10-01T10:00:00-03:00` grava esse instante, não o do upload.
2. **[cond:F-EVT-1, F-EVT-2]** **Prazos configuráveis por unidade.** `FiscalProfile` ganha `cancelPrazoDias Int?`,
   `substPrazoDias Int?` (≤ 730 — Anexo I [114] "máximo parametrizável é 2 anos") e `prazoFonte String?` (onde o operador
   achou o número). `null` = "prazo do município desconhecido". Mesmo padrão dos campos D1f ("pendente contador"):
   entra em `pendingExternalValidation`, nunca bloqueia emissão. Testável: PUT com `substPrazoDias: 731` → 400.
3. **[cond:F-EVT-1, F-EVT-2]** **Janela calculada.** Função pura `janelaEventos(doc, profile, now)` →
   `{ cancelarAte, substituirAte, substituirTeto, fonte }` (ISO com fuso ou `null`). `substituirTeto` = base + 2 anos
   (único limite nacional, Anexo I [114]); `cancelarAte`/`substituirAte` só existem com o prazo configurado.
   `fonte ∈ 'perfil' | 'desconhecida'`. Sem `nfseDhProc` (documentos antigos) → tudo `null`. Testável: tabela de casos
   (prazo nulo, base nula, borda exata do último instante, virada de dia em `America/Sao_Paulo` às 21h–00h BRT — classe
   `teste-de-hoje-quebra-em-janela-utc`).
4. **[direto]** **A view carrega a janela e os vínculos.** `FiscalDocumentView` ganha `janela` (item 3),
   `substitutesDocumentId`, `substitutedByDocumentId`, `substMotivo`. Testável: snapshot de shape do DTO de saída.
5. **[cond:F-EVT-1]** **Cancelamento por máquina com a janela.** (a): fora da janela configurada → a operação **segue**
   para a porta e a resposta leva `avisos: ['fora_da_janela_configurada']`; quem recusa é o fisco. O 409
   `DFE_CANCEL_OUT_OF_WINDOW` continua sendo o mapeamento do resultado da porta. Testável: perfil com 1 dia, nota de
   3 dias, porta falsa devolvendo `CANCELLED` → 200 com aviso.
6. **[direto]** **Contrato do `OUT_OF_WINDOW`.** JSDoc de `CancelResult` (`DfeEmissorPort.ts:97`) fixa: o adaptador
   devolve `OUT_OF_WINDOW` **quando o fisco rejeita com E0822** (Anexo II [28]); E0823/E0824/E0827/E0840 ficam
   `REJECTED` com o código preservado em `errors[].code`. Fixture de adaptador falso (teste) que traduz a lista de
   erros por essa regra; o adaptador Focus (X10i) herda o teste. Testável: rejeição `E0822` → 409 `OUT_OF_WINDOW`;
   rejeição `E0824` → 409 `DFE_CANCEL_REJECTED` com `E0824` na mensagem.
7. **[direto]** **Cancelamento manual guarda a prova.** Depois da tx do `CANCELLED` (mesma ordem "transição antes,
   anexo depois" do GAP-MAP `applyResult`, 28/09): em produção, o XML do evento vira `DocumentAttachment`
   (`targetType FISCAL_DOCUMENT`, `fileName <id>.evento-101101.xml`) e o id vai para `cancelEventAttachmentId`;
   `cancelledAt` = `evento.dhProc` (instante do fisco). Falha no anexo deixa `CANCELLED` sem anexo — reexecutável,
   declarado. Testável: anexo criado em produção, não criado em homologação; `cancelledAt` = `dhProc` do XML.
8. **[direto]** **XML de substituição no lugar errado.** `parseEventoCancelamento` com `e105102` (e sem `e101101`)
   responde 422 `NFSE_EVENTO_INVALIDO` com o texto "é um cancelamento por substituição — registre pela substituição"
   (hoje: "o evento não é um cancelamento"). Testável: fixture `e105102` → mensagem nova.
9. **[direto]** **Grupo `subst` na DPS.** `DpsPayloadSchema`/`DpsManualPayloadSchema` ganham `infDPS.subst?`
   `{ chSubstda: /^\d{50}$/, cMotivo: '01'|'02'|'03'|'04'|'05'|'99', xMotivo?: 15–255 }` com `superRefine`
   "obrigatório se 99" (E0078) — teste próprio do refine (o snapshot de shape não o vê, memória
   `dto-shape-snapshot-nao-cobre-logica-fina`). `toManualDps` **mantém** `subst` na ficha. Testável: `cMotivo: '99'`
   sem `xMotivo` → falha; `cMotivo: 1` (número) → falha (o XSD é string de 2).
10. **[direto]** **Leitura do `subst` na nota autorizada.** `ParsedNfse.dps.subst?` `{ chSubstda, cMotivo, xMotivo? }`
    lido de `NFSe/infNFSe/DPS/infDPS/subst` (Anexo I [113]–[116]). Testável: fixture com e sem o grupo.
11. **[cond:F-EVT-3, F-EVT-1]** **Pedir a substituição.** `POST /api/nfe/dfe/documents/:id/substituir`
    `{ unitId, cMotivo, xMotivo? }`. Guardas, todas **antes** de qualquer escrita, cada uma com a RN que espelha:
    - status ∈ `AUTHORIZED | AUTHORIZED_DIVERGENT` (E0046: cancelada não substitui) → senão 409 `DFE_STATUS_INVALIDO`;
    - nenhum substituto já criado para esta original (um por original; o rejeitado sai por `reenviar`) → 409
      `DFE_SUBSTITUICAO_EXISTENTE`;
    - `now ≤ substituirTeto` (Anexo I [114]) → senão 409 `DFE_SUBST_FORA_DO_TETO`;
    - `[cond:F-EVT-1]` fora de `substituirAte` e `cMotivo ∉ {01, 02}` (E0050, exceção do Simples) → aviso, não bloqueio;
    - `[cond:F-EVT-4]` sem análise fiscal pendente (E0068).
    Monta o payload com `reassembleGroupForReenvio` (venda + perfil **atuais**, mesmo caminho do reenvio) e acrescenta
    `subst { chSubstda = original.chaveOuCodigo, cMotivo, xMotivo }`. Cria o documento substituto (`substitutesDocumentId`,
    `saleKey` conforme F-EVT-3, tentativa 1, `SENT`, numeração **nova** quando local — é outra DPS, RN E0010) e audit
    `dfe.emitted` (inalterado). Pós-commit, igual à emissão: máquina → `port.emitir`; manual → fica `SENT` com ficha.
    Policy: `canEmitFiscalDocument` **e** `canCancelFiscalDocument` (a operação emite uma nota e cancela outra).
    Testável: cada guarda isolada; substituto criado com `subst` no `payloadJson`.
12. **[direto]** **Invariantes de conteúdo da substituta (nível 2, nacionais).** Comparando o payload remontado com o
    `payloadJson` da tentativa autorizada da original, recusa com 422 `substituicao_bloqueada` + `faltantes`:
    `opSimpNac = 1` → `dCompet`, `cTribNac`, `cTribMun`, `cLocPrestacao` iguais (E0060, Anexo I [176]);
    `opSimpNac = 3` → `dCompet`, `vServ` e documento do tomador (se a original tinha) iguais (E0061, [177]).
    Testável: perfil Simples + venda com valor alterado → 422 citando E0061; não optante mudando `vServ` → passa.
13. **[direto]** **Retorno manual de documento substituto e de documento comum.** Duas guardas de identidade novas
    no `retornoManual` (422 `DFE_IDENTIDADE_DIVERGENTE`, nada escrito): (i) documento **com** `substitutesDocumentId`
    exige `nota.dps.subst.chSubstda = original.chaveOuCodigo` e `cMotivo` = o pedido; (ii) documento **sem** ele exige
    `subst` **ausente** ("a nota do portal substituiu outra — use a substituição"). Fecha L9. Testável: os 4 cruzamentos.
14. **[cond:F-EVT-3, F-EVT-6]** **Autorizar a substituta cancela a original na mesma tx.** No ramo `AUTHORIZED` do
    `applyResult`, se `doc.substitutesDocumentId`: dentro do `runTransaction` (gate autoritativo dentro da tx, `tx`
    propagado): original → `CANCELLED` com `whenStatusIn AUTHORIZED_STATUSES`, `saleKey` renomeada,
    `substitutedByDocumentId`, `cancelledAt` = `nfseDhProc` da substituta; substituta assume `saleKey = saleId`; audit
    **`dfe.substituted`** `{ documentId (original), substituteDocumentId, cMotivo }`. Depois da tx: aposenta a
    proveniência da original (`retireSourceDocument`, motivo `dfe_substituted:<cMotivo>`) e anexa a da substituta
    (caminho já existente). Substituta `REJECTED` → original intocada. Testável (integração, repositório real — memória
    `repositorios-de-contabilidade-nao-sao-exercitados`): após autorizar, 1 documento vivo por (venda, cTribNac), a
    original `CANCELLED` com o vínculo, 1 `SourceDocument` vivo.
15. **[direto]** **Pendências coerentes.** A original substituída **não** gera `cancelled_without_replacement` (já
    resolvido pela regra atual de irmão vivo no mesmo `cTribNac`, `EmissionService.ts:346-349` — teste novo prova).
    A substituta `REJECTED` gera `substituicao_rejeitada` na **original** enquanto não houver reenvio autorizado.
    Testável: fixture com os três estados.
16. **[direto]** **Capacidade declarada.** `DfeCapabilities.substituir: boolean` — `ManualEmissor` e `NullEmissor`
    `true`, `DfeDisabledEmissor` `false`; o item 11 recusa com 409 `DFE_SUBST_NAO_SUPORTADA` quando `false`.
17. **[direto]** **Gates da mudança (mesma PR):** DTO `SubstituirFiscalDocumentSchema` `.strict()` no snapshot de
    shape; `dfe.substituted` no allowlist de `auditCanonical.ts`; rota em `routes/dfe.ts` + `docs.paths.ts` + guard de
    path-count do openapi (**+1 path**); migração SQLite com prólogo idempotente (memória
    `migracao-sqlite-nao-e-transacional`); `resetDb()` cobre as colunas novas; `tsc` limpo.

### PR-2 — caminho por máquina (espera o X10i; contrato exercido pelo `NullEmissor`)

18. **[cond:F-EVT-5]** **Eventos vistos de fora.** Porta ganha `consultarEventos(chave): Promise<EventoNfse[]>`
    (capacidade `consultarEventos`). O job de polling, para documentos `AUTHORIZED*` com `nfseDhProc` dentro do teto,
    aplica: `e101101`/`e305101`/`e105104` → `CANCELLED` (fato do fisco, sem chamar `cancelar`); `e105102` com
    `chSubstituta` desconhecida → `CANCELLED` + pendência `substituida_fora_do_luminaris`. Testável: `NullEmissor`
    programado com cada evento.
19. **[cond:F-EVT-5]** **Cancelamento em voo.** `CancelResult PROCESSING` grava `cancelRequestedAt` (fecha L5) e
    devolve 202; o item 18 conclui. Um 2º pedido com `cancelRequestedAt` presente → 409 `DFE_CANCEL_EM_ANDAMENTO`.

### PR-3 — análise fiscal (só se F-EVT-4 (b))

20. **[cond:F-EVT-4]** Status novo `CANCEL_ANALYSIS` (`AUTHORIZED* → CANCEL_ANALYSIS → CANCELLED | AUTHORIZED*`);
    `POST …/:id/cancelar { …, analiseFiscal: true }` quando a porta devolve `OUT_OF_WINDOW` e o operador confirma
    (espelho do Guia §5.3); desfecho por `e105104` (deferido) / `e105105` (indeferido) via item 18. Modo manual: a
    prova segue o desfecho do **F-FE-DFE-9** (o portal só mostra eventos em HTML, Guia §5.1 p. 80). Guarda E0068 no
    item 11. Pendência `cancelamento_em_analise`.

---

## 4. Contratos (esboço materializável)

```prisma
model FiscalProfile {
  // … campos atuais …
  cancelPrazoDias  Int?    // F-EVT-1: parâmetro do município (Anexo II RN E0822, nível 3); null = desconhecido
  substPrazoDias   Int?    // F-EVT-1: parâmetro do município (Anexo I RN E0050, nível 3); ≤ 730 (Anexo I [114])
  prazoFonte       String? // onde o operador achou o número (link/norma municipal)
}

model FiscalDocument {
  // … campos atuais …
  nfseDhProc              DateTime? // infNFSe/dhProc [19] — base da janela (F-EVT-2)
  substitutesDocumentId   String?   // esta é a substituta de …
  substitutedByDocumentId String?   // esta foi substituída por …
  substMotivo             String?   // TSCodJustSubst 01|02|03|04|05|99 — domínio ≠ cancelMotivo (TSCodJustCanc 1|2|9)
  substReason             String?   // xMotivo 15–255
  cancelEventAttachmentId String?   // XML do e101101 (item 7)
  cancelRequestedAt       DateTime? // PR-2, item 19
  @@index([userId, unitId, substitutesDocumentId])
}
// status ganha CANCEL_ANALYSIS só se F-EVT-4 (b)
```

```ts
// dtos/DpsPayloadDto.ts — dentro de infDPS
const SubstSchema = z.object({
  chSubstda: z.string().regex(/^\d{50}$/),                       // TSChaveNFSe
  cMotivo: z.enum(['01', '02', '03', '04', '05', '99']),         // XSD TSCodJustSubst (vence a planilha)
  xMotivo: z.string().min(15).max(255).optional(),               // Anexo I [116]
}).strict().superRefine((s, ctx) => {
  if (s.cMotivo === '99' && !s.xMotivo) ctx.addIssue({ code: 'custom', path: ['xMotivo'], message: 'E0078' });
});

// dtos/FiscalDocumentDto.ts
export const SubstituirFiscalDocumentSchema = z.object({
  unitId: z.string().min(1),
  cMotivo: z.enum(['01', '02', '03', '04', '05', '99']),
  xMotivo: z.string().min(15).max(255).optional(),
}).strict().superRefine(/* mesmo E0078 */);

// view
type JanelaEventos = {
  cancelarAte: string | null;      // ISO com fuso
  substituirAte: string | null;
  substituirTeto: string | null;   // base + 2 anos (Anexo I [114])
  fonte: 'perfil' | 'desconhecida';
};
// FiscalDocumentView += { janela: JanelaEventos; substitutesDocumentId: string | null;
//                         substitutedByDocumentId: string | null; substMotivo: string | null }

// dfe/DfeEmissorPort.ts
interface DfeCapabilities { /* … */ substituir: boolean; consultarEventos: boolean /* PR-2 */ }
interface EmissaoResult   { /* … */ dhProc?: string }  // item 1
/** OUT_OF_WINDOW ⇔ o fisco rejeitou com E0822 (Anexo II [28]); E0823/E0824/E0827/E0840 = REJECTED com o código. */
interface CancelResult    { status: 'CANCELLED' | 'OUT_OF_WINDOW' | 'REJECTED' | 'PROCESSING'; errors: … }
type EventoNfse =                                                              // PR-2, F-EVT-5 (b)
  | { tipo: 'e101101' | 'e305101' | 'e105104' | 'e105105' | 'e101103'; dhProc: string }
  | { tipo: 'e105102'; dhProc: string; chSubstituta: string; cMotivo: string };
// consultarEventos(chave: string): Promise<EventoNfse[]>
```

**Rota nova (1):** `POST /api/nfe/dfe/documents/:id/substituir` → 201 `FiscalDocumentView` (a substituta) ·
400 DTO · 403 policy · 409 `DFE_STATUS_INVALIDO | DFE_SUBSTITUICAO_EXISTENTE | DFE_SUBST_FORA_DO_TETO |
DFE_SUBST_NAO_SUPORTADA` · 422 `substituicao_bloqueada` (E0060/E0061).

**Audit novo (1):** `dfe.substituted: ['documentId', 'substituteDocumentId', 'cMotivo']` — sem PII.

---

## 5. Forks — RATIFICAÇÃO PENDENTE (nenhum decidido aqui)

### F-EVT-1 — De onde vem o prazo, e se ele bloqueia

Fato: E0822 e E0050 são nível 3 — o número é do município e a fonte primária não o traz (§1.2, §1.4).

- **(a)** Prazo **configurado por unidade** no `FiscalProfile`, `null` = desconhecido; a janela **informa** (view,
  aviso na resposta) e **não bloqueia**; quem recusa é o fisco, cuja rejeição E0822 vira `OUT_OF_WINDOW` (item 6).
- **(b)** Mesmo campo, mas **bloqueia** localmente (409 antes de chamar a porta / antes de mandar para o portal).
- **(c)** Sem campo: só o mapeamento E0822 → `OUT_OF_WINDOW`. "Janela" = o que o fisco disser.
- **(d)** Buscar o prazo nos parâmetros municipais do Sistema Nacional (se a API os expuser — NV, §6).
- **Recomendação: (a), com (d) medido no D5/X10i.** (b) transforma um número digitado em regra fiscal: com o campo
  errado para menos, o Luminaris impede um cancelamento que o fisco aceitaria. (c) não entrega a "janela calculada" que
  o dono pediu e deixa o modo manual sem nada antes do portal. **Custo de errar (a):** o operador vê "fora da janela" e
  o fisco aceita, ou o contrário — só aviso, nenhuma escrita errada.

### F-EVT-2 — Instante-base e contagem dos dias

Fato: o Guia §5.2 diz "prazo máximo (em dias)"; nenhuma fonte lida diz a partir de quê nem em que calendário.

- **(a)** Base = `nfseDhProc`; dias de 24 h corridos sobre o instante.
- **(b)** Base = `nfseDhProc`; dias de calendário no fuso `America/Sao_Paulo` (prazo vence às 23:59:59 do último dia).
- **(c)** Base = `dCompet` (data da prestação).
- **Recomendação: (b), rotulado "estimado" na view até a validação externa PV-2.** A geração é o único instante que
  o fisco conhece de todas as notas; (b) é a leitura mais comum de "prazo em dias" e erra no máximo um dia contra (a).
  Some-se a isso que o teto de 2 anos (item 11) usa a mesma base.

### F-EVT-3 — `@@unique` durante a substituição

Fato: a substituta é outro `FiscalDocument` para a mesma (venda, kind, cTribNac) enquanto a original está viva (L8).

- **(a)** Substituta nasce com `saleKey = subst:<originalId>:<saleId>`; na tx do item 14 a original vira
  `cancelled:<id>:<saleId>` e a substituta assume `saleId`. O unique continua fechando a corrida.
- **(b)** Tirar `saleKey` do unique e checar "um vivo" no serviço.
- **Recomendação: (a).** Mesma técnica rename-on-cancel já usada (F-DFE-16 b); (b) troca uma constraint por uma
  leitura sujeita a TOCTOU (memória `unique-de-idempotencia-x-soft-delete`, `authoritative-gate-inside-tx`).

### F-EVT-4 — Análise fiscal (`e101103` → `e105104`/`e105105`)

Fato: é o caminho oficial quando o cancelamento é recusado pelas regras (Guia §5.3); com ele pendente, nem cancelamento
direto nem substituição são aceitos (matriz [8], E0068).

- **(a)** Fora do X11: registrado como achado; reabre com o contrato da Focus em mãos.
- **(b)** Dentro, como PR-3 (item 20): status `CANCEL_ANALYSIS`, máquina via item 18; manual atado ao F-FE-DFE-9.
- **Recomendação: (b).** Resposta 13 diz "todos [os eventos], de acordo com os prazos" e o dono pediu "o que falta no
  cancelamento" — fora do prazo, a análise fiscal **é** o cancelamento possível. Custo: um status novo na máquina; por
  isso PR separado, que pode ser cortado sem mexer no PR-1.

### F-EVT-5 — Como a porta conta o que aconteceu fora do Luminaris

Fato: `EmissaoResult` não tem `CANCELLED` e a tabela de transições proíbe isso de propósito (L6).

- **(a)** Acrescentar `CANCELLED` (+ evento) ao `EmissaoResult` e liberar `AUTHORIZED → CANCELLED` em `applyResult`.
- **(b)** Método separado `consultarEventos(chave)` (item 18); `consultar`/`applyResult` ficam como estão.
- **Recomendação: (b).** Preserva a guarda de mutação da tabela de transições e separa "estado da emissão" de "eventos
  sobre a nota", que é a divisão do próprio leiaute (DPS/NFS-e × Anexo II).

### F-EVT-6 — A original já não está viva quando a substituta autoriza

Fato: entre o pedido (item 11) e a autorização, alguém pode registrar um cancelamento manual da original. Se o fisco
autorizou a substituta, a original estava viva **lá** (E0046).

- **(a)** O fato do fisco vence: a substituta autoriza; a original fica como está, ganha `substitutedByDocumentId` e a
  pendência `substituicao_sobre_cancelada` (o registro local do cancelamento está errado ou é de outra nota).
- **(b)** A autorização da substituta falha com 409 e ela fica `SENT` até alguém decidir.
- **Recomendação: (a).** (b) deixa uma nota válida no fisco sem registro no Luminaris — o defeito que o X10b inteiro
  existe para evitar.

### F-EVT-7 — Ordem: o PR-1 espera o X10i?

Fato: a nota do nó tem `depende_de: [[X10i]]`; os itens 1–17 só usam o modo manual e a porta falsa.

- **(a)** PR-1 sai sem o X10i; PR-2 e PR-3 esperam o X10i. Fold muda `depende_de` só do PR-2/3 (texto na nota).
- **(b)** Tudo espera o X10i, como está no vault.
- **Recomendação: (a).** O 1º cliente emite pelo portal enquanto não há adaptador (ADR §11.3, "o caminho é o portal
  público"); substituição e a guarda L9 servem ao modo manual hoje.

### Fork vizinho, **não reaberto aqui**: F-FE-DFE-9

Continua pendente no [`FE-INCR-DFE-brief.md`](FE-INCR-DFE-brief.md) §4. Este BRIEF **não depende** dele para a
substituição (a prova é o XML da substituta, §1.3) e depende dele só para o PR-3 no modo manual.

---

## 6. Pendente de validação externa / insumos ausentes

| # | O que falta | Quem traz | Bloqueia |
|---|---|---|---|
| PV-1 | Prazos (em dias) de cancelamento e de substituição do município do 1º cliente (São Paulo capital, Simples, emissor nacional) e se exige tomador identificado (E0824/E0056) | dono, no portal/prefeitura; ou o contador | valor do campo do item 2, não o código |
| PV-2 | Instante-base e calendário da contagem (F-EVT-2) | prefeitura / contador / suporte do portal | o rótulo "estimado" |
| PV-3 | Contrato da Focus para cancelar NFS-e nacional, substituir (se aceita o grupo `subst`) e consultar eventos; como ela expõe o E0822 | gate D5 / BRIEF do X10i | PR-2 |
| PV-4 | O portal grava `subst` na DPS embutida do XML da substituta (I, §1.3) | passo no `RUNBOOK-H2-DFE-MANUAL` | item 13 (guarda (i)) |
| IA-1 | Manual da API do emissor público (`nfse-manual-emissor`, MANIFEST) — se há endpoint de parâmetros municipais com prazos — **não lido** | download autorizado + leitura | F-EVT-1 (d) |
| IA-2 | Anexo IV do ADN (consulta de eventos por chave) — não está no corpus local | download | PR-2 sem parceiro |

---

## 7. Fronteira com o X10a (eventos de NF-e/NFC-e) — explícita

| Fica no X11 (este BRIEF) | Vai para o X10a |
|---|---|
| NFS-e nacional: `e101101`, substituição via DPS com `subst` → `e105102`, análise fiscal `e101103`/`e105104`/`e105105` (F-EVT-4), consulta de eventos da NFS-e | NF-e 55 / NFC-e 65: cancelamento (`110111`), **carta de correção** (`110110`), cancelamento por substituição da NFC-e, inutilização de faixa |
| Prazo por **parâmetro municipal** (E0822/E0050) | Prazo do **MOC 7.0** (SEFAZ) — não lido nesta sessão |
| Campos novos em `FiscalDocument` são genéricos (`substitutes*`, `cancelEventAttachmentId`, `cancelRequestedAt`) e o X10a **pode** reusar | Decidir se reusa é do BRIEF do X10a |
| `DfeCapabilities.substituir`/`consultarEventos` são da porta (genérica por `kind`) | O adaptador NF-e declara as suas |

Regra para quem implementar: nenhum item deste BRIEF aceita `kind = 'NFE'`; a rota `substituir` recusa NF-e com 409
`DFE_SUBST_NAO_SUPORTADA` (NF-e não tem substituição neste sentido — **I**, MOC não lido).

---

## 8. Achados fora de escopo (não planejados)

1. **Cancelamento/bloqueio por ofício** (`e305101`–`e305103`, Anexo II [15]–[17]): a prefeitura cancela ou trava
   eventos sem o Luminaris saber. O item 18 **vê** o cancelamento por ofício; bloqueio/desbloqueio fica fora.
2. **Manifestação do tomador** (`e203206` rejeição etc., Anexo II [7]–[14]): é a origem do `cMotivo 05` da substituição
   e trava a substituição se houver confirmação (E0070/E0072). Exige consulta de eventos (PR-2) e talvez tela.
3. **FE:** a instrução fixa do `FE-INCR-DFE` item 23 ("no portal use Cancelar, não Substituir", G11) fica falsa quando o
   PR-1 entrar — a tela ganha "Substituir" e a instrução muda. Nó vizinho `FE-INCR-DFE`.
4. **E0827/E0074 "tributos recolhidos"**: a própria planilha marca E0074 como "Aguarda para Implementar no Contexto do
   MAN" — regra do fisco ainda não ligada; nada a fazer agora.
5. **GAP-MAP "cancelar usa o ambiente do env"** continua aberto e morde o item 5/18 por máquina — já registrado, não
   replanejado.

---

## 9. Autoverificação (OPS-001) e vieses

1. **Objetivo sob a letra:** o dono quer "janela calculada" para o 409 deixar de ser ficção. A fonte mostra que o
   número não é nacional — o BRIEF responde com o que dá para calcular (teto de 2 anos, janela a partir de um prazo
   configurado) e põe a origem do número no F-EVT-1, em vez de inventar um prazo.
2. **Grau:** §1 é V linha a linha (planilha/XSD/guia com hash); a prova manual da substituição é I (PV-4); o
   comportamento da Focus é NV (PV-3).
3. **Caso adversarial tentado:** "o prazo de cancelamento é 24 h / 30 dias" — procurei número em todas as linhas de RN
   do Anexo II e no grupo `subst` do Anexo I: só "2 anos" ([114]) e "em dias" (Guia). Também tentei derrubar "a
   substituição tem prova em XML": o Guia §5.1 diz que **eventos** só saem em HTML, mas a substituta é **NFS-e**, cujo
   download em XML está no §5 (p. 79) — a conclusão sobreviveu, com o resíduo PV-4.
4. **Checagem que teria falhado:** sha256 das 4 fontes contra o MANIFEST (bateram); `grep subst` em `DpsPayloadDto.ts`,
   `lib/nfse.ts`, `EmissionService.ts` (zero ocorrência — confirma L7/L9); `OUT_OF_WINDOW` em `src/` fora do serviço só
   no tipo e no teste (confirma L1); `node scripts/plano-vault.mjs check` no fold.
5. **Não lido:** o MOC 7.0 (fronteira X10a), o manual da API do emissor público (IA-1), o Anexo IV do ADN (IA-2), a doc
   da Focus para cancelamento (PV-3).

**Vieses (T8):** as recomendações de F-EVT-1 e F-EVT-5 escolhem o desenho que não bloqueia e não mexe na tabela de
transições — o menor risco de escrita errada, que também é o menor diff; o dono prefere completude, por isso F-EVT-4
recomenda incluir a análise fiscal. O item 12 transforma regras nível 2 em bloqueio local: se eu tiver lido errado o
escopo do E0061 (ex.: "identificação do tomador" incluir nome), o bloqueio sai mais frouxo que o fisco, nunca mais duro.
