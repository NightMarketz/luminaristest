# BE-INCR-LEGAL-PARAMS — pente fino contra a lei + coeficientes de lei em tabela de banco (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Nenhum fork deste documento se auto-ratifica.
> **Autorização (dono, chat, 2026-10-06):** *"Autorizo planejar o pente fino + BRIEF — sessao-planejamento, sem executa"*.
> Escolhas do dono no questionário do mesmo dia (antes da autorização): **gerenciável = tabela no banco editada pelo
> admin da plataforma** (não no código, não por empresa) · **escopo = tudo fiscal + contábil**.
> **Cobertura da autorização:** inventário item × lei (§1–§2) + BRIEF da migração (§3–§5). **Não** cobre código,
> correção das divergências (cada uma vira par instrumentação → correção, com autorização própria) nem FE.
> **Nó no vault:** não existe nota em `docs/plano/nos/` para este item — ver F-LP-0.
> **Base:** `origin/main` `6d3e9fb9` (re-fetch 2026-10-06).

## 0. O que este pente fino prova e o que não prova

Ele compara **o que está no código** com **o texto da norma** (corpus `docs/accounting/fontes-oficiais/` ou fonte
oficial na web). Pega erro de transcrição, fonte ausente, norma revogada e escopo mal lido. **Não prova** que o
imposto final está certo — isso continua sendo do PVA (H1/X5) e do contador (CLAUDE.md §⛔; `ORACLE-DEFICIT.md`).
É uma passada única, não uma rodada recorrente.

Graus usados: **V-corpus** = li o artigo no corpus nesta sessão · **V-web** = conferi em fonte da web nesta sessão ·
**C** = fonte citada no código/ADR, **não reconferida** aqui · **SEM FONTE** = nenhum artefato de origem.

## 1. Inventário — coeficientes e tabelas de lei no código

