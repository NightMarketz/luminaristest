# BE-INCR-CRC-CFC-FOLLOWUPS — os 6 achados fora de escopo do GAP-MAP 15

## 0. Cabeçalho

- **Nó do vault:** `docs/plano/nos/CRC-CFC.md` (onda 1b da ordem em `docs/plano/decisoes/D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM.md`).

- **Item a planejar:** os 6 "Achados fora de escopo" da correção do GAP-MAP 15 (CRC-CFC, 28/09/2026,
  branch `claude/busy-curran-1c0f23`): (A1) regex aceita `/T-` como categoria; (A2) provisório
  `/P-` recusado; (A3) grafias `1SP123456`/`SP1234567` recusadas; (A4) `IND_CRC` da ECF 0930 sem
  máscara; (A5) `reviewerCrc` herda a regex sem teste; (A6) openapi/mensagens citam só `UF-NNNNNN/O-D`.
- **Autorização:** dono, chat 28/09/2026 — *"Planeje o que estava fora do escopo e pesquise as melhores
  soluções"*. Cobre exatamente A1–A6. **Não** autoriza implementação: forks abaixo são PENDENTES.
- **Pré-requisito:** a correção do GAP-MAP 15 (sufixo ` T-UF`/` S-UF`, `crcNumberUfs`) precisa estar
  mergeada antes — este BRIEF parte dela (`AccountingContact.model.ts:57-83` do worktree).
- **Escopo:** backend + docs. O ajuste de FE do item 4 é nó vizinho (§7).
- **Sessão executora:** `sessao-feature` sobre este BRIEF, depois dos forks ratificados.

## 1. Fatos (grau: verificado = executado nesta sessão · lido = leitura de código/documento · pesquisado = fonte externa)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| N1 | Composição oficial do número: `UF-` + 6 dígitos + `/` + letra do tipo + `-` + dígito verificador; tipo `O` (originário) ou `P` (provisório); transferido/secundário = sufixo ` T-UF`/` S-UF`. **`T` nunca ocupa o lugar do `O`** | Manual de Registro do Sistema CFC/CRCs 2ª ed., pp. 13-14 (texto extraído do PDF nesta sessão) | pesquisado |
| N2 | Res. CFC 1.494/2015 (vigente, revogou a 1.389/2012) só tem registro **Originário** e **Transferido** (art. 3º); art. 5º: transferido = número originário + `T` + sigla do CRC de destino; art. 36: provisórios emitidos até nov/2014, válidos até dez/2016, **deveriam virar originários** | LegisWeb id 310535 | pesquisado |
| N3 | O dígito verificador é "calculado de forma automatizada pelo sistema de cadastro" — **o algoritmo não é publicado** | Manual CFC p. 13 | pesquisado |
| N4 | Grafias de mercado: CRC-SP manda identificar-se com o "código CRC 1SP"; ERPs usam `UFNNNNNNN` (Domínio/Calima, ex. `SP1234567` = 6 dígitos + DV); CadSinc/RFB mostra `1SP999999/P1`; os manuais ECD/ECF exemplificam `1SP123456` (sem DV) | crcsp.org.br dúvidas frequentes; ajuda Calima; Receita CadSinc "Tipo CRC"; transcrição C12 §5.4 | pesquisado |
| N5 | O PVA **não** valida formato do `IND_CRC` (só obrigatoriedade quando `900`) — a máscara é escolha da casa (F-C12-3), o oráculo dela é o CFC, não o PVA | transcrição C12 §1.5/§5.4 | lido |
| N6 | Existe consulta cadastral do CFC (Spiderware, entrada `UF-999999`) e API paga de terceiro (Infosimples); **não achei API pública oficial** | cfc.org.br Consulta Nacional; infosimples.com | pesquisado |
| N7 | `dev.db` real (`server/prisma/prisma/dev.db`): **0 linhas** com CRC em `accounting_contacts` e `accounting_reviews` — endurecer a máscara não tem dado legado a migrar; o app nunca foi implantado | `sqlite3` read-only nesta sessão | verificado |
| N8 | Teste existente fixa o comportamento do A1: `AccountingDeliveryDto.test.ts:72` espera `'CRC/SP 123456/T-7' → 'SP-123456/T-7'` aceito | leitura | lido |
| N9 | ECF 0930: `indCrc: z.string().optional()` sem máscara (`SpedEcfDto.ts:72`), reusado pelo DTO Real (`refineEcfSigners`/`SignerSchema`); a via do cadastro (`contactToEcf0930Signer`, `spedController.ts:143`) já emite o CRC **normalizado**; a via do corpo emite cru (`lib/ecf.ts:269`); fixture de integração usa `indCrc: '1DF123'` (`spedController.ecfReal.integration.test.ts:44`) | leitura | lido |
| N10 | O FE da ECF manda `indCrc: ''` na linha do não-contador (`SpedGenerationPanel.tsx:75-82`, `sped.service.ts:117-121` não filtra) — hoje aceito; com máscara na ECF, `''` vira 400 | leitura | lido |
| N11 | `reviewerCrc` (`AccountingReviewDto.ts:141-150`) usa `normalizeCrcNumber` + `CRC_NUMBER_RE`; os testes (`AccountingReviewDto.test.ts:92-105`) cobrem só originário | leitura | lido |
| N12 | Texto do formato em 7 pontos: `AccountingContactDto.ts:23,51,98,131`, `AccountingReviewDto.ts:132,146`, `SpedEcdDto.ts:65,71`, `docs.paths.ts:2377`; `public/openapi.json` é artefato gerado (`npm run docs:generate`) | grep | lido |

