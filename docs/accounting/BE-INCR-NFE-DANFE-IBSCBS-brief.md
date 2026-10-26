# BE-INCR-NFE-DANFE-IBSCBS — BRIEF (nó NFE-DANFE-IBSCBS)

> **Sessão:** `sessao-planejamento` (agente), 2026-10-22, base `origin/main` `65e1dd6b`. Saída = este documento, o dossiê
> legal [`pesquisas-legais/nfe-danfe-ibscbs-nt2026010/`](../../pesquisas-legais/nfe-danfe-ibscbs-nt2026010/relatorio.md)
> e o fold da nota do nó. **Sem código, sem `executa`, sem merge.** Nenhum fork ratificado aqui.

> **RATIFICAÇÃO 22/10/2026** ([[D-2026-10-22-NFE-DANFE-IBSCBS-FORKS]]; dono, chat, 2026-10-22: "Dispara 1 pra ratificar os forks", respostas no
> AskUserQuestion): F-DANFE-1 (a), 2 (a), 3 (b), **4 (b) — contra a recomendação** (biblioteca de código de barras em vez
> de encoder próprio: o item 13 e o contrato `lib/danfe/code128.ts` passam a usar dependência nova; o nome do pacote vai
> no PR-2 e a simbologia continua a do MOC, item 2), 5 (a), 6 (a), 7 (a, condicionado), 8 (b). **Não é `executa`.**

## TLDR (2 linhas)

A NT 2026.010 muda **só o DANFE da NF-e modelo 55** (bloco "Total do IBS/CBS/IS", CRT no emitente, IBS UF/IBS Mun/CBS/IS
por item) com **produção em 01/12/2026, sem fase de teste**. O Luminaris **não tem DANFE nenhum hoje**, então o nó é um
DANFE 55 inteiro já no leiaute novo. Quatro PRs (PR-0..PR-3) rodam sobre fixture, sem o emissor do X10a, e cabem antes do prazo.
**Risco principal:** o leiaute base (posições, código de barras, texto de homologação) está no MOC, que não foi lido
nesta sessão (insumo ausente 1). Os itens 10, 13 e 14 ficam condicionados ao PR-0. E o DANFE **NFC-e** fica fora: a NT não trata
dele e o F-NFCE-E1-6 (b), ratificado em 13/10, já o pôs no BRIEF de FE (F-DANFE-2).

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `NFE-DANFE-IBSCBS`, [`docs/plano/nos/NFE-DANFE-IBSCBS.md`](../plano/nos/NFE-DANFE-IBSCBS.md)
  (régua F, seção F1 "Prazo legal" de [`FILA-ORDEM.md`](../plano/FILA-ORDEM.md):89).
- **Autorização:** dono, chat, 2026-10-22 (repassada pela sessão de origem): *"Precisamos agora de sessões para a falta
  de brief"*. Limite: só o BRIEF; só docs; sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** cobre exatamente o BRIEF deste nó. Divergência registrada: o campo `autorizacao` da nota
    (17/10) diz "sem BRIEF". **Este é o pedido que faltava.** O fold (§10) acrescenta a citação de 22/10 ao campo e não
    autoriza código.
- **Insumos (fato consumado):**
  - NT 2026.010 v1.00, lida no Portal da NF-e em 22/10. O sha256 `eadc5246…b8f484` é igual ao do dossiê de 17/10 ([D03]
    do dossiê novo).
  - Aj. SINIEF 07/05 cl. 9ª, compilado do CONFAZ ([D01]).
  - Parser `server/src/lib/nfe.ts` (IBS-CBS-2027 PR-1). Lê do grupo UB12 só `CST`, `cClassTrib`, `vBC`, `vIBS` (UB54a) e
    `vCBS`, e do total só W34 `vIBS`/`vCBS` e W60 `vNFTot` (`nfe.ts:77-91`, `:251-275`). Não lê IBS UF/Mun, alíquotas,
    `gRed`, IS nem monofasia.
  - `lib/pdf.ts` (`htmlToPdf`: um Chromium compartilhado, A4, margens fixas) e o padrão HTML puro + teste unitário de
    `lib/receiptHtml.ts` (`escapeHtml`, `centsToBRL`) e `lib/packageSaleReceiptHtml.ts`, consumidos por
    `ReceiptService.ts:76`.
  - `FiscalDocument` (`schema.prisma:1924`): `kind` `NFSE|NFE`, `xmlAttachmentId`, `pdfAttachmentId`, `status`
    `AUTHORIZED|AUTHORIZED_DIVERGENT|…`.
  - Rotas `server/src/routes/dfe.ts:33-50` (`/dfe/documents/:id/ficha` é o molde de leitura por id).
  - X10a: EMENDA-1 E-5 (o XML guardado é o `nfeProc`) e E-10 (releitura pelo `parseNfe`); EMENDA-2 §2 (E1-6 (b): o BE
    entrega chave/QR/URL e o DANFE NFC-e é do BRIEF de FE); EMENDA-3 §3 item 4 (inventário de NTs).
- **Nós vizinhos:**
  - **Consome:** o `nfeProc` autorizado de NF-e 55, que o X10a produz (PR-7, travado pelo transporte/PSC) e que hoje
    existe só como fixture. Consome também o parser NF-e e o `lib/pdf`.
  - **É consumido por:** um nó de FE (botão "Baixar DANFE"), que ainda não existe (§9).
  - **IBS-CBS-2027** (PR-1..3 em `main`): este BRIEF **não** muda a apuração nem os créditos. Só lê o XML.

