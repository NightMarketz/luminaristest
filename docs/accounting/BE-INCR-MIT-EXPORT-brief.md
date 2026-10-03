# BRIEF — BE-INCR-MIT-EXPORT (arquivo JSON de importação do MIT a partir das apurações confirmadas) — nó X9

> Produzido em `sessao-planejamento` em 03/10/2026, sobre `origin/main` `d6530790`. Herda o esqueleto da §5 (X9-1..X9-8)
> e as invariantes da §13 do [`ADR-INCR-DCTFWEB-MIT`](../adr/ADR-INCR-DCTFWEB-MIT.md), **Accepted** em 02/10 (F-X9-1..6
> ratificados: [`D-2026-10-02-X9-DCTFWEB-MIT-FORKS`](../plano/decisoes/D-2026-10-02-X9-DCTFWEB-MIT-FORKS.md)). **Reusa**,
> sem redesenhar, o contrato C1 dos BRIEFs [X7 Fase A](BE-INCR-TAX-ASSESSMENT-A-brief.md) ("A-n"),
> [X7 Fase B](BE-INCR-TAX-ASSESSMENT-B-brief.md) ("B-n") e [X8](BE-INCR-PIS-COFINS-brief.md) ("P-n").
> **Este documento NÃO escreve código.** Os forks F-X9-1..6 não são reabertos. Os forks novos **F-MIT-1..3** estão
> **PENDENTES**, com recomendação (§3). Nenhum item vira código sem "executa" do dono (ORCH-006).
>
> **Alcance e risco, ditos antes de tudo:**
> - **Nada daqui tem o que ler antes do PR-2 da Fase A do X7** (model `TaxAssessment` e confirmação). Hoje
>   `TaxAssessment` não existe em `server/` (grep V em `d6530790`). O X8 e a Fase B do X7 também não têm código.
> - **Para o 1º cliente (Simples) o arquivo vale zero** (D10). Só a linha DCTFWeb da matriz (item 13) o alcança.
> - **O oráculo do formato é externo** (P-6 do ADR): um teste verde prova o leiaute **lido**, não o leiaute **aceito**
>   pelo MIT. E o risco do TLDR do ADR continua: um arquivo importado sobre apuração encerrada **substitui a apuração
>   inteira** (Manual do MIT §9.1). A defesa é aviso, não trava (F-X9-1 → a).

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó [`X9`](../plano/nos/X9.md); ADR §5 (X9-1..X9-8), §6 (contratos), §13 (invariantes).
- **Autorização:** dono, chat, 03/10/2026: *"Autorizo planejar o BRIEF do X9 — DCTFWeb + MIT (dono, 03/10) — só o
  BRIEF, sem 'executa'."* Instruções do mesmo pedido: não reabrir forks; consumir o C1 do X7 e os valores do X8;
  reusar modelos/contratos dos BRIEFs A e B do X7 e do X8 sem duplicar; leiaute e Manual do MIT só da fonte oficial,
  com seção citada; ordem dos PRs amarrada a X7-A PR-2 (e X8 PR-2 para PIS/Cofins); forks novos PENDENTES.
  - **Cobre exatamente:** este BRIEF + o fold da nota do nó.
  - **Não cobre:** código; ratificar F-MIT-n; editar o ADR do X9 ou os BRIEFs vizinhos.
  - **Divergência do passo 1:** nenhuma. A nota dizia "só ADR"; a mensagem de 03/10 amplia para o BRIEF, como no X8.
- **Fatos consumados que o BRIEF respeita** (lidos em `d6530790`, grau V; caminhos sob `server/`):
  - **Matriz:** `type ObrigacaoSped = 'ECD' | 'ECF'` (`src/features/accounting/models/obrigacoesPorRegime.ts:13`);
    8 linhas (`:70-100`); a inativa devolve `NAO_SE_APLICA` com fonte por **ternário** ECD/ECF (`:125`). Consumidores:
    `CompanyFiscalProfileService.ts:17,55` (o tipo) e `dashboardController.ts:177`. Teste
    `models/__tests__/obrigacoesPorRegime.test.ts:23,25` fixa 8 linhas e `['ECD','ECF']` por regime.
  - **Segundo ternário (achado nesta sessão):** os `faltantes` do perfil usam
    `o.obrigacao === 'ECD' ? DECLARANTE_ECD : DECLARANTE_ECF` e, em `CONDICIONAL`, empurram **todas** as
    `condicoes.*` nulas, que são condições de ECD (`CompanyFiscalProfileService.ts:243-251`). Uma linha DCTFWEB
    herdaria os faltantes da ECF. É o item 14.
  - **Perfil:** `CompanyFiscalProfile` `@@unique([userId, anoCalendario])`, `regime`, `inativa`, `declarante Json?`
    com `cnpj` (`CNPJ_REGEX`, alfanumérico, `CompanyFiscalProfileDto.ts:37`), `contadorContactId` FK `Restrict`
    (`prisma/schema.prisma:1373-1404`).
  - **Contador:** `AccountingContact.cpf` (11 dígitos), `phone?` (só dígitos, 10–11), `email`, `deletedAt` (arquivado =
    soft) — PII de terceiro, nunca em auditoria (`prisma/schema.prisma:1770-1798`).
  - **Molde de função pura:** `src/lib/ecf.ts` / `src/lib/ecfReal.ts` (sem I/O). O arquivo novo é `src/lib/mit.ts`.
  - **Policy:** pares `canRead*/canManage*` em `IAccountingPolicy` (`:78`). O X7 cria
    `canReadTaxAssessment`/`canManageTaxAssessment` (A-19); o X8 os reusa (P-15).
  - **Allowlist:** `auditCanonical.ts:149-153` (`company_fiscal_profile.*`). Todo eventType novo entra na mesma mudança.
