# BE-INCR-PAIS-NA-BORDA-F3 — a plataforma de parâmetros legais deixa de conhecer os domínios

- **Data:** 2026-11-24
- **Nó:** [[PAIS-NA-BORDA]], fatia **F3** (`docs/adr/ADR-PAIS-NA-BORDA.md` §5).
- **Estado:** BRIEF escrito, **forks F-F3-1..5 com RATIFICAÇÃO PENDENTE**, sem `executa`. Nenhum código.
- **Base:** branch `claude/adr-pais-na-borda-emendas` (PR #1338, aberto em 24/11). Este BRIEF depende do texto do ADR que
  aquele PR traz.
- **Sessão:** `sessao-planejamento`.

## TLDR (2 linhas)

O `formatoLinha.ts` sai da plataforma. Cada domínio, e dentro dele cada país, declara os formatos das suas tabelas num
arquivo de `features/<dominio>/paises/br/legalParameters/`, e o `lib/factory.ts` entrega a lista ao `LegalParameterService`.
O contrato já serve à `PRAZO_OBRIGACAO` do ciclo e às 6 tabelas da ponte do DP, inclusive à checagem entre tabelas.
**Risco principal:** a F3 cria a primeira pasta `paises/`. Se ela andar antes do PR-0 do montador, a pasta nasce sem a
guarda `P1` (F-F3-4). Ao fim da F3 a plataforma ainda importa três coisas da contabilidade: `dates`, `AuditService` e
`AccountingScope`, que são da F2. Por isso a prova da lacuna `0d37` só fica verde inteira depois da F2 (§0.2).

---

## 0. Formulário

### 0.1 Contexto fixo

- **Item a planejar:** a fatia F3 do `ADR-PAIS-NA-BORDA` §5, linha "F3 | Plataforma de parâmetros legais não conhece
  domínio". Escopo da linha: *"`formatoLinha.ts` deixa de importar 7 modelos da contabilidade e de definir os formatos do
  DP: cada domínio, e dentro dele cada país, registra os formatos das suas tabelas (`0d37`)"*. Prazo: *"antes do PR-0 do
  ciclo e do PR-P0 da ponte, se o F-PBA-7 for (a)"*.
- **Autorização:**
  - Cédula `D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS`: F-PBA-7, resposta *"Fatia F3 antes"* ⇒ (a), *"a F3 (registro de
    formato por domínio e país) entra antes do PR-0 do ciclo e do PR-P0 da ponte"*. F-PBA-6, *"Aceito esses prazos"* ⇒
    (a), com os prazos e o dono do ADR §5.
  - ADR §5: *"Cada fatia tem BRIEF próprio (sessão de planejamento), `executa` próprio e prazo"*.
  - Nota do nó, `estado_detalhe`: *"Próximo: BRIEF da F1 … e o da F3"*.
  - **Cobertura:** a autorização cobre escrever este BRIEF e mais nada. O `autorizacao` do nó diz *"não é executa de
    nenhuma fatia"*, então o código da F3 espera o `executa` do dono sobre este BRIEF.
  - **Divergência de escopo, reportada (sequência, passo 1):** o pedido diz "a plataforma deixa de conhecer os domínios",
    e isso é mais largo que a linha do ADR, que fala de formatos. O §0.2 separa o que entra na F3, o que é de outra
    fatia e o que vira fork.