| # | Item | Onde | Valor | Fonte citada | Grau | Status |
|---|---|---|---|---|---|---|
| 1 | Alíquota IRPJ | `models/taxAssessmentParams.ts:43` | 15% | IN 1.700 art. 29 caput | V-corpus | CONFERE |
| 2 | Adicional IRPJ + limite | `taxAssessmentParams.ts:44-45` | 10% sobre o que exceder R$ 20.000 × meses | IN 1.700 art. 29 §§ 1º–2º | V-corpus | CONFERE |
| 3 | Presunção IRPJ serviço / revenda | `:46-47` | 32% / 8% | Lei 9.249 art. 15; IN 1.700 art. 33 | V-corpus (IN) | CONFERE |
| 4 | Presunção CSLL serviço / revenda | `:48-49` | 32% / 12% | Lei 9.249 art. 20; IN 1.700 art. 34 | V-corpus (IN) | CONFERE |
| 5 | Teto de compensação de prejuízo / base negativa | `:50` | 30% | IN 1.700 art. 64 | V-corpus | CONFERE |
| 6 | Acréscimo LC 224 (IRPJ / CSLL) | `:51-53` | +10% na presunção; R$ 1,25 mi/trimestre; IRPJ desde 01/01/2026, CSLL desde 01/04/2026 | IN RFB 2.305/2025 arts. 3º, 14, 15 | V-web (imprensa especializada, não o DOU) | CONFERE; suspensão por liminar já modelada (D-2) |
| 7 | Presunção reduzida 16% + limite R$ 120 mil | `:55-56`; `taxAssessmentCalcAnual.ts:164` | 16% | IN 1.700 art. 33 § 7º; Lei 9.250 art. 40 | V-corpus | **DIVERGE no escopo** — ver D-1 (errata feita; BRIEF próprio) |
| 8 | Alíquota CSLL por indicador ECF | `taxAssessmentParams.ts:83-86` | `1` = 9%, `4` = 15% | Lei 7.689 art. 3º III / I | V-web (redação Lei 14.183/2021) | CONFERE para o público-alvo (`2`/`3` ausentes = instituições financeiras, fora do ICP) |
| 9 | Códigos de receita DCTF IRPJ/CSLL | `:93-108` | 2089/01, 0220/01 … | Tabela DCTF RFB 12/03/2024 | C (ADR V-fonte 29/09) | NÃO RECONFERIDO |
| 10 | Arredondamento half-up único | `:116` (`arred`) | meia unidade para cima | **nenhuma** ("Fonte primária não encontrada (P-4)") | — | **SEM FONTE** — já registrado (P-4) |
| 11 | PIS/Cofins cumulativo | `models/pisCofinsParams.ts:36-37` | 0,65% / 3% | IN 2.121 art. 128; Lei 9.718 art. 8º | C | NÃO RECONFERIDO (valores notórios) |
| 12 | PIS/Cofins não cumulativo (débito e crédito) | `lib/nfeCost.ts:35-36` → `pisCofinsParams.ts:38-39` | 1,65% / 7,6% | Leis 10.637 e 10.833 art. 2º | C | NÃO RECONFERIDO (valores notórios) — **constante solta em `lib/`**, fora da tabela versionada |
| 13 | Revogação PIS/Cofins em 31/12/2026 | `pisCofinsParams.ts:29-30` | `vigenteAte` | LC 214 art. 542 / art. 544 III | C | NÃO RECONFERIDO |
| 14 | Códigos de receita PIS/Cofins | `pisCofinsParams.ts:36-39` | 8109/02, 2172/01, 6912/01, 5856/01 | Tabelas DCTF RFB | C | NÃO RECONFERIDO |
| 15 | NCM monofásico / alíquota zero | `models/pisCofinsMonofasicoNcm.ts` | ~70 prefixos | Leis 10.147, 10.485, 13.097; Tabela 4.3.10 EFD | C (transcrito do corpus em 15/09 e 25/09, com teste-guarda) | NÃO RECONFERIDO |
| 16 | CST PIS/Cofins sem crédito / tributado | `pisCofinsMonofasicoNcm.ts:124,130` | sem crédito `04..09`; tributado `01, 02` | **nenhuma no código** | — | **SEM FONTE** — ver D-6 |
| 17 | CFOP de imobilizado | `models/itemDestination.ts:35` | `1551, 2551` | **nenhuma no código** | — | **SEM FONTE** — ver D-7 |
| 18 | cStat de NF-e autorizada | `lib/nfe.ts:108` | `100, 150` | MOC §4.4.1 | C | NÃO RECONFERIDO |
| 19 | ICMS fora da base do crédito | `lib/nfeCost.ts:13` | flag, default `true` | Lei 14.592/2023 art. 6º | C | NÃO RECONFERIDO |
| 20 | Matriz regime × ECD/ECF | `models/obrigacoesPorRegime.ts` | status por regime | IN 2.003/2021, IN 2.004/2021, LC 123 | C (corpus) | NÃO RECONFERIDO |
| 21 | Lista nacional de serviços (LC 116) | `models/lc116ListaNacional.ts` | ~360 linhas, **geradas de planilha** | Anexo I leiaute DPS v1.01 (sha `de5bc492959e`) | C (gerado) | NÃO RECONFERIDO — leiaute muda de versão |
| 22 | Alíquota máxima de ISS | `dtos/FiscalProfileDto.ts:75` | ≤ 5% | leiaute DPS [312], RN E0595 | C | CONFERE com LC 116 art. 8º II; **sem mínimo** — ver D-4 |
| 23 | Taxas de depreciação (Anexo III) | `fixtures/anexo-iii-in-1700-2017.json` → `DepreciationRate` (banco, **por escopo**) | ~220 linhas | IN 1.700 Anexo III, com sha | C | NÃO RECONFERIDO — ver D-3 |
| 24 | Leiaute ECD (`COD_VER_LC`) | `lib/sped.ts:127` | `9.00`, sem vigência | Manual ECD p. 108 | C | NÃO RECONFERIDO — ver D-8 |
| 25 | Leiaute ECF (`COD_VER`) por ano | `lib/ecf.ts:48` | só `2025 → 0012` | Manual ECF L12 | C | CONFERE como desenho (ano sem linha ⇒ erro) |
| 26 | Feriados nacionais (prazo de validade do pacote) | `features/packages/models/validity.ts:8-28` | lista fixa | Leis 662/1949, 6.802/1980, 14.759/2023; CC art. 132 | C | NÃO RECONFERIDO — tabela que muda por lei nova |
| 27 | Teto de encargo bancário na baixa | `models/BankSettlement.model.ts:25` | 20% | — (regra operacional, não lei) | — | FORA (não é coeficiente legal) |