- **Contrato C1 consumido (planejado, não código — insumo §5.1):**

  | Origem | `tributo` | `periodo` | `modo` | `codigoReceita` | Campos lidos |
  |---|---|---|---|---|---|
  | X7-A (A-12) | IRPJ, CSLL | `T01..T04` | `PRESUMIDO`, `REAL_TRIMESTRAL` | 208901, 022001, 337301, 237201, 601201 | `aPagarCents`, `status`, `deletedAt`, `anoCalendario` |
  | X7-B (B-11) | IRPJ, CSLL | `A01..A12`, `A00` | `ESTIMATIVA_RECEITA`, `BALANCETE_SUSPENSAO_REDUCAO`, `AJUSTE_ANUAL` | 236201, 599301, 248401, 243001, 245601, 677301 | + `diferencaPostergadaCents` (só IRPJ, mês do excesso; código 236202/599302, B-3) |
  | X8 (P-12) | PIS, COFINS | `M01..M12` | `PIS_COFINS_CUMULATIVO`, `PIS_COFINS_NAO_CUMULATIVO` | 810902, 217201, 691201, 585601 | `aPagarCents` (o `saldoNegativoCents` é saldo credor e **não** é débito) |

  O ADR D4 esboçou a Fase B como `M01..M12` + `ANUAL`; o F-TB-1 → (a) fixou `A00..A12`. Este BRIEF usa o vocabulário
  ratificado (o mapeamento do D4 é o mesmo, só o nome muda).
- **Nós vizinhos:** consome [`X7`](../plano/nos/X7.md) (C1), [`X8`](../plano/nos/X8.md) (C1 alargado, ADR do X8 D10/D12),
  [`X13`](../plano/nos/X13.md) (perfil, matriz) e C6b (`AccountingContact`). É consumido pelo FE (nó vizinho, fora) e
  pelo gate humano da 1ª importação (P-6 do ADR).

## Fontes desta fase (só primária; seção citada)

**V-fonte (03/10)** = relido hoje na fonte oficial: leiaute JSON 1.0 (gov.br/receitafederal,
`mit_leiaute_json_importacao_20-02-2025.pdf`, sha `4e840b311cca`), Manual do MIT jan/2025 (`manual-mit-1-0-14-02.pdf`,
sha `49da7ca21177`) — **os mesmos hashes do ADR §15** — e IN RFB 2.237/2024 na visão do Sijut
(`normasinternet2…/#/consulta/externa/141910`). **V-ADR** = lido pela sessão do ADR em 02/10 (ADR §3). **I** = inferido.
Nada foi copiado para o repo (decisão 10 de 29/09).

| Regra | Fonte | Grau |
|---|---|---|
| Ordem dos grupos de `Debitos`: `BalancoLucroReal`, `Irpj`, `Csll`, `Irrf`, `Ipi`, `Iof`, `PisPasep`, `Cofins`, `ContribuicoesDiversas`, `Cpss`, `RetPagamentoUnificado`; *"devem ser informados na ordem de apresentação desta tabela"* | Leiaute 1.0 pp. 5–6 | V-fonte (03/10) |
| *"Na Apuração com movimento, deve ser informado ao menos um débito"* | Leiaute 1.0 p. 5 (`Debitos`) | V-fonte (03/10) |
| `BalancoLucroReal` (Boolean: *"a PJ levantou balanço/balancete de suspensão ou redução no mês"*) é obrigatório se `TributacaoLucro` = 1 (sem eventos especiais) | Leiaute 1.0 p. 5 | V-fonte (03/10) |
| Real Anual: sem a marcação do balancete, *"há a obrigatoriedade da informação de código de receita relativo ao débito decorrente da apuração das estimativas mensais"* | Manual do MIT §4.3 | V-fonte (03/10) |
| Débitos anuais de IRPJ (2430, 2456…) e CSLL (6773…) vão no PA de **março do ano seguinte**; o usuário preenche o **ano** a que o débito se refere | Manual do MIT §4.1 (e item III); leiaute 1.0 p. 8 (`AnoDebito`: *"podendo ser o mesmo ano da Apuração ou o ano precedente"*, obrigatório para Irpj/Csll anual com `TributacaoLucro` = 1 nos meses 1–3) | V-fonte (03/10). A condição de obrigatoriedade vem de coluna embaralhada pelo `pdftotext` (viés 1 do ADR) |
| `PaDebito`, `AnoPostergado`, `TrimPostergado`, `CnpjEstabelecimento`, `CnpjScp` só valem para periodicidade diária/decendial/quinzenal, código final "10" (postergado), IPI/CIDE, SCP ou incorporação | Leiaute 1.0 pp. 7–8; Manual §4.1 I–II e §4.2 | V-fonte (03/10). Nenhum código do C1 cai nesses casos |
| `IdDebito` único e sequencial de 1 até a quantidade de débitos **da apuração**; `CodigoDebito` String de 6 dígitos; `ValorDebito` com até 2 casas | Leiaute 1.0 p. 7 | V-fonte (03/10); igual ao ADR §3 |
| `2362-02` e `5993-02` (IRPJ estimativa — *"diferença do imposto postergado apurada no mês em que for excedido o limite de RB"*, prestadora exclusiva de serviços) estão na tabela do MIT, periodicidade ME | Manual do MIT §10.1, itens 17 e 42 | V-fonte (03/10). Promove a B-3 (códigos da diferença postergada) de "tabela da DCTF" para "tabela do MIT" |
| Nome do arquivo: `<CNPJ raiz 8>-MIT-<AAAAMM>.json` | Leiaute 1.0 p. 10 | V-fonte (03/10) |
| Dispensas da DCTFWeb (art. 4º I–XII): **nenhuma** alcança PJ inativa; PJ sem fato gerador entrega o **1º mês sem movimento** e fica dispensada nos seguintes (art. 6º § 2º II) | IN RFB 2.237/2024 arts. 4º e 6º § 2º | V-fonte (03/10). Base do F-MIT-3 |
| Demais regras (confissão, retificação integral, PA mensal, importação sem encerramento, códigos da Fase A e do X8, domínios dos Dados Iniciais, responsável) | ADR §3 | V-ADR |