**Verificação legal** (método do CLAUDE.md): o acervo `ctresb/leis` não cobre NT do Portal nem Ajuste SINIEF. Os dois
vieram da fonte oficial (CONFAZ e Portal NF-e), com SHA-256 no manifest. Conclusão, fundamentação, vigência e lacunas
estão no [relatório do dossiê](../../pesquisas-legais/nfe-danfe-ibscbs-nt2026010/relatorio.md). As chaves `[Dnn]` abaixo
são desse dossiê.

**Fronteira (STOP do CLAUDE.md):** documento que a lei desenha igual para todos e que se deriva do XML autorizado.
Não é DynamicTable e não tem tabela nova: é uma **leitura pura** (lib) + serviço + rota de leitura. Nada toca
`DynamicTableService`, `RuleContext` ou plugin.

**PRE-ADR:** não é necessário. O desenho reusa `lib/pdf` e a cadeia de camadas existente, sem modelo novo, sem
dependência entre camadas nova e sem persistência. O único choque com decisão escrita é o texto do ADR-DFE §3 D1
("o DANFSe/DANFE ficam no parceiro"), que o F-NFCE-E1-1 (a) de 13/10 (emissor próprio) já tornou obsoleto. Ele vai como
fork (F-DANFE-1), e a correção do texto do ADR fica como achado (§9 item 1).

## 1. O que a norma exige (fonte: [D03] NT 2026.010 v1.00; [D01] Aj. SINIEF 07/05 cl. 9ª)

| Chave | Regra | Onde | Grau |
|---|---|---|---|
| `[DANFE-BASE]` | DANFE "conforme leiaute estabelecido no MOC"; só após a Autorização de Uso; protocolo impresso; A4 a ofício 2; código de barras "conforme padrão estabelecido no MOC" | [D01] cl. 9ª caput, §§1º, 1º-A, 4º, 5º | V |
| `[NT10-PROD]` | produção **01/12/2026**; teste: "-" (sem fase de teste) | [D03] p. 3 | V |
| `[NT10-MOD55]` | aplica-se à "representação em papel (e em PDF) da NF-e"; modelos de referência só "Modelo55" (vertical = principal; horizontal = alternativo) | [D03] §1, §3, §5 | V |
| `[NT10-TOT]` | bloco "Total do IBS/CBS/IS" imediatamente após "Total do ICMS/IPI": vCBS W56, vIBSUF W41, vIBSMun W46, vIS W33, vIBSMono W58, vCBSMono W59, vIBSMonoReten W59a, vCBSMonoReten W59b | [D03] §4.1 | V |
| `[NT10-EMIT]` | quadro do emitente: CRT C21; "Tipo de Regime de Apuração do IBS e da CBS" com tag "a ser publicada em NT futura" — "Campo reservado. Não imprimir conteúdo" | [D03] §4.2, §4.4 | V |
| `[NT10-ITEM]` | itens: cClassTrib UB14, vBC UB16, pIBSUF UB18 / vIBSUF UB35, pIBSMun UB37 / vIBSMun UB54, pCBS UB56 / vCBS UB67, vBCIS UB05, pIS UB06, vIS UB11; linha `[NCM …] [cClassTrib …]` no modelo | [D03] §4.3 e p. 8 | V (a tabela do PDF sai embaralhada na extração; a correspondência foi reconstruída pela ordem das IDs e conferida no modelo da p. 8) |
| `[NT10-ALIQ]` | com `gRed` informado (redução ou `gCompraGov`), imprime a alíquota efetiva `pAliqEfet` (UB28 IBS UF, UB47 IBS Mun, UB66 CBS); sem `gRed`, a vigente; IS sempre `pIS` | [D03] §4.3 obs. | V |
| `[NT10-FACULT]` | quadros facultativos/condicionados (canhoto, fatura, FCP, FCP-ST, DIFAL, FCP UF dest., ICMS mono ×4, IBS/CBS mono ×4, ISSQN, transporte, QR) só com a informação no XML; "não autoriza a criação, inferência ou impressão de informação inexistente no XML" | [D03] §4.4 | V |
| `[NT10-QR]` | QR Code no DANFE 55 (retrato `tpImp=1`, paisagem `tpImp=2`): "Em breve, será publicada alteração específica" | [D03] §4.5 | V |

## 2. Fatiamento — cada PR com `executa` próprio

**Prazo legal: 01/12/2026** (`[NT10-PROD]`). Hoje (22/10) faltam 40 dias. O prazo só obriga o Luminaris quando ele
autorizar NF-e 55 em produção, e o emissor (X10a PR-7) está travado. Ainda assim, **PR-0..PR-3 não dependem do X10a**:
rodam sobre `nfeProc` de fixture e sobre um `FiscalDocument` NFE semeado. Assim o DANFE fica pronto antes de existir a
primeira NF-e 55. Há uma condição: se o X10a PR-7 entrar em produção antes de 01/12/2026, o F-DANFE-7 volta ao dono.