Fora do inventário por não serem coeficientes legais: tamanhos máximos de campo, janelas de conciliação, horizonte
do fluxo de caixa, `MAX_CENTS` (política, memória `max-cents-e-politica-nao-persistencia`).

## 2. Divergências e lacunas achadas

**D-1 — 16% do prestador exclusivo também vale no Lucro Presumido trimestral (V-corpus).** O ADR
(`docs/adr/ADR-INCR-TAX-ASSESSMENT.md:105` e F-X7-14) afirma *"não achei norma que estenda o 16% ao Presumido"*.
O corpus tem essa norma: **IN RFB 1.700/2017 art. 215 § 10** (redação vigente, alíneas b, c, d, f, g e j do art. 33
§ 1º IV) e **§ 11** (diferença postergada **por trimestre**). Hoje o código só aplica o 16% na estimativa mensal do
Real anual (`taxAssessmentCalcAnual.ts:164`). O Presumido de um prestador exclusivo com receita ≤ R$ 120 mil paga 32%.
**Efeito:** paga a mais, nunca a menos (o mesmo raciocínio conservador do F-X7-14), mas a premissa que sustentou a
ratificação está errada. → **Fork F-LP-9.**

**D-2 — Acréscimo da LC 224 tem suspensão judicial por empresa (V-web).** ~~Uma tabela de plataforma não representa
isso.~~ **Correção 2026-10-06 (mesma sessão):** a exceção **já existe** — `CompanyFiscalProfile.lc224AcrescimoSuspenso`
+ `lc224LiminarReferencia` obrigatória (F-TA-5 a; `dtos/CompanyFiscalProfileDto.ts:105-106,135`;
`models/taxAssessmentCalc.ts:357-366`, linha `LC224_SUSPENSO` na memória). Eu tinha listado como lacuna sem ler o
cálculo do Presumido. O que sobra é menor: hoje a flag é ligada por quem edita o perfil fiscal, sem aprovação do
contador. → **F-LP-6** (reescrito).

**D-3 — A tabela de depreciação é semeada uma vez por escopo e nunca se atualiza (verificado no código).**
`DepreciationRateSeedService.seed` sai cedo se `hasAnexoSeed` (`services/DepreciationRateSeedService.ts:30`).
Uma mudança no Anexo III não chega a escopo já semeado. Isso contradiz direto o objetivo "mudança de lei adaptada
imediatamente". Entra no checklist (item 9).

**D-4 — ISS sem mínimo de 2% (inferido).** O DTO aceita `issAliquotaBp` de 0 a 500. A LC 116 art. 8º-A fixa
mínimo de 2%, com exceções (subitens 7.02, 7.05 e 16.01) e com a situação do Simples, em que o ISS vai no DAS.
Não é erro automático, porque 0 pode representar o Simples. → **Pendente de validação externa** (§6, item 2).

**D-5 — Arredondamento sem fonte primária.** Já registrado como P-4 no X7. Só entra aqui porque vira linha da
tabela (§3 item 2) com `fonte` obrigatória: a linha precisa de uma fonte, ou de decisão ratificada citada como fonte.

**D-6 — Listas de CST sem fonte citada e possível ausência do CST 03.** `CST_TRIBUTADO = ['01','02']` não cita a
tabela 4.3.3 da EFD-Contribuições. O CST 03 (tributável por unidade de medida) não está em nenhuma das listas.
→ **Pendente de validação externa** (§6, item 3).

**D-7 — CFOP de imobilizado só cobre 1551/2551.** Falta o 3551 (importação). Sem fonte citada.
→ **Pendente de validação externa** (§6, item 4).

**D-8 — Leiaute da ECD fixo em `9.00`, sem vigência.** Diferente da ECF, que já tem tabela por ano. Um leiaute novo
exige mudança de código. Entra na tabela (§3 item 2).

## 3. Checklist de comportamentos (backend)

Cada item é testável individualmente. A cadeia de camadas, a Factory, o DTO Zod `.strict()` e o registro de rota
são requisitos (Contrato §2/§3), não opção.

1. **Model `LegalParameter` (Prisma first-class, de PLATAFORMA).** Sem `userId`/`unitId`: vale para todos os
   clientes. Append-only: linha publicada nunca muda; uma versão nova a substitui (`supersedesId`). Colunas no §4.
   - Não é DynamicTable: é dado com invariante fiscal (CLAUDE.md, tabela STOP).
   - Não é motor de regras: guarda **números e listas**, nunca lógica ou modelo de lançamento (`R-motor-regras`).
