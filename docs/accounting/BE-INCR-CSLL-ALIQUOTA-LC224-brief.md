# BE-INCR-CSLL-ALIQUOTA-LC224 — BRIEF (linhas v4 de `CSLL_ALIQUOTA` pela LC 224/2025)

> **Autorização:** dono, chat, 2026-10-09: *"Planeja a atualização de CSLL_ALIQUOTA pela LC 224/2025 — sessao-planejamento,
> sem 'executa'."* **Cobre só este BRIEF.** Não cobre código, migração nem a nota do nó (o LEGAL-PARAMS está `done`;
> se isto vira nó próprio ou fold no LEGAL-PARAMS é do dono — F-CA-6).
> **Sessão:** `sessao-planejamento`. Forks F-CA-1..6 ratificados por questionário em 09/10 (§5). A ratificação não é autorização para executar: não houve `executa`.

## 0. Resumo em duas linhas

O que muda na lei **não altera nenhuma linha já publicada** (`lp1-csll-1` = 9% e `lp1-csll-4` = 15% seguem certas):
a LC 224 sobe a alíquota de instituições de pagamento (9 → 12 → 15%) e de SCFI/capitalização (15 → 17,5 → 20%), que
na ECF usam **códigos novos** (`7` e `8`). Por isso a v4 recomendada só **acrescenta** linhas (`supersedesId = null`).
**Risco principal:** os códigos `7`/`8` são *mistos* (9%→12% e 15%→17,5% no mesmo ano), e a consulta atual
(`aliquotaCsll(ind, dataFim)`) tem **uma** alíquota por data. Isso serve no trimestral e **erra no anual** (F-CA-4).

## 1. Fontes lidas nesta sessão (09/10/2026)

| # | Fonte | Como | Grau |
|---|---|---|---|
| S1 | IN RFB 1.700/2017 **art. 30-D**, incluído pela IN RFB 2.315/2026, vigência 01/04/2026 (texto compilado, segmentos não tachados) | API Sijut `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente`, JSON de 2.664.011 bytes, sha256 `faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3` | **V-fonte** (RFB) |
| S2 | IN RFB 2.315, de 18/03/2026 (DOU 20/03/2026): ementa, preâmbulo (*"tendo em vista o disposto no art. 7º e no art. 8º da LC 224/2025"*), art. 4º I (vigência 01/04/2026 dos arts. 1º e 3º); o art. 3º revoga os arts. 30 a 30-C da IN 1.700 | API Sijut, ato **150037**, sha256 `ec4a5f99c1e535c300f140a4f5c699944afdf5af857085e4344e3eec41b6eb2d` | **V-fonte** |
| S3 | Manual de Orientação do Leiaute 12 da ECF (Anexo ao ADE Cofis 02/2026, atualização abr/2026), registro **0020**, campo `IND_ALIQ_CSLL`; item 1.32; Anexo II.1 (alterações de 24/04/2026) | `sped.rfb.gov.br/estatico/8E/318140FF…/Manual_ECF_Leiaute_12_28_04_2026_AC_2025_SIT_ESP_2026.pdf`, 620 p., sha256 `314cdc21c892ee6f2bbac35358acae6fe0c16f9b05946c4cb27686d6a5151b8f` | **V-fonte** |
| — | **Lei 7.689/1988 art. 3º, redação da LC 224/2025 art. 7º** | Planalto e DOU (`in.gov.br`) **recusaram a conexão de novo** (curl `000`, WebFetch `socket hang up`) | **NÃO LIDO** — ver P-CA-1 |

**Art. 30-D da IN 1.700 (S1):** I — 15%: seguros privados, distribuidoras de valores, corretoras de câmbio e de valores,
crédito imobiliário, cartões de crédito, arrendamento mercantil, cooperativas de crédito, associações de poupança e
empréstimo · II — 20%: bancos de qualquer espécie · III — instituições de pagamento (Lei 12.865/2013), mercado de balcão,
bolsas e entidades de liquidação: **a) 12% de 01/04/2026 a 31/12/2027; b) 15% a partir de 01/01/2028** · IV — SCFI e
capitalização: **a) 17,5% de 01/04/2026 a 31/12/2027; b) 20% a partir de 01/01/2028** · V — 9%: demais PJ.