| PR | Itens | Depende | Alvo |
|---|---|---|---|
| PR-0 (docs) | 1, 2, 3 | — | até **06/11/2026** |
| PR-1 leitura (lib pura) | 4–10 | PR-0 (o item 10 depende do item 2) · F-DANFE-3 | até **16/11/2026** |
| PR-2 render (lib pura + `htmlToPdf`) | 11–16 | PR-1 · F-DANFE-4, 6, 8 (os itens 13 e 14 dependem do item 2) | até **24/11/2026** |
| PR-3 superfície (serviço, rota, gates) | 17–21 | PR-2 · F-DANFE-1, 2, 5 | até **30/11/2026** (véspera do `[NT10-PROD]`) |
| — produção | primeiro DANFE de NF-e 55 real | X10a PR-7 + `executa` da emissão real + sign-off humano na tela | runbook, fora deste BRIEF |

## 3. Checklist numerado (cada item = ≥ 1 teste)

### PR-0 — fonte e transcrição (docs, sem código)

1. **Registrar a NT 2026.010 v1.00** em `docs/accounting/fontes-oficiais/MANIFEST.md` (URL `conteudo=ugn4MYF5PLg=`,
   sha256 `eadc5246…`, acesso 22/10/2026) e transcrever as tabelas §4.1–§4.4 em
   `fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-<data>.md`, com uma linha por campo (rótulo impresso, tag, ID, condição).
   *Teste:* o SHA-256 do PDF baixado de novo é igual; a transcrição tem 8 linhas de total (§4.1), 2 de emitente (§4.2),
   11 campos impressos de item com 14 tags (§4.3, contando as 3 `pAliqEfet`) e a lista de facultativos (§4.4) completa.
   *(Emenda 26/10, L-DANFE-PR0-1 → "Corrigir para 11/14", [[D-2026-10-26-NFE-DANFE-IBSCBS-LACUNAS-PR0]]; o texto anterior dizia "12 de item".)*
2. **Transcrever do MOC** (7.0 Visão Geral, ou a versão online do Paraná a partir de 01/11/2026, conforme EMENDA-3 §3
   item 3) o **leiaute base do DANFE**: quadros e ordem, padrão do código de barras da chave, texto obrigatório em
   homologação, regras de quebra de página e de supressão de quadros, formato de chave e protocolo.
   [insumo ausente 1] *Teste:* toda regra dos itens 10, 13 e 14 cita a seção transcrita (grep da chave `[MOC-DANFE-*]`
   no BRIEF de execução e no código).
3. **Classificar as NTs que a nota do nó manda conferir** (2026.009, 2026.006, 2026.003, 2014.001 v1.41): ler o título e o
   resumo de cada uma e registrar, por NT, se afeta o DANFE 55 e qual nó a recebe. Roteamento provável, a confirmar:
   2026.006 → IBS-CBS-2027 (F-IBS-6); 2014.001 → X10a (E1-5, EPEC fora); 2026.003 → achado §9 item 3; 2026.009 → X10a PR-0.
   *Teste:* tabela com as 4 NTs, cada uma com sha256 e destino, sem célula vazia.

### PR-1 — leitura (lib pura, sem Prisma)

4. **[F-DANFE-3]** `readNfeTree(xml)` exportado de `lib/nfe.ts`, com a mesma configuração do `XMLParser` e as mesmas
   guardas: `<!DOCTYPE` rejeitado antes do parse e a assinatura verificada primeiro (F-SIG-1 a). O `parseNfe` passa a
   usá-lo **sem mudar comportamento**.
   *Teste:* a suíte atual do `nfe.ts` continua verde sem edição; `readNfeTree` com `<!DOCTYPE` ⇒ `ValidationError`; com
   assinatura adulterada ⇒ erro.
5. **`readDanfeModel(xml): DanfeModel`** (`lib/danfe/danfeModel.ts`). Gates: `mod` 55, `cStat ∈ {100,150}` e chave igual ao
   `protNFe` (os mesmos do `parseNfe`). `tpAmb=2` é aceito e marca `ambiente: 'homologacao'`, para o item 14.
   *Teste:* `mod` 65 ⇒ `ValidationError` com código `DANFE_MODELO_NAO_SUPORTADO`; `cStat` 110 ⇒ erro; sem `protNFe` ⇒ erro.
6. **Totais IBS/CBS/IS** `[NT10-TOT]`: os 8 campos W56, W41, W46, W33, W58, W59, W59a e W59b como `bigint | null`,
   com o dinheiro por aritmética de string (mesma regra de `moneyToBigCentsOpt`).
   *Teste:* fixture com `IBSCBSTot` completo + `ISTot` + `gMono` ⇒ os 8 valores; fixture sem os grupos ⇒ os 8 `null`
   (nunca `0n`); `"1234.5"` ⇒ `123450n`.
7. **Item: IBS/CBS** `[NT10-ITEM]` `[NT10-ALIQ]`: `cClassTrib`, `vBC`, `vIBSUF`, `vIBSMun`, `vCBS` e, por tributo,
   `{ aliquota: string, origem: 'EFETIVA' | 'VIGENTE' }`. Com `gIBSUF/gRed` presente ⇒ `pAliqEfet` (UB28), senão
   `pIBSUF` (UB18). O mesmo vale para Mun (UB47/UB37) e CBS (UB66/UB56). A alíquota é string crua, com as casas do XML.
   *Teste:* 3 fixtures — sem `gRed` ⇒ `VIGENTE` com `pIBSUF`; `gRed` só na CBS ⇒ CBS `EFETIVA` e as outras `VIGENTE`;
   `gCompraGov` com `gRed` ⇒ as três `EFETIVA`.