2. **Catálogo fechado de tabelas** (`tabela` enum), uma por fonte de verdade hoje em código: `TAX_ASSESSMENT`
   (itens 1–7, 10), `CSLL_ALIQUOTA` (8), `CODIGO_RECEITA` (9, 14), `PIS_COFINS` (11–13), `PIS_COFINS_MONOFASICO_NCM`
   (15), `CST_PIS_COFINS` (16), `CFOP_IMOBILIZADO` (17), `NFE_CSTAT_AUTORIZADA` (18), `OBRIGACAO_REGIME` (20),
   `LC116_SERVICO` (21), `ISS_LIMITE` (22), `DEPRECIACAO_ANEXO_III` (23), `LEIAUTE_SPED` (24–25),
   `FERIADO_NACIONAL` (26). Tabela fora do enum ⇒ 400. Item 27 fica fora.
3. **`fonte` obrigatória e não vazia em toda linha**, mais `fonteUrl` e/ou `fonteSha256` opcionais. Reusa a convenção
   que os testes-guarda já assertam (ex.: `pisCofinsMonofasicoNcm.test.ts`). Linha sem fonte ⇒ 400.
4. **Lookup puro por data do fato gerador.** `LegalParameterService.vigente(tabela, chave, data, discriminador?)`
   devolve a linha publicada com `vigenteDesde ≤ data ≤ vigenteAte`, a de `vigenteDesde` mais recente. É a mesma
   semântica de `linhaVigente` (`taxAssessmentParams.ts:61`) e de `parametroPisCofinsVigente`, só que lendo do banco.
   Sem linha vigente: mesmo comportamento de hoje (acréscimo LC 224 = 0; o resto ⇒ erro explícito, 400 na prévia).
5. **Cache em memória invalidado na publicação.** Os cálculos são puros e síncronos (`taxAssessmentCalc*.ts`,
   `pisCofinsCalc.ts`); o serviço carrega a fotografia das linhas antes e passa como argumento. Os cálculos não
   passam a consultar o banco. → **F-LP-4** (forma da injeção).
6. **Migração de dado = cópia byte a byte das tabelas TS atuais**, cada linha com a mesma `fonte` e vigência.
   **Teste de paridade:** para cada tabela, o lookup antigo (TS) e o novo (banco) devolvem o mesmo valor em todas as
   chaves e em datas de borda (véspera e dia da vigência). Só depois de verde as tabelas TS são removidas, no mesmo PR.
   Atenção à memória `smoke-gate-s6-x-migracao-de-dado` (o S6 reprova backfill por desenho).
7. **Snapshot por apuração.** Hoje cada apuração grava `tabelaVersao` (string, `taxAssessmentParams.ts:12`,
   `pisCofinsCalc.ts:102`). Passa a gravar a **lista dos ids das linhas usadas** e o hash delas. Recalcular uma
   apuração confirmada usa o snapshot, nunca a tabela atual.
8. **Publicação com fluxo de aprovação.** O admin propõe a linha (status `DRAFT`); a linha só passa a valer depois de
   publicada (`PUBLISHED`). Cada mudança gera evento de auditoria (`legal_parameter.proposed` / `.published` /
   `.revoked`), que entra na allowlist de `auditCanonical.ts` no mesmo PR. → **F-LP-2** (quem publica) e **F-LP-3**
   (dupla checagem).
9. **Depreciação (D-3).** O Anexo III passa a ser uma tabela de plataforma (`DEPRECIACAO_ANEXO_III`). O
   `DepreciationRate` por escopo fica só com as linhas `CUSTOM`. O snapshot da taxa no bem (`FixedAsset.annualRateBp`)
   não muda. **F-LP-8 → (b), ratificado 06/10: migrar e apagar** as linhas `ANEXO_*` por escopo. Ordem obrigatória:
   (1) cada `FixedAsset` que aponta para uma linha `ANEXO_*` passa a apontar para a linha de plataforma equivalente
   (mesmo `sourceRow`); (2) só então a linha por escopo sai. O `annualRateBp` gravado no bem não muda. Teste: bem
   antigo lê a mesma taxa antes e depois; nenhuma referência pendurada. A forma de "apagar" é o **F-LP-10**.