## Definição de pronto

(1) checklist numerado e testável (§1); (2) contratos materializáveis (§2); (3) forks com caminhos, recomendação e
**RATIFICAÇÃO PENDENTE** (§3); (4) pendências externas (§4); (5) insumos ausentes (§5); (6) achados fora de escopo (§6).

---

## 1. Checklist de comportamentos

Notação: **[D]** = direto (ADR, lei, leiaute ou fork ratificado decidem); **[F-MIT-n]** = fork novo, pendente;
**[P-n]** = depende de pendência externa (§4 deste BRIEF ou §9 do ADR); usa-se o default marcado, parametrizado.

**Pré-condição [D]:** o PR-2 da Fase A do X7 está mergeado (model, repo e interface do `TaxAssessment`). O X9 **só lê**
o `TaxAssessment` pela interface do repositório do X7 (precedente B-18); não escreve nele, e o X7 não lê o X9 (ADR §7).

### Função pura `montarArquivoMit` — `src/lib/mit.ts` (porta `EnvioMit`, D11)

1. **[D, D2/D3/D4] Seleção das apurações do PA** — função pura `apuracoesDoPa(linhas, ano, mes)`, usada pelo POST
   **e** pelo cálculo de defasagem (item 11), para que os dois nunca divirjam. Entra `status = CONFIRMED` e
   `deletedAt` nulo; `SUPERSEDED` nunca (invariante 5). Mapa período → PA:
   - `T0q` do ano Y ⇒ (Y, 3q) (D4; grau I, P-4 do ADR);
   - `A0m` do ano Y ⇒ (Y, m) — **só com a Fase B** (PR-4);
   - `A00` do ano Y ⇒ (Y+1, 3), com `AnoDebito = Y` (Manual §4.1; leiaute p. 8) — **só com a Fase B**;
   - `M0m` do ano Y (PIS/COFINS) ⇒ (Y, m) — **só com o X8** (PR-3).
   - O repositório lê o ano Y e, quando `mes = 3`, também o `A00` de Y−1.
2. **[D, D5] Grupos e ordem.** IRPJ ⇒ `Debitos.Irpj`, CSLL ⇒ `Csll`, PIS ⇒ `PisPasep`, COFINS ⇒ `Cofins`, emitidos na
   ordem do leiaute (§Fontes). Dentro do grupo, ordem estável por (`anoCalendario`, `periodo`, `codigoReceita`), para o
   sha ser determinístico. `IdDebito` = 1..n contínuo na **apuração inteira**, não por grupo (invariante 1).
3. **[D, D6] Débito por linha.** `CodigoDebito` = `codigoReceita` (6 dígitos, String; invariante 2); `ValorDebito` =
   `Number(aPagarCents) / 100` (invariante 3). `aPagarCents = 0` ⇒ sem débito (D6; P-3 do ADR).
   - **[D, B-3/B-9] Diferença postergada do 16%** (PR-4): linha IRPJ com `diferencaPostergadaCents > 0` gera um
     **segundo** débito, código `236202` se o `codigoReceita` é `236201`, `599302` se é `599301` (a constante de
     códigos da Fase B, importada — não duplicada). Outro `codigoReceita` com diferença > 0 ⇒ erro de programa
     (invariante quebrada no X7), não 4xx.
   - **[D] Ajuste anual** (PR-4): débito de `A00` leva `AnoDebito = anoCalendario` da apuração (leiaute p. 8).
4. **[D, leiaute p. 5] Zero débito ⇒ 422.** Apurações confirmadas existem, mas todas com `aPagarCents = 0` (retenção ≥
   devido, F-TA-9 a; suspensão por balancete, B-8) ⇒ 422 *"nenhum débito a exportar neste mês"*. O leiaute exige ao
   menos um débito com `SemMovimento = false`, e o D7 proíbe `SemMovimento = true`. PA sem nenhuma confirmada ⇒ o 422 do
   D7 (invariante 4); pedir mês 1 ou 2 de um ano só trimestral cai aqui (invariante 6).