8. **Item: IS** `[NT10-ITEM]`: `vBCIS` (UB05), `pIS` (UB06) e `vIS` (UB11). Sem o grupo IS ⇒ `is: null`.
   *Teste:* com e sem o grupo.
9. **Emitente** `[NT10-EMIT]`: `crt` impresso como código + descrição (1 Simples Nacional, 2 Simples excesso de
   sublimite, 3 Regime Normal, 4 MEI, conforme o comentário de `nfe.ts:47`). `tipoRegimeApuracaoIbsCbs` tem o **tipo
   literal `null`** até a NT futura.
   *Teste:* CRT 3 ⇒ `"3 - REGIME NORMAL"`; o tipo TS não aceita string (teste de tipo `@ts-expect-error`).
10. **Campos base e facultativos** `[NT10-FACULT]` [cond: item 2]: ide, emitente e destinatário com endereço, IE-ST,
    protocolo, fatura/duplicatas, ICMS/IPI com FCP, FCP-ST, DIFAL, FCP UF dest. e ICMS mono ×4, ISSQN, transporte/volumes,
    `infAdic`, `infAdProd`. Tag ausente ⇒ campo `null` e quadro `null`.
    *Teste de propriedade:* para cada campo facultativo, o XML sem a tag dá `null` no model e o rótulo some do HTML
    (item 11).

### PR-2 — render (lib pura + `htmlToPdf`)

11. **`renderDanfeHtml(model): string`** (`lib/danfe/danfeHtml.ts`): retrato A4 [F-DANFE-6]. Ordem dos quadros conforme a
    p. 8 de [D03]; "Total do IBS/CBS/IS" logo depois de "Total do ICMS/IPI". Todo texto vindo do XML passa por
    `escapeHtml` (reuso de `receiptHtml.ts`). Sem `new Date()` no HTML.
    *Teste:* no HTML, a posição de `TOTAL DO ICMS / IPI` < `TOTAL DO IBS / CBS / IS` < `CÁLCULO DO ISSQN`; o mesmo model
    gera o mesmo HTML byte a byte em 2 chamadas; `xProd` = `<script>` sai escapado.
    *(Emenda 26/10, L-DANFE-PR0-3 → "Texto da NT 2026.010":)* abaixo da chave, o campo de consulta imprime *"Consulte a
    autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ autorizadora"* (modelo da NT,
    p. 8; `[MOC-DANFE-CAMPO1]`). *Teste:* o HTML contém esse texto literal.
12. **Linha de item com IBS/CBS/IS** (modelo da p. 8): colunas de bases (ICMS, IBS/CBS, IS, IPI), alíquotas e valores
    (ICMS/CBS, IBS UF/IPI, IBS MUN/IS) e a linha `[NCM …] [cClassTrib …]`. Item sem UB12 ⇒ as células IBS/CBS ficam vazias,
    e não "0,00".
    *Teste:* item com `gRed` imprime a `pAliqEfet`; item sem UB12 não tem `0,00` nas colunas IBS/CBS.
13. **[F-DANFE-4]** Código de barras da chave de acesso [cond: item 2] como SVG inline, gerado por função pura.
    *Teste:* vetor de teste do MOC (ou, sem vetor, decodificação ida e volta das 44 posições); entrada que não é a chave
    de 44 dígitos ⇒ erro.
14. **Homologação** [cond: item 2]: `ambiente: 'homologacao'` ⇒ o texto obrigatório do MOC em destaque.
    *Teste:* fixture `tpAmb=2` contém o texto; `tpAmb=1` não contém.
    *(Emenda 26/10, L-DANFE-PR0-2 → "Os dois", [[D-2026-10-26-NFE-DANFE-IBSCBS-LACUNAS-PR0]]:)* a frase **"SEM VALOR FISCAL"**
    (`[MOC-DANFE-HOMOLOG]`) sai como marca d'água destacada **e** no início de "Informações Complementares"; a marca não cobre
    a leitura dos dados (`[MOC-DANFE-MARCA-DAGUA]`). *Teste:* com `tpAmb=2` o HTML tem as duas ocorrências; com `tpAmb=1`, nenhuma.
15. **[F-DANFE-8]** QR Code: a área "QR CODE" do modelo fica vazia até a NT do `[NT10-QR]`. Com `infNFeSupl/qrCode`
    no XML, o model leva o aviso `QRCODE_NAO_RENDERIZADO`, que fica fora do HTML.
    *Teste:* fixture com `infNFeSupl` ⇒ área vazia e aviso presente.
16. **`htmlToPdf(html, opts?)`**: parâmetro opcional `{ margin }`. O padrão atual não muda.
    *Teste:* os chamadores atuais (`ReceiptService`, `PackageAcceptanceService`) continuam sem argumento novo; com
    `margin` o PDF sai (`%PDF` nos 4 primeiros bytes). Teste de integração com Chromium, só onde a suíte já usa `htmlToPdf`.

### PR-3 — superfície (cadeia Route → Controller → Service → Repository, + Policy)