**`0020.IND_ALIQ_CSLL` no leiaute 12 (S3, p. do registro 0020):** `1` = 9% · `3` = 20% · `4` = 15% · `7` = *"9% - 12%"* ·
`8` = *"15% - 17,5%"*. A mesma página ainda traz `Valores Válidos [1;3;4]` e a regra
`REGRA_PREENCHIMENTO_IND_ALIQ_CSSL` (*"ano ≥ 2019 ⇒ 1 ou 4"*), **sem atualização** — o manual se contradiz (P-CA-3).
O leiaute 12 cobre o AC 2025 e as **situações especiais de 2026**. O leiaute do AC 2026 normal ainda não saiu, e não há
código para os 15%/20% de 2028.

> A pesquisa da casa já registrava, em 29/09, a LC 224 mudando a CSLL de financeiras e a nota *"fora do público-alvo"*
> (`docs/adr/ADR-INCR-TAX-ASSESSMENT.md:113`). Isto é **fato consumado**: o público-alvo segue fora (F-CA-3).

## 2. Insumos (fato consumado no código, `origin/main` `d0b2a5f4`)

- `server/prisma/data/legal_parameters_v1.sql:15-16`: `lp1-csll-1` (chave `1`, 900 bp, `Lei 7.689/1988 art. 3º III`,
  desde 2025-01-01, sem fim) e `lp1-csll-4` (chave `4`, 1500 bp, `art. 3º I`). As versões v2/v3 não tocam CSLL.
- A chave **é** o código ECF `IND_ALIQ_CSLL`. `TabelaApuracao.aliquotaCsll(ind, data)` escolhe a linha da chave com
  `vigenteDesde` mais recente que esteja vigente na data (`taxAssessmentParams.ts:93-96`). A data é o fim do período:
  `fimDoTrimestre` no Presumido (`taxAssessmentCalc.ts:425`) e `dataFim` no Real (`:530`).
- `supersedesId` **tira a linha substituída de todo lookup**, em qualquer data, e exige mesma tabela/chave/discriminador
  (L-7, `D-2026-10-07-LEGAL-PARAMS-EXECUCAO`; `linhasEmVigor` em `legalParameter.ts:76-90`).
- Os enums de `indAliqCsll` aceitam só `['1','4']`: `CompanyFiscalProfileDto.ts:97`, `SpedEcfDto.ts:54`,
  `SpedEcfRealDto.ts:49`.
- O teste de paridade **assere que o indicador `3` é ausente**
  (`legalParameterParity.integration.test.ts:93`: `for (const ind of ['2','3']) …toBeUndefined()`).
- Molde de versão nova: `legal_parameters_v3.sql` com migração byte a byte (`legalParameter.test.ts:15,49`) e
  `fonteUrl` + `fonteSha256` preenchidos (as linhas v1 não têm).