5. **[D, F-X9-4 → b] Dados Iniciais**, do **perfil do ano do PA** (os Dados Iniciais descrevem o PA, Manual §2.4; grau
   I, P-M2): `SemMovimento: false` (D7); `QualificacaoPj: 1`; `TributacaoLucro`: PRESUMIDO ⇒ 3, REAL + TRIMESTRAL ⇒ 2,
   REAL + ANUAL ⇒ 1 (o 1 só no PR-4; antes dele, ANUAL ⇒ 422 *"Real anual chega com a Fase B do X7"*);
   `RegimePisCofins`: PRESUMIDO ⇒ 2, REAL ⇒ 1; `VariacoesMonetarias: 1`. A forma efetiva vem do perfil como no A-1
   (`REAL` com forma nula ⇒ `TRIMESTRAL`).
6. **[D + F-MIT-2] `BalancoLucroReal`** (PR-4; só com `TributacaoLucro = 1`, onde é obrigatório): `true` se a linha
   IRPJ `A0m` do PA tem `modo = BALANCETE_SUSPENSAO_REDUCAO`, `false` se `ESTIMATIVA_RECEITA`. O IRPJ e a CSLL estão
   sempre no mesmo modo (B-11), então não há conflito. **Sem linha `A0m` confirmada no PA** (ex.: só PIS/Cofins, ou só o
   `A00` do ano anterior em março) ⇒ o valor do booleano é desconhecido: **F-MIT-2**.
7. **[D, F-X9-3 → a] Responsável** = contador do perfil do ano do PA: `CpfResponsavel` = `cpf`; `TelResponsavel` =
   `{ Ddd: phone[0..2], NumTelefone: phone[2..] }` se `phone` tiver 10–11 dígitos, senão omitido;
   `EmailResponsavel` = `email` se tiver 5–40 caracteres, senão omitido com aviso (ADR §3: o Manual limita a 40);
   `RegistroCrc` **sempre omitido**.
8. **[D] Nome, conteúdo e hash.** `nomeArquivo` = 8 primeiros caracteres de `declarante.cnpj` + `-MIT-` + `AAAAMM` +
   `.json` (invariante 8); `conteudo` = `JSON.stringify(arquivo)` sem espaços; `sha256` = hex do conteúdo em UTF-8.
   Raiz com letra ⇒ aviso *"CNPJ alfanumérico: aceitação pelo MIT não confirmada"* (P-1 do ADR).
9. **[D, F-X9-1 → a, D8, F-X9-4 → b] Avisos fixos em todo sucesso** (invariante 11), como constantes exportadas (o
   teste compara por igualdade):
   - *"O arquivo traz só os débitos que o Luminaris apurou; inclua os demais no MIT antes de encerrar."*
   - *"Importado sobre uma apuração já encerrada, ele vira retificador e substitui a apuração inteira."*
   - *"Mês com extinção, fusão, cisão ou incorporação: não importe este arquivo."*
   - *"Confira os Dados Iniciais no MIT."*
   - **Condicionais:** e-mail omitido (item 7); CNPJ alfanumérico (item 8); antes do PR-3, *"PIS/Cofins não incluídos:
     o X8 não está ativo"* quando o regime é PRESUMIDO/REAL.

### Serviço, persistência e rotas

10. **[D] `MitExportService.gerar(scope, { anoCalendario, mes })`** — recusas, nesta ordem:
    - perfil do ano do PA ausente ⇒ 400;
    - regime `SIMPLES`/`MEI` ⇒ 400 *"o Simples não informa no MIT o que está no DAS (IN 2.237 art. 8º § 4º)"* (D10);
    - `declarante.cnpj` ausente ⇒ 400; `contadorContactId` nulo ou contato arquivado (`deletedAt`) ⇒ 400 (F-X9-3 a);
    - **[F-X9-5 → c]** `lc224AcrescimoSuspenso = true` no perfil de **algum** ano das apurações selecionadas ⇒ 409
      *"PJ com liminar contra a LC 224: a declaração da suspensão depende do contador"*;
    - itens 4 e 6 (422).

    Depois: monta pelo item 1–9, grava `MitExport` (item 11) e audita (item 16). O serviço não abre tx: há uma escrita
    só (a linha `MitExport`), e nada é lançado.
11. **[D, F-X9-2 → a] Model `MitExport`** (contrato §2): migração aditiva, repo + interface + factory, sem conteúdo nem
    CPF (D12). `defasado` é **calculado na leitura**: algum id de `apuracaoIds` não está mais `CONFIRMED` vivo
    (`SUPERSEDED` ou `deletedAt`), **ou** o `apuracoesDoPa` de hoje (item 1) tem id fora de `apuracaoIds` (invariante
    10; art. 13 § 7º). Sem soft-delete: não há rota de remoção (registro de fato ocorrido, como o
    `AccountingDeliveryLog`).
12. **[D] Rotas** (2 toques: `routes/accounting.ts` + `routes/docs.paths.ts`; auth deny-by-default no middleware):
    - `POST /api/accounting/mit-exports` → 201 `MitExportCreatedView`; policy `canManageTaxAssessment` (escreve
      `MitExport` e prepara confissão; precedente P-15 do X8);
    - `GET /api/accounting/mit-exports?anoCalendario=` → `MitExportView[]` com `defasado`; policy `canReadTaxAssessment`.
    - Controller fino; DTO Zod `.strict()` (§2).