10. **Linha nova retroativa ⇒ recálculo automático (F-LP-5 → b, ratificado 06/10).** Ao publicar uma linha cuja
    vigência alcança período com apuração `CONFIRMED`, o sistema reconfirma a apuração com os parâmetros novos pela
    cascata existente (nova versão `supersedes` a anterior; provisão antiga estornada, nova postada — `atomicUntil`
    do `TaxAssessmentService`, sem padrão novo). Restrições que **não** são escolha (invariantes já em `main`):
    - período `SOFT_CLOSED`/`HARD_CLOSED` ⇒ a reconfirmação fica, a provisão fica **pendente** e aparece (gate de
      período dentro da tx; teste "período fechado ⇒ confirmação fica, provisão pendente");
    - apuração já entregue/paga: a diferença vira aviso visível na apuração ("valor mudou depois do pagamento"); o
      sistema não emite guia complementar sozinho (fora deste nó).
    - o recálculo roda em job idempotente, não na requisição de publicação (publicar não pode falhar por um período
      fechado de um cliente). Teste: publicar linha retroativa ⇒ apuração do período vira nova versão; período
      fechado ⇒ pendente; 2ª execução do job ⇒ nada novo.
11. **Rotas:** `GET /api/legal-parameters` (lista, filtro por tabela e data; qualquer autenticado),
    `GET /api/legal-parameters/vigente` (lookup), `POST /api/legal-parameters` (propor),
    `POST /api/legal-parameters/:id/publish`, `POST /api/legal-parameters/:id/revoke`. Registro em 2 toques
    (`index.ts` + `docs.paths.ts`); guard de path-count do openapi; `public/openapi.json` regenerado.
12. **Policy própria** (`LegalParameterPolicy`), sem reusar `AccountingPolicy` (o escopo é a plataforma, não a
    empresa).
13. **Remoção das constantes soltas:** `PIS_CREDIT_BP`/`COFINS_CREDIT_BP` (`lib/nfeCost.ts:35-36`),
    `FIXED_ASSET_CFOPS`, `CST_*`, `AUTHORIZED_CSTAT`, `SPED_LAYOUT_VERSION`, `ECF_COD_VER_BY_YEAR` e a lista de
    feriados passam a ler da tabela. **Teste-guarda:** nenhum desses símbolos é mais exportado como literal.
14. **Gates acionados pelo diff:** snapshot de shape dos DTOs Zod novos; allowlist de auditoria (item 8); openapi
    (item 11); `resetDb()` passa a limpar `legal_parameters`, ou o teste reaplica o seed. `tsc` limpo nos dois pacotes.

## 4. Contratos (esboço)

```prisma
model LegalParameter {
  id            String    @id @default(cuid())
  tabela        String    // enum fechado do item 2 (validado no DTO; SQLite sem enum nativo no padrão da casa)
  chave         String    // ex.: 'IRPJ_ALIQ', '3004', '1551', '2026-11-20'
  discriminador String?   // ex.: 'SERVICO' | 'REVENDA' | 'CUMULATIVO|PIS' — null quando não há
  valorInt      Int?      // bp ou centavos (convenção atual: bp e *_CENTS)
  valorTexto    String?   // código, CST, leiaute
  valorJson     String?   // linha composta (ex.: matriz OBRIGACAO_REGIME, LC116 com li/grupo)
  fonte         String    // não vazia (item 3)
  fonteUrl      String?
  fonteSha256   String?
  vigenteDesde  String    // YYYY-MM-DD (date-only, memória date-only-regex-nao-valida-calendario)
  vigenteAte    String?   // YYYY-MM-DD inclusive; null = sem fim
  status        String    // 'DRAFT' | 'PUBLISHED' | 'REVOKED'
  supersedesId  String?
  proposedById  String
  publishedById String?
  publishedAt   DateTime?
  createdAt     DateTime  @default(now())

  @@index([tabela, chave, status])
  @@map("legal_parameters")
}
```

