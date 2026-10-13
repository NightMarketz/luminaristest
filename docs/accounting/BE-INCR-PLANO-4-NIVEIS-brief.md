# BE-INCR-PLANO-4-NIVEIS: plano de contas canônico com analítica patrimonial no nível ≥ 4 (L8 do H1). BRIEF

> **Sessão:** `sessao-planejamento`, 2026-10-13, base `origin/main` `c00e7b8e` (com o #642). **Sem código.**
> ADR irmão (Proposed): [`ADR-PLANO-CONTAS-4-NIVEIS.md`](../adr/ADR-PLANO-CONTAS-4-NIVEIS.md).
>
> **Em duas linhas:** o PVA da ECD recusa analítica de Ativo, Passivo ou PL abaixo do nível 4. As 9 analíticas
> patrimoniais do plano canônico estão no nível 3, e as sintéticas `1.1` e `2.1` não existem. Isso gerou 17 dos 23 erros
> da tentativa 2 do H1. O incremento aprofunda só a parte patrimonial do plano e migra os tenants instalados.
>
> **Risco principal:** o código da conta é a chave usada em todo lugar: constantes, mappers da venda, AP/AR, bindings
> compilados, kit e caixa do DFC. Uma migração parcial, ou um `ensureChartOfAccounts` rodando antes dela, cria a conta
> nova vazia ao lado da antiga, que fica com o saldo. O resultado é razão partido em silêncio.

## 0. Contexto fixo

- **Item:** L8 do [`RUNBOOK-H1-PVA`](RUNBOOK-H1-PVA.md), passo 4, tentativa 2 (13/10), e linha L8 do
  `docs/operating-manual/GAP-MAP.md` (`[ABERTO]`, "vai a sessão de planejamento"). Gate [[H1]].
- **Autorização (citável):** dono, chat, 13/10. No questionário pós-tentativa 2, sobre a L8, ele escolheu *"Aprofundar o
  plano canônico (Recommended)"*, cuja descrição era *"ADR + BRIEF: o plano canônico ganha as sintéticas intermediárias
  (ex.: 1 Ativo › 1.1 Circulante › 1.1.1 Disponível › 1.1.1.01 Banco) e uma migração para os tenants já instalados"*.
  Depois mandou *"abrir o planejamento da L8"*.
  **Cobertura:** ADR + BRIEF, sem "executa". Código só depois da ratificação dos forks abaixo e de um "executa".
- **Regra oficial:**
  - [Manual da ECD, Leiaute 9, jan/2026 (ADE Cofis 01/2026)](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/sped/ecd)
    (PDF fornecido pelo dono, sha256 `7ddf4775…`, decisão `D-2026-09-23-MANUAL-ECD-L9-VIGENTE`), p. 119,
    `REGRA_VALIDA_NIVEL_CONTAS`. Com `I010.IND_ESC` G/R/B, conta **analítica** (`IND_CTA = A`) de `COD_NAT` 01
    (ativo), 02 (passivo) ou 03 (PL) precisa de `NIVEL ≥ 4`. A mensagem do PVA cita a Res. CFC 1.299/2010.
    **As contas de resultado (04) ficam fora da regra.**
  - [Lei 6.404/1976, art. 178](https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm), redação da Lei 11.941/2009
    (lida no Planalto em 13/10). O §1º divide o ativo em "I – ativo circulante" e "II – ativo não circulante"; o §2º
    divide o passivo em "I – passivo circulante", "II – passivo não circulante" e "III – patrimônio líquido".
- **Evidência do PVA:** RUNBOOK-H1, tentativa 2. Foram 9 erros "mínimo 4 níveis" (1.1.1–1.1.6, 2.1.1, 2.1.2, 2.3.1), 8
  "Campo obrigatório não preenchido" em `COD_CTA_SUP` (as mesmas, menos a 2.3.1) e 8 advertências "natureza da superior".
- **Código lido (insumos):**
  - `features/accounting/fixtures/ChartOfAccountsFixture.ts`, todo. Tem 21 contas e as constantes
    `RETAINED_EARNINGS_CODE '2.3.1'`, `FORNECEDORES_A_PAGAR_CODE '2.1.2'`, `CLIENTES_A_RECEBER_CODE '1.1.5'`,
    `ESTOQUES_CODE '1.1.6'`, `CMV_CODE '4.2'` e `RECEITA_NAO_USO_CODE '3.4'`. A hierarquia é **pela chave codificada,
    sem `parentId`** (Contrato §2.1).
  - `services/SpedGenerationService.ts:61-68`: `codeLevel` (nível = número de segmentos) e o pai por prefixo.
  - `services/PostingService.ts:156-180`: `ensureChartOfAccounts` faz **create-if-missing por `code`**.
  - `services/StatementMappingFixture.ts:16-33`: o BP mapeia por **natureza** (não muda); a DRE mapeia por
    `codePrefix` 3.x/4.x (não muda).
  - Códigos patrimoniais **literais em produção**:
    - `CashFlowReportService.ts:25` (`CASH_ACCOUNT_CODE_PREFIXES ['1.1.1','1.1.3']`);
    - `Payable.model.ts:103-106` e `Receivable.model.ts:61-64` (caixa por método);
    - `sync/mappers/SaleCogsMapper.ts:30`, `SaleFinalizedMapper.ts:22`, `SalePackageSoldMapper.ts:21-22`,
      `SaleReturnedMapper.ts:22` e `SaleSettledMapper.ts:27-40`;
    - `accountingBinding/fixtures/saleBinding.ts` e `clinicBinding.ts` (chart do binding + `accountCode` por papel);
    - `sectorKits/kits/_shared/referencial2025Canonico.ts` (de-para por `accountCode`);
    - `jobs/seedAccountingFixtureCli.ts`;
    - `sync/bridges/CrmReceivableBridge.ts`.
  - `prisma/schema.prisma:1343-1353`: `AccountingBinding.payload` é JSON com `accountCode`, e `compiledFromHash` é o
    hash do chart do tenant na compilação. Renomear o código deixa o binding stale.
  - Testes com código patrimonial literal: `'1.1.1'` aparece em 56 arquivos de teste, `'1.1.2'` em 25, `'1.1.6'` em 18,
    `'2.1.1'` em 14 (contagem por `grep -l`, 13/10).
- **Nós vizinhos:**
  - Consome [[KIT-SETOR]] (kit v2 com o referencial por código), [[P1]] (binding do salão), [[P2]] (binding da clínica) e
    [[SEED-MY]]/[[SEED-UNITS]] (fixture do seed).
  - Destrava o passo 4 do [[H1]] e, por consequência, o [[H3]] (clínica, mesmo chart).
  - Toca a ECF Real só pelo I050 da ECD recuperada; o mapeamento L100A é por `accountId` e não muda.

## 1. Esqueleto

1. Plano canônico patrimonial com 4 níveis (fixture) + sintéticas intermediárias.
2. Constantes e literais de código migram para as constantes do fixture (uma fonte).
3. Bindings (salão e clínica) e kit v2 seguem o código novo.
4. Migração de dados dos tenants instalados (renomear no lugar, criar sintéticas, recompilar binding).
5. Guarda contra regressão: conta analítica patrimonial nova com nível < 4 é 400.
6. ECD: `NIVEL`/`COD_CTA_SUP` coerentes (já derivam do código, então basta o item 1).
7. Prova: guardas automáticos + tentativa 3 do H1 no PVA.

## 2. Checklist

> Cada item é testável sozinho. A árvore do item 1 depende do **F-L8-1** e do **F-L8-2**. O texto abaixo segue a
> recomendação (a) dos dois e muda se o dono ratificar outra opção.

### PR-1: fixture + uma fonte para os códigos (sem dado de tenant)

1. **Árvore patrimonial em 4 níveis** no `CANONICAL_ACCOUNTS`, pela recomendação do F-L8-2 (a). As sintéticas ficam
   com `acceptsEntries: false`:

   | Novo | Nome | Tipo | Era |
   |---|---|---|---|
   | `1` | Ativo | S | `1` |
   | `1.1` | Ativo Circulante | S | — (nova) |
   | `1.1.1` | Disponível | S | — (o código `1.1.1` **muda de papel**, ver F-L8-3) |
   | `1.1.1.01` | Banco | A | `1.1.1` |
   | `1.1.1.02` | Caixa | A | `1.1.3` |
   | `1.1.2` | Créditos | S | — (o código `1.1.2` muda de papel) |
   | `1.1.2.01` | A Receber | A | `1.1.2` |
   | `1.1.2.02` | A Receber Cartão / Adquirente | A | `1.1.4` |
   | `1.1.2.03` | Clientes a Receber | A | `1.1.5` |
   | `1.1.3` | Estoques | S | — (o código `1.1.3` muda de papel) |
   | `1.1.3.01` | Mercadorias para Revenda | A | `1.1.6` |
   | `2` | Passivo | S | `2` |
   | `2.1` | Passivo Circulante | S | — (nova) |
   | `2.1.1` | Obrigações com Clientes | S | — (muda de papel) |
   | `2.1.1.01` | Pacotes Pré-pagos | A | `2.1.1` |
   | `2.1.2` | Fornecedores | S | — (muda de papel) |
   | `2.1.2.01` | Fornecedores a Pagar | A | `2.1.2` |
   | `2.3` | Patrimônio Líquido | S | `2.3` |
   | `2.3.1` | Lucros ou Prejuízos Acumulados | S | — (muda de papel) |
   | `2.3.1.01` | Lucros ou Prejuízos Acumulados | A | `2.3.1` |

   As contas de resultado `3`, `3.1`–`3.4`, `4`, `4.1` e `4.2` **não mudam**, porque a regra do PVA não alcança
   `COD_NAT 04`.
   **Teste:** toda analítica Asset/Liability/Equity do fixture tem ≥ 4 segmentos, e todo prefixo de código existe como
   sintética da mesma natureza. O teste varre o fixture; não é uma lista fixa.
2. **Constantes atualizadas:**
   - `RETAINED_EARNINGS_CODE` passa a `'2.3.1.01'`, `FORNECEDORES_A_PAGAR_CODE` a `'2.1.2.01'`,
     `CLIENTES_A_RECEBER_CODE` a `'1.1.2.03'` e `ESTOQUES_CODE` a `'1.1.3.01'`.
   - Entram constantes novas para Banco, Caixa, A Receber, Cartão/Adquirente e Pacotes Pré-pagos.
   - **Todo literal patrimonial de produção listado no §0 passa a importar a constante.**
   - **Teste-guarda de varredura:** nenhum `'1.1.[0-9]'` ou `'2.[13].[0-9]'` literal fora do fixture em `server/src`
     (exceto `__tests__`). É a classe `auditAllowlistCoverage`: cruza a fonte em vez de confiar na lista.
3. **DFC:** `CASH_ACCOUNT_CODE_PREFIXES` passa a `['1.1.1']`, o prefixo da sintética Disponível, que cobre Banco e Caixa.
   **Teste:** o caixa do DFC soma Banco + Caixa e mais nada.
4. **Bindings:** o chart do binding e os `accountCode` por papel em `saleBinding.ts` e `clinicBinding.ts` passam aos
   códigos novos. Os testes de compilação do binding continuam verdes.
5. **Kit v2:** `referencial2025Canonico.ts` passa a usar `accountCode` novo. Os códigos referenciais (`1.01.01.02.01`
   etc.) não mudam. **Teste:** o kit instala 15/15 cobertos.
6. **Guarda de criação:** o DTO/serviço de criação de conta recusa (400) analítica Asset/Liability/Equity com menos de 4
   segmentos e recusa código cujo prefixo não existe como sintética. A regra é a do Manual p. 119, aplicada na origem.
   **Teste de rejeição no DTO e no serviço**, com snapshot de shape atualizado se o DTO mudar.
7. **Testes existentes:** os ~56 arquivos com código literal passam a usar as constantes do fixture. A troca é mecânica;
   nenhuma asserção muda de sentido.

### PR-2: migração dos tenants instalados (dado)

8. **Migração de dados idempotente** (`scripts/`, rodando por tenant/unidade, **antes** de subir o código do PR-1, ver
   F-L8-4). Para cada unidade com o chart canônico:
   - (a) cria as sintéticas novas que faltam;
   - (b) **renomeia no lugar** cada analítica antiga para o código novo (`UPDATE accounts SET code` por `id`). Lançamentos,
     de-para referencial e subrazões apontam para o `id` e ficam intactos;
   - (c) a ordem é renomear primeiro a analítica `1.1.1` → `1.1.1.01` e só depois criar a sintética `1.1.1`, para não
     colidir no `@@unique`.

   **Teste de integração sobre cópia de banco semeado:**
   - Σ saldo por conta é igual antes e depois (por `id`);
   - nenhuma conta nova vazia ao lado da antiga;
   - rodar duas vezes não muda nada.
9. **Bindings Active recompilados:** depois da renomeação, cada `AccountingBinding` Active do tenant fica stale
   (`compiledFromHash`). A migração recompila e ativa o binding novo; o antigo vira `Superseded`. Sem isso, a próxima
   venda postaria no código antigo, que não existe mais, e daria 400 alto, não silencioso. Mesmo assim, a recompilação
   faz parte da migração. **Teste:** depois da migração, uma venda posta em `1.1.2.01`.
10. **Conta personalizada do tenant:** uma analítica patrimonial criada pelo usuário fora do canônico (ex.: `1.1.7`)
    não é renomeada automaticamente; a migração **lista** essas contas no relatório (F-L8-5).
11. **Prova sobre o `dev.db` real** (cópia): `scripts/smoke-migration-gate.mjs` + Σ saldo por conta igual + a ECD gerada
    sem `NIVEL < 4` em nenhum I050 patrimonial.

### Documentação

12. RUNBOOK-H1: a tentativa 3 passa a ter a migração como pré-condição (P2b).
13. GAP-MAP L8: `[ABERTO]` → `[CORRIGIDO]` no PR-1/PR-2, com a referência dos testes.

## 3. Contratos

```ts
// ChartOfAccountsFixture.ts — forma não muda; só os dados
export interface CanonicalAccount { code: string; name: string; nature: AccountNature; acceptsEntries: boolean }

// Invariante nova (teste do fixture e guarda de criação)
// analítica patrimonial ⇒ segments(code) >= 4
// ∀ prefixo p de code (p ≠ code) ⇒ existe conta sintética p com a mesma natureza
const PATRIMONIAL: AccountNature[] = ['Asset', 'Liability', 'Equity'];

// Migração (script) — entrada e saída
interface RenomeacaoCanonica { de: string; para: string }          // tabela fixa versionada
interface RelatorioMigracaoUnidade {
  unitId: string;
  criadas: string[];               // sintéticas novas
  renomeadas: RenomeacaoCanonica[];
  personalizadasNaoTocadas: { code: string; name: string }[];   // F-L8-5
  bindingRecompilado: { de: string; para: string } | null;      // ids de AccountingBinding
  saldoAntesDepoisIgual: boolean;  // Σ por accountId
}
```

## 4. Forks

> **RATIFICADOS — dono, chat, 2026-10-13 (questionário):** F-L8-1 → (a) *"Renomear para 4 segmentos"*; F-L8-2 → (a) *"Grupos do art. 178"*; F-L8-4 → (a) *"Script de dado antes do deploy"*; F-L8-3, F-L8-5, F-L8-6 → (a) *"Aceito as três"*. Todos na recomendação. **Código continua exigindo "executa"** (ORCH-006).

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-L8-1** | Como chegar a 4 níveis | (a) **renomear** as analíticas para 4 segmentos, mantendo a hierarquia pela chave codificada (Contrato §2.1); (b) manter os códigos e criar `parentCode`/nível explícitos no `Account` (schema novo; o nível deixa de vir do código; o I050 lê a árvore) | **(a)**. É o contrato atual (sem `parentId`), não mexe em schema e não existe cliente real ainda, então nenhum livro entregue usa o código velho. A (b) deixa um código `1.1.1` no nível 4 com superior de outro formato, o que um contador estranharia, e muda o Contrato §2.1. |
| **F-L8-2** | Árvore | (a) **agrupamento semântico** pelo art. 178 (Disponível / Créditos / Estoques; Obrigações com Clientes / Fornecedores), tabela do §2 item 1; (b) **sufixo mecânico**: cada analítica `c` vira `c.01` e `c` vira sintética de um filho só (ex.: `1.1.3` "Caixa" (S) › `1.1.3.01` "Caixa") | **(a)**. É o que o contador espera ver e o que agrega no BP. A (b) é menor (só sufixo), mas gera 9 grupos de uma conta cada. |
| **F-L8-3** | Reuso de código com papel novo (`1.1.1` deixa de ser Banco e vira Disponível) | (a) **aceitar o reuso** (o literal antigo que sobrar aponta para uma sintética, `acceptsEntries = false`, e o post falha **alto**); (b) sintéticas em formato que nunca colide (ex.: `1.1.01` Disponível › `1.1.01.01` Banco) | **(a)**, com o teste de varredura do item 2 garantindo que nenhum literal antigo sobra. A (b) mistura formatos de segmento no mesmo plano. |
| **F-L8-4** | Ordem migração × deploy | (a) **migração de dados antes** do código novo, num script separado do `deploy:migrate` (como a etapa separada do ADR-M2); (b) migração embutida no `ensureChartOfAccounts` (renomeia ao ver o código antigo) | **(a)**. A (b) espalha escrita de dado num caminho quente e repete o risco de "conta nova vazia" se a detecção falhar. A migração SQLite não é transacional (memória `migracao-sqlite-nao-e-transacional`), então o script precisa de prólogo idempotente. |
| **F-L8-5** | Analítica patrimonial **personalizada** pelo tenant (fora do canônico) | (a) **não renomear; listar** no relatório e o dono/contador decide; (b) renomear para `<código>.01` com uma sintética do mesmo nome | **(a)**. Mexer no plano próprio do cliente é decisão contábil dele. Hoje não há cliente real, então a lista do `dev.db` é a prova. |
| **F-L8-6** | ECD de exercício já entregue com o plano velho | (a) **fora de escopo**: nenhum tenant tem ECD transmitida (o H1 nunca passou; não há cliente real); registrar que a 1ª ECD após a mudança, para quem já tiver entregue, exige `0000.IND_MUDANC_PC = 1` + I157; (b) implementar o I157 agora | **(a)**, condicionado à verificação do insumo ausente §6.1. |

## 5. Pendente de validação externa

- **Nomes e agrupamento da árvore (F-L8-2):** a estrutura segue o art. 178 da Lei 6.404 (grupos) e o Manual da ECD
  (nível). Os **nomes** das sintéticas ("Disponível", "Créditos", "Obrigações com Clientes") são prática contábil
  corrente, mas não estão em norma. O contador valida; enquanto isso, entram como estão.
- **Conta de PL para o exercício corrente:** hoje existe só "Lucros ou Prejuízos Acumulados". Capital Social e as
  reservas do art. 178 §2º III não existem no canônico. Não são exigidos pelo PVA para este erro e ficam fora (achado
  §7).

## 6. Insumos ausentes

1. **Existe ECD transmitida por algum tenant?** É preciso ler `AccountingDeliveryItem` e os jobs `EXPORT_SPED_ECD` no
   ambiente de produção (M2 ainda não subiu). Hoje só existe o `dev.db`. Sem esse dado, o F-L8-6 (a) é inferido.
2. **Contas personalizadas patrimoniais no `dev.db` real:** a lista sai do relatório da migração (item 10), mas não foi
   levantada nesta sessão.

## 7. Achados fora de escopo (não planejados)

- PL do canônico sem Capital Social e sem reservas (Lei 6.404 art. 178 §2º III). O BP de uma sociedade real vai precisar
  disso; é outro incremento.
- Ativo e passivo não circulante (imobilizado do C8, por exemplo) usam códigos próprios? Não foi levantado se o C8 cria
  contas `1.2.x` fora do canônico. Se criar, elas caem na mesma regra de 4 níveis.
- As 11 advertências "I155 zerado" (2.3.1 nos meses sem movimento) continuam depois da L8; são advertências.

## Grau

- **Verificado:**
  - regra do PVA (Manual p. 119 + tentativa 2);
  - art. 178 (Planalto, 13/10);
  - hierarquia por código e `codeLevel` (leitura);
  - literais de produção (grep + leitura, listados no §0);
  - `ensureChartOfAccounts` create-if-missing por código (leitura);
  - binding com `compiledFromHash` (schema).
- **Inferido:**
  - ninguém transmitiu ECD (F-L8-6);
  - os nomes das sintéticas são aceitos pelo contador;
  - a contagem de arquivos de teste é aproximada (grep `-l`).