### Matriz de obrigações (F-X9-6 → a)

13. **[D, F-X9-6 → a] Linha DCTFWEB.** `ObrigacaoSped` vira `'ECD' | 'ECF' | 'DCTFWEB'` (o nome do tipo fica, com
    comentário: DCTFWeb não é SPED — renomear mexe em 3 arquivos sem ganho). +4 linhas, `vigenteDesde '2025-01-01'`:
    REAL, PRESUMIDO, SIMPLES = `OBRIGATORIA`, fonte *"IN RFB 2.237/2024 art. 3º I; art. 6º § 2º II (sem movimento)"*;
    MEI = `CONDICIONAL`, fonte *"IN RFB 2.237/2024 art. 3º IX; art. 4º IX"*, com `perguntaPendente` *"O MEI contratou
    segurado, reteve IR ou está em outra hipótese do art. 3º IX?"*.
    - **A inativa ganha fonte própria por linha:** `LinhaMatriz` recebe `inativa: { status; fonte; pergunta? }`
      obrigatório; ECD/ECF levam o que hoje sai do ternário (`INATIVA_ECD`/`INATIVA_ECF`, `NAO_SE_APLICA`), e o ternário
      de `:125` some. O valor das linhas DCTFWEB inativas é o **F-MIT-3**.
    - O comentário do cabeçalho (`:6-7`, *"DCTFWeb … ficam FORA"*) é atualizado. O teste `:23,25` passa a esperar 12
      linhas e `['DCTFWEB','ECD','ECF']` por regime — **mudança esperada**, não regressão.
14. **[D] `faltantes` da DCTFWEB** (`CompanyFiscalProfileService.ts:243-251`): o ramo ECD/ECF vira explícito por
    obrigação. DCTFWEB nunca herda `condicoes.*` nem `DECLARANTE_ECF`; cobra `declarante.cnpj` e `contadorContactId`
    **só** em REAL/PRESUMIDO (o que o arquivo do X9 exige, itens 7–8); em SIMPLES/MEI, `[]` (o X9 não gera, D10).
    **Teste:** perfil SIMPLES com `condicoes` nulas ⇒ DCTFWEB com `faltantes = []`; REAL sem contador ⇒
    `['contadorContactId']`. Os testes atuais de ECD/ECF passam **sem edição**; se algum precisar mudar, o executor
    para e reporta.

### Gates que o diff aciona (X9-8)

15. **[D]** Rotas em 2 toques + guard de path-count do openapi (**+1 path**: `/accounting/mit-exports`, com POST e
    GET). Snapshot de shape de `MitExportRequestSchema` e `MitExportListQuerySchema`.
16. **[D]** Allowlist do `auditCanonical.ts`, na mesma mudança: `tax.mit_export.generated`:
    `['mitExportId', 'anoCalendario', 'mes', 'sha256', 'apuracaoIds']` — **sem CPF, sem e-mail, sem telefone, sem
    conteúdo** (D12; invariante 9). Mensagens de erro no padrão do módulo (texto pt no `ValidationError`, A-22).
17. **[D] Testes de invariante** (ADR §13 itens 1–11, mais estes):
    - (a) teste-tabela do `ValorDebito`: 1 ⇒ `0.01`, 10 ⇒ `0.1`, 115 ⇒ `1.15`, 100000 ⇒ `1000`; regex no texto JSON:
      nenhum número com mais de 2 casas;
    - (b) arquivo de ouro: Presumido T01 com IRPJ e CSLL ⇒ texto exato (`MesApuracao 3`, `TributacaoLucro 3`,
      `RegimePisCofins 2`, `Irpj` antes de `Csll`, `IdDebito` 1 e 2, `"208901"`/`"237201"`);
    - (c) CPF do contador: ausente do payload de auditoria, do log e da linha `MitExport` (varre o JSON de cada um);
    - (d) defasagem: exporta → substitui T01 (X7 A-14) → `GET` dá `defasado = true` → exporta de novo → o novo sai
      `false`, o velho continua `true`;
    - (e) todas as confirmadas com `aPagar = 0` ⇒ 422 (item 4);
    - (f) liminar ligada ⇒ 409; SIMPLES ⇒ 400; sem contador ⇒ 400; contador arquivado ⇒ 400;
    - (g) matriz: inativa em cada regime ⇒ ECD/ECF com as fontes de hoje (regressão do ternário removido).

### PIS/Cofins (PR-3 — depois do PR-2 do X8)

18. **[D, ADR-X8 D10/D12] Grupos `PisPasep` e `Cofins`.** `apuracoesDoPa` passa a ler `tributo ∈ {PIS, COFINS}`,
    `periodo = M0m`. O débito é o `aPagarCents` (o `saldoNegativoCents` do X8 é saldo credor e nunca vira débito, P-12).
    O aviso *"PIS/Cofins não incluídos"* (item 9) sai. **Teste:** Presumido em março com T01 e M03 ⇒ 4 débitos na ordem
    `Irpj`, `Csll`, `PisPasep`, `Cofins`, `IdDebito` 1..4; `RegimePisCofins = 2` coerente com os códigos 810902/217201.