- O recálculo automático do PR-4 (#576) reage a linha publicada da família X7 (`familiasDaLinha`, `legalParameterPr4.test.ts:48`).

## 3. Checklist de comportamentos

1. **[D] Arquivo `server/prisma/data/legal_parameters_v4.sql` + migração `…_legal_parameters_v4_csll_lc224`** com o
   mesmo texto, byte a byte (molde v3). Teste: igualdade de bytes, como em `legalParameter.test.ts:49`.
2. **[F-CA-1, F-CA-2] Linhas v4** (a tabela §4). Todas `PUBLISHED`, com `fonte`, `fonteUrl` (S1) e `fonteSha256` (S1),
   e `supersedesId = null` na recomendação. Teste de tabela: para cada chave × data (`2026-03-31`, `2026-04-01`,
   `2026-06-30`, `2027-12-31`, `2028-01-01`), `aliquotaCsll` devolve o valor e a fonte esperados.
3. **[D] As linhas `1` e `4` não mudam.** Teste: em `2026-06-30` e `2028-03-31`, `aliquotaCsll('1')` = 900 e
   `aliquotaCsll('4')` = 1500, com a fonte da v1. Isso guarda contra superseder por engano.
4. **[D] Ajustar o teste de paridade** (`legalParameterParity…:93`): o `3` deixa de ser ausente se a linha `lp4-csll-3`
   entrar (F-CA-1). O `2` segue ausente. O teste do inventário (`legalParameter.test.ts:78-81`, *20 linhas, 2
   CSLL_ALIQUOTA*) é da v1 e não muda. A contagem da v4 ganha teste próprio.
5. **[F-CA-3] Enums de `indAliqCsll`**: só se mudam no caminho (b) do F-CA-3. Nesse caso, snapshot de shape dos 3 DTOs
   (`__dto-shapes__.json`) e o prefill da ECF (`spedPerfilPrefill.ts:92`) entram juntos.
6. **[F-CA-4] Apuração anual / estimativa com código misto (`7`/`8`)**: recusa explícita (400) na recomendação.
7. **[D] Recálculo**: publicar a v4 não pode mudar apuração existente. Nenhum perfil tem `7`/`8`/`3`, porque o enum não
   aceita. Teste: depois da migração, o job do PR-4 não marca nenhuma apuração do seed como desatualizada.
8. **[D] Gates do diff:** `tsc` (server); `auditCanonical` não muda (sem `eventType` novo); openapi não muda (sem rota);
   i18n não muda; S6 / smoke de migração de dado (memória `smoke-gate-s6-x-migracao-de-dado`). A v4 é `INSERT OR IGNORE`
   puro, sem backfill.

## 4. Contrato — as linhas v4 (esboço materializável)

Colunas como na v1. `proposedById`/`publishedById` = `migracao:BE-INCR-CSLL-ALIQUOTA-LC224`.
`fonteUrl` = URL do S1. `fonteSha256` = `faa47fa1…40c3` (F-CA-5).

| id | chave | valorInt (bp) | vigenteDesde | vigenteAte | fonte | supersedesId |
|---|---|---|---|---|---|---|
| `lp4-csll-3` | `3` | 2000 | `2026-04-01` *(F-CA-1)* | — | IN RFB 1.700/2017 art. 30-D II (red. IN RFB 2.315/2026) | — |
| `lp4-csll-7-a` | `7` | 900 | `2026-01-01` | `2026-03-31` | IN RFB 1.700/2017 art. 30-D III a, por remissão (antes de 01/04/2026: art. 30-D V / redação anterior) — **P-CA-2** | — |
| `lp4-csll-7-b` | `7` | 1200 | `2026-04-01` | `2027-12-31` | IN RFB 1.700/2017 art. 30-D III a (red. IN RFB 2.315/2026) | — |
| `lp4-csll-7-c` | `7` | 1500 | `2028-01-01` | — | IN RFB 1.700/2017 art. 30-D III b *(F-CA-2)* | — |
| `lp4-csll-8-a` | `8` | 1500 | `2026-01-01` | `2026-03-31` | redação anterior (15% para SCFI) — **P-CA-2** | — |
| `lp4-csll-8-b` | `8` | 1750 | `2026-04-01` | `2027-12-31` | IN RFB 1.700/2017 art. 30-D IV a (red. IN RFB 2.315/2026) | — |
| `lp4-csll-8-c` | `8` | 2000 | `2028-01-01` | — | IN RFB 1.700/2017 art. 30-D IV b *(F-CA-2)* | — |

```sql
-- molde de 1 linha (o resto segue o mesmo formato)
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt")
VALUES ('lp4-csll-7-b','CSLL_ALIQUOTA','7',NULL,1200,NULL,NULL,'IN RFB 1.700/2017 art. 30-D III a (red. IN RFB 2.315/2026)','https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente','faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3','2026-04-01','2027-12-31','PUBLISHED',NULL,'LC 224/2025 art. 7º — alíquota transitória (ECF 0020.IND_ALIQ_CSLL = 7)','migracao:BE-INCR-CSLL-ALIQUOTA-LC224','migracao:BE-INCR-CSLL-ALIQUOTA-LC224',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
```

Se o F-CA-3 for para (b), o enum muda assim (esboço):
```ts
indAliqCsll: z.enum(['1', '3', '4', '7', '8'])  // CompanyFiscalProfileDto / SpedEcfDto / SpedEcfRealDto
```

## 5. Forks — 6/6 ratificados (dono, chat, 2026-10-09, questionário)

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-CA-1** Linha do código `3` (20%, bancos) | (a) incluir `lp4-csll-3` desde 2026-04-01 · (b) incluir desde 2025-01-01 (a alíquota de 20% para bancos é anterior à LC 224, mas a redação anterior **não foi lida**) · (c) não incluir | **(a).** A fonte lida (S1) cobre a partir de 01/04/2026. Recuar a vigência exige ler a redação anterior (P-CA-2). Incluir a linha mantém a tabela igual ao campo da ECF | ✅ **(a)** — dono, chat, 2026-10-09 (questionário) |
| **F-CA-2** Publicar já as linhas de 2028 (`7-c`, `8-c`) | (a) publicar agora: a lei fixa 15%/20% · (b) esperar o leiaute da ECF com código para 2028 | **(a).** A alíquota é lei, e o código é o mesmo enquanto a RFB não criar outro. Se um leiaute novo trocar o código, a linha nova substitui a antiga (`supersedesId`) | ✅ **(a)** — dono, chat, 2026-10-09 (questionário) |
| **F-CA-3** Público-alvo: ampliar o enum `indAliqCsll` | (a) só dado: v4 publicada, enums seguem `['1','4']`, e as linhas 3/7/8 ficam sem consumidor · (b) ampliar os 3 enums (+ snapshot + prefill da ECF) · (c) não publicar nada (fora do público-alvo) | **(a).** O ADR do X7 deixa financeiras fora (`ADR-INCR-TAX-ASSESSMENT.md:113`), e o princípio do dono no F-LP-6 é *"a plataforma vai atualizar os dados fiscais de acordo com a lei sempre"*. O (b) abre apuração de financeira, que é frente nova (ORCH-006) | ✅ **(b) contra a recomendação** — dono, chat, 2026-10-09 (questionário). Item 5 do checklist fica ativo e o F-CA-4 passa a valer |
| **F-CA-4** Código misto (`7`/`8`) no Real anual / estimativa | (a) 400 explícito (*"alíquota da CSLL muda no ano; apuração anual com código 7/8 não suportada"*) · (b) ratear por mês/período · (c) usar a de `dataFim` (12/12 avos com 12%) | **(a).** O (c) erra para mais em silêncio. O (b) depende de uma regra de rateio que não foi lida (P-CA-4). Só vale com F-CA-3 (b); com (a) o enum já barra | ✅ **(a)** — dono, chat, 2026-10-09 (questionário) |
| **F-CA-5** `fonteSha256` | (a) hash do JSON multivigente da IN 1.700 baixado em 09/10 (S1) · (b) hash do ato da IN 2.315 (S2) · (c) nulo | **(a).** É o mesmo padrão da v3 (ato 81268, texto compilado). O S2 entra no `motivo` | ✅ **(a)** — dono, chat, 2026-10-09 (questionário) |
| **F-CA-6** Onde mora o item no vault | (a) fold no `LEGAL-PARAMS` (linha de PR nova, nó segue `done`) · (b) nó próprio `CSLL-LC224` | **(a).** É dado numa tabela que já existe, sem mudança de plataforma | ✅ **(b) contra a recomendação** — nó próprio `CSLL-LC224`, dono, chat, 2026-10-09 (questionário). Nota criada em `docs/plano/nos/CSLL-LC224.md` (dono, chat, 09/10) |

## 6. Pendente de validação externa

| # | O quê | Por quê | Quem |
|---|---|---|---|
| P-CA-1 | Texto da **LC 224/2025 art. 7º** (nova redação do art. 3º da Lei 7.689) — conferir que a IN 2.315 o espelha | Planalto e DOU recusaram conexão em 09/10 (duas vezes). A IN é regulamentação; a fonte primária é a lei | reler (agente) quando o DOU responder |
| P-CA-2 | Redação **anterior** a 01/04/2026: 9% para IP e 15% para SCFI no 1º trimestre de 2026 (linhas `7-a`/`8-a`), e desde quando bancos pagam 20% | Não lida. Os arts. 30–30-C revogados (IN 1.700) estão no mesmo JSON, marcados como tachados. O leiaute S3 confirma o par "9%-12%" / "15%-17,5%" (I) | agente (ler os segmentos tachados do S1) |
| P-CA-3 | Contradição no manual: `Valores Válidos [1;3;4]` e a regra *"≥2019 ⇒ 1 ou 4"* × os códigos 7/8 | O PVA decide. Pode ter sido corrigido na atualização de 20/05/2026 (`sped.rfb.gov.br/arquivo/show/8003`, que devolveu HTML e não o PDF) | PVA / contador |
| P-CA-4 | Regra do Real anual com alíquota que muda em 01/04 (rateio por mês? balanço?) | F-CA-4 (b) | contador |

## 7. Insumos ausentes

- PDF do manual de 20/05/2026 (o link oficial redirecionou para HTML).
- Texto da LC 224/2025 em fonte oficial (P-CA-1).

## 8. Achados fora de escopo (não planejados)

- A IN 2.315 (art. 2º) também muda o IRRF sobre JCP para 17,5%. É outra tabela, sem linha na plataforma hoje.
- IN RFB 2.319/2026 (adicional de CSLL do tributo mínimo global, DCTFWeb): li só a menção (V-web). Fora do público-alvo.