## 2. Checklist (cada item testável isoladamente; `[fork]` = só depois da ratificação)

1. **[fork F-1] Categoria só `O`** (ou `O`/`P`, conforme F-2) no grupo do tipo de `CRC_NUMBER_RE` e do
   normalizador; `SP-123456/T-7` passa a 400. Teste: `SP-123456/T-7` recusado; `SP-123456/O-3 T-MG`
   continua aceito. ERRATA na asserção de `AccountingDeliveryDto.test.ts:72` (troca o caso por um
   transferido real).
2. **[fork F-2] Provisório `/P-`:** recusado com mensagem própria citando Res. CFC 1.494/2015 art. 36
   (caminho a), em vez da mensagem genérica de formato. Teste: `TO-654321/P-8` → 400 com essa mensagem.
3. **[fork F-3] Grafia compacta:** `SP1234567` e `1SP1234567` (6 dígitos + DV, sem letra de tipo)
   normalizam para `SP-123456/O-7`; `1SP123456` (sem DV) segue 400, **com dica na mensagem**: "informe o
   dígito verificador — ex.: SP-123456/O-7 (o número está na carteira/certidão do CRC)". Teste: os três
   casos + `SP12345678` (8 dígitos) recusado.
4. **[fork F-4] ECF 0930 `indCrc` com a máscara do J930** (`crcNumberField` exportado de `SpedEcdDto.ts`
   e reusado no `SignerSchema` da ECF → cobre o DTO Real). Sub-fork F-4b decide o `''`. Testes: CRC
   canônico aceito e normalizado no arquivo; `1DF123` → 400; linha não-contador sem `indCrc` aceita.
   ERRATA na fixture `spedController.ecfReal.integration.test.ts:44` e na asserção de `lib/ecf.ts:489`
   se ela passar pelo DTO. Runbook §P6 ECF: a linha `indCrc` ganha o formato (edição de doc).
5. **[direto] `reviewerCrc`:** testes em `AccountingReviewDto.test.ts` — transferido
   `sp-123456/o-3 t-mg` aceito e normalizado para `SP-123456/O-3 T-MG`; após F-1, `SP-123456/T-7` → 400.
6. **[direto] Texto do formato** nos 9 pontos de N12 passa a
   `UF-NNNNNN/O-D (transferido/secundário: + " T-UF"/" S-UF")`; `npm run docs:generate` regenera
   `public/openapi.json` no mesmo commit. Sem mudança de shape.

**Gates que o diff aciona:** `cd server && npx tsc --noEmit`; suíte unit; integrações de contato/SPED
rodadas **uma a uma** (Windows: EBUSY no `test-integration.db` com várias no mesmo processo); snapshot de
shape dos DTOs (esperado inalterado — só `superRefine`/mensagens); guard de path-count do openapi
(inalterado — nenhuma rota nova).

## 3. Contratos (esboço)