### Real anual (PR-4 — depois do PR-2 da Fase B do X7)

19. **[D, D4, B-11] Períodos `A0m`/`A00`**, `TributacaoLucro = 1`, `BalancoLucroReal` (item 6), diferença postergada e
    `AnoDebito` (item 3). **Testes:** (a) `A03` por balancete com redução ⇒ `BalancoLucroReal: true` + débito
    `236201`/`248401`; (b) `A04` em suspensão ⇒ 422 se for o único (item 4); (c) março de Y+1 com `A00` de Y ⇒ débito
    `243001` com `AnoDebito: Y`; (d) mês do excesso do 16% ⇒ `236201` e `236202` em sequência no grupo `Irpj`.

## 2. Contratos esboçados

```ts
// src/lib/mit.ts — subconjunto do leiaute 1.0 que o X9 emite (D7, D8, D9: sem SemMovimento=true, sem eventos, sem IRRF)
type MitDebito = { IdDebito: number; CodigoDebito: string /* /^\d{6}$/ */; AnoDebito?: number /* só débito de A00 */; ValorDebito: number };
type MitGrupo = { ListaDebitos: MitDebito[] };
type MitArquivo = {
  PeriodoApuracao: { MesApuracao: number; AnoApuracao: number };
  DadosIniciais: {
    SemMovimento: false;
    QualificacaoPj: 1;
    TributacaoLucro: 1 | 2 | 3;
    VariacoesMonetarias: 1;              // F-X9-4 b
    RegimePisCofins: 1 | 2;              // F-X9-4 b: REAL ⇒ 1, PRESUMIDO ⇒ 2
    ResponsavelApuracao: {
      CpfResponsavel: string;            // PII (D12) — nunca em auditoria/log/MitExport
      TelResponsavel?: { Ddd: string; NumTelefone: string };
      EmailResponsavel?: string;         // 5..40
    };                                   // RegistroCrc omitido (F-X9-3 a)
  };
  Debitos: { BalancoLucroReal?: boolean; Irpj?: MitGrupo; Csll?: MitGrupo; PisPasep?: MitGrupo; Cofins?: MitGrupo };
  // a ordem de inserção das chaves É a ordem do leiaute — JSON.stringify a preserva
};

// Porta EnvioMit (D11) — reusa os tipos do C1; nada de registry/factory de adaptador
type ApuracaoParaMit = Pick<TaxAssessment, 'id' | 'anoCalendario' | 'tributo' | 'periodo' | 'modo' | 'codigoReceita'
  | 'aPagarCents' | 'diferencaPostergadaCents' /* default 0n até a Fase B */>;
type EntradaMit = {
  ano: number; mes: number;
  perfil: { cnpj: string; regime: 'PRESUMIDO' | 'REAL'; forma: 'TRIMESTRAL' | 'ANUAL' };   // do ano do PA
  responsavel: { cpf: string; phone?: string | null; email?: string | null };
  apuracoes: ApuracaoParaMit[];        // já filtradas por apuracoesDoPa
};
type SaidaMit = { nomeArquivo: string; conteudo: string; sha256: string; avisos: string[]; apuracaoIds: string[] };
export function apuracoesDoPa<T extends Pick<TaxAssessment, 'anoCalendario' | 'periodo' | 'status' | 'deletedAt'>>(
  linhas: T[], ano: number, mes: number): T[];
export function montarArquivoMit(e: EntradaMit): SaidaMit;   // lança o 422 do item 4/6 como ValidationError tipado
export const AVISOS_MIT_FIXOS: readonly string[];
```

```ts
// features/accounting/dtos/MitExportDto.ts (Zod .strict())
export const MitExportRequestSchema = z.object({
  anoCalendario: z.number().int().min(2025),   // IN 2.237 art. 1º § 1º I (ADR §6)
  mes: z.number().int().min(1).max(12),
}).strict();
export const MitExportListQuerySchema = z.object({
  anoCalendario: z.coerce.number().int().min(2025),
}).strict();                                     // sem boolean em query (classe z.coerce.boolean)

type MitExportCreatedView = { id: string; nomeArquivo: string; conteudo: string; sha256: string; avisos: string[] };
type MitExportView = {
  id: string; anoCalendario: number; mes: number; sha256: string; apuracaoIds: string[];
  geradoPorId: string; createdAt: string; defasado: boolean;
};
```

```prisma
// F-X9-2 a — molde AccountingDeliveryLog (hash + período, sem conteúdo)
model MitExport {
  id            String   @id @default(cuid())
  userId        String   // a PJ (R8)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade) // como o TaxAssessment (A-12)
  anoCalendario Int      // ano do PA (não o da apuração: o A00 de Y sai no PA de março de Y+1)
  mes           Int
  sha256        String
  apuracaoIds   Json     // string[] dos TaxAssessment que entraram
  geradoPorId   String   // actor, string simples
  createdAt     DateTime @default(now())

  @@index([userId, anoCalendario, mes])
  @@map("mit_exports")
}
```

```ts
// models/obrigacoesPorRegime.ts — delta (item 13)
export type ObrigacaoSped = 'ECD' | 'ECF' | 'DCTFWEB';   // nome mantido; DCTFWeb não é SPED
interface LinhaMatriz { /* …campos atuais… */ inativa: { status: StatusObrigacao; fonte: string; pergunta?: string } }
```