- **Insumos (lidos em 24/11, na base acima):**
  - `server/src/features/legalParameters/models/formatoLinha.ts` (496 linhas: imports `:1-22`, `REGRAS` `:175-484`,
    `erroDeFormato` `:486-494`, `TEM_REGRA_DE_FORMATO` `:496`).
  - `models/legalParameter.ts` (`LEGAL_PARAMETER_TABELAS` `:9-87`, com 46 nomes; `TABELAS_MIGRADAS` `:97`; o lookup puro
    `:122-232`).
  - `services/LegalParameterService.ts` (`erroDoFormato` com o fallback `:37-47`; `exigirFormato` no `propose` `:215` e
    no `publish` `:270`, dentro da tx; `aquecer` `:150-153`; `linhasPublicadasForaDoFormato` `:160-170`).
  - `dtos/LegalParameterDto.ts` (`tabela = z.enum(LEGAL_PARAMETER_TABELAS)` `:10`).
  - `src/jobs/checkLegalParamsFormatoCli.ts` e o teste dele.
  - `src/lib/factory.ts:1304-1309` (construção do serviço).
  - `src/routes/legalParameters.ts:17-22`.
  - `server/.dependency-cruiser.cjs` (regras `L1`–`L6`, `F1`, `X1`, `X3`).
  - Os BRIEFs `BE-INCR-CICLO-FISCAL` (PR-0 item 1, §7, write-set) e `BE-INCR-DP-PONTE-RAZAO` (PR-P0 itens 1–3, PR-P1
    item 7, §5.2, write-set).
  - As lacunas `L-20261114-222614-0d37`, `-222632-675c` e `-214052-b25f`.
  - O BRIEF `BE-INCR-LEGAL-REGRAS` (PR #1334; ML-9, F-ML-0, F-ML-13).
  - No front: `my-app/types/contracts/legalParameters/LegalParameterDto.gen.ts:4`, `my-app/features/accounting/lib/legalParameters.ts:9-14`.
- **Nós vizinhos:**
  - **Consome:** o ADR (R2 b, R3, R6, `P1`). A guarda `P1` é a F0, item 0 do PR-0 do montador (`EFICIENCIA-FISCAL`).
  - **É consumida por:**
    - `CICLO-FISCAL` PR-0 item 1: tabela `PRAZO_OBRIGACAO`, formato em
      `features/accounting/paises/br/legalParameters/prazoObrigacao.ts`, e *"o `checkLegalParamsFormatoCli` lê o
      registro"*.
    - `PES-4` / `BE-INCR-DP-PONTE-RAZAO` PR-P0 itens 1–3 e PR-P1 item 7: seis tabelas, formatos em
      `features/dp/paises/br/legalParameters/formatosEncargos.ts`, *"grau nas chaves de `RAT_ALIQUOTA`, FAP entre os
      `FAP_LIMITES` vigentes, FPAS com linha em `TERCEIROS_FPAS`"*.
  - **Vizinho com fork pendente:** `LEGAL-REGRAS` (F-ML-0 pendente; ML-9 é um registro por domínio de mesmo molde, chaveado
    por `(jurisdicao, chave)`). O contrato daqui **não** depende dele (§4.4).

### 0.2 Recorte: o que a F3 fecha e o que fica

| O que a plataforma conhece hoje (lido) | Onde | Destino |
|---|---|---|
| 7 imports de modelos da contabilidade | `formatoLinha.ts:2-21` (`dates`, `regimeEmpresa`, `obrigacoesPorRegime`, `ibsCbsParams`, `simplesCalc`, `retencaoParams`, `segregacaoNcm`) | **F3** (o registro vai para a borda) |
| Formatos do DP (`FOLHA_REGRA`, `DP_CATEGORIA_ENCARGO`, `ESOCIAL_*`, `INSS_EMPREGADO`) | `formatoLinha.ts:100-152` e as regras correspondentes em `REGRAS` | **F3** |
| As 40 regras de `REGRAS` | `formatoLinha.ts:175-484` | **F3** |
| Fallback do PR-1, que nomeia tabelas da contabilidade (`TAX_ASSESSMENT/ARREDONDAMENTO` em texto, `PIS_COFINS` com chave e discriminador, inteiro para o resto) | `LegalParameterService.ts:37-47` | **F3**: é formato, e cobre as 6 tabelas sem regra (`TAX_ASSESSMENT`, `CSLL_ALIQUOTA`, `PIS_COFINS`, `SIMPLES_LIMITE`, `SIMEI_VALOR`, `SALARIO_MINIMO`, contadas em 24/11) |
| Catálogo fechado dos 46 nomes de tabela | `legalParameter.ts:9-87`, DTO `:10` | **fork F-F3-1** |
| `isValidDateOnly` de `accounting/models/dates` | `LegalParameterDto.ts:2` e `formatoLinha.ts:2` | **F2** para o DTO (primitiva `dates`, ADR §5 linha F2). Na F3 a importação do `formatoLinha.ts` some junto com ele |
| `AuditService` e `AccountingScope` (type-only) | `LegalParameterService.ts:3-4` | **F2** (`b556`) |
| Vigência escrita em código (`675c`, `b25f`) | `features/accounting/**` | **fora**: espera o F-ML-0 do `LEGAL-REGRAS` (pedido da tarefa; ADR §5 linha F3) |

**Prova da `0d37` ao fim da F3.** O `comoProvar` dela é uma regra *"`features/legalParameters/**` não importa
`features/accounting/**` nem `features/dp/**`"* que *"falharia hoje em 3 arquivos"*. Ao fim da F3 restam 2 arquivos e 3
arestas: `LegalParameterDto.ts:2`, `LegalParameterService.ts:3` e `:4`, todas da F2. O F-F3-3 decide como a regra nasce com
esse resíduo nomeado.

---

## 1. Fatos lidos que o desenho respeita

1. **O formato é validado em três lugares:** no `propose`, fora da tx (`:215`); no `publish`, dentro da tx (`:270`); e no
   CLI, sobre as linhas `PUBLISHED` (`:160-170`). O CLI só lê e sai 1 se houver linha fora do formato. Ele não chama o
   `formatoLinha.ts` direto: chama o serviço.
2. **A regra de hoje vê uma linha só:** `Regra.checar(l: LinhaParaFormato)` (`:155-160`). Nenhuma regra lê outra tabela.
3. **Sete arquivos de produção fora da plataforma importam do `formatoLinha.ts`.**
   - `accounting/models/FixedAsset.model.ts:7`: `DepreciacaoAnexoJson`.
   - `accounting/models/meiAnexoXi.ts:7`: `MeiAnexoXiJson`.
   - `accounting/models/taxAssessmentParams.ts:11`: o tipo `NomeCodigoReceita`.
   - `dp/models/escala.ts:11`: `DIAS_SEMANA`.
   - `dp/models/folha/fracao.ts:9`: o tipo `FOLHA_REGRA_CHAVES_TEXTO`.
   - `dp/models/parametrosFolha.ts:11`: `InssEmpregadoFaixaJson`.
   - `dp/models/regrasFolha.ts:12-16`: `DpCategoriaEncargoJson`, `FOLHA_REGRA_CHAVES_TEXTO` e os dois tipos de chave.

   Mais cerca de 30 testes chamam `erroDeFormato(l)` (grep de 24/11). Todos esses importadores são código do centro
   (legado BR fora de `paises/`), então **não podem** importar `paises/br/**` (`P1`, R3).
4. **Leitores de cada tabela:** grep de 24/11 por literal `'<TABELA>'` em produção fora da plataforma. Isto é
   localização, não leitura.
   - Só a contabilidade lê 33 tabelas (`lib/` puro também lê algumas).
   - O DP lê `INSS_EMPREGADO`, `ESOCIAL_CATEGORIA`, `ESOCIAL_MOTIVO_AFASTAMENTO`, `FOLHA_REGRA`, `DP_CATEGORIA_ENCARGO` e
     `ESOCIAL_TIPO_DEPENDENTE`. Para `ESOCIAL_NATUREZA_RUBRICA` e `ESOCIAL_INCIDENCIA_RUBRICA` não apareceu literal; o
     comentário do enum (`legalParameter.ts:71-73`) dá o cadastro do DP como consumidor.
   - **Dois domínios leem cinco tabelas:** `SALARIO_MINIMO`, `IRRF_PF_MENSAL` e `ENCARGO_FOLHA` (contabilidade e DP);
     `FERIADO_NACIONAL` e `FERIADO_LOCAL` (contabilidade e `packages`).
5. **O tipo `LegalParameterTabela`** aparece em 5 arquivos de produção fora da plataforma (`SimplesApuracaoService`,
   `TaxSimulationService`, `WithholdingService`, `dp/models/parametrosFolha.ts`, `dp/models/regrasFolha.ts`) e em 8 testes.
6. **O front copia o enum:** `my-app/features/accounting/lib/legalParameters.ts:9-14` tem
   `LEGAL_PARAMETER_TABELAS … satisfies readonly ProposeLegalParameterInput['tabela'][]`, e o tipo gerado
   (`LegalParameterDto.gen.ts:4`) é a união dos 46 nomes.
7. **`lib/factory.ts` é o único arquivo de `lib/` que pode importar lógica de feature** (`X1`). Um arquivo em
   `paises/<cc>/legalParameters/` conta como lógica de feature (`FEATURE_LOGIC` só exclui `models/`), então só a factory e
   os testes o importam. Teste unitário que importa `lib/factory` já existe (`crmController.test.ts` e outros).
8. **Nenhuma regra de camada cobre `paises/<cc>/legalParameters/`.** `L6` casa só `/(models|dtos)/`, então hoje um arquivo
   nessa pasta poderia importar um repositório sem reprovação.

---

## 2. Ordem e precondições

- **Antes de:** ciclo PR-0 e ponte PR-P0. F-PBA-7 (a) diz *"a F3 … entra antes"*, a fatia inteira. Por isso os dois PRs
  da F3 (§3) entram antes desses dois.
- **Depois de, ou junto com:** a F0 (guarda `P1`, `P2`, G1–G5). Ela é item 0 do PR-0 do montador, que não está aberto em
  24/11. Ver F-F3-4.
- **Independente de:** F1 (razão × Lalur), F2 (primitivas) e `LEGAL-REGRAS`.
- **Não muda o banco:** a coluna `LegalParameter.tabela` é `String` (`schema.prisma:3641`). Nenhuma linha muda; não há
  migração nem semente nova.

---

## 3. Checklist (2 PRs; cada item testável sozinho)

Os nomes do contrato novo vão em inglês (F-PBA-1 a). Os campos da linha seguem os do model existente (`chave`,
`discriminador`, `valorInt`…), porque completam um conjunto que já existe.

### PR-F3-0 — contrato, registro da borda e composição na factory

0. **Guarda, se o F-F3-4 for (a):** o item 0 do ADR §3 inteiro (`P1`, `P2`, G1–G5 e a prova por plantio 1–5), copiado do
   ADR sem mudança. No ramo (b) este item não existe e o PR espera o PR-0 do montador.
1. **Contrato do registro** em `features/legalParameters/models/formatRegistry.ts` (plataforma, folha `L6`), com o schema
   do §4.1. É função pura e só importa `zod` e `./legalParameter`. **Teste:** dado um registro de brinquedo com a tabela
   `T` (`value: 'int'`), `formatError({ tabela: 'T', chave: 'X', valorTexto: 'a' })` devolve
   `T: o valor desta tabela é valorInt.`, o mesmo texto de hoje (`formatoLinha.ts:490`).
2. **Composição validada:** `createFormatRegistry(registrations)` recusa com erro nomeado
   (`LegalParameterFormatRegistryError`):
   - (i) duas registrações para a mesma `table`;
   - (ii) `requires` que aponta para tabela não registrada;
   - (iii) `country` fora de `^[a-z]{2}$`;
   - (iv) `domain` vazio.

   **Teste:** um caso por recusa. A lista vem de fora (construtor), nunca de `register()` chamado na importação
   (`ADR-DOMAIN-MOTOR-rejected` §3: composição fixa no código).
3. **Arquivos de registro da borda.** Cada um exporta uma constante `readonly LegalParameterFormatRegistration[]`:
   - `features/accounting/paises/br/legalParameters/index.ts`: as tabelas da contabilidade, divididas por área em
     arquivos irmãos (`simples.ts`, `ibsCbs.ts`, `retencoes.ts`, `documentosFiscais.ts`, `calendario.ts`…). A divisão é
     livre no PR.
   - `features/dp/paises/br/legalParameters/index.ts`: as tabelas do DP.

   A distribuição das 46 tabelas segue a tabela do §5, com o F-F3-2 para as cinco compartilhadas. Cada regra é **a mesma
   de hoje**, movida: mesmo predicado e mesma mensagem.
4. **Fallback vira registro explícito.** As 6 tabelas sem regra (§0.2) ganham registração, sem mudança de comportamento.
   O texto de `TAX_ASSESSMENT/ARREDONDAMENTO` e as chaves e discriminadores de `PIS_COFINS` vão para o registro.
   `erroDoFormato` (`LegalParameterService.ts:37-47`) e `TEM_REGRA_DE_FORMATO` somem. **Teste:** as linhas de
   `TAX_ASSESSMENT` e `PIS_COFINS` da semente passam, e `PIS_COFINS` com discriminador `X` dá o texto de hoje (`:44`).
5. **Símbolos importados pelo centro descem para o leitor.** O destino de cada um está no §6. A regra é: o schema que um
   arquivo do centro lê mora no `models/` desse domínio, e o arquivo de `paises/br/legalParameters/` só o importa e o
   registra (borda → centro, permitido pela R3). O que nenhum arquivo do centro importa mora no arquivo de registro. **Não
   entra nenhum arquivo no escopo `LEGADO_BR`.** **Teste:** `npm run check:arch` exit 0, com o baseline igual ao da F0
   (27 ou o número que a F0 trouxer).
6. **Uma fonte de composição.** O `lib/factory.ts` exporta `LEGAL_PARAMETER_FORMATS` (lista fixa: os registros da
   contabilidade BR e do DP BR) e o passa ao construtor do `LegalParameterService`, como 5º argumento depois do
   `recalcJobRepo`. Os testes transversais (itens 8 e 9) importam essa mesma constante, então uma tabela fora da factory
   não passa no teste. Os testes de domínio podem montar o registro só do próprio domínio.
7. **O serviço usa o registro:**
   - `propose` e `publish` chamam `registry.formatError(linha, ctx)`;
   - `publish` monta o `ctx` com as linhas lidas **na mesma tx** (gate autoritativo dentro da tx);
   - `propose` lê pelo repositório, fora da tx, como hoje;
   - `linhasPublicadasForaDoFormato` monta o `ctx` com o conjunto publicado inteiro.

   **Teste:** com um registro de brinquedo em que `B.requires = ['A']`, o `publish` de uma linha de `B` cuja checagem
   cruzada falha dá 400, e o `ctx` recebido traz as linhas de `A` lidas pelo `tx` (repositório falso que registra o `tx`
   usado).
8. **Paridade:** os ~30 testes que chamam `erroDeFormato` passam a chamar `formatError` do registro composto (item 6).
   Asserções e mensagens não mudam, só o import. **Teste:** a suíte desses arquivos verde, sem mudar nenhum `expect`. O
   diff de cada teste é só a linha de import e a construção do registro.
9. **Cobertura do catálogo:** todo nome do catálogo (enum, ou o registro no ramo (a) do F-F3-1) tem exatamente uma
   registração, e toda registração tem nome no catálogo. **Teste:** igualdade de conjuntos, e o
   `expect(...).toHaveLength(46)` (`legalParameter.test.ts:94`) continua passando.
10. **CLI sem mudança de interface:** `checkLegalParamsFormatoCli` chama o mesmo método do serviço. **Teste:** o
    `checkLegalParamsFormatoCli.test.ts` de hoje, intocado, verde. Mais um caso novo: uma linha publicada de `B` cuja
    dependência `A` foi revogada sai 1 (a checagem cruzada também roda no CLI).
11. **`formatoLinha.ts` apagado.** A plataforma não importa mais nenhum dos 7 modelos. **Teste:**
    `grep -rn "from '../../accounting\|from '../../dp" server/src/features/legalParameters --include=*.ts | grep -v __tests__`
    devolve só `LegalParameterDto.ts:2` e `LegalParameterService.ts:3-4` (resíduo da F2).
12. **Regra de camada para a pasta nova (F-F3-3):** a `L6` passa a casar `paises/[^/]+/legalParameters/`, e o registro
    fica folha como `models/`. No ramo (b) do F-F3-3 este item vira teste de grep; no (c), espera a F2. **Prova por plantio:** um `paises/br/legalParameters/__sonda.ts` que importa
    `features/accounting/repositories/X` dá exit 1 em `L6`; sem o plantio, exit 0.

### PR-F3-1 — nomes de tabela e guarda da plataforma (o conteúdo depende do F-F3-1 e do F-F3-3)

13. **Ramo (a) do F-F3-1, nomes no registro.**
    - O DTO troca `z.enum(LEGAL_PARAMETER_TABELAS)` por `z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/)`.
    - O serviço recusa tabela fora do registro com 400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA`, no `propose`, no `list`
      (filtro) e no `vigente`. O código segue o conjunto que já existe (`PARAMETRO_LEGAL_AUSENTE`,
      `PARAMETRO_LEGAL_ILEGIVEL`), pelo F-PBA-1 (a): erro novo de entidade antiga completa o conjunto.
    - Nasce `GET /api/legal-parameters/tabelas`, que devolve `{ tabela, dominio, pais, tipoValor }[]` por
      Route → Controller → Service, sem repositório (o dado vem do registro). Qualquer usuário autenticado lê, a mesma
      policy do `list`. Subpath e chaves seguem o recurso antigo (F-PBA-1 a). O conjunto de subpaths é misto
      (`/vigente`, `/recalc-jobs`); `tabelas` segue o campo `tabela` do mesmo recurso, e `tipoValor` segue o formulário
      do front (`my-app/features/accounting/lib/legalParameters.ts:62`).
    - `LEGAL_PARAMETER_TABELAS`, `TABELAS_MIGRADAS` e o tipo `LegalParameterTabela` somem da plataforma. As funções do
      lookup (`linhaLegalVigente`, `linhasVigentesDaTabela`, `exigirLinhaVigente`, `fotografia`) passam a aceitar
      `string`. Cada domínio declara os próprios nomes `as const` ao lado do leitor, com tipo próprio
      (`AccountingLegalTable`, `DpLegalTable`), e os 5 arquivos do fato 5 trocam o tipo.
    - `aquecer` e o CLI iteram sobre `registry.tables()`.

    **Gates:**
    - snapshot de DTO (`legalParameters/dtos/__tests__/__dto-shapes__.json`) e o `.gen.ts` do front regenerados;
    - guarda de path-count do openapi, com `docs.paths.ts` e `public/openapi.json` (+1 path);
    - paridade i18n, só se a mensagem do 400 for para o usuário (o padrão da casa é mensagem de servidor em pt).

    **Teste:** `propose` com `tabela: 'NAO_EXISTE'` dá 400 com o código; `GET /tabelas` devolve 46 itens, cada um com
    `pais: 'br'`.

    **Ramo (b) do F-F3-1:** este item não existe. O enum fica em `legalParameter.ts`, e o ciclo e a ponte acrescentam os
    seus nomes lá (os write-sets deles já preveem isso).
14. **Guarda da plataforma, pelo ramo do F-F3-3.** No ramo (a), regra nova `LP1-legal-params-platform-not-domain` no
    `.dependency-cruiser.cjs`: de `^src/features/legalParameters/` (não teste) para `^src/features/(?!legalParameters/)`,
    com `pathNot` nomeando as 3 arestas da F2 (escopo que só encolhe, comentário com a fatia F2 e a lacuna `b556`).
    **Prova por plantio:** `features/legalParameters/models/__sonda.ts` importando `features/dp/models/vinculo` dá exit 1
    em `LP1`; sem o plantio, exit 0. É o `comoProvar` da `0d37`, com o resíduo nomeado.

---

## 4. Contratos (esboço materializável)

### 4.1 Registro (plataforma, `features/legalParameters/models/formatRegistry.ts`)

```ts
import type { LinhaLegal } from './legalParameter';

/** A linha como a proposta e a publicação a enxergam (hoje `LinhaParaFormato`, formatoLinha.ts:30-37; sobe para cá). */
export interface LinhaParaFormato {
  tabela: string;               // ramo (b) do F-F3-1: LegalParameterTabela
  chave: string;
  discriminador?: string | null;
  valorInt?: number | null;
  valorTexto?: string | null;
  valorJson?: unknown;
  vigenteDesde?: string;        // novo: a checagem cruzada precisa da vigência da linha (§4.2)
  vigenteAte?: string | null;
}

export type LegalParameterValueKind = 'int' | 'text' | 'json';

/** O que a checagem cruzada pode ler: só linhas em vigor (`linhasEmVigor`) das tabelas declaradas em `requires`. */
export interface FormatCheckContext {
  rowsInForce(table: string): readonly LinhaLegal[];   // tabela fora de `requires` ⇒ throw (programação)
}

export interface LegalParameterFormatRegistration {
  table: string;                // nome da tabela (catálogo: F-F3-1)
  domain: string;               // 'accounting' | 'dp' | … (pasta de features/)
  country: string;              // ISO 3166-1 alfa-2 minúsculo ('br'); dado, sem branch no núcleo (cf. F-ML-13)
  value: LegalParameterValueKind | ((l: LinhaParaFormato) => LegalParameterValueKind);
  /** Erro em português, ou null. Mesmo contrato do `checar` de hoje. */
  check(l: LinhaParaFormato): string | null;
  /** Checagem entre tabelas (ponte do DP, PR-P1 item 7). Ausente = só a linha. */
  requires?: readonly string[];
  checkAgainst?(l: LinhaParaFormato, ctx: FormatCheckContext): string | null;
}

export interface LegalParameterFormatRegistry {
  tables(): readonly { table: string; domain: string; country: string; value: LegalParameterValueKind | 'mixed' }[];
  has(table: string): boolean;
  /** null = no formato. Tabela não registrada ⇒ mensagem "tabela sem formato registrado" (não deveria chegar: o DTO ou o 400 do item 13 barra antes). */
  formatError(l: LinhaParaFormato, ctx?: FormatCheckContext): string | null;
}

export class LegalParameterFormatRegistryError extends Error {}   // composição inválida: duplicata, requires órfão, country
export function createFormatRegistry(registrations: readonly LegalParameterFormatRegistration[]): LegalParameterFormatRegistry;
```

**Ordem de `formatError` (preserva a de hoje, `formatoLinha.ts:486-494`):**
1. Tipo do valor ausente ⇒ `"<T>: o valor desta tabela é valorInt|valorTexto|valorJson."`
2. `check(l)` ⇒ `"<T>/<chave>: <erro>."`
3. Só se 1 e 2 passarem e houver `ctx` e `checkAgainst`: `checkAgainst(l, ctx)` ⇒ `"<T>/<chave>: <erro>."`
   **Sem `ctx`, a checagem cruzada não roda.** Os testes de paridade (item 8) chamam sem `ctx` e continuam iguais.

### 4.2 Como a checagem cruzada recebe as outras linhas

| Onde | De onde vêm as linhas de `requires` | Data |
|---|---|---|
| `propose` | `repo.findPublished(requires)`, fora da tx (como o `exigirFormato` de hoje) | a vigência da linha proposta (F-F3-5) |
| `publish` | o mesmo, **pelo `tx`** (gate dentro da tx, server/CLAUDE.md gate 5) | idem |
| CLI | o conjunto `PUBLISHED` inteiro que o método já lê (`:162`) | idem |

O `ctx` aplica `linhasEmVigor` (L-7: substituída não vale; revogada não conta). **O que fica fora:** revogar a linha `A`
não reprova na hora a linha `B` publicada que dependia dela. Quem acusa é o CLI (item 10) e, na ponte, o leitor do DP vira
pendência (`enquadramentoNaCompetencia`, PR-P1 item 9). A F3 não bloqueia o `revoke` por dependência; isso seria um gate
novo no `revoke`, fora do pedido.

### 4.3 O que os dois consumidores escrevem (forma do registro deles)

```ts
// CICLO-FISCAL PR-0 — features/accounting/paises/br/legalParameters/prazoObrigacao.ts
import { REGRAS_PRAZO } from '../models/cicloFiscal';               // borda → borda, mesmo país
export const PRAZO_OBRIGACAO_FORMAT: LegalParameterFormatRegistration = {
  table: 'PRAZO_OBRIGACAO', domain: 'accounting', country: 'br', value: 'text',
  check: (l) => /* chave = obrigação; discriminador = <modalidade>[@<codMun 7 dígitos>]; valorTexto ∈ REGRAS_PRAZO */ null,
};
// entra no index.ts da contabilidade BR; a factory não muda (a lista já inclui o index).

// PONTE DP PR-P0/PR-P1 — features/dp/paises/br/legalParameters/formatosEncargos.ts
export const FORMATOS_ENCARGOS: readonly LegalParameterFormatRegistration[] = [
  { table: 'RAT_ALIQUOTA', domain: 'dp', country: 'br', value: 'int', check: /* GRAU_1..3, bp 0..10000 */ },
  { table: 'FAP_LIMITES', domain: 'dp', country: 'br', value: 'int', check: /* MIN_X10000|MAX_X10000, 1..30000 */ },
  { table: 'TERCEIROS_FPAS', domain: 'dp', country: 'br', value: 'json', check: /* totalBp = soma */ },
  { table: 'RAT_GRAU_ESTABELECIMENTO', domain: 'dp', country: 'br', value: 'int', check: /* CNPJ_REGEX, 1..3 */,
    requires: ['RAT_ALIQUOTA'], checkAgainst: (l, ctx) => /* existe GRAU_<valorInt> em vigor (F-F3-5) */ null },
  { table: 'FAP_ESTABELECIMENTO', domain: 'dp', country: 'br', value: 'int', check: /* CNPJ, inteiro */,
    requires: ['FAP_LIMITES'], checkAgainst: /* MIN ≤ valorInt ≤ MAX */ },
  { table: 'FPAS_EMPRESA', domain: 'dp', country: 'br', value: 'text', check: /* raiz 8, FPAS 3 dígitos */,
    requires: ['TERCEIROS_FPAS'], checkAgainst: /* existe linha chave = valorTexto */ },
];
```

`FPAS_EMPRESA` tem `valorTexto` e, opcionalmente, `valorJson` (`codigoTerceiros`). O `value` diz qual é obrigatório
(`'text'`); o `check` valida o JSON quando ele vem. É o mesmo padrão das regras de hoje.

### 4.4 Relação com o `LEGAL-REGRAS` (ML-9)

O ML-9 é um registro `DOMINIOS_DE_REGRA` por domínio, chaveado por `(jurisdicao, chave)`, com F-ML-0 pendente. O contrato
daqui tem `domain` e `country` como dado, e o motor, se nascer, registra o formato da `LEI_REGRA` como mais uma
registração. A F3 não cria vocabulário, contexto nem regra, e nada aqui espera o F-ML-0.

---

## 5. Dono de cada tabela (46; ramo recomendado do F-F3-2)

| Domínio (`features/<d>/paises/br/legalParameters/`) | Tabelas |
|---|---|
| `accounting` (33 + 5 compartilhadas) | `TAX_ASSESSMENT`, `CSLL_ALIQUOTA`, `CODIGO_RECEITA`, `PIS_COFINS`, `PIS_COFINS_MONOFASICO_NCM`, `CST_PIS_COFINS`, `CFOP_IMOBILIZADO`, `NFE_CSTAT_AUTORIZADA`, `OBRIGACAO_REGIME`, `LC116_SERVICO`, `ISS_LIMITE`, `DEPRECIACAO_ANEXO_III`, `LEIAUTE_SPED`, `SIMPLES_ANEXO_FAIXA`, `SIMPLES_ANEXO_REPARTICAO`, `SIMPLES_TETO_ISS`, `SIMPLES_ENQUADRAMENTO`, `SIMPLES_LIMITE`, `SIMEI_VALOR`, `MEI_ANEXO_XI`, `IRRF_DISTRIBUICAO`, `TJLP`, `IBS_CBS`, `IBS_CBS_USO_CONSUMO`, `IBS_CBS_PROVISORIA`, `RETENCAO`, `RETENCAO_CODIGO`, `NATUREZA_RENDIMENTO`, `ISS_TRANSICAO`, `NFCE_LIMITE`, `INUT_NAO_SE_APLICA`, `ICMS_ST_NCM_UF`, `IBS_CBS_REDUCAO_NBS`; **compartilhadas (F-F3-2):** `FERIADO_NACIONAL`, `FERIADO_LOCAL`, `SALARIO_MINIMO`, `IRRF_PF_MENSAL`, `ENCARGO_FOLHA` |
| `dp` (8) | `INSS_EMPREGADO`, `ESOCIAL_CATEGORIA`, `ESOCIAL_NATUREZA_RUBRICA`, `ESOCIAL_INCIDENCIA_RUBRICA`, `ESOCIAL_MOTIVO_AFASTAMENTO`, `ESOCIAL_TIPO_DEPENDENTE`, `FOLHA_REGRA`, `DP_CATEGORIA_ENCARGO` |

33 + 5 + 8 = 46. Conferir a divisão no PR contra o grep do fato 4, que é localização e não leitura.

**Dono** quer dizer só quem declara o formato. Qualquer domínio continua lendo qualquer tabela pela plataforma (lookup e
fotografia), como hoje.

---

## 6. Destino de cada símbolo exportado do `formatoLinha.ts`

| Símbolo | Importado por (produção, fora da plataforma) | Destino |
|---|---|---|
| `LinhaParaFormato` | só testes | `legalParameters/models/formatRegistry.ts` (§4.1) |
| `erroDeFormato`, `TEM_REGRA_DE_FORMATO` | `LegalParameterService`; testes | substituídos por `registry.formatError` / `registry.has` |
| `NOMES_CODIGO_RECEITA`, `NomeCodigoReceita` (+ a constante privada) | `accounting/models/taxAssessmentParams.ts:11` | `accounting/models/taxAssessmentParams.ts` |
| `DepreciacaoAnexoJson`, `DEPRECIACAO_ANEXO_III_FONTES` | `accounting/models/FixedAsset.model.ts:7` | `accounting/models/FixedAsset.model.ts` (ou arquivo irmão em `accounting/models/`) |
| `MeiAnexoXiJson` | `accounting/models/meiAnexoXi.ts:7` | `accounting/models/meiAnexoXi.ts` |
| `ObrigacaoRegimeJson` | testes (`ibsCbsPr5`, `reinfPr3Matriz`) | `accounting/models/obrigacoesPorRegime.ts` (já é de onde vêm `ORDEM_OBRIGACOES` e `STATUS_OBRIGACAO`) |
| `InssEmpregadoFaixaJson` | `dp/models/parametrosFolha.ts:11` | `dp/models/parametrosFolha.ts` |
| `DIAS_SEMANA` | `dp/models/escala.ts:11` | `dp/models/escala.ts` |
| `FOLHA_REGRA_CHAVES_INT`, `FOLHA_REGRA_CHAVES_TEXTO`, `FolhaRegraChaveInt`, `FolhaRegraChaveTexto`, `DpCategoriaEncargoJson` | `dp/models/regrasFolha.ts:12-16`, `dp/models/folha/fracao.ts:9` | `dp/models/regrasFolha.ts` (ou `dp/models/folhaRegraCatalogo.ts`, se o tamanho pedir; conferir `X3` sem ciclo com `escala`, `vinculo`, `ferias`) |
| `NcmMonofasicoJson`, `Lc116ServicoJson`, `EsocialCategoriaJson`, `EsocialNaturezaRubricaJson`, `EsocialDescricaoJson` | nenhum fora da plataforma | o arquivo de registro da borda |

Os schemas que hoje vêm de `accounting/models/{simplesCalc,retencaoParams,segregacaoNcm,ibsCbsParams,regimeEmpresa}`
continuam onde estão. Só quem os importa muda: deixa de ser a plataforma e passa a ser a borda.

---

## 7. Forks — RATIFICAÇÃO PENDENTE

A recomendação é a estrutural (D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL). Nenhum fork se ratifica nesta sessão.

| Fork | Evidência | Caminhos | Recomendação | Trava |
|---|---|---|---|---|
| **F-F3-1** Onde moram os **nomes** das tabelas | `LEGAL_PARAMETER_TABELAS` (`legalParameter.ts:9-87`) lista 46 nomes brasileiros, e o DTO os fecha (`:10`). O ciclo e a ponte deixaram em aberto (*"se a F3 mantiver o enum central…"*). Raio lido: DTO, `__dto-shapes__.json`, `LegalParameterDto.gen.ts`, a cópia do front com `satisfies`, `toHaveLength(46)`, `aquecer`, CLI, o tipo em 5 arquivos de produção + 8 testes | **(a)** o registro é o catálogo. DTO com `string` + regex, 400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA` no serviço, `GET /legal-parameters/tabelas`, tipo por domínio (item 13). O front perde a união no tipo gerado e continua com a lista local até um FE-INCR ler o `GET /tabelas` (vai à caixa). **(b)** o enum de nomes fica central na plataforma, que conhece os nomes mas não os formatos. O ciclo e a ponte põem `PRAZO_OBRIGACAO` e as 6 da ponte no enum (linhas já previstas nos write-sets deles). Front e DTO sem mudança. **(c)** catálogo composto em `lib/` que importa os nomes dos domínios: **desaconselhado**, porque a plataforma passaria a depender da borda por intermédio, contornando a `P1` sem reprovar | **(a).** É a causa raiz da `0d37`: nome de tabela brasileira é dado do país (R2 b). Com (b), a plataforma continua listando `ESOCIAL_*` e `SIMEI_VALOR`, e cada tabela nova de país edita a plataforma. O custo de (a) é um path a mais, o contrato do front e o tipo em 13 arquivos, num PR próprio (PR-F3-1). (b) é alternativa válida e deixa aberto só o catálogo de nomes | PR-F3-1 inteiro; a linha `legalParameter.ts` dos write-sets do ciclo PR-0 e da ponte PR-P0 (§9) |
| **F-F3-2** Dono das 5 tabelas que dois domínios leem | Fato 4: `SALARIO_MINIMO`, `IRRF_PF_MENSAL`, `ENCARGO_FOLHA` (contabilidade e DP); `FERIADO_NACIONAL`, `FERIADO_LOCAL` (contabilidade e `packages`) | **(a)** o dono é o domínio que a criou e cuja regra está escrita hoje: a contabilidade para as cinco (pelos comentários do enum, `legalParameter.ts:24-67`: `ENCARGO_FOLHA` no `EFICIENCIA-FISCAL` PR-3, `IRRF_PF_MENSAL` no `RETENCOES-FONTE` PR-1, `SALARIO_MINIMO` no `SIMPLES-NACIONAL` PR-1, `FERIADO_NACIONAL` no `LEGAL-PARAMS` e `FERIADO_LOCAL` no F-E4-1). Ler continua livre. **(b)** dono pelo **conceito**: `SALARIO_MINIMO`, `ENCARGO_FOLHA` e `IRRF_PF_MENSAL` para o DP (são da folha); feriados para a contabilidade. **(c)** uma pasta de país da própria plataforma (`legalParameters/paises/br/`) para as compartilhadas | **(a).** O registro só decide quem valida o formato, e mudar de dono hoje é movimento sem ganho: quem lê não muda. (b) é defensável para `ENCARGO_FOLHA` e pode ser feito na F7 (DP existente), quando o DP mudar de pasta. (c) põe país na plataforma, que é o que a F3 tira | item 3 (distribuição) |
| **F-F3-3** Guarda mecânica da plataforma | `0d37`, `comoProvar`: *"Regra de check:arch … falharia hoje em 3 arquivos"*. Ao fim da F3 restam 3 arestas, todas da F2 (§0.2). `ADR-ARCH-BOUNDARIES` §5: regra nova é emenda | **(a)** duas mudanças no `check:arch`: a regra `LP1` no PR-F3-1, com as 3 arestas da F2 nomeadas num `pathNot` que só encolhe (a F2 o esvazia), e a `L6` casando também `paises/<cc>/legalParameters/` no PR-F3-0 (fato 8: a pasta que o ciclo e a ponte escolheram não é subpasta de camada, e sem isso o registro poderia importar repositório). **(b)** sem regra no `check:arch`, com testes-guarda de grep em `legalParameters/__tests__/`. **(c)** as regras só nascem na F2, sem exceção | **(a).** É o gate estático da exceção de 13/10 (lê o código como o `tsc`, sem bancada nem rodada) e prova a `0d37` já, com o resíduo nomeado. (b) é um teste que ninguém generaliza para o próximo domínio. (c) deixa a F3 sem prova mecânica por dois meses | itens 12 e 14 |
| **F-F3-4** A F3 cria a primeira pasta `paises/` antes da guarda | ADR §3: a F0 é *"o item 0 do primeiro PR de código, entre os cinco BRIEFs emendados, que receber `executa`"* (o PR-0 do montador). A F3 não é um dos cinco. A cédula diz *"ou do primeiro PR de código emendado que andar antes"*. Em 24/11 não existe pasta `paises/` | **(a)** se o PR-F3-0 andar antes do PR-0 do montador, ele carrega o item 0 (F0) inteiro, e o montador o recebe pronto. Estende a regra do ADR §3 para *"o primeiro PR de código que criar `paises/`"*. **(b)** o PR-F3-0 espera o PR-0 do montador mergear, e com ele o ciclo PR-0 e a ponte PR-P0 também esperam. **(c)** o PR-F3-0 anda sem guarda: os arquivos novos de `paises/` só são importados pela factory, e a `P1` chega depois | **(a).** A pasta não nasce sem a guarda que a define, e a F3 não fica refém da ordem do montador. (c) também é segura neste PR, porque o centro não importa a borda, mas abre o precedente de pasta de país sem guarda. (b) é segura e atrasa a fila do ciclo e da ponte | item 0; a ordem do §2 |
| **F-F3-5** Em que datas a checagem cruzada vale | Ponte §5.2: *"FAP entre `FAP_LIMITES` vigentes"*, *"valorInt 1..3 (∈ chaves de `RAT_ALIQUOTA`)"*, *"FPAS com linha em `TERCEIROS_FPAS`"*. A linha dependente tem vigência própria (FAP anual) | **(a)** a dependência tem de valer em **toda** a vigência da linha: cada versão em vigor de `requires` que cruza `[vigenteDesde, vigenteAte]` passa na checagem, e existe uma em `vigenteDesde`. **(b)** só em `vigenteDesde`. **(c)** só na data da publicação (hoje) | **(a).** Uma linha com vigência de um ano não pode passar por um limite que muda no meio do ano. O custo é iterar as versões que cruzam o intervalo. (b) deixa passar o FAP de 2027 contra o limite de 2026 se o limite mudar em março. (c) mistura a data da publicação com a do fato | itens 7 e 10; o `checkAgainst` da ponte PR-P1 |

---

## 8. Pendente de validação externa

Nenhuma. A F3 move regras sem mudar o conteúdo: mesmo predicado, mesma mensagem. O conteúdo legal de cada tabela segue com
o dossiê e o BRIEF que o criou, e o das tabelas novas, com o ciclo e a ponte.

## 9. O que vale nos write-sets do ciclo PR-0 e da ponte PR-P0 (este BRIEF não os edita)

| Linha do write-set deles | F-F3-1 (a) | F-F3-1 (b) |
|---|---|---|
| ciclo PR-0: `server/src/features/legalParameters/models/legalParameter.ts (nome da tabela, só se a F3 mantiver o enum central)` | **não se aplica** (o nome vem do registro) | aplica: + `PRAZO_OBRIGACAO` no enum |
| ciclo PR-0: `paises/br/legalParameters/prazoObrigacao.ts` | aplica, e entra no `index.ts` da contabilidade BR | aplica |
| ponte PR-P0: `legalParameters/models/legalParameter.ts` e `legalParameters/dtos/__tests__/__dto-shapes__.json` | **não se aplicam** (DTO com `string`; o snapshot não muda por tabela nova) | aplicam: + 3 nomes no PR-P0, + 3 no PR-P1, snapshot regenerado |
| ponte PR-P0: `features/dp/paises/br/legalParameters/formatosEncargos.ts` | aplica, e entra no `index.ts` do DP BR | aplica |
| ponte PR-P0 ramo (b) do F-PBA-7: `formatoLinha.ts` | **morto**: o F-PBA-7 foi (a) e o arquivo some na F3 | morto |

No ramo (a), o snapshot do front (`.gen.ts`) também deixa de mudar por tabela nova, e o front ganha a tabela nova pelo
`GET /tabelas` quando o FE-INCR existir.

## 10. Insumos ausentes

- O conteúdo de cada uma das 40 regras não foi relido regra a regra. O BRIEF só exige movê-las iguais, e a paridade
  (item 8) é o oráculo.
- O `docs.paths.ts`/`openapi.json` e a guarda de path-count não foram lidos. Ramo (a) do F-F3-1: conferir no PR-F3-1.
- O `test/helpers/legalParams.ts` e o `templateDbSeeds.test.ts` foram lidos só no cabeçalho. Conferir se algum usa o enum
  (o write-set da ponte cita o primeiro).
- Os leitores das 46 tabelas foram localizados por grep de literal, não lidos (fato 4).
- O efeito de importar `lib/factory` nos ~30 testes de paridade (tempo de carga) não foi medido. Alternativa no PR: cada
  domínio exporta o seu `index.ts`, e o teste transversal monta a união igual à da factory, com um teste que compara as
  duas listas.

## 11. Achados fora de escopo (na caixa)

- `L-20261124-043454-0e31` (feature): o painel do front lista as tabelas de uma cópia local do enum. Tabela nova do BE
  não aparece, e no ramo (a) do F-F3-1 a cópia perde a checagem de tipo. Deve ler `GET /tabelas` num FE-INCR próprio.
- `L-20261124-043456-a381` (spec): revogar uma linha de que outra depende (`requires`) não reprova nem avisa na hora; só
  o CLI acusa (§4.2).

## 12. Write-set

| PR | Edita / cria |
|---|---|
| PR-F3-0 | `server/src/features/legalParameters/models/formatRegistry.ts` (novo); `server/src/features/legalParameters/models/formatoLinha.ts` (apagado); `server/src/features/legalParameters/services/LegalParameterService.ts`; `server/src/features/accounting/paises/br/legalParameters/**` (novos); `server/src/features/dp/paises/br/legalParameters/**` (novos); `server/src/features/accounting/models/{taxAssessmentParams,FixedAsset.model,meiAnexoXi,obrigacoesPorRegime}.ts`; `server/src/features/dp/models/{escala,parametrosFolha,regrasFolha}.ts`, `server/src/features/dp/models/folha/fracao.ts`; os ~30 testes que importam `formatoLinha` (`server/src/features/{accounting,dp,legalParameters}/**/__tests__/*.test.ts`, `server/src/__tests__/legalParameter*.integration.test.ts`); `server/src/jobs/__tests__/checkLegalParamsFormatoCli.test.ts`; `server/.dependency-cruiser.cjs` (L6; e o item 0 se F-F3-4 a, com `docs/adr/ADR-ARCH-BOUNDARIES.md`) |
| PR-F3-1 | ramo (a) do F-F3-1: `server/src/features/legalParameters/{models/legalParameter.ts,dtos/LegalParameterDto.ts,dtos/__tests__/__dto-shapes__.json,services/LegalParameterService.ts,services/legalParameterCache.ts}`; `server/src/controllers/legalParameterController.ts`; `server/src/routes/legalParameters.ts`; `server/src/routes/docs.paths.ts`; `server/public/openapi.json`; `server/src/features/accounting/services/{SimplesApuracaoService,TaxSimulationService,WithholdingService}.ts`; `server/src/features/dp/models/{parametrosFolha,regrasFolha}.ts`; `my-app/types/contracts/legalParameters/LegalParameterDto.gen.ts`; ramo (a) do F-F3-3: `server/.dependency-cruiser.cjs`, `docs/adr/ADR-ARCH-BOUNDARIES.md` |

**Choke points (PAR-001):** `server/src/lib/factory.ts` (5º argumento do `LegalParameterService` e a constante
`LEGAL_PARAMETER_FORMATS`), `server/.dependency-cruiser.cjs`, `server/src/routes/docs.paths.ts` (PR-F3-1).
`schema.prisma` **não** é tocado.