17. **[F-DANFE-5]** `DanfeService.gerar(scope, fiscalDocumentId) → { buffer, fileName, mimeType }`, no molde de
    `ReceiptService`. Busca o `FiscalDocument` pelo repositório com escopo. Exige `kind === 'NFE'` e `status ∈
    {AUTHORIZED, AUTHORIZED_DIVERGENT}`. Lê o anexo `xmlAttachmentId` e chama `readDanfeModel` → `renderDanfeHtml` →
    `htmlToPdf`. **Não grava nada** (sob demanda).
    *Teste:* id de outro tenant ⇒ `NotFoundError`; `kind` NFSE ⇒ 422 `DANFE_SO_NFE`; `kind` NFCE (quando existir) ⇒ 422
    `DANFE_NFCE_NO_FE` (F-NFCE-E1-6 b); `REJECTED`/`SENT`/`CANCELLED` ⇒ 409 `DANFE_DOCUMENTO_NAO_AUTORIZADO`; sem
    `xmlAttachmentId` ⇒ 409 nomeado.
18. **Invariante de origem** (I1): o DANFE sai só do XML. *Teste:* com `vServCents` alterado no `FiscalDocument` semeado,
    o HTML gerado é idêntico.
19. **Controller + rota `GET /dfe/documents/:id/danfe`** em `routes/dfe.ts` (ao lado de `/ficha`): params por DTO Zod
    `.strict()`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="danfe-<chave>.pdf"`. A
    policy é a mesma da leitura `getFiscalDocument`.
    *Teste (supertest):* 200 com `%PDF`; sem auth ⇒ 401; usuário sem permissão de leitura fiscal ⇒ 403.
20. **Factory**: `getDanfeService()` no factory, como `getReceiptService()`. *Teste:* o teste de wiring do factory
    resolve a instância.
21. **Gates do diff:** path novo em `server/src/routes/docs/` + guard de path-count do openapi; snapshot de shape do DTO
    de params; códigos de erro novos com paridade i18n pt/en, se chegarem ao FE; **nenhum `eventType` de auditoria** (é
    leitura; a allowlist de `auditCanonical.ts` não muda); `npm run check:arch` sem violação nova; `tsc --noEmit` limpo.
    *Teste:* os próprios gates.

## 4. Contratos esboçados

```ts
// lib/nfe.ts — F-DANFE-3 (b)
export function readNfeTree(input: string | Buffer, opts?: { allowHomologacao?: boolean }): NfeTree; // XXE + assinatura
// parseNfe(input, legais, options) passa a chamar readNfeTree; assinatura pública inalterada.

// lib/danfe/danfeModel.ts
type BigCents = bigint | null;               // ausente ≠ zero (I2)
type Aliq = { aliquota: string; origem: 'EFETIVA' | 'VIGENTE' } | null; // string crua do XML (I6)

export interface DanfeTotaisIbsCbsIs {        // [NT10-TOT]
  vCBS: BigCents; vIBSUF: BigCents; vIBSMun: BigCents; vIS: BigCents;
  vIBSMono: BigCents; vCBSMono: BigCents; vIBSMonoReten: BigCents; vCBSMonoReten: BigCents;
}
export interface DanfeItemIbsCbs {            // [NT10-ITEM] [NT10-ALIQ]
  cClassTrib: string; vBC: BigCents;
  ibsUf: { aliq: Aliq; valor: BigCents }; ibsMun: { aliq: Aliq; valor: BigCents }; cbs: { aliq: Aliq; valor: BigCents };
}
export interface DanfeItem {
  nItem: number; cProd: string; xProd: string; ncm: string; cstOuCsosn: string; cfop: string;
  uCom: string; qCom: string; vUnCom: string; vProd: BigCents;
  icms: { vBC: BigCents; pICMS: string | null; vICMS: BigCents }; ipi: { pIPI: string | null; vIPI: BigCents } | null;
  ibsCbs: DanfeItemIbsCbs | null; is: { vBCIS: BigCents; pIS: string | null; vIS: BigCents } | null;
  infAdProd: string | null;
}
export interface DanfeModel {
  chave: string; ambiente: 'producao' | 'homologacao';
  ide: { nNF: string; serie: string; tpNF: '0' | '1'; natOp: string; dhEmi: string; dhSaiEnt: string | null };
  protocolo: { nProt: string; dhRecbto: string };
  emit: { xNome: string; endereco: DanfeEndereco; cnpjCpf: string; ie: string | null; iest: string | null;
          crt: string; crtDescricao: string; tipoRegimeApuracaoIbsCbs: null /* [NT10-EMIT] até NT futura */ };
  dest: { xNome: string | null; endereco: DanfeEndereco | null; cnpjCpf: string | null; ie: string | null } ;
  fatura: { nFat: string | null; dup: Array<{ nDup: string; dVenc: string; vDup: BigCents }> } | null;
  totaisIcmsIpi: { /* vBC, vICMS, vBCST, vST, vIPI, vFCP?, vFCPST?, vICMSUFDest?, vFCPUFDest?, mono ×4? — cond. item 2 */ };
  totaisIbsCbsIs: DanfeTotaisIbsCbsIs;
  issqn: { im: string | null; vServ: BigCents; vBC: BigCents; vISS: BigCents } | null;
  transp: { /* grupo X — cond. item 2 */ } | null;
  itens: DanfeItem[];
  infCpl: string | null;
  avisos: Array<'QRCODE_NAO_RENDERIZADO'>;   // F-DANFE-8 (b)
}
export function readDanfeModel(xml: string | Buffer): DanfeModel;

// lib/danfe/danfeHtml.ts — puro, determinístico (I5)
export function renderDanfeHtml(m: DanfeModel): string;
// lib/danfe/code128.ts — F-DANFE-4 (a)
export function barcodeChaveSvg(chave44: string): string;
// lib/pdf.ts
export async function htmlToPdf(html: string, opts?: { margin?: { top: string; right: string; bottom: string; left: string } }): Promise<Buffer>;