| Rota | Policy | Efeito |
|---|---|---|
| `POST /api/accounting/mit-exports` | manage (`canManageTaxAssessment`) | monta, grava `MitExport`, audita, devolve o arquivo |
| `GET /api/accounting/mit-exports?anoCalendario=` | read (`canReadTaxAssessment`) | lista com `defasado` |

## 3. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-MIT-1** Fatiamento e ordem | **(a)** 4 PRs seriais, todos **depois do PR-2 da Fase A do X7** (instrução do dono): **PR-1** itens 1–9 e 13–14 (função pura IRPJ/CSLL trimestral + matriz; só teste-tabela, sem rota) · **PR-2** itens 10–12, 15–17 (model, serviço, rotas, auditoria) · **PR-3** item 18 (depois do PR-2 do X8) · **PR-4** item 19 (depois do PR-2 da Fase B do X7) · (b) igual a (a), mas a **matriz** (itens 13–14) sai antes, já — ela não lê o `TaxAssessment` · (c) 1 PR depois de X7-A, X7-B e X8 | ⏳ **PENDENTE.** Recomendação: **(a).** É o molde do F-TA-10/F-PCB-4, e a ordem é a que o dono amarrou. O (b) é o único caminho que entrega algo ao 1º cliente antes do X7 (a linha DCTFWeb da matriz serve o Simples, F-X9-6), mas contraria a instrução "código espera o PR-2 da Fase A"; fica como opção explícita, não como recomendação. O (c) junta 3 dependências num PR que espera a mais lenta | baixo |
| **F-MIT-2** Real anual sem estimativa do mês confirmada (`BalancoLucroReal` desconhecido) | **(a)** 422 *"confirme a estimativa (ou o balancete) do mês no X7 antes de exportar"* quando `TributacaoLucro = 1` e não há linha IRPJ `A0m` confirmada no PA · (b) emitir `BalancoLucroReal: false` com aviso | ⏳ **PENDENTE.** Recomendação: **(a).** O booleano é uma **declaração** (*"levantou balancete no mês"*); emitir `false` sem saber é afirmar o que o sistema não sabe — a mesma razão do D7 (`SemMovimento`). E `false` obriga o código da estimativa (Manual §4.3): o arquivo sairia com pendência certa. O caso acontece em março de Y+1 (só o `A00` de Y) e em mês só com PIS/Cofins; a ordem sequencial do X7 (B-13) faz dele exceção. Só existe no PR-4 | médio em (b): pendência ou declaração falsa |
| **F-MIT-3** DCTFWeb da PJ **inativa** na matriz | **(a)** `CONDICIONAL`, fonte *"IN RFB 2.237/2024 art. 4º (sem dispensa para inativa) e art. 6º § 2º II"*, pergunta *"Este ano contém o 1º mês sem movimento? Se sim, entregue a DCTFWeb desse mês; nos seguintes, fica dispensada"* · (b) `OBRIGATORIA`, mesma fonte · (c) `NAO_SE_APLICA` (herda o comportamento de hoje) | ⏳ **PENDENTE.** Recomendação: **(a).** O art. 4º (V-fonte, 03/10) não dispensa a inativa, então (c) afirma uma dispensa que a lei não dá. O art. 6º § 2º II torna a entrega **condicional ao mês**: uma PJ já inativa no ano anterior fica dispensada o ano inteiro; uma que parou neste ano entrega um mês. (b) cobra demais da primeira. Sem campo novo no perfil: a pergunta é texto da linha | baixo em (a)/(b); médio em (c): multa mínima de R$ 200 (art. 11 § 3º) |

## 4. Pendente de validação externa (não entra no checklist como decidido)

Herdadas sem mudança do ADR §9: **P-1** (CNPJ alfanumérico no nome), **P-2** (`ValorDebito` líquido × bruto), **P-3**
(débito zero omitido), **P-4** (trimestral sempre no último mês), **P-5** (liminar LC 224), **P-6** (oráculo: 1ª
importação real — gate humano, RUNBOOK-FORMAT; o agente prepara o runbook em branco, não preenche, não marca desfecho,
não assina). Novas:

| # | Pergunta | Por que importa | Quem fecha |
|---|---|---|---|
| P-M1 | Mês só com suspensão (balancete com devido 0) ou só com retenção ≥ devido: a DCTFWeb do mês é "sem movimento" ou a PJ informa algo no MIT? | O item 4 recusa (422), porque o leiaute exige ≥ 1 débito; a pergunta é o que o usuário faz no e-CAC | contador |
| P-M2 | Os Dados Iniciais do PA de março de Y+1 (que leva o `A00` de Y) vêm do perfil de Y+1, e o MIT aceita `2430`/`6773` com `TributacaoLucro` ≠ 1 nesse ano (troca Real anual → Presumido/trimestral)? | O leiaute só torna `AnoDebito` obrigatório com `TributacaoLucro = 1`, e o MIT filtra códigos pelos Dados Iniciais (Manual §4) | 1ª importação real / contador |
| P-M3 | `AnoDebito` mandado também quando não é obrigatório (débito anual com `TributacaoLucro` ≠ 1) é aceito ou recusado? | A coluna "obrigatório" do leiaute veio embaralhada do `pdftotext` (viés 1 do ADR) | 1ª importação real (P-6) |
| P-M4 | Balancete **com redução** usa o código da estimativa (`236201`/`248401`) no MIT | É o P-B2 da Fase B; o Manual §4.3 só diz que, **sem** a marcação, o código da estimativa é obrigatório | contador / 1ª importação |