```ts
// DTO (Zod 4, .strict()) — esboço
const LegalParameterTabela = z.enum([
  'TAX_ASSESSMENT', 'CSLL_ALIQUOTA', 'CODIGO_RECEITA', 'PIS_COFINS', 'PIS_COFINS_MONOFASICO_NCM', 'CST_PIS_COFINS',
  'CFOP_IMOBILIZADO', 'NFE_CSTAT_AUTORIZADA', 'OBRIGACAO_REGIME', 'LC116_SERVICO', 'ISS_LIMITE',
  'DEPRECIACAO_ANEXO_III', 'LEIAUTE_SPED', 'FERIADO_NACIONAL',
]);
export const ProposeLegalParameterSchema = z.object({
  tabela: LegalParameterTabela,
  chave: z.string().min(1).max(64),
  discriminador: z.string().min(1).max(64).optional(),
  valorInt: z.number().int().optional(),
  valorTexto: z.string().min(1).max(64).optional(),
  valorJson: z.unknown().optional(),           // validado por um schema por tabela (refine)
  fonte: z.string().trim().min(1).max(500),
  fonteUrl: z.string().url().optional(),
  fonteSha256: z.string().regex(/^[0-9a-f]{12,64}$/).optional(),
  vigenteDesde: dateOnly,                       // reusa o helper date-only da casa
  vigenteAte: dateOnly.optional(),
  supersedesId: z.string().optional(),
  motivo: z.string().trim().min(1).max(500),
}).strict().refine((d) => [d.valorInt, d.valorTexto, d.valorJson].filter((v) => v !== undefined).length === 1,
  { message: 'exatamente um de valorInt | valorTexto | valorJson' });

// Saída da apuração (item 7): substitui tabelaVersao: string
interface ParametrosUsados { ids: string[]; sha256: string }
```