```ts
// AccountingContact.model.ts — F-1 (a) + F-2 (a): só O no tipo; P reconhecido para dar mensagem própria
export const CRC_NUMBER_RE = /^([A-Z]{2})-(\d{6})\/(O)-(\d)(?: ([TS])-([A-Z]{2}))?$/;
export type CrcParse =
  | { ok: true; normalized: string }
  | { ok: false; reason: 'formato' | 'provisorio_extinto' | 'sem_dv' };
export function parseCrcNumber(value: string): CrcParse;   // normalizeCrcNumber vira wrapper: ok ? normalized : null
//   aceita: 'SP-123456/O-3', '1SP123456/O-3', 'CRC-SP 123456/O-3', 'SP-123456/O-3 T-MG',
//           F-3 (a): 'SP1234567' | '1SP1234567' → 'SP-123456/O-7'
//   recusa: '/T-' como tipo → 'formato'; '/P-' → 'provisorio_extinto'; '1SP123456' → 'sem_dv'

// SpedEcdDto.ts — exportado para a ECF reusar (mesmo objeto de domínio, F-C12-3)
export const crcNumberField: z.ZodType<string, z.ZodTypeDef, string>;

// SpedEcfDto.ts — F-4 (a) + F-4b (a)
indCrc: crcNumberField.optional(),          // F-4b (a): '' continua 400 (regra da casa); FE omite (nó vizinho)
// F-4b (b) alternativo: z.preprocess((v) => (v === '' ? undefined : v), crcNumberField.optional())
```

## 4. Forks

> **[RATIFICAÇÃO 2026-09-28 — dono, questionário]** F-1, F-2, F-3 → **(a)**. F-4/F-4b: o dono pediu
> *"pesquisa qual o padrão e a regra"* — resultado em §4.1; depois dela, **F-4 → (a)** (questionário 28/09/2026). F-4b ficou sem objeto (FE já omite o vazio).

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-1** | `/T-` no lugar do `O` | Recusar (só `O`) | Aceitar e normalizar para `O` + sufixo sem UF | Manter como está | **(a)**: N1/N2 — o CFC não emite esse formato; aceitar grava número que não existe. N7: 0 linhas no banco, app nunca implantado → sem migração. (b) inventa dado (UF de destino desconhecida) |
| **F-2** | Registro provisório `/P-` | Recusar com mensagem "provisório extinto (Res. CFC 1.494/2015 art. 36)" | Aceitar (`[OP]`) | Recusar com a mensagem genérica (hoje) | **(a)**: N2 — não deveria existir provisório válido desde 2016; mensagem específica evita o contador achar que digitou errado. (b) só se o contador trouxer caso real |
| **F-3** | Grafia compacta de mercado | Aceitar `SP1234567`/`1SP1234567` assumindo tipo `O`; `1SP123456` 400 com dica | Recusar tudo, só melhorar a mensagem | Aceitar tudo como texto livre | **(a)**: N4 — é o que o contador copia do ERP dele; com 7 dígitos o DV é inequívoco, e N2 torna `O` o único tipo vigente (a suposição cai se F-2 → b). `1SP123456` não tem DV (N3: não dá para calcular) — recusar com dica. (c) desfaz F-C12-3 |
| **F-4** | Máscara no `IND_CRC` da ECF 0930 | Mesma máscara do J930 (reuso de `crcNumberField`) | Normalizar se casar, senão passar cru | Manter sem máscara | **(a)**: a justificativa ratificada do F-C12-3 ("aceitar outro formato no DTO de geração é a divergência que a resposta 3 proíbe") vale igual para a ECF, e N9 mostra ECD e ECF emitindo o mesmo contador de formas diferentes. Risco: nenhum no PVA (N5) |
| **F-4b** | `indCrc: ''` na ECF (N10) | `''` = 400 (regra da casa, igual ao J930); FE passa a omitir — nó vizinho, **precisa entrar junto** ou a tela da ECF quebra | BE trata `''` como ausente (`preprocess`) | — | **(a) se o FE entrar no mesmo lote**, senão (b). (a) mantém uma regra só em ECD e ECF; (b) é seguro sozinho, mas abre exceção à regra |

### 4.1 Pesquisa do F-4 (28/09/2026)

- **Regra (verificado — Manual ECF Leiaute 12, ADE Cofis 02/2026, atualização abril/2026, pp. 103-105,
  baixado de `sped.rfb.gov.br` nesta sessão):** `IND_CRC` = campo 5, tipo C, **sem tamanho, sem valores
  válidos, obrigatório "Não"**. Única regra: `REGRA_OBRIGATORIO_CONTADOR` — obrigatório quando
  `IDENT_QUALIF = 900` (erro). **Não há regra de formato** nem regra que exija vazio no não-contador.
  Exemplo oficial: `|0930|FULANO BELTRANO|12345678900|900|1SP123456|…|`.
- **Padrão de mercado (pesquisado):** texto livre; ERPs gravam `SP1234567`/`1SP…` (N4).
- **Consequência:** a máscara na ECF é **escolha da casa** (coerência com F-C12-3), não exigência do
  leiaute — o PVA aceita qualquer texto. O exemplo oficial `1SP123456` seria recusado por falta de DV.
- **F-4b resolvido pela execução:** a tela da ECF já não manda `indCrc: ''` (`toEcfSignersPayload`,
  28/09) — os dois caminhos do F-4b deixam de quebrar a tela.