## 5. Insumos ausentes

1. **O código real do C1** (X7-A, X7-B, X8): nada existe. Os itens foram escritos contra os BRIEFs; se a implementação
   do X7 ou do X8 mudar um nome (`codigoReceita`, `modo`, `diferencaPostergadaCents`, a interface do repo), o executor
   relê e o delta daqui muda junto. O PR-1 confirma os nomes no código mergeado do X7-A antes de começar.
2. **Arquivo JSON exportado do próprio MIT** (fixture de ouro; ADR §10.1): continua ausente. O teste 17(b) usa um ouro
   escrito à mão a partir do leiaute — prova o leiaute lido, não o aceito.
3. **Interface de leitura do repositório do `TaxAssessment` por PA** (ano Y + `A00` de Y−1): o BRIEF do X7 só
   especifica a lista por `anoCalendario/periodo/status` (A-17). O X9 pede um método de leitura no repo do X7
   (`listConfirmedForPa`), sem escrita; o executor o adiciona no PR-1 ou PR-2 pela interface, sem tocar a lógica do X7.

## 6. Achados fora de escopo (registrados, não planejados)

1. **D10 × ajuste anual depois de sair do Real:** o leiaute permite `Csll` com `TributacaoLucro = 7` (Simples) quando
   `MesApuracao = 3` (p. 5) — o caminho para declarar o ajuste de Y no março de Y+1 de quem virou Simples. O D10
   recusa (400) e este BRIEF segue o D10. Reabrir é decisão do dono, com ADR.
2. **ADR do X9 §5/§6 usam `M01..M12` para a Fase B**; o F-TB-1 → (a) fixou `A00..A12`. Quem fizer o próximo fold do
   ADR pode anotar; o BRIEF já usa o vocabulário ratificado.
3. **ADR do X7 §3 / BRIEF X7-A P-8** ("o MIT aceita a tabela da DCTF"): a §3 do ADR do X9 e a tabela de fontes daqui
   (2362-02/5993-02) promovem para V-fonte. Não edito os documentos do X7.
4. **Alerta de prazo** (art. 6º), **arquivo no pacote do contador** (C6b) e **FE da exportação**: fora (ADR §11; o FE
   é `FE-INCR-*` próprio).

## 7. Gates de envio [OPS-001]

1. **Objetivo:** o dono quer o X9 executável sem invenção, consumindo X7/X8 sem duplicar, com a ordem dos PRs presa às
   dependências. O checklist cobre X9-1..X9-8 (X9-1 → 1–4, 8–9; X9-2 → 5; X9-3 → 7; X9-4 → 10; X9-5 → 11; X9-6 → 12;
   X9-7 → 13–14; X9-8 → 15–17) e os deltas X8 (18) e Fase B (19); o F-MIT-1 amarra a ordem.
2. **Grau:** cada regra carrega V-fonte (03/10, com hash igual ao do ADR), V-ADR ou I; cada fato de código carrega
   `arquivo:linha` em `d6530790`.
3. **Caso adversarial tentado:** *"o X9 é um serializador; a Fase B só troca o enum"*. Derrubado pela releitura do
   leiaute: o Real anual traz **três** campos que o esboço do ADR não tinha (`BalancoLucroReal` obrigatório, `AnoDebito`
   no ajuste, segundo código da diferença postergada) e uma regra de forma (*"ao menos um débito"*) que transforma a
   suspensão em 422. E *"a matriz é só mais uma linha"* caiu no segundo ternário (`faltantes`, item 14).
4. **Checagem que teria falhado:** os hashes do leiaute e do Manual baixados hoje batem com o ADR (`4e840b311cca`,
   `49da7ca21177`) — se a Receita tivesse trocado o PDF no mesmo endereço, a §Fontes mentiria. O art. 4º da IN 2.237
   lido no Sijut: se dispensasse a inativa, o F-MIT-3 não existiria.
5. **Duas primeiras linhas:** o cabeçalho diz que não há código e que F-MIT-1..3 estão pendentes; o bloco de alcance
   diz que nada roda antes do X7-A PR-2, que o 1º cliente só ganha a matriz e que o formato não tem oráculo interno.

**Vieses (T8):**
- **Fonte legível:** as condições de obrigatoriedade do leiaute vêm de colunas embaralhadas pelo `pdftotext`
  (o mesmo viés 1 do ADR). As que mudam o desenho (`BalancoLucroReal`, `AnoDebito`, "ao menos um débito") foram lidas
  com o texto ao redor, mas P-M3 existe por isso.
- **Herança:** o BRIEF assume os contratos do X7/X8 como escritos (§5.1). Erro no `aPagarCents` é do C1, não daqui
  (viés 3 do ADR).
- **Completude × ponytail:** os PR-3 e PR-4 entram porque o pedido manda consumir X8 e Fase B; cada um é um item, não
  um redesenho.