## 5. Forks — ratificados 06/10 (questionário), incluindo o F-LP-10

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-LP-0** Registro no vault | (a) criar a nota `docs/plano/nos/LEGAL-PARAMS.md` num fold (`README.md` §Fold), domínio fiscal, fora da régua · (b) anexar ao nó X7 | **(a).** O item atravessa X7, X8, C8, NF-e e pacote; anexar a um nó só esconde o alcance | ✅ (a) — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-1** Ordem de execução | (a) correções D-1/D-3 antes da migração · (b) migração primeiro, correções depois como mudança de dado · (c) juntas | **Parcial, dono, chat, 2026-10-06 (questionário):** D-3 → *"Esperar a tabela no banco"* (resolve pelo item 9, sem instrumentação antes); D-1 segue em BRIEF próprio. A ordem geral continua pendente | ✅ (a) — dono 06/10; D-3 espera a migração, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-2** Quem publica | (a) reusa `Role.ADMIN` (`schema.prisma:150`) · (b) papel novo `PLATFORM_ADMIN` | **(b).** Hoje `ADMIN` gere usuários (`middleware/auth.ts:137`); publicar alíquota para todos os clientes é outro poder e merece papel próprio | ✅ (b) `PLATFORM_ADMIN` — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-3** Dupla checagem na publicação | (a) quem propõe não publica (maker-checker) · (b) um admin faz tudo | **(a).** Erro numa linha atinge todos os clientes de uma vez; é o mesmo padrão do CONT-06 | ✅ **(b) contra a recomendação** — um admin faz tudo; auditoria registra quem — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-4** Como o cálculo recebe os parâmetros | (a) o serviço monta a fotografia e passa às funções puras · (b) as funções consultam o serviço | **(a).** Mantém `taxAssessmentCalc*`/`pisCofinsCalc` puros e com os testes atuais; (b) põe I/O no cálculo | ✅ (a) — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-5** Linha retroativa × apuração confirmada | (a) só aviso, recálculo manual pelo usuário/contador · (b) recálculo automático para `SUPERSEDED` · (c) proibir publicar retroativo | **(a).** O recálculo já existe pela cascata do X7 e passa pelo contador; (b) muda provisão no razão sem ninguém olhar — contra a tese do produto | ✅ **(b) contra a recomendação** — recálculo automático; consequências no item 10 — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-6** Quem liga a suspensão da LC 224 (D-2; a flag já existe) | (a) a mudança de `lc224AcrescimoSuspenso` passa pela política versionada, com o contador aprovando · (b) fica como está (edição do perfil, auditada) | **(a).** Desligar um acréscimo de imposto é decisão que o contador valida (tese do produto); a política versionada hoje cobre `FiscalProfile` da unidade, não `CompanyFiscalProfile` (`AccountingPolicyVersionService.ts:29`) — o alvo novo é parte do trabalho | ✅ **fica como está** + princípio do dono: *"A plataforma vai atualizar os dados fiscais de acordo com a lei sempre, contador apenas valida quando for sair pra fora da plataforma"* — [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-7** Escopo de tela | (a) BRIEF FE separado (`FE-INCR-LEGAL-PARAMS`) · (b) sem tela, publicação por CLI | **(a)** para a lista e o histórico; a publicação pode começar por CLI se o FE atrasar | ✅ (a) `FE-INCR-LEGAL-PARAMS` — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-8** Linhas `ANEXO_*` já semeadas em `DepreciationRate` (D-3) | (a) ficam como estão (são referenciadas por snapshot) e deixam de ser lidas para bem novo · (b) migrar e apagar | **(a).** Apagar quebra a leitura do bem antigo (`hiddenAt` existe justamente para isso) | ✅ **(b) contra a recomendação** — migrar e apagar; ver item 9 e F-LP-10 — dono 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-10** Forma do "apagar" do F-LP-8 | (a) soft-delete (`hiddenAt`, já existe no model) depois do repoint · (b) delete físico depois do repoint | **(a).** O contrato da casa é soft-delete (CLAUDE.md, padrões de camada); o efeito para o usuário é o mesmo (a linha some da lista) e o histórico fica | ✅ **(b) contra a recomendação** — delete físico, só depois do repoint (item 9, ordem obrigatória) — dono, chat, 06/10, [D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md) |
| **F-LP-9** D-1 — 16% no Presumido | (a) reabrir o F-X7-14 e modelar o art. 215 §§ 10–11 · (b) manter 32% e corrigir só o texto do ADR · (c) adiar até haver cliente que se qualifique | ✅ **Dono, chat, 2026-10-06 (questionário): "Errata + BRIEF do 16%"** — errata aplicada no ADR; BRIEF em [`BE-INCR-TAX-PRESUMIDO-16-brief.md`](BE-INCR-TAX-PRESUMIDO-16-brief.md) (forks F-P16 pendentes; sem 'executa') | DECIDIDO |

## 6. Pendente de validação externa (contador ou fonte primária)

1. **Itens com grau C** (§1): reconferir contra o DOU/RFB antes de publicar como linha. Ao menos 9, 13, 14, 18 e 21,
   que têm vencimento ou versão.
2. **D-4 ISS mínimo 2%:** a validação deve existir? E como tratar o Simples e os subitens 7.02, 7.05 e 16.01?
3. **D-6 CST 03:** gera crédito para quem não é revendedor de monofásico? Quais CSTs entram em "tributado"? Fonte:
   tabela 4.3.3 da EFD-Contribuições.
4. **D-7 CFOP 3551:** incluir? Há outros CFOPs de entrada para o ativo imobilizado a considerar?
5. **LC 224:** conferir no DOU o texto da IN RFB 2.305/2025 e da IN 2.306/2026 citados no código (aqui só V-web por
   imprensa especializada).

## 7. Insumos ausentes

- Texto da Lei 7.689/1988 no Planalto (a busca direta falhou com ECONNRESET; o grau do item 8 é V-web secundário).
- A IN RFB 2.305/2025 e a LC 214/2025 não estão no corpus `fontes-oficiais/`.
- Não li as decisões ratificadas uma a uma (cerca de 20 BRIEFs de contabilidade). O pente fino cobriu **coeficientes
  e tabelas**; as **decisões** só foram conferidas onde tocavam um coeficiente (caso do D-1). Decisões puramente
  procedimentais (ex.: F-GOV-*, F-CD*) ficaram fora.

## 8. Achados fora de escopo (não planejados)

- **Permissões sem contador** em apuração, e-Lalur, fechamento definitivo e aprovação de lançamento
  (`AccountingPolicy.ts:88` já prevê a troca "quando o GOV-CONTADOR for executado"). Pertence ao nó GOV-CONTADOR.
- **Simples Nacional:** não há cálculo de DAS no código. A mudança de 2027 (LC 214) está no PRE-ADR #452; não entra aqui.
- **Leiaute da DPS da NFS-e** (v1.01) e a lista LC 116 gerada dele: versão nova do leiaute exige regerar
  (`lc116ListaNacional.ts:9`). A tabela de banco resolve o dado, não a mudança de leiaute (estrutura).