// features/…/services/DanfeService.ts
gerar(scope: AccountingScope, fiscalDocumentId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: 'application/pdf' }>;

// DTO
export const DanfeParamsDto = z.object({ id: z.string().min(1) }).strict();
```

**Rota:** `GET /dfe/documents/:id/danfe` → 200 `application/pdf` · 401 · 403 · 404 (outro tenant ou inexistente) ·
409 `DANFE_DOCUMENTO_NAO_AUTORIZADO` / `DANFE_SEM_XML` · 422 `DANFE_SO_NFE` / `DANFE_NFCE_NO_FE`.

## 5. Forks — RATIFICADOS em 22/10/2026 ([[D-2026-10-22-NFE-DANFE-IBSCBS-FORKS]]; o BRIEF original os deixou pendentes)

### F-DANFE-1 — Quem gera o DANFE 55
- **(a)** Backend: HTML puro + `htmlToPdf`, como os comprovantes (`ReceiptService`), servido pela rota do item 19.
- **(b)** Frontend: o BE entrega o `DanfeModel` em JSON e o FE desenha e imprime.
- **(c)** Ninguém por enquanto: só quando houver NF-e 55 emitida.
- **Recomendação: (a).** O DANFE é documento legal com leiaute fixo `[DANFE-BASE]`, e o mesmo PDF serve para download,
  e-mail e impressão. O canônico (`lib/pdf` + HTML testável) já existe no BE. Em (b), o leiaute ficaria no navegador,
  sem teste de servidor. Em (c), o prazo de 01/12 seria perdido no dia em que a 1ª NF-e sair. Efeito colateral: o
  texto do ADR-DFE §3 D1 ("DANFE … no parceiro") precisa de correção (§9 item 1). **RATIFICADO (22/10/2026, (a)).**

### F-DANFE-2 — DANFE NFC-e neste nó
- **(a)** Fora: a NT 2026.010 só trata do modelo 55 `[NT10-MOD55]`, e o F-NFCE-E1-6 (b), ratificado em 13/10, pôs o
  DANFE NFC-e no BRIEF de FE. O título do nó fica mais largo que o escopo, e o fold registra isso sem trocar o título.
- **(b)** Dentro: o BE gera também o DANFE NFC-e (80 mm) com IBS/CBS. Isso **reabre o E1-6 (b)**, decisão do dono, e
  depende do Manual do DANFE NFC-e (insumo ausente 2) e da L-NFCE-4.
- **Recomendação: (a).** Não há norma lida que mande pôr IBS/CBS no DANFE NFC-e, e (b) reabre uma decisão ratificada
  sem fato novo. **RATIFICADO (22/10/2026, (a)).**

### F-DANFE-3 — Como ler os campos novos do XML
- **(a)** Estender `ParsedNfe` (o tipo da ingestão) com todos os campos do DANFE.
- **(b)** Leitor próprio `readDanfeModel` sobre a árvore exposta por `readNfeTree`, com as mesmas guardas; `ParsedNfe`
  não muda.
- **Recomendação: (b).** O `ParsedNfe` é o contrato da ingestão e do custo (X6, IBS-CBS-2027). Acrescentar ~60 campos
  de impressão a ele cria acoplamento sem consumidor. Com (b), as guardas (XXE, assinatura, `cStat`) ficam num lugar só.
  **RATIFICADO (22/10/2026, (b)).**

### F-DANFE-4 — Código de barras da chave
- **(a)** Função própria (Code 128, conjunto C, 44 dígitos pares), testada contra vetor.
- **(b)** Dependência nova (ex.: `bwip-js`).
- **Recomendação: (a), condicionada ao item 2** confirmar que o padrão do MOC é Code 128C (inferido, não lido). Uma
  chave numérica de 44 dígitos usa só o conjunto C, então o encoder é pequeno e determinístico, e (a) evita dependência
  nova no servidor. Se o MOC pedir outra simbologia, (b) passa a ser a recomendação. **RATIFICADO (22/10/2026, (b)).** Escolha **contra a recomendação**.

### F-DANFE-5 — Quando gerar
- **(a)** Sob demanda, a cada pedido, sem gravar.
- **(b)** Gerar ao autorizar e gravar em `pdfAttachmentId`.
- **Recomendação: (a).** O DANFE deriva inteiro do XML (I1), e gravar cria um segundo artefato que pode divergir (leiaute
  corrigido depois, evento). O custo é ~1 s de Chromium por pedido, aceitável para documento avulso. **RATIFICADO (22/10/2026, (a)).**

### F-DANFE-6 — Orientação e canhoto
- **(a)** Só retrato (o leiaute principal), com canhoto sempre.
- **(b)** Retrato e paisagem, com o canhoto configurável por unidade.
- **Recomendação: (a).** A NT trata a paisagem como alternativa "para os casos em que o emitente disponha de mais
  largura útil" [D03] §3, e a supressão do canhoto é faculdade [D03] §4.4. Configuração nova sem pedido é escopo novo.
  **RATIFICADO (22/10/2026, (a)).**

### F-DANFE-7 — Um leiaute ou dois (antes/depois de 01/12/2026)
- **(a)** Só o leiaute novo, para qualquer data.
- **(b)** Escolher pelo `dhRecbto`: antes de 01/12/2026, leiaute antigo; depois, o novo.
- **Recomendação: (a), condicionada.** Hoje o Luminaris não emite NF-e 55. Se o X10a PR-7 só entrar em produção depois
  de 01/12, toda nota sua cai no leiaute novo, e (b) seria código sem uso. A NT acrescenta quadros e preserva "ao
  máximo a estrutura do DANFE atual" [D03] §1. Se o PR-7 for a produção antes de 01/12, o fork volta ao dono com a
  pendência P4. **RATIFICADO (22/10/2026, (a)).** Segue a condição: se o X10a PR-7 for à produção antes de 01/12/2026, o fork volta ao dono.

### F-DANFE-8 — QR Code no DANFE 55
- **(a)** Desenhar o QR quando `infNFeSupl/qrCode` vier no XML (exige um encoder de QR: dependência ou código próprio).
- **(b)** Área vazia até a NT do `[NT10-QR]`, com aviso no model.
- **Recomendação: (b).** O emissor do X10a só monta `infNFeSupl` na NFC-e (EMENDA-1 E-3), então nenhuma NF-e 55 do
  Luminaris trará o grupo. A regra de formação para o 55 ainda não foi publicada. **RATIFICADO (22/10/2026, (b)).**

## 6. Pendente de validação externa (não são forks)

| # | Pergunta | Por que importa | Quem responde |
|---|---|---|---|
| P1 | Seção do DANFE no MOC (leiaute base, código de barras, texto de homologação, quebra de página) | itens 2, 10, 13, 14 | fonte oficial (Portal NF-e / MOC online do PR), no PR-0 |
| P2 | Tag do "Tipo de Regime de Apuração do IBS e da CBS" | o campo reservado de `[NT10-EMIT]` passa a ser impresso | NT futura (Portal NF-e) |
| P3 | Regras do QR Code no DANFE 55 | F-DANFE-8 | NT futura (Portal NF-e) |
| P4 | Pode-se usar o leiaute novo antes de 01/12/2026 e o antigo depois, para nota autorizada antes? | só se o F-DANFE-7 voltar (emissão 55 antes de 01/12) | Portal NF-e / Fale Conosco da SEFAZ autorizadora; **quem envia é o dono** |
| P5 | `nfeProc` real autorizado com UB completo (`gRed`, IS, monofasia) | fixture de dado real (memória `sintetico-nao-cobre-formato-de-dado-real`) | dado externo: XML de fornecedor ou do contador (gate humano, sem sessão de agente) |

## 7. Insumos ausentes (pausados — regra 2)

1. **Seção do DANFE no MOC 7.0 / MOC online.** Não está no repo como texto; o PDF da Visão Geral consta só no MANIFEST.
   Esta sessão não leu. → item 2.
2. **Manual de Padrões Técnicos do DANFE NFC-e e QR Code**: só necessário se o F-DANFE-2 for (b). Já era ausente na
   EMENDA-1 §7 item 1.
3. **NTs 2026.009, 2026.006, 2026.003 e 2014.001 v1.41**: não lidas. → item 3.

> **PR-0 executado em 26/10/2026** (dono, chat, 2026-10-26: *"Executa o NFE-DANFE-IBSCBS PR-0 — sessao-feature, sem merge."*;
> dossiê [`nfe-danfe-pr0`](../../pesquisas-legais/nfe-danfe-pr0/relatorio.md)). Os insumos 1 e 3 estão **resolvidos**; o 2
> segue fora (F-DANFE-2 a).
> - **Insumo 1:** o leiaute base está no **MOC 7.0 Anexo II** (Manual de Especificações Técnicas do DANFE e Código de Barras,
>   v7.00), não na Visão Geral. Transcrição: [`TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md`](fontes-oficiais/TRANSCRICAO-MOC70-AnexoII-DANFE-2026-10-26.md).
>   Chaves que os itens condicionados citam: item 10 → `[MOC-DANFE-SO-XML]`, `[MOC-DANFE-ORDEM]`, `[MOC-DANFE-INFCPL]`,
>   `[MOC-DANFE-INFADPROD]`, `[MOC-DANFE-MODFRETE]`, `[MOC-DANFE-PROTOCOLO]`; item 13 → `[MOC-DANFE-C128-SIMB]`,
>   `[MOC-DANFE-C128-VETOR]`, `[MOC-DANFE-C128-DIM]`, `[MOC-DANFE-CHAVE-MASCARA]`; item 14 → `[MOC-DANFE-HOMOLOG]`.
>   A simbologia é **CODE-128C**, como o F-DANFE-4 inferia, e o MOC traz vetor de teste (`09758364` → DV 48).
> - **Item 1:** NT 2026.010 rebaixada, sha256 igual; transcrição em [`TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md`](fontes-oficiais/TRANSCRICAO-NT2026010-DANFE-RTC-2026-10-26.md).
> - **Insumo 3 / item 3:** nenhuma das quatro NTs muda o DANFE 55 (tabela no §7 da transcrição da NT).
> - **Lacunas de spec abertas pelo PR-0** — **DECIDIDAS em 26/10/2026**, todas na recomendação
>   ([[D-2026-10-26-NFE-DANFE-IBSCBS-LACUNAS-PR0]]): 1 → corrigir para 11/14 (item 1 emendado); 2 → as duas formas (item 14
>   emendado); 3 → texto da NT 2026.010 (item 11 emendado). Texto original das lacunas:
>   - **L-DANFE-PR0-1:** o teste do item 1 espera "12 de item, contando as 3 `pAliqEfet`". A NT §4.3 tem **11 campos impressos e 14
>     tags**. A transcrição segue a fonte; a contagem do BRIEF precisa de correção.
>   - **L-DANFE-PR0-2:** `[MOC-DANFE-HOMOLOG]` aceita "SEM VALOR FISCAL" em "Informações Complementares" **ou** em marca d'água.
>     O item 14 não diz qual.
>   - **L-DANFE-PR0-3:** o texto do Campo 1 difere entre o MOC 7.0 ("Consulta de autenticidade…") e o modelo da NT 2026.010
>     ("Consulte a autenticidade…"). O item 11 não diz qual.
>   - **Pendência (não fork):** a partir de 01/11/2026 o MOC tem versão online do Paraná; o PR-2 confere as linhas `[MOC-DANFE-…]` nela.

## 8. Invariantes (cada uma vira teste)

| # | Invariante | Teste |
|---|---|---|
| I1 | O DANFE sai **só do `nfeProc` autorizado**, nunca da venda, do payload ou das colunas do `FiscalDocument` (`[NT10-FACULT]`: nada inferido) | item 18 |
| I2 | Tag ausente ⇒ `null` ⇒ campo vazio ou quadro omitido; **nunca "0,00"** | itens 6, 10, 12 |
| I3 | "Tipo de Regime de Apuração do IBS e da CBS" sem conteúdo até a NT futura (tipo literal `null`) | item 9 |
| I4 | Alíquota impressa: `gRed` ⇒ `pAliqEfet`; senão a vigente; IS sempre `pIS` | item 7 |
| I5 | Determinismo: mesmo XML ⇒ mesmo HTML (sem relógio, sem ordem de mapa) | item 11 |
| I6 | Dinheiro por aritmética de string → `bigint`; alíquota como string crua; nunca `Number(x) * 100` | item 6 |
| I7 | Todo texto do XML escapado antes de ir ao Chromium | item 11 |
| I8 | Só modelo 55; NFC-e e NFS-e recusadas com código nomeado | itens 5, 17 |
| I9 | Assinatura verificada antes de qualquer leitura (F-SIG-1 a) | item 4 |
| I10 | Só documento autorizado gera DANFE `[DANFE-BASE]` (cl. 9ª §1º) | item 17 |

## 9. Achados fora de escopo (não planejados)

1. **ADR-DFE §3 D1** ainda diz que "o DANFSe/DANFE ficam no parceiro". Desde o F-NFCE-E1-1 (a) e o §12 do ADR (emissor
   próprio), isso não vale. Uma emenda de texto do ADR exige pedido próprio.
2. **FE:** botão "Baixar DANFE" na tela do documento fiscal. Nó de FE próprio, com autorização própria.
3. **DANFE Simplificado - Tipo 2** (Aj. 07/05 cl. 9ª §5º-D, red. Aj. 12/25 e 13/26, efeitos 03/08/2026 [D01]; NT 2026.003):
   NF-e emitida "nas operações previstas para emissão de uma NFC-e". Interessa se o salão usar NF-e no balcão. Outro nó.
4. **DANFE de NF-e recebida** (ingestão): o mesmo `readDanfeModel` serviria para ver a nota do fornecedor. Não pedido.

## 10. Fold desta sessão

- Nota [`NFE-DANFE-IBSCBS`](../plano/nos/NFE-DANFE-IBSCBS.md): `estado` fica `planned`. O `estado_detalhe` e o
  `autorizacao` recebem a linha de 22/10, e a seção "Docs" aponta para este BRIEF e para o dossiê. Os 8 forks seguem
  PENDENTES. Não é `executa`.

## 11. Gates de envio [OPS-001]

1. **Objetivo:** o TLDR diz o que a NT exige, o prazo, que não há DANFE no código, que o nó roda sem o X10a e qual é
   o risco. O §2 põe o prazo em cada PR.
2. **Grau:** o texto da NT e dos Ajustes é **V** (lido na fonte oficial, sha no manifest). Que o parser não lê IBS
   UF/Mun, `gRed` nem IS é **V** (`nfe.ts:77-91`, `:251-275`). Que não há DANFE no código é **V** (grep `danfe` em
   `server/src` e `my-app/src` sem resultado de geração, só o upload do DANFSe em `fiscalDocumentController.ts:192`).
   Code 128C no MOC é **inferido** (F-DANFE-4, item 2). Que o X10a PR-7 não chega à produção antes de 01/12 é
   **inferido** do estado `blocked` da nota.
3. **Caso adversarial tentado:** "a NT 2026.010 vale também para o DANFE NFC-e, como diz o título do nó". Resultado: §1,
   §3 e §5 da NT falam só da NF-e e dos modelos "Modelo55", e nenhum trecho cita a NFC-e. A conclusão fica (F-DANFE-2).
   Segundo caso: "basta acrescentar os blocos ao DANFE atual". Resultado: o grep não acha DANFE no código, então o nó
   inclui o leiaute base, e por isso o item 2 existe.
4. **Checagem que teria falhado:** o SHA-256 da NT baixada hoje bate com o de 17/10. Se o Portal tivesse publicado uma
   v1.01 com outro conteúdo, o hash teria mudado.
5. **Duas primeiras linhas:** o TLDR traz o fato (só modelo 55, 01/12, DANFE inexistente) e o risco (MOC não lido e
   NFC-e fora).