## 5. Pendente de validação externa

- **UF do CRC de um transferido** (origem × destino): hoje aceita os dois (decisão do dono 28/09). Quem
  fecha é o contador (qual UF ele declara no SPED) — pergunta para o pacote do `luminaris-contador-liaison`.
- **F-3:** confirmar com um contador real que `SP1234567` (formato do ERP dele) é mesmo 6 dígitos + DV, e
  não 7 dígitos de ordem. N4 é de documentação de ERP, não do CFC.

## 6. Insumos ausentes

- Algoritmo do dígito verificador do CFC (N3) — sem ele não se valida o DV; nenhum comportamento deste
  BRIEF depende dele.
- Texto do Manual ECD L9 sobre `UF_CRC` para registro transferido — a transcrição só tem "UF que expediu o CRC".

## 6.1 Status de execução (28/09/2026, branch `claude/busy-curran-1c0f23`)

| Item | Status | Teste |
|---|---|---|
| 1 (F-1) | ✅ `CRC_NUMBER_RE` só `O`; ERRATA `AccountingDeliveryDto.test.ts` | `crcNumberCfc.test.ts` "item 1" |
| 2 (F-2) | ✅ `parseCrcNumber` → `provisorio_extinto`, mensagem cita a Res. 1.494 art. 36 | "item 2" |
| 3 (F-3) | ✅ compacta → `O`; `sem_dv` com dica | "item 3" |
| 4 (F-4) | ✅ `crcNumberFieldFor('0930')` no `SignerSchema` da ECF (cobre o DTO Real); fixture de integração `1DF123` → `DF-123456/O-1` | `SpedEcfDto.test.ts` "IND_CRC do 0930 passa pela máscara CFC…" |
| 5 | ✅ | `AccountingReviewDto.test.ts` "transferido é aceito…" |
| 6 | ✅ textos + `public/openapi.json` regenerado | — |
| §7 FE | ✅ `toEcfSignersPayload` nas duas telas da ECF | `SpedGenerationPanel.test.tsx` "toEcfSignersPayload" |
| §7 runbook | ✅ aviso `REGRA_ADVERTENCIA_CONTADOR`; ECF: tabela de 17 códigos, CPF/CNPJ, `indCrc` | — |
| §7 CFC | 📝 planejado em `BE-INCR-CRC-CFC-VALIDACAO-brief.md` | — |

## 7. Achados fora de escopo (não planejados)

- **Nó vizinho FE (F-4b = a):** `emptyEcfSigner`/submit da ECF (`SpedGenerationPanel.tsx:75-82`)
  omitir `indCrc` vazio — mesma técnica que o `FE-FIX-SPED-ECD-SIGNERS` (branch
  `claude/fe-dto-asymmetry-scan-fb5c0a`) aplica ao J930. Exige autorização própria.
- **Validação contra o cadastro do CFC** (N6): conferir se o CRC existe e está ativo seria a solução
  mais forte, mas depende de serviço externo (terceiro pago ou raspagem do Spiderware) e decisão de
  LGPD — frente nova.
- **Aviso do PVA `REGRA_ADVERTENCIA_CONTADOR`** (`900` sem `numSeqCrc`/`dtCrc`, transcrição C12 §6.1):
  o runbook J930 não alerta que deixá-los em branco gera aviso.
- **Runbook §P6 ECF:** `identQualif` descrito como "3 dígitos" em vez da tabela de 17 códigos (sem
  `001`/`940`); CNPJ descrito como "14 dígitos" nas tabelas de declarante (é alfanumérico desde #280).

## Fontes

- Manual de Registro do Sistema CFC/CRCs 2ª ed. — https://cfc.org.br/wp-content/uploads/2018/04/1_manual_registro.pdf
- Res. CFC 1.494/2015 — https://www.legisweb.com.br/legislacao/?id=310535
- Receita, CadSinc "Tipo CRC" — https://www38.receita.fazenda.gov.br/cadsincnac/jsp/coleta/ajuda/topicos/Tipo_CRC.htm
- CRC-SP, dúvidas frequentes — https://crcsp.org.br/portal/home/duvidas-frequentes.htm
- Calima, erro IND_CRC J930 — https://ajuda.calimaerp.com/pt/article/como-corrigir-o-erro-indcrc-no-registro-j930-da-ecd-qdeh69/
- CFC Consulta Nacional — https://www3.cfc.org.br/Spw/ConsultaNacional/ConsultaCadastralCFC.aspx
- Infosimples, API CFC — https://infosimples.com/consultas/cfc-cadastro/
